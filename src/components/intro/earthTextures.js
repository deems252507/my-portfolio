// Pemuat tekstur Bumi (citra satelit NASA Blue Marble). Urutan sumber per berkas:
//   1) /textures/earth/<nama>  -> taruh berkas resolusi tinggi milikmu di public/textures/earth/ (diutamakan)
//   2) CDN jsDelivr (contoh tekstur three.js, 2048px)  -> cadangan otomatis, tidak perlu mengunduh apa pun
// Hanya "day" yang wajib. Bila "day" gagal dimuat, Bumi prosedural lama tetap dipakai (tidak ada yang rusak).
import * as THREE from "three";

const CDN = "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r170/examples/textures/planets/";
const LOCAL = "/textures/earth/";

export const EARTH_FILES = {
  day:    { local: "earth_day.jpg",      cdn: "earth_atmos_2048.jpg",    srgb: true },
  night:  { local: "earth_night.jpg",    cdn: "earth_lights_2048.png",   srgb: true },
  spec:   { local: "earth_specular.jpg", cdn: "earth_specular_2048.jpg", srgb: false },
  normal: { local: "earth_normal.jpg",   cdn: "earth_normal_2048.jpg",   srgb: false },
  clouds: { local: "earth_clouds.png",   cdn: "earth_clouds_1024.png",   srgb: false },
};

function loadImage(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => { img.src = ""; reject(new Error("timeout " + url)); }, timeoutMs);
    img.onload = () => { clearTimeout(timer); (img.naturalWidth > 16 ? resolve(img) : reject(new Error("kosong " + url))); };
    img.onerror = () => { clearTimeout(timer); reject(new Error("gagal " + url)); };
    img.src = url;
  });
}

async function firstImage(def, timeoutMs, signal) {
  const urls = [LOCAL + def.local, CDN + def.cdn];
  for (const u of urls) {
    if (signal?.aborted) throw new Error("dibatalkan");
    try { return await loadImage(u, timeoutMs); } catch { /* coba sumber berikutnya */ }
  }
  throw new Error("tidak ada sumber untuk " + def.cdn);
}

// Awan: berkas PNG bisa berisi alpha (awan = opak) atau grayscale (awan = terang). Disatukan jadi 1 kanal kepadatan (0..1).
function cloudDensityTexture(img, maxW) {
  const w = Math.min(img.naturalWidth, maxW), h = Math.round(w * img.naturalHeight / img.naturalWidth);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  let minA = 255;
  for (let i = 3; i < px.length; i += 4 * 7) if (px[i] < minA) minA = px[i];
  const useAlpha = minA < 250;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = h - 1 - y; // DataTexture: baris 0 = bawah
    for (let x = 0; x < w; x++) {
      const i = (sy * w + x) * 4;
      out[y * w + x] = useAlpha ? px[i + 3] : Math.round((px[i] + px[i + 1] + px[i + 2]) / 3);
    }
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.unpackAlignment = 1;
  t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}

/**
 * Memuat semua tekstur secara paralel. Mengembalikan { day, night, spec, normal, clouds } (yang gagal = null)
 * atau null bila "day" tidak tersedia. Aman dipanggil dari mana saja; bisa dibatalkan lewat signal.
 */
export async function loadEarthTextures({ renderer, isMobile, signal, timeoutMs = 9000 }) {
  const maxAniso = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
  const aniso = Math.min(isMobile ? 4 : 8, maxAniso);
  const jobs = Object.entries(EARTH_FILES).map(async ([key, def]) => {
    try {
      const img = await firstImage(def, timeoutMs, signal);
      if (key === "clouds") return [key, cloudDensityTexture(img, isMobile ? 1024 : 2048)];
      const t = new THREE.Texture(img);
      t.colorSpace = def.srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
      t.anisotropy = aniso;
      t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true; t.needsUpdate = true;
      return [key, t];
    } catch { return [key, null]; }
  });
  const res = Object.fromEntries(await Promise.all(jobs));
  if (!res.day) { Object.values(res).forEach((t) => t?.dispose()); return null; }
  return res;
}
