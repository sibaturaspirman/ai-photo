export const INACO_V2_QUERY = "v2";

const INACO_V2_SESSION_KEY = "inaco-use-v2-model";

export const INACO_FAL_MODEL_PRO = "fal-ai/nano-banana-pro/edit";
export const INACO_FAL_MODEL_V2 = "fal-ai/nano-banana-2/edit";

/** Extra prompt block for ?v2 (nano-banana-2) — foreground subject only. */
export const INACO_V2_PROMPT_ADDENDUM = `=== V2 FOREGROUND SUBJECT FOCUS (MANDATORY) ===
IMAGE 1 may show a crowd or other people behind the main subject. Generate ONLY the person(s) at the FRONT of the photo—the closest to the camera and most prominent in frame.
Do NOT generate, render, include, copy, or invent any people in the BACKGROUND, mid-ground, or crowd (kerumunan) behind the front subject.
The scene/background from IMAGE 2 may appear, but without extra background humans from IMAGE 1 or newly invented bystanders.
If IMAGE 1 has one clear front subject with blurrier people behind, the output must contain ONLY that front subject with the same face and pose from IMAGE 1.
If any instruction conflicts with excluding background crowd, EXCLUDE the background crowd and keep only the front subject(s).
=== END V2 FOREGROUND SUBJECT FOCUS ===`;

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
