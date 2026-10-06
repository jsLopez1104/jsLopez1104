import { writeFile } from "node:fs/promises";
import { Jimp, intToRGBA } from "jimp";
import { regularAndBoldStyle, escapeXml } from "./lib/font.mjs";
import { T } from "./lib/theme.mjs";

const W = 860;
const TITLE_H = 34;
const PANEL_Y = 50;
const PANEL_H = 320;
const H = PANEL_Y + PANEL_H + 16;
const LEFT = { x: 16, w: 330 };
const RIGHT = { x: 362, w: 482 };

const PITCH = 4; // px between portrait dots
const ROW_H = 19;
const MONO = 0.6; // JetBrains Mono advance width, in em

function luminance({ r, g, b }) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Photo → grid of dots whose radius encodes "ink". Same light-background
 * inversion as the old ASCII portrait, plus two fixes for faces that came out
 * muddy: a percentile contrast stretch (so the darkest 5% is full ink and the
 * lightest 5% is empty, whatever the exposure), and an elliptical vignette so
 * the wall and sweater at the edges fade out instead of competing with the face.
 */
async function portraitDots(photoPath, crop, maxW, maxH, tone = "auto") {
  const image = await Jimp.read(photoPath);
  const cx = Math.round(image.width * crop.x);
  const cy = Math.round(image.height * crop.y);
  const cw = Math.round(image.width * crop.w);
  const ch = Math.round(image.height * crop.h);
  const aspect = ch / cw;

  let cols = Math.floor(maxW / PITCH);
  let rows = Math.round(cols * aspect);
  if (rows * PITCH > maxH) {
    rows = Math.floor(maxH / PITCH);
    cols = Math.round(rows / aspect);
  }

  const small = image.clone().crop({ x: cx, y: cy, w: cw, h: ch }).resize({ w: cols, h: rows });
  const lum = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) lum.push(luminance(intToRGBA(small.getPixelColor(x, y))));
  }

  const corners = [0, cols - 1, (rows - 1) * cols, rows * cols - 1].map((i) => lum[i]);
  const invert = tone === "auto" ? corners.reduce((a, b) => a + b, 0) / 4 > 0.5 : tone === "negative";
  const ink = lum.map((l) => (invert ? 1 - l : l));

  const sorted = [...ink].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.05)];
  const hi = sorted[Math.floor(sorted.length * 0.95)];

  const dots = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = (x - (cols - 1) / 2) / (cols / 2);
      const ny = (y - (rows - 1) / 2) / (rows / 2);
      const d = nx * nx + ny * ny;
      const vignette = Math.max(0, Math.min(1, (1.15 - d) / 0.55));
      let v = (ink[y * cols + x] - lo) / (hi - lo || 1);
      v = Math.max(0, Math.min(1, v)) ** 1.3 * vignette;
      if (v < 0.12) continue;
      dots.push({ x, y, r: Math.max(0.5, (PITCH / 2) * 0.95 * v) });
    }
  }
  return { cols, rows, dots };
}

function cornerBrackets(x, y, w, h, len = 10) {
  const p = (d) => `<path d="${d}" fill="none" stroke="${T.muted}" stroke-opacity="0.6" />`;
  return [
    p(`M${x} ${y + len}V${y}H${x + len}`),
    p(`M${x + w - len} ${y}H${x + w}V${y + len}`),
    p(`M${x} ${y + h - len}V${y + h}H${x + len}`),
    p(`M${x + w - len} ${y + h}H${x + w}V${y + h - len}`),
  ].join("");
}

function panel(x, w) {
  return `<rect x="${x}" y="${PANEL_Y}" width="${w}" height="${PANEL_H}" rx="${T.radius.md}" fill="${T.panelInset}" stroke="${T.border}" />`;
}

