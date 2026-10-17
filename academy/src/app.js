/* =====================================================================
   CONFIG
   The Supabase key below is a publishable key: it's meant to be public.
   The tables are locked; phones only call sua_save with their own secret,
   and only someone with the manager code can read the team (sua_team).
   ===================================================================== */
const SB = { url: "https://cdkopyphjvfxjqhasrae.supabase.co", key: "sb_publishable_9th0PfSraqrnnD5cTcQqxA_oqH6bwqn" };
/* The team list only works on the team link; other hosts (like a preview) can't reach it. */
const TEAM_URL = "https://victorfromaruba-stack.github.io/iberostar-club/academy/";
const TEAM_HOST = /github\.io$/.test(location.hostname) || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const GOAL = 50;
/* Both lists must carry every level in UNITS. The manager panel builds a cell
   for each level a unit names, but every per-level stat is keyed off
   LEVEL_IDS, so a level that is in one and not the other renders a cell whose
   stats do not exist and the whole panel throws mid-render — which is how
   "cash" and "house" left managers staring at "Loading the team…" on
   2026-10-17. ORDER is the learning sequence and decides what a worker is
   pointed at next; a level missing there is never offered and silently locks
   the Final, which needs every unit finished. */
const ORDER = ["q","why","ready","st2","ctnq","offer","cash","house","st3","nlp1","who","st4","solid","words","close","nlp2","map","nlp3","nlp4","tip1","tip2","final"];
const LEVEL_IDS = ["q","ctnq","who","why","offer","cash","house","solid","words","close","map","nlp1","nlp2","nlp3","nlp4","ready","st2","st3","st4","tip1","tip2","final"];
const GAPS = [1,3,7,14,30];
const DAY = 864e5;
const PRAISE = ["Nice!", "Exactly.", "You got it.", "Spot on.", "That's it.", "Great."];

/* =====================================================================
   HELPERS
   ===================================================================== */
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const app = document.getElementById("app");
const $ = sel => document.querySelector(sel);
const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
const byId = id => LEVELS.find(l => l.id === id);
const unitOf = id => UNITS.find(u => u.levels.includes(id));
const ALL_QS = LEVELS.flatMap(l => l.qs || []);
const QBY = Object.fromEntries(ALL_QS.map(q => [q.id, q]));
const clipById = id => CLIPS.find(c => c.id === id);
const dstr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today = () => dstr(new Date());
const fmtT = s => { s = Math.max(0, Math.floor(s||0)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; };
const nf = n => Number(n||0).toLocaleString("en-US");
const plural = (n, w) => `${n} ${w}${n===1?"":"s"}`;
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th","st","nd","rd"][n % 10] || "th");
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function ago(t){
  const ms = t ? new Date(t).getTime() : NaN;
  if (!Number.isFinite(ms)) return "never";
  const d = Math.floor((Date.now() - ms) / 60000);
  if (d < 2) return "just now"; if (d < 60) return `${d} min ago`;
  const h = Math.floor(d/60); if (h < 24) return plural(h,"hour") + " ago";
  const days = Math.floor(h/24); return days === 1 ? "yesterday" : `${days} days ago`;
}
function qText(q){ return q.line ? esc(q.q).replace(/___/g, `<span class="blank">____</span>`) : esc(q.q); }
function answerText(it){ return it.type === "build" ? it.text : it.a; }
function levelTotal(L){ return L.map ? MAP_STEPS.length*2 : (L.count || (L.qs||[]).length); }

/* =====================================================================
   STATE (this phone)
   ===================================================================== */
const KEY = "showup.v1";
const blank = () => ({ name:"", mastered:{}, best:{}, misses:{}, sound:true, xp:0, lightning:0, daily:{ last:"", streak:0, best:0 },
  listened:{}, intro:false, days:[], today:{ d:"", xp:0 }, said:{}, sync:{ device:"", secret:"", last:0, ok:null }, mgr:"", tab:"learn",
  lv:{}, log:[], gaunt:0, rank:{}, pinSet:false, rp:{ n:0, best:0, res:[] }, rpVoice:true, rpFocus:"any", rpLang:"en" });
let S = blank();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch(e){}
for (const [k, v] of Object.entries(blank())) if (typeof S[k] !== typeof v || (Array.isArray(v) && !Array.isArray(S[k]))) S[k] = v;
if (S.daily.last && !S.days.includes(S.daily.last)) S.days.push(S.daily.last);
if (!Array.isArray(S.rp.res) || typeof S.rp.n !== "number") S.rp = blank().rp;
/* Levels can get shorter between versions: a saved best run never shows more than the level has. */
for (const id of Object.keys(S.best)){ const L = LEVELS.find(l => l.id === id); if (L) S.best[id] = Math.min(S.best[id], levelTotal(L)); }
function save(sync = true){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} if (sync) queueSync(); }

/* For the manager panel: right and wrong answers and tries per level, and a log of recent lessons.
   Log entries are [time, kind, level, value, total]. Kinds: m mastered, r review done, p practice,
   f a run that ended on a mistake (value = how many in a row), d Daily 10, lg Lightning round,
   rp Street practice (level = the couple's mood, value = score, total = 1 if they called the gift right). */
const QLEVEL = Object.fromEntries(LEVELS.flatMap(l => (l.qs || []).map(q => [q.id, l.id])));
function lvOf(id){ return S.lv[id] && typeof S.lv[id] === "object" ? S.lv[id] : (S.lv[id] = { r:0, w:0, t:0 }); }
function logEvent(k, id, v = 0, n = 0){ S.log.push([Date.now(), k, id, v, n]); S.log = S.log.slice(-25); }

function reviewInfo(id){
  const m = S.mastered[id]; if (!m) return null;
  const gap = GAPS[Math.min(m.count-1, GAPS.length-1)];
  const days = Math.ceil((m.last + gap*DAY - Date.now())/DAY);
  return { count:m.count, due: days <= 0, days, gap };
}
function unlocked(id){
  if (S.mastered[id]) return true;
  const L = byId(id);
  if (L.final) return TRACKS.every(t => t.levels.every(x => S.mastered[x]));
  const T = TRACKS.find(t => t.levels.includes(id)), k = T.levels.indexOf(id);
  return k === 0 ? (!T.after || !!S.mastered[T.after]) : !!S.mastered[T.levels[k-1]];
}
/* The level you must finish before this one opens. */
function before(id){ const T = TRACKS.find(t => t.levels.includes(id)); if (!T) return null; const k = T.levels.indexOf(id); return k > 0 ? T.levels[k-1] : T.after || null; }
const masteredCount = () => LEVEL_IDS.filter(id => S.mastered[id]).length;
function rank(){
  if (S.mastered.final) return "Show-Up Pro";
  const n = masteredCount();
  return n >= 8 ? "Running" : n >= 3 ? "Walking" : "Crawling";
}
function streakDays(){
  const set = new Set(S.days), d = new Date();
  if (!set.has(dstr(d))){ d.setDate(d.getDate()-1); if (!set.has(dstr(d))) return 0; }
  let n = 0; while (set.has(dstr(d))){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function markActive(){ const t = today(); if (S.days.includes(t)) return false; S.days.push(t); S.days = S.days.slice(-400); return true; }
function todayXP(){ return S.today.d === today() ? S.today.xp : 0; }
function addXP(n){ S.xp = (S.xp||0) + n; if (S.today.d !== today()) S.today = { d: today(), xp: 0 }; S.today.xp += n; }
const dailyOpen = () => LEVELS.some(l => l.qs && S.mastered[l.id]);
const lightningOpen = () => !!S.mastered.who;
const linesPracticed = () => Object.keys(SCRIPT_LINES).filter(id => (S.said[id]||0) >= 0.7).length;
function topMisses(n){ return Object.entries(S.misses).filter(([id]) => QBY[id]).sort((a,b) => b[1]-a[1]).slice(0,n); }
function currentId(){ return ORDER.find(x => unlocked(x) && !S.mastered[x]) || null; }

/* =====================================================================
   GAME KIT: sound, haptics, confetti, count-up, toasts
   ===================================================================== */
let AC;
function sfx(kind){
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
    const t0 = AC.currentTime + 0.01;
    const note = (f, at, dur, type = "triangle", vol = 0.12, slideTo) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0 + at);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + at + dur);
      g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(AC.destination); o.start(t0 + at); o.stop(t0 + at + dur + 0.03);
    };
    const kit = {
      tap:   () => note(880, 0, .05, "sine", .05),
      pop:   () => note(620, 0, .09, "sine", .09, 980),
      ok:    () => { note(784, 0, .12, "triangle", .13); note(1175, .09, .22, "triangle", .13); },
      bad:   () => { note(220, 0, .22, "square", .05, 150); note(165, .12, .26, "square", .04, 110); },
      combo: () => [659, 784, 988, 1319].forEach((f, i) => note(f, i*.06, .14, "triangle", .1)),
      win:   () => [523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i*.09, i === 4 ? .45 : .16, "triangle", .12)),
      streak:() => { note(392, 0, .5, "sawtooth", .03, 784); [784, 988, 1175].forEach((f, i) => note(f, .35 + i*.08, .2, "triangle", .1)); },
      tick:  () => note(1400, 0, .03, "square", .025)
    };
    kit[kind] && kit[kind]();
  } catch(e){}
}
function buzz(p){ try { navigator.vibrate && navigator.vibrate(p); } catch(e){} }
let fxRaf = 0;
function confetti(){
  if (reduced()) return;
  const c = $("#fx"), x = c.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  c.width = W*dpr; c.height = H*dpr; c.hidden = false;
  const cs = getComputedStyle(document.documentElement);
  const cols = ["--lagoon","--sun","--flamingo","--sea","--good"].map(v => cs.getPropertyValue(v).trim());
  const P = Array.from({ length: 160 }, () => ({ x: W/2 + (Math.random()-.5)*140, y: H*.3, vx: (Math.random()-.5)*11, vy: -Math.random()*13 - 4, r: 6 + Math.random()*6, a: Math.random()*6.3, va: (Math.random()-.5)*.3, c: pick(cols) }));
  const t0 = performance.now(); let last = t0;
  cancelAnimationFrame(fxRaf);
  (function f(t){
    const dt = Math.min(32, t - last)/16; last = t;
    x.setTransform(dpr,0,0,dpr,0,0); x.clearRect(0,0,W,H);
    for (const p of P){ p.vy += .32*dt; p.vx *= .99; p.x += p.vx*dt; p.y += p.vy*dt; p.a += p.va*dt; x.save(); x.translate(p.x,p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r/2,-p.r/4,p.r,p.r/2); x.restore(); }
    if (t - t0 < 2400) fxRaf = requestAnimationFrame(f); else { x.clearRect(0,0,W,H); c.hidden = true; }
  })(t0);
}
function stopFx(){ cancelAnimationFrame(fxRaf); fxRaf = 0; const c = $("#fx"); if (c && !c.hidden){ c.getContext("2d").clearRect(0, 0, c.width, c.height); c.hidden = true; } }
function countUp(el, to, ms = 900){
  if (!el) return;
  if (reduced() || !to){ el.textContent = nf(to); return; }
  const t0 = performance.now();
  (function f(t){ const p = Math.min(1, (t - t0)/ms), e = 1 - Math.pow(1 - p, 3); el.textContent = nf(Math.round(to*e)); if (p < 1) requestAnimationFrame(f); })(t0);
}
let toastT = 0;
function toast(msg){
  document.querySelectorAll(".toast").forEach(n => n.remove());
  const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role","status"); t.textContent = msg;
  document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800);
}
function combo(n){
  sfx("combo"); buzz([20,30,20]);
  const el = document.createElement("div"); el.className = "combo"; el.setAttribute("role","status");
  el.innerHTML = `${icon("flame")}<b>${n} in a row</b>`;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1300);
}
function plusOne(txt){ if (reduced()) return; const el = document.createElement("div"); el.className = "plus"; el.textContent = txt; document.body.appendChild(el); setTimeout(() => el.remove(), 650); }
function ring(p){
  const r = 9, c = 2*Math.PI*r;
  return `<svg class="ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="12" cy="12" r="${r}" fill="none" stroke="var(--fire)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c*(1-Math.min(1,p))).toFixed(2)}" transform="rotate(-90 12 12)"/></svg>`;
}

/* =====================================================================
   AUDIO: one player for lines, listening items and the full voice notes
   ===================================================================== */
