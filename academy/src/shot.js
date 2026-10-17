const { chromium } = require('playwright');
const day = new Date().toISOString().slice(0,10);
const m = () => ({count:1,last:Date.now()});
const seed = { name:"Maria G.", xp:820, intro:true, tab:"games", sound:false,
  mastered:{q:m(),ctnq:m(),who:m(),why:m()}, best:{}, misses:{}, lv:{}, log:[], days:[day],
  listened:{}, said:{}, sync:{device:"",secret:"",last:0,ok:null}, mgr:"",
  today:{d:day,xp:60}, daily:{last:"",streak:3,best:9}, lightning:14, gaunt:23, rp:{n:0,best:0,res:[]} };
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 })).newPage();
  await p.goto(process.argv[2], { waitUntil:'domcontentloaded' });
  await p.evaluate(s => localStorage.setItem('showup.v1', JSON.stringify(s)), seed);
  await p.reload({ waitUntil:'domcontentloaded' });
  await p.click('[data-tab="games"]'); await p.waitForTimeout(900);
  await p.screenshot({ path: process.argv[3] + '/games.png' });
  await p.click('#gt'); await p.waitForTimeout(900);
  await p.screenshot({ path: process.argv[3] + '/gauntlet.png' });
  await b.close();
})();
