// 每個章節的彈珠台、特殊規則，以及難度設定
// 座標用「比例」：x 是 0~1（左到右），y 是 0~1（彈珠台頂到底）
// 倍率門固定在 y = 0.35 與 0.60 兩排，接球杯在 0.84 以下，機關要避開這些高度

// ---------- 難度 ----------
// hp / atk：敵人血量、攻擊力倍率；count：每波多幾隻；price：技能卡價格倍率
// gold：結算金幣倍率；traps：彈珠台上多幾道紅色陷阱門（x0.5）
export const DIFFICULTIES = [
  { id: 'casual', name: '休閒', hp: 1, atk: 1, count: 0, price: 1, gold: 1, traps: 0, color: '#8dff9f' },
  { id: 'easy', name: '簡單', hp: 1.35, atk: 1.25, count: 0, price: 1.1, gold: 1.3, traps: 0, color: '#9fe3ff' },
  { id: 'normal', name: '中級', hp: 1.9, atk: 1.6, count: 1, price: 1.2, gold: 1.7, traps: 0, color: '#ffd84a' },
  { id: 'hard', name: '挑戰', hp: 2.6, atk: 2.0, count: 1, price: 1.35, gold: 2.3, traps: 0, color: '#ff9f43' },
  { id: 'hell', name: '地獄', hp: 3.8, atk: 2.8, count: 2, price: 1.5, gold: 3.2, traps: 1, color: '#ff5a5a' },
  { id: 'nightmare', name: '無解', hp: 6, atk: 4, count: 3, price: 1.7, gold: 5, traps: 2, color: '#d06bff' },
];
export const difficultyOf = id => DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES[0];

// 難度不是一開始就全開：第 1 波約 40% 強度，到第 11 波才是完整強度
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
];

// 章節 → 彈珠台（超過 5 章就循環）
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
