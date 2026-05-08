"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const PORTRAIT_W = 1080;
const PORTRAIT_H = 1920;
const TAKE_RATIO = "9 / 14";
const DEBUG_ALWAYS_SHOW_LOADING = false;
const DEFAULT_PROMPT =
  "Use IMAGE 1 as visual style/composition reference. Use IMAGE 2 as identity source. Change outfit only to premium sporty corporate apparel in dark teal and black accents with white sport shoes. Keep face and body from IMAGE 2 exactly.";
const TEMPLATE_1_STICKER_PROMPT = `Create a polished sticker-style poster composite from 2 input images only.
Input roles:
- Image 1 = people/subject photo (main foreground).
- Image 2 = final background canvas.

Instructions:
1) Extract/cut out all people from image 1 and remove the original background completely.
2) Keep the people’s original identity, pose, expression, body proportions, and clothing from image 1.
3) Add a thick white sticker outline/border around the full subject cutout (similar to a campaign sticker style).
4) Add a soft realistic drop shadow outside the white border to create depth.
5) Place the bordered subject on top of image 2 as the back layer.
6) Position and scale the subject to fit naturally in the center/empty area of image 2.
7) Keep image 2 visible and intact as the background design.
8) Match colors/lighting so the subject feels naturally integrated while maintaining a crisp promotional poster look.

Quality requirements:
- ultra-clean cutout edges (especially hair, hands, and clothing edges)
- no jagged edges, no halos, no leftover pixels from old background
- subject faces must stay sharp and natural
- high-contrast, clean, modern campaign poster finish
- output vertical poster composition

Hard constraints:
- no extra people
- no missing body parts
- no anatomy distortion
- no face changes
- no blur on subject
- no replacing image 2 with another background
- no added watermark or random text`;
const STYLE_PROMPT_CENTER_CHEST = `Use IMAGE 1 as the visual style/composition reference.
Use IMAGE 2 as the identity source for all people.

Primary goal:
Recreate the scene in the visual language of IMAGE 1, but replace all people with the people from IMAGE 2, styled as sporty corporate athletes representing swimming, cycling, and running.

Identity and person constraints (strict):
- The people must follow IMAGE 2 exactly: same number of people, same gender per person, same face structure, same body shape/proportions, same skin tone, and same age appearance.
- Preserve each person's identity from IMAGE 2 accurately.
- Do not add, remove, merge, or duplicate people.
- Keep natural anatomy and realistic proportions.
- FACE IDENTITY LOCK (VERY IMPORTANT): all faces must come from IMAGE 2 only. Do not reuse, blend, or adapt any face from IMAGE 1.
- If IMAGE 1 contains faces, treat them as style placeholders only and replace them entirely with faces from IMAGE 2.

Sport assignment (important):
- Represent three sports in the generated people: swimming, cycling, and running.
- Assign one sport persona per person (if there are 3 people: one swimmer, one cyclist, one runner).
- If the number of people is not 3, distribute the sports naturally while still matching IMAGE 2 person count and gender.
- Show sport identity through outfit styling details and subtle pose/body language (no extreme action pose that changes identity).

Visual/style constraints (from IMAGE 1):
- Match the overall cinematic sporty-corporate campaign look of IMAGE 1.
- Match mood, lighting style, color atmosphere, contrast, and premium sports branding feel from IMAGE 1.
- Keep a polished commercial poster aesthetic.

Outfit transformation rules (apply to people from IMAGE 2):
- Change outfit only; preserve original face and body exactly.
- Style: premium sporty corporate apparel.
- Primary color: dark teal.
- Secondary color: black athletic accents.
- Shoes: clean white sport shoes (except swimmer styling can use appropriate sporty footwear or barefoot if natural to the concept).
- Logo placement: large, clearly visible "Sequis" logo at center chest.
- Logo must be readable and not blocked by arms, hair, or props.

Per-person outfit rules:
- Male: dark teal sporty performance shirt or jacket with large centered Sequis logo + black athletic pants.
- Female: dark teal sporty performance shirt or jacket with large centered Sequis logo + black athletic pants or leggings.
- Child: dark teal sporty t-shirt with large centered Sequis logo + black shorts or athletic pants.
- Hijab rule: if a person in IMAGE 2 wears hijab, keep the hijab and restyle it to dark teal or black sporty hijab.

Modesty rule for hijab wearers:
- if a subject wears hijab, do not generate short skirts, mini skirts, or any above-knee bottoms
- for hijab wearers, bottoms must be modest and below-knee (midi/maxi skirt or long pants)
- ensure overall outfit remains respectful and consistent with hijab styling

Composition/output constraints:
- Final image should look like IMAGE 1's visual campaign style, but with the exact people from IMAGE 2.
- Maintain photorealistic quality, clean details, realistic fabric texture, and sharp logo rendering.
- No identity drift, no face reshaping, no body reshaping.`;
const STYLE_PROMPT_LEFT_CHEST = `Use IMAGE 1 as the visual style/composition reference.
Use IMAGE 2 as the identity source for all people.

Primary goal:
Recreate the scene in the visual language of IMAGE 1, but replace all people with the people from IMAGE 2, styled as sporty corporate athletes representing swimming, cycling, and running.

Identity and person constraints (strict):
- The people must follow IMAGE 2 exactly: same number of people, same gender per person, same face structure, same body shape/proportions, same skin tone, and same age appearance.
- Preserve each person's identity from IMAGE 2 accurately.
- Do not add, remove, merge, or duplicate people.
- Keep natural anatomy and realistic proportions.
- FACE IDENTITY LOCK (VERY IMPORTANT): all faces must come from IMAGE 2 only. Do not reuse, blend, or adapt any face from IMAGE 1.
- If IMAGE 1 contains faces, treat them as style placeholders only and replace them entirely with faces from IMAGE 2.

Sport assignment (important):
- Represent three sports in the generated people: swimming, cycling, and running.
- Assign one sport persona per person (if there are 3 people: one swimmer, one cyclist, one runner).
- If the number of people is not 3, distribute the sports naturally while still matching IMAGE 2 person count and gender.
- Show sport identity through outfit styling details and subtle pose/body language (no extreme action pose that changes identity).

Visual/style constraints (from IMAGE 1):
- Match the overall cinematic sporty-corporate campaign look of IMAGE 1.
- Match mood, lighting style, color atmosphere, contrast, and premium sports branding feel from IMAGE 1.
- Keep a polished commercial poster aesthetic.

Outfit transformation rules (apply to people from IMAGE 2):
- Change outfit only; preserve original face and body exactly.
- Style: premium sporty corporate apparel.
- Primary color: dark teal.
- Secondary color: black athletic accents.
- Shoes: clean white sport shoes (except swimmer styling can use appropriate sporty footwear or barefoot if natural to the concept).
- Logo placement: clearly visible "Sequis" logo at left chest.
- Logo must be readable and not blocked by arms, hair, or props.

Per-person outfit rules:
- Male: dark teal sporty performance shirt or jacket with large centered Sequis logo + black athletic pants.
- Female: dark teal sporty performance shirt or jacket with large centered Sequis logo + black athletic pants or leggings.
- Child: dark teal sporty t-shirt with large centered Sequis logo + black shorts or athletic pants.
- Hijab rule: if a person in IMAGE 2 wears hijab, keep the hijab and restyle it to dark teal or black sporty hijab.

Modesty rule for hijab wearers:
- if a subject wears hijab, do not generate short skirts, mini skirts, or any above-knee bottoms
- for hijab wearers, bottoms must be modest and below-knee (midi/maxi skirt or long pants)
- ensure overall outfit remains respectful and consistent with hijab styling

Composition/output constraints:
- Final image should look like IMAGE 1's visual campaign style, but with the exact people from IMAGE 2.
- Maintain photorealistic quality, clean details, realistic fabric texture, and sharp logo rendering.
- No identity drift, no face reshaping, no body reshaping.`;

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

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed converting blob to data URL."));
    };
    reader.onerror = () => reject(new Error("Failed converting blob to data URL."));
    reader.readAsDataURL(blob);
  });
}

