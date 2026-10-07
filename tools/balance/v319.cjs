const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const owned = { horse: { lv: 10, exp: 0, star: 1 }, wolf: { lv: 10, exp: 0, star: 1 }, bear: { lv: 10, exp: 0, star: 1 }, bird: { lv: 10, exp: 0, star: 1 }, drake: { lv: 10, exp: 0, star: 1 } };
  const cases = JSON.parse(process.argv[2] || '[["blade",null],["mage",null],["blade","horse"],["archer","wolf"],["paladin","bird"],["ignis","drake"],["lok","bear"]]');
  let i = 0;
  for (const [hero, mt] of cases) {
    await p.evaluate(([o, hero, mt]) => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade', hero], selected: hero, mounts: { owned: o, ride: mt }, difficulty: 'casual' })), [owned, hero, mt]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.screenshot({ path: S + `/v319-h${i}.png`, clip: { x: 0, y: 150, width: 390, height: 380 } });
    await p.click('#btn-start', { force: true }); await p.waitForTimeout(4200);
    await p.screenshot({ path: S + `/v319-f${i}.png`, clip: { x: 0, y: 80, width: 390, height: 240 } });
    i++;
  }
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('marble-brave-save-v1')); s.owned = ['blade', 'archer', 'mage', 'rogue', 'ignis', 'seraph', 'hilda']; localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-heroes2', { force: true }); await p.waitForTimeout(500);
  await p.screenshot({ path: S + '/v319-pick.png' });
  console.log('ERRORS', errs);
  await b.close();
})();
