// landmarksCastle/north.js - the NORTH (garden) side of the Engineering Castle (photos refs/summer-garden 135, 247; dossier 8.1): the recessed loggia between the two projecting pavilions (22.7 m wide at b +3.9..-18.9)
// with a wide stair of 12 granite steps, a Tuscan marble colonnade (9 columns) on a platform at +2.8 m, an entablature with a balustraded terrace, two bronze statues on high pedestals at the stair
// (copies of the Farnese Hercules and Flora, figure kit), and a semicircular pink granite-sett plaza in front of the stair.  The platform and every step are walk boxes.
// Frame N: model +z = north (out of the wall a = -53), x = +b (west); the loggia centre is x = -7.5.
import * as THREE from 'three';
import { human, extend, cached, figureMats, V } from '../lib/figures.js';
import { C0, ROT } from './frame.js';
import * as L from '../layout.js';

const RN = ROT + Math.PI, cs = Math.cos(RN), sn = Math.sin(RN);
const wN = (lx, lz) => ({ x: C0.x + lx * cs + (lz + 0) * sn, z: C0.z - lx * sn + lz * cs });
const X0 = -18.9, X1 = 3.9, YP = 2.8, ZP = 7.2;

export function hercules() {
  return cached('lmC-hercules', () => human({
    detail: 0.55, body: { muscle: 1.0, bulk: 1.35, shoulders: 1.2 },
    pose: { pelvis: [0, 0.95, 0], pelvisRot: [0, 0.15, 0.06], spine: [0.0, -0.2, -0.06], head: [0.05, 0.4, 0],
      legs: { L: { foot: [0.2, 0, 0.1], pole: [0.1, 0, 1] }, R: { foot: [-0.22, 0, -0.1], yaw: -0.3, pole: [-0.1, 0, 1] } },
      arms: { L: { hand: [0.36, 0.95, 0.24], pole: [0.5, -0.3, -0.5], grip: 'fist' }, R: { hand: [-0.2, 0.9, -0.18], pole: [-0.6, -0.2, -0.7], grip: 'fist' } } },
    outfit: { torso: 'nude' }, face: { age: 0.45, hair: 'short', beard: 'full', brow: 1.0, jaw: 1.2, mouth: 'stern', seed: 5 },
  }));
}
export function flora() {
  return cached('lmC-flora', () => human({
    detail: 0.55, body: { sex: 'f', bulk: 1.15 },
    pose: { pelvis: [0, 0.95, 0], pelvisRot: [0, -0.1, 0.04], spine: [0.0, 0.15, -0.04], head: [0.05, -0.3, 0],
      legs: { L: { foot: [0.15, 0, 0.08], pole: [0, 0, 1] }, R: { foot: [-0.15, 0, -0.06], pole: [0, 0, 1] } },
      arms: { L: { hand: [0.3, 0.8, 0.28], pole: [0.5, -0.4, -0.4], grip: 'cup' }, R: { hand: [-0.22, 0.78, 0.14], pole: [-0.6, -0.4, -0.6], grip: 'relaxed' } } },
    outfit: { torso: 'dress', hem: 0.95, flare: 0.5, folds: 0.07, sleeves: 'short', collar: 'none', cape: 'back', capeLen: 0.6 },
    face: { age: 0.3, hair: 'cap', mouth: 'closed', seed: 9 },
  }));
}

