/* =====================================================================
   STREET PRACTICE
   An AI tourist couple to pitch by voice or typing, then Shoco's score.
   Two ways to run it, same couples and rules (street-core.js):
   - In the Claude version of the app, the couple and Shoco run on the viewer's
     own Claude account (the "sample" capability), so it's free for the team.
     The phone can't reach the team list from there, so the score page offers a
     link that adds the result to the team app.
   - On the team link, the sua-roleplay Edge Function runs them with the owner's
     API key. Until a key is added it answers "off", and the page points to the
     Claude version instead.
   ===================================================================== */
const RP_URL = `${SB.url}/functions/v1/sua-roleplay`;
const CLAUDE_URL = "https://claude.ai/artifact/Ejc8Grqk3BR9Y1avEkbAYY";
const RP_FOCUS = [["any", "Surprise me"], ["friendly", "Friendly"], ["skeptical", "Skeptical"], ["hurry", "In a hurry"],
  ["brush", "Don't want to talk"], ["objections", "Lots of objections"], ["nq", "Might not qualify"]];
const RP_KEYS = RPCORE.STEP_KEYS;
const RP_W = { open: 10, why: 10, news: 10, offer: 10, time: 10, number: 10, plan: 10, lockin: 15 };
const RP_LABEL = Object.fromEntries(RP_KEYS.map((k, i) => [k, i ? MAP_STEPS[i - 1].t : "Stop them, break the ice"]));
const RP_PTS = { good: 1, weak: .5, missed: 0 };
const RP_ST = { good: ["Good", "good"], weak: ["Almost", "weak"], missed: ["Missed", "missed"], na: ["Didn't apply", "na"] };
const RP_ASK = [["from", "Where from"], ["age", "Ages"], ["together", "Married or together"], ["work", "Work"], ["card", "Card"],
  ["stay", "Where they stay"], ["leave", "When they leave"], ["plans", "Plans"], ["tour", "Recent tour"]];
const RP_MOOD = RPCORE.MOOD_LABEL;
const isMood = k => typeof k === "string" && Object.prototype.hasOwnProperty.call(RP_MOOD, k);
const RP_CALL = { Q: "Q (full gift)", CT: "CT (half gift)", NQ: "NQ (no gift)", "?": "didn't find out" };
const RP_MSG = {
  off: "On this link, Street practice needs your manager to switch it on. It's free in the Claude version of the app.",
  noclaude: "Claude isn't allowed to run here. Tap Allow when Claude asks, or check this page's permissions.",
  claudelimit: "You've reached your Claude limit for now. Try again later.",
  signin: "Sign in to Claude again, then try once more.",
  limit: "That's all your practice chats for today. Come back tomorrow.",
  team: "The team has used all of today's practice chats. Come back tomorrow.",
  auth: "Your phone isn't on the team list yet. Check your name in Me, then try again.",
  busy: "The couple didn't catch that. Try again in a moment.",
  refused: "They didn't answer that. Say it another way.",
  over: "This chat is over.",
  unheard: "Didn't catch that. Say it again.",
  noear: "Voice isn't working right now. Type your line instead.",
  net: "No connection. Check your internet and try again.",
  error: "Something went wrong. Try again."
};
let RP = null;

async function rpCall(op, body = {}){
  ident();
  let r;
  try {
    r = await fetch(RP_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: SB.key },
      body: JSON.stringify({ op, device: S.sync.device, secret: S.sync.secret, ...body }) });
  } catch(e){ throw Object.assign(new Error("net"), { code: "net" }); }
  const j = await r.json().catch(() => null);
  if (r.status === 404) throw Object.assign(new Error("off"), { code: "off" });
  if (!r.ok || !j || j.err){ const code = j && RP_MSG[j.err] ? j.err : "error"; throw Object.assign(new Error(code), { code }); }
  return j;
}

/* The Claude version: Claude's own "sample" capability, on the viewer's account. null elsewhere. */
let RP_SAMPLE;
function rpSampler(){
  if (RP_SAMPLE !== undefined) return Promise.resolve(RP_SAMPLE);
  const c = window.claude;
  if (!c || typeof c.use !== "function") return Promise.resolve(RP_SAMPLE = null);
  return Promise.resolve().then(() => c.use("sample")).then(fn => (RP_SAMPLE = fn || null), () => (RP_SAMPLE = null));
}
/* One call to Claude for JSON, with its error codes turned into ours. */
async function rpAsk(input, opts){
  try { return await RP_SAMPLE.json(input, opts); }
  catch(e){
    const code = e && e.code;
    const ours = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code) ? "noclaude"
      : code === "rate_limited" ? "claudelimit" : code === "session_expired" ? "signin" : code === "refused" ? "refused" : code === "cancelled" ? "cancelled" : "busy";
    throw Object.assign(new Error(ours), { code: ours });
  }
}
const rpMsg = e => RP_MSG[e && e.code] || RP_MSG.error;
const capFirst = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/* ---------- Their voices (read aloud) ----------
   With the server's voice on, each line comes back as an mp3 in a natural voice and plays here.
   Otherwise (or if one fails), the phone's own voice reads it. */
const TTS = window.speechSynthesis || null;
const SILENT = "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";
let SPEAK_ID = 0, PLAYER = null;
function stopSpeak(){
  SPEAK_ID++;
  try { TTS && TTS.cancel(); } catch(e){}
  try { PLAYER && PLAYER.pause(); } catch(e){}
  if (RP) RP.playing = false;
}
function rpVoice(lang, sex){
  const vs = (TTS ? TTS.getVoices() : []).filter(v => (v.lang || "").toLowerCase().startsWith(lang));
  const fem = /female|samantha|victoria|karen|moira|tessa|fiona|allison|ava|susan|zira|monica|paulina|marisol|helena|sabina|lucia|laura|joana/i;
  const male = /\bmale|alex|daniel|fred|tom\b|aaron|arthur|oliver|diego|jorge|juan|carlos|david|mark|rishi|reed|eddy/i;
  const good = v => /natural|neural|premium|enhanced|google|siri/i.test(v.name) ? 1 : 0;
  vs.sort((a, b) => good(b) - good(a));
  return (sex === "f" ? vs.find(v => fem.test(v.name)) : vs.find(v => male.test(v.name) && !/female/i.test(v.name))) || vs[0] || null;
}
/* Phones only play sound after a tap. Every tap that can lead to their answer calls this first. */
function earUnlock(){
  earCtx();
  if (!PLAYER){ PLAYER = new Audio(); PLAYER.setAttribute("playsinline", ""); PLAYER.preload = "auto"; }
  if (!PLAYER.dataset.ok){ PLAYER.dataset.ok = "1"; PLAYER.src = SILENT; const p = PLAYER.play(); p && p.catch(() => { PLAYER.dataset.ok = ""; }); }
}
/* One line in the phone's own voice. Some phones never say they've finished: check every half second, up to 30 seconds. */
function sayPhone(l, cb){
  let over = false; const end = () => { if (!over){ over = true; cb(); } };
  if (!TTS || !RP){ timers.push(setTimeout(end, 400)); return; }
  const lang = RP.scene.lang === "es" ? "es" : "en", p = RP.scene.people[l.who === "B" ? 1 : 0] || RP.scene.people[0];
  const u = new SpeechSynthesisUtterance(l.text), v = rpVoice(lang, p.sex);
  if (v){ u.voice = v; u.lang = v.lang; } else u.lang = lang === "es" ? "es-MX" : "en-US";
  u.pitch = p.sex === "m" ? .9 : 1.1; u.rate = 1.03;
  u.onend = u.onerror = end;
  try { TTS.speak(u); } catch(e){ return end(); }
  let n = 0; const check = () => { if (over) return; if ((TTS.speaking || TTS.pending) && ++n < 60) timers.push(setTimeout(check, 500)); else end(); };
  timers.push(setTimeout(check, 900));
}
/* One line in a natural voice. cb(false) if it can't play, so the phone's voice takes over. */
function sayNatural(b64, cb){
  let over = false, url = "";
  const end = ok => { if (over) return; over = true; PLAYER.onended = PLAYER.onerror = null; try { URL.revokeObjectURL(url); } catch(e){} cb(ok); };
  try { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); url = URL.createObjectURL(new Blob([u8], { type: "audio/mpeg" })); }
  catch(e){ return cb(false); }
  PLAYER.onended = () => end(true);
  PLAYER.onerror = () => end(false);
  try { PLAYER.srcObject = null; } catch(e){}
  PLAYER.src = url;
  const p = PLAYER.play(); p && p.catch(() => end(false));
  timers.push(setTimeout(() => end(true), 30000));
}
/* done() runs once they've finished speaking (or right away when voices are off): talk mode listens again then.
   Stopping them (a new line, a tap on the mic) cancels done(). */
