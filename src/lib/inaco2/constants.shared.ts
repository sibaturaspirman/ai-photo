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
  tema: "inaco2-tema",
  outfit: "inaco2-outfit",
  result: "inaco2-result-image-url",
  userName: "inaco2-user-name",
  userPhone: "inaco2-user-phone",
  userSocialPlatform: "inaco2-user-social-platform",
  userSocialUsername: "inaco2-user-social-username",
  qrUrl: "inaco2-qr-url",
  submissionId: "inaco2-submission-id",
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
  return inacoTemaRefPath(id);
}

export function inacoTemaRefPath(id: number) {
  return `/inaco/tema-${id}.jpg`;
}

export function inacoOutfitPath(id: number) {
  return `/inaco/outfit-${id}.jpg`;
}
