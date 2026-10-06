const CACHE='academy-map-pwa-v2';
const CORE=[
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  'https://unpkg.com/japan-map-js@1.0.1/dist/jpmap.min.js'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      return Promise.all(
        CORE.map(function(url){
          return cache.add(url).catch(function(){ return null; });
        })
      );
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){return k!==CACHE;})
          .map(function(k){return caches.delete(k);})
      );
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener('fetch', function(event){
  if(event.request.method!=='GET') return;

  event.respondWith(
    fetch(event.request)
      .then(function(response){
        var copy=response.clone();
        caches.open(CACHE).then(function(cache){cache.put(event.request,copy);});
        return response;
      })
      .catch(function(){
        return caches.match(event.request).then(function(hit){
          return hit || caches.match('./index.html');
        });
      })
  );
});
