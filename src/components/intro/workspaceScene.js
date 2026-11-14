// Adegan 3D "Developer Workspace": ruangan futuristik, programmer mengetik, kamera sinematik,
// URL terketik di browser, lalu kamera menembus layar monitor.
// Dimuat secara lazy (code-split) dari DeveloperIntro.jsx supaya three.js tidak membebani halaman utama.
import * as THREE from "three";
import { gsap } from "gsap";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { BrowserScreen } from "./browserScreen";
import { LightningBG } from "./lightningBG";
import { buildSpaceRoom } from "./spaceRoom";
import { buildCharacter } from "./character";
import { getLightningSettings } from "../../lib/siteContent";

/* =====================  PENGATURAN YANG MUDAH DIUBAH  ===================== */
export const INTRO_CONFIG = {
  url: "https://rizkydm.vercel.app/",
  // Model karakter realistis (opsional). Taruh file .glb di public/models/developer.glb.
  // Jika file ada, dipakai menggantikan karakter prosedural. Jika tidak ada, karakter bawaan dipakai.
  characterGLB: {
    url: "/models/developer.glb",
    position: [0, 0, 0.62],
    rotationY: 0, // model harus menghadap -Z (ke arah monitor); ubah ke Math.PI bila terbalik
    scale: 1,
  },
  // Gambar pratinjau hero (opsional) untuk layar monitor: public/intro/portfolio-preview.jpg
  previewImage: "/intro/portfolio-preview.jpg",
  // null = pakai warna petir dari pengaturan situs (Dashboard Admin). Isi mis. 270 untuk memaksa ungu.
  lightningHue: null,
  // Waktu (detik) tiap adegan
  t: {
    powerOn: 0.4,
    camMoveEnd: 7.8,
    mouseIn: 2.4,        // tangan kanan ke mouse
    cursorStart: 2.9,    // kursor bergerak ke address bar
    cursorEnd: 4.3,
    click: 4.4,          // klik address bar
    mouseOut: 4.6,       // tangan kembali ke keyboard
    typeStart: 5.2,
    typeDur: 2.8,        // selesai 8.0
    reach: 7.7,          // jari kelingking bergerak ke tombol ENTER
    reachDur: 0.75,
    enter: 8.5,          // jari menekan ENTER (turun 0.11s, naik 0.24s)
    loadStart: 8.7,
    loadDur: 1.5,
    pageStart: 10.0,
    dive: 11.0,          // dolly menuju layar
    diveDur: 2.4,
    through: 13.4,       // menembus permukaan layar
    throughDur: 1.0,
    reveal: 13.7,
    fade: 14.1,
    done: 15.2,
  },
};
/* ======================================================================== */

const SCREEN = { w: 1.2, h: 0.55, cx: 0, cy: 1.2, cz: -0.2 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
function placeLimb(mesh, a, b) {
  _d.subVectors(b, a);
  const len = _d.length() || 1e-4;
  mesh.position.copy(a).addScaledVector(_d, 0.5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(_up, _d.normalize());
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
function solveArm(S, W, l1, l2, pole, out) {
  const d = _v1.subVectors(W, S);
  let dist = d.length();
  const max = l1 + l2 - 0.002;
  if (dist > max) { dist = max; d.setLength(max); }
  const u = _v2.copy(d).normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const p = _v3.copy(pole).addScaledVector(u, -pole.dot(u)).normalize();
  out.copy(S).addScaledVector(u, a).addScaledVector(p, h);
  return out;
}

function bendX(geo, R) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) + (R - Math.sqrt(R * R - x * x)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0, ...o });
function mk(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

function gridTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#0a111b";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(34,211,238,0.20)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 254);
  g.strokeStyle = "rgba(34,211,238,0.5)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(244, 256); g.lineTo(256, 256); g.moveTo(256, 244); g.lineTo(256, 256);
  g.moveTo(0, 244); g.lineTo(0, 256); g.moveTo(0, 0); g.lineTo(12, 0);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(36, 36);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* --------------------------------- kursi --------------------------------- */
function buildChair(scene) {
  const fabric = std("#151a24", { roughness: 0.85 });
  const metal = std("#2b3340", { roughness: 0.3, metalness: 0.85 });
  const g = new THREE.Group();
  g.position.set(0, 0, 0.66);
  scene.add(g);
  g.add(mk(new RoundedBoxGeometry(0.5, 0.085, 0.5, 4, 0.035), fabric, 0, 0.5, 0));
  const back = mk(new RoundedBoxGeometry(0.46, 0.62, 0.085, 4, 0.04), fabric, 0, 0.9, 0.24);
  back.rotation.x = 0.12;
  g.add(back);
  const head = mk(new RoundedBoxGeometry(0.26, 0.15, 0.07, 4, 0.03), fabric, 0, 1.32, 0.31);
  head.rotation.x = 0.1;
  g.add(head);
  g.add(mk(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 10), metal, 0, 1.17, 0.3));
  [-1, 1].forEach((s) => {
    g.add(mk(new RoundedBoxGeometry(0.06, 0.035, 0.3, 3, 0.012), fabric, s * 0.28, 0.69, -0.02));
    g.add(mk(new THREE.BoxGeometry(0.025, 0.17, 0.025), metal, s * 0.28, 0.6, 0.1));
  });
  g.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 12), metal, 0, 0.28, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = mk(new RoundedBoxGeometry(0.34, 0.03, 0.05, 2, 0.012), metal, Math.cos(a) * 0.17, 0.1, Math.sin(a) * 0.17);
    leg.rotation.y = -a;
    g.add(leg);
    g.add(mk(new THREE.SphereGeometry(0.032, 10, 8), std("#05070b", { roughness: 0.4 }), Math.cos(a) * 0.33, 0.04, Math.sin(a) * 0.33));
  }
  return g;
}

