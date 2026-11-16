import { writeFile } from "node:fs/promises";
import { regularAndBoldStyle, escapeXml } from "./lib/font.mjs";
import { T } from "./lib/theme.mjs";

// ACTIVITY.LOG: the last year of contributions as a big green grid (53 weeks × 7 days),
// drawn from the same GraphQL data the Action already fetches. Cells fade in column by
// column, left to right, so the year "types itself out" when the profile loads.
const W = 860;
const H = 214;
const GRID_X = 40;
const GRID_Y = 52;
const CELL = 12;
const GAP = 3;

// 5 levels like GitHub's own calendar, tinted from the profile accent.
const LEVELS = ["#21262d", "#0e4429", "#006d32", "#26a641", T.accent];

function level(count, max) {
  if (count === 0) return 0;
  const q = count / Math.max(1, max);
  return q > 0.75 ? 4 : q > 0.5 ? 3 : q > 0.25 ? 2 : 1;
}

export async function renderActivitySvg({ days = [], total = 0, currentStreak = 0, longestStreak = 0 }, outPath) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const recent = weeks.slice(-53);
  // cap the scale at the 95th percentile so one huge day doesn't wash out the rest
  const counts = days.map((d) => d.contributionCount).filter(Boolean).sort((a, b) => a - b);
  const max = counts.length ? counts[Math.floor(counts.length * 0.95)] : 1;

  const cells = recent
    .map((week, w) => {
      const x = GRID_X + w * (CELL + GAP);
      const col = week
        .map((d, i) => `<rect x="${x.toFixed(1)}" y="${(GRID_Y + i * (CELL + GAP)).toFixed(1)}" width="${CELL}" height="${CELL}" rx="2.5" fill="${LEVELS[level(d.contributionCount, max)]}"><title>${d.date}: ${d.contributionCount}</title></rect>`)
        .join("");
      return `<g opacity="0">${col}<animate attributeName="opacity" to="1" begin="${(w * 0.025).toFixed(3)}s" dur="0.3s" fill="freeze"/></g>`;
    })
    .join("\n");

  const months = [];
  let last = "";
  recent.forEach((week, w) => {
    const m = week[0]?.date?.slice(5, 7);
    if (m && m !== last) {
      last = m;
      months.push(`<text x="${GRID_X + w * (CELL + GAP)}" y="${GRID_Y - 8}" font-size="${T.font.xs}" fill="${T.muted}">${["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][Number(m) - 1]}</text>`);
    }
  });

  const stats = [`${total} contributions · last 12 months`, `current streak ${currentStreak}d`, `longest ${longestStreak}d`];
  const legendX = W - 16 - 5 * (CELL + 3) - 70;
  const footY = H - 14;
  const allText = ["ACTIVITY.LOG", "JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC", "MonWedFri", "LessMore", ...stats].join("") + "0123456789:-·";
  const style = await regularAndBoldStyle("JBMA", allText);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${style}</defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${T.radius.lg}" fill="${T.panel}" stroke="${T.border}"/>
  <text x="16" y="24" class="b" font-size="${T.font.xs}" fill="${T.accent}" letter-spacing="1">ACTIVITY.LOG</text>
  <text x="${W - 16}" y="24" font-size="${T.font.xs}" fill="${T.muted}" text-anchor="end">${escapeXml(stats[0])}</text>
  ${months.join("")}
  ${["Mon", "Wed", "Fri"].map((d, i) => `<text x="14" y="${GRID_Y + (1 + i * 2) * (CELL + GAP) + 10}" font-size="${T.font.xs - 1}" fill="${T.muted}">${d}</text>`).join("")}
  ${cells}
  <text x="16" y="${footY}" font-size="${T.font.xs}" fill="${T.text}">${escapeXml(stats[1])} <tspan fill="${T.muted}">·</tspan> ${escapeXml(stats[2])}</text>
  <text x="${legendX}" y="${footY}" font-size="${T.font.xs}" fill="${T.muted}">Less</text>
  ${LEVELS.map((c, i) => `<rect x="${legendX + 30 + i * (CELL + 3)}" y="${footY - 10}" width="${CELL - 2}" height="${CELL - 2}" rx="2" fill="${c}" stroke="${T.border}" stroke-width="${i ? 0 : 1}"/>`).join("")}
  <text x="${legendX + 30 + 5 * (CELL + 3) + 4}" y="${footY}" font-size="${T.font.xs}" fill="${T.muted}">More</text>
</svg>`;
  await writeFile(outPath, svg, "utf-8");
  return svg;
}
