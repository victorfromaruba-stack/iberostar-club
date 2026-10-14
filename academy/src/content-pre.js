/* =====================================================================
   CONTENT
   Sources: "Qualifications Aruba, 2 March 2026" (PDF), the trainer's nine
   voice notes of 29 Sept 2026, the Open House flyer and the partner sheet.
   ===================================================================== */
const Q = (id, q, a, w, why) => ({ id, q, a, w, why });
const LINE = (id, q, a, w, why) => ({ id, q, a, w, why, line: true });
const PIC = (id, img, alt, q, a, w, why) => ({ id, img, alt, q, a, w, why, pic: true });
const BUILD = (id, ctx, text, extra, why) => ({ id, type: "build", ctx, text, extra, why, q: `Build the line: ${ctx}`, a: text });
const MATCH = (id, q, pairs, why) => ({ id, type: "match", q, pairs, why, a: pairs.map(p => `${p[0]}: ${p[1]}`).join(" · ") });
const LISTEN = (id, clip, from, to, q, a, w, why) => ({ id, type: "listen", clip, from, to, q, a, w, why });

const UNITS = [
  { id: "qualify", n: 1, title: "Qualify", sub: "Who gets which gift", color: "lagoon", levels: ["q", "ctnq", "who"] },
  { id: "pitch", n: 2, title: "The pitch", sub: "Solid bookings that show up", color: "flamingo", levels: ["why", "offer", "solid", "map"] },
  { id: "final", n: 3, title: "Final", sub: "Everything, mixed", color: "sun", levels: ["final"] }
];
const TRACKS = UNITS.filter(u => u.id !== "final");
