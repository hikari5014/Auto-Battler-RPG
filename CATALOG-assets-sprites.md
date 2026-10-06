# 彈珠勇者：角色／怪物／Boss／裝備／技能特效／坐騎素材目錄

調查日期：2026-10-06。範圍是角色、怪物、Boss、裝備圖示、技能 VFX、坐騎。
已排除 repo 已在用的素材：Kenney Tiny Dungeon、1-Bit Pack、Pixel Platformer、Pixel UI Pack，以及各音效包。

- 下載根目錄（以下簡稱 `AC/`）：`packs/`
- 每個包都有 `LICENSE.txt`，記錄來源網址、作者、授權與署名文字。zip 已解壓到 `x_<zip名>/`，原 zip 已刪除。
- 預覽圖放在 `AC/_previews/<pack>.png`。
- 我下載的包合計約 109 MB（不含其他 agent 抓的音樂、背景、UI）。
- 為了省空間，已刪除原始檔 .psd、.xcf、.ai（約 39 MB）。正式匯入時只需要 PNG/SVG。

授權說明：
- **CC0**：免署名，可商用，可在公開 repo 重新散布。
- **CC-BY / OGA-BY**：必須在遊戲 Credits 和 `assets/licenses/` 寫入署名。

---

## 1. 英雄角色（需要 4 種稀有度，約 40 種外觀）

| 名稱 | 來源網址 | 作者 | 授權 | 是否需署名（署名文字） | 內容/數量 | 尺寸風格 | 適合用在哪裡 | 已下載路徑 |
|---|---|---|---|---|---|---|---|---|
| Roguelike Characters | https://kenney.nl/assets/roguelike-characters | Kenney | CC0 | 否 | 模組化紙娃娃：膚色/身體、上衣、褲、頭髮、頭盔、盾、武器，可疊圖組出數百種造型 | 16×16，1px 間距，Kenney 扁平像素風，和 Tiny Dungeon 很搭 | **主力**：用圖層疊合，在 Canvas 程式內組出 40 位英雄（普通＝布衣，稀有＝皮甲，菁英＝鐵甲加盾，傳說＝金甲加特殊武器） | `AC/kenney-roguelike-characters/` |
| 16x16 DungeonTileset II v1.7 | https://0x72.itch.io/dungeontileset-ii | 0x72 | CC0 | 否 | 英雄：騎士、精靈、矮人、巫師、蜥蜴人各分男女（idle/run/hit 4 幀）；另有約 30 種武器圖示 | 16×16（大怪 32×36），有動畫 | 英雄的動畫底稿（10 名有 idle/run 動畫）；武器圖示 | `AC/0x72-dungeontileset-ii/` |
| DawnLike v1.81（Player0/1、Humanoid0/1） | https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181 | DragonDePlatino | CC-BY 4.0 | **是**：「DawnLike tileset by DragonDePlatino (CC-BY 4.0), palette by DawnBringer」 | 6 種族 × 8–16 職業，約 100 種玩家造型，每個有 2 幀動畫 | 16×16，DB16 調色盤，輪廓較暗 | 想要更多職業造型時的補充，色調和 Kenney 略有差異 | `AC/dawnlike-16x16/` |
| LuizMelo 英雄 5 包（Hero Knight、Fantasy Warrior、Huntress、Martial Hero、Medieval King 2） | https://luizmelo.itch.io/ （各包頁面） | LuizMelo | CC0（各包內附 License.txt） | 否 | 5 名橫向英雄，各有 Idle/Run/Jump/Attack1-3/Hit/Death 完整動畫 | 每幀 150–200px 正方，人物本體約 40–60px，橫向動作遊戲風 | **傳說級英雄或立繪**（比例比 16px 大很多，戰場上要縮小，或只用在抽卡/詳情頁） | `AC/luizmelo-heroes/` |
| Tiny Swords（舊版 Update 010） | https://pixelfrog-assets.itch.io/tiny-swords | Pixel Frog | CC0（**只限**名為「TS_old version_CC0 Licensed」的那個上傳檔） | 否 | 騎士方：Warrior/Archer/Pawn 各 5 色、哥布林方：Torch/TNT/Barrel、爆炸與火焰特效 | 每幀 192×192，角色約 64px，Q 版俯視 | 備案；風格偏大，和 16px 不搭。爆炸與火焰特效可用 | `AC/pixelfrog-tiny-swords-cc0/` |