function speakLines(lines, done, audios){
  stopSpeak();
  const id = SPEAK_ID;
  const fin = () => { if (id !== SPEAK_ID) return; SPEAK_ID++; if (RP) RP.playing = false; rpTalking(-1); if (done) done(); };
  if (S.rpVoice === false || !RP || (!TTS && !audios)){ timers.push(setTimeout(fin, 400)); return; }
  RP.playing = true;
  // Only the phone's voice: queue every line at once (iPhones speak a queue more reliably than one line per callback).
  if (!audios || !audios.some(Boolean)){
    if (!TTS) return fin();
    const lang = RP.scene.lang === "es" ? "es" : "en";
    lines.forEach((l, j) => {
      const i = l.who === "B" ? 1 : 0, p = RP.scene.people[i] || RP.scene.people[0];
      const u = new SpeechSynthesisUtterance(l.text), v = rpVoice(lang, p.sex);
      if (v){ u.voice = v; u.lang = v.lang; } else u.lang = lang === "es" ? "es-MX" : "en-US";
      u.pitch = p.sex === "m" ? .9 : 1.1; u.rate = 1.03;
      u.onstart = () => { if (id === SPEAK_ID){ rpTalking(i); rpStatus(`${rpWho(i)} is talking…`, "talk"); } };
      if (j === lines.length - 1) u.onend = u.onerror = fin;
      try { TTS.speak(u); } catch(e){}
    });
    if (lines[0]){ const i = lines[0].who === "B" ? 1 : 0; rpTalking(i); rpStatus(`${rpWho(i)} is talking…`, "talk"); }
    let n = 0; const check = () => { if (id !== SPEAK_ID) return; if ((TTS.speaking || TTS.pending) && ++n < 80) timers.push(setTimeout(check, 500)); else fin(); };
    timers.push(setTimeout(check, 900));
    return;
  }
  let k = 0;
  const next = () => {
    if (id !== SPEAK_ID || !RP) return;
    if (k >= lines.length) return fin();
    const l = lines[k], a = audios && audios[k]; k++;
    const i = l.who === "B" ? 1 : 0;
    rpTalking(i); rpStatus(`${rpWho(i)} is talking…`, "talk");
    const phone = () => { if (id === SPEAK_ID) sayPhone(l, next); };
    if (a && PLAYER) sayNatural(a, ok => ok === false ? phone() : next()); else phone();
  };
  next();
}
if (TTS) try { TTS.getVoices(); TTS.addEventListener?.("voiceschanged", () => {}); } catch(e){}

/* ---------- Your voice, heard by the server ----------
   When the server listens (RP.ear), the phone records with its own microphone and works out when you've
   stopped talking: 1.2 seconds of quiet after at least a moment of speech. Nothing is sent if you said nothing. */
const EAR_OK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
const EAR = { ctx: null, rec: null, stream: null, src: null, chunks: [], send: false, spoke: 0, tick: 0, gen: 0, opening: false };
let RP_EAR = false;
function earCtx(){
  const C = window.AudioContext || window.webkitAudioContext;
  if (!EAR.ctx && C) try { EAR.ctx = new C(); } catch(e){}
  try { if (EAR.ctx && EAR.ctx.state !== "running") EAR.ctx.resume(); } catch(e){}
  return EAR.ctx;
}
function earLevel(v){ const b = $("#rpTalk"); if (b) b.style.setProperty("--lvl", v.toFixed(2)); }
async function earListen(){
  if (!RP || !RP.ear || RP.busy || RP.state !== "talking" || EAR.rec || EAR.opening) return;
  stopSpeak();
  EAR.opening = true;
  rpMicUI(true); rpHint("Listening… just talk. It sends when you pause.");
  rpStatus("Listening…", "listen"); const heard = $("#rpHeard"); if (heard) heard.textContent = "";
  let stream = null;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch(e){
    EAR.opening = false;
    if (!RP) return;
    RP.talk = false; rpMicUI(false);
    const m = e && e.name === "NotAllowedError" ? "The microphone is blocked. Allow it for this site in your phone's settings, or type." : "Couldn't start the microphone. Type your line instead.";
    rpStatus(m); toast(m); return;
  }
  EAR.opening = false;
  if (!RP || !RP.talk || RP.busy || RP.state !== "talking" || !$("#rpLog")){ stream.getTracks().forEach(t => t.stop()); if (RP) rpMicUI(false); return; }
  // iPhones record AAC in mp4 best; everything else, Opus in webm.
  const apple = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Android/.test(navigator.userAgent);
  const type = (apple ? ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"] : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]).find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || "";
  let rec;
  try { rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 48000 }); }
  catch(e){ try { rec = new MediaRecorder(stream); } catch(e2){ stream.getTracks().forEach(t => t.stop()); RP.talk = false; rpMicUI(false); toast("This phone can't record here. Type your line instead."); return; } }
  const gen = ++EAR.gen;
  Object.assign(EAR, { rec, stream, chunks: [], send: false, spoke: 0 });
  rec.ondataavailable = e => { if (e.data && e.data.size && EAR.gen === gen) EAR.chunks.push(e.data); };
  rec.onstop = () => earDone(gen, rec);
  let an = null;
  const ctx = earCtx();
  if (ctx) try { EAR.src = ctx.createMediaStreamSource(stream); an = ctx.createAnalyser(); an.fftSize = 1024; EAR.src.connect(an); } catch(e){ an = null; }
  try { rec.start(250); } catch(e){ earStop(false); RP.talk = false; toast("Couldn't start the microphone."); return; }
  sfx("tap");
  if (!an){ rpMicUI(true, true); return; }   // no level meter: tap the mic when you've finished
  const buf = new Float32Array(an.fftSize), t0 = performance.now();
  let floor = 0.006, last = t0, loud = 0;
  const tick = () => {
    if (EAR.gen !== gen || !EAR.rec) return;
    const now = performance.now(), dt = now - last; last = now;
    an.getFloatTimeDomainData(buf);
    let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const lvl = Math.sqrt(sum / buf.length);
    const thr = Math.max(0.012, floor * 2.6);
    if (lvl > thr){ EAR.spoke += dt; loud = now; }
    floor = lvl < floor ? floor * .7 + lvl * .3 : floor * .995 + lvl * .005;   // follows the street noise: down fast, up slowly
    earLevel(Math.min(1, lvl / (thr * 3)));
    if (EAR.spoke > 300 && now - loud > 1200) return earStop(true);   // you paused: send it
    if (EAR.spoke <= 300 && now - t0 > 9000) return earStop(false);   // nothing said
    if (now - t0 > 40000) return earStop(true);                        // long enough
    EAR.tick = setTimeout(tick, 50);
  };
  tick();
}
function earStop(send){
  clearTimeout(EAR.tick);
  if (!EAR.rec){ if (EAR.stream){ EAR.stream.getTracks().forEach(t => t.stop()); EAR.stream = null; } return; }
  EAR.send = send;
  try { if (EAR.rec.state !== "inactive") EAR.rec.stop(); else earDone(EAR.gen, EAR.rec); } catch(e){ earDone(EAR.gen, EAR.rec); }
}
function earDone(gen, rec){
  if (gen !== EAR.gen || EAR.rec !== rec) return;
  const send = EAR.send, chunks = EAR.chunks, type = rec.mimeType || (chunks[0] && chunks[0].type) || "audio/mp4";
  EAR.rec = null; EAR.chunks = [];
  try { EAR.src && EAR.src.disconnect(); } catch(e){} EAR.src = null;
  if (EAR.stream){ EAR.stream.getTracks().forEach(t => t.stop()); EAR.stream = null; }
  earLevel(0);
  if (!RP || !$("#rpLog")) return;
  const blob = send && chunks.length ? new Blob(chunks, { type }) : null;
  if (blob && blob.size > 1200){
    rpMicUI(false);
    const fr = new FileReader();
    fr.onload = () => { const b64 = String(fr.result || "").split(",")[1] || ""; if (RP && b64) rpSend("", null, { audio: b64, mime: type }); };
    fr.readAsDataURL(blob);
    return;
  }
  // Nothing heard: listen once more, then wait for a tap.
  if (RP.talk && RP.state === "talking" && !RP.busy){
    if (++RP.idle <= 1){ timers.push(setTimeout(earListen, 200)); return; }
    RP.talk = false; rpMicUI(false); rpHint("Talk mode paused. Tap the mic to keep talking."); rpStatus("Didn't hear you. Tap the mic to talk."); return;
  }
  rpMicUI(false); rpHint();
}
/* Everything quiet: no voices, no microphone. show() calls it whenever the screen changes. */
function rpHush(){ stopSpeak(); stopRec(); if (LV.pc) liveClose(); if (EAR.rec || EAR.stream){ EAR.gen++; const r = EAR.rec; EAR.rec = null; clearTimeout(EAR.tick); try { r && r.state !== "inactive" && r.stop(); } catch(e){} try { EAR.src && EAR.src.disconnect(); } catch(e){} EAR.src = null; if (EAR.stream){ EAR.stream.getTracks().forEach(t => t.stop()); EAR.stream = null; } } }
/* ---------- Live call ----------
   The fluent way: the phone opens a call (WebRTC) straight to OpenAI's speech-to-speech model, which plays the
   couple with the same knowledge and reactions as the typed one. It answers in about a second and stops when you
   talk over it. The server only hands out a one-minute key for the call (op "live") and stores what was said
   (op "live_save"); Shoco (Claude) scores it after, as usual. If the call can't connect, the recorded way
   (earListen) takes over. */
