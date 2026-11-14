import { supabase } from "../supabase";
import { useSiteContent } from "../context/SiteContentContext";
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Code2,
  ChevronRight,
  Layout,
  Globe,
  Package,
  Cpu,
  Code,
  ExternalLink,
  Github,
  CheckCircle2,
} from "lucide-react";
import { toSlug } from "../utils/slug";

const TECH_ICONS = {
  React: Globe,
  Tailwind: Layout,
  Express: Cpu,
  Python: Code,
  Javascript: Code,
  HTML: Code,
  CSS: Code,
  default: Package,
};

// URL dari dashboard kadang tanpa "https://" -> tanpa ini browser menganggapnya path relatif (link rusak)
const normalizeUrl = (u) => {
  const v = String(u || "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};
const hostOf = (u) => {
  try { return new URL(u).host.replace(/^www\./, ""); } catch { return u; }
};
const toList = (v) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
    .map((x) => String(x).trim())
    .filter(Boolean);

const TechBadge = ({ tech }) => {
  const Icon = TECH_ICONS[tech] || TECH_ICONS["default"];
  return (
    <div className="group relative overflow-hidden px-3 py-2 md:px-4 md:py-2.5 rounded-xl transition-all duration-300 cursor-default"
      style={{
        background: "color-mix(in srgb, var(--col-blue) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--col-blue) 20%, transparent)",
      }}
    >
      <div className="relative flex items-center gap-1.5 md:gap-2">
        <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: "var(--col-blue-light)" }} />
        <span className="text-xs md:text-sm font-medium" style={{ color: "var(--col-blue-light)" }}>
          {tech}
        </span>
      </div>
    </div>
  );
};

