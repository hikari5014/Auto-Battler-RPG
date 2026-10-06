// 3.10 遠征：12 波的冒險，每打完一波選一條路（戰鬥、精英、營火、寶箱、商店），沿路收集「遺物」
// 3.10 彈珠謎題：沒有敵人，只有固定的彈珠台與幾顆球，瞄準拿到目標分數（1～3 星）
// save.expedition = { day, done, best }   每天第一次遠征給寶石
// save.puzzles = { 1: 3, 2: 1, ... }       每關最多幾星
import { todayKey } from './meta.js';
import { grant } from './economy.js';

// ---------- 遺物 ----------
// apply(h) 套在每位出戰英雄身上；run(run, board) 改這一局的規則
export const RELICS = [
  { id: 'fang', name: '吸血牙', icon: ['ic', 576, '#ff5a5a'], desc: '吸血 +5%', apply: h => { h.life += 0.05; } },
  { id: 'whet', name: '磨刀石', icon: ['ic', 424, '#cfd8ff'], desc: '攻擊力 +15%', apply: h => { h.baseAtk *= 1.15; } },
  { id: 'wall', name: '鐵壁', icon: ['ic', 233, '#c0c8d8'], desc: '受到的傷害 -8%', apply: h => { h.dr = Math.min(0.6, h.dr + 0.08); } },
  { id: 'egg', name: '金蛋', icon: ['it', 4], desc: '每波開始 +30 球幣', run: r => { r.relicCoins = (r.relicCoins || 0) + 30; } },
  { id: 'flag', name: '狂戰旗', icon: ['ic', 1023, '#ff8a6b'], desc: '攻擊次數 +1', apply: h => { h.hits += 1; } },
  { id: 'feather', name: '疾風羽', icon: ['it', 10], desc: '攻擊速度 +15%', apply: h => { h.spdMul += 0.15; } },
  { id: 'grail', name: '聖杯', icon: ['ic', 630, '#ffd84a'], desc: '每波回血 +10%', apply: h => { h.regen += 0.1; } },
  { id: 'astro', name: '星盤', icon: ['ic', 712, '#c8b6ff'], desc: '暴擊率 +10%', apply: h => { h.crit += 0.1; } },
  { id: 'tome', name: '魔導書', icon: ['it', 6], desc: '每次攻擊濺射 +15%', apply: h => { h.splash += 0.15; } },
  { id: 'core', name: '火焰核心', icon: ['ic', 616, '#ff7a3b'], desc: '擊殺時爆炸打全體（20%）', apply: h => { h.killBlast += 0.2; } },
  { id: 'magnet', name: '磁石', icon: ['ic', 233, '#ff5a5a'], desc: '杯子吸球 +30%', apply: h => { h.magnet += 0.3; } },
  { id: 'dice', name: '賭徒骰子', icon: ['ic', 1057, '#ffd84a'], desc: '接球杯倍率 +0.5', run: (r, b) => { b.cupMult += 0.5; } },
  { id: 'ration', name: '兵糧', icon: ['ic', 630, '#8dff9f'], desc: '血量 +20%', apply: h => { h.maxHp *= 1.2; h.hp = Math.min(h.maxHp, h.hp * 1.2); } },
  { id: 'mirror', name: '鏡盾', icon: ['ic', 233, '#9fe3ff'], desc: '被打時反彈 60% 傷害', apply: h => { h.thorns += 0.6; } },
  { id: 'sand', name: '時之沙', icon: ['it', 7], desc: '技能商店 -15%', run: r => { r.relicDisc = (r.relicDisc || 1) * 0.85; } },
  { id: 'crown', name: '征服者王冠', icon: ['ic', 1023, '#ffd84a'], desc: '對菁英、魔王傷害 +30%', apply: h => { h.bossDmg = Math.min(1.5, h.bossDmg + 0.3); } },
  { id: 'vial', name: '毒瓶', icon: ['ic', 616, '#7dff5a'], desc: '攻擊讓敵人中毒（每秒 20%）', apply: h => { h.dot += 0.2; } },
  { id: 'plume', name: '鳳凰羽', icon: ['it', 10], desc: '倒下時復活一次（50% 血）', apply: h => { h.phoenix = true; } },
];
export const relicById = id => RELICS.find(r => r.id === id);
export function pickRelics(run, n = 3) {
  const have = new Set(run.relics || []);
  const pool = RELICS.filter(r => !have.has(r.id));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
export function gainRelic(run, board, id) {
  const r = relicById(id);
  run.relics = run.relics || [];
  run.relics.push(id);
  if (r.apply) for (const h of run.heroes) r.apply(h);
  if (r.run) r.run(run, board);
  return r;
}

// ---------- 路線 ----------
export const NODES = {
  fight: { name: '戰鬥', icon: ['ic', 424, '#ff8a6b'], desc: '普通的一波，結束後多 60 球幣' },
  elite: { name: '精英', icon: ['ic', 1023, '#ff5a5a'], desc: '下一波都是精英；打贏選一個遺物' },
  rest: { name: '營火', icon: ['ic', 616, '#ffb347'], desc: '全員回復 40% 血量' },
  chest: { name: '寶箱', icon: ['it', 4], desc: '馬上選一個遺物' },
  shop: { name: '商人', icon: ['it', 7], desc: '這次商店技能 6 折' },
};
export function rollRoute(run) {
  const keys = Object.keys(NODES);
  const out = [];
  while (out.length < 3) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    if (!out.includes(k)) out.push(k);
  }
  // 快到魔王前一定有營火可以選
  if (run.wave === run.maxWave - 1 && !out.includes('rest')) out[2] = 'rest';
  return out;
}
export function expeditionRun() {
  return {
    mode: 'expedition', maxWave: 12, startCoins: 200, relics: [], modeHp: 1.15,
    stageOf: w => w + 3, bossWave: w => w === 12,
    label: w => `遠征 ${w}/12`,
  };
}
export function ensureExp(save) {
  if (!save.expedition || save.expedition.day !== todayKey()) save.expedition = { day: todayKey(), done: false, best: (save.expedition && save.expedition.best) || 0 };
  return save.expedition;
}
// 每天第一次：每過一波 8 寶石（全破 96）＋一半的星塵
export function expReward(save, cleared) {
  const e = ensureExp(save);
  e.best = Math.max(e.best, cleared);
  if (e.done) return 0;
  e.done = true;
  const gem = cleared * 8;
  grant(save, { gem, stardust: Math.floor(gem / 2) });
  return gem;
}

