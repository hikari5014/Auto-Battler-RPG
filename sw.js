// 離線快取（Service Worker）
// 每個版本有自己的一份快取；新版本下載完會「等待」，玩家按下更新才切換，
// 這樣不會玩到一半，一部分是舊檔案、一部分是新檔案。
const VERSION = '3.4.0'; // 必須和 js/version.js 一致（部署時會自動檢查）
const CACHE = 'marble-brave-' + VERSION;
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/audio.js',
  'js/battle.js',
  'js/board.js',
  'js/data.js',
  'js/economy.js',
  'js/events.js',
  'js/feedback.js',
  'js/gacha.js',
  'js/gear.js',
  'js/heroes.js',
  'js/levels.js',
  'js/main.js',
  'js/meta.js',
  'js/mount.js',
  'js/power.js',
  'js/progress.js',
  'js/save.js',
  'js/scene.js',
  'js/settings.js',
  'js/share.js',
  'js/sprites.js',
  'js/stats.js',
  'js/talent.js',
  'js/tutorial.js',
  'js/update.js',
  'js/version.js',
  'assets/img/heroes-x.png',
  'assets/img/icons-1bit.png',
  'assets/img/items.png',
  'assets/img/pixel-platformer-bg.png',
  'assets/img/pixel-platformer.png',
  'assets/img/tiny-creatures.png',
  'assets/img/tiny-dungeon.png',
  'assets/ui/ancient-brown.png',
  'assets/ui/ancient-tan_inlay.png',
  'assets/ui/capsules.png',
  'assets/ui/colored-blue.png',
  'assets/ui/colored-green.png',
  'assets/ui/colored-green_pressed.png',
  'assets/ui/colored-grey.png',
  'assets/ui/colored-red.png',
  'assets/ui/colored-red_pressed.png',
  'assets/ui/colored-yellow.png',
  'assets/ui/mana-panel-dark.png',
  'assets/ui/mana-panel.png',
  'assets/bg/desert-a.png',
  'assets/bg/desert-b.png',
  'assets/bg/grave-a.png',
  'assets/bg/grave-b.png',
  'assets/bg/plains-a.png',
  'assets/bg/plains-b.png',
  'assets/bg/sky-a.png',
  'assets/bg/sky-b.png',
  'assets/bg/title-a.png',
  'assets/bg/title-b.png',
  'assets/bg/volcano-a.png',
  'assets/bg/volcano-b.png',
  'assets/fx/bolt.png',
  'assets/fx/dark.png',
  'assets/fx/fire.png',
  'assets/fx/hit.png',
  'assets/fx/ice.png',
  'assets/fx/nova.png',
  'assets/fx/sunburn.png',
  'assets/fonts/Cubic_11.woff2',
  'assets/fonts/FusionPixel12.woff2',
  'assets/sfx/block.mp3',
  'assets/sfx/boom.mp3',
  'assets/sfx/buy.mp3',
  'assets/sfx/clink1.mp3',
  'assets/sfx/clink2.mp3',
  'assets/sfx/coin.mp3',
  'assets/sfx/crit.mp3',
  'assets/sfx/gate.mp3',
  'assets/sfx/hit1.mp3',
  'assets/sfx/hit2.mp3',
  'assets/sfx/hurt.mp3',
  'assets/sfx/jackpot.mp3',
  'assets/sfx/jingle.mp3',
  'assets/sfx/kill.mp3',
  'assets/sfx/lose.mp3',
  'assets/sfx/maxup.mp3',
  'assets/sfx/peg.mp3',
  'assets/sfx/slash.mp3',
  'assets/sfx/tap.mp3',
  'assets/sfx/wave.mp3',
  'assets/sfx/win.mp3',
  'assets/sfx/zap.mp3',
  'assets/music/boss.mp3',
  'assets/music/desert.mp3',
  'assets/music/gacha.mp3',
  'assets/music/grave.mp3',
  'assets/music/home.mp3',
  'assets/music/plains.mp3',
  'assets/music/sky.mp3',
  'assets/music/victory.mp3',
  'assets/music/volcano.mp3',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  // cache: 'reload'：確保拿到伺服器上最新的檔案，而不是瀏覽器暫存的舊檔
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
});

// 遊戲裡按下「立即更新」時會送這個訊息過來
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // 檢查更新用的請求：一定走網路
  if (url.searchParams.has('fresh')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }
  // 其他：先用這個版本的快取（秒開、可離線），沒有才上網抓
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok && url.origin === location.origin) cache.put(e.request, res.clone());
      return res;
    })
  );
});
