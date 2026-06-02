"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EIGER_STORAGE } from "@/lib/eiger/constants";
import { EigerButton, EigerContent, EigerShell } from "@/components/eiger/eiger-shell";

const CAPTURE_W = 1080;
const CAPTURE_H = 1920;
const ASPECT_RATIO = 9 / 16;

function cropImageTo916(source: CanvasImageSource, sw: number, sh: number, mirror = false) {
  const srcRatio = sw / sh;
  let sx = 0;
  let sy = 0;
  let sww = sw;
  let shh = sh;

  if (srcRatio > ASPECT_RATIO) {
    sww = sh * ASPECT_RATIO;
    sx = (sw - sww) / 2;
  } else {
    shh = sw / ASPECT_RATIO;
    sy = (sh - shh) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = CAPTURE_W;
  canvas.height = CAPTURE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(source, sx, sy, sww, shh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Gagal membaca file."));
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

export default function EigerCamPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [capture, setCapture] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const constraintCandidates: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: "user",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        },
        { video: { facingMode: "user" }, audio: false },
      ];

      let stream: MediaStream | null = null;
      for (const constraints of constraintCandidates) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch {
          // try next fallback
        }
      }
      if (!stream) {
        throw new Error("Izin kamera ditolak atau kamera tidak tersedia.");
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraError(null);
    } catch (error) {
      setCameraError(
        error instanceof Error
          ? error.message
          : "Izin kamera ditolak atau kamera tidak tersedia.",
      );
    }
  }, []);

  useEffect(() => {
    window.localStorage.removeItem(EIGER_STORAGE.capture);
    window.localStorage.removeItem(EIGER_STORAGE.result);
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const commitCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const shot = cropImageTo916(video, video.videoWidth, video.videoHeight, true);
    if (!shot) return;
    setCapture(shot);
    setUploadError(null);
  };

  const handleTakePhoto = () => {
    if (cameraError || countdown !== null || capture) return;
    let current = 3;
    setCountdown(current);
    const timer = window.setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdown(current);
        return;
      }
      window.clearInterval(timer);
      setCountdown(null);
      commitCapture();
    }, 1000);
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const img = await loadImage(dataUrl);
      const cropped = cropImageTo916(img, img.naturalWidth, img.naturalHeight);
      if (!cropped) throw new Error("Gagal memproses gambar.");
      stopCamera();
      setCapture(cropped);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal upload foto.");
    }
  };

  const handleRetake = async () => {
    setCapture(null);
    setUploadError(null);
    await startCamera();
  };

  const handleContinue = () => {
    if (!capture) return;
    window.localStorage.setItem(EIGER_STORAGE.capture, capture);
    stopCamera();
    router.push("/eiger/choose");
  };

  return (
    <EigerShell background="tryon">
      <EigerContent>
        {/* <h1 className="eiger-title">Ambil Foto</h1> */}

        <div className="eiger-cam-preview">
          <div className="eiger-cam-preview__frame">
            {!capture ? (
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
                playsInline
                muted
                aria-label="Camera preview"
              />
            ) : (
              <Image
                src={capture}
                alt="Preview foto"
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 1080px) 100vw, 1080px"
              />
            )}

            {countdown !== null ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                <span className="eiger-countdown">{countdown}</span>
              </div>
            ) : null}
          </div>
        </div>

        {cameraError ? (
          <p className="shrink-0 pt-2 text-center text-sm text-red-300">{cameraError}</p>
        ) : null}
        {uploadError ? (
          <p className="shrink-0 pt-2 text-center text-sm text-red-300">{uploadError}</p>
        ) : null}

        {!capture ? (
          <div className="eiger-actions">
            <EigerButton
              onClick={handleTakePhoto}
              disabled={Boolean(cameraError) || countdown !== null}
            >
              Ambil Foto
            </EigerButton>
            <EigerButton variant="secondary" onClick={() => uploadInputRef.current?.click()}>
              Upload Foto
            </EigerButton>
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleUpload(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="eiger-actions">
            <EigerButton onClick={handleContinue}>Lanjut</EigerButton>
            <EigerButton variant="secondary" onClick={() => void handleRetake()}>
              Ulangi
            </EigerButton>
          </div>
        )}
      </EigerContent>
    </EigerShell>
  );
}
