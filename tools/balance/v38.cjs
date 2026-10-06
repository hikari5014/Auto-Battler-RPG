const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 50000, owned: ['blade'], progress: { easy: 6, normal: 4 }, econStarted: '3.2.0', wallet: { gem: 200000, heroTicket: 0, gearTicket: 0, stardust: 0 }, gacha: { hero: { n: 0, sinceElite: 0, sinceLegend: 0, lost: false }, newbie: 0, res: { day: '', free: 0, gold: 0 }, shop: { month: '', bought: {} } }, gear: { v: 3, items: [], equip: {}, nextId: 1, shards: 0 } })));
  await p.reload(); await p.waitForTimeout(1500);
  await p.click('#btn-gacha', { force: true }); await p.waitForTimeout(400);
  await p.screenshot({ path: S + '/v38-banner.png' });
  let legends = [];
  for (let i = 0; i < 20; i++) {
    await p.click('#btn-pull10', { force: true }); await p.waitForTimeout(150);
    const got = await p.evaluate(() => [...document.querySelectorAll('.g-card.r-legend b')].map(x => x.textContent));
    if (got.length) { legends.push(...got); if (legends.length === got.length) await p.screenshot({ path: S + '/v38-legend.png' }); }
    await p.click('#btn-g-again', { force: true }); await p.waitForTimeout(80);
  }
  const st = await p.evaluate(() => { const s = window.__game.save; return { owned: s.owned.filter(id => ['ignis', 'evira', 'leos', 'lilith', 'omega', 'seraph'].includes(id)), sig: s.gear.items.filter(i => i.heir).map(i => i.heir), g: s.gacha.hero }; });
  console.log('legends', legends.join(','), JSON.stringify(st));
  await p.screenshot({ path: S + '/v38-after.png' });
  console.log('ERRORS', errs);
  await b.close();
})();
