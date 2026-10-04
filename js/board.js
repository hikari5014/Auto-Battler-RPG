// 彈珠台：小球從上方的倒球杯落下，穿過倍率門被放大，最後掉進下方接球杯換成球幣
import { sfx } from './audio.js';
import { drawIcon, FONT } from './sprites.js';

const G = 950;          // 重力
const BR = 4.5;         // 小球半徑
const PR = 4;           // 釘子半徑
const CAP = 450;        // 畫面上最多幾顆球；超過就改成「一顆球代表更多球幣」
const MAX_GATES = 6;
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

const GATE_STYLE = {
  x2: { w: 104, copies: 1, color: '#36d6ff' },
  x3: { w: 80, copies: 2, color: '#ff5ce1' },
  '+3': { w: 88, copies: 3, color: '#6dff8a' },
};

export class Board {
  constructor() {
    this.balls = [];
    this.pegs = [];
    this.gates = [];
    this.pops = [];
    this.queue = 0;
    this.emitAcc = 0;
    this.px = 180;
    this.targetX = 180;
    this.cupW = 130;
    this.cupX = 180;
    this.cupPulse = 0;
    this.t = 0;
    this.onCatch = () => {};
    this.onPeg = () => {};
  }

  layout(top, bottom, W) {
    this.top = top;
    this.bottom = bottom;
    this.W = W;
    this.h = bottom - top;
    this.cupY = bottom - 58;
    this.cupH = 46;
    this.pegs = [];
    [0.16, 0.24, 0.45, 0.52, 0.71, 0.78].forEach((f, i) => {
      const y = top + this.h * f;
      const sp = 40;
      for (let x = 20 + (i % 2 ? sp / 2 : 0); x < W - 10; x += sp) this.pegs.push({ x, y, lit: 0 });
    });
    this.targetX = this.px = Math.min(this.px, W - 20);
  }

  gateY(row) { return this.top + this.h * (row === 0 ? 0.35 : 0.6); }

  reset(run) {
    this.run = run;
    this.balls.length = 0;
    this.pops.length = 0;
    this.queue = 0;
    this.cupW = 130;
    this.gates = [];
    this.addGate('x2', 0);
    this.addGate('+3', 1);
  }

  addGate(type, row) {
    if (this.gates.length >= MAX_GATES) {
      // 門滿了：把一道 x2 升級成 x3
      const g = this.gates.find(g => g.type === 'x2');
      if (g) { g.type = 'x3'; g.w = GATE_STYLE.x3.w; }
      return;
    }
    if (row === undefined) {
      const r0 = this.gates.filter(g => g.row === 0).length;
      const r1 = this.gates.length - r0;
      row = r0 <= r1 ? 0 : 1;
    }
    const st = GATE_STYLE[type];
    this.gates.push({
      id: this.gates.length, type, row, w: st.w,
      x: rand(4, this.W - st.w - 4),
      vx: (Math.random() < 0.5 ? -1 : 1) * rand(25, 50),
      flash: 0,
    });
  }

  pour(n) { this.queue += n; }

  isEmpty() { return this.queue === 0 && this.balls.length === 0; }

  spawn(x, y, vx, vy, v, mask) { this.balls.push({ x, y, vx, vy, v, mask }); }

