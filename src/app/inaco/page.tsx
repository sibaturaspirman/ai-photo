"use client";

import Image from "next/image";
import Link from "next/link";
import { INACO_V2_QUERY } from "@/lib/inaco/model-version";

const cornerBtnClass =
  "fixed bottom-0 z-20 bg-transparent px-4 py-3 text-[4vw] font-medium text-white/35 touch-manipulation transition hover:text-white/60 w-[200px] h-[200px] border-2 border-white/35 rounded-full flex items-center justify-center";

export default function InacoHomePage() {
  return (
    <main className="inaco-landscape-shell relative isolate flex min-h-dvh w-full touch-manipulation items-center justify-center overflow-hidden p-4">
      <div className="inaco-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat" aria-hidden />

      <Link href="/inaco/template" className="relative z-10" aria-label="Tap to continue">
        <Image
          src="/inaco/home.png"
          alt="Inaco home"
          width={1620}
          height={2196}
          priority
          className="h-auto w-[90vw] max-w-full object-contain xl:w-[40%]"
          sizes="100vw"
        />
      </Link>

      <Link href="/inaco/template" className={`${cornerBtnClass} left-0`} aria-label="Mode v1">
        v1
      </Link>
      <Link
        href={`/inaco/template?${INACO_V2_QUERY}`}
        className={`${cornerBtnClass} right-0`}
        aria-label="Mode v2"
      >
        v2
      </Link>
    </main>
  );
}
