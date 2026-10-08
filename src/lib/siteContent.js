import { supabase } from "../supabase";

export const SITE_CONTENT_KEY = "site_content_cache";

export const DEFAULT_THEME = {
  theme_bg: "#050510",
  theme_bg2: "#07071a",
  theme_blue: "#2563eb",
  theme_blue_light: "#3b82f6",
  theme_accent: "#06b6d4",
  theme_teal: "#10b981",
  theme_pink: "#ec4899",
  theme_white: "#f0f0ff",
  theme_muted: "#c0c0dc",
};

export const DEFAULT_CONTENT = {
  full_name: "Rizky Dwi Maulana",
  first_name: "Eka Wahyu",
  last_name: "Maulidan",
  greeting: "Hi, I'm",
  job_title: "Junior Developer",
  hero_line_1: "Turning Ideas",
  hero_line_2: "Into Reality",
  hero_subtitle:
    "Dimulai dari rasa penasaran, berkembang menjadi passion.\nAku membangun pengalaman digital yang tidak hanya terlihat bagus,\ntapi juga terasa bermakna bagi penggunanya.",
  typing_words: "IT Edu Student\nTech Enthusiast\nJunior Developer",
  bio: "Sebagai mahasiswa Fakultas Ilmu Komputer Universitas Brawijaya,\nAku berfokus pada pengembangan teknologi yang tidak hanya fungsional,\ntetapi juga menghadirkan pengalaman digital yang menarik dan berdampak.",
  meta_description:
    "Website resmi Eka Wahyu Maulidan. Aku berfokus pada pengembangan teknologi yang tidak hanya fungsional, tetapi juga menghadirkan pengalaman digital yang menarik dan berdampak.",
  footer_brand: "Eka Wahyu™",
  resume_url:
    "https://drive.google.com/file/d/1_Isso2Qk9xqHtEG5ac5uCiDjaOsk49Yl/view?usp=drive_link",
  github: "https://github.com/ekawahyu-project",
  linkedin:
    "https://www.linkedin.com/in/eka-wahyu-maulidan-484021315?utm_source=share_via&utm_content=profile",
  instagram: "https://www.instagram.com/eka.wahyu.m",
  profile_photo: "/Photo.png",
  hover_photo: "/PhotoSpiderman.png",
  edu1_logo: "/ub.png",
  edu1_school: "Universitas Brawijaya",
  edu1_major: "IT Edu | Faculty of Computer Science",
  edu1_year: "2025 – Present",
  edu2_logo: "/smkn.png",
  edu2_school: "SMKN WINONGAN",
  edu2_major: "Teknik Komputer dan Jaringan",
  edu2_year: "2021 – 2024",
  spotify_url:
    "https://open.spotify.com/playlist/4oQDhGjv57BzeOThOWQeS9?si=f46b0196ab0a4cdc",
  spotify_title: "Daily Rotation",
  spotify_desc:
    "A curated collection of tracks that keep me in the zone and inspired while coding.",

  // Welcome Screen (Loading)
  welcome_line1: "Welcome To My",
  welcome_line2: "Portofolio Website",
  welcome_font: "Arial",
  welcome_color1: "#ffffff",
  welcome_color2: "#2563eb",

  // Tema Warna Website
  ...DEFAULT_THEME,

  // WhatsApp
  wa_enabled: "true",
  wa_number: "6281234567890",
  wa_button_text: "Chat WhatsApp",
  wa_message: "Halo! Saya tertarik dengan portofolio Anda.",
};

export const WELCOME_FONTS = [
  "Arial",
  "Verdana",
  "Poppins",
  "Space Grotesk",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Impact",
  "Tahoma",
  "Trebuchet MS",
];

/** Apply theme CSS variables to document root */
export function applyTheme(content) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const c = content || DEFAULT_CONTENT;
  root.style.setProperty("--col-bg", c.theme_bg || DEFAULT_THEME.theme_bg);
  root.style.setProperty("--col-bg2", c.theme_bg2 || DEFAULT_THEME.theme_bg2);
  root.style.setProperty("--col-blue", c.theme_blue || DEFAULT_THEME.theme_blue);
  root.style.setProperty("--col-blue-light", c.theme_blue_light || DEFAULT_THEME.theme_blue_light);
  root.style.setProperty("--col-accent", c.theme_accent || DEFAULT_THEME.theme_accent);
  root.style.setProperty("--col-teal", c.theme_teal || DEFAULT_THEME.theme_teal);
  root.style.setProperty("--col-pink", c.theme_pink || DEFAULT_THEME.theme_pink);
  root.style.setProperty("--col-white", c.theme_white || DEFAULT_THEME.theme_white);
  root.style.setProperty("--col-muted", c.theme_muted || DEFAULT_THEME.theme_muted);
}

export function mergeContent(partial) {
  const next = { ...DEFAULT_CONTENT };
  if (!partial || typeof partial !== "object") return next;
  for (const key of Object.keys(DEFAULT_CONTENT)) {
    if (typeof partial[key] === "string") next[key] = partial[key];
  }
  return next;
}

export function readCachedContent() {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_KEY);
    if (!raw) return DEFAULT_CONTENT;
    return mergeContent(JSON.parse(raw));
  } catch {
    return DEFAULT_CONTENT;
  }
}

export function writeCachedContent(content) {
  try {
    localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(content));
  } catch {
    /* ignore quota */
  }
}

export function typingWords(content) {
  return String(content?.typing_words || "")
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);
}

export function toSpotifyEmbed(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.includes("/embed/")) return value;
  const match = value.match(/open\.spotify\.com\/(playlist|album|track|artist)\/([a-zA-Z0-9]+)/);
  if (!match) return "";
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
}

export async function fetchSiteContent() {
  const { data, error } = await supabase
    .from("site_content")
    .select("data")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  return mergeContent(data?.data || {});
}

export async function saveSiteContent(content) {
  const payload = mergeContent(content);
  const { error } = await supabase.from("site_content").upsert({
    id: 1,
    data: payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  writeCachedContent(payload);
  applyTheme(payload);
  return payload;
}

export async function uploadSiteImage(file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const fileName = `site/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("project-images").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("project-images").getPublicUrl(fileName);
  return data.publicUrl;
}
