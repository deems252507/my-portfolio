// Efek suara intro, disintesis dengan Web Audio (tanpa file audio, tanpa unduhan tambahan).
// Browser melarang suara otomatis, jadi suara MATI secara default dan baru aktif setelah
// pengunjung menekan tombol suara. Semua efek aman dipanggil kapan saja (diam bila mati).

export function createIntroAudio() {
  let ctx = null;
  let master = null;
  let ambient = null;
  let enabled = false;
  let noiseBuf = null;

  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 6;
      master.connect(comp);
      comp.connect(ctx.destination);
      // 2 detik white noise dipakai ulang oleh semua efek
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      ctx = null;
    }
    return ctx;
  };

  const ready = () => enabled && ctx && ctx.state === "running";

  const noise = (when, dur, { type = "bandpass", freq = 2500, q = 1, gain = 0.3, attack = 0.002 } = {}) => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(master);
    src.start(when, Math.random());
    src.stop(when + dur + 0.05);
    return { f, g };
  };

  const tone = (when, dur, { type = "sine", from = 200, to = from, gain = 0.2, attack = 0.003 } = {}) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, when);
    if (to !== from) o.frequency.exponentialRampToValueAtTime(to, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(master);
    o.start(when);
    o.stop(when + dur + 0.05);
    return { o, g };
  };

  return {
    isEnabled: () => enabled,

    /** Harus dipanggil dari klik pengunjung (aturan autoplay browser). */
    async setEnabled(on) {
      enabled = !!on;
      if (on) {
        if (!ensure()) { enabled = false; return false; }
        try { await ctx.resume(); } catch { /* abaikan */ }
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.25);
        this.startAmbient();
      } else if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.15);
      }
      return enabled;
    },

    // dengung ruangan stasiun (sangat pelan)
    startAmbient() {
      if (!ready() || ambient) return;
      const t = ctx.currentTime;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 2.5);
      const a = ctx.createOscillator(); a.type = "sine"; a.frequency.value = 54;
      const b = ctx.createOscillator(); b.type = "sine"; b.frequency.value = 54.7;
      const c = ctx.createOscillator(); c.type = "triangle"; c.frequency.value = 108;
      const cg = ctx.createGain(); cg.gain.value = 0.25;
      a.connect(g); b.connect(g); c.connect(cg).connect(g);
      g.connect(master);
      a.start(); b.start(); c.start();
      ambient = { g, stop: () => { a.stop(); b.stop(); c.stop(); } };
    },
    stopAmbient(fade = 1.2) {
      if (!ambient || !ctx) return;
      const { g, stop } = ambient;
      ambient = null;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fade);
      setTimeout(() => { try { stop(); } catch { /* sudah berhenti */ } }, fade * 1000 + 100);
    },

    /** Ketukan tombol keyboard (mekanik, agak lembut). */
    key(vol = 1) {
      if (!ready()) return;
      const t = ctx.currentTime;
      const v = (0.55 + Math.random() * 0.25) * vol;
      noise(t, 0.035, { type: "bandpass", freq: 2200 + Math.random() * 1400, q: 0.9, gain: 0.28 * v });
      tone(t, 0.05, { type: "sine", from: 190 + Math.random() * 40, to: 110, gain: 0.16 * v });
    },
    /** Klik tombol ENTER (lebih dalam dan tegas). */
    enter() {
      if (!ready()) return;
      const t = ctx.currentTime;
      noise(t, 0.06, { type: "bandpass", freq: 1500, q: 0.8, gain: 0.45 });
      tone(t, 0.11, { type: "sine", from: 150, to: 70, gain: 0.34 });
      noise(t + 0.075, 0.03, { type: "highpass", freq: 3500, q: 0.7, gain: 0.18 }); // pantulan keycap
    },
    /** Komputer memuat: kipas naik + detak disk kecil + chirp. */
    loading(dur = 1.6) {
      if (!ready()) return;
      const t = ctx.currentTime;
      const n = noise(t, dur, { type: "lowpass", freq: 300, q: 0.5, gain: 0.06, attack: 0.3 });
      n.f.frequency.exponentialRampToValueAtTime(1400, t + dur * 0.9);
      for (let i = 0; i < 16; i++) {
        const at = t + 0.05 + Math.random() * (dur - 0.1);
        noise(at, 0.012, { type: "bandpass", freq: 3200 + Math.random() * 2500, q: 2, gain: 0.12 });
      }
      tone(t + dur * 0.55, 0.35, { type: "square", from: 660, to: 990, gain: 0.025 });
      tone(t + dur * 0.8, 0.25, { type: "sine", from: 880, to: 1320, gain: 0.05 });
    },
    /** Energi futuristik saat kamera mendekat dan menembus layar. */
    energy(dur = 3) {
      if (!ready()) return;
      const t = ctx.currentTime;
      const o = tone(t, dur, { type: "sawtooth", from: 70, to: 780, gain: 0.07, attack: dur * 0.5 });
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(240, t);
      lp.frequency.exponentialRampToValueAtTime(5200, t + dur);
      o.g.disconnect();
      o.g.connect(lp).connect(master);
      tone(t, dur, { type: "sine", from: 140, to: 1560, gain: 0.04, attack: dur * 0.6 });
      const r = noise(t, dur, { type: "bandpass", freq: 600, q: 1.2, gain: 0.14, attack: dur * 0.7 });
      r.f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    },
    /** Sambaran petir + gemuruh saat menembus layar. */
    thunder() {
      if (!ready()) return;
      const t = ctx.currentTime;
      noise(t, 0.45, { type: "highpass", freq: 1800, q: 0.7, gain: 0.55, attack: 0.004 }); // retak
      for (let i = 0; i < 7; i++) {
        noise(t + 0.05 + i * 0.07 + Math.random() * 0.05, 0.05, { type: "bandpass", freq: 2500 + Math.random() * 4000, q: 1.5, gain: 0.25 });
      }
      tone(t, 1.6, { type: "sine", from: 62, to: 34, gain: 0.55, attack: 0.01 }); // boom
      const rum = noise(t + 0.05, 1.8, { type: "lowpass", freq: 420, q: 0.7, gain: 0.5, attack: 0.05 });
      rum.f.frequency.exponentialRampToValueAtTime(90, t + 1.8);
    },

    dispose() {
      enabled = false;
      this.stopAmbient(0.2);
      setTimeout(() => { try { ctx?.close(); } catch { /* abaikan */ } ctx = null; }, 400);
    },
  };
}
