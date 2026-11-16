import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { IntroAudio } from "../components/intro/introAudio";
import IntroLoader from "../components/intro/IntroLoader";

// Urutan: intro 3D (programmer membuka website) -> kamera menembus layar ->
// WelcomeScreen milikmu ("Welcome To My Portofolio" + animasi partikel 3D) -> portfolio.
const LegacyWelcome = lazy(() => import("./WelcomeScreen"));
const DeveloperIntro = lazy(() => import("../components/intro/DeveloperIntro"));

class IntroBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error("[intro]", err); this.props.onError?.(err); }
  render() { return this.state.failed ? null : this.props.children; }
}

const FADE_MS = 700;
const FAILSAFE_MS = 45000; // jaga-jaga: intro tidak boleh menahan akses ke portfolio

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

/** Props sama dengan WelcomeScreen lama: { onReveal, onLoadingComplete }. */
export default function IntroScreen({ onReveal, onLoadingComplete }) {
  // "reduced": tanpa intro 3D, langsung ke welcome lama (animasi dikurangi oleh pengaturan sistem)
  const [use3D] = useState(() => {
    if (typeof window === "undefined") return false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
    // perangkat sangat lemah: langsung ke website utama (tanpa intro 3D)
    if ((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2)) return false;
    return hasWebGL();
  });
  const [welcome, setWelcome] = useState(!use3D); // welcome milikmu sedang tampil
  const [introGone, setIntroGone] = useState(!use3D); // overlay 3D sudah dilepas
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);
  const skippedRef = useRef(false);
  const revealedRef = useRef(false);
  const audioRef = useRef(null);
  const zoomRef = useRef(null);
  if (!audioRef.current) audioRef.current = new IntroAudio();
  const [soundOn, setSoundOn] = useState(false);
  const [ready, setReady] = useState(false); // semua aset siap & GPU sudah dipanaskan
  const [entered, setEntered] = useState(false); // pengunjung menekan "Masuk"
  const cbs = useRef({ onReveal, onLoadingComplete });
  cbs.current = { onReveal, onLoadingComplete };

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    cbs.current.onReveal?.();
  }, []);
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    reveal();
    cbs.current.onLoadingComplete?.();
  }, [reveal]);

  // Dari scene 3D: kamera menembus layar -> mulai welcome milikmu di bawah overlay 3D
  const handleThrough = useCallback(() => {
    if (skippedRef.current) return;
    setWelcome(true);
  }, []);
  const handleFade = useCallback(() => {
    if (!skippedRef.current) setLeaving(true);
  }, []);
  // kamera menembus layar: layar sambutan asli diskala sama dengan pembesaran monitor, jadi saat overlay
  // memudar keduanya identik. Setelah overlay lepas, skala mengendap halus ke 1 (tiba di halaman).
  const handleZoom = useCallback((m) => {
    const el = zoomRef.current;
    if (!el || skippedRef.current) return;
    el.style.transition = "none";
    el.style.transform = `scale(${m.toFixed(4)})`;
  }, []);
  const handleDone = useCallback(() => {
    if (skippedRef.current) return;
    const el = zoomRef.current;
    if (el) {
      el.style.transition = "transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)";
      el.style.transform = "scale(1)";
    }
    setIntroGone(true);
  }, []);
  const handleReady = useCallback(() => setReady(true), []);
  // layar sambutan ASLI mulai berjalan (tersembunyi di bawah overlay) saat monitor menampilkan halamannya,
  // sehingga saat kamera sampai di layar yang tampil adalah punyamu yang sudah berjalan, bukan mengulang dari awal
  const handleWelcomeStart = useCallback(() => {
    if (!skippedRef.current) setWelcome(true);
  }, []);
  const handleError = useCallback(() => {
    // WebGL gagal di tengah jalan: langsung ke welcome milikmu
    setWelcome(true);
    setIntroGone(true);
  }, []);

  const toggleSound = useCallback(async () => {
    const next = !audioRef.current.enabled;
    const ok = await audioRef.current.setEnabled(next);
    setSoundOn(next && ok);
  }, []);

  // Tombol "Masuk" = gestur pengguna: browser mengizinkan suara langsung hidup tanpa klik tambahan
  const handleSoundOn = useCallback(() => {
    audioRef.current.setEnabled(true).then((ok) => setSoundOn(!!ok)); // dipanggil sinkron di dalam klik koin
  }, []);
  const handleEnter = useCallback((withSound) => {
    if (withSound && !audioRef.current.enabled) {
      audioRef.current.setEnabled(true).then((ok) => setSoundOn(!!ok));
    }
    setEntered(true);
  }, []);

  const onSkip = useCallback(() => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    audioRef.current?.setEnabled(false);
    reveal(); // portfolio dipasang di bawah overlay
    setLeaving(true);
    setTimeout(finish, FADE_MS);
  }, [reveal, finish]);

  // muat modul layar sambutan lebih awal supaya start-nya tepat waktu
  useEffect(() => { if (use3D) import("./WelcomeScreen"); }, [use3D]);

  // bersihkan audio saat komponen dilepas
  useEffect(() => () => audioRef.current?.dispose(), []);

  // kunci scroll selama intro, ESC = skip, dan pengaman waktu
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape" && use3D && !introGone) onSkip(); };
    window.addEventListener("keydown", onKey);
    const readySafe = setTimeout(() => setReady(true), 12000); // loader tidak boleh menggantung
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(readySafe);
    };
  }, [use3D, introGone, onSkip, finish]);

  // pengaman waktu baru berjalan setelah pengunjung menekan "Masuk" (loader boleh menunggu selama apa pun)
  useEffect(() => {
    if (use3D && !entered) return;
    const failsafe = setTimeout(finish, FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, [use3D, entered, finish]);

  return (
    <>
      {/* Welcome milikmu (tidak diubah). Saat tampil bersama overlay 3D, overlay 3D memudar di atasnya. */}
      {welcome && !skippedRef.current && (
        <div ref={zoomRef} className="fixed inset-0 z-50" style={{ transformOrigin: "50% 50%", willChange: "transform" }}>
          <Suspense fallback={null}>
            <LegacyWelcome onReveal={reveal} onLoadingComplete={finish} />
          </Suspense>
        </div>
      )}

      {use3D && !introGone && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          role="dialog"
          aria-label="Intro portfolio"
          style={{
            background: "#02050a",
            opacity: leaving ? 0 : 1,
            transition: `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
            pointerEvents: leaving ? "none" : "auto",
          }}
        >
          <IntroBoundary onError={handleError}>
          <Suspense fallback={null}>
            <DeveloperIntro
              audio={audioRef.current}
              started={entered}
              onReady={handleReady}
              onZoom={handleZoom}
              onWelcome={handleWelcomeStart}
              onReveal={handleThrough}
              onFade={handleFade}
              onDone={handleDone}
              onError={handleError}
            />
          </Suspense>
          </IntroBoundary>

          <IntroLoader visible={!entered} ready={ready} onEnter={handleEnter} onSoundOn={handleSoundOn} />

          {/* vignette sinematik halus (tidak menangkap klik) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,4,10,0.55) 100%)" }}
          />

          {entered && audioRef.current.supported && (
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? "Matikan suara intro" : "Nyalakan suara intro"}
              className="absolute z-10 rounded-full border border-white/25 bg-black/40 px-5 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              style={{
                left: "max(1rem, env(safe-area-inset-left))",
                bottom: "max(1rem, env(safe-area-inset-bottom))",
                minHeight: 44,
                fontFamily: "var(--font-display)",
              }}
            >
              {soundOn ? "Suara: Hidup" : "Suara: Mati"}
            </button>
          )}

        </div>
      )}
    </>
  );
}
