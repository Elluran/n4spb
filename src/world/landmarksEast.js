// landmarksEast - the Alexander Nevsky Lavra gate church, the monument and Hotel Moscow (Smolninskoye: only what the area claims): copied from 102_3d_piter commit 0568f7af (src/world/landmarksEast.js); the n4spb edits are marked 'n4spb:'.
// Old Nevsky's eastern landmarks, registered to OSM, modelled from the Lavra's
// official pages and reference photographs listed in docs/EAST.md.
// Photo-derived architectural heights, not a measured conservation survey.
// Reuses the established cel-shaded facade vocabulary; no flags or logos.
export const OWNS_GROUPS = true;
import * as THREE from 'three';
import * as L from './layout.js';
import { makeKit } from './landmarksD/common.js';
import { buildHouse } from './landmarksD/house.js';
import { dome, onion, cross, drum, ringWindows, roundCornice, portico } from './landmarksD/parts.js';
import { MeshBuilder, addPrism, addPolyColliders } from './lib/massing.js';
import { monument } from './landmarksEast/monument.js';

function tower(K, x, z, base, top, wall) {
  const P = K.P, M = K.mats;
  P.box(wall, x - 4.5, x + 4.5, base, top, z - 4.5, z + 4.5, 'b');
  for (let side = 0; side < 4; side++) {
    P.push(x, 0, z, side * Math.PI / 2); P.push(0, 0, 4.5);
    K.window({ x: 0, y: top - 9, w: 2.4, h: 6, head: 'arch', sw: 0.3, d: 0.1, frame: 'white' });
    for (const s of [-1, 1]) K.pilaster(M.trim, s * 3.35, 0.7, base + 0.5, top - base - 1.2, 0.24, 0.6);
    P.pop(); P.pop();
  }
  for (const [y, w, h] of [[top - 0.8, 9.8, 0.5], [top, 10.3, 0.55], [top + 0.65, 8.8, 1.0]]) P.box(M.trim, x - w / 2, x + w / 2, y, y + h, z - w / 2, z + w / 2, 'b');
  dome(K, M.trim, x, top + 1.7, z, 4.2, 0.75);
  drum(K, M.trim, x, z, top + 5.2, top + 6.0, 1.1, 12);
  onion(K, M.brass, x, top + 6.0, z, 0.7, 1.0);
  cross(K, M.brass, x, top + 7.65, z, 1.7);
}

function trinity(K) {
  const M = K.mats, P = K.P, yellow = K.wall('#e5c584');
  buildHouse(K, { recs: L.groupMembers('east-trinity'), hc: 22, wall: '#e5c584', floors: [9.8, 9.8], railing: false, roofMat: M.trim, courtPitch: 4.7,
    front: (e, { len }) => {
      K.wallQuad(yellow, 0, len, 0, 22.45, 3);
      if (len < 4) return true;
      const n = Math.max(1, Math.floor(len / 5.4));
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * len / n;
        K.window({ x, y: 4.2, w: 1.85, h: 7, head: 'arch', sw: 0.23, d: 0.12, frame: 'white' });
        K.window({ x, y: 16.5, w: 1.6, h: 3.0, head: 'arch', sw: 0.18, d: 0.08, frame: 'white' });
      }
      for (let i = 0; i <= n; i++) K.pilaster(M.trim, 0.3 + i * (len - 0.6) / n, 0.65, 1.2, 19.3, 0.21, 0.5);
      return true;
    } });
  P.push(2089.1, 0, 1260.1, -1.187);
  // Raised nave, crossing drum, ribbed silver dome, lantern and gilded cross.
  P.box(yellow, -10.5, 10.5, 22.6, 26.8, -19, 25, 'b');
  P.box(M.trim, -11, 11, 26.85, 27.4, -19.5, 25.5, 'b');
  drum(K, yellow, 0, -12, 27.4, 38.6, 10.3, 32);
  ringWindows(K, 0, -12, 10.35, 16, { x: 0, y: 29, w: 1.55, h: 7.2, head: 'arch', sw: 0.18, d: 0.09, frame: 'white' }, 0, 32);
  roundCornice(K, M.trim, M.cream, 0, -12, 38.6, 10.6, 1.4);
  dome(K, M.trim, 0, 40, -12, 11, 1.02);
  // Thin standing seams make the sheet-metal dome readable from the river.
  for (let a = 0; a < 24; a++) {
    const angle = a * Math.PI / 12;
    let last;
    for (let j = 0; j <= 10; j++) {
      const t = j * Math.PI / 20, r = 11.04 * Math.cos(t), y = 40.1 + 12.95 * Math.sin(t);
      const q = [Math.cos(angle) * r, y, -12 + Math.sin(angle) * r];
      if (last) P.cyl(M.cream, last, q, 0.055, 0.055, 4, false);
      last = q;
    }
  }
  drum(K, M.trim, 0, -12, 52.4, 57.2, 1.65, 16);
  ringWindows(K, 0, -12, 1.68, 8, { x: 0, y: 53.2, w: 0.62, h: 2.8, head: 'arch', sw: 0.08, frame: 'white' }, 0, 16);
  dome(K, M.brass, 0, 57.3, -12, 1.8, 0.8); cross(K, M.brass, 0, 59.1, -12, 2.6);
  for (const x of [-12, 12]) tower(K, x, 30, 22.6, 39.5, yellow);
  P.box(M.doorWood, -1.65, 1.65, 0.12, 6.8, 37.55, 37.72, 'b');
  P.box(M.brass, -0.035, 0.035, 0.3, 6.6, 37.74, 37.8, 'b');
  P.push(0, 0, 36.5);
  portico(K, { x0: -9.2, x1: 9.2, depth: 3.5, y0: 0.3, y1: 14.8, r: 0.72, xs: [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5], ent: 2.0, ped: 3.8, wallMat: yellow, steps: false });
  P.pop(); P.pop();
}

