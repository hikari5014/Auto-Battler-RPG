// 3.22 新坐騎：斑馬、靈狐、羊駝、蠻牛（Quaternius，CC0），8 格動畫
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const H = Math.PI / 2, T = -0.45;
const JOBS = JSON.parse(process.env.JOBS || 'null') || {
  zebra: ['Zebra', { clip: 'Armature|Walk', yaw: H + T }],
  fox: ['Fox', { clip: 'Armature|ArmatureAction', yaw: -2.02, colors: { 'Material.001': '#e8742c', 'Material.002': '#f6efe4' } }],
  llama: ['Llama', { clip: 'Armature|Idle', yaw: H + T, colors: { Brown: '#c89a68', White: '#f4ead8', Grey: '#4a3a34' } }],
  bull: ['Cow', { clip: 'Armature|Walk', yaw: H + T, colors: { White: '#6b4630', Black: '#2a1a14', Pink: '#e0b090' } }],
};
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8799/r2.html');
  await p.waitForFunction(() => window.ready);
  const out = {};
  for (const [id, [n, o]] of Object.entries(JOBS)) out[id] = await p.evaluate(([n, o]) => strip(n, { frames: 8, size: 64, pitch: 0.38, pad: 0.55, ...o }), [n, o]);
  fs.writeFileSync(__dirname + '/newm.json', JSON.stringify(out));
  await b.close();
})();
