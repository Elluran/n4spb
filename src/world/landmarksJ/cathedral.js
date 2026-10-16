// landmarksJ/cathedral.js - St Isaac's Cathedral (Montferrand 1818-58), the body: stylobate with four granite steps, marble walls with the main entablature (red granite frieze) all round, the four porticos
// (N / S: 2 x 8, E / W: 8 monolithic columns of red Finnish granite, 17 m, bronze Corinthian capitals, pediments with bronze reliefs, gilded frieze lettering, coffered ceilings, bronze doors), the four
// corner bell towers (belfry with columns, pediments and a gilded cupola), statues.  The drum, dome and lantern are in drum.js.
// Dossier docs/research/admiralty-stisaac.md section 7 (+ OSM parts r3229838.., plan fit in the model frame, frame.js); photos refs/admiralty 080 085 094 095 098 099.
// Heights (calibrated on 085 / 080 / 094 / 095, see the notes in the module header of landmarksJ.js): stylobate top 1.4, portico floor 1.4, columns to 18.4 (17 m incl. base + capital), main entablature
// 18.4 - 23.2 (architrave 1.5, frieze 2.0, cornice 1.3), pediment apex 29.8, attic cornice 34.5, roof 36.0, belfry cross 66.
import * as THREE from 'three';
import { capital, figure } from './prims.js';
import { ringEdges, band, archPath } from './kit.js';
import { boxAt, cylAt, walkAt, W } from './frame.js';

/** a flat arched pane (width w, total height h, bottom y0) at depth z of the current frame: one polygon, no overlapping faces */
export function archFace(P, mat, x, y0, w, h, z) { const s = new THREE.Shape(); archPath(s, x, y0, w, Math.max(0.05, h - w / 2), false); P.face(mat, s, z, 1, 10); }
/** a half disc (flat, facing +z) of radius r whose diameter lies at height y */
export function halfDisc(P, mat, x, y, r, z) { const s = new THREE.Shape(); s.moveTo(x - r, y); s.lineTo(x + r, y); s.absarc(x, y, r, 0, Math.PI, false); P.face(mat, s, z, 1, 12); }

export const Y = { FLOOR: 1.4, COLTOP: 18.4, ARCH: 19.9, FRIEZE: 21.9, ENT: 23.2, ATTIC: 34.5, ROOF: 36.0 };
export const PLAN = { ex: 38.9, ez: 25.2, tx0: 19.4, tx1: 32.0, tz1: 33.0, pn: 40.4, pe: 47.2 };   // body half sizes, tower x-range, tower outer z, N/S portico front, E/W portico front
const xs8 = [-17.395, -12.425, -7.455, -2.485, 2.485, 7.455, 12.425, 17.395];

/** the plan outline (model frame) of the cathedral as a ring [[mx, mz]..] */
export function planRing() {
  const { ex, ez, tx0, tx1, tz1, pn, pe } = PLAN; void ex;
  return [[pe, -ez], [pe, ez], [tx1, ez], [tx1, tz1], [tx0, tz1], [tx0, pn], [-tx0, pn], [-tx0, tz1], [-tx1, tz1], [-tx1, ez], [-pe, ez], [-pe, -ez], [-tx1, -ez], [-tx1, -tz1], [-tx0, -tz1], [-tx0, -pn], [tx0, -pn], [tx0, -tz1], [tx1, -tz1], [tx1, -ez]];
}
const polyOf = (ring) => ({ o: ring.flat(), h: [] });

/** one fluted-free monolithic column of red granite with a bronze base and a bronze Corinthian capital; y0 = floor, H = total (17 m).  detail = capital scale (the leaves are the expensive part) */
export function graniteColumn(P, M, x, y0, z, H = 17, o = {}) {
  const rb = o.rb ?? 0.95, rt = o.rt ?? 0.8, cs = o.cs ?? 1.38, hb = 0.85, hc = 1.6 * cs;
  P.box(M.bronze, x - rb * 1.15, x + rb * 1.15, y0, y0 + 0.28, z - rb * 1.15, z + rb * 1.15, 'b');
  P.cyl(M.bronze, [x, y0 + 0.28, z], [x, y0 + hb, z], rb * 1.04, rb * 0.97, 14, false);
  P.cyl(M.column, [x, y0 + hb, z], [x, y0 + H - hc, z], rb, rt, o.seg ?? 18, false);
  capital(P, M.bronze, x, y0 + H - hc, z, cs);
  return y0 + H;
}

