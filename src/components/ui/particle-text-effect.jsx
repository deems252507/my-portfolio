import React, { useEffect, useRef } from "react";
import { createParticleTextEngine } from "./particle-text-engine";

/**
 * ParticleTextEffect — intro sinematik 3D.
 *
 * Props lama tetap sama (anchorRef, line1, line2, fontFamily, color1, color2). Tambahan:
 *  - totalMs : saat intro mulai keluar (ms). Kamera dolly-zoom berakhir sesaat setelahnya.
 *  - onPhase : callback "zoom" (kamera mulai menembus teks) dan "exit" (mulai transisi ke halaman utama).
 *
 * Mesin (particle-text-engine.js) hanya dibuat SEKALI per mount. Perubahan teks/warna/font
 * (mis. data CMS baru datang) disusun ulang lewat setText() tanpa mereset animasi, jadi tidak ada kedipan.
 */
export function ParticleTextEffect({
  anchorRef,
  line1 = "Welcome to",
  line2 = "My Portfolio",
  fontFamily = "Arial",
  color1 = "#ffffff",
  color2 = "#2563eb",
  totalMs = 6000,
  onPhase,
}) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const phaseRef = useRef(onPhase);
  phaseRef.current = onPhase;

  useEffect(() => {
    const canvas = canvasRef.current;
    const anchor = anchorRef?.current;
    if (!canvas || !anchor) return;
    const engine = createParticleTextEngine(canvas, anchor, {
      line1, line2, fontFamily, color1, color2, totalMs,
      onPhase: (p) => phaseRef.current?.(p),
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRef]);

  useEffect(() => {
    engineRef.current?.setText({ line1, line2, fontFamily, color1, color2 });
  }, [line1, line2, fontFamily, color1, color2]);

  useEffect(() => {
    engineRef.current?.setTiming(totalMs);
  }, [totalMs]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10" aria-hidden>
      <span className="sr-only">{`${line1} ${line2}`}</span>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}
