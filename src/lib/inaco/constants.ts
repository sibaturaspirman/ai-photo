export * from "./constants.shared";

export { buildInacoPromptV1 } from "./constants.v1";
export { buildInacoPromptV2 } from "./constants.v2";
export { buildInacoPromptV3 } from "./constants.v3";
export {
  buildInacoPromptV4,
  buildInacoExtraRefPaths,
  inacoTema5CharacterPath,
  pickRandomTema5CharacterId,
  usesTema5ReferenceOrder,
  type InacoTema5CharacterId,
} from "./constants.v4";

import { buildInacoPromptV4, type InacoTema5CharacterId } from "./constants.v4";

/** Versi prompt aktif untuk generate AI. */
export const INACO_PROMPT_VERSION = 4 as const;

/** Builder prompt aktif — tema 1–4 pakai v3, tema 5 pakai v4. */
export function buildInacoPrompt(
  tema: number,
  outfit: number,
  tema5CharacterId?: InacoTema5CharacterId,
) {
  return buildInacoPromptV4(tema, outfit, tema5CharacterId);
}

export {
  clearInacoGenerateSession,
  hasInacoGenerateAccess,
  isInacoGeneratePending,
  startInacoGenerate,
  waitForInacoGenerateResult,
  INACO_CAM_LOADING_MS,
} from "./generate-session";
