// The 3D site map from the UI/UX design (Three.js r128), kept as close to the original as possible.
// Differences: data comes from M (filled by React from the backend) instead of the global S, routes come
// from the backend, alternatives are rebuilt at run time, and clicks go to M.onSelect.
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ic } from '../lib/svg.js';
import { CX, CY, pol, ZGEO, ZK, ZLBL, rOut, ZHEX, ZCOL, LAKE, ZCSS, LANDMARKS, GATES, rank, sevColor } from './geometry.js';

// live map state, written by MapView before every update()
export const M = {
  lang: 'ar', incidents: [], staff: [], sel: null, flash: null,
  layers: { incidents: true, staff: true, access: true, assets: true, gates: true },
  assetDefs: {}, assetStatus: {}, routePaths: {}, routeStatus: {}, altPaths: {},
  zoneNames: {}, zoneCodes: {},
  zoneState: () => 'ok', getInc: () => null, onSelect: () => {},
};
const L = a => Array.isArray(a) ? (M.lang === 'ar' ? a[0] : a[1]) : a;
const x = (a, e) => M.lang === 'ar' ? a : e;

let instance;
let failed = false;
// created once (after the first data load: the buildings keep the routes clear)
export function getMap3D() {
  if (instance || failed) return instance || null;
  try { instance = create(); if (!instance) failed = true; } catch (e) { console.error('3D map failed', e); failed = true; instance = null; }
  return instance;
}

