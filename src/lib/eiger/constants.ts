export const EIGER_STORAGE = {
  capture: "eiger-capture",
  result: "eiger-result-image-url",
  jaket: "eiger-jaket",
  pants: "eiger-pants",
  aksesoris: "eiger-aksesoris",
} as const;

export type EigerSelections = {
  jaket: number;
  pants: number;
  aksesoris: number;
};

export const EIGER_TRYON_PROMPT = `Use IMAGE 1 as the person identity source — preserve exact face, skin tone, body shape, proportions, pose, and expression.
Use IMAGE 2 as the complete outfit reference (jacket, pants, and accessories shown together).

Virtual try-on task: dress the person from IMAGE 1 in the exact outfit from IMAGE 2.
Replace only the clothing; keep the person's identity unchanged.
Fit the outfit naturally to the body with realistic fabric drape, seams, and outdoor adventure styling.
Photorealistic result, sharp details, natural lighting matching IMAGE 1.
No face changes, no body reshaping, no extra people, no watermark.`;

export function eigerOutfitImagePath(category: "jaket" | "pants" | "aksesoris", id: number) {
  const prefix =
    category === "jaket" ? "jaket" : category === "pants" ? "pants" : "aksesoris";
  return `/eiger/${prefix}-${id}.png`;
}
