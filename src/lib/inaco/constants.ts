export * from "./constants.shared";

export { buildInacoPromptV1 } from "./constants.v1";
export { buildInacoPromptV2 } from "./constants.v2";
export {
  buildInacoPromptV3,
  buildInacoExtraRefPaths,
  inacoTema5CharacterPath,
  pickRandomTema5CharacterId,
  type InacoTema5CharacterId,
} from "./constants.v3";

import { buildInacoPromptV3, type InacoTema5CharacterId } from "./constants.v3";

/** Versi prompt aktif untuk generate AI. */
export const INACO_PROMPT_VERSION = 3 as const;

/** Builder prompt aktif — ganti ke buildInacoPromptV1/V2 untuk rollback. */
export function buildInacoPrompt(
  tema: number,
  outfit: number,
  tema5CharacterId?: InacoTema5CharacterId,
) {
  return buildInacoPromptV3(tema, outfit, tema5CharacterId);
}
