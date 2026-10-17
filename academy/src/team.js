/* =====================================================================
   MANAGER PANEL
   Who knows what, what each worker has done, and what the team should work on.
   Open it from Me > Manager panel, or with the team link plus #team.
   Everything here comes from other people's phones (sua_team), so none of it is
   trusted: names are cut to plain text, every number is clamped, and only known
   level and question ids are used.
   ===================================================================== */
const num = (v, max) => Number.isFinite(+v) ? Math.max(0, Math.min(max, Math.round(+v))) : 0;
const cleanName = v => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40) || "No name";
const LOG_KINDS = ["m", "r", "p", "f", "d", "lg", "rp"];
const LOG_IDS = new Set([...LEVEL_IDS, "daily", "lightning"]);
const NUDGE_DAYS = 3;
const AV = ["#00737a", "#b8325a", "#11709f", "#8f6600", "#2b7a1f", "#a12a4d", "#00636a"];
function avatarColor(name){ let h = 0; for (const c of name) h = (h*31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; }
const dueAt = (count, last) => last + GAPS[Math.min(count - 1, GAPS.length - 1)] * DAY;
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
let TEAM = { people: [], sort: "progress", at: 0, err: "", open: "" };
const tries = n => n === 1 ? "1 try" : `${n} tries`;
const ppl = n => n === 1 ? "1 person" : `${n} people`;
const times = n => n === 1 ? "once" : `${n} times`;
function shortAgo(t){ const m = Math.floor((Date.now() - t) / 60000); return m < 2 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`; }

function cleanStats(p){
  const obj = o => o && typeof o === "object" && !Array.isArray(o) ? o : {};
  p = obj(p);
  const maxT = Date.now() + DAY;
  const perLevel = (o, max) => Object.fromEntries(LEVEL_IDS.map(id => [id, num(obj(o)[id], max)]));
  const a = Object.fromEntries(LEVEL_IDS.map(id => { const v = obj(p.a)[id]; return [id, Array.isArray(v) ? [num(v[0], 1e6), num(v[1], 1e6), num(v[2], 1e6)] : [0, 0, 0]]; }));
  const w = Array.isArray(p.w) ? p.w.filter(x => Array.isArray(x) && typeof x[0] === "string" && QBY[x[0]]).map(x => [x[0], num(x[1], 9999)]).filter(x => x[1] > 0).slice(0, 20) : [];
  const lg = Array.isArray(p.lg) ? p.lg.filter(e => Array.isArray(e) && LOG_KINDS.includes(e[1]) && (e[1] === "rp" ? isMood(e[2]) : LOG_IDS.has(e[2]))).slice(-25)
    .map(e => [num(e[0], maxT), e[1], e[2], num(e[3], 999), num(e[4], 999)]) : [];
  const dd = Array.isArray(p.dd) ? [...new Set(p.dd.filter(s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s)))].slice(-60) : [];
  // Street practice results: [time, score or -1, mood, gift, booked, called the gift right, step codes]
  const rp = obj(p.rp), rs = Array.isArray(rp.s) ? rp.s.filter(x => Array.isArray(x) && isMood(x[2]) && ["Q", "CT", "NQ"].includes(x[3]) && typeof x[6] === "string" && /^[gwmn]{9}$/.test(x[6]))
    .slice(-10).map(x => [num(x[0], maxT), x[1] === -1 ? -1 : num(x[1], 100), x[2], x[3], x[4] ? 1 : 0, x[5] ? 1 : 0, x[6]]) : [];
  return { v: num(p.v, 99), x: num(p.x, 1e7), m: perLevel(p.m, 999), ml: perLevel(p.ml, maxT), b: perLevel(p.b, 999), a,
    l: num(p.l, 999), d: num(p.d, 9999), h: num(p.h, CLIPS.length), sl: num(p.sl, 999), w, lg, dd,
    rp: { n: Math.max(num(rp.n, 9999), rs.length), b: num(rp.b, 100), s: rs } };
}
function person(r){
  const st = cleanStats(r && r.stats), name = cleanName(r && r.name);
  const updated = r && typeof r.updated === "string" && Number.isFinite(Date.parse(r.updated)) ? Date.parse(r.updated) : 0;
  const right = LEVEL_IDS.reduce((s, id) => s + st.a[id][0], 0), wrong = LEVEL_IDS.reduce((s, id) => s + st.a[id][1], 0);
  const mastered = LEVEL_IDS.filter(id => st.m[id]).length;
  return { device: String((r && r.device) || ""), name, st, updated, mastered, ready: !!st.m.final, right, answers: right + wrong,
    due: LEVEL_IDS.filter(id => st.m[id] && st.ml[id] && dueAt(st.m[id], st.ml[id]) <= Date.now()),
    started: mastered > 0 || LEVEL_IDS.some(id => st.b[id] || st.a[id][2]) || st.lg.length > 0 || st.rp.n > 0,
    idle: updated ? Math.floor((Date.now() - updated) / DAY) : Infinity };
}
function teamRows(rows){
  const people = (Array.isArray(rows) ? rows : []).filter(r => r && typeof r === "object").map(person);
  const seen = {}; people.forEach(p => { const k = p.name.toLowerCase(); seen[k] = (seen[k] || 0) + 1; });
  people.forEach(p => p.dupe = seen[p.name.toLowerCase()] > 1);
  return people;
}
function levelState(p, id){
  const st = p.st, total = levelTotal(byId(id));
  if (st.m[id]) return { k: "done", count: st.m[id], due: p.due.includes(id), next: st.ml[id] ? dueAt(st.m[id], st.ml[id]) : 0 };
  const best = Math.min(st.b[id], total), tries = st.a[id][2];
  return best || tries ? { k: "started", best, total, tries } : { k: "none" };
}
function nextFor(p){
  const done = id => !!p.st.m[id];
  const open = id => {
    if (byId(id).final) return TRACKS.every(t => t.levels.every(done));
    const T = TRACKS.find(t => t.levels.includes(id)), k = T.levels.indexOf(id);
    return k === 0 ? (!T.after || done(T.after)) : done(T.levels[k - 1]);
  };
  return ORDER.find(id => !done(id) && open(id)) || null;
}
function rankOf(p){ return p.ready ? "Show-Up Pro" : p.mastered >= 8 ? "Running" : p.mastered >= 3 ? "Walking" : "Crawling"; }
function lastSeen(p){ return p.updated ? `Last active ${ago(p.updated)}` : "No activity yet"; }
function nextStep(p){
  if (!p.started) return "Saved a name, no lessons yet";
  const reviews = p.due.length ? `${p.due.length === 1 ? "1 review" : `${p.due.length} reviews`} waiting` : "";
  if (p.ready) return ["Passed the Final, ready to invite", reviews].filter(Boolean).join(" · ");
  const id = nextFor(p), s = id ? levelState(p, id) : null;
  const next = !id ? "" : s.k === "started" ? `Working on "${byId(id).name}", best run ${s.best} of ${s.total}` : `Next up: "${byId(id).name}"`;
  return [next, reviews].filter(Boolean).join(" · ");
}
function sortPeople(list, how){
  const by = {
    progress: (a, b) => (b.ready - a.ready) || (b.mastered - a.mastered) || (b.right - a.right) || (b.st.x - a.st.x),
    active: (a, b) => b.updated - a.updated,
    name: (a, b) => a.name.localeCompare(b.name)
  }[how] || (() => 0);
  return list.slice().sort(by);
}

/* ---------- Team totals ---------- */
function teamMisses(people){
  const agg = {};
  people.forEach(p => p.st.w.forEach(([id, n]) => { const x = agg[id] || (agg[id] = { id, n: 0, who: [] }); x.n += n; x.who.push(p.name); }));
  return Object.values(agg).sort((a, b) => (b.who.length - a.who.length) || (b.n - a.n)).slice(0, 6);
}
function levelsToCoach(people){
  return LEVEL_IDS.map(id => {
    const states = people.map(p => levelState(p, id));
    const trying = states.filter(s => s.k === "started").length, done = states.filter(s => s.k === "done").length;
    const r = people.reduce((s, p) => s + p.st.a[id][0], 0), w = people.reduce((s, p) => s + p.st.a[id][1], 0);
    return { id, trying, done, right: r, answers: r + w };
  }).filter(x => x.trying > 0).sort((a, b) => (b.trying - a.trying) || (pct(a.right, a.answers) - pct(b.right, b.answers))).slice(0, 5);
}

/* Street practice: the steps people miss or only half do, across their recent chats. */
const RP_ROWS = [...RP_KEYS.map((k, i) => [i, RP_LABEL[k]]), [RP_KEYS.length, "Finding out who they are"]];
function rpSteps(results){
  return RP_ROWS.map(([i, name]) => {
    const codes = results.map(r => r[6][i]).filter(c => c !== "n");
    const good = codes.filter(c => c === "g").length, weak = codes.filter(c => c === "w").length, missed = codes.filter(c => c === "m").length;
    return { name, n: codes.length, good, weak, missed, bad: weak / 2 + missed };
  }).filter(x => x.n).sort((a, b) => (b.bad / b.n) - (a.bad / a.n));
}
const rpAvg = list => { const sc = list.map(r => r[1]).filter(v => v >= 0); return sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null; };
function rpStepsHTML(rows){
  return `<ul class="tp-list">${rows.slice(0, 4).map(x => `<li><p class="q">${esc(x.name)}</p>
    <div class="tp-bar rp-sbar" role="img" aria-label="${x.good} good, ${x.weak} almost, ${x.missed} missed"><i style="width:${pct(x.good, x.n)}%"></i><i class="w" style="width:${pct(x.weak, x.n)}%"></i></div>
    <p class="small muted">${x.missed ? `Missed in ${x.missed} of ${x.n}` : `Never missed`}${x.weak ? ` · almost in ${x.weak}` : ""}</p></li>`).join("")}</ul>`;
}

/* ---------- Screens ---------- */
function teamTop(title, eyebrow, backId, extra = ""){
  return `<div class="l-top"><button class="icon-btn" id="${backId}" aria-label="${backId === "back" ? "Close the manager panel" : "Back to the team"}">${icon("x")}</button>
    <div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1></div>${extra || "<span></span>"}</div>`;
}
function closePanel(){ if (location.hash === "#team") history.replaceState(null, "", location.pathname + location.search); tab("me"); }
function coachLogin(msg){
  view = "coach"; game = null;
  show(`${teamTop("Team panel", "Managers", "back")}
  <div class="say-row">${shoco("think")}<div class="bubble">Enter the manager code to see your team: who knows what, and what to work on.</div></div>
  <form class="name-form" id="codeForm"><label for="code" class="eyebrow" style="flex-basis:100%">Manager code</label><input class="field" id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX"><button class="btn">Open</button></form>
  ${msg ? `<p class="small" style="color:var(--bad-ink)">${esc(msg)}</p>` : ""}
  <p class="small muted">The code stays on this phone, so you only type it once. Share it with managers only.</p>`, { full: true });
  on("#back", closePanel);
  $("#codeForm").addEventListener("submit", e => { e.preventDefault(); const v = $("#code").value.trim(); if (v){ S.mgr = v; save(false); coach(); } });
}
async function coach(){
  if (!S.mgr) return coachLogin();
  view = "coach"; game = null;
  if (TEAM.at) TEAM.open ? renderWorker(TEAM.open, true) : renderPanel(true);
  else { show(`${teamTop("Your team", "Managers", "back")}<div class="say-row">${shoco("think")}<div class="bubble">Loading the team…</div></div>`, { full: true, wide: true }); on("#back", closePanel); }
  try {
    const rows = await rpc("sua_team", { p_code: S.mgr });
    Object.assign(TEAM, { people: teamRows(rows), at: Date.now(), err: "" });
  } catch(e){
    if (view !== "coach") return;
    if (/wrong code/.test(e.message)){ S.mgr = ""; save(false); Object.assign(TEAM, { people: [], at: 0, err: "", open: "" }); return coachLogin("That code didn't work. Check it and try again."); }
    TEAM.err = TEAM_HOST ? "Couldn't reach the team list. Check the internet, then tap refresh." : `The team list only opens on the team link: ${TEAM_URL}#team`;
  }
  if (view === "coach") TEAM.open ? renderWorker(TEAM.open, true) : renderPanel(true);
}
function renderPanel(keepScroll){
  view = "coach"; game = null; TEAM.open = "";
  const people = sortPeople(TEAM.people, TEAM.sort), n = people.length;
  const ready = people.filter(p => p.ready).length, week = people.filter(p => p.idle < 7).length;
  const nudge = people.filter(p => !p.ready && (!p.started || p.idle >= NUDGE_DAYS));
  const right = people.reduce((s, p) => s + p.right, 0), answers = people.reduce((s, p) => s + p.answers, 0);
  const misses = teamMisses(people), coachLv = levelsToCoach(people);
  const monthAgo = Date.now() - 30 * DAY, weekAgo = Date.now() - 7 * DAY;
  const rpRecent = people.flatMap(p => p.st.rp.s.filter(r => r[0] >= monthAgo)), rpWeek = rpRecent.filter(r => r[0] >= weekAgo).length;
  const rpWho = people.filter(p => p.st.rp.s.some(r => r[0] >= monthAgo)).length, rpCalls = rpRecent.filter(r => r[5]).length;
  const tile = (ic, cls, value, label, exp) => `<div class="tp-tile ${cls}"><p class="lbl">${icon(ic)}${label}</p><b>${value}</b><p class="exp">${exp}</p></div>`;
  show(`${teamTop("Your team", "Managers", "back", `<button class="icon-btn" id="refresh" aria-label="Refresh">${icon("refresh")}</button>`)}
  <p class="tp-meta">${ppl(n)} · updated ${TEAM.at ? ago(TEAM.at) : "never"}</p>
  ${TEAM.err ? `<p class="card small" role="alert" style="color:var(--bad-ink)">${esc(TEAM.err)}</p>` : ""}
  ${n ? `
  <section class="tp-tiles" aria-label="Team summary">
    ${tile("crown", "t-sun", `${ready}<small> of ${n}</small>`, "Ready", "Passed the Final")}
    ${tile("flame", "t-good", `${week}<small> of ${n}</small>`, "Active this week", "Did a lesson in the last 7 days")}
    ${tile("user", "t-fire", nudge.length, "Need a nudge", `No lessons yet, or none in ${NUDGE_DAYS}+ days`)}
    ${tile("check", "t-sea", answers >= 20 ? `${pct(right, answers)}%` : "–", "Right answers", answers >= 20 ? `${nf(answers)} answers in lessons` : "Shows once they've answered 20")}
  </section>
  <section class="tp-card" aria-labelledby="kwH">
    <div class="tp-card-h"><h2 id="kwH">Who knows what</h2>
      <div class="tp-sort" role="group" aria-label="Sort the team">${[["progress", "Progress"], ["active", "Last active"], ["name", "Name"]].map(([k, l]) => `<button data-sort="${k}" aria-pressed="${TEAM.sort === k}">${l}</button>`).join("")}</div></div>
    ${matrixHTML(people)}
    <p class="kw-key kw-units">${UNITS.map(u => `<span class="c-${u.color}"><i class="kc done"></i>${esc(u.title)}</span>`).join("")}</p>
    <p class="kw-key"><span class="c-lagoon"><i class="kc done"></i>Mastered</span><span class="c-lagoon"><i class="kc started" style="--p:50%"></i>Started (fill = best run)</span><span><i class="kc"></i>Not started</span><span>Tap a name for details.</span></p>
  </section>
  <div class="tp-cols">
    <section class="tp-card" aria-labelledby="wmH"><h2 id="wmH">Questions the team misses</h2>
      ${misses.length ? `<ol class="tp-list">${misses.map(x => `<li><p class="q">${esc(QBY[x.id].q)}</p><p class="ans">${esc(answerText(QBY[x.id]))}</p>
        <details class="who"><summary>Missed ${times(x.n)} by ${ppl(x.who.length)}</summary><p>${x.who.map(esc).join(", ")}</p></details></li>`).join("")}</ol>
        <p class="small muted">Go over these at the next meeting.</p>` : `<p class="muted">No misses yet.</p>`}
    </section>
    <section class="tp-card" aria-labelledby="lcH"><h2 id="lcH">Levels to coach</h2>
      ${coachLv.length ? `<ul class="tp-list">${coachLv.map(x => { const u = unitOf(x.id); return `<li class="lvc c-${u.color}"><p class="q">${esc(byId(x.id).name)} <span class="utag">${esc(u.title)}</span></p>
        <div class="tp-bar" role="img" aria-label="${x.done} mastered, ${x.trying} still trying"><i style="width:${pct(x.done, x.done + x.trying)}%"></i></div>
        <p class="small muted">${x.trying} still trying · ${x.done} mastered${x.answers >= 10 ? ` · ${pct(x.right, x.answers)}% right` : ""}</p></li>`; }).join("")}</ul>` : `<p class="muted">Nobody is stuck right now.</p>`}
    </section>
  </div>
  <section class="tp-card" aria-labelledby="rpH"><div class="tp-card-h"><h2 id="rpH">Street practice</h2><span class="small muted">Last 30 days</span></div>
    ${rpRecent.length ? `<div class="tp-tiles">
      ${tile("couple", "t-sea", rpRecent.length, "Practice chats", `${ppl(rpWho)} · ${rpWeek} this week`)}
      ${tile("star", "t-sun", rpAvg(rpRecent) ?? "–", "Average score", "Out of 100")}
      ${tile("check", "t-good", `${pct(rpCalls, rpRecent.length)}%`, "Gift called right", "Q, CT or NQ, after the chat")}
      ${tile("calendar", "t-fire", `${pct(rpRecent.filter(r => r[4]).length, rpRecent.length)}%`, "Couples booked", "They said yes to a time")}</div>
      <h3 class="tp-sub">Steps to work on</h3>${rpStepsHTML(rpSteps(rpRecent))}<p class="small muted">From Shoco's feedback on every chat. Green is done well, yellow is almost.</p>`
      : `<p class="muted">No practice chats yet. They're in Games > Street practice.</p>`}
  </section>
  <section class="tp-card" aria-labelledby="ndH"><h2 id="ndH">Need a nudge</h2>
    ${nudge.length ? `<ul class="tp-people">${nudge.map(p => `<li><button data-open="${esc(p.device)}">${avatarHTML(p)}<span><span class="pname">${esc(p.name)}</span><span class="psub">${esc(p.started ? `${lastSeen(p)} · ${nextStep(p)}` : nextStep(p))}</span></span>${icon("play", "go")}</button></li>`).join("")}</ul>`
      : `<p class="muted">Everyone has done a lesson in the last ${NUDGE_DAYS} days.</p>`}
  </section>` : `<div class="say-row">${shoco("idle")}<div class="bubble">Nobody yet. When your team opens the app and saves their name, they show up here with their progress.</div></div>`}
  <details class="card"><summary>How these numbers work</summary><ul class="small tp-help">
    <li>Mastered: they finished the level with no mistakes. It comes back for review after 1, 3, 7, 14 and 30 days.</li>
    <li>Started: they tried it but haven't done a clean run yet. The fill shows their best run.</li>
    <li>Ready: they passed the Final, 20 questions in a row.</li>
    <li>Need a nudge: not ready yet, and either no lessons yet or none in the last ${NUDGE_DAYS} days.</li>
    <li>Right answers: every answer they gave in lessons since this update.</li>
    <li>Street practice: chats with an AI tourist couple. Shoco scores stopping them, each of the 7 pitch steps and finding out who they are, and checks the gift they called.</li>
    <li>Progress arrives from each phone after every answer, when it has internet.</li></ul></details>
  <details class="card"><summary>Change the manager code</summary><form class="name-form" id="newCode"><input class="field" id="nc" autocomplete="off" autocapitalize="characters" placeholder="New code, 6+ letters or numbers" aria-label="New manager code"><button class="btn small">Save</button></form><p class="small muted">Every manager will need the new code.</p></details>
  <p class="foot"><button class="btn" id="board">Copy Lightning board for the group</button></p>
  <p class="foot"><button class="link" id="forget">Forget the code on this phone</button></p>`, { full: true, wide: true, keepScroll });
  on("#back", closePanel); on("#refresh", coach);
  on("#board", async b => {
    const txt = boardText(people);
    try { await navigator.clipboard.writeText(txt); b.textContent = "Copied ✓";
          setTimeout(() => { b.textContent = "Copy Lightning board for the group"; }, 2500); }
    catch { toast("Couldn't copy. Long-press to select it instead."); }
  });
  on("#forget", () => { S.mgr = ""; save(false); Object.assign(TEAM, { people: [], at: 0, err: "", open: "" }); coachLogin(); });
  app.querySelectorAll("[data-sort]").forEach(b => b.onclick = () => { TEAM.sort = b.dataset.sort; renderPanel(true); });
  app.querySelectorAll("[data-open]").forEach(b => b.onclick = () => renderWorker(b.dataset.open));
  $("#newCode")?.addEventListener("submit", async e => { e.preventDefault(); const v = $("#nc").value.trim();
    try { await rpc("sua_set_code", { p_code: S.mgr, p_new: v }); S.mgr = v; save(false); toast("Code changed."); $("#nc").value = ""; }
    catch(err){ toast(/too short/.test(err.message) ? "Use at least 6 letters or numbers." : "Couldn't change the code."); } });
}
function avatarHTML(p){ return `<span class="avatar" style="background:${avatarColor(p.name)}" aria-hidden="true">${esc(p.name.slice(0, 1).toUpperCase())}</span>`; }
function matrixHTML(people){
  const cell = (p, id) => {
    const u = unitOf(id), s = levelState(p, id), L = byId(id);
    const label = s.k === "done" ? `${L.name}: mastered` : s.k === "started" ? `${L.name}: best run ${s.best} of ${s.total}` : `${L.name}: not started`;
    const fill = s.k === "started" ? ` style="--p:${Math.max(12, pct(s.best, s.total))}%"` : "";
    return `<td class="c-${u.color}"><i class="kc ${s.k}"${fill} role="img" aria-label="${esc(label)}" title="${esc(label)}"></i></td>`;
  };
  // Unit groups with a thin spacer column between them; the squares shrink to fit any phone.
  const groups = (f, gap) => UNITS.map((u, i) => (i ? gap : "") + f(u)).join("");
  const sub = p => `${p.mastered}/${LEVEL_IDS.length} · ${p.updated ? shortAgo(p.updated) : "new"}`;
  return `<div class="kw-wrap"><table class="kw"><caption class="sr-only">Levels each person has mastered or started</caption>
    <colgroup><col class="cn">${groups(u => `<col span="${u.levels.length}">`, `<col class="cg">`)}</colgroup>
    <thead><tr><th scope="col"><span class="sr-only">Person</span></th>${groups(u => `<th scope="colgroup" colspan="${u.levels.length}" class="u c-${u.color}">${u.id === "final" ? `${icon("crown", "fin")}<span class="sr-only">Final</span>` : `<span>${esc(u.id === "pitch" ? "Pitch" : u.title)}</span>`}</th>`, `<th aria-hidden="true"></th>`)}</tr>
    <tr class="kw-lv"><th><span class="sr-only">Level</span></th>${groups(u => u.levels.map(id => `<th scope="col"><span>${esc(byId(id).name)}</span></th>`).join(""), `<th aria-hidden="true"></th>`)}</tr></thead>
    <tbody>${people.map(p => `<tr><th scope="row"><button class="kw-name" data-open="${esc(p.device)}"><span class="pname">${esc(p.name)}</span><span class="psub">${esc(sub(p))}</span></button></th>${groups(u => u.levels.map(id => cell(p, id)).join(""), `<td aria-hidden="true"></td>`)}</tr>`).join("")}</tbody></table></div>`;
}
/* The Lightning record already arrives from every phone, but only the manager
   can see it -- sua_team needs the code, so the people competing cannot see
   each other. Rather than open that data up to every device, this hands the
   manager a board to paste into the team group, which is where this floor
   actually competes: names go up there and somebody types "whose next??".

   Only people who have actually set a record appear. A board padded with
   zeroes tells eight people they are last. */
