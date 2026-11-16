// Layar monitor virtual: kanvas 2D berisi jendela browser (tab, address bar, kursor, loading) dan
// halaman yang tampil SETELAH Enter = layar sambutan asli situs (petir dari shader yang sama +
// teks "Welcome To My / Portofolio Website" dengan font & warna dari pengaturan admin).
// Kanvas ini hanya TEKSTUR untuk adegan 3D; website asli tetap dimuat di bawah overlay.
import * as THREE from "three";

const W = 2048;
const H = 940;
const TB = 64;                                   // tinggi taskbar di bawah layar
const ICON = { x: W / 2 + 46, y: H - TB / 2 };   // ikon browser di taskbar (target klik kursor)
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

const rr = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

export class BrowserScreen {
  constructor({ url, name, nav, accent = "#06b6d4", blue = "#2563eb", bg = "#050510", welcome = {}, backdrop = {}, lightning = null, live = null, quality = 0.85 }) {
    this.url = url;
    this.name = name;
    this.nav = nav;
    this.accent = accent;
    this.blue = blue;
    this.bg = bg;
    this.rev = 0;               // naik setiap pengaturan berubah -> paksa gambar ulang
    this.setWelcome(welcome);
    this.setBackdrop(backdrop);
    this.lightning = lightning; // LightningSource | null
    this.live = live;           // () => kanvas partikel layar sambutan ASLI (atau null)
    this.view = null;           // { visH, visW }: bagian layar yang terlihat saat kamera memenuhi layar
    this.preview = null;        // HTMLImageElement opsional (/intro/portfolio-preview.jpg)
    this.q = quality;

    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round(W * quality);
    this.canvas.height = Math.round(H * quality);
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    // mipmap: layar monitor yang diperkecil (kamera jauh) tidak lagi berkilau/berkedip saat kamera bergoyang
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
  }

  /** Teks, font, warna, dan loading dari pengaturan admin (bisa dipanggil kapan saja). */
  setWelcome(w = {}) {
    this.welcome = {
      line1: w.line1 || "Welcome To My",
      line2: w.line2 || "Portofolio Website",
      color1: w.color1 || "#ffffff",
      color2: w.color2 || "#2563eb",
      font: w.font || "Arial",
      loadLabel: w.loadLabel,
      loadColor: w.loadColor,
      loadTrack: w.loadTrack,
      showPct: w.showPct,
    };
    this.rev++;
  }

  /** Gaya latar layar sambutan: "lightning" | "none" | gaya lain (didekati dengan cahaya warna FX). */
  setBackdrop({ style = "lightning", color = "#3b82f6" } = {}) {
    this.bgStyle = style || "lightning";
    this.fxColor = color || "#3b82f6";
    this.rev++;
  }

  setMeta({ name, accent, blue, bg } = {}) {
    if (name) this.name = name;
    if (accent) this.accent = accent;
    if (blue) this.blue = blue;
    if (bg) this.bg = bg;
    this.rev++;
  }

