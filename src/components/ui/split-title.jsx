import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Judul section: tiap huruf naik dari balik masker (stagger), muncul sekali saat masuk layar.
 * Dipakai di dalam <h2 className="section-label"> menggantikan teks biasa.
 */
export default function SplitTitle({ text, delay = 0, stagger = 0.035 }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{text}</>;
  const words = String(text).split(" ");
  return (
    <motion.span
      aria-label={text}
      style={{ display: "inline-block" }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.6 }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
    >
      {words.map((w, wi) => (
        <span key={wi} aria-hidden="true" style={{ display: "inline-block", whiteSpace: "pre" }}>
          {w.split("").map((c, ci) => (
            <span key={ci} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom", paddingBottom: "0.12em", marginBottom: "-0.12em" }}>
              <motion.span
                style={{ display: "inline-block" }}
                variants={{
                  hidden: { y: "110%", opacity: 0, rotate: 6 },
                  visible: { y: "0%", opacity: 1, rotate: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                {c}
              </motion.span>
            </span>
          ))}
          {wi < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.span>
  );
}