function create() {
  let seed = 2030;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pp = (a, r) => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)];
  const W3 = (px, py) => [px - CX, py - CY];

  const el = document.createElement('div'); el.className = 'm3d';
  const ov = document.createElement('div'); ov.className = 'm3d-ov';
  const ui = document.createElement('div'); ui.className = 'm3d-ui';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x03120E);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.append(renderer.domElement, ov, ui);
  // marker clicks (the overlay is plain HTML rebuilt by update)
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-a="sel"]'); if (!b) return;
    e.stopPropagation();
    const [k, v] = b.dataset.v.split('|'); M.onSelect(k, v);
  });

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x03120E, 1150, 2900);
  const camera = new THREE.PerspectiveCamera(36, 1, 5, 6000);
  const HOME = { pos: new THREE.Vector3(-110, 880, 990), tgt: new THREE.Vector3(0, 0, 30) };
  camera.position.copy(HOME.pos);
  const controls = new MapControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .08, screenSpacePanning: false, maxPolarAngle: 1.22, minDistance: 70, maxDistance: 2400, zoomSpeed: .8 });
  controls.target.copy(HOME.tgt); controls.update();

  scene.add(new THREE.HemisphereLight(0xcff5ea, 0x021009, .62));
  const sun = new THREE.DirectionalLight(0xfff1dc, .8);
  sun.position.set(-420, 650, 300); sun.castShadow = true;
  sun.shadow.mapSize.set(3072, 3072);
  Object.assign(sun.shadow.camera, { left: -820, right: 820, top: 820, bottom: -820, near: 10, far: 2400 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  /* ---- ground, roads, lots ---- */
  const lam = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  const flat = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; scene.add(m); return m; };
  const strip = (x1, z1, x2, z2, w, color, y) => {
    const m = flat(new THREE.PlaneGeometry(Math.hypot(x2 - x1, z2 - z1), w), lam(color), y);
    m.position.x = (x1 + x2) / 2; m.position.z = (z1 + z2) / 2; m.rotation.z = -Math.atan2(z2 - z1, x2 - x1); return m;
  };
  flat(new THREE.PlaneGeometry(7000, 7000), lam(0x031510), 0);
  flat(new THREE.CircleGeometry(600, 140), lam(0x051B15), .06);
  flat(new THREE.CircleGeometry(345, 120), lam(0x061E18), .1);
  flat(new THREE.RingGeometry(298, 332, 180), lam(0x0A281F), .3);
  flat(new THREE.RingGeometry(194, 206, 140), lam(0x0A2A21), .35);
  [-135, -45, 45, 135].forEach(a => { const [x1, z1] = pp(a, 100), [x2, z2] = pp(a, 324); strip(x1, z1, x2, z2, 13, 0x0B2B22, .25); });
  // highways & access roads (the access roads leave through the four gates)
  [[-1400, -150, -150, -1400, 38], [-1500, -760, 1500, -760, 26], [900, -1500, 900, 1500, 24], [-1500, 860, 1500, 860, 20]].forEach(([a, b, c, d, w]) => {
    strip(a, b, c, d, w, 0x0B2620, .12);
    strip(a, b, c, d, 1.2, 0x1B4136, .16);
  });
  [[0, -330, 0, -760, 16], [330, 0, 900, 0, 16], [0, 330, 0, 860, 16], [-330, 0, -900, 0, 18]].forEach(([a, b, c, d, w]) => strip(a, b, c, d, w, 0x0C2A22, .14));
  // parking lots
  const lotLines = [];
  [[720, 240, 230, 150], [720, -260, 190, 150], [260, 740, 260, 120], [-260, 740, 220, 120], [-760, 300, 200, 200]].forEach(([cx, cz, w, d]) => {
    const m = flat(new THREE.PlaneGeometry(w, d), lam(0x082119), .13); m.position.x = cx; m.position.z = cz;
    for (let r = -d / 2 + 14; r < d / 2 - 6; r += 30) {
      lotLines.push(cx - w / 2 + 6, .2, cz + r, cx + w / 2 - 6, .2, cz + r);
      for (let c = -w / 2 + 6; c <= w / 2 - 6; c += 6) lotLines.push(cx + c, .2, cz + r - 6, cx + c, .2, cz + r + 6);
    }
  });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lotLines, 3));
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x1A3D33 })));
  // water
  const [wx, wz] = pp(100, 165);
  const pond = flat(new THREE.CircleGeometry(17, 48), new THREE.MeshStandardMaterial({ color: 0x0E4A58, roughness: .15, metalness: .5 }), .55); pond.position.x = wx; pond.position.z = wz;
  const [lx, lz] = pp(LAKE.a, LAKE.r);
  const basin = flat(new THREE.CircleGeometry(LAKE.rad, 64), new THREE.MeshStandardMaterial({ color: 0x0D4756, roughness: .12, metalness: .55 }), .7);
  basin.position.x = lx; basin.position.z = lz;
  flat(new THREE.RingGeometry(LAKE.rad, LAKE.rad + 4, 64), lam(0x1B3B30), .72).position.set(lx, .72, lz);

  /* ---- zones ---- */
  const zones = {};
  const shapeFor = z => {
    const s = new THREE.Shape();
    if (z === 'A') { s.absarc(0, 0, 104, 0, Math.PI * 2, false); return s; }
    const g = ZGEO[z], n = 64, pts = [];
    for (let k = 0; k <= n; k++) { const a = g.a0 + (g.a1 - g.a0) * k / n; pts.push(pp(a, rOut(g, a))); }
    for (let k = n; k >= 0; k--) { const a = g.a0 + (g.a1 - g.a0) * k / n; pts.push(pp(a, g.r0)); }
    s.moveTo(pts[0][0], -pts[0][1]); pts.slice(1).forEach(p => s.lineTo(p[0], -p[1]));
    return s;
  };
  ZK.forEach(z => {
    const shape = shapeFor(z);
    flat(new THREE.ShapeGeometry(shape, 48), lam(new THREE.Color(0x08261F).lerp(new THREE.Color(ZCOL[z]), .2)), .4);
    const mat = new THREE.MeshBasicMaterial({ color: ZCOL[z], transparent: true, opacity: .1, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), mat);
    mesh.rotation.x = -Math.PI / 2; mesh.position.y = .6; mesh.renderOrder = 1; mesh.userData.z = z; scene.add(mesh);
    const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shape.getPoints(120).map(p => new THREE.Vector3(p.x, .8, -p.y))), new THREE.LineBasicMaterial({ color: ZCOL[z], transparent: true, opacity: .45 }));
    scene.add(line);
    zones[z] = { mesh, mat, line, st: 'ok', flash: 0, hover: 0, init: false };
  });

  /* ---- buildings (one instanced mesh + one edge mesh) ---- */
  const B = [];
  const keep = [];
  M.incidents.forEach(i => keep.push(W3(i.x, i.y)));
  Object.values(M.assetDefs).forEach(a => keep.push(W3(a.x, a.y)));
  M.staff.forEach(s => s.status !== 'off' && keep.push(W3(s.x, s.y)));
  Object.values(M.routePaths).forEach(r => { for (let k = 1; k < r.length; k++) for (let t = 0; t <= 1; t += .1) keep.push(W3(r[k - 1][0] + (r[k][0] - r[k - 1][0]) * t, r[k - 1][1] + (r[k][1] - r[k - 1][1]) * t)); });
  const LM = { terra: pp(28, 252), alif: pp(196, 250), tower: pp(122, 232), p12: [238, 6] };
  Object.values(LM).forEach(p => keep.push(p));
  keep.push([wx, wz]);
  const clear = (x, z, r = 15) => keep.every(([kx, kz]) => Math.hypot(kx - x, kz - z) > r);
  const inLake = (x, z, pad = 0) => Math.hypot(x - lx, z - lz) < LAKE.rad + pad;
  Object.values(ZGEO).forEach(g => {
    const outer = g.r0 > 300;
    for (let r = g.r0 + (outer ? 16 : 18); r < g.r1 + g.b; r += outer ? 27 : 23) {
      for (let a = g.a0 + 4; a < g.a1 - 3; a += (outer ? 1900 : 1350) / r) {
        if (r > rOut(g, a) - 14 || (!outer && Math.abs(r - 200) < 13) || rnd() < (outer ? .2 : .16)) continue;
        const [x, z] = pp(a + (rnd() - .5) * 2, r + (rnd() - .5) * 6);
        if (!clear(x, z, 17) || inLake(x, z, 18)) continue;
        const tall = rnd() < (outer ? .16 : .12);
        const s = outer ? 1.35 : 1;
        B.push({ x, z, w: (10 + rnd() * 9) * s, d: (9 + rnd() * 7) * s, h: tall ? 26 + rnd() * (outer ? 40 : 22) : 6 + rnd() * 13, rot: -a * Math.PI / 180, c: tall ? 0x16463A : (rnd() < .5 ? 0x0F3329 : 0x123B30), e: true });
      }
    }
  });
  B.push({ x: 238, z: 6, w: 28, d: 22, h: 18, rot: 0, c: 0x1A5242, e: true });
  B.push({ x: -470, z: -14, w: 150, d: 20, h: 16, rot: Math.PI / 2, c: 0x123B30, e: true });
  B.push({ x: -640, z: -470, w: 230, d: 46, h: 30, rot: Math.PI / 4, c: 0x0C2C23, e: true });
  const LOTS = [[720, 240, 140, 100], [720, -260, 120, 100], [260, 740, 150, 80], [-260, 740, 140, 80], [-760, 300, 130, 130], [-640, -470, 150, 110]];
  for (let gx = -1400; gx < 1400; gx += 80) for (let gz = -1400; gz < 1400; gz += 80) {
    const d = Math.hypot(gx, gz);
    if (d < 640 || rnd() < .45) continue;
    if (Math.abs(gx - 900) < 50 || Math.abs(gz + 760) < 50 || Math.abs(gz - 860) < 46 || Math.abs(gx + gz + 1550) < 90 || Math.abs(gx) < 40 || Math.abs(gz) < 40) continue;
    if (LOTS.some(([cx, cz, hw, hd]) => Math.abs(gx - cx) < hw && Math.abs(gz - cz) < hd)) continue;
    B.push({ x: gx + (rnd() - .5) * 20, z: gz + (rnd() - .5) * 20, w: 28 + rnd() * 28, d: 24 + rnd() * 26, h: 8 + rnd() * (d < 900 ? 45 : 75), rot: 0, c: 0x0A241D, e: false });
  }
  const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, metalness: .08 }), B.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
  const edges = [];
  B.forEach((b, k) => {
    q.setFromAxisAngle(up, b.rot);
    m4.compose(new THREE.Vector3(b.x, b.h / 2, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
    bm.setMatrixAt(k, m4); bm.setColorAt(k, col.setHex(b.c));
    if (!b.e) return;
    const c = Math.cos(b.rot), s = Math.sin(b.rot);
    const P = (lx, y, lz) => [b.x + lx * c + lz * s, y, b.z - lx * s + lz * c];
    const hw = b.w / 2, hd = b.d / 2;
    const cs = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = cs[i], [bx, bz] = cs[(i + 1) % 4];
      edges.push(...P(ax, b.h, az), ...P(bx, b.h, bz), ...P(ax, 0, az), ...P(ax, b.h, az));
    }
  });
  bm.castShadow = true; bm.receiveShadow = true; scene.add(bm);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
  scene.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: 0x40B89C, transparent: true, opacity: .16 })));

  /* ---- landmarks ---- */
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: .1, ...o });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  // central garden: lawn, looping path, four cross paths and a small fountain
  flat(new THREE.CircleGeometry(101, 96), lam(0x0E3524), .45);
  flat(new THREE.RingGeometry(47, 53, 96), lam(0x1B3B30), .9);
  [0, 90, 180, 270].forEach(a => { const [x1, z1] = pp(a, 14), [x2, z2] = pp(a, 102); strip(x1, z1, x2, z2, 7, 0x1B3B30, .9); });
  flat(new THREE.RingGeometry(10, 14, 48), lam(0x1B3B30), .9);
  flat(new THREE.CircleGeometry(10, 48), new THREE.MeshStandardMaterial({ color: 0x0E4A58, roughness: .15, metalness: .5 }), .95);
  // the Grand Ring: an elevated walkway roof on pillars, encircling the inner districts
  const ringShape = new THREE.Shape(); ringShape.absarc(0, 0, 331, 0, Math.PI * 2, false);
  const ringHole = new THREE.Path(); ringHole.absarc(0, 0, 299, 0, Math.PI * 2, true); ringShape.holes.push(ringHole);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 3.5, bevelEnabled: false, curveSegments: 200 }), std(0x1A4A3E, { roughness: .55 }));
  roof.rotation.x = -Math.PI / 2; roof.position.y = 15; roof.castShadow = true; roof.receiveShadow = true; scene.add(roof);
  [299, 331].forEach(r => {
    const pts = []; for (let k = 0; k <= 200; k++) { const [x, z] = pp(k * 1.8, r); pts.push(new THREE.Vector3(x, 18.6, z)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x40B89C, transparent: true, opacity: .45 })));
  });
  const pillarsAt = [];
  for (let a = 0; a < 360; a += 3) { if ([270, 0, 90, 180].some(g => Math.abs(((a - g + 540) % 360) - 180) < 3)) continue; pillarsAt.push(pp(a, 303), pp(a, 327)); }
  const pil = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 15, 2.6), std(0x123E33), pillarsAt.length);
  pillarsAt.forEach(([x, z], k) => { pil.setMatrixAt(k, new THREE.Matrix4().makeTranslation(x, 7.5, z)); });
  pil.castShadow = true; scene.add(pil);
  // sustainability canopy
  add(new THREE.CylinderGeometry(18, 22, 18, 40), std(0x123E33), LM.terra[0], 9, LM.terra[1]);
  add(new THREE.CylinderGeometry(46, 40, 3, 56), std(0x15493C, { emissive: 0x041a14 }), LM.terra[0], 22, LM.terra[1]);
  for (let k = 0; k < 5; k++) { const [x, z] = pp(14 + k * 7, 300); add(new THREE.CylinderGeometry(1.2, 1.6, 13, 8), std(0x1A5242), x, 6.5, z); add(new THREE.CylinderGeometry(8, 8, 1.2, 24), std(0x1F5C4A), x, 13.5, z); }
  // ring pavilion
  const ring = add(new THREE.TorusGeometry(24, 5, 18, 64), std(0x1A5242, { metalness: .4, roughness: .35 }), LM.alif[0], 31, LM.alif[1]);
  ring.rotation.y = Math.PI / 4;
  add(new THREE.BoxGeometry(34, 6, 20), std(0x103529), LM.alif[0], 3, LM.alif[1]);
  // observation tower
  add(new THREE.CylinderGeometry(2.6, 3.2, 96, 16), std(0x1A5242), LM.tower[0], 48, LM.tower[1]);
  const deck = add(new THREE.TorusGeometry(12, 2.4, 12, 40), std(0x40B89C, { emissive: 0x0d4033 }), LM.tower[0], 66, LM.tower[1]); deck.rotation.x = Math.PI / 2;

  /* ---- trees ---- */
  const T = [];
  for (let a = 0; a < 360; a += 2.6) { const [x, z] = pp(a, 341); if (clear(x, z, 10) && Math.min(Math.abs(x), Math.abs(z)) > 12) T.push([x, z]); }
  for (let k = 0; k < 420; k++) {
    const a = rnd() * 360, r = 356 + rnd() * 190, [x, z] = pp(a, r);
    if (Math.min(Math.abs(x), Math.abs(z)) < 14 || inLake(x, z, 8) || !clear(x, z, 12) || B.some(b => Math.hypot(b.x - x, b.z - z) < 13)) continue;
    T.push([x, z]);
  }
  for (let a = 0; a < 360; a += 6) { const tx = lx + Math.cos(a * Math.PI / 180) * (LAKE.rad + 11), tz = lz + Math.sin(a * Math.PI / 180) * (LAKE.rad + 11); if (clear(tx, tz, 10)) T.push([tx, tz]); }
  for (let a = 0; a < 360; a += 9) { const [x, z] = pp(a, 97); if (clear(x, z, 10)) T.push([x, z]); }
  for (let k = 0; k < 260; k++) {
    const r = 18 + Math.sqrt(rnd()) * 74, [x, z] = pp(rnd() * 360, r);
    if (Math.abs(r - 50) < 7 || Math.min(Math.abs(x), Math.abs(z)) < 6 || !clear(x, z, 9) || T.some(([tx, tz]) => Math.hypot(tx - x, tz - z) < 6)) continue;
    T.push([x, z]);
  }
  for (let a = 0; a < 360; a += 5.5) { const [x, z] = pp(a, 213); if (clear(x, z, 12)) T.push([x, z]); }
  for (let k = 0; k < 140; k++) { const a = rnd() * 360, r = 120 + rnd() * 175, [x, z] = pp(a, r); if (clear(x, z, 12) && B.every(b => Math.hypot(b.x - x, b.z - z) > 11)) T.push([x, z]); }
  const tm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), lam(0xffffff), T.length);
  T.forEach(([x, z], k) => { const s = 2.6 + rnd() * 1.6; m4.compose(new THREE.Vector3(x, s * 1.4, z), q.setFromAxisAngle(up, rnd() * 3), new THREE.Vector3(s, s * 1.5, s)); tm.setMatrixAt(k, m4); tm.setColorAt(k, col.setHex(rnd() < .5 ? 0x12614A : 0x0F523F)); });
  tm.castShadow = true; scene.add(tm);

  /* ---- accessible routes ---- */
  const v3 = ([px, py]) => new THREE.Vector3(px - CX, 0, py - CY);
  const resample = (pts, step) => {
    const out = [];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], n = Math.max(1, Math.round(a.distanceTo(b) / step));
      for (let i = (k === 1 ? 0 : 1); i <= n; i++) out.push(a.clone().lerp(b, i / n));
    }
    return out;
  };
  const ribbon = (pts, w, mat, y = 1.3) => {
    const pos = [], idx = [];
    pts.forEach((p, k) => {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
      pos.push(p.x + nx, y, p.z + nz, p.x - nx, y, p.z - nz);
      if (k) { const i = (k - 1) * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, mat); m.renderOrder = 2; return m;
  };
  const dashed = (pts, w, mat) => {
    const grp = new THREE.Group(), fine = resample(pts, 1);
    for (let k = 0; k < fine.length - 1; k += 10) grp.add(ribbon(fine.slice(k, Math.min(fine.length, k + 6)), w, mat));
    scene.add(grp); return grp;
  };
  const mAcc = new THREE.MeshBasicMaterial({ color: 0x93A0FF, side: THREE.DoubleSide, transparent: true, opacity: .9, depthWrite: false });
  const mBad = new THREE.MeshBasicMaterial({ color: 0xF2655E, side: THREE.DoubleSide, depthWrite: false });
  const mOff = new THREE.MeshBasicMaterial({ color: 0x4F6D65, side: THREE.DoubleSide, depthWrite: false });
  const RO = {};
  Object.entries(M.routePaths).forEach(([id, raw]) => {
    const pts = raw.map(v3);
    const ok = ribbon(resample(pts, 4), 3.4, mAcc); scene.add(ok);
    const o = { ok, bad: dashed(pts, 3.4, mBad), off: dashed(pts, 2.4, mOff) };
    RO[id] = o;
  });
  // alternatives change at run time (the backend recomputes them): rebuilt when the path changes
  const mAlt = new THREE.MeshBasicMaterial({ color: 0x93A0FF, side: THREE.DoubleSide, transparent: true, opacity: .45, depthWrite: false });
  const dotGeo = new THREE.SphereGeometry(1.8, 12, 8), dotMat = new THREE.MeshBasicMaterial({ color: 0xC9D0FF });
  function syncAlts() {
    Object.entries(RO).forEach(([id, o]) => {
      const raw = M.altPaths[id], key = raw ? JSON.stringify(raw) : '';
      if (o.altKey === key) return;
      if (o.alt) { scene.remove(o.alt); o.alt.geometry.dispose(); scene.remove(o.dots); o.alt = o.dots = o.path = null; }
      o.altKey = key;
      if (!raw || raw.length < 2) return;
      const ap = resample(raw.map(v3), 1);
      o.alt = ribbon(ap, 3.4, mAlt); scene.add(o.alt); o.path = ap;
      o.dots = new THREE.InstancedMesh(dotGeo, dotMat, 8); scene.add(o.dots);
    });
  }

  /* ---- camera helpers ---- */
  let W = 0, H = 0, tween = null, items = [], lastSel = '', mode = 'overview';
  const spos = {};
  const size = () => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; W = r.width; H = r.height; renderer.setSize(W, H, false); camera.aspect = W / H; camera.updateProjectionMatrix(); };
  if (window.ResizeObserver) new ResizeObserver(size).observe(el); else window.addEventListener('resize', size);
  const fly = (p1, t1, d = 1.1) => { tween = { t: 0, d, p0: camera.position.clone(), t0: controls.target.clone(), p1, t1 }; };
  const offset = () => camera.position.clone().sub(controls.target);
  const flyTo = (x, z, dist) => { const off = offset(); if (dist) off.setLength(Math.min(off.length(), dist)); const t1 = new THREE.Vector3(x, 0, z); fly(t1.clone().add(off), t1); };
  const dolly = f => { const off = offset(); off.setLength(THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance)); fly(controls.target.clone().add(off), controls.target.clone(), .45); };
  const tilt = () => {
    const off = offset(), len = off.length(), sph = new THREE.Spherical().setFromVector3(off);
    sph.phi = sph.phi < .25 ? .86 : .001; sph.radius = len;
    fly(controls.target.clone().add(new THREE.Vector3().setFromSpherical(sph)), controls.target.clone(), .7);
  };

  /* ---- UI ---- */
  const COMPASS = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l4 9h-8z" fill="#F2655E"/><path d="M12 21l-4-9h8z" fill="#7D9A91"/></svg>';
  ui.innerHTML = `<button data-m="in">+</button><button data-m="out">−</button><button data-m="tilt" class="tilt">2D</button><button data-m="home" class="cmp">${COMPASS}</button>`;
  const cmp = ui.querySelector('.cmp svg'), tiltB = ui.querySelector('.tilt');
  ui.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    ({ in: () => dolly(.65), out: () => dolly(1.5), tilt, home: () => fly(homePos(), HOME.tgt.clone(), 1.2) })[b.dataset.m]();
  });

  /* ---- picking zones ---- */
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2(); let down = null;
  const pick = e => {
    const r = renderer.domElement.getBoundingClientRect();
    mv.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(mv, camera);
    const hit = ray.intersectObjects(Object.values(zones).map(z => z.mesh))[0];
    return hit && hit.object.userData.z;
  };
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) { const z = pick(e); if (z) M.onSelect('zone', z); }
    down = null;
  });
  renderer.domElement.addEventListener('pointermove', e => {
    if (e.buttons) return;
    const z = pick(e);
    Object.entries(zones).forEach(([k, o]) => o.hover = k === z ? 1 : 0);
    renderer.domElement.style.cursor = z ? 'pointer' : '';
  });
  renderer.domElement.addEventListener('pointerleave', () => Object.values(zones).forEach(o => o.hover = 0));

  /* ---- overlay markers ---- */
  const LAYERS = m => m === 'full' ? M.layers : m === 'access' ? { incidents: true, staff: false, access: true, assets: true, gates: false } : { incidents: true, staff: false, access: true, assets: false, gates: true };
  const selPos = s => {
    if (s.k === 'inc') { const i = M.getInc(s.v); return i && W3(i.x, i.y); }
    if (s.k === 'zone') return s.v === 'A' ? [0, 0] : W3(...ZLBL[s.v]);
    if (s.k === 'staff') { const p = spos[s.v]; return p && [p.x, p.z]; }
    if (s.k === 'asset') { const a = M.assetDefs[s.v]; return W3(a.x, a.y); }
  };
  function update(m) {
    mode = m;
    const lay = LAYERS(m);
    ZK.forEach(z => {
      const st = M.zoneState(z), o = zones[z];
      if (o.st !== st) { if (o.init) o.flash = 1; o.st = st; o.line.material.color.setHex(st === 'ok' ? ZCOL[z] : ZHEX[st]); }
      o.init = true;
    });
    syncAlts();
    Object.entries(RO).forEach(([id, r]) => {
      const st = M.routeStatus[id], on = lay.access;
      r.ok.visible = on && st === 'ok'; r.bad.visible = on && st === 'affected'; r.off.visible = on && st === 'rerouted';
      if (r.alt) r.alt.visible = r.dots.visible = on && st === 'rerouted';
    });
    const sel = M.sel || {};
    let h = '';
    LANDMARKS.forEach(l => h += `<div class="mk" data-p="${l.p[0]},${l.p[1]},${l.h || 4}" data-b="0"><span class="mi mk-lm">${L(l.n)}</span></div>`);
    ZK.forEach(z => { const [x, y] = z === 'A' ? [CX, CY + 78] : ZLBL[z]; h += `<div class="mk" data-p="${x - CX},${y - CY},2" data-b="100"><span class="mi mk-z"><i style="border-color:${ZCSS(z)};color:${ZCSS(z)}">${M.zoneCodes[z] || z}</i>${L(M.zoneNames[z] || ['', ''])}</span></div>`; });
    if (lay.gates) GATES.forEach(g => { const [x, y] = pol(g.a, 315); h += `<div class="mk" data-p="${x - CX},${y - CY},19" data-b="100"><span class="mi mk-gate">${g.id}</span></div>`; });
    if (lay.assets) Object.entries(M.assetDefs).forEach(([id, a]) => {
      h += `<button class="mk" data-p="${a.x - CX},${a.y - CY},4" data-b="1000" data-a="sel" data-v="asset|${id}" aria-label="${id}"><span class="mi mk-as ${M.assetStatus[id] !== 'ok' ? 'bad' : ''} ${sel.k === 'asset' && sel.v === id ? 'sel' : ''}">${ic(a.t === 'elev' ? 'elev' : 'access', 12)}${a.n}</span></button>`;
    });
    if (lay.staff) M.staff.filter(s => s.status !== 'off').forEach(s => {
      if (!spos[s.id]) spos[s.id] = new THREE.Vector3(s.x - CX, 3, s.y - CY);
      h += `<button class="mk" data-s="${s.id}" data-b="2000" data-a="sel" data-v="staff|${s.id}" aria-label="${L(s.n)} · ${L(s.roleL)}"><span class="mi mk-st ${s.status === 'available' ? 'av' : 'busy'} ${sel.k === 'staff' && sel.v === s.id ? 'sel' : ''}" dir="${M.lang === 'ar' ? 'rtl' : 'ltr'}"><i></i><span>${L(s.roleS)}</span><span class="nm">· ${L(s.n)}</span></span></button>`;
    });
    if (lay.incidents) M.incidents.filter(i => i.active).forEach(i => {
      const c = i.inProg ? 'var(--med)' : sevColor(i.sev), n = i.total;
      const hot = i.status === 'open' && (i.sev === 'crit' || i.sev === 'high');
      h += `<button class="mk mk-inc ${hot ? 'hot' : ''} ${sel.k === 'inc' && sel.v === i.id ? 'sel' : ''} ${M.flash === i.id ? 'new' : ''}" style="--c:${c}" data-p="${i.x - CX},${i.y - CY},0" data-b="${4000 - rank[i.sev] * 10}" data-a="sel" data-v="inc|${i.id}" aria-label="${i.id} · ${L(i.title)}"><span class="pin"><b>${n > 1 ? n : '!'}</b></span></button>`;
    });
    ov.innerHTML = h;
    items = [...ov.children].map(e => {
      const p = e.dataset.p && e.dataset.p.split(',').map(Number);
      return { e, b: +e.dataset.b, s: e.dataset.s, p: p && new THREE.Vector3(p[0], p[2], p[1]) };
    });
    ui.querySelector('[data-m=in]').setAttribute('aria-label', x('تكبير', 'Zoom in'));
    ui.querySelector('[data-m=out]').setAttribute('aria-label', x('تصغير', 'Zoom out'));
    tiltB.setAttribute('aria-label', x('تبديل العرض ثنائي/ثلاثي الأبعاد', 'Toggle 2D / 3D'));
    ui.querySelector('[data-m=home]').setAttribute('aria-label', x('إعادة ضبط العرض', 'Reset view'));
    const key = M.sel ? M.sel.k + '|' + M.sel.v : '';
    if (key && key !== lastSel) { const p = selPos(M.sel); if (p) flyTo(p[0], p[1], M.sel.k === 'zone' ? 520 : 330); }
    lastSel = key;
  }
  const homePos = () => { const k = Math.max(1, 1.5 / ((W / H) || 1.5)); return HOME.tgt.clone().add(HOME.pos.clone().sub(HOME.tgt).multiplyScalar(k)); };
  let framed = '';
  function attach(slot, m) {
    if (el.parentNode !== slot) slot.appendChild(el);
    size();
    if (framed !== m && !M.sel) { camera.position.copy(homePos()); controls.target.copy(HOME.tgt); tween = null; }
    framed = m;
    update(m); place();
  }

  /* ---- frame loop ---- */
  const v = new THREE.Vector3();
  function place() {
    if (!W) return;
    for (const it of items) {
      const p = it.s ? spos[it.s] : it.p; if (!p) continue;
      v.copy(p).project(camera);
      if (v.z > 1 || v.x < -1.15 || v.x > 1.15 || v.y < -1.15 || v.y > 1.2) { it.e.style.visibility = 'hidden'; continue; }
      const sx = (v.x + 1) * W / 2, sy = (1 - v.y) * H / 2;
      it.e.style.visibility = '';
      it.e.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
      it.e.style.zIndex = String(it.b + Math.round(sy / 4));
    }
  }
  let last = performance.now();
  function loop(t) {
    requestAnimationFrame(loop);
    if (!el.isConnected || !W) { last = t; return; }
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.d);
      const e = 1 - Math.pow(1 - tween.t, 3);
      camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
    const pulse = .5 + .5 * Math.sin(t / 360);
    Object.values(zones).forEach(z => {
      z.flash = Math.max(0, z.flash - dt * .6);
      z.mat.opacity = .14 + z.hover * .08 + z.flash * .22;
      z.line.material.opacity = z.st === 'crit' ? .5 + .5 * pulse : z.st === 'ok' ? .45 : .9;
    });
    M.staff.forEach(s => { const p = spos[s.id]; if (p) { const k = 1 - Math.exp(-dt * 1.2); p.x += (s.x - CX - p.x) * k; p.z += (s.y - CY - p.z) * k; } });
    Object.values(RO).forEach(r => {
      if (!r.dots || !r.dots.visible) return;
      const n = r.path.length;
      for (let k = 0; k < 8; k++) { const p = r.path[Math.floor((t / 1000 * 26 + k * n / 8) % n)]; m4.makeTranslation(p.x, 2.2, p.z); r.dots.setMatrixAt(k, m4); }
      r.dots.instanceMatrix.needsUpdate = true;
    });
    const sph = new THREE.Spherical().setFromVector3(offset());
    cmp.style.transform = `rotate(${(sph.theta * 180 / Math.PI).toFixed(1)}deg)`;
    tiltB.textContent = sph.phi < .25 ? '3D' : '2D';
    renderer.render(scene, camera);
    place();
  }
  requestAnimationFrame(loop);
  return { attach, update };
}
