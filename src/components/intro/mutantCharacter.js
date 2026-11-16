// Karakter dari file FBX Mixamo (public/models/mutant.fbx) menggantikan karakter prosedural.
//
// File FBX-nya hanya berisi karakter + rig + animasi "Right Turn 45" (berdiri lalu menoleh), jadi
// animasi itu TIDAK dipakai. Rig-nya digerakkan langsung lewat kode agar:
//   - duduk di kursi menghadap monitor,
//   - lengan memakai IK (tangan menuju keyboard / mouse / ENTER, sama seperti karakter lama),
//   - jari mengetuk sesuai huruf yang diketik, kepala sedikit bergoyang.
// Semua "gerakan" masih dihitung oleh updateCharacter() di workspaceScene.js pada objek proxy
// (ch.handL/handR/upper/head); modul ini hanya menerjemahkannya ke tulang (ch.sync()).
// Jika file tidak ada / gagal dimuat, karakter prosedural lama tetap dipakai.
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { solveArm } from "./helpers";

const AX = new THREE.Vector3(1, 0, 0);
const AY = new THREE.Vector3(0, 1, 0);
const FWD = new THREE.Vector3(0, 0, -1); // karakter menghadap -Z (ke monitor)
const DOWN = new THREE.Vector3(0, -1, 0);
const _m = new THREE.Matrix4();

/** Kerangka orthonormal dari arah utama d dan petunjuk "atas" u -> quaternion. */
function frameQ(d, u, out) {
  const x = d.clone().normalize();
  const z = new THREE.Vector3().crossVectors(x, u);
  if (z.lengthSq() < 1e-8) z.crossVectors(x, Math.abs(x.y) < 0.9 ? AY : AX);
  z.normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  return out.setFromRotationMatrix(_m.makeBasis(x, y, z));
}

const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
const REQUIRED_BASE = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "HeadTop_End"];

