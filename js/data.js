// 遊戲靜態資料：英雄、敵人、章節、技能卡、局外升級

// 英雄：四種打法差很多
// role = 首頁顯示的定位；crit/block/splash/life/thorns = 天生自帶的能力
export const HEROES = [
  {
    id: 'blade', name: '劍士 艾倫', sprite: 96, price: 0, role: '平衡・近戰',
    hp: 150, atk: 10, interval: 1.0, range: 60, hits: 1, block: 0.1,
    passive: '劍氣：每第 3 次攻擊揮出劍氣，打中所有敵人；天生 10% 格擋',
  },
  {
    id: 'archer', name: '彈射射手 莉亞', sprite: 112, price: 300, role: '高速・遠程',
    hp: 110, atk: 5, interval: 0.5, range: 240, hits: 1, crit: 0.15,
    passive: '球雨箭：每接住 20 顆球自動射出強力箭；攻速極快、天生 15% 暴擊，但很脆',
  },
  {
    id: 'mage', name: '重力法師 諾娃', sprite: 84, price: 700, role: '範圍・遠程',
    hp: 90, atk: 17, interval: 1.7, range: 200, hits: 1, splash: 0.5, magnet: 1,
    passive: '重力井：接球杯會吸住附近的小球；攻擊慢但每下都濺射全體 50%',
  },
  {
    id: 'saw', name: '鏈鋸狂戰 巴克', sprite: 87, price: 1200, role: '坦克・近戰',
    hp: 200, atk: 8, interval: 1.2, range: 60, hits: 1, life: 0.08, thorns: 0.2,
    passive: '鏈鋸：小球每撞釘子 12 次就砍一刀；血超厚、天生吸血 8%、反傷 20%',
  },
];

// 角色圖：Kenney「Tiny Dungeon」（CC0），數字是 assets/tiny-dungeon.png 裡第幾格
// tile = 地面用的磚塊圖（null 表示純色草地）
// bg = 背景三格（天空、地平線、遠景底色），取自 Pixel Platformer 背景圖
// overlay = 蓋在背景上的顏色（做出夜晚、火山的氣氛）
// ground = [地表磚, 地底磚, 圖集]
export const CHAPTERS = [
  { name: '翠綠平原', fog: 'rgba(214,246,222,0.95)', bg: [6, 15, 22], overlay: null, ground: [24, 38, 'pp'], enemies: ['slime', 'bat', 'rat', 'bandit'], boss: 'cyclops', music: 'plains' },
  { name: '炙熱沙漠', fog: 'rgba(255,214,160,0.95)', bg: [4, 13, 20], overlay: null, ground: [25, 4, 'pp'], enemies: ['spider', 'rat', 'bandit', 'shaman'], boss: 'crabking', music: 'desert' },
  { name: '幽暗墓地', fog: 'rgba(64,50,104,0.95)', bg: [0, 11, 16], overlay: 'rgba(40,20,80,0.6)', ground: [40, 40, 'dg'], enemies: ['ghost', 'skull', 'bat', 'shaman'], boss: 'deathknight', music: 'grave' },
  { name: '熔岩火山', fog: 'rgba(120,38,22,0.95)', bg: [5, 12, 21], overlay: 'rgba(150,20,0,0.45)', ground: [12, 12, 'dg'], enemies: ['lavacrab', 'spider', 'skull', 'slime'], boss: 'firegiant', music: 'volcano' },
  { name: '天空神殿', fog: 'rgba(236,240,255,0.95)', bg: [1, 9, 17], overlay: null, ground: [58, 57, 'dg'], enemies: ['bat', 'ghost', 'skyknight', 'shaman'], boss: 'guardian', music: 'sky' },
];

