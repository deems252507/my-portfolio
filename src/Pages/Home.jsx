import React, { useState, useEffect, useCallback, memo } from "react"
import { Helmet } from "react-helmet-async"
import { ExternalLink, ArrowRight } from "lucide-react"
import SpotifyCard from "../components/ui/spotify-card"
import IDCardLanyard from "../components/ui/id-card-lanyard"
import { useSiteContent } from "../context/SiteContentContext"
import { supabase } from "../supabase"
import { typingWords, getIdCardSettings } from "../lib/siteContent"

/* ── Constants ── */
const TYPING_SPEED   = 100
const ERASING_SPEED  = 50
const PAUSE_DURATION = 2000

/* ── Sub-components ── */

const HeroTitle = memo(({ line1, line2 }) => (
  <div className="space-y-1" data-aos="fade-up" data-aos-delay="400">
    <div
      className="text-[2.6rem] sm:text-6xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight grad-vi"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {line1}
    </div>
    <div
      className="text-[2.6rem] sm:text-6xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight text-white"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {line2}
    </div>
  </div>
))

/**
 * TypeWriter is isolated into its own component.
 * This way its rapid state updates (every 50-100ms) only re-render THIS
 * small component, not the entire Home page with Globe + Spotify card.
 */
const TypeWriter = memo(({ words }) => {
  const WORDS = words?.length ? words : [""]
  const [text, setText]         = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(0)

  const handleTyping = useCallback(() => {
    if (isTyping) {
      if (charIndex < WORDS[wordIndex].length) {
        setText(prev => prev + WORDS[wordIndex][charIndex])
        setCharIndex(prev => prev + 1)
      } else {
        setTimeout(() => setIsTyping(false), PAUSE_DURATION)
      }
    } else {
      if (charIndex > 0) {
        setText(prev => prev.slice(0, -1))
        setCharIndex(prev => prev - 1)
      } else {
        setWordIndex(prev => (prev + 1) % WORDS.length)
        setIsTyping(true)
      }
    }
  }, [charIndex, isTyping, wordIndex])

  useEffect(() => {
    const timeout = setTimeout(handleTyping, isTyping ? TYPING_SPEED : ERASING_SPEED)
    return () => clearTimeout(timeout)
  }, [handleTyping])

  return (
    <div className="h-8 flex items-center" data-aos="fade-up" data-aos-delay="600">
      <span className="text-lg md:text-xl text-blue-200 font-light tracking-wide">
        {text}
      </span>
      <span className="w-[2px] h-5 ml-1 rounded-full"
        style={{ background: "linear-gradient(to bottom, var(--col-blue), var(--col-accent))", animation: "blink 1s step-end infinite" }} />
    </div>
  )
})

const CTAButton = memo(({ href, text, icon: Icon, variant = "primary" }) => {
  const isPrimary = variant === "primary"
  return (
    <a href={href}>
      <button
        className="group relative flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.03]"
        style={{
          fontFamily: "var(--font-display)",
          ...(isPrimary
            ? { background: "var(--col-blue)", color: "#fff" }
            : {
                background: "transparent",
                color: "var(--col-muted)",
                border: "1px solid var(--col-border)",
              }),
        }}
      >
        <span>{text}</span>
        <Icon className={`w-4 h-4 transition-transform duration-300 ${isPrimary ? "group-hover:translate-x-0.5" : "group-hover:rotate-45"}`} />
      </button>
    </a>
  )
})

/* ── Statistik kecil di bawah ID card (desktop) ── */
function useCountUp(target, active, duration = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    const end = Number(target) || 0
    if (end <= 0) { setVal(0); return }
    let raf
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(end * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return val
}

const StatItem = memo(({ value, label, active }) => {
  const n = useCountUp(value, active)
  return (
    <div className="flex-1 text-center px-2">
      <div
        className="text-2xl font-bold tabular-nums leading-none"
        style={{ color: "var(--col-white)", fontFamily: "var(--font-display)" }}
      >
        {n}
        <span style={{ color: "var(--col-blue-light)" }}>+</span>
      </div>
      <div className="mt-1.5 text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--col-muted)" }}>
        {label}
      </div>
    </div>
  )
})

const StatsPanel = ({ style, thirdLabel, thirdValue }) => {
  const [counts, setCounts] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem("projects") || "[]")
      const c = JSON.parse(localStorage.getItem("certificates") || "[]")
      return { projects: p.length, certs: c.length }
    } catch {
      return { projects: 0, certs: 0 }
    }
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("certificates").select("id", { count: "exact", head: true }),
    ])
      .then(([p, c]) => {
        if (!alive) return
        setCounts((prev) => ({
          projects: p.count ?? prev.projects,
          certs: c.count ?? prev.certs,
        }))
      })
      .catch(() => {})
      .finally(() => alive && setReady(true))
    return () => { alive = false }
  }, [])

  return (
    <div
      className="absolute z-20 w-[280px] rounded-2xl px-3 py-4 backdrop-blur-md"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid var(--col-border)",
        boxShadow: "0 18px 40px -18px color-mix(in srgb, var(--col-blue) 35%, transparent)",
        ...style,
      }}
      data-aos="fade-up"
      data-aos-delay="1300"
    >
      <div className="flex items-stretch">
        <StatItem value={counts.projects} label="Projects" active={ready} />
        <div className="w-px self-stretch" style={{ background: "var(--col-border)" }} />
        <StatItem value={counts.certs} label="Certificates" active={ready} />
        <div className="w-px self-stretch" style={{ background: "var(--col-border)" }} />
        <StatItem value={thirdValue} label={thirdLabel} active={ready} />
      </div>
    </div>
  )
}

