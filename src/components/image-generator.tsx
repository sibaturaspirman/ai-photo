"use client";

import { useState } from "react";
import Image from "next/image";

type GeneratedImage = {
  url: string;
  width?: number;
  height?: number;
  contentType?: string;
};

type GenerateResponse = {
  requestId?: string;
  model?: string;
  prompt?: string;
  seed?: number;
  images?: GeneratedImage[];
  error?: string;
};

const IMAGE_SIZES = [
  { value: "square_hd", label: "Square HD (1:1)" },
  { value: "square", label: "Square" },
  { value: "portrait_4_3", label: "Portrait 4:3" },
  { value: "portrait_16_9", label: "Portrait 16:9" },
  { value: "landscape_4_3", label: "Landscape 4:3" },
  { value: "landscape_16_9", label: "Landscape 16:9" },
] as const;

const MODELS = [
  { value: "fal-ai/flux/schnell", label: "FLUX schnell (cepat)" },
  { value: "fal-ai/flux/dev", label: "FLUX dev (kualitas)" },
  { value: "fal-ai/fast-sdxl", label: "Fast SDXL" },
] as const;

export function ImageGenerator() {
  const [prompt, setPrompt] = useState(
    "studio photo of a golden retriever puppy wearing tiny astronaut helmet, soft lighting, 35mm",
  );
  const [model, setModel] =
    useState<(typeof MODELS)[number]["value"]>("fal-ai/flux/schnell");
  const [imageSize, setImageSize] =
    useState<(typeof IMAGE_SIZES)[number]["value"]>("landscape_4_3");
  const [numImages, setNumImages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, imageSize, numImages }),
      });

      const data = (await res.json()) as GenerateResponse;
      if (!res.ok) {
        throw new Error(data.error ?? `Request gagal (${res.status})`);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="prompt"
            className="text-sm font-medium text-slate-200"
          >
            Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Deskripsikan gambar yang ingin dibuat..."
            className="w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="model"
              className="text-sm font-medium text-slate-200"
            >
              Model
            </label>
            <select
              id="model"
              value={model}
              onChange={(e) =>
                setModel(e.target.value as (typeof MODELS)[number]["value"])
              }
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="size"
              className="text-sm font-medium text-slate-200"
            >
              Ukuran
            </label>
            <select
              id="size"
              value={imageSize}
              onChange={(e) =>
                setImageSize(
                  e.target.value as (typeof IMAGE_SIZES)[number]["value"],
                )
              }
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {IMAGE_SIZES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="count"
              className="text-sm font-medium text-slate-200"
            >
              Jumlah ({numImages})
            </label>
            <input
              id="count"
              type="range"
              min={1}
              max={4}
              value={numImages}
              onChange={(e) => setNumImages(Number(e.target.value))}
              className="mt-3 accent-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Generasi pertama biasanya butuh beberapa detik untuk warm-up model.
          </p>
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {result?.images?.length ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-100">Hasil</h2>
            {result.seed !== undefined ? (
              <span className="text-xs text-slate-400">
                seed: {result.seed}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {result.images.map((img, i) => (
              <a
                key={`${img.url}-${i}`}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-slate-950"
              >
                <Image
                  src={img.url}
                  alt={`Generated ${i + 1}`}
                  width={img.width ?? 1024}
                  height={img.height ?? 768}
                  className="h-auto w-full object-cover transition group-hover:scale-[1.02]"
                  unoptimized
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-xs text-slate-200 opacity-0 transition group-hover:opacity-100">
                  <span>
                    {img.width}×{img.height}
                  </span>
                  <span>Buka di tab baru →</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
