export * from "./constants.shared";

export { buildInacoPromptV1 } from "./constants.v1";
export { buildInacoPromptV2 } from "./constants.v2";

import { buildInacoPromptV2 } from "./constants.v2";

/** Versi prompt aktif untuk generate AI. */
export const INACO_PROMPT_VERSION = 2 as const;

/** Builder prompt aktif — ganti ke buildInacoPromptV1 untuk rollback. */
export function buildInacoPrompt(tema: number, outfit: number) {
  return buildInacoPromptV2(tema, outfit);
}
