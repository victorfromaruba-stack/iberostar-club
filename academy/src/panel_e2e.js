/* Renders the manager panel against a stubbed team response.
   The rows deliberately use the OLD payload shape — no entry for a level that
   was added later — because that is what is already stored in Supabase after
   any new level ships, and it is exactly what broke the panel on 2026-10-17:
   a level a unit names but LEVEL_IDS does not know has no stats, so the panel
   threw mid-render and managers sat on "Loading the team…" forever. */
const { chromium } = require('playwright');
const URL = process.argv[2];
const fail = m => { console.log("FAIL  " + m); process.exit(1); };

const DAY = 864e5, now = Date.now();
const OLD_IDS = ["q", "ctnq", "who", "why", "offer", "solid", "words", "map",
                 "nlp1", "nlp2", "nlp3", "nlp4", "st2", "st3", "st4", "final"];
const stats = (mastered, lightning) => ({
  v: 1, x: 900,
  m: Object.fromEntries(OLD_IDS.map(id => [id, mastered.includes(id) ? 1 : 0])),
  ml: Object.fromEntries(OLD_IDS.map(id => [id, mastered.includes(id) ? now - 2 * DAY : 0])),
  b: Object.fromEntries(OLD_IDS.map(id => [id, mastered.includes(id) ? 6 : 2])),
  a: Object.fromEntries(OLD_IDS.map(id => [id, [8, 2, 3]])),
  l: lightning, d: 4, h: 3, sl: 5, w: [], lg: [], dd: [], rp: { n: 0, b: 0, s: [] }
});
const TEAM = [
  { device: "d1", name: "Maria G.", updated: new Date(now - 1 * DAY).toISOString(), stats: stats(["q", "ctnq", "who", "why"], 21) },
  { device: "d2", name: "Luigi V.", updated: new Date(now - 3 * DAY).toISOString(), stats: stats(["q", "ctnq"], 14) },
  { device: "d3", name: "Jayson K.", updated: new Date(now - 9 * DAY).toISOString(), stats: stats(["q"], 0) }
];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.route('**/rest/v1/rpc/sua_team', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TEAM) }));
  await page.route('**/rest/v1/rpc/sua_save', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));

  /* Seeded before any page code runs — the app saves its own state during
     boot, which overwrites a seed written after the first load. */
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('showup.v1', JSON.stringify({
        name: "Boss", intro: true, mgr: "TESTCODE", tab: "me", sound: false
      }));
    } catch (e) { /* private mode */ }
  });
  await page.goto(URL + '#team', { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => !/Loading the team/.test(document.body.innerText), { timeout: 20000 })
    .catch(() => fail("still stuck on \"Loading the team…\"" + (errors.length ? " · page error: " + errors[0] : "")));
  if (errors.length) fail("page error while rendering: " + errors[0]);

  const text = await page.innerText('body');
  if (process.env.DBG) console.log("BODY>>>", text.replace(/\n+/g, " | ").slice(0, 600));
  /* innerText is the rendered text, and CSS uppercases the buttons. */
  const flat = text.toLowerCase();
  for (const want of ["lightning board", "maria g.", "who knows what", "copy for the group"])
    if (!flat.includes(want)) fail(`panel rendered without "${want}"`);

  /* Order and medals: Maria 21 then Luigi 14, and Jayson (0) is off the board. */
  const rows = await page.$$eval('.lb li', ls => ls.map(l => l.innerText.replace(/\n/g, ' ').trim()));
  if (rows.length !== 2) fail(`board should list only the 2 people with a record, got ${rows.length}: ${JSON.stringify(rows)}`);
  if (!/Maria G\./.test(rows[0]) || !/21/.test(rows[0])) fail("top of the board is wrong: " + rows[0]);
  if (!/Luigi V\./.test(rows[1]) || !/14/.test(rows[1])) fail("second place is wrong: " + rows[1]);

  if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: true });
  console.log(`PASS  panel rendered from old-shape rows · board: ${rows.join(" | ")}`);
  await b.close();
})().catch(e => fail(e.message));
