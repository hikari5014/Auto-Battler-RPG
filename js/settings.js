// 設定：音量、震動、特效品質、傷害數字
// 設定存在存檔的 save.settings 裡，其他模組直接讀 settings 物件
import { setMusicVolume, setSfxVolume } from './audio.js';

export const settings = {
  music: 0.7,        // 音樂音量 0~1
  sfx: 1,            // 音效音量 0~1
  vibrate: true,     // 手機震動
  lowFx: false,      // 低特效模式：減少粒子與光暈，舊手機比較順
  dmgNumbers: true,  // 顯示傷害數字
  liveStats: true,   // 戰鬥中左上角顯示即時數值
};

export function loadSettings(save) {
  Object.assign(settings, save.settings || {});
  save.settings = settings;
  applySettings();
}

export function applySettings() {
  setMusicVolume(settings.music);
  setSfxVolume(settings.sfx);
}

// 設定頁的 HTML
export function settingsHtml() {
  const toggle = (key, label, hint) => `
    <button class="set-row toggle ${settings[key] ? 'on' : ''}" data-toggle="${key}" role="switch" aria-checked="${settings[key]}">
      <span><b>${label}</b><small>${hint}</small></span><i class="switch"></i>
    </button>`;
  const slider = (key, label) => `
    <label class="set-row">
      <span><b>${label}</b><small id="val-${key}">${Math.round(settings[key] * 100)}%</small></span>
      <input type="range" min="0" max="100" step="5" value="${Math.round(settings[key] * 100)}" data-slider="${key}" aria-label="${label}">
    </label>`;
  return `
    <h2>設定</h2>
    <div class="set-list">
      ${slider('music', '音樂音量')}
      ${slider('sfx', '音效音量')}
      ${toggle('vibrate', '手機震動', '按按鈕、暴擊、魔王登場時震動')}
      ${toggle('dmgNumbers', '傷害數字', '關掉畫面會比較乾淨')}
      ${toggle('liveStats', '戰鬥即時數值', '戰鬥畫面左上角顯示攻擊、每秒傷害等')}
      ${toggle('lowFx', '低特效模式', '減少粒子和光暈，舊手機比較順')}
    </div>
    <div class="row">
      <button class="btn small" id="btn-replay-tutorial">重看教學</button>
      <button class="btn small ghost" id="btn-reset-save">清除存檔</button>
    </div>
    <button class="btn big" id="btn-settings-close">完成</button>`;
}
