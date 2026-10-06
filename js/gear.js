// 裝備系統 2.0
// 8 個欄位：武器、頭盔、護甲、手套、靴子、項鍊、戒指 x2
// 每件裝備：主屬性（看種類）＋隨機副屬性（稀有度越高越多條）＋強化等級（+0～+15）＋附魔（一條額外屬性）
// 飾品（項鍊、戒指）另外有「等級」與「飾品技能」：等級 3、6、10 解鎖並強化技能，在冒險中自動發動
// 3 件同種類、同稀有度可以合成升階；不要的分解成金幣與魔晶（魔晶用來附魔、精煉飾品）
// 存在 save.gear = { v: 2, items: [...], equip: { weapon, helm, armor, gloves, boots, necklace, ring1, ring2 }, nextId, shards }

// ---------- 屬性 ----------
// unit：'%' 表示存的數字是百分比；base = 普通品質副屬性的基準值
export const STATS = {
  atk: { name: '攻擊力', unit: '%', base: 3 },
  hp: { name: '血量', unit: '%', base: 4 },
  crit: { name: '暴擊率', unit: '%', base: 1.2 },
  critDmg: { name: '暴擊傷害', unit: '%', base: 6 },
  spd: { name: '攻擊速度', unit: '%', base: 2 },
  ball: { name: '每殺掉球', unit: '', base: 0.3 },
  coin: { name: '開局球幣', unit: '', base: 15 },
  gold: { name: '結算金幣', unit: '%', base: 3 },
  life: { name: '吸血', unit: '%', base: 1 },
  dr: { name: '減傷', unit: '%', base: 1.5 },
  block: { name: '格擋', unit: '%', base: 1.5 },
  bossDmg: { name: '對菁英魔王', unit: '%', base: 4 },
  regen: { name: '每波回血', unit: '%', base: 1.5 },
};
const AFFIX_POOL = Object.keys(STATS);
export const statText = (stat, v) => {
  const s = STATS[stat];
  const n = s.unit === '%' || v >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
  return `${s.name} +${n}${s.unit}`;
};

// ---------- 種類與欄位 ----------
export const TYPES = {
  weapon: { name: '武器', main: 'atk', base: 6, icons: [424, 426, 380, 476, 378], names: ['短劍', '長劍', '龍骨劍', '聖劍', '神話之刃'] },
  helm: { name: '頭盔', main: 'hp', base: 4, icons: [33, 34, 32, 35, 36], names: ['皮帽', '鐵盔', '騎士盔', '王者冠盔', '神話頭冠'] },
  armor: { name: '護甲', main: 'hp', base: 7, icons: [81, 83, 82, 84, 85], names: ['皮甲', '鎖子甲', '秘銀甲', '聖戰甲', '神話戰衣'] },
  gloves: { name: '手套', main: 'crit', base: 1.5, icons: [41, 42, 90, 91, 41], names: ['布手套', '皮手套', '獵人手套', '影之護手', '神話之握'] },
  boots: { name: '靴子', main: 'spd', base: 3, icons: [39, 40, 88, 89, 39], names: ['草鞋', '皮靴', '疾風靴', '天馬靴', '神話之履'] },
  necklace: { name: '項鍊', main: 'critDmg', base: 8, jewel: true, icons: [86, 87, 86, 87, 87], names: ['木項鍊', '銀項鍊', '月光項鍊', '龍心項鍊', '神話之心'] },
  ring: { name: '戒指', main: null, base: 0, jewel: true, icons: [337, 338, 339, 340, 340], names: ['銅戒', '銀戒', '寶石戒', '傳說之戒', '神話之戒'] },
};
// 戒指的主屬性隨機一種
const RING_MAINS = ['atk', 'hp', 'ball', 'gold', 'coin', 'crit'];
export const SLOTS = {
  weapon: { name: '武器', type: 'weapon' },
  helm: { name: '頭盔', type: 'helm' },
  armor: { name: '護甲', type: 'armor' },
  gloves: { name: '手套', type: 'gloves' },
  boots: { name: '靴子', type: 'boots' },
  necklace: { name: '項鍊', type: 'necklace' },
  ring1: { name: '戒指', type: 'ring' },
  ring2: { name: '戒指', type: 'ring' },
};
export const slotsFor = type => Object.keys(SLOTS).filter(k => SLOTS[k].type === type);

