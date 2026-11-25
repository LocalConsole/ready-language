/* Service Worker: офлайн-режим (cache-first для статики и данных, ИИ-запросы всегда по сети) */
const V='misha-v1';
const ASSETS=['./','index.html','config.js','manifest.webmanifest','css/style.css','js/mascot.js','js/i18n.js','js/core.js','js/ai.js','js/ui.js','js/views1.js','js/views2.js','js/boot.js','data/words.json','data/questions.json','data/lessons.json','data/prompts.json','data/sources.json','icons/icon.svg','icons/icon-maskable.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
 e.respondWith(caches.match(e.request).then(hit=>{const net=fetch(e.request).then(r=>{if(r.ok)caches.open(V).then(c=>c.put(e.request,r.clone()));return r}).catch(()=>hit);return hit||net}))});
/* «Миша скучает»: фоновое напоминание (Periodic Background Sync, там где поддерживается) */
function lastActive(){return new Promise(res=>{const r=indexedDB.open('misha',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>{try{const q=r.result.transaction('kv').objectStore('kv').get('lastActive');q.onsuccess=()=>res(q.result||0);q.onerror=()=>res(0)}catch(e){res(0)}};r.onerror=()=>res(0)})}
self.addEventListener('periodicsync',e=>{if(e.tag==='misha-miss')e.waitUntil(lastActive().then(t=>{if(t&&Date.now()-t>24*3600e3)return self.registration.showNotification('Миша скучает 🐻',{body:'Чайник вскипел, слова остыли. Заглянешь на 10 минут?',icon:'icons/icon.svg',tag:'miss'})}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow('./#/home'))});
