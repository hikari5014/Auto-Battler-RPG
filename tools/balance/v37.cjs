const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const sv = JSON.parse(fs.readFileSync(S + '/saves/mid.json', 'utf8'));
  await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), sv);
  await p.reload(); await p.waitForTimeout(1500);
  await p.click('#btn-modes', { force: true }); await p.waitForTimeout(400);
  await p.screenshot({ path: S + '/v37-dg.png' });
  await p.click('[data-mtab="rush"]', { force: true }); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/v37-rush.png' });
  await p.click('[data-mtab="trial"]', { force: true }); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/v37-trial.png' });
  const H = process.argv[2] || 'blade';
  for (const [name, o] of [['dg gold t1', { mode: 'dungeon', dg: 'gold', tier: 1, chapter: 3 }], ['dg gear t3', { mode: 'dungeon', dg: 'gear', tier: 3, chapter: 3 }], ['rush normal ch3', { mode: 'rush', diff: 'normal', chapter: 3 }], ['trial 0', { mode: 'trial', floor: 0 }], ['trial 30', { mode: 'trial', floor: 30 }]]) {
    const rs = await p.evaluate(([o, H]) => Array.from({ length: 3 }, () => window.__test.sim({ hero: H, ...o })), [o, H]);
    console.log(name, rs.map(r => `${r.win ? 'W' : 'L'}${r.wave}`).join(' '));
  }
  // 實際開一場試煉塔看畫面
  await p.reload(); await p.waitForTimeout(1500); await p.click('#btn-modes', { force: true }); await p.waitForTimeout(300); await p.click('[data-mtab="trial"]', { force: true }); await p.waitForTimeout(200); await p.click('#btn-trial-go', { force: true }); await p.waitForTimeout(6000);
  await p.screenshot({ path: S + '/v37-battle.png' });
  console.log('ERRORS', errs);
  await b.close();
})();
