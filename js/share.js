// 分享戰績：畫一張 600×800 的戰績圖，可以的話用手機的「分享」，不行就下載圖片
import { SHEETS, iconUrl, FONT } from './sprites.js';

const GAME_URL = 'https://hikari5014.github.io/Auto-Battler-RPG/';

function loadImg(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function makeShareImage(r) {
  const W = 600, H = 800;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  // 背景
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#3a2470');
  bg.addColorStop(1, '#120c24');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // 斜光
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 6; i++) g.fillRect(-200 + i * 140, 0, 50, H);
  g.textAlign = 'center';
  // 標題
  g.font = `64px ${FONT}`;
  g.lineWidth = 8;
  g.strokeStyle = '#3b1a05';
  g.strokeText('彈珠勇者', W / 2, 100);
  g.fillStyle = '#ffd84a';
  g.fillText('彈珠勇者', W / 2, 100);
  // 英雄（從圖集裁出來放大）
  const [key, idx] = Array.isArray(r.hero.sprite) ? r.hero.sprite : ['dg', r.hero.sprite];
  const dg = SHEETS[key];
  if (dg.img) {
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath();
    g.ellipse(W / 2, 330, 110, 24, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(dg.img, (idx % dg.cols) * dg.tile, Math.floor(idx / dg.cols) * dg.tile, dg.tile, dg.tile, W / 2 - 96, 140, 192, 192);
  }
  g.font = `30px ${FONT}`;
  g.fillStyle = '#fff';
  g.fillText(r.hero.name, W / 2, 380);
  // 主要成績
  const headline = r.endless ? `無盡塔 第 ${r.cleared} 層` : r.win ? `第 ${r.chapter} 章 通關！` : `第 ${r.chapter} 章 第 ${r.cleared} 波`;
  g.font = `46px ${FONT}`;
  g.lineWidth = 6;
  g.strokeStyle = '#000';
  g.strokeText(headline, W / 2, 460);
  g.fillStyle = r.win || r.endless ? '#8dff9f' : '#ffd2d2';
  g.fillText(headline, W / 2, 460);
  g.font = `26px ${FONT}`;
  g.fillStyle = '#e6dcff';
  g.fillText(`難度：${r.diff.name}　擊敗 ${r.kills} 隻${r.daily ? '　每日挑戰' : ''}`, W / 2, 510);
  // 技能圖示
  const icons = await Promise.all(r.skills.map(sk => loadImg(iconUrl(sk.icon[0], sk.icon[1], sk.icon[2]))));
  const size = 48, gap = 12;
  const total = icons.length * size + (icons.length - 1) * gap;
  icons.forEach((img, i) => {
    const x = W / 2 - total / 2 + i * (size + gap);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(x - 4, 560 - 4, size + 8, size + 8);
    if (img) g.drawImage(img, x, 560, size, size);
  });
  // 網址
  g.font = `20px ${FONT}`;
  g.fillStyle = '#cfc3f0';
  g.fillText('一起來玩 ▶ ' + GAME_URL.replace('https://', ''), W / 2, 740);
  return new Promise(resolve => c.toBlob(resolve, 'image/png'));
}

// 回傳要顯示給玩家的提示文字
export async function shareResult(r) {
  if (!r) return '';
  const blob = await makeShareImage(r);
  const file = new File([blob], 'marble-brave.png', { type: 'image/png' });
  const text = r.endless ? `我在彈珠勇者無盡塔爬到第 ${r.cleared} 層！` : `我在彈珠勇者${r.win ? '通關' : '挑戰'}了第 ${r.chapter} 章！`;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text, url: GAME_URL });
      return '';
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return ''; // 玩家自己取消
  }
  // 不支援分享：直接下載圖片
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'marble-brave.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return '已下載戰績圖片';
}
