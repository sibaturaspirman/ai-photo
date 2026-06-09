/** Prompt v3 — landmark, tema 5 single mascot, outfit 1 Hanbok refs. */

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

export const INACO_OUTFIT_1_HANBOK_REFS = {
  maleOutfit: "/inaco/outfit-1-cowok.jpg",
  femaleOutfit: "/inaco/outfit-1-cewek.jpg",
} as const;

export function pickRandomTema5CharacterId(): InacoTema5CharacterId {
  const ids: InacoTema5CharacterId[] = [1, 2, 3];
  return ids[Math.floor(Math.random() * ids.length)]!;
}

export function inacoTema5CharacterPath(id: InacoTema5CharacterId) {
  return INACO_TEMA_5_CHARACTERS[id].path;
}

export function inacoOutfit1HanbokRefPaths() {
  return [INACO_OUTFIT_1_HANBOK_REFS.maleOutfit, INACO_OUTFIT_1_HANBOK_REFS.femaleOutfit];
}

/** Extra reference images after IMAGE 1 (tema) and IMAGE 2 (person), in prompt order. */
export function buildInacoExtraRefPaths(
  tema: number,
  outfit: number,
  tema5CharacterId?: InacoTema5CharacterId,
) {
  const paths: string[] = [];
  if (tema === 5 && tema5CharacterId) {
    paths.push(inacoTema5CharacterPath(tema5CharacterId));
  }
  if (outfit === 1) {
    paths.push(...inacoOutfit1HanbokRefPaths());
  }
  return paths;
}

type InacoImageMap = {
  mascot?: number;
  hanbokMale?: number;
  hanbokFemale?: number;
};

function buildInacoImageMap(tema: number, outfit: number): InacoImageMap {
  let index = 3;
  const map: InacoImageMap = {};

  if (tema === 5) {
    map.mascot = index++;
  }
  if (outfit === 1) {
    map.hanbokMale = index++;
    map.hanbokFemale = index++;
  }

  return map;
}

const INACO_TEMA_LANDMARKS: Record<number, string> = {
  1: "the iconic Gyeongbokgung Palace main hall with ornate traditional Korean architecture and a mountain backdrop",
  2: "Bukchon Hanok Village with Namsan Tower (N Seoul Tower) visible in the distance on a green hill",
  3: "Namsan Tower (N Seoul Tower) surrounded by vibrant autumn foliage and a traditional Korean pavilion",
  4: "Dongdaemun Design Plaza (DDP) with futuristic curved silver architecture and vivid purple night lighting",
  5: "a picturesque Hanok village street with Namsan Tower (N Seoul Tower) in the distance and cherry blossom season atmosphere",
};

const INACO_IDENTITY_LOCK_HEADER = `=== CRITICAL IDENTITY LOCK (HIGHEST PRIORITY — OBEY BEFORE ALL OTHER INSTRUCTIONS) ===
IMAGE 2 is the ONLY source for every person's face, facial features, skin tone, eyes, nose, lips, jawline, age, ethnicity, expression, and head covering.

FACE LOCK (STRICT): Copy each face from IMAGE 2 exactly. Do not beautify, reshape, slim, age-shift, swap, replace, or generate a new face. The output face must be instantly recognizable as the same person from IMAGE 2. Do not copy any face from IMAGE 1 or from outfit/Hanbok reference images.

HIJAB LOCK (STRICT): Inspect IMAGE 2 carefully. If any person wears hijab/headscarf, that person MUST still wear hijab in the output. Preserve the hijab exactly—same fabric coverage, color, wrap style, and placement as IMAGE 2. The hijab must fully cover hair; zero hair visible. FORBIDDEN for hijab-wearing persons: removing hijab, exposing hair, showing bangs/forehead hair/side hair/ponytail, replacing hijab with loose hair, or copying the hairstyle/head from any outfit reference image (Hanbok references may show loose hair—IGNORE their heads completely for hijab-wearing persons from IMAGE 2).
=== END IDENTITY LOCK ===

`;

