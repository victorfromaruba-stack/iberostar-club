/* Street practice as a live call: the page talks to a fake WebRTC connection (the events OpenAI's Realtime API
   sends, played by the test), a mocked sua-roleplay, and a mocked OpenAI /v1/realtime/calls.
   Run: node academy/src/live_e2e.js http://localhost:8790/ <outdir>  (serve academy/ on localhost) */
const { chromium } = require("playwright");
const fs = require("fs");
const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let fails = 0; const ok = (c, m) => { if (!c){ fails++; console.log("FAIL", m); } else console.log("PASS", m); };
const SCENE = { lang: "en", place: "on the Palm Beach strip", time: "10:20 am", heading: "to the beach",
  cues: ["They look at you."], people: [{ name: "Mike", sex: "m", look: "" }, { name: "Linda", sex: "f", look: "" }] };
const ST = (status, note = "", tr = "", line = "") => ({ status, note, try: tr, line });
const COACH = { coach: { headline: "Good live call.", steps: { open: ST("good", "Nice opener."), why: ST("good", "Why before what."), news: ST("weak", "Skipped the tour."),
  offer: ST("good", "Let me get you an invitation."), time: ST("good", "8 o'clock."), number: ST("missed", "No number."), plan: ST("missed", "No plan."), lockin: ST("na") },
  qualify: { status: "weak", asked: ["from"], note: "Ask ages." }, best: "Inviting families.", fix: "Ask for the number.", showup: "shaky" },
  call: "Q", reveal: { people: [{ name: "Mike", age: 47, sex: "m", job: "a nurse" }, { name: "Linda", age: 45, sex: "f", job: "a teacher" }], chips: [["pin", "Ohio"]],
  grade: "Q", why: "USA, he's 47.", canBook: true, bookNote: "", mood: "friendly", moodLabel: "Friendly", kind: "Q: us", objections: [] },
  timeline: [], end: { state: "ended", booked: true } };
/* A fake RTCPeerConnection: records what the page does; window.__emit(event) plays a server event. */
const FAKE_RTC = `
class FakeDC { constructor(label){ this.label = label; this.readyState = "connecting"; this.sent = []; window.__dc = this; }
  send(x){ this.sent.push(JSON.parse(x)); } close(){ this.readyState = "closed"; } }
class FakePC { constructor(){ window.__pc = this; this.connectionState = "new"; this.tracks = 0; window.__pcs = (window.__pcs || 0) + 1; }
  addTrack(){ this.tracks++; } createDataChannel(l){ this.dc = new FakeDC(l); return this.dc; }
  async createOffer(){ return { type: "offer", sdp: "v=0 fake-offer" }; } async setLocalDescription(){}
  async setRemoteDescription(d){ this.remote = d; if (window.__noOpen) return; setTimeout(() => { this.dc.readyState = "open"; this.dc.onopen && this.dc.onopen(); }, 60); }
  close(){ this.connectionState = "closed"; window.__closed = (window.__closed || 0) + 1; } }
window.RTCPeerConnection = FakePC;
window.__emit = m => window.__dc.onmessage({ data: JSON.stringify(m) });
try { speechSynthesis.speak = () => {}; } catch(e){}`;

