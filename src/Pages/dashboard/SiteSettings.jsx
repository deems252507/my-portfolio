import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ImagePlus, Save, UserRound, Palette, MessageCircle, Type, RotateCcw, Zap } from "lucide-react";
import {
  DEFAULT_CONTENT,
  DEFAULT_THEME,
  WELCOME_FONTS,
  LIGHTNING_MOODS,
  fetchSiteContent,
  saveSiteContent,
  uploadSiteImage,
  applyTheme,
} from "../../lib/siteContent";
import { useSiteContent } from "../../context/SiteContentContext";
import { WELCOME_BG_STYLES } from "../../components/WelcomeBackground";

const SECTIONS = [
  {
    title: "Identitas",
    hint: "Nama yang muncul di About, judul browser, dan footer.",
    fields: [
      ["full_name", "Nama lengkap", "text"],
      ["first_name", "Nama baris 1 (About)", "text"],
      ["last_name", "Nama baris 2 (About)", "text"],
      ["greeting", "Sapaan", "text"],
      ["job_title", "Jabatan / title", "text"],
      ["footer_brand", "Teks footer", "text"],
      ["meta_description", "Deskripsi SEO", "textarea"],
    ],
  },
  {
    title: "Hero (halaman utama)",
    hint: "Judul besar dan kalimat di bawahnya. Animasi ketik tetap sama.",
    fields: [
      ["hero_line_1", "Judul baris 1", "text"],
      ["hero_line_2", "Judul baris 2", "text"],
      ["hero_subtitle", "Paragraf hero", "textarea"],
      ["typing_words", "Kata animasi ketik (1 kata per baris)", "textarea"],
    ],
  },
  {
    title: "Bio & resume",
    fields: [
      ["bio", "Bio About", "textarea"],
      ["resume_url", "Link resume / CV", "text"],
    ],
  },
  {
    title: "Sosial media",
    hint: "Kosongkan link jika ikon itu tidak ingin ditampilkan.",
    fields: [
      ["github", "GitHub", "text"],
      ["linkedin", "LinkedIn", "text"],
      ["instagram", "Instagram", "text"],
    ],
  },
  {
    title: "Pendidikan",
    fields: [
      ["edu1_school", "Sekolah / kampus 1", "text"],
      ["edu1_major", "Jurusan 1", "text"],
      ["edu1_year", "Tahun 1", "text"],
      ["edu2_school", "Sekolah / kampus 2", "text"],
      ["edu2_major", "Jurusan 2", "text"],
      ["edu2_year", "Tahun 2", "text"],
    ],
  },
  {
    title: "Spotify",
    hint: "Tempel link playlist/album Spotify. Player di hero tidak berubah bentuknya.",
    fields: [
      ["spotify_title", "Judul kartu", "text"],
      ["spotify_desc", "Deskripsi kartu", "textarea"],
      ["spotify_url", "Link Spotify", "text"],
    ],
  },
];

const PHOTOS = [
  ["profile_photo", "Foto profil"],
  ["hover_photo", "Foto hover (efek About)"],
  ["edu1_logo", "Logo pendidikan 1"],
  ["edu2_logo", "Logo pendidikan 2"],
];

const THEME_FIELDS = [
  ["theme_bg", "Background utama", "Warna latar belakang website"],
  ["theme_bg2", "Background sekunder", "Warna latar sekunder / card"],
  ["theme_blue", "Warna utama (biru)", "Primary blue"],
  ["theme_blue_light", "Warna utama terang", "Blue light"],
  ["theme_accent", "Aksen (cyan)", "Accent / highlight"],
  ["theme_teal", "Teal", "Warna teal"],
  ["theme_pink", "Pink", "Warna pink / aksen sekunder"],
  ["theme_white", "Teks putih", "Warna teks utama"],
  ["theme_muted", "Teks muted", "Warna teks sekunder"],
];

