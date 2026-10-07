// 3.21.1 任務／成就進度條的數字不被切掉
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade'], selected: 'blade' })));
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-quest', { force: true }); await p.waitForTimeout(500);
  const bad = await p.evaluate(() => [...document.querySelectorAll('.ach-bar em')].filter(e => { const a = e.getBoundingClientRect(), b = e.parentElement.getBoundingClientRect(); return a.top < b.top - 0.5 || a.bottom > b.bottom + 0.5; }).length);
  await p.screenshot({ path: S + '/v3211.png' });
  console.log('clipped', bad, 'ERRORS', errs);
  await b.close();
})();
