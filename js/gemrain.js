// 3.27 寶石彈雨（每日副本的特別關，每天 3 次）
// 參考「杯子英雄」：上面的杯子一直倒子彈，子彈穿過一道道倍率門越變越多，落到底下就射向殭屍群。
// - 英雄不會自己攻擊；每擊敗一隻殭屍 +3 子彈、+1 寶石碎片
// - 藍色「⇧」門把子彈送回頂端再穿一次所有的門；金色 x10 門會左右快速移動
// - 「🔒」大門：擊敗夠多隻才打開
// - 撐過 60 秒（或殭屍全滅）就過關；寶石 = 碎片的一半（每場最多 60）＋過關 15
// save.gemrain = { day, left, best }
import { todayKey } from './meta.js';
import { grant } from './economy.js';

// 可以調的數值：dmg 每發子彈傷害（x 英雄攻擊）、hp 殭屍起始血量倍率、grow 每秒血量成長
export const GR_TUNE = { dmg: 0.15, hp: 0.6, grow: 1.075 };
export const GR_TRIES = 3, GR_TIME = 60, GR_AMMO = 40, GR_CAP = 60, GR_WIN = 15;
// 彈珠台：釘子少一點，讓子彈好控制
export const GR_BOARD = {
  key: 'gemrain', rule: '寶石彈雨', gravity: 900, gates: { mul: [2], add: [3] },
  pegs: [[0.5, 0.06], [0.25, 0.37], [0.75, 0.37], [0.18, 0.56], [0.5, 0.58], [0.82, 0.56], [0.3, 0.92], [0.7, 0.92]],
};
// 門：[種類, 左邊位置(0~1), 高度(0~1), 移動速度, 寬度, 上鎖要擊敗幾隻]
export const GR_GATES = [
  ['x3', 0.28, 0.13, 0, 56], ['x2', 0.78, 0.15, 0, 64],
  ['x2', 0.04, 0.3, 0, 64], ['x5', 0.55, 0.29, 0, 48],
  ['x3', 0.16, 0.48, 0, 56], ['x2', 0.72, 0.47, 0, 64],
  ['x2', 0.42, 0.65, 0, 64],
  ['x10', 0.3, 0.82, 130, 42], ['up', 0.86, 0.8, 0, 50],
  ['x8', 0.04, 0.17, 0, 54, 25],
];
export const GR_CAP_BALLS = 200, GR_VCAP = 8; // 這關的球數上限、一顆球最多算 8 發
export function ensureGemrain(save) {
  if (!save.gemrain || save.gemrain.day !== todayKey()) save.gemrain = { day: todayKey(), left: GR_TRIES, best: (save.gemrain && save.gemrain.best) || 0 };
  return save.gemrain;
}
export function gemrainRun() {
  return {
    mode: 'gemrain', maxWave: 1, timer: GR_TIME, spawnGap: 0.22, modeHp: 0.6, modeAtk: 0.06, hpOf: () => 0.6, noCaptains: true,
    stageOf: () => 4, bossWave: () => false, enemyPool: ['zombie', 'zombie', 'skull', 'ghost'],
    init: run => { for (const h of run.heroes) h.noAuto = true; run.ammo = GR_AMMO; run.shards = 0; },
    label: () => '寶石彈雨',
  };
}
export const gemrainGems = (shards, win) => Math.min(GR_CAP, Math.floor(shards / 2)) + (win ? GR_WIN : 0);
export function gemrainReward(save, shards, win) {
  const g = ensureGemrain(save);
  const gem = gemrainGems(shards, win);
  g.best = Math.max(g.best, gem);
  if (gem) grant(save, { gem });
  return gem;
}
