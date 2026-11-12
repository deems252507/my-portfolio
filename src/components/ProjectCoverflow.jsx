import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { toSlug } from "../utils/slug";

/**
 * Coverflow 3D untuk HP / layar sentuh.
 *  - Slide otomatis tiap ±2,6 detik dan berputar melingkar (tanpa lompatan).
 *    Berhenti saat disentuh dan lanjut lagi 5 detik kemudian; berhenti juga saat
 *    section tidak terlihat atau tab browser disembunyikan. Ada tombol jeda/putar.
 *    Otomatis nonaktif jika perangkat memakai pengaturan "kurangi gerakan".
 *  - Geser kiri-kanan untuk pindah project; kartu berhenti pas di tengah.
 *  - Ketuk kartu tengah untuk membuka detail; ketuk kartu samping untuk memajukannya.
 *  - Scroll vertikal halaman tetap normal (touch-action: pan-y).
 *  - Posisi kartu dihitung lewat ref (tanpa re-render tiap gerakan jari) supaya ringan.
 */

const CARD_W = 230;
const CARD_H = 330;
const DRAG_PX_PER_CARD = 130;
const AUTOPLAY_MS = 2600;
const RESUME_AFTER_MS = 5000;

const getImg = (p) => p.img || p.Img || p.image || "";
const getTitle = (p) => p.title || p.Title || "";
const getDesc = (p) => p.description || p.Description || "";
const getLink = (p) => p.link || p.Link || "";
const getTech = (p) => {
  const t = p.tech_stack || p.TechStack;
  if (Array.isArray(t)) return t.map((s) => String(s).trim()).filter(Boolean);
  if (typeof t === "string") return t.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (a, m) => ((a % m) + m) % m;
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ProjectCoverflow({ projects = [] }) {
  const navigate = useNavigate();
  const n = projects.length;
  const loop = n >= 3;

  const stageRef = useRef(null);
  const cardRefs = useRef([]);
  const prevO = useRef([]);
  const posRef = useRef(0);
  const snapRef = useRef(true);
  const drag = useRef({ active: false, startX: 0, startPos: 0, moved: 0 });
  const pausedUntil = useRef(0);
  const inView = useRef(true);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const idxOf = useCallback(
    (p) => (loop ? mod(Math.round(p), n) : clamp(Math.round(p), 0, Math.max(0, n - 1))),
    [loop, n]
  );

  const apply = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduce = prefersReduced();
    const W = stage.clientWidth || 360;
    const step = Math.min(130, W * 0.3);
    const pos = posRef.current;
    cardRefs.current.forEach((el, k) => {
      if (!el) return;
      const raw = k - pos;
      const o = loop ? mod(raw + n / 2, n) - n / 2 : raw;
      const prev = prevO.current[k];
      const wrapped = prev !== undefined && Math.abs(o - prev) > n / 2;
      prevO.current[k] = o;
      const a = Math.abs(o);
      const tx = Math.sign(o) * (a <= 1 ? a * step : step + (a - 1) * step * 0.45);
      const ry = reduce ? 0 : -clamp(o, -1, 1) * 52;
      const tz = reduce ? 0 : -Math.min(a, 2) * 90;
      const s = 1 - Math.min(a, 1.5) * 0.06;
      el.style.transition =
        snapRef.current && !reduce && !wrapped
          ? "transform .55s cubic-bezier(.2,.9,.3,1), opacity .55s"
          : "none";
      el.style.transform = `translate3d(${tx}px,0,${tz}px) rotateY(${ry}deg) scale(${s})`;
      el.style.opacity = a > 3 ? 0 : 1 - Math.min(a, 2) * 0.3;
      el.style.zIndex = String(100 - Math.round(a * 10));
    });
  }, [loop, n]);

  const snapTo = useCallback(
    (t) => {
      const target = loop ? t : clamp(t, 0, Math.max(0, n - 1));
      snapRef.current = true;
      posRef.current = target;
      apply();
      setIndex(idxOf(target));
    },
    [apply, idxOf, loop, n]
  );

  const goToIndex = (i) => {
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
    if (!loop) return snapTo(i);
    const cur = Math.round(posRef.current);
    const delta = mod(i - mod(cur, n) + n / 2, n) - n / 2;
    return snapTo(cur + delta);
  };

  useEffect(() => {
    posRef.current = loop
      ? posRef.current
      : clamp(posRef.current, 0, Math.max(0, n - 1));
    prevO.current = [];
    setIndex(idxOf(posRef.current));
    apply();
    window.addEventListener("resize", apply, { passive: true });
    return () => window.removeEventListener("resize", apply);
  }, [n, loop, apply, idxOf]);

  // Hanya jalan saat section terlihat di layar
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Slide otomatis
  useEffect(() => {
    if (n < 2 || !playing || prefersReduced()) return undefined;
    const id = setInterval(() => {
      if (document.hidden || !inView.current || drag.current.active) return;
      if (Date.now() < pausedUntil.current) return;
      const cur = Math.round(posRef.current);
      snapTo(loop ? cur + 1 : cur >= n - 1 ? 0 : cur + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [n, playing, loop, snapTo]);

  const openProject = (p) => {
    const title = getTitle(p);
    const link = getLink(p);
    if (p.id != null) navigate(`/project/${toSlug(title)}`);
    else if (link) window.open(link, "_blank", "noopener,noreferrer");
  };

  const onPointerDown = (e) => {
    drag.current = {
      active: true,
      startX: e.clientX,
      startPos: posRef.current,
      moved: 0,
    };
    snapRef.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.max(d.moved, Math.abs(dx));
    const next = d.startPos - dx / DRAG_PX_PER_CARD;
    posRef.current = loop ? next : clamp(next, -0.3, n - 0.7);
    apply();
  };

  const onPointerEnd = (e) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
    if (d.moved < 6 && e.type === "pointerup") {
      const rect = stageRef.current.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const current = Math.round(posRef.current);
      if (Math.abs(x) <= CARD_W / 2) openProject(projects[idxOf(current)]);
      else snapTo(current + (x > 0 ? 1 : -1));
    } else {
      snapTo(Math.round(posRef.current));
    }
  };

  const onKeyDown = (e) => {
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
    const cur = Math.round(posRef.current);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      snapTo(cur + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      snapTo(cur - 1);
    } else if (e.key === "Enter") {
      openProject(projects[idxOf(cur)]);
    }
  };

  if (!n) {
    return (
      <p className="text-center py-16" style={{ color: "var(--col-muted)" }}>
        Belum ada project.
      </p>
    );
  }

  return (
    <div className="w-full" data-no-tab-swipe>
      <div
        ref={stageRef}
        role="group"
        aria-roledescription="carousel"
        aria-label="Daftar project"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => {
          pausedUntil.current = Date.now() + RESUME_AFTER_MS;
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="relative w-full overflow-hidden select-none outline-none"
        style={{
          height: CARD_H + 40,
          perspective: 900,
          touchAction: "pan-y",
          cursor: "grab",
        }}
      >
        {projects.map((p, k) => {
          const img = getImg(p);
          const tech = getTech(p).slice(0, 2);
          return (
            <div
              key={p.id ?? k}
              ref={(el) => {
                cardRefs.current[k] = el;
              }}
              className="absolute left-1/2 top-5 rounded-2xl overflow-hidden"
              style={{
                width: CARD_W,
                height: CARD_H,
                marginLeft: -CARD_W / 2,
                background: "color-mix(in srgb, var(--col-bg2) 92%, white)",
                border: "1px solid var(--col-border)",
                backfaceVisibility: "hidden",
                willChange: "transform",
              }}
            >
              <div className="w-full" style={{ height: "46%", background: "var(--col-bg2)" }}>
                {img && (
                  <img
                    src={img}
                    alt={getTitle(p)}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                )}
              </div>
              <div className="p-4 flex flex-col gap-2" style={{ height: "54%" }}>
                <h3
                  className="text-lg font-semibold leading-tight truncate"
                  style={{ fontFamily: "var(--font-display)", color: "var(--col-white)" }}
                >
                  {getTitle(p)}
                </h3>
                <p
                  className="text-xs leading-relaxed line-clamp-3"
                  style={{ color: "var(--col-muted)" }}
                >
                  {getDesc(p)}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {tech.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-full text-[10px]"
                        style={{
                          color: "var(--col-blue-light)",
                          background: "color-mix(in srgb, var(--col-blue) 14%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--col-blue) 28%, transparent)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <span
                    aria-hidden="true"
                    className="flex-none w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ border: "1px solid var(--col-border)", color: "var(--col-white)" }}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {n > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            aria-label={playing ? "Jeda slide otomatis" : "Putar slide otomatis"}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ border: "1px solid var(--col-border)", color: "var(--col-muted)" }}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <div className="flex gap-2">
            {projects.map((p, k) => (
              <button
                key={p.id ?? k}
                type="button"
                aria-label={`Project ${k + 1}`}
                onClick={() => goToIndex(k)}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: k === index ? 22 : 8,
                  background:
                    k === index
                      ? "var(--col-blue)"
                      : "color-mix(in srgb, var(--col-muted) 40%, transparent)",
                }}
              />
            ))}
          </div>
        </div>
      )}
      <p className="text-center text-xs mt-3" style={{ color: "var(--col-muted)" }}>
        Geser untuk melihat project lain, ketuk kartu untuk detail
      </p>
    </div>
  );
}
