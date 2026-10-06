import { HEROES, MONSTERS, SKILLS, CATS, skillCat, skillAllowed, heroCls, STAR_PRICE, STAR_WEIGHT, CHAPTERS, MAX_WAVE, ENDLESS_CYCLE, isBossWave, stageWave } from './data.js';
import { TALENTS, LINKS, talentById, ensureTalents, tLv, talentCost, whyNot, buyTalent, resetTalents, talentBonus, talentDesc, totalPoints, canReach, infPoints, mastered, bonusLines, BRANCHES as T_BRANCHES, effText } from './talent.js';
import { shareResult } from './share.js';
import { statsHtml, refreshStats, dps } from './stats.js';
import { MOUNTS, FEEDS, MAX_STAR, mountById, ensureMounts, mountState, expNeed, lvCap, breakCost, atCap, buyMount, feed, breakthrough, rideExp, riding, statText as mountStatText, isMaxMount } from './mount.js';
import { loadSave, writeSave } from './save.js';
import { ensureProgress, maxCh, diffUnlocked, unlockText, balChapter, anyChapter, clearChapter } from './progress.js';
import { savePower, recommended, powerBand } from './power.js';
import * as eco from './economy.js';
import * as heroP from './heroes.js';
import * as gacha from './gacha.js';
import * as bondsM from './bonds.js';
import * as modes from './modes.js';
import * as camp from './campaign.js';
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
import { grantItem, ensureGear, gearBonus, rollDrops, itemName, itemDesc, itemIcon, RARITIES, SLOTS, TYPES, STATS, MAX_ITEMS, MAX_PLUS, MAX_RARITY, JEWEL_SKILLS, JEWEL_MAX_LV, REFINE_SHARDS, equip, unequip, salvage, mergeAll, mergeableCount, equippedIn, isBetter, isWorn, salvageJunk, freshCount, statText, mainValue, enhance, enhanceCost, enhanceRate, enchant, enchantCost, refine, jewelPower, jewelTier, jewelExpNeed, jewelRideExp, targetSlot, SETS, UNIQUES, gearPower, GEMS, GEM_MAX, gemTag, gemName, gemValue, parseGem, gemDrops, socketGem, unsocketGem, mergeGems, reforge, reforgeCost, CRAFT_TIERS, craft, savePreset, loadPreset, fuse, whyNoFuse, fuseFodder, fuseGold, starMax, transferPlus, transferDonor, TRANSFER_SHARDS, HEIRLOOMS } from './gear.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
loadSettings(save);
ensureMeta(save);
ensureTalents(save);
ensureMounts(save);
ensureProgress(save);
eco.ensureEconomy(save);
heroP.ensureHeroes(save);
gacha.ensureGacha(save);
eco.rollDay(save);
eco.welcomeMails(save, VERSION, save.progress);
// 選到還沒解鎖的難度（舊存檔）就退回休閒
if (!diffUnlocked(save, difficultyOf(save.difficulty))) save.difficulty = 'casual';
save.chapter = Math.min(save.chapter, maxCh(save));
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
game.board = board; // 怪物投石要卡住倍率門
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
  // 首頁：展示台佔畫面 3/4，下面留給難度、職業、開始按鈕（太矮的手機至少留 196px）
  const stagePx = Math.max(r.height * 0.58, Math.min(r.height * 0.75, r.height - 196));
  game.homeStage = stagePx / scale;
  game.homeStagePx = stagePx;
  document.documentElement.style.setProperty('--home-stage', stagePx + 'px');
  document.documentElement.style.setProperty('--app-h', r.height + 'px');
  document.documentElement.style.setProperty('--collapse-dist', (stagePx - game.battleH * scale) + 'px');
  onHomeScroll();
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
  const spec = opts.spec || null; // 3.7 挑戰模式（副本、魔王連戰、試煉塔）
  const chapter = spec && spec.chapterOf ? spec.chapterOf(1) : opts.chapter || save.chapter;
  const mods = {};
  for (const m of opts.mods || []) mods[m] = true;
  const tb = talentBonus(save);
  const bonds = bondsM.computeBonds(defs, defs.map(d => heroP.heroStar(save, d.id)));
  const bondCoins = bondsM.applyBonds(heroes, bonds);
  game.run = {
    chapter, wave: 0, daily: !!opts.daily, endless: !!opts.endless, mods,
    coins: tb.coin + gearBonus(save).coin + bondCoins, tb, bonds,
    hero: heroes[0], heroes, switchCd: 0, bare: defs.map(bareHero),
    heroIds: defs.map(d => d.id), heroCls: [...new Set(defs.flatMap(heroCls))],
    skills: [], levels: {}, phase: 'fight', revived: false,
    kills: 0, caught: 0, pegHits: 0, rerollCost: 10, offer: [],
    diff: difficultyOf(spec && spec.diffId ? spec.diffId : opts.daily ? 'easy' : save.difficulty), // 難度
    rules: boardOf(chapter),               // 這一章的彈珠台與特殊規則
  };
  if (spec) { Object.assign(game.run, spec); game.run.coins += spec.startCoins || 0; }
  // 每日挑戰「玻璃大砲」
  if (mods.glass) {
    for (const h of heroes) {
      h.baseAtk *= 1.6;
      h.maxHp *= 0.6;
      h.hp = h.maxHp;
    }
  }
  battle.layout(game.W, 0, game.battleH); // 首頁的展示台比較高，換回戰鬥用的高度
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
  if (spec && spec.preShop) { renderWaveBar(game.run); openShop(); } // 3.7 副本、魔王連戰：開打前先買技能
  else nextWave();
  tutorial.onRunStart();
  // 開場提示這一章的特殊規則
  const intro = spec ? spec.label(1) : opts.daily ? `每日挑戰｜${opts.mods.map(m => MODS[m].name).join('、')}` : `${CHAPTERS[(chapter - 1) % CHAPTERS.length].name}｜${game.run.rules.rule}`;
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
  if (run.hpOf) run.modeHp = run.hpOf(run.wave); // 魔王連戰：一隻比一隻強
  // 試煉塔：每 10 層換一章
  if (run.chapterOf) {
    const c = run.chapterOf(run.wave);
    if (c !== run.chapter) { run.chapter = c; run.rules = boardOf(c); board.setChapter(c); }
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
  $('hud-wave').innerHTML = run.label ? run.label(run.wave) + tag : run.endless ? `無盡塔 第 ${run.wave} 層${tag}` : `第 ${run.wave}/${MAX_WAVE} 波${tag}`;
  renderWaveBar(run);
  // 每章有自己的音樂；魔王關等魔王登場才切成魔王音樂
  playMusic(CHAPTERS[(run.chapter - 1) % CHAPTERS.length].music);
  if (run.wave > 1) sfx('wave');
  banner(boss ? '魔王來襲！' : run.floorOf ? `第 ${run.floorOf(run.wave)} 層` : run.endless ? `第 ${run.wave} 層` : `第 ${run.wave} 波`);
  renderSwitch();
}