const AUD = new Audio();
AUD.preload = "none";
let A = { clip:null, end:null, key:null, mode:null };
const clipSrc = id => `audio/${id}.mp3`;
function segTimes(clipId, from, to){
  const c = clipById(clipId);
  return [Math.max(0, c.s[from][0] - 0.15), (c.s[to+1] ? c.s[to+1][0] : c.d) - 0.05];
}
function segText(clipId, from, to){ return clipById(clipId).s.slice(from, to+1).map(s => s[1]).join(" "); }
function loadClip(id){ if (!AUD.src.endsWith(clipSrc(id))){ AUD.src = clipSrc(id); AUD.load(); } }
function whenReady(){ return AUD.readyState >= 1 ? Promise.resolve() : new Promise((res, rej) => {
  const ok = () => { AUD.removeEventListener("error", bad); res(); }, bad = () => { AUD.removeEventListener("loadedmetadata", ok); rej(new Error("audio")); };
  AUD.addEventListener("loadedmetadata", ok, { once:true }); AUD.addEventListener("error", bad, { once:true });
}); }
async function playSeg(clipId, from, to, key, rate = 1){
  if (A.key === key && !AUD.paused){ AUD.pause(); return true; }
  const [a, b] = segTimes(clipId, from, to);
  A = { clip: clipId, end: b, key, mode: "seg" };
  try {
    loadClip(clipId); await whenReady();
    AUD.playbackRate = rate; AUD.currentTime = a;
    await AUD.play(); syncPlayUI(); return true;
  } catch(e){ syncPlayUI(); return false; }
}
function stopAudio(){ try { if (!AUD.paused) AUD.pause(); } catch(e){} }
AUD.addEventListener("timeupdate", () => {
  if (A.mode === "seg" && A.end != null && AUD.currentTime >= A.end) AUD.pause();
  if (A.mode === "full") fullTick();
});
["play","pause","ended"].forEach(ev => AUD.addEventListener(ev, syncPlayUI));
AUD.addEventListener("ended", () => { if (A.mode === "full") nextFull(); });
function syncPlayUI(){
  const playing = !AUD.paused;
  document.querySelectorAll("[data-seg]").forEach(b => {
    const mine = playing && A.key === (b.dataset.key || b.dataset.seg);
    b.innerHTML = `${icon(mine ? "pause" : "play")} ${mine ? "Pause" : esc(b.dataset.label || "Hear it")}`;
  });
  document.querySelectorAll(".speak").forEach(b => b.classList.toggle("playing", playing && A.mode === "seg" && A.key === b.dataset.key));
  syncClipUI();
}
function bindSegButtons(root = document){
  root.querySelectorAll("[data-seg]").forEach(b => {
    if (!b.dataset.label) b.dataset.label = b.textContent.trim() || "Hear it";
    b.onclick = async () => {
      const [clip, from, to] = b.dataset.seg.split(":");
      const ok = await playSeg(clip, +from, +to, b.dataset.key || b.dataset.seg);
      if (!ok) toast("This audio won't play here. The words are right above.");
    };
  });
}

/* Full voice notes with a synced transcript */
let lastSeg = -1;
function clipHTML(c){
  return `<article class="clip" data-clip="${c.id}">
    <div class="clip-h">
      <button class="play" data-play-clip="${c.id}" aria-label="Play ${esc(c.t)}">${icon("play")}</button>
      <div><h3>${esc(c.t)}</h3><p class="meta">${fmtT(c.d)}${S.listened[c.id] ? ` · <span class="heard">heard</span>` : ""}</p></div>
      <button class="speed" data-speed aria-label="Playback speed" hidden>${AUD.playbackRate}×</button>
    </div>
    <input class="seek" type="range" min="0" max="${Math.ceil(c.d)}" step="0.5" value="0" aria-label="Position in ${esc(c.t)}" data-seek="${c.id}" hidden>
    <div class="tx" data-tx="${c.id}" hidden>${c.s.map(([t, txt], k) => `<button class="seg" data-t="${t}" data-k="${k}"><time>${fmtT(t)}</time>${esc(txt)}</button>`).join("")}</div>
  </article>`;
}
async function playFull(id, at){
  A = { clip:id, end:null, key:"full:" + id, mode:"full" }; lastSeg = -1;
  try {
    loadClip(id); await whenReady();
    if (at != null) AUD.currentTime = at;
    await AUD.play();
    try { if ("mediaSession" in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: clipById(id).t, artist: "Show-Up Academy", album: "Voice notes" }); } catch(e){}
  } catch(e){ toast("This voice note won't play here. Its words are in the transcript."); const tx = app.querySelector(`[data-tx="${id}"]`); if (tx) tx.hidden = false; }
  syncClipUI();
}
function bindClips(){
  app.querySelectorAll("[data-play-clip]").forEach(b => b.onclick = () => {
    const id = b.dataset.playClip;
    if (A.mode === "full" && A.clip === id && !AUD.paused){ AUD.pause(); return; }
    if (A.mode === "full" && A.clip === id && AUD.paused && AUD.currentTime > 0){ AUD.play().catch(() => {}); return; }
    playFull(id);
  });
  app.querySelectorAll("[data-speed]").forEach(b => b.onclick = () => {
    const r = { 1:1.25, 1.25:1.5, 1.5:0.75, 0.75:1 }[AUD.playbackRate] || 1;
    AUD.playbackRate = r; AUD.defaultPlaybackRate = r;
    app.querySelectorAll("[data-speed]").forEach(x => x.textContent = r + "×");
  });
  app.querySelectorAll("[data-seek]").forEach(r => r.oninput = () => { if (A.mode === "full" && A.clip === r.dataset.seek) AUD.currentTime = +r.value; });
  app.querySelectorAll(".seg").forEach(b => b.onclick = () => playFull(b.closest("[data-clip]").dataset.clip, +b.dataset.t));
  syncClipUI();
}
function syncClipUI(){
  app.querySelectorAll("[data-clip]").forEach(el => {
    const id = el.dataset.clip, active = A.mode === "full" && A.clip === id, playing = active && !AUD.paused;
    el.classList.toggle("on", active);
    const b = el.querySelector("[data-play-clip]");
    b.innerHTML = icon(playing ? "pause" : "play");
    b.setAttribute("aria-label", (playing ? "Pause " : "Play ") + clipById(id).t);
    el.querySelector("[data-seek]").hidden = !active;
    el.querySelector("[data-speed]").hidden = !active;
    if (active) el.querySelector("[data-tx]").hidden = false;
  });
}
function fullTick(){
  const c = clipById(A.clip), t = AUD.currentTime;
  if (!S.listened[A.clip] && AUD.duration && t / AUD.duration > 0.9){ S.listened[A.clip] = true; addXP(20); save(); }
  const el = app.querySelector(`[data-clip="${A.clip}"]`); if (!el) return;
  const seek = el.querySelector("[data-seek]"); if (seek && document.activeElement !== seek) seek.value = t;
  let k = -1; for (let i = 0; i < c.s.length; i++){ if (c.s[i][0] <= t + 0.15) k = i; else break; }
  if (k !== lastSeg){
    lastSeg = k;
    el.querySelectorAll(".seg.now").forEach(s => s.classList.remove("now"));
    const s = el.querySelector(`.seg[data-k="${k}"]`);
    if (s){ s.classList.add("now"); const box = s.parentElement; box.scrollTop = s.offsetTop - box.offsetTop - 48; }
  }
}
function nextFull(){
  if (view !== "script") return;
  const k = CLIPS.findIndex(c => c.id === A.clip);
  if (k > -1 && k < CLIPS.length - 1){ playFull(CLIPS[k+1].id); app.querySelector(`[data-clip="${CLIPS[k+1].id}"]`)?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth", block: "start" }); }
}

/* =====================================================================
   SPEAKING PRACTICE ("Say it")
   ===================================================================== */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let REC = null;
function stopRec(){ if (REC){ try { REC.abort(); } catch(e){} REC = null; } }
const words = s => s.toLowerCase().replace(/\$/g, "").replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
function scoreSay(target, said){
  const t = words(target), bag = {};
  words(said).forEach(w => bag[w] = (bag[w]||0) + 1);
  let hit = 0; t.forEach(w => { if (bag[w]){ hit++; bag[w]--; } });
  return t.length ? hit / t.length : 0;
}
function sayIt(id, btn){
  if (REC){ stopRec(); btn.classList.remove("listening"); return; }
  const L = SCRIPT_LINES[id] || NLP_LINES[id]; stopAudio();
  const out = app.querySelector(`[data-heard="${id}"]`), sc = app.querySelector(`[data-score="${id}"]`);
  let said = "";
  try { REC = new SR(); } catch(e){ toast("This browser can't listen. Say it out loud, then tap Hear it to compare."); return; }
  REC.lang = "en-US"; REC.interimResults = true; REC.continuous = false; REC.maxAlternatives = 1;
  btn.classList.add("listening"); out.hidden = false; out.textContent = "Listening… say the line now.";
  REC.onresult = e => { let t = ""; for (const r of e.results) t += r[0].transcript + " "; said = t.trim(); out.textContent = said; };
  REC.onerror = e => {
    const m = { "not-allowed": "The microphone is blocked. Allow it in your browser settings.", "service-not-allowed": "Speech practice isn't allowed in this browser.", "no-speech": "I didn't hear anything. Tap Say it and try again." }[e.error] || "Couldn't listen. Try again.";
    toast(m);
  };
  REC.onend = () => {
    btn.classList.remove("listening"); REC = null;
    if (!said){ out.hidden = true; return; }
    const s = scoreSay(L.text, said), pct = Math.round(s*100);
    if (s > (S.said[id]||0)){ S.said[id] = s; }
    if (s >= 0.7){ addXP(5); sfx("ok"); sc.className = "score ok"; sc.textContent = `${pct}% of the words. Nailed it.`; markActive(); }
    else { sfx("bad"); sc.className = "score meh"; sc.textContent = `${pct}% of the words. Hear it again, then try once more.`; }
    save();
    const total = Object.keys(SCRIPT_LINES).length, done = linesPracticed();
    const cnt = $("#saidCount"); if (cnt) cnt.textContent = `${done} of ${total} lines practiced`;
    const bar = $("#saidBar i"); if (bar) bar.style.width = (done / total * 100) + "%";
    const lbl = app.querySelector(`[data-said="${id}"]`); if (lbl) lbl.innerHTML = saidLabel(L);
  };
  try { REC.start(); sfx("tap"); } catch(e){ btn.classList.remove("listening"); REC = null; toast("Couldn't start the microphone."); }
}

/* =====================================================================
   TEAM SYNC (each phone sends its own progress; the manager reads it)
   ===================================================================== */
function newId(){
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map(x => x.toString(16).padStart(2,"0")).join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
/* ---------- Accounts ---------- */
/* Victor, 2026-10-17: "if they use a different device they don't lose their
   progress." Until now the person WAS the phone — install the app properly,
   change handset, clear the browser, and seventeen levels were gone. The
   progress was never lost (it is in Supabase after every answer), there was
   just no way to prove you were the same person.
   So: a name and a four digit code. Nothing to remember but four digits, and
   no email or password on a floor that works from their phones. */
function restoreFrom(st){
  if (!st || typeof st !== "object") return false;
  const o = k => (st[k] && typeof st[k] === "object" && !Array.isArray(st[k])) ? st[k] : {};
  const n = (v, max) => Math.max(0, Math.min(max, parseInt(v, 10) || 0));
  const m = o("m"), ml = o("ml"), b = o("b"), a = o("a");
  S.xp = n(st.x, 1e7); S.lightning = n(st.l, 9999); S.gaunt = n(st.gt, 9999);
  S.mastered = {}; S.best = {}; S.lv = {};
  LEVEL_IDS.forEach(id => {
    if (n(m[id], 999)) S.mastered[id] = { count: n(m[id], 999), last: n(ml[id], Date.now() + DAY) };
    if (n(b[id], 999)) S.best[id] = n(b[id], 999);
    const v = Array.isArray(a[id]) ? a[id] : [];
    if (v.some(x => n(x, 1e6))) S.lv[id] = { r: n(v[0], 1e6), w: n(v[1], 1e6), t: n(v[2], 1e6) };
  });
  S.misses = {};
  (Array.isArray(st.w) ? st.w : []).forEach(x => { if (Array.isArray(x) && typeof x[0] === "string") S.misses[x[0]] = n(x[1], 999); });
  S.log = Array.isArray(st.lg) ? st.lg.slice(-25) : [];
  S.days = (Array.isArray(st.dd) ? st.dd : []).filter(d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-60);
  const rp = o("rp");
  S.rp = { n: n(rp.n, 9999), best: n(rp.b, 100), res: Array.isArray(rp.s) ? rp.s.slice(-10) : [] };
  return true;
}
async function claimAccount(name, pin){
  /* A fresh id for this phone, which the server then points the account at —
     so the old phone stops writing to it and two handsets cannot fight. */
  S.sync.device = ""; S.sync.secret = ""; ident();
  const res = await rpc("sua_claim", { p_name: name, p_pin: pin, p_device: S.sync.device, p_secret: S.sync.secret });
  const r = (res && typeof res === "object" && res.stats) ? res : { stats: res, must_change: false };
  restoreFrom(r.stats);
  S.name = name.trim().slice(0, 30); S.intro = true; S.pinSet = true;
  save(false);
  /* Everyone who was already using the Academy got 1234, so the first thing
     they see after getting their progress back is picking their own. */
  return !!r.must_change;
}
async function setPin(pin){
  ident();
  await rpc("sua_set_pin", { p_device: S.sync.device, p_secret: S.sync.secret, p_pin: pin });
  S.pinSet = true; save(false);
}
function restoreScreen(msg){
  view = "restore"; game = null;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button>
    <div><p class="eyebrow">Your progress</p><h1>Get it back</h1></div><span></span></div>
  <section class="card">
    <div class="say-row">${shoco("think")}<div class="bubble">Used the Academy on another phone? Put in the same name and the four digit code you picked, and everything comes back.</div></div>
    <form class="name-form" id="rsForm">
      <label for="rnm" class="eyebrow" style="flex-basis:100%">Your name</label>
      <input class="field" id="rnm" autocomplete="name" maxlength="30" placeholder="The name you used">
      <label for="rpin" class="eyebrow" style="flex-basis:100%">Your 4 digit code</label>
      <input class="field" id="rpin" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="••••">
      <button class="btn">Get my progress</button>
    </form>
    ${msg ? `<p class="small" style="color:var(--bad-ink)">${esc(msg)}</p>` : ""}
    <p class="small muted">No code yet? Open the Academy on the phone you normally use, go to Me, and pick one there first.</p>
  </section>`, { full: true });
  on("#back", () => tab("learn"));
  $("#rsForm").addEventListener("submit", async e => {
    e.preventDefault();
    const nm = $("#rnm").value.trim(), pin = $("#rpin").value.trim();
    if (!nm || !/^\d{4}$/.test(pin)) return restoreScreen("Put in your name and your four digit code.");
    try {
      const mustChange = await claimAccount(nm, pin);
      sfx("win");
      if (mustChange){ S.pinSet = false; save(false); pinScreen(); toast("Welcome back. Now pick your own code."); }
      else { tab("learn"); toast("Welcome back. Your progress is here."); }
    }
    catch(err){ restoreScreen(/wrong name or pin/i.test(err.message) ? "That name and code don't match. Check both and try again." : "Couldn't reach the server. Check the internet and try again."); }
  });
}
function pinScreen(){
  view = "pin"; game = null;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button>
    <div><p class="eyebrow">Your progress</p><h1>${S.pinSet ? "Change your code" : "Keep your progress safe"}</h1></div><span></span></div>
  <section class="card">
    <div class="say-row">${shoco("idle")}<div class="bubble">Pick four digits you'll remember. If you change phone, install the app, or clear your browser, that code brings all of this back.</div></div>
    <form class="name-form" id="pinForm">
      <label for="pn" class="eyebrow" style="flex-basis:100%">4 digit code</label>
      <input class="field" id="pn" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="••••">
      <button class="btn">Save</button>
    </form>
    <p class="small muted">Don't use your birthday, and don't share it. Anyone with your name and this code can open your progress.</p>
  </section>`, { full: true });
  on("#back", () => tab("me"));
  $("#pinForm").addEventListener("submit", async e => {
    e.preventDefault();
    const pin = $("#pn").value.trim();
    if (!/^\d{4}$/.test(pin)) return toast("Four digits, nothing else.");
    try { await setPin(pin); sfx("ok"); tab("me"); toast("Saved. That code gets your progress back on any phone."); }
    catch(err){ toast(/4 digits/i.test(err.message) ? "Four digits, nothing else." : "Couldn't save it. Check the internet and try again."); }
  });
}

function ident(){
  if (S.sync.device && S.sync.secret) return;
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  S.sync.device = newId(); S.sync.secret = [...b].map(x => x.toString(16).padStart(2,"0")).join("");
  save(false);
}
function payload(){
  return { v:3, x:S.xp||0, mc:masteredCount(), fp:!!S.mastered.final,
    m:Object.fromEntries(LEVEL_IDS.map(id => [id, S.mastered[id]?.count||0])),
    ml:Object.fromEntries(LEVEL_IDS.map(id => [id, S.mastered[id]?.last||0])),
    b:Object.fromEntries(LEVEL_IDS.map(id => [id, S.best[id]||0])),
    a:Object.fromEntries(LEVEL_IDS.map(id => { const v = S.lv[id] || {}; return [id, [v.r||0, v.w||0, v.t||0]]; })),
    l:S.lightning||0, gt:S.gaunt||0, d:streakDays(), h:CLIPS.filter(c => S.listened[c.id]).length,
    sl:linesPracticed(), w:topMisses(20), lg:S.log.slice(-20), dd:S.days.slice(-30), t:Date.now(), ld:S.days[S.days.length-1] || "",
    rp:{ n:S.rp.n, b:S.rp.best, s:S.rp.res.slice(-10) } };
}
async function rpc(fn, body){
  const r = await fetch(`${SB.url}/rest/v1/rpc/${fn}`, { method:"POST", keepalive: fn === "sua_save", headers:{ "apikey": SB.key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error((j && j.message) || `HTTP ${r.status}`);
  return j;
}
let syncT = 0, syncBusy = false, syncAgain = false;
function queueSync(){ if (!S.name) return; clearTimeout(syncT); syncT = setTimeout(pushSync, 2500); }
async function pushSync(){
  if (!S.name) return;
  if (syncBusy){ syncAgain = true; return; }
  ident(); syncBusy = true;
  try { await rpc("sua_save", { p_device:S.sync.device, p_secret:S.sync.secret, p_name:S.name, p_stats:payload() }); S.sync.ok = true; S.sync.last = Date.now(); }
  catch(e){ S.sync.ok = false; }
  finally {
    syncBusy = false; save(false); const el = $("#syncLine"); if (el) el.outerHTML = syncLine();
    if (syncAgain){ syncAgain = false; queueSync(); }
  }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && S.name){ clearTimeout(syncT); pushSync(); } });
function syncLine(){
  const st = !S.name ? "" : S.sync.ok ? "ok" : S.sync.ok === false ? "err" : "";
  const txt = !S.name ? "Add your name and your manager will see your progress."
    : S.sync.ok ? `Your manager sees your progress. Updated ${ago(S.sync.last)}.`
    : S.sync.ok === false ? (TEAM_HOST ? "Couldn't reach the team list. It tries again after your next lesson." : `Your manager sees your progress when you use the team link: ${TEAM_URL}`)
    : "Your progress will be shared with your manager.";
  return `<p class="sync" id="syncLine"><i class="dot ${st}"></i><span>${esc(txt)}</span></p>`;
}

/* =====================================================================
   SCREENS AND TABS
   ===================================================================== */
let view = "", game = null, rafId = 0, timers = [];
const tabsEl = document.createElement("nav");
function show(html, opts = {}){
  cancelAnimationFrame(rafId); rafId = 0; stopFx();
  timers.forEach(clearTimeout); timers = [];
  if (!opts.keepAudio) stopAudio();
  stopRec(); if (typeof rpHush === "function") rpHush();
  try { window.speechSynthesis && speechSynthesis.cancel(); } catch(e){}
  document.querySelectorAll(".combo,.plus").forEach(n => n.remove());
  app.innerHTML = html;
  document.body.classList.toggle("full", !!opts.full);
  document.body.classList.toggle("wide", !!opts.wide);
  tabsEl.hidden = !!opts.full;
  if (!opts.keepScroll) window.scrollTo(0,0);
}
const TABS = { learn: renderLearn, script: renderScript, games: renderGames, me: renderMe };
function tab(t, anchor){
  if (!TABS[t]) t = "learn";
  S.tab = t; save(false); game = null; view = t;
  TABS[t]();
  tabsEl.querySelectorAll("button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === t ? "page" : "false"));
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ block: "start" }), 30);
}
function buildTabs(){
  tabsEl.className = "tabs"; tabsEl.setAttribute("aria-label", "Sections");
  tabsEl.innerHTML = `<div class="tabs-in">${[["learn","home","Learn"],["script","chat","Script"],["games","bolt","Games"],["me","user","Me"]]
    .map(([t, ic, label]) => `<button data-tab="${t}">${icon(ic)}<span>${label}</span></button>`).join("")}</div>`;
  document.body.appendChild(tabsEl);
  tabsEl.querySelectorAll("button").forEach(b => b.onclick = () => { sfx("tap"); tab(b.dataset.tab); });
}

