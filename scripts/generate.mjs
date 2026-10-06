import { fetchStats } from "./lib/github-stats.mjs";
import { renderAll } from "./lib/render-all.mjs";

const LOGIN = process.env.PROFILE_LOGIN ?? "jsLopez1104";
const TOKEN = process.env.GITHUB_TOKEN;

async function main() {
  if (!TOKEN) {
    throw new Error("GITHUB_TOKEN env var is required (Actions provides this automatically).");
  }

  const stats = await fetchStats(TOKEN, LOGIN);
  await renderAll(stats, { login: LOGIN });

  console.log("Generated:", stats.publicRepos, "public repos,", stats.totalContributions, "contributions");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
