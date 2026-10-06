// 3.4 扭蛋（召喚）：角色池、新手池、資源池、星塵商店
// 抽卡結果在按下去的瞬間就寫進存檔（先存檔再播動畫），關掉重開也不能重抽
// save.gacha = { hero: { n, sinceElite, sinceLegend, lost }, newbie: 剩幾抽, res: { day, free, gold }, shop: { month, bought: {} } }
import { HEROES } from './data.js';
import { rarityOf, UNLOCK_FRAGS, ensureHeroes, heroState, MAX_STAR } from './heroes.js';
import { ensureEconomy, grant } from './economy.js';
import { ensureGear, gemKey } from './gear.js';
import { todayKey } from './meta.js';
import { addExp, ensureMounts } from './mount.js';

export const PULL_COST = 100, TEN_COST = 900;
export const RES_COST = 50, RES_TEN = 450;
export const NEWBIE_PULLS = 20;
export const DUST_PER_PULL = 10;
// 滿星後多的碎片換星塵
const DUST_PER_FRAG = { normal: 1, rare: 2, elite: 3, legend: 5 };

export function ensureGacha(save) {
  ensureEconomy(save);
  ensureHeroes(save);
  save.gacha = save.gacha || { hero: { n: 0, sinceElite: 0, sinceLegend: 0, lost: false }, newbie: NEWBIE_PULLS, res: { day: '', free: 0, gold: 0 }, shop: { month: '', bought: {} } };
  save.wallet.anyFrag = save.wallet.anyFrag || 0;
  return save.gacha;
}

const pool = r => HEROES.filter(h => h.gacha && rarityOf(h) === r);
const normals = () => HEROES.filter(h => !h.gacha && !h.hidden);
const pick = a => a[Math.floor(Math.random() * a.length)];

// 給英雄碎片（沒有這位英雄也會先存著；滿星就換星塵）
export function addFrags(save, def, n) {
  ensureHeroes(save);
  const st = save.heroes[def.id] || (save.heroes[def.id] = { star: 1, frag: 0 });
  if (save.owned.includes(def.id) && st.star >= MAX_STAR) {
    const d = n * DUST_PER_FRAG[rarityOf(def)];
    save.wallet.stardust += d;
    return { dust: d };
  }
  st.frag += n;
  return {};
}
// 抽到整隻英雄：還沒有 → 加入；已經有 → 換成碎片
function giveHero(save, def) {
  if (!save.owned.includes(def.id)) {
    save.owned.push(def.id);
    ensureHeroes(save);
    return { kind: 'hero', def, isNew: true };
  }
  const n = UNLOCK_FRAGS[rarityOf(def)];
  const r = addFrags(save, def, n);
  return { kind: 'hero', def, isNew: false, frag: n, dust: r.dust };
}
// 碎片湊齊就可以解鎖
export function canUnlock(save, def) {
  return !save.owned.includes(def.id) && def.gacha && heroState(save, def.id).frag >= UNLOCK_FRAGS[rarityOf(def)];
}
export function unlockByFrags(save, def) {
  if (!canUnlock(save, def)) return false;
  save.heroes[def.id].frag -= UNLOCK_FRAGS[rarityOf(def)];
  save.owned.push(def.id);
  return true;
}

// ---------- 角色池 ----------
// 傳奇要到 3.8 才加入；沒有傳奇時，傳奇的機率改給精英碎片
export function heroRates() {
  const leg = pool('legend').length > 0;
  return [
    { k: 'legend', p: leg ? 0.006 : 0, name: '傳奇英雄' },
    { k: 'elite', p: 0.025, name: '精英英雄' },
    { k: 'rare', p: 0.08, name: '稀有英雄' },
    { k: 'legendFrag', p: leg ? 0.02 : 0, name: '傳奇碎片 x5' },
    { k: 'eliteFrag', p: leg ? 0.06 : 0.08, name: '精英碎片 x5' },
    { k: 'rareFrag', p: 0.12, name: '稀有碎片 x5' },
    { k: 'normalFrag', p: 0.2, name: '普通英雄碎片 x5' },
    { k: 'anyFrag', p: 0.15, name: '萬能碎片 x3' },
    { k: 'res', p: leg ? 0.339 : 0.345, name: '資源包（金幣／魔晶）' },
  ];
}
export const ELITE_PITY = 20, LEGEND_SOFT = 51, LEGEND_HARD = 70;

