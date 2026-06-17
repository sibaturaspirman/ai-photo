"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  INACO_FRAME_PATH,
  INACO_FRAME_PHOTO_SLOT,
  INACO_FRAME_SIZE,
  INACO_STORAGE,
  hasInacoGenerateAccess,
  saveInacoSubmissionData,
  waitForInacoGenerateResult,
} from "@/lib/inaco2/constants";

const JPEG_QUALITY_PRINT = 1;

type SubmitApiResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    data?: {
      qrUrl?: string;
      submissionId?: number | string;
    };
    qrUrl?: string;
    submissionId?: number | string;
  };
};

function extractSubmissionFromResponse(payload: SubmitApiResponse) {
  const nested = payload.data?.data;
  const qrUrl = nested?.qrUrl ?? payload.data?.qrUrl;
  const submissionId = nested?.submissionId ?? payload.data?.submissionId;
  if (!qrUrl) return null;
  return { qrUrl, submissionId };
}

export default function InacoResultPage() {
  const router = useRouter();
  const printImgRef = useRef<HTMLImageElement | null>(null);
  const [printPortalReady, setPrintPortalReady] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [showQrOverlay, setShowQrOverlay] = useState(false);

  useEffect(() => {
    if (!hasInacoGenerateAccess()) {
      router.replace("/inaco2/cam");
      return;
    }
    const userName = window.localStorage.getItem(INACO_STORAGE.userName);
    const userPhone = window.localStorage.getItem(INACO_STORAGE.userPhone);
    const userSocial = window.localStorage.getItem(INACO_STORAGE.userSocialUsername);
    if (!userName || !userPhone || !userSocial) {
      router.replace("/inaco2/form");
      return;
    }

    const storedResult = window.localStorage.getItem(INACO_STORAGE.result);
    const storedQrUrl = window.localStorage.getItem(INACO_STORAGE.qrUrl);
    setResultImageUrl(storedResult);
    setQrValue(storedQrUrl);
    const storedSubmissionId = window.localStorage.getItem(INACO_STORAGE.submissionId);
    setSubmissionId(storedSubmissionId);
  }, [router]);

  useEffect(() => {
    setPrintPortalReady(true);
  }, []);

  const qrImageUrl = useMemo(() => {
    if (!qrValue) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=720x720&data=${encodeURIComponent(qrValue)}`;
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

  function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (file) => {
          if (file) resolve(file);
          else reject(new Error("Gagal mengekspor gambar."));
        },
        "image/jpeg",
        quality,
      );
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

  async function buildCompositeCanvas() {
    if (!resultImageUrl) throw new Error("Hasil gambar tidak ditemukan.");
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1800;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context tidak tersedia.");

    const [resultImg, frameImg] = await Promise.all([
      loadImage(resultImageUrl),
      loadImage(INACO_FRAME_PATH),
    ]);

    ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

    const photoX = INACO_FRAME_PHOTO_SLOT.left;
    const photoY = INACO_FRAME_PHOTO_SLOT.top;
    const photoW = INACO_FRAME_PHOTO_SLOT.width;
    const photoH = INACO_FRAME_PHOTO_SLOT.height;
    drawImageCover(ctx, resultImg, photoX, photoY, photoW, photoH);

    return canvas;
  }

  async function submitIfNeeded() {
    if (qrValue) return;

    const name = window.localStorage.getItem(INACO_STORAGE.userName);
    const phone = window.localStorage.getItem(INACO_STORAGE.userPhone);
    const socialPlatform = window.localStorage.getItem(INACO_STORAGE.userSocialPlatform);
    const socialUsername = window.localStorage.getItem(INACO_STORAGE.userSocialUsername);
    if (!name || !phone || !socialPlatform || !socialUsername) {
      throw new Error("Data form tidak lengkap. Silakan isi ulang form.");
    }

    setIsSubmitting(true);
    try {
      let result = window.localStorage.getItem(INACO_STORAGE.result);
      if (!result) {
        result = await waitForInacoGenerateResult();
        setResultImageUrl(result);
      }

      const response = await fetch("/api/inaco2/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          waNumber: phone,
          socialMediaChannel: socialPlatform,
          socialMediaAccount: socialUsername,
          result,
        }),
      });

      const data = (await response.json()) as SubmitApiResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Gagal submit data.");
      }

      const submission = extractSubmissionFromResponse(data);
      if (!submission?.qrUrl) {
        throw new Error("Response submit tidak mengembalikan qrUrl.");
      }

      saveInacoSubmissionData(submission);
      setQrValue(submission.qrUrl);
      setSubmissionId(submission.submissionId != null ? String(submission.submissionId) : null);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePrint = async () => {
    if (isPrinting || isSubmitting) return;
    setPrintError(null);
    setIsPrinting(true);
    let printObjectUrl: string | null = null;

    try {
      await submitIfNeeded();
      const compositeCanvas = await buildCompositeCanvas();
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

      const revokePrintUrl = () => {
        if (printObjectUrl) {
          URL.revokeObjectURL(printObjectUrl);
          printObjectUrl = null;
        }
        printImgRef.current?.removeAttribute("src");
      };
      window.addEventListener("afterprint", revokePrintUrl, { once: true });
      window.setTimeout(revokePrintUrl, 120_000);
      window.setTimeout(() => window.print(), 250);
      setShowQrOverlay(true);
    } catch (error) {
      if (printObjectUrl) URL.revokeObjectURL(printObjectUrl);
      printImgRef.current?.removeAttribute("src");
      setPrintError(error instanceof Error ? error.message : "Gagal print.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <main className="inaco-landscape-shell relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8 text-white">
      {printPortalReady
        ? createPortal(
            <img
              ref={printImgRef}
              id="print-hires-only-inaco2"
              alt=""
              width={1200}
              height={1800}
              className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
              aria-hidden
            />,
            document.body,
          )
        : null}

      <div className="inaco-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat" aria-hidden />

      <div className="flex w-[85%] max-w-2xl flex-col items-center gap-5 xl:w-[45%]">
        <Image
          src="/inaco/hasil-foto.png"
          alt="Hasil foto"
          width={1124}
          height={127}
          className="h-auto w-[60%] mb-6"
        />

        {resultImageUrl ? (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "2 / 3" }}>
            <Image
              src={INACO_FRAME_PATH}
              alt=""
              fill
              className="object-cover"
              unoptimized
              priority
            />
            <div
              className="absolute overflow-hidden"
              style={{
                left: `${(INACO_FRAME_PHOTO_SLOT.left / INACO_FRAME_SIZE.width) * 100}%`,
                top: `${(INACO_FRAME_PHOTO_SLOT.top / INACO_FRAME_SIZE.height) * 100}%`,
                width: `${(INACO_FRAME_PHOTO_SLOT.width / INACO_FRAME_SIZE.width) * 100}%`,
                height: `${(INACO_FRAME_PHOTO_SLOT.height / INACO_FRAME_SIZE.height) * 100}%`,
              }}
            >
              <Image
                src={resultImageUrl}
                alt="Generated result"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-200">Generating foto... mohon tunggu lalu coba Print lagi.</p>
        )}

        <div className="flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={isPrinting || isSubmitting}
            className="block"
          >
            <Image
              src="/inaco/btn-print.png"
              alt="Print"
              width={1326}
              height={240}
              className="h-auto w-full"
            />
          </button>
        </div>

        {printError ? <p className="text-center text-sm text-red-300">{printError}</p> : null}
      </div>

      {isPrinting || isSubmitting ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="flex w-[86%] max-w-2xl flex-col items-center gap-3 rounded-2xl bg-white p-8 text-black">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-zinc-300 border-t-black" />
            <p className="text-center text-[3vw] font-medium">
              {isSubmitting ? "Submitting & Generating..." : "Menyiapkan print... Mohon tunggu."}
            </p>
          </div>
        </div>
      ) : null}

      {showQrOverlay && qrImageUrl ? (
        <div
          className="absolute inset-0 z-[60] flex min-h-dvh w-full cursor-pointer items-center justify-center"
          role="button"
          tabIndex={0}
          aria-label="Kembali ke home"
          onClick={() => router.push("/inaco2")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push("/inaco2");
            }
          }}
        >
          <div className="relative flex min-h-dvh w-full flex-col items-center overflow-hidden">
            <div className="inaco-bg absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat" aria-hidden />

            <Image
              src="/cpl/scan.png"
              alt=""
              width={1542}
              height={494}
              className="mb-10 mt-[13rem] h-auto w-[70%]"
              sizes="(max-width: 640px) 76vw, 360px"
            />

            <div className="mt-6 rounded-xl bg-white p-4 shadow-xl">
              <img src={qrImageUrl} alt="QR Result" className="h-[720px] w-[720px]" />
            </div>

            {submissionId ? <p className="mt-2 text-2xl text-black">ID: {submissionId}</p> : null}

            <p className="mt-auto pb-[15rem] text-center text-[4vw] text-black/70">
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
          body > *:not(#print-hires-only-inaco2) {
            display: none !important;
          }
          #print-hires-only-inaco2 {
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
