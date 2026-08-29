import { writeFile } from "node:fs/promises";
import { embedSubsetFont, fontFaceStyle } from "./lib/font.mjs";

/**
 * Renders a single lowercase heading (e.g. "about", "stack", "projects") as
 * a small standalone SVG using the embedded JetBrains Mono subset — this is
 * the only way to control a README heading's typeface, since GitHub strips
 * <style>/CSS from the outer markdown but not from an embedded SVG image.
 */
export async function renderHeadingSvg(text, outPath, { fontSize = 22 } = {}) {
  const familyName = `JBMH_${text.replace(/[^a-z]/gi, "")}`;
  const fontBase64 = await embedSubsetFont(text, "bold");
  const style = fontFaceStyle(familyName, fontBase64).replace(
    "font-family:",
    "font-weight: 700; font-family:"
  );

  // Monospace advance width for JetBrains Mono is 0.600em, per character.
  const padding = 10;
  const width = Math.ceil(text.length * fontSize * 0.6) + padding * 2;
  const height = Math.ceil(fontSize * 1.4) + padding * 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${style}</defs>
  <rect width="${width}" height="${height}" fill="#0d1117" />
  <text x="${padding}" y="${padding + Math.round(height * 0.55)}" font-size="${fontSize}" font-weight="700" fill="#ffffff">${text}</text>
</svg>`;

  await writeFile(outPath, svg, "utf-8");
  return svg;
}
