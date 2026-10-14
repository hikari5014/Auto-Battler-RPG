// 3.27 寶石彈雨：從每日副本進去，玩完 60 秒（兩倍速），看擊敗數、寶石、次數
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const out = [];
  for (const [name, save, auto] of [
    ['新手不瞄準', { tutorialDone: true, gold: 100, owned: ['blade'], selected: 'blade', progress: { casual: 3 }, maxChapter: 3, autoMode: 'off' }, false],
    ['新手自動瞄準', { tutorialDone: true, gold: 100, owned: ['blade'], selected: 'blade', progress: { casual: 3 }, maxChapter: 3, autoMode: 'loop' }, true],
    ['中期自動瞄準', { tutorialDone: true, gold: 100, owned: ['blade', 'archer'], selected: 'archer', progress: { casual: 8, easy: 6, normal: 5 }, maxChapter: 8, talents: {}, autoMode: 'loop' }, true],
  ]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block' }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('http://localhost:8765/?' + Date.now());
    await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), save);
    await p.reload(); await p.waitForTimeout(1000);
    await p.evaluate(() => document.getElementById('btn-modes').click()); await p.waitForTimeout(400);
    if (name === '新手不瞄準') await p.screenshot({ path: S + '/v327-menu.png' });
    await p.evaluate(() => document.getElementById('btn-gr-go').click()); await p.waitForTimeout(800);
    await p.evaluate(() => { window.__game.game.speed = 2; });
    await p.waitForTimeout(12000);
    if (name === '新手自動瞄準') await p.screenshot({ path: S + '/v327-play.png' });
    let r;
    for (let i = 0; i < 40; i++) {
      await p.waitForTimeout(1000);
      r = await p.evaluate(() => { const g = window.__game.game; const res = document.querySelector('#screen-result:not(.hidden) .panel, #result-body'); return { run: !!g.run, phase: g.run && g.run.phase, kills: g.run && g.run.kills, ammo: g.run && g.run.ammo, t: g.run && Math.round(g.run.tT || 0), hp: g.run && Math.round(g.run.hero.hp), result: document.getElementById('screen-result') && !document.getElementById('screen-result').classList.contains('hidden') ? document.getElementById('result-body').innerText.replace(/\s+/g, ' ').slice(0, 160) : '' }; });
      if (r.result) break;
    }
    const left = await p.evaluate(() => JSON.parse(localStorage.getItem('marble-brave-save-v1')).gemrain);
    if (name === '新手自動瞄準') await p.screenshot({ path: S + '/v327-result.png' });
    out.push([name, r, left, errs]);
    await p.close();
  }
  for (const o of out) console.log(JSON.stringify(o));
  await b.close();
})();
