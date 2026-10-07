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
  { id: 0, name: '普通', color: '#cfcfcf', mult: 1, old: 1, weight: 60, affix: 0, salvage: 15, shard: 1 },
  { id: 1, name: '稀有', color: '#36d6ff', mult: 1.6, old: 1.8, weight: 28, affix: 1, salvage: 40, shard: 3 },
  { id: 2, name: '史詩', color: '#d06bff', mult: 2.4, old: 3, weight: 10, affix: 2, salvage: 120, shard: 8 },
  { id: 3, name: '傳說', color: '#ffb820', mult: 3.4, old: 5, weight: 2, affix: 3, salvage: 400, shard: 20 },
  { id: 4, name: '神話', color: '#ff4d6d', mult: 4.5, old: 8, weight: 0.3, affix: 4, salvage: 1200, shard: 50 },
];
export const MAX_RARITY = RARITIES.length - 1;
export const MAX_ITEMS = 40; // 基本容量（3.15 起可以擴充，實際容量看 bagCap）
// 3.15 背包擴充：每次 +10 格，最多 200 格；用寶石或金幣買，越後面越貴
export const BAG_STEP = 10, BAG_MAX = 200;
export const bagCap = save => Math.min(BAG_MAX, MAX_ITEMS + (ensureGear(save).bagExtra || 0));
export function expandCost(save) {
  const k = (ensureGear(save).bagExtra || 0) / BAG_STEP;
  return { gem: 60 + 40 * k, gold: 30000 * (k + 1) };
}
// pay = 'gem' | 'gold'；成功回傳新容量
export function expandBag(save, pay) {
  const gear = ensureGear(save);
  if (bagCap(save) >= BAG_MAX) return 0;
  const c = expandCost(save);
  if (pay === 'gem') { if ((save.wallet && save.wallet.gem || 0) < c.gem) return 0; save.wallet.gem -= c.gem; }
  else { if (save.gold < c.gold) return 0; save.gold -= c.gold; }
  gear.bagExtra = (gear.bagExtra || 0) + BAG_STEP;
  return bagCap(save);
}
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

// ---------- 套裝 ----------
// 稀有以上的裝備有機會屬於某個套裝；穿 2 件、4 件同套裝會有額外效果
export const SETS = {
  berserk: { name: '狂戰', color: '#ff6b6b', two: [['atk', 10]], four: [['hits', 1]], d2: '攻擊力 +10%', d4: '攻擊次數 +1' },
  guard: { name: '守護', color: '#6dff8a', two: [['hp', 15]], four: [['shield', 25]], d2: '血量 +15%', d4: '每波開始獲得 25% 血量護盾' },
  gale: { name: '疾風', color: '#36d6ff', two: [['spd', 10]], four: [['dbl', 20]], d2: '攻擊速度 +10%', d4: '連擊機率 +20%' },
  fortune: { name: '財神', color: '#ffd84a', two: [['gold', 15]], four: [['coin', 100], ['midas', 3]], d2: '結算金幣 +15%', d4: '開局球幣 +100、每擊敗一隻 +3 球幣' },
  hunter: { name: '獵王', color: '#ff9f43', two: [['crit', 6]], four: [['bossDmg', 40]], d2: '暴擊率 +6%', d4: '對菁英、魔王傷害 +40%' },
  arcane: { name: '秘法', color: '#d06bff', two: [['splash', 15]], four: [['arcane', 150]], d2: '每次攻擊濺射全體 15%', d4: '每 8 秒秘法爆發打全體（150%）' },
  // 3.6 刻印套裝：只有「鍛造召喚」抽得到（傳說），可以升到 5 星
  phoenix: { name: '不死鳥', pool: 'imprint', color: '#ff8a3b', two: [['hp', 20]], four: [['phoenix', 1], ['regen', 6]], d2: '血量 +20%', d4: '每局一次：倒下時浴火重生；每波回血 +6%' },
  tempest: { name: '暴風', pool: 'imprint', color: '#7fe8ff', two: [['spd', 12]], four: [['dbl', 30], ['spd', 10]], d2: '攻擊速度 +12%', d4: '連擊機率 +30%、攻擊速度再 +10%' },
  reaper: { name: '死神', pool: 'imprint', color: '#b9a8ff', two: [['critDmg', 30]], four: [['bossDmg', 50], ['crit', 8]], d2: '暴擊傷害 +30%', d4: '對菁英、魔王傷害 +50%、暴擊率 +8%' },
  starfall: { name: '星落', pool: 'imprint', color: '#c8b6ff', two: [['splash', 20]], four: [['arcane', 250]], d2: '每次攻擊濺射全體 20%', d4: '每 8 秒星落爆發打全體（250%）' },
  // 3.6 冒險套裝：挑戰（含）以上難度才會掉（史詩以上）
  warlord: { name: '軍閥', pool: 'adv', color: '#ff5a5a', two: [['atk', 12]], four: [['hits', 1], ['atk', 10]], d2: '攻擊力 +12%', d4: '攻擊次數 +1、攻擊力再 +10%' },
  sentinel: { name: '哨兵', pool: 'adv', color: '#9fd6a8', two: [['dr', 6], ['block', 6]], four: [['shield', 35]], d2: '減傷 +6%、格擋 +6%', d4: '每波開始獲得 35% 血量護盾' },
  stormcall: { name: '喚雷', pool: 'adv', color: '#ffe066', two: [['crit', 6], ['spd', 6]], four: [['storm', 1]], d2: '暴擊率 +6%、攻擊速度 +6%', d4: '每 4 次攻擊放出連鎖閃電（+120% 傷害）' },
};
const SET_IDS = Object.keys(SETS).filter(k => !SETS[k].pool);
export const IMPRINT_SETS = Object.keys(SETS).filter(k => SETS[k].pool === 'imprint');
export const ADV_SETS = Object.keys(SETS).filter(k => SETS[k].pool === 'adv');
const SET_CHANCE = [0, 0.45, 0.65, 1, 1];

