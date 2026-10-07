// 3.19 3D 英雄：Quaternius「RPG Characters」6 個模型（CC0）換色後，預先渲染成 assets/img/heroes3d.png
// 每位英雄一列 20 格：0-3 站姿、4-9 攻擊、10-13 騎乘站姿、14-19 騎乘攻擊
export const H3_ORDER = ["blade", "archer", "mage", "saw", "paladin", "rogue", "gunner", "elem", "dragoon", "sage", "thief", "hilda", "gren", "fio", "vicky", "lok", "mary", "thorfin", "pip", "esti", "kalan", "sian", "ruri", "g7", "balu", "cyrus", "moore", "morgan", "ignis", "evira", "leos", "lilith", "omega", "seraph"];
export const H3_COLS = 20;
export const h3Row = id => H3_ORDER.indexOf(id);
export const H3_ATK = 0.36; // 攻擊動畫秒數
// 選第幾格：riding 騎乘中、atkT 距離上次攻擊幾秒、t 時間、phase 錯開
export function h3Frame(id, riding, atkT, t, phase = 0) {
  const row = h3Row(id);
  if (row < 0) return null;
  const off = riding ? 10 : 0;
  const f = atkT < H3_ATK ? 4 + Math.min(5, Math.floor(atkT / H3_ATK * 6)) : Math.floor(t * 2.2 + phase) % 4;
  return ['h3', row * H3_COLS + off + f];
}
