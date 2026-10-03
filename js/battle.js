// 自動戰鬥：英雄站左邊，敵人從右邊走過來，雙方自己打
import { sfx } from './audio.js';
import { CHAPTERS, MAX_WAVE } from './data.js';
import { fmt } from './board.js';

const rand = (a, b) => a + Math.random() * (b - a);
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export function createHero(def, save) {
  const maxHp = def.hp * (1 + 0.1 * save.up.hp);
  return {
    def, maxHp, hp: maxHp,
    baseAtk: def.atk * (1 + 0.1 * save.up.atk),
    atkMul: 1, spdMul: 1,
    interval: def.interval, range: def.range,
    hits: def.hits, crit: 0.05, critDmg: 1.5,
    block: 0, dbl: 0, life: def.life || 0, splash: def.splash || 0, thorns: 0,
    ballsPerKill: 5,
    x: 64, timer: 0, hitQueue: 0, hitTimer: 0, swings: 0,
    lunge: 0, hurt: 0,
  };
}

export const heroAtk = h => h.baseAtk * h.atkMul;

export class Battle {
  constructor(game) {
    this.g = game;
    this.enemies = [];
    this.queue = [];
    this.texts = [];
    this.streaks = [];
    this.parts = [];
    this.shake = 0;
    this.spawnTimer = 0;
  }

  reset() {
    this.enemies = [];
    this.queue = [];
    this.texts = [];
    this.streaks = [];
    this.parts = [];
  }

  startWave(run) {
    const w = run.wave;
    const ch = CHAPTERS[(run.chapter - 1) % CHAPTERS.length];
    const scale = (1 + 0.16 * (w - 1)) * Math.pow(1.8, run.chapter - 1);
    const mk = (kind, emoji) => {
      const m = kind === 'boss' ? { hp: 22, atk: 2.6, size: 64, balls: 12, iv: 1.6 }
        : kind === 'elite' ? { hp: 5, atk: 1.8, size: 50, balls: 4, iv: 1.4 }
        : { hp: 1, atk: 1, size: 34, balls: 1, iv: 1.3 };
      const maxHp = 18 * scale * m.hp;
      return {
        emoji, kind, maxHp, hp: maxHp, atk: 2.4 * scale * m.atk, interval: m.iv,
        timer: rand(0, 0.6), x: this.g.W + 40, size: m.size, ballMul: m.balls,
        kb: 0, flash: 0, lunge: 0, dead: false,
      };
    };
    const q = [];
    const n = w === MAX_WAVE ? 2 : 3 + Math.floor(w * 0.55);
    for (let i = 0; i < n; i++) q.push(mk('normal', ch.enemies[Math.floor(Math.random() * ch.enemies.length)]));
    if (w % 5 === 0 && w !== MAX_WAVE) q.push(mk('elite', '👹'));
    if (w === MAX_WAVE) q.push(mk('boss', ch.boss));
    this.queue = q;
    this.spawnTimer = 0.4;
  }

  cleared() { return this.queue.length === 0 && this.enemies.length === 0; }

