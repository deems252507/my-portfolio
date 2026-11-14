// Efek suara intro (hanya suara mengetik sampai klik ENTER), disintesis dengan Web Audio (tanpa file audio, tanpa unduhan tambahan).
// Browser melarang suara otomatis, jadi suara MATI secara default dan baru aktif setelah
// pengunjung menekan tombol suara. Semua efek aman dipanggil kapan saja (diam bila mati).

export function createIntroAudio() {
  let ctx = null;
  let master = null;
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
      } else if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.15);
      }
      return enabled;
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
    dispose() {
      enabled = false;
      setTimeout(() => { try { ctx?.close(); } catch { /* abaikan */ } ctx = null; }, 400);
    },
  };
}