## 2. 怪物（6 個以上生態區）

| 名稱 | 來源網址 | 作者 | 授權 | 是否需署名（署名文字） | 內容/數量 | 尺寸風格 | 適合用在哪裡 | 已下載路徑 |
|---|---|---|---|---|---|---|---|---|
| **Tiny Creatures** | https://opengameart.org/content/tiny-creatures | Clint Bellanger | CC0 | 否（可選署名「Tiny Creatures by Clint Bellanger」） | 180 隻：殭屍、骷髏、吸血鬼、火/水/土/風元素、龍（白/藍/黑/紅/綠）、天使、惡魔、雪怪、木人、蛇、蠍子、熊、獅、象、狼、鯊魚、巫師等 | 16×16，**是 Kenney Tiny Dungeon 的官方許可擴充，風格完全一致**（靜態，無動畫） | **怪物主力**，可涵蓋所有生態區：平原（動物、哥布林）、沙漠（蠍、蛇、駱駝、木乃伊）、墓地（殭屍、骷髏、幽靈）、火山（火元素、紅龍、惡魔）、天空（鳥、鷹、天使）、冰原（雪怪、北極熊、冰元素、白龍） | `AC/clint-tiny-creatures/` |
| DawnLike v1.81（Characters） | 同上 | DragonDePlatino | CC-BY 4.0 | **是**（同上，另有藏 Platino 的要求，見風險） | 400+ 隻生物，分 Aquatic/Avian/Cat/Demon/Dog/Elemental/Humanoid/Misc/Pest/Plant/Quadraped/Reptile/Rodent/Slime/Undead，每隻 2 幀動畫 | 16×16，有動畫 | 怪物量最大的 16px 來源，想要「會動」的小怪時使用 | `AC/dawnlike-16x16/x_DawnLike_5/Characters/` |
| 0x72 DungeonTileset II（怪物） | https://0x72.itch.io/dungeontileset-ii | 0x72 | CC0 | 否 | 哥布林、小鬼、獸人戰士/薩滿、蒙面獸人、殭屍、冰殭屍、骷髏、史萊姆、沼澤怪、死靈法師、Chort 等，各 4 幀 idle/run | 16×16～16×24，有動畫 | 地城/墓地/冰原的動畫小怪 | `AC/0x72-dungeontileset-ii/` |
| Dungeon Crawl Stone Soup 32x32（含 supplemental） | https://opengameart.org/content/dungeon-crawl-32x32-tiles ／ …-supplemental | DCSS 美術團隊（維護者 Chris Hamons） | CC0 | 否 | 約 9000 張圖塊，其中怪物數百種，涵蓋所有奇幻種類 | 32×32，寫實暗色調（和 Kenney 差異大） | 怪物圖鑑和稀有怪的備用庫；可縮到 16px 或另外重繪 | `AC/dungeon-crawl-32x32/`、`AC/dungeon-crawl-32x32-supplemental/` |
| LuizMelo Monsters Creatures Fantasy | https://luizmelo.itch.io/monsters-creatures-fantasy | LuizMelo | CC0 | 否 | 哥布林、骷髏、蘑菇、飛眼 4 隻，完整動畫（Idle/Run/Attack1-3/Hit/Death）加投射物 | 每幀 150px，橫向 | 菁英怪或小 Boss | `AC/luizmelo-monsters-creatures-fantasy/` |
| Redshrike RPG Critters | https://opengameart.org/content/16x16-16x24-32x32-rpg-enemies-updated | Stephen "Redshrike" Challener | CC-BY 3.0 / OGA-BY 3.0 | **是**：「Stephen "Redshrike" Challener, hosted by OpenGameArt.org」並附 opengameart.org 連結 | 約 20 種大地圖敵人，3 幀 | 16×16／16×24／32×32 | 平原/森林小怪補充 | `AC/redshrike-rpg-critters/` |
| Charles Gabriel 10+10 Fantasy RPG Enemies | https://opengameart.org/content/10-fantasy-rpg-enemies ／ …-plus-a-boss | Charles Gabriel（OGA 委託） | CC-BY 3.0（也可選 BY-SA/GPL，建議用 BY 3.0） | **是**：「Charles Gabriel, commissioned by OpenGameArt.org, CC-BY 3.0」 | 20 種：史萊姆、蛇、哥布林、雞蛇、蜥蜴、鼠、蠍、幽靈、狼、龍、蝙蝠、飛眼、士兵、隊長、骷髏、蜘蛛、虎、兔、海盜、忍者，另加 Shadow Boss | 約 32px，3 幀動畫 | 各生態區有動畫的小怪 | `AC/charlesgabriel-fantasy-enemies/` |
| DENZI CC0 | https://opengameart.org/content/denzis-public-domain-art | DENZI | CC0 | 否 | 32×32 怪物表、32×48 大怪、48×32 魔界惡魔、頭盔、紙娃娃、技能圖示 | 32px，舊式 roguelike 風 | 大型怪和惡魔的補充 | `AC/denzi-cc0/` |

