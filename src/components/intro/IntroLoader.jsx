import React from "react";
import { SquaresLoader } from "../ui/animated-loader-1";

// Layar loading sebelum intro 3D siap (memuat modul 3D, tekstur Bumi, menyusun ruangan, kompilasi shader).
// Animasi kotak-kotak murni CSS (transform) sehingga tetap bergerak walau thread utama sibuk.
// Tampilannya harus sama dengan #boot-loader di index.html supaya tidak ada lompatan saat React mengambil alih.
export default function IntroLoader({ visible = true, ready = false, onEnter = null }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 14,
        background: "radial-gradient(ellipse at center, #07131f 0%, #02050a 70%)",
        opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none",
        transition: "opacity 700ms cubic-bezier(0.4,0,0.2,1)",
        fontFamily: "var(--font-display, system-ui, sans-serif)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, opacity: 0.2,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <div style={{ margin: "24px 0 30px" }}>
        <SquaresLoader dark />
      </div>
      {!ready || !onEnter ? (
        <div style={{ position: "relative", zIndex: 10, color: "rgba(220,240,255,0.85)", fontSize: 14, fontWeight: 600, letterSpacing: "0.06em" }}>
          Menyiapkan ruang kerja…
        </div>
      ) : (
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "intro-enter-in 600ms ease-out both" }}>
          <style>{"@keyframes intro-enter-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"}</style>
          <button
            type="button"
            autoFocus
            onClick={() => onEnter(true)}
            style={{
              minHeight: 48, padding: "0 34px", borderRadius: 999, cursor: "pointer",
              border: "1px solid rgba(120,220,255,0.6)", background: "rgba(34,211,238,0.14)",
              color: "#e8f8ff", fontSize: 15, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              boxShadow: "0 0 28px rgba(34,211,238,0.35)", fontFamily: "inherit",
            }}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => onEnter(false)}
            style={{ minHeight: 40, background: "none", border: "none", cursor: "pointer", color: "rgba(220,240,255,0.55)", fontSize: 12, fontFamily: "inherit" }}
          >
            Masuk tanpa suara
          </button>
        </div>
      )}
    </div>
  );
}
