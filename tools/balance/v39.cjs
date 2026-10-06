const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const sv = JSON.parse(fs.readFileSync(S + '/saves/mid.json', 'utf8'));
  sv.difficulty = 'easy'; sv.progress = Object.assign(sv.progress || {}, { easy: 11 }); sv.chapter = 6;
  await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), sv);
  await p.reload(); await p.waitForTimeout(1500);
  await p.screenshot({ path: S + '/v39-home.png' });
  await p.click('#btn-map', { force: true }); await p.waitForTimeout(500);
  await p.screenshot({ path: S + '/v39-map.png' });
  for (const ch of [6, 7, 8, 9, 10]) {
    const rs = await p.evaluate(c => Array.from({ length: 2 }, () => window.__test.sim({ hero: 'blade', diff: 'hard', chapter: c })), ch);
    console.log('hard ch', ch, rs.map(r => `${r.win ? 'W' : 'L'}${r.wave}`).join(' '));
  }
  for (const ch of [6, 7, 8, 9, 10]) {
    await p.evaluate(c => { const s = JSON.parse(localStorage.getItem('marble-brave-save-v1')); s.chapter = c; localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)); }, ch);
    await p.reload(); await p.waitForTimeout(1200);
    await p.click('#btn-start', { force: true }); await p.waitForTimeout(700);
    const dlg = await p.$('#btn-power-go'); if (dlg) await dlg.click({ force: true });
    await p.waitForTimeout(7000);
    await p.screenshot({ path: S + `/v39-ch${ch}.png` });
  }
  console.log('ERRORS', errs);
  await b.close();
})();
