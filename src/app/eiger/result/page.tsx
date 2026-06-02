"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EIGER_STORAGE } from "@/lib/eiger/constants";
import { EigerButtonLink, EigerContent, EigerShell } from "@/components/eiger/eiger-shell";

export default function EigerResultPage() {
  const router = useRouter();
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(EIGER_STORAGE.result);
    if (!stored) {
      router.replace("/eiger/choose");
      return;
    }
    setResultImageUrl(stored);
  }, [router]);

  return (
    <EigerShell background="tryon">
      <EigerContent>
        {/* <h1 className="eiger-title">Look Kamu</h1> */}

        <div className="eiger-cam-preview mt-[14vw]">
          <div className="eiger-cam-preview__frame">
            {resultImageUrl ? (
              <Image
                src={resultImageUrl}
                alt="Hasil virtual try-on"
                fill
                unoptimized
                priority
                className="object-cover"
                sizes="(max-width: 1080px) 70vw, 756px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white/80">
                Memuat hasil...
              </div>
            )}
          </div>
        </div>

        <div className="eiger-actions">
          <EigerButtonLink href="/eiger/choose" variant="secondary">
            Pilih Ulang
          </EigerButtonLink>
          <EigerButtonLink href="/eiger">Kembali ke Home</EigerButtonLink>
        </div>
      </EigerContent>
    </EigerShell>
  );
}
