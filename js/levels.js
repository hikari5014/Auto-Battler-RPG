// 每個章節的彈珠台、特殊規則，以及難度設定
// 座標用「比例」：x 是 0~1（左到右），y 是 0~1（彈珠台頂到底）
// 倍率門固定在 y = 0.35 與 0.60 兩排，接球杯在 0.84 以下，機關要避開這些高度

// ---------- 難度 ----------
// hp / atk：敵人血量、攻擊力倍率；count：每波多幾隻；price：技能卡價格倍率；lvGrow：技能每升一級，價格再乘幾倍；rerolls：每一波商店最多刷新幾次（含免費刷新）
// gold：結算金幣倍率；traps：彈珠台上多幾道紅色陷阱門（x0.5）
// 3.0 平衡：相鄰難度威脅約 1.35 倍；休閒金幣減半（可以亂玩，但不能拿來刷資源）
// unlock：要先在哪個難度通關第幾章才能選
export const DIFFICULTIES = [
  { id: 'casual', name: '休閒', hp: 1, atk: 1, count: 0, price: 1, lvGrow: 1.5, rerolls: Infinity, gold: 0.5, traps: 0, color: '#8dff9f', unlock: null },
  { id: 'easy', name: '簡單', hp: 1.3, atk: 1.2, count: 0, price: 1.1, lvGrow: 1.6, rerolls: 10, gold: 1.4, traps: 0, color: '#9fe3ff', unlock: null },
  { id: 'normal', name: '中級', hp: 1.8, atk: 1.5, count: 1, price: 1.25, lvGrow: 1.7, rerolls: 8, gold: 2.0, traps: 0, color: '#ffd84a', unlock: ['easy', 1] },
  { id: 'hard', name: '挑戰', hp: 2.5, atk: 1.9, count: 1, price: 1.4, lvGrow: 1.8, rerolls: 6, gold: 2.8, traps: 0, color: '#ff9f43', unlock: ['normal', 3] },
  { id: 'hell', name: '地獄', hp: 3.5, atk: 2.5, count: 2, price: 1.6, lvGrow: 1.9, rerolls: 5, gold: 4.0, traps: 1, color: '#ff5a5a', unlock: ['hard', 5] },
  { id: 'nightmare', name: '無解', hp: 5, atk: 3.3, count: 3, price: 1.8, lvGrow: 2.0, rerolls: 4, gold: 6.0, traps: 1, color: '#d06bff', unlock: ['hell', 5] },
];
export const difficultyOf = id => DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[0];

// 難度不是一開始就全開：第 1 波約 40% 強度，到第 11 波才是完整強度
// 每一波的強度曲線（所有難度共用，再乘上難度倍率）
// 第 1～3 波：比較弱，讓玩家先熟悉；第 4 波起血量、攻擊、數量快速增加
// 回傳 hp / atk = 小怪血量、攻擊倍率；count = 這一波的基本數量
export function waveCurve(w) {
  if (w <= 3) return { hp: [0.55, 0.68, 0.82][w - 1], atk: [0.6, 0.72, 0.85][w - 1], count: 3 };
  const k = w - 3;
  return { hp: 1 + 0.3 * Math.pow(k, 1.2), atk: 1 + 0.17 * Math.pow(k, 1.12), count: 4 + Math.floor(k * 0.85) };
}
// 最終魔王：血量是舊版的 10 倍、攻擊 4 倍（無盡塔每 10 層的魔王 3 倍，不然會卡死）
// 開打 60 秒後每 10 秒攻擊 +25%：要打得夠快，而不是比誰撐得過三下
export const BOSS_MUL = 10, BOSS_ATK_MUL = 4, ENDLESS_BOSS_MUL = 3;
export const BOSS_FURY_AT = 60, BOSS_FURY_EVERY = 10, BOSS_FURY_MUL = 1.25;

