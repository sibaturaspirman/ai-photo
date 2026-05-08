"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const styles = [
  { id: 1, image: "/sequis/s1.png" },
  { id: 2, image: "/sequis/s2.png" },
  { id: 3, image: "/sequis/s3.png" },
];

export default function SequisStylePage() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem("sequis-template", "2");
    window.localStorage.removeItem("sequis-style");
  }, []);

  const selectStyle = (styleId: number) => {
    setSelectedStyle(styleId);
    window.localStorage.setItem("sequis-style", String(styleId));
    const params = new URLSearchParams(window.location.search);
    params.set("style", String(styleId));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  return (
    <main className="sequis-landscape-shell relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8">
      <div className="sequis-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat" aria-hidden />

      <div className="flex w-full max-w-5xl xl:mt-[5rem] xl:w-[70%] flex-col items-center">
        <Image src="/sequis/style-kamu.png" alt="Pilih Style Kamu" width={824} height={184} className="h-auto w-[50%] xl:w-[40%]" />

        <div className="mt-10 grid w-[70%] xl:w-[100%] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {styles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => selectStyle(style.id)}
              className={`overflow-hidden rounded-xl border-10 ${
                selectedStyle === style.id ? "border-black/70" : "border-white/20"
              } ${
                style.id === 3
                  ? "md:col-span-2 md:mx-auto md:w-[50%] xl:col-span-1 xl:mx-0 xl:w-full"
                  : ""
              }`}
              aria-label={`Pilih style ${style.id}`}
            >
              <div className="relative w-full bg-black/20">
                <Image src={style.image} alt="" width={1125} height={1688} className="h-auto w-full object-contain" />
                {selectedStyle === style.id ? (
                  <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#009B90] shadow-lg">
                    <svg viewBox="0 0 24 24" className="h-12 w-12 text-white" aria-hidden>
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
                ) : null}
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-disabled={!selectedStyle}
          onClick={() => {
            if (!selectedStyle) return;
            const webcam4k = new URLSearchParams(window.location.search).get("webcam") === "4k";
            const camPath = webcam4k ? "/sequis/cam2" : "/sequis/cam";
            router.push(
              webcam4k
                ? `${camPath}?template=2&style=${selectedStyle}&webcam=4k`
                : `${camPath}?template=2&style=${selectedStyle}`,
            );
          }}
          className={`mx-auto mt-10 block w-[80%] ${!selectedStyle ? "pointer-events-none opacity-60" : ""}`}
        >
          <Image src="/sequis/btn-selanjutnya.png" alt="Lanjut" width={880} height={132} className="h-auto w-full" />
        </button>
      </div>
    </main>
  );
}
