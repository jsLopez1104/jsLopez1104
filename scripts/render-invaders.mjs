import { writeFile } from "node:fs/promises";
import { regularAndBoldStyle, escapeXml } from "./lib/font.mjs";
import { T } from "./lib/theme.mjs";

// CONTRIB.INVADERS: the same 53×7 contribution grid, but every green cell is an
// invader. A pixel ship sweeps left→right under the grid and fires up each column
// that has activity; cells blink white and vanish as the shot passes them. Pure SMIL,
// so it plays inside the README (GitHub strips scripts, not <animate>), and every
// animation shares one cycle length so the whole scene loops cleanly.
const W = 860;
const H = 230;
const GRID_X = 40;
const GRID_Y = 44;
const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const SHIP_Y = GRID_Y + 7 * STEP + 34;   // ship's nose
const SWEEP = 14;                         // seconds for one pass
const PAUSE = 2.5;                        // grid reassembles, then loop
const CYCLE = SWEEP + PAUSE;
const BULLET_SPEED = 420;                 // px/s

const LEVELS = ["#21262d", "#0e4429", "#006d32", "#26a641", T.accent];
const kt = (t) => Math.min(1, Math.max(0, t / CYCLE)).toFixed(4);

function level(count, max) {
  if (count === 0) return 0;
  const q = count / Math.max(1, max);
  return q > 0.75 ? 4 : q > 0.5 ? 3 : q > 0.25 ? 2 : 1;
}

// 11×8 pixel ship, drawn with 3px squares.
const SHIP = ["....#....", "...###...", "...###...", ".#######.", "#########", "##.###.##", "#...#...#"];
function shipPixels() {
  const px = 3, out = [];
  SHIP.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === "#") out.push(`<rect x="${(x - 4) * px - px / 2}" y="${y * px}" width="${px}" height="${px}"/>`);
  }));
  return out.join("");
}

export async function renderInvadersSvg({ days = [] }, outPath) {
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const recent = weeks.slice(-53);
  const counts = days.map((d) => d.contributionCount).filter(Boolean).sort((a, b) => a - b);
  const max = counts.length ? counts[Math.floor(counts.length * 0.95)] : 1;

  const x0 = GRID_X + CELL / 2;
  const x1 = GRID_X + 52 * STEP + CELL / 2;
  const speed = (x1 - x0) / SWEEP;

  let targets = 0;
  const cells = [];
  const shots = [];
  recent.forEach((week, w) => {
    const cx = GRID_X + w * STEP;
    const fire = (cx + CELL / 2 - x0) / speed;           // when the ship is under this column
    let fired = false;
    week.forEach((d, i) => {
      const y = GRID_Y + i * STEP;
      const lv = level(d.contributionCount, max);
      if (!lv) {
        cells.push(`<rect x="${cx}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${LEVELS[0]}"/>`);
        return;
      }
      targets++; fired = true;
      const hit = fire + (SHIP_Y - (y + CELL)) / BULLET_SPEED;
      // stays → flashes white → gone → reappears during the pause
      const times = [0, hit, hit + 0.06, hit + 0.18, SWEEP + 0.6, SWEEP + 1.2, CYCLE].map(kt).join(";");
      cells.push(`<rect x="${cx}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${LEVELS[lv]}">` +
        `<animate attributeName="fill" values="${LEVELS[lv]};${LEVELS[lv]};#ffffff;#ffffff;#ffffff;${LEVELS[lv]};${LEVELS[lv]}" keyTimes="${times}" dur="${CYCLE}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="1;1;1;0;0;1;1" keyTimes="${times}" dur="${CYCLE}s" repeatCount="indefinite"/></rect>`);
    });
    if (fired) {
      const top = GRID_Y - 10;
      const end = fire + (SHIP_Y - top) / BULLET_SPEED;
      const times = [0, fire, end, Math.min(end + 0.01, CYCLE), CYCLE].map(kt).join(";");
      shots.push(`<rect x="${cx + CELL / 2 - 1.5}" width="3" height="9" rx="1" fill="${T.accent}" opacity="0">` +
        `<animate attributeName="y" values="${SHIP_Y};${SHIP_Y};${top};${top};${SHIP_Y}" keyTimes="${times}" dur="${CYCLE}s" repeatCount="indefinite"/>` +
        `<animate attributeName="opacity" values="0;1;1;0;0" keyTimes="${times}" dur="${CYCLE}s" repeatCount="indefinite" calcMode="discrete"/></rect>`);
    }
  });

  const shipMove = `<animateTransform attributeName="transform" type="translate" values="${x0} ${SHIP_Y};${x1} ${SHIP_Y};${x1} ${SHIP_Y};${x0} ${SHIP_Y}" keyTimes="0;${kt(SWEEP)};${kt(SWEEP + 0.6)};1" dur="${CYCLE}s" repeatCount="indefinite"/>`;

  const label = `${targets} targets · one per day with contributions`;
  const style = await regularAndBoldStyle("JBMI", "CONTRIB.INVADERS" + label + "0123456789·");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${style}</defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${T.radius.lg}" fill="${T.panel}" stroke="${T.border}"/>
  <text x="16" y="24" class="b" font-size="${T.font.xs}" fill="${T.accent}" letter-spacing="1">CONTRIB.INVADERS</text>
  <text x="${W - 16}" y="24" font-size="${T.font.xs}" fill="${T.muted}" text-anchor="end">${escapeXml(label)}</text>
  ${cells.join("\n")}
  ${shots.join("\n")}
  <g fill="${T.accentAlt}">${shipPixels()}${shipMove}</g>
  <line x1="16" y1="${SHIP_Y + 26}" x2="${W - 16}" y2="${SHIP_Y + 26}" stroke="${T.border}"/>
</svg>`;
  await writeFile(outPath, svg, "utf-8");
  return svg;
}
