import https from "node:https";
import { URL } from "node:url";

const GRVTY_REQUEST_TIMEOUT_MS = 60_000;
const GRVTY_MAX_RETRIES = 3;

type GrvtyResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type GrvtyRequestInit = {
  method: string;
  headers: Record<string, string>;
  body: string;
};

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("timeout") ||
    error.message.includes("ECONNRESET") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("ECONNREFUSED")
  );
}

function retryDelayMs(attempt: number) {
  return 1000 * attempt;
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
        timeout: GRVTY_REQUEST_TIMEOUT_MS,
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
      req.destroy(new Error("Connect timeout ke server GRVTY"));
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

  let lastError: unknown;

  for (let attempt = 1; attempt <= GRVTY_MAX_RETRIES; attempt++) {
    try {
      return await requestOnce(url, {
        method: init.method ?? "GET",
        headers,
        body,
      });
    } catch (error) {
      lastError = error;
      const canRetry = attempt < GRVTY_MAX_RETRIES && isRetryableError(error);
      if (!canRetry) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs(attempt)));
    }
  }

  throw lastError;
}

export function getGrvtyFetchErrorMessage(error: unknown) {
  if (isRetryableError(error)) {
    return "Gagal terhubung ke server GRVTY (timeout). Silakan coba submit lagi.";
  }
  if (error instanceof Error) return error.message;
  return "Gagal submit data ke server.";
}
