export const INACO_FRAME_PATH = "/inaco/frame.jpg";

export const INACO_FRAME_SIZE = {
  width: 1200,
  height: 1800,
} as const;

/** Photo window inside frame.jpg (1200×1800). */
export const INACO_FRAME_PHOTO_SLOT = {
  left: 63,
  top: 197,
  width: 1074,
  height: 1406,
} as const;

export const INACO_STORAGE = {
  tema: "inaco-tema",
  outfit: "inaco-outfit",
  result: "inaco-result-image-url",
  userName: "inaco-user-name",
  userPhone: "inaco-user-phone",
  userSocialPlatform: "inaco-user-social-platform",
  userSocialUsername: "inaco-user-social-username",
  qrUrl: "inaco-qr-url",
  submissionId: "inaco-submission-id",
} as const;

export type InacoSocialPlatform = "instagram" | "tiktok";

export type InacoUserData = {
  name: string;
  phone: string;
  socialPlatform: InacoSocialPlatform;
  socialUsername: string;
};

/** Normalize to local 0-prefix digits only. */
export function normalizeIndonesianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  return digits;
}

export function isValidIndonesianPhone(phone: string) {
  const normalized = normalizeIndonesianPhone(phone.trim());
  return /^08[1-9]\d{7,10}$/.test(normalized);
}

export function getIndonesianPhoneError(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) {
    return "No WhatsApp hanya boleh berisi angka.";
  }
  if (!trimmed.startsWith("0") && !trimmed.startsWith("62")) {
    return "No WhatsApp harus diawali 08 atau 62.";
  }
  if (!isValidIndonesianPhone(trimmed)) {
    return "Format no WhatsApp tidak valid. Contoh: 081234567890";
  }
  return null;
}

export function saveInacoUserData(data: InacoUserData) {
  window.localStorage.setItem(INACO_STORAGE.userName, data.name);
  window.localStorage.setItem(INACO_STORAGE.userPhone, data.phone);
  window.localStorage.setItem(INACO_STORAGE.userSocialPlatform, data.socialPlatform);
  window.localStorage.setItem(INACO_STORAGE.userSocialUsername, data.socialUsername);
}

export function saveInacoSubmissionData(data: { qrUrl: string; submissionId?: string | number }) {
  window.localStorage.setItem(INACO_STORAGE.qrUrl, data.qrUrl);
  if (data.submissionId != null) {
    window.localStorage.setItem(INACO_STORAGE.submissionId, String(data.submissionId));
  }
}

export function clearInacoUserData() {
  window.localStorage.removeItem(INACO_STORAGE.userName);
  window.localStorage.removeItem(INACO_STORAGE.userPhone);
  window.localStorage.removeItem(INACO_STORAGE.userSocialPlatform);
  window.localStorage.removeItem(INACO_STORAGE.userSocialUsername);
  window.localStorage.removeItem(INACO_STORAGE.qrUrl);
  window.localStorage.removeItem(INACO_STORAGE.submissionId);
}

export const INACO_TEMA_COUNT = 5;
export const INACO_OUTFIT_COUNT = 2;

export function inacoTemaThumbPath(id: number) {
  if (id >= 1 && id <= 4) return `/inaco/tema-${id}.png`;
  return `/inaco/tema-${id}.jpg`;
}

export function inacoTemaRefPath(id: number) {
  return `/inaco/tema-${id}.jpg`;
}

export function inacoOutfitPath(id: number) {
  return `/inaco/outfit-${id}.jpg`;
}

const INACO_TEMA_LANDMARKS: Record<number, string> = {
  1: "the iconic Gyeongbokgung Palace main hall with ornate traditional Korean architecture and a mountain backdrop",
  2: "Bukchon Hanok Village with Namsan Tower (N Seoul Tower) visible in the distance on a green hill",
  3: "Namsan Tower (N Seoul Tower) surrounded by vibrant autumn foliage and a traditional Korean pavilion",
  4: "Dongdaemun Design Plaza (DDP) with futuristic curved silver architecture and vivid purple night lighting",
  5: "a picturesque Hanok village street with Namsan Tower (N Seoul Tower) in the distance and cherry blossom season atmosphere",
};

const INACO_TEMA_5_CHARACTER_PROMPT = `For tema 5, preserve all three Inaco mascot characters from IMAGE 1 in the final output exactly as shown in the tema 5 artwork: the female green dragon mascot in pink Hanbok on the left, the male green dragon mascot in blue Hanbok with gat on the right, and the small white flying character with a blue cape in the center-top. Keep these three mascots in their original vibrant illustrated 3D campaign art style from IMAGE 1. Preserve their correct body proportions—do not squash, stretch, flatten, or distort any mascot. Do not remove, replace, redesign, hide, or omit any of these three mascots, and do not convert them into realistic humans.
The person(s) from IMAGE 2 must remain fully photorealistic with natural skin texture, realistic lighting, and true-to-life proportions. Integrate the photorealistic person(s) from IMAGE 2 into the illustrated tema 5 scene alongside the three mascots.`;

function buildInacoTemaPrompt(tema: number) {
  if (tema === 5) {
    return `${INACO_TEMA_5_CHARACTER_PROMPT}

`;
  }
  return "";
}

function buildInacoOutfitPrompt(outfit: number) {
  if (outfit === 1) {
    return "Each person is dressed in traditional Hanbok attire, modeled accurately according to the provided reference, with intricate patterns and bright, elegant colors. Each individual wears accessories on their head, such as a traditional hairpin or headpiece, matching the style shown in the reference image.";
  }

  return "Each person is dressed in modern casual Korean streetwear, modeled accurately according to the provided reference, with contemporary styling and natural accessorizing matching the reference image.";
}

export function buildInacoPrompt(tema: number, outfit: number) {
  const landmark = INACO_TEMA_LANDMARKS[tema] ?? INACO_TEMA_LANDMARKS[1];
  const outfitPrompt = buildInacoOutfitPrompt(outfit);
  const temaPrompt = buildInacoTemaPrompt(tema);
  const renderStyle =
    tema === 5
      ? "Hybrid composition: photorealistic commercial photo for the person(s) from IMAGE 2, combined with the three illustrated 3D Inaco mascots from IMAGE 1. Keep all characters proportionally correct with no squashing or stretching. Natural lighting integration on the real person(s), sharp details."
      : "Photorealistic commercial photo, natural lighting integration, sharp details.";

  return `Use IMAGE 1 as the visual scene/composition/style reference (Inaco campaign tema ${tema}).
Use IMAGE 2 as the person identity source.

${temaPrompt}Place every person visible in IMAGE 2 into the visual world and mood of IMAGE 1. The number of people in the output must exactly match IMAGE 2—do not add, remove, merge, duplicate, or split anyone. Preserve each person's face, skin tone, body shape, proportions, pose, expression, and their relative positions or grouping exactly as shown in IMAGE 2.
Dress each person in Inaco outfit style ${outfit}, matching the campaign aesthetic.

Create a highly detailed, vibrant image featuring the same subject(s) from IMAGE 2 standing against ${landmark}. ${outfitPrompt} The scene is closely cropped from head to just above the knees, emphasizing the clothing and accessories while providing a clear view of the iconic landmark in the distance, set against the sky, atmosphere, and lighting shown in IMAGE 1. Ensure the image captures cultural authenticity, vivid colors, and a balanced composition that highlights both the subject(s) and the iconic landmark.

${renderStyle}
No face changes, no body reshaping, no change to the number of people compared to IMAGE 2, no watermark.`;
}