// mult = 數值倍率；weight = 掉落機率；affix = 副屬性條數；salvage = 分解金幣；shard = 分解魔晶
export const RARITIES = [
  { id: 0, name: '普通', color: '#cfcfcf', mult: 1, weight: 60, affix: 0, salvage: 15, shard: 1 },
  { id: 1, name: '稀有', color: '#36d6ff', mult: 1.8, weight: 28, affix: 1, salvage: 40, shard: 3 },
  { id: 2, name: '史詩', color: '#d06bff', mult: 3, weight: 10, affix: 2, salvage: 120, shard: 8 },
  { id: 3, name: '傳說', color: '#ffb820', mult: 5, weight: 2, affix: 3, salvage: 400, shard: 20 },
  { id: 4, name: '神話', color: '#ff4d6d', mult: 8, weight: 0.3, affix: 4, salvage: 1200, shard: 50 },
];
export const MAX_RARITY = RARITIES.length - 1;
export const MAX_ITEMS = 40;
export const MAX_PLUS = 15;

// ---------- 飾品技能 ----------
// power = 這個技能目前的強度（看飾品等級的階段與稀有度）
export const JEWEL_SKILLS = {
  thunder: { name: '雷霆', base: 120, desc: p => `每 6 秒雷擊 3 隻敵人（${p}% 攻擊力）` },
  star: { name: '星隕', base: 90, desc: p => `每 9 秒流星打中所有敵人（${p}% 攻擊力）` },
  regen: { name: '生命泉', base: 3, desc: p => `每 5 秒回復 ${p}% 血量` },
  guard: { name: '守護', base: 10, desc: p => `每波開始獲得 ${p}% 血量的護盾` },
  fury: { name: '狂怒', base: 20, desc: p => `血量低於一半時攻擊力 +${p}%` },
  frost: { name: '霜寒', base: 12, desc: p => `攻擊讓敵人攻速 -${p}%` },
  midas: { name: '點金', base: 2, desc: p => `每擊敗一隻敵人 +${p} 球幣` },
  lucky: { name: '幸運', base: 8, desc: p => `菁英、寶箱怪掉技能機率 +${p}%` },
};
const JEWEL_IDS = Object.keys(JEWEL_SKILLS);
export const JEWEL_MAX_LV = 10;
export const jewelExpNeed = lv => 40 + lv * 30;
const TIER_MUL = [0, 1, 1.6, 2.5];
export const jewelTier = lv => (lv >= 10 ? 3 : lv >= 6 ? 2 : lv >= 3 ? 1 : 0);
export function jewelPower(it) {
  const t = jewelTier(it.jlv || 1);
  if (!t) return 0;
  const sk = JEWEL_SKILLS[it.skill];
  const p = sk.base * TIER_MUL[t] * (1 + it.rarity * 0.15);
  return p >= 10 ? Math.round(p) : Math.round(p * 10) / 10;
}

// ---------- 存檔 ----------
const rand = (a, b) => a + Math.random() * (b - a);
const r1 = v => Math.round(v * 10) / 10;

export function ensureGear(save) {
  if (!save.gear) save.gear = { v: 2, items: [], equip: {}, nextId: 1, shards: 0 };
  const g = save.gear;
  if (g.v !== 2) migrate(g);
  if (g.shards === undefined) g.shards = 0;
  return g;
}
// 舊版裝備（武器、防具、飾品三欄）轉成新版
function migrate(g) {
  const charmMain = { crit: 'crit', ball: 'ball', coin: 'coin', gold: 'gold' };
  for (const it of g.items) {
    if (it.type) continue;
    if (it.slot === 'weapon') { it.type = 'weapon'; it.main = 'atk'; }
    else if (it.slot === 'armor') { it.type = 'armor'; it.main = 'hp'; }
    else { it.type = 'ring'; it.main = charmMain[it.charm] || 'atk'; it.jlv = 1; it.jexp = 0; it.skill = JEWEL_IDS[Math.floor(Math.random() * JEWEL_IDS.length)]; }
    it.affixes = [];
    it.plus = 0;
    delete it.slot; delete it.charm;
  }
  const old = g.equip || {};
  g.equip = {};
  if (old.weapon) g.equip.weapon = old.weapon;
  if (old.armor) g.equip.armor = old.armor;
  if (old.charm) g.equip.ring1 = old.charm;
  g.v = 2;
}

