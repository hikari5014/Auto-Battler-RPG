// 天賦網 2.0（帳號共用）
// 形狀像蜘蛛網：中心往外 6 條主線，每條 4 圈。
// - 第 1 圈左右相連；相鄰兩條主線之間有「混合天賦」，同時加兩種能力，也是跨線的捷徑。
// - 最外圈之間是「核心天賦」：效果強但有代價，而且每兩顆只能選一顆。
// - 一條主線 4 格全部點滿 →「精通」獎勵自動生效。
// - 主線最外格點滿後，打開「無極」天賦：沒有等級上限，可以一直強化下去。
// 規則：只能點亮「旁邊已經點亮過」的格子；每點一點，所有一般天賦都會變貴 3%（無極天賦不算）。

const pct = v => Math.round(v * 1000) / 10 + '%';
const sgn = v => (v < 0 ? '' : '+');
const n2 = v => String(Math.round(v * 100) / 100);
// 每種能力怎麼寫成中文
const TXT = {
  atk: v => `攻擊力 ${sgn(v)}${pct(v)}`,
  spd: v => `攻擊速度 ${sgn(v)}${pct(v)}`,
  critDmg: v => `暴擊傷害 ${sgn(v)}${pct(v)}`,
  crit: v => `暴擊率 ${sgn(v)}${pct(v)}`,
  life: v => `吸血 ${sgn(v)}${pct(v)}`,
  bossDmg: v => `對菁英、魔王傷害 ${sgn(v)}${pct(v)}`,
  ball: v => `每殺一隻多掉 ${n2(v)} 顆球`,
  cupW: v => `接球杯寬度 ${sgn(v)}${pct(v)}`,
  gatePlus: v => `開局多 ${v} 道 +3 門`,
  coin: v => `開局球幣 +${Math.round(v)}`,
  gold: v => `結算金幣 ${sgn(v)}${pct(v)}`,
  price: v => `商店技能便宜 ${pct(v)}`,
  rerollDisc: v => `商店刷新便宜 ${pct(v)}`,
  reroll: v => `每波多 ${v} 次免費刷新`,
  luck: v => `高星技能出現率 ${sgn(v)}${pct(v)}`,
  hp: v => `血量 ${sgn(v)}${pct(v)}`,
  regen: v => `每波回血 ${sgn(v)}${pct(v)}`,
  block: v => `格擋率 ${sgn(v)}${pct(v)}`,
  dbl: v => `連擊機率 ${sgn(v)}${pct(v)}`,
  splash: v => `每次攻擊濺射全體 ${pct(v)}`,
  magnet: v => `接球杯吸球力 +${pct(v)}`,
  interest: v => `每波結束拿 ${pct(v)} 球幣利息`,
  skillDrop: v => `菁英、寶箱怪掉技能機率 +${pct(v)}`,
  dr: v => `受到的傷害 -${pct(v)}`,
  thorns: v => `被打時反彈 ${pct(v)} 傷害`,
  hits: v => `攻擊次數 +${v}`,
  cupMult: v => `接球杯倍率 +${n2(v)}`,
  startSkill: v => `每局開始免費獲得 ${v} 個隨機技能`,
  phoenix: () => '倒下時自動復活一次（50% 血）',
};
export const effText = (eff, lv = 1) => eff.map(([k, per]) => TXT[k](per * lv)).join('、');

