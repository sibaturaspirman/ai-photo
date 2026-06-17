"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { INACO_STORAGE, inacoTemaThumbPath } from "@/lib/inaco/constants";
import { inacoPath } from "@/lib/inaco/model-version";

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

function TemaButton({
  id,
  isSelected,
  onSelect,
  className = "",
}: {
  id: number;
  isSelected: boolean;
  onSelect: (id: number) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`relative overflow-hidden rounded-xl border-4 ${className} ${
        isSelected ? "border-black/70" : "border-white/30"
      }`}
      aria-label={`Pilih tema ${id}`}
      aria-pressed={isSelected}
    >
      <div className="relative aspect-[491/540] w-full bg-black/10">
        <Image
          src={inacoTemaThumbPath(id)}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 640px) 40vw, 200px"
        />
        {isSelected ? <CheckBadge /> : null}
      </div>
    </button>
  );
}

export default function InacoTemplatePage() {
  const router = useRouter();
  const [selectedTema, setSelectedTema] = useState<number | null>(null);

  const selectTema = (temaId: number) => {
    setSelectedTema(temaId);
    window.localStorage.setItem(INACO_STORAGE.tema, String(temaId));
  };

  return (
    <main className="inaco-landscape-shell relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8">
      <div className="inaco-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat" aria-hidden />

      <div className="flex w-full max-w-5xl flex-col items-center xl:w-[50%]">
        <Image
          src="/inaco/pilih-tema.png"
          alt="Pilih tema"
          width={1009}
          height={393}
          className="h-auto w-[40%]"
        />

        <div className="mt-12 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((id) => (
            <TemaButton
              key={id}
              id={id}
              isSelected={selectedTema === id}
              onSelect={selectTema}
              className="w-full"
            />
          ))}
          <div className="col-span-2 flex justify-center gap-3 sm:col-span-3">
            {[4, 5].map((id) => (
              <TemaButton
                key={id}
                id={id}
                isSelected={selectedTema === id}
                onSelect={selectTema}
                className="w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)]"
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-disabled={!selectedTema}
          onClick={() => {
            if (!selectedTema) return;
            router.push(inacoPath("/inaco/style"));
          }}
          className={`mx-auto mt-10 block w-[80%] ${!selectedTema ? "pointer-events-none opacity-60" : ""}`}
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
    </main>
  );
}
