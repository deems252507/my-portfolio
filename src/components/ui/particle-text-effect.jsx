import React, { useEffect, useRef } from "react";

/**
 * ParticleTextEffect — titik-titik kecil membentuk BOLA 3D yang berputar pelan, lalu
 * menyatu (tertarik) menjadi teks yang datar dan tajam, seperti di video referensi.
 * Teks, font, dan warna tetap mengikuti pengaturan admin. Ringan untuk HP.
 */
const hexToRgb = (hex, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (rgb, to, a) => rgb.map((v) => Math.round(v + (to - v) * a));

// titik bulat kecil dengan tepi lembut, dibuat sekali lalu dipakai ulang
function makeSprite(rgb) {
  const S = 32;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, `rgba(${rgb.join(",")},1)`);
  grad.addColorStop(0.55, `rgba(${rgb.join(",")},0.95)`);
  grad.addColorStop(1, `rgba(${rgb.join(",")},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
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
    const MAX = compact ? 3200 : 6500;
    const FOCAL = 900;
    const SPHERE_FRAMES = compact ? 55 : 70; // lama bola berputar sebelum menyatu jadi teks

    let cssW = 0, cssH = 0, raf = 0, frame = 0, lastT = 0;
    let n = 0, R = 200;
    let X, Y, Z, VX, VY, VZ, TX, TY, BX, BY, BZ, K, SP, SZ;
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

      // titik grid rapat (datar, 1 lapis) agar teks tajam & mudah dibaca
      let step = Math.max(2, Math.round(fs / 30));
      const sample = (shift) => {
        const arr = [];
        for (let y = shift; y < cssH; y += step)
          for (let x = shift; x < cssW; x += step) {
            const i = (Math.floor(y) * cssW + Math.floor(x)) * 4;
            if (px[i + 3] > 128) arr.push([x - cssW / 2, y - cssH / 2, px[i] > px[i + 1] ? 0 : 1]);
          }
        return arr;
      };
      let pts;
      for (let tries = 0; tries < 14; tries++) {
        pts = sample(0).concat(sample(step / 2));
        if (pts.length <= MAX) break;
        step += 1;
      }

      sprites = [c1, c2].map(makeSprite);
      n = pts.length;
      X = new Float32Array(n); Y = new Float32Array(n); Z = new Float32Array(n);
      VX = new Float32Array(n); VY = new Float32Array(n); VZ = new Float32Array(n);
      TX = new Float32Array(n); TY = new Float32Array(n);
      BX = new Float32Array(n); BY = new Float32Array(n); BZ = new Float32Array(n);
      K = new Float32Array(n); SP = new Uint8Array(n); SZ = new Float32Array(n);

      R = Math.min(cssW * 0.4, cssH * 0.5); // jari-jari bola
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const [px_, py_, ci] = pts[i];
        TX[i] = px_; TY[i] = py_;
        // titik tersebar merata di PERMUKAAN + isi bola (spiral Fibonacci), urutan diacak
        const j = (Math.random() * n) | 0;
        const yv = 1 - (2 * (j + 0.5)) / n;
        const rr = Math.sqrt(1 - yv * yv);
        const th = golden * j;
        const rad = R * (0.35 + 0.65 * Math.cbrt(Math.random()));
        BX[i] = Math.cos(th) * rr * rad * 1.25; // sedikit melebar seperti di video
        BY[i] = yv * rad;
        BZ[i] = Math.sin(th) * rr * rad;
        X[i] = BX[i]; Y[i] = BY[i]; Z[i] = BZ[i];
        K[i] = 0.035 + Math.random() * 0.045;
        SP[i] = ci;
        SZ[i] = Math.max(2.2, step * 1.25);
      }
      frame = 0;
    };

    const animate = (now) => {
      raf = requestAnimationFrame(animate);
      if (document.hidden) return;
      if (compact && now - lastT < 32) return; // HP: ±30fps agar hemat baterai/memori
      lastT = now;
      frame++;

      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, cssW, cssH);

      const cx0 = cssW / 2, cy0 = cssH / 2;
      const inSphere = frame < SPHERE_FRAMES;
      // bola berputar (yaw) pelan sambil sedikit mengempis sebelum menyatu jadi teks
      const spin = frame * 0.035;
      const cs = Math.cos(spin), sn = Math.sin(spin);
      const fade = Math.min(1, frame / 18);
      const shrink = 1 - 0.12 * Math.min(1, frame / SPHERE_FRAMES);

      for (let i = 0; i < n; i++) {
        let tx, ty, tz, k;
        if (inSphere) {
          // target = titik pada bola yang sedang berputar
          tx = (BX[i] * cs + BZ[i] * sn) * shrink;
          tz = (-BX[i] * sn + BZ[i] * cs) * shrink;
          ty = BY[i] * shrink;
          k = 0.12;
        } else {
          tx = TX[i]; ty = TY[i]; tz = 0; k = K[i];
        }
        VX[i] = (VX[i] + (tx - X[i]) * k) * 0.82;
        VY[i] = (VY[i] + (ty - Y[i]) * k) * 0.82;
        VZ[i] = (VZ[i] + (tz - Z[i]) * k) * 0.82;
        X[i] += VX[i]; Y[i] += VY[i]; Z[i] += VZ[i];

        const den = FOCAL - Z[i];
        if (den < 80) continue;
        const s = FOCAL / den;
        const size = SZ[i] * s * (inSphere ? 0.55 : 1);
        const sx = cx0 + X[i] * s;
        const sy = cy0 + Y[i] * s;
        if (sx < -size || sx > cssW + size || sy < -size || sy > cssH + size) continue;
        // titik jauh lebih redup, titik dekat lebih terang -> kesan bola 3D
        const depth = inSphere ? 0.35 + 0.65 * ((Z[i] / R + 1) / 2) : 1;
        ctx.globalAlpha = fade * Math.min(1, Math.max(0.15, depth));
        ctx.drawImage(sprites[SP[i]], sx - size / 2, sy - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
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
