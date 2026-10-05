const KEY = 'marble-brave-save-v1';

const DEFAULT = {
  gold: 0,
  owned: ['blade'],
  selected: 'blade',
  chapter: 1,
  maxChapter: 1,
  up: { atk: 0, hp: 0, coin: 0 },
  muted: false,
  difficulty: 'casual',
};

export function loadSave() {
  const base = JSON.parse(JSON.stringify(DEFAULT));
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) return { ...base, ...s, up: { ...base.up, ...(s.up || {}) } };
  } catch (e) { /* 私密模式或資料損毀時用預設值 */ }
  return base;
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 忽略 */ }
}
