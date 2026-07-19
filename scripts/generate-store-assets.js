/**
 * Generate Google Play Store listing graphics from the Yaqeen brand assets.
 * Outputs to assets/store/. Run: node scripts/generate-store-assets.js
 *
 *   • icon-512.png            512×512  — Play "App icon"
 *   • feature-graphic.png    1024×500  — Play "Feature graphic"
 *   • screenshots/*.png      1080×1920 — Play-compliant 9:16 frames, built
 *                            from any images dropped in screenshots-raw/
 *                            (fixes the "too tall / max 2:1 ratio" rejection
 *                             modern tall phone screenshots hit).
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "assets", "store");
const RAW = path.join(OUT, "screenshots-raw");
const SHOTS = path.join(OUT, "screenshots");
const SVG = path.join(ROOT, "assets", "logo", "yaqeen.svg");

const EMERALD = { r: 21, g: 128, b: 61, alpha: 1 }; // #15803D
const DARK = { r: 10, g: 19, b: 10, alpha: 1 }; // #0A130A
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const svgRaw = fs.readFileSync(SVG, "utf8");
const whiteLogo = () => svgRaw.replace(/#159e2f/gi, "#FFFFFF");

async function logoPng(heightPx) {
  return sharp(Buffer.from(whiteLogo()), { density: 600 })
    .resize({ height: heightPx, fit: "contain", background: CLEAR })
    .png()
    .toBuffer();
}

// Subtle mosque skyline band (same silhouette as the in-app hero).
function mosqueBand() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="230" viewBox="0 0 320 80" preserveAspectRatio="xMidYMax meet">
  <g fill="#FFFFFF" opacity="0.10">
    <rect x="0" y="66" width="320" height="14"/>
    <rect x="30" y="22" width="7" height="44" rx="3"/><path d="M27 24 q6.5 -13 12 0 z"/><rect x="32.5" y="8" width="2" height="12"/>
    <rect x="283" y="22" width="7" height="44" rx="3"/><path d="M280 24 q6.5 -13 12 0 z"/><rect x="285.5" y="8" width="2" height="12"/>
    <path d="M82 66 C82 47 93 41 104 41 C115 41 126 47 126 66 Z"/><rect x="103" y="31" width="2" height="11"/>
    <path d="M194 66 C194 47 205 41 216 41 C227 41 238 47 238 66 Z"/><rect x="215" y="31" width="2" height="11"/>
    <path d="M132 66 C132 41 139 22 160 22 C181 22 188 41 188 66 Z"/><rect x="150" y="60" width="20" height="6"/><rect x="159" y="6" width="2" height="18"/>
  </g>
</svg>`;
}

async function icon512() {
  const glyph = await logoPng(285);
  await sharp({ create: { width: 512, height: 512, channels: 4, background: EMERALD } })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, "icon-512.png"));
}

async function featureGraphic() {
  const W = 1024;
  const H = 500;
  const glyph = await logoPng(240);
  const text = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <text x="470" y="238" font-family="Arial, Helvetica, sans-serif" font-size="104" font-weight="800" fill="#FFFFFF" letter-spacing="1">Yaqeen</text>
  <text x="474" y="292" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#DCEDE2">Shia Prayer Companion</text>
  <rect x="474" y="316" width="300" height="4" rx="2" fill="#FFFFFF" opacity="0.45"/>
</svg>`;
  await sharp({ create: { width: W, height: H, channels: 4, background: EMERALD } })
    .composite([
      { input: Buffer.from(mosqueBand()), gravity: "south" },
      { input: glyph, top: Math.round((H - 240) / 2), left: 150 },
      { input: Buffer.from(text), top: 0, left: 0 },
    ])
    .png()
    .toFile(path.join(OUT, "feature-graphic.png"));
}

// Pad any raw screenshots to a compliant 1080×1920 (9:16) on the app's dark
// background — turns tall phone captures (which exceed Play's 2:1 limit) into
// accepted store screenshots.
async function screenshots() {
  const files = fs
    .readdirSync(RAW)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort();
  if (files.length === 0) return 0;
  let i = 0;
  for (const f of files) {
    i += 1;
    const inner = await sharp(path.join(RAW, f))
      .resize(1000, 1780, { fit: "inside", withoutEnlargement: false })
      .toBuffer();
    await sharp({ create: { width: 1080, height: 1920, channels: 4, background: DARK } })
      .composite([{ input: inner, gravity: "center" }])
      .png()
      .toFile(path.join(SHOTS, `${String(i).padStart(2, "0")}.png`));
  }
  return files.length;
}

async function main() {
  await icon512();
  await featureGraphic();
  const n = await screenshots();
  console.log("✓ assets/store/icon-512.png        (Play app icon)");
  console.log("✓ assets/store/feature-graphic.png (1024×500 feature graphic)");
  console.log(
    n > 0
      ? `✓ assets/store/screenshots/*.png    (${n} framed from screenshots-raw/)`
      : "· screenshots: drop captures in assets/store/screenshots-raw/ then re-run",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
