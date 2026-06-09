import fs from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const OUTPUT = path.join(PUBLIC_DIR, "precache-manifest.json");
const FONTS_DIR = path.join(PUBLIC_DIR, "inaco", "fonts");
const FONT_SOURCE_DIR = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource-variable",
  "google-sans",
  "files",
);

const SKIP_NAMES = new Set([".DS_Store", "precache-manifest.json", "sw.js"]);

const INACO_FONT_FILES = [
  "google-sans-latin-ext-wght-normal.woff2",
  "google-sans-latin-wght-normal.woff2",
];

function syncInacoFonts() {
  if (!fs.existsSync(FONT_SOURCE_DIR)) {
    console.warn(
      "Skipping Inaco font sync: @fontsource-variable/google-sans not installed.",
    );
    return;
  }

  fs.mkdirSync(FONTS_DIR, { recursive: true });

  for (const fileName of INACO_FONT_FILES) {
    const source = path.join(FONT_SOURCE_DIR, fileName);
    const target = path.join(FONTS_DIR, fileName);
    fs.copyFileSync(source, target);
  }

  console.log(`Synced ${INACO_FONT_FILES.length} Inaco font files -> public/inaco/fonts/`);
}

function walkFiles(dir, urlPrefix = "") {
  /** @type {string[]} */
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name) || entry.name.startsWith(".")) continue;
    const absolute = path.join(dir, entry.name);
    const urlPath = `${urlPrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolute, urlPath));
      continue;
    }
    files.push(urlPath);
  }
  return files;
}

syncInacoFonts();

const assets = walkFiles(PUBLIC_DIR).sort();
fs.writeFileSync(OUTPUT, `${JSON.stringify(assets, null, 2)}\n`);
console.log(`Precache manifest: ${assets.length} assets -> public/precache-manifest.json`);