const LIVE_OK = !!(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const LIVE_MAX_MS = 8 * 60 * 1000;
const LV = { pc: null, dc: null, stream: null, gen: 0, timers: [], open: false, muted: false, slots: new Map(), from: 0, end: "" };
let RP_LIVE = false;
const lvLater = (fn, ms) => { LV.timers.push(setTimeout(fn, ms)); };
function liveClose(){
  LV.gen++;
  LV.timers.forEach(clearTimeout); LV.timers = []; clearTimeout(LV.quiet);
  try { LV.dc && LV.dc.close(); } catch(e){}
  try { LV.pc && LV.pc.close(); } catch(e){}
  if (LV.stream) LV.stream.getTracks().forEach(t => t.stop());
  try { if (PLAYER && PLAYER.srcObject){ PLAYER.pause(); PLAYER.srcObject = null; } } catch(e){}
  Object.assign(LV, { pc: null, dc: null, stream: null, open: false, muted: false });
  LV.slots.clear();
  if (RP) RP.playing = false;
}
function liveUI(){
  const on = !!LV.pc, live = on && !LV.muted;
  ["#rpMic", "#rpTalk"].forEach(sel => { const btn = $(sel); if (!btn) return;
    btn.classList.toggle("listening", live); btn.classList.toggle("muted", on && LV.muted); btn.setAttribute("aria-pressed", String(live));
    btn.setAttribute("aria-label", !on ? "Start the call" : LV.muted ? "Unmute" : "Mute"); btn.innerHTML = icon(on && LV.muted ? "micoff" : "mic"); });
  const lab = $("#rpMicLabel"); if (lab) lab.textContent = !on ? "Tap to start the call" : !LV.open ? "Connecting…" : LV.muted ? "Muted · tap to talk" : "Live · just talk";
}
/* Start the call: key from the server, microphone, then the connection. Their voice plays through PLAYER,
   which the tap that got here unlocked. */
async function liveStart(){
  if (!RP || !RP.live || RP.busy || RP.state !== "talking" || LV.pc) return;
  const gen = ++LV.gen;
  RP.busy = true; LV.end = "";
  if (RP.saving){ try { await RP.saving; } catch(e){} RP.saving = null; if (gen !== LV.gen) return; }
  LV.from = RP.log.length;
  rpStatus("Connecting…", "think"); rpHint("Connecting the call…");
  LV.pc = {}; liveUI();
  let k, stream;
  try {
    k = await rpCall("live", { chat: RP.chat });
    if (gen !== LV.gen) return;
    RP.turns = k.turns;
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    if (gen !== LV.gen){ stream.getTracks().forEach(t => t.stop()); return; }
  } catch(e){ if (gen === LV.gen) liveFail(e && e.name === "NotAllowedError" ? { code: "mic" } : e); return; }
  const pc = new RTCPeerConnection();
  Object.assign(LV, { pc, stream });
  pc.ontrack = e => { if (gen !== LV.gen || !PLAYER) return; try { PLAYER.src = ""; } catch(x){} PLAYER.srcObject = e.streams[0]; const pr = PLAYER.play(); pr && pr.catch(() => {}); };
  stream.getTracks().forEach(t => pc.addTrack(t, stream));
  const dc = pc.createDataChannel("oai-events"); LV.dc = dc;
  dc.onmessage = e => { if (gen !== LV.gen) return; let m; try { m = JSON.parse(e.data); } catch(x){ return; } liveEvent(m); };
  dc.onopen = () => {
    if (gen !== LV.gen) return;
    LV.open = true; RP.busy = false; RP.talk = true; liveUI();
    rpStatus("Say hello. Just talk.", "listen");
    rpHint("It's a live call: just talk, and they answer right away. Tap the mic to mute. Tap Done when you've finished.");
    lvLater(() => { if (gen === LV.gen){ toast("That's 8 minutes. Let's see how you did."); rpEnd("done"); } }, LIVE_MAX_MS);
    sfx("tap");
  };
  pc.onconnectionstatechange = () => { if (gen === LV.gen && ["failed", "closed"].includes(pc.connectionState) && RP && !LV.end) liveFail({ code: "drop" }); };
  lvLater(() => { if (gen === LV.gen && !LV.open) liveFail({ code: "noconnect" }); }, 15000);
  try {
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    const r = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, headers: { Authorization: `Bearer ${k.key}`, "Content-Type": "application/sdp" } });
    const sdp = await r.text();
    if (gen !== LV.gen) return;
    if (!r.ok) throw Object.assign(new Error("noconnect"), { code: "noconnect" });
    await pc.setRemoteDescription({ type: "answer", sdp });
  } catch(e){ if (gen === LV.gen) liveFail(e && e.code ? e : { code: "noconnect" }); }
}
/* The call didn't work: say why, then carry on the slower way (recorded voice), or typing. */
function liveFail(e){
  const saving = LV.from < RP.log.length ? liveSave() : null;
  liveClose();
  if (!RP) return;
  RP.busy = false; RP.talk = false;
  const code = e && e.code;
  if (["off", "limit", "team", "auth"].includes(code)){ RP.state = "ended"; toast(rpMsg(e)); timers.push(setTimeout(streetIntro, 2400)); return; }
  if (code === "over"){ RP.live = false; liveUI(); rpMicUI(false); return; }
  if (code === "mic"){ liveUI(); rpStatus("The microphone is blocked. Allow it for this site in your phone's settings, or type."); return; }
  RP.live = false;
  const m = code === "drop" ? "The call dropped." : "The live call couldn't connect.";
  toast(RP.ear ? `${m} Switching to the slower voice: tap the mic and talk.` : `${m} Type your line instead.`);
  if (!RP.ear && !SR) rpMode(false);
  rpMicUI(false); liveUI();
  if (saving) RP.saving = saving;
}
/* Who said what, kept in order: a slot opens when you stop talking or they start answering, and fills in when
   the words arrive (yours come a moment later, from transcription). */
function liveSlot(id, me){
  if (!id) return null;
  let s = LV.slots.get(id);
  if (!s){
    const entry = me ? { me: "" } : { them: [{ who: "A", text: "" }], cue: "" };
    RP.log.push(entry);
    s = { entry, el: me ? rpMe("…") : null }; LV.slots.set(id, s);
  }
  return s;
}
function liveEvent(m){
  if (!RP) return;
  switch (m.type){
    case "input_audio_buffer.speech_started":
      rpTalking(-1); RP.playing = false; rpStatus("You're talking…", "listen"); break;
    case "input_audio_buffer.speech_stopped": case "input_audio_buffer.committed":
      liveSlot(m.item_id, true); break;
    case "conversation.item.input_audio_transcription.completed": {
      const s = liveSlot(m.item_id, true), t = String(m.transcript || "").replace(/\s+/g, " ").trim().slice(0, 400);
      if (!s) break;
      s.entry.me = t; if (s.el){ const p = s.el.querySelector("p"); if (p) p.textContent = t || "…"; }
      if (t) rpLearn(t);
      break;
    }
    case "response.created":
      liveSlot("r:" + (m.response && m.response.id), false);
      if (!RP.playing) rpStatus("They're thinking…", "think");
      break;
    case "output_audio_buffer.started":
      RP.playing = true; rpTalking(0); rpStatus(`${rpWho(0)} is talking…`, "talk"); break;
    case "output_audio_buffer.stopped": case "output_audio_buffer.cleared":
      clearTimeout(LV.quiet);
      RP.playing = false; rpTalking(-1);
      if (LV.end) return liveFinish();
      rpStatus("Your turn. Just talk.", "listen"); break;
    case "response.output_audio_transcript.delta":
      // Some connections never send the audio-buffer events: the first words of their transcript mean they've started.
      if (!RP.playing){ RP.playing = true; rpTalking(0); rpStatus(`${rpWho(0)} is talking…`, "talk"); }
      clearTimeout(LV.quiet);
      break;
    case "response.done":
      // ...and then guess when they've finished: about 65 ms a character after the reply is complete.
      clearTimeout(LV.quiet);
      if (RP.playing){ const s = LV.slots.get("r:" + (m.response && m.response.id)), n = s && s.entry.them ? s.entry.them[0].text.length : 40;
        LV.quiet = setTimeout(() => { if (RP && RP.playing && LV.pc){ liveEvent({ type: "output_audio_buffer.stopped" }); } }, 1500 + n * 65); }
      break;
    case "response.output_audio_transcript.done": {
      const s = liveSlot("r:" + m.response_id, false), t = String(m.transcript || "").replace(/\s+/g, " ").trim().slice(0, 400);
      if (!s || !t) break;
      s.entry.them[0].text = t;
      rpThem(s.entry.them[0]); rpLearn(t);
      const k = RP.log.indexOf(s.entry), mine = [...RP.log.slice(0, k)].reverse().find(e => "me" in e);
      rpCaption(s.entry.them, "", mine ? mine.me : "");
      break;
    }
    case "response.function_call_arguments.done": {
      if (m.name !== "status") break;
      let a = {}; try { a = JSON.parse(m.arguments || "{}"); } catch(e){}
      RP.booked = a.booked === true;
      if (a.state === "left" || a.state === "ended"){ LV.end = a.state; lvLater(() => { if (LV.end) liveFinish(); }, 7000); }
      try { LV.dc.send(JSON.stringify({ type: "conversation.item.create", item: { type: "function_call_output", call_id: m.call_id, output: "{\"ok\":true}" } })); } catch(e){}
      break;
    }
  }
}
/* What was said on this call goes to the server, so the coach (or typing on) can read it. */
function liveSave(){
  const items = [];
  for (const e of RP.log.slice(LV.from)){
    if ("me" in e && e.me) items.push({ me: true, text: e.me });
    else if (e.them && e.them[0].text) items.push({ text: e.them[0].text });
  }
  const last = [...items].reverse().find(i => !i.me);
  if (last){ last.booked = !!RP.booked; if (LV.end) last.state = LV.end; }
  LV.from = RP.log.length;
  if (!items.length) return Promise.resolve(null);
  const chat = RP.chat, state = LV.end || "talking";
  const send = () => rpCall("live_save", { chat, items, state }).then(r => { if (RP && RP.chat === chat){ RP.turns = r.turns; RP.resave = null; } return r; },
    e => { if (RP && RP.chat === chat) RP.resave = send; throw e; });
  return send();
}
/* They walked off or said goodbye: hang up and go to the score. */
function liveFinish(){
  if (!RP || !LV.pc) return;
  RP.state = LV.end || RP.state;
  rpEnd(RP.state === "talking" ? "done" : RP.state);
}
/* Hang up (Done, typing instead, leaving): stop the call and keep what was said. */
function liveStop(){
  if (!LV.pc) return null;
  const saving = LV.open || LV.from < RP.log.length ? liveSave() : null;
  liveClose(); liveUI();
  if (RP){ RP.busy = false; RP.talk = false; }
  return saving;
}

/* After their answer: in talk mode, listen again. */
function rpResume(){ if (RP && RP.talk && RP.state === "talking" && !RP.busy) (RP.ear ? earListen() : rpListen()); }

/* ---------- Setup ---------- */
async function rpReady(){
  if (!S.name) return false;
  if (!S.sync.ok) await pushSync();
  return !!S.sync.ok;
}
function streetIntro(){
  view = "street"; game = null; stopSpeak();
  const f = S.rpFocus || "any", lang = S.rpLang || "en";
  const inClaude = !!(window.claude && typeof window.claude.use === "function");
  const chips = (name, list, cur) => list.map(([k, l]) => `<label class="pchip"><input type="radio" name="${name}" value="${k}"${k === cur ? " checked" : ""}><span>${esc(l)}</span></label>`).join("");
  show(`<div class="lesson rp">
    <div class="l-top"><button class="icon-btn" id="rpBack" aria-label="Back to games">${icon("x")}</button><h1>Street practice</h1><span></span></div>
    <div class="say-row">${shoco("idle")}<div class="bubble">A couple walks by. Stop them, pitch, and book them. If they don't qualify, let them go nicely. I'll score you at the end.</div></div>
    <fieldset class="rp-pick"><legend class="eyebrow">Who walks by?</legend><div class="pchips">${chips("focus", RP_FOCUS, f)}</div></fieldset>
    <fieldset class="rp-pick"><legend class="eyebrow">Language</legend><div class="pchips">${chips("lang", [["en", "English"], ["es", "Español"]], lang)}</div></fieldset>
    ${S.name || inClaude ? "" : `<div class="stack"><label for="rpName" class="eyebrow">Your name</label><input class="field" id="rpName" autocomplete="name" maxlength="30" placeholder="First name + last initial"><p class="small muted">Your manager sees your practice scores.</p></div>`}
    <ul class="small rp-how">
      <li>${SR || EAR_OK ? "It's a voice call: tap the mic once and talk, like on the street. They answer out loud, then it listens again. Turn on captions or type if it's loud." : "Type, or use the mic on your keyboard."}</li>
      <li>Find out who they are on the way: where they're from, ages, work, card, hotel, when they leave.</li>
      <li>Tap Done when you've finished. If they walk away, that's the end too.</li></ul>
    <div class="l-foot rp-foot"><p class="small muted" id="rpLeft" aria-live="polite"></p><button class="btn wide" id="rpGo">Start</button></div>
  </div>`, { full: true });
  on("#rpBack", () => tab("games"));
  const left = $("#rpLeft"), go = $("#rpGo");
  const toClaude = () => { $("#rpName")?.closest(".stack")?.remove(); left.innerHTML = `${esc(RP_MSG.off)} <a href="${CLAUDE_URL}" target="_blank" rel="noopener">Open the Claude version</a>`; go.disabled = true; };
  if (inClaude){
    left.textContent = "Checking…"; go.disabled = true;
    rpSampler().then(fn => {
      if (view !== "street" || !$("#rpLeft")) return;
      if (fn){ left.textContent = "Free: it runs on your own Claude account. The first time, Claude asks you to allow it."; go.disabled = false; }
      else left.innerHTML = TEAM_HOST ? "" : `Street practice needs Claude, and it can't run on this page. Sign in to your Claude account and open <a href="${CLAUDE_URL}" target="_blank" rel="noopener">the Claude version</a>.`;
    });
    on("#rpGo", () => {
      const focus = app.querySelector("input[name=focus]:checked")?.value || "any", lg = app.querySelector("input[name=lang]:checked")?.value || "en";
      S.rpFocus = focus; S.rpLang = lg; save(false);
      const c = RPCORE.makeCouple(RPCORE.FOCUS.includes(focus) ? focus : "any", lg === "es" ? "es" : "en");
      streetChat({ chat: "", max: 24, left: null, scene: RPCORE.sceneOut(c) }, c);
    });
    return;
  }
  if (!TEAM_HOST){ left.innerHTML = `Street practice works on the team link: <a href="${TEAM_URL}">${esc(TEAM_URL)}</a>`; go.disabled = true; return; }
  if (S.name){
    left.textContent = "Checking…";
    rpReady().then(ok => ok ? rpCall("status") : Promise.reject({ code: "auth" }))
      .then(j => { RP_EAR = !!j.voice; RP_LIVE = !!j.live; if (view !== "street" || !$("#rpLeft")) return; left.textContent = j.teamFull ? RP_MSG.team : j.left ? `${plural(j.left, "practice chat")} left today.` : RP_MSG.limit; if (!j.left || j.teamFull) go.disabled = true; })
      .catch(e => { if (view !== "street" || !$("#rpLeft")) return; if (e.code === "off") return toClaude(); left.textContent = rpMsg(e); });
  }
  // No name yet: still ask the function, so a switched-off practice says so before anyone types a name.
  else rpCall("status").catch(e => { if (e.code === "off" && view === "street" && $("#rpLeft")) toClaude(); });
  on("#rpGo", async () => {
    earUnlock();   // the Start tap: lets their voices play later
    const focus = app.querySelector("input[name=focus]:checked")?.value || "any", lg = app.querySelector("input[name=lang]:checked")?.value || "en";
    S.rpFocus = focus; S.rpLang = lg;
    if (!S.name){
      const v = ($("#rpName")?.value || "").trim().slice(0, 30);
      if (!v){ $("#rpName")?.focus(); left.textContent = "Add your name first."; return; }
      S.name = v;
    }
    save(false);
    go.disabled = true; go.textContent = "Starting…"; left.textContent = "";
    try {
      if (!await rpReady()) throw { code: navigator.onLine === false ? "net" : "auth" };
      const j = await rpCall("start", { focus, lang: lg }); RP_EAR = !!j.voice; RP_LIVE = !!j.live;
      streetChat(j);
    } catch(e){
      if (!$("#rpGo")) return;
      go.textContent = "Start";
      if (e.code === "off") return toClaude();
      go.disabled = e.code === "limit" || e.code === "team"; left.textContent = rpMsg(e);
    }
  });
}

