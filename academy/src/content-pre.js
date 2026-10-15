/* =====================================================================
   CONTENT
   Sources: "Qualifications Aruba, 2 March 2026" (PDF), the nine voice notes
   of 29 Sept 2026, and the Open House pitch deck. Street skills: ideas from the
   Timeshare OPC University videos and the OPC Secrets By Suz audiobook (Suzanne R. Angeles),
   in our own words, credited with links in each guidebook.
   ===================================================================== */
const Q = (id, q, a, w, why) => ({ id, q, a, w, why });
const LINE = (id, q, a, w, why, hear) => ({ id, q, a, w, why, line: true, ...(hear ? { hear: { clip: hear[0], from: hear[1], to: hear[2] } } : {}) });
const PIC = (id, img, alt, q, a, w, why) => ({ id, img, alt, q, a, w, why, pic: true });
const BUILD = (id, q, text, extra, why, alts) => ({ id, type: "build", q, text, extra, why, a: text, alts: alts || [] });
const MATCH = (id, q, pairs, why) => ({ id, type: "match", q, pairs, why, a: pairs.map(p => `${p[0]}: ${p[1]}`).join("; ") });
const LISTEN = (id, clip, from, to, q, a, w, why) => ({ id, type: "listen", clip, from, to, q, a, w, why });

const UNITS = [
  { id: "qualify", n: 1, title: "Qualify", sub: "Who gets which gift", color: "lagoon", levels: ["q", "ctnq", "who"] },
  { id: "pitch", n: 2, title: "The pitch", sub: "Bookings that show up", color: "flamingo", levels: ["why", "offer", "solid", "words", "map"] },
  { id: "nlp", n: 3, title: "NLP", sub: "Rapport, words that lead, reading people", color: "sea", levels: ["nlp1", "nlp2", "nlp3", "nlp4"], after: "why" },
  { id: "street", n: 4, title: "Street skills", sub: "Stopping people, small talk, objections", color: "good", levels: ["st2", "st3", "st4"], after: "q" },
  { id: "final", n: 5, title: "Final", sub: "Everything mixed", color: "sun", levels: ["final"] }
];
const TRACKS = UNITS.filter(u => u.id !== "final");
