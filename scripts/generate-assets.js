/**
 * Generates Islamic-themed app icons and splash screen assets.
 * Run: node scripts/generate-assets.js
 * Requires: sharp  (installed as devDependency)
 */
const sharp = require("sharp");
const path = require("path");

const OUT = path.join(__dirname, "..", "assets", "images");

// ── helpers ──────────────────────────────────────────────────────────────────

/** 5-pointed star polygon points string, centred at (cx, cy) */
function star(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    pts.push(
      `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`,
    );
  }
  return pts.join(" ");
}

/** Ring of small dots, returns SVG string */
function ringDots(cx, cy, r, n, color, opacity, dotR) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n - Math.PI / 2;
    const x = (cx + r * Math.cos(a)).toFixed(1);
    const y = (cy + r * Math.sin(a)).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${dotR}" fill="${color}" opacity="${opacity}"/>`;
  }).join("");
}

// ── SVG definitions ───────────────────────────────────────────────────────────

/**
 * Full icon (opaque background, 1024×1024)
 * Design: dark forest-green bg · outer ring with 12 emerald dots ·
 *         crescent moon + 5-pointed star in emerald gradient
 */
const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="55%" r="80%">
      <stop offset="0%" stop-color="#1A2E1A"/>
      <stop offset="100%" stop-color="#0A130A"/>
    </radialGradient>
    <linearGradient id="gr" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#7EEAA8"/>
      <stop offset="100%" stop-color="#1A9E50"/>
    </linearGradient>
    <mask id="cm">
      <rect width="1024" height="1024" fill="black"/>
      <circle cx="450" cy="512" r="242" fill="white"/>
      <circle cx="560" cy="448" r="205" fill="black"/>
    </mask>
  </defs>

  <!-- Background -->
  <rect width="1024" height="1024" fill="url(#bg)"/>

  <!-- Decorative outer ring -->
  <circle cx="512" cy="512" r="458" fill="none" stroke="#243424" stroke-width="1.5"/>
  ${ringDots(512, 512, 458, 16, "#2ECC71", 0.28, 4.5)}

  <!-- Subtle inner haze -->
  <circle cx="512" cy="512" r="445" fill="#0B160B" opacity="0.45"/>

  <!-- Crescent moon -->
  <circle cx="450" cy="512" r="242" mask="url(#cm)" fill="url(#gr)"/>

  <!-- 5-pointed star (between the horns, slightly upper-right) -->
  <polygon points="${star(692, 352, 86, 34)}" fill="url(#gr)"/>
</svg>`;

/**
 * Splash icon (transparent BG, 512×512)
 * Will be composited over the solid splash background colour in app.json.
 */
const splashSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gr" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#7EEAA8"/>
      <stop offset="100%" stop-color="#1A9E50"/>
    </linearGradient>
    <mask id="cm">
      <rect width="512" height="512" fill="black"/>
      <circle cx="225" cy="256" r="121" fill="white"/>
      <circle cx="280" cy="224" r="102" fill="black"/>
    </mask>
  </defs>
  <circle cx="225" cy="256" r="121" mask="url(#cm)" fill="url(#gr)"/>
  <polygon points="${star(346, 176, 43, 17)}" fill="url(#gr)"/>
</svg>`;

/**
 * Android adaptive icon – foreground layer (transparent BG, 1024×1024)
 * Keep content inside central 66 % safe zone (~676 px).
 */
const androidFgSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="gr" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="#7EEAA8"/>
      <stop offset="100%" stop-color="#1A9E50"/>
    </linearGradient>
    <mask id="cm">
      <rect width="1024" height="1024" fill="black"/>
      <circle cx="450" cy="512" r="200" fill="white"/>
      <circle cx="548" cy="456" r="169" fill="black"/>
    </mask>
  </defs>
  <circle cx="450" cy="512" r="200" mask="url(#cm)" fill="url(#gr)"/>
  <polygon points="${star(683, 372, 70, 28)}" fill="url(#gr)"/>
</svg>`;

/**
 * Android adaptive icon – background layer (1024×1024)
 */
const androidBgSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <radialGradient id="bg" cx="50%" cy="55%" r="80%">
      <stop offset="0%" stop-color="#1A2E1A"/>
      <stop offset="100%" stop-color="#0A130A"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;

/**
 * Android monochrome icon – white silhouette on transparent (1024×1024)
 * Used for themed / notification icons on Android 13+.
 */
const monoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <mask id="cm">
      <rect width="1024" height="1024" fill="black"/>
      <circle cx="450" cy="512" r="200" fill="white"/>
      <circle cx="548" cy="456" r="169" fill="black"/>
    </mask>
  </defs>
  <circle cx="450" cy="512" r="200" mask="url(#cm)" fill="white"/>
  <polygon points="${star(683, 372, 70, 28)}" fill="white"/>
</svg>`;

/**
 * Web favicon (48×48)
 */
const faviconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <defs>
    <radialGradient id="bg" cx="50%" cy="55%" r="80%">
      <stop offset="0%" stop-color="#1A2E1A"/>
      <stop offset="100%" stop-color="#0A130A"/>
    </radialGradient>
    <linearGradient id="gr" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7EEAA8"/>
      <stop offset="100%" stop-color="#2ECC71"/>
    </linearGradient>
    <mask id="cm">
      <rect width="48" height="48" fill="black"/>
      <circle cx="21" cy="24" r="11" fill="white"/>
      <circle cx="26.3" cy="21" r="9.3" fill="black"/>
    </mask>
  </defs>
  <rect width="48" height="48" fill="url(#bg)" rx="8"/>
  <circle cx="21" cy="24" r="11" mask="url(#cm)" fill="url(#gr)"/>
  <polygon points="${star(32.5, 16.5, 4, 1.6)}" fill="url(#gr)"/>
</svg>`;

// ── render ────────────────────────────────────────────────────────────────────

const ASSETS = [
  { svg: iconSvg, file: "icon.png", w: 1024, h: 1024 },
  { svg: splashSvg, file: "splash-icon.png", w: 512, h: 512 },
  { svg: androidFgSvg, file: "android-icon-foreground.png", w: 1024, h: 1024 },
  { svg: androidBgSvg, file: "android-icon-background.png", w: 1024, h: 1024 },
  { svg: monoSvg, file: "android-icon-monochrome.png", w: 1024, h: 1024 },
  { svg: faviconSvg, file: "favicon.png", w: 48, h: 48 },
];

(async () => {
  console.log("Generating Islamic-themed assets…\n");
  for (const { svg, file, w, h } of ASSETS) {
    await sharp(Buffer.from(svg))
      .resize(w, h)
      .png({ compressionLevel: 9 })
      .toFile(`${OUT}/${file}`);
    console.log(`  ✓  ${file}  (${w}×${h})`);
  }
  console.log("\nDone. Assets saved to assets/images/");
})().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
