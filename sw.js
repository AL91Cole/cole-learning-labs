// Offline cache for the public static site. The build fills in the exact file
// list and a version derived from those files. Only public pages, styles,
// scripts and icons are cached; learner work never passes through here, and
// requests to /api/ are left to the network untouched.
const CACHE_NAME='cll-static-__CACHE_VERSION__';
const PRECACHE=__PRECACHE_MANIFEST__;
const PRECACHED=new Set(PRECACHE);
const OFFLINE_HTML='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Cole Learning Labs</title><style>body{font-family:Inter,"Segoe UI",Arial,sans-serif;margin:0;padding:48px 24px;color:#152b3d;background:#f7f9fa;line-height:1.6}main{max-width:620px;margin:auto}a{color:#007f78}</style><main><h1>This page is not available offline.</h1><p>The home page and any lab you opened before are still ready. Reconnect to open other pages.</p><p><a href="/">Go to the home page</a></p></main></html>';

self.addEventListener('install',event=>{
  // Install only when every reviewed file is cached; a partial cache is worse than none.
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(PRECACHE)));
});
self.addEventListener('activate',event=>{
  // The new version waits until open tabs close, so a page keeps the chunks it started with.
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cll-static-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||url.pathname==='/api'||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(async()=>{
      const cache=await caches.open(CACHE_NAME);
      const home=url.pathname==='/'||url.pathname==='/index.html'?await cache.match('/'):null;
      return home||new Response(OFFLINE_HTML,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    }));
    return;
  }
  const key=url.pathname+url.search;
  const routeChunk=/^\/src\/chunks\/[a-z0-9-]+-[A-Z0-9]+\.js$/u.test(url.pathname);
  if(!PRECACHED.has(key)&&!routeChunk)return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache=>{
    const cached=await cache.match(request);
    if(cached)return cached;
    const response=await fetch(request);
    if(response.ok&&routeChunk)cache.put(request,response.clone());
    return response;
  }));
});
