// End-to-end run of Show-Up Academy in headless Chromium, like a player on a phone (about 125 checks).
// Usage: node academy/src/e2e.js <pageUrl> <outDir>   (needs Playwright; serve academy/ with Range support, e.g. npx http-server academy)
// The team database is mocked here, so the test never writes to it.
const { chromium } = require("playwright");
const [url, out] = process.argv.slice(2);
const results = [];
const ok = (name, cond, extra = "") => results.push(`${cond ? "PASS" : "FAIL"} ${name}${extra !== "" ? " · " + extra : ""}`);

const SAY_MOCK = `window.SpeechRecognition = class { start(){ setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: window.__sayText || "" }]] }); this.onend && this.onend(); }, 60); } abort(){} stop(){} };`;
const EVIL = [
  { device: "11111111-1111-4111-8111-111111111111", name: "<img src=x onerror=\"window.__xss=1\">Eve", updated: "<b>x</b>",
    stats: { x: "<img src=x onerror=\"window.__xss=2\">", d: "<svg onload=window.__xss=3>", l: "1e99", sl: {}, m: { q: "<i>", final: "<b>" }, b: { q: "<img src=x onerror=window.__xss=4>" }, w: [["q1", "<img src=x onerror=window.__xss=5>"], ["nope", 3], "junk"] } },
  { device: "22222222-2222-4222-8222-222222222222", name: "Maria G.", updated: new Date().toISOString(), stats: { x: 900, d: 4, l: 12, sl: 9, m: { q:1, ctnq:1, who:1, why:2, offer:1, solid:1, map:1, final:1 }, b: {}, w: [["q2", 3]] } },
  { device: "33333333-3333-4333-8333-333333333333", name: "Maria G.", updated: new Date(Date.now() - 9 * 864e5).toISOString(), stats: { x: 40, d: 0, l: 0, sl: 0, m: {}, b: { q: 5 }, w: [] } },
  { device: "44444444-4444-4444-8444-444444444444", name: "Luis", updated: new Date().toISOString(), stats: { x: 300, d: 2, l: 3, sl: 1, m: { q:1, ctnq:1 }, b: {}, w: [["q2", 1], ["c3", 2]] } }
];

