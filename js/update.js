// 檢查更新與一鍵更新
// 原理：網站上的 js/version.js 就是「最新版的說明書」。
// 檢查時繞過離線快取去網路上讀它，比對版本號；
// 更新時請瀏覽器下載新版的離線快取（sw.js），裝好後切換過去並重新整理。
import { VERSION, compareVersion } from './version.js';

// 讀網路上的最新版本資訊；離線或失敗會丟出錯誤
export async function fetchLatest() {
  // ?fresh= 讓 sw.js 知道這次要直接走網路，不要用快取
  const remote = await import(`./version.js?fresh=${Date.now()}`);
  return {
    version: remote.VERSION,
    changelog: remote.CHANGELOG,
    newer: compareVersion(remote.VERSION, VERSION) > 0,
  };
}

// 套用更新：下載新版 → 切換 → 重新整理頁面
export async function applyUpdate() {
  const reload = () => location.reload();
  if (!('serviceWorker' in navigator)) return reload();
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return reload();

  let waiting = reg.waiting;
  if (!waiting) {
    await reg.update();
    waiting = reg.waiting || await waitInstalled(reg.installing);
  }
  if (!waiting) {
    // 萬一新版沒有順利裝好：清掉所有離線快取，直接從網路重新載入
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    return reload();
  }
  navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
  waiting.postMessage('SKIP_WAITING');
  setTimeout(reload, 4000); // 保險：切換事件沒來也會重新整理
}

function waitInstalled(sw) {
  if (!sw) return Promise.resolve(null);
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), 20000);
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed') { clearTimeout(timer); resolve(sw); }
      if (sw.state === 'redundant') { clearTimeout(timer); resolve(null); }
    });
  });
}