function makeItem(gear, type, rarity) {
  const T = TYPES[type];
  const r = RARITIES[rarity];
  const it = { id: gear.nextId++, type, rarity, plus: 0, fresh: true, affixes: [] };
  it.main = T.main || RING_MAINS[Math.floor(Math.random() * RING_MAINS.length)];
  it.value = r1((T.main ? T.base : STATS[it.main].base * 1.6) * r.mult);
  // 副屬性：不重複、不跟主屬性一樣
  const pool = AFFIX_POOL.filter(s => s !== it.main);
  for (let i = 0; i < r.affix; i++) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    it.affixes.push({ stat: k, value: r1(STATS[k].base * r.mult * rand(0.6, 1.2)) || 0.1 });
  }
  if (T.jewel) { it.jlv = 1; it.jexp = 0; it.skill = JEWEL_IDS[Math.floor(Math.random() * JEWEL_IDS.length)]; }
  return it;
}

export const itemName = it => TYPES[it.type].names[it.rarity] + (it.plus ? ` +${it.plus}` : '');
export const itemIcon = it => ['ic', TYPES[it.type].icons[it.rarity], RARITIES[it.rarity].color];
// 主屬性實際數值（強化每級 +10%）
export const mainValue = it => r1(it.value * (1 + 0.1 * (it.plus || 0)));
export const itemDesc = it => statText(it.main, mainValue(it));

// ---------- 掉落 ----------
const TYPE_WEIGHTS = { weapon: 3, helm: 2, armor: 2, gloves: 2, boots: 2, necklace: 1.2, ring: 1.6 };
function randomType() {
  const total = Object.values(TYPE_WEIGHTS).reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (const [k, w] of Object.entries(TYPE_WEIGHTS)) { x -= w; if (x <= 0) return k; }
  return 'weapon';
}
function randomRarity(diffIndex) {
  const w = RARITIES.map((r, k) => r.weight * Math.pow(1 + diffIndex * 0.45, k));
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  let rarity = 0;
  for (; rarity < MAX_RARITY; rarity++) { x -= w[rarity]; if (x <= 0) break; }
  return rarity;
}
export function rollDrops(save, cleared, win, diffIndex) {
  const gear = ensureGear(save);
  let count = Math.min(7, Math.floor(cleared / 4) + (win ? 2 : 0) + (diffIndex >= 3 ? 1 : 0));
  if (cleared >= 3) count = Math.max(1, count);
  const drops = [];
  for (let i = 0; i < count; i++) drops.push(makeItem(gear, randomType(), randomRarity(diffIndex)));
  gear.items.push(...drops);
  // 背包滿了：自動分解最差的、沒穿在身上的
  let salvaged = 0;
  while (gear.items.length > MAX_ITEMS) {
    const worn = new Set(Object.values(gear.equip));
    const cand = gear.items.filter(it => !worn.has(it.id) && !it.lock).sort((a, b) => a.rarity - b.rarity || (a.plus || 0) - (b.plus || 0))[0];
    if (!cand) break;
    gear.items.splice(gear.items.indexOf(cand), 1);
    salvaged += RARITIES[cand.rarity].salvage;
    gear.shards += RARITIES[cand.rarity].shard;
  }
  save.gold += salvaged;
  return { drops, salvaged };
}
export function grantItem(save, rarity) {
  const gear = ensureGear(save);
  const it = makeItem(gear, randomType(), rarity);
  gear.items.push(it);
  return it;
}