## 3. Boss（大尺寸，最好有動畫）

| 名稱 | 來源網址 | 作者 | 授權 | 是否需署名（署名文字） | 內容/數量 | 尺寸風格 | 適合用在哪裡 | 已下載路徑 |
|---|---|---|---|---|---|---|---|---|
| **LuizMelo Evil Wizard 1/2/3 + Fire Worm** | https://luizmelo.itch.io/evil-wizard 、/evil-wizard-2 、/evil-wizard-3 、/fire-worm | LuizMelo | CC0（包內 License.txt） | 否 | 4 隻 Boss，完整動畫（Idle/Run/Attack/Hit/Death，部分有 Jump/Fall），附火球/投射物和爆炸動畫 | 每幀 90–250px，像素風 | **章節 Boss**：火法師配火山，暗影法師配墓地，白髮死靈配冰原或墓地，火蠕蟲配沙漠或火山 | `AC/luizmelo-bosses/` |
| 0x72 Big Demon / Big Zombie / Ogre | https://0x72.itch.io/dungeontileset-ii | 0x72 | CC0 | 否 | 3 隻大怪，idle/run 各 4 幀 | 32×36，和 16px 小怪同風格 | **前期小 Boss**，和 16px 小怪放在一起不違和 | `AC/0x72-dungeontileset-ii/` |
| Bosses and monsters spritesheets (Ars Notoria) | https://opengameart.org/content/bosses-and-monsters-spritesheets-ars-notoria | Balmer（改自 Redshrike） | CC-BY 3.0 | **是**：「Original sprites by Stephen Challener (Redshrike), spritesheets by Balmer, OpenGameArt.org (CC-BY 3.0)」 | Andromalius、3 種法師、Gnu 巨獸、Shadow、Minion、觸手，加火球和子彈，多幀動畫 | 45～122px 幀，DB32 調色盤 | 中後期 Boss 與魔法 Boss | `AC/redshrike-ars-notoria-bosses/` |
| Boss Cohort | https://opengameart.org/content/boss-cohort | Gilgaphoenixignis | CC-BY 4.0 / 3.0 | **是**：「Boss Cohort by Gilgaphoenixignis (CC-BY 4.0)」 | 5 隻靜態 Boss：Alvaric、Behemot、Terradaemon、中世紀象獸、紳士幽靈 | 約 64–128px（已下載 2x 版），無動畫 | 靜態 Boss，可用程式做呼吸、震動、閃白 | `AC/gilgaphoenixignis-boss-cohort/` |
| Tiny Creatures 的龍／巨人 | 見怪物表 | Clint Bellanger | CC0 | 否 | 5 色龍、巨人、獨眼巨人、石像 | 16×16 | 用程式放大 2–3 倍並加光暈當 Boss，風格最統一 | 同上 |

## 4. 裝備圖示（武器、頭盔、護甲、手套、靴、戒指、項鍊、寶石）

