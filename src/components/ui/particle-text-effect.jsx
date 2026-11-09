import React, { useEffect, useRef } from "react";

/**
 * ParticleTextEffect 3D — partikel BOLA bercahaya yang terbang dari kejauhan (zoom-in)
 * lalu menyusun huruf BERVOLUME (beberapa lapis kedalaman = tebal/extrude), dengan
 * perspektif nyata, bayangan tiap bola, dan huruf yang berayun pelan (yaw/pitch) sehingga
 * efek 3D terlihat jelas. Sisi depan dibuat rapat agar tetap mudah dibaca.
 * Teks, font, dan warna tetap mengikuti pengaturan admin. Ringan untuk HP.
 */
const hexToRgb = (hex, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (rgb, to, a) => rgb.map((v) => Math.round(v + (to - v) * a));

// bola 3D (highlight kiri-atas, sisi gelap kanan-bawah) dibuat sekali, dipakai ulang
function makeSprite(rgb, shade) {
  const S = 48;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const base = mix(rgb, 0, 1 - shade);
  const hi = mix(base, 255, 0.55);
  const lo = mix(base, 0, 0.55);
  const grad = g.createRadialGradient(S * 0.36, S * 0.32, S * 0.04, S / 2, S / 2, S / 2);
  grad.addColorStop(0, `rgb(${hi.join(",")})`);
  grad.addColorStop(0.45, `rgb(${base.join(",")})`);
  grad.addColorStop(1, `rgb(${lo.join(",")})`);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
  g.fill();
  return c;
}

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
    const c2 = mix(hexToRgb(color2, [37, 99, 235]), 255, 0.2);
    const LAYERS = compact ? 3 : 6;
    const MAX = compact ? 4200 : 8000;
    const FOCAL = 1100;

    let cssW = 0, cssH = 0, raf = 0, frame = 0, lastT = 0;
    let n = 0;
    let X, Y, Z, VX, VY, VZ, TX, TY, TZ, K, SP, SZ;
    let sprites = [];

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

      // titik grid; sisi depan dibuat 2 lapis bergeser setengah langkah agar rapat & mudah dibaca.
      // Jarak grid dinaikkan bila partikel terlalu banyak (HP).
      let step = Math.max(3, Math.round(fs / 20));
      const sample = (off) => {
        const arr = [];
        for (let y = off; y < cssH; y += step)
          for (let x = off; x < cssW; x += step) {
            const i = (Math.floor(y) * cssW + Math.floor(x)) * 4;
            if (px[i + 3] > 128) arr.push([x - cssW / 2, y - cssH / 2, px[i] > px[i + 1] ? 0 : 1]);
          }
        return arr;
      };
      let p0, p1;
      for (let tries = 0; tries < 10; tries++) {
        p0 = sample(0);
        p1 = sample(step / 2);
        if (p0.length * (LAYERS - 1) + p1.length <= MAX) break;
        step += 1;
      }

      sprites = [c1, c2].map((rgb) => Array.from({ length: LAYERS }, (_, l) => makeSprite(rgb, 1 - (l / (LAYERS - 1)) * 0.62)));

      const depth = fs * 0.26; // ketebalan huruf
      n = p0.length * (LAYERS - 1) + p1.length;
      X = new Float32Array(n); Y = new Float32Array(n); Z = new Float32Array(n);
      VX = new Float32Array(n); VY = new Float32Array(n); VZ = new Float32Array(n);
      TX = new Float32Array(n); TY = new Float32Array(n); TZ = new Float32Array(n);
      K = new Float32Array(n); SP = new Uint8Array(n); SZ = new Float32Array(n);

      // lapis paling belakang digambar dulu (urutan array = urutan gambar)
      let idx = 0;
      const put = (list, l, z, sizeMul) => {
        for (const [px_, py_, ci] of list) {
          TX[idx] = px_; TY[idx] = py_; TZ[idx] = z;
          const a = Math.random() * Math.PI * 2;
          const r = Math.max(cssW, cssH) * (0.5 + Math.random() * 0.7);
          X[idx] = Math.cos(a) * r; Y[idx] = Math.sin(a) * r * 0.7; Z[idx] = -500 - Math.random() * 900; // datang dari jauh
          K[idx] = 0.028 + Math.random() * 0.03;
          SP[idx] = ci * LAYERS + l;
          SZ[idx] = step * sizeMul;
          idx++;
        }
      };
      for (let l = LAYERS - 1; l >= 1; l--) {
        const z = depth / 2 - (l / (LAYERS - 1)) * depth;
        put(p0, l, z, 1.45);
      }
      put(p1, 0, depth / 2 + 1, 1.7); // sisi depan (lapis pengisi, paling atas)
      frame = 0;
    };

    const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      if (document.hidden) return;
      if (compact && now - lastT < 32) return; // HP: ±30fps agar hemat baterai/memori
      lastT = now;
      frame++;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, cssW, cssH);

      // kamera: zoom-in dari jauh + ayunan 3D (yaw besar di awal, lalu berayun pelan)
      const settle = ease(frame / 120);
      const t = frame / 60;
      const yaw = Math.sin(t * 0.7) * 0.17 * settle + (1 - settle) * 0.9;
      const pitch = Math.sin(t * 0.5) * 0.05 * settle + (1 - settle) * -0.18;
      const camScale = 0.6 + 0.4 * ease(frame / 110);
      const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const cx0 = cssW / 2, cy0 = cssH / 2;

      for (let i = 0; i < n; i++) {
        // gerak pegas menuju target (halus, tiap partikel beda kecepatan)
        VX[i] = (VX[i] + (TX[i] - X[i]) * K[i]) * 0.86;
        VY[i] = (VY[i] + (TY[i] - Y[i]) * K[i]) * 0.86;
        VZ[i] = (VZ[i] + (TZ[i] - Z[i]) * K[i]) * 0.86;
        X[i] += VX[i]; Y[i] += VY[i]; Z[i] += VZ[i];

        const xr = X[i] * cy_ + Z[i] * sy_;
        const zr = -X[i] * sy_ + Z[i] * cy_;
        const yr = Y[i] * cp - zr * sp;
        const zr2 = Y[i] * sp + zr * cp;
        const den = FOCAL - zr2;
        if (den < 80) continue;
        const s = (FOCAL / den) * camScale;
        const size = SZ[i] * s;
        const sx = cx0 + xr * s;
        const sy = cy0 + yr * s;
        if (sx < -size || sx > cssW + size || sy < -size || sy > cssH + size) continue;
        const spr = sprites[(SP[i] / LAYERS) | 0][SP[i] % LAYERS];
        ctx.drawImage(spr, sx - size / 2, sy - size / 2, size, size);
      }
    };

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
