"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const templates = [
  { id: 1, image: "/sequis/t1.png" },
  { id: 2, image: "/sequis/t2.png" },
];

export default function SequisTemplatePage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  const selectTemplate = (templateId: number) => {
    setSelectedTemplate(templateId);
    window.localStorage.setItem("sequis-template", String(templateId));
    const params = new URLSearchParams(window.location.search);
    params.set("template", String(templateId));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  return (
    <main className="sequis-landscape-shell relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8">
      <div
        className="sequis-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        aria-hidden
      />

      <div className="flex w-full max-w-5xl xl:w-[37%] xl:mt-[5rem] flex-col items-center">
        <Image src="/sequis/tentukan.png" alt="Tentukan template" width={824} height={184} className="h-auto w-[50%]" />

        <div className="grid w-full mt-10 gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template.id)}
              className={`overflow-hidden rounded-xl border-10 ${
                selectedTemplate === template.id ? "border-black/70" : "border-white/20"
              }`}
              aria-label={`Pilih template ${template.id}`}
            >
              <div className="relative w-full bg-black/20">
                <Image
                  src={template.image}
                  alt=""
                  width={824}
                  height={1236}
                  className="h-auto w-full object-contain"
                />
                {selectedTemplate === template.id ? (
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
          aria-disabled={!selectedTemplate}
          onClick={() => {
            if (!selectedTemplate) return;
            const webcam4k = new URLSearchParams(window.location.search).get("webcam") === "4k";
            const camPath = webcam4k ? "/sequis/cam2" : "/sequis/cam";
            if (selectedTemplate === 2) {
              router.push(webcam4k ? "/sequis/style?webcam=4k" : "/sequis/style");
              return;
            }
            router.push(
              webcam4k
                ? `${camPath}?template=${selectedTemplate}&webcam=4k`
                : `${camPath}?template=${selectedTemplate}`,
            );
          }}
          className={`block w-[80%] mx-auto mt-10 ${!selectedTemplate ? "pointer-events-none opacity-60" : ""}`}
        >
          <Image src="/sequis/btn-selanjutnya.png" alt="Lanjut" width={880} height={132} className="h-auto w-full" />
        </button>
      </div>
    </main>
  );
}
