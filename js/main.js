import { HEROES, SKILLS, STAR_PRICE, STAR_WEIGHT, UPGRADES, CHAPTERS, MAX_WAVE, upgradeCost } from './data.js';
import { loadSave, writeSave } from './save.js';
import { initAudio, setMuted, sfx } from './audio.js';
import { Board, fmt } from './board.js';
import { Battle, createHero } from './battle.js';
import { spriteCss } from './sprites.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
setMuted(save.muted);

const game = {
  W: 360, H: 640, battleH: 260, groundY: 230,
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
  game.groundY = game.battleH - 34;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  canvas.style.width = r.width + 'px';
  canvas.style.height = r.height + 'px';
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  board.layout(game.battleH, game.H - 6, game.W);
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
  if (p.y > game.battleH - 20) {
    dragging = true;
    board.targetX = Math.max(14, Math.min(game.W - 14, p.x));
  }
});
window.addEventListener('pointermove', ev => {
  if (!dragging) return;
  board.targetX = Math.max(14, Math.min(game.W - 14, pointerX(ev).x));
});
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointercancel', () => { dragging = false; });
document.addEventListener('pointerdown', () => initAudio(), { once: true });

// ---------- 一局遊戲 ----------
function startRun() {
  const def = HEROES.find(h => h.id === save.selected) || HEROES[0];
  game.run = {
    chapter: save.chapter, wave: 0,
    coins: save.up.coin * 40,
    hero: createHero(def, save),
    skills: [], phase: 'fight', revived: false,
    kills: 0, caught: 0, pegHits: 0, rerollCost: 10, offer: [],
  };
  board.reset(game.run);
  battle.reset();
  game.paused = false;
  showScreen(null);
  $('hud').classList.remove('hidden');
  nextWave();
}

