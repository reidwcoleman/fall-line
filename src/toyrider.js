// The riders' own figure, built to Cork7's: one smooth skinned mesh in flat colour. A long
// straight shell down past the seat with a funnel collar and the hood lying on the back, dropped
// shoulders and slim sleeves, black gloves, straight baggy pants over the boots, a big head with
// a long face under the helmet, and Cork7's shorter legs. It comes out as a "kit" in the same
// shape the scanned bodies load as (avatar.js): the same bone names, its own rest pose and limb
// lengths, so AvatarRig poses it and the gear sits on it. The figure itself is modelled in
// Blender (blender/rider.py); the loft here is only what's drawn if that file doesn't arrive.

// the head (and the helmet on it) grown from the head bone: blender/rider.py HS must match
export const HEAD_SCALE = 1.15;
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadGLB, plainGeometry } from './models.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// the rest pose (an A-pose, facing +z, +x the rider's left), the bones and their parents:
// blender/rider.py BONES must match
const BONES = [
  ['Bip01', V(0, 0.82, 0), -1],
  ['Bip01_Pelvis', V(0, 0.82, 0), 'Bip01'],
  ['Bip01_Spine', V(0, 0.93, 0), 'Bip01_Pelvis'],
  ['Bip01_L_Thigh', V(0.09, 0.82, 0), 'Bip01_Spine'],
  ['Bip01_L_Calf', V(0.104, 0.46, 0.012), 'Bip01_L_Thigh'],
  ['Bip01_L_Foot', V(0.112, 0.1, -0.012), 'Bip01_L_Calf'],
  ['Bip01_R_Thigh', V(-0.09, 0.82, 0), 'Bip01_Spine'],
  ['Bip01_R_Calf', V(-0.104, 0.46, 0.012), 'Bip01_R_Thigh'],
  ['Bip01_R_Foot', V(-0.112, 0.1, -0.012), 'Bip01_R_Calf'],
  ['Bip01_Spine1', V(0, 1.04, 0), 'Bip01_Spine'],
  ['Bip01_Spine2', V(0, 1.15, -0.01), 'Bip01_Spine1'],
  ['Bip01_Neck', V(0, 1.36, -0.012), 'Bip01_Spine2'],
  ['Bip01_Head', V(0, 1.458, 0.008), 'Bip01_Neck'],
  ['Bip01_L_Clavicle', V(0.075, 1.29, -0.024), 'Bip01_Neck'],
  ['Bip01_L_UpperArm', V(0.235, 1.225, -0.025), 'Bip01_L_Clavicle'],
  ['Bip01_L_Forearm', V(0.458, 1.01, -0.02), 'Bip01_L_UpperArm'],
  ['Bip01_L_Hand', V(0.642, 0.812, 0.083), 'Bip01_L_Forearm'],
  ['Bip01_R_Clavicle', V(-0.075, 1.29, -0.024), 'Bip01_Neck'],
  ['Bip01_R_UpperArm', V(-0.235, 1.225, -0.025), 'Bip01_R_Clavicle'],
  ['Bip01_R_Forearm', V(-0.458, 1.01, -0.02), 'Bip01_R_UpperArm'],
  ['Bip01_R_Hand', V(-0.642, 0.812, 0.083), 'Bip01_R_Forearm'],
];
// the chest band (Cork7's starter shell), as heights on the body: it runs round the sleeves too,
// by the distance down the arm from the shoulder
const BAND = [0.96, 1.125];

// a ring of the loft: centre, its two axes (u x v points on along the tube), radii, roundness
// (2 an ellipse, higher squarer), the bones it follows, and the body part (avatar.js partOf)
function ring(c, t, side, a, b, w, part, p = 2) {
  const tt = t.clone().normalize();
  const u = side.clone().addScaledVector(tt, -side.dot(tt)).normalize();
  const v = new THREE.Vector3().crossVectors(tt, u);
  return { c, u, v, a, b, w, part, p };
}

