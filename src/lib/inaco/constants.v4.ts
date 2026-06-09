/** Prompt v4 — tema 5 only. Tema 1–4 delegate to frozen v3 (jangan disentuh). */

import {
  INACO_OUTFIT_1_HANBOK_REFS,
  INACO_TEMA_5_CHARACTERS,
  buildInacoExtraRefPaths as buildInacoExtraRefPathsV3,
  buildInacoPromptV3,
  inacoOutfit1HanbokRefPaths,
  inacoTema5CharacterPath,
  pickRandomTema5CharacterId,
  type InacoTema5CharacterId,
} from "./constants.v3";

export type { InacoTema5CharacterId };
export {
  INACO_OUTFIT_1_HANBOK_REFS,
  INACO_TEMA_5_CHARACTERS,
  inacoTema5CharacterPath,
  pickRandomTema5CharacterId,
};

/** Tema 5 pakai urutan upload berbeda: person → mascot → scene (tema). */
export function usesTema5ReferenceOrder(tema: number) {
  return tema === 5;
}

/** Tema 1–4 → v3. Tema 5 → mascot dulu, lalu hanbok (scene dikirim terpisah di cam). */
export function buildInacoExtraRefPaths(
  tema: number,
  outfit: number,
  tema5CharacterId?: InacoTema5CharacterId,
) {
  if (tema !== 5) {
    return buildInacoExtraRefPathsV3(tema, outfit, tema5CharacterId);
  }
  return buildInacoExtraRefPathsV4Tema5(outfit, tema5CharacterId);
}

function buildInacoExtraRefPathsV4Tema5(outfit: number, tema5CharacterId?: InacoTema5CharacterId) {
  const paths: string[] = [];
  if (tema5CharacterId) {
    paths.push(inacoTema5CharacterPath(tema5CharacterId));
  }
  if (outfit === 1) {
    paths.push(...inacoOutfit1HanbokRefPaths());
  }
  return paths;
}

type InacoTema5ImageMap = {
  person: 1;
  mascot: 2;
  scene: 3;
  hanbokMale?: number;
  hanbokFemale?: number;
};

function buildInacoTema5ImageMap(outfit: number): InacoTema5ImageMap {
  let index = 4;
  const map: InacoTema5ImageMap = { person: 1, mascot: 2, scene: 3 };
  if (outfit === 1) {
    map.hanbokMale = index++;
    map.hanbokFemale = index++;
  }
  return map;
}

const INACO_TEMA_5_LANDMARK =
  "a picturesque Hanok village street with Namsan Tower (N Seoul Tower) in the distance and cherry blossom season atmosphere";

const INACO_TEMA5_HUMAN_REQUIRED = `=== TEMA 5 HUMAN REQUIRED (MANDATORY) ===
The output MUST include the photorealistic human(s) from IMAGE 1 prominently in the frame—clearly visible on the left side from head to above the knees, large enough to recognize their face.
An output with ONLY the illustrated mascot and background, WITHOUT the real person from IMAGE 1, is WRONG and invalid.
The person from IMAGE 1 is the primary subject. The mascot from IMAGE 2 poses close together with them like a foto bareng. The illustrated background comes from IMAGE 3 only.
Do NOT convert the person from IMAGE 1 into illustration/cartoon style—they must stay photorealistic.
=== END TEMA 5 HUMAN REQUIRED ===

`;

const INACO_EDIT_TASK = `TASK: Edit IMAGE 1 in place. IMAGE 1 is the captured photo—the ONLY source of human subjects and human identity. The photorealistic person(s) in IMAGE 1 MUST appear in the output—this is non-negotiable. Count every human in IMAGE 1: the output must contain EXACTLY that many photorealistic humans, each appearing exactly once. Do not replace, swap, duplicate, clone, or omit them. Do not copy any human from IMAGE 3 (scene artwork) or other references.

`;

const INACO_PERSON_COUNT_LOCK = `=== PERSON COUNT LOCK (STRICT — SAME AS IMAGE 1) ===
- Count every real human in IMAGE 1. The output must contain EXACTLY that many photorealistic humans—no more, no less.
- ONE-TO-ONE MAPPING: each person in IMAGE 1 appears exactly once. No duplicates, no clones.
- FORBIDDEN: dropping or hiding the person from IMAGE 1. FORBIDDEN: mascot-only output without IMAGE 1 person(s).
- FORBIDDEN: adding extra people from IMAGE 3 scene artwork, Hanbok references, or elsewhere.
- FORBIDDEN: removing, merging, splitting, or duplicating any person from IMAGE 1.
- IMAGE 3 is tema 5 illustrated background/layout only—do NOT copy illustrated humans from IMAGE 3.
- IMAGE 2 mascot is the only non-human character (one mascot, illustrated style).
=== END PERSON COUNT LOCK ===

`;

const INACO_IDENTITY_LOCK_HEADER = `=== IDENTITY LOCK (HIGHEST PRIORITY) ===
- IMAGE 1 = person photo—primary subject, photorealistic, must appear in output.
- IMAGE 2 = mascot reference only (illustrated, not human).
- IMAGE 3 = scene/background/layout from tema 5 artwork—background only, no people from IMAGE 3.
- FACE & HIJAB: copy only from IMAGE 1—unchanged, recognizable, hijab preserved if present.
=== END IDENTITY LOCK ===

`;

