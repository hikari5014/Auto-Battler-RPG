// 3.7 挑戰模式：每日副本、魔王連戰、試煉塔
// 都用同一套戰鬥，只是 run 上多了 mode、maxWave、stageOf（第幾波對應原本的哪一波強度）、bossWave、bossKey
// save.dungeon = { day, left, best: { gold: 最高通關階級, ... } }
// save.rush = { week, best }          本週打倒幾隻魔王（領過獎的）
// save.trial = { floor }              試煉塔最高通過層數
import { CHAPTERS, HEROES } from './data.js';
import { todayKey } from './meta.js';
import { diffUnlocked } from './progress.js';
import { difficultyOf } from './levels.js';
import { grant, weekKey } from './economy.js';
import { ensureGear, grantItem, gemKey, GEMS } from './gear.js';
import { ensureMounts, addExp } from './mount.js';
import { addFrags } from './gacha.js';

// ---------- 每日副本 ----------
// 星期一～五各開一種，週末全部開放；每天 2 次（掃蕩也算 1 次）
export const DUNGEONS = {
  gold: { name: '黃金寶庫', day: 1, icon: ['it', 4], desc: '大量金幣', enemies: ['goblin', 'bandit', 'rat'] },
  gear: { name: '武器庫', day: 2, icon: ['ic', 426, '#ffd84a'], desc: '史詩以上裝備', enemies: ['golem', 'skyknight', 'bandit'] },
  rune: { name: '符石礦坑', day: 3, icon: ['ic', 1023, '#7fffd4'], desc: '高級符石', enemies: ['golem', 'spider', 'lavacrab'] },
  mount: { name: '馴獸牧場', day: 4, icon: ['ic', 371, '#e8b878'], desc: '坐騎經驗', enemies: ['boar', 'eagle', 'griffin'] },
  hero: { name: '英靈殿', day: 5, icon: ['it', 1], desc: '英雄碎片、萬能碎片', enemies: ['ghost', 'wraith', 'skull'] },
};
export const DUNGEON_TRIES = 2;
// 階級 1～5 對應難度；要先開放那個難度
export const D_TIERS = ['easy', 'normal', 'hard', 'hell', 'nightmare'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
export const tierName = t => `第 ${ROMAN[t - 1]} 階`;

export function ensureModes(save) {
  if (!save.dungeon || save.dungeon.day !== todayKey()) save.dungeon = { day: todayKey(), left: DUNGEON_TRIES, best: (save.dungeon && save.dungeon.best) || {} };
  if (!save.rush || save.rush.week !== weekKey()) save.rush = { week: weekKey(), best: 0 };
  save.trial = save.trial || { floor: 0 };
  return save;
}
const weekday = () => new Date().getDay(); // 0 = 星期日
export const dungeonOpen = id => [0, 6].includes(weekday()) || DUNGEONS[id].day === weekday();
export const tierOpen = (save, t) => diffUnlocked(save, difficultyOf(D_TIERS[t - 1]));
export const canSweep = (save, id, t) => (save.dungeon.best[id] || 0) >= t;

// 獎勵：ch = 平衡難度最高章節（讓金幣、裝備等級跟著進度走）
export function dungeonReward(id, t, ch) {
  const g = Math.pow(1.45, Math.max(0, ch - 1));
  if (id === 'gold') return { gold: Math.round(2500 * t * g) };
  if (id === 'gear') return { items: 1 + Math.ceil(t / 2), rarity: t >= 4 ? 3 : 2, ilv: Math.max(1, Math.min(10, ch)) };
  if (id === 'rune') return { runes: 3, lv: Math.min(4, 1 + Math.floor(t / 2)) + (t === 5 ? 1 : 0) };
  if (id === 'mount') return { mountExp: 260 * t };
  return { anyFrag: 3 * t, frags: 4 * t };
}
export function rewardText(r) {
  if (r.gold) return `${r.gold} 金幣`;
  if (r.items) return `${r.items} 件${r.rarity >= 3 ? '傳說' : '史詩'}裝備`;
  if (r.runes) return `${r.lv} 級符石 x${r.runes}`;
  if (r.mountExp) return `坐騎經驗 +${r.mountExp}`;
  return `萬能碎片 x${r.anyFrag}、英雄碎片 x${r.frags}`;
}
// 真的發獎勵；回傳給結算畫面看的文字
export function giveDungeon(save, id, t, ch) {
  const r = dungeonReward(id, t, ch);
  const lines = [];
  if (r.gold) { save.gold += r.gold; lines.push(`+${r.gold} 金幣`); }
  if (r.items) {
    const gear = ensureGear(save);
    for (let i = 0; i < r.items; i++) { const it = grantItem(save, i === 0 ? r.rarity : 2, r.ilv); it.fresh = true; }
    lines.push(`${r.items} 件裝備（在背包裡）`);
    gear.items.length > 40 && lines.push('背包超過上限，記得整理');
  }
  if (r.runes) {
    const gear = ensureGear(save);
    const ids = Object.keys(GEMS);
    for (let i = 0; i < r.runes; i++) { const k = gemKey(ids[Math.floor(Math.random() * ids.length)], Math.min(5, r.lv)); gear.gems[k] = (gear.gems[k] || 0) + 1; }
    lines.push(`${Math.min(5, r.lv)} 級符石 x${r.runes}`);
  }
  if (r.mountExp) {
    const ms = ensureMounts(save);
    const st = ms.ride && ms.owned[ms.ride];
    if (st) { addExp(st, r.mountExp); lines.push(`坐騎經驗 +${r.mountExp}`); }
    else { save.gold += r.mountExp * 5; lines.push(`沒有騎坐騎，改給 ${r.mountExp * 5} 金幣`); }
  }
  if (r.anyFrag) {
    save.wallet.anyFrag = (save.wallet.anyFrag || 0) + r.anyFrag;
    const own = HEROES.filter(h => save.owned.includes(h.id));
    const def = own[Math.floor(Math.random() * own.length)];
    addFrags(save, def, r.frags);
    lines.push(`萬能碎片 x${r.anyFrag}、${def.name.split(' ')[1]}碎片 x${r.frags}`);
  }
  return lines;
}
export function sweep(save, id, t, ch) {
  ensureModes(save);
  if (save.dungeon.left <= 0 || !canSweep(save, id, t) || !dungeonOpen(id)) return null;
  save.dungeon.left--;
  return giveDungeon(save, id, t, ch);
}
// 副本：5 波，強度對應正常章節的第 3、6、9、12、15 波（最後一波是魔王）
export function dungeonRun(id, t) {
  return {
    mode: 'dungeon', dungeon: { id, t }, maxWave: 5, startCoins: 300, preShop: true, modeHp: 0.6, modeAtk: 0.8,
    stageOf: w => w * 3, bossWave: w => w === 5,
    enemyPool: DUNGEONS[id].enemies, diffId: D_TIERS[t - 1],
    label: w => `${DUNGEONS[id].name}・${tierName(t)} ${w}/5`,
  };
}

// ---------- 魔王連戰 ----------
// 連打 5 隻魔王（每一章的魔王），中間可以買技能；每週照「打倒第幾隻」給一次寶石
export const RUSH_GEMS = [20, 30, 40, 50, 80];
export function rushRun() {
  return {
    mode: 'rush', maxWave: 5, startCoins: 500, preShop: true, modeHp: 0.15, modeAtk: 0.6, hpOf: w => [0.15, 0.22, 0.3, 0.4, 0.5][w - 1],
    stageOf: () => 15, bossWave: () => true,
    bossKey: w => CHAPTERS[(w - 1) % CHAPTERS.length].boss,
    label: w => `魔王連戰 ${w}/5`,
  };
}
export function rushReward(save, beaten) {
  ensureModes(save);
  let gem = 0;
  for (let i = save.rush.best; i < beaten; i++) gem += RUSH_GEMS[i];
  save.rush.best = Math.max(save.rush.best, beaten);
  if (gem) grant(save, { gem, stardust: gem / 2 });
  return gem;
}

// ---------- 試煉塔 ----------
// 100 層；每次從最近的 10 層檢查點開始往上爬，一路打到倒下；每 10 層一隻魔王
// 第 f 層：章節 = ceil(f / 10)，強度 = 該章第 3～11 波，第 10、20…層是魔王
export const TRIAL_TOP = 100;
export const trialStart = save => Math.floor((save.trial.floor || 0) / 10) * 10 + 1;
export const floorStage = f => (f % 10 === 0 ? 15 : 2 + ((f - 1) % 10));
export function trialRun(save) {
  const start = Math.min(TRIAL_TOP, trialStart(save));
  return {
    mode: 'trial', trialStart: start, maxWave: TRIAL_TOP - start + 1, startCoins: 120 + start * 8,
    floorOf: w => start + w - 1,
    stageOf: w => floorStage(start + w - 1),
    bossWave: w => (start + w - 1) % 10 === 0,
    chapterOf: w => Math.ceil((start + w - 1) / 10),
    diffId: 'normal',
    label: w => `試煉塔 第 ${start + w - 1} 層`,
  };
}
// 爬到新的層數才給獎勵
export function trialReward(save, reached) {
  const prev = save.trial.floor || 0;
  const out = { gold: 0, gem: 0, heroTicket: 0, gearTicket: 0 };
  for (let f = prev + 1; f <= reached; f++) {
    out.gold += 150 * f;
    if (f % 5 === 0) out.gem += 20;
    if (f % 10 === 0) { if ((f / 10) % 2) out.heroTicket++; else out.gearTicket++; }
  }
  save.trial.floor = Math.max(prev, reached);
  grant(save, out);
  return out;
}
