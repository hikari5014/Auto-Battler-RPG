const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 50000, owned: ['blade', 'paladin', 'rogue', 'ruri', 'thief', 'morgan'], selected: 'rogue', second: 'ruri', heroes: { rogue: { star: 3, frag: 0 }, ruri: { star: 4, frag: 0 } }, progress: { easy: 6, normal: 6, hard: 6, hell: 3 }, maxChapter: 5, econStarted: '3.2.0', wallet: { gem: 100, heroTicket: 0, gearTicket: 0, stardust: 0 }, gear: { v: 3, items: [], equip: {}, nextId: 1, shards: 0 } })));
  await p.reload(); await p.waitForTimeout(1500);
  await p.screenshot({ path: S + '/v35-home.png' });
  const chip = await p.$('[data-bond]'); if (chip) { await chip.click({ force: true }); await p.waitForTimeout(900); await p.screenshot({ path: S + "/v35-chip.png" }); }
  console.log('chips', await p.$$eval('[data-bond]', e => e.map(x => x.textContent)));
  // 每章跑一局：讓所有怪物行為都至少出現
  for (let ch = 1; ch <= 5; ch++) {
    const r = await p.evaluate(c => window.__test.sim({ hero: 'rogue', hero2: 'ruri', diff: 'normal', chapter: c }), ch);
    console.log('ch', ch, JSON.stringify(r));
  }
  const pairs = [['thief', 'morgan'], ['blade', 'paladin'], ['morgan', null]];
  for (const [a, c] of pairs) console.log(a, c, JSON.stringify(await p.evaluate(([a, c]) => window.__test.sim({ hero: a, hero2: c, diff: 'normal', chapter: 2 }), [a, c])));
  // 實際開一局第 2 章看畫面
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('marble-brave-save-v1')); s.chapter = 2; s.difficulty = 'normal'; localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(1500);
  await p.click('#btn-start', { force: true }); await p.waitForTimeout(800);
  const dlg = await p.$('#btn-power-go'); if (dlg) await dlg.click({ force: true });
  await p.waitForTimeout(9000);
  await p.screenshot({ path: S + '/v35-battle.png' });
  console.log('ERRORS', errs);
  await b.close();
})();