// ---------- 怪物圖鑑 ----------
// hp / atk：相對於基準的倍率；speed：走路速度；iv：攻擊間隔（秒）
// dodge：閃避率；armor：減傷比例（0.3 = 少受 30% 傷害）
export const MONSTERS = {
  slime: { name: '史萊姆', sprite: 108, hp: 1.4, atk: 0.8, speed: 0.8, iv: 1.4, trait: '皮厚' },
  bat: { name: '吸血蝠', sprite: 120, hp: 0.6, atk: 0.9, speed: 1.8, iv: 0.9, trait: '飛很快' },
  rat: { name: '巨鼠', sprite: 123, hp: 1, atk: 1, speed: 1.2, iv: 1.2 },
  bandit: { name: '山賊', sprite: 86, hp: 1.1, atk: 1.2, speed: 1, iv: 1.2 },
  spider: { name: '毒蛛', sprite: 122, hp: 0.9, atk: 1.25, speed: 1.4, iv: 1.1, trait: '速度快' },
  shaman: { name: '邪教祭司', sprite: 111, hp: 0.85, atk: 1.6, speed: 0.9, iv: 1.6, trait: '攻擊高' },
  ghost: { name: '幽魂', sprite: 121, hp: 0.8, atk: 1.1, speed: 1.1, iv: 1.3, dodge: 0.25, trait: '25% 閃避' },
  skull: { name: '骷髏兵', sprite: 124, hp: 1.2, atk: 1, speed: 0.9, iv: 1.3, armor: 0.3, trait: '減傷 30%' },
  lavacrab: { name: '熔岩蟹', sprite: 110, hp: 1.5, atk: 1.3, speed: 0.8, iv: 1.5, armor: 0.15, trait: '減傷 15%' },
  skyknight: { name: '天空騎士', sprite: 97, hp: 1.4, atk: 1.2, speed: 1, iv: 1.3, armor: 0.2, trait: '減傷 20%' },
  mimic: { name: '寶箱怪', sprite: 92, hp: 1, atk: 1, speed: 1, iv: 1.4 },
  // 魔王（每章一隻）
  cyclops: { name: '獨眼巨人', sprite: 109, hp: 1, atk: 1, speed: 0.7, iv: 1.6, boss: true },
  crabking: { name: '沙暴蟹王', sprite: 110, hp: 1.1, atk: 0.95, speed: 0.7, iv: 1.5, armor: 0.15, boss: true },
  deathknight: { name: '亡靈騎士', sprite: 124, hp: 1, atk: 1.15, speed: 0.8, iv: 1.4, dodge: 0.1, boss: true },
  firegiant: { name: '炎之巨人', sprite: 109, hp: 1.2, atk: 1.1, speed: 0.7, iv: 1.6, boss: true },
  guardian: { name: '天空守護者', sprite: 100, hp: 1.1, atk: 1.1, speed: 0.8, iv: 1.3, armor: 0.2, boss: true },
};

// ---------- 怪物強度等級 ----------
// 同一種怪可以是不同等級：越高級越大隻、越強、掉越多球
// skillDrop：被打倒時掉落免費技能的機率
export const TIERS = {
  normal: { hp: 1, atk: 1, size: 0.75, balls: 1 },
  captain: { hp: 3, atk: 1.5, size: 0.95, balls: 3, label: '隊長', color: '#ffd84a' },
  elite: { hp: 5, atk: 1.9, size: 1.05, balls: 7, label: '菁英', color: '#d06bff', skillDrop: 0.35 },
  chest: { hp: 5, atk: 1.8, size: 1.1, balls: 5, label: '寶箱怪', color: '#ff9f43', skillDrop: 0.6 },
  boss: { hp: 22, atk: 2.6, size: 1.85, balls: 15, label: '魔王', color: '#ff3df0' },
};

