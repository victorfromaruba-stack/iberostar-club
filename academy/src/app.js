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
const ORDER = ["q","why","ctnq","offer","nlp1","who","solid","words","nlp2","map","nlp3","nlp4","final"];
const LEVEL_IDS = ["q","ctnq","who","why","offer","solid","words","map","nlp1","nlp2","nlp3","nlp4","final"];
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
  listened:{}, coach:{}, intro:false, days:[], today:{ d:"", xp:0 }, said:{}, sync:{ device:"", secret:"", last:0, ok:null }, mgr:"", tab:"learn" });
let S = blank();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(blank(), JSON.parse(raw)); } catch(e){}
for (const [k, v] of Object.entries(blank())) if (typeof S[k] !== typeof v || (Array.isArray(v) && !Array.isArray(S[k]))) S[k] = v;
if (S.daily.last && !S.days.includes(S.daily.last)) S.days.push(S.daily.last);
/* Levels can get shorter between versions: a saved best run never shows more than the level has. */
for (const id of Object.keys(S.best)){ const L = LEVELS.find(l => l.id === id); if (L) S.best[id] = Math.min(S.best[id], levelTotal(L)); }
function save(sync = true){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} if (sync) queueSync(); }

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
function ident(){
  if (S.sync.device && S.sync.secret) return;
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  S.sync.device = newId(); S.sync.secret = [...b].map(x => x.toString(16).padStart(2,"0")).join("");
  save(false);
}
function payload(){
  return { v:2, x:S.xp||0, mc:masteredCount(), fp:!!S.mastered.final,
    m:Object.fromEntries(LEVEL_IDS.map(id => [id, S.mastered[id]?.count||0])),
    b:Object.fromEntries(LEVEL_IDS.map(id => [id, S.best[id]||0])),
    l:S.lightning||0, d:streakDays(), h:CLIPS.filter(c => S.listened[c.id]).length,
    sl:linesPracticed(), w:topMisses(10), t:Date.now(), ld:S.days[S.days.length-1] || "" };
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
    : S.sync.ok === false ? (TEAM_HOST ? "Couldn't reach the team list. It tries again after your next lesson." : "Your manager sees your progress when you use the team link. Here, send your report on WhatsApp.")
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
  stopRec();
  document.querySelectorAll(".combo,.plus").forEach(n => n.remove());
  app.innerHTML = html;
  document.body.classList.toggle("full", !!opts.full);
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
      </section>`}
  ${UNITS.map(u => `
    <section class="unit">
      <div class="unit-banner c-${u.color}">
        <div><p class="eyebrow">Unit ${u.n}</p><h2>${esc(u.title)}</h2><p>${esc(u.sub)}</p></div>
        ${u.id === "pitch" ? `<button class="btn small ghost" id="toScript" style="--c:transparent;--t:inherit">${icon("chat")} Script</button>` : ""}
      </div>
      <div class="path">${u.levels.map(id => nodeHTML(id, u, OFFS[(k++) % OFFS.length])).join("")}</div>
    </section>`).join("")}
  <p class="foot">Sources: Qualifications Aruba (2 March 2026), the team's voice notes (29 Sept 2026), and the Open House pitch deck.</p>`);
  const nfm = $("#nameForm");
  if (nfm) nfm.addEventListener("submit", e => { e.preventDefault(); const v = $("#nm").value.trim().slice(0,30); if (v){ S.name = v; save(false); pushSync(); sfx("ok"); renderLearn(); } });
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
    ${st === "current" && S.name ? `<span class="path-mascot" style="${off > 0 ? "left" : "right"}:calc(50% - ${off > 0 ? 170 : 170}px)">${shoco("idle")}</span>` : ""}
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
    status = L.final ? `Opens when you master the other ${LEVEL_IDS.length - 1} levels.` : `Finish \u201c${byId(prev).name}\u201d first.`;
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
function noteHTML(nt){
  return `<section class="note"><h3>${esc(nt.h)}</h3><ul>${nt.li.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
    ${nt.hear ? `<div class="acts"><button class="btn small ghost" data-seg="${nt.hear.clip}:${nt.hear.from}:${nt.hear.to}">${icon("play")} ${esc(nt.hear.label || "Hear it in the voice notes")}</button></div>` : ""}
    ${nt.sayId ? lineHTML(NLP_LINES[nt.sayId]) : nt.say ? `<p class="line"><span class="quote">"${esc(nt.say)}"</span></p>` : ""}</section>`;
}
function guidebook(id){
  view = "guide"; game = null;
  const L = byId(id), u = unitOf(id);
  const hero = id === "offer" ? `<figure class="photo kb"><img src="img/photos/joia-beach.jpg" alt="Joia by Iberostar on Eagle Beach"><figcaption>Joia by Iberostar, Eagle Beach</figcaption></figure>` : "";
  const steps = L.script ? `<h2>What to say</h2>${L.script.map(i => stepHTML(SCRIPT[i], i)).join("")}` : "";
  const slides = (L.imgs||[]).map(im => `<figure class="deck-slide"><a href="${im.src}" target="_blank" rel="noopener"><img src="${im.src}" width="${im.w}" height="${im.h}" alt="${esc(im.alt)}" loading="lazy"></a><figcaption>${esc(im.cap)} · tap to open full size</figcaption></figure>`).join("");
  const photos = id === "offer" ? `<div class="grid2"><figure class="photo"><img src="img/photos/joia-suite.jpg" alt="A Joia suite" loading="lazy"><figcaption>A suite on the VIP tour</figcaption></figure><figure class="photo"><img src="img/photos/zima.jpg" alt="Zima rooftop bar at Joia" loading="lazy"><figcaption>Zima, Joia's rooftop bar</figcaption></figure></div>` : "";
  const video = L.video ? `<figure class="photo"><video src="${L.video}" poster="${L.poster}" autoplay muted loop playsinline preload="metadata" aria-label="Aerial view of the Tierra del Sol golf course"></video><figcaption>Tierra del Sol, Iberostar's golf course</figcaption></figure>` : "";
  const mapList = L.map ? `<section class="note"><h3>The pitch map</h3><ol class="placed">${MAP_STEPS.map(s => `<li><div>${esc(s.t)}<span>${esc(s.line)}</span></div></li>`).join("")}</ol><p class="small muted">Round 1: tap the steps in order. Round 2: tap the lines in order. One wrong tap and you start over.</p></section>` : "";
  show(`
  <div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><div><p class="eyebrow">Guidebook · Unit ${u.n}</p><h2>${esc(L.name)}</h2></div><span></span></div>
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
function startRun(L, list){ game = { kind:"run", L, list, idx:0, streak:0, xp:0, t0:Date.now() }; renderItem(); }
function lessonTop(pct){
  return `<div class="l-top"><button class="icon-btn" id="quit" aria-label="Quit">${icon("x")}</button>
    <div class="l-bar" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${pct}%"></i></div>
    <span class="heart" id="heart" title="One mistake and you start over">${icon("heart")}<b>1</b></span></div>`;
}
function renderItem(){
  view = "lesson";
  const g = game, it = g.list[g.idx], n = g.list.length;
  g.sel = null; g.checked = false; g.opts = null;
  const kind = it.type === "build" ? "Put the words in order" : it.type === "match" ? "Match the pairs" : it.type === "listen" ? "Listen" : it.scen ? "Which gift?" : it.line ? "Fill in the blank" : it.pic ? "Look and answer" : "Choose the answer";
  show(`<div class="lesson">
    ${lessonTop(g.idx / n * 100)}
    <p class="l-kind">${kind}</p>
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
  if (it.type === "build"){ if (!g.built.length) return; return verdict(g.built.map(i => g.tiles[i]).join(" ") === g.tokens.join(" ")); }
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
  if (ok){
    g.streak++; g.xp += 10; addXP(10); sfx("ok"); buzz(15);
    const bar = app.querySelector(".l-bar i"); if (bar) bar.style.width = ((g.idx + 1) / g.list.length * 100) + "%";
    if ([3,5,10,15,20].includes(g.streak)) combo(g.streak);
  } else {
    sfx("bad"); buzz([40,60,40]);
    const h = $("#heart"); if (h){ h.classList.add("broken"); h.querySelector("b").textContent = "0"; }
    if (QBY[it.id]) S.misses[it.id] = (S.misses[it.id]||0) + 1;
    if (g.L.id !== "daily" && g.idx > (S.best[g.L.id]||0)) S.best[g.L.id] = g.idx;
  }
  save();
  const best = Math.max(g.idx, S.best[g.L.id]||0);
  const sheet = $("#sheet");
  sheet.className = "sheet " + (ok ? "good" : "bad");
  sheet.innerHTML = `<div class="sheet-in">
    <div class="sh-head"><span class="badge">${icon(ok ? "check" : "x")}</span><h3>${ok ? pick(PRAISE) : "Back to the start"}</h3></div>
    ${ok ? "" : `<p class="sh-ans">Correct answer: <b>${esc(answerText(it))}</b></p>`}
    <p class="sh-why">${esc(it.why || "")}</p>
    ${it.hear ? `<div class="acts"><button class="btn small ghost" data-seg="${it.hear.clip}:${it.hear.from}:${it.hear.to}" data-key="hear-${it.id}">${icon("play")} Hear the line</button></div>` : ""}
    ${ok ? "" : `<p class="small">${g.L.id === "daily" ? `You got ${g.idx} in a row.` : `You got ${g.idx} in a row. Your best: ${best} of ${g.list.length}.`} New order next time, and this one comes back early.</p>`}
    <button class="btn wide ${ok ? "good" : "bad"}" id="cont">${ok ? (last ? "Finish" : "Continue") : "Start over"}</button>
    ${!ok && g.L.id !== "daily" && ((g.L.notes && g.L.notes.length) || g.L.script) ? `<button class="link" id="gb">${icon("book")} Open the guidebook first</button>` : ""}
  </div>`;
  requestAnimationFrame(() => sheet.classList.add("show"));
  bindSegButtons(sheet);
  on("#cont", () => { sfx("tap"); ok ? (last ? complete() : (g.idx++, renderItem())) : (g.L.id === "daily" ? startDaily(it) : play(g.L.id, it)); });
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
  if (L.id === "daily"){ bonus = S.daily.last === today() ? 0 : 30; S.daily.last = today(); }
  else {
    const first = !S.mastered[L.id], wasDue = !!reviewInfo(L.id)?.due;
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
    ${goalJust ? `<p class="eyebrow" style="color:var(--fire)">Daily goal reached</p>` : ""}
    <div class="stats">
      <div class="stat c-sun"><div class="h">Total XP</div><div class="v">${icon("star")}<span id="cxp">0</span></div></div>
      <div class="stat c-lagoon"><div class="h">Time</div><div class="v">${icon("bolt")}${fmtT(o.time/1000)}</div></div>
      <div class="stat" style="--c:var(--good);--t:#fff"><div class="h">In a row</div><div class="v">${icon("check")}${o.row}</div></div>
    </div>
    ${o.L && o.L.final ? `<div class="cert"><p class="eyebrow">Show-Up Academy certificate</p><p class="who">${esc(S.name || "Show-Up Pro")}</p><p>Passed the final: ${o.row} questions in a row on the qualifications, the pitch and NLP, with no mistakes.</p><p class="small muted">${esc(date)}</p></div><p class="small muted">Your manager sees this on the team view too.</p>` : ""}
    ${gap ? `<p class="muted">Come back in ${plural(gap,"day")} for a quick review. Spacing it out makes it stick.</p>` : ""}
    <button class="btn wide" id="cont">Continue</button>
  </section>`, { full: true });
  countUp($("#cxp"), o.xp); sfx("win"); buzz([30,40,30,40,80]); confetti();
  on("#cont", () => o.extended ? streakScreen() : tab("learn"));
  timers.push(setTimeout(() => $("#cont")?.focus({ preventScroll:true }), 80));
}
function streakScreen(){
  view = "done";
  const n = streakDays();
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  show(`<section class="celebrate">
    <svg class="flame-big" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS.flame}</svg>
    <h1 style="color:var(--fire)"><span id="sn">0</span> day streak</h1>
    <p class="muted">${n === 1 ? "Day one. Come back tomorrow to keep it going." : "Keep it going tomorrow."}</p>
    <div class="week">${days.map(d => { const on = S.days.includes(dstr(d)); return `<span>${"SMTWTFS"[d.getDay()]}<i class="${on ? "on" : ""}">${on ? icon("check") : ""}</i></span>`; }).join("")}</div>
    <button class="btn wide sun" id="cont">Continue</button>
  </section>`, { full: true });
  countUp($("#sn"), n, 700); sfx("streak");
  on("#cont", () => tab("learn"));
}

/* ---------- Pitch map (order the steps; a wrong tap starts over) ---------- */
function startMap(){ game = { kind:"map", L:byId("map"), round:0, step:0, order:shuffle(MAP_STEPS.map((_, i) => i)), t0:Date.now(), xp:0, locked:false }; renderMap(); }
function renderMap(msg){
  view = "lesson";
  const g = game, total = MAP_STEPS.length*2, done = g.round*MAP_STEPS.length + g.step;
  show(`<div class="lesson">
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
    g.step++; g.xp += 5; addXP(5); sfx("ok"); buzz(12);
    if (g.step === MAP_STEPS.length){
      if (g.round === 0){ g.round = 1; g.step = 0; g.order = shuffle(MAP_STEPS.map((_, k) => k)); save(); return renderMap("Round 1 done. Now the lines you actually say."); }
      return completeMap();
    }
    save(); return renderMap();
  }
  g.locked = true; sfx("bad"); buzz([40,60,40]); btn.classList.add("wrong");
  const h = $("#heart"); if (h){ h.classList.add("broken"); h.querySelector("b").textContent = "0"; }
  const reached = g.round*MAP_STEPS.length + g.step; if (reached > (S.best.map||0)) S.best.map = reached; save();
  const s = MAP_STEPS[g.step], m = app.querySelector(".lm"); if (m) m.dataset.mood = "sad";
  const sheet = $("#sheet"); sheet.className = "sheet bad";
  sheet.innerHTML = `<div class="sheet-in"><div class="sh-head"><span class="badge">${icon("x")}</span><h3>Back to the start</h3></div>
    <p class="sh-ans">Step ${g.step + 1} is <b>${esc(s.t)}</b>: ${esc(s.line)}</p>
    <p class="sh-why">The order: ${MAP_STEPS.map((x, k) => `${k + 1}. ${esc(x.t)}`).join(" · ")}</p>
    <button class="btn wide bad" id="cont">Start over</button></div>`;
  requestAnimationFrame(() => sheet.classList.add("show"));
  on("#cont", startMap);
}
function completeMap(){
  const g = game, first = !S.mastered.map, wasDue = !!reviewInfo("map")?.due;
  const m = S.mastered.map || { count:0, last:0 }; m.count++; m.last = Date.now(); S.mastered.map = m; S.best.map = MAP_STEPS.length*2;
  const bonus = first ? 50 : wasDue ? 30 : 10; addXP(bonus); g.xp += bonus;
  const extended = markActive(); save();
  celebrate({ title: first ? "Level mastered!" : "Review done!", xp: g.xp, time: Date.now() - g.t0, row: MAP_STEPS.length*2, L: g.L, extended });
}

