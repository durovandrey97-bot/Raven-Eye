// sw.js — Service Worker для пуш-уведомлений RavenEye

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});

// Получаем сообщение от app.js и показываем уведомление
self.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'SHOW_NOTIFICATION') return;

  var data = e.data;
  e.waitUntil(
    self.registration.showNotification(data.title || '🦅 RavenEye', {
      body:    data.body  || 'Новый сигнал',
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     data.tag   || 'raveneye-signal',
      renotify: true,
      vibrate: data.vibrate || [100, 50, 100],
      data:    { url: data.url || '/' },
    })
  );
});

// Клик по уведомлению — открываем приложение
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.includes(url)) {
          return list[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
