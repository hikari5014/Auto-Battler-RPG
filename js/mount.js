// 坐騎系統（帳號共用）
// 用金幣買坐騎；騎著去冒險會累積經驗，也可以用金幣餵飼料升級。
// 等級上限 = 星數 x 10，滿了要「突破」升星（最多 3 星、30 級）。
// 坐騎有兩種能力：被動加成（跟等級成長），以及戰鬥中每隔幾秒自動施放的坐騎技能（跟星數成長）。
// 存在 save.mounts = { owned: { id: { lv, exp, star } }, ride: id }

export const MOUNTS = [
  {
    id: 'horse', name: '疾風馬', icon: 371, sprite: ['tc', 50], flip: true, color: '#e8b878', price: 600,
    stat: 'spd', per: 0.012, statName: '攻擊速度',
    skill: '衝刺', cd: 5, skillDesc: s => `撞擊最前面的敵人，造成 ${250 + s * 100}% 傷害並擊退`,
  },
  {
    id: 'wolf', name: '戰狼', icon: 374, sprite: ['tc', 24], color: '#b8c4dc', price: 1500,
    stat: 'crit', per: 0.004, statName: '暴擊率',
    skill: '狼嚎', cd: 7, skillDesc: s => `接下來 ${2 + s} 次攻擊必定暴擊`,
  },
  {
    id: 'bear', name: '巨熊', icon: 422, sprite: ['tc', 163], color: '#c98a55', price: 2500,
    stat: 'hp', per: 0.012, statName: '血量',
    skill: '熊吼', cd: 8, skillDesc: s => `擊暈所有敵人 ${(0.5 + s * 0.5).toFixed(1)} 秒，並獲得 ${5 + s * 5}% 血量的護盾`,
  },
  {
    id: 'bird', name: '金翼獅鷲', icon: 369, sprite: ['tc', 114], flip: true, color: '#ffd84a', price: 3500,
    stat: 'ball', per: 0.08, statName: '每殺一隻多掉球',
    skill: '金羽', cd: 7, skillDesc: s => `從天上灑下 ${4 + s * 4} 顆小球`,
  },
  {
    id: 'drake', name: '火龍', icon: 421, sprite: ['tc', 33], flip: true, color: '#ff6a3d', price: 6000,
    stat: 'atk', per: 0.012, statName: '攻擊力',
    skill: '火息', cd: 7, skillDesc: s => `噴火燒所有敵人，造成 ${80 + s * 60}% 傷害並燃燒`,
  },
];
export const mountById = id => MOUNTS.find(m => m.id === id);
export const MAX_STAR = 3;

// 飼料：按住可以一直餵
export const FEEDS = [
  { id: 'feed1', name: '一般飼料', gold: 60, exp: 25 },
  { id: 'feed2', name: '高級飼料', gold: 450, exp: 220 },
];

export function ensureMounts(save) {
  if (!save.mounts) save.mounts = { owned: {}, ride: null };
  return save.mounts;
}
export const mountState = (save, id) => ensureMounts(save).owned[id] || null;
export const expNeed = lv => 30 + lv * 15;
export const lvCap = star => star * 10;
export const breakCost = star => [0, 2500, 8000][star] || 0;

// 給經驗（等級到上限就停住，多的經驗保留在滿格）
export function addExp(st, exp) {
  st.exp += exp;
  let ups = 0;
  while (st.lv < lvCap(st.star) && st.exp >= expNeed(st.lv)) {
    st.exp -= expNeed(st.lv);
    st.lv++;
    ups++;
  }
  if (st.lv >= lvCap(st.star)) st.exp = Math.min(st.exp, expNeed(st.lv));
  return ups;
}
export const atCap = st => st.lv >= lvCap(st.star);

export function buyMount(save, id) {
  const m = mountById(id);
  const ms = ensureMounts(save);
  if (ms.owned[id] || save.gold < m.price) return false;
  save.gold -= m.price;
  ms.owned[id] = { lv: 1, exp: 0, star: 1 };
  ms.ride = id;
  return true;
}

export function feed(save, f) {
  const st = mountState(save, ensureMounts(save).ride);
  if (!st || atCap(st) || save.gold < f.gold) return -1;
  save.gold -= f.gold;
  return addExp(st, f.exp);
}

export function breakthrough(save) {
  const st = mountState(save, ensureMounts(save).ride);
  if (!st || !atCap(st) || st.star >= MAX_STAR || save.gold < breakCost(st.star)) return false;
  save.gold -= breakCost(st.star);
  st.star++;
  st.exp = 0;
  return true;
}

// 騎著冒險：每完成一波 +6 經驗
export function rideExp(save, waves) {
  const ms = ensureMounts(save);
  const st = ms.ride && ms.owned[ms.ride];
  if (!st || waves <= 0) return null;
  const exp = waves * 6;
  const ups = addExp(st, exp);
  return { m: mountById(ms.ride), exp, ups, st };
}

// 戰鬥用：目前騎的坐騎與它的加成
export function riding(save) {
  const ms = ensureMounts(save);
  const st = ms.ride && ms.owned[ms.ride];
  if (!st) return null;
  const m = mountById(ms.ride);
  return { ...m, lv: st.lv, star: st.star, maxed: isMaxMount(st), bonus: m.per * st.lv, cdNow: Math.max(4, m.cd - (st.star - 1)) };
}
export const statText = (m, lv) => m.stat === 'ball' ? `${m.statName} +${(m.per * lv).toFixed(1)}` : `${m.statName} +${(m.per * lv * 100).toFixed(1)}%`;

// 完全長大：3 星而且 30 級
export const isMaxMount = st => !!st && st.star >= MAX_STAR && st.lv >= lvCap(MAX_STAR);