const INACO_IDENTITY_LOCK_FOOTER = `=== FINAL IDENTITY CHECK (MANDATORY) ===
Before finishing, verify every person from IMAGE 2:
1) Face unchanged and recognizable from IMAGE 2.
2) If they wore hijab in IMAGE 2, they still wear hijab with no visible hair.
3) No extra person was added from outfit/Hanbok reference images.
=== END FINAL CHECK ===

`;

const INACO_FORBIDDEN_RULES = `FORBIDDEN: face swap, face redesign, different person, beautification filter, hijab removal, hair visible on hijab-wearing person, replacing hijab with loose/styled hair, copying model hair from Hanbok reference images, extra people from reference images, watermark.`;

function buildInacoTema5Prompt(characterId: InacoTema5CharacterId, mascotImage: number) {
  const character = INACO_TEMA_5_CHARACTERS[characterId];
  return `For tema 5, use IMAGE ${mascotImage} as the single Inaco mascot character reference. Include exactly ONE mascot in the output—the ${character.label} from IMAGE ${mascotImage}. Reproduce this mascot's exact appearance, colors, proportions, and pose from IMAGE ${mascotImage}: ${character.pose}. Keep the mascot in vibrant illustrated 3D campaign art style. Do not squash, stretch, flatten, or distort the mascot. Do not add, duplicate, or substitute any other mascots, and do not convert the mascot into a realistic human.

The person(s) from IMAGE 2 must remain fully photorealistic with natural skin texture, realistic lighting, and true-to-life proportions. For tema 5, repose each person standing with arms crossed over the chest and a warm smile at the camera (campaign pose). Preserve each person's exact face, facial features, skin tone, and body shape from IMAGE 2—do not alter the face or head covering.

Compose the scene like IMAGE 1: photorealistic person(s) on the left, the single mascot from IMAGE ${mascotImage} on the right, integrated into the illustrated tema 5 background from IMAGE 1.

`;
}

function buildInacoOutfit1HanbokPrompt(map: InacoImageMap) {
  if (!map.hanbokMale || !map.hanbokFemale) {
    return "";
  }

  return `For outfit 1 (Hanbok), the Hanbok reference images are GARMENT REFERENCES ONLY. Extract only the Hanbok clothing design from them—do NOT copy, include, add, or composite any person, face, body, hair, or hijab from the Hanbok reference images. The Hanbok reference images may show a model with loose hair, but that model and their hair/head must NOT appear in the output. All people in the output must come exclusively from IMAGE 2.

Use IMAGE ${map.hanbokMale} as the male Hanbok clothing reference: dusty slate-blue jeogori/baeja with white collar trim, subtle floral damask pattern, cream inner sleeves, blue goreum bow, and silver filigree norigae with pale grey tassel. Ignore the male model's face and body—clothing only.
Use IMAGE ${map.hanbokFemale} as the female Hanbok clothing reference: cream jeogori with tonal floral pattern, light pink otgoreum bow, dusty pink pleated chima with white lace floral pattern, and pink norigae tassel. Ignore the female model's face, hair, and body—clothing only. NEVER copy the female model's loose hair onto any person from IMAGE 2.

For each person already present in IMAGE 2, infer apparent gender and digitally dress them in the matching Hanbok outfit from the corresponding reference image. Transfer only the Hanbok garment onto the person(s) from IMAGE 2—preserve each person's exact face, facial features, skin tone, body shape, proportions, pose, and head covering entirely from IMAGE 2. If a person in IMAGE 2 wears hijab, keep the hijab unchanged and dress the Hanbok jeogori/chima around the hijab—do not remove hijab and do not show hair.

CRITICAL: The total number of people in the output must exactly match IMAGE 2. Do not add extra people from the Hanbok reference images or from IMAGE 1.

`;
}

function buildInacoTemaPrompt(
  tema: number,
  outfit: number,
  tema5CharacterId: InacoTema5CharacterId | undefined,
  imageMap: InacoImageMap,
) {
  const parts: string[] = [];

  if (tema === 5 && tema5CharacterId && imageMap.mascot) {
    parts.push(buildInacoTema5Prompt(tema5CharacterId, imageMap.mascot));
  }
  if (outfit === 1) {
    parts.push(buildInacoOutfit1HanbokPrompt(imageMap));
  }

  return parts.join("");
}

