import { writeFile } from "node:fs/promises";
import { regularAndBoldStyle, escapeXml } from "./lib/font.mjs";
import { T } from "./lib/theme.mjs";

const W = 860;
const H = 320;
const PANEL_Y = 1;
const PANEL_H = H - 2;
const LEFT = { x: 1, w: 420 };
const RIGHT = { x: 439, w: 420 };
const RADIUS = 92;

function panel(x, w) {
  return `<rect x="${x}" y="${PANEL_Y}" width="${w}" height="${PANEL_H}" rx="${T.radius.lg}" fill="${T.panel}" stroke="${T.border}"/>`;
}

function point(i, n, r) {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [r * Math.cos(a), r * Math.sin(a)];
}

function radar(skills, cx, cy) {
  const n = skills.length;
  const ring = (f) =>
    `<polygon points="${skills.map((_, i) => point(i, n, RADIUS * f).map((v) => v.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${T.border}"/>`;
  const axes = skills
    .map((_, i) => {
      const [x, y] = point(i, n, RADIUS);
      return `<line x1="0" y1="0" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${T.border}"/>`;
    })
    .join("");
  const shape = skills.map(([, v], i) => point(i, n, (RADIUS * v) / 100).map((c) => c.toFixed(1)).join(",")).join(" ");
  const vertices = skills
    .map(([, v], i) => {
      const [x, y] = point(i, n, (RADIUS * v) / 100);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${T.accent}"/>`;
    })
    .join("");
  const labels = skills
    .map(([name, v], i) => {
      const [x, y] = point(i, n, RADIUS + 18);
      const anchor = Math.abs(x) < 5 ? "middle" : x > 0 ? "start" : "end";
      const dy = y < -RADIUS ? -4 : y > RADIUS ? 12 : 4;
      return `<text x="${x.toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${anchor}" font-size="${T.font.sm}" fill="${T.text}">${escapeXml(name)} <tspan fill="${T.muted}">${v}</tspan></text>`;
    })
    .join("");

  return `<g transform="translate(${cx} ${cy})">
    ${[0.25, 0.5, 0.75, 1].map(ring).join("")}
    ${axes}
    <g>
      <animateTransform attributeName="transform" type="scale" from="0" to="1" dur="0.9s" begin="0.2s" fill="freeze"/>
      <polygon points="${shape}" fill="${T.accentAlt}" fill-opacity="0.25" stroke="${T.accent}" stroke-width="2" stroke-linejoin="round"/>
      ${vertices}
    </g>
    ${labels}
  </g>`;
}

function numberTiles(numbers, x0, y0, w) {
  const gap = 12;
  const tw = (w - gap) / 2;
  const th = 92;
  return numbers
    .map(([value, label], i) => {
      const x = x0 + (i % 2) * (tw + gap);
      const y = y0 + Math.floor(i / 2) * (th + gap);
      return `<g opacity="0">
      <rect x="${x}" y="${y}" width="${tw}" height="${th}" rx="${T.radius.md}" fill="${T.panelInset}" stroke="${T.border}"/>
      <text x="${x + 16}" y="${y + 46}" class="b" font-size="${T.font.xl}" fill="${T.text}">${escapeXml(value)}</text>
      <text x="${x + 16}" y="${y + 72}" font-size="${T.font.xs}" fill="${T.muted}">${escapeXml(label)}</text>
      <animate attributeName="opacity" to="1" begin="${(0.3 + i * 0.15).toFixed(2)}s" dur="0.5s" fill="freeze"/>
    </g>`;
    })
    .join("\n");
}

export async function renderSignalsSvg({ skills, numbers, syncedLine }, outPath) {
  const allText = ["SKILL.RADAR", "AT.A.GLANCE", "self-assessed", syncedLine, ...skills.flat().map(String), ...numbers.flat()].join("");
  const style = await regularAndBoldStyle("JBMS", allText + " 0123456789");

  const header = (x, w, title, note) => `
  <text x="${x + 18}" y="${PANEL_Y + 26}" class="b" font-size="${T.font.xs}" fill="${T.accent}" letter-spacing="1">${title}</text>
  <text x="${x + w - 18}" y="${PANEL_Y + 26}" font-size="${T.font.xs}" fill="${T.muted}" text-anchor="end">${escapeXml(note)}</text>
  <line x1="${x + 18}" y1="${PANEL_Y + 40}" x2="${x + w - 18}" y2="${PANEL_Y + 40}" stroke="${T.border}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${style}</defs>
  ${panel(LEFT.x, LEFT.w)}
  ${header(LEFT.x, LEFT.w, "SKILL.RADAR", "self-assessed")}
  ${radar(skills, LEFT.x + LEFT.w / 2, PANEL_Y + 40 + (PANEL_H - 40) / 2 + 4)}

  ${panel(RIGHT.x, RIGHT.w)}
  ${header(RIGHT.x, RIGHT.w, "AT.A.GLANCE", "")}
  ${numberTiles(numbers, RIGHT.x + 18, PANEL_Y + 56, RIGHT.w - 36)}
  <text x="${RIGHT.x + 18}" y="${PANEL_Y + PANEL_H - 14}" font-size="${T.font.xs}" fill="${T.muted}">${escapeXml(syncedLine)}</text>
</svg>`;

  await writeFile(outPath, svg, "utf-8");
  return svg;
}
