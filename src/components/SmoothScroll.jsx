import { useEffect } from "react";
import Lenis from "lenis";
import AOS from "aos";

/**
 * Smooth scroll (Lenis). Hanya aktif bila `enabled` (setelah intro selesai, karena selama intro scroll dikunci),
 * dan dimatikan untuk pengguna dengan prefers-reduced-motion. Tautan #anchor (Navbar, tombol CTA) ikut mulus.
 */
export default function SmoothScroll({ enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    let raf = 0;
    const loop = (time) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    lenis.on("scroll", () => AOS.refresh?.());
    const onClick = (e) => {
      const a = e.target.closest?.('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -10 }); }
    };
    document.addEventListener("click", onClick);
    return () => { document.removeEventListener("click", onClick); cancelAnimationFrame(raf); lenis.destroy(); };
  }, [enabled]);
  return null;
}
