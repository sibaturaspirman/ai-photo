import { NextResponse } from "next/server";
import { fetchGrvty, getGrvtyFetchErrorMessage } from "@/lib/grvty/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GRVTY_SUBMIT_URL = "https://grvty.id/v1/submissions/submit";

type SubmitRequestBody = {
  name?: string;
  waNumber?: string;
  socialMediaChannel?: string;
  socialMediaAccount?: string;
  result?: string;
};

export async function POST(req: Request) {
  let body: SubmitRequestBody;
  try {
    body = (await req.json()) as SubmitRequestBody;
  } catch {
    return NextResponse.json({ error: "Body request harus JSON yang valid." }, { status: 400 });
  }

  const name = body.name?.trim();
  const waNumber = body.waNumber?.trim();
  const socialMediaChannel = body.socialMediaChannel?.trim().toLowerCase();
  const socialMediaAccount = body.socialMediaAccount?.trim();
  const result = body.result?.trim();

  if (!name || !waNumber || !socialMediaChannel || !socialMediaAccount || !result) {
    return NextResponse.json(
      { error: "Semua field wajib diisi: name, waNumber, socialMediaChannel, socialMediaAccount, result." },
      { status: 400 },
    );
  }

  if (socialMediaChannel !== "instagram" && socialMediaChannel !== "tiktok") {
    return NextResponse.json(
      { error: "socialMediaChannel harus instagram atau tiktok." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GRVTY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GRVTY_API_KEY belum dikonfigurasi di server." },
      { status: 500 },
    );
  }

  try {
    const response = await fetchGrvty(GRVTY_SUBMIT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        name,
        waNumber,
        socialMediaChannel,
        socialMediaAccount,
        result,
      }),
    });

    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : typeof data?.error === "string"
            ? data.error
            : `Submit gagal (${response.status}).`;
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = getGrvtyFetchErrorMessage(error);
    console.error("[inaco] submit error:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
