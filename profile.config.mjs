// Everything personal shown on the profile lives here, so updating the
// profile is editing data, not renderer code.

export const systemInfo = [
  ["Subject", "Juan Sebastián López"],
  ["Role", "Automation · Self-hosted infra"],
  ["Origin", "Antioquia, Colombia"],
  ["Education", "Systems Eng. @ UCO · 4th sem"],
  ["Status", "Building NanoClaw + Segundo Cerebro"],
  ["Core.Lang", "Python · TypeScript · JS · C#"],
  ["Core.Frontend", "React · Tailwind · Vite"],
  ["Core.Backend", "n8n · Node · Flask"],
  ["Core.Data", "Sheets API · PostgreSQL · Firebase"],
  ["Core.Infra", "Docker · Tailscale · Ubuntu"],
  ["Core.GameDev", "Unity · MediaPipe"],
  ["Grid.Web", "miportafoliocd.netlify.app"],
  ["Grid.GitHub", "jsLopez1104"],
];

export const footer = { status: "ALL SYSTEMS NOMINAL", location: "UTC-5 · ANTIOQUIA, CO" };

// Region of assets/photo.jpg to turn into the portrait, as fractions of the
// image size, tight on the face. "positive" = bright skin becomes dense dots;
// with this photo the auto-detected "negative" (for light backgrounds) turned
// the face into a dark hole, because skin and the beige wall invert to the
// same density.
export const portrait = { crop: { x: 0.25, y: 0.1, w: 0.5, h: 0.48 }, tone: "positive" };

// simple-icons export names. C# has no icon in simple-icons (trademark), so
// .NET stands in for it.
export const stack = [
  ["siPython", "Python"],
  ["siTypescript", "TypeScript"],
  ["siJavascript", "JavaScript"],
  ["siReact", "React"],
  ["siDotnet", "C# / .NET"],
  ["siNodedotjs", "Node.js"],
  ["siN8n", "n8n"],
  ["siFlask", "Flask"],
  ["siDocker", "Docker"],
  ["siTailscale", "Tailscale"],
  ["siUbuntu", "Ubuntu"],
  ["siNextcloud", "Nextcloud"],
  ["siPostgresql", "PostgreSQL"],
  ["siGooglesheets", "Google Sheets"],
  ["siFirebase", "Firebase"],
  ["siTailwindcss", "Tailwind CSS"],
  ["siVite", "Vite"],
  ["siNetlify", "Netlify"],
  ["siUnity", "Unity"],
  ["siGit", "Git"],
];

// Self-assessed, 0–100.
export const skills = [
  ["Automation", 85],
  ["Frontend", 75],
  ["Infra", 75],
  ["Applied AI", 65],
  ["Backend", 60],
  ["Game Dev", 55],
];

export const numbers = [
  ["3", "client projects shipped"],
  ["99", "avg Lighthouse score"],
  ["3", "self-hosted servers"],
  ["$0", "monthly cloud bill"],
];

export const badges = [
  { id: "linkedin", label: "LINKEDIN", filled: true },
  { id: "portfolio", label: "PORTFOLIO", filled: false },
];
