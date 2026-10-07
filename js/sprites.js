// 像素圖集：全部來自 Kenney（CC0 公有領域，可免費商用）
// dg = Tiny Dungeon（角色、怪物、地磚）
// pp = Pixel Platformer（金幣、寶石、愛心、草地磚）
// bg = Pixel Platformer 背景（天空、山丘）
// ic = 1-Bit Pack（技能卡與介面圖示）
// tc = Tiny Creatures（怪物、魔王、坐騎）
export const SHEETS = {
  dg: { src: 'assets/img/tiny-dungeon.png', tile: 16, cols: 12 },
  pp: { src: 'assets/img/pixel-platformer.png', tile: 18, cols: 20 },
  bg: { src: 'assets/img/pixel-platformer-bg.png', tile: 24, cols: 8 },
  ic: { src: 'assets/img/icons-1bit.png', tile: 16, cols: 49 },
  tc: { src: 'assets/img/tiny-creatures.png', tile: 16, cols: 10 },
  it: { src: 'assets/img/items.png', tile: 32, cols: 12 },
  m3: { src: 'assets/img/mounts3d.png', tile: 64, cols: 8 },
  h3: { src: 'assets/img/heroes3d.png', tile: 64, cols: 20 },
  h3k: { src: 'assets/img/heroes3k.png', tile: 64, cols: 20 }, // 3.21 新版 3D 英雄：KayKit Adventurers（CC0）
  h3kf: { src: 'assets/img/heroes3k-face.png', tile: 34, cols: 34 },
  h3f: { src: 'assets/img/heroes3d-face.png', tile: 34, cols: 34 }, // 3D 英雄的半身頭像（圖示用） // 3.19 3D 英雄：Quaternius RPG Characters（CC0）預先渲染，每位 20 格 // 3.18 3D 坐騎：Quaternius 3D 模型（CC0）預先渲染成 8 格動畫
  hx: { src: 'assets/img/heroes-x.png', tile: 28, cols: 4 }, // 3.4 新英雄：0x72「DungeonTileset II」角色換色（CC0），每位 4 格待機動畫 // 道具：寶石、召喚券、星塵、寶箱…（SpriteAttack 寶石、7Soul1 496 RPG icons，CC0） // Clint Bellanger「Tiny Creatures」（CC0，Tiny Dungeon 擴充）
};

// 像素中文字型「俐方體11號」（Cubic 11，免費授權）
export const FONT = '"Cubic11", system-ui, sans-serif';

// 介面常用圖示
export const ICON = {
  gold: ['pp', 151], gem: ['pp', 67], heart: ['pp', 44],
  sword: ['ic', 426, '#6b4f33'], target: ['ic', 712, '#6b4f33'], star: ['ic', 576, '#1e5d8a'],
  soundOn: ['ic', 822], soundOff: ['ic', 821], trophy: ['ic', 824, '#ffd84a'],
  skull: ['ic', 621], crown: ['ic', 141], warn: ['ic', 1064],
  refresh: ['ic', 1021], free: ['ic', 631], install: ['ic', 1057],
  diamond: ['it', 0], heroTicket: ['it', 1], gearTicket: ['it', 2], stardust: ['it', 3],
  chest: ['it', 4], chestOpen: ['it', 5], quest: ['it', 6], vault: ['it', 7], mail: ['it', 10],
};

let white = {};
let red = {};    // 魔王狂暴時的紅色剪影