function nextWave() {
  const run = game.run;
  run.wave++;
  run.phase = 'fight';
  if (run.wave > 1) run.hero.hp = Math.min(run.hero.maxHp, run.hero.hp + run.hero.maxHp * 0.15);
  battle.startWave(run);
  const tag = run.wave === MAX_WAVE ? ' 👑 魔王' : run.wave % 5 === 0 ? ' ⚠️ 精英' : '';
  $('hud-wave').textContent = `第 ${run.wave}/${MAX_WAVE} 波${tag}`;
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

function update(dt) {
  const run = game.run;
  if (!run) return;
  const live = !game.paused && (run.phase === 'fight' || run.phase === 'settle');
  battle.update(game.paused ? 0 : dt, live && run.phase === 'fight');
  if (!live) return;
  board.update(dt);
  $('hud-coins').textContent = fmt(run.coins);

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
function rollOffer() {
  const run = game.run;
  const picks = [];
  const pool = SKILLS.slice();
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

function renderShop() {
  const run = game.run;
  const cards = run.offer.map((o, i) => {
    const cant = !o.bought && run.coins < o.price;
    return `<div class="card star${o.sk.star} ${o.bought ? 'bought' : ''} ${cant ? 'cant' : ''}" data-i="${i}">
      <div class="card-icon">${o.sk.icon}</div>
      <div class="card-name">${o.sk.name}</div>
      <div class="card-desc">${o.sk.desc}</div>
      <div class="stars">${'★'.repeat(o.sk.star)}${'☆'.repeat(3 - o.sk.star)}</div>
      <button class="buy" data-i="${i}" ${o.bought || cant ? 'disabled' : ''}>${o.bought ? '已購買' : '💎 ' + o.price}</button>
    </div>`;
  }).join('');
  $('shop-body').innerHTML = `
    <h2>選擇新技能</h2>
    <div class="pill">💎 ${fmt(run.coins)}</div>
    <div class="cards">${cards}</div>
    <div class="row">
      <button class="btn small" id="btn-reroll" ${run.coins < run.rerollCost ? 'disabled' : ''}>🔄 刷新 💎${run.rerollCost}</button>
      <button class="btn small gift" id="btn-free" ${run.freeReroll ? '' : 'disabled'}>🎁 免費刷新</button>
    </div>
    <button class="btn big" id="btn-next">下一波 ▶</button>
    <div class="owned">${run.skills.length ? '已獲得：' + run.skills.map(s => s.icon).join('') : '用接到的球幣購買技能，可以買不只一張'}</div>`;
}

$('shop-body').addEventListener('click', ev => {
  const run = game.run;
  const t = ev.target.closest('button');
  if (!t || t.disabled) return;
  if (t.classList.contains('buy')) {
    const o = run.offer[+t.dataset.i];
    if (o.bought || run.coins < o.price) return;
    run.coins -= o.price;
    o.bought = true;
    o.sk.apply(run.hero, run, board);
    run.skills.push(o.sk);
    sfx('buy');
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
      <button class="btn big gift" id="btn-revive">❤️ 復活一次</button>
      <button class="btn" id="btn-giveup">結算</button>
      <p class="hint">（正式版：看一段激勵廣告即可復活）</p>`;
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
    <h2>${win ? '🏆 章節通關！' : '💀 冒險結束'}</h2>
    <p>第 ${run.chapter} 章・完成 ${cleared}/${MAX_WAVE} 波・擊敗 ${run.kills} 隻</p>
    <div class="pill big">🪙 +${fmt(gold)}</div>
    ${unlocked}
    <button class="btn big" id="btn-home">回到主畫面</button>`;
  showScreen('screen-result');
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
  $('hud').classList.add('hidden');
  renderHome();
  showScreen('screen-home');
}

function renderHome() {
  const hero = HEROES.find(h => h.id === save.selected) || HEROES[0];
  const heroes = HEROES.map(h => {
    const own = save.owned.includes(h.id);
    return `<button class="hero ${h.id === save.selected ? 'sel' : ''} ${own ? '' : 'locked'}" data-hero="${h.id}">
      <span class="hero-emoji" style="${spriteCss(h.sprite, 48)}"></span>
      <span class="hero-name">${h.name.split(' ')[1]}</span>
      ${own ? '' : `<span class="hero-price">🪙 ${h.price}</span>`}
    </button>`;
  }).join('');
  const ups = UPGRADES.map(u => {
    const lv = save.up[u.id];
    const cost = upgradeCost(lv);
    return `<div class="up">
      <span class="up-icon">${u.icon}</span>
      <span class="up-text"><b>${u.name} Lv.${lv}</b><small>${u.desc}</small></span>
      <button class="btn small" data-up="${u.id}" ${save.gold < cost ? 'disabled' : ''}>🪙 ${cost}</button>
    </div>`;
  }).join('');
  $('home-body').innerHTML = `
    <div class="top-row">
      <div class="pill">🪙 ${fmt(save.gold)}</div>
      <button class="icon-btn" id="btn-mute">${save.muted ? '🔇' : '🔊'}</button>
    </div>
    <h1 class="logo">彈珠勇者</h1>
    <p class="sub">自動戰鬥 × 彈珠倍率 × 三選一技能</p>
    <div class="heroes">${heroes}</div>
    <div class="hero-info">
      <b>${hero.name}</b>
      <small>❤️ ${Math.round(hero.hp * (1 + 0.1 * save.up.hp))}　🗡️ ${(hero.atk * (1 + 0.1 * save.up.atk)).toFixed(1)}　🎯 ${hero.range > 100 ? '遠程' : '近戰'}</small>
      <small class="passive">✨ ${hero.passive}</small>
    </div>
    <div class="ups">${ups}</div>
    <div class="chapter">
      <button class="icon-btn" id="ch-prev" ${save.chapter <= 1 ? 'disabled' : ''}>◀</button>
      <div><b>第 ${save.chapter} 章</b><small>${chapterName(save.chapter)}</small></div>
      <button class="icon-btn" id="ch-next" ${save.chapter >= save.maxChapter ? 'disabled' : ''}>▶</button>
    </div>
    <button class="btn big" id="btn-start">開始冒險</button>
    <button class="btn small ghost ${installEvt ? '' : 'hidden'}" id="btn-install">📲 安裝到手機</button>
    <p class="hint">${isIOS() && !isStandalone() ? 'iPhone：點 Safari「分享」→「加入主畫面」即可全螢幕離線玩' : ''}</p>`;
}

$('home-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || t.disabled) return;
  initAudio();
  sfx('tap');
  if (t.dataset.hero) {
    const h = HEROES.find(x => x.id === t.dataset.hero);
    if (save.owned.includes(h.id)) save.selected = h.id;
    else if (save.gold >= h.price) {
      save.gold -= h.price;
      save.owned.push(h.id);
      save.selected = h.id;
      sfx('buy');
    } else {
      toast(`還差 🪙 ${h.price - save.gold} 才能解鎖`);
    }
  } else if (t.dataset.up) {
    const cost = upgradeCost(save.up[t.dataset.up]);
    if (save.gold >= cost) { save.gold -= cost; save.up[t.dataset.up]++; sfx('buy'); }
  } else if (t.id === 'ch-prev') save.chapter = Math.max(1, save.chapter - 1);
  else if (t.id === 'ch-next') save.chapter = Math.min(save.maxChapter, save.chapter + 1);
  else if (t.id === 'btn-mute') { save.muted = !save.muted; setMuted(save.muted); }
  else if (t.id === 'btn-start') { writeSave(save); startRun(); return; }
  else if (t.id === 'btn-install' && installEvt) { installEvt.prompt(); installEvt = null; }
  writeSave(save);
  renderHome();
});

// ---------- 小工具 ----------
function showScreen(id) {
  for (const el of document.querySelectorAll('.screen')) el.classList.toggle('hidden', el.id !== id);
}
function banner(text) {
  const b = $('banner');
  b.textContent = text;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
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
  ctx.fillStyle = '#120c24';
  ctx.fillRect(0, 0, game.W, game.H);
  if (!game.run) {
    drawIdle();
    return;
  }
  battle.draw(ctx);
  board.draw(ctx, game.run.coins);
}

// 主畫面背景：小球持續落下
const idle = Array.from({ length: 40 }, () => ({ x: Math.random() * 360, y: Math.random() * 800, v: 40 + Math.random() * 80 }));
function drawIdle() {
  ctx.fillStyle = '#ffd84a';
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  for (const b of idle) {
    b.y += b.v / 60;
    if (b.y > game.H + 10) { b.y = -10; b.x = Math.random() * game.W; }
    ctx.moveTo(b.x + 5, b.y);
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

resize();
goHome();
requestAnimationFrame(frame);

// 方便測試用
window.__game = { game, board, battle, save };
