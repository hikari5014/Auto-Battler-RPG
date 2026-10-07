const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const owned = { horse: { lv: 10, exp: 0, star: 1 }, wolf: { lv: 10, exp: 0, star: 1 }, bear: { lv: 10, exp: 0, star: 1 }, bird: { lv: 10, exp: 0, star: 1 }, drake: { lv: 10, exp: 0, star: 1 } };
  const cases = [['blade', null], ['archer', null], ['mage', 'drake'], ['paladin', 'horse'], ['lok', 'wolf'], ['rogue', 'bird'], ['gren', 'bear'], ['gunner', null], ['sage', 'horse'], ['saw', null]];
  let i = 0;
  for (const [hero, mt] of cases) {
    await p.evaluate(([o, hero, mt]) => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade', hero], selected: hero, mounts: { owned: o, ride: mt }, difficulty: 'casual' })), [owned, hero, mt]);
    await p.reload(); await p.waitForTimeout(1200);
    await p.click('#btn-start', { force: true }); await p.waitForTimeout(3000);
    // 暫停後畫出武器尖端（黃）與坐騎嘴巴（紅）
    await p.evaluate(() => { window.__game.game.paused = true; });
    await p.waitForTimeout(200);
    await p.evaluate(() => {
      const bt = window.__game.battle, h = window.__game.game.run.hero, cv = document.getElementById('game'), r = cv.getBoundingClientRect();
      document.querySelectorAll('.dbgdot').forEach(d => d.remove());
      const dot = (q, c) => { const s = bt.scene.project(q.x, q.z, q.h); const d = document.createElement('div'); d.className = 'dbgdot'; d.style.cssText = `position:fixed;z-index:999;left:${r.left + s.x - 5}px;top:${r.top + s.y - 5}px;width:10px;height:10px;border-radius:50%;background:${c};border:2px solid #000`; document.body.appendChild(d); };
      dot(bt.muzzle(h), '#ffff00');
      if (h.mount) dot(bt.mouth(h), '#ff2020');
    });
    await p.screenshot({ path: S + `/v321-${i}.png`, clip: { x: 0, y: 120, width: 260, height: 200 } });
    i++;
  }
  // 火龍噴火：放技能後馬上截圖
  await p.evaluate(([o]) => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade', 'archer'], selected: 'archer', mounts: { owned: o, ride: 'drake' }, difficulty: 'casual' })), [owned]);
  await p.reload(); await p.waitForTimeout(1200);
  await p.click('#btn-start', { force: true }); await p.waitForTimeout(3500);
  await p.evaluate(() => { const bt = window.__game.battle; bt.mountSkill(window.__game.game.run.hero); });
  await p.waitForTimeout(90);
  await p.screenshot({ path: S + '/v321-fire.png', clip: { x: 0, y: 120, width: 390, height: 200 } });
  console.log('ERRORS', errs);
  await b.close();
})();
