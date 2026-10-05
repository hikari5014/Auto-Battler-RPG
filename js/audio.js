// 音效與音樂：Kenney 音效包（CC0）+ Juhani Junkala 晶片音樂（CC0）
// 音檔還沒載入或載入失敗時，退回用 WebAudio 即時合成的音效
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
let musicGain = null;
let sfxGain = null;
let musicVol = 0.7, sfxVol = 1; // 設定頁的音量（0~1）
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
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.5 * musicVol;
  musicGain.connect(master);
  sfxGain = ctx.createGain();
  sfxGain.gain.value = sfxVol;
  sfxGain.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  loadSamples();
  if (wantMusic) playMusic(wantMusic, true);
}

export function setMusicVolume(v) {
  musicVol = v;
  if (musicGain) musicGain.gain.value = 0.5 * v;
}
export function setSfxVolume(v) {
  sfxVol = v;
  if (sfxGain) sfxGain.gain.value = v;
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
  o.connect(g).connect(sfxGain);
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
  s.connect(f).connect(g).connect(sfxGain);
  s.start(t);
  s.stop(t + dur);
}

function synthSfx(name) {
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
    case 'deny': // 不能按：低沉的「噗噗」
      if (!throttle('deny', 120)) return;
      tone(180, 'square', 0.07, 0.05, 0.8);
      tone(150, 'square', 0.08, 0.05, 0.8, 0.09);
      break;
  }
}

// ---------- 取樣音效 ----------
// files：隨機挑一個播；rate：隨機音高範圍；gap：最短間隔（毫秒），避免同時太多聲
const SAMPLES = {
  clink: { files: ['clink1', 'clink2'], vol: 0.5, rate: [0.95, 1.35], gap: 30 },
  peg: { files: ['peg'], vol: 0.18, rate: [0.9, 1.4], gap: 45 },
  gate: { files: ['gate'], vol: 0.35, rate: [0.9, 1.3], gap: 50 },
  hit: { files: ['hit1', 'hit2'], vol: 0.5, rate: [0.9, 1.15], gap: 40 },
  crit: { files: ['crit', 'slash'], vol: 0.7, rate: [0.9, 1.1], gap: 60 },
  kill: { files: ['kill'], vol: 0.4, rate: [0.9, 1.2], gap: 40 },
  hurt: { files: ['hurt'], vol: 0.6, rate: [0.9, 1.1], gap: 80 },
  block: { files: ['block'], vol: 0.6, rate: [1, 1.2], gap: 60 },
  buy: { files: ['buy'], vol: 0.7, rate: [1, 1.1], gap: 50 },
  tap: { files: ['tap'], vol: 0.5, rate: [1, 1], gap: 30 },
  win: { files: ['win'], vol: 0.8, rate: [1, 1], gap: 0 },
  lose: { files: ['lose'], vol: 0.8, rate: [1, 1], gap: 0 },
  wave: { files: ['wave'], vol: 0.5, rate: [1, 1], gap: 0 },
};
const buffers = {};

async function loadBuffer(path) {
  const res = await fetch(path);
  const data = await res.arrayBuffer();
  return await new Promise((ok, fail) => ctx.decodeAudioData(data, ok, fail));
}

function loadSamples() {
  const names = new Set(Object.values(SAMPLES).flatMap(s => s.files));
  for (const n of names) {
    loadBuffer(`assets/sfx/${n}.mp3`).then(b => { buffers[n] = b; }).catch(() => {});
  }
}

export function sfx(name) {
  if (!ctx || muted) return;
  const s = SAMPLES[name];
  const file = s && s.files[Math.floor(Math.random() * s.files.length)];
  if (!s || !buffers[file]) {
    synthSfx(name);
    return;
  }
  if (s.gap && !throttle('s_' + name, s.gap)) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[file];
  src.playbackRate.value = s.rate[0] + Math.random() * (s.rate[1] - s.rate[0]);
  const g = ctx.createGain();
  g.gain.value = s.vol;
  src.connect(g).connect(sfxGain);
  src.start();
}

// ---------- 背景音樂 ----------
const musicBuf = {};
let wantMusic = null;
let current = null; // { key, src, gain }

export function playMusic(key, force) {
  if (!force && wantMusic === key) return;
  wantMusic = key;
  if (!ctx) return; // 等第一次點擊螢幕、音效啟動後再播
  const start = buf => {
    if (wantMusic !== key) return;
    const t = ctx.currentTime;
    if (current) {
      current.gain.gain.setTargetAtTime(0, t, 0.3);
      current.src.stop(t + 1.5);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.setTargetAtTime(1, t, 0.4);
    src.connect(gain).connect(musicGain);
    src.start();
    current = { key, src, gain };
  };
  if (musicBuf[key]) start(musicBuf[key]);
  else loadBuffer(`assets/music/${key}.mp3`).then(b => { musicBuf[key] = b; start(b); }).catch(() => {});
}