/* ---------- Learn: the path ---------- */
function nextUp(){
  const due = LEVEL_IDS.map(byId).find(L => reviewInfo(L.id)?.due);
  if (due) return `Review time: ${due.name}. One clean run locks it in.`;
  const id = currentId();
  if (id){ const L = byId(id); return S.best[id] ? `Next up: ${L.name}. Your best run is ${S.best[id]} of ${levelTotal(L)}.` : `Next up: ${L.name}. Tap the glowing circle.`; }
  return "You know it all. Keep your streak with a Daily 10 or beat your Lightning record.";
}
const OFFS = [0, 52, 78, 52, 0, -52, -78, -52];
function nodeState(id){
  if (!unlocked(id)) return "locked";
  const r = reviewInfo(id);
  if (r) return r.due ? "due" : "done";
  return id === currentId() ? "current" : "open";
}
function renderLearn(){
  const ds = streakDays(), tx = todayXP();
  let k = 0;
  show(`
  <h1 class="sr-only">Show-Up Academy</h1>
  <header class="hud">
    <span class="pill fire ${ds ? "" : "off"}" title="Day streak">${icon("flame")}<b>${ds}</b></span>
    <span class="pill xp" title="Total XP">${icon("star")}<b>${nf(S.xp)}</b></span>
    <span class="pill bolt" title="Lightning record">${icon("bolt")}<b>${S.lightning||0}</b></span>
    <span class="pill" title="Daily goal">${ring(tx/GOAL)}<b>${Math.min(tx, GOAL)}/${GOAL}</b></span>
  </header>
  ${S.name ? `<section class="say-row">${shoco("idle")}<div class="bubble">Hi ${esc(S.name)}${/[.!?]$/.test(S.name) ? "" : "."} ${esc(nextUp())}</div></section>`
    : `<section class="card">
        <div class="say-row">${shoco("happy")}<div class="bubble">Hi, I'm Shoco, Aruba's burrowing owl. I'll help you learn the qualifications, the pitch and NLP, one short lesson at a time. What's your name?</div></div>
        <form class="name-form" id="nameForm"><label for="nm" class="eyebrow" style="flex-basis:100%">Your name</label><input class="field" id="nm" autocomplete="name" maxlength="30" placeholder="First name + last initial"><button class="btn">Save</button></form>
        <p class="small muted">Your manager sees your progress, so use the name they know you by, like Maria G.</p>
        <p class="foot"><button class="link" id="haveAcct">I've used this on another phone</button></p>
      </section>`}
  ${UNITS.map(u => `
    <section class="unit">
      <div class="unit-banner c-${u.color}">
        <div><p class="eyebrow">Unit ${u.n}</p><h2>${esc(u.title)}</h2><p>${esc(u.sub)}</p></div>
        ${u.id === "pitch" ? `<button class="btn small ghost" id="toScript" style="--c:transparent;--t:inherit">${icon("chat")} Script</button>` : ""}
      </div>
      <div class="path">${u.levels.map(id => nodeHTML(id, u, OFFS[(k++) % OFFS.length])).join("")}</div>
    </section>`).join("")}
  <p class="foot">Sources: Qualifications Aruba (2 March 2026), the team's voice notes (29 Sept 2026), and the Open House pitch deck. Street skills uses ideas from the Timeshare OPC University videos and the OPC Secrets By Suz audiobook, in our own words.</p>`);
  const nfm = $("#nameForm");
  if (nfm) nfm.addEventListener("submit", e => { e.preventDefault(); const v = $("#nm").value.trim().slice(0,30); if (v){ S.name = v; save(false); pushSync(); sfx("ok"); renderLearn(); } });
  on("#haveAcct", () => restoreScreen());
  on("#toScript", () => tab("script"));
  app.querySelectorAll("[data-node]").forEach(b => b.onclick = () => togglePop(b.dataset.node));
  const cur = currentId(); if (cur && S.name) setTimeout(() => app.querySelector(`[data-node="${cur}"]`)?.scrollIntoView({ block: "center", behavior: "auto" }), 20);
}
function nodeHTML(id, u, off){
  const L = byId(id), st = nodeState(id);
  const ic = st === "locked" ? "lock" : (st === "done" || st === "due") ? "crown" : L.icon;
  const label = { locked:"locked", done:"mastered", due:"review due", current:"start here", open:"open" }[st];
  return `<div class="node-row" style="--off:${off}px">
    ${st === "current" ? `<span class="start-tag c-${u.color}">START</span>` : ""}
    <button class="node ${st} c-${u.color}" data-node="${id}" aria-label="${esc(L.name)}, ${label}" aria-expanded="false">${icon(ic)}${st === "due" ? `<span class="due-dot">${icon("bolt")}</span>` : ""}</button>
    ${st === "current" && S.name ? `<span class="path-mascot" style="${off > 0 ? "left" : "right"}:max(4px, calc(50% - 170px))">${shoco("idle")}</span>` : ""}
  </div><div data-pop="${id}"></div>`;
}
function togglePop(id){
  const slot = app.querySelector(`[data-pop="${id}"]`), btn = app.querySelector(`[data-node="${id}"]`);
  const open = slot.innerHTML !== "";
  app.querySelectorAll("[data-pop]").forEach(s => s.innerHTML = "");
  app.querySelectorAll("[data-node]").forEach(b => b.setAttribute("aria-expanded","false"));
  if (open) return;
  sfx("tap");
  const L = byId(id), u = unitOf(id), st = nodeState(id), r = reviewInfo(id), off = btn.closest(".node-row").style.getPropertyValue("--off");
  const prev = before(id);
  const size = L.map ? "7 steps, 2 rounds" : `${levelTotal(L)} exercises`;
  let status, actions;
  if (st === "locked"){
    status = L.final ? `Opens when you master the other ${LEVEL_IDS.length - 1} levels.` : `Finish "${byId(prev).name}" first.`;
    actions = `<button class="btn wide" disabled>${icon("lock")} Locked</button>`;
  } else {
    status = st === "due" ? `Review due. Mastered ${plural(r.count,"time")}.` : st === "done" ? `Mastered ${plural(r.count,"time")}. Review in ${plural(r.days,"day")}.` : S.best[id] ? `Best run: ${S.best[id]} of ${levelTotal(L)}.` : size + ". One mistake and you start over.";
    const hasGuide = (L.notes && L.notes.length) || L.map || L.script;
    const fresh = !S.mastered[id] && !S.best[id];
    actions = hasGuide && fresh
      ? `<button class="btn wide" data-guide="${id}">${icon("book")} Learn first</button><button class="btn wide ghost" data-start="${id}">Start the lesson</button>`
      : `<button class="btn wide" data-start="${id}">${st === "due" ? "Review" : st === "done" ? "Practice +XP" : "Start"}</button>${hasGuide ? `<button class="btn wide ghost" data-guide="${id}">${icon("book")} Guidebook</button>` : ""}`;
  }
  slot.innerHTML = `<div class="popover c-${u.color} ${st === "locked" ? "locked" : ""}" style="--off:${off}"><h3>${esc(L.name)}</h3><p>${esc(L.sub)}</p><p>${esc(status)}</p><div class="stack" style="margin-top:6px">${actions}</div></div>`;
  btn.setAttribute("aria-expanded","true");
  slot.querySelector("[data-start]")?.addEventListener("click", () => { sfx("tap"); play(id); });
  slot.querySelector("[data-guide]")?.addEventListener("click", () => guidebook(id));
  slot.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
}

