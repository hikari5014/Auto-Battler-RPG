// 觸控回饋：讓每個可以按的東西都「有反應」
// - 按下：按鈕被壓扁、手指位置噴出火花
// - 放開：按鈕彈回來（彈簧感）
// - 按住：按鈕外圈集氣；有 data-repeat 的按鈕會連續觸發，越按越快
// - 拖曳：按鈕跟著手指傾斜；技能卡會 3D 翻轉傾斜
// - 按到不能用的按鈕：左右搖晃＋提示原因＋手機震動
//
// 「不能用」的按鈕用 aria-disabled="true" 標記（不用 disabled），
// 因為 iPhone 上被 disabled 的按鈕完全收不到觸控，就沒辦法給回饋。

import { settings } from './settings.js';

const PRESSABLE = 'button, [data-fx]';
const HOLD_MS = 380;      // 按多久算「按住」
const DRAG_PX = 8;        // 移動超過幾像素算「拖曳」

let layer = null;
let cb = { deny: () => {}, sound: () => {} };
let active = null;        // 目前正被按著的元素與狀態
let swallowUntil = 0;     // 連續觸發過後，放開時那一下 click 不要再算一次

export const isOff = el => el && el.getAttribute('aria-disabled') === 'true';

export function initFeedback(options) {
  cb = { ...cb, ...options };
  layer = document.createElement('div');
  layer.id = 'fx-layer';
  document.getElementById('app').appendChild(layer);

  document.addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerup', onUp, { passive: true });
  document.addEventListener('pointercancel', () => release(false), { passive: true });
  // 擋掉「連續觸發」後多出來的那一下點擊，以及不能用的按鈕的點擊
  document.addEventListener('click', ev => {
    const el = ev.target.closest(PRESSABLE);
    if (ev.isTrusted && performance.now() < swallowUntil) { swallowUntil = 0; ev.stopPropagation(); ev.preventDefault(); return; }
    if (isOff(el)) { ev.stopPropagation(); ev.preventDefault(); }
  }, true);
}

function onDown(ev) {
  const el = ev.target.closest(PRESSABLE);
  if (!el || ev.button > 0) return;
  if (isOff(el)) {
    deny(el);
    return;
  }
  const r = el.getBoundingClientRect();
  active = { el, x0: ev.clientX, y0: ev.clientY, rect: r, dragging: false, holding: false, repeats: 0 };
  el.classList.remove('fx-release');
  el.classList.add('fx-press');
  burst(ev.clientX, ev.clientY, colorOf(el), 6);
  vibrate(6);
  active.holdTimer = setTimeout(() => startHold(), HOLD_MS);
}