export async function loadMutantCharacter(scene, ch, cfg = {}, shouldAbort = () => false) {
  const o = {
    url: "/models/mutant.fbx",
    height: 1.88,            // tinggi karakter berdiri (meter di scene)
    hips: [0, 0.65, 0.65],   // posisi tulang Hips saat duduk (x, y, z) di atas kursi
    lean: -0.09,             // condong ke depan (rad); negatif = ke arah monitor
    ...cfg,
  };

  const rig = await new FBXLoader().loadAsync(o.url);
  if (shouldAbort()) {
    rig.traverse((n) => { n.geometry?.dispose?.(); });
    return null;
  }

  /* ---------- kumpulkan tulang & mesh ---------- */
  const B = {};
  const meshes = [];
  rig.traverse((n) => {
    if (n.isBone) {
      // File ini punya tulang kembar bernama sama (anak "bayangan" tanpa offset di bawah tulang asli, dipakai
      // sebagian mesh). Yang digerakkan harus tulang ASLI (yang pertama ditemui; induk lebih dulu dari anak);
      // tulang kembar otomatis ikut karena menempel sebagai anak dengan transformasi identitas.
      const key = n.name.replace(/^mixamorig\d*:?/, "");
      if (!B[key]) B[key] = n;
    }
    if (n.isMesh || n.isSkinnedMesh) meshes.push(n);
  });
  const REQUIRED = [...REQUIRED_BASE];
  for (const side of ["Left", "Right"]) {
    for (const k of ["Shoulder", "Arm", "ForeArm", "Hand", "UpLeg", "Leg", "Foot", "ToeBase"]) REQUIRED.push(side + k);
    for (const f of FINGERS) for (let j = 1; j <= 4; j++) REQUIRED.push(`${side}Hand${f}${j}`);
  }
  const missing = REQUIRED.filter((k) => !B[k]);
  if (missing.length) throw new Error("Tulang tidak ditemukan di FBX: " + missing.slice(0, 5).join(", "));

  /* ---------- skala otomatis -> tinggi o.height, lalu hadap -Z ---------- */
  rig.updateMatrixWorld(true);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const H = Math.abs(B.HeadTop_End.getWorldPosition(_a).y - B.LeftToeBase.getWorldPosition(_b).y) || 1;
  const s = o.height / H;
  rig.scale.setScalar(s);
  rig.rotation.set(0, Math.PI, 0); // model Mixamo menghadap +Z; scene menghadap -Z
  rig.position.set(0, 0, 0);
  scene.add(rig);
  rig.updateMatrixWorld(true);

  /* ---------- material: Phong bawaan FBXLoader -> Standard (ikut pencahayaan scene) ---------- */
  meshes.forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false; // mesh berskin: bounding box tidak ikut tulang
    const conv = (src) => {
      const isHair = /hair|lash|beard/i.test(m.name) || /hair/i.test(src.name || "");
      const mat = new THREE.MeshStandardMaterial({
        name: src.name,
        color: src.map ? (/hoodie|pants/i.test(m.name) ? 0xc9ced8 : 0xffffff) : src.color || 0xffffff, // pakaian putih diredam agar tidak 'terbakar' oleh lampu
        map: src.map || null,
        normalMap: isHair ? null : src.normalMap || null, // "Bump" milik rambut adalah gambar normal: dibuang
        roughness: isHair ? 0.55 : 0.78,
        metalness: 0,
        side: isHair ? THREE.DoubleSide : THREE.FrontSide,
      });
      if (mat.normalMap) mat.normalScale.set(0.8, 0.8);
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.anisotropy = 4;
        mat.emissiveMap = mat.map;                 // sedikit cahaya sendiri: tidak gelap total di ruangan biru
        mat.emissive.set(0xffffff);
        mat.emissiveIntensity = 0.08;
      }
      if (isHair) { mat.alphaTest = 0.45; mat.transparent = false; } // alpha dari tekstur diffuse (RGBA)
      return mat;
    };
    m.material = Array.isArray(m.material) ? m.material.map(conv) : conv(m.material);
  });

  /* ---------- data posisi/orientasi awal (T-pose) di koordinat dunia scene ---------- */
  const R = {};
  Object.entries(B).forEach(([k, b]) => {
    R[k] = { p: b.getWorldPosition(new THREE.Vector3()), q: b.getWorldQuaternion(new THREE.Quaternion()), lq: b.quaternion.clone() };
  });
  const dirOf = (a, b) => new THREE.Vector3().subVectors(R[b].p, R[a].p).normalize();
  const lenOf = (a, b) => R[a].p.distanceTo(R[b].p);

  const arm = {};
  for (const side of ["Left", "Right"]) {
    const upDir = dirOf(side + "Arm", side + "ForeArm");
    arm[side] = {
      l1: lenOf(side + "Arm", side + "ForeArm"),
      l2: lenOf(side + "ForeArm", side + "Hand"),
      dirU: upDir,
      dirF: dirOf(side + "ForeArm", side + "Hand"),
      // sumbu tekuk siku saat T-pose (menekuk lengan bawah ke depan)
      hinge: new THREE.Vector3().crossVectors(upDir, FWD).normalize(),
      handDir: dirOf(side + "Hand", side + "HandMiddle1"),
      sgn: side === "Left" ? -1 : 1, // Left Mixamo = sisi -X di scene (karakter menghadap -Z)
    };
  }
  const leg = {};
  for (const side of ["Left", "Right"]) {
    leg[side] = {
      lt: lenOf(side + "UpLeg", side + "Leg"),
      ls: lenOf(side + "Leg", side + "Foot"),
      dirT: dirOf(side + "UpLeg", side + "Leg"),
      dirS: dirOf(side + "Leg", side + "Foot"),
      sgn: side === "Left" ? -1 : 1,
    };
  }
  // sumbu lengkung jari (di ruang lokal tiap ruas): ujung jari bergerak ke arah telapak (menghadap bawah)
  const fin = {};
  for (const side of ["Left", "Right"]) {
    for (const f of FINGERS) {
      fin[side + f] = [1, 2, 3].map((j) => {
        const k = `${side}Hand${f}${j}`, nx = `${side}Hand${f}${j + 1}`;
        const d = dirOf(k, nx);
        const axisW = new THREE.Vector3().crossVectors(d, DOWN).normalize();
        const axisLocal = axisW.applyQuaternion(R[k].q.clone().invert());
        return { bone: B[k], lq: R[k].lq, axisLocal };
      });
    }
  }

  /* ---------- fungsi bantu pose ---------- */
  const _pq = new THREE.Quaternion();
  const setWorldQ = (bone, q) => {
    bone.parent.getWorldQuaternion(_pq);
    bone.quaternion.copy(_pq.invert().multiply(q));
    bone.updateMatrixWorld(true);
  };
  const Qr = new THREE.Quaternion(), Qt = new THREE.Quaternion(), Qn = new THREE.Quaternion();
  /** Putar tulang agar sumbu (restD, restU) di T-pose menjadi (tgtD, tgtU) di dunia. */
  const aim = (name, restD, restU, tgtD, tgtU) => {
    frameQ(restD, restU, Qr);
    frameQ(tgtD, tgtU, Qt);
    Qn.copy(Qt).multiply(Qr.invert()).multiply(R[name].q);
    setWorldQ(B[name], Qn);
  };

  const hipsT = new THREE.Vector3(...o.hips);
  const _tmp = new THREE.Vector3();
  const S = new THREE.Vector3(), E = new THREE.Vector3(), Wr = new THREE.Vector3(), Wc = new THREE.Vector3();
  const U = new THREE.Vector3(), F = new THREE.Vector3(), hinge = new THREE.Vector3(), pole = new THREE.Vector3();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qh = new THREE.Quaternion();
  const nT = new THREE.Vector3(), dT = new THREE.Vector3();

  const doArm = (side, hand) => {
    const A = arm[side];
    B[side + "Arm"].getWorldPosition(S);
    const g = hand.group.position;
    Wr.set(g.x, g.y + 0.018, g.z + 0.08); // pergelangan = pusat telapak + offset ke arah siku
    pole.set(A.sgn * 0.7, -0.75, 0.25);
    solveArm(S, Wr, A.l1, A.l2, pole, E);
    Wc.subVectors(Wr, S);
    Wc.setLength(Math.min(Wc.length(), A.l1 + A.l2 - 0.002)).add(S);
    U.subVectors(E, S).normalize();
    F.subVectors(Wc, E).normalize();
    hinge.crossVectors(U, F);
    if (hinge.lengthSq() < 1e-6) hinge.copy(A.hinge);
    hinge.normalize();
    aim(side + "Arm", A.dirU, A.hinge, U, hinge);
    aim(side + "ForeArm", A.dirF, A.hinge, F, hinge);

    // telapak: jari ke depan, telapak menghadap bawah, ditambah rotasi proxy (miring kecil dari animasi)
    qh.setFromEuler(hand.group.rotation);
    dT.copy(FWD).applyQuaternion(qh);
    nT.copy(DOWN).applyQuaternion(qh);
    frameQ(A.handDir, DOWN, Qr);
    frameQ(dT, nT, Qt);
    Qn.copy(Qt).multiply(Qr.invert()).multiply(R[side + "Hand"].q);
    setWorldQ(B[side + "Hand"], Qn);

    // jari: sudut dari proxy (c1,c2) diperbesar agar ketukan terlihat jelas
    const names = side === "Left" ? ["Pinky", "Ring", "Middle", "Index"] : ["Index", "Middle", "Ring", "Pinky"];
    hand.fingers.forEach((pf, i) => {
      const c1 = 0.25 + (-pf.p1.rotation.x - 0.2) * 2.2;
      const c2 = 0.3 + (-pf.p2.rotation.x - 0.26) * 2.2;
      const ang = [c1, c2, c2 * 0.65];
      fin[side + names[i]].forEach((fb, j) => {
        fb.bone.quaternion.copy(fb.lq).multiply(qa.setFromAxisAngle(fb.axisLocal, ang[j]));
      });
    });
    // ibu jari: sedikit menekuk ke dalam
    fin[side + "Thumb"].forEach((fb, j) => {
      fb.bone.quaternion.copy(fb.lq).multiply(qa.setFromAxisAngle(fb.axisLocal, [0.12, 0.18, 0.12][j]));
    });
    B[side + "Hand"].updateMatrixWorld(true);
  };

  const doLeg = (side) => {
    const L = leg[side];
    B[side + "UpLeg"].getWorldPosition(S);
    dT.set(L.sgn * 0.05, -0.17, -1).normalize();        // paha mendatar ke depan, sedikit turun
    aim(side + "UpLeg", L.dirT, FWD, dT, AY);
    dT.set(0, -1, 0.12).normalize();                        // betis ke bawah, sedikit ke belakang
    aim(side + "Leg", L.dirS, FWD, dT, FWD);
    setWorldQ(B[side + "Foot"], R[side + "Foot"].q);      // telapak sepatu rata di lantai
  };

  /** Dipanggil tiap frame oleh updateCharacter() setelah proxy (upper/head/hand) diperbarui. */
  ch.sync = () => {
    // pinggul diletakkan di kursi
    _tmp.copy(hipsT);
    B.Hips.parent.updateWorldMatrix(true, false);
    B.Hips.position.copy(B.Hips.parent.worldToLocal(_tmp));
    B.Hips.updateMatrixWorld(true);

    // punggung condong ke depan (+ goyangan halus dari proxy ch.upper)
    const lean = o.lean + (ch.upper.rotation.x - 0.07);
    ["Spine", "Spine1", "Spine2"].forEach((k, i) => {
      qa.setFromAxisAngle(AX, (lean * (i + 1)) / 3);
      setWorldQ(B[k], qb.copy(qa).multiply(R[k].q));
    });

    // leher & kepala (absolut): melihat ke monitor, mengikuti gerak proxy ch.head
    const hp = ch.head.rotation.x, hy = ch.head.rotation.y;
    qa.setFromAxisAngle(AX, 0.5 * (lean + hp));
    setWorldQ(B.Neck, qb.copy(qa).multiply(R.Neck.q));
    qa.setFromAxisAngle(AY, hy);
    qb.setFromAxisAngle(AX, hp);
    qa.multiply(qb).multiply(R.Head.q);
    setWorldQ(B.Head, qa);

    doArm("Left", ch.handL);
    doArm("Right", ch.handR);
    doLeg("Left");
    doLeg("Right");
  };

  ch.root.visible = false; // sembunyikan karakter prosedural lama
  ch.mutant = rig;
  ch.sync();
  return rig;
}
