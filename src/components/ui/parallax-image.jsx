import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/** Gambar yang bergeser pelan saat discroll (parallax) di dalam bingkai overflow-hidden milik pemanggil. */
export default function ParallaxImage({ strength = 7, className = "", style, ...img }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`]);
  return (
    <div ref={ref} className="h-full w-full overflow-hidden">
      <motion.img
        {...img}
        className={className}
        style={{ ...style, y: reduce ? 0 : y, scale: reduce ? 1 : 1 + (strength * 2.4) / 100 }}
      />
    </div>
  );
}
