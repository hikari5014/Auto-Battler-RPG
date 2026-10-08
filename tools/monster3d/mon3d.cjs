// 3.22 3D 怪物（KayKit Skeletons，CC0）：每隻 8 格（0-3 走路、4-7 攻擊），面向左邊
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const JOBS = {
  skull: { model: 'Skeleton_Warrior', wr: 'Skeleton_Blade', wl: 'Skeleton_Shield_Small_A', walk: 'Walking_A', atk: 'Melee_1H_Attack_Chop' },
  darkmage: { model: 'Skeleton_Mage', wr: 'Skeleton_Staff', walk: 'Walking_B', atk: 'Ranged_Magic_Spellcasting' },
  wraith: { model: 'Skeleton_Rogue', wr: 'Skeleton_Blade', walk: 'Walking_A', atk: 'Melee_1H_Attack_Stab', tint: '#c8b0ff' },
  zombie: { model: 'Skeleton_Minion', walk: 'Walking_C', atk: 'Melee_Unarmed_Attack_Punch_A', tint: '#b8e0a0' },
  deathknight: { model: 'Skeleton_Warrior', wr: 'Skeleton_Axe', wl: 'Skeleton_Shield_Large_A', walk: 'Walking_A', atk: 'Melee_1H_Attack_Chop', tint: '#a090c8' },
};
const YAW = -(Math.PI / 2 - 0.45);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8799/r4.html'); await p.waitForFunction(() => window.ready);
  const ref = await p.evaluate(([n, y]) => measure(n, y), ['Skeleton_Warrior', YAW]);
  const H = ref.s[1];
  const out = {};
  for (const [id, j] of Object.entries(JOBS)) {
    const m = await p.evaluate(([n, y]) => measure(n, y), [j.model, YAW]);
    const o = { model: j.model, wr: j.wr, wl: j.wl, yaw: YAW, box: [m.c[0], m.min + H * 0.5, m.c[2], H * 0.62], size: 64, pitch: 0.3, tintAll: j.tint || '#ffffff' };
    const a = await p.evaluate(opt => strip(opt), { ...o, clip: j.walk, frames: 4 });
    const c = await p.evaluate(opt => strip(opt), { ...o, clip: j.atk, frames: 4 });
    out[id] = [...a.frames, ...c.frames];
    process.stdout.write(id + ' ');
  }
  fs.writeFileSync(__dirname + '/mon3d.json', JSON.stringify(out));
  await b.close();
})();
