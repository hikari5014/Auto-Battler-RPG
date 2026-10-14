# Gemini 生成的原圖

遊戲作者用 Google Gemini 依「圖片素材清單」的提示詞生成（P01～P57）。
切圖、去背、縮小、加外框的工具在 `tools/art/`：
- `slice.py`：洋紅色背景去背、自動找出每個物件（或照格子切）
- `monsters.py` + `monsters.json`：怪物與魔王 → `assets/img/monsters-hd.png`
- 章節背景 P01～P10 → `assets/bg/hd/ch1～10.jpg`；Logo P19 → `assets/img/logo.png`；App 圖示 P20 → `icons/`
- 圖示 P21～P45 → `assets/img/icons-hd.png`＋`js/icons-hd.js`（`tools/art/icons.py`，名稱與順序在 `tools/art/icons.json`）
  - P34 只畫了 8 個（少一個傳說特效徽章「學者」），那一個繼續用舊圖
