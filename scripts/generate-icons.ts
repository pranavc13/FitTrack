/** Renders the app icon SVG to the PNG sizes required by Android, iOS and the web manifest. */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const out = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(out, { recursive: true });

// Lime flame-in-ring mark on near-black, matching the app theme.
const mark = (pad: number) => `
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <circle cx="256" cy="256" r="178" fill="none" stroke="#B6F34A" stroke-width="30" stroke-linecap="round" stroke-dasharray="840 280" transform="rotate(130 256 256)"/>
    <path d="M262 132c18 46-12 66-12 96 0 18 14 30 30 30 22 0 34-22 28-50 34 26 50 62 50 96 0 58-46 100-102 100s-102-42-102-100c0-60 46-98 74-126 14-14 30-30 34-46z" fill="#B6F34A"/>
    <path d="M256 312c-16 14-26 28-26 44 0 18 12 30 26 30s26-12 26-30c0-16-10-30-26-44z" fill="#090B0A"/>
  </g>`;
const svg = (pad: number, rounded: boolean) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="#090B0A"/>
  <radialGradient id="g" cx="30%" cy="20%" r="80%"><stop offset="0" stop-color="#B6F34A" stop-opacity=".18"/><stop offset="1" stop-color="#B6F34A" stop-opacity="0"/></radialGradient>
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ""} fill="url(#g)"/>
  ${mark(pad)}
</svg>`;

const glyph = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="#141815"/><g fill="none" stroke="#B6F34A" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

const jobs: [string, string, number][] = [
  ["icon.svg", svg(40, true), 0],
  ["icon-192.png", svg(40, true), 192],
  ["icon-512.png", svg(40, true), 512],
  ["maskable-512.png", svg(110, false), 512], // safe zone for Android adaptive icons
  ["apple-touch-icon.png", svg(60, false), 180],
  ["badge-96.png", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${mark(60).replace(/#B6F34A/g, "#FFFFFF").replace(/#090B0A/g, "#000000")}</svg>`, 96],
  ["shortcut-scan.png", glyph('<path d="M28 36v-6a4 4 0 0 1 4-4h6M58 26h6a4 4 0 0 1 4 4v6M68 60v6a4 4 0 0 1-4 4h-6M38 70h-6a4 4 0 0 1-4-4v-6"/><circle cx="48" cy="48" r="10"/>'), 96],
  ["shortcut-food.png", glyph('<path d="M30 26v20a8 8 0 0 0 16 0V26M38 26v44M60 70V26c8 4 12 14 12 24h-12"/>'), 96],
  ["shortcut-activity.png", glyph('<path d="M22 50h12l6-16 10 30 8-20 4 6h12"/>'), 96],
  ["shortcut-coach.png", glyph('<path d="M48 22l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/><path d="M68 62l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>'), 96],
];

for (const [name, content, size] of jobs) {
  const file = path.join(out, name);
  if (name.endsWith(".svg")) fs.writeFileSync(file, content);
  else await sharp(Buffer.from(content)).resize(size, size).png().toFile(file);
  console.log("✓", name);
}
