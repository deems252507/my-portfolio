// Markas luar angkasa: langit berbintang + nebula + galaksi, planet besar, bulan, asteroid,
// satelit/pesawat yang bergerak pelan, serta cangkang ruangan berkaca (jendela panorama).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { std, mk, radialTexture } from "./helpers";

export const PLANET_POS = new THREE.Vector3(-24, 6, -62);
export const PLANET_R = 15;
const SUN_DIR = new THREE.Vector3(0.6, 0.3, 0.55).normalize();

const NOISE = `
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p){
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < OCT; i++) { v += a * vnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return v;
}`;

/* ------------------------------- langit ---------------------------------- */
export function makeSky(isMobile) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vDir; uniform float uTime;
      #define OCT ${isMobile ? 4 : 5}
      ${NOISE}
      vec3 starLayer(vec3 d, float scale, float thresh, float size){
        vec3 g = d * scale; vec3 id = floor(g); vec3 f = fract(g) - 0.5;
        float h = h31(id);
        vec3 off = vec3(h31(id + 7.1), h31(id + 13.7), h31(id + 3.3)) - 0.5;
        float dist = length(f - off * 0.6);
        float on = step(thresh, h);
        float tw = 0.75 + 0.25 * sin(uTime * (1.0 + h * 5.0) + h * 40.0);
        float s = on * smoothstep(size, 0.0, dist) * tw;
        vec3 col = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.85, 0.7), h31(id + 1.7));
        return col * s * (0.7 + 1.8 * h31(id + 9.9));
      }
      void main(){
        vec3 d = normalize(vDir);
        vec3 col = vec3(0.003, 0.007, 0.018);
        float band = exp(-pow(dot(d, normalize(vec3(0.35, 0.8, -0.45))), 2.0) * 9.0);
        float n1 = fbm3(d * 2.2 + 3.0);
        float n2 = fbm3(d * 5.0 - 7.0);
        vec3 neb = mix(vec3(0.02, 0.2, 0.34), vec3(0.42, 0.07, 0.5), smoothstep(0.35, 0.75, n1));
        neb = mix(neb, vec3(0.05, 0.25, 0.65), smoothstep(0.4, 0.8, n2) * 0.5);
        float dens = smoothstep(0.38, 0.82, n1) * (0.25 + 0.9 * band);
        col += neb * dens * 0.95;
        col += vec3(0.5, 0.6, 0.9) * band * 0.05 * (0.5 + n2);
        col += starLayer(d, 45.0, 0.93, 0.10);
        col += starLayer(d, 110.0, 0.955, 0.12);
        ${isMobile ? "" : "col += starLayer(d, 260.0, 0.97, 0.2) * 0.8;"}
        vec3 gdir = normalize(vec3(0.62, 0.2, -0.75));
        vec3 gx = normalize(cross(gdir, vec3(0.0, 1.0, 0.0)));
        vec3 gy = cross(gx, gdir);
        if (dot(d, gdir) > 0.0) {
          vec2 p = vec2(dot(d, gx), dot(d, gy)) * 9.0;
          p.y *= 2.4;
          float r = length(p); float th = atan(p.y, p.x);
          float arm = 0.5 + 0.5 * cos(2.0 * (th - log(r + 0.05) * 2.6));
          float gg = exp(-r * 1.6) * (0.35 + 0.65 * arm);
          col += vec3(0.7, 0.78, 1.0) * gg * 0.75 + vec3(1.0, 0.8, 0.6) * exp(-r * 7.0) * 0.8;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 32), mat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  return sky;
}

