import { HEROES, MONSTERS, SKILLS, CATS, skillCat, skillAllowed, heroCls, STAR_PRICE, STAR_WEIGHT, CHAPTERS, MAX_WAVE, ENDLESS_CYCLE, isBossWave, stageWave } from './data.js';
import { TALENTS, LINKS, talentById, ensureTalents, tLv, talentCost, whyNot, buyTalent, resetTalents, talentBonus, talentDesc, totalPoints, canReach } from './talent.js';
import { shareResult } from './share.js';
import { statsHtml, refreshStats, dps } from './stats.js';
import { MOUNTS, FEEDS, MAX_STAR, mountById, ensureMounts, mountState, expNeed, lvCap, breakCost, atCap, buyMount, feed, breakthrough, rideExp, riding, statText } from './mount.js';
import { loadSave, writeSave } from './save.js';
import { initAudio, setMuted, sfx, playMusic } from './audio.js';
import { Board, fmt } from './board.js';
import { Battle, createHero, BENCH_POS, heroAtk as heroAtkOf } from './battle.js';
import { loadSprites, iconTag, ICON, drawIcon } from './sprites.js';
import { VERSION, CHANGELOG, compareVersion } from './version.js';
import { DIFFICULTIES, difficultyOf, boardOf } from './levels.js';
import { fetchLatest, applyUpdate } from './update.js';
import { initFeedback, isOff, celebrate, pop, vibrate } from './feedback.js';
import { settings, loadSettings, applySettings, settingsHtml } from './settings.js';
import { Tutorial } from './tutorial.js';
import { EVENT_WAVES, rollEvents, makeRandomSkill } from './events.js';
import { ensureMeta, ACHIEVEMENTS, achDone, achClaimable, MODS, todayChallenge, dailyDone, dailyReward, todayKey } from './meta.js';
import { grantItem, ensureGear, gearBonus, rollDrops, itemName, itemDesc, itemIcon, RARITIES, SLOTS, MAX_ITEMS, equip, unequip, salvage, mergeAll, mergeableCount, equippedIn, isBetter, salvageJunk, freshCount } from './gear.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
loadSettings(save);
ensureMeta(save);
ensureTalents(save);
ensureMounts(save);
// 已經玩過的老玩家不用再看教學
if (save.tutorialDone === undefined) save.tutorialDone = save.gold > 0 || save.maxChapter > 1 || save.owned.length > 1;
setMuted(save.muted);

const game = {
  W: 360, H: 640, battleH: 260,
  run: null, speed: 1, paused: false,
  onKill: e => onKill(e),
  onSkillDrop: e => onSkillDrop(e),
  // 魔王登場：換魔王音樂、手機震動
  onBossIntro: () => {
    playMusic('boss');
    vibrate([60, 80, 60, 80, 120]);
  },
  onBossEnrage: e => banner(`${e.name} 狂暴化！`),
  onMountBalls: n => board.pour(n), // 金翼鳥「金羽」
};
const board = new Board();
const battle = new Battle(game);
// 遊戲座標 → 畫面（CSS 像素）座標，給教學光圈定位用
const toCss = (x, y) => ({ x: x * scale, y: y * scale });
const tutorial = new Tutorial({ save, writeSave, game, board, toCss });

// ---------- 畫面尺寸 ----------
let scale = 1;
function resize() {
  const r = $('app').getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  scale = r.width / game.W;
  game.H = r.height / scale;
  game.battleH = Math.round(Math.max(220, Math.min(290, game.H * 0.36)));
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  canvas.style.width = r.width + 'px';
  canvas.style.height = r.height + 'px';
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  board.layout(game.battleH, game.H - 6, game.W);
  battle.layout(game.W, 0, game.battleH);
  document.documentElement.style.setProperty('--stage-h', game.battleH * scale + 'px');
}
window.addEventListener('resize', resize);

// ---------- 觸控：拖曳倒球杯 ----------
function pointerX(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / scale, y: (ev.clientY - r.top) / scale };
}
let dragging = false;
canvas.addEventListener('pointerdown', ev => {
  initAudio();
  const p = pointerX(ev);
  if (game.run && p.y > game.battleH - 20) {
    dragging = true;
    board.touchStart(p.x, p.y);
    tutorial.onDrag();
  }
});
window.addEventListener('pointermove', ev => {
  if (!dragging) return;
  const p = pointerX(ev);
  board.touchMove(p.x, p.y);
});
const endDrag = () => { if (dragging) board.touchEnd(); dragging = false; };
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
document.addEventListener('pointerdown', () => initAudio(), { once: true });

// ---------- 一局遊戲 ----------
// opts.daily = 每日挑戰（固定章節、簡單難度、加上特殊規則）
function startRun(opts = {}) {
  const def = HEROES.find(h => h.id === save.selected) || HEROES[0];
  // 雙職業：主職業先上場，副職業在後面待命
  const def2 = save.second && save.second !== def.id && save.owned.includes(save.second) ? HEROES.find(h => h.id === save.second) : null;
  const defs = def2 ? [def, def2] : [def];
  const heroes = defs.map(d => createHero(d, save));
  heroes.forEach(h => { h.duo = defs.length > 1; });
  const chapter = opts.chapter || save.chapter;
  const mods = {};
  for (const m of opts.mods || []) mods[m] = true;
  const tb = talentBonus(save);
  game.run = {
    chapter, wave: 0, daily: !!opts.daily, endless: !!opts.endless, mods,
    coins: tb.coin + gearBonus(save).coin, tb,
    hero: heroes[0], heroes, switchCd: 0, bare: defs.map(bareHero),
    heroIds: defs.map(d => d.id), heroCls: [...new Set(defs.flatMap(heroCls))],
    skills: [], levels: {}, phase: 'fight', revived: false,
    kills: 0, caught: 0, pegHits: 0, rerollCost: 10, offer: [],
    diff: difficultyOf(opts.daily ? 'easy' : save.difficulty), // 難度
    rules: boardOf(chapter),               // 這一章的彈珠台與特殊規則
  };
  // 每日挑戰「玻璃大砲」
  if (mods.glass) {
    for (const h of heroes) {
      h.baseAtk *= 1.6;
      h.maxHp *= 0.6;
      h.hp = h.maxHp;
    }
  }
  board.reset(game.run);
  // 天賦：接球杯、倍率、開局分裂門
  board.cupW = Math.min(220, board.cupW * (1 + tb.cupW));
  board.cupMult += tb.cupMult;
  for (let i = 0; i < tb.gatePlus; i++) board.addGate('+3');
  // 天賦「開局禮包」：免費一個隨機技能
  if (tb.startSkill) {
    const sk = makeRandomSkill(game.run, isMaxed)(k => k.id !== 'heal');
    if (sk) { gainSkill(sk); setTimeout(() => game.run && toast(`開局禮包：${sk.name}`), 2600); }
  }
  renderSkillBar();
  battle.reset();
  game.paused = false;
  showScreen(null);
  $('hud').classList.remove('hidden');
  nextWave();
  tutorial.onRunStart();
  // 開場提示這一章的特殊規則
  const intro = opts.daily ? `每日挑戰｜${opts.mods.map(m => MODS[m].name).join('、')}` : `${CHAPTERS[(chapter - 1) % CHAPTERS.length].name}｜${game.run.rules.rule}`;
  setTimeout(() => game.run && game.run.wave === 1 && toast(intro), 1500);
  if (def2) {
    heroes[1].x = BENCH_POS.x; heroes[1].z = BENCH_POS.z;
    if (!save.duoTip) { save.duoTip = true; setTimeout(() => game.run && toast('點右下角的「換手」切換職業，換上場時會「換手斬」砍全體！'), 4200); }
  }
  renderSwitch();
  save.stats.runs++;
}

function nextWave() {
  const run = game.run;
  run.wave++;
  run.phase = 'fight';
  // 無盡塔：每打完一個循環（魔王）就進入下一章
  if (run.endless && run.wave > 1 && (run.wave - 1) % ENDLESS_CYCLE === 0) {
    run.chapter++;
    run.rules = boardOf(run.chapter);
    board.setChapter(run.chapter);
    toast(`進入${chapterName(run.chapter)}｜${run.rules.rule}`);
  }
  for (const h of run.heroes) {
    // 倒下的副職業休息一波後帶著 30% 血回來
    if (h.hp <= 0) { if (run.wave > 1) h.hp = h.maxHp * 0.3; continue; }
    if (run.wave > 1 && !run.mods.noHeal) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.regen);
    if (h.fullHealWave) h.hp = h.maxHp; // 強壯體魄滿級
  }
  if (run.wave > 1) board.rerollGates(); // 倍率門每波換數值
  battle.startWave(run);
  run.nextHpMul = 1; // 惡魔契約只影響一波
  // 球之祝福：持續 3 波
  if (run.ballBuff) {
    if (run.ballBuff.fresh) run.ballBuff.fresh = false;
    else if (--run.ballBuff.waves <= 0) run.ballBuff = null;
  }
  const boss = isBossWave(run, run.wave);
  const tag = boss ? ' ' + iconTag(ICON.crown, 16) + '魔王' : stageWave(run, run.wave) % 5 === 0 ? ' ' + iconTag(ICON.warn, 16) + '精英' : '';
  $('hud-wave').innerHTML = run.endless ? `無盡塔 第 ${run.wave} 層${tag}` : `第 ${run.wave}/${MAX_WAVE} 波${tag}`;
  renderWaveBar(run);
  // 每章有自己的音樂；魔王關等魔王登場才切成魔王音樂
  playMusic(CHAPTERS[(run.chapter - 1) % CHAPTERS.length].music);
  if (run.wave > 1) sfx('wave');
  banner(boss ? '魔王來襲！' : run.endless ? `第 ${run.wave} 層` : `第 ${run.wave} 波`);
  renderSwitch();
}

function onKill(e) {
  const run = game.run;
  run.kills++;
  // 裝備可能給小數的掉球數：小數部分用機率決定多不多掉一顆
  // 統計
  save.stats.kills++;
  if (e.kind === 'boss') save.stats.bosses++;
  else if (e.kind !== 'normal') save.stats.elites++;
  // 盜賊王：擊敗直接拿球幣
  if (run.hero.stealCoins) run.coins += run.hero.stealCoins * (run.hero.stealBig && e.kind !== 'normal' ? 10 : 1);
  const n = (run.hero.ballsPerKill + (run.ballBuff ? run.ballBuff.n : 0)) * e.ballMul * (run.mods.tanky ? 1.5 : 1);
  board.pour(Math.floor(n) + (Math.random() < n % 1 ? 1 : 0));
}

// ---------- 完整數值 ----------
// 沒有任何加成的英雄（用來顯示「多了多少」）
const BARE = { talents: {}, gear: { items: [], equip: {}, nextId: 1 }, mounts: { owned: {}, ride: null } };
const bareHero = def => createHero(def, BARE);

// 戰鬥中左上角的即時數值（每 0.25 秒更新）
let liveT = 0;
function updateLive(dt) {
  const el = $('live-stats');
  const run = game.run;
  const show = settings.liveStats && run && ['fight', 'settle'].includes(run.phase);
  el.classList.toggle('hidden', !show);
  if (!show) return;
  liveT -= dt;
  if (liveT > 0) return;
  liveT = 0.25;
  const h = run.hero;
  const html = `<span>${iconTag(ICON.sword, 12)}<b>${fmtNum(heroAtkOf(h))}</b></span><span class="hot">秒傷 <b>${fmtNum(dps(h))}</b></span>
    <span>攻速 <b>${(h.spdMul / h.interval).toFixed(2)}</b></span><span>暴擊 <b>${Math.round(Math.min(1, h.crit) * 100)}%</b></span>
    <span>次數 <b>x${h.hits}</b></span>${h.shield > 0 ? `<span>護盾 <b>${fmt(h.shield)}</b></span>` : ''}`;
  if (el.dataset.html !== html) { el.innerHTML = html; el.dataset.html = html; }
}
const fmtNum = v => (v >= 100 ? fmt(v) : v.toFixed(1));
$('live-stats').addEventListener('click', () => openSkillPanel());

