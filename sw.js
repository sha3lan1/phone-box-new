const CACHE_NAME='phone-box-v26';
const CORE=['./','./index.html','./styles.css','./config.js','./app.js','./admin.html','./admin.js','./manifest.webmanifest'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE_NAME).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request;
 if(req.method!=='GET')return;
 const u=new URL(req.url);if(u.origin!==location.origin)return;
 // Pages (including the bare "/" URL), scripts and manifest: always try the network first so updates reach customers,
 // and fall back to the last cached copy when offline.
 const fresh=req.mode==='navigate'||u.pathname.endsWith('/')||/\.(html|js|webmanifest)$/.test(u.pathname);
 if(fresh){
  e.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));}return res;}).catch(()=>caches.match(req,{ignoreSearch:true}).then(c=>c||caches.match('./index.html')).then(c=>c||new Response('Network unavailable. Reopen this page while connected to the internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}}))));
 }else{
  e.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE_NAME).then(c=>c.put(req,copy));}return res;}).catch(()=>cached)));
 }
});