// 3.9 戰役地圖：每章 1～3 星、星星寶箱、每章兩個支線關（精英關、寶藏關）
// save.stars = { normal: { 3: 2, ... } }   這個難度第幾章拿過最多幾顆星
// save.starChest = { normal: [10, 20] }     領過的星星寶箱
// save.side = { normal: { '3e': true } }    打過的支線（一次性獎勵）
import { maxCh } from './progress.js';
import { grant } from './economy.js';
import { grantItem } from './gear.js';
import { CHAPTERS } from './data.js';

export const MAP_CHAPTERS = 10;
export const STAR_RULES = ['通關', '沒有用復活', '通關時血量 50% 以上'];
export function ensureCampaign(save) {
  save.stars = save.stars || {};
  save.starChest = save.starChest || {};
  save.side = save.side || {};
  return save;
}
export const starsOf = (save, d, ch) => (ensureCampaign(save).stars[d] || {})[ch] || 0;
export const totalStars = (save, d) => Object.values(ensureCampaign(save).stars[d] || {}).reduce((a, b) => a + b, 0);
// 通關時算星數
export function rateRun(run) {
  const h = run.heroes.find(x => x.hp > 0) || run.hero;
  let n = 1;
  if (!run.revived) n++;
  if (!run.revived && h.hp >= h.maxHp * 0.5) n++;
  return n;
}
export function recordStars(save, d, ch, n) {
  ensureCampaign(save);
  const s = save.stars[d] = save.stars[d] || {};
  const before = s[ch] || 0;
  s[ch] = Math.max(before, n);
  return s[ch] - before;
}
// 星星寶箱：每個難度 10、20、30 顆星
export const STAR_CHESTS = [
  { need: 10, gift: { gem: 60, shards: 30 } },
  { need: 20, gift: { gem: 100, heroTicket: 1 } },
  { need: 30, gift: { gem: 150, gearTicket: 2 } },
];
export const chestOpen = (save, d, need) => ((ensureCampaign(save).starChest[d] || []).includes(need));
export function claimChest(save, d, need) {
  const c = STAR_CHESTS.find(x => x.need === need);
  if (!c || chestOpen(save, d, need) || totalStars(save, d) < need) return null;
  (save.starChest[d] = save.starChest[d] || []).push(need);
  grant(save, c.gift);
  return c.gift;
}
export const chestReady = (save, d) => STAR_CHESTS.some(c => !chestOpen(save, d, c.need) && totalStars(save, d) >= c.need);

// ---------- 支線關 ----------
// 精英關：5 波都有精英，打完給寶石＋史詩裝備；寶藏關：3 波，打完給一大包金幣與魔晶
export const SIDES = {
  e: { name: '精英關', icon: ['ic', 1023, '#ff5a5a'], desc: '5 波強敵，獎勵 30 寶石＋史詩裝備' },
  t: { name: '寶藏關', icon: ['it', 4], desc: '3 波，獎勵大量金幣與魔晶' },
};
export const sideKey = (ch, k) => `${ch}${k}`;
export const sideDone = (save, d, ch, k) => !!(ensureCampaign(save).side[d] || {})[sideKey(ch, k)];
// 支線在「這個難度通關這一章」之後開放
export const sideOpen = (save, d, ch) => maxCh(save, d) > ch;
export function sideRun(ch, k) {
  const name = `${CHAPTERS[(ch - 1) % CHAPTERS.length].name}・${SIDES[k].name}`;
  if (k === 'e') return { mode: 'side', side: { ch, k }, maxWave: 5, startCoins: 300, preShop: true, modeHp: 0.8, stageOf: w => 3 + w * 2, bossWave: () => false, eliteAll: true, label: w => `${name} ${w}/5` };
  return { mode: 'side', side: { ch, k }, maxWave: 3, startCoins: 150, preShop: true, modeHp: 0.7, stageOf: w => 4 + w * 3, bossWave: () => false, label: w => `${name} ${w}/3` };
}
export function sideReward(save, d, ch, k) {
  ensureCampaign(save);
  const s = save.side[d] = save.side[d] || {};
  if (s[sideKey(ch, k)]) return null;
  s[sideKey(ch, k)] = true;
  const g = Math.pow(1.45, ch - 1);
  if (k === 'e') {
    grant(save, { gem: 30 });
    const it = grantItem(save, 2, Math.min(10, ch));
    it.fresh = true;
    return [`+30 寶石`, `史詩裝備（在背包裡）`];
  }
  const gold = Math.round(2000 * g);
  grant(save, { gold, shards: 20 });
  return [`+${gold} 金幣`, `+20 魔晶`];
}