// 首頁：完整數值（天賦、裝備、坐騎都算進去）
let statsTab = 0;
function openStats() {
  const defs = [save.selected, save.second].filter(Boolean).map(id => HEROES.find(h => h.id === id)).filter(Boolean);
  if (statsTab >= defs.length) statsTab = 0;
  const def = defs[statsTab];
  const h = createHero(def, save);
  $('info-body').innerHTML = `
    <h2>完整數值</h2>
    ${defs.length > 1 ? `<div class="gtabs">${defs.map((d, i) => `<button class="gtab ${i === statsTab ? 'sel' : ''}" data-stab="${i}">${i ? '副' : '主'}・${d.name.split(' ')[1]}</button>`).join('')}</div>` : ''}
    <p class="st-head">${iconTag(['dg', def.sprite], 28)} <b>${def.name}</b></p>
    <div id="stats-box">${statsHtml(h, bareHero(def))}</div>
    <p class="hint">綠色 = 天賦、裝備、坐騎額外加的。戰鬥中買到的技能還會再往上加，可以在戰鬥畫面左上角或「技能」裡看到。</p>
    <button class="btn" id="btn-info-close">關閉</button>`;
  showScreen('screen-info', 'screen-home');
}

// ---------- 雙職業：切換 ----------
function renderSwitch() {
  const run = game.run;
  const b = $('btn-switch');
  const bench = run && run.heroes.length > 1 ? run.heroes.find(h => h !== run.hero) : null;
  b.classList.toggle('hidden', !bench);
  if (!bench) return;
  $('switch-ic').innerHTML = iconTag(['dg', bench.def.sprite], 26);
  b.style.setProperty('--hp', Math.max(0, bench.hp) / bench.maxHp);
  b.classList.toggle('down', bench.hp <= 0);
  updateSwitchCd();
}
function updateSwitchCd() {
  const run = game.run;
  const b = $('btn-switch');
  const cd = run.switchCd, full = run.hero.switchCd;
  b.style.setProperty('--cd', cd > 0 ? cd / full : 0);
  b.classList.toggle('ready', cd <= 0);
  const bench = run.heroes.find(h => h !== run.hero);
  setOff(b, cd > 0 || !bench || bench.hp <= 0 || run.phase !== 'fight', !bench || bench.hp <= 0 ? '另一位職業倒下了，下一波才會回來' : cd > 0 ? `冷卻中（${cd.toFixed(1)} 秒）` : '戰鬥中才能切換');
}
// forced = 上場的倒下了，不管冷卻直接換
function doSwitch(forced) {
  const run = game.run;
  const next = run.heroes.find(h => h !== run.hero);
  if (!next || next.hp <= 0) return;
  const prev = run.hero;
  run.hero = next;
  next.x = BENCH_POS.x; next.z = BENCH_POS.z;
  next.timer = 0; next.hitQueue = 0;
  prev.hitQueue = 0;
  run.switchCd = next.switchCd;
  if (!forced) battle.switchStrike(next);
  renderSwitch();
}
$('btn-switch').addEventListener('click', () => {
  const t = $('btn-switch');
  if (isOff(t) || !game.run || game.run.phase !== 'fight') return;
  doSwitch(false);
  pop(t);
});

// ---------- 奇遇事件 ----------
function openEvent() {
  const run = game.run;
  run.phase = 'event';
  run.events = rollEvents(run, board);
  run.eventDone = false;
  $('event-body').innerHTML = `
    <h2>奇遇</h2>
    <p class="ev-sub">旅途中遇到了一些事…選一個吧</p>
    <div class="ev-list">${run.events.map((e, i) => `
      <button class="ev-card" data-ev="${i}" data-fx="tilt">
        <span class="ev-ic">${iconTag(e.icon, 36)}</span>
        <span class="ev-info"><b>${e.title} <i class="ev-tag ${e.tag === '風險' ? 'risk' : e.tag === '增益' ? 'buff' : ''}">${e.tag}</i></b><small>${e.desc}</small></span>
      </button>`).join('')}
    </div>
    <button class="btn ghost" id="btn-ev-skip">跳過，直接去商店</button>`;
  showScreen('screen-event');
  sfx('wave');
}

$('event-body').addEventListener('click', ev => {
  const run = game.run;
  const t = ev.target.closest('button');
  if (!t || !run) return;
  if (t.id === 'btn-ev-skip' || t.id === 'btn-ev-go') { sfx('tap'); openShop(); return; }
  if (t.dataset.ev === undefined || run.eventDone) return;
  run.eventDone = true;
  save.stats.events++;
  const e = run.events[+t.dataset.ev];
  const res = e.apply({
    run, board,
    randomSkill: makeRandomSkill(run, isMaxed),
    gainSkill: sk => { gainSkill(sk); if (isMaxed(sk)) celebrateMax(sk, null); },
  });
  if (run.ballBuff) run.ballBuff.fresh = run.ballBuff.fresh !== false;
  renderSkillBar();
  // 選中的卡顯示結果，其他卡淡出
  document.querySelectorAll('.ev-card').forEach(c => c.classList.add(c === t ? 'chosen' : 'faded'));
  t.querySelector('small').textContent = res.text;
  t.classList.add(res.good ? 'good' : 'bad');
  sfx(res.good ? 'buy' : 'lose');
  celebrate(t, res.good ? '#ffd84a' : '#ff5a5a');
  $('btn-ev-skip').outerHTML = '<button class="btn big" id="btn-ev-go">前往商店 ▶</button>';
});

board.onCatch = (b, mult) => {
  const run = game.run;
  const gain = b.v * mult * (run.mods.rich ? 1.5 : 1);
  run.coins += gain;
  save.stats.coins += gain;
  run.caught++;
  const h = run.hero;
  if (h.def.id === 'archer' && run.caught % h.arrowNeed === 0 && run.phase === 'fight') {
    for (let k = 0; k < h.arrowCount; k++) battle.strikeFront(2.5, '球雨箭!', '#b6ff6d');
  }
  // 星辰賢者：星落
  if (h.def.id === 'sage' && run.caught % h.starNeed === 0 && run.phase === 'fight') {
    for (let k = 0; k < h.starCount; k++) setTimeout(() => game.run && game.run.phase === 'fight' && battle.blast(h.starMul, k ? '' : '星落!', '#c8b6ff', { crit: h.starCrit }), k * 200);
  }
};
board.onPeg = () => {
  const run = game.run;
  if (run.hero.def.id !== 'saw' || run.phase !== 'fight') return;
  run.pegHits++;
  if (run.pegHits % run.hero.sawNeed === 0) battle.strikeFront(run.hero.sawMul, '鏈鋸!', '#ff9f43');
};

let lastCoinText = '', lastCoins = 0, lastBump = 0;
function bump(el) {
  const now = performance.now();
  if (now - lastBump < 120) return;
  lastBump = now;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function update(dt) {
  const run = game.run;
  if (!run) { battle.scene.update(dt); $('live-stats').classList.add('hidden'); return; }
  const live = !game.paused && (run.phase === 'fight' || run.phase === 'settle');
  updateLive(dt);
  battle.update(game.paused ? 0 : dt, live && run.phase === 'fight');
  if (!live) return;
  if (run.switchCd > 0 && !game.paused) { run.switchCd = Math.max(0, run.switchCd - dt); updateSwitchCd(); }
  if (run.heroes.length > 1) $('btn-switch').style.setProperty('--hp', Math.max(0, run.heroes.find(h => h !== run.hero).hp) / run.heroes.find(h => h !== run.hero).maxHp);
  board.update(dt);
  const shown = fmt(run.coins);
  if (shown !== lastCoinText) {
    $('hud-coins').textContent = shown;
    if (run.coins > lastCoins) bump($('hud-coin-pill'));
    lastCoinText = shown;
    lastCoins = run.coins;
  }

  if (run.phase === 'fight') {
    if (run.hero.hp <= 0 && run.hero.phoenix) {
      // 天賦「不死鳥」：自動復活一次
      run.hero.phoenix = false;
      run.hero.hp = run.hero.maxHp * 0.5;
      banner('不死鳥・浴火重生！');
      sfx('wave');
      vibrate([40, 60, 120]);
    } else if (run.hero.hp <= 0 && run.heroes.some(h => h !== run.hero && h.hp > 0)) {
      // 雙職業：上場的倒下，另一位自動接手
      run.hero.hp = 0;
      const down = run.hero.def.name.split(' ')[1];
      doSwitch(true);
      banner(`${down} 倒下！${run.hero.def.name.split(' ')[1]} 接手`);
    } else if (run.hero.hp <= 0) {
      run.hero.hp = 0;
      onDeath();
    } else if (battle.cleared()) {
      run.phase = 'settle';
    }
  } else if (run.phase === 'settle' && board.isEmpty()) {
    if (!run.endless && run.wave >= MAX_WAVE) endRun(true);
    else if (EVENT_WAVES.includes(stageWave(run, run.wave))) openEvent();
    else openShop();
  }
}

// ---------- 商店（三選一技能卡）----------
// 已獲得的技能：同一種合併顯示，例如「劍 x3」
// ---------- 技能等級 ----------
// run.skills = 拿到過的技能（依取得順序，不重複）；run.levels = 每個技能目前幾級
const skillLv = sk => game.run.levels[sk.id] || 0;
const isMaxed = sk => !!sk.max && skillLv(sk) >= sk.max;

// 已獲得的技能：圖示＋等級（滿級顯示 MAX）
function ownedSummary() {
  return game.run.skills.map(sk => `<span class="owned-sk ${isMaxed(sk) ? 'max' : ''}">${iconTag(sk.icon, 18)}${isMaxed(sk) ? 'MAX' : sk.max ? 'Lv' + skillLv(sk) : 'x' + skillLv(sk)}</span>`).join('');
}

// 戰鬥畫面右上角的「技能」按鈕：只顯示數量，點開才看完整清單（不擋畫面）
function renderSkillBar() {
  const n = game.run.skills.length;
  const maxed = game.run.skills.filter(isMaxed).length;
  $('skill-count').textContent = n;
  $('btn-skills').classList.toggle('has-max', maxed > 0);
  if (n) pop($('btn-skills'));
}

function openSkillPanel() {
  const run = game.run;
  if (!run) return;
  const wasLive = run.phase === 'fight' || run.phase === 'settle';
  if (wasLive) game.paused = true;
  const h = run.hero;
  const rows = run.skills.map(sk => {
    const lv = skillLv(sk);
    let pips = '';
    if (sk.max) for (let i = 1; i <= sk.max; i++) pips += `<i class="${i <= lv ? 'on' : ''}"></i>`;
    return `<div class="sk-row ${isMaxed(sk) ? 'max' : ''}">
      <span class="sk-ic">${iconTag(sk.icon, 28)}</span>
      <span class="sk-info">
        <b>${sk.name}${sk.hero ? ' <span class="tag excl">專屬</span>' : ' ' + catTag(sk)}</b>
        <small>${sk.desc}</small>
        ${sk.max ? `<small class="${isMaxed(sk) ? 'max-on' : 'max-off'}">${isMaxed(sk) ? '★ 滿級：' : '滿級獎勵：'}${sk.maxDesc}</small>` : ''}
      </span>
      <span class="sk-lv">${isMaxed(sk) ? '<b class="max">MAX</b>' : sk.max ? `Lv.${lv}/${sk.max}` : 'x' + lv}<span class="pips">${pips}</span></span>
    </div>`;
  }).join('');
  const hi = run.heroes.indexOf(statHero(run));
  $('skills-body').innerHTML = `
    <h2>角色與技能</h2>
    ${run.heroes.length > 1 ? `<div class="gtabs">${run.heroes.map((x, i) => `<button class="gtab ${i === hi ? 'sel' : ''}" data-shero="${i}">${x === run.hero ? '上場' : '待命'}・${x.def.name.split(' ')[1]}</button>`).join('')}</div>` : ''}
    <div id="skill-stats">${statsHtml(run.heroes[hi], run.bare[hi])}</div>
    <h3 class="sub-h">技能</h3>
    ${run.heroes.map(x => `<p class="hero-pass ${x === h ? '' : 'bench'}">${iconTag(['dg', x.def.sprite], 24)} ${x.def.passive}</p>`).join('')}
    <div class="sk-list">${rows || '<p class="hint">還沒有技能，打完一波就能在商店購買</p>'}</div>
    <button class="btn big" id="btn-skills-close">${wasLive ? '繼續戰鬥' : '關閉'}</button>`;
  $('skills-body').dataset.resume = wasLive ? '1' : '';
  showScreen('screen-skills', run.phase === 'shop' ? 'screen-shop' : null);
}
$('btn-skills').addEventListener('click', openSkillPanel);
// 技能面板看的是哪一位（雙職業可以切換分頁）
let statPick = null;
const statHero = run => (statPick && run.heroes.includes(statPick) ? statPick : run.hero);
// 面板開著時數值即時更新
setInterval(() => {
  const run = game.run;
  if (!run || $('screen-skills').classList.contains('hidden')) return;
  const h = statHero(run);
  refreshStats($('skill-stats'), h, run.bare[run.heroes.indexOf(h)]);
}, 300);
$('skills-body').addEventListener('click', ev => {
  const tab = ev.target.closest('[data-shero]');
  if (tab) { statPick = game.run.heroes[+tab.dataset.shero]; sfx('tap'); openSkillPanel(); return; }
  if (!ev.target.closest('#btn-skills-close')) return;
  statPick = null;
  sfx('tap');
  const resume = $('skills-body').dataset.resume;
  if (resume) game.paused = false;
  showScreen(game.run && game.run.phase === 'shop' ? 'screen-shop' : null);
});

// 獲得技能（購買或怪物掉落都走這裡）
// 雙職業：技能同時加給兩位（專屬技能只給本人）；會改彈珠台的效果只做一次
const NO_BOARD = new Proxy({}, { get: () => () => {}, set: () => true });
function forHeroes(sk, fn) {
  let first = true;
  for (const h of game.run.heroes) {
    if (sk.hero && sk.hero !== h.def.id) continue;
    fn(h, first ? board : NO_BOARD);
    first = false;
  }
}
function gainSkill(sk) {
  const run = game.run;
  forHeroes(sk, (h, b) => sk.apply(h, run, b));
  if (!run.levels[sk.id]) run.skills.push(sk);
  run.levels[sk.id] = skillLv(sk) + 1;
}

// 菁英、寶箱怪掉落：隨機一個還沒滿級、這位英雄能用的技能，免費獲得
function onSkillDrop() {
  const run = game.run;
  const pool = SKILLS.filter(sk => !isMaxed(sk) && skillAllowed(sk, run));
  if (!pool.length) return;
  const sk = pool[Math.floor(Math.random() * pool.length)];
  gainSkill(sk);
  sfx('buy');
  banner(`掉落技能：${sk.name}！`);
  toast(`${sk.name} → ${sk.max ? `Lv.${skillLv(sk)}/${sk.max}` : '已使用'}：${sk.desc}`);
  if (isMaxed(sk)) celebrateMax(sk, null);
  renderSkillBar();
}

// 升到滿級：金色爆發＋橫幅＋滿級獎勵生效
function celebrateMax(sk, card) {
  const run = game.run;
  forHeroes(sk, (h, b) => sk.maxApply(h, run, b));
  for (const h of run.heroes) h.maxed = (h.maxed || 0) + 1;
  save.stats.maxed++;
  banner(`${sk.name} 滿級！`);
  sfx('wave');
  if (card) {
    card.classList.add('maxed');
    celebrate(card, '#ffd84a');
    setTimeout(() => celebrate(card, '#fff6b0'), 180);
  }
  toast(`滿級獎勵：${sk.maxDesc}`);
}

// 技能分類小標籤：通用／近戰／遠程／法術
const catTag = sk => {
  const c = skillCat(sk);
  return c ? `<span class="cat-tag" style="--cc:${CATS[c].color}">${CATS[c].name}</span>` : '';
};

function rollOffer() {
  const run = game.run;
  const picks = [];
  // 共同技能＋這位英雄的專屬技能；滿級的不再出現
  const pool = SKILLS.filter(sk => !isMaxed(sk) && skillAllowed(sk, run));
  const weight = sk => STAR_WEIGHT[sk.star] * (sk.hero ? 1.6 : 1) * (sk.star > 1 ? 1 + run.tb.luck : 1); // 專屬技能比較常出現；天賦「好運」提高高星
  while (picks.length < 3 && pool.length) {
    const total = pool.reduce((s, k) => s + weight(k), 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= weight(pool[idx]); if (r <= 0) break; }
    idx = Math.min(idx, pool.length - 1);
    const sk = pool.splice(idx, 1)[0];
    picks.push({ sk, price: Math.round(STAR_PRICE[sk.star] * Math.pow(1.17, run.wave - 1) * run.diff.price * (run.shopDiscount || 1) * (1 - run.tb.price)), bought: false });
  }
  run.offer = picks;
}

function openShop() {
  const run = game.run;
  run.phase = 'shop';
  // 利息技能：每波結束拿利息（上限跟著波數變高）
  const h = run.hero;
  if (h.interest) {
    const gain = Math.floor(Math.min(run.coins * h.interest, (40 + run.wave * 25) * h.interestCap));
    if (gain > 0) { run.coins += gain; toast(`利息 +${gain} 球幣`); }
  }
  run.rerollCost = Math.round((10 + run.wave * 2) * (1 - run.tb.rerollDisc));
  run.freeReroll = 1 + run.tb.reroll; // 天賦「多看看」多給幾次
  rollOffer();
  renderShop();
  showScreen('screen-shop');
  tutorial.onShop();
}

// 「不能按」的標記：用 aria-disabled（iPhone 上 disabled 按鈕收不到觸控，就沒辦法搖晃提示）
function offAttr(cond, why) {
  return cond ? `aria-disabled="true" data-deny="${why}"` : '';
}
function setOff(el, cond, why) {
  if (!el) return;
  if (cond) { el.setAttribute('aria-disabled', 'true'); el.dataset.deny = why; } else { el.removeAttribute('aria-disabled'); delete el.dataset.deny; }
}

// 商店：只更新會變的部分
function updateShop() {
  const run = game.run;
  const coins = $('shop-coins').querySelector('b');
  coins.textContent = fmt(run.coins);
  pop($('shop-coins'));
  document.querySelectorAll('#shop-body .card').forEach(card => {
    const o = run.offer[+card.dataset.i];
    const cant = !o.bought && run.coins < o.price;
    card.classList.toggle('bought', o.bought);
    card.classList.toggle('cant', cant);
    const b = card.querySelector('.buy');
    if (o.bought) b.textContent = '已獲得';
    setOff(b, o.bought || cant, o.bought ? '這張已經買過了' : `球幣不足，還差 ${o.price - Math.floor(run.coins)}`);
  });
  setOff($('btn-reroll'), run.coins < run.rerollCost, '球幣不足，無法刷新');
  $('shop-owned').innerHTML = '已獲得：' + ownedSummary();
  // 買完技能，數值立刻更新並閃一下
  const st = $('shop-stats');
  const html = shopStats();
  if (st.innerHTML !== html) { st.innerHTML = html; st.classList.remove('flash'); void st.offsetWidth; st.classList.add('flash'); }
}

// 商店下方：目前上場角色的主要數值
function shopStats() {
  const h = game.run.hero;
  return `<span>${iconTag(ICON.heart, 12)}${fmt(Math.max(0, h.hp))}/${fmt(h.maxHp)}</span><span>${iconTag(ICON.sword, 12)}${fmtNum(heroAtkOf(h))}</span><span>秒傷 ${fmtNum(dps(h))}</span><span>攻速 ${(h.spdMul / h.interval).toFixed(2)}</span><span>暴擊 ${Math.round(Math.min(1, h.crit) * 100)}%</span><span>次數 x${h.hits}</span>`;
}

// 卡片上的等級：Lv.2 → 3 / 5，加上一排小格子（已有的實心、這次會加的閃爍）
function levelHtml(sk, lv) {
  if (!sk.max) return `<div class="lv">可重複購買${lv ? `（已買 ${lv} 次）` : ''}</div>`;
  let pips = '';
  for (let i = 1; i <= sk.max; i++) pips += `<i class="${i <= lv ? 'on' : i === lv + 1 ? 'next' : ''}"></i>`;
  const next = lv + 1 >= sk.max ? 'MAX' : lv + 1;
  return `<div class="lv">Lv.${lv} → <b>${next}</b> <small>/ ${sk.max}</small></div><div class="pips">${pips}</div>`;
}

function renderShop() {
  const run = game.run;
  const cards = run.offer.map((o, i) => {
    const cant = !o.bought && run.coins < o.price;
    const sk = o.sk;
    const lv = skillLv(sk) - (o.bought ? 1 : 0); // 買之前的等級
    const toMax = sk.max && lv + 1 >= sk.max;    // 這張買下去就滿級
    return `<div class="card star${sk.star} ${sk.gold ? 'gold' : ''} ${sk.hero ? 'excl' : ''} ${toMax ? 'to-max' : ''} ${o.bought ? 'bought' : ''} ${cant ? 'cant' : ''}" data-i="${i}" data-fx="tilt">
      <div class="card-icon">${iconTag(sk.icon, 44)}</div>
      <div class="card-name">${sk.hero ? '<span class="excl-tag">專屬</span>' : ''}${sk.name}</div>
      ${catTag(sk)}
      ${levelHtml(sk, lv)}
      <div class="card-desc">${sk.desc}</div>
      ${toMax ? `<div class="maxbonus">滿級獎勵<br>${sk.maxDesc}</div>` : ''}
      <div class="stars">${'★'.repeat(o.sk.star)}${'☆'.repeat(3 - o.sk.star)}</div>
      <button class="buy" data-i="${i}" ${offAttr(o.bought || cant, o.bought ? '這張已經買過了' : `球幣不足，還差 ${o.price - Math.floor(run.coins)}`)}>${o.bought ? '已獲得' : iconTag(ICON.gem, 16) + o.price}</button>
    </div>`;
  }).join('');
  $('shop-body').innerHTML = `
    <h2>選擇新技能</h2>${run.shopDiscount < 1 ? '<p class="discount">流浪商人：全部半價！</p>' : ''}
    <div class="pill" id="shop-coins">${iconTag(ICON.gem, 18)} <b>${fmt(run.coins)}</b></div>
    <div class="cards">${cards || '<p class="all-max">所有技能都已滿級！</p>'}</div>
    <div class="row">
      <button class="btn small" id="btn-reroll" ${offAttr(run.coins < run.rerollCost, '球幣不足，無法刷新')}>${iconTag(ICON.refresh, 16)} 刷新 ${iconTag(ICON.gem, 16)}${run.rerollCost}</button>
      <button class="btn small gift" id="btn-free" ${offAttr(!run.freeReroll, '這一波的免費刷新用完了')}>${iconTag(ICON.free, 16)} 免費刷新${run.freeReroll > 1 ? ' x' + run.freeReroll : ''}</button>
    </div>
    <button class="btn big" id="btn-next">下一波 ▶</button>
    <div class="shop-stats" id="shop-stats">${shopStats()}</div>
    <div class="owned" id="shop-owned">${run.skills.length ? '已獲得：' + ownedSummary() : '用接到的球幣購買技能，可以買不只一張'}</div>`;
}

$('shop-body').addEventListener('click', ev => {
  const run = game.run;
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  if (t.classList.contains('buy')) {
    const o = run.offer[+t.dataset.i];
    if (o.bought || run.coins < o.price) return;
    run.coins -= o.price;
    o.bought = true;
    gainSkill(o.sk);
    sfx('buy');
    // 不整個重畫（不然卡片翻轉動畫會重播），只更新數字與狀態
    const card = t.closest('.card');
    celebrate(card, '#ff7ad9');
    card.classList.add('just-bought');
    if (isMaxed(o.sk)) celebrateMax(o.sk, card);
    updateShop();
    renderSkillBar();
    return;
  } else if (t.id === 'btn-reroll') {
    run.coins -= run.rerollCost;
    run.rerollCost += Math.round(10 * (1 - run.tb.rerollDisc));
    rollOffer();
    sfx('tap');
  } else if (t.id === 'btn-free') {
    // 正式版這裡接「激勵廣告」：看完廣告才給免費刷新
    run.freeReroll--;
    rollOffer();
    sfx('tap');
  } else if (t.id === 'btn-next') {
    sfx('tap');
    run.shopDiscount = 1; // 流浪商人的半價只限這一次商店
    showScreen(null);
    nextWave();
    return;
  }
  renderShop();
});

// ---------- 死亡 / 結算 ----------
function onDeath() {
  const run = game.run;
  run.phase = 'dead';
  sfx('lose');
  if (!run.revived) {
    $('result-body').innerHTML = `
      <h2>英雄倒下了…</h2>
      <p>撐到第 ${run.wave} 波</p>
      <button class="btn big gift" id="btn-revive">${iconTag(ICON.heart, 20)} 復活一次</button>
      <button class="btn" id="btn-giveup">結算</button>
      <p class="hint">（正式版：看一段激勵廣告即可復活）</p>`;
    $('result-body').className = 'panel center lose';
    showScreen('screen-result');
  } else endRun(false);
}

function endRun(win) {
  const run = game.run;
  run.phase = 'over';
  const cleared = win ? MAX_WAVE : run.wave - 1;
  let gold = cleared * 10 * run.chapter + Math.floor(run.coins / 5);
  gold = Math.round(gold * run.diff.gold);
  if (win) gold += Math.round(150 * run.chapter * run.diff.gold);
  gold = Math.round(gold * (1 + gearBonus(save).gold + run.tb.gold + Math.max(...run.heroes.map(h => h.goldBonus)))); // 黃金戒指＋天賦＋盜賊王
  save.gold += gold;
  const diffIndex = DIFFICULTIES.findIndex(d => d.id === run.diff.id);
  const { drops, salvaged } = rollDrops(save, cleared, win, diffIndex);
  // 統計
  const st = save.stats;
  st.bestWave = Math.max(st.bestWave, cleared);
  if (win) {
    st.wins++;
    if (diffIndex >= 3) st.hardWin++;
    if (diffIndex >= 4) st.hellWin++;
  }
  // 每日挑戰：今天第一次通關 → 金幣＋史詩裝備
  let dailyHtml = '';
  if (run.daily && win && !dailyDone(save)) {
    const ch = todayChallenge(save);
    const g = dailyReward(ch);
    save.gold += g;
    const it = grantItem(save, 2);
    drops.push(it);
    save.daily = { date: todayKey(), done: true };
    st.dailyWins++;
    dailyHtml = `<p class="good">每日挑戰完成！額外 +${g} 金幣＋史詩裝備</p>`;
  }
  // 無盡塔：記錄到本機排行榜（前 10 名）
  let recordHtml = '';
  if (run.endless) {
    save.records = save.records || [];
    const rec = { hero: run.heroes[0].def.id, hero2: run.heroes[1] && run.heroes[1].def.id, diff: run.diff.id, wave: cleared, kills: run.kills, date: todayKey() };
    save.records.push(rec);
    save.records.sort((a, b) => b.wave - a.wave || b.kills - a.kills);
    save.records = save.records.slice(0, 10);
    const rank = save.records.indexOf(rec) + 1;
    recordHtml = rank === 1 ? '<p class="good">新紀錄！排行榜第 1 名</p>' : rank ? `<p class="good">排行榜第 ${rank} 名</p>` : '';
  }
  // 分享用的資料
  game.lastResult = {
    win, endless: run.endless, daily: run.daily, cleared, kills: run.kills, chapter: run.chapter,
    hero: run.heroes[0].def, hero2: run.heroes[1] && run.heroes[1].def, diff: run.diff, skills: run.skills.slice(0, 8),
  };
  // 坐騎：騎著冒險累積經驗
  const ride = rideExp(save, cleared);
  const rideHtml = ride ? `<p class="ride-exp">${iconTag(['ic', ride.m.icon, ride.m.color], 18)} ${ride.m.name} +${ride.exp} 經驗${ride.ups ? `，升到 Lv.${ride.st.lv}！` : ''}</p>` : '';
  let unlocked = '';
  if (win && run.chapter === save.maxChapter && !run.endless) {
    save.maxChapter++;
    save.chapter = save.maxChapter;
    unlocked = `<p class="good">解鎖第 ${save.maxChapter} 章：${chapterName(save.maxChapter)}</p>`;
  }
  writeSave(save);
  if (win) { sfx('win'); setTimeout(() => playMusic('victory'), 900); }
  $('result-body').innerHTML = `
    <h2>${iconTag(win ? ICON.trophy : ICON.skull, 28)} ${run.endless ? '無盡塔結束' : win ? '章節通關！' : '冒險結束'}</h2>
    <p>${run.endless ? `到達第 ${cleared} 層` : `第 ${run.chapter} 章・完成 ${cleared}/${MAX_WAVE} 波`}・擊敗 ${run.kills} 隻</p>
    ${recordHtml}
    <div class="reward">${iconTag(ICON.gold, 32)} <b id="gold-count">+0</b></div>
    ${unlocked}${dailyHtml}${rideHtml}
    ${drops.length ? `<p>獲得裝備</p><div class="drops">${drops.map((it, i) => `
      <span class="drop r${it.rarity}" style="--rc:${RARITIES[it.rarity].color};animation-delay:${0.9 + i * 0.25}s">${iconTag(itemIcon(it), 30)}<small>${RARITIES[it.rarity].name}</small></span>`).join('')}</div>` : ''}
    ${salvaged ? `<p class="hint">背包滿了，自動分解換得 ${salvaged} 金幣</p>` : ''}
    <button class="btn big" id="btn-home">回到主畫面</button>
    <button class="btn small" id="btn-share">${iconTag(['ic', 1057], 16)} 分享戰績</button>`;
  $('result-body').className = 'panel center ' + (win ? 'win' : 'lose');
  showScreen('screen-result');
  countUp($('gold-count'), gold);
}

$('result-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t) return;
  const run = game.run;
  sfx('tap');
  if (t.id === 'btn-revive') {
    run.revived = true;
    for (const h of run.heroes) if (h.hp <= 0) h.hp = h.maxHp * 0.6;
    renderSwitch();
    run.phase = 'fight';
    showScreen(null);
  } else if (t.id === 'btn-giveup') {
    endRun(false);
  } else if (t.id === 'btn-share') {
    shareResult(game.lastResult).then(msg => msg && toast(msg));
  } else if (t.id === 'btn-home') {
    goHome();
  }
});

