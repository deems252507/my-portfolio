import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { ImagePlus, Save, UserRound } from "lucide-react";
import {
  DEFAULT_CONTENT,
  fetchSiteContent,
  saveSiteContent,
  uploadSiteImage,
} from "../../lib/siteContent";
import { useSiteContent } from "../../context/SiteContentContext";

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
      .catch(() => setForm(DEFAULT_CONTENT));
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-blue-300 text-xs uppercase tracking-widest">
            <UserRound className="w-4 h-4" /> CMS
          </div>
          <h1 className="text-2xl font-semibold text-white mt-1">Profil & Konten</h1>
          <p className="text-sm text-gray-400 mt-1">
            Ubah nama, bio, teks, sosmed, dan foto. Animasi serta alur halaman tidak berubah.
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
