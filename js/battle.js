// 自動戰鬥（2.5D）：角色是平面紙片人，站在有深度的 3D 地面上
// 英雄站在左前方，敵人從右後方的霧裡走出來，排成一斜排往前逼近
import { sfx } from './audio.js';
import { CHAPTERS, MAX_WAVE, ELITE_SPRITE } from './data.js';
import { drawSprite, drawIcon, FONT } from './sprites.js';
import { fmt } from './board.js';
import { Scene } from './scene.js';

const rand = (a, b) => a + Math.random() * (b - a);
const HERO_POS = { x: -1.35, z: 4 };
const HERO_HEIGHT = 0.9;   // 英雄在世界裡有多高（公尺）

export function createHero(def, save) {
  const maxHp = def.hp * (1 + 0.1 * save.up.hp);
  return {
    def, maxHp, hp: maxHp,
    baseAtk: def.atk * (1 + 0.1 * save.up.atk),
    atkMul: 1, spdMul: 1,
    interval: def.interval, range: def.range / 48, // 換算成世界距離
    hits: def.hits, crit: 0.05, critDmg: 1.5,
    block: 0, dbl: 0, life: def.life || 0, splash: def.splash || 0, thorns: 0,
    ballsPerKill: 5,
    x: HERO_POS.x, z: HERO_POS.z, timer: 0, hitQueue: 0, hitTimer: 0, swings: 0,
    lunge: 0, hurt: 0,
  };
}