// ---------- 暫停 / 速度 ----------
$('btn-speed').addEventListener('click', () => {
  game.speed = game.speed === 1 ? 2 : 1;
  $('btn-speed').textContent = 'x' + game.speed;
  pop($('btn-speed'));
});
$('btn-pause').addEventListener('click', () => {
  if (!game.run || !['fight', 'settle'].includes(game.run.phase)) return;
  game.paused = true;
  showScreen('screen-pause');
});
$('btn-resume').addEventListener('click', () => { game.paused = false; showScreen(null); });
$('btn-quit').addEventListener('click', () => { game.paused = false; endRun(false); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.run && ['fight', 'settle'].includes(game.run.phase)) {
    game.paused = true;
    showScreen('screen-pause');
  }
});

// ---------- 主畫面（局外養成）----------
const chapterName = n => CHAPTERS[(n - 1) % CHAPTERS.length].name + (n > CHAPTERS.length ? ` ${Math.ceil(n / CHAPTERS.length)}` : '');

function goHome() {
  game.run = null;
  playMusic('home');
  checkUpdate(true);
  $('hud').classList.add('hidden');
  $('btn-switch').classList.add('hidden');
  renderHome();
  showScreen('screen-home');
}

// 雙職業：選主職業與副職業（副職業可以不帶）
let duoPick = 'main';
function duoBar() {
  if (save.owned.length < 2) return '';
  if (save.second === save.selected || (save.second && !save.owned.includes(save.second))) save.second = null;
  const main = HEROES.find(h => h.id === save.selected) || HEROES[0];
  const sec = save.second && HEROES.find(h => h.id === save.second);
  return `<div class="duo">
    <button class="duo-slot ${duoPick === 'main' ? 'on' : ''}" id="duo-main"><i>主</i>${iconTag(['dg', main.sprite], 26)}<span>${main.name.split(' ')[1]}</span></button>
    <span class="duo-mid">⇄<small>戰鬥中可切換</small></span>
    <button class="duo-slot second ${duoPick === 'second' ? 'on' : ''} ${sec ? '' : 'empty'}" id="duo-second"><i>副</i>${sec ? iconTag(['dg', sec.sprite], 26) + `<span>${sec.name.split(' ')[1]}</span>` : '<span>＋ 選副職業</span>'}</button>
    ${sec ? '<button class="duo-x" id="duo-clear" aria-label="不帶副職業">✕</button>' : ''}
  </div>`;
}

// 隱藏職業：達成對應成就就自動加入
function unlockHidden() {
  const got = [];
  for (const h of HEROES) {
    if (!h.hidden || save.owned.includes(h.id)) continue;
    const a = ACHIEVEMENTS.find(x => x.id === h.unlock);
    if (a && achDone(save, a)) { save.owned.push(h.id); got.push(h); }
  }
  if (!got.length) return;
  writeSave(save);
  // 一次解鎖好幾個時一個一個輪流顯示
  got.forEach((h, i) => setTimeout(() => { banner(`隱藏職業解鎖：${h.name.split(' ')[1]}！`); sfx('win'); }, 600 + i * 1800));
}
const unlockAch = h => ACHIEVEMENTS.find(x => x.id === h.unlock);
const clsTags = def => heroCls(def).map(c => `<span class="cat-tag" style="--cc:${CATS[c].color}">${CATS[c].name}</span>`).join(' ');

