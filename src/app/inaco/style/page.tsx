"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { INACO_OUTFIT_COUNT, INACO_STORAGE, clearInacoUserData, inacoOutfitPath } from "@/lib/inaco/constants";

const CHECK_COLOR = "#E31837";

function CheckBadge() {
  return (
    <div
      className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg"
      style={{ backgroundColor: CHECK_COLOR }}
    >
      <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" aria-hidden>
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

export default function InacoStylePage() {
  const router = useRouter();
  const [selectedOutfit, setSelectedOutfit] = useState<number | null>(null);
  const [showPetunjuk, setShowPetunjuk] = useState(false);

  useEffect(() => {
    if (!window.localStorage.getItem(INACO_STORAGE.tema)) {
      router.replace("/inaco/template");
    }
    window.localStorage.removeItem(INACO_STORAGE.outfit);
    window.localStorage.removeItem(INACO_STORAGE.result);
    clearInacoUserData();
  }, [router]);

  const selectOutfit = (outfitId: number) => {
    setSelectedOutfit(outfitId);
    window.localStorage.setItem(INACO_STORAGE.outfit, String(outfitId));
  };

  const goToCam = () => {
    router.push("/inaco/cam");
  };

  return (
    <main className="inaco-landscape-shell relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8">
      <div className="inaco-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat" aria-hidden />

      <div className="flex w-full max-w-5xl flex-col items-center xl:w-[50%]">
        <Image
          src="/inaco/pilih-outfit.png"
          alt="Pilih outfit"
          width={786}
          height={295}
          className="h-auto w-[40%]"
        />

        <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-4">
          {Array.from({ length: INACO_OUTFIT_COUNT }, (_, i) => i + 1).map((id) => {
            const isSelected = selectedOutfit === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectOutfit(id)}
                className={`relative overflow-hidden rounded-xl border-4 ${
                  isSelected ? "border-black/70" : "border-white/30"
                }`}
                aria-label={`Pilih outfit ${id}`}
                aria-pressed={isSelected}
              >
                <div className="relative aspect-[600/1016] w-full bg-black/10">
                  <Image
                    src={inacoOutfitPath(id)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 40vw, 240px"
                  />
                  {isSelected ? <CheckBadge /> : null}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-disabled={!selectedOutfit}
          onClick={() => {
            if (!selectedOutfit) return;
            setShowPetunjuk(true);
          }}
          className={`mx-auto mt-10 block w-[80%] ${!selectedOutfit ? "pointer-events-none opacity-60" : ""}`}
        >
          <Image
            src="/inaco/btn-selanjutnya.png"
            alt="Lanjut"
            width={1326}
            height={240}
            className="h-auto w-full"
          />
        </button>
      </div>

      {showPetunjuk ? (
        <div
          className="absolute inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/80 px-4 py-8"
          role="button"
          tabIndex={0}
          aria-label="Tutup petunjuk dan lanjut ke kamera"
          onClick={goToCam}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goToCam();
            }
          }}
        >
          <Image
            src="/inaco/petunjuk.png"
            alt="Petunjuk foto"
            width={1476}
            height={1320}
            className="pointer-events-none h-auto max-h-[85dvh] w-[90vw] max-w-full object-contain xl:w-[45%]"
            sizes="100vw"
          />
        </div>
      ) : null}
    </main>
  );
}
