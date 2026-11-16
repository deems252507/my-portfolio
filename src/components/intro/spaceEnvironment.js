// Markas luar angkasa: langit berbintang + nebula + galaksi, planet besar, bulan, asteroid,
// satelit/pesawat yang bergerak pelan, serta cangkang ruangan berkaca (jendela panorama).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { std, mk, radialTexture } from "./helpers";
import { loadEarthTextures } from "./earthTextures";
import { buildSpaceParticles } from "./spaceParticles";

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
// Dua lapis tampilan Bumi:
//  - "body"  : Bumi prosedural lama (cadangan; dipakai di peta lingkungan & bila tekstur gagal dimuat)
//  - "earth" : Bumi realistis berbasis tekstur satelit NASA (siang, lampu kota malam, laut/darat, relief, awan)
// Awan = bola transparan terpisah yang berputar sendiri, atmosfer = hamburan Rayleigh di tepian planet.
const PLANET_VERT = `
  varying vec3 vNw; varying vec3 vTw; varying vec3 vBw; varying vec3 vV; varying vec2 vUv;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 no = normalize(position);
    vec3 to = cross(vec3(0.0, 1.0, 0.0), no);                 // arah timur (u bertambah) pada bola
    to = length(to) < 1e-4 ? vec3(1.0, 0.0, 0.0) : normalize(to);
    vec3 bo = cross(no, to);                                   // arah utara (v bertambah)
    mat3 M = mat3(modelMatrix);
    vNw = normalize(M * no); vTw = normalize(M * to); vBw = normalize(M * bo);
    vV = cameraPosition - wp.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

function makeEarthMaterial(tex, isMobile) {
  const has = (t) => (t ? 1 : 0);
  const dummy = tex.day;
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: true,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    uniforms: {
      tDay: { value: tex.day }, tNight: { value: tex.night || dummy }, tSpec: { value: tex.spec || dummy },
      tNormal: { value: tex.normal || dummy }, tClouds: { value: tex.clouds || dummy },
      uHasNight: { value: has(tex.night) }, uHasSpec: { value: has(tex.spec) },
      uHasNormal: { value: has(tex.normal) }, uHasClouds: { value: has(tex.clouds) },
      uSun: { value: SUN_DIR.clone() }, uCloudShift: { value: 0 }, uFade: { value: 0 },
      uRelief: { value: isMobile ? 0.7 : 1.0 },
    },
    vertexShader: PLANET_VERT,
    fragmentShader: `
      varying vec3 vNw; varying vec3 vTw; varying vec3 vBw; varying vec3 vV; varying vec2 vUv;
      uniform sampler2D tDay; uniform sampler2D tNight; uniform sampler2D tSpec; uniform sampler2D tNormal; uniform sampler2D tClouds;
      uniform float uHasNight; uniform float uHasSpec; uniform float uHasNormal; uniform float uHasClouds;
      uniform vec3 uSun; uniform float uCloudShift; uniform float uFade; uniform float uRelief;
      void main(){
        vec3 N = normalize(vNw);
        vec3 V = normalize(vV);
        vec3 L = normalize(uSun);
        vec3 Nm = N;
        if (uHasNormal > 0.5) {
          vec3 m = texture2D(tNormal, vUv).xyz * 2.0 - 1.0;
          m.xy *= 0.9 * uRelief;
          Nm = normalize(normalize(vTw) * m.x + normalize(vBw) * m.y + N * max(m.z, 0.2));
        }
        float ndl = dot(N, L);
        float day = smoothstep(-0.10, 0.30, ndl);            // terminator lembut (bukan garis tajam)
        float relief = clamp(1.0 + (dot(Nm, L) - ndl) * 1.5, 0.65, 1.4);

        vec3 albedo = texture2D(tDay, vUv).rgb;
        float water = uHasSpec > 0.5 ? texture2D(tSpec, vUv).r : 0.0;
        float cd = uHasClouds > 0.5 ? texture2D(tClouds, vec2(vUv.x + uCloudShift + 0.0035, vUv.y - 0.0025)).r : 0.0;
        cd = smoothstep(0.12, 0.9, cd);
        float shadow = 1.0 - cd * 0.5;                        // bayangan awan jatuh ke permukaan

        vec3 col = albedo * day * relief * shadow * 2.6;
        col += albedo * vec3(0.05, 0.09, 0.17) * 0.11 * (1.0 - day); // cahaya bumi (earthshine) sangat halus

        // pantulan matahari di laut
        vec3 H = normalize(L + V);
        float spec = pow(max(dot(Nm, H), 0.0), 110.0) * water * day * (1.0 - cd);
        col += vec3(0.85, 0.93, 1.0) * spec * 1.6;
        float NdV = max(dot(N, V), 0.0);
        col += vec3(0.12, 0.28, 0.55) * pow(1.0 - NdV, 4.0) * water * day * 0.5;

        // senja di sepanjang terminator
        col += vec3(1.0, 0.42, 0.18) * exp(-pow(ndl * 4.2, 2.0)) * 0.09 * (0.4 + 0.6 * shadow) * day;

        // lampu kota di sisi malam, tertutup awan
        if (uHasNight > 0.5) {
          vec3 nl = texture2D(tNight, vUv).rgb;
          float lum = dot(nl, vec3(0.333));
          vec3 warm = mix(nl, vec3(1.0, 0.72, 0.38) * lum, 0.65);
          float nightMask = 1.0 - smoothstep(-0.10, 0.12, ndl);
          col += warm * nightMask * (1.0 - cd * 0.85) * 2.4;
        }

        // hamburan atmosfer di tepi piringan planet
        float fres = pow(1.0 - NdV, 3.2);
        col += vec3(0.2, 0.46, 1.0) * fres * (0.12 + 0.88 * smoothstep(-0.25, 0.5, ndl)) * 1.15;
        gl_FragColor = vec4(col, uFade);
      }`,
  });
}

function makeCloudMaterial(tex) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { tClouds: { value: tex.clouds }, uSun: { value: SUN_DIR.clone() }, uFade: { value: 0 } },
    vertexShader: `
      varying vec3 vNw; varying vec3 vV; varying vec2 vUv;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNw = normalize(mat3(modelMatrix) * normalize(position));
        vV = cameraPosition - wp.xyz; vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vNw; varying vec3 vV; varying vec2 vUv;
      uniform sampler2D tClouds; uniform vec3 uSun; uniform float uFade;
      void main(){
        vec3 N = normalize(vNw); vec3 V = normalize(vV); vec3 L = normalize(uSun);
        float d = smoothstep(0.12, 0.9, texture2D(tClouds, vUv).r);
        float ndl = dot(N, L);
        float day = smoothstep(-0.12, 0.35, ndl);
        vec3 tint = mix(vec3(1.0, 0.72, 0.52), vec3(1.0), smoothstep(0.0, 0.45, ndl)); // awan memerah di dekat senja
        vec3 col = tint * (0.02 + 1.9 * day);
        float rim = 1.0 + pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.5;
        gl_FragColor = vec4(col, clamp(d * rim, 0.0, 1.0) * 0.92 * uFade);
      }`,
  });
}

export function makePlanet(isMobile) {
  const group = new THREE.Group();          // kemiringan sumbu (diatur pemanggil)
  const spinner = new THREE.Group();        // berputar pada sumbu miring
  group.add(spinner);

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
  const geo = new THREE.SphereGeometry(PLANET_R, isMobile ? 64 : 96, isMobile ? 40 : 64);
  const body = new THREE.Mesh(geo, mat);
  body.frustumCulled = false;
  spinner.add(body);

  // atmosfer: hamburan Rayleigh dari sinar yang melintasi lapisan udara tipis di tepi planet
  const ATMO = 1.07;
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uSun: { value: SUN_DIR.clone() }, uR: { value: PLANET_R }, uAtmo: { value: ATMO } },
    vertexShader: `
      varying vec3 vWp; varying vec3 vC;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWp = wp.xyz;
        vC = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      varying vec3 vWp; varying vec3 vC; uniform vec3 uSun; uniform float uR; uniform float uAtmo;
      void main(){
        vec3 rd = normalize(vWp - cameraPosition);
        float tca = dot(vC - cameraPosition, rd);
        vec3 cp = cameraPosition + rd * tca;
        vec3 off = cp - vC;
        float b = length(off) / uR;                           // jarak terdekat sinar ke pusat (dalam jari-jari planet)
        float h = max(b - 1.0, 0.0);
        float dens = exp(-h * 36.0);                          // pekat di tepi, cepat memudar ke atas
        float chord = sqrt(max(uAtmo * uAtmo - max(b, 1.0) * max(b, 1.0), 0.0));
        float sunT = dot(normalize(off + vec3(1e-5)), normalize(uSun));
        float day = smoothstep(-0.4, 0.55, sunT);
        float twi = exp(-pow(sunT * 3.0, 2.0));
        vec3 col = vec3(0.15, 0.42, 1.0) * day + vec3(1.0, 0.48, 0.2) * twi * 0.3;
        float a = min(dens * chord * 5.5, 1.4);
        gl_FragColor = vec4(col * a, 1.0);
      }`,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * ATMO, 64, 40), atmoMat);
  atmo.frustumCulled = false;
  atmo.renderOrder = 4;
  group.add(atmo);

  const state = { earth: null, clouds: null, earthMat: null, cloudMat: null, fade: 0, tex: null, spin: 0 };

  /** Pasang tekstur satelit. Bumi realistis muncul dengan fade di atas Bumi prosedural. */
  function applyTextures(tex) {
    if (!tex || state.earth) return;
    state.tex = tex;
    state.earthMat = makeEarthMaterial(tex, isMobile);
    state.earth = new THREE.Mesh(geo, state.earthMat);
    state.earth.frustumCulled = false;
    state.earth.renderOrder = 1;
    spinner.add(state.earth);
    if (tex.clouds) {
      state.cloudMat = makeCloudMaterial(tex);
      state.clouds = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R * 1.012, isMobile ? 48 : 80, isMobile ? 32 : 48), state.cloudMat);
      state.clouds.frustumCulled = false;
      state.clouds.renderOrder = 2;
      group.add(state.clouds);
    }
  }

  /** Dipanggil tiap frame: rotasi Bumi pelan, awan berputar sendiri, fade-in tekstur. */
  function update(t, dt) {
    mat.uniforms.uTime.value = t;
    const aPlanet = t * 0.012, aCloud = t * 0.019 + 0.6;
    spinner.rotation.y = aPlanet;
    if (state.clouds) state.clouds.rotation.y = aCloud;
    if (state.earthMat) {
      state.fade = Math.min(1, state.fade + dt / 1.6);
      const f = state.fade * state.fade * (3 - 2 * state.fade);
      state.earthMat.uniforms.uFade.value = f;
      state.earthMat.uniforms.uCloudShift.value = (aPlanet - aCloud) / (Math.PI * 2);
      if (state.cloudMat) state.cloudMat.uniforms.uFade.value = f;
      if (state.fade >= 1 && body.visible) { // prosedural sudah tertutup penuh: matikan agar hemat GPU
        body.visible = false;
        state.earthMat.transparent = false;
      }
    }
  }

  function dispose() {
    if (state.tex) Object.values(state.tex).forEach((t) => t?.dispose?.());
    state.earthMat?.dispose(); state.cloudMat?.dispose();
    state.clouds?.geometry.dispose();
  }

  return { group, body, mats: [mat, atmoMat], applyTextures, update, dispose };
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


/* ---------------------------- asteroid realistis ---------------------------- */
// Batu abu-kebiruan dengan relief kawah (tekstur dibuat di canvas), melayang & berputar pelan.
// 3 variasi bentuk, masing-masing 1 InstancedMesh (hanya 3 draw call untuk seluruh asteroid).
function rockTexture() {
  const N = 256;
  const c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d");
  const build = (cells, seed) => {
    const a = new Float32Array(cells * cells);
    let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < a.length; i++) a[i] = r();
    return (x, y) => { // value noise yang dapat diulang (tileable)
      const fx = (x / N) * cells, fy = (y / N) * cells;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const i = (xx, yy) => a[(((yy % cells) + cells) % cells) * cells + (((xx % cells) + cells) % cells)];
      return (i(x0, y0) * (1 - sx) + i(x0 + 1, y0) * sx) * (1 - sy) + (i(x0, y0 + 1) * (1 - sx) + i(x0 + 1, y0 + 1) * sx) * sy;
    };
  };
  const n1 = build(4, 11), n2 = build(8, 23), n3 = build(16, 37), n4 = build(32, 51);
  const h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    h[y * N + x] = n1(x, y) * 0.45 + n2(x, y) * 0.28 + n3(x, y) * 0.17 + n4(x, y) * 0.10;
  }
  // kawah: cekungan dengan tepi sedikit terangkat
  let s = 77; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 26; k++) {
    const cx = r() * N, cy = r() * N, rad = 6 + r() * r() * 30, dep = 0.18 + r() * 0.25;
    for (let y = -rad * 1.4 | 0; y <= rad * 1.4; y++) for (let x = -rad * 1.4 | 0; x <= rad * 1.4; x++) {
      const d = Math.hypot(x, y) / rad;
      if (d > 1.4) continue;
      const bowl = d < 1 ? -dep * (1 - d * d) : 0;
      const rim = Math.exp(-Math.pow((d - 1.05) * 5, 2)) * dep * 0.45;
      const px = (Math.floor(cx + x) + N) % N, py = (Math.floor(cy + y) + N) % N;
      h[py * N + px] += bowl + rim;
    }
  }
  const img = g.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = Math.max(0, Math.min(1, h[i]));
    const l = 52 + v * 150;
    img.data[i * 4] = l * 1.0; img.data[i * 4 + 1] = l * 1.02; img.data[i * 4 + 2] = l * 1.07; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rockGeometry(seed, bump) {
  const g = new THREE.IcosahedronGeometry(1, 3);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n1 = Math.sin(v.x * 2.3 + seed) * Math.sin(v.y * 2.1 + seed * 1.7) * Math.sin(v.z * 2.6 + seed * 0.6);
    const n2 = Math.sin(v.x * 5.7 + seed * 2.1) * Math.sin(v.y * 6.3 + seed) * Math.sin(v.z * 5.1 + seed * 3.3);
    const n3 = Math.sin(v.x * 11.0 + seed * 4.0) * Math.sin(v.y * 12.5 + seed * 2.0) * Math.sin(v.z * 10.3 + seed);
    v.multiplyScalar(1 + n1 * bump + n2 * bump * 0.35 + n3 * bump * 0.12);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  // UV bola sederhana agar tekstur batu menutup merata
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    uv[i * 2] = Math.atan2(v.z, v.x) / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = Math.asin(v.y) / Math.PI + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function buildAsteroids(root, { isMobile }) {
  const belt = new THREE.Group();
  belt.position.set(0, 0, -18);
  root.add(belt);

  const tex = rockTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xb4bdcc, map: tex, bumpMap: tex, bumpScale: 2.4, roughness: 1, metalness: 0, envMapIntensity: 2.2, fog: false,
  });
  const variants = [rockGeometry(1.3, 0.3), rockGeometry(4.7, 0.26), rockGeometry(8.1, 0.34)];
  const total = isMobile ? 54 : 150;
  const cam = new THREE.Vector3(0, 1.3, 3.5);
  const rnd = Math.random;

  // data tiap asteroid: posisi dunia dasar, skala, sumbu & kecepatan putar, ayunan melayang
  const items = [];
  const nArc = Math.floor(total * 0.55);
  for (let i = 0; i < total; i++) {
    let x, y, z, s;
    if (i < nArc) { // sabuk lengkung (susunan lama)
      const a = -0.9 + rnd() * 1.9, rr = 26 + rnd() * 14;
      x = Math.sin(a) * rr + 4; y = (rnd() - 0.5) * 7 + 2; z = -Math.cos(a) * rr - 6;
      s = 0.22 + rnd() * rnd() * 1.4;
    } else { // asteroid kecil di berbagai kedalaman (memperkuat parallax); tidak menutupi planet / masuk ruangan
      let tries = 0;
      do {
        x = (rnd() - 0.5) * 50; y = -3 + rnd() * 17; z = -8 - rnd() * 34; s = 0.06 + Math.pow(rnd(), 2.2) * 0.5; tries++;
        const k = (z - cam.z) / (PLANET_POS.z - cam.z);
        const cx = cam.x + (PLANET_POS.x - cam.x) * k, cy = cam.y + (PLANET_POS.y - cam.y) * k;
        if (Math.hypot(x - cx, y - cy) > PLANET_R * k * 1.12 + s) break;
      } while (tries < 20);
    }
    const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    items.push({
      v: i % variants.length,
      base: new THREE.Vector3(x, y, z + 18), // koordinat lokal sabuk
      s, flat: 0.7 + rnd() * 0.5,
      axis, w: (0.04 + rnd() * 0.35) / Math.sqrt(Math.max(s, 0.1) * 2),
      q0: new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)),
      dir: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.6),
      f: 0.05 + rnd() * 0.12, ph: rnd() * 6.28,
    });
  }
  const meshes = variants.map((g, vi) => {
    const n = items.filter((it) => it.v === vi).length;
    const m = new THREE.InstancedMesh(g, mat, n);
    m.frustumCulled = false;
    belt.add(m);
    return m;
  });
  const idx = [0, 0, 0];
  items.forEach((it) => { it.i = idx[it.v]++; });

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sv = new THREE.Vector3();
  function update(t) {
    belt.rotation.y = t * 0.004;
    for (const it of items) {
      q.setFromAxisAngle(it.axis, it.w * t).multiply(it.q0);
      p.copy(it.base).addScaledVector(it.dir, Math.sin(t * it.f + it.ph) * 2.2);
      sv.set(it.s, it.s * it.flat, it.s);
      m4.compose(p, q, sv);
      meshes[it.v].setMatrixAt(it.i, m4);
    }
    meshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
  }
  update(0);
  return { update, tex, mat };
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

  // asteroid realistis (instanced) + partikel 3D
  const asteroids = buildAsteroids(root, { isMobile });
  const particles = buildSpaceParticles(scene, { isMobile, planetPos: PLANET_POS, planetR: PLANET_R });

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

  function update(t, dt, camera, viewH) {
    sky.material.uniforms.uTime.value = t;
    planet.update(t, dt);
    asteroids.update(t);
    if (camera) particles.update(t, dt, camera, viewH || 800);
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

  // tekstur Bumi dimuat async; Bumi prosedural tetap tampil sampai tekstur siap (lalu fade ke versi realistis)
  let disposed = false;
  const abort = new AbortController();
  async function loadEarth(renderer) {
    const tex = await loadEarthTextures({ renderer, isMobile, signal: abort.signal });
    if (!tex) return false;
    if (disposed) { Object.values(tex).forEach((t) => t?.dispose?.()); return false; }
    planet.applyTextures(tex);
    return true;
  }
  function dispose() {
    disposed = true; abort.abort();
    planet.dispose(); particles.dispose();
    asteroids.tex.dispose();
  }
  return {
    root, update, noDepth, loadEarth, dispose,
    setPointer: particles.setPointer, setQuality: particles.setQuality, particleCount: particles.count,
  };
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
