# 彈珠勇者（Auto-Battler-RPG）

參考《Cup Heroes》玩法做的 PWA 手遊：**自動戰鬥 × 彈珠倍率 × 三選一技能**。
純 HTML + JavaScript，不用安裝套件，加到手機主畫面後可以全螢幕、離線玩。

## 怎麼玩

1. 上半部：英雄自動打怪，打倒敵人會掉小球。
2. 下半部：小球從倒球杯落下。**左右拖曳**倒球杯，把球對準會移動的倍率門（x2、+3），球就會變多。
3. 掉進下方移動的紅杯子 = 球幣 x2；掉到地板 = 照樣算，但沒有加倍。
4. 每波結束用球幣買技能卡（三選一，可以買很多張），撐過 15 波打倒魔王就通關。
5. 結算拿金幣，回主畫面點天賦網、解鎖新英雄、挑戰下一章。

## 已完成的內容

| 項目 | 內容 |
|---|---|
| 戰鬥 | 15 波；怪物從右側進場，分普通、隊長、隨機菁英（可能掉技能）、寶箱怪、魔王；每章 4 種怪各有特性 |
| 魔王關 | WARNING 登場、震地腳步、大血條、砸地衝擊波、半血狂暴、擊倒白光爆炸 |
| 難度 | 休閒、簡單、中級、挑戰、地獄、無解（越難金幣越多，地獄起有陷阱門） |
| 章節彈珠台 | 平原（標準）、沙漠（沙丘＋陣風）、墓地（黑洞＋忽隱忽現的門）、火山（彈跳石＋熔岩）、天空（低重力＋傳送門）；倍率門數值每波隨機 |
| 彈珠台 | 自製輕量物理（重力、釘子反彈、移動倍率門）；球太多時自動改成「一顆抵多顆」避免卡頓 |
| 奇遇事件 | 第 3、6、9、12 波後三選一：賭桌、祭壇、泉水、寶箱、商人、祝福、鍛造、契約、訓練 |
| 技能卡 | 分成通用、近戰、遠程、法術四類（看英雄類型出現）＋每位英雄 3 種專屬技能；有等級上限與滿級獎勵 |
| 英雄 | 8 位一般職業：劍士、射手、法師、狂戰士、聖騎士、刺客、火槍手、元素使；每位 3 個專屬技能 |
| 隱藏職業 | 龍騎士（成就「不服輸」）、星辰賢者（成就「登塔者」）、盜賊王（成就「球幣大亨」），達成成就自動解鎖 |
| 天賦網 | 蜘蛛網狀天賦：6 條主線（力量、精準、彈珠、財富、技能、生命）＋6 顆核心天賦；只能點亮相連的格子，可全額重置 |
| 局外養成 | 金幣、英雄解鎖、5 個章節主題（之後循環並變強） |
| 背包與裝備 | 武器、防具、飾品；四種稀有度；分類分頁、和身上裝備比較、新裝備提示、一鍵合成、一鍵分解普通 |
| 成就與每日挑戰 | 18 個成就領金幣、戰績統計、每日兩個特殊規則的挑戰關 |
| 無盡塔 | 通關第 1 章後開放；每 10 層魔王並換章節；本機前 10 名排行榜 |
| 奇遇事件 | 第 3、6、9、12 波後三選一 |
| 新手教學與設定 | 第一次玩的教學提示；音樂／音效音量、震動、低特效、傷害數字 |
| 分享戰績 | 結算畫面產生戰績圖，可分享或下載 |
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
js/levels.js          章節彈珠台、特殊規則、難度
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
js/version.js         版本號與更新日誌
js/update.js          檢查更新、一鍵更新
js/settings.js        設定（音量、震動、特效）
js/tutorial.js        新手教學
js/events.js          奇遇事件
js/gear.js            裝備系統
js/meta.js            成就、統計、每日挑戰
js/share.js           分享戰績圖
js/talent.js          天賦網
js/feedback.js        觸控回饋
```

## 發布新版本

1. `js/version.js`：把 `VERSION` 改成新版本號，並在 `CHANGELOG` 最前面加一筆說明。
2. `sw.js`：把 `VERSION` 改成一樣的版本號。
3. 推到 `main`，GitHub Pages 會自動部署。兩邊版本號不一致時部署會失敗，避免玩家更新不到。

玩家進首頁時會自動檢查，有新版本時右上角的更新按鈕會出現紅點，點一下就能更新（存檔會保留）。

## 之後可以加的

- 真正的激勵廣告 / 免廣告方案
- 線上排行榜、非同步 PVP（需要伺服器）
- 寵物系統
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
