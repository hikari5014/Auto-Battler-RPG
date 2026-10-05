// 奇遇事件：第 3、6、9、12 波打完後出現，三選一（也可以跳過）
// 每個事件：cond = 什麼時候可以出現；apply = 選了之後發生什麼，回傳結果說明
import { SKILLS, skillAllowed } from './data.js';

export const EVENT_WAVES = [3, 6, 9, 12];

// tag：卡片上的小標籤（風險／穩定／增益）
export const EVENTS = [
  {
    id: 'gamble', icon: ['ic', 731, '#ffd84a'], title: '命運賭桌', tag: '風險',
    desc: '押上一半球幣：50% 翻倍、50% 輸掉',
    cond: r => r.coins >= 20,
    apply: ({ run }) => {
      const bet = Math.floor(run.coins / 2);
      if (Math.random() < 0.5) { run.coins += bet; return { good: true, text: `贏了！球幣 +${bet}` }; }
      run.coins -= bet;
      return { good: false, text: `輸了…球幣 -${bet}` };
    },
  },
  {
    id: 'altar', icon: ['ic', 531], title: '鮮血祭壇', tag: '風險',
    desc: '失去 30% 目前血量，換一個 3 星技能',
    cond: r => r.hero.hp > r.hero.maxHp * 0.4,
    apply: ({ run, randomSkill, gainSkill }) => {
      run.hero.hp *= 0.7;
      const sk = randomSkill(s => s.star === 3) || randomSkill(s => s.star === 2);
      if (!sk) return { good: false, text: '祭壇沒有回應…' };
      gainSkill(sk);
      return { good: true, text: `獲得 3 星技能「${sk.name}」` };
    },
  },
  {
    id: 'spring', icon: ['ic', 580], title: '治癒泉水', tag: '穩定',
    desc: '血量回滿，最大血量 +10%',
    cond: () => true,
    apply: ({ run }) => {
      for (const h of run.heroes) { h.maxHp *= 1.1; h.hp = h.maxHp; } // 雙職業時兩位都有
      return { good: true, text: '血量全滿，最大血量 +10%' };
    },
  },
  {
    id: 'chest', icon: ['pp', 28], title: '神秘寶箱', tag: '穩定',
    desc: '免費獲得一個隨機技能',
    cond: () => true,
    apply: ({ randomSkill, gainSkill }) => {
      const sk = randomSkill(() => true);
      if (!sk) return { good: false, text: '寶箱是空的…' };
      gainSkill(sk);
      return { good: true, text: `獲得技能「${sk.name}」` };
    },
  },
  {
    id: 'merchant', icon: ['ic', 820, '#ffd84a'], title: '流浪商人', tag: '增益',
    desc: '這次商店的技能卡全部半價',
    cond: () => true,
    apply: ({ run }) => { run.shopDiscount = 0.5; return { good: true, text: '商店技能卡半價！' }; },
  },
  {
    id: 'blessing', icon: ['ic', 237], title: '球之祝福', tag: '增益',
    desc: '接下來 3 波，每殺一隻多掉 4 顆球',
    cond: () => true,
    apply: ({ run }) => { run.ballBuff = { waves: 3, n: 4 }; return { good: true, text: '3 波內掉球增加！' }; },
  },
  {
    id: 'forge', icon: ['ic', 1018, '#d06bff'], title: '倍率鍛造', tag: '增益',
    desc: '彈珠台永久多一道隨機倍率門',
    cond: (r, board) => board.gates.length < 10,
    apply: ({ board }) => {
      const type = ['x2', 'x2', '+3', '+4', 'x3'][Math.floor(Math.random() * 5)];
      board.addGate(type);
      return { good: true, text: `新增一道 ${type} 倍率門` };
    },
  },
  {
    id: 'pact', icon: ['ic', 621, '#ff5a5a'], title: '惡魔契約', tag: '風險',
    desc: '球幣立刻 x2，但下一波敵人血量 +50%',
    cond: r => r.coins >= 10,
    apply: ({ run }) => {
      const gain = Math.floor(run.coins);
      run.coins += gain;
      run.nextHpMul = 1.5;
      return { good: true, text: `球幣 +${gain}，下一波敵人變強了…` };
    },
  },
  {
    id: 'training', icon: ['ic', 426, '#ffd84a'], title: '訓練場', tag: '穩定',
    desc: '攻擊力 +15%、攻擊速度 +10%',
    cond: () => true,
    apply: ({ run }) => { for (const h of run.heroes) { h.atkMul += 0.15; h.spdMul += 0.1; } return { good: true, text: '攻擊力 +15%、攻速 +10%' }; },
  },
];

// 抽出 3 個這次可以出現的事件
export function rollEvents(run, board) {
  const pool = EVENTS.filter(e => e.cond(run, board));
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// 從還沒滿級、這位英雄能用的技能裡隨機挑一個（filter 可再加條件）
export function makeRandomSkill(run, isMaxed) {
  return filter => {
    const pool = SKILLS.filter(sk => !isMaxed(sk) && skillAllowed(sk, run) && filter(sk));
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  };
}
