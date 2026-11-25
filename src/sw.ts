/// <reference lib="webworker" />
/* Service Worker (vite-plugin-pwa, injectManifest): офлайн-режим + фоновое напоминание «Миша скучает». */
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<string | { url: string; revision: string | null }> };

self.skipWaiting();
self.addEventListener('activate', () => self.clients.claim());
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
// SPA-навигация (HashRouter): любой переход отдаёт предзакэшированный index.html
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
// Запросы к ИИ-прокси (другой origin) сервис-воркер не трогает — они идут напрямую в сеть.

function lastActive(): Promise<number> {
  return new Promise((res) => {
    const r = indexedDB.open('misha-react');
    r.onerror = () => res(0);
    r.onsuccess = () => {
      try {
        const db = r.result;
        if (!db.objectStoreNames.contains('kv')) return res(0);
        const q = db.transaction('kv').objectStore('kv').get('lastActive');
        q.onsuccess = () => res((q.result && q.result.value) || 0);
        q.onerror = () => res(0);
      } catch {
        res(0);
      }
    };
  });
}

self.addEventListener('periodicsync', (e: Event) => {
  const ev = e as Event & { tag: string; waitUntil: (p: Promise<unknown>) => void };
  if (ev.tag !== 'misha-miss') return;
  ev.waitUntil(
    lastActive().then((t) => {
      if (t && Date.now() - t > 24 * 3600e3)
        return self.registration.showNotification('Миша скучает 🐻', { body: 'Чайник вскипел, слова остыли. Заглянешь на 10 минут?', icon: './icons/icon-192.png', tag: 'miss' });
    }),
  );
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow('./#/home'));
});
