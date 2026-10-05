// 裝備：武器（攻擊）、防具（血量）、飾品（特殊能力）
// 每局結算時掉落；3 件同欄位、同稀有度可以合成成高一級；不要的可以分解換金幣
// 存在存檔 save.gear = { items: [...], equip: { weapon, armor, charm }, nextId }

export const SLOTS = {
  weapon: { name: '武器', icons: [424, 426, 380, 476] },
  armor: { name: '防具', icons: [233, 234, 235, 236] },
  charm: { name: '飾品', icons: [337, 338, 339, 340] },
};

// mult = 數值倍率；weight = 基本掉落機率
export const RARITIES = [
  { id: 0, name: '普通', color: '#cfcfcf', mult: 1, weight: 60, salvage: 15 },
  { id: 1, name: '稀有', color: '#36d6ff', mult: 1.8, weight: 28, salvage: 40 },
  { id: 2, name: '史詩', color: '#d06bff', mult: 3, weight: 10, salvage: 120 },
  { id: 3, name: '傳說', color: '#ffb820', mult: 5, weight: 2, salvage: 400 },
];

const WEAPON_NAMES = ['生鏽短劍', '精鋼長劍', '龍骨大劍', '傳說聖劍'];
const ARMOR_NAMES = ['皮革護甲', '鎖子甲', '秘銀鎧甲', '神聖戰甲'];
// 飾品有四種效果，掉落時隨機一種
const CHARMS = {
  crit: { name: '鷹眼護符', per: 2, unit: '% 暴擊率' },
  ball: { name: '招財貓', per: 0.5, unit: ' 每殺一隻多掉的球' },
  coin: { name: '幸運金幣', per: 25, unit: ' 開局球幣' },
  gold: { name: '黃金戒指', per: 6, unit: '% 結算金幣' },
};
const BASE = { weapon: 6, armor: 8 }; // 普通武器 +6% 攻擊、普通防具 +8% 血量
export const MAX_ITEMS = 30;

export function ensureGear(save) {
  if (!save.gear) save.gear = { items: [], equip: {}, nextId: 1 };
  return save.gear;
}

function makeItem(gear, slot, rarity, charmType) {
  const r = RARITIES[rarity];
  const item = { id: gear.nextId++, slot, rarity, fresh: true }; // fresh = 背包裡顯示「新」
  if (slot === 'charm') {
    item.charm = charmType || Object.keys(CHARMS)[Math.floor(Math.random() * 4)];
    item.value = +(CHARMS[item.charm].per * r.mult).toFixed(1);
  } else {
    item.value = Math.round(BASE[slot] * r.mult);
  }
  return item;
}

export function itemName(it) {
  if (it.slot === 'weapon') return WEAPON_NAMES[it.rarity];
  if (it.slot === 'armor') return ARMOR_NAMES[it.rarity];
  return CHARMS[it.charm].name;
}

export function itemDesc(it) {
  if (it.slot === 'weapon') return `攻擊力 +${it.value}%`;
  if (it.slot === 'armor') return `血量 +${it.value}%`;
  const c = CHARMS[it.charm];
  return `+${it.value}${c.unit}`;
}

export function itemIcon(it) {
  return ['ic', SLOTS[it.slot].icons[it.rarity], RARITIES[it.rarity].color];
}

// 結算掉落：通過的波數越多、難度越高，掉越多、越稀有
export function rollDrops(save, cleared, win, diffIndex) {
  const gear = ensureGear(save);
  let count = Math.min(6, Math.floor(cleared / 5) + (win ? 2 : 0) + (diffIndex >= 3 ? 1 : 0));
  if (cleared >= 3) count = Math.max(1, count);
  const drops = [];
  for (let i = 0; i < count; i++) {
    // 難度越高，往稀有方向偏移
    const w = RARITIES.map((r, k) => r.weight * Math.pow(1 + diffIndex * 0.45, k));
    let x = Math.random() * w.reduce((a, b) => a + b, 0);
    let rarity = 0;
    for (; rarity < 3; rarity++) { x -= w[rarity]; if (x <= 0) break; }
    const slot = ['weapon', 'armor', 'charm'][Math.floor(Math.random() * 3)];
    drops.push(makeItem(gear, slot, rarity));
  }
  // 背包滿了：自動分解最差的、沒穿在身上的
  let salvaged = 0;
  gear.items.push(...drops);
  while (gear.items.length > MAX_ITEMS) {
    const worn = new Set(Object.values(gear.equip));
    const cand = gear.items.filter(it => !worn.has(it.id)).sort((a, b) => a.rarity - b.rarity)[0];
    if (!cand) break;
    gear.items.splice(gear.items.indexOf(cand), 1);
    salvaged += RARITIES[cand.rarity].salvage;
  }
  save.gold += salvaged;
  return { drops, salvaged };
}