/* ---------- Guidebook ---------- */
/* One cut, in the guidebook as well as in the questions — the same idea as the
   "Hear the line" button on the team's own voice notes. */
function ytCut(w){
  return `<div class="ytbox"><iframe src="https://www.youtube-nocookie.com/embed/${esc(w.vid)}?start=${Math.max(0, w.from|0)}&end=${w.to|0}&rel=0&modestbranding=1&playsinline=1"
    title="Timeshare OPC University" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
    <p class="small muted">${(w.to - w.from)} second clip, Timeshare OPC University. <a href="https://www.youtube.com/watch?v=${esc(w.vid)}&t=${w.from|0}s" target="_blank" rel="noopener">Won't play? Open it on YouTube</a></p>`;
}
function noteHTML(nt){
  return `<section class="note"><h2>${esc(nt.h)}</h2><ul>${nt.li.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    ${nt.hear ? `<div class="acts"><button class="btn small ghost" data-seg="${nt.hear.clip}:${nt.hear.from}:${nt.hear.to}">${icon("play")} ${esc(nt.hear.label || "Hear it in the voice notes")}</button></div>` : ""}
    ${nt.watch ? ytCut(nt.watch) : ""}
    ${nt.sayId ? lineHTML(NLP_LINES[nt.sayId]) : nt.say ? `<p class="line"><span class="quote">"${esc(nt.say)}"</span></p>` : ""}
    ${nt.src ? [].concat(nt.src).map(x => `<p class="small"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.label)}</a></p>`).join("") : ""}</section>`;
}
function guidebook(id){
  view = "guide"; game = null;
  const L = byId(id), u = unitOf(id);
  const hero = id === "offer" ? `<figure class="photo kb"><img src="img/photos/joia-beach.jpg" alt="Joia by Iberostar on Eagle Beach"><figcaption>Joia by Iberostar, Eagle Beach</figcaption></figure>` : "";
  const steps = L.script ? `<h2>What to say</h2>${L.script.map(i => stepHTML(SCRIPT[i], i)).join("")}` : "";
  const slides = (L.imgs||[]).map(im => `<figure class="deck-slide"><a href="${im.src}" target="_blank" rel="noopener"><img src="${im.src}" width="${im.w}" height="${im.h}" alt="${esc(im.alt)}" loading="lazy"></a><figcaption>${esc(im.cap)} · tap to open full size</figcaption></figure>`).join("");
  const photos = id === "offer" ? `<div class="grid2"><figure class="photo"><img src="img/photos/joia-suite.jpg" alt="A Joia suite" loading="lazy"><figcaption>A suite on the VIP tour</figcaption></figure><figure class="photo"><img src="img/photos/zima.jpg" alt="Zima rooftop bar at Joia" loading="lazy"><figcaption>Zima, Joia's rooftop bar</figcaption></figure></div>` : "";
  const video = L.video ? `<figure class="photo"><video src="${L.video}" poster="${L.poster}" autoplay muted loop playsinline preload="metadata" aria-label="Aerial view of the Tierra del Sol golf course"></video><figcaption>Tierra del Sol, Iberostar's golf course</figcaption></figure>` : "";
  const mapList = L.map ? `<section class="note"><h2>The pitch map</h2><ol class="placed">${MAP_STEPS.map(s => `<li><div>${esc(s.t)}<span>${esc(s.line)}</span></div></li>`).join("")}</ol><p class="small muted">Round 1: tap the steps in order. Round 2: tap the lines in order. One wrong tap and you start over.</p></section>` : "";
  show(`
  <div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><div><p class="eyebrow">Guidebook · Unit ${u.n}</p><h1>${esc(L.name)}</h1></div><span></span></div>
  <div class="gb-hero">${hero}${slides}${photos}${video}</div>
  ${steps}${mapList}${(L.notes||[]).map(noteHTML).join("")}
  <button class="btn wide" id="go">${S.mastered[id] ? "Practice" : "Start the lesson"}</button>`, { full: true });
  on("#back", () => tab("learn"));
  on("#go", () => play(id));
  bindSegButtons(app); bindSayButtons();
}

/* ---------- Lessons (levels, final, Daily 10) ---------- */
const DAILY = { id:"daily", name:"Daily 10", sub:"Spaced review", notes:[] };
function play(id, missed){
  const L = byId(id);
  if (L.map) return startMap();
  let list;
  if (L.gen) list = buildScenarios(L.count);
  else if (L.final){ const pool = shuffle(ALL_QS.slice()).slice(0, L.count - 6); list = shuffle(pool.concat(buildScenarios(6))); }
  else list = shuffle(L.qs.slice());
  startRun(L, retryEarly(list, missed));
}
/* After a mistake, the missed question comes back second in the new run: a quick retest
   right after seeing the answer is what makes it stick. */
function retryEarly(list, missed){
  if (!missed || typeof missed.q !== "string" || list.length < 3) return list;
  const rest = list.filter(q => q !== missed && q.q !== missed.q && (missed.id === "gen" || q.id !== missed.id));
  rest.splice(1, 0, missed);
  return rest.slice(0, list.length);
}
function buildDaily(){
  const pool = LEVELS.filter(l => l.qs && S.mastered[l.id]).flatMap(l => l.qs);
  const bag = pool.map(q => ({ q, w: 1 + 2*Math.min(3, S.misses[q.id]||0) })), picked = [];
  const want = Math.min(S.mastered.who ? 8 : 10, bag.length);
  while (picked.length < want && bag.length){
    let r = Math.random() * bag.reduce((a,b) => a + b.w, 0), k = 0;
    while (k < bag.length - 1 && (r -= bag[k].w) > 0) k++;
    picked.push(bag.splice(k,1)[0].q);
  }
  return shuffle(picked.concat(S.mastered.who ? buildScenarios(10 - picked.length) : []));
}
function startDaily(missed){ startRun(DAILY, retryEarly(buildDaily(), missed)); }
function startRun(L, list){ if (LEVEL_IDS.includes(L.id)) lvOf(L.id).t++; game = { kind:"run", L, list, idx:0, streak:0, xp:0, t0:Date.now() }; renderItem(); }

/* ---------- Gauntlet ---------- */
/* Every other mode has a last question, so somebody who studies properly runs
   out of app in about a week, and then stops opening it. This one deals from
   the whole course and ends only when the three lives are gone. It leans
   harder on couple cards the longer the run lasts, and starts pulling in the
   questions this phone has got wrong before, so a long run is a different
   run, not just more of the same one. */
