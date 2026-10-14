// 3.26 插圖：英雄立繪、挑戰橫幅、謎題縮圖、扭蛋主視覺、活動頁、每日挑戰、奇遇卡、彈珠台底圖
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 5000, owned: ['blade', 'mage'], selected: 'mage', maxChapter: 6, progress: { casual: 6, easy: 6, normal: 6 }, wallet: { gem: 500 } })));
  const shots = [];
  const snap = async n => { await p.waitForTimeout(600); await p.screenshot({ path: `${S}/v326-${n}.png` }); shots.push(n); };
  const open = async (fn, n) => { await p.reload(); await p.waitForTimeout(1000); await p.evaluate(fn); await snap(n); };
  await open(() => document.querySelector('.hero-tap, #btn-hero, [data-act="btn-heroes"]') ? document.querySelector('.hero-tap, #btn-hero, [data-act="btn-heroes"]').click() : null, 'heroes');
  await open(() => document.getElementById('btn-modes').click(), 'modes');
  await p.evaluate(() => { const t = document.querySelector('[data-mtab="puzzle"]'); if (t) t.click(); }); await snap('puzzle');
  await p.evaluate(() => { const t = document.querySelector('[data-mtab="wb"]'); if (t) t.click(); }); await snap('wb');
  await open(() => document.getElementById('btn-gacha').click(), 'gacha');
  await open(() => { const e = document.getElementById('btn-live') || document.querySelector('[data-act="btn-live"]'); if (e) e.click(); }, 'live');
  await p.reload(); await p.waitForTimeout(1000);
  await p.evaluate(() => document.getElementById('btn-start').click()); await p.waitForTimeout(500);
  if (await p.evaluate(() => !window.__game.game.run)) await p.evaluate(() => document.getElementById('btn-start').click());
  await p.waitForTimeout(1500); await snap('battle');
  await p.evaluate(async () => { const m = await import('./js/events.js'); window.__game.game.paused = true; });
  console.log(shots.join(','), 'ERRORS', errs);
  await b.close();
})();
