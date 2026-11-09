import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleTextEffect } from '../components/ui/particle-text-effect';
import { useSiteContent } from '../context/SiteContentContext';
import WelcomeBackground from '../components/WelcomeBackground';
import LoadingProgress from '../components/LoadingProgress';

const WelcomeScreen = ({ onLoadingComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
  const anchorRef = useRef(null);
  const { content } = useSiteContent();

  const loadDuration = Math.max(1500, (parseFloat(content?.loading_duration) || 4.5) * 1000);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => {
        onLoadingComplete?.();
      }, 800);
    }, loadDuration);
    
    return () => clearTimeout(timer);
  }, [onLoadingComplete, loadDuration]);

  const containerVariants = {
    exit: {
      opacity: 0,
      scale: 1.35,
      transition: {
        duration: 0.9,
        ease: [0.7, 0, 0.84, 0],
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const childVariants = {
    exit: {
      scale: 1.2,
      opacity: 0,
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit="exit"
          variants={containerVariants}
        >
          <WelcomeBackground content={content} />

          {/* Kanvas partikel memenuhi seluruh layar (tanpa kotak); teks muncul di area anchor di bawah */}
          <ParticleTextEffect
            anchorRef={anchorRef}
            line1={content.welcome_line1 || "Welcome To My"}
            line2={content.welcome_line2 || "Portofolio Website"}
            fontFamily={content.welcome_font || "Arial"}
            color1={content.welcome_color1 || "#ffffff"}
            color2={content.welcome_color2 || "#2563eb"}
          />

          <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 sm:px-8">
            <div className="w-full max-w-5xl mx-auto">
              <div
                ref={anchorRef}
                aria-hidden
                className="relative mb-6 sm:mb-8 md:mb-12 w-full"
                style={{ height: "clamp(260px, 40vh, 380px)" }}
              />

              <motion.div
                className="text-center"
                variants={childVariants}
                data-aos="fade-up"
                data-aos-delay="1200"
              >
                <LoadingProgress content={content} />
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeScreen;
