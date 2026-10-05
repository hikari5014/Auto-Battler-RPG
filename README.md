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
| 2.5D 戰場 | 有透視感的地面（Mode 7 技法）、遠近縮放的紙片人角色、景深霧、鏡頭晃動與暴擊拉近 |
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
assets/img/           像素圖集（角色、金幣、背景、圖示）
assets/ui/            像素面板與按鈕
assets/sfx/           音效
assets/music/         背景音樂
assets/fonts/         像素中文字型
assets/licenses/      所有素材的授權原文
js/sprites.js         讀取與繪製像素圖
js/scene.js           2.5D 場景（有深度的地面、鏡頭、霧）
```

## 之後可以加的

- 真正的激勵廣告 / 免廣告方案
- 每週爬塔排行榜、非同步 PVP
- 奇遇事件房（賭博、用血換卡）
- 裝備、寵物系統
- 彈珠台的杯子、倍率門、釘子目前是程式畫的，可再換成手繪素材

## 素材來源

全部都是免費、可商用的素材。

| 用在哪 | 素材 | 授權 |
|---|---|---|
| 英雄、怪物、墓地/火山地磚 | [Kenney – Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | CC0 |
| 金幣、寶石、愛心、草地磚、天空背景 | [Kenney – Pixel Platformer](https://kenney.nl/assets/pixel-platformer) | CC0 |
| 技能卡與介面圖示 | [Kenney – 1-Bit Pack](https://kenney.nl/assets/1-bit-pack) | CC0 |
| 面板、按鈕 | [Kenney – Pixel UI Pack](https://kenney.nl/assets/pixel-ui-pack) | CC0 |
| 音效 | Kenney – [Casino](https://kenney.nl/assets/casino-audio)、[Impact](https://kenney.nl/assets/impact-sounds)、[Interface](https://kenney.nl/assets/interface-sounds)、[RPG](https://kenney.nl/assets/rpg-audio)、[Digital](https://kenney.nl/assets/digital-audio) Audio、[Music Jingles](https://kenney.nl/assets/music-jingles) | CC0 |
| 背景音樂 | Juhani Junkala – [Chiptune Adventures](https://opengameart.org/content/4-chiptunes-adventure) | CC0 |
| 中文像素字型 | [俐方體11號 Cubic 11](https://github.com/ACh-K/Cubic-11) | 免費、可商用（見授權檔） |

CC0 = 作者放棄所有權利，可以自由使用、修改、商用，不用標示作者。授權原文都在 `assets/licenses/`。
