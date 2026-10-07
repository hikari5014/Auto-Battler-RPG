const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const H = Math.PI / 2, T = -0.45; // T：往鏡頭轉一點，看起來是 3/4 側面
const JOBS = {
  horse: ['Horse', { clip: 'Armature|Run', yaw: H + T, colors: { 'Material.003': '#c98a4b', 'Material.006': '#4a2c1a' } }],
  wolf: ['Wolf', { clip: 'WolfArmature|Walking', yaw: 0 + T, colors: { Wolf: '#a7b2cc' } }],
  bird: ['Eagle', { clip: 'EagleArmature|Flying', yaw: +(process.env.EY || H) + T, colors: { Wings: '#e3a72f', Head: '#f6eedb', Beak: '#ff9327', Claws: '#ffb627' } }],
  drake: ['Dragon', { clip: 'DragonArmature|Dragon_Flying', yaw: H + T, colors: { Main: '#d9432b', Wings: '#8e2630', Belly: '#f4b552', Claws: '#2b1b1b', Eyes: '#ffe45c' } }],
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8799/r2.html');
  await p.waitForFunction(() => window.ready);
  const out = {};
  for (const [id, [n, o]] of Object.entries(JOBS)) out[id] = await p.evaluate(([n, o]) => strip(n, { frames: 8, size: 64, pitch: 0.38, pad: 0.55, ...o }), [n, o]);
  fs.writeFileSync(__dirname + '/strips.json', JSON.stringify(out));
  await b.close();
})();
