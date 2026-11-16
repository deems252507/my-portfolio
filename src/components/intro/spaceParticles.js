// Partikel luar angkasa 3D (satu draw call, seluruh gerakan dihitung di GPU):
//  - ribuan partikel biru / cyan / putih yang mengorbit Bumi dengan kedalaman 3D nyata
//  - debu kosmik halus yang hanyut pelan di seluruh ruang
//  - bereaksi terhadap mouse: partikel di dekat sinar kursor menyingkir lembut (tidak menutupi objek utama)
import * as THREE from "three";

export function particleBudget({ isMobile }) {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (isMobile) return cores <= 4 || mem <= 3 ? 1400 : 2400;
  return cores <= 4 || mem <= 4 ? 4500 : 8000;
}

export function buildSpaceParticles(scene, { isMobile, planetPos, planetR }) {
  const total = particleBudget({ isMobile });
  const aA = new Float32Array(total * 4); // radius, sudut awal, kecepatan, kemiringan
  const aB = new Float32Array(total * 4); // ukuran, seed, mode (0 orbit / 1 debu), warna (0..1)
  const aC = new Float32Array(total * 3); // posisi dasar debu
  const rnd = Math.random;

  for (let i = 0; i < total; i++) {
    const orbit = rnd() < 0.62; // orbit & debu berselang-seling agar penurunan kualitas merata
    if (orbit) {
      // lebih banyak di dekat planet (cincin debu tipis), sebagian menjauh
      const r = 1.14 + Math.pow(rnd(), 1.7) * 1.55;
      aA[i * 4] = r * planetR;
      aA[i * 4 + 1] = rnd() * Math.PI * 2;
      aA[i * 4 + 2] = (0.075 + rnd() * 0.05) / Math.pow(r, 1.5) * (rnd() < 0.12 ? -1 : 1); // hukum Kepler ala sinematik
      aA[i * 4 + 3] = (rnd() - 0.5) * 0.9; // kemiringan bidang orbit
      aB[i * 4] = 0.35 + Math.pow(rnd(), 3.0) * 1.5;
      aB[i * 4 + 1] = rnd();
      aB[i * 4 + 2] = 0;
      aB[i * 4 + 3] = rnd();
    } else {
      aC[i * 3] = (rnd() - 0.5) * 120;
      aC[i * 3 + 1] = (rnd() - 0.3) * 46;
      aC[i * 3 + 2] = -6 - rnd() * 78; // selalu di luar kaca ruangan (z < -3.2)
      aA[i * 4 + 2] = 0.2 + rnd() * 0.5; // kecepatan hanyut
      aB[i * 4] = 0.3 + Math.pow(rnd(), 3.0) * 1.0;
      aB[i * 4 + 1] = rnd();
      aB[i * 4 + 2] = 1;
      aB[i * 4 + 3] = rnd();
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geo.setAttribute("aA", new THREE.BufferAttribute(aA, 4));
  geo.setAttribute("aB", new THREE.BufferAttribute(aB, 4));
  geo.setAttribute("aC", new THREE.BufferAttribute(aC, 3));

  // bidang orbit sedikit miring, searah kemiringan planet
  const tilt = new THREE.Matrix4().makeRotationZ(0.25).multiply(new THREE.Matrix4().makeRotationX(0.18));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPlanet: { value: planetPos.clone() },
      uTilt: { value: new THREE.Matrix3().setFromMatrix4(tilt) },
      uRayO: { value: new THREE.Vector3() },
      uRayD: { value: new THREE.Vector3(0, 0, -1) },
      uMouse: { value: 0 },
      uScale: { value: 300 },
      uCyan: { value: new THREE.Color(0.2, 0.85, 1.0) },
      uBlue: { value: new THREE.Color(0.22, 0.42, 1.0) },
      uWhite: { value: new THREE.Color(0.9, 0.95, 1.0) },
    },
    vertexShader: `
      attribute vec4 aA; attribute vec4 aB; attribute vec3 aC;
      uniform float uTime; uniform vec3 uPlanet; uniform mat3 uTilt;
      uniform vec3 uRayO; uniform vec3 uRayD; uniform float uMouse; uniform float uScale;
      uniform vec3 uCyan; uniform vec3 uBlue; uniform vec3 uWhite;
      varying vec3 vCol; varying float vA;
      void main(){
        float seed = aB.y; float mode = aB.z;
        vec3 wp;
        if (mode < 0.5) {
          float th = aA.y + aA.z * uTime;
          vec3 p = vec3(cos(th), sin(seed * 40.0) * 0.06, sin(th)) * aA.x; // sedikit tebal vertikal
          float c = cos(aA.w), s = sin(aA.w);
          p = vec3(p.x, p.y * c - p.z * s * 0.35, p.z * c + p.y * s * 0.35);
          wp = uPlanet + uTilt * p;
        } else {
          vec3 b = aC;
          b.x += sin(uTime * aA.z * 0.35 + seed * 30.0) * 1.6;
          b.y += cos(uTime * aA.z * 0.28 + seed * 17.0) * 1.1;
          b.z += sin(uTime * aA.z * 0.22 + seed * 9.0) * 1.2;
          wp = b;
        }
        // reaksi mouse: menyingkir dari sinar kursor (radius ikut jarak supaya terasa sama di dekat & jauh)
        vec3 rel = wp - uRayO;
        float along = max(dot(rel, uRayD), 0.0);
        vec3 perp = rel - uRayD * along;
        float dperp = length(perp);
        float rad = 0.1 * along + 0.4;
        float push = smoothstep(rad, 0.0, dperp) * uMouse;
        wp += normalize(perp + vec3(1e-4)) * push * rad * 0.9;

        vec4 mv = viewMatrix * vec4(wp, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(-mv.z, 0.5);
        float tw = 0.7 + 0.3 * sin(uTime * (1.2 + seed * 3.0) + seed * 60.0);
        gl_PointSize = clamp(aB.x * uScale / dist * (0.8 + push * 0.8), 1.0, 7.0);
        vec3 col = aB.w < 0.45 ? uCyan : (aB.w < 0.8 ? uBlue : uWhite);
        vCol = col;
        // partikel jauh & debu lebih redup; yang di dekat Bumi sedikit lebih terang
        float depthFade = mode < 0.5 ? 0.7 : 0.5;
        vA = tw * depthFade * (0.55 + 0.45 * smoothstep(120.0, 20.0, dist)) * (1.0 + push * 0.6);
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vA;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        float core = smoothstep(1.0, 0.0, r);
        float a = core * core;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vCol * 1.15, a * vA); // AdditiveBlending sudah mengalikan alpha
      }`,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 3;
  scene.add(points);

  // sinar kursor (koordinat NDC -1..1). Dihaluskan supaya gerak partikel tidak patah-patah.
  const ndc = new THREE.Vector2(0, 0), ndcS = new THREE.Vector2(0, 0);
  let mouseAmt = 0, mouseTarget = 0, lastMove = -10;
  const _v = new THREE.Vector3();

  function setPointer(x, y, t) { ndc.set(x, y); mouseTarget = 1; lastMove = t; }

  function update(t, dt, camera, height) {
    camera.updateMatrixWorld();
    mat.uniforms.uTime.value = t;
    mat.uniforms.uScale.value = height * 0.42; // ukuran titik mengikuti tinggi layar
    if (t - lastMove > 2.5) mouseTarget = 0;   // kursor diam / keluar -> reaksi memudar
    const k = 1 - Math.exp(-dt * 6);
    ndcS.lerp(ndc, k);
    mouseAmt += (mouseTarget - mouseAmt) * (1 - Math.exp(-dt * 3));
    mat.uniforms.uMouse.value = mouseAmt;
    mat.uniforms.uRayO.value.copy(camera.position);
    _v.set(ndcS.x, ndcS.y, 0.5).unproject(camera).sub(camera.position).normalize();
    mat.uniforms.uRayD.value.copy(_v);
  }

  /** level 1 = penuh, 0.5 = separuh, dst. (dipakai saat FPS turun) */
  function setQuality(level) { geo.setDrawRange(0, Math.max(300, Math.floor(total * level))); }

  function dispose() { scene.remove(points); geo.dispose(); mat.dispose(); }

  return { points, update, setPointer, setQuality, dispose, count: total };
}
