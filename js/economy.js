// 3.2 寶石經濟：高級貨幣「寶石」與每日循環（只能靠玩取得，沒有付費）
// 存檔欄位：
//   save.wallet   = { gem, stardust, heroTicket, gearTicket }
//   save.clock    = { maxSeen }                     防止把手機時間往回撥
//   save.missions = { day, act, prog: {}, chests: [] }   每日任務
//   save.weekly   = { week, act, chests: [], best }      每週活躍
//   save.calendar = { n, last }                     28 格累計簽到
//   save.vault    = { since }                       冒險寶庫（離線累積）
//   save.clears   = { 'normal-3': true }            每個難度每章的首通
//   save.mail     = [{ id, title, text, gift, got }]
//   save.winGems  = { day, n }                      今天已經拿過幾場勝利寶石
import { DIFFICULTIES } from './levels.js';
import { todayKey } from './meta.js';
import { ensureGear } from './gear.js';

export const WALLET_KEYS = ['gem', 'stardust', 'heroTicket', 'gearTicket'];
export const CUR = {
  gem: { name: '寶石', icon: ['it', 0] },
  stardust: { name: '星塵', icon: ['it', 3] },
  heroTicket: { name: '英雄召喚券', icon: ['it', 1] },
  gearTicket: { name: '裝備召喚券', icon: ['it', 2] },
  gold: { name: '金幣', icon: ['pp', 151] },
  shards: { name: '魔晶', icon: null },
};

export function ensureEconomy(save) {
  save.wallet = Object.assign({ gem: 0, stardust: 0, heroTicket: 0, gearTicket: 0 }, save.wallet || {});
  save.clock = save.clock || { maxSeen: Date.now() };
  save.missions = save.missions || { day: '', act: 0, prog: {}, chests: [] };
  save.weekly = save.weekly || { week: '', act: 0, chests: [], best: 0 };
  save.calendar = save.calendar || { n: 0, last: '' };
  save.vault = save.vault || { since: Date.now() };
  save.clears = save.clears || {};
  save.mail = save.mail || [];
  save.winGems = save.winGems || { day: '', n: 0 };
  save.towerMiles = save.towerMiles || [];
  return save.wallet;
}

// ---------- 時間防護 ----------
// 時間倒退超過 10 分鐘：暫停每日重置與寶庫累積，直到時間追上（不扣任何東西）
export function clockOk(save) {
  const now = Date.now();
  if (now < save.clock.maxSeen - 10 * 60 * 1000) return false;
  save.clock.maxSeen = Math.max(save.clock.maxSeen, now);
  return true;
}
// 週一為一週的開始
export function weekKey(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
}

// ---------- 發獎 ----------
// gift = { gem, gold, shards, stardust, heroTicket, gearTicket }
export function grant(save, gift) {
  ensureEconomy(save);
  for (const [k, v] of Object.entries(gift || {})) {
    if (!v) continue;
    if (k === 'gold') save.gold += v;
    else if (k === 'shards') ensureGear(save).shards += v;
    else if (WALLET_KEYS.includes(k)) save.wallet[k] += v;
  }
}
export const giftText = gift => Object.entries(gift || {}).filter(([, v]) => v).map(([k, v]) => `${CUR[k] ? CUR[k].name : k} +${v}`).join('、');

// ---------- 每日任務（活躍度） ----------
export const MISSIONS = [
  { id: 'login', name: '登入遊戲', goal: 1, act: 10 },
  { id: 'run', name: '完成 2 場冒險（輸贏都算）', goal: 2, act: 20 },
  { id: 'kill', name: '擊敗 100 隻怪物', goal: 100, act: 15 },
  { id: 'boss', name: '打倒 1 隻魔王', goal: 1, act: 15 },
  { id: 'gear', name: '強化、附魔或合成裝備 1 次', goal: 1, act: 10 },
  { id: 'daily', name: '完成每日挑戰', goal: 1, act: 20 },
  { id: 'skill', name: '在商店買 10 個技能', goal: 10, act: 10 },
  { id: 'vault', name: '領取冒險寶庫', goal: 1, act: 10 },
];
export const DAILY_CHESTS = [
  { need: 20, gift: { gem: 5, gold: 500 } },
  { need: 40, gift: { gem: 5, shards: 10 } },
  { need: 60, gift: { gem: 10 } },
  { need: 80, gift: { gem: 10, gold: 1500 } },
  { need: 100, gift: { gem: 10, heroTicket: 1 } },
];
export const WEEKLY_CHESTS = [
  { need: 300, gift: { gem: 50 } },
  { need: 500, gift: { gem: 70 } },
  { need: 700, gift: { gem: 90, heroTicket: 1 } },
];

