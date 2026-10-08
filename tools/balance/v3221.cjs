// 3.22.1 戰鬥畫面：騎火龍＋新版英雄＋自動掛機＋即時數值，英雄不能被上方介面蓋住
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const [w, h, safe] of [[390, 844, 47], [375, 667, 20], [430, 932, 59], [390, 844, 0]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
        const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/?' + Date.now());
    await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade', 'mage', 'archer'], selected: 'mage', duo: 'archer', mounts: { owned: { drake: { lv: 10, exp: 0, star: 1 } }, ride: 'drake' }, difficulty: 'casual', autoMode: 'push' })));
    await p.reload(); await p.waitForTimeout(1000);
    await p.evaluate(sf => { document.documentElement.style.setProperty('--safe-top', sf + 'px'); window.dispatchEvent(new Event('resize')); }, safe); // 模擬手機瀏海
    await p.waitForTimeout(300);
    await p.click('#btn-start', { force: true }); await p.waitForTimeout(3000);
    const r = await p.evaluate(() => {
      const bt = window.__game.battle, hh = window.__game.game.run.hero, cv = document.getElementById('game').getBoundingClientRect();
      const g = hh._hg; const top = bt.scene.project(hh.x, hh.z, g.lift + g.size).y + cv.top, foot = bt.scene.project(hh.x, hh.z, 0).y + cv.top;
      const hp = 0; const covers = ['#hud', '#live-stats', '#auto-badge', '#btn-switch'].map(s => document.querySelector(s)).filter(Boolean).map(e => { const q = e.getBoundingClientRect(); return [e.id, Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom)]; });
      const hx = bt.scene.project(hh.x, hh.z, 0).x; return { heroX: Math.round(hx), canvasTop: Math.round(cv.top), canvasH: Math.round(cv.height), heroTop: Math.round(top), heroFoot: Math.round(foot), covers };
    });
    out.push([w, h, safe, r, errs]);
    await p.screenshot({ path: S + `/v3221-${w}-${safe}.png` });
    await p.close();
  }
  for (const o of out) console.log(JSON.stringify(o));
  await b.close();
})();
