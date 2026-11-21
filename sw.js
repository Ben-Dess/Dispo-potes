const CACHE='dispopotes-shell-v4-games-fixed';
const APP_FILES=['./','./index.html','./games.js','./icon.svg','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_FILES)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(request.url.includes('firebase-config.json'))return;
 event.respondWith(fetch(request).then(response=>{
   if(response.ok&&request.url.endsWith('/index.html')){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy))}
   return response
 }).catch(()=>caches.match(request).then(x=>x||caches.match('./index.html'))));
});
