// 3.5 雙人羈絆：兩位英雄的「標籤」對上就有加成（兩人都吃）
// 共鳴＝相同標籤；反應＝指定的不同標籤組合；專屬羈絆＝指定的兩位英雄
// 最多生效 2 條標籤羈絆＋1 條專屬羈絆；等級看兩人星數合計（2～5 星 Lv1、6～9 Lv2、10～12 Lv3）
// 單人出戰沒有羈絆，改給「孤狼」：血量、攻擊 +10%

export const TAGS = {
  fire: { name: '火焰', color: '#ff7a3b' }, frost: { name: '冰霜', color: '#9fe3ff' }, thunder: { name: '雷電', color: '#ffe066' },
  holy: { name: '聖光', color: '#fff2a8' }, shadow: { name: '暗影', color: '#b9a8ff' }, poison: { name: '劇毒', color: '#7dff5a' },
  mech: { name: '機械', color: '#c0c8d8' }, beast: { name: '野獸', color: '#c98a55' }, star: { name: '星辰', color: '#c8b6ff' },
  dragon: { name: '龍族', color: '#ff5a5a' }, martial: { name: '武技', color: '#ff8a6b' }, wealth: { name: '財富', color: '#ffd84a' },
};

const L = (lv, a, b, c) => [a, b, c][lv - 1];
// 共鳴：兩人有相同標籤
export const RESONANCE = {
  fire: { desc: lv => `燃燒、龍息、火雨傷害 +${L(lv, 20, 35, 50)}%`, apply: (h, lv) => { const k = L(lv, 0.2, 0.35, 0.5); h.dot *= 1 + k; h.breathMul *= 1 + k; h.meteorMul *= 1 + k; h.fireDot *= 1 + k; h.burstMul *= 1 + k; } },
  frost: { desc: lv => `冰霜減速 +${L(lv, 5, 8, 12)}%，凍住的敵人受到傷害 +${L(lv, 10, 15, 25)}%`, apply: (h, lv) => { h.frost = Math.min(0.6, h.frost + L(lv, 0.05, 0.08, 0.12)); h.frozenAmp += L(lv, 0.1, 0.15, 0.25); } },
  thunder: { desc: lv => `連鎖閃電多跳 ${L(lv, 1, 1, 2)} 隻，傷害 +${L(lv, 10, 20, 30)}%`, apply: (h, lv) => { h.chainJumps += L(lv, 1, 1, 2); h.chainMul *= 1 + L(lv, 0.1, 0.2, 0.3); h.boltJumps += 1; } },
  holy: { desc: lv => `每波回血 +${L(lv, 3, 5, 8)}%，聖光傷害 +${L(lv, 15, 25, 35)}%`, apply: (h, lv) => { h.regen += L(lv, 0.03, 0.05, 0.08); h.holyMul *= 1 + L(lv, 0.15, 0.25, 0.35); } },
  shadow: { desc: lv => `暴擊率 +${L(lv, 5, 8, 12)}%${lv >= 3 ? '，閃避 +5%' : ''}`, apply: (h, lv) => { h.crit += L(lv, 0.05, 0.08, 0.12); if (lv >= 3) h.dodge += 0.05; } },
  poison: { desc: lv => `中毒傷害 +${L(lv, 25, 40, 60)}%`, apply: (h, lv) => { h.dot *= 1 + L(lv, 0.25, 0.4, 0.6); } },
  mech: { desc: lv => `砲台、夥伴、榴彈傷害 +${L(lv, 20, 35, 50)}%`, apply: (h, lv) => { const k = L(lv, 0.2, 0.35, 0.5); h.turretMul *= 1 + k; h.grenadeMul *= 1 + k; h.bashMul *= 1 + k; } },
  beast: { desc: lv => `吸血 +${L(lv, 3, 5, 8)}%`, apply: (h, lv) => { h.life += L(lv, 0.03, 0.05, 0.08); } },
  star: { desc: lv => `杯子吸球 +${L(lv, 20, 35, 50)}%，星落、流星傷害 +${L(lv, 15, 25, 35)}%`, apply: (h, lv) => { h.magnet += L(lv, 0.2, 0.35, 0.5); h.starMul *= 1 + L(lv, 0.15, 0.25, 0.35); h.meteorMul *= 1 + L(lv, 0.15, 0.25, 0.35); } },
  dragon: { desc: lv => `血量 +${L(lv, 10, 14, 20)}%，龍息傷害 +${L(lv, 20, 35, 50)}%`, apply: (h, lv) => { const k = L(lv, 0.1, 0.14, 0.2); h.maxHp *= 1 + k; h.hp = h.maxHp; h.breathMul *= 1 + L(lv, 0.2, 0.35, 0.5); } },
  martial: { desc: lv => `攻擊力 +${L(lv, 6, 10, 15)}%，格擋 +${L(lv, 3, 5, 8)}%`, apply: (h, lv) => { h.baseAtk *= 1 + L(lv, 0.06, 0.1, 0.15); h.block += L(lv, 0.03, 0.05, 0.08); } },
  wealth: { desc: lv => `結算金幣 +${L(lv, 12, 18, 25)}%，開局球幣 +${L(lv, 40, 70, 120)}`, apply: (h, lv) => { h.goldBonus += L(lv, 0.12, 0.18, 0.25); }, coins: lv => L(lv, 40, 70, 120) },
};
// 反應：指定的兩種不同標籤
export const REACTIONS = [
  { a: 'fire', b: 'frost', name: '融化', desc: lv => `凍住、變慢的敵人受到傷害 +${L(lv, 15, 25, 40)}%`, apply: (h, lv) => { h.frozenAmp += L(lv, 0.15, 0.25, 0.4); } },
  { a: 'thunder', b: 'frost', name: '超導', desc: lv => `閃電傷害 +${L(lv, 20, 35, 50)}%`, apply: (h, lv) => { h.chainMul *= 1 + L(lv, 0.2, 0.35, 0.5); } },
  { a: 'fire', b: 'thunder', name: '超載', desc: lv => `擊殺時爆炸，對全體造成 ${L(lv, 20, 30, 45)}%`, apply: (h, lv) => { h.killBlast += L(lv, 0.2, 0.3, 0.45); } },
  { a: 'poison', b: 'fire', name: '毒焰', desc: lv => `持續傷害 +${L(lv, 25, 40, 60)}%`, apply: (h, lv) => { h.dot *= 1 + L(lv, 0.25, 0.4, 0.6); } },
  { a: 'holy', b: 'shadow', name: '晨昏', desc: lv => `換手斬傷害 +${L(lv, 40, 70, 100)}%`, apply: (h, lv) => { h.switchMul += L(lv, 0.4, 0.7, 1); } },
  { a: 'mech', b: 'thunder', name: '充能', desc: lv => `攻擊速度 +${L(lv, 8, 12, 18)}%`, apply: (h, lv) => { h.spdMul += L(lv, 0.08, 0.12, 0.18); } },
  { a: 'mech', b: 'fire', name: '火藥', desc: lv => `榴彈、加農、過熱、盾擊傷害 +${L(lv, 20, 35, 50)}%`, apply: (h, lv) => { const k = L(lv, 0.2, 0.35, 0.5); h.grenadeMul *= 1 + k; h.burstMul *= 1 + k; h.bashMul *= 1 + k; } },
  { a: 'beast', b: 'dragon', name: '馴龍', desc: lv => `血量 +${L(lv, 10, 15, 20)}%`, apply: (h, lv) => { h.maxHp *= 1 + L(lv, 0.1, 0.15, 0.2); h.hp = h.maxHp; } },
  { a: 'star', b: 'holy', name: '天啟', desc: lv => `聖光、星落需要的次數 -${L(lv, 1, 1, 2)}`, apply: (h, lv) => { h.holyEvery = Math.max(2, h.holyEvery - L(lv, 1, 1, 2)); h.starNeed = Math.max(6, h.starNeed - L(lv, 2, 3, 4)); } },
  { a: 'shadow', b: 'poison', name: '腐蝕', desc: lv => `無視敵人減傷，暴擊傷害 +${L(lv, 15, 25, 40)}%`, apply: (h, lv) => { h.ignoreArmor = true; h.critDmg += L(lv, 0.15, 0.25, 0.4); } },
  { a: 'martial', b: 'beast', name: '狩獵', desc: lv => `對菁英、魔王傷害 +${L(lv, 12, 20, 30)}%`, apply: (h, lv) => { h.bossDmg += L(lv, 0.12, 0.2, 0.3); } },
  { a: 'martial', b: 'holy', name: '騎士道', desc: lv => `格擋 +${L(lv, 6, 10, 15)}%，格擋時回 ${L(lv, 1, 2, 3)}% 血`, apply: (h, lv) => { h.block += L(lv, 0.06, 0.1, 0.15); h.blockHeal += L(lv, 0.01, 0.02, 0.03); } },
  { a: 'star', b: 'frost', name: '極光', desc: lv => `濺射 +${L(lv, 10, 15, 25)}%`, apply: (h, lv) => { h.splash += L(lv, 0.1, 0.15, 0.25); } },
  { a: 'shadow', b: 'beast', name: '夜獵', desc: lv => `閃避 +${L(lv, 5, 8, 12)}%`, apply: (h, lv) => { h.dodge += L(lv, 0.05, 0.08, 0.12); } },
];
// 專屬羈絆：指定兩位英雄（有小故事）
export const PAIRS = [
  { a: 'blade', b: 'paladin', name: '騎士之誓', story: '一起守護王國的老戰友', desc: '雙方攻擊力 +8%、每波回血 +5%', apply: h => { h.baseAtk *= 1.08; h.regen += 0.05; } },
  { a: 'paladin', b: 'rogue', name: '光與影', story: '聖騎士一直想把刺客帶回正道', desc: '換手斬 +60%，換手回 8% 血', apply: h => { h.switchMul += 0.6; h.switchHeal += 0.08; } },
  { a: 'gunner', b: 'pip', name: '火藥工坊', story: '布雷的槍是皮普做的', desc: '榴彈、砲台傷害 +40%', apply: h => { h.grenadeMul *= 1.4; h.turretMul *= 1.4; } },
  { a: 'lok', b: 'balu', name: '狼群', story: '獸王收養的狼孩', desc: '夥伴、狼形攻擊力 +25%', apply: h => { h.turretMul *= 1.25; h.rage += 0.25; } },
  { a: 'rogue', b: 'ruri', name: '影之師徒', story: '琉璃是夜的徒弟', desc: '閃避 +8%、暴擊傷害 +30%', apply: h => { h.dodge += 0.08; h.critDmg += 0.3; } },
  { a: 'hilda', b: 'esti', name: '冰雪姊妹', story: '同一座雪山長大', desc: '凍住的敵人受到傷害 +30%', apply: h => { h.frozenAmp += 0.3; } },
  { a: 'thief', b: 'morgan', name: '海賊與盜賊', story: '兩個死對頭', desc: '結算金幣 +15%、開局球幣 +80', apply: h => { h.goldBonus += 0.15; }, coins: 80 },
  { a: 'thorfin', b: 'sian', name: '雷鳴二重奏', story: '一個用鎚、一個用雲召喚雷', desc: '閃電多跳 2 隻、傷害 +30%', apply: h => { h.chainJumps += 2; h.chainMul *= 1.3; } },
  { a: 'mary', b: 'cyrus', name: '聖堂', story: '修女與審判官來自同一座聖堂', desc: '每秒回血 +0.5%、印記增傷 +20%', apply: h => { h.regenPs += 0.005; h.markAmp += 0.2; } },
  { a: 'kalan', b: 'dragoon', name: '龍血契約', story: '同一份龍血的兩種命運', desc: '龍息傷害 +50%、吸血 +5%', apply: h => { h.breathMul *= 1.5; h.life += 0.05; } },
  { a: 'fio', b: 'g7', name: '鍛爐之火', story: '鋼鐵七號的鍋爐是菲歐點燃的', desc: '燃燒、過熱傷害 +35%', apply: h => { h.dot *= 1.35; h.burstMul *= 1.35; } },
  { a: 'vicky', b: 'moore', name: '毒藥學會', story: '同一間學院的師生', desc: '毒傷 +40%', apply: h => { h.dot *= 1.4; } },
];