function gate(K) {
  const P = K.P, M = K.mats, rose = K.wall('#c97868'), x = 1967.7, z = 1028.9, rot = -2.559;
  P.push(x, 0, z, rot);
  // Real entrance remains a walk-through passage, with a vaulted upper edge.
  for (const side of [-1, 1]) P.box(rose, side < 0 ? -12.45 : 2.8, side < 0 ? -2.8 : 12.45, 0, 7.2, -4.9, 4.9, 'b');
  P.box(rose, -12.45, 12.45, 7.2, 14.4, -4.9, 4.9, 'b');
  for (const y of [6.8, 13.8, 14.5]) P.box(M.trim, -12.7, 12.7, y, y + 0.36, -5.15, 5.15, 'b');
  for (const side of [0, Math.PI]) {
    P.push(0, 0, 0, side); P.push(0, 0, 4.94);
    // The entrance archivolt is a true curved opening, 5.6m wide.
    const arch = new THREE.Shape();
    arch.moveTo(-3.1, 4.3); arch.absarc(0, 4.3, 3.1, Math.PI, 0, true);
    arch.lineTo(2.8, 4.3); arch.absarc(0, 4.3, 2.8, 0, Math.PI, false); arch.closePath();
    P.extrude(M.trim, arch, 0.15, 0.04, 1, 16);
    for (const u of [-9.5, -6.1, 6.1, 9.5]) {
      K.window({ x: u, y: 2.1, w: 1.5, h: 3.2, sw: 0.2, frame: 'white' });
      K.window({ x: u, y: 8.9, w: 1.5, h: 3.5, head: 'arch', sw: 0.23, frame: 'white' });
    }
    for (const u of [-11.6, -3.5, 3.5, 11.6]) K.pilaster(M.trim, u, 0.75, 0.3, 13.1, 0.15, 0.45);
    K.window({ x: 0, y: 8.6, w: 2.4, h: 4.1, head: 'arch', sw: 0.26, frame: 'white' });
    P.pop(); P.pop();
  }
  drum(K, rose, 0, 0, 14.8, 19.2, 4.1, 24);
  ringWindows(K, 0, 0, 4.13, 8, { x: 0, y: 15.5, w: 1, h: 2.8, head: 'arch', sw: 0.17, frame: 'white' });
  dome(K, M.roofSilver, 0, 19.3, 0, 4.6, 0.85);
  onion(K, M.brass, 0, 23.9, 0, 0.8); cross(K, M.brass, 0, 25.8, 0, 1.9);
  P.pop();
  const co = Math.cos(rot), si = Math.sin(rot);
  for (const u of [-7.625, 7.625]) K.ctx.physics.addBox(x + u * co, z - u * si, 9.65, 9.8, rot, 0, 15);
  K.ctx.physics.addBox(x, z, 5.6, 9.8, rot, 7.2, 15);
}

