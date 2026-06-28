/**
 * Generates the full app asset set (icon, splash, adaptive foreground,
 * monochrome, favicon) from a green-themed interpretation of the brand logo:
 * three stacked calligraphic bars with diamond accents and a teardrop counter.
 *
 * Run: node scripts/generate-logo-assets.js   (requires devDependency: sharp)
 *
 * For a pixel-exact version of the original logo instead, save it to
 * assets/images/logo-source.png and run scripts/recolor-logo.js.
 */
const path = require("path");
const sharp = require("sharp");

const OUT = path.join(__dirname, "..", "assets", "images");

const GREEN = "#2ECC71";
const GREEN_DARK = "#1E9E55";
const BG = "#0A130A";
const BG_RGBA = { r: 10, g: 19, b: 10, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

/** Rotated-square (diamond) polygon centered at (cx,cy) with radius s. */
function diamond(cx, cy, s) {
  return `<polygon points="${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}" />`;
}

/**
 * Glyph rendered into a 1024 transparent canvas, centered, ~820px tall.
 * `fill` is either a solid color string or "gradient".
 */
function glyphSVG(fill) {
  const paint = fill === "gradient" ? "url(#g)" : fill;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GREEN}"/>
      <stop offset="1" stop-color="${GREEN_DARK}"/>
    </linearGradient>
    <mask id="m">
      <g fill="#fff">
        <!-- three stacked calligraphic bars -->
        <rect x="277" y="248" width="470" height="104" rx="52"/>
        <rect x="250" y="418" width="524" height="104" rx="52"/>
        <rect x="265" y="588" width="494" height="104" rx="52"/>
        <!-- diamond accents (diacritics) -->
        ${diamond(792, 250, 30)}
        ${diamond(848, 300, 19)}
        ${diamond(792, 690, 28)}
        ${diamond(848, 736, 18)}
      </g>
      <!-- teardrop counter punched out of the middle bar -->
      <g fill="#000">
        <path d="M372 432 C406 446 406 494 372 508 C338 494 338 446 372 432 Z"/>
      </g>
    </mask>
  </defs>
  <rect width="1024" height="1024" fill="${paint}" mask="url(#m)"/>
</svg>`;
}

/** Subtle dark-green adaptive-icon background (1024) with a faint dot ring. */
function backgroundSVG() {
  const dots = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 24 - Math.PI / 2;
    const x = (512 + 420 * Math.cos(a)).toFixed(1);
    const y = (512 + 420 * Math.sin(a)).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="6" fill="${GREEN}" opacity="0.12"/>`;
  }).join("");
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="#13241A"/>
      <stop offset="1" stop-color="${BG}"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  ${dots}
</svg>`;
}

async function glyphPNG(fill, sizePx) {
  // render the 1024 glyph then scale to the requested glyph size
  const base = await sharp(Buffer.from(glyphSVG(fill))).png().toBuffer();
  return sharp(base).resize(sizePx, sizePx, { fit: "contain", background: TRANSPARENT }).png().toBuffer();
}

/** Place a glyph of `glyphPx` centered on a `canvasPx` canvas with given bg. */
async function compose(fill, glyphPx, canvasPx, background, file) {
  const glyph = await glyphPNG(fill, glyphPx);
  await sharp({
    create: { width: canvasPx, height: canvasPx, channels: 4, background },
  })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toFile(path.join(OUT, file));
}

async function main() {
  // App icon — gradient glyph (~80%) on dark-green background.
  await compose("gradient", 820, 1024, BG_RGBA, "icon.png");

  // Splash — transparent gradient glyph (~70%); app.json paints the dark bg.
  await compose("gradient", 720, 1024, TRANSPARENT, "splash-icon.png");

  // Android adaptive foreground — glyph in the ~62% safe zone, transparent.
  await compose("gradient", 635, 1024, TRANSPARENT, "android-icon-foreground.png");

  // Android themed (monochrome) — white glyph, transparent.
  await compose("#ffffff", 635, 1024, TRANSPARENT, "android-icon-monochrome.png");

  // Favicon — small icon with background.
  await compose("gradient", 200, 256, BG_RGBA, "favicon.png");

  // Android adaptive background — subtle dark-green texture.
  await sharp(Buffer.from(backgroundSVG())).png().toFile(path.join(OUT, "android-icon-background.png"));

  console.log("✓ Wrote icon.png, splash-icon.png, android-icon-foreground.png, android-icon-monochrome.png, favicon.png, android-icon-background.png");
  console.log(`  background ${BG} · glyph ${GREEN}→${GREEN_DARK}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
