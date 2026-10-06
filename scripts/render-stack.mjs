import { writeFile } from "node:fs/promises";
import * as icons from "simple-icons";
import { escapeXml } from "./lib/font.mjs";
import { T } from "./lib/theme.mjs";

const TILE = 52;
const GAP = 10;
const PER_ROW = 10;
const ICON = 28;

function relativeLuminance(hex) {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Grid of brand icons on dark tiles, skillicons-style but generated locally. */
export async function renderStackSvg(stack, outPath) {
  const rows = Math.ceil(stack.length / PER_ROW);
  const width = PER_ROW * TILE + (PER_ROW - 1) * GAP + 2;
  const height = rows * TILE + (rows - 1) * GAP + 2;
  const scale = ICON / 24;
  const pad = (TILE - ICON) / 2;

  const tiles = stack
    .map(([exportName, label], i) => {
      const icon = icons[exportName];
      if (!icon) throw new Error(`simple-icons has no export "${exportName}"`);
      // Near-black brand colors (Tailscale, etc.) would vanish on a dark tile.
      const color = relativeLuminance(icon.hex) < 0.25 ? T.text : `#${icon.hex}`;
      const x = 1 + (i % PER_ROW) * (TILE + GAP);
      const y = 1 + Math.floor(i / PER_ROW) * (TILE + GAP);
      return `<g opacity="0">
    <title>${escapeXml(label)}</title>
    <rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="${T.radius.md}" fill="${T.panel}" stroke="${T.border}"/>
    <path transform="translate(${x + pad} ${y + pad}) scale(${scale})" fill="${color}" d="${icon.path}"/>
    <animate attributeName="opacity" to="1" begin="${(i * 0.05).toFixed(2)}s" dur="0.4s" fill="freeze"/>
  </g>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${tiles}
</svg>`;
  await writeFile(outPath, svg, "utf-8");
  return svg;
}