function Field({ label, value, onChange, type }) {
  const className =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50";
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      {type === "textarea" ? (
        <textarea rows={4} className={className} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={className} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function ColorField({ label, hint, value, onChange }) {
  const hex = value || "#000000";
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-gray-400">{label}</span>
      {hint && <span className="block text-[10px] text-gray-600 -mt-1">{hint}</span>}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={hex.length === 7 ? hex : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer shrink-0"
        />
        <input
          className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 font-mono uppercase"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </label>
  );
}

function PhotoField({ label, value, onChange }) {
  const [busy, setBusy] = useState(false);

  const onFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadSiteImage(file);
      onChange(url);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Upload gagal",
        text: error.message || "Pastikan bucket project-images sudah public.",
        background: "#0a0a1a",
        color: "#fff",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <p className="text-sm text-white">{label}</p>
      <div className="h-36 rounded-xl bg-black/30 border border-white/10 overflow-hidden flex items-center justify-center">
        {value ? (
          <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-gray-500">Belum ada gambar</span>
        )}
      </div>
      <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-white/15 text-xs text-gray-300 cursor-pointer hover:border-blue-400/40">
        <ImagePlus className="w-4 h-4" />
        {busy ? "Mengupload..." : "Upload gambar"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>
      <input
        className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white outline-none"
        placeholder="atau tempel URL gambar"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function SiteSettings() {
  const { setContent } = useSiteContent();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSiteContent()
      .then(setForm)
      .catch(() => setForm({ ...DEFAULT_CONTENT }));
  }, []);

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Live preview tema saat admin mengubah warna
      if (key.startsWith("theme_")) {
        applyTheme(next);
      }
      return next;
    });
  };

  const resetTheme = () => {
    setForm((prev) => {
      const next = { ...prev, ...DEFAULT_THEME };
      applyTheme(next);
      return next;
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const saved = await saveSiteContent(form);
      setContent(saved);
      setForm(saved);
      Swal.fire({
        icon: "success",
        title: "Tersimpan",
        text: "Perubahan langsung tampil di website.",
        timer: 1600,
        showConfirmButton: false,
        background: "#0a0a1a",
        color: "#fff",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan",
        text: error.message || "Jalankan SQL site_content di Supabase dulu.",
        background: "#0a0a1a",
        color: "#fff",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return <p className="text-sm text-gray-400">Memuat konten...</p>;
  }

  const welcomeFont = form.welcome_font || "Arial";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs uppercase tracking-widest">
            <UserRound className="w-4 h-4" /> CMS
          </div>
          <h1 className="text-2xl font-semibold text-white mt-1">Profil & Konten</h1>
          <p className="text-sm text-gray-400 mt-1">
            Ubah nama, bio, welcome screen, tema warna, efek petir, WhatsApp, dan foto.
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? "Menyimpan..." : "Simpan perubahan"}
        </button>
      </div>

      {/* ── Welcome Screen (Loading) ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-blue-400" />
          <div>
            <h2 className="text-white font-medium">Welcome Screen (Loading)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Teks animasi partikel di layar loading. Preview langsung di bawah.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field
            label="Baris 1 (atas)"
            type="text"
            value={form.welcome_line1 || ""}
            onChange={(v) => setField("welcome_line1", v)}
          />
          <Field
            label="Baris 2 (bawah)"
            type="text"
            value={form.welcome_line2 || ""}
            onChange={(v) => setField("welcome_line2", v)}
          />
          <label className="block space-y-1.5">
            <span className="text-xs text-gray-400">Jenis font</span>
            <select
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
              value={welcomeFont}
              onChange={(e) => setField("welcome_font", e.target.value)}
              style={{ fontFamily: `"${welcomeFont}", sans-serif` }}
            >
              {WELCOME_FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: `"${f}", sans-serif`, background: "#0a0a1a" }}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="Warna baris 1"
              value={form.welcome_color1 || "#ffffff"}
              onChange={(v) => setField("welcome_color1", v)}
            />
            <ColorField
              label="Warna baris 2"
              value={form.welcome_color2 || "#2563eb"}
              onChange={(v) => setField("welcome_color2", v)}
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="rounded-xl border border-white/10 bg-[#030014] p-6 min-h-[120px] flex flex-col items-center justify-center gap-1">
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Preview</p>
          <p
            className="text-xl sm:text-2xl font-bold text-center"
            style={{
              fontFamily: `"${welcomeFont}", Arial, sans-serif`,
              color: form.welcome_color1 || "#ffffff",
            }}
          >
            {form.welcome_line1 || "Welcome To My"}
          </p>
          <p
            className="text-2xl sm:text-3xl font-bold text-center"
            style={{
              fontFamily: `"${welcomeFont}", Arial, sans-serif`,
              color: form.welcome_color2 || "#2563eb",
            }}
          >
            {form.welcome_line2 || "Portofolio Website"}
          </p>
        </div>
      </section>

      {/* ── Tema Warna Website ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-400" />
            <div>
              <h2 className="text-white font-medium">Tema Warna Website</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Perubahan langsung live preview di situs (CSS variables).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/20 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset ke default
          </button>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {THEME_FIELDS.map(([key, label, hint]) => (
            <ColorField
              key={key}
              label={label}
              hint={hint}
              value={form[key] || DEFAULT_THEME[key] || "#000000"}
              onChange={(v) => setField(key, v)}
            />
          ))}
        </div>

        {/* Theme swatch preview */}
        <div className="flex flex-wrap gap-2 pt-1">
          {THEME_FIELDS.map(([key, label]) => (
            <div
              key={key}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10 bg-black/20"
              title={label}
            >
              <span
                className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                style={{ background: form[key] || DEFAULT_THEME[key] }}
              />
              <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{label}</span>
            </div>
          ))}
        </div>
      </section>



      {/* ── Background Welcome Screen ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <div>
            <h2 className="text-white font-medium">Background Welcome Screen</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Pilih gaya efek loading. Semua opsi bisa diatur dari sini.
            </p>
          </div>
        </div>

        {/* Style grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WELCOME_BG_STYLES.map((s) => {
            const active = (form.welcome_bg_style || "lightning") === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setField("welcome_bg_style", s.id)}
                className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                  active
                    ? "border-blue-500/50 bg-blue-500/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="block text-xs font-medium">{s.label}</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">{s.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Shared color + speed for non-lightning styles */}
        {(form.welcome_bg_style || "lightning") !== "lightning" &&
          (form.welcome_bg_style || "lightning") !== "none" && (
          <div className="grid sm:grid-cols-2 gap-4 pt-1">
            <ColorField
              label="Warna efek"
              value={form.welcome_fx_color || "#3b82f6"}
              onChange={(v) => setField("welcome_fx_color", v)}
            />
            <label className="block space-y-1.5">
              <span className="text-xs text-gray-400">
                Kecepatan ({form.welcome_fx_speed || "1"}x)
              </span>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={form.welcome_fx_speed || "1"}
                onChange={(e) => setField("welcome_fx_speed", e.target.value)}
                className="w-full accent-blue-500"
              />
            </label>
          </div>
        )}

        {/* Lightning-specific controls */}
        {(form.welcome_bg_style || "lightning") === "lightning" && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <p className="text-xs text-gray-500">Pengaturan khusus Petir</p>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-gray-400">Tampilkan efek petir</span>
                <select
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                  value={form.lightning_enabled === "false" ? "false" : "true"}
                  onChange={(e) => setField("lightning_enabled", e.target.value)}
                >
                  <option value="true" style={{ background: "#0a0a1a" }}>Tampil</option>
                  <option value="false" style={{ background: "#0a0a1a" }}>Matikan</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-gray-400">Preset mood</span>
                <select
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                  value={form.lightning_mood || "default"}
                  onChange={(e) => {
                    const mood = e.target.value;
                    const preset = LIGHTNING_MOODS[mood];
                    setForm((prev) => ({
                      ...prev,
                      lightning_mood: mood,
                      ...(preset
                        ? {
                            lightning_hue: preset.hue,
                            lightning_speed: preset.speed,
                            lightning_intensity: preset.intensity,
                            lightning_size: preset.size,
                          }
                        : {}),
                    }));
                  }}
                >
                  {Object.entries(LIGHTNING_MOODS).map(([key, m]) => (
                    <option key={key} value={key} style={{ background: "#0a0a1a" }}>
                      {m.label}
                    </option>
                  ))}
                  <option value="custom" style={{ background: "#0a0a1a" }}>Custom (manual)</option>
                </select>
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Warna petir (Hue: {form.lightning_hue || "220"}°)</span>
                <span
                  className="w-6 h-6 rounded-full border border-white/20 shrink-0"
                  style={{ background: `hsl(${form.lightning_hue || 220}, 90%, 55%)` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={form.lightning_hue || "220"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    lightning_hue: e.target.value,
                    lightning_mood: "custom",
                  }))
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background:
                    "linear-gradient(to right, hsl(0,90%,55%), hsl(60,90%,55%), hsl(120,90%,55%), hsl(180,90%,55%), hsl(240,90%,55%), hsl(300,90%,55%), hsl(360,90%,55%))",
                }}
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-gray-400">Speed ({form.lightning_speed || "1.6"})</span>
                <input
                  type="range"
                  min="0.3"
                  max="3"
                  step="0.1"
                  value={form.lightning_speed || "1.6"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lightning_speed: e.target.value,
                      lightning_mood: "custom",
                    }))
                  }
                  className="w-full accent-blue-500"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-gray-400">Intensity ({form.lightning_intensity || "1.2"})</span>
                <input
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.05"
                  value={form.lightning_intensity || "1.2"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lightning_intensity: e.target.value,
                      lightning_mood: "custom",
                    }))
                  }
                  className="w-full accent-blue-500"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-gray-400">Size ({form.lightning_size || "2"})</span>
                <input
                  type="range"
                  min="0.8"
                  max="3"
                  step="0.1"
                  value={form.lightning_size || "2"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      lightning_size: e.target.value,
                      lightning_mood: "custom",
                    }))
                  }
                  className="w-full accent-blue-500"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {Object.entries(LIGHTNING_MOODS).map(([key, m]) => {
                const active = (form.lightning_mood || "default") === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        lightning_mood: key,
                        lightning_hue: m.hue,
                        lightning_speed: m.speed,
                        lightning_intensity: m.intensity,
                        lightning_size: m.size,
                      }))
                    }
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      active
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: `hsl(${m.hue}, 90%, 55%)` }}
                    />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── WhatsApp ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-400" />
          <div>
            <h2 className="text-white font-medium">WhatsApp</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tombol mengambang hijau di pojok kanan bawah (halaman utama & detail project).
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="text-xs text-gray-400">Tampilkan tombol</span>
            <select
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
              value={form.wa_enabled === "false" ? "false" : "true"}
              onChange={(e) => setField("wa_enabled", e.target.value)}
            >
              <option value="true" style={{ background: "#0a0a1a" }}>Tampil</option>
              <option value="false" style={{ background: "#0a0a1a" }}>Sembunyikan</option>
            </select>
          </label>
          <Field
            label="Nomor WA (tanpa +, contoh: 6281234567890)"
            type="text"
            value={form.wa_number || ""}
            onChange={(v) => setField("wa_number", v)}
          />
          <Field
            label="Teks tombol"
            type="text"
            value={form.wa_button_text || ""}
            onChange={(v) => setField("wa_button_text", v)}
          />
          <Field
            label="Pesan default (otomatis terisi saat buka WA)"
            type="textarea"
            value={form.wa_message || ""}
            onChange={(v) => setField("wa_message", v)}
          />
        </div>

        {/* WA preview */}
        {form.wa_enabled !== "false" && form.wa_number && (
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-gray-500">Preview:</span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-medium shadow-lg">
              <svg viewBox="0 0 32 32" className="w-4 h-4" fill="white">
                <path d="M16.004 3C9.377 3 4 8.373 4 14.996c0 2.64.86 5.09 2.325 7.09L4.7 28.3l6.48-1.7A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 14.996 28 8.373 22.63 3 16.004 3zm0 21.9a9.86 9.86 0 0 1-5.02-1.37l-.36-.21-3.84 1.01 1.02-3.74-.23-.38a9.84 9.84 0 0 1-1.51-5.22c0-5.45 4.44-9.88 9.92-9.88 5.48 0 9.92 4.43 9.92 9.88 0 5.45-4.44 9.91-9.92 9.91z" />
              </svg>
              {form.wa_button_text || "Chat WhatsApp"}
            </span>
          </div>
        )}
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div>
            <h2 className="text-white font-medium">{section.title}</h2>
            {section.hint && <p className="text-xs text-gray-500 mt-1">{section.hint}</p>}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {section.fields.map(([key, label, type]) => (
              <div key={key} className={type === "textarea" ? "md:col-span-2" : ""}>
                <Field label={label} type={type} value={form[key] || ""} onChange={(v) => setField(key, v)} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div>
          <h2 className="text-white font-medium">Gambar</h2>
          <p className="text-xs text-gray-500 mt-1">Upload dari komputer, atau tempel link gambar.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {PHOTOS.map(([key, label]) => (
            <PhotoField key={key} label={label} value={form[key] || ""} onChange={(v) => setField(key, v)} />
          ))}
        </div>
      </section>
    </div>
  );
}
