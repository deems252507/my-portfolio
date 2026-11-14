import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";

// Intro lama (partikel) tetap dipertahankan sebagai cadangan bila WebGL tidak tersedia / gagal.
const LegacyWelcome = lazy(() => import("./WelcomeScreen"));
const DeveloperIntro = lazy(() => import("../components/intro/DeveloperIntro"));

const FADE_MS = 700;
const FAILSAFE_MS = 22000; // jaga-jaga: intro tidak boleh menahan akses ke portfolio

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

/**
 * Overlay intro sinematik. Portfolio asli dipasang di BAWAH overlay (lewat onReveal),
 * lalu overlay memudar -> pengunjung langsung berada di website sebenarnya.
 * Props sama dengan WelcomeScreen lama: { onReveal, onLoadingComplete }.
 */
export default function IntroScreen({ onReveal, onLoadingComplete }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "skip";
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return "skip";
    return hasWebGL() ? "intro" : "legacy";
  });
  const [leaving, setLeaving] = useState(false);
  const skipRef = useRef(null);
  const doneRef = useRef(false);
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
  const handleFade = useCallback(() => setLeaving(true), []);
  const handleError = useCallback(() => {
    if (!doneRef.current) setMode("legacy");
  }, []);

  // prefers-reduced-motion: langsung ke portfolio, tanpa animasi
  useEffect(() => {
    if (mode === "skip") finish();
  }, [mode, finish]);

  // kunci scroll selama intro, ESC = skip, dan pengaman waktu
  useEffect(() => {
    if (mode !== "intro") return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") (skipRef.current ? skipRef.current() : finish());
    };
    window.addEventListener("keydown", onKey);
    const failsafe = setTimeout(finish, FAILSAFE_MS);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(failsafe);
    };
  }, [mode, finish]);

  if (mode === "skip") return null;
  if (mode === "legacy") {
    return (
      <Suspense fallback={null}>
        <LegacyWelcome onReveal={onReveal} onLoadingComplete={onLoadingComplete} />
      </Suspense>
    );
  }

  const onSkip = () => (skipRef.current ? skipRef.current() : finish());

  return (
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
          onReveal={reveal}
          onFade={handleFade}
          onDone={finish}
          onError={handleError}
          registerSkip={(fn) => { skipRef.current = fn; }}
        />
      </Suspense>

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
  );
}
