import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

/**
 * A stylized mosque skyline (domes + minarets) drawn as a silhouette.
 * Used as a subtle decoration inside the green prayer-times hero.
 */
export function MosqueSilhouette({
  color = "#FFFFFF",
  opacity = 0.16,
  height = 72,
}: {
  color?: string;
  opacity?: number;
  height?: number;
}) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 320 80"
      preserveAspectRatio="xMidYMax slice"
      opacity={opacity}
    >
      {/* ground / courtyard wall */}
      <Rect x="0" y="66" width="320" height="14" fill={color} />

      {/* left minaret */}
      <Rect x="30" y="22" width="7" height="44" rx="3" fill={color} />
      <Path d="M27 24 q6.5 -13 12 0 z" fill={color} />
      <Rect x="32.5" y="8" width="2" height="12" fill={color} />

      {/* right minaret */}
      <Rect x="283" y="22" width="7" height="44" rx="3" fill={color} />
      <Path d="M280 24 q6.5 -13 12 0 z" fill={color} />
      <Rect x="285.5" y="8" width="2" height="12" fill={color} />

      {/* left small dome */}
      <Path d="M82 66 C82 47 93 41 104 41 C115 41 126 47 126 66 Z" fill={color} />
      <Rect x="103" y="31" width="2" height="11" fill={color} />

      {/* right small dome */}
      <Path d="M194 66 C194 47 205 41 216 41 C227 41 238 47 238 66 Z" fill={color} />
      <Rect x="215" y="31" width="2" height="11" fill={color} />

      {/* central onion dome */}
      <Path d="M132 66 C132 41 139 22 160 22 C181 22 188 41 188 66 Z" fill={color} />
      <Rect x="150" y="60" width="20" height="6" fill={color} />
      <Rect x="159" y="6" width="2" height="18" fill={color} />
    </Svg>
  );
}
