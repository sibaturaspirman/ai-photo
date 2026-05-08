"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const JPEG_QUALITY_UPLOAD = 0.92;
const JPEG_QUALITY_PRINT = 1;
const DEBUG_ALWAYS_SHOW_QR_POPUP = false;
const DEBUG_QR_VALUE = "https://example.com/debug-qr";

type UploadResult = {
  file?: string | null;
  id?: string | number | null;
  error?: string;
};

export default function SequisResultPage() {
  const router = useRouter();
  const printImgRef = useRef<HTMLImageElement | null>(null);
  const [printPortalReady, setPrintPortalReady] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultFrameUrl, setResultFrameUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("sequis-result-image-url");
    const storedFrame = window.localStorage.getItem("sequis-result-frame-url");
    setResultImageUrl(stored);
    setResultFrameUrl(storedFrame);
  }, []);

  useEffect(() => {
    setPrintPortalReady(true);
  }, []);

  const effectiveQrValue = DEBUG_ALWAYS_SHOW_QR_POPUP ? qrValue ?? DEBUG_QR_VALUE : qrValue;
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

  async function buildCompositeCanvas() {
    if (!resultImageUrl) throw new Error("Hasil gambar tidak ditemukan.");
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1800;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context tidak tersedia.");

    const resultImg = await loadImage(resultImageUrl);
    drawImageCover(ctx, resultImg, 0, 0, canvas.width, canvas.height);

    if (resultFrameUrl) {
      const frameImg = await loadImage(resultFrameUrl);
      ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
    }

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

    const data = (await response.json()) as UploadResult;
    if (!response.ok) {
      throw new Error(data.error ?? "Direct upload ke Zirolu gagal.");
    }
    return { file: data.file ?? null, id: data.id ?? null };
  }

  const handleUploadAndPrint = async () => {
    if (!resultImageUrl || isUploading) return;
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
          printEl.onload = () => resolve();
          printEl.onerror = () => reject(new Error("Gagal memuat gambar untuk print."));
          printEl.src = printObjectUrl!;
        });
      }

      const name = window.localStorage.getItem("sequis-user-name") ?? "Guest";
      const phone = window.localStorage.getItem("sequis-user-phone") ?? "-";
      const template = window.localStorage.getItem("sequis-template") ?? "1";
      const style = window.localStorage.getItem("sequis-style");
      const formasi = style ? `Sequis T${template} S${style}` : `Sequis T${template}`;

      let data: UploadResult | { file: string | null; id: string | number | null };
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
        data = (await response.json()) as UploadResult;
        if (!response.ok) {
          throw new Error(data.error ?? "Upload gagal.");
        }
      }

      if (!data.file) throw new Error("Response upload tidak mengembalikan file URL.");
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
      window.setTimeout(() => window.print(), 250);
    } catch (error) {
      if (printObjectUrl) {
        URL.revokeObjectURL(printObjectUrl);
      }
      if (printImgRef.current) {
        printImgRef.current.removeAttribute("src");
      }
      setUploadError(error instanceof Error ? error.message : "Upload gagal.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="sequis-landscape-shell relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8 text-white">
      {printPortalReady
        ? createPortal(
            <img
              ref={printImgRef}
              id="print-hires-only-sequis"
              alt=""
              width={1200}
              height={1800}
              className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
              aria-hidden
            />,
            document.body,
          )
        : null}
      <div
        className="sequis-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        aria-hidden
      />
      <div className=" w-[73%] xl:w-[26%] translate-y-[4%] xl:translate-y-[6%] flex flex-col items-center gap-5">
        <Image src="/sequis/hasil-foto-kamu.png" alt="Hasil foto" width={824} height={184} className="h-auto w-[60%] mb-3 block xl:hidden" />

        {resultImageUrl ? (
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: "2 / 3" }}
          >
            <Image src={resultImageUrl} alt="Generated result" fill className="object-cover" unoptimized />
            {resultFrameUrl ? (
              <Image
                src={resultFrameUrl}
                alt="Result frame"
                fill
                className="pointer-events-none object-cover"
                unoptimized
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-200">Belum ada hasil. Silakan generate dulu di halaman cam.</p>
        )}

        <div className="flex w-full flex-col gap-3">
          {resultImageUrl ? (
            <button
              type="button"
              onClick={handleUploadAndPrint}
              disabled={isUploading}
              className="block"
            >
              <Image src="/sequis/btn-download.png" alt="Download result" width={1024} height={216} className="h-auto w-full" />
            </button>
          ) : null}
          <Link href="/sequis/template" className="block">
            <Image
              src="/cpl/btn-retake.png"
              alt="Retake"
              width={1024}
              height={216}
              className="h-auto w-full"
            />
          </Link>
        </div>
        {uploadError ? <p className="text-center text-sm text-red-300">{uploadError}</p> : null}
      </div>

      {isUploading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex w-[86%] max-w-md flex-col items-center gap-3 rounded-2xl bg-white p-8 text-black">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-300 border-t-black" />
            <p className="text-center text-[3vw] font-medium">
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
            router.push("/sequis/home");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push("/sequis/home");
            }
          }}
        >
          <div className="relative flex min-h-dvh w-full flex-col items-center overflow-hidden">
            <div className="sequis-bg absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat" />
            <Image
              src="/sequis/download.png"
              alt=""
              width={1542}
              height={494}
              className="mb-10 mt-[15rem] xl:mt-[13rem] xl:mb-0 h-auto w-[50%] xl:w-[10%] block xl:hidden"
              sizes="(max-width: 640px) 76vw, 360px"
            />
            <div className="mt-6 rounded-xl bg-white p-4 shadow-xl xl:mt-[18rem]">
              <img src={qrImageUrl} alt="QR Result" className="h-[720px] w-[720px]" />
            </div>
            {uploadId ? <p className="mt-2 text-2xl text-black">ID: {uploadId}</p> : null}
            <p className="mt-auto pb-[15rem] text-center text-[4vw] xl:text-[2vw] xl:mt-2 text-black/70">
              Ketuk layar untuk kembali ke home
            </p>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
          }
          body > *:not(#print-hires-only-sequis) {
            display: none !important;
          }
          #print-hires-only-sequis {
            display: block !important;
            visibility: visible !important;
            position: fixed !important;
            inset: 0 !important;
            margin: auto !important;
            width: auto !important;
            height: auto !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
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
