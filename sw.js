const V='economias-v1';
const SHELL=['./','index.html','style.css','app.js','firebase-config.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  const put=res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res};
  if(u.origin===location.origin){ // ficheiros da app: rede primeiro, cache se estiver offline
    e.respondWith(fetch(r).then(put).catch(()=>caches.match(r)));
  }else if(u.hostname==='www.gstatic.com'){ // SDK do Firebase: cache primeiro
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(put)));
  }
});