function renderHome() {
  unlockHidden();
  const hero = HEROES.find(h => h.id === save.selected) || HEROES[0];
  const heroes = HEROES.map(h => {
    const own = save.owned.includes(h.id);
    const secret = h.hidden && !own;
    return `<button class="hero ${h.id === save.selected ? 'sel' : ''} ${h.id === save.second ? 'sel2' : ''} ${own ? '' : 'locked'} ${secret ? 'secret' : ''} ${h.hidden ? 'hidden-cls' : ''}" data-hero="${h.id}" data-fx="tilt">
      ${iconTag(['dg', h.sprite], 48, 'hero-emoji')}
      <span class="hero-name">${secret ? '？？？' : h.name.split(' ')[1]}</span>
      ${secret ? '<span class="hero-price secret">隱藏職業</span>' : own ? '' : `<span class="hero-price">${iconTag(ICON.gold, 14)}${h.price}</span>`}
    </button>`;
  }).join('');
  const heroScroll = document.querySelector('.heroes') ? document.querySelector('.heroes').scrollLeft : null;
  const full = createHero(hero, save); // 算上天賦、裝備、坐騎
  const ch = CHAPTERS[(save.chapter - 1) % CHAPTERS.length];
  $('home-body').innerHTML = `
    <div class="home-stage">
      <div class="top-row">
        <div class="pill" id="home-gold">${iconTag(ICON.gold, 20)} <b>${fmt(save.gold)}</b></div>
        <span class="top-btns">
          <button class="icon-btn ${updateInfo && updateInfo.newer ? 'has-update' : ''}" id="btn-update" aria-label="檢查更新">${iconTag(ICON.refresh, 22)}</button>
          <button class="icon-btn" id="btn-settings" aria-label="設定">${iconTag(['ic', 829], 22)}</button>
          <button class="icon-btn" id="btn-mute" aria-label="音效開關">${iconTag(save.muted ? ICON.soundOff : ICON.soundOn, 22)}</button>
        </span>
      </div>
      <h1 class="logo">彈珠勇者</h1>
      <p class="sub">自動戰鬥 × 彈珠倍率 × 三選一技能</p>
      <div class="chapter">
        <button class="icon-btn" id="ch-prev" ${offAttr(save.chapter <= 1, '已經是第一章')}>◀</button>
        <div class="chapter-name"><small>第 ${save.chapter} 章</small><b>${chapterName(save.chapter)}</b><em>${boardOf(save.chapter).rule}</em></div>
        <button class="icon-btn" id="ch-next" ${offAttr(save.chapter >= save.maxChapter, '通關這一章才能解鎖下一章')}>▶</button>
      </div>
    </div>
    <div class="home-bottom">
      <div class="diffs" role="radiogroup" aria-label="難度">${DIFFICULTIES.map(d => `
        <button class="diff ${d.id === save.difficulty ? 'sel' : ''}" data-diff="${d.id}" style="--dc:${d.color}" role="radio" aria-checked="${d.id === save.difficulty}">
          <b>${d.name}</b><small>金幣 x${d.gold}</small></button>`).join('')}
      </div>
      ${duoBar()}
      <div class="heroes">${heroes}</div>
      <button class="gear-btn" id="btn-gear">${gearSummary()}</button>
      <div class="meta-row">
        <button class="meta-btn" id="btn-ach">${iconTag(ICON.trophy, 20)} 成就${achClaimable(save).length ? `<b class="badge">${achClaimable(save).length}</b>` : ''}</button>
        <button class="meta-btn ${dailyDone(save) ? 'done' : 'fresh'}" id="btn-daily">${iconTag(['ic', 630, '#ffd84a'], 20)} 每日挑戰<small>${dailyDone(save) ? '今日完成 ✓' : '尚未挑戰'}</small></button>
        <button class="meta-btn" id="btn-endless" ${offAttr(save.maxChapter < 2, '通關第 1 章後開放無盡塔')}>${iconTag(['ic', 1023, '#d06bff'], 20)} 無盡塔<small>${save.records && save.records.length ? `最高 ${save.records[0].wave} 層` : save.maxChapter < 2 ? '通關第 1 章開放' : '尚無紀錄'}</small></button>
      </div>
      <div class="hero-info">
        <div class="hero-head"><b>${hero.name}</b><span class="tag">${hero.role}</span></div>
        <div class="stats">
          <span id="stat-hp">${iconTag(ICON.heart, 14)} ${Math.round(full.maxHp)}</span>
          <span id="stat-atk">${iconTag(ICON.sword, 14)} ${fmtNum(heroAtkOf(full))}</span>
          <span>${iconTag(ICON.target, 14)} ${(full.spdMul / full.interval).toFixed(2)} 下/秒</span>
          <span class="hot">秒傷 ${fmtNum(dps(full))}</span>
        </div>
        <button class="link stats-link" id="btn-stats">${iconTag(ICON.target, 12)} 查看完整數值（含天賦、裝備、坐騎）▶</button>
        <small class="passive">${iconTag(ICON.star, 14)} ${hero.passive}</small>
        <small class="excl-list">專屬技能：${SKILLS.filter(k => k.hero === hero.id).map(k => k.name).join('、')}</small>
        <small class="cls-line">技能類型：${clsTags(hero)} ＋ <span class="cat-tag" style="--cc:${CATS.any.color}">通用</span></small>
      </div>
      ${mountBtn()}
      <button class="talent-btn ${talentReady() ? 'ready' : ''}" id="btn-talent">${iconTag(['ic', 1023, '#ffd84a'], 26)}<span><b>天賦網</b><small>已點亮 ${totalPoints(save)} 點${talentReady() ? '・有天賦可以升級' : ''}</small></span><em>▶</em></button>
      <button class="btn big start" id="btn-start">開始冒險 <small>${ch.name}・${difficultyOf(save.difficulty).name}${save.second ? '・雙職業' : ''}</small></button>
      <button class="btn small ghost ${installEvt ? '' : 'hidden'}" id="btn-install">${iconTag(ICON.install, 16)} 安裝到手機</button>
      <p class="hint">${isIOS() && !isStandalone() ? 'iPhone：點 Safari「分享」→「加入主畫面」即可全螢幕離線玩' : ''}</p>
      <div class="version-row">
        <span>v${VERSION}</span>
        <button class="link" id="btn-changelog">更新日誌</button>
      </div>
    </div>`;
  // 英雄列表可以左右滑：重畫後保持原本位置；第一次打開時捲到選中的英雄
  const list = $('home-body').querySelector('.heroes');
  if (heroScroll !== null) list.scrollLeft = heroScroll;
  else { const sel = list.querySelector('.sel'); if (sel) list.scrollLeft = sel.offsetLeft - list.clientWidth / 2 + sel.offsetWidth / 2; }
}

$('home-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  initAudio();
  sfx('tap');
  if (t.dataset.hero) {
    const h = HEROES.find(x => x.id === t.dataset.hero);
    if (save.owned.includes(h.id) && duoPick === 'second') {
      // 選副職業：選到主職業就互換
      if (h.id === save.selected) { save.selected = save.second || h.id; save.second = save.second ? h.id : null; }
      else save.second = h.id;
      duoPick = 'main';
      toast(`副職業：${h.name}`);
    } else if (save.owned.includes(h.id)) {
      if (save.selected !== h.id) heroHop = performance.now();
      if (h.id === save.second) save.second = save.selected; // 點到副職業 → 主副互換
      save.selected = h.id;
    } else if (h.hidden) {
      const a = unlockAch(h);
      toast(`隱藏職業：達成成就「${a.name}」（${a.desc}）就會解鎖`);
      t.classList.add('fx-deny');
      t.addEventListener('animationend', () => t.classList.remove('fx-deny'), { once: true });
      return;
    } else if (save.gold >= h.price) {
      save.gold -= h.price;
      save.owned.push(h.id);
      save.selected = h.id;
      heroHop = performance.now();
      sfx('buy');
      celebrate(t);
    } else {
      toast(`還差 ${h.price - save.gold} 金幣才能解鎖`);
      t.classList.add('fx-deny');
      t.addEventListener('animationend', () => t.classList.remove('fx-deny'), { once: true });
      return;
    }
  } else if (t.dataset.diff) {
    save.difficulty = t.dataset.diff;
    const d = difficultyOf(save.difficulty);
    toast(`${d.name}：敵人血量 x${d.hp}、攻擊 x${d.atk}${d.count ? `、每波多 ${d.count} 隻` : ''}${d.traps ? `、${d.traps} 道陷阱門` : ''}，金幣 x${d.gold}`);
  } else if (t.id === 'ch-prev') save.chapter = Math.max(1, save.chapter - 1);
  else if (t.id === 'ch-next') save.chapter = Math.min(save.maxChapter, save.chapter + 1);
  else if (t.id === 'btn-mute') { save.muted = !save.muted; setMuted(save.muted); }
  else if (t.id === 'btn-changelog') { showChangelog(CHANGELOG, '更新日誌'); return; }
  else if (t.id === 'btn-settings') { openSettings(); return; }
  else if (t.id === 'btn-gear') { openGear(); return; }
  else if (t.id === 'btn-talent') { openTalent(); return; }
  else if (t.id === 'btn-mount') { openMount(); return; }
  else if (t.id === 'btn-stats') { statsTab = 0; openStats(); return; }
  else if (t.id === 'duo-main') duoPick = 'main';
  else if (t.id === 'duo-second') { duoPick = 'second'; toast('點一位英雄當副職業'); }
  else if (t.id === 'duo-clear') { save.second = null; duoPick = 'main'; }
  else if (t.id === 'btn-ach') { openAch(); return; }
  else if (t.id === 'btn-daily') { openDaily(); return; }
  else if (t.id === 'btn-endless') { openEndless(); return; }
  else if (t.id === 'btn-update') { checkUpdate(false); return; }
  else if (t.id === 'btn-start') { writeSave(save); startRun(); return; }
  else if (t.id === 'btn-install' && installEvt) { installEvt.prompt(); installEvt = null; }
  writeSave(save);
  renderHome();
  replayRelease(t);
});

// 整頁重畫後，按鈕是新的一顆；把「彈回來」動畫補在新按鈕上
function replayRelease(old) {
  const key = old.id ? '#' + old.id : old.dataset.hero ? `[data-hero="${old.dataset.hero}"]` : old.dataset.diff ? `[data-diff="${old.dataset.diff}"]` : null;
  const el = key && $('home-body').querySelector(key);
  if (!el) return;
  el.classList.add('fx-release');
  el.addEventListener('animationend', () => el.classList.remove('fx-release'), { once: true });
}

// ---------- 天賦網 ----------
// 有沒有任何天賦現在就能升級（首頁按鈕會亮）
const talentReady = () => TALENTS.some(n => !whyNot(save, n));
let talentSel = 'A0';

function openTalent() {
  if (save.talentRefund) {
    toast(`天賦網上線！舊的升級已退還 ${save.talentRefund} 金幣`);
    save.talentRefund = 0;
    writeSave(save);
  }
  renderTalent();
  showScreen('screen-talent', 'screen-home');
}

// 蜘蛛網：背景是 3 圈六角形＋外圈虛線，中間的線是格子之間的連線
function webSvg() {
  const hex = r => Array.from({ length: 6 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 3;
    return `${50 + Math.cos(a) * r * 100},${50 + Math.sin(a) * r * 100}`;
  }).join(' ');
  const links = LINKS.map(([a, b]) => {
    const A = talentById(a), B = talentById(b);
    return `<line data-link="${a}|${b}" x1="${A.x * 100}" y1="${A.y * 100}" x2="${B.x * 100}" y2="${B.y * 100}"/>`;
  }).join('');
  return `<svg class="web-bg" viewBox="0 0 100 100" aria-hidden="true">
    <polygon class="ring" points="${hex(0.155)}"/><polygon class="ring" points="${hex(0.28)}"/><polygon class="ring" points="${hex(0.4)}"/>
    <circle class="ring dash" cx="50" cy="50" r="46.5"/>
    <g class="links">${links}</g></svg>`;
}

function renderTalent() {
  const nodes = TALENTS.map(n => `<button class="tnode ${n.key ? 'key' : ''} ${n.id === 'core' ? 'core' : ''}" data-node="${n.id}" style="left:${n.x * 100}%;top:${n.y * 100}%;--tc:${n.color}" aria-label="${n.name}">
      ${iconTag(n.icon, n.key ? 22 : 18)}<i class="tlv"></i></button>`).join('');
  $('talent-body').innerHTML = `
    <h2>天賦網</h2>
    <div class="talent-top">
      <div class="pill" id="talent-gold">${iconTag(ICON.gold, 18)} <b>${fmt(save.gold)}</b></div>
      <small>已點 <b id="talent-pts">${totalPoints(save)}</b> 點<br>每多點一點，全部變貴 4%</small>
    </div>
    <div class="tweb">${webSvg()}${nodes}</div>
    <div class="tdetail" id="tdetail"></div>
    <div class="row">
      <button class="btn small ghost" id="btn-talent-reset">重置（全額退還）</button>
      <button class="btn small" id="btn-talent-close">關閉</button>
    </div>`;
  updateTalent();
}

