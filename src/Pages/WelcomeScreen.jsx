import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleTextEffect } from '../components/ui/particle-text-effect';
import { useSiteContent } from '../context/SiteContentContext';
import WelcomeBackground from '../components/WelcomeBackground';
import LoadingProgress from '../components/LoadingProgress';

// Timeline intro (ms): partikel berkumpul -> teks ditahan -> kamera zoom menembus teks -> crossfade ke halaman utama.
const MIN_TOTAL_MS = 6000;     // waktu minimum sampai transisi keluar dimulai
const ZOOM_LEAD_MS = 1250;     // kamera mulai zoom sekian ms sebelum transisi keluar
const EXIT_FADE_MS = 1000;     // durasi crossfade ke halaman utama

const WelcomeScreen = ({ onLoadingComplete, onReveal }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [zooming, setZooming] = useState(false);
  const anchorRef = useRef(null);
  const exitedRef = useRef(false);
  const doneTimerRef = useRef(null);
  const cbRef = useRef({ onLoadingComplete, onReveal });
  cbRef.current = { onLoadingComplete, onReveal };
  const { content } = useSiteContent();

  const configured = Math.max(1500, (parseFloat(content?.loading_duration) || 4.5) * 1000);
  const totalMs = Math.max(MIN_TOTAL_MS, configured);
  // progress bar selesai tepat saat teks selesai ditahan, lalu kamera mulai menyelam
  const progressContent = { ...content, loading_duration: String((totalMs - ZOOM_LEAD_MS) / 1000) };

  // Satu pintu untuk semua fase. Mesin partikel (jam internal yang sama dengan kameranya) yang
  // memicu; timer di bawah hanya cadangan bila kanvas gagal berjalan.
  const handlePhase = useCallback((phase) => {
    if (phase === 'zoom') setZooming(true);
    if (phase === 'exit' && !exitedRef.current) {
      exitedRef.current = true;
      cbRef.current.onReveal?.();      // halaman utama dipasang DI BAWAH overlay (tak ada layar kosong)
      setIsLoading(false);            // overlay memudar -> crossfade
      doneTimerRef.current = setTimeout(() => cbRef.current.onLoadingComplete?.(), EXIT_FADE_MS + 100);
    }
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => handlePhase('zoom'), totalMs - ZOOM_LEAD_MS + 1200);
    const t2 = setTimeout(() => handlePhase('exit'), totalMs + 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [totalMs, handlePhase]);

  useEffect(() => () => clearTimeout(doneTimerRef.current), []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden"
          style={{ willChange: 'opacity' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.6, ease: 'easeOut' } }}
          exit={{ opacity: 0, transition: { duration: EXIT_FADE_MS / 1000, ease: [0.4, 0, 0.2, 1] } }}
        >
          <WelcomeBackground content={content} />

          {/* Kanvas 3D memenuhi layar; teks terbentuk di area anchor */}
          <ParticleTextEffect
            anchorRef={anchorRef}
            line1={content.welcome_line1 || "Welcome To My"}
            line2={content.welcome_line2 || "Portofolio Website"}
            fontFamily={content.welcome_font || "Arial"}
            color1={content.welcome_color1 || "#ffffff"}
            color2={content.welcome_color2 || "#2563eb"}
            totalMs={totalMs}
            onPhase={handlePhase}
          />

          <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 sm:px-8">
            <div className="w-full max-w-5xl mx-auto">
              <div
                ref={anchorRef}
                aria-hidden
                className="relative mb-6 sm:mb-8 md:mb-12 w-full"
                style={{ height: "clamp(260px, 40vh, 380px)" }}
              />

              <div className="text-center" data-aos="fade-up" data-aos-delay="1200">
                {/* progress selesai -> menghilang lembut saat kamera mulai menyelam ke dalam teks */}
                <motion.div
                  animate={zooming ? { opacity: 0, y: 28, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                >
                  <LoadingProgress content={progressContent} />
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeScreen;
