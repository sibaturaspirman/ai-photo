import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadBody = {
  file?: File;
  name?: string;
  phone?: string;
  formasi?: string;
};

export async function POST(req: Request) {
  let body: UploadBody;
  try {
    const form = await req.formData();
    const file = form.get("file");
    body = {
      file: file instanceof File ? file : undefined,
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      formasi: String(form.get("formasi") ?? ""),
    };
  } catch {
    return NextResponse.json(
      { error: "Body request harus multipart/form-data yang valid." },
      { status: 400 },
    );
  }

  if (!body.file) {
    return NextResponse.json(
      { error: "Field file wajib diisi." },
      { status: 400 },
    );
  }

  const authHeader = process.env.ZIROLU_AUTH;
  if (!authHeader) {
    return NextResponse.json(
      {
        error:
          "ZIROLU_AUTH belum di-set di environment. Tambahkan ke .env.local.",
      },
      { status: 500 },
    );
  }

  try {
    const formData = new FormData();
    const formasiFix = body.formasi?.trim() || "Template 1";
    const userName = body.name?.trim() || "Guest";
    const userPhone = body.phone?.trim() || "-";

    formData.append("name", `IQOS ${formasiFix}`);
    formData.append("phone", userPhone);
    formData.append("file", body.file, `${userName}-photo-ai-zirolu.jpg`);

    const response = await fetch("https://photo-ai-iims.zirolu.id/v1/iqos", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      body: formData,
    });

    const json = (await response.json()) as {
      file?: string;
      id?: string | number;
      message?: string;
    };

    if (!response.ok) {
      return NextResponse.json(
        { error: json.message ?? "Upload ke server gagal." },
        { status: response.status },
      );
    }

    return NextResponse.json({
      file: json.file ?? null,
      id: json.id ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan saat upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
