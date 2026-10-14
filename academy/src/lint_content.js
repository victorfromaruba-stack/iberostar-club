// Content checks for every lesson item. Run by build.py; also: node src/lint_content.js index.html
// Errors fail the build. Warnings point at questions that may read badly.
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = html.slice(html.indexOf('"use strict";'), html.lastIndexOf("</script>"));
const body = code.slice(0, code.indexOf("/* ---------- Scenario generator"));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(body.replace(/^const /gm, "var "), ctx);
const { LEVELS, CLIPS, SCRIPT, NLP_LINES, MAP_STEPS } = ctx;
const errors = [], warns = [];
const clip = id => CLIPS.find(c => c.id === id);
const seg = (where, c, a, b) => { const k = clip(c); if (!k || !(a >= 0) || !(b >= a) || b >= k.s.length) errors.push(`${where}: bad voice note range ${c}:${a}-${b}`); };
const ids = new Set();
let n = 0;
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
      const toks = it.text.split(" ");
      if (it.extra.some(x => toks.includes(x))) errors.push(`${it.id}: an extra tile is also in the answer`);
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
    const avg = it.w.reduce((s, x) => s + x.length, 0) / it.w.length;
    if (it.a.length > 12 && it.a.length > avg * 1.45) warns.push(`${it.id}: right answer stands out by length (${it.a.length} vs ${Math.round(avg)})`);
  }
}
for (const st of SCRIPT) { for (const l of st.lines) seg(`script ${l.id}`, l.clip, l.from, l.to); if (st.dont) seg(`script ${st.step} don't`, st.dont.clip, st.dont.from, st.dont.to); if (st.extra) seg(`script ${st.step} extra`, st.extra.clip, st.extra.from, st.extra.to); }
if (SCRIPT.length !== MAP_STEPS.length || SCRIPT.some((s, i) => s.step !== MAP_STEPS[i].t)) errors.push("Script steps don't match the pitch map steps");
console.log(`${n} lesson items checked: ${errors.length} errors, ${warns.length} warnings`);
warns.forEach(w => console.log("  warn  " + w));
errors.forEach(e => console.log("  ERROR " + e));
process.exit(errors.length ? 1 : 0);
