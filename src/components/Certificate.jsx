import React, { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Maximize2, X } from "lucide-react"

const Certificate = ({ ImgSertif }) => {
  const [open, setOpen] = useState(false)

  const handleOpen = () => setOpen(true)
  const handleClose = useCallback(() => setOpen(false), [])

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === "Escape") handleClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, handleClose])

  // Cegah scroll body saat modal terbuka
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <div className="w-full">
      {/* Thumbnail — object-contain supaya portrait/landscape tidak terpotong */}
      <div
        className="relative overflow-hidden rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)] border border-white/5"
        onClick={handleOpen}
      >
        <div className="absolute inset-0 bg-black/10 z-[1] pointer-events-none group-hover:bg-black/20 transition-colors" />

        <div className="w-full bg-[#0a0a18] flex items-center justify-center overflow-hidden min-h-[180px] sm:min-h-[200px] md:min-h-[220px]">
          <img
            src={ImgSertif}
            alt="Certificate"
            loading="lazy"
            className="certificate-image w-full h-auto max-h-[320px] sm:max-h-[360px] md:max-h-[400px] object-contain transition-[filter,transform] duration-300 group-hover:scale-[1.02]"
            style={{
              filter: "contrast(1.05) brightness(0.95) saturate(1.05)",
            }}
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[2] flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-white text-center transition-all duration-400 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
            <Maximize2 className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-md" />
            <span className="text-sm sm:text-base font-semibold drop-shadow-md">View Certificate</span>
          </div>
        </div>
      </div>

      {/* Lightbox Modal — full flexible di semua device */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            padding: "max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left))",
          }}
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute z-20 p-2.5 rounded-full text-white bg-black/70 hover:bg-black/90 hover:scale-110 transition-all duration-200"
            style={{
              top: "max(0.75rem, env(safe-area-inset-top))",
              right: "max(0.75rem, env(safe-area-inset-right))",
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Scrollable container supaya portrait panjang tetap bisa di-scroll */}
          <div
            className="w-full h-full flex items-center justify-center overflow-auto"
            onClick={handleClose}
          >
            <img
              src={ImgSertif}
              alt="Certificate Full View"
              className="block w-auto h-auto max-w-full rounded-md shadow-2xl select-none"
              style={{
                /* Lebar max: viewport minus padding; tinggi max: viewport minus padding */
                maxWidth: "min(100%, calc(100vw - 1.5rem))",
                maxHeight: "min(100%, calc(100dvh - 1.5rem))",
                objectFit: "contain",
              }}
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Certificate
