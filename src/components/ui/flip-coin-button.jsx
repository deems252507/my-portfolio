import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * FlipCoinButton — tombol dengan koin 3D yang membesar, lalu jatuh & berputar saat diklik.
 * Diadaptasi dari komponen TSX (21st.dev) ke JSX, dengan perubahan:
 *  - animasi berbasis WAKTU (bukan jumlah frame) -> durasi sama di layar 60Hz maupun 144Hz;
 *  - class CSS diberi awalan "fcb-" supaya tidak bentrok dengan CSS situs;
 *  - CSS disertakan lewat <style> di komponen (tanpa efek samping saat import);
 *  - koin benar-benar 3D (ada ketebalan/tepi logam, perspektif, bayangan di bawah);
 *  - urutan animasi: koin KECIL di tombol -> MEMBESAR & naik (foto terlihat jelas) -> JATUH mengecil
 *    sambil berputar -> mendarat di tombol (foto menghadap atas) -> tombol menutup, "Suara hidup ✓";
 *  - sisi depan koin = FOTO (prop `photo`), posisi/zoom diatur dari admin (photoX, photoY, photoZoom),
 *    ukuran koin saat membesar lewat `bigScale`; sisi belakang ikon speaker;
 *  - callback `onFlip` (saat diklik) dan `onLanded` (koin mendarat), teks akhir lewat `thanks`.
 */
const FLIP_MS = 2600; // total lama animasi koin
const START_X = 3.9; // posisi awal koin di tombol (rem dari tengah, ke kanan)
const RISE = 6.5; // tinggi naik koin (rem)
const HOP = 0.7; // pantulan kecil saat mendarat (rem)
const GROW_END = 0.34; // porsi waktu untuk fase membesar + naik
const SLICES = 9; // jumlah lapisan tepi koin (ketebalan 3D)
const THICK = 0.4; // ketebalan koin (rem)

const smooth = (t) => t * t * (3 - 2 * t);

