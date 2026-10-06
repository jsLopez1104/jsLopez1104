import { writeFile } from "node:fs/promises";
import { embedSubsetFont, fontFaceStyle, escapeXml } from "./lib/font.mjs";
import { T } from "./lib/theme.mjs";

const H = 32;
const FONT = 12;
const SPACING = 1;

/** One link button per file — markdown can only link a whole image. */
export async function renderBadgeSvg({ id, label, filled }, outPath) {
  const familyName = `JBMBadge_${id}`;
  const style = fontFaceStyle(familyName, await embedSubsetFont(label, "bold"));
  const width = Math.ceil(label.length * (FONT * 0.6 + SPACING) + 32);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}">
  <defs>${style}</defs>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${H - 1}" rx="${T.radius.sm}"
    fill="${filled ? T.link : T.panel}" stroke="${filled ? T.link : T.border}"/>
  <text x="${width / 2}" y="${H / 2 + 4}" font-size="${FONT}" font-weight="700" letter-spacing="${SPACING}"
    fill="${filled ? "#ffffff" : T.text}" text-anchor="middle">${escapeXml(label)}</text>
</svg>`;
  await writeFile(outPath, svg, "utf-8");
  return svg;
}
