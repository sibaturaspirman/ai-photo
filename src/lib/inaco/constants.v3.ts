/** Prompt v3 — person-first edit, tema background, outfit 1 Hanbok garment refs (cropped). */

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

export const INACO_OUTFIT_1_HANBOK_ACCESSORY_REFS = {
  maleAccessory: "/inaco/outfit-1-cowok-aksesoris.jpg",
  femaleAccessory: "/inaco/outfit-1-cewek-aksesoris.jpg",
} as const;

export function pickRandomTema5CharacterId(): InacoTema5CharacterId {
  const ids: InacoTema5CharacterId[] = [1, 2, 3];
  return ids[Math.floor(Math.random() * ids.length)]!;
}

export function inacoTema5CharacterPath(id: InacoTema5CharacterId) {
  return INACO_TEMA_5_CHARACTERS[id].path;
}

export function inacoOutfit1HanbokRefPaths() {
  return [
    INACO_OUTFIT_1_HANBOK_ACCESSORY_REFS.maleAccessory,
    INACO_OUTFIT_1_HANBOK_ACCESSORY_REFS.femaleAccessory,
    INACO_OUTFIT_1_HANBOK_REFS.maleOutfit,
    INACO_OUTFIT_1_HANBOK_REFS.femaleOutfit,
  ];
}

/** Extra refs after IMAGE 1 (person) and IMAGE 2 (tema), in upload order. */
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
  hanbokMaleAccessory?: number;
  hanbokFemaleAccessory?: number;
};

