/**
 * Recolor your brand logo to the app's green and generate icon + splash assets.
 *
 * Usage:
 *   1. Save your logo (the red calligraphy on black) to:
 *        assets/images/logo-source.png   (square PNG, ideally 1024×1024+)
 *   2. npm i -D sharp
 *   3. node scripts/recolor-logo.js
 *
 * How it works: the logo is a single-color glyph on a dark background, so we
 * use its luminance as an alpha mask and paint it with the brand green. Black
 * background -> transparent, bright glyph -> solid green. Tweak THRESHOLD/GREEN
 * below if your source has different contrast.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMAGES = path.join(__dirname, "..", "assets", "images");
const SOURCE = path.join(IMAGES, "logo-source.png");

const GREEN = { r: 46, g: 204, b: 113 }; // #2ECC71
const BG = { r: 10, g: 19, b: 10, alpha: 1 }; // #0A130A

async function greenGlyph(size) {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(
      `Missing ${SOURCE}\nSave your logo there first (square PNG), then re-run.`,
    );
  }

  // 1) luminance mask of the logo, resized to `size`
  const meta = { width: size, height: size };
  const alpha = await sharp(SOURCE)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
    .removeAlpha()
    .grayscale()
    .normalise()
    .linear(1.2, 0) // boost contrast a touch
    .extractChannel(0)
    .raw()
    .toBuffer();

  // 2) solid green canvas + the mask as its alpha channel
  return sharp({
    create: { width: meta.width, height: meta.height, channels: 3, background: GREEN },
  })
    .joinChannel(alpha, { raw: { width: meta.width, height: meta.height, channels: 1 } })
    .png()
    .toBuffer();
}

async function main() {
  // app icon: green glyph (80% scale) centered on dark-green background
  const glyph1024 = await greenGlyph(Math.round(1024 * 0.8));
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BG },
  })
    .composite([{ input: glyph1024, gravity: "center" }])
    .png()
    .toFile(path.join(IMAGES, "icon.png"));

  // splash: transparent green glyph (app.json paints the dark bg)
  await sharp(await greenGlyph(512))
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(IMAGES, "splash-icon.png"));

  // android adaptive foreground: glyph in the 66% safe zone, transparent
  const fg = await greenGlyph(Math.round(1024 * 0.62));
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: fg, gravity: "center" }])
    .png()
    .toFile(path.join(IMAGES, "android-icon-foreground.png"));

  // favicon
  await sharp(await greenGlyph(48)).png().toFile(path.join(IMAGES, "favicon.png"));

  console.log("✓ Generated icon.png, splash-icon.png, android-icon-foreground.png, favicon.png");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
