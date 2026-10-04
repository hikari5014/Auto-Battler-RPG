# 彈珠勇者（Auto-Battler-RPG）

參考《Cup Heroes》玩法做的 PWA 手遊：**自動戰鬥 × 彈珠倍率 × 三選一技能**。
純 HTML + JavaScript，不用安裝套件，加到手機主畫面後可以全螢幕、離線玩。

## 怎麼玩

1. 上半部：英雄自動打怪，打倒敵人會掉小球。
2. 下半部：小球從倒球杯落下。**左右拖曳**倒球杯，把球對準會移動的倍率門（x2、+3），球就會變多。
3. 掉進下方移動的紅杯子 = 球幣 x2；掉到地板 = 照樣算，但沒有加倍。
4. 每波結束用球幣買技能卡（三選一，可以買很多張），撐過 15 波打倒魔王就通關。
5. 結算拿金幣，回主畫面升級能力、解鎖新英雄、挑戰下一章。

## 已完成的內容

| 項目 | 內容 |
|---|---|
| 戰鬥 | 15 波，第 5、10 波精英怪，第 15 波魔王；暴擊、連擊、格擋、吸血、濺射、反傷 |
| 彈珠台 | 自製輕量物理（重力、釘子反彈、移動倍率門）；球太多時自動改成「一顆抵多顆」避免卡頓 |
| 技能卡 | 18 種，分 1～3 星；可付費刷新、每波一次免費刷新 |
| 英雄（與小球連動） | 劍士（劍氣打全體）、彈射射手（接球自動射箭）、重力法師（杯子吸球）、鏈鋸狂戰（球撞釘子就砍人） |
| 局外養成 | 金幣、3 種永久升級、英雄解鎖、5 個章節主題（之後循環並變強） |
| 爽感 | WebAudio 即時合成的叮噹聲、螢幕震動、手機震動、傷害跳字 |
| PWA | manifest、離線快取（Service Worker）、App 圖示、iPhone 全螢幕 |
| 廣告位 | 「免費刷新」「復活一次」先做成免費按鈕，之後可換成激勵廣告 |

## 本機執行

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000
```

Service Worker 需要 `http://localhost` 或 `https` 才會啟用。發布到 GitHub Pages / Vercel / Netlify 這類靜態網站空間就能在手機上安裝。

## 檔案

```
index.html            畫面骨架
style.css             介面樣式
manifest.webmanifest  PWA 設定
sw.js                 離線快取
js/main.js            主迴圈、流程（主畫面 → 戰鬥 → 商店 → 結算）
js/battle.js          自動戰鬥
js/board.js           彈珠台物理與倍率門
js/data.js            英雄、敵人、技能卡、數值
js/audio.js           音效
js/save.js            存檔（localStorage）
icons/                App 圖示
assets/               美術素材
js/sprites.js         畫像素角色
```

## 之後可以加的

- 真正的激勵廣告 / 免廣告方案
- 每週爬塔排行榜、非同步 PVP
- 奇遇事件房（賭博、用血換卡）
- 裝備、寵物系統
- 更多美術：背景、特效、技能卡圖示

## 素材來源

| 素材 | 作者 | 授權 |
|---|---|---|
| 角色、怪物、地磚（`assets/tiny-dungeon.png`） | [Kenney – Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | CC0（公有領域，可免費商用，不必標示） |

授權原文在 `assets/LICENSE-kenney-tiny-dungeon.txt`。
