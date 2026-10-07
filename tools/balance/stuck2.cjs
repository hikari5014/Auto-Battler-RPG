const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto('http://localhost:8765/?' + Date.now());
  await p.waitForTimeout(1200);
  const W = +(process.argv[2] || 390);
  const res = await p.evaluate(async W => {
    const { Board } = await import('/js/board.js?' + Date.now());
    const out = [];
    for (let ch = 1; ch <= 10; ch++) {
      const bd = new Board();
      bd.layout(300, 844 - 6, W);
      bd.reset({ chapter: ch, diff: { traps: 0 }, mods: {}, hero: { magnet: 0 } });
      bd.gates = []; // 只看地形
      let caught = 0, maxAge = 0;
      const ages = [];
      bd.onCatch = () => {};
      const spots = {};
      const orig = bd.step.bind(bd);
      const dt = 1 / 60;
      
      const alive = {};
      // 一次一顆、間隔 0.05 秒倒球（比較像實際遊戲），看最慢的球要多久
      let spawned = 0;
      for (let t = 0; t < 40 * 60; t++) {
        if (spawned < 300 && t % 3 === 0) { bd.spawn(Math.random() * (W - 20) + 10, bd.top + 22, Math.random() * 60 - 30, 50, 1, 0); spawned++; }
        for (const ball of bd.balls) { maxAge = Math.max(maxAge, ball.age); if (ball.age > 6) { const key = Math.round(ball.x / 10) * 10 + ',' + Math.round(ball.y / 10) * 10; spots[key] = (spots[key] || 0) + 1; } }
        bd.update(dt);
        if (t === 20 * 60) alive.t20 = bd.balls.length;
      }
      const stuckLong = Object.entries(spots).sort((a, b) => b[1] - a[1]).slice(0, 4);
      out.push({ ch, maxAge: +maxAge.toFixed(1), alive, left: bd.balls.length, stuckFrames: Object.values(spots).reduce((a, b) => a + b, 0), top: stuckLong });
    }
    return out;
  }, W);
  for (const r of res) console.log(JSON.stringify(r));
  await b.close();
})();