// ---------- 傳說特效 ----------
// 傳說、神話裝備會帶一個獨特效果（看裝備種類）
export const UNIQUES = {
  vamp: { name: '吸血之刃', types: ['weapon'], desc: '擊敗敵人回復 4% 血量' },
  execute: { name: '斬首', types: ['weapon'], desc: '對血量 30% 以下的敵人傷害 +60%' },
  storm: { name: '雷鳴', types: ['weapon'], desc: '每 5 次攻擊放出連鎖閃電（+150% 傷害）' },
  thornmail: { name: '荊棘鎧', types: ['helm', 'armor'], desc: '被打時反彈 80% 傷害' },
  undying: { name: '不屈', types: ['helm', 'armor'], desc: '每波第一次受到致命傷時保留 1 點血' },
  bulwark: { name: '堡壘', types: ['helm', 'armor'], desc: '格擋 +12%，格擋時回復 2% 血量' },
  haste: { name: '先發制人', types: ['gloves', 'boots'], desc: '每波開始 6 秒內攻擊速度 +60%' },
  flurry: { name: '亂舞', types: ['gloves', 'boots'], desc: '攻擊次數 +1' },
  phantom: { name: '幻影', types: ['gloves', 'boots'], desc: '閃避 +12%' },
  greed: { name: '貪婪', types: ['necklace', 'ring'], desc: '接到的球幣 +15%' },
  bounty: { name: '賞金', types: ['necklace', 'ring'], desc: '菁英、魔王被擊敗時多掉 20 顆球' },
  scholar: { name: '學者', types: ['necklace', 'ring'], desc: '技能商店價格 -10%' },
};
const uniquesFor = type => Object.keys(UNIQUES).filter(k => UNIQUES[k].types.includes(type));

