import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ImagePlus, Save, UserRound, Palette, MessageCircle, Type, RotateCcw, Zap } from "lucide-react";
import {
  DEFAULT_CONTENT,
  DEFAULT_THEME,
  CHARACTER_THEMES,
  HOVER_CHARACTERS,
  WELCOME_FONTS,
  LIGHTNING_MOODS,
  fetchSiteContent,
  saveSiteContent,
  uploadSiteImage,
  applyTheme,
  getIdCardSettings,
  getAboutMobileSettings,
} from "../../lib/siteContent";
import { useSiteContent } from "../../context/SiteContentContext";
import { WELCOME_BG_STYLES } from "../../components/WelcomeBackground";
import { NAV_MASCOTS } from "../../components/Navbar";
import { LOADING_STYLES } from "../../components/LoadingProgress";

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
    title: "Sosial media & FIND ME",
    hint: "Link dipakai di Home & FIND ME. Judul/subteks boleh kosong (opsional). Kosongkan link = kartu disembunyikan.",
    fields: [
      ["find_me_title", "Judul section FIND ME", "text"],
      ["linkedin", "Link LinkedIn", "text"],
      ["find_linkedin_title", "LinkedIn — judul", "text"],
      ["find_linkedin_sub", "LinkedIn — subteks", "text"],
      ["instagram", "Link Instagram", "text"],
      ["find_instagram_title", "Instagram — judul", "text"],
      ["find_instagram_sub", "Instagram — subteks", "text"],
      ["github", "Link GitHub", "text"],
      ["find_github_title", "GitHub — judul", "text"],
      ["find_github_sub", "GitHub — subteks", "text"],
    ],
  },
  {
    title: "ID Card 3D (Home)",
    hint: "Kartu gantung di hero. Foto kartu diatur di bagian Gambar → Foto ID card (kosong = pakai foto profil). Ketik false di 'Tampilkan' untuk menyembunyikan.",
    fields: [
      ["idcard_enabled", "Tampilkan ID card (true / false)", "text"],
      ["idcard_brand", "Wordmark kartu", "text"],
      ["idcard_tagline", "Caption wordmark", "text"],
      ["idcard_number", "Nomor ID", "text"],
      ["idcard_location", "Lokasi", "text"],
      ["idcard_valid", "Valid thru", "text"],
      ["idcard_site", "Situs di sisi belakang", "text"],
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
  ["idcard_photo", "Foto ID card (kosong = foto profil)"],
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

function RangeField({ label, hint, value, min, max, step, unit = "", onChange }) {
  const num = Number.isFinite(parseFloat(value)) ? parseFloat(value) : min;
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-mono text-blue-300">
          {num}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={num}
        onChange={(e) => onChange(String(e.target.value))}
        className="w-full accent-blue-500"
      />
      {hint && <span className="block text-[10px] text-gray-600">{hint}</span>}
    </label>
  );
}

/** Atur foto & nama di bagian About untuk tampilan HP. Ada preview langsung. */
function AboutMobileEditor({ form, setField }) {
  const a = getAboutMobileSettings(form);
  const SCALE = 0.62;
  const reset = () => {
    ["about_m_height","about_m_photo_x","about_m_photo_y","about_m_photo_size","about_m_name_x","about_m_name_y","about_m_name_size","about_m_greet_size","about_m_name_front"]
      .forEach((k) => setField(k, DEFAULT_CONTENT[k]));
  };
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
      <div>
        <p className="text-sm text-white">Foto & nama di HP (bagian About)</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Geser slider untuk memindahkan foto dan nama. Preview di kiri meniru layar HP dan langsung berubah.
          Klik Simpan di bawah supaya tampil di website.
        </p>
      </div>
      <div className="grid md:grid-cols-[260px_1fr] gap-5 items-start">
        <div className="mx-auto md:mx-0" style={{ width: 390 * SCALE }}>
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#07071a]" style={{ width: 390 * SCALE, height: a.height * SCALE }}>
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: 390, height: a.height, transform: `scale(${SCALE})`, padding: "0 20px" }}>
              <div className="relative w-full h-full">
                <div className="absolute z-10" style={{ width: 350, right: `${-a.photoX}%`, bottom: -a.photoY, transform: `scale(${a.photoSize})`, transformOrigin: "bottom right" }}>
                  {form.profile_photo && <img src={form.profile_photo} alt="" draggable={false} className="w-[350px] h-[350px] object-contain object-bottom" />}
                </div>
                <div className="absolute font-bold leading-[1.05] text-white pointer-events-none"
                  style={{ left: a.nameX, top: `${a.nameY}%`, fontSize: `${a.nameSize}rem`, zIndex: a.nameFront ? 20 : 5 }}>
                  <span className="block text-violet-400" style={{ fontSize: `${a.greetSize}em` }}>{form.greeting}</span>
                  <span className="block">{form.first_name}</span>
                  <span className="block">{form.last_name}</span>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5 text-center">Preview tampilan HP</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="sm:col-span-3 text-xs text-gray-400">Ketik teks langsung di sini (berlaku juga di tampilan laptop)</div>
            <Field label="Sapaan" value={form.greeting || ""} onChange={(v) => setField("greeting", v)} />
            <Field label="Nama depan" value={form.first_name || ""} onChange={(v) => setField("first_name", v)} />
            <Field label="Nama belakang" value={form.last_name || ""} onChange={(v) => setField("last_name", v)} />
          </div>
          <RangeField label="Tinggi area foto + nama" min={280} max={600} step={5} unit="px" value={form.about_m_height || "400"} onChange={(v) => setField("about_m_height", v)} />
          <RangeField label="Ukuran foto" min={0.5} max={1.4} step={0.02} unit="x" value={form.about_m_photo_size || "0.92"} onChange={(v) => setField("about_m_photo_size", v)} />
          <RangeField label="Geser foto kiri ↔ kanan" hint="Minus = ke kiri, plus = ke kanan" min={-40} max={40} step={1} unit="%" value={form.about_m_photo_x || "10"} onChange={(v) => setField("about_m_photo_x", v)} />
          <RangeField label="Geser foto atas ↕ bawah" hint="Minus = naik, plus = turun" min={-80} max={160} step={2} unit="px" value={form.about_m_photo_y || "30"} onChange={(v) => setField("about_m_photo_y", v)} />
          <RangeField label="Ukuran sapaan (Hi, I'm)" hint="Relatif terhadap ukuran nama. 1 = sama besar" min={0.3} max={1.4} step={0.02} unit="x" value={form.about_m_greet_size || "0.62"} onChange={(v) => setField("about_m_greet_size", v)} />
          <RangeField label="Ukuran nama" min={1.6} max={3.6} step={0.05} unit="rem" value={form.about_m_name_size || "2.3"} onChange={(v) => setField("about_m_name_size", v)} />
          <RangeField label="Geser nama kiri → kanan" min={0} max={160} step={2} unit="px" value={form.about_m_name_x || "0"} onChange={(v) => setField("about_m_name_x", v)} />
          <RangeField label="Geser nama atas ↕ bawah" min={0} max={80} step={1} unit="%" value={form.about_m_name_y || "4"} onChange={(v) => setField("about_m_name_y", v)} />
          <label className="flex items-center gap-2 text-xs text-gray-300 sm:self-end pb-1">
            <input type="checkbox" checked={String(form.about_m_name_front) !== "false"} onChange={(e) => setField("about_m_name_front", e.target.checked ? "true" : "false")} />
            Nama tampil di depan foto
          </label>
          <div className="flex items-end">
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-xs text-gray-300 hover:text-white hover:bg-white/5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset posisi & ukuran
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Atur ukuran foto, posisi (geser), zoom, dan posisi kartu ID di halaman. Ada preview langsung. */
function IdCardPhotoEditor({ form, setField }) {
  const idc = getIdCardSettings(form);
  const photo = form.idcard_photo || form.profile_photo;
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
      <div>
        <p className="text-sm text-white">Foto & posisi ID card</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Geser slider untuk memperbesar area foto, menaikkan/menurunkan wajah, atau memperbesar (zoom). Preview di bawah
          langsung berubah.
        </p>
      </div>
      <div className="grid md:grid-cols-[240px_1fr] gap-5 items-start">
        <div className="mx-auto md:mx-0 w-[240px]">
          <div
            className="relative w-full rounded-xl overflow-hidden bg-[#eae7de] border border-white/10"
            style={{ height: idc.photoHeight }}
          >
            {photo ? (
              <img
                src={photo}
                alt="Preview foto ID card"
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  objectPosition: `${idc.photoX}% ${idc.photoY}%`,
                  transformOrigin: `${idc.photoX}% ${idc.photoY}%`,
                  transform: `scale(${idc.photoZoom})`,
                }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                Belum ada foto
              </span>
            )}
          </div>
          <p className="text-[10px] text-gray-600 mt-1.5 text-center">Preview area foto kartu</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <RangeField
            label="Tinggi area foto"
            hint="Makin besar = foto makin besar"
            min={100}
            max={230}
            step={2}
            unit="px"
            value={form.idcard_photo_height || "150"}
            onChange={(v) => setField("idcard_photo_height", v)}
          />
          <RangeField
            label="Zoom foto"
            min={1}
            max={3}
            step={0.05}
            unit="x"
            value={form.idcard_photo_zoom || "1"}
            onChange={(v) => setField("idcard_photo_zoom", v)}
          />
          <RangeField
            label="Geser foto kiri ↔ kanan"
            min={0}
            max={100}
            step={1}
            unit="%"
            value={form.idcard_photo_x || "50"}
            onChange={(v) => setField("idcard_photo_x", v)}
          />
          <RangeField
            label="Geser foto atas ↕ bawah"
            min={0}
            max={100}
            step={1}
            unit="%"
            value={form.idcard_photo_y || "32"}
            onChange={(v) => setField("idcard_photo_y", v)}
          />
          <RangeField
            label="Posisi kartu di halaman (desktop)"
            hint="Geser kartu ke kiri/kanan. Di HP kartu otomatis di tengah."
            min={50}
            max={92}
            step={1}
            unit="%"
            value={form.idcard_anchor_x || "74"}
            onChange={(v) => setField("idcard_anchor_x", v)}
          />
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setField("idcard_photo_height", DEFAULT_CONTENT.idcard_photo_height);
                setField("idcard_photo_zoom", DEFAULT_CONTENT.idcard_photo_zoom);
                setField("idcard_photo_x", DEFAULT_CONTENT.idcard_photo_x);
                setField("idcard_photo_y", DEFAULT_CONTENT.idcard_photo_y);
                setField("idcard_anchor_x", DEFAULT_CONTENT.idcard_anchor_x);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 text-xs text-gray-300 hover:text-white hover:bg-white/5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset posisi & ukuran
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SiteSettings() {
  const { setContent } = useSiteContent();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState("");

  useEffect(() => {
    fetchSiteContent()
      .then((data) => {
        setForm(data);
        setSnapshot(JSON.stringify(data));
      })
      .catch(() => {
        setForm({ ...DEFAULT_CONTENT });
        setSnapshot(JSON.stringify(DEFAULT_CONTENT));
      });
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
      const next = { ...prev, ...DEFAULT_THEME, character_theme: "default" };
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
      setSnapshot(JSON.stringify(saved));
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

  const dirty = !!form && JSON.stringify(form) !== snapshot;

  // Ctrl/Cmd + S = simpan dari posisi scroll mana pun
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && form) onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Peringatan kalau menutup tab saat ada perubahan belum disimpan
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

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
            Ubah nama, bio, welcome, background, loading, tema, WhatsApp, dan foto.
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

        {/* Character theme presets */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Preset karakter (klik = apply semua warna tema)</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CHARACTER_THEMES).map(([id, t]) => {
              const active = (form.character_theme || "default") === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    const next = {
                      ...form,
                      character_theme: id,
                      theme_bg: t.theme_bg,
                      theme_bg2: t.theme_bg2,
                      theme_blue: t.theme_blue,
                      theme_blue_light: t.theme_blue_light,
                      theme_accent: t.theme_accent,
                      theme_teal: t.theme_teal,
                      theme_pink: t.theme_pink,
                      theme_white: t.theme_white,
                      theme_muted: t.theme_muted,
                      // Loading progress ikut warna tema karakter
                      loading_color: t.theme_white || t.theme_blue_light,
                      welcome_fx_color: t.theme_blue,
                      welcome_color2: t.theme_blue,
                    };
                    setForm(next);
                    applyTheme(next);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    active
                      ? "border-white/30 bg-white/10 text-white"
                      : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: t.theme_blue }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
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
          <div className="space-y-4 pt-1">
            <div className="grid sm:grid-cols-2 gap-4">
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
            {(form.welcome_bg_style || "") === "marquee" && (
              <Field
                label="Teks marquee (bergerak kiri-kanan)"
                type="text"
                value={form.welcome_marquee_text || ""}
                onChange={(v) => setField("welcome_marquee_text", v)}
              />
            )}
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




      {/* ── Tampilan Projects ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
        <div>
          <h2 className="text-white font-medium">Tampilan Projects</h2>
          <p className="text-xs text-gray-500 mt-0.5">Grid klasik atau Carousel card expansion (gaya stack).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "carousel", label: "Carousel expansion" },
            { id: "grid", label: "Grid" },
          ].map((opt) => {
            const active = (form.project_layout || "carousel") === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setField("project_layout", opt.id)}
                className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                  active
                    ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                    : "border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Navbar & Maskot ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div>
          <h2 className="text-white font-medium">Navbar & Maskot</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Maskot di atas menu (Home / About / Portfolio / Contact). Panda default atau gambar dari public / URL custom. Warna navbar ikut Tema Warna.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {NAV_MASCOTS.map((m) => {
            const active = (form.nav_mascot || "panda") === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setField("nav_mascot", m.id)}
                className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                  active
                    ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="block text-xs font-medium">{m.label}</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">{m.type}</span>
              </button>
            );
          })}
        </div>
        {(form.nav_mascot || "") === "custom" && (
          <Field
            label="URL maskot custom (png/svg/webp)"
            type="text"
            value={form.nav_mascot_url || ""}
            onChange={(v) => setField("nav_mascot_url", v)}
          />
        )}
        <p className="text-[11px] text-gray-500">
          File di folder public: turtle-svgrepo-com.png, bear-svgrepo-com.png, 4th-july.png, cash-svgrepo-com.png, profit-svgrepo-com.png
        </p>
      </section>

      {/* ── Loading Progress ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-cyan-400" />
          <div>
            <h2 className="text-white font-medium">Loading Progress (0–100%)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Gaya progress bar, durasi, warna, dan teks. Bisa diganti kapan saja.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {LOADING_STYLES.map((s) => {
            const active = (form.loading_style || "bar") === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setField("loading_style", s.id)}
                className={`text-left rounded-xl border px-3 py-2 transition-colors ${
                  active
                    ? "border-cyan-500/50 bg-cyan-500/10 text-white"
                    : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="block text-xs font-medium">{s.label}</span>
                <span className="block text-[10px] text-gray-500 mt-0.5">{s.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field
            label="Teks loading"
            type="text"
            value={form.loading_text || ""}
            onChange={(v) => setField("loading_text", v)}
          />
          <label className="block space-y-1.5">
            <span className="text-xs text-gray-400">
              Durasi ({form.loading_duration || "4.5"} detik)
            </span>
            <input
              type="range"
              min="2"
              max="10"
              step="0.5"
              value={form.loading_duration || "4.5"}
              onChange={(e) => setField("loading_duration", e.target.value)}
              className="w-full accent-cyan-500"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-gray-400">Tampilkan persen</span>
            <select
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white outline-none"
              value={form.loading_show_pct === "false" ? "false" : "true"}
              onChange={(e) => setField("loading_show_pct", e.target.value)}
            >
              <option value="true" style={{ background: "#0a0a1a" }}>Ya</option>
              <option value="false" style={{ background: "#0a0a1a" }}>Tidak</option>
            </select>
          </label>
          <ColorField
            label="Warna progress"
            value={form.loading_color || "#ffffff"}
            onChange={(v) => setField("loading_color", v)}
          />
        </div>
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
          {section.title.startsWith("ID Card") && <IdCardPhotoEditor form={form} setField={setField} />}
          {section.title.startsWith("Bio") && <AboutMobileEditor form={form} setField={setField} />}
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

      {/* ── Foto karakter hover (About) ── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <div>
          <h2 className="text-white font-medium">Foto karakter hover (About)</h2>
          <p className="text-xs text-gray-500 mt-1">
            Upload foto kamu bergaya tiap karakter. Pilih karakter aktif — itu yang muncul saat hover di About.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {HOVER_CHARACTERS.map((c) => {
            const active = (form.hover_char || "spiderman") === c.id;
            const hasImg = !!(form[c.field] || (c.id === "spiderman" && form.hover_photo));
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  const url = form[c.field] || (c.id === "spiderman" ? form.hover_photo : "") || "";
                  setForm((prev) => ({
                    ...prev,
                    hover_char: c.id,
                    hover_photo: url || prev.hover_photo,
                  }));
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  active
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${hasImg ? "bg-green-400" : "bg-gray-600"}`} />
                {c.label}
                {active && <span className="text-[10px] text-cyan-300">aktif</span>}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <div>
            <h3 className="text-sm text-white font-medium">Paskan ukuran foto (kamu &amp; karakter)</h3>
            <p className="text-xs text-gray-500 mt-1">
              Besar-kecilkan dan geser salah satu foto sampai kepala &amp; bahu sejajar. Pratinjau menumpuk kedua foto.
            </p>
          </div>

          <div className="grid md:grid-cols-[220px_1fr] gap-5">
            {/* Pratinjau tumpukan */}
            <div className="relative w-full aspect-square max-w-[220px] rounded-xl overflow-hidden border border-white/10 bg-black/40">
              <img src={form.profile_photo} alt="" className="absolute inset-0 w-full h-full object-contain object-bottom"
                style={{ transformOrigin: "50% 40%", transform: `translate(${form.profile_offset_x ?? 0}%, ${form.profile_offset_y ?? 0}%) scale(${form.profile_scale ?? 1})` }} />
              <img src={form.hover_photo} alt="" className="absolute inset-0 w-full h-full object-contain object-bottom opacity-50"
                style={{ transformOrigin: "50% 40%", transform: `translate(${form.hover_offset_x ?? 0}%, ${form.hover_offset_y ?? 1.5}%) scale(${form.hover_scale ?? 0.86})` }} />
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {[
                ["Foto kamu", "profile", ["1", "0", "0"]],
                ["Foto karakter", "hover", ["0.86", "0", "1.5"]],
              ].map(([title, pre, defs]) => (
                <div key={pre} className="space-y-3">
                  <h4 className="text-xs font-medium text-white">{title}</h4>
                  {[
                    ["scale", "Ukuran", 0.5, 1.5, 0.01, defs[0]],
                    ["offset_x", "Geser kiri / kanan (%)", -20, 20, 0.5, defs[1]],
                    ["offset_y", "Geser atas / bawah (%)", -20, 20, 0.5, defs[2]],
                  ].map(([k, label, min, max, step, def]) => {
                    const key = `${pre}_${k}`;
                    return (
                      <label key={key} className="block space-y-1">
                        <span className="flex justify-between text-[11px] text-gray-400">
                          <span>{label}</span>
                          <span className="font-mono text-gray-300">{form[key] ?? def}</span>
                        </span>
                        <input type="range" min={min} max={max} step={step}
                          value={form[key] ?? def}
                          onChange={(e) => setField(key, e.target.value)}
                          className="w-full" />
                      </label>
                    );
                  })}
                  <button type="button"
                    onClick={() => setForm((prev) => ({ ...prev, [`${pre}_scale`]: defs[0], [`${pre}_offset_x`]: defs[1], [`${pre}_offset_y`]: defs[2] }))}
                    className="text-xs text-cyan-300 hover:text-cyan-200">
                    Kembalikan ke default
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {HOVER_CHARACTERS.map((c) => (
            <PhotoField
              key={c.id}
              label={`${c.label}${(form.hover_char || "spiderman") === c.id ? " · aktif" : ""}`}
              value={form[c.field] || (c.id === "spiderman" ? form.hover_photo : "") || ""}
              onChange={(v) => {
                setForm((prev) => {
                  const next = { ...prev, [c.field]: v };
                  // Jika karakter ini yang aktif, sync ke hover_photo
                  if ((prev.hover_char || "spiderman") === c.id) {
                    next.hover_photo = v;
                  }
                  // Spiderman legacy field
                  if (c.id === "spiderman") next.hover_photo_spiderman = v;
                  return next;
                });
              }}
            />
          ))}
        </div>
      </section>

      {/* Bar simpan melayang — selalu terlihat, tidak perlu scroll ke atas */}
      <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-8 z-40 flex justify-end pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/15 bg-[#0a0a1a]/90 backdrop-blur-xl px-3 py-2 shadow-2xl shadow-black/50">
          <span className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
            <span className={`w-2 h-2 rounded-full ${dirty ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            {dirty ? "Ada perubahan belum disimpan" : "Semua tersimpan"}
          </span>
          <button
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