export function build(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics;
  const { ex, ez, tx0, tx1, tz1, pn, pe } = PLAN;
  const ring = planRing();
  K.cols = [];
  // ------------------------------------------------------------------------------------------------ stylobate: four steps round the whole plan + the floor of the porticos
  const edgesR = ringEdges(polyOf(ring), 0.05);
  const D = [8.28, 6.21, 4.14, 2.07];
  D.forEach((d, i) => band(P, edgesR, 0, 0.35 * (i + 1), d, { front: M.stylobate, top: M.stylobateTop }, { uvs: 2.4 }));
  P.cap(M.stylobateTop, ring, Y.FLOOR, true, 2.4);
  // walk boxes: every step tier = the union of the rectangles of the plan grown by its offset
  const rects = [[0, 0, ex * 2, ez * 2], [0, -(ez + pn) / 2, tx0 * 2, pn - ez], [0, (ez + pn) / 2, tx0 * 2, pn - ez], [(ex + pe) / 2, 0, pe - ex, ez * 2], [-(ex + pe) / 2, 0, pe - ex, ez * 2]];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rects.push([sx * (tx0 + tx1) / 2, sz * (ez + tz1) / 2, tx1 - tx0, tz1 - ez]);
  D.forEach((d, i) => { for (const [cx, cz, w, h] of rects) walkAt(ph, cx, cz, w + 2 * d, h + 2 * d, 0, 0.35 * (i + 1), -1); });
  for (const [cx, cz, w, h] of rects) walkAt(ph, cx, cz, w, h, 0, Y.FLOOR, -1);

  // ------------------------------------------------------------------------------------------------ the body: marble walls (one block + four tower masses), the main entablature, the attic
  const U = 2.4;
  P.box(M.marble, -ex, ex, 0, Y.COLTOP, -ez, ez, 'b', U);                                                  // lower walls (plinth stays inside the steps)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x0 = Math.min(sx * tx0, sx * tx1), x1 = Math.max(sx * tx0, sx * tx1), z0 = Math.min(sz * ez, sz * tz1), z1 = Math.max(sz * ez, sz * tz1);
    P.box(M.marble, x0, x1, 0, Y.COLTOP, z0, z1, 'b', U);
  }
  // body ring (walls + towers) with the entablature bands; covered edges (behind the porticos) get none
  const e2 = 22.8;
  const ringB = [[ex, -ez], [ex, -e2], [ex, e2], [ex, ez], [tx1, ez], [tx1, tz1], [tx0, tz1], [tx0, ez], [-tx0, ez], [-tx0, tz1], [-tx1, tz1], [-tx1, ez], [-ex, ez], [-ex, e2], [-ex, -e2], [-ex, -ez], [-tx1, -ez], [-tx1, -tz1], [-tx0, -tz1], [-tx0, -ez], [tx0, -ez], [tx0, -tz1], [tx1, -tz1], [tx1, -ez]];
  const eB = ringEdges(polyOf(ringB), 0.05);
  const drawB = (e) => {
    const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2;
    if (Math.abs(Math.abs(mz) - ez) < 0.01 && Math.abs(mx) < tx0) return false;                           // behind the N / S porticos
    if (Math.abs(Math.abs(mx) - ex) < 0.01 && Math.abs(mz) < e2) return false;                            // behind the E / W porticos
    return true;
  };
  band(P, eB, Y.COLTOP, Y.ARCH, 0.1, { front: M.marbleShade, top: M.marbleShade, under: M.marbleShade }, { draw: drawB });
  band(P, eB, Y.ARCH, Y.FRIEZE, 0.14, { front: M.frieze, top: M.frieze, under: M.frieze }, { draw: drawB });
  band(P, eB, Y.FRIEZE, Y.ENT - 0.4, 0.55, { front: M.cornice, top: M.cornice, under: M.marbleShade }, { draw: drawB });
  band(P, eB, Y.ENT - 0.4, Y.ENT, 1.2, { front: M.corniceHi, top: M.corniceHi, under: M.marbleShade }, { draw: drawB });
  // attic: recessed block (1.2 m in from the walls) from the cornice to 34.5, with a stepped crown cornice
  const ai = 1.3;
  P.box(M.marble, -ex + ai, ex - ai, Y.ENT, Y.ATTIC, -ez + ai, ez - ai, 'b', U);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x0 = Math.min(sx * tx0, sx * tx1) + 0.25, x1 = Math.max(sx * tx0, sx * tx1) - 0.25, zin = sz * (ez - ai), zout = sz * (tz1 - 0.25);
    const z0 = Math.min(zin, zout), z1 = Math.max(zin, zout);
    P.box(M.marble, x0, x1, Y.ENT, Y.ATTIC, z0, z1, 'b', U);
    P.box(M.cornice, x0 - 0.45, x1 + 0.45, Y.ATTIC, Y.ATTIC + 0.7, sz > 0 ? z0 : z0 - 0.45, sz > 0 ? z1 + 0.45 : z1, 'b');
    P.box(M.roof, x0 - 0.4, x1 + 0.4, Y.ATTIC + 0.7, Y.ROOF, sz > 0 ? z0 : z0 - 0.4, sz > 0 ? z1 + 0.4 : z1, 'b');
  }
  // upper cornice ring (around the whole attic block + towers, including a plain roof slab at 36)
  P.box(M.cornice, -ex + ai - 0.5, ex - ai + 0.5, Y.ATTIC, Y.ATTIC + 0.7, -ez + ai - 0.5, ez - ai + 0.5, 'b');
  P.box(M.roof, -ex + ai - 0.45, ex - ai + 0.45, Y.ATTIC + 0.7, Y.ROOF, -ez + ai - 0.45, ez - ai + 0.45, 'b');
  // pilaster strips on the attic faces (every 6.2 m) and corner pilasters
  for (const sz of [-1, 1]) for (let x = -ex + ai + 3.0; x <= ex - ai - 2.9; x += 6.4) P.box(M.corniceHi, x - 0.5, x + 0.5, Y.ENT, Y.ATTIC - 0.1, sz * (ez - ai) - (sz > 0 ? 0 : 0.34) + (sz > 0 ? 0 : 0), sz * (ez - ai) + (sz > 0 ? 0.34 : 0), 'b');
  for (const sx of [-1, 1]) for (let z = -ez + ai + 3.0; z <= ez - ai - 2.9; z += 6.4) P.box(M.corniceHi, sx * (ex - ai) - (sx > 0 ? 0 : 0.34), sx * (ex - ai) + (sx > 0 ? 0.34 : 0), Y.ENT, Y.ATTIC - 0.1, z - 0.5, z + 0.5, 'b');

  // ------------------------------------------------------------------------------------------------ porticos
  const defs = {
    N: { at: [0, -ez], rot: Math.PI, half: tx0, rows: [13.4, 6.2], rise: 6.6, text: M.textN, door: true, name: 'north' },
    S: { at: [0, ez], rot: 0, half: tx0, rows: [13.4, 6.2], rise: 6.6, text: M.textS, door: true, name: 'south' },
    E: { at: [ex, 0], rot: Math.PI / 2, half: e2, rows: [6.5], rise: 7.0, text: M.textE, door: false, piers: true, name: 'east' },
    W: { at: [-ex, 0], rot: -Math.PI / 2, half: e2, rows: [6.5], rise: 7.0, text: M.textW, door: true, piers: true, name: 'west' },
  };
  K.porticos = {};
  for (const [key, o] of Object.entries(defs)) {
    const c0 = K.cols.length;
    P.push(o.at[0], 0, o.at[1], o.rot);
    portico(K, o);
    P.pop();
    const c = Math.cos(o.rot), s = Math.sin(o.rot);
    for (let i = c0; i < K.cols.length; i++) { const [x, z] = K.cols[i]; K.cols[i] = [o.at[0] + x * c + z * s, o.at[1] - x * s + z * c]; }
    K.porticos[key] = { at: o.at, rot: o.rot, half: o.half, rows: o.rows, name: o.name };
  }
  for (const [x, z] of K.cols) cylAt(ph, x, z, 0.95, 0, 20);

  // ------------------------------------------------------------------------------------------------ walls as colliders (thin boxes, hollow inside; the porticos stay open)
  const wall = (x0, z0, x1, z1) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = Math.abs(x1 - x0) || 0.6, d = Math.abs(z1 - z0) || 0.6; boxAt(ph, cx, cz, w, d, 0, -1, 45); };
  wall(-ex, -ez, ex, -ez); wall(-ex, ez, ex, ez); wall(ex, -ez, ex, ez); wall(-ex, -ez, -ex, ez);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { wall(sx * tx0, sz * ez, sx * tx0, sz * tz1); wall(sx * tx1, sz * ez, sx * tx1, sz * tz1); wall(sx * tx0, sz * tz1, sx * tx1, sz * tz1); }

  // ------------------------------------------------------------------------------------------------ tower windows (tabernacles) on the outer faces of the corner masses
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * (tx0 + tx1) / 2;
    P.push(cx, 0, sz * tz1, sz > 0 ? 0 : Math.PI);
    tabernacle(P, M, 0, Y.FLOOR + 2.0, 2.6, 7.6);
    P.pop();
  }
  // ------------------------------------------------------------------------------------------------ pilaster strips (marble, bronze capital band) at the corners of the masses and the porticos
  const pil = (x, z, nx, nz) => {
    P.push(x, 0, z, Math.atan2(nx, nz));
    P.box(M.corniceHi, -0.62, 0.62, Y.FLOOR, Y.COLTOP - 0.2, 0, 0.34, 'b');
    P.box(M.cornice, -0.75, 0.75, Y.FLOOR, Y.FLOOR + 0.5, 0, 0.44, 'b');
    P.box(M.bronze, -0.75, 0.75, Y.COLTOP - 1.1, Y.COLTOP - 0.2, 0, 0.48, 'b');
    P.pop();
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pil(sx * (tx0 + 0.9), sz * tz1, 0, sz); pil(sx * (tx1 - 0.9), sz * tz1, 0, sz);
    pil(sx * (ex - 0.9), sz * ez, 0, sz); pil(sx * ex, sz * (ez - 0.9), sx, 0);
  }
  // ------------------------------------------------------------------------------------------------ belfries (bell towers) and statues
  const bel = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const cx = sx * 22.4, cz = sz * 27.4; belfry(K, cx, cz); bel.push([cx, cz]); }
  K.belfries = bel;
  statues(K);
  // plain flat roofs of the corner masses are covered by the attic block; the roof between the belfries is the slab at 36
  K.roofY = Y.ROOF;
  void W;
}

