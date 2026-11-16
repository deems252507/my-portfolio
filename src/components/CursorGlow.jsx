import React, { useEffect, useRef } from "react";

const HOVER_SEL = 'a, button, [role="button"], input, textarea, select, label, summary, .cursor-pointer';

/** Cahaya lembut + cincin kecil yang mengikuti kursor (hanya desktop/mouse). Cincin membesar di atas tombol & tautan. */
export default function CursorGlow() {
  const glow = useRef(null);
  const ring = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const g = glow.current, r = ring.current;
    if (!g || !r) return;
    let tx = -200, ty = -200, gx = -200, gy = -200, rx = -200, ry = -200, big = 0, bigT = 0, raf = 0, shown = false;

    const onMove = (e) => {
      tx = e.clientX; ty = e.clientY;
      bigT = e.target.closest?.(HOVER_SEL) ? 1 : 0;
      if (!shown) { shown = true; gx = rx = tx; gy = ry = ty; g.style.opacity = "1"; r.style.opacity = "1"; }
    };
    const onLeave = () => { shown = false; g.style.opacity = "0"; r.style.opacity = "0"; };
    const loop = () => {
      gx += (tx - gx) * 0.09; gy += (ty - gy) * 0.09;
      rx += (tx - rx) * 0.22; ry += (ty - ry) * 0.22;
      big += (bigT - big) * 0.18;
      g.style.transform = `translate3d(${gx - 190}px, ${gy - 190}px, 0)`;
      const s = 1 + big * 1.6;
      r.style.transform = `translate3d(${rx - 14}px, ${ry - 14}px, 0) scale(${s.toFixed(3)})`;
      r.style.background = `rgba(255,255,255,${(0.04 + big * 0.1).toFixed(3)})`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <div
        ref={glow} aria-hidden
        className="pointer-events-none fixed left-0 top-0 hidden [@media(hover:hover)_and_(pointer:fine)]:block"
        style={{
          width: 380, height: 380, borderRadius: "50%", zIndex: 9990, opacity: 0, transition: "opacity 400ms",
          background: "radial-gradient(circle, color-mix(in srgb, var(--col-blue) 22%, transparent) 0%, transparent 65%)",
          mixBlendMode: "screen", willChange: "transform",
        }}
      />
      <div
        ref={ring} aria-hidden
        className="pointer-events-none fixed left-0 top-0 hidden [@media(hover:hover)_and_(pointer:fine)]:block"
        style={{
          width: 28, height: 28, borderRadius: "50%", zIndex: 9991, opacity: 0, transition: "opacity 300ms",
          border: "1px solid rgba(255,255,255,0.45)", willChange: "transform",
        }}
      />
    </>
  );
}