| 名稱 | 來源網址 | 作者 | 授權 | 是否需署名（署名文字） | 內容/數量 | 尺寸風格 | 適合用在哪裡 | 已下載路徑 |
|---|---|---|---|---|---|---|---|---|
| **496 pixel art icons for medieval/fantasy RPG** | https://opengameart.org/content/496-pixel-art-icons-for-medievalfantasy-rpg | Henrique Lazarini (7Soul1) | CC0 | 否 | 496 個：劍、斧、弓、匕首、錘、矛、杖、書、拳套、槍、金色武器（W_*）；護甲、鞋（A_*）；頭盔、帽（C_*）；項鍊、戒指、勳章（Ac_*）；寶石、礦石（I_*）；技能圖示，含火、冰、雷、聖、毒、暗、風、水、土（S_*） | 34×34 像素 | **裝備和技能圖示主力**，8 個裝備部位都有 | `AC/7soul1-496-rpg-icons/`（另一個 agent 也抓了同一包：`AC/henrique-lazarini-496-rpg-icons/`） |
| DawnLike Items | 同 DawnLike | DragonDePlatino | CC-BY 4.0 | **是**（同上） | 800+ 物品，分類檔：Amulet、Ring、Boot、Glove、Hat、Armor、Shield、LongWep/MedWep/ShortWep、Wand、Potion、Scroll、Money… | 16×16 | 16px 尺寸、和角色同大小的裝備圖示 | `AC/dawnlike-16x16/x_DawnLike_5/Items/` |
| game-icons.net 全集 | https://game-icons.net/ | Lorc、Delapouite 等 30+ 位 | CC-BY 3.0（Viscious Speed、Zeromancer 為 CC0） | **是**：「Icons made by {作者} from https://game-icons.net (CC BY 3.0)」，作者名是子資料夾名 | 4180 個 SVG（白色、透明背景），涵蓋所有裝備、技能、狀態、坐騎頭像 | 向量，可任意著色、縮放（非像素風） | 技能、天賦、Buff 圖示；需要大量一致圖示時使用。可用 Canvas 低解析繪製出「像素化」效果 | `AC/game-icons-net/` |
| Dungeon Crawl 32x32（item/） | 見上 | DCSS | CC0 | 否 | 數百件武器、護甲、戒指、護符、魔杖、寶石 | 32×32 寫實 | 傳說裝備的稀有外觀備用 | 同上 |
| DENZI helms / paperdoll / ability icons | 見上 | DENZI | CC0 | 否 | 頭盔一整張、紙娃娃裝備、技能圖示 | 32×32 | 頭盔與技能補充 | `AC/denzi-cc0/` |
| Fantasy Icon Pack by Ravenmore | https://opengameart.org/content/fantasy-icon-pack-by-ravenmore-0 | Ravenmore | CC-BY 3.0 | **是**：「Fantasy Icon Pack by Ravenmore (https://ravenmore.itch.io/), CC-BY 3.0」 | 29 個加 12 個強化版（劍、斧、弓、盔、甲、盾、寶石紅/藍/綠、藥水） | 手繪 64/128/512px（**非像素風**） | 低優先，只適合高解析商店或大圖示 | `AC/ravenmore-fantasy-icons/` |
| Roguelike Characters 的武器、盾層 | 見英雄表 | Kenney | CC0 | 否 | 數十把劍、斧、杖、弓、盾 | 16×16 | 角色手持武器的外觀 | 同上 |

## 5. 技能／法術 VFX（序列幀）

