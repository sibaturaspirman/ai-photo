"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type TakeSlot = 1 | 2;

const templateOneTakeConfig: Record<TakeSlot, { w: number; h: number }> = {
  1: { w: 463, h: 732 },
  2: { w: 304, h: 228 },
};

function captureFromVideo(video: HTMLVideoElement, take: TakeSlot) {
  const ratio = templateOneTakeConfig[take].w / templateOneTakeConfig[take].h;
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  const videoRatio = videoW / videoH;

  let sx = 0;
  let sy = 0;
  let sw = videoW;
  let sh = videoH;

  if (videoRatio > ratio) {
    sw = videoH * ratio;
    sx = (videoW - sw) / 2;
  } else {
    sh = videoW / ratio;
    sy = (videoH - sh) / 2;
  }

  const canvas = document.createElement("canvas");
  const outW = take === 1 ? 926 : 912;
  const outH = take === 1 ? 1464 : 684;
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function CplCamPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activeTake, setActiveTake] = useState<TakeSlot>(1);
  const [captures, setCaptures] = useState<Record<TakeSlot, string | null>>({
    1: null,
    2: null,
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [processingPercent, setProcessingPercent] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTemplate = Number(params.get("template"));
    const storageTemplate = Number(window.localStorage.getItem("cpl-template"));
    if (Number.isInteger(queryTemplate) && queryTemplate >= 1 && queryTemplate <= 4) {
      setSelectedTemplate(queryTemplate);
    } else if (
      Number.isInteger(storageTemplate) &&
      storageTemplate >= 1 &&
      storageTemplate <= 4
    ) {
      setSelectedTemplate(storageTemplate);
    }
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
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
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      startCamera();
    }
    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!isGeneratingAi) return;

    const startTime = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProcessingPercent((prev) => {
        let target = prev;

        // Fast ramp-up at the beginning.
        if (elapsed < 1600) {
          target = Math.max(prev, 12 + Math.floor(elapsed / 45));
        }
        // Medium speed in the middle.
        else if (elapsed < 5000) {
          target = Math.max(prev, 48 + Math.floor((elapsed - 1600) / 120));
        }
        // Slow finish while waiting for AI response.
        else {
          target = Math.max(prev, 78 + Math.floor((elapsed - 5000) / 260));
        }

        // Never show completion before real response arrives.
        return Math.min(target, 97);
      });
    }, 90);

    return () => {
      window.clearInterval(timer);
    };
  }, [isGeneratingAi]);

  const takeRatio = useMemo(() => {
    const cfg = templateOneTakeConfig[activeTake];
    return `${cfg.w} / ${cfg.h}`;
  }, [activeTake]);
  const isCaptureComplete = Boolean(captures[1] && captures[2]);

  const commitCapture = () => {
    if (!videoRef.current) return;
    const shot = captureFromVideo(videoRef.current, activeTake);
    if (!shot) return;

    const next = { ...captures, [activeTake]: shot };
    setCaptures(next);
    window.localStorage.setItem("cpl-cam-template-1", JSON.stringify(next));

    if (activeTake === 1) {
      setActiveTake(2);
    }
  };

  const handleTakePhoto = () => {
    if (cameraError || countdown !== null) return;
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

  const handleRetake = () => {
    const reset = { 1: null, 2: null };
    setCaptures(reset);
    setActiveTake(1);
    setGenerateError(null);
    window.localStorage.removeItem("cpl-cam-template-1");
    window.localStorage.removeItem("cpl-cam-template-1-ai");
    if (!streamRef.current) {
      startCamera();
    }
  };

  const nextHref = selectedTemplate > 0 ? `/cpl/result?template=${selectedTemplate}` : "/cpl/result";

  const handleGenerateAndContinue = async () => {
    if (!captures[1] || !captures[2] || isGeneratingAi) return;
    setGenerateError(null);
    stopCamera();
    setIsGeneratingAi(true);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 150000);
      const response = await fetch("/api/cpl/template-1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          take1: captures[1],
          take2: captures[2],
        }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const data = (await response.json()) as {
        error?: string;
        captures?: { 1?: string; 2?: string };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal generate AI photo.");
      }

      const aiCaptures = {
        1: data.captures?.[1] ?? null,
        2: data.captures?.[2] ?? null,
      };
      if (!aiCaptures[1] || !aiCaptures[2]) {
        throw new Error("Hasil AI tidak lengkap. Silakan coba lagi.");
      }

      window.localStorage.setItem("cpl-cam-template-1-ai", JSON.stringify(aiCaptures));
      setProcessingPercent(100);
      router.push(nextHref);
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Proses AI timeout. Coba lagi ya."
          : error instanceof Error
            ? error.message
            : "Gagal memproses foto dengan AI.";
      setGenerateError(
        message,
      );
      await startCamera();
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-6 text-white">

      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/cpl/bg.jpg)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-100 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/cpl/frame.png)" }}
        aria-hidden
      />

      <div className="absolute top-[5rem] left-0 right-0 mx-auto w-[135px]">
        <Image
          src="/cpl/cpl-logo.png"
          alt=""
          width={280}
          height={280}
          priority
          className="h-auto w-full"
          sizes="86px"
        />
      </div>

      
      <div className="relative flex w-full max-w-[680px] flex-col items-center gap-4 mt-[6rem]">

        <Image
          src="/cpl/take-photo.png"
          alt=""
          width={720}
          height={110}
          className="h-auto w-[40%] mb-[1rem]"
          sizes="(max-width: 640px) 86vw, 420px"
        />

        <div className="relative w-full overflow-hidden border border-white/25 bg-zinc-900">
          <div className="relative aspect-[9/14] w-full">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-0 bg-black/20" />
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-white"
              style={{ width: "94%", aspectRatio: takeRatio }}
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

        {cameraError ? (
          <p className="text-center text-sm text-red-300">{cameraError}</p>
        ) : null}
        {generateError ? (
          <p className="text-center text-sm text-red-300">{generateError}</p>
        ) : null}

        {!isCaptureComplete ? (
          <button
            type="button"
            onClick={handleTakePhoto}
            disabled={Boolean(cameraError) || countdown !== null}
            className="w-full mt-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Image
              src="/cpl/btn-take.png"
              alt="Take photo"
              width={1024}
              height={216}
              className="h-auto w-full"
              sizes="(max-width: 640px) 90vw, 520px"
            />
          </button>
        ) : null}

        <div className="flex items-center gap-3">
          {[1, 2].map((slot) => {
            const hasShot = Boolean(captures[slot as TakeSlot]);
            const ratio = templateOneTakeConfig[slot as TakeSlot];
            return (
              <div
                key={slot}
                className={`relative overflow-hidden rounded-md border-2 flex items-center justify-center ${
                  activeTake === slot ? "border-black bg-white text-black" : "border-black/60 bg-transparent text-black/60"
                }`}
                style={{
                  height: slot === 1 ? "174px" : "130px",
                  aspectRatio: `${ratio.w} / ${ratio.h}`,
                }}
              >
                {hasShot ? (
                  <Image
                    src={captures[slot as TakeSlot] ?? ""}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-[4vw] font-semibold">{slot}</span>
                )}
              </div>
            );
          })}
        </div>

        {isCaptureComplete ? (
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="block w-[350px]"
              disabled={isGeneratingAi}
            >
              <Image
                src="/cpl/btn-retake-small.png"
                alt="Retake"
                width={1024}
                height={216}
                className="h-auto w-full"
                sizes="350px"
              />
            </button>
            <button
              type="button"
              onClick={handleGenerateAndContinue}
              className="block w-[350px]"
              disabled={isGeneratingAi}
            >
              <Image
                src="/cpl/btn-continue-small.png"
                alt="Continue"
                width={1024}
                height={216}
                className="h-auto w-full"
                sizes="350px"
              />
            </button>
          </div>
        ) : null}
      </div>
      {isGeneratingAi ? (
        <div className="absolute inset-0 z-50 flex min-h-dvh w-full items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url(/cpl/bg.jpg)" }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url(/cpl/frame.png)" }}
          />

          <div className="pointer-events-none absolute -left-35 top-[44%] w-[260px] rotate-[-12deg] opacity-85">
            <Image
              src="/cpl/opsi-template-1.jpg"
              alt=""
              width={704}
              height={1024}
              className="h-auto w-full"
            />
          </div>
          <div className="pointer-events-none absolute -right-35 top-[44%] w-[260px] rotate-[12deg] opacity-85">
            <Image
              src="/cpl/opsi-template-2.jpg"
              alt=""
              width={704}
              height={1024}
              className="h-auto w-full"
            />
          </div>

          <div className="absolute top-[5rem] left-0 right-0 mx-auto w-[135px]">
            <Image
              src="/cpl/cpl-logo.png"
              alt=""
              width={280}
              height={280}
              priority
              className="h-auto w-full"
              sizes="86px"
            />
          </div>


          <div className="absolute bottom-[5rem] left-0 right-0 mx-auto w-[52%]">
            <Image
                src="/cpl/footer.png"
                alt=""
                width={824}
                height={184}
                className="mt-auto h-auto w-full"
              />
          </div>

          <div className="relative z-10 flex min-h-dvh w-full flex-col items-center px-8 py-10 text-black mt-[26rem]">

            <Image
              src="/cpl/aroma.png"
              alt=""
              width={847}
              height={151}
              className="mt-8 h-auto w-[78%]"
            />

            <div className="mt-[34%] flex flex-col items-center animate-bounce">
              <p className="text-[12vw] font-extrabold leading-none">{processingPercent}%</p>
              <p className="mt-2 text-[7vw] font-semibold leading-none">Processing</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