function rollHeroOnce(save, chapter, guarantee) {
  const g = save.gacha.hero;
  g.n++; g.sinceElite++; g.sinceLegend++;
  const leg = pool('legend').length > 0;
  let k = null;
  // 傳奇保底：51 抽起每抽 +5%，70 抽必出
  if (leg) {
    const extra = g.sinceLegend >= LEGEND_SOFT ? (g.sinceLegend - LEGEND_SOFT + 1) * 0.05 : 0;
    if (g.sinceLegend >= LEGEND_HARD || Math.random() < 0.006 + extra) k = 'legend';
  }
  if (!k && g.sinceElite >= ELITE_PITY) k = 'elite';
  if (!k) {
    let x = Math.random();
    for (const r of heroRates()) { if (r.k === 'legend') continue; x -= r.p; if (x <= 0) { k = r.k; break; } }
    k = k || 'res';
  }
  // 十連保底：至少一個精英以上（整隻或碎片）
  if (guarantee && !['legend', 'elite', 'legendFrag', 'eliteFrag'].includes(k)) k = 'eliteFrag';
  return grantHeroResult(save, k, chapter);
}
function grantHeroResult(save, k, chapter) {
  const g = save.gacha.hero;
  if (k === 'legend') { g.sinceLegend = 0; g.sinceElite = 0; return { ...giveHero(save, pick(pool('legend'))), r: 'legend' }; }
  if (k === 'elite') { g.sinceElite = 0; return { ...giveHero(save, pick(pool('elite'))), r: 'elite' }; }
  if (k === 'rare') return { ...giveHero(save, pick(pool('rare'))), r: 'rare' };
  if (k.endsWith('Frag') && k !== 'anyFrag') {
    const r = k.replace('Frag', '');
    const def = pick(r === 'normal' ? normals() : pool(r));
    const res = addFrags(save, def, 5);
    return { kind: 'frag', def, n: 5, r, dust: res.dust };
  }
  if (k === 'anyFrag') { save.wallet.anyFrag += 3; return { kind: 'any', n: 3, r: 'normal' }; }
  const gift = Math.random() < 0.5 ? { gold: 1000 * chapter } : { shards: 15 };
  grant(save, gift);
  return { kind: 'res', gift, r: 'normal' };
}

// 抽 n 次（1 或 10）；pay = 'gem' | 'ticket'；newbie = 新手池半價
export function pullHero(save, n, pay, chapter, newbie = false) {
  ensureGacha(save);
  const w = save.wallet;
  if (newbie && save.gacha.newbie < n) return null;
  if (pay === 'ticket') { if (w.heroTicket < n) return null; w.heroTicket -= n; }
  else {
    const cost = (n === 10 ? TEN_COST : PULL_COST * n) * (newbie ? 0.5 : 1);
    if (w.gem < cost) return null;
    w.gem -= cost;
  }
  const out = [];
  // 新手池：第一次十連必出稀有英雄
  const firstNewbieTen = newbie && n === 10 && save.gacha.newbie === NEWBIE_PULLS;
  for (let i = 0; i < n; i++) out.push(rollHeroOnce(save, chapter, n === 10 && i === n - 1 && !out.some(o => ['legend', 'elite'].includes(o.r))));
  if (firstNewbieTen && !out.some(o => o.kind === 'hero')) out[0] = grantHeroResult(save, 'rare', chapter);
  if (newbie) save.gacha.newbie -= n;
  w.stardust += DUST_PER_PULL * n;
  return out;
}

