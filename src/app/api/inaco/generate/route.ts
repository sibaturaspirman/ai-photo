import { NextResponse } from "next/server";
import { FAL_GENERATE_TIMEOUT_MS, getFalClient } from "@/lib/fal";
import {
  INACO_V2_QUERY,
  buildInacoFalEditInput,
  resolveInacoFalModel,
} from "@/lib/inaco/model-version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type GenerateRequestBody = {
  prompt?: string;
  reference1?: string;
  reference2?: string;
  /** @deprecated use extraReferences */
  reference3?: string;
  extraReferences?: string[];
};

type FalImage = { url: string };
type FalEditResponse = { images?: FalImage[] };

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
) {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        reject(new Error(errorMessage));
      }, timeoutMs);
    }),
  ]);
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function POST(req: Request) {
  let body: GenerateRequestBody;
  try {
    body = (await req.json()) as GenerateRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Body request harus JSON yang valid." },
      { status: 400 },
    );
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json(
      { error: "Field 'prompt' wajib diisi." },
      { status: 400 },
    );
  }
  if (!body.reference1 || !body.reference2) {
    return NextResponse.json(
      { error: "Dua gambar referensi wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const fal = getFalClient();
    const useV2 = new URL(req.url).searchParams.has(INACO_V2_QUERY);
    const falModel = resolveInacoFalModel(useV2);
    const extraRefs =
      body.extraReferences ?? (body.reference3 ? [body.reference3] : []);

    const extraBlobs = await Promise.all(extraRefs.map((ref) => dataUrlToBlob(ref)));
    const [reference1Blob, reference2Blob] = await Promise.all([
      dataUrlToBlob(body.reference1),
      dataUrlToBlob(body.reference2),
    ]);

    const referenceUrls = await Promise.all([
      fal.storage.upload(reference1Blob),
      fal.storage.upload(reference2Blob),
      ...extraBlobs.map((blob) => fal.storage.upload(blob)),
    ]);

    const result = await withTimeout(
      fal.subscribe(falModel, {
        input: buildInacoFalEditInput(useV2, prompt, referenceUrls),
        logs: false,
        timeout: FAL_GENERATE_TIMEOUT_MS,
      }),
      FAL_GENERATE_TIMEOUT_MS,
      "fal.ai proses terlalu lama (timeout).",
    );

    const data = result.data as FalEditResponse | undefined;
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error("fal.ai tidak mengembalikan hasil gambar.");
    }

    return NextResponse.json({
      model: falModel,
      imageUrl,
      requestId: result.requestId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memproses generate gambar.";
    console.error("[inaco] generate error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
