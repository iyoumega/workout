/**
 * Service Worker — 应用壳缓存,让 app 可离线打开。
 * 策略:
 *   - HTML/CSS/JS/icon: cache-first, 后台更新
 *   - AI 接口(mega-deepseek.cylsport52330.workers.dev): 永远走网络,不缓存
 *   - 图片(B站等外链): 不拦截
 */
const VERSION = 'v0.9.1';
const SHELL_CACHE = 'shell-' + VERSION;
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icon.svg',
  './js/app.js',
  './js/storage.js',
  './js/nutrition.js',
  './js/weight_ref.js',
  './js/planner.js',
  './js/achievements.js',
  './js/ai.js',
  './js/ai_planner.js',
  './js/audio.js',
  './js/quotes.js',
  './js/ui.js',
  './js/data/exercises.js',
  './js/views/onboarding.js',
  './js/views/workout.js',
  './js/views/history.js',
  './js/views/settings.js',
  './js/views/chat.js',
  './js/views/body_map.js',
  './js/views/today.js',
  './js/views/plan.js',
  './js/views/me.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // AI 接口绝不缓存
  if (url.hostname.includes('cylsport52330.workers.dev') ||
      url.hostname.includes('deepseek') ||
      url.hostname.includes('search.bilibili.com')) {
    return; // 不拦截,走网络
  }
  // 仅处理同源 GET
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 对于导航 / index.html 请求 → 网络优先,失败回退缓存
  // 这样总能拿到最新的 HTML(里面引用的 JS 路径不变,缓存命中)
  const isNavigation = e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html');
  if (isNavigation) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(SHELL_CACHE).then(c => c.put(e.request, clone)).catch(()=>{});
        }
        return resp;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // 其它资源:stale-while-revalidate
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(resp => {
        if (resp && resp.ok) {
          const clone = resp.clone();
          caches.open(SHELL_CACHE).then(c => c.put(e.request, clone)).catch(()=>{});
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// 监听 skip-waiting 信号
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
