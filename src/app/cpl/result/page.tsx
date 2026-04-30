"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Captures = {
  1: string | null;
  2: string | null;
};

const EMPTY_CAPTURES: Captures = { 1: null, 2: null };
const SLOT_LAYOUT = {
  1: { left: 3, top: 39.7, width: 45.6, height: 41.1 },
  2: { left: 69.5, top: 68.5, width: 28, height: 12.5 },
} as const;

export default function CplResultPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [captures, setCaptures] = useState<Captures>(EMPTY_CAPTURES);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

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

    try {
      const rawAi = window.localStorage.getItem("cpl-cam-template-1-ai");
      const raw = rawAi ?? window.localStorage.getItem("cpl-cam-template-1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Captures>;
      setCaptures({
        1: typeof parsed[1] === "string" ? parsed[1] : null,
        2: typeof parsed[2] === "string" ? parsed[2] : null,
      });
    } catch {
      setCaptures(EMPTY_CAPTURES);
    }
  }, []);

  const camHref = useMemo(
    () => `/cpl/cam?template=${selectedTemplate}`,
    [selectedTemplate],
  );

  const qrImageUrl = useMemo(() => {
    if (!qrValue) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(
      qrValue,
    )}`;
  }, [qrValue]);

  async function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Gagal load image: ${src}`));
      img.src = src;
    });
  }

  function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) {
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    const srcRatio = srcW / srcH;
    const dstRatio = dw / dh;

    let sx = 0;
    let sy = 0;
    let sw = srcW;
    let sh = srcH;

    if (srcRatio > dstRatio) {
      sw = srcH * dstRatio;
      sx = (srcW - sw) / 2;
    } else {
      sh = srcW / dstRatio;
      sy = (srcH - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  async function createCompositeDataUrl() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1800;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context tidak tersedia.");
    }

    if (captures[1]) {
      const img1 = await loadImage(captures[1]);
      const slot1 = SLOT_LAYOUT[1];
      drawImageCover(
        ctx,
        img1,
        (slot1.left / 100) * canvas.width,
        (slot1.top / 100) * canvas.height,
        (slot1.width / 100) * canvas.width,
        (slot1.height / 100) * canvas.height,
      );
    }

    if (captures[2]) {
      const img2 = await loadImage(captures[2]);
      const slot2 = SLOT_LAYOUT[2];
      drawImageCover(
        ctx,
        img2,
        (slot2.left / 100) * canvas.width,
        (slot2.top / 100) * canvas.height,
        (slot2.width / 100) * canvas.width,
        (slot2.height / 100) * canvas.height,
      );
    }

    const template = await loadImage("/cpl/template-1.png");
    ctx.drawImage(template, 0, 0, 1200, 1800);
    return canvas.toDataURL("image/png");
  }

  const handleContinue = async () => {
    if (!captures[1] || !captures[2] || isUploading) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const imageDataUrl = await createCompositeDataUrl();
      const payload = {
        imageDataUrl,
        name: window.localStorage.getItem("cpl-user-name") ?? "Guest",
        phone: window.localStorage.getItem("cpl-user-phone") ?? "-",
        formasi: window.localStorage.getItem("cpl-formasi") ?? "Template 1",
      };

      const response = await fetch("/api/cpl/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        file?: string | null;
        id?: string | number | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Upload gagal.");
      }

      if (!data.file) {
        throw new Error("Response upload tidak mengembalikan file URL.");
      }

      setQrValue(data.file);
      setUploadId(data.id ? String(data.id) : null);
      window.localStorage.setItem("faceURLResult", data.file);

      window.setTimeout(() => {
        window.print();
      }, 250);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload gagal.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-6">
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/cpl/bg.jpg)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
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

      <div className="relative flex w-[90vw] flex-col items-center justify-between mt-[5rem]">

        <Image
          src="/cpl/take-result.png"
          alt=""
          width={720}
          height={110}
          className="h-auto w-[40%] mb-[2rem]"
          sizes="(max-width: 640px) 86vw, 420px"
        />

        <div
          id="print-template-only"
          className="relative aspect-[2/3] w-[80%] overflow-hidden rounded-md border border-black/20 shadow-2xl shadow-black/20"
        >
          {captures[1] ? (
            <div
              className="absolute overflow-hidden bg-black"
              style={{
                left: `${SLOT_LAYOUT[1].left}%`,
                top: `${SLOT_LAYOUT[1].top}%`,
                width: `${SLOT_LAYOUT[1].width}%`,
                height: `${SLOT_LAYOUT[1].height}%`,
              }}
            >
              <Image src={captures[1]} alt="" fill className="object-cover" />
            </div>
          ) : null}

          {captures[2] ? (
            <div
              className="absolute overflow-hidden bg-black"
              style={{
                left: `${SLOT_LAYOUT[2].left}%`,
                top: `${SLOT_LAYOUT[2].top}%`,
                width: `${SLOT_LAYOUT[2].width}%`,
                height: `${SLOT_LAYOUT[2].height}%`,
              }}
            >
              <Image src={captures[2]} alt="" fill className="object-cover" />
            </div>
          ) : null}

          <Image
            src="/cpl/template-1.png"
            alt=""
            fill
            priority
            className="object-contain"
            sizes="(max-width: 640px) 92vw, 520px"
          />
        </div>

        <div className="flex w-full max-w-[520px] mt-[2rem] flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleContinue}
            disabled={isUploading || !captures[1] || !captures[2]}
            className="block w-full"
          >
            <Image
              src="/cpl/btn-continue.png"
              alt="Continue"
              width={1024}
              height={216}
              className="h-auto w-full"
              sizes="(max-width: 640px) 90vw, 520px"
            />
          </button>
          <Link
            href={camHref}
            className="block w-full"
          >
            <Image
              src="/cpl/btn-retake.png"
              alt="Retake"
              width={1024}
              height={216}
              className="h-auto w-full"
              sizes="(max-width: 640px) 90vw, 520px"
            />
          </Link>
        </div>

        {uploadError ? (
          <p className="mt-2 text-center text-sm text-red-600">{uploadError}</p>
        ) : null}

        {qrImageUrl ? (
          <div className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-2 rounded-xl bg-white/90 px-4 py-4 shadow-xl">
            <img src={qrImageUrl} alt="QR Result" className="h-auto w-[180px]" />
            {uploadId ? (
              <p className="text-xs text-black">ID: {uploadId}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {isUploading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex w-[86%] max-w-[360px] flex-col items-center gap-3 rounded-2xl bg-white px-5 py-6 text-black">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-black" />
            <p className="text-center text-sm font-medium">
              Uploading ke server...
              <br />
              Mohon tunggu sebentar.
            </p>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #print-template-only,
          #print-template-only * {
            visibility: visible !important;
          }

          #print-template-only {
            position: fixed !important;
            inset: 0 !important;
            margin: auto !important;
            width: 100vw !important;
            max-width: 100vw !important;
            height: auto !important;
            aspect-ratio: 2 / 3 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