/* ── Main Component ── */
const Home = () => {
  const { content } = useSiteContent()
  // Desktop (lg+): kartu ID menggantung di sisi kanan hero.
  // Mobile/tablet: kartu tampil sebagai blok sendiri di antara tombol & Spotify.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  )
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  const idEnabled = String(content.idcard_enabled) !== "false"
  const idc = getIdCardSettings(content)
  const words = typingWords(content)
  const subtitle = content.hero_subtitle

  const cardProps = {
    name: content.full_name,
    role: content.job_title,
    brand: content.idcard_brand,
    brandTagline: content.idcard_tagline,
    idNumber: content.idcard_number,
    location: content.idcard_location,
    validThru: content.idcard_valid,
    site: content.idcard_site,
    photo: content.idcard_photo || content.profile_photo,
    githubUrl: content.github,
    linkedinUrl: content.linkedin,
    instagramUrl: content.instagram,
    photoHeight: idc.photoHeight,
    photoX: idc.photoX,
    photoY: idc.photoY,
    photoZoom: idc.photoZoom,
  }
  // tinggi kartu = 460 + (tinggi foto - 112); blok mobile = tali + kartu + sedikit ruang
  const MOBILE_ROPE = 90
  const mobileBlockHeight = MOBILE_ROPE + 460 + (idc.photoHeight - 112) + 36

  return (
    <>
      <Helmet>
        <title>{content.full_name} | Portofolio</title>
        <meta name="description" content={content.meta_description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://rizkydm.vercel.app" />
        <meta property="og:title"       content={`${content.full_name} | Portofolio`} />
        <meta property="og:description" content={content.meta_description} />
        <meta property="og:url"         content="https://rizkydm.vercel.app" />
        <meta property="og:type"        content="website" />
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": "${content.full_name}",
            "jobTitle": "${content.job_title}",
            "url": "https://rizkydm.vercel.app",
            "sameAs": ${JSON.stringify([content.github, content.linkedin, content.instagram].filter(Boolean))}
          }
        `}</script>
      </Helmet>

      <div
        className="min-h-screen overflow-x-clip px-[5%] sm:px-[6%] lg:px-[8%] xl:px-[10%] relative"
        id="Home"
      >
        {idEnabled && isDesktop && (
          <IDCardLanyard
            mode="section"
            anchorX={`${idc.anchorX}%`}
            anchorY={0}
            zIndex={20}
            {...cardProps}
          />
        )}
        {idEnabled && isDesktop && String(content.stats_enabled) !== "false" && (
          <StatsPanel
            thirdLabel={content.stats_third_label || "Tech Stack"}
            thirdValue={content.stats_third_value || "0"}
            style={{
              left: `${idc.anchorX}%`,
              top: 140 + 460 + (idc.photoHeight - 112) + 28,
              transform: "translateX(-50%)",
            }}
          />
        )}
        <div className="relative z-10">
          <div className="container mx-auto min-h-screen flex items-center justify-center">
            <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen pt-28 pb-12 lg:pt-24 lg:pb-8 gap-8 lg:gap-16 md:justify-between w-full">

              {/* ─── Left Column ─── */}
              <div className="w-full lg:w-[55%] xl:w-1/2 space-y-5 sm:space-y-6 text-left order-1">
                <HeroTitle line1={content.hero_line_1} line2={content.hero_line_2} />
                {/* TypeWriter is isolated so only it re-renders, not the whole page */}
                <TypeWriter key={words.join('|')} words={words} />

                {/* Description */}
                <p
                  className="text-sm sm:text-base lg:text-[0.95rem] xl:text-lg max-w-xl leading-relaxed font-light"
                  style={{ color: "var(--col-muted)" }}
                  data-aos="fade-up" data-aos-delay="700"
                >
                  {subtitle}
                </p>

                {/* CTA */}
                <div
                  className="flex flex-wrap items-center gap-3"
                  data-aos="fade-up" data-aos-delay="900"
                >
                  <CTAButton href="#Portofolio" text="Project"    icon={ExternalLink} variant="primary" />
                  <CTAButton href="#Contact"    text="Contact Me" icon={ArrowRight}   variant="secondary" />

                </div>

                {/* ID card — hanya mobile/tablet, blok sendiri supaya tidak menimpa teks */}
                {idEnabled && !isDesktop && (
                  <div
                    className="relative mx-auto w-full max-w-[420px]"
                    style={{ height: mobileBlockHeight }}
                  >
                    <IDCardLanyard
                      mode="section"
                      anchorX="50%"
                      anchorY={0}
                      ropeLength={MOBILE_ROPE}
                      zIndex={5}
                      hintText="Geser untuk berayun · Ketuk untuk membalik"
                      {...cardProps}
                    />
                  </div>
                )}

                {/* Spotify ringkas — selalu di bawah, lebar menyesuaikan perangkat */}
                {idEnabled && (
                  <div data-aos="fade-up" data-aos-delay="1100" className="w-full max-w-[420px] mx-auto lg:mx-0">
                    <SpotifyCard compact className="w-full" />
                  </div>
                )}
              </div>

              {/* ─── Right Column — Spotify penuh (hanya jika ID card dimatikan) ─── */}
              {!idEnabled && (
                <div
                  className="w-full lg:w-1/2 relative flex items-center justify-center lg:justify-end order-2 lg:min-h-[650px] lg:translate-x-12"
                  data-aos="fade-left" data-aos-delay="500"
                >
                  <SpotifyCard className="relative z-10" />
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default memo(Home)