export async function renderTerminalSvg({ photoPath, crop, tone, systemInfo, footer, login }, outPath) {
  // ---- left: VISUAL.MAP -------------------------------------------------
  const area = { x: LEFT.x + 14, y: PANEL_Y + 34, w: LEFT.w - 28, h: PANEL_H - 66 };
  const { cols, rows, dots } = await portraitDots(photoPath, crop, area.w - 16, area.h - 12, tone);
  const ox = area.x + (area.w - cols * PITCH) / 2;
  const oy = area.y + (area.h - rows * PITCH) / 2;

  // Reveal the portrait top-down, one dot row at a time.
  const byRow = new Map();
  for (const d of dots) {
    if (!byRow.has(d.y)) byRow.set(d.y, []);
    byRow.get(d.y).push(d);
  }
  const portrait = [...byRow.entries()]
    .map(([y, rowDots]) => {
      const circles = rowDots
        .map((d) => `<circle cx="${(ox + d.x * PITCH + PITCH / 2).toFixed(1)}" cy="${(oy + y * PITCH + PITCH / 2).toFixed(1)}" r="${d.r.toFixed(2)}"/>`)
        .join("");
      return `<g opacity="0">${circles}<animate attributeName="opacity" to="1" begin="${(y * 0.02).toFixed(2)}s" dur="0.3s" fill="freeze"/></g>`;
    })
    .join("\n");

  const scan = `<rect x="${area.x}" y="${area.y}" width="${area.w}" height="2" fill="${T.accentAlt}" opacity="0.25">
    <animate attributeName="y" from="${area.y}" to="${area.y + area.h - 2}" dur="4s" begin="1.5s" repeatCount="indefinite"/>
  </rect>`;

  const visualMeta = `${cols}×${rows} · DOTS`;
  const visualFooter = `PTS ${dots.length} · PORTRAIT`;

  // ---- right: SYSTEM.INFO -----------------------------------------------
  const rx = RIGHT.x + 18;
  const rEnd = RIGHT.x + RIGHT.w - 18;
  const rowsTop = PANEL_Y + 56;
  const clips = [];
  const infoRows = systemInfo
    .map(([k, v], i) => {
      const y = rowsTop + i * ROW_H;
      const id = `r${i}`;
      clips.push(`<clipPath id="${id}"><rect x="${rx - 2}" y="${y - 13}" width="0" height="${ROW_H}">
        <animate attributeName="width" to="${rEnd - rx + 4}" begin="${(0.4 + i * 0.12).toFixed(2)}s" dur="0.35s" fill="freeze"/>
      </rect></clipPath>`);
      return `<g clip-path="url(#${id})">
        <text x="${rx}" y="${y}" fill="${T.muted}">${escapeXml(k)}</text>
        <text x="${rEnd}" y="${y}" fill="${T.text}" text-anchor="end">${escapeXml(v)}</text>
      </g>`;
    })
    .join("\n");

  const loginW = login.length * T.font.xs * MONO + 18;
  const loginX = rEnd - loginW;
  const liveW = 48;
  const liveX = loginX - liveW - 8;

  const footY = PANEL_Y + PANEL_H - 14;
  const statusText = `● ${footer.status}`;
  const cursorX = rx + statusText.length * T.font.xs * MONO + 4;

  const allText = [
    "profile.sh — live", "VISUAL.MAP", "SYSTEM.INFO", "LIVE", "●█",
    visualMeta, visualFooter, login, statusText, footer.location,
    ...systemInfo.flat(),
  ].join("");
  const style = await regularAndBoldStyle("JBMT", allText);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${style}${clips.join("")}</defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${T.radius.lg}" fill="${T.panel}" stroke="${T.border}"/>

  <!-- title bar -->
  ${T.dots.map((c, i) => `<circle cx="${22 + i * 18}" cy="${TITLE_H / 2 + 2}" r="6" fill="${c}"/>`).join("")}
  <text x="${W / 2}" y="${TITLE_H / 2 + 6}" font-size="${T.font.sm}" fill="${T.muted}" text-anchor="middle">profile.sh — live</text>

  <!-- VISUAL.MAP -->
  ${panel(LEFT.x, LEFT.w)}
  <text x="${LEFT.x + 14}" y="${PANEL_Y + 22}" class="b" font-size="${T.font.xs}" fill="${T.accent}" letter-spacing="1">VISUAL.MAP</text>
  <text x="${LEFT.x + LEFT.w - 14}" y="${PANEL_Y + 22}" font-size="${T.font.xs}" fill="${T.muted}" text-anchor="end">${visualMeta}</text>
  ${cornerBrackets(area.x, area.y, area.w, area.h)}
  <g fill="${T.accentAlt}">
  ${portrait}
  </g>
  ${scan}
  <text x="${LEFT.x + 14}" y="${PANEL_Y + PANEL_H - 12}" font-size="${T.font.xs}" fill="${T.muted}">${visualFooter}</text>

  <!-- SYSTEM.INFO -->
  ${panel(RIGHT.x, RIGHT.w)}
  <text x="${rx}" y="${PANEL_Y + 22}" class="b" font-size="${T.font.xs}" fill="${T.accent}" letter-spacing="1">SYSTEM.INFO</text>
  <g font-size="${T.font.xs}">
    <rect x="${liveX}" y="${PANEL_Y + 9}" width="${liveW}" height="18" rx="9" fill="none" stroke="${T.live}" stroke-opacity="0.6"/>
    <circle cx="${liveX + 11}" cy="${PANEL_Y + 18}" r="3" fill="${T.live}">
      <animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <text x="${liveX + 19}" y="${PANEL_Y + 22}" class="b" fill="${T.live}">LIVE</text>
    <rect x="${loginX}" y="${PANEL_Y + 9}" width="${loginW}" height="18" rx="9" fill="${T.accent}" fill-opacity="0.15" stroke="${T.accent}" stroke-opacity="0.5"/>
    <text x="${loginX + loginW / 2}" y="${PANEL_Y + 22}" fill="${T.accent}" text-anchor="middle">${escapeXml(login)}</text>
  </g>
  <line x1="${rx}" y1="${PANEL_Y + 34}" x2="${rEnd}" y2="${PANEL_Y + 34}" stroke="${T.border}"/>
  <g font-size="${T.font.sm}">
  ${infoRows}
  </g>
  <line x1="${rx}" y1="${footY - 16}" x2="${rEnd}" y2="${footY - 16}" stroke="${T.border}"/>
  <g font-size="${T.font.xs}">
    <text x="${rx}" y="${footY}" class="b" fill="${T.accent}">${escapeXml(statusText)}</text>
    <rect x="${cursorX}" y="${footY - 9}" width="6" height="11" fill="${T.accent}">
      <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.5;0.5;1" dur="1s" repeatCount="indefinite"/>
    </rect>
    <text x="${rEnd}" y="${footY}" fill="${T.muted}" text-anchor="end">${escapeXml(footer.location)}</text>
  </g>
</svg>`;

  await writeFile(outPath, svg, "utf-8");
  return svg;
}
