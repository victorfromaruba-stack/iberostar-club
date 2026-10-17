/* Drives a real Gauntlet run in a browser. The lives counter is the only new
   branch in the run loop, so that is what this checks: a wrong answer costs
   exactly one life, a right one costs none, the score counts only right
   answers, and the run ends at zero lives with the record saved.
   It never needs to know the answers in advance — it clicks an option, then
   reads whether the page called it right. */
const { chromium } = require('playwright');
const URL = process.argv[2];

const day = new Date().toISOString().slice(0, 10);
const mastered = c => ({ count: 1, last: Date.now() });
const seed = {
  name: "Test", xp: 500, intro: true, tab: "games", sound: false,
  mastered: { q: mastered(), ctnq: mastered(), who: mastered() },
  best: {}, misses: {}, lv: {}, log: [], days: [day], listened: {}, said: {},
  sync: { device: "", secret: "", last: 0, ok: null }, mgr: "",
  today: { d: day, xp: 0 }, daily: { last: "", streak: 0, best: 0 },
  lightning: 0, gaunt: 0, rp: { n: 0, best: 0, res: [] }
};

const fail = m => { console.log("FAIL  " + m); process.exit(1); };

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext()).newPage();
  page.on('pageerror', e => fail("page error: " + e.message));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(s => localStorage.setItem('showup.v1', JSON.stringify(s)), seed);
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.click('[data-tab="games"]');
  await page.waitForSelector('#gt', { timeout: 20000 });
  await page.click('#gt');
  await page.waitForSelector('#heart b', { timeout: 10000 });

  const lives = async () => +(await page.textContent('#heart b'));
  if (await lives() !== 3) fail("run did not start with 3 lives, got " + await lives());

  let right = 0, expected = 3, steps = 0;
  while (expected > 0) {
    if (++steps > 40) fail("run never ended after 40 questions");

    await answerSomehow(page, steps);
    await page.waitForSelector('#cont', { timeout: 10000 });

    const good = await page.evaluate(() => document.querySelector('#sheet').classList.contains('good'));
    if (good) right++; else expected--;

    const got = await lives();
    if (got !== expected) fail(`after ${good ? "a right" : "a wrong"} answer expected ${expected} lives, got ${got}`);

    const btn = (await page.textContent('#cont')).trim();
    const want = expected === 0 ? "See your run" : "Keep going";
    if (btn !== want) fail(`button said "${btn}", expected "${want}"`);

    await page.click('#cont');
    if (expected > 0) {
      await page.waitForSelector('.l-kind', { timeout: 10000 });
      const kind = await page.textContent('.l-kind');
      const shown = (kind.match(/(\d+) in a row/) || [])[1];
      if (+shown !== right) fail(`score line showed ${shown}, expected ${right}`);
    }
  }

  await page.waitForSelector('.celebrate', { timeout: 10000 });
  const title = (await page.textContent('.celebrate h1')).trim();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('showup.v1')).gaunt);
  if (saved !== right) fail(`saved record ${saved}, expected ${right}`);
  if (right > 0 && !/record/i.test(title)) fail("a first run with a score should be a record: " + title);

  console.log(`PASS  ${steps} questions, ${right} right, ended at 0 lives · "${title}" · record ${saved}`);
  await b.close();
})().catch(e => fail(e.message));

/* The Gauntlet deals every item type the course has, so the test has to be
   able to answer all of them — right or wrong does not matter here, only that
   the page reaches a verdict and the lives then add up. */
async function answerSomehow(page, step) {
  const opts = await page.$$('.opt');
  if (opts.length) {
    await opts[Math.floor(Math.random() * opts.length)].click();
    return page.click('#check');
  }
  const tiles = await page.$$('#bank .wtile');
  if (tiles.length) {
    for (const t of tiles) await t.click();
    return page.click('#check');
  }
  const left = await page.$$('.mt[data-side="l"]'), right = await page.$$('.mt[data-side="r"]');
  if (left.length && left.length === right.length) {
    for (let i = 0; i < left.length; i++) { await left[i].click(); await right[i].click(); }
    return;
  }
  fail(`item ${step} was an item type the test cannot answer`);
}