| 名稱 | 來源網址 | 作者 | 授權 | 是否需署名（署名文字） | 內容/數量 | 尺寸風格 | 適合用在哪裡 | 已下載路徑 |
|---|---|---|---|---|---|---|---|---|
| **Weapon Slash Effect** | https://opengameart.org/content/weapon-slash-effect | Cethiel | CC0 | 否 | 5 種揮砍 × 6 幀 × 4 色（經典、紫、藍、火） | 約 126×150 每幀，像素風 | 近戰普攻、暴擊揮砍 | `AC/cethiel-weapon-slash/` |
| **Slash Effect Collection** | https://opengameart.org/content/slash-effect-collection | MetaShinryu | CC0 | 否 | Small（36 幀）、Big（Slash、Circular、Arcing…）、Huge（Lunge 突刺） | 白色斬擊，可用程式著色 | 劍士、刺客技能，旋風斬 | `AC/metashinryu-slash-collection/` |
| **Spell Effects by StarsteelGaming** | https://opengameart.org/content/spell-effects-by-starsteelgaming | StarsteelGaming | CC0 | 否 | 火球 9 幀、冰矛 6 幀、雷球 8 幀 | 64×32 小像素，**和 16px 最搭** | 彈珠撞擊、法師投射物 | `AC/starsteel-spell-effects/` |
| **M484 Explosion Set 1** | https://opengameart.org/content/explosion-set-1-m484-games | Master484 | CC0 | 否 | 多組大小、顏色的像素爆炸序列 | 小到中型像素 | 彈珠落杯爆炸、怪物死亡、炸彈 | `AC/m484-explosion-set/` |
| Radial Lightning | https://opengameart.org/content/radial-lightning-effect | 13rice | CC0 | 否（作者歡迎署名） | 放射狀閃電序列 | 中型 | 雷系 AOE | `AC/13rice-radial-lightning/` |
| 4 Summoning Circles | https://opengameart.org/content/4-summoning-circles | Luke.RUSTLTD | CC0 | 否 | 4 個魔法陣（靜態） | 1000×1000 向量風 PNG（使用前要縮小） | 技能施放地面魔法陣（用程式旋轉、縮放、淡出） | `AC/rustltd-summoning-circles/` |
| 2D Spell Effects | https://opengameart.org/content/2d-spell-effects | Mikodrak | CC0 | 否 | 10 種：藍色天降光柱、火劍、火球、火印、雷球、能量球、黑爆等 | 寫實風；GIF 帶草地背景，部分有透明 PNG 幀 | 低優先；可用 fx1 天降光柱當聖光或雷擊 | `AC/mikodrak-2d-spell-effects/` |
| Animated Particle Effects #1/#2 | https://opengameart.org/content/animated-particle-effects-1 ／ -2 | para | CC0 | 否 | 14 張 8×8 粒子環或爆散序列（金、藍、紫、火），火焰、血、傳送 | 1024px 大圖，**非像素**、柔光 | 傳說技能的光環或升級特效（要縮小） | `AC/para-particle-fx/` |
| Tiny Swords Effects | 見英雄表 | Pixel Frog | CC0（僅舊版） | 否 | 爆炸 9 幀、火焰 | 192px 像素 | 爆炸備案 | 同上 |
| DawnLike Effect0/1 | 見上 | DragonDePlatino | CC-BY 4.0 | 是 | 16px 小特效（火、冰、雷、毒…） | 16×16 | 命中小特效 | 同上 |

> 治療和神聖（heal/holy）找不到風格合適的 CC0 像素序列幀。建議組合以下素材：game-icons 的 heal、holy-symbol 圖示，para 的金色粒子環（particlefx_13），Mikodrak 的 fx1 光柱，再加上程式粒子。

## 6. 坐騎

| 名稱 | 來源網址 | 作者 | 授權 | 是否需署名（署名文字） | 內容/數量 | 尺寸風格 | 適合用在哪裡 | 已下載路徑 |
|---|---|---|---|---|---|---|---|---|
| **Tiny Creatures（坐騎類）** | 見怪物表 | Clint Bellanger | CC0 | 否 | 馬（棕、白）、獨角獸、飛馬、黑焰馬、獅鷲、5 色龍、狼、熊、虎、象、駱駝、鹿 | 16×16，**和 Tiny Dungeon 英雄同風格** | **坐騎主力**：英雄疊在坐騎上方即可組合；靜態，可用程式做彈跳 | `AC/clint-tiny-creatures/` |
| Animated Horse | https://opengameart.org/content/animated-horse | ScratchIO | CC0 | 否 | 馬 Idle/Eat/Walk/Run | 每幀約 60×33 像素 | 有動畫的馬坐騎 | `AC/scratchio-animated-horse/` |
| Animated Wild Animals | https://opengameart.org/content/animated-wild-animals | ScratchIO | CC0 | 否 | 熊、野豬、鹿、狐、兔、狼：Idle/Walk/Run（狼另有 Howl） | 約 32–64px 寬，像素 | 動畫坐騎（狼、熊、野豬、鹿），也可當平原怪 | `AC/scratchio-wild-animals/` |
| DawnLike Quadraped/Dog/Cat | 見上 | DragonDePlatino | CC-BY 4.0 | 是 | 馬、狼、虎、熊等，2 幀 | 16×16 | 動畫 16px 坐騎補充 | 同上 |

