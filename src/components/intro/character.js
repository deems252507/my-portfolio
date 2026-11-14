// Karakter programmer (prosedural, kualitas lebih tinggi): kulit soft-sheen, rambut berlapis,
// wajah (mata, alis, hidung, telinga, kacamata), headset, hoodie dengan lipatan kain (bump), tangan 2 ruas jari.
// Pose: duduk di kursi (z = 0.66), menghadap -Z (ke monitor). API sama dengan versi lama + field baru.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { std, mk, placeLimb } from "./rig";

function foldTexture(seed = 7) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 256);
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.lineCap = "round";
  for (let i = 0; i < 60; i++) {
    const x = r() * 256, y = r() * 256, len = 30 + r() * 90, ang = Math.PI / 2.3 + (r() - 0.5) * 0.9, w = 5 + r() * 10;
    const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len, nx = -Math.sin(ang) * w * 0.7, ny = Math.cos(ang) * w * 0.7;
    g.lineWidth = w; g.strokeStyle = "rgba(255,255,255,0.20)";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.22)";
    g.beginPath(); g.moveTo(x + nx, y + ny); g.lineTo(x + dx + nx, y + dy + ny); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

export function buildCharacter(scene, { mobile = false } = {}) {
  const bump = foldTexture(7);
  const skin = new THREE.MeshPhysicalMaterial({ color: "#c68e66", roughness: 0.52, sheen: 0.9, sheenRoughness: 0.45, sheenColor: new THREE.Color("#ff9d80"), clearcoat: 0.08, clearcoatRoughness: 0.6 });
  const hoodie = new THREE.MeshPhysicalMaterial({ color: "#2a3345", roughness: 0.93, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color("#6f86ad"), bumpMap: bump, bumpScale: 1.8 });
  const hoodieDark = hoodie.clone(); hoodieDark.color = new THREE.Color("#1d2534");
  const pants = new THREE.MeshStandardMaterial({ color: "#141923", roughness: 0.9, bumpMap: bump, bumpScale: 1.2 });
  const hairM = new THREE.MeshPhysicalMaterial({ color: "#17110f", roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.5, sheenColor: new THREE.Color("#6a5648") });
  const shoe = std("#0b0d12", { roughness: 0.5, metalness: 0.2 });
  const sole = std("#d7dde6", { roughness: 0.6 });
  const dark = std("#0a0d12", { roughness: 0.35, metalness: 0.6 });
  const cyanM = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const seg = mobile ? 12 : 20;

  const root = new THREE.Group();
  scene.add(root);

  /* ---- badan atas (pivot di pinggul) ---- */
  const upper = new THREE.Group();
  upper.position.set(0, 0.58, 0.62);
  root.add(upper);
  const torso = mk(new THREE.CapsuleGeometry(0.155, 0.28, 8, seg), hoodie, 0, 0.27, 0);
  torso.scale.set(1.2, 1, 0.8);
  upper.add(torso);
  const belly = mk(new THREE.CapsuleGeometry(0.14, 0.12, 6, seg), hoodie, 0, 0.07, 0.005);
  belly.scale.set(1.2, 1, 0.82);
  upper.add(belly);
  const hem = mk(new THREE.TorusGeometry(0.168, 0.016, 8, 28), hoodieDark, 0, -0.03, 0);
  hem.rotation.x = Math.PI / 2; hem.scale.set(1.15, 0.8, 1);
  upper.add(hem);
  const trap = mk(new THREE.CapsuleGeometry(0.06, 0.24, 6, 12), hoodie, 0, 0.5, 0.005);
  trap.rotation.z = Math.PI / 2;
  upper.add(trap);
  // tudung hoodie menumpuk di belakang leher (terlihat jelas dari belakang)
  const hood = mk(new THREE.SphereGeometry(0.11, 20, 14), hoodieDark, 0, 0.57, 0.07);
  hood.scale.set(1.35, 0.85, 0.95);
  upper.add(hood);
  const hoodRim = mk(new THREE.TorusGeometry(0.082, 0.026, 10, 24), hoodieDark, 0, 0.585, -0.03);
  hoodRim.rotation.x = Math.PI / 2;
  upper.add(hoodRim);
  [-1, 1].forEach((s) => { const cord = mk(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 6), sole, s * 0.03, 0.49, -0.125, false); cord.rotation.x = 0.1; upper.add(cord); });
  const neck = mk(new THREE.CylinderGeometry(0.043, 0.05, 0.12, 14), skin, 0, 0.63, -0.015);
  upper.add(neck);

  const shoulderL = new THREE.Vector3(-0.205, 0.45, 0);
  const shoulderR = new THREE.Vector3(0.205, 0.45, 0);
  [shoulderL, shoulderR].forEach((p) => upper.add(mk(new THREE.SphereGeometry(0.086, seg, 14), hoodie, p.x, p.y, p.z)));

  /* ---- kepala ---- */
  const head = new THREE.Group();
  head.position.set(0, 0.74, -0.03);
  upper.add(head);
  const skull = mk(new THREE.SphereGeometry(0.1, 32, 24), skin);
  skull.scale.set(0.93, 1.13, 1.0);
  head.add(skull);
  const jaw = mk(new THREE.SphereGeometry(0.082, 24, 16), skin, 0, -0.075, -0.02);
  jaw.scale.set(0.95, 0.85, 0.95);
  head.add(jaw);
  [-1, 1].forEach((s) => {
    head.add(mk(new THREE.SphereGeometry(0.034, 14, 10), skin, s * 0.055, -0.04, -0.07)); // pipi
    const ear = mk(new THREE.SphereGeometry(0.02, 12, 10), skin, s * 0.097, -0.005, 0.0); ear.scale.set(0.5, 1.05, 0.7); head.add(ear);
    const eye = mk(new THREE.SphereGeometry(0.0125, 14, 10), std("#f4f1ee", { roughness: 0.25 }), s * 0.037, 0.012, -0.089, false); eye.scale.set(1, 0.8, 0.6); head.add(eye);
    head.add(mk(new THREE.SphereGeometry(0.0072, 10, 8), std("#2a1a12", { roughness: 0.2 }), s * 0.037, 0.012, -0.0965, false));
    const brow = mk(new THREE.BoxGeometry(0.03, 0.0065, 0.008), hairM, s * 0.037, 0.04, -0.093, false); brow.rotation.z = -s * 0.16; head.add(brow);
    head.add(mk(new THREE.BoxGeometry(0.012, 0.03, 0.02), hairM, s * 0.089, -0.03, -0.045, false)); // cambang
  });
  const nose = mk(new THREE.SphereGeometry(0.0165, 12, 10), skin, 0, -0.028, -0.103, false); nose.scale.set(1, 1.15, 1.25); head.add(nose);
  head.add(mk(new THREE.CapsuleGeometry(0.008, 0.03, 4, 8), skin, 0, 0.0, -0.1, false));
  const mouth = mk(new THREE.BoxGeometry(0.03, 0.0045, 0.006), std("#8a3f3a", { roughness: 0.5 }), 0, -0.064, -0.093, false); head.add(mouth);

  // rambut: tutup kepala + helai
  const cap = mk(new THREE.SphereGeometry(0.108, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM, 0, 0.012, 0.01);
  cap.scale.set(0.98, 1.15, 1.05); cap.rotation.x = 0.35;
  head.add(cap);
  const tuft = new THREE.SphereGeometry(1, 8, 6);
  let seed = 3; const rr = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const clumps = mobile ? 26 : 48;
  const v = new THREE.Vector3();
  for (let i = 0; i < clumps; i++) {
    const phi = rr() * Math.PI * 2, th = rr() * Math.PI * 0.6;
    v.set(Math.sin(th) * Math.cos(phi), Math.cos(th), Math.sin(th) * Math.sin(phi));
    if (v.z < -0.25 && v.y < 0.75) v.z = -v.z; // jangan menutupi wajah
    const m = mk(tuft, hairM, v.x * 0.107 * 0.98, v.y * 0.107 * 1.15 + 0.012, v.z * 0.107 * 1.05 + 0.01, false);
    m.scale.set(0.03 + rr() * 0.012, 0.022 + rr() * 0.01, 0.05 + rr() * 0.02);
    m.lookAt(m.position.x * 2, m.position.y * 2, m.position.z * 2);
    m.rotateZ((rr() - 0.5) * 1.2);
    head.add(m);
  }
  for (let i = 0; i < 6; i++) { // poni
    const m = mk(tuft, hairM, -0.05 + i * 0.02, 0.088 - Math.abs(i - 2.5) * 0.004, -0.078, false);
    m.scale.set(0.022, 0.016, 0.034); m.rotation.set(0.5, (i - 2.5) * 0.12, 0);
    head.add(m);
  }
  const nape = mk(new THREE.SphereGeometry(0.1, 20, 14), hairM, 0, -0.025, 0.04, false);
  nape.scale.set(0.9, 1.0, 0.8);
  head.add(nape);

  // kacamata
  const lens = new THREE.MeshPhysicalMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.12, roughness: 0.05, clearcoat: 1, depthWrite: false });
  [-1, 1].forEach((s) => {
    const rim = mk(new THREE.TorusGeometry(0.027, 0.0028, 8, 24), dark, s * 0.037, 0.012, -0.108, false); head.add(rim);
    const gl = new THREE.Mesh(new THREE.CircleGeometry(0.026, 20), lens); gl.position.set(s * 0.037, 0.012, -0.108); gl.rotation.y = Math.PI; head.add(gl);
    const arm = mk(new THREE.CylinderGeometry(0.0022, 0.0022, 1, 6), dark, 0, 0, 0, false);
    placeLimb(arm, new THREE.Vector3(s * 0.064, 0.012, -0.104), new THREE.Vector3(s * 0.098, 0.012, -0.01)); head.add(arm);
  });
  head.add(mk(new THREE.BoxGeometry(0.014, 0.003, 0.003), dark, 0, 0.018, -0.11, false));

  // headset gaming
  const band = mk(new THREE.TorusGeometry(0.117, 0.006, 8, 36, Math.PI), dark, 0, 0.0, 0.005, false);
  band.scale.set(1, 1.1, 1);
  head.add(band);
  [-1, 1].forEach((s) => {
    const cup = mk(new THREE.CylinderGeometry(0.032, 0.032, 0.024, 20), dark, s * 0.117, -0.006, 0.0); cup.rotation.z = Math.PI / 2; head.add(cup);
    const ringG = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.002, 8, 24), cyanM); ringG.position.set(s * 0.13, -0.006, 0); ringG.rotation.y = Math.PI / 2; head.add(ringG);
  });

  /* ---- lengan (IK dihitung tiap frame di scene) ---- */
  const mkArm = () => ({
    upper: mk(new THREE.CylinderGeometry(0.057, 0.05, 1, 16), hoodie),
    fore: mk(new THREE.CylinderGeometry(0.05, 0.04, 1, 16), hoodie),
    elbow: mk(new THREE.SphereGeometry(0.054, 14, 12), hoodie),
    cuff: mk(new THREE.CylinderGeometry(0.043, 0.047, 0.035, 16), hoodieDark),
    elbowPos: new THREE.Vector3(),
  });
  const armL = mkArm(), armR = mkArm();
  [armL, armR].forEach((a) => root.add(a.upper, a.fore, a.elbow, a.cuff));

  /* ---- tangan: telapak + 4 jari (2 ruas) + ibu jari ---- */
  const mkHand = (side) => {
    const g = new THREE.Group();
    g.add(mk(new RoundedBoxGeometry(0.078, 0.022, 0.086, 3, 0.008), skin, 0, 0, 0.0));
    g.add(mk(new THREE.SphereGeometry(0.024, 12, 10), skin, side * 0.018, 0.004, 0.012));
    const finger = (x, l1, l2, r1) => {
      const pivot = new THREE.Group(); pivot.position.set(x, 0, -0.043);
      const c1 = new THREE.CylinderGeometry(r1, r1 * 0.9, l1, 8); c1.rotateX(Math.PI / 2);
      pivot.add(mk(c1, skin, 0, 0, -l1 / 2, false));
      const mid = new THREE.Group(); mid.position.set(0, 0, -l1); pivot.add(mid);
      const c2 = new THREE.CylinderGeometry(r1 * 0.9, r1 * 0.78, l2, 8); c2.rotateX(Math.PI / 2);
      mid.add(mk(c2, skin, 0, 0, -l2 / 2, false));
      mid.add(mk(new THREE.SphereGeometry(r1 * 0.78, 8, 6), skin, 0, 0, -l2, false));
      return { pivot, mid };
    };
    const fingers = [];
    [[-0.03, 0.03, 0.027, 0.0082], [-0.01, 0.036, 0.03, 0.0088], [0.01, 0.034, 0.029, 0.0086], [0.03, 0.027, 0.024, 0.0076]].forEach(([x, l1, l2, r1], i) => {
      const f = finger(x, l1, l2, r1);
      g.add(f.pivot);
      fingers.push({ ...f, phase: Math.random() * 6.28, speed: 9 + Math.random() * 7 + i });
    });
    const thumbPivot = new THREE.Group();
    thumbPivot.position.set(-side * 0.045, 0, -0.012);
    thumbPivot.rotation.y = side * 0.55;
    const tc = new THREE.CylinderGeometry(0.0098, 0.0085, 0.03, 8); tc.rotateX(Math.PI / 2);
    thumbPivot.add(mk(tc, skin, 0, 0, -0.015, false));
    const tc2 = new THREE.CylinderGeometry(0.0085, 0.0075, 0.026, 8); tc2.rotateX(Math.PI / 2);
    thumbPivot.add(mk(tc2, skin, 0, 0, -0.043, false));
    g.add(thumbPivot);
    root.add(g);
    return { group: g, fingers };
  };
  const handL = mkHand(-1), handR = mkHand(1);

  /* ---- kaki ---- */
  [-1, 1].forEach((s) => {
    const thigh = mk(new THREE.CylinderGeometry(0.086, 0.07, 1, 16), pants);
    const shin = mk(new THREE.CylinderGeometry(0.066, 0.05, 1, 16), pants);
    const knee = mk(new THREE.SphereGeometry(0.07, 14, 12), pants);
    const foot = mk(new RoundedBoxGeometry(0.1, 0.055, 0.27, 3, 0.022), shoe, s * 0.12, 0.045, 0.18);
    const sl = mk(new RoundedBoxGeometry(0.104, 0.018, 0.274, 2, 0.008), sole, s * 0.12, 0.012, 0.18);
    const hip = new THREE.Vector3(s * 0.11, 0.57, 0.64);
    const kneeP = new THREE.Vector3(s * 0.12, 0.6, 0.22);
    const ankle = new THREE.Vector3(s * 0.12, 0.1, 0.27);
    placeLimb(thigh, hip, kneeP);
    placeLimb(shin, kneeP, ankle);
    knee.position.copy(kneeP);
    root.add(thigh, shin, knee, foot, sl);
  });
  root.add(mk(new THREE.SphereGeometry(0.1, 16, 12), pants, 0, 0.57, 0.63));

  return { root, upper, head, torso, shoulderL, shoulderR, armL, armR, handL, handR };
}
