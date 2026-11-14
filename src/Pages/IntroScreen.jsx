import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { createIntroAudio } from "../components/intro/audio";

// Urutan: intro 3D (programmer membuka website) -> kamera menembus layar ->
// WelcomeScreen milikmu ("Welcome To My Portofolio" + animasi partikel 3D) -> portfolio.
const LegacyWelcome = lazy(() => import("./WelcomeScreen"));
const DeveloperIntro = lazy(() => import("../components/intro/DeveloperIntro"));

const FADE_MS = 900;
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
    return hasWebGL();
  });
  const [welcome, setWelcome] = useState(!use3D); // welcome milikmu sedang tampil
  const [introGone, setIntroGone] = useState(!use3D); // overlay 3D sudah dilepas
  const [leaving, setLeaving] = useState(false);
  // Suara intro (Web Audio, tanpa file). MATI secara default; pengunjung menyalakannya lewat tombol.
  const audioRef = useRef(null);
  if (!audioRef.current && typeof window !== "undefined") audioRef.current = createIntroAudio();
  const [soundOn, setSoundOn] = useState(false);
  const [ready, setReady] = useState(false); // frame 3D pertama sudah tampil
  const handleReady = useCallback(() => setReady(true), []);
  const toggleSound = useCallback(async () => {
    const on = await audioRef.current.setEnabled(!audioRef.current.isEnabled());
    setSoundOn(on);
  }, []);
  useEffect(() => () => audioRef.current?.dispose(), []);
  const doneRef = useRef(false);
  const skippedRef = useRef(false);
  const revealedRef = useRef(false);
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

  // Dari scene 3D: kamera menembus layar -> pasang homepage di BAWAH overlay.
  // WelcomeScreen TIDAK diputar lagi (layar monitor sudah menampilkannya), jadi tidak ada animasi yang diulang.
  const handleThrough = useCallback(() => {
    if (skippedRef.current) return;
    reveal();
  }, [reveal]);
  const handleFade = useCallback(() => {
    if (!skippedRef.current) setLeaving(true);
  }, []);
  const handleDone = useCallback(() => {
    if (skippedRef.current) return;
    setIntroGone(true);
    finish(); // overlay sudah memudar: langsung masuk homepage
  }, [finish]);
  const handleError = useCallback(() => {
    // WebGL gagal di tengah jalan: langsung ke welcome milikmu
    setWelcome(true);
    setIntroGone(true);
  }, []);

  const onSkip = useCallback(() => {
    if (skippedRef.current) return;
    skippedRef.current = true;
    audioRef.current?.setEnabled(false); // hentikan suara saat dilewati
    reveal(); // portfolio dipasang di bawah overlay
    setLeaving(true);
    setTimeout(finish, FADE_MS);
  }, [reveal, finish]);

  // jaga-jaga: bila scene 3D tak siap dalam 6 detik, langsung ke welcome (tanpa layar kosong)
  useEffect(() => {
    if (!use3D || ready) return;
    const id = setTimeout(handleError, 6000);
    return () => clearTimeout(id);
  }, [use3D, ready, handleError]);

  // kunci scroll selama intro, ESC = skip, dan pengaman waktu
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape" && use3D && !introGone) onSkip(); };
    window.addEventListener("keydown", onKey);
    const failsafe = setTimeout(finish, FAILSAFE_MS);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(failsafe);
    };
  }, [use3D, introGone, onSkip, finish]);

  return (
    <>
      {/* Welcome milikmu (tidak diubah). Saat tampil bersama overlay 3D, overlay 3D memudar di atasnya. */}
      {welcome && !skippedRef.current && (
        <Suspense fallback={null}>
          <LegacyWelcome onReveal={reveal} onLoadingComplete={finish} />
        </Suspense>
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
          <Suspense fallback={null}>
            <DeveloperIntro
              audio={audioRef.current}
              onReady={handleReady}
              onReveal={handleThrough}
              onFade={handleFade}
              onDone={handleDone}
              onError={handleError}
            />
          </Suspense>

          {/* indikator memuat: tampil langsung, memudar saat 3D siap */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{ background: "#02050a", opacity: ready ? 0 : 1, transition: "opacity 600ms ease", zIndex: 5 }}
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/25 border-t-cyan-300" />
            <span className="text-xs tracking-[0.3em] text-cyan-100/60">MEMUAT</span>
          </div>

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
            {soundOn ? "Suara: Nyala" : "Suara: Mati"}
          </button>

          <button
            type="button"
            onClick={onSkip}
            aria-label="Lewati intro"
            className="absolute z-10 rounded-full border border-white/25 bg-black/40 px-5 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            style={{
              right: "max(1rem, env(safe-area-inset-right))",
              bottom: "max(1rem, env(safe-area-inset-bottom))",
              minHeight: 44,
              fontFamily: "var(--font-display)",
            }}
          >
            Skip Intro
          </button>
        </div>
      )}
    </>
  );
}