(async () => {
  const browser = await chromium.launch();
  const mk = async (opts = {}) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, opts));
    await ctx.addInitScript(SAY_MOCK);
    const p = await ctx.newPage();
    p.errors = [];
    p.on("pageerror", e => p.errors.push("pageerror: " + e.message));
    p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errors.push("console: " + m.text()); });
    p.bad = [];
    p.on("response", r => { if (r.status() >= 400 && !r.url().includes("/rpc/")) p.bad.push(r.status() + " " + r.url()); });
    p.rpc = [];
    await p.route("**/rest/v1/rpc/**", async route => {
      const fn = route.request().url().split("/rpc/")[1], body = JSON.parse(route.request().postData() || "{}");
      p.rpc.push({ fn, body });
      if (fn === "sua_save") return route.fulfill({ status: 200, contentType: "application/json", body: '"ok"' });
      if (fn === "sua_team") return body.p_code === "GOOD-CODE" ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(EVIL) }) : route.fulfill({ status: 400, contentType: "application/json", body: '{"message":"wrong code"}' });
      if (fn === "sua_hide") return route.fulfill({ status: 200, contentType: "application/json", body: '"ok"' });
      return route.fulfill({ status: 400, contentType: "application/json", body: '{"message":"too short"}' });
    });
    await p.goto(url, { waitUntil: "load" });
    await p.waitForTimeout(300);
    return p;
  };
  const p = await mk();
  const noOverflow = async (label, page = p) => {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
    ok(`no sideways scroll: ${label}`, r.sw <= r.w, `${r.sw} <= ${r.w}`);
  };
  const shot = (n, page = p) => page.screenshot({ path: `${out}/${n}.png` });
  // Answer the current lesson item through the real UI, right or wrong.
  const answer = (page, right) => page.evaluate(right => {
    const g = game, it = g.list[g.idx];
    if (it.type === "build"){
      const order = right ? g.tokens : g.tokens.slice().reverse();
      const used = [];
      order.forEach(t => { const i = g.tiles.findIndex((x, j) => x === t && !used.includes(j)); used.push(i); document.querySelector(`#bank .wtile[data-t="${i}"]`).click(); });
      document.querySelector("#check").click(); return "build";
    }
    if (it.type === "match"){
      const L = [...document.querySelectorAll('.mt[data-side="l"]')];
      if (right) L.forEach(l => { l.click(); document.querySelector(`.mt[data-side="r"][data-i="${l.dataset.i}"]`).click(); });
      else { L[0].click(); document.querySelector(`.mt[data-side="r"]:not([data-i="${L[0].dataset.i}"])`).click(); }
      return "match";
    }
    const k = right ? g.opts.indexOf(it.a) : g.opts.findIndex(o => o !== it.a);
    document.querySelector(`.opt[data-k="${k}"]`).click(); document.querySelector("#check").click();
    return it.type || (it.scen ? "scen" : it.pic ? "pic" : it.line ? "line" : "mc");
  }, right);
  const sheetUp = page => page.waitForSelector("#sheet.show #cont", { timeout: 3000 });
  async function clearRun(page){
    const kinds = new Set();
    while (await page.evaluate(() => !!game && game.kind === "run")){
      kinds.add(await answer(page, true)); await sheetUp(page);
      await page.evaluate(() => document.querySelector("#sheet.show #cont").click());
      await page.waitForTimeout(30);
    }
    return kinds;
  }

  // 1. First open
  ok("loads with no errors", p.errors.length === 0, p.errors.join(" | "));
  ok("9 voice notes loaded", await p.evaluate(() => CLIPS.length === 9 && CLIPS.every(c => c.s.length > 3)));
  ok("Learn tab with name form", await p.isVisible("#nm"));
  ok("13 level nodes on the path", await p.evaluate(() => document.querySelectorAll("[data-node]").length) === 13);
  ok("start node is Qualified guests", await p.evaluate(() => document.querySelector(".node.current")?.dataset.node) === "q");
  ok("both tracks open at the start", await p.evaluate(() => !document.querySelector('[data-node="why"]').classList.contains("locked") && document.querySelector('[data-node="ctnq"]').classList.contains("locked")));
  ok("final locked", await p.evaluate(() => document.querySelector('[data-node="final"]').classList.contains("locked")));
  ok("NLP waits for Remove the doubt", await p.evaluate(() => document.querySelector('[data-node="nlp1"]').classList.contains("locked")));
  await noOverflow("learn, fresh");
  await p.fill("#nm", "Maria <b>G.</b>"); await p.keyboard.press("Enter");
  ok("name shows, escaped", (await p.textContent(".say-row .bubble")).includes("Hi Maria <b>G.</b>"));
  ok("saving a name syncs the phone", await p.waitForFunction(() => S.sync.ok === true, null, { timeout: 5000 }).then(() => true, () => false));
  ok("sync sends name and progress only", p.rpc.some(r => r.fn === "sua_save" && r.body.p_name === "Maria <b>G.</b>" && r.body.p_stats.v === 2 && !("mgr" in r.body.p_stats)));

  // 2. Popover and guidebook
  await p.click('[data-node="q"]');
  ok("node opens a popover with Start", await p.isVisible('[data-start="q"]'));
  ok("a new level offers Learn first", /Learn first/.test(await p.textContent('[data-guide="q"]')));
  await p.click('[data-guide="q"]');
  ok("guidebook opens", await p.isVisible("text=Guidebook"));
  await noOverflow("guidebook q");
  await p.click("#back");

  // 3. Lesson: select, Check, right sheet, then a wrong answer sends you back
  await p.click('[data-node="q"]'); await p.click('[data-start="q"]');
  ok("lesson opens full screen without tabs", await p.evaluate(() => document.body.classList.contains("full") && document.querySelector("nav.tabs").hidden));
  ok("Check is off until you pick", await p.isDisabled("#check"));
  await p.keyboard.press("1");
  ok("key 1 picks the first answer", await p.evaluate(() => game.sel === 0) && !(await p.isDisabled("#check")));
  await p.evaluate(() => select(-1));
  const t0 = await answer(p, true); await sheetUp(p);
  ok("right answer: green sheet", await p.evaluate(() => document.querySelector("#sheet").classList.contains("good")), t0);
  ok("mascot reacts happy", await p.evaluate(() => document.querySelector(".lm")?.dataset.mood === "happy"));
  ok("progress bar moves", await p.evaluate(() => parseFloat(document.querySelector(".l-bar i").style.width) > 0));
  await p.keyboard.press("Enter");
  ok("Enter continues to item 2", await p.evaluate(() => game.idx === 1));
  const firstOrder = await p.evaluate(() => game.list.map(q => q.id).join());
  const missedId = await p.evaluate(() => game.list[game.idx].id);
  await answer(p, false); await sheetUp(p);
  ok("wrong answer: red sheet, back to the start", await p.evaluate(() => document.querySelector("#sheet").classList.contains("bad") && /Back to the start/.test(document.querySelector("#sheet").textContent)));
  ok("heart breaks", await p.evaluate(() => document.querySelector("#heart").classList.contains("broken") && document.querySelector("#heart b").textContent === "0"));
  ok("shows the right answer and why", await p.evaluate(() => /Correct answer:/.test(document.querySelector("#sheet").textContent)));
  ok("best run saved", await p.evaluate(() => S.best.q === 1));
  ok("miss counted", await p.evaluate(() => Object.values(S.misses).reduce((a, b) => a + b, 0) === 1));
  await shot("e2e-02-wrong");
  await p.click("#sheet #cont");
  ok("start over from item 1", await p.evaluate(() => game.idx === 0));
  ok("new random order", await p.evaluate(o => game.list.map(q => q.id).join() !== o, firstOrder));
  ok("the missed question comes back second", await p.evaluate(id => game.list[1].id === id && game.list.filter(q => q.id === id).length === 1, missedId));
  await p.click("#quit");
  ok("quit asks first", await p.isVisible("#stay"));
  await p.click("#stay");
  ok("Keep going stays in the lesson", await p.evaluate(() => !!game && game.kind === "run"));
  const kq = await clearRun(p);
  ok("clean run masters the level", await p.evaluate(() => !!S.mastered.q), [...kq].join(","));
  ok("celebration screen", await p.isVisible("text=Level mastered!"));
  await p.waitForTimeout(1100);
  ok("XP counts up", Number(await p.textContent("#cxp")) > 0);
  await shot("e2e-03-celebrate");
  await p.click("#cont");
  ok("first lesson of the day shows the streak", await p.isVisible("text=day streak"));
  await p.click("#cont");
  ok("next node is now current", await p.evaluate(() => currentId() === "why" && document.querySelector(".node.current")?.dataset.node === "why"));

  // 4. Every exercise type, through the UI
  for (const type of ["build", "match", "listen", "pic", "line"]){
    const L = await p.evaluate(type => { const L = LEVELS.find(l => (l.qs || []).some(q => q.type === type || q[type])); const q = L.qs.find(q => q.type === type || q[type]); startRun(L, [q, ...L.qs.filter(x => x !== q)]); return L.id; }, type);
    await p.waitForTimeout(150);
    await noOverflow(`${type} item`);
    if (type === "listen"){
      await p.evaluate(() => { AUD.muted = true; });
      await p.click("#hear");
      await p.waitForTimeout(1200);
      const a = await p.evaluate(() => { const it = game.list[game.idx], [s, e] = segTimes(it.clip, it.from, it.to); return { t: AUD.currentTime, s, e, src: AUD.src.split("/").pop(), rate: AUD.playbackRate }; });
      ok("listen plays the trainer's clip segment", a.src === (await p.evaluate(() => game.list[game.idx].clip + ".mp3")) && a.t >= a.s - 0.2 && a.t <= a.e + 0.3, JSON.stringify(a));
      await p.click("#hearSlow"); await p.waitForTimeout(400);
      ok("slow button plays at 0.75×", await p.evaluate(() => AUD.playbackRate === 0.75));
    }
    if (type === "pic"){
      await p.waitForFunction(() => document.querySelector(".photo img")?.complete, null, { timeout: 5000 }).catch(() => {});
      ok("photo loads", await p.evaluate(() => document.querySelector(".photo img").naturalWidth > 300));
    }
    if (type === "build"){
      await p.evaluate(() => document.querySelector("#bank .wtile").click());
      ok("tapping a word moves it up", await p.evaluate(() => document.querySelectorAll("#ans .wtile").length === 1));
      await p.evaluate(() => document.querySelector("#ans .wtile").click());
      ok("tapping it again puts it back", await p.evaluate(() => document.querySelectorAll("#ans .wtile").length === 0));
    }
    await answer(p, true); await sheetUp(p);
    ok(`${type}: right answer accepted`, await p.evaluate(() => document.querySelector("#sheet").classList.contains("good")), L);
    await p.evaluate(type => { const L = LEVELS.find(l => (l.qs || []).some(q => q.type === type || q[type])); const q = L.qs.find(q => q.type === type || q[type]); startRun(L, [q, ...L.qs.filter(x => x !== q)]); }, type);
    await answer(p, false); await sheetUp(p);
    ok(`${type}: wrong answer caught`, await p.evaluate(() => document.querySelector("#sheet").classList.contains("bad")));
    await shot(`e2e-04-${type}`);
  }
  // scenario items
  await p.evaluate(() => { S.mastered.ctnq = { count: 1, last: Date.now() }; save(false); play("who"); });
  ok("who: 12 couples", await p.evaluate(() => game.list.length === 12 && game.list.every(q => q.scen)));
  ok("scenario shows guest chips or text", await p.isVisible(".guest-tag"));
  await answer(p, true); await sheetUp(p);
  ok("scenario: right grade accepted", await p.evaluate(() => document.querySelector("#sheet").classList.contains("good")));
  await p.evaluate(() => document.querySelector("#sheet #cont").click());
  await clearRun(p);
  ok("who mastered", await p.evaluate(() => !!S.mastered.who));
  await p.click("#cont");

  // 5. Scenario logic: generated couples follow the PDF bands
  const bandErr = await p.evaluate(() => {
    const errs = [];
    for (let i = 0; i < 3000; i++){
      const s = genScenario(); const m = s.q.match(/He's (\d+), she's (\d+)/); const his = +m[1], her = +m[2];
      let want;
      if (/Venezuela|Ecuador|Haiti|Cuba/.test(s.q)) want = "NQ";
      else if (/Argentina/.test(s.q)) want = bandArg(his);
      else if (/Mexico|Colombia|Peru|Chile|Uruguay|Costa Rica|Panama|Dominican|Guatemala|Bolivia/.test(s.q)) want = bandLat(his);
      else want = bandUSA(his);
      if (want !== s.g) errs.push(s.q + " → " + s.g);
      // Brazil or Quebec cards would leave the language rule in doubt.
      if (/Brazil|Quebec/.test(s.q)) errs.push("language in doubt " + s.q);
      if (/Argentina/.test(s.q) && bandArg(his) !== "Q" && bandArg(her) !== bandArg(his)) errs.push("mixed band " + s.q);
    }
    return errs.slice(0, 3);
  });
  ok("3000 generated couples graded by the PDF rules", bandErr.length === 0, bandErr.join(" | "));

  // 5a. Word for word: answer, then hear the real line
  await p.evaluate(() => { const L = byId("words"); startRun(L, [L.qs.find(q => q.id === "k8"), ...L.qs.filter(q => q.id !== "k8")]); AUD.muted = true; });
  await answer(p, true); await sheetUp(p);
  ok("word-for-word sheet offers Hear the line", await p.isVisible("#sheet [data-seg]"));
  await p.click("#sheet [data-seg]"); await p.waitForTimeout(900);
  ok("Hear the line plays the voice note", await p.evaluate(() => AUD.src.endsWith("04.mp3") && AUD.currentTime > 2));

  // 5b. NLP unit
  await p.evaluate(() => { S.mastered.why = { count: 1, last: Date.now() }; save(false); tab("learn"); });
  ok("NLP opens after Remove the doubt", await p.evaluate(() => !document.querySelector('[data-node="nlp1"]').classList.contains("locked")));
  await p.evaluate(() => guidebook("nlp2"));
  ok("NLP guidebook has voice-note buttons and practice lines", await p.evaluate(() => document.querySelectorAll(".note [data-seg]").length >= 4 && document.querySelectorAll('.note [data-say]').length === 2));
  await p.evaluate(() => { window.__sayText = "is whatsapp or a regular call better for you guys"; });
  await p.click('[data-say="n2b"]'); await p.waitForTimeout(400);
  ok("NLP practice line scores with Say it", await p.evaluate(() => S.said.n2b >= 0.99 && /practiced/i.test(document.querySelector('[data-said="n2b"]').textContent)));
  await p.evaluate(() => play("nlp1"));
  const kn = await clearRun(p);
  ok("NLP level masters through the UI", await p.evaluate(() => !!S.mastered.nlp1), [...kn].join(","));
  await p.click("#cont");
  if (await p.isVisible("text=day streak")) await p.click("#cont");

  // 6. Pitch map
  await p.evaluate(() => { ["why", "offer", "solid", "words"].forEach(id => S.mastered[id] = { count: 1, last: Date.now() }); save(false); tab("games"); });
  ok("games: map and lightning open", await p.isVisible("#mp") && await p.isVisible("#lg"));
  await p.click("#mp");
  await p.evaluate(() => document.querySelector(`.cardbtn[data-i="${game.step + 1}"]`).click());
  ok("map: wrong step sends you back", await p.isVisible("text=Back to the start"));
  await p.click("#sheet #cont");
  for (let r = 0; r < 2; r++) for (let i = 0; i < 7; i++) await p.evaluate(() => document.querySelector(`.cardbtn[data-i="${game.step}"]`).click());
  ok("map: two rounds in order masters it", await p.evaluate(() => !!S.mastered.map));
  ok("map: celebration", await p.isVisible("text=Level mastered!"));
  await p.click("#cont");

  // 7. Lightning
  await p.evaluate(() => tab("games")); await p.click("#lg"); await p.click("#go");
  for (let i = 0; i < 3; i++) await p.evaluate(() => document.querySelector(`[data-g="${game.cur.g}"]`).click());
  ok("lightning: score counts", await p.evaluate(() => game.score === 3));
  await p.evaluate(() => document.querySelector(`[data-g="${["Q", "CT", "NQ"].find(g => g !== game.cur.g)}"]`).click());
  ok("lightning: one mistake ends it, record saved", await p.evaluate(() => S.lightning === 3) && await p.isVisible("text=New record!"));
  ok("lightning: shows the couple you missed", await p.isVisible("text=Right answer:"));
  await noOverflow("lightning end");
  await p.click("#home");

  // 8. Daily 10
  await p.evaluate(() => tab("games")); await p.click("#dy");
  ok("daily: 10 items from mastered levels", await p.evaluate(() => game.L.id === "daily" && game.list.length === 10));
  await clearRun(p);
  ok("daily: done today", await p.evaluate(() => S.daily.last === today()));
  await p.click("#cont");

  // 9. Script tab: lines in the trainer's voice and Say it
  await p.evaluate(() => tab("script"));
  ok("script: 22 lines", await p.evaluate(() => document.querySelectorAll(".line[data-line]").length === 22));
  ok("script lines show their NLP move", await p.evaluate(() => document.querySelectorAll(".nlp-tag").length >= 10));
  await noOverflow("script");
  await p.evaluate(() => { AUD.muted = true; });
  await p.click('[data-key="s3a"]');
  await p.waitForTimeout(900);
  const sa = await p.evaluate(() => { const [s, e] = segTimes("04", 1, 1); return { t: AUD.currentTime, s, e, src: AUD.src.split("/").pop(), label: document.querySelector('[data-key="s3a"]').textContent.trim() }; });
  ok("Hear it plays the line from the voice note", sa.src === "04.mp3" && sa.t >= sa.s - 0.2 && sa.t <= sa.e + 0.3, JSON.stringify(sa));
  ok("button shows Pause while playing", /Pause/.test(sa.label));
  await p.evaluate(() => { window.__sayText = "let me get you an invitation"; });
  await p.click('[data-say="s3a"]'); await p.waitForTimeout(400);
  ok("Say it scores a good try", await p.evaluate(() => S.said.s3a >= 0.99 && /Nailed it/.test(document.querySelector('[data-score="s3a"]').textContent)));
  ok("practiced count updates", /1 of 22/.test(await p.textContent("#saidCount")));
  await p.evaluate(() => { window.__sayText = "would you like an invite"; });
  await p.click('[data-say="s4a"]'); await p.waitForTimeout(400);
  ok("Say it asks for another try when off", await p.evaluate(() => /try once more/.test(document.querySelector('[data-score="s4a"]').textContent) && !(S.said.s4a >= 0.7)));
  await p.click('[data-play-clip="02"]'); await p.waitForTimeout(3000);
  ok("full voice note plays with the transcript", await p.evaluate(() => !AUD.paused && A.mode === "full" && A.clip === "02" && !document.querySelector('[data-tx="02"]').hidden && !!document.querySelector('[data-clip="02"] .seg.now')));
  await p.evaluate(() => document.querySelector('[data-clip="02"] .seg[data-k="5"]').click()); await p.waitForTimeout(500);
  ok("tap a sentence to jump", await p.evaluate(() => Math.abs(AUD.currentTime - CLIPS[1].s[5][0]) < 1.5));
  await p.evaluate(() => tab("me"));
  ok("audio stops when you leave", await p.evaluate(() => AUD.paused));

  // 10. Offer guidebook: flyer, photos and the golf video
  await p.evaluate(() => guidebook("offer"));
  await p.waitForTimeout(1200);
  const media = await p.evaluate(() => ({ imgs: [...document.querySelectorAll(".gb-hero img")].map(i => i.complete && i.naturalWidth > 0), video: (v => v && { ready: v.readyState, muted: v.muted, loop: v.loop })(document.querySelector("video")) }));
  ok("offer guidebook images load", media.imgs.length >= 3 && media.imgs.every(Boolean), JSON.stringify(media.imgs));
  const h264 = await p.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="avc1.4D401F"'));
  if (h264) ok("golf video is a muted loop", !!media.video && media.video.muted && media.video.loop && media.video.ready >= 2, JSON.stringify(media.video));
  else {
    const v = await p.evaluate(async () => { const r = await fetch(document.querySelector("video").getAttribute("src")); return { status: r.status, type: r.headers.get("content-type"), size: (await r.arrayBuffer()).byteLength }; });
    ok("golf video is a muted loop (this test browser has no H.264, so the file is checked instead)", !!media.video && media.video.muted && media.video.loop && v.status === 200 && v.type === "video/mp4" && v.size > 100000, JSON.stringify(v));
  }
  await noOverflow("offer guidebook");
  await shot("e2e-10-offer");

  // 11. Me tab and the WhatsApp report
  await p.evaluate(() => tab("me"));
  ok("me: stats and week", await p.isVisible("text=This week") && await p.isVisible("text=Lightning record"));
  await p.click("#rp");
  const rep = await p.inputValue("#rt");
  ok("report has a code line", /#SUA1-[A-Za-z0-9_-]+$/.test(rep));
  const back = await p.evaluate(t => parseReports(t)[0], rep);
  const mc = await p.evaluate(() => masteredCount());
  ok("report code reads back", back && back.name === "Maria <b>G.</b>" && back.mastered === mc && back.stats.l === 3, back && `${back.name} ${back.mastered}/${mc}`);
  await p.click("#back");

  // 12. Manager view (mocked team list with hostile data)
  await p.click("#mgr");
  await p.fill("#code", "nope"); await p.click("#codeForm button");
  await p.waitForSelector("text=That code didn't work");
  ok("manager: wrong code refused", await p.evaluate(() => S.mgr === ""));
  await p.fill("#code", "GOOD-CODE"); await p.click("#codeForm button");
  await p.waitForSelector(".summary");
  await p.evaluate(() => document.querySelectorAll("[data-person]").forEach(b => b.click()));
  await p.waitForTimeout(300);
  ok("manager: hostile fields render as text", await p.evaluate(() => !window.__xss && !document.querySelector(".person img, .person svg[onload], .person i:not(.on):not([class='']):not(.mini-bar i)")) && await p.evaluate(() => [...document.querySelectorAll(".pname")].some(n => n.textContent.startsWith("<img src=x"))));
  ok("manager: bad numbers become 0", await p.evaluate(() => [...document.querySelectorAll(".person")].find(a => /Eve/.test(a.textContent)).querySelector(".pstreak b").textContent === "0"));
  ok("manager: knows-it-all group first", await p.evaluate(() => /Knows it all · 1/.test(document.querySelector(".group-h")?.textContent || "")));
  ok("manager: same names kept apart, with a note", await p.evaluate(() => [...document.querySelectorAll(".pname")].filter(n => n.textContent === "Maria G.").length === 2 && /same name/.test(document.body.textContent)));
  ok("manager: team misses summed", await p.evaluate(() => /missed 4×/.test(document.querySelector(".card.weak")?.textContent || "")));
  await noOverflow("manager view");
  await shot("e2e-12-team");
  await p.click("summary:has-text('Add a report')");
  await p.fill("#paste", "hi\n" + rep.replace("Maria <b>G.</b>", "x"));
  await p.click("#add");
  await p.waitForSelector("text=from WhatsApp");
  ok("manager: pasted report shows up", true);
  const hb = '[data-hide="44444444-4444-4444-8444-444444444444"]';
  await p.evaluate(() => document.querySelectorAll("[data-person]").forEach(b => b.click()));
  await p.click(hb); await p.click(hb); await p.waitForTimeout(300);
  ok("manager: hide calls the server with the code", p.rpc.some(r => r.fn === "sua_hide" && r.body.p_device.startsWith("4444") && r.body.p_code === "GOOD-CODE"));
  await p.click("#forget");
  ok("manager: forget clears the code", await p.evaluate(() => S.mgr === "") && await p.isVisible("#code"));
  await p.click("#back");

  // 13. Review due, final run, certificate
  await p.evaluate(() => { S.mastered.q.last = Date.now() - 2 * DAY; save(false); tab("learn"); });
  ok("review due shows on the path", await p.evaluate(() => document.querySelector('[data-node="q"]').classList.contains("due") && /Review time/.test(document.querySelector(".say-row .bubble").textContent)));
  ok("final still locked until NLP is done", await p.evaluate(() => document.querySelector('[data-node="final"]').classList.contains("locked")));
  await p.evaluate(() => { ["words", "nlp2", "nlp3", "nlp4"].forEach(id => S.mastered[id] = { count: 1, last: Date.now() }); save(false); tab("learn"); });
  ok("final unlocked after all 12", await p.evaluate(() => !document.querySelector('[data-node="final"]').classList.contains("locked")));
  await p.evaluate(() => play("final"));
  ok("final: 20 mixed items", await p.evaluate(() => game.list.length === 20));
  await clearRun(p);
  ok("final: certificate with the name", await p.isVisible(".cert") && (await p.textContent(".cert .who")) === "Maria <b>G.</b>");
  ok("final: rank Show-Up Pro", await p.evaluate(() => rank() === "Show-Up Pro"));
  await shot("e2e-13-cert");
  ok("sync carried final + levels", p.rpc.filter(r => r.fn === "sua_save").length >= 2);
  ok("no errors in the main run", p.errors.length === 0, p.errors.slice(0, 3).join(" | "));
  ok("no missing files", p.bad.length === 0, p.bad.join(" | "));

  // 14. Storage blocked, reduced motion, small phone, dark
  const ctxS = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctxS.addInitScript(() => { Object.defineProperty(window, "localStorage", { get(){ throw new Error("blocked"); } }); });
  const ps = await ctxS.newPage(); const se = []; ps.on("pageerror", e => se.push(e.message));
  await ps.route("**/rest/v1/rpc/**", r => r.fulfill({ status: 200, contentType: "application/json", body: '"ok"' }));
  await ps.goto(url); await ps.waitForTimeout(300);
  await ps.fill("#nm", "Ana"); await ps.keyboard.press("Enter");
  await ps.evaluate(() => play("q")); await answer(ps, true); await sheetUp(ps);
  ok("works when storage is blocked", se.length === 0 && await ps.evaluate(() => S.name === "Ana"), se.join(" | "));
  await ctxS.close();

  const pr = await mk({ reducedMotion: "reduce" });
  await pr.fill("#nm", "Ana"); await pr.keyboard.press("Enter");
  ok("reduced motion: no pulsing node", await pr.evaluate(() => getComputedStyle(document.querySelector(".node.current")).animationName === "none"));
  await pr.evaluate(() => play("q")); await clearRun(pr);
  ok("reduced motion: lesson works", pr.errors.length === 0 && await pr.isVisible("text=Level mastered!"));

  const pn = await mk({ viewport: { width: 320, height: 640 } });
  await noOverflow("learn at 320px", pn);
  await pn.fill("#nm", "Ana"); await pn.keyboard.press("Enter");
  await pn.evaluate(() => { const L = byId("q"); const q = L.qs.find(q => q.type === "match"); startRun(L, [q]); });
  await noOverflow("match at 320px", pn);
  await pn.evaluate(() => { S.mastered = Object.fromEntries(LEVEL_IDS.slice(0, 12).map(id => [id, { count: 1, last: Date.now() }])); play("who"); });
  await noOverflow("scenario at 320px", pn);
  await pn.evaluate(() => tab("script")); await noOverflow("script at 320px", pn);
  await pn.evaluate(() => tab("me")); await noOverflow("me at 320px", pn);
  await shot("e2e-14-320-me", pn);

  const pd = await mk({ colorScheme: "dark" });
  ok("dark: background is dark", await pd.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number); return c[0] + c[1] + c[2] < 120; }));
  ok("no errors in other runs", [pr, pn, pd].every(x => x.errors.length === 0), [pr, pn, pd].flatMap(x => x.errors).slice(0, 3).join(" | "));

  await browser.close();
  const fails = results.filter(r => r.startsWith("FAIL"));
  console.log(results.join("\n"));
  console.log(`\n${results.length - fails.length} passed, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log(results.join("\n")); console.log("CRASH", e.message.split("\n").slice(0, 3).join(" ")); process.exit(2); });
