// Layar monitor virtual: kanvas 2D yang berisi jendela browser (address bar, loading) dan
// pratinjau hero portfolio. Ini HANYA tekstur untuk adegan 3D; website asli tetap di bawah overlay.
import * as THREE from "three";

const W = 2048;
const H = 940;

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
  constructor({ url, name, line1, line2, role, greeting, nav, accent = "#06b6d4", blue = "#2563eb", bg = "#050510", preview = null }) {
    this.url = url;
    this.name = name;
    this.line1 = line1;
    this.line2 = line2;
    this.role = role;
    this.greeting = greeting;
    this.nav = nav;
    this.accent = accent;
    this.blue = blue;
    this.bg = bg;
    this.preview = preview; // HTMLImageElement opsional (/intro/portfolio-preview.jpg)

    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
  }

  /**
   * s = { time, power, typed (0..1), loading (0..1), page (0..1), full (0..1) }
   * power: layar menyala; typed: persen URL terketik; loading: progress bar;
   * page: pratinjau hero tampil; full: jendela browser jadi layar penuh (tanpa chrome).
   */
  draw(s) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#04070d";
    ctx.fillRect(0, 0, W, H);
    if (s.power <= 0.01) {
      this.texture.needsUpdate = true;
      return;
    }

    const chromeH = 150 * (1 - s.full);
    // ---- halaman ----
    const px = 0, py = chromeH, pw = W, ph = H - chromeH;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    this._page(ctx, px, py, pw, ph, s);
    ctx.restore();

    // ---- chrome browser ----
    if (chromeH > 2) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, chromeH / 60);
      this._chrome(ctx, chromeH, s);
      ctx.restore();
    }

    // vignette + scanline tipis agar terasa seperti layar
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, `rgba(0,6,12,${0.38 * (1 - s.full)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.05 * (1 - s.full);
    ctx.fillStyle = "#000";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.globalAlpha = 1;

    // kilau power-on
    if (s.power < 1) {
      ctx.fillStyle = `rgba(160,240,255,${(1 - s.power) * 0.85})`;
      ctx.fillRect(0, 0, W, H);
    }
    this.texture.needsUpdate = true;
  }

  _chrome(ctx, h, s) {
    ctx.fillStyle = "#0d1522";
    ctx.fillRect(0, 0, W, h);
    // tab
    ctx.fillStyle = "#16233a";
    rr(ctx, 40, 18, 360, h - 18, 16);
    ctx.fill();
    ctx.fillStyle = "#9fb4d0";
    ctx.font = "600 26px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    const tabTitle = s.page > 0.5 ? this.name : "Tab baru";
    ctx.fillText(tabTitle.slice(0, 20), 100, 18 + (h - 18) / 2);
    // favicon / spinner
    const fx = 66, fy = 18 + (h - 18) / 2;
    if (s.loading > 0 && s.loading < 1) {
      ctx.strokeStyle = this.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(fx, fy, 11, s.time * 8, s.time * 8 + Math.PI * 1.4);
      ctx.stroke();
    } else {
      ctx.fillStyle = s.page > 0.5 ? this.accent : "#3a4d6b";
      ctx.beginPath();
      ctx.arc(fx, fy, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // tombol window
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(W - 150 + i * 44, 52, 12, 0, Math.PI * 2);
      ctx.fill();
    });
    // address bar
    const ay = 86, ah = 52;
    ctx.fillStyle = "#070d18";
    rr(ctx, 40, ay, W - 80, ah, 26);
    ctx.fill();
    ctx.strokeStyle = s.typed > 0 && s.loading < 1 ? this.accent : "rgba(120,160,210,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#6f86a8";
    ctx.font = "28px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText("\u2190   \u2192   \u21BB", 70, ay + ah / 2 + 1);
    const n = Math.floor(this.url.length * s.typed);
    const shown = this.url.slice(0, n);
    ctx.font = "500 30px 'Plus Jakarta Sans', system-ui, sans-serif";
    const tx = 250;
    if (n === 0 && s.typed <= 0) {
      ctx.fillStyle = "#4d6283";
      ctx.fillText("Cari atau ketik alamat web", tx, ay + ah / 2 + 1);
    } else {
      ctx.fillStyle = "#e8f6ff";
      ctx.fillText(shown, tx, ay + ah / 2 + 1);
    }
    // kursor
    if (s.loading <= 0 && Math.floor(s.time * 2.4) % 2 === 0) {
      const cx = tx + ctx.measureText(shown).width + 3;
      ctx.fillStyle = this.accent;
      ctx.fillRect(cx, ay + 10, 3, ah - 20);
    }
    // progress loading
    if (s.loading > 0 && s.loading < 1) {
      ctx.fillStyle = this.accent;
      ctx.fillRect(40, ay + ah + 4, (W - 80) * s.loading, 5);
    }
  }

  _page(ctx, x, y, w, h, s) {
    // dasar: tab baru gelap
    const base = ctx.createLinearGradient(0, y, 0, y + h);
    base.addColorStop(0, "#070d18");
    base.addColorStop(1, "#04070d");
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);

    // skeleton saat memuat
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
    const cx = x + w / 2;
    const scale = 1 + (1 - s.page) * 0.04;
    ctx.save();
    ctx.translate(cx, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -(y + h / 2));

    if (this.preview) {
      // pratinjau nyata (opsional): cover
      const ir = this.preview.width / this.preview.height;
      const pr = w / h;
      let dw = w, dh = h;
      if (ir > pr) dw = h * ir; else dh = w / ir;
      ctx.drawImage(this.preview, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    } else {
      this._hero(ctx, x, y, w, h);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // Pratinjau hero bergaya situs (warna tema diambil dari konten situs)
  _hero(ctx, x, y, w, h) {
    ctx.fillStyle = this.bg;
    ctx.fillRect(x, y, w, h);
    let g = ctx.createRadialGradient(x + w * 0.2, y + h * 0.15, 0, x + w * 0.2, y + h * 0.15, w * 0.55);
    g.addColorStop(0, this.blue + "55");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    g = ctx.createRadialGradient(x + w * 0.85, y + h * 0.9, 0, x + w * 0.85, y + h * 0.9, w * 0.5);
    g.addColorStop(0, this.accent + "40");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    // navbar
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f0f0ff";
    ctx.font = "800 40px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(this.name.split(" ")[0] || "Portfolio", x + 90, y + 70);
    ctx.font = "600 28px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillStyle = "#c0c0dc";
    ctx.textAlign = "right";
    let nx = x + w - 90;
    for (let i = this.nav.length - 1; i >= 0; i--) {
      ctx.fillText(this.nav[i], nx, y + 70);
      nx -= ctx.measureText(this.nav[i]).width + 56;
    }

    // hero tengah (aman untuk crop layar HP)
    ctx.textAlign = "center";
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillStyle = this.accent;
    ctx.font = "600 38px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(this.greeting, cx, cy - 190);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 118px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(this.line1, cx, cy - 90);
    const tg = ctx.createLinearGradient(cx - 360, 0, cx + 360, 0);
    tg.addColorStop(0, "#60a5fa");
    tg.addColorStop(1, this.accent);
    ctx.fillStyle = tg;
    ctx.fillText(this.line2, cx, cy + 40);
    ctx.fillStyle = "#c0c0dc";
    ctx.font = "500 40px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(this.role, cx, cy + 140);
    // tombol
    ctx.fillStyle = this.blue;
    rr(ctx, cx - 250, cy + 200, 230, 70, 35); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    rr(ctx, cx + 20, cy + 200, 230, 70, 35); ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "700 28px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText("Portofolio", cx - 135, cy + 236);
    ctx.fillText("Kontak", cx + 135, cy + 236);
    ctx.textAlign = "left";
  }

  dispose() {
    this.texture.dispose();
  }
}
