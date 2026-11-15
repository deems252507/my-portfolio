// Efek suara sintetis (Web Audio API) — tanpa file audio, tanpa unduhan tambahan.
// Default MATI. Baru berbunyi setelah pengunjung menekan tombol suara (aturan autoplay browser).
export class IntroAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = false;
    this.noise = null;
    this.amb = null;
    this.ambWanted = false;
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
      if (this.ambWanted) this._ambStart();
    } else {
      this.enabled = false;
      this._ambStop();
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

  mouse() {
    if (!this._ok()) return;
    this._burst({ freq: 4200, q: 1.5, peak: 0.2, dec: 0.018 });
    this._burst({ freq: 3000, q: 1.5, peak: 0.12, dec: 0.02, at: 0.09 });
  }

  /** Suara komputer saat memuat: kipas menderu + bip data. */
  loading(dur = 1.5) {
    if (!this._ok()) return;
    this._burst({ type: "bandpass", freq: 400, freqEnd: 1600, q: 0.7, peak: 0.1, atk: 0.2, dec: dur });
    for (let i = 0; i < 6; i++) {
      this._tone({ type: "square", f0: 900 + Math.random() * 900, peak: 0.03, atk: 0.003, dec: 0.035, at: i * (dur / 6) + Math.random() * 0.05 });
    }
  }

  /** Sapuan energi futuristik saat kamera menyelam ke layar. */
  energy(dur = 2.6) {
    if (!this._ok()) return;
    this._tone({ type: "sawtooth", f0: 70, f1: 880, peak: 0.07, atk: dur * 0.6, dec: dur * 0.4 });
    this._tone({ type: "sine", f0: 140, f1: 1760, peak: 0.08, atk: dur * 0.7, dec: dur * 0.3 });
    this._burst({ type: "highpass", freq: 600, freqEnd: 6000, q: 0.5, peak: 0.12, atk: dur * 0.8, dec: dur * 0.2 });
  }

  /** Sambaran petir: retakan tajam + gemuruh. */
  thunder() {
    if (!this._ok()) return;
    this._burst({ type: "highpass", freq: 2500, q: 0.5, peak: 0.5, atk: 0.004, dec: 0.12 });
    this._burst({ type: "lowpass", freq: 600, freqEnd: 90, q: 0.7, peak: 0.55, atk: 0.02, dec: 1.4, at: 0.03 });
    this._tone({ type: "sine", f0: 80, f1: 38, peak: 0.35, atk: 0.02, dec: 1.0 });
  }

  /** Dengung ruangan/komputer yang sangat pelan selama intro. */
  ambience(on) {
    this.ambWanted = !!on;
    if (on) { if (this._ok()) this._ambStart(); } else this._ambStop();
  }

  _ambStart() {
    if (this.amb || !this.ctx) return;
    const c = this.ctx;
    const o1 = c.createOscillator(); o1.type = "sine"; o1.frequency.value = 55;
    const o2 = c.createOscillator(); o2.type = "sine"; o2.frequency.value = 110.7;
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const nf = c.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 500;
    const g = c.createGain(); g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 1.5);
    o1.connect(g); o2.connect(g); n.connect(nf); nf.connect(g); g.connect(this.master);
    o1.start(); o2.start(); n.start();
    this.amb = { o1, o2, n, g };
  }

  _ambStop() {
    if (!this.amb || !this.ctx) { this.amb = null; return; }
    const { o1, o2, n, g } = this.amb;
    const t = this.ctx.currentTime;
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o1.stop(t + 0.5); o2.stop(t + 0.5); n.stop(t + 0.5);
    } catch { /* abaikan */ }
    this.amb = null;
  }

  dispose() {
    this._ambStop();
    this.enabled = false;
    const c = this.ctx;
    this.ctx = null;
    if (c) setTimeout(() => { try { c.close(); } catch { /* abaikan */ } }, 600);
  }
}
