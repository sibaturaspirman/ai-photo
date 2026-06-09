/** Crop outfit refs to torso/garment region so model cannot copy model face or hair. */
const HANBOK_GARMENT_CROP_TOP_RATIO = 0.3;

export async function cropBlobToGarmentRegion(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const top = Math.round(bitmap.height * HANBOK_GARMENT_CROP_TOP_RATIO);
  const height = Math.max(1, bitmap.height - top);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Gagal memproses referensi outfit.");
  }
  ctx.drawImage(bitmap, 0, top, bitmap.width, height, 0, 0, bitmap.width, height);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Gagal crop referensi outfit."))),
      "image/jpeg",
      0.92,
    );
  });
}

export async function fetchInacoExtraReferenceBlob(path: string, outfit: number) {
  const blob = await fetch(path).then((res) => res.blob());
  if (outfit === 1 && path.includes("outfit-1-")) {
    return cropBlobToGarmentRegion(blob);
  }
  return blob;
}
