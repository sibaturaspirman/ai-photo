import { ImageGenerator } from "@/components/image-generator";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur">
            <span className="size-1.5 rounded-full bg-indigo-400" />
            Powered by fal.ai
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            AI Photo Studio
          </h1>
          <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
            Generate gambar berkualitas tinggi dari prompt teks lewat model{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">
              fal.ai
            </code>
            . Isi prompt, pilih ukuran, lalu klik Generate.
          </p>
        </header>

        <ImageGenerator />

        <footer className="pt-10 text-center text-xs text-slate-400">
          Dibangun dengan Next.js · Tailwind CSS · @fal-ai/client
        </footer>
      </main>
    </div>
  );
}
