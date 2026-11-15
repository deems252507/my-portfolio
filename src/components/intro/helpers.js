// Fungsi bantu bersama untuk adegan 3D intro.
import * as THREE from "three";

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.0, ...o });
export const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, metalness: 0.0, ...o });

export function mk(geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
/** Letakkan silinder tinggi-1 dari titik a ke b. Mengembalikan arah ternormalisasi (vektor bersama, pakai segera). */
export function placeLimb(mesh, a, b) {
  _d.subVectors(b, a);
  const len = _d.length() || 1e-4;
  mesh.position.copy(a).addScaledVector(_d, 0.5);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(_up, _d.normalize());
  return _d;
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
/** IK dua-segmen (bahu -> siku -> pergelangan). */
export function solveArm(S, W, l1, l2, pole, out) {
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

export function bendX(geo, R) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) + (R - Math.sqrt(R * R - x * x)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/** Lipatan kain: geser vertex sepanjang normal dengan pola gelombang (untuk hoodie/celana). */
export function wrinkle(geo, amp = 0.008, freq = 14, seed = 0) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const w =
      Math.sin(y * freq + Math.sin(x * freq * 0.7 + seed) * 1.4 + seed) * 0.6 +
      Math.sin((x + z) * freq * 0.8 + seed * 2.0) * 0.4;
    pos.setXYZ(i, x + nor.getX(i) * w * amp, y + nor.getY(i) * w * amp, z + nor.getZ(i) * w * amp);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Tekstur gradien radial (untuk bayangan kontak / cahaya yang tumpah di lantai). */
export function radialTexture(inner = "rgba(0,0,0,0.7)", outer = "rgba(0,0,0,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
