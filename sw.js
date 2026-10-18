const CACHE_NAME='phone-box-v4';
const CORE=['./','./index.html','./styles.css','./config.js','./app.js','./admin.html','./admin.js','./manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(CORE)));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);if(u.origin!==location.origin)return;
 const fresh=/\.(html|js|webmanifest)$/.test(u.pathname);
 if(fresh){
  e.respondWith(fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}return res;}).catch(()=>caches.match(e.request)));
 }else{
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,copy));}return res;}).catch(()=>cached)));
 }
});