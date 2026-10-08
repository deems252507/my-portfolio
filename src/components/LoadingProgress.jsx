import { useState, useEffect } from "react";

export const LOADING_STYLES = [
  { id: "bar", label: "Bar Linear", desc: "Garis klasik" },
  { id: "capsule", label: "Capsule", desc: "Bar tebal rounded" },
  { id: "glow", label: "Glow Bar", desc: "Bar + cahaya" },
  { id: "circle", label: "Circle Ring", desc: "Lingkaran + %" },
  { id: "dots", label: "Dots", desc: "Titik bergeser" },
  { id: "segmented", label: "Segmented", desc: "Kotak-kotak" },
  { id: "minimal", label: "Minimal %", desc: "Hanya angka besar" },
  { id: "dual", label: "Dual Bar", desc: "Dua lapisan" },
  { id: "pulse", label: "Pulse Block", desc: "Blok berdenyut" },
  { id: "spinner", label: "Spinner + %", desc: "Putar + persen" },
];

export default function LoadingProgress({ content }) {
  const [progress, setProgress] = useState(0);

  const style = content?.loading_style || "bar";
  const duration = Math.max(1500, (parseFloat(content?.loading_duration) || 4) * 1000);
  const label = content?.loading_text || "Loading";
  const showPct = content?.loading_show_pct !== "false";
  const color = content?.loading_color || "#ffffff";
  const track = content?.loading_track || "rgba(255,255,255,0.1)";

  useEffect(() => {
    setProgress(0);
    const interval = 40;
    const steps = duration / interval;
    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setProgress(Math.min(100, Math.round((currentStep / steps) * 100)));
      if (currentStep >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [duration, style]);

  const pct = `${progress}%`;

  /* ── Circle ── */
  if (style === "circle") {
    const r = 42;
    const c = 2 * Math.PI * r;
    const offset = c - (progress / 100) * c;
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="6" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke={color} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
          {showPct && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold" style={{ color }}>
              {pct}
            </span>
          )}
        </div>
        {label && <span className="text-xs tracking-widest uppercase opacity-70" style={{ color }}>{label}</span>}
      </div>
    );
  }

  /* ── Dots ── */
  if (style === "dots") {
    const active = Math.floor((progress / 100) * 5);
    return (
      <div className="flex flex-col items-center gap-3">
        {label && <span className="text-xs tracking-widest uppercase font-mono" style={{ color }}>{label}{showPct ? ` ${pct}` : ""}</span>}
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-all duration-200"
              style={{
                background: i <= active ? color : track,
                boxShadow: i <= active ? `0 0 10px ${color}` : "none",
                transform: i === active ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Segmented ── */
  if (style === "segmented") {
    const segs = 12;
    const filled = Math.round((progress / 100) * segs);
    return (
      <div className="w-64 sm:w-80 mx-auto flex flex-col gap-3">
        <div className="flex justify-between text-xs font-mono tracking-widest" style={{ color }}>
          <span>{label}</span>
          {showPct && <span>{pct}</span>}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: segs }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-3 rounded-sm transition-all duration-150"
              style={{
                background: i < filled ? color : track,
                boxShadow: i < filled ? `0 0 8px ${color}66` : "none",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Minimal ── */
  if (style === "minimal") {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="font-mono text-4xl sm:text-5xl font-bold tabular-nums" style={{ color }}>
          {showPct ? pct : label}
        </span>
        {showPct && label && (
          <span className="text-xs tracking-[0.3em] uppercase opacity-60" style={{ color }}>{label}</span>
        )}
      </div>
    );
  }

  /* ── Dual bar ── */
  if (style === "dual") {
    return (
      <div className="w-64 sm:w-80 mx-auto flex flex-col gap-2">
        <div className="flex justify-between text-xs font-mono tracking-widest" style={{ color }}>
          <span>{label}</span>
          {showPct && <span>{pct}</span>}
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: track }}>
          <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: color }} />
        </div>
        <div className="w-full h-1 rounded-full overflow-hidden opacity-40" style={{ background: track }}>
          <div className="h-full rounded-full transition-all duration-150" style={{ width: `${Math.min(100, progress * 1.15)}%`, background: color }} />
        </div>
      </div>
    );
  }

  /* ── Pulse block ── */
  if (style === "pulse") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-mono text-sm font-bold"
          style={{
            background: `${color}22`,
            border: `1px solid ${color}55`,
            color,
            boxShadow: `0 0 ${12 + progress / 8}px ${color}44`,
            animation: "loading-pulse-block 1.2s ease-in-out infinite",
          }}
        >
          {showPct ? pct : "•••"}
        </div>
        {label && <span className="text-xs tracking-widest uppercase opacity-70" style={{ color }}>{label}</span>}
        <style>{`@keyframes loading-pulse-block { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }`}</style>
      </div>
    );
  }

  /* ── Spinner ── */
  if (style === "spinner") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-14 h-14">
          <div
            className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${color}33`, borderTopColor: color }}
          />
          {showPct && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold" style={{ color }}>
              {progress}
            </span>
          )}
        </div>
        {label && <span className="text-xs tracking-widest uppercase opacity-70" style={{ color }}>{label}</span>}
      </div>
    );
  }

  /* ── Capsule ── */
  if (style === "capsule") {
    return (
      <div className="w-64 sm:w-80 mx-auto flex flex-col gap-3">
        <div className="flex justify-between text-xs font-mono tracking-widest" style={{ color }}>
          <span>{label}</span>
          {showPct && <span>{pct}</span>}
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: track }}>
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%`, background: color, boxShadow: `0 0 12px ${color}` }}
          />
        </div>
      </div>
    );
  }

  /* ── Glow bar (default-like enhanced) ── */
  if (style === "glow") {
    return (
      <div className="w-64 sm:w-80 mx-auto flex flex-col gap-3">
        <div className="flex justify-between text-xs sm:text-sm font-mono font-bold tracking-widest" style={{ color }}>
          <span>{label}</span>
          {showPct && <span>{pct}</span>}
        </div>
        <div className="w-full h-[4px] rounded-full overflow-hidden relative" style={{ background: track }}>
          <div
            className="absolute top-0 bottom-0 left-0 w-full blur-[3px] opacity-60"
            style={{ background: color, transform: `translateX(${progress - 100}%)`, transition: "transform 0.1s linear" }}
          />
          <div
            className="h-full relative z-10 transition-all duration-100"
            style={{ width: `${progress}%`, background: color, boxShadow: `0 0 16px ${color}` }}
          />
        </div>
      </div>
    );
  }

  /* ── Default: bar linear ── */
  return (
    <div className="w-64 sm:w-80 mx-auto flex flex-col gap-3">
      <div className="flex justify-between text-xs sm:text-sm font-mono font-bold tracking-widest" style={{ color }}>
        <span>{label}</span>
        {showPct && <span>{pct}</span>}
      </div>
      <div className="w-full h-[3px] rounded-full overflow-hidden relative" style={{ background: track }}>
        <div
          className="absolute top-0 bottom-0 left-0 w-full blur-[2px] opacity-50"
          style={{ background: color, transform: `translateX(${progress - 100}%)`, transition: "transform 0.1s linear" }}
        />
        <div
          className="h-full transition-all duration-100"
          style={{ width: `${progress}%`, background: color, boxShadow: `0 0 12px ${color}88` }}
        />
      </div>
    </div>
  );
}
