/** Server-side fal.subscribe budget (Vercel maxDuration is 300s). */
export const FAL_GENERATE_TIMEOUT_MS = 280_000;

/** Client fetch abort — slightly above server so response can arrive first. */
export const FAL_GENERATE_CLIENT_TIMEOUT_MS = 295_000;