// star = 稀有度（1~3 星），價格與出現機率跟著星數走
// 技能卡
// star：稀有度（1~3 星，影響價格和出現機率）
// max：等級上限，滿級後不會再出現在商店；沒有 max 的（治療藥水）可以一直買
// maxDesc / maxApply：升到滿級那一刻額外獲得的「滿級獎勵」
export const SKILLS = [
  { id: 'hits1', icon: ['ic', 426, '#e8eef7'], star: 1, max: 5, name: '多重攻擊', desc: '攻擊次數 +1', apply: h => { h.hits += 1; },
    maxDesc: '攻擊次數再 +2', maxApply: h => { h.hits += 2; } },
  { id: 'hits3', icon: ['ic', 1021, '#7fd1ff'], star: 3, max: 2, name: '狂風連斬', desc: '攻擊次數 +3', apply: h => { h.hits += 3; },
    maxDesc: '+25% 機率再追加一輪攻擊', maxApply: h => { h.dbl += 0.25; } },
  { id: 'atk', icon: ['ic', 424, '#e8eef7'], star: 1, max: 5, name: '磨利刀鋒', desc: '攻擊力 +25%', apply: h => { h.atkMul += 0.25; },
    maxDesc: '攻擊力再 +50%', maxApply: h => { h.atkMul += 0.5; } },
  { id: 'atk2', icon: ['ic', 385, '#ff9f43'], star: 2, max: 3, name: '巨人之力', desc: '攻擊力 +60%', apply: h => { h.atkMul += 0.6; },
    maxDesc: '暴擊傷害 +100%', maxApply: h => { h.critDmg += 1; } },
  { id: 'spd', icon: ['ic', 1058], star: 1, max: 5, name: '疾風步', desc: '攻擊速度 +20%', apply: h => { h.spdMul += 0.2; },
    maxDesc: '攻擊速度再 +30%', maxApply: h => { h.spdMul += 0.3; } },
  { id: 'crit', icon: ['ic', 712, '#ff5a5a'], star: 1, max: 5, name: '鷹眼', desc: '暴擊率 +12%', apply: h => { h.crit += 0.12; },
    maxDesc: '暴擊率再 +15%', maxApply: h => { h.crit += 0.15; } },
  { id: 'critd', icon: ['ic', 576, '#ffd84a'], star: 2, max: 3, name: '致命一擊', desc: '暴擊傷害 +75%', apply: h => { h.critDmg += 0.75; },
    maxDesc: '暴擊時震波打中所有敵人（50% 傷害）', maxApply: h => { h.critSplash = 0.5; } },
  { id: 'block', icon: ['ic', 233, '#9fe3ff'], star: 2, max: 2, name: '鐵壁', desc: '+30% 機率擋下敵人攻擊', apply: h => { h.block = Math.min(0.75, h.block + 0.3); },
    maxDesc: '格擋時反擊，造成 200% 攻擊力傷害', maxApply: h => { h.counter = 2; } },
  { id: 'dbl', icon: ['ic', 569, '#ffd84a'], star: 1, max: 3, name: '雙重打擊', desc: '+30% 機率連續攻擊兩輪', apply: h => { h.dbl += 0.3; },
    maxDesc: '連擊機率再 +50%', maxApply: h => { h.dbl += 0.5; } },
  { id: 'life', icon: ['ic', 531], star: 2, max: 3, name: '吸血', desc: '造成傷害的 8% 變成回血', apply: h => { h.life += 0.08; },
    maxDesc: '吸血再 +10%', maxApply: h => { h.life += 0.1; } },
  { id: 'hp', icon: ['ic', 532], star: 1, max: 5, name: '強壯體魄', desc: '最大血量 +30% 並補滿', apply: h => { h.maxHp *= 1.3; h.hp = h.maxHp; },
    maxDesc: '每一波開始時血量全滿', maxApply: h => { h.fullHealWave = true; } },
  { id: 'heal', icon: ['ic', 669], star: 1, name: '治療藥水', desc: '立刻回復 60% 血量', apply: h => { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.6); } },
  { id: 'splash', icon: ['ic', 616, '#36d6ff'], star: 2, max: 3, name: '震地波', desc: '每次攻擊濺射 35% 傷害給所有敵人', apply: h => { h.splash += 0.35; },
    maxDesc: '濺射再 +50%', maxApply: h => { h.splash += 0.5; } },
  { id: 'thorn', icon: ['ic', 184], star: 1, max: 3, name: '荊棘甲', desc: '被打時反彈 60% 傷害', apply: h => { h.thorns += 0.6; },
    maxDesc: '反彈再 +150%', maxApply: h => { h.thorns += 1.5; } },
  { id: 'ball', icon: ['ic', 237], star: 2, max: 5, name: '寶藏獵人', desc: '每殺一隻敵人多掉 2 顆球', apply: h => { h.ballsPerKill += 2; },
    maxDesc: '每殺一隻再多掉 5 顆球', maxApply: h => { h.ballsPerKill += 5; } },
  { id: 'gate', icon: ['ic', 1018, '#36d6ff'], star: 3, max: 2, name: '倍率工匠', desc: '彈珠台多一道 x2 倍率門', apply: (h, run, board) => { board.addGate('x2'); },
    maxDesc: '所有 x2 門變寬 30%', maxApply: (h, run, board) => { board.widenGates('x2', 1.3); } },
  { id: 'gate3', icon: ['ic', 1016, '#6dff8a'], star: 2, max: 2, name: '分裂門', desc: '彈珠台多一道 +3 門', apply: (h, run, board) => { board.addGate('+3'); },
    maxDesc: '所有 +3 門升級成 +5 門', maxApply: (h, run, board) => { board.upgradeGates('+3', '+5'); } },
  { id: 'gatex3', icon: ['ic', 1018, '#ffd84a'], star: 3, max: 2, gold: true, name: '黃金倍率', desc: '彈珠台多一道金色 x3 倍率門', apply: (h, run, board) => { board.addGate('x3'); },
    maxDesc: '金色 x3 門變寬 40%、移動變慢', maxApply: (h, run, board) => { board.widenGates('x3', 1.4, 0.5); } },
  { id: 'cup', icon: ['ic', 192], star: 1, max: 3, name: '大肚杯', desc: '接球杯變寬 25%', apply: (h, run, board) => { board.cupW = Math.min(220, board.cupW * 1.25); },
    maxDesc: '接住的球從 x2 變成 x3', maxApply: (h, run, board) => { board.cupMult = 3; } },

  // ---------- 職業專屬技能（只會出現在對應英雄的商店）----------
  // 劍士
  { id: 'b_whirl', hero: 'blade', icon: ['ic', 1021, '#7fd1ff'], star: 2, max: 2, name: '旋風劍氣', desc: '劍氣觸發所需攻擊次數 -1', apply: h => { h.swordEvery = Math.max(1, h.swordEvery - 1); },
    maxDesc: '劍氣會連發兩道', maxApply: h => { h.swordTwice = true; } },
  { id: 'b_edge', hero: 'blade', icon: ['ic', 426, '#7fd1ff'], star: 1, max: 3, name: '劍氣強化', desc: '劍氣傷害 +80%', apply: h => { h.swordMul += 0.8; },
    maxDesc: '劍氣必定暴擊', maxApply: h => { h.swordCrit = true; } },
  { id: 'b_guard', hero: 'blade', icon: ['ic', 233, '#ffd84a'], star: 2, max: 2, name: '劍盾架式', desc: '格擋 +15%，格擋時回復 4% 血量', apply: h => { h.block = Math.min(0.8, h.block + 0.15); h.blockHeal += 0.04; },
    maxDesc: '格擋時回血加倍', maxApply: h => { h.blockHeal *= 2; } },
  // 射手
  { id: 'a_multi', hero: 'archer', icon: ['ic', 289, '#b6ff6d'], star: 2, max: 3, name: '多重箭', desc: '每次攻擊多射 1 支箭給隨機敵人', apply: h => { h.multiShot += 1; },
    maxDesc: '多重箭傷害 +100%', maxApply: h => { h.multiMul = 2; } },
  { id: 'a_pierce', hero: 'archer', icon: ['ic', 289, '#ffd84a'], star: 2, max: 2, name: '穿透箭', desc: '箭會穿透，打到後面的敵人（40% 傷害）', apply: h => { h.pierce += 0.4; },
    maxDesc: '穿透傷害變成 100%', maxApply: h => { h.pierce = 1; } },
  { id: 'a_rain', hero: 'archer', icon: ['ic', 237, '#b6ff6d'], star: 1, max: 3, name: '箭雨加速', desc: '球雨箭需要的接球數 -4', apply: h => { h.arrowNeed = Math.max(6, h.arrowNeed - 4); },
    maxDesc: '球雨箭一次射 3 支', maxApply: h => { h.arrowCount = 3; } },
  // 法師
  { id: 'm_meteor', hero: 'mage', icon: ['ic', 616, '#ff9f43'], star: 3, max: 2, name: '隕石術', desc: '每 4 次攻擊召喚隕石打全體（300% 傷害）', apply: h => { h.meteorEvery = 4; h.meteorMul += 3; },
    maxDesc: '每 3 次攻擊就召喚隕石', maxApply: h => { h.meteorEvery = 3; } },
  { id: 'm_grav', hero: 'mage', icon: ['ic', 1018, '#d06bff'], star: 1, max: 3, name: '重力強化', desc: '接球杯吸力的範圍與力度 +40%', apply: h => { h.magnet += 0.4; },
    maxDesc: '吸力再 +80%', maxApply: h => { h.magnet += 0.8; } },
  { id: 'm_frost', hero: 'mage', icon: ['ic', 669, '#9fe3ff'], star: 2, max: 2, name: '冰霜', desc: '被打到的敵人攻擊速度 -25%', apply: h => { h.frost += 0.25; },
    maxDesc: '冰霜效果加倍', maxApply: h => { h.frost = Math.min(0.8, h.frost * 2); } },
  // 狂戰士
  { id: 's_saw', hero: 'saw', icon: ['ic', 385, '#ff9f43'], star: 1, max: 3, name: '鏈鋸加速', desc: '鏈鋸需要的撞擊數 -3', apply: h => { h.sawNeed = Math.max(3, h.sawNeed - 3); },
    maxDesc: '鏈鋸傷害 +150%', maxApply: h => { h.sawMul += 1.5; } },
  { id: 's_rage', hero: 'saw', icon: ['ic', 531, '#ff5a5a'], star: 2, max: 2, name: '狂暴', desc: '血量低於 50% 時攻擊力 +60%', apply: h => { h.rage += 0.6; },
    maxDesc: '狂暴時攻擊速度 +50%', maxApply: h => { h.rageSpd = 0.5; } },
  { id: 's_feast', hero: 'saw', icon: ['ic', 532, '#ff5a5a'], star: 2, max: 3, name: '嗜血', desc: '每擊殺一隻敵人回復 6% 血量', apply: h => { h.killHeal += 0.06; },
    maxDesc: '擊殺時最大血量永久 +3%', maxApply: h => { h.killGrow = 0.03; } },
];

export const STAR_PRICE = [0, 20, 45, 80];
export const STAR_WEIGHT = [0, 60, 30, 10];

export const MAX_WAVE = 15;
// 無盡塔：每 10 層一個循環（第 10、20、30… 層是魔王），打完魔王進入下一章
export const ENDLESS_CYCLE = 10;
export const isBossWave = (run, w) => run.endless ? w % ENDLESS_CYCLE === 0 : w === MAX_WAVE;
// 這一層在目前循環裡是第幾波（用來決定怪物數量與強度）
export const stageWave = (run, w) => run.endless ? ((w - 1) % ENDLESS_CYCLE) + 1 : w;