  update(dt, fighting) {
    const run = this.g.run;
    const h = run.hero;
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

    // 敵人排隊走向英雄
    this.enemies.forEach((e, i) => {
      const stop = h.x + 46 + i * 34 + (e.size - 34) * 0.4;
      if (e.x > stop) e.x = Math.max(stop, e.x - 75 * dt);
      e.kb = Math.max(0, e.kb - dt * 40);
      e.flash = Math.max(0, e.flash - dt * 6);
      e.lunge = Math.max(0, e.lunge - dt * 6);
      if (i < 2 && e.x <= stop + 1) {
        e.timer += dt;
        if (e.timer >= e.interval) {
          e.timer = 0;
          e.lunge = 1;
          this.enemyHit(e);
        }
      }
    });

    // 英雄攻擊
    const front = this.enemies[0];
    if (front && front.x - h.x <= h.range + 10) {
      h.timer += dt * h.spdMul;
      if (h.timer >= h.interval && h.hitQueue <= 0) {
        h.timer = 0;
        let rounds = 1 + Math.floor(h.dbl) + (Math.random() < h.dbl % 1 ? 1 : 0);
        h.hitQueue = h.hits * rounds;
        h.hitTimer = 0;
        if (rounds > 1) this.text(h.x, this.g.groundY - 70, '連擊!', '#ffdd55', 14);
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
    if (h.range > 100) this.streaks.push({ x1: h.x + 14, y1: this.g.groundY - 22, x2: t.x, y2: this.g.groundY - t.size / 2, life: 0.15, color: crit ? '#ffdd55' : '#fff' });
    this.damage(t, dmg, crit);
    if (h.splash > 0) {
      for (const e of this.enemies) if (e !== t && !e.dead) this.damage(e, dmg * h.splash, false, true);
    }
    if (h.life > 0) h.hp = Math.min(h.maxHp, h.hp + dmg * h.life);
    sfx(crit ? 'crit' : 'hit');
    if (crit) {
      this.shake = Math.max(this.shake, 5);
      if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { /* ignore */ }
    }
  }

  swordWave() {
    const dmg = heroAtk(this.g.run.hero);
    this.text(this.g.run.hero.x + 40, this.g.groundY - 60, '劍氣!', '#7fd1ff', 15);
    for (const e of this.enemies) if (!e.dead) this.damage(e, dmg, false, true);
    this.streaks.push({ x1: this.g.run.hero.x, y1: this.g.groundY - 20, x2: this.g.W, y2: this.g.groundY - 20, life: 0.25, color: '#7fd1ff', wide: true });
  }

  // 給英雄被動用：對最前面的敵人造成傷害
  strikeFront(mult, label, color) {
    const t = this.enemies.find(e => !e.dead);
    if (!t) return;
    const h = this.g.run.hero;
    this.streaks.push({ x1: h.x + 14, y1: this.g.groundY - 30, x2: t.x, y2: this.g.groundY - t.size / 2, life: 0.2, color });
    this.damage(t, heroAtk(h) * mult, false);
    this.text(t.x, this.g.groundY - t.size - 26, label, color, 13);
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  damage(e, dmg, crit, small) {
    e.hp -= dmg;
    e.flash = 1;
    e.kb = small ? 2 : 6;
    this.text(e.x + rand(-8, 8), this.g.groundY - e.size - 10, fmt(Math.max(1, dmg)), crit ? '#ffdd55' : (small ? '#cfd8ff' : '#fff'), crit ? 20 : (small ? 11 : 14));
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.g.onKill(e);
      sfx('kill');
      for (let i = 0; i < 10; i++) {
        this.parts.push({ x: e.x, y: this.g.groundY - e.size / 2, vx: rand(-120, 120), vy: rand(-220, -60), life: 0.6, color: '#ffd84a' });
      }
      if (e.kind !== 'normal') this.shake = 10;
    }
  }

  enemyHit(e) {
    const h = this.g.run.hero;
    if (Math.random() < h.block) {
      this.text(h.x, this.g.groundY - 64, '格擋', '#9fe3ff', 14);
      sfx('block');
      return;
    }
    h.hp -= e.atk;
    h.hurt = 1;
    this.text(h.x + rand(-6, 6), this.g.groundY - 60, '-' + fmt(e.atk), '#ff5a5a', 14);
    sfx('hurt');
    if (h.thorns > 0) this.damage(e, e.atk * h.thorns, false, true);
  }

  text(x, y, text, color, size) {
    if (this.texts.length > 60) this.texts.shift();
    this.texts.push({ x, y, text, color, size, life: 0.8 });
  }

  updateFx(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 35 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.streaks.length - 1; i >= 0; i--) {
      this.streaks[i].life -= dt;
      if (this.streaks[i].life <= 0) this.streaks.splice(i, 1);
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
  }

  draw(ctx) {
    const { W, battleH, groundY, run } = this.g;
    const ch = CHAPTERS[(run.chapter - 1) % CHAPTERS.length];
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, ch.sky[0]);
    sky.addColorStop(1, ch.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, groundY);
    ctx.fillStyle = ch.ground;
    ctx.fillRect(0, groundY, W, battleH - groundY);
    ctx.fillStyle = ch.dirt;
    ctx.fillRect(0, groundY + 10, W, battleH - groundY - 10);

    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake) * 0.6);

    const h = run.hero;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // 敵人
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const x = e.x + e.kb - e.lunge * 10;
      this.shadow(ctx, x, e.size);
      ctx.font = `${e.size}px ${EMOJI_FONT}`;
      if (e.flash > 0) ctx.globalAlpha = 0.6 + 0.4 * (1 - e.flash);
      ctx.fillText(e.emoji, x, groundY + 4);
      ctx.globalAlpha = 1;
      this.bar(ctx, x - 18, groundY - e.size - 8, 36, e.hp / e.maxHp, '#ff4d4d');
    }

    // 英雄
    const hx = h.x + h.lunge * 10;
    this.shadow(ctx, hx, 44);
    ctx.font = `44px ${EMOJI_FONT}`;
    if (h.hurt > 0) ctx.globalAlpha = 0.5 + 0.5 * (1 - h.hurt);
    ctx.fillText(h.def.emoji, hx, groundY + 4);
    ctx.globalAlpha = 1;
    this.bar(ctx, h.x - 30, groundY - 58, 60, h.hp / h.maxHp, '#4dff7a', true);
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${fmt(Math.max(0, h.hp))}/${fmt(h.maxHp)}`, h.x, groundY - 62);

    for (const s of this.streaks) {
      ctx.globalAlpha = Math.min(1, s.life * 6);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.wide ? 8 : 3;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2.5);
      ctx.font = `900 ${t.size}px system-ui, sans-serif`;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  shadow(ctx, x, size) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, this.g.groundY + 4, size * 0.4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  bar(ctx, x, y, w, f, color, big) {
    const hgt = big ? 6 : 4;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 1, y - 1, w + 2, hgt + 2);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, f)), hgt);
  }
}