const GAUNTLET = { id:"gaunt", name:"Gauntlet", sub:"Endless. Three lives.", notes:[] };
const gauntOpen = () => LEVEL_IDS.filter(id => S.mastered[id]).length >= 3;
function gauntletBatch(score){
  const scen = Math.min(6, 2 + Math.floor(score / 10));
  const missed = ALL_QS.filter(q => S.misses[q.id]);
  return shuffle(shuffle(ALL_QS.slice()).slice(0, Math.max(3, 10 - scen))
    .concat(shuffle(missed).slice(0, Math.min(3, Math.floor(score / 15))))
    .concat(buildScenarios(scen)));
}
function startGauntlet(){
  game = { kind:"run", L:GAUNTLET, list:gauntletBatch(0), idx:0, streak:0, xp:0,
           t0:Date.now(), endless:true, lives:3, score:0 };
  renderItem();
}
function gauntletOver(){
  const g = game, record = g.score > (S.gaunt||0);
  if (record) S.gaunt = g.score;
  logEvent("gt", "gaunt", g.score, 0);
  addXP(g.score * 3);
  const extended = markActive(); save();
  celebrate({ title: record ? "New Gauntlet record!" : "Out of lives", xp: g.score * 3,
              time: Date.now() - g.t0, row: g.score, L: GAUNTLET, extended });
}
function lessonTop(pct){
  const g = game, endless = g && g.endless;
  return `<div class="l-top"><button class="icon-btn" id="quit" aria-label="Quit">${icon("x")}</button>
    <div class="l-bar" role="progressbar" aria-label="${endless ? "Lives left" : "Progress"}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${pct}%"></i></div>
    <span class="heart" id="heart" title="${endless ? "Lives left" : "One mistake and you start over"}">${icon("heart")}<b>${endless ? g.lives : 1}</b></span></div>`;
}
function renderItem(){
  view = "lesson";
  const g = game, it = g.list[g.idx], n = g.list.length;
  g.sel = null; g.checked = false; g.opts = null;
  const kind = it.type === "build" ? "Put the words in order" : it.type === "match" ? "Match the pairs" : it.type === "listen" ? "Listen" : it.type === "watch" ? "Watch, then answer" : it.scen ? "Which gift?" : it.line ? "Fill in the blank" : it.pic ? "Look and answer" : "Choose the answer";
  show(`<div class="lesson">
    <h1 class="sr-only">${esc(g.L.name)}</h1>
    ${lessonTop(g.endless ? g.lives / 3 * 100 : g.idx / n * 100)}
    <p class="l-kind">${kind}${g.endless ? ` <span class="secs">${g.score} in a row</span>` : ""}</p>
    <div class="l-body" id="lbody">${itemBody(it)}</div>
    <div class="l-foot" id="lfoot">${it.type === "match" ? `<p class="hint">Tap the matching pairs</p>` : `<button class="btn wide" id="check" disabled>Check</button>`}</div>
  </div><div class="sheet" id="sheet" aria-live="polite"></div>`, { full: true });
  on("#quit", quitRun);
  on("#check", check);
  bindItem(it);
  if (it.type === "listen") timers.push(setTimeout(() => hearItem(1), 350));
}
function bubbleRow(inner, mood){ return `<div class="say-row">${shoco(mood, "lm")}<div class="bubble q">${inner}</div></div>`; }
function itemBody(it){
  if (it.type === "build"){
    const toks = it.text.split(" ");
    game.tokens = toks; game.tiles = shuffle(toks.concat(it.extra || [])); game.built = [];
    return bubbleRow(esc(it.q), "think") + `<div class="bank-answer" id="ans" aria-label="Your line" aria-live="polite"></div><div class="bank" id="bank">${game.tiles.map((t,i) => `<button class="wtile" data-t="${i}">${esc(t)}</button>`).join("")}</div>`;
  }
  if (it.type === "match"){
    const left = shuffle(it.pairs.map((p,i) => ({ i, t:p[0] }))), right = shuffle(it.pairs.map((p,i) => ({ i, t:p[1] })));
    return bubbleRow(esc(it.q), "think") + `<div class="match"><div class="col">${left.map(x => `<button class="mt" data-side="l" data-i="${x.i}" aria-pressed="false">${esc(x.t)}</button>`).join("")}</div><div class="col">${right.map(x => `<button class="mt" data-side="r" data-i="${x.i}" aria-pressed="false">${esc(x.t)}</button>`).join("")}</div></div>`;
  }
  if (it.type === "watch")
    return `<div class="ytbox"><iframe src="https://www.youtube-nocookie.com/embed/${esc(it.vid)}?start=${Math.max(0, it.from|0)}${it.to ? `&end=${it.to|0}` : ""}&rel=0&modestbranding=1&playsinline=1"
      title="Timeshare OPC University" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <p class="small muted">${it.to ? `${(it.to - it.from)} second clip. ` : ""}Timeshare OPC University. <a href="https://www.youtube.com/watch?v=${esc(it.vid)}&t=${it.from|0}s" target="_blank" rel="noopener">Won't play? Open it on YouTube</a></p>` + bubbleRow(esc(it.q), "think") + optionsHTML(it);
  if (it.type === "listen")
    return `<div class="listen"><button class="speak" id="hear" data-key="item" aria-label="Play the voice note">${icon("speaker")}</button><button class="speak slow" id="hearSlow" data-key="item-slow" aria-label="Play slower">0.75×</button></div><p class="read-it" id="readIt" hidden></p>` + bubbleRow(esc(it.q), "idle") + optionsHTML(it);
  if (it.scen) return scenarioHTML(it) + optionsHTML(it);
  if (it.pic) return `<figure class="photo kb"><img src="${it.img}" alt="${esc(it.alt)}"></figure>` + bubbleRow(qText(it), "idle") + optionsHTML(it);
  return bubbleRow(qText(it), "idle") + optionsHTML(it);
}
function scenarioHTML(it){
  if (it.chips) return `<div class="guest-tag" role="img" aria-label="${esc(it.q)}"><p class="tag-h">${icon("couple")} You just stopped</p><div class="chips">${it.chips.map(([ic, t]) => `<span class="chip">${icon(ic)}<span>${esc(t)}</span></span>`).join("")}</div></div>`;
  return `<div class="guest-tag"><p class="tag-h">${icon("couple")} You just stopped</p><p>${esc(it.q)}</p></div>`;
}
function optionsHTML(it){
  game.opts = it.fixed ? it.fixed.slice() : shuffle([it.a, ...it.w]);
  if (it.scen) return `<div class="opts grid3" role="group" aria-label="Answers">${game.opts.map((o,k) => { const m = o.match(/^(\w+) \((.+)\)$/) || [o, o, ""], code = m[1], rest = [m[2]]; return `<button class="opt grade" data-k="${k}" aria-pressed="false"><b>${esc(code)}</b><span>${esc(rest.join(" · "))}</span></button>`; }).join("")}</div>`;
  return `<div class="opts" role="group" aria-label="Answers">${game.opts.map((o,k) => `<button class="opt" data-k="${k}" aria-pressed="false"><span class="k">${k+1}</span><span>${esc(o)}</span></button>`).join("")}</div>`;
}
function bindItem(it){
  const g = game;
  app.querySelectorAll(".opt").forEach(b => b.onclick = () => select(+b.dataset.k));
  if (it.type === "listen"){ on("#hear", () => hearItem(1)); on("#hearSlow", () => hearItem(0.75)); }
  if (it.type === "build"){
    const ans = $("#ans"), bank = $("#bank"), chk = $("#check");
    const draw = () => {
      ans.innerHTML = g.built.map(i => `<button class="wtile" data-a="${i}">${esc(g.tiles[i])}</button>`).join("");
      bank.querySelectorAll(".wtile").forEach(b => b.classList.toggle("ghost", g.built.includes(+b.dataset.t)));
      ans.querySelectorAll(".wtile").forEach(b => b.onclick = () => { if (g.checked) return; sfx("tap"); g.built = g.built.filter(i => i !== +b.dataset.a); draw(); });
      chk.disabled = !g.built.length;
    };
    bank.querySelectorAll(".wtile").forEach(b => b.onclick = () => { if (g.checked || g.built.includes(+b.dataset.t)) return; sfx("tap"); g.built.push(+b.dataset.t); draw(); });
    draw();
  }
  if (it.type === "match"){
    g.msel = { l:null, r:null }; g.mdone = 0;
    app.querySelectorAll(".mt").forEach(b => b.onclick = () => {
      if (g.checked || b.classList.contains("done")) return;
      const side = b.dataset.side;
      app.querySelectorAll(`.mt[data-side="${side}"]`).forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true"); g.msel[side] = b; sfx("tap");
      const { l, r } = g.msel;
      if (!l || !r) return;
      g.msel = { l:null, r:null };
      if (l.dataset.i === r.dataset.i){
        [l, r].forEach(x => { x.setAttribute("aria-pressed","false"); x.classList.add("ok"); });
        sfx("pop"); g.mdone++;
        timers.push(setTimeout(() => [l, r].forEach(x => x.classList.add("done")), 260));
        if (g.mdone === it.pairs.length) timers.push(setTimeout(() => verdict(true), 420));
      } else {
        [l, r].forEach(x => { x.setAttribute("aria-pressed","false"); x.classList.add("no"); });
        g.checked = true;
        timers.push(setTimeout(() => verdict(false), 420));
      }
    });
  }
}
async function hearItem(rate){
  const it = game && game.list[game.idx]; if (!it || it.type !== "listen") return;
  const ok = await playSeg(it.clip, it.from, it.to, rate === 1 ? "item" : "item-slow", rate);
  if (!ok){ const r = $("#readIt"); if (r){ r.hidden = false; r.textContent = `Audio won't play here. The voice note says: "${segText(it.clip, it.from, it.to)}"`; } }
}
function select(k){
  const g = game; if (!g || g.checked) return;
  g.sel = k; sfx("tap");
  app.querySelectorAll(".opt").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.k === k)));
  const c = $("#check"); if (c) c.disabled = false;
}
function check(){
  const g = game; if (!g || g.kind !== "run" || g.checked) return;
  const it = g.list[g.idx];
  if (it.type === "build"){ if (!g.built.length) return; const said = g.built.map(i => g.tiles[i]).join(" "); return verdict([it.text, ...it.alts].includes(said)); }
  if (g.sel == null) return;
  verdict(g.opts[g.sel] === it.a);
}
function verdict(ok){
  const g = game, it = g.list[g.idx], last = g.idx === g.list.length - 1;
  g.checked = true;
  stopAudio();
  app.querySelectorAll(".opt").forEach(b => { const j = +b.dataset.k; b.disabled = true; if (g.opts && g.opts[j] === it.a) b.classList.add("right"); else if (j === g.sel && !ok) b.classList.add("wrong"); });
  if (it.type === "build") $("#ans")?.querySelectorAll(".wtile").forEach(b => b.classList.add(ok ? "right" : "wrong"));
  const m = app.querySelector(".lm"); if (m) m.dataset.mood = ok ? "happy" : "sad";
  const lid = QLEVEL[it.id] || (it.scen ? "who" : g.L.id);
  if (LEVEL_IDS.includes(lid)) lvOf(lid)[ok ? "r" : "w"]++;
  if (!ok) logEvent("f", g.L.id, g.idx, g.list.length);
  if (ok){
    g.streak++; g.xp += 10; addXP(10); sfx("ok"); buzz(15);
    if (g.endless) g.score++;
    const bar = app.querySelector(".l-bar i"); if (bar && !g.endless) bar.style.width = ((g.idx + 1) / g.list.length * 100) + "%";
    if ([3,5,10,15,20].includes(g.streak)) combo(g.streak);
  } else {
    sfx("bad"); buzz([40,60,40]);
    if (g.endless) g.lives--;
    const h = $("#heart"); if (h){ if (!g.endless || !g.lives) h.classList.add("broken"); h.querySelector("b").textContent = g.endless ? g.lives : "0"; }
    const bar = app.querySelector(".l-bar i"); if (bar && g.endless) bar.style.width = (g.lives / 3 * 100) + "%";
    if (QBY[it.id]) S.misses[it.id] = (S.misses[it.id]||0) + 1;
    if (!g.endless && g.L.id !== "daily" && g.idx > (S.best[g.L.id]||0)) S.best[g.L.id] = g.idx;
  }
  save();
  const best = Math.max(g.idx, S.best[g.L.id]||0);
  const endMsg = !g.endless ? "" : g.lives
    ? `${g.lives === 1 ? "1 life" : g.lives + " lives"} left. Your run so far: ${g.score}.`
    : `Run over at ${g.score}. Your record: ${Math.max(g.score, S.gaunt || 0)}.`;
  const sheet = $("#sheet");
  sheet.className = "sheet " + (ok ? "good" : "bad");
  sheet.innerHTML = `<div class="sheet-in">
    <div class="sh-head"><span class="badge">${icon(ok ? "check" : "x")}</span><h2>${ok ? pick(PRAISE) : "Back to the start"}</h2></div>
    ${ok ? "" : `<p class="sh-ans">Correct answer: <b>${esc(answerText(it))}</b></p>`}
    <p class="sh-why">${esc(it.why || "")}</p>
    ${it.hear ? `<div class="acts"><button class="btn small ghost" data-seg="${it.hear.clip}:${it.hear.from}:${it.hear.to}" data-key="hear-${it.id}">${icon("play")} Hear the line</button></div>` : ""}
    ${ok ? "" : g.endless ? `<p class="small">${endMsg}</p>`
      : `<p class="small">${g.L.id === "daily" ? `You got ${g.idx} in a row.` : `You got ${g.idx} in a row. Your best: ${best} of ${g.list.length}.`} New order next time, and this one comes back early.</p>`}
    <button class="btn wide ${ok ? "good" : "bad"}" id="cont">${g.endless ? (ok || g.lives ? "Keep going" : "See your run") : ok ? (last ? "Finish" : "Continue") : "Start over"}</button>
    ${!ok && g.L.id !== "daily" && ((g.L.notes && g.L.notes.length) || g.L.script) ? `<button class="link" id="gb">${icon("book")} Open the guidebook first</button>` : ""}
  </div>`;
  requestAnimationFrame(() => sheet.classList.add("show"));
  bindSegButtons(sheet);
  on("#cont", () => { sfx("tap");
    if (g.endless){
      if (!ok && !g.lives) return gauntletOver();
      g.idx++;
      if (g.idx >= g.list.length - 1) g.list = g.list.concat(gauntletBatch(g.score));
      return renderItem();
    }
    ok ? (last ? complete() : (g.idx++, renderItem())) : (g.L.id === "daily" ? startDaily(it) : play(g.L.id, it)); });
  on("#gb", () => guidebook(g.L.id));
  timers.push(setTimeout(() => $("#cont")?.focus({ preventScroll: true }), 80));
}
function quitRun(){
  const sheet = $("#sheet"); if (!sheet) return tab("learn");
  sheet.className = "sheet bad";
  sheet.innerHTML = `<div class="sheet-in"><div class="say-row">${shoco("sad")}<div class="bubble">Leaving now loses this run. Stay a little longer?</div></div>
    <button class="btn wide" id="stay">Keep going</button><button class="btn wide ghost" id="leave">Quit the lesson</button></div>`;
  requestAnimationFrame(() => sheet.classList.add("show"));
  on("#stay", () => sheet.classList.remove("show"));
  on("#leave", () => tab("learn"));
}
function complete(){
  const g = game, L = g.L;
  let bonus, title = "Lesson complete!";
  if (L.id === "daily"){ bonus = S.daily.last === today() ? 0 : 30; S.daily.last = today(); logEvent("d", "daily", g.list.length, g.list.length); }
  else {
    const first = !S.mastered[L.id], wasDue = !!reviewInfo(L.id)?.due;
    logEvent(first ? "m" : wasDue ? "r" : "p", L.id, g.list.length, g.list.length);
    const m = S.mastered[L.id] || { count:0, last:0 }; m.count++; m.last = Date.now(); S.mastered[L.id] = m; S.best[L.id] = g.list.length;
    bonus = first ? 50 : wasDue ? 30 : 10; title = first ? "Level mastered!" : wasDue ? "Review done!" : "Practice done!";
  }
  addXP(bonus); g.xp += bonus;
  const extended = markActive(); save();
  celebrate({ title, xp: g.xp, time: Date.now() - g.t0, row: g.list.length, L, extended });
}
function celebrate(o){
  view = "done"; game = null;
  const gap = o.L && S.mastered[o.L.id] ? GAPS[Math.min(S.mastered[o.L.id].count - 1, GAPS.length - 1)] : null;
  const goalJust = todayXP() >= GOAL && todayXP() - o.xp < GOAL;
  const date = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  show(`<section class="celebrate">
    ${shoco("cheer")}
    <h1>${esc(o.title)}</h1>
    ${goalJust ? `<p class="eyebrow" style="color:var(--fire-ink)">Daily goal reached</p>` : ""}
    <div class="stats">
      <div class="stat c-sun"><div class="h">Total XP</div><div class="v">${icon("star")}<span id="cxp">0</span></div></div>
      <div class="stat c-lagoon"><div class="h">Time</div><div class="v">${icon("bolt")}${fmtT(o.time/1000)}</div></div>
      <div class="stat" style="--c:var(--good);--t:var(--on-good)"><div class="h">In a row</div><div class="v">${icon("check")}${o.row}</div></div>
    </div>
    ${o.L && o.L.final ? `<div class="cert"><p class="eyebrow">Show-Up Academy certificate</p><p class="who">${esc(S.name || "Show-Up Pro")}</p><p>Passed the final: ${o.row} questions in a row on the qualifications, the pitch and NLP, with no mistakes.</p><p class="small muted">${esc(date)}</p></div><p class="small muted">Your manager sees this on the team view too.</p>` : ""}
    ${gap ? `<p class="muted">Come back in ${plural(gap,"day")} for a quick review. Spacing it out makes it stick.</p>` : ""}
    <button class="btn wide" id="cont">Continue</button>
    <button class="link" id="seeBoard">${icon("trophy")} See where you are on the team board</button>
  </section>`, { full: true });
  countUp($("#cxp"), o.xp); sfx("win"); buzz([30,40,30,40,80]); confetti();
  on("#cont", () => o.extended ? streakScreen() : tab("learn"));
  on("#seeBoard", () => { BOARD.game = o.L === GAUNTLET ? "gt" : "lv"; BOARD.at = 0; boardScreen(); });
  timers.push(setTimeout(() => $("#cont")?.focus({ preventScroll:true }), 80));
}
function streakScreen(){
  view = "done";
  const n = streakDays();
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  show(`<section class="celebrate">
    <svg class="flame-big" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS.flame}</svg>
    <h1 style="color:var(--fire-ink)"><span id="sn">0</span> day streak</h1>
    <p class="muted">${n === 1 ? "Day one. Come back tomorrow to keep it going." : "Keep it going tomorrow."}</p>
    <div class="week">${days.map(d => { const on = S.days.includes(dstr(d)); return `<span>${"SMTWTFS"[d.getDay()]}<i class="${on ? "on" : ""}">${on ? icon("check") : ""}</i></span>`; }).join("")}</div>
    <button class="btn wide sun" id="cont">Continue</button>
  </section>`, { full: true });
  countUp($("#sn"), n, 700); sfx("streak");
  on("#cont", () => tab("learn"));
}

