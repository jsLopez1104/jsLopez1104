import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchStats } from "./lib/github-stats.mjs";
import { renderStatsSvg } from "./render-stats.mjs";
import { renderHeadingSvg } from "./render-heading.mjs";
import { renderPortraitSvg } from "./render-portrait.mjs";

const OUT_DIR = path.join(process.cwd(), "assets", "generated");
const LOGIN = process.env.PROFILE_LOGIN ?? "jsLopez1104";
const TOKEN = process.env.GITHUB_TOKEN;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  if (!TOKEN) {
    throw new Error("GITHUB_TOKEN env var is required (Actions provides this automatically).");
  }

  const stats = await fetchStats(TOKEN, LOGIN);
  await renderStatsSvg(stats, path.join(OUT_DIR, "stats.svg"));

  for (const heading of ["about", "stack", "projects"]) {
    await renderHeadingSvg(heading, path.join(OUT_DIR, `heading-${heading}.svg`));
  }

  const photoPath = path.join(process.cwd(), "assets", "photo.jpg");
  await renderPortraitSvg(photoPath, path.join(OUT_DIR, "portrait.svg"));

  console.log("Generated:", stats.totalContributions, "contributions,", stats.currentStreak, "day streak");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
