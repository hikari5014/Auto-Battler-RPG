// 全部音效用 WebAudio 即時合成，不需要音檔
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
const last = {};

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.45;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.45;
}

function throttle(key, ms) {
  const n = performance.now();
  if (last[key] && n - last[key] < ms) return false;
  last[key] = n;
  return true;
}

function tone(freq, type, dur, vol, sweep = 1, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (sweep !== 1) o.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol, freq) {
  const t = ctx.currentTime;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t);
  s.stop(t + dur);
}

export function sfx(name) {
  if (!ctx || muted) return;
  switch (name) {
    case 'clink': { // 小球掉進杯子：金屬叮噹聲（兩個泛音）
      if (!throttle('clink', 28)) return;
      const f = 2000 + Math.random() * 1800;
      tone(f, 'sine', 0.09, 0.09);
      tone(f * 2.76, 'sine', 0.05, 0.03);
      break;
    }
    case 'peg':
      if (!throttle('peg', 45)) return;
      tone(1300 + Math.random() * 500, 'triangle', 0.03, 0.025);
      break;
    case 'gate':
      if (!throttle('gate', 50)) return;
      tone(700 + Math.random() * 200, 'square', 0.07, 0.035, 2);
      break;
    case 'hit':
      if (!throttle('hit', 40)) return;
      noise(0.07, 0.25, 900);
      break;
    case 'crit':
      if (!throttle('crit', 60)) return;
      noise(0.12, 0.4, 500);
      tone(180, 'sawtooth', 0.12, 0.12, 0.5);
      break;
    case 'kill':
      tone(520, 'square', 0.12, 0.06, 0.4);
      break;
    case 'hurt':
      if (!throttle('hurt', 80)) return;
      tone(140, 'square', 0.12, 0.09, 0.7);
      break;
    case 'block':
      tone(1500, 'triangle', 0.1, 0.08, 1.3);
      break;
    case 'buy':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 'triangle', 0.12, 0.08, 1, i * 0.05));
      break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 'triangle', 0.25, 0.1, 1, i * 0.1));
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => tone(f, 'sawtooth', 0.3, 0.06, 0.9, i * 0.15));
      break;
    case 'tap':
      tone(900, 'sine', 0.04, 0.05);
      break;
  }
}
