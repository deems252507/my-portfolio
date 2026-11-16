// Adegan 3D "Programmer di markas luar angkasa": kamera sinematik, URL terketik huruf demi huruf,
// tangan benar-benar menekan ENTER, loading, lalu kamera menembus layar ke website asli.
// Dimuat lazy (code-split) dari DeveloperIntro.jsx supaya three.js tidak membebani halaman utama.
import * as THREE from "three";
import { gsap } from "gsap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { BrowserScreen } from "./browserScreen";
import { LightningSource } from "./lightningSource";
import { solveArm, placeLimb, smooth } from "./helpers";
import { buildCharacter } from "./character";
import { loadMutantCharacter } from "./mutantCharacter";
import { SCREEN, buildChair, buildDesk, buildMonitor, buildKeyboard, buildProps } from "./furniture";
import { PLANET_POS, buildSpaceBackdrop, buildEnvScene, buildStationShell } from "./spaceEnvironment";

/* =====================  PENGATURAN YANG MUDAH DIUBAH  ===================== */
export const INTRO_CONFIG = {
  url: "https://rizkydm.vercel.app/",
  // Model karakter realistis (opsional). Taruh file .glb di public/models/developer.glb.
  characterGLB: { url: "/models/developer.glb", position: [0, 0, 0.62], rotationY: 0, scale: 1 },
  // Karakter FBX Mixamo (aktif). Duduk di kursi, lengan IK, jari mengetik. Isi null untuk kembali ke karakter prosedural.
  characterFBX: { url: "/models/mutant.fbx", height: 1.88, hips: [0, 0.65, 0.65], lean: -0.09 },
  // Tangkapan layar halaman sambutan (opsional) untuk layar monitor: public/intro/portfolio-preview.jpg
  previewImage: "/intro/portfolio-preview.jpg",
  // Waktu (detik) tiap adegan
  t: {
    // +1,5 dtk ngoding di awal (monitor sudah menyala sejak frame pertama) dan fade ke layar asli diperpanjang (0,9 -> 1,3 dtk)
    powerOn: 0.5,
    codeEnd: 5.1, iconMove: 5.5, iconClick: 6.35, winOpen: 6.45, // Scene 1b: berhenti ngoding, kursor ke ikon browser di taskbar, klik, jendela terbuka
    cursorStart: 7.2, cursorEnd: 8.5, click: 8.6,        // Scene 2: kursor ke address bar
    typeStart: 9.2, typeDur: 3.4,                         // Scene 3: mengetik alamat
    enterReach: 13.5, enterPress: 15.0,                   // Scene 4: jeda baca alamat, LALU tangan ke ENTER (jari manis)
    loadStart: 15.5, loadDur: 1.5, pageStart: 16.8,       // loading browser, halaman tampil
    dive: 17.7, diveDur: 2.3, chromeOut: 18.0,            // Scene 5: kamera masuk, bezel hilang
    through: 20.0, throughDur: 1.3,
    welcome: 16.8,                                        // layar sambutan ASLI mulai berjalan di bawah (sama dengan halaman di monitor)
    reveal: 20.0, fade: 20.0, done: 21.3,                 // crossfade tepat saat layar memenuhi pandangan
  },
};
/* ======================================================================== */

const _v = new THREE.Vector3();
const _szv = new THREE.Vector2();