export default function SequisCamPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState(1);
  const [capture, setCapture] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
    const params = new URLSearchParams(window.location.search);
    const fromQuery = Number(params.get("template"));
    const styleFromQuery = Number(params.get("style"));
    const fromStorage = Number(window.localStorage.getItem("sequis-template"));
    const styleFromStorage = Number(window.localStorage.getItem("sequis-style"));
    const resolved =
      Number.isInteger(fromQuery) && fromQuery >= 1 && fromQuery <= 2
        ? fromQuery
        : Number.isInteger(fromStorage) && fromStorage >= 1 && fromStorage <= 2
          ? fromStorage
          : 1;
    const resolvedStyle =
      Number.isInteger(styleFromQuery) && styleFromQuery >= 1 && styleFromQuery <= 3
        ? styleFromQuery
        : Number.isInteger(styleFromStorage) && styleFromStorage >= 1 && styleFromStorage <= 3
          ? styleFromStorage
          : 1;
    setSelectedTemplate(resolved);
    setSelectedStyle(resolvedStyle);
    window.localStorage.setItem("sequis-template", String(resolved));
    window.localStorage.setItem("sequis-style", String(resolvedStyle));
    window.localStorage.removeItem("sequis-result-image-url");
    window.localStorage.removeItem("sequis-result-frame-url");
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
      setProcessingPercent((prev) => {
        let target = prev;
        if (elapsed < 1600) target = Math.max(prev, 12 + Math.floor(elapsed / 45));
        else if (elapsed < 5000) target = Math.max(prev, 48 + Math.floor((elapsed - 1600) / 120));
        else target = Math.max(prev, 78 + Math.floor((elapsed - 5000) / 260));
        return Math.min(target, 97);
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [isGeneratingAi]);

  const downloadCapture = (dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `sequis-capture-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const commitCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shot = captureFromPortraitPreview(canvas);
    if (!shot) return;
    setCapture(shot);
    // downloadCapture(shot);
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

  const handleGenerateAndContinue = async () => {
    if (isGeneratingAi || !capture) return;
    setGenerateError(null);
    stopCamera();
    setIsGeneratingAi(true);
    try {
      const styleTemplateMap: Record<number, string> = {
        1: "/sequis/t2-s1.jpg",
        2: "/sequis/t2-s2.jpg",
        3: "/sequis/t2-s3.jpg",
      };
      const styleFrameMap: Record<number, string> = {
        1: "/sequis/t2-s1-front.png",
        2: "/sequis/t2-s2-front.png",
        3: "/sequis/t2-s3-front.png",
      };
      const stylePromptMap: Record<number, string> = {
        1: STYLE_PROMPT_CENTER_CHEST,
        2: STYLE_PROMPT_LEFT_CHEST,
        3: STYLE_PROMPT_LEFT_CHEST,
      };
      const templatePath =
        selectedTemplate === 2 ? styleTemplateMap[selectedStyle] ?? "/sequis/t2-s1.jpg" : "/sequis/t1.jpg";
      const prompt =
        selectedTemplate === 2
          ? stylePromptMap[selectedStyle] ?? STYLE_PROMPT_CENTER_CHEST
          : TEMPLATE_1_STICKER_PROMPT;
      const [templateBlob, capturedBlob] = await Promise.all([
        fetch(templatePath).then((res) => res.blob()),
        fetch(capture).then((res) => res.blob()),
      ]);
      const [reference1DataUrl, reference2DataUrl] =
        selectedTemplate === 2
          ? await Promise.all([blobToDataUrl(templateBlob), blobToDataUrl(capturedBlob)])
          : await Promise.all([blobToDataUrl(capturedBlob), blobToDataUrl(templateBlob)]);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 150000);
      const response = await fetch("/api/sequis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          reference1: reference1DataUrl,
          reference2: reference2DataUrl,
        }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const data = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to generate image.");
      if (!data.imageUrl) throw new Error("API response does not include generated image.");

      window.localStorage.setItem("sequis-result-image-url", data.imageUrl);
      if (selectedTemplate === 2) {
        window.localStorage.setItem(
          "sequis-result-frame-url",
          styleFrameMap[selectedStyle] ?? "/sequis/t2-s1-front.png",
        );
      } else {
        window.localStorage.setItem("sequis-result-frame-url", "/sequis/t1-front.png");
      }
      setProcessingPercent(100);
      router.push("/sequis/result");
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Proses AI timeout. Coba lagi ya."
          : error instanceof Error
            ? error.message
            : "Gagal memproses foto dengan AI.";
      setGenerateError(message);
      await startCamera();
      setIsGeneratingAi(false);
      setProcessingPercent(0);
    }
  };

  return (
    <main className="sequis-landscape-shell relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-6 text-white">
      <div
        className="sequis-bg absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        aria-hidden
      />

      <div className="relative z-10 w-[73%] xl:w-[26%] translate-y-[4%] xl:translate-y-[8%] flex flex-col items-center gap-4">
        <Image
          src="/sequis/ambil-foto.png"
          alt=""
          width={720}
          height={110}
          className="mb-[2rem] h-auto w-[52%] block xl:hidden"
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
        {generateError ? <p className="text-center text-sm text-red-300">{generateError}</p> : null}

        {!capture ? (
          <button
            type="button"
            onClick={handleTakePhoto}
            disabled={Boolean(cameraError) || countdown !== null}
            className="mt-4 w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Image
              src="/sequis/btn-capture.png"
              alt="Take Photo"
              width={1024}
              height={216}
              className="h-auto w-full"
              sizes="(max-width: 640px) 90vw, 520px"
            />
          </button>
        ) : null}

        {capture ? (
          <div className="mt-1 flex w-full items-center gap-3">
            <div className="flex w-full items-center gap-3">
              <button
                type="button"
                onClick={() => setCapture(null)}
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
                  src="/sequis/btn-selanjutnya-small.png"
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

        <button
          type="button"
          onClick={() => router.push("/sequis/template")}
          className="mt-2 rounded-md border border-white/20 px-4 py-2 text-sm"
        >
          Back to Template
        </button>
      </div>

      {isGeneratingAi || DEBUG_ALWAYS_SHOW_LOADING ? (
        <div className="absolute inset-0 z-50 flex min-h-dvh w-full items-center justify-center overflow-hidden">
          <div className="sequis-bg absolute inset-0 bg-cover bg-center bg-no-repeat" />

          <div className="relative z-10 flex min-h-dvh w-full flex-col items-center justify-center px-8 py-10 text-black">
            <div className="flex animate-bounce flex-col items-center">
              <p className="text-[12vw] font-extrabold leading-none">{processingPercent}%</p>
              <p className="mt-2 text-[7vw] font-semibold leading-none">Processing</p>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