// 6 條主線（從正上方順時針），每條 4 圈
const BRANCHES = [
  { id: 'A', name: '力量', color: '#ff6b6b', mastery: [['atk', 0.1]], inf: { name: '力量無極', icon: ['ic', 424, '#ff6b6b'], eff: [['atk', 0.01]] }, nodes: [
    { name: '攻擊強化', icon: ['ic', 424, '#ff6b6b'], max: 5, eff: [['atk', 0.06]] },
    { name: '迅捷', icon: ['ic', 1058, '#ff6b6b'], max: 4, eff: [['spd', 0.04]] },
    { name: '破甲', icon: ['ic', 576, '#ff6b6b'], max: 3, eff: [['critDmg', 0.15]] },
    { name: '連環斬', icon: ['ic', 569, '#ff6b6b'], max: 3, eff: [['dbl', 0.05]] },
  ] },
  { id: 'F', name: '精準', color: '#ff9f43', mastery: [['crit', 0.05]], inf: { name: '精準無極', icon: ['ic', 576, '#ff9f43'], eff: [['critDmg', 0.02]] }, nodes: [
    { name: '銳眼', icon: ['ic', 712, '#ff9f43'], max: 5, eff: [['crit', 0.02]] },
    { name: '吸血本能', icon: ['ic', 531, '#ff9f43'], max: 4, eff: [['life', 0.015]] },
    { name: '獵王者', icon: ['ic', 1023, '#ff9f43'], max: 3, eff: [['bossDmg', 0.1]] },
    { name: '餘波', icon: ['ic', 616, '#ff9f43'], max: 3, eff: [['splash', 0.05]] },
  ] },
  { id: 'D', name: '彈珠', color: '#36d6ff', mastery: [['ball', 1]], inf: { name: '彈珠無極', icon: ['ic', 237, '#36d6ff'], eff: [['ball', 0.05]] }, nodes: [
    { name: '多球', icon: ['ic', 237, '#36d6ff'], max: 5, eff: [['ball', 0.4]] },
    { name: '寬口杯', icon: ['ic', 192, '#36d6ff'], max: 4, eff: [['cupW', 0.05]] },
    { name: '開局分裂門', icon: ['ic', 1016, '#36d6ff'], max: 2, eff: [['gatePlus', 1]] },
    { name: '引力杯', icon: ['ic', 1018, '#36d6ff'], max: 3, eff: [['magnet', 0.15]] },
  ] },
  { id: 'C', name: '財富', color: '#ffd84a', mastery: [['gold', 0.1]], inf: { name: '財富無極', icon: ['pp', 67], eff: [['gold', 0.01]] }, nodes: [
    { name: '零用錢', icon: ['pp', 67], max: 5, eff: [['coin', 40]] },
    { name: '生意頭腦', icon: ['ic', 1057, '#ffd84a'], max: 4, eff: [['gold', 0.05]] },
    { name: '殺價高手', icon: ['ic', 630, '#ffd84a'], max: 3, eff: [['price', 0.04]] },
    { name: '複利', icon: ['ic', 1057, '#fff2a8'], max: 3, eff: [['interest', 0.02]] },
  ] },
  { id: 'E', name: '技能', color: '#d06bff', mastery: [['reroll', 1]], inf: { name: '技能無極', icon: ['ic', 569, '#d06bff'], eff: [['luck', 0.02]] }, nodes: [
    { name: '換貨', icon: ['ic', 1018, '#d06bff'], max: 5, eff: [['rerollDisc', 0.08]] },
    { name: '多看看', icon: ['ic', 1021, '#d06bff'], max: 2, eff: [['reroll', 1]] },
    { name: '好運', icon: ['ic', 569, '#d06bff'], max: 3, eff: [['luck', 0.2]] },
    { name: '戰利品', icon: ['ic', 237, '#d06bff'], max: 3, eff: [['skillDrop', 0.05]] },
  ] },
  { id: 'B', name: '生命', color: '#6dff8a', mastery: [['hp', 0.1]], inf: { name: '生命無極', icon: ['ic', 532, '#6dff8a'], eff: [['hp', 0.01]] }, nodes: [
    { name: '強身', icon: ['ic', 532, '#6dff8a'], max: 5, eff: [['hp', 0.06]] },
    { name: '恢復力', icon: ['ic', 669, '#6dff8a'], max: 4, eff: [['regen', 0.03]] },
    { name: '架盾', icon: ['ic', 233, '#6dff8a'], max: 3, eff: [['block', 0.03]] },
    { name: '鐵骨', icon: ['ic', 233, '#c0c8d8'], max: 3, eff: [['dr', 0.03]] },
  ] },
];

