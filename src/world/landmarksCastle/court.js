// landmarksCastle/court.js - the details of the castle court (photo refs/summer-garden 143): the porch with a short stair, Tuscan columns and a balcony in the middle of the north court wall, the two
// stair-towers (OSM w688660632 block at the east notch), the bronze statue of Paul I (2003, OSM n4428331026 at (-766.1, -907.4)) on a black pedestal, flower pots by the porch.
// The court floor itself (asphalt) is drawn with the roofs (roof.js).  Frame: castle frame, model +z = south (into the court), x = -b.
import * as THREE from 'three';
import { human, cached, figureMats } from '../lib/figures.js';
import { C0, ROT, W, AB, toAB } from './frame.js';
import { BUILDINGS } from '../data/city.js';
import { ringEdges, onEdge, band } from './kit.js';

export function paul() {
  return cached('lmC-paul', () => human({
    detail: 0.5, body: { muscle: 0.4 },
    pose: { pelvis: [0, 0.95, 0], pelvisRot: [0, 0.1, 0.03], spine: [0, -0.1, 0], head: [0.0, 0.2, 0],
      legs: { L: { foot: [0.12, 0, 0.1], pole: [0, 0, 1] }, R: { foot: [-0.12, 0, -0.1], pole: [0, 0, 1] } },
      arms: { L: { hand: [0.26, 0.82, 0.12], pole: [0.5, -0.4, -0.5], grip: 'fist' }, R: { hand: [-0.25, 0.8, 0.2], pole: [-0.6, -0.4, -0.5], grip: 'hold' } } },
    outfit: { torso: 'coat', hem: 0.55, flare: 0.25, sleeves: 'long', trousers: 'long', boots: 0.5, collar: 'stand', epaulettes: true, buttons: true, cape: 'back', capeLen: 0.8, hat: 'plume' },
    face: { age: 0.5, hair: 'short', mouth: 'stern', seed: 31 },
  }));
}

export function build(K, M, D, svc) {
  const P = K.P, ph = K.ctx.physics;
  // ---- the porch in the middle of the north court wall (a ~ -30.6, b ~ -7.2 => x = +7.2)
  const pa = -30.55;
  P.push(C0.x, 0, C0.z, ROT); P.push(7.2, 0, pa, 0);
  try {
    const NS = 5, rise = 0.25, run = 0.5, YP = rise * NS;
    for (let k = 0; k < NS; k++) {
      const top = YP - rise * (k + 1) + rise, z1 = 0.15 + 3.0 + run * (k + 1);
      void top; void z1;
    }
    P.box(M.plinthTop, -3.4, 3.4, 0, YP, 0.15, 3.4, 'b');
    for (let k = 1; k <= NS; k++) {
      const top = YP - rise * k, z0 = 3.4 + run * (k - 1), z1 = z0 + run;
      P.box(M.courtTrim, -2.6 - (k) * 0.0, 2.6, 0, top, z0, z1, 'b');
      const c = W(7.2, pa + (z0 + z1) / 2); ph.addWalkBox(c.x, c.z, 5.2, run, ROT, top, 0);
    }
    const c0 = W(7.2, pa + 1.8); ph.addWalkBox(c0.x, c0.z, 6.8, 3.2, ROT, YP, 0);
    // the door in the wall, columns, entablature, balcony
    K.gate(0, YP, 1.9, 3.9, { sw: 0.3, d: 0.14, ringMat: M.courtTrim, doorMat: K.mats.doorWood });
    for (const x of [-2.4, -0.8, 0.8, 2.4]) {
      P.cyl(M.courtTrim, [x, YP, 2.6], [x, YP + 4.4, 2.6], 0.34, 0.3, 14, true);
      P.box(M.courtTrim, x - 0.5, x + 0.5, YP, YP + 0.3, 2.1, 3.1, 'b'); P.box(M.courtTrim, x - 0.5, x + 0.5, YP + 4.4, YP + 4.7, 2.1, 3.1, 'b');
      const c = W(7.2 + x, pa + 2.6); ph.addCylinder(c.x, c.z, 0.45, 0, 7);
    }
    P.box(M.courtTrim, -3.2, 3.2, YP + 4.7, YP + 5.5, 0.0, 3.3, '');
    P.box(M.trim, -3.4, 3.4, YP + 5.5, YP + 5.8, 0.0, 3.5, '');
    for (let x = -3.2; x < 3.3; x += 0.34) P.box(M.courtTrim, x - 0.07, x + 0.07, YP + 5.8, YP + 6.6, 3.05, 3.25, 'tb');
    P.box(M.courtTrim, -3.4, 3.4, YP + 6.6, YP + 6.8, 2.95, 3.5, 'b');
    for (const x of [-4.2, 4.2]) { P.cyl(M.plinthTop, [x, 0, 1.5], [x, 0.5, 1.5], 0.35, 0.3, 8, true); P.geo(M.chimney, new THREE.SphereGeometry(0.3, 8, 6), x, 0.75, 1.5); }
  } finally { P.pop(); P.pop(); }

  // ---- the small stair block in the east notch of the court (OSM w688660632, 3.7 x 10 m): court-coloured walls on a granite base, a flat roof with a balustrade
  { const rec = BUILDINGS.find((b) => b.id === 'w688660632');
    if (rec) {
      const poly = { o: rec.polys[0].o, h: [] }, es = ringEdges(poly, 0.05), HB = 4.6;
      for (const e of es) {
        onEdge(P, e, (len) => { K.wallQuad(M.court, 0, len, 0, HB, 3); });
        ph.addBox((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, e.len + 0.3, 0.7, Math.atan2(-(e.b[1] - e.a[1]), e.b[0] - e.a[0]), 0, HB + 0.6);
      }
      band(P, es, 0, 1.0, 0.1, { front: M.plinth, top: M.plinthTop }, {});
      band(P, es, HB - 0.5, HB, 0.2, { front: M.courtTrim, top: M.courtTrim, under: M.trimShade }, {});
      const ring = []; for (let i = 0; i < poly.o.length; i += 2) ring.push([poly.o[i], poly.o[i + 1]]);
      P.cap(M.roofDark, ring, HB + 0.02, true, 3);
      K.railing(ring.concat([ring[0]]), HB, 0.9);
    } }
  // ---- Paul I (2003), OSM n4428331026
  const px = -766.1, pz = -907.4, mk = figureMats(K.ctx).keys('bronze', 'bronze');
  const ab = toAB(px, pz); void ab;
  P.push(px, 0, pz, ROT);
  P.box(M.plinth, -0.85, 0.85, 0, 0.35, -0.85, 0.85, 'b'); P.box(M.bronze, -0.65, 0.65, 0.35, 2.2, -0.65, 0.65, 'b'); P.box(M.plinthTop, -0.8, 0.8, 2.2, 2.4, -0.8, 0.8, 'b');
  P.pop();
  const toward = Math.atan2(-750 - px, -880 - pz);
  paul().place(P, mk, px, 2.4, pz, toward, 1.78);
  ph.addBox(px, pz, 1.8, 1.8, ROT, 0, 4.2);
  svc.monuments.push({ id: 'paul1', name: 'Павел I', x: px, z: pz, h: 6.1 });
  svc.court = { x: -757, z: -885, polygon: D.courtRing, entrance: { x: -745.7, z: -852.2 }, statue: { x: px, z: pz } };
  svc.crowd.push({ x: -750, z: -880, r: 12, n: 7, name: 'court' });
  void AB;
}
