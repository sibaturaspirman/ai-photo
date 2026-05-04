"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Captures = {
  1: string | null;
  2: string | null;
  3: string | null;
};

const EMPTY_CAPTURES: Captures = { 1: null, 2: null, 3: null };
/** JPEG `toBlob` quality: upload (ukuran file) vs print (maks detail). */
const JPEG_QUALITY_UPLOAD = 0.92;
const JPEG_QUALITY_PRINT = 1;
const DEBUG_ALWAYS_SHOW_QR_POPUP = false;
const DEBUG_QR_VALUE = "https://example.com/debug-qr";
const CANVAS_W = 1200;
const CANVAS_H = 1800;
const TEMPLATE_1_SLOT_LAYOUT = {
  1: { left: 3, top: 39.7, width: 45.6, height: 41.1 },
  2: { left: 69.5, top: 68.5, width: 28, height: 12.5 },
} as const;
const TEMPLATE_2_SLOT_LAYOUT = {
  1: {
    left: (40 / CANVAS_W) * 100,
    top: (347 / CANVAS_H) * 100,
    width: (1120 / CANVAS_W) * 100,
    height: (497 / CANVAS_H) * 100,
  },
  2: {
    left: (807 / CANVAS_W) * 100,
    top: (950 / CANVAS_H) * 100,
    width: (353 / CANVAS_W) * 100,
    height: (353 / CANVAS_H) * 100,
  },
  3: {
    left: (40 / CANVAS_W) * 100,
    top: (1391 / CANVAS_H) * 100,
    width: (713 / CANVAS_W) * 100,
    height: (249 / CANVAS_H) * 100,
  },
} as const;

const T3_POLAROID_HOLE = { left: 105, top: 1140, w: 400, h: 400 } as const;
const T3_USER = 330;
const T3_OFFSET = (T3_POLAROID_HOLE.w - T3_USER) / 2;
/** Counter-clockwise tilt to match polaroid frame in template-3. */
const T3_POLAROID_ROT_DEG = -15;
const TEMPLATE_3_POLAROID_CLIP = {
  left: (T3_POLAROID_HOLE.left / CANVAS_W) * 100,
  top: (T3_POLAROID_HOLE.top / CANVAS_H) * 100,
  width: (T3_POLAROID_HOLE.w / CANVAS_W) * 100,
  height: (T3_POLAROID_HOLE.h / CANVAS_H) * 100,
} as const;
const TEMPLATE_3_SLOT_LAYOUT = {
  2: {
    left: ((T3_POLAROID_HOLE.left + T3_OFFSET) / CANVAS_W) * 100,
    top: ((T3_POLAROID_HOLE.top + T3_OFFSET) / CANVAS_H) * 100,
    width: (T3_USER / CANVAS_W) * 100,
    height: (T3_USER / CANVAS_H) * 100,
  },
} as const;

/** Take 2: flush right; top = previous top + 3% of canvas height. */
const T4_TAKE2_RECT = {
  left: CANVAS_W - 441,
  top: 426 + CANVAS_H * 0.015,
  w: 441,
  h: 273,
} as const;
const TEMPLATE_4_SLOT_LAYOUT = {
  2: {
    left: (T4_TAKE2_RECT.left / CANVAS_W) * 100,
    top: (T4_TAKE2_RECT.top / CANVAS_H) * 100,
    width: (T4_TAKE2_RECT.w / CANVAS_W) * 100,
    height: (T4_TAKE2_RECT.h / CANVAS_H) * 100,
  },
} as const;

function camStorageBase(template: number) {
  if (template === 2) return "cpl-cam-template-2";
  if (template === 3) return "cpl-cam-template-3";
  if (template === 4) return "cpl-cam-template-4";
  return "cpl-cam-template-1";
}

