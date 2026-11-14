import React, { useEffect, useRef } from "react";
import { useSiteContent } from "../../context/SiteContentContext";

// Mount scene 3D. three.js + gsap dimuat lazy (code-split) agar halaman utama tetap ringan.
export default function DeveloperIntro({ audio, onReveal, onFade, onDone, onError }) {
  const hostRef = useRef(null);
  const { content } = useSiteContent();
  const contentRef = useRef(content);
  contentRef.current = content;
  const cb = useRef({ onReveal, onFade, onDone, onError });
  cb.current = { onReveal, onFade, onDone, onError };

  useEffect(() => {
    let engine = null;
    let cancelled = false;

    const cssVar = (n, fb) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;

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
          audio,
          onReveal: () => cb.current.onReveal?.(),
          onFade: () => cb.current.onFade?.(),
          onDone: () => cb.current.onDone?.(),
          onError: (e) => cb.current.onError?.(e),
        });
      } catch (e) {
        if (!cancelled) cb.current.onError?.(e);
      }
    };
    start();

    return () => {
      cancelled = true;
      engine?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={hostRef} className="absolute inset-0" />
      {/* vignette sinematik (tidak menghalangi klik) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
      />
    </>
  );
}