// ---------- 3.6 傳家武器：每位初始英雄一把，「鍛造召喚」抽得到，可以升到 5 星 ----------
// 帶著對應英雄（主職業）出戰才有特效：攻擊力 +10%（每星再 +3%）＋專屬效果（每星再強一點）
export const HEIRLOOMS = {
  blade: { name: '王者之劍', desc: s => `劍氣傷害 +${40 + s * 10}%`, apply: (h, s) => { h.swordMul *= 1.4 + s * 0.1; } },
  archer: { name: '風神弓', desc: s => `球雨箭需要接球 -${4 + Math.floor(s / 2)}`, apply: (h, s) => { h.arrowNeed = Math.max(6, h.arrowNeed - 4 - Math.floor(s / 2)); } },
  mage: { name: '黑曜法杖', desc: s => `濺射 +${15 + s * 3}%`, apply: (h, s) => { h.splash += 0.15 + s * 0.03; } },
  saw: { name: '屠夫鏈鋸', desc: s => `鏈鋸傷害 +${40 + s * 10}%`, apply: (h, s) => { h.sawMul += 0.4 + s * 0.1; } },
  paladin: { name: '晨曦聖錘', desc: s => `聖光傷害 +${40 + s * 10}%`, apply: (h, s) => { h.holyMul += 0.4 + s * 0.1; } },
  rogue: { name: '影牙匕首', desc: s => `暴擊傷害 +${40 + s * 10}%`, apply: (h, s) => { h.critDmg += 0.4 + s * 0.1; } },
  gunner: { name: '龍吼火槍', desc: s => `榴彈傷害 +${50 + s * 10}%`, apply: (h, s) => { h.grenadeMul += 0.5 + s * 0.1; } },
  elem: { name: '元素權杖', desc: s => `雷元素多跳 1 隻、燃燒 +${15 + s * 3}%`, apply: (h, s) => { h.boltJumps += 1; h.fireDot += 0.15 + s * 0.03; } },
  dragoon: { name: '屠龍槍', desc: s => `龍息傷害 +${50 + s * 10}%`, apply: (h, s) => { h.breathMul += 0.5 + s * 0.1; } },
  sage: { name: '星辰之書', desc: s => `星落傷害 +${30 + s * 8}%`, apply: (h, s) => { h.starMul *= 1.3 + s * 0.08; } },
  thief: { name: '黃金鉤爪', desc: s => `結算金幣 +${10 + s * 2}%、每殺一隻多 1 球幣`, apply: (h, s) => { h.goldBonus += 0.1 + s * 0.02; h.stealCoins += 1; } },
  // 3.8 傳奇英雄專武（抽到傳奇英雄時附贈；之後裝備池也抽得到）
  ignis: { sig: true, name: '焚天之杖', desc: s => `隕石傷害 +${50 + s * 10}%`, apply: (h, s) => { h.meteorMul += 0.5 + s * 0.1; } },
  evira: { sig: true, name: '翠影長弓', desc: s => `毒傷 +${15 + s * 3}%`, apply: (h, s) => { h.dot += 0.15 + s * 0.03; } },
  leos: { sig: true, name: '獅心聖劍', desc: s => `聖光傷害 +${40 + s * 10}%`, apply: (h, s) => { h.holyMul += 0.4 + s * 0.1; } },
  lilith: { sig: true, name: '血月鐮刀', desc: s => `吸血 +${4 + s}%`, apply: (h, s) => { h.life += 0.04 + s * 0.01; } },
  omega: { sig: true, name: '終焉核心砲', desc: s => `砲台傷害 +${30 + s * 6}%`, apply: (h, s) => { h.turretMul += 0.3 + s * 0.06; } },
  seraph: { sig: true, name: '六翼聖典', desc: s => `聖光傷害 +${30 + s * 8}%、每秒回血 +0.2%`, apply: (h, s) => { h.holyMul += 0.3 + s * 0.08; h.regenPs += 0.002; } },
};
export function applyHeirloom(h, gb) {
  const x = gb.heir;
  if (!x || x.hero !== h.def.id) return;
  h.baseAtk *= 1.1 + x.star * 0.03;
  HEIRLOOMS[x.hero].apply(h, x.star);
}

// ---------- 3.6 裝備星級（熔鑄） ----------
// 傳說、神話最多 3 星；刻印套裝、傳家武器最多 5 星；每星主屬性與副屬性 +10%
export const starMax = it => (it.heir || (it.set && SETS[it.set].pool === 'imprint') ? 5 : it.rarity >= 3 ? 3 : 0);
export const starMul = it => 1 + 0.1 * (it.star || 0);
export const fuseGold = it => 3000 * ((it.star || 0) + 1) * (it.heir ? 2 : 1);
const isSpecial = it => !!(it.heir || (it.set && SETS[it.set].pool === 'imprint'));

