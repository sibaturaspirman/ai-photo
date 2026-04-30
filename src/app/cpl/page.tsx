import Image from "next/image";
import Link from "next/link";

export default function CplHomePage() {
  return (
    <Link
      href="/cpl/template"
      className="relative isolate flex min-h-dvh w-full touch-manipulation flex-col items-center justify-center overflow-hidden p-4 sm:p-6"
      aria-label="Tap to continue"
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/cpl/bg.jpg)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/cpl/frame.png)" }}
        aria-hidden
      />

      <Image
        src="/cpl/home.png"
        alt=""
        width={1451}
        height={2663}
        priority
        className="h-auto w-[85vw] max-w-full object-contain"
        sizes="100vw"
      />
    </Link>
  );
}
