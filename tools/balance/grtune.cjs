const { chromium } = require('/opt/node-tools/node_modules/playwright');
const tunes = JSON.parse(process.argv[2]);
(async () => { const b = await chromium.launch();
  const one = async (tune, auto, hero) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); const p = await ctx.newPage();
    await p.goto('http://localhost:8765/?' + Date.now());
    await p.evaluate(([auto, hero]) => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade', hero], selected: hero, progress: { casual: 3 }, maxChapter: 3, autoMode: auto ? 'loop' : 'off' })), [auto, hero]);
    await p.reload(); await p.waitForTimeout(900);
    await p.evaluate(async t => { const m = await import('./js/gemrain.js'); Object.assign(m.GR_TUNE, t); }, tune);
    await p.evaluate(() => document.getElementById('btn-modes').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('btn-gr-go').click()); await p.waitForTimeout(300);
    await p.evaluate(() => { window.__game.game.speed = 2; });
    let r;
    for (let i = 0; i < 45; i++) { await p.waitForTimeout(1000); r = await p.evaluate(() => { const g = window.__game.game.run; return g ? { k: g.kills, t: Math.round(g.tT || 0), hp: Math.round(g.hero.hp), ph: g.phase } : null; }); if (!r || r.ph === 'over' || r.ph === 'dead') break; }
    await ctx.close(); return r;
  };
  for (const t of tunes) { const res = await Promise.all([one(t, false, 'blade'), one(t, true, 'blade'), one(t, true, 'mage')]); console.log(JSON.stringify(t), JSON.stringify(res)); }
  await b.close(); })();
