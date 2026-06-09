import fs from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const OUTPUT = path.join(PUBLIC_DIR, "precache-manifest.json");

const SKIP_NAMES = new Set([".DS_Store", "precache-manifest.json", "sw.js"]);

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

const assets = walkFiles(PUBLIC_DIR).sort();
fs.writeFileSync(OUTPUT, `${JSON.stringify(assets, null, 2)}\n`);
console.log(`Precache manifest: ${assets.length} assets -> public/precache-manifest.json`);