function buildInacoImageMap(tema: number, outfit: number): InacoImageMap {
  let index = 3;
  const map: InacoImageMap = {};

  if (tema === 5) {
    map.mascot = index++;
  }
  if (outfit === 1) {
    map.hanbokMaleAccessory = index++;
    map.hanbokFemaleAccessory = index++;
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

const INACO_EDIT_TASK = `TASK: Edit IMAGE 1 in place. IMAGE 1 is the captured photo—the ONLY source of human subjects and human identity. Count every human in IMAGE 1: the output must contain EXACTLY that many humans, each appearing exactly once. Every person visible in IMAGE 1 must appear in the output with the exact same face, facial features, skin tone, expression, and head covering (hijab if present). Do not replace, swap, duplicate, clone, or invent faces or people. Do not copy any human face, body, or head from IMAGE 2 or from any later reference images.

`;

const INACO_PERSON_COUNT_LOCK = `=== PERSON COUNT LOCK (STRICT — SAME AS IMAGE 1) ===
- Count every real human in IMAGE 1. The output must contain EXACTLY that many humans—no more, no less.
- ONE-TO-ONE MAPPING: each person in IMAGE 1 appears exactly once in the output. No duplicates, no clones, no mirrored copies, no second version of the same person.
- FORBIDDEN: adding extra people, background bystanders, crowd extras, staff, tourists, or models from IMAGE 2, Hanbok references, or mascot artwork.
- FORBIDDEN: removing, hiding, merging, splitting, or dropping any person from IMAGE 1.
- FORBIDDEN: duplicating any person from IMAGE 1 (same face appearing twice).
- IMAGE 2 may contain illustrated people or mascots in the artwork—do NOT copy those humans into the output. Only use IMAGE 2 for scenery/background/atmosphere.
- Hanbok reference images contain models—those models must NOT appear as people in the output.
- Tema 5 mascot is the only allowed non-human character addition (one illustrated mascot only, not counted as a human).
=== END PERSON COUNT LOCK ===

`;

const INACO_IDENTITY_LOCK_HEADER = `=== IDENTITY LOCK (HIGHEST PRIORITY) ===
- IMAGE 1 = person photo to preserve and edit. Copy faces, bodies, and hijab ONLY from IMAGE 1.
- IMAGE 2 = scene/background/style only. Never copy people, faces, bodies, or hair from IMAGE 2.
- FACE: Each output face must be the same person as in IMAGE 1—recognizable, unchanged, not beautified, not swapped.
- HIJAB: If IMAGE 1 shows hijab/headscarf, keep hijab in the output with identical coverage, color, and wrap. No visible hair. Never remove hijab. Never replace hijab with loose hair or a reference-model hairstyle.
=== END IDENTITY LOCK ===

`;

const INACO_IDENTITY_LOCK_FOOTER = `=== FINAL CHECK ===
1) Human count in output = human count in IMAGE 1 (exact match).
2) Each IMAGE 1 person appears exactly once—no duplicates.
3) Same face, same hijab/head, same identity as IMAGE 1.
4) No extra humans from scene, Hanbok, or reference images.
=== END FINAL CHECK ===

`;

const INACO_FORBIDDEN_RULES =
  "FORBIDDEN: extra people, duplicate person, cloned face, mirrored copy, crowd/bystander, person from IMAGE 2, person from tema artwork, person from Hanbok reference, removing person from IMAGE 1, merging/splitting persons, different person, face swap, new face, hijab removal, visible hair on hijab wearer, copying model face/hair from outfit references, watermark.";

function buildInacoTema5Prompt(characterId: InacoTema5CharacterId, mascotImage: number) {
  const character = INACO_TEMA_5_CHARACTERS[characterId];
  return `For tema 5, use IMAGE ${mascotImage} as the single Inaco mascot character reference. Include exactly ONE mascot—the ${character.label} from IMAGE ${mascotImage}. Reproduce appearance, colors, proportions, and pose from IMAGE ${mascotImage}: ${character.pose}. Illustrated 3D campaign art style only. The mascot is NOT a human and does not count toward the human total.

Repose each person from IMAGE 1 standing with arms crossed and a warm smile. Preserve exact face, hijab, skin tone, and body from IMAGE 1. Do not add, remove, merge, split, or duplicate any person from IMAGE 1. Do not copy any human from IMAGE 2 tema artwork.

Compose like IMAGE 2: person(s) from IMAGE 1 on the left, mascot from IMAGE ${mascotImage} on the right, background from IMAGE 2. Humans in output = humans in IMAGE 1 only.

`;
}

export function buildInacoOutfit1HanbokPrompt(map: InacoImageMap) {
  if (!map.hanbokMale || !map.hanbokFemale || !map.hanbokMaleAccessory || !map.hanbokFemaleAccessory) {
    return "";
  }

  return `=== OUTFIT 1 HANBOK (MANDATORY) ===

=== HANBOK HEAD ACCESSORY — HIGHEST PRIORITY FOR OUTFIT 1 ===
For outfit 1, every person WITHOUT hijab in IMAGE 1 MUST wear traditional Korean Hanbok head accessories in the output. This is mandatory—not optional.
An outfit-1 output showing bare/modern unstyled hair on a non-hijab person is WRONG and invalid.

Per person in IMAGE 1:
• HIJAB / HEADSCARF VISIBLE → keep hijab exactly from IMAGE 1 (coverage, color, wrap). Fit jeogori/chima around hijab. Do NOT add Hanbok head accessories on top.
• NO HIJAB / NO HEADSCARF → MUST add Hanbok head accessory matching gender:
  - Apparent male → IMAGE ${map.hanbokMaleAccessory}: black manggeon mesh headband, sangtu topknot, silver sangtugwan cap with decorative pin. Accessory must be clearly visible on the person's head in the final image.
  - Apparent female → IMAGE ${map.hanbokFemaleAccessory}: baessidaenggi ornamental headpiece centered on the hair parting with pink beaded tassel. Accessory must be clearly visible on the person's head in the final image.

IMAGE ${map.hanbokMaleAccessory} and IMAGE ${map.hanbokFemaleAccessory} are HEAD-ACCESSORY-ONLY references. Copy the accessory design, placement, and style only—never the reference model's face, skin, or identity. Face and identity always stay from IMAGE 1.
=== END HANBOK HEAD ACCESSORY ===

GARMENTS (torso/clothing crops only):
IMAGE ${map.hanbokMale} and IMAGE ${map.hanbokFemale} are GARMENT-ONLY references. Extract Hanbok fabric design, color, and pattern only. Do NOT copy any face, head, hair, or hijab from these images.

Male Hanbok (IMAGE ${map.hanbokMale}): dusty slate-blue jeogori/baeja, white collar trim, floral damask, cream sleeves, blue goreum bow, silver norigae tassel.
Female Hanbok (IMAGE ${map.hanbokFemale}): cream jeogori, pink otgoreum bow, dusty pink pleated chima, lace floral pattern, pink norigae tassel.

Dress each person from IMAGE 1 in the matching Hanbok by apparent gender. Face and identity stay 100% from IMAGE 1.

Do not add, remove, merge, split, or duplicate any person. Human count in output must exactly match IMAGE 1. Reference models must not appear as people in the output.
=== END OUTFIT 1 HANBOK ===

`;
}

export const INACO_OUTFIT_1_IDENTITY_ADDENDUM = `OUTFIT 1 HEAD RULE: Face/identity always from IMAGE 1. Hijab wearers → keep hijab unchanged. Non-hijab wearers → MUST wear Hanbok head accessory (mandatory)—this overrides keeping bare hair from IMAGE 1.

`;

export function buildInacoOutfit1FinalCheck() {
  return `=== FINAL CHECK (OUTFIT 1) ===
1) Human count in output = human count in IMAGE 1 (exact match).
2) Same face and identity from IMAGE 1 for every person.
3) Hijab wearers: hijab unchanged from IMAGE 1.
4) Non-hijab wearers: Hanbok head accessory clearly visible (male or female style per apparent gender)—mandatory.
5) Hanbok garments applied. No reference models as people in output.
=== END FINAL CHECK ===

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
    return "Dress only the person(s) from IMAGE 1 in the campaign Hanbok outfit described above—do not introduce any person from the Hanbok reference images.";
  }

  return "Dress only the person(s) from IMAGE 1 in modern casual Korean streetwear matching the campaign aesthetic—do not add any person from reference images.";
}

function buildInacoImageInstructions(tema: number, outfit: number, imageMap: InacoImageMap) {
  const lines = [
    "Use IMAGE 1 as the person photo to edit—preserve every face, hijab, and exact human count from IMAGE 1 exactly.",
    `Use IMAGE 2 as the scene/background/style reference (Inaco campaign tema ${tema})—background and atmosphere only. Do NOT copy, add, or duplicate any human from IMAGE 2.`,
  ];

  if (imageMap.mascot) {
    lines.push(`Use IMAGE ${imageMap.mascot} as the single mascot reference (appearance and pose).`);
  }
  if (imageMap.hanbokMale) {
    lines.push(
      `Use IMAGE ${imageMap.hanbokMaleAccessory} as male Hanbok HEAD ACCESSORY reference (mandatory for non-hijab males in IMAGE 1)—accessory style only, not face.`,
    );
    lines.push(
      `Use IMAGE ${imageMap.hanbokFemaleAccessory} as female Hanbok HEAD ACCESSORY reference (mandatory for non-hijab females in IMAGE 1)—accessory style only, not face.`,
    );
    lines.push(`Use IMAGE ${imageMap.hanbokMale} as male Hanbok garment reference only (torso/clothing crop—no face/head).`);
    lines.push(`Use IMAGE ${imageMap.hanbokFemale} as female Hanbok garment reference only (torso/clothing crop—no face/head).`);
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
      ? `Hybrid composition: photorealistic person(s) from IMAGE 1, illustrated mascot from IMAGE ${imageMap.mascot}, background from IMAGE 2. Natural lighting on real person(s), sharp details.`
      : "Photorealistic commercial photo, natural lighting integration, sharp details.";

  const identityAddendum = outfit === 1 ? INACO_OUTFIT_1_IDENTITY_ADDENDUM : "";
  const finalCheck = outfit === 1 ? buildInacoOutfit1FinalCheck() : INACO_IDENTITY_LOCK_FOOTER;
  const outfit1Forbidden =
    outfit === 1
      ? " FORBIDDEN for outfit 1: non-hijab person with bare/modern hair and no Hanbok head accessory."
      : "";

  const personInstructions =
    tema === 5
      ? `${temaPrompt}HUMAN COUNT LOCK: humans in output = humans in IMAGE 1 exactly. Each IMAGE 1 person once only—no duplicates, no clones. Every face unchanged from IMAGE 1.${outfit === 1 ? " Non-hijab wearers must have Hanbok head accessories." : " Every face and hijab unchanged from IMAGE 1."} Mascot allowed (not a human).`
      : `${temaPrompt}HUMAN COUNT LOCK: humans in output = humans in IMAGE 1 exactly. Each IMAGE 1 person once only—no duplicates, no clones, no extras, no removals. Composite each person from IMAGE 1 into the scene and mood of IMAGE 2. Preserve exact face, facial features, skin tone, body shape, proportions, pose, expression, and relative positions or grouping exactly as shown in IMAGE 1.${outfit === 1 ? " Head rule: hijab unchanged if present; non-hijab wearers MUST get Hanbok head accessories." : " Preserve hijab/head covering exactly as shown in IMAGE 1."}`;

  return `${INACO_EDIT_TASK}${INACO_PERSON_COUNT_LOCK}${INACO_IDENTITY_LOCK_HEADER}${identityAddendum}${imageInstructions}${personInstructions}
Dress each person from IMAGE 1 in Inaco outfit style ${outfit}.

Create a highly detailed, vibrant image featuring exactly the same human subject(s) from IMAGE 1—same count, no duplicates, no extra humans anywhere in frame—standing against ${landmark}. ${outfitPrompt} Crop from head to just above the knees. Background, sky, atmosphere, and lighting from IMAGE 2. Cultural authenticity, vivid colors, balanced composition.

${renderStyle}
${finalCheck}${INACO_FORBIDDEN_RULES}${outfit1Forbidden}`;
}