// 只更新狀態（升級按鈕可以按住連點，不能被換掉）
function updateTalent(changed) {
  $('talent-gold').querySelector('b').textContent = fmt(save.gold);
  $('talent-pts').textContent = totalPoints(save);
  document.querySelectorAll('.tnode').forEach(el => {
    const n = talentById(el.dataset.node);
    const lv = tLv(save, n.id);
    el.classList.toggle('on', lv > 0);
    el.classList.toggle('max', lv >= n.max && n.id !== 'core');
    el.classList.toggle('reach', lv === 0 && canReach(save, n));
    el.classList.toggle('can', !whyNot(save, n));
    el.classList.toggle('sel', n.id === talentSel);
    el.querySelector('.tlv').textContent = n.id === 'core' ? '' : n.max > 1 ? `${lv}/${n.max}` : lv ? '★' : '';
    if (n.id === changed) pop(el);
  });
  document.querySelectorAll('[data-link]').forEach(l => {
    const [a, b] = l.dataset.link.split('|');
    l.classList.toggle('lit', tLv(save, a) > 0 && tLv(save, b) > 0);
    l.classList.toggle('half', (tLv(save, a) > 0) !== (tLv(save, b) > 0));
  });
  const n = talentById(talentSel);
  const lv = tLv(save, n.id);
  const why = whyNot(save, n);
  const det = $('tdetail');
  if (det.dataset.node !== n.id) {
    det.dataset.node = n.id;
    det.innerHTML = `<span class="td-ic" style="--tc:${n.color}">${iconTag(n.icon, 30)}</span>
      <span class="td-info"><b>${n.name}${n.key ? ' <i class="tag key">核心</i>' : n.branch ? ` <i class="tag" style="--tc:${n.color}">${n.branch.name}</i>` : ''}</b>
        <small class="td-now"></small><small class="td-next"></small></span>
      ${n.id === 'core' ? '' : `<button class="btn small" id="btn-tbuy" data-repeat>${iconTag(ICON.gold, 16)}<span class="cost"></span></button>`}`;
  }
  det.querySelector('.td-now').textContent = n.id === 'core' ? n.fmt() : lv ? `目前 Lv.${lv}/${n.max}：${talentDesc(save, n)}` : `尚未點亮（最高 ${n.max} 級）`;
  det.querySelector('.td-next').textContent = n.id === 'core' ? '從這裡往外點亮天賦' : lv >= n.max ? '已經滿級 ★' : `下一級：${talentDesc(save, n, lv + 1)}`;
  const b = $('btn-tbuy');
  if (b) {
    b.querySelector('.cost').textContent = lv >= n.max ? 'MAX' : talentCost(save, n);
    setOff(b, !!why, why);
  }
}

$('talent-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  if (t.dataset.node) {
    talentSel = t.dataset.node;
    sfx('tap');
    updateTalent();
  } else if (t.id === 'btn-tbuy') {
    const n = talentById(talentSel);
    if (buyTalent(save, n)) {
      sfx('buy');
      writeSave(save);
      const el = document.querySelector(`.tnode[data-node="${n.id}"]`);
      if (tLv(save, n.id) >= n.max) { celebrate(el, n.key ? '#fff2a8' : '#ffd84a'); if (n.key) banner(`核心天賦：${n.name}！`); }
      updateTalent(n.id);
      pop($('talent-gold'));
    }
  } else if (t.id === 'btn-talent-reset') {
    sfx('tap');
    if (!totalPoints(save)) { toast('還沒有點任何天賦'); return; }
    if (t.dataset.confirm) {
      const g = resetTalents(save);
      writeSave(save);
      toast(`天賦已重置，退還 ${g} 金幣`);
      renderTalent();
    } else {
      t.dataset.confirm = '1';
      t.textContent = '再按一次確認重置';
    }
  } else if (t.id === 'btn-talent-close') {
    sfx('tap');
    renderHome();
    showScreen('screen-home');
  }
});

// ---------- 坐騎 ----------
function mountBtn() {
  const r = riding(save);
  const own = Object.keys(ensureMounts(save).owned).length;
  return `<button class="talent-btn mount-btn" id="btn-mount">${r ? iconTag(['ic', r.icon, r.color], 26) : iconTag(['ic', 371, '#8a7a9a'], 26)}<span><b>坐騎</b><small>${r ? `騎乘中：${r.name} Lv.${r.lv} ${'★'.repeat(r.star)}` : own ? '目前沒有騎乘' : '買一隻坐騎，一起去冒險'}</small></span><em>▶</em></button>`;
}
let mountSel = null;
function openMount() {
  mountSel = ensureMounts(save).ride || MOUNTS[0].id;
  renderMount();
  showScreen('screen-mount', 'screen-home');
}
function renderMount() {
  const ms = ensureMounts(save);
  const m = mountById(mountSel);
  const st = mountState(save, m.id);
  const riding_ = ms.ride === m.id;
  const list = MOUNTS.map(x => {
    const o = mountState(save, x.id);
    return `<button class="mcard ${x.id === mountSel ? 'sel' : ''} ${o ? '' : 'locked'} ${ms.ride === x.id ? 'riding' : ''}" data-mount="${x.id}" data-fx="tilt">
      ${iconTag(['ic', x.icon, o ? x.color : '#6a5a7a'], 34)}<small>${x.name}</small>
      ${o ? `<i>Lv.${o.lv} ${'★'.repeat(o.star)}</i>` : `<i class="price">${iconTag(ICON.gold, 12)}${x.price}</i>`}</button>`;
  }).join('');
  let body;
  if (!st) {
    body = `<div class="m-stats"><p>${statText(m, 1)}（Lv.1，之後每級成長）</p><p>坐騎技能「${m.skill}」：${m.skillDesc(1)}（每 ${m.cd} 秒）</p></div>
      <button class="btn big gift" id="btn-mbuy" ${offAttr(save.gold < m.price, `金幣不足，還差 ${m.price - save.gold}`)}>${iconTag(ICON.gold, 18)} ${m.price} 購買</button>`;
  } else {
    const cap = atCap(st);
    const need = expNeed(st.lv);
    body = `<div class="m-lv"><b>Lv.${st.lv}</b><small>/ ${lvCap(st.star)}</small><span class="stars">${'★'.repeat(st.star)}${'☆'.repeat(MAX_STAR - st.star)}</span></div>
      <div class="m-exp"><i style="width:${cap ? 100 : st.exp / need * 100}%"></i><span>${cap ? (st.star >= MAX_STAR ? '已經完全長大了！' : '等級到上限了，需要突破') : `經驗 ${st.exp} / ${need}`}</span></div>
      <div class="m-stats">
        <p>被動：<b>${statText(m, st.lv)}</b></p>
        <p>坐騎技能「${m.skill}」：${m.skillDesc(st.star)}（每 ${Math.max(4, m.cd - (st.star - 1))} 秒）</p>
        ${st.star < MAX_STAR ? `<p class="next">升到 ${st.star + 1} 星：${m.skillDesc(st.star + 1)}，冷卻 -1 秒</p>` : ''}
      </div>
      <div class="m-train">
        ${cap ? (st.star < MAX_STAR ? `<button class="btn gift" id="btn-mbreak" ${offAttr(save.gold < breakCost(st.star), `金幣不足，還差 ${breakCost(st.star) - save.gold}`)}>突破升星 ${iconTag(ICON.gold, 16)}${breakCost(st.star)}</button>` : '')
          : FEEDS.map(f => `<button class="btn small" data-feed="${f.id}" data-repeat ${offAttr(save.gold < f.gold, `金幣不足，還差 ${f.gold - save.gold}`)}>${f.name}<small>+${f.exp} 經驗・${iconTag(ICON.gold, 12)}${f.gold}</small></button>`).join('')}
      </div>
      <button class="btn ${riding_ ? 'ghost' : 'big'}" id="btn-mride">${riding_ ? '下來（不騎乘）' : '騎上牠出發'}</button>`;
  }
  $('mount-body').innerHTML = `
    <h2>坐騎</h2>
    <div class="pill" id="mount-gold">${iconTag(ICON.gold, 18)} <b>${fmt(save.gold)}</b></div>
    <div class="m-hero" style="--mc:${m.color}">${iconTag(['ic', m.icon, st ? m.color : '#6a5a7a'], 72)}<b>${m.name}${riding_ ? ' <i class="tag">騎乘中</i>' : ''}</b></div>
    ${body}
    <div class="mcards">${list}</div>
    <p class="hint">騎著坐騎去冒險，每完成一波 +6 經驗；也可以用飼料餵牠（按住連續餵）。</p>
    <button class="btn small ghost" id="btn-mount-close">關閉</button>`;
}
$('mount-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  const ms = ensureMounts(save);
  if (t.dataset.mount) { mountSel = t.dataset.mount; sfx('tap'); }
  else if (t.id === 'btn-mbuy') {
    if (buyMount(save, mountSel)) { sfx('buy'); celebrate(t, mountById(mountSel).color); banner(`獲得坐騎：${mountById(mountSel).name}！`); }
  } else if (t.dataset.feed) {
    const ups = feed(save, FEEDS.find(f => f.id === t.dataset.feed));
    if (ups < 0) return;
    sfx(ups ? 'wave' : 'buy');
    writeSave(save);
    // 按住連續餵：只更新數字，不整頁重畫（按鈕要留著）
    if (!ups && !atCap(mountState(save, ms.ride))) { updateMountNums(); return; }
    if (ups) toast(`${mountById(ms.ride).name} 升到 Lv.${mountState(save, ms.ride).lv}！`);
  } else if (t.id === 'btn-mbreak') {
    if (breakthrough(save)) { sfx('win'); celebrate(t, '#ffd84a'); banner(`突破成功：${'★'.repeat(mountState(save, ms.ride).star)}`); }
  } else if (t.id === 'btn-mride') {
    ms.ride = ms.ride === mountSel ? null : mountSel;
    sfx('tap');
  } else if (t.id === 'btn-mount-close') {
    sfx('tap'); writeSave(save); renderHome(); showScreen('screen-home'); return;
  }
  writeSave(save);
  renderMount();
});
function updateMountNums() {
  const st = mountState(save, ensureMounts(save).ride);
  $('mount-gold').querySelector('b').textContent = fmt(save.gold);
  const need = expNeed(st.lv);
  const bar = document.querySelector('.m-exp');
  bar.querySelector('i').style.width = st.exp / need * 100 + '%';
  bar.querySelector('span').textContent = `經驗 ${st.exp} / ${need}`;
  document.querySelectorAll('[data-feed]').forEach(b => {
    const f = FEEDS.find(x => x.id === b.dataset.feed);
    setOff(b, save.gold < f.gold, `金幣不足，還差 ${f.gold - save.gold}`);
  });
}

