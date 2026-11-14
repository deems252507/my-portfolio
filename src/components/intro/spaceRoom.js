// Lingkungan luar angkasa di balik kaca: bintang, nebula, galaksi, planet besar, bulan,
// asteroid & stasiun yang melayang pelan, kaca transparan dengan pantulan, berkas cahaya, cahaya planet.
import * as THREE from "three";

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function starsTexture(mobile) {
  const w = mobile ? 1024 : 2048, h = w / 2, k = w / 2048;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const r = rng(11);
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#01020a"); bg.addColorStop(0.5, "#060a1d"); bg.addColorStop(1, "#02030b");
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "lighter";
  const blob = (x, y, rad, col) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  // nebula
  [[0.2, 0.4, 520, "rgba(110,70,255,0.24)"], [0.7, 0.32, 480, "rgba(40,170,230,0.17)"],
   [0.48, 0.62, 620, "rgba(190,60,200,0.13)"], [0.86, 0.66, 430, "rgba(60,90,255,0.18)"],
   [0.05, 0.7, 380, "rgba(50,200,230,0.12)"]].forEach(([x, y, rad, col]) => blob(x * w, y * h, rad * k, col));
  for (let i = 0; i < 26; i++) blob(r() * w, (0.2 + r() * 0.6) * h, (60 + r() * 140) * k, `rgba(${90 + r() * 80 | 0},${60 + r() * 80 | 0},255,0.05)`);
  // galaksi spiral jauh
  g.save();
  g.translate(w * 0.64, h * 0.3); g.rotate(-0.5); g.scale(1, 0.34);
  blob(0, 0, 190 * k, "rgba(190,170,255,0.55)");
  blob(0, 0, 70 * k, "rgba(255,240,225,0.9)");
  for (let i = 0; i < 700; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * 170 * k;
    const sp = a + d / (38 * k);
    g.fillStyle = `rgba(${170 + r() * 80 | 0},${160 + r() * 70 | 0},255,${0.15 + r() * 0.5})`;
    g.fillRect(Math.cos(sp) * d, Math.sin(sp) * d, 1.6 * k + 0.4, 1.6 * k + 0.4);
  }
  g.restore();
  // pita bima sakti
  for (let i = 0; i < 2600; i++) {
    const t = r(), x = t * w, y = h * (0.15 + 0.7 * t) + (r() + r() + r() - 1.5) * 90 * k;
    g.fillStyle = `rgba(200,215,255,${0.1 + r() * 0.4})`;
    g.fillRect(x, y, k + 0.5, k + 0.5);
  }
  // bintang
  const cols = ["255,255,255", "190,215,255", "255,225,190", "170,200,255"];
  for (let i = 0; i < 2400; i++) {
    g.fillStyle = `rgba(${cols[i % 4]},${0.3 + r() * 0.7})`;
    const s = (0.5 + r() * 1.3) * k + 0.3;
    g.fillRect(r() * w, r() * h, s, s);
  }
  for (let i = 0; i < 46; i++) blob(r() * w, r() * h, (6 + r() * 12) * k, `rgba(${cols[i % 4]},0.85)`);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function planetTexture(mobile) {
  const W = mobile ? 256 : 512, H = W / 2;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const img = g.createImageData(W, H);
  const hs = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, y, per) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const wx = (i) => ((i % per) + per) % per;
    const a = hs(wx(ix), iy), b = hs(wx(ix + 1), iy), c2 = hs(wx(ix), iy + 1), d = hs(wx(ix + 1), iy + 1);
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * ux + (c2 - a) * uy + (a - b - c2 + d) * ux * uy;
  };
  const fbm = (x, y, per) => { let v = 0, a = 0.5, p = per; for (let i = 0; i < 5; i++) { v += a * noise(x, y, p); x *= 2; y *= 2; p *= 2; a *= 0.5; } return v; };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H, lat = Math.abs(v - 0.5) * 2;
      const e = fbm(u * 5, v * 2.5, 5);
      let col;
      if (e > 0.56) { const m = Math.min(1, (e - 0.56) * 5); col = [60 + 70 * m, 75 + 45 * m, 120 + 20 * m]; } // daratan keunguan
      else { const m = e / 0.56; col = [8 + 22 * m, 40 + 90 * m, 110 + 100 * m]; } // lautan biru-cyan
      const w2 = fbm(u * 4 + 7, v * 11, 4) , cl = fbm(u * 6 + w2 * 2.2, v * 16 + w2, 6);
      const cm = Math.max(0, (cl - 0.5) * 3.2);
      col = col.map((q) => q + (255 - q) * Math.min(1, cm));
      if (lat > 0.82) { const m = Math.min(1, (lat - 0.82) * 6); col = col.map((q) => q + (245 - q) * m); }
      const i = (y * W + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function softTexture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  if (kind === "radial") {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  } else { // pita vertikal lembut
    const gh = g.createLinearGradient(0, 0, 128, 0);
    gh.addColorStop(0, "rgba(255,255,255,0)"); gh.addColorStop(0.5, "rgba(255,255,255,1)"); gh.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gh; g.fillRect(0, 0, 128, 128);
    g.globalCompositeOperation = "destination-in";
    const gv = g.createLinearGradient(0, 0, 0, 128);
    gv.addColorStop(0, "rgba(255,255,255,0)"); gv.addColorStop(0.3, "rgba(255,255,255,1)"); gv.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gv; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const PLANET_VERT = `
varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const PLANET_FRAG = `
uniform sampler2D map; uniform vec3 sunDir; uniform vec3 atmo;
varying vec3 vN; varying vec2 vUv; varying vec3 vW;
void main(){
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  vec3 tex = texture2D(map, vUv).rgb;
  float ndl = dot(n, normalize(sunDir));
  float day = smoothstep(-0.18, 0.4, ndl);
  vec3 col = tex * (0.05 + day * 1.25);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  col += atmo * fres * (0.2 + 0.9 * day) * 1.5;
  gl_FragColor = vec4(col, 1.0);
}`;
const GLOW_VERT = `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const GLOW_FRAG = `uniform vec3 color; varying vec3 vN; void main(){ float i = pow(max(0.0, 0.72 - dot(vN, vec3(0.0,0.0,1.0))), 4.0); gl_FragColor = vec4(color * i * 2.2, i); }`;

export function buildSpaceRoom(scene, renderer, pmrem, { mobile = false } = {}) {
  const r = rng(5);
  const cyan = 0x22d3ee;
  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };

  /* ---- langit ---- */
  const starTex = keep(starsTexture(mobile));
  const skyMat = new THREE.MeshBasicMaterial({ map: starTex, side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(100, 40, 24), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  /* ---- planet + atmosfer ---- */
  const planetTex = keep(planetTexture(mobile));
  const planetPos = new THREE.Vector3(-9, 4.6, -27);
  const PR = 7.2;
  const planetMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: planetTex }, sunDir: { value: new THREE.Vector3(0.55, 0.3, 0.8) }, atmo: { value: new THREE.Color(0.28, 0.6, 1.0) } },
    vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(PR, 64, 48), planetMat);
  planet.position.copy(planetPos);
  planet.rotation.z = 0.25;
  scene.add(planet);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(PR * 1.13, 48, 32), new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(0.25, 0.55, 1.0) } },
    vertexShader: GLOW_VERT, fragmentShader: GLOW_FRAG,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  }));
  glow.position.copy(planetPos);
  scene.add(glow);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 24), new THREE.MeshStandardMaterial({ color: "#9a9aa6", roughness: 0.95, fog: false }));
  moon.position.set(8, 5.8, -25);
  scene.add(moon);

  /* ---- asteroid melayang ---- */
  const AST = mobile ? 16 : 34;
  const rockGeo = new THREE.IcosahedronGeometry(1, 1);
  const rp = rockGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) { const s = 0.7 + r() * 0.55; rp.setXYZ(i, rp.getX(i) * s, rp.getY(i) * s * 0.8, rp.getZ(i) * s); }
  rockGeo.computeVertexNormals();
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: "#77747f", roughness: 0.95, flatShading: true, fog: false }), AST);
  const rock = [];
  for (let i = 0; i < AST; i++) {
    rock.push({
      x: (r() - 0.5) * 26, y: 0.8 + r() * 8.5, z: -(7 + r() * 24),
      vx: (r() < 0.5 ? -1 : 1) * (0.04 + r() * 0.16), s: 0.12 + r() * r() * 0.9,
      rx: r() * 6, ry: r() * 6, wx: (r() - 0.5) * 0.4, wy: (r() - 0.5) * 0.4,
    });
  }
  rocks.frustumCulled = false;
  scene.add(rocks);
  const dm = new THREE.Object3D();

  /* ---- stasiun luar angkasa kecil ---- */
  const metal = new THREE.MeshStandardMaterial({ color: "#aab4c4", roughness: 0.35, metalness: 0.85, fog: false });
  const panelM = new THREE.MeshStandardMaterial({ color: "#1b3a78", roughness: 0.25, metalness: 0.6, emissive: "#0a1f55", emissiveIntensity: 0.7, fog: false });
  const station = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.7, 14), metal); hull.rotation.z = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 36), metal);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: cyan, fog: false }));
  lamp.position.set(0.9, 0, 0);
  station.add(hull, ring, lamp);
  [-1, 1].forEach((s) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.9, 0.5), panelM); p.position.set(s * 0.45, 0.0, 0); p.rotation.x = 0.2; const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), metal); arm.position.set(s * 0.45, 0, 0); arm.rotation.x = Math.PI / 2; station.add(p, arm); });
  station.position.set(8, 4.2, -13);
  station.scale.setScalar(1.3);
  scene.add(station);

  /* ---- kaca panorama + rangka ---- */
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x9fd8ff, transparent: true, opacity: 0.14, roughness: 0.03, metalness: 0.0,
    envMapIntensity: 3.2, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide, depthWrite: false, fog: false,
  });
  const frameM = new THREE.MeshStandardMaterial({ color: "#0c121b", roughness: 0.4, metalness: 0.85 });
  const ledM = new THREE.MeshBasicMaterial({ color: cyan });
  const H = 5.4;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, H), glassMat); back.position.set(0, H / 2, -3);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(11, H), glassMat); left.rotation.y = Math.PI / 2; left.position.set(-7, H / 2, 2.5);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(11, H), glassMat); right.rotation.y = -Math.PI / 2; right.position.set(7, H / 2, 2.5);
  scene.add(back, left, right);
  const box = (w, h, d, x, y, z, m = frameM) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = false; scene.add(b); return b; };
  for (let i = 0; i <= 6; i++) box(0.08, H, 0.08, -7 + i * (14 / 6), H / 2, -3);
  for (let i = 0; i <= 4; i++) { const z = -3 + i * 2.75; box(0.08, H, 0.08, -7, H / 2, z); box(0.08, H, 0.08, 7, H / 2, z); }
  box(14.1, 0.1, 0.1, 0, H, -3); box(14.1, 0.14, 0.14, 0, 0.07, -3);
  box(0.1, 0.1, 11, -7, H, 2.5); box(0.1, 0.1, 11, 7, H, 2.5);
  box(0.14, 0.14, 11, -7, 0.07, 2.5); box(0.14, 0.14, 11, 7, 0.07, 2.5);
  // strip LED cyan di dasar kaca (memantul di lantai)
  box(13.9, 0.02, 0.02, 0, 0.17, -2.95, ledM);
  box(0.02, 0.02, 10.9, -6.95, 0.17, 2.5, ledM); box(0.02, 0.02, 10.9, 6.95, 0.17, 2.5, ledM);
  // balok langit + lampu panjang
  for (let i = 0; i < 4; i++) { const z = -3 + i * 3.6; box(14, 0.12, 0.16, 0, H, z); box(10, 0.03, 0.05, 0, H - 0.08, z, new THREE.MeshBasicMaterial({ color: 0xbfefff })); }

  /* ---- pantulan kilau di kaca + berkas cahaya (volumetrik palsu) ---- */
  const streakTex = keep(softTexture("streak"));
  const radialTex = keep(softTexture("radial"));
  const add = (map, col, op) => new THREE.MeshBasicMaterial({ map, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const streaks = [[-4.2, 1.1, 0.3], [1.4, 1.6, 0.35], [5.2, 0.9, 0.28]].map(([x, w, rz], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 6.4), add(streakTex, 0xaee3ff, 0.07));
    m.position.set(x, H / 2, -2.96); m.rotation.z = rz; m.userData.x0 = x; m.userData.ph = i * 2.1;
    scene.add(m); return m;
  });
  const shafts = [[-2.6, -0.45, 0.07], [0.8, -0.4, 0.05], [3.4, -0.5, 0.06]].map(([x, rz, op], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 6.5), add(streakTex, 0x7fb6ff, op));
    m.position.set(x, 2.6, -2.2 + i * 0.4); m.rotation.set(0.25, 0, rz); m.userData.op = op; m.userData.ph = i * 1.7;
    scene.add(m); return m;
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(11, 7), add(radialTex, 0x4aa8ff, 0.22));
  pool.rotation.x = -Math.PI / 2; pool.position.set(-1.8, 0.004, -0.6);
  scene.add(pool);

  /* ---- cahaya dari planet ---- */
  const sun = new THREE.DirectionalLight(0xbcd6ff, 1.1);
  sun.position.set(-6, 5, -9);
  scene.add(sun);
  const planetFill = new THREE.PointLight(0x4f8bff, 6, 9, 2);
  planetFill.position.set(-2.8, 2.2, -2.4);
  scene.add(planetFill);

  /* ---- environment map (pantulan lantai, meja, kursi, monitor, kaca) ---- */
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), new THREE.MeshBasicMaterial({ map: starTex, side: THREE.BackSide })));
  const pe = new THREE.Mesh(new THREE.SphereGeometry(PR, 32, 24), new THREE.MeshBasicMaterial({ map: planetTex, color: new THREE.Color(1.8, 1.8, 1.8) }));
  pe.position.copy(planetPos); envScene.add(pe);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.1, 1.6), side: THREE.DoubleSide }));
  top.rotation.x = Math.PI / 2; top.position.y = 40; envScene.add(top);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.9, 1.1), side: THREE.DoubleSide }));
  side.position.set(30, 8, 10); side.rotation.y = -Math.PI / 2; envScene.add(side);
  const envTex = pmrem.fromScene(envScene, 0.03).texture;
  envScene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });

  function update(t, dt) {
    planet.rotation.y = t * 0.012;
    moon.rotation.y = t * 0.03;
    for (let i = 0; i < AST; i++) {
      const a = rock[i];
      a.x += a.vx * dt;
      if (a.x > 14) a.x = -14; else if (a.x < -14) a.x = 14;
      dm.position.set(a.x, a.y + Math.sin(t * 0.2 + i) * 0.05, a.z);
      dm.rotation.set(a.rx + t * a.wx, a.ry + t * a.wy, 0);
      dm.scale.setScalar(a.s);
      dm.updateMatrix();
      rocks.setMatrixAt(i, dm.matrix);
    }
    rocks.instanceMatrix.needsUpdate = true;
    station.position.x -= dt * 0.22;
    if (station.position.x < -9) station.position.x = 9;
    station.rotation.y = t * 0.12; station.rotation.x = Math.sin(t * 0.1) * 0.15;
    lamp.visible = Math.floor(t * 1.5) % 2 === 0;
    streaks.forEach((m) => { m.position.x = m.userData.x0 + Math.sin(t * 0.08 + m.userData.ph) * 0.5; m.material.opacity = 0.05 + 0.03 * Math.sin(t * 0.35 + m.userData.ph); });
    shafts.forEach((m) => { m.material.opacity = m.userData.op * (0.75 + 0.25 * Math.sin(t * 0.5 + m.userData.ph)); });
  }

  function dispose() {
    envTex.dispose();
    disposables.forEach((d) => d.dispose?.());
    rockGeo.dispose();
  }

  return { envTex, update, dispose };
}
