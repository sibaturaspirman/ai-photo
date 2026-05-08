"use client";

import { FormEvent, useState } from "react";

const DEFAULT_PROMPT =
  "Use IMAGE 1 as visual style reference and IMAGE 2 as subject identity. Premium sporty corporate look, dark teal, high-detail.";

export default function VioStudioPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [reference1, setReference1] = useState<File | null>(null);
  const [reference2, setReference2] = useState<File | null>(null);
  const [preview1, setPreview1] = useState<string | null>(null);
  const [preview2, setPreview2] = useState<string | null>(null);
  const [model, setModel] = useState("nano-banana-pro");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [count, setCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [pollStatusText, setPollStatusText] = useState<string>("idle");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setGeneratedImages([]);
    setPollStatusText("idle");
    if (!reference1 || !reference2) {
      setError("Please upload 2 reference images.");
      return;
    }
    if (!prompt.trim()) {
      setError("Prompt is required.");
      return;
    }

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", model);
    formData.append("aspect_ratio", aspectRatio);
    formData.append("count", String(count));
    formData.append("reference1", reference1);
    formData.append("reference2", reference2);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/viostudio/generate", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        error?: string;
        status?: number;
        uploaded_asset_ids?: number[];
        generation_ids?: number[];
        images?: string[];
        data?: unknown;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed calling Viostudio API.");
      }

      const generationIds = data.generation_ids ?? [];
      if (!generationIds.length) {
        throw new Error("generation_ids not returned.");
      }

      setResult(JSON.stringify(data, null, 2));
      setPollStatusText("queued");

      const startedAt = Date.now();
      const timeoutMs = 10 * 60 * 1000;
      while (true) {
        const elapsedMs = Date.now() - startedAt;
        if (elapsedMs > timeoutMs) {
          throw new Error("Polling timeout. Generation still processing.");
        }
        const pollResponse = await fetch(
          `/api/viostudio/generate?ids=${encodeURIComponent(generationIds.join(","))}`,
          { method: "GET" },
        );
        const pollData = (await pollResponse.json()) as {
          error?: string;
          done?: boolean;
          failed?: boolean;
          statuses?: string[];
          images?: string[];
          data?: unknown;
        };
        if (!pollResponse.ok) {
          throw new Error(pollData.error ?? "Failed to poll generation.");
        }

        const statuses = pollData.statuses ?? [];
        if (statuses.includes("processing")) {
          setPollStatusText("processing");
        } else if (statuses.includes("queued")) {
          setPollStatusText("queued");
        }

        if (pollData.failed) {
          setPollStatusText("failed");
          throw new Error("Generation failed on Viostudio.");
        }

        if (pollData.done) {
          setPollStatusText("completed");
          setGeneratedImages(pollData.images ?? []);
          setResult(JSON.stringify(pollData, null, 2));
          break;
        }

        const elapsedSec = Math.floor(elapsedMs / 1000);
        const nextDelayMs =
          elapsedSec < 10 ? 1000 : elapsedSec < 60 ? 5000 : 10000;
        await new Promise((resolve) => setTimeout(resolve, nextDelayMs));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error occurred.");
      setPollStatusText("failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm text-cyan-300">Viostudio API Test</p>
          <h1 className="text-3xl font-semibold">/viostudio</h1>
          <p className="text-sm text-slate-300">Focused endpoint: `POST /v1/images/generate`</p>
        </header>

        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm">Reference Image 1</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setReference1(file);
                  setPreview1(file ? URL.createObjectURL(file) : null);
                }}
                className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm"
              />
              {preview1 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview1} alt="Reference 1 preview" className="h-40 w-full rounded-md object-cover" />
              ) : null}
            </label>

            <label className="grid gap-2">
              <span className="text-sm">Reference Image 2</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setReference2(file);
                  setPreview2(file ? URL.createObjectURL(file) : null);
                }}
                className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm"
              />
              {preview2 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview2} alt="Reference 2 preview" className="h-40 w-full rounded-md object-cover" />
              ) : null}
            </label>
          </div>

          <label className="grid gap-2">
            <span className="text-sm">Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm">Model</span>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="nano-banana-pro">nano-banana-pro</option>
                <option value="nano-banana-2">nano-banana-2</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm">Aspect Ratio</span>
              <select
                value={aspectRatio}
                onChange={(event) => setAspectRatio(event.target.value)}
                className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
                <option value="3:4">3:4</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm">Count</span>
              <input
                type="number"
                min={1}
                max={4}
                value={count}
                onChange={(event) => setCount(Number(event.target.value) || 1)}
                className="rounded-md border border-white/15 bg-slate-900 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-fit rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {isSubmitting ? "Generating..." : "Generate via Viostudio"}
          </button>

          <p className="text-sm text-slate-300">
            Polling status:{" "}
            <span className="font-semibold uppercase text-cyan-300">{pollStatusText}</span>
          </p>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </form>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-lg font-medium">Generated Images</h2>
          {generatedImages.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {generatedImages.map((url) => (
                <div key={url} className="overflow-hidden rounded-lg border border-white/15 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Generated result" className="h-auto w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-300">Belum ada image result.</p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-lg font-medium">Response</h2>
          {result ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-slate-200">
              {result}
            </pre>
          ) : (
            <p className="text-sm text-slate-300">Belum ada response.</p>
          )}
        </section>
      </div>
    </main>
  );
}
