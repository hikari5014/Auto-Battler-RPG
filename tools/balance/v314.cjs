const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const S = __dirname;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8765/?' + Date.now());
  const sv = JSON.parse(fs.readFileSync(S + '/saves/early.json', 'utf8'));
  sv.difficulty = 'casual'; sv.chapter = 1; sv.tutorialDone = true;
  await p.evaluate(s => localStorage.setItem('marble-brave-save-v1', JSON.stringify(s)), sv);
  await p.reload(); await p.waitForTimeout(1500);
  // 活動碼
  await p.click('#btn-settings', { force: true }); await p.waitForTimeout(300);
  const tryCode = async c => { await p.fill('#code-input', c); await p.click('#btn-code', { force: true }); await p.waitForTimeout(150); return p.$eval('#toast', e => e.textContent); };
  for (const c of ['hello-marble', 'HELLOMARBLE', 'nope123', 'ultimate 2026']) console.log('code', c, '→', await tryCode(c));
  await p.screenshot({ path: S + '/v314-code.png' });
  console.log('gm', await tryCode('hikariisgod'));
  console.log(JSON.stringify(await p.evaluate(() => { const s = window.__game.save; return { owned: s.owned.length, gold: s.gold, wallet: s.wallet, shards: s.gear.shards }; })), 'heroes', await p.evaluate(() => document.querySelectorAll('.hero').length));
  await p.click('#btn-settings-close', { force: true }); await p.waitForTimeout(300);
  // 自動掛機：推進
  await p.click('#btn-auto', { force: true }); await p.waitForTimeout(200);
  await p.click('#btn-auto', { force: true }); await p.waitForTimeout(200);
  await p.screenshot({ path: S + '/v314-home.png' });
  console.log('mode', await p.evaluate(() => window.__game.save.autoMode));
  await p.click('#btn-start', { force: true }); await p.waitForTimeout(2500);
  await p.click('#btn-speed', { force: true });
  let shot = 0, seenResult = false;
  for (let i = 0; i < 80; i++) {
    await p.waitForTimeout(process.env.FAST ? 1000 : 5000);
    const st = await p.evaluate(() => { const r = window.__game.game.run; return r ? { ch: r.chapter, wave: r.wave, phase: r.phase, skills: r.skills.length } : null; });
    const res = await p.evaluate(() => !document.getElementById('screen-result').classList.contains('hidden') && !!document.querySelector('.auto-wait'));
    if (i === 4) await p.screenshot({ path: S + '/v314-fight.png' });
    if (res && !seenResult) { seenResult = true; await p.screenshot({ path: S + '/v314-result.png' }); }
    console.log(i, JSON.stringify(st), res ? 'RESULT' : '');
    if (seenResult && st && st.ch >= 2 && st.wave >= 1 && !res) { console.log('auto continued to chapter', st.ch); break; }
  }
  console.log('ERRORS', errs);
  await b.close();
})();