// ---------- 加成 ----------
export function gearBonus(save) {
  const gear = ensureGear(save);
  const b = { skills: {} };
  for (const k of AFFIX_POOL) b[k] = 0;
  const add = (stat, v) => { b[stat] += STATS[stat].unit === '%' ? v / 100 : v; };
  for (const id of Object.values(gear.equip)) {
    const it = gear.items.find(x => x.id === id);
    if (!it) continue;
    add(it.main, mainValue(it));
    for (const a of it.affixes) add(a.stat, a.value);
    if (it.ench) add(it.ench.stat, it.ench.value);
    if (it.skill) {
      const p = jewelPower(it);
      if (p) b.skills[it.skill] = (b.skills[it.skill] || 0) + p;
    }
  }
  return b;
}

// ---------- 穿脫 ----------
export function equippedIn(save, slot) {
  const gear = ensureGear(save);
  return gear.items.find(x => x.id === gear.equip[slot]) || null;
}
// 這件要穿到哪一格（戒指：先放空的那格，都滿了換掉比較差的那只）
export function targetSlot(save, it) {
  const slots = slotsFor(it.type);
  if (slots.length === 1) return slots[0];
  const empty = slots.find(s => !equippedIn(save, s));
  if (empty) return empty;
  return slots.slice().sort((a, b) => score(equippedIn(save, a)) - score(equippedIn(save, b)))[0];
}
export function equip(save, id) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === id);
  if (!it) return;
  for (const s of slotsFor(it.type)) if (gear.equip[s] === id) return; // 已經穿著
  gear.equip[targetSlot(save, it)] = id;
}
export function unequip(save, slot) { delete ensureGear(save).equip[slot]; }
export const isWorn = (save, id) => Object.values(ensureGear(save).equip).includes(id);

// 粗略的好壞分數：主屬性（含強化）＋副屬性＋附魔，都換算成「幾倍基準值」
export function score(it) {
  if (!it) return -1;
  const base = TYPES[it.type].main ? TYPES[it.type].base : STATS[it.main].base * 1.6;
  let s = mainValue(it) / base;
  for (const a of it.affixes) s += a.value / STATS[a.stat].base * 0.4;
  if (it.ench) s += it.ench.value / STATS[it.ench.stat].base * 0.4;
  return s;
}
export function isBetter(save, it) {
  if (isWorn(save, it.id)) return false;
  const cur = equippedIn(save, targetSlot(save, it));
  if (!cur) return true;
  if (it.type === 'ring' && cur.main !== it.main) return score(it) > score(cur) * 1.3;
  return score(it) > score(cur);
}

// ---------- 強化 ----------
export const enhanceCost = it => Math.round(80 * Math.pow(1.4, it.plus || 0) * (1 + it.rarity * 0.6));
export const enhanceRate = it => {
  const p = it.plus || 0;
  if (p < 5) return 1;
  if (p < 10) return 0.9 - (p - 5) * 0.06;
  return Math.max(0.2, 0.55 - (p - 10) * 0.07);
};
// 回傳 'ok' / 'fail' / 原因
export function enhance(save, id) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === id);
  if (!it) return 'none';
  if ((it.plus || 0) >= MAX_PLUS) return 'max';
  const c = enhanceCost(it);
  if (save.gold < c) return 'gold';
  save.gold -= c;
  if (Math.random() < enhanceRate(it)) { it.plus = (it.plus || 0) + 1; return 'ok'; }
  return 'fail';
}

// ---------- 附魔 ----------
export const enchantCost = it => 3 + it.rarity * 3;
export function enchant(save, id) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === id);
  if (!it || gear.shards < enchantCost(it)) return null;
  gear.shards -= enchantCost(it);
  const pool = AFFIX_POOL.filter(s => s !== it.main);
  const k = pool[Math.floor(Math.random() * pool.length)];
  it.ench = { stat: k, value: r1(STATS[k].base * RARITIES[it.rarity].mult * rand(0.9, 1.5)) || 0.1 };
  return it.ench;
}

