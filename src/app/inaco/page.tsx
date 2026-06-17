"use client";

import Image from "next/image";
import Link from "next/link";
import { inacoPath } from "@/lib/inaco/model-version";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function InacoHomeContent() {
  const searchParams = useSearchParams();

  return (
    <Link
      href={inacoPath("/inaco/template", searchParams)}
      className="inaco-landscape-shell relative isolate flex min-h-dvh w-full touch-manipulation items-center justify-center overflow-hidden p-4"
      aria-label="Tap to continue"
    >
      <div className="inaco-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat" aria-hidden />
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
  );
}

export default function InacoHomePage() {
  return (
    <Suspense fallback={null}>
      <InacoHomeContent />
    </Suspense>
  );
}
