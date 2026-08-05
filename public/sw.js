// Service Worker minimal — HANYA untuk syarat "installability" PWA.
// SENGAJA TIDAK melakukan caching/offline strategy apa pun di sini.
// Offline queue untuk data POS sudah ditangani terpisah lewat
// IndexedDB (lihat shared/lib/offline/), jangan duplikasi di sini.

self.addEventListener('install', () => {
  // skipWaiting membuat service worker baru langsung aktif
  // tanpa menunggu semua tab lama ditutup — supaya update
  // sw.js di masa depan (kalau ada) langsung berlaku cepat.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // clients.claim membuat service worker langsung mengambil alih
  // kontrol halaman yang sedang terbuka, tanpa perlu reload manual.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Handler ini WAJIB ada (walau kosong) — ini yang membuat browser
  // menganggap app "installable". Tidak melakukan intercept/caching
  // apa pun; request tetap jalan normal ke network seperti biasa.
});