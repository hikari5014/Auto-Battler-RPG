// 3.11 長線內容：世界王、幻影競技場、冒險手冊（免費通行證）、限時活動
// save.wb = { week, day, tries, best, tier }      世界王：每天 3 次，看傷害給獎勵
// save.arena = { week, pts, best, day, tries, opp } 競技場：打別人的幻影，贏了加分
// save.pass = { season, xp, got: [] }             冒險手冊：28 天一季，30 級
// save.events = { id, pts, bought: {} }           限時活動：每週輪流一種
import { HEROES, CHAPTERS, MONSTERS } from './data.js';
import { todayKey } from './meta.js';
import { grant, weekKey } from './economy.js';

const dayIdx = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const weekIdx = () => Math.floor((dayIdx() + 3) / 7); // 以星期一為一週的開始

// ---------- 世界王 ----------
// 每週換一隻超大魔王（打不死），60 秒內打越多傷害越好
export const WB_BOSSES = ['firegiant', 'hydra', 'colossus', 'abysslord', 'stardragon', 'frostlord'];
export const WB_TIME = 60, WB_TRIES = 3;
export const wbBoss = () => WB_BOSSES[weekIdx() % WB_BOSSES.length];
// 傷害門檻：跟著章節成長（ch = 平衡難度最高章節）
export const wbTiers = ch => [0.25, 0.6, 1, 1.6, 2.5, 4].map(k => Math.round(k * 2000 * Math.pow(1.22, ch - 1)));
export const WB_REWARD = [
  { gem: 10, gold: 1500 }, { gem: 20, gold: 3000 }, { gem: 30, gold: 5000, shards: 10 },
  { gem: 45, gold: 8000, shards: 20 }, { gem: 60, gold: 12000, gearTicket: 1 }, { gem: 80, gold: 20000, heroTicket: 1 },
];
export function ensureWb(save) {
  if (!save.wb || save.wb.week !== weekKey()) save.wb = { week: weekKey(), day: '', tries: 0, best: 0 };
  if (save.wb.day !== todayKey()) { save.wb.day = todayKey(); save.wb.tries = 0; }
  return save.wb;
}
export function wbRun() {
  const key = wbBoss();
  return {
    mode: 'worldboss', maxWave: 1, startCoins: 700, preShop: true, timer: WB_TIME,
    stageOf: () => 15, bossWave: () => true, bossKey: () => key, modeHp: 60, modeAtk: 0.5, noCaptains: true,
    label: () => `世界王・${MONSTERS[key].name}`,
  };
}
export function wbReward(save, dmg, ch) {
  const w = ensureWb(save);
  w.best = Math.max(w.best, dmg);
  const tiers = wbTiers(ch);
  const tier = tiers.filter(t => dmg >= t).length;
  if (!tier) return { tier: 0 };
  const g = WB_REWARD[tier - 1];
  grant(save, g);
  return { tier, gift: g };
}

// ---------- 幻影競技場 ----------
// 對手是其他英雄的「幻影」（用英雄的樣子當成魔王），強度看分數；每週重置分數
export const ARENA_TRIES = 5;
export const ARENA_RANKS = [
  { pts: 0, name: '青銅', gift: { gem: 20 } }, { pts: 200, name: '白銀', gift: { gem: 40 } }, { pts: 450, name: '黃金', gift: { gem: 70, stardust: 20 } },
  { pts: 750, name: '白金', gift: { gem: 100, stardust: 40 } }, { pts: 1100, name: '鑽石', gift: { gem: 150, heroTicket: 1 } }, { pts: 1500, name: '傳說', gift: { gem: 220, heroTicket: 2 } },
];
export const rankOf = pts => ARENA_RANKS.filter(r => pts >= r.pts).pop();
const NAMES = ['流浪的', '沉默的', '狂暴的', '幸運的', '傳說的', '黑夜的', '黃金的', '迅捷的'];
// 把英雄註冊成「幻影」怪物（用英雄的圖）
export function ghostKey(def) {
  const k = 'ghost_' + def.id;
  if (!MONSTERS[k]) MONSTERS[k] = { name: def.name.split(' ')[1] + '的幻影', sprite: Array.isArray(def.sprite) ? def.sprite : ['dg', def.sprite], hp: def.hp / 170, atk: def.atk / 12, speed: 1, iv: def.interval, boss: true };
  return k;
}
export function ensureArena(save) {
  if (!save.arena || save.arena.week !== weekKey()) save.arena = { week: weekKey(), pts: 0, best: 0, day: '', tries: 0, opp: null, claimed: false };
  if (save.arena.day !== todayKey()) { save.arena.day = todayKey(); save.arena.tries = 0; save.arena.opp = null; }
  if (!save.arena.opp) save.arena.opp = rollOpponents(save.arena.pts);
  return save.arena;
}
// 三個對手：弱（+15）、平手（+25）、強（+40）
export function rollOpponents(pts) {
  const pool = HEROES.filter(h => !h.hidden);
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  return [0.8, 1, 1.25].map((k, i) => {
    const team = [pick(), pick(), pick()];
    return { name: NAMES[Math.floor(Math.random() * NAMES.length)] + team[0].name.split(' ')[1], team: team.map(h => h.id), k: k * (1 + pts / 1500), win: [15, 25, 40][i], lose: [-15, -10, -5][i] };
  });
}
export function arenaRun(opp) {
  const keys = opp.team.map(id => ghostKey(HEROES.find(h => h.id === id)));
  return {
    mode: 'arena', maxWave: 3, startCoins: 450, preShop: true, opp,
    stageOf: w => 9 + w * 2, bossWave: () => true, bossKey: w => keys[w - 1], modeHp: 0.05 * opp.k, modeAtk: 0.22 * opp.k, noCaptains: true,
    hpOf: w => [0.04, 0.06, 0.08][w - 1] * opp.k,
    label: w => `競技場 ${w}/3`,
  };
}
export function arenaResult(save, opp, win) {
  const a = ensureArena(save);
  const d = win ? opp.win : opp.lose;
  a.pts = Math.max(0, a.pts + d);
  a.best = Math.max(a.best, a.pts);
  a.opp = rollOpponents(a.pts);
  return d;
}
// 每週段位獎勵：照本週最高分，領一次
export function claimArenaWeekly(save) {
  const a = ensureArena(save);
  if (a.claimed) return null;
  a.claimed = true;
  const r = rankOf(a.best);
  grant(save, r.gift);
  return r;
}