/* --------------------------------- meja ---------------------------------- */
function buildDesk(scene, cyan) {
  const deskMat = std("#0e141d", { roughness: 0.18, metalness: 0.55 });
  const trim = new THREE.MeshBasicMaterial({ color: cyan });
  scene.add(mk(new RoundedBoxGeometry(2.3, 0.05, 0.95, 4, 0.02), deskMat, 0, 0.72, 0));
  [-1, 1].forEach((s) => {
    scene.add(mk(new RoundedBoxGeometry(0.05, 0.7, 0.85, 3, 0.015), deskMat, s * 1.08, 0.35, 0));
  });
  scene.add(mk(new THREE.BoxGeometry(2.1, 0.02, 0.02), deskMat, 0, 0.55, -0.4));
  const edge = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.004, 0.006), trim);
  edge.position.set(0, 0.7, 0.475);
  scene.add(edge);

  // tower PC di bawah meja (kanan)
  const tower = mk(new RoundedBoxGeometry(0.24, 0.5, 0.5, 4, 0.02), std("#0b1018", { roughness: 0.35, metalness: 0.6 }), 0.78, 0.28, -0.12);
  scene.add(tower);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0x0a3a4a, transparent: true, opacity: 0.55 }));
  glass.position.set(0.78, 0.28, -0.12 + 0.2503);
  glass.scale.set(0.5, 1, 1);
  scene.add(glass);
  const fan = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 28), trim);
  fan.position.set(0.78, 0.28, -0.12 + 0.252);
  scene.add(fan);
  const fan2 = fan.clone();
  fan2.scale.set(0.55, 0.55, 1);
  scene.add(fan2);
}

/* ------------------------------- monitor --------------------------------- */
function buildMonitor(scene, screenTexture) {
  const bodyMat = std("#0a0e14", { roughness: 0.35, metalness: 0.7 });
  const R = 2.6;
  const body = new THREE.BoxGeometry(SCREEN.w + 0.04, SCREEN.h + 0.04, 0.035, 36, 1, 1);
  bendX(body, R);
  scene.add(mk(body, bodyMat, SCREEN.cx, SCREEN.cy, SCREEN.cz - 0.02));
  scene.add(mk(new RoundedBoxGeometry(0.5, 0.3, 0.08, 3, 0.03), bodyMat, 0, SCREEN.cy, SCREEN.cz - 0.065));

  const sg = new THREE.PlaneGeometry(SCREEN.w, SCREEN.h, 48, 1);
  bendX(sg, R);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false, fog: false });
  const screen = new THREE.Mesh(sg, screenMat);
  screen.position.set(SCREEN.cx, SCREEN.cy, SCREEN.cz + 0.001);
  scene.add(screen);

  scene.add(mk(new THREE.BoxGeometry(0.06, 0.2, 0.03), bodyMat, 0, 0.86, SCREEN.cz - 0.12));
  scene.add(mk(new RoundedBoxGeometry(0.46, 0.014, 0.22, 3, 0.006), bodyMat, 0, 0.757, SCREEN.cz - 0.06));
  return screen;
}