// ---------- 成就與統計 ----------
function openAch() {
  renderAch();
  showScreen('screen-ach', 'screen-home');
}
function renderAch() {
  const st = save.stats;
  // 可領取的排最上面，已領取的排最下面
  const rank = a => save.claimed.includes(a.id) ? 2 : achDone(save, a) ? 0 : 1;
  const rows = ACHIEVEMENTS.slice().sort((x, y) => rank(x) - rank(y)).map(a => {
    const cur = Math.min(a.goal, Math.floor(a.get(save)));
    const done = achDone(save, a);
    const claimed = save.claimed.includes(a.id);
    return `<div class="ach ${claimed ? 'claimed' : done ? 'ready' : ''}">
      <span class="ach-info"><b>${a.name}${HEROES.some(h => h.unlock === a.id) ? ' <i class="ach-hero">＋隱藏職業</i>' : ''}</b><small>${a.desc}</small>
        <span class="ach-bar"><i style="width:${cur / a.goal * 100}%"></i><em>${fmt(cur)} / ${fmt(a.goal)}</em></span></span>
      ${claimed ? '<span class="ach-ok">已領取</span>' : `<button class="btn small ${done ? 'gift' : ''}" data-claim="${a.id}" ${offAttr(!done, '還沒達成')}>${iconTag(ICON.gold, 14)}${a.gold}</button>`}
    </div>`;
  }).join('');
  $('ach-body').innerHTML = `
    <h2>成就</h2>
    <div class="stats-grid">
      <span><b>${st.runs}</b>冒險次數</span><span><b>${st.wins}</b>通關</span><span><b>${fmt(st.kills)}</b>擊敗</span>
      <span><b>${st.bosses}</b>魔王</span><span><b>${st.elites}</b>菁英</span><span><b>${fmt(st.coins)}</b>累計球幣</span>
    </div>
    <div class="ach-list">${rows}</div>
    <button class="btn" id="btn-ach-close">關閉</button>`;
}
$('ach-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  if (t.dataset.claim) {
    const a = ACHIEVEMENTS.find(x => x.id === t.dataset.claim);
    save.gold += a.gold;
    save.claimed.push(a.id);
    sfx('buy');
    celebrate(t, '#ffd84a');
    toast(`領取「${a.name}」：+${a.gold} 金幣`);
    writeSave(save);
    renderAch();
  } else if (t.id === 'btn-ach-close') {
    renderHome();
    showScreen('screen-home');
  }
});

// ---------- 無盡塔 ----------
function openEndless() {
  const recs = save.records || [];
  const rows = recs.map((r, i) => {
    const h = HEROES.find(x => x.id === r.hero) || HEROES[0];
    const h2 = r.hero2 && HEROES.find(x => x.id === r.hero2);
    return `<div class="rec ${i === 0 ? 'top' : ''}"><b>${i + 1}</b>${iconTag(['dg', h.sprite], 24)}${h2 ? iconTag(['dg', h2.sprite], 18) : ''}<span>${h.name.split(' ')[1]}${h2 ? '＋' + h2.name.split(' ')[1] : ''}・${difficultyOf(r.diff).name}</span><em>${r.wave} 層</em><small>${r.date.slice(5)}</small></div>`;
  }).join('');
  $('endless-body').innerHTML = `
    <h2>無盡塔</h2>
    <p class="hint">波數沒有上限。每 10 層出現魔王，打倒後進入下一章，敵人越來越強。使用目前的英雄與難度（${difficultyOf(save.difficulty).name}）。</p>
    <div class="recs">${rows || '<p class="hint">還沒有紀錄，挑戰看看！</p>'}</div>
    <button class="btn big gift" id="btn-endless-go">開始挑戰</button>
    <button class="btn ghost" id="btn-endless-close">關閉</button>`;
  showScreen('screen-endless', 'screen-home');
}
$('endless-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t) return;
  sfx('tap');
  if (t.id === 'btn-endless-go') { writeSave(save); startRun({ endless: true, chapter: 1 }); }
  else if (t.id === 'btn-endless-close') showScreen('screen-home');
});

// ---------- 每日挑戰 ----------
function openDaily() {
  const ch = todayChallenge(save);
  const done = dailyDone(save);
  $('daily-body').innerHTML = `
    <h2>每日挑戰</h2>
    <p class="daily-date">${ch.date}・第 ${ch.chapter} 章 ${chapterName(ch.chapter)}・簡單難度</p>
    <div class="mods">${ch.mods.map(m => `<div class="mod"><b>${MODS[m].name}</b><small>${MODS[m].desc}</small></div>`).join('')}</div>
    <p class="hint">使用目前選擇的英雄。每天第一次通關獎勵：${iconTag(ICON.gold, 14)}${dailyReward(ch)} 金幣＋一件史詩裝備</p>
    <button class="btn big ${done ? '' : 'gift'}" id="btn-daily-go">${done ? '再玩一次（今日獎勵已領取）' : '開始挑戰'}</button>
    <button class="btn ghost" id="btn-daily-close">關閉</button>`;
  showScreen('screen-daily', 'screen-home');
}
$('daily-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t) return;
  sfx('tap');
  if (t.id === 'btn-daily-go') {
    const ch = todayChallenge(save);
    writeSave(save);
    startRun({ daily: true, chapter: ch.chapter, mods: ch.mods });
  } else if (t.id === 'btn-daily-close') showScreen('screen-home');
});

// ---------- 裝備 ----------
function gearSummary() {
  const gear = ensureGear(save);
  const slots = Object.keys(SLOTS).map(slot => {
    const it = gear.items.find(x => x.id === gear.equip[slot]);
    return it ? `<span class="gs r${it.rarity}" style="--rc:${RARITIES[it.rarity].color}">${iconTag(itemIcon(it), 22)}</span>` : `<span class="gs empty">${SLOTS[slot].name}</span>`;
  }).join('');
  const m = mergeableCount(save);
  const fresh = freshCount(save);
  return `<b>背包</b>${slots}<small>${gear.items.length}/${MAX_ITEMS}${m ? `・可合成 ${m}` : ''}</small>${fresh ? `<b class="badge">${fresh}</b>` : ''}`;
}

let gearSel = null; // 目前點選的裝備 id
function openGear() {
  renderGear();
  showScreen('screen-gear', 'screen-home');
}
let gearTab = 'all', gearSort = 'rarity';
const bonusChips = b => [
  ['攻擊', b.atk && `+${Math.round(b.atk * 100)}%`, '#ff6b6b'], ['血量', b.hp && `+${Math.round(b.hp * 100)}%`, '#6dff8a'],
  ['暴擊', b.crit && `+${Math.round(b.crit * 100)}%`, '#ff9f43'], ['掉球', b.ball && `+${b.ball}`, '#36d6ff'],
  ['開局球幣', b.coin && `+${b.coin}`, '#ffd84a'], ['金幣', b.gold && `+${Math.round(b.gold * 100)}%`, '#ffd84a'],
].filter(c => c[1]).map(([n, v, c]) => `<span class="chip" style="--cc:${c}">${n} <b>${v}</b></span>`).join('') || '<span class="chip">還沒有穿裝備</span>';

function renderGear() {
  const gear = ensureGear(save);
  const worn = new Set(Object.values(gear.equip));
  const hero = HEROES.find(h => h.id === save.selected) || HEROES[0];
  // 紙娃娃：英雄站中間，三個欄位圍著
  const slotBtn = slot => {
    const it = equippedIn(save, slot);
    return `<button class="slot ${it ? 'r' + it.rarity : 'empty'} ${it && gearSel === it.id ? 'sel' : ''}" data-slot="${slot}" style="--rc:${it ? RARITIES[it.rarity].color : '#555'}">
      ${it ? iconTag(itemIcon(it), 30) : `<i>${SLOTS[slot].name}</i>`}<small>${it ? itemDesc(it) : '空'}</small></button>`;
  };
  let list = gear.items.filter(it => gearTab === 'all' || it.slot === gearTab);
  list = list.slice().sort(gearSort === 'new' ? (a, c) => c.id - a.id : (a, c) => c.rarity - a.rarity || a.slot.localeCompare(c.slot) || c.value - a.value);
  const cells = list.map(it => `
    <button class="item r${it.rarity} ${worn.has(it.id) ? 'worn' : ''} ${gearSel === it.id ? 'sel' : ''}" data-item="${it.id}" style="--rc:${RARITIES[it.rarity].color}" aria-label="${itemName(it)}">
      ${iconTag(itemIcon(it), 26)}${worn.has(it.id) ? '<em>E</em>' : it.fresh ? '<em class="new">新</em>' : ''}${!worn.has(it.id) && isBetter(save, it) ? '<b class="better">▲</b>' : ''}</button>`);
  // 空格也畫出來，一眼看出背包還剩多少
  const empties = gearTab === 'all' ? Math.max(0, MAX_ITEMS - gear.items.length) : (6 - list.length % 6) % 6;
  for (let i = 0; i < empties; i++) cells.push('<span class="item empty-cell"></span>');
  const sel = gear.items.find(x => x.id === gearSel);
  const m = mergeableCount(save);
  const tabs = [['all', '全部'], ['weapon', '武器'], ['armor', '防具'], ['charm', '飾品']].map(([k, n]) => {
    const c = k === 'all' ? gear.items.length : gear.items.filter(it => it.slot === k).length;
    return `<button class="gtab ${gearTab === k ? 'sel' : ''}" data-tab="${k}">${n}<small>${c}</small></button>`;
  }).join('');
  // 詳細：跟身上那件比較
  let detail = '<small class="hint">點一件裝備看詳細</small>';
  if (sel) {
    const cur = equippedIn(save, sel.slot);
    const same = cur && cur.id === sel.id;
    const cmp = !cur || same ? '' : sel.slot === 'charm' && cur.charm !== sel.charm ? `<small class="cmp">身上：${itemName(cur)}（${itemDesc(cur)}），效果不同</small>`
      : `<small class="cmp ${sel.value > cur.value ? 'better' : sel.value < cur.value ? 'worse' : ''}">身上：${itemDesc(cur)}　${sel.value > cur.value ? '▲ 更好' : sel.value < cur.value ? '▼ 較差' : '一樣'}</small>`;
    detail = `<span class="gd-ic" style="--rc:${RARITIES[sel.rarity].color}">${iconTag(itemIcon(sel), 34)}</span>
      <span class="gd-info"><b style="color:${RARITIES[sel.rarity].color}">${itemName(sel)} <i class="rar" style="--rc:${RARITIES[sel.rarity].color}">${RARITIES[sel.rarity].name}</i></b>
        <small>${SLOTS[sel.slot].name}：${itemDesc(sel)}</small>${cmp}</span>
      <span class="gd-btns">
        ${worn.has(sel.id) ? `<button class="btn small" id="btn-unequip" data-slot="${sel.slot}">卸下</button>` : `<button class="btn small gift" id="btn-equip">裝備</button>`}
        <button class="btn small ghost" id="btn-salvage" ${offAttr(worn.has(sel.id), '穿在身上的不能分解')}>分解 ${iconTag(ICON.gold, 12)}${RARITIES[sel.rarity].salvage}</button>
      </span>`;
  }
  const junk = gear.items.filter(it => it.rarity === 0 && !worn.has(it.id) && !isBetter(save, it)).length;
  $('gear-body').innerHTML = `
    <h2>背包</h2>
    <div class="doll">
      ${slotBtn('weapon')}
      <span class="doll-hero">${iconTag(['dg', hero.sprite], 56)}<small>${hero.name.split(' ')[1]}</small></span>
      ${slotBtn('armor')}
      ${slotBtn('charm')}
    </div>
    <div class="chips">${bonusChips(gearBonus(save))}</div>
    <div class="gtabs">${tabs}
      <button class="gsort" id="btn-gsort">${gearSort === 'new' ? '最新' : '稀有度'} ⇅</button></div>
    <div class="cap"><i style="width:${gear.items.length / MAX_ITEMS * 100}%" class="${gear.items.length >= MAX_ITEMS - 3 ? 'full' : ''}"></i><span>背包 ${gear.items.length} / ${MAX_ITEMS}${gear.items.length >= MAX_ITEMS - 3 ? '・快滿了，記得分解或合成' : ''}</span></div>
    <div class="items">${cells.join('') || '<p class="hint">還沒有裝備，打完一局就會掉落</p>'}</div>
    <div class="item-detail">${detail}</div>
    <div class="row">
      <button class="btn small" id="btn-merge" ${offAttr(!m, '需要 3 件同欄位、同稀有度的裝備')}>一鍵合成${m ? `（${m}）` : ''}</button>
      <button class="btn small ghost" id="btn-junk" ${offAttr(!junk, '沒有可以分解的普通裝備')}>分解普通${junk ? `（${junk}）` : ''}</button>
      <button class="btn small ghost" id="btn-gear-close">關閉</button>
    </div>`;
}
$('gear-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  const gear = ensureGear(save);
  if (t.dataset.item) {
    gearSel = +t.dataset.item;
    const it = gear.items.find(x => x.id === gearSel);
    if (it) it.fresh = false;
  } else if (t.dataset.tab) gearTab = t.dataset.tab;
  else if (t.id === 'btn-gsort') gearSort = gearSort === 'new' ? 'rarity' : 'new';
  else if (t.dataset.slot && t.classList.contains('slot')) {
    const id = gear.equip[t.dataset.slot];
    if (id) gearSel = id;
    else { gearTab = t.dataset.slot; toast(`顯示所有${SLOTS[t.dataset.slot].name}`); }
  } else if (t.id === 'btn-equip') { equip(save, gearSel); sfx('buy'); }
  else if (t.id === 'btn-unequip') unequip(save, t.dataset.slot);
  else if (t.id === 'btn-salvage') { const g = salvage(save, gearSel); toast(`分解獲得 ${g} 金幣`); gearSel = null; }
  else if (t.id === 'btn-junk') { const r = salvageJunk(save); toast(`分解 ${r.n} 件，獲得 ${r.g} 金幣`); sfx('buy'); }
  else if (t.id === 'btn-merge') {
    const made = mergeAll(save);
    save.stats.merged += made.length;
    save.stats.legendMerged += made.filter(x => x.rarity === 3).length;
    if (made.length) { sfx('wave'); banner(`合成 ${made.length} 件！`); gearSel = made[made.length - 1].id; }
  } else if (t.id === 'btn-gear-close') {
    for (const it of gear.items) it.fresh = false; // 看過了
    writeSave(save); renderHome(); showScreen('screen-home'); return;
  }
  writeSave(save);
  renderGear();
});