// ---------- 符石（3.0 前叫寶石；存檔欄位仍是 gems） ----------
// 裝備上有鑲嵌孔（稀有度越高孔越多），符石有 1～5 級，3 顆同級合成高一級
export const GEMS = {
  ruby: { name: '紅符石', stat: 'atk', color: '#ff4d4d' },
  sapphire: { name: '藍符石', stat: 'crit', color: '#36a9ff' },
  emerald: { name: '綠符石', stat: 'hp', color: '#3ddc84' },
  topaz: { name: '黃符石', stat: 'gold', color: '#ffd84a' },
  amethyst: { name: '紫符石', stat: 'critDmg', color: '#c38bff' },
};
export const GEM_MAX = 5;
const GEM_MUL = [0, 1, 1.8, 2.7, 3.7, 5];
export const SOCKETS = [0, 1, 1, 2, 3];
export const gemKey = (id, lv) => `${id}-${lv}`;
export const parseGem = key => { const [id, lv] = key.split('-'); return { id, lv: +lv }; };
export const gemValue = key => { const g = parseGem(key); return r1(STATS[GEMS[g.id].stat].base * GEM_MUL[g.lv]); };
export const gemName = key => { const g = parseGem(key); return `${GEMS[g.id].name} Lv.${g.lv}`; };
export const gemColor = key => GEMS[parseGem(key).id].color;
// 寶石：用 CSS 畫的菱形（等級越高越大越亮）
export const gemTag = (key, size = 14) => `<i class="gem lv${parseGem(key).lv}" style="--gc:${gemColor(key)};--gs:${size}px"></i>`;

// ---------- 存檔 ----------
const rand = (a, b) => a + Math.random() * (b - a);
const r1 = v => Math.round(v * 10) / 10;

