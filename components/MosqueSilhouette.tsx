import React from "react";
import Svg, { G, Path, Polygon, Rect } from "react-native-svg";

/**
 * A mosque skyline drawn as a layered night silhouette, used as the
 * decoration inside the emerald next-prayer hero on the prayer-times page.
 *
 * Everything is one colour; depth comes from per-layer opacity (distant
 * buildings faint, the main mosque solid, windows and arches brightest so
 * they read as lit from inside). The root `opacity` keeps the whole thing
 * subtle over the hero text.
 *
 * viewBox is 400×100 with the ground on the bottom edge; `slice` keeps the
 * central dome centred and crops the far edges on narrow screens.
 */

// 4-point star, as a polygon points string
function star(cx: number, cy: number, r: number): string {
  const i = r * 0.32;
  return [
    [cx, cy - r],
    [cx + i, cy - i],
    [cx + r, cy],
    [cx + i, cy + i],
    [cx, cy + r],
    [cx - i, cy + i],
    [cx - r, cy],
    [cx - i, cy - i],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
}

// small pointed (ogee-ish) arch: base y, apex at y - h
function arch(cx: number, base: number, w: number, h: number): string {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const s = base - h * 0.55; // where the straight jambs end
  return `M${l} ${base} L${l} ${s} C${l} ${s - h * 0.28} ${cx - w * 0.22} ${
    base - h * 0.88
  } ${cx} ${base - h} C${cx + w * 0.22} ${base - h * 0.88} ${r} ${s - h * 0.28} ${r} ${s} L${r} ${base} Z`;
}

// crescent open to the right, outer radius r, centred at (cx, cy)
function crescent(cx: number, cy: number, r: number): string {
  const inner = r * 1.06;
  return `M${cx} ${cy - r} A${r} ${r} 0 1 0 ${cx} ${cy + r} A${inner} ${inner} 0 0 1 ${cx} ${cy - r} Z`;
}

function Minaret({ cx, color }: { cx: number; color: string }) {
  return (
    <G fill={color}>
      {/* shaft, tapering slightly towards the top */}
      <Path d={`M${cx - 6} 100 L${cx - 6} 46 L${cx - 5} 30 L${cx + 5} 30 L${cx + 6} 46 L${cx + 6} 100 Z`} />
      {/* lower balcony + brackets */}
      <Rect x={cx - 9.5} y={62} width={19} height={3.5} rx={1} />
      <Path d={`M${cx - 9} 65.5 L${cx + 9} 65.5 L${cx + 6} 71 L${cx - 6} 71 Z`} />
      {/* upper balcony + brackets */}
      <Rect x={cx - 8.5} y={41} width={17} height={3} rx={1} />
      <Path d={`M${cx - 8} 44 L${cx + 8} 44 L${cx + 5} 49 L${cx - 5} 49 Z`} />
      {/* ring, conical cap, finial */}
      <Rect x={cx - 7.5} y={28.5} width={15} height={2.5} rx={1} />
      <Path d={`M${cx - 7} 29 L${cx} 8 L${cx + 7} 29 Z`} />
      <Rect x={cx - 0.7} y={2} width={1.4} height={7} />
      <Path d={crescent(cx + 0.6, 1.6, 1.8)} />
    </G>
  );
}

export function MosqueSilhouette({
  color = "#FFFFFF",
  opacity = 0.2,
  height = 90,
}: {
  color?: string;
  opacity?: number;
  height?: number;
}) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 400 100"
      preserveAspectRatio="xMidYMax slice"
      opacity={opacity}
    >
      {/* ── sky: crescent moon + stars ─────────────────────────────── */}
      <G fill={color}>
        <Path d={crescent(262, 18, 7)} />
        <Polygon points={star(112, 14, 2.4)} opacity={0.9} />
        <Polygon points={star(152, 27, 1.7)} opacity={0.7} />
        <Polygon points={star(240, 31, 1.5)} opacity={0.7} />
        <Polygon points={star(302, 11, 2.2)} opacity={0.9} />
        <Polygon points={star(348, 24, 1.6)} opacity={0.7} />
      </G>

      {/* ── far skyline (faint): low houses with small domes ── */}
      <G fill={color} opacity={0.45}>
        <Rect x={0} y={82} width={44} height={18} />
        <Path d="M10 82 C10 74 15 71 22 71 C29 71 34 74 34 82 Z" />
        <Rect x={21.4} y={66} width={1.2} height={6} />
        <Rect x={90} y={80} width={28} height={20} />
        <Path d="M95 80 C95 73 99 70 104 70 C109 70 113 73 113 80 Z" />
        <Rect x={103.4} y={65} width={1.2} height={5} />
        <Rect x={282} y={80} width={28} height={20} />
        <Path d="M287 80 C287 73 291 70 296 70 C301 70 305 73 305 80 Z" />
        <Rect x={295.4} y={65} width={1.2} height={5} />
        <Rect x={356} y={82} width={44} height={18} />
        <Path d="M366 82 C366 74 371 71 378 71 C385 71 390 74 390 82 Z" />
        <Rect x={377.4} y={66} width={1.2} height={6} />
      </G>

      {/* ── courtyard wall with merlons ────────────────────────────── */}
      <G fill={color} opacity={0.8}>
        <Rect x={0} y={84} width={400} height={16} />
        {Array.from({ length: 29 }, (_, i) => (
          <Rect key={i} x={i * 14 + 3} y={79} width={8} height={5.5} rx={1} />
        ))}
      </G>

      {/* ── main prayer hall ───────────────────────────────────────── */}
      <G fill={color} opacity={0.8}>
        <Rect x={120} y={60} width={160} height={40} />
        {/* cornice */}
        <Rect x={117} y={58} width={166} height={3} rx={1} />
        {/* side domes with finials */}
        <Path d="M121 60 C121 48 129 43 138 43 C147 43 155 48 155 60 Z" />
        <Rect x={137.4} y={36} width={1.2} height={7} />
        <Path d="M245 60 C245 48 253 43 262 43 C271 43 279 48 279 60 Z" />
        <Rect x={261.4} y={36} width={1.2} height={7} />
        {/* drum + central onion dome */}
        <Path d="M168 60 L170 49 L230 49 L232 60 Z" />
        <Path d="M162 60 C162 42 175 34 189 26 C195 22 199 18 200 12 C201 18 205 22 211 26 C225 34 238 42 238 60 Z" />
        <Rect x={199.3} y={3} width={1.4} height={9} />
        <Path d={crescent(200.4, 2.4, 2.6)} />
      </G>

      {/* ── lit openings: portal, windows, arcade ─────────────────── */}
      <G fill={color}>
        <Path d={arch(200, 100, 26, 32)} />
        <Path d={arch(140, 92, 10, 18)} />
        <Path d={arch(160, 92, 10, 18)} />
        <Path d={arch(240, 92, 10, 18)} />
        <Path d={arch(260, 92, 10, 18)} />
        {/* drum windows */}
        <Path d={arch(184, 58, 5, 7)} />
        <Path d={arch(200, 58, 5, 7)} />
        <Path d={arch(216, 58, 5, 7)} />
        {/* riwaq arcade along the courtyard wall */}
        {[10, 30, 50, 70, 90, 110, 290, 310, 330, 350, 370, 390].map((x) => (
          <Path key={x} d={arch(x, 100, 11, 12)} />
        ))}
      </G>

      {/* ── minarets (in front of the wall, flanking the hall) ───── */}
      <G opacity={0.85}>
        <Minaret cx={80} color={color} />
        <Minaret cx={320} color={color} />
      </G>
    </Svg>
  );
}