// 跨日／跨週重置（每次開遊戲、回首頁時呼叫）
export function rollDay(save) {
  ensureEconomy(save);
  if (!clockOk(save)) return false;
  const day = todayKey(), week = weekKey();
  if (save.missions.day !== day) {
    save.missions = { day, act: 0, prog: {}, chests: [] };
    track(save, 'login');
  }
  if (save.weekly.week !== week) {
    // 上週的無盡塔成績：用信件發寶石
    if (save.weekly.week && save.weekly.best > 0) {
      const g = towerWeekly(save.weekly.best);
      if (g) sendMail(save, `tower-${save.weekly.week}`, '無盡塔週結算', `上週最佳有效層數 ${save.weekly.best} 層`, { gem: g });
    }
    save.weekly = { week, act: 0, chests: [], best: 0 };
  }
  return true;
}

export function track(save, id, n = 1) {
  ensureEconomy(save);
  const m = MISSIONS.find(x => x.id === id);
  if (!m || save.missions.day !== todayKey()) return;
  const before = save.missions.prog[id] || 0;
  if (before >= m.goal) return;
  save.missions.prog[id] = Math.min(m.goal, before + n);
  if (save.missions.prog[id] >= m.goal) {
    save.missions.act += m.act;
    save.weekly.act += m.act;
  }
}
export const missionDone = (save, m) => (save.missions.prog[m.id] || 0) >= m.goal;
export function claimDailyChest(save, i) {
  const c = DAILY_CHESTS[i];
  if (!c || save.missions.act < c.need || save.missions.chests[i]) return null;
  save.missions.chests[i] = true;
  grant(save, c.gift);
  return c.gift;
}
export function claimWeeklyChest(save, i) {
  const c = WEEKLY_CHESTS[i];
  if (!c || save.weekly.act < c.need || save.weekly.chests[i]) return null;
  save.weekly.chests[i] = true;
  grant(save, c.gift);
  return c.gift;
}
export const questBadge = save => DAILY_CHESTS.filter((c, i) => save.missions.act >= c.need && !save.missions.chests[i]).length
  + WEEKLY_CHESTS.filter((c, i) => save.weekly.act >= c.need && !save.weekly.chests[i]).length
  + (canSign(save) ? 1 : 0) + (vaultReady(save) ? 1 : 0);

// ---------- 簽到月曆（28 格，累計制：漏簽不歸零） ----------
export function calendarGift(n) { // n = 第幾格（1～28）
  if (n === 7) return { gem: 60, heroTicket: 1 };
  if (n === 14) return { gem: 60, gearTicket: 1 };
  if (n === 21) return { gem: 60, heroTicket: 1 };
  if (n === 28) return { gem: 100, heroTicket: 1, gearTicket: 1 };
  return n % 2 ? { gem: 6, gold: 300 } : { gem: 6, shards: 5 };
}
export const canSign = save => save.calendar.last !== todayKey() && save.clock.maxSeen <= Date.now() + 1000;
export function sign(save) {
  if (!canSign(save)) return null;
  save.calendar.n = save.calendar.n % 28 + 1;
  save.calendar.last = todayKey();
  const g = calendarGift(save.calendar.n);
  grant(save, g);
  return g;
}

// ---------- 冒險寶庫（離線累積，最多 12 小時） ----------
export const VAULT_MAX_H = 12;
export function vaultHours(save) {
  const h = (Math.min(Date.now(), save.clock.maxSeen + 60000) - save.vault.since) / 3600000;
  return Math.max(0, Math.min(VAULT_MAX_H, h));
}
export function vaultContent(save, chapter) {
  const h = vaultHours(save);
  return { gem: Math.floor(h), gold: Math.floor(h * 200 * chapter), shards: Math.floor(h * 2) };
}
export const vaultReady = save => vaultHours(save) >= 1;
export function claimVault(save, chapter) {
  if (!clockOk(save) || !vaultReady(save)) return null;
  const g = vaultContent(save, chapter);
  save.vault.since = Date.now();
  grant(save, g);
  track(save, 'vault');
  return g;
}

