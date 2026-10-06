var CACHE_NAME =
  'academy-map-v20261006-01';


var APP_FILES = [

  './',

  './index.html',

  './style.css?v=20261006-01',

  './app.js?v=20261006-01',

  './config.js?v=20261006-01',

  './manifest.webmanifest',

  './icon-192.png',

  './icon-512.png'

];


self.addEventListener(
  'install',
  function(event) {

    self.skipWaiting();

    event.waitUntil(

      caches
        .open(
          CACHE_NAME
        )
        .then(
          function(cache) {

            return Promise.all(

              APP_FILES.map(
                function(url) {

                  return cache
                    .add(
                      url
                    )
                    .catch(
                      function() {
                        return null;
                      }
                    );

                }
              )

            );

          }
        )

    );

  }
);


self.addEventListener(
  'activate',
  function(event) {

    event.waitUntil(

      caches
        .keys()
        .then(
          function(keys) {

            return Promise.all(

              keys.map(
                function(key) {

                  if (
                    key !==
                    CACHE_NAME
                  ) {

                    return caches.delete(
                      key
                    );

                  }

                  return null;

                }
              )

            );

          }
        )
        .then(
          function() {

            return self.clients.claim();

          }
        )

    );

  }
);


self.addEventListener(
  'fetch',
  function(event) {

    if (
      event.request.method !==
      'GET'
    ) {

      return;

    }


    var url =
      new URL(
        event.request.url
      );


    /*
      Google認証/APIは
      Service Workerでキャッシュしない
    */

    if (
      url.hostname.indexOf(
        'googleapis.com'
      ) !== -1 ||
      url.hostname.indexOf(
        'accounts.google.com'
      ) !== -1
    ) {

      return;

    }


    /*
      同一オリジンは
      network first
    */

    if (
      url.origin ===
      self.location.origin
    ) {

      event.respondWith(

        fetch(
          event.request,
          {
            cache:
              'no-store'
          }
        )
          .then(
            function(response) {

              var copy =
                response.clone();

              caches
                .open(
                  CACHE_NAME
                )
                .then(
                  function(cache) {

                    cache.put(
                      event.request,
                      copy
                    );

                  }
                );

              return response;

            }
          )
          .catch(
            function() {

              return caches.match(
                event.request
              );

            }
          )

      );

      return;

    }


    /*
      外部SVGなどは
      cache fallback
    */

    event.respondWith(

      fetch(
        event.request
      )
        .then(
          function(response) {

            return response;

          }
        )
        .catch(
          function() {

            return caches.match(
              event.request
            );

          }
        )

    );

  }
);