  update(dt) {
    this.t += dt;
    this.px += (this.targetX - this.px) * Math.min(1, dt * 14);

    // 倒球：排隊越多倒越快
    if (this.queue > 0) {
      const rate = Math.min(150, 20 + this.queue * 1.5);
      this.emitAcc += rate * dt;
      while (this.emitAcc >= 1 && this.queue > 0) {
        this.emitAcc -= 1;
        this.queue--;
        this.spawn(this.px + rand(-6, 6), this.top + 22, rand(-30, 30), rand(30, 70), 1, 0);
      }
    } else this.emitAcc = 0;

    for (const g of this.gates) {
      g.x += g.vx * dt;
      if (g.x < 4) { g.x = 4; g.vx = Math.abs(g.vx); }
      if (g.x > this.W - g.w - 4) { g.x = this.W - g.w - 4; g.vx = -Math.abs(g.vx); }
      g.flash = Math.max(0, g.flash - dt * 4);
    }
    for (const p of this.pegs) p.lit = Math.max(0, p.lit - dt * 5);
    this.cupPulse = Math.max(0, this.cupPulse - dt * 6);

    const range = (this.W - this.cupW) / 2 - 6;
    this.cupX = this.W / 2 + Math.sin(this.t * 0.8) * range;

    const steps = Math.max(1, Math.ceil(dt * 120));
    for (let s = 0; s < steps; s++) this.step(dt / steps);

    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.life -= dt;
      p.y -= 40 * dt;
      if (p.life <= 0) this.pops.splice(i, 1);
    }
  }

  step(dt) {
    const { balls, pegs, gates, W } = this;
    const cupTop = this.cupY;
    const cupL = this.cupX - this.cupW / 2;
    const cupR = this.cupX + this.cupW / 2;
    const magnet = this.run.hero.def.id === 'mage';
    const minD = BR + PR;
    const minD2 = minD * minD;
    const gy0 = this.gateY(0);
    const gy1 = this.gateY(1);

    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const py = b.y;
      b.vy += G * dt;
      if (b.vy > 650) b.vy = 650;
      if (magnet && b.y > cupTop - 160 && b.y < cupTop) {
        const dx = this.cupX - b.x;
        if (Math.abs(dx) < 120) b.vx += Math.sign(dx) * 480 * dt;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < BR) { b.x = BR; b.vx = Math.abs(b.vx) * 0.5; }
      else if (b.x > W - BR) { b.x = W - BR; b.vx = -Math.abs(b.vx) * 0.5; }

      for (let k = 0; k < pegs.length; k++) {
        const p = pegs[k];
        const dy = b.y - p.y;
        if (dy > minD || dy < -minD) continue;
        const dx = b.x - p.x;
        if (dx > minD || dx < -minD) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 < minD2 && d2 > 1e-4) {
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;
          b.x = p.x + nx * minD;
          b.y = p.y + ny * minD;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= 1.5 * vn * nx;
            b.vy -= 1.5 * vn * ny;
            b.vx += rand(-15, 15);
            p.lit = 1;
            this.onPeg();
            sfx('peg');
          }
        }
      }

      for (let k = 0; k < gates.length; k++) {
        const g = gates[k];
        const gy = g.row === 0 ? gy0 : gy1;
        if (py < gy && b.y >= gy && b.x >= g.x && b.x <= g.x + g.w && !(b.mask & (1 << g.id))) {
          b.mask |= 1 << g.id;
          this.trigger(b, g);
        }
      }

      // 接球杯：從杯口上方進入就算接到
      if (py < cupTop && b.y >= cupTop && b.x > cupL && b.x < cupR) {
        this.collect(b);
        balls[i] = balls[balls.length - 1];
        balls.pop();
        continue;
      }
      // 杯子外壁：撞到側邊會被彈開
      if (b.y > cupTop && b.y < cupTop + this.cupH) {
        if (b.x > cupL - BR && b.x < cupL + 3) { b.x = cupL - BR; b.vx = -Math.abs(b.vx) * 0.4 - 20; }
        else if (b.x < cupR + BR && b.x > cupR - 3) { b.x = cupR + BR; b.vx = Math.abs(b.vx) * 0.4 + 20; }
      }
      // 沒進杯子的球落到地板：照樣算錢，但沒有杯子的 x2 加成
      if (b.y > this.bottom - BR) {
        this.onCatch(b, 1);
        balls[i] = balls[balls.length - 1];
        balls.pop();
      }
    }
  }

  trigger(b, g) {
    const copies = GATE_STYLE[g.type].copies;
    g.flash = 1;
    sfx('gate');
    if (this.balls.length + copies > CAP) {
      b.v *= copies + 1;
      return;
    }
    for (let k = 0; k < copies; k++) {
      this.spawn(b.x + rand(-3, 3), b.y + 1, b.vx + rand(-60, 60), b.vy * rand(0.5, 0.85), b.v, b.mask);
    }
  }

  collect(b) {
    this.onCatch(b, 2);
    sfx('clink');
    this.cupPulse = 1;
    if (b.v > 1 || Math.random() < 0.2) {
      this.pops.push({ x: this.cupX + rand(-20, 20), y: this.cupY - 6, text: '+' + fmt(b.v * 2), life: 0.6 });
    }
  }

  draw(ctx, coins) {
    const { top, bottom, W } = this;
    const bg = ctx.createLinearGradient(0, top, 0, bottom);
    bg.addColorStop(0, '#2a1d4a');
    bg.addColorStop(1, '#120c24');
    ctx.fillStyle = bg;
    ctx.fillRect(0, top, W, bottom - top + 40);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, top, W, 4);

    // 釘子
    ctx.fillStyle = '#8a76d4';
    ctx.beginPath();
    for (const p of this.pegs) { ctx.moveTo(p.x + PR, p.y); ctx.arc(p.x, p.y, PR, 0, TAU); }
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (const p of this.pegs) {
      if (p.lit <= 0) continue;
      ctx.globalAlpha = p.lit;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PR + 1, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 倍率門
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const g of this.gates) {
      const st = GATE_STYLE[g.type];
      const y = this.gateY(g.row);
      ctx.globalAlpha = 0.28 + g.flash * 0.5;
      ctx.fillStyle = st.color;
      ctx.fillRect(g.x, y - 9, g.w, 18);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = st.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(g.x, y - 9, g.w, 18);
      ctx.font = `${16 + g.flash * 4}px ${FONT}`;
      ctx.fillStyle = '#fff';
      ctx.fillText(g.type, g.x + g.w / 2, y + 1);
    }

    // 小球：一般球 = 金幣，高價值球 = 寶石（Kenney Pixel Platformer）
    ctx.imageSmoothingEnabled = false;
    if (!drawIcon(ctx, 'pp', 151, -99, -99, 1)) {
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      for (const b of this.balls) { ctx.moveTo(b.x + BR, b.y); ctx.arc(b.x, b.y, BR, 0, TAU); }
      ctx.fill();
    } else {
      for (const b of this.balls) {
        if (b.v > 1) drawIcon(ctx, 'pp', 67, b.x, b.y, 18);
        else drawIcon(ctx, 'pp', 151, b.x, b.y, 16);
      }
    }

    ctx.fillStyle = '#3a2a63';
    ctx.fillRect(0, bottom - 2, W, 40);
    this.drawPourCup(ctx);
    this.drawCatchCup(ctx, coins);

    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = '#fff';
    for (const p of this.pops) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  drawPourCup(ctx) {
    const x = this.px, y = this.top + 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI + Math.sin(this.t * 6) * (this.queue > 0 ? 0.08 : 0));
    ctx.fillStyle = '#e8423f';
    ctx.beginPath();
    ctx.moveTo(-16, -14);
    ctx.lineTo(16, -14);
    ctx.lineTo(12, 14);
    ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-17, 10, 34, 5);
    ctx.restore();
    if (this.queue > 0) {
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = '#ffd84a';
      ctx.fillText('x' + this.queue, x + 30, y + 4);
    }
    // 提示可以拖曳
    ctx.globalAlpha = 0.35 + Math.sin(this.t * 3) * 0.15;
    ctx.fillStyle = '#fff';
    ctx.font = `12px ${FONT}`;
    ctx.fillText('◀ 左右拖曳瞄準 ▶', this.W / 2, this.top + 42);
    ctx.globalAlpha = 1;
  }

  drawCatchCup(ctx, coins) {
    const cx = this.cupX, y = this.cupY, h = this.cupH;
    const w = this.cupW * (1 + this.cupPulse * 0.05);
    ctx.fillStyle = '#c92f2c';
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, y);
    ctx.lineTo(cx + w / 2, y);
    ctx.lineTo(cx + w * 0.38, y + h);
    ctx.lineTo(cx - w * 0.38, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff5c58';
    ctx.fillRect(cx - w / 2 + 6, y + 8, 6, h - 16);
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - w / 2 - 3, y - 3, w + 6, 6);
    ctx.font = `16px ${FONT}`;
    ctx.fillStyle = '#fff';
    const label = fmt(coins);
    const tw = ctx.measureText(label).width;
    drawIcon(ctx, 'pp', 67, cx - tw / 2 - 8, y + h / 2 + 1, 22);
    ctx.fillText(label, cx + 8, y + h / 2 + 3);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText('接住 x2', cx, y - 12);
  }
}

export function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
