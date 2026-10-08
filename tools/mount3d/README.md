# 3D 坐騎圖集產生工具

把 Quaternius 的 3D 模型（CC0）預先渲染成 `assets/img/mounts3d.png`（8 欄 × 4 列，每格 64px：馬、狼、獅鷲、火龍）。

1. `npm i three@0.160.0`，把 `node_modules/three` 連到這個資料夾的 `three/`，在這個資料夾開 http 伺服器（埠 8799）。
2. `render.html` 載入 `models/*.fbx`，`strip()` 依指定動畫、角度、顏色渲染 8 格。
3. `node strips.cjs`、`node alt.cjs` 產生各坐騎的格子（JSON），再 `python3 sheet.py <資料夾> ../../assets/img/mounts3d.png` 拼成圖集並加外框。
   - 馬用 Walk 動畫（Run 的後腿會變形），獅鷲用側面飛行並左右翻轉。
4. 遊戲內的大小與英雄坐的位置在 `js/mount.js`（scale、foot、seat）調整。

## 3.22 新坐騎（mounts3d-2.png）
斑馬、靈狐、羊駝、蠻牛：`node newm.cjs`（一樣用 render.html，模型放 `models/`），`python3 newmsheet.py . ../../assets/img/mounts3d-2.png`，
同時輸出 `newmouth.json`（每格嘴巴位置），貼到 `js/hero3d.js` 的 `MOUNT_MOUTH`。
