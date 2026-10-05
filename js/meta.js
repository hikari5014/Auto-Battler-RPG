// 局外系統：統計、成就、每日挑戰
// 統計存在 save.stats，成就領取紀錄在 save.claimed，每日挑戰在 save.daily

export function ensureMeta(save) {
  save.stats = Object.assign({
    runs: 0, wins: 0, kills: 0, bosses: 0, elites: 0, coins: 0,
    maxed: 0, events: 0, merged: 0, legendMerged: 0, dailyWins: 0,
    hardWin: 0, hellWin: 0, bestWave: 0,
  }, save.stats || {});
  save.claimed = save.claimed || [];
  save.daily = save.daily || { date: '', done: false };
  return save.stats;
}

// ---------- 成就 ----------
// get(save) = 目前進度；goal = 目標；gold = 領取獎勵
export const ACHIEVEMENTS = [
  { id: 'kill1', name: '初次見血', desc: '擊敗 1 隻怪物', get: s => s.stats.kills, goal: 1, gold: 50 },
  { id: 'kill500', name: '狩獵者', desc: '累計擊敗 500 隻怪物', get: s => s.stats.kills, goal: 500, gold: 300 },
  { id: 'kill3000', name: '屠戮者', desc: '累計擊敗 3000 隻怪物', get: s => s.stats.kills, goal: 3000, gold: 1000 },
  { id: 'elite50', name: '菁英獵人', desc: '擊敗 50 隻菁英、隊長或寶箱怪', get: s => s.stats.elites, goal: 50, gold: 300 },
  { id: 'boss1', name: '屠龍第一步', desc: '打倒第一隻魔王', get: s => s.stats.bosses, goal: 1, gold: 200 },
  { id: 'boss10', name: '魔王剋星', desc: '累計打倒 10 隻魔王', get: s => s.stats.bosses, goal: 10, gold: 800 },
  { id: 'win1', name: '初次通關', desc: '通關任一章節', get: s => s.stats.wins, goal: 1, gold: 150 },
  { id: 'ch3', name: '踏入墓地', desc: '解鎖第 3 章', get: s => s.maxChapter, goal: 3, gold: 300 },
  { id: 'ch5', name: '登上天空', desc: '解鎖第 5 章', get: s => s.maxChapter, goal: 5, gold: 600 },
  { id: 'hard', name: '不服輸', desc: '在「挑戰」以上難度通關', get: s => s.stats.hardWin, goal: 1, gold: 800 },
  { id: 'hell', name: '地獄歸來', desc: '在「地獄」以上難度通關', get: s => s.stats.hellWin, goal: 1, gold: 1500 },
  { id: 'max1', name: '專精', desc: '讓 1 個技能升到滿級', get: s => s.stats.maxed, goal: 1, gold: 100 },
  { id: 'max20', name: '大師', desc: '累計 20 次技能滿級', get: s => s.stats.maxed, goal: 20, gold: 500 },
  { id: 'rich', name: '球幣大亨', desc: '累計接到 100,000 球幣', get: s => s.stats.coins, goal: 100000, gold: 400 },
  { id: 'event20', name: '冒險家', desc: '經歷 20 次奇遇事件', get: s => s.stats.events, goal: 20, gold: 300 },
  { id: 'legend', name: '傳說鍛造師', desc: '合成出一件傳說裝備', get: s => s.stats.legendMerged, goal: 1, gold: 1000 },
  { id: 'heroes', name: '全員集合', desc: '解鎖全部 4 位英雄', get: s => s.owned.length, goal: 4, gold: 500 },
  { id: 'daily3', name: '每日之星', desc: '完成 3 次每日挑戰', get: s => s.stats.dailyWins, goal: 3, gold: 600 },
];

export const achDone = (save, a) => a.get(save) >= a.goal;
export const achClaimable = save => ACHIEVEMENTS.filter(a => achDone(save, a) && !save.claimed.includes(a.id));

// ---------- 每日挑戰 ----------
// 依日期產生固定的亂數：同一天大家（同一台手機）都是同一組規則
export const MODS = {
  speedy: { name: '疾風敵軍', desc: '敵人移動與攻擊速度 x1.5' },
  glass: { name: '玻璃大砲', desc: '英雄攻擊 x1.6，但血量 x0.6' },
  rich: { name: '黃金雨', desc: '接到的球幣 x1.5' },
  mulOnly: { name: '純乘法', desc: '基本倍率門全部變成乘法門' },
  tanky: { name: '鋼鐵軍團', desc: '敵人血量 x1.4，但掉球 x1.5' },
  noHeal: { name: '無休止', desc: '每波之間不會回血' },
  elites: { name: '菁英之夜', desc: '菁英出現機率 x3' },
  giant: { name: '巨獸', desc: '魔王血量 x2' },
};

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function seeded(seedStr) {
  let h = 2166136261;
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// 今天的挑戰：章節（從已解鎖的章節挑）＋兩個特殊規則
export function todayChallenge(save) {
  const rnd = seeded(todayKey());
  const keys = Object.keys(MODS);
  const a = keys.splice(Math.floor(rnd() * keys.length), 1)[0];
  const b = keys[Math.floor(rnd() * keys.length)];
  const chapter = 1 + Math.floor(rnd() * Math.min(5, save.maxChapter));
  return { date: todayKey(), chapter, mods: [a, b] };
}

export const dailyDone = save => save.daily.date === todayKey() && save.daily.done;
export const dailyReward = ch => 300 * ch.chapter;
