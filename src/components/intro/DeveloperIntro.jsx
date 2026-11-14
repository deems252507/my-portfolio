import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useSiteContent } from "../../context/SiteContentContext";

// Intro memakai gambar workspace (public/intro/workspace.jpg). Layar monitor di gambar ditimpa
// jendela browser (HTML) yang dipasang dengan perspektif yang sama (matrix3d dari 4 titik sudut layar).
// Alur: gambar muncul -> browser terbuka -> URL diketik (suara ketik) -> ENTER (suara klik) -> halaman
// muat -> kamera menembus layar -> portfolio.
export const INTRO_IMAGE = "/intro/workspace.jpg";
const URL_TEXT = "https://rizkydm.vercel.app/";
const IW = 2576, IH = 1449; // ukuran gambar asli
// sudut layar monitor pada gambar: kiri-atas, kanan-atas, kanan-bawah, kiri-bawah
const QUAD = [[1277, 275], [2086, 282], [2040, 820], [1270, 702]];
const SW = 1600, SH = 900; // ukuran "layar" HTML sebelum ditransformasi

// homografi: memetakan (0,0),(w,0),(w,h),(0,h) ke 4 titik tujuan -> matrix3d CSS
function matrix3dFor(w, h, q) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]];
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [X, Y] = q[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  const n = 8;
  for (let i = 0; i < n; i++) { // eliminasi Gauss
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  const [a, bb, c, d, e, f, g, hh] = x;
  return `matrix3d(${a},${d},0,${g}, ${bb},${e},0,${hh}, 0,0,1,0, ${c},${f},0,1)`;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function DeveloperIntro({ audio, onReady, onReveal, onFade, onDone, onError }) {
  const { content } = useSiteContent();
  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const glowRef = useRef(null);
  const flashRef = useRef(null);
  const cb = useRef({ onReady, onReveal, onFade, onDone, onError });
  cb.current = { onReady, onReveal, onFade, onDone, onError };
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState(0); // 0 VS Code, 1 browser kosong, 2 memuat, 3 halaman tampil
  const [loadPct, setLoadPct] = useState(0);
  const [enterHit, setEnterHit] = useState(false);
  const [imgOk, setImgOk] = useState(false);
  const imgRef = useRef(null);

  const l1 = content?.welcome_line1 || "Welcome To My";
  const l2 = content?.welcome_line2 || "Portofolio Website";
  const font = content?.welcome_font || "Arial";
  const c1 = content?.welcome_color1 || "#ffffff";
  const c2 = content?.welcome_color2 || "#2563eb";

  // muat gambar
  useEffect(() => {
    const im = new Image();
    im.src = INTRO_IMAGE;
    const ok = () => setImgOk(true);
    if (im.decode) im.decode().then(ok).catch(() => { im.onload = ok; im.onerror = () => cb.current.onError?.(new Error("intro image")); });
    else { im.onload = ok; im.onerror = () => cb.current.onError?.(new Error("intro image")); }
  }, []);

  useLayoutEffect(() => {
    if (!imgOk) return;
    const host = hostRef.current, stage = stageRef.current;
    if (!host || !stage) return;
    const st = { push: 0, dive: 0 };
    let vw = 0, vh = 0, base = 1, sFinal = 3;
    const cq = [(QUAD[0][0] + QUAD[1][0] + QUAD[2][0] + QUAD[3][0]) / 4, (QUAD[0][1] + QUAD[1][1] + QUAD[2][1] + QUAD[3][1]) / 4];
    const qW = QUAD[1][0] - QUAD[0][0];
    const qH = (QUAD[3][1] - QUAD[0][1] + QUAD[2][1] - QUAD[1][1]) / 2;

    const layout = () => {
      vw = host.clientWidth; vh = host.clientHeight;
      const landscape = vw / vh >= 1.2;
      base = landscape ? Math.max(vw / IW, vh / IH) : vw / IW; // portrait: lebar penuh, sisanya latar gelap
      sFinal = Math.max((vw * 1.15) / qW, (vh * 1.15) / qH);
      apply();
    };
    const apply = () => {
      const p = st.push, d = st.dive;
      const s0 = base * (1 + 0.07 * p);
      const s = Math.pow(s0, 1 - d) * Math.pow(sFinal, d);
      const m = Math.max(p * 0.3, d);
      const fx = IW / 2 + (cq[0] - IW / 2) * m, fy = IH / 2 + (cq[1] - IH / 2) * m;
      let tx = vw / 2 - fx * s, ty = vh / 2 - fy * s;
      tx = IW * s <= vw ? (vw - IW * s) / 2 : clamp(tx, vw - IW * s, 0);
      ty = IH * s <= vh ? (vh - IH * s) / 2 : clamp(ty, vh - IH * s, 0);
      stage.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    };
    layout();
    window.addEventListener("resize", layout);

    const type = { n: 0 };
    let lastN = 0;
    const pulse = () => {
      if (glowRef.current) gsap.fromTo(glowRef.current, { opacity: 0.55 }, { opacity: 0.12, duration: 0.18, overwrite: true });
    };
    const tl = gsap.timeline({ defaults: { ease: "none" }, delay: 0.15 });
    tl.fromTo(host, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power1.out" }, 0)
      .to(st, { push: 1, duration: 6.4, ease: "sine.inOut", onUpdate: apply }, 0)
      .call(() => setPhase(1), null, 1.6)
      // mengetik URL (suara ketik per huruf)
      .to(type, {
        n: URL_TEXT.length, duration: 2.5, ease: "none", delay: 0,
        onUpdate: () => {
          const n = Math.floor(type.n);
          if (n !== lastN) { lastN = n; setTyped(URL_TEXT.slice(0, n)); audio?.key(); pulse(); }
        },
      }, 2.4)
      // ENTER
      .call(() => { audio?.enter(); setEnterHit(true); pulse(); }, null, 5.15)
      .call(() => setPhase(2), null, 5.25)
      .to({ v: 0 }, { v: 1, duration: 1.0, ease: "power1.inOut", onUpdate: function () { setLoadPct(this.targets()[0].v); } }, 5.3)
      .call(() => setPhase(3), null, 6.4)
      // kamera menembus layar
      .to(st, { dive: 1, duration: 2.4, ease: "power2.inOut", onUpdate: apply }, 7.2)
      .to(flashRef.current, { opacity: 1, duration: 0.55, ease: "power2.in" }, 8.9)
      .call(() => cb.current.onReveal?.(), null, 9.5)
      .call(() => { audio?.setEnabled(false); cb.current.onFade?.(); }, null, 9.6)
      .call(() => cb.current.onDone?.(), null, 10.6);
    cb.current.onReady?.();

    return () => { window.removeEventListener("resize", layout); tl.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgOk]);

  const mat = matrix3dFor(SW, SH, QUAD);
  const showUrl = phase >= 1;
  const empty = typed.length === 0;
  const caret = phase === 1 && !enterHit;

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden" style={{ background: "linear-gradient(180deg,#060d24,#04081a)", opacity: 0 }}>
      <div ref={stageRef} style={{ position: "absolute", left: 0, top: 0, width: IW, height: IH, transformOrigin: "0 0", willChange: "transform" }}>
        <img ref={imgRef} src={INTRO_IMAGE} alt="" draggable={false} style={{ width: IW, height: IH, display: "block", userSelect: "none" }} />

        {/* kilau keyboard saat mengetik */}
        <div ref={glowRef} aria-hidden style={{ position: "absolute", left: 1330, top: 880, width: 560, height: 240, opacity: 0.12, mixBlendMode: "screen", pointerEvents: "none", background: "radial-gradient(ellipse at center, rgba(80,190,255,0.85), transparent 65%)" }} />

        {/* jendela browser di layar monitor */}
        <div
          aria-hidden
          style={{
            position: "absolute", left: 0, top: 0, width: SW, height: SH, transformOrigin: "0 0", transform: mat,
            opacity: showUrl ? 1 : 0, transition: "opacity 450ms ease", overflow: "hidden", background: "#0b1120",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "#e8ecf6",
          }}
        >
          {/* tab bar */}
          <div style={{ height: 62, background: "#0e1526", display: "flex", alignItems: "flex-end", paddingLeft: 26, gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, height: 46, padding: "0 26px", background: "#1b2438", borderRadius: "14px 14px 0 0", fontSize: 22, fontWeight: 600, minWidth: 300 }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, background: "#38bdf8" }} />
              {phase >= 3 ? "Portfolio" : "Tab Baru"}
            </div>
          </div>
          {/* address bar */}
          <div style={{ height: 78, background: "#1b2438", display: "flex", alignItems: "center", gap: 22, padding: "0 28px", position: "relative" }}>
            <span style={{ fontSize: 34, opacity: 0.55, letterSpacing: 6 }}>{"← → ↻"}</span>
            <div style={{ flex: 1, height: 52, borderRadius: 26, background: enterHit ? "#232f48" : "#0f1729", border: "2px solid rgba(56,189,248,0.45)", display: "flex", alignItems: "center", padding: "0 28px", fontSize: 27, transition: "background 200ms" }}>
              {empty ? <span style={{ opacity: 0.45 }}>Cari atau ketik alamat web</span> : <span>{typed}</span>}
              {caret && <span style={{ display: "inline-block", width: 3, height: 32, background: "#7dd3fc", marginLeft: 3, animation: "intro-blink 0.9s steps(1) infinite" }} />}
            </div>
            {phase === 2 && <div style={{ position: "absolute", left: 0, bottom: 0, height: 5, width: `${loadPct * 100}%`, background: "linear-gradient(90deg,#2563eb,#38bdf8)" }} />}
          </div>
          {/* isi halaman */}
          <div style={{ position: "relative", height: SH - 62 - 78, background: "#060b18" }}>
            {phase < 3 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: phase === 2 ? 0 : 0.22, fontWeight: 700, letterSpacing: 2 }}>
                Tab Baru
              </div>
            )}
            {phase >= 3 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: `${font}, 'Plus Jakarta Sans', system-ui, sans-serif`, fontWeight: 800, animation: "intro-in 700ms ease both",
                background: "radial-gradient(ellipse at 20% 15%, rgba(37,99,235,0.35), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(6,182,212,0.25), transparent 50%), #060b18" }}>
                <div style={{ fontSize: 128, lineHeight: 1.1, color: c1 }}>{l1}</div>
                <div style={{ fontSize: 128, lineHeight: 1.1, color: c2 }}>{l2}</div>
              </div>
            )}
          </div>
          {/* pantulan kaca */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(115deg, rgba(255,255,255,0.09), transparent 38%, transparent 70%, rgba(255,255,255,0.04))" }} />
        </div>
      </div>

      {/* kilat putih-biru saat menembus layar */}
      <div ref={flashRef} aria-hidden className="pointer-events-none absolute inset-0" style={{ opacity: 0, background: "radial-gradient(circle at center, #ffffff 0%, #a5d8ff 45%, #2563eb 100%)" }} />

      {/* vignette sinematik (tidak menghalangi klik) */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)" }} />
      <style>{`@keyframes intro-blink{50%{opacity:0}}@keyframes intro-in{from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