function onKill(e) {
  const run = game.run;
  run.kills++;
  // 裝備可能給小數的掉球數：小數部分用機率決定多不多掉一顆
  // 統計
  save.stats.kills++;
  eco.track(save, 'kill');
  if (e.kind === 'boss') { save.stats.bosses++; eco.track(save, 'boss'); }
  else if (e.kind !== 'normal') save.stats.elites++;
  // 盜賊王：擊敗直接拿球幣
  if (run.hero.stealCoins) run.coins += run.hero.stealCoins * (run.hero.stealBig && e.kind !== 'normal' ? 10 : 1);
  if (run.hero.bounty && e.kind !== 'normal') board.pour(run.hero.bounty); // 傳說特效「賞金」
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
    <span>攻速 <b>${(h.spdMul / h.interval).toFixed(2)}</b></span><span>暴擊 <b>${Math.round(Math.min(0.75, h.crit) * 100)}%</b></span>
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
    <p class="st-head">${iconTag(heroRef(def), 28)} <b>${def.name}</b></p>
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
  $('switch-ic').innerHTML = iconTag(heroRef(bench.def), 26);
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
  const gain = b.v * mult * (run.mods.rich ? 1.5 : 1) * (1 + (run.hero.greed || 0));
  run.coins += gain;
  save.stats.coins += gain;
  run.caught++;
  const h = run.hero;
  if (h.def.id === 'archer' && run.caught % h.arrowNeed === 0 && run.phase === 'fight') {
    for (let k = 0; k < h.arrowCount; k++) battle.strikeFront(2.5, '球雨箭!', '#b6ff6d', 'arrow');
  }
  // 星辰賢者：星落
  if (h.def.id === 'sage' && run.caught % h.starNeed === 0 && run.phase === 'fight') {
    for (let k = 0; k < h.starCount; k++) setTimeout(() => game.run && game.run.phase === 'fight' && battle.blast(h.starMul, k ? '' : '星落!', '#c8b6ff', { crit: h.starCrit, style: 'meteor' }), k * 200);
  }
};
board.onGoldPeg = p => {
  const run = game.run;
  if (!run || run.phase !== 'fight') return;
  run.coins += 1;
  board.pops.push({ x: p.x, y: p.y - 12, text: '+1', life: 0.5, color: '#ffd84a' });
};
board.onPeg = () => {
  const run = game.run;
  if (run.hero.def.id !== 'saw' || run.phase !== 'fight') return;
  run.pegHits++;
  if (run.pegHits % run.hero.sawNeed === 0) battle.strikeFront(run.hero.sawMul, '鏈鋸!', '#ff9f43', 'saw');
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
    if (run.hero.hp <= 0 && run.hero.undyingReady) {
      // 傳說特效「不屈」：每波第一次致命傷保留 1 點血
      run.hero.undyingReady = false;
      run.hero.hp = 1;
      battle.text(run.hero.x, run.hero.z, 1.5, '不屈!', '#ffd84a', 16);
    } else if (run.hero.hp <= 0 && run.hero.phoenix) {
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
    if (!run.endless && run.wave >= (run.maxWave || MAX_WAVE)) endRun(true);
    else if (!run.mode && EVENT_WAVES.includes(stageWave(run, run.wave))) openEvent();
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
    ${run.heroes.map(x => `<p class="hero-pass ${x === h ? '' : 'bench'}">${iconTag(heroRef(x.def), 24)} ${x.def.passive}</p>`).join('')}
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
  const lv = skillLv(sk) + 1; // 這次升到第幾級
  forHeroes(sk, (h, b) => sk.apply(h, run, b, lv));
  if (!run.levels[sk.id]) run.skills.push(sk);
  run.levels[sk.id] = lv;
  updateGlory();
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

// 光環：3 星技能滿級越多，金光越亮；能買的技能全部滿級 → 長出翅膀
function updateGlory() {
  const run = game.run;
  const pool = SKILLS.filter(sk => sk.max && skillAllowed(sk, run));
  const gold = run.skills.filter(sk => sk.star === 3 && isMaxed(sk)).length;
  const wings = pool.length > 0 && pool.every(isMaxed);
  if (wings && !run.wings) { banner('全技能滿級・天使降臨！'); sfx('win'); vibrate([80, 60, 160]); }
  else if (gold > (run.gold3 || 0)) toast(`3 星技能滿級 ${gold} 個：金光${gold >= 3 ? '耀眼' : '加強'}！`);
  run.gold3 = gold;
  run.wings = wings;
  for (const h of run.heroes) { h.glow = gold; h.wings = wings; }
}

// 升到滿級：金色爆發＋橫幅＋滿級獎勵生效
function celebrateMax(sk, card) {
  const run = game.run;
  forHeroes(sk, (h, b) => sk.maxApply(h, run, b));
  for (const h of run.heroes) h.maxed = (h.maxed || 0) + 1;
  save.stats.maxed++;
  banner(`${sk.name} 滿級！`);
  sfx('maxup');
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
    // 價格：星數基本價 x 波數成長 x 難度 x（等級越高越貴：每升一級再乘 lvGrow 倍，難度越高倍數越大）
    const lvMul = Math.pow(run.diff.lvGrow || 1.5, skillLv(sk)) * (1 - (run.hero.scholar || 0)); // 傳說特效「學者」
    picks.push({ sk, price: Math.round(STAR_PRICE[sk.star] * Math.pow(1.17, run.wave - 1) * run.diff.price * lvMul * (run.shopDiscount || 1) * (1 - run.tb.price)), bought: false });
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
  run.rerollsLeft = run.diff.rerolls; // 這一波最多刷新幾次（免費的也算），休閒不限
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
  setOff($('btn-reroll'), run.coins < run.rerollCost || run.rerollsLeft <= 0, run.rerollsLeft <= 0 ? '這一波的刷新次數用完了' : '球幣不足，無法刷新');
  $('shop-owned').innerHTML = '已獲得：' + ownedSummary();
  // 買完技能，數值立刻更新並閃一下
  const st = $('shop-stats');
  const html = shopStats();
  if (st.innerHTML !== html) { st.innerHTML = html; st.classList.remove('flash'); void st.offsetWidth; st.classList.add('flash'); }
}

// 商店下方：目前上場角色的主要數值
function shopStats() {
  const h = game.run.hero;
  return `<span>${iconTag(ICON.heart, 12)}${fmt(Math.max(0, h.hp))}/${fmt(h.maxHp)}</span><span>${iconTag(ICON.sword, 12)}${fmtNum(heroAtkOf(h))}</span><span>秒傷 ${fmtNum(dps(h))}</span><span>攻速 ${(h.spdMul / h.interval).toFixed(2)}</span><span>暴擊 ${Math.round(Math.min(0.75, h.crit) * 100)}%</span><span>次數 x${h.hits}</span>`;
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
      ${lv > 0 ? `<div class="lvcost">升級加價 x${Math.round(Math.pow(run.diff.lvGrow || 1.5, lv) * 10) / 10}</div>` : ''}
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
    <p class="reroll-left ${run.rerollsLeft <= 1 && run.rerollsLeft !== Infinity ? 'low' : ''}">${run.rerollsLeft === Infinity ? '刷新次數：不限' : `這一波還能刷新 ${run.rerollsLeft} / ${run.diff.rerolls} 次（含免費）`}</p>
    <div class="row">
      <button class="btn small" id="btn-reroll" ${offAttr(run.coins < run.rerollCost || run.rerollsLeft <= 0, run.rerollsLeft <= 0 ? '這一波的刷新次數用完了' : '球幣不足，無法刷新')}>${iconTag(ICON.refresh, 16)} 刷新 ${iconTag(ICON.gem, 16)}${run.rerollCost}</button>
      <button class="btn small gift" id="btn-free" ${offAttr(!run.freeReroll || run.rerollsLeft <= 0, run.rerollsLeft <= 0 ? '這一波的刷新次數用完了' : '這一波的免費刷新用完了')}>${iconTag(ICON.free, 16)} 免費刷新${run.freeReroll > 1 ? ' x' + run.freeReroll : ''}</button>
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
    eco.track(save, 'skill');
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
    if (run.rerollsLeft <= 0) return;
    run.coins -= run.rerollCost;
    run.rerollsLeft--;
    run.rerollCost += Math.round(10 * (1 - run.tb.rerollDisc));
    rollOffer();
    sfx('tap');
  } else if (t.id === 'btn-free') {
    // 正式版這裡接「激勵廣告」：看完廣告才給免費刷新
    if (run.rerollsLeft <= 0) return;
    run.freeReroll--;
    run.rerollsLeft--;
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

// 3.7 挑戰模式結算
function endModeRun(win) {
  const run = game.run;
  const cleared = win ? run.maxWave : run.wave - 1;
  const gold = Math.round(cleared * 25 * run.chapter * run.diff.gold);
  save.gold += gold;
  let title = '', sub = '', lines = [];
  if (run.mode === 'dungeon') {
    const { id, t } = run.dungeon, dg = modes.DUNGEONS[id];
    title = win ? `${dg.name} 通關！` : `${dg.name} 失敗`;
    sub = `${modes.tierName(t)}・完成 ${cleared}/5 波`;
    if (win) {
      lines = modes.giveDungeon(save, id, t, run.chapter);
      save.dungeon.best[id] = Math.max(save.dungeon.best[id] || 0, t);
      lines.push('這一階之後可以「掃蕩」直接拿獎勵');
      eco.track(save, 'daily');
    } else lines = ['沒有通關不給副本獎勵（次數已經用掉）'];
  } else if (run.mode === 'side') {
    const { ch, k } = run.side;
    title = win ? `${camp.SIDES[k].name} 通關！` : `${camp.SIDES[k].name} 失敗`;
    sub = `第 ${ch} 章・完成 ${cleared}/${run.maxWave} 波`;
    lines = win ? camp.sideReward(save, run.diff.id, ch, k) || ['這個支線已經領過獎勵了'] : ['再挑戰一次吧'];
  } else if (run.mode === 'rush') {
    title = win ? '魔王連戰 全破！' : '魔王連戰結束';
    sub = `打倒 ${cleared}/5 隻魔王`;
    const gem = modes.rushReward(save, cleared);
    lines = [gem ? `本週新紀錄：+${gem} 寶石、+${gem / 2} 星塵` : `本週最佳 ${save.rush.best}/5（打倒更多隻才有新獎勵）`];
  } else if (run.mode === 'trial') {
    const reached = run.trialStart + cleared - 1;
    title = win ? '試煉塔 登頂！' : '試煉塔結束';
    sub = cleared ? `爬到第 ${reached} 層` : `第 ${run.trialStart} 層就倒下了`;
    const r = modes.trialReward(save, reached);
    lines = [r.gold || r.gem || r.heroTicket || r.gearTicket ? `新層數獎勵：${eco.giftText(r)}` : `最高紀錄 ${save.trial.floor} 層（爬得更高才有新獎勵）`, `下次從第 ${modes.trialStart(save)} 層開始`];
  }
  const jUps = jewelRideExp(save, cleared);
  rideExp(save, cleared);
  eco.track(save, 'run');
  writeSave(save);
  if (win) { sfx('win'); setTimeout(() => playMusic('victory'), 900); }
  $('result-body').innerHTML = `
    <h2>${iconTag(win ? ICON.trophy : ICON.skull, 28)} ${title}</h2>
    <p>${sub}・擊敗 ${run.kills} 隻</p>
    <div class="reward">${iconTag(ICON.gold, 32)} <b id="gold-count">+0</b></div>
    ${lines.map(l => `<p class="good">${l}</p>`).join('')}
    ${jUps.map(j => `<p class="ride-exp">${iconTag(itemIcon(j.it), 18)} ${itemName(j.it)} 升到 Lv.${j.it.jlv}</p>`).join('')}
    <button class="btn big" id="btn-home">回到主畫面</button>`;
  $('result-body').className = 'panel center ' + (win ? 'win' : 'lose');
  showScreen('screen-result');
  countUp($('gold-count'), gold);
}

function endRun(win) {
  const run = game.run;
  run.phase = 'over';
  if (run.mode) return endModeRun(win);
  const cleared = win ? MAX_WAVE : run.wave - 1;
  let gold = cleared * 10 * run.chapter + Math.floor(run.coins / 5);
  gold = Math.round(gold * run.diff.gold);
  if (win) gold += Math.round(150 * run.chapter * run.diff.gold);
  gold = Math.round(gold * (1 + gearBonus(save).gold + run.tb.gold + Math.max(...run.heroes.map(h => h.goldBonus)))); // 黃金戒指＋天賦＋盜賊王
  save.gold += gold;
  const diffIndex = DIFFICULTIES.findIndex(d => d.id === run.diff.id);
  const { drops, salvaged } = rollDrops(save, cleared, win, diffIndex, run.chapter);
  const gemsGot = gemDrops(save, cleared, win, diffIndex);
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
    const it = grantItem(save, 2, run.chapter);
    drops.push(it);
    save.daily = { date: todayKey(), done: true };
    st.dailyWins++;
    eco.grant(save, { gem: 20 });
    eco.track(save, 'daily');
    dailyHtml = `<p class="good">每日挑戰完成！額外 +${g} 金幣＋史詩裝備＋20 寶石</p>`;
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
  // 飾品：戴著冒險累積經驗
  const jUps = jewelRideExp(save, cleared);
  const jewelHtml = jUps.map(j => `<p class="ride-exp">${iconTag(itemIcon(j.it), 18)} ${itemName(j.it)} 升到 Lv.${j.it.jlv}${[3, 6, 10].includes(j.it.jlv) ? `（${JEWEL_SKILLS[j.it.skill].name}${jewelTier(j.it.jlv) === 1 ? '解鎖' : '強化'}）` : ''}</p>`).join('');
  // 坐騎：騎著冒險累積經驗
  const ride = rideExp(save, cleared);
  const rideMax = ride && isMaxMount(ride.st) && ride.ups;
  if (rideMax) setTimeout(() => banner(`${ride.m.name} 完全體！`), 1500);
  const rideHtml = ride ? `<p class="ride-exp">${iconTag(mountRef(ride.m), 18)} ${ride.m.name} +${ride.exp} 經驗${ride.ups ? `，升到 Lv.${ride.st.lv}！` : ''}</p>` : '';
  let unlocked = '';
  let starHtml = '';
  if (win && !run.endless && !run.daily) {
    const n = camp.rateRun(run);
    const up = camp.recordStars(save, run.diff.id, run.chapter, n);
    starHtml = `<p class="stars-got">${starTag(n, 22)}<small>${camp.STAR_RULES.map((r, i) => `<span class="${i < n ? 'on' : ''}">${i < n ? '✓' : '✗'} ${r}</span>`).join('')}</small>${up ? `<b>+${up} 星</b>` : ''}</p>`;
  }
  if (win && !run.endless && !run.daily) {
    const r = clearChapter(save, run.diff.id, run.chapter);
    if (r.next) {
      if (save.difficulty === run.diff.id) save.chapter = maxCh(save, run.diff.id);
      unlocked = `<p class="good">${run.diff.name}：解鎖第 ${maxCh(save, run.diff.id)} 章「${chapterName(maxCh(save, run.diff.id))}」</p>`;
    }
    if (r.diff) {
      unlocked += `<p class="good">新難度開放：${r.diff.name}！</p>`;
      setTimeout(() => banner(`新難度開放：${r.diff.name}`), 1800);
    }
  }
  // 3.2 寶石：勝利寶石（每天前 6 勝）、首通、無盡塔
  eco.track(save, 'run');
  let gemsWon = 0;
  const gemNotes = [];
  if (!run.daily && !run.endless) {
    const b = eco.battleGems(save, run.diff.id, win, cleared);
    if (b) { gemsWon += b; gemNotes.push(`戰鬥 +${b}`); }
    else if (eco.WIN_GEMS[run.diff.id] && win) gemNotes.push(`今天的 ${eco.WIN_GEM_DAILY} 場勝利寶石已領完`);
    if (win) { const f = eco.firstClear(save, run.diff.id, run.chapter); if (f) { gemsWon += f; gemNotes.push(`首通 +${f}`); } }
  }
  if (run.endless) {
    const eff = eco.effectiveFloors(run.diff.id, cleared);
    save.weekly.best = Math.max(save.weekly.best || 0, eff);
    const m = eco.towerMilestones(save, cleared);
    if (m) { gemsWon += m; gemNotes.push(`層數里程碑 +${m}`); }
  }
  if (gemsWon) eco.grant(save, { gem: gemsWon });
  // 3.3 英雄碎片：帶誰出戰就掉誰的碎片
  const frags = heroP.runFrags(save, run.heroIds, cleared);
  const fragHtml = frags.length ? `<p class="frag-got">${frags.map(f => `${iconTag(heroRef(f.def), 18)} ${f.def.name.split(' ')[1]}碎片 +${f.n}`).join('　')}</p>` : '';
  const gemHtml = gemsWon || gemNotes.length ? `<p class="gem-got">${iconTag(ICON.diamond, 22)} <b>${gemsWon ? '+' + gemsWon : '+0'}</b> 寶石 <small>${gemNotes.join('・')}</small></p>` : '';
  writeSave(save);
  if (win) { sfx('win'); setTimeout(() => playMusic('victory'), 900); }
  $('result-body').innerHTML = `
    <h2>${iconTag(win ? ICON.trophy : ICON.skull, 28)} ${run.endless ? '無盡塔結束' : win ? '章節通關！' : '冒險結束'}</h2>
    <p>${run.endless ? `到達第 ${cleared} 層` : `第 ${run.chapter} 章・完成 ${cleared}/${MAX_WAVE} 波`}・擊敗 ${run.kills} 隻</p>
    ${recordHtml}
    <div class="reward">${iconTag(ICON.gold, 32)} <b id="gold-count">+0</b></div>
    ${starHtml}${gemHtml}${fragHtml}${unlocked}${dailyHtml}${rideHtml}${jewelHtml}
    ${drops.length ? `<p>獲得裝備</p><div class="drops">${drops.map((it, i) => `
      <span class="drop r${it.rarity}" style="--rc:${RARITIES[it.rarity].color};animation-delay:${0.9 + i * 0.25}s">${iconTag(itemIcon(it), 30)}<small>${RARITIES[it.rarity].name}</small></span>`).join('')}</div>` : ''}
    ${gemsGot.length ? `<p>獲得符石</p><div class="drops">${gemsGot.map(k => `<span class="drop gemdrop">${gemTag(k, 18)}<small>${gemName(k)}</small></span>`).join('')}</div>` : ''}
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
  eco.rollDay(save);
  playMusic('home');
  checkUpdate(true);
  $('hud').classList.add('hidden');
  $('btn-switch').classList.add('hidden');
  renderHome();
  $('screen-home').scrollTop = 0;
  onHomeScroll();
  showScreen('screen-home');
  setTimeout(rebalanceGift, 400);
}

// 3.0 平衡大修：舊裝備數值換算後的補償（只發一次）
function rebalanceGift() {
  const g = ensureGear(save);
  if (!g.rebalanced || game.run) return;
  const r = g.rebalanced;
  delete g.rebalanced;
  g.shards += r.shards;
  save.gold += r.gold;
  writeSave(save);
  $('info-body').innerHTML = `
    <h2>3.0 平衡大修</h2>
    <p>為了讓每個難度都有挑戰性，裝備、天賦的數值重新調整了：</p>
    <ul class="plain">
      <li>裝備稀有度、裝備等級、強化的加成變小，裝備等級最高 10</li>
      <li>同類加成先相加再計算，太高的部分效果遞減；暴擊率最多 75%</li>
      <li>難度要逐級解鎖，每個難度各自記錄章節</li>
      <li>魔王攻擊降低，但拖太久會越戰越強</li>
    </ul>
    <p>補償已經發到你的帳號：</p>
    <div class="reward gift-row"><span>${iconTag(ICON.gold, 26)} <b>+${fmt(r.gold)}</b></span><span><b>✦ +${r.shards}</b> 魔晶</span></div>
    <button class="btn big gift" id="btn-info-close">收下</button>`;
  showScreen('screen-info', 'screen-home');
  renderHome();
}

// 雙職業：選主職業與副職業（副職業可以不帶）
let duoPick = 'main';
function duoBar() {
  if (save.owned.length < 2) return '';
  if (save.second === save.selected || (save.second && !save.owned.includes(save.second))) save.second = null;
  const main = HEROES.find(h => h.id === save.selected) || HEROES[0];
  const sec = save.second && HEROES.find(h => h.id === save.second);
  return `<div class="duo">
    <button class="duo-slot ${duoPick === 'main' ? 'on' : ''}" id="duo-main"><i>主</i>${iconTag(heroRef(main), 26)}<span>${main.name.split(' ')[1]}</span></button>
    <span class="duo-mid">⇄${sec ? bondChips([main, sec]) : '<small>戰鬥中可切換</small>'}</span>
    <button class="duo-slot second ${duoPick === 'second' ? 'on' : ''} ${sec ? '' : 'empty'}" id="duo-second"><i>副</i>${sec ? iconTag(heroRef(sec), 26) + `<span>${sec.name.split(' ')[1]}</span>` : '<span>＋ 選副職業</span>'}</button>
    ${sec ? '<button class="duo-x" id="duo-clear" aria-label="不帶副職業">✕</button>' : ''}
  </div>`;
}
// 羈絆小標籤：點一下看說明
function bondChips(defs) {
  const list = bondsM.computeBonds(defs, defs.map(d => heroP.heroStar(save, d.id)));
  if (!list.length) return '<small class="bond none">沒有羈絆</small>';
  const pair = list.find(b => b.kind === 'pair');
  const text = list.map(b => `${b.name}${b.lv ? ` Lv${b.lv}` : ''}：${b.desc}`).join('\n');
  return `<button class="bond ${pair ? 'pair' : ''}" data-bond="${text}">${pair ? '♥ ' : ''}羈絆 ×${list.length}</button>`;
}
const tagChips = def => (def.tags || []).map(t => `<span class="cat-tag" style="--cc:${bondsM.TAGS[t].color}">${bondsM.TAGS[t].name}</span>`).join(' ');

// 隱藏職業：達成對應成就就自動加入
function unlockHidden() {
  const got = [];
  for (const h of HEROES) {
    if (!h.hidden || save.owned.includes(h.id)) continue;
    const a = ACHIEVEMENTS.find(x => x.id === h.unlock);
    if (a && achDone(save, a)) { save.owned.push(h.id); got.push(h); heroP.ensureHeroes(save); }
  }
  if (!got.length) return;
  writeSave(save);
  // 一次解鎖好幾個時一個一個輪流顯示
  got.forEach((h, i) => setTimeout(() => { banner(`隱藏職業解鎖：${h.name.split(' ')[1]}！`); sfx('win'); }, 600 + i * 1800));
}
const unlockAch = h => ACHIEVEMENTS.find(x => x.id === h.unlock);
const clsTags = def => heroCls(def).map(c => `<span class="cat-tag" style="--cc:${CATS[c].color}">${CATS[c].name}</span>`).join(' ');

// 英雄圖：舊英雄用 Tiny Dungeon 的編號；3.4 新英雄用 ['hx', 編號]（0x72 動畫角色）
const heroRef = d => Array.isArray(d.sprite) ? [d.sprite[0], d.sprite[1]] : ['dg', d.sprite];
// 坐騎圖：3.1 起用 Tiny Creatures 的生物圖（舊的單色圖示當備用）
const mountRef = m => m.sprite || ['ic', m.icon, m.color];

// 首頁：目前戰力 vs 這個難度、這一章的推薦戰力
function powerLine() {
  const p = savePower(save), rec = recommended(save.difficulty, save.chapter);
  const b = powerBand(p, rec);
  return `<span class="power-line ${b.cls}" style="--pc:${b.color}">戰力 <b>${fmt(p)}</b>／${fmt(rec)} <em>${b.text}</em></span>`;
}

function renderHome() {
  unlockHidden();
  const hero = HEROES.find(h => h.id === save.selected) || HEROES[0];
  const full = createHero(hero, save); // 算上天賦、裝備、坐騎
  const ch = CHAPTERS[(save.chapter - 1) % CHAPTERS.length];
  const achN = achClaimable(save).length;
  const fresh = freshCount(save) + mergeableCount(save);
  const side = (id, icon, label, extra = '', attr = '') => `<button class="side-btn ${extra}" id="${id}" ${attr}>${iconTag(icon, 26)}<small>${label}</small></button>`;
  $('home-body').innerHTML = `
    <div class="home-stage">
      <div class="top-row">
        <span class="pills"><div class="pill" id="home-gold">${iconTag(ICON.gold, 20)} <b>${fmt(save.gold)}</b></div><div class="pill gem-pill" id="home-gem">${iconTag(ICON.diamond, 20)} <b>${fmt(save.wallet.gem)}</b></div></span>
        <span class="top-btns">
          ${installEvt ? `<button class="icon-btn" id="btn-install" aria-label="安裝到手機">${iconTag(ICON.install, 22)}</button>` : ''}
          <button class="icon-btn ${updateInfo && updateInfo.newer ? 'has-update' : ''}" id="btn-update" aria-label="檢查更新">${iconTag(ICON.refresh, 22)}</button>
          <button class="icon-btn ${eco.unreadMail(save) ? 'has-update' : ''}" id="btn-mail" aria-label="信箱">${iconTag(ICON.mail, 22)}</button>
          <button class="icon-btn" id="btn-settings" aria-label="設定">${iconTag(['ic', 829], 22)}</button>
          <button class="icon-btn" id="btn-mute" aria-label="音效開關">${iconTag(save.muted ? ICON.soundOff : ICON.soundOn, 22)}</button>
        </span>
      </div>
      <h1 class="logo">彈珠勇者</h1>
      <p class="sub">自動戰鬥 × 彈珠倍率 × 三選一技能</p>
      <div class="side left">
        ${side('btn-gear', ['ic', 426, '#ffd84a'], '背包', fresh ? 'dot' : '')}
        ${side('btn-talent', ['ic', 1023, '#ffd84a'], '天賦', talentReady() ? 'dot' : '')}
        ${side('btn-mount', ['ic', 371, '#e8b878'], '坐騎')}
        ${side('btn-quest', ICON.quest, '任務', eco.questBadge(save) ? 'dot' : '')}
      </div>
      <div class="side right">
        ${side('btn-ach', ICON.trophy, '成就', achN ? 'dot' : '')}
        ${side('btn-daily', ['ic', 630, '#ffd84a'], '每日', dailyDone(save) ? '' : 'dot')}
        ${side('btn-gacha', ICON.diamond, '扭蛋', gacha.resFreeLeft(save) > 0 ? 'dot' : '')}
        ${side('btn-modes', ['ic', 1023, '#d06bff'], '挑戰', modesBadge() ? 'dot' : '', offAttr(anyChapter(save) < 2, '通關第 1 章後開放挑戰模式'))}
      </div>
      <button class="hero-tap" id="btn-heroes" aria-label="選擇職業"></button>
      <div class="hero-plate">
        <button class="plate-main" id="btn-heroes2"><b>${hero.name}</b><span class="tag">${hero.role}</span></button>
        <button class="plate-stats" id="btn-stats">${iconTag(ICON.heart, 12)}${Math.round(full.maxHp)} ${iconTag(ICON.sword, 12)}${fmtNum(heroAtkOf(full))} <em>秒傷 ${fmtNum(dps(full))}</em> ▶</button>
      </div>
      <div class="chapter">
        <button class="icon-btn" id="ch-prev" ${offAttr(save.chapter <= 1, '已經是第一章')}>◀</button>
        <button class="chapter-name" id="btn-map"><small>第 ${save.chapter} 章 ${starTag(camp.starsOf(save, save.difficulty, save.chapter))}</small><b>${chapterName(save.chapter)}</b><em>${boardOf(save.chapter).rule}</em><i class="map-hint">地圖 ▸</i></button>
        <button class="icon-btn" id="ch-next" ${offAttr(save.chapter >= maxCh(save), `在「${difficultyOf(save.difficulty).name}」通關這一章才能解鎖下一章`)}>▶</button>
      </div>
      <div class="version-row"><span>v${VERSION}</span><button class="link" id="btn-changelog">更新日誌</button></div>
    </div>
    <div class="home-space"><i class="snap-pt"></i></div>
    <div class="home-content">
    <div class="home-bottom">
      <div class="grip"><i></i><small>往上滑看更多</small></div>
      <div class="diffs" role="radiogroup" aria-label="難度">${DIFFICULTIES.map(d => {
        const open = diffUnlocked(save, d);
        return `
        <button class="diff ${d.id === save.difficulty ? 'sel' : ''} ${open ? '' : 'locked'}" data-diff="${d.id}" style="--dc:${d.color}" role="radio" aria-checked="${d.id === save.difficulty}" ${offAttr(!open, unlockText(d) + '才能選這個難度')}>
          <b>${open ? '' : '🔒'}${d.name}</b><small>${open ? `金幣 x${d.gold}` : `${difficultyOf(d.unlock[0]).name}第${d.unlock[1]}章`}</small></button>`;
      }).join('')}
      </div>
      ${duoBar() || `<div class="duo"><button class="duo-slot on" id="duo-main"><i>主</i>${iconTag(heroRef(hero), 26)}<span>${hero.name.split(' ')[1]}</span></button><span class="duo-mid">⇄<small>解鎖第 2 位職業後可雙職業</small></span></div>`}
    </div>
    <div class="home-more">
      <div class="heroes">${HEROES.filter(h => save.owned.includes(h.id) || !h.hidden).map(h => {
        const own = save.owned.includes(h.id);
        return `<button class="hero ${h.id === save.selected ? 'sel' : ''} ${h.id === save.second ? 'sel2' : ''} ${own ? '' : 'locked'}" data-act="btn-heroes" data-fx="tilt">${iconTag(heroRef(h), 40, 'hero-emoji')}<span class="hero-name">${h.name.split(' ')[1]}</span>${own ? '' : `<span class="hero-price">${iconTag(ICON.gold, 12)}${fmt(h.price)}</span>`}</button>`;
      }).join('')}</div>
      <button class="gear-btn" data-act="btn-gear">${gearSummary()}</button>
      <div class="meta-row">
        <button class="meta-btn" data-act="btn-ach">${iconTag(ICON.trophy, 20)} 成就${achN ? `<b class="badge">${achN}</b>` : ''}</button>
        <button class="meta-btn ${dailyDone(save) ? 'done' : 'fresh'}" data-act="btn-daily">${iconTag(['ic', 630, '#ffd84a'], 20)} 每日挑戰<small>${dailyDone(save) ? '今日完成 ✓' : '尚未挑戰'}</small></button>
        <button class="meta-btn" data-act="btn-endless" ${offAttr(anyChapter(save) < 2, '通關第 1 章後開放無盡塔')}>${iconTag(['ic', 1023, '#d06bff'], 20)} 無盡塔<small>${save.records && save.records.length ? `最高 ${save.records[0].wave} 層` : anyChapter(save) < 2 ? '通關第 1 章開放' : '尚無紀錄'}</small></button>
      </div>
      <div class="hero-info">
        <div class="hero-head"><b>${hero.name}</b><span class="tag">${hero.role}</span></div>
        <div class="stats">
          <span>${iconTag(ICON.heart, 14)} ${Math.round(full.maxHp)}</span>
          <span>${iconTag(ICON.sword, 14)} ${fmtNum(heroAtkOf(full))}</span>
          <span>${iconTag(ICON.target, 14)} ${(full.spdMul / full.interval).toFixed(2)} 下/秒</span>
          <span class="hot">秒傷 ${fmtNum(dps(full))}</span>
        </div>
        <button class="link stats-link" data-act="btn-stats">${iconTag(ICON.target, 12)} 查看完整數值（含天賦、裝備、坐騎）▶</button>
        <small class="passive">${iconTag(ICON.star, 14)} ${hero.passive}</small>
        <small class="excl-list">專屬技能：${SKILLS.filter(k => k.hero === hero.id).map(k => k.name).join('、')}</small>
        <small class="cls-line">技能類型：${clsTags(hero)} ＋ <span class="cat-tag" style="--cc:${CATS.any.color}">通用</span></small>
      </div>
      ${mountBtn().replace('id="btn-mount"', 'data-act="btn-mount"')}
      <button class="talent-btn ${talentReady() ? 'ready' : ''}" data-act="btn-talent">${iconTag(['ic', 1023, '#ffd84a'], 26)}<span><b>天賦網</b><small>已點亮 ${totalPoints(save)} 點${talentReady() ? '・有天賦可以升級' : ''}</small></span><em>▶</em></button>
      <p class="hint">${isIOS() && !isStandalone() ? 'iPhone：點 Safari「分享」→「加入主畫面」即可全螢幕離線玩' : ''}</p>
      <button class="link back-top" data-act="back-top">▲ 回到上面</button>
    </div>
    </div>
    <div class="start-dock"><button class="btn big start" id="btn-start">開始冒險 <small>${ch.name}・${difficultyOf(save.difficulty).name}${save.second ? '・雙職業' : ''}　${powerLine()}</small></button></div>`;
}

// 選職業：主副職業都在這裡挑（也可以買新職業）
// 回傳 false = 不能選（金幣不夠、隱藏職業）
function selectHero(id, el) {
  const h = HEROES.find(x => x.id === id);
  if (save.owned.includes(h.id) && duoPick === 'second') {
    if (h.id === save.selected) { save.selected = save.second || h.id; save.second = save.second ? h.id : null; }
    else save.second = h.id;
    toast(`副職業：${h.name}`);
  } else if (save.owned.includes(h.id)) {
    if (save.selected !== h.id) heroHop = performance.now();
    if (h.id === save.second) save.second = save.selected; // 點到副職業 → 主副互換
    save.selected = h.id;
  } else if (h.gacha) {
    heroFocus = h.id; // 扭蛋英雄：只顯示資料，碎片湊齊才能解鎖
    return true;
  } else if (h.hidden) {
    const a = unlockAch(h);
    toast(`隱藏職業：達成成就「${a.name}」（${a.desc}）就會解鎖`);
    el.classList.add('fx-deny');
    el.addEventListener('animationend', () => el.classList.remove('fx-deny'), { once: true });
    return false;
  } else if (save.gold >= h.price) {
    save.gold -= h.price;
    save.owned.push(h.id);
    heroP.ensureHeroes(save);
    if (duoPick === 'second') save.second = h.id; else { save.selected = h.id; heroHop = performance.now(); }
    sfx('buy');
    celebrate(el);
    banner(`解鎖職業：${h.name}！`);
  } else {
    toast(`還差 ${h.price - save.gold} 金幣才能解鎖`);
    el.classList.add('fx-deny');
    el.addEventListener('animationend', () => el.classList.remove('fx-deny'), { once: true });
    return false;
  }
  return true;
}

// 3.3 英雄升星面板
function starPanel(hero) {
  if (!save.owned.includes(hero.id)) {
    if (!hero.gacha) return '';
    const st = heroP.heroState(save, hero.id), need = heroP.UNLOCK_FRAGS[heroP.rarityOf(hero)];
    const rar = heroP.RARITY[heroP.rarityOf(hero)];
    return `<div class="star-box" style="--rc:${rar.color}">
      <div class="star-head"><span class="rar-tag">${rar.name}</span><b>扭蛋英雄</b><small>角色池抽到整隻，或碎片湊齊解鎖</small></div>
      <div class="frag-bar"><i style="width:${Math.min(1, st.frag / need) * 100}%"></i><em>碎片 ${st.frag} / ${need}</em></div>
      <div class="row"><button class="btn small ${gacha.canUnlock(save, hero) ? 'gift' : ''}" id="btn-fragunlock" ${offAttr(!gacha.canUnlock(save, hero), '碎片不夠')}>用碎片解鎖</button><button class="btn small" id="btn-to-gacha">去扭蛋</button></div>
    </div>`;
  }
  const st = heroP.heroState(save, hero.id);
  const rar = heroP.RARITY[heroP.rarityOf(hero)];
  const c = heroP.nextCost(save, hero.id);
  const why = heroP.whyNoStar(save, hero.id);
  const shop = heroP.fragShopInfo(save, hero.id);
  const perks = heroP.PERKS[hero.id];
  const perkRow = (n, p) => p ? `<small class="perk ${st.star >= n ? 'on' : ''}"><b>${n} 星${n === 3 ? '天賦' : '覺醒'}</b> ${p[0]}</small>` : '';
  return `<div class="star-box" style="--rc:${rar.color}">
    <div class="star-head"><span class="rar-tag">${rar.name}</span><b class="stars">${heroP.starText(st.star)}</b><small>攻擊、血量 x${heroP.STAR_MUL[st.star]}</small></div>
    ${c ? `<div class="frag-bar"><i style="width:${Math.min(1, st.frag / c.frag) * 100}%"></i><em>碎片 ${st.frag} / ${c.frag}</em></div>` : '<p class="good">已經 6 星滿星！</p>'}
    ${perks ? perkRow(3, perks.s3) + perkRow(5, perks.s5) : ''}
    <div class="row">
      ${c ? `<button class="btn small ${why ? '' : 'gift'}" id="btn-starup" ${offAttr(!!why, why)}>升到 ${st.star + 1} 星 ${iconTag(ICON.gold, 14)}${fmt(c.gold)}</button>` : ''}
      ${c && save.wallet.anyFrag ? `<button class="btn small" id="btn-anyfrag">萬能碎片 ${save.wallet.anyFrag}</button>` : ''}
      ${shop && c ? `<button class="btn small" id="btn-buyfrag" ${offAttr(shop.left <= 0 || save.gold < shop.price, shop.left <= 0 ? '今天的碎片已經買完了，明天再來' : '金幣不足')}>買碎片 ${iconTag(ICON.gold, 14)}${fmt(shop.price)}<small>今日剩 ${shop.left}</small></button>` : ''}
    </div>
    <small class="hint">帶這位英雄冒險（主、副都算）每 ${heroP.FRAG_RULE[heroP.rarityOf(hero)][0]} 波掉 1 片碎片，一局最多 ${heroP.FRAG_RULE[heroP.rarityOf(hero)][1]} 片</small>
  </div>`;
}

function openHeroes(slot) {
  duoPick = slot || 'main';
  renderHeroes();
  showScreen('screen-heroes', 'screen-home');
}
let heroFocus = null;
function renderHeroes() {
  const focusId = heroFocus || (duoPick === 'second' && save.second ? save.second : save.selected);
  const hero = HEROES.find(h => h.id === focusId) || HEROES[0];
  const full = createHero(hero, save);
  // 排序：已擁有的在前（依稀有度），再來是金幣可買、扭蛋、隱藏
  const RANK = { legend: 0, elite: 1, rare: 2, normal: 3 };
  const order = h => (save.owned.includes(h.id) ? 0 : h.gacha ? 2 : h.hidden ? 3 : 1) * 10 + RANK[heroP.rarityOf(h)];
  const cards = HEROES.slice().sort((a, b) => order(a) - order(b)).map(h => {
    const own = save.owned.includes(h.id);
    const secret = h.hidden && !own;
    return `<button class="hero ${h.id === save.selected ? 'sel' : ''} ${h.id === save.second ? 'sel2' : ''} ${own ? '' : 'locked'} ${secret ? 'secret' : ''} ${h.hidden ? 'hidden-cls' : ''} ${h.id === heroFocus ? 'focus' : ''} r-${heroP.rarityOf(h)}" data-hero="${h.id}" data-fx="tilt">
      ${iconTag(heroRef(h), 40, 'hero-emoji')}
      <span class="hero-name">${secret ? '？？？' : h.name.split(' ')[1]}</span>
      ${own ? `<span class="hero-stars" style="--rc:${heroP.RARITY[heroP.rarityOf(h)].color}">${'★'.repeat(heroP.heroStar(save, h.id))}</span>` : ''}
      ${secret ? '<span class="hero-price secret">隱藏</span>' : own ? '' : h.gacha ? `<span class="hero-price gacha" style="--rc:${heroP.RARITY[heroP.rarityOf(h)].color}">${heroP.RARITY[heroP.rarityOf(h)].name}・扭蛋</span>` : `<span class="hero-price">${iconTag(ICON.gold, 12)}${fmt(h.price)}</span>`}
    </button>`;
  }).join('');
  const two = save.owned.length > 1;
  $('heroes-body').innerHTML = `
    <h2>選擇職業</h2>
    ${two ? `<div class="gtabs">
      <button class="gtab ${duoPick === 'main' ? 'sel' : ''}" data-slot="main">主職業</button>
      <button class="gtab ${duoPick === 'second' ? 'sel' : ''}" data-slot="second">副職業${save.second ? '' : '（不帶）'}</button></div>` : ''}
    <div class="hero-grid">${cards}</div>
    <div class="hero-info">
      <div class="hero-head"><b>${hero.name}</b><span class="tag">${hero.role}</span></div>
      <div class="stats">
        <span>${iconTag(ICON.heart, 14)} ${Math.round(full.maxHp)}</span>
        <span>${iconTag(ICON.sword, 14)} ${fmtNum(heroAtkOf(full))}</span>
        <span>${iconTag(ICON.target, 14)} ${(full.spdMul / full.interval).toFixed(2)} 下/秒</span>
        <span class="hot">秒傷 ${fmtNum(dps(full))}</span>
      </div>
      <button class="link stats-link" id="btn-stats">${iconTag(ICON.target, 12)} 查看完整數值（含天賦、裝備、坐騎）▶</button>
      <small class="passive">${iconTag(ICON.star, 14)} ${hero.passive}</small>
      <small class="excl-list">專屬技能：${SKILLS.filter(k => k.hero === hero.id).map(k => k.name).join('、')}</small>
      <small class="cls-line">技能類型：${clsTags(hero)} ＋ <span class="cat-tag" style="--cc:${CATS.any.color}">通用</span></small>
      ${hero.tags ? `<small class="cls-line">羈絆標籤：${tagChips(hero)}</small>` : ''}
    </div>
    ${starPanel(hero)}
    <div class="row">
      ${duoPick === 'second' && save.second ? '<button class="btn small ghost" id="btn-no-second">不帶副職業</button>' : ''}
      <button class="btn" id="btn-heroes-ok">確定</button>
    </div>`;
}
$('heroes-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  if (t.dataset.hero) { const was = heroFocus; heroFocus = null; if (!selectHero(t.dataset.hero, t)) { heroFocus = was; return; } }
  else if (t.dataset.slot) duoPick = t.dataset.slot;
  else if (t.id === 'btn-no-second') { save.second = null; duoPick = 'main'; }
  else if (t.id === 'btn-stats') { statsTab = duoPick === 'second' && save.second ? 1 : 0; openStats(); return; }
  else if (t.id === 'btn-starup' || t.id === 'btn-buyfrag') {
    const id = duoPick === 'second' && save.second ? save.second : save.selected;
    if (t.id === 'btn-starup' && heroP.starUp(save, id)) {
      const def = HEROES.find(h => h.id === id);
      sfx('maxup'); celebrate(t, '#ffd84a'); banner(`${def.name.split(' ')[1]} 升到 ${heroP.heroStar(save, id)} 星！`);
    } else if (t.id === 'btn-buyfrag' && heroP.buyFrag(save, id)) { sfx('coin'); }
  }
  else if (t.id === 'btn-fragunlock') {
    const def = HEROES.find(h => h.id === heroFocus);
    if (def && gacha.unlockByFrags(save, def)) { sfx('jackpot'); celebrate(t); banner(`解鎖英雄：${def.name}！`); }
  }
  else if (t.id === 'btn-to-gacha') { writeSave(save); heroFocus = null; openGacha(); return; }
  else if (t.id === 'btn-anyfrag') {
    const id = duoPick === 'second' && save.second ? save.second : save.selected;
    const def = HEROES.find(h => h.id === id), c = heroP.nextCost(save, id);
    const n = c ? gacha.useAnyFrag(save, def, c.frag) : 0;
    toast(n ? `用萬能碎片補了 ${n} 片` : '萬能碎片不夠，或這一星已經補到一半上限');
  }
  else if (t.id === 'btn-heroes-ok') { writeSave(save); duoPick = 'main'; heroFocus = null; renderHome(); showScreen('screen-home'); return; }
  writeSave(save);
  renderHeroes();
});

$('home-body').addEventListener('click', ev => {
  let t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  initAudio();
  sfx('tap');
  // 下面「更多」區塊的按鈕用 data-act，對應到上面同樣功能的按鈕
  if (t.dataset.act === 'back-top') { $('screen-home').scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (t.dataset.act) t = { id: t.dataset.act, dataset: {} };
  if (t.dataset.bond) { toast(t.dataset.bond, true); return; }
  if (t.dataset.diff) {
    save.difficulty = t.dataset.diff;
    save.chapter = Math.min(save.chapter, maxCh(save));
    const d = difficultyOf(save.difficulty);
    toast(`${d.name}：敵人血量 x${d.hp}、攻擊 x${d.atk}${d.count ? `、每波多 ${d.count} 隻` : ''}${d.traps ? `、${d.traps} 道陷阱門` : ''}；技能價格 x${d.price}、每升一級再 x${d.lvGrow}、每波刷新${d.rerolls === Infinity ? '不限' : ' ' + d.rerolls + ' 次'}；金幣 x${d.gold}`);
  } else if (t.id === 'ch-prev') save.chapter = Math.max(1, save.chapter - 1);
  else if (t.id === 'ch-next') save.chapter = Math.min(maxCh(save), save.chapter + 1);
  else if (t.id === 'btn-mute') { save.muted = !save.muted; setMuted(save.muted); }
  else if (t.id === 'btn-changelog') { showChangelog(CHANGELOG, '更新日誌'); return; }
  else if (t.id === 'btn-settings') { openSettings(); return; }
  else if (t.id === 'btn-quest') { openQuest(); return; }
  else if (t.id === 'btn-gacha') { openGacha(); return; }
  else if (t.id === 'btn-mail') { openMail(); return; }
  else if (t.id === 'btn-gear') { openGear(); return; }
  else if (t.id === 'btn-talent') { openTalent(); return; }
  else if (t.id === 'btn-mount') { openMount(); return; }
  else if (t.id === 'btn-stats') { statsTab = 0; openStats(); return; }
  else if (t.id === 'btn-heroes' || t.id === 'btn-heroes2' || t.id === 'duo-main') { openHeroes('main'); return; }
  else if (t.id === 'duo-second') { openHeroes('second'); return; }
  else if (t.id === 'duo-clear') { save.second = null; duoPick = 'main'; }
  else if (t.id === 'btn-ach') { openAch(); return; }
  else if (t.id === 'btn-daily') { openDaily(); return; }
  else if (t.id === 'btn-endless') { openEndless(); return; }
  else if (t.id === 'btn-modes') { openModes(); return; }
  else if (t.id === 'btn-map') { openMap(); return; }
  else if (t.id === 'btn-update') { checkUpdate(false); return; }
  else if (t.id === 'btn-start') {
    // 戰力不足只提醒一次，不擋
    const p = savePower(save), rec = recommended(save.difficulty, save.chapter);
    if (p < rec * 0.6 && t.dataset.warned !== '1' && !game.warnedLow) {
      game.warnedLow = true;
      toast(`戰力 ${fmt(p)}，推薦 ${fmt(rec)}：可能會很辛苦。再按一次開始冒險`);
      return;
    }
    game.warnedLow = false;
    writeSave(save); launch(); return;
  }
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
    <polygon class="ring" points="${hex(0.12)}"/><polygon class="ring" points="${hex(0.205)}"/><polygon class="ring" points="${hex(0.29)}"/><polygon class="ring" points="${hex(0.37)}"/>
    <circle class="ring dash" cx="50" cy="50" r="44"/><circle class="ring inf" cx="50" cy="50" r="46.5"/>
    <g class="links">${links}</g></svg>`;
}

function renderTalent() {
  const nodes = TALENTS.map(n => `<button class="tnode k-${n.kind}" data-node="${n.id}" style="left:${n.x * 100}%;top:${n.y * 100}%;--tc:${n.color}" aria-label="${n.name}">
      ${iconTag(n.icon, n.kind === 'key' ? 20 : 16)}<i class="tlv"></i></button>`).join('');
  $('talent-body').innerHTML = `
    <h2>天賦網</h2>
    <div class="talent-top">
      <div class="pill" id="talent-gold">${iconTag(ICON.gold, 18)} <b>${fmt(save.gold)}</b></div>
      <small>已點 <b id="talent-pts">${totalPoints(save)}</b> 點・無極 <b id="talent-inf">${infPoints(save)}</b> 級<br>每多點一點，一般天賦變貴 3%</small>
    </div>
    <div class="tweb-wrap ${talentZoom ? 'zoom' : ''}" id="tweb-wrap"><div class="tweb">${webSvg()}${nodes}</div></div>
    <button class="tzoom" id="btn-tzoom">${talentZoom ? '縮小' : '放大'}</button>
    <div class="tdetail" id="tdetail"></div>
    <div class="tsum hidden" id="tsum"></div>
    <div class="row">
      <button class="btn small ghost" id="btn-talent-reset">重置（全額退還）</button>
      <button class="btn small ghost" id="btn-tsum">總加成</button>
      <button class="btn small" id="btn-talent-close">關閉</button>
    </div>`;
  updateTalent();
}

let talentZoom = false;
const KIND_TAG = { key: '<i class="tag key">核心・二選一</i>', cross: '<i class="tag cross">混合</i>', inf: '<i class="tag inf">無極・無上限</i>' };

// 只更新狀態（升級按鈕可以按住連點，不能被換掉）
function updateTalent(changed) {
  $('talent-gold').querySelector('b').textContent = fmt(save.gold);
  $('talent-pts').textContent = totalPoints(save);
  $('talent-inf').textContent = infPoints(save);
  const masteredIds = new Set(T_BRANCHES.filter(b => mastered(save, b)).map(b => b.id));
  document.querySelectorAll('.tnode').forEach(el => {
    const n = talentById(el.dataset.node);
    const lv = tLv(save, n.id);
    el.classList.toggle('on', lv > 0);
    el.classList.toggle('max', lv >= n.max && n.id !== 'core');
    el.classList.toggle('reach', lv === 0 && canReach(save, n) && !(n.excl && tLv(save, n.excl)));
    el.classList.toggle('can', !whyNot(save, n));
    el.classList.toggle('sel', n.id === talentSel);
    el.classList.toggle('excluded', !!(n.excl && tLv(save, n.excl) > 0 && !lv));
    el.classList.toggle('mastered', !!(n.branch && masteredIds.has(n.branch.id) && n.kind === 'node'));
    // 沒點的格子不顯示數字，畫面比較清爽
    el.querySelector('.tlv').textContent = n.id === 'core' || (!lv && n.kind !== 'inf') ? '' : n.kind === 'inf' ? (lv ? '∞' + lv : '∞') : n.max > 1 ? `${lv}/${n.max}` : '★';
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
      <span class="td-info"><b>${n.name} ${KIND_TAG[n.kind] || (n.branch ? `<i class="tag" style="--tc:${n.color}">${n.branch.name}</i>` : '')}</b>
        <small class="td-now"></small><small class="td-next"></small><small class="td-extra"></small></span>
      ${n.id === 'core' ? '' : `<button class="btn small" id="btn-tbuy" data-repeat>${iconTag(ICON.gold, 16)}<span class="cost"></span></button>`}`;
  }
  const inf = n.kind === 'inf';
  det.querySelector('.td-now').textContent = n.id === 'core' ? talentDesc(save, n) : lv ? `目前 Lv.${lv}${inf ? '' : '/' + n.max}：${talentDesc(save, n)}` : `尚未點亮（${inf ? '沒有等級上限' : '最高 ' + n.max + ' 級'}）`;
  det.querySelector('.td-next').textContent = n.id === 'core' ? '從這裡往外點亮天賦' : lv >= n.max ? '已經滿級 ★' : `下一級：${talentDesc(save, n, lv + 1)}`;
  // 額外說明：二選一、精通、無極開放條件
  let extra = '';
  if (n.excl) extra = `和「${talentById(n.excl).name}」只能選一個`;
  else if (n.kind === 'node') extra = `${n.branch.name}精通（4 格全滿）：${effText(n.branch.mastery)}${mastered(save, n.branch) ? ' ✓' : ''}`;
  else if (inf && !canReach(save, n)) extra = `把「${n.branch.nodes[3].name}」點滿後開放`;
  det.querySelector('.td-extra').textContent = extra;
  const b = $('btn-tbuy');
  if (b) {
    b.querySelector('.cost').textContent = lv >= n.max ? 'MAX' : fmt(talentCost(save, n));
    setOff(b, !!why, why);
  }
  if (!$('tsum').classList.contains('hidden')) renderTalentSum();
}
function renderTalentSum() {
  const lines = bonusLines(save);
  const ms = T_BRANCHES.filter(b => mastered(save, b)).map(b => b.name + '精通');
  $('tsum').innerHTML = `<b>天賦總加成</b>${ms.length ? `<p class="ms">${ms.join('・')}</p>` : ''}<ul>${lines.map(l => `<li>${l}</li>`).join('') || '<li>還沒有點任何天賦</li>'}</ul>`;
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
    const wasMastered = n.branch && mastered(save, n.branch);
    if (buyTalent(save, n)) {
      sfx('buy');
      writeSave(save);
      const el = document.querySelector(`.tnode[data-node="${n.id}"]`);
      if (tLv(save, n.id) >= n.max) { celebrate(el, n.kind === 'key' ? '#fff2a8' : '#ffd84a'); if (n.kind === 'key') banner(`核心天賦：${n.name}！`); }
      if (n.branch && !wasMastered && mastered(save, n.branch)) { banner(`${n.branch.name}精通！`); sfx('win'); }
      else if (n.kind === 'node' && n.ring === 3 && tLv(save, n.id) >= n.max) toast(`「${n.branch.inf.name}」開放：可以無限強化！`);
      if (n.kind === 'inf' && tLv(save, n.id) % 10 === 0) { celebrate(el, n.color); toast(`${n.name} 突破 Lv.${tLv(save, n.id)}！`); }
      updateTalent(n.id);
      pop($('talent-gold'));
    }
  } else if (t.id === 'btn-tzoom') {
    sfx('tap');
    talentZoom = !talentZoom;
    $('tweb-wrap').classList.toggle('zoom', talentZoom);
    t.textContent = talentZoom ? '縮小' : '放大';
    // 放大後先捲到選中的格子
    if (talentZoom) {
      const w = $('tweb-wrap'), el = w.querySelector('.tnode.sel');
      if (el) { w.scrollLeft = el.offsetLeft - w.clientWidth / 2; w.scrollTop = el.offsetTop - w.clientHeight / 2; }
    }
  } else if (t.id === 'btn-tsum') {
    sfx('tap');
    $('tsum').classList.toggle('hidden');
    if (!$('tsum').classList.contains('hidden')) renderTalentSum();
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
  return `<button class="talent-btn mount-btn" id="btn-mount">${r ? iconTag(mountRef(r), 26) : iconTag(['ic', 371, '#8a7a9a'], 26)}<span><b>坐騎</b><small>${r ? `騎乘中：${r.name} Lv.${r.lv} ${'★'.repeat(r.star)}` : own ? '目前沒有騎乘' : '買一隻坐騎，一起去冒險'}</small></span><em>▶</em></button>`;
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
      ${iconTag(o ? mountRef(x) : [...mountRef(x), '#6a5a7a'], 34)}<small>${x.name}</small>
      ${o ? `<i>${isMaxMount(o) ? '<b class="mmax">MAX</b>' : `Lv.${o.lv} ${'★'.repeat(o.star)}`}</i>` : `<i class="price">${iconTag(ICON.gold, 12)}${x.price}</i>`}</button>`;
  }).join('');
  let body;
  if (!st) {
    body = `<div class="m-stats"><p>${mountStatText(m, 1)}（Lv.1，之後每級成長）</p><p>坐騎技能「${m.skill}」：${m.skillDesc(1)}（每 ${m.cd} 秒）</p></div>
      <button class="btn big gift" id="btn-mbuy" ${offAttr(save.gold < m.price, `金幣不足，還差 ${m.price - save.gold}`)}>${iconTag(ICON.gold, 18)} ${m.price} 購買</button>`;
  } else {
    const cap = atCap(st);
    const need = expNeed(st.lv);
    body = `<div class="m-lv"><b>Lv.${st.lv}</b><small>/ ${lvCap(st.star)}</small><span class="stars">${'★'.repeat(st.star)}${'☆'.repeat(MAX_STAR - st.star)}</span></div>
      <div class="m-exp"><i style="width:${cap ? 100 : st.exp / need * 100}%"></i><span>${cap ? (st.star >= MAX_STAR ? '已經完全長大了！' : '等級到上限了，需要突破') : `經驗 ${st.exp} / ${need}`}</span></div>
      <div class="m-stats">
        <p>被動：<b>${mountStatText(m, st.lv)}</b></p>
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
    <div class="m-hero ${isMaxMount(st) ? 'maxed' : st && st.star >= 2 ? 'star' + st.star : ''}" style="--mc:${m.color}">${iconTag(st ? mountRef(m) : [...mountRef(m), '#6a5a7a'], 72)}<b>${m.name}${riding_ ? ' <i class="tag">騎乘中</i>' : ''}</b></div>
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
    if (isMaxMount(mountState(save, ms.ride))) mountMaxed(t);
  } else if (t.id === 'btn-mbreak') {
    if (breakthrough(save)) { sfx('win'); celebrate(t, '#ffd84a'); banner(`突破成功：${'★'.repeat(mountState(save, ms.ride).star)}`); if (isMaxMount(mountState(save, ms.ride))) mountMaxed(t); }
  } else if (t.id === 'btn-mride') {
    ms.ride = ms.ride === mountSel ? null : mountSel;
    sfx('tap');
  } else if (t.id === 'btn-mount-close') {
    sfx('tap'); writeSave(save); renderHome(); showScreen('screen-home'); return;
  }
  writeSave(save);
  renderMount();
});
// 坐騎完全長大：金光大爆發
function mountMaxed(el) {
  const m = mountById(ensureMounts(save).ride);
  setTimeout(() => {
    banner(`${m.name} 完全體！`);
    sfx('win');
    vibrate([60, 40, 60, 40, 160]);
    const hero = document.querySelector('.m-hero');
    if (hero) { celebrate(hero, '#ffd84a'); setTimeout(() => celebrate(hero, '#fff6c0'), 200); setTimeout(() => celebrate(hero, m.color), 400); }
  }, 120);
  toast('滿級：坐騎全身發出金色火焰，戰鬥中也看得到！');
}
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
// 3.2：每個成就另外給寶石（金幣的十分之一，至少 20）
const achGems = a => Math.max(20, Math.round(a.gold / 10 / 5) * 5);
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
      ${claimed ? '<span class="ach-ok">已領取</span>' : `<button class="btn small ${done ? 'gift' : ''}" data-claim="${a.id}" ${offAttr(!done, '還沒達成')}>${iconTag(ICON.gold, 14)}${a.gold} ${iconTag(ICON.diamond, 14)}${achGems(a)}</button>`}
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
    const ag = achGems(a);
    eco.grant(save, { gem: ag });
    save.claimed.push(a.id);
    sfx('buy');
    celebrate(t, '#ffd84a');
    toast(`領取「${a.name}」：+${a.gold} 金幣、+${ag} 寶石`);
    writeSave(save);
    renderAch();
  } else if (t.id === 'btn-ach-close') {
    renderHome();
    showScreen('screen-home');
  }
});

// ---------- 3.2 任務（每日、每週、簽到、冒險寶庫） ----------
let questTab = 'daily';
function openQuest() {
  eco.rollDay(save);
  renderQuest();
  showScreen('screen-quest', 'screen-home');
}
const giftTag = (gift, px = 14) => Object.entries(gift).filter(([, v]) => v).map(([k, v]) => `<span class="gift-i">${k === 'shards' ? '✦' : iconTag(eco.CUR[k].icon, px)}${fmt(v)}</span>`).join('');
function renderQuest() {
  const m = save.missions, w = save.weekly;
  const tabs = [['daily', '每日任務'], ['weekly', '每週'], ['sign', '簽到'], ['vault', '冒險寶庫']];
  let body = '';
  if (questTab === 'daily') {
    const chests = eco.DAILY_CHESTS.map((c, i) => {
      const ok = m.act >= c.need, got = m.chests[i];
      return `<button class="q-chest ${got ? 'got' : ok ? 'ready' : ''}" data-dchest="${i}" ${offAttr(got || !ok, got ? '已經領過了' : `活躍度 ${c.need} 才能開`)}>${iconTag(got ? ICON.chestOpen : ICON.chest, 30)}<small>${c.need}</small></button>`;
    }).join('');
    const rows = eco.MISSIONS.map(x => {
      const cur = m.prog[x.id] || 0, done = cur >= x.goal;
      return `<div class="q-row ${done ? 'done' : ''}"><span><b>${x.name}</b><span class="ach-bar"><i style="width:${Math.min(1, cur / x.goal) * 100}%"></i><em>${fmt(cur)} / ${fmt(x.goal)}</em></span></span><em class="q-act">${done ? '✓' : '+' + x.act}</em></div>`;
    }).join('');
    body = `<div class="q-head">今日活躍度 <b>${m.act}</b> / 100</div>
      <div class="q-bar"><i style="width:${Math.min(100, m.act)}%"></i></div>
      <div class="q-chests">${chests}</div>
      <p class="hint">每個寶箱的內容：${eco.DAILY_CHESTS.map(c => giftTag(c.gift, 12)).join('｜')}</p>
      <div class="q-list">${rows}</div>
      <p class="hint">勝利也會給寶石：簡單 ${eco.WIN_GEMS.easy}、中級 ${eco.WIN_GEMS.normal}、挑戰 ${eco.WIN_GEMS.hard}、地獄 ${eco.WIN_GEMS.hell}、無解 ${eco.WIN_GEMS.nightmare}（每天前 ${eco.WIN_GEM_DAILY} 勝；今天已拿 ${save.winGems.day === todayKey() ? save.winGems.n : 0} 次）。休閒難度不給。</p>`;
  } else if (questTab === 'weekly') {
    const chests = eco.WEEKLY_CHESTS.map((c, i) => {
      const ok = w.act >= c.need, got = w.chests[i];
      return `<button class="q-chest big ${got ? 'got' : ok ? 'ready' : ''}" data-wchest="${i}" ${offAttr(got || !ok, got ? '已經領過了' : `本週活躍度 ${c.need} 才能開`)}>${iconTag(got ? ICON.chestOpen : ICON.chest, 40)}<small>${c.need}</small>${giftTag(c.gift, 12)}</button>`;
    }).join('');
    const eff = w.best || 0;
    body = `<div class="q-head">本週活躍度 <b>${w.act}</b> / 700</div>
      <div class="q-bar"><i style="width:${Math.min(100, w.act / 7)}%"></i></div>
      <div class="q-chests">${chests}</div>
      <p class="hint">每日任務完成的活躍度，也會加到本週活躍度。每週一重置。</p>
      <div class="q-row"><span><b>無盡塔週結算</b><small>本週最佳有效層數：${eff}（層數 × 難度係數：休閒 0.6 … 無解 1.6）。下週一用信件發 ${iconTag(ICON.diamond, 12)}${eco.towerWeekly(eff)}</small></span></div>`;
  } else if (questTab === 'sign') {
    const n = save.calendar.n, can = eco.canSign(save);
    const cells = Array.from({ length: 28 }, (_, i) => {
      const k = i + 1, g = eco.calendarGift(k), big = k % 7 === 0;
      return `<div class="cal ${k <= n ? 'got' : ''} ${k === n + 1 && can ? 'next' : ''} ${big ? 'big' : ''}"><small>${k}</small>${giftTag(g, 12)}</div>`;
    }).join('');
    body = `<p class="hint">累計簽到：漏簽不會歸零，每天可以簽 1 格。第 7、14、21、28 格有大獎。</p>
      <div class="cal-grid">${cells}</div>
      <button class="btn big ${can ? 'gift' : ''}" id="btn-sign" ${offAttr(!can, '今天已經簽到了，明天再來')}>${can ? `簽到（第 ${n % 28 + 1} 格）` : '今天已簽到 ✓'}</button>`;
  } else {
    const h = eco.vaultHours(save), v = eco.vaultContent(save, balChapter(save));
    body = `<div class="vault">${iconTag(ICON.vault, 64)}<p>離開遊戲時，冒險寶庫會自己累積獎勵<br>最多存 ${eco.VAULT_MAX_H} 小時，記得早晚各領一次</p>
      <div class="q-bar"><i style="width:${h / eco.VAULT_MAX_H * 100}%"></i></div>
      <p>已累積 <b>${h.toFixed(1)}</b> / ${eco.VAULT_MAX_H} 小時</p>
      <div class="vault-gift">${giftTag(v, 18) || '還沒有東西'}</div>
      <p class="hint">每小時：1 寶石、${fmt(200 * balChapter(save))} 金幣（依平衡難度最高章節）、2 魔晶</p>
      <button class="btn big ${eco.vaultReady(save) ? 'gift' : ''}" id="btn-vault" ${offAttr(!eco.vaultReady(save), '至少要累積 1 小時')}>領取</button></div>`;
  }
  $('quest-body').innerHTML = `
    <h2>任務</h2>
    <div class="wallet-row">${['gem', 'heroTicket', 'gearTicket'].map(k => `<span class="pill">${iconTag(eco.CUR[k].icon, 18)} <b>${fmt(save.wallet[k])}</b></span>`).join('')}</div>
    <div class="vtabs">${tabs.map(([k, n]) => `<button class="vtab ${questTab === k ? 'sel' : ''}" data-qtab="${k}">${n}${k === 'sign' && eco.canSign(save) || k === 'vault' && eco.vaultReady(save) ? ' •' : ''}</button>`).join('')}</div>
    ${body}
    <button class="btn" id="btn-quest-close">關閉</button>`;
}
$('quest-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  let g = null;
  if (t.dataset.qtab) questTab = t.dataset.qtab;
  else if (t.dataset.dchest !== undefined) g = eco.claimDailyChest(save, +t.dataset.dchest);
  else if (t.dataset.wchest !== undefined) g = eco.claimWeeklyChest(save, +t.dataset.wchest);
  else if (t.id === 'btn-sign') g = eco.sign(save);
  else if (t.id === 'btn-vault') g = eco.claimVault(save, balChapter(save));
  else if (t.id === 'btn-quest-close') { writeSave(save); renderHome(); showScreen('screen-home'); return; }
  if (g) { sfx('coin'); celebrate(t, '#7fe8ff'); toast('獲得 ' + eco.giftText(g)); writeSave(save); }
  renderQuest();
});

// ---------- 3.4 扭蛋 ----------
let gachaTab = 'hero', gachaShowRates = false, gachaResult = null, dustHero = null;
function openGacha() {
  gacha.ensureGacha(save);
  if (gachaTab === 'newbie' && save.gacha.newbie <= 0) gachaTab = 'hero';
  gachaResult = null;
  renderGacha();
  showScreen('screen-gacha', 'screen-home');
  playMusic('gacha');
}
const CAPSULE = { normal: 10, rare: 2, elite: 0, legend: 6 };
const capsule = (r, open) => `<i class="capsule" style="--cx:${CAPSULE[r] || 10};--cy:${open ? 2 : 0}"></i>`;
function resultCard(o, i) {
  const r = o.r || 'normal', col = heroP.RARITY[r].color;
  let ic, name, sub = '';
  if (o.kind === 'hero') { ic = iconTag(heroRef(o.def), 40); name = o.def.name.split(' ')[1]; sub = o.isNew ? `<b class="new">NEW!${o.sig ? '＋專武' : ''}</b>` : `轉成碎片 x${o.frag}${o.dust ? `（滿星→星塵 ${o.dust}）` : ''}`; }
  else if (o.kind === 'frag') { ic = iconTag(heroRef(o.def), 32); name = `${o.def.name.split(' ')[1]}碎片`; sub = `x${o.n}${o.dust ? `→星塵 ${o.dust}` : ''}`; }
  else if (o.kind === 'any') { ic = iconTag(ICON.stardust, 32); name = '萬能碎片'; sub = `x${o.n}`; }
  else if (o.kind === 'item') { ic = iconTag(itemIcon(o.it), 34); name = itemName(o.it); sub = o.it.heir ? '<b class="new">傳家武器</b>' : o.special ? `<b class="new">${SETS[o.it.set].name}刻印</b>` : `${RARITIES[o.it.rarity].name}${TYPES[o.it.type].name}`; }
  else if (o.kind === 'res') { ic = o.gift.gold ? iconTag(ICON.gold, 30) : '<b class="shard-ic">✦</b>'; name = o.gift.gold ? '金幣' : '魔晶'; sub = '+' + fmt(o.gift.gold || o.gift.shards); }
  else { ic = o.big ? iconTag(ICON.chest, 32) : iconTag(ICON.chestOpen, 30); name = o.name; sub = o.gift.def ? o.gift.def.name.split(' ')[1] : ''; }
  return `<div class="g-card r-${r} ${o.kind === 'hero' ? 'hero' : ''}" style="--rc:${col};animation-delay:${0.15 + i * 0.18}s">${capsule(r, true)}<span class="g-ic">${ic}</span><b>${name}</b><small>${sub}</small></div>`;
}
function renderGacha() {
  const g = save.gacha, w = save.wallet, ch = balChapter(save);
  const tabs = [['hero', '角色池'], ...(g.newbie > 0 ? [['newbie', '新手池']] : []), ['forge', '裝備池'], ['res', '資源池'], ['shop', '星塵商店']];
  let body = '';
  if (gachaResult) {
    body = `<div class="g-results ${gachaResult.length > 1 ? 'ten' : ''}">${gachaResult.map(resultCard).join('')}</div>
      <button class="btn big" id="btn-g-again">繼續</button>`;
  } else if (gachaTab === 'hero' || gachaTab === 'newbie') {
    const nb = gachaTab === 'newbie';
    const rates = gacha.heroRates().filter(r => r.p > 0);
    const c1 = gacha.PULL_COST * (nb ? 0.5 : 1), c10 = gacha.TEN_COST * (nb ? 0.5 : 1);
    body = `<div class="g-banner ${nb ? 'newbie' : ''}">
        <div class="g-capsules">${['elite', 'rare', 'legend', 'normal', 'elite'].map(r => capsule(r)).join('')}</div>
        <b>${nb ? '新手召喚・半價' : '英雄召喚'}</b>
        <small>${nb ? `剩 ${g.newbie} 抽・第一次十連必出稀有英雄` : '抽到整隻英雄或英雄碎片；重複的英雄會變成碎片'}</small>
        <div class="g-pity">每 ${gacha.ELITE_PITY} 抽必出精英英雄：還差 <b>${gacha.ELITE_PITY - g.hero.sinceElite}</b> 抽　十連必有精英以上</div>
        ${nb ? '' : featBox(g)}
      </div>
      <div class="g-btns">
        <button class="btn gift" id="btn-pull1" ${offAttr(w.gem < c1, '寶石不足')}>單抽<small>${iconTag(ICON.diamond, 14)}${c1}</small></button>
        <button class="btn gift" id="btn-pull10" ${offAttr(w.gem < c10 || (nb && g.newbie < 10), nb && g.newbie < 10 ? '新手池剩不到 10 抽' : '寶石不足')}>十連<small>${iconTag(ICON.diamond, 14)}${c10}</small></button>
      </div>
      ${nb ? '' : `<div class="g-btns">
        <button class="btn" id="btn-tick1" ${offAttr(w.heroTicket < 1, '沒有英雄召喚券')}>用券單抽<small>${iconTag(ICON.heroTicket, 14)}1</small></button>
        <button class="btn" id="btn-tick10" ${offAttr(w.heroTicket < 10, '英雄召喚券不到 10 張')}>用券十連<small>${iconTag(ICON.heroTicket, 14)}10</small></button></div>`}
      <button class="link" id="btn-g-rates">${gachaShowRates ? '▲ 收起機率' : '▼ 查看機率'}</button>
      ${gachaShowRates ? `<div class="g-rates">${rates.map(r => `<span>${r.name}</span><b>${(r.p * 100).toFixed(1)}%</b>`).join('')}</div>
        <p class="hint">每抽送 ${gacha.DUST_PER_PULL} 星塵。第一次抽到傳奇英雄附贈專武。滿星英雄的碎片會換成星塵。</p>` : ''}`;
  } else if (gachaTab === 'forge') {
    const f = g.forge, room = bagRoomLeft();
    body = `<div class="g-banner forge">
        <div class="g-capsules">${['elite', 'legend', 'rare', 'legend', 'elite'].map(r => capsule(r)).join('')}</div>
        <b>鍛造召喚</b>
        <small>稀有～傳說裝備，裝備等級 Lv.${gacha.forgeIlv(ch)}（平衡難度最高章節 - 1）；傳說有機會是「刻印套裝」或「傳家武器」（可升到 5 星）</small>
        <div class="g-pity">每 ${gacha.FORGE_PITY} 抽必出傳說：還差 <b>${gacha.FORGE_PITY - f.sinceLegend}</b> 抽　十連必有史詩以上</div>
      </div>
      <div class="g-btns">
        <button class="btn gift" id="btn-forge1" ${offAttr(w.gem < gacha.PULL_COST || room < 1, room < 1 ? '背包滿了' : '寶石不足')}>單抽<small>${iconTag(ICON.diamond, 14)}${gacha.PULL_COST}</small></button>
        <button class="btn gift" id="btn-forge10" ${offAttr(w.gem < gacha.TEN_COST || room < 10, room < 10 ? '背包空位不到 10 格' : '寶石不足')}>十連<small>${iconTag(ICON.diamond, 14)}${gacha.TEN_COST}</small></button>
      </div>
      <div class="g-btns">
        <button class="btn" id="btn-ftick1" ${offAttr(w.gearTicket < 1 || room < 1, room < 1 ? '背包滿了' : '沒有裝備召喚券')}>用券單抽<small>${iconTag(ICON.gearTicket, 14)}1</small></button>
        <button class="btn" id="btn-ftick10" ${offAttr(w.gearTicket < 10 || room < 10, room < 10 ? '背包空位不到 10 格' : '裝備召喚券不到 10 張')}>用券十連<small>${iconTag(ICON.gearTicket, 14)}10</small></button></div>
      <div class="g-rates">${gacha.FORGE_RATES.map(r => `<span>${r.name}</span><b>${(r.p * 100).toFixed(1)}%</b>`).join('')}</div>
      <p class="hint">傳家武器：每位初始英雄一把，主職業是那位英雄時才有專屬特效。刻印套裝：不死鳥、暴風、死神、星落。</p>`;
  } else if (gachaTab === 'res') {
    const free = gacha.resFreeLeft(save), gp = gacha.resGoldPrice(save);
    body = `<div class="g-banner res"><b>補給召喚</b><small>金幣、魔晶、符石、坐騎經驗、萬能碎片、召喚券（不會抽到寶石）</small></div>
      <div class="g-btns">
        <button class="btn ${free ? 'gift' : ''}" id="btn-res-free" ${offAttr(!free, '今天的免費抽已經用了')}>免費抽<small>每天 1 次</small></button>
        <button class="btn" id="btn-res-gold" ${offAttr(!gp || save.gold < gp, !gp ? '今天的金幣抽用完了' : '金幣不足')}>金幣抽<small>${gp ? iconTag(ICON.gold, 14) + fmt(gp) : '明天再來'}</small></button>
      </div>
      <div class="g-btns">
        <button class="btn" id="btn-res1" ${offAttr(w.gem < gacha.RES_COST, '寶石不足')}>單抽<small>${iconTag(ICON.diamond, 14)}${gacha.RES_COST}</small></button>
        <button class="btn" id="btn-res10" ${offAttr(w.gem < gacha.RES_TEN, '寶石不足')}>十連<small>${iconTag(ICON.diamond, 14)}${gacha.RES_TEN}</small></button>
      </div>
      <div class="g-rates">${gacha.RES_RATES.map(r => `<span>${r.name}</span><b>${(r.p * 100).toFixed(1)}%</b>`).join('')}</div>`;
  } else {
    const items = gacha.DUST_SHOP.map(it => {
      const left = gacha.dustLeft(save, it);
      return `<div class="q-row"><span><b>${it.name}</b><small>本月剩 ${left} 次</small></span>
        <button class="btn small" data-dust="${it.id}" ${offAttr(left <= 0 || w.stardust < it.cost || (it.need && !dustOk(it)), left <= 0 ? '本月已買完' : it.need && !dustOk(it) ? '先在下面選一位' + heroP.RARITY[it.need].name + '英雄' : '星塵不足')}>${iconTag(ICON.stardust, 14)}${it.cost}</button></div>`;
    }).join('');
    const pickable = HEROES.filter(h => h.gacha && ['rare', 'elite'].includes(heroP.rarityOf(h)));
    body = `<p class="hint">每次召喚送 ${gacha.DUST_PER_PULL} 星塵，抽不到想要的也能慢慢換。</p>
      <div class="q-list">${items}</div>
      <p class="hint">自選碎片要給誰：</p>
      <div class="dust-heroes">${pickable.map(h => `<button class="dust-h ${dustHero === h.id ? 'sel' : ''}" data-dusth="${h.id}" style="--rc:${heroP.RARITY[heroP.rarityOf(h)].color}">${iconTag(heroRef(h), 28)}<small>${h.name.split(' ')[1]}</small></button>`).join('')}</div>`;
  }
  $('gacha-body').innerHTML = `
    <h2>扭蛋</h2>
    <div class="wallet-row">${['gem', gachaTab === 'forge' ? 'gearTicket' : 'heroTicket', 'stardust'].map(k => `<span class="pill">${iconTag(eco.CUR[k].icon, 18)} <b>${fmt(w[k])}</b></span>`).join('')}<span class="pill">萬能碎片 <b>${fmt(w.anyFrag || 0)}</b></span></div>
    ${gachaResult ? '' : `<div class="vtabs">${tabs.map(([k, n]) => `<button class="vtab ${gachaTab === k ? 'sel' : ''}" data-gtab="${k}">${n}${k === 'res' && gacha.resFreeLeft(save) ? ' •' : ''}</button>`).join('')}</div>`}
    ${body}
    ${gachaResult ? '' : '<button class="btn" id="btn-gacha-close">關閉</button>'}`;
}
// 3.8 主打傳奇
function featBox(g) {
  const f = gacha.featuredLegend();
  if (!f) return '';
  return `<div class="feat"><span class="feat-ic">${iconTag(heroRef(f), 44)}</span><span><b>主打傳奇：${f.name}</b><small>${f.role}・還剩 ${gacha.featuredDaysLeft()} 天</small>
    <small>傳奇保底 ${g.hero.sinceLegend}/${gacha.LEGEND_HARD}（${gacha.LEGEND_SOFT} 抽起機率上升）・${g.hero.lost ? '<b class="big-pity">下一隻傳奇必定是主打！</b>' : '抽到傳奇有 70% 是主打'}</small></span></div>`;
}
const dustOk = it => { const h = HEROES.find(x => x.id === dustHero); return h && heroP.rarityOf(h) === it.need; };
const bagRoomLeft = () => MAX_ITEMS - ensureGear(save).items.length;
function showPull(out) {
  if (out === 'bag') { toast('背包空位不夠，先分解或合成一些裝備'); return; }
  if (!out) { toast('不夠，無法召喚'); return; }
  writeSave(save); // 先存檔再播動畫
  gachaResult = out;
  const best = out.some(o => o.r === 'legend') ? 'legend' : out.some(o => o.r === 'elite') ? 'elite' : out.some(o => o.r === 'rare') ? 'rare' : null;
  sfx(best === 'legend' || best === 'elite' ? 'jackpot' : 'jingle');
  const sp = out.find(o => o.kind === 'item' && o.special);
  if (sp) setTimeout(() => banner(`${sp.it.heir ? '傳家武器' : '刻印套裝'}：${itemName(sp.it)}！`), 900);
  if (out.some(o => o.kind === 'hero' && o.isNew)) setTimeout(() => banner(`新英雄：${out.find(o => o.kind === 'hero' && o.isNew).def.name.split(' ')[1]}！`), 900);
  renderGacha();
}
$('gacha-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  const ch = balChapter(save), nb = gachaTab === 'newbie';
  if (t.dataset.gtab) gachaTab = t.dataset.gtab;
  else if (t.id === 'btn-g-rates') gachaShowRates = !gachaShowRates;
  else if (t.id === 'btn-pull1') return showPull(gacha.pullHero(save, 1, 'gem', ch, nb));
  else if (t.id === 'btn-pull10') return showPull(gacha.pullHero(save, 10, 'gem', ch, nb));
  else if (t.id === 'btn-tick1') return showPull(gacha.pullHero(save, 1, 'ticket', ch));
  else if (t.id === 'btn-tick10') return showPull(gacha.pullHero(save, 10, 'ticket', ch));
  else if (t.id === 'btn-forge1') return showPull(gacha.pullForge(save, 1, 'gem', ch));
  else if (t.id === 'btn-forge10') return showPull(gacha.pullForge(save, 10, 'gem', ch));
  else if (t.id === 'btn-ftick1') return showPull(gacha.pullForge(save, 1, 'ticket', ch));
  else if (t.id === 'btn-ftick10') return showPull(gacha.pullForge(save, 10, 'ticket', ch));
  else if (t.id === 'btn-res-free') return showPull(gacha.pullRes(save, 1, 'free', ch));
  else if (t.id === 'btn-res-gold') return showPull(gacha.pullRes(save, 1, 'gold', ch));
  else if (t.id === 'btn-res1') return showPull(gacha.pullRes(save, 1, 'gem', ch));
  else if (t.id === 'btn-res10') return showPull(gacha.pullRes(save, 10, 'gem', ch));
  else if (t.id === 'btn-g-again') { gachaResult = null; if (gachaTab === 'newbie' && save.gacha.newbie <= 0) gachaTab = 'hero'; }
  else if (t.dataset.dusth) dustHero = t.dataset.dusth;
  else if (t.dataset.dust) { if (gacha.buyDust(save, t.dataset.dust, dustHero)) { sfx('coin'); toast('兌換成功'); writeSave(save); } }
  else if (t.id === 'btn-gacha-close') { writeSave(save); playMusic('home'); renderHome(); showScreen('screen-home'); return; }
  renderGacha();
});

// ---------- 3.2 信箱 ----------
function openMail() {
  renderMail();
  showScreen('screen-mail', 'screen-home');
}
function renderMail() {
  const list = save.mail.length ? save.mail.map(m => `<div class="mail ${m.got ? 'got' : ''}">
      ${iconTag(ICON.mail, 28)}<span><b>${m.title}</b><small>${m.text}</small><span class="mail-gift">${giftTag(m.gift, 14)}</span></span>
      ${m.got ? '<span class="ach-ok">已領取</span>' : `<button class="btn small gift" data-mail="${m.id}">領取</button>`}
    </div>`).join('') : '<p class="hint">信箱是空的</p>';
  $('mail-body').innerHTML = `
    <h2>信箱</h2>
    <div class="mail-list">${list}</div>
    <div class="row">
      <button class="btn small gift" id="btn-mail-all" ${offAttr(!eco.unreadMail(save), '沒有可以領的信')}>全部領取</button>
      <button class="btn small" id="btn-mail-close">關閉</button>
    </div>`;
}
$('mail-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  if (t.id === 'btn-mail-close') { writeSave(save); renderHome(); showScreen('screen-home'); return; }
  const ids = t.id === 'btn-mail-all' ? save.mail.filter(m => !m.got).map(m => m.id) : t.dataset.mail ? [t.dataset.mail] : [];
  const sum = {};
  for (const id of ids) { const g = eco.claimMail(save, id); if (g) for (const [k, v] of Object.entries(g)) sum[k] = (sum[k] || 0) + v; }
  if (ids.length) { sfx('jingle'); celebrate(t, '#7fe8ff'); toast('獲得 ' + eco.giftText(sum)); writeSave(save); }
  renderMail();
});

// ---------- 無盡塔 ----------
function openEndless() {
  const recs = save.records || [];
  const rows = recs.map((r, i) => {
    const h = HEROES.find(x => x.id === r.hero) || HEROES[0];
    const h2 = r.hero2 && HEROES.find(x => x.id === r.hero2);
    return `<div class="rec ${i === 0 ? 'top' : ''}"><b>${i + 1}</b>${iconTag(heroRef(h), 24)}${h2 ? iconTag(heroRef(h2), 18) : ''}<span>${h.name.split(' ')[1]}${h2 ? '＋' + h2.name.split(' ')[1] : ''}・${difficultyOf(r.diff).name}</span><em>${r.wave} 層</em><small>${r.date.slice(5)}</small></div>`;
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

// ---------- 3.7 挑戰：每日副本、魔王連戰、試煉塔 ----------
let modesTab = 'dungeon', dgPick = null, dgTier = 1;
function modesBadge() {
  if (anyChapter(save) < 2) return false;
  modes.ensureModes(save);
  return save.dungeon.left > 0;
}
function openModes() {
  modes.ensureModes(save);
  renderModes();
  showScreen('screen-modes', 'screen-home');
}
const rushDiff = () => (save.difficulty === 'casual' ? 'easy' : save.difficulty);
const modeCh = diffId => Math.max(1, maxCh(save, diffId) - 1);
function renderModes() {
  modes.ensureModes(save);
  const tabs = [['dungeon', '每日副本'], ['rush', '魔王連戰'], ['trial', '試煉塔'], ['endless', '無盡塔']];
  let body = '';
  if (modesTab === 'dungeon') {
    const ids = Object.keys(modes.DUNGEONS);
    if (!dgPick || !modes.dungeonOpen(dgPick)) dgPick = ids.find(modes.dungeonOpen);
    const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
    const cards = ids.map(id => {
      const d = modes.DUNGEONS[id], open = modes.dungeonOpen(id);
      return `<button class="dg-card ${dgPick === id ? 'sel' : ''} ${open ? '' : 'closed'}" data-dg="${id}" ${offAttr(!open, `星期${DAYS[d.day]}和週末開放`)}>${iconTag(d.icon, 28)}<b>${d.name}</b><small>${open ? d.desc : '星期' + DAYS[d.day]}</small></button>`;
    }).join('');
    const tiers = [1, 2, 3, 4, 5].map(t => `<button class="dg-tier ${dgTier === t ? 'sel' : ''}" data-dgt="${t}" ${offAttr(!modes.tierOpen(save, t), `先開放「${difficultyOf(modes.D_TIERS[t - 1]).name}」難度`)}>${modes.tierName(t).replace('第 ', '').replace(' 階', '')}${(save.dungeon.best[dgPick] || 0) >= t ? '✓' : ''}</button>`).join('');
    const ch = modeCh(modes.D_TIERS[dgTier - 1]);
    const left = save.dungeon.left;
    body = `<p class="hint">每天 ${modes.DUNGEON_TRIES} 次（掃蕩也算）。星期一～五各開一種，週末全開。5 波，最後一波是魔王。</p>
      <div class="dg-cards">${cards}</div>
      ${dgPick ? `<div class="dg-tiers"><span>階級</span>${tiers}</div>
      <p class="dg-info"><b>${modes.DUNGEONS[dgPick].name}・${modes.tierName(dgTier)}</b>（${difficultyOf(modes.D_TIERS[dgTier - 1]).name}難度・第 ${ch} 章強度）<br>獎勵：${modes.rewardText(modes.dungeonReward(dgPick, dgTier, ch))}</p>
      <div class="g-btns">
        <button class="btn gift" id="btn-dg-go" ${offAttr(left <= 0, '今天的次數用完了')}>挑戰<small>剩 ${left} 次</small></button>
        <button class="btn" id="btn-dg-sweep" ${offAttr(left <= 0 || !modes.canSweep(save, dgPick, dgTier), left <= 0 ? '今天的次數用完了' : '先通關這一階才能掃蕩')}>掃蕩<small>直接拿獎勵</small></button>
      </div>` : ''}`;
  } else if (modesTab === 'rush') {
    const d = difficultyOf(rushDiff());
    body = `<p class="hint">連打 5 隻魔王，中間可以買技能。每週照打倒的數量給一次寶石（每週一重置）。使用目前難度（${d.name}・第 ${modeCh(d.id)} 章強度）。</p>
      <div class="rush-row">${modes.RUSH_GEMS.map((g, i) => `<span class="rush-b ${save.rush.best > i ? 'done' : ''}">${iconTag(['dg', 108], 22)}<small>第 ${i + 1} 隻</small><b>${iconTag(ICON.diamond, 12)}${g}</b></span>`).join('')}</div>
      <p class="dg-info">本週最佳：<b>${save.rush.best}/5</b></p>
      <button class="btn big gift" id="btn-rush-go">開始魔王連戰</button>`;
  } else if (modesTab === 'trial') {
    const f = save.trial.floor || 0, start = modes.trialStart(save);
    body = `<p class="hint">100 層的試煉。每次從最近的 10 層檢查點開始往上爬，打到倒下為止；每 10 層一隻魔王。新層數給金幣，每 5 層 20 寶石，每 10 層一張召喚券。</p>
      <div class="trial-bar"><i style="width:${f}%"></i><span>最高 ${f} / ${modes.TRIAL_TOP} 層</span></div>
      <p class="dg-info">這次從 <b>第 ${start} 層</b> 開始（中級難度・第 ${Math.ceil(start / 10)} 章強度）</p>
      <button class="btn big gift" id="btn-trial-go" ${offAttr(f >= modes.TRIAL_TOP, '已經登頂了！')}>${f >= modes.TRIAL_TOP ? '已登頂' : '開始挑戰'}</button>`;
  }
  $('modes-body').innerHTML = `
    <h2>挑戰</h2>
    <div class="vtabs">${tabs.map(([k, n]) => `<button class="vtab ${modesTab === k ? 'sel' : ''}" data-mtab="${k}">${n}${k === 'dungeon' && save.dungeon.left > 0 ? ' •' : ''}</button>`).join('')}</div>
    ${body}
    <button class="btn ghost" id="btn-modes-close">關閉</button>`;
}
$('modes-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  if (t.dataset.mtab) { if (t.dataset.mtab === 'endless') { openEndless(); return; } modesTab = t.dataset.mtab; }
  else if (t.dataset.dg) dgPick = t.dataset.dg;
  else if (t.dataset.dgt) dgTier = +t.dataset.dgt;
  else if (t.id === 'btn-dg-go') {
    save.dungeon.left--;
    writeSave(save);
    startRun({ chapter: modeCh(modes.D_TIERS[dgTier - 1]), spec: modes.dungeonRun(dgPick, dgTier) });
    return;
  } else if (t.id === 'btn-dg-sweep') {
    const lines = modes.sweep(save, dgPick, dgTier, modeCh(modes.D_TIERS[dgTier - 1]));
    if (lines) { sfx('jingle'); celebrate(t, '#ffd84a'); toast('掃蕩完成：' + lines.join('、')); eco.track(save, 'daily'); writeSave(save); }
  } else if (t.id === 'btn-rush-go') {
    writeSave(save);
    startRun({ chapter: modeCh(rushDiff()), spec: { ...modes.rushRun(), diffId: rushDiff() } });
    return;
  } else if (t.id === 'btn-trial-go') {
    writeSave(save);
    startRun({ spec: modes.trialRun(save) });
    return;
  } else if (t.id === 'btn-modes-close') { writeSave(save); renderHome(); showScreen('screen-home'); return; }
  renderModes();
});

// ---------- 3.9 戰役地圖 ----------
const starTag = (n, size = 12) => `<span class="stars" style="--ss:${size}px">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span>`;
let mapSel = null; // { ch, k }  k = null 主線、'e' 精英關、't' 寶藏關
function openMap() {
  camp.ensureCampaign(save);
  mapSel = { ch: save.chapter, k: null };
  renderMap();
  showScreen('screen-map', 'screen-home');
  setTimeout(() => { const el = document.querySelector('.mnode.sel'); if (el) el.scrollIntoView({ block: 'center' }); }, 30);
}
function renderMap() {
  const d = save.difficulty, top = maxCh(save, d), total = camp.totalStars(save, d);
  const N = Math.max(camp.MAP_CHAPTERS, Math.min(top, 99));
  let nodes = '';
  for (let ch = N; ch >= 1; ch--) {
    const lock = ch > top, side = camp.sideOpen(save, d, ch);
    const c = CHAPTERS[(ch - 1) % CHAPTERS.length];
    const sel = mapSel && mapSel.ch === ch;
    const sideBtn = k => `<button class="mside ${camp.sideDone(save, d, ch, k) ? 'done' : ''} ${sel && mapSel.k === k ? 'sel' : ''}" data-mside="${ch}${k}" ${offAttr(!side, '先通關這一章')}>${iconTag(camp.SIDES[k].icon, 18)}</button>`;
    nodes += `<div class="mrow ${ch % 2 ? 'l' : 'r'}">
      ${sideBtn('e')}
      <button class="mnode ${lock ? 'lock' : ''} ${sel && !mapSel.k ? 'sel' : ''} ${ch === top ? 'cur' : ''}" data-mch="${ch}" ${offAttr(lock, `先通關第 ${ch - 1} 章`)} style="--mc:url(assets/bg/${c.sky}-a.png)">
        <b>${ch}</b><small>${chapterName(ch)}</small>${lock ? '<i>未開放</i>' : starTag(camp.starsOf(save, d, ch))}
      </button>
      ${sideBtn('t')}
    </div>`;
  }
  let info = '';
  if (mapSel) {
    const { ch, k } = mapSel;
    if (!k) info = `<b>第 ${ch} 章 ${chapterName(ch)}</b><small>${boardOf(ch).rule}</small><small>星星：${camp.STAR_RULES.join('・')}</small>
      <button class="btn gift" id="btn-map-go" ${offAttr(ch > top, '還沒開放')}>出發（${difficultyOf(d).name}）</button>`;
    else info = `<b>第 ${ch} 章・${camp.SIDES[k].name}</b><small>${camp.SIDES[k].desc}${camp.sideDone(save, d, ch, k) ? '（獎勵已領，可以再玩）' : ''}</small>
      <button class="btn gift" id="btn-side-go" ${offAttr(!camp.sideOpen(save, d, ch), '先通關這一章')}>挑戰</button>`;
  }
  const chests = camp.STAR_CHESTS.map(c => {
    const open = camp.chestOpen(save, d, c.need), ready = !open && total >= c.need;
    return `<button class="mchest ${open ? 'open' : ready ? 'ready' : ''}" data-mchest="${c.need}" ${offAttr(!ready, open ? '已經領過了' : `集滿 ${c.need} 顆星`)}>${iconTag(open ? ICON.chestOpen : ICON.chest, 22)}<small>${c.need}★</small></button>`;
  }).join('');
  $('map-body').innerHTML = `
    <h2>戰役地圖・${difficultyOf(d).name}</h2>
    <div class="mtop"><span class="pill">★ <b>${total}</b> / ${camp.MAP_CHAPTERS * 3}</span><span class="mchests">${chests}</span></div>
    <div class="mpath">${nodes}</div>
    <div class="minfo">${info}</div>
    <button class="btn ghost" id="btn-map-close">關閉</button>`;
}
$('map-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  const d = save.difficulty;
  if (t.dataset.mch) mapSel = { ch: +t.dataset.mch, k: null };
  else if (t.dataset.mside) mapSel = { ch: parseInt(t.dataset.mside, 10), k: t.dataset.mside.slice(-1) };
  else if (t.dataset.mchest) { const g = camp.claimChest(save, d, +t.dataset.mchest); if (g) { sfx('jackpot'); celebrate(t, '#ffd84a'); toast('星星寶箱：' + eco.giftText(g)); writeSave(save); } }
  else if (t.id === 'btn-map-go') { save.chapter = mapSel.ch; writeSave(save); startRun({ chapter: mapSel.ch }); return; }
  else if (t.id === 'btn-side-go') { writeSave(save); startRun({ chapter: mapSel.ch, spec: camp.sideRun(mapSel.ch, mapSel.k) }); return; }
  else if (t.id === 'btn-map-close') { renderHome(); showScreen('screen-home'); return; }
  const y = $('screen-map').scrollTop;
  renderMap();
  $('screen-map').scrollTop = y;
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
    const it = equippedIn(save, slot);
    return it ? `<span class="gs r${it.rarity}" style="--rc:${RARITIES[it.rarity].color}">${iconTag(itemIcon(it), 18)}</span>` : '<span class="gs empty"></span>';
  }).join('');
  const m = mergeableCount(save);
  const fresh = freshCount(save);
  return `<b>背包</b>${slots}<small>戰力 ${fmt(savePower(save))}・${gear.items.length}/${MAX_ITEMS}${m ? `・可合成 ${m}` : ''}</small>${fresh ? `<b class="badge">${fresh}</b>` : ''}`;
}

let gearSel = null; // 目前點選的裝備 id
function openGear() {
  renderGear();
  showScreen('screen-gear', 'screen-home');
}
let gearTab = 'all', gearSort = 'rarity', gearView = 'equip', gemPick = null, craftType = 'weapon';
// 鑲嵌時挑寶石的清單
function gemPicker() {
  const gems = Object.entries(ensureGear(save).gems).filter(([, n]) => n > 0).sort((a, b) => parseGem(b[0]).lv - parseGem(a[0]).lv);
  if (!gems.length) return '<p class="hint">還沒有符石：冒險結束會掉落符石</p>';
  return `<div class="gem-pick">${gems.map(([k, n]) => `<button class="gpk" data-putgem="${k}">${gemTag(k, 14)}<small>${gemName(k)} x${n}</small></button>`).join('')}</div>`;
}
// 寶石頁：所有寶石＋一鍵合成
function gemsView() {
  const gear = ensureGear(save);
  const rows = Object.keys(GEMS).map(id => {
    const cells = [];
    for (let lv = 1; lv <= GEM_MAX; lv++) {
      const k = `${id}-${lv}`;
      const n = gear.gems[k] || 0;
      cells.push(`<span class="gcell ${n ? '' : 'none'}">${gemTag(k, 10 + lv * 3)}<small>${n ? 'x' + n : ''}</small></span>`);
    }
    return `<div class="grow"><b>${GEMS[id].name}</b><small>${STATS[GEMS[id].stat].name}</small><span class="gcells">${cells.join('')}</span></div>`;
  }).join('');
  const canMerge = Object.entries(gear.gems).some(([k, n]) => n >= 3 && parseGem(k).lv < GEM_MAX);
  return `<p class="hint">裝備上有鑲嵌孔（稀有 1 孔、史詩 1 孔、傳說 2 孔、神話 3 孔）。點裝備的孔就能鑲嵌；分解或合成裝備時符石會退回。同一件裝備，同種符石只能鑲一顆。</p>
    <div class="gem-list">${rows}</div>
    <button class="btn" id="btn-gem-merge" ${offAttr(!canMerge, '需要 3 顆同種、同等級的符石')}>一鍵合成符石（3 顆 → 高一級）</button>`;
}
// 鍛造頁：指定種類打造
function craftView() {
  const gear = ensureGear(save);
  const types = Object.keys(TYPES).map(t => `<button class="ctype ${craftType === t ? 'sel' : ''}" data-ctype="${t}">${iconTag(['ic', TYPES[t].icons[2], '#fdf3d8'], 22)}<small>${TYPES[t].name}</small></button>`).join('');
  const tiers = CRAFT_TIERS.map((t, i) => {
    const total = t.weights.reduce((a, b) => a + b, 0);
    const odds = t.weights.map((w, r) => w ? `<i style="color:${RARITIES[r].color}">${RARITIES[r].name} ${Math.round(w / total * 100)}%</i>` : '').join(' ');
    const why = gear.items.length >= MAX_ITEMS ? '背包滿了' : gear.shards < t.shards ? `魔晶不足（需要 ${t.shards}）` : save.gold < t.gold ? `金幣不足（需要 ${fmt(t.gold)}）` : '';
    return `<div class="ctier"><span><b>${t.name}</b><small>${odds}</small></span><button class="btn small gift" data-craft="${i}" ${offAttr(!!why, why)}>✦${t.shards}・${iconTag(ICON.gold, 11)}${fmt(t.gold)}</button></div>`;
  }).join('');
  return `<p class="hint">選一種裝備，用魔晶和金幣打造。打造出來的裝備等級 = 平衡難度（休閒以外）打到的最高章節（Lv.${Math.min(10, balChapter(save))}）。</p>
    <div class="ctypes">${types}</div>${tiers}`;
}
// 裝備方案：存下身上的整套裝備，一鍵換回
function presetRow() {
  const ps = ensureGear(save).presets;
  return `<div class="presets">${ps.map((p, i) => `<span class="pre"><button class="pre-use ${p ? '' : 'empty'}" data-preuse="${i}" ${offAttr(!p, '這個方案還沒存，先按「存」')}>方案 ${i + 1}</button><button class="pre-save" data-presave="${i}">存</button></span>`).join('')}</div>`;
}
const GEAR_TABS = { all: '全部', weapon: '武器', def: '防具', jewel: '飾品' };
const tabOf = it => it.type === 'weapon' ? 'weapon' : TYPES[it.type].jewel ? 'jewel' : 'def';
const bonusChips = b => {
  const chips = Object.keys(STATS).filter(k => b[k]).map(k => {
    const v = STATS[k].unit === '%' ? Math.round(b[k] * 1000) / 10 + '%' : Math.round(b[k] * 10) / 10;
    return `<span class="chip">${STATS[k].name} <b>+${v}</b></span>`;
  });
  for (const [id, p] of Object.entries(b.skills || {})) chips.push(`<span class="chip jewel">${JEWEL_SKILLS[id].name}</span>`);
  return chips.join('') || '<span class="chip">還沒有穿裝備</span>';
};
// 身上的套裝進度：例如「狂戰 3/4」，達成的效果亮起來
function setStrip() {
  const sets = Object.entries(gearBonus(save).sets);
  if (!sets.length) return '';
  return `<div class="set-strip">${sets.map(([id, n]) => `<span class="setp ${n >= 4 ? 'full' : n >= 2 ? 'half' : ''}" style="--sc:${SETS[id].color}">${SETS[id].name} ${n}/4</span>`).join('')}</div>`;
}
// 一件裝備的完整說明（主屬性、副屬性、附魔、飾品技能）
function itemLines(it, withTools) {
  const sm = starMax(it);
  let h = `${sm ? `<p class="il istar">${'★'.repeat(it.star || 0)}${'☆'.repeat(sm - (it.star || 0))} <small>每星主、副屬性 +10%</small></p>` : ''}<p class="il ilv">裝備等級 Lv.${it.ilv || 1}${it.set ? `・<b style="color:${SETS[it.set].color}">${SETS[it.set].name}套裝</b>` : ''}</p><p class="il main">${statText(it.main, mainValue(it))}${it.plus ? ` <small>（強化 +${it.plus}）</small>` : ''}</p>`;
  it.affixes.forEach((a, i) => { h += `<p class="il">${statText(a.stat, Math.round(a.value * (1 + 0.1 * (it.star || 0)) * 10) / 10)}${withTools ? ` <button class="rf" data-reforge="${i}" aria-label="重鑄">↻</button>` : ''}</p>`; });
  if (it.ench) h += `<p class="il ench">✦ 附魔：${statText(it.ench.stat, it.ench.value)}</p>`;
  if (it.heir) {
    const hd = HEROES.find(x => x.id === it.heir), on = save.selected === it.heir;
    h += `<p class="il uniq ${on ? '' : 'locked'}">★ ${HEIRLOOMS[it.heir].sig ? '專武' : '傳家'}：${hd.name.split(' ')[1]}當主職業時，攻擊力 +${10 + (it.star || 0) * 3}%、${HEIRLOOMS[it.heir].desc(it.star || 0)}</p>`;
  }
  if (it.uniq) h += `<p class="il uniq">★ 傳說特效「${UNIQUES[it.uniq].name}」：${UNIQUES[it.uniq].desc}</p>`;
  if (it.set) {
    const n = gearBonus(save).sets[it.set] || 0;
    const st = SETS[it.set];
    h += `<p class="il set ${n >= 2 ? 'on' : ''}">(2) ${st.d2}</p><p class="il set ${n >= 4 ? 'on' : ''}">(4) ${st.d4}</p>`;
  }
  if (it.skill) {
    const sk = JEWEL_SKILLS[it.skill];
    const p = jewelPower(it);
    const t = jewelTier(it.jlv);
    h += `<p class="il jskill ${p ? '' : 'locked'}">◆ ${sk.name}：${p ? sk.desc(p) : 'Lv.3 解鎖'}${t && t < 3 ? `<small>（Lv.${t === 1 ? 6 : 10} 再強化）</small>` : ''}</p>`;
  }
  return h;
}

function renderGear() {
  const gear = ensureGear(save);
  const hero = HEROES.find(h => h.id === save.selected) || HEROES[0];
  // 紙娃娃：左邊防具、右邊武器與飾品
  const slotBtn = slot => {
    const it = equippedIn(save, slot);
    return `<button class="slot ${it ? 'r' + it.rarity : 'empty'} ${it && gearSel === it.id ? 'sel' : ''}" data-slot="${slot}" style="--rc:${it ? RARITIES[it.rarity].color : '#555'}">
      ${it ? iconTag(itemIcon(it), 26) : `<i>${SLOTS[slot].name}</i>`}${it && it.plus ? `<em class="plus">+${it.plus}</em>` : ''}${it && it.ench ? '<em class="en">✦</em>' : ''}</button>`;
  };
  let list = gear.items.filter(it => gearTab === 'all' || tabOf(it) === gearTab);
  list = list.slice().sort(gearSort === 'new' ? (a, c) => c.id - a.id : (a, c) => c.rarity - a.rarity || (c.plus || 0) - (a.plus || 0) || a.type.localeCompare(c.type));
  const cells = list.map(it => `
    <button class="item r${it.rarity} ${isWorn(save, it.id) ? 'worn' : ''} ${gearSel === it.id ? 'sel' : ''}" data-item="${it.id}" style="--rc:${RARITIES[it.rarity].color}" aria-label="${itemName(it)}">
      ${iconTag(itemIcon(it), 24)}${isWorn(save, it.id) ? '<em>E</em>' : it.fresh ? '<em class="new">新</em>' : ''}${it.plus ? `<i class="plus">+${it.plus}</i>` : ''}${it.ench ? '<i class="en">✦</i>' : ''}${it.set ? `<i class="setdot" style="--sc:${SETS[it.set].color}"></i>` : ''}${it.uniq || it.heir ? '<i class="uq">★</i>' : ''}${it.star ? `<i class="istar-b">${it.star}★</i>` : ''}${isBetter(save, it) ? '<b class="better">▲</b>' : ''}</button>`);
  const empties = gearTab === 'all' ? Math.max(0, MAX_ITEMS - gear.items.length) : (6 - list.length % 6) % 6;
  for (let i = 0; i < empties; i++) cells.push('<span class="item empty-cell"></span>');
  const sel = gear.items.find(x => x.id === gearSel);
  const m = mergeableCount(save);
  const tabs = Object.entries(GEAR_TABS).map(([k, n]) => {
    const c = k === 'all' ? gear.items.length : gear.items.filter(it => tabOf(it) === k).length;
    return `<button class="gtab ${gearTab === k ? 'sel' : ''}" data-tab="${k}">${n}<small>${c}</small></button>`;
  }).join('');
  let detail = '<small class="hint">點一件裝備看詳細、強化、附魔</small>';
  if (sel) {
    const worn = isWorn(save, sel.id);
    const cur = worn ? null : equippedIn(save, targetSlot(save, sel));
    const r = RARITIES[sel.rarity];
    const maxed = (sel.plus || 0) >= MAX_PLUS;
    detail = `
      <div class="gd-top">
        <span class="gd-ic" style="--rc:${r.color}">${iconTag(itemIcon(sel), 34)}</span>
        <span class="gd-info"><b style="color:${r.color}">${itemName(sel)} <i class="rar" style="--rc:${r.color}">${r.name}${TYPES[sel.type].name}</i></b>
          ${itemLines(sel, true)}
          ${sel.sockets && sel.sockets.length ? `<div class="socks">${sel.sockets.map((g, i) => `<button class="sock ${g ? 'on' : ''} ${gemPick === i ? 'pick' : ''}" data-sock="${i}">${g ? gemTag(g, 14) + `<small>${statText(GEMS[parseGem(g).id].stat, gemValue(g))}</small>` : '<small>＋ 鑲嵌符石</small>'}</button>`).join('')}</div>` : ''}
          ${gemPick !== null && sel.sockets && sel.sockets[gemPick] === null ? gemPicker() : ''}
          <small class="rf-hint">↻ = 重鑄這條副屬性（✦${reforgeCost(sel).shards} 魔晶＋${fmt(reforgeCost(sel).gold)} 金幣）</small>
          ${sel.skill ? `<span class="jlv">飾品 Lv.${sel.jlv}/${JEWEL_MAX_LV}${sel.jlv < JEWEL_MAX_LV ? `<i style="width:${(sel.jexp || 0) / jewelExpNeed(sel.jlv) * 100}%"></i>` : ''}</span>` : ''}
          ${cur ? `<small class="cmp">身上：${itemName(cur)}（${itemDesc(cur)}）${isBetter(save, sel) ? ' <b class="better">▲ 這件比較好</b>' : ''}</small>` : ''}
        </span>
      </div>
      <div class="gd-btns">
        ${worn ? `<button class="btn small" id="btn-unequip">卸下</button>` : `<button class="btn small gift" id="btn-equip">裝備</button>`}
        <button class="btn small" id="btn-enhance" data-repeat ${offAttr(maxed || save.gold < enhanceCost(sel), maxed ? '已經強化到 +15' : `金幣不足，還差 ${enhanceCost(sel) - save.gold}`)}>強化${maxed ? ' MAX' : `<small>${iconTag(ICON.gold, 11)}${fmt(enhanceCost(sel))}・${Math.round(enhanceRate(sel) * 100)}%</small>`}</button>
        <button class="btn small" id="btn-enchant" ${offAttr(gear.shards < enchantCost(sel), `魔晶不足（需要 ${enchantCost(sel)}）`)}>${sel.ench ? '重新附魔' : '附魔'}<small>✦${enchantCost(sel)} 魔晶</small></button>
        ${sel.skill ? `<button class="btn small" id="btn-refine" data-repeat ${offAttr(sel.jlv >= JEWEL_MAX_LV || gear.shards < REFINE_SHARDS, sel.jlv >= JEWEL_MAX_LV ? '飾品已經滿級' : `魔晶不足（需要 ${REFINE_SHARDS}）`)}>精煉<small>✦${REFINE_SHARDS}・+${REFINE_SHARDS * 15} 經驗</small></button>` : ''}
        ${starMax(sel) ? `<button class="btn small" id="btn-fuse" ${offAttr(!!whyNoFuse(save, sel), whyNoFuse(save, sel))}>熔鑄升星<small>${iconTag(ICON.gold, 11)}${fmt(fuseGold(sel))}${fuseFodder(save, sel)[0] ? '・吃掉 ' + itemName(fuseFodder(save, sel)[0]) : ''}</small></button>` : ''}
        ${transferDonor(save, sel) ? `<button class="btn small" id="btn-transfer" ${offAttr(gear.shards < TRANSFER_SHARDS, `魔晶不足（需要 ${TRANSFER_SHARDS}）`)}>轉移強化 +${transferDonor(save, sel).plus}<small>✦${TRANSFER_SHARDS}・從 ${itemName(transferDonor(save, sel))}</small></button>` : ''}
        <button class="btn small ghost" id="btn-lock">${sel.lock ? '解鎖' : '上鎖'}</button>
        <button class="btn small ghost" id="btn-salvage" ${offAttr(worn || sel.lock, worn ? '穿在身上的不能分解' : '上鎖的裝備不能分解')}>分解<small>${iconTag(ICON.gold, 11)}${r.salvage}・✦${r.shard}</small></button>
      </div>`;
  }
  const junk = gear.items.filter(it => it.rarity === 0 && !it.lock && !it.plus && !isWorn(save, it.id) && !isBetter(save, it)).length;
  $('gear-body').innerHTML = `
    <h2>背包</h2>
    <div class="gear-top"><span class="pill power">戰力 <b>${fmt(savePower(save))}</b></span><span class="pill">${iconTag(ICON.gold, 16)} <b>${fmt(save.gold)}</b></span><span class="pill shards">✦ <b>${gear.shards}</b> 魔晶</span></div>
    <div class="doll8">
      <div class="dcol">${slotBtn('helm')}${slotBtn('armor')}${slotBtn('gloves')}${slotBtn('boots')}</div>
      <span class="doll-hero">${iconTag(heroRef(hero), 64)}<small>${hero.name.split(' ')[1]}</small></span>
      <div class="dcol">${slotBtn('weapon')}${slotBtn('necklace')}${slotBtn('ring1')}${slotBtn('ring2')}</div>
    </div>
    <div class="vtabs">${[['equip', '裝備'], ['gems', '符石'], ['craft', '鍛造']].map(([k, n]) => `<button class="vtab ${gearView === k ? 'sel' : ''}" data-view="${k}">${n}</button>`).join('')}</div>
    ${gearView === 'gems' ? gemsView() : gearView === 'craft' ? craftView() : `
    <div class="chips">${bonusChips(gearBonus(save))}</div>
    ${setStrip()}
    ${presetRow()}
    <div class="item-detail">${detail}</div>`}
    <div class="gtabs">${tabs}<button class="gsort" id="btn-gsort">${gearSort === 'new' ? '最新' : '稀有度'} ⇅</button></div>
    <div class="cap"><i style="width:${gear.items.length / MAX_ITEMS * 100}%" class="${gear.items.length >= MAX_ITEMS - 4 ? 'full' : ''}"></i><span>背包 ${gear.items.length} / ${MAX_ITEMS}${gear.items.length >= MAX_ITEMS - 4 ? '・快滿了，記得分解或合成' : ''}</span></div>
    <div class="items">${cells.join('')}</div>
    <div class="row">
      <button class="btn small" id="btn-merge" ${offAttr(!m, '需要 3 件同種類、同稀有度的裝備（沒穿、沒上鎖）')}>合成升階${m ? `（${m}）` : ''}</button>
      <button class="btn small ghost" id="btn-junk" ${offAttr(!junk, '沒有可以分解的普通裝備')}>分解普通${junk ? `（${junk}）` : ''}</button>
      <button class="btn small ghost" id="btn-gear-close">關閉</button>
    </div>`;
}
$('gear-body').addEventListener('click', ev => {
  const t = ev.target.closest('button');
  if (!t || isOff(t)) return;
  sfx('tap');
  const gear = ensureGear(save);
  const sel = gear.items.find(x => x.id === gearSel);
  if (t.dataset.view) { gearView = t.dataset.view; gemPick = null; }
  else if (t.dataset.sock !== undefined) {
    const i = +t.dataset.sock;
    if (sel.sockets[i]) { unsocketGem(save, sel.id, i); toast('符石已取下'); gemPick = null; }
    else gemPick = gemPick === i ? null : i;
  } else if (t.dataset.putgem) {
    if (socketGem(save, sel.id, gemPick, t.dataset.putgem)) { sfx('buy'); celebrate(t, '#7fffd4'); toast(`鑲嵌：${gemName(t.dataset.putgem)}`); }
    else toast('同一件裝備，同種符石只能鑲一顆');
    gemPick = null;
  } else if (t.dataset.reforge !== undefined) {
    const c = reforgeCost(sel);
    const a = reforge(save, sel.id, +t.dataset.reforge);
    if (a) { sfx('wave'); toast(`重鑄成：${statText(a.stat, a.value)}`); }
    else toast(`重鑄需要 ✦${c.shards} 魔晶、${fmt(c.gold)} 金幣`);
  } else if (t.id === 'btn-gem-merge') {
    const n = mergeGems(save);
    if (n) { sfx('win'); banner(`合成 ${n} 顆符石！`); }
  } else if (t.dataset.ctype) craftType = t.dataset.ctype;
  else if (t.dataset.craft !== undefined) {
    const it = craft(save, craftType, +t.dataset.craft, balChapter(save));
    if (it) {
      sfx('win');
      celebrate(t, RARITIES[it.rarity].color);
      banner(`打造出 ${RARITIES[it.rarity].name}・${itemName(it)}！`);
      gearSel = it.id; gearView = 'equip';
    }
  } else if (t.dataset.preuse !== undefined) {
    if (loadPreset(save, +t.dataset.preuse)) { sfx('buy'); toast(`已換上方案 ${+t.dataset.preuse + 1}`); }
  } else if (t.dataset.presave !== undefined) {
    savePreset(save, +t.dataset.presave); sfx('tap'); toast(`目前的裝備已存成方案 ${+t.dataset.presave + 1}`);
  } else if (t.dataset.item) {
    gearSel = +t.dataset.item;
    gemPick = null;
    const it = gear.items.find(x => x.id === gearSel);
    if (it) it.fresh = false;
  } else if (t.dataset.tab) gearTab = t.dataset.tab;
  else if (t.id === 'btn-gsort') gearSort = gearSort === 'new' ? 'rarity' : 'new';
  else if (t.dataset.slot) {
    const id = gear.equip[t.dataset.slot];
    if (id) gearSel = id;
    else { const ty = SLOTS[t.dataset.slot].type; gearTab = ty === 'weapon' ? 'weapon' : TYPES[ty].jewel ? 'jewel' : 'def'; toast(`顯示所有${SLOTS[t.dataset.slot].name}`); }
  } else if (t.id === 'btn-equip') { equip(save, gearSel); sfx('buy'); }
  else if (t.id === 'btn-unequip') { for (const [k, v] of Object.entries(gear.equip)) if (v === gearSel) unequip(save, k); }
  else if (t.id === 'btn-enhance') {
    const r = enhance(save, gearSel);
    if (r === 'ok' || r === 'fail') eco.track(save, 'gear');
    if (r === 'ok') { sfx('buy'); toast(`強化成功：${itemName(sel)}`); if (sel.plus % 5 === 0) celebrate(t, '#ffd84a'); }
    else if (r === 'fail') { sfx('lose'); toast('強化失敗…（只扣金幣，等級不會掉）'); }
  } else if (t.id === 'btn-enchant') {
    const e = enchant(save, gearSel);
    if (e) { eco.track(save, 'gear'); sfx('wave'); celebrate(t, '#d06bff'); toast(`附魔：${statText(e.stat, e.value)}`); }
  } else if (t.id === 'btn-refine') {
    const ups = refine(save, gearSel);
    if (ups > 0) {
      sfx('win');
      const tier = jewelTier(sel.jlv);
      toast(`${itemName(sel)} 升到 Lv.${sel.jlv}${[3, 6, 10].includes(sel.jlv) ? `：飾品技能「${JEWEL_SKILLS[sel.skill].name}」${tier === 1 ? '解鎖' : '強化'}！` : ''}`);
      if ([3, 6, 10].includes(sel.jlv)) banner(`飾品技能：${JEWEL_SKILLS[sel.skill].name}！`);
    } else if (ups === 0) sfx('buy');
  } else if (t.id === 'btn-lock') { sel.lock = !sel.lock; }
  else if (t.id === 'btn-fuse') { const f = fuse(save, gearSel); if (f) { eco.track(save, 'gear'); sfx('maxup'); celebrate(t, '#ffd84a'); banner(`${itemName(sel)} 升到 ${sel.star} 星！`); } }
  else if (t.id === 'btn-transfer') { const d = transferPlus(save, gearSel); if (d) { sfx('buy'); toast(`強化 +${sel.plus} 已轉移到 ${itemName(sel)}`); } }
  else if (t.id === 'btn-salvage') { const r = salvage(save, gearSel); if (r) toast(`分解獲得 ${r.gold} 金幣、${r.shards} 魔晶`); gearSel = null; }
  else if (t.id === 'btn-junk') { const r = salvageJunk(save); toast(`分解 ${r.n} 件：${r.g} 金幣、${r.shards} 魔晶`); sfx('buy'); }
  else if (t.id === 'btn-merge') {
    const made = mergeAll(save);
    save.stats.merged += made.length;
    save.stats.legendMerged += made.filter(x => x.rarity >= 3).length;
    if (made.length) { eco.track(save, 'gear'); sfx('wave'); banner(`合成升階 ${made.length} 件！`); gearSel = made[made.length - 1].id; }
  } else if (t.id === 'btn-gear-close') {
    for (const it of gear.items) it.fresh = false;
    writeSave(save); renderHome(); showScreen('screen-home'); return;
  }
  writeSave(save);
  renderGear(); // 按住連續強化／精煉時，重畫後的新按鈕會接手繼續連點
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
  } else if (t.id === 'btn-credits') {
    showCredits();
    return;
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

// 製作群：使用到的免費素材與作者（CC-BY 的一定要列出來）
const CREDITS = [
  ['角色、怪物、圖示、介面、音效', 'Kenney（kenney.nl）', 'CC0'],
  ['彈窗面板', 'tiopalada「Mana Soul GUI」', 'CC0'],
  ['怪物、魔王、坐騎', 'Clint Bellanger「Tiny Creatures」', 'CC0'],
  ['扭蛋英雄', '0x72「DungeonTileset II」', 'CC0'],
  ['扭蛋膠囊、寶石與道具圖示', 'Airos「Toy Capsules」、SpriteAttack、7Soul1「496 RPG icons」', 'CC0'],
  ['平原、墓地、火山、天空背景', 'Ansimuz「Tall Forest」「Gothicvania Cemetery」「Mountain at Dusk」', 'CC0'],
  ['天空神殿背景', 'Ansimuz「Magic Cliffs」', 'CC-BY 3.0'],
  ['沙漠背景', 'Emcee Flesher「Rocky Desert」', 'CC0'],
  ['技能特效', 'CodeManu「Free Pixel Effects」、13rice「Radial Lightning」', 'CC0'],
  ['背景音樂', 'Juhani Junkala、Abstraction「Three Red Hearts」', 'CC0'],
  ['音效', 'IgnisForge「43 Retro SFX」、Kenney', 'CC0'],
  ['中文字型', '俐方體 11 號（Cubic 11）、Fusion Pixel Font（TakWolf）', 'OFL'],
];
function showCredits() {
  $('info-body').innerHTML = `
    <h2>製作群</h2>
    <p class="hint">遊戲設計與程式：彈珠勇者團隊。感謝以下作者無私分享的免費素材：</p>
    <div class="credits">${CREDITS.map(([what, who, lic]) => `<p><small>${what}</small><b>${who}</b><em>${lic}</em></p>`).join('')}</div>
    <button class="btn" id="btn-info-close">關閉</button>`;
  showScreen('screen-info', 'screen-home');
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
  const len = run.mode === 'trial' ? 10 : run.mode ? run.maxWave : run.endless ? ENDLESS_CYCLE : MAX_WAVE;
  const wave = run.mode === 'trial' ? ((run.floorOf(run.wave) - 1) % 10) + 1 : run.mode ? run.wave : stageWave(run, run.wave);
  let html = '';
  for (let i = 1; i <= len; i++) {
    const kind = i === len || run.mode === 'rush' ? 'boss' : !run.mode && i % 5 === 0 ? 'elite' : '';
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

function toast(text, long = false) {
  const b = $('toast');
  b.textContent = text;
  b.classList.toggle('long', long);
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
  if (launching) tickLaunch(dt);
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
// ---------- 首頁上滑：展示台跟著收成戰鬥畫面的高度，露出下面更多選項 ----------
game.homeStageNow = 0;
function onHomeScroll() {
  const sc = $('screen-home');
  const full = game.homeStagePx || 0;
  const min = game.battleH * scale;
  const dist = Math.max(1, full - min);
  const st = Math.max(0, sc.scrollTop);
  const c = Math.min(1, st / dist);
  const now = full - Math.min(st, dist);
  game.homeStageNow = now / scale;
  const root = document.documentElement.style;
  root.setProperty('--stage-now', now + 'px');
  root.setProperty('--collapse', c.toFixed(3));
  // 收到底之後內容會滑到展示台後面：把那一段切掉，不要透出來
  root.setProperty('--clip', Math.max(0, st - dist) + 'px');
  sc.classList.toggle('collapsed', c > 0.55);
}
$('screen-home').addEventListener('scroll', () => { onHomeScroll(); armSnap(); }, { passive: true });
// 吸附：只有停在「展開」與「收起」之間（標題正在收合的那一段）才自動補完，
// 已經滑到下面的內容時完全不動，避免一直被拉回去
let snapTimer = 0, touching = false;
const homeEl = $('screen-home');
homeEl.addEventListener('touchstart', () => { touching = true; clearTimeout(snapTimer); }, { passive: true });
homeEl.addEventListener('touchend', () => { touching = false; armSnap(); }, { passive: true });
function armSnap() {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    if (touching || launching) return;
    const dist = (game.homeStagePx || 0) - game.battleH * scale;
    const st = homeEl.scrollTop;
    if (st <= 2 || st >= dist - 2) return;
    homeEl.scrollTo({ top: st < dist * 0.45 ? 0 : dist, behavior: 'smooth' });
  }, 220);
}

// ---------- 開始冒險的過場動畫 ----------
// 展示台往上收成戰鬥畫面的高度、英雄走到戰鬥位置、遠方的怪淡出、彈珠台從下面升上來，最後白光一閃開打
const LAUNCH_T = 1.05;
let launching = null;
const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function launch() {
  if (launching) return;
  initAudio();
  launching = { t: 0 };
  board.setChapter(save.chapter);
  board.layout(game.battleH, game.H - 6, game.W);
  $('screen-home').classList.add('launching');
  heroHop = performance.now();
  banner('出發！');
  sfx('wave');
  vibrate([20, 40, 30]);
}
function tickLaunch(dt) {
  launching.t += dt;
  if (launching.t >= LAUNCH_T) {
    launching = null;
    $('screen-home').classList.remove('launching');
    $('flash').classList.remove('go');
    void $('flash').offsetWidth;
    $('flash').classList.add('go');
    startRun();
  }
}

function drawHome() {
  const def = HEROES.find(h => h.id === save.selected) || HEROES[0];
  const ch = CHAPTERS[(save.chapter - 1) % CHAPTERS.length];
  const e = launching ? ease(Math.min(1, launching.t / (LAUNCH_T * 0.9))) : 0;
  const lerp = (a, b) => a + (b - a) * e;
  battle.layout(game.W, 0, lerp(game.homeStageNow || game.homeStage, game.battleH));
  // 換英雄時跳一下
  const k = Math.min(1, (performance.now() - heroHop) / 450);
  const hop = k < 1 ? Math.sin(k * Math.PI) * 0.45 : 0;
  const mt = riding(save);
  const hero = { def, mount: mt, x: lerp(mt ? -0.3 : 0, -1.35), z: lerp(mt ? 6.3 : 5.2, 4), scale: lerp(mt ? 1.05 : 1.35, 1) + (k < 1 ? Math.sin(k * Math.PI) * 0.08 : 0), hurt: 0, lunge: 0, lift: hop, showcase: true };
  const teaser = [
    { sprite: MONSTERS[ch.boss].sprite, x: 2.7, z: 12, size: 1.85, kb: 0, lunge: 0, flash: 0, phase: 1, teaser: true },
    { sprite: MONSTERS[ch.enemies[0]].sprite, x: -1.6, z: 9, size: 0.75, kb: 0, lunge: 0, flash: 0, phase: 2, teaser: true },
    { sprite: MONSTERS[ch.enemies[1]].sprite, x: 2.4, z: 7.5, size: 0.75, kb: 0, lunge: 0, flash: 0, phase: 3, teaser: true },
  ];
  for (const t of teaser) t.z += e * 6; // 遠方的怪退進霧裡
  battle.drawWorld(ctx, save.chapter, hero, teaser);
  if (launching) {
    // 彈珠台從下面升上來
    ctx.save();
    ctx.translate(0, (1 - e) * (game.H - board.top));
    ctx.globalAlpha = Math.min(1, e * 1.5);
    ctx.drawImage(board.bgCanvas(ctx), 0, board.top, game.W, board.h + 40);
    const peg = board.pegSprite(ctx);
    for (const p of board.pegs) ctx.drawImage(peg, p.x - 6, p.y - 6, 12, 12);
    ctx.restore();
    return;
  }
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
  power: (hero, diff, ch) => ({ p: savePower(save, [hero || save.selected]), rec: recommended(diff || save.difficulty, ch || 1) }),
  // 平衡測試用：不畫畫面，直接用機器人跑完一整局（存檔會在結束後還原）
  // opts: { hero, hero2, diff, chapter, aim: 0~1（瞄準準度）, revive }
  sim(opts = {}) {
    const keep = JSON.stringify(save);
    const restore = () => { const o = JSON.parse(keep); for (const k of Object.keys(save)) delete save[k]; Object.assign(save, o); };
    save.tutorialDone = true;
    if (opts.hero) { save.selected = opts.hero; if (!save.owned.includes(opts.hero)) save.owned.push(opts.hero); }
    save.second = opts.hero2 || null;
    if (opts.hero2 && !save.owned.includes(opts.hero2)) save.owned.push(opts.hero2);
    if (opts.diff) save.difficulty = opts.diff;
    const aim = opts.aim === undefined ? 0.85 : opts.aim;
    let spec = null;
    if (opts.mode === 'dungeon') spec = modes.dungeonRun(opts.dg || 'gold', opts.tier || 1);
    else if (opts.mode === 'rush') spec = { ...modes.rushRun(), diffId: save.difficulty };
    else if (opts.mode === 'trial') { save.trial = { floor: opts.floor || 0 }; spec = modes.trialRun(save); }
    startRun({ chapter: opts.chapter || 1, spec });
    const run = game.run;
    const dt = 1 / 30;
    let ticks = 0, deathWave = 0, bossT = 0;
    while (run.phase !== 'over' && ticks < 200000) {
      ticks++;
      if (run.phase === 'fight' || run.phase === 'settle') {
        // 瞄準：大部分時間對準最好的門，偶爾失手
        if (ticks % 5 === 0) {
          const val = g => (g.type[0] === 'x' ? 100 : 0) + parseFloat(g.type.slice(1));
          const good = board.gates.filter(g => !g.trap && g.vis !== 0).sort((a, b) => val(b) - val(a));
          const g = Math.random() < aim ? good[0] : board.gates[Math.floor(Math.random() * board.gates.length)];
          if (g) board.targetX = g.x + g.w / 2 + (Math.random() - 0.5) * 30 * (1 - aim);
        }
        update(dt);
        if (isBossWave(run, run.wave) && run.phase === 'fight') bossT += dt;
      } else if (run.phase === 'event') {
        const e = run.events[Math.floor(Math.random() * run.events.length)];
        e.apply({ run, board, randomSkill: makeRandomSkill(run, isMaxed), gainSkill });
        openShop();
      } else if (run.phase === 'shop') {
        // 商店：先買高星、再買便宜的；錢多就刷新一次
        for (let round = 0; round < 3; round++) {
          const buyable = run.offer.filter(o => !o.bought && o.price <= run.coins).sort((a, b) => b.sk.star - a.sk.star || a.price - b.price);
          for (const o of buyable) { if (o.price > run.coins) continue; run.coins -= o.price; o.bought = true; gainSkill(o.sk); }
          if (run.rerollsLeft > 0 && run.coins > run.rerollCost * 4) { run.coins -= run.rerollCost; run.rerollsLeft--; run.rerollCost += 10; rollOffer(); } else break;
        }
        run.shopDiscount = 1;
        showScreen(null);
        nextWave();
      } else if (run.phase === 'dead') {
        deathWave = deathWave || run.wave;
        if (!run.revived && opts.revive !== false) { run.revived = true; for (const h of run.heroes) if (h.hp <= 0) h.hp = h.maxHp * 0.6; run.phase = 'fight'; showScreen(null); }
        else endRun(false);
      } else break;
    }
    const out = { win: run.phase === 'over' && run.wave >= (run.maxWave || MAX_WAVE) && run.heroes.some(h => h.hp > 0), wave: run.wave, deathWave, coins: Math.round(run.coins), skills: run.skills.length, ticks, boss: isBossWave(run, run.wave), bossT: Math.round(bossT), dps: Math.round(dps(run.hero)), hp: Math.round(run.hero.maxHp), def: [run.hero.dr, run.hero.dodge, run.hero.block, run.hero.life, run.hero.regen].map(v => +(v || 0).toFixed(2)), bossAtk: run.bossAtk || 0 };
    game.run = null;
    restore();
    writeSave(save);
    showScreen(null);
    return out;
  },
};
