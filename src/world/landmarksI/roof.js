// landmarksI/roof.js - everything on the roof of the Winter Palace (docs/research/palace-square-hermitage.md 7.2 / 7.4, photos 015 016 031 042 053): the pitched green iron roof strips behind the balustrade,
// ~150 statues and vases on piers (instanced geometry merged by the engine), mint chimneys with white caps, the pediments (clock on the Palace Square front, the gilded cartouche on the Neva front),
// the octagonal green-domed turret of the north-west corner, the gilded crown dome of the Great Church over the light well at the Hermitage end of the Palace Square front.  NO flagpole (user rule).
import * as THREE from 'three';
import { edgePoint, toWorld, toUV } from './frame.js';
import { HC, ROOF } from './palace.js';
import { archPath } from './kit.js';
import { chimneys } from './hip.js';

const hashv = (a, b) => { let h = 2166136261 ^ Math.floor(a * 13 + b * 71); h = Math.imul(h, 16777619); h ^= h >>> 15; return ((h >>> 0) % 1000) / 1000; };

// ------------------------------------------------------------------------------------------------ figures
/** a standing allegorical statue of ~3.3 m (variant 0..2) at the origin of the current frame, feet at y */
function statue(P, PM, y, v) {
  const m = PM.statue;
  P.box(m, -0.55, 0.55, y, y + 0.28, -0.55, 0.55, 'b');
  P.cyl(m, [0, y + 0.28, 0], [0, y + 1.7, 0], 0.5, 0.3, 8, false);                  // robe
  P.cyl(m, [0, y + 1.7, 0], [0, y + 2.35, 0], 0.3, 0.27, 8, false);                 // torso
  P.cyl(m, [0, y + 2.3, 0], [0, y + 2.5, 0], 0.1, 0.1, 6, false);                   // neck
  P.cyl(m, [0, y + 2.5, 0], [0, y + 2.85, 0], 0.17, 0.12, 6, true);                 // head
  if (v === 0) { P.cyl(m, [0.2, y + 2.2, 0], [0.5, y + 3.15, 0.05], 0.09, 0.07, 5, false); P.cyl(m, [0.5, y + 3.1, 0.05], [0.55, y + 3.45, 0.05], 0.05, 0.05, 4, true); }        // raised arm with a torch
  else if (v === 1) { P.cyl(m, [-0.34, y + 1.5, 0.15], [-0.34, y + 2.4, 0.2], 0.3, 0.3, 8, true); P.cyl(m, [0.2, y + 2.2, 0], [0.45, y + 2.8, 0.1], 0.08, 0.07, 5, false); }      // shield + arm
  else { P.cyl(m, [-0.25, y + 2.2, 0], [-0.55, y + 1.7, 0.2], 0.08, 0.07, 5, false); P.cyl(m, [0.25, y + 2.2, 0], [0.55, y + 3.0, 0], 0.08, 0.07, 5, false); P.box(m, 0.5, 0.6, y + 2.9, y + 3.5, -0.03, 0.03); }
}
/** an urn of ~2.4 m on a plinth */
function vase(P, PM, y) {
  const m = PM.statue;
  P.box(m, -0.5, 0.5, y, y + 0.25, -0.5, 0.5, 'b');
  P.cyl(m, [0, y + 0.25, 0], [0, y + 0.55, 0], 0.32, 0.28, 8, false);
  P.cyl(m, [0, y + 0.55, 0], [0, y + 1.35, 0], 0.28, 0.58, 8, false);
  P.cyl(m, [0, y + 1.35, 0], [0, y + 1.85, 0], 0.58, 0.4, 8, false);
  P.cyl(m, [0, y + 1.85, 0], [0, y + 2.05, 0], 0.4, 0.46, 8, true);
  P.cyl(m, [0, y + 2.05, 0], [0, y + 2.45, 0], 0.2, 0.04, 6, true);
}

