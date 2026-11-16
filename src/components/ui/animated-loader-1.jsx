import React, { useState } from "react";

// Animasi loading "kotak-kotak" (animated-loader-1, 21st.dev).
// Gerak kotak memakai transform (bukan left/top) supaya tetap halus walau thread utama sedang sibuk
// memuat scene 3D. Posisi & timing keyframe sama persis dengan komponen aslinya.
const KEYFRAMES = `
@keyframes al1-square {
  0%, 10.5%   { transform: translate(0px, 0px); }
  12.5%, 23%  { transform: translate(32px, 0px); }
  25%, 35.5%  { transform: translate(64px, 0px); }
  37.5%, 48%  { transform: translate(64px, 32px); }
  50%, 60.5%  { transform: translate(32px, 32px); }
  62.5%, 73%  { transform: translate(32px, 64px); }
  75%, 85.5%  { transform: translate(0px, 64px); }
  87.5%, 98%  { transform: translate(0px, 32px); }
  100%        { transform: translate(0px, 0px); }
}
.al1-square { animation: al1-square 10s ease-in-out infinite both; will-change: transform; }
@media (prefers-reduced-motion: reduce) { .al1-square { animation-duration: 30s; } }
`;

/** Hanya kotak-kotaknya (tanpa latar). Dipakai oleh IntroLoader dan layar loading lain. */
export function SquaresLoader({ dark = true, className = "" }) {
  return (
    <div className={`relative w-24 h-24 rotate-45 z-10 ${className}`} aria-hidden="true">
      <style>{KEYFRAMES}</style>
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className={`absolute top-0 left-0 w-7 h-7 m-0.5 al1-square ${dark ? "bg-white" : "bg-gray-900"}`}
          style={{ animationDelay: `${-1.4285714286 * i}s` }}
        />
      ))}
    </div>
  );
}

/** Versi penuh (sesuai komponen asli): latar grid + tombol terang/gelap. */
const Loader = () => {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className={`w-full min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-300 ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
      <div
        className={`absolute inset-0 ${isDark ? "opacity-20" : "opacity-10"}`}
        style={{
          backgroundImage: `linear-gradient(${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <button
        onClick={() => setIsDark(!isDark)}
        aria-label="Ganti tema"
        className={`absolute top-6 right-6 z-20 p-3 rounded-full transition-all duration-300 ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-200"} shadow-lg`}
      >
        {isDark ? (
          <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <SquaresLoader dark={isDark} />
    </div>
  );
};

export default Loader;
