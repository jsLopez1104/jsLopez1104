import { writeFile } from "node:fs/promises";
import { Jimp, intToRGBA } from "jimp";
import { embedSubsetFont, fontFaceStyle } from "./lib/font.mjs";

// Density ramp, dark→light. Space = no ink (stays background-colored),
// "@" = maximum ink. Bright source pixels get dense characters so the
// portrait reads as light-on-dark, matching a black GitHub profile theme.
const RAMP = " .:-=+*#%@";

const FONT_SIZE = 7;
const CHAR_W = FONT_SIZE * 0.6; // JetBrains Mono's fixed advance width
const LINE_H = FONT_SIZE * 1.15;

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export async function renderPortraitSvg(photoPath, outPath, { columns = 90 } = {}) {
  const image = await Jimp.read(photoPath);
  const aspect = image.height / image.width;
  const rows = Math.round(columns * aspect * (CHAR_W / LINE_H));

  const resized = image.clone().resize({ w: columns, h: rows }).contrast(0.35);

  // Sample the four corners to guess whether the background is light or dark.
  // Portraits shot against a light wall (background brighter than the
  // subject) need the ramp inverted, or the wall — not the face — ends up
  // being the "densest" (most visible) part of the art.
  const corners = [
    [0, 0],
    [columns - 1, 0],
    [0, rows - 1],
    [columns - 1, rows - 1],
  ].map(([x, y]) => luminance(...Object.values(intToRGBA(resized.getPixelColor(x, y))).slice(0, 3)));
  const backgroundIsLight = corners.reduce((a, b) => a + b, 0) / corners.length > 127;

  const rowStrings = [];
  for (let y = 0; y < rows; y++) {
    let row = "";
    for (let x = 0; x < columns; x++) {
      const { r, g, b } = intToRGBA(resized.getPixelColor(x, y));
      let l = luminance(r, g, b) / 255; // 0..1
      if (backgroundIsLight) l = 1 - l;
      const idx = Math.min(RAMP.length - 1, Math.floor(l * RAMP.length));
      row += RAMP[idx];
    }
    rowStrings.push(row);
  }

  const familyName = "JBMPortrait";
  const fontBase64 = await embedSubsetFont(RAMP, "regular");
  const style = fontFaceStyle(familyName, fontBase64);

  const width = Math.ceil(columns * CHAR_W) + 4;
  const height = Math.ceil(rows * LINE_H) + 4;

  const textLines = rowStrings
    .map(
      (row, i) =>
        `<text x="2" y="${Math.round((i + 1) * LINE_H)}" xml:space="preserve">${escapeXml(row)}</text>`
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${style}</defs>
  <rect width="${width}" height="${height}" fill="#0d1117" />
  <g font-size="${FONT_SIZE}" fill="#ffffff" letter-spacing="0">
    ${textLines}
  </g>
</svg>`;

  await writeFile(outPath, svg, "utf-8");
  return svg;
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