// 身上裝備加總起來的能力（給 createHero、開局、結算用）
export function gearBonus(save) {
  const gear = ensureGear(save);
  const b = { atk: 0, hp: 0, crit: 0, ball: 0, coin: 0, gold: 0 };
  for (const id of Object.values(gear.equip)) {
    const it = gear.items.find(x => x.id === id);
    if (!it) continue;
    if (it.slot === 'weapon') b.atk += it.value / 100;
    else if (it.slot === 'armor') b.hp += it.value / 100;
    else if (it.charm === 'crit') b.crit += it.value / 100;
    else if (it.charm === 'ball') b.ball += it.value;
    else if (it.charm === 'coin') b.coin += it.value;
    else if (it.charm === 'gold') b.gold += it.value / 100;
  }
  return b;
}

// 直接給一件指定稀有度的隨機裝備（每日挑戰獎勵用）
export function grantItem(save, rarity) {
  const gear = ensureGear(save);
  const slot = ['weapon', 'armor', 'charm'][Math.floor(Math.random() * 3)];
  const it = makeItem(gear, slot, rarity);
  gear.items.push(it);
  return it;
}

export function equip(save, id) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === id);
  if (it) gear.equip[it.slot] = id;
}
export function unequip(save, slot) { delete ensureGear(save).equip[slot]; }

export function salvage(save, id) {
  const gear = ensureGear(save);
  const i = gear.items.findIndex(x => x.id === id);
  if (i < 0) return 0;
  const it = gear.items[i];
  if (Object.values(gear.equip).includes(id)) return 0;
  gear.items.splice(i, 1);
  const g = RARITIES[it.rarity].salvage;
  save.gold += g;
  return g;
}

// 一鍵合成：同欄位、同稀有度（飾品還要同效果）的 3 件 → 高一級的 1 件。回傳合成出的新裝備
export function mergeAll(save) {
  const gear = ensureGear(save);
  const made = [];
  let found = true;
  while (found) {
    found = false;
    const worn = new Set(Object.values(gear.equip));
    const groups = new Map();
    for (const it of gear.items) {
      if (worn.has(it.id) || it.rarity >= 3) continue;
      const key = `${it.slot}|${it.rarity}|${it.charm || ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    for (const list of groups.values()) {
      if (list.length < 3) continue;
      const [a, b2, c] = list;
      gear.items = gear.items.filter(x => x !== a && x !== b2 && x !== c);
      const up = makeItem(gear, a.slot, a.rarity + 1, a.charm);
      gear.items.push(up);
      made.push(up);
      found = true;
      break;
    }
  }
  return made;
}

export function mergeableCount(save) {
  const gear = ensureGear(save);
  const worn = new Set(Object.values(gear.equip));
  const groups = new Map();
  for (const it of gear.items) {
    if (worn.has(it.id) || it.rarity >= 3) continue;
    const key = `${it.slot}|${it.rarity}|${it.charm || ''}`;
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  let n = 0;
  for (const c of groups.values()) n += Math.floor(c / 3);
  return n;
}

// 跟身上同欄位的裝備比：這件比較好嗎？（飾品只跟同效果的比；欄位空著就算比較好）
export function equippedIn(save, slot) {
  const gear = ensureGear(save);
  return gear.items.find(x => x.id === gear.equip[slot]) || null;
}
export function isBetter(save, it) {
  const cur = equippedIn(save, it.slot);
  if (!cur) return true;
  if (cur.id === it.id) return false;
  if (it.slot === 'charm' && cur.charm !== it.charm) return false;
  return it.value > cur.value;
}
// 一鍵分解：沒穿、也不比身上好的「普通」裝備
export function salvageJunk(save) {
  const gear = ensureGear(save);
  const worn = new Set(Object.values(gear.equip));
  const junk = gear.items.filter(it => it.rarity === 0 && !worn.has(it.id) && !isBetter(save, it));
  gear.items = gear.items.filter(it => !junk.includes(it));
  const g = junk.reduce((a, it) => a + RARITIES[it.rarity].salvage, 0);
  save.gold += g;
  return { n: junk.length, g };
}
export const freshCount = save => ensureGear(save).items.filter(it => it.fresh).length;
