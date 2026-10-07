const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 390]) {
    const p = await b.newPage({ viewport: { width: w, height: 780 }, deviceScaleFactor: 2 });
    await p.goto('http://localhost:8765/?' + Date.now());
    const sv = JSON.parse(fs.readFileSync(S + '/saves/early.json', 'utf8'));
    sv.gm = true; sv.autoMode = 'loop'; sv.tutorialDone = true; sv.owned = ['blade', 'archer']; sv.second = 'archer';
    await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), sv);
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => { const el = document.getElementById('screen-home'); el.scrollTop = el.scrollHeight; });
    await p.waitForTimeout(400);
    await p.screenshot({ path: S + `/v314b-${w}.png` });
    const r = await p.evaluate(() => { const t = document.querySelector('.top-btns').getBoundingClientRect(); return { right: t.right, W: innerWidth }; });
    console.log(w, JSON.stringify(r));
    // 結算後 3 秒自動出發
    await p.evaluate(() => { const s = window.__game.save; s.chapter = 1; });
    await p.click('#btn-start', { force: true }); await p.waitForTimeout(2000);
    await p.evaluate(() => { const r = window.__game.game.run; r.wave = 15; });
    await p.evaluate(() => { const r = window.__game.game.run; for (const e of window.__game.battle.enemies) e.hp = 0; window.__game.battle.queue.length = 0; window.__game.battle.enemies.length = 0; window.__game.board.balls.length = 0; window.__game.board.queue = 0; });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: S + `/v314b-result-${w}.png` });
    await p.waitForTimeout(3500);
    console.log('after', JSON.stringify(await p.evaluate(() => { const r = window.__game.game.run; return r && { ch: r.chapter, wave: r.wave, phase: r.phase }; })));
  }
  await b.close();
})();
