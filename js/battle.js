// 自動戰鬥（2.5D）：角色是平面紙片人，站在有深度的 3D 地面上
// 英雄站在左前方，敵人從右後方的霧裡走出來，排成一斜排往前逼近
import { sfx } from './audio.js';
import { CHAPTERS, MONSTERS, TIERS, isBossWave, stageWave } from './data.js';
import { drawSprite, drawIcon, drawTinted, FONT } from './sprites.js';
import { riding } from './mount.js';
import { fmt } from './board.js';
import { Scene } from './scene.js';
import { diffScale } from './levels.js';
import { settings } from './settings.js';
import { vibrate } from './feedback.js';
import { gearBonus } from './gear.js';
import { talentBonus } from './talent.js';

const rand = (a, b) => a + Math.random() * (b - a);
// 遠程普攻的樣子：法術職業射法球，火槍手射子彈，其他射箭
const shotStyle = h => h.def.id === 'gunner' ? 'bullet' : [].concat(h.def.cls).includes('spell') && h.def.id !== 'sage' ? 'orb' : 'arrow';
const shotColor = h => ({ mage: '#c38bff', elem: '#ffb0e0', sage: '#c8b6ff', gunner: '#ffe0a0' })[h.def.id] || '#ffffff';
const HERO_POS = { x: -1.35, z: 4 };
export const BENCH_POS = { x: -3.6, z: 4.6 }; // 雙職業：換上場的職業從畫面左邊衝進來
const HERO_HEIGHT = 0.9;   // 英雄在世界裡有多高（公尺）

export function createHero(def, save) {
  const gb = gearBonus(save); // 身上裝備的加成
  const tb = talentBonus(save); // 天賦網的加成
  const mt = riding(save);       // 騎著的坐騎
  const mb = k => (mt && mt.stat === k ? mt.bonus : 0);
  const maxHp = def.hp * (1 + tb.hp) * (1 + gb.hp) * (1 + mb('hp'));
  const h = {
    def, maxHp, hp: maxHp,
    baseAtk: def.atk * (1 + tb.atk) * (1 + gb.atk) * (1 + mb('atk')),
    atkMul: 1, spdMul: 1 + tb.spd + mb('spd') + gb.spd,
    interval: def.interval, range: def.range / 48, // 換算成世界距離
    hits: def.hits + tb.hits, crit: (def.crit || 0.05) + gb.crit + tb.crit + mb('crit'), critDmg: (def.critDmg || 1.5) + tb.critDmg + gb.critDmg,
    block: (def.block || 0) + tb.block + gb.block, dbl: tb.dbl, life: (def.life || 0) + tb.life + gb.life, splash: (def.splash || 0) + tb.splash, thorns: (def.thorns || 0) + tb.thorns,
    bossDmg: tb.bossDmg + gb.bossDmg, skillDropBonus: tb.skillDrop + (gb.skills.lucky || 0) / 100, phoenix: tb.phoenix > 0, regen: 0.15 + tb.regen + gb.regen,
    magnet: (def.magnet || 0) + tb.magnet,
    critSplash: 0, counter: 0, fullHealWave: false, // 技能滿級獎勵
    // 職業專屬技能用到的數值
    swordEvery: 3, swordMul: 1, swordTwice: false, swordCrit: false, blockHeal: 0,
    multiShot: 0, multiMul: 1, pierce: 0, arrowNeed: 20, arrowCount: 1,
    meteorEvery: 0, meteorMul: 0, frost: 0,
    sawNeed: 12, sawMul: 0.6, rage: 0, rageSpd: 0, killHeal: 0, killGrow: 0,
    // 近戰／遠程／法術技能
    cleave: 0, cleaveAll: false, stun: 0, stunAmp: 0, dr: Math.min(0.6, tb.dr + gb.dr), opener: 0, openerStun: false, openerUsed: false,
    snipe: 0, snipeCrit: false, dot: 0, dotColor: '#7dff5a', dotTime: 3, critEvery: 0, hitCount: 0, slowWalk: 0, slowAtk: 0,
    chainEvery: 0, chainMul: 0, chainJumps: 3, shieldPct: 0, shield: 0, shieldBurst: 0, killBlast: 0,
    interest: tb.interest, interestCap: 1,
    // 新職業的被動與專屬技能
    holyEvery: 5, holyMul: 0.8, holyShield: 0, holyStun: false, regenPs: 0,
    dodge: def.dodge || 0, dodgeCrit: false, nextCrit: false, exec: 0, execAt: 0.3, critDot: 0,
    grenadeEvery: 5, grenadeMul: 1.5, grenadeStun: false, ignoreArmor: false, spread: 0,
    fireDot: 0.3, iceSlow: 0.3, iceFreeze: 0, boltJumps: 2, boltMul: 0.6,
    breathEvery: 4, breathTwice: false, breathMul: 1.5,
    starNeed: 15, starCount: 1, starMul: 2, starCrit: false,
    switchMul: 2, switchCd: 6, switchHeal: 0, switchStun: 0, // 雙職業：換手斬
    stealCoins: def.id === 'thief' ? 3 : 0, stealBig: false, goldBonus: def.id === 'thief' ? 0.3 : 0, chestEvery: false,
    ballsPerKill: 5 + gb.ball + tb.ball + mb('ball'), mount: mt, critCharges: 0,
    x: HERO_POS.x, z: HERO_POS.z, timer: 0, hitQueue: 0, hitTimer: 0, swings: 0,
    lunge: 0, hurt: 0,
  };
  applyJewels(h, gb.skills);
  return h;
}

// 飾品技能：有的直接改能力，有的在戰鬥中定時發動
function applyJewels(h, sk) {
  if (sk.fury) h.rage += sk.fury / 100;            // 用狂戰士的「狂暴」機制：血量低於一半時加攻擊
  if (sk.frost) h.frost = Math.min(0.8, h.frost + sk.frost / 100);
  if (sk.guard) h.shieldPct += sk.guard / 100;
  if (sk.regen) h.regenPs += sk.regen / 100 / 5;
  if (sk.midas) h.stealCoins += sk.midas;
  h.jewels = [];
  if (sk.thunder) h.jewels.push({ id: 'thunder', every: 6, mul: sk.thunder / 100, t: 0 });
  if (sk.star) h.jewels.push({ id: 'star', every: 9, mul: sk.star / 100, t: 0 });
}

// 狂暴：血量低於一半時攻擊力提高
const raging = h => h.rage > 0 && h.hp < h.maxHp * 0.5;
export const heroAtk = h => h.baseAtk * h.atkMul * (raging(h) ? 1 + h.rage : 1);

// 第 i 個排隊位置：越後面越遠、越往右，形成一條斜線
const slot = (i, big) => ({ x: -0.3 + i * 0.55 + (big ? 0.25 : 0), z: 4.4 + i * 0.85 + (big ? 0.3 : 0) });

export class Battle {
  constructor(game) {
    this.g = game;
    this.scene = new Scene();
    this.reset();
    this.shake = 0;
    this.spawnTimer = 0;
  }

  reset() {
    this.enemies = [];
    this.queue = [];
    this.texts = [];
    this.streaks = [];
    this.parts = [];
    this.slashes = [];
    this.sparks = [];       // 命中光點
    this.shocks = [];       // 魔王砸地的衝擊波
    this.embers = [];       // 魔王身邊飄的火星
    this.boss = null;
    this.bossIntro = null;
    this.flashWhite = 0;
  }

  layout(W, top, bottom) { this.scene.layout(W, top, bottom); }

  startWave(run) {
    const boss = isBossWave(run, run.wave);
    const w = stageWave(run, run.wave); // 無盡塔用循環內的波數
    const ch = CHAPTERS[(run.chapter - 1) % CHAPTERS.length];
    const diff = run.diff;
    const scale = (1 + 0.16 * (w - 1)) * Math.pow(1.8, run.chapter - 1);
    // 一隻怪 = 種類（圖鑑）× 等級（普通／隊長／菁英／寶箱怪／魔王）
    const mk = (key, tier) => {
      const mon = MONSTERS[key];
      const t = TIERS[tier];
      const mods = run.mods || {};
      const maxHp = 18 * scale * mon.hp * t.hp * diffScale(diff.hp, w) * (run.nextHpMul || 1)
        * (mods.tanky ? 1.4 : 1) * (mods.giant && tier === 'boss' ? 2 : 1);
      return {
        key, name: mon.name, sprite: mon.sprite, kind: tier, tier: t,
        maxHp, hp: maxHp, atk: 2.4 * scale * mon.atk * t.atk * diffScale(diff.atk, w),
        interval: mon.iv / (mods.speedy ? 1.5 : 1), speed: mon.speed * (mods.speedy ? 1.5 : 1), dodge: mon.dodge || 0, armor: mon.armor || 0,
        slow: 0, timer: rand(0, 0.6), x: 0, z: 0, size: t.size, ballMul: t.balls,
        kb: 0, flash: 0, lunge: 0, dead: false, phase: rand(0, 6), enraged: false,
      };
    };
    const randomMon = () => ch.enemies[Math.floor(Math.random() * ch.enemies.length)];
    const q = [];
    if (boss) {
      // 魔王關：兩隻隊長護衛＋魔王
      q.push(mk(randomMon(), 'captain'), mk(randomMon(), 'captain'), mk(ch.boss, 'boss'));
    } else {
      const n = 3 + Math.floor(w * 0.55) + diff.count;
      // 每隻普通怪都有機會變成「隨機菁英」，波數越後面機率越高
      // 第 3 波起才會有菁英（前兩波讓玩家先熟悉）
      const eliteChance = w < 3 ? 0 : Math.min(0.2, 0.02 + w * 0.012) * ((run.mods || {}).elites ? 3 : 1);
      for (let i = 0; i < n; i++) q.push(mk(randomMon(), Math.random() < eliteChance ? 'elite' : 'normal'));
      // 第 3 波起有隊長，第 8 波起兩隻
      const captains = w >= 8 ? 2 : w >= 3 ? 1 : 0;
      for (let i = 0; i < captains; i++) q.splice(Math.floor(q.length / 2) + i, 0, mk(randomMon(), 'captain'));
      if (w % 5 === 0 || run.hero.chestEvery) q.push(mk('mimic', 'chest'));
    }
    this.queue = q;
    this.spawnTimer = 0.4;
    // 每波重置：開場衝鋒、魔力護盾
    const h = run.hero;
    h.openerUsed = false;
    if (h.shieldPct) h.shield = h.maxHp * h.shieldPct;
    this.boss = null;
  }

