/* ============================================================
   PresuApp - Service Worker (trabajador de servicio)
   Qué hace: guarda una copia de la app en el móvil para que
   abra rápido y funcione aunque no haya cobertura en la obra.
   ============================================================ */

// 1. Nombre y versión de la caché. Al cambiar el número,
//    el móvil borra la copia vieja y descarga la nueva.
var CACHE = "presuapp-v2"; // v2: nuevo diseno (nov 2026)

// 2. Archivos que se guardan nada más instalar la app.
var ARCHIVOS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "iconos/icono-192.png",
  "iconos/icono-512.png",
  "iconos/icono-512-maskable.png",
  "iconos/icono-180.png"
];

// 3. Instalación: se descargan los archivos a la caché.
self.addEventListener("install", function (evento) {
  evento.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ARCHIVOS);
    })
  );
  self.skipWaiting();
});

// 4. Activación: se borran las cachés de versiones anteriores.
self.addEventListener("activate", function (evento) {
  evento.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(
        nombres.filter(function (nombre) {
          return nombre !== CACHE;
        }).map(function (nombre) {
          return caches.delete(nombre);
        })
      );
    })
  );
  self.clients.claim();
});

// 5. Cada vez que la app pide un archivo:
//    primero se usa la copia guardada (rápido) y, en segundo
//    plano, se descarga la versión nueva para la próxima vez.
//    Si no hay conexión, la app sigue funcionando con la copia.
self.addEventListener("fetch", function (evento) {
  if (evento.request.method !== "GET") return;
  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true }).then(function (guardado) {
      var descarga = fetch(evento.request).then(function (respuesta) {
        if (respuesta && respuesta.ok) {
          var copia = respuesta.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(evento.request, copia);
          });
        }
        return respuesta;
      }).catch(function () {
        return guardado;
      });
      return guardado || descarga;
    })
  );
});
