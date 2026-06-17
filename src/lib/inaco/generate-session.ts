import { FAL_GENERATE_CLIENT_TIMEOUT_MS } from "@/lib/fal/constants";
import { fetchInacoExtraReferenceBlob } from "@/lib/inaco/prepare-reference-images";
import {
  INACO_V2_QUERY,
  appendInacoV2PromptAddendum,
  isInacoV2GenerateEnabled,
} from "@/lib/inaco/model-version";
import {
  INACO_STORAGE,
  buildInacoExtraRefPaths,
  buildInacoPrompt,
  inacoTemaRefPath,
  pickRandomTema5CharacterId,
  usesTema5ReferenceOrder,
  type InacoTema5CharacterId,
} from "@/lib/inaco/constants";

const GENERATE_PENDING_KEY = "inaco-generate-pending";
const GENERATE_TIMEOUT_MS = FAL_GENERATE_CLIENT_TIMEOUT_MS;

export const INACO_CAM_LOADING_MS = 2000;

type StartInacoGenerateParams = {
  capture: string;
  selectedTema: number;
  selectedOutfit: number;
};

type GenerateSession = {
  promise: Promise<string>;
  status: "pending" | "fulfilled" | "rejected";
  error?: string;
  abortController: AbortController;
};

let activeSession: GenerateSession | null = null;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed converting blob to data URL."));
    };
    reader.onerror = () => reject(new Error("Failed converting blob to data URL."));
    reader.readAsDataURL(blob);
  });
}

async function runInacoGenerate(
  params: StartInacoGenerateParams,
  abortController: AbortController,
): Promise<string> {
  const { capture, selectedTema, selectedOutfit } = params;
  const signal = abortController.signal;
  const temaPath = inacoTemaRefPath(selectedTema);
  const tema5CharacterId: InacoTema5CharacterId | undefined =
    selectedTema === 5 ? pickRandomTema5CharacterId() : undefined;
  const extraRefPaths = buildInacoExtraRefPaths(selectedTema, selectedOutfit, tema5CharacterId);

  const [personBlob, temaBlob, ...extraBlobs] = await Promise.all([
    fetch(capture).then((res) => res.blob()),
    fetch(temaPath).then((res) => res.blob()),
    ...extraRefPaths.map((path) => fetchInacoExtraReferenceBlob(path, selectedOutfit)),
  ]);

  const [reference1DataUrl, reference2DataUrl, ...extraDataUrls] = await Promise.all([
    blobToDataUrl(personBlob),
    blobToDataUrl(temaBlob),
    ...extraBlobs.map((blob) => blobToDataUrl(blob)),
  ]);

  let apiReference1 = reference1DataUrl;
  let apiReference2 = reference2DataUrl;
  let apiExtraReferences = extraDataUrls;

  if (usesTema5ReferenceOrder(selectedTema) && extraDataUrls.length > 0) {
    const [mascotDataUrl, ...hanbokDataUrls] = extraDataUrls;
    apiReference1 = reference1DataUrl;
    apiReference2 = mascotDataUrl;
    apiExtraReferences = [reference2DataUrl, ...hanbokDataUrls];
  }

  const timeoutId = window.setTimeout(() => abortController.abort(), GENERATE_TIMEOUT_MS);

  const useV2 = isInacoV2GenerateEnabled();
  const basePrompt = buildInacoPrompt(selectedTema, selectedOutfit, tema5CharacterId);
  const prompt = useV2 ? appendInacoV2PromptAddendum(basePrompt) : basePrompt;

  try {
    const generateUrl = useV2
      ? `/api/inaco/generate?${INACO_V2_QUERY}`
      : "/api/inaco/generate";
    const response = await fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        reference1: apiReference1,
        reference2: apiReference2,
        ...(apiExtraReferences.length ? { extraReferences: apiExtraReferences } : {}),
      }),
      signal,
    });

    const data = (await response.json()) as { imageUrl?: string; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Failed to generate image.");
    if (!data.imageUrl) throw new Error("API response does not include generated image.");

    window.localStorage.setItem(INACO_STORAGE.result, data.imageUrl);
    return data.imageUrl;
  } catch (error) {
    if (signal.aborted) {
      throw new Error("Proses AI timeout. Coba lagi ya.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function clearInacoGenerateSession() {
  activeSession?.abortController.abort();
  activeSession = null;
  window.sessionStorage.removeItem(GENERATE_PENDING_KEY);
}

export function isInacoGeneratePending() {
  if (activeSession?.status === "pending") return true;
  if (window.sessionStorage.getItem(GENERATE_PENDING_KEY) === "1" && !activeSession) {
    window.sessionStorage.removeItem(GENERATE_PENDING_KEY);
  }
  return false;
}

export function startInacoGenerate(params: StartInacoGenerateParams): Promise<string> {
  clearInacoGenerateSession();
  window.localStorage.removeItem(INACO_STORAGE.result);

  const abortController = new AbortController();
  const promise = runInacoGenerate(params, abortController)
    .then((imageUrl) => {
      if (activeSession?.promise === promise) {
        activeSession.status = "fulfilled";
      }
      window.sessionStorage.removeItem(GENERATE_PENDING_KEY);
      return imageUrl;
    })
    .catch((error: unknown) => {
      if (activeSession?.promise === promise) {
        activeSession.status = "rejected";
        activeSession.error =
          error instanceof Error
            ? error.name === "AbortError"
              ? "Proses AI timeout. Coba lagi ya."
              : error.message
            : "Gagal memproses foto dengan AI.";
      }
      window.sessionStorage.removeItem(GENERATE_PENDING_KEY);
      throw error;
    });

  activeSession = {
    promise,
    status: "pending",
    abortController,
  };
  window.sessionStorage.setItem(GENERATE_PENDING_KEY, "1");

  return promise;
}

export async function waitForInacoGenerateResult(): Promise<string> {
  const cached = window.localStorage.getItem(INACO_STORAGE.result);
  if (cached) return cached;

  if (!activeSession) {
    throw new Error("Tidak ada proses generate yang aktif. Silakan ambil foto ulang.");
  }

  if (activeSession.status === "rejected") {
    throw new Error(activeSession.error ?? "Gagal memproses foto dengan AI.");
  }

  return activeSession.promise;
}

export function getInacoGenerateError() {
  return activeSession?.error;
}

export function hasInacoGenerateAccess() {
  return (
    Boolean(window.localStorage.getItem(INACO_STORAGE.result)) || isInacoGeneratePending()
  );
}
