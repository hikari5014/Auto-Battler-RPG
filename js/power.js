// 3.0 統一戰力：把英雄、天賦、裝備、坐騎的效果合成一個數字
// 戰力 = 1000 × √(打得快 × 撐得久)，以「全新存檔的劍士」= 1000 為基準
// 推薦戰力 = 這個難度、這一章大約要多少戰力才打得過
import { createHero, heroAtk, critRate, critMul, EVADE_CAP, DR_CAP } from './battle.js';
import { HEROES } from './data.js';
import { DIFFICULTIES, difficultyOf, CHAPTER_GROWTH } from './levels.js';

function offense(h) {
  const jewel = (h.jewels || []).reduce((s, j) => s + j.mul / j.every * 6, 0); // 定時傷害換算
  return heroAtk(h) * h.spdMul / h.interval
    * (1 + critRate(h) * (critMul(h) - 1))
    * (1 + 0.35 * h.bossDmg)
    * (1 + h.dbl) * ((5 + h.hits) / 6) * (1 + 0.5 * h.splash)
    * (1 + 0.08 * jewel);
}
function defense(h) {
  const dodge = Math.min(EVADE_CAP, h.dodge || 0);
  const evade = Math.min(EVADE_CAP, 1 - (1 - dodge) * (1 - h.block));
  return h.maxHp / ((1 - Math.min(DR_CAP, h.dr)) * (1 - evade)) * (1 + 2 * h.life) * (1 + h.shieldPct);
}

let base = null;
function baseline() {
  if (!base) {
    const h = createHero(HEROES[0], { gold: 0, talents: { core: 1 } });
    base = { off: offense(h), def: defense(h) };
  }
  return base;
}

// 一個英雄物件（已含各種加成）的戰力
export function heroPower(h) {
  const b = baseline();
  return Math.round(1000 * Math.sqrt(offense(h) / b.off * defense(h) / b.def));
}
// 某位英雄出發前的戰力（雙職業取兩人平均，再加一點：多一個技能池＋換手斬）
export function savePower(save, ids = [save.selected, save.second].filter(Boolean)) {
  const defs = ids.map(id => HEROES.find(h => h.id === id)).filter(Boolean);
  if (!defs.length) defs.push(HEROES[0]);
  const ps = defs.map(d => heroPower(createHero(d, save)));
  const avg = ps.reduce((a, b) => a + b, 0) / ps.length;
  return Math.round(avg * (ps.length > 1 ? 1.08 : 1));
}

// 難度的威脅：血量 × 攻擊開根號，每波多的怪再加一點
export const threat = d => Math.sqrt(d.hp * d.atk) * (1 + 0.08 * d.count);
export function recommended(diffId, chapter) {
  const d = difficultyOf(diffId);
  return Math.round(600 * threat(d) * Math.pow(CHAPTER_GROWTH, chapter - 1) / 10) * 10;
}
// 戰力 ÷ 推薦 → 顏色與文字
export function powerBand(power, rec) {
  const r = power / rec;
  if (r >= 1.3) return { cls: 'crush', text: '碾壓', color: '#6dff8a' };
  if (r >= 1) return { cls: 'ok', text: '推薦', color: '#8dff9f' };
  if (r >= 0.8) return { cls: 'tough', text: '有挑戰', color: '#ffd84a' };
  if (r >= 0.6) return { cls: 'weak', text: '偏弱', color: '#ff9f43' };
  return { cls: 'low', text: '戰力不足', color: '#ff5a5a' };
}
export { DIFFICULTIES };