function buildInacoOutfitPrompt(outfit: number) {
  if (outfit === 1) {
    return "Dress only the person(s) from IMAGE 2 in the campaign Hanbok outfit described above—do not introduce any person from the Hanbok reference images.";
  }

  return "Each person is dressed in modern casual Korean streetwear, modeled accurately according to the provided reference, with contemporary styling and natural accessorizing matching the reference image.";
}

function buildInacoImageInstructions(tema: number, outfit: number, imageMap: InacoImageMap) {
  const lines = [
    `Use IMAGE 1 as the visual scene/composition/${tema === 5 ? "background" : "style"} reference (Inaco campaign tema ${tema})—do NOT copy faces or people from IMAGE 1.`,
    "Use IMAGE 2 as the sole person identity source—copy face, head, hijab, and body identity only from IMAGE 2.",
  ];

  if (imageMap.mascot) {
    lines.push(`Use IMAGE ${imageMap.mascot} as the single Inaco mascot character reference (appearance and pose).`);
  }
  if (imageMap.hanbokMale) {
    lines.push(
      `Use IMAGE ${imageMap.hanbokMale} as male Hanbok clothing reference only—ignore any person shown in this image.`,
    );
    lines.push(
      `Use IMAGE ${imageMap.hanbokFemale} as female Hanbok clothing reference only—ignore any person shown in this image.`,
    );
  }

  return `${lines.join("\n")}\n\n`;
}

export function buildInacoPromptV3(
  tema: number,
  outfit: number,
  tema5CharacterId?: InacoTema5CharacterId,
) {
  const landmark = INACO_TEMA_LANDMARKS[tema] ?? INACO_TEMA_LANDMARKS[1];
  const imageMap = buildInacoImageMap(tema, outfit);
  const outfitPrompt = buildInacoOutfitPrompt(outfit);
  const temaPrompt = buildInacoTemaPrompt(tema, outfit, tema5CharacterId, imageMap);
  const imageInstructions = buildInacoImageInstructions(tema, outfit, imageMap);
  const renderStyle =
    tema === 5
      ? `Hybrid composition: photorealistic commercial photo for the person(s) from IMAGE 2, combined with the single illustrated 3D Inaco mascot from IMAGE ${imageMap.mascot} on a vibrant illustrated campaign background from IMAGE 1. Keep all characters proportionally correct with no squashing or stretching. Natural lighting integration on the real person(s), sharp details.`
      : "Photorealistic commercial photo, natural lighting integration, sharp details.";

  const personInstructions =
    tema === 5
      ? `${temaPrompt}The number of people in the output must exactly match IMAGE 2—do not add, remove, merge, duplicate, or split anyone. Every face and hijab must remain exactly as in IMAGE 2.`
      : `${temaPrompt}Place every person visible in IMAGE 2 into the visual world and mood of IMAGE 1. The number of people in the output must exactly match IMAGE 2—do not add, remove, merge, duplicate, or split anyone. Preserve each person's exact face, facial features, skin tone, body shape, proportions, pose, expression, head covering, and relative positions or grouping exactly as shown in IMAGE 2.`;

  return `${INACO_IDENTITY_LOCK_HEADER}${imageInstructions}${personInstructions}
Dress each person in Inaco outfit style ${outfit}, matching the campaign aesthetic.

Create a highly detailed, vibrant image featuring the same subject(s) from IMAGE 2 standing against ${landmark}. ${outfitPrompt} The scene is closely cropped from head to just above the knees, emphasizing the clothing and accessories while providing a clear view of the iconic landmark in the distance, set against the sky, atmosphere, and lighting shown in IMAGE 1. Ensure the image captures cultural authenticity, vivid colors, and a balanced composition that highlights both the subject(s) and the iconic landmark.

${renderStyle}
${INACO_IDENTITY_LOCK_FOOTER}${INACO_FORBIDDEN_RULES}`;
}