const SEG = 20;
// a closed tube through the rings, capped at either end (cap: how far the cap domes out)
function tube(rings, I, capA = 0.4, capB = 0.4, seg = SEG) {
  const pos = [], wts = [], part = [], idx = [];
  const addV = (p, w, pt) => { pos.push(p.x, p.y, p.z); wts.push(w); part.push(pt); return pos.length / 3 - 1; };
  const base = [];
  for (const r of rings) {
    base.push(pos.length / 3);
    for (let k = 0; k < seg; k++) {
      const th = (k / seg) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
      const e = 2 / r.p;
      const x = Math.sign(cs) * Math.abs(cs) ** e, y = Math.sign(sn) * Math.abs(sn) ** e;
      const p = r.c.clone().addScaledVector(r.u, r.a * x).addScaledVector(r.v, r.b * y);
      addV(p, typeof r.w === 'function' ? r.w(p) : r.w, r.part);
    }
  }
  for (let i = 0; i + 1 < rings.length; i++) for (let k = 0; k < seg; k++) {
    const a = base[i] + k, b = base[i] + ((k + 1) % seg), c = base[i + 1] + k, d = base[i + 1] + ((k + 1) % seg);
    idx.push(a, b, c, b, d, c);
  }
  const cap = (r, b0, out, dome) => {
    const t = new THREE.Vector3().crossVectors(r.u, r.v).multiplyScalar(out);
    const ctr = addV(r.c.clone().addScaledVector(t, Math.min(r.a, r.b) * dome), typeof r.w === 'function' ? r.w(r.c) : r.w, r.part);
    for (let k = 0; k < seg; k++) {
      const k1 = b0 + ((k + 1) % seg), k0 = b0 + k;
      if (out > 0) idx.push(ctr, k0, k1); else idx.push(ctr, k1, k0);
    }
  };
  if (capA != null) cap(rings[0], base[0], -1, capA);
  if (capB != null) cap(rings[rings.length - 1], base[rings.length - 1], 1, capB);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // skinning: the four strongest bones, normalised
  const n = pos.length / 3, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const w = Object.entries(wts[i]).map(([k, v]) => [I(k), v]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = w.reduce((s, [, v]) => s + v, 0) || 1;
    w.forEach(([b, v], c) => { si[i * 4 + c] = b; sw[i * 4 + c] = v / tot; });
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setAttribute('aPart', new THREE.BufferAttribute(Float32Array.from(part), 1));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

// an ellipsoid as a tube of rings up its axis
function blob(c, rx, ry, rz, w, part, n = 9, axis = V(0, 1, 0), side = V(1, 0, 0), I) {
  const rings = [];
  for (let i = 1; i < n; i++) {
    const t = -Math.cos((i / n) * Math.PI), r = Math.sqrt(1 - t * t);
    const along = axis.clone().normalize();
    rings.push(ring(c.clone().addScaledVector(along, t * ry), along, side, rx * r, rz * r, w, part));
  }
  return tube(rings, I, 0.9, 0.9);
}

const lerpW = (a, b, t) => {
  const o = {};
  for (const k in a) o[k] = (o[k] ?? 0) + a[k] * (1 - t);
  for (const k in b) o[k] = (o[k] ?? 0) + b[k] * t;
  return o;
};

let KIT = null;
export function toyKit() {
  if (KIT) return KIT;
  const names = BONES.map((b) => b[0]);
  const I = (n) => names.indexOf(n);
  const bindP = BONES.map((b) => b[1].clone());
  const parents = BONES.map((b) => (b[2] === -1 ? -1 : I(b[2])));
  // every bone sits square to the world at rest, bar the hands: their x runs out along the
  // fingers (that's where the rig finds the palms)
  const bindQ = names.map((n, i) => {
    const q = new THREE.Quaternion();
    if (/_Hand$/.test(n)) q.setFromUnitVectors(V(1, 0, 0), bindP[i].clone().sub(bindP[parents[i]]).normalize());
    return q;
  });
  const local = names.map((n, i) => {
    const p = parents[i];
    if (p < 0) return { p: bindP[i].clone(), q: bindQ[i].clone() };
    const pq = bindQ[p].clone().invert();
    return { p: bindP[i].clone().sub(bindP[p]).applyQuaternion(pq), q: pq.multiply(bindQ[i]) };
  });
  const boneInverses = names.map((n, i) => new THREE.Matrix4().compose(bindP[i], bindQ[i], V(1, 1, 1)).invert());
  const P = (n) => bindP[I(n)];
  const geos = [];
  const UP = V(0, 1, 0), X = V(1, 0, 0);

  // the shell: hem to collar up the spine. Which bones by height: pelvis, the spine's three, the neck
  const SP = [['Bip01_Pelvis', 0.82], ['Bip01_Spine', 0.93], ['Bip01_Spine1', 1.04], ['Bip01_Spine2', 1.15], ['Bip01_Neck', 1.36]];
  const spineW = (y) => {
    if (y <= SP[0][1]) return { [SP[0][0]]: 1 };
    for (let i = 0; i + 1 < SP.length; i++) if (y <= SP[i + 1][1]) { const t = (y - SP[i][1]) / (SP[i + 1][1] - SP[i][1]); return { [SP[i][0]]: 1 - t, [SP[i + 1][0]]: t }; }
    return { Bip01_Neck: 1 };
  };
  // (below the hips the shell rides with the thighs a little, so a knee lifted into a grab
  // doesn't come through it: the front more than the back, each side with its own leg)
  const shellW = (y) => (p) => {
    const k = Math.max(0, Math.min(1, (0.82 - y) / 0.12)) * 0.6;
    const kk = k * (0.5 + 0.5 * Math.min(1, Math.max(0, (p.z + 0.12) / 0.26)));
    const l = 0.5 + 0.5 * Math.max(-1, Math.min(1, p.x / 0.1));
    return { ...Object.fromEntries(Object.entries(spineW(y)).map(([b, v]) => [b, v * (1 - kk)])), Bip01_L_Thigh: kk * l, Bip01_R_Thigh: kk * (1 - l) };
  };
  //            y      half width  half depth  z      squareness
  const SHELL = [[0.7, 0.214, 0.162, -0.008, 2.5], [0.735, 0.212, 0.162, -0.01, 2.6], [0.8, 0.208, 0.16, -0.012, 2.6], [0.9, 0.204, 0.156, -0.012, 2.6],
    [1.0, 0.202, 0.157, -0.01, 2.6], [1.1, 0.203, 0.158, -0.01, 2.5], [1.18, 0.2, 0.155, -0.012, 2.4], [1.235, 0.196, 0.149, -0.015, 2.4],
    [1.28, 0.185, 0.14, -0.018, 2.4], [1.31, 0.162, 0.128, -0.02, 2.3], [1.335, 0.126, 0.112, -0.02, 2.1], [1.355, 0.103, 0.1, -0.016, 2.0],
    [1.38, 0.1, 0.098, -0.008, 2.0], [1.41, 0.102, 0.1, -0.002, 2.0], [1.435, 0.104, 0.102, 0.002, 2.0]];
  geos.push(tube(SHELL.map(([y, a, b, z, p]) => ring(V(0, y, z), UP, X, a, b, y < 0.9 ? shellW(y) : spineW(y), 2, p)), I, 0.05, -0.6));
  // the hood, lying flat on the upper back
  geos.push(blob(V(0, 1.32, -0.15), 0.14, 0.095, 0.04, { Bip01_Spine2: 0.6, Bip01_Neck: 0.4 }, 2, 9, UP, X, I));

  for (const s of [1, -1]) {
    const S = s > 0 ? 'L' : 'R', B = (n) => `Bip01_${S}_${n}`;
    // pants: one wide straight tube from the hip to the boot, the hem stacked over it
    const H = P(B('Thigh')).clone().add(V(0, 0.06, 0)), K = P(B('Calf')), A = P(B('Foot'));
    const out = (t) => V(s * 0.014 * Math.min(1, t), 0, 0);
    const leg = [];
    const TH = [[0, 0.11, 0.108, { Bip01_Pelvis: 0.5, [B('Thigh')]: 0.5 }], [0.18, 0.106, 0.11, { Bip01_Pelvis: 0.15, [B('Thigh')]: 0.85 }], [0.4, 0.098, 0.115, { [B('Thigh')]: 1 }],
      [0.65, 0.095, 0.124, { [B('Thigh')]: 1 }], [0.88, 0.094, 0.12, { [B('Thigh')]: 0.8, [B('Calf')]: 0.2 }], [1.0, 0.094, 0.118, { [B('Thigh')]: 0.5, [B('Calf')]: 0.5 }]];
    for (const [t, a, b, w] of TH) leg.push(ring(H.clone().lerp(K, t).add(out(t)), K.clone().sub(H), X, a, b, w, 6));
    const SH = [[0.12, 0.094, 0.116, { [B('Thigh')]: 0.25, [B('Calf')]: 0.75 }], [0.35, 0.093, 0.112, { [B('Calf')]: 1 }], [0.6, 0.094, 0.11, { [B('Calf')]: 1 }],
      [0.8, 0.096, 0.112, { [B('Calf')]: 1 }], [0.92, 0.098, 0.114, { [B('Calf')]: 1 }], [1.0, 0.099, 0.115, { [B('Calf')]: 1 }], [1.1, 0.098, 0.114, { [B('Calf')]: 1 }],
      [1.15, 0.095, 0.11, { [B('Calf')]: 1 }]];
    for (const [t, a, b, w] of SH) leg.push(ring(K.clone().lerp(A, t).add(out(1)).add(V(0, 0, 0.012 * Math.sin(Math.min(1, t) * Math.PI))), A.clone().sub(K), X, a, b, w, 7));
    geos.push(tube(leg, I, 0.3, -0.04));

    // the sleeve: set into the dropped shoulder, slim and straight to the cuff over the glove
    const C0 = V(s * 0.15, 1.245, -0.024), Sh = P(B('UpperArm')), E = P(B('Forearm')), W = P(B('Hand'));
    const side = V(0, 0, 1);
    const arm = [
      ring(C0, Sh.clone().sub(C0), side, 0.07, 0.074, { Bip01_Spine2: 0.7, [B('UpperArm')]: 0.3 }, 3),
      ring(Sh.clone(), E.clone().sub(Sh), side, 0.068, 0.073, { Bip01_Spine2: 0.2, [B('UpperArm')]: 0.8 }, 3),
      ring(Sh.clone().lerp(E, 0.5), E.clone().sub(Sh), side, 0.063, 0.069, { [B('UpperArm')]: 1 }, 3),
      ring(E.clone(), W.clone().sub(Sh), side, 0.062, 0.066, { [B('UpperArm')]: 0.5, [B('Forearm')]: 0.5 }, 4),
      ring(E.clone().lerp(W, 0.5), W.clone().sub(E), side, 0.061, 0.064, { [B('Forearm')]: 1 }, 4),
      ring(E.clone().lerp(W, 0.9), W.clone().sub(E), side, 0.06, 0.062, { [B('Forearm')]: 0.85, [B('Hand')]: 0.15 }, 4),
    ];
    geos.push(tube(arm, I, 0.3, -0.35));
    // the glove: a gauntlet over the cuff, a flat paddle, the thumb on the inside
    const d = W.clone().sub(E).normalize(), flat = new THREE.Vector3().crossVectors(d, V(0, 0, 1)).normalize();
    const glove = [];
    for (const [t, a, b, wh] of [[-0.07, 0.058, 0.058, 0.3], [-0.04, 0.06, 0.059, 0.5], [-0.012, 0.052, 0.046, 0.8], [0.025, 0.053, 0.04, 1], [0.065, 0.054, 0.037, 1], [0.1, 0.05, 0.034, 1], [0.125, 0.038, 0.027, 1]])
      glove.push(ring(W.clone().addScaledVector(d, t), d, V(0, 0, 1), a, b, { [B('Hand')]: wh, [B('Forearm')]: 1 - wh }, 5));
    geos.push(tube(glove, I, 0.4, 0.7));
    const thumb = W.clone().addScaledVector(d, 0.035).addScaledVector(V(0, 0, 1), 0.04);
    geos.push(blob(thumb, 0.02, 0.04, 0.02, { [B('Hand')]: 1 }, 5, 6, d.clone().add(V(0, 0, 0.8)), flat, I));
  }

  // neck and head
  geos.push(tube([
    ring(V(0, 1.34, -0.014), UP, X, 0.052, 0.054, { Bip01_Spine2: 0.3, Bip01_Neck: 0.7 }, 1),
    ring(V(0, 1.41, -0.006), UP, X, 0.05, 0.052, { Bip01_Neck: 0.7, Bip01_Head: 0.3 }, 1),
    ring(V(0, 1.47, 0.002), UP, X, 0.052, 0.054, { Bip01_Head: 1 }, 1),
  ], I, 0.2, 0.2));
  const hb = P('Bip01_Head'), HC = hb.clone().add(V(0, 0.082, 0.018)), HW = { Bip01_Head: 1 };
  const head = [blob(HC, 0.09, 0.114, 0.104, HW, 0, 12, UP, X, I), blob(HC.clone().add(V(0, -0.05, 0.022)), 0.068, 0.06, 0.07, HW, 0, 9, UP, X, I),
    blob(HC.clone().add(V(0, -0.034, 0.1)), 0.014, 0.022, 0.017, HW, 0, 6, V(0, 1, 0.4), X, I)];
  for (const s of [1, -1]) head.push(blob(HC.clone().add(V(s * 0.087, -0.014, -0.012)), 0.011, 0.024, 0.016, HW, 0, 6, UP, X, I));
  for (const g of head) geos.push(g.translate(-hb.x, -hb.y, -hb.z).scale(HEAD_SCALE, HEAD_SCALE, HEAD_SCALE).translate(hb.x, hb.y, hb.z));

  const geo = mergeGeometries(geos);
  geo.computeBoundingSphere();
  // (from here on the skeleton as it is)
  const PB = P;
  const len = (a, b) => PB(a).distanceTo(PB(b));
  const sh = [PB('Bip01_L_UpperArm'), PB('Bip01_R_UpperArm')], th = [PB('Bip01_L_Calf'), PB('Bip01_R_Calf')];
  // (stand-ins for the scanned bodies' textures, for anything that still asks for them)
  const tex = (r, g, b, a = 255) => { const t = new THREE.DataTexture(new Uint8Array([r, g, b, a]), 1, 1); t.needsUpdate = true; return t; };
  KIT = {
    name: 'toy', toy: true, names, parents, local, boneInverses, bindP, bindQ, geo, I,
    map: tex(255, 255, 255), normal: tex(128, 128, 255), mask: tex(0, 0, 0),
    body: new THREE.Vector4((sh[0].z + sh[1].z) / 2, (th[0].z + th[1].z) / 2, (sh[0].y + sh[1].y) / 2, (Math.abs(th[0].x) + Math.abs(th[1].x)) / 2),
    neckP: PB('Bip01_Neck').clone(),
    waistY: PB('Bip01_Pelvis').y + 0.07,
    // (the gear goes round the skull: on the bigger head, further out and bigger)
    headScale: HEAD_SCALE, skullOff: V(0, 0.083, -0.008).multiplyScalar(HEAD_SCALE),
    skull: PB('Bip01_Head').clone().add(V(0, 0.083, -0.008).multiplyScalar(HEAD_SCALE)),
    feet: [PB('Bip01_L_Foot').clone(), PB('Bip01_R_Foot').clone()],
    hands: [PB('Bip01_L_Hand').clone(), PB('Bip01_R_Hand').clone()],
    neckY: PB('Bip01_Neck').y,
    leg: [len('Bip01_L_Thigh', 'Bip01_L_Calf'), len('Bip01_L_Calf', 'Bip01_L_Foot')],
    arm: [len('Bip01_L_UpperArm', 'Bip01_L_Forearm'), len('Bip01_L_Forearm', 'Bip01_L_Hand')],
    band: new THREE.Vector2(...BAND),
  };
  return KIT;
}

// The figure as modelled in Blender (blender/rider.py): the same skeleton and rest pose, smoothed
// with subdivision, the shading of its folds baked in (colour red), the body part in green. It
// takes the place of the coded loft above once it's loaded.
export async function loadRiderModel() {
  const kit = toyKit();
  const gl = await loadGLB('rider');
  let sk = null;
  gl.scene.traverse((o) => { if (o.isSkinnedMesh) sk = o; });
  if (!sk) throw new Error('rider.glb: no skinned mesh');
  const geo = plainGeometry(sk);
  // its joints by name onto the kit's bones
  const map = sk.skeleton.bones.map((b) => kit.I(b.name));
  if (map.some((i) => i < 0)) throw new Error('rider.glb: unknown bone ' + sk.skeleton.bones[map.indexOf(-1)].name);
  const si = geo.getAttribute('skinIndex');
  for (let i = 0; i < si.array.length; i++) si.array[i] = map[si.array[i]];
  const col = geo.getAttribute('color'), n = col.count, part = new Float32Array(n);
  for (let i = 0; i < n; i++) part[i] = Math.round(col.getY(i) * 8);
  geo.setAttribute('aPart', new THREE.BufferAttribute(part, 1));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  kit.geo = geo;
  kit.baked = true;
  return kit;
}

// flat colour by body part: the shell (and its band or panels), pants, mitts, skin, hair. In a
// crowd copy the jacket colour comes per instance.
export function toyMaterial(kit, outfit, crowd = false) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.86, metalness: 0, vertexColors: !!kit.baked });
  m.defines = { ...(crowd ? { CROWD: '' } : {}), ...(kit.baked ? { TOY_AO: '' } : {}) };
  const c = (x, d = 0x22262c) => new THREE.Color(x ?? d);
  const u = {
    uJacket: { value: c(outfit.jacket) }, uJacket2: { value: c(outfit.jacket2 ?? outfit.jacket) },
    uPants: { value: c(outfit.pants) }, uPants2: { value: c(outfit.pants2 ?? outfit.pants) },
    uGloves: { value: c(outfit.gloves, 0x15171b) }, uSkin: { value: c(outfit.skin, 0xc99a7e) }, uHair: { value: c(outfit.hair, 0x9c907e) },
    uPat: { value: new THREE.Vector2(outfit.jpat ?? 0, outfit.ppat ?? 0) }, uBand: { value: kit.band },
    uFlap: { value: new THREE.Vector2() },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPart; varying float vPart; varying vec3 vRest; uniform vec2 uFlap;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vPart = aPart; vRest = position;
{
  // the loose ends move in the wind: the shell's hem, the cuffs, the pants' legs
  float pp = floor( aPart + 0.5 );
  float loose = pp == 2.0 ? smoothstep( 0.95, 0.8, position.y ) : pp == 4.0 ? 0.4 : pp == 7.0 ? 0.5 : pp == 6.0 ? 0.25 : 0.0;
  float fl = sin( uFlap.x * 24.0 + position.y * 31.0 + position.x * 17.0 + position.z * 13.0 ) * 0.6 + sin( uFlap.x * 41.0 + position.y * 57.0 - position.x * 23.0 ) * 0.4;
  transformed += objectNormal * fl * loose * uFlap.y * 0.008;
}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vPart; varying vec3 vRest;
uniform vec3 uJacket, uJacket2, uPants, uPants2, uGloves, uSkin, uHair; uniform vec2 uPat, uBand;
float tyH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  float part = floor( vPart + 0.5 );
#if defined( CROWD ) && !defined( TOY_AO )
  vec3 jk = vColor.rgb;
#else
  vec3 jk = uJacket;
#endif
  vec3 col;
  if ( part > 7.5 ) col = uHair;
  else if ( part < 1.5 ) col = uSkin;
  else if ( part < 4.5 ) {
    col = jk;
    float pat = uPat.x;
    // 1 a dark band round the chest and the sleeves, 4 the sleeves in the second colour, 8 two
    // halves, 5 a fade
    // (on a sleeve the band goes by the distance down the arm from the shoulder, so with the arms
    // hanging it lines up with the chest's)
    float ry = vRest.y;
    vec3 shoulder = vec3( sign( vRest.x ) * 0.235, 1.225, -0.025 );
    float bh = part < 2.5 ? ry : shoulder.y + 0.025 - distance( vRest, shoulder );
    if ( pat > 0.5 && pat < 1.5 && bh > uBand.x && bh < uBand.y ) col = uJacket2;
    else if ( pat > 3.5 && pat < 4.5 && part > 2.5 ) col = uJacket2;
    else if ( pat > 7.5 && pat < 8.5 && vRest.x < 0.0 ) col = uJacket2;
    else if ( pat > 4.5 && pat < 5.5 ) col = mix( uJacket2, jk, smoothstep( 0.62, 1.4, ry ) );
    else if ( pat > 1.5 && pat != 4.0 && pat != 5.0 && pat != 8.0 ) { float n = tyH( floor( vRest * 14.0 ) ); col = n > 0.66 ? uJacket2 : col; }
    // Cork7's details: the zip up the front to the top of the collar, two slanted pocket zips low
    // on the front, a small white tab on the left chest, and black cuffs at the gloves
    if ( part < 2.5 && vRest.z > 0.0 && abs( vRest.x ) < 0.0045 && ry > 0.7 && ry < 1.44 ) col = vec3( 0.05, 0.06, 0.07 );
    if ( part < 2.5 && vRest.z > 0.05 && ry > 0.8 && ry < 0.93 && abs( abs( vRest.x ) - 0.15 - ( ry - 0.8 ) * 0.08 ) < 0.0035 ) col = vec3( 0.05, 0.06, 0.07 );
    if ( part < 2.5 && vRest.z > 0.05 && vRest.x > 0.1 && vRest.x < 0.14 && ry > 1.2 && ry < 1.222 ) col = vec3( 0.92 );
    if ( part > 3.5 && distance( vRest, vec3( sign( vRest.x ) * 0.642, 0.812, 0.083 ) ) < 0.05 ) col = uGloves;
  }
  else if ( part < 5.5 ) col = uGloves;
  else col = uPants;
#ifdef TOY_AO
  // the folds' shading, baked in Blender (soft: the sun does the rest)
  col *= mix( 1.0, vColor.r, 0.75 );
#endif
  diffuseColor.rgb = col;
}`);
  };
  m.customProgramCacheKey = () => 'toy' + (crowd ? 'c' : '') + (kit.baked ? 'b' : '');
  return m;
}
