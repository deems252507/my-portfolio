import { ExternalLink } from "lucide-react";
import { useSiteContent } from "../../context/SiteContentContext";
import { toSpotifyEmbed } from "../../lib/siteContent";

export default function SpotifyCard({ className = "" }) {
  const { content } = useSiteContent();
  const embed = toSpotifyEmbed(content.spotify_url) || "https://open.spotify.com/embed/playlist/4oQDhGjv57BzeOThOWQeS9?utm_source=generator&theme=0";
  const openUrl = content.spotify_url || "https://open.spotify.com/playlist/4oQDhGjv57BzeOThOWQeS9";
  return (
    <section
      className={`group relative w-full max-w-[470px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.07)] shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-[rgba(37,99,235,0.35)] hover:shadow-[0_0_30px_rgba(37,99,235,0.12)] ${className}`}
      style={{ background: "rgba(255,255,255,0.03)" }}
      aria-label="Spotify player"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: "radial-gradient(circle at 50% 0%, rgba(37,99,235,0.08) 0%, transparent 70%)" }}
      />
      
      {/* ── Text Section ── */}
      <div className="relative p-6 pb-2 mt-2">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-3">
          {content.spotify_title}
        </h2>
        
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">
          {content.spotify_desc}
        </p>
      </div>

      {/* ── Spotify Iframe ── */}
      <div className="relative p-2 pt-0">
        <iframe
          title="Spotify Playlist"
          src={embed}
          width="100%"
          height="352"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="relative block overflow-hidden rounded-xl border-0"
        />
      </div>
    </section>
  );
}
