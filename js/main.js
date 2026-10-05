import { HEROES, SKILLS, STAR_PRICE, STAR_WEIGHT, UPGRADES, CHAPTERS, MAX_WAVE, upgradeCost } from './data.js';
import { loadSave, writeSave } from './save.js';
import { initAudio, setMuted, sfx, playMusic } from './audio.js';
import { Board, fmt } from './board.js';
import { Battle, createHero } from './battle.js';
import { loadSprites, iconTag, ICON, drawIcon } from './sprites.js';
import { VERSION, CHANGELOG, compareVersion } from './version.js';
import { fetchLatest, applyUpdate } from './update.js';
import { initFeedback, isOff, celebrate, pop } from './feedback.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
setMuted(save.muted);

const game = {
  W: 360, H: 640, battleH: 260,
  run: null, speed: 1, paused: false,
  onKill: e => onKill(e),
};
const board = new Board();
const battle = new Battle(game);

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
function startRun() {
  const def = HEROES.find(h => h.id === save.selected) || HEROES[0];
  game.run = {
    chapter: save.chapter, wave: 0,
    coins: save.up.coin * 40,
    hero: createHero(def, save),
    skills: [], levels: {}, phase: 'fight', revived: false,
    kills: 0, caught: 0, pegHits: 0, rerollCost: 10, offer: [],
  };
  board.reset(game.run);
  renderSkillBar();
  battle.reset();
  game.paused = false;
  showScreen(null);
  $('hud').classList.remove('hidden');
  $('hud-skills').classList.remove('hidden');
  nextWave();
}

function nextWave() {
  const run = game.run;
  run.wave++;
  run.phase = 'fight';
  if (run.wave > 1) run.hero.hp = Math.min(run.hero.maxHp, run.hero.hp + run.hero.maxHp * 0.15);
  if (run.hero.fullHealWave) run.hero.hp = run.hero.maxHp; // 強壯體魄滿級
  battle.startWave(run);
  const tag = run.wave === MAX_WAVE ? ' ' + iconTag(ICON.crown, 16) + '魔王' : run.wave % 5 === 0 ? ' ' + iconTag(ICON.warn, 16) + '精英' : '';
  $('hud-wave').innerHTML = `第 ${run.wave}/${MAX_WAVE} 波${tag}`;
  renderWaveBar(run.wave);
  playMusic(run.wave === MAX_WAVE ? 'boss' : run.chapter % 2 ? 'stage1' : 'stage2');
  if (run.wave > 1) sfx('wave');
  banner(run.wave === MAX_WAVE ? '魔王來襲！' : `第 ${run.wave} 波`);
}

function onKill(e) {
  const run = game.run;
  run.kills++;
  board.pour(run.hero.ballsPerKill * e.ballMul);
}

