// 3.13 活動模式：每週跟著限時活動輪流開放一種
// 豐收祭 → 球池派對、魔王狩獵週 → 倖存者、星之祭典 → 塔防
// save.evmode = { day, done, best: { pit, survivor, td } }
import { todayKey } from './meta.js';
import { grant } from './economy.js';
import { currentEvent, eventTokens } from './live.js';

export const EVENT_MODES = {
  pit: {
    name: '球池派對', event: 'harvest',
    desc: '8 波。擊敗敵人掉 3 倍的球，杯子變大、接球倍率 +1；身上每 100 球幣攻擊力 +2%（最多 +100%）。技能比較貴。',
  },
  survivor: {
    name: '倖存者', event: 'hunt',
    desc: '撐過 150 秒！敵人會一直湧上來而且越來越強，每 25 秒自動獲得一個技能。擊敗越多分數越高。',
  },
  td: {
    name: '塔防', event: 'starfest',
    desc: '10 波，每波敵人更多。英雄變成城堡（血量 x2.5、不會回血、攻擊力 60%，開場 2 座砲塔），每接到 150 球幣自動蓋一座砲塔（最多 8 座）。',
  },
};
export const currentMode = () => Object.keys(EVENT_MODES).find(k => EVENT_MODES[k].event === currentEvent().id);

export function pitRun() {
  return {
    mode: 'pit', maxWave: 8, startCoins: 100, priceMul: 1.8,
    stageOf: w => Math.min(15, w * 2 - 1), bossWave: w => w === 8,
    init: (run, board) => {
      for (const h of run.heroes) { h.ballsPerKill *= 3; h.coinAtk = Math.max(h.coinAtk, 0.02); h.coinCap = Math.max(h.coinCap, 1); }
      board.cupW = Math.min(240, board.cupW * 1.5);
      board.cupMult += 1;
    },
    label: w => `球池派對 ${w}/8`,
  };
}
export function survivorRun() {
  return {
    mode: 'survivor', maxWave: 1, startCoins: 350, preShop: true, timer: 150, svModeHp: 0.35, modeHp: 0.35, modeAtk: 0.55,
    stageOf: () => 6, bossWave: () => false,
    label: () => '倖存者',
  };
}
export function tdRun() {
  return {
    mode: 'td', maxWave: 10, startCoins: 300, preShop: true, extraCount: 4, tdCoins: 0, modeHp: 0.9,
    stageOf: w => w + 5, bossWave: w => w === 10,
    init: run => {
      for (const h of run.heroes) { h.maxHp *= 2.5; h.hp = h.maxHp; h.baseAtk *= 0.6; h.regen = 0; h.life = 0; h.turrets = Math.max(h.turrets, 2); h.turretMul = Math.max(h.turretMul, 0.5); }
    },
    label: w => `塔防 ${w}/10`,
  };
}
export const runOf = id => (id === 'pit' ? pitRun() : id === 'survivor' ? survivorRun() : tdRun());

export function ensureEvMode(save) {
  if (!save.evmode || save.evmode.day !== todayKey()) save.evmode = { day: todayKey(), done: false, best: (save.evmode && save.evmode.best) || {} };
  return save.evmode;
}
// 結算：活動代幣（照表現）＋每天第一次寶石
export function evModeReward(save, id, score, win) {
  const e = ensureEvMode(save);
  e.best[id] = Math.max(e.best[id] || 0, score);
  const tok = eventTokens(save, id === 'survivor' ? Math.floor(score / 4) : score * 3);
  let gem = 0;
  if (!e.done && (win || score >= (id === 'survivor' ? 40 : 5))) { e.done = true; gem = 40; grant(save, { gem, stardust: 20 }); }
  return { tok, gem };
}