// ---------- 冒險手冊（免費通行證） ----------
export const PASS_DAYS = 28, PASS_LV = 30, PASS_XP = 100;
export const passSeason = () => Math.floor(dayIdx() / PASS_DAYS);
export const passDaysLeft = () => PASS_DAYS - (dayIdx() % PASS_DAYS);
const PASS_GIFTS = [{ gold: 2000 }, { shards: 15 }, { gem: 20 }, { stardust: 20 }, { gold: 4000 }, { anyFrag: 5 }, { gem: 30 }, { shards: 30 }, { gearTicket: 1 }, { gem: 50, heroTicket: 1 }];
export const passGift = lv => (lv === PASS_LV ? { gem: 150, heroTicket: 2, gearTicket: 2 } : PASS_GIFTS[(lv - 1) % PASS_GIFTS.length]);
export function ensurePass(save) {
  if (!save.pass || save.pass.season !== passSeason()) save.pass = { season: passSeason(), xp: 0, got: [] };
  return save.pass;
}
export const passLv = save => Math.min(PASS_LV, Math.floor(ensurePass(save).xp / PASS_XP));
export function passXp(save, n) { ensurePass(save).xp = Math.min(PASS_LV * PASS_XP, save.pass.xp + n); }
export function claimPass(save, lv) {
  const p = ensurePass(save);
  if (lv > passLv(save) || p.got.includes(lv)) return null;
  p.got.push(lv);
  const g = passGift(lv);
  if (g.anyFrag) save.wallet.anyFrag = (save.wallet.anyFrag || 0) + g.anyFrag;
  grant(save, g);
  return g;
}
export const passReady = save => { const p = ensurePass(save); for (let lv = 1; lv <= passLv(save); lv++) if (!p.got.includes(lv)) return true; return false; };

// ---------- 限時活動（每週輪流一種） ----------
// 活動期間：冒險結束拿活動代幣（每過一波 1 枚，有加成的模式再多），代幣在活動商店換東西
export const EVENTS = [
  { id: 'harvest', name: '豐收祭', token: '麥穗', color: '#ffd84a', desc: '金幣副本與冒險結算金幣 +30%', goldBonus: 0.3 },
  { id: 'hunt', name: '魔王狩獵週', token: '狩獵徽章', color: '#ff5a5a', desc: '打倒魔王多拿 5 枚代幣；魔王連戰獎勵 +50%', bossTokens: 5 },
  { id: 'starfest', name: '星之祭典', token: '流星碎片', color: '#c8b6ff', desc: '扭蛋每抽多送 1 枚代幣；謎題星星獎勵加倍', pullTokens: 1 },
];
export const EVENT_SHOP = [
  { id: 'gem', name: '寶石 x30', cost: 40, limit: 5, gift: { gem: 30 } },
  { id: 'ht', name: '英雄召喚券', cost: 80, limit: 3, gift: { heroTicket: 1 } },
  { id: 'gt', name: '裝備召喚券', cost: 80, limit: 3, gift: { gearTicket: 1 } },
  { id: 'dust', name: '星塵 x50', cost: 50, limit: 4, gift: { stardust: 50 } },
  { id: 'shards', name: '魔晶 x40', cost: 30, limit: 6, gift: { shards: 40 } },
  { id: 'gold', name: '金幣 x10000', cost: 20, limit: 10, gift: { gold: 10000 } },
];
export const currentEvent = () => EVENTS[weekIdx() % EVENTS.length];
export const eventDaysLeft = () => 7 - ((dayIdx() + 3) % 7);
export function ensureEvent(save) {
  const ev = currentEvent();
  if (!save.events || save.events.id !== ev.id + weekIdx()) save.events = { id: ev.id + weekIdx(), pts: 0, bought: {} };
  return save.events;
}
export function eventTokens(save, n) { if (n > 0) ensureEvent(save).pts += n; return n; }
export function buyEvent(save, id) {
  const e = ensureEvent(save), it = EVENT_SHOP.find(x => x.id === id);
  if (!it || e.pts < it.cost || (e.bought[id] || 0) >= it.limit) return null;
  e.pts -= it.cost;
  e.bought[id] = (e.bought[id] || 0) + 1;
  grant(save, it.gift);
  return it;
}
// 一局結束時呼叫：給手冊經驗與活動代幣
export function onRunEnd(save, run, cleared, win) {
  passXp(save, 15 + cleared * 3 + (win ? 25 : 0));
  const ev = currentEvent();
  let t = cleared;
  if (ev.bossTokens && win && !run.mode) t += ev.bossTokens;
  if (ev.bossTokens && run.mode === 'rush') t += cleared * 2;
  return eventTokens(save, t);
}
export const chapterBossName = ch => MONSTERS[CHAPTERS[(ch - 1) % CHAPTERS.length].boss].name;