export function ensureGear(save) {
  if (!save.gear) save.gear = { v: 3, items: [], equip: {}, nextId: 1, shards: 0 };
  const g = save.gear;
  if (g.v !== 2 && g.v !== 3) migrate(g);
  if (g.v === 2) rebalance(g);
  if (g.shards === undefined) g.shards = 0;
  if (!g.gems) g.gems = {};
  if (!g.presets) g.presets = [null, null, null];
  for (const it of g.items) if (!it.sockets) it.sockets = Array(SOCKETS[it.rarity]).fill(null);
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

// ilv = 裝備等級（在第幾章掉的）：每高一級數值 +8%，最高 10 級（3.0 平衡：原本 +12% 而且沒有上限）
export const ILV_CAP = 10;
export const ilvMul = ilv => 1 + 0.08 * (Math.min(ILV_CAP, ilv || 1) - 1);
const oldIlvMul = ilv => 1 + 0.12 * ((ilv || 1) - 1);
// 3.0 平衡：舊裝備的數值照新公式換算一次，並記下補償（在主畫面發給玩家）
function rebalance(g) {
  let n = 0;
  for (const it of g.items) {
    const r = RARITIES[it.rarity];
    const f = (r.mult / r.old) * (ilvMul(it.ilv) / oldIlvMul(it.ilv));
    it.value = r1(it.value * f) || 0.1;
    for (const a of it.affixes || []) a.value = r1(a.value * f) || 0.1;
    if (it.ench) it.ench.value = r1(it.ench.value * r.mult / r.old) || 0.1;
    if (it.ilv > ILV_CAP) it.ilv = ILV_CAP;
    if (it.rarity >= 2) n++;
  }
  g.rebalanced = { shards: Math.min(400, 30 + n * 6), gold: 2000 + n * 300 };
  g.v = 3;
}
function makeItem(gear, type, rarity, ilv = 1, opt = {}) {
  const T = TYPES[type];
  const r = RARITIES[rarity];
  const k = r.mult * ilvMul(ilv);
  ilv = Math.min(ILV_CAP, ilv);
  const it = { id: gear.nextId++, type, rarity, ilv, plus: 0, fresh: true, affixes: [], sockets: Array(SOCKETS[rarity]).fill(null) };
  it.main = T.main || RING_MAINS[Math.floor(Math.random() * RING_MAINS.length)];
  it.value = r1((T.main ? T.base : STATS[it.main].base * 1.6) * k);
  if (opt.set) it.set = opt.set;
  else if (Math.random() < SET_CHANCE[rarity]) it.set = SET_IDS[Math.floor(Math.random() * SET_IDS.length)];
  if (opt.heir) it.heir = opt.heir;
  if (rarity >= 3 && !opt.heir) { const u = uniquesFor(type); it.uniq = u[Math.floor(Math.random() * u.length)]; }
  // 副屬性：不重複、不跟主屬性一樣
  const pool = AFFIX_POOL.filter(s => s !== it.main);
  for (let i = 0; i < r.affix; i++) {
    const k2 = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    it.affixes.push({ stat: k2, value: r1(STATS[k2].base * k * rand(0.6, 1.2)) || 0.1 });
  }
  if (T.jewel) { it.jlv = 1; it.jexp = 0; it.skill = JEWEL_IDS[Math.floor(Math.random() * JEWEL_IDS.length)]; }
  return it;
}

export const itemName = it => (it.heir ? HEIRLOOMS[it.heir].name : (it.set ? SETS[it.set].name + '・' : '') + TYPES[it.type].names[it.rarity]) + (it.plus ? ` +${it.plus}` : '');
export const itemIcon = it => ['ic', TYPES[it.type].icons[it.rarity], it.heir ? '#ffe9a0' : RARITIES[it.rarity].color];
// 主屬性實際數值（強化每級 +6%）
export const PLUS_STEP = 0.06;
export const mainValue = it => r1(it.value * (1 + PLUS_STEP * (it.plus || 0)) * starMul(it));
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
export function rollDrops(save, cleared, win, diffIndex, chapter = 1) {
  const gear = ensureGear(save);
  let count = Math.min(7, Math.floor(cleared / 4) + (win ? 2 : 0) + (diffIndex >= 3 ? 1 : 0));
  if (cleared >= 3) count = Math.max(1, count);
  const drops = [];
  // 休閒難度：裝備等級最高 3、稀有度最高史詩（休閒可以亂玩，但不能拿來刷平衡難度的裝備）
  const ilv = diffIndex === 0 ? Math.min(3, chapter) : chapter;
  for (let i = 0; i < count; i++) {
    const rarity = diffIndex === 0 ? Math.min(2, randomRarity(0)) : randomRarity(diffIndex);
    // 挑戰（含）以上：史詩以上有機會是冒險套裝
    const set = diffIndex >= 3 && rarity >= 2 && Math.random() < 0.35 ? ADV_SETS[Math.floor(Math.random() * ADV_SETS.length)] : null;
    drops.push(makeItem(gear, randomType(), rarity, ilv, set ? { set } : {}));
  }
  gear.items.push(...drops);
  // 背包滿了：自動分解最差的、沒穿在身上的
  let salvaged = 0;
  while (gear.items.length > bagCap(save)) {
    const worn = new Set(Object.values(gear.equip));
    const cand = gear.items.filter(it => !worn.has(it.id) && !it.lock && !isSpecial(it) && !it.star).sort((a, b) => a.rarity - b.rarity || (a.plus || 0) - (b.plus || 0))[0];
    if (!cand) break;
    gear.items.splice(gear.items.indexOf(cand), 1);
    salvaged += RARITIES[cand.rarity].salvage;
    gear.shards += RARITIES[cand.rarity].shard;
  }
  save.gold += salvaged;
  return { drops, salvaged };
}
export function grantItem(save, rarity, ilv = 1) {
  const gear = ensureGear(save);
  const it = makeItem(gear, randomType(), rarity, ilv);
  gear.items.push(it);
  return it;
}

// ---------- 加成 ----------
export function gearBonus(save) {
  const gear = ensureGear(save);
  const b = { skills: {}, uniq: {}, sets: {}, heir: null, extra: { hits: 0, shield: 0, dbl: 0, splash: 0, arcane: 0, midas: 0, phoenix: 0, storm: 0 } };
  for (const k of AFFIX_POOL) b[k] = 0;
  const add = (stat, v) => { b[stat] += STATS[stat].unit === '%' ? v / 100 : v; };
  for (const id of Object.values(gear.equip)) {
    const it = gear.items.find(x => x.id === id);
    if (!it) continue;
    add(it.main, mainValue(it));
    for (const a of it.affixes) add(a.stat, a.value * starMul(it));
    if (it.heir) b.heir = { hero: it.heir, star: it.star || 0 };
    if (it.ench) add(it.ench.stat, it.ench.value);
    for (const gk of it.sockets || []) if (gk) add(GEMS[parseGem(gk).id].stat, gemValue(gk));
    if (it.skill) {
      const p = jewelPower(it);
      if (p) b.skills[it.skill] = (b.skills[it.skill] || 0) + p;
    }
    if (it.uniq) b.uniq[it.uniq] = (b.uniq[it.uniq] || 0) + 1;
    if (it.set) b.sets[it.set] = (b.sets[it.set] || 0) + 1;
  }
  // 套裝效果
  for (const [id, n] of Object.entries(b.sets)) {
    const st = SETS[id];
    for (const [need, list] of [[2, st.two], [4, st.four]]) {
      if (n < need) continue;
      for (const [k, v] of list) {
        if (STATS[k]) add(k, v);
        else b.extra[k] += ['hits', 'midas', 'arcane', 'phoenix', 'storm'].includes(k) ? v : v / 100;
      }
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
  let s = mainValue(it) / base; // 主屬性已經含裝備等級
  if (it.uniq) s += 0.8;
  for (const a of it.affixes) s += a.value * starMul(it) / STATS[a.stat].base * 0.4;
  if (it.heir) s += 1.2;
  if (it.ench) s += it.ench.value / STATS[it.ench.stat].base * 0.4;
  return s;
}
// 戰力：身上所有裝備的分數加總（含套裝、傳說特效），拿來比較整體強度
export function gearPower(save) {
  const gear = ensureGear(save);
  const b = gearBonus(save);
  let p = 0;
  for (const id of Object.values(gear.equip)) {
    const it = gear.items.find(x => x.id === id);
    if (it) p += score(it) * 100 + (it.uniq || it.heir ? 150 : 0) + (it.skill ? jewelPower(it) * 2 : 0);
  }
  for (const n of Object.values(b.sets)) p += n >= 4 ? 400 : n >= 2 ? 150 : 0;
  return Math.round(p);
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
  for (const gk of it.sockets || []) if (gk) gear.gems[gk] = (gear.gems[gk] || 0) + 1; // 寶石退回
  const r = RARITIES[it.rarity];
  const g = Math.round(r.salvage * (1 + (it.plus || 0) * 0.3));
  save.gold += g;
  gear.shards += r.shard;
  return { gold: g, shards: r.shard };
}
// 3.17 批量分解
export const salvageGain = it => ({ gold: Math.round(RARITIES[it.rarity].salvage * (1 + (it.plus || 0) * 0.3)), shards: RARITIES[it.rarity].shard });
export const canBatch = (save, it) => !isWorn(save, it.id) && !it.lock;
// 「一鍵全選」只選安全的：沒強化、沒升星、不是傳家／刻印、也不比身上好
export const safeBatch = (save, it) => canBatch(save, it) && !it.plus && !it.star && !isSpecial(it) && !isBetter(save, it);
export const riskyItem = it => it.rarity >= 3 || it.plus || it.star || isSpecial(it);
export function salvageMany(save, ids) {
  let n = 0, gold = 0, shards = 0;
  for (const id of ids) {
    const it = ensureGear(save).items.find(x => x.id === id);
    if (!it || !canBatch(save, it)) continue;
    const r = salvage(save, id);
    if (r) { n++; gold += r.gold; shards += r.shards; }
  }
  return { n, gold, shards };
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
    if (isWorn(save, it.id) || it.lock || it.rarity >= MAX_RARITY || isSpecial(it) || it.star || (it.set && SETS[it.set].pool)) continue;
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
      for (const x of three) for (const gk of x.sockets || []) if (gk) gear.gems[gk] = (gear.gems[gk] || 0) + 1;
      const up = makeItem(gear, three[0].type, three[0].rarity + 1, Math.max(...three.map(x => x.ilv || 1)));
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

// ---------- 寶石操作 ----------
export function gemDrops(save, cleared, win, diffIndex) {
  const gear = ensureGear(save);
  const n = Math.floor(cleared / 5) + (win ? 1 : 0);
  const got = [];
  const ids = Object.keys(GEMS);
  for (let i = 0; i < n; i++) {
    const lv = Math.random() < 0.08 * diffIndex ? 2 : 1;
    const key = gemKey(ids[Math.floor(Math.random() * ids.length)], lv);
    gear.gems[key] = (gear.gems[key] || 0) + 1;
    got.push(key);
  }
  return got;
}
export function socketGem(save, itemId, idx, key) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === itemId);
  if (!it || !(gear.gems[key] > 0) || idx >= it.sockets.length) return false;
  // 同一件裝備，同種符石只能鑲一顆
  const id = parseGem(key).id;
  if (it.sockets.some((k, i) => k && i !== idx && parseGem(k).id === id)) return false;
  if (it.sockets[idx]) gear.gems[it.sockets[idx]] = (gear.gems[it.sockets[idx]] || 0) + 1;
  gear.gems[key]--;
  if (!gear.gems[key]) delete gear.gems[key];
  it.sockets[idx] = key;
  return true;
}
export function unsocketGem(save, itemId, idx) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === itemId);
  const key = it && it.sockets[idx];
  if (!key) return false;
  gear.gems[key] = (gear.gems[key] || 0) + 1;
  it.sockets[idx] = null;
  return true;
}
// 一鍵合成寶石：3 顆同種同級 → 1 顆高一級（一直合到不能合為止）
export function mergeGems(save) {
  const gear = ensureGear(save);
  let made = 0, again = true;
  while (again) {
    again = false;
    for (const key of Object.keys(gear.gems)) {
      const g = parseGem(key);
      if (g.lv >= GEM_MAX || gear.gems[key] < 3) continue;
      const n = Math.floor(gear.gems[key] / 3);
      gear.gems[key] -= n * 3;
      if (!gear.gems[key]) delete gear.gems[key];
      const up = gemKey(g.id, g.lv + 1);
      gear.gems[up] = (gear.gems[up] || 0) + n;
      made += n;
      again = true;
    }
  }
  return made;
}

