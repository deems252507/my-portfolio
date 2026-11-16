import React, { useEffect, useRef } from "react";
import { useSiteContent } from "../../context/SiteContentContext";
import { getLightningSettings } from "../../lib/siteContent";

// Mount scene 3D. three.js + gsap dimuat lazy (code-split) agar halaman utama tetap ringan.
export default function DeveloperIntro({ audio, started = true, onFadeP, onZoom, onReady, onWelcome, onReveal, onFade, onDone, onError }) {
  const hostRef = useRef(null);
  const engineRef = useRef(null);
  const { content } = useSiteContent();
  const startedRef = useRef(started);
  startedRef.current = started;
  const contentRef = useRef(content);
  contentRef.current = content;
  const cb = useRef({ onFadeP, onZoom, onReady, onWelcome, onReveal, onFade, onDone, onError });
  cb.current = { onFadeP, onZoom, onReady, onWelcome, onReveal, onFade, onDone, onError };

  useEffect(() => {
    let engine = null;
    let cancelled = false;

    const cssVar = (n, fb) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;

    const readTheme = () => ({
      bg: cssVar("--col-bg", "#050510"),
      blue: cssVar("--col-blue", "#2563eb"),
      accent: cssVar("--col-accent", "#06b6d4"),
    });

    const start = async () => {
      try {
        // pastikan font situs siap supaya tulisan di layar monitor tidak berganti font
        if (document.fonts?.ready) {
          await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
        }
        const mod = await import("./workspaceScene");
        if (cancelled || !hostRef.current) return;
        engine = mod.createDeveloperWorkspace({
          container: hostRef.current,
          content: contentRef.current,
          theme: {
            bg: cssVar("--col-bg", "#050510"),
            blue: cssVar("--col-blue", "#2563eb"),
            accent: cssVar("--col-accent", "#06b6d4"),
          },
          // petir di monitor memakai pengaturan yang sama dengan layar sambutan asli (hue dll. dari admin)
          lightning: getLightningSettings(contentRef.current),
          audio,
          holdStart: true, // animasi menunggu tombol "Masuk" (gestur pengguna = suara boleh hidup)
          // kanvas partikel layar sambutan ASLI (dibuat tepat saat monitor menampilkan halamannya).
          // null = belum ada; monitor menggambar apa yang sedang berjalan di sana.
          liveWelcome: () => document.querySelector('canvas[data-welcome-particles]'),
          onZoom: (m) => cb.current.onZoom?.(m),
          onFadeP: (a) => cb.current.onFadeP?.(a),
          onReady: () => cb.current.onReady?.(),
          onWelcome: () => cb.current.onWelcome?.(),
          onReveal: () => cb.current.onReveal?.(),
          onFade: () => cb.current.onFade?.(),
          onDone: () => cb.current.onDone?.(),
          onError: (e) => cb.current.onError?.(e),
        });
        engineRef.current = engine;
        if (startedRef.current) engine.begin?.();
        // data admin bisa baru selesai dimuat setelah scene dibuat: samakan lagi
        engine.update?.({ content: contentRef.current, lightning: getLightningSettings(contentRef.current), theme: readTheme() });
      } catch (e) {
        if (!cancelled) cb.current.onError?.(e);
      }
    };
    start();

    return () => {
      cancelled = true;
      engineRef.current = null;
      engine?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pengunjung menekan "Masuk" -> jalankan animasi
  useEffect(() => { if (started) engineRef.current?.begin?.(); }, [started]);

  // Admin mengganti teks Welcome / warna / petir / loading -> monitor ikut (tanpa membuat ulang scene)
  useEffect(() => {
    const id = requestAnimationFrame(() => { // tunggu tema CSS diterapkan provider
      const cssVar = (n, fb) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;
      engineRef.current?.update({
        content,
        lightning: getLightningSettings(content),
        theme: { bg: cssVar("--col-bg", "#050510"), blue: cssVar("--col-blue", "#2563eb"), accent: cssVar("--col-accent", "#06b6d4") },
      });
    });
    return () => cancelAnimationFrame(id);
  }, [content]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
