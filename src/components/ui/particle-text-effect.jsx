import React, { useEffect, useRef } from "react";

/**
 * ParticleTextEffect (basis: 21st.dev by KAINXU) — dirapikan untuk Welcome Screen:
 * - ukuran canvas mengikuti container + devicePixelRatio (tajam, tidak terpotong)
 * - titik diambil dari grid rata (bukan per baris) jadi huruf rapi, tidak bergaris
 * - kata berganti otomatis (baris 1 lalu baris 2) dan berhenti di kata terakhir
 * - zoom-in halus pada seluruh teks selama loading
 */
class Particle {
  constructor() {
    this.pos = { x: 0, y: 0 };
    this.vel = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.closeEnoughTarget = 100;
    this.maxSpeed = 1;
    this.maxForce = 0.1;
    this.size = 2.4;
    this.isKilled = false;
    this.startColor = { r: 0, g: 0, b: 0 };
    this.targetColor = { r: 0, g: 0, b: 0 };
    this.colorWeight = 0;
    this.colorBlendRate = 0.01;
  }

  move() {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const prox = dist < this.closeEnoughTarget ? dist / this.closeEnoughTarget : 1;

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
    if (this.colorWeight < 1) this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1);
    const w = this.colorWeight;
    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * w);
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * w);
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * w);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(this.pos.x, this.pos.y, this.size, this.size);
  }

  kill(width, height) {
    if (this.isKilled) return;
    const a = Math.random() * Math.PI * 2;
    const mag = Math.max(width, height) * 0.8;
    this.target.x = width / 2 + Math.cos(a) * mag;
    this.target.y = height / 2 + Math.sin(a) * mag;
    const w = this.colorWeight;
    this.startColor = {
      r: this.startColor.r + (this.targetColor.r - this.startColor.r) * w,
      g: this.startColor.g + (this.targetColor.g - this.startColor.g) * w,
      b: this.startColor.b + (this.targetColor.b - this.startColor.b) * w,
    };
    this.targetColor = { r: 0, g: 0, b: 0 };
    this.colorWeight = 0;
    this.isKilled = true;
  }
}

// warna cerah acak per kata (HSL → RGB) supaya tidak pernah kusam/gelap
function randomBrightColor() {
  const h = Math.random() * 360, s = 0.85, l = 0.62;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}

export function ParticleTextEffect({
  line1 = "Welcome To My",
  line2 = "Portofolio Website",
  fontFamily = "Arial",
  wordInterval = 2200,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const words = [line1, line2].filter(Boolean);
    const fontStack = `"${fontFamily}", "Plus Jakarta Sans", Arial, sans-serif`;
    const particles = [];
    let cssW = 0, cssH = 0, raf = 0, wordIndex = 0, lastSwitch = performance.now();

    const setWord = (word) => {
      const off = document.createElement("canvas");
      off.width = cssW;
      off.height = cssH;
      const octx = off.getContext("2d", { willReadFrequently: true });

      // ukuran font: sebesar mungkin (zoom-in) tapi tetap muat 90% lebar & 70% tinggi
      let fs = Math.min(cssH * 0.7, 160);
      octx.font = `bold ${fs}px ${fontStack}`;
      const tw = octx.measureText(word).width;
      if (tw > cssW * 0.9) fs *= (cssW * 0.9) / tw;

      octx.fillStyle = "#fff";
      octx.font = `bold ${fs}px ${fontStack}`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText(word, cssW / 2, cssH / 2);

      const px = octx.getImageData(0, 0, cssW, cssH).data;
      const step = Math.max(3, Math.round(fs / 20)); // jarak titik grid (px)
      const size = Math.max(2, step * 0.62);
      const color = randomBrightColor();

      const coords = [];
      for (let y = 0; y < cssH; y += step) {
        for (let x = 0; x < cssW; x += step) {
          if (px[(y * cssW + x) * 4 + 3] > 128) coords.push([x, y]);
        }
      }
      for (let i = coords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coords[i], coords[j]] = [coords[j], coords[i]];
      }

      let pi = 0;
      for (const [x, y] of coords) {
        let p;
        if (pi < particles.length) {
          p = particles[pi++];
          p.isKilled = false;
        } else {
          p = new Particle();
          const a = Math.random() * Math.PI * 2;
          const mag = Math.max(cssW, cssH) * (0.5 + Math.random() * 0.4);
          p.pos.x = cssW / 2 + Math.cos(a) * mag;
          p.pos.y = cssH / 2 + Math.sin(a) * mag;
          p.maxSpeed = Math.random() * 4 + 5;
          p.maxForce = p.maxSpeed * 0.06;
          p.colorBlendRate = Math.random() * 0.0275 + 0.0125;
          particles.push(p);
        }
        p.size = size;
        const w = p.colorWeight;
        p.startColor = {
          r: p.startColor.r + (p.targetColor.r - p.startColor.r) * w,
          g: p.startColor.g + (p.targetColor.g - p.startColor.g) * w,
          b: p.startColor.b + (p.targetColor.b - p.startColor.b) * w,
        };
        p.targetColor = color;
        p.colorWeight = 0;
        p.target.x = x;
        p.target.y = y;
      }
      for (let i = pi; i < particles.length; i++) particles[i].kill(cssW, cssH);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = Math.max(Math.floor(wrap.clientWidth), 280);
      cssH = Math.max(Math.floor(wrap.clientHeight), 160);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
      setWord(words[wordIndex]);
    };

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      if (document.hidden) return;
      const ctx = canvas.getContext("2d");

      // jejak gerak halus (motion blur) tanpa menutup latar petir di belakang
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.globalCompositeOperation = "source-over";

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.move();
        p.draw(ctx);
        if (p.isKilled && (p.pos.x < -20 || p.pos.x > cssW + 20 || p.pos.y < -20 || p.pos.y > cssH + 20)) {
          particles.splice(i, 1);
        }
      }

      if (wordIndex < words.length - 1 && now - lastSwitch > wordInterval) {
        wordIndex++;
        lastSwitch = now;
        setWord(words[wordIndex]);
      }
    };

    resize();
    raf = requestAnimationFrame(animate);

    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(resize, 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [line1, line2, fontFamily, wordInterval]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10 flex items-center justify-center">
      <div
        ref={wrapRef}
        className="w-full h-full"
        style={{
          transform: "scale(1.0)",
          animation: "particleZoomIn 6s cubic-bezier(0.22,1,0.36,1) forwards",
        }}
      >
        <canvas ref={canvasRef} className="block mx-auto" />
      </div>
      <style>{`@keyframes particleZoomIn{from{transform:scale(0.82)}to{transform:scale(1.06)}}`}</style>
    </div>
  );
}
