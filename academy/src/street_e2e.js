// Street practice end to end, with the sua-roleplay function and Claude mocked (about 60 checks), plus the manager panel's practice cards.
// Usage: node academy/src/street_e2e.js <pageUrl> <outDir> [otherUrl]   (Playwright; pageUrl on localhost, e.g. npx http-server academy)
// otherUrl is the same page from an address that isn't the team link, for the Claude version's handoff link.
// Default: pageUrl with 127.0.0.2 in place of localhost. Accessibility checks need axe-core (npm i axe-core, or set AXE_PATH); without it they're skipped.
const { chromium } = require("playwright");
const [url, out, other] = process.argv.slice(2);
const OTHER = other || url.replace(/\/\/(localhost|127\.0\.0\.1)/, "//127.0.0.2");
const AXE = process.env.AXE_PATH || (() => { try { return require.resolve("axe-core/axe.min.js"); } catch (e) { return ""; } })();
let axeSkipped = 0;
const results = [];
const ok = (name, cond, extra = "") => results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra !== "" ? " · " + extra : ""}`);
const INIT = `window.SpeechRecognition = class { start(){ this._t = setTimeout(() => { const r = [Object.assign([{ transcript: window.__sayText || "" }], { isFinal: true })]; this.onresult && this.onresult({ results: r }); }, 60); } stop(){ setTimeout(() => this.onend && this.onend(), 30); } abort(){ clearTimeout(this._t); this.onend && this.onend(); } };
window.__spoken = []; try { if (window.speechSynthesis) speechSynthesis.speak = u => window.__spoken.push(u.text); } catch(e){}`;
const SCENE = { lang: "en", place: "on the Palm Beach strip, outside the shops", time: "10:20 am", heading: "to the beach",
  cues: ["They look at you, then look away.", "She has an all-inclusive bracelet from the Riu Palace Aruba."], people: [{ name: "Mike", sex: "m", look: "" }, { name: "Linda", sex: "f", look: "" }] };
const ST = (status, note = "", t = "", line = "") => ({ status, note, try: t, line });
const COACH = { coach: { headline: "Good start, but you booked them without asking their ages.",
  steps: { open: ST("good", "You opened with their team cap."), why: ST("good", "You said why before the gift."), news: ST("weak", "You skipped the tour and the room.", "After breakfast they give you a personal tour, and you'll see one of our rooms.", "s2d"),
    offer: ST("good", "You said: let me get you an invitation."), time: ST("good", "8 o'clock, said like it's settled."),
    number: ST("missed", "You never asked for their number.", "We also do confirmation calls between 5 and 6. Is WhatsApp good for you?", "s5a"),
    plan: ST("missed", "You didn't go over the plan or the 90 minutes.", "We only ask families for 90 minutes, and breakfast tends to eat about half of that.", "s6d"), lockin: ST("na") },
  qualify: { status: "weak", asked: ["from", "stay"], note: "You didn't ask their ages or their card." },
  best: "We're inviting families to see the newest hotel on the island.", fix: "Ask for the number with the reason, every time.", showup: "shaky" },
  call: "Q",
  reveal: { people: [{ name: "Mike", age: 47, sex: "m", job: "a sales manager" }, { name: "Linda", age: 45, sex: "f", job: "a nurse" }],
    chips: [["pin", "Columbus, Ohio, USA"], ["cake", "Mike 47 · Linda 45"], ["ring", "Married"], ["briefcase", "Mike: a sales manager · Linda: a nurse"], ["card", "Visa"], ["bed", "the Riu Palace Aruba, all-inclusive. They paid for it"], ["calendar", "They fly home in 5 days. Tomorrow: nothing planned yet. Maybe the beach."]],
    grade: "Q", why: "USA and Canada: the man's age counts. He's 47, between 32 and 70, so the full gift (Q).", canBook: true, bookNote: "", mood: "skeptical", moodLabel: "Skeptical", kind: "Q: us", objections: ["Is this a timeshare thing?"] },
  timeline: [[3, "no"], [5, "maybe"], [7, "maybe"]], end: { state: "ended", booked: true } };
const NOW = Date.now(), D = 864e5;
const TEAMROWS = [
  { device: "aaaaaaaa-1111-4111-8111-111111111111", name: "Maria G.", updated: new Date().toISOString(), stats: { v: 3, x: 900, d: 4, l: 12, sl: 9, m: { q: 1, why: 1 }, b: {}, w: [],
    lg: [[NOW - 3600e3, "rp", "skeptical", 72, 1], [NOW - 7200e3, "rp", "<b>evil</b>", 99, 1]],
    rp: { n: 3, b: 81, s: [[NOW - 2 * D, 64, "friendly", "Q", 1, 1, "ggwggmmng"], [NOW - D, 81, "hurry", "CT", 1, 1, "gggggwgwg"], [NOW - 3600e3, 72, "skeptical", "Q", 1, 1, "ggwgggmmw"], [NOW, 99, "<img src=x onerror=window.__xss=1>", "Q", 1, 1, "ggggggggg"]] } } },
  { device: "bbbbbbbb-2222-4222-8222-222222222222", name: "Luis", updated: new Date().toISOString(), stats: { v: 3, x: 300, d: 2, l: 3, sl: 1, m: { q: 1 }, b: {}, w: [],
    rp: { n: 2, b: 40, s: [[NOW - 5 * D, 40, "brush", "NQ", 0, 0, "wwnnnnnnm"], [NOW - 4 * D, -1, "brush", "Q", 0, 0, "nnnnnnnnn"], [NOW - 3 * D, 12, "split", "NQ", 1, 0, "zzzzzzzz"]] } } }
];

(async () => {
  const browser = await chromium.launch();
  const mk = async (opts = {}, mode = {}) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, opts));
    await ctx.addInitScript(INIT);
    const p = await ctx.newPage();
    p.errors = []; p.fn = []; p.mode = mode; p.turnN = 0;
    p.on("pageerror", e => p.errors.push("pageerror: " + e.message));
    p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errors.push("console: " + m.text()); });
    await p.route("**/rest/v1/rpc/**", r => { const fn = r.request().url().split("/rpc/")[1]; r.fulfill({ status: 200, contentType: "application/json", body: fn === "sua_team" ? JSON.stringify(TEAMROWS) : '"ok"' }); });
    await p.route("**/functions/v1/sua-roleplay", async route => {
      const req = route.request(), headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Content-Type": "application/json" };
      if (req.method() === "OPTIONS") return route.fulfill({ status: 200, headers, body: "ok" });
      const b = JSON.parse(req.postData() || "{}"); p.fn.push(b);
      const send = (status, j) => route.fulfill({ status, headers, body: JSON.stringify(j) });
      if (p.mode.off) return send(503, { err: "off" });
      if (b.op === "status") return send(200, { on: true, left: 5, teamFull: false });
      if (b.op === "start") return send(200, { chat: "c0ffee00-0000-4000-8000-000000000001", left: 5, max: 24, scene: { ...SCENE, lang: b.lang } });
      if (b.op === "turn"){
        if (p.mode.busyOnce){ p.mode.busyOnce = false; return send(503, { err: "busy" }); }
        p.turnN++; const n = p.turnN, last = n >= 3;
        await new Promise(r => setTimeout(r, 250));
        return send(200, { lines: n === 1 ? [{ who: "A", text: "We're good, thanks." }, { who: "B", text: "Wait, what is it?" }] : n === 2 ? [{ who: "A", text: "I'm Mike, this is Linda. Is this a timeshare thing?" }] : [{ who: "B", text: "OK, 8 works. See you tomorrow!" }],
          cue: n === 1 ? "They slow down." : "", state: last ? "ended" : "talking", booked: last, turns: n, max: 24 });
      }
      if (b.op === "coach"){ await new Promise(r => setTimeout(r, 300)); return send(200, { ...COACH, call: b.call }); }
      return send(400, { err: "bad" });
    });
    await p.goto(url, { waitUntil: "load" });
    await p.waitForTimeout(300);
    return p;
  };
  const axe = async (p, label) => {
    if (!AXE){ axeSkipped++; return; }
    await p.addScriptTag({ path: AXE });
    const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations.map(v => `${v.id}(${v.nodes.length}): ${v.nodes.slice(0, 2).map(n => n.target.join(" ")).join(" | ")}`));
    ok(`axe ${label}`, v.length === 0, v.join("; "));
  };
  const overflow = async (p, label) => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    ok(`no sideways scroll ${label}`, w[0] <= w[1], w.join(" vs "));
  };

  /* 1. The whole flow */
  const p = await mk();
  await p.click('.tabs button[data-tab="games"]');
  ok("games tile", await p.isVisible("#rp"));
  await p.screenshot({ path: `${out}/01-games.png` });
  await p.click("#rp");
  ok("intro shows the focus chips", (await p.$$('input[name=focus]')).length === 7);
  ok("intro asks for a name when there is none", await p.isVisible("#rpName"));
  await axe(p, "intro"); await overflow(p, "intro");
  await p.screenshot({ path: `${out}/02-intro.png`, fullPage: true });
  await p.click('label.pchip:has(input[value="skeptical"])');
  await p.click("#rpGo");
  await p.waitForTimeout(200);
  ok("start without a name asks for it", (await p.textContent("#rpLeft")).includes("Add your name"));
  await p.fill("#rpName", "Test T.");
  await p.click("#rpGo");
  await p.waitForSelector("#rpLog", { timeout: 4000 });
  const start = p.fn.find(b => b.op === "start");
  ok("start sends focus, language and the device", start && start.focus === "skeptical" && start.lang === "en" && /^[0-9a-f-]{36}$/.test(start.device) && start.secret.length >= 20, JSON.stringify(start || {}).slice(0, 120));
  ok("scene shows the place and cues", (await p.textContent(".rp-scene")).includes("Palm Beach strip") && (await p.$$(".rp-scene li")).length === 2);
  await p.screenshot({ path: `${out}/03-chat-empty.png` });
  // typed line with Enter
  await p.fill("#rpText", "Good morning folks! Where are you from?");
  await p.press("#rpText", "Enter");
  await p.waitForSelector(".rp-msg.typing", { timeout: 2000 });
  ok("composer locked while waiting", await p.isDisabled("#rpSend"));
  await p.waitForSelector(".rp-msg.them:not(.typing)", { timeout: 4000 });
  const labels = await p.$$eval(".rp-msg.them .rp-who", els => els.map(e => e.textContent));
  ok("unknown names show as He and She", labels.join(",") === "He,She", labels.join(","));
  ok("cue shows", (await p.textContent(".rp-cue")).includes("They slow down"));
  ok("their lines are read aloud", (await p.evaluate(() => window.__spoken.length)) === 2);
  // second line by mic
  await p.evaluate(() => { window.__sayText = "We're inviting families to come see the newest hotel on the island."; });
  await p.click("#rpMic");
  await p.waitForTimeout(150);
  ok("talk mode: mic fills the box while listening", (await p.inputValue("#rpText")).includes("newest hotel") && (await p.getAttribute("#rpMic", "aria-pressed")) === "true");
  await p.waitForFunction(() => document.querySelectorAll(".rp-msg.me").length === 2, null, { timeout: 4000 });
  ok("talk mode: a pause sends the line by itself", true);
  await p.evaluate(() => { window.__sayText = ""; });
  await p.waitForFunction(() => document.querySelectorAll(".rp-msg.them:not(.typing)").length === 3, null, { timeout: 4000 });
  await p.waitForFunction(() => document.querySelector("#rpMic").getAttribute("aria-pressed") === "true", null, { timeout: 4000 }).catch(() => {});
  ok("talk mode: after they answer, the mic listens again", (await p.getAttribute("#rpMic", "aria-pressed")) === "true");
  await p.click("#rpMic");
  await p.waitForTimeout(200);
  ok("talk mode: tapping the mic stops it, nothing extra sent", (await p.getAttribute("#rpMic", "aria-pressed")) === "false" && (await p.$$(".rp-msg.me")).length === 2);
  const labels2 = await p.$$eval(".rp-msg.them .rp-who", els => els.map(e => e.textContent));
  ok("names appear once said, earlier labels too", labels2.join(",") === "Mike,Linda,Mike", labels2.join(","));
  // a failed send, then send again
  p.mode.busyOnce = true;
  await p.fill("#rpText", "No timeshare. Let me put you down for 8 o'clock.");
  await p.click("#rpSend");
  await p.waitForSelector(".rp-err", { timeout: 3000 });
  ok("busy shows Send again", (await p.textContent(".rp-err")).includes("Send again"));
  await p.screenshot({ path: `${out}/04-chat-error.png` });
  await p.click(".rp-err button");
  await p.waitForSelector(".sheet.show", { timeout: 5000 });
  ok("resend does not duplicate the line", (await p.$$(".rp-msg.me")).length === 3);
  ok("end sheet asks for the gift", (await p.textContent("#sheet")).includes("Which gift do they qualify for"));
  await axe(p, "chat + end sheet"); await overflow(p, "chat");
  await p.screenshot({ path: `${out}/05-end-sheet.png` });
  await p.click('#sheet [data-call="Q"]');
  await p.waitForSelector(".rp-score", { timeout: 5000 });
  const coachReq = p.fn.find(b => b.op === "coach");
  ok("coach gets the call", coachReq && coachReq.call === "Q");
  ok("score is computed from the statuses", (await p.textContent(".rp-ring b")).trim() === "62", await p.textContent(".rp-ring b"));
  ok("reveal shows grade and why", (await p.textContent(".rp-reveal")).includes("He's 47") && (await p.textContent(".rp-grade")) === "Q");
  ok("call marked right", await p.isVisible(".rp-callline.ok"));
  ok("8 steps listed, opener first", (await p.$$(".rp-step")).length === 8 && (await p.textContent(".rp-step b")).includes("Stop them"));
  ok("hear-it buttons for voice-note lines", (await p.$$('.rp-step [data-seg]')).length === 3);
  ok("asked facts", (await p.$$(".rp-ask .yes")).length === 2 && (await p.$$(".rp-ask .no")).length === 7);
  ok("interest graph", (await p.$$(".rp-graph i")).length === 3);
  await axe(p, "score"); await overflow(p, "score");
  await p.screenshot({ path: `${out}/06-score.png`, fullPage: true });
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem("showup.v1")));
  ok("result saved", st.rp.n === 1 && st.rp.best === 62 && st.rp.res.length === 1 && st.rp.res[0][6] === "ggwggmmnw", JSON.stringify(st.rp));
  ok("logged for the manager", st.log.some(e => e[1] === "rp" && e[2] === "skeptical" && e[3] === 62));
  ok("xp added", st.xp === 16, String(st.xp));
  ok("no handoff link on the team link", !(await p.$(".rp-handoff")));
  // the payload that goes to the team list includes rp
  await p.evaluate(() => pushSync());
  await p.waitForTimeout(400);
  // Me tab
  await p.click("#rpFinish");
  await p.click('.tabs button[data-tab="me"]');
  ok("Me shows practice stats", (await p.textContent("#app")).includes("street practice chats") && (await p.textContent("#app")).includes("best street score"));
  await p.screenshot({ path: `${out}/07-me.png`, fullPage: true });
  ok("no errors in flow", p.errors.length === 0, p.errors.join(" | "));

  /* 2. Off: the owner hasn't added the key */
  const q = await mk({}, { off: true });
  await q.evaluate(() => { S.name = "Off Test"; S.sync.ok = true; save(false); });
  await q.click('.tabs button[data-tab="games"]'); await q.click("#rp");
  await q.waitForFunction(() => document.querySelector("#rpLeft") && !/Checking/.test(document.querySelector("#rpLeft").textContent), null, { timeout: 3000 });
  ok("off: points to the free Claude version and disables Start", (await q.textContent("#rpLeft")).includes("free in the Claude version") && (await q.getAttribute("#rpLeft a", "href")).startsWith("https://claude.ai/artifact/") && await q.isDisabled("#rpGo"));
  await q.screenshot({ path: `${out}/08-off.png` });
  const q2 = await mk({}, { off: true });
  await q2.click('.tabs button[data-tab="games"]'); await q2.click("#rp");
  await q2.waitForSelector("#rpLeft a", { timeout: 3000 });
  ok("off, no name yet: points to the Claude version right away, no name field", (await q2.getAttribute("#rpLeft a", "href")).startsWith("https://claude.ai/artifact/") && await q2.isDisabled("#rpGo") && !(await q2.$("#rpName")));

  /* 3. Dark mode chat + score */
  const d = await mk({ colorScheme: "dark" });
  await d.evaluate(() => { S.name = "Dark T."; S.sync.ok = true; save(false); });
  await d.click('.tabs button[data-tab="games"]'); await d.click("#rp"); await d.click("#rpGo");
  await d.waitForSelector("#rpLog");
  for (const t of ["Hi there, where are you from?", "Nice to meet you Mike!", "Let me put you down for 8 o'clock."]){
    const n = (await d.$$(".rp-msg.them:not(.typing)")).length;
    await d.fill("#rpText", t); await d.press("#rpText", "Enter");
    await d.waitForFunction(k => document.querySelectorAll(".rp-msg.them:not(.typing)").length > k && !document.querySelector(".rp-msg.typing"), n, { timeout: 4000 });
  }
  await d.waitForSelector(".sheet.show", { timeout: 4000 });
  await axe(d, "dark chat"); await d.screenshot({ path: `${out}/09-dark-chat.png` });
  await d.click('#sheet [data-call="NQ"]'); await d.waitForSelector(".rp-score");
  ok("dark: wrong call marked", await d.isVisible(".rp-callline.no"));
  ok("dark: wrong call scores lower", (await d.textContent(".rp-ring b")).trim() === "53", await d.textContent(".rp-ring b"));
  await axe(d, "dark score"); await d.screenshot({ path: `${out}/10-dark-score.png`, fullPage: true });

  /* 4. Small phone */
  const s = await mk({ viewport: { width: 320, height: 640 } });
  await s.evaluate(() => { S.name = "Small"; S.sync.ok = true; save(false); });
  await s.click('.tabs button[data-tab="games"]'); await s.click("#rp"); await overflow(s, "320 intro");
  await s.click("#rpGo"); await s.waitForSelector("#rpLog"); await s.fill("#rpText", "Hello!"); await s.press("#rpText", "Enter");
  await s.waitForSelector(".rp-msg.them:not(.typing)"); await overflow(s, "320 chat");
  await s.screenshot({ path: `${out}/11-320-chat.png` });

  /* 4a. A Claude page where Claude can't run (signed out, or opened outside the Claude app) */
  const nctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await nctx.addInitScript(INIT); await nctx.addInitScript("window.claude = { use: async () => null };");
  const nc = await nctx.newPage();
  await nc.goto(OTHER, { waitUntil: "load" }); await nc.waitForTimeout(300);
  await nc.click('.tabs button[data-tab="games"]'); await nc.click("#rp");
  await nc.waitForSelector("#rpLeft a", { timeout: 4000 }).catch(() => {});
  ok("no Claude here: says to sign in and open the Claude version, Start off", /can't run on this page/.test(await nc.textContent("#rpLeft")) && (await nc.getAttribute("#rpLeft a", "href").catch(() => "")) === "https://claude.ai/artifact/Ejc8Grqk3BR9Y1avEkbAYY" && await nc.isDisabled("#rpGo"));
  await nctx.close();

  /* 4b. The Claude version: free, on the viewer's own account (sample mocked), on a host that isn't the team link */
  const SAMPLE = `window.__coachMock = ${JSON.stringify(COACH.coach)};
  window.claude = { use: async name => name === "sample" ? (() => {
    const f = async () => ({ text: "", truncated: false, modelTierApplied: "quick" });
    f.json = async (input, opts) => {
      window.__sampleCalls = (window.__sampleCalls || []).concat([{ kind: Array.isArray(input) ? "turn" : "coach", tier: opts && opts.modelTier, cache: opts && opts.cache, first: Array.isArray(input) ? input[0].content.slice(0, 40) : input.slice(0, 40), last: Array.isArray(input) ? input[input.length - 1] : null }]);
      await new Promise(r => setTimeout(r, 150));
      if (window.__sampleFail){ const c = window.__sampleFail; window.__sampleFail = null; throw { code: c, message: c }; }
      if (Array.isArray(input)){ const n = input.filter(t => t.role === "user").length - 1;
        return { lines: [{ who: "A", text: n === 1 ? "Hi! We're from Ohio." : "OK, 8 works. See you tomorrow!" }], cue: "They smile.", interest: 6, intent: "maybe", booked: n >= 2, state: n >= 2 ? "ended" : "talking" }; }
      return window.__coachMock;
    };
    return f;
  })() : null };`;
  const cctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await cctx.addInitScript(INIT); await cctx.addInitScript(SAMPLE);
  const c = await cctx.newPage(); c.errors = [];
  c.on("pageerror", e => c.errors.push("pageerror: " + e.message));
  await c.route("**/functions/v1/**", r => { c.errors.push("called the function: " + r.request().url()); r.abort(); });
  await c.goto(OTHER, { waitUntil: "load" }); await c.waitForTimeout(300);
  await c.click('.tabs button[data-tab="games"]'); await c.click("#rp");
  await c.waitForFunction(() => /Free: it runs on your own Claude account/.test(document.querySelector("#rpLeft")?.textContent || ""), null, { timeout: 4000 });
  ok("claude: intro says free on your own account", true);
  ok("claude: no name needed", !(await c.$("#rpName")) && !(await c.isDisabled("#rpGo")));
  await axe(c, "claude intro"); await c.screenshot({ path: `${out}/14-claude-intro.png` });
  await c.click('label.pchip:has(input[value="nq"])');
  await c.click("#rpGo"); await c.waitForSelector("#rpLog", { timeout: 3000 });
  ok("claude: scene from the shared engine", (await c.$$(".rp-scene li")).length >= 1);
  await c.evaluate(() => { window.__sampleFail = "rate_limited"; });
  await c.fill("#rpText", "Good morning! Where are you guys from?"); await c.press("#rpText", "Enter");
  await c.waitForSelector(".rp-err", { timeout: 3000 });
  ok("claude: usage limit shown, Send again offered", (await c.textContent(".rp-err")).includes("Claude limit"));
  await c.click(".rp-err button");
  await c.waitForSelector(".rp-msg.them:not(.typing)", { timeout: 3000 });
  await c.fill("#rpText", "Ohio! Let me put you down for 8 o'clock."); await c.press("#rpText", "Enter");
  await c.waitForSelector(".sheet.show", { timeout: 5000 });
  const calls = await c.evaluate(() => window.__sampleCalls);
  const turns = calls.filter(x => x.kind === "turn");
  ok("claude: each turn is a quick, uncached call that leads with the rules", turns.length === 3 && turns.every(x => x.tier === "quick" && x.cache === false && x.first.startsWith("You play a tourist couple")) && turns[2].last.role === "user");
  await c.click('#sheet [data-call="NQ"]');
  await c.waitForSelector(".rp-score", { timeout: 5000 });
  const ccalls = (await c.evaluate(() => window.__sampleCalls)).filter(x => x.kind === "coach");
  ok("claude: coach runs on the quick tier too", ccalls.length === 1 && ccalls[0].tier === "quick" && ccalls[0].first.startsWith("You are Shoco"));
  const href = await c.getAttribute(".rp-handoff a", "href");
  ok("claude: score page offers the team link with the result", !!href && href.startsWith("https://victorfromaruba-stack.github.io/iberostar-club/academy/#rp="), href || "none");
  await axe(c, "claude score"); await c.screenshot({ path: `${out}/15-claude-score.png`, fullPage: true });
  ok("claude: never called the paid function, no errors", c.errors.length === 0, c.errors.join(" | "));
  ok("claude: a booked couple who doesn't qualify scores 40 at most", await c.evaluate(() => RP.couple.grade !== "NQ" || !RP.saved[4] || RP.saved[1] <= 40), await c.evaluate(() => JSON.stringify([RP.couple.grade, RP.saved && RP.saved[1], RP.saved && RP.saved[4]])));
  // The handoff link opens the team app, which adds the result
  const code = href.split("#rp=")[1];
  const t2 = await mk();
  await t2.evaluate(() => { S.name = "Hand Off"; save(false); });
  await t2.goto(url + "#rp=" + code, { waitUntil: "load" }); await t2.waitForTimeout(400);
  const st2 = await t2.evaluate(() => JSON.parse(localStorage.getItem("showup.v1")));
  ok("handoff: result added once, hash cleared", st2.rp.n === 1 && st2.rp.res.length === 1 && st2.rp.res[0][2] && !(await t2.evaluate(() => location.hash)), JSON.stringify(st2.rp));
  await t2.goto(url + "#rp=" + code, { waitUntil: "load" }); await t2.waitForTimeout(400);
  ok("handoff: the same result isn't added twice", (await t2.evaluate(() => JSON.parse(localStorage.getItem("showup.v1")).rp.n)) === 1);
  await t2.goto(url + "#rp=eyJiYWQiOjF9", { waitUntil: "load" }); await t2.waitForTimeout(400);
  ok("handoff: a bad link is ignored", (await t2.evaluate(() => JSON.parse(localStorage.getItem("showup.v1")).rp.n)) === 1);

  /* 5. Manager panel */
  const m = await mk({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });
  await m.evaluate(() => { S.mgr = "GOOD-CODE"; save(false); });
  await m.click('.tabs button[data-tab="me"]'); await m.click("#mgr");
  await m.waitForSelector("#rpH", { timeout: 4000 });
  const card = await m.textContent('section[aria-labelledby="rpH"]');
  ok("panel: street practice card", card.includes("Practice chats") && card.includes("Steps to work on"), card.slice(0, 200));
  ok("panel: bad rows dropped (xss mood, bad codes)", !(await m.evaluate(() => window.__xss)) && card.includes("5"), card.match(/Practice chats\s*\d+/)?.[0]);
  await axe(m, "panel"); await m.screenshot({ path: `${out}/12-panel.png`, fullPage: true });
  await m.click('[data-open="aaaaaaaa-1111-4111-8111-111111111111"]');
  await m.waitForSelector("#spH");
  const wk = await m.textContent('section[aria-labelledby="spH"]');
  ok("worker: results listed", wk.includes("Skeptical couple") && wk.includes("best 81"), wk.slice(0, 160));
  const act = await m.textContent('section[aria-labelledby="acH"]');
  ok("worker: activity log shows practice, drops bad mood", act.includes("Street practice: skeptical couple, 72 of 100") && !act.includes("evil"), act.slice(0, 200));
  await axe(m, "worker"); await m.screenshot({ path: `${out}/13-worker.png`, fullPage: true });
  ok("no errors (panel)", m.errors.length === 0, m.errors.join(" | "));

  await browser.close();
  console.log(results.join("\n"));
  const fails = results.filter(r => r.startsWith("FAIL")).length;
  console.log(`\n${results.length - fails}/${results.length} passed`);
  if (axeSkipped) console.log(`${axeSkipped} accessibility checks skipped: axe-core not found`);
  process.exitCode = fails ? 1 : 0;
})();
