"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function EigerHomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {});
  }, []);

  return (
    <div className="eiger-viewport">
      <Link
        href="/eiger/cam"
        className="eiger-shell relative touch-manipulation"
        aria-label="Tap to continue"
      >
        <video
          ref={videoRef}
          src="/eiger/front.MP4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </Link>
    </div>
  );
}
