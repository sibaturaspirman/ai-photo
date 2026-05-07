"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SequisResultPage() {
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("sequis-result-image-url");
    setResultImageUrl(stored);
  }, []);

  return (
    <main className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8 text-white">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/sequis/bg.jpg)" }}
        aria-hidden
      />
      <div className="flex w-full max-w-4xl flex-col items-center gap-5 rounded-2xl border border-white/20 bg-slate-950/70 p-6">
        <Image src="/sequis/hasil-foto.png" alt="Hasil foto" width={824} height={184} className="h-auto w-[60%]" />

        {resultImageUrl ? (
          <div className="relative aspect-[2/3] w-full max-w-md overflow-hidden rounded-xl border border-white/20 bg-black/60">
            <Image src={resultImageUrl} alt="Generated result" fill className="object-contain" unoptimized />
          </div>
        ) : (
          <p className="text-sm text-slate-200">Belum ada hasil. Silakan generate dulu di halaman cam.</p>
        )}

        <div className="flex w-full max-w-md flex-col gap-3">
          {resultImageUrl ? (
            <a
              href={resultImageUrl}
              download="sequis-result.png"
              className="block"
              target="_blank"
              rel="noreferrer"
            >
              <Image src="/sequis/btn-download.png" alt="Download result" width={1024} height={216} className="h-auto w-full" />
            </a>
          ) : null}
          <Link href="/sequis/home" className="inline-flex justify-center rounded-md border border-white/20 px-4 py-2 text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
