/**
 * Particle Text Engine — mesin intro sinematik 3D (Canvas 2D + proyeksi perspektif manual).
 *
 * Ini BUKAN sekadar CSS scale. Seluruh adegan hidup di ruang 3D sungguhan:
 *   - tiap partikel punya posisi (x, y, z) + kecepatan, dirender lewat kamera perspektif
 *     (focal length, jarak kamera `d`, orbit yaw/pitch, roll kecil);
 *   - teks berupa objek ber-ketebalan (extrude): beberapa lapis huruf di kedalaman Z berbeda,
 *     diproyeksikan terpisah sehingga paralaks & sisi tebalnya terlihat saat kamera bergerak/dolly;
 *   - partikel berada di depan DAN di belakang teks (urutan gambar: belakang -> teks -> depan);
 *   - depth of field: lingkaran kabur (circle of confusion) dihitung dari jarak ke bidang fokus;
 *   - pencahayaan volumetrik: berkas cahaya (god rays) + inti cahaya di belakang teks,
 *     halo glow, bayangan jatuh ke "dinding" di belakang teks (ikut paralaks), vignette;
 *   - kamera: dolly-in halus saat intro, sedikit orbit saat teks terbentuk, lalu dolly zoom
 *     kuat MENEMBUS ruang ke arah teks setelah ditahan beberapa saat.
 *
 * Semua gerakan berbasis waktu (bukan jumlah frame) sehingga sama mulusnya di 30/60/120 fps.
 */

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const hexToRgb = (hex, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixRgb = (rgb, to, a) => rgb.map((v) => Math.round(v + (to - v) * a));
const rgbStr = (rgb, a = 1) => (a === 1 ? `rgb(${rgb.join(",")})` : `rgba(${rgb.join(",")},${a})`);
const SHADES = [0, 0.18, 0.4];

const makeCanvas = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
};

