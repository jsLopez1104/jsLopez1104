// Renders everything without a GitHub token, using mock stats.
import { renderAll } from "./lib/render-all.mjs";

// a fake year of contributions so the activity grid has something to draw
const days = Array.from({ length: 371 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 10, 10) + i * 864e5);
  const busy = Math.sin(i / 9) + Math.sin(i / 23) + (d.getUTCDay() % 6 === 0 ? -1.2 : 0.4);
  return { date: d.toISOString().slice(0, 10), contributionCount: Math.max(0, Math.round(busy * 3 + Math.random() * 3)) };
});
await renderAll({ publicRepos: 9, totalContributions: days.reduce((s, d) => s + d.contributionCount, 0), days, currentStreak: 6, longestStreak: 23 });
console.log("OK — wrote all graphics to assets/generated");
