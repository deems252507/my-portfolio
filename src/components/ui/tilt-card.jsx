import React, { useRef, useCallback } from "react";

/** Kartu miring 3D mengikuti kursor + kilau lembut. Hanya aktif di perangkat dengan mouse (hover) dan tanpa prefers-reduced-motion. */
export default function TiltCard({ children, className = "", max = 7, scale = 1.015 }) {
  const ref = useRef(null);
  const raf = useRef(0);
  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = useCallback((e) => {
    if (!enabled()) return;
    const el = ref.current; if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (clientX - r.left) / r.width, py = (clientY - r.top) / r.height;
      el.style.transition = "transform 80ms linear";
      el.style.transform = `perspective(900px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg) scale(${scale})`;
      el.style.setProperty("--glx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gly", `${(py * 100).toFixed(1)}%`);
    });
  }, [max, scale]);

  const onLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const el = ref.current; if (!el) return;
    el.style.transition = "transform 500ms cubic-bezier(0.16,1,0.3,1)";
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)";
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`} style={{ transformStyle: "preserve-3d", willChange: "transform" }} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(260px circle at var(--glx,50%) var(--gly,0%), rgba(255,255,255,0.09), transparent 60%)" }}
      />
    </div>
  );
}
