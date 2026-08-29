import { writeFile } from "node:fs/promises";
import { embedSubsetFont, fontFaceStyle } from "./lib/font.mjs";

const WIDTH = 800;
const CELL = 11;
const GAP = 3;
const HEATMAP_LEFT = 20;
const HEATMAP_TOP = 210;

function levelFor(count) {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

const LEVEL_OPACITY = [0.08, 0.32, 0.52, 0.74, 1];

function heatmapCells(days) {
  // days is chronological; group into weeks of 7 starting Sunday, matching
  // the GraphQL calendar's own week grouping order.
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const cells = [];
  weeks.forEach((week, weekIdx) => {
    week.forEach((day, dayIdx) => {
      const level = levelFor(day.contributionCount);
      const x = HEATMAP_LEFT + weekIdx * (CELL + GAP);
      const y = HEATMAP_TOP + dayIdx * (CELL + GAP);
      const delay = (weekIdx * 7 + dayIdx) * 0.004;
      cells.push({ x, y, level, delay, date: day.date, count: day.contributionCount });
    });
  });
  return cells;
}

function renderHeatmapSvgFragment(days) {
  const cells = heatmapCells(days);
  return cells
    .map(
      (c) => `<rect x="${c.x}" y="${c.y}" width="${CELL}" height="${CELL}" rx="2" fill="#ffffff" opacity="0">
        <title>${c.date}: ${c.count} contribuciones</title>
        <animate attributeName="opacity" from="0" to="${LEVEL_OPACITY[c.level]}" begin="${c.delay}s" dur="0.6s" fill="freeze" />
      </rect>`
    )
    .join("\n");
}

function renderLanguageBars(languages) {
  const top = HEATMAP_TOP + 7 * (CELL + GAP) + 50;
  const barWidth = 400;
  const barHeight = 10;
  return languages
    .map((lang, i) => {
      const y = top + i * 26;
      const targetWidth = (lang.pct / 100) * barWidth;
      const delay = 0.3 + i * 0.15;
      return `
      <text x="${HEATMAP_LEFT}" y="${y - 4}" font-size="13" fill="#ffffff" opacity="0.85">${lang.name}</text>
      <text x="${HEATMAP_LEFT + barWidth}" y="${y - 4}" font-size="13" fill="#ffffff" opacity="0.55" text-anchor="end">${lang.pct.toFixed(1)}%</text>
      <rect x="${HEATMAP_LEFT}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" fill="#ffffff" opacity="0.12" />
      <rect x="${HEATMAP_LEFT}" y="${y}" width="0" height="${barHeight}" rx="3" fill="${lang.color ?? "#ffffff"}" opacity="0.9">
        <animate attributeName="width" from="0" to="${targetWidth}" begin="${delay}s" dur="0.8s" fill="freeze" />
      </rect>`;
    })
    .join("\n");
}

export async function renderStatsSvg(stats, outPath) {
  const familyName = "JBMStats";
  const allText = [
    "contribuciones en el ultimo ano",
    "racha actual",
    "racha mas larga",
    String(stats.totalContributions),
    String(stats.currentStreak),
    String(stats.longestStreak),
    "dias",
    ...stats.languages.map((l) => l.name),
    ...stats.languages.map((l) => `${l.pct.toFixed(1)}%`),
    "0123456789.%",
  ].join("");
  const fontBase64 = await embedSubsetFont(allText + "abcdefghijklmnopqrstuvwxyzáéíóúñ ", "regular");
  const style = fontFaceStyle(familyName, fontBase64);

  const height = HEATMAP_TOP + 7 * (CELL + GAP) + 60 + stats.languages.length * 26 + 20;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
  <defs>${style}</defs>
  <rect width="${WIDTH}" height="${height}" fill="#0d1117" />

  <text x="${HEATMAP_LEFT}" y="50" font-size="34" font-weight="700" fill="#ffffff">${stats.totalContributions}</text>
  <text x="${HEATMAP_LEFT}" y="72" font-size="13" fill="#ffffff" opacity="0.6">contribuciones en el ultimo ano</text>

  <text x="${HEATMAP_LEFT + 260}" y="50" font-size="34" font-weight="700" fill="#ffffff">${stats.currentStreak}</text>
  <text x="${HEATMAP_LEFT + 260}" y="72" font-size="13" fill="#ffffff" opacity="0.6">racha actual (dias)</text>

  <text x="${HEATMAP_LEFT + 520}" y="50" font-size="34" font-weight="700" fill="#ffffff">${stats.longestStreak}</text>
  <text x="${HEATMAP_LEFT + 520}" y="72" font-size="13" fill="#ffffff" opacity="0.6">racha mas larga (dias)</text>

  <line x1="${HEATMAP_LEFT}" y1="95" x2="${WIDTH - HEATMAP_LEFT}" y2="95" stroke="#ffffff" stroke-opacity="0.15" />

  <text x="${HEATMAP_LEFT}" y="${HEATMAP_TOP - 15}" font-size="13" fill="#ffffff" opacity="0.6">actividad del ultimo ano</text>
  ${renderHeatmapSvgFragment(stats.days)}

  ${renderLanguageBars(stats.languages)}
</svg>`;

  await writeFile(outPath, svg, "utf-8");
  return svg;
}
