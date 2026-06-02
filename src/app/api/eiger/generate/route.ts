import { NextResponse } from "next/server";
import { getFalClient } from "@/lib/fal";
import { EIGER_TRYON_PROMPT } from "@/lib/eiger/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateRequestBody = {
  prompt?: string;
  personPhoto?: string;
  outfitPhoto?: string;
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

  const prompt = body.prompt?.trim() || EIGER_TRYON_PROMPT;
  if (!body.personPhoto || !body.outfitPhoto) {
    return NextResponse.json(
      { error: "Foto person dan outfit wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const fal = getFalClient();
    const [personBlob, outfitBlob] = await Promise.all([
      dataUrlToBlob(body.personPhoto),
      dataUrlToBlob(body.outfitPhoto),
    ]);

    const [personUrl, outfitUrl] = await Promise.all([
      fal.storage.upload(personBlob),
      fal.storage.upload(outfitBlob),
    ]);

    const result = await withTimeout(
      fal.subscribe("fal-ai/nano-banana-pro/edit", {
        input: {
          prompt,
          image_urls: [personUrl, outfitUrl],
          num_images: 1,
          output_format: "png",
          aspect_ratio: "9:16",
          safety_tolerance: "4",
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
      error instanceof Error ? error.message : "Gagal memproses virtual try-on.";
    console.error("[eiger] generate error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