const INACO_IDENTITY_LOCK_FOOTER = `=== FINAL CHECK ===
1) Photorealistic person(s) from IMAGE 1 clearly visible, posing together with mascot.
2) Human count = IMAGE 1 count. Person and mascot close like foto bareng. Mascot in same 3D illustrated style as IMAGE 2—not flat 2D. Background from IMAGE 3.
3) Same face, hijab, identity as IMAGE 1. Not illustration-only output.
=== END FINAL CHECK ===

`;

const INACO_TEMA_5_TOGETHER_POSE: Record<InacoTema5CharacterId, string> = {
  1: "Buddy photo together—the person and mascot stand close side-by-side facing the camera. Person smiles warmly. Mascot keeps its flying/welcoming pose from the reference but leans slightly toward the person like a fun selfie moment.",
  2: "Buddy photo together—the person and mascot stand close side-by-side facing the camera. Person smiles warmly. Mascot stays in its reference pose with basketball and drink, angled slightly toward the person like posing for a photo together.",
  3: "Buddy photo together—the person and mascot stand very close like best friends taking a photo. Person smiles at the camera. Mascot interacts playfully—arm around the person's shoulder or leaning in beside them, peace sign or celebratory gesture from the reference—while keeping the mascot's 3D design from IMAGE 2.",
};

const INACO_TEMA5_TOGETHER_POSE_LOCK = `=== TOGETHER PHOTO POSE (TEMA 5) ===
- Compose like a friendly photo together (foto bareng)—person from IMAGE 1 and mascot from IMAGE 2 in the same frame, close to each other, not far apart.
- Both face the camera with a warm, cheerful campaign energy—as if posing for a picture at an event.
- Allow natural interactive posing between person and mascot (leaning in, side-by-side closeness, playful gesture)—but preserve the person's face, hijab, and identity from IMAGE 1, and the mascot's 3D design from IMAGE 2.
- Do NOT leave the person and mascot standing stiffly far apart on opposite sides with no interaction.
=== END TOGETHER PHOTO POSE ===

`;

const INACO_TEMA5_MASCOT_STYLE_LOCK = `=== MASCOT STYLE LOCK (STRICT — MATCH IMAGE 2 REFERENCE) ===
- The mascot must stay faithful to IMAGE 2—the same 3D illustrated campaign character as the reference PNG.
- Preserve the mascot's exact 3D rendered look: rounded volumetric forms, smooth CGI shading, glossy/material depth, and vibrant campaign colors from IMAGE 2.
- Keep the mascot close to the reference—same design, colors, proportions, and pose. Do not redesign, simplify, or stylize away from IMAGE 2.
- FORBIDDEN for mascot: flat 2D cartoon, anime, hand-drawn, sketch, cel-shaded flat illustration, chibi, or any style that deviates from the 3D illustrated reference.
=== END MASCOT STYLE LOCK ===

`;

const INACO_FORBIDDEN_RULES =
  "FORBIDDEN: mascot-only output, missing person from IMAGE 1, person converted to illustration, mascot converted to flat 2D style, mascot redesign away from IMAGE 2 reference, extra people, duplicate person, person from IMAGE 3 artwork, person from Hanbok reference, face swap, hijab removal, watermark.";

function buildInacoTema5MascotPrompt(characterId: InacoTema5CharacterId, imageMap: InacoTema5ImageMap) {
  const character = INACO_TEMA_5_CHARACTERS[characterId];
  const togetherPose = INACO_TEMA_5_TOGETHER_POSE[characterId];
  return `Use IMAGE ${imageMap.mascot} as the single Inaco mascot reference. Include exactly ONE mascot—the ${character.label}. Reproduce the mascot as faithfully as possible from IMAGE ${imageMap.mascot}: exact 3D illustrated campaign art style, same colors, proportions, materials, and base pose: ${character.pose}. The mascot must look like the same 3D CGI character from IMAGE ${imageMap.mascot}—not a redraw, not flat 2D. Illustrated 3D campaign art style for the mascot ONLY—not for the human.

Use IMAGE ${imageMap.scene} as the illustrated background and composition layout reference (tema 5 Hanok village scene). Extract background, sky, atmosphere, and layout only. Do NOT copy any illustrated human or mascot from IMAGE ${imageMap.scene}—those are replaced by the real person from IMAGE 1 and the mascot from IMAGE ${imageMap.mascot}.

TOGETHER PHOTO: ${togetherPose} Preserve exact face, hijab, skin tone, and body identity from IMAGE 1—only adjust pose for natural interaction with the mascot.

Layout: photorealistic person(s) from IMAGE 1 and mascot from IMAGE ${imageMap.mascot} grouped close together in the center-left to center frame like a foto bareng, background atmosphere from IMAGE ${imageMap.scene}.

`;
}