/* ----------------------- keyboard, mouse, dekorasi ----------------------- */
const ENTER_COL = 14, ENTER_ROW = 3;
function buildKeyboard(scene) {
  const base = mk(new RoundedBoxGeometry(0.5, 0.018, 0.16, 3, 0.006), std("#07090d", { roughness: 0.4, metalness: 0.5 }), 0.015, 0.759, 0.12);
  scene.add(base);
  const rgbMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const rgb = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.135), rgbMat);
  rgb.rotation.x = -Math.PI / 2;
  rgb.position.set(0.015, 0.7695, 0.12);
  scene.add(rgb);

  const rows = 5, cols = 15;
  const keyGeo = new RoundedBoxGeometry(0.0235, 0.011, 0.0235, 2, 0.004);
  const keys = new THREE.InstancedMesh(keyGeo, std("#10151d", { roughness: 0.5 }), rows * cols);
  keys.castShadow = true;
  const dummy = new THREE.Object3D();
  const rest = [];
  const hidden = ENTER_ROW * cols + ENTER_COL; // digantikan tombol ENTER besar
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 0.0275;
      const z = 0.12 + (r - (rows - 1) / 2) * 0.0265;
      const idx = r * cols + c;
      const y = idx === hidden ? -5 : 0.7755;
      rest.push([x, y, z]);
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      keys.setMatrixAt(idx, dummy.matrix);
    }
  }
  scene.add(keys);

  // tombol ENTER (lebih lebar, menyala cyan saat didekati jari)
  const enterMat = new THREE.MeshStandardMaterial({ color: "#10222b", roughness: 0.4, emissive: 0x22d3ee, emissiveIntensity: 0.15 });
  const enterKey = mk(new RoundedBoxGeometry(0.037, 0.011, 0.0235, 2, 0.004), enterMat, 0.2125, 0.7755, 0.12 + (ENTER_ROW - (rows - 1) / 2) * 0.0265);
  scene.add(enterKey);

  // mouse + alas (satu grup agar ikut bergeser bersama tangan)
  const mouseG = new THREE.Group();
  scene.add(mouseG);
  mouseG.add(mk(new THREE.BoxGeometry(0.26, 0.004, 0.2), std("#0b0f16", { roughness: 0.9 }), 0.47, 0.747, 0.12));
  const mouse = mk(new THREE.SphereGeometry(0.03, 16, 12), std("#0a0d13", { roughness: 0.35, metalness: 0.4 }), 0.47, 0.76, 0.13);
  mouse.scale.set(0.9, 0.55, 1.5);
  mouseG.add(mouse);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.035), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  strip.position.set(0.47, 0.777, 0.115);
  mouseG.add(strip);
  return { keys, rest, dummy, rgbMat, cols, rows, hidden, enterKey, enterMat, enterY: 0.7755, enterZ: enterKey.position.z, mouseG, pressed: new Float32Array(rows * cols) };
}

function buildProps(scene, cyan) {
  // tanaman bercahaya (kiri)
  const pot = mk(new THREE.CylinderGeometry(0.05, 0.036, 0.075, 16), new THREE.MeshStandardMaterial({ color: 0xcffaff, emissive: 0x7ef0ff, emissiveIntensity: 1.2, roughness: 0.4 }), -0.86, 0.7825, -0.15);
  scene.add(pot);
  const leafMat = std("#2fa7a0", { roughness: 0.55, emissive: 0x0a4a4a, emissiveIntensity: 0.7 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const leaf = mk(new THREE.ConeGeometry(0.014, 0.15, 6), leafMat, -0.86 + Math.cos(a) * 0.02, 0.88, -0.15 + Math.sin(a) * 0.02);
    leaf.rotation.set(Math.sin(a) * 0.65, 0, -Math.cos(a) * 0.65);
    scene.add(leaf);
  }
  // mug
  scene.add(mk(new THREE.CylinderGeometry(0.036, 0.032, 0.09, 16), std("#d9e3ee", { roughness: 0.3 }), -0.58, 0.79, 0.2));
  // lampu meja (kanan)
  const metal = std("#222a36", { roughness: 0.3, metalness: 0.8 });
  scene.add(mk(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 20), metal, 0.92, 0.755, -0.2));
  const arm1 = mk(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), metal);
  placeLimb(arm1, new THREE.Vector3(0.92, 0.76, -0.2), new THREE.Vector3(0.84, 1.1, -0.25));
  scene.add(arm1);
  const arm2 = mk(new THREE.CylinderGeometry(0.008, 0.008, 1, 8), metal);
  placeLimb(arm2, new THREE.Vector3(0.84, 1.1, -0.25), new THREE.Vector3(0.7, 1.22, -0.14));
  scene.add(arm2);
  const lampHead = mk(new THREE.ConeGeometry(0.06, 0.09, 18, 1, true), metal, 0.7, 1.2, -0.12);
  lampHead.rotation.set(Math.PI * 0.6, 0, 0.3);
  scene.add(lampHead);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  bulb.position.set(0.7, 1.17, -0.1);
  scene.add(bulb);
}

