// 坐騎系統（帳號共用）
// 用金幣買坐騎；騎著去冒險會累積經驗，也可以用金幣餵飼料升級。
// 等級上限 = 星數 x 10，滿了要「突破」升星（最多 3 星、30 級）。
// 坐騎有兩種能力：被動加成（跟等級成長），以及戰鬥中每隔幾秒自動施放的坐騎技能（跟星數成長）。
// 3.18：馬、狼、獅鷲、火龍改成 3D 模型渲染的 8 格動畫（scale 大小、foot 腳底留白、seat 英雄坐的高度）
// 存在 save.mounts = { owned: { id: { lv, exp, star } }, ride: id }

export const MOUNTS = [
  {
    id: 'horse', name: '疾風馬', icon: 371, sprite: ['m3', 0], frames: 8, scale: 1.2, foot: 0.1, seat: 0.4, color: '#e8b878', price: 600,
    stat: 'spd', per: 0.012, statName: '攻擊速度',
    skill: '衝刺', cd: 5, skillDesc: s => `撞擊最前面的敵人，造成 ${250 + s * 100}% 傷害並擊退`,
  },
  {
    id: 'wolf', name: '戰狼', icon: 374, sprite: ['m3', 8], frames: 8, scale: 1.2, foot: 0.17, seat: 0.3, color: '#b8c4dc', price: 1500,
    stat: 'crit', per: 0.004, statName: '暴擊率',
    skill: '狼嚎', cd: 7, skillDesc: s => `接下來 ${2 + s} 次攻擊必定暴擊`,
  },
  {
    id: 'bear', name: '巨熊', icon: 422, sprite: ['tc', 163], color: '#c98a55', price: 2500,
    stat: 'hp', per: 0.012, statName: '血量',
    skill: '熊吼', cd: 8, skillDesc: s => `擊暈所有敵人 ${(0.5 + s * 0.5).toFixed(1)} 秒，並獲得 ${5 + s * 5}% 血量的護盾`,
  },
  {
    id: 'bird', name: '金翼獅鷲', icon: 369, sprite: ['m3', 16], frames: 8, iconFrame: 2, scale: 2.1, foot: 0.3, seat: 0.2, color: '#ffd84a', price: 3500,
    stat: 'ball', per: 0.08, statName: '每殺一隻多掉球',
    skill: '金羽', cd: 7, skillDesc: s => `從天上灑下 ${4 + s * 4} 顆小球`,
  },
  {
    id: 'drake', name: '火龍', icon: 421, sprite: ['m3', 24], frames: 8, scale: 1.3, foot: 0.05, seat: 0.42, color: '#ff6a3d', price: 6000,
    stat: 'atk', per: 0.012, statName: '攻擊力',
    skill: '火息', cd: 7, skillDesc: s => `噴火燒所有敵人，造成 ${80 + s * 60}% 傷害並燃燒`,
  },
  // 3.22 新坐騎：Quaternius 3D 動物（CC0）
  {
    id: 'zebra', name: '疾馳斑馬', icon: 371, sprite: ['m4', 0], frames: 8, scale: 1.2, foot: 0.1, seat: 0.4, color: '#e8e8f0', price: 1200,
    stat: 'spd', per: 0.01, statName: '攻擊速度',
    skill: '踐踏', cd: 6, skillDesc: s => `踩踏前面 3 個敵人，各造成 ${100 + s * 50}% 傷害並減速`,
  },
  {
    id: 'fox', name: '靈狐', icon: 374, sprite: ['m4', 8], frames: 8, scale: 1.25, foot: 0.12, seat: 0.3, color: '#ff8a3d', price: 3000,
    stat: 'crit', per: 0.003, statName: '暴擊率',
    skill: '狐火', cd: 6, skillDesc: s => `從嘴裡吐出 ${2 + s} 團狐火，各打一個敵人 ${120 + s * 40}% 傷害並燃燒`,
  },
  {
    id: 'llama', name: '羊駝', icon: 371, sprite: ['m4', 16], frames: 8, scale: 1.25, foot: 0.06, seat: 0.36, color: '#e8c89a', price: 2000,
    stat: 'hp', per: 0.01, statName: '血量',
    skill: '吐口水', cd: 5, skillDesc: s => `朝最前面的敵人吐口水，造成 ${150 + s * 70}% 傷害並擊暈 ${(0.4 + s * 0.3).toFixed(1)} 秒`,
  },
  {
    id: 'bull', name: '蠻牛', icon: 422, sprite: ['m4', 24], frames: 8, scale: 1.3, foot: 0.1, seat: 0.5, color: '#a0603a', price: 4500,
    stat: 'atk', per: 0.01, statName: '攻擊力',
    skill: '猛撞', cd: 7, skillDesc: s => `衝撞所有敵人，造成 ${120 + s * 60}% 傷害並擊退`,
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