function feodorovsky(K) {
  const P = K.P, M = K.mats;
  const white = K.wall('#e7e2d5');
  buildHouse(K, { recs: L.groupMembers('east-feodorovsky'), hc: 25, wall: '#e7e2d5', corniceScale: 0.6, railing: false, roofMat: M.roofSilver,
    front: (e, { len }) => {
      K.wallQuad(white, 0, len, 0, 25.45, 3);
      if (len < 4) return true;
      const n = Math.max(1, Math.floor(len / 6)), pitch = len / n;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * pitch, radius = Math.min(2.9, pitch * 0.46);
        K.window({ x, y: 3.1, w: 1.15, h: 4.1, head: 'arch', sw: 0.22, frame: 'white' });
        K.window({ x, y: 12.2, w: 1.5, h: 7.3, head: 'arch', sw: 0.3, frame: 'white' });
        // The rounded zakomara gables of the pre-Petrine revival facade.
        const sh = new THREE.Shape(); sh.moveTo(x - radius, 24.6);
        sh.absarc(x, 24.6, radius, Math.PI, 0, true); sh.closePath();
        P.extrude(white, sh, 0.38, -0.2, 1, 12);
        let prev;
        for (let j = 0; j <= 16; j++) {
          const a = Math.PI * j / 16, q = [x + radius * Math.cos(a), 24.6 + radius * Math.sin(a), 0.23];
          if (prev) P.cyl(M.trim, prev, q, 0.12, 0.12, 6, false);
          prev = q;
        }
      }
      for (let i = 0; i <= n; i++) K.pilaster(M.trim, 0.25 + i * (len - 0.5) / n, 0.38, 0.6, 23.7, 0.12, 0.3);
      for (const y of [9.4, 10.0, 21.1]) P.box(M.trim, 0, len, y, y + 0.18, 0.02, 0.18, 'b');
      return true;
    } });
  P.push(972.9, 0, 717.7, -0.32);
  for (const [x, z, r, y, h] of [[0, 0, 4.9, 25.6, 9], [-8.5, -7.8, 2.65, 25.6, 5], [8.5, -7.8, 2.65, 25.6, 5], [-8.5, 7.8, 2.65, 25.6, 5], [8.5, 7.8, 2.65, 25.6, 5]]) {
    drum(K, M.trim, x, z, y, y + h, r * 0.78, 20);
    ringWindows(K, x, z, r * 0.79, 8, { x: 0, y: y + 1, w: r * 0.27, h: h - 1.8, head: 'arch', sw: 0.14, frame: 'white' });
    onion(K, M.brass, x, y + h, z, r, 0.9);
    cross(K, M.brass, x, y + h + r * 2.124, z, x === 0 ? 2.9 : 2);
  }
  P.pop();
}

function hotel(K, root) {
  const walls = new MeshBuilder(), roofs = new MeshBuilder();
  for (const b of L.groupMembers('east-hotel-moscow')) for (const poly of b.polys) {
    addPrism(walls, roofs, poly, 0, 28.5, { bay: 3.1, floor: 3.5 });
    addPolyColliders(K.ctx, poly, 0, 29, 0.6);
  }
  const mat = K.ctx.mat.facade({ name: 'east-hotel', glass: '#718b96', frame: '#d5d3c9', spandrel: '#a8aaa5', bay: 3.1, floor: 3.5, mullion: 0.12, transom: 0.12, spandrelH: 0.32 });
  root.add(new THREE.Mesh(walls.build(), mat), new THREE.Mesh(roofs.build(), K.mats.roofSilver));
}

export function build(ctx) {
  const K = makeKit(ctx), root = new THREE.Group(); root.name = 'landmarksEast';
  K.svc = { houses: [], entrances: [], monuments: [], photoSpots: [] };
  // n4spb: the source builds all five sights at fixed coordinates (trinity, gate, feodorovsky and the monument are not driven by the records). An area builds only the sights whose sub-group it claims
  // (GROUPS.landmarksEast of its area module): Smolninskoye claims east-lavra-gate and east-hotel-moscow; the Trinity Cathedral, the Lavra wings and the Feodorovsky Cathedral lie beyond its territory, so their
  // builders (a raised nave and domes at constants) would float in the void there and are skipped. The monument of Alexander Nevsky (1902, 983) has no sub-group of its own: it stands with the gate (70 m away).
  const has = (key) => L.groupMembers(key).length > 0;
  for (const [name, fn, key] of [['trinity', trinity, 'east-trinity'], ['gate', gate, 'east-lavra-gate'], ['feodorovsky', feodorovsky, 'east-feodorovsky'], ['monument', monument, 'east-lavra-gate']]) {
    if (!has(key)) continue;
    K.begin(); fn(K); K.flush(root, 'east-' + name);
  }
  if (has('east-lavra-wings')) {
    K.begin();
    buildHouse(K, { recs: L.groupMembers('east-lavra-wings'), hc: 13.5, wall: '#be7668', floors: [4, 4, 4], courtPitch: 3.7, railing: false, roofMat: K.mats.roofGreen,
      bands: [{ y0: 4.6, y1: 4.9, d: 0.12, mat: K.mats.trim }, { y0: 8.7, y1: 9, d: 0.12, mat: K.mats.trim }] });
    K.flush(root, 'east-lavra-wings');
  }
  if (has('east-hotel-moscow')) hotel(K, root);
  ctx.addStatic(root);
  ctx.services.landmarksEast = { triangles: K.tris, entrances: [
    ...(has('east-lavra-gate') ? [{ x: 1967.7, z: 1028.9, bldg: 'r5677834' }] : []),
    ...(has('east-trinity') ? [{ x: 2049, z: 1276, clearance: 9, bldg: 'w28808840' }] : []),
  ] };
}