// ---------- 重鑄：把一條副屬性重新隨機 ----------
export const reforgeCost = it => ({ shards: 2 + it.rarity * 2, gold: Math.round(150 * (1 + it.rarity) * ilvMul(it.ilv)) });
export function reforge(save, itemId, idx) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === itemId);
  if (!it || !it.affixes[idx]) return null;
  const c = reforgeCost(it);
  if (gear.shards < c.shards || save.gold < c.gold) return null;
  gear.shards -= c.shards;
  save.gold -= c.gold;
  const used = new Set([it.main, ...it.affixes.map(a => a.stat)]);
  used.delete(it.affixes[idx].stat);
  const pool = AFFIX_POOL.filter(k => !used.has(k));
  const k = pool[Math.floor(Math.random() * pool.length)];
  it.affixes[idx] = { stat: k, value: r1(STATS[k].base * RARITIES[it.rarity].mult * ilvMul(it.ilv) * rand(0.6, 1.3)) || 0.1 };
  return it.affixes[idx];
}

// ---------- 鍛造：指定種類，用魔晶和金幣打造一件（至少稀有） ----------
export const CRAFT_TIERS = [
  { name: '普通爐', shards: 15, gold: 1500, weights: [0, 75, 22, 3, 0] },
  { name: '精工爐', shards: 45, gold: 6000, weights: [0, 30, 50, 18, 2] },
  { name: '神鍛爐', shards: 120, gold: 25000, weights: [0, 0, 45, 45, 10] },
];
export function craft(save, type, tier, ilv) {
  const gear = ensureGear(save);
  const t = CRAFT_TIERS[tier];
  if (gear.shards < t.shards || save.gold < t.gold || gear.items.length >= bagCap(save)) return null;
  gear.shards -= t.shards;
  save.gold -= t.gold;
  let x = Math.random() * t.weights.reduce((a, b) => a + b, 0);
  let rarity = 0;
  for (; rarity < MAX_RARITY; rarity++) { x -= t.weights[rarity]; if (x <= 0) break; }
  const it = makeItem(gear, type, rarity, ilv);
  gear.items.push(it);
  return it;
}

