// 3.14 活動碼：在「設定」輸入，一個存檔每個碼只能用一次（大小寫、空白、橫線都不影響）
// GM 碼可以重複輸入：全部資源補滿，而且之後每次回首頁都會自動補滿；同時拿到所有英雄（含隱藏）
import { HEROES } from './data.js';
import { grant } from './economy.js';
import { ensureHeroes } from './heroes.js';
import { ensureGear, GEMS, GEM_MAX, gemKey, BAG_MAX, MAX_ITEMS } from './gear.js';

export const CODES = {
  HELLOMARBLE: { gem: 50 },
  FIRSTBALL: { gold: 3000 },
  CUPCATCH: { gold: 5000, shards: 20 },
  LUCKY777: { gem: 77, stardust: 77 },
  HEROTICKET: { heroTicket: 1, gem: 50 },
  GEARTICKET: { gearTicket: 2 },
  PEGPARTY: { gem: 150, gold: 10000 },
  STARDUST500: { stardust: 500 },
  ANYFRAG50: { anyFrag: 50 },
  BOSSHUNTER: { gem: 300, shards: 100 },
  GOLDRUSH: { gold: 100000 },
  SUMMON10: { heroTicket: 10 },
  FORGE10: { gearTicket: 10, shards: 200 },
  GEM1000: { gem: 1000 },
  BRAVEPACK: { gem: 1500, heroTicket: 5, gearTicket: 5, gold: 50000 },
  LEGENDROAD: { gem: 3000, anyFrag: 200, stardust: 1000 },
  MILLIONAIRE: { gold: 1000000, shards: 1000 },
  GACHAKING: { heroTicket: 50, gearTicket: 50 },
  MARBLEGOD: { gem: 20000, gold: 5000000 },
  ULTIMATE2026: { gem: 99999, heroTicket: 200, gearTicket: 200, stardust: 9999, anyFrag: 999, shards: 9999, gold: 9999999 },
};
const GM_CODE = 'HIKARIISGOD';
export const GM_MAX = 999999999;

const norm = s => String(s || '').toUpperCase().replace(/[\s\-_]/g, '');

// GM：全部資源補滿（每次回首頁也會呼叫）
export function gmTopUp(save) {
  if (!save.gm) return;
  save.gold = GM_MAX;
  for (const k of ['gem', 'stardust', 'heroTicket', 'gearTicket', 'anyFrag']) save.wallet[k] = GM_MAX;
  const gear = ensureGear(save);
  gear.shards = GM_MAX;
  gear.bagExtra = BAG_MAX - MAX_ITEMS; // 背包直接擴到最大
  for (const id of Object.keys(GEMS)) for (let lv = 1; lv <= GEM_MAX; lv++) gear.gems[gemKey(id, lv)] = Math.max(gear.gems[gemKey(id, lv)] || 0, 99);
}

// 回傳 { ok, msg, gift?, gm? }
export function redeem(save, raw) {
  const code = norm(raw);
  if (!code) return { ok: false, msg: '請輸入活動碼' };
  if (code === GM_CODE) {
    save.gm = true;
    for (const h of HEROES) if (!save.owned.includes(h.id)) save.owned.push(h.id);
    ensureHeroes(save);
    gmTopUp(save);
    return { ok: true, gm: true, msg: 'GM 模式開啟：全部資源無上限，所有英雄（含隱藏）已加入！' };
  }
  const gift = CODES[code];
  if (!gift) return { ok: false, msg: '活動碼不存在，請再確認一次' };
  save.codes = save.codes || [];
  if (save.codes.includes(code)) return { ok: false, msg: '這個活動碼已經用過了' };
  save.codes.push(code);
  if (gift.anyFrag) save.wallet.anyFrag = (save.wallet.anyFrag || 0) + gift.anyFrag;
  grant(save, gift);
  return { ok: true, gift, msg: '兌換成功！' };
}
