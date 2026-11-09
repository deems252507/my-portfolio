import React, { useEffect, useRef } from "react";

/**
 * ParticleTextEffect (basis 21st.dev / KAINXU) — versi Welcome Screen:
 * - SELURUH kalimat tampil sekaligus ("Welcome To My" + "Portofolio Website"), bukan ganti-ganti kata
 * - partikel berkumpul membentuk huruf (grid rata, rapi), lalu teks tajam muncul di atasnya
 *   sehingga hasil akhirnya JELAS dan mudah dibaca
 * - zoom-in halus, ukuran mengikuti layar (HP: baris panjang dipecah agar huruf lebih besar)
 * - ringan untuk HP (DPR dibatasi, jumlah partikel dibatasi)
 */
class Particle {
  constructor() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.maxSpeed = 1;
    this.maxForce = 0.1;
    this.size = 2.4;
    this.color = "255,255,255";
  }
  move() {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const prox = dist < 100 ? dist / 100 : 1;
    let tx = 0, ty = 0;
    if (dist > 0) {
      tx = (dx / dist) * this.maxSpeed * prox;
      ty = (dy / dist) * this.maxSpeed * prox;
    }
    let sx = tx - this.vel.x;
    let sy = ty - this.vel.y;
    const sm = Math.hypot(sx, sy);
    if (sm > 0) {
      sx = (sx / sm) * this.maxForce;
      sy = (sy / sm) * this.maxForce;
    }
    this.vel.x += sx;
    this.vel.y += sy;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
  }
  draw(ctx) {
    ctx.fillStyle = `rgb(${this.color})`;
    ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);
  }
}

const hexToRgb = (hex, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lighten = (rgb, amt) => rgb.map((v) => Math.round(v + (255 - v) * amt));

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
    const c1 = hexToRgb(color1, [255, 255, 255]);
    const c2 = lighten(hexToRgb(color2, [37, 99, 235]), 0.28); // sedikit lebih terang agar terbaca di latar gelap

    let cssW = 0, cssH = 0, raf = 0, frame = 0;
    let particles = [];
    let crisp = null;

    const build = () => {
      cssW = Math.max(Math.floor(wrap.clientWidth), 260);
      cssH = Math.max(Math.floor(wrap.clientHeight), 160);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);

      // susun baris: di layar sempit, baris ke-2 dipecah per kata supaya huruf bisa lebih besar
      const lines = [{ text: line1, color: c1 }];
      if (cssW < 520 && /\s/.test(line2.trim())) {
        line2.trim().split(/\s+/).forEach((w) => lines.push({ text: w, color: c2 }));
      } else {
        lines.push({ text: line2, color: c2 });
      }

      const measure = document.createElement("canvas").getContext("2d");
      const LH = 1.22;
      // ukuran font: sebesar mungkin, tetap muat 90% lebar & 88% tinggi (baris 1 sedikit lebih kecil)
      let fs = 220;
      const fits = (f) => {
        const f1 = f * 0.62;
        let maxW = 0;
        lines.forEach((l, i) => {
          measure.font = `800 ${i === 0 ? f1 : f}px ${fontStack}`;
          maxW = Math.max(maxW, measure.measureText(l.text).width);
        });
        const totalH = (f1 + (lines.length - 1) * f) * LH;
        return maxW <= cssW * 0.9 && totalH <= cssH * 0.88;
      };
      while (fs > 14 && !fits(fs)) fs -= 2;

      // gambar teks tajam (berwarna) ke canvas luar layar
      const off = document.createElement("canvas");
      off.width = cssW;
      off.height = cssH;
      const o = off.getContext("2d", { willReadFrequently: true });
      o.textAlign = "center";
      o.textBaseline = "middle";
      const heights = lines.map((_, i) => (i === 0 ? fs * 0.62 : fs) * LH);
      const totalH = heights.reduce((a, b) => a + b, 0);
      let y = (cssH - totalH) / 2;
      lines.forEach((l, i) => {
        const size = i === 0 ? fs * 0.62 : fs;
        o.font = `800 ${size}px ${fontStack}`;
        o.fillStyle = `rgb(${l.color.join(",")})`;
        o.fillText(l.text, cssW / 2, y + heights[i] / 2);
        y += heights[i];
      });
      crisp = off;

      // partikel dari grid rata
      const px = o.getImageData(0, 0, cssW, cssH).data;
      const step = Math.max(3, Math.round(fs / 17));
      const size = Math.max(2, step * 0.7);
      const coords = [];
      for (let yy = 0; yy < cssH; yy += step) {
        for (let xx = 0; xx < cssW; xx += step) {
          const i = (yy * cssW + xx) * 4;
          if (px[i + 3] > 128) coords.push([xx, yy, `${px[i]},${px[i + 1]},${px[i + 2]}`]);
        }
      }
      const maxCount = compact ? 3200 : 6500;
      let list = coords;
      if (coords.length > maxCount) {
        const k = coords.length / maxCount;
        list = Array.from({ length: maxCount }, (_, i) => coords[Math.floor(i * k)]);
      }

      particles = list.map(([tx, ty, col]) => {
        const p = new Particle();
        const a = Math.random() * Math.PI * 2;
        const mag = Math.max(cssW, cssH) * (0.45 + Math.random() * 0.45);
        p.pos.x = cssW / 2 + Math.cos(a) * mag;
        p.pos.y = cssH / 2 + Math.sin(a) * mag;
        p.target.x = tx;
        p.target.y = ty;
        p.maxSpeed = Math.random() * 4 + 6;
        p.maxForce = p.maxSpeed * 0.07;
        p.size = size;
        p.color = col;
        return p;
      });
      frame = 0;
    };

    const SOLID_START = 70;  // frame ketika teks tajam mulai muncul
    const SOLID_FADE = 50;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (document.hidden) return;
      const ctx = canvas.getContext("2d");
      frame++;

      const t = Math.min(1, Math.max(0, (frame - SOLID_START) / SOLID_FADE));
      // jejak gerak halus, tetap transparan agar latar petir terlihat
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = t > 0 ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.globalCompositeOperation = "source-over";

      ctx.globalAlpha = 1 - t * 0.9;
      for (const p of particles) {
        p.move();
        p.draw(ctx);
      }
      ctx.globalAlpha = 1;

      if (t > 0 && crisp) {
        ctx.save();
        ctx.globalAlpha = t;
        ctx.shadowColor = "rgba(0,0,0,0.65)";
        ctx.shadowBlur = 18;
        ctx.drawImage(crisp, 0, 0, cssW, cssH);
        ctx.restore();
      }
    };

    build();
    raf = requestAnimationFrame(animate);

    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [line1, line2, fontFamily, color1, color2]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10 flex items-center justify-center">
      {/* bayangan gelap lembut di belakang teks supaya mudah dibaca di atas petir */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, transparent 72%)" }}
      />
      <span className="sr-only">{`${line1} ${line2}`}</span>
      <div
        ref={wrapRef}
        className="relative w-full h-full"
        style={{ animation: "particleZoomIn 5s cubic-bezier(0.22,1,0.36,1) forwards" }}
      >
        <canvas ref={canvasRef} className="block mx-auto" aria-hidden />
      </div>
      <style>{`@keyframes particleZoomIn{from{transform:scale(0.8)}to{transform:scale(1.05)}}`}</style>
    </div>
  );
}
