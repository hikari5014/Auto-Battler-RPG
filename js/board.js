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

  // 背景只在尺寸改變時重畫一次（漸層＋格線＋兩側石牆），每格直接貼上
  bgCanvas(ctx) {
    const key = `${this.W}x${this.h}`;
    if (this._bg && this._bgKey === key) return this._bg;
    const sc = ctx.getTransform().a; // 畫布實際放大倍率，讓預先畫好的圖夠清楚
    const c = document.createElement('canvas');
    c.width = Math.ceil(this.W * sc);
    c.height = Math.ceil((this.h + 40) * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    const grad = g.createLinearGradient(0, 0, 0, this.h);
    grad.addColorStop(0, '#2d1f52');
    grad.addColorStop(0.6, '#1b1236');
    grad.addColorStop(1, '#0f0a1f');
    g.fillStyle = grad;
    g.fillRect(0, 0, this.W, this.h + 40);
    // 細格線，增加「機台」的質感
    g.strokeStyle = 'rgba(255,255,255,0.035)';
    g.lineWidth = 1;
    for (let x = 0; x <= this.W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, this.h + 40); g.stroke(); }
    for (let y = 0; y <= this.h + 40; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(this.W, y); g.stroke(); }
    // 兩側的光暈邊框
    for (const [x0, x1] of [[0, 10], [this.W, this.W - 10]]) {
      const side = g.createLinearGradient(x0, 0, x1, 0);
      side.addColorStop(0, 'rgba(140,110,255,0.35)');
      side.addColorStop(1, 'rgba(140,110,255,0)');
      g.fillStyle = side;
      g.fillRect(Math.min(x0, x1), 0, 10, this.h + 40);
    }
    this._bg = c;
    this._bgKey = key;
    return c;
  }

  // 釘子：預先畫好一顆有光澤的小球
  pegSprite(ctx) {
    if (this._peg) return this._peg;
    const sc = ctx.getTransform().a;
    const r = PR + 2;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(r * 2 * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    const rg = g.createRadialGradient(r - 1.5, r - 1.5, 0.5, r, r, PR);
    rg.addColorStop(0, '#f2ecff');
    rg.addColorStop(0.45, '#9d8ae6');
    rg.addColorStop(1, '#4a3a8c');
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.arc(r + 0.8, r + 1.2, PR, 0, TAU); g.fill();
    g.fillStyle = rg;
    g.beginPath(); g.arc(r, r, PR, 0, TAU); g.fill();
    this._peg = c;
    return c;
  }

  draw(ctx, coins) {
    const { top, bottom, W } = this;
    ctx.drawImage(this.bgCanvas(ctx), 0, top, W, this.h + 40);

    // 釘子：被撞到時發光
    const peg = this.pegSprite(ctx);
    const pr = PR + 2;
    for (const p of this.pegs) ctx.drawImage(peg, p.x - pr, p.y - pr, pr * 2, pr * 2);
    ctx.fillStyle = '#fff6c8';
    for (const p of this.pegs) {
      if (p.lit <= 0) continue;
      ctx.globalAlpha = p.lit * 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PR + 2 * p.lit, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawGates(ctx);

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

    this.drawPourCup(ctx);
    this.drawCatchCup(ctx, coins);

    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    for (const p of this.pops) {
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = '#ffe680';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  // 倍率門：發光的能量門，裡面有往下流動的箭頭
  drawGates(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const g of this.gates) {
      const st = GATE_STYLE[g.type];
      const y = this.gateY(g.row);
      const pulse = 0.5 + Math.sin(this.t * 4 + g.id) * 0.5;
      ctx.save();
      // 外光暈
      ctx.shadowColor = st.color;
      ctx.shadowBlur = 10 + g.flash * 14;
      ctx.fillStyle = st.color;
      ctx.globalAlpha = 0.22 + g.flash * 0.45 + pulse * 0.08;
      roundRect(ctx, g.x, y - 11, g.w, 22, 6);
      ctx.fill();
      ctx.restore();
      // 流動的箭頭
      ctx.save();
      roundRect(ctx, g.x, y - 11, g.w, 22, 6);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 2;
      const off = (this.t * 30) % 12;
      for (let x = g.x - 12 + off; x < g.x + g.w + 12; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 4);
        ctx.lineTo(x, y + 2);
        ctx.lineTo(x + 4, y - 4);
        ctx.stroke();
      }
      ctx.restore();
      // 邊框
      ctx.strokeStyle = st.color;
      ctx.lineWidth = 2;
      roundRect(ctx, g.x, y - 11, g.w, 22, 6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(g.x + 6, y - 10, g.w - 12, 1.5);
      // 文字
      ctx.font = `${17 + g.flash * 5}px ${FONT}`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(g.type, g.x + g.w / 2, y + 1);
      ctx.fillStyle = '#fff';
      ctx.fillText(g.type, g.x + g.w / 2, y + 1);
    }
    ctx.textBaseline = 'alphabetic';
  }

  drawPourCup(ctx) {
    const x = this.px, y = this.top + 12;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI + Math.sin(this.t * 6) * (this.queue > 0 ? 0.08 : 0));
    cupShape(ctx, 34, 26, 1);
    ctx.restore();
    ctx.textAlign = 'center';
    if (this.queue > 0) {
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = '#ffd84a';
      ctx.fillText('x' + this.queue, x + 32, y + 4);
    }
    // 提示可以拖曳
    ctx.globalAlpha = 0.3 + Math.sin(this.t * 3) * 0.12;
    ctx.fillStyle = '#e6dcff';
    ctx.font = `12px ${FONT}`;
    ctx.fillText('◀ 左右拖曳瞄準 ▶', this.W / 2, this.top + 46);
    ctx.globalAlpha = 1;
  }

  drawCatchCup(ctx, coins) {
    const cx = this.cupX, y = this.cupY, h = this.cupH;
    const w = this.cupW * (1 + this.cupPulse * 0.05);
    // 杯子底下的光圈
    const glow = ctx.createRadialGradient(cx, y + h, 4, cx, y + h, w * 0.7);
    glow.addColorStop(0, 'rgba(255,90,80,0.35)');
    glow.addColorStop(1, 'rgba(255,90,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - w, y - 10, w * 2, h + 30);
    ctx.save();
    ctx.translate(cx, y);
    cupShape(ctx, w, h, 0.76);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.font = `16px ${FONT}`;
    const label = fmt(coins);
    const tw = ctx.measureText(label).width;
    drawIcon(ctx, 'pp', 67, cx - tw / 2 - 8, y + h / 2 + 2, 22);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.strokeText(label, cx + 8, y + h / 2 + 4);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, cx + 8, y + h / 2 + 4);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText('接住 x2', cx, y - 12);
  }
}

// 紅色派對杯：漸層杯身＋白色杯口＋左側反光
function cupShape(ctx, w, h, bottomRatio) {
  const bw = w * bottomRatio;
  const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  body.addColorStop(0, '#ff6b5e');
  body.addColorStop(0.35, '#e8392f');
  body.addColorStop(1, '#9e1f1a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(w / 2, 0);
  ctx.lineTo(bw / 2, h);
  ctx.lineTo(-bw / 2, h);
  ctx.closePath();
  ctx.fill();
  // 杯身的橫紋
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (const f of [0.35, 0.7]) {
    const ww = w + (bw - w) * f;
    ctx.beginPath();
    ctx.moveTo(-ww / 2 + 2, h * f);
    ctx.lineTo(ww / 2 - 2, h * f);
    ctx.stroke();
  }
  // 反光
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 6, 6);
  ctx.lineTo(-w / 2 + 11, 6);
  ctx.lineTo(-bw / 2 + 9, h - 5);
  ctx.lineTo(-bw / 2 + 5, h - 5);
  ctx.closePath();
  ctx.fill();
  // 杯口
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-w / 2 - 3, -3, w + 6, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(-w / 2 - 3, 2, w + 6, 1);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function fmt(n) {
  n = Math.floor(n);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