// 每往後一章，敵人血量、攻擊各乘幾倍（3.0 前是 1.8，跳太大）
export const CHAPTER_GROWTH = 1.45;

export function diffScale(mult, wave) {
  const k = Math.min(1, 0.4 + 0.06 * (wave - 1));
  return 1 + (mult - 1) * k;
}

// ---------- 章節彈珠台 ----------
// rule：首頁與開場顯示的規則說明
// gates：基本倍率門每波隨機的數值範圍（mul = 乘法門，add = 加法門）
// 其餘欄位由 board.js 讀取：gravity、wind、blink、dodge、lava、cupSpeed …
export const BOARDS = [
  {
    key: 'plains', rule: '標準彈珠台，適合熟悉玩法',
    gravity: 950, gates: { mul: [2, 2, 2, 3], add: [2, 3, 3, 4] },
    pegs: grid([0.16, 0.24, 0.45, 0.52, 0.71, 0.78]),
  },
  {
    key: 'desert', rule: '沙塵暴：陣風會把小球吹偏；沙丘斜坡會改變路線',
    gravity: 950, gates: { mul: [2, 2, 3], add: [2, 3, 4, 5] }, wind: true,
    pegs: grid([0.16, 0.24], 46),
    walls: [
      // 中段兩側的沙丘：把球往中間集中
      [0.02, 0.43, 0.30, 0.53], [0.98, 0.43, 0.70, 0.53],
      // 下段中央的「人」字沙脊：把球分到左右兩邊
      [0.32, 0.79, 0.50, 0.70], [0.50, 0.70, 0.68, 0.79],
    ],
    extraPegs: [[0.12, 0.74], [0.88, 0.74], [0.5, 0.47]],
  },
  {
    key: 'grave', rule: '幽靈墓地：倍率門會忽隱忽現（隱形時無效）；黑洞會吞掉小球；敵人有 15% 閃避',
    gravity: 950, gates: { mul: [2, 3, 3], add: [3, 4, 5] }, blink: true, dodge: 0.15,
    pegs: clusters([[0.15, 0.18], [0.5, 0.2], [0.85, 0.18], [0.3, 0.48], [0.7, 0.48], [0.15, 0.74], [0.5, 0.76], [0.85, 0.74]]),
    holes: [[0.5, 0.48], [0.32, 0.75], [0.68, 0.75]],
  },
  {
    key: 'volcano', rule: '熔岩火山：彈跳石會把球彈飛；地板兩側的熔岩會燒掉小球；接球杯移動較快',
    gravity: 1000, gates: { mul: [2, 3, 4], add: [3, 5, 6] }, lava: 0.16, cupSpeed: 1.35,
    pegs: grid([0.16, 0.24, 0.71], 44),
    bumpers: [[0.2, 0.48, 13], [0.5, 0.5, 15], [0.8, 0.48, 13], [0.35, 0.78, 11], [0.65, 0.78, 11]],
  },
  {
    key: 'sky', rule: '天空神殿：低重力，小球飄得慢；左側傳送門會把球送回右上方再穿一次門',
    gravity: 560, gates: { mul: [2, 3, 3, 4], add: [4, 5, 6, 8] },
    pegs: [...arc(0.5, 0.15, 0.32, 0.06, 9), ...arc(0.5, 0.47, 0.36, 0.06, 11), ...arc(0.5, 0.73, 0.3, 0.06, 9)],
    portals: [[0.1, 0.5, 0.86, 0.12]], // 入口 x,y → 出口 x,y
  },
  // ---------- 3.9 新地區 ----------
  {
    key: 'snow', rule: '冰封凍原：冰風帶會把小球往旁邊吹；中間的晶釘會把球分裂成兩顆',
    gravity: 900, gates: { mul: [2, 3, 3, 4], add: [4, 5, 6, 7] },
    pegs: grid([0.16, 0.24, 0.52, 0.71, 0.78], 44),
    belts: [[0.45, 0.0, 0.5, 1], [0.45, 0.5, 1.0, -1]],
    splitPegs: [[0.5, 0.31], [0.3, 0.62], [0.7, 0.62]],
  },
  {
    key: 'swamp', rule: '毒沼密林：泥坑會吞掉小球；發光孢子（晶釘）會分裂小球；敵人有 10% 閃避',
    gravity: 950, gates: { mul: [2, 3, 4], add: [4, 6, 7] }, dodge: 0.1,
    pegs: clusters([[0.2, 0.18], [0.5, 0.16], [0.8, 0.18], [0.35, 0.47], [0.65, 0.47], [0.2, 0.75], [0.8, 0.75]]),
    holes: [[0.5, 0.5], [0.5, 0.78]],
    splitPegs: [[0.12, 0.3], [0.88, 0.3], [0.35, 0.68], [0.65, 0.68]],
  },
  {
    key: 'fort', rule: '機械要塞：齒輪輸送帶、彈簧；金色螺絲（金釘）撞到給 1 球幣；接球杯移動較快',
    gravity: 1000, gates: { mul: [3, 3, 4], add: [5, 6, 8] }, cupSpeed: 1.3,
    pegs: grid([0.16, 0.24, 0.71], 44),
    belts: [[0.5, 0.05, 0.45, 1], [0.56, 0.55, 0.95, -1]],
    bumpers: [[0.15, 0.82, 12], [0.85, 0.82, 12]],
    goldPegs: [[0.3, 0.42], [0.5, 0.4], [0.7, 0.42], [0.4, 0.8], [0.6, 0.8]],
  },
  {
    key: 'abyss', rule: '深淵魔域：倍率門忽隱忽現；黑洞吞球；傳送門把球送回上方；敵人有 15% 閃避',
    gravity: 980, gates: { mul: [3, 4, 4], add: [6, 8, 9] }, blink: true, dodge: 0.15,
    pegs: grid([0.16, 0.24, 0.5, 0.74], 42),
    holes: [[0.25, 0.62], [0.75, 0.62]],
    portals: [[0.5, 0.86, 0.5, 0.1]],
    goldPegs: [[0.15, 0.4], [0.85, 0.4]],
  },
  {
    key: 'astral', rule: '星界王座：低重力；星晶釘分裂小球；金色星釘給球幣；左側傳送門',
    gravity: 600, gates: { mul: [3, 4, 5], add: [6, 8, 10] },
    pegs: [...arc(0.5, 0.15, 0.32, 0.06, 9), ...arc(0.5, 0.5, 0.36, 0.06, 11), ...arc(0.5, 0.76, 0.3, 0.06, 9)],
    splitPegs: [[0.3, 0.32], [0.7, 0.32]],
    goldPegs: [[0.5, 0.33], [0.2, 0.64], [0.8, 0.64]],
    portals: [[0.08, 0.55, 0.9, 0.12]],
  },
];

// 章節 → 彈珠台（超過 10 章就循環）
export const boardOf = chapter => BOARDS[(chapter - 1) % BOARDS.length];

// ---------- 釘子排法產生器（回傳 [x, y] 比例座標） ----------
function grid(rows, spacingPx = 40) {
  const out = [];
  rows.forEach((y, i) => {
    const sp = spacingPx / 360;
    for (let x = 20 / 360 + (i % 2 ? sp / 2 : 0); x < 1 - 10 / 360; x += sp) out.push([x, y]);
  });
  return out;
}

// 一叢四顆排成菱形（像墓碑群）
function clusters(centers) {
  const out = [];
  for (const [cx, cy] of centers) {
    out.push([cx, cy - 0.025], [cx - 0.045, cy], [cx + 0.045, cy], [cx, cy + 0.025]);
  }
  return out;
}

// 一段往上拱的弧線
function arc(cx, cy, halfW, lift, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) * 2 - 1;
    out.push([cx + t * halfW, cy + t * t * lift]);
  }
  return out;
}