/* ---------- Pitch map (order the steps; a wrong tap starts over) ---------- */
function startMap(){ lvOf("map").t++; game = { kind:"map", L:byId("map"), round:0, step:0, order:shuffle(MAP_STEPS.map((_, i) => i)), t0:Date.now(), xp:0, locked:false }; renderMap(); }
function renderMap(msg){
  view = "lesson";
  const g = game, total = MAP_STEPS.length*2, done = g.round*MAP_STEPS.length + g.step;
  show(`<div class="lesson">
    <h1 class="sr-only">${esc(g.L.name)}</h1>
    ${lessonTop(done / total * 100)}
    <p class="l-kind">Pitch map, round ${g.round + 1} of 2: ${g.round ? "the lines" : "the steps"}</p>
    <div class="say-row">${shoco(msg ? "happy" : "think", "lm")}<div class="bubble q">${esc(msg || (g.step ? "What comes next?" : "What do you say first?"))}</div></div>
    ${g.step ? `<ol class="placed">${MAP_STEPS.slice(0, g.step).map(s => `<li><div>${esc(s.t)}${g.round ? `<span>${esc(s.line)}</span>` : ""}</div></li>`).join("")}</ol>` : ""}
    <div class="mapq" role="group" aria-label="Steps">${g.order.filter(i => i >= g.step).map(i => `<button class="cardbtn" data-i="${i}">${esc(g.round ? MAP_STEPS[i].line : MAP_STEPS[i].t)}</button>`).join("")}</div>
  </div><div class="sheet" id="sheet"></div>`, { full: true });
  on("#quit", quitRun);
  app.querySelectorAll(".cardbtn").forEach(b => b.onclick = () => tapStep(+b.dataset.i, b));
}
function tapStep(i, btn){
  const g = game; if (!g || g.kind !== "map" || g.locked) return;
  if (i === g.step){
    lvOf("map").r++;
    g.step++; g.xp += 5; addXP(5); sfx("ok"); buzz(12);
    if (g.step === MAP_STEPS.length){
      if (g.round === 0){ g.round = 1; g.step = 0; g.order = shuffle(MAP_STEPS.map((_, k) => k)); save(); return renderMap("Round 1 done. Now the lines you actually say."); }
      return completeMap();
    }
    save(); return renderMap();
  }
  g.locked = true; sfx("bad"); buzz([40,60,40]); btn.classList.add("wrong");
  const h = $("#heart"); if (h){ h.classList.add("broken"); h.querySelector("b").textContent = "0"; }
  const reached = g.round*MAP_STEPS.length + g.step; if (reached > (S.best.map||0)) S.best.map = reached;
  lvOf("map").w++; logEvent("f", "map", reached, MAP_STEPS.length*2); save();
  const s = MAP_STEPS[g.step], m = app.querySelector(".lm"); if (m) m.dataset.mood = "sad";
  const sheet = $("#sheet"); sheet.className = "sheet bad";
  sheet.innerHTML = `<div class="sheet-in"><div class="sh-head"><span class="badge">${icon("x")}</span><h2>Back to the start</h2></div>
    <p class="sh-ans">Step ${g.step + 1} is <b>${esc(s.t)}</b>: ${esc(s.line)}</p>
    <p class="sh-why">The order: ${MAP_STEPS.map((x, k) => `${k + 1}. ${esc(x.t)}`).join(" · ")}</p>
    <button class="btn wide bad" id="cont">Start over</button></div>`;
  requestAnimationFrame(() => sheet.classList.add("show"));
  on("#cont", startMap);
}
function completeMap(){
  const g = game, first = !S.mastered.map, wasDue = !!reviewInfo("map")?.due;
  logEvent(first ? "m" : wasDue ? "r" : "p", "map", MAP_STEPS.length*2, MAP_STEPS.length*2);
  const m = S.mastered.map || { count:0, last:0 }; m.count++; m.last = Date.now(); S.mastered.map = m; S.best.map = MAP_STEPS.length*2;
  const bonus = first ? 50 : wasDue ? 30 : 10; addXP(bonus); g.xp += bonus;
  const extended = markActive(); save();
  celebrate({ title: first ? "Level mastered!" : "Review done!", xp: g.xp, time: Date.now() - g.t0, row: MAP_STEPS.length*2, L: g.L, extended });
}

/* ---------- Lightning round (shot clock tightens, one mistake ends it) ----
   It used to be a flat 60 seconds. Victor, 2026-10-17: "when people finished
   the game the game doesn't becomes challenging anymore." He was right, and
   the reason was structural rather than a shortage of content: with a fixed
   clock the only variable is how fast you read, so every player plateaus at
   their own reading speed and beating the record by one stops meaning
   anything.

   Now each couple has its own window, and the window shrinks as the run goes.
   A run therefore always ends at the edge of whoever is playing -- a new OPC
   is stretched at six seconds, someone who has mastered every level is
   stretched at two. Nobody runs out of difficulty, because the difficulty is
   generated by how well they are doing.

   The floor is 2s rather than something crueller: below that it stops testing
   whether you can qualify a couple and starts testing your thumb. */
const LG_START_MS = 6000;   // the first couple, generous on purpose
const LG_STEP_MS  = 150;    // tightening per correct answer
const LG_HARD_MS  = 1200;   // nobody is ever asked to beat this
const LG_SLOW_MS  = 2600;   // and nobody is left with more than this either

/* The floor is the player's own pace, not a number I picked.
   A fixed floor is a guess about a stranger: set it at 2s and a quick reader
   plateaus again in a week while someone still sounding out the chips never
   gets past ten. Instead each player's recent answer times are kept, and the
   floor lands just inside their own comfortable speed -- so the run ends at
   the edge of THIS person, and keeps moving as they get quicker.
   Clamped at both ends: never crueller than LG_HARD_MS, never slacker than
   LG_SLOW_MS, so a run of lucky guesses cannot make the game trivial and a
   bad day cannot make it impossible. */
function lgPace(){
  const t = (S.lgTimes || []).slice(-30);
  if (t.length < 6) return 2000;                       // not enough to judge yet
  const sorted = [...t].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return Math.min(LG_SLOW_MS, Math.max(LG_HARD_MS, Math.round(median * 0.8)));
}
const lgWindow = (score) => Math.max(lgPace(), LG_START_MS - score * LG_STEP_MS);
/* ---------- Team board ---------- */
/* Victor, 2026-10-17: "make the board so everyone in the company can see it."
   The manager panel's board is built from sua_team, which needs the manager
   code because it carries everyone's whole record. This screen calls
   sua_board instead, which returns a name and two numbers, so it can be open
   to every phone. A scoreboard only drives anything if the people competing
   can see it without asking a manager. */
/* Levels first, and it is the default on purpose. The board opened on
   Lightning and showed two names out of a floor of staff, because most people
   do lessons and never open the games — a board nobody appears on is worse
   than no board. Everyone who has mastered anything is on the Levels one. */
const BOARD_GAMES = { xp: { key: "xp", label: "Points", foot: "Points earned from every lesson, review and game." },
                      lv: { key: "levels", label: "Levels", get foot(){ return `Levels mastered, out of ${LEVEL_IDS.length}.`; } },
                      l:  { key: "lightning", label: "Lightning", foot: "Lightning round: couples qualified in a row." },
                      gt: { key: "gauntlet", label: "Gauntlet", foot: "Gauntlet: questions answered before the three lives ran out." } };
const BOARD = { rows: null, at: 0, err: "", game: "xp" };
/* Also filtered here, not only in sua_board. Somebody trying the app out puts
   a name like "Test phone" on the floor's board, and the database can only be
   changed by hand from the SQL editor — the page can drop it today. */