// ---------- 設定 ----------
let resetArmed = false;
function openSettings() {
  resetArmed = false;
  $('settings-body').innerHTML = settingsHtml();
  showScreen('screen-settings', 'screen-home');
}
// 拖動音量：即時套用，放開才存檔
$('settings-body').addEventListener('input', ev => {
  const key = ev.target.dataset.slider;
  if (!key) return;
  settings[key] = +ev.target.value / 100;
  $('val-' + key).textContent = ev.target.value + '%';
  applySettings();
});
$('settings-body').addEventListener('change', () => writeSave(save));
$('settings-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t) return;
  sfx('tap');
  if (t.dataset.toggle) {
    const key = t.dataset.toggle;
    settings[key] = !settings[key];
    t.classList.toggle('on', settings[key]);
    t.setAttribute('aria-checked', settings[key]);
    if (key === 'vibrate' && settings.vibrate) vibrate(30);
    writeSave(save);
  } else if (t.id === 'btn-replay-tutorial') {
    tutorial.reset();
    toast('下次開始冒險時會重新播放教學');
  } else if (t.id === 'btn-reset-save') {
    // 清除存檔要按兩次，避免手滑
    if (!resetArmed) {
      resetArmed = true;
      t.textContent = '再按一次確認清除';
      t.classList.remove('ghost');
      return;
    }
    localStorage.clear();
    location.reload();
  } else if (t.id === 'btn-settings-close') {
    writeSave(save);
    showScreen('screen-home');
  }
});

// ---------- 版本與更新 ----------
let updateInfo = null;      // 最近一次檢查到的網路版本資訊
let lastQuietCheck = 0;

// quiet = 進首頁時的自動檢查：不顯示「已是最新」，有新版本才亮紅點並提示
async function checkUpdate(quiet) {
  if (quiet && (!navigator.onLine || Date.now() - lastQuietCheck < 10 * 60 * 1000)) return;
  if (quiet) lastQuietCheck = Date.now();
  if (!quiet) toast('檢查更新中…');
  try {
    updateInfo = await fetchLatest();
  } catch (e) {
    if (!quiet) toast('無法連線，請稍後再試');
    return;
  }
  // 只切換紅點，不整頁重畫（玩家可能正按著某個按鈕）
  const ub = $('btn-update');
  if (ub) ub.classList.toggle('has-update', updateInfo.newer);
  if (updateInfo.newer) {
    if (quiet) toast(`發現新版本 v${updateInfo.version}，點右上角更新`);
    else showUpdateDialog();
  } else if (!quiet) {
    toast(`已經是最新版本 v${VERSION}`);
  }
}

function changelogHtml(list) {
  return list.map(v => `
    <div class="log">
      <div class="log-head"><b>v${v.version}</b><small>${v.date}</small>${v.version === VERSION ? '<span class="tag">目前版本</span>' : ''}</div>
      <ul>${v.notes.map(n => `<li>${n}</li>`).join('')}</ul>
    </div>`).join('');
}

function showChangelog(list, title) {
  $('info-body').innerHTML = `
    <h2>${title}</h2>
    <div class="logs">${changelogHtml(list)}</div>
    <button class="btn" id="btn-info-close">關閉</button>`;
  showScreen('screen-info', 'screen-home');
}

function showUpdateDialog() {
  const fresh = updateInfo.changelog.filter(v => compareVersion(v.version, VERSION) > 0);
  $('info-body').innerHTML = `
    <h2>發現新版本！</h2>
    <p>v${VERSION} → <b class="good">v${updateInfo.version}</b></p>
    <div class="logs">${changelogHtml(fresh)}</div>
    <button class="btn big gift" id="btn-do-update">立即更新</button>
    <button class="btn ghost" id="btn-info-close">稍後再說</button>
    <p class="hint">存檔（金幣、英雄、升級）會保留</p>`;
  showScreen('screen-info', 'screen-home');
}

$('info-body').addEventListener('click', async ev => {
  const t = ev.target.closest('button');
  if (!t) return;
  sfx('tap');
  if (t.dataset.stab) { statsTab = +t.dataset.stab; openStats(); return; }
  if (t.id === 'btn-info-close') {
    showScreen('screen-home');
  } else if (t.id === 'btn-do-update') {
    t.setAttribute('aria-disabled', 'true');
    t.textContent = '下載新版本中…';
    writeSave(save);
    try { await applyUpdate(); } catch (e) { location.reload(); }
  }
});

// ---------- 小工具 ----------
// keep = 同時保留顯示的另一個畫面（例如在首頁上方開彈窗）
function showScreen(id, keep) {
  for (const el of document.querySelectorAll('.screen')) {
    const show = el.id === id || el.id === keep;
    clearTimeout(el._leaveTimer);
    if (show) {
      el.classList.remove('hidden', 'leaving');
    } else if (!el.classList.contains('hidden') && el.classList.contains('overlay')) {
      // 彈窗關閉：先播淡出動畫再藏起來
      el.classList.add('leaving');
      el._leaveTimer = setTimeout(() => el.classList.add('hidden'), 160);
    } else {
      el.classList.add('hidden');
    }
  }
}
// 波次進度條：15 格，打過的填滿、目前這格閃爍、精英／魔王格有標記
function renderWaveBar(run) {
  // 無盡塔顯示目前這 10 層的進度
  const len = run.endless ? ENDLESS_CYCLE : MAX_WAVE;
  const wave = stageWave(run, run.wave);
  let html = '';
  for (let i = 1; i <= len; i++) {
    const kind = i === len ? 'boss' : i % 5 === 0 ? 'elite' : '';
    const st = i < wave ? 'done' : i === wave ? 'now' : '';
    html += `<i class="${kind} ${st}"></i>`;
  }
  $('wavebar').innerHTML = html;
}

function banner(text) {
  const b = $('banner');
  b.textContent = text;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
}
// 數字從 0 跑到目標值
function countUp(el, target) {
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / 900);
    el.textContent = '+' + fmt(Math.round(target * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function toast(text) {
  const b = $('toast');
  b.textContent = text;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
}
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

let installEvt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installEvt = e;
  if (!game.run) renderHome();
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------- 主迴圈 ----------
let lastT = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  dt *= game.speed;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

function draw() {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#120c24';
  ctx.fillRect(0, 0, game.W, game.H);
  if (!game.run) {
    drawHome();
    return;
  }
  battle.draw(ctx);
  board.draw(ctx, game.run.coins);
}

let heroHop = 0;
// 主畫面：上方是 2.5D 展示台（選中的英雄＋遠方霧中的魔王），下方金幣慢慢落下
const idle = Array.from({ length: 36 }, () => ({ x: Math.random() * 360, y: Math.random() * 800, v: 30 + Math.random() * 60 }));
function drawHome() {
  const def = HEROES.find(h => h.id === save.selected) || HEROES[0];
  const ch = CHAPTERS[(save.chapter - 1) % CHAPTERS.length];
  // 換英雄時跳一下
  const k = Math.min(1, (performance.now() - heroHop) / 450);
  const hop = k < 1 ? Math.sin(k * Math.PI) * 0.45 : 0;
  const hero = { def, mount: riding(save), x: 0, z: 5.6, scale: 1.35 + (k < 1 ? Math.sin(k * Math.PI) * 0.08 : 0), hurt: 0, lunge: 0, lift: hop, showcase: true };
  const teaser = [
    { sprite: MONSTERS[ch.boss].sprite, x: 2.7, z: 12, size: 1.85, kb: 0, lunge: 0, flash: 0, phase: 1, teaser: true },
    { sprite: MONSTERS[ch.enemies[0]].sprite, x: -1.6, z: 9, size: 0.75, kb: 0, lunge: 0, flash: 0, phase: 2, teaser: true },
    { sprite: MONSTERS[ch.enemies[1]].sprite, x: 2.4, z: 7.5, size: 0.75, kb: 0, lunge: 0, flash: 0, phase: 3, teaser: true },
  ];
  battle.drawWorld(ctx, save.chapter, hero, teaser);
  ctx.globalAlpha = 0.18;
  for (const b of idle) {
    b.y += b.v / 60;
    if (b.y > game.H + 10) { b.y = game.battleH; b.x = Math.random() * game.W; }
    if (b.y > game.battleH) drawIcon(ctx, 'pp', 151, b.x, b.y, 16);
  }
  ctx.globalAlpha = 1;
}

resize();
Promise.all([
  loadSprites(),
  document.fonts ? document.fonts.load('16px "Cubic11"').catch(() => {}) : null,
]).then(() => {
  $('hud-gem').innerHTML = iconTag(ICON.gem, 18);
  $('skills-ic').innerHTML = iconTag(['ic', 768], 20);
  initFeedback({ deny: toast, sound: sfx });
  goHome();
  requestAnimationFrame(frame);
});

// 方便測試用
window.__game = { game, board, battle, save };
window.__test = {
  // 直接獲得技能（測試用）
  give(id) {
    const sk = SKILLS.find(k => k.id === id);
    if (!sk || isMaxed(sk)) return false;
    gainSkill(sk);
    if (isMaxed(sk)) celebrateMax(sk, null);
    renderSkillBar();
    return true;
  },
  // 抽很多次商店，統計出現過的技能
  sample(n) {
    const seen = new Set();
    for (let i = 0; i < n; i++) { rollOffer(); game.run.offer.forEach(o => seen.add(o.sk.id)); }
    return [...seen];
  },
  // 讓商店第一張變成指定技能；技能已滿級就回傳 false
  offer(id) {
    const sk = SKILLS.find(k => k.id === id);
    if (isMaxed(sk)) return false;
    rollOffer();
    game.run.offer[0] = { sk, price: 10, bought: false };
    renderShop();
    return true;
  },
  reroll(render) { rollOffer(); if (render) renderShop(); },
};
