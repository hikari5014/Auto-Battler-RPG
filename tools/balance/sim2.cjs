const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const [saveArg, heroes, d, ch, n] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), JSON.parse(fs.readFileSync(saveArg, 'utf8')));
  await p.reload(); await p.waitForTimeout(1200);
  for (const h of heroes.split(',')) {
    const res = await p.evaluate(([h, d, ch, n]) => Array.from({ length: n }, () => window.__test.sim({ hero: h, diff: d, chapter: ch })), [h, d, +ch, +n]);
    console.log(h.padEnd(8), res.map(r => `${r.win ? 'W' : 'L'} boss${r.bossT}s dps${r.dps} hp${r.hp} sk${r.skills}`).join(' | '));
  }
  await b.close();
})();
