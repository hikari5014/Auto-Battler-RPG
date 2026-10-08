// 3.23 快速掃蕩：通關過的章節可以直接拿獎勵，不用再打一次
// 每天前 5 次免費，之後每次花寶石；拿到的是「這一章最後一次通關紀錄」的八成（還沒有紀錄的舊進度用估算值）
// save.sweep = { day, n, rec: { '難度-章': { gold, gem } } }
import { todayKey } from './meta.js';
import { maxCh } from './progress.js';
import { WIN_GEMS } from './economy.js';

export const SWEEP_FREE = 5, SWEEP_GEM = 20, SWEEP_RATE = 0.8;
export const sweepKey = (diffId, ch) => diffId + '-' + ch;

export function ensureSweep(save) {
  const d = todayKey();
  if (!save.sweep) save.sweep = { day: d, n: 0, rec: {} };
  if (save.sweep.day !== d) { save.sweep.day = d; save.sweep.n = 0; }
  return save.sweep;
}
// 通關才記錄（只記這次結算的金幣與勝利寶石；首通獎勵不算）
export function recordSweep(save, diffId, ch, gold) {
  ensureSweep(save).rec[sweepKey(diffId, ch)] = { gold, gem: WIN_GEMS[diffId] || 0 };
}
export const canSweep = (save, diffId, ch) => ch < maxCh(save, diffId);
export const sweepCost = save => (ensureSweep(save).n < SWEEP_FREE ? 0 : SWEEP_GEM);
export const freeLeft = save => Math.max(0, SWEEP_FREE - ensureSweep(save).n);
// 掃蕩基準：有紀錄用紀錄，沒有就估算（打滿 15 波＋通關獎勵的大概值）
export function sweepBase(save, diff, ch) {
  const r = ensureSweep(save).rec[sweepKey(diff.id, ch)];
  if (r) return { ...r, est: false };
  return { gold: Math.round(420 * ch * diff.gold), gem: WIN_GEMS[diff.id] || 0, est: true };
}
// 這次掃蕩拿多少（八成）
export const sweepGain = base => ({ gold: Math.round(base.gold * SWEEP_RATE), gem: Math.floor(base.gem * SWEEP_RATE) });
