// landmarksNorthFull/fence.js - the captured-cannon fence of the Transfiguration Cathedral as KNOCKABLE instances (M7 knock parity, docs/AREAS.md 8.7): 32 granite piers, each carrying three
// bronze barrels with brass caps, and the 24 double catenary chains between them (48 strands). The geometry is the one the merged part drew since M5 (landmarksNorthFull.js cathedral(), copied from the source
// module landmarksNorth of 102_3d_piter): the same boxes and cylinders in the same materials at the same places, now one knock record per pier and per chain span, each with its own collider,
// the pattern of the strip's furniture (landmarksF/garden.js:106 benches, streets/barriers.js bollard posts + chain spans, landmarksOktyabrsky/plaza.js granite bollards):
//   * a pier is a `bollard` of 900 kg (granite + three cannon), anchored: it holds a bump and breaks off at the foot above 30 km/h; its collider is a 2.1 x 1.8 m box 2.34 m high; a knocked pier
//     drops the spans that hang on it (the onKnock of streets/barriers.js);
//   * a span (the two strands between two piers, 7.1 m) is a `chain` of 12 kg with a thin `fence` box 1.8 m high (people/nav.js reads it as a wall, the car pushes it down and drives on), anchored 0.5
//     (any moving car topples it: the topple body ends flat on the ground, core/knock.js).
// Without ctx.knock (tools/check.mjs without it, the headless probes) knockInstances builds one static InstancedMesh per part and registers nothing: the structure of the old merged mesh, instanced;
// the colliders are there in both cases (the fence had none before M7). The four approach paths stay open as before (no pier at i = 0, no span before i = 0 and none after i = 4).
// cannonFence(K, cx, cz) returns the triangles drawn (template triangles x instances) so that the module's service counts them as it counted the merged fence.
import * as THREE from 'three';
import { Parts } from '../landmarksD/kit.js';
import { knockInstances } from '../lib/knock-inst.js';

export const PIERS = 32, SPANS = 24;                                   // the census (tools/north-knock-test.mjs): 24 spans of two strands each (docs/AREAS.md 8.7 counted the 48 strands)
const PITCH = 8.4, ROW = 36, SPAN = 7.1, SPAN0 = 0.65, SAG = 0.34, CHAIN_Y = [1.05, 1.75], FAR = 240, SPAN_PULL_KMH = 8;
/** the template geometries of a small model drawn by `draw(P)` at the origin, one per material (landmarksF/util.js templateOf, with the kit of this module) */
const templateOf = (draw) => { const P = new Parts(), g = new THREE.Group(); draw(P); return P.build(g, {}).map((m) => ({ geo: m.geometry, mat: m.material })); };
const trisOf = (parts) => parts.reduce((n, { geo }) => n + (geo.index ? geo.index.count : geo.attributes.position.count) / 3, 0);
const pkey = (x, z) => x.toFixed(3) + ',' + z.toFixed(3);