// 混合天賦：夾在第 i 條與第 i+1 條主線之間
const CROSS = [
  { name: '嗜血狂刃', icon: ['ic', 426, '#ff8a6b'], eff: [['atk', 0.03], ['life', 0.01]] },
  { name: '幸運一擊', icon: ['ic', 712, '#ffc36b'], eff: [['crit', 0.01], ['ball', 0.2]] },
  { name: '聚寶盆', icon: ['ic', 192, '#9fe3a0'], eff: [['ball', 0.2], ['coin', 20]] },
  { name: '精打細算', icon: ['ic', 630, '#e8a0ff'], eff: [['price', 0.02], ['rerollDisc', 0.05]] },
  { name: '冥想', icon: ['ic', 669, '#b0a0ff'], eff: [['regen', 0.02], ['luck', 0.05]] },
  { name: '刺甲', icon: ['ic', 184, '#c0ff8a'], eff: [['hp', 0.03], ['thorns', 0.1]] },
];

// 核心天賦：效果強，但有些有代價；兩兩一組只能選一個
const KEYSTONES = [
  { name: '狂戰之心', icon: ['ic', 426, '#ff6b6b'], eff: [['hits', 1], ['hp', -0.1]] },
  { name: '尋寶直覺', icon: ['ic', 237, '#ff9f43'], eff: [['skillDrop', 0.2], ['bossDmg', 0.15]] },
  { name: '黃金杯', icon: ['ic', 192, '#ffd84a'], eff: [['cupMult', 0.5], ['cupW', -0.1]] },
  { name: '開局禮包', icon: ['ic', 1057, '#d06bff'], eff: [['startSkill', 1], ['coin', 60]] },
  { name: '不死鳥', icon: ['ic', 531, '#ff5a5a'], eff: [['phoenix', 1], ['regen', -0.05]] },
  { name: '荊棘之軀', icon: ['ic', 184, '#6dff8a'], eff: [['thorns', 0.5], ['dr', 0.05]] },
];

const RING_R = [0.12, 0.205, 0.29, 0.37];
const RING_BASE = [50, 160, 420, 900];
const CROSS_BASE = 300, KEY_COST = 2400, INF_BASE = 1500;
const INFLATE = 0.03;

export const TALENTS = [];
export const LINKS = [];
const byId = {};
const at = (ang, r) => ({ x: 0.5 + Math.cos(ang) * r, y: 0.5 + Math.sin(ang) * r });
const angOf = i => -Math.PI / 2 + i * Math.PI / 3;
function add(n) { TALENTS.push(n); byId[n.id] = n; return n; }
add({ id: 'core', name: '起點', icon: ['ic', 1023, '#fff'], max: 1, x: 0.5, y: 0.5, color: '#fff', kind: 'core', eff: [] });
BRANCHES.forEach((b, i) => {
  b.nodes.forEach((n, r) => {
    add({ ...n, id: b.id + r, branch: b, ring: r, kind: 'node', color: b.color, base: RING_BASE[r], ...at(angOf(i), RING_R[r]) });
    LINKS.push([r ? b.id + (r - 1) : 'core', b.id + r]);
  });
  // 無極：在主線最外面，沒有上限
  add({ ...b.inf, id: b.id + 'I', branch: b, kind: 'inf', max: Infinity, color: b.color, base: INF_BASE, ...at(angOf(i), 0.465) });
  LINKS.push([b.id + '3', b.id + 'I']);
});
// 第 1 圈左右相連
BRANCHES.forEach((b, i) => LINKS.push([b.id + '0', BRANCHES[(i + 1) % 6].id + '0']));
CROSS.forEach((c, i) => {
  const a = BRANCHES[i], b = BRANCHES[(i + 1) % 6];
  add({ ...c, id: 'X' + i, kind: 'cross', max: 2, base: CROSS_BASE, color: '#e8e0ff', ...at(angOf(i + 0.5), 0.245) });
  LINKS.push([a.id + '1', 'X' + i], [b.id + '1', 'X' + i], [a.id + '2', 'X' + i], [b.id + '2', 'X' + i]);
});
KEYSTONES.forEach((k, i) => {
  const a = BRANCHES[i], b = BRANCHES[(i + 1) % 6];
  const pair = i % 2 ? i - 1 : i + 1;
  add({ ...k, id: 'K' + i, kind: 'key', max: 1, base: KEY_COST, color: '#fff2a8', excl: 'K' + pair, ...at(angOf(i + 0.5), 0.44) });
  LINKS.push([a.id + '3', 'K' + i], [b.id + '3', 'K' + i]);
});
export const talentById = id => byId[id];
export { BRANCHES };
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
const isInf = id => id.endsWith('I');
// 一般天賦點數（無極天賦不算，不然越點越貴會失控）
export const totalPoints = save => Object.entries(save.talents || {}).reduce((s, [k, v]) => s + (k === 'core' || isInf(k) ? 0 : v), 0);
export const infPoints = save => Object.entries(save.talents || {}).reduce((s, [k, v]) => s + (isInf(k) ? v : 0), 0);