// ---------- 飾品精煉 ----------
// 用魔晶給飾品經驗：1 魔晶 = 15 經驗；回傳升了幾級
export const REFINE_SHARDS = 5;
export function addJewelExp(it, exp) {
  if (!it.skill) return 0;
  let ups = 0;
  it.jexp = (it.jexp || 0) + exp;
  while ((it.jlv || 1) < JEWEL_MAX_LV && it.jexp >= jewelExpNeed(it.jlv || 1)) {
    it.jexp -= jewelExpNeed(it.jlv || 1);
    it.jlv = (it.jlv || 1) + 1;
    ups++;
  }
  if (it.jlv >= JEWEL_MAX_LV) it.jexp = 0;
  return ups;
}
export function refine(save, id) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === id);
  if (!it || !it.skill || it.jlv >= JEWEL_MAX_LV || gear.shards < REFINE_SHARDS) return -1;
  gear.shards -= REFINE_SHARDS;
  return addJewelExp(it, REFINE_SHARDS * 15);
}
// 冒險結束：身上的飾品拿經驗（每完成一波 +4）
export function jewelRideExp(save, waves) {
  const gear = ensureGear(save);
  const out = [];
  for (const s of ['necklace', 'ring1', 'ring2']) {
    const it = equippedIn(save, s);
    if (!it || waves <= 0) continue;
    const ups = addJewelExp(it, waves * 4);
    if (ups) out.push({ it, ups });
  }
  return out;
}

// ---------- 分解、合成 ----------
export function salvage(save, id) {
  const gear = ensureGear(save);
  const i = gear.items.findIndex(x => x.id === id);
  if (i < 0 || isWorn(save, id)) return null;
  const it = gear.items[i];
  gear.items.splice(i, 1);
  const r = RARITIES[it.rarity];
  const g = Math.round(r.salvage * (1 + (it.plus || 0) * 0.3));
  save.gold += g;
  gear.shards += r.shard;
  return { gold: g, shards: r.shard };
}
// 一鍵分解：沒穿、沒上鎖、普通品質、也不比身上好的
export function salvageJunk(save) {
  const gear = ensureGear(save);
  const junk = gear.items.filter(it => it.rarity === 0 && !it.lock && !it.plus && !isWorn(save, it.id) && !isBetter(save, it));
  let g = 0, sh = 0;
  for (const it of junk) { const r = salvage(save, it.id); g += r.gold; sh += r.shards; }
  return { n: junk.length, g, shards: sh };
}
// 3 件同種類、同稀有度 → 高一階的 1 件（強化等級取最高的，飾品等級也取最高的）
function mergeGroups(save) {
  const gear = ensureGear(save);
  const groups = new Map();
  for (const it of gear.items) {
    if (isWorn(save, it.id) || it.lock || it.rarity >= MAX_RARITY) continue;
    const key = `${it.type}|${it.rarity}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return groups;
}
export function mergeAll(save) {
  const gear = ensureGear(save);
  const made = [];
  let found = true;
  while (found) {
    found = false;
    for (const list of mergeGroups(save).values()) {
      if (list.length < 3) continue;
      const three = list.slice(0, 3);
      gear.items = gear.items.filter(x => !three.includes(x));
      const up = makeItem(gear, three[0].type, three[0].rarity + 1);
      up.plus = Math.max(...three.map(x => x.plus || 0));
      if (up.skill) {
        const best = three.reduce((a, b) => ((a.jlv || 1) >= (b.jlv || 1) ? a : b));
        up.jlv = best.jlv || 1; up.skill = best.skill;
        if (three[0].type === 'ring') up.main = best.main;
      }
      gear.items.push(up);
      made.push(up);
      found = true;
      break;
    }
  }
  return made;
}
export function mergeableCount(save) {
  let n = 0;
  for (const list of mergeGroups(save).values()) n += Math.floor(list.length / 3);
  return n;
}
export const freshCount = save => ensureGear(save).items.filter(it => it.fresh).length;
