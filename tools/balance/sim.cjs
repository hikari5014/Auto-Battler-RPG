// 用法：node sim.cjs saveFile.json|fresh "blade,archer" "casual,easy" chapter N [aim]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const [saveArg, heroes, diffs, chapter = '1', n = '10', aim = '0.85'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/?' + Date.now());
  const sv = saveArg === 'fresh' ? { tutorialDone: true } : JSON.parse(fs.readFileSync(saveArg, 'utf8'));
  await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), sv);
  await p.reload(); await p.waitForTimeout(1200);
  const t0 = Date.now();
  console.log('power', JSON.stringify(await p.evaluate(h => window.__test.power(h), heroes.split(',')[0].split('+')[0])));
  for (const d of diffs.split(',')) for (const h of heroes.split(',')) {
    const [h1, h2] = h.split('+');
    const res = await p.evaluate(([h1, h2, d, ch, n, aim]) => {
      const out = [];
      for (let i = 0; i < n; i++) out.push(window.__test.sim({ hero: h1, hero2: h2, diff: d, chapter: ch, aim }));
      return out;
    }, [h1, h2, d, +chapter, +n, +aim]);
    const wins = res.filter(r => r.win).length;
    const deaths = res.filter(r => !r.win).map(r => r.wave);
    const firstDeath = res.filter(r => r.deathWave).map(r => r.deathWave);
    console.log(`${d.padEnd(9)} ch${chapter} ${h.padEnd(13)} win ${wins}/${n} (${Math.round(wins / n * 100)}%)  died@ ${deaths.join(',') || '-'}  firstKO@ ${firstDeath.join(',') || '-'}`);
  }
  console.log('time', ((Date.now() - t0) / 1000).toFixed(1) + 's', errs.length ? errs.slice(0, 3) : '');
  await b.close();
})();