export const bondLevel = totalStars => totalStars >= 10 ? 3 : totalStars >= 6 ? 2 : 1;

// defs = 出戰英雄的資料；stars = 對應星數
export function computeBonds(defs, stars) {
  if (defs.length < 2) return [{ kind: 'solo', name: '孤狼', lv: 1, desc: '單人出戰：血量、攻擊 +10%' }];
  const [x, y] = defs;
  const lv = bondLevel(stars[0] + stars[1]);
  const tx = x.tags || [], ty = y.tags || [];
  const tagBonds = [];
  for (const t of tx) if (ty.includes(t)) tagBonds.push({ kind: 'res', key: t, name: `${TAGS[t].name}共鳴`, lv, desc: RESONANCE[t].desc(lv), color: TAGS[t].color });
  for (const r of REACTIONS) {
    if ((tx.includes(r.a) && ty.includes(r.b)) || (tx.includes(r.b) && ty.includes(r.a))) tagBonds.push({ kind: 'react', ref: r, name: r.name, lv, desc: r.desc(lv), color: TAGS[r.a].color });
  }
  const out = tagBonds.slice(0, 2);
  const pair = PAIRS.find(p => (p.a === x.id && p.b === y.id) || (p.a === y.id && p.b === x.id));
  if (pair) out.push({ kind: 'pair', ref: pair, name: pair.name, lv: 0, desc: `${pair.desc}（${pair.story}）`, color: '#ffd84a' });
  return out;
}
// 套用到兩位英雄身上；回傳要加的開局球幣
export function applyBonds(heroes, bonds) {
  let coins = 0;
  for (const b of bonds) {
    for (const h of heroes) {
      if (b.kind === 'solo') { h.maxHp *= 1.1; h.hp = h.maxHp; h.baseAtk *= 1.1; }
      else if (b.kind === 'res') RESONANCE[b.key].apply(h, b.lv);
      else if (b.kind === 'react') b.ref.apply(h, b.lv);
      else if (b.kind === 'pair') b.ref.apply(h);
    }
    if (b.kind === 'res' && RESONANCE[b.key].coins) coins += RESONANCE[b.key].coins(b.lv);
    if (b.kind === 'pair' && b.ref.coins) coins += b.ref.coins;
  }
  return coins;
}
