// Content checks for every lesson item. Run by build.py; also: node src/lint_content.js index.html
// Errors fail the build. Warnings point at questions that may read badly.
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = html.slice(html.indexOf('"use strict";'), html.lastIndexOf("</script>"));
const body = code.slice(0, code.indexOf("/* ---------- Scenario generator"));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(body.replace(/^const /gm, "var "), ctx);
const { LEVELS, CLIPS, SCRIPT, NLP_LINES, MAP_STEPS, UNITS } = ctx;
/* LEVEL_IDS and ORDER live further down the bundle than the slice evaluated
   above, so read them straight out of the source text. */
const idList = name => {
  const m = code.match(new RegExp(`\\b(?:const|var) ${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  return m ? m[1].split(",").map(s => s.trim().replace(/^"|"$/g, "")).filter(Boolean) : null;
};
const LEVEL_IDS = idList("LEVEL_IDS"), ORDER = idList("ORDER");
const errors = [], warns = [];
const clip = id => CLIPS.find(c => c.id === id);
const seg = (where, c, a, b) => { const k = clip(c); if (!k || !(a >= 0) || !(b >= a) || b >= k.s.length) errors.push(`${where}: bad voice note range ${c}:${a}-${b}`); };
const ids = new Set();
let n = 0, opts = 0, longest = 0;
for (const L of LEVELS) {
  for (const nt of L.notes || []) {
    if (nt.hear) seg(`${L.id} note "${nt.h}"`, nt.hear.clip, nt.hear.from, nt.hear.to);
    if (nt.sayId && !(NLP_LINES[nt.sayId] && nt.say)) errors.push(`${L.id}: practice line ${nt.sayId} missing`);
  }
  for (const it of L.qs || []) {
    n++;
    if (ids.has(it.id)) errors.push(`duplicate id ${it.id}`); ids.add(it.id);
    if (!it.q || !it.why) errors.push(`${it.id}: missing question or why`);
    if (/trainer/i.test(it.q + it.why + (it.a || "") + (it.w || []).join())) warns.push(`${it.id}: mentions the trainer`);
    if (/·|→/.test(it.q)) warns.push(`${it.id}: symbol in the question`);
    if (it.q.split(/\s+/).length > 22) warns.push(`${it.id}: long question (${it.q.split(/\s+/).length} words)`);
    if (it.type === "listen") seg(it.id, it.clip, it.from, it.to);
    if (it.type === "match") {
      const l = new Set(it.pairs.map(p => p[0])), r = new Set(it.pairs.map(p => p[1]));
      if (l.size !== it.pairs.length || r.size !== it.pairs.length) errors.push(`${it.id}: match pairs repeat`);
      continue;
    }
    if (it.type === "build") {
      const toks = it.text.split(" "), same = t => t.split(" ").sort().join(" ") === toks.slice().sort().join(" ");
      if (it.extra.some(x => toks.includes(x))) errors.push(`${it.id}: an extra tile is also in the answer`);
      for (const alt of it.alts || []) if (!same(alt)) errors.push(`${it.id}: the other accepted order "${alt}" uses different tiles`);
      continue;
    }
    if (!Array.isArray(it.w) || it.w.length < 2) { errors.push(`${it.id}: needs wrong options`); continue; }
    if (it.w.includes(it.a) || new Set(it.w).size !== it.w.length) errors.push(`${it.id}: options repeat`);
    if (it.line && !it.q.includes("___")) errors.push(`${it.id}: fill-in has no blank`);
    if (it.hear) {
      seg(it.id, it.hear.clip, it.hear.from, it.hear.to);
      const k = clip(it.hear.clip), said = k ? k.s.slice(it.hear.from, it.hear.to + 1).map(x => x[1]).join(" ").toLowerCase() : "";
      const line = it.q.replace(/^"|"$/g, "").replace("___", it.a).toLowerCase().replace(/[^a-z0-9$' ]+/g, " ").split(/\s+/).filter(Boolean);
      const heard = new Set(said.replace(/[^a-z0-9$' ]+/g, " ").split(/\s+/));
      if (!said.includes(it.a.toLowerCase())) errors.push(`${it.id}: "${it.a}" is not in voice note ${it.hear.clip}:${it.hear.from}`);
      const miss = line.filter(w => !heard.has(w));
      if (miss.length) warns.push(`${it.id}: words not in the voice note: ${miss.join(", ")}`);
    }
    // Length must never give the answer away: workers spotted it when the right option was the long one.
    const lens = it.w.map(x => x.length), avg = lens.reduce((s, x) => s + x, 0) / lens.length, mx = Math.max(...lens), mn = Math.min(...lens), a = it.a.length;
    if (!it.scen) { opts++; if (a > mx) longest++; }
    if (a >= 12 && a - mx > 5) errors.push(`${it.id}: right answer is the longest by ${a - mx} characters`);
    if (a >= 12 && a > avg * 1.3) errors.push(`${it.id}: right answer is ${Math.round(a / avg * 100)}% of the average wrong one`);
    if (a >= 12 && mn < a * 0.5) errors.push(`${it.id}: a wrong option is less than half as long as the right one`);
    if (a >= 12 && a > avg * 1.2) warns.push(`${it.id}: right answer is a bit long (${a} vs ${Math.round(avg)})`);
  }
}
for (const st of SCRIPT) { for (const l of st.lines) seg(`script ${l.id}`, l.clip, l.from, l.to); if (st.dont) seg(`script ${st.step} don't`, st.dont.clip, st.dont.from, st.dont.to); if (st.extra) seg(`script ${st.step} extra`, st.extra.clip, st.extra.from, st.extra.to); }
if (SCRIPT.length !== MAP_STEPS.length || SCRIPT.some((s, i) => s.step !== MAP_STEPS[i].t)) errors.push("Script steps don't match the pitch map steps");

/* A level named by a unit but missing from LEVEL_IDS has no stats entry, and
   the manager panel throws mid-render the moment it draws that level's cell —
   which is what adding "cash" and "house" did on 2026-10-17. Missing from
   ORDER is quieter and worse: nobody is ever pointed at the level, so the
   Final, which needs every unit finished, can never unlock. */
if (!LEVEL_IDS || !ORDER) errors.push("could not read LEVEL_IDS/ORDER out of the bundle — the unit/level consistency check did not run");
else for (const u of UNITS) for (const id of u.levels) {
  if (!LEVEL_IDS.includes(id)) errors.push(`level "${id}" is in unit "${u.title}" but not in LEVEL_IDS (app.js) — the manager panel will crash on it`);
  if (!ORDER.includes(id)) errors.push(`level "${id}" is in unit "${u.title}" but not in ORDER (app.js) — nobody will ever be sent to it and the Final stays locked`);
}
for (const id of LEVEL_IDS) if (!UNITS.some(u => u.levels.includes(id))) errors.push(`LEVEL_IDS has "${id}" but no unit lists it`);
// Writing checks over everything a worker reads (not the voice note transcripts, which are the team's own words),
// including 300 generated guest cards.
const gen = code.slice(code.indexOf("/* ---------- Scenario generator"), code.indexOf("/* =====================================================================\n   CONFIG"));
vm.runInContext("function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }\n" + gen.replace(/^const /gm, "var "), ctx);
const texts = [];
const add = (where, t) => { if (typeof t === "string" && t) texts.push([where, t]); };
for (const L of LEVELS) {
  add(L.id, L.name); add(L.id, L.sub);
  for (const nt of L.notes || []) { add(L.id, nt.h); (nt.li || []).forEach(x => add(L.id, x)); add(L.id, nt.say); }
  for (const it of L.qs || []) { add(it.id, it.q); add(it.id, it.why); add(it.id, it.a); add(it.id, it.text); (it.w || []).forEach(x => add(it.id, x)); (it.pairs || []).forEach(pr => { add(it.id, pr[0]); add(it.id, pr[1]); }); }
}
for (const st of SCRIPT) { add(st.step, st.tip); st.lines.forEach(l => { add(l.id, l.text); add(l.id, l.note); }); if (st.dont) { add(st.step, st.dont.text); add(st.step, st.dont.why); } }
MAP_STEPS.forEach(m => { add("map", m.t); add("map", m.line); });
ctx.FIXED_SCEN.forEach((f, i) => { add("fx" + i, f[0]); add("fx" + i, f[2]); });
for (let i = 0; i < 300; i++) { const g = ctx.genScenario(); add("generated card", g.q); add("generated card", g.why); }
const WRITING = [
  [/\b[Aa] (?!US\b|one\b|uni|use|usu|Euro)[AEIOUaeiou]/, "use \"an\" before a vowel sound"],
  [/\b[Aa]n (?!hour|hono|honest)[^AEIOUaeiou\W_\d]/, "use \"a\" before a consonant sound"],
  [/\S  +\S/, "double space"],
  [/\s[,.!?;:](\s|$)/, "space before punctuation"],
  [/\b(\w+)\s+\1\b/i, "word repeated"]
];
const seenW = new Set();
for (const [where, t] of texts) for (const [re, msg] of WRITING) {
  const m = t.match(re);
  if (m && !(msg === "word repeated" && /^(that|had)$/i.test(m[1])) && !seenW.has(msg + t)) { seenW.add(msg + t); errors.push(`${where}: ${msg}: "${t.slice(0, 80)}"`); }
}
if (longest / opts > 0.35) errors.push(`the right answer is the longest option in ${Math.round(longest / opts * 100)}% of questions (keep it under 35%)`);
console.log(`${n} lesson items and ${texts.length} strings checked: ${errors.length} errors, ${warns.length} warnings. Right answer is the longest option in ${longest} of ${opts} questions (${Math.round(longest / opts * 100)}%).`);
warns.forEach(w => console.log("  warn  " + w));
errors.forEach(e => console.log("  ERROR " + e));
process.exit(errors.length ? 1 : 0);
