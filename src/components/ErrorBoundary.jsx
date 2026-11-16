import React from "react";

/**
 * Pengaman layar hitam.
 * Tanpa error boundary, SATU error (WebGL gagal dibuat di HP, file JS gagal diunduh karena sinyal putus,
 * data kosong, dll.) membuat React membuang SELURUH halaman -> yang tersisa hanya latar gelap (blank hitam).
 * Dengan boundary, bagian yang error saja yang diganti `fallback`; sisanya tetap tampil.
 *
 * Props:
 *  - fallback : node ATAU fungsi (error, reset) => node. Default: tidak menampilkan apa pun (bagian itu dilewati).
 *  - onError  : dipanggil sekali saat error tertangkap.
 *  - name     : label untuk console.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = () => this.setState({ error: null });
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary${this.props.name ? ":" + this.props.name : ""}]`, error, info?.componentStack);
    try { this.props.onError?.(error); } catch { /* abaikan */ }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { fallback = null } = this.props;
    return typeof fallback === "function" ? fallback(error, this.reset) : fallback;
  }
}

/** Layar darurat tingkat atas: lebih baik tombol "Muat ulang" daripada layar hitam kosong. */
export function CrashScreen() {
  return (
    <div
      role="alert"
      style={{
        position: "fixed", inset: 0, zIndex: 99999, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center",
        background: "#050510", color: "#f0f0ff", fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>Halaman gagal dimuat</div>
      <div style={{ fontSize: 14, opacity: 0.75, maxWidth: 320 }}>
        Kemungkinan koneksi terputus sebentar. Coba muat ulang.
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          minHeight: 44, padding: "0 22px", borderRadius: 999, border: "1px solid rgba(255,255,255,.3)",
          background: "rgba(255,255,255,.08)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
        }}
      >
        Muat ulang
      </button>
    </div>
  );
}