export default function FlipCoinButton({
  children,
  photo = "",
  photoX = 50,
  photoY = 30,
  photoZoom = 1,
  bigScale = 2.6,
  thanks = "Terima kasih!",
  onFlip,
  onLanded,
  className,
}) {
  const [clicked, setClicked] = useState(false);
  const [shrinkLanding, setShrinkLanding] = useState(false);
  const [coinLanded, setCoinLanded] = useState(false);
  const coinRef = useRef(null);
  const shadowRef = useRef(null);
  const raf = useRef(0);
  const timers = useRef([]);
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };

  const handleClick = () => {
    if (clicked) return;
    setClicked(true);
    onFlip?.(); // dipanggil sinkron di dalam klik (gestur pengguna) -> cocok untuk menyalakan suara
    later(flipCoin, 50);
  };

  const flipCoin = () => {
    const coin = coinRef.current;
    if (!coin) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const big = reduce ? 1.3 : Math.max(1.4, bigScale);
    const spin = reduce ? 0 : 1;
    const dur = reduce ? 900 : FLIP_MS;
    const set = (k, v) => coin.style.setProperty(k, `${v}`);
    const start = performance.now();
    let shrunk = false;

    const loop = (now) => {
      if (!coinRef.current) return;
      const p = Math.min(1, (now - start) / dur);
      let cx; let cy; let cs; let angle;

      if (p < GROW_END) {
        // FASE 1: koin membesar & naik; berputar satu kali penuh lalu berhenti menghadap depan (foto terlihat jelas)
        const a = p / GROW_END;
        const e = 1 - Math.pow(1 - a, 3);
        cx = START_X * (1 - e);
        cy = RISE * e;
        cs = 0.5 + (big - 0.5) * e;
        angle = spin * 2 * Math.PI * e;
      } else {
        // FASE 2: koin jatuh (makin cepat), mengecil ke ukuran awal, berputar 2x, lalu memantul kecil
        const b = (p - GROW_END) / (1 - GROW_END);
        const fall = Math.min(b / 0.85, 1);
        cx = 0;
        cy = RISE * (1 - fall * fall);
        cs = big - (big - 1) * smooth(fall);
        angle = spin * (2 * Math.PI + 4 * Math.PI * smooth(fall));
        if (b > 0.85) cy = HOP * Math.sin(Math.PI * ((b - 0.85) / 0.15));
      }

      const wobble = spin * 6 * Math.sin(p * Math.PI * 2) * (1 - p);
      const half = (angle + Math.PI / 2) % Math.PI;
      set("--cx", cx);
      set("--cy", cy);
      set("--cs", cs);
      set("--rx", `${(angle * 180) / Math.PI}deg`);
      set("--rz", `${wobble}deg`);
      set("--shade", Math.abs(Math.sin(angle)).toFixed(3));
      set("--shine-o", Math.max(0, 4 * Math.sin(half) - 3.2).toFixed(3));
      set("--shine-bg", `${-40 * (Math.cos(half) - 0.5)}%`);

      const sh = shadowRef.current;
      if (sh) {
        const h = Math.min(Math.max(cy, 0), RISE);
        sh.style.setProperty("--sx", cx);
        sh.style.setProperty("--ss", (cs * (1 - h / 11)).toFixed(3));
        sh.style.setProperty("--so", (0.55 * (1 - h / (RISE + 1))).toFixed(3));
      }

      if (p < 1) {
        if (!shrunk && p >= 0.9) { shrunk = true; setShrinkLanding(true); }
        raf.current = requestAnimationFrame(loop);
      } else {
        setCoinLanded(true);
        coin.style.setProperty("opacity", "0");
        sh?.style.setProperty("--so", "0");
        onLanded?.();
        later(() => {
          setClicked(false); setShrinkLanding(false); setCoinLanded(false);
          later(resetCoin, 300);
        }, 1500);
      }
    };
    raf.current = requestAnimationFrame(loop);
  };

  const resetCoin = () => {
    const coin = coinRef.current;
    if (!coin) return;
    const set = (k, v) => coin.style.setProperty(k, v);
    set("--cx", `${START_X}`); set("--cy", "0"); set("--cs", "0.5");
    set("--rx", "0deg"); set("--rz", "0deg"); set("--shade", "0");
    set("--shine-o", "0.4"); set("--shine-bg", "50%");
    set("opacity", "1");
  };

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
  }, []);

  const px = `${photoX}% ${photoY}%`;
  return (
    <button
      type="button"
      className={cn("fcb", { "is-clicked": clicked, "is-shrink": shrinkLanding, "is-landed": coinLanded }, className)}
      data-thanks={thanks}
      onClick={handleClick}
    >
      <style>{CSS}</style>
      <span className="fcb-text">{children}</span>
      <div className="fcb-wrap" aria-hidden="true">
        <div className="fcb-shadow" ref={shadowRef} />
        <div className="fcb-coin" ref={coinRef}>
          {Array.from({ length: SLICES }).map((_, i) => (
            <div
              key={i}
              className="fcb-edge"
              style={{ transform: `translateZ(${((i - (SLICES - 1) / 2) * (THICK / (SLICES - 1))).toFixed(4)}rem)` }}
            />
          ))}
          <div className="fcb-face fcb-back" style={{ transform: `rotateX(180deg) translateZ(${THICK / 2}rem)` }} />
          <div className="fcb-face fcb-front" style={{ transform: `translateZ(${THICK / 2}rem)` }}>
            <div className="fcb-clip">
              {photo && (
                <img
                  src={photo}
                  alt=""
                  draggable={false}
                  style={{ objectPosition: px, transformOrigin: px, transform: `scale(${photoZoom})` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

const SPEAKER = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23fcfaf9' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M11 5L6 9H2v6h4l5 4V5z' fill='%23fcfaf9'/><path d='M15.5 8.5a5 5 0 0 1 0 7'/><path d='M19 5a10 10 0 0 1 0 14'/></svg>\")";

const CSS = `
.fcb{background:none;border:0;border-radius:.25rem .25rem 0 0;cursor:pointer;font-family:var(--font-display,system-ui,sans-serif);font-size:.8rem;font-weight:700;letter-spacing:.06em;height:3rem;outline:0;position:relative;top:0;transform-origin:0% 100%;transition:transform 50ms ease-in-out;width:11.5rem;-webkit-tap-highlight-color:transparent}
.fcb:focus-visible{outline:2px solid #67e8f9;outline-offset:4px}
.fcb:active{transform:rotate(4deg)}
.fcb.is-clicked{animation:150ms ease-in-out 1 fcb-shake;pointer-events:none}
.fcb.is-clicked .fcb-text{opacity:0;transition:opacity 100ms linear 200ms}
.fcb.is-clicked::before{height:.5rem;width:60%}
.fcb.is-shrink::before{transition:width 200ms ease-in;width:0}
.fcb.is-landed::after{opacity:1;transform:scale(1);transform-origin:50% 100%}
.fcb.is-landed .fcb-wrap{background:radial-gradient(circle at 35% 97%,rgba(3,16,50,.4) .04rem,transparent .04rem),radial-gradient(circle at 45% 92%,rgba(3,16,50,.4) .04rem,transparent .02rem),radial-gradient(circle at 55% 98%,rgba(3,16,50,.4) .04rem,transparent .04rem),radial-gradient(circle at 65% 96%,rgba(3,16,50,.4) .06rem,transparent .06rem);background-position:center bottom;background-size:100%;bottom:-1rem;opacity:0;transform:scale(2) translateY(-10px)}
.fcb-text{color:#fff;margin-right:2.2rem;opacity:1;position:relative;transition:opacity 100ms linear 500ms;z-index:3;text-transform:uppercase}
.fcb::before{background:#031032;border-radius:.25rem;bottom:0;content:"";display:block;height:100%;left:50%;position:absolute;transform:translateX(-50%);transition:height 250ms ease-in-out 400ms,width 250ms ease-in-out 300ms;width:100%;z-index:2;box-shadow:0 0 28px rgba(34,211,238,.35),inset 0 0 0 1px rgba(120,220,255,.55)}
.fcb::after{bottom:-1.6rem;color:#9fe9ff;content:attr(data-thanks);height:110%;left:0;opacity:0;position:absolute;pointer-events:none;text-align:center;transform:scale(0);transform-origin:50% 20%;transition:transform 200ms cubic-bezier(0,0,.35,1.43);width:100%;z-index:1;font-size:.85rem;white-space:nowrap}
.fcb-wrap{background:none;bottom:0;height:18rem;left:0;opacity:1;overflow:visible;pointer-events:none;position:absolute;transform:none;transform-origin:50% 100%;transition:opacity 200ms linear 100ms,transform 300ms ease-out;width:100%}
.fcb-shadow{--sx:${START_X};--ss:.5;--so:0;position:absolute;left:50%;bottom:-1.25rem;width:3.5rem;height:.9rem;margin-left:-1.75rem;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.75),transparent 70%);filter:blur(2px);opacity:var(--so);transform:translateX(calc(var(--sx)*1rem)) scale(var(--ss));z-index:1}
.fcb-coin{--cx:${START_X};--cy:0;--cs:.5;--rx:0deg;--rz:0deg;--shade:0;--shine-o:.4;--shine-bg:50%;position:absolute;left:50%;bottom:-.45rem;width:3.5rem;height:3.5rem;margin-left:-1.75rem;transform-style:preserve-3d;transform:translate(calc(var(--cx)*1rem),calc(var(--cy)*-1rem)) scale(var(--cs)) perspective(480px) rotateZ(var(--rz)) rotateX(var(--rx));transition:opacity 100ms linear 200ms;z-index:3;will-change:transform}
.fcb-edge{position:absolute;inset:0;border-radius:50%;background:linear-gradient(180deg,#98a1be,#5b647f 55%,#444c66)}
.fcb-face{position:absolute;inset:0;border-radius:50%;box-sizing:border-box;padding:.2rem;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#c2cadf;box-shadow:inset 0 0 0 .06rem rgba(115,124,153,.65)}
.fcb-clip{position:absolute;inset:.2rem;border-radius:50%;overflow:hidden;background:linear-gradient(150deg,#22d3ee,#2563eb)}
.fcb-clip img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-drag:none}
.fcb-back{background:${SPEAKER} center/52% no-repeat,radial-gradient(circle at 50% 50%,#2563eb 0 50%,rgba(115,124,153,.4) 54%,#c2cadf 54%)}
.fcb-front::before{content:"";position:absolute;inset:0;border-radius:50%;z-index:3;pointer-events:none;background:radial-gradient(circle at 25% 65%,transparent 50%,rgba(255,255,255,.9) 90%),linear-gradient(55deg,transparent calc(var(--shine-bg) + 0%),#e9f4ff calc(var(--shine-bg) + 0%),transparent calc(var(--shine-bg) + 50%));opacity:var(--shine-o)}
.fcb-front::after,.fcb-back::after{content:"";position:absolute;inset:0;border-radius:50%;z-index:4;pointer-events:none;background:#020617;opacity:calc(var(--shade)*.5)}
@keyframes fcb-shake{0%{transform:rotate(4deg)}66%{transform:rotate(-4deg)}100%{transform:rotate(0deg)}}
@media (prefers-reduced-motion:reduce){.fcb.is-clicked{animation:none}}
`;
