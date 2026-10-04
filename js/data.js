// 遊戲靜態資料：英雄、敵人、章節、技能卡、局外升級

export const HEROES = [
  {
    id: 'blade', name: '劍士 艾倫', emoji: '🤺', sprite: 96, price: 0,
    hp: 130, atk: 9, interval: 1.0, range: 60, hits: 1,
    passive: '劍氣：每第 3 次攻擊揮出劍氣，打中所有敵人',
  },
  {
    id: 'archer', name: '彈射射手 莉亞', emoji: '🧝', sprite: 112, price: 300,
    hp: 95, atk: 8, interval: 0.9, range: 240, hits: 1,
    passive: '球雨箭：每接住 20 顆球，自動射出一支強力箭',
  },
  {
    id: 'mage', name: '重力法師 諾娃', emoji: '🧙', sprite: 84, price: 700,
    hp: 105, atk: 10, interval: 1.2, range: 200, hits: 1, splash: 0.25,
    passive: '重力井：接球杯會把附近的小球吸進來',
  },
  {
    id: 'saw', name: '鏈鋸狂戰 巴克', emoji: '🦹', sprite: 87, price: 1200,
    hp: 160, atk: 9, interval: 1.1, range: 60, hits: 1, life: 0.06,
    passive: '鏈鋸：小球每撞釘子 12 次，就砍前排敵人一刀',
  },
];

// 角色圖：Kenney「Tiny Dungeon」（CC0），數字是 assets/tiny-dungeon.png 裡第幾格
// tile = 地面用的磚塊圖（null 表示純色草地）
export const CHAPTERS = [
  { name: '翠綠平原', sky: ['#6fc3ff', '#d4f1ff'], ground: '#5cb85c', dirt: '#3f8a3f', tile: null, enemies: [108, 120, 123], boss: 109 },
  { name: '炙熱沙漠', sky: ['#ff9f5a', '#ffe0a3'], ground: '#d9a35b', dirt: '#a8763a', tile: 49, enemies: [122, 123, 111], boss: 110 },
  { name: '幽暗墓地', sky: ['#2e2150', '#6b4f8f'], ground: '#4a3f5c', dirt: '#2f2740', tile: 40, enemies: [121, 124, 120], boss: 111 },
  { name: '熔岩火山', sky: ['#3a0d0d', '#b83a1a'], ground: '#5a2a1a', dirt: '#3a1a10', tile: 12, enemies: [110, 122, 108], boss: 109 },
  { name: '天空神殿', sky: ['#7aa8ff', '#f4f0ff'], ground: '#cfc6e8', dirt: '#9c91c0', tile: 57, enemies: [121, 120, 124], boss: 110 },
];

export const ELITE_SPRITE = 92; // 寶箱怪

// star = 稀有度（1~3 星），價格與出現機率跟著星數走
export const SKILLS = [
  { id: 'hits1', icon: '⚔️', star: 1, name: '多重攻擊', desc: '攻擊次數 +1', apply: h => { h.hits += 1; } },
  { id: 'hits3', icon: '🌪️', star: 3, name: '狂風連斬', desc: '攻擊次數 +3', apply: h => { h.hits += 3; } },
  { id: 'atk', icon: '🗡️', star: 1, name: '磨利刀鋒', desc: '攻擊力 +25%', apply: h => { h.atkMul += 0.25; } },
  { id: 'atk2', icon: '💪', star: 2, name: '巨人之力', desc: '攻擊力 +60%', apply: h => { h.atkMul += 0.6; } },
  { id: 'spd', icon: '💨', star: 1, name: '疾風步', desc: '攻擊速度 +20%', apply: h => { h.spdMul += 0.2; } },
  { id: 'crit', icon: '🎯', star: 1, name: '鷹眼', desc: '暴擊率 +12%', apply: h => { h.crit += 0.12; } },
  { id: 'critd', icon: '💥', star: 2, name: '致命一擊', desc: '暴擊傷害 +75%', apply: h => { h.critDmg += 0.75; } },
  { id: 'block', icon: '🛡️', star: 2, name: '鐵壁', desc: '+30% 機率擋下敵人攻擊', apply: h => { h.block = Math.min(0.75, h.block + 0.3); } },
  { id: 'dbl', icon: '✌️', star: 1, name: '雙重打擊', desc: '+30% 機率連續攻擊兩輪', apply: h => { h.dbl += 0.3; } },
  { id: 'life', icon: '🩸', star: 2, name: '吸血', desc: '造成傷害的 8% 變成回血', apply: h => { h.life += 0.08; } },
  { id: 'hp', icon: '❤️', star: 1, name: '強壯體魄', desc: '最大血量 +30% 並補滿', apply: h => { h.maxHp *= 1.3; h.hp = h.maxHp; } },
  { id: 'heal', icon: '🧪', star: 1, name: '治療藥水', desc: '立刻回復 60% 血量', apply: h => { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.6); } },
  { id: 'splash', icon: '🌊', star: 2, name: '震地波', desc: '每次攻擊濺射 35% 傷害給所有敵人', apply: h => { h.splash += 0.35; } },
  { id: 'thorn', icon: '🌵', star: 1, name: '荊棘甲', desc: '被打時反彈 60% 傷害', apply: h => { h.thorns += 0.6; } },
  { id: 'ball', icon: '🔮', star: 2, name: '寶藏獵人', desc: '每殺一隻敵人多掉 2 顆球', apply: h => { h.ballsPerKill += 2; } },
  { id: 'gate', icon: '✖️', star: 3, name: '倍率工匠', desc: '彈珠台多一道 x2 倍率門', apply: (h, run, board) => { board.addGate('x2'); } },
  { id: 'gate3', icon: '➕', star: 2, name: '分裂門', desc: '彈珠台多一道 +3 門', apply: (h, run, board) => { board.addGate('+3'); } },
  { id: 'cup', icon: '🥤', star: 1, name: '大肚杯', desc: '接球杯變寬 25%', apply: (h, run, board) => { board.cupW = Math.min(220, board.cupW * 1.25); } },
];

export const STAR_PRICE = [0, 20, 45, 80];
export const STAR_WEIGHT = [0, 60, 30, 10];

export const UPGRADES = [
  { id: 'atk', icon: '🗡️', name: '基礎攻擊', desc: '每級 +10% 攻擊力' },
  { id: 'hp', icon: '❤️', name: '基礎血量', desc: '每級 +10% 血量' },
  { id: 'coin', icon: '💎', name: '開局球幣', desc: '每級開局多 40 球幣' },
];

export const upgradeCost = lv => Math.round(60 * Math.pow(1.55, lv));

export const MAX_WAVE = 15;
