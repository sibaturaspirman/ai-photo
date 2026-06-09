import { NextResponse } from "next/server";
import { getFalClient } from "@/lib/fal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      fal.subscribe("fal-ai/nano-banana-pro/edit", {
        input: {
          prompt,
          image_urls: referenceUrls,
          num_images: 1,
          output_format: "png",
          aspect_ratio: "2:3",
          safety_tolerance: "2",
        },
        logs: false,
      }),
      150000,
      "fal.ai proses terlalu lama (timeout).",
    );

    const data = result.data as FalEditResponse | undefined;
    const imageUrl = data?.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error("fal.ai tidak mengembalikan hasil gambar.");
    }

    return NextResponse.json({
      model: "fal-ai/nano-banana-pro/edit",
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
