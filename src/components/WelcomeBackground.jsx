import { useEffect, useRef, memo } from "react";
import Lightning from "./ui/Lightning";
import { getLightningSettings } from "../lib/siteContent";

/* ── Particles (stars) ── */
function ParticlesFX({ color = "#3b82f6", speed = 1 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let w, h;
    const count = window.innerWidth < 768 ? 40 : 70;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.0004 * speed,
      vy: (Math.random() - 0.5) * 0.0004 * speed,
      a: Math.random() * 0.6 + 0.2,
    }));
    const resize = () => {
      w = canvas.width = canvas.clientWidth * (window.devicePixelRatio > 1.5 ? 1.5 : 1);
      h = canvas.height = canvas.clientHeight * (window.devicePixelRatio > 1.5 ? 1.5 : 1);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = p.a;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, speed]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* ── Aurora gradient ── */
function AuroraFX({ color = "#3b82f6", speed = 1 }) {
  const duration = Math.max(6, 14 / speed);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute -inset-[40%] blur-3xl opacity-50"
        style={{
          background: `radial-gradient(ellipse at 30% 40%, ${color}88 0%, transparent 55%),
                       radial-gradient(ellipse at 70% 60%, #06b6d488 0%, transparent 50%),
                       radial-gradient(ellipse at 50% 20%, #a855f788 0%, transparent 45%)`,
          animation: `welcome-aurora ${duration}s ease-in-out infinite alternate`,
        }}
      />
      <style>{`
        @keyframes welcome-aurora {
          0% { transform: translate(-5%, -3%) rotate(0deg) scale(1); }
          100% { transform: translate(5%, 4%) rotate(8deg) scale(1.08); }
        }
      `}</style>
    </div>
  );
}

/* ── Cyber grid + scan ── */
function CyberFX({ color = "#3b82f6", speed = 1 }) {
  const scanDur = Math.max(2, 5 / speed);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
            linear-gradient(${color} 1px, transparent 1px),
            linear-gradient(90deg, ${color} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute left-0 right-0 h-[2px] opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          boxShadow: `0 0 20px ${color}`,
          animation: `welcome-scan ${scanDur}s linear infinite`,
        }}
      />
      <style>{`
        @keyframes welcome-scan {
          0% { top: -2%; }
          100% { top: 102%; }
        }
      `}</style>
    </div>
  );
}

/* ── Glow orbs ── */
function OrbsFX({ color = "#3b82f6", speed = 1 }) {
  const dur = Math.max(5, 10 / speed);
  const orbs = [
    { size: "40vw", top: "10%", left: "15%", delay: "0s", c: color },
    { size: "35vw", top: "55%", left: "60%", delay: "1.5s", c: "#06b6d4" },
    { size: "28vw", top: "30%", left: "45%", delay: "3s", c: "#a855f7" },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden">
      {orbs.map((o, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl opacity-40"
          style={{
            width: o.size,
            height: o.size,
            top: o.top,
            left: o.left,
            background: o.c,
            animation: `welcome-orb ${dur}s ease-in-out ${o.delay} infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes welcome-orb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(8%, -6%) scale(1.15); }
        }
      `}</style>
    </div>
  );
}

/* ── Matrix rain ── */
function MatrixFX({ color = "#22c55e", speed = 1 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, w, h;
    const chars = "01アイウエオカキクケコｱｲｳｴｵ<>{}[]#$%";
    const fontSize = 14;
    let columns = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.width = Math.floor(canvas.clientWidth * dpr);
      h = canvas.height = Math.floor(canvas.clientHeight * dpr);
      const cols = Math.floor(w / (fontSize * dpr));
      columns = Array.from({ length: cols }, () => Math.random() * h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const step = () => {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.font = `${fontSize * (w / (canvas.clientWidth || 1))}px monospace`;
      const fall = 8 * speed * (w / (canvas.clientWidth || 1));
      for (let i = 0; i < columns.length; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize * (w / (canvas.clientWidth || 1));
        ctx.fillText(ch, x, columns[i]);
        if (columns[i] > h && Math.random() > 0.975) columns[i] = 0;
        columns[i] += fall;
      }
      raf = requestAnimationFrame(step);
    };
    step();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [color, speed]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full opacity-70" />;
}

/* ── Ripple / wave ── */
function RippleFX({ color = "#3b82f6", speed = 1 }) {
  const dur = Math.max(2, 4 / speed);
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border opacity-30"
          style={{
            width: "20vmin",
            height: "20vmin",
            borderColor: color,
            animation: `welcome-ripple ${dur}s ease-out ${i * (dur / 4)}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes welcome-ripple {
          0% { transform: scale(0.4); opacity: 0.5; }
          100% { transform: scale(6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function WelcomeBackground({ content }) {
  const style = content?.welcome_bg_style || "lightning";
  const color = content?.welcome_fx_color || "#3b82f6";
  const speed = parseFloat(content?.welcome_fx_speed || "1") || 1;

  if (style === "none") return null;

  if (style === "lightning") {
    const lx = getLightningSettings(content);
    if (!lx.enabled) return null;
    return (
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <Lightning
          hue={lx.hue}
          xOffset={0}
          speed={lx.speed}
          intensity={lx.intensity}
          size={lx.size}
        />
      </div>
    );
  }

  const map = {
    particles: <ParticlesFX color={color} speed={speed} />,
    aurora: <AuroraFX color={color} speed={speed} />,
    cyber: <CyberFX color={color} speed={speed} />,
    orbs: <OrbsFX color={color} speed={speed} />,
    matrix: <MatrixFX color={color} speed={speed} />,
    ripple: <RippleFX color={color} speed={speed} />,
  };

  const fx = map[style];
  if (!fx) return null;

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none bg-[#030014]">
      {fx}
    </div>
  );
}

export default memo(WelcomeBackground);

export const WELCOME_BG_STYLES = [
  { id: "lightning", label: "Petir (Lightning)", desc: "WebGL petir dramatis" },
  { id: "particles", label: "Particles / Bintang", desc: "Titik cahaya mengambang" },
  { id: "aurora", label: "Aurora", desc: "Gradient lembut bergeser" },
  { id: "cyber", label: "Cyber Grid", desc: "Grid + scan line" },
  { id: "orbs", label: "Glow Orbs", desc: "Bola cahaya blur" },
  { id: "matrix", label: "Matrix Rain", desc: "Huruf/angka jatuh" },
  { id: "ripple", label: "Ripple / Wave", desc: "Gelombang dari tengah" },
  { id: "none", label: "Tanpa efek", desc: "Hanya teks + progress" },
];
