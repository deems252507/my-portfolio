import React from "react";

/** Film grain halus + vignette tipis di seluruh halaman (tidak menangkap klik). */
export default function FilmOverlay() {
  return (
    <>
      <div aria-hidden className="film-vignette" />
      <div aria-hidden className="film-grain" />
    </>
  );
}
