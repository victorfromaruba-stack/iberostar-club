/* Street practice with the server's voice: a fake microphone (Chromium plays a wav file as the mic),
   a mocked sua-roleplay, and real recording, silence detection and mp3 playback in the page.
   Run: node academy/src/ear_e2e.js http://localhost:8790/ <outdir>  (serve academy/ on localhost) */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const DIR = path.resolve(out);
/* The fake microphone: 0.6 s quiet, 1.6 s of a voice-like hum, 3 s quiet (it loops). And 12 s of silence. */
function wav(file, samples){
  const sr = 16000, data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(DIR, file), Buffer.concat([h, data]));
}
{ const sr = 16000, hum = t => .25 * (.5 + .5 * Math.sin(2 * Math.PI * 4 * t)) * [180, 360, 540, 900].reduce((s, f, k) => s + Math.sin(2 * Math.PI * f * t) / (k + 1), 0);
  wav("speech.wav", [...Array(sr * .6).fill(0), ...Array.from({ length: sr * 1.6 }, (_, i) => hum(i / sr)), ...Array(sr * 3).fill(0)]);
  wav("quiet.wav", Array(sr * 12).fill(0)); }
/* A 0.6 s tone as the couple's "natural voice" mp3. */
const MP3 = "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";
const SCENE = { lang: "en", place: "on the Palm Beach strip", time: "10:20 am", heading: "to the beach",
  cues: ["They look at you."], people: [{ name: "Mike", sex: "m", look: "" }, { name: "Linda", sex: "f", look: "" }] };
let fails = 0; const ok = (c, m) => { if (!c){ fails++; console.log("FAIL", m); } else console.log("PASS", m); };
const NO_SR = "window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; try { speechSynthesis.speak = () => {}; } catch(e){}";

async function setup(browser, wav, plan){
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ["microphone"] });
  await ctx.addInitScript(NO_SR);
  const p = await ctx.newPage();
  const errors = []; p.on("pageerror", e => errors.push(String(e)));
  const turns = [];
  await p.route("**/rest/v1/rpc/**", r => r.fulfill({ status: 200, contentType: "application/json", body: '"ok"' }));
  await p.route("**/functions/v1/sua-roleplay", async route => {
    const req = route.request(), h = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 200, headers: h, body: "ok" });
    const b = JSON.parse(req.postData() || "{}");
    const send = (j, st = 200) => route.fulfill({ status: st, headers: h, body: JSON.stringify(j) });
    if (b.op === "status") return send({ on: true, voice: plan.voice !== false, left: 5, teamFull: false });
    if (b.op === "start") return send({ chat: "c0ffee00-0000-4000-8000-000000000001", left: 5, max: 24, voice: plan.voice !== false, scene: SCENE });
    if (b.op === "turn"){
      turns.push(b); const n = turns.length;
      const step = (plan.turns || [])[n - 1] || "ok";
      if (step === "unheard") return send({ err: "unheard" }, 422);
      if (step === "noear") return send({ err: "noear" }, 503);
      await new Promise(r => setTimeout(r, 300));
      return send({ lines: [{ who: "A", text: "Hi! We're from Ohio." }, { who: "B", text: "Is this a timeshare thing?" }], cue: "She glances at him.",
        state: "talking", booked: false, turns: n, max: 24, ...(b.audio ? { heard: "Hi guys, where are you from?" } : {}), ...(b.voice ? { audio: [MP3, step === "badaudio" ? "bm90LWF1ZGlv" : MP3] } : {}) });
    }
    return send({ err: "bad" }, 400);
  });
  await p.goto(url, { waitUntil: "load" }); await p.waitForTimeout(300);
  await p.evaluate(() => { S.name = "Ear"; S.sync.ok = true; S.rpMode = "voice"; S.rpCC = false; S.rpVoice = true; save(false); });
  await p.click('.tabs button[data-tab="games"]'); await p.click("#rp");
  await p.waitForFunction(() => /left today/.test(document.querySelector("#rpLeft")?.textContent || ""));
  await p.click("#rpGo"); await p.waitForSelector("#rpQuit");
  return { ctx, p, turns, errors };
}