---

## 建議優先採用（排名）

1. **Clint Bellanger「Tiny Creatures」(CC0)**：Tiny Dungeon 的官方許可擴充，180 隻，風格零落差。一次解決 6 個生態區的怪物和大部分坐騎。
2. **Kenney「Roguelike Characters」(CC0)**：16px 紙娃娃，用 Canvas 疊圖可量產 40 位英雄，並能用裝備層區分 4 種稀有度。
3. **0x72「DungeonTileset II」(CC0)**：16px 動畫英雄和怪物，加 3 隻 32px 大怪當前期 Boss，再加約 30 把武器圖示。
4. **7Soul1「496 RPG icons」(CC0)**：裝備 8 個部位和元素技能圖示全包。
5. **LuizMelo Evil Wizard 1-3 + Fire Worm (CC0)**：有完整動畫的章節 Boss。
6. **VFX 組合（全 CC0）**：StarsteelGaming（投射物）、M484 爆炸、Cethiel 和 MetaShinryu 揮砍、13rice 閃電、RUSTLTD 魔法陣。
7. **DawnLike (CC-BY 4.0)**：最大的 16px 動畫怪物和物品庫。需要署名，另見下方 Platino 的要求。
8. **game-icons.net (CC-BY 3.0)**：技能和天賦圖示的無限補給（需逐一作者署名）。
9. 其餘（Redshrike、Charles Gabriel、Ars Notoria、Boss Cohort、DCSS、DENZI、ScratchIO 動物）按需求補充。

## 風險與注意事項

- **Tiny Swords（Pixel Frog）**：目前版本明文禁止 redistribute/repackage，公開 repo **不能放**。只有作者標示「TS_old version_CC0 Licensed」的舊版可用，但 zip 內沒有授權檔。採用前應截圖或存檔 itch 頁面作為證據，否則建議不用。
- **DawnLike**：除了 CC-BY 4.0 署名（作者加 DawnBringer）外，README 要求「必須在遊戲中藏一個 Platino 精靈」。CC-BY 本身不能附加義務，這是作者請求而非授權條件。保守做法是遵守（藏一隻彩蛋怪）。
- **CC-BY 系列**（DawnLike、game-icons、Redshrike、Charles Gabriel、Ars Notoria、Boss Cohort、Ravenmore）：必須在 `assets/licenses/` 加檔，並在遊戲內 Credits 列出。game-icons 要依實際使用的作者逐一列名。
- **風格一致性**：Kenney、Tiny Creatures、0x72 都是 16px，可直接混用。DawnLike、DCSS、DENZI 調色和輪廓不同，混用時可能需要統一描邊或調色。LuizMelo、Ravenmore、para、Mikodrak 是大尺寸或非像素，只適合 Boss、特效或 UI 大圖。
- **已拒絕或未下載**：
  - Pimen「Magical Animation Effects」等：禁止 redistribute。
  - Pixel Frog 新版：禁止 redistribute。
  - CraftPix 免費包：條款通常禁止重新散布。
  - Cethiel「Dragon - Fully Animated」（CC0）：139 MB 的 3D 渲染風序列幀，太大且風格不符，已刪除。
  - LuizMelo 付費包（Fantasy Creatures、Enemies Fantasy 等，購買後是 CC0）：免費限制下不取。
  - LPC 系列（CC-BY-SA/GPL）：share-alike 會影響衍生素材授權，目前不建議。
  - Elthen：itch 頁面授權未明示，未驗證。
- **GPL 多重授權**（Charles Gabriel）：請選 CC-BY 3.0 那一條，避免 GPL 傳染疑慮。
- **檔案安全**：下載內容只有 PNG/GIF/SVG/TXT/TMX/aseprite 和 Kenney 的 .url 捷徑。沒有可執行檔，也未執行任何下載內容。
