// 角色完整數值：首頁（含天賦、裝備、坐騎）與戰鬥中（再加上技能）共用
import { heroAtk } from './battle.js';
import { fmt } from './board.js';

const pct = v => Math.round(v * 1000) / 10 + '%';
const num = v => (v >= 100 ? fmt(v) : (Math.round(v * 10) / 10).toString());

// 估計每秒傷害：攻擊力 x 攻擊次數 x 連擊 x 暴擊期望值 x 攻速（不含範圍攻擊、被動）
export function dps(h) {
  const crit = Math.min(1, h.crit);
  return heroAtk(h) * h.hits * (1 + h.dbl) * (1 + crit * (h.critDmg - 1)) * h.spdMul / h.interval;
}

// 回傳一排一排的數值；main = 一定顯示，其他只有不是 0 才顯示
// base（可省略）= 沒有任何加成的英雄，用來顯示「比原本多了多少」
export function statRows(h, base) {
  const d = (v, b) => (base && v - b > 1e-6 ? v - b : 0);
  const rows = [
    { k: 'hp', name: '血量', v: `${fmt(Math.max(0, h.hp))} / ${fmt(h.maxHp)}`, up: base && d(h.maxHp, base.maxHp) ? '+' + fmt(h.maxHp - base.maxHp) : '', main: true },
    { k: 'atk', name: '攻擊力', v: num(heroAtk(h)), up: base && d(heroAtk(h), heroAtk(base)) ? '+' + num(heroAtk(h) - heroAtk(base)) : '', main: true },
    { k: 'dps', name: '每秒傷害（估）', v: num(dps(h)), up: base && d(dps(h), dps(base)) ? '+' + num(dps(h) - dps(base)) : '', main: true, hot: true },
    { k: 'spd', name: '每秒攻擊', v: (h.spdMul / h.interval).toFixed(2) + ' 下', up: base && d(h.spdMul, base.spdMul) ? '+' + pct(h.spdMul - base.spdMul) : '', main: true },
    { k: 'hits', name: '攻擊次數', v: 'x' + h.hits, up: base && d(h.hits, base.hits) ? '+' + (h.hits - base.hits) : '', main: true },
    { k: 'crit', name: '暴擊率', v: pct(Math.min(1, h.crit)), up: base && d(h.crit, base.crit) ? '+' + pct(h.crit - base.crit) : '', main: true },
    { k: 'critDmg', name: '暴擊傷害', v: pct(h.critDmg), up: base && d(h.critDmg, base.critDmg) ? '+' + pct(h.critDmg - base.critDmg) : '', main: true },
    { k: 'ball', name: '每殺掉球', v: num(h.ballsPerKill), up: base && d(h.ballsPerKill, base.ballsPerKill) ? '+' + num(h.ballsPerKill - base.ballsPerKill) : '', main: true },
    { k: 'dbl', name: '連擊機率', v: pct(h.dbl) },
    { k: 'splash', name: '濺射全體', v: pct(h.splash) },
    { k: 'block', name: '格擋率', v: pct(h.block) },
    { k: 'dodge', name: '閃避率', v: pct(h.dodge) },
    { k: 'dr', name: '減傷', v: pct(h.dr) },
    { k: 'life', name: '吸血', v: pct(h.life) },
    { k: 'thorns', name: '反傷', v: pct(h.thorns) },
    { k: 'shield', name: '護盾', v: fmt(h.shield) },
    { k: 'regen', name: '每波回血', v: pct(h.regen) },
    { k: 'regenPs', name: '每秒回血', v: pct(h.regenPs) },
    { k: 'stun', name: '擊暈機率', v: pct(h.stun) },
    { k: 'dot', name: '中毒／燃燒（每秒）', v: pct(h.dot) },
    { k: 'frost', name: '冰霜減速', v: pct(h.frost) },
    { k: 'cleave', name: '橫掃', v: pct(h.cleave) },
    { k: 'pierce', name: '穿透', v: pct(h.pierce) },
    { k: 'multiShot', name: '多重箭', v: '+' + h.multiShot },
    { k: 'snipe', name: '狙擊', v: pct(h.snipe) },
    { k: 'bossDmg', name: '對菁英／魔王傷害', v: '+' + pct(h.bossDmg) },
    { k: 'killBlast', name: '擊殺爆炸', v: pct(h.killBlast) },
    { k: 'switchMul', name: '換手斬', v: pct(h.switchMul) },
  ];
  return rows.filter(r => r.main || (r.k === 'regen' ? true : h[r.k] > 1e-6 && !(r.k === 'switchMul' && !h.duo)));
}

export function statsHtml(h, base) {
  return `<div class="stat-grid">${statRows(h, base).map(r => `
    <span class="st ${r.main ? 'main' : ''} ${r.hot ? 'hot' : ''}" data-st="${r.k}"><small>${r.name}</small><b>${r.v}</b>${r.up ? `<em>${r.up}</em>` : ''}</span>`).join('')}</div>`;
}

// 只換數字（面板開著時每隔一下更新，不整個重畫）
export function refreshStats(root, h, base) {
  const rows = statRows(h, base);
  const shown = root.querySelectorAll('.st');
  if (shown.length !== rows.length) { root.innerHTML = statsHtml(h, base); return; }
  rows.forEach((r, i) => {
    const el = shown[i];
    const b = el.querySelector('b');
    if (b.textContent !== r.v) {
      b.textContent = r.v;
      if (r.k !== 'hp') { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    }
    const em = el.querySelector('em');
    if (em) em.textContent = r.up;
  });
}