const TEST_NAME = /^(test|tester|testing|demo|prueba)\b/i;
const BOARD_TTL = 6e4;
async function loadBoard(force){
  if (BOARD.rows && !force && Date.now() - BOARD.at < BOARD_TTL) return;
  try { BOARD.rows = await rpc("sua_board", {}); BOARD.at = Date.now(); BOARD.err = ""; }
  catch(e){ BOARD.err = /could not find|does not exist|HTTP 40[04]/i.test(e.message) ? "off" : "net"; }
}
async function boardScreen(){
  view = "board"; game = null;
  renderBoard(true);
  await loadBoard();
  if (view === "board") renderBoard(false);
}
function boardRows(){
  const key = (BOARD_GAMES[BOARD.game] || BOARD_GAMES.xp).key;
  return (Array.isArray(BOARD.rows) ? BOARD.rows : [])
    .map(r => ({ name: String((r && r.name) || "").slice(0, 40), v: Math.max(0, Math.min(999999, parseInt(r && r[key], 10) || 0)) }))
    .filter(r => r.name && r.v > 0 && !TEST_NAME.test(r.name.trim()))
    .sort((a, b) => b.v - a.v);
}
/* The two lines that make a board worth reopening: where you moved since you
   last looked, and exactly how far the next person is. "2 behind Jaydon" is a
   thing you can go and do something about tonight; a list of names is not. */
function rankLine(all, myRank){
  if (myRank < 0) return "";
  const was = (S.rank || {})[BOARD.game];
  const moved = typeof was === "number" && was !== myRank ? was - myRank : 0;
  const above = all[myRank - 1], me = all[myRank];
  const unit = BOARD.game === "lv" ? "level" : BOARD.game === "xp" ? "point" : "point";
  const chase = above ? `${plural(above.v - me.v, unit)} behind ${esc(above.name)}.` : "Nobody above you. Hold it.";
  const move = moved > 0 ? `<b style="color:var(--good-ink)">▲ Up ${moved} since you last looked.</b> `
             : moved < 0 ? `<b style="color:var(--fire-ink)">▼ Down ${-moved} since you last looked.</b> ` : "";
  return `<p class="bd-chase">${move}${chase}</p>`;
}
function renderBoard(loading){
  const all = boardRows(), rows = all.slice(0, 10), mine = (S.name || "").trim().toLowerCase();
  const own = BOARD.game === "gt" ? (S.gaunt || 0)
            : BOARD.game === "l" ? (S.lightning || 0)
            : BOARD.game === "xp" ? (S.xp || 0)
            : LEVEL_IDS.filter(id => S.mastered[id]).length;
  const myRank = mine ? all.findIndex(r => r.name.trim().toLowerCase() === mine) : -1;
  const place = myRank < 10 ? myRank : -1;
  const tabBtn = (k, label) => `<button data-bg="${k}" aria-pressed="${BOARD.game === k}">${label}</button>`;
  const body = loading && !BOARD.rows ? `<div class="say-row">${shoco("think")}<div class="bubble">Getting the board…</div></div>`
    : BOARD.err === "off" ? `<div class="say-row">${shoco("idle")}<div class="bubble">The board isn't switched on yet. Ask Victor.</div></div>`
    : BOARD.err ? `<div class="say-row">${shoco("sad")}<div class="bubble">Couldn't reach the board. Check the internet and pull to refresh.</div></div>`
    : !rows.length ? `<div class="say-row">${shoco("idle")}<div class="bubble">${BOARD.game === "lv" ? "Nobody has mastered a level yet. First one on the board takes it." : BOARD.game === "xp" ? "Nobody has started yet. First one on the board takes it." : "Nobody has played this one yet. First one on the board takes it."}</div></div>`
    : `<ol class="lb">${rows.map((r, i) => `<li class="${i < 3 ? "top " : ""}${i === place ? "me" : ""}"><span class="rk">${["🥇","🥈","🥉"][i] || i + 1}</span>
        <span class="nm">${esc(r.name)}${i === place ? " <small>you</small>" : ""}</span><span class="sc">${r.v}</span></li>`).join("")}</ol>
      ${rankLine(all, myRank)}
      ${myRank >= 10 ? `<p class="small muted">You're ${ord(myRank + 1)} of ${all.length}.</p>`
        : myRank < 0 && own > 0 ? `<p class="small muted">${BOARD.game === "lv" ? `You've mastered ${own}.` : BOARD.game === "xp" ? `You have ${own} points.` : `Your best is ${own}.`} Not on the board yet — check the name on your phone matches.</p>`
        : myRank < 0 ? `<p class="small muted">${BOARD.game === "lv" ? "Master a level and your name goes up there." : BOARD.game === "xp" ? "Do one lesson and your name goes up there." : "Play a round and get your name up there."}</p>` : ""}`;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button>
    <div><p class="eyebrow">Everyone</p><h1>Team board</h1></div>
    <button class="icon-btn" id="rf" aria-label="Refresh">${icon("refresh")}</button></div>
  <div class="tp-sort" role="group" aria-label="Which board">${Object.keys(BOARD_GAMES).map(k => tabBtn(k, BOARD_GAMES[k].label)).join("")}</div>
  <section class="tp-card">${body}</section>
  <p class="small muted">${(BOARD_GAMES[BOARD.game] || BOARD_GAMES.xp).foot} Updates when your phone has internet.</p>`,
    { full: true, wide: true });
  on("#back", () => tab("games"));
  on("#rf", () => { BOARD.at = 0; boardScreen(); });
  app.querySelectorAll("[data-bg]").forEach(b => b.onclick = () => { BOARD.game = b.dataset.bg; renderBoard(false); });
  /* Remembered only after it has been shown, so the arrow reports the move
     since the last time he actually saw the board, not since the last fetch. */
  if (!loading && myRank >= 0){ S.rank = S.rank || {}; if (S.rank[BOARD.game] !== myRank){ S.rank[BOARD.game] = myRank; save(false); } }
}

function lightningIntro(){
  view = "lightning"; game = null;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><span></span><span></span></div>
  <section class="celebrate">
    ${shoco("think")}
    <h1 style="color:var(--sea-ink)">Lightning round</h1>
    <p>Qualify couple after couple. Every one gives you less time than the last. One mistake ends it.</p>
    <div class="stats"><div class="stat c-sun"><div class="h">Record</div><div class="v">${icon("bolt")}${S.lightning||0}</div></div><div class="stat c-lagoon"><div class="h">Clock</div><div class="v">${(LG_START_MS/1000)}s &rarr; ${(lgPace()/1000).toFixed(1)}s</div></div><div class="stat" style="--c:var(--bad);--t:var(--on-bad)"><div class="h">Mistakes</div><div class="v">${icon("heart")}1</div></div></div>
    <button class="btn wide sea" id="go">Start</button>
  </section>`, { full: true });
  on("#back", () => tab("games"));
  on("#go", startLightning);
  $("#go").focus({ preventScroll: true });
}
function nextCouple(seen){
  for (let k = 0; k < 60; k++){
    const s = Math.random() < 0.3 ? (f => ({ q:f[0], g:f[1], why:f[2] }))(pick(FIXED_SCEN)) : genScenario();
    if (!seen.has(s.q)){ seen.add(s.q); return s; }
  }
  return genScenario();
}
function startLightning(){
  const seen = new Set();
  // win is this couple's window; it is recomputed from the score after every
  // correct answer, so the pressure comes from how well the run is going.
  game = { kind:"lightning", score:0, win:lgWindow(0), end:Date.now() + lgWindow(0),
           seen, cur:nextCouple(seen), over:false, lastSec:0 };
  view = "lightning";
  show(`<div class="lesson">
    <h1 class="sr-only">Lightning round</h1>
    <div class="l-top"><button class="icon-btn" id="quit" aria-label="Stop">${icon("x")}</button><div class="timer" aria-hidden="true"><i id="fill"></i></div><span class="pill bolt">${icon("bolt")}<b id="sc">0</b></span></div>
    <p class="l-kind">Q, CT or NQ? <span id="secs" class="secs">${(lgWindow(0)/1000).toFixed(1)}s</span></p>
    <div id="couple"></div>
    <div class="opts grid3" role="group" aria-label="Q, CT or NQ">
      <button class="opt grade" data-g="Q"><b>Q</b><span>full gift</span></button>
      <button class="opt grade" data-g="CT"><b>CT</b><span>half gift</span></button>
      <button class="opt grade" data-g="NQ"><b>NQ</b><span>no gift</span></button>
    </div>
  </div>`, { full: true });
  drawCouple();
  on("#quit", () => { game.over = true; tab("games"); });
  app.querySelectorAll("[data-g]").forEach(b => b.onclick = () => answerL(b.dataset.g, b));
  const fill = $("#fill"), secs = $("#secs");
  (function tick(){
    const g = game; if (!g || g.kind !== "lightning" || g.over) return;
    const left = g.end - Date.now();
    if (left <= 0) return endLightning(null);
    // The bar is drawn against THIS couple's window, so a full bar always means
    // "all the time you are getting" rather than "lots of time left".
    fill.style.transform = `scaleX(${left / g.win})`;
    const s = Math.ceil(left / 100) / 10;           // tenths: at a 2s window, whole seconds barely move
    if (s !== g.lastSec){
      g.lastSec = s;
      secs.textContent = s.toFixed(1) + "s";
      // Warn in the last third of whatever this window is, not at a fixed 10s
      // -- on a 2s clock a 10s warning would never fire.
      if (left < g.win / 3){ fill.classList.add("low"); sfx("tick"); } else fill.classList.remove("low");
    }
    rafId = requestAnimationFrame(tick);
  })();
}
function drawCouple(){
  const c = game.cur, el = $("#couple");
  el.innerHTML = scenarioHTML({ chips: c.chips, q: c.q });
  el.firstElementChild.classList.add("flash");
}
function answerL(choice, btn){
  const g = game; if (!g || g.kind !== "lightning" || g.over) return;
  if (choice === g.cur.g){
    g.score++; addXP(5); sfx("ok"); buzz(10); plusOne("+1");
    $("#sc").textContent = g.score;
    // How long that one actually took. Only correct answers are recorded: a
    // wrong one ends the run anyway, and timing a panic would drag the pace
    // estimate somewhere that does not describe how fast they can really read.
    const used = g.win - (g.end - Date.now());
    if (used > 150) S.lgTimes = (S.lgTimes || []).concat(Math.min(used, g.win)).slice(-40);
    // Earn the next couple and a smaller window to answer it in.
    g.win = lgWindow(g.score); g.end = Date.now() + g.win; g.lastSec = 0;
    g.cur = nextCouple(g.seen); drawCouple();
    if ([5,10,15,20,25].includes(g.score)) combo(g.score);
  } else { if (btn) btn.classList.add("wrong"); endLightning(choice); }
}
function endLightning(wrong){
  const g = game; g.over = true; cancelAnimationFrame(rafId); rafId = 0;
  const record = g.score > (S.lightning||0);
  if (record) S.lightning = g.score;
  logEvent("lg", "lightning", g.score, 0);
  const extended = g.score >= 3 ? markActive() : false;
  save();
  if (wrong){ sfx("bad"); buzz([40,60,40]); } else sfx("win");
  view = "lightning"; game = null;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><span></span><span></span></div>
  <section class="celebrate">
    ${shoco(record ? "cheer" : wrong ? "sad" : "happy")}
    <h1 style="color:var(--sea-ink)">${record ? "New record!" : plural(g.score, "couple")}</h1>
    <p class="muted">${wrong ? "One mistake ends the round." : "Time's up."}</p>
    <div class="stats"><div class="stat c-lagoon"><div class="h">This round</div><div class="v">${g.score}</div></div><div class="stat c-sun"><div class="h">Record</div><div class="v">${icon("bolt")}${S.lightning}</div></div><div class="stat"><div class="h">XP</div><div class="v">${icon("star")}${g.score*5}</div></div></div>
    ${wrong ? `<div class="card" style="text-align:left;width:100%"><p class="eyebrow">The couple</p>${scenarioHTML({ chips: g.cur.chips, q: g.cur.q })}<p>You said <b>${esc(GRADE[wrong])}</b>. Right answer: <b>${esc(GRADE[g.cur.g])}</b>.</p><p class="muted">${esc(g.cur.why)}</p></div>` : ""}
    <button class="btn wide sea" id="again">Play again</button>
    <button class="link" id="seeBoard">${icon("trophy")} See the Lightning board</button>
    <button class="btn wide ghost" id="home">Back</button>
  </section>`, { full: true });
  if (record) confetti();
  on("#back", () => tab("games")); on("#home", () => extended ? streakScreen() : tab("games")); on("#again", startLightning);
  on("#seeBoard", () => { BOARD.game = "l"; BOARD.at = 0; boardScreen(); });
  $("#again").focus({ preventScroll: true });
}

