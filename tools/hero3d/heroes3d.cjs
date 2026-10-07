// 3.19 英雄 3D 化：6 個 Quaternius 角色模型 × 換色，每位英雄 20 格
// 0-3 站姿、4-9 攻擊、10-13 騎乘站姿、14-19 騎乘攻擊
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const BASE = {
  Warrior: { idle: 'Idle_Weapon', atk: 'Sword_Attack' },
  Ranger: { idle: 'Idle_Weapon', atk: 'Bow_Attack_Shoot' },
  Wizard: { idle: 'Idle_Weapon', atk: 'Spell1' },
  Rogue: { idle: 'Idle', atk: 'Dagger_Attack' },
  Cleric: { idle: 'Idle_Weapon', atk: 'Staff_Attack' },
  Monk: { idle: 'Idle', atk: 'Attack' },
};
// 英雄 → [模型, 身體染色（null = 原色）]
const HEROES = JSON.parse(fs.readFileSync(__dirname + '/heromap.json', 'utf8'));
const SIT = { ax: 'x', up: -1.5, low: 1.6, mirror: 1 };
const YAW = Math.PI / 2 - 0.45;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8799/r3.html');
  await p.waitForFunction(() => window.ready);
  const boxes = {};
  for (const n of Object.keys(BASE)) { const m = await p.evaluate(([n, y]) => measure(n, y), [n, YAW]); boxes[n] = [m.c[0], m.min + m.s[1] * 0.52, m.c[2], m.s[1] * 0.56]; }
  const out = {};
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const [id, base, tint] of HEROES) {
    if (only && !only.includes(id)) continue;
    const B = BASE[base], box = boxes[base];
    const o = { size: 64, yaw: YAW, box, pitch: 0.3, tintAll: tint || '#ffffff' };
    const run = (clip, frames, sit) => p.evaluate(([n, opt]) => strip(n, opt), [base, { ...o, clip, frames, sit, sitClip: B.idle }]);
    out[id] = [...await run(B.idle, 4), ...await run(B.atk, 6), ...await run(B.idle, 4, SIT), ...await run(B.atk, 6, SIT)];
    process.stdout.write(id + ' ');
  }
  fs.writeFileSync(__dirname + '/heroes3d.json', JSON.stringify(out));
  await b.close();
})();
