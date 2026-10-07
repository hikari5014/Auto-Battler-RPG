# 3D 英雄圖集產生工具

用 Quaternius「RPG Characters」（CC0，6 個模型）換色，預先渲染成 `assets/img/heroes3d.png`（每位英雄一列 20 格，64px）。

- 0-3 站姿（Idle）、4-9 攻擊、10-13 騎乘站姿、14-19 騎乘攻擊
- 騎乘：把站姿第 0 格的大腿往前彎、小腿往下（`sit`），每一格都固定腿的角度
- `heromap.json`：英雄 → [模型, 染色]；改了要同步 `js/hero3d.js` 的順序

步驟：下載模型包放到 `chars/`（FBX ＋ Textures），`npm i three@0.160.0` 連到 `three/`，開 http 伺服器（埠 8799），
`node heroes3d.cjs` → `python3 hsheet.py <資料夾> ../../assets/img/heroes3d.png`，頭像圖再從第 0 格裁切（見 3.19 commit）。
模型檔太大（每個 2～3MB）沒有放進專案，來源見 assets/licenses/quaternius-rpg-characters.txt。
