import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { toSlug } from "../utils/slug";
import ProjectCoverflow from "./ProjectCoverflow";

/**
 * Daftar project interaktif (gaya "Project Showcase").
 *  - Desktop (mouse): gambar preview muncul dan mengikuti kursor dengan gerakan halus.
 *  - HP / layar sentuh: tidak ada hover, jadi diganti Coverflow 3D yang bisa digeser
 *    (lihat ProjectCoverflow.jsx). Ketuk kartu untuk membuka halaman detail project.
 *  - Mengikuti pengaturan "kurangi gerakan" milik perangkat.
 */

const PREVIEW_W = 280;
const PREVIEW_H = 180;

const getImg = (p) => p.img || p.Img || p.image || "";
const getTitle = (p) => p.title || p.Title || "";
const getDesc = (p) => p.description || p.Description || "";
const getLink = (p) => {
  const v = String(p.link || p.Link || "").trim();
  return v && !/^https?:\/\//i.test(v) ? `https://${v}` : v;
};
const getYear = (p) => {
  const d = p.created_at ? new Date(p.created_at) : null;
  return d && !Number.isNaN(d.getTime()) ? String(d.getFullYear()) : "";
};
const getTech = (p) => {
  const t = p.tech_stack || p.TechStack;
  if (Array.isArray(t)) return t.map((s) => String(s).trim()).filter(Boolean);
  if (typeof t === "string") return t.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function Row({ project, index, canHover, reduceMotion, onEnter }) {
  const title = getTitle(project);
  const year = getYear(project);
  const tech = getTech(project).slice(0, 3);
  const link = getLink(project);
  const to = project.id != null ? `/project/${toSlug(title)}` : null;

  const content = (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 -inset-x-3 md:-inset-x-5 rounded-2xl opacity-0 scale-[0.98] transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100 group-active:opacity-100 group-active:scale-100 pointer-events-none"
        style={{ background: "color-mix(in srgb, var(--col-blue) 8%, transparent)" }}
      />
      <div className="relative flex items-center gap-4 md:gap-6">
        <span
          className="hidden sm:block w-8 flex-none text-xs font-mono tabular-nums"
          style={{ color: "var(--col-muted)" }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="flex-1 min-w-0">
          <h3
            className="relative inline-block max-w-full text-xl md:text-3xl font-semibold tracking-tight truncate transition-transform duration-300 ease-out group-hover:translate-x-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--col-white)" }}
          >
            {title}
            <span
              aria-hidden="true"
              className="absolute left-0 -bottom-0.5 h-px w-0 transition-all duration-500 ease-out group-hover:w-full"
              style={{ background: "var(--col-blue-light)" }}
            />
          </h3>
          <p
            className="mt-1 text-sm leading-relaxed line-clamp-2"
            style={{ color: "var(--col-muted)" }}
          >
            {getDesc(project)}
          </p>
          {tech.length > 0 && (
            <div className="hidden md:flex flex-wrap gap-2 mt-3">
              {tech.map((t) => (
                <span
                  key={t}
                  className="px-2.5 py-0.5 rounded-full text-[11px]"
                  style={{
                    color: "var(--col-blue-light)",
                    background: "color-mix(in srgb, var(--col-blue) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--col-blue) 25%, transparent)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {year && (
          <span
            className="hidden sm:block flex-none text-xs font-mono tabular-nums"
            style={{ color: "var(--col-muted)" }}
          >
            {year}
          </span>
        )}
        <span
          aria-hidden="true"
          className="flex-none w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-active:scale-110"
          style={{ border: "1px solid var(--col-border)", color: "var(--col-white)" }}
        >
          <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </>
  );

  const cls =
    "group relative block py-5 md:py-7 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 rounded-lg";

  let el;
  if (to) {
    el = (
      <Link to={to} className={cls} aria-label={`Lihat detail ${title}`}>
        {content}
      </Link>
    );
  } else if (link) {
    el = (
      <a href={link} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    );
  } else {
    el = <div className={cls}>{content}</div>;
  }

  const common = {
    className: "relative border-t",
    style: { borderColor: "var(--col-border)" },
    onMouseEnter: canHover ? (e) => onEnter(index, e) : undefined,
  };

  // Link demo terpisah (bukan di dalam <Link> agar tidak ada <a> di dalam <a>)
  const demo = link && to ? (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 bottom-2 md:bottom-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors hover:text-white"
      style={{
        color: "var(--col-blue-light)",
        background: "color-mix(in srgb, var(--col-blue) 12%, transparent)",
        border: "1px solid color-mix(in srgb, var(--col-blue) 25%, transparent)",
      }}
    >
      <ExternalLink className="w-3 h-3" />
      Live Demo
    </a>
  ) : null;

  if (reduceMotion) return <li {...common}>{el}{demo}</li>;

  return (
    <motion.li
      {...common}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.07, ease: "easeOut" }}
    >
      {el}
      {demo}
    </motion.li>
  );
}

export default function ProjectShowcase({ projects = [], limit = 6 }) {
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [active, setActive] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const activeRef = useRef(null);
  const wrapRef = useRef(null);
  const previewRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  const updateTarget = useCallback((e) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    let x = px + 24;
    if (x + PREVIEW_W > r.width) x = px - PREVIEW_W - 24;
    target.current = { x: Math.max(0, x), y: py - PREVIEW_H / 2 };
    if (activeRef.current === null) current.current = { ...target.current };
  }, []);

  const handleEnter = useCallback(
    (i, e) => {
      updateTarget(e);
      activeRef.current = i;
      setActive(i);
    },
    [updateTarget]
  );

  const handleLeave = useCallback(() => {
    activeRef.current = null;
    setActive(null);
  }, []);

  const isActive = active !== null;
  useEffect(() => {
    if (!canHover || !isActive) return undefined;
    const k = reduceMotion ? 1 : 0.15;
    const tick = () => {
      const el = previewRef.current;
      if (el) {
        current.current.x += (target.current.x - current.current.x) * k;
        current.current.y += (target.current.y - current.current.y) * k;
        el.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canHover, isActive, reduceMotion]);

  if (!canHover) return <ProjectCoverflow projects={projects} />;

  const visible = showAll ? projects : projects.slice(0, limit);

  if (!projects.length) {
    return (
      <p className="text-center py-16" style={{ color: "var(--col-muted)" }}>
        Belum ada project.
      </p>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full max-w-3xl mx-auto"
      onMouseMove={canHover ? updateTarget : undefined}
      onMouseLeave={canHover ? handleLeave : undefined}
    >
      {canHover && (
        <div
          ref={previewRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-30"
          style={{ width: PREVIEW_W, height: PREVIEW_H, willChange: "transform" }}
        >
          <div
            className="relative w-full h-full overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: "var(--col-bg2)",
              border: "1px solid var(--col-border)",
              opacity: isActive ? 1 : 0,
              transform: `scale(${isActive ? 1 : 0.85})`,
              transition:
                "opacity .3s cubic-bezier(.4,0,.2,1), transform .3s cubic-bezier(.4,0,.2,1)",
            }}
          >
            {visible.map((p, i) =>
              getImg(p) ? (
                <img
                  key={p.id ?? i}
                  src={getImg(p)}
                  alt=""
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity: active === i ? 1 : 0,
                    transform: `scale(${active === i ? 1 : 1.1})`,
                    filter: active === i ? "none" : "blur(10px)",
                    transition: "opacity .5s ease-out, transform .5s ease-out, filter .5s ease-out",
                  }}
                />
              ) : null
            )}
          </div>
        </div>
      )}

      <ul className="list-none m-0 p-0">
        {visible.map((project, index) => (
          <Row
            key={project.id ?? index}
            project={project}
            index={index}
            canHover={canHover}
            reduceMotion={reduceMotion}
            onEnter={handleEnter}
          />
        ))}
      </ul>
      <div className="border-t" style={{ borderColor: "var(--col-border)" }} />
      {projects.length > limit && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: "var(--col-white)",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--col-border)",
            }}
          >
            {showAll ? "See Less" : "See More"}
          </button>
        </div>
      )}
    </div>
  );
}