board.onCatch = (b, mult) => {
  const run = game.run;
  run.coins += b.v * mult;
  run.caught++;
  if (run.hero.def.id === 'archer' && run.caught % 20 === 0 && run.phase === 'fight') {
    battle.strikeFront(2.5, '球雨箭!', '#b6ff6d');
  }
};
board.onPeg = () => {
  const run = game.run;
  if (run.hero.def.id !== 'saw' || run.phase !== 'fight') return;
  run.pegHits++;
  if (run.pegHits % 12 === 0) battle.strikeFront(0.6, '鏈鋸!', '#ff9f43');
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
  if (!run) { battle.scene.update(dt); return; }
  const live = !game.paused && (run.phase === 'fight' || run.phase === 'settle');
  battle.update(game.paused ? 0 : dt, live && run.phase === 'fight');
  if (!live) return;
  board.update(dt);
  const shown = fmt(run.coins);
  if (shown !== lastCoinText) {
    $('hud-coins').textContent = shown;
    if (run.coins > lastCoins) bump($('hud-coin-pill'));
    lastCoinText = shown;
    lastCoins = run.coins;
  }

  if (run.phase === 'fight') {
    if (run.hero.hp <= 0) {
      run.hero.hp = 0;
      onDeath();
    } else if (battle.cleared()) {
      run.phase = 'settle';
    }
  } else if (run.phase === 'settle' && board.isEmpty()) {
    if (run.wave >= MAX_WAVE) endRun(true);
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

// 戰鬥畫面下方的技能列：點一下看說明
function renderSkillBar() {
  const run = game.run;
  $('hud-skills').innerHTML = run.skills.map(sk => {
    const lv = skillLv(sk);
    return `<button class="sk ${isMaxed(sk) ? 'max' : ''} ${sk.gold ? 'gold' : ''}" data-sk="${sk.id}" aria-label="${sk.name}">
      ${iconTag(sk.icon, 20)}<b>${isMaxed(sk) ? 'MAX' : sk.max ? lv : 'x' + lv}</b></button>`;
  }).join('');
}
$('hud-skills').addEventListener('click', ev => {
  const t = ev.target.closest('[data-sk]');
  if (!t) return;
  const sk = SKILLS.find(k => k.id === t.dataset.sk);
  const lv = skillLv(sk);
  const head = sk.max ? `${sk.name} Lv.${lv}/${sk.max}` : `${sk.name} x${lv}`;
  toast(`${head}：${sk.desc}${isMaxed(sk) ? '（滿級：' + sk.maxDesc + '）' : ''}`);
});

// 升到滿級：金色爆發＋橫幅＋滿級獎勵生效
function celebrateMax(sk, card) {
  const run = game.run;
  sk.maxApply(run.hero, run, board);
  run.hero.maxed = (run.hero.maxed || 0) + 1;
  banner(`${sk.name} 滿級！`);
  sfx('wave');
  if (card) {
    card.classList.add('maxed');
    celebrate(card, '#ffd84a');
    setTimeout(() => celebrate(card, '#fff6b0'), 180);
  }
  toast(`滿級獎勵：${sk.maxDesc}`);
}

function rollOffer() {
  const run = game.run;
  const picks = [];
  const pool = SKILLS.filter(sk => !isMaxed(sk)); // 滿級的技能不再出現
  while (picks.length < 3 && pool.length) {
    const total = pool.reduce((s, k) => s + STAR_WEIGHT[k.star], 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= STAR_WEIGHT[pool[idx].star]; if (r <= 0) break; }
    idx = Math.min(idx, pool.length - 1);
    const sk = pool.splice(idx, 1)[0];
    picks.push({ sk, price: Math.round(STAR_PRICE[sk.star] * Math.pow(1.17, run.wave - 1)), bought: false });
  }
  run.offer = picks;
}

function openShop() {
  const run = game.run;
  run.phase = 'shop';
  run.rerollCost = 10 + run.wave * 2;
  run.freeReroll = true;
  rollOffer();
  renderShop();
  showScreen('screen-shop');
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
    return `<div class="card star${sk.star} ${sk.gold ? 'gold' : ''} ${toMax ? 'to-max' : ''} ${o.bought ? 'bought' : ''} ${cant ? 'cant' : ''}" data-i="${i}" data-fx="tilt">
      <div class="card-icon">${iconTag(sk.icon, 44)}</div>
      <div class="card-name">${sk.name}</div>
      ${levelHtml(sk, lv)}
      <div class="card-desc">${sk.desc}</div>
      ${toMax ? `<div class="maxbonus">滿級獎勵<br>${sk.maxDesc}</div>` : ''}
      <div class="stars">${'★'.repeat(o.sk.star)}${'☆'.repeat(3 - o.sk.star)}</div>
      <button class="buy" data-i="${i}" ${offAttr(o.bought || cant, o.bought ? '這張已經買過了' : `球幣不足，還差 ${o.price - Math.floor(run.coins)}`)}>${o.bought ? '已獲得' : iconTag(ICON.gem, 16) + o.price}</button>
    </div>`;
  }).join('');
  $('shop-body').innerHTML = `
    <h2>選擇新技能</h2>
    <div class="pill" id="shop-coins">${iconTag(ICON.gem, 18)} <b>${fmt(run.coins)}</b></div>
    <div class="cards">${cards || '<p class="all-max">所有技能都已滿級！</p>'}</div>
    <div class="row">
      <button class="btn small" id="btn-reroll" ${offAttr(run.coins < run.rerollCost, '球幣不足，無法刷新')}>${iconTag(ICON.refresh, 16)} 刷新 ${iconTag(ICON.gem, 16)}${run.rerollCost}</button>
      <button class="btn small gift" id="btn-free" ${offAttr(!run.freeReroll, '這一波的免費刷新用完了')}>${iconTag(ICON.free, 16)} 免費刷新</button>
    </div>
    <button class="btn big" id="btn-next">下一波 ▶</button>
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
    o.sk.apply(run.hero, run, board);
    if (!run.levels[o.sk.id]) run.skills.push(o.sk);
    run.levels[o.sk.id] = skillLv(o.sk) + 1;
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
    run.rerollCost += 10;
    rollOffer();
    sfx('tap');
  } else if (t.id === 'btn-free') {
    // 正式版這裡接「激勵廣告」：看完廣告才給免費刷新
    run.freeReroll = false;
    rollOffer();
    sfx('tap');
  } else if (t.id === 'btn-next') {
    sfx('tap');
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
  if (win) gold += 150 * run.chapter;
  save.gold += gold;
  let unlocked = '';
  if (win && run.chapter === save.maxChapter) {
    save.maxChapter++;
    save.chapter = save.maxChapter;
    unlocked = `<p class="good">解鎖第 ${save.maxChapter} 章：${chapterName(save.maxChapter)}</p>`;
  }
  writeSave(save);
  if (win) sfx('win');
  $('result-body').innerHTML = `
    <h2>${iconTag(win ? ICON.trophy : ICON.skull, 28)} ${win ? '章節通關！' : '冒險結束'}</h2>
    <p>第 ${run.chapter} 章・完成 ${cleared}/${MAX_WAVE} 波・擊敗 ${run.kills} 隻</p>
    <div class="reward">${iconTag(ICON.gold, 32)} <b id="gold-count">+0</b></div>
    ${unlocked}
    <button class="btn big" id="btn-home">回到主畫面</button>`;
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
    run.hero.hp = run.hero.maxHp * 0.6;
    run.phase = 'fight';
    showScreen(null);
  } else if (t.id === 'btn-giveup') {
    endRun(false);
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
  $('hud-skills').classList.add('hidden');
  renderHome();
  showScreen('screen-home');
}

function renderHome() {
  const hero = HEROES.find(h => h.id === save.selected) || HEROES[0];
  const heroes = HEROES.map(h => {
    const own = save.owned.includes(h.id);
    return `<button class="hero ${h.id === save.selected ? 'sel' : ''} ${own ? '' : 'locked'}" data-hero="${h.id}" data-fx="tilt">
      ${iconTag(['dg', h.sprite], 48, 'hero-emoji')}
      <span class="hero-name">${h.name.split(' ')[1]}</span>
      ${own ? '' : `<span class="hero-price">${iconTag(ICON.gold, 14)}${h.price}</span>`}
    </button>`;
  }).join('');
  const ups = UPGRADES.map(u => {
    const lv = save.up[u.id];
    const cost = upgradeCost(lv);
    return `<div class="up">
      <span class="up-icon">${iconTag(u.icon, 28)}</span>
      <span class="up-text"><b>${u.name} <em data-lv="${u.id}">Lv.${lv}</em></b><small>${u.desc}</small></span>
      <button class="btn small" data-up="${u.id}" data-repeat ${offAttr(save.gold < cost, `金幣不足，還差 ${cost - save.gold}`)}>${iconTag(ICON.gold, 16)}<span class="cost">${cost}</span></button>
    </div>`;
  }).join('');
  const ch = CHAPTERS[(save.chapter - 1) % CHAPTERS.length];
  $('home-body').innerHTML = `
    <div class="home-stage">
      <div class="top-row">
        <div class="pill" id="home-gold">${iconTag(ICON.gold, 20)} <b>${fmt(save.gold)}</b></div>
        <span class="top-btns">
          <button class="icon-btn ${updateInfo && updateInfo.newer ? 'has-update' : ''}" id="btn-update" aria-label="檢查更新">${iconTag(ICON.refresh, 22)}</button>
          <button class="icon-btn" id="btn-mute" aria-label="音效開關">${iconTag(save.muted ? ICON.soundOff : ICON.soundOn, 22)}</button>
        </span>
      </div>
      <h1 class="logo">彈珠勇者</h1>
      <p class="sub">自動戰鬥 × 彈珠倍率 × 三選一技能</p>
      <div class="chapter">
        <button class="icon-btn" id="ch-prev" ${offAttr(save.chapter <= 1, '已經是第一章')}>◀</button>
        <div class="chapter-name"><small>第 ${save.chapter} 章</small><b>${chapterName(save.chapter)}</b></div>
        <button class="icon-btn" id="ch-next" ${offAttr(save.chapter >= save.maxChapter, '通關這一章才能解鎖下一章')}>▶</button>
      </div>
    </div>
    <div class="home-bottom">
      <div class="heroes">${heroes}</div>
      <div class="hero-info">
        <div class="hero-head"><b>${hero.name}</b><span class="tag">${hero.range > 100 ? '遠程' : '近戰'}</span></div>
        <div class="stats">
          <span id="stat-hp">${iconTag(ICON.heart, 14)} ${Math.round(hero.hp * (1 + 0.1 * save.up.hp))}</span>
          <span id="stat-atk">${iconTag(ICON.sword, 14)} ${(hero.atk * (1 + 0.1 * save.up.atk)).toFixed(1)}</span>
          <span>${iconTag(ICON.target, 14)} ${(1 / hero.interval).toFixed(1)}/秒</span>
        </div>
        <small class="passive">${iconTag(ICON.star, 14)} ${hero.passive}</small>
      </div>
      <div class="ups">${ups}</div>
      <button class="btn big start" id="btn-start">開始冒險 <small>${ch.name}</small></button>
      <button class="btn small ghost ${installEvt ? '' : 'hidden'}" id="btn-install">${iconTag(ICON.install, 16)} 安裝到手機</button>
      <p class="hint">${isIOS() && !isStandalone() ? 'iPhone：點 Safari「分享」→「加入主畫面」即可全螢幕離線玩' : ''}</p>
      <div class="version-row">
        <span>v${VERSION}</span>
        <button class="link" id="btn-changelog">更新日誌</button>
      </div>
    </div>`;
}

$('home-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  initAudio();
  sfx('tap');
  if (t.dataset.hero) {
    const h = HEROES.find(x => x.id === t.dataset.hero);
    if (save.owned.includes(h.id)) {
      if (save.selected !== h.id) heroHop = performance.now();
      save.selected = h.id;
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
  } else if (t.dataset.up) {
    // 升級：按住會連續升級，所以只更新數字，不整頁重畫
    const cost = upgradeCost(save.up[t.dataset.up]);
    if (save.gold >= cost) {
      save.gold -= cost;
      save.up[t.dataset.up]++;
      sfx('buy');
      writeSave(save);
      updateHome(t.dataset.up);
    }
    return;
  } else if (t.id === 'ch-prev') save.chapter = Math.max(1, save.chapter - 1);
  else if (t.id === 'ch-next') save.chapter = Math.min(save.maxChapter, save.chapter + 1);
  else if (t.id === 'btn-mute') { save.muted = !save.muted; setMuted(save.muted); }
  else if (t.id === 'btn-changelog') { showChangelog(CHANGELOG, '更新日誌'); return; }
  else if (t.id === 'btn-update') { checkUpdate(false); return; }
  else if (t.id === 'btn-start') { writeSave(save); startRun(); return; }
  else if (t.id === 'btn-install' && installEvt) { installEvt.prompt(); installEvt = null; }
  writeSave(save);
  renderHome();
  replayRelease(t);
});

// 首頁：升級時只更新數字（按鈕還被按著，不能被換掉）
function updateHome(changed) {
  const gold = $('home-gold');
  gold.querySelector('b').textContent = fmt(save.gold);
  pop(gold);
  for (const u of UPGRADES) {
    const cost = upgradeCost(save.up[u.id]);
    const b = document.querySelector(`[data-up="${u.id}"]`);
    b.querySelector('.cost').textContent = cost;
    setOff(b, save.gold < cost, `金幣不足，還差 ${cost - save.gold}`);
    const lv = document.querySelector(`[data-lv="${u.id}"]`);
    lv.textContent = 'Lv.' + save.up[u.id];
    if (u.id === changed) pop(lv);
  }
  const hero = HEROES.find(h => h.id === save.selected) || HEROES[0];
  $('stat-hp').lastChild.textContent = ' ' + Math.round(hero.hp * (1 + 0.1 * save.up.hp));
  $('stat-atk').lastChild.textContent = ' ' + (hero.atk * (1 + 0.1 * save.up.atk)).toFixed(1);
  pop($(changed === 'hp' ? 'stat-hp' : 'stat-atk'));
}

// 整頁重畫後，按鈕是新的一顆；把「彈回來」動畫補在新按鈕上
function replayRelease(old) {
  const key = old.id ? '#' + old.id : old.dataset.hero ? `[data-hero="${old.dataset.hero}"]` : null;
  const el = key && $('home-body').querySelector(key);
  if (!el) return;
  el.classList.add('fx-release');
  el.addEventListener('animationend', () => el.classList.remove('fx-release'), { once: true });
}

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
function renderWaveBar(wave) {
  let html = '';
  for (let i = 1; i <= MAX_WAVE; i++) {
    const kind = i === MAX_WAVE ? 'boss' : i % 5 === 0 ? 'elite' : '';
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
  const hero = { def, x: 0, z: 5.6, scale: 1.35 + (k < 1 ? Math.sin(k * Math.PI) * 0.08 : 0), hurt: 0, lunge: 0, lift: hop, showcase: true };
  const teaser = [
    { sprite: ch.boss, x: 2.7, z: 12, size: 1.55, kb: 0, lunge: 0, flash: 0, phase: 1, teaser: true },
    { sprite: ch.enemies[0], x: -1.6, z: 9, size: 0.75, kb: 0, lunge: 0, flash: 0, phase: 2, teaser: true },
    { sprite: ch.enemies[1], x: 2.4, z: 7.5, size: 0.75, kb: 0, lunge: 0, flash: 0, phase: 3, teaser: true },
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
  initFeedback({ deny: toast, sound: sfx });
  goHome();
  requestAnimationFrame(frame);
});

// 方便測試用
window.__game = { game, board, battle, save };
window.__test = {
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
