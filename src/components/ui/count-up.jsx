import React, { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/** Angka naik dari 0 (atau dari nilai sebelumnya) saat masuk layar; ikut naik lagi bila nilainya berubah (mis. data baru dimuat). */
export default function CountUp({ value = 0, duration = 1.8, suffix = "" }) {
  const ref = useRef(null);
  const shown = useRef(0);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const target = Number(value) || 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || !inView) { if (reduce) { el.textContent = target + suffix; shown.current = target; } return; }
    const ctl = animate(shown.current, target, {
      duration, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { shown.current = v; el.textContent = Math.round(v) + suffix; },
    });
    return () => ctl.stop();
  }, [inView, target, duration, suffix, reduce]);

  return <span ref={ref}>{0 + suffix}</span>;
}