function onMove(ev) {
  if (!active) return;
  const { el, rect, x0, y0 } = active;
  const dx = ev.clientX - x0, dy = ev.clientY - y0;
  if (!active.dragging && Math.hypot(dx, dy) > DRAG_PX) {
    active.dragging = true;
    el.classList.add('fx-drag');
  }
  if (!active.dragging) return;
  // 傾斜：手指在元素的哪一側，元素就往哪邊倒
  const nx = Math.max(-1, Math.min(1, (ev.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
  const ny = Math.max(-1, Math.min(1, (ev.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)));
  el.style.setProperty('--fx-nx', nx.toFixed(3));
  el.style.setProperty('--fx-ny', ny.toFixed(3));
  // 手指拖出元素太遠：視為取消，按鈕先彈回去
  const out = ev.clientX < rect.left - 24 || ev.clientX > rect.right + 24 || ev.clientY < rect.top - 24 || ev.clientY > rect.bottom + 24;
  el.classList.toggle('fx-cancel', out);
  if (out) stopHold();
}

function onUp(ev) {
  if (!active) return;
  const inside = !active.el.classList.contains('fx-cancel');
  if (inside) burst(ev.clientX, ev.clientY, colorOf(active.el), 10, true);
  release(inside);
}

function release(ok) {
  if (!active) return;
  const { el, repeats } = active;
  stopHold();
  el.classList.remove('fx-press', 'fx-drag', 'fx-hold', 'fx-cancel');
  el.style.removeProperty('--fx-nx');
  el.style.removeProperty('--fx-ny');
  if (ok) {
    void el.offsetWidth; // 重新觸發動畫
    el.classList.add('fx-release');
    el.addEventListener('animationend', () => el.classList.remove('fx-release'), { once: true });
  }
  if (repeats > 0) swallowUntil = performance.now() + 400;
  active = null;
}

// 按住：外圈集氣；可連續觸發的按鈕開始自動重複
function startHold() {
  if (!active || active.dragging) return;
  const a = active;
  a.holding = true;
  a.el.classList.add('fx-hold');
  vibrate(10);
  if (!a.el.hasAttribute('data-repeat')) return;
  let delay = 240;
  const tick = () => {
    // 畫面重畫後按鈕換成新的一顆：用同樣的 id 找回來，繼續連點
    if (!a.el.isConnected && a.el.id) {
      const n = document.getElementById(a.el.id);
      if (n) { a.el = n; n.classList.add('fx-hold'); }
    }
    if (active !== a || isOff(a.el) || !a.el.isConnected) return;
    a.repeats++;
    a.el.click();
    const r = a.el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, colorOf(a.el), 5, true);
    vibrate(5);
    delay = Math.max(55, delay * 0.82); // 越按越快
    a.repeatTimer = setTimeout(tick, delay);
  };
  tick();
}

function stopHold() {
  if (!active) return;
  clearTimeout(active.holdTimer);
  clearTimeout(active.repeatTimer);
  active.el.classList.remove('fx-hold');
}

// 不能用：搖晃＋提示原因
export function deny(el) {
  el.classList.remove('fx-deny');
  void el.offsetWidth;
  el.classList.add('fx-deny');
  el.addEventListener('animationend', () => el.classList.remove('fx-deny'), { once: true });
  vibrate([12, 40, 12]);
  cb.sound('deny');
  if (el.dataset.deny) cb.deny(el.dataset.deny);
}

// 成功的大回饋（買到東西、升級）：在元素中心噴一圈星星
export function celebrate(el, color = '#ffd84a') {
  if (!el || !el.isConnected) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, color, 14, true);
}

// 讓某個元素彈一下（數字變化時用）
export function pop(el) {
  if (!el) return;
  el.classList.remove('fx-pop');
  void el.offsetWidth;
  el.classList.add('fx-pop');
}

// 火花：一圈擴散的光環＋幾顆往外飛的像素方塊
function burst(x, y, color, n, ring) {
  if (!layer) return;
  const box = layer.getBoundingClientRect();
  x -= box.left;
  y -= box.top;
  if (ring) {
    const r = document.createElement('i');
    r.className = 'fx-ring';
    r.style.cssText = `left:${x}px;top:${y}px;border-color:${color}`;
    layer.appendChild(r);
    setTimeout(() => r.remove(), 450);
  }
  if (settings.lowFx) n = Math.ceil(n / 3);
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.className = 'fx-spark';
    const a = Math.random() * Math.PI * 2;
    const d = 18 + Math.random() * (ring ? 34 : 18);
    p.style.cssText = `left:${x}px;top:${y}px;background:${color};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
    layer.appendChild(p);
    setTimeout(() => p.remove(), 500);
  }
}

// 依按鈕種類決定火花顏色
function colorOf(el) {
  if (el.classList.contains('gift')) return '#8dff9f';
  if (el.classList.contains('buy') || el.closest('.card')) return '#ff7ad9';
  if (el.classList.contains('hero')) return '#ffd84a';
  if (el.classList.contains('icon-btn')) return '#cfc3f0';
  return '#ffd84a';
}

// 震動（設定裡可以關掉）
export function vibrate(p) {
  if (!settings.vibrate) return;
  try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* 不支援就算了 */ }
}
