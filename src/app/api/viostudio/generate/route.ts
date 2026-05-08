import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_VIOSTUDIO_API_KEY =
  "vio_sk_a8D1zrIB4MmOIUZWGQtBQIZsAYSCVLt_ajtNdvUPo64";
const VIOSTUDIO_BASE_URL = "https://api.viostudio.id/v1";

function getApiKey() {
  return process.env.VIOSTUDIO_API_KEY ?? DEFAULT_VIOSTUDIO_API_KEY;
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const prompt = String(formData.get("prompt") ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Field 'prompt' is required." }, { status: 400 });
  }
  const model = String(formData.get("model") ?? "nano-banana-pro").trim() || "nano-banana-pro";
  const aspectRatio = String(formData.get("aspect_ratio") ?? "9:16").trim() || "9:16";
  const countRaw = Number(formData.get("count") ?? 1);
  const count = Number.isInteger(countRaw) ? Math.min(Math.max(countRaw, 1), 4) : 1;

  const reference1 = formData.get("reference1");
  const reference2 = formData.get("reference2");
  if (!(reference1 instanceof File) || !(reference2 instanceof File)) {
    return NextResponse.json(
      { error: "Both reference images are required." },
      { status: 400 },
    );
  }

  const apiKey = getApiKey();
  const commonHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    const parseJsonSafe = (raw: string) => {
      try {
        return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        return null;
      }
    };

    const getApiErrorMessage = (raw: string) => {
      const data = parseJsonSafe(raw);
      const errObj = data?.error;
      if (errObj && typeof errObj === "object") {
        const message = (errObj as { message?: unknown }).message;
        if (typeof message === "string" && message.trim()) {
          return message;
        }
      }
      return raw || "Unknown API error.";
    };

    const uploadAsset = async (file: File) => {
      const assetForm = new FormData();
      assetForm.append("file", file, file.name || "reference.jpg");
      const assetResponse = await fetch(`${VIOSTUDIO_BASE_URL}/assets`, {
        method: "POST",
        headers: commonHeaders,
        body: assetForm,
        cache: "no-store",
      });
      const raw = await assetResponse.text();
      if (!assetResponse.ok) {
        throw new Error(
          `Asset upload failed (${assetResponse.status}): ${getApiErrorMessage(raw)}`,
        );
      }
      const data = parseJsonSafe(raw) as { asset_id?: number; id?: number } | null;
      const assetId = data?.asset_id ?? data?.id;
      if (!assetId) {
        throw new Error("Asset upload succeeded but asset_id missing.");
      }
      return assetId;
    };

    const [assetId1, assetId2] = await Promise.all([
      uploadAsset(reference1),
      uploadAsset(reference2),
    ]);

    const generateResponse = await fetch(`${VIOSTUDIO_BASE_URL}/images/generate`, {
      method: "POST",
      headers: {
        ...commonHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model,
        aspect_ratio: aspectRatio,
        count,
        reference_asset_ids: [assetId1, assetId2],
      }),
      cache: "no-store",
    });

    const generateRaw = await generateResponse.text();
    if (!generateResponse.ok) {
      throw new Error(
        `Generate request failed (${generateResponse.status}): ${getApiErrorMessage(generateRaw)}`,
      );
    }

    const generateData = parseJsonSafe(generateRaw) as {
      generation_ids?: number[];
      status?: string;
    } | null;
    const generationIds = generateData?.generation_ids ?? [];
    if (!generationIds.length) {
      throw new Error("Generate accepted but generation_ids not found.");
    }

    return NextResponse.json(
      {
        ok: true,
        status: 202,
        uploaded_asset_ids: [assetId1, assetId2],
        request: {
          endpoint: `${VIOSTUDIO_BASE_URL}/images/generate`,
          prompt,
          model,
          aspect_ratio: aspectRatio,
          count,
        },
        generation_ids: generationIds,
        data: generateData,
      },
      { status: 202 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to call Viostudio endpoint.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsRaw = searchParams.get("ids") ?? "";
  const ids = idsRaw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!ids.length) {
    return NextResponse.json({ error: "Query param 'ids' is required." }, { status: 400 });
  }

  const apiKey = getApiKey();
  const commonHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    const rows = await Promise.all(
      ids.map(async (id) => {
        const response = await fetch(`${VIOSTUDIO_BASE_URL}/generations/${id}`, {
          method: "GET",
          headers: commonHeaders,
          cache: "no-store",
        });
        const raw = await response.text();
        let data: Record<string, unknown> = {};
        try {
          data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          throw new Error(`Invalid JSON from generation ${id}: ${raw}`);
        }
        if (!response.ok) {
          const errObj = data.error as { message?: string } | undefined;
          throw new Error(
            `Get generation failed (${response.status}): ${errObj?.message ?? raw}`,
          );
        }
        return data;
      }),
    );

    const statuses = rows.map((row) => String(row.status ?? "unknown"));
    const done = statuses.every((status) => status === "completed");
    const failed = statuses.some((status) => status === "failed");
    const images = rows
      .map((row) => row.asset_url)
      .filter((url): url is string => typeof url === "string" && url.length > 0);

    return NextResponse.json({
      ok: true,
      done,
      failed,
      statuses,
      images,
      data: rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to poll generation status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