/** a reclining allegorical figure on the raking cornice of a pediment (frame of the facade: x along, y up, z out).  sx = +1 / -1: which side of the pediment centre (the head is toward the centre) */
function reclining(P, PM, x, y, z, sx, slope) {
  const m = PM.statue, a = Math.atan(slope);
  const dx = -sx, c = Math.cos(a), s = Math.sin(a);                         // direction head-ward (toward the centre, rising)
  P.box(m, x - 1.5, x + 1.5, y - 0.05, y + 0.35, z - 0.6, z + 0.6, 'b');
  const p0 = [x - dx * 1.6 * c, y + 0.35 - 1.6 * s * -1 * -1, z], p1 = [x + dx * 0.9 * c, y + 0.35 + 0.9 * s, z];
  P.cyl(m, [x - dx * 1.5 * c, y + 0.7 - 1.5 * s, z], [x + dx * 0.4 * c, y + 0.7 + 0.4 * s, z], 0.38, 0.45, 8, true);       // legs + drapery
  P.cyl(m, [x + dx * 0.3 * c, y + 0.95 + 0.3 * s, z], [x + dx * 0.9 * c, y + 1.75 + 0.9 * s, z], 0.45, 0.36, 8, true);     // torso, raised
  P.geo(m, new THREE.SphereGeometry(0.28, 7, 5), x + dx * 0.95 * c, y + 2.15 + 0.9 * s, z + 0.05);                         // head
  P.cyl(m, [x + dx * 0.7 * c, y + 1.5 + 0.7 * s, z + 0.1], [x + dx * 0.1 * c, y + 0.65 + 0.1 * s, z + 0.5], 0.14, 0.12, 5, false);  // propped arm
  void p0; void p1;
}
/** an armour trophy on a pier: helmet, shield, crossed spears (roofline groups beside the central pediment) */
function trophy(P, PM, x, y, z) {
  const m = PM.statue;
  P.box(PM.white, x - 0.7, x + 0.7, y, y + 1.0, z - 0.7, z + 0.7, 'b');
  P.cyl(m, [x, y + 1.0, z], [x, y + 2.0, z], 0.55, 0.42, 8, true);                                   // cuirass
  P.geo(m, new THREE.SphereGeometry(0.4, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), x, y + 2.0, z);      // helmet
  P.cyl(m, [x, y + 2.35, z], [x, y + 2.9, z], 0.08, 0.04, 4, true);                                  // crest
  P.cyl(m, [x, y + 1.4, z + 0.55], [x, y + 1.4, z + 0.62], 0.55, 0.55, 10, true);                    // round shield
  for (const sx of [-1, 1]) P.cyl(m, [x - sx * 0.35, y + 1.0, z - 0.1], [x + sx * 0.5, y + 3.0, z - 0.1], 0.04, 0.02, 4, true);      // spears
}

export function buildRoof(K, PM, ctx, svc) {
  const P = K.P, spots = svc.statueSpots, edges = svc.edges || [];
  // ---- piers + statues / vases
  let n = 0;
  for (const s of spots) {
    const [x, z] = s.at;
    P.push(x, 0, z, s.rot);
    P.box(PM.white, -0.55, 0.55, HC, HC + 1.25, -0.55, 0.55, 'b');
    P.box(PM.whiteShade, -0.65, 0.65, HC + 1.2, HC + 1.35, -0.65, 0.65, 'b');
    if (s.kind === 'statue') statue(P, PM, HC + 1.35, Math.floor(hashv(x, z) * 3)); else vase(P, PM, HC + 1.35);
    P.pop(); n++;
  }
  svc.statues = n;
  // ---- pitched green iron roof strips behind the balustrade + chimneys
  chimneys(P, PM.chimney, PM.white, svc.roofH, edges.filter((x) => !(x.cls.style === 'P')).map((x) => x.e), { gap: 7.0, inset: 4.6, minLen: 9 });
  // ---- pediments
  const find = (pred) => edges.find((x) => pred(x.e, x.f, x.cls));
  const pediment = (item, lx, w, h, o = {}) => {
    if (!item) return;
    K.onEdgeFn(item.e, () => {
      const y0 = HC + 0.9, z0 = 0.6, d = 1.3;
      const sh = new THREE.Shape(); sh.moveTo(lx - w / 2, y0); sh.lineTo(lx + w / 2, y0); sh.lineTo(lx, y0 + h); sh.lineTo(lx - w / 2, y0);
      P.extrude(PM.white, sh, z0 - d, d, 1, 4);
      // tympanum (mint) slightly recessed
      const t = new THREE.Shape(); const k = 0.82, e0 = 0.45; t.moveTo(lx - w / 2 * k, y0 + 0.35); t.lineTo(lx + w / 2 * k, y0 + 0.35); t.lineTo(lx, y0 + h * k - 0.1 + e0 * 0); t.lineTo(lx - w / 2 * k, y0 + 0.35);
      P.face(PM.wall, t, z0 + 0.04, 1, 4);
      if (o.clock) K.plane(PM.clock, lx - 1.1, lx + 1.1, y0 + 0.65, y0 + 2.85, z0 + 0.1);
      if (o.cart) K.plane(PM.bigCart, lx - 2.0, lx + 2.0, y0 + 0.5, y0 + 3.5, z0 + 0.08);
      // raking cornice (gold lines) and acroteria
      P.box(PM.gold, lx - 0.4, lx + 0.4, y0 + h, y0 + h + 0.35, z0 - 0.2, z0 + 0.2, 'b');
      if (o.statues) for (const sx of [-1, 1]) reclining(P, PM, lx + sx * w * 0.3, y0 + h * 0.4 + 0.1, z0 - 0.2, sx, h / (w / 2));
      if (o.trophies) for (const sx of [-1, 1]) trophy(P, PM, lx + sx * (w / 2 + 7.0), HC, z0 - 0.4);
    });
  };
  // Palace Square front: the clock pediment over the three gateways
  const sCentral = find((e, f, c) => c.style === 'S' && e.len > 70 && e.len < 85);
  if (sCentral) { pediment(sCentral, sCentral.e.len / 2, 13, 3.4, { clock: true, statues: true, trophies: true }); crownOnDrum(K, PM, sCentral); }
  // Neva front: central pediment with the big gilded cartouche, two end pediments
  const nPorch = find((e, f, c) => c.style === 'N' && e.len > 20 && e.len < 25);
  if (nPorch) pediment(nPorch, nPorch.e.len / 2, 18, 3.9, { cart: true, statues: true });
  for (const x of edges) {
    if (x.cls.style === 'N' && x.e.len > 50) pediment(x, x.e.len / 2, 10, 2.6, { cart: false });
    if (x.cls.style === 'W' && x.e.len > 25) pediment(x, x.e.len / 2, 10, 2.5, {});
  }
  // ---- NW corner turret (octagon, green dome, gilded eagle) and the Great Church crown
  turret(K, PM, ...toWorld(-262, 92));
  church(K, PM, ...toWorld(-133.5, -87.5));
}