(async () => {
  const mk = wav => chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${path.join(DIR, wav)}`, "--autoplay-policy=no-user-gesture-required"] });

  /* 1. A full spoken exchange, twice round the talk loop */
  let b = await mk("speech.wav");
  let { ctx, p, turns, errors } = await setup(b, "speech.wav", {});
  ok(await p.isVisible("#rpTalk") && await p.evaluate(() => RP.ear && RP.call), "voice call without browser speech recognition (server ears)");
  await p.click("#rpTalk");
  await p.waitForFunction(() => document.querySelector("#rpStatus")?.dataset.state === "listen", null, { timeout: 4000 });
  ok(true, "listening after one tap");
  await p.screenshot({ path: `${out}/ear-1-listening.png` });
  const lvl = await p.waitForFunction(() => +getComputedStyle(document.querySelector("#rpTalk")).getPropertyValue("--lvl") > 0.2, null, { timeout: 4000 }).then(() => true, () => false);
  ok(lvl, "mic ring follows your voice level");
  await p.waitForFunction(() => document.querySelectorAll(".rp-msg.them:not(.typing)").length >= 2, null, { timeout: 12000 });
  const t1 = turns[0];
  ok(t1 && t1.audio && t1.audio.length > 1500 && /^audio\/webm/.test(t1.mime) && t1.voice === true && !t1.text, `recording sent after a pause (${t1 && t1.mime}, ${t1 && t1.audio.length} chars)`);
  ok(await p.evaluate(() => [...document.querySelectorAll(".rp-msg.me")].map(e => e.textContent.trim()).join("|")) === "Hi guys, where are you from?", "what the server heard becomes your line");
  ok(await p.evaluate(() => RP.log[0].me) === "Hi guys, where are you from?", "and goes in the log for the score");
  const talking = await p.waitForFunction(() => /is talking/.test(document.querySelector("#rpStatus")?.textContent || "") && document.querySelector(".rp-person.talking"), null, { timeout: 3000 }).then(() => true, () => false);
  ok(talking, "their natural-voice mp3 plays with the talking face");
  await p.waitForFunction(() => document.querySelector("#rpStatus")?.dataset.state === "listen", null, { timeout: 8000 });
  ok(await p.evaluate(() => !RP.playing), "after both lines, it listens again by itself");
  await p.waitForFunction(() => document.querySelectorAll(".rp-msg.me").length >= 2, null, { timeout: 12000 });
  ok(turns.length === 2 && turns[1].audio, "second line recorded and sent");
  // Pause while listening: nothing sent
  await p.waitForFunction(() => document.querySelector("#rpStatus")?.dataset.state === "listen", null, { timeout: 10000 });
  const nBefore = turns.length;
  await p.click("#rpTalk"); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !RP.talk && !EAR.rec && !EAR.stream) && turns.length === nBefore, "tap while listening (before you speak): pauses, sends nothing, mic off");
  ok(/Tap the mic/.test(await p.textContent("#rpStatus")), "status says tap the mic");
  // Captions show your line too
  await p.click("#rpCC");
  ok(/You:\s*Hi guys/.test(await p.textContent("#rpCap")), "captions show what it heard from you");
  await p.screenshot({ path: `${out}/ear-2-captions.png` });
  // Typed line with voices on asks for natural voices
  await p.click("#rpType"); await p.fill("#rpText", "We're inviting families to the new hotel."); await p.press("#rpText", "Enter");
  await p.waitForFunction(n => document.querySelectorAll(".rp-msg.me").length > n, 2, { timeout: 5000 });
  ok(turns.at(-1).text && turns.at(-1).voice === true && !turns.at(-1).audio, "typed line: text with natural voices on");
  await p.click("#rpVoice"); await p.fill("#rpText", "Breakfast is on us."); await p.press("#rpText", "Enter");
  await p.waitForFunction(n => document.querySelectorAll(".rp-msg.me").length > n, 3, { timeout: 5000 });
  ok(turns.at(-1).voice === false, "voices off: no audio asked for");
  await p.waitForFunction(() => !RP.busy, null, { timeout: 5000 });
  // Leaving stops the mic
  await p.click("#rpToCall"); await p.click("#rpVoice"); await p.click("#rpTalk");
  await p.waitForFunction(() => !!EAR.stream, null, { timeout: 4000 });
  await p.click("#rpQuit"); await p.click("#rpLeave").catch(() => {}); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !EAR.rec && !EAR.stream), "leaving the chat turns the mic off");
  ok(!errors.length, "no page errors: " + errors.join(" | "));
  await ctx.close();

  /* 2. Unheard, a broken voice line, and the server's ears failing */
  ({ ctx, p, turns, errors } = await setup(b, "speech.wav", { turns: ["unheard", "badaudio", "noear"] }));
  await p.click("#rpTalk");
  await p.waitForFunction(() => /Didn't catch that/.test(document.querySelector("#rpStatus")?.textContent || ""), null, { timeout: 12000 });
  ok(true, "noise only: says it didn't catch that");
  await p.waitForFunction(() => document.querySelectorAll(".rp-msg.them:not(.typing)").length >= 2, null, { timeout: 15000 });
  ok(turns.length === 2 && await p.evaluate(() => RP.log.length) === 2, "then listens again and the next try goes through");
  await p.waitForFunction(() => document.querySelector("#rpStatus")?.dataset.state === "listen", null, { timeout: 10000 });
  ok(true, "a line whose mp3 won't play falls back to the phone's voice and carries on");
  await p.waitForFunction(() => !RP.ear, null, { timeout: 15000 });
  ok(await p.evaluate(() => !RP.call && !RP.tts) && await p.isVisible("#rpText"), "server voice broken: switches to typing");
  ok(!errors.length, "no page errors: " + errors.join(" | "));
  await ctx.close(); await b.close();

  /* 3. Saying nothing */
  b = await mk("quiet.wav");
  ({ ctx, p, turns, errors } = await setup(b, "quiet.wav", {}));
  await p.click("#rpTalk");
  await p.waitForFunction(() => /Didn't hear you/.test(document.querySelector("#rpStatus")?.textContent || ""), null, { timeout: 25000 });
  ok(turns.length === 0 && await p.evaluate(() => !RP.talk && !EAR.stream), "silence: nothing sent, tries twice, then waits for a tap with the mic off");
  await p.screenshot({ path: `${out}/ear-3-quiet.png` });
  await ctx.close();

  /* 4. Voice off on the server: the old path (no ears, no natural voices) */
  ({ ctx, p, turns, errors } = await setup(b, "quiet.wav", { voice: false }));
  ok(await p.evaluate(() => !RP.ear && !RP.tts && !RP.call) && await p.isVisible("#rpText"), "no server voice and no speech recognition: typing");
  await p.fill("#rpText", "Hello!"); await p.press("#rpText", "Enter");
  await p.waitForFunction(() => document.querySelectorAll(".rp-msg.them:not(.typing)").length >= 2, null, { timeout: 5000 });
  ok(turns[0].voice === false && !turns[0].audio, "and asks for no audio");
  await ctx.close(); await b.close();
  console.log(`${fails ? fails + " FAILED" : "ALL PASSED"}`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
