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

/* ---------- Their voices (read aloud) ---------- */
const TTS = window.speechSynthesis || null;
function stopSpeak(){ try { TTS && TTS.cancel(); } catch(e){} }
function rpVoice(lang, sex){
  const vs = (TTS ? TTS.getVoices() : []).filter(v => (v.lang || "").toLowerCase().startsWith(lang));
  const fem = /female|samantha|victoria|karen|moira|tessa|fiona|allison|ava|susan|zira|monica|paulina|marisol|helena|sabina|lucia|laura|joana/i;
  const male = /\bmale|alex|daniel|fred|tom\b|aaron|arthur|oliver|diego|jorge|juan|carlos|david|mark|rishi|reed|eddy/i;
  return (sex === "f" ? vs.find(v => fem.test(v.name)) : vs.find(v => male.test(v.name) && !/female/i.test(v.name))) || vs[0] || null;
}
function speakLines(lines){
  if (!TTS || S.rpVoice === false || !RP) return;
  stopSpeak();
  const lang = RP.scene.lang === "es" ? "es" : "en";
  for (const l of lines){
    const p = RP.scene.people[l.who === "B" ? 1 : 0] || RP.scene.people[0];
    const u = new SpeechSynthesisUtterance(l.text), v = rpVoice(lang, p.sex);
    if (v){ u.voice = v; u.lang = v.lang; } else u.lang = lang === "es" ? "es-MX" : "en-US";
    u.pitch = p.sex === "m" ? .9 : 1.1; u.rate = 1.03;
    try { TTS.speak(u); } catch(e){}
  }
}
if (TTS) try { TTS.getVoices(); TTS.addEventListener?.("voiceschanged", () => {}); } catch(e){}

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
      <li>${SR ? "Tap the mic and talk. Tap it again to send. Or type, or use the mic on your keyboard." : "Type, or use the mic on your keyboard."}</li>
      <li>Find out who they are on the way: where they're from, ages, work, card, hotel, when they leave.</li>
      <li>Tap Done when you've finished. If they walk away, that's the end too.</li></ul>
    <div class="l-foot rp-foot"><p class="small muted" id="rpLeft" aria-live="polite"></p><button class="btn wide" id="rpGo">Start</button></div>
  </div>`, { full: true });
  on("#rpBack", () => tab("games"));
  const left = $("#rpLeft"), go = $("#rpGo");
  const toClaude = () => { left.innerHTML = `${esc(RP_MSG.off)} <a href="${CLAUDE_URL}" target="_blank" rel="noopener">Open the Claude version</a>`; go.disabled = true; };
  if (inClaude){
    left.textContent = "Checking…"; go.disabled = true;
    rpSampler().then(fn => {
      if (view !== "street" || !$("#rpLeft")) return;
      if (fn){ left.textContent = "Free: it runs on your own Claude account. The first time, Claude asks you to allow it."; go.disabled = false; }
      else left.innerHTML = TEAM_HOST ? "" : `Street practice works in the Claude app, or on the team link: <a href="${TEAM_URL}">${esc(TEAM_URL)}</a>`;
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
      .then(j => { if (view !== "street" || !$("#rpLeft")) return; left.textContent = j.teamFull ? RP_MSG.team : j.left ? `${plural(j.left, "practice chat")} left today.` : RP_MSG.limit; if (!j.left || j.teamFull) go.disabled = true; })
      .catch(e => { if (view !== "street" || !$("#rpLeft")) return; if (e.code === "off") return toClaude(); left.textContent = rpMsg(e); });
  }
  on("#rpGo", async () => {
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
      streetChat(await rpCall("start", { focus, lang: lg }));
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
    app.querySelectorAll(`[data-p="${i}"] .rp-av`).forEach(el => el.innerHTML = rpAvatar(i));
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
function rpHint(text){ const h = $("#rpHint"); if (h) h.textContent = text || (SR ? "Tap the mic and talk. Tap it again to send." : "Type your line, or use the mic on your keyboard."); }
function rpComposer(on){
  ["#rpText", "#rpSend", "#rpMic"].forEach(s => { const el = $(s); if (el) el.disabled = !on; });
}
function rpGrow(){ const t = $("#rpText"); if (!t) return; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 150) + "px"; }

function streetChat(j, couple){
  RP = { chat: j.chat, max: j.max || 24, left: j.left == null ? null : Math.max(0, j.left - 1), scene: j.scene, log: [], busy: false, state: "talking", booked: false, turns: 0, known: new Set(), saved: false,
    couple: couple || null, core: [] };
  view = "street"; game = { kind: "street" };
  const sc = j.scene, who = sc.people.length > 1 ? "A couple" : sc.people[0].sex === "m" ? "A man" : "A woman";
  show(`<div class="lesson rp">
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
    <div class="rp-log" id="rpLog" role="log" aria-label="The conversation"></div>
    <form class="l-foot rp-say" id="rpForm" autocomplete="off">
      <label for="rpText" class="sr-only">Your line</label>
      <textarea class="field" id="rpText" rows="1" maxlength="600" placeholder="Say your line…" enterkeyhint="send"></textarea>
      ${SR ? `<button type="button" class="rp-mic" id="rpMic" aria-pressed="false" aria-label="Talk">${icon("mic")}</button>` : ""}
      <button class="rp-send" id="rpSend" aria-label="Send">${icon("send")}</button>
      <p class="small muted rp-hint" id="rpHint"></p>
    </form>
  </div><div class="sheet" id="sheet" aria-live="polite"></div>`, { full: true });
  rpHint();
  const box = $("#rpText");
  box.addEventListener("input", rpGrow);
  box.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); rpSend(box.value); } });
  $("#rpForm").addEventListener("submit", e => { e.preventDefault(); rpSend(box.value); });
  on("#rpMic", rpMic);
  on("#rpVoice", () => { S.rpVoice = S.rpVoice === false; save(false); const b = $("#rpVoice"); b.setAttribute("aria-pressed", String(S.rpVoice)); b.innerHTML = icon(S.rpVoice ? "sound" : "mute"); if (!S.rpVoice) stopSpeak(); });
  on("#rpDone", () => rpEnd("done"));
  on("#rpQuit", rpQuit);
  timers.push(setTimeout(() => box.focus({ preventScroll: true }), 120));
}

async function rpSend(raw, retry){
  const text = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 600);
  if (!text || !RP || RP.busy || RP.state !== "talking") return;
  RP.busy = true; stopSpeak(); rpComposer(false);
  if (REC){ RP.sendOnEnd = false; stopRec(); }
  let mine = retry;
  if (!retry){ rpLearn(text); mine = rpMe(text); const b = $("#rpText"); if (b){ b.value = ""; rpGrow(); } }
  else retry.querySelector(".rp-err")?.remove();
  const typing = rpAppend(`<span class="rp-av" aria-hidden="true">${icon("user")}</span><div class="rp-b"><span class="dots" role="img" aria-label="They're answering"><i></i><i></i><i></i></span></div>`, "rp-msg them typing");
  try {
    const r = RP.couple ? await rpLocalTurn(text) : await rpCall("turn", { chat: RP.chat, text });
    typing?.remove();
    if (!RP || !$("#rpLog")) return;
    RP.log.push({ me: text }, { them: r.lines, cue: r.cue });
    RP.turns = r.turns; RP.state = r.state; RP.booked = !!r.booked;
    r.lines.forEach(l => rpLearn(l.text));
    r.lines.forEach(rpThem);
    if (r.cue) rpCue(r.cue);
    speakLines(r.lines);
    sfx("tap");
    if (RP.state !== "talking") timers.push(setTimeout(() => rpEnd(RP.state), 1400));
    else rpHint(RP.max - RP.turns <= 4 ? `${plural(RP.max - RP.turns, "line")} left in this chat.` : "");
  } catch(e){
    typing?.remove();
    if (!RP || !$("#rpLog")) return;
    if (e.code === "refused"){ mine?.remove(); const b = $("#rpText"); if (b){ b.value = text; rpGrow(); } toast(RP_MSG.refused); }
    else if (e.code === "over"){ RP.state = "ended"; rpEnd("ended"); }
    else if (e.code === "cancelled") mine?.remove();
    else if (["off", "limit", "team", "auth", "noclaude", "signin"].includes(e.code)){ RP.state = "ended"; toast(rpMsg(e)); timers.push(setTimeout(streetIntro, 2400)); }
    else if (mine){
      const err = document.createElement("p"); err.className = "rp-err";
      err.innerHTML = `<span>${esc(rpMsg(e))}</span> <button type="button" class="link">${icon("refresh")}Send again</button>`;
      err.querySelector("button").onclick = () => rpSend(text, mine);
      mine.appendChild(err);
    }
  } finally {
    if (RP){ RP.busy = false; rpComposer(RP.state === "talking"); if (RP.state === "talking") $("#rpText")?.focus({ preventScroll: true }); }
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

/* Tap to talk, tap again to send. If the browser stops listening by itself, the words wait in the box. */
function rpMic(){
  const btn = $("#rpMic"), box = $("#rpText");
  if (!btn || !RP || RP.busy) return;
  if (REC){ RP.sendOnEnd = true; try { REC.stop(); } catch(e){} return; }
  stopSpeak();
  const before = box.value.trim();
  try { REC = new SR(); } catch(e){ toast("This browser can't listen. Type your line instead."); return; }
  const rec = REC;
  rec.lang = RP.scene.lang === "es" ? "es-MX" : "en-US"; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
  RP.sendOnEnd = false;
  btn.classList.add("listening"); btn.setAttribute("aria-pressed", "true"); btn.setAttribute("aria-label", "Stop and send"); btn.innerHTML = icon("stop");
  rpHint("Listening… tap the red button to send.");
  rec.onresult = e => {
    let said = "";
    for (const r of e.results) said += r[0].transcript + (r.isFinal ? " " : "");
    box.value = [before, said.trim()].filter(Boolean).join(" "); rpGrow();
  };
  rec.onerror = e => {
    const m = { "not-allowed": "The microphone is blocked. Allow it in your browser settings, or type.", "service-not-allowed": "This browser won't listen here. Type your line instead.", "no-speech": "I didn't hear anything. Tap the mic and try again.", "language-not-supported": "This browser can't listen in that language. Type instead." }[e.error];
    if (m) toast(m);
  };
  rec.onend = () => {
    if (REC === rec) REC = null;
    btn.classList.remove("listening"); btn.setAttribute("aria-pressed", "false"); btn.setAttribute("aria-label", "Talk"); btn.innerHTML = icon("mic");
    if (!RP || !$("#rpLog")) return;
    rpHint();
    if (RP.sendOnEnd && box.value.trim()) rpSend(box.value);
    else if (box.value.trim()) rpHint("Check your words, then send.");
  };
  try { rec.start(); sfx("tap"); } catch(e){ REC = null; btn.classList.remove("listening"); btn.innerHTML = icon("mic"); toast("Couldn't start the microphone."); }
}

function rpSheet(html, cls = "rp-sheet"){
  const sheet = $("#sheet"); if (!sheet) return null;
  sheet.className = `sheet ${cls}`; sheet.innerHTML = `<div class="sheet-in">${html}</div>`;
  requestAnimationFrame(() => sheet.classList.add("show"));
  return sheet;
}
function rpQuit(){
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
  stopRec();
  if (!RP.log.some(e => e.them)) return streetIntro();
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
  try { RP.state = RP.state === "talking" ? "ended" : RP.state; streetScore(RP.couple ? await rpLocalCoach(call) : await rpCall("coach", { chat: RP.chat, call })); }
  catch(e){
    if (!$("#sheet")) return;
    rpSheet(`<div class="say-row">${shoco("sad")}<div class="bubble">${esc(rpMsg(e))}</div></div><button class="btn wide" id="rpRetry">Try again</button><button class="btn wide ghost" id="rpSkip">Leave without a score</button>`);
    on("#rpRetry", () => rpCoach(call)); on("#rpSkip", streetIntro);
  }
}

async function rpLocalCoach(call){
  const coach = RPCORE.normCoach(await rpAsk(RPCORE.coachPrompt(RP.couple, RP.core, call), { modelTier: "default" }));
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
  if (end.booked && reveal.grade === "NQ") s = Math.min(s, 50);
  if (end.booked && !reveal.canBook) s = Math.min(s, 60);
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
