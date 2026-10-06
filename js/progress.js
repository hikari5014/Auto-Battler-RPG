// 3.0：每個難度各自記錄章節進度，而且要先打通前一個難度才能選下一個
// save.progress = { casual: 3, easy: 2, ... }：數字 = 這個難度「可以挑戰到第幾章」（跟舊的 maxChapter 同意思）
import { DIFFICULTIES, difficultyOf } from './levels.js';

export function ensureProgress(save) {
  if (save.progress) return save.progress;
  // 舊存檔：已經打通的章節算進休閒與簡單；有挑戰／地獄勝場的，直接解鎖到對應難度
  const m = save.maxChapter || 1;
  const p = {};
  for (const d of DIFFICULTIES) p[d.id] = 1;
  p.casual = m;
  p.easy = m;
  const st = save.stats || {};
  if (st.hardWin > 0) { p.normal = Math.max(p.normal, 4); }
  if (st.hellWin > 0) { p.hard = Math.max(p.hard, 6); }
  save.progress = p;
  return p;
}

// 這個難度可以挑戰到第幾章
export const maxCh = (save, diffId = save.difficulty) => ensureProgress(save)[diffId] || 1;

export function diffUnlocked(save, d) {
  if (!d.unlock) return true;
  const [need, ch] = d.unlock;
  return maxCh(save, need) > ch;
}
export const unlockText = d => d.unlock ? `先在「${difficultyOf(d.unlock[0]).name}」通關第 ${d.unlock[1]} 章` : '';

// 平衡難度（休閒以外）打到的最高章節：裝備等級、打造都用這個，休閒進度不算
export function balChapter(save) {
  const p = ensureProgress(save);
  return Math.max(1, ...DIFFICULTIES.filter(d => d.id !== 'casual').map(d => (p[d.id] || 1)));
}
// 任何難度的最高章節（開放無盡塔、每日挑戰用）
export function anyChapter(save) {
  const p = ensureProgress(save);
  return Math.max(1, ...Object.values(p));
}

// 通關：這個難度的進度往前推一章；回傳新解鎖的難度（沒有就是 null）
export function clearChapter(save, diffId, chapter) {
  const p = ensureProgress(save);
  if (chapter !== p[diffId]) return { next: false, diff: null };
  const before = DIFFICULTIES.filter(d => diffUnlocked(save, d)).map(d => d.id);
  p[diffId]++;
  save.maxChapter = anyChapter(save);
  const now = DIFFICULTIES.find(d => diffUnlocked(save, d) && !before.includes(d.id));
  return { next: true, diff: now || null };
}