/* ---------- Script tab: what to say, from the voice notes ---------- */
function saidLabel(l){ return `You say${(S.said[l.id] || 0) >= .7 ? ` <span class="said-check">${icon("check")}practiced</span>` : ""}`; }
function lineHTML(l){
  return `<div class="line" data-line="${l.id}">
    <p class="lbl"><span data-said="${l.id}">${saidLabel(l)}</span>${l.nlp ? `<span class="nlp-tag">NLP: ${esc(l.nlp)}</span>` : ""}</p>
    <p class="quote">"${esc(l.text)}"</p>
    ${l.note ? `<p class="note">${esc(l.note)}</p>` : ""}
    <div class="acts">${l.clip ? `<button class="btn small sea" data-seg="${l.clip}:${l.from}:${l.to}" data-key="${l.id}">${icon("play")} Hear it</button>` : ""}${SR ? `<button class="btn small ghost" data-say="${l.id}">${icon("mic")} Say it</button>` : ""}<span class="score" data-score="${l.id}"></span></div>
    <p class="heard-text" data-heard="${l.id}" hidden></p>
  </div>`;
}
function stepHTML(s, i){
  return `<article class="step" id="step-${i}">
    <div class="step-h"><span class="n">${i + 1}</span><h2>${esc(s.step)}</h2></div>
    <div class="tip">${shoco("idle")}<p>${esc(s.tip)}</p></div>
    ${s.lines.map(lineHTML).join("")}
    ${s.dont ? `<div class="line dont"><p class="lbl">Don't say</p><p class="quote">"${esc(s.dont.text)}"</p><p class="note">${esc(s.dont.why)}</p><div class="acts"><button class="btn small ghost" data-seg="${s.dont.clip}:${s.dont.from}:${s.dont.to}">${icon("play")} Hear it in the voice notes</button></div></div>` : ""}
    ${s.extra ? `<div class="line" style="border-left-color:var(--sea);background:var(--sea-soft)"><p class="lbl" style="color:var(--sea-ink)">From the voice notes</p><p class="note" style="color:var(--ink)">${esc(s.extra.text)}</p><div class="acts"><button class="btn small ghost" data-seg="${s.extra.clip}:${s.extra.from}:${s.extra.to}">${icon("play")} ${esc(s.extra.label)}</button></div></div>` : ""}
  </article>`;
}
function bindSayButtons(){ app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => sayIt(b.dataset.say, b)); }
function renderScript(){
  const total = Object.keys(SCRIPT_LINES).length, done = linesPracticed();
  const mins = Math.round(CLIPS.reduce((a, c) => a + c.d, 0) / 60);
  show(`
  <header class="stack" style="padding-top:12px"><h1>What to say</h1><p class="muted">The exact lines from the voice notes, step by step. Hear each one, then say it out loud.</p></header>
  <section class="card"><div class="row" style="justify-content:space-between"><b id="saidCount">${done} of ${total} lines practiced</b>${SR ? "" : `<span class="small muted">Say it needs Chrome or Safari</span>`}</div><div class="l-bar" id="saidBar"><i style="width:${done/total*100}%"></i></div></section>
  ${SCRIPT.map(stepHTML).join("")}
  <section class="stack" id="notes"><h2>All ${CLIPS.length} voice notes</h2><p class="muted">${mins} minutes of recordings. They play one after another. Tap any sentence to jump to it.</p><div class="stack">${CLIPS.map(clipHTML).join("")}</div></section>`, { keepAudio: true });
  bindSegButtons(app); bindSayButtons(); bindClips();
}

/* ---------- Games tab ---------- */
function renderGames(){
  show(`
  <header class="stack" style="padding-top:12px"><h1>Games</h1><p class="muted">Speed, memory and the real conversation. Every game you finish counts for your streak.</p></header>
  <article class="tile-card c-flamingo rp-tile"><div class="ico">${icon("couple")}</div><div><h2>Street practice</h2><p class="small muted">Pitch a tourist couple by voice or text. Shoco scores you after.${S.rp.n ? ` Best: ${S.rp.best}.` : ""}</p></div><button class="btn small flamingo" id="rp">Start</button></article>
  <article class="tile-card c-lagoon" style="--c:var(--sea);--soft:var(--sea-soft)"><div class="ico">${icon("bolt")}</div><div><h2>Lightning round</h2><p class="small muted">${lightningOpen() ? `60 seconds. Record: ${S.lightning||0} couples.` : 'Opens after "Who qualifies?"'}</p></div>${lightningOpen() ? `<button class="btn small sea" id="lg">Play</button>` : icon("lock")}</article>
  <article class="tile-card c-good"><div class="ico">${icon("flame")}</div><div><h2>Gauntlet</h2><p class="small muted">${gauntOpen() ? `No last question. Three lives, anything from the whole course including what you haven't studied yet, and harder the longer you last. Record: ${S.gaunt||0}.` : "Opens once you've mastered three levels."}</p></div>${gauntOpen() ? `<button class="btn small good" id="gt">Play</button>` : icon("lock")}</article>
  <article class="tile-card c-sun"><div class="ico">${icon("calendar")}</div><div><h2>Daily 10</h2><p class="small muted">${dailyOpen() ? (S.daily.last === today() ? "Done today. Play again for practice." : "Ten questions. Your misses come back more.") : "Opens after your first mastered level."}</p></div>${dailyOpen() ? `<button class="btn small sun" id="dy">Play</button>` : icon("lock")}</article>
  <article class="tile-card c-flamingo"><div class="ico">${icon("route")}</div><div><h2>Pitch map</h2><p class="small muted">${unlocked("map") ? "Put the pitch in order, then the lines." : `Opens after "${byId(before("map")).name}"`}</p></div>${unlocked("map") ? `<button class="btn small flamingo" id="mp">Play</button>` : icon("lock")}</article>
  <article class="tile-card c-sun" style="--c:var(--sun);--soft:var(--sun-soft)"><div class="ico">${icon("trophy")}</div><div><h2>Team board</h2><p class="small muted">Where you stand against the whole floor. Lightning and Gauntlet.</p></div><button class="btn small sun" id="bd">Open</button></article>
  <article class="tile-card"><div class="ico">${icon("headphones")}</div><div><h2>Voice notes</h2><p class="small muted">${CLIPS.filter(c => S.listened[c.id]).length} of ${CLIPS.length} heard</p></div><button class="btn small ghost" id="vn">Listen</button></article>`);
  on("#rp", streetIntro); on("#lg", lightningIntro); on("#gt", startGauntlet); on("#bd", boardScreen); on("#dy", () => startDaily()); on("#mp", () => play("map")); on("#vn", () => tab("script", "notes"));
}

/* ---------- Me tab ---------- */
function renderMe(){
  const weak = topMisses(3);
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  show(`
  <header class="me-head" style="padding-top:12px">${shoco("happy")}<div><h1>${esc(S.name || "You")}</h1><p class="muted">${rank()}: ${masteredCount()} of ${LEVEL_IDS.length} levels mastered</p><p class="small muted">Crawl, walk, run. Each level you master moves you up.</p></div></header>
  ${S.name ? "" : `<form class="name-form" id="nameForm"><label for="nm" class="eyebrow" style="flex-basis:100%">Your name</label><input class="field" id="nm" autocomplete="name" maxlength="30" placeholder="First name + last initial"><button class="btn">Save</button></form>`}
  ${syncLine()}
  <section class="grid2">
    <div class="statbox" style="color:var(--fire)">${icon("flame")}<b style="color:var(--ink)">${streakDays()}</b><span>day streak</span></div>
    <div class="statbox" style="color:var(--sun-2)">${icon("star")}<b style="color:var(--ink)">${nf(S.xp)}</b><span>total XP</span></div>
    <div class="statbox" style="color:var(--sea)">${icon("bolt")}<b style="color:var(--ink)">${S.lightning||0}</b><span>Lightning record</span></div>
    <div class="statbox" style="color:var(--good-ink)">${icon("flame")}<b style="color:var(--ink)">${S.gaunt||0}</b><span>Gauntlet record</span></div>
    <div class="statbox" style="color:var(--flamingo)">${icon("mic")}<b style="color:var(--ink)">${linesPracticed()}</b><span>script lines said</span></div>
    <div class="statbox" style="color:var(--flamingo)">${icon("couple")}<b style="color:var(--ink)">${S.rp.n}</b><span>street practice chats</span></div>
    <div class="statbox" style="color:var(--good)">${icon("trophy")}<b style="color:var(--ink)">${S.rp.n ? S.rp.best : "–"}</b><span>best street score</span></div>
  </section>
  <section class="card"><p class="eyebrow">This week</p><div class="week">${days.map(d => { const on = S.days.includes(dstr(d)); return `<span>${"SMTWTFS"[d.getDay()]}<i class="${on ? "on" : ""}">${on ? icon("check") : ""}</i></span>`; }).join("")}</div></section>
  ${weak.length ? `<section class="card weak"><p class="eyebrow">Your weak spots</p><ul>${weak.map(([id, n]) => `<li>${esc(QBY[id].q)}<br><span class="ans">${esc(answerText(QBY[id]))}</span> <span class="small muted nowrap">· missed ${n}×</span></li>`).join("")}</ul></section>` : ""}
  <section class="card"><h2>How this works</h2>
    <ul class="small" style="padding-left:20px;display:flex;flex-direction:column;gap:6px">
      <li>Short lessons in a new random order every time. One mistake and you start over, with the right answer and why.</li>
      <li>Pulling the answer out of your head is what builds memory. Re-reading doesn't.</li>
      <li>Levels come back for review after 1, 3, 7, 14 and 30 days. Spacing it out makes it stick.</li>
      <li>Hear the lines from the voice notes, then say them out loud in the Script tab.</li>
      <li>Street practice in Games puts it all together: a real conversation with a tourist couple, then your score.</li>
    </ul></section>
  ${S.name ? `<section class="card">
    <p class="eyebrow">Your progress on other phones</p>
    ${S.pinSet
      ? `<p>Your four digit code is set. On a new phone, tap "I've used this on another phone" and put in your name and that code.</p>
         <p class="row"><button class="btn small ghost" id="pin">Change my code</button></p>`
      : `<div class="say-row">${shoco("think")}<div class="bubble">Pick a four digit code and your progress follows you. Change phone, install the app or clear your browser, and it all comes back. Without one, it only lives on this phone.</div></div>
         <p class="row"><button class="btn small" id="pin">Pick my code</button></p>`}
  </section>` : ""}
  <section class="row">
    <button class="btn small ghost" id="snd">${icon(S.sound ? "sound" : "mute")} Sound ${S.sound ? "on" : "off"}</button>
    ${S.name ? `<button class="btn small ghost" id="rename">Change name</button>` : ""}
    <button class="btn small ghost" id="mgr">${icon("chart")} Manager panel</button>
  </section>
  <p class="foot" id="resetBox"><button class="link" id="reset">Reset my progress on this phone</button></p>`);
  const nfm = $("#nameForm");
  if (nfm) nfm.addEventListener("submit", e => { e.preventDefault(); const v = $("#nm").value.trim().slice(0,30); if (v){ S.name = v; save(false); pushSync(); renderMe(); } });
  on("#mgr", coach);
  on("#pin", pinScreen);
  on("#snd", () => { S.sound = !S.sound; save(false); sfx("tap"); renderMe(); });
  on("#rename", () => { S.name = ""; save(false); renderMe(); });
  on("#reset", () => {
    $("#resetBox").innerHTML = `<span>Erase all progress on this phone?</span> <button class="btn small ghost" id="no">Keep it</button> <button class="btn small bad" id="yes">Erase</button>`;
    on("#no", renderMe);
    on("#yes", () => { const keep = { name:S.name, sound:S.sound, sync:S.sync, mgr:S.mgr }; S = Object.assign(blank(), keep); save(); renderMe(); });
  });
}

/* =====================================================================
   KEYBOARD
   ===================================================================== */
document.addEventListener("keydown", e => {
  if (/INPUT|TEXTAREA/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase(), sheet = $("#sheet.show");
  if (k === "enter"){
    if (sheet){ const c = sheet.querySelector("#cont"); if (c){ e.preventDefault(); c.click(); } return; }
    const ch = $("#check"); if (ch && !ch.disabled){ e.preventDefault(); ch.click(); }
    return;
  }
  if (!game) return;
  if (game.kind === "run" && !game.checked){
    const n = parseInt(k, 10);
    if (n >= 1 && game.opts && n <= game.opts.length){ e.preventDefault(); select(n - 1); }
  } else if (game.kind === "lightning" && !game.over){
    const g = { "1":"Q", "2":"CT", "3":"NQ" }[k];
    if (g){ e.preventDefault(); answerL(g, app.querySelector(`[data-g="${g}"]`)); }
  } else if (game.kind === "map" && !game.locked){
    const n = parseInt(k, 10), cards = app.querySelectorAll(".cardbtn");
    if (n >= 1 && n <= cards.length){ e.preventDefault(); cards[n - 1].click(); }
  }
});
