import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Teks sambutan dengan efek ZOOM-IN sinematik:
 * tiap huruf datang dari besar + blur lalu "mengunci" ke ukuran normal (dari tengah ke tepi),
 * disusul kilau cahaya yang menyapu teks dan dorongan kamera pelan (push-in).
 * Props sama seperti ParticleTextEffect lama, jadi pengaturan di admin tetap berfungsi.
 */
const EASE = [0.16, 1, 0.3, 1];

function AnimatedLine({ text, startDelay, fontSize, color, weight, glow, fontStack, reduce }) {
  const words = useMemo(() => String(text || "").split(/\s+/).filter(Boolean), [text]);
  const total = words.join("").length || 1;
  let idx = 0;

  return (
    <div
      className="flex flex-wrap justify-center items-baseline"
      style={{ fontFamily: fontStack, fontSize, fontWeight: weight, lineHeight: 1.12, columnGap: "0.28em", rowGap: "0.05em" }}
    >
      {words.map((word, wi) => (
        <span key={wi} className="inline-flex whitespace-nowrap" aria-hidden>
          {[...word].map((ch, ci) => {
            // urutan dari tengah ke tepi supaya terasa seperti "zoom ke pusat"
            const order = Math.abs(idx - total / 2) / total;
            idx++;
            return (
              <motion.span
                key={ci}
                className="inline-block"
                style={{ color, textShadow: glow, willChange: "transform, filter, opacity" }}
                initial={reduce ? false : { opacity: 0, scale: 2.8, y: 10, filter: "blur(18px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 1.05,
                  delay: startDelay + order * 0.9,
                  ease: EASE,
                  opacity: { duration: 0.6, delay: startDelay + order * 0.9 },
                }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

export function ZoomTextReveal({
  line1 = "Welcome To My",
  line2 = "Portofolio Website",
  fontFamily = "Arial",
  color1 = "#ffffff",
  color2 = "#2563eb",
}) {
  const reduce = useReducedMotion();
  const fontStack = `"${fontFamily}", "Plus Jakarta Sans", Arial, sans-serif`;
  const sr = `${line1} ${line2}`;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 px-2">
      {/* cahaya lembut di belakang teks */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: "min(92vw, 860px)",
          height: "min(40vw, 300px)",
          x: "-50%",
          y: "-50%",
          background: `radial-gradient(ellipse at center, ${color2}55 0%, transparent 68%)`,
          filter: "blur(40px)",
        }}
        initial={reduce ? false : { opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.8, ease: EASE }}
      />

      {/* dorongan kamera pelan (zoom-in halus selama loading) */}
      <motion.div
        className="relative flex flex-col items-center text-center w-full"
        initial={{ scale: 0.94 }}
        animate={{ scale: 1.07 }}
        transition={{ duration: 8, ease: "linear" }}
      >
        <span className="sr-only">{sr}</span>

        <AnimatedLine
          text={line1}
          startDelay={0.1}
          fontSize="clamp(1.1rem, 4.2vw, 2.6rem)"
          color={color1}
          weight={600}
          glow="0 2px 24px rgba(0,0,0,0.55)"
          fontStack={fontStack}
          reduce={reduce}
        />

        <motion.div
          aria-hidden
          className="my-3 sm:my-4 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color2}, transparent)` }}
          initial={reduce ? false : { width: 0, opacity: 0 }}
          animate={{ width: "min(70%, 420px)", opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.7, ease: EASE }}
        />

        <div className="relative">
          <AnimatedLine
            text={line2}
            startDelay={0.55}
            fontSize="clamp(1.9rem, 8vw, 5rem)"
            color={color2}
            weight={800}
            glow={`0 0 40px ${color2}66, 0 4px 24px rgba(0,0,0,0.5)`}
            fontStack={fontStack}
            reduce={reduce}
          />
          {/* kilau cahaya yang menyapu setelah teks terbentuk */}
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: "linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
                mixBlendMode: "overlay",
                WebkitMaskImage: "linear-gradient(black, black)",
              }}
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "120%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.4, delay: 2.1, ease: "easeInOut" }}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default ZoomTextReveal;