export function talentCost(save, n) {
  const lv = tLv(save, n.id);
  if (n.kind === 'inf') return Math.round(n.base * Math.pow(1.12, lv)); // 無極：每級貴 12%
  return Math.round(n.base * Math.pow(1.5, lv) * (1 + INFLATE * totalPoints(save)));
}
export function canReach(save, n) {
  if (n.id === 'core') return true;
  if (n.kind === 'inf') return tLv(save, n.branch.id + '3') >= n.branch.nodes[3].max; // 外格要點滿
  return neighbors(n.id).some(id => tLv(save, id) > 0);
}
// 回傳不能升級的原因；可以升級回傳 ''
export function whyNot(save, n) {
  if (tLv(save, n.id) >= n.max) return '已經滿級';
  if (n.excl && tLv(save, n.excl) > 0) return `和「${byId[n.excl].name}」只能二選一（重置後可以改選）`;
  if (!canReach(save, n)) return n.kind === 'inf' ? `要先把「${n.branch.nodes[3].name}」點滿` : '要先點亮旁邊相連的天賦';
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

// 主線精通：4 格全部點滿
export const mastered = (save, b) => b.nodes.every((n, r) => tLv(save, b.id + r) >= n.max);

// 所有天賦加總後的效果（戰鬥開始時套用）
export function talentBonus(save) {
  const tb = { atk: 0, spd: 0, critDmg: 0, crit: 0, life: 0, bossDmg: 0, ball: 0, cupW: 0, gatePlus: 0, coin: 0, gold: 0, price: 0,
    rerollDisc: 0, reroll: 0, luck: 0, hp: 0, regen: 0, block: 0, hits: 0, skillDrop: 0, cupMult: 0, startSkill: 0, phoenix: 0, thorns: 0,
    dbl: 0, splash: 0, magnet: 0, interest: 0, dr: 0 };
  if (!save.talents) return tb;
  for (const n of TALENTS) {
    const lv = tLv(save, n.id);
    if (lv) for (const [k, per] of n.eff) tb[k] += per * lv;
  }
  for (const b of BRANCHES) if (mastered(save, b)) for (const [k, v] of b.mastery) tb[k] += v;
  // 便宜類有上限，避免變成免費
  tb.price = Math.min(0.6, tb.price);
  tb.rerollDisc = Math.min(0.8, tb.rerollDisc);
  return tb;
}
export const talentDesc = (save, n, lv = tLv(save, n.id)) => n.kind === 'core' ? '冒險的起點（已點亮）' : effText(n.eff, Math.max(1, lv));
// 加總後的效果，一行一行（給「總加成」看）
export function bonusLines(save) {
  const tb = talentBonus(save);
  return Object.entries(tb).filter(([, v]) => Math.abs(v) > 1e-9).map(([k, v]) => TXT[k](Math.round(v * 1000) / 1000));
}
