// ═══ RavenEye Service Worker ═══
// Меняй VERSION при каждом деплое — пользователи получат обновление сразу

var VERSION   = '2.1.' + Date.now(); // автоматически новая версия при каждом деплое
var CACHE     = 'raveneye-' + VERSION;
var OFFLINE   = 'raveneye-offline';

var STATIC_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/config.js',
  '/state.js',
  '/ui.js',
  '/events.js',
  '/app.js',
  '/manifest.json'
];

// ═══ INSTALL — кэшируем статику ═══
self.addEventListener('install', function(e) {
  console.log('[SW] Installing version:', VERSION);
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(STATIC_FILES).catch(function(err) {
        console.log('[SW] Cache addAll error:', err);
      });
    }).then(function() {
      // Сразу активируемся без ожидания закрытия старых вкладок
      return self.skipWaiting();
    })
  );
});

// ═══ ACTIVATE — удаляем старые кэши ═══
self.addEventListener('activate', function(e) {
  console.log('[SW] Activating version:', VERSION);
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          // Удаляем все старые версии
          return key.startsWith('raveneye-') && key !== CACHE;
        }).map(function(key) {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(function() {
      // Берём управление всеми вкладками сразу
      return self.clients.claim();
    }).then(function() {
      // Уведомляем все вкладки об обновлении
      return self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED', version: VERSION });
        });
      });
    })
  );
});

// ═══ FETCH — стратегия Network First для HTML, Cache First для статики ═══
self.addEventListener('fetch', function(e) {
  var url;
  try { url = new URL(e.request.url); } catch(err) { return; }

  // Пропускаем неподдерживаемые схемы
  if (url.protocol === 'chrome-extension:' ||
      url.protocol === 'blob:' ||
      url.protocol === 'data:') {
    return;
  }

  // Не кэшируем Firebase, Google APIs, Telegram
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis') ||
      url.hostname.includes('telegram') ||
      url.hostname.includes('script.google')) {
    return;
  }

  // HTML — всегда сеть, кэш только как fallback
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // JS/CSS — Cache First, обновляем в фоне
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        var fetchPromise = fetch(e.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE).then(function(cache) { cache.put(e.request, clone); });
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});

// ═══ PUSH УВЕДОМЛЕНИЯ ═══
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}

  var title   = data.title   || '🦅 RavenEye';
  var body    = data.body    || 'Новый сигнал';
  var tag     = data.tag     || 'raveneye-' + Date.now();
  var icon    = '/icons/icon-192.png';
  var badge   = '/icons/icon-96.png';

  e.waitUntil(
    self.registration.showNotification(title, {
      body: body, icon: icon, badge: badge, tag: tag,
      renotify: true, requireInteraction: false,
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(cls) {
      for (var i = 0; i < cls.length; i++) {
        if (cls[i].url.includes(self.location.origin)) {
          return cls[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
