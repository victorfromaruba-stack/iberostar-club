/* The team board every worker sees. Three states matter and all three are
   real: the function not deployed yet (Supabase answers 404 until the SQL in
   server/migration.sql is run), a normal board, and the viewer's own row. */
const { chromium } = require('playwright');
const URL = process.argv[2];
const fail = m => { console.log("FAIL  " + m); process.exit(1); };

const ROWS = [
  { name: "Maria G.",  levels: 11, xp: 900, lightning: 21, gauntlet: 8 },
  { name: "Luigi V.",  levels: 6,  xp: 500, lightning: 14, gauntlet: 31 },
  { name: "Jayson K.", levels: 2,  xp: 120, lightning: 9,  gauntlet: 0 },
  /* Someone trying the app out. The page drops it even when the database
     still has it, because only Victor can change the database. */
  { name: "Test phone", levels: 9, xp: 800, lightning: 30, gauntlet: 40 }
];

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('showup.v1', JSON.stringify({
      name: "Luigi V.", intro: true, tab: "games", sound: false, lightning: 14, gaunt: 31,
      mastered: { q: { count: 1, last: Date.now() } }
    })); } catch (e) { /* private mode */ }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await ctx.route('**/rest/v1/rpc/sua_save', r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));

  /* 1. Not deployed yet: Supabase returns 404 for an unknown function. */
  await ctx.route('**/rest/v1/rpc/sua_board', r => r.fulfill({ status: 404, contentType: 'application/json',
    body: JSON.stringify({ message: "Could not find the function public.sua_board" }) }));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.click('[data-tab="games"]');
  await page.click('#bd');
  await page.waitForFunction(() => !/Getting the board/.test(document.body.innerText), { timeout: 15000 })
    .catch(() => fail("stuck on \"Getting the board…\" when the function is missing"));
  let text = await page.innerText('body');
  if (!/isn't switched on yet/i.test(text)) fail("no plain message when the board is not deployed: " + text.slice(0, 160));

  /* 2. Deployed. */
  await ctx.unroute('**/rest/v1/rpc/sua_board');
  await ctx.route('**/rest/v1/rpc/sua_board', r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROWS) }));
  await page.click('#rf');
  await page.waitForFunction(() => document.querySelectorAll('.lb li').length > 0, { timeout: 15000 })
    .catch(() => fail("board never rendered any rows"));

  /* Levels is the default, and everyone who has mastered anything is on it. */
  let rows = await page.$$eval('.lb li', ls => ls.map(l => l.innerText.replace(/\n/g, ' ').trim()));
  if (rows.length !== 3) fail(`Levels board should show 3 real people and drop the test row, got ${rows.length}: ${JSON.stringify(rows)}`);
  if (/test/i.test(rows.join(" "))) fail("a test entry reached the board: " + rows.join(" | "));
  if (!/Maria G\./.test(rows[0]) || !/11/.test(rows[0])) fail("Levels order wrong: " + rows[0]);
  if (!/you/i.test(rows[1])) fail("the viewer's own row is not marked: " + rows[1]);

  await page.click('[data-bg="l"]');
  await page.waitForTimeout(250);
  rows = await page.$$eval('.lb li', ls => ls.map(l => l.innerText.replace(/\n/g, ' ').trim()));
  if (rows.length !== 3) fail(`Lightning board should show 3, got ${rows.length}`);
  if (/test/i.test(rows.join(" "))) fail("a test entry reached the Lightning board");
  if (!/Maria G\./.test(rows[0]) || !/21/.test(rows[0])) fail("Lightning order wrong: " + rows[0]);

  /* 3. Switching game re-sorts, and drops the person with no Gauntlet score. */
  await page.click('[data-bg="gt"]');
  await page.waitForTimeout(250);
  rows = await page.$$eval('.lb li', ls => ls.map(l => l.innerText.replace(/\n/g, ' ').trim()));
  if (rows.length !== 2) fail(`Gauntlet board should drop the 0 and show 2, got ${rows.length}: ${JSON.stringify(rows)}`);
  if (!/Luigi V\./.test(rows[0]) || !/31/.test(rows[0])) fail("Gauntlet order wrong: " + rows[0]);
  if (!/you/i.test(rows[0])) fail("own row not marked on the Gauntlet board: " + rows[0]);

  if (errors.length) fail("page error: " + errors[0]);
  if (process.argv[3]) await page.screenshot({ path: process.argv[3], fullPage: true });
  console.log(`PASS  board: not-deployed message · Lightning ${rows.length ? "ok" : ""} · Gauntlet re-sorted to ${rows[0]}`);
  await b.close();
})().catch(e => fail(e.message));
