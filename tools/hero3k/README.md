# 新版 3D 英雄圖集（KayKit）

用 KayKit Adventurers（CC0）角色＋武器，配 KayKit Character Animations 的動作，預先渲染成 `assets/img/heroes3k.png`（排法跟 heroes3d.png 一樣：每位英雄一列 20 格，64px）。

- 0-3 站姿、4-9 攻擊、10-13 騎乘站姿、14-19 騎乘攻擊（腿固定成 Sit_Chair_Idle 的坐姿）
- 角色面向左邊渲染，再左右鏡像，這樣拿武器的右手朝鏡頭
- `kkmap.json`：`kits` 是「模型＋武器＋動作」組合，`heroes` 是英雄 → [組合, 染色]（染色只染一半）；順序要跟 `js/hero3d.js` 的 H3_ORDER 一樣
- 會順便輸出 `kktips.json`（每格武器尖端位置），貼到 `js/hero3d.js` 的 `H3K_TIP`

步驟：把兩個免費包的 `Characters/gltf/*`、`Animations/gltf/Rig_Medium/*.glb` 放到 `kk/`，`Assets/gltf/*` 放到 `kk/w/`，
`render.html` 改名 `r4.html`、three.js 0.160 放到 `three/`，開 http 伺服器（埠 8799），
`node kkheroes.cjs` → `python3 kksheet.py . ../../assets/img/heroes3k.png ../../assets/img/heroes3k-face.png`。