// ---------- 裝備方案：存下目前身上的裝備，一鍵換回來 ----------
export function savePreset(save, i) {
  const gear = ensureGear(save);
  gear.presets[i] = { ...gear.equip };
}
export function loadPreset(save, i) {
  const gear = ensureGear(save);
  const p = gear.presets[i];
  if (!p) return false;
  const ids = new Set(gear.items.map(x => x.id));
  gear.equip = {};
  for (const [slot, id] of Object.entries(p)) if (ids.has(id)) gear.equip[slot] = id;
  return true;
}

// ---------- 3.6 熔鑄：吃掉一件同種類、傳說以上的裝備 → 星級 +1 ----------
// 傳家武器可以吃任何傳說以上的武器
export function fuseFodder(save, it) {
  const gear = ensureGear(save);
  return gear.items.filter(x => x.id !== it.id && x.type === it.type && x.rarity >= 3 && !x.lock && !isWorn(save, x.id) && !isSpecial(x) && !x.star)
    .sort((a, b) => score(a) - score(b));
}
export function whyNoFuse(save, it) {
  if (!starMax(it)) return '傳說以上才能熔鑄升星';
  if ((it.star || 0) >= starMax(it)) return `已經 ${starMax(it)} 星滿星`;
  if (!fuseFodder(save, it).length) return `需要一件沒穿、沒上鎖的傳說以上${TYPES[it.type].name}當材料`;
  if (save.gold < fuseGold(it)) return `金幣不足（需要 ${fuseGold(it)}）`;
  return '';
}
export function fuse(save, id) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === id);
  if (!it || whyNoFuse(save, it)) return null;
  const f = fuseFodder(save, it)[0];
  save.gold -= fuseGold(it);
  for (const gk of f.sockets || []) if (gk) gear.gems[gk] = (gear.gems[gk] || 0) + 1;
  gear.items = gear.items.filter(x => x !== f);
  it.star = (it.star || 0) + 1;
  return f;
}

