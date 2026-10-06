// 彈珠台：小球從上方的倒球杯落下，穿過倍率門被放大，最後掉進下方接球杯換成球幣
import { sfx } from './audio.js';
import { drawIcon, FONT } from './sprites.js';
import { boardOf } from './levels.js';
import { settings } from './settings.js';

const BR = 4.5;         // 小球半徑
const PR = 4;           // 釘子半徑
const CAP = 450;        // 畫面上最多幾顆球；超過就改成「一顆球代表更多球幣」
const MAX_GATES = 10;     // 起始 2 道 + 陷阱門最多 2 道 + 技能最多 6 道
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);

// 倍率門的樣子由「類型字串」決定：'x2' 乘法門、'+3' 加法門、'x0.5' 紅色陷阱門
// copies = 穿過時多生出幾顆球
function gateStyle(type) {
  const v = parseFloat(type.slice(1));
  if (type[0] === 'x') {
    if (v < 1) return { w: 72, copies: 0, trap: true, color: '#ff4d4d' };
    if (v >= 4) return { w: 70, copies: v - 1, color: '#d06bff', rainbow: true };
    if (v >= 3) return { w: 80, copies: v - 1, color: '#ffd84a', gold: true };
    return { w: 104, copies: v - 1, color: '#36d6ff' };
  }
  return { w: v >= 6 ? 78 : 88, copies: v, color: v >= 5 ? '#4dffc3' : '#6dff8a' };
}
const pick = list => list[Math.floor(Math.random() * list.length)];

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
    // 拖曳回饋：grab = 抓住的程度（0~1，有彈性）、tilt = 杯子跟著甩動的角度
    this.touch = null;      // { x, y } 手指位置
    this.grab = 0; this.grabV = 0;
    this.tilt = 0; this.tiltV = 0;
    this.rings = [];        // 手指按下時擴散的光圈
    this.dragHintSeen = false;
    this.t = 0;
    this.onCatch = () => {};
    this.onPeg = () => {};
    this.onGoldPeg = () => {};
  }

  layout(top, bottom, W) {
    this.top = top;
    this.bottom = bottom;
    this.W = W;
    this.h = bottom - top;
    this.cupY = bottom - 58;
    this.cupH = 46;
    this.build();
    this.targetX = this.px = Math.min(this.px, W - 20);
  }

  // 依章節設定，把比例座標換成畫面座標，建立釘子與各種機關
  build() {
    const cfg = this.cfg || boardOf(1);
    const X = fx => fx * this.W;
    const Y = fy => this.top + fy * this.h;
    this.gravity = cfg.gravity;
    this.pegs = [...cfg.pegs, ...(cfg.extraPegs || [])].map(([x, y]) => ({ x: X(x), y: Y(y), lit: 0 }));
    // 3.9 特殊釘子：金釘（撞到給球幣）、晶釘（把球分裂成兩顆，每顆球只分一次）
    for (const [x, y] of cfg.goldPegs || []) this.pegs.push({ x: X(x), y: Y(y), lit: 0, kind: 'gold', cd: 0 });
    for (const [x, y] of cfg.splitPegs || []) this.pegs.push({ x: X(x), y: Y(y), lit: 0, kind: 'split' });
    // 3.9 輸送帶：一條橫向的風帶，經過的球被往 dir 方向推
    this.belts = (cfg.belts || []).map(([y, x1, x2, dir]) => ({ y: Y(y), x1: X(x1), x2: X(x2), dir }));
    this.walls = (cfg.walls || []).map(([x1, y1, x2, y2]) => ({ x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2) }));
    this.bumpers = (cfg.bumpers || []).map(([x, y, r]) => ({ x: X(x), y: Y(y), r, lit: 0 }));
    this.holes = (cfg.holes || []).map(([x, y]) => ({ x: X(x), y: Y(y), r: 10 }));
    this.portals = (cfg.portals || []).map(([x1, y1, x2, y2]) => ({ x1: X(x1), y1: Y(y1), x2: X(x2), y2: Y(y2), r: 13, lit: 0 }));
    this.lava = cfg.lava || 0;
    this._bg = null;
  }

  setChapter(chapter) {
    this.cfg = boardOf(chapter);
    if (this.W) this.build();
  }

  gateY(row) { return this.top + this.h * (row === 0 ? 0.35 : 0.6); }

  reset(run) {
    this.run = run;
    this.balls.length = 0;
    this.pops.length = 0;
    this.queue = 0;
    this.cupW = 130;
    this.cupMult = 2;   // 接住的球乘幾倍（大肚杯滿級變 3）
    this.setChapter(run.chapter);
    this.wind = { t: 3, dir: 0, gust: 0 };
    this.gates = [];
    // 兩道基本門：數值每波隨機（見 rerollGates）
    this.addGate('x2', 0, true);
    this.addGate('+3', 1, true);
    for (let i = 0; i < (run.diff.traps || 0); i++) this.addGate('x0.5', i % 2, false, true);
    this.rerollGates();
  }

  // 每一波重新抽基本門的數值（依章節範圍），陷阱門也換位置
  rerollGates() {
    const vals = this.cfg.gates;
    for (const g of this.gates) {
      if (g.trap) { g.x = rand(4, this.W - g.w - 4); g.flash = 1; continue; }
      if (!g.base) continue;
      // 每日挑戰「純乘法」：兩排都抽乘法門
      g.type = g.row === 0 || (this.run.mods || {}).mulOnly ? 'x' + pick(vals.mul) : '+' + pick(vals.add);
      g.w = gateStyle(g.type).w * g.wMul;
      g.x = Math.min(g.x, this.W - g.w - 4);
      g.flash = 1;
    }
  }

  addGate(type, row, base = false, trap = false) {
    if (this.gates.length >= MAX_GATES) return;
    if (row === undefined) {
      const r0 = this.gates.filter(g => g.row === 0).length;
      const r1 = this.gates.length - r0;
      row = r0 <= r1 ? 0 : 1;
    }
    const st = gateStyle(type);
    this.gates.push({
      id: this.gates.length, type, row, w: st.w, wMul: 1, base, trap,
      x: rand(4, this.W - st.w - 4),
      vx: (Math.random() < 0.5 ? -1 : 1) * rand(25, 50),
      flash: 0, phase: rand(0, 6), vis: 1,
    });
  }

  // 滿級獎勵用：某種門全部變寬（slow = 移動速度倍率）
  widenGates(type, k, slow = 1) {
    for (const g of this.gates) {
      if (g.type !== type) continue;
      g.wMul *= k;
      g.w = Math.min(this.W * 0.6, gateStyle(g.type).w * g.wMul);
      g.x = Math.min(g.x, this.W - g.w - 4);
      g.vx *= slow;
      g.flash = 1;
    }
  }
  upgradeGates(from, to) {
    for (const g of this.gates) if (g.type === from) { g.type = to; g.flash = 1; }
  }

  pour(n) { this.queue += n; }
  // 投石怪：隨機一道好門被石頭卡住幾秒
  blockRandomGate(sec) {
    const ok = this.gates.filter(g => !g.trap && !(g.stone > 0));
    if (!ok.length) return null;
    const g = ok[Math.floor(Math.random() * ok.length)];
    g.stone = sec;
    g.flash = 1;
    return g;
  }

  // 觸控（由 main.js 呼叫，座標是遊戲內座標）
  touchStart(x, y) {
    this.touch = { x, y };
    this.rings.push({ x, y, t: 0 });
    this.dragHintSeen = true;
    this.targetX = Math.max(14, Math.min(this.W - 14, x));
  }
  touchMove(x, y) {
    if (!this.touch) return;
    this.touch.x = x;
    this.touch.y = y;
    this.targetX = Math.max(14, Math.min(this.W - 14, x));
  }
  touchEnd() { this.touch = null; }

  isEmpty() { return this.queue === 0 && this.balls.length === 0; }

  spawn(x, y, vx, vy, v, mask) { this.balls.push({ x, y, vx, vy, v, mask, age: 0 }); }

  update(dt) {
    this.t += dt;
    const prevPx = this.px;
    this.px += (this.targetX - this.px) * Math.min(1, dt * 14);
    // 彈簧：抓住時放大、放開時抖一抖回到原狀
    const gTarget = this.touch ? 1 : 0;
    this.grabV += ((gTarget - this.grab) * 260 - this.grabV * 16) * dt;
    this.grab += this.grabV * dt;
    // 杯子往移動方向甩，停下來時晃回來
    const vel = dt > 0 ? (this.px - prevPx) / dt : 0;
    const tiltTarget = Math.max(-0.6, Math.min(0.6, -vel * 0.004));
    this.tiltV += ((tiltTarget - this.tilt) * 200 - this.tiltV * 12) * dt;
    this.tilt += this.tiltV * dt;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      this.rings[i].t += dt;
      if (this.rings[i].t > 0.45) this.rings.splice(i, 1);
    }

    // 倒球：排隊越多倒越快
    if (this.queue > 0) {
      const rate = this.slowPour ? 3 : Math.min(150, 20 + this.queue * 1.5); // 謎題：一顆一顆慢慢掉
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
      // 墓地：門會忽隱忽現
      g.vis = this.cfg.blink && !g.trap ? Math.max(0, Math.min(1, (Math.sin(this.t * 1.1 + g.phase) + 0.35) * 2.5)) : 1;
      // 被怪物丟石頭卡住：這段時間門沒有作用
      if (g.stone > 0) { g.stone -= dt; g.vis = Math.min(g.vis, 0.2); }
    }
    for (const b of this.bumpers) b.lit = Math.max(0, b.lit - dt * 5);
    for (const p of this.portals) p.lit = Math.max(0, p.lit - dt * 3);
    // 沙漠：每隔幾秒一陣風
    if (this.cfg.wind) {
      const w = this.wind;
      w.t -= dt;
      if (w.t <= 0) {
        if (w.gust > 0) { w.gust = 0; w.t = rand(3, 5); } else { w.gust = 1.4; w.dir = Math.random() < 0.5 ? -1 : 1; w.t = 1.4; }
      }
      if (w.gust > 0) w.gust = Math.max(0, w.gust - dt);
    }
    for (const p of this.pegs) { p.lit = Math.max(0, p.lit - dt * 5); if (p.cd) p.cd = Math.max(0, p.cd - dt); }
    this.cupPulse = Math.max(0, this.cupPulse - dt * 6);

    const range = (this.W - this.cupW) / 2 - 6;
    this.cupX = this.W / 2 + Math.sin(this.t * 0.8 * (this.cfg.cupSpeed || 1)) * range;

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
    const magnet = this.run.hero.magnet || 0; // 重力法師的吸力（技能可以加強）
    const G = this.gravity;
    const windF = this.cfg.wind && this.wind.gust > 0 ? this.wind.dir * 420 : 0;
    const minD = BR + PR;
    const minD2 = minD * minD;
    const gy0 = this.gateY(0);
    const gy1 = this.gateY(1);

    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const py = b.y;
      // 保險：卡住太久的球直接落地結算，避免整波卡住
      b.age += dt;
      if (b.age > 15) b.y = this.bottom;
      b.vy += G * dt;
      if (b.vy > 650) b.vy = 650;
      if (windF) b.vx += windF * dt;
      for (const bt of this.belts) if (b.y > bt.y - 8 && b.y < bt.y + 8 && b.x > bt.x1 && b.x < bt.x2) b.vx += bt.dir * 900 * dt;
      if (magnet && b.y > cupTop - 160 * magnet && b.y < cupTop) {
        const dx = this.cupX - b.x;
        if (Math.abs(dx) < 120 * magnet) b.vx += Math.sign(dx) * 480 * magnet * dt;
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
            if (p.kind === 'gold' && !p.cd) { p.cd = 0.5; this.onGoldPeg(p); }
            else if (p.kind === 'split' && !b.split && balls.length < 300) {
              b.split = true;
              balls.push({ x: b.x, y: b.y, vx: -b.vx + rand(-40, 40), vy: b.vy, v: b.v, mask: b.mask, age: b.age, split: true });
              this.pops.push({ x: p.x, y: p.y - 10, text: '分裂', life: 0.4, color: '#7fe8ff' });
            }
          }
        }
      }

      if (this.walls.length) this.hitWalls(b);
      if (this.bumpers.length) this.hitBumpers(b);
      if (this.portals.length) this.usePortals(b);
      if (this.holes.length && this.inHole(b, dt)) {
        balls[i] = balls[balls.length - 1];
        balls.pop();
        continue;
      }

      for (let k = 0; k < gates.length; k++) {
        const g = gates[k];
        const gy = g.row === 0 ? gy0 : gy1;
        if (g.vis < 0.5) continue; // 隱形的門無效
        if (py < gy && b.y >= gy && b.x >= g.x && b.x <= g.x + g.w && !(b.mask & (1 << g.id))) {
          b.mask |= 1 << g.id;
          this.trigger(b, g);
        }
      }
      if (b.dead) {
        balls[i] = balls[balls.length - 1];
        balls.pop();
        continue;
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
        // 火山：地板兩側是熔岩，球會被燒掉
        if (this.lava && (b.x < this.W * this.lava || b.x > this.W * (1 - this.lava))) {
          if (Math.random() < 0.3) this.pops.push({ x: b.x, y: this.bottom - 10, text: '燒掉', life: 0.5, color: '#ff7a3a' });
          balls[i] = balls[balls.length - 1];
          balls.pop();
          continue;
        }
        this.onCatch(b, 1);
        balls[i] = balls[balls.length - 1];
        balls.pop();
      }
    }
  }

  trigger(b, g) {
    const st = gateStyle(g.type);
    g.flash = 1;
    if (st.trap) {
      // 陷阱門：高價值球價值減半，一般球有一半機率直接消失
      sfx('deny');
      if (b.v > 1) b.v = Math.ceil(b.v * 0.5);
      else if (Math.random() < 0.5) b.dead = true;
      return;
    }
    const copies = st.copies;
    sfx('gate');
    if (this.balls.length + copies > CAP) {
      b.v *= copies + 1;
      return;
    }
    for (let k = 0; k < copies; k++) {
      this.spawn(b.x + rand(-3, 3), b.y + 1, b.vx + rand(-60, 60), b.vy * rand(0.5, 0.85), b.v, b.mask);
    }
  }

  // 斜牆（沙丘）：把球當成碰到一條有厚度的線段
  hitWalls(b) {
    const R = BR + 3;
    for (const w of this.walls) {
      const ex = w.x2 - w.x1, ey = w.y2 - w.y1;
      const len2 = ex * ex + ey * ey;
      let t = ((b.x - w.x1) * ex + (b.y - w.y1) * ey) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = w.x1 + ex * t, cy = w.y1 + ey * t;
      const dx = b.x - cx, dy = b.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= R * R || d2 < 1e-4) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d, ny = dy / d;
      b.x = cx + nx * R;
      b.y = cy + ny * R;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= 1.4 * vn * nx; b.vy -= 1.4 * vn * ny; }
    }
  }

  // 彈跳石：撞到會被大力彈開
  hitBumpers(b) {
    for (const p of this.bumpers) {
      const dx = b.x - p.x, dy = b.y - p.y;
      const R = p.r + BR;
      const d2 = dx * dx + dy * dy;
      if (d2 >= R * R || d2 < 1e-4) continue;
      const d = Math.sqrt(d2);
      const nx = dx / d, ny = dy / d;
      b.x = p.x + nx * R;
      b.y = p.y + ny * R;
      const speed = Math.max(340, Math.hypot(b.vx, b.vy) * 1.1);
      b.vx = nx * speed + rand(-20, 20);
      b.vy = ny * speed;
      if (p.lit < 0.5) sfx('peg');
      p.lit = 1;
      this.onPeg();
    }
  }

  // 傳送門：從入口進去，從出口出來（每顆球只會傳送一次）
  usePortals(b) {
    if (b.tp) return;
    for (const p of this.portals) {
      const dx = b.x - p.x1, dy = b.y - p.y1;
      if (dx * dx + dy * dy > p.r * p.r) continue;
      b.tp = true;
      b.x = p.x2 + rand(-4, 4);
      b.y = p.y2;
      b.vx = rand(-60, 60);
      b.vy = 40;
      b.mask = 0; // 可以再穿一次倍率門
      p.lit = 1;
      sfx('gate');
      return;
    }
  }

  // 黑洞：靠近會被吸過去，掉進去就沒了
  inHole(b, dt) {
    for (const h of this.holes) {
      const dx = h.x - b.x, dy = h.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 36 * 36) {
        const d = Math.sqrt(d2) || 1;
        b.vx += dx / d * 520 * dt;
        b.vy += dy / d * 520 * dt;
      }
      if (d2 < h.r * h.r) {
        if (Math.random() < 0.3) this.pops.push({ x: h.x, y: h.y - 12, text: '吞噬', life: 0.5, color: '#c58cff' });
        return true;
      }
    }
    return false;
  }

  collect(b) {
    this.onCatch(b, this.cupMult);
    sfx('clink');
    this.cupPulse = 1;
    if (b.v > 1 || Math.random() < 0.2) {
      this.pops.push({ x: this.cupX + rand(-20, 20), y: this.cupY - 6, text: '+' + fmt(b.v * this.cupMult), life: 0.6 });
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
    // 金釘、晶釘
    for (const p of this.pegs) {
      if (!p.kind) continue;
      ctx.fillStyle = p.kind === 'gold' ? '#ffd84a' : '#7fe8ff';
      ctx.strokeStyle = p.kind === 'gold' ? '#8a5a00' : '#1a6a8a';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, PR + 1.5, 0, TAU); ctx.fill(); ctx.stroke();
    }
    // 輸送帶：虛線＋往前跑的箭頭
    if (this.belts.length) {
      const t = performance.now() / 1000;
      for (const bt of this.belts) {
        ctx.fillStyle = 'rgba(160,220,255,0.18)';
        ctx.fillRect(bt.x1, bt.y - 7, bt.x2 - bt.x1, 14);
        ctx.fillStyle = 'rgba(200,240,255,0.75)';
        const span = bt.x2 - bt.x1;
        for (let k = 0; k < span / 26; k++) {
          const x = bt.x1 + (((k * 26 + t * 60 * bt.dir) % span) + span) % span;
          ctx.beginPath();
          ctx.moveTo(x + 5 * bt.dir, bt.y); ctx.lineTo(x - 3 * bt.dir, bt.y - 4); ctx.lineTo(x - 3 * bt.dir, bt.y + 4);
          ctx.fill();
        }
      }
    }

    this.drawFeatures(ctx);
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
      ctx.fillStyle = p.color || '#ffe680';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  // 倍率門：發光的能量門，裡面有往下流動的箭頭
  drawGates(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const g of this.gates) {
      const st = gateStyle(g.type);
      const y = this.gateY(g.row);
      if (g.stone > 0) {
        // 卡在門上的石頭
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#6b6158';
        ctx.beginPath(); ctx.ellipse(g.x + g.w / 2, y, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8d8276';
        ctx.beginPath(); ctx.ellipse(g.x + g.w / 2 - 3, y - 3, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (g.vis <= 0.02) {
        // 墓地：隱形中只留一條淡淡的虛線
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = st.color;
        ctx.setLineDash([3, 5]);
        ctx.strokeRect(g.x, y - 11, g.w, 22);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.globalAlpha = g.vis;
      const pulse = 0.5 + Math.sin(this.t * 4 + g.id) * 0.5;
      ctx.save();
      // 外光暈
      ctx.shadowColor = st.color;
      ctx.shadowBlur = settings.lowFx ? 0 : 10 + g.flash * 14;
      ctx.fillStyle = st.color;
      ctx.globalAlpha = (0.22 + g.flash * 0.45 + pulse * 0.08) * g.vis;
      roundRect(ctx, g.x, y - 11, g.w, 22, 6);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = g.vis;
      if (st.gold) this.drawGoldShine(ctx, g, y);
      if (st.rainbow) this.drawRainbow(ctx, g, y);
      if (st.trap) this.drawTrap(ctx, g, y);
      ctx.globalAlpha = g.vis;
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
      ctx.fillStyle = st.trap ? '#ffd0d0' : '#fff';
      ctx.fillText(g.type, g.x + g.w / 2, y + 1);
      ctx.globalAlpha = 1;
    }
    ctx.textBaseline = 'alphabetic';
  }

  // x4 以上：彩虹流動
  drawRainbow(ctx, g, y) {
    ctx.save();
    roundRect(ctx, g.x, y - 11, g.w, 22, 6);
    ctx.clip();
    const off = (this.t * 80) % 120;
    const rb = ctx.createLinearGradient(g.x - 120 + off, 0, g.x + off, 0);
    ['#ff5a5a', '#ffd84a', '#6dff8a', '#36d6ff', '#d06bff', '#ff5a5a'].forEach((c, i) => rb.addColorStop(i / 5, c));
    ctx.globalAlpha *= 0.45;
    ctx.fillStyle = rb;
    ctx.fillRect(g.x, y - 11, g.w, 22);
    ctx.restore();
  }

  // 陷阱門：紅黑斜紋警告
  drawTrap(ctx, g, y) {
    ctx.save();
    roundRect(ctx, g.x, y - 11, g.w, 22, 6);
    ctx.clip();
    ctx.globalAlpha *= 0.4;
    ctx.fillStyle = '#000';
    const off = (this.t * 20) % 16;
    for (let x = g.x - 22 + off; x < g.x + g.w + 22; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, y + 11);
      ctx.lineTo(x + 8, y + 11);
      ctx.lineTo(x + 18, y - 11);
      ctx.lineTo(x + 10, y - 11);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // 章節機關：沙丘、彈跳石、黑洞、傳送門、熔岩、陣風
  drawFeatures(ctx) {
    const t = this.t;
    // 沙丘斜坡
    for (const w of this.walls) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2); ctx.stroke();
      ctx.strokeStyle = '#e8b86a';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(w.x1, w.y1 - 1); ctx.lineTo(w.x2, w.y2 - 1); ctx.stroke();
    }
    // 彈跳石：發紅光的熔岩石
    for (const b of this.bumpers) {
      const r = b.r * (1 + b.lit * 0.15);
      const g = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, 1, b.x, b.y, r);
      g.addColorStop(0, b.lit > 0 ? '#fff2c0' : '#ffb15a');
      g.addColorStop(0.5, '#e0461f');
      g.addColorStop(1, '#5a1608');
      ctx.fillStyle = g;
      ctx.shadowColor = '#ff6a2a';
      ctx.shadowBlur = 8 + b.lit * 14;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
    }
    // 黑洞：旋轉的紫色漩渦
    for (const h of this.holes) {
      const g = ctx.createRadialGradient(h.x, h.y, 1, h.x, h.y, h.r + 8);
      g.addColorStop(0, '#000');
      g.addColorStop(0.55, '#2a0b4a');
      g.addColorStop(1, 'rgba(120,60,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 8, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,150,255,0.6)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) {
        const a = t * 3 + k * 2.1;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r + 3 - k * 2, a, a + 1.6); ctx.stroke();
      }
    }
    // 傳送門：入口紫、出口青
    for (const p of this.portals) {
      for (const [x, y, c] of [[p.x1, p.y1, '#d06bff'], [p.x2, p.y2, '#36d6ff']]) {
        ctx.strokeStyle = c;
        ctx.lineWidth = 3;
        ctx.shadowColor = c;
        ctx.shadowBlur = 10 + p.lit * 12;
        ctx.beginPath(); ctx.ellipse(x, y, p.r, p.r * 0.55, 0, 0, TAU); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.5;
        const a = t * 4;
        ctx.beginPath(); ctx.ellipse(x, y, p.r * 0.6, p.r * 0.32, 0, a, a + 3); ctx.stroke();
      }
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#cfc3f0';
      ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.quadraticCurveTo(this.W / 2, this.top + 10, p.x2, p.y2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    // 熔岩：地板兩側
    if (this.lava) {
      const lw = this.W * this.lava;
      for (const x0 of [0, this.W - lw]) {
        const g = ctx.createLinearGradient(0, this.bottom - 22, 0, this.bottom);
        g.addColorStop(0, 'rgba(255,90,30,0)');
        g.addColorStop(1, 'rgba(255,90,30,0.85)');
        ctx.fillStyle = g;
        ctx.fillRect(x0, this.bottom - 22, lw, 22);
        ctx.fillStyle = '#ffcf4a';
        for (let k = 0; k < 4; k++) {
          const bx = x0 + ((k * 37 + t * 20) % lw);
          const by = this.bottom - 4 - Math.abs(Math.sin(t * 3 + k)) * 10;
          ctx.globalAlpha = 0.8;
          ctx.fillRect(bx, by, 2.5, 2.5);
        }
        ctx.globalAlpha = 1;
      }
    }
    // 陣風：吹的時候畫出沙粒線條和方向箭頭
    if (this.cfg.wind && this.wind.gust > 0) {
      const dir = this.wind.dir;
      ctx.strokeStyle = 'rgba(240,200,140,0.35)';
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 14; k++) {
        const y = this.top + 60 + ((k * 53) % (this.h - 120));
        const x = ((t * 300 * dir + k * 97) % (this.W + 80) + this.W + 80) % (this.W + 80) - 40;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * 26, y); ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.font = `13px ${FONT}`;
      ctx.fillStyle = '#ffe0a0';
      ctx.fillText(dir > 0 ? '陣風 ▶▶' : '◀◀ 陣風', this.W / 2, this.top + 62);
    }
  }

  // 金色門：金屬漸層＋一道光掃過＋兩顆閃爍的小星星
  drawGoldShine(ctx, g, y) {
    ctx.save();
    roundRect(ctx, g.x, y - 11, g.w, 22, 6);
    ctx.clip();
    const metal = ctx.createLinearGradient(0, y - 11, 0, y + 11);
    metal.addColorStop(0, 'rgba(255,245,180,0.55)');
    metal.addColorStop(0.5, 'rgba(255,190,40,0.35)');
    metal.addColorStop(1, 'rgba(180,110,0,0.5)');
    ctx.fillStyle = metal;
    ctx.fillRect(g.x, y - 11, g.w, 22);
    const sx = g.x + ((this.t * 90 + g.id * 40) % (g.w + 60)) - 30;
    const sweep = ctx.createLinearGradient(sx - 14, 0, sx + 14, 0);
    sweep.addColorStop(0, 'rgba(255,255,255,0)');
    sweep.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    sweep.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sweep;
    ctx.fillRect(sx - 14, y - 11, 28, 22);
    ctx.restore();
    ctx.fillStyle = '#fffbe0';
    for (let i = 0; i < 2; i++) {
      const tw = Math.max(0, Math.sin(this.t * 5 + i * 2.1 + g.id));
      const px = g.x + g.w * (i ? 0.85 : 0.12);
      const py = y - 11 + (i ? 4 : 18);
      const r = 1 + tw * 2.5;
      ctx.globalAlpha = tw;
      ctx.fillRect(px - r, py - 0.6, r * 2, 1.2);
      ctx.fillRect(px - 0.6, py - r, 1.2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  drawPourCup(ctx) {
    const x = this.px, y = this.top + 12;
    const g = Math.max(0, this.grab);

    // 瞄準線：從杯口往下，碰到哪一道倍率門就讓那道門亮起來
    if (g > 0.05) {
      const aimed = this.gates.filter(gt => x >= gt.x && x <= gt.x + gt.w);
      ctx.save();
      ctx.globalAlpha = Math.min(1, g) * 0.55;
      ctx.strokeStyle = aimed.length ? '#ffe680' : '#cfc3f0';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -this.t * 40;
      ctx.beginPath();
      ctx.moveTo(x, y + 26);
      ctx.lineTo(x, this.cupY - 10);
      ctx.stroke();
      ctx.restore();
      for (const gt of aimed) gt.flash = Math.max(gt.flash, 0.35 * Math.min(1, g));
    }

    // 杯子：抓住時放大 15%，跟著甩動傾斜
    ctx.save();
    ctx.translate(x, y);
    const k = 1 + g * 0.15;
    ctx.scale(k, k);
    ctx.rotate(Math.PI + this.tilt + Math.sin(this.t * 6) * (this.queue > 0 ? 0.08 : 0));
    if (g > 0.05) {
      ctx.shadowColor = '#ffd84a';
      ctx.shadowBlur = 14 * Math.min(1, g);
    }
    ctx.translate(0, -16); // 讓壺身整個露在彈珠台上，壺口對準出球的位置
    urnShape(ctx, this.t, this.queue > 0);
    ctx.restore();

    ctx.textAlign = 'center';
    if (this.queue > 0) {
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = '#ffd84a';
      ctx.fillText('x' + this.queue, x + 32, y + 4);
    }

    // 手指位置：按下時擴散的光圈＋拖曳中的小圓圈
    for (const r of this.rings) {
      const k2 = r.t / 0.45;
      ctx.globalAlpha = 1 - k2;
      ctx.strokeStyle = '#ffe680';
      ctx.lineWidth = 3 * (1 - k2) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 8 + k2 * 30, 0, TAU);
      ctx.stroke();
    }
    if (this.touch) {
      ctx.globalAlpha = 0.5 + Math.sin(this.t * 10) * 0.15;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.touch.x, this.touch.y, 14, 0, TAU);
      ctx.stroke();
      // 手指到杯子之間的連線，表示「正在控制杯子」
      ctx.globalAlpha = 0.25;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.moveTo(this.touch.x, this.touch.y - 14);
      ctx.lineTo(x, y + 16);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;

    // 提示可以拖曳：還沒摸過時比較明顯，左右箭頭會擺動
    if (!this.touch) {
      const swing = Math.sin(this.t * 3) * 6;
      ctx.globalAlpha = this.dragHintSeen ? 0.25 : 0.55 + Math.sin(this.t * 3) * 0.15;
      ctx.fillStyle = '#e6dcff';
      ctx.font = `12px ${FONT}`;
      ctx.fillText('左右拖曳瞄準', this.W / 2, this.top + 46);
      ctx.fillText('◀', this.W / 2 - 52 - swing, this.top + 46);
      ctx.fillText('▶', this.W / 2 + 52 + swing, this.top + 46);
      ctx.globalAlpha = 1;
    }
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
    potShape(ctx, w, h, 0.76, this.t, this.cupMult, coins);
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
    ctx.fillText('接住 x' + this.cupMult, cx, y - 12);
  }
}

const OUTLINE = '#1a1020';

// 倒球器：倒過來的魔法寶壺（銅色壺身、金色壺口、中間一顆會發光的寶石）
// 座標已經轉了 180 度，所以「往下」畫的壺口其實朝下
function urnShape(ctx, t, pouring) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  // 壺身（圓肚）
  const body = ctx.createRadialGradient(-6, 18, 2, 0, 14, 22);
  body.addColorStop(0, '#f2b670');
  body.addColorStop(0.55, '#b8662c');
  body.addColorStop(1, '#5c2a12');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 14, 19, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // 金色腰帶
  ctx.fillStyle = '#ffd84a';
  ctx.fillRect(-18, 10, 36, 4);
  ctx.strokeRect(-18, 10, 36, 4);
  // 兩邊的耳朵
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 21, 12, 4, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c98a3a';
    ctx.fill();
    ctx.stroke();
  }
  // 壺口（朝下倒球的那一端）：金色寬邊
  const neck = ctx.createLinearGradient(-10, 0, 10, 0);
  neck.addColorStop(0, '#fff2a8');
  neck.addColorStop(0.5, '#ffc928');
  neck.addColorStop(1, '#b4770f');
  ctx.fillStyle = neck;
  ctx.beginPath();
  ctx.moveTo(-9, 2);
  ctx.lineTo(9, 2);
  ctx.lineTo(13, -6);
  ctx.lineTo(-13, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a1408';
  ctx.beginPath();
  ctx.ellipse(0, -6, 11, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 正中間的寶石：倒球時閃得更快
  const pulse = 0.6 + Math.sin(t * (pouring ? 12 : 4)) * 0.4;
  ctx.fillStyle = `rgba(208,107,255,${0.35 * pulse})`;
  ctx.beginPath();
  ctx.arc(0, 21, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b44dff';
  ctx.beginPath();
  ctx.moveTo(0, 15); ctx.lineTo(5, 21); ctx.lineTo(0, 27); ctx.lineTo(-5, 21);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f3dcff';
  ctx.fillRect(-2, 18, 2, 2);
  // 壺身反光
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(-9, 20, 3, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// 接球杯：聚寶盆（金色寬邊、深紅絨布盆身、金色箍帶與鉚釘、正中央寶石；倍率越高越金亮）
function potShape(ctx, w, h, bottomRatio, t, mult, coins) {
  const bw = w * bottomRatio;
  const rich = mult > 2;
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  // 盆身
  const body = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  body.addColorStop(0, rich ? '#c0392b' : '#b8323a');
  body.addColorStop(0.4, rich ? '#8e1d4a' : '#7d1a2c');
  body.addColorStop(1, '#3d0a18');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(w / 2, 0);
  ctx.quadraticCurveTo(w / 2 - 2, h * 0.7, bw / 2, h);
  ctx.lineTo(-bw / 2, h);
  ctx.quadraticCurveTo(-w / 2 + 2, h * 0.7, -w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 金色箍帶＋鉚釘
  const band = y => {
    const f = y / h;
    const ww = w + (bw - w) * f;
    const g = ctx.createLinearGradient(0, y - 3, 0, y + 3);
    g.addColorStop(0, '#fff2a8'); g.addColorStop(0.5, '#ffc928'); g.addColorStop(1, '#a8650c');
    ctx.fillStyle = g;
    ctx.fillRect(-ww / 2 + 1, y - 3, ww - 2, 6);
    ctx.strokeRect(-ww / 2 + 1, y - 3, ww - 2, 6);
    ctx.fillStyle = '#fff6c8';
    for (let i = 1; i < 6; i++) ctx.fillRect(-ww / 2 + (ww * i) / 6 - 1, y - 1, 2, 2);
  };
  band(h * 0.2);
  band(h * 0.9);
  // 正中央的寶石（在兩條箍帶之間，數字會蓋在上面所以放在左右兩側）
  for (const s of [-1, 1]) {
    const gx = s * w * 0.4, gy = h * 0.55;
    ctx.fillStyle = s < 0 ? '#36d6ff' : '#6dff8a';
    ctx.beginPath();
    ctx.moveTo(gx, gy - 4); ctx.lineTo(gx + 3.5, gy); ctx.lineTo(gx, gy + 4); ctx.lineTo(gx - 3.5, gy);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.lineWidth = 2;
  }
  // 盆口裡面：暗色，有球幣時冒出一堆金幣
  ctx.fillStyle = '#1a0710';
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2 - 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (coins > 0) {
    const pile = Math.min(5, 1 + Math.log10(coins + 1));
    ctx.fillStyle = '#ffd84a';
    for (let i = 0; i < 7; i++) {
      const cx = (i - 3) * (w / 9);
      const cy = -1 - Math.max(0, pile - Math.abs(i - 3) * 1.3);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 4, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 金色寬邊（盆口）＋掃過的亮光
  const rim = ctx.createLinearGradient(0, -5, 0, 5);
  rim.addColorStop(0, '#fffbe0'); rim.addColorStop(0.45, rich ? '#ffe066' : '#ffc928'); rim.addColorStop(1, '#9a5a08');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2 + 4, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 0, w / 2 - 3, 3.5, 0, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2 + 4, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  const sx = ((t * 70) % (w + 80)) - w / 2 - 40;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2 + 4, 6, 0, 0, Math.PI * 2);
  ctx.clip();
  const sweep = ctx.createLinearGradient(sx - 12, 0, sx + 12, 0);
  sweep.addColorStop(0, 'rgba(255,255,255,0)'); sweep.addColorStop(0.5, 'rgba(255,255,255,0.85)'); sweep.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sweep;
  ctx.fillRect(sx - 12, -7, 24, 14);
  ctx.restore();
  // 盆身左邊的反光
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 8, 8); ctx.lineTo(-w / 2 + 13, 8); ctx.lineTo(-bw / 2 + 10, h - 6); ctx.lineTo(-bw / 2 + 6, h - 6);
  ctx.closePath();
  ctx.fill();
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
