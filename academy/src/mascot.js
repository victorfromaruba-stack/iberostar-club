// Shoco, Aruba's burrowing owl. Moods: idle, happy, sad, cheer, think.
// Drawn from photos of the real bird: a wide, flat-topped head that sits right on the shoulders,
// a pale heart-shaped face, big yellow eyes, white brows that meet in a V above the beak,
// a white chin, fine speckles on the crown, a barred chest and long pale legs.
// One style: flat shapes and a few curves, colors from the --m-* tokens.
function shoco(mood = "idle", cls = "") {
  const dots = (pts, r) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("");
  // Brows: tapered white crescents from the top of the beak out over each eye.
  // lift moves the outer ends up (happy) or down (sad); inner moves the inner ends up.
  // iy: where the two brows meet above the beak; oy: height of the outer ends.
  const brows = (iy = 47.5, oy = 37.5) => {
    const half = (m) => `M60 ${iy} C ${60 + m * 2.5} ${iy - 11.5}, ${60 + m * 13} ${oy - 10}, ${60 + m * 24} ${oy} C ${60 + m * 13} ${oy - 3}, ${60 + m * 4.5} ${iy - 10}, 60 ${iy} Z`;
    return `<path d="${half(-1)} ${half(1)}" fill="var(--m-brow)"/>`;
  };
  const eyeRing = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--m-eye)" stroke="var(--m-ink)" stroke-width="1.8"/>`;
  return `<svg class="shoco ${cls}" data-mood="${mood}" viewBox="0 0 120 150" role="img" aria-label="Shoco the burrowing owl">
 <g class="m-legs" fill="none" stroke="var(--m-leg)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M51 116 L49 142 M43 145 L49 141 L49 146 M49 141 L55 145"/>
  <path d="M69 116 L71 142 M65 145 L71 141 L71 146 M71 141 L77 145"/>
 </g>
 <g class="m-body">
  <path d="M52 118 L60 131 L68 118 Z" fill="var(--m-body-2)"/>
  <path d="M33 58 C 31 64, 29.5 74, 30 90 C 30.5 110, 42 125, 60 125 C 78 125, 89.5 110, 90 90 C 90.5 74, 89 64, 87 58 C 80 50, 40 50, 33 58 Z" fill="var(--m-body)"/>
  <ellipse cx="60" cy="99" rx="20" ry="24" fill="var(--m-belly)"/>
  <g fill="none" stroke="var(--m-bar)" stroke-width="2.4" stroke-linecap="round">
   <path d="M46 86 q4 2.4 8 0 M57 84 q4 2.4 8 0 M67 87 q3.5 2.2 7 0"/>
   <path d="M44 95 q4 2.4 8 0 M55 93 q4 2.4 8 0 M66 95 q4 2.4 8 0"/>
   <path d="M47 104 q4 2.2 8 0 M58 103 q4 2.2 8 0"/>
  </g>
  <g class="m-wing m-wing-l">
   <path d="M31 78 C 24 98, 28 116, 43 121 C 41 106, 39 92, 37 80 Z" fill="var(--m-body-2)"/>
   <g fill="var(--m-spot)">${dots([[33, 92], [35, 102], [38, 111], [32, 84]], 1.7)}</g>
  </g>
  <g class="m-wing m-wing-r">
   <path d="M89 78 C 96 98, 92 116, 77 121 C 79 106, 81 92, 83 80 Z" fill="var(--m-body-2)"/>
   <g fill="var(--m-spot)">${dots([[87, 92], [85, 102], [82, 111], [88, 84]], 1.7)}</g>
  </g>
  <g class="m-head">
   <ellipse cx="60" cy="47" rx="29.5" ry="25" fill="var(--m-body)"/>
   <g fill="var(--m-speck)">${dots([[47, 27.5], [53.5, 25.2], [60, 24.4], [66.5, 25.2], [73, 27.5], [42, 32], [50, 30], [57, 29], [63, 29], [70, 30], [78, 32], [37.5, 38], [82.5, 38], [36, 46], [84, 46]], 1.15)}</g>
   <path d="M60 37 C 52 30.5, 35.5 32, 34.5 45 C 33.5 57, 46 64, 60 63 C 74 64, 86.5 57, 85.5 45 C 84.5 32, 68 30.5, 60 37 Z" fill="var(--m-face)" stroke="var(--m-rim)" stroke-width="1.6"/>
   <path d="M48.5 60.5 Q60 73 71.5 60.5 Q60 64 48.5 60.5 Z" fill="var(--m-spot)"/>
   <path d="M57 51.5 Q60 50 63 51.5 L60 57.5 Z" fill="var(--m-beak)"/>
   <g class="m-eye m-eye-open">
    ${eyeRing(47.5, 46.5, 8.6)}${eyeRing(72.5, 46.5, 8.6)}
    <g class="m-pupil"><circle cx="48.1" cy="47.1" r="4.3" fill="var(--m-ink)"/><circle cx="73.1" cy="47.1" r="4.3" fill="var(--m-ink)"/>
     <circle cx="49.5" cy="45.4" r="1.4" fill="#fff"/><circle cx="74.5" cy="45.4" r="1.4" fill="#fff"/></g>
    ${brows()}
   </g>
   <g class="m-eye m-eye-happy">
    <path d="M40 48.5 Q47.5 40.5 55 48.5 M65 48.5 Q72.5 40.5 80 48.5" fill="none" stroke="var(--m-ink)" stroke-width="3.2" stroke-linecap="round"/>
    ${brows(46.5, 34.5)}
   </g>
   <g class="m-eye m-eye-sad">
    ${eyeRing(47.5, 47.5, 8)}${eyeRing(72.5, 47.5, 8)}
    <circle cx="47.5" cy="50" r="3.7" fill="var(--m-ink)"/><circle cx="72.5" cy="50" r="3.7" fill="var(--m-ink)"/>
    <path d="M38.5 46.5 Q47.5 41.8 56.5 46.5 L56.5 38 L38.5 38 Z M63.5 46.5 Q72.5 41.8 81.5 46.5 L81.5 38 L63.5 38 Z" fill="var(--m-face)"/>
    <path d="M39 46.5 Q47.5 42.2 56 46.5 M64 46.5 Q72.5 42.2 81 46.5" fill="none" stroke="var(--m-ink)" stroke-width="1.8" stroke-linecap="round"/>
    ${brows(45, 41)}
   </g>
  </g>
 </g>
</svg>`;
}