/** a small mint drum with a gilded crown over the clock pediment of the Palace Square front */
function crownOnDrum(K, PM, item) {
  const P = K.P;
  K.onEdgeFn(item.e, (len) => {
    const x = len / 2, z = -2.5, y0 = ROOF;
    P.cyl(PM.wall, [x, y0, z], [x, y0 + 7.6, z], 1.7, 1.6, 10, true);
    P.cyl(PM.white, [x, y0 + 7.6, z], [x, y0 + 8.1, z], 1.9, 1.9, 10, true);
    P.cyl(PM.goldBright, [x, y0 + 8.1, z], [x, y0 + 8.9, z], 1.5, 1.2, 8, false);                   // crown band
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; P.cyl(PM.goldBright, [x + Math.cos(a) * 1.3, y0 + 8.9, z + Math.sin(a) * 1.3], [x, y0 + 10.4, z], 0.12, 0.05, 4, false); }
    P.cyl(PM.goldBright, [x, y0 + 10.2, z], [x, y0 + 10.9, z], 0.35, 0.05, 6, true);
  });
}

function turret(K, PM, x, z) {
  const P = K.P, y0 = ROOF, r = 4.8;
  P.push(x, 0, z, Math.PI / 8);
  P.cyl(PM.wall, [0, y0, 0], [0, y0 + 7.4, 0], r, r, 8, true);
  P.cyl(PM.white, [0, y0 + 7.0, 0], [0, y0 + 7.8, 0], r + 0.45, r + 0.45, 8, true);
  P.cyl(PM.white, [0, y0, 0], [0, y0 + 0.9, 0], r + 0.3, r + 0.3, 8, true);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    P.cyl(PM.white, [Math.cos(a) * r * 1.0, y0 + 0.9, Math.sin(a) * r * 1.0], [Math.cos(a) * r * 1.0, y0 + 7.0, Math.sin(a) * r * 1.0], 0.34, 0.34, 6, false);
  }
  for (let i = 0; i < 8; i++) {                                   // gold cartouche + window on each face
    const a = i * Math.PI / 4, ap = r * Math.cos(Math.PI / 8) + 0.04;
    P.push(Math.sin(a) * ap, 0, Math.cos(a) * ap, a);
    K.plane(PM.cart, -1.1, 1.1, y0 + 5.4, y0 + 6.5, 0);
    K.window({ x: 0, y: y0 + 1.7, w: 1.2, h: 2.4, head: 'arch', sw: 0.2, d: 0.08, sill: false, frame: 'white', surMat: PM.white, v: i % 4 });
    P.pop();
  }
  P.cyl(PM.roofGreen, [0, y0 + 7.8, 0], [0, y0 + 9.6, 0], r + 0.1, r * 0.8, 8, false);
  P.cyl(PM.roofGreen, [0, y0 + 9.6, 0], [0, y0 + 10.9, 0], r * 0.8, 0.5, 8, true);
  P.cyl(PM.goldBright, [0, y0 + 10.8, 0], [0, y0 + 11.4, 0], 0.3, 0.3, 6, false);
  // the gilded eagle: two crossed alpha planes
  for (const ry of [0, Math.PI / 2]) { P.push(0, y0 + 11.4, 0, ry); K.plane(PM.eagle, -1.2, 1.2, 0, 2.4, 0); P.pop(); }
  P.pop();
}

