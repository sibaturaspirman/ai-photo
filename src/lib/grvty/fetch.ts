import https from "node:https";
import { URL } from "node:url";

/** Sisakan ~1s untuk parsing request/response di dalam function Vercel Hobby (10s). */
const VERCEL_SAFE_BUDGET_MS = 9_000;
const DEFAULT_BUDGET_MS = 55_000;
const GRVTY_MAX_RETRIES = 2;

type GrvtyResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type GrvtyRequestInit = {
  method: string;
  headers: Record<string, string>;
  body: string;
  timeoutMs: number;
};

function getGrvtyBudgetMs() {
  const fromEnv = Number(process.env.GRVTY_FETCH_BUDGET_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return process.env.VERCEL ? VERCEL_SAFE_BUDGET_MS : DEFAULT_BUDGET_MS;
}

function isFastRetryableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  return code === "ECONNRESET" || code === "ECONNREFUSED" || code === "EPIPE";
}

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes("timeout") || error.message.includes("ETIMEDOUT");
}

function retryDelayMs() {
  return 400;
}

function requestOnce(url: string, init: GrvtyRequestInit): Promise<GrvtyResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const bodyBuffer = Buffer.from(init.body, "utf8");

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: init.method,
        headers: {
          ...init.headers,
          "content-length": bodyBuffer.byteLength.toString(),
        },
        timeout: init.timeoutMs,
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 500;
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => {
              if (!text) return null;
              try {
                return JSON.parse(text) as unknown;
              } catch {
                return null;
              }
            },
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("Timeout ke server GRVTY"));
    });
    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
}

export async function fetchGrvty(url: string, init: RequestInit): Promise<GrvtyResponse> {
  const body = typeof init.body === "string" ? init.body : "";
  const headers: Record<string, string> = {};

  if (init.headers instanceof Headers) {
    init.headers.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (init.headers) {
    for (const [key, value] of Object.entries(init.headers)) {
      if (typeof value === "string") headers[key] = value;
    }
  }

  const deadline = Date.now() + getGrvtyBudgetMs();
  let lastError: unknown;

  for (let attempt = 1; attempt <= GRVTY_MAX_RETRIES; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 500) break;

    try {
      return await requestOnce(url, {
        method: init.method ?? "GET",
        headers,
        body,
        timeoutMs: remaining,
      });
    } catch (error) {
      lastError = error;
      const canRetry =
        attempt < GRVTY_MAX_RETRIES &&
        isFastRetryableError(error) &&
        !isTimeoutError(error) &&
        deadline - Date.now() > 1000;

      if (!canRetry) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs()));
    }
  }

  throw lastError;
}

export function getGrvtyFetchErrorMessage(error: unknown) {
  if (isTimeoutError(error)) {
    return "Gagal terhubung ke server GRVTY (timeout). Silakan coba submit lagi.";
  }
  if (error instanceof Error) return error.message;
  return "Gagal submit data ke server.";
}