  cleared() { return this.queue.length === 0 && this.enemies.length === 0; }

  update(dt, fighting) {
    const run = this.g.run;
    const h = run.hero;
    this.scene.update(dt);
    this.shake = Math.max(0, this.shake - dt * 30);
    h.lunge = Math.max(0, h.lunge - dt * 8);
    h.hurt = Math.max(0, h.hurt - dt * 4);
    this.updateFx(dt);
    this.updateBoss(dt);
    // 剛換上場的職業從後面衝到前面
    h.x += (HERO_POS.x - h.x) * Math.min(1, dt * 9);
    h.z += (HERO_POS.z - h.z) * Math.min(1, dt * 9);
    if (!fighting) return;
    if (h.regenPs && h.hp > 0) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.regenPs * dt); // 神聖光環
    // 坐騎技能：有敵人在場時每隔幾秒自動施放
    if (h.mount && this.enemies.some(e => !e.dead)) {
      run.mountT = (run.mountT || 0) + dt;
      if (run.mountT >= h.mount.cdNow) { run.mountT = 0; this.mountSkill(h); }
    }
    // 飾品技能：雷霆、星隕
    if (h.jewels && h.jewels.length && this.enemies.some(e => !e.dead)) {
      for (const j of h.jewels) {
        j.t += dt;
        if (j.t < j.every) continue;
        j.t = 0;
        if (j.id === 'thunder') {
          for (const e of this.enemies.filter(o => !o.dead).slice(0, 3)) {
            this.fx(e.x + 0.3, e.z, 5, e.x, e.z, e.size * 0.5, '#ffe066', 0.3, 'bolt');
            this.burst(e.x, e.z, e.size * 0.5, '#fff6a0', 6, 2);
            this.damage(e, heroAtk(h) * j.mul, false, true, '#ffe066');
          }
          this.text(h.x + 0.5, h.z, 1.4, '雷霆!', '#ffe066', 15);
          sfx('crit');
          this.enemies = this.enemies.filter(e => !e.dead);
        } else this.blast(j.mul, '星隕!', '#b9a8ff', { style: 'meteor' });
      }
    }