/* ---- jalur kamera: Hermite dengan tangen kontinu (bergerak dengan momentum, tidak "stop-go") ---- */
function prepTrack(keys) {
  const n = keys.length;
  keys.forEach((k, i) => {
    const a = keys[Math.max(0, i - 1)], b = keys[Math.min(n - 1, i + 1)];
    const dt = b.t - a.t || 1;
    const first = i === 0;
    const last = i === n - 1;
    k.mp = first ? new THREE.Vector3() : new THREE.Vector3().subVectors(b.p, a.p).divideScalar(dt);
    k.mg = first ? new THREE.Vector3() : new THREE.Vector3().subVectors(b.g, a.g).divideScalar(dt);
    k.mf = first ? 0 : (b.f - a.f) / dt;
    if (k.still) { k.mp.set(0, 0, 0); k.mg.set(0, 0, 0); k.mf = 0; }
    if (last && !k.still) { // akhir: tetap melaju kecuali key ditandai still
      const pr = keys[n - 2], d2 = k.t - pr.t || 1;
      k.mp.subVectors(k.p, pr.p).divideScalar(d2);
      k.mg.subVectors(k.g, pr.g).divideScalar(d2);
      k.mf = (k.f - pr.f) / d2;
    }
  });
  return keys;
}
function evalTrack(keys, t, outP, outG) {
  const n = keys.length;
  if (t <= keys[0].t) { outP.copy(keys[0].p); outG.copy(keys[0].g); return keys[0].f; }
  if (t >= keys[n - 1].t) { outP.copy(keys[n - 1].p); outG.copy(keys[n - 1].g); return keys[n - 1].f; }
  let i = 0;
  while (i < n - 2 && t >= keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const h = k1.t - k0.t, s = (t - k0.t) / h, s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  const herm = (out, a, ma, b, mb) => out.set(0, 0, 0)
    .addScaledVector(a, h00).addScaledVector(ma, h * h10).addScaledVector(b, h01).addScaledVector(mb, h * h11);
  herm(outP, k0.p, k0.mp, k1.p, k1.mp);
  herm(outG, k0.g, k0.mg, k1.g, k1.mg);
  return k0.f * h00 + k0.mf * h * h10 + k1.f * h01 + k1.mf * h * h11;
}

/* jadwal ketikan: tiap huruf punya jeda berbeda (ritme manusia), total = dur */
function typingSchedule(url, dur) {
  const w = [];
  for (let i = 0; i < url.length; i++) {
    let d = 0.7 + Math.random() * 0.6;
    if (":/.".includes(url[i])) d *= 1.25;
    if (i === 0) d = 0.9;
    w.push(d);
  }
  const sum = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  return w.map((x) => (acc += (x / sum) * dur));
}

/* pengaturan layar sambutan dari admin -> bentuk yang dipakai layar monitor */
function welcomeFrom(c = {}) {
  return {
    line1: c.welcome_line1, line2: c.welcome_line2, color1: c.welcome_color1, color2: c.welcome_color2,
    font: c.welcome_font, loadLabel: c.loading_text, loadColor: c.loading_color, loadTrack: c.loading_track,
    showPct: c.loading_show_pct !== "false",
  };
}

/* ----------------------------- fungsi utama ------------------------------ */
export function createDeveloperWorkspace(opts) {
  const { container, content = {}, theme = {}, lightning = {}, liveWelcome = null, audio = null, onZoom = null, onFadeP = null, onReady, onWelcome, onReveal, onFade, onDone, onError, holdStart = false } = opts;
  const T = INTRO_CONFIG.t;
  T.end = T.through + T.throughDur;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  let disposed = false;
  let skipped = false;
  // Mode diagnosa: buka situs dengan ?debug di akhir alamat -> log kejadian (resize, context hilang, frame lambat) tampil di layar HP.
  const DEBUG = /[?&]debug\b/.test(location.search);
  let dbgEl = null, dbgCt = 0;
  const dbgLines = [];
  const dbg = (m) => {
    if (!DEBUG) return;
    if (!dbgEl) {
      dbgEl = document.createElement("div");
      dbgEl.style.cssText = "position:fixed;left:6px;top:calc(env(safe-area-inset-top,0px) + 4px);z-index:99999;max-width:92vw;font:10px/1.3 monospace;color:#7CFF7C;background:rgba(0,0,0,.65);padding:4px 6px;pointer-events:none;white-space:pre-wrap";
      document.body.appendChild(dbgEl);
    }
    dbgLines.push(`${(performance.now() / 1000).toFixed(1)}s ct=${dbgCt.toFixed(1)} ${m}`);
    if (dbgLines.length > 12) dbgLines.shift();
    dbgEl.textContent = dbgLines.join("\n");
  };
  const onVis = () => dbg("visibility " + document.visibilityState);
  let canvasMO = null;
  document.addEventListener("visibilitychange", onVis);

  let renderer, composer, bloom, bokeh = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    onError?.(e);
    return { dispose() {}, skip() {}, update() {}, begin() {} };
  }
  const pixelRatioMax = isMobile ? 1.5 : 1.75;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, pixelRatioMax);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Bayangan diperbarui tiap 2 frame (HP: 3), bukan tiap frame. Sebelumnya bayangan juga digambar ulang oleh pass DOF
  // (adegan + bayangan dua kali per frame) -> ini penyebab utama laptop terasa berat.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.setClearColor(0x02050a, 1);
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  // Di HP, sistem bisa mencabut context WebGL (memori GPU habis / aplikasi dipindah). three.js memulihkannya sendiri,
  // tetapi bila tidak kembali dalam 2,5 dtk jangan biarkan layar hitam: lewati intro ke layar sambutan asli.
  let lostTimer = 0;
  const onCtxLost = (e) => {
    e.preventDefault();
    console.warn("[intro] WebGL context hilang");
    dbg("WEBGL CONTEXT LOST");
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => {
      if (disposed) return;
      console.warn("[intro] context tidak kembali, intro dilewati");
      onError?.(new Error("webgl context lost"));
    }, 2500);
  };
  const onCtxRestored = () => { clearTimeout(lostTimer); dbg("webgl context restored"); };
  canvas.addEventListener("webglcontextlost", onCtxLost);
  canvas.addEventListener("webglcontextrestored", onCtxRestored);

  if (DEBUG) {
    canvasMO = new MutationObserver((ml) => ml.forEach((m) => dbg(`canvas ${m.attributeName} berubah (${canvas.width}x${canvas.height})`)));
    canvasMO.observe(canvas, { attributes: true });
    const par = container.parentElement;
    if (par) canvasMO.observe(par, { attributes: true, attributeFilter: ["style", "class"] });
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02050a);
  scene.fog = new THREE.FogExp2(0x03070d, 0.05);

  // peta lingkungan = langit/planet/lampu ruangan -> pantulan realistis di kaca, lantai, meja, monitor
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = buildEnvScene(isMobile);
  const envTex = pmrem.fromScene(envScene, 0.02, 0.1, 400).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;
  envScene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });

  const camera = new THREE.PerspectiveCamera(38, 1, 0.03, 220);
  const cyan = new THREE.Color("#22d3ee");

  /* ---- layar monitor ---- */
  const lx = { hue: lightning.hue ?? 220, speed: lightning.speed ?? 1.6, intensity: lightning.intensity ?? 1.2, size: lightning.size ?? 2 };
  const makeBolt = () => new LightningSource({
    width: isMobile ? 512 : 1024, height: isMobile ? 235 : 470, octaves: isMobile ? 4 : 6, fps: isMobile ? 24 : 30, ...lx,
  });
  let boltSrc = (lightning.enabled === false) ? null : makeBolt();
  const screen = new BrowserScreen({
    url: INTRO_CONFIG.url,
    name: content.full_name || "Portfolio",
    nav: ["Home", "About", "Portofolio", "Contact"],
    accent: theme.accent || "#06b6d4",
    blue: theme.blue || "#2563eb",
    bg: theme.bg || "#050510",
    welcome: welcomeFrom(content),
    backdrop: { style: content.welcome_bg_style, color: content.welcome_fx_color },
    lightning: boltSrc,
    live: liveWelcome,
    quality: isMobile ? 0.5 : 0.85,
  });
  // gambar pratinjau halaman untuk layar monitor: ikut ditunggu saat loading (maks 4 dtk)
  let previewReady = false;
  const previewTimer = setTimeout(() => { previewReady = true; }, 4000);
  const prev = new Image();
  prev.onload = () => { if (prev.naturalWidth > 100) screen.preview = prev; previewReady = true; };
  prev.onerror = () => { previewReady = true; };
  prev.src = INTRO_CONFIG.previewImage;
  const progDurOf = (c) => {
    const total = Math.max(6000, Math.max(1500, (parseFloat(c.loading_duration) || 4.5) * 1000));
    return Math.max(1.5, (total - 1250) / 1000); // detik, sama dengan LoadingProgress asli
  };
  let progDur = progDurOf(content);
  const boltCol = new THREE.Color().setHSL(((lx.hue % 360) / 360), 0.8, 0.6);

  /* ---- objek ---- */
  const space = buildSpaceBackdrop(scene, { isMobile });
  const shell = buildStationShell(scene, { isMobile, cyan });

  // Tekstur Bumi (citra satelit NASA) dimuat paralel. Adegan menunggu maksimal 7 detik; bila lebih lambat
  // atau gagal, Bumi prosedural tetap tampil dan versi realistis fade-in begitu siap (tidak ada yang rusak).
  let earthReady = false;
  const earthTimer = setTimeout(() => { earthReady = true; }, 7000);
  space.loadEarth(renderer)
    .catch((e) => console.warn("[intro] Tekstur Bumi gagal dimuat, memakai Bumi prosedural:", e))
    .finally(() => { clearTimeout(earthTimer); earthReady = true; });
  buildDesk(scene, cyan);
  const mon = buildMonitor(scene, screen.texture);
  const kb = buildKeyboard(scene);
  buildProps(scene, cyan);
  const chair = buildChair(scene);
  const ch = buildCharacter(scene, { isMobile });

  // Muat karakter FBX; adegan baru dimulai setelah selesai (atau gagal / lewat 25 dtk -> karakter bawaan)
  let charReady = !INTRO_CONFIG.characterFBX;
  let charAbort = false;
  if (INTRO_CONFIG.characterFBX) {
    const charTimer = setTimeout(() => { charAbort = true; charReady = true; }, 25000);
    loadMutantCharacter(scene, ch, INTRO_CONFIG.characterFBX, () => disposed || charAbort)
      .catch((e) => console.warn("[intro] Karakter FBX gagal dimuat, memakai karakter bawaan:", e))
      .finally(() => { clearTimeout(charTimer); charReady = true; });
  }

  /* ---- cahaya ---- */
  scene.add(new THREE.HemisphereLight(0x2a4d66, 0x04060a, 0.5));
  const planetLight = new THREE.DirectionalLight(0x78aeff, 1.15); // cahaya planet menembus kaca
  planetLight.position.copy(PLANET_POS);
  planetLight.target.position.set(0, 1, 0);
  scene.add(planetLight, planetLight.target);
  const key = new THREE.SpotLight(0xa9d4ff, 40, 9, 0.62, 0.85, 2);
  key.position.set(1.9, 3.3, 2.4);
  key.target.position.set(0, 0.9, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const rim = new THREE.PointLight(0x22d3ee, 4, 5, 2); rim.position.set(-1.1, 1.7, 1.6); scene.add(rim);
  const violet = new THREE.PointLight(0x6d4aff, 2.5, 5, 2); violet.position.set(1.8, 0.7, 1.4); scene.add(violet);
  const glow = new THREE.PointLight(0x5fe7ff, 0.5, 3.5, 2); glow.position.set(0, 1.15, 0.35); scene.add(glow);
  let areaLight = null;
  if (!isMobile) {
    RectAreaLightUniformsLib.init();
    areaLight = new THREE.RectAreaLight(0x7fe9ff, 2.5, SCREEN.w, SCREEN.h);
    areaLight.position.set(0, SCREEN.cy, SCREEN.cz + 0.03);
    areaLight.lookAt(0, SCREEN.cy, 2);
    scene.add(areaLight);
  }
  const lamp = new THREE.PointLight(0xffc27a, 1.6, 2.2, 2); lamp.position.set(0.7, 1.12, -0.08); scene.add(lamp);

  /* ---- post-processing: DOF + bloom ---- */
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const noDepth = [...space.noDepth, ...shell.noDepth, mon.glass];
  if (!isMobile) {
    try {
      bokeh = new BokehPass(scene, camera, { focus: 1.5, aperture: 0.00025, maxblur: 0.012 });
      const orig = bokeh.render.bind(bokeh);
      // kaca/berkas cahaya/debu tidak boleh ikut menentukan kedalaman (agar planet tetap terbaca jauh & buram halus)
      bokeh.render = (...a) => {
        noDepth.forEach((o) => { o.userData._v = o.visible; o.visible = false; });
        try { orig(...a); } finally { noDepth.forEach((o) => { o.visible = o.userData._v; }); }
      };
      composer.addPass(bokeh);
    } catch { bokeh = null; }
  }
  const bloomBase = isMobile ? 0.3 : 0.42;
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), bloomBase, 0.55, 0.5);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---- jalur kamera ---- */
  const size = { w: 1, h: 1 };
  let camKeys = [];
  let fovEnd = 50;
  let dEndV = 0.45; // jarak kamera saat layar tepat memenuhi pandangan
  const K = (t, p, g, f, still = false) => ({ t, p: new THREE.Vector3(...p), g: new THREE.Vector3(...g), f, still });

  const layout = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    size.w = w; size.h = h;
    const cur = renderer.getSize(_szv);
    if (cur.x !== w || cur.y !== h) renderer.setSize(w, h, false); // setSize mengosongkan canvas: hanya bila ukuran benar-benar berubah
    dbg(`layout ${w}x${h} pr=${pixelRatio}`);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    camera.aspect = w / h;
    const k = camera.aspect < 0.9 ? 1.45 : camera.aspect < 1.4 ? 1.15 : 1; // layar sempit: kamera lebih mundur
    const portrait = camera.aspect < 1.2;
    fovEnd = portrait ? 72 : 50;
    const V = portrait ? 0.8 : 0.42; // tinggi layar yang terlihat di akhir: bezel keluar dari pandangan
    const dEnd = (V / 2) / Math.tan(THREE.MathUtils.degToRad(fovEnd / 2));
    dEndV = dEnd;
    const narrow = camera.aspect < 0.9;
    const pull = (p, g) => { // tarik mundur terhadap target
      const gv = new THREE.Vector3(...g), pv = new THREE.Vector3(...p);
      return pv.sub(gv).multiplyScalar(k).add(gv).toArray();
    };
    const barG = narrow ? [-0.3, 1.41, -0.2] : [-0.2, 1.41, -0.2];
    camKeys = prepTrack([
      K(0, pull([3.5, 1.95, 4.7], [-0.35, 1.05, -0.4]), [-0.35, 1.05, -0.4], 38),
      K(3.2, pull([1.75, 1.7, 2.5], [-0.05, 1.15, -0.3]), [-0.05, 1.15, -0.3], 33), // mendekat: kode di layar terbaca
      K(6.8, pull([1.0, 1.5, 1.75], [0, 1.22, -0.2]), [0, 1.22, -0.2], 33),
      // bidikan address bar dari ATAS bahu/kepala (tidak menembus kepala karakter), bertahan sampai alamat selesai & terbaca
      // kamera DIAM total dari kursor sampai alamat selesai & terbaca (dua kunci identik, kecepatan nol)
      K(T.cursorEnd, narrow ? [0.1, 1.58, 0.95] : [0.15, 1.6, 0.9], barG, narrow ? 52 : 29, true),
      K(T.enterReach, narrow ? [0.1, 1.58, 0.95] : [0.15, 1.6, 0.9], barG, narrow ? 52 : 29, true),
      // baru setelah itu: mundur ke bidikan medium, lalu mendekat ke keyboard untuk menekan ENTER
      K(T.enterReach + 0.8, pull([0.6, 1.28, 1.3], [0.05, 1.05, 0.0]), [0.05, 1.05, 0.0], 38),
      K(T.enterPress - 0.2, pull([0.85, 1.12, 1.0], [0.17, 0.86, 0.12]), [0.17, 0.86, 0.12], 33),
      K(T.enterPress + 0.8, pull([0.7, 1.2, 1.05], [0.1, 1.0, 0.0]), [0.1, 1.0, 0.0], 34),
      K(T.pageStart + 0.2, pull([0.45, 1.34, 1.0], [0, 1.2, -0.2]), [0, 1.2, -0.2], 32),
      // masuk ke monitor lewat samping kanan karakter (di atas lengan, jauh dari kepala), baru ke tengah layar
      K(T.dive, pull([0.42, 1.3, 0.85], [0, 1.2, -0.2]), [0, 1.2, -0.2], 31),
      K(T.dive + T.diveDur * 0.55, [0.3, 1.27, 0.5], [0, 1.2, -0.2], 36),
      // layar tepat memenuhi pandangan, kamera TERUS melaju menembus layar (pembesaran ringan: 1.14x desktop, 1.05x HP supaya tidak ada yang terpotong), lalu melambat.
      // Layar asli di bawah overlay diskala sama persis (onZoom) sehingga crossfade tetap menyatu.
      K(T.dive + T.diveDur, [0, SCREEN.cy, SCREEN.cz + dEnd], [0, 1.2, -0.2], fovEnd),
      K(T.end, [0, SCREEN.cy, SCREEN.cz + dEnd / (portrait ? 1.05 : 1.14)], [0, 1.2, -0.2], fovEnd, true),
    ]);
    screen.view = { visH: V / SCREEN.h, visW: (V * camera.aspect) / SCREEN.w };
    camera.updateProjectionMatrix();
  };
  layout();
  let lastW = container.clientWidth, lastH = container.clientHeight;
  let layoutPending = false;
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    // HP: bilah alamat browser muncul/hilang saat layar disentuh -> tinggi berubah sedikit. Mengubah ukuran canvas
    // mengosongkannya (kedip hitam) dan menyusun ulang jalur kamera, jadi perubahan tinggi kecil diabaikan.
    if (isMobile && w === lastW && Math.abs(h - lastH) < 160) { dbg(`RO ${w}x${h} (diabaikan)`); return; }
    dbg(`RO ${w}x${h} -> layout`);
    lastW = w; lastH = h;
    // JANGAN layout() di sini: callback ResizeObserver berjalan SETELAH frame digambar tetapi SEBELUM ditampilkan,
    // dan setSize() mengosongkan canvas -> 1-2 frame hitam ("kedip"). Ditunda ke dalam frame(), tepat sebelum render.
    layoutPending = true;
  });
  ro.observe(container);

  /* ---- state animasi (digerakkan GSAP) ---- */
  const S = {
    ct: 0, sway: 1, power: 1, typeT: 0, typeAmt: 1, loading: 0, page: 0, full: 0,
    cursor: 0, click: 0, focus: 0, rMouse: 0, rEnter: 0, enterPress: 0, lift: 0, win: 0, ptr: 0,
    exposure: 0.95, bloom: bloomBase, bolt: 1,
  };
  // parallax mouse/sentuh: kamera bergeser sangat halus (hilang sebelum kamera masuk ke layar, jadi tidak mengganggu alur)
  const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
  const onPointer = (e) => {
    const w = window.innerWidth || 1, h = window.innerHeight || 1;
    ptr.x = (e.clientX / w) * 2 - 1;
    ptr.y = -((e.clientY / h) * 2 - 1);
    space.setPointer(ptr.x, ptr.y, t);
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const sched = typingSchedule(INTRO_CONFIG.url, T.typeDur);
  let typedCount = 0;
  let codeKeys = 12; // jumlah ketukan saat 'ngoding' (menggerakkan teks kode di layar); sudah ada beberapa baris terketik sejak awal
  const CODE_CHARS = "etaoinshrdlucmfwypvbgkqjxz";

  const pos = new THREE.Vector3(), tgt = new THREE.Vector3();
  const sh = new THREE.Vector3(), W = new THREE.Vector3(), pole = new THREE.Vector3();
  let fovNow = 38;

  function updateCamera(t) {
    fovNow = evalTrack(camKeys, S.ct, pos, tgt);
    pos.x += Math.sin(t * 0.7) * 0.006 * S.sway;
    pos.y += Math.sin(t * 0.9 + 1.0) * 0.005 * S.sway;
    // parallax mouse (dihaluskan; memudar total sebelum dive supaya layar tetap pas memenuhi pandangan)
    const par = (1 - smooth(T.enterPress, T.dive, S.ct)) * (isMobile ? 0.6 : 1);
    const kp = 1 - Math.exp(-0.06 * 60 * Math.min(0.05, dtLast));
    ptr.sx += (ptr.x - ptr.sx) * kp; ptr.sy += (ptr.y - ptr.sy) * kp;
    pos.x += ptr.sx * 0.075 * par; pos.y += ptr.sy * 0.04 * par;
    tgt.x += ptr.sx * 0.02 * par; tgt.y += ptr.sy * 0.012 * par;
    camera.position.copy(pos);
    camera.lookAt(tgt);
    if (onZoom && S.ct >= T.dive + T.diveDur - 0.02) {
      const d = Math.max(0.02, camera.position.z - SCREEN.cz);
      onZoom(Math.max(1, dEndV / d));
    }
    // memudarnya overlay 3D mengikuti jam adegan (sinkron dengan frame yang digambar), bukan transisi CSS yang bisa
    // tertunda/terpotong saat thread utama HP sibuk. Selesai (1) tepat sebelum T.end.
    if (onFadeP && S.ct >= T.fade - 0.02) onFadeP(smooth(T.fade, T.fade + 1.2, S.ct));
    if (Math.abs(camera.fov - fovNow) > 0.001) { camera.fov = fovNow; camera.updateProjectionMatrix(); }
    if (bokeh) {
      if (dofKill) dofMul = Math.max(0, dofMul - dtLast * 2.5);
      const d = camera.position.distanceTo(tgt);
      const f = bokeh.uniforms.focus.value;
      bokeh.uniforms.focus.value = f + (d - f) * 0.2;
      // blur memudar halus (sebelumnya mati mendadak = gambar "berkedip" tajam)
      const dofK = (1 - smooth(T.dive, T.dive + 1.2, S.ct)) * dofMul;
      bokeh.uniforms.maxblur.value = 0.012 * dofK;
      bokeh.enabled = dofK > 0.02;
      if (dofKill && dofMul <= 0) { composer.removePass(bokeh); bokeh = null; }
    }
  }

  /* ---- ketikan & tombol ---- */
  // posisi tangan: offset (x,z) menuju tombol yang ditekan; jari ditentukan oleh kolom tombol
  const HOME = { L: -0.0994, R: 0.0581 }; // jari telunjuk tepat di F (kiri) dan J (kanan)
  const FOFF = [-0.0375, -0.0125, 0.0125, 0.0375]; // posisi jari terhadap pusat telapak
  const hx = { L: 0, R: 0, Lz: 0, Rz: 0 };
  const hxT = { L: 0, R: 0, Lz: 0, Rz: 0 };
  const SHIFTED = { ":": ";", "?": "/", "_": "-", "+": "=" };
  function keystroke(chr) {
    const base = SHIFTED[chr] || chr.toLowerCase();
    let idx = kb.charIdx[base];
    if (idx === undefined) idx = kb.live[(chr.charCodeAt(0) * 13 + typedCount * 7) % kb.live.length];
    kb.pressed[idx] = 1;
    const x = kb.rest[idx][0], z = kb.rest[idx][2];
    const left = x < -0.02;
    // jari sesuai kolom: kiri (kelingking..telunjuk) = 0..3, kanan (telunjuk..kelingking) = 0..3
    let fi;
    if (left) fi = x < -0.13 ? 0 : x < -0.103 ? 1 : x < -0.075 ? 2 : 3;
    else fi = x < 0.034 ? 0 : x < 0.062 ? 1 : x < 0.09 ? 2 : 3;
    const H = left ? ch.handL : ch.handR;
    H.fingers[fi].hit = 1;
    const side = left ? "L" : "R";
    const home = HOME[side];
    hxT[side] = Math.max(-0.07, Math.min(0.07, x - FOFF[fi] - home));
    hxT[side + "z"] = (z - 0.12) * 0.9;
    audio?.key?.();
  }

  const rng = { next: 0 };
  function updateCharacter(t, dt) {
    const a = S.typeAmt;
    ch.upper.rotation.x = 0.07 + Math.sin(t * 1.25) * 0.008 + S.rEnter * 0.03;
    ch.torso.scale.y = 1 + Math.sin(t * 1.25) * 0.012;
    ch.head.rotation.y = Math.sin(t * 0.55) * 0.04 + Math.sin(t * 1.7) * 0.008;
    ch.head.rotation.x = -0.1 + Math.sin(t * 0.9) * 0.012 - (S.typeT > 0 && S.typeT < T.typeDur ? 0.02 : 0);
    chair.rotation.y = Math.sin(t * 0.4) * 0.02;

    const k = Math.min(1, dt * 16);
    hx.L += (hxT.L - hx.L) * k; hx.R += (hxT.R - hx.R) * k;
    hx.Lz += (hxT.Lz - hx.Lz) * k; hx.Rz += (hxT.Rz - hx.Rz) * k;
    const decay = Math.pow(0.55, dt * 5); // tangan kembali ke posisi awal bila berhenti mengetik
    hxT.L *= decay; hxT.R *= decay; hxT.Lz *= decay; hxT.Rz *= decay;

    const hl = ch.handL.group, hr = ch.handR.group;
    const idleY = (ph, sp) => Math.max(0, Math.sin(t * sp + ph)) * 0.004 * a;
    hl.position.set(HOME.L + hx.L, 0.812 + idleY(0, 9.3), 0.245 + hx.Lz);
    // tangan kanan: keyboard -> mouse -> ENTER (berurutan, dicampur halus)
    hr.position.set(HOME.R + hx.R, 0.812 + idleY(2, 8.1), 0.245 + hx.Rz);
    hr.position.lerp(_mouseP.set(kb.mouse.position.x, 0.826, kb.mouse.position.z + 0.055), S.rMouse);
    // jari manis (kanan, indeks 2) tepat di atas ENTER
    hr.position.lerp(_enterP.set(kb.enterPos[0] - FOFF[2], 0.812, 0.245), S.rEnter);
    hr.position.y += 0.075 * S.lift - 0.003 * S.enterPress; // tangan DIANGKAT dulu saat berpindah ke ENTER, baru turun menekan
    hl.rotation.set(0.05, 0.1, 0);
    // saat memegang mouse: pergelangan sedikit melengkung, telapak ikut menoleh ke arah gerak kursor, ada getar halus
    const mg = S.rMouse * (1 - S.rEnter);
    const mDrift = Math.sin(t * 2.3) * 0.012 + Math.sin(t * 5.1 + 1.3) * 0.006;
    hr.rotation.set(
      0.05 - 0.22 * S.lift - 0.1 * mg, // jari sedikit menurun mengikuti lengkung mouse
      -0.1 + S.rEnter * 0.1 + mg * (0.12 - 0.34 * S.cursor + mDrift),
      -0.1 * S.rEnter + mg * 0.06
    );

    [ch.handL, ch.handR].forEach((hd, hi) => hd.fingers.forEach((f, i) => {
      f.hit = Math.max(0, f.hit - dt * 8);
      const idle = Math.max(0, Math.sin(t * f.speed * 0.35 + f.phase)) * 0.06 * a;
      let c1 = 0.2 + f.hit * 0.16 + idle;
      let c2 = 0.26 + f.hit * 0.2 + idle * 1.2;
      if (hi === 1) {
        // genggaman rileks: telunjuk & jari tengah melengkung di atas tombol, jari manis & kelingking menekuk di sisi mouse
        const grip = i < 2 ? 0.26 : 0.42;
        c1 += S.rMouse * grip; c2 += S.rMouse * (grip + 0.04);
        if (i === 0) { c1 += S.click * 0.14; c2 += S.click * 0.1; }
        if (i !== 2) { c1 -= S.rEnter * 0.08; c2 -= S.rEnter * 0.08; }
        if (i === 2) { c1 += S.enterPress * 0.14; c2 += S.enterPress * 0.18; }
        c1 -= S.lift * 0.1; c2 -= S.lift * 0.08;
      }
      f.p1.rotation.x = -c1;
      f.p2.rotation.x = -c2;
    }));

    ch.upper.updateMatrixWorld(true);
    [[ch.shoulderL, ch.armL, hl, -1], [ch.shoulderR, ch.armR, hr, 1]].forEach(([sp, arm, hand, side]) => {
      sh.copy(sp);
      ch.upper.localToWorld(sh);
      W.set(hand.position.x, hand.position.y + 0.018, hand.position.z + 0.098);
      pole.set(side * 0.7, -0.75, 0.25);
      solveArm(sh, W, 0.28, 0.27, pole, arm.elbowPos);
      placeLimb(arm.upper, sh, arm.elbowPos);
      const dir = placeLimb(arm.fore, arm.elbowPos, W);
      arm.elbow.position.copy(arm.elbowPos);
      arm.cuff.position.copy(W).addScaledVector(dir, -0.02);
      arm.cuff.quaternion.copy(arm.fore.quaternion);
    });
    ch.sync?.(); // karakter FBX: terjemahkan proxy (kepala, punggung, tangan, jari) ke tulang

    // mouse mengikuti kursor di layar
    const msw = S.rMouse * (0.004 * Math.sin(t * 3.3) + 0.002 * Math.sin(t * 7.7));
    kb.mouse.position.x = 0.47 - 0.025 * S.ptr - 0.025 * S.cursor + msw;
    kb.mouse.position.z = 0.15 - 0.03 * S.ptr - 0.02 * S.cursor + msw * 0.6 + 0.004 * S.click;
    kb.strip.position.set(kb.mouse.position.x, 0.7875, kb.mouse.position.z - 0.022);

    // tombol: turun saat ditekan, kembali naik
    if (running && S.ct < T.codeEnd && S.typeT <= 0) { // mengetik sejak detik pertama (tidak menunggu monitor 'menyala')
      // NGODING: kedua tangan terus mengetik (jari sesuai tombol, telapak bergeser, tombol turun) sampai ia beralih ke mouse
      rng.next -= dt;
      if (rng.next <= 0) {
        rng.next = 0.06 + Math.random() * 0.11 + (Math.random() < 0.1 ? 0.28 : 0); // sesekali jeda berpikir
        keystroke(CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]);
        codeKeys++;
      }
    } else if (a > 0.05 && S.typeT <= 0) { // ketukan acak halus (tanpa suara) sebelum mengetik URL
      rng.next -= dt;
      if (rng.next <= 0) {
        rng.next = (0.12 + Math.random() * 0.14) / Math.max(0.3, a);
        kb.pressed[kb.live[Math.floor(Math.random() * kb.live.length)]] = 1;
      }
    }
    for (let i = 0; i < kb.pressed.length; i++) {
      const p = kb.pressed[i];
      if (p > 0.01) {
        kb.pressed[i] = p * Math.pow(0.0006, dt);
        kb.setKey(i, kb.pressed[i]);
      } else if (p > 0) {
        kb.pressed[i] = 0;
        kb.setKey(i, 0);
      }
    }
    kb.enter.position.y = kb.enterPos[1] - 0.005 * S.enterPress; // ENTER benar-benar turun
    kb.enterMat.emissiveIntensity = 1.6 * S.enterPress;
    kb.rgbMat.color.setHSL((t * 0.08) % 1, 0.95, 0.55);
  }
  const _mouseP = new THREE.Vector3(), _enterP = new THREE.Vector3();

  let lastSig = "";
  let lastDraw = 0;
  function updateScreen(t, nowMs) {
    const chars = sched.reduce((c, ts) => (ts <= S.typeT ? c + 1 : c), 0);
    while (typedCount < chars) { keystroke(INTRO_CONFIG.url[typedCount]); typedCount++; }
    const blink = Math.floor(t * 2.4) % 2;
    const spin = S.loading > 0 && S.loading < 1 ? Math.floor(t * 24) : 0;
    const boltOn = S.page > 0 ? Math.floor(t * 30) : 0;
    const liveTick = S.page > 0 ? Math.floor(nowMs / (isMobile ? 50 : 33)) : 0;
    const codeN = S.win >= 1 ? 999 : Math.floor(codeKeys * 2.6); // teks kode bertambah sesuai ketukan jari
    const sig = [S.ptr.toFixed(3), S.win.toFixed(2), codeN, S.power.toFixed(2), typedCount, S.loading.toFixed(2), S.page.toFixed(2), S.full.toFixed(2), S.cursor.toFixed(3), S.click.toFixed(2), S.focus, blink, spin, boltOn, S.bolt.toFixed(2), screen.preview ? 1 : 0, screen.rev, liveTick].join("|");
    if (sig !== lastSig && nowMs - lastDraw > (isMobile ? 45 : 30)) {
      lastSig = sig;
      lastDraw = nowMs;
      screen.draw({
        time: t, win: S.win, ptr: S.ptr, codeN, power: S.power, chars: typedCount, loading: S.loading, page: S.page, full: S.full,
        cursor: S.cursor, click: S.click, focus: S.focus, bolt: S.bolt,
        wt: Math.max(0, S.ct - T.welcome), prog: Math.min(1, Math.max(0, (S.ct - T.welcome) / progDur)),
        cursorAlpha: typedCount > 0 || S.page > 0 ? 0 : 1,
      });
    }
    const pw = S.power * (0.55 + 0.45 * (1 - S.full * 0.3));
    glow.intensity = 0.5 * pw;
    if (areaLight) areaLight.intensity = 2.5 * pw * (1 + S.bolt * 0.15 * S.page);
    // cahaya layar berubah warna mengikuti petir saat halaman tampil (pantulan di meja, kursi, karakter)
    const tint = S.page * 0.85;
    glow.color.setRGB(0.37, 0.9, 1).lerp(boltCol, tint);
    areaLight?.color.setRGB(0.5, 0.91, 1).lerp(boltCol, tint);
    mon.glass.material.opacity = 0.08 * (1 - S.full);
  }

  /* ---- loop render ---- */
  let raf = 0;
  let dtLast = 0.016;
  let last = performance.now();
  let t = 0;
  let qAcc = 0, qN = 0, qLevel = 0, qLast = 0, shadowTick = 0;
  let dofKill = false, dofMul = 1;
  let running = false;
  let warm = 0, readyFired = false, beginRequested = !holdStart;
  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const rawGap = now - last;
    const dt = Math.min(0.05, rawGap / 1000);
    last = now;
    dbgCt = S.ct;
    if (DEBUG && rawGap > 50 && running) dbg(`frame lambat ${rawGap | 0}ms`);
    if (DEBUG && renderer.getContext().isContextLost()) dbg("context SEDANG hilang");
    dtLast = dt;
    t += dt;
    if (layoutPending) { layoutPending = false; layout(); } // ubah ukuran + render di frame yang sama = tidak ada frame kosong

    // Kualitas adaptif, dievaluasi tiap 90 frame DAN selama animasi berjalan (bagian akhir adalah yang terberat).
    // Urutan menurunkan: (1) matikan DOF = paling mahal & tidak membuat gambar buram, (2) turunkan resolusi
    // (yang membuat gambar tampak blur, jadi dijadikan langkah kedua), (3) kurangi partikel.
    qAcc += dt; qN++;
    if (qN >= 90) {
      const avg = qAcc / qN;
      qAcc = 0; qN = 0;
      if (avg > (isMobile ? 0.034 : 0.03) && qLevel < 3 && now - qLast > 1200) {
        qLevel++; qLast = now;
        if (qLevel === 1 && !bokeh) qLevel = 2; // HP tidak punya DOF: langsung ke langkah berikutnya
        dbg(`kualitas turun level ${qLevel} (avg ${(avg * 1000) | 0}ms)`);
        if (qLevel === 1) dofKill = true;
        else if (qLevel === 2) {
          // hanya kecilkan render target post-processing; canvas TIDAK diubah (mengubahnya = canvas kosong = kedip hitam)
          if (pixelRatio > 1) { pixelRatio = 1; composer.setPixelRatio(1); composer.setSize(size.w, size.h); }
        }
        else space.setQuality(avg > 0.045 ? 0.3 : 0.55);
      }
    }
    shadowTick++;
    if (shadowTick < 3 || shadowTick % (isMobile ? 3 : 2) === 0) renderer.shadowMap.needsUpdate = true;

    updateCamera(t);
    updateCharacter(t, dt);
    glbMixer?.update(dt);
    updateScreen(t, now);
    space.update(t, dt, camera, size.h * pixelRatio);
    shell.update(t, dt);
    renderer.toneMappingExposure = S.exposure;
    bloom.strength = S.bloom;
    composer.render(dt);

    // Semua aset (karakter, Bumi, pratinjau) sudah ada -> "panaskan" GPU beberapa frame (shader terkompilasi,
    // tekstur terunggah) SEBELUM loader dilepas, supaya animasi mulus dan tidak ada layar gelap / patah-patah.
    if (!running && charReady && earthReady && previewReady) {
      warm++;
      if (warm >= 6) {
        if (!readyFired) { readyFired = true; onReady?.(); }
        if (beginRequested) { running = true; startTimeline(); }
      }
    }
  }

  /* ---- timeline GSAP ---- */
  let tl = null;
  function startTimeline() {
    tl = gsap.timeline({ defaults: { ease: "none" } });
    tl.to(S, { ct: T.end, duration: T.end }, 0)                                   // jam kamera
      .to(S, { sway: 0, duration: 0.6, ease: "sine.out" }, T.cursorEnd - 0.6)   // goyangan halus berhenti saat mengetik
      .to(S, { sway: 1, duration: 0.8, ease: "sine.inOut" }, T.enterReach)
      .to(S, { sway: 0, duration: 1.2, ease: "sine.out" }, T.dive)
      .to(S, { typeAmt: 0.5, duration: 0.4, ease: "sine.inOut" }, T.codeEnd)
      // Scene 1b: jendela browser BARU terbuka di atas editor kode (dia berhenti ngoding lalu membuka link)
      .to(S, { ptr: 1, duration: 0.8, ease: "power2.inOut" }, T.iconMove)                    // kursor ke ikon browser
      .call(() => audio?.click?.(), null, T.iconClick)                                      // suara klik mouse: ikon browser
      .to(S, { click: 1, duration: 0.1 }, T.iconClick)
      .to(S, { click: 0, duration: 0.3, ease: "power1.out" }, T.iconClick + 0.1)
      .to(S, { win: 1, duration: 0.75, ease: "power2.out" }, T.winOpen)
      // Scene 2: tangan ke mouse, kursor menuju address bar, klik
      .to(S, { rMouse: 1, duration: 0.7, ease: "sine.inOut" }, T.codeEnd)
      .to(S, { cursor: 1, duration: T.cursorEnd - T.cursorStart, ease: "power2.inOut" }, T.cursorStart)
      .call(() => audio?.click?.(), null, T.click)                                          // suara klik mouse: address bar (pencarian)
      .to(S, { click: 1, duration: 0.1 }, T.click)
      .to(S, { click: 0, duration: 0.4, ease: "power1.out" }, T.click + 0.1)
      .set(S, { focus: 1 }, T.click)
      .to(S, { rMouse: 0, duration: 0.6, ease: "sine.inOut" }, T.click + 0.2)
      // Scene 3: mengetik alamat (tiap huruf = ketukan jari + suara)
      .to(S, { typeAmt: 1, duration: 0.5, ease: "sine.inOut" }, T.typeStart - 0.5)
      .to(S, { typeT: T.typeDur, duration: T.typeDur }, T.typeStart)
      .to(S, { typeAmt: 0.2, duration: 0.5, ease: "sine.inOut" }, T.typeStart + T.typeDur)
      // Scene 4: tangan menuju ENTER, jari menekan, tombol turun, baru loading
      .to(S, { lift: 1, duration: 0.45, ease: "sine.out" }, T.enterReach)                 // 1) angkat tangan dari keyboard
      .to(S, { rEnter: 1, duration: 1.1, ease: "sine.inOut" }, T.enterReach + 0.15)       // 2) melayang ke atas ENTER
      .to(S, { lift: 0, duration: 0.38, ease: "power2.in" }, T.enterPress - 0.4)          // 3) turun tepat di atas ENTER
      .to(S, { enterPress: 1, duration: 0.1, ease: "power2.out" }, T.enterPress)
      .call(() => audio?.enter?.(), null, T.enterPress + 0.04)
      .to(S, { enterPress: 0, duration: 0.22, ease: "power2.out" }, T.enterPress + 0.18)
      .to(S, { lift: 1, duration: 0.25, ease: "sine.out" }, T.enterPress + 0.2)           // setelah menekan: angkat lagi
      .to(S, { rEnter: 0, duration: 0.7, ease: "sine.inOut" }, T.enterPress + 0.4)
      .to(S, { lift: 0, duration: 0.4, ease: "sine.inOut" }, T.enterPress + 0.75)         // kembali ke keyboard
      .to(S, { loading: 1, duration: T.loadDur, ease: "power1.inOut" }, T.loadStart)
      .to(S, { page: 1, duration: 0.9, ease: "power1.out" }, T.pageStart)
      // Scene 5: kamera masuk, bezel & browser menghilang, petir memenuhi layar
      .to(S, { full: 1, duration: 1.0, ease: "power2.inOut" }, T.chromeOut)
      // kilau cahaya singkat saat menembus layar (hanya efek di overlay 3D yang sedang memudar)
      .to(S, { bloom: bloomBase + 0.5, duration: 0.45, ease: "power2.out" }, T.through)
      .to(S, { bloom: bloomBase, duration: 0.7, ease: "sine.inOut" }, T.through + 0.45)
      .call(() => dbg("T: iconMove"), null, T.iconMove)
      .call(() => dbg("T: winOpen"), null, T.winOpen)
      .call(() => dbg("T: cursorStart"), null, T.cursorStart)
      .call(() => dbg("T: typeStart"), null, T.typeStart)
      .call(() => dbg("T: enterPress"), null, T.enterPress)
      .call(() => onWelcome?.(), null, T.welcome)
      .call(() => onReveal?.(), null, T.reveal)
      .call(() => onFade?.(), null, T.fade)
      .call(() => { if (!disposed) onDone?.(); }, null, T.done);
  }

  raf = requestAnimationFrame(frame);

  // dipanggil saat pengunjung menekan "Masuk": animasi baru berjalan (suara pun sudah diizinkan browser)
  function begin() { beginRequested = true; }

  function skip() {
    if (skipped || disposed) return;
    skipped = true;
    tl?.kill();
    gsap.to(canvas, { opacity: 0, duration: 0.5, ease: "power1.in" });
    onReveal?.();
    onFade?.();
    setTimeout(() => { if (!disposed) onDone?.(); }, 650);
  }

  /* ---- GLB opsional ---- */
  let glbMixer = null;
  (async () => {
    try {
      if (INTRO_CONFIG.characterFBX) return; // karakter FBX sudah dipakai
      const cfg = INTRO_CONFIG.characterGLB;
      const head = await fetch(cfg.url, { method: "HEAD" });
      const ct = head.headers.get("content-type") || "";
      if (!head.ok || ct.includes("text/html")) return; // tidak ada file: pakai karakter bawaan
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const gltf = await new GLTFLoader().loadAsync(cfg.url);
      if (disposed) return;
      ch.root.visible = false;
      const model = gltf.scene;
      model.position.set(...cfg.position);
      model.rotation.y = cfg.rotationY;
      model.scale.setScalar(cfg.scale);
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(model);
      if (gltf.animations?.length) {
        glbMixer = new THREE.AnimationMixer(model);
        glbMixer.clipAction(gltf.animations[0]).play();
      }
    } catch { /* abaikan: tetap pakai karakter bawaan */ }
  })();

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    tl?.kill();
    gsap.killTweensOf(canvas);
    ro.disconnect();
    clearTimeout(lostTimer);
    document.removeEventListener("visibilitychange", onVis);
    dbgEl?.remove();
    canvasMO?.disconnect();
    canvas.removeEventListener("webglcontextlost", onCtxLost);
    canvas.removeEventListener("webglcontextrestored", onCtxRestored);
    window.removeEventListener("pointermove", onPointer);
    clearTimeout(earthTimer);
    clearTimeout(previewTimer);
    space.dispose();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose(); });
    });
    shell.disposables.forEach((d) => d.dispose?.());
    screen.dispose();
    kb.dispose?.();
    envTex.dispose();
    pmrem.dispose();
    composer.dispose?.();
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.remove();
  }

  /** Dipanggil saat pengaturan admin berubah / baru selesai dimuat dari database. */
  function update(next = {}) {
    if (disposed) return;
    const c = next.content || {};
    const l = next.lightning || {};
    const th = next.theme || {};
    screen.setWelcome(welcomeFrom(c));
    screen.setBackdrop({ style: c.welcome_bg_style, color: c.welcome_fx_color });
    screen.setMeta({ name: c.full_name || undefined, accent: th.accent, blue: th.blue, bg: th.bg });
    progDur = progDurOf(c);
    if (l.enabled === false) {
      if (boltSrc) { screen.lightning = null; boltSrc.dispose(); boltSrc = null; }
    } else {
      if (!boltSrc) { boltSrc = makeBolt(); screen.lightning = boltSrc; }
      if (l.hue !== undefined) boltSrc.hue = l.hue;
      if (l.speed !== undefined) boltSrc.speed = l.speed;
      if (l.intensity !== undefined) boltSrc.intensity = l.intensity;
      if (l.size !== undefined) boltSrc.size = l.size;
      boltSrc.last = -1; // paksa render ulang dengan parameter baru
    }
    if (l.hue !== undefined) boltCol.setHSL(((l.hue % 360) / 360), 0.8, 0.6);
  }

  return { dispose, skip, update, begin };
}