export function createParticleTextEngine(canvas, anchor, init = {}) {
  const ctx = canvas.getContext("2d");
  const compact = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);

  const MAX_TEXT = compact ? 2800 : 5400;
  const N_AMBIENT = compact ? 240 : 680;
  const MAX_LAYERS = compact ? 6 : 11;

  let opts = { line1: "Welcome to", line2: "My Portfolio", fontFamily: "Arial", color1: "#ffffff", color2: "#2563eb", ...init };
  let totalMs = init.totalMs || 6000;
  let onPhase = init.onPhase || null;

  /* ───────── state ───────── */
  let W = 0, H = 0, cx = 0, cy = 0, aw = 0, ah = 0;
  let d0 = 1000;          // focal length = jarak kamera awal (skala 1 pada bidang teks z=0)
  let NT = 0, N = 0;
  let px, py, pz, vx, vy, vz, tx, ty, tz, dly, app, omg, sz, ph1, ph2;
  let bk;
  let ox, oy, orad, oa, oc, og;
  let lines = [], fs = 100, thick = 20, blockW = 0, blockH = 0;
  let palette = [], sprites = [];
  let glowCv = null, shadowCv = null, vignetteCv = null, raysCv = null, coreCv = null;
  let layerFills = [], frontGrad = [], rimColors = [];
  let textA = 0, arrivedFrac = 0, ema = 1 / 60, lowFx = false, frames = 0;
  let phaseSent = { zoom: false, exit: false };
  let raf = 0, t0 = 0, lastNow = 0, lastT = 0, destroyed = false;
  let theta = 0, phi = 0, camD = 1000, camX = 0, camY = 0, roll = 0, focusZ = 0, zoomP = 0;

  const timeline = () => {
    const T = totalMs / 1000;
    const zs = T - 1.25;
    return { exit: T, zs, ze: T + 0.7, formEnd: Math.min(3.3, zs - 0.9) };
  };

  /* ───────── sprite & lighting textures ───────── */
  const buildPalette = () => {
    const c1 = hexToRgb(opts.color1, [255, 255, 255]);
    const c2 = mixRgb(hexToRgb(opts.color2, [37, 99, 235]), 255, 0.2);
    const base = [c1, c2];
    palette = base.flatMap((rgb) => SHADES.map((a) => rgbStr(mixRgb(rgb, 255, a))));
    sprites = base.flatMap((rgb) =>
      SHADES.map((a) => {
        const col = mixRgb(rgb, 255, a);
        const c = makeCanvas(64, 64);
        const g = c.getContext("2d");
        const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, rgbStr(col, 1));
        gr.addColorStop(0.28, rgbStr(col, 0.65));
        gr.addColorStop(0.65, rgbStr(col, 0.16));
        gr.addColorStop(1, rgbStr(col, 0));
        g.fillStyle = gr;
        g.fillRect(0, 0, 64, 64);
        return c;
      })
    );
  };

  const buildLightTextures = () => {
    const accent = mixRgb(hexToRgb(opts.color2, [37, 99, 235]), 255, 0.45);
    // berkas cahaya volumetrik (god rays)
    const S = compact ? 384 : 640;
    raysCv = makeCanvas(S, S);
    const g = raysCv.getContext("2d");
    g.translate(S / 2, S / 2);
    try { g.filter = `blur(${compact ? 2 : 4}px)`; } catch (e) { /* Safari lama */ }
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const ang = rnd() * TAU, w = 0.012 + rnd() * 0.06;
      g.fillStyle = rgbStr(accent, 0.04 + rnd() * 0.08);
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, S / 2, ang - w, ang + w); g.closePath(); g.fill();
    }
    g.filter = "none";
    g.globalCompositeOperation = "destination-in";
    const mask = g.createRadialGradient(0, 0, 0, 0, 0, S / 2);
    mask.addColorStop(0, "rgba(0,0,0,1)");
    mask.addColorStop(0.5, "rgba(0,0,0,0.55)");
    mask.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = mask;
    g.fillRect(-S / 2, -S / 2, S, S);

    // inti cahaya lembut di belakang teks
    coreCv = makeCanvas(256, 256);
    const k = coreCv.getContext("2d");
    const kg = k.createRadialGradient(128, 128, 0, 128, 128, 128);
    kg.addColorStop(0, rgbStr(accent, 0.55));
    kg.addColorStop(0.35, rgbStr(accent, 0.2));
    kg.addColorStop(1, rgbStr(accent, 0));
    k.fillStyle = kg;
    k.fillRect(0, 0, 256, 256);
  };

  const buildVignette = () => {
    vignetteCv = makeCanvas(Math.ceil(W / 2), Math.ceil(H / 2));
    const g = vignetteCv.getContext("2d");
    const w = vignetteCv.width, h = vignetteCv.height;
    const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    gr.addColorStop(0, "rgba(2,3,12,0)");
    gr.addColorStop(1, "rgba(2,3,12,0.62)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  };

  /* ───────── layout teks + titik target ───────── */
  const build = (tNow) => {
    const cr = canvas.getBoundingClientRect();
    W = Math.max(Math.floor(cr.width), 260);
    H = Math.max(Math.floor(cr.height), 260);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    const ar = anchor.getBoundingClientRect();
    aw = Math.max(ar.width, 240);
    ah = Math.max(ar.height, 160);
    cx = ar.left - cr.left + ar.width / 2;
    cy = ar.top - cr.top + ar.height / 2;
    d0 = clamp(Math.max(W, H) * 0.95, 760, 1300);

    const fontStack = `"${opts.fontFamily}", "Plus Jakarta Sans", Arial, sans-serif`;
    const l1 = String(opts.line1 || "").trim();
    const l2 = String(opts.line2 || "").trim();
    const src = [];
    if (l1) src.push({ text: l1, ci: 0, k: 0.62 });
    if (aw < 520 && /\s/.test(l2)) l2.split(/\s+/).forEach((w) => src.push({ text: w, ci: 1, k: 1 }));
    else if (l2) src.push({ text: l2, ci: 1, k: 1 });

    const m = document.createElement("canvas").getContext("2d");
    const LH = 1.22;
    let f = 220;
    const fits = (ff) => {
      let maxW = 0, totalH = 0;
      src.forEach((l) => {
        m.font = `800 ${ff * l.k}px ${fontStack}`;
        maxW = Math.max(maxW, m.measureText(l.text).width);
        totalH += ff * l.k * LH;
      });
      return maxW <= aw * 0.86 && totalH <= ah * 0.84;
    };
    while (f > 14 && !fits(f)) f -= 2;
    fs = f;
    thick = clamp(fs * 0.26, 8, 40);

    let totalH = 0;
    src.forEach((l) => { l.size = fs * l.k; l.h = l.size * LH; totalH += l.h; });
    let yy = -totalH / 2;
    blockW = 0;
    src.forEach((l) => {
      l.y = yy + l.h / 2; yy += l.h;
      m.font = `800 ${l.size}px ${fontStack}`;
      l.w = m.measureText(l.text).width;
      blockW = Math.max(blockW, l.w);
    });
    blockH = totalH;
    lines = src;
    const col = [opts.color1 || "#ffffff", opts.color2 || "#2563eb"];

    // mask piksel untuk sampling
    const tw = Math.ceil(aw), th = Math.ceil(ah);
    const off = makeCanvas(tw, th);
    const oc2 = off.getContext("2d", { willReadFrequently: true });
    oc2.textAlign = "center"; oc2.textBaseline = "middle"; oc2.fillStyle = "#fff";
    lines.forEach((l) => { oc2.font = `800 ${l.size}px ${fontStack}`; oc2.fillText(l.text, tw / 2, th / 2 + l.y); });
    const data = oc2.getImageData(0, 0, tw, th).data;
    const filled = (x, y) => x >= 0 && y >= 0 && x < tw && y < th && data[(y * tw + x) * 4 + 3] > 110;
    // baris mana milik warna mana (untuk pewarnaan partikel)
    const ciAt = (y) => {
      let best = 0, bd = 1e9;
      lines.forEach((l) => { const dd = Math.abs(th / 2 + l.y - y); if (dd < bd) { bd = dd; best = l.ci; } });
      return best;
    };

    // interior: grid ber-jitter; tepi huruf: dua kali lebih rapat agar bentuk huruf presisi & terbaca
    let step = Math.max(1.8, fs / 34);
    let pts = [];
    for (let tries = 0; tries < 24; tries++) {
      pts = [];
      for (let y = 0; y < th; y += step) {
        for (let x = 0; x < tw; x += step) {
          const jx = x + (Math.random() - 0.5) * step * 0.7, jy = y + (Math.random() - 0.5) * step * 0.7;
          const ix = Math.round(jx), iy = Math.round(jy);
          if (!filled(ix, iy)) continue;
          const edge = !filled(ix - 2, iy) || !filled(ix + 2, iy) || !filled(ix, iy - 2) || !filled(ix, iy + 2);
          pts.push([jx, jy, ciAt(iy), edge ? 1 : 0]);
        }
      }
      // tepi tambahan
      const es = step * 0.62;
      for (let y = 0; y < th; y += es) {
        for (let x = 0; x < tw; x += es) {
          const ix = Math.round(x), iy = Math.round(y);
          if (!filled(ix, iy)) continue;
          if (filled(ix - 2, iy) && filled(ix + 2, iy) && filled(ix, iy - 2) && filled(ix, iy + 2)) continue;
          pts.push([x + (Math.random() - 0.5) * es * 0.5, y + (Math.random() - 0.5) * es * 0.5, ciAt(iy), 1]);
        }
      }
      if (pts.length <= MAX_TEXT) break;
      step *= 1.12;
    }
    if (pts.length > MAX_TEXT) { // buang interior dulu, tepi dipertahankan
      pts.sort((a, b) => b[3] - a[3]);
      pts.length = MAX_TEXT;
    }

    buildPalette();
    buildLightTextures();
    buildVignette();

    // bitmap glow & bayangan (di-blur sekali, dipakai ulang tiap frame)
    const pad = Math.ceil(fs * 0.7);
    const gw = Math.ceil(blockW + pad * 2), gh = Math.ceil(blockH + pad * 2);
    const blurText = (color, blur, passes) => {
      const c = makeCanvas(gw, gh), g = c.getContext("2d");
      g.translate(gw / 2, gh / 2);
      g.textAlign = "center"; g.textBaseline = "middle";
      g.shadowBlur = blur; g.shadowOffsetX = 6000;
      for (let p = 0; p < passes; p++) lines.forEach((l) => {
        g.font = `800 ${l.size}px ${fontStack}`;
        g.shadowColor = typeof color === "function" ? color(l) : color;
        g.fillText(l.text, -6000, l.y);
      });
      return c;
    };
    glowCv = blurText((l) => col[l.ci], Math.max(8, fs * 0.34), 2);
    shadowCv = blurText("rgba(0,0,10,0.95)", Math.max(6, fs * 0.2), 2);

    // warna tiap lapis ekstrusi (belakang gelap -> depan terang) + gradien muka depan
    const nL = MAX_LAYERS;
    layerFills = []; frontGrad = []; rimColors = [];
    for (let li = 0; li < nL; li++) {
      const k = li / (nL - 1);
      layerFills.push(col.map((c) => rgbStr(mixRgb(hexToRgb(c, [255, 255, 255]), 0, 0.82 - k * 0.5))));
    }
    lines.forEach((l) => {
      const base = hexToRgb(col[l.ci], [255, 255, 255]);
      const g = ctx.createLinearGradient(0, l.y - l.size * 0.5, 0, l.y + l.size * 0.5);
      g.addColorStop(0, rgbStr(mixRgb(base, 255, 0.28)));
      g.addColorStop(0.5, rgbStr(base));
      g.addColorStop(1, rgbStr(mixRgb(base, 0, 0.2)));
      frontGrad.push(g);
      rimColors.push(rgbStr(mixRgb(base, 255, 0.6), 0.55));
    });

    // ── partikel: pertahankan state lama (tanpa lompatan) bila hanya teks/ukuran berubah ──
    const oldN = N, oldNT = NT;
    const old = oldN ? { px, py, pz, vx, vy, vz, dly, app, omg, sz, ph1, ph2 } : null;
    NT = pts.length;
    N = NT + N_AMBIENT;
    const F = (n) => new Float32Array(n);
    px = F(N); py = F(N); pz = F(N); vx = F(N); vy = F(N); vz = F(N);
    tx = F(N); ty = F(N); tz = F(N); dly = F(N); app = F(N); omg = F(N); sz = F(N); ph1 = F(N); ph2 = F(N);
    bk = new Uint8Array(N);
    ox = F(N); oy = F(N); orad = F(N); oa = F(N); oc = F(N); og = new Uint8Array(N);

    // urut per bucket warna (mengurangi pergantian fillStyle)
    const items = pts.map((p) => ({ p, b: p[2] * SHADES.length + (Math.random() < 0.55 ? 0 : 1 + ((Math.random() * (SHADES.length - 1)) | 0)) }));
    items.sort((a, b) => a.b - b.b);

    for (let i = 0; i < NT; i++) {
      const { p, b } = items[i];
      tx[i] = p[0] - tw / 2;
      ty[i] = p[1] - th / 2;
      tz[i] = thick / 2 + (Math.random() - 0.5) * 1.6;
      bk[i] = b;
      sz[i] = Math.random() < 0.1 ? 1.6 + Math.random() * 1.0 : 0.9 + Math.random() * 0.8;
      ph1[i] = Math.random() * TAU; ph2[i] = Math.random() * TAU;
      omg[i] = 5.2 + Math.random() * 3.2;
      if (old && i < oldNT) {
        px[i] = old.px[i]; py[i] = old.py[i]; pz[i] = old.pz[i];
        vx[i] = old.vx[i]; vy[i] = old.vy[i]; vz[i] = old.vz[i];
        dly[i] = old.dly[i]; app[i] = old.app[i];
      } else {
        // awan 3D di sekeliling teks: sebagian jauh di belakang, sebagian dekat kamera (depan)
        const a = Math.random() * TAU, rad = 0.3 + Math.random() * 0.75;
        px[i] = Math.cos(a) * W * 0.95 * rad;
        py[i] = Math.sin(a) * H * 0.7 * rad;
        pz[i] = -650 + Math.random() * 1050;
        const sp = 10 + Math.random() * 26;
        vx[i] = -Math.sin(a) * sp; vy[i] = Math.cos(a) * sp; vz[i] = (Math.random() - 0.5) * 20;
        const first = !old;
        // tiap partikel mulai bergerak di waktu berbeda -> teks tersusun bertahap seperti gelombang
        dly[i] = (first ? 0 : tNow) + 0.1 + Math.pow(Math.random(), 1.25) * 1.5 + Math.abs(tx[i]) / Math.max(blockW, 1) * 0.25;
        app[i] = (first ? 0 : tNow) + Math.random() * (first ? 1.0 : 0.4);
      }
    }
    // debu ambient: melayang permanen di berbagai kedalaman (parallax + bokeh)
    for (let j = 0; j < N_AMBIENT; j++) {
      const i = NT + j;
      tx[i] = (Math.random() - 0.5) * W * 1.7;
      ty[i] = (Math.random() - 0.5) * H * 1.5;
      tz[i] = -700 + Math.random() * 1100;
      sz[i] = Math.random() < 0.08 ? 3 + Math.random() * 4 : 0.7 + Math.random() * 1.3; // sebagian bokeh besar
      ph1[i] = Math.random() * TAU; ph2[i] = Math.random() * TAU;
      bk[i] = Math.random() < 0.5 ? 0 : 1 + ((Math.random() * (palette.length - 1)) | 0);
      app[i] = Math.random() * 1.6;
    }
  };

  /* ───────── kamera ───────── */
  const updateCamera = (t) => {
    const tl = timeline();
    const p = clamp((t - tl.zs) / (tl.ze - tl.zs), 0, 1);
    const e = easeInOutCubic(p);
    zoomP = p;
    const pre = easeOutCubic(clamp(t / tl.zs, 0, 1));
    const dPre = d0 * (1.13 - 0.17 * pre); // dolly-in halus selama intro
    const dEnd = d0 * (reduced ? 0.45 : 0.15); // dolly kuat mendekati objek
    camD = lerp(dPre, dEnd, e);

    // orbit: besar saat partikel berkumpul, kecil saat teks ditahan (agar tetap mudah dibaca)
    const A = lerp(1, 0.38, smooth(1.6, 3.4, t)) * (reduced ? 0.3 : 1) * (1 - e);
    theta = A * 0.17 * Math.sin(t * 0.55 + 0.6) - e * 0.2;
    phi = A * 0.055 * Math.sin(t * 0.43) + e * 0.04;

    // kamera bergeser menuju titik fokus di dalam teks selama zoom
    const fl = lines[lines.length - 1];
    camX = e * -blockW * 0.04;
    camY = e * (fl ? fl.y * 0.55 : 0);
    roll = e * -0.045 + A * 0.006 * Math.sin(t * 0.7);
    // rack focus: bidang fokus bergeser ke belakang teks saat kamera menembus ruang
    focusZ = lerp(0, -170, smooth(0.3, 1, p));
  };

  /* ───────── fisika ───────── */
  const physics = (dt, t) => {
    const tl = timeline();
    const boost = 1 + 2.2 * smooth(tl.formEnd, tl.formEnd + 1.0, t); // jaga-jaga bila tab sempat di-background
    for (let i = 0; i < NT; i++) {
      const s = smooth(0, 1, (t - dly[i]) / 1.0);
      const om = lerp(0.55, omg[i] * boost, s * s);
      const k = om * om, c = 2 * 0.82 * om;
      let ax = k * (tx[i] - px[i]) - c * vx[i];
      let ay = k * (ty[i] - py[i]) - c * vy[i];
      let az = k * (tz[i] - pz[i]) - c * vz[i];
      const free = 1 - s;
      if (free > 0.001) {
        // pusaran lembut mengitari poros Z + turbulensi organik, memudar saat partikel "terkunci"
        const r = Math.hypot(px[i], py[i]) + 1;
        const sw = 46 * free;
        ax += (-py[i] / r) * sw + Math.sin(t * 0.9 + ph1[i]) * 16 * free;
        ay += (px[i] / r) * sw + Math.cos(t * 0.7 + ph2[i]) * 16 * free;
        az += Math.sin(t * 0.6 + ph1[i] * 1.7) * 20 * free;
      }
      vx[i] += ax * dt; vy[i] += ay * dt; vz[i] += az * dt;
      const sp = Math.hypot(vx[i], vy[i], vz[i]);
      if (sp > 1500) { const q = 1500 / sp; vx[i] *= q; vy[i] *= q; vz[i] *= q; }
      px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
    }
  };

  /* ───────── gambar ───────── */
  const layerXform = (zl) => {
    const cth = Math.cos(theta), sth = Math.sin(theta), cph = Math.cos(phi), sph = Math.sin(phi);
    const x1 = zl * sth, z1 = zl * cth;
    const y1 = -z1 * sph, z2 = z1 * cph;
    const sc = d0 / Math.max(40, camD - z2);
    return { x: (x1 - camX) * sc, y: (y1 - camY) * sc, sx: sc * cth, sy: sc * cph, sc };
  };

  const drawGroup = (group) => {
    ctx.globalCompositeOperation = "lighter";
    let cur = -1;
    for (let i = 0; i < N; i++) {
      if (og[i] !== group) continue;
      const a = oa[i];
      if (a < 0.012) continue;
      const r = orad[i], c = oc[i], b = bk[i];
      if (c < 0.9 && r < 2.4) {
        if (b !== cur) { cur = b; ctx.fillStyle = palette[b]; }
        ctx.globalAlpha = a;
        const s = Math.max(1.15, r * 2);
        ctx.fillRect(ox[i] - s / 2, oy[i] - s / 2, s, s);
      } else {
        const R = (r + c) * 1.3;
        const k = r / (r + c + 0.001);
        ctx.globalAlpha = a * clamp(k * k * 1.5, 0.1, 1);
        ctx.drawImage(sprites[b], ox[i] - R, oy[i] - R, R * 2, R * 2);
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawText = (t, tl) => {
    if (textA < 0.003) return;
    const e = easeInOutCubic(zoomP);
    const nL = lowFx ? Math.ceil(MAX_LAYERS / 2) : MAX_LAYERS;
    const pulse = 0.9 + 0.1 * Math.sin(t * 1.7);

    // halo glow di belakang muka teks
    const hx = layerXform(-thick / 2 - 4);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = clamp(textA * (0.5 + 0.55 * e) * pulse, 0, 1);
    ctx.translate(hx.x, hx.y); ctx.scale(hx.sx, hx.sy);
    ctx.drawImage(glowCv, -glowCv.width / 2, -glowCv.height / 2);
    ctx.restore();

    // lapisan ekstrusi dari belakang ke depan (tiap lapis diproyeksikan di kedalamannya sendiri)
    ctx.globalCompositeOperation = "source-over";
    for (let li = 0; li < nL; li++) {
      const front = li === nL - 1;
      const zl = -thick / 2 + thick * (li / (nL - 1));
      const X = layerXform(zl);
      const fi = lowFx ? Math.round((li / (nL - 1)) * (MAX_LAYERS - 1)) : li;
      ctx.save();
      ctx.globalAlpha = front ? textA * lerp(1, 0.78, smooth(0.55, 1, zoomP)) : textA;
      ctx.translate(X.x, X.y); ctx.scale(X.sx, X.sy);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      lines.forEach((l, k) => {
        ctx.font = `800 ${l.size}px "${opts.fontFamily}", "Plus Jakarta Sans", Arial, sans-serif`;
        ctx.fillStyle = front ? frontGrad[k] : layerFills[fi][l.ci];
        ctx.fillText(l.text, 0, l.y);
        if (front) { // garis tepi tipis -> huruf tetap tegas & mudah dibaca
          ctx.lineWidth = Math.max(0.8, fs * 0.012);
          ctx.strokeStyle = rimColors[k];
          ctx.strokeText(l.text, 0, l.y);
        }
      });
      // kilau cahaya menyapu muka teks setelah terbentuk
      if (front) {
        const sw = smooth(tl.formEnd - 0.3, tl.formEnd + 1.5, t);
        const sweepA = Math.sin(clamp(sw, 0, 1) * Math.PI);
        if (sweepA > 0.01) {
          const sx = lerp(-blockW * 0.65, blockW * 0.65, sw);
          const g = ctx.createLinearGradient(sx - blockW * 0.12, -blockH / 2, sx + blockW * 0.12, blockH / 2);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(0.5, "rgba(255,255,255,0.7)");
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g;
          ctx.globalAlpha = textA * sweepA * 0.75;
          lines.forEach((l) => {
            ctx.font = `800 ${l.size}px "${opts.fontFamily}", "Plus Jakarta Sans", Arial, sans-serif`;
            ctx.fillText(l.text, 0, l.y);
          });
        }
      }
      ctx.restore();
    }
  };

  const drawLight = (t, tl) => {
    const e = easeInOutCubic(zoomP);
    const L = smooth(0.5, 2.6, t);
    // cahaya volumetrik: sumber di belakang-atas teks (z = -260) -> ikut paralaks kamera
    const cth = Math.cos(theta), sth = Math.sin(theta), cph = Math.cos(phi), sph = Math.sin(phi);
    const lx = 0, ly = -fs * 0.5, lz = -260;
    const x1 = lx * cth + lz * sth, z1 = -lx * sth + lz * cth;
    const y1 = ly * cph - z1 * sph, z2 = ly * sph + z1 * cph;
    const sc = d0 / Math.max(60, camD - z2);
    const sxp = (x1 - camX) * sc, syp = (y1 - camY) * sc;
    const size = Math.max(W, H) * 2.1 * sc;
    ctx.globalCompositeOperation = "lighter";
    if (!lowFx || !compact) {
      ctx.save();
      ctx.translate(sxp, syp);
      ctx.rotate(reduced ? 0 : t * 0.045);
      ctx.globalAlpha = clamp(0.2 * L * (1 + 1.2 * e), 0, 1);
      ctx.drawImage(raysCv, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    const cs = Math.max(blockW * 1.7, 420) * sc;
    ctx.globalAlpha = clamp(0.2 * L * (1 + 0.8 * e) * (0.92 + 0.08 * Math.sin(t * 1.3)), 0, 1);
    ctx.drawImage(coreCv, sxp - cs / 2, syp - cs / 2, cs, cs);
    ctx.globalAlpha = 1;
  };

  const drawShadow = () => {
    if (lowFx || textA < 0.02) return;
    const X = layerXform(-thick / 2 - 120);
    const lxo = 54 * X.sc, lyo = 72 * X.sc; // arah cahaya: dari kiri-atas depan -> bayangan jatuh ke kanan-bawah
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.62 * textA;
    ctx.translate(X.x + lxo, X.y + lyo); ctx.scale(X.sx, X.sy);
    ctx.drawImage(shadowCv, -shadowCv.width / 2, -shadowCv.height / 2);
    ctx.restore();
  };

  const frame = (t, dtReal) => {
    if (destroyed || !N) return;
    const tl = timeline();
    frames++;
    ema = ema * 0.92 + dtReal * 0.08;
    if (frames > 45 && ema > 0.027 && !lowFx) lowFx = true;

    // fisika: sub-step stabil
    let rem = Math.min(dtReal, 0.12), tt = t - rem;
    while (rem > 1e-5) { const h = Math.min(rem, 1 / 50); tt += h; physics(h, tt); rem -= h; }

    updateCamera(t);
    const cth = Math.cos(theta), sth = Math.sin(theta), cph = Math.cos(phi), sph = Math.sin(phi);
    const f = d0, K = d0 * 0.019;
    const dzf = Math.max(60, camD - focusZ);
    const left = -cx - 90, right = W - cx + 90, top = -cy - 90, bottom = H - cy + 90;
    const sceneA = smooth(0, 0.5, t);
    const zFront = thick / 2 - 6;
    let arrived = 0;

    for (let i = 0; i < N; i++) {
      let x, y, z, a;
      if (i < NT) {
        x = px[i]; y = py[i]; z = pz[i];
        const ex = tx[i] - x, ey = ty[i] - y;
        const settled = ex * ex + ey * ey < 6 && Math.abs(tz[i] - z) < 4;
        if (settled) arrived++;
        a = smooth(0, 0.9, t - app[i]);
        if (settled) { // partikel yang sudah di tempatnya: berkelip halus & meredup agar teks solid dominan
          a *= lerp(1, 0.3, textA) * (0.82 + 0.18 * Math.sin(t * 2.4 + ph1[i]));
          x += Math.sin(t * 3 + ph1[i]) * 0.25; y += Math.cos(t * 2.6 + ph2[i]) * 0.25;
        }
      } else {
        x = tx[i] + Math.sin(t * 0.21 + ph1[i]) * 55;
        y = ty[i] + Math.cos(t * 0.17 + ph2[i]) * 42;
        z = tz[i] + Math.sin(t * 0.13 + ph1[i] * 2) * 80;
        a = smooth(0, 1.4, t - app[i]) * 0.75;
      }
      const x1 = x * cth + z * sth, z1 = -x * sth + z * cth;
      const y1 = y * cph - z1 * sph, z2 = y * sph + z1 * cph;
      const dz = camD - z2;
      if (dz < 30) { og[i] = 0; continue; }
      const sc = f / dz;
      const sx = (x1 - camX) * sc, sy = (y1 - camY) * sc;
      const r = Math.min(70, sz[i] * sc);
      const coc = K * Math.abs(dz - dzf) / dz;
      const reach = r + coc * 1.4;
      if (sx < left - reach || sx > right + reach || sy < top - reach || sy > bottom + reach) { og[i] = 0; continue; }
      // memudar halus dekat lensa & di kejauhan (tidak ada partikel yang "pop")
      a *= smooth(30, 190, dz) * (1 - 0.55 * smooth(1500, 2600, dz)) * sceneA;
      ox[i] = sx; oy[i] = sy; orad[i] = r; oc[i] = coc; oa[i] = a;
      og[i] = z < zFront ? 1 : 2;
    }

    arrivedFrac = NT ? arrived / NT : 0;
    const target = Math.max(smooth(0.6, 0.94, arrivedFrac), smooth(tl.formEnd - 0.4, tl.formEnd + 0.5, t));
    textA += clamp(target - textA, -dtReal * 2, dtReal * 1.5);

    // ── render ──
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(cx, cy);
    ctx.rotate(roll);
    drawLight(t, tl);
    drawShadow();
    drawGroup(1);                 // partikel di BELAKANG teks
    drawText(t, tl);              // teks 3D berketebalan
    drawGroup(2);                 // partikel di DEPAN teks
    ctx.globalCompositeOperation = "lighter";

    // light wash saat kamera menembus teks -> menjembatani ke halaman utama
    const wash = smooth(0.5, 1, zoomP) * 0.2;
    if (wash > 0.003) {
      const wr = Math.max(W, H);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, wr * 0.9);
      const acc = mixRgb(hexToRgb(opts.color2, [37, 99, 235]), 255, 0.35);
      g.addColorStop(0, rgbStr(acc, wash));
      g.addColorStop(1, rgbStr(acc, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-wr, -wr, wr * 2, wr * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.rotate(-roll); ctx.translate(-cx, -cy);
    ctx.globalAlpha = 1;
    ctx.drawImage(vignetteCv, 0, 0, W, H);

    if (!phaseSent.zoom && t >= tl.zs) { phaseSent.zoom = true; onPhase?.("zoom"); }
    if (!phaseSent.exit && t >= tl.exit) { phaseSent.exit = true; onPhase?.("exit"); }
  };

  /* ───────── siklus hidup ───────── */
  const loop = (now) => {
    if (destroyed) return;
    raf = requestAnimationFrame(loop);
    if (!t0) { t0 = now; lastNow = now; }
    const dt = Math.min(0.12, Math.max(0.001, (now - lastNow) / 1000));
    lastNow = now;
    if (document.hidden) return;
    lastT = (now - t0) / 1000;
    frame(lastT, dt);
  };

  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { try { build(lastT); } catch (e) { /* abaikan */ } }, 160);
  };

  const ready = () => {
    try { build(lastT); } catch (e) { /* abaikan */ }
  };
  build(0);
  // font web mungkin baru selesai dimuat: susun ulang target TANPA mereset animasi
  try {
    const fam = `800 48px "${opts.fontFamily}"`;
    document.fonts?.load(fam).then(() => !destroyed && ready()).catch(() => {});
    document.fonts?.ready.then(() => !destroyed && ready()).catch(() => {});
  } catch (e) { /* abaikan */ }
  window.addEventListener("resize", onResize);

  return {
    start() { if (!raf) raf = requestAnimationFrame(loop); },
    /** render deterministik untuk waktu tertentu (dipakai untuk pengujian) */
    renderAt(t, dt = 1 / 60) { lastT = t; frame(t, dt); },
    setText(next) {
      const changed = ["line1", "line2", "fontFamily", "color1", "color2"].some((k) => next[k] !== undefined && next[k] !== opts[k]);
      if (!changed) return;
      opts = { ...opts, ...next };
      try { build(lastT); } catch (e) { /* abaikan */ }
    },
    setTiming(ms, cb) { if (ms) totalMs = ms; if (cb) onPhase = cb; },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    },
  };
}
