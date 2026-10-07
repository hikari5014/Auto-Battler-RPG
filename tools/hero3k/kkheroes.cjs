// 3.21 KayKit 英雄圖集：每位 20 格（0-3 站、4-9 攻擊、10-13 騎乘站、14-19 騎乘攻擊），輸出前左右鏡像（拿武器的手朝鏡頭）
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const M = JSON.parse(fs.readFileSync(__dirname + '/kkmap.json', 'utf8'));
// 染色只染一半（KayKit 本身有彩色貼圖，全染會變髒）
const soft = t => t ? '#' + [1, 3, 5].map(i => Math.round(255 - (255 - parseInt(t.slice(i, i + 2), 16)) * 0.55).toString(16).padStart(2, '0')).join('') : '#ffffff';
const YAW = -(Math.PI / 2 - 0.45), SIT = 'Sit_Chair_Idle', S = 64;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8799/r4.html'); await p.waitForFunction(() => window.ready);
  const ref = await p.evaluate(([n, y]) => measure(n, y), ['Knight', YAW]);
  const H = ref.s[1];
  const boxes = {};
  const out = {}, tips = {};
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [id, kitId, tint] of M.heroes) {
    if (only && !only.includes(id)) continue;
    const k = M.kits[kitId];
    if (!boxes[k.model]) { const m = await p.evaluate(([n, y]) => measure(n, y), [k.model, YAW]); boxes[k.model] = [m.c[0], m.min + H * 0.5, m.c[2], H * 0.66]; }
    const o = { model: k.model, wr: k.wr, wl: k.wl, tipSlot: k.tipSlot, yaw: YAW, box: boxes[k.model], size: S, pitch: 0.3, tintAll: soft(tint) };
    const run = (clip, frames, sit) => p.evaluate(opt => strip(opt), { ...o, clip, frames, sit });
    const seq = async sit => { const a = [await run(k.idle, 4, sit)]; for (const [c, n] of k.atk) a.push(await run(c, n, sit)); return a; };
    const parts = [...await seq(null), ...await seq(SIT)];
    out[id] = parts.flatMap(r => r.frames);
    tips[id] = parts.flatMap(r => r.pts.map(q => [+(S - q.tip[0]).toFixed(1), q.tip[1]]));
    process.stdout.write(id + ' ');
  }
  fs.writeFileSync(__dirname + '/kkheroes.json', JSON.stringify(out));
  fs.writeFileSync(__dirname + '/kktips.json', JSON.stringify(tips));
  await b.close();
})();
