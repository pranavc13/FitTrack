/**
 * Mobile UI smoke test: signs in, opens every screen at a phone viewport in headless Chrome, and
 * reports console errors, uncaught exceptions, failed API calls and horizontal overflow.
 * Usage: npx tsx scripts/ui-smoke.ts [baseUrl] [screenshotDir]
 * Env: SMOKE_EMAIL, SMOKE_PASSWORD (account must exist and be onboarded), CHROME_PATH
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? path.join(process.cwd(), ".data", "screenshots");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PAGES = ["/home", "/food", "/food/recipes", "/food/recipes/new", "/food/insights", "/food/restaurant", "/food/plan", "/scan", "/activity", "/activity/workout", "/activity/exercises", "/activity/timer", "/activity/import", "/goals", "/progress", "/coach", "/wellness", "/profile", "/analytics"];

fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const problems: string[] = [];
let current = "";
page.on("console", (m) => m.type() === "error" && !/favicon|Download the React DevTools/.test(m.text()) && problems.push(`${current} console: ${m.text().slice(0, 200)}`));
page.on("pageerror", (e) => problems.push(`${current} exception: ${(e as Error).message.slice(0, 200)}`));
page.on("response", (r) => r.url().includes("/api/") && r.status() >= 500 && problems.push(`${current} API ${r.status()} ${new URL(r.url()).pathname}`));

current = "/login";
await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
await page.type('input[name="email"]', process.env.SMOKE_EMAIL ?? "smoke@test.dev");
await page.type('input[name="password"]', process.env.SMOKE_PASSWORD ?? "supersecret1");
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);

for (const p of PAGES) {
  current = p;
  await page.goto(BASE + p, { waitUntil: "networkidle0", timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 600));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) problems.push(`${p} horizontal overflow ${overflow}px`);
  const file = path.join(OUT, `${p.replace(/\//g, "_").replace(/^_/, "") || "root"}.png`) as `${string}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(`✓ ${p}`);
}
await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join("\n- ")}` : "\nNo client errors, failed API calls or overflow detected.");
process.exit(problems.length ? 1 : 0);
