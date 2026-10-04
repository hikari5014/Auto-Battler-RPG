// 像素角色圖：Kenney「Tiny Dungeon」（CC0 公有領域，可免費商用）
// 圖集是 12 欄 × 11 列、每格 16×16 像素
const TILE = 16;
const COLS = 12;

export const sheet = new Image();
let white = null; // 受擊時閃白用的白色剪影版本

sheet.onload = () => {
  white = document.createElement('canvas');
  white.width = sheet.width;
  white.height = sheet.height;
  const c = white.getContext('2d');
  c.drawImage(sheet, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = '#fff';
  c.fillRect(0, 0, white.width, white.height);
};
sheet.src = 'assets/tiny-dungeon.png';

export const spriteReady = () => sheet.complete && sheet.naturalWidth > 0;

// 以「腳底中心」為基準畫角色；flip = 左右翻轉（讓敵人面向英雄）
export function drawSprite(ctx, idx, cx, footY, size, flip = false, flash = 0) {
  const sx = (idx % COLS) * TILE;
  const sy = Math.floor(idx / COLS) * TILE;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(cx, footY - size);
  if (flip) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(sheet, sx, sy, TILE, TILE, -size / 2, 0, size, size);
  if (flash > 0 && white) {
    ctx.globalAlpha = flash * 0.85;
    ctx.drawImage(white, sx, sy, TILE, TILE, -size / 2, 0, size, size);
  }
  ctx.restore();
}

// 用一格圖磚鋪滿一個長方形（地面）
export function drawTile(ctx, idx, x, y, w, h, size) {
  if (!spriteReady()) return;
  const sx = (idx % COLS) * TILE;
  const sy = Math.floor(idx / COLS) * TILE;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let ty = y; ty < y + h; ty += size) {
    for (let tx = x; tx < x + w; tx += size) ctx.drawImage(sheet, sx, sy, TILE, TILE, tx, ty, size, size);
  }
  ctx.restore();
}

// 主畫面 HTML 用：回傳一段 CSS，讓 <span> 顯示某一格
export function spriteCss(idx, px) {
  const s = px / TILE;
  return `background-image:url(assets/tiny-dungeon.png);background-size:${192 * s}px ${176 * s}px;` +
    `background-position:-${(idx % COLS) * px}px -${Math.floor(idx / COLS) * px}px;width:${px}px;height:${px}px;`;
}
