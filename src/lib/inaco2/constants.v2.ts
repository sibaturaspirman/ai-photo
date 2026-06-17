/** Prompt v2 — landmark per tema, multi-person, tema 5 single mascot + pose campaign. */

export type InacoTema5CharacterId = 1 | 2 | 3;

export const INACO_TEMA_5_CHARACTERS: Record<
  InacoTema5CharacterId,
  { id: InacoTema5CharacterId; path: string; label: string; pose: string }
> = {
  1: {
    id: 1,
    path: "/inaco/tema-5-karakter-1.png",
    label: "white teardrop Inaco mascot with blue letter C, blue bowtie, and blue cape",
    pose:
      "flying or leaping diagonally with both arms spread wide in an enthusiastic welcoming gesture, winking at the camera, blue cape flowing behind",
  },
  2: {
    id: 2,
    path: "/inaco/tema-5-karakter-2.png",
    label: "green turtle Inaco mascot in a red sleeveless tank top",
    pose:
      "standing upright, holding an orange basketball tucked under the right arm, holding a clear cup of bright blue drink with a pink straw in the left hand",
  },
  3: {
    id: 3,
    path: "/inaco/tema-5-karakter-3.png",
    label: "green dinosaur Inaco mascot with yellow underbelly and red back plates",
    pose:
      "dynamic celebratory full-body pose—balancing on one leg with the other leg kicked up and bent, both arms spread wide in a joyful ta-da gesture, facing the camera with a big happy smile",
  },
};

export function pickRandomTema5CharacterId(): InacoTema5CharacterId {
  const ids: InacoTema5CharacterId[] = [1, 2, 3];
  return ids[Math.floor(Math.random() * ids.length)]!;
}

export function inacoTema5CharacterPath(id: InacoTema5CharacterId) {
  return INACO_TEMA_5_CHARACTERS[id].path;
}

const INACO_TEMA_LANDMARKS: Record<number, string> = {
  1: "the iconic Gyeongbokgung Palace main hall with ornate traditional Korean architecture and a mountain backdrop",
  2: "Bukchon Hanok Village with Namsan Tower (N Seoul Tower) visible in the distance on a green hill",
  3: "Namsan Tower (N Seoul Tower) surrounded by vibrant autumn foliage and a traditional Korean pavilion",
  4: "Dongdaemun Design Plaza (DDP) with futuristic curved silver architecture and vivid purple night lighting",
  5: "a picturesque Hanok village street with Namsan Tower (N Seoul Tower) in the distance and cherry blossom season atmosphere",
};

function buildInacoTema5Prompt(characterId: InacoTema5CharacterId) {
  const character = INACO_TEMA_5_CHARACTERS[characterId];
  return `For tema 5, use IMAGE 3 as the single Inaco mascot character reference. Include exactly ONE mascot in the output—the ${character.label} from IMAGE 3. Reproduce this mascot's exact appearance, colors, proportions, and pose from IMAGE 3: ${character.pose}. Keep the mascot in vibrant illustrated 3D campaign art style. Do not squash, stretch, flatten, or distort the mascot. Do not add, duplicate, or substitute any other mascots, and do not convert the mascot into a realistic human.

The person(s) from IMAGE 2 must remain fully photorealistic with natural skin texture, realistic lighting, and true-to-life proportions. For tema 5, repose each person standing with arms crossed over the chest and a warm smile at the camera (campaign pose). Preserve each person's face, skin tone, and body shape from IMAGE 2.

Compose the scene like IMAGE 1: photorealistic person(s) on the left, the single mascot from IMAGE 3 on the right, integrated into the illustrated tema 5 background from IMAGE 1.

`;
}

function buildInacoTemaPrompt(tema: number, tema5CharacterId?: InacoTema5CharacterId) {
  if (tema === 5 && tema5CharacterId) {
    return buildInacoTema5Prompt(tema5CharacterId);
  }
  return "";
}

function buildInacoOutfitPrompt(outfit: number) {
  if (outfit === 1) {
    return "Each person is dressed in traditional Hanbok attire, modeled accurately according to the provided reference, with intricate patterns and bright, elegant colors. Each individual wears accessories on their head, such as a traditional hairpin or headpiece, matching the style shown in the reference image.";
  }

  return "Each person is dressed in modern casual Korean streetwear, modeled accurately according to the provided reference, with contemporary styling and natural accessorizing matching the reference image.";
}

export function buildInacoPromptV2(
  tema: number,
  outfit: number,
  tema5CharacterId?: InacoTema5CharacterId,
) {
  const landmark = INACO_TEMA_LANDMARKS[tema] ?? INACO_TEMA_LANDMARKS[1];
  const outfitPrompt = buildInacoOutfitPrompt(outfit);
  const temaPrompt = buildInacoTemaPrompt(tema, tema5CharacterId);
  const renderStyle =
    tema === 5
      ? "Hybrid composition: photorealistic commercial photo for the person(s) from IMAGE 2, combined with the single illustrated 3D Inaco mascot from IMAGE 3 on a vibrant illustrated campaign background from IMAGE 1. Keep all characters proportionally correct with no squashing or stretching. Natural lighting integration on the real person(s), sharp details."
      : "Photorealistic commercial photo, natural lighting integration, sharp details.";

  const imageInstructions =
    tema === 5
      ? `Use IMAGE 1 as the visual scene/composition/background reference (Inaco campaign tema ${tema}).
Use IMAGE 2 as the person identity source.
Use IMAGE 3 as the single Inaco mascot character reference (appearance and pose).

`
      : `Use IMAGE 1 as the visual scene/composition/style reference (Inaco campaign tema ${tema}).
Use IMAGE 2 as the person identity source.

`;

  const personInstructions =
    tema === 5
      ? `${temaPrompt}The number of people in the output must exactly match IMAGE 2—do not add, remove, merge, duplicate, or split anyone.`
      : `${temaPrompt}Place every person visible in IMAGE 2 into the visual world and mood of IMAGE 1. The number of people in the output must exactly match IMAGE 2—do not add, remove, merge, duplicate, or split anyone. Preserve each person's face, skin tone, body shape, proportions, pose, expression, and their relative positions or grouping exactly as shown in IMAGE 2.`;

  return `${imageInstructions}${personInstructions}
Dress each person in Inaco outfit style ${outfit}, matching the campaign aesthetic.

Create a highly detailed, vibrant image featuring the same subject(s) from IMAGE 2 standing against ${landmark}. ${outfitPrompt} The scene is closely cropped from head to just above the knees, emphasizing the clothing and accessories while providing a clear view of the iconic landmark in the distance, set against the sky, atmosphere, and lighting shown in IMAGE 1. Ensure the image captures cultural authenticity, vivid colors, and a balanced composition that highlights both the subject(s) and the iconic landmark.

${renderStyle}
No face changes, no body reshaping, no change to the number of people compared to IMAGE 2, no watermark.`;
}
