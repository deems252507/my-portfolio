// Layar monitor virtual: kanvas 2D berisi jendela browser (tab, address bar, kursor, loading) dan
// halaman yang tampil SETELAH Enter = layar sambutan asli situs (petir dari shader yang sama +
// teks "Welcome To My / Portofolio Website" dengan font & warna dari pengaturan admin).
// Kanvas ini hanya TEKSTUR untuk adegan 3D; website asli tetap dimuat di bawah overlay.
import * as THREE from "three";

const W = 2048;
const H = 940;
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
  constructor({ url, name, nav, accent = "#06b6d4", blue = "#2563eb", bg = "#050510", welcome = {}, lightning = null, quality = 0.85 }) {
    this.url = url;
    this.name = name;
    this.nav = nav;
    this.accent = accent;
    this.blue = blue;
    this.bg = bg;
    this.welcome = {
      line1: welcome.line1 || "Welcome To My",
      line2: welcome.line2 || "Portofolio Website",
      color1: welcome.color1 || "#ffffff",
      color2: welcome.color2 || "#2563eb",
      font: welcome.font || "Arial",
    };
    this.lightning = lightning; // LightningSource | null
    this.preview = null;        // HTMLImageElement opsional (/intro/portfolio-preview.jpg)
    this.q = quality;

    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round(W * quality);
    this.canvas.height = Math.round(H * quality);
    this.ctx = this.canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
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

    const chromeH = 170 * (1 - s.full);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, chromeH, W, H - chromeH);
    ctx.clip();
    this._page(ctx, 0, chromeH, W, H - chromeH, s);
    ctx.restore();

    if (chromeH > 2) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, chromeH / 70);
      this._chrome(ctx, chromeH, s);
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

  // Salinan tampilan layar sambutan situs: latar gelap + petir (shader yang sama) + teks Welcome.
  _welcome(ctx, x, y, w, h, s) {
    ctx.fillStyle = this.bg;
    ctx.fillRect(x, y, w, h);
    const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.5, 0, x + w * 0.5, y + h * 0.5, w * 0.5);
    g.addColorStop(0, this.blue + "22");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    if (this.lightning?.ok) {
      this.lightning.render(s.time, s.bolt || 1);
      ctx.drawImage(this.lightning.canvas, x, y, w, h);
    }

    const wl = this.welcome;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = x + w / 2, cy = y + h / 2;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = wl.color1;
    ctx.font = `800 128px ${wl.font}, ${FONT}`;
    ctx.fillText(wl.line1, cx, cy - 90);
    ctx.fillStyle = wl.color2;
    ctx.font = `800 138px ${wl.font}, ${FONT}`;
    ctx.fillText(wl.line2, cx, cy + 62);
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }

  // Kursor mouse: bergerak melengkung ke address bar, lalu klik (riak)
  _pointer(ctx, s) {
    const a = s.cursorAlpha ?? 1;
    if (a <= 0.01 || s.cursor === undefined) return;
    const sx = W * 0.72, sy = H * 0.7;
    const ex = 560, ey = 128;
    const e = s.cursor;
    const px = sx + (ex - sx) * e;
    const py = sy + (ey - sy) * e - Math.sin(Math.PI * e) * 70;
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
