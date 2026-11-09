import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticleTextEffect } from '../components/ui/particle-text-effect';
import { useSiteContent } from '../context/SiteContentContext';
import WelcomeBackground from '../components/WelcomeBackground';
import LoadingProgress from '../components/LoadingProgress';

const WelcomeScreen = ({ onLoadingComplete }) => {
  const [isLoading, setIsLoading] = useState(true);
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
      scale: 1.6,
      filter: "blur(14px)",
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

          <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 sm:px-8">
            <div className="w-full max-w-5xl mx-auto">
              <motion.div
                className="relative text-center mb-6 sm:mb-8 md:mb-12 w-full flex justify-center"
                style={{ height: "clamp(190px, 30vh, 340px)" }}
                variants={childVariants}
              >
                <ParticleTextEffect
                  line1={content.welcome_line1 || "Welcome To My"}
                  line2={content.welcome_line2 || "Portofolio Website"}
                  fontFamily={content.welcome_font || "Arial"}
                />
              </motion.div>

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