  /**
   * s = { time, power, chars (jumlah huruf URL yang sudah terketik), loading, page, full,
   *       cursor (0..1 menuju address bar), click (0..1), focus (0..1), cursorAlpha, bolt }
   */
  draw(s) {
    const ctx = this.ctx;
    ctx.setTransform(this.q, 0, 0, this.q, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#04070d";
    ctx.fillRect(0, 0, W, H);
    if (s.power <= 0.01) {
      this.texture.needsUpdate = true;
      return;
    }

    // 1) Awal: programmer sedang NGODING (editor kode). 2) Jendela browser baru terbuka di atasnya (s.win 0 -> 1).
    const win = s.win ?? 1;
    if (win < 1) {
      this._editor(ctx, s);
      ctx.fillStyle = `rgba(0,0,0,${0.3 * win})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (win > 0) {
      const ez = win * win * (3 - 2 * win);
      ctx.save();
      if (win < 1) {
        // jendela baru muncul: membesar dari ikon browser sambil memudar, dengan bayangan
        ctx.globalAlpha = ez;
        const sc = 0.3 + 0.7 * ez; // jendela "keluar" dari ikon browser di taskbar
        ctx.translate(ICON.x, ICON.y);
        ctx.scale(sc, sc);
        ctx.translate(-ICON.x, -ICON.y);
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 70;
        ctx.fillStyle = "#070d18";
        ctx.fillRect(0, 0, W, H);
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      }
      const chromeH = 170 * (1 - s.full);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, chromeH, W, H - chromeH);
      ctx.clip();
      this._page(ctx, 0, chromeH, W, H - chromeH, s);
      ctx.restore();

      if (chromeH > 2) {
        ctx.save();
        ctx.globalAlpha *= Math.min(1, chromeH / 70);
        this._chrome(ctx, chromeH, s);
        ctx.restore();
      }
      ctx.restore();
    }
    this._pointer(ctx, s);

    // vignette + scanline tipis agar terasa seperti layar (hilang saat layar memenuhi pandangan)
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,6,12,${0.38 * (1 - s.full)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.05 * (1 - s.full);
    ctx.fillStyle = "#000";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;

    if (s.power < 1) {
      ctx.fillStyle = `rgba(160,240,255,${(1 - s.power) * 0.85})`;
      ctx.fillRect(0, 0, W, H);
    }
    this.texture.needsUpdate = true;
  }

  /** Editor kode (gaya VS Code): sebagian kode sudah ada, beberapa baris terakhir terketik langsung. */
  _editor(ctx, s) {
    const MONO = `ui-monospace, Menlo, Consolas, "Courier New", monospace`;
    const done = [
      'import { useEffect, useState } from "react";',
      'import Projects from "./Projects";',
      '',
      'export default function Portfolio() {',
      '  const [ready, setReady] = useState(false);',
      '',
      '  useEffect(() => {',
      '    fetchProjects().then(setReady);',
      '  }, []);',
    ];
    const typedSrc = [
      '',
      '  return (',
      '    <main className="hero">',
      '      <h1>Welcome To My Portfolio</h1>',
      '      {ready && <Projects />}',
      '    </main>',
      '  );',
      '}',
    ].join("\n");
    const n = Math.max(0, Math.min(typedSrc.length, s.codeN | 0));
    const typed = typedSrc.slice(0, n).split("\n");
    const lines = [...done];
    typed.forEach((t, i) => { if (i === 0) lines[done.length - 1] = lines[done.length - 1]; lines.push(t); });

    ctx.fillStyle = "#0a111c";
    ctx.fillRect(0, 0, W, H);
    // title bar
    ctx.fillStyle = "#0d1522";
    ctx.fillRect(0, 0, W, 56);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(40 + i * 40, 28, 11, 0, Math.PI * 2); ctx.fill();
    });
    ctx.fillStyle = "#7f93b2"; ctx.font = `500 26px ${FONT}`; ctx.textBaseline = "middle"; ctx.textAlign = "center";
    ctx.fillText("portfolio.jsx \u2014 my-portfolio \u2014 Code", W / 2, 29);
    // activity bar + explorer
    ctx.fillStyle = "#0c1420"; ctx.fillRect(0, 56, 76, H - 56 - 46 - TB);
    ["#5b7fb5", "#2d4264", "#2d4264", "#2d4264"].forEach((c, i) => { ctx.fillStyle = c; rr(ctx, 22, 90 + i * 70, 32, 32, 7); ctx.fill(); });
    ctx.fillStyle = "#0b121d"; ctx.fillRect(76, 56, 340, H - 56 - 46 - TB);
    ctx.textAlign = "left"; ctx.font = `700 22px ${FONT}`; ctx.fillStyle = "#6f86a8";
    ctx.fillText("EXPLORER", 104, 90);
    const files = [["\u25BE  src", 0, "#9fb4d0"], ["\u25BE  components", 1, "#9fb4d0"], ["Navbar.jsx", 2, "#7f93b2"], ["Projects.jsx", 2, "#7f93b2"], ["portfolio.jsx", 2, "#e8f6ff"], ["Contact.jsx", 2, "#7f93b2"], ["App.jsx", 1, "#7f93b2"], ["index.css", 1, "#7f93b2"]];
    files.forEach(([t, ind, col], i) => {
      const fy = 140 + i * 48;
      if (t === "portfolio.jsx") { ctx.fillStyle = "rgba(37,99,235,0.28)"; ctx.fillRect(76, fy - 22, 340, 44); }
      ctx.fillStyle = col; ctx.font = `500 26px ${FONT}`;
      ctx.fillText(t, 104 + ind * 28, fy);
    });
    // tab
    const cx0 = 416;
    ctx.fillStyle = "#0d1522"; ctx.fillRect(cx0, 56, W - cx0, 60);
    ctx.fillStyle = "#0a111c"; ctx.fillRect(cx0, 56, 300, 60);
    ctx.fillStyle = this.accent; ctx.fillRect(cx0, 56, 300, 3);
    ctx.fillStyle = "#e8f6ff"; ctx.font = `500 26px ${FONT}`; ctx.fillText("portfolio.jsx", cx0 + 28, 88);
    // kode
    const fs = 34, lh = 46, gx = cx0 + 100, top = 116 + 26;
    ctx.font = `${fs}px ${MONO}`;
    const KW = /^(import|from|export|default|function|const|return)$/;
    const re = /(\/\/.*$)|("[^"]*"?)|(\b[A-Za-z_]\w*\b(?=\())|(<\/?[A-Za-z][\w]*|\/>|>)|(\b[A-Za-z_]\w*\b)|(.)/g;
    let caretX = gx, caretY = top;
    lines.forEach((ln, i) => {
      const y = top + i * lh;
      ctx.fillStyle = i === lines.length - 1 ? "#9fb4d0" : "#3d526f";
      ctx.textAlign = "right"; ctx.fillText(String(i + 1), cx0 + 72, y);
      ctx.textAlign = "left";
      let x = gx;
      for (const m of ln.matchAll(re)) {
        const tok = m[0];
        let col = "#d6e2f5";
        if (m[1]) col = "#546e7a";
        else if (m[2]) col = "#c3e88d";
        else if (m[3]) col = "#82aaff";
        else if (m[4]) col = "#f07178";
        else if (m[5]) col = KW.test(tok) ? "#c792ea" : /^(useState|useEffect|Projects|Portfolio)$/.test(tok) ? "#ffcb6b" : "#d6e2f5";
        ctx.fillStyle = col;
        ctx.fillText(tok, x, y);
        x += ctx.measureText(tok).width;
      }
      if (i === lines.length - 1) { caretX = x; caretY = y; }
    });
    if (Math.floor(s.time * 2.4) % 2 === 0 || n > 0 && n < typedSrc.length) {
      ctx.fillStyle = this.accent;
      ctx.fillRect(caretX + 2, caretY - 20, 4, 40);
    }
    // status bar
    const sb = H - TB - 46;
    ctx.fillStyle = "#1d4ed8"; ctx.fillRect(0, sb, W, 46);
    ctx.fillStyle = "#e8f1ff"; ctx.font = `500 24px ${FONT}`; ctx.textBaseline = "middle";
    ctx.fillText(`\u2387 main     JavaScript React     Ln ${lines.length}, Col ${(lines[lines.length - 1] || "").length + 1}     UTF-8`, 28, sb + 24);
    this._taskbar(ctx, s);
  }

  /** Taskbar ala Windows 11: ikon di tengah; ikon browser menyala saat kursor di atasnya / diklik. */
  _taskbar(ctx, s) {
    const y0 = H - TB;
    ctx.fillStyle = "#0a0f19"; ctx.fillRect(0, y0, W, TB);
    ctx.fillStyle = "rgba(120,160,210,0.15)"; ctx.fillRect(0, y0, W, 2);
    const names = ["start", "search", "code", "browser", "folder", "term"];
    names.forEach((n, i) => {
      const x = W / 2 + (i - 2.5) * 92, y = H - TB / 2;
      if (n === "browser") {
        const hov = (s.ptr ?? 0) > 0.97 && (s.win ?? 1) < 0.2;
        if (hov) { ctx.fillStyle = "rgba(255,255,255,0.14)"; rr(ctx, x - 36, y - 28, 72, 56, 12); ctx.fill(); }
        const pr = Math.max(0, s.click || 0) * ((s.win ?? 1) < 0.2 ? 1 : 0);
        const r = 17 - 2 * pr;
        const g = ctx.createConicGradient(0, x, y);
        g.addColorStop(0, "#ea4335"); g.addColorStop(0.33, "#fbbc05"); g.addColorStop(0.66, "#34a853"); g.addColorStop(1, "#ea4335");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#0a0f19"; ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4285f4"; ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill();
        if ((s.win ?? 0) > 0.2) { ctx.fillStyle = this.accent; rr(ctx, x - 14, y + 26, 28, 4, 2); ctx.fill(); }
        return;
      }
      ctx.fillStyle = n === "code" ? "#3b82f6" : n === "folder" ? "#f5c04a" : n === "term" ? "#1f2a3b" : "#6f86a8";
      if (n === "start") { [[-9,-9],[2,-9],[-9,2],[2,2]].forEach(([dx,dy]) => ctx.fillRect(x + dx, y + dy, 7, 7)); }
      else if (n === "search") { ctx.strokeStyle = "#6f86a8"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x - 3, y - 3, 10, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 5, y + 5); ctx.lineTo(x + 13, y + 13); ctx.stroke(); }
      else { rr(ctx, x - 16, y - 14, 32, 28, 6); ctx.fill(); if (n === "term") { ctx.fillStyle = "#7ef0ff"; ctx.fillRect(x - 9, y - 4, 10, 3); ctx.fillRect(x - 9, y + 4, 16, 3); } }
      if (n === "code") { ctx.fillStyle = this.accent; rr(ctx, x - 14, y + 26, 28, 4, 2); ctx.fill(); }
    });
  }

  _chrome(ctx, h, s) {
    ctx.fillStyle = "#0d1522";
    ctx.fillRect(0, 0, W, h);
    // tab
    ctx.fillStyle = "#16233a";
    rr(ctx, 40, 16, 400, 72, 16);
    ctx.fill();
    ctx.fillStyle = "#9fb4d0";
    ctx.font = `600 28px ${FONT}`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText((s.page > 0.5 ? this.name : "Tab baru").slice(0, 20), 108, 52);
    const fx = 70, fy = 52;
    if (s.loading > 0 && s.loading < 1) {
      ctx.strokeStyle = this.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(fx, fy, 12, s.time * 8, s.time * 8 + Math.PI * 1.4);
      ctx.stroke();
    } else {
      ctx.fillStyle = s.page > 0.5 ? this.accent : "#3a4d6b";
      ctx.beginPath();
      ctx.arc(fx, fy, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(W - 150 + i * 44, 52, 12, 0, Math.PI * 2);
      ctx.fill();
    });

    // address bar (lebih besar supaya terbaca saat kamera mendekat)
    const ay = 98, ah = 60;
    ctx.fillStyle = "#070d18";
    rr(ctx, 40, ay, W - 80, ah, 30);
    ctx.fill();
    ctx.strokeStyle = s.focus > 0.5 && s.loading < 1 ? this.accent : "rgba(120,160,210,0.25)";
    ctx.lineWidth = s.focus > 0.5 && s.loading < 1 ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = "#6f86a8";
    ctx.font = `30px ${FONT}`;
    ctx.fillText("\u2190   \u2192   \u21BB", 72, ay + ah / 2 + 1);
    ctx.font = `500 38px ${FONT}`;
    const tx = 270;
    const n = Math.max(0, Math.min(this.url.length, s.chars | 0));
    const shown = this.url.slice(0, n);
    if (n === 0) {
      ctx.fillStyle = "#4d6283";
      ctx.fillText("Cari atau ketik alamat web", tx, ay + ah / 2 + 1);
    } else {
      ctx.fillStyle = "#e8f6ff";
      ctx.fillText(shown, tx, ay + ah / 2 + 1);
    }
    // caret berkedip saat address bar aktif
    if (s.focus > 0.5 && s.loading <= 0 && Math.floor(s.time * 2.4) % 2 === 0) {
      const cx = tx + (n === 0 ? 0 : ctx.measureText(shown).width) + 3;
      ctx.fillStyle = this.accent;
      ctx.fillRect(cx, ay + 12, 3, ah - 24);
    }
    if (s.loading > 0 && s.loading < 1) {
      ctx.fillStyle = this.accent;
      ctx.fillRect(40, ay + ah + 5, (W - 80) * s.loading, 6);
    }
  }

  _page(ctx, x, y, w, h, s) {
    const base = ctx.createLinearGradient(0, y, 0, y + h);
    base.addColorStop(0, "#070d18");
    base.addColorStop(1, "#04070d");
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);

    if (s.loading > 0 && s.page < 1) {
      ctx.globalAlpha = 1 - s.page;
      ctx.fillStyle = "rgba(60,90,130,0.22)";
      rr(ctx, w * 0.3, y + h * 0.3, w * 0.4, 46, 12); ctx.fill();
      rr(ctx, w * 0.36, y + h * 0.42, w * 0.28, 30, 10); ctx.fill();
      rr(ctx, w * 0.33, y + h * 0.52, w * 0.34, 24, 10); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (s.page <= 0) return;

    ctx.globalAlpha = Math.min(1, s.page);
    const cx = x + w / 2, cy = y + h / 2;
    const scale = 1 + (1 - s.page) * 0.04;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    if (this.preview) {
      const ir = this.preview.width / this.preview.height;
      const pr = w / h;
      let dw = w, dh = h;
      if (ir > pr) dw = h * ir; else dh = w / ir;
      ctx.drawImage(this.preview, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    } else {
      this._welcome(ctx, x, y, w, h, s);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Salinan tampilan layar sambutan situs. Ukuran & posisi teks/loading DISESUAIKAN dengan layar asli
  // pada saat kamera memenuhi layar, supaya hasil crossfade ke WelcomeScreen asli tidak melompat.
  _welcome(ctx, x, y, w, h, s) {
    ctx.fillStyle = this.bg;
    ctx.fillRect(x, y, w, h);
    const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.5, 0, x + w * 0.5, y + h * 0.5, w * 0.5);
    g.addColorStop(0, this.blue + "22");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // gaya latar lain (aurora, matrix, dst.): didekati dengan dasar gelap + cahaya warna FX dari admin
    if (this.bgStyle !== "lightning" && this.bgStyle !== "none") {
      ctx.fillStyle = "#030014";
      ctx.fillRect(x, y, w, h);
      const fg = ctx.createRadialGradient(x + w * 0.5, y + h * 0.5, 0, x + w * 0.5, y + h * 0.5, w * 0.45);
      fg.addColorStop(0, this.fxColor + "55");
      fg.addColorStop(1, "transparent");
      ctx.fillStyle = fg;
      ctx.fillRect(x, y, w, h);
    } else if (this.bgStyle === "lightning" && this.lightning?.ok) {
      this.lightning.render(s.time, s.bolt || 1);
      ctx.drawImage(this.lightning.canvas, x, y, w, h);
    }

    const wl = this.welcome;
    const v = this.view || { visH: 0.764, visW: 0.62 };
    const U = v.visW * W; // lebar viewport (px tekstur) saat kamera memenuhi layar
    const yAt = (vp) => y + (0.5 + (vp - 0.5) * v.visH) * h; // posisi vertikal layar asli (fraksi viewport)
    const cx = x + w / 2;
    const wt = Math.max(0, s.wt || 0);

    // TEKS: gambar langsung kanvas partikel layar sambutan ASLI yang sedang berjalan di bawah overlay.
    // Jadi yang terlihat di monitor adalah partikel/teks yang SAMA (teks, font, warna dari admin), dan saat
    // overlay memudar tidak ada yang mengulang dari awal. Jika kanvas asli tidak tersedia, pakai teks datar.
    const liveCv = this.live ? this.live() : undefined;
    if (liveCv && liveCv.width > 8 && liveCv.height > 8) {
      const rw = U;
      const rh = U * (liveCv.height / liveCv.width);
      ctx.drawImage(liveCv, 0, 0, liveCv.width, liveCv.height, x + (w - rw) / 2, y + (h - rh) / 2, rw, rh);
    } else if (liveCv === undefined) {
      const textA = Math.min(1, wt / 1.6);
      ctx.save();
      ctx.globalAlpha *= textA;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fit = (txt, frac, weight) => {
        ctx.font = `${weight} 100px ${wl.font}, ${FONT}`;
        const m = ctx.measureText(txt).width || 1;
        return Math.max(20, (100 * frac * U) / m);
      };
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 24;
      const f1 = fit(wl.line1, 0.297, 800);
      ctx.fillStyle = wl.color1;
      ctx.font = `800 ${f1}px ${wl.font}, ${FONT}`;
      ctx.fillText(wl.line1, cx, yAt(0.327));
      const f2 = fit(wl.line2, 0.512, 800);
      ctx.fillStyle = wl.color2;
      ctx.font = `800 ${f2}px ${wl.font}, ${FONT}`;
      ctx.fillText(wl.line2, cx, yAt(0.492));
      ctx.restore();
    }

    // bar loading: berjalan dari awal halaman, sama dengan yang berjalan di layar asli
    const barA = Math.min(1, Math.max(0, (wt - 1.2) / 0.5));
    if (barA > 0.01) {
      const bw = 0.188 * U, bh = Math.max(3, 0.0045 * U), by = yAt(0.74);
      const lf = Math.max(10, 0.0095 * U);
      ctx.save();
      ctx.globalAlpha *= barA;
      ctx.font = `700 ${lf}px ui-monospace, Menlo, Consolas, monospace`;
      ctx.fillStyle = wl.loadColor || "#ffffff";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(wl.loadLabel || "Loading", cx - bw / 2, yAt(0.71));
      if (wl.showPct !== false) {
        ctx.textAlign = "right";
        ctx.fillText(`${Math.round((s.prog || 0) * 100)}%`, cx + bw / 2, yAt(0.71));
      }
      ctx.fillStyle = wl.loadTrack || "rgba(255,255,255,0.1)";
      ctx.fillRect(cx - bw / 2, by, bw, bh);
      ctx.fillStyle = wl.loadColor || "#ffffff";
      ctx.fillRect(cx - bw / 2, by, bw * (s.prog || 0), bh);
      ctx.restore();
    }
    ctx.textAlign = "left";
  }

  // Kursor mouse: bergerak melengkung ke address bar, lalu klik (riak)
  _pointer(ctx, s) {
    const a = (s.cursorAlpha ?? 1) * Math.min(1, Math.max(0, (s.ptr ?? 1) * 5));
    if (a <= 0.01 || s.cursor === undefined) return;
    // fase 1: dari tepi mouse pad menuju ikon browser di taskbar; fase 2: dari ikon menuju address bar
    const sx = W * 0.72, sy = H * 0.7;
    let px, py;
    if (s.cursor > 0 || (s.win ?? 1) >= 1 && (s.ptr ?? 1) >= 1) {
      const e = s.cursor, ex = 560, ey = 128;
      px = ICON.x + (ex - ICON.x) * e;
      py = ICON.y + (ey - ICON.y) * e - Math.sin(Math.PI * e) * 70;
    } else {
      const e = s.ptr ?? 1;
      px = sx + (ICON.x - sx) * e;
      py = sy + (ICON.y - sy) * e - Math.sin(Math.PI * e) * 60;
    }
    ctx.save();
    ctx.globalAlpha = a;
    if (s.click > 0.01) {
      ctx.strokeStyle = this.accent;
      ctx.lineWidth = 4;
      ctx.globalAlpha = a * s.click;
      ctx.beginPath();
      ctx.arc(px, py, 10 + 46 * (1 - s.click), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a;
    }
    ctx.translate(px, py);
    ctx.scale(1.5, 1.5);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(14, 36); ctx.lineTo(20, 33); ctx.lineTo(14, 21); ctx.lineTo(24, 21);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0a0f18";
    ctx.stroke();
    ctx.restore();
  }

  dispose() {
    this.texture.dispose();
    this.lightning?.dispose();
  }
}