export function build(K, M, D, svc) {
  const P = K.P, ph = K.ctx.physics;
  P.push(C0.x, 0, C0.z, RN); P.push(0, 0, 53, 0);
  try {
    const w = X1 - X0, cx = (X0 + X1) / 2;
    // platform (granite base) and the 12-step stair
    P.box(M.plinth, X0, X1, 0, YP, 0, ZP, 'b'); P.box(M.graniteWarm, X0 - 0.15, X1 + 0.15, YP - 0.2, YP, 0, ZP + 0.15, 'b');
    P.quad(M.sett, [X0, YP + 0.01, 0], [X1, YP + 0.01, 0], [X1, YP + 0.01, ZP], [X0, YP + 0.01, ZP], [0, 1, 0], [[0, 0], [w / 2, 0], [w / 2, 3], [0, 3]]);
    const NS = 12, rise = YP / NS, run = 0.55;
    for (let k = 0; k < NS; k++) {
      const top = YP - rise * (k + 1), z0 = ZP + run * k, z1 = z0 + run;
      P.box(M.graniteWarm, X0 - 0.15, X1 + 0.15, 0, top, z0 - (k === 0 ? 0 : 0.0), z1, 'b');
      const c = wN(cx, (z0 + z1) / 2 + 53);
      ph.addWalkBox(c.x, c.z, w + 0.3, run, RN, top, 0);
    }
    // stair cheeks
    for (const s of [X0 - 0.15, X1 + 0.15]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(NS * run + ZP - ZP, 0); sh.lineTo(NS * run, 0); sh.lineTo(0, YP + 0.5); sh.lineTo(0, 0); void sh; P.box(M.granite, s - 0.25, s + 0.25, 0, YP + 0.7, ZP, ZP + 0.55 * 1.5, 'b'); }
    const pc = wN(cx, 53 + ZP / 2);
    ph.addWalkBox(pc.x, pc.z, w + 0.2, ZP, RN, YP, 0);
    // colonnade: 9 Tuscan columns of grey-pink marble on the front edge of the platform
    const nc = 9, cz = ZP - 1.0;
    const ys = YP + 0.0, yt = 12.3;
    const cols = [];
    for (let i = 0; i < nc; i++) {
      const x = X0 + 1.3 + (w - 2.6) * i / (nc - 1); cols.push(x);
      P.box(M.marbleLight, x - 0.75, x + 0.75, ys, ys + 0.5, cz - 0.75, cz + 0.75, 'b');
      P.cyl(M.marbleLight, [x, ys + 0.5, cz], [x, yt - 0.7, cz], 0.52, 0.45, 16, false);
      P.cyl(M.marbleLight, [x, yt - 0.7, cz], [x, yt - 0.35, cz], 0.5, 0.62, 16, true);
      P.box(M.marbleLight, x - 0.72, x + 0.72, yt - 0.35, yt, cz - 0.72, cz + 0.72, 'b');
      const c = wN(x, cz + 53); ph.addCylinder(c.x, c.z, 0.65, YP, 14);
    }
    const ex0 = X0 - 0.2, ex1 = X1 + 0.2;
    P.box(M.marbleLight, ex0, ex1, yt, yt + 1.0, 0, cz + 0.9, 'k');                                  // architrave
    P.box(M.marble, ex0 - 0.05, ex1 + 0.05, yt + 1.0, yt + 1.9, 0, cz + 0.95, 'b');                  // frieze
    P.box(M.marbleLight, ex0 - 0.4, ex1 + 0.4, yt + 1.9, yt + 2.6, 0, cz + 1.5, '');                // cornice
    // terrace balustrade over the colonnade
    P.box(M.marbleLight, ex0 - 0.4, ex1 + 0.4, yt + 2.6, yt + 2.75, cz - 0.3, cz + 1.5, 'b');
    for (let x = ex0 - 0.2; x < ex1 + 0.3; x += 0.36) P.box(M.marbleLight, x - 0.07, x + 0.07, yt + 2.75, yt + 3.6, cz + 1.0, cz + 1.2, 'tb');
    P.box(M.marbleLight, ex0 - 0.4, ex1 + 0.4, yt + 3.6, yt + 3.8, cz + 0.9, cz + 1.3, 'b');
    // back wall of the loggia: a darker panelled recess behind the columns + two doors (the real walls carry the windows)
    for (const x of [cx - 4.5, cx + 4.5]) K.gate(x, YP, 2.2, 4.2, { sw: 0.25, d: 0.12, ringMat: M.marbleLight, doorMat: K.mats.doorWood });
    // statue pedestals at the foot of the stair
    const mk = figureMats(K.ctx).keys('bronze', 'bronze');
    svc.statueSpots = [];
    for (const [x, fig, sy] of [[X0 + 0.8, hercules(), 1.85], [X1 - 0.8, flora(), 1.9]]) {
      const pz = ZP + 0.7;
      P.box(M.marbleLight, x - 1.0, x + 1.0, YP, YP + 0.6, pz - 1.0, pz + 1.0, 'b');
      P.box(M.marble, x - 0.8, x + 0.8, YP + 0.6, YP + 3.0, pz - 0.8, pz + 0.8, 'b');
      P.box(M.marbleLight, x - 0.95, x + 0.95, YP + 3.0, YP + 3.25, pz - 0.95, pz + 0.95, 'b');
      fig.place(P, mk, x, YP + 3.25, pz, 0, sy);                                              // facing north (+z of this frame is north; the figures face +z by default)
      const c = wN(x, pz + 53); ph.addBox(c.x, c.z, 2.0, 2.0, RN, YP, YP + 3.3);
    }
    // the semicircular plaza of pink granite setts in front of the stair (r 11 m beyond the lowest step), sampled against the road network
    const R = 10.5, z0 = ZP + NS * run, n = 24, pts = [];
    for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; pts.push([cx + Math.cos(a) * (w / 2 + 1.5 + R * 0.35), z0 + Math.sin(a) * R]); }
    const ring = pts.map(([lx, lz]) => { const q = wN(lx, lz + 53); return [q.x, q.z]; });
    const free = ring.every((p) => !L.isOnRoad(p[0], p[1], 1.0));
    if (free) P.cap(M.settPink, pts, 0.05, true, 3);
    svc.north = { stair: wN(cx, 53 + z0), platformY: YP };
  } finally { P.pop(); P.pop(); }
  void V; void extend;
}
