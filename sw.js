// Ejecuta tools/preparar-publicacion.cjs antes de publicar: renueva VERSION
// a partir del contenido de todos los archivos públicos, sin dependencias.
const VERSION = '0d7098a83c469435';
const PREFIX = 'mi-dia:' + self.registration.scope + ':';
const CACHE_NAME = PREFIX + VERSION;
const FILES = [
    './', './index.html', './estilos.css', './tareas.js', './app.js',
    './resumenes.js', './interfaz.js', './pwa.js', './manifest.webmanifest',
    './icons/icon-192.png', './icons/icon-512.png',
    './icons/maskable-512.png', './icons/apple-touch-icon.png'
];
const URLS = new Set(FILES.map(file => new URL(file, self.registration.scope).href));

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            await cache.addAll([...URLS].map(url => new Request(url, {cache: 'reload'})));
        } catch (error) {
            // Una descarga incompleta nunca sustituye la versión activa.
            await caches.delete(CACHE_NAME);
            throw error;
        }
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('message', event => {
    if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    url.search = '';
    url.hash = '';
    // Lista cerrada: no se cachean terceros, formularios, otros proyectos ni datos.
    if (!URLS.has(url.href)) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(url.href);
        if (cached) return cached;
        // Solo se usa si el navegador ha eliminado una entrada de la caché.
        // No modifica la instantánea para evitar mezclar versiones de archivos.
        return fetch(event.request);
    })());
});
