// 3.25 新圖示：首頁、技能商店、背包、成就、天賦、扭蛋截圖
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 5000, owned: ['blade'], selected: 'blade', wallet: { gem: 500, heroTicket: 3, gearTicket: 3, stardust: 50 } })));
  await p.reload(); await p.waitForTimeout(1200);
  // 給一些裝備＋符石
  await p.evaluate(async () => { const g = await import('./js/gear.js'); const s = window.__game.save; for (let r = 0; r < 5; r++) for (let k = 0; k < 2; k++) g.grantItem(s, r, 3); g.ensureGear(s).gems['red-1'] = 2; g.ensureGear(s).gems['blue-3'] = 1; g.ensureGear(s).gems['purple-5'] = 1; });
  const shots = [];
  const snap = async n => { await p.waitForTimeout(500); await p.screenshot({ path: `${S}/v325-${n}.png` }); shots.push(n); };
  await snap('home');
  for (const id of ['btn-gear', 'btn-ach', 'btn-talent', 'btn-gacha']) {
    const ok = await p.evaluate(id => { const e = document.getElementById(id) || document.querySelector(`[data-act="${id}"]`); if (e) e.click(); return !!e; }, id);
    if (!ok) { console.log('no', id); continue; }
    await snap(id);
    await p.reload(); await p.waitForTimeout(1000);
    await p.waitForTimeout(300);
  }
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(() => document.getElementById('btn-start').click()); await p.waitForTimeout(600);
  if (await p.evaluate(() => !window.__game.game.run)) await p.evaluate(() => document.getElementById('btn-start').click());
  await p.waitForTimeout(1500);
  await snap('shop');
  console.log(shots.join(','), 'ERRORS', errs);
  await b.close();
})();