/* ---------- Lightning round (60 s, one mistake ends it) ---------- */
const LG_MS = 60000;
function lightningIntro(){
  view = "lightning"; game = null;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><span></span><span></span></div>
  <section class="celebrate">
    ${shoco("think")}
    <h1 style="color:var(--sea)">Lightning round</h1>
    <p>Qualify as many couples as you can in 60 seconds. One mistake ends it.</p>
    <div class="stats"><div class="stat c-sun"><div class="h">Record</div><div class="v">${icon("bolt")}${S.lightning||0}</div></div><div class="stat c-lagoon"><div class="h">Time</div><div class="v">60s</div></div><div class="stat" style="--c:var(--bad);--t:#fff"><div class="h">Mistakes</div><div class="v">${icon("heart")}1</div></div></div>
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
  game = { kind:"lightning", score:0, end:Date.now() + LG_MS, seen, cur:nextCouple(seen), over:false, lastSec:60 };
  view = "lightning";
  show(`<div class="lesson">
    <div class="l-top"><button class="icon-btn" id="quit" aria-label="Stop">${icon("x")}</button><div class="timer" aria-hidden="true"><i id="fill"></i></div><span class="pill bolt">${icon("bolt")}<b id="sc">0</b></span></div>
    <p class="l-kind">Q, CT or NQ? <span id="secs" class="secs">60s</span></p>
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
    fill.style.transform = `scaleX(${left / LG_MS})`;
    const s = Math.ceil(left / 1000);
    if (s !== g.lastSec){ g.lastSec = s; secs.textContent = s + "s"; if (s <= 10){ fill.classList.add("low"); sfx("tick"); } }
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
    g.cur = nextCouple(g.seen); drawCouple();
    if ([5,10,15,20,25].includes(g.score)) combo(g.score);
  } else { if (btn) btn.classList.add("wrong"); endLightning(choice); }
}
function endLightning(wrong){
  const g = game; g.over = true; cancelAnimationFrame(rafId); rafId = 0;
  const record = g.score > (S.lightning||0);
  if (record) S.lightning = g.score;
  const extended = g.score >= 3 ? markActive() : false;
  save();
  if (wrong){ sfx("bad"); buzz([40,60,40]); } else sfx("win");
  view = "lightning"; game = null;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><span></span><span></span></div>
  <section class="celebrate">
    ${shoco(record ? "cheer" : wrong ? "sad" : "happy")}
    <h1 style="color:var(--sea)">${record ? "New record!" : plural(g.score, "couple")}</h1>
    <p class="muted">${wrong ? "One mistake ends the round." : "Time's up."}</p>
    <div class="stats"><div class="stat c-lagoon"><div class="h">This round</div><div class="v">${g.score}</div></div><div class="stat c-sun"><div class="h">Record</div><div class="v">${icon("bolt")}${S.lightning}</div></div><div class="stat"><div class="h">XP</div><div class="v">${icon("star")}${g.score*5}</div></div></div>
    ${wrong ? `<div class="card" style="text-align:left;width:100%"><p class="eyebrow">The couple</p>${scenarioHTML({ chips: g.cur.chips, q: g.cur.q })}<p>You said <b>${esc(GRADE[wrong])}</b>. Right answer: <b>${esc(GRADE[g.cur.g])}</b>.</p><p class="muted">${esc(g.cur.why)}</p></div>` : ""}
    <button class="btn wide sea" id="again">Play again</button>
    <button class="btn wide ghost" id="home">Back</button>
  </section>`, { full: true });
  if (record) confetti();
  on("#back", () => tab("games")); on("#home", () => extended ? streakScreen() : tab("games")); on("#again", startLightning);
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
    ${s.extra ? `<div class="line" style="border-left-color:var(--sea);background:var(--sea-soft)"><p class="lbl" style="color:var(--sea-2)">From the voice notes</p><p class="note" style="color:var(--ink)">${esc(s.extra.text)}</p><div class="acts"><button class="btn small ghost" data-seg="${s.extra.clip}:${s.extra.from}:${s.extra.to}">${icon("play")} ${esc(s.extra.label)}</button></div></div>` : ""}
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
  <header class="stack" style="padding-top:12px"><h1>Games</h1><p class="muted">Speed and memory. Every game you finish counts for your streak.</p></header>
  <article class="tile-card c-lagoon" style="--c:var(--sea);--soft:var(--sea-soft)"><div class="ico">${icon("bolt")}</div><div><h3>Lightning round</h3><p class="small muted">${lightningOpen() ? `60 seconds. Record: ${S.lightning||0} couples.` : "Opens after \u201cWho qualifies?\u201d"}</p></div>${lightningOpen() ? `<button class="btn small sea" id="lg">Play</button>` : icon("lock")}</article>
  <article class="tile-card c-sun"><div class="ico">${icon("calendar")}</div><div><h3>Daily 10</h3><p class="small muted">${dailyOpen() ? (S.daily.last === today() ? "Done today. Play again for practice." : "Ten questions. Your misses come back more.") : "Opens after your first mastered level."}</p></div>${dailyOpen() ? `<button class="btn small sun" id="dy">Play</button>` : icon("lock")}</article>
  <article class="tile-card c-flamingo"><div class="ico">${icon("route")}</div><div><h3>Pitch map</h3><p class="small muted">${unlocked("map") ? "Put the pitch in order, then the lines." : "Opens after \u201cMake it solid\u201d"}</p></div>${unlocked("map") ? `<button class="btn small flamingo" id="mp">Play</button>` : icon("lock")}</article>
  <article class="tile-card"><div class="ico">${icon("headphones")}</div><div><h3>Voice notes</h3><p class="small muted">${CLIPS.filter(c => S.listened[c.id]).length} of ${CLIPS.length} heard</p></div><button class="btn small ghost" id="vn">Listen</button></article>`);
  on("#lg", lightningIntro); on("#dy", () => startDaily()); on("#mp", () => play("map")); on("#vn", () => tab("script", "notes"));
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
    <div class="statbox" style="color:var(--flamingo)">${icon("mic")}<b style="color:var(--ink)">${linesPracticed()}</b><span>script lines said</span></div>
  </section>
  <section class="card"><p class="eyebrow">This week</p><div class="week">${days.map(d => { const on = S.days.includes(dstr(d)); return `<span>${"SMTWTFS"[d.getDay()]}<i class="${on ? "on" : ""}">${on ? icon("check") : ""}</i></span>`; }).join("")}</div></section>
  ${weak.length ? `<section class="card weak"><p class="eyebrow">Your weak spots</p><ul>${weak.map(([id, n]) => `<li>${esc(QBY[id].q)}<br><span class="ans">${esc(answerText(QBY[id]))}</span> <span class="small muted">· missed ${n}×</span></li>`).join("")}</ul></section>` : ""}
  <section class="card"><h3>Send my progress</h3><p class="small muted">Your manager already sees your progress when you're online. You can also send it on WhatsApp.</p><button class="btn ghost" id="rp">${icon("share")} Make my report</button></section>
  <section class="card"><h3>How this works</h3>
    <ul class="small" style="padding-left:20px;display:flex;flex-direction:column;gap:6px">
      <li>Short lessons in a new random order every time. One mistake and you start over, with the right answer and why.</li>
      <li>Pulling the answer out of your head is what builds memory. Re-reading doesn't.</li>
      <li>Levels come back for review after 1, 3, 7, 14 and 30 days. Spacing it out makes it stick.</li>
      <li>Hear the lines from the voice notes, then say them out loud in the Script tab.</li>
    </ul></section>
  <section class="row">
    <button class="btn small ghost" id="snd">${icon(S.sound ? "sound" : "mute")} Sound ${S.sound ? "on" : "off"}</button>
    ${S.name ? `<button class="btn small ghost" id="rename">Change name</button>` : ""}
    <button class="btn small ghost" id="mgr">${icon("chart")} Manager view</button>
  </section>
  <p class="foot" id="resetBox"><button class="link" id="reset">Reset my progress on this phone</button></p>`);
  const nfm = $("#nameForm");
  if (nfm) nfm.addEventListener("submit", e => { e.preventDefault(); const v = $("#nm").value.trim().slice(0,30); if (v){ S.name = v; save(false); pushSync(); renderMe(); } });
  on("#rp", report); on("#mgr", coach);
  on("#snd", () => { S.sound = !S.sound; save(false); sfx("tap"); renderMe(); });
  on("#rename", () => { S.name = ""; save(false); renderMe(); });
  on("#reset", () => {
    $("#resetBox").innerHTML = `<span>Erase all progress on this phone?</span> <button class="btn small ghost" id="no">Keep it</button> <button class="btn small bad" id="yes">Erase</button>`;
    on("#no", renderMe);
    on("#yes", () => { const keep = { name:S.name, sound:S.sound, coach:S.coach, sync:S.sync, mgr:S.mgr }; S = Object.assign(blank(), keep); save(); renderMe(); });
  });
}

