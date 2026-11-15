// Karakter programmer: proporsi lebih natural, hoodie berlipatan, rambut gerombol, headphone,
// tangan dengan jari dua ruas. Dibuat prosedural (tanpa unduhan). Bila public/models/developer.glb
// ada, model itu dipakai menggantikan (lihat workspaceScene.js).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mk, phys, std, placeLimb, wrinkle } from "./helpers";

export function buildCharacter(scene, { isMobile = false } = {}) {
  const skin = phys("#cf9770", { roughness: 0.56, sheen: 0.7, sheenColor: new THREE.Color("#ffb394"), sheenRoughness: 0.55, emissive: new THREE.Color("#3a1709"), emissiveIntensity: 0.22 });
  const skinDark = phys("#b27a54", { roughness: 0.62, emissive: new THREE.Color("#2a0f05"), emissiveIntensity: 0.2 });
  const hoodie = phys("#2a3242", { roughness: 0.95, sheen: 1, sheenColor: new THREE.Color("#6d8bb0"), sheenRoughness: 0.7 });
  const hoodieDark = phys("#1b212e", { roughness: 0.95, sheen: 0.8, sheenColor: new THREE.Color("#4a607d"), sheenRoughness: 0.7 });
  const pants = phys("#141a25", { roughness: 0.92, sheen: 0.5, sheenColor: new THREE.Color("#3b4d66"), sheenRoughness: 0.8 });
  const hairM = phys("#15110f", { roughness: 0.42, metalness: 0.05, sheen: 1, sheenColor: new THREE.Color("#4a5d80"), sheenRoughness: 0.35 });
  const shoe = std("#0e1118", { roughness: 0.55, metalness: 0.15 });
  const sole = std("#dfe6ee", { roughness: 0.6 });
  const phone = std("#0b0f16", { roughness: 0.4, metalness: 0.6 });
  const glowRing = new THREE.MeshStandardMaterial({ color: "#0a1a20", emissive: new THREE.Color("#22d3ee"), emissiveIntensity: 1.4, roughness: 0.4 });

  const root = new THREE.Group();
  scene.add(root);

  /* ---------------- badan atas (pivot di pinggul) ---------------- */
  const upper = new THREE.Group();
  upper.position.set(0, 0.58, 0.62);
  root.add(upper);

  const torsoGeo = wrinkle(new THREE.CapsuleGeometry(0.15, 0.3, 10, 28), 0.006, 22, 1.3);
  const torso = mk(torsoGeo, hoodie, 0, 0.27, 0);
  torso.scale.set(1.15, 1, 0.78);
  upper.add(torso);
  const hem = mk(new THREE.TorusGeometry(0.168, 0.016, 10, 40), hoodieDark, 0, 0.03, 0);
  hem.rotation.x = Math.PI / 2; hem.scale.set(1.15, 0.78, 1);
  upper.add(hem);
  // tudung hoodie menumpuk di tengkuk
  const hoodBack = mk(wrinkle(new THREE.SphereGeometry(0.1, 20, 14), 0.008, 18, 4.2), hoodieDark, 0, 0.53, 0.065);
  hoodBack.scale.set(1.2, 0.7, 0.8);
  upper.add(hoodBack);
  const hoodRing = mk(new THREE.TorusGeometry(0.095, 0.038, 12, 28), hoodieDark, 0, 0.555, -0.005);
  hoodRing.rotation.x = Math.PI / 2 - 0.18;
  upper.add(hoodRing);
  upper.add(mk(new THREE.CylinderGeometry(0.043, 0.05, 0.13, 16), skin, 0, 0.63, -0.015));

  const shoulderL = new THREE.Vector3(-0.2, 0.44, 0);
  const shoulderR = new THREE.Vector3(0.2, 0.44, 0);
  [shoulderL, shoulderR].forEach((p, i) => upper.add(mk(wrinkle(new THREE.SphereGeometry(0.082, 18, 14), 0.005, 20, i * 3), hoodie, p.x, p.y, p.z)));

  /* ---------------- kepala ---------------- */
  const head = new THREE.Group();
  head.position.set(0, 0.76, -0.03);
  upper.add(head);
  const skull = mk(new THREE.SphereGeometry(0.105, 32, 24), skin);
  skull.scale.set(0.93, 1.13, 1.0);
  head.add(skull);
  const jaw = mk(new THREE.SphereGeometry(0.086, 24, 16), skin, 0, -0.07, -0.014);
  jaw.scale.set(0.95, 0.86, 0.95);
  head.add(jaw);
  // telinga
  [-1, 1].forEach((s) => {
    const ear = mk(new THREE.SphereGeometry(0.022, 14, 12), skin, s * 0.097, -0.008, 0.002);
    ear.scale.set(0.45, 1.15, 0.85);
    head.add(ear);
    const inner = mk(new THREE.SphereGeometry(0.014, 10, 8), skinDark, s * 0.1, -0.008, -0.002);
    inner.scale.set(0.35, 1.0, 0.7);
    head.add(inner);
  });
  head.add(mk(new THREE.SphereGeometry(0.019, 12, 10), skin, 0, -0.03, -0.109)); // hidung
  [-1, 1].forEach((s) => {
    const eye = mk(new THREE.SphereGeometry(0.0125, 12, 10), std("#f2ede8", { roughness: 0.25 }), s * 0.036, 0.012, -0.097, false);
    eye.scale.set(1, 0.8, 0.55);
    head.add(eye);
    const iris = mk(new THREE.SphereGeometry(0.0072, 10, 8), std("#1a120d", { roughness: 0.2 }), s * 0.036, 0.012, -0.1015, false);
    iris.scale.set(1, 1, 0.4);
    head.add(iris);
    const brow = mk(new THREE.BoxGeometry(0.034, 0.006, 0.008), hairM, s * 0.036, 0.04, -0.097, false);
    brow.rotation.z = -s * 0.12;
    head.add(brow);
  });

  // rambut: kubah dasar + gerombolan helai (InstancedMesh)
  const dome = mk(new THREE.SphereGeometry(0.1105, 32, 22, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM, 0, 0.012, 0.012);
  dome.scale.set(0.97, 1.16, 1.04);
  dome.rotation.x = 0.4;
  head.add(dome);
  const nHair = isMobile ? 90 : 190;
  const hair = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), hairM, nHair);
  hair.castShadow = true;
  const R = [0.108 * 0.96, 0.108 * 1.16, 0.108 * 1.04];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3(), tv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let n = 0, tries = 0;
  while (n < nHair && tries < 6000) {
    tries++;
    const th = Math.random() * Math.PI * 2;
    const cphi = 1 - Math.random() * (1 - Math.cos(Math.PI * 0.68));
    const phi = Math.acos(cphi);
    const sp = Math.sin(phi);
    const d = [sp * Math.cos(th), cphi, sp * Math.sin(th)];
    if (d[2] < -0.35 && phi > Math.PI * 0.36) continue; // garis rambut di dahi
    if (Math.abs(d[0]) > 0.8 && d[1] < 0.05 && d[2] < 0.15) continue; // telinga terbuka
    pv.set(d[0] * R[0] * 1.02, d[1] * R[1] * 1.02 + 0.012, d[2] * R[2] * 1.02);
    tv.set(cphi * Math.cos(th), -sp, cphi * Math.sin(th)).normalize();
    tv.x += (Math.random() - 0.5) * 0.35; tv.z += 0.15 + (Math.random() - 0.5) * 0.3;
    tv.normalize();
    q.setFromUnitVectors(up, tv);
    sv.set(0.02 + Math.random() * 0.012, 0.055 + Math.random() * 0.035, 0.026 + Math.random() * 0.012);
    m4.compose(pv, q, sv);
    hair.setMatrixAt(n++, m4);
  }
  hair.count = n;
  head.add(hair);

  // headphone (terlihat jelas dari belakang)
  const band = mk(new THREE.TorusGeometry(0.128, 0.0085, 10, 40, Math.PI), phone, 0, 0.0, 0.0);
  band.scale.set(0.86, 0.98, 1);
  head.add(band);
  [-1, 1].forEach((s) => {
    const cup = mk(new THREE.CylinderGeometry(0.038, 0.038, 0.028, 22), phone, s * 0.112, -0.005, 0.0);
    cup.rotation.z = Math.PI / 2;
    head.add(cup);
    const ring = mk(new THREE.TorusGeometry(0.029, 0.004, 8, 28), glowRing, s * 0.127, -0.005, 0.0, false);
    ring.rotation.y = Math.PI / 2;
    head.add(ring);
  });

  /* ---------------- lengan (IK dihitung tiap frame) ---------------- */
  const mkArm = () => {
    const ug = wrinkle(new THREE.CylinderGeometry(0.054, 0.048, 1, 18, 10), 0.007, 16, 2.1);
    const fg = wrinkle(new THREE.CylinderGeometry(0.048, 0.04, 1, 18, 10), 0.006, 18, 5.3);
    const cg = new THREE.TorusGeometry(0.04, 0.013, 10, 22); cg.rotateX(Math.PI / 2);
    const arm = {
      upper: mk(ug, hoodie),
      fore: mk(fg, hoodie),
      elbow: mk(new THREE.SphereGeometry(0.052, 14, 12), hoodie),
      cuff: mk(cg, hoodieDark),
      elbowPos: new THREE.Vector3(),
    };
    root.add(arm.upper, arm.fore, arm.elbow, arm.cuff);
    return arm;
  };
  const armL = mkArm(), armR = mkArm();

  /* ---------------- tangan: telapak + jari dua ruas ---------------- */
  const seg = (len, r) => {
    const g = new THREE.CapsuleGeometry(r, len, 3, 8);
    g.rotateX(Math.PI / 2);
    return mk(g, skin, 0, 0, -(len / 2 + r), false);
  };
  const mkHand = (side) => {
    const g = new THREE.Group();
    g.add(mk(new RoundedBoxGeometry(0.08, 0.022, 0.082, 3, 0.009), skin, 0, 0, 0));
    const fingers = [];
    [-0.03, -0.01, 0.01, 0.03].forEach((x, i) => {
      const l1 = 0.03 + (i === 1 || i === 2 ? 0.006 : 0) - (i === 3 ? 0.005 : 0);
      const l2 = 0.022 + (i === 1 || i === 2 ? 0.005 : 0) - (i === 3 ? 0.004 : 0);
      const p1 = new THREE.Group(); p1.position.set(x, 0.002, -0.041);
      p1.add(seg(l1, 0.0088));
      const p2 = new THREE.Group(); p2.position.z = -(l1 + 0.0088);
      p2.add(seg(l2, 0.0078));
      p1.add(p2); g.add(p1);
      fingers.push({ p1, p2, hit: 0, phase: Math.random() * 6.28, speed: 9 + Math.random() * 7 + i });
    });
    const t1 = new THREE.Group(); t1.position.set(-side * 0.043, 0, -0.012); t1.rotation.y = side * 0.7;
    t1.add(seg(0.026, 0.0098));
    const t2 = new THREE.Group(); t2.position.z = -0.03; t2.add(seg(0.02, 0.0088));
    t1.add(t2); g.add(t1);
    root.add(g);
    return { group: g, fingers, thumb: { t1, t2 } };
  };
  const handL = mkHand(-1), handR = mkHand(1);

  /* ---------------- kaki & sepatu ---------------- */
  [-1, 1].forEach((s) => {
    const thigh = mk(wrinkle(new THREE.CylinderGeometry(0.085, 0.07, 1, 18, 10), 0.006, 14, s * 2), pants);
    const shin = mk(wrinkle(new THREE.CylinderGeometry(0.065, 0.05, 1, 16, 8), 0.005, 16, s * 4), pants);
    const knee = mk(new THREE.SphereGeometry(0.07, 14, 12), pants);
    const foot = mk(new RoundedBoxGeometry(0.1, 0.05, 0.27, 3, 0.02), shoe, s * 0.12, 0.05, 0.18);
    const soleM = mk(new RoundedBoxGeometry(0.104, 0.022, 0.28, 2, 0.01), sole, s * 0.12, 0.011, 0.18);
    const hip = new THREE.Vector3(s * 0.11, 0.57, 0.64);
    const kneeP = new THREE.Vector3(s * 0.12, 0.6, 0.22);
    const ankle = new THREE.Vector3(s * 0.12, 0.1, 0.27);
    placeLimb(thigh, hip, kneeP);
    placeLimb(shin, kneeP, ankle);
    knee.position.copy(kneeP);
    root.add(thigh, shin, knee, foot, soleM);
  });
  root.add(mk(new THREE.SphereGeometry(0.1, 16, 12), pants, 0, 0.57, 0.63));

  return { root, upper, head, torso, shoulderL, shoulderR, armL, armR, handL, handR };
}
