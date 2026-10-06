// 遊戲靜態資料：英雄、敵人、章節、技能卡、局外升級

// 英雄：四種打法差很多
// role = 首頁顯示的定位；crit/block/splash/life/thorns = 天生自帶的能力
export const HEROES = [
  {
    id: 'blade', name: '劍士 艾倫', sprite: 96, price: 0, role: '平衡・近戰', cls: 'melee', tags: ['martial', 'thunder'],
    hp: 150, atk: 10, interval: 1.0, range: 60, hits: 1, block: 0.1,
    passive: '劍氣：每第 3 次攻擊揮出劍氣，打中所有敵人；天生 10% 格擋',
  },
  {
    id: 'archer', name: '彈射射手 莉亞', sprite: 112, price: 300, role: '高速・遠程', cls: 'ranged', tags: ['martial', 'beast'],
    hp: 185, atk: 7, interval: 0.5, range: 240, hits: 1, crit: 0.15,
    passive: '球雨箭：每接住 20 顆球自動射出強力箭；攻速極快、天生 15% 暴擊，但很脆',
  },
  {
    id: 'mage', name: '重力法師 諾娃', sprite: 84, price: 700, role: '範圍・法術', cls: 'spell', tags: ['star', 'frost'],
    hp: 150, atk: 18, interval: 1.7, range: 200, hits: 1, splash: 0.5, magnet: 1,
    passive: '重力井：接球杯會吸住附近的小球；攻擊慢但每下都濺射全體 50%',
  },
  {
    id: 'saw', name: '鏈鋸狂戰 巴克', sprite: 87, price: 1200, role: '坦克・近戰', cls: 'melee', tags: ['mech', 'beast'],
    hp: 200, atk: 8, interval: 1.2, range: 60, hits: 1, life: 0.08, thorns: 0.2,
    passive: '鏈鋸：小球每撞釘子 12 次就砍一刀；血超厚、天生吸血 8%、反傷 20%',
  },
  {
    id: 'paladin', name: '聖騎士 雷恩', sprite: 98, price: 1800, role: '續戰・近戰', cls: 'melee', tags: ['holy', 'martial'],
    hp: 170, atk: 9, interval: 1.1, range: 60, hits: 1, block: 0.15,
    passive: '聖光：每第 5 次攻擊放出聖光，回復 8% 血量並打中所有敵人（80%）；天生 15% 格擋',
  },
  {
    id: 'rogue', name: '暗影刺客 夜', sprite: 88, price: 2400, role: '爆發・近戰', cls: 'melee', tags: ['shadow', 'poison'],
    hp: 115, atk: 7, interval: 0.6, range: 60, hits: 1, crit: 0.25, critDmg: 2.2, dodge: 0.15,
    passive: '背刺：天生 25% 暴擊、暴擊傷害 220%；15% 機率閃避敵人攻擊',
  },
  {
    id: 'gunner', name: '火槍手 布雷', sprite: 85, price: 3000, role: '轟炸・遠程', cls: 'ranged', tags: ['mech', 'fire'],
    hp: 195, atk: 16, interval: 1.3, range: 260, hits: 1,
    passive: '榴彈：每第 5 次攻擊丟出榴彈，炸所有敵人（150%）；射程最遠',
  },
  {
    id: 'elem', name: '元素使 艾拉', sprite: 99, price: 3600, role: '元素・法術', cls: 'spell', tags: ['fire', 'frost', 'thunder'],
    hp: 160, atk: 14, interval: 1.0, range: 200, hits: 1,
    passive: '三元素：每次攻擊隨機附加火（燃燒）、冰（減速）、雷（跳 2 隻敵人）',
  },
  // ---------- 隱藏職業：不能用金幣買，達成指定成就自動解鎖 ----------
  {
    id: 'dragoon', name: '龍騎士 席格', sprite: 97, price: 0, hidden: true, rarity: 'legend', unlock: 'hard', role: '龍族・近戰＋法術', cls: ['melee', 'spell'], tags: ['dragon', 'fire'],
    hp: 180, atk: 13, interval: 1.0, range: 60, hits: 1, block: 0.1,
    passive: '龍息：每第 4 次攻擊噴出龍火，燒所有敵人（150%＋燃燒）；近戰與法術技能都能用',
  },
  {
    id: 'sage', name: '星辰賢者 奧', sprite: 111, price: 0, hidden: true, rarity: 'elite', unlock: 'tower20', role: '星辰・遠程＋法術', cls: ['ranged', 'spell'], tags: ['star', 'holy'],
    hp: 150, atk: 14, interval: 0.9, range: 240, hits: 1, crit: 0.1, magnet: 0.5,
    passive: '星落：每接住 15 顆球，流星打中所有敵人（200%）；杯子會輕輕吸球；遠程與法術技能都能用',
  },
  {
    id: 'thief', name: '盜賊王 金手指', sprite: 86, price: 0, hidden: true, rarity: 'rare', unlock: 'rich', role: '致富・近戰', cls: 'melee', tags: ['wealth', 'shadow'],
    hp: 150, atk: 11, interval: 0.65, range: 60, hits: 1, crit: 0.15, dodge: 0.08,
    passive: '搶奪：每擊敗一隻敵人直接拿 3 球幣；結算金幣 +20%；8% 閃避',
  },
  // ---------- 3.4 扭蛋英雄（稀有、精英）：只能從角色池抽到（碎片湊齊或直接抽到整隻） ----------
  {
    id: 'hilda', name: '霜弓獵手 希爾妲', sprite: ['hx', 0], price: 0, gacha: true, rarity: 'rare', role: '控場・遠程', cls: 'ranged', tags: ['frost', 'martial'],
    hp: 165, atk: 8, interval: 0.7, range: 240, hits: 1, crit: 0.1,
    init: h => { h.frost = 0.1; h.freezeEvery = 4; h.freezeTime = 0.8; h.frozenAmp = 0.25; },
    passive: '寒霜箭：攻擊讓敵人變慢；每第 4 箭凍結敵人 0.8 秒（魔王較短），凍住的敵人受到傷害 +25%',
    perks: { s3: ['寒冰箭改成每 3 箭一次', h => { h.freezeEvery = 3; }], s5: ['永凍之弓：凍結增傷 +25%，暴擊率 +10%', h => { h.frozenAmp += 0.25; h.crit += 0.1; }] },
  },
  {
    id: 'gren', name: '矮人盾衛 葛倫', sprite: ['hx', 4], price: 0, gacha: true, rarity: 'rare', role: '坦克・近戰', cls: 'melee', tags: ['martial', 'mech'],
    hp: 250, atk: 9, interval: 1.2, range: 60, hits: 1, block: 0.25,
    init: h => { h.bashEvery = 3; h.bashMul = 1.2; },
    passive: '反擊盾：天生 25% 格擋；每格擋 3 次，盾擊所有敵人（120%）並擊暈 0.5 秒',
    perks: { s3: ['盾擊只要格擋 2 次', h => { h.bashEvery = 2; }], s5: ['山岳之壁：受到的傷害 -10%，盾擊傷害 +100%', h => { h.dr += 0.1; h.bashMul += 1; }] },
  },
  {
    id: 'fio', name: '獄火術士 菲歐', sprite: ['hx', 8], price: 0, gacha: true, rarity: 'rare', role: '燃燒・法術', cls: 'spell', tags: ['fire', 'star'],
    hp: 175, atk: 17, interval: 1.1, range: 200, hits: 1,
    init: h => { h.dr = Math.min(0.3, h.dr + 0.1); h.dot = 0.3; h.dotColor = '#ff7a3b'; h.dotTime = 3; h.meteorEvery = 6; h.meteorMul = 0.8; },
    passive: '業火：攻擊讓敵人燃燒（每秒 30%）；每 6 次攻擊落下火雨打全體（80%）；火焰護體，受到的傷害 -10%',
    perks: { s3: ['燃燒傷害 +15%', h => { h.dot += 0.15; }], s5: ['流星火：火雨傷害 +100%，擊殺時爆炸 30%', h => { h.meteorMul += 1; h.killBlast += 0.3; }] },
  },
  {
    id: 'vicky', name: '毒牙遊俠 薇琪', sprite: ['hx', 12], price: 0, gacha: true, rarity: 'rare', role: '疊毒・遠程', cls: 'ranged', tags: ['poison', 'beast'],
    hp: 195, atk: 8, interval: 0.6, range: 240, hits: 1, crit: 0.1,
    init: h => { h.dot = 0.3; h.dotColor = '#7dff5a'; h.dotTime = 4; },
    passive: '蛇毒：每箭讓敵人中毒（每秒 30%，4 秒）；跑得快的遠程輸出',
    perks: { s3: ['毒持續 4 → 6 秒', h => { h.dotTime = 6; }], s5: ['萬蛇之母：暴擊時再疊一次劇毒（每秒 60%）', h => { h.critDot = (h.critDot || 0) + 0.6; }] },
  },
  {
    id: 'lok', name: '月狼戰士 洛克', sprite: ['hx', 16], price: 0, gacha: true, rarity: 'rare', role: '變身・近戰', cls: 'melee', tags: ['beast', 'star'],
    hp: 195, atk: 11, interval: 0.9, range: 60, hits: 1, life: 0.05,
    init: h => { h.rage = 0.25; h.rageSpd = 0.4; },
    passive: '月狂：血量低於一半化身狼人，攻擊力 +25%、攻擊速度 +40%；天生 5% 吸血',
    perks: { s3: ['狼形攻擊力再 +15%', h => { h.rage += 0.15; }], s5: ['滿月：受到的傷害 -15%，攻擊次數 +1', h => { h.dr += 0.15; h.hits += 1; }] },
  },
  {
    id: 'mary', name: '祈光修女 瑪莉', sprite: ['hx', 20], price: 0, gacha: true, rarity: 'rare', role: '輔助・法術', cls: 'spell', tags: ['holy', 'frost'],
    hp: 165, atk: 12, interval: 1.0, range: 200, hits: 1,
    init: h => { h.holyOn = true; h.holyEvery = 4; h.holyMul = 0.6; h.regenPs = 0.008; h.switchHeal = 0.15; },
    passive: '聖泉：每第 4 次攻擊放聖光打全體（60%）並回血；每秒回 0.8% 血；雙職業換手時給上場者回 15% 血',
    perks: { s3: ['聖光改成每 3 次攻擊', h => { h.holyEvery = 3; }], s5: ['聖女的祈禱：每波第一次受到致命傷時保留 1 點血', h => { h.undying = true; }] },
  },
  {
    id: 'thorfin', name: '雷鎚戰士 托爾芬', sprite: ['hx', 24], price: 0, gacha: true, rarity: 'rare', role: '雷擊・近戰', cls: 'melee', tags: ['thunder', 'martial'],
    hp: 190, atk: 12, interval: 1.1, range: 60, hits: 1,
    init: h => { h.chainEvery = 4; h.chainMul = 1.3; h.chainJumps = 3; h.stun = Math.max(h.stun, 0.08); },
    passive: '雷鎚：每第 4 擊召來落雷，連跳 3 隻敵人（130%）；8% 機率擊暈',
    perks: { s3: ['落雷連跳 3 → 5 隻', h => { h.chainJumps += 2; }], s5: ['雷神降臨：落雷改成每 3 擊，傷害 +50%', h => { h.chainEvery = Math.min(h.chainEvery, 3); h.chainMul += 0.5; }] },
  },
  {
    id: 'pip', name: '機關弩匠 皮普', sprite: ['hx', 28], price: 0, gacha: true, rarity: 'rare', role: '召喚・遠程', cls: 'ranged', tags: ['mech', 'wealth'],
    hp: 195, atk: 10, interval: 0.95, range: 240, hits: 1,
    init: h => { h.turrets = 1; h.turretMul = 0.6; h.turretCoins = 1; },
    passive: '自動砲台：身邊有 1 座砲台，每秒射 60% 攻擊力；砲台擊殺 +1 球幣',
    perks: { s3: ['砲台 1 → 2 座', h => { h.turrets += 1; }], s5: ['機關大師：砲台傷害 +40%', h => { h.turretMul += 0.4; }] },
  },
  {
    id: 'esti', name: '冰霜女巫 艾絲蒂', sprite: ['hx', 32], price: 0, gacha: true, rarity: 'elite', role: '冰凍・法術', cls: 'spell', tags: ['frost', 'shadow'],
    hp: 150, atk: 17, interval: 1.2, range: 200, hits: 1, splash: 0.2,
    init: h => { h.frost = 0.15; h.freezeEvery = 3; h.freezeTime = 1; h.frozenAmp = 0.3; },
    passive: '寒冰領域：濺射 20%；每第 3 次攻擊凍結 1 秒，凍住的敵人受到傷害 +30%',
    perks: { s3: ['凍結改成每 2 次攻擊', h => { h.freezeEvery = 2; }], s5: ['絕對寒冰：凍結增傷再 +30%，濺射 +15%', h => { h.frozenAmp += 0.3; h.splash += 0.15; }] },
  },
  {
    id: 'kalan', name: '龍血騎士 卡蘭', sprite: ['hx', 36], price: 0, gacha: true, rarity: 'elite', role: '吸血・近戰', cls: 'melee', tags: ['dragon', 'shadow'],
    hp: 200, atk: 12, interval: 1.0, range: 60, hits: 1, life: 0.1,
    init: h => { h.breathOn = true; h.breathEvery = 5; h.breathMul = 1.1; h.killHeal = 0.02; },
    passive: '龍血：天生 10% 吸血、擊殺回 2% 血；每第 5 擊噴出龍息燒全體（110%）',
    perks: { s3: ['吸血 +5%', h => { h.life += 0.05; }], s5: ['龍血覺醒：龍息連噴兩次', h => { h.breathTwice = true; }] },
  },
  {
    id: 'sian', name: '風暴召喚師 席安', sprite: ['hx', 44], price: 0, gacha: true, rarity: 'elite', role: '連鎖・法術', cls: 'spell', tags: ['thunder', 'star'],
    hp: 170, atk: 13, interval: 0.95, range: 200, hits: 1,
    init: h => { h.dr = Math.min(0.3, h.dr + 0.1); h.chainEvery = 2; h.chainMul = 0.8; h.chainJumps = 4; },
    passive: '風暴：每 2 次攻擊放出閃電，連跳 4 隻敵人（80%）；風之屏障，受到的傷害 -10%',
    perks: { s3: ['閃電多跳 2 隻', h => { h.chainJumps += 2; }], s5: ['雷暴：閃電傷害 +60%，每 6 秒雷擊 3 隻（100%）', h => { h.chainMul += 0.6; h.jewels.push({ id: 'thunder', every: 6, mul: 1, t: 0 }); }] },
  },
  {
    id: 'ruri', name: '影舞者 琉璃', sprite: ['hx', 56], price: 0, gacha: true, rarity: 'elite', role: '閃避・近戰', cls: 'melee', tags: ['shadow', 'martial'],
    hp: 140, atk: 9, interval: 0.6, range: 60, hits: 1, crit: 0.2, critDmg: 2.0, dodge: 0.2,
    init: h => { h.dodgeCrit = true; h.cleave = Math.max(h.cleave, 0.3); },
    passive: '影舞：20% 閃避、20% 暴擊；閃避後下一擊必定暴擊；攻擊同時砍到第 2 隻（30%）',
    perks: { s3: ['閃避 +5%', h => { h.dodge += 0.05; }], s5: ['影殺：對血量 30% 以下的敵人傷害 +60%', h => { h.exec += 0.6; }] },
  },
  {
    id: 'g7', name: '蒸汽機兵 鋼鐵七號', sprite: ['hx', 40], price: 0, gacha: true, rarity: 'elite', role: '坦克輸出・近戰', cls: 'melee', tags: ['mech', 'fire'],
    hp: 230, atk: 11, interval: 1.15, range: 60, hits: 1,
    init: h => { h.dr = Math.min(0.3, h.dr + 0.15); h.burstEvery = 10; h.burstMul = 0.5; h.burstCount = 6; },
    passive: '熱能核心：天生減傷 15%；每 10 次攻擊過熱，連續噴火 6 次打全體（每次 50%）',
    perks: { s3: ['過熱噴火 6 → 8 次', h => { h.burstCount += 2; }], s5: ['蒸汽爆炸：過熱改成每 7 次攻擊，噴火傷害 +30%', h => { h.burstEvery = 7; h.burstMul += 0.3; }] },
  },
  {
    id: 'balu', name: '獸王 巴魯', sprite: ['hx', 48], price: 0, gacha: true, rarity: 'elite', role: '召喚・近戰', cls: 'melee', tags: ['beast', 'poison'],
    hp: 205, atk: 10, interval: 1.0, range: 60, hits: 1,
    init: h => { h.turrets = 1; h.turretMul = 0.45; h.petSprite = ['tc', 24]; h.roarEvery = 20; },
    passive: '獸群：帶一隻戰狼夥伴（每秒攻擊 45%）；每 20 次攻擊巨熊咆哮，擊暈全體 1 秒',
    perks: { s3: ['咆哮改成每 14 次攻擊，並給自己 10% 血量護盾', h => { h.roarEvery = 14; h.shieldPct += 0.1; }], s5: ['萬獸之王：多一隻戰狼，夥伴傷害 +30%', h => { h.turrets += 1; h.turretMul += 0.3; }] },
  },
  {
    id: 'cyrus', name: '審判官 賽勒斯', sprite: ['hx', 52], price: 0, gacha: true, rarity: 'elite', role: '單體・遠程', cls: 'ranged', tags: ['holy', 'mech'],
    hp: 205, atk: 16, interval: 1.3, range: 260, hits: 1, crit: 0.1,
    init: h => { h.markAmp = 0.3; h.markBlast = 1.2; },
    passive: '審判印記：標記血量最多的敵人，受到傷害 +30%；被標記的敵人死掉時，聖光爆炸打全體（120%）',
    perks: { s3: ['聖光爆炸 120% → 200%', h => { h.markBlast += 0.8; }], s5: ['最終審判：印記增傷再 +40%，對魔王傷害 +20%', h => { h.markAmp += 0.4; h.bossDmg += 0.2; }] },
  },
  {
    id: 'moore', name: '瘟疫醫生 摩爾', sprite: ['hx', 60], price: 0, gacha: true, rarity: 'elite', role: '擴散・法術', cls: 'spell', tags: ['poison', 'mech'],
    hp: 200, atk: 11, interval: 1.0, range: 200, hits: 1,
    init: h => { h.dot = 0.3; h.dotColor = '#7dff5a'; h.dotTime = 4; h.plague = true; h.dr = Math.min(0.3, h.dr + 0.1); },
    passive: '瘟疫：攻擊讓敵人中毒（每秒 30%，4 秒）；中毒的敵人死掉時，毒傳染給所有敵人；面具保護，受到的傷害 -10%',
    perks: { s3: ['毒傷 +15%', h => { h.dot += 0.15; }], s5: ['黑死病：毒傷 +30%，毒持續 6 秒', h => { h.dot += 0.3; h.dotTime = 6; }] },
  },
  {
    id: 'morgan', name: '海盜船長 莫甘', sprite: ['hx', 64], price: 0, gacha: true, rarity: 'elite', role: '致富轟炸・遠程', cls: 'ranged', tags: ['wealth', 'fire'],
    hp: 215, atk: 17, interval: 1.4, range: 260, hits: 1,
    init: h => { h.grenadeOn = true; h.grenadeEvery = 3; h.grenadeMul = 1.2; h.coinAtk = 0.04; h.coinCap = 0.4; },
    passive: '黃金加農：每第 3 擊發射加農砲打全體（120%）；身上每 100 球幣攻擊力 +4%（最多 +40%）',
    perks: { s3: ['加農砲擊暈 0.5 秒', h => { h.grenadeStun = true; }], s5: ['海上霸主：加農砲傷害 +60%，球幣加攻上限 +20%', h => { h.grenadeMul += 0.6; h.coinCap += 0.2; }] },
  },
];