export function loadSprites() {
  return Promise.all(Object.entries(SHEETS).map(([key, s]) => new Promise(resolve => {
    s.img = new Image();
    s.img.onload = () => {
      // 受擊閃白用的白色剪影
      const c = document.createElement('canvas');
      c.width = s.img.width;
      c.height = s.img.height;
      const g = c.getContext('2d');
      g.drawImage(s.img, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      white[key] = c;
      if (key === 'dg' || key === 'tc' || key === 'hx') {
        const r = document.createElement('canvas');
        r.width = c.width;
        r.height = c.height;
        const rg = r.getContext('2d');
        rg.drawImage(s.img, 0, 0);
        rg.globalCompositeOperation = 'source-in';
        rg.fillStyle = '#ff2a2a';
        rg.fillRect(0, 0, r.width, r.height);
        red[key] = r;
      }
      resolve();
    };
    s.img.onerror = resolve;
    s.img.src = s.src;
  })));
}

const ready = key => SHEETS[key].img && SHEETS[key].img.naturalWidth > 0;
export const spriteReady = () => ready('dg');

function src(key, idx) {
  const s = SHEETS[key];
  return [s.img, (idx % s.cols) * s.tile, Math.floor(idx / s.cols) * s.tile, s.tile];
}

// 角色：以「腳底中心」為基準畫
// sizeY 可以跟 size 不同，用來做「呼吸」般的伸縮動畫
export function drawSprite(ctx, idx, cx, footY, size, flip = false, flash = 0, key = 'dg', sizeY = size, rage = 0) {
  if (!ready(key)) return;
  const [img, sx, sy, t] = src(key, idx);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, footY - sizeY);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, sx, sy, t, t, -size / 2, 0, size, sizeY);
  const base = ctx.globalAlpha;
  if (rage > 0 && red[key]) {
    ctx.globalAlpha = base * rage;
    ctx.drawImage(red[key], sx, sy, t, t, -size / 2, 0, size, sizeY);
  }
  if (flash > 0 && white[key]) {
    ctx.globalAlpha = base * flash * 0.85;
    ctx.drawImage(white[key], sx, sy, t, t, -size / 2, 0, size, sizeY);
  }
  ctx.restore();
}

// 圖示：以中心為基準畫（不 save/restore，給大量小球用比較快）
export function drawIcon(ctx, key, idx, cx, cy, size) {
  if (!ready(key)) return false;
  const [img, sx, sy, t] = src(key, idx);
  ctx.drawImage(img, sx, sy, t, t, cx - size / 2, cy - size / 2, size, size);
  return true;
}

// 上色的 1-bit 圖示（坐騎用）：先畫黑色外框，再畫顏色；做好的小圖存起來重複用
const tinted = {};
function tintedIcon(idx, color) {
  const k = idx + color;
  if (tinted[k]) return tinted[k];
  const [img, sx, sy, t] = src('ic', idx);
  const one = document.createElement('canvas');
  one.width = one.height = t;
  const g1 = one.getContext('2d');
  g1.drawImage(img, sx, sy, t, t, 0, 0, t, t);
  g1.globalCompositeOperation = 'source-in';
  const c = document.createElement('canvas');
  c.width = c.height = t + 2;
  const g = c.getContext('2d');
  g1.fillStyle = '#1a1020';
  g1.fillRect(0, 0, t, t);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(one, dx, dy);
  g1.fillStyle = color;
  g1.fillRect(0, 0, t, t);
  g.drawImage(one, 1, 1);
  tinted[k] = c;
  return c;
}
// 以腳底中心為基準畫
export function drawTinted(ctx, idx, color, cx, footY, size) {
  if (!ready('ic')) return;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tintedIcon(idx, color), cx - size / 2, footY - size, size, size);
  ctx.restore();
}

// 用一格圖磚鋪滿長方形
export function drawTile(ctx, idx, x, y, w, h, size, key = 'dg') {
  if (!ready(key)) return;
  const [img, sx, sy, t] = src(key, idx);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let ty = y; ty < y + h; ty += size) {
    for (let tx = x; tx < x + w; tx += size) ctx.drawImage(img, sx, sy, t, t, tx, ty, size, size);
  }
  ctx.restore();
}

// HTML 用：把某一格（可選染色）轉成圖片網址，結果會快取
const urlCache = new Map();
export function iconUrl(key, idx, tint) {
  const k = key + idx + (tint || '');
  if (urlCache.has(k)) return urlCache.get(k);
  if (!ready(key)) return '';
  const [img, sx, sy, t] = src(key, idx);
  const c = document.createElement('canvas');
  c.width = c.height = t;
  const g = c.getContext('2d');
  g.drawImage(img, sx, sy, t, t, 0, 0, t, t);
  if (tint) {
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = tint;
    g.fillRect(0, 0, t, t);
  }
  const url = c.toDataURL();
  urlCache.set(k, url);
  return url;
}

// 產生 <img> 標籤；ref = [圖集, 編號, 染色?]
export function iconTag(ref, px = 20, cls = '') {
  const [key, idx, tint] = ref;
  return `<img class="px ${cls}" src="${iconUrl(key, idx, tint)}" width="${px}" height="${px}" alt="" draggable="false">`;
}