/* ------------------------------- planet ---------------------------------- */
export function makePlanet(isMobile) {
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: SUN_DIR.clone() }, uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vP; varying vec3 vV;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vP = position;
        vV = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vN; varying vec3 vP; varying vec3 vV;
      uniform vec3 uSun; uniform float uTime;
      #define OCT ${isMobile ? 4 : 5}
      ${NOISE}
      void main(){
        vec3 n = normalize(vN);
        vec3 q = normalize(vP);
        float h = fbm3(q * 2.2 + 1.3);
        float land = smoothstep(0.50, 0.54, h);
        float lat = abs(q.y);
        vec3 ocean = mix(vec3(0.01, 0.06, 0.18), vec3(0.02, 0.2, 0.4), smoothstep(0.2, 0.5, h));
        vec3 ground = mix(vec3(0.1, 0.22, 0.12), vec3(0.36, 0.29, 0.18), smoothstep(0.52, 0.72, h));
        ground = mix(ground, vec3(0.86, 0.9, 0.95), smoothstep(0.8, 0.96, lat + (h - 0.5) * 0.3));
        vec3 albedo = mix(ocean, ground, land);
        float cl = fbm3(q * 4.0 + vec3(uTime * 0.01, 0.0, 0.0) + 9.0);
        float clouds = smoothstep(0.52, 0.78, cl);
        albedo = mix(albedo, vec3(0.95), clouds * 0.85);
        vec3 sun = normalize(uSun);
        float ndl = dot(n, sun);
        float day = smoothstep(-0.08, 0.35, ndl);
        vec3 col = albedo * day * 1.3;
        col += vec3(1.0, 0.45, 0.2) * exp(-pow(ndl * 5.0, 2.0)) * 0.1 * (0.4 + land);
        float city = step(0.74, fbm3(q * 18.0)) * land * (1.0 - clouds * 0.8);
        col += vec3(1.0, 0.72, 0.35) * city * (1.0 - smoothstep(-0.1, 0.1, ndl)) * 0.9;
        vec3 v = normalize(vV);
        vec3 hv = normalize(sun + v);
        float spec = pow(max(dot(n, hv), 0.0), 60.0) * (1.0 - land) * (1.0 - clouds) * day;
        col += vec3(0.7, 0.85, 1.0) * spec * 0.8;
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        col += vec3(0.25, 0.55, 1.0) * fres * (0.15 + 0.85 * day) * 1.2;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, isMobile ? 48 : 80, isMobile ? 32 : 56), mat);
  body.frustumCulled = false;
  group.add(body);

  const atmoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uSun: { value: SUN_DIR.clone() } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = cameraPosition - wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vN; varying vec3 vV; uniform vec3 uSun;
      void main(){
        float d = abs(dot(normalize(vN), normalize(vV)));
        float i = pow(clamp(d / 0.3, 0.0, 1.0), 2.5);
        float day = smoothstep(-0.4, 0.5, dot(normalize(vN), normalize(uSun)));
        gl_FragColor = vec4(vec3(0.3, 0.6, 1.0) * i * (0.25 + 0.9 * day), 1.0);
      }`,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.035, 48, 32), atmoMat);
  atmo.frustumCulled = false;
  group.add(atmo);
  return { group, body, mats: [mat, atmoMat] };
}

function lumpyRock(radius, detail, bump, seed) {
  const g = new THREE.IcosahedronGeometry(radius, detail);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 1.7) * Math.sin(v.z * 3.4 + seed * 0.6);
    v.multiplyScalar(1 + n * bump);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/* --------------------- latar luar angkasa lengkap ------------------------ */
export function buildSpaceBackdrop(scene, { isMobile }) {
  const root = new THREE.Group();
  scene.add(root);
  const sky = makeSky(isMobile);
  root.add(sky);
  const planet = makePlanet(isMobile);
  planet.group.position.copy(PLANET_POS);
  planet.group.rotation.z = 0.25;
  root.add(planet.group);

  // bulan
  const moon = new THREE.Mesh(lumpyRock(2.6, 4, 0.05, 3.3), std("#8d939e", { roughness: 1, fog: false }));
  moon.position.set(17, 10, -48);
  root.add(moon);

  // sabuk asteroid
  const nAst = isMobile ? 36 : 80;
  const rockMat = std("#5b6068", { roughness: 1, fog: false });
  const ast = new THREE.InstancedMesh(lumpyRock(1, 1, 0.25, 1.1), rockMat, nAst);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  for (let i = 0; i < nAst; i++) {
    const a = -0.9 + Math.random() * 1.9;
    const r = 26 + Math.random() * 14;
    pv.set(Math.sin(a) * r + 4, (Math.random() - 0.5) * 7 + 2, -Math.cos(a) * r - 6);
    e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    q.setFromEuler(e);
    const s = 0.25 + Math.random() * Math.random() * 1.4;
    sv.set(s, s * (0.7 + Math.random() * 0.5), s);
    m4.compose(pv, q, sv);
    ast.setMatrixAt(i, m4);
  }
  ast.frustumCulled = false;
  const belt = new THREE.Group();
  belt.position.set(0, 0, -18);
  ast.position.set(0, 0, 18);
  belt.add(ast);
  root.add(belt);

  // satelit
  const sat = new THREE.Group();
  const metal = std("#9aa4b4", { roughness: 0.4, metalness: 0.8, fog: false });
  const panelMat = std("#14306b", { roughness: 0.35, metalness: 0.6, emissive: new THREE.Color("#0a2a66"), emissiveIntensity: 0.6, fog: false });
  sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), metal));
  [-1, 1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.8), panelMat);
    p.position.x = s * 1.5;
    sat.add(p);
  });
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.25, 16, 1, true), metal);
  dish.position.set(0, 0.5, 0); dish.rotation.x = Math.PI;
  sat.add(dish);
  const blinkMat = new THREE.MeshBasicMaterial({ color: 0xff4455, fog: false });
  const blink = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), blinkMat);
  blink.position.set(0.4, 0.34, 0.3);
  sat.add(blink);
  sat.scale.setScalar(0.9);
  root.add(sat);

  // pesawat angkut dengan nyala mesin
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.7, 0.9, 2, 0.15), std("#6c7686", { roughness: 0.5, metalness: 0.7, fog: false }));
  ship.add(hull);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 12), metal);
  nose.rotation.z = Math.PI / 2; nose.position.x = 2.6;
  ship.add(nose);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), new THREE.MeshBasicMaterial({ color: 0x66e8ff, fog: false }));
  glow.position.x = -2.3;
  ship.add(glow);
  const trail = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.35), new THREE.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  trail.position.x = -4.8;
  ship.add(trail);
  root.add(ship);

  // bintang jatuh
  const meteor = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.05), new THREE.MeshBasicMaterial({ color: 0xcdf3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  meteor.visible = false;
  root.add(meteor);
  let meteorT = -1, nextMeteor = 3.5;

  const noDepth = [meteor, trail];

  function update(t, dt) {
    sky.material.uniforms.uTime.value = t;
    planet.mats[0].uniforms.uTime.value = t;
    planet.group.rotation.y = t * 0.006;
    belt.rotation.y = t * 0.004;
    moon.rotation.y = t * 0.02;
    sat.position.set(12 - ((t * 0.5) % 36), 5.6 + Math.sin(t * 0.2) * 0.3, -23);
    sat.rotation.y = t * 0.15; sat.rotation.z = Math.sin(t * 0.3) * 0.1;
    blinkMat.color.setHex(Math.floor(t * 1.4) % 2 ? 0xff4455 : 0x330a10);
    ship.position.set(-26 + ((t * 0.9 + 12) % 52), 9.5 + Math.sin(t * 0.13) * 0.4, -36);
    ship.rotation.z = 0.02 * Math.sin(t * 0.4);
    trail.material.opacity = 0.32 + 0.12 * Math.sin(t * 9);
    if (meteorT < 0 && t > nextMeteor) { meteorT = 0; meteor.visible = true; meteor.position.set(10 - Math.random() * 14, 11 + Math.random() * 3, -40); meteor.rotation.z = -0.5 - Math.random() * 0.2; }
    if (meteorT >= 0) {
      meteorT += dt;
      const u = meteorT / 0.9;
      meteor.position.x -= dt * 30; meteor.position.y -= dt * 14;
      meteor.material.opacity = Math.sin(Math.min(1, u) * Math.PI) * 0.9;
      if (u >= 1) { meteorT = -1; meteor.visible = false; nextMeteor = t + 6 + Math.random() * 6; }
    }
  }
  return { root, update, noDepth };
}

/* ---- scene khusus untuk peta lingkungan (pantulan di kaca, lantai, meja, monitor) ---- */
export function buildEnvScene(isMobile) {
  const s = new THREE.Scene();
  s.add(makeSky(true));
  const p = makePlanet(true);
  p.group.position.copy(PLANET_POS);
  s.add(p.group);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0x9aa0aa }));
  moon.position.set(17, 10, -48);
  s.add(moon);
  const cyanLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4fe3ff).multiplyScalar(5), side: THREE.DoubleSide });
  [-3, 0, 3].forEach((x) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 9), cyanLight);
    m.rotation.x = Math.PI / 2; m.position.set(x, 4.3, 1);
    s.add(m);
  });
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd9a8).multiplyScalar(3), side: THREE.DoubleSide });
  const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), warm);
  w.position.set(6, 3.2, 6); w.lookAt(0, 1, 0);
  s.add(w);
  return s;
}

/* ------------------- cangkang ruangan: lantai, kaca, rangka ----------------- */
function gridTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#0a111b";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(34,211,238,0.16)";
  g.lineWidth = 2;
  g.strokeRect(1, 1, 254, 254);
  g.strokeStyle = "rgba(34,211,238,0.5)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(236, 256); g.lineTo(256, 256); g.moveTo(256, 236); g.lineTo(256, 256);
  g.moveTo(0, 236); g.lineTo(0, 256); g.moveTo(0, 0); g.lineTo(20, 0);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 12);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function buildStationShell(scene, { isMobile, cyan }) {
  const noDepth = [];
  const disposables = [];
  const gt = gridTexture();
  disposables.push(gt);
  const cyanBasic = new THREE.MeshBasicMaterial({ color: cyan });
  const frameMat = std("#0a1018", { roughness: 0.4, metalness: 0.8 });

  // lantai mengkilap (memantulkan peta lingkungan: planet, bintang, lampu)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, map: gt, roughness: 0.2, metalness: 0.78, envMapIntensity: 1.1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 2.8);
  floor.receiveShadow = true;
  scene.add(floor);

  // langit-langit dengan strip cahaya
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), std("#060a11", { roughness: 0.7, metalness: 0.4 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 4.4, 2.8);
  scene.add(ceil);
  [-4.5, -2.25, 0, 2.25, 4.5].forEach((x) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 11), cyanBasic);
    s.position.set(x, 4.38, 2.8);
    scene.add(s);
  });

  // kaca panorama belakang + samping
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xa6e6ff, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.1,
    envMapIntensity: 6, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05,
  });
  const mkGlass = (w, h, x, y, z, ry) => {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat);
    g.position.set(x, y, z); g.rotation.y = ry; g.renderOrder = 5;
    scene.add(g); noDepth.push(g);
  };
  mkGlass(14, 4.4, 0, 2.2, -3.2, 0);
  mkGlass(12, 4.4, -7, 2.2, 2.8, Math.PI / 2);
  mkGlass(12, 4.4, 7, 2.2, 2.8, -Math.PI / 2);

  const mull = (x, z, ry = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.4, 0.14), frameMat);
    m.position.set(x, 2.2, z); m.rotation.y = ry; m.castShadow = true;
    scene.add(m);
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 4.2, 0.02), cyanBasic);
    line.position.set(x + (ry ? 0 : 0), 2.2, z + 0.08 * (ry ? 0 : 1));
    if (ry) line.position.x = x + (x < 0 ? 0.08 : -0.08);
    scene.add(line);
  };
  [-6.3, -4.2, -2.1, 2.1, 4.2, 6.3].forEach((x) => mull(x, -3.2));
  [-2, 0.5, 3, 5.5, 8].forEach((z) => { mull(-7, z, Math.PI / 2); mull(7, z, Math.PI / 2); });
  // rel melintang
  const sill = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 0.36), frameMat); sill.position.set(0, 0.15, -3.2); scene.add(sill);
  const sillLine = new THREE.Mesh(new THREE.BoxGeometry(14, 0.02, 0.02), cyanBasic); sillLine.position.set(0, 0.32, -3.0); scene.add(sillLine);
  const head = new THREE.Mesh(new THREE.BoxGeometry(14, 0.25, 0.3), frameMat); head.position.set(0, 4.3, -3.2); scene.add(head);
  const trans = new THREE.Mesh(new THREE.BoxGeometry(14, 0.08, 0.1), frameMat); trans.position.set(0, 3.1, -3.2); scene.add(trans);

  // jalur cahaya & cincin di lantai
  [-2.6, -1.3, 1.3, 2.6].forEach((x) => {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.004, 9.5), cyanBasic);
    l.position.set(x, 0.004, 2.2);
    scene.add(l);
  });
  [1.9, 3.1].forEach((r) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.03, 96), cyanBasic);
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.005, 0.2);
    scene.add(ring);
  });

  // bayangan kontak (pengganti ambient occlusion) + cahaya planet yang jatuh di lantai
  const blob = radialTexture("rgba(0,0,0,0.75)", "rgba(0,0,0,0)");
  const blobMat = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false });
  disposables.push(blob);
  [[2.9, 1.5, 0, 0.1], [1.1, 1.1, 0, 0.66], [0.8, 0.8, 0, 0.55]].forEach(([w, h, x, z]) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.4, h * 1.4), blobMat);
    b.rotation.x = -Math.PI / 2; b.position.set(x, 0.006, z);
    scene.add(b);
  });
  const spill = radialTexture("rgba(90,160,255,0.35)", "rgba(90,160,255,0)");
  disposables.push(spill);
  const spillMesh = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.5), new THREE.MeshBasicMaterial({ map: spill, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  spillMesh.rotation.x = -Math.PI / 2; spillMesh.position.set(-1.5, 0.008, -1.2);
  scene.add(spillMesh); noDepth.push(spillMesh);

  // berkas cahaya volumetrik (palsu) dari kaca
  const beamTex = (() => {
    const c = document.createElement("canvas"); c.width = 32; c.height = 256;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "rgba(150,210,255,0.55)"); gr.addColorStop(1, "rgba(150,210,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 32, 256);
    const gx = g.createLinearGradient(0, 0, 32, 0);
    gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(0.5, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = gx; g.fillRect(0, 0, 32, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  disposables.push(beamTex);
  const beams = [];
  const nBeams = isMobile ? 2 : 4;
  for (let i = 0; i < nBeams; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + i * 0.3, 6.5), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    b.position.set(-4 + i * 2.6, 2.1, -1.2 + (i % 2) * 0.8);
    b.rotation.set(0.5, 0, 0.12 - i * 0.06);
    b.userData.base = b.position.x; b.userData.ph = i * 1.7;
    scene.add(b); beams.push(b); noDepth.push(b);
  }

  // rak server dengan LED berkedip (sisi kanan)
  const rackMat = std("#0a1018", { roughness: 0.5, metalness: 0.5 });
  const racks = [-2.3, -1.2, -0.1];
  racks.forEach((z) => scene.add(mk(new RoundedBoxGeometry(0.8, 2.3, 0.8, 3, 0.02), rackMat, 5.9, 1.15, z)));
  const ledCount = racks.length * 14;
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0xffffff }), ledCount);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  let n = 0;
  racks.forEach((z) => {
    for (let k = 0; k < 14; k++) {
      dummy.position.set(5.9 - 0.405, 0.35 + k * 0.14, z - 0.2 + (k % 3) * 0.2);
      dummy.updateMatrix();
      leds.setMatrixAt(n, dummy.matrix);
      leds.setColorAt(n, col.set(k % 4 === 0 ? 0xff5a6a : 0x22d3ee));
      n++;
    }
  });
  scene.add(leds);

  // debu halus berkilau
  const cnt = isMobile ? 200 : 420;
  const pos = new Float32Array(cnt * 3);
  for (let i = 0; i < cnt; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 1] = Math.random() * 3.6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8 + 1;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x9fe8ff, size: 0.014, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dust); noDepth.push(dust);

  function update(t, dt) {
    dust.rotation.y = t * 0.02;
    dust.position.y = Math.sin(t * 0.3) * 0.05;
    beams.forEach((b) => {
      b.position.x = b.userData.base + Math.sin(t * 0.12 + b.userData.ph) * 0.5;
      b.material.opacity = 0.12 + 0.05 * Math.sin(t * 0.4 + b.userData.ph);
    });
    if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) {
      for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * ledCount);
        leds.setColorAt(idx, new THREE.Color(Math.random() > 0.5 ? 0x22d3ee : Math.random() > 0.5 ? 0xff5a6a : 0x0b2a33));
      }
      if (leds.instanceColor) leds.instanceColor.needsUpdate = true;
    }
  }
  return { update, noDepth, disposables, gt };
}
