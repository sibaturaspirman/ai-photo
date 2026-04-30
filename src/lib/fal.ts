import "server-only";
import { fal } from "@fal-ai/client";

let configured = false;

export function getFalClient() {
  if (!configured) {
    const credentials = process.env.FAL_KEY;
    if (!credentials) {
      throw new Error(
        "FAL_KEY belum di-set. Tambahkan ke .env.local (lihat .env.example).",
      );
    }
    fal.config({ credentials });
    configured = true;
  }
  return fal;
}

export const DEFAULT_FAL_MODEL =
  process.env.FAL_MODEL ?? "fal-ai/flux/schnell";