export function cannonFence(K, cx, cz) {
  const ctx = K.ctx, M = K.mats, bronze = K.wall('#3c4c43'), ph = ctx.physics;
  // the pier: granite block + three barrels, drawn at the origin facing +z (the frame the merged part used at (x, 36) of each side)
  const pierParts = templateOf((P) => {
    P.box(M.graniteWarm, -1.05, 1.05, 0.13, 0.56, -0.9, 0.9);
    for (let k = -1; k <= 1; k++) {
      P.cyl(bronze, [k * 0.45, 0.56, 0], [k * 0.45, 2.25, 0], 0.16, 0.25, 10, true);
      P.cyl(M.brass, [k * 0.45, 2.22, 0], [k * 0.45, 2.34, 0], 0.26, 0.26, 10, true);
    }
  });
  // the span: two catenary strands of 12 rods each, from the origin along local +x (the span ran from x + 0.65 to x + 7.75 of its pier)
  const spanParts = templateOf((P) => {
    for (const y of CHAIN_Y) { let prev; for (let j = 0; j <= 12; j++) { const t = j / 12, q = [t * SPAN, y - SAG * Math.sin(Math.PI * t), 0]; if (prev) P.cyl(bronze, prev, q, 0.04, 0.04, 5, true); prev = q; } }
  });
  // the cathedral frame of the merged part: P.push(cx, 0, cz) then P.push(0, 0, 0, side * PI / 2): local (lx, lz) -> world through THREE.Matrix4.makeRotationY (x' = x cos + z sin, z' = -x sin + z cos),
  // the rotation knockInstances applies to a spot with rotY = side * PI / 2
  const world = (s, lx, lz) => { const c = Math.cos(s * Math.PI / 2), sn = Math.sin(s * Math.PI / 2); return [cx + lx * c + lz * sn, cz - lx * sn + lz * c]; };
  const piers = [], pierItems = [], spans = [], spanItems = [], spansAt = new Map(), spanRecs = [];
  for (let side = 0; side < 4; side++) {
    const rotY = side * Math.PI / 2;
    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      const x = i * PITCH, [px, pz] = world(side, x, ROW);
      piers.push({ x: px, y: 0, z: pz, rotY }); pierItems.push(ph.addBox(px, pz, 2.1, 1.8, rotY, 0, 2.34));
      if (i === -1 || i === 4) continue;                                                       // the approach path and the corner: no span
      const [sx, sz] = world(side, x + SPAN0, ROW), [mx, mz] = world(side, x + SPAN0 + SPAN / 2, ROW);
      const box = ph.addBox(mx, mz, SPAN + 0.1, 0.12, rotY, 0, 1.8); box.fence = true;
      const si = spans.length; spans.push({ x: sx, y: 0, z: sz, rotY, mx, mz }); spanItems.push(box);
      for (const q of [world(side, x, ROW), world(side, x + PITCH, ROW)]) { const k = pkey(q[0], q[1]); let l = spansAt.get(k); if (!l) spansAt.set(k, (l = [])); l.push(si); }     // the span hangs on pier i and pier i + 1
    }
  }
  // a knocked pier pulls down its one or two spans, thrown gently to the side the pier falls (streets/barriers.js dropSpans)
  const dropSpans = (rec, body) => {
    if (!ctx.knock) return;
    for (const si of spansAt.get(pkey(rec.x, rec.z)) || []) {
      const sr = spanRecs[si]; if (!sr || sr.state !== 'stand') continue;
      const nx = Math.sin(sr.rotY), nz = Math.cos(sr.rotY), side = nx * body.dx + nz * body.dz < 0 ? -1 : 1;          // (sin, cos) of the record's rotY is the across direction of the span
      ctx.knock.hit(sr.x, sr.z, SPAN_PULL_KMH, nx * side, nz * side, 'chain');
    }
  };
  knockInstances(ctx, { name: 'lmNF-cannon-piers', far: FAR,
    parts: pierParts.map((t) => ({ geo: t.geo, mat: t.mat, name: t.mat === M.graniteWarm ? 'granite' : t.mat === M.brass ? 'brass' : 'bronze' })),
    spots: piers, items: pierItems,
    rec: () => ({ kind: 'bollard', mass: 900, h: 2.34, w: 2.1, d: 1.8, anchored: 30, hitK: 0.6, onKnock: dropSpans }) });
  knockInstances(ctx, { name: 'lmNF-cannon-chains', far: FAR,
    parts: spanParts.map((t) => ({ geo: t.geo, mat: t.mat, shadow: false, name: 'links' })),
    spots: spans, items: spanItems,
    rec: (s) => ({ kind: 'chain', x: s.mx, z: s.mz, rotY: s.rotY, mass: 12, h: 0.8, r: 0.04, w: SPAN + 0.1, d: 0.12, anchored: 0.5, hitK: 0.05, minDv: 0 }) }).records.forEach((r, i) => { spanRecs[i] = r; });
  return trisOf(pierParts) * piers.length + trisOf(spanParts) * spans.length;
}
