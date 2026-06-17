export const INACO_V2_QUERY = "v2";

const INACO_V2_SESSION_KEY = "inaco-use-v2-model";

export const INACO_FAL_MODEL_PRO = "fal-ai/nano-banana-pro/edit";
export const INACO_FAL_MODEL_V2 = "fal-ai/nano-banana-2/edit";

/** Extra prompt block for ?v2 (nano-banana-2) — foreground subject + outfit blend. */
export const INACO_V2_PROMPT_ADDENDUM = `=== V2 FOREGROUND SUBJECT FOCUS (MANDATORY) ===
IMAGE 1 may show a crowd or other people behind the main subject. Generate ONLY the person(s) at the FRONT of the photo—the closest to the camera and most prominent in frame.
Do NOT generate, render, include, copy, or invent any people in the BACKGROUND, mid-ground, or crowd (kerumunan) behind the front subject.
The scene/background from IMAGE 2 may appear, but without extra background humans from IMAGE 1 or newly invented bystanders.
If IMAGE 1 has one clear front subject with blurrier people behind, the output must contain ONLY that front subject with the same face and pose from IMAGE 1.
If any instruction conflicts with excluding background crowd, EXCLUDE the background crowd and keep only the front subject(s).
=== END V2 FOREGROUND SUBJECT FOCUS ===

=== V2 OUTFIT FROM REFERENCES (MANDATORY — NO PASTE LOOK) ===
The person(s) from IMAGE 1 MUST wear the campaign outfit described in the prompt and shown in the outfit reference images (Hanbok garment/accessory refs and/or tema styling)—NOT their original everyday clothing from IMAGE 1.
FULLY REPLACE original clothing from IMAGE 1 with the reference outfit. Do NOT keep the original shirt, jacket, dress, or casual clothes visible underneath or on top. The outfit change must be complete and obvious.

OUTFIT RULES:
- Copy garment design, fabric, color, pattern, and accessories from the outfit reference images exactly as instructed above (male/female Hanbok refs, head accessories, etc.).
- Face and identity stay from IMAGE 1 only—never copy reference models' faces—but clothing and head accessories MUST come from the outfit references.
- If outfit 1 Hanbok rules apply: every person must wear the full Hanbok garment AND mandatory head accessories from the reference images.

SCENE BLEND (CRITICAL — NOT A CUTOUT):
- Do NOT produce a flat cutout, sticker, or pasted-on look. The person must look photographed IN the scene, not composited on top.
- Match scene lighting from IMAGE 2 onto the person and outfit: direction, intensity, color temperature, and ambient fill.
- Add natural contact shadows where the person meets the ground/floor and soft shadow on clothing folds consistent with the scene light.
- Harmonize color grading and exposure between the person and IMAGE 2 background—same mood, contrast, and atmospheric haze if present.
- Outfit fabric must reflect the scene's light realistically (highlights, shadows on folds, subtle environmental color bounce from the background).
- Edges around hair, hijab, shoulders, and arms must blend naturally into the background—no harsh white halos, no sharp paste boundaries.

FORBIDDEN for v2: original casual clothes unchanged; outfit only partially applied; person floating above background; sticker/collage/composite paste look; mismatched lighting between person and scene; ignoring Hanbok/outfit reference images.
If any instruction conflicts with full outfit replacement or natural scene blending, REPLACE THE OUTFIT FULLY and BLEND INTO THE SCENE.
=== END V2 OUTFIT FROM REFERENCES ===`;

export function appendInacoV2PromptAddendum(prompt: string) {
  return `${prompt}\n\n${INACO_V2_PROMPT_ADDENDUM}`;
}

export function syncInacoV2FromSearchParams(searchParams: URLSearchParams) {
  if (typeof window === "undefined") return;
  if (searchParams.has(INACO_V2_QUERY)) {
    window.sessionStorage.setItem(INACO_V2_SESSION_KEY, "1");
  } else {
    window.sessionStorage.removeItem(INACO_V2_SESSION_KEY);
  }
}

/** True when the current page URL includes ?v2 (authoritative for generate). */
export function isInacoV2GenerateEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(INACO_V2_QUERY);
}

/** True for navigation helpers — current URL or session after ?v2 entry. */
export function isInacoV2ModelEnabled(searchParams?: URLSearchParams | null) {
  if (searchParams?.has(INACO_V2_QUERY)) return true;
  if (typeof window !== "undefined") {
    if (new URLSearchParams(window.location.search).has(INACO_V2_QUERY)) return true;
    return window.sessionStorage.getItem(INACO_V2_SESSION_KEY) === "1";
  }
  return false;
}

export function inacoPath(path: string, searchParams?: URLSearchParams | null) {
  if (!isInacoV2ModelEnabled(searchParams)) return path;
  return `${path}?${INACO_V2_QUERY}`;
}

export function resolveInacoFalModel(useV2: boolean) {
  return useV2 ? INACO_FAL_MODEL_V2 : INACO_FAL_MODEL_PRO;
}

export function buildInacoFalEditInput(
  useV2: boolean,
  prompt: string,
  referenceUrls: string[],
) {
  return {
    prompt,
    image_urls: referenceUrls,
    num_images: 1,
    output_format: "png" as const,
    aspect_ratio: "2:3" as const,
    safety_tolerance: useV2 ? ("4" as const) : ("2" as const),
  };
}
