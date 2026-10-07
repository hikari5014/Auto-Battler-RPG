const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const H = Math.PI / 2, T = -0.45;
const JOBS = {
  horseWalk: ['Horse', { clip: 'Armature|Walk', yaw: H + T, colors: { 'Material.003': '#c98a4b', 'Material.006': '#4a2c1a' } }],
  eagle0: ['Eagle', { clip: 'EagleArmature|Flying', yaw: 0 + T, colors: { Wings: '#e3a72f', Head: '#f6eedb', Beak: '#ff9327', Claws: '#ffb627' } }],
  eagleM: ['Eagle', { clip: 'EagleArmature|Flying', yaw: -H + T, colors: { Wings: '#e3a72f', Head: '#f6eedb', Beak: '#ff9327', Claws: '#ffb627' } }],
  eaglePI: ['Eagle', { clip: 'EagleArmature|Flying', yaw: Math.PI + T, colors: { Wings: '#e3a72f', Head: '#f6eedb', Beak: '#ff9327', Claws: '#ffb627' } }],
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  await p.goto('http://localhost:8799/r2.html');
  await p.waitForFunction(() => window.ready);
  const out = {};
  for (const [id, [n, o]] of Object.entries(JOBS)) out[id] = await p.evaluate(([n, o]) => strip(n, { frames: 8, size: 64, pitch: 0.38, pad: 0.55, ...o }), [n, o]);
  fs.writeFileSync(__dirname + '/alt.json', JSON.stringify(out));
  await b.close();
})();
