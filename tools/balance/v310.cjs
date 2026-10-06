const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const sv = JSON.parse(fs.readFileSync(S + '/saves/mid.json', 'utf8'));
  await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), sv);
  await p.reload(); await p.waitForTimeout(1500);
  for (const [d, ch] of [['normal', 3], ['hard', 4]]) {
    const rs = await p.evaluate(([d, ch]) => Array.from({ length: 3 }, () => window.__test.sim({ hero: 'blade', mode: 'expedition', diff: d, chapter: ch })), [d, ch]);
    console.log('exp', d, ch, rs.map(r => `${r.win ? 'W' : 'L'}${r.wave} relics${r.relics}`).join(' '));
  }
  for (let i = 0; i < 12; i++) {
    const rs = await p.evaluate(i => Array.from({ length: 4 }, () => window.__test.sim({ hero: 'blade', mode: 'puzzle', puzzle: i, chapter: 1, aim: 0.9 }).score), i);
    console.log('puzzle', i, rs.join(','));
  }
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-modes', { force: true }); await p.waitForTimeout(300);
  await p.click('[data-mtab="exp"]', { force: true }); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/v310-exp.png' });
  await p.click('[data-mtab="puzzle"]', { force: true }); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/v310-pz.png' });
  await p.click('[data-pz="0"]', { force: true }); await p.waitForTimeout(3500);
  await p.screenshot({ path: S + '/v310-pzplay.png' });
  // 遠征：開一局，直接跳到路線畫面
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-modes', { force: true }); await p.waitForTimeout(300);
  await p.click('[data-mtab="exp"]', { force: true }); await p.waitForTimeout(200);
  await p.click('#btn-exp-go', { force: true }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const r = window.__game.game.run; r.wave = 3; r.eliteAll = true; });
  await p.evaluate(() => window.__test.openRoute && window.__test.openRoute());
  await p.waitForTimeout(300);
  await p.screenshot({ path: S + '/v310-route.png' });
  console.log('ERRORS', errs);
  await b.close();
})();
