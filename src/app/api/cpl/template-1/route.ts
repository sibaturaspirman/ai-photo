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
type EditAspectRatio = "2:3" | "4:3";

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

  // Replace the background with the second reference image only. Keep the main person exactly as in the first image, realistic photo style, preserve pose and outfit.

  // Create a polished professional portrait composite. Use image 1 as the main subject and image 2 strictly as the new background reference. Keep the person's identity, pose, body proportions, outfit, and camera angle from image 1. Seamlessly blend the subject into the new background with realistic edge cleanup around hair and shoulders, consistent perspective, and natural contact shadows. Match global lighting direction, exposure, white balance, contrast, and color grading so the subject and background look captured in one shot. Apply subtle beauty retouch only: smoother skin texture, cleaner tones, gentle sharpness on eyes/clothes, reduced noise, and preserve natural facial details. Avoid cutout look, halos, over-smoothing, warped anatomy, extra limbs, duplicated features, text, logos, watermarks, or artistic filters. Output should be photorealistic, clean, and publication-ready.

  const result = await withTimeout(
    fal.subscribe("fal-ai/nano-banana-pro/edit", {
    input: {
      prompt:
        "Background replacement only: the second reference image is the sole new environment—no other backdrop from image 1. From image 1, identify exactly one subject group: the people who are nearest the camera, largest in frame, similar scale, and clearly the intended sitters (one to several posing together). Preserve that entire group pixel-faithfully—every face body pose outfit limb and the space between them; never remove merge duplicate or swap them. HARD DELETE everything else in image 1 that looks human: anyone farther smaller blurrier or only partly visible; anyone behind between or beyond the preserved group; crowds queues staff bystanders and cut-off heads or shoulders. Do not transfer blend ghost or repaint those figures—erase them completely and fill only with the second reference scenery. The output must show humans only from the preserved subject group and nowhere else. Photorealistic. 4K hires resolution.",
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
      editBackground(fal, body.take2, backgroundImageUrl, "4:3"),
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
    console.error("[cpl/template-1] ai-edit error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
