# Gemini 生成的原圖

遊戲作者用 Google Gemini 依「圖片素材清單」的提示詞生成（P01～P57）。
切圖、去背、縮小、加外框的工具在 `tools/art/`：
- `slice.py`：洋紅色背景去背、自動找出每個物件（或照格子切）
- `monsters.py` + `monsters.json`：怪物與魔王 → `assets/img/monsters-hd.png`
- 章節背景 P01～P10 → `assets/bg/hd/ch1～10.jpg`；Logo P19 → `assets/img/logo.png`；App 圖示 P20 → `icons/`
- 圖示 P21～P45 → `assets/img/icons-hd.png`＋`js/icons-hd.js`（`tools/art/icons.py`，名稱與順序在 `tools/art/icons.json`）
  - P34 只畫了 8 個（少一個傳說特效徽章「學者」），那一個繼續用舊圖
- 插圖 P46～P57 → `assets/art/`（`tools/art/crop.py` 照格子裁、`tools/art/panels.py` 切彈珠台底圖）
  - events/0～8 奇遇、modes/m0～m7、n0～n7 模式橫幅、puzzles/a0～a5、b0～b5 謎題、gacha/0～1 扭蛋、heroes/h52-0～h55-6 英雄立繪（照 HEROES 順序）、boards/a0～a4、b0～b4 彈珠台底圖（照章節）
