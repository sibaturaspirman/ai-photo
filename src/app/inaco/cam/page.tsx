"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  INACO_CAM_LOADING_MS,
  clearInacoGenerateSession,
  isInacoGeneratePending,
  startInacoGenerate,
} from "@/lib/inaco/generate-session";
import { INACO_STORAGE } from "@/lib/inaco/constants";
import { inacoPath } from "@/lib/inaco/model-version";

const PORTRAIT_W = 1080;
const PORTRAIT_H = 1920;
const TAKE_RATIO = "9 / 14";
const DEBUG_ALWAYS_SHOW_LOADING = false;
const UPLOAD_CROP_RATIO = 926 / 1464;

let mirrorScratchCanvas: HTMLCanvasElement | null = null;

function getMirrorScratchCanvas(w: number, h: number) {
  if (!mirrorScratchCanvas || mirrorScratchCanvas.width !== w || mirrorScratchCanvas.height !== h) {
    mirrorScratchCanvas = document.createElement("canvas");
    mirrorScratchCanvas.width = w;
    mirrorScratchCanvas.height = h;
  }
  return mirrorScratchCanvas;
}

function drawLandscapeVideoAsPortrait(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  cw: number,
  ch: number,
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const scratch = getMirrorScratchCanvas(cw, ch);
  const sctx = scratch.getContext("2d");
  if (!sctx) return;

  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.fillStyle = "#000";
  sctx.fillRect(0, 0, cw, ch);

  sctx.save();
  sctx.translate(cw, 0);
  sctx.rotate(Math.PI / 2);

  const destW = ch;
  const destH = cw;
  const destAr = destW / destH;
  const srcAr = vw / vh;
  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;
  if (srcAr > destAr) {
    sw = Math.round(vh * destAr);
    sx = Math.round((vw - sw) / 2);
  } else {
    sh = Math.round(vw / destAr);
    sy = Math.round((vh - sh) / 2);
  }

  sctx.drawImage(video, sx, sy, sw, sh, 0, 0, destW, destH);
  sctx.restore();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  ctx.translate(cw, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(scratch, 0, 0);
  ctx.restore();
}

function captureFromPortraitPreview(sourceCanvas: HTMLCanvasElement) {
  const cropRatio = 926 / 1464;
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;
  const srcRatio = sw / sh;

  let sx = 0;
  let sy = 0;
  let sww = sw;
  let shh = sh;
  if (srcRatio > cropRatio) {
    sww = sh * cropRatio;
    sx = (sw - sww) / 2;
  } else {
    shh = sw / cropRatio;
    sy = (sh - shh) / 2;
  }

  const out = document.createElement("canvas");
  out.width = 926;
  out.height = 1464;
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.drawImage(sourceCanvas, sx, sy, sww, shh, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.92);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar."));
    img.src = src;
  });
}