function church(K, PM, x, z) {
  const P = K.P, y0 = ROOF + 0.0;
  P.push(x, 0, z, 0);
  P.cyl(PM.wall, [0, y0, 0], [0, y0 + 5.2, 0], 3.7, 3.5, 12, true);
  P.cyl(PM.white, [0, y0 + 4.8, 0], [0, y0 + 5.5, 0], 4.0, 4.0, 12, true);
  P.cyl(PM.white, [0, y0, 0], [0, y0 + 1.0, 0], 4.3, 4.3, 12, true);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P.cyl(PM.white, [Math.cos(a) * 3.6, y0 + 1.0, Math.sin(a) * 3.6], [Math.cos(a) * 3.6, y0 + 4.8, Math.sin(a) * 3.6], 0.28, 0.28, 6, false); }
  // the imperial-crown dome (photo 067): a gilded drum, a swelling crown with eight ribs, an orb and a cross (total ~14 m above the roof)
  P.cyl(PM.goldBright, [0, y0 + 5.5, 0], [0, y0 + 6.4, 0], 3.4, 3.0, 12, false);
  const geo = new THREE.SphereGeometry(3.0, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  P.geo(PM.goldBright, geo, 0, y0 + 6.4, 0, 0, 0, 0, 1, 1.45, 1); geo.dispose();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P.cyl(PM.gold, [Math.cos(a) * 3.05, y0 + 6.5, Math.sin(a) * 3.05], [Math.cos(a) * 0.5, y0 + 10.5, Math.sin(a) * 0.5], 0.16, 0.1, 4, false); }
  P.cyl(PM.goldBright, [0, y0 + 10.4, 0], [0, y0 + 10.9, 0], 0.6, 0.4, 8, true);
  P.geo(PM.goldBright, new THREE.SphereGeometry(0.5, 8, 6), 0, y0 + 11.3, 0);
  P.box(PM.goldBright, -0.07, 0.07, y0 + 11.7, y0 + 13.8, -0.07, 0.07); P.box(PM.goldBright, -0.6, 0.6, y0 + 12.9, y0 + 13.05, -0.06, 0.06);
  P.pop();
}

/** pitched iron-roof wedges (rise 20 %) along the long edges of a building + chimneys: list = [{ e, f }] (kit edges + frames), y0 = the roof plane just above the cornice */
export function strips(K, PM, list, y0, o = {}) {
  const P = K.P, chim = o.chimney || PM.chimney, mat = o.mat || PM.roof;
  for (const { e } of list) {
    if (e.len < (o.minLen ?? 14)) continue;
    const D = Math.min(o.maxD ?? 13, e.len * 0.4), rise = D * 0.2;
    K.onEdgeFn(e, (len) => {
      const ya = y0 + 0.02, yr = ya + rise, z0 = o.inset ?? -1.2, z1 = z0 - D;
      P.quad(mat, [0, ya, z0], [len, ya, z0], [len, yr, z1], [0, yr, z1], [0, 0.97, 0.2], [[0, 0], [len / 4, 0], [len / 4, D / 4], [0, D / 4]]);
      P.quad(mat, [len, ya, z1], [0, ya, z1], [0, yr, z1], [len, yr, z1], [0, 0, 1], [[0, 0], [len / 4, 0], [len / 4, 1], [0, 1]]);
      P.fan(mat, [[0, ya, z0], [0, yr, z1], [0, ya, z1]], [-1, 0, 0]);
      P.fan(mat, [[len, ya, z1], [len, yr, z1], [len, ya, z0]], [1, 0, 0]);
      if (o.chimneys === false) return;
      const k = Math.max(1, Math.round(len / 15));
      for (let i = 0; i < k; i++) {
        const cx = len * (i + 0.5) / k + (hashv(len, i) - 0.5) * 3, cz = z0 - 2.0 - hashv(i, len) * 3, w = 0.8 + hashv(i, 3) * 0.3, hh = 2.4 + hashv(len, 7) * 0.8;
        const yb = ya + rise * (-(cz - z0) / D);
        P.box(chim, cx - w, cx + w, yb - 0.1, yb + hh, cz - w, cz + w, 'b');
        P.box(PM.white, cx - w - 0.12, cx + w + 0.12, yb + hh, yb + hh + 0.22, cz - w - 0.12, cz + w + 0.12, 'b');
      }
    });
  }
}
