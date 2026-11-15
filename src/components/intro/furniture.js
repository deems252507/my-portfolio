// Perabot: meja, monitor lengkung, keyboard (dengan tombol ENTER nyata), kursi, properti.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { std, mk, placeLimb, bendX } from "./helpers";

export const SCREEN = { w: 1.2, h: 0.55, cx: 0, cy: 1.2, cz: -0.2 };

/* --------------------------------- kursi --------------------------------- */
export function buildChair(scene) {
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
export function buildDesk(scene, cyan) {
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
export function buildMonitor(scene, screenTexture) {
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

  const gg = new THREE.PlaneGeometry(SCREEN.w, SCREEN.h, 48, 1);
  bendX(gg, R);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, roughness: 0.04, metalness: 0, envMapIntensity: 4, depthWrite: false });
  const glass = new THREE.Mesh(gg, glassMat);
  glass.position.set(SCREEN.cx, SCREEN.cy, SCREEN.cz + 0.004);
  glass.renderOrder = 6;
  scene.add(glass);
  scene.add(mk(new THREE.BoxGeometry(0.06, 0.2, 0.03), bodyMat, 0, 0.86, SCREEN.cz - 0.12));
  scene.add(mk(new RoundedBoxGeometry(0.46, 0.014, 0.22, 3, 0.006), bodyMat, 0, 0.757, SCREEN.cz - 0.06));
  return { screen, glass };
}

/* ----------------------- keyboard, mouse, dekorasi ----------------------- */
export function buildKeyboard(scene) {
  const base = mk(new RoundedBoxGeometry(0.46, 0.018, 0.16, 3, 0.006), std("#07090d", { roughness: 0.4, metalness: 0.5 }), 0, 0.759, 0.12);
  scene.add(base);
  const rgbMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
  const rgb = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.135), rgbMat);
  rgb.rotation.x = -Math.PI / 2;
  rgb.position.set(0, 0.7695, 0.12);
  scene.add(rgb);

  const rows = 5, cols = 15;
  const keyGeo = new RoundedBoxGeometry(0.0235, 0.011, 0.0235, 2, 0.004);
  const keys = new THREE.InstancedMesh(keyGeo, std("#10151d", { roughness: 0.5 }), rows * cols);
  keys.castShadow = true;
  const dummy = new THREE.Object3D();
  const rest = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 0.0275;
      const z = 0.12 + (r - (rows - 1) / 2) * 0.0265;
      rest.push([x, 0.7755, z]);
      dummy.position.set(x, 0.7755, z);
      dummy.updateMatrix();
      keys.setMatrixAt(r * cols + c, dummy.matrix);
    }
  }
  // tombol ENTER besar (menggantikan dua tombol terakhir baris tengah)
  const ENTER_Y = 0.7755, ENTER_X = (13.5 - (cols - 1) / 2) * 0.0275, ENTER_Z = 0.12;
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  const dead = [2 * cols + 13, 2 * cols + 14];
  dead.forEach((i) => keys.setMatrixAt(i, hide));
  const live = [];
  for (let i = 0; i < rows * cols; i++) if (!dead.includes(i)) live.push(i);
  const enterMat = std("#10151d", { roughness: 0.5, emissive: new THREE.Color("#22d3ee"), emissiveIntensity: 0.0 });
  const enter = mk(new RoundedBoxGeometry(0.052, 0.011, 0.0235, 2, 0.004), enterMat, ENTER_X, ENTER_Y, ENTER_Z);
  scene.add(enter);
  const lc = document.createElement("canvas"); lc.width = 128; lc.height = 64;
  const lg = lc.getContext("2d");
  lg.fillStyle = "#7ef0ff"; lg.font = "700 34px sans-serif"; lg.textAlign = "center"; lg.textBaseline = "middle";
  lg.fillText("ENTER", 64, 34);
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.044, 0.0185), new THREE.MeshBasicMaterial({ map: lt, transparent: true }));
  label.rotation.x = -Math.PI / 2; label.position.y = 0.0058;
  enter.add(label);
  scene.add(keys);

  // mouse + alas
  const pad = mk(new THREE.BoxGeometry(0.26, 0.004, 0.2), std("#0b0f16", { roughness: 0.9 }), 0.47, 0.747, 0.12);
  scene.add(pad);
  const mouse = mk(new THREE.SphereGeometry(0.03, 16, 12), std("#0a0d13", { roughness: 0.35, metalness: 0.4 }), 0.47, 0.76, 0.13);
  mouse.scale.set(0.9, 0.55, 1.5);
  scene.add(mouse);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.035), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  strip.position.set(0.47, 0.777, 0.115);
  scene.add(strip);
  return { keys, rest, dummy, rgbMat, cols, rows, live, enter, enterMat, enterPos: [ENTER_X, ENTER_Y, ENTER_Z], mouse, strip, pressed: new Float32Array(rows * cols) };
}

export function buildProps(scene, cyan) {
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

