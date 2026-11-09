import React, { useEffect, useRef } from "react";

/**
 * ParticleTextEffect — port dari komponen 21st.dev (KainXu), versi JSX untuk project Vite ini.
 *
 * Algoritma sama dengan aslinya: tiap partikel punya posisi/kecepatan, mengejar target dengan
 * "steering" (maxSpeed + maxForce), melambat saat dekat target (closeEnoughTarget), warna memudar
 * masuk (colorBlend), digambar sebagai titik 2x2, dan jejak (motion blur) dibuat dengan
 * memudarkan kanvas tiap frame. Partikel muncul dari luar layar lalu menyusun teks.
 *
 * Bedanya dengan aslinya:
 *  - kanvas memenuhi SELURUH layar (bukan kotak 1000x500) agar partikel datang dari tepi layar
 *    dan tidak ada kotak/pemotongan di sekeliling teks;
 *  - jejak dipudarkan dengan destination-out (bukan kotak hitam) sehingga latar petir tetap terlihat;
 *  - teks 2 baris dengan warna & font dari pengaturan admin; tanpa pergantian kata & tanpa UI demo.
 */
const hexToRgb = (hex, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixRgb = (rgb, to, a) => rgb.map((v) => Math.round(v + (to - v) * a));
const SHADES = [0, 0.16, 0.32, 0.5]; // variasi terang antar partikel

class Particle {
  constructor() {
    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this.tx = 0; this.ty = 0;
    this.closeEnough = 100;
    this.maxSpeed = 1;
    this.maxForce = 0.1;
    this.weight = 0;        // 0 -> 1 : warna/kecerahan memudar masuk
    this.blendRate = 0.01;
    this.bucket = 0;        // indeks warna (untuk mengurangi pergantian fillStyle)
  }

  move() {
    // makin dekat target, makin pelan
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const prox = dist < this.closeEnough ? dist / this.closeEnough : 1;

    let wx = 0, wy = 0;
    if (dist > 0) { wx = (dx / dist) * this.maxSpeed * prox; wy = (dy / dist) * this.maxSpeed * prox; }

    let sx = wx - this.vx, sy = wy - this.vy;
    const sm = Math.sqrt(sx * sx + sy * sy);
    if (sm > 0) { sx = (sx / sm) * this.maxForce; sy = (sy / sm) * this.maxForce; }

    this.vx += sx; this.vy += sy;
    this.x += this.vx; this.y += this.vy;
  }
}

function runEffect(canvas, anchor, o) {
  const compact = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);
  const fontStack = `"${o.fontFamily}", "Plus Jakarta Sans", Arial, sans-serif`;
  const base = [hexToRgb(o.color1, [255, 255, 255]), mixRgb(hexToRgb(o.color2, [37, 99, 235]), 255, 0.15)];
  const palette = base.flatMap((rgb) => SHADES.map((a) => `rgb(${mixRgb(rgb, 255, a).join(",")})`));
  const MAX = compact ? 3200 : 6000;

  let W = 0, H = 0, raf = 0, lastT = 0, particles = [];
  const PSIZE = compact ? 1.7 : 2;

  const build = () => {
    const cr = canvas.getBoundingClientRect();
    W = Math.max(Math.floor(cr.width), 260);
    H = Math.max(Math.floor(cr.height), 260);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);

    // area teks = kotak "anchor" (tengah-nya) di dalam kanvas layar penuh
    const ar = anchor.getBoundingClientRect();
    const aw = Math.max(ar.width, 240), ah = Math.max(ar.height, 160);
    const acx = ar.left - cr.left + ar.width / 2, acy = ar.top - cr.top + ar.height / 2;

    const lines = [{ text: o.line1, ci: 0 }];
    if (aw < 520 && /\s/.test(o.line2.trim())) o.line2.trim().split(/\s+/).forEach((w) => lines.push({ text: w, ci: 1 }));
    else lines.push({ text: o.line2, ci: 1 });

    const m = document.createElement("canvas").getContext("2d");
    const LH = 1.25;
    let fs = 220;
    const fits = (f) => {
      const f1 = f * 0.62;
      let maxW = 0;
      lines.forEach((l, i) => { m.font = `800 ${i === 0 ? f1 : f}px ${fontStack}`; maxW = Math.max(maxW, m.measureText(l.text).width); });
      return maxW <= aw * 0.86 && (f1 + (lines.length - 1) * f) * LH <= ah * 0.84;
    };
    while (fs > 14 && !fits(fs)) fs -= 2;

    // gambar teks di kanvas bayangan seukuran area teks, baca pikselnya
    const tw = Math.ceil(aw), th = Math.ceil(ah);
    const off = document.createElement("canvas");
    off.width = tw; off.height = th;
    const oc = off.getContext("2d", { willReadFrequently: true });
    oc.textAlign = "center"; oc.textBaseline = "middle";
    const hs = lines.map((_, i) => (i === 0 ? fs * 0.62 : fs) * LH);
    let yy = (th - hs.reduce((a, b) => a + b, 0)) / 2;
    lines.forEach((l, i) => {
      oc.font = `800 ${i === 0 ? fs * 0.62 : fs}px ${fontStack}`;
      oc.fillStyle = l.ci === 0 ? "rgb(255,0,0)" : "rgb(0,255,0)";
      oc.fillText(l.text, tw / 2, yy + hs[i] / 2);
      yy += hs[i];
    });
    const px = oc.getImageData(0, 0, tw, th).data;

    // seperti aslinya: setiap baris piksel disampel tiap `pixelSteps` piksel (offset acak per baris
    // -> tepi huruf "berdebu", bukan grid kotak). Jarak dinaikkan jika partikel terlalu banyak.
    let pixelSteps = Math.max(2, Math.round((fs / 100) * 5));
    let pts = [];
    for (let tries = 0; tries < 20; tries++) {
      pts = [];
      for (let y = 0; y < th; y++) {
        const start = Math.random() * pixelSteps;
        for (let x = start; x < tw; x += pixelSteps) {
          const i = (y * tw + Math.floor(x)) * 4;
          if (px[i + 3] > 0) pts.push([acx - tw / 2 + x, acy - th / 2 + y, px[i] > px[i + 1] ? 0 : 1]);
        }
      }
      if (pts.length <= MAX) break;
      pixelSteps += 1;
    }

    // acak urutan (gerak lebih cair) lalu kelompokkan per warna
    for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pts[i], pts[j]] = [pts[j], pts[i]]; }
    const items = pts.map((p) => ({ p, b: p[2] * SHADES.length + ((Math.random() * SHADES.length) | 0) })).sort((a, b) => a.b - b.b);

    // partikel muncul di lingkaran jauh di luar layar (arah acak), lalu terbang ke target
    const mag = (W + H) / 2;
    const speedScale = Math.max(1, mag / 520); // layar besar => jarak jauh => lebih cepat (tetap selesai ±2 detik)
    particles = items.map(({ p, b }) => {
      const q = new Particle();
      const a = Math.random() * Math.PI * 2;
      q.x = W / 2 + Math.cos(a) * mag;
      q.y = H / 2 + Math.sin(a) * mag;
      q.tx = p[0]; q.ty = p[1]; q.bucket = b;
      q.maxSpeed = (Math.random() * 6 + 4) * speedScale;
      q.maxForce = q.maxSpeed * 0.05;
      q.closeEnough = 100 * speedScale;
      q.blendRate = Math.random() * 0.0275 + 0.0025;
      return q;
    });
  };

  const animate = (now) => {
    raf = requestAnimationFrame(animate);
    if (document.hidden) return;
    const dtMs = lastT ? now - lastT : 16.7;
    if (compact && dtMs < 30) return; // HP: ±30fps
    lastT = now;
    const steps = Math.min(3, Math.max(1, Math.round(dtMs / 16.7)));

    const ctx = canvas.getContext("2d");
    // motion blur: pudarkan isi kanvas (tetap transparan)
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    let cur = -1;
    for (let i = 0; i < particles.length; i++) {
      const q = particles[i];
      for (let k = 0; k < steps; k++) q.move();
      if (q.weight < 1) q.weight = Math.min(1, q.weight + q.blendRate * steps);
      if (q.x < -2 || q.x > W + 2 || q.y < -2 || q.y > H + 2) continue;
      if (q.bucket !== cur) { cur = q.bucket; ctx.fillStyle = palette[cur]; }
      ctx.globalAlpha = q.weight;
      ctx.fillRect(q.x, q.y, PSIZE, PSIZE);
    }
    ctx.globalAlpha = 1;
  };

  build();
  raf = requestAnimationFrame(animate);
  let timer;
  const onResize = () => { clearTimeout(timer); timer = setTimeout(() => { build(); }, 150); };
  window.addEventListener("resize", onResize);
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    window.removeEventListener("resize", onResize);
  };
}

/**
 * Pasang di dalam wadah `relative`/`fixed` seukuran layar. `anchorRef` = elemen kosong yang
 * menandai di mana teks harus muncul (ukuran & posisinya dipakai untuk menaruh/menskala teks).
 */
export function ParticleTextEffect({
  anchorRef,
  line1 = "Welcome To My",
  line2 = "Portofolio Website",
  fontFamily = "Arial",
  color1 = "#ffffff",
  color2 = "#2563eb",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const anchor = anchorRef?.current;
    if (!canvas || !anchor) return;
    return runEffect(canvas, anchor, { line1, line2, fontFamily, color1, color2 });
  }, [anchorRef, line1, line2, fontFamily, color1, color2]);

  return (
    <div className="absolute inset-0 pointer-events-none z-10" aria-hidden>
      <span className="sr-only">{`${line1} ${line2}`}</span>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
}
