// 3.12 兩個新玩法（都是 10 波，第 10 波魔王）
// 杯中軍團：接到的球變成士兵，士兵自動攻擊並幫英雄擋傷害；英雄自己的攻擊力只剩 70%
// 彈珠射手：英雄不會自己攻擊；每隔一下掉一顆「砲彈球」，撞到越多釘子越痛，進杯子再加倍，落地時打最前面的敵人
// save.arcade = { army: { day, done, best }, shooter: { ... } }
import { todayKey } from './meta.js';
import { grant } from './economy.js';

export const ARCADE = {
  army: { name: '杯中軍團', desc: '接到的球變成士兵！士兵每 0.6 秒一起攻擊最前面的敵人，也會幫英雄擋下一部分傷害。英雄攻擊力只剩 70%。' },
  shooter: { name: '彈珠射手', desc: '英雄不會自己攻擊。每 0.7 秒掉一顆砲彈球：每撞一根釘子傷害 +25%，穿過倍率門會分身，進杯子再加倍，落下時打最前面的敵人。擊敗敵人直接給球幣。' },
};
export function armyRun() {
  return {
    mode: 'army', maxWave: 10, startCoins: 150, army: 0, modeHp: 0.85,
    stageOf: w => w + 5, bossWave: w => w === 10,
    init: run => { for (const h of run.heroes) h.baseAtk *= 0.7; },
    label: w => `杯中軍團 ${w}/10`,
  };
}
export function shooterRun() {
  return {
    mode: 'shooter', maxWave: 10, startCoins: 200, modeHp: 0.6, modeAtk: 0.75, hpOf: w => (w === 10 ? 0.35 : 0.6),
    stageOf: w => w + 5, bossWave: w => w === 10,
    init: run => { for (const h of run.heroes) h.noAuto = true; },
    label: w => `彈珠射手 ${w}/10`,
  };
}
// 士兵攻擊：人越多越痛（遞減）
export const armyHit = n => 0.05 * Math.pow(n, 0.8);
export function ensureArcade(save, id) {
  save.arcade = save.arcade || {};
  const a = save.arcade[id];
  if (!a || a.day !== todayKey()) save.arcade[id] = { day: todayKey(), done: false, best: (a && a.best) || 0 };
  return save.arcade[id];
}
// 每天第一次：每過一波 5 寶石（全破 50）
export function arcadeReward(save, id, cleared) {
  const a = ensureArcade(save, id);
  a.best = Math.max(a.best, cleared);
  if (a.done) return 0;
  a.done = true;
  const gem = cleared * 5;
  grant(save, { gem, stardust: Math.floor(gem / 2) });
  return gem;
}
