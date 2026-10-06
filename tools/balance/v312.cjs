const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const sv = JSON.parse(fs.readFileSync(S + '/saves/' + (process.argv[2] || 'mid') + '.json', 'utf8'));
  await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), sv);
  await p.reload(); await p.waitForTimeout(1500);
  const cases = JSON.parse(process.argv[3] || '[["normal",3],["hard",4]]');
  for (const mode of (process.env.M ? process.env.M.split(',') : ['army', 'shooter', null])) for (const [d, ch] of cases) for (const h of ['blade', 'archer']) {
    const rs = await p.evaluate(([mode, d, ch, h]) => Array.from({ length: 3 }, () => window.__test.sim({ hero: h, mode, diff: d, chapter: ch })), [mode, d, ch, h]);
    console.log(mode || 'normal', d, ch, h, rs.map(r => `${r.win ? 'W' : 'L'}${r.wave}`).join(' '), 'coins', rs.map(r => r.coins).join(','));
  }
  if (process.argv[4]) {
    await p.reload(); await p.waitForTimeout(1200);
    for (const m of ['army', 'shooter']) {
      await p.click('#btn-modes', { force: true }); await p.waitForTimeout(300);
      await p.click(`[data-mtab="${m}"]`, { force: true }); await p.waitForTimeout(200);
      await p.screenshot({ path: S + `/v312-${m}-tab.png` });
      await p.click('#btn-arcade-go', { force: true }); await p.waitForTimeout(12000);
      await p.screenshot({ path: S + `/v312-${m}.png` });
      await p.reload(); await p.waitForTimeout(1200);
    }
  }
  console.log('ERRORS', errs);
  await b.close();
})();
