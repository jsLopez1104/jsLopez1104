import { mkdir } from "node:fs/promises";
import path from "node:path";
import { renderStatsSvg } from "./render-stats.mjs";
import { renderHeadingSvg } from "./render-heading.mjs";

const OUT = path.join(process.cwd(), "assets", "generated");
await mkdir(OUT, { recursive: true });

const days = [];
const start = new Date("2025-08-29");
for (let i = 0; i < 371; i++) {
  const d = new Date(start);
  d.setDate(d.getDate() + i);
  const count = Math.random() < 0.25 ? 0 : Math.floor(Math.random() * 12);
  days.push({ date: d.toISOString().slice(0, 10), contributionCount: count });
}

const mockStats = {
  totalContributions: days.reduce((s, d) => s + d.contributionCount, 0),
  days,
  currentStreak: 7,
  longestStreak: 23,
  languages: [
    { name: "JavaScript", color: "#f1e05a", pct: 42.3 },
    { name: "Python", color: "#3572A5", pct: 28.1 },
    { name: "C#", color: "#178600", pct: 18.5 },
    { name: "HTML", color: "#e34c26", pct: 7.2 },
    { name: "CSS", color: "#563d7c", pct: 3.9 },
  ],
};

await renderStatsSvg(mockStats, path.join(OUT, "stats.svg"));
for (const h of ["about", "stack", "projects"]) {
  await renderHeadingSvg(h, path.join(OUT, `heading-${h}.svg`));
}
console.log("OK — wrote stats.svg + 3 headings to", OUT);