// ---------- 3.6 強化轉移：把舊裝備的強化等級搬到同種類的新裝備（舊的歸零） ----------
export const TRANSFER_SHARDS = 10;
export function transferDonor(save, it) {
  const gear = ensureGear(save);
  return gear.items.filter(x => x.id !== it.id && x.type === it.type && (x.plus || 0) > (it.plus || 0)).sort((a, b) => b.plus - a.plus)[0] || null;
}
export function transferPlus(save, id) {
  const gear = ensureGear(save);
  const it = gear.items.find(x => x.id === id);
  const d = it && transferDonor(save, it);
  if (!d || gear.shards < TRANSFER_SHARDS) return null;
  gear.shards -= TRANSFER_SHARDS;
  it.plus = d.plus;
  d.plus = 0;
  return d;
}

// ---------- 3.6 鍛造召喚用：做一件指定條件的裝備 ----------
export function forgeItem(save, rarity, ilv, kind) {
  const gear = ensureGear(save);
  let it;
  if (kind === 'heir') {
    const pool = Object.keys(HEIRLOOMS).filter(k => !HEIRLOOMS[k].sig || (save.owned || []).includes(k));
    it = makeItem(gear, 'weapon', 3, ilv, { heir: pool[Math.floor(Math.random() * pool.length)] });
  } else if (kind && HEIRLOOMS[kind]) it = makeItem(gear, 'weapon', 3, ilv, { heir: kind }); // 指定的專武
  else if (kind === 'imprint') it = makeItem(gear, randomType(), 3, ilv, { set: IMPRINT_SETS[Math.floor(Math.random() * IMPRINT_SETS.length)] });
  else it = makeItem(gear, randomType(), rarity, ilv);
  gear.items.push(it);
  return it;
}
export const bagRoom = save => bagCap(save) - ensureGear(save).items.length;
