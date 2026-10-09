import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, ArrowRight } from "lucide-react";
import { toSlug } from "../utils/slug";

/**
 * Carousel slider + card expansion (coverflow style)
 * Inspired by stacked card carousels — active card large, sides scaled down.
 */
export default function ProjectCarousel({ projects = [] }) {
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

  if (!n) {
    return (
      <p className="text-center text-sm py-16" style={{ color: "var(--col-muted)" }}>
        Belum ada project.
      </p>
    );
  }

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto select-none">
      {/* Stage */}
      <div
        className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] overflow-hidden rounded-2xl"
        style={{
          background: "color-mix(in srgb, var(--col-bg2) 80%, transparent)",
          boxShadow: "0 20px 50px color-mix(in srgb, var(--col-blue) 12%, transparent)",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {projects.map((p, i) => {
          const offset = i - active;
          // wrap for seamless feel on ends not needed for absolute offset
          const abs = Math.abs(offset);
          const isActive = offset === 0;
          // position: center + offset * step
          const x = offset * (isMobileWidth() ? 55 : 42); // %
          const scale = isActive ? 1 : Math.max(0.55, 1 - abs * 0.18);
          const z = 50 - abs;
          const opacity = abs > 2 ? 0 : isActive ? 1 : 0.55 - abs * 0.1;
          const blur = abs >= 2 ? 2 : 0;

          return (
            <button
              type="button"
              key={p.id || i}
              onClick={() => setActive(i)}
              className="absolute top-1/2 left-1/2 overflow-hidden rounded-2xl border text-left transition-all duration-500 ease-out focus:outline-none"
              style={{
                width: "min(280px, 72vw)",
                height: "min(360px, 78%)",
                transform: `translate(-50%, -50%) translateX(${x}%) scale(${scale})`,
                zIndex: z,
                opacity,
                filter: blur ? `blur(${blur}px)` : "none",
                borderColor: isActive
                  ? "color-mix(in srgb, var(--col-blue) 50%, transparent)"
                  : "var(--col-border)",
                boxShadow: isActive
                  ? "0 25px 50px color-mix(in srgb, var(--col-blue) 25%, transparent)"
                  : "0 10px 30px rgba(0,0,0,0.35)",
                pointerEvents: abs > 2 ? "none" : "auto",
              }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${p.Img || p.img || p.image || ""})`,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)",
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <h3
                  className="text-base sm:text-lg font-bold line-clamp-2"
                  style={{ color: "var(--col-white)", fontFamily: "var(--font-display)" }}
                >
                  {p.Title || p.title}
                </h3>
                {isActive && (
                  <p
                    className="mt-1.5 text-xs sm:text-sm line-clamp-2 opacity-90"
                    style={{ color: "var(--col-muted)" }}
                  >
                    {p.Description || p.description}
                  </p>
                )}
                {isActive && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(p.Link || p.link) && (
                      <a
                        href={p.Link || p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                        style={{
                          color: "var(--col-blue-light)",
                          background: "color-mix(in srgb, var(--col-blue) 15%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--col-blue) 35%, transparent)",
                        }}
                      >
                        Live Demo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {p.id != null && (
                      <Link
                        to={`/project/${toSlug(p.Title || p.title)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg"
                        style={{
                          color: "var(--col-white)",
                          background: "var(--col-blue)",
                        }}
                      >
                        Details <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Arrows */}
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous"
              onClick={() => go(-1)}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition hover:scale-105"
              style={{
                background: "color-mix(in srgb, var(--col-bg) 70%, transparent)",
                border: "1px solid var(--col-border)",
                color: "var(--col-white)",
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => go(1)}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-[60] w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition hover:scale-105"
              style={{
                background: "color-mix(in srgb, var(--col-bg) 70%, transparent)",
                border: "1px solid var(--col-border)",
                color: "var(--col-white)",
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {n > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          {projects.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setActive(i)}
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
      )}
    </div>
  );
}

function isMobileWidth() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 640;
}