// ---------- 戰鬥寶石（每天前 6 場勝利才給） ----------
export const WIN_GEMS = { casual: 0, easy: 3, normal: 5, hard: 8, hell: 12, nightmare: 16 };
export const WIN_GEM_DAILY = 6;
export function battleGems(save, diffId, win, cleared) {
  ensureEconomy(save);
  const day = todayKey();
  if (save.winGems.day !== day) save.winGems = { day, n: 0 };
  const base = WIN_GEMS[diffId] || 0;
  if (!base || save.winGems.n >= WIN_GEM_DAILY) return 0;
  const g = win ? base : cleared >= 10 ? Math.floor(base / 2) : 0;
  if (g && win) save.winGems.n++;
  return g;
}

// ---------- 首通獎勵（每個難度每章一次） ----------
export const FIRST_BASE = { casual: 30, easy: 50, normal: 80, hard: 120, hell: 180, nightmare: 260 };
export const firstClearGems = (diffId, ch) => ch > 10 ? 0 : Math.round(FIRST_BASE[diffId] * Math.min(2.5, 1 + 0.25 * (ch - 1)));
export function firstClear(save, diffId, ch) {
  ensureEconomy(save);
  const k = `${diffId}-${ch}`;
  if (save.clears[k]) return 0;
  save.clears[k] = true;
  return firstClearGems(diffId, ch);
}

// ---------- 無盡塔 ----------
const TOWER_K = { casual: 0.6, easy: 0.8, normal: 1, hard: 1.2, hell: 1.4, nightmare: 1.6 };
export const effectiveFloors = (diffId, floors) => Math.floor(floors * (TOWER_K[diffId] || 1));
export function towerWeekly(eff) {
  const t = [[50, 350], [40, 280], [30, 200], [20, 140], [15, 100], [10, 70], [5, 20]];
  for (const [f, g] of t) if (eff >= f) return g;
  return 0;
}
export function towerMilestones(save, floors) {
  ensureEconomy(save);
  let g = 0;
  for (const f of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
    if (floors >= f && !save.towerMiles.includes(f)) { save.towerMiles.push(f); g += f <= 50 ? f * 10 : 300; }
  }
  return g;
}

// ---------- 信件 ----------
export function sendMail(save, id, title, text, gift) {
  ensureEconomy(save);
  if (save.mail.some(m => m.id === id)) return false;
  save.mail.unshift({ id, title, text, gift, got: false, date: todayKey() });
  if (save.mail.length > 40) save.mail.length = 40;
  return true;
}
export const unreadMail = save => save.mail.filter(m => !m.got).length;
export function claimMail(save, id) {
  const m = save.mail.find(x => x.id === id);
  if (!m || m.got) return null;
  m.got = true;
  grant(save, m.gift);
  return m.gift;
}

// 第一次進到 3.2：老玩家補發首通、開服禮
export function welcomeMails(save, version, progress) {
  ensureEconomy(save);
  if (!save.econStarted) {
    save.econStarted = version;
    const veteran = (save.stats && save.stats.runs > 0);
    if (veteran) {
      // 補發：已經打通的章節，照首通表算
      let g = 0;
      for (const d of DIFFICULTIES) {
        const upTo = (progress[d.id] || 1) - 1;
        for (let ch = 1; ch <= upTo; ch++) g += firstClear(save, d.id, ch);
      }
      if (g) sendMail(save, 'backfill', '首通獎勵補發', '你在 3.2 之前打通的章節，首通寶石一次補給你', { gem: g });
      sendMail(save, 'open32', '寶石系統開放！', '感謝一路陪伴！寶石可以在 3.4 版開放的扭蛋使用，先存起來吧', { gem: 1000, heroTicket: 10 });
    }
    sendMail(save, 'newbie', '冒險者見面禮', '每天上線還有簽到、每日任務與冒險寶庫可以領寶石', { gem: 300, heroTicket: 5 });
  }
  // 每個新版本一封信
  const minor = version.split('.').slice(0, 2).join('.');
  sendMail(save, 'ver-' + minor, `v${minor} 更新禮物`, '謝謝你更新遊戲！', { gem: 100, heroTicket: 1 });
}
