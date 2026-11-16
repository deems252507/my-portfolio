// Efek suara sintetis (Web Audio API) — tanpa file audio, tanpa unduhan tambahan.
// Tiga bunyi: klik mouse (ikon browser & address bar), ketukan keyboard, dan tombol ENTER. Default MATI. Baru berbunyi setelah pengunjung menekan tombol suara (aturan autoplay browser).
export class IntroAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this.noise = null;
  }

  get supported() {
    return typeof window !== "undefined" && !!(window.AudioContext || window.webkitAudioContext);
  }

  async setEnabled(on) {
    if (on) {
      if (!this.supported) return false;
      if (!this.ctx) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = 0.55;
          this.master.connect(this.ctx.destination);
          const len = this.ctx.sampleRate * 2;
          this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
          const d = this.noise.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        } catch { return false; }
      }
      try { await this.ctx.resume(); } catch { /* abaikan */ }
      this.enabled = true;
    } else {
      this.enabled = false;
      try { await this.ctx?.suspend(); } catch { /* abaikan */ }
    }
    return this.enabled;
  }

  _ok() { return this.enabled && this.ctx && this.ctx.state === "running"; }

  _env(g, t0, peak, atk, dec) {
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + atk + dec);
  }

  _burst({ type = "bandpass", freq = 3000, q = 1, peak = 0.3, atk = 0.002, dec = 0.04, at = 0, freqEnd = null }) {
    const c = this.ctx, t = c.currentTime + at;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + atk + dec);
    const g = c.createGain();
    this._env(g, t, peak, atk, dec);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t, Math.random() * 1.5); s.stop(t + atk + dec + 0.05);
  }

  _tone({ type = "sine", f0 = 200, f1 = null, peak = 0.2, atk = 0.005, dec = 0.1, at = 0 }) {
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + atk + dec);
    const g = c.createGain();
    this._env(g, t, peak, atk, dec);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + atk + dec + 0.05);
  }

  // Klik tombol mouse: "tik" saat ditekan (tajam, tinggi) lalu "tak" lebih lembut saat dilepas.
  click() {
    if (!this._ok()) return;
    const v = 0.94 + Math.random() * 0.12;
    this._burst({ type: "highpass", freq: 3800 * v, q: 0.7, peak: 0.3, atk: 0.0008, dec: 0.014 });
    this._burst({ freq: 5200 * v, q: 2.2, peak: 0.18, atk: 0.0008, dec: 0.02 });
    this._tone({ type: "square", f0: 1900 * v, f1: 900, peak: 0.05, atk: 0.0006, dec: 0.016 });
    this._tone({ f0: 320, f1: 190, peak: 0.07, atk: 0.001, dec: 0.03 });
    // lepas tombol
    this._burst({ type: "highpass", freq: 3000, q: 0.7, peak: 0.13, atk: 0.0008, dec: 0.012, at: 0.075 });
    this._tone({ type: "square", f0: 1400, f1: 760, peak: 0.025, atk: 0.0006, dec: 0.012, at: 0.075 });
  }

  key() {
    if (!this._ok()) return;
    const v = 0.85 + Math.random() * 0.3;
    this._burst({ freq: 2600 * v, q: 0.9, peak: 0.22, dec: 0.03 });
    this._tone({ f0: 190 * v, f1: 110, peak: 0.12, dec: 0.05 });
  }

  enter() {
    if (!this._ok()) return;
    this._burst({ freq: 1800, q: 0.8, peak: 0.34, dec: 0.05 });
    this._tone({ f0: 140, f1: 70, peak: 0.28, dec: 0.12 });
    this._burst({ freq: 3400, q: 1.2, peak: 0.16, dec: 0.03, at: 0.07 });
  }

  dispose() {
    this.enabled = false;
    const c = this.ctx;
    this.ctx = null;
    if (c) setTimeout(() => { try { c.close(); } catch { /* abaikan */ } }, 600);
  }
}
