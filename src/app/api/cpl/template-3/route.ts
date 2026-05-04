import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getFalClient } from "@/lib/fal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  take1?: string;
  take2?: string;
};

type FalImage = {
  url: string;
};

type FalEditResponse = {
  images?: FalImage[];
};

type EditAspectRatio = "2:3" | "1:1";

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

async function editBackground(
  fal: ReturnType<typeof getFalClient>,
  sourceImageDataUrl: string,
  backgroundImageUrl: string,
  aspectRatio: EditAspectRatio,
) {
  const sourceBlob = await dataUrlToBlob(sourceImageDataUrl);
  const sourceImageUrl = await fal.storage.upload(sourceBlob);

  const result = await withTimeout(
    fal.subscribe("fal-ai/nano-banana-pro/edit", {
      input: {
        prompt:
          "Replace the background with the second reference image only. Keep the entire main foreground from the first image: every intended subject must stay fully visible—solo, pairs, or groups of three or more—same poses, outfits, faces, and spacing between them; do not remove, crop out, merge, or duplicate those subjects. Remove any other people, faces, or partial figures visible behind them or deep in the original scene (bystanders, crowd, staff in the back); they must not appear in the output—only the new background from the second reference, with no extra humans painted in. Realistic photo style. Make photo 4K hires resolution.",
        image_urls: [sourceImageUrl, backgroundImageUrl],
        num_images: 1,
        aspect_ratio: aspectRatio,
        output_format: "png",
        resolution: "1K",
        safety_tolerance: "4",
      },
      logs: false,
    }),
    120000,
    "fal.ai proses terlalu lama (timeout).",
  );

  const data = result.data as FalEditResponse | undefined;
  const edited = data?.images?.[0]?.url;
  if (!edited) {
    throw new Error("fal.ai tidak mengembalikan hasil edit gambar.");
  }
  return edited;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Body request harus JSON yang valid." },
      { status: 400 },
    );
  }

  if (!body.take1 || !body.take2) {
    return NextResponse.json(
      { error: "take1 dan take2 wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const fal = getFalClient();
    const bgPath = path.join(process.cwd(), "public", "cpl", "template-bg.png");
    const bgBuffer = await readFile(bgPath);
    const bgBlob = new Blob([bgBuffer], { type: "image/png" });
    const backgroundImageUrl = await fal.storage.upload(bgBlob);

    const [take1Edited, take2Edited] = await Promise.all([
      editBackground(fal, body.take1, backgroundImageUrl, "2:3"),
      editBackground(fal, body.take2, backgroundImageUrl, "1:1"),
    ]);

    return NextResponse.json({
      model: "fal-ai/nano-banana-pro/edit",
      captures: {
        1: take1Edited,
        2: take2Edited,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memproses AI image editing.";
    console.error("[cpl/template-3] ai-edit error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
