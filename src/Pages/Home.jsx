import React, { useState, useEffect, useCallback, memo } from "react"
import { Helmet } from "react-helmet-async"
import { ExternalLink, ArrowRight } from "lucide-react"
import SpotifyCard from "../components/ui/spotify-card"
import IDCardLanyard from "../components/ui/id-card-lanyard"
import { useSiteContent } from "../context/SiteContentContext"
import { typingWords, getIdCardSettings } from "../lib/siteContent"

/* ── Constants ── */
const TYPING_SPEED   = 100
const ERASING_SPEED  = 50
const PAUSE_DURATION = 2000

/* ── Sub-components ── */

/** Paragraf deskripsi: di HP/tablet dipotong 4 baris + tombol "Baca selengkapnya". Desktop tampil penuh. */
const ReadMoreText = ({ text, isDesktop, ...rest }) => {
  const [open, setOpen] = useState(false)
  const clamp = !isDesktop && !open
  return (
    <div>
      <p
        {...rest}
        lang="id"
        style={{
          ...(rest.style || {}),
          textAlign: "justify", textJustify: "inter-word", hyphens: "auto", WebkitHyphens: "auto",
          ...(clamp ? { display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
        }}
      >{text}</p>
      {!isDesktop && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1 min-h-[44px] px-1 text-sm font-semibold cursor-pointer"
          style={{ color: "var(--col-blue-light)", fontFamily: "var(--font-display)" }}
        >{open ? "Tutup" : "Baca selengkapnya"}</button>
      )}
    </div>
  )
}

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
        className={`group relative flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.03] ${isPrimary ? "theme-btn-primary" : ""}`}
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
        <div className="relative z-10">
          <div className="container mx-auto min-h-screen flex items-center justify-center">
            <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen pt-28 pb-12 lg:pt-24 lg:pb-8 gap-8 lg:gap-16 md:justify-between w-full">

              {/* ─── Left Column ─── */}
              <div className="w-full lg:w-[55%] xl:w-1/2 space-y-5 sm:space-y-6 text-left order-1">
                <HeroTitle line1={content.hero_line_1} line2={content.hero_line_2} />
                {/* TypeWriter is isolated so only it re-renders, not the whole page */}
                <TypeWriter key={words.join('|')} words={words} />

                {/* Description */}
                <ReadMoreText
                  text={subtitle}
                  isDesktop={isDesktop}
                  className="text-sm sm:text-base lg:text-[0.95rem] xl:text-lg max-w-xl leading-relaxed font-light"
                  style={{ color: "var(--col-muted)" }}
                  data-aos="fade-up" data-aos-delay="700"
                />

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
