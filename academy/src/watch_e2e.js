/* The "Tips and tricks" unit plays short cuts from the Timeshare OPC
   University videos. They are served from this site now, not embedded, so
   what matters is that the clip element is really there, that the file it
   points at actually exists and is small enough to start instantly on a
   phone, and that the question around it behaves like any other question. */
const { chromium } = require('playwright');
const URL = process.argv[2];
const fail = m => { console.log("FAIL  " + m); process.exit(1); };

const mastered = () => ({ count: 1, last: Date.now() });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('showup.v1', JSON.stringify({
      name: "Tester", intro: true, tab: "learn", sound: false,
      mastered: { q: { count: 1, last: Date.now() }, why: { count: 1, last: Date.now() },
                  ready: { count: 1, last: Date.now() }, st2: { count: 1, last: Date.now() } }
    })); } catch (e) { /* private mode */ }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await ctx.route('**/rest/v1/rpc/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '"ok"' }));
  /* Let the page ask for the embed but never actually load YouTube in CI. */

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-node="tip1"]', { timeout: 20000 })
    .catch(() => fail('the "Tricks of the trade" level is not on the path'));
  await page.click('[data-node="tip1"]');
  await page.waitForSelector('[data-start="tip1"]', { timeout: 10000 })
    .catch(() => fail("tapping the level did not open its start button"));
  await page.click('[data-start="tip1"]');

  /* Walk the run until a watch item shows up; the order is shuffled. */
  let frame = null;
  for (let i = 0; i < 12 && !frame; i++) {
    await page.waitForSelector('.l-kind', { timeout: 10000 });
    const kind = (await page.textContent('.l-kind')) || "";
    if (/watch/i.test(kind)) { frame = await page.$('.ytbox video'); break; }
    /* Answer something and move on. */
    const opts = await page.$$('.opt');
    if (!opts.length) fail("an item in this level had no options");
    await opts[0].click();
    await page.click('#check');
    await page.waitForSelector('#cont', { timeout: 10000 });
    await page.click('#cont');
  }
  if (!frame) fail("no watch item appeared in 12 items of the level");

  const src = await frame.getAttribute('src');
  const m = /^video\/clips\/([A-Za-z0-9_-]{11})-(\d+)-(\d+)\.mp4$/.exec(src || "");
  if (!m) fail("the clip is not served from this site: " + src);
  const from = +m[2], to = +m[3];
  if (from <= 0) fail("the clip starts at 0 instead of the moment it is about: " + src);
  /* A cut, not the whole video: long enough to say something, short enough
     that nobody watches six minutes to answer one question. */
  if (to <= from) fail(`the clip ends before it starts (${from} to ${to})`);
  if (to - from < 8) fail(`the clip is only ${to - from}s, too short to hear the point`);
  if (to - from > 60) fail(`the clip is ${to - from}s, that is a video not a cut`);

  /* The file has to be really there, and small enough to open on LTE. */
  const base = URL.replace(/\/$/, '');
  const head = await page.evaluate(async (u) => {
    const r = await fetch(u, { method: 'HEAD' });
    return { ok: r.ok, status: r.status, len: +(r.headers.get('content-length') || 0), type: r.headers.get('content-type') || '' };
  }, `${base}/${src}`);
  if (!head.ok) fail(`the clip file is missing (${head.status}): ${src}`);
  if (!/video\//.test(head.type)) fail(`the clip is served as ${head.type}, not video`);
  if (head.len > 3 * 1024 * 1024) fail(`the clip is ${(head.len / 1048576).toFixed(1)} MB, too heavy for a phone on LTE`);

  /* And it must actually decode, not just download. */
  const playable = await page.evaluate(() => {
    const v = document.querySelector('.ytbox video');
    return new Promise((res) => {
      if (v.readyState >= 1) return res({ dur: v.duration, w: v.videoWidth });
      v.addEventListener('loadedmetadata', () => res({ dur: v.duration, w: v.videoWidth }), { once: true });
      v.addEventListener('error', () => res({ err: true }), { once: true });
      setTimeout(() => res({ timeout: true }), 15000);
    });
  });
  if (playable.err) fail("the browser could not decode the clip");
  if (playable.timeout) fail("the clip never loaded its metadata");
  if (Math.abs(playable.dur - (to - from)) > 1.5) fail(`the clip plays ${playable.dur}s but should be ${to - from}s`);

  /* The question around it must still work. */
  const opts = await page.$$('.opt');
  if (opts.length < 3) fail("the watch item has no answer options");
  await opts[0].click();
  await page.click('#check');
  await page.waitForSelector('#sheet.good, #sheet.bad', { timeout: 10000 })
    .catch(() => fail("checking the answer on a watch item gave no verdict"));

  if (errors.length) fail("page error: " + errors[0]);
  if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: true });
  console.log(`PASS  ${to - from}s clip served from this site (${(head.len / 1024).toFixed(0)} KB, ${playable.w}px, plays ${playable.dur.toFixed(1)}s)`);
  await b.close();
})().catch(e => fail(e.message));