// 角色圖：Kenney「Tiny Dungeon」（CC0），數字是 assets/tiny-dungeon.png 裡第幾格
// tile = 地面用的磚塊圖（null 表示純色草地）
// bg = 背景三格（天空、地平線、遠景底色），取自 Pixel Platformer 背景圖
// overlay = 蓋在背景上的顏色（做出夜晚、火山的氣氛）
// ground = [地表磚, 地底磚, 圖集]
export const CHAPTERS = [
  { name: '翠綠平原', sky: 'plains', fog: 'rgba(214,246,222,0.95)', bg: [6, 15, 22], overlay: null, ground: [24, 38, 'pp'], enemies: ['slime', 'bat', 'rat', 'bandit', 'goblin', 'boar', 'shroom'], boss: 'cyclops', music: 'plains' },
  { name: '炙熱沙漠', sky: 'desert', fog: 'rgba(255,214,160,0.95)', bg: [4, 13, 20], overlay: null, ground: [25, 4, 'pp'], enemies: ['scorpion', 'snake', 'whirl', 'spider', 'bandit', 'shaman'], boss: 'crabking', music: 'desert' },
  { name: '幽暗墓地', sky: 'grave', fog: 'rgba(64,50,104,0.95)', bg: [0, 11, 16], overlay: 'rgba(40,20,80,0.6)', ground: [40, 40, 'dg'], enemies: ['ghost', 'skull', 'zombie', 'wraith', 'vampire', 'bat', 'shaman'], boss: 'deathknight', music: 'grave' },
  { name: '熔岩火山', sky: 'volcano', fog: 'rgba(120,38,22,0.95)', bg: [5, 12, 21], overlay: 'rgba(150,20,0,0.45)', ground: [12, 12, 'dg'], enemies: ['lavacrab', 'fireling', 'imp', 'golem', 'skull', 'spider'], boss: 'firegiant', music: 'volcano' },
  { name: '天空神殿', sky: 'sky', fog: 'rgba(236,240,255,0.95)', bg: [1, 9, 17], overlay: null, ground: [58, 57, 'dg'], enemies: ['eagle', 'griffin', 'frost', 'skyknight', 'ghost', 'shaman'], boss: 'guardian', music: 'sky' },
];

