// Generates app icon + splash assets and writes them straight into the Android
// project (no @capacitor/assets — its bundled sharp can't build on Windows ARM64).
// Run with: node scripts/generate-assets.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = join(root, "assets");
const res = join(root, "android", "app", "src", "main", "res");
mkdirSync(assets, { recursive: true });

const BG = "#0b0b14";

const gradient = `
  <linearGradient id="brand" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ec4899"/>
    <stop offset="0.5" stop-color="#a855f7"/>
    <stop offset="1" stop-color="#06b6d4"/>
  </linearGradient>`;

// Stopwatch glyph centred on the origin.
const glyph = (c) => `
  <g stroke="${c}" fill="${c}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="-57" y="-345" width="114" height="92" rx="30"/>
    <rect x="-26" y="-287" width="52" height="84" rx="18"/>
    <rect x="172" y="-190" width="76" height="50" rx="18" transform="rotate(45 210 -165)"/>
    <circle cx="0" cy="40" r="250" fill="none" stroke-width="48"/>
    <path d="M0 40 V -170" fill="none" stroke-width="34"/>
    <path d="M0 40 L 156 -42" fill="none" stroke-width="34"/>
    <circle cx="0" cy="40" r="28" stroke="none"/>
  </g>`;

const svgDoc = (w, h, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;

const iconOnly = svgDoc(
  1024,
  1024,
  `<defs>${gradient}</defs><rect width="1024" height="1024" fill="url(#brand)"/>` +
    `<g transform="translate(512 528) scale(1.04)">${glyph("#ffffff")}</g>`
);
const iconBackground = svgDoc(
  1024,
  1024,
  `<defs>${gradient}</defs><rect width="1024" height="1024" fill="url(#brand)"/>`
);
const iconForeground = svgDoc(
  1024,
  1024,
  `<g transform="translate(512 524) scale(0.9)">${glyph("#ffffff")}</g>`
);
const logoTight = svgDoc(
  1024,
  1024,
  `<g transform="translate(512 524) scale(1.5)">${glyph("#ffffff")}</g>`
);
const splash = svgDoc(
  2732,
  2732,
  `<defs><radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0" stop-color="#a855f7" stop-opacity="0.35"/>` +
    `<stop offset="1" stop-color="#a855f7" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="2732" height="2732" fill="${BG}"/>` +
    `<circle cx="1366" cy="1366" r="900" fill="url(#glow)"/>` +
    `<g transform="translate(1366 1386) scale(1.3)">${glyph("#ffffff")}</g>`
);

// Keep editable vector sources + 1x PNGs (handy for future iOS asset generation).
for (const [name, svg, size] of [
  ["icon-only", iconOnly, 1024],
  ["icon-background", iconBackground, 1024],
  ["icon-foreground", iconForeground, 1024],
  ["splash", splash, 2732],
  ["splash-dark", splash, 2732],
]) {
  writeFileSync(join(assets, `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(assets, `${name}.png`));
}

const render = (svg, w, h = w) =>
  sharp(Buffer.from(svg)).resize(w, h, { fit: "fill" }).png().toBuffer();

// ── Store assets ──────────────────────────────────────────────────────────
// Apple requires a 1024x1024 icon with NO alpha channel (flatten onto the bg).
await sharp(Buffer.from(iconOnly))
  .resize(1024, 1024)
  .flatten({ background: "#0b0b14" })
  .png()
  .toFile(join(assets, "icon-appstore-1024.png"));

// Google Play feature graphic: 1024x500 banner with logo + wordmark.
const feature = svgDoc(
  1024,
  500,
  `<defs>${gradient}</defs>` +
    `<rect width="1024" height="500" fill="#0b0b14"/>` +
    `<rect width="1024" height="500" fill="url(#brand)" opacity="0.18"/>` +
    `<g transform="translate(250 250) scale(0.62)">${glyph("#ffffff")}</g>` +
    `<text x="470" y="232" font-family="Segoe UI, Arial, sans-serif" font-size="86" font-weight="800" fill="#ffffff">Tick Tock</text>` +
    `<text x="470" y="318" font-family="Segoe UI, Arial, sans-serif" font-size="86" font-weight="800" fill="#ffffff">Challenge</text>` +
    `<text x="472" y="372" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#c4b5fd">Test your inner clock</text>`
);
writeFileSync(join(assets, "feature-graphic.svg"), feature);
await sharp(Buffer.from(feature)).resize(1024, 500).png().toFile(join(assets, "feature-graphic.png"));

const circleMask = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`;

// ── Android launcher icons ────────────────────────────────────────────────
const iconDensities = [
  ["mdpi", 108, 48],
  ["hdpi", 162, 72],
  ["xhdpi", 216, 96],
  ["xxhdpi", 324, 144],
  ["xxxhdpi", 432, 192],
];

for (const [d, adaptive, legacy] of iconDensities) {
  const dir = join(res, `mipmap-${d}`);
  mkdirSync(dir, { recursive: true });

  await sharp(await render(iconForeground, adaptive)).toFile(join(dir, "ic_launcher_foreground.png"));
  await sharp(await render(iconBackground, adaptive)).toFile(join(dir, "ic_launcher_bg.png"));

  const square = await render(iconOnly, legacy);
  await sharp(square).toFile(join(dir, "ic_launcher.png"));
  await sharp(square)
    .composite([{ input: Buffer.from(circleMask(legacy)), blend: "dest-in" }])
    .png()
    .toFile(join(dir, "ic_launcher_round.png"));
}

// ── Android splash screens (dark canvas + centred logo) ───────────────────
const splashSizes = [
  ["drawable", 480, 320],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
];

for (const [d, w, h] of splashSizes) {
  const dir = join(res, d);
  mkdirSync(dir, { recursive: true });
  const logoSize = Math.round(Math.min(w, h) * 0.42);
  const logo = await render(logoTight, logoSize);
  await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 11, g: 11, b: 20, alpha: 1 } },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(join(dir, "splash.png"));
}

// ── iOS app icon + splash (single-size asset catalog) ─────────────────────
// Capacitor's iOS catalog uses one 1024×1024 icon (no alpha) and a 2732×2732
// splash. Only write these when the iOS platform has been added.
const iosIconDir = join(root, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
const iosSplashDir = join(root, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");
if (existsSync(iosIconDir)) {
  // App Store / device icon must be opaque (flatten onto the brand background).
  await sharp(Buffer.from(iconOnly))
    .resize(1024, 1024)
    .flatten({ background: BG })
    .png()
    .toFile(join(iosIconDir, "AppIcon-512@2x.png"));
}
if (existsSync(iosSplashDir)) {
  const iosSplash = await sharp(Buffer.from(splash)).resize(2732, 2732).png().toBuffer();
  for (const name of [
    "splash-2732x2732.png",
    "splash-2732x2732-1.png",
    "splash-2732x2732-2.png",
  ]) {
    await sharp(iosSplash).toFile(join(iosSplashDir, name));
  }
}

console.log("Generated app icons + splash for Android, and source assets in /assets.");
