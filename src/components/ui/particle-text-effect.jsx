import React, { useEffect, useRef } from "react";

/**
 * ParticleTextEffect (gaya 21st.dev) — ribuan partikel kecil terbang dari luar layar dengan
 * jejak panjang (streak), melambat saat mendekati target, lalu menyusun teks dan terus
 * "bergetar" halus. Teks, font, dan warna mengikuti pengaturan admin. Ringan untuk HP.
 * Kanvas transparan (jejak dibuat dengan destination-out) sehingga latar petir tetap terlihat.
 */
const hexToRgb = (hex, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (rgb, to, a) => rgb.map((v) => Math.round(v + (to - v) * a));
const SHADES = [0, 0.18, 0.36, 0.55]; // variasi terang tiap partikel (seperti di referensi)

export function ParticleTextEffect({
  line1 = "Welcome To My",
  line2 = "Portofolio Website",
  fontFamily = "Arial",
  color1 = "#ffffff",
  color2 = "#2563eb",
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const compact = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);
    const fontStack = `"${fontFamily}", "Plus Jakarta Sans", Arial, sans-serif`;
    const base = [hexToRgb(color1, [255, 255, 255]), mix(hexToRgb(color2, [37, 99, 235]), 255, 0.15)];
    const palette = base.flatMap((rgb) => SHADES.map((a) => `rgb(${mix(rgb, 255, a).join(",")})`));
    const MAX = compact ? 3000 : 5500;

    let cssW = 0, cssH = 0, raf = 0, lastT = 0, closeEnough = 100;
    let n = 0;
    let X, Y, VX, VY, TX, TY, MS, MF, B;
    let size = 2;

    const build = () => {
      cssW = Math.max(Math.floor(wrap.clientWidth), 260);
      cssH = Math.max(Math.floor(wrap.clientHeight), 160);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);

      // susun baris (layar sempit: baris 2 dipecah per kata agar huruf lebih besar)
      const lines = [{ text: line1, ci: 0 }];
      if (cssW < 520 && /\s/.test(line2.trim())) line2.trim().split(/\s+/).forEach((w) => lines.push({ text: w, ci: 1 }));
      else lines.push({ text: line2, ci: 1 });

      const m = document.createElement("canvas").getContext("2d");
      const LH = 1.25;
      let fs = 220;
      const fits = (f) => {
        const f1 = f * 0.62;
        let maxW = 0;
        lines.forEach((l, i) => { m.font = `800 ${i === 0 ? f1 : f}px ${fontStack}`; maxW = Math.max(maxW, m.measureText(l.text).width); });
        return maxW <= cssW * 0.86 && (f1 + (lines.length - 1) * f) * LH <= cssH * 0.84;
      };
      while (fs > 14 && !fits(fs)) fs -= 2;

      // topeng teks (satu warna per baris -> indeks warna di kanal merah)
      const off = document.createElement("canvas");
      off.width = cssW; off.height = cssH;
      const o = off.getContext("2d", { willReadFrequently: true });
      o.textAlign = "center"; o.textBaseline = "middle";
      const hs = lines.map((_, i) => (i === 0 ? fs * 0.62 : fs) * LH);
      let yy = (cssH - hs.reduce((a, b) => a + b, 0)) / 2;
      lines.forEach((l, i) => {
        o.font = `800 ${i === 0 ? fs * 0.62 : fs}px ${fontStack}`;
        o.fillStyle = l.ci === 0 ? "rgb(255,0,0)" : "rgb(0,255,0)";
        o.fillText(l.text, cssW / 2, yy + hs[i] / 2);
        yy += hs[i];
      });
      const px = o.getImageData(0, 0, cssW, cssH).data;

      // titik target: grid rapat + sedikit acak supaya tepi huruf "berdebu" seperti referensi
      let step = Math.max(2, fs / 34);
      let pts = [];
      for (let tries = 0; tries < 16; tries++) {
        pts = [];
        for (let y = 0; y < cssH; y += step)
          for (let x = 0; x < cssW; x += step) {
            const i = (Math.floor(y) * cssW + Math.floor(x)) * 4;
            if (px[i + 3] > 128) pts.push([x - cssW / 2 + (Math.random() - 0.5) * step * 0.5, y - cssH / 2 + (Math.random() - 0.5) * step * 0.5, px[i] > px[i + 1] ? 0 : 1]);
          }
        if (pts.length <= MAX) break;
        step *= 1.1;
      }
      size = Math.max(1.5, Math.min(3, step * 0.8));
      closeEnough = Math.max(70, cssW * 0.12);

      // kelompokkan per warna/shade -> fillStyle jarang berganti saat menggambar
      const sc = Math.max(0.6, Math.min(1.25, cssW / 1000));
      pts = pts.map((p) => ({ p, b: p[2] * SHADES.length + ((Math.random() * SHADES.length) | 0) })).sort((a, b) => a.b - b.b);
      n = pts.length;
      X = new Float32Array(n); Y = new Float32Array(n); VX = new Float32Array(n); VY = new Float32Array(n);
      TX = new Float32Array(n); TY = new Float32Array(n); MS = new Float32Array(n); MF = new Float32Array(n); B = new Uint8Array(n);
      const reach = Math.hypot(cssW, cssH) * 0.62;
      for (let i = 0; i < n; i++) {
        TX[i] = pts[i].p[0]; TY[i] = pts[i].p[1]; B[i] = pts[i].b;
        // muncul dari luar area, arah acak ke segala penjuru (streak dari tepi)
        const a = Math.random() * Math.PI * 2, r = reach * (0.75 + Math.random() * 0.5);
        X[i] = Math.cos(a) * r; Y[i] = Math.sin(a) * r * 0.75;
        MS[i] = (Math.random() * 6 + 4) * sc;
        MF[i] = MS[i] * 0.05;
      }
    };

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      if (document.hidden) return;
      const dtMs = lastT ? now - lastT : 16.7;
      if (compact && dtMs < 30) return; // HP: ±30fps agar hemat baterai/memori
      lastT = now;
      const steps = Math.min(3, Math.max(1, Math.round(dtMs / 16.7))); // kecepatan sama di 30/60/120fps

      const ctx = canvas.getContext("2d");
      // jejak: pudarkan isi kanvas sedikit demi sedikit (tetap transparan)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.globalCompositeOperation = "source-over";

      const cx0 = cssW / 2, cy0 = cssH / 2;
      let cur = -1;
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < steps; k++) {
          // "arrive": makin dekat target makin pelan
          let dx = TX[i] - X[i], dy = TY[i] - Y[i];
          const d = Math.hypot(dx, dy) || 0.0001;
          const mult = d < closeEnough ? d / closeEnough : 1;
          const want = MS[i] * mult;
          let sx = (dx / d) * want - VX[i], sy = (dy / d) * want - VY[i];
          const sm = Math.hypot(sx, sy);
          if (sm > MF[i]) { sx = (sx / sm) * MF[i]; sy = (sy / sm) * MF[i]; }
          VX[i] += sx; VY[i] += sy;
          X[i] += VX[i]; Y[i] += VY[i];
        }
        // getar halus setelah sampai (teks terlihat "hidup")
        const jit = d0(TX[i] - X[i], TY[i] - Y[i]) < 3 ? 0.5 : 0;
        const x = cx0 + X[i] + (jit ? (Math.random() - 0.5) * jit : 0);
        const y = cy0 + Y[i] + (jit ? (Math.random() - 0.5) * jit : 0);
        if (x < -4 || x > cssW + 4 || y < -4 || y > cssH + 4) continue;
        if (B[i] !== cur) { cur = B[i]; ctx.fillStyle = palette[cur]; }
        ctx.fillRect(x, y, size, size);
      }
    };
    const d0 = (a, b) => Math.hypot(a, b);

    build();
    raf = requestAnimationFrame(animate);

    let timer;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(build, 150); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [line1, line2, fontFamily, color1, color2]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10 flex items-center justify-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 45%, transparent 72%)" }}
      />
      <span className="sr-only">{`${line1} ${line2}`}</span>
      <div ref={wrapRef} className="relative w-full h-full">
        <canvas ref={canvasRef} className="block mx-auto" aria-hidden />
      </div>
    </div>
  );
}
