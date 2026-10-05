// 2.5D 場景：用 2D 畫布做出「有深度的 3D 地面」
// 原理（像老遊戲機的 Mode 7）：地面一條一條橫著畫，越遠的那條越窄、越小，
// 看起來就像往遠方延伸的地板。角色則是平面紙片人（看板），越遠畫越小。
//
// 世界座標：x = 左右（公尺），z = 離鏡頭多遠，h = 離地高度
import { CHAPTERS } from './data.js';
import { SHEETS, drawTile } from './sprites.js';
import { settings } from './settings.js';

const TEX_TILES = 8;        // 地面貼圖一邊有幾格
const TILE_WORLD = 0.55;    // 一格地磚在世界裡多大
const FOG_Z = 26;           // 超過這個距離就完全被霧蓋住

export class Scene {
  constructor() {
    this.cam = { x: 0, h: 1.6, f: 300, punch: 0, sway: 0 };
    this.texCache = new Map();
    this.t = 0;
  }

  // top/bottom = 場景在畫面上的範圍
  layout(W, top, bottom) {
    this.W = W;
    this.top = top;
    this.bottom = bottom;
    this.horizon = top + (bottom - top) * 0.40;
    // 讓 z=4 的位置（英雄站的地方）落在場景底部往上 40px
    this.baseF = 4 * (bottom - 40 - this.horizon) / this.cam.h;
  }

  update(dt) {
    this.t += dt;
    this.cam.punch = Math.max(0, this.cam.punch - dt * 3);
    this.cam.sway = Math.sin(this.t * 0.35) * 0.12;
    this.cam.f = this.baseF * (1 + this.cam.punch * 0.05);
  }

  // 世界座標 → 畫面座標；s = 一公尺等於幾個像素
  project(x, z, h = 0) {
    const s = this.cam.f / z;
    return { x: this.W / 2 + (x - this.cam.x - this.cam.sway) * s, y: this.horizon + (this.cam.h - h) * s, s };
  }

  // 每個章節的地面貼圖：把地磚拼成一張長條圖，方便一列一列取用
  groundTex(ch) {
    if (this.texCache.has(ch.name)) return this.texCache.get(ch.name);
    const [top, fill, key] = ch.ground;
    const src = SHEETS[key];
    if (!src.img || !src.img.naturalWidth) return null;
    const T = 16;
    const n = TEX_TILES * T;
    const c = document.createElement('canvas');
    c.width = n * 16;   // 橫向重複 16 次，遠方很寬的那幾列也取得到
    c.height = n;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let ty = 0; ty < TEX_TILES; ty++) {
      for (let tx = 0; tx < TEX_TILES * 16; tx++) {
        // 大部分用底磚，偶爾穿插表面磚做出花紋
        const idx = ((tx * 7 + ty * 13) % 11 === 0) ? top : fill;
        const sx = (idx % src.cols) * src.tile;
        const sy = Math.floor(idx / src.cols) * src.tile;
        g.drawImage(src.img, sx, sy, src.tile, src.tile, tx * T, ty * T, T, T);
      }
    }
    // 棋盤明暗，讓地面更有立體層次
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let ty = 0; ty < TEX_TILES; ty++) {
      for (let tx = 0; tx < TEX_TILES * 16; tx++) if ((tx + ty) % 2) g.fillRect(tx * T, ty * T, T, T);
    }
    const tex = { c, n };
    this.texCache.set(ch.name, tex);
    return tex;
  }

  drawBackground(ctx, chapter) {
    const ch = CHAPTERS[(chapter - 1) % CHAPTERS.length];
    const { W, top, bottom, horizon } = this;

    // 天空與遠景（遠景跟著鏡頭輕微平移＝視差）
    const T = 72;
    drawTile(ctx, ch.bg[0], 0, top, W, horizon - top, T, 'bg');
    const off = ((this.t * 6 + this.cam.sway * 40) % T + T) % T;
    drawTile(ctx, ch.bg[1], -off, horizon - T + 6, W + T, T, T, 'bg');
    if (ch.overlay) {
      ctx.fillStyle = ch.overlay;
      ctx.fillRect(0, top, W, horizon - top + 6);
    }

    // 地面：一列一列畫（Mode 7）
    const tex = this.groundTex(ch);
    const f = this.cam.f;
    const camX = this.cam.x + this.cam.sway;
    const texPerWorld = 16 / TILE_WORLD;
    if (tex) {
      ctx.imageSmoothingEnabled = false;
      const step = settings.lowFx ? 2 : 1; // 低特效：地面隔一列畫一次
      for (let y = Math.ceil(horizon + 1); y < bottom; y += step) {
        const z = this.cam.h * f / (y - horizon);
        if (z > FOG_Z) continue;
        const xl = camX - (W / 2) * z / f;
        const span = W * z / f * texPerWorld;
        let u = (xl * texPerWorld) % tex.n;
        if (u < 0) u += tex.n;
        let v = (z * texPerWorld) % tex.n;
        if (v < 0) v += tex.n;
        ctx.drawImage(tex.c, u, Math.floor(v), Math.min(span, tex.c.width - u), 1, 0, y, W, step + 0.2);
      }
    }

    // 遠方的霧：越靠近地平線越朦朧
    const fogY = horizon + this.cam.h * f / FOG_Z;
    const fog = ctx.createLinearGradient(0, horizon - 8, 0, fogY + 70);
    fog.addColorStop(0, ch.fog);
    fog.addColorStop(0.35, ch.fog);
    fog.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizon - 8, W, fogY + 70 - horizon + 8);

    // 光線：中央亮、四周暗
    const light = ctx.createRadialGradient(W * 0.45, bottom - 30, 20, W * 0.45, bottom - 30, W * 0.9);
    light.addColorStop(0, 'rgba(255,240,200,0.10)');
    light.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = light;
    ctx.fillRect(0, top, W, bottom - top);
  }

  // 角色腳下的影子（越遠越小越淡）
  shadow(ctx, x, z, width) {
    const p = this.project(x, z);
    ctx.fillStyle = `rgba(0,0,0,${Math.min(0.4, 0.15 + p.s / 400)})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, width * p.s * 0.5, width * p.s * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 遠方物體的霧化程度（0 = 清楚，1 = 完全在霧裡）
  fogAt(z) { return Math.max(0, Math.min(1, (z - 9) / (FOG_Z - 9))); }

  // 場景底部的陰影收邊，讓戰場和彈珠台之間有層次
  drawFrame(ctx) {
    const g = ctx.createLinearGradient(0, this.bottom - 18, 0, this.bottom);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, this.bottom - 18, this.W, 18);
  }
}