/* ---------- WhatsApp report ---------- */
const b64e = s => { const b = new TextEncoder().encode(s); let bin = ""; b.forEach(c => bin += String.fromCharCode(c)); return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); };
const b64d = s => { s = s.replace(/-/g,"+").replace(/_/g,"/"); while (s.length % 4) s += "="; const bin = atob(s); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); };
function reportText(){
  const lv = id => { const L = byId(id); return S.mastered[id] ? `${L.name} ✔` : S.best[id] ? `${L.name} ${S.best[id]}/${levelTotal(L)}` : `${L.name} –`; };
  const p = payload(); p.n = (S.name||"").slice(0,30);
  const miss = topMisses(3).map(([id, n]) => { const q = QBY[id].q; return `"${q.length > 60 ? q.slice(0,58) + "…" : q}" (${n}×)`; });
  return [
    `Show-Up Academy progress`,
    `Name: ${S.name || "(no name set)"}`,
    `Rank: ${rank()} · ${nf(S.xp)} XP`,
    ...TRACKS.map(t => `${t.title}: ${t.levels.map(lv).join(" · ")}`),
    `Final run: ${S.mastered.final ? "passed ✔" : "not yet"}`,
    `Script lines said: ${linesPracticed()} of ${Object.keys(SCRIPT_LINES).length}`,
    `Lightning record: ${plural(S.lightning||0,"couple")} · streak ${plural(streakDays(),"day")}`,
    miss.length ? `Needs work: ${miss.join("; ")}` : `Needs work: nothing missed yet`,
    `#SUA1-${b64e(JSON.stringify(p))}`
  ].join("\n");
}
function report(){
  view = "report"; game = null;
  const txt = reportText();
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><div><p class="eyebrow">For your manager</p><h2>My progress report</h2></div><span></span></div>
  <p>Send this on WhatsApp. The code on the last line lets the manager view read it.</p>
  <textarea class="report" id="rt" readonly aria-label="Progress report">${esc(txt)}</textarea>
  <div class="row"><a class="btn sun" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">${icon("share")} WhatsApp</a><button class="btn ghost" id="cp">Copy</button></div>`, { full: true });
  on("#back", () => tab("me"));
  on("#cp", () => { const ta = $("#rt"); const fb = () => { ta.focus(); ta.select(); toast("Selected. Press and hold to copy."); };
    try { navigator.clipboard.writeText(txt).then(() => toast("Copied. Paste it into WhatsApp."), fb); } catch(e){ fb(); } });
}
/* Everything about other people comes from their phones (the team list, pasted reports),
   so none of it is trusted: names are cut to plain text and every number is clamped. */
