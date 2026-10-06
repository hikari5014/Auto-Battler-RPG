// 扭蛋英雄的平衡：mid 存檔、挑戰第 4 章，每位 8 局
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const [saveArg, heroes, d, ch, n] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://localhost:8765/?' + Date.now());
  const sv = JSON.parse(fs.readFileSync(saveArg, 'utf8'));
  await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), sv);
  await p.reload(); await p.waitForTimeout(1200);
  for (const h of heroes.split(',')) {
    const res = await p.evaluate(([h, d, ch, n]) => Array.from({ length: n }, () => window.__test.sim({ hero: h, diff: d, chapter: ch })), [h, d, +ch, +n]);
    const pw = await p.evaluate(h => window.__test.power(h).p, h);
    console.log(h.padEnd(8), pw, res.filter(r=>r.win).length+"/"+n, "dw", res.map(r=>r.deathWave||"-").join(","), "dps", Math.round(res.reduce((a,r)=>a+(r.dps||0),0)/n), "hp", res.map(r=>r.hp).join(","), "def", JSON.stringify(res[0].def), "bossT", res.map(r=>Math.round(r.bossT||0)).join(","));
  }
  await b.close();
})();