// ---------- 資源池（不會抽到寶石） ----------
export const RES_RATES = [
  { p: 0.30, name: '金幣袋', give: ch => ({ gold: 500 * ch }) },
  { p: 0.20, name: '魔晶 x10', give: () => ({ shards: 10 }) },
  { p: 0.15, name: '1 級符石 x2', give: () => ({ rune1: 2 }) },
  { p: 0.12, name: '坐騎經驗 +220', give: () => ({ mountExp: 220 }) },
  { p: 0.10, name: '萬能碎片 x2', give: () => ({ anyFrag: 2 }) },
  { p: 0.08, name: '普通英雄碎片 x5', give: () => ({ normalFrag: 5 }) },
  { p: 0.03, name: '魔晶 x50', give: () => ({ shards: 50 }), big: true },
  { p: 0.015, name: '召喚券 x1', give: () => (Math.random() < 0.5 ? { heroTicket: 1 } : { gearTicket: 1 }), big: true },
  { p: 0.005, name: '3 級符石 x1', give: () => ({ rune3: 1 }), big: true },
];
export const RES_GOLD = [1500, 3000, 5000];
function resDay(save) {
  const r = save.gacha.res;
  if (r.day !== todayKey()) { r.day = todayKey(); r.free = 0; r.gold = 0; }
  return r;
}
export const resFreeLeft = save => (ensureGacha(save), 1 - resDay(save).free);
export const resGoldPrice = save => (ensureGacha(save), RES_GOLD[resDay(save).gold] || null);
function grantRes(save, gift) {
  const out = { ...gift };
  if (gift.rune1 || gift.rune3) {
    const g = ensureGear(save);
    const ids = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst'];
    const n = gift.rune1 || gift.rune3, lv = gift.rune1 ? 1 : 3;
    for (let i = 0; i < n; i++) { const k = gemKey(pick(ids), lv); g.gems[k] = (g.gems[k] || 0) + 1; }
  }
  if (gift.mountExp) {
    const ms = ensureMounts(save);
    const st = ms.ride && ms.owned[ms.ride];
    if (st) addExp(st, gift.mountExp); else { delete out.mountExp; out.gold = 600; save.gold += 600; }
  }
  if (gift.anyFrag) save.wallet.anyFrag += gift.anyFrag;
  if (gift.normalFrag) { const def = pick(normals()); addFrags(save, def, gift.normalFrag); out.def = def; }
  grant(save, { gold: gift.gold, shards: gift.shards, heroTicket: gift.heroTicket, gearTicket: gift.gearTicket });
  return out;
}
// pay = 'free' | 'gold' | 'gem'
export function pullRes(save, n, pay, chapter) {
  ensureGacha(save);
  const d = resDay(save);
  if (pay === 'free') { if (n !== 1 || d.free >= 1) return null; d.free++; }
  else if (pay === 'gold') { const p = RES_GOLD[d.gold]; if (n !== 1 || !p || save.gold < p) return null; save.gold -= p; d.gold++; }
  else { const c = n === 10 ? RES_TEN : RES_COST * n; if (save.wallet.gem < c) return null; save.wallet.gem -= c; }
  const out = [];
  for (let i = 0; i < n; i++) {
    let x = Math.random(), rr = RES_RATES[0];
    for (const r of RES_RATES) { x -= r.p; if (x <= 0) { rr = r; break; } }
    if (n === 10 && i === 9 && !out.some(o => o.big)) rr = RES_RATES.find(r => r.big);
    out.push({ kind: 'resItem', name: rr.name, big: !!rr.big, gift: grantRes(save, rr.give(chapter)), r: rr.big ? 'elite' : 'normal' });
  }
  return out;
}

// ---------- 星塵商店（抽不到的補償；每月限購） ----------
export const DUST_SHOP = [
  { id: 'eliteFrag', name: '精英自選碎片 x10', cost: 150, limit: 8, need: 'elite' },
  { id: 'rareFrag', name: '稀有自選碎片 x10', cost: 80, limit: 10, need: 'rare' },
  { id: 'anyFrag', name: '萬能碎片 x10', cost: 80, limit: 10 },
  { id: 'heroTicket', name: '英雄召喚券 x1', cost: 120, limit: 5 },
  { id: 'gearTicket', name: '裝備召喚券 x1', cost: 120, limit: 5 },
  { id: 'shards', name: '魔晶 x50', cost: 100, limit: 99 },
];
const monthKey = () => todayKey().slice(0, 7);
function shopMonth(save) {
  const s = save.gacha.shop;
  if (s.month !== monthKey()) { s.month = monthKey(); s.bought = {}; }
  return s;
}
export const dustLeft = (save, item) => (ensureGacha(save), item.limit - (shopMonth(save).bought[item.id] || 0));
// heroId：自選碎片要指定英雄
export function buyDust(save, itemId, heroId) {
  ensureGacha(save);
  const item = DUST_SHOP.find(x => x.id === itemId);
  if (!item || dustLeft(save, item) <= 0 || save.wallet.stardust < item.cost) return false;
  if (item.need) {
    const def = HEROES.find(h => h.id === heroId);
    if (!def || rarityOf(def) !== item.need) return false;
    addFrags(save, def, 10);
  } else if (item.id === 'anyFrag') save.wallet.anyFrag += 10;
  else if (item.id === 'shards') grant(save, { shards: 50 });
  else grant(save, { [item.id]: 1 });
  save.wallet.stardust -= item.cost;
  shopMonth(save).bought[item.id] = (shopMonth(save).bought[item.id] || 0) + 1;
  return true;
}

// 萬能碎片：每升一星最多抵一半；精英 2:1、傳奇 3:1
export const ANY_RATE = { normal: 1, rare: 1, elite: 2, legend: 3 };
export function useAnyFrag(save, def, need) {
  ensureGacha(save);
  const st = heroState(save, def.id);
  const rate = ANY_RATE[rarityOf(def)];
  const cap = Math.ceil(need / 2) - (st.anyUsed || 0);
  const want = Math.min(cap, need - st.frag, Math.floor(save.wallet.anyFrag / rate));
  if (want <= 0) return 0;
  save.wallet.anyFrag -= want * rate;
  st.frag += want;
  st.anyUsed = (st.anyUsed || 0) + want;
  return want;
}
