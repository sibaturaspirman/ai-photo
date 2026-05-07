"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Gagal membaca file upload."));
    };
    reader.onerror = () => reject(new Error("Gagal membaca file upload."));
    reader.readAsDataURL(file);
  });
}

export default function SequisPage() {
  const [prompt, setPrompt] = useState("");
  const [reference1, setReference1] = useState<File | null>(null);
  const [reference2, setReference2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  const onPickReference1 = (file: File | null) => {
    setReference1(file);
    setPreview1(file ? URL.createObjectURL(file) : null);
  };

  const onPickReference2 = (file: File | null) => {
    setReference2(file);
    setPreview2(file ? URL.createObjectURL(file) : null);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reference1 || !reference2) {
      setError("Upload 2 gambar referensi terlebih dulu.");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt wajib diisi.");
      return;
    }

    setError(null);
    setResultImageUrl(null);
    setIsSubmitting(true);
    try {
      const [reference1DataUrl, reference2DataUrl] = await Promise.all([
        fileToDataUrl(reference1),
        fileToDataUrl(reference2),
      ]);

      const response = await fetch("/api/sequis/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          reference1: reference1DataUrl,
          reference2: reference2DataUrl,
        }),
      });

      const raw = await response.text();
      let data: { imageUrl?: string; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { imageUrl?: string; error?: string }) : {};
      } catch {
        throw new Error(
          `API mengembalikan respons non-JSON (status ${response.status}). Cek route /api/sequis/generate.`,
        );
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Gagal generate gambar.");
      }
      if (!data.imageUrl) {
        throw new Error("Response API tidak berisi hasil gambar.");
      }
      setResultImageUrl(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="space-y-2">
          <p className="text-sm text-indigo-300">Sequis Demo</p>
          <h1 className="text-3xl font-semibold">Nano Banana Pro Editor</h1>
          <p className="text-sm text-slate-300">
            Upload 2 reference image, isi prompt, lalu generate dengan model{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
              fal-ai/nano-banana-pro/edit
            </code>
            .
          </p>
        </header>

        <form onSubmit={onSubmit} className="grid gap-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium">Reference 1</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onPickReference1(event.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm"
              />
              {preview1 ? (
                <img src={preview1} alt="Reference 1 preview" className="h-40 w-full rounded-md object-cover" />
              ) : null}
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Reference 2</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onPickReference2(event.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm"
              />
              {preview2 ? (
                <img src={preview2} alt="Reference 2 preview" className="h-40 w-full rounded-md object-cover" />
              ) : null}
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium">Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder="Contoh: Replace background with the second image and preserve all people in front."
              className="w-full rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-fit items-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Generating..." : "Generate"}
          </button>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </form>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-lg font-medium">Result</h2>
          {resultImageUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-md border border-white/15 bg-black">
              <Image src={resultImageUrl} alt="Generated result" fill className="object-contain" unoptimized />
            </div>
          ) : (
            <p className="text-sm text-slate-300">Belum ada hasil. Klik Generate untuk mulai.</p>
          )}
        </section>
      </div>
    </main>
  );
}
