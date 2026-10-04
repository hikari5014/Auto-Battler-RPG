// 離線快取：改版時把版本號 +1，舊快取就會被清掉
const CACHE = 'marble-brave-v3';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'js/audio.js',
  'js/battle.js',
  'js/board.js',
  'js/data.js',
  'js/main.js',
  'js/save.js',
  'js/sprites.js',
  'assets/img/icons-1bit.png',
  'assets/img/pixel-platformer-bg.png',
  'assets/img/pixel-platformer.png',
  'assets/img/tiny-dungeon.png',
  'assets/ui/ancient-brown.png',
  'assets/ui/ancient-tan_inlay.png',
  'assets/ui/colored-blue.png',
  'assets/ui/colored-green.png',
  'assets/ui/colored-green_pressed.png',
  'assets/ui/colored-grey.png',
  'assets/ui/colored-red.png',
  'assets/ui/colored-red_pressed.png',
  'assets/ui/colored-yellow.png',
  'assets/fonts/Cubic_11.woff2',
  'assets/sfx/block.mp3',
  'assets/sfx/buy.mp3',
  'assets/sfx/clink1.mp3',
  'assets/sfx/clink2.mp3',
  'assets/sfx/crit.mp3',
  'assets/sfx/gate.mp3',
  'assets/sfx/hit1.mp3',
  'assets/sfx/hit2.mp3',
  'assets/sfx/hurt.mp3',
  'assets/sfx/kill.mp3',
  'assets/sfx/lose.mp3',
  'assets/sfx/peg.mp3',
  'assets/sfx/slash.mp3',
  'assets/sfx/tap.mp3',
  'assets/sfx/wave.mp3',
  'assets/sfx/win.mp3',
  'assets/music/boss.mp3',
  'assets/music/home.mp3',
  'assets/music/stage1.mp3',
  'assets/music/stage2.mp3',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 先用快取（秒開），同時在背景抓新版更新快取
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request)
        .then(res => {
          if (res.ok && new URL(e.request.url).origin === location.origin) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