    if (this.queue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        // 從畫面右側外面走進來（站在自己排隊位置的那個深度）
        const e = this.queue.shift();
        const s0 = slot(this.enemies.length, e.kind === 'boss');
        e.z = s0.z + rand(-0.3, 0.6);
        e.x = (this.scene.W / 2 + 30) / this.scene.cam.f * e.z + e.size;
        this.enemies.push(e);
        this.spawnTimer = 0.75;
        if (e.kind === 'boss') this.startBossIntro(e);
        else if (e.kind === 'elite') this.text(e.x - 0.8, e.z, e.size + 0.6, '菁英出現!', '#d06bff', 13);
      }
    }

    // 敵人走向自己的排隊位置
    this.enemies.forEach((e, i) => {
      const s = slot(i, e.kind === 'boss');
      const dx = s.x - e.x, dz = s.z - e.z;
      const d = Math.hypot(dx, dz);
      // 中毒／燃燒：每 0.5 秒扣一次血
      if (e.dotT > 0) {
        e.dotT -= dt;
        e.dotAcc = (e.dotAcc || 0) + dt;
        if (e.dotAcc >= 0.5) { e.dotAcc = 0; this.damage(e, e.dotDps * 0.5, false, true, e.dotColor); }
      }
      // 擊暈：站著不動、不攻擊
      if (e.stun > 0) { e.stun -= dt; e.flash = Math.max(e.flash, 0.3); return; }
      const step = 3.2 * (e.speed || 1) * dt * (e.kind === 'boss' && this.bossIntro ? 0.5 : 1) * (1 - h.slowWalk);
      if (d > step) { e.x += dx / d * step; e.z += dz / d * step; } else { e.x = s.x; e.z = s.z; }
      e.kb = Math.max(0, e.kb - dt * 4);
      e.flash = Math.max(0, e.flash - dt * 6);
      e.lunge = Math.max(0, e.lunge - dt * 6);
      if (i < 2 && d < 0.05) {
        e.timer += dt * (1 - e.slow) * (1 - h.slowAtk) * (e.enraged ? 1.4 : 1); // 冰霜變慢、狂暴變快
        if (e.timer >= e.interval) {
          e.timer = 0;
          e.lunge = 1;
          if (e.kind === 'boss') this.bossSlam(e);
          this.enemyHit(e);
        }
      }
    });

    // 英雄攻擊：最前面的敵人進入射程就開打
    // 射程要加上敵人的身體半徑：魔王體型大、站得比較遠，近戰也要打得到
    const front = this.enemies[0];
    if (front && Math.hypot(front.x - h.x, front.z - h.z) <= h.range + 0.2 + front.size * 0.4) {
      h.timer += dt * h.spdMul * (raging(h) ? 1 + h.rageSpd : 1);
      if (h.timer >= h.interval && h.hitQueue <= 0) {
        h.timer = 0;
        const rounds = 1 + Math.floor(h.dbl) + (Math.random() < h.dbl % 1 ? 1 : 0);
        h.hitQueue = h.hits * rounds;
        h.hitTimer = 0;
        if (rounds > 1) this.text(h.x, h.z, 1.3, '連擊!', '#ffdd55', 14);
        h.swings++;
        if (h.def.id === 'blade' && h.swings % h.swordEvery === 0) {
          this.swordWave();
          if (h.swordTwice) setTimeout(() => this.g.run && this.swordWave(), 160);
        }
        if (h.meteorEvery && h.swings % h.meteorEvery === 0) this.meteor();
        if (h.chainEvery && h.swings % h.chainEvery === 0) this.chain();
        const id = h.def.id;
        if (id === 'paladin' && h.swings % h.holyEvery === 0) this.holy();
        if (id === 'gunner' && h.swings % h.grenadeEvery === 0) this.blast(h.grenadeMul, '榴彈!', '#ffb347', { stun: h.grenadeStun ? 1 : 0, style: 'grenade' });
        if (id === 'dragoon' && h.swings % h.breathEvery === 0) {
          this.breath();
          if (h.breathTwice) setTimeout(() => this.g.run && this.breath(), 220);
        }
      }
    }
    if (h.hitQueue > 0) {
      h.hitTimer -= dt;
      if (h.hitTimer <= 0) {
        h.hitTimer = 0.09;
        h.hitQueue--;
        this.heroHit();
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  heroHit() {
    const h = this.g.run.hero;
    const t = this.enemies.find(e => !e.dead);
    if (!t) { h.hitQueue = 0; return; }
    h.lunge = 1;
    // 墓地：敵人有機率閃避
    if (Math.random() < (this.g.run.rules.dodge || 0) + (t.dodge || 0)) {
      this.text(t.x, t.z, t.size + 0.3, '閃避', '#c9c2d1', 12);
      if (h.range > 2) this.streak(h, t, '#888', 0.12, shotStyle(h));
      return;
    }
    h.hitCount++;
    const crit = Math.random() < h.crit || (h.critEvery && h.hitCount % h.critEvery === 0) || h.nextCrit || h.critCharges > 0;
    h.nextCrit = false;
    if (h.critCharges > 0) h.critCharges--; // 戰狼「狼嚎」
    let dmg = heroAtk(h) * (crit ? h.critDmg : 1) * rand(0.9, 1.1);
    // 處決：血少的敵人受到更多傷害
    if (h.exec && t.hp < t.maxHp * h.execAt) dmg *= 1 + h.exec;
    if (crit && h.critDot) { t.dotDps = heroAtk(h) * h.critDot; t.dotT = 3; t.dotColor = '#9a8cff'; }
    if (h.def.id === 'elem') this.element(t);
    // 開場衝鋒：每波第一下
    if (h.opener && !h.openerUsed) {
      h.openerUsed = true;
      dmg *= 1 + h.opener;
      this.text(h.x + 0.5, h.z, 1.4, '衝鋒!', '#ff8a6b', 16);
      if (h.openerStun) for (const e of this.enemies) if (!e.dead) e.stun = 1.5;
    }
    if (h.stun && Math.random() < h.stun) { t.stun = 1; this.text(t.x, t.z, t.size + 0.5, '暈眩', '#ffd84a', 12); }
    if (h.dot) { t.dotDps = heroAtk(h) * h.dot; t.dotT = h.dotTime; t.dotColor = h.dotColor; }
    if (h.frost > 0) t.slow = h.frost;
    if (h.range > 2) this.streak(h, t, crit ? '#ffdd55' : shotColor(h), 0.18, shotStyle(h));
    else this.slashes.push({ x: t.x, z: t.z, h: t.size * 0.5, life: 0.18, rot: rand(-0.6, 0.6), crit, color: h.def.id === 'saw' ? '#ff9f43' : h.def.id === 'paladin' ? '#fff2a8' : h.def.id === 'rogue' ? '#b9a8ff' : null });
    if (crit) this.burst(t.x, t.z, t.size * 0.5, '#ffdd55', 6, 2.2);
    this.damage(t, dmg, crit);
    if (h.splash > 0) {
      for (const e of this.enemies) if (e !== t && !e.dead) this.damage(e, dmg * h.splash, false, true);
    }
    // 致命一擊滿級：暴擊時震波打中所有敵人
    if (crit && h.critSplash > 0) {
      for (const e of this.enemies) if (e !== t && !e.dead) this.damage(e, dmg * h.critSplash, false, true);
    }
    // 射手：多重箭射向隨機敵人
    for (let k = 0; k < h.multiShot; k++) {
      const others = this.enemies.filter(e => !e.dead);
      if (!others.length) break;
      const o = others[Math.floor(Math.random() * others.length)];
      this.streak(h, o, '#b6ff6d', 0.16, 'arrow');
      this.damage(o, dmg * 0.6 * h.multiMul, false, true);
    }
    // 射手：穿透箭打到後面一隻
    if (h.pierce > 0) {
      const behind = this.enemies.filter(e => !e.dead && e !== t)[0];
      if (behind) { this.streak(t, behind, '#ffd84a', 0.16, 'arrow'); this.damage(behind, dmg * h.pierce, false, true); }
    }
    // 橫掃：順便砍到第 2 隻（滿級砍全部）
    if (h.cleave > 0) {
      const rest = this.enemies.filter(e => !e.dead && e !== t);
      for (const e of h.cleaveAll ? rest : rest.slice(0, 1)) this.damage(e, dmg * h.cleave, false, true);
    }
    // 散彈：第 2、3 隻
    if (h.spread > 0) {
      for (const e of this.enemies.filter(o => !o.dead && o !== t).slice(0, 2)) { this.streak(h, e, '#ffb347', 0.12, 'bullet'); this.damage(e, dmg * h.spread, false, true); }
    }
    // 狙擊：最後面那隻
    if (h.snipe > 0) {
      const alive = this.enemies.filter(e => !e.dead && e !== t);
      const last = alive[alive.length - 1];
      if (last) { this.streak(h, last, '#d8ff8a', 0.2, 'arrow'); this.damage(last, dmg * h.snipe * (h.snipeCrit && !crit ? h.critDmg : 1), h.snipeCrit, !h.snipeCrit); }
    }
    if (h.life > 0) h.hp = Math.min(h.maxHp, h.hp + dmg * h.life);
    sfx(crit ? 'crit' : 'hit');
    if (crit) {
      this.shake = Math.max(this.shake, 5);
      this.scene.cam.punch = 1;
      vibrate(15);
    }
  }

  // 打中所有敵人的範圍攻擊（聖光、榴彈、龍息、星落、切換攻擊共用）
  blast(mul, label, color, o = {}) {
    const h = this.g.run.hero;
    const dmg = heroAtk(h) * mul * (o.crit ? h.critDmg : 1);
    if (label) this.text(h.x + 0.5, h.z, 1.4, label, color, 16);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const style = o.style || (o.fromHero ? 'beam' : 'meteor');
      if (o.fromHero || style === 'grenade' || style === 'fire') this.fx(h.x + 0.2, h.z, 0.6, e.x, e.z, e.size * 0.4, color, style === 'fire' ? 0.35 : 0.32, style);
      else this.fx(e.x + 0.8, e.z, 4, e.x, e.z, 0.2, color, style === 'holy' ? 0.45 : 0.32, style);
      this.burst(e.x, e.z, e.size * 0.4, color, style === 'fire' ? 10 : 7, 2.6);
      if (o.stun) e.stun = Math.max(e.stun || 0, o.stun);
      if (o.dot) { e.dotDps = heroAtk(h) * o.dot; e.dotT = h.dotTime; e.dotColor = color; }
      this.shocks.push({ x: e.x, z: e.z, t: 0, big: false });
      this.damage(e, dmg, !!o.crit, !o.crit, color);
    }
    this.shake = Math.max(this.shake, 6);
    this.scene.cam.punch = 1;
    sfx('crit');
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  // 雙職業：換上場的職業砍全體（會吃到暴擊、中毒、擊暈、冰霜、吸血等技能效果）
  switchStrike(h) {
    const color = { melee: '#ff8a6b', ranged: '#8fe36b', spell: '#c38bff' }[[].concat(h.def.cls)[0]];
    this.text(HERO_POS.x + 0.6, HERO_POS.z, 1.5, '換手斬!', color, 18);
    let total = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const crit = Math.random() < h.crit;
      const dmg = heroAtk(h) * h.switchMul * (crit ? h.critDmg : 1);
      this.slashes.push({ x: e.x, z: e.z, h: e.size * 0.5, life: 0.25, rot: rand(-0.8, 0.8), crit: true });
      this.fx(h.x, h.z, 0.5, e.x, e.z, e.size * 0.5, color, 0.25, 'beam');
      this.slashes.push({ x: e.x, z: e.z, h: e.size * 0.5, life: 0.3, rot: rand(0.6, 1.0), crit: true, big: true, color });
      if (h.dot) { e.dotDps = heroAtk(h) * h.dot; e.dotT = h.dotTime; e.dotColor = h.dotColor; }
      if (h.stun && Math.random() < h.stun) e.stun = 1;
      if (h.switchStun) e.stun = Math.max(e.stun || 0, h.switchStun);
      if (h.frost) e.slow = h.frost;
      this.damage(e, dmg, crit);
      total += dmg;
    }
    if (h.life) h.hp = Math.min(h.maxHp, h.hp + total * h.life);
    if (h.switchHeal) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.switchHeal);
    this.shake = Math.max(this.shake, 9);
    this.scene.cam.punch = 1.4;
    sfx('crit');
    vibrate(30);
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  // 坐騎技能
  mountSkill(h) {
    const m = h.mount, s = m.star;
    const front = this.enemies.find(e => !e.dead);
    if (!front) return;
    if (m.id === 'horse') {
      h.lunge = 2;
      this.fx(h.x, h.z, 0.4, front.x, front.z, front.size * 0.4, m.color, 0.25, 'dash');
      front.kb = 1.5;
      this.text(h.x + 0.5, h.z, 1.5, '衝刺!', m.color, 16);
      this.damage(front, heroAtk(h) * (2.5 + s), true);
      this.shake = Math.max(this.shake, 6);
      sfx('crit');
    } else if (m.id === 'wolf') {
      h.critCharges = 2 + s;
      this.text(h.x + 0.5, h.z, 1.5, '狼嚎!', m.color, 16);
      sfx('wave');
    } else if (m.id === 'bear') {
      for (const e of this.enemies) if (!e.dead) e.stun = Math.max(e.stun || 0, 0.5 + s * 0.5);
      h.shield = (h.shield || 0) + h.maxHp * (0.05 + s * 0.05);
      this.text(h.x + 0.5, h.z, 1.5, '熊吼!', m.color, 16);
      this.shake = Math.max(this.shake, 8);
      sfx('hurt');
    } else if (m.id === 'bird') {
      this.text(h.x + 0.5, h.z, 1.5, '金羽!', m.color, 16);
      this.g.onMountBalls && this.g.onMountBalls(4 + s * 4);
      sfx('buy');
    } else if (m.id === 'drake') {
      this.blast(0.8 + s * 0.6, '火息!', m.color, { dot: 0.3, style: 'fire' });
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  // 聖騎士：聖光回血＋打全體
  holy() {
    const h = this.g.run.hero;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.08);
    if (h.holyShield) h.shield = (h.shield || 0) + h.maxHp * h.holyShield;
    this.blast(h.holyMul, '聖光!', '#fff2a8', { stun: h.holyStun ? 1 : 0, style: 'holy' });
  }

  // 龍騎士：龍息
  breath() {
    const h = this.g.run.hero;
    this.blast(h.breathMul, '龍息!', '#ff5a3d', { dot: 0.3, style: 'fire' });
  }

  // 元素使：每下隨機一種元素
  element(t) {
    const h = this.g.run.hero;
    const k = Math.floor(Math.random() * 3);
    if (k === 0) {
      t.dotDps = heroAtk(h) * h.fireDot; t.dotT = h.dotTime; t.dotColor = '#ff7a3d';
      this.burst(t.x, t.z, t.size * 0.5, '#ff7a3d', 6, 2);
      this.text(t.x, t.z, t.size + 0.5, '火', '#ff7a3d', 12);
    } else if (k === 1) {
      t.slow = Math.max(t.slow, h.iceSlow);
      this.burst(t.x, t.z, t.size * 0.5, '#cff4ff', 6, 1.8);
      if (h.iceFreeze && Math.random() < h.iceFreeze) { t.stun = 1.5; this.text(t.x, t.z, t.size + 0.6, '凍結', '#9fe3ff', 13); }
      else this.text(t.x, t.z, t.size + 0.5, '冰', '#9fe3ff', 12);
    } else {
      let from = t;
      for (const e of this.enemies.filter(o => !o.dead && o !== t).slice(0, h.boltJumps)) {
        this.fx(from.x, from.z, from.size * 0.5, e.x, e.z, e.size * 0.5, '#ffe066', 0.25, 'bolt');
        this.damage(e, heroAtk(h) * h.boltMul, false, true, '#ffe066');
        from = e;
      }
      this.text(t.x, t.z, t.size + 0.5, '雷', '#ffe066', 12);
    }
  }

  // 連鎖閃電：從最前面開始往後跳
  chain() {
    const h = this.g.run.hero;
    const alive = this.enemies.filter(e => !e.dead).slice(0, h.chainJumps);
    if (!alive.length) return;
    const dmg = heroAtk(h) * h.chainMul;
    let from = h;
    for (const e of alive) {
      this.fx(from.x, from.z, from === h ? 0.6 : from.size * 0.5, e.x, e.z, e.size * 0.5, '#9fe3ff', 0.28, 'bolt');
      this.burst(e.x, e.z, e.size * 0.5, '#cff4ff', 5, 2);
      this.damage(e, dmg, false, true, '#9fe3ff');
      from = e;
    }
    this.text(h.x + 0.5, h.z, 1.3, '連鎖閃電!', '#9fe3ff', 14);
    sfx('crit');
  }

  swordWave() {
    const h = this.g.run.hero;
    const dmg = heroAtk(h) * h.swordMul * (h.swordCrit ? h.critDmg : 1);
    this.text(h.x + 0.6, h.z, 1.2, '劍氣!', '#7fd1ff', 15);
    for (const e of this.enemies) if (!e.dead) this.damage(e, dmg, h.swordCrit, !h.swordCrit);
    this.fx(h.x + 0.3, h.z, 0.45, 4, 9, 0.45, '#7fd1ff', 0.4, 'wave');
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  // 法師：隕石從天而降，打中所有敵人
  meteor() {
    const h = this.g.run.hero;
    const dmg = heroAtk(h) * h.meteorMul;
    this.text(h.x + 0.5, h.z, 1.4, '隕石術!', '#ff9f43', 16);
    for (const e of this.enemies) {
      if (e.dead) continue;
      this.fx(e.x + 1.2, e.z, 4.5, e.x, e.z, 0.2, '#ff9f43', 0.35, 'meteor');
      this.burst(e.x, e.z, 0.2, '#ff7a3d', 10, 3);
      this.damage(e, dmg, true);
    }
    this.shake = Math.max(this.shake, 8);
    this.scene.cam.punch = 1.2;
    sfx('crit');
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  // 給英雄被動用：對最前面的敵人造成傷害
  strikeFront(mult, label, color, style = 'arrow') {
    const t = this.enemies.find(e => !e.dead);
    if (!t) return;
    const h = this.g.run.hero;
    this.streak(h, t, color, 0.25, style);
    this.burst(t.x, t.z, t.size * 0.5, color, 8, 2.5);
    this.damage(t, heroAtk(h) * mult, false);
    this.text(t.x, t.z, t.size + 0.5, label, color, 13);
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  streak(h, t, color, life, style = 'beam') {
    this.fx(h.x + 0.2, h.z, 0.5, t.x, t.z, t.size * 0.5, color, life, style);
  }
  // 一個從 A 飛到 B 的特效：arrow 箭、bullet 子彈、orb 法球、bolt 閃電、wave 劍氣、meteor 隕石、
  // grenade 榴彈（拋物線）、fire 火焰、holy 光柱、dash 衝刺、beam 光束
  fx(x1, z1, h1, x2, z2, h2, color, life, style = 'beam') {
    this.streaks.push({ x1, z1, h1, x2, z2, h2, color, life, max: life, style, seed: Math.random() * 1000 });
  }
  // 命中時噴出的小光點
  burst(x, z, h, color, n, speed) {
    if (settings.lowFx) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      this.sparks.push({ x, z, h, vx: rand(-1, 1) * speed, vz: rand(-0.6, 0.6) * speed, vh: rand(0.5, 1.6) * speed, life: rand(0.25, 0.5), color });
    }
  }

  // ---------- 魔王演出 ----------
  startBossIntro(e) {
    this.boss = e;
    this.bossIntro = { t: 0, e, step: 0 };
    this.g.onBossIntro && this.g.onBossIntro(e);
  }

  updateBoss(dt) {
    this.flashWhite = Math.max(0, this.flashWhite - dt * 2.5);
    if (this.bossIntro) {
      const bi = this.bossIntro;
      bi.t += dt;
      // 魔王走路的每一步都震動畫面
      if (Math.floor(bi.t / 0.55) > bi.step) {
        bi.step++;
        this.shake = Math.max(this.shake, 7);
        this.shocks.push({ x: bi.e.x, z: bi.e.z, t: 0, big: false });
        sfx('hurt');
      }
      if (bi.t > 3) this.bossIntro = null;
    }
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      this.shocks[i].t += dt;
      if (this.shocks[i].t > 0.6) this.shocks.splice(i, 1);
    }
    // 魔王周圍持續冒火星
    const b = this.boss;
    if (b && !b.dead && this.embers.length < (settings.lowFx ? 10 : 40) && Math.random() < dt * 30) {
      this.embers.push({ x: b.x + rand(-0.6, 0.6) * b.size, z: b.z + rand(-0.2, 0.2), h: rand(0, 0.3), vh: rand(0.6, 1.4), life: rand(0.8, 1.4), max: 1.4 });
    }
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const p = this.embers[i];
      p.life -= dt;
      p.h += p.vh * dt;
      if (p.life <= 0) this.embers.splice(i, 1);
    }
  }

  bossSlam(e) {
    this.shocks.push({ x: e.x, z: e.z, t: 0, big: true });
    this.shake = Math.max(this.shake, e.enraged ? 9 : 6);
    this.scene.cam.punch = Math.max(this.scene.cam.punch, 0.6);
  }

  bossEnrage(e) {
    e.enraged = true;
    e.atk *= 1.3;
    this.text(e.x, e.z, e.size + 0.9, '狂暴化!', '#ff3b3b', 22);
    this.shake = 12;
    this.flashWhite = 0.6;
    this.shocks.push({ x: e.x, z: e.z, t: 0, big: true });
    sfx('crit');
    this.g.onBossEnrage && this.g.onBossEnrage(e);
  }

  bossDeath(e) {
    this.flashWhite = 1;
    this.shake = 16;
    this.scene.cam.punch = 2;
    for (let i = 0; i < 40; i++) {
      this.parts.push({ x: e.x, z: e.z, h: e.size * 0.6, vx: rand(-3, 3), vz: rand(-2, 2.5), vh: rand(3, 7), life: rand(0.9, 1.4) });
    }
    for (let k = 0; k < 3; k++) this.shocks.push({ x: e.x, z: e.z, t: -k * 0.15, big: true });
    this.boss = null;
  }

  damage(e, dmg, crit, small, color) {
    if (e.dead) return;
    if (!this.g.run.hero.ignoreArmor) dmg *= 1 - (e.armor || 0); // 骷髏兵等有減傷（穿甲彈無視）
    if (e.stun > 0) dmg *= 1 + (this.g.run.hero.stunAmp || 0); // 重擊滿級
    if (e.kind !== 'normal') dmg *= 1 + (this.g.run.hero.bossDmg || 0); // 天賦「獵王者」
    e.hp -= dmg;
    e.flash = 1;
    e.kb = small ? 0.3 : 1;
    if (e.kind === 'boss' && !e.enraged && e.hp > 0 && e.hp < e.maxHp * 0.5) this.bossEnrage(e);
    this.text(e.x + rand(-0.15, 0.15), e.z, e.size + 0.25, fmt(Math.max(1, dmg)), crit ? '#ffdd55' : color || (small ? '#cfd8ff' : '#fff'), crit ? 20 : (small ? 11 : 14));
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.g.onKill(e);
      const h = this.g.run.hero;
      if (h.killGrow) { h.maxHp *= 1 + h.killGrow; }
      if (h.killHeal) { h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.killHeal); }
      // 魔力爆發：擊殺時炸全體（爆炸殺掉的不會再連鎖爆炸，避免一次清場）
      if (h.killBlast && !this.blasting) {
        this.blasting = true;
        this.shocks.push({ x: e.x, z: e.z, t: 0, big: false });
        for (const o of this.enemies) if (o !== e && !o.dead) this.damage(o, heroAtk(h) * h.killBlast, false, true, '#d06bff');
        this.blasting = false;
      }
      sfx('kill');
      // 金幣在 3D 空間裡噴出、落地彈跳
      for (let i = 0; i < (settings.lowFx ? 4 : 10); i++) {
        this.parts.push({ x: e.x, z: e.z, h: e.size * 0.5, vx: rand(-1.6, 1.6), vz: rand(-1.2, 1.6), vh: rand(2, 4.5), life: rand(0.6, 0.9) });
      }
      if (e.kind !== 'normal') { this.shake = 10; this.scene.cam.punch = 1.5; }
      // 菁英、寶箱怪有機率掉落免費技能
      if (e.tier && e.tier.skillDrop && Math.random() < e.tier.skillDrop + (h.skillDropBonus || 0)) {
        this.text(e.x, e.z, e.size + 0.8, '技能掉落!', '#ffd84a', 16);
        this.g.onSkillDrop(e);
      }
      if (e.kind === 'boss') this.bossDeath(e);
    }
  }

  enemyHit(e) {
    const h = this.g.run.hero;
    // 閃避（刺客）
    if (h.dodge && Math.random() < h.dodge) {
      this.text(h.x, h.z, 1.2, '閃避', '#9a8cff', 14);
      if (h.dodgeCrit) h.nextCrit = true;
      return;
    }
    if (Math.random() < h.block) {
      this.text(h.x, h.z, 1.2, '格擋', '#9fe3ff', 14);
      sfx('block');
      if (h.blockHeal) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * h.blockHeal);
      // 鐵壁滿級：格擋後立刻反擊
      if (h.counter > 0) {
        this.slashes.push({ x: e.x, z: e.z, h: e.size * 0.5, life: 0.18, rot: rand(-0.6, 0.6), crit: true });
        this.damage(e, heroAtk(h) * h.counter, true);
        this.text(h.x + 0.4, h.z, 1.4, '反擊!', '#9fe3ff', 15);
      }
      return;
    }
    let dmg = e.atk * (1 - h.dr);
    // 魔力護盾先擋
    if (h.shield > 0) {
      const absorbed = Math.min(h.shield, dmg);
      h.shield -= absorbed;
      dmg -= absorbed;
      this.text(h.x, h.z, 1.3, '護盾', '#d06bff', 12);
      if (h.shield <= 0 && h.shieldBurst) {
        this.text(h.x + 0.4, h.z, 1.5, '護盾爆裂!', '#d06bff', 16);
        for (const o of this.enemies) if (!o.dead) this.damage(o, heroAtk(h) * h.shieldBurst, true);
        this.shake = Math.max(this.shake, 8);
      }
      if (dmg <= 0) return;
    }
    h.hp -= dmg;
    h.hurt = 1;
    this.text(h.x + rand(-0.1, 0.1), h.z, 1.15, '-' + fmt(dmg), '#ff5a5a', 14);
    sfx('hurt');
    if (h.thorns > 0) this.damage(e, e.atk * h.thorns, false, true);
  }

  // 傷害數字：記住世界座標，畫的時候再換算到畫面上
  text(x, z, hgt, text, color, size) {
    // 設定關掉傷害數字時，只略過純數字（「暴擊」「閃避」等文字照常顯示）
    if (!settings.dmgNumbers && /^-?[\d.]+[KMB]?$/.test(text)) return;
    if (this.texts.length > 60) this.texts.shift();
    this.texts.push({ x, z, h: hgt, rise: 0, text, color, size, life: 0.8 });
  }

  updateFx(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.rise += 38 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (const list of [this.streaks, this.slashes]) {
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].life -= dt;
        if (list[i].life <= 0) list.splice(i, 1);
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const p = this.sparks[i];
      p.life -= dt;
      p.vh -= 6 * dt;
      p.x += p.vx * dt; p.z += p.vz * dt; p.h = Math.max(0, p.h + p.vh * dt);
      if (p.life <= 0) this.sparks.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.vh -= 14 * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.h += p.vh * dt;
      if (p.h < 0) { p.h = 0; p.vh = Math.abs(p.vh) * 0.45; p.vx *= 0.7; p.vz *= 0.7; }
      if (p.life <= 0) this.parts.splice(i, 1);
    }
  }

  // ---------- 繪製 ----------
  draw(ctx) {
    const run = this.g.run;
    this.drawWorld(ctx, run.chapter, run.hero, this.enemies);
  }

  // 主畫面也會用這個畫英雄展示台（沒有敵人）
  drawWorld(ctx, chapter, h, enemies) {
    const sc = this.scene;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, sc.top, sc.W, sc.bottom - sc.top);
    ctx.clip();
    if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake) * 0.6);
    sc.drawBackground(ctx, chapter);

    // 把所有角色依遠近排序：遠的先畫，近的蓋在上面
    const actors = enemies.map(e => ({ e, z: e.z }));
    if (h) actors.push({ hero: h, z: h.z });
    actors.sort((a, b) => b.z - a.z);
    for (const a of actors) {
      if (a.hero) this.drawHero(ctx, a.hero);
      else this.drawEnemy(ctx, a.e);
    }

    this.drawFx(ctx);
    ctx.restore();
    sc.drawFrame(ctx);
    this.drawBossOverlay(ctx);
  }

  drawActor(ctx, sprite, x, z, size, flash, phase, lift = 0, rage = 0) {
    const sc = this.scene;
    sc.shadow(ctx, x, z, size * 0.7);
    const p = sc.project(x, z, lift);
    // 待機時輕微呼吸：身體一伸一縮
    const breathe = Math.sin(sc.t * 5 + phase) * 0.04;
    const w = size * p.s * (1 - breathe);
    const hgt = size * p.s * (1 + breathe);
    ctx.globalAlpha = 1 - sc.fogAt(z) * 0.85;
    drawSprite(ctx, sprite, p.x, p.y + 1, w, false, flash, 'dg', hgt, rage);
    ctx.globalAlpha = 1;
    return { p, top: p.y - hgt };
  }

  drawEnemy(ctx, e) {
    // 擊退：被打時往後彈；攻擊：往英雄方向撲一下
    const x = e.x + e.kb * 0.35 - e.lunge * 0.3;
    const z = e.z + e.kb * 0.2;
    const lift = e.lunge * (e.kind === 'boss' ? 0.25 : 0.1);
    const sc = this.scene;
    // 等級外觀：菁英紫色光環、寶箱怪橘光、魔王腳下有發紅的裂地光
    if (e.kind === 'elite' || e.kind === 'chest' || e.kind === 'boss') this.drawTierGlow(ctx, e, x, z);
    const rage = e.enraged ? 0.25 + Math.sin(sc.t * 10) * 0.15 : 0;
    const { p, top } = this.drawActor(ctx, e.sprite, x, z, e.size, e.flash, e.phase, lift, rage);
    this.drawStatus(ctx, e, p, top);
    if (e.teaser || sc.fogAt(z) >= 0.6 || e.kind === 'boss') return; // 魔王用畫面上方的大血條
    const bw = Math.max(24, Math.min(54, e.size * p.s * 0.8));
    this.bar(ctx, p.x - bw / 2, top - 7, bw, e.hp / e.maxHp, '#ff4d4d');
    const t = e.tier;
    if (t && t.label) {
      // 等級標籤（隊長有皇冠）
      ctx.font = `10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(t.label, p.x, top - 10);
      ctx.fillStyle = t.color;
      ctx.fillText(t.label, p.x, top - 10);
      if (e.kind === 'captain') drawIcon(ctx, 'ic', 141, p.x, top - 26, 14);
    }
  }

  drawTierGlow(ctx, e, x, z) {
    const sc = this.scene;
    const p = sc.project(x, z);
    const color = e.kind === 'boss' ? (e.enraged ? '255,40,40' : '255,60,180') : e.kind === 'chest' ? '255,159,67' : '208,107,255';
    const rx = e.size * p.s * 0.6, ry = e.size * p.s * 0.17;
    const pulse = 0.5 + Math.sin(sc.t * 4 + e.phase) * 0.5;
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, rx);
    g.addColorStop(0, `rgba(${color},${0.55 + pulse * 0.2})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.translate(p.x, p.y);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 往上飄的光點
    if (e.kind !== 'boss') {
      ctx.fillStyle = `rgba(${color},0.9)`;
      for (let i = 0; i < 5; i++) {
        const k = (sc.t * 0.7 + i / 5) % 1;
        const a = e.phase + i * 1.3;
        ctx.globalAlpha = 1 - k;
        ctx.fillRect(p.x + Math.cos(a) * rx * 0.7 - 1.5, p.y - k * e.size * p.s - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
    }
  }

  drawHero(ctx, h) {
    const x = h.x + h.lunge * 0.25;
    if (h.wings || h.glow > 0) this.drawGlory(ctx, h, x);
    if (h.maxed > 0) this.drawAura(ctx, h, x);
    // 騎著坐騎：坐騎比英雄大一倍、往前站一點（頭和尾巴都露出來），英雄坐在牠背上；跑動時上下顛
    let lift = h.lift || 0;
    if (h.mount) {
      const sc = this.scene;
      const m = h.mount;
      const size = HERO_HEIGHT * (h.showcase ? 2.1 : 1.55) * (h.scale || 1);
      const bob = Math.abs(Math.sin(sc.t * 9)) * 0.06;
      const mx = x + 0.28 * (h.scale || 1);
      const mp = sc.project(mx, h.z, lift + bob);
      sc.shadow(ctx, mx, h.z, size * 0.75);
      const px = size * mp.s;
      this.drawMountAura(ctx, m, mp.x, mp.y, px, sc.t);
      ctx.globalAlpha = 1 - sc.fogAt(h.z) * 0.85;
      drawTinted(ctx, m.icon, m.color, mp.x, mp.y + 1, px);
      ctx.globalAlpha = 1;
      lift += size * (h.showcase ? 0.5 : 0.42) + bob;
    }
    const { p, top } = this.drawActor(ctx, h.def.sprite, x, h.z, HERO_HEIGHT * (h.scale || 1), h.hurt * 0.6, 0, lift);
    if (h.showcase) return;
    this.bar(ctx, p.x - 32, top - 9, 64, h.hp / h.maxHp, '#4dff7a', true);
    // 護盾泡泡
    if (h.shield > 0) {
      const t = this.scene.t;
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(t * 4) * 0.08;
      ctx.fillStyle = '#d06bff';
      ctx.strokeStyle = '#f0c8ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, (p.y + top) / 2, (p.y - top) * 0.62, (p.y - top) * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.stroke();
      ctx.restore();
    }
    // 魔力護盾：血條上蓋一條紫色
    if (h.shield > 0) {
      ctx.fillStyle = 'rgba(208,107,255,0.85)';
      ctx.fillRect(p.x - 32, top - 9, 64 * Math.min(1, h.shield / h.maxHp), 3);
    }
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    const label = `${fmt(Math.max(0, h.hp))}/${fmt(h.maxHp)}`;
    ctx.strokeText(label, p.x, top - 13);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, p.x, top - 13);
  }

  // 坐騎光環：2 星有彩色光暈，3 星更亮；滿級（3 星 30 級）金色火焰＋繞圈的星光
  drawMountAura(ctx, m, cx, footY, px, t) {
    if (m.star < 2 && !m.maxed) return;
    const cy = footY - px * 0.45;
    ctx.save();
    const r = px * (m.maxed ? 0.85 : 0.62) * (1 + Math.sin(t * 3) * 0.05);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const col = m.maxed ? '255,214,74' : m.star >= 3 ? '255,240,180' : '255,255,255';
    g.addColorStop(0, `rgba(${col},${m.maxed ? 0.55 : m.star >= 3 ? 0.4 : 0.25})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    if (m.maxed) {
      // 腳下往上竄的金色火焰
      for (let i = 0; i < 10; i++) {
        const ph = (t * 0.9 + i / 10) % 1;
        const fx = cx + Math.sin(i * 2.4 + t * 2) * px * 0.38;
        const fy = footY - ph * px * 0.9;
        ctx.globalAlpha = (1 - ph) * 0.9;
        ctx.fillStyle = ph < 0.4 ? '#fff6c0' : '#ffb320';
        const s = px * 0.05 * (1 - ph * 0.6);
        ctx.beginPath(); ctx.moveTo(fx, fy - s * 2); ctx.quadraticCurveTo(fx + s, fy, fx, fy + s); ctx.quadraticCurveTo(fx - s, fy, fx, fy - s * 2); ctx.fill();
      }
      // 繞圈的星光
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        const a = t * 1.8 + i * Math.PI / 3;
        const sx = cx + Math.cos(a) * px * 0.55, sy = cy + Math.sin(a) * px * 0.18;
        const tw = 1.5 + Math.sin(t * 8 + i) * 1;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(sx - tw, sy - 0.6, tw * 2, 1.2);
        ctx.fillRect(sx - 0.6, sy - tw, 1.2, tw * 2);
      }
    }
    ctx.restore();
  }

  // 3 星技能滿級：英雄身後發金光（滿越多越亮、光芒越多）；全部滿級：長出翅膀＋強烈光芒
  drawGlory(ctx, h, x) {
    const sc = this.scene;
    const p = sc.project(x, h.z);
    const t = sc.t;
    const H = HERO_HEIGHT * (h.scale || 1) * p.s;
    const cy = p.y - H * (h.mount ? 0.95 : 0.5);
    const g = Math.min(5, h.glow || 0) + (h.wings ? 3 : 0);
    ctx.save();
    // 放射狀的光芒（會慢慢轉）
    if (g >= 2) {
      const rays = 6 + g * 2;
      const len = H * (0.9 + g * 0.18);
      ctx.globalAlpha = Math.min(0.6, 0.15 + g * 0.06) * (0.85 + Math.sin(t * 3) * 0.15);
      ctx.fillStyle = h.wings ? '#fff1a0' : '#ffc928';
      for (let i = 0; i < rays; i++) {
        const a = t * 0.4 + (i / rays) * Math.PI * 2;
        const w = 0.07;
        ctx.beginPath();
        ctx.moveTo(p.x, cy);
        ctx.lineTo(p.x + Math.cos(a - w) * len, cy + Math.sin(a - w) * len);
        ctx.lineTo(p.x + Math.cos(a + w) * len, cy + Math.sin(a + w) * len);
        ctx.fill();
      }
    }
    // 柔和的金色光暈
    const r = H * (0.55 + g * 0.12) * (1 + Math.sin(t * 4) * 0.04);
    const grad = ctx.createRadialGradient(p.x, cy, 0, p.x, cy, r);
    grad.addColorStop(0, `rgba(255,248,200,${Math.min(0.9, 0.35 + g * 0.1)})`);
    grad.addColorStop(0.5, `rgba(255,210,60,${Math.min(0.6, 0.15 + g * 0.07)})`);
    grad.addColorStop(1, 'rgba(255,190,40,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (h.wings) this.drawWings(ctx, p.x, cy - H * 0.05, H, t);
  }

  // 天使翅膀：每邊 6 根羽毛從肩膀往外排成扇形，會拍動
  drawWings(ctx, cx, cy, H, t) {
    const flap = Math.sin(t * 5) * 0.22;
    for (const side of [-1, 1]) {
      const sx = cx + side * H * 0.1;
      for (let i = 5; i >= 0; i--) {
        const ang = -1.05 + i * 0.27 - flap * (1 - i * 0.12); // 0 = 水平，負的往上
        const len = H * (1.0 - i * 0.08);
        const dx = side * Math.cos(ang), dy = Math.sin(ang);
        ctx.save();
        ctx.translate(sx + dx * len * 0.5, cy + dy * len * 0.5);
        ctx.rotate(Math.atan2(dy, dx));
        const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
        grad.addColorStop(0, '#ffe9a0');
        grad.addColorStop(1, i < 2 ? '#ffffff' : '#fff3c4');
        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(170,120,30,0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, len / 2, H * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 有技能滿級時，英雄腳下出現金色光環，滿級越多、繞圈的光點越多
  drawAura(ctx, h, x) {
    const sc = this.scene;
    const p = sc.project(x, h.z);
    const t = sc.t;
    const rx = 0.55 * p.s, ry = 0.16 * p.s;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.12;
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    const n = Math.min(8, 2 + h.maxed * 2);
    ctx.fillStyle = '#fff3a0';
    for (let i = 0; i < n; i++) {
      const a = t * 1.6 + (i / n) * Math.PI * 2;
      const rise = ((t * 0.6 + i / n) % 1) * HERO_HEIGHT * p.s;
      ctx.globalAlpha = 0.8 * (1 - rise / (HERO_HEIGHT * p.s));
      ctx.fillRect(p.x + Math.cos(a) * rx - 1.5, p.y + Math.sin(a) * ry - rise - 1.5, 3, 3);
    }
    ctx.restore();
  }

  drawFx(ctx) {
    const sc = this.scene;
    // 魔王砸地的衝擊波（貼在地面上的橢圓圈往外擴散）
    for (const w of this.shocks) {
      if (w.t < 0) continue;
      const k = w.t / 0.6;
      const p = sc.project(w.x, w.z);
      const r = (w.big ? 2.6 : 1.4) * k * p.s;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = w.big ? '#ff6a3a' : '#e0d0c0';
      ctx.lineWidth = (w.big ? 5 : 3) * (1 - k) + 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 魔王的火星
    for (const p of this.embers) {
      const q = sc.project(p.x, p.z, p.h);
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      ctx.fillStyle = p.life > 0.5 ? '#ffb347' : '#ff4a2a';
      ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
    // 技能特效（箭、法球、閃電、劍氣、隕石…）
    for (const s of this.streaks) this.drawShot(ctx, s);
    ctx.globalAlpha = 1;
    // 命中光點
    for (const p of this.sparks) {
      const q = sc.project(p.x, p.z, p.h);
      ctx.globalAlpha = Math.min(1, p.life * 4);
      ctx.fillStyle = p.color;
      const r = Math.max(1.5, q.s * 0.035);
      ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    // 近戰的刀光（一道彎月形）
    for (const s of this.slashes) {
      const p = sc.project(s.x, s.z, s.h);
      const r = 0.55 * p.s;
      const k = 1 - s.life / 0.18;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = 1 - k;
      // 彎月形刀光：外圈亮色、內圈白芯
      const rr = r * (s.big ? 1.6 : 1);
      ctx.fillStyle = s.color || (s.crit ? '#ffdd55' : '#e8f4ff');
      ctx.beginPath();
      ctx.arc(0, 0, rr, -Math.PI * 0.9 + k, -Math.PI * 0.1 + k);
      ctx.arc(rr * 0.18, rr * 0.12, rr * 0.82, -Math.PI * 0.1 + k, -Math.PI * 0.9 + k, true);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, rr * 0.96, -Math.PI * 0.8 + k, -Math.PI * 0.2 + k);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // 金幣粒子
    for (const p of this.parts) {
      const q = sc.project(p.x, p.z, p.h);
      ctx.globalAlpha = Math.min(1, p.life * 3);
      drawIcon(ctx, 'pp', 151, q.x, q.y, Math.max(8, q.s * 0.22));
    }
    ctx.globalAlpha = 1;
    // 傷害數字
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    for (const t of this.texts) {
      const p = sc.project(t.x, t.z, t.h);
      const pop = t.life > 0.65 ? 1 + (t.life - 0.65) * 3 : 1; // 剛跳出來時大一點
      ctx.globalAlpha = Math.min(1, t.life * 2.5);
      ctx.font = `${Math.round(t.size * pop)}px ${FONT}`;
      ctx.strokeText(t.text, p.x, p.y - t.rise);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, p.x, p.y - t.rise);
    }
    ctx.globalAlpha = 1;
  }

  // 畫一個技能特效。k = 進度（0 剛出發 → 1 結束）
  drawShot(ctx, s) {
    const sc = this.scene;
    const k = 1 - s.life / s.max;
    const a = sc.project(s.x1, s.z1, s.h1);
    const b = sc.project(s.x2, s.z2, s.h2);
    const lerp = (t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const u = Math.max(1, b.s / 36); // 依遠近縮放
    ctx.save();
    ctx.lineCap = 'round';
    switch (s.style) {
      case 'arrow': case 'bullet': {
        // 飛行物：前 60% 時間飛到目標，之後淡出
        const t = Math.min(1, k / 0.6);
        const p = lerp(t);
        ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
        const tail = lerp(Math.max(0, t - 0.35));
        const tg = ctx.createLinearGradient(tail.x, tail.y, p.x, p.y);
        tg.addColorStop(0, 'rgba(255,255,255,0)');
        tg.addColorStop(1, s.color);
        ctx.strokeStyle = tg;
        ctx.lineWidth = s.style === 'bullet' ? 2.5 * u : 2 * u;
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.translate(p.x, p.y); ctx.rotate(ang);
        if (s.style === 'arrow') {
          // 箭身＋箭頭＋尾羽
          ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 1.8 * u;
          ctx.beginPath(); ctx.moveTo(-12 * u, 0); ctx.lineTo(0, 0); ctx.stroke();
          ctx.fillStyle = '#e8eef7';
          ctx.beginPath(); ctx.moveTo(5 * u, 0); ctx.lineTo(-1 * u, -3 * u); ctx.lineTo(-1 * u, 3 * u); ctx.fill();
          ctx.fillStyle = s.color;
          ctx.beginPath(); ctx.moveTo(-12 * u, 0); ctx.lineTo(-15 * u, -3 * u); ctx.lineTo(-9 * u, 0); ctx.lineTo(-15 * u, 3 * u); ctx.fill();
        } else {
          ctx.fillStyle = '#fff6c0';
          ctx.beginPath(); ctx.ellipse(0, 0, 4 * u, 1.8 * u, 0, 0, Math.PI * 2); ctx.fill();
          if (k < 0.15) { ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(-(b.x - a.x) * t, 0, 5 * u, 0, Math.PI * 2); ctx.fill(); }
        }
        break;
      }
      case 'orb': {
        const t = Math.min(1, k / 0.65);
        const p = lerp(t);
        ctx.globalAlpha = k < 0.65 ? 1 : (1 - k) / 0.35;
        // 拖尾的小光點
        for (let i = 1; i <= 4; i++) {
          const q = lerp(Math.max(0, t - i * 0.06));
          ctx.globalAlpha *= 0.85;
          ctx.fillStyle = s.color;
          ctx.beginPath(); ctx.arc(q.x, q.y, (5 - i) * u, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = k < 0.65 ? 1 : (1 - k) / 0.35;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9 * u);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, s.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, 9 * u, 0, Math.PI * 2); ctx.fill();
        if (k > 0.6) { // 命中時炸開一圈
          ctx.strokeStyle = s.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(b.x, b.y, (k - 0.6) * 40 * u, 0, Math.PI * 2); ctx.stroke();
        }
        break;
      }
      case 'bolt': {
        // 閃電：鋸齒折線，每一格畫面都重新抖動
        ctx.globalAlpha = Math.min(1, s.life / s.max * 2);
        const pts = [a];
        const n = 7;
        for (let i = 1; i < n; i++) {
          const q = lerp(i / n);
          const off = (Math.random() - 0.5) * 18 * u;
          pts.push({ x: q.x - Math.sin(ang) * off, y: q.y + Math.cos(ang) * off });
        }
        pts.push(b);
        for (const [w, c] of [[7 * u, s.color], [2.2 * u, '#ffffff']]) {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round';
          ctx.globalAlpha *= w > 3 ? 0.55 : 1;
          ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
          ctx.globalAlpha = Math.min(1, s.life / s.max * 2);
        }
        break;
      }
      case 'wave': {
        // 劍氣：一道巨大的彎月往前飛
        const p = lerp(k);
        ctx.globalAlpha = 1 - k * 0.7;
        ctx.translate(p.x, p.y);
        const R = 34 * u * (1 + k * 0.6);
        const g = ctx.createLinearGradient(-R, 0, R * 0.6, 0);
        g.addColorStop(0, 'rgba(127,209,255,0)'); g.addColorStop(1, s.color);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(0, 0, R * 0.55, R, 0, -Math.PI / 2, Math.PI / 2);
        ctx.ellipse(-R * 0.25, 0, R * 0.35, R * 0.85, 0, Math.PI / 2, -Math.PI / 2, true);
        ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, 0, R * 0.55, R, 0, -Math.PI / 2.4, Math.PI / 2.4); ctx.stroke();
        break;
      }
      case 'meteor': {
        // 隕石／流星：從天上斜斜落下，拖著火尾，落地爆炸
        const t = Math.min(1, k / 0.55);
        const p = lerp(t);
        if (k < 0.55) {
          const tail = lerp(Math.max(0, t - 0.3));
          const g = ctx.createLinearGradient(tail.x, tail.y, p.x, p.y);
          g.addColorStop(0, 'rgba(255,90,40,0)'); g.addColorStop(1, s.color);
          ctx.strokeStyle = g; ctx.lineWidth = 9 * u;
          ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.fillStyle = '#fff3c0';
          ctx.beginPath(); ctx.arc(p.x, p.y, 5.5 * u, 0, Math.PI * 2); ctx.fill();
        } else {
          const e = (k - 0.55) / 0.45;
          ctx.globalAlpha = 1 - e;
          const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 30 * u * (0.5 + e));
          g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, s.color); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(b.x, b.y, 30 * u * (0.5 + e), 18 * u * (0.5 + e), 0, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'grenade': {
        // 榴彈：拋物線飛過去，落地爆炸
        const t = Math.min(1, k / 0.6);
        if (k < 0.6) {
          const p = lerp(t);
          const lift = Math.sin(t * Math.PI) * 50 * u;
          ctx.fillStyle = '#3a3a3a';
          ctx.beginPath(); ctx.arc(p.x, p.y - lift, 4 * u, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffb347';
          ctx.fillRect(p.x - 1, p.y - lift - 6 * u, 2, 3 * u);
        } else {
          const e = (k - 0.6) / 0.4;
          ctx.globalAlpha = 1 - e;
          for (const [r, c] of [[26, s.color], [16, '#fff6c0']]) {
            ctx.fillStyle = c;
            ctx.beginPath(); ctx.arc(b.x, b.y, r * u * (0.4 + e), 0, Math.PI * 2); ctx.fill();
          }
        }
        break;
      }
      case 'fire': {
        // 火焰：一團團火球沿路噴過去
        const reach = Math.min(1, k / 0.5);
        ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
        for (let i = 0; i < 9; i++) {
          const t = reach * (i / 8);
          const q = lerp(t);
          const wob = Math.sin(s.seed + i * 1.7 + k * 20) * 6 * u;
          const r = (4 + t * 9) * u;
          ctx.fillStyle = i % 3 === 0 ? '#fff0a0' : i % 3 === 1 ? '#ff9f43' : s.color;
          ctx.beginPath(); ctx.arc(q.x, q.y + wob, r, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'holy': {
        // 光柱：從天而降照在敵人身上
        ctx.globalAlpha = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
        const w = 14 * u * (1 - k * 0.5);
        const g = ctx.createLinearGradient(b.x - w, 0, b.x + w, 0);
        g.addColorStop(0, 'rgba(255,242,168,0)'); g.addColorStop(0.5, '#fffbe0'); g.addColorStop(1, 'rgba(255,242,168,0)');
        ctx.fillStyle = g;
        ctx.fillRect(b.x - w, sc.top, w * 2, b.y - sc.top);
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.ellipse(b.x, b.y, w * 1.6, w * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'saw': {
        // 鏈鋸：一片旋轉的鋸片飛過去
        const t = Math.min(1, k / 0.6);
        const p = lerp(t);
        ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
        ctx.translate(p.x, p.y); ctx.rotate(k * 30);
        ctx.fillStyle = '#c0c8d8';
        ctx.beginPath();
        for (let i = 0; i < 16; i++) { const r = (i % 2 ? 7 : 10) * u; const aa = i / 16 * Math.PI * 2; ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); }
        ctx.fill();
        ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(0, 0, 3 * u, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'dash': {
        // 衝刺：好幾條速度線
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = s.color;
        for (let i = -2; i <= 2; i++) {
          ctx.lineWidth = (3 - Math.abs(i)) * 1.5 * u;
          ctx.beginPath(); ctx.moveTo(a.x, a.y + i * 6 * u); ctx.lineTo(b.x, b.y + i * 3 * u); ctx.stroke();
        }
        break;
      }
      default: {
        // 光束：粗的彩色外光＋白芯
        ctx.globalAlpha = Math.min(1, s.life / s.max * 2);
        for (const [w, c] of [[10 * u, s.color], [3 * u, '#ffffff']]) {
          ctx.strokeStyle = c; ctx.lineWidth = w;
          ctx.globalAlpha *= w > 4 ? 0.6 : 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // 敵人身上的狀態：擊暈星星、中毒／燃燒冒泡、冰霜
  drawStatus(ctx, e, p, top) {
    const t = this.scene.t;
    const u = Math.max(1, p.s / 40);
    if (e.stun > 0) {
      for (let i = 0; i < 3; i++) {
        const a = t * 6 + i * 2.1;
        const x = p.x + Math.cos(a) * 12 * u, y = top - 4 * u + Math.sin(a) * 4 * u;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        for (let j = 0; j < 10; j++) { const r = (j % 2 ? 1.6 : 4) * u; const aa = j / 10 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r); }
        ctx.fill();
      }
    }
    if (e.dotT > 0) {
      ctx.fillStyle = e.dotColor || '#7dff5a';
      for (let i = 0; i < 4; i++) {
        const ph = (t * 1.3 + i * 0.25) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.beginPath(); ctx.arc(p.x + Math.sin(i * 2.3 + t * 2) * 10 * u, p.y - ph * (p.y - top), (2.5 - ph) * u + 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (e.slow > 0) {
      ctx.strokeStyle = 'rgba(159,227,255,0.85)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) {
        const x = p.x + (i ? 10 : -12) * u, y = top + (p.y - top) * (0.3 + i * 0.3), r = 3.5 * u;
        for (let j = 0; j < 3; j++) { const aa = j * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(aa) * r, y - Math.sin(aa) * r); ctx.lineTo(x + Math.cos(aa) * r, y + Math.sin(aa) * r); ctx.stroke(); }
      }
    }
  }

  // 魔王關的畫面效果：登場時暗場＋紅色警示條＋名字卡；之後畫面上方顯示大血條
  drawBossOverlay(ctx) {
    const sc = this.scene;
    const { W, top, bottom } = sc;
    const t = sc.t;
    const boss = this.boss;
    if (boss || this.bossIntro) {
      // 四周紅色暗角，隨心跳脈動
      const beat = 0.5 + Math.sin(t * (boss && boss.enraged ? 9 : 5)) * 0.5;
      const v = ctx.createRadialGradient(W / 2, (top + bottom) / 2, 40, W / 2, (top + bottom) / 2, W * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(140,0,20,${0.25 + beat * 0.2})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, top, W, bottom - top);
    }
    const bi = this.bossIntro;
    if (bi) {
      const k = bi.t;
      // 暗場
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 0.55 - Math.max(0, k - 2) * 0.55)})`;
      ctx.fillRect(0, top, W, bottom - top);
      // 上下滑入的警示條
      const slide = Math.min(1, k * 3) * (k > 2.5 ? Math.max(0, 1 - (k - 2.5) * 2) : 1);
      for (const [y, dir] of [[top + 58, 1], [bottom - 40, -1]]) {
        ctx.save();
        ctx.translate((1 - slide) * W * dir, 0);
        ctx.fillStyle = 'rgba(200,0,30,0.85)';
        ctx.fillRect(0, y, W, 16);
        ctx.fillStyle = '#ffd84a';
        const off = (t * 60) % 24;
        for (let x = -24 + off; x < W + 24; x += 24) {
          ctx.beginPath();
          ctx.moveTo(x, y + 16); ctx.lineTo(x + 8, y + 16); ctx.lineTo(x + 16, y); ctx.lineTo(x + 8, y);
          ctx.fill();
        }
        ctx.restore();
      }
      // WARNING 字樣與魔王名字
      ctx.save();
      ctx.globalAlpha = slide;
      ctx.textAlign = 'center';
      ctx.font = `${30 + Math.sin(t * 12) * 2}px ${FONT}`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#000';
      ctx.strokeText('⚠ WARNING ⚠', W / 2, top + 112);
      ctx.fillStyle = '#ff3b3b';
      ctx.fillText('⚠ WARNING ⚠', W / 2, top + 112);
      ctx.font = `18px ${FONT}`;
      ctx.strokeText(`魔王「${bi.e.name}」出現了！`, W / 2, top + 140);
      ctx.fillStyle = '#fff';
      ctx.fillText(`魔王「${bi.e.name}」出現了！`, W / 2, top + 140);
      ctx.restore();
    }
    // 魔王大血條（登場演出結束後）
    if (boss && !bi) {
      const bw = W - 40, x = 20, y = top + 66;
      const f = Math.max(0, boss.hp / boss.maxHp);
      this.hpShown = this.hpShown === undefined ? f : this.hpShown + (f - this.hpShown) * 0.08;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(x - 2, y - 2, bw + 4, 14);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, bw * this.hpShown, 10); // 白色殘影：剛扣掉的血慢慢消失
      const g = ctx.createLinearGradient(x, 0, x + bw, 0);
      g.addColorStop(0, boss.enraged ? '#ff2a2a' : '#ff3df0');
      g.addColorStop(1, boss.enraged ? '#ff8a2a' : '#8a3dff');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, bw * f, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, y, bw * f, 2);
      ctx.strokeStyle = boss.enraged ? '#ffd84a' : '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 2, y - 2, bw + 4, 14);
      ctx.textAlign = 'left';
      ctx.font = `12px ${FONT}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      const label = `魔王・${boss.name}${boss.enraged ? '（狂暴）' : ''}`;
      ctx.strokeText(label, x, y - 5);
      ctx.fillStyle = boss.enraged ? '#ff6a6a' : '#ffd0ff';
      ctx.fillText(label, x, y - 5);
      ctx.textAlign = 'right';
      const num = `${fmt(Math.max(0, boss.hp))} / ${fmt(boss.maxHp)}`;
      ctx.strokeText(num, x + bw, y - 5);
      ctx.fillStyle = '#fff';
      ctx.fillText(num, x + bw, y - 5);
      // 50% 的位置畫一條線：打到這裡會狂暴
      ctx.fillStyle = '#ffd84a';
      ctx.fillRect(x + bw * 0.5 - 1, y - 2, 2, 14);
    } else {
      this.hpShown = undefined;
    }
    // 白色閃光（狂暴、打倒魔王）
    if (this.flashWhite > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashWhite * 0.7})`;
      ctx.fillRect(0, top, W, bottom - top);
    }
  }

  bar(ctx, x, y, w, f, color, big) {
    const hgt = big ? 6 : 4;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, hgt + 2);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, f)), hgt);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, f)), 1);
  }
}