const ProjectDetails = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { content } = useSiteContent();
  const [project, setProject] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProject = async () => {
      const { data } = await supabase.from("projects").select("*");
      const selectedProject = data?.find((p) => toSlug(p.title) === slug);
      if (selectedProject) {
        setProject(selectedProject);
      }
    };
    fetchProject();
  }, [slug]);

  if (!project) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 md:w-24 md:h-24 mx-auto border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <h2 className="text-xl md:text-3xl font-bold text-white">
            Loading Project...
          </h2>
        </div>
      </div>
    );
  }

  const ownerName = content.full_name;
  const projectUrl = `${window.location.origin}/project/${toSlug(project.title)}`;
  const liveUrl = normalizeUrl(project.link || project.Link);
  const githubUrl = normalizeUrl(project.github || project.Github);
  const features = toList(project.features || project.Features);

  return (
    <>
      <Helmet>
        <title>{project.title} — {ownerName}</title>
        <meta name="description" content={project.description ? project.description.slice(0, 155) : `Project ${project.title} oleh ${ownerName}.`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={projectUrl} />
        <meta property="og:title" content={`${project.title} — ${ownerName}`} />
        <meta property="og:description" content={project.description?.slice(0, 155)} />
        <meta property="og:url" content={projectUrl} />
        <meta property="og:type" content="website" />
        {project.img && <meta property="og:image" content={project.img} />}
      </Helmet>

      <div className="min-h-screen bg-[#030014] px-[2%] sm:px-0 relative overflow-hidden">
        <div className="fixed inset-0">
          <div className="absolute -inset-[10px] opacity-20">
            <div className="absolute top-0 -left-4 w-72 md:w-96 h-72 md:h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob" />
            <div className="absolute top-0 -right-4 w-72 md:w-96 h-72 md:h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 md:w-96 h-72 md:h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000" />
          </div>
        </div>

        <div className="relative">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-16">
            <div className="flex items-center gap-2 md:gap-4 mb-8 md:mb-12 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="group flex-none inline-flex items-center space-x-1.5 md:space-x-2 px-3 md:px-5 py-2 md:py-2.5 bg-white/5 backdrop-blur-xl rounded-xl text-white/90 hover:bg-white/10 transition-all duration-300 border border-white/10 hover:border-white/20 text-sm md:text-base"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1 text-sm md:text-base text-white/50">
                <span className="hidden sm:inline flex-none">Projects</span>
                <ChevronRight className="hidden sm:block flex-none w-3 h-3 md:w-4 md:h-4" />
                <span className="text-white/90 truncate min-w-0">{project.title}</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-x-16 gap-y-6 md:gap-y-8 lg:gap-y-10">
              <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                <div className="space-y-4 md:space-y-6">
                  <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold break-words bg-gradient-to-r from-blue-200 via-blue-200 to-pink-200 bg-clip-text text-transparent leading-tight">
                    {project.title}
                  </h1>
                  <div className="relative h-1 w-16 md:w-24">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-sm" />
                  </div>
                </div>
              </div>

              {/* Gambar: di HP tampil tepat di bawah judul; di desktop di kolom kanan */}
              <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-8 lg:self-start">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl group bg-white/5">
                  <img
                    src={project.img}
                    alt={project.title}
                    className="w-full h-auto block transform transition-transform duration-700 will-change-transform group-hover:scale-105"
                    onLoad={() => setIsImageLoaded(true)}
                  />
                  {liveUrl && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Buka live demo ${project.title}`}
                      className="absolute inset-0 hidden md:flex items-end justify-end p-4 bg-gradient-to-t from-black/50 via-transparent to-transparent"
                    >
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white bg-black/60 backdrop-blur border border-white/20 group-hover:bg-blue-500/80 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Live Demo
                      </span>
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-6 md:space-y-10 min-w-0 lg:col-start-1 lg:row-start-2">
                {(liveUrl || githubUrl) && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      {liveUrl && (
                        <a
                          href={liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/45 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                        >
                          <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                          Lihat Live Demo
                        </a>
                      )}
                      {githubUrl && (
                        <a
                          href={githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white/90 bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/25 transition-all duration-300"
                        >
                          <Github className="w-4 h-4 md:w-5 md:h-5" />
                          Source Code
                        </a>
                      )}
                    </div>
                    {liveUrl && (
                      <p className="text-xs md:text-sm text-white/50 break-all">
                        Demo: <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/80">{hostOf(liveUrl)}</a>
                      </p>
                    )}
                  </div>
                )}

                <div className="prose prose-invert max-w-none">
                  <p lang="id" className="text-base md:text-lg text-gray-300/90 leading-relaxed whitespace-pre-line text-left md:text-justify break-words" style={{ hyphens: "auto", WebkitHyphens: "auto", overflowWrap: "anywhere" }}>
                    {project.description}
                  </p>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <h3 className="text-lg md:text-xl font-semibold text-white/90 flex items-center gap-2 md:gap-3">
                    <Code2 className="w-4 h-4 md:w-5 md:h-5" style={{ color: "var(--col-blue-light)" }} />
                    Technologies Used
                  </h3>
                  {project.tech_stack?.length > 0 ? (
                    <div className="flex flex-wrap gap-2 md:gap-3">
                      {project.tech_stack.map((tech, index) => (
                        <TechBadge key={index} tech={tech} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm md:text-base text-gray-400 opacity-50">
                      No technologies added.
                    </p>
                  )}
                </div>

                {features.length > 0 && (
                  <div className="space-y-4 md:space-y-6">
                    <h3 className="text-lg md:text-xl font-semibold text-white/90 flex items-center gap-2 md:gap-3">
                      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" style={{ color: "var(--col-blue-light)" }} />
                      Key Features
                    </h3>
                    <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm md:text-base text-gray-300/90">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 min-w-0 break-words">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full flex-none" style={{ background: "var(--col-blue-light)" }} />
                          <span className="min-w-0">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob { animation: blob 10s infinite; }
          .animation-delay-2000 { animation-delay: 2s; }
          .animation-delay-4000 { animation-delay: 4s; }
        `}</style>
      </div>
    </>
  );
};

export default ProjectDetails;