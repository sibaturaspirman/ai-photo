import { NextResponse } from "next/server";
import { DEFAULT_FAL_MODEL, getFalClient } from "@/lib/fal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateRequestBody = {
  prompt?: string;
  model?: string;
  imageSize?:
    | "square_hd"
    | "square"
    | "portrait_4_3"
    | "portrait_16_9"
    | "landscape_4_3"
    | "landscape_16_9";
  numImages?: number;
  seed?: number;
};

type FalImage = {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
};

type FalResponse = {
  images?: FalImage[];
  seed?: number;
  prompt?: string;
};

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

  const model = body.model?.trim() || DEFAULT_FAL_MODEL;
  const numImages = Math.min(Math.max(body.numImages ?? 1, 1), 4);
  const imageSize = body.imageSize ?? "landscape_4_3";

  try {
    const fal = getFalClient();
    const result = await fal.subscribe(model, {
      input: {
        prompt,
        image_size: imageSize,
        num_images: numImages,
        ...(body.seed !== undefined ? { seed: body.seed } : {}),
      },
      logs: false,
    });

    const data = result.data as FalResponse | undefined;
    const images = data?.images ?? [];

    return NextResponse.json({
      requestId: result.requestId,
      model,
      prompt,
      seed: data?.seed,
      images: images.map((img) => ({
        url: img.url,
        width: img.width,
        height: img.height,
        contentType: img.content_type,
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal generate gambar.";
    console.error("[fal.ai] generate error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
