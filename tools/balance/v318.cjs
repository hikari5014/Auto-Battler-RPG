const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const owned = { horse: { lv: 10, exp: 0, star: 1 }, wolf: { lv: 10, exp: 0, star: 1 }, bear: { lv: 10, exp: 0, star: 1 }, bird: { lv: 10, exp: 0, star: 1 }, drake: { lv: 30, exp: 0, star: 3 } };
  for (const id of (process.env.IDS || 'horse,wolf,bear,bird,drake').split(',')) {
    await p.evaluate(([o, id]) => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, mounts: { owned: o, ride: id }, difficulty: 'casual' })), [owned, id]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.screenshot({ path: S + `/v318-home-${id}.png`, clip: { x: 0, y: 150, width: 390, height: 380 } });
    await p.click('#btn-start', { force: true }); await p.waitForTimeout(3500);
    await p.screenshot({ path: S + `/v318-fight-${id}.png`, clip: { x: 0, y: 80, width: 390, height: 240 } });
  }
  await p.goto('http://localhost:8765/?' + Date.now()); await p.waitForTimeout(1500);
  await p.click('#btn-mount', { force: true }); await p.waitForTimeout(500);
  await p.screenshot({ path: S + '/v318-stable.png' });
  console.log('ERRORS', errs);
  await b.close();
})();