// ---------- 怪物圖鑑 ----------
// hp / atk：相對於基準的倍率；speed：走路速度；iv：攻擊間隔（秒）
// dodge：閃避率；armor：減傷比例（0.3 = 少受 30% 傷害）
export const MONSTERS = {
  slime: { name: '史萊姆', sprite: 108, ai: 'split', hp: 1.4, atk: 0.8, speed: 0.8, iv: 1.4, trait: '皮厚；死掉會分裂成 2 隻' },
  bat: { name: '吸血蝠', sprite: ['tc', 137], ai: 'fly', hp: 0.6, atk: 0.9, speed: 1.8, iv: 0.9, trait: '飛很快；飛行：近戰不容易打到' },
  rat: { name: '巨鼠', sprite: 123, hp: 1, atk: 1, speed: 1.2, iv: 1.2 },
  bandit: { name: '獸人戰士', sprite: ['tc', 11], hp: 1.1, atk: 1.2, speed: 1, iv: 1.2 },
  spider: { name: '毒蛛', sprite: 122, hp: 0.9, atk: 1.25, speed: 1.4, iv: 1.1, trait: '速度快' },
  shaman: { name: '邪教巫師', sprite: ['tc', 65], ai: 'heal', hp: 0.85, atk: 1.6, speed: 0.9, iv: 1.6, trait: '攻擊高；會治療隊友' },
  ghost: { name: '幽魂', sprite: 121, hp: 0.8, atk: 1.1, speed: 1.1, iv: 1.3, dodge: 0.25, trait: '25% 閃避' },
  skull: { name: '骷髏兵', sprite: ['tc', 1], hp: 1.2, atk: 1, speed: 0.9, iv: 1.3, armor: 0.3, trait: '減傷 30%' },
  lavacrab: { name: '熔岩蟹', sprite: 110, hp: 1.5, atk: 1.3, speed: 0.8, iv: 1.5, armor: 0.15, trait: '減傷 15%' },
  skyknight: { name: '天使衛兵', sprite: ['tc', 35], ai: 'shield', hp: 1.4, atk: 1.2, speed: 1, iv: 1.3, armor: 0.2, trait: '減傷 20%；開場有護盾（多段攻擊打盾比較快）' },
  mimic: { name: '寶箱怪', sprite: 92, hp: 1, atk: 1, speed: 1, iv: 1.4 },
  // 3.1 新怪物（Tiny Creatures）
  goblin: { name: '哥布林', sprite: ['tc', 10], ai: 'thief', hp: 0.9, atk: 1.1, speed: 1.4, iv: 1.1, trait: '速度快；不打人，會偷球幣' },
  boar: { name: '野豬', sprite: ['tc', 160], ai: 'charge', hp: 1.3, atk: 1.2, speed: 1.5, iv: 1.4, trait: '衝很快；第一下衝撞特別痛' },
  shroom: { name: '毒菇', sprite: ['tc', 13], ai: 'split', hp: 1.4, atk: 0.8, speed: 0.7, iv: 1.5, trait: '皮厚；死掉會分裂成 2 隻' },
  scorpion: { name: '沙蠍', sprite: ['tc', 145], ai: 'charge', hp: 1.1, atk: 1.3, speed: 1.1, iv: 1.2, armor: 0.1, trait: '減傷 10%；第一下衝撞特別痛' },
  snake: { name: '響尾蛇', sprite: ['tc', 41], hp: 0.8, atk: 1.3, speed: 1.4, iv: 1.0, trait: '速度快' },
  whirl: { name: '沙塵捲', sprite: ['tc', 48], ai: 'throw', hp: 0.9, atk: 1.0, speed: 1.6, iv: 1.1, dodge: 0.15, trait: '15% 閃避；丟石頭卡住倍率門' },
  zombie: { name: '殭屍', sprite: ['tc', 0], hp: 1.5, atk: 1.0, speed: 0.6, iv: 1.5, trait: '皮厚' },
  wraith: { name: '怨靈', sprite: ['tc', 4], ai: 'summon', hp: 0.8, atk: 1.3, speed: 1.1, iv: 1.3, dodge: 0.2, trait: '20% 閃避；會召喚骷髏' },
  vampire: { name: '吸血鬼', sprite: ['tc', 2], ai: 'heal', hp: 1.1, atk: 1.4, speed: 1.1, iv: 1.2, trait: '會治療隊友' },
  fireling: { name: '火精靈', sprite: ['tc', 45], ai: 'ranged', hp: 0.9, atk: 1.5, speed: 1.2, iv: 1.3, trait: '攻擊高；遠程：站後排也會攻擊' },
  imp: { name: '小惡魔', sprite: ['tc', 38], ai: 'bomb', hp: 0.8, atk: 1.2, speed: 1.6, iv: 1.0, trait: '速度快；死掉會爆炸（被暴擊殺死就炸到敵人）' },
  golem: { name: '岩石魔像', sprite: ['tc', 47], ai: 'shield', hp: 1.8, atk: 1.1, speed: 0.6, iv: 1.7, armor: 0.25, trait: '減傷 25%；開場有護盾（多段攻擊打盾比較快）' },
  eagle: { name: '戰鷹', sprite: ['tc', 134], ai: 'fly', hp: 0.8, atk: 1.2, speed: 1.8, iv: 1.0, trait: '飛很快；飛行：近戰不容易打到' },
  griffin: { name: '獅鷲', sprite: ['tc', 115], ai: 'fly', hp: 1.3, atk: 1.3, speed: 1.3, iv: 1.3, trait: '飛行：近戰不容易打到' },
  frost: { name: '冰晶靈', sprite: ['tc', 49], ai: 'ranged', hp: 1.1, atk: 1.1, speed: 1.0, iv: 1.3, armor: 0.15, trait: '減傷 15%；遠程：站後排也會攻擊' },
  // 魔王（每章一隻）
  cyclops: { name: '牛頭魔王', sprite: ['tc', 20], hp: 1, atk: 1, speed: 0.7, iv: 1.6, boss: true },
  crabking: { name: '沙暴蠍王', sprite: ['tc', 145], hp: 1.1, atk: 0.95, speed: 0.7, iv: 1.5, armor: 0.15, boss: true },
  deathknight: { name: '亡靈騎士', sprite: ['tc', 107], hp: 1, atk: 1.15, speed: 0.8, iv: 1.4, dodge: 0.1, boss: true },
  firegiant: { name: '炎之巨人', sprite: ['tc', 123], hp: 1.2, atk: 1.1, speed: 0.7, iv: 1.6, boss: true },
  guardian: { name: '天空守護者', sprite: ['tc', 37], hp: 1.1, atk: 1.1, speed: 0.8, iv: 1.3, armor: 0.2, boss: true },
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
  { id: 'hits3', icon: ['ic', 1021, '#7fd1ff'], star: 3, max: 2, name: '狂風連斬', desc: '攻擊次數 +3（第 2 級起每級 +1）', apply: (h, run, board, lv) => { h.hits += lv > 1 ? 1 : 3; },
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
  { id: 'block', cat: 'melee', icon: ['ic', 233, '#9fe3ff'], star: 2, max: 2, name: '鐵壁', desc: '+30% 機率擋下敵人攻擊', apply: h => { h.block = Math.min(0.75, h.block + 0.3); },
    maxDesc: '格擋時反擊，造成 200% 攻擊力傷害', maxApply: h => { h.counter = 2; } },
  { id: 'dbl', icon: ['ic', 569, '#ffd84a'], star: 1, max: 3, name: '雙重打擊', desc: '+30% 機率連續攻擊兩輪', apply: h => { h.dbl += 0.3; },
    maxDesc: '連擊機率再 +50%', maxApply: h => { h.dbl += 0.5; } },
  { id: 'life', icon: ['ic', 531], star: 2, max: 3, name: '吸血', desc: '造成傷害的 8% 變成回血', apply: h => { h.life += 0.08; },
    maxDesc: '吸血再 +10%', maxApply: h => { h.life += 0.1; } },
  { id: 'hp', icon: ['ic', 532], star: 1, max: 5, name: '強壯體魄', desc: '最大血量 +30% 並補滿', apply: h => { h.maxHp *= 1.3; h.hp = h.maxHp; },
    maxDesc: '每一波開始時血量全滿', maxApply: h => { h.fullHealWave = true; } },
  { id: 'heal', icon: ['ic', 669], star: 1, name: '治療藥水', desc: '立刻回復 60% 血量', apply: h => { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.6); } },
  { id: 'splash', icon: ['ic', 616, '#36d6ff'], star: 2, max: 3, name: '震地波', desc: '每次攻擊濺射 25% 傷害給所有敵人', apply: h => { h.splash += 0.25; },
    maxDesc: '濺射再 +50%', maxApply: h => { h.splash += 0.5; } },
  { id: 'thorn', cat: 'melee', icon: ['ic', 184], star: 1, max: 3, name: '荊棘甲', desc: '被打時反彈 60% 傷害', apply: h => { h.thorns += 0.6; },
    maxDesc: '反彈再 +150%', maxApply: h => { h.thorns += 1.5; } },
  { id: 'ball', icon: ['ic', 237], star: 2, max: 5, name: '寶藏獵人', desc: '每殺一隻敵人多掉 2 顆球', apply: h => { h.ballsPerKill += 2; },
    maxDesc: '每殺一隻再多掉 5 顆球', maxApply: h => { h.ballsPerKill += 5; } },
  { id: 'gate', icon: ['ic', 1018, '#36d6ff'], star: 3, max: 2, name: '倍率工匠', desc: '彈珠台多一道 x2 門（第 4、7 級再加一道，其他等級 x2 門變寬）', apply: (h, run, board, lv) => { gateLv(board, 'x2', lv); },
    maxDesc: '所有 x2 門變寬 30%', maxApply: (h, run, board) => { board.widenGates('x2', 1.3); } },
  { id: 'gate3', icon: ['ic', 1016, '#6dff8a'], star: 2, max: 2, name: '分裂門', desc: '彈珠台多一道 +3 門（第 4 級再加一道，其他等級 +3 門變寬）', apply: (h, run, board, lv) => { gateLv(board, '+3', lv); },
    maxDesc: '所有 +3 門升級成 +5 門', maxApply: (h, run, board) => { board.upgradeGates('+3', '+5'); } },
  { id: 'gatex3', icon: ['ic', 1018, '#ffd84a'], star: 3, max: 2, gold: true, name: '黃金倍率', desc: '彈珠台多一道金色 x3 門（第 4、7 級再加一道，其他等級 x3 門變寬）', apply: (h, run, board, lv) => { gateLv(board, 'x3', lv); },
    maxDesc: '金色 x3 門變寬 40%、移動變慢', maxApply: (h, run, board) => { board.widenGates('x3', 1.4, 0.5); } },
  { id: 'cup', icon: ['ic', 192], star: 1, max: 3, name: '大肚杯', desc: '接球杯變寬 25%', apply: (h, run, board) => { board.cupW = Math.min(220, board.cupW * 1.25); },
    maxDesc: '接住的球從 x2 變成 x3', maxApply: (h, run, board) => { board.cupMult = 3; } },


  // ---------- 近戰技能（劍士、狂戰士等近戰職業才會出現）----------
  { id: 'c_cleave', cat: 'melee', icon: ['ic', 426, '#ff8a6b'], star: 1, max: 3, name: '橫掃', desc: '攻擊同時砍到第 2 隻敵人（50% 傷害）', apply: h => { h.cleave += 0.5; },
    maxDesc: '橫掃改成砍到所有敵人', maxApply: h => { h.cleaveAll = true; } },
  { id: 'c_bash', cat: 'melee', icon: ['ic', 385, '#ffd84a'], star: 2, max: 3, name: '重擊', desc: '+10% 機率擊暈敵人 1 秒', apply: h => { h.stun += 0.1; },
    maxDesc: '被擊暈的敵人受到傷害 +50%', maxApply: h => { h.stunAmp = 0.5; } },
  { id: 'c_iron', cat: 'melee', icon: ['ic', 233, '#c0c8d8'], star: 1, max: 3, name: '鋼鐵意志', desc: '受到的傷害 -10%', apply: h => { h.dr = Math.min(0.6, h.dr + 0.1); },
    maxDesc: '受到的傷害再 -15%', maxApply: h => { h.dr = Math.min(0.7, h.dr + 0.15); } },
  { id: 'c_charge', cat: 'melee', icon: ['ic', 1058, '#ff8a6b'], star: 2, max: 2, name: '開場衝鋒', desc: '每波第一下攻擊傷害 +300%', apply: h => { h.opener += 3; },
    maxDesc: '衝鋒時擊暈所有敵人 1.5 秒', maxApply: h => { h.openerStun = true; } },
  // ---------- 遠程技能 ----------
  { id: 'r_snipe', cat: 'ranged', icon: ['ic', 712, '#b6ff6d'], star: 2, max: 3, name: '狙擊', desc: '每次攻擊額外射向最後面的敵人（80% 傷害）', apply: h => { h.snipe += 0.8; },
    maxDesc: '狙擊必定暴擊', maxApply: h => { h.snipeCrit = true; } },
  { id: 'r_poison', cat: 'ranged', icon: ['ic', 289, '#7dff5a'], star: 1, max: 3, name: '毒箭', desc: '中毒：3 秒內每秒受到 20% 攻擊力傷害', apply: h => { h.dot += 0.2; h.dotColor = '#7dff5a'; },
    maxDesc: '毒傷加倍', maxApply: h => { h.dot *= 2; } },
  { id: 'r_quick', cat: 'ranged', icon: ['ic', 1058, '#b6ff6d'], star: 1, max: 3, name: '連弩', desc: '攻擊速度 +25%', apply: h => { h.spdMul += 0.25; },
    maxDesc: '每第 4 下攻擊必定暴擊', maxApply: h => { h.critEvery = 4; } },
  { id: 'r_kite', cat: 'ranged', icon: ['ic', 1021, '#b6ff6d'], star: 2, max: 2, name: '拉開距離', desc: '敵人走路速度 -20%', apply: h => { h.slowWalk = Math.min(0.6, h.slowWalk + 0.2); },
    maxDesc: '敵人攻擊速度也 -20%', maxApply: h => { h.slowAtk = 0.2; } },
  { id: 'r_roll', cat: 'ranged', icon: ['ic', 1058, '#9fe3ff'], star: 1, max: 3, name: '閃身步', desc: '閃避 +8%、受到的傷害 -6%', apply: h => { h.dodge = Math.min(0.6, h.dodge + 0.08); h.dr = Math.min(0.6, h.dr + 0.06); },
    maxDesc: '閃避後回復 3% 血量', maxApply: h => { h.dodgeHeal = (h.dodgeHeal || 0) + 0.03; } },
  // ---------- 法術技能 ----------
  { id: 's_chain', cat: 'spell', icon: ['ic', 616, '#9fe3ff'], star: 2, max: 3, name: '連鎖閃電', desc: '每 3 次攻擊放出閃電，連跳 3 隻敵人（+120% 傷害）', apply: h => { h.chainEvery = 3; h.chainMul += 1.2; },
    maxDesc: '每 2 次攻擊就放，連跳 6 隻', maxApply: h => { h.chainEvery = 2; h.chainJumps = 6; } },
  { id: 's_burn', cat: 'spell', icon: ['ic', 616, '#ff9f43'], star: 1, max: 3, name: '灼燒', desc: '點燃：3 秒內每秒受到 25% 攻擊力傷害', apply: h => { h.dot += 0.25; h.dotColor = '#ff9f43'; },
    maxDesc: '燃燒時間變成 6 秒', maxApply: h => { h.dotTime = 6; } },
  { id: 's_shield', cat: 'spell', icon: ['ic', 233, '#d06bff'], star: 2, max: 3, name: '魔力護盾', desc: '每波開始獲得 15% 血量的護盾', apply: h => { h.shieldPct += 0.15; h.shield = h.maxHp * h.shieldPct; },
    maxDesc: '護盾破掉時對全體造成 300% 傷害', maxApply: h => { h.shieldBurst = 3; } },
  { id: 's_ward', cat: 'spell', icon: ['ic', 233, '#9fe3ff'], star: 1, max: 3, name: '法術結界', desc: '受到的傷害 -10%、每秒回復 0.5% 血量', apply: h => { h.dr = Math.min(0.6, h.dr + 0.1); h.regenPs += 0.005; },
    maxDesc: '每秒回血再 +1%', maxApply: h => { h.regenPs += 0.01; } },
  { id: 's_nova', cat: 'spell', icon: ['ic', 1023, '#d06bff'], star: 2, max: 2, name: '魔力爆發', desc: '擊殺敵人時爆炸，對全體造成 40% 傷害', apply: h => { h.killBlast += 0.4; },
    maxDesc: '爆炸傷害再 +80%', maxApply: h => { h.killBlast += 0.8; } },
  // ---------- 通用（新）----------
  { id: 'g_interest', icon: ['ic', 1057, '#ffd84a'], star: 2, max: 3, name: '利息', desc: '每波結束得到 8% 球幣利息（上限隨波數提高）', apply: h => { h.interest += 0.08; },
    maxDesc: '利息上限加倍', maxApply: h => { h.interestCap = 2; } },

  { id: 'g_swap', duo: true, icon: ['ic', 1021, '#7fffd4'], star: 2, max: 3, name: '換手專精', desc: '換手斬傷害 +100%，切換冷卻 -1 秒', apply: h => { h.switchMul += 1; h.switchCd = Math.max(2, h.switchCd - 1); },
    maxDesc: '換手時回復 15% 血量並擊暈所有敵人 1 秒', maxApply: h => { h.switchHeal = 0.15; h.switchStun = 1; } },

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
  { id: 'a_pierce', hero: 'archer', icon: ['ic', 289, '#ffd84a'], star: 2, max: 2, name: '穿透箭', desc: '箭會穿透，打到後面的敵人（30% 傷害）', apply: h => { h.pierce = Math.min(1.5, h.pierce + 0.3); },
    maxDesc: '穿透傷害變成 100%', maxApply: h => { h.pierce = 1; } },
  { id: 'a_rain', hero: 'archer', icon: ['ic', 237, '#b6ff6d'], star: 1, max: 3, name: '箭雨加速', desc: '球雨箭需要的接球數 -4', apply: h => { h.arrowNeed = Math.max(6, h.arrowNeed - 4); },
    maxDesc: '球雨箭一次射 3 支', maxApply: h => { h.arrowCount = 3; } },
  // 法師
  { id: 'm_meteor', hero: 'mage', icon: ['ic', 616, '#ff9f43'], star: 3, max: 2, name: '隕石術', desc: '每 4 次攻擊召喚隕石打全體（300% 傷害，之後每級 +100%）', apply: (h, run, board, lv) => { if (!h.meteorEvery) h.meteorEvery = 4; h.meteorMul += lv > 1 ? 1 : 3; },
    maxDesc: '每 3 次攻擊就召喚隕石', maxApply: h => { h.meteorEvery = 3; } },
  { id: 'm_grav', hero: 'mage', icon: ['ic', 1018, '#d06bff'], star: 1, max: 3, name: '重力強化', desc: '接球杯吸力的範圍與力度 +40%', apply: h => { h.magnet += 0.4; },
    maxDesc: '吸力再 +80%', maxApply: h => { h.magnet += 0.8; } },
  { id: 'm_frost', hero: 'mage', icon: ['ic', 669, '#9fe3ff'], star: 2, max: 2, name: '冰霜', desc: '被打到的敵人攻擊速度 -15%', apply: h => { h.frost = Math.min(0.8, h.frost + 0.15); },
    maxDesc: '冰霜效果加倍', maxApply: h => { h.frost = Math.min(0.8, h.frost * 2); } },
  // 狂戰士
  { id: 's_saw', hero: 'saw', icon: ['ic', 385, '#ff9f43'], star: 1, max: 3, name: '鏈鋸加速', desc: '鏈鋸需要的撞擊數 -3', apply: h => { h.sawNeed = Math.max(3, h.sawNeed - 3); },
    maxDesc: '鏈鋸傷害 +150%', maxApply: h => { h.sawMul += 1.5; } },
  { id: 's_rage', hero: 'saw', icon: ['ic', 531, '#ff5a5a'], star: 2, max: 2, name: '狂暴', desc: '血量低於 50% 時攻擊力 +60%', apply: h => { h.rage += 0.6; },
    maxDesc: '狂暴時攻擊速度 +50%', maxApply: h => { h.rageSpd = 0.5; } },
  { id: 's_feast', hero: 'saw', icon: ['ic', 532, '#ff5a5a'], star: 2, max: 3, name: '嗜血', desc: '每擊殺一隻敵人回復 6% 血量', apply: h => { h.killHeal += 0.06; },
    maxDesc: '擊殺時最大血量永久 +3%', maxApply: h => { h.killGrow = 0.03; } },
  // 聖騎士
  { id: 'p_holy', hero: 'paladin', icon: ['ic', 1023, '#fff2a8'], star: 2, max: 2, name: '聖光頻繁', desc: '聖光需要的攻擊次數 -1', apply: h => { h.holyEvery = Math.max(2, h.holyEvery - 1); },
    maxDesc: '聖光同時給 10% 血量的護盾', maxApply: h => { h.holyShield = 0.1; } },
  { id: 'p_aura', hero: 'paladin', icon: ['ic', 532, '#fff2a8'], star: 1, max: 3, name: '神聖光環', desc: '每秒回復 1% 血量', apply: h => { h.regenPs += 0.01; },
    maxDesc: '每秒再回復 2% 血量', maxApply: h => { h.regenPs += 0.02; } },
  { id: 'p_judge', hero: 'paladin', icon: ['ic', 426, '#fff2a8'], star: 2, max: 3, name: '審判', desc: '聖光傷害 +100%', apply: h => { h.holyMul += 1; },
    maxDesc: '聖光會擊暈所有敵人 1 秒', maxApply: h => { h.holyStun = true; } },
  // 刺客
  { id: 'k_shadow', hero: 'rogue', icon: ['ic', 1021, '#9a8cff'], star: 1, max: 3, name: '暗影步', desc: '閃避率 +10%', apply: h => { h.dodge = Math.min(0.6, h.dodge + 0.1); },
    maxDesc: '閃避後下一擊必定暴擊', maxApply: h => { h.dodgeCrit = true; } },
  { id: 'k_exec', hero: 'rogue', icon: ['ic', 576, '#9a8cff'], star: 2, max: 3, name: '處決', desc: '對血量 30% 以下的敵人傷害 +50%', apply: h => { h.exec += 0.5; },
    maxDesc: '處決門檻提高到 50% 血量', maxApply: h => { h.execAt = 0.5; } },
  { id: 'k_blade', hero: 'rogue', icon: ['ic', 289, '#9a8cff'], star: 2, max: 2, name: '毒刃', desc: '暴擊時讓敵人中毒（每秒 40% 攻擊力，3 秒）', apply: h => { h.critDot += 0.4; },
    maxDesc: '毒刃傷害加倍', maxApply: h => { h.critDot *= 2; } },
  // 火槍手
  { id: 'q_grenade', hero: 'gunner', icon: ['ic', 616, '#ffb347'], star: 2, max: 2, name: '快速裝填', desc: '榴彈需要的攻擊次數 -1', apply: h => { h.grenadeEvery = Math.max(2, h.grenadeEvery - 1); },
    maxDesc: '榴彈會擊暈所有敵人 1 秒', maxApply: h => { h.grenadeStun = true; } },
  { id: 'q_ap', hero: 'gunner', icon: ['ic', 289, '#ffb347'], star: 1, max: 3, name: '穿甲彈', desc: '攻擊力 +20%，無視敵人減傷', apply: h => { h.atkMul += 0.2; h.ignoreArmor = true; },
    maxDesc: '榴彈傷害 +150%', maxApply: h => { h.grenadeMul += 1.5; } },
  { id: 'q_spread', hero: 'gunner', icon: ['ic', 1018, '#ffb347'], star: 2, max: 3, name: '散彈', desc: '攻擊時也打到第 2、3 隻敵人（40% 傷害）', apply: h => { h.spread += 0.4; },
    maxDesc: '散彈傷害變成 100%', maxApply: h => { h.spread = 1; } },
  // 元素使
  { id: 'e_fire', hero: 'elem', icon: ['ic', 616, '#ff7a3d'], star: 1, max: 3, name: '烈焰', desc: '火元素的燃燒傷害 +30%', apply: h => { h.fireDot += 0.3; },
    maxDesc: '燃燒時間變成 6 秒', maxApply: h => { h.dotTime = 6; } },
  { id: 'e_ice', hero: 'elem', icon: ['ic', 669, '#9fe3ff'], star: 1, max: 3, name: '寒冰', desc: '冰元素減速 +15%', apply: h => { h.iceSlow = Math.min(0.8, h.iceSlow + 0.15); },
    maxDesc: '冰元素有 30% 機率凍住敵人 1.5 秒', maxApply: h => { h.iceFreeze = 0.3; } },
  { id: 'e_storm', hero: 'elem', icon: ['ic', 616, '#ffe066'], star: 2, max: 2, name: '雷暴', desc: '雷元素多跳 2 隻敵人', apply: h => { h.boltJumps += 2; },
    maxDesc: '雷元素傷害加倍', maxApply: h => { h.boltMul *= 2; } },
  // 龍騎士（隱藏）
  { id: 'd_breath', hero: 'dragoon', icon: ['ic', 616, '#ff5a3d'], star: 2, max: 2, name: '龍之怒', desc: '龍息需要的攻擊次數 -1', apply: h => { h.breathEvery = Math.max(2, h.breathEvery - 1); },
    maxDesc: '龍息連噴兩次', maxApply: h => { h.breathTwice = true; } },
  { id: 'd_scale', hero: 'dragoon', icon: ['ic', 233, '#ff5a3d'], star: 1, max: 3, name: '龍鱗', desc: '受到傷害 -10%', apply: h => { h.dr = Math.min(0.6, h.dr + 0.1); },
    maxDesc: '被打時反彈 150% 傷害', maxApply: h => { h.thorns += 1.5; } },
  { id: 'd_wing', hero: 'dragoon', icon: ['ic', 1058, '#ff5a3d'], star: 2, max: 3, name: '龍翼', desc: '攻擊速度 +20%', apply: h => { h.spdMul += 0.2; },
    maxDesc: '龍息傷害 +200%', maxApply: h => { h.breathMul += 2; } },
  // 星辰賢者（隱藏）
  { id: 't_star', hero: 'sage', icon: ['ic', 237, '#c8b6ff'], star: 1, max: 3, name: '星辰牽引', desc: '星落需要的接球數 -3', apply: h => { h.starNeed = Math.max(5, h.starNeed - 3); },
    maxDesc: '星落一次落下 3 顆', maxApply: h => { h.starCount = 3; } },
  { id: 't_nova', hero: 'sage', icon: ['ic', 1023, '#c8b6ff'], star: 2, max: 3, name: '超新星', desc: '星落傷害 +100%', apply: h => { h.starMul += 1; },
    maxDesc: '星落必定暴擊', maxApply: h => { h.starCrit = true; } },
  { id: 't_grav', hero: 'sage', icon: ['ic', 1018, '#c8b6ff'], star: 1, max: 2, name: '引力', desc: '接球杯吸力 +60%', apply: h => { h.magnet += 0.6; },
    maxDesc: '接球杯變寬 30%', maxApply: (h, run, board) => { board.cupW = Math.min(220, board.cupW * 1.3); } },
  // 盜賊王（隱藏）
  { id: 'z_steal', hero: 'thief', icon: ['ic', 1057, '#ffd84a'], star: 1, max: 3, name: '順手牽羊', desc: '每擊敗一隻多拿 4 球幣', apply: h => { h.stealCoins += 4; },
    maxDesc: '菁英、魔王被擊敗時拿 10 倍', maxApply: h => { h.stealBig = true; } },
  { id: 'z_lucky', hero: 'thief', icon: ['ic', 569, '#ffd84a'], star: 2, max: 2, name: '賊運亨通', desc: '菁英、寶箱怪掉技能機率 +20%', apply: h => { h.skillDropBonus += 0.2; },
    maxDesc: '寶箱怪每波都會出現', maxApply: h => { h.chestEvery = true; } },
  { id: 'z_gold', hero: 'thief', icon: ['pp', 67], star: 2, max: 2, name: '金庫', desc: '結算金幣再 +30%', apply: h => { h.goldBonus += 0.3; },
    maxDesc: '每波結束拿 10% 球幣利息', maxApply: h => { h.interest += 0.1; } },
  // ---------- 3.4 扭蛋英雄的專屬技能 ----------
  { id: 'hi_ice', hero: 'hilda', icon: ['ic', 712, '#9fe3ff'], star: 1, max: 1, name: '冰稜連射', desc: '凍結時間 +0.2 秒', apply: h => { h.freezeTime += 0.2; },
    maxDesc: '每次攻擊多射一支冰箭', maxApply: h => { h.multiShot += 1; } },
  { id: 'hi_shatter', hero: 'hilda', icon: ['ic', 616, '#9fe3ff'], star: 2, max: 1, name: '碎冰', desc: '凍住的敵人受到傷害再 +15%', apply: h => { h.frozenAmp += 0.15; },
    maxDesc: '寒冰箭改成每 2 箭一次', maxApply: h => { h.freezeEvery = Math.min(h.freezeEvery, 2); } },
  { id: 'gr_gear', hero: 'gren', icon: ['ic', 233, '#c0c8d8'], star: 1, max: 1, name: '齒輪盾', desc: '盾擊傷害 +60%', apply: h => { h.bashMul += 0.6; },
    maxDesc: '每波開始獲得 15% 血量護盾', maxApply: h => { h.shieldPct += 0.15; } },
  { id: 'gr_hold', hero: 'gren', icon: ['ic', 233, '#ffd84a'], star: 2, max: 1, name: '堅守陣地', desc: '格擋 +5%', apply: h => { h.block = Math.min(0.8, h.block + 0.05); },
    maxDesc: '格擋時反擊 150%', maxApply: h => { h.counter = Math.max(h.counter, 1.5); } },
  { id: 'fi_ember', hero: 'fio', icon: ['ic', 616, '#ff7a3b'], star: 1, max: 1, name: '餘燼', desc: '燃燒傷害 +12%', apply: h => { h.dot += 0.12; },
    maxDesc: '燃燒時間變成 6 秒', maxApply: h => { h.dotTime = 6; } },
  { id: 'fi_rain', hero: 'fio', icon: ['ic', 1023, '#ff7a3b'], star: 2, max: 1, name: '火雨', desc: '火雨傷害 +40%', apply: h => { h.meteorMul += 0.4; },
    maxDesc: '火雨改成每 3 次攻擊', maxApply: h => { h.meteorEvery = 3; } },
  { id: 'vi_venom', hero: 'vicky', icon: ['ic', 289, '#7dff5a'], star: 1, max: 1, name: '浸毒箭', desc: '中毒傷害 +12%', apply: h => { h.dot += 0.12; },
    maxDesc: '毒傷加倍', maxApply: h => { h.dot *= 2; } },
  { id: 'vi_snake', hero: 'vicky', icon: ['ic', 289, '#b6ff6d'], star: 2, max: 1, name: '蛇群', desc: '每 6 次攻擊放出毒蛇，連跳 3 隻敵人（+50% 傷害）', apply: h => { h.chainEvery = h.chainEvery || 6; h.chainMul += 0.5; },
    maxDesc: '毒蛇跳 6 隻', maxApply: h => { h.chainJumps = Math.max(h.chainJumps, 6); } },
  { id: 'lo_rend', hero: 'lok', icon: ['ic', 426, '#ff5a5a'], star: 1, max: 1, name: '撕裂', desc: '攻擊讓敵人流血（每秒 12%）', apply: h => { h.dot += 0.12; h.dotColor = '#ff5a5a'; },
    maxDesc: '攻擊同時砍到第 2 隻（50%）', maxApply: h => { h.cleave = Math.max(h.cleave, 0.5); } },
  { id: 'lo_howl', hero: 'lok', icon: ['ic', 374, '#b8c4dc'], star: 2, max: 1, name: '嚎月', desc: '吸血 +3%、狼形攻擊力 +10%', apply: h => { h.life += 0.03; h.rage += 0.1; },
    maxDesc: '擊殺回復 4% 血量', maxApply: h => { h.killHeal += 0.04; } },
  { id: 'ma_pure', hero: 'mary', icon: ['ic', 233, '#fff2a8'], star: 1, max: 1, name: '淨化之泉', desc: '聖光讓敵人變慢 10%', apply: h => { h.frost = Math.min(0.6, h.frost + 0.1); },
    maxDesc: '聖光擊暈 0.5 秒', maxApply: h => { h.holyStun = true; } },
  { id: 'ma_bless', hero: 'mary', icon: ['ic', 576, '#fff2a8'], star: 2, max: 1, name: '祝福', desc: '攻擊力 +8%、每秒回血 +0.3%', apply: h => { h.atkMul += 0.08; h.regenPs += 0.003; },
    maxDesc: '聖光傷害 +100%', maxApply: h => { h.holyMul += 1; } },
  { id: 'th_static', hero: 'thorfin', icon: ['ic', 616, '#ffe066'], star: 1, max: 1, name: '靜電鎧', desc: '被打時反彈 40% 傷害', apply: h => { h.thorns += 0.4; },
    maxDesc: '擊暈機率 +15%', maxApply: h => { h.stun += 0.15; } },
  { id: 'th_bolt', hero: 'thorfin', icon: ['ic', 616, '#ffd84a'], star: 2, max: 1, name: '雷霆一擊', desc: '落雷傷害 +50%', apply: h => { h.chainMul += 0.5; },
    maxDesc: '落雷改成每 3 擊', maxApply: h => { h.chainEvery = Math.min(h.chainEvery, 3); } },
  { id: 'pi_coin', hero: 'pip', icon: ['ic', 1057, '#ffd84a'], star: 1, max: 1, name: '齒輪商人', desc: '砲台擊殺再 +1 球幣', apply: h => { h.turretCoins += 1; },
    maxDesc: '每擊敗一隻 +2 球幣', maxApply: h => { h.stealCoins += 2; } },
  { id: 'pi_turret', hero: 'pip', icon: ['ic', 1018, '#ffd84a'], star: 2, max: 1, name: '砲台升級', desc: '砲台傷害 +20%', apply: h => { h.turretMul += 0.2; },
    maxDesc: '砲台 +1 座', maxApply: h => { h.turrets += 1; } },
  { id: 'es_storm', hero: 'esti', icon: ['ic', 1023, '#9fe3ff'], star: 2, max: 1, name: '冰風暴', desc: '每 5 次攻擊落下冰風暴打全體（+70% 傷害）', apply: h => { h.meteorEvery = h.meteorEvery || 5; h.meteorMul += 0.7; },
    maxDesc: '凍結時間 +0.6 秒', maxApply: h => { h.freezeTime += 0.6; } },
  { id: 'es_heart', hero: 'esti', icon: ['ic', 233, '#9fe3ff'], star: 1, max: 1, name: '寒霜之心', desc: '濺射 +10%、受到的傷害 -5%', apply: h => { h.splash += 0.1; h.dr = Math.min(0.6, h.dr + 0.05); },
    maxDesc: '凍住的敵人受到傷害再 +40%', maxApply: h => { h.frozenAmp += 0.4; } },
  { id: 'ka_feast', hero: 'kalan', icon: ['ic', 616, '#ff4d6d'], star: 1, max: 1, name: '血之饗宴', desc: '吸血 +3%', apply: h => { h.life += 0.03; },
    maxDesc: '擊殺回 5% 血量', maxApply: h => { h.killHeal += 0.05; } },
  { id: 'ka_blood', hero: 'kalan', icon: ['ic', 616, '#ff5a3d'], star: 2, max: 1, name: '龍血沸騰', desc: '龍息傷害 +40%', apply: h => { h.breathMul += 0.4; },
    maxDesc: '龍息改成每 3 擊', maxApply: h => { h.breathEvery = Math.min(h.breathEvery, 3); } },
  { id: 'si_eye', hero: 'sian', icon: ['ic', 616, '#9fe3ff'], star: 2, max: 1, name: '風暴之眼', desc: '閃電傷害 +30%', apply: h => { h.chainMul += 0.3; },
    maxDesc: '閃電改成每次攻擊都放', maxApply: h => { h.chainEvery = 1; } },
  { id: 'si_wind', hero: 'sian', icon: ['ic', 1058, '#9fe3ff'], star: 1, max: 1, name: '疾風', desc: '攻擊速度 +15%', apply: h => { h.spdMul += 0.15; },
    maxDesc: '閃電擊暈 0.3 秒（10% 機率）', maxApply: h => { h.stun += 0.1; } },
  { id: 'ru_clone', hero: 'ruri', icon: ['ic', 1058, '#b9a8ff'], star: 2, max: 1, name: '影分身', desc: '連擊機率 +10%', apply: h => { h.dbl += 0.1; },
    maxDesc: '閃避 +10%', maxApply: h => { h.dodge += 0.1; } },
  { id: 'ru_blade', hero: 'ruri', icon: ['ic', 426, '#b9a8ff'], star: 1, max: 1, name: '舞刃', desc: '橫掃傷害 +20%', apply: h => { h.cleave += 0.2; },
    maxDesc: '暴擊傷害 +60%', maxApply: h => { h.critDmg += 0.6; } },
  { id: 'g7_armor', hero: 'g7', icon: ['ic', 233, '#c0c8d8'], star: 1, max: 1, name: '裝甲板', desc: '受到的傷害 -6%', apply: h => { h.dr = Math.min(0.6, h.dr + 0.06); },
    maxDesc: '被打時反彈 80% 傷害', maxApply: h => { h.thorns += 0.8; } },
  { id: 'g7_boiler', hero: 'g7', icon: ['ic', 616, '#ff7a3b'], star: 2, max: 1, name: '強化鍋爐', desc: '過熱噴火傷害 +15%', apply: h => { h.burstMul += 0.15; },
    maxDesc: '過熱需要的攻擊次數 -3', maxApply: h => { h.burstEvery = Math.max(4, h.burstEvery - 3); } },
  { id: 'ba_frog', hero: 'balu', icon: ['ic', 289, '#7dff5a'], star: 1, max: 1, name: '毒蛙', desc: '攻擊讓敵人中毒（每秒 12%）', apply: h => { h.dot += 0.12; h.dotColor = '#7dff5a'; },
    maxDesc: '夥伴傷害 +30%', maxApply: h => { h.turretMul += 0.3; } },
  { id: 'ba_pack', hero: 'balu', icon: ['ic', 374, '#b8c4dc'], star: 2, max: 1, name: '群狼', desc: '夥伴傷害 +15%', apply: h => { h.turretMul += 0.15; },
    maxDesc: '多一隻戰狼', maxApply: h => { h.turrets += 1; } },
  { id: 'cy_bolt', hero: 'cyrus', icon: ['ic', 712, '#fff2a8'], star: 2, max: 1, name: '連發機弩', desc: '攻擊速度 +8%', apply: h => { h.spdMul += 0.08; },
    maxDesc: '每第 3 下攻擊必定暴擊', maxApply: h => { h.critEvery = h.critEvery ? Math.min(h.critEvery, 3) : 3; } },
  { id: 'cy_sin', hero: 'cyrus', icon: ['ic', 576, '#fff2a8'], star: 1, max: 1, name: '罪罰', desc: '印記增傷 +12%', apply: h => { h.markAmp += 0.12; },
    maxDesc: '聖光爆炸傷害 +100%', maxApply: h => { h.markBlast += 1; } },
  { id: 'mo_rot', hero: 'moore', icon: ['ic', 289, '#7dff5a'], star: 2, max: 1, name: '腐蝕藥劑', desc: '毒傷 +10%，無視敵人減傷', apply: h => { h.dot += 0.1; h.ignoreArmor = true; },
    maxDesc: '中毒的敵人攻擊速度 -20%', maxApply: h => { h.slowAtk = Math.max(h.slowAtk, 0.2); } },
  { id: 'mo_spread', hero: 'moore', icon: ['ic', 1023, '#7dff5a'], star: 1, max: 1, name: '瘟疫蔓延', desc: '濺射 +10%', apply: h => { h.splash += 0.1; },
    maxDesc: '擊殺時毒雲爆炸（50%）', maxApply: h => { h.killBlast += 0.5; } },
  { id: 'mg_map', hero: 'morgan', icon: ['ic', 1057, '#ffd84a'], star: 1, max: 1, name: '寶藏地圖', desc: '每波結束拿 6% 球幣利息', apply: h => { h.interest += 0.06; },
    maxDesc: '球幣加攻上限 +20%', maxApply: h => { h.coinCap += 0.2; } },
  { id: 'mg_powder', hero: 'morgan', icon: ['ic', 616, '#ffb347'], star: 2, max: 1, name: '火藥桶', desc: '加農砲傷害 +40%', apply: h => { h.grenadeMul += 0.4; },
    maxDesc: '加農砲改成每 2 擊', maxApply: h => { h.grenadeEvery = 2; } },
];