function boardText(people){
  const ranked = people
    .filter(p => (p.st && p.st.l) > 0)
    .sort((a, b) => b.st.l - a.st.l)
    .slice(0, 10);
  if (!ranked.length) return "⚡ Lightning board\n\nNobody has set a record yet. First one on the board takes it.";
  return "⚡ Lightning board\n\n" + ranked.map((p, i) => `${i + 1}. ${p.name} ${p.st.l}`).join("\n");
}

function logText(e){
  const [, k, id, v, n] = e;
  if (k === "rp") return `Street practice: ${RP_MOOD[id].toLowerCase()} couple, ${v} of 100${n ? "" : ", wrong gift"}`;
  const name = id === "daily" ? "Daily 10" : id === "lightning" ? "Lightning round" : `"${byId(id).name}"`;
  return { m: `Mastered ${name}`, r: `Review done: ${name}`, p: `Practiced ${name}`, d: "Finished a Daily 10",
    f: `${name}: ${v} of ${n} in a row, then a mistake`, lg: `Lightning round: ${plural(v, "couple")}` }[k];
}
function renderWorker(device, keepScroll){
  const p = TEAM.people.find(x => x.device === device); if (!p) return renderPanel();
  view = "coach"; game = null; TEAM.open = device;
  const st = p.st, total = LEVEL_IDS.length;
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return dstr(d); });
  const activeDays = days.filter(d => st.dd.includes(d)).length;
  const status = id => {
    const s = levelState(p, id), a = st.a[id], acc = a[0] + a[1] >= 5 ? `${pct(a[0], a[0] + a[1])}% right` : "";
    const notes = [s.due ? "review due" : "", acc].filter(Boolean).join(" · ");
    if (s.k === "done") return `<span class="st done">${icon("crown")}Mastered${s.count > 1 ? ` ×${s.count}` : ""}</span>${notes ? `<span class="small muted">${notes}</span>` : ""}`;
    if (s.k === "started") return `<span class="st started">Best ${s.best} of ${s.total}</span><span class="small muted">${[s.tries ? tries(s.tries) : "", acc].filter(Boolean).join(" · ")}</span>`;
    return `<span class="st none">Not started</span>`;
  };
  const log = st.lg.slice().sort((a, b) => b[0] - a[0]).slice(0, 8);
  show(`${teamTop(p.name, "Team", "toTeam")}
  <div class="tp-who">${avatarHTML(p)}<div><p><b>${esc(rankOf(p))}</b> · ${esc(lastSeen(p))}</p>
    <p class="small muted">${st.d ? `${plural(st.d, "day")} in a row` : "No streak"} · ${nf(st.x)} XP</p></div></div>
  ${nextStep(p) ? `<p class="tp-next">${icon("steps")}<span>${esc(nextStep(p))}</span></p>` : ""}
  <div class="tp-cols">
    <div class="stack" style="gap:18px">
      <section class="tp-tiles two" aria-label="Summary">
        <div class="tp-tile t-sun"><p class="lbl">${icon("crown")}Levels mastered</p><b>${p.mastered}<small> of ${total}</small></b><p class="exp">${p.ready ? "Passed the Final" : "Final not passed yet"}</p></div>
        <div class="tp-tile t-sea"><p class="lbl">${icon("check")}Right answers</p><b>${p.answers >= 10 ? `${pct(p.right, p.answers)}%` : "–"}</b><p class="exp">${p.answers >= 10 ? `${nf(p.answers)} answers in lessons` : "Shows after 10 answers"}</p></div>
      </section>
      <section class="tp-card" aria-labelledby="lvH"><h2 id="lvH">Levels</h2>
        ${UNITS.map(u => { const done = u.levels.filter(id => st.m[id]).length; return `<div class="tp-unit c-${u.color}">
          <div class="tp-unit-h"><h3>${esc(u.title)}</h3><span class="small muted">${done} of ${u.levels.length}</span></div>
          <div class="tp-bar" role="img" aria-label="${done} of ${u.levels.length} mastered"><i style="width:${pct(done, u.levels.length)}%"></i></div>
          <ul class="tp-lv">${u.levels.map(id => `<li><span class="nm">${esc(byId(id).name)}</span><span class="sts">${status(id)}</span></li>`).join("")}</ul></div>`; }).join("")}
      </section>
    </div>
    <div class="stack" style="gap:18px">
      <section class="tp-card" aria-labelledby="nwH"><h2 id="nwH">Needs work</h2>
        ${st.w.length ? `<ol class="tp-list">${st.w.slice(0, 6).map(([id, n]) => `<li><p class="q">${esc(QBY[id].q)}</p><p class="ans">${esc(answerText(QBY[id]))}</p><p class="small muted">Missed ${times(n)}</p></li>`).join("")}</ol>` : `<p class="muted">Nothing missed yet.</p>`}
      </section>
      <section class="tp-card" aria-labelledby="prH"><h2 id="prH">Practice</h2>
        <ul class="tp-facts">
          <li>${icon("mic")}<span><b>${st.sl} of ${Object.keys(SCRIPT_LINES).length}</b> script lines said out loud</span></li>
          <li>${icon("headphones")}<span><b>${st.h} of ${CLIPS.length}</b> voice notes heard</span></li>
          <li>${icon("bolt")}<span><b>${plural(st.l, "couple")}</b> Lightning record</span></li></ul>
      </section>
      <section class="tp-card" aria-labelledby="spH"><h2 id="spH">Street practice</h2>
        ${st.rp.s.length ? `<p class="small muted">${plural(st.rp.n, "chat")} · best ${st.rp.b} · last 5 average ${rpAvg(st.rp.s.slice(-5))}</p>
          <ul class="tp-log rp-res">${st.rp.s.slice().reverse().slice(0, 5).map(r => `<li><span><b>${r[1] >= 0 ? r[1] : "–"}</b> ${esc(RP_MOOD[r[2]])} couple, ${r[3]}${r[5] ? "" : " (called it wrong)"}${r[4] ? " · booked" : ""}</span><time>${esc(ago(r[0]))}</time></li>`).join("")}</ul>
          <h3 class="tp-sub">Steps to work on</h3>${rpStepsHTML(rpSteps(st.rp.s))}`
          : `<p class="muted">No practice chats yet.</p>`}
      </section>
      <section class="tp-card" aria-labelledby="acH"><h2 id="acH">Activity</h2>
        ${st.dd.length ? `<div class="tp-days" role="img" aria-label="Active ${activeDays} of the last 14 days">${days.map(d => `<i class="${st.dd.includes(d) ? "on" : ""}"></i>`).join("")}</div>
          <p class="small muted">${activeDays} of the last 14 days. Today is on the right.</p>` : ""}
        ${log.length ? `<ul class="tp-log">${log.map(e => `<li class="k-${e[1]}"><span>${esc(logText(e))}</span><time>${esc(ago(e[0]))}</time></li>`).join("")}</ul>`
          : `<p class="muted">${p.started ? "Their lesson history shows after their next lesson." : "No lessons yet."}</p>`}
      </section>
    </div>
  </div>
  ${p.dupe ? `<p class="small muted">Another entry has the same name. If it's the same person on a new phone, hide the older one.</p>` : ""}
  <p class="foot tp-hide"><button class="link" id="hide" data-hide="${esc(p.device)}">Hide ${esc(p.name)} from the team list</button><span>For test entries and old phones. If they do a lesson again, they come back.</span></p>`, { full: true, wide: true, keepScroll });
  on("#toTeam", () => renderPanel());
  on("#hide", async () => {
    const b = $("#hide");
    if (b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "Tap again to hide"; return; }
    try { await rpc("sua_hide", { p_code: S.mgr, p_device: b.dataset.hide }); toast("Hidden."); TEAM.people = TEAM.people.filter(x => x.device !== b.dataset.hide); renderPanel(); }
    catch(e){ toast("Couldn't hide that entry."); }
  });
}
