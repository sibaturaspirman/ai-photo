import Image from "next/image";
import Link from "next/link";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SequisHomePage({ searchParams }: HomePageProps) {
  const params = (await searchParams) ?? {};
  const webcamRaw = params.webcam;
  const webcam4k = Array.isArray(webcamRaw) ? webcamRaw.includes("4k") : webcamRaw === "4k";
  const nextHref = webcam4k ? "/sequis/template?webcam=4k" : "/sequis/template";

  return (
    <Link
      href={nextHref}
      className="sequis-landscape-shell relative isolate flex min-h-dvh w-full touch-manipulation items-center justify-center overflow-hidden p-4"
      aria-label="Tap to continue to template selection"
    >
      <div
        className="sequis-bg absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        aria-hidden
      />

      <Image
        src="/sequis/home.png"
        alt="Sequis home"
        width={1451}
        height={2663}
        priority
        className="h-auto w-[90vw] xl:w-[33%] xl:mt-[6rem]  max-w-full object-contain"
        sizes="100vw"
      />
    </Link>
  );
}
