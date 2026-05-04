"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TakeSlot = 1 | 2 | 3;

const PORTRAIT_W = 1080;
const PORTRAIT_H = 1920;

const templateOneTakeConfig: Record<1 | 2, { w: number; h: number }> = {
  1: { w: 463, h: 732 },
  2: { w: 304, h: 228 },
};

const templateTwoTakeConfig: Record<1 | 2 | 3, { w: number; h: number }> = {
  1: { w: 1120, h: 497 },
  2: { w: 353, h: 353 },
  3: { w: 713, h: 249 },
};

const templateTwoExportSize: Record<1 | 2 | 3, [number, number]> = {
  1: [2240, 994],
  2: [706, 706],
  3: [1426, 498],
};

const templateThreeTakeConfig: Record<1 | 2, { w: number; h: number }> = {
  1: { w: 1200, h: 1800 },
  2: { w: 327, h: 327 },
};

const templateThreeExportSize: Record<1 | 2, [number, number]> = {
  1: [1200, 1800],
  2: [654, 654],
};

const templateFourTakeConfig: Record<1 | 2, { w: number; h: number }> = {
  1: { w: 1200, h: 1800 },
  2: { w: 441, h: 273 },
};

const templateFourExportSize: Record<1 | 2, [number, number]> = {
  1: [1200, 1800],
  2: [882, 546],
};

function camStorageBase(template: number) {
  if (template === 2) return "cpl-cam-template-2";
  if (template === 3) return "cpl-cam-template-3";
  if (template === 4) return "cpl-cam-template-4";
  return "cpl-cam-template-1";
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

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cw, ch);

  ctx.save();
  ctx.translate(cw, 0);
  ctx.rotate(Math.PI / 2);

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

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, destW, destH);
  ctx.restore();
}

function captureFromPortraitPreview(
  sourceCanvas: HTMLCanvasElement,
  take: TakeSlot,
  template: number,
) {
  const cfg =
    template === 2
      ? templateTwoTakeConfig[take]
      : template === 3
        ? templateThreeTakeConfig[take as 1 | 2]
        : template === 4
          ? templateFourTakeConfig[take as 1 | 2]
          : templateOneTakeConfig[take as 1 | 2];
  const cropRatio = cfg.w / cfg.h;

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

  let outW: number;
  let outH: number;
  if (template === 2) {
    [outW, outH] = templateTwoExportSize[take];
  } else if (template === 3) {
    [outW, outH] = templateThreeExportSize[take as 1 | 2];
  } else if (template === 4) {
    [outW, outH] = templateFourExportSize[take as 1 | 2];
  } else {
    outW = take === 1 ? 926 : 912;
    outH = take === 1 ? 1464 : 684;
  }

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d");
  if (!octx) return null;
  octx.drawImage(sourceCanvas, sx, sy, sww, shh, 0, 0, outW, outH);
  return out.toDataURL("image/jpeg", 0.92);
}

