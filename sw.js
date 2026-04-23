// ═══ RavenEye Service Worker ═══
var VERSION = '2.2';
var CACHE   = 'raveneye-v' + VERSION;

// ═══ INSTALL ═══
self.addEventListener('install', function(e) {
  // Сразу активируемся не ожидая закрытия старых вкладок
  self.skipWaiting();
});

// ═══ ACTIVATE — удаляем старые кэши ═══
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ═══ FETCH — Network First для всего ═══
// Всегда пробуем сеть первой, кэш только как fallback при офлайне
self.addEventListener('fetch', function(e) {
  var url;
  try { url = new URL(e.request.url); } catch(err) { return; }

  // Пропускаем неподдерживаемые схемы
  if (url.protocol === 'chrome-extension:' ||
      url.protocol === 'blob:' ||
      url.protocol === 'data:') {
    return;
  }

  // Не кэшируем внешние запросы
  if (url.hostname !== self.location.hostname) {
    return;
  }

  // Network First — всегда берём свежую версию с сервера
  e.respondWith(
    fetch(e.request).then(function(response) {
      // Сохраняем в кэш только успешные ответы
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Только если офлайн — возвращаем из кэша
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/index.html');
      });
    })
  );
});

// ═══ PUSH УВЕДОМЛЕНИЯ ═══
self.addEventListener('push', function(e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch(err) {}

  var title = data.title || '🦅 RavenEye';
  var body  = data.body  || 'Новый сигнал';
  var tag   = data.tag   || 'raveneye';

  e.waitUntil(
    self.registration.showNotification(title, {
      body: body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag: tag,
      renotify: true,
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
