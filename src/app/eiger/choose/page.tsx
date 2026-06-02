"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EIGER_STORAGE } from "@/lib/eiger/constants";
import { buildOutfitComposite } from "@/lib/eiger/outfit";
import { EigerButton, EigerContent, EigerShell } from "@/components/eiger/eiger-shell";

type Category = "jaket" | "pants" | "aksesoris";

const OPTIONS: Record<Category, { id: number; image: string }[]> = {
  jaket: [
    { id: 1, image: "/eiger/jaket-1.png" },
    { id: 2, image: "/eiger/jaket-2.png" },
    { id: 3, image: "/eiger/jaket-3.png" },
  ],
  pants: [
    { id: 1, image: "/eiger/pants-1.png" },
    { id: 2, image: "/eiger/pants-2.png" },
    { id: 3, image: "/eiger/pants-3.png" },
  ],
  aksesoris: [
    { id: 1, image: "/eiger/aksesoris-1.png" },
    { id: 2, image: "/eiger/aksesoris-2.png" },
    { id: 3, image: "/eiger/aksesoris-3.png" },
  ],
};

const CATEGORY_LABELS: Record<Category, string> = {
  jaket: "Jacket",
  pants: "Pants",
  aksesoris: "Accessories",
};

function CheckBadge() {
  return (
    <div className="absolute left-1/2 top-1/2 flex h-[clamp(2.5rem,8vw,3.5rem)] w-[clamp(2.5rem,8vw,3.5rem)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#E87722] shadow-lg">
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%] text-white" aria-hidden>
        <path
          d="M20 6L9 17l-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function EigerChoosePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<Category, number | null>>({
    jaket: null,
    pants: null,
    aksesoris: null,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [processingPercent, setProcessingPercent] = useState(0);

  useEffect(() => {
    if (!window.localStorage.getItem(EIGER_STORAGE.capture)) {
      router.replace("/eiger/cam");
      return;
    }

    window.localStorage.removeItem(EIGER_STORAGE.result);
    setSelected({
      jaket: Number(window.localStorage.getItem(EIGER_STORAGE.jaket)) || null,
      pants: Number(window.localStorage.getItem(EIGER_STORAGE.pants)) || null,
      aksesoris: Number(window.localStorage.getItem(EIGER_STORAGE.aksesoris)) || null,
    });
  }, [router]);

  useEffect(() => {
    if (!isGenerating) return;
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
  }, [isGenerating]);

  const selectOption = (category: Category, id: number) => {
    if (isGenerating) return;
    setSelected((prev) => ({ ...prev, [category]: id }));
    window.localStorage.setItem(EIGER_STORAGE[category], String(id));
  };

  const allSelected = selected.jaket && selected.pants && selected.aksesoris;

  const handleContinue = async () => {
    if (!allSelected || isGenerating) return;

    const personPhoto = window.localStorage.getItem(EIGER_STORAGE.capture);
    if (!personPhoto) {
      router.replace("/eiger/cam");
      return;
    }

    setGenerateError(null);
    setIsGenerating(true);
    setProcessingPercent(0);

    try {
      const outfitPhoto = await buildOutfitComposite({
        jaket: selected.jaket!,
        pants: selected.pants!,
        aksesoris: selected.aksesoris!,
      });

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 150000);
      const response = await fetch("/api/eiger/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personPhoto, outfitPhoto }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      const data = (await response.json()) as { imageUrl?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Gagal generate virtual try-on.");
      if (!data.imageUrl) throw new Error("Response API tidak berisi hasil gambar.");

      window.localStorage.setItem(EIGER_STORAGE.result, data.imageUrl);
      setProcessingPercent(100);
      router.push("/eiger/result");
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "Proses AI timeout. Coba lagi ya."
          : error instanceof Error
            ? error.message
            : "Gagal memproses virtual try-on.";
      setGenerateError(message);
      setIsGenerating(false);
      setProcessingPercent(0);
    }
  };

  return (
    <EigerShell background="tryon" scroll>
      <EigerContent className="gap-[1vw] md:gap-[clamp(1.25rem,4vh,2rem)] mt-[23vw] w-[90%] lg:w-[70%]">
        {(Object.keys(OPTIONS) as Category[]).map((category) => (
          <section key={category} className="w-full shrink-0">
            <h2 className="eiger-title mb-[clamp(0.5rem,2vh,0.75rem)]">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-3 gap-[clamp(0.5rem,2vw,0.75rem)]">
              {OPTIONS[category].map((option) => {
                const isSelected = selected[category] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => selectOption(category, option.id)}
                    disabled={isGenerating}
                    className={`relative overflow-hidden rounded-xl border-4 bg-black/10 transition-colors disabled:opacity-60 ${
                      isSelected ? "border-[#E87722]" : "border-white/30"
                    }`}
                    aria-label={`Pilih ${CATEGORY_LABELS[category]} ${option.id}`}
                    aria-pressed={isSelected}
                  >
                    <div className="relative aspect-[783/1086] w-full">
                      <Image
                        src={option.image}
                        alt=""
                        fill
                        className="object-contain"
                        sizes="(max-width: 1080px) 30vw, 320px"
                      />
                      {isSelected ? <CheckBadge /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {generateError ? (
          <p className="w-full shrink-0 text-center text-sm text-red-300">{generateError}</p>
        ) : null}

        <div className="eiger-actions pb-[clamp(0.5rem,2vh,1rem)]">
          <EigerButton
            aria-disabled={!allSelected || isGenerating}
            disabled={!allSelected || isGenerating}
            onClick={() => void handleContinue()}
          >
            Generate Look
          </EigerButton>
        </div>
      </EigerContent>

      {isGenerating ? (
        <div className="eiger-loading-overlay">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/eiger/bg2.png"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col items-center text-white">
            <div className="flex animate-bounce flex-col items-center">
              <p className="eiger-countdown">{processingPercent}%</p>
              <p className="mt-2 text-[4vw] font-semibold uppercase tracking-wide">
                Virtual Try-On
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </EigerShell>
  );
}
