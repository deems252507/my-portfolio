import React, { useEffect, useState } from "react";
import { SquaresLoader } from "../ui/animated-loader-1";
import FlipCoinButton from "../ui/flip-coin-button";
import { useSiteContent } from "../../context/SiteContentContext";
import { getCoinSettings } from "../../lib/siteContent";

// Layar loading sebelum intro 3D siap (memuat modul 3D, tekstur Bumi, menyusun ruangan, kompilasi shader).
// Animasi kotak-kotak murni CSS (transform) sehingga tetap bergerak walau thread utama sibuk.
// Tampilannya harus sama dengan #boot-loader di index.html supaya tidak ada lompatan saat React mengambil alih.
//
// Setelah semua siap muncul tombol koin "Hidupkan Suara": klik = suara menyala (gestur pengguna) + koin melambung;
// begitu koin mendarat intro dimulai. (Tombol "Masuk tanpa suara" dihapus; suara bisa dimatikan sendiri di dalam.)
// Foto di koin: admin "Foto koin suara" (kosong = foto profil).
export default function IntroLoader({ visible = true, ready = false, onEnter = null, onSoundOn = null }) {
  const { content } = useSiteContent();
  const photo = content?.coin_photo || content?.profile_photo || "";
  const coin = getCoinSettings(content);

  // unduh foto koin lebih awal supaya sudah ada saat koin berputar
  useEffect(() => {
    if (!photo) return;
    const i = new Image();
    i.src = photo;
  }, [photo]);

  const showEnter = ready && !!onEnter;
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
      {!showEnter ? (
        <div style={{ position: "relative", zIndex: 10, color: "rgba(220,240,255,0.85)", fontSize: 14, fontWeight: 600, letterSpacing: "0.06em" }}>
          Menyiapkan ruang kerja…
        </div>
      ) : (
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "intro-enter-in 600ms ease-out both" }}>
          <style>{"@keyframes intro-enter-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"}</style>
          <FlipCoinButton
            photo={photo}
            photoX={coin.photoX}
            photoY={coin.photoY}
            photoZoom={coin.photoZoom}
            bigScale={coin.bigScale}
            thanks="Suara hidup ✓"
            onFlip={() => { onSoundOn?.(); }}
            onLanded={() => setTimeout(() => onEnter(true), 800)}
          >
            Hidupkan Suara
          </FlipCoinButton>
        </div>
      )}
    </div>
  );
}