/* ---------- The chat ---------- */
function rpWho(i){
  const ppl = RP.scene.people, p = ppl[i] || ppl[0];
  if (RP.known.has(i)) return p.name;
  const base = p.sex === "m" ? "He" : "She";
  return ppl.length === 2 && ppl[0].sex === ppl[1].sex && p.look ? `${base}, ${p.look}` : base;
}
function rpAvatar(i){ return RP.known.has(i) ? esc(RP.scene.people[i].name.slice(0, 1)) : icon("user"); }
function rpLearn(text){
  RP.scene.people.forEach((p, i) => {
    if (RP.known.has(i) || !new RegExp(`(^|[^\\p{L}])${p.name}($|[^\\p{L}])`, "iu").test(text)) return;
    RP.known.add(i);
    app.querySelectorAll(`[data-p="${i}"] .rp-who`).forEach(el => el.textContent = p.name);
    app.querySelectorAll(`[data-p="${i}"] .rp-av, [data-p="${i}"] .rp-face`).forEach(el => el.innerHTML = rpAvatar(i));
  });
}
function rpAppend(html, cls){
  const log = $("#rpLog"); if (!log) return null;
  const el = document.createElement("div"); el.className = cls; el.innerHTML = html; log.appendChild(el);
  el.scrollIntoView({ block: "end", behavior: reduced() ? "auto" : "smooth" });
  return el;
}
const rpMe = text => rpAppend(`<p>${esc(text)}</p>`, "rp-msg me");
function rpThem(l){
  const i = l.who === "B" ? 1 : 0;
  const el = rpAppend(`<span class="rp-av" aria-hidden="true">${rpAvatar(i)}</span><div class="rp-b"><b class="rp-who">${esc(rpWho(i))}</b><p>${esc(l.text)}</p></div>`, `rp-msg them p${i}`);
  if (el) el.dataset.p = i;
}
const rpCue = text => rpAppend(`${icon("eye")}<span>${esc(text)}</span>`, "rp-cue");
/* The voice call: faces, a status line and captions instead of chat bubbles. The bubbles still fill the
   hidden log, so "Type instead" shows the whole conversation so far. */
/* On short phones the stage scrolls; keep the newest words in view. */
function rpStageEnd(){ const st = $(".rp-stage"); if (st && st.scrollHeight > st.clientHeight) st.scrollTop = st.scrollHeight; }
function rpStatus(t, state = ""){ const el = $("#rpStatus"); if (el){ el.textContent = t; el.dataset.state = state; rpStageEnd(); } }
function rpTalking(i){ app.querySelectorAll(".rp-person").forEach(el => el.classList.toggle("talking", +el.dataset.p === i)); }
function rpCaption(lines, cue, me){
  const cap = $("#rpCap"); if (!cap) return;
  const cc = S.rpCC || S.rpVoice === false;
  const mine = cc && me ? `<span class="rp-said me"><b>You:</b> ${esc(me)}</span>` : "";
  const said = cc ? lines.map(l => `<span class="rp-said"><b>${esc(rpWho(l.who === "B" ? 1 : 0))}:</b> ${esc(l.text)}</span>`).join("") : "";
  cap.innerHTML = mine + (cue ? `<span class="rp-sees">${icon("eye")}${esc(cue)}</span>` : "") + said;
  rpStageEnd();
}
function rpMode(call){
  const root = app.querySelector(".rp"); if (!root || !RP) return;
  RP.call = call; S.rpMode = call ? "voice" : "text"; save(false);
  root.classList.toggle("call", call);
  if (!call && LV.pc){ RP.saving = liveStop(); if (RP.saving){ RP.busy = true; rpComposer(false); RP.saving.catch(() => {}).finally(() => { if (RP){ RP.busy = false; rpComposer(RP.state === "talking"); } }); } }
  if (!call && (RP.talk || REC || EAR.rec)){ RP.talk = false; RP.sendOnEnd = false; stopRec(); if (EAR.rec) earStop(false); rpMicUI(false); }
  if (!call) timers.push(setTimeout(() => { $("#rpText")?.focus({ preventScroll: true }); $("#rpLog")?.lastElementChild?.scrollIntoView({ block: "end" }); }, 50));
}
function rpHint(text){ const h = $("#rpHint"); if (h) h.textContent = text || (RP && (RP.ear || SR) ? "Tap the mic once and just talk. It sends when you pause and listens again after they answer." : "Type your line, or use the mic on your keyboard."); }
function rpComposer(on){
  ["#rpText", "#rpSend", "#rpMic"].forEach(s => { const el = $(s); if (el) el.disabled = !on; });
}
function rpGrow(){ const t = $("#rpText"); if (!t) return; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 150) + "px"; }

function streetChat(j, couple){
  RP = { chat: j.chat, max: j.max || 24, left: j.left == null ? null : Math.max(0, j.left - 1), scene: j.scene, log: [], busy: false, state: "talking", booked: false, turns: 0, known: new Set(), saved: false,
    couple: couple || null, core: [], playing: false, idle: 0 };
  RP.ear = !RP.couple && RP_EAR && EAR_OK;   // the server hears you and speaks for them
  RP.tts = !RP.couple && RP_EAR;              // natural voices, even when typing
  RP.live = !RP.couple && RP_LIVE && LIVE_OK;  // a live call: the fluent way
  const talkable = RP.live || RP.ear || !!SR;
  RP.call = talkable && S.rpMode !== "text";
  view = "street"; game = { kind: "street" };
  const sc = j.scene, who = sc.people.length > 1 ? "A couple" : sc.people[0].sex === "m" ? "A man" : "A woman";
  show(`<div class="lesson rp${RP.call ? " call" : ""}">
    <div class="l-top"><button class="icon-btn" id="rpQuit" aria-label="Leave the chat">${icon("x")}</button>
      <div class="rp-title"><p class="eyebrow">Street practice</p><h1>${esc(sc.time)}</h1></div>
      <div class="rp-tools"><button class="icon-btn" id="rpVoice" aria-pressed="${S.rpVoice !== false}" aria-label="Read their lines aloud">${icon(S.rpVoice !== false ? "sound" : "mute")}</button>
      <button class="btn small ghost" id="rpDone">Done</button></div></div>
    <section class="rp-scene" aria-label="What you see">
      <p class="tag-h">${icon("pin")}${esc(capFirst(sc.place))}</p>
      <p>${who} walks toward you, heading ${esc(sc.heading)}.</p>
      <ul>${sc.cues.map(c => `<li>${icon("eye")}<span>${esc(c)}</span></li>`).join("")}</ul>
      ${sc.lang === "es" ? `<p class="small muted">This one is in Spanish. Pitch in Spanish.</p>` : ""}
    </section>
    ${talkable ? `<section class="rp-stage" aria-label="The call">
      <div class="rp-people">${sc.people.map((p, i) => `<div class="rp-person p${i}" data-p="${i}"><span class="rp-face" aria-hidden="true">${rpAvatar(i)}</span><b class="rp-who">${esc(rpWho(i))}</b><span class="rp-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>`).join("")}</div>
      <p class="rp-cap" id="rpCap"></p>
      <p class="rp-status" id="rpStatus" aria-live="polite">Tap the mic and say hello.</p>
      <p class="rp-heard" id="rpHeard"></p>
    </section>
    <div class="l-foot rp-callbar">
      <button type="button" class="rp-bigmic" id="rpTalk" aria-pressed="false" aria-label="Talk">${icon("mic")}</button>
      <p class="rp-miclabel" id="rpMicLabel" aria-hidden="true">Tap to talk</p>
      <div class="rp-callopts"><button type="button" class="rp-opt" id="rpCC" aria-pressed="${!!S.rpCC}"><span class="cc">CC</span>Captions</button><button type="button" class="rp-opt" id="rpType">${icon("chat")}Type instead</button></div>
    </div>` : ""}
    <div class="rp-log" id="rpLog" role="log" aria-label="The conversation"></div>
    <form class="l-foot rp-say" id="rpForm" autocomplete="off">
      <label for="rpText" class="sr-only">Your line</label>
      <textarea class="field" id="rpText" rows="1" maxlength="600" placeholder="Say your line…" enterkeyhint="send"></textarea>
      ${talkable ? `<button type="button" class="rp-mic" id="rpMic" aria-pressed="false" aria-label="Talk">${icon("mic")}</button>` : ""}
      <button class="rp-send" id="rpSend" aria-label="Send">${icon("send")}</button>
      <p class="small muted rp-hint" id="rpHint"></p>
      ${talkable ? `<button type="button" class="link rp-tocall" id="rpToCall">${icon("mic")} Switch to a voice call</button>` : ""}
    </form>
  </div><div class="sheet" id="sheet" aria-live="polite"></div>`, { full: true });
  rpHint();
  const box = $("#rpText");
  box.addEventListener("input", rpGrow);
  box.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); rpSend(box.value); } });
  $("#rpForm").addEventListener("submit", e => { e.preventDefault(); rpSend(box.value); });
  on("#rpMic", rpMic);
  on("#rpTalk", rpMic);
  on("#rpType", () => rpMode(false));
  on("#rpToCall", () => rpMode(true));
  on("#rpCC", () => { S.rpCC = !S.rpCC; save(false); $("#rpCC").setAttribute("aria-pressed", String(S.rpCC));
    const k = RP.log.map(e => !!e.them).lastIndexOf(true); if (k >= 0) rpCaption(RP.log[k].them, RP.log[k].cue, RP.ear && RP.log[k - 1] ? RP.log[k - 1].me : ""); });
  on("#rpVoice", () => { S.rpVoice = S.rpVoice === false; save(false); const b = $("#rpVoice"); b.setAttribute("aria-pressed", String(S.rpVoice)); b.innerHTML = icon(S.rpVoice ? "sound" : "mute");
    if (S.rpVoice) earUnlock(); else if (RP.playing){ stopSpeak(); rpTalking(-1); rpStatus(RP.talk ? "" : "Your turn."); rpResume(); } });
  on("#rpDone", () => rpEnd("done"));
  on("#rpQuit", rpQuit);
  if (RP.live){ liveUI(); rpStatus("Tap the mic to start the call."); }
  if (!RP.call) timers.push(setTimeout(() => box.focus({ preventScroll: true }), 120));
}

