import {
  EIGER_STORAGE,
  eigerOutfitImagePath,
  type EigerSelections,
} from "@/lib/eiger/constants";

export { EIGER_STORAGE, type EigerSelections } from "@/lib/eiger/constants";

export function readEigerSelections(): EigerSelections | null {
  const jaket = Number(window.localStorage.getItem(EIGER_STORAGE.jaket));
  const pants = Number(window.localStorage.getItem(EIGER_STORAGE.pants));
  const aksesoris = Number(window.localStorage.getItem(EIGER_STORAGE.aksesoris));
  if (!jaket || !pants || !aksesoris) return null;
  return { jaket, pants, aksesoris };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Gagal memuat gambar: ${src}`));
    img.src = src;
  });
}

/** Stack outfit PNG layers into one transparent reference for AI try-on. */
export async function buildOutfitComposite(selections: EigerSelections): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 783;
  canvas.height = 1086;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");

  const layers = [
    eigerOutfitImagePath("pants", selections.pants),
    eigerOutfitImagePath("jaket", selections.jaket),
    eigerOutfitImagePath("aksesoris", selections.aksesoris),
  ];

  for (const src of layers) {
    const img = await loadImage(src);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  return canvas.toDataURL("image/png");
}
