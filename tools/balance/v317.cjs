const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 1000, gear: { v: 3, items: [], equip: {}, nextId: 1, shards: 0 } })));
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(async () => {
    const g = await import('/js/gear.js'); const s = window.__game.save;
    for (const r of [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 3, 3]) g.grantItem(s, r, 3);
    s.gear.items[0].lock = true; s.gear.items[6].plus = 5;
    // 每個欄位先穿一件史詩，避免「比身上好」的保護把全部擋掉
    for (const t of Object.keys(g.TYPES)) { const it = g.grantItem(s, 4, 5); it.type = t; g.equip(s, it.id); }
  });
  await p.click('#btn-gear', { force: true }); await p.waitForTimeout(400);
  const st = () => p.evaluate(() => { const s = window.__game.save; return { n: s.gear.items.length, gold: s.gold, shards: s.gear.shards }; });
  console.log('start', JSON.stringify(await st()));
  await p.click('#btn-batch', { force: true }); await p.waitForTimeout(200);
  await p.click('[data-brar="0"]', { force: true }); await p.waitForTimeout(150);
  if (await p.$('[data-brar="1"]')) await p.click('[data-brar="1"]', { force: true }); await p.waitForTimeout(150);
  // 手動多選一件傳說（沒穿的那件）
  const legId = await p.evaluate(() => { const s = window.__game.save; return s.gear.items.filter(i => i.rarity === 3 && !Object.values(s.gear.equip).includes(i.id))[0].id; });
  await p.click(`[data-item="${legId}"]`, { force: true }); await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('.batch').scrollIntoView({ block: 'start' }));
  await p.screenshot({ path: S + '/v317.png' });
  console.log('picked', await p.$eval('.bsum', e => e.textContent));
  await p.click('#btn-bgo', { force: true }); await p.waitForTimeout(150);
  console.log('after 1st press', JSON.stringify(await st()), await p.$eval('#toast', e => e.textContent));
  await p.click('#btn-bgo', { force: true }); await p.waitForTimeout(200);
  console.log('after confirm', JSON.stringify(await st()), await p.$eval('#toast', e => e.textContent));
  console.log('left', JSON.stringify(await p.evaluate(() => window.__game.save.gear.items.map(i => `${i.rarity}${i.lock ? 'L' : ''}${i.plus ? '+' : ''}`))));
  console.log('ERRORS', errs);
  await b.close();
})();
