import { useEffect } from "react";
import { ExternalLink } from "lucide-react";
import AOS from "aos";
import "aos/dist/aos.css";
import { useSiteContent } from "../context/SiteContentContext";

const SocialLinks = () => {
  const { content } = useSiteContent();

  useEffect(() => {
    AOS.init({ offset: 10 });
  }, []);

  // Judul & subteks opsional — string kosong = tidak ditampilkan / tanpa default paksa
  const title = (content.find_me_title ?? "").trim();

  const links = [
    {
      name: "LinkedIn",
      displayName: (content.find_linkedin_title ?? "").trim(),
      subText: (content.find_linkedin_sub ?? "").trim(),
      icon: "/linkedin-logo-linkedin-icon-transparent-free-png.webp",
      url: content.linkedin || "",
      gradient: "from-[#0A66C2] to-[#0077B5]",
      isPrimary: true,
    },
    {
      name: "Instagram",
      displayName: (content.find_instagram_title ?? "").trim(),
      subText: (content.find_instagram_sub ?? "").trim(),
      icon: "/Instagram_icon.png",
      url: content.instagram || "",
      gradient: "from-[#833AB4] via-[#E4405F] to-[#FCAF45]",
    },
    {
      name: "GitHub",
      displayName: (content.find_github_title ?? "").trim(),
      subText: (content.find_github_sub ?? "").trim(),
      icon: "/github.png",
      url: content.github || "",
      gradient: "from-[#333] to-[#24292e]",
    },
  ].filter((l) => l.url && String(l.url).trim() && l.url !== "https://");

  const primary = links.find((l) => l.isPrimary);
  const secondary = links.filter((l) => !l.isPrimary);

  const LinkCard = ({ link, delay = 100, large = false }) => (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex items-center ${
        large ? "justify-between p-4" : "gap-3 p-4"
      } rounded-xl bg-white/5 border border-white/10 overflow-hidden hover:border-white/20 transition-all duration-500`}
      data-aos="fade-up"
      data-aos-delay={delay}
    >
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-r ${link.gradient}`}
      />
      <div className={`relative flex items-center ${large ? "gap-4" : "gap-3"}`}>
        <div className="relative flex items-center justify-center p-2">
          <img
            src={link.icon}
            alt={link.name}
            className={`object-contain transition-all duration-500 ${
              large
                ? "w-10 h-10 scale-[1.7] group-hover:scale-[1.9]"
                : "w-10 h-10 group-hover:scale-110"
            }`}
          />
        </div>
        <div className="flex flex-col min-w-0">
          {(link.displayName || link.subText) ? (
            <>
              {link.displayName ? (
                <span
                  className={`font-bold text-gray-200 group-hover:text-white transition-colors duration-300 ${
                    large ? "text-lg pt-[0.2rem] tracking-tight leading-none" : "text-sm"
                  }`}
                >
                  {link.displayName}
                </span>
              ) : null}
              {link.subText ? (
                <span className="text-xs sm:text-sm text-gray-400 truncate group-hover:text-gray-300 transition-colors duration-300">
                  {link.subText}
                </span>
              ) : null}
            </>
          ) : (
            <span
              className={`font-bold text-gray-200 group-hover:text-white transition-colors duration-300 ${
                large ? "text-lg pt-[0.2rem] tracking-tight leading-none" : "text-sm"
              }`}
            >
              {link.name}
            </span>
          )}
        </div>
      </div>
      <ExternalLink
        className={`relative text-gray-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 -translate-x-1 ${
          large ? "w-5 h-5" : "w-4 h-4 ml-auto"
        }`}
      />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </div>
    </a>
  );

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-6 py-8 backdrop-blur-xl">
      {title ? (
        <h3
          className="text-xl font-semibold mb-6 flex items-center gap-2"
          style={{ color: "var(--col-white)" }}
          data-aos="fade-down"
        >
          {title}
        </h3>
      ) : null}

      <div className="flex flex-col gap-4">
        {primary && <LinkCard link={primary} delay={100} large />}
        {secondary.map((link, i) => (
          <LinkCard key={link.name} link={link} delay={200 + i * 100} />
        ))}
        {links.length === 0 && (
          <p className="text-sm text-gray-500">Belum ada link sosial. Isi di Admin → Sosial media & FIND ME.</p>
        )}
      </div>
    </div>
  );
};

export default SocialLinks;