// ---------- 彈珠謎題 ----------
// gates：[種類, 排(0 上/1 下), x 位置(0～1), 移動速度]；traps 一樣格式
// 目標分數照「好好瞄準」的機器人實測校正
export const PUZZLES = [
  { name: '第一道門', ch: 1, balls: 8, gates: [['x2', 0, 0.4, 0], ['+3', 1, 0.4, 0]], goal: [25, 40, 60] },
  { name: '左右開弓', ch: 1, balls: 8, gates: [['x2', 0, 0.1, 0], ['x2', 0, 0.7, 0], ['+3', 1, 0.42, 0]], goal: [25, 45, 65] },
  { name: '會動的門', ch: 1, balls: 10, gates: [['x3', 0, 0.3, 40], ['+3', 1, 0.5, 0]], goal: [40, 65, 100] },
  { name: '沙丘', ch: 2, balls: 10, gates: [['x2', 0, 0.5, 0], ['+5', 1, 0.2, 0]], goal: [40, 65, 100] },
  { name: '小心陷阱', ch: 1, balls: 10, gates: [['x3', 0, 0.45, 0], ['+4', 1, 0.45, 0]], traps: [['x0.5', 1, 0.05, 0], ['x0.5', 0, 0.75, 0]], goal: [55, 90, 135] },
  { name: '黑洞墓園', ch: 3, balls: 12, gates: [['x2', 0, 0.35, 30], ['+4', 1, 0.6, 0]], goal: [45, 75, 115] },
  { name: '彈跳石', ch: 4, balls: 12, gates: [['x3', 0, 0.4, 0], ['+5', 1, 0.3, 45]], goal: [50, 85, 130] },
  { name: '天空傳送', ch: 5, balls: 12, gates: [['x2', 0, 0.6, 0], ['x2', 1, 0.2, 0], ['+4', 1, 0.6, 0]], goal: [35, 55, 85] },
  { name: '冰風帶', ch: 6, balls: 12, gates: [['x3', 0, 0.3, 35], ['+5', 1, 0.55, 0]], goal: [60, 95, 145] },
  { name: '孢子分裂', ch: 7, balls: 12, gates: [['x2', 0, 0.4, 0], ['+6', 1, 0.4, 30]], goal: [55, 90, 135] },
  { name: '齒輪工廠', ch: 8, balls: 14, gates: [['x3', 0, 0.45, 40], ['+5', 1, 0.2, 40]], traps: [['x0.5', 1, 0.7, 30]], goal: [65, 110, 165] },
  { name: '星界試煉', ch: 10, balls: 14, gates: [['x4', 0, 0.4, 35], ['+6', 1, 0.5, 35]], traps: [['x0.5', 0, 0.05, 40]], goal: [80, 130, 200] },
];
export const puzzleStars = (p, score) => p.goal.filter(g => score >= g).length;
export function puzzleRun(i) {
  const p = PUZZLES[i];
  return { mode: 'puzzle', puzzle: i, noFight: true, maxWave: 1, label: () => `謎題 ${i + 1}・${p.name}`, slowPour: true };
}
// 拿到新的星星：每顆 10 寶石
export function puzzleReward(save, i, stars) {
  save.puzzles = save.puzzles || {};
  const before = save.puzzles[i] || 0;
  if (stars <= before) return 0;
  save.puzzles[i] = stars;
  const gem = (stars - before) * 10;
  grant(save, { gem });
  return gem;
}
export const puzzleOpen = (save, i) => i === 0 || ((save.puzzles || {})[i - 1] || 0) >= 1;
