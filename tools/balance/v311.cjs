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
  const bc = await p.evaluate(() => { const s = window.__game.save; return Math.max(...Object.entries(s.progress || {}).filter(([k]) => k !== 'casual').map(([, v]) => v)); });
  console.log('balChapter', bc, 'fit', await p.evaluate(() => window.__test.fitCh()));
  for (const h of ['blade', 'archer', 'sage']) {
    const rs = await p.evaluate(([h, c]) => Array.from({ length: 2 }, () => window.__test.sim({ hero: h, mode: 'worldboss', fit: true }).bdmg), [h, bc]);
    console.log('wb', h, rs.join(','));
  }
  for (const [pts, o] of [[0, 0], [0, 1], [0, 2], [800, 1], [1500, 2]]) {
    const rs = await p.evaluate(([pts, o, c]) => Array.from({ length: 3 }, () => { const r = window.__test.sim({ hero: 'blade', mode: 'arena', pts, opp: o, fit: true }); return (r.win ? 'W' : 'L') + r.wave; }), [pts, o, bc]);
    console.log('arena pts', pts, 'opp', o, rs.join(' '));
  }
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-modes', { force: true }); await p.waitForTimeout(300);
  await p.click('[data-mtab="wb"]', { force: true }); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/v311-wb.png' });
  await p.click('[data-mtab="arena"]', { force: true }); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/v311-arena.png' });
  await p.click('#btn-modes-close', { force: true }); await p.waitForTimeout(200);
  await p.click('#btn-live', { force: true }); await p.waitForTimeout(300);
  await p.screenshot({ path: S + '/v311-pass.png' });
  await p.click('[data-ltab="event"]', { force: true }); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/v311-event.png' });
  await p.click('#btn-live-close', { force: true }); await p.waitForTimeout(200);
  await p.click('#btn-modes', { force: true }); await p.waitForTimeout(300);
  await p.click('[data-mtab="wb"]', { force: true }); await p.waitForTimeout(200);
  await p.click('#btn-wb-go', { force: true }); await p.waitForTimeout(800);
  await p.click('#btn-shop-go', { force: true }).catch(() => {}); await p.waitForTimeout(6000);
  await p.screenshot({ path: S + '/v311-wbfight.png' });
  console.log('ERRORS', errs);
  await b.close();
})();
