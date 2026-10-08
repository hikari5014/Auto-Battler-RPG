// 3.23 冒險中開關自動、自動時彈珠加速、快速掃蕩（5 次免費、之後扣寶石、八成獎勵）
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const fails = [];
  const ok = (c, m) => { if (!c) fails.push(m); };
  await p.goto('http://localhost:8765/?' + Date.now());
  // 1) 冒險中開關自動
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 100, owned: ['blade'], selected: 'blade', difficulty: 'casual', progress: { casual: 4 }, chapter: 2, autoMode: 'off', wallet: { gem: 100 } })));
  await p.reload(); await p.waitForTimeout(1200);
  await p.screenshot({ path: S + '/v323-home.png' });
  await p.click('#btn-start', { force: true }); await p.waitForTimeout(2000);
  ok(await p.evaluate(() => !document.getElementById('auto-badge').classList.contains('hidden') && document.getElementById('auto-badge').classList.contains('off')), '關著時要顯示「▶ 自動」');
  await p.click('#auto-badge'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('marble-brave-save-v1')).autoMode === 'loop'), '點了要開成循環');
  await p.screenshot({ path: S + '/v323-on.png', clip: { x: 0, y: 0, width: 390, height: 300 } });
  // 加速：同樣 2 秒，自動開著的球掉得比較多（看球的 y 前進量）
  const speed = await p.evaluate(async () => {
    const bd = window.__game.board; const before = bd.balls.map(x => [x, x.y]);
    await new Promise(r => setTimeout(r, 300));
    const moved = before.filter(([x]) => bd.balls.includes(x)).map(([x, y]) => x.y - y);
    return moved.length;
  });
  await p.click('#auto-badge'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('marble-brave-save-v1')).autoMode === 'off'), '再點要關掉');
  ok(await p.evaluate(() => document.getElementById('auto-badge').classList.contains('off')), '關掉後還要看得到按鈕');
  // 2) 掃蕩
  await p.evaluate(() => localStorage.setItem('marble-brave-save-v1', JSON.stringify({ tutorialDone: true, gold: 0, owned: ['blade'], selected: 'blade', difficulty: 'casual', progress: { casual: 4 }, chapter: 2, wallet: { gem: 25 }, sweep: { day: 'x', n: 0, rec: { 'casual-2': { gold: 5000, gem: 5 } } } })));
  await p.reload(); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !!document.getElementById('btn-sweep')), '通關過的章節要有掃蕩鈕');
  await p.screenshot({ path: S + '/v323-dock.png', clip: { x: 0, y: 700, width: 390, height: 144 } });
  const rs = [];
  for (let k = 0; k < 7; k++) {
    if (k === 0) await p.click('#btn-sweep'); else await p.click('#btn-sweep-again');
    await p.waitForTimeout(250);
    rs.push(await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('marble-brave-save-v1')); return [s.gold, s.wallet.gem, s.sweep.n]; }));
  }
  await p.screenshot({ path: S + '/v323-sweep.png' });
  console.log('sweeps', JSON.stringify(rs));
  ok(rs[0][0] === 4000, '第一次掃蕩要拿 5000 的八成 = 4000 金幣，實際 ' + rs[0][0]);
  ok(rs[4][1] === 25 + 4 * 5, '前 5 次免費（每次 +4 寶石）');
  ok(rs[5][1] === 25 + 5 * 4 - 20 + 4, '第 6 次扣 20 寶石');
  ok(rs[6][2] === 7 && rs[6][1] === rs[5][1] - 20 + 4, '第 7 次也扣寶石');
  // 沒通關的章節沒有掃蕩
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('marble-brave-save-v1')); s.chapter = 4; localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(1000);
  ok(await p.evaluate(() => !document.getElementById('btn-sweep')), '還沒通關的章節不能掃蕩');
  console.log('FAILS', fails, 'ERRORS', errs);
  await b.close();
})();