/* Your line: typed (raw), sent again after an error (retry, the bubble), or recorded (clip: { audio, mime }) for the server to hear. */
async function rpSend(raw, retry, clip){
  const text = clip ? "" : String(raw || "").replace(/\s+/g, " ").trim().slice(0, 600);
  if ((!text && !clip) || !RP || RP.busy || RP.state !== "talking") return;
  RP.busy = true; stopSpeak(); rpComposer(false);
  if (!clip) earUnlock();   // typing and tapping Send is a tap too
  if (REC){ RP.sendOnEnd = false; stopRec(); }
  let mine = retry;
  if (clip) mine = null;
  else if (!retry){ rpLearn(text); mine = rpMe(text); const b = $("#rpText"); if (b){ b.value = ""; rpGrow(); } }
  else retry.querySelector(".rp-err")?.remove();
  rpStatus("They're thinking…", "think"); const cap0 = $("#rpCap"); if (cap0) cap0.textContent = "";
  const typing = rpAppend(`<span class="rp-av" aria-hidden="true">${icon("user")}</span><div class="rp-b"><span class="dots" role="img" aria-label="They're answering"><i></i><i></i><i></i></span></div>`, "rp-msg them typing");
  const voice = !!RP.tts && S.rpVoice !== false;
  try {
    const r = RP.couple ? await rpLocalTurn(text) : await rpCall("turn", clip ? { chat: RP.chat, audio: clip.audio, mime: clip.mime, voice } : { chat: RP.chat, text, voice });
    typing?.remove();
    if (!RP || !$("#rpLog")) return;
    const said = clip ? String(r.heard || "").slice(0, 600) : text;
    if (clip){ rpLearn(said); rpMe(said); }
    RP.log.push({ me: said }, { them: r.lines, cue: r.cue });
    RP.turns = r.turns; RP.state = r.state; RP.booked = !!r.booked;
    r.lines.forEach(l => rpLearn(l.text));
    r.lines.forEach(rpThem);
    if (r.cue) rpCue(r.cue);
    rpCaption(r.lines, r.cue, clip ? said : ""); const heard = $("#rpHeard"); if (heard) heard.textContent = "";
    rpStatus(RP.state === "talking" ? (S.rpVoice === false ? "Your turn." : "") : "");
    RP.idle = 0;
    speakLines(r.lines, rpResume, Array.isArray(r.audio) ? r.audio : null);
    sfx("tap");
    if (RP.state !== "talking") timers.push(setTimeout(() => rpEnd(RP.state), 1400));
    else rpHint(RP.max - RP.turns <= 4 ? `${plural(RP.max - RP.turns, "line")} left in this chat.` : "");
  } catch(e){
    typing?.remove();
    if (!RP || !$("#rpLog")) return;
    // Only noise in the recording: nothing was used up, just listen again.
    if (e.code === "unheard"){
      RP.busy = false;
      rpStatus(RP_MSG.unheard);
      if (RP.talk && ++RP.idle <= 2){ timers.push(setTimeout(earListen, 900)); return; }
      RP.talk = false; rpMicUI(false); rpStatus(RP_MSG.unheard); return;
    }
    // The server's ears broke (say, a bad key): carry on with the phone's own, or typing.
    if (e.code === "noear"){ RP.ear = false; RP.tts = false; RP.talk = false; rpMicUI(false); toast(RP_MSG.noear); if (!SR) rpMode(false); rpStatus(SR ? "Tap the mic to talk." : ""); return; }
    RP.talk = false; rpMicUI(false);
    if (RP.call && !["refused", "over", "cancelled", "off", "limit", "team", "auth", "noclaude", "signin"].includes(e.code)){
      const cap = $("#rpCap");
      if (cap){ cap.innerHTML = `<span class="rp-err-call">${esc(rpMsg(e))}</span> <button type="button" class="link" id="rpRetry">${icon("refresh")}Send again</button>`;
        on("#rpRetry", () => { cap.textContent = ""; clip ? rpSend("", null, clip) : rpSend(text, mine); }); }
      rpStatus("");
    }
    if (RP.call && e.code === "refused") rpStatus("Say that a different way.");
    if (e.code === "refused"){ mine?.remove(); const b = $("#rpText"); if (b && text){ b.value = text; rpGrow(); } toast(RP_MSG.refused); }
    else if (e.code === "over"){ RP.state = "ended"; rpEnd("ended"); }
    else if (e.code === "cancelled") mine?.remove();
    else if (["off", "limit", "team", "auth", "noclaude", "signin"].includes(e.code)){ RP.state = "ended"; toast(rpMsg(e)); timers.push(setTimeout(streetIntro, 2400)); }
    else if (mine){
      const err = document.createElement("p"); err.className = "rp-err";
      err.innerHTML = `<span>${esc(rpMsg(e))}</span> <button type="button" class="link">${icon("refresh")}Send again</button>`;
      err.querySelector("button").onclick = () => rpSend(text, mine);
      mine.appendChild(err);
    }
    else if (clip && !RP.call){
      const err = rpAppend(`<span>${esc(rpMsg(e))}</span> <button type="button" class="link">${icon("refresh")}Send again</button>`, "rp-err");
      if (err) err.querySelector("button").onclick = () => { err.remove(); rpSend("", null, clip); };
    }
  } finally {
    if (RP){ RP.busy = false; rpComposer(RP.state === "talking"); if (RP.state === "talking" && !RP.call) $("#rpText")?.focus({ preventScroll: true }); }
  }
}

/* The Claude version: one quick call per turn, on the viewer's account. Same shape as the API's reply. */
async function rpLocalTurn(text){
  const wrap = RP.turns + 1 >= RP.max - 1;
  const raw = await rpAsk(RPCORE.sampleTurns(RP.couple, RP.core, text, wrap), { modelTier: "quick", cache: false });
  const reply = RPCORE.normReply(raw, RP.couple.people.length === 1);
  if (!reply) throw Object.assign(new Error("busy"), { code: "busy" });
  if (RP.turns + 1 >= RP.max && reply.state === "talking") reply.state = "ended";
  RP.core.push({ o: text }, { c: reply });
  return { lines: reply.lines, cue: reply.cue, state: reply.state, booked: reply.booked, turns: RP.turns + 1 };
}

/* Talk mode: tap the mic once and talk. A pause sends the line; after their answer is read aloud,
   the mic listens again by itself. Tap the mic again to stop (anything already heard is sent).
   With RP.ear the phone records and the server listens (earListen); otherwise the browser's own
   speech recognition does (rpListen). */
