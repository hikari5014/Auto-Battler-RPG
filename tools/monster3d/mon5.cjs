const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8799/r5.html'); await p.waitForFunction(() => window.ready);
  const YAW = -0.75;
  const out = { pumpkin: await p.evaluate(y => strip5('k2/Jack/gltf/character_jack.gltf', { yaw: y, k: 0.62 }), YAW), witch: await p.evaluate(y => strip5('k2/Witch/gltf/character_witch.gltf', { yaw: y, k: 0.62 }), YAW) };
  fs.writeFileSync(__dirname + '/mon5.json', JSON.stringify(out)); await b.close(); })();
