import { lazy } from "react";

const RELOAD_KEY = "chunk-reload-at";

/**
 * Bungkus import() dinamis: coba ulang bila gagal (sinyal HP putus-nyambung).
 * Bila tetap gagal karena berkas lama sudah tidak ada (setelah deploy baru di Vercel), muat ulang halaman SEKALI
 * supaya dapat index.html terbaru. Tanpa ini, error "Failed to fetch dynamically imported module" membuat layar hitam.
 */
export function retryImport(factory, retries = 2, delay = 600) {
  return () => {
    const attempt = (left) =>
      factory().catch((err) => {
        if (left > 0) return new Promise((r) => setTimeout(r, delay)).then(() => attempt(left - 1));
        try {
          const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
          if (Date.now() - last > 30000) {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
            window.location.reload();
            return new Promise(() => {}); // tunggu reload
          }
        } catch { /* sessionStorage diblokir: lanjut lempar error ke ErrorBoundary */ }
        throw err;
      });
    return attempt(retries);
  };
}

export function lazyWithRetry(factory) {
  return lazy(retryImport(factory));
}