const num = (v, max) => Number.isFinite(+v) ? Math.max(0, Math.min(max, Math.round(+v))) : 0;
const cleanName = v => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 40) || "No name";
function cleanStats(p){
  p = p && typeof p === "object" && !Array.isArray(p) ? p : {};
  const lv = o => Object.fromEntries(LEVEL_IDS.map(id => [id, num(o && typeof o === "object" ? o[id] : 0, 999)]));
  const w = Array.isArray(p.w) ? p.w.filter(x => Array.isArray(x) && typeof x[0] === "string" && QBY[x[0]]).slice(0, 10).map(x => [x[0], num(x[1], 9999)]) : [];
  return { x:num(p.x,1e7), m:lv(p.m), b:lv(p.b), l:num(p.l,999), d:num(p.d,9999), h:num(p.h,CLIPS.length), sl:num(p.sl,999), w, t:num(p.t,4e12) };
}
function person(name, stats, extra){
  const mastered = LEVEL_IDS.filter(id => stats.m[id]).length;
  return Object.assign({ name: cleanName(name), stats, xp: stats.x, mastered, final: !!stats.m.final }, extra);
}
function teamRows(rows){
  return (Array.isArray(rows) ? rows : []).filter(r => r && typeof r === "object")
    .map(r => person(r.name, cleanStats(r.stats), { device: String(r.device || ""), updated: typeof r.updated === "string" ? r.updated : "" }));
}
function parseReports(text){
  const out = [], re = /#SUA1-([A-Za-z0-9_-]{8,6000})/g; let m;
  while ((m = re.exec(text))){
    try {
      const p = JSON.parse(b64d(m[1]));
      if (!p || typeof p !== "object" || Array.isArray(p)) continue;
      const stats = cleanStats(p), name = cleanName(p.n);
      out.push(person(name, stats, { device: "report:" + name.toLowerCase(), updated: stats.t, pasted: true }));
    } catch(e){}
  }
  return out;
}

/* ---------- Manager view ---------- */
function coachLogin(msg){
  view = "coach"; game = null;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><div><p class="eyebrow">Managers</p><h2>Team view</h2></div><span></span></div>
  <div class="say-row">${shoco("think")}<div class="bubble">Enter the manager code to see who knows it all.</div></div>
  <form class="name-form" id="codeForm"><label for="code" class="eyebrow" style="flex-basis:100%">Manager code</label><input class="field" id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX"><button class="btn">Open</button></form>
  ${msg ? `<p class="small" style="color:var(--bad-ink)">${esc(msg)}</p>` : ""}
  <p class="small muted">The code stays on this phone so you don't have to type it again.</p>`, { full: true });
  on("#back", () => tab("me"));
  $("#codeForm").addEventListener("submit", e => { e.preventDefault(); const v = $("#code").value.trim(); if (v){ S.mgr = v; save(false); coach(); } });
}
async function coach(){
  if (!S.mgr) return coachLogin();
  view = "coach"; game = null;
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><div><p class="eyebrow">Managers</p><h2>Team view</h2></div><span></span></div>
  <div class="say-row">${shoco("think")}<div class="bubble">Loading the team…</div></div>`, { full: true });
  on("#back", () => tab("me"));
  try {
    const rows = await rpc("sua_team", { p_code: S.mgr });
    if (view === "coach") renderTeam(Array.isArray(rows) ? rows : []);
  } catch(e){
    if (view !== "coach") return;
    if (/wrong code/.test(e.message)){ S.mgr = ""; save(false); coachLogin("That code didn't work. Check it and try again."); }
    else renderTeam(null, TEAM_HOST ? "Couldn't reach the team list. Check the internet and refresh. Pasted WhatsApp reports still work below."
      : `The team list opens on the team link: ${TEAM_URL} Pasted WhatsApp reports work here too.`);
  }
}
const AV = ["--lagoon","--flamingo","--sea","--sun-2","--good-2","--flamingo-2","--lagoon-2"];
function avatarColor(name){ let h = 0; for (const c of name) h = (h*31 + c.charCodeAt(0)) >>> 0; return `var(${AV[h % AV.length]})`; }
function renderTeam(rows, err){
  const pasted = Object.values(S.coach || {}).filter(r => r && typeof r === "object")
    .map(r => person(r.name, cleanStats(r.stats), { device: "report:" + cleanName(r.name).toLowerCase(), updated: num(r.stats && r.stats.t, 4e12), pasted: true }));
  const people = teamRows(rows).concat(pasted).sort((a, b) => (b.final - a.final) || (b.mastered - a.mastered) || (b.xp - a.xp));
  const names = {}; people.forEach(p => { const k = p.name.toLowerCase(); names[k] = (names[k] || 0) + 1; });
  people.forEach(p => p.dupe = names[p.name.toLowerCase()] > 1);
  const know = people.filter(p => p.final), almost = people.filter(p => !p.final && p.mastered >= 8), learning = people.filter(p => !p.final && p.mastered >= 1 && p.mastered < 8), fresh = people.filter(p => !p.final && !p.mastered);
  const week = people.filter(p => p.updated && Date.now() - new Date(p.updated).getTime() < 7*DAY).length;
  const agg = {}; people.forEach(p => (p.stats && Array.isArray(p.stats.w) ? p.stats.w : []).forEach(([id, n]) => { if (QBY[id]) agg[id] = (agg[id]||0) + (+n||0); }));
  const teamWeak = Object.entries(agg).sort((a,b) => b[1]-a[1]).slice(0,6);
  const group = (title, ic, color, list) => list.length ? `<div class="group-h" style="color:${color}">${icon(ic)}<h3>${title} · ${list.length}</h3></div>${list.map(personHTML).join("")}` : "";
  show(`<div class="l-top"><button class="icon-btn" id="back" aria-label="Back">${icon("x")}</button><div><p class="eyebrow">Managers</p><h2>Team view</h2></div><button class="icon-btn" id="refresh" aria-label="Refresh">${icon("refresh")}</button></div>
  ${err ? `<p class="card small" style="color:var(--bad-ink)">${esc(err)}</p>` : ""}
  <section class="summary"><div><b>${people.length}</b><span>people</span></div><div><b style="color:var(--sun-2)">${know.length}</b><span>know it all</span></div><div><b style="color:var(--sea)">${week}</b><span>active this week</span></div></section>
  ${people.length ? "" : `<div class="say-row">${shoco("idle")}<div class="bubble">Nobody yet. When your team opens the app and saves their name, they show up here with their progress.</div></div>`}
  ${group("Knows it all", "crown", "var(--sun-2)", know)}
  ${group("Almost there", "flame", "var(--fire)", almost)}
  ${group("Learning", "book", "var(--sea)", learning)}
  ${group("Not started", "user", "var(--muted)", fresh)}
  ${teamWeak.length ? `<section class="card weak"><p class="eyebrow">What the team misses most</p><p class="small muted">Coach these at the next meeting.</p><ul>${teamWeak.map(([id, n]) => `<li>${esc(QBY[id].q)}<br><span class="ans">${esc(answerText(QBY[id]))}</span> <span class="small muted">· missed ${n}×</span></li>`).join("")}</ul></section>` : ""}
  <details class="card"><summary>Add a report from WhatsApp</summary><p class="small muted">For people who sent their report by message.</p><textarea class="report" id="paste" placeholder="Paste messages that end with #SUA1-"></textarea><button class="btn small" id="add">Add reports</button></details>
  <details class="card"><summary>Change the manager code</summary><form class="name-form" id="newCode"><input class="field" id="nc" autocomplete="off" autocapitalize="characters" placeholder="New code, 6+ letters or numbers"><button class="btn small">Save</button></form><p class="small muted">Everyone using the old code will need the new one.</p></details>
  <p class="foot"><button class="link" id="forget">Forget the code on this phone</button></p>`, { full: true });
  on("#back", () => tab("me")); on("#refresh", coach);
  on("#forget", () => { S.mgr = ""; save(false); coachLogin(); });
  on("#add", () => { const got = parseReports($("#paste").value); if (!got.length){ toast("No report codes found. Each report ends with #SUA1-."); return; } S.coach = S.coach || {}; got.forEach(r => S.coach[r.device] = r); save(false); toast(`Added ${plural(got.length, "report")}.`); coach(); });
  $("#newCode").addEventListener("submit", async e => { e.preventDefault(); const v = $("#nc").value.trim(); try { await rpc("sua_set_code", { p_code: S.mgr, p_new: v }); S.mgr = v; save(false); toast("Code changed."); } catch(err){ toast(/too short/.test(err.message) ? "Use at least 6 letters or numbers." : "Couldn't change the code."); } });
  app.querySelectorAll("[data-person]").forEach(b => b.onclick = () => { const d = b.parentElement.querySelector(".pdetail"); d.hidden = !d.hidden; b.setAttribute("aria-expanded", String(!d.hidden)); });
  app.querySelectorAll("[data-hide]").forEach(b => b.onclick = async () => {
    if (b.dataset.armed !== "1"){ b.dataset.armed = "1"; b.textContent = "Tap again to hide"; return; }
    try { await rpc("sua_hide", { p_code: S.mgr, p_device: b.dataset.hide }); toast("Hidden. If that phone plays again, it comes back."); coach(); } catch(e){ toast("Couldn't hide that entry."); }
  });
}
function personHTML(p){
  const st = p.stats || {}, m = st.m || {}, name = String(p.name || "No name");
  const done = LEVEL_IDS.filter(id => m[id]).length;
  return `<article class="person">
    <button data-person aria-expanded="false"><span class="avatar" style="background:${avatarColor(name)}">${esc(name.slice(0,1).toUpperCase())}</span>
      <span><span class="pname">${esc(name)}</span><br><span class="psub"><span class="dots" aria-label="${done} of ${LEVEL_IDS.length} levels">${LEVEL_IDS.map(id => `<i class="${m[id] ? "on" : ""}"></i>`).join("")}</span> ${done}/${LEVEL_IDS.length} · ${p.pasted ? "from WhatsApp" : "active " + esc(ago(p.updated))}</span></span>
      <span class="pstreak${st.d ? "" : " off"}" title="Day streak">${icon("flame")}<b>${num(st.d, 9999)}</b></span></button>
    <div class="pdetail" hidden>
      <div class="grid2"><div class="statbox" style="color:var(--sun-2)">${icon("star")}<b style="color:var(--ink)">${nf(st.x||p.xp||0)}</b><span>XP</span></div><div class="statbox" style="color:var(--fire)">${icon("flame")}<b style="color:var(--ink)">${num(st.d, 9999)}</b><span>day streak</span></div><div class="statbox" style="color:var(--sea)">${icon("bolt")}<b style="color:var(--ink)">${num(st.l, 999)}</b><span>Lightning record</span></div><div class="statbox" style="color:var(--flamingo)">${icon("mic")}<b style="color:var(--ink)">${num(st.sl, 999)}/${Object.keys(SCRIPT_LINES).length}</b><span>script lines said</span></div></div>
      <ul class="lvl-list">${LEVEL_IDS.map(id => `<li><span>${esc(byId(id).name)}</span>${m[id] ? `<span class="ok-t">mastered${m[id] > 1 ? ` ×${num(m[id], 999)}` : ""}</span>` : `<span class="no-t">${st.b && st.b[id] ? `best ${Math.min(num(st.b[id], 999), levelTotal(byId(id)))}/${levelTotal(byId(id))}` : "not yet"}</span>`}</li>`).join("")}</ul>
      ${Array.isArray(st.w) && st.w.length ? `<div><p class="eyebrow">Misses most</p><ul class="weak" style="padding-left:18px">${st.w.filter(([id]) => QBY[id]).slice(0,5).map(([id, n]) => `<li>${esc(QBY[id].q)} <span class="small muted">· ${num(n, 9999)}×</span><br><span class="ans">${esc(answerText(QBY[id]))}</span></li>`).join("")}</ul></div>` : ""}
      ${p.dupe ? `<p class="small muted">Another entry has the same name. If it's the same person on a new phone, hide the older one.</p>` : ""}
      ${p.pasted ? "" : `<button class="btn small ghost" data-hide="${esc(p.device)}">Hide this entry</button>`}
    </div>
  </article>`;
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

/* =====================================================================
   BOOT
   ===================================================================== */
buildTabs();
tab(S.tab);
if (S.name) queueSync();
