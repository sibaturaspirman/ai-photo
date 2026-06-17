"use client";

import { useState } from "react";

const SAMPLE_PAYLOAD = {
  name: "tt",
  waNumber: "081287006375",
  socialMediaChannel: "instagram",
  socialMediaAccount: "66",
  result: "https://v3b.fal.media/files/b/0a9ea24e/1Xuhk7qWvRcSNf0zkiudY_d5CBZLsU.png",
};

type SubmitResult = {
  ok: boolean;
  status: number;
  durationMs: number;
  body: unknown;
};

export default function TestSubmitPage() {
  const [payloadText, setPayloadText] = useState(() => JSON.stringify(SAMPLE_PAYLOAD, null, 2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);

  const resetSample = () => {
    setPayloadText(JSON.stringify(SAMPLE_PAYLOAD, null, 2));
    setParseError(null);
    setResult(null);
  };

  const handleSubmit = async () => {
    setParseError(null);
    setResult(null);

    let payload: unknown;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setParseError("JSON tidak valid. Periksa format payload.");
      return;
    }

    setIsSubmitting(true);
    const started = performance.now();

    try {
      const response = await fetch("/api/inaco/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const durationMs = Math.round(performance.now() - started);
      let body: unknown = null;
      const raw = await response.text();
      if (raw) {
        try {
          body = JSON.parse(raw) as unknown;
        } catch {
          body = raw;
        }
      }

      setResult({
        ok: response.ok,
        status: response.status,
        durationMs,
        body,
      });
    } catch (error) {
      const durationMs = Math.round(performance.now() - started);
      setResult({
        ok: false,
        status: 0,
        durationMs,
        body: { error: error instanceof Error ? error.message : "Request gagal." },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-10 font-sans text-neutral-900">
      <h1 className="text-2xl font-semibold">Test Submit GRVTY</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Halaman debug terpisah dari flow Inaco. POST ke{" "}
        <code className="rounded bg-neutral-100 px-1.5 py-0.5">/api/inaco/submit</code>
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={resetSample}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          Reset sample
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="rounded bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>

      <label className="mt-6 block text-sm font-medium" htmlFor="testsubmit-payload">
        Payload JSON
      </label>
      <textarea
        id="testsubmit-payload"
        value={payloadText}
        onChange={(event) => setPayloadText(event.target.value)}
        rows={14}
        spellCheck={false}
        className="mt-2 w-full rounded border border-neutral-300 bg-white p-3 font-mono text-sm leading-relaxed"
      />

      {parseError ? (
        <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {parseError}
        </p>
      ) : null}

      {result ? (
        <section className="mt-6 rounded border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="text-sm font-semibold">Response</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-neutral-500">Status</dt>
            <dd className="font-mono">{result.status || "—"}</dd>
            <dt className="text-neutral-500">OK</dt>
            <dd className="font-mono">{result.ok ? "true" : "false"}</dd>
            <dt className="text-neutral-500">Duration</dt>
            <dd className="font-mono">{result.durationMs} ms</dd>
          </dl>
          <pre className="mt-4 overflow-x-auto rounded bg-white p-3 font-mono text-xs leading-relaxed">
            {JSON.stringify(result.body, null, 2)}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
