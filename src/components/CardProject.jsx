import React, { memo } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, ArrowRight } from "lucide-react";
import { toSlug } from "../utils/slug";

const CardProject = ({ Img, Title, Description, Link: ProjectLink, id }) => {
  const handleLiveDemo = (e) => {
    if (!ProjectLink) {
      e.preventDefault();
      alert("Live demo link is not available");
    }
  };

  const handleDetails = (e) => {
    if (!id) {
      e.preventDefault();
      alert("Project details are not available");
    }
  };

  return (
    <div className="group relative w-full">
      <div
        className="relative overflow-hidden rounded-xl backdrop-blur-md shadow-2xl transition-all duration-300"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--col-border)",
        }}
      >
        {/* Hover glow overlay — ikut warna tema */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--col-blue) 12%, transparent) 0%, transparent 70%)",
          }}
        />

        <div className="relative p-5 z-10">
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={Img}
              alt={Title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover aspect-[16/8] transform group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="mt-4 space-y-3">
            <h3
              className="text-xl font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--col-white)" }}
            >
              {Title}
            </h3>

            <p style={{ color: "var(--col-muted)" }} className="text-sm leading-relaxed line-clamp-2">
              {Description}
            </p>

            <div className="pt-4 flex items-center justify-between">
              {ProjectLink && (
                <a
                  href={ProjectLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLiveDemo}
                  className="inline-flex items-center space-x-2 transition-colors duration-200 hover:opacity-80"
                  style={{ color: "var(--col-blue-light)" }}
                >
                  <span className="text-sm font-medium">Live Demo</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {id ? (
                <Link
                  to={`/project/${toSlug(Title)}`}
                  onClick={handleDetails}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none"
                  style={{
                    background: "color-mix(in srgb, var(--col-blue) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--col-blue) 35%, transparent)",
                    color: "var(--col-blue-light)",
                  }}
                >
                  <span className="text-sm font-medium">Details</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="text-sm" style={{ color: "var(--col-muted)" }}>
                  Details Not Available
                </span>
              )}
            </div>
          </div>

          <div
            className="absolute inset-0 rounded-xl transition-colors duration-300 -z-50 pointer-events-none opacity-0 group-hover:opacity-100"
            style={{ border: "1px solid color-mix(in srgb, var(--col-blue) 40%, transparent)" }}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(CardProject);
