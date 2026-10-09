import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, User, Briefcase, Mail } from "lucide-react";
import { useSiteContent } from "../context/SiteContentContext";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const navItems = [
  { name: "Home", url: "#Home", icon: Home },
  { name: "About", url: "#About", icon: User },
  { name: "Portfolio", url: "#Portofolio", icon: Briefcase },
  { name: "Contact", url: "#Contact", icon: Mail },
];

/** Built-in CSS panda (default) + image mascots from /public */
export const NAV_MASCOTS = [
  { id: "panda", label: "Panda (default)", type: "css" },
  { id: "turtle", label: "Turtle", type: "img", src: "/turtle-svgrepo-com.png" },
  { id: "bear", label: "Bear", type: "img", src: "/bear-svgrepo-com.png" },
  { id: "july", label: "4th July", type: "img", src: "/4th-july.png" },
  { id: "cash", label: "Cash", type: "img", src: "/cash-svgrepo-com.png" },
  { id: "profit", label: "Profit", type: "img", src: "/profit-svgrepo-com.png" },
  { id: "custom", label: "Custom URL", type: "custom" },
  { id: "none", label: "Tanpa maskot", type: "none" },
];

function PandaMascot({ hovering }) {
  return (
    <div className="relative w-10 h-10 sm:w-11 sm:h-11">
      <motion.div
        className="absolute inset-0 rounded-full bg-white shadow-md"
        animate={
          hovering
            ? { scale: [1, 1.08, 1], rotate: [0, -6, 6, 0], transition: { duration: 0.45 } }
            : { y: [0, -4, 0], transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }
        }
      >
        {/* ears */}
        <span className="absolute -top-1 left-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-black" />
        <span className="absolute -top-1 right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-black" />
        {/* eyes */}
        <motion.span
          className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-black"
          style={{ left: "28%", top: "38%" }}
          animate={hovering ? { scaleY: [1, 0.15, 1], transition: { duration: 0.25 } } : {}}
        />
        <motion.span
          className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-black"
          style={{ right: "28%", top: "38%" }}
          animate={hovering ? { scaleY: [1, 0.15, 1], transition: { duration: 0.25 } } : {}}
        />
        {/* blush */}
        <span className="absolute w-2 h-1.5 rounded-full bg-pink-300/70" style={{ left: "12%", top: "55%" }} />
        <span className="absolute w-2 h-1.5 rounded-full bg-pink-300/70" style={{ right: "12%", top: "55%" }} />
        {/* smile */}
        <motion.span
          className="absolute w-3.5 h-2 border-b-2 border-black rounded-full"
          style={{ left: "50%", top: "58%", transform: "translateX(-50%)" }}
          animate={hovering ? { scaleY: 1.4, y: -1 } : { scaleY: 1, y: 0 }}
        />
        <AnimatePresence>
          {hovering && (
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -top-2 -right-2 text-xs"
            >
              ✨
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ImageMascot({ src, hovering }) {
  return (
    <motion.div
      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
      animate={
        hovering
          ? { scale: [1, 1.12, 1], rotate: [0, -8, 8, 0], transition: { duration: 0.5 } }
          : { y: [0, -5, 0], transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" } }
      }
    >
      <img
        src={src}
        alt="mascot"
        className="w-full h-full object-contain drop-shadow-md pointer-events-none select-none"
        draggable={false}
      />
    </motion.div>
  );
}

export default function Navbar({ defaultActive = "Home" }) {
  const { content } = useSiteContent();
  const [mounted, setMounted] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const [activeTab, setActiveTab] = useState(defaultActive);
  const isScrolling = React.useRef(false);

  const mascotId = content.nav_mascot || "panda";
  const mascotCustom = content.nav_mascot_url || "";
  const mascotMeta = NAV_MASCOTS.find((m) => m.id === mascotId) || NAV_MASCOTS[0];
  const showMascot = mascotMeta.type !== "none";
  const mascotSrc =
    mascotMeta.type === "custom"
      ? mascotCustom
      : mascotMeta.type === "img"
        ? mascotMeta.src
        : null;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleScroll = () => {
      if (isScrolling.current) return;
      const sections = navItems
        .map((item) => {
          const section = document.querySelector(item.url);
          if (section) {
            return { id: item.name, offset: section.offsetTop - 550, height: section.offsetHeight };
          }
          return null;
        })
        .filter(Boolean);
      const currentPosition = window.scrollY;
      const active = sections.find(
        (s) => currentPosition >= s.offset && currentPosition < s.offset + s.height
      );
      if (active) setActiveTab(active.id);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e, url, name) => {
    e.preventDefault();
    const section = document.querySelector(url);
    if (section) {
      isScrolling.current = true;
      setActiveTab(name);
      window.scrollTo({ top: section.offsetTop - 80, behavior: "smooth" });
      setTimeout(() => {
        isScrolling.current = false;
      }, 1000);
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed top-3 sm:top-5 left-0 right-0 z-[9999] px-2 pointer-events-none">
      <div className="flex justify-center pt-4 sm:pt-6">
        <motion.div
          className="pointer-events-auto flex items-center gap-1 sm:gap-2 backdrop-blur-lg py-1.5 px-1.5 sm:py-2 sm:px-2 rounded-full shadow-lg relative"
          style={{
            background: "color-mix(in srgb, var(--col-bg2) 75%, transparent)",
            border: "1px solid var(--col-border)",
          }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.name;
            const isHovered = hoveredTab === item.name;

            return (
              <a
                key={item.name}
                href={item.url}
                onClick={(e) => scrollToSection(e, item.url, item.name)}
                onMouseEnter={() => setHoveredTab(item.name)}
                onMouseLeave={() => setHoveredTab(null)}
                className={cn(
                  "relative cursor-pointer text-[11px] sm:text-xs md:text-sm font-semibold px-3 py-2 sm:px-4 md:px-6 md:py-3 rounded-full transition-all duration-300",
                  isActive ? "text-white" : "hover:opacity-100"
                )}
                style={{
                  color: isActive ? "var(--col-white)" : "color-mix(in srgb, var(--col-muted) 85%, transparent)",
                }}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full -z-10 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.35, 0.55, 0.35], scale: [1, 1.03, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div
                      className="absolute inset-0 rounded-full blur-md"
                      style={{ background: "color-mix(in srgb, var(--col-blue) 30%, transparent)" }}
                    />
                    <div
                      className="absolute inset-[-6px] rounded-full blur-xl"
                      style={{ background: "color-mix(in srgb, var(--col-blue) 18%, transparent)" }}
                    />
                  </motion.div>
                )}

                <span className="relative z-10">{item.name}</span>

                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 rounded-full -z-10"
                      style={{ background: "color-mix(in srgb, var(--col-white) 10%, transparent)" }}
                    />
                  )}
                </AnimatePresence>

                {isActive && showMascot && (
                  <motion.div
                    layoutId="nav-mascot"
                    className="absolute -top-11 sm:-top-12 left-1/2 -translate-x-1/2 pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  >
                    {mascotMeta.type === "css" ? (
                      <PandaMascot hovering={!!hoveredTab} />
                    ) : mascotSrc ? (
                      <ImageMascot src={mascotSrc} hovering={!!hoveredTab} />
                    ) : (
                      <PandaMascot hovering={!!hoveredTab} />
                    )}
                  </motion.div>
                )}
              </a>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
