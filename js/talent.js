// 天賦網（帳號共用）：取代舊的「金幣升級」
// 形狀像蜘蛛網：中心往外 6 條主線，每條 3 圈；同一圈的格子左右相連；
// 最外面兩條主線之間有一顆「核心天賦」，效果最強、只有 1 級。
// 規則：只能點亮「旁邊已經點亮過」的格子；每點一點，所有天賦都會稍微變貴。

// 6 條主線（從正上方順時針）
const BRANCHES = [
  { id: 'A', name: '力量', color: '#ff6b6b', nodes: [
    { stat: 'atk', name: '攻擊強化', icon: ['ic', 424, '#ff6b6b'], max: 5, per: 0.06, fmt: v => `攻擊力 +${pct(v)}` },
    { stat: 'spd', name: '迅捷', icon: ['ic', 1058, '#ff6b6b'], max: 4, per: 0.04, fmt: v => `攻擊速度 +${pct(v)}` },
    { stat: 'critDmg', name: '破甲', icon: ['ic', 576, '#ff6b6b'], max: 3, per: 0.15, fmt: v => `暴擊傷害 +${pct(v)}` },
  ] },
  { id: 'F', name: '精準', color: '#ff9f43', nodes: [
    { stat: 'crit', name: '銳眼', icon: ['ic', 712, '#ff9f43'], max: 5, per: 0.02, fmt: v => `暴擊率 +${pct(v)}` },
    { stat: 'life', name: '吸血本能', icon: ['ic', 531, '#ff9f43'], max: 4, per: 0.015, fmt: v => `吸血 +${pct(v)}` },
    { stat: 'bossDmg', name: '獵王者', icon: ['ic', 1023, '#ff9f43'], max: 3, per: 0.1, fmt: v => `對魔王、菁英、隊長傷害 +${pct(v)}` },
  ] },
  { id: 'D', name: '彈珠', color: '#36d6ff', nodes: [
    { stat: 'ball', name: '多球', icon: ['ic', 237, '#36d6ff'], max: 5, per: 0.4, fmt: v => `每殺一隻多掉 ${v.toFixed(1)} 顆球` },
    { stat: 'cupW', name: '寬口杯', icon: ['ic', 192, '#36d6ff'], max: 4, per: 0.05, fmt: v => `接球杯變寬 ${pct(v)}` },
    { stat: 'gatePlus', name: '開局分裂門', icon: ['ic', 1016, '#36d6ff'], max: 2, per: 1, fmt: v => `每局開始多 ${v} 道 +3 門` },
  ] },
  { id: 'C', name: '財富', color: '#ffd84a', nodes: [
    { stat: 'coin', name: '零用錢', icon: ['pp', 67], max: 5, per: 40, fmt: v => `開局多 ${v} 球幣` },
    { stat: 'gold', name: '生意頭腦', icon: ['ic', 1057, '#ffd84a'], max: 4, per: 0.05, fmt: v => `結算金幣 +${pct(v)}` },
    { stat: 'price', name: '殺價高手', icon: ['ic', 630, '#ffd84a'], max: 3, per: 0.04, fmt: v => `商店技能便宜 ${pct(v)}` },
  ] },
  { id: 'E', name: '技能', color: '#d06bff', nodes: [
    { stat: 'rerollDisc', name: '換貨', icon: ['ic', 1018, '#d06bff'], max: 5, per: 0.08, fmt: v => `商店刷新便宜 ${pct(v)}` },
    { stat: 'reroll', name: '多看看', icon: ['ic', 1021, '#d06bff'], max: 2, per: 1, fmt: v => `每波多 ${v} 次免費刷新` },
    { stat: 'luck', name: '好運', icon: ['ic', 569, '#d06bff'], max: 3, per: 0.2, fmt: v => `高星技能出現率 +${pct(v)}` },
  ] },
  { id: 'B', name: '生命', color: '#6dff8a', nodes: [
    { stat: 'hp', name: '強身', icon: ['ic', 532, '#6dff8a'], max: 5, per: 0.06, fmt: v => `血量 +${pct(v)}` },
    { stat: 'regen', name: '恢復力', icon: ['ic', 669, '#6dff8a'], max: 4, per: 0.03, fmt: v => `每波開始多回 ${pct(v)} 血` },
    { stat: 'block', name: '架盾', icon: ['ic', 233, '#6dff8a'], max: 3, per: 0.03, fmt: v => `格擋率 +${pct(v)}` },
  ] },
];

// 核心天賦：夾在兩條主線中間（第 i 條和第 i+1 條）
const KEYSTONES = [
  { stat: 'hits', name: '狂戰之心', icon: ['ic', 426, '#ff6b6b'], per: 1, fmt: () => '攻擊次數 +1' },
  { stat: 'skillDrop', name: '尋寶直覺', icon: ['ic', 237, '#ff9f43'], per: 0.2, fmt: () => '菁英、寶箱怪掉技能機率 +20%' },
  { stat: 'cupMult', name: '黃金杯', icon: ['ic', 192, '#ffd84a'], per: 0.5, fmt: () => '接球杯倍率 x2 → x2.5' },
  { stat: 'startSkill', name: '開局禮包', icon: ['ic', 1057, '#d06bff'], per: 1, fmt: () => '每局開始免費獲得 1 個隨機技能' },
  { stat: 'phoenix', name: '不死鳥', icon: ['ic', 531, '#ff5a5a'], per: 1, fmt: () => '倒下時自動復活一次（50% 血）' },
  { stat: 'thorns', name: '荊棘之軀', icon: ['ic', 184, '#6dff8a'], per: 0.5, fmt: () => '被打時反彈 50% 傷害' },
];