async function setup(b, plan = {}){
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"] });
  await ctx.addInitScript(FAKE_RTC);
  if (plan.noOpen) await ctx.addInitScript("window.__noOpen = true;");
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", e => errors.push(String(e)));
  const calls = [], sdp = [];
  await p.route("**/rest/v1/rpc/**", r => r.fulfill({ status: 200, contentType: "application/json", body: '"ok"' }));
  await p.route("https://api.openai.com/v1/realtime/calls", async r => { sdp.push({ auth: r.request().headers().authorization, type: r.request().headers()["content-type"], body: r.request().postData() });
    await r.fulfill({ status: 201, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/sdp" }, body: "v=0 fake-answer" }); });
  await p.route("**/functions/v1/sua-roleplay", async route => {
    const req = route.request(), h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 200, headers: h, body: "ok" });
    const bd = JSON.parse(req.postData() || "{}"); calls.push(bd);
    const send = (j, st = 200) => route.fulfill({ status: st, headers: h, body: JSON.stringify(j) });
    if (bd.op === "status") return send({ on: true, voice: true, live: plan.live !== false, left: 5, teamFull: false });
    if (bd.op === "start") return send({ chat: "c0ffee00-0000-4000-8000-000000000001", left: 5, max: 24, voice: true, live: plan.live !== false, scene: SCENE });
    if (bd.op === "live") return plan.liveErr ? send({ err: plan.liveErr }, 503) : send({ key: "ek_test123", expires: 0, model: "gpt-realtime-2.1-mini", turns: 1 });
    if (bd.op === "live_save") return send({ ok: true, turns: 2, state: bd.state, added: (bd.items || []).length });
    if (bd.op === "coach") return send(COACH);
    if (bd.op === "turn") return send({ lines: [{ who: "A", text: "Typed reply from Claude." }], cue: "", state: "talking", booked: false, turns: 3, max: 24 });
    return send({ err: "bad" }, 400);
  });
  await p.goto(url, { waitUntil: "load" }); await p.waitForTimeout(300);
  await p.evaluate(() => { S.name = "Live"; S.sync.ok = true; S.rpMode = "voice"; S.rpCC = false; S.rpVoice = true; save(false); });
  await p.click('.tabs button[data-tab="games"]'); await p.click("#rp");
  await p.waitForFunction(() => /left today/.test(document.querySelector("#rpLeft")?.textContent || ""));
  await p.click("#rpGo"); await p.waitForSelector("#rpQuit");
  return { ctx, p, calls, sdp, errors };
}
const emit = (p, m) => p.evaluate(m => window.__emit(m), m);
const status = p => p.textContent("#rpStatus");

(async () => {
  const b = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });

  /* 1. A whole live call */
  let { ctx, p, calls, sdp, errors } = await setup(b);
  ok(await p.evaluate(() => RP.live && RP.call) && /start the call/i.test(await p.textContent("#rpMicLabel")), "live call offered: tap to start the call");
  await p.click("#rpTalk");
  await p.waitForFunction(() => LV.open, null, { timeout: 5000 });
  ok(calls.some(c => c.op === "live" && c.chat), "asks the server for a call key");
  ok(sdp.length === 1 && sdp[0].auth === "Bearer ek_test123" && sdp[0].type === "application/sdp" && sdp[0].body === "v=0 fake-offer", "connects to OpenAI with the one-minute key");
  ok(await p.evaluate(() => window.__dc.label === "oai-events" && window.__pc.tracks === 1), "event channel and microphone on the call");
  ok(/Live · just talk/.test(await p.textContent("#rpMicLabel")) && /Say hello/.test(await status(p)), "connected: says just talk");
  await p.screenshot({ path: `${out}/live-1-connected.png` });
  await emit(p, { type: "input_audio_buffer.speech_started", item_id: "u1" });
  ok(/You're talking/.test(await status(p)), "your speech shows as you talking");
  await emit(p, { type: "input_audio_buffer.speech_stopped", item_id: "u1" });
  await emit(p, { type: "response.created", response: { id: "r1" } });
  await emit(p, { type: "output_audio_buffer.started", response_id: "r1" });
  ok(/Mike|He/.test(await status(p)) && /talking/.test(await status(p)) && await p.isVisible(".rp-person.p0.talking"), "their voice: face lights up, status says who's talking");
  await p.screenshot({ path: `${out}/live-2-talking.png` });
  // Their transcript can arrive before yours: the order still follows the conversation.
  await emit(p, { type: "response.output_audio_transcript.done", response_id: "r1", transcript: "Hi! We're from Ohio, Mike and Linda." });
  await emit(p, { type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "Good morning guys, where are you from?" });
  await emit(p, { type: "output_audio_buffer.stopped", response_id: "r1" });
  ok(/Your turn/.test(await status(p)) && !(await p.isVisible(".rp-person.talking")), "after they finish: your turn");
  const log1 = await p.evaluate(() => RP.log.map(e => "me" in e ? "ME:" + e.me : "THEM:" + e.them[0].text));
  ok(JSON.stringify(log1) === JSON.stringify(["ME:Good morning guys, where are you from?", "THEM:Hi! We're from Ohio, Mike and Linda."]), "log in conversation order: " + JSON.stringify(log1));
  ok(await p.evaluate(() => RP.known.size === 2) && /Mike/.test(await p.textContent(".rp-person.p0 .rp-who")), "names learned from what they said");
  // Barge-in and captions
  await p.click("#rpCC");
  ok(/You:\s*Good morning/.test(await p.textContent("#rpCap")) && /Mike:\s*Hi!/.test(await p.textContent("#rpCap")), "captions show both sides");
  // Second exchange with a booking via the status function
  await emit(p, { type: "input_audio_buffer.speech_stopped", item_id: "u2" });
  await emit(p, { type: "conversation.item.input_audio_transcription.completed", item_id: "u2", transcript: "Let me get you an invitation for 8 tomorrow." });
  await emit(p, { type: "response.created", response: { id: "r2" } });
  await emit(p, { type: "response.output_audio_transcript.delta", response_id: "r2", delta: "Sure" });
  ok(/talking/.test(await status(p)), "no audio-buffer events: the transcript starting counts as talking");
  await emit(p, { type: "response.function_call_arguments.done", name: "status", call_id: "call_1", arguments: '{"booked":true,"state":"ended"}' });
  ok(await p.evaluate(() => window.__dc.sent.some(m => m.type === "conversation.item.create" && m.item.type === "function_call_output" && m.item.call_id === "call_1")), "answers the status function");
  await emit(p, { type: "response.output_audio_transcript.done", response_id: "r2", transcript: "Sure, see you at 8. Bye!" });
  await emit(p, { type: "output_audio_buffer.stopped", response_id: "r2" });
  await p.waitForSelector('#sheet [data-call="Q"]', { timeout: 4000 });
  const save = calls.find(c => c.op === "live_save");
  ok(save && save.state === "ended" && save.items.length === 4 && save.items[0].me && save.items[3].booked === true, "they said goodbye: call saved (4 lines, booked, ended)");
  ok(await p.evaluate(() => !LV.pc && window.__closed === 1), "the call hangs up");
  ok(/They said yes/.test(await p.textContent("#sheet")), "end sheet: they said yes");
  await p.click('#sheet [data-call="Q"]');
  await p.waitForSelector(".rp-score", { timeout: 5000 });
  ok(calls.filter(c => c.op === "coach").length === 1 && calls.findIndex(c => c.op === "coach") > calls.findIndex(c => c.op === "live_save"), "Shoco scores after the call is saved");
  ok(!errors.length, "no page errors: " + errors.join(" | "));
  await ctx.close();

  /* 2. Mute, then type instead: the call is saved and Claude carries on in text */
  ({ ctx, p, calls, sdp, errors } = await setup(b));
  await p.click("#rpTalk"); await p.waitForFunction(() => LV.open);
  await p.click("#rpTalk");
  ok(await p.evaluate(() => LV.muted && LV.stream.getTracks().every(t => !t.enabled)) && /Muted/.test(await p.textContent("#rpMicLabel")), "tap while live: mutes the microphone");
  await p.screenshot({ path: `${out}/live-3-muted.png` });
  await p.click("#rpTalk");
  ok(await p.evaluate(() => !LV.muted), "tap again: unmuted");
  await emit(p, { type: "input_audio_buffer.speech_stopped", item_id: "u1" });
  await emit(p, { type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "Hi there!" });
  await emit(p, { type: "response.created", response: { id: "r1" } });
  await emit(p, { type: "response.output_audio_transcript.done", response_id: "r1", transcript: "Hey." });
  await p.click("#rpType");
  await p.waitForFunction(() => !RP.busy, null, { timeout: 4000 });
  const sv = calls.find(c => c.op === "live_save");
  ok(sv && sv.state === "talking" && sv.items.length === 2 && await p.evaluate(() => !LV.pc), "type instead: hangs up and saves the call");
  await p.fill("#rpText", "We're inviting families."); await p.press("#rpText", "Enter");
  await p.waitForFunction(() => document.querySelectorAll(".rp-msg.them:not(.typing)").length >= 2, null, { timeout: 4000 });
  ok(calls.at(-1).op === "turn" && calls.at(-1).text === "We're inviting families.", "then typing goes on with Claude");
  ok(!errors.length, "no page errors: " + errors.join(" | "));
  await ctx.close();

  /* 3. The call can't connect: falls back to the recorded voice */
  ({ ctx, p, calls, sdp, errors } = await setup(b, { noOpen: true }));
  await p.click("#rpTalk");
  await p.waitForFunction(() => !RP.live, null, { timeout: 20000 });
  ok(await p.evaluate(() => !LV.pc && RP.ear && !RP.busy) && /tap the mic/i.test(await p.textContent("#rpMicLabel") + await p.textContent(".toast, body")), "no connection in 15 s: switches to the slower voice");
  await ctx.close();

  /* 4. Server says no live call (limit): back to the intro */
  ({ ctx, p, calls, sdp, errors } = await setup(b, { liveErr: "limit" }));
  await p.click("#rpTalk");
  await p.waitForSelector("#rpGo", { timeout: 6000 });
  ok(true, "daily limit on the call key: back to the start screen");
  await ctx.close();

  /* 5. No live calls on the server: the recorded voice as before */
  ({ ctx, p, calls, sdp, errors } = await setup(b, { live: false }));
  ok(await p.evaluate(() => !RP.live && RP.ear) && /Tap to talk/.test(await p.textContent("#rpMicLabel")), "live off: recorded voice call as before");
  await ctx.close();
  await b.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
