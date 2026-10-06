import { mkdir } from "node:fs/promises";
import path from "node:path";
import * as config from "../../profile.config.mjs";
import { renderTerminalSvg } from "../render-terminal.mjs";
import { renderStackSvg } from "../render-stack.mjs";
import { renderSignalsSvg } from "../render-signals.mjs";
import { renderBadgeSvg } from "../render-badge.mjs";
import { renderHeadingSvg } from "../render-heading.mjs";

export const HEADINGS = ["about", "stack", "signals", "projects"];

/** Renders every graphic from config + live stats. Shared by generate and test-local. */
export async function renderAll(stats, { root = process.cwd(), login = "jsLopez1104" } = {}) {
  const out = path.join(root, "assets", "generated");
  await mkdir(out, { recursive: true });
  const file = (name) => path.join(out, name);

  await renderTerminalSvg(
    {
      photoPath: path.join(root, "assets", "photo.jpg"),
      crop: config.portrait.crop,
      tone: config.portrait.tone,
      systemInfo: config.systemInfo,
      footer: config.footer,
      login,
    },
    file("terminal.svg")
  );

  await renderStackSvg(config.stack, file("stack.svg"));

  const today = new Date().toISOString().slice(0, 10);
  await renderSignalsSvg(
    {
      skills: config.skills,
      numbers: config.numbers,
      syncedLine: `synced ${today} · ${stats.publicRepos} public repos`,
    },
    file("signals.svg")
  );

  for (const badge of config.badges) await renderBadgeSvg(badge, file(`badge-${badge.id}.svg`));
  for (const h of HEADINGS) await renderHeadingSvg(h, file(`heading-${h}.svg`));
}