const pct = v => Math.round(v * 1000) / 10 + '%';
const RING_R = [0.155, 0.28, 0.4];
const RING_BASE = [50, 160, 420];
const KEY_COST = 2400;

// 建出所有格子與連線
export const TALENTS = [];
export const LINKS = [];
const byId = {};
function add(n) { TALENTS.push(n); byId[n.id] = n; return n; }
add({ id: 'core', name: '起點', icon: ['ic', 1023, '#fff'], max: 1, x: 0.5, y: 0.5, color: '#fff', ring: -1, fmt: () => '冒險的起點（已點亮）' });
BRANCHES.forEach((b, i) => {
  const ang = -Math.PI / 2 + i * Math.PI / 3;
  b.nodes.forEach((n, r) => {
    add({ ...n, id: b.id + r, branch: b, ring: r, color: b.color, base: RING_BASE[r],
      x: 0.5 + Math.cos(ang) * RING_R[r], y: 0.5 + Math.sin(ang) * RING_R[r] });
    LINKS.push([r ? b.id + (r - 1) : 'core', b.id + r]);
  });
});
// 第 1、2 圈左右相連（蜘蛛網的橫線）
for (let r = 0; r < 2; r++) BRANCHES.forEach((b, i) => LINKS.push([b.id + r, BRANCHES[(i + 1) % 6].id + r]));
KEYSTONES.forEach((k, i) => {
  const ang = -Math.PI / 2 + (i + 0.5) * Math.PI / 3;
  const a = BRANCHES[i], b = BRANCHES[(i + 1) % 6];
  add({ ...k, id: 'K' + i, key: true, max: 1, ring: 3, base: KEY_COST, color: '#fff2a8',
    x: 0.5 + Math.cos(ang) * 0.465, y: 0.5 + Math.sin(ang) * 0.465 });
  LINKS.push([a.id + 2, 'K' + i], [b.id + 2, 'K' + i]);
});
export const talentById = id => byId[id];
const neighbors = id => LINKS.filter(l => l.includes(id)).map(l => l[0] === id ? l[1] : l[0]);

// ---------- 存檔 ----------
// 舊的金幣升級（攻擊／血量／開局球幣）全部退回金幣
const oldCost = lv => Math.round(60 * Math.pow(1.55, lv));
export function ensureTalents(save) {
  if (!save.talents) {
    save.talents = { core: 1 };
    let refund = 0;
    for (const k of ['atk', 'hp', 'coin']) for (let i = 0; i < ((save.up && save.up[k]) || 0); i++) refund += oldCost(i);
    if (refund) { save.gold += refund; save.talentRefund = refund; }
    save.up = { atk: 0, hp: 0, coin: 0 };
  }
  return save.talents;
}
export const tLv = (save, id) => (save.talents && save.talents[id]) || 0;
export const totalPoints = save => Object.entries(save.talents || {}).reduce((s, [k, v]) => s + (k === 'core' ? 0 : v), 0);

// 價格：格子本身越高級越貴；而且全部已點的點數越多，所有天賦都越貴（要好好選路線）
export function talentCost(save, n) {
  return Math.round(n.base * Math.pow(1.5, tLv(save, n.id)) * (1 + 0.04 * totalPoints(save)));
}
export function canReach(save, n) {
  return n.id === 'core' || neighbors(n.id).some(id => tLv(save, id) > 0);
}
// 回傳不能升級的原因；可以升級回傳 ''
export function whyNot(save, n) {
  if (tLv(save, n.id) >= n.max) return '已經滿級';
  if (!canReach(save, n)) return '要先點亮旁邊相連的天賦';
  const c = talentCost(save, n);
  if (save.gold < c) return `金幣不足，還差 ${c - save.gold}`;
  return '';
}
export function buyTalent(save, n) {
  if (whyNot(save, n)) return false;
  const c = talentCost(save, n);
  save.gold -= c;
  save.talentSpent = (save.talentSpent || 0) + c;
  save.talents[n.id] = tLv(save, n.id) + 1;
  return true;
}
// 重置：退回全部花費（買的時候有記下花了多少）
export function resetTalents(save) {
  const g = save.talentSpent || 0;
  save.gold += g;
  save.talentSpent = 0;
  save.talents = { core: 1 };
  return g;
}

// 所有天賦加總後的效果（戰鬥開始時套用）
export function talentBonus(save) {
  const tb = { atk: 0, spd: 0, critDmg: 0, crit: 0, life: 0, bossDmg: 0, ball: 0, cupW: 0, gatePlus: 0, coin: 0, gold: 0, price: 0,
    rerollDisc: 0, reroll: 0, luck: 0, hp: 0, regen: 0, block: 0, hits: 0, skillDrop: 0, cupMult: 0, startSkill: 0, phoenix: 0, thorns: 0 };
  if (!save.talents) return tb;
  for (const n of TALENTS) if (n.stat) tb[n.stat] += n.per * tLv(save, n.id);
  return tb;
}
export const talentDesc = (save, n, lv = tLv(save, n.id)) => n.fmt(n.per ? n.per * Math.max(1, lv) : 0);