function buildInacoTema5Outfit1HanbokPrompt(map: InacoTema5ImageMap) {
  if (!map.hanbokMale || !map.hanbokFemale) {
    return "";
  }

  return `For outfit 1 (Hanbok), IMAGE ${map.hanbokMale} and IMAGE ${map.hanbokFemale} are GARMENT-ONLY references (torso/clothing crops). Extract Hanbok fabric design, color, and pattern only. Do NOT copy any person, face, head, hair, or hijab from these images.

Male Hanbok (IMAGE ${map.hanbokMale}): dusty slate-blue jeogori/baeja, white collar trim, floral damask, cream sleeves, blue goreum bow, silver norigae tassel.
Female Hanbok (IMAGE ${map.hanbokFemale}): cream jeogori, pink otgoreum bow, dusty pink pleated chima, lace floral pattern, pink norigae tassel.

Dress each person from IMAGE 1 in the matching Hanbok by apparent gender. Change clothing only—face, hijab, and identity stay 100% from IMAGE 1. If IMAGE 1 shows hijab, keep hijab and fit jeogori/chima around it.

Do not add, remove, merge, split, or duplicate any person. Human count in output must exactly match IMAGE 1. Hanbok reference models must not appear as people in the output.

`;
}

function buildInacoTema5OutfitPrompt(outfit: number) {
  if (outfit === 1) {
    return "Dress only the person(s) from IMAGE 1 in the campaign Hanbok outfit described above—do not introduce any person from the Hanbok reference images.";
  }

  return "Dress only the person(s) from IMAGE 1 in modern casual Korean streetwear matching the campaign aesthetic—do not add any person from reference images.";
}

function buildInacoTema5ImageInstructions(imageMap: InacoTema5ImageMap) {
  const lines = [
    "Use IMAGE 1 as the person photo—the mandatory primary photorealistic subject. Must appear in the output.",
    `Use IMAGE ${imageMap.mascot} as the single mascot reference—copy exact 3D illustrated appearance, colors, and pose from this image. Do not convert to flat 2D style.`,
    `Use IMAGE ${imageMap.scene} as the tema 5 scene/background/layout reference—background and atmosphere only, ignore illustrated characters in this image.`,
  ];

  if (imageMap.hanbokMale) {
    lines.push(`Use IMAGE ${imageMap.hanbokMale} as male Hanbok garment reference only (no face/head).`);
    lines.push(`Use IMAGE ${imageMap.hanbokFemale} as female Hanbok garment reference only (no face/head).`);
  }

  return `${lines.join("\n")}\n\n`;
}

function buildInacoPromptV4Tema5(outfit: number, tema5CharacterId?: InacoTema5CharacterId) {
  const characterId = tema5CharacterId ?? pickRandomTema5CharacterId();
  const imageMap = buildInacoTema5ImageMap(outfit);
  const mascotPrompt = buildInacoTema5MascotPrompt(characterId, imageMap);
  const hanbokPrompt = buildInacoTema5Outfit1HanbokPrompt(imageMap);
  const outfitPrompt = buildInacoTema5OutfitPrompt(outfit);
  const imageInstructions = buildInacoTema5ImageInstructions(imageMap);

  const renderStyle = `Hybrid composition: photorealistic person(s) from IMAGE 1 and 3D illustrated mascot from IMAGE ${imageMap.mascot} posing close together like a foto bareng (friendly interactive buddy photo—not far apart). Mascot faithful to IMAGE ${imageMap.mascot} reference in 3D CGI style—not flat 2D. Illustrated background from IMAGE ${imageMap.scene}. Person stays photorealistic with natural lighting and sharp facial detail.`;

  return `${INACO_TEMA5_HUMAN_REQUIRED}${INACO_TEMA5_TOGETHER_POSE_LOCK}${INACO_TEMA5_MASCOT_STYLE_LOCK}${INACO_EDIT_TASK}${INACO_PERSON_COUNT_LOCK}${INACO_IDENTITY_LOCK_HEADER}${imageInstructions}${mascotPrompt}${hanbokPrompt}
HUMAN COUNT LOCK: photorealistic humans in output = humans in IMAGE 1 exactly. Person from IMAGE 1 must be visible—not optional.

Dress each person from IMAGE 1 in Inaco outfit style ${outfit}.

Create a vibrant campaign foto-bareng image—the photorealistic subject(s) from IMAGE 1 and the mascot from IMAGE ${imageMap.mascot} close together, interacting naturally, against ${INACO_TEMA_5_LANDMARK}. ${outfitPrompt} Crop from head to just above the knees. Background and lighting from IMAGE ${imageMap.scene}.

${renderStyle}
${INACO_IDENTITY_LOCK_FOOTER}${INACO_FORBIDDEN_RULES}`;
}

/** Tema 1–4 → v3 unchanged. Tema 5 → v4. */
export function buildInacoPromptV4(
  tema: number,
  outfit: number,
  tema5CharacterId?: InacoTema5CharacterId,
) {
  if (tema !== 5) {
    return buildInacoPromptV3(tema, outfit, tema5CharacterId);
  }
  return buildInacoPromptV4Tema5(outfit, tema5CharacterId);
}