export default function CplResultPage() {
  const router = useRouter();
  const printImgRef = useRef<HTMLImageElement | null>(null);
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

    try {
      const base = camStorageBase(resolved);
      const rawAi = window.localStorage.getItem(`${base}-ai`);
      const raw = rawAi ?? window.localStorage.getItem(base);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Captures>;
      setCaptures({
        1: typeof parsed[1] === "string" ? parsed[1] : null,
        2: typeof parsed[2] === "string" ? parsed[2] : null,
        3: typeof parsed[3] === "string" ? parsed[3] : null,
      });
    } catch {
      setCaptures(EMPTY_CAPTURES);
    }
  }, []);

  const camHref = useMemo(
    () => `/cpl/cam2?template=${selectedTemplate}`,
    [selectedTemplate],
  );

  const effectiveQrValue = DEBUG_ALWAYS_SHOW_QR_POPUP
    ? qrValue ?? DEBUG_QR_VALUE
    : qrValue;

  const qrImageUrl = useMemo(() => {
    if (!effectiveQrValue) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=720x720&data=${encodeURIComponent(
      effectiveQrValue,
    )}`;
  }, [effectiveQrValue]);

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

  function drawImageCoverRotatedIntoHole(
    destCtx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    rotationDeg: number,
    clipRect: { x: number; y: number; w: number; h: number },
  ) {
    const tmp = document.createElement("canvas");
    tmp.width = Math.ceil(clipRect.w);
    tmp.height = Math.ceil(clipRect.h);
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    const cx = dx + dw / 2 - clipRect.x;
    const cy = dy + dh / 2 - clipRect.y;
    tctx.translate(cx, cy);
    tctx.rotate((rotationDeg * Math.PI) / 180);
    drawImageCover(tctx, img, -dw / 2, -dh / 2, dw, dh);
    destCtx.drawImage(tmp, clipRect.x, clipRect.y);
  }

  function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (file) => {
          if (file) resolve(file);
          else reject(new Error("Gagal mengekspor gambar hasil komposit."));
        },
        "image/jpeg",
        quality,
      );
    });
  }

  async function buildCompositeCanvas(): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1800;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context tidak tersedia.");
    }

    const tpl = selectedTemplate;

    if (tpl === 3) {
      if (captures[1]) {
        const img = await loadImage(captures[1]);
        drawImageCover(ctx, img, 0, 0, canvas.width, canvas.height);
      }
      if (captures[2]) {
        const img = await loadImage(captures[2]);
        const slot = TEMPLATE_3_SLOT_LAYOUT[2];
        const dx = (slot.left / 100) * canvas.width;
        const dy = (slot.top / 100) * canvas.height;
        const dw = (slot.width / 100) * canvas.width;
        const dh = (slot.height / 100) * canvas.height;
        drawImageCoverRotatedIntoHole(ctx, img, dx, dy, dw, dh, T3_POLAROID_ROT_DEG, {
          x: (T3_POLAROID_HOLE.left / CANVAS_W) * canvas.width,
          y: (T3_POLAROID_HOLE.top / CANVAS_H) * canvas.height,
          w: (T3_POLAROID_HOLE.w / CANVAS_W) * canvas.width,
          h: (T3_POLAROID_HOLE.h / CANVAS_H) * canvas.height,
        });
      }
    } else if (tpl === 4) {
      if (captures[1]) {
        const img = await loadImage(captures[1]);
        drawImageCover(ctx, img, 0, 0, canvas.width, canvas.height);
      }
      if (captures[2]) {
        const img = await loadImage(captures[2]);
        const slot = TEMPLATE_4_SLOT_LAYOUT[2];
        drawImageCover(
          ctx,
          img,
          (slot.left / 100) * canvas.width,
          (slot.top / 100) * canvas.height,
          (slot.width / 100) * canvas.width,
          (slot.height / 100) * canvas.height,
        );
      }
    } else if (tpl === 2) {
      for (const key of [1, 2, 3] as const) {
        const src = captures[key];
        if (!src) continue;
        const img = await loadImage(src);
        const slot = TEMPLATE_2_SLOT_LAYOUT[key];
        drawImageCover(
          ctx,
          img,
          (slot.left / 100) * canvas.width,
          (slot.top / 100) * canvas.height,
          (slot.width / 100) * canvas.width,
          (slot.height / 100) * canvas.height,
        );
      }
    } else {
      for (const key of [1, 2] as const) {
        const src = captures[key];
        if (!src) continue;
        const img = await loadImage(src);
        const slot = TEMPLATE_1_SLOT_LAYOUT[key];
        drawImageCover(
          ctx,
          img,
          (slot.left / 100) * canvas.width,
          (slot.top / 100) * canvas.height,
          (slot.width / 100) * canvas.width,
          (slot.height / 100) * canvas.height,
        );
      }
    }

    const templatePath =
      tpl === 4
        ? "/cpl/template-4-fix3.png"
        : tpl === 3
          ? "/cpl/template-3-fix5.png"
          : tpl === 2
            ? "/cpl/template-2.png"
            : "/cpl/template-1.png";
    const template = await loadImage(templatePath);
    ctx.drawImage(template, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  async function uploadDirectToZirolu(
    file: Blob,
    payload: { name: string; phone: string; formasi: string },
  ) {
    const auth = process.env.NEXT_PUBLIC_ZIROLU_AUTH;
    if (!auth) {
      throw new Error("NEXT_PUBLIC_ZIROLU_AUTH tidak tersedia untuk direct upload.");
    }

    const bodyFormData = new FormData();
    bodyFormData.append("name", `IQOS ${payload.formasi}`);
    bodyFormData.append("phone", payload.phone);
    bodyFormData.append("file", file, `${payload.name}-photo-ai-zirolu.jpg`);

    const response = await fetch("https://photo-ai-iims.zirolu.id/v1/iqos", {
      method: "POST",
      body: bodyFormData,
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });

    const data = (await response.json()) as {
      file?: string;
      id?: string | number;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(data.message ?? "Direct upload ke Zirolu gagal.");
    }
    return { file: data.file ?? null, id: data.id ?? null };
  }

  const handleContinue = async () => {
    const capturesReady =
      selectedTemplate === 2
        ? Boolean(captures[1] && captures[2] && captures[3])
        : Boolean(captures[1] && captures[2]);
    if (!capturesReady || isUploading) return;
    setUploadError(null);
    setIsUploading(true);
    let printObjectUrl: string | null = null;
    try {
      const compositeCanvas = await buildCompositeCanvas();
      const uploadBlob = await canvasToJpegBlob(compositeCanvas, JPEG_QUALITY_UPLOAD);
      const printBlob = await canvasToJpegBlob(compositeCanvas, JPEG_QUALITY_PRINT);
      printObjectUrl = URL.createObjectURL(printBlob);
      const printEl = printImgRef.current;
      if (printEl) {
        await new Promise<void>((resolve, reject) => {
          printEl.onload = () => {
            if (typeof printEl.decode === "function") {
              printEl.decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
          };
          printEl.onerror = () => reject(new Error("Gagal memuat gambar untuk print."));
          printEl.src = printObjectUrl!;
        });
      }
      const name = window.localStorage.getItem("cpl-user-name") ?? "Guest";
      const phone = window.localStorage.getItem("cpl-user-phone") ?? "-";
      const formasi =
        window.localStorage.getItem("cpl-formasi") ?? `Template ${selectedTemplate}`;
      let data:
        | { file?: string | null; id?: string | number | null; error?: string }
        | { file: string | null; id: string | number | null };

      if (process.env.NEXT_PUBLIC_ZIROLU_AUTH) {
        data = await uploadDirectToZirolu(uploadBlob, { name, phone, formasi });
      } else {
        const payload = new FormData();
        payload.append("name", name);
        payload.append("phone", phone);
        payload.append("formasi", formasi);
        payload.append("file", uploadBlob, `${name}-photo-ai-zirolu.jpg`);

        const response = await fetch("/api/cpl/upload", {
          method: "POST",
          body: payload,
        });

        data = (await response.json()) as {
          file?: string | null;
          id?: string | number | null;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Upload gagal.");
        }
      }

      if (!data.file) {
        throw new Error("Response upload tidak mengembalikan file URL.");
      }

      setQrValue(data.file);
      setUploadId(data.id ? String(data.id) : null);
      window.localStorage.setItem("faceURLResult", data.file);

      const revokePrintUrl = () => {
        if (printObjectUrl) {
          URL.revokeObjectURL(printObjectUrl);
          printObjectUrl = null;
        }
        if (printImgRef.current) {
          printImgRef.current.removeAttribute("src");
        }
      };
      window.addEventListener("afterprint", revokePrintUrl, { once: true });
      window.setTimeout(revokePrintUrl, 120_000);

      window.setTimeout(() => {
        window.print();
      }, 250);
    } catch (error) {
      if (printObjectUrl) {
        URL.revokeObjectURL(printObjectUrl);
        printObjectUrl = null;
        if (printImgRef.current) {
          printImgRef.current.removeAttribute("src");
        }
      }
      setUploadError(error instanceof Error ? error.message : "Upload gagal.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-6">
      <img
        ref={printImgRef}
        id="print-hires-only"
        alt=""
        width={1200}
        height={1800}
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
        aria-hidden
      />
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
          {selectedTemplate === 2
            ? ([1, 2, 3] as const).map((key) =>
                captures[key] ? (
                  <div
                    key={key}
                    className="absolute overflow-hidden bg-black"
                    style={{
                      left: `${TEMPLATE_2_SLOT_LAYOUT[key].left}%`,
                      top: `${TEMPLATE_2_SLOT_LAYOUT[key].top}%`,
                      width: `${TEMPLATE_2_SLOT_LAYOUT[key].width}%`,
                      height: `${TEMPLATE_2_SLOT_LAYOUT[key].height}%`,
                    }}
                  >
                    <Image src={captures[key]!} alt="" fill className="object-cover" />
                  </div>
                ) : null,
              )
            : selectedTemplate === 3
              ? (
                  <>
                    {captures[1] ? (
                      <div className="absolute inset-0 overflow-hidden bg-black">
                        <Image src={captures[1]} alt="" fill className="object-cover" />
                      </div>
                    ) : null}
                    {captures[2] ? (
                      <div
                        className="absolute overflow-hidden"
                        style={{
                          left: `${TEMPLATE_3_POLAROID_CLIP.left}%`,
                          top: `${TEMPLATE_3_POLAROID_CLIP.top}%`,
                          width: `${TEMPLATE_3_POLAROID_CLIP.width}%`,
                          height: `${TEMPLATE_3_POLAROID_CLIP.height}%`,
                        }}
                      >
                        <div
                          className="absolute overflow-hidden"
                          style={{
                            left: `${(T3_OFFSET / T3_POLAROID_HOLE.w) * 100}%`,
                            top: `${(T3_OFFSET / T3_POLAROID_HOLE.h) * 100}%`,
                            width: `${(T3_USER / T3_POLAROID_HOLE.w) * 100}%`,
                            height: `${(T3_USER / T3_POLAROID_HOLE.h) * 100}%`,
                            transform: `rotate(${T3_POLAROID_ROT_DEG}deg)`,
                            transformOrigin: "center center",
                          }}
                        >
                          <Image src={captures[2]} alt="" fill className="object-cover" />
                        </div>
                      </div>
                    ) : null}
                  </>
                )
              : selectedTemplate === 4
                ? (
                    <>
                      {captures[1] ? (
                        <div className="absolute inset-0 overflow-hidden bg-black">
                          <Image src={captures[1]} alt="" fill className="object-cover" />
                        </div>
                      ) : null}
                      {captures[2] ? (
                        <div
                          className="absolute overflow-hidden bg-black"
                          style={{
                            left: `${TEMPLATE_4_SLOT_LAYOUT[2].left}%`,
                            top: `${TEMPLATE_4_SLOT_LAYOUT[2].top}%`,
                            width: `${TEMPLATE_4_SLOT_LAYOUT[2].width}%`,
                            height: `${TEMPLATE_4_SLOT_LAYOUT[2].height}%`,
                          }}
                        >
                          <Image src={captures[2]} alt="" fill className="object-cover" />
                        </div>
                      ) : null}
                    </>
                  )
                : ([1, 2] as const).map((key) =>
                  captures[key] ? (
                    <div
                      key={key}
                      className="absolute overflow-hidden bg-black"
                      style={{
                        left: `${TEMPLATE_1_SLOT_LAYOUT[key].left}%`,
                        top: `${TEMPLATE_1_SLOT_LAYOUT[key].top}%`,
                        width: `${TEMPLATE_1_SLOT_LAYOUT[key].width}%`,
                        height: `${TEMPLATE_1_SLOT_LAYOUT[key].height}%`,
                      }}
                    >
                      <Image src={captures[key]!} alt="" fill className="object-cover" />
                    </div>
                  ) : null,
                )}

          <Image
            src={
              selectedTemplate === 4
                ? "/cpl/template-4-fix3.png"
                : selectedTemplate === 3
                  ? "/cpl/template-3-fix5.png"
                  : selectedTemplate === 2
                    ? "/cpl/template-2.png"
                    : "/cpl/template-1.png"
            }
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
            disabled={
              isUploading ||
              !captures[1] ||
              !captures[2] ||
              (selectedTemplate === 2 && !captures[3])
            }
            className="block w-full"
          >
            <Image
              src="/cpl/btn-collect.png"
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

      </div>

      {isUploading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex w-[86%] flex-col items-center gap-3 rounded-2xl bg-white p-10 text-black">
            <div className="h-[100px] w-[100px] animate-spin rounded-full border-4 border-zinc-300 border-t-black" />
            <p className="text-center text-[5vw] font-medium">
              Uploading ke server...
              <br />
              Mohon tunggu sebentar.
            </p>
          </div>
        </div>
      ) : null}

      {qrImageUrl ? (
        <div
          className="absolute inset-0 z-[60] flex min-h-dvh w-full cursor-pointer items-center justify-center"
          role="button"
          tabIndex={0}
          aria-label="Kembali ke home"
          onClick={() => {
            router.push("/cpl");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push("/cpl");
            }
          }}
        >
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
          <div className="relative flex min-h-dvh w-full flex-col items-center overflow-hidden">
            <div
              className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/cpl/bg.jpg)" }}
            />
            <div
              className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url(/cpl/frame.png)" }}
            />

            <Image
              src="/cpl/scan.png"
              alt=""
              width={1542}
              height={494}
              className="mt-[13rem] mb-10 h-auto w-[70%]"
              sizes="(max-width: 640px) 76vw, 360px"
            />

            <div className="mt-6 rounded-xl bg-white p-4 shadow-xl">
              <img src={qrImageUrl} alt="QR Result" className="h-[720px] w-[720px]" />
            </div>

            {uploadId ? <p className="mt-2 text-2xl text-black">ID: {uploadId}</p> : null}

            <p className="mt-auto pb-[15rem] text-center text-[4vw] text-black/70">
              Ketuk layar untuk kembali ke home
            </p>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #print-hires-only {
            visibility: visible !important;
            position: fixed !important;
            inset: 0 !important;
            margin: auto !important;
            width: auto !important;
            height: auto !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            min-width: 0 !important;
            object-fit: contain !important;
            object-position: center !important;
            opacity: 1 !important;
            z-index: 99999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </main>
  );
}
