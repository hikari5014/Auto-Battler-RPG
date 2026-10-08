const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 99999, owned: ['blade'], selected: 'blade', mounts: { owned: { fox: { lv: 1, exp: 0, star: 1 } }, ride: 'fox' } })));
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-mount', { force: true }); await p.waitForTimeout(600);
  await p.screenshot({ path: S + '/v322-shop.png', fullPage: false });
  const over = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log('hscroll', over, 'ERRORS', errs);
  await b.close();
})();