function cropImageToCaptureRatio(source: CanvasImageSource, sw: number, sh: number) {
  const srcRatio = sw / sh;
  let sx = 0;
  let sy = 0;
  let sww = sw;
  let shh = sh;

  if (srcRatio > UPLOAD_CROP_RATIO) {
    sww = sh * UPLOAD_CROP_RATIO;
    sx = (sw - sww) / 2;
  } else {
    shh = sw / UPLOAD_CROP_RATIO;
    sy = (sh - shh) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 926;
  canvas.height = 1464;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
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

export default function InacoCamPage() {
  return (
    <Suspense fallback={null}>
      <InacoCamPageContent />
    </Suspense>
  );
}

function InacoCamPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debugUpload = searchParams.has("debug");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedTema, setSelectedTema] = useState(1);
  const [selectedOutfit, setSelectedOutfit] = useState(1);
  const [capture, setCapture] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [processingPercent, setProcessingPercent] = useState(0);

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !mountedRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      drawLandscapeVideoAsPortrait(ctx, video, PORTRAIT_W, PORTRAIT_H);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopCamera = useCallback(() => {
    stopRaf();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopRaf]);

  useEffect(() => {
    const tema = Number(window.localStorage.getItem(INACO_STORAGE.tema));
    const outfit = Number(window.localStorage.getItem(INACO_STORAGE.outfit));
    if (!tema || !outfit) {
      router.replace(inacoPath("/inaco/template"));
      return;
    }
    setSelectedTema(tema);
    setSelectedOutfit(outfit);
    if (!isInacoGeneratePending()) {
      clearInacoGenerateSession();
      window.localStorage.removeItem(INACO_STORAGE.result);
    }
  }, [router]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraError(null);
      mountedRef.current = true;
      stopRaf();
      rafRef.current = requestAnimationFrame(tick);
    } catch (error) {
      setCameraError(
        error instanceof Error ? error.message : "Izin kamera ditolak atau kamera tidak tersedia.",
      );
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    void startCamera();
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isGeneratingAi) return;
    const startTime = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / INACO_CAM_LOADING_MS) * 100));
      setProcessingPercent(pct);
    }, 50);
    return () => window.clearInterval(timer);
  }, [isGeneratingAi]);

  const commitCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shot = captureFromPortraitPreview(canvas);
    if (!shot) return;
    setCapture(shot);
    setGenerateError(null);
  };

  const handleTakePhoto = () => {
    if (cameraError || countdown !== null) return;
    let current = 5;
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
      const cropped = cropImageToCaptureRatio(img, img.naturalWidth, img.naturalHeight);
      if (!cropped) throw new Error("Gagal memproses gambar.");
      stopCamera();
      setCapture(cropped);
      setGenerateError(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Gagal upload foto.");
    }
  };

  const handleRetake = async () => {
    setCapture(null);
    setUploadError(null);
    setGenerateError(null);
    if (!streamRef.current) {
      await startCamera();
    }
  };

  const handleGenerateAndContinue = async () => {
    if (isGeneratingAi || !capture) return;
    setGenerateError(null);
    stopCamera();
    setIsGeneratingAi(true);
    setProcessingPercent(0);

    startInacoGenerate({
      capture,
      selectedTema,
      selectedOutfit,
    }).catch(() => {
      // Error ditangani saat submit form atau jika user kembali ke halaman cam.
    });

    await new Promise((resolve) => window.setTimeout(resolve, INACO_CAM_LOADING_MS));
    setProcessingPercent(100);
    router.push(inacoPath("/inaco/form"));
  };

  return (
    <main className="inaco-landscape-shell relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-6 text-white">
      <div className="inaco-bg absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat" aria-hidden />

      <div className="relative z-10 flex w-[73%] translate-y-[4%] flex-col items-center gap-4 xl:w-[26%] xl:translate-y-[8%]">
        <Image
          src="/inaco/ambil-foto.png"
          alt=""
          width={967}
          height={295}
          className="mb-[2rem] block h-auto w-[52%] xl:hidden"
          sizes="(max-width: 640px) 86vw, 420px"
        />

        <video
          ref={videoRef}
          className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
          playsInline
          muted
          aria-hidden
        />

        <div className="relative w-[90%] overflow-hidden border border-white/25 bg-zinc-900">
          <div className="relative aspect-[9/14] w-full">
            <canvas
              ref={canvasRef}
              width={PORTRAIT_W}
              height={PORTRAIT_H}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {capture ? (
              <Image
                src={capture}
                alt="Captured preview"
                fill
                unoptimized
                className="absolute inset-0 object-cover"
              />
            ) : null}
            <div className="pointer-events-none absolute inset-0 bg-black/20" />
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-white"
              style={{ width: "94%", aspectRatio: TAKE_RATIO }}
            />
            {countdown !== null ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="text-[20vw] font-bold leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                  {countdown}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {cameraError ? <p className="text-center text-sm text-red-300">{cameraError}</p> : null}
        {uploadError ? <p className="text-center text-sm text-red-300">{uploadError}</p> : null}
        {generateError ? <p className="text-center text-sm text-red-300">{generateError}</p> : null}

        {!capture ? (
          <div className="mt-4 flex w-full flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={Boolean(cameraError) || countdown !== null}
              className="w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Image
                src="/inaco/btn-takephoto.png"
                alt="Take Photo"
                width={1024}
                height={216}
                className="mx-auto h-auto w-[30%]"
                sizes="(max-width: 640px) 90vw, 520px"
              />
            </button>
            {debugUpload ? (
              <>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="text-sm text-white/70 underline"
                >
                  [Debug] Upload foto
                </button>
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
              </>
            ) : null}
          </div>
        ) : null}

        {capture ? (
          <div className="mt-1 flex w-full items-center gap-3">
            <div className="flex w-full items-center gap-3">
              <button
                type="button"
                onClick={() => void handleRetake()}
                className="block w-full disabled:opacity-60"
                disabled={isGeneratingAi}
              >
                <Image
                  src="/cpl/btn-retake-small.png"
                  alt="Retake"
                  width={1024}
                  height={216}
                  className="h-auto w-full"
                  sizes="(max-width: 640px) 90vw, 520px"
                />
              </button>
              <button
                type="button"
                onClick={handleGenerateAndContinue}
                className="block w-full disabled:opacity-60"
                disabled={isGeneratingAi}
              >
                <Image
                  src="/inaco/btn-selanjutnya-small.png"
                  alt="Continue"
                  width={1024}
                  height={216}
                  className="h-auto w-full"
                  sizes="(max-width: 640px) 90vw, 520px"
                />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {isGeneratingAi || DEBUG_ALWAYS_SHOW_LOADING ? (
        <div className="inaco-processing absolute inset-0 z-50 flex min-h-dvh w-full items-center justify-center overflow-hidden">
          <div className="inaco-processing__content animate-bounce">
            <p className="inaco-processing__percent">{processingPercent}%</p>
            <div
              className="inaco-processing__bar"
              role="progressbar"
              aria-valuenow={processingPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress rendering foto"
            >
              <div
                className="inaco-processing__bar-fill"
                style={{ width: `${processingPercent}%` }}
              />
            </div>
            <div className="inaco-processing__status">
              <p className="inaco-processing__status-title">Rendering...</p>
              <p className="inaco-processing__status-subtitle">Hasil Foto Kamu 🏁</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
