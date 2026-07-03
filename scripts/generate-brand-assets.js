/**
 * Generate every app asset (icon, splash, adaptive fg/bg, monochrome, favicon)
 * from the Yaqeen brand logo at assets/logo/yaqeen.svg.
 *
 * Run: node scripts/generate-brand-assets.js   (requires devDependency: sharp)
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const IMAGES = path.join(ROOT, "assets", "images");
const SVG_PATH = path.join(ROOT, "assets", "logo", "yaqeen.svg");

const BRAND = "#159E2F"; // logo green
const ICON_BG = "#15803D"; // emerald background for icon/splash
const ICON_BG_RGBA = { r: 21, g: 128, b: 61, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const svgRaw = fs.readFileSync(SVG_PATH, "utf8");

/** Render the logo (recolored to `fill`) as a PNG buffer of the given height. */
async function logoPNG(fill, heightPx) {
  const svg = svgRaw.replace(/#159e2f/gi, fill);
  return sharp(Buffer.from(svg), { density: 600 })
    .resize({ height: heightPx, fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();
}

async function compose(fill, glyphH, canvasPx, background, file) {
  const glyph = await logoPNG(fill, glyphH);
  await sharp({
    create: { width: canvasPx, height: canvasPx, channels: 4, background },
  })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toFile(path.join(IMAGES, file));
}

async function main() {
  // App icon — white logo on emerald background.
  await compose("#FFFFFF", 560, 1024, ICON_BG_RGBA, "icon.png");

  // Splash — transparent white logo; app.json paints the emerald background.
  await compose("#FFFFFF", 520, 1024, TRANSPARENT, "splash-icon.png");

  // Android adaptive foreground — white logo, transparent (safe zone).
  await compose("#FFFFFF", 430, 1024, TRANSPARENT, "android-icon-foreground.png");

  // Android themed (monochrome) — white logo, transparent.
  await compose("#FFFFFF", 430, 1024, TRANSPARENT, "android-icon-monochrome.png");

  // Android adaptive background — solid emerald.
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: ICON_BG_RGBA },
  })
    .png()
    .toFile(path.join(IMAGES, "android-icon-background.png"));

  // Favicon — green logo on white.
  await compose(BRAND, 150, 256, { r: 255, g: 255, b: 255, alpha: 1 }, "favicon.png");

  console.log("✓ Brand assets generated from yaqeen.svg");
  console.log(`  icon/splash bg ${ICON_BG} · logo white · favicon ${BRAND} on white`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