function buildRoom(scene, cyan, isMobile) {
  const gt = gridTexture();
  gt.repeat.set(14, 11);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: gt, roughness: 0.28, metalness: 0.75 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 11), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 2.5);
  floor.receiveShadow = true;
  scene.add(floor);

  // rak server dengan LED berkedip
  const rackMat = std("#0a1018", { roughness: 0.5, metalness: 0.5 });
  const racks = [-2.2, -1.1, 0.0].map((z) => {
    const r = mk(new RoundedBoxGeometry(0.8, 2.3, 0.7, 3, 0.02), rackMat, 3.1, 1.15, z);
    scene.add(r);
    return z;
  });
  const ledCount = racks.length * 14;
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0xffffff }), ledCount);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let n = 0;
  racks.forEach((z) => {
    for (let k = 0; k < 14; k++) {
      dummy.position.set(3.1 - 0.405, 0.35 + k * 0.14, z - 0.2 + (k % 3) * 0.2);
      dummy.updateMatrix();
      leds.setMatrixAt(n, dummy.matrix);
      leds.setColorAt(n, col.set(k % 4 === 0 ? 0xff5a6a : 0x22d3ee));
      n++;
    }
  });
  scene.add(leds);

  // debu halus berkilau di udara
  const cnt = isMobile ? 160 : 320;
  const pos = new Float32Array(cnt * 3);
  for (let i = 0; i < cnt; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 7;
    pos[i * 3 + 1] = Math.random() * 3.2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7ef0ff, size: 0.014, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust);
  return { leds, ledCount, dust, gt };
}

