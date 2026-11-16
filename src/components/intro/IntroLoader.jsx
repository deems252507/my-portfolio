import React from "react";

// Layar loading sebelum intro 3D siap (memuat modul 3D, menyusun planet/ruangan, kompilasi shader).
// Animasi murni CSS (transform/opacity) sehingga tetap bergerak walau thread utama sibuk.
export default function IntroLoader({ visible = true }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 22,
        background: "radial-gradient(ellipse at center, #07131f 0%, #02050a 70%)",
        opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
        transition: "opacity 700ms cubic-bezier(0.4,0,0.2,1)",
        fontFamily: "var(--font-display, system-ui, sans-serif)",
      }}
    >
      <style>{`
        @keyframes il-spin { to { transform: rotate(360deg); } }
        @keyframes il-bar { 0% { transform: translateX(-110%); } 100% { transform: translateX(260%); } }
        @keyframes il-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
      `}</style>
      <div style={{ position: "relative", width: 76, height: 76 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(34,211,238,0.15)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#22d3ee", borderRightColor: "#2563eb", animation: "il-spin 1s linear infinite", boxShadow: "0 0 24px rgba(34,211,238,0.35)" }} />
        <div style={{ position: "absolute", inset: 22, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.9), rgba(37,99,235,0.2))", animation: "il-pulse 1.6s ease-in-out infinite" }} />
      </div>
      <div style={{ color: "rgba(220,240,255,0.9)", fontSize: 15, fontWeight: 600, letterSpacing: "0.04em" }}>Menyiapkan ruang kerja…</div>
      <div style={{ width: 200, height: 4, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: "40%", height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#2563eb,#22d3ee)", animation: "il-bar 1.3s ease-in-out infinite" }} />
      </div>
    </div>
  );
}
