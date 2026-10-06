// 3.3 英雄升星：每位英雄用自己的「英雄碎片」從 1 星升到 6 星
// 存在 save.heroes = { blade: { star: 1, frag: 0 }, ... }
// 每顆星加的數值所有英雄都一樣；稀有度只影響升星要幾片碎片
import { HEROES } from './data.js';
import { maxCh } from './progress.js';
import { todayKey } from './meta.js';

export const RARITY = {
  normal: { name: '普通', color: '#cfcfcf' },
  rare: { name: '稀有', color: '#36d6ff' },
  elite: { name: '精英', color: '#d06bff' },
  legend: { name: '傳奇', color: '#ffb820' },
};
export const rarityOf = def => def.rarity || 'normal';
export const MAX_STAR = 6;
export const STAR_MUL = [0, 1, 1.08, 1.16, 1.26, 1.36, 1.5];   // 攻擊、血量倍率
export const STAR_COST = {                                       // 從 n 星升到 n+1 星要幾片
  normal: [0, 10, 20, 35, 55, 80],
  rare: [0, 15, 30, 50, 75, 110],
  elite: [0, 20, 40, 65, 100, 145],
  legend: [0, 30, 55, 90, 135, 190],
};
export const UNLOCK_FRAGS = { normal: 0, rare: 20, elite: 40, legend: 60 };
export const STAR_GOLD = [0, 500, 1500, 4000, 10000, 25000];
// 4～6 星要先在對應難度通關（任一英雄、任一章都算）：不能只靠養成跳過難度
export const STAR_GATE = { 4: ['normal', '中級'], 5: ['hard', '挑戰'], 6: ['hell', '地獄'] };

// 3 星天賦、5 星覺醒（現有 11 位英雄）
export const PERKS = {
  blade: { s3: ['劍氣傷害 +30%', h => { h.swordMul *= 1.3; }], s5: ['劍聖：劍氣必定暴擊，傷害再 +30%', h => { h.swordCrit = true; h.swordMul += 0.3; }] },
  archer: { s3: ['球雨箭需要接球 20 → 16', h => { h.arrowNeed = Math.max(8, h.arrowNeed - 4); }], s5: ['風之射手：每次攻擊多射一箭', h => { h.multiShot += 1; }] },
  mage: { s3: ['濺射 +10%', h => { h.splash += 0.1; }], s5: ['黑洞：濺射再 +20%，擊暈的敵人受到傷害 +30%', h => { h.splash += 0.2; h.stunAmp += 0.3; }] },
  saw: { s3: ['鏈鋸需要撞擊 12 → 10', h => { h.sawNeed = Math.max(6, h.sawNeed - 2); }], s5: ['血肉磨坊：鏈鋸傷害 +100%，吸血 +4%', h => { h.sawMul += 0.6; h.life += 0.04; }] },
  paladin: { s3: ['聖光傷害 +30%', h => { h.holyMul += 0.3; }], s5: ['聖盾：格擋 +10%，聖光給 10% 血量護盾', h => { h.block += 0.1; h.holyShield += 0.1; }] },
  rogue: { s3: ['閃避 +5%', h => { h.dodge += 0.05; }], s5: ['影殺：暴擊傷害 +40%，閃避後下一擊必定暴擊', h => { h.critDmg += 0.4; h.dodgeCrit = true; }] },
  gunner: { s3: ['榴彈傷害 150% → 200%', h => { h.grenadeMul += 0.5; }], s5: ['集束彈：每 4 擊就丟榴彈，而且會擊暈', h => { h.grenadeEvery = Math.min(h.grenadeEvery, 4); h.grenadeStun = true; }] },
  elem: { s3: ['雷元素多跳 1 隻', h => { h.boltJumps += 1; }], s5: ['元素融合：燃燒 +20%、冰凍機率 +10%', h => { h.fireDot += 0.2; h.iceFreeze += 0.1; }] },
  dragoon: { s3: ['龍息傷害 +50%', h => { h.breathMul += 0.5; }], s5: ['龍騎合一：龍息連噴兩次', h => { h.breathTwice = true; }] },
  sage: { s3: ['星落需要接球 15 → 12', h => { h.starNeed = Math.max(6, h.starNeed - 3); }], s5: ['星河：每次星落多落一顆', h => { h.starCount += 1; }] },
  thief: { s3: ['每殺一隻多拿 1 球幣', h => { h.stealCoins += 1; }], s5: ['盜賊王的寶庫：結算金幣再 +10%', h => { h.goldBonus += 0.1; }] },
};

