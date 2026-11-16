import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { useState, lazy, Suspense, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { SiteContentProvider } from "./context/SiteContentContext";
import AOS from 'aos';
import 'aos/dist/aos.css';
import "./index.css";
import Navbar from "./components/Navbar";
import AnimatedBackground from "./components/Background";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "./components/Footer";
import Login from "./Pages/Login";
import Dashboard from "./Pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import WhatsAppButton from "./components/WhatsAppButton";
import IntroLoader from "./components/intro/IntroLoader";
import SmoothScroll from "./components/SmoothScroll";
import CursorGlow from "./components/CursorGlow";
import FilmOverlay from "./components/FilmOverlay";
import ErrorBoundary, { CrashScreen } from "./components/ErrorBoundary";
import { retryImport, lazyWithRetry } from "./utils/lazyWithRetry";

// retryImport: coba ulang bila unduhan gagal (sinyal HP) supaya tidak berakhir layar hitam
const importHome = retryImport(() => import("./Pages/Home"));
const importAbout = retryImport(() => import("./Pages/About"));
const importPortofolio = retryImport(() => import("./Pages/Portofolio"));
const importContact = retryImport(() => import("./Pages/Contact"));

const Home = lazy(importHome);
const About = lazy(importAbout);
const Portofolio = lazy(importPortofolio);
const ContactPage = lazy(importContact);
const ProjectDetails = lazyWithRetry(() => import("./components/ProjectDetail"));
// Intro sinematik 3D (WelcomeScreen lama tetap ada sebagai cadangan di dalam IntroScreen)
const WelcomeScreen = lazyWithRetry(() => import("./Pages/IntroScreen"));
const NotFoundPage = lazyWithRetry(() => import("./Pages/404"));

// Bila intro/welcome error, jangan biarkan layar hitam: lewati langsung ke halaman utama.
function SkipIntro({ onSkip }) {
  useEffect(() => { onSkip(); }, [onSkip]);
  return null;
}

const LandingPage = ({ showWelcome, setShowWelcome }) => {
  // Halaman utama dipasang saat intro mulai keluar (di BAWAH overlay), lalu di-crossfade.
  // Tidak ada layar kosong / kedip: overlay memudar sambil halaman utama muncul.
  const [revealed, setRevealed] = useState(false);
  const showMain = !showWelcome || revealed;

  useEffect(() => {
    if (!revealed) return;
    const id = setTimeout(() => AOS.refresh(), 80);
    return () => clearTimeout(id);
  }, [revealed]);

  return (
    <>
      <SmoothScroll enabled={!showWelcome} />
      {!showWelcome && <CursorGlow />}
      {!showWelcome && <FilmOverlay />}
      <AnimatePresence mode="wait">
        {showWelcome && (
          <ErrorBoundary
            name="intro"
            fallback={<SkipIntro onSkip={() => { setRevealed(true); setShowWelcome(false); }} />}
          >
          <Suspense fallback={<div className="fixed inset-0 z-50"><IntroLoader /></div>}>
            <WelcomeScreen
              onReveal={() => setRevealed(true)}
              onLoadingComplete={() => setShowWelcome(false)}
            />
          </Suspense>
          </ErrorBoundary>
        )}
      </AnimatePresence>

      {showMain && (
        // hanya opacity (bukan transform) supaya elemen position:fixed di dalamnya (Navbar, WhatsApp) tidak terpengaruh
        <motion.div
          initial={{ opacity: showWelcome ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
        >
          <Navbar />
          {/* tiap bagian punya boundary sendiri: satu bagian error tidak menjatuhkan seluruh halaman */}
          <Suspense fallback={<div className="h-20" />}>
            <ErrorBoundary name="home"><Home /></ErrorBoundary>
            <ErrorBoundary name="about"><About /></ErrorBoundary>
            <ErrorBoundary name="portofolio"><Portofolio /></ErrorBoundary>
            <ErrorBoundary name="contact"><ContactPage /></ErrorBoundary>
          </Suspense>
          <Footer />
          <WhatsAppButton />
        </motion.div>
      )}
    </>
  );
};

const ProjectPageLayout = () => (
  <>
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProjectDetails />
    </Suspense>
    <Footer />
    <WhatsAppButton />
  </>
);

function App() {
  const [showWelcome, setShowWelcome] = useState(true);

  // Inisialisasi AOS sekali di sini
  useEffect(() => {
    AOS.init({ once: false, mirror: true, offset: 40, duration: 900, easing: 'ease-out-cubic' });
    
    // Preload halaman di background selagi WelcomeScreen berjalan
    // Ini mencegah lag/patah-patah saat animasi WelcomeScreen selesai
    importHome();
    importAbout();
    importPortofolio();
    importContact();
  }, []);

  return (
    
    <ErrorBoundary name="root" fallback={<CrashScreen />}>
    <HelmetProvider>
    <SiteContentProvider>
      <div className="pointer-events-none">
  <AnimatedBackground />
</div>
      <BrowserRouter>
        <Routes>
          {/* PUBLIC */}
          <Route
            path="/"
            element={
              <LandingPage
                showWelcome={showWelcome}
                setShowWelcome={setShowWelcome}
              />
            }
          />

          <Route path="/project/:slug" element={<ProjectPageLayout />} />

          {/* AUTH */}
          <Route path="/login" element={<Login />} />

          {/* ADMIN (PROTECTED) */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route
            path="*"
            element={
              <Suspense fallback={null}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </SiteContentProvider>
    </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;