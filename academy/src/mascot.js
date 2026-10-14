// Mingo the flamingo. Moods: idle, happy, sad, cheer, think. One style: flat shapes, token colors.
let MINGO_N = 0;
function mingo(mood = "idle", cls = "") {
  const id = "mb" + (++MINGO_N);
  return `<svg class="mingo ${cls}" data-mood="${mood}" viewBox="0 0 120 150" role="img" aria-label="Mingo the flamingo">
 <defs><clipPath id="${id}"><path d="M83 26.5 C 96 24, 105 32, 101.5 46.5 C 98 41, 93 39.5, 83 40.5 Z"/></clipPath></defs>
 <g class="m-legs" fill="none" stroke="var(--m-pink-2)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M57 112 L57 145"/><path d="M50 145 L63 145"/><path d="M64 111 L73 127 L60 133"/>
 </g>
 <g class="m-body">
  <path d="M33 96 L18 90 L25 103 Z" fill="var(--m-pink-2)"/>
  <ellipse cx="58" cy="98" rx="29" ry="19" fill="var(--m-pink)"/>
  <path class="m-wing" d="M42 94 C 52 82, 72 84, 77 97 C 66 104, 50 105, 42 94 Z" fill="var(--m-pink-2)"/>
  <path d="M80 94 C 100 74, 66 66, 74 42" fill="none" stroke="var(--m-pink)" stroke-width="10" stroke-linecap="round"/>
  <g class="m-head">
   <path d="M83 26.5 C 96 24, 105 32, 101.5 46.5 C 98 41, 93 39.5, 83 40.5 Z" fill="var(--m-beak)"/>
   <circle cx="101" cy="45" r="7.5" fill="var(--m-ink)" clip-path="url(#${id})"/>
   <circle cx="74" cy="34" r="14" fill="var(--m-pink)"/>
   <ellipse cx="70" cy="41" rx="3.6" ry="2.2" fill="var(--m-cheek)"/>
   <g class="m-eye m-eye-open"><circle cx="77" cy="30" r="5.2" fill="#fff"/><g class="m-pupil"><circle cx="78.4" cy="30.6" r="2.9" fill="var(--m-ink)"/><circle cx="79.3" cy="29.4" r="1" fill="#fff"/></g></g>
   <path class="m-eye m-eye-happy" d="M72 32 Q 77 25.5 82 32" fill="none" stroke="var(--m-ink)" stroke-width="2.6" stroke-linecap="round"/>
   <g class="m-eye m-eye-sad"><circle cx="77" cy="32" r="4.6" fill="#fff"/><circle cx="77.4" cy="33.6" r="2.5" fill="var(--m-ink)"/><path d="M71.5 27 Q 76 23.5 81.5 23.8" fill="none" stroke="var(--m-ink)" stroke-width="2.4" stroke-linecap="round"/></g>
  </g>
 </g>
</svg>`;
}
