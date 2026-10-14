// 3.24 新背景＋新怪物：每章打一場截圖
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  for (let ch = 1; ch <= 10; ch++) {
    await p.evaluate(ch => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade'], selected: 'blade', difficulty: 'casual', progress: { casual: 11 }, chapter: ch })), ch);
    await p.reload(); await p.waitForTimeout(900);
    await p.click('#btn-start', { force: true }); await p.waitForTimeout(400); if (await p.evaluate(() => !window.__game.game.run)) await p.click('#btn-start', { force: true }); await p.waitForTimeout(2600);
    if (ch % 3 === 0) await p.evaluate(async ch => { const { CHAPTERS, MONSTERS } = await import('./js/data.js'); const bt = window.__game.battle; const e = bt.enemies.find(x => !x.dead); if (e) { e.sprite = MONSTERS[CHAPTERS[ch - 1].boss].sprite; e.size = 1.85; } }, ch);
    await p.waitForTimeout(300);
    await p.screenshot({ path: S + `/v324-${ch}.png`, clip: { x: 0, y: 0, width: 390, height: 300 } });
  }
  console.log('ERRORS', errs);
  await b.close();
})();
