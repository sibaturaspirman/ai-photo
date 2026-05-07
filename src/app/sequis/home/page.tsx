import Image from "next/image";
import Link from "next/link";

export default function SequisHomePage() {
  return (
    <Link
      href="/sequis/template"
      className="relative isolate flex min-h-dvh w-full touch-manipulation items-center justify-center overflow-hidden p-4"
      aria-label="Tap to continue to template selection"
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/sequis/bg.jpg)" }}
        aria-hidden
      />

      <Image
        src="/sequis/home.png"
        alt="Sequis home"
        width={1451}
        height={2663}
        priority
        className="h-auto w-[90vw] max-w-full object-contain"
        sizes="100vw"
      />
    </Link>
  );
}