// ------------------------------------------------------------------------------------------------ one portico in its frame (+z out of the church, the wall at z = 0)
function portico(K, o) {
  const P = K.P, M = K.M;
  const half = o.half, rows = o.rows, front = rows[0], zf = front + 1.8, y1 = Y.COLTOP;
  const hw = half + 0.9;                                                                       // cornice half width
  // columns
  for (const z of rows) for (const x of xs8) { graniteColumn(P, M, x, Y.FLOOR, z, 17); K.cols.push([x, z]); }
  // solid end piers of the E / W porticos (rectangular marble piers, 3 m wide) + the side faces of the portico
  if (o.piers) for (const sg of [-1, 1]) {
    const a = 19.7, b = half, x0 = sg > 0 ? a : -b, x1 = sg > 0 ? b : -a;
    P.box(M.marble, x0, x1, Y.FLOOR, y1, 0, zf - 1.1, '', 2.4);
    P.box(M.bronze, x0 - 0.15, x1 + 0.15, Y.FLOOR, Y.FLOOR + 0.5, 0, zf - 0.95, 'b');
    P.box(M.bronze, x0 - 0.15, x1 + 0.15, y1 - 0.5, y1, 0, zf - 0.95, 'b');
  }
  // entablature: a solid slab (architrave / frieze / cornice faces) over the columns and back to the wall; the underside is the coffered ceiling
  P.box(M.marbleShade, -half, half, Y.COLTOP + 0.0, Y.ARCH, 0, zf, 't');
  P.box(M.frieze, -half - 0.05, half + 0.05, Y.ARCH, Y.FRIEZE, 0, zf + 0.05, 'bt');
  P.box(M.cornice, -half - 0.5, half + 0.5, Y.FRIEZE, Y.ENT - 0.4, 0, zf + 0.55, 'b');
  P.box(M.corniceHi, -half - 1.1, half + 1.1, Y.ENT - 0.4, Y.ENT, 0, zf + 1.1, 'b');
  // ceiling (5 cm below the architrave soffit: no coplanar strip with the body band)
  const cw = 2 * half, cd = zf;
  P.quad(M.coffer, [-half, Y.COLTOP - 0.05, 0.05], [half, Y.COLTOP - 0.05, 0.05], [half, Y.COLTOP - 0.05, zf], [-half, Y.COLTOP - 0.05, zf], [0, -1, 0], [[0, 0], [cw / 3, 0], [cw / 3, cd / 3], [0, cd / 3]]);
  // gilded lettering on the frieze (a plane 3 cm in front)
  P.quad(o.text, [-half + 1.2, Y.ARCH + 0.12, zf + 0.09], [half - 1.2, Y.ARCH + 0.12, zf + 0.09], [half - 1.2, Y.FRIEZE - 0.12, zf + 0.09], [-half + 1.2, Y.FRIEZE - 0.12, zf + 0.09], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  // pediment: marble prism with a recessed tympanum (bronze relief), raking cornice frame
  const rise = o.rise, apex = Y.ENT + rise, pw = hw;
  const tri = new THREE.Shape(); tri.moveTo(-pw, Y.ENT); tri.lineTo(pw, Y.ENT); tri.lineTo(0, apex); tri.lineTo(-pw, Y.ENT);
  P.extrude(M.marblePlain, tri, 0, zf + 1.1 - 0.9, 1, 4);
  const iw = pw - 1.5, ib = Y.ENT + 0.55, ia = apex - 1.35;
  const inner = new THREE.Shape(); inner.moveTo(-iw, ib); inner.lineTo(iw, ib); inner.lineTo(0, ia); inner.lineTo(-iw, ib);
  const g = new THREE.ShapeGeometry(inner, 1), pa = g.attributes.position, ua = g.attributes.uv;
  for (let i = 0; i < pa.count; i++) ua.setXY(i, (pa.getX(i) + iw) / (2 * iw), (pa.getY(i) - ib) / (ia - ib) * 0.98);
  P.geo(M.relief, g, 0, 0, zf + 1.1 - 0.86); g.dispose();
  const outer = new THREE.Shape(); outer.moveTo(-pw - 0.25, Y.ENT); outer.lineTo(pw + 0.25, Y.ENT); outer.lineTo(0, apex + 0.6); outer.lineTo(-pw - 0.25, Y.ENT);
  const hole = new THREE.Path(); hole.moveTo(-iw, ib); hole.lineTo(0, ia); hole.lineTo(iw, ib); hole.lineTo(-iw, ib); outer.holes.push(hole);
  P.extrude(M.corniceHi, outer, zf + 1.1 - 1.05, 1.05 + 0.1, 1, 4);
  // roof of the portico: two green planes from the raking cornice to the wall
  const rz0 = 0.3, rz1 = zf + 0.9;
  for (const sg of [-1, 1]) {
    const xe = sg * (pw + 0.3);
    P.quad(M.roof, [0, apex + 0.55, rz0], [xe, Y.ENT + 0.05, rz0], [xe, Y.ENT + 0.05, rz1], [0, apex + 0.55, rz1], [sg * rise / pw * 0.5, 1, 0]);
  }
  // doors in the back wall
  if (o.door) bronzeDoor(P, M, 0, Y.FLOOR, 3.7, 8.2);
  else P.box(M.marbleDark, -2.2, 2.2, Y.FLOOR, Y.FLOOR + 8.4, 0, 0.12, 'kb');
  // the statues on the pediment: evangelist on the apex, an apostle at each end (placed by statues())
  K.pedi = K.pedi || [];
  K.pedi.push({ rot: o.rot, at: o.at, apex, rise, pw, zf });
  void y1; void front;
  // niches with dark panels on the back wall (decor between the door and the end walls)
  if (!o.piers) for (const sg of [-1, 1]) {
    for (const xc of [sg * 10.2, sg * 15.2]) { P.box(M.marbleDark, xc - 1.2, xc + 1.2, Y.FLOOR + 1.5, Y.FLOOR + 7.5, 0, 0.1, 'kb'); P.box(M.glass, xc - 0.95, xc + 0.95, Y.FLOOR + 1.8, Y.FLOOR + 7.0, 0.1, 0.13, 'kb'); }
  }
}

function bronzeDoor(P, M, x, y0, w, h) {
  P.box(M.marbleDark, x - w / 2 - 0.7, x + w / 2 + 0.7, y0, y0 + h + 1.2, 0, 0.3, 'kb');
  P.quad(M.door, [x - w / 2, y0, 0.32], [x + w / 2, y0, 0.32], [x + w / 2, y0 + h, 0.32], [x - w / 2, y0 + h, 0.32], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  P.box(M.bronze, x - w / 2 - 0.12, x + w / 2 + 0.12, y0 + h, y0 + h + 0.4, 0.28, 0.4, 'kb');
  // lunette above the door: a dark bronze half disc
  halfDisc(P, M.bronze, x, y0 + h + 0.4, w / 2 + 0.4, 0.42);
}

/** a window of the tower faces: dark arched glass in a marble case between two granite columns with a bronze triangular hood (facade frame, z out) */
function tabernacle(P, M, x, y0, w, h) {
  P.box(M.marbleDark, x - w / 2 - 0.9, x + w / 2 + 0.9, y0 - 0.4, y0 + h + 0.9, 0, 0.25, 'kb');
  archFace(P, M.glass, x, y0, w, h, 0.27);
  for (const sg of [-1, 1]) {
    const xc = x + sg * (w / 2 + 0.55);
    P.cyl(M.column, [xc, y0 + 0.4, 0.55], [xc, y0 + h - 0.2, 0.55], 0.26, 0.23, 8, false);
    P.box(M.bronze, xc - 0.34, xc + 0.34, y0 + h - 0.2, y0 + h + 0.15, 0.2, 0.9, 'b');
  }
  const s = new THREE.Shape(); s.moveTo(x - w / 2 - 1.3, y0 + h + 0.15); s.lineTo(x + w / 2 + 1.3, y0 + h + 0.15); s.lineTo(x, y0 + h + 1.6); s.lineTo(x - w / 2 - 1.3, y0 + h + 0.15);
  P.extrude(M.patinaDark, s, 0.2, 0.7, 1, 4);
}

// ------------------------------------------------------------------------------------------------ one belfry
function belfry(K, cx, cz) {
  const P = K.P, M = K.M, a = 4.7;
  P.push(cx, 0, cz, 0);
  // podium with a cornice
  P.box(M.marble, -a, a, Y.ROOF, Y.ROOF + 3.0, -a, a, 'b', 2.4);
  P.box(M.cornice, -a - 0.45, a + 0.45, Y.ROOF + 3.0, Y.ROOF + 3.6, -a - 0.45, a + 0.45, 'b');
  const yb = Y.ROOF + 3.6, yc = yb + 8.2;
  // core with four arched openings (dark) and a bell inside
  P.box(M.marble, -2.7, 2.7, yb, yc, -2.7, 2.7, 'b', 2.4);
  for (let f = 0; f < 4; f++) {
    P.push(0, 0, 0, f * Math.PI / 2);
    archFace(P, M.glass, 0, yb + 1.0, 3.0, 5.2, 2.72);
    P.pop();
  }
  P.cyl(M.bronze, [0, yb + 1.8, 0], [0, yb + 3.6, 0], 1.0, 0.45, 8, true);
  // four granite columns per corner pair: 8 columns (two per corner) of the open stage
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [ox, oz] of [[0, 0], [sx * -1.5, 0], [0, sz * -1.5]]) {
    if (ox !== 0 && oz !== 0) continue;
    const x = sx * 3.9 + ox, z = sz * 3.9 + oz;
    P.cyl(M.column, [x, yb + 0.5, z], [x, yc - 1.1, z], 0.4, 0.34, 10, false);
    P.box(M.bronze, x - 0.45, x + 0.45, yb, yb + 0.5, z - 0.45, z + 0.45, 'b');
    P.box(M.bronze, x - 0.6, x + 0.6, yc - 1.1, yc, z - 0.6, z + 0.6, 'b');
  }
  // entablature + pediments
  P.box(M.marbleShade, -a, a, yc, yc + 1.2, -a, a, 'b');
  P.box(M.cornice, -a - 0.5, a + 0.5, yc + 1.2, yc + 2.0, -a - 0.5, a + 0.5, 'b');
  const yp = yc + 2.0;
  for (let f = 0; f < 4; f++) {
    P.push(0, 0, 0, f * Math.PI / 2);
    const t = new THREE.Shape(); t.moveTo(-3.6, yp); t.lineTo(3.6, yp); t.lineTo(0, yp + 2.3); t.lineTo(-3.6, yp);
    P.extrude(M.cornice, t, a - 0.3, 0.9, 1, 4);
    P.pop();
  }
  // drum, gilded dome, lantern, cross
  P.cyl(M.marble, [0, yp - 0.1, 0], [0, yp + 2.8, 0], 2.7, 2.7, 16, true);
  P.cyl(M.cornice, [0, yp + 2.8, 0], [0, yp + 3.3, 0], 3.1, 3.1, 16, true);
  const dome = [[0, 0], [3.0, 0], [3.2, 0.35], [3.1, 1.2], [2.6, 2.4], [1.7, 3.5], [0.7, 4.1], [0, 4.3]];
  const g = new THREE.LatheGeometry(dome.map((p) => new THREE.Vector2(p[0], p[1])), 20);
  P.geo(M.gold, g, 0, yp + 3.3, 0); g.dispose();
  P.cyl(M.gold, [0, yp + 7.5, 0], [0, yp + 9.0, 0], 0.55, 0.55, 8, true);
  P.geo(M.gold, new THREE.SphereGeometry(0.55, 8, 6), 0, yp + 9.4, 0);
  const t = 0.07, cy = yp + 9.8;
  P.box(M.gold, -t, t, cy, cy + 3.0, -t, t, 'b'); P.box(M.gold, -0.5, 0.5, cy + 1.9, cy + 1.9 + 2 * t, -t, t, ''); P.box(M.gold, -0.3, 0.3, cy + 2.5, cy + 2.5 + 2 * t, -t, t, '');
  K.towerTop = cy + 3.0 + Y.FLOOR * 0;
  P.pop();
}

// ------------------------------------------------------------------------------------------------ statues: evangelists on the pediment apexes, apostles at the pediment ends, angels with torches at the attic corners
function statues(K) {
  const P = K.P, M = K.M;
  for (const pd of K.pedi || []) {
    P.push(pd.at[0], 0, pd.at[1], pd.rot);
    figure(P, M.patina, 0, pd.apex + 0.35, pd.zf + 0.1, 0, 4.4, 'saint');                                        // evangelist
    P.box(M.cornice, -1.1, 1.1, pd.apex + 0.1, pd.apex + 0.5, pd.zf - 0.4, pd.zf + 0.7, 'b');
    for (const sg of [-1, 1]) { P.box(M.cornice, sg * (pd.pw + 0.1) - 0.8, sg * (pd.pw + 0.1) + 0.8, Y.ENT, Y.ENT + 0.5, pd.zf - 0.4, pd.zf + 0.9, 'b'); figure(P, M.patina, sg * (pd.pw + 0.1), Y.ENT + 0.5, pd.zf + 0.25, 0, 3.4, 'barclay'); }
    P.pop();
  }
  // angel groups with candelabra at the four corners of the attic
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 36.6, z = sz * 23.3, y = Y.ROOF;
    P.push(x, y, z, Math.atan2(sx, sz));
    P.box(M.cornice, -1.4, 1.4, 0, 1.6, -1.4, 1.4, 'b');
    P.cyl(M.bronze, [0, 1.6, 0], [0, 4.2, 0], 0.7, 0.5, 8, true);                                          // two angels: a robed body each
    P.cyl(M.bronzeDark, [-0.6, 1.6, 0], [-0.6, 5.0, 0], 0.5, 0.25, 6, true); P.cyl(M.bronzeDark, [0.6, 1.6, 0], [0.6, 5.0, 0], 0.5, 0.25, 6, true);
    for (const sw of [-1, 1]) P.quad(M.bronzeDark, [sw * 0.8, 2.8, -0.3], [sw * 2.6, 4.4, -0.4], [sw * 2.4, 6.0, -0.4], [sw * 0.8, 4.6, -0.3], [0, 0, 1]);
    P.cyl(M.bronze, [0, 4.0, 0.1], [0, 7.6, 0.1], 0.14, 0.14, 6, false);                                   // torch-candelabrum
    P.cyl(M.bronze, [0, 7.6, 0.1], [0, 8.4, 0.1], 0.5, 0.18, 8, false);
    P.pop();
  }
}