function rpMicUI(on, manual){
  ["#rpMic", "#rpTalk"].forEach(sel => { const btn = $(sel); if (!btn) return;
    btn.classList.toggle("listening", on); btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", on ? (manual ? "Send" : "Stop talking") : "Talk"); btn.innerHTML = icon(on ? (manual ? "send" : "stop") : "mic"); });
  const lab = $("#rpMicLabel"); if (lab) lab.textContent = on ? (manual ? "Recording · tap when you're done" : "Listening · tap to pause") : "Tap to talk";
  if (!on && RP && !RP.busy && RP.state === "talking" && !REC && !EAR.rec && !RP.playing) rpStatus(RP.talk ? "Your turn." : "Tap the mic to talk.");
}
function rpMic(){
  if (!RP || !($("#rpMic") || $("#rpTalk"))) return;
  earUnlock();
  // A live call: the first tap starts it, then the mic mutes and unmutes.
  if (RP.live && RP.call){
    if (!LV.pc) return liveStart();
    if (!LV.open) return;
    LV.muted = !LV.muted; if (LV.stream) LV.stream.getTracks().forEach(t => t.enabled = !LV.muted);
    liveUI(); rpStatus(LV.muted ? "Muted. Tap the mic to talk." : "Your turn. Just talk.", LV.muted ? "" : "listen"); return;
  }
  // While they're talking, a tap cuts in: they stop and it listens.
  if (RP.playing && !RP.busy && RP.state === "talking"){ stopSpeak(); rpTalking(-1); RP.talk = true; RP.idle = 0; return RP.ear ? earListen() : rpListen(); }
  if (RP.ear){
    if (EAR.rec || EAR.opening){ RP.talk = false; if (EAR.rec) earStop(EAR.spoke > 300 || !EAR.src); else rpMicUI(false); rpHint(); return; }
    if (RP.talk){ RP.talk = false; rpMicUI(false); rpHint(); return; }
    if (RP.busy || RP.state !== "talking") return;
    RP.talk = true; RP.idle = 0; earListen(); return;
  }
  if (RP.talk || REC){ RP.talk = false; if (REC){ RP.sendOnEnd = true; try { REC.stop(); } catch(e){} } else { rpMicUI(false); rpHint(); } return; }
  if (RP.busy || RP.state !== "talking") return;
  RP.talk = true; RP.idle = 0; rpListen();
}
function rpListen(){
  const box = $("#rpText");
  if (!box || !RP || RP.busy || RP.state !== "talking" || REC) return;
  stopSpeak();
  const before = box.value.trim();
  try { REC = new SR(); } catch(e){ RP.talk = false; toast("This browser can't listen. Type your line instead."); return; }
  const rec = REC;
  rec.lang = RP.scene.lang === "es" ? "es-MX" : "en-US"; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
  RP.sendOnEnd = false;
  rpMicUI(true); rpHint("Listening… just talk. I send it when you pause.");
  rpStatus("Listening…", "listen"); const heard = $("#rpHeard"); if (heard) heard.textContent = "";
  rec.onresult = e => {
    let said = "";
    for (const r of e.results) said += r[0].transcript + (r.isFinal ? " " : "");
    if (said.trim()) RP.srHeard = true;
    box.value = [before, said.trim()].filter(Boolean).join(" "); rpGrow();
    if (heard) heard.textContent = box.value;
    clearTimeout(RP.quiet);
    RP.quiet = setTimeout(() => { if (REC === rec && box.value.trim()){ RP.sendOnEnd = true; try { rec.stop(); } catch(e){} } }, RP.call ? 1300 : 1600);
  };
  rec.onerror = e => {
    const m = { "not-allowed": "The microphone is blocked. Allow it in your browser settings, or type.", "service-not-allowed": "This browser won't listen here. Type your line instead.", "language-not-supported": "This browser can't listen in that language. Type instead." }[e.error];
    if (m){ RP && (RP.talk = false); toast(m); }
  };
  rec.onend = () => {
    if (REC === rec) REC = null;
    if (!RP || !$("#rpLog")) return;
    clearTimeout(RP.quiet);
    const text = box.value.trim();
    if (RP.busy){ rpMicUI(false); return; }
    if (text && (RP.sendOnEnd || RP.talk)){ rpMicUI(false); rpSend(box.value); return; }
    // The phone stopped listening on its own with nothing heard: try again twice, then wait for a tap.
    if (RP.talk && RP.state === "talking"){
      if (++RP.idle <= 2){ timers.push(setTimeout(rpListen, 250)); return; }
      RP.talk = false; rpMicUI(false);
      // Some phones (iPhones, often) never pass speech to the page: after that, typing with the keyboard's mic works better.
      if (!RP.srHeard){ toast("This phone isn't passing your voice to the page. Use the mic on your keyboard instead."); rpMode(false); rpHint("Tap the box, then the mic on your keyboard, and talk."); return; }
      rpHint("Talk mode paused. Tap the mic to keep talking."); rpStatus("Didn't hear you. Tap the mic to keep talking."); return;
    }
    rpMicUI(false); rpHint();
  };
  try { rec.start(); sfx("tap"); } catch(e){ REC = null; RP.talk = false; rpMicUI(false); toast("Couldn't start the microphone."); }
}

function rpSheet(html, cls = "rp-sheet"){
  const sheet = $("#sheet"); if (!sheet) return null;
  sheet.className = `sheet ${cls}`; sheet.innerHTML = `<div class="sheet-in">${html}</div>`;
  requestAnimationFrame(() => sheet.classList.add("show"));
  return sheet;
}
function rpQuit(){
  if (RP) RP.talk = false;
  if (!RP || !RP.log.length) return streetIntro();
  stopRec();
  rpSheet(`<div class="say-row">${shoco("sad")}<div class="bubble">Leave without a score?${RP.couple ? "" : " This chat still counts as one of today's."}</div></div>
    <button class="btn wide" id="rpStay">Keep talking</button><button class="btn wide ghost" id="rpLeave">Leave</button>`);
  on("#rpStay", () => $("#sheet").classList.remove("show"));
  on("#rpLeave", streetIntro);
}

/* The chat is over: ask what they wrote on the invitation, then get the score. */
function rpEnd(how){
  if (!RP) return;
  RP.talk = false;
  stopRec();
  if (LV.pc){ const sv = liveStop(); if (sv) RP.saving = sv; }
  if (!RP.log.some(e => e.them && e.them.some(l => l.text))) return streetIntro();
  const talking = how === "done" && RP.state === "talking";
  rpComposer(false);
  const title = RP.state === "left" ? "They walked away." : RP.booked ? "They said yes." : RP.state === "ended" ? "They went on their way." : "You ended the chat.";
  const sheet = rpSheet(`<div class="say-row">${shoco("think")}<div class="bubble">${esc(title)} Which gift do they qualify for?</div></div>
    <div class="opts grid3 rp-call" role="group" aria-label="Their gift">${["Q", "CT", "NQ"].map(g => `<button class="opt grade" data-call="${g}"><b>${g}</b><span>${{ Q: "Full gift", CT: "Half gift", NQ: "No gift" }[g]}</span></button>`).join("")}</div>
    <button class="btn wide ghost" data-call="?">I didn't find out</button>
    ${talking ? `<button class="link" id="rpBackChat">Back to the chat</button>` : ""}`);
  sheet.querySelectorAll("[data-call]").forEach(b => b.onclick = () => { sfx("tap"); rpCoach(b.dataset.call); });
  on("#rpBackChat", () => { $("#sheet").classList.remove("show"); rpComposer(true); });
  timers.push(setTimeout(() => sheet.querySelector("[data-call]")?.focus({ preventScroll: true }), 120));
}
async function rpCoach(call){
  rpSheet(`<div class="say-row">${shoco("think")}<div class="bubble">Reading your chat… ${RP.couple ? "This can take up to a minute." : "This takes a few seconds."}</div></div>`);
  try {
    if (RP.saving || RP.resave){ const sv = RP.saving || RP.resave(); RP.saving = null; await sv; }
    RP.state = RP.state === "talking" ? "ended" : RP.state; streetScore(RP.couple ? await rpLocalCoach(call) : await rpCall("coach", { chat: RP.chat, call })); }
  catch(e){
    if (!$("#sheet")) return;
    rpSheet(`<div class="say-row">${shoco("sad")}<div class="bubble">${esc(rpMsg(e))}</div></div><button class="btn wide" id="rpRetry">Try again</button><button class="btn wide ghost" id="rpSkip">Leave without a score</button>`);
    on("#rpRetry", () => rpCoach(call)); on("#rpSkip", streetIntro);
  }
}

async function rpLocalCoach(call){
  const coach = RPCORE.normCoach(await rpAsk(RPCORE.coachPrompt(RP.couple, RP.core, call), { modelTier: "quick" }));
  if (!coach) throw Object.assign(new Error("busy"), { code: "busy" });
  return { coach, call, reveal: RPCORE.revealOut(RP.couple), timeline: RPCORE.timelineOf(RP.core), end: RPCORE.endOf(RP.core) };
}

/* ---------- The score ---------- */
function rpScore(coach, call, reveal, end){
  let got = 0, max = 0;
  for (const k of RP_KEYS){ const s = coach.steps[k] && coach.steps[k].status; if (s in RP_PTS){ max += RP_W[k]; got += RP_W[k] * RP_PTS[s]; } }
  const q = coach.qualify && coach.qualify.status;
  if (q in RP_PTS){ max += 15; if (call === reveal.grade) got += 15 * RP_PTS[q]; }
  if (!max) return null;
  let s = Math.round(got / max * 100);
  if (end.booked && reveal.grade === "NQ") s = Math.min(s, 40);
  if (end.booked && !reveal.canBook) s = Math.min(s, 45);
  return s;
}
const RP_CODE = { good: "g", weak: "w", missed: "m", na: "n" };
function streetScore(r){
  const { coach, reveal, timeline, end, call } = r;
  const score = rpScore(coach, call, reveal, end), right = call === reveal.grade;
  if (!RP.saved){
    const steps = RP_KEYS.map(k => RP_CODE[coach.steps[k].status] || "n").join("") + (RP_CODE[coach.qualify.status] || "n");
    RP.saved = [Date.now(), score == null ? -1 : score, reveal.mood, reveal.grade, end.booked ? 1 : 0, right ? 1 : 0, steps];
    rpRecord(RP.saved); save();
  }
  const handoff = !TEAM_HOST ? `${TEAM_URL}#rp=${rpEncode(RP.saved)}` : "";
  view = "street"; game = null; stopSpeak();
  const names = reveal.people.map(p => `${p.name}, ${p.age}`).join(" and ");
  const asked = new Set(coach.qualify.asked);
  const mood = score == null ? "think" : score >= 75 ? "cheer" : score >= 50 ? "happy" : "sad";
  const stepRow = (k, i) => {
    const s = coach.steps[k], [label, cls] = RP_ST[s.status] || RP_ST.na, L = SCRIPT_LINES[s.line];
    return `<li class="rp-step s-${cls}"><span class="n" aria-hidden="true">${i + 1}</span><div class="stack" style="gap:6px">
      <div class="rp-step-h"><b>${esc(RP_LABEL[k])}</b><span class="rp-st ${cls}">${label}</span></div>
      ${s.note ? `<p class="small">${esc(s.note)}</p>` : ""}
      ${s.try ? `<p class="rp-try"><span class="eyebrow">Try</span><span>${esc(s.try)}</span></p>` : ""}
      ${L && L.clip ? `<div><button class="btn small ghost" data-seg="${L.clip}:${L.from}:${L.to}" data-key="rp-${s.line}" aria-label="Hear it from the voice notes">${icon("play")} Hear it</button></div>` : ""}
    </div></li>`;
  };
  const people = reveal.people;
  const nameOf = w => (people[w === "B" ? 1 : 0] || people[0]).name;
  const chat = RP.log.map(e => e.me ? `<p class="me"><b>You:</b> ${esc(e.me)}</p>`
    : e.them.map(l => `<p><b>${esc(nameOf(l.who))}:</b> ${esc(l.text)}</p>`).join("") + (e.cue ? `<p class="cue">${esc(e.cue)}</p>` : "")).join("");
  const bars = timeline.map(([v, intent], i) => `<i class="b-${intent}" style="--h:${Math.max(6, v * 10)}%" title="After your line ${i + 1}: interest ${v} of 10, ${intent === "yes" ? "would come" : intent === "maybe" ? "maybe" : "wouldn't come"}"></i>`).join("");
  show(`<div class="lesson rp rp-score">
    <div class="l-top"><button class="icon-btn" id="rpClose" aria-label="Close">${icon("x")}</button><div class="rp-title"><p class="eyebrow">Street practice</p><h1>Your score</h1></div><span></span></div>
    <section class="rp-hero">
      ${shoco(mood)}
      <div class="rp-ring" style="--p:${score == null ? 0 : score}" role="img" aria-label="${score == null ? "No score" : `Score ${score} of 100`}"><b>${score == null ? "–" : score}</b><span>${score == null ? "no score" : "of 100"}</span></div>
    </section>
    ${coach.headline ? `<p class="rp-headline">${esc(coach.headline)}</p>` : ""}
    <section class="card rp-reveal" aria-labelledby="rvH">
      <div class="rp-reveal-h"><span class="rp-grade g-${reveal.grade}">${reveal.grade}</span><div><p class="eyebrow">Who they really were</p><h2 id="rvH">${esc(names)}</h2></div></div>
      <p class="rp-callline ${right ? "ok" : "no"}">${icon(right ? "check" : "x")}<span>You said ${esc(RP_CALL[call] || RP_CALL["?"])}. ${right ? "Right." : `They were ${esc(RP_CALL[reveal.grade])}.`}</span></p>
      <p class="small">${esc(reveal.why)}</p>
      ${reveal.bookNote ? `<p class="small muted">${esc(reveal.bookNote)}</p>` : ""}
      <div class="chips">${reveal.chips.map(([ic, t]) => `<span class="chip">${icon(ic)}<span>${esc(capFirst(t))}</span></span>`).join("")}</div>
      <p class="small muted">${esc(reveal.moodLabel)}${reveal.objections.length ? `. On their mind: ${reveal.objections.map(o => `"${esc(o)}"`).join(" ")}` : ""}</p>
    </section>
    ${handoff ? `<section class="card rp-handoff"><p>Your manager sees practice scores in the team app. Add this one there:</p><a class="btn wide sun" href="${esc(handoff)}" target="_blank" rel="noopener">${icon("share")} Add to my team record</a></section>` : ""}
    <section class="card" aria-labelledby="stH"><h2 id="stH">Step by step</h2><ol class="rp-steps">${RP_KEYS.map(stepRow).join("")}</ol></section>
    <section class="card" aria-labelledby="qfH"><h2 id="qfH">Finding out who they are</h2>
      <ul class="rp-ask">${RP_ASK.map(([k, l]) => `<li class="${asked.has(k) ? "yes" : "no"}">${icon(asked.has(k) ? "check" : "x")}<span>${l}</span><span class="sr-only">${asked.has(k) ? ": found out" : ": not found out"}</span></li>`).join("")}</ul>
      ${coach.qualify.note ? `<p class="small">${esc(coach.qualify.note)}</p>` : ""}</section>
    ${timeline.length > 1 ? `<section class="card" aria-labelledby="ikH"><h2 id="ikH">How keen they were</h2>
      <div class="rp-graph" role="img" aria-label="Interest after each of your lines, out of 10: ${timeline.map(t => t[0]).join(", ")}">${bars}</div>
      <p class="rp-key small"><span><i class="b-no"></i>Wouldn't come</span><span><i class="b-maybe"></i>Maybe</span><span><i class="b-yes"></i>Would come</span></p>
      <p class="small muted">Hidden during the chat. Each bar is after one of your lines: taller means keener. The color is whether they'd really show up.</p></section>` : ""}
    ${coach.best ? `<section class="card"><p class="eyebrow">Your best line</p><p class="rp-quote">${icon("quote")}<span>${esc(coach.best)}</span></p></section>` : ""}
    ${coach.fix ? `<section class="card rp-fix"><p class="eyebrow">Next time</p><p>${esc(coach.fix)}</p></section>` : ""}
    <details class="card"><summary>Read the chat again</summary><div class="rp-transcript">${chat}</div></details>
    <div class="stack rp-end-acts"><button class="btn wide" id="rpAgain">Practice again</button><button class="btn wide ghost" id="rpFinish">Done</button>
      ${RP.left == null ? "" : `<p class="small muted" style="text-align:center">${RP.left ? `${plural(RP.left, "practice chat")} left today.` : "That was your last practice chat for today."}</p>`}</div>
  </div>`, { full: true });
  bindSegButtons(app);
  on("#rpClose", () => tab("games")); on("#rpFinish", () => tab("games")); on("#rpAgain", streetIntro);
  if (score != null && score >= 75){ sfx("win"); confetti(); } else sfx("ok");
}

/* ---------- Results: kept on the phone, sent to the team list with the rest of the progress ---------- */
/* r = [time, score or -1, mood, gift, booked 0/1, called the gift right 0/1, step codes (8 steps + finding out)] */
function rpRecord(r){
  S.rp.n++; if (r[1] >= 0) S.rp.best = Math.max(S.rp.best, r[1]);
  S.rp.res.push(r); S.rp.res.sort((a, b) => a[0] - b[0]); S.rp.res = S.rp.res.slice(-10);
  S.log.push([r[0], "rp", r[2], Math.max(0, r[1]), r[5]]); S.log.sort((a, b) => a[0] - b[0]); S.log = S.log.slice(-25);
  addXP(10 + Math.round(Math.max(0, r[1]) / 10)); markActive();
}
const rpEncode = r => btoa(unescape(encodeURIComponent(JSON.stringify(r)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function rpDecode(code){
  try {
    const r = JSON.parse(decodeURIComponent(escape(atob(String(code).replace(/-/g, "+").replace(/_/g, "/")))));
    const now = Date.now();
    if (!Array.isArray(r) || r.length !== 7) return null;
    const [t, sc, mood, g, booked, right, steps] = r;
    if (!Number.isFinite(t) || t < now - 30 * DAY || t > now + DAY) return null;
    if (!Number.isInteger(sc) || sc < -1 || sc > 100 || !isMood(mood) || !["Q", "CT", "NQ"].includes(g)) return null;
    if (![0, 1].includes(booked) || ![0, 1].includes(right) || typeof steps !== "string" || !/^[gwmn]{9}$/.test(steps)) return null;
    return [Math.round(t), sc, mood, g, booked, right, steps];
  } catch(e){ return null; }
}
/* The Claude version links here with #rp=... to add a practice result to this phone's team record. */
function rpImport(){
  const m = /^#rp=([A-Za-z0-9_-]{10,600})$/.exec(location.hash);
  if (!m) return false;
  history.replaceState(null, "", location.pathname + location.search);
  const r = rpDecode(m[1]);
  if (!r){ toast("That practice link didn't work."); return true; }
  if (S.rp.res.some(x => x[0] === r[0])){ toast("That practice score is already in your record."); return true; }
  rpRecord(r); save();
  toast(S.name ? "Practice score added. Your manager will see it." : "Practice score added. Add your name in Me so your manager sees it.");
  return true;
}
