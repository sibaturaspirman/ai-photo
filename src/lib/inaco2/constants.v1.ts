/** Prompt v1 — snapshot frozen (copy dari v2 sebelum update berikutnya). */

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

export function buildInacoPromptV1(tema: number, outfit: number) {
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
