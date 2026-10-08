// 3.22 3D 怪物＋新坐騎：截圖檢查、坐騎技能、嘴巴位置
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const owned = {}; for (const k of ['zebra', 'fox', 'llama', 'bull']) owned[k] = { lv: 10, exp: 0, star: 2 };
  let i = 0;
  for (const [hero, mt, mons] of [['blade', 'zebra', ['skull', 'zombie', 'pumpkin']], ['archer', 'fox', ['darkmage', 'wraith', 'witch']], ['mage', 'llama', ['deathknight']], ['paladin', 'bull', ['skull', 'witch', 'pumpkin']]]) {
    await p.evaluate(([o, hero, mt]) => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade', hero], selected: hero, mounts: { owned: o, ride: mt }, difficulty: 'casual' })), [owned, hero, mt]);
    await p.reload(); await p.waitForTimeout(1200);
    await p.click('#btn-start', { force: true }); await p.waitForTimeout(2500);
    await p.evaluate(async mons => {
      const { MONSTERS } = await import('./js/data.js');
      const bt = window.__game.battle;
      bt.enemies.forEach((e, k) => { const m = mons[k % mons.length]; e.sprite = MONSTERS[m].sprite; e.name = MONSTERS[m].name; if (m === 'deathknight') e.size = 1.85; });
    }, mons);
    await p.waitForTimeout(700);
    await p.evaluate(() => { window.__game.game.paused = true; });
    await p.screenshot({ path: S + `/v322-m${i}.png`, clip: { x: 0, y: 110, width: 390, height: 220 } });
    await p.evaluate(() => { window.__game.game.paused = false; });
    await p.evaluate(() => { const bt = window.__game.battle; bt.mountSkill(window.__game.game.run.hero); });
    await p.waitForTimeout(120);
    await p.evaluate(() => { window.__game.game.paused = true; });
    await p.evaluate(() => {
      const bt = window.__game.battle, h = window.__game.game.run.hero, cv = document.getElementById('game'), r = cv.getBoundingClientRect();
      const s = bt.scene.project(bt.mouth(h).x, bt.mouth(h).z, bt.mouth(h).h);
      const d = document.createElement('div'); d.style.cssText = `position:fixed;z-index:999;left:${r.left + s.x - 5}px;top:${r.top + s.y - 5}px;width:10px;height:10px;border-radius:50%;background:#f22;border:2px solid #000`; document.body.appendChild(d);
    });
    await p.screenshot({ path: S + `/v322-${i}.png`, clip: { x: 0, y: 110, width: 390, height: 220 } });
    await p.evaluate(() => document.querySelectorAll('div[style*="#f22"]').forEach(d => d.remove()));
    i++;
  }
  console.log('ERRORS', errs);
  await b.close();
})();
