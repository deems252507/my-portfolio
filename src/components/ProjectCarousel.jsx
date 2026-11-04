import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, ArrowRight } from "lucide-react";
import { toSlug } from "../utils/slug";

/**
 * Carousel project.
 *  - Desktop/tablet (>= 640px): coverflow — kartu aktif di tengah, kartu samping mengecil.
 *  - Mobile (< 640px): daftar geser (scroll-snap) dengan satu kartu utama per layar,
 *    gambar di atas dan teks di bawah sehingga tidak ada teks yang menimpa gambar.
 */

const getImg = (p) => p.Img || p.img || p.image || "";
const getTitle = (p) => p.Title || p.title || "";
const getDesc = (p) => p.Description || p.description || "";
const getLink = (p) => p.Link || p.link || "";

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return isMobile;
}

function ProjectActions({ project, compact = false }) {
  const link = getLink(project);
  const size = compact ? "text-xs px-3 py-1.5" : "text-xs px-3.5 py-2";
  return (
    <div className="flex flex-wrap gap-2">
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1.5 font-medium rounded-lg ${size}`}
          style={{
            color: "var(--col-blue-light)",
            background: "color-mix(in srgb, var(--col-blue) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--col-blue) 35%, transparent)",
          }}
        >
          Live Demo <ExternalLink className="w-3 h-3" />
        </a>
      )}
      {project.id != null && (
        <Link
          to={`/project/${toSlug(getTitle(project))}`}
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1.5 font-medium rounded-lg ${size}`}
          style={{ color: "#fff", background: "var(--col-blue)" }}
        >
          Details <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function Dots({ n, active, onSelect }) {
  if (n < 2) return null;
  return (
    <div className="flex justify-center gap-2 mt-5">
      {Array.from({ length: n }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Slide ${i + 1}`}
          onClick={() => onSelect(i)}
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: i === active ? 22 : 8,
            background:
              i === active
                ? "var(--col-blue)"
                : "color-mix(in srgb, var(--col-muted) 40%, transparent)",
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────── Mobile: scroll-snap ───────────────────────── */
function MobileList({ projects }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const rafRef = useRef(0);

  const onScroll = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = trackRef.current;
      if (!el) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const c = child.offsetLeft + child.offsetWidth / 2;
        const d = Math.abs(c - center);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActive(best);
    });
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const scrollToIndex = (i) => {
    const el = trackRef.current;
    const child = el?.children[i];
    if (!el || !child) return;
    el.scrollTo({
      left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2,
      behavior: "smooth",
    });
  };

  return (
    <div className="w-full">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 px-[9%] hide-scrollbar"
        data-no-tab-swipe
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {projects.map((p, i) => (
          <article
            key={p.id || i}
            className="snap-center shrink-0 w-[82%] max-w-[360px] rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "color-mix(in srgb, var(--col-bg2) 92%, #000)",
              border: "1px solid var(--col-border)",
              boxShadow:
                i === active
                  ? "0 18px 40px color-mix(in srgb, var(--col-blue) 22%, transparent)"
                  : "0 8px 20px rgba(0,0,0,0.3)",
              opacity: i === active ? 1 : 0.8,
              transition: "opacity .3s ease, box-shadow .3s ease",
            }}
          >
            <div className="relative w-full aspect-[16/10] bg-black/30 overflow-hidden">
              {getImg(p) && (
                <img
                  src={getImg(p)}
                  alt={getTitle(p)}
                  loading="lazy"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              )}
            </div>
            <div className="p-4 flex flex-col gap-2 flex-1">
              <h3
                className="text-base font-bold leading-snug line-clamp-2"
                style={{ color: "var(--col-white)", fontFamily: "var(--font-display)" }}
              >
                {getTitle(p)}
              </h3>
              <p
                className="text-xs leading-relaxed line-clamp-3"
                style={{ color: "var(--col-muted)" }}
              >
                {getDesc(p)}
              </p>
              <div className="mt-auto pt-2">
                <ProjectActions project={p} compact />
              </div>
            </div>
          </article>
        ))}
      </div>
      <Dots n={projects.length} active={active} onSelect={scrollToIndex} />
    </div>
  );
}

/* ───────────────────────── Desktop: coverflow ───────────────────────── */
function Coverflow({ projects }) {
  const [active, setActive] = useState(0);
  const touchX = useRef(null);
  const n = projects.length;

  const go = useCallback(
    (dir) => {
      if (n < 1) return;
      setActive((i) => (i + dir + n) % n);
    },
    [n]
  );

  useEffect(() => {
    if (n < 2) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, n]);

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const arrowStyle = {
    background: "color-mix(in srgb, var(--col-bg) 70%, transparent)",
    border: "1px solid var(--col-border)",
    color: "var(--col-white)",
  };

  return (
    <div className="w-full max-w-5xl mx-auto select-none">
      <div
        className="relative w-full h-[440px] md:h-[480px] overflow-hidden rounded-2xl"
        style={{
          background: "color-mix(in srgb, var(--col-bg2) 80%, transparent)",
          boxShadow: "0 20px 50px color-mix(in srgb, var(--col-blue) 12%, transparent)",
        }}
        data-no-tab-swipe
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {projects.map((p, i) => {
          const offset = i - active;
          const abs = Math.abs(offset);
          const isActive = offset === 0;
          const x = offset * 44; // % dari lebar kartu
          const scale = isActive ? 1 : Math.max(0.6, 1 - abs * 0.16);
          const opacity = abs > 2 ? 0 : isActive ? 1 : 0.6 - abs * 0.12;

          return (
            <div
              role="button"
              tabIndex={isActive ? 0 : -1}
              key={p.id || i}
              onClick={() => setActive(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setActive(i);
              }}
              className="absolute top-1/2 left-1/2 overflow-hidden rounded-2xl text-left transition-all duration-500 ease-out focus:outline-none flex flex-col cursor-pointer"
              style={{
                width: 300,
                height: 390,
                transform: `translate(-50%, -50%) translateX(${x}%) scale(${scale})`,
                zIndex: 50 - abs,
                opacity,
                filter: abs >= 2 ? "blur(2px)" : "none",
                background: "color-mix(in srgb, var(--col-bg2) 94%, #000)",
                border: `1px solid ${
                  isActive
                    ? "color-mix(in srgb, var(--col-blue) 50%, transparent)"
                    : "var(--col-border)"
                }`,
                boxShadow: isActive
                  ? "0 25px 50px color-mix(in srgb, var(--col-blue) 25%, transparent)"
                  : "0 10px 30px rgba(0,0,0,0.35)",
                pointerEvents: abs > 2 ? "none" : "auto",
              }}
            >
              <div className="relative w-full h-[54%] bg-black/30 overflow-hidden shrink-0">
                {getImg(p) && (
                  <img
                    src={getImg(p)}
                    alt={getTitle(p)}
                    loading="lazy"
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                )}
              </div>
              <div className="p-4 flex flex-col gap-1.5 flex-1 min-h-0">
                <h3
                  className="text-base font-bold leading-snug line-clamp-2"
                  style={{ color: "var(--col-white)", fontFamily: "var(--font-display)" }}
                >
                  {getTitle(p)}
                </h3>
                {isActive && (
                  <>
                    <p
                      className="text-xs leading-relaxed line-clamp-2"
                      style={{ color: "var(--col-muted)" }}
                    >
                      {getDesc(p)}
                    </p>
                    <div className="mt-auto pt-1">
                      <ProjectActions project={p} />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition hover:scale-105"
              style={arrowStyle}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition hover:scale-105"
              style={arrowStyle}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      <Dots n={n} active={active} onSelect={setActive} />
    </div>
  );
}

export default function ProjectCarousel({ projects = [] }) {
  const isMobile = useIsMobile(640);

  if (!projects.length) {
    return (
      <p className="text-center text-sm py-16" style={{ color: "var(--col-muted)" }}>
        Belum ada project.
      </p>
    );
  }

  return isMobile ? <MobileList projects={projects} /> : <Coverflow projects={projects} />;
}
