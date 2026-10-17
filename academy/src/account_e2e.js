/* Getting your progress back on a new phone.
   The thing worth testing is that a fresh phone with empty storage ends up
   holding the real progress, and that someone still on the shared 1234 is
   made to choose their own code before anything else. */
const { chromium } = require('playwright');
const URL = process.argv[2];
const fail = m => { console.log("FAIL  " + m); process.exit(1); };

const STATS = {
  v: 3, x: 4210, l: 17, gt: 26,
  m: { q: 2, ctnq: 1, who: 1 }, ml: { q: Date.now() - 2 * 864e5, ctnq: Date.now() - 864e5, who: Date.now() },
  b: { q: 9, ctnq: 7, who: 6 }, a: { q: [40, 6, 5], ctnq: [22, 3, 2] },
  w: [["q1", 3]], lg: [], dd: ["2026-10-15", "2026-10-16", "2026-10-17"],
  rp: { n: 4, b: 82, s: [] }
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  let claimBody = null, pinBody = null;
  await ctx.route('**/rest/v1/rpc/sua_save', r => r.fulfill({ status: 200, contentType: 'application/json', body: '"ok"' }));
  await ctx.route('**/rest/v1/rpc/sua_claim', r => {
    claimBody = JSON.parse(r.request().postData() || '{}');
    if (claimBody.p_pin !== '1234') return r.fulfill({ status: 400, contentType: 'application/json',
      body: JSON.stringify({ message: 'wrong name or pin' }) });
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ stats: STATS, must_change: true }) });
  });
  await ctx.route('**/rest/v1/rpc/sua_set_pin', r => {
    pinBody = JSON.parse(r.request().postData() || '{}');
    r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
  });

  /* A phone that has never seen the Academy. */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#haveAcct', { timeout: 20000 });
  await page.click('#haveAcct');
  await page.waitForSelector('#rsForm', { timeout: 10000 });

  /* Wrong code first: it must say so and not let anyone in. */
  await page.fill('#rnm', 'Suanny C');
  await page.fill('#rpin', '9999');
  await page.click('#rsForm button');
  await page.waitForFunction(() => /don't match/i.test(document.body.innerText), { timeout: 10000 })
    .catch(() => fail("a wrong code did not produce a clear message"));

  /* Then the real one. */
  await page.fill('#rnm', 'Suanny C');
  await page.fill('#rpin', '1234');
  await page.click('#rsForm button');

  /* Still on 1234, so it must land on the code screen, not the lessons. */
  await page.waitForSelector('#pinForm', { timeout: 10000 })
    .catch(() => fail("signing in with the shared 1234 did not ask for a new code"));

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('showup.v1')));
  if (saved.name !== 'Suanny C') fail("name not restored: " + saved.name);
  if (saved.xp !== STATS.x) fail(`XP not restored: ${saved.xp} vs ${STATS.x}`);
  if (saved.lightning !== STATS.l) fail(`Lightning record not restored: ${saved.lightning}`);
  if (saved.gaunt !== STATS.gt) fail(`Gauntlet record not restored: ${saved.gaunt}`);
  if (Object.keys(saved.mastered || {}).length !== 3) fail("mastered levels not restored: " + JSON.stringify(saved.mastered));
  if ((saved.days || []).length !== 3) fail("streak days not restored");
  if (!saved.sync || !saved.sync.device) fail("no device id was generated for this phone");
  if (claimBody.p_device !== saved.sync.device) fail("claimed with a different device id than it kept");

  /* Choosing a new code. */
  await page.fill('#pn', '7391');
  await page.click('#pinForm button');
  await page.waitForFunction(() => /that code gets your progress back/i.test(document.body.innerText), { timeout: 10000 })
    .catch(() => fail("setting the new code gave no confirmation"));
  if (!pinBody || pinBody.p_pin !== '7391') fail("the new code was not sent to the server");
  if (pinBody.p_device !== saved.sync.device) fail("the code was set against the wrong device");

  if (errors.length) fail("page error: " + errors[0]);
  if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: true });
  console.log(`PASS  restored ${Object.keys(saved.mastered).length} levels, ${saved.xp} XP, records ${saved.lightning}/${saved.gaunt}; 1234 forced a new code`);
  await b.close();
})().catch(e => fail(e.message));