export function ensureHeroes(save) {
  save.heroes = save.heroes || {};
  for (const id of save.owned || []) if (!save.heroes[id]) save.heroes[id] = { star: 1, frag: 0 };
  save.fragShop = save.fragShop || { day: '', bought: {} };
  return save.heroes;
}
export const heroState = (save, id) => (save.heroes && save.heroes[id]) || { star: 1, frag: 0 };
export const heroStar = (save, id) => heroState(save, id).star || 1;

// 套用星級：createHero 最後呼叫
export function applyStar(h, save) {
  const s = heroStar(save, h.def.id);
  h.star = s;
  h.maxHp *= STAR_MUL[s];
  h.hp = h.maxHp;
  h.baseAtk *= STAR_MUL[s];
  const p = PERKS[h.def.id] || h.def.perks;
  if (p && s >= 3 && p.s3) p.s3[1](h);
  if (p && s >= 5 && p.s5) p.s5[1](h);
}

export function nextCost(save, id) {
  const def = HEROES.find(h => h.id === id);
  const st = heroState(save, id);
  if (st.star >= MAX_STAR) return null;
  return { frag: STAR_COST[rarityOf(def)][st.star], gold: STAR_GOLD[st.star] };
}
// 回傳不能升星的原因；可以升就回傳 ''
export function whyNoStar(save, id) {
  if (!save.owned.includes(id)) return '還沒有這位英雄';
  const st = heroState(save, id);
  if (st.star >= MAX_STAR) return '已經 6 星滿星';
  const gate = STAR_GATE[st.star + 1];
  if (gate && maxCh(save, gate[0]) < 2) return `要先在「${gate[1]}」難度通關任一章，才能升到 ${st.star + 1} 星`;
  const c = nextCost(save, id);
  if (st.frag < c.frag) return `碎片不足（${st.frag} / ${c.frag}）`;
  if (save.gold < c.gold) return `金幣不足，還差 ${c.gold - save.gold}`;
  return '';
}
export function starUp(save, id) {
  if (whyNoStar(save, id)) return false;
  const st = save.heroes[id], c = nextCost(save, id);
  st.frag -= c.frag;
  save.gold -= c.gold;
  st.star++;
  st.anyUsed = 0;
  return true;
}

// 冒險結束：帶這位英雄出戰（主、副都算）就掉碎片
export const FRAG_RULE = { normal: [3, 5], rare: [5, 3], elite: [8, 2], legend: [15, 1] };
export function runFrags(save, ids, waves) {
  ensureHeroes(save);
  const got = [];
  for (const id of ids) {
    const def = HEROES.find(h => h.id === id);
    const [every, cap] = FRAG_RULE[rarityOf(def)];
    const n = Math.min(cap, Math.floor(waves / every));
    if (!n) continue;
    save.heroes[id].frag += n;
    got.push({ def, n });
  }
  return got;
}

// 碎片商店：每天限量用金幣買（傳奇不賣）
export const SHOP_RULE = { normal: { daily: 5, base: 200, step: 50 }, rare: { daily: 3, base: 600, step: 150 }, elite: { daily: 1, base: 2000, step: 0 } };
function shopDay(save) {
  ensureHeroes(save);
  if (save.fragShop.day !== todayKey()) save.fragShop = { day: todayKey(), bought: {} };
  return save.fragShop;
}
export function fragShopInfo(save, id) {
  const def = HEROES.find(h => h.id === id);
  const r = SHOP_RULE[rarityOf(def)];
  if (!r) return null;
  const n = shopDay(save).bought[id] || 0;
  return { left: r.daily - n, price: r.base + r.step * n };
}
export function buyFrag(save, id) {
  const info = fragShopInfo(save, id);
  if (!info || info.left <= 0 || save.gold < info.price || !save.owned.includes(id)) return false;
  save.gold -= info.price;
  save.fragShop.bought[id] = (save.fragShop.bought[id] || 0) + 1;
  save.heroes[id].frag++;
  return true;
}
export const starText = s => '★'.repeat(s) + '☆'.repeat(MAX_STAR - s);