export const heroAtk = h => h.baseAtk * h.atkMul;

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
  }

  layout(W, top, bottom) { this.scene.layout(W, top, bottom); }

  startWave(run) {
    const w = run.wave;
    const ch = CHAPTERS[(run.chapter - 1) % CHAPTERS.length];
    const scale = (1 + 0.16 * (w - 1)) * Math.pow(1.8, run.chapter - 1);
    const mk = (kind, sprite) => {
      const m = kind === 'boss' ? { hp: 22, atk: 2.6, size: 1.55, balls: 12, iv: 1.6 }
        : kind === 'elite' ? { hp: 5, atk: 1.8, size: 1.1, balls: 4, iv: 1.4 }
        : { hp: 1, atk: 1, size: 0.75, balls: 1, iv: 1.3 };
      const maxHp = 18 * scale * m.hp;
      return {
        sprite, kind, maxHp, hp: maxHp, atk: 2.4 * scale * m.atk, interval: m.iv,
        timer: rand(0, 0.6), x: rand(2, 3.2), z: rand(17, 20), size: m.size, ballMul: m.balls,
        kb: 0, flash: 0, lunge: 0, dead: false, phase: rand(0, 6),
      };
    };
    const q = [];
    const n = w === MAX_WAVE ? 2 : 3 + Math.floor(w * 0.55);
    for (let i = 0; i < n; i++) q.push(mk('normal', ch.enemies[Math.floor(Math.random() * ch.enemies.length)]));
    if (w % 5 === 0 && w !== MAX_WAVE) q.push(mk('elite', ELITE_SPRITE));
    if (w === MAX_WAVE) q.push(mk('boss', ch.boss));
    this.queue = q;
    this.spawnTimer = 0.4;
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
    if (!fighting) return;

    if (this.queue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.enemies.push(this.queue.shift());
        this.spawnTimer = 0.75;
      }
    }

    // 敵人走向自己的排隊位置
    this.enemies.forEach((e, i) => {
      const s = slot(i, e.kind === 'boss');
      const dx = s.x - e.x, dz = s.z - e.z;
      const d = Math.hypot(dx, dz);
      const step = 3.2 * dt;
      if (d > step) { e.x += dx / d * step; e.z += dz / d * step; } else { e.x = s.x; e.z = s.z; }
      e.kb = Math.max(0, e.kb - dt * 4);
      e.flash = Math.max(0, e.flash - dt * 6);
      e.lunge = Math.max(0, e.lunge - dt * 6);
      if (i < 2 && d < 0.05) {
        e.timer += dt;
        if (e.timer >= e.interval) {
          e.timer = 0;
          e.lunge = 1;
          this.enemyHit(e);
        }
      }
    });

    // 英雄攻擊：最前面的敵人進入射程就開打
    const front = this.enemies[0];
    if (front && Math.hypot(front.x - h.x, front.z - h.z) <= h.range + 0.2) {
      h.timer += dt * h.spdMul;
      if (h.timer >= h.interval && h.hitQueue <= 0) {
        h.timer = 0;
        const rounds = 1 + Math.floor(h.dbl) + (Math.random() < h.dbl % 1 ? 1 : 0);
        h.hitQueue = h.hits * rounds;
        h.hitTimer = 0;
        if (rounds > 1) this.text(h.x, h.z, 1.3, '連擊!', '#ffdd55', 14);
        h.swings++;
        if (h.def.id === 'blade' && h.swings % 3 === 0) this.swordWave();
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
    const crit = Math.random() < h.crit;
    const dmg = heroAtk(h) * (crit ? h.critDmg : 1) * rand(0.9, 1.1);
    h.lunge = 1;
    if (h.range > 2) this.streak(h, t, crit ? '#ffdd55' : '#ffffff', 0.15);
    else this.slashes.push({ x: t.x, z: t.z, h: t.size * 0.5, life: 0.18, rot: rand(-0.6, 0.6), crit });
    this.damage(t, dmg, crit);
    if (h.splash > 0) {
      for (const e of this.enemies) if (e !== t && !e.dead) this.damage(e, dmg * h.splash, false, true);
    }
    if (h.life > 0) h.hp = Math.min(h.maxHp, h.hp + dmg * h.life);
    sfx(crit ? 'crit' : 'hit');
    if (crit) {
      this.shake = Math.max(this.shake, 5);
      this.scene.cam.punch = 1;
      if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { /* ignore */ }
    }
  }

  swordWave() {
    const h = this.g.run.hero;
    const dmg = heroAtk(h);
    this.text(h.x + 0.6, h.z, 1.2, '劍氣!', '#7fd1ff', 15);
    for (const e of this.enemies) if (!e.dead) this.damage(e, dmg, false, true);
    this.streaks.push({ x1: h.x, z1: h.z, h1: 0.4, x2: 4, z2: 14, h2: 0.4, life: 0.25, color: '#7fd1ff', wide: true });
  }

  // 給英雄被動用：對最前面的敵人造成傷害
  strikeFront(mult, label, color) {
    const t = this.enemies.find(e => !e.dead);
    if (!t) return;
    const h = this.g.run.hero;
    this.streak(h, t, color, 0.2);
    this.damage(t, heroAtk(h) * mult, false);
    this.text(t.x, t.z, t.size + 0.5, label, color, 13);
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  streak(h, t, color, life) {
    this.streaks.push({ x1: h.x + 0.2, z1: h.z, h1: 0.5, x2: t.x, z2: t.z, h2: t.size * 0.5, life, color });
  }

  damage(e, dmg, crit, small) {
    e.hp -= dmg;
    e.flash = 1;
    e.kb = small ? 0.3 : 1;
    this.text(e.x + rand(-0.15, 0.15), e.z, e.size + 0.25, fmt(Math.max(1, dmg)), crit ? '#ffdd55' : (small ? '#cfd8ff' : '#fff'), crit ? 20 : (small ? 11 : 14));
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.g.onKill(e);
      sfx('kill');
      // 金幣在 3D 空間裡噴出、落地彈跳
      for (let i = 0; i < 10; i++) {
        this.parts.push({ x: e.x, z: e.z, h: e.size * 0.5, vx: rand(-1.6, 1.6), vz: rand(-1.2, 1.6), vh: rand(2, 4.5), life: rand(0.6, 0.9) });
      }
      if (e.kind !== 'normal') { this.shake = 10; this.scene.cam.punch = 1.5; }
    }
  }

  enemyHit(e) {
    const h = this.g.run.hero;
    if (Math.random() < h.block) {
      this.text(h.x, h.z, 1.2, '格擋', '#9fe3ff', 14);
      sfx('block');
      return;
    }
    h.hp -= e.atk;
    h.hurt = 1;
    this.text(h.x + rand(-0.1, 0.1), h.z, 1.15, '-' + fmt(e.atk), '#ff5a5a', 14);
    sfx('hurt');
    if (h.thorns > 0) this.damage(e, e.atk * h.thorns, false, true);
  }

  // 傷害數字：記住世界座標，畫的時候再換算到畫面上
  text(x, z, hgt, text, color, size) {
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
  }

  drawActor(ctx, sprite, x, z, size, flash, phase, lift = 0) {
    const sc = this.scene;
    sc.shadow(ctx, x, z, size * 0.7);
    const p = sc.project(x, z, lift);
    // 待機時輕微呼吸：身體一伸一縮
    const breathe = Math.sin(sc.t * 5 + phase) * 0.04;
    const w = size * p.s * (1 - breathe);
    const hgt = size * p.s * (1 + breathe);
    ctx.globalAlpha = 1 - sc.fogAt(z) * 0.85;
    drawSprite(ctx, sprite, p.x, p.y + 1, w, false, flash, 'dg', hgt);
    ctx.globalAlpha = 1;
    return { p, top: p.y - hgt };
  }

  drawEnemy(ctx, e) {
    // 擊退：被打時往後彈；攻擊：往英雄方向撲一下
    const x = e.x + e.kb * 0.35 - e.lunge * 0.3;
    const z = e.z + e.kb * 0.2;
    const lift = e.lunge * 0.1;
    const { p, top } = this.drawActor(ctx, e.sprite, x, z, e.size, e.flash, e.phase, lift);
    if (!e.teaser && this.scene.fogAt(z) < 0.6) {
      const bw = Math.max(24, Math.min(54, e.size * p.s * 0.8));
      this.bar(ctx, p.x - bw / 2, top - 7, bw, e.hp / e.maxHp, e.kind === 'boss' ? '#ff3df0' : '#ff4d4d', e.kind === 'boss');
    }
  }

  drawHero(ctx, h) {
    const x = h.x + h.lunge * 0.25;
    const { p, top } = this.drawActor(ctx, h.def.sprite, x, h.z, HERO_HEIGHT * (h.scale || 1), h.hurt * 0.6, 0);
    if (h.showcase) return;
    this.bar(ctx, p.x - 32, top - 9, 64, h.hp / h.maxHp, '#4dff7a', true);
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    const label = `${fmt(Math.max(0, h.hp))}/${fmt(h.maxHp)}`;
    ctx.strokeText(label, p.x, top - 13);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, p.x, top - 13);
  }

  drawFx(ctx) {
    const sc = this.scene;
    // 遠程攻擊的光束
    for (const s of this.streaks) {
      const a = sc.project(s.x1, s.z1, s.h1);
      const b = sc.project(s.x2, s.z2, s.h2);
      ctx.globalAlpha = Math.min(1, s.life * 6);
      ctx.strokeStyle = s.color;
      ctx.lineCap = 'round';
      ctx.lineWidth = s.wide ? 9 : 3;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // 近戰的刀光（一道彎月形）
    for (const s of this.slashes) {
      const p = sc.project(s.x, s.z, s.h);
      const r = 0.55 * p.s;
      const k = 1 - s.life / 0.18;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = s.crit ? '#ffdd55' : '#ffffff';
      ctx.lineWidth = 5 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI * 0.85 + k, -Math.PI * 0.15 + k);
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