/* ----------------------------- fungsi utama ------------------------------ */
export function createDeveloperWorkspace(opts) {
  const { container, content = {}, theme = {}, audio = null, onReady, onReveal, onFade, onDone, onError } = opts;
  const T = INTRO_CONFIG.t;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  let disposed = false;
  let skipped = false;

  let renderer, composer, bloom;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    onError?.(e);
    return { dispose() {}, skip() {} };
  }
  const pixelRatioMax = isMobile ? 1.5 : 1.75;
  let pixelRatio = Math.min(window.devicePixelRatio || 1, pixelRatioMax);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x02050a, 1);
  const canvas = renderer.domElement;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02050a);
  scene.fog = new THREE.FogExp2(0x03070d, 0.045);
  const pmrem = new THREE.PMREMGenerator(renderer);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.03, 160);
  const cyan = new THREE.Color("#22d3ee"); // ruangan selalu cyan (tema situs hanya dipakai di layar monitor)

  /* ---- ruang angkasa di balik kaca (juga menjadi environment map untuk pantulan) ---- */
  const space = buildSpaceRoom(scene, renderer, pmrem, { mobile: isMobile });
  scene.environment = space.envTex;
  scene.environmentIntensity = 0.85;

  /* ---- petir ungu: SATU kanvas WebGL dipakai di layar monitor + overlay layar-penuh ---- */
  const lx = getLightningSettings(content);
  const lightning = new LightningBG({
    hue: INTRO_CONFIG.lightningHue ?? lx.hue,
    speed: lx.speed, intensity: lx.intensity, size: lx.size, compact: isMobile,
  });
  const boltEl = lightning.canvas;
  boltEl.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;pointer-events:none;mix-blend-mode:screen;";
  container.appendChild(boltEl);

  /* ---- layar ---- */
  const typing = (content?.typing_words || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const screen = new BrowserScreen({
    url: INTRO_CONFIG.url,
    name: content.full_name || "Portfolio",
    line1: content.hero_line_1 || "Turning Ideas",
    line2: content.hero_line_2 || "Into Reality",
    role: typing[0] || content.job_title || "",
    greeting: content.greeting || "Hi, I'm",
    nav: ["Home", "About", "Portofolio", "Contact"],
    accent: theme.accent || "#06b6d4",
    blue: theme.blue || "#2563eb",
    bg: theme.bg || "#050510",
    lightning,
    welcome: {
      line1: content.welcome_line1 || "Welcome To My",
      line2: content.welcome_line2 || "Portofolio Website",
      font: content.welcome_font || "Arial",
      color1: content.welcome_color1 || "#ffffff",
      color2: content.welcome_color2 || "#2563eb",
    },
    scale: isMobile ? 0.5 : 0.75,
  });
  const prev = new Image();
  prev.onload = () => { if (prev.naturalWidth > 100) screen.preview = prev; };
  prev.src = INTRO_CONFIG.previewImage;

  /* ---- objek ---- */
  const room = buildRoom(scene, cyan, isMobile);
  buildDesk(scene, cyan);
  buildMonitor(scene, screen.texture);
  const kb = buildKeyboard(scene);
  buildProps(scene, cyan);
  const chair = buildChair(scene);
  const ch = buildCharacter(scene, { mobile: isMobile });

  /* ---- cahaya ---- */
  scene.add(new THREE.HemisphereLight(0x2a4d66, 0x04060a, 0.6));
  const key = new THREE.SpotLight(0xa9d4ff, 45, 9, 0.62, 0.85, 2);
  key.position.set(1.9, 3.3, 2.4);
  key.target.position.set(0, 0.9, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 768 : 1536, isMobile ? 768 : 1536);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const rim = new THREE.PointLight(0x22d3ee, 4, 5, 2);
  rim.position.set(-1.1, 1.7, 1.6);
  scene.add(rim);
  const violet = new THREE.PointLight(0x6d4aff, 2.5, 5, 2);
  violet.position.set(1.8, 0.7, 1.4);
  scene.add(violet);
  const glow = new THREE.PointLight(0x5fe7ff, 0.5, 3.5, 2);
  glow.position.set(0, 1.15, 0.35);
  scene.add(glow);
  let areaLight = null;
  if (!isMobile) {
    RectAreaLightUniformsLib.init();
    areaLight = new THREE.RectAreaLight(0x7fe9ff, 2.5, SCREEN.w, SCREEN.h);
    areaLight.position.set(0, SCREEN.cy, SCREEN.cz + 0.03);
    areaLight.lookAt(0, SCREEN.cy, 2);
    scene.add(areaLight);
  }
  const lamp = new THREE.PointLight(0xffc27a, 1.6, 2.2, 2);
  lamp.position.set(0.7, 1.12, -0.08);
  scene.add(lamp);

  /* ---- post-processing ringan ---- */
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomBase = isMobile ? 0.3 : 0.42;
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), bloomBase, 0.6, 0.5);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---- ukuran & kamera ---- */
  const size = { w: 1, h: 1 };
  const P0 = new THREE.Vector3(2.9, 2.0, 4.2);
  const T0 = new THREE.Vector3(0, 1.0, 0.1);
  const T2 = new THREE.Vector3(0, 1.18, -0.2);
  const P2 = new THREE.Vector3(0.7, 1.42, 1.15);
  const P2b = new THREE.Vector3(0.74, 1.4, 1.02);
  const P3 = new THREE.Vector3(0.5, 1.42, 0.82);
  const Pend = new THREE.Vector3(0, SCREEN.cy, 0.3);
  const Ppass = new THREE.Vector3(0, SCREEN.cy, SCREEN.cz - 0.14);
  const curve = new THREE.CatmullRomCurve3([P2b, P3, Pend], false, "centripetal");
  let fovEnd = 52;
  const P0base = P0.clone(), P2base = P2.clone(), P2bbase = P2b.clone();

  const layout = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    size.w = w; size.h = h;
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
    camera.aspect = w / h;
    lightning.setSize(w * (isMobile ? 0.4 : 0.55), h * (isMobile ? 0.4 : 0.55));
    const k = camera.aspect < 0.9 ? 1.45 : camera.aspect < 1.4 ? 1.15 : 1;
    P0.copy(T0).addScaledVector(_d.subVectors(P0base, T0), k);
    P2.copy(T2).addScaledVector(_d.subVectors(P2base, T2), k);
    P2b.copy(T2).addScaledVector(_d.subVectors(P2bbase, T2), k);
    const portrait = camera.aspect < 1.2;
    fovEnd = portrait ? 72 : 52;
    const V = portrait ? 0.9 : 0.5;
    const dEnd = (V / 2) / Math.tan(THREE.MathUtils.degToRad(fovEnd / 2));
    Pend.z = SCREEN.cz + dEnd;
    camera.updateProjectionMatrix();
  };
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(container);

  /* ---- state animasi (digerakkan GSAP) ---- */
  const S = {
    u1: 0, d2: 0, u3: 0, u4: 0, fov: 40, sway: 1,
    power: 0, typed: 0, loading: 0, page: 0, full: 0,
    typeAmt: 0.5, exposure: 0.95, bloom: bloomBase,
    mouse: 0, cursor: 0, click: 0, reach: 0, press: 0,
    bolt: 0, spread: 0,
  };
  camera.fov = S.fov;

  const pos = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  const sh = new THREE.Vector3(), W = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const MOUSE_P = new THREE.Vector3(0.45, 0.8, 0.2);
  // kelingking tangan kanan (jari ke-4) tepat di atas tombol ENTER
  const ENTER_P = new THREE.Vector3(0.2125 - 0.03, 0.8, kb.enterZ + 0.105);

  function updateCamera(t) {
    if (S.u4 > 0) pos.lerpVectors(Pend, Ppass, S.u4);
    else if (S.u3 > 0) curve.getPoint(S.u3, pos);
    else { pos.lerpVectors(P0, P2, S.u1); if (S.d2 > 0) pos.lerp(P2b, S.d2); }
    tgt.lerpVectors(T0, T2, S.u1);
    if (S.u4 > 0) tgt.z = T2.z - S.u4 * 1.2;
    pos.x += Math.sin(t * 0.7) * 0.012 * S.sway;
    pos.y += Math.sin(t * 0.9 + 1.0) * 0.009 * S.sway;
    camera.position.copy(pos);
    camera.lookAt(tgt);
    if (Math.abs(camera.fov - S.fov) > 0.001) { camera.fov = S.fov; camera.updateProjectionMatrix(); }
  }

  const rng = { next: 0 };
  function updateCharacter(t, dt) {
    const a = S.typeAmt;
    const away = Math.max(S.mouse, S.reach);
    ch.upper.rotation.x = 0.07 + Math.sin(t * 1.25) * 0.008 + S.reach * 0.03 + S.press * 0.012;
    ch.upper.rotation.y = -0.03 * S.mouse + 0.02 * S.reach;
    ch.torso.scale.y = 1 + Math.sin(t * 1.25) * 0.012;
    ch.head.rotation.y = Math.sin(t * 0.55) * 0.05 + Math.sin(t * 1.7) * 0.01;
    ch.head.rotation.x = -0.1 + Math.sin(t * 0.9) * 0.015 - (S.typed > 0 && S.typed < 1 ? 0.02 : 0) - S.press * 0.03;
    chair.rotation.y = Math.sin(t * 0.4) * 0.025;

    const hl = ch.handL.group, hr = ch.handR.group;
    // tangan kiri: selalu mengetik
    hl.position.set(-0.1 + Math.sin(t * 5.1) * 0.012 * a, 0.797 + Math.max(0, Math.sin(t * 9.3)) * 0.006 * a, 0.168 + Math.sin(t * 3.7) * 0.01 * a);
    hl.rotation.set(0.08, 0.1, 0);

    // tangan kanan: keyboard -> mouse -> keyboard -> tombol ENTER
    const typeR = a * (1 - away);
    const mdx = -0.05 * S.cursor * S.mouse, mdz = -0.04 * S.cursor * S.mouse;
    _p.set(0.1 + Math.sin(t * 4.3 + 1) * 0.012 * typeR, 0.797 + Math.max(0, Math.sin(t * 8.1 + 2)) * 0.006 * typeR, 0.168 + Math.sin(t * 3.1 + 2) * 0.01 * typeR);
    _p.lerp(MOUSE_P, S.mouse);
    _p.lerp(ENTER_P, S.reach);
    _p.x += mdx; _p.z += mdz;
    _p.y += Math.sin(Math.PI * S.mouse) * 0.03 + Math.sin(Math.PI * S.reach) * 0.03 - 0.009 * S.press;
    hr.position.copy(_p);
    hr.rotation.set(0.08 + 0.1 * S.press, -0.1 + 0.05 * S.mouse, 0);
    kb.mouseG.position.set(mdx, 0, mdz);

    ch.handL.fingers.forEach((f) => {
      const press = Math.pow(Math.max(0, Math.sin(t * f.speed + f.phase)), 2) * a;
      f.pivot.rotation.x = -(0.2 + press * 0.4);
      f.mid.rotation.x = -(0.25 + press * 0.55);
    });
    ch.handR.fingers.forEach((f, i) => {
      let press = Math.pow(Math.max(0, Math.sin(t * f.speed + f.phase)), 2) * typeR;
      let base = 0.2;
      if (S.mouse > 0.05) { base = 0.1; press = i === 0 && S.click > 0 && S.click < 0.3 ? 0.9 : 0; } // klik mouse dengan telunjuk
      if (S.reach > 0.05) { base = i === 3 ? 0.05 : 0.45; press = 0; }
      if (i === 3) press += S.press; // kelingking menekan ENTER (sinkron dengan tombol)
      f.pivot.rotation.x = -(base + press * 0.42);
      f.mid.rotation.x = -(base * 1.2 + press * 0.6);
    });

    ch.upper.updateMatrixWorld(true);
    [[ch.shoulderL, ch.armL, hl, -1], [ch.shoulderR, ch.armR, hr, 1]].forEach(([sp, arm, hand, side]) => {
      sh.copy(sp);
      ch.upper.localToWorld(sh);
      W.set(hand.position.x, hand.position.y + 0.018, hand.position.z + 0.098);
      pole.set(side * 0.7, -0.75, 0.25);
      solveArm(sh, W, 0.28, 0.27, pole, arm.elbowPos);
      placeLimb(arm.upper, sh, arm.elbowPos);
      placeLimb(arm.fore, arm.elbowPos, W);
      arm.elbow.position.copy(arm.elbowPos);
      arm.cuff.position.lerpVectors(arm.elbowPos, W, 0.94);
      arm.cuff.quaternion.copy(arm.fore.quaternion);
    });

    // tombol menyala saat diketik (acak, di bawah jari)
    if (a > 0.05 && S.reach < 0.05) {
      rng.next -= dt;
      if (rng.next <= 0) {
        rng.next = (0.07 + Math.random() * 0.09) / Math.max(0.3, a);
        let idx = Math.floor(Math.random() * kb.pressed.length);
        if (idx === kb.hidden) idx = kb.hidden - 1;
        kb.pressed[idx] = 1;
      }
    }
    let dirty = false;
    for (let i = 0; i < kb.pressed.length; i++) {
      const p = kb.pressed[i];
      if (p > 0.01) {
        kb.pressed[i] = p * Math.pow(0.0006, dt);
        const r = kb.rest[i];
        kb.dummy.position.set(r[0], r[1] - 0.004 * p, r[2]);
        kb.dummy.updateMatrix();
        kb.keys.setMatrixAt(i, kb.dummy.matrix);
        dirty = true;
      } else if (p > 0) {
        kb.pressed[i] = 0;
        const r = kb.rest[i];
        kb.dummy.position.set(r[0], r[1], r[2]);
        kb.dummy.updateMatrix();
        kb.keys.setMatrixAt(i, kb.dummy.matrix);
        dirty = true;
      }
    }
    if (dirty) kb.keys.instanceMatrix.needsUpdate = true;
    // tombol ENTER: menyala saat didekati, turun tepat sinkron dengan jari (S.press)
    kb.enterKey.position.y = kb.enterY - 0.005 * S.press;
    kb.enterMat.emissiveIntensity = 0.15 + 1.1 * S.reach + 1.2 * S.press;
    kb.rgbMat.color.setHSL((t * 0.08) % 1, 0.95, 0.55);
  }

  let lastSig = "";
  let lastDraw = 0;
  let prevChars = 0;
  let lastBolt = 0;
  function updateScreen(t, nowMs) {
    const u = S.typed;
    const jitter = u > 0 && u < 1 ? clamp(u + 0.015 * Math.sin(u * 38), 0, 0.999) : u;
    const chars = Math.floor(INTRO_CONFIG.url.length * jitter);
    if (chars > prevChars && u < 1) audio?.key();
    prevChars = chars;
    const blink = Math.floor(t * 2.4) % 2;
    const spin = S.loading > 0 && S.loading < 1 ? Math.floor(t * 24) : 0;
    const live = S.page > 0.01 || S.bolt > 0.01; // petir bergerak: layar digambar ulang tiap beberapa frame
    if (live && nowMs - lastBolt > (isMobile ? 50 : 33)) { lastBolt = nowMs; lightning.render(t, S.spread); }
    const interval = isMobile ? 60 : 33;
    const sig = [S.power.toFixed(2), chars, S.loading.toFixed(2), S.page.toFixed(2), S.full.toFixed(2), blink, spin,
      screen.preview ? 1 : 0, S.cursor.toFixed(3), S.click.toFixed(2), S.mouse > 0.3 ? 1 : 0, live ? Math.floor(nowMs / interval) : 0].join("|");
    if (sig !== lastSig && nowMs - lastDraw > interval - 3) {
      lastSig = sig;
      lastDraw = nowMs;
      screen.draw({
        time: t, power: S.power, typed: jitter, loading: S.loading, page: S.page, full: S.full,
        cursor: S.cursor, click: S.click, cursorVis: S.mouse > 0.3 || S.cursor > 0,
      });
    }
    boltEl.style.opacity = S.bolt.toFixed(3);
    const pw = S.power * (0.55 + 0.45 * (1 - S.full * 0.3));
    glow.intensity = 0.5 * pw;
    if (areaLight) areaLight.intensity = 2.5 * pw;
  }

  /* ---- loop render ---- */
  let raf = 0;
  let last = performance.now();
  let t = 0;
  let frames = 0, acc = 0;
  let running = false;
  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    // kualitas adaptif berkelanjutan: bila rata-rata frame lambat, turunkan resolusi bertahap
    frames++; acc += dt;
    if (frames >= 45) {
      const avg = acc / frames;
      frames = 0; acc = 0;
      if (avg > 0.028 && pixelRatio > 0.7) {
        pixelRatio = Math.max(0.7, pixelRatio > 1 ? 1 : pixelRatio - 0.15);
        renderer.setPixelRatio(pixelRatio);
        bloom.enabled = pixelRatio > 0.85;
        layout();
      }
    }

    updateCamera(t);
    updateCharacter(t, dt);
    glbMixer?.update(dt);
    updateScreen(t, now);
    space.update(t, dt);
    room.dust.rotation.y = t * 0.02;
    room.dust.position.y = Math.sin(t * 0.3) * 0.05;
    if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) {
      for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * room.ledCount);
        room.leds.setColorAt(idx, new THREE.Color(Math.random() > 0.5 ? 0x22d3ee : Math.random() > 0.5 ? 0xff5a6a : 0x0b2a33));
      }
      if (room.leds.instanceColor) room.leds.instanceColor.needsUpdate = true;
    }
    renderer.toneMappingExposure = S.exposure;
    bloom.strength = S.bloom;
    composer.render(dt);

    if (!running) {
      running = true;
      onReady?.();
      startTimeline();
    }
  }

  /* ---- timeline GSAP ---- */
  let tl = null;
  function startTimeline() {
    tl = gsap.timeline({ defaults: { ease: "none" } });
    tl.to(canvas, { opacity: 1, duration: 0.7, ease: "power1.out" }, 0)
      .to(S, { power: 1, duration: 0.9, ease: "power2.out" }, T.powerOn)
      // Scene 1-2: kamera mendekat perlahan (+ efek telephoto)
      .to(S, { u1: 1, duration: T.camMoveEnd, ease: "power2.inOut" }, 0)
      .to(S, { fov: 32, duration: T.camMoveEnd, ease: "power2.inOut" }, 0)
      .to(S, { d2: 1, duration: T.dive - T.camMoveEnd, ease: "sine.inOut" }, T.camMoveEnd)
      // Scene 2: tangan ke mouse, kursor menuju address bar, klik
      .to(S, { mouse: 1, duration: 0.7, ease: "power2.inOut" }, T.mouseIn)
      .to(S, { cursor: 1, duration: T.cursorEnd - T.cursorStart, ease: "power2.inOut" }, T.cursorStart)
      .call(() => audio?.key(1.4), null, T.click)
      .to(S, { click: 1, duration: 0.45, ease: "none" }, T.click)
      .to(S, { mouse: 0, duration: 0.6, ease: "power2.inOut" }, T.mouseOut)
      // Scene 3: mengetik URL huruf demi huruf
      .to(S, { typeAmt: 1, duration: 0.6, ease: "sine.inOut" }, T.typeStart - 0.4)
      .to(S, { typed: 1, duration: T.typeDur, ease: "none" }, T.typeStart)
      // Scene 4: jari menuju ENTER, menekan (turun -> tahan -> naik), kembali
      .to(S, { reach: 1, duration: T.reachDur, ease: "power2.inOut" }, T.reach)
      .to(S, { press: 1, duration: 0.11, ease: "power2.in" }, T.enter)
      .call(() => audio?.enter(), null, T.enter + 0.09)
      .to(S, { press: 0, duration: 0.24, ease: "power2.out" }, T.enter + 0.17)
      .to(S, { reach: 0, duration: 0.8, ease: "power2.inOut" }, T.enter + 0.45)
      .to(S, { typeAmt: 0.22, duration: 0.7, ease: "sine.inOut" }, T.enter + 0.3)
      // browser memuat (setelah ENTER benar-benar tertekan), lalu website tampil
      .call(() => audio?.loading(T.loadDur), null, T.loadStart)
      .to(S, { loading: 1, duration: T.loadDur, ease: "power1.inOut" }, T.loadStart)
      .to(S, { page: 1, duration: 0.9, ease: "power1.out" }, T.pageStart)
      // Scene 5: dolly menuju monitor, bezel hilang
      .call(() => audio?.energy(T.through - T.dive + 0.6), null, T.dive + 0.1)
      .to(S, { u3: 1, duration: T.diveDur, ease: "power2.inOut" }, T.dive)
      .to(S, { fov: fovEnd, duration: T.diveDur, ease: "power2.inOut" }, T.dive)
      .to(S, { sway: 0, duration: 1.4, ease: "sine.out" }, T.dive)
      .to(S, { typeAmt: 0.1, duration: 1.2 }, T.dive)
      .to(S, { full: 1, duration: 1.0, ease: "power2.inOut" }, T.dive + 1.2)
      // petir ungu memenuhi layar saat kamera menembus layar
      .to(S, { bolt: 1, duration: 0.9, ease: "power2.in" }, T.through - 0.15)
      .to(S, { spread: 1, duration: 1.0, ease: "power2.in" }, T.through - 0.15)
      .to(S, { u4: 1, duration: T.throughDur, ease: "power3.in" }, T.through)
      .to(S, { fov: fovEnd + 12, duration: T.throughDur, ease: "power3.in" }, T.through)
      .call(() => audio?.thunder(), null, T.through + 0.25)
      .to(S, { exposure: 2.6, bloom: 2.0, duration: 0.7, ease: "power2.in" }, T.through + 0.25)
      .call(() => onReveal?.(), null, T.reveal)
      .call(() => { audio?.stopAmbient(1.5); onFade?.(); }, null, T.fade)
      .call(() => { if (!disposed) onDone?.(); }, null, T.done);
  }

  raf = requestAnimationFrame(frame);

  function skip() {
    if (skipped || disposed) return;
    skipped = true;
    tl?.kill();
    gsap.to(canvas, { opacity: 0, duration: 0.5, ease: "power1.in" });
    gsap.to(boltEl, { opacity: 0, duration: 0.5, ease: "power1.in" });
    onReveal?.();
    onFade?.();
    setTimeout(() => { if (!disposed) onDone?.(); }, 650);
  }

  /* ---- GLB opsional ---- */
  let glbMixer = null;
  (async () => {
    try {
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
    } catch (e) { /* abaikan: tetap pakai karakter bawaan */ }
  })();

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    tl?.kill();
    gsap.killTweensOf(canvas);
    gsap.killTweensOf(boltEl);
    ro.disconnect();
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.bumpMap?.dispose?.(); m.dispose(); });
    });
    screen.dispose();
    lightning.dispose();
    space.dispose();
    room.gt.dispose();
    pmrem.dispose();
    composer.dispose?.();
    renderer.dispose();
    renderer.forceContextLoss?.();
    canvas.remove();
  }

  return { dispose, skip };
}