export default function CplCam2Page() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const [activeTake, setActiveTake] = useState<TakeSlot>(1);
  const [captures, setCaptures] = useState<Record<TakeSlot, string | null>>({
    1: null,
    2: null,
    3: null,
  });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState(1);
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
    const params = new URLSearchParams(window.location.search);
    const queryTemplate = Number(params.get("template"));
    const storageTemplate = Number(window.localStorage.getItem("cpl-template"));
    let resolved = 1;
    if (Number.isInteger(queryTemplate) && queryTemplate >= 1 && queryTemplate <= 4) {
      resolved = queryTemplate;
    } else if (
      Number.isInteger(storageTemplate) &&
      storageTemplate >= 1 &&
      storageTemplate <= 4
    ) {
      resolved = storageTemplate;
    }
    setSelectedTemplate(resolved);

    const base = camStorageBase(resolved);
    window.localStorage.removeItem(base);
    window.localStorage.removeItem(`${base}-ai`);
    setCaptures({ 1: null, 2: null, 3: null });
    setActiveTake(1);
  }, []);

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
        error instanceof Error
          ? error.message
          : "Izin kamera ditolak atau kamera tidak tersedia.",
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
    // Mount / unmount only — startCamera reads latest refs inside tick loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isGeneratingAi) return;

    const startTime = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProcessingPercent((prev) => {
        let target = prev;

        if (elapsed < 1600) {
          target = Math.max(prev, 12 + Math.floor(elapsed / 45));
        } else if (elapsed < 5000) {
          target = Math.max(prev, 48 + Math.floor((elapsed - 1600) / 120));
        } else {
          target = Math.max(prev, 78 + Math.floor((elapsed - 5000) / 260));
        }

        return Math.min(target, 97);
      });
    }, 90);

    return () => {
      window.clearInterval(timer);
    };
  }, [isGeneratingAi]);

  const takeRatio = useMemo(() => {
    const cfg =
      selectedTemplate === 2
        ? templateTwoTakeConfig[activeTake]
        : selectedTemplate === 3
          ? templateThreeTakeConfig[activeTake as 1 | 2]
          : selectedTemplate === 4
            ? templateFourTakeConfig[activeTake as 1 | 2]
            : templateOneTakeConfig[activeTake as 1 | 2];
    return `${cfg.w} / ${cfg.h}`;
  }, [activeTake, selectedTemplate]);

  const isCaptureComplete =
    selectedTemplate === 2
      ? Boolean(captures[1] && captures[2] && captures[3])
      : Boolean(captures[1] && captures[2]);

  const commitCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shot = captureFromPortraitPreview(canvas, activeTake, selectedTemplate);
    if (!shot) return;

    const next = { ...captures, [activeTake]: shot };
    setCaptures(next);
    const payload =
      selectedTemplate === 2 ? { 1: next[1], 2: next[2], 3: next[3] } : { 1: next[1], 2: next[2] };
    window.localStorage.setItem(camStorageBase(selectedTemplate), JSON.stringify(payload));

    if (selectedTemplate === 2) {
      if (activeTake === 1) setActiveTake(2);
      else if (activeTake === 2) setActiveTake(3);
    } else if (activeTake === 1) {
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
    const reset = { 1: null, 2: null, 3: null };
    setCaptures(reset);
    setActiveTake(1);
    setGenerateError(null);
    const base = camStorageBase(selectedTemplate);
    window.localStorage.removeItem(base);
    window.localStorage.removeItem(`${base}-ai`);
    if (!streamRef.current) {
      startCamera();
    }
  };

  const nextHref = selectedTemplate > 0 ? `/cpl/result?template=${selectedTemplate}` : "/cpl/result";

  const handleGenerateAndContinue = async () => {
    if (isGeneratingAi) return;
    if (selectedTemplate === 2) {
      if (!captures[1] || !captures[2] || !captures[3]) return;
    } else if (!captures[1] || !captures[2]) {
      return;
    }
    setGenerateError(null);
    stopCamera();
    setIsGeneratingAi(true);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 150000);
      const base = camStorageBase(selectedTemplate);
      const response =
        selectedTemplate === 2
          ? await fetch("/api/cpl/template-2", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                take1: captures[1],
                take2: captures[2],
                take3: captures[3],
              }),
              signal: controller.signal,
            })
          : selectedTemplate === 3
            ? await fetch("/api/cpl/template-3", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  take1: captures[1],
                  take2: captures[2],
                }),
                signal: controller.signal,
              })
            : selectedTemplate === 4
              ? await fetch("/api/cpl/template-4", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    take1: captures[1],
                    take2: captures[2],
                  }),
                  signal: controller.signal,
                })
              : await fetch("/api/cpl/template-1", {
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
        captures?: { 1?: string; 2?: string; 3?: string };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Gagal generate AI photo.");
      }

      const aiCaptures =
        selectedTemplate === 2
          ? {
              1: data.captures?.[1] ?? null,
              2: data.captures?.[2] ?? null,
              3: data.captures?.[3] ?? null,
            }
          : {
              1: data.captures?.[1] ?? null,
              2: data.captures?.[2] ?? null,
              3: null,
            };
      if (!aiCaptures[1] || !aiCaptures[2]) {
        throw new Error("Hasil AI tidak lengkap. Silakan coba lagi.");
      }
      if (selectedTemplate === 2 && !aiCaptures[3]) {
        throw new Error("Hasil AI tidak lengkap. Silakan coba lagi.");
      }

      window.localStorage.setItem(
        `${base}-ai`,
        JSON.stringify(
          selectedTemplate === 2
            ? { 1: aiCaptures[1], 2: aiCaptures[2], 3: aiCaptures[3] }
            : { 1: aiCaptures[1], 2: aiCaptures[2] },
        ),
      );
      setProcessingPercent(100);
      router.push(nextHref);
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Proses AI timeout. Coba lagi ya."
          : error instanceof Error
            ? error.message
            : "Gagal memproses foto dengan AI.";
      setGenerateError(message);
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

      <div className="relative z-10 mt-[6rem] flex w-full max-w-[680px] flex-col items-center gap-4">
        <Image
          src="/cpl/take-photo.png"
          alt=""
          width={720}
          height={110}
          className="h-auto w-[40%] mb-[1rem]"
          sizes="(max-width: 640px) 86vw, 420px"
        />

        <video
          ref={videoRef}
          className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
          playsInline
          muted
          aria-hidden
        />

        <div className="relative w-full overflow-hidden border border-white/25 bg-zinc-900">
          <div className="relative aspect-[9/14] w-full">
            <canvas
              ref={canvasRef}
              width={PORTRAIT_W}
              height={PORTRAIT_H}
              className="absolute inset-0 h-full w-full object-cover"
            />
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

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {(selectedTemplate === 2 ? [1, 2, 3] : [1, 2]).map((slot) => {
            const hasShot = Boolean(captures[slot as TakeSlot]);
            const ratio =
              selectedTemplate === 2
                ? templateTwoTakeConfig[slot as TakeSlot]
                : selectedTemplate === 3
                  ? templateThreeTakeConfig[slot as 1 | 2]
                  : selectedTemplate === 4
                    ? templateFourTakeConfig[slot as 1 | 2]
                    : templateOneTakeConfig[slot as 1 | 2];
            const thumbH =
              selectedTemplate === 2
                ? "100px"
                : selectedTemplate === 3 && slot === 1
                  ? "120px"
                  : selectedTemplate === 3
                    ? "90px"
                    : selectedTemplate === 4 && slot === 1
                      ? "120px"
                      : selectedTemplate === 4
                        ? "72px"
                        : slot === 1
                          ? "174px"
                          : "130px";
            return (
              <div
                key={slot}
                className={`relative flex items-center justify-center overflow-hidden rounded-md border-2 ${
                  activeTake === slot ? "border-black bg-white text-black" : "border-black/60 bg-transparent text-black/60"
                }`}
                style={{
                  height: thumbH,
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

          <div className="relative z-10 mt-[26rem] flex min-h-dvh w-full flex-col items-center px-8 py-10 text-black">
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
