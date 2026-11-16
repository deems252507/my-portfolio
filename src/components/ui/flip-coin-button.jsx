import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * FlipCoinButton — tombol dengan koin yang melambung & berputar saat diklik.
 * Diadaptasi dari komponen TSX (21st.dev) ke JSX, dengan perubahan:
 *  - animasi berbasis WAKTU (bukan jumlah frame) -> durasi sama di layar 60Hz maupun 144Hz;
 *  - class CSS diberi awalan "fcb-" supaya tidak bentrok dengan CSS situs;
 *  - CSS disertakan lewat <style> di komponen (tanpa efek samping saat import);
 *  - sisi depan koin bisa memakai FOTO (prop `photo`), sisi belakang ikon speaker;
 *  - callback `onFlip` (saat diklik) dan `onLanded` (koin mendarat), teks akhir lewat `thanks`.
 */
const FLIP_MS = 1500; // lama koin di udara

export default function FlipCoinButton({ children, photo = "", thanks = "Terima kasih!", onFlip, onLanded, className }) {
  const [clicked, setClicked] = useState(false);
  const [shrinkLanding, setShrinkLanding] = useState(false);
  const [coinLanded, setCoinLanded] = useState(false);
  const coinRef = useRef(null);
  const raf = useRef(0);
  const timers = useRef([]);
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };

  const handleClick = () => {
    if (clicked) return;
    setClicked(true);
    onFlip?.(); // dipanggil sinkron di dalam klik (gestur pengguna) -> cocok untuk menyalakan suara
    later(() => {
      const coin = coinRef.current;
      if (!coin) return;
      coin.style.setProperty("--coin-side-rotation-count", `${Math.floor(Math.random() * 5) * 90}`);
      coin.style.setProperty("--coin-max-flip-angle", `${(Math.floor(Math.random() * 4) + 3) * Math.PI}`);
      flipCoin();
    }, 50);
  };

  const flipCoin = () => {
    const coin = coinRef.current;
    if (!coin) return;
    const sideRotationCount = Number.parseInt(coin.style.getPropertyValue("--coin-side-rotation-count") || "0");
    const maxFlipAngle = Number.parseFloat(coin.style.getPropertyValue("--coin-max-flip-angle") || "0");
    const set = (k, v) => coin.style.setProperty(k, `${v}`);
    const start = performance.now();
    let shrunk = false;

    const loop = (now) => {
      if (!coinRef.current) return;
      const p = Math.min(1, (now - start) / FLIP_MS);
      const angle = -maxFlipAngle * Math.pow(p - 1, 2) + maxFlipAngle;

      set("--coin-y-multiplier", -11 * Math.pow(p * 2 - 1, 4) + 11);
      set("--coin-x-multiplier", p);
      set("--coin-scale-multiplier", p * 0.6);
      set("--coin-rotation-multiplier", p * sideRotationCount);
      set("--front-scale-multiplier", Math.max(Math.cos(angle), 0));
      set("--front-y-multiplier", Math.sin(angle));
      set("--middle-scale-multiplier", Math.abs(Math.cos(angle)));
      set("--middle-y-multiplier", Math.cos((angle + Math.PI / 2) % Math.PI));
      set("--back-scale-multiplier", Math.max(Math.cos(angle - Math.PI), 0));
      set("--back-y-multiplier", Math.sin(angle - Math.PI));
      set("--shine-opacity-multiplier", 4 * Math.sin((angle + Math.PI / 2) % Math.PI) - 3.2);
      set("--shine-bg-multiplier", `${-40 * (Math.cos((angle + Math.PI / 2) % Math.PI) - 0.5)}%`);

      if (p < 1) {
        if (!shrunk && p >= 1 - 6 / 90) { shrunk = true; setShrinkLanding(true); }
        raf.current = requestAnimationFrame(loop);
      } else {
        setCoinLanded(true);
        coin.style.setProperty("opacity", "0");
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
    coin.style.setProperty("--coin-x-multiplier", "0");
    coin.style.setProperty("--coin-scale-multiplier", "0");
    coin.style.setProperty("--coin-rotation-multiplier", "0");
    coin.style.setProperty("--shine-opacity-multiplier", "0.4");
    coin.style.setProperty("--shine-bg-multiplier", "50%");
    coin.style.setProperty("opacity", "1");
  };

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
  }, []);

  const safePhoto = photo ? photo.replace(/"/g, "%22") : "";
  return (
    <button
      type="button"
      className={cn("fcb", { "is-clicked": clicked, "is-shrink": shrinkLanding, "is-landed": coinLanded }, className)}
      data-thanks={thanks}
      onClick={handleClick}
      style={safePhoto ? { "--fcb-photo": `url("${safePhoto}")` } : undefined}
    >
      <style>{CSS}</style>
      <span className="fcb-text">{children}</span>
      <div className="fcb-wrap" aria-hidden="true">
        <div className="fcb-coin" ref={coinRef}>
          <div className="fcb-middle" />
          <div className={cn("fcb-back")} />
          <div className={cn("fcb-front", safePhoto && "fcb-photo")} />
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
.fcb.is-clicked .fcb-coin{transition:margin-bottom 1s linear 200ms;margin-bottom:0}
.fcb.is-shrink::before{transition:width 200ms ease-in;width:0}
.fcb.is-landed::after{opacity:1;transform:scale(1);transform-origin:50% 100%}
.fcb.is-landed .fcb-wrap{background:radial-gradient(circle at 35% 97%,rgba(3,16,50,.4) .04rem,transparent .04rem),radial-gradient(circle at 45% 92%,rgba(3,16,50,.4) .04rem,transparent .02rem),radial-gradient(circle at 55% 98%,rgba(3,16,50,.4) .04rem,transparent .04rem),radial-gradient(circle at 65% 96%,rgba(3,16,50,.4) .06rem,transparent .06rem);background-position:center bottom;background-size:100%;bottom:-1rem;opacity:0;transform:scale(2) translateY(-10px)}
.fcb-text{color:#fff;margin-right:2.2rem;opacity:1;position:relative;transition:opacity 100ms linear 500ms;z-index:3;text-transform:uppercase}
.fcb::before{background:#031032;border-radius:.25rem;bottom:0;content:"";display:block;height:100%;left:50%;position:absolute;transform:translateX(-50%);transition:height 250ms ease-in-out 400ms,width 250ms ease-in-out 300ms;width:100%;z-index:2;box-shadow:0 0 28px rgba(34,211,238,.35),inset 0 0 0 1px rgba(120,220,255,.55)}
.fcb::after{bottom:-1.6rem;color:#9fe9ff;content:attr(data-thanks);height:110%;left:0;opacity:0;position:absolute;pointer-events:none;text-align:center;transform:scale(0);transform-origin:50% 20%;transition:transform 200ms cubic-bezier(0,0,.35,1.43);width:100%;z-index:1;font-size:.85rem;white-space:nowrap}
.fcb-wrap{background:none;bottom:0;height:18rem;left:0;opacity:1;overflow:hidden;pointer-events:none;position:absolute;transform:none;transform-origin:50% 100%;transition:opacity 200ms linear 100ms,transform 300ms ease-out;width:100%}
.fcb-coin{--front-y-multiplier:0;--back-y-multiplier:0;--coin-y-multiplier:0;--coin-x-multiplier:0;--coin-scale-multiplier:0;--coin-rotation-multiplier:0;--shine-opacity-multiplier:.4;--shine-bg-multiplier:50%;--front-scale-multiplier:1;--middle-scale-multiplier:1;--back-scale-multiplier:0;bottom:calc(var(--coin-y-multiplier)*1rem - 3.5rem);height:3.5rem;margin-bottom:3.05rem;position:absolute;right:calc(var(--coin-x-multiplier)*34% + 16%);transform:translateX(50%) scale(calc(.4 + var(--coin-scale-multiplier))) rotate(calc(var(--coin-rotation-multiplier)*-1deg));transition:opacity 100ms linear 200ms;width:3.5rem;z-index:3}
.fcb-front,.fcb-middle,.fcb-back,.fcb-coin::before,.fcb-front::after,.fcb-back::after{border-radius:50%;box-sizing:border-box;height:100%;left:0;position:absolute;width:100%;z-index:3}
.fcb-front{background:radial-gradient(circle at 50% 50%,transparent 50%,rgba(115,124,153,.4) 54%,#c2cadf 54%),linear-gradient(150deg,#22d3ee,#2563eb);transform:translateY(calc(var(--front-y-multiplier)*.3181818182rem/2)) scaleY(var(--front-scale-multiplier))}
.fcb-front.fcb-photo{background:var(--fcb-photo) center/cover no-repeat,#8590b3;box-shadow:inset 0 0 0 .2rem #c2cadf,inset 0 0 0 .26rem rgba(115,124,153,.55)}
.fcb-front::after{background:rgba(0,0,0,.2);content:"";opacity:var(--front-y-multiplier)}
.fcb-middle{background:#737c99;transform:translateY(calc(var(--middle-y-multiplier)*.3181818182rem/2)) scaleY(var(--middle-scale-multiplier))}
.fcb-back{background:${SPEAKER} center/52% no-repeat,radial-gradient(circle at 50% 50%,transparent 50%,rgba(115,124,153,.4) 54%,#c2cadf 54%),#2563eb;transform:translateY(calc(var(--back-y-multiplier)*.3181818182rem/2)) scaleY(var(--back-scale-multiplier))}
.fcb-back::after{background:rgba(0,0,0,.2);content:"";opacity:var(--back-y-multiplier)}
.fcb-coin::before{background:radial-gradient(circle at 25% 65%,transparent 50%,rgba(255,255,255,.9) 90%),linear-gradient(55deg,transparent calc(var(--shine-bg-multiplier) + 0%),#e9f4ff calc(var(--shine-bg-multiplier) + 0%),transparent calc(var(--shine-bg-multiplier) + 50%));content:"";opacity:var(--shine-opacity-multiplier);transform:translateY(calc(var(--middle-y-multiplier)*.3181818182rem/-2)) scaleY(var(--middle-scale-multiplier)) rotate(calc(var(--coin-rotation-multiplier)*1deg));z-index:10}
.fcb-coin::after{background:#737c99;content:"";height:.3181818182rem;left:0;position:absolute;top:50%;transform:translateY(-50%);width:100%;z-index:2}
@keyframes fcb-shake{0%{transform:rotate(4deg)}66%{transform:rotate(-4deg)}100%{transform:rotate(0deg)}}
@media (prefers-reduced-motion:reduce){.fcb.is-clicked{animation:none}}
`;
