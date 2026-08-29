import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import subsetFont from "subset-font";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "..", "..", "assets");

const FONT_FILES = {
  regular: path.join(ASSETS_DIR, "JetBrainsMono-Regular.ttf"),
  bold: path.join(ASSETS_DIR, "JetBrainsMono-Bold.ttf"),
};

/**
 * Subsets JetBrains Mono down to exactly the characters used, and returns a
 * base64 woff2 data URI. Keeping the subset tight is why the SVGs stay small
 * even with a full font embedded per-graphic.
 */
export async function embedSubsetFont(text, weight = "regular") {
  const fontPath = FONT_FILES[weight];
  const fullFont = await readFile(fontPath);
  const uniqueChars = [...new Set(text)].join("");
  const subsetBuffer = await subsetFont(fullFont, uniqueChars, {
    targetFormat: "woff2",
  });
  return subsetBuffer.toString("base64");
}

/**
 * Builds an inline <style> block declaring @font-face for a subset, scoped
 * to a unique font-family name so multiple SVGs on the same page never clash.
 */
export function fontFaceStyle(familyName, base64Woff2) {
  return `<style>
  @font-face {
    font-family: "${familyName}";
    src: url(data:font/woff2;base64,${base64Woff2}) format("woff2");
  }
  text, tspan { font-family: "${familyName}", monospace; }
</style>`;
}
