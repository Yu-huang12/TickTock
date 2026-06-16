// Captures App Store / Play Store screenshots.
// Default: 1290x2796 (iPhone 6.7"). Override with env vars, e.g. the 6.5" set:
//   SHOT_W=428 SHOT_H=926 SHOT_DIR=screenshots-6.5 node scripts/screenshots.mjs
// Requires the dev server running at http://localhost:5173.

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const VW = Number(process.env.SHOT_W) || 430;
const VH = Number(process.env.SHOT_H) || 932;
const SCALE = Number(process.env.SHOT_SCALE) || 3;
const outDir = join(root, "assets", process.env.SHOT_DIR || "screenshots");
mkdirSync(outDir, { recursive: true });

const BASE = "http://localhost:5173";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: VW, height: VH },
  deviceScaleFactor: SCALE,
});
// Hide scrollbars so they never appear in captures.
await context.addInitScript(() => {
  const css = "::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}";
  window.addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  });
});

const page = await context.newPage();
const shot = (name) => page.screenshot({ path: join(outDir, `${name}.png`) });
const settle = (ms = 900) => page.waitForTimeout(ms);

// 1. Solo — idle hero
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await settle();
await shot("01-solo");

// 2. Solo — result state (time the stop to land a strong tier for marketing)
const targetSec = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll("p, span"));
  for (const n of nodes) {
    const t = (n.textContent || "").trim();
    const m = t.match(/^(\d(?:\.\d)?)$/);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= 9.9) return Number(m[1]);
  }
  return 2;
});
await page.getByRole("button", { name: /start/i }).first().click();
await page.waitForTimeout(Math.max(200, targetSec * 1000 - 70));
await page.getByRole("button", { name: /stop/i }).first().click();
await settle(700);
await shot("02-solo-result");

// 3. Online — create / join
await page.goto(`${BASE}/online`, { waitUntil: "networkidle" });
await settle();
await shot("03-online");

// 4. Room lobby — create a live room to show the code, QR, and roster
try {
  await page.getByRole("button", { name: /create room/i }).click();
  await page.waitForURL(/\/room\//, { timeout: 8000 });
  await settle(1500);
  await shot("04-room-lobby");
} catch (e) {
  console.warn("Room lobby capture skipped:", e.message);
}

// 5. How to Play — scoring tiers
await page.goto(`${BASE}/how-to-play`, { waitUntil: "networkidle" });
await settle();
await shot("05-how-to-play");

// 6. Pass & Play — setup
await page.goto(`${BASE}/multiplayer`, { waitUntil: "networkidle" });
await settle();
await shot("06-pass-and-play");

await browser.close();
console.log(`Screenshots written to ${outDir} (${VW * SCALE}x${VH * SCALE}).`);
