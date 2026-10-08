# 3D 怪物圖集（monsters3d.png）

每隻一列 8 格（64px）：0-3 走路、4-7 攻擊，面向左邊（朝英雄）。

- 骷髏（KayKit Skeletons）：用 `tools/hero3k/render.html`（r4.html），模型放 `kk/`、武器放 `kk/w/`，`node mon3d.cjs`
- 南瓜傑克、女巫（KayKit Spooktober，沒有骨架）：`render-parts.html`（r5.html）轉動手臂、頭的零件，`node mon5.cjs`
- `python3 monsheet.py . ../../assets/img/monsters3d.png` 拼圖、加外框
- 遊戲裡：`js/data.js` 怪物 `sprite: ['e3', 列 × 8]`，`js/battle.js` drawEnemy 依「往前撲」選攻擊格，大小乘 `E3_SIZE`