// 技能分類：通用（大家都有）、近戰、遠程、法術（看英雄的職業類型）
export const CATS = {
  any: { name: '通用', color: '#b9b2c9' },
  melee: { name: '近戰', color: '#ff8a6b' },
  ranged: { name: '遠程', color: '#8fe36b' },
  spell: { name: '法術', color: '#c38bff' },
};
export const skillCat = sk => sk.hero ? null : (sk.cat || 'any');
// 這個技能能不能出現：專屬技能看英雄，分類技能看職業類型（雙職業時兩邊都算）
export const heroCls = def => [].concat(def.cls);
export function skillAllowed(sk, run) {
  const ids = run.heroIds || [run.hero.def.id];
  const cls = run.heroCls || heroCls(run.hero.def);
  if (sk.hero) return ids.includes(sk.hero);
  if (sk.duo) return ids.length > 1; // 換手技能：帶兩位職業才會出現
  return !sk.cat || cls.includes(sk.cat);
}

// 等級上限看星數：1 星 3 級、2 星 5 級、3 星 9 級（治療藥水沒有上限，可以一直買）
export const STAR_MAX = [0, 3, 5, 9];
for (const sk of SKILLS) if (sk.max) sk.max = STAR_MAX[sk.star];
// 加倍率門的技能：第 1、4、7 級多一道門，其他等級讓同種門變寬（不然門會塞滿彈珠台）
function gateLv(board, type, lv) {
  if (lv % 3 === 1) board.addGate(type);
  else board.widenGates(type, 1.08);
}

export const STAR_PRICE = [0, 20, 45, 80];
export const STAR_WEIGHT = [0, 60, 30, 10];

export const MAX_WAVE = 15;
// 無盡塔：每 10 層一個循環（第 10、20、30… 層是魔王），打完魔王進入下一章
export const ENDLESS_CYCLE = 10;
export const isBossWave = (run, w) => run.endless ? w % ENDLESS_CYCLE === 0 : w === MAX_WAVE;
// 這一層在目前循環裡是第幾波（用來決定怪物數量與強度）
export const stageWave = (run, w) => run.endless ? ((w - 1) % ENDLESS_CYCLE) + 1 : w;
