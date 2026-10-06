// Renders everything without a GitHub token, using mock stats.
import { renderAll } from "./lib/render-all.mjs";

await renderAll({ publicRepos: 4, totalContributions: 0 });
console.log("OK — wrote all graphics to assets/generated");
