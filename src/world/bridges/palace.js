// bridges/palace.js - the Palace Bridge (Дворцовый мост, 1912-16) over the Neva, COMPLETE from the Admiralty bank to the Spit of Vasilievsky Island: five spans (38.63 + 47.12 | 9.20 + 58.60 + 9.20
// bascule | 47.12 + 38.63 m, 254.5 m between the abutments), steel lens-shaped (fish-belly) girders painted dark green (#4b6a55 lit) under a humped deck 27.7 m between the railings (roadway 22.0 m,
// 3 + 3 lanes, a granite barrier kerb 0.45 m, 2 x 2.85 m asphalt pavements), pink-grey granite piers measured on the OSM deck relation r3283437: two slim piers (u 38.1-41.1, 209.3-212.3: rounded
// cutwaters on a wider base drum, pedestal blocks up to the parapet level) and two massive bascule piers (u 85.3-96.5, 153.9-165.1) with ROUND TOWERS beyond both faces (cornice ring, a small window
// with a keystone, a balcony with a solid granite parapet and a dark green booth with a pyramid roof), solid granite parapets over the bascule piers, cast-iron railing panels (palmette frieze, 14
// vase balusters, arched bottom band, a BLANK hexagon / ring medallion: no emblem), 16 dark green lamp standards with two lanterns, abutment faces under the deck and wing walls at both bank lines.
// docs/research/west-canals-bridges.md 4.8, palace-square-hermitage.md section 10, petro-bridges.md section 2; photos refs/canals 55-63 106, refs/petro-bridges 19 20 23 24.  The bascule is shown
// closed (summer day).  Frame: origin = the middle of the Admiralty-end abutment, +u along the bridge toward Vasilyevsky Island (bearing 323.5), +v to the NE (upstream); the bank lines are at
// u 1.5 and 251.0.  Deck profile: +0.05 at both bank lines, +2.4 at the bascule [E]; girder depths [E].
import * as THREE from 'three';
import { frameOf, toUV, frameBounds } from './sites.js';
import { lampBlack } from './sculpt.js';
import { profile, closeBank } from './deck.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const PALACE = { id: 'palace', cx: -2339.5, cz: -875.0, b: 323.5 };
const LEN = 254.5, HW = 13.85, ROAD = 11.0;
const EDGES = [0, 38.63, 85.75, 162.75, 209.87, LEN];                   // abutment | pier | pier | pier | pier | abutment
const PIERS = [[38.1, 41.1, 'slim'], [85.3, 96.5, 'tower'], [153.9, 165.1, 'tower'], [209.3, 212.3, 'slim']];     // pier bodies measured on the OSM deck relation r3283437 (the bascule piers carry round towers)
const BANK0 = 1.5, BANK1 = 251.0, KERB = 0.3, PAVE = 0.12;            // the bank lines on the axis; the granite barrier kerb; the pavement lift
const DEPTH = [[1.2, 2.1], [1.2, 3.1], [1.2, 2.9], [1.2, 3.1], [1.2, 2.1]];   // girder depth at the supports / at mid-span

export function buildPalace(env) {
  const { ctx, P, M, rails } = env, f = frameOf(PALACE), T = f.T, waterY = env.waterY, FI = M.fasPalace || M.fasIron;
  // +0.05 at both bank lines (no step against the street), +2.4 at the bascule (until 2026-10-06 a parabola that began 0.25 m above the street)
  const yDeck = profile([[BANK0 - 1, 0.05], [26, 0.78], [72, 1.95], [LEN / 2, 2.4], [182.5, 1.95], [228.5, 0.78], [BANK1 + 1, 0.05]]);
  const slope = (u) => yDeck(u + 0.5) - yDeck(u - 0.5);
  const world = (u, v) => ({ x: f.cx + u * f.c - v * f.s, z: f.cz + u * f.s + v * f.c });
  const B = { id: 'palace', x: f.cx + LEN / 2 * f.c, z: f.cz + LEN / 2 * f.s, yDeck, info: { rails: 0, colliders: 0 }, masts: [], span: { a: world(0, 0), b: world(LEN, 0), hw: HW } };
  B.at = world(LEN / 2, 12.6);                                        // photo spot: the upstream pavement at the bascule (the fortress ahead)
  B.bounds = frameBounds(PALACE, -1, LEN + 1, -HW - 0.3, HW + 0.3, 1.5);
  B.deckAt = (x, z) => { const q = toUV(PALACE, x, z); return Math.abs(q.v) <= HW + 0.3 && q.u >= -1 && q.u <= LEN + 1 ? yDeck(clamp(q.u, 0, LEN)) : null; };
  const spanOf = (u) => { for (let k = 0; k < EDGES.length - 1; k++) if (u <= EDGES[k + 1] + 1e-6) return k; return EDGES.length - 2; };
  const girderBottom = (u) => {                                         // y of the lower chord
    const k = spanOf(u), a = EDGES[k], b = EDGES[k + 1], t = (u - (a + b) / 2) / ((b - a) / 2), [d0, d1] = DEPTH[k];
    return yDeck(u) - 0.45 - (d0 + (d1 - d0) * (1 - t * t));
  };
  const faceShape = (mat, pts, v, sg, tile = 2.2) => {
    const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ShapeGeometry(sh, 1), pa = g.attributes.position, ua = g.attributes.uv, na = g.attributes.normal;
    for (let i = 0; i < pa.count; i++) { ua.setXY(i, pa.getX(i) / tile, pa.getY(i) / tile); na.setZ(i, sg); }
    if (sg < 0) { const ix = g.index; for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a); } }
    P.geo(mat, g, 0, 0, v); g.dispose();
  };
  const ironHex = '#45664f', ironMat = ctx.mat.toon(ironHex, { paint: 0.03, name: 'brg-palace-rail' });

  P.push(f.cx, 0, f.cz, -T);
  // ------------------------------------------------------------------ girders: per span a fascia face on both sides, the soffit and the flange line
  for (let k = 0; k < EDGES.length - 1; k++) {
    const a = EDGES[k], b = EDGES[k + 1], n = Math.max(6, Math.round((b - a) / 3));
    for (const sg of [-1, 1]) {
      const v = sg * (HW + 0.12), pts = [];
      for (let i = 0; i <= n; i++) { const u = a + (b - a) * i / n; pts.push([u, girderBottom(u)]); }
      for (let i = n; i >= 0; i--) { const u = a + (b - a) * i / n; pts.push([u, yDeck(u) - 0.32]); }
      faceShape(FI, pts, v, sg);
      // cornice cap + a lighter bottom flange line
      for (let i = 0; i < n; i++) {
        const u0 = a + (b - a) * i / n, u1 = a + (b - a) * (i + 1) / n, y0 = yDeck(u0), y1 = yDeck(u1);
        P.quad(M.copingDark, [u0, y0 - 0.32, v + sg * 0.1], [u1, y1 - 0.32, v + sg * 0.1], [u1, y1 + 0.0, v + sg * 0.1], [u0, y0 + 0.0, v + sg * 0.1], [0, 0, sg]);
        P.quad(M.copingDark, [u0, y0, v + sg * 0.1], [u1, y1, v + sg * 0.1], [u1, y1, v - sg * 0.4], [u0, y0, v - sg * 0.4], [0, 1, 0]);
        P.quad(FI, [u0, girderBottom(u0) - 0.12, v + sg * 0.05], [u1, girderBottom(u1) - 0.12, v + sg * 0.05], [u1, girderBottom(u1), v + sg * 0.05], [u0, girderBottom(u0), v + sg * 0.05], [0, 0, sg]);
        P.quad(M.soffitIron, [u0, girderBottom(u0), -HW - 0.12], [u1, girderBottom(u1), -HW - 0.12], [u1, girderBottom(u1), HW + 0.12], [u0, girderBottom(u0), HW + 0.12], [0, -1, 0]);
      }
    }
    // inner girders: 8 per span seen from below as dark ribs on the soffit
    if (true) for (let g = -3; g <= 3; g++) {
      const v = g * 3.6 + 0.0; if (Math.abs(v) < 0.1) continue;
      for (let i = 0; i < n; i++) { const u0 = a + (b - a) * i / n, u1 = a + (b - a) * (i + 1) / n; P.quad(FI, [u0, girderBottom(u0) - 0.35, v - 0.1], [u1, girderBottom(u1) - 0.35, v - 0.1], [u1, girderBottom(u1) - 0.35, v + 0.1], [u0, girderBottom(u0) - 0.35, v + 0.1], [0, -1, 0]); }
    }
  }
  // ------------------------------------------------------------------ piers (pink-grey granite): two slim piers with rounded cutwaters and pedestal blocks, two massive bascule piers with round
  // towers beyond both faces (cornice ring, a balcony with a solid parapet, a small window, a dark green booth with a pyramid roof), abutment faces under the deck at both bank lines
  const gran = M.granitePink || M.palacePier, par = M.parapetPink || M.parapet, yb = -4.7, HVP = HW + 0.45;
  const nose = (mat, pm, sg, vc, R, rv, y0, y1, seg = 10, cap = M.coping) => {
    for (let i = 0; i < seg; i++) {
      const a0 = Math.PI * i / seg, a1 = Math.PI * (i + 1) / seg, p0 = [pm - Math.cos(a0) * R, sg * (vc + Math.sin(a0) * rv)], p1 = [pm - Math.cos(a1) * R, sg * (vc + Math.sin(a1) * rv)], am = (a0 + a1) / 2;
      P.quad(mat, [p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], [-Math.cos(am), 0, sg * Math.sin(am)], [[a0 * R / 2.2, y0 / 2.2], [a1 * R / 2.2, y0 / 2.2], [a1 * R / 2.2, y1 / 2.2], [a0 * R / 2.2, y1 / 2.2]]);
      if (cap) P.fan(cap, [[pm, y1, sg * vc], [p0[0], y1, p0[1]], [p1[0], y1, p1[1]]], [0, 1, 0]);
    }
  };
  const blocks = [];                                                  // granite blocks in the railing line over the piers [u0, u1]
  for (const [pa, pb, kind] of PIERS) {
    const pm = (pa + pb) / 2, hu = (pb - pa) / 2, deckTop = yDeck(pm) + PAVE;
    if (kind === 'tower') {
      const top = deckTop - 0.02;
      P.box(gran, pa, pb, yb, yDeck(pm) - 1.3, -HVP, HVP, 'tbfk', 2.2);
      for (const sg of [-1, 1]) {
        faceShape(gran, [[pa, yb], [pb, yb], [pb, yDeck(pb) + PAVE - 0.02], [pa, yDeck(pa) + PAVE - 0.02]], sg * HVP, sg);
        nose(gran, pm, sg, HVP, hu, 6.4, yb, top, 14);
        nose(M.coping, pm, sg, HVP, hu + 0.2, 6.6, top - 1.75, top - 1.45, 14);
        nose(par, pm, sg, HVP, hu, 6.4, top, top + 1.0, 14);
        const wv = sg * (HVP + 6.42);                                                                                   // the small window with its keystone on the nose of the tower
        P.box(M.soffitDark, pm - 0.45, pm + 0.45, top - 4.0, top - 2.9, Math.min(wv, wv + sg * 0.05), Math.max(wv, wv + sg * 0.05), 'b', 1);
        P.box(M.coping, pm - 0.6, pm + 0.6, top - 2.9, top - 2.72, Math.min(wv, wv + sg * 0.1), Math.max(wv, wv + sg * 0.1), '', 1);
        const bv = sg * (HVP + 2.7), by = top;                                                                          // the booth on the balcony
        P.box(M.fasForest, pm - 1.25, pm + 1.25, by, by + 2.5, bv - 1.25, bv + 1.25, 'b', 1.5);
        P.push(pm, by + 2.5, bv, Math.PI / 4); P.cyl(FI, [0, 0, 0], [0, 1.2, 0], 2.05, 0.05, 4, true); P.pop();
        for (const s2 of [-1, 1]) P.box(M.darkGlass || M.soffitDark, pm + s2 * 1.26 - 0.02, pm + s2 * 1.26 + 0.02, by + 1.0, by + 1.9, bv - 0.7, bv + 0.7, '', 1);
      }
      blocks.push([pa - 0.2, pb + 0.2]);
    } else {
      const top = yDeck(pm) - 1.2;
      P.box(gran, pa, pb, yb, top, -HVP, HVP, 'tb', 2.2);
      for (const sg of [-1, 1]) {
        nose(gran, pm, sg, HVP, hu + 0.9, 3.0, yb, waterY + 1.3, 10);                                                    // the base drum wider than the shaft
        nose(gran, pm, sg, HVP, hu + 0.25, 2.2, waterY + 1.3, top - 0.5, 10);
        const v0 = sg * (HW - 0.36), v1 = sg * (HVP + 0.55);
        P.box(gran, pm - 1.4, pm + 1.4, top - 0.5, deckTop + 1.1, Math.min(v0, v1), Math.max(v0, v1), 'b', 2.2);
        P.box(M.coping, pm - 1.48, pm + 1.48, deckTop + 1.1, deckTop + 1.24, Math.min(v0, v1) - 0.08, Math.max(v0, v1) + 0.08, '', 1.4);
      }
      blocks.push([pm - 1.4, pm + 1.4]);
    }
  }
  for (const [uu, nx] of [[BANK0, 1], [BANK1, -1]]) P.quad(gran, [uu + nx * 0.1, yb, -HVP], [uu + nx * 0.1, yb, HVP], [uu + nx * 0.1, yDeck(uu) - 0.3, HVP], [uu + nx * 0.1, yDeck(uu) - 0.3, -HVP], [nx, 0, 0], [[-HVP / 2.2, yb / 2.2], [HVP / 2.2, yb / 2.2], [HVP / 2.2, 0], [-HVP / 2.2, 0]]);
  for (const [uu, dir] of [[BANK0, 1], [BANK1, -1]]) for (const sg of [-1, 1]) closeBank({ site: PALACE, P, M, L: ctx.L, u: uu, dir, sg, v0: HVP, len: 2.4, yTop: 0.05, mat: gran, parapet: par, collide: false, rails });
  // ------------------------------------------------------------------ deck: asphalt, kerbs, granite pavements, markings
  const n = Math.ceil(LEN / 3.2);
  for (let i = 0; i < n; i++) {
    const u0 = LEN * i / n, u1 = LEN * (i + 1) / n, y0 = yDeck(u0), y1 = yDeck(u1);
    P.quad(M.asphalt, [u0, y0, -ROAD], [u1, y1, -ROAD], [u1, y1, ROAD], [u0, y0, ROAD], [0, 1, 0], [[u0 / 4, -ROAD / 4], [u1 / 4, -ROAD / 4], [u1 / 4, ROAD / 4], [u0 / 4, ROAD / 4]]);
    for (const sg of [-1, 1]) {
      const va = sg * ROAD, vb = sg * (HW + 0.1);
      const vk = sg * (ROAD + KERB), um = (u0 + u1) / 2, kh = um < BANK0 + 3 || um > BANK1 - 3 ? PAVE : 0.45;          // granite barrier kerb 0.45 m (asphalt pavements)
      P.quad(M.footAsphalt, [u0, y0 + PAVE, vk], [u1, y1 + PAVE, vk], [u1, y1 + PAVE, vb], [u0, y0 + PAVE, vb], [0, 1, 0], [[u0 / 2.4, vk / 2.4], [u1 / 2.4, vk / 2.4], [u1 / 2.4, vb / 2.4], [u0 / 2.4, vb / 2.4]]);
      P.quad(M.kerb, [u0, y0, va], [u1, y1, va], [u1, y1 + kh, va], [u0, y0 + kh, va], [0, 0, -sg], [[u0, 0], [u1, 0], [u1, kh], [u0, kh]]);
      P.quad(M.kerb, [u0, y0 + kh, va], [u1, y1 + kh, va], [u1, y1 + kh, vk], [u0, y0 + kh, vk], [0, 1, 0], [[u0, 0], [u1, 0], [u1, KERB], [u0, KERB]]);
      if (kh > PAVE) P.quad(M.kerb, [u0, y0 + PAVE, vk], [u1, y1 + PAVE, vk], [u1, y1 + kh, vk], [u0, y0 + kh, vk], [0, 0, sg], [[u0, 0], [u1, 0], [u1, kh], [u0, kh]]);
    }
    const mk = (vc, hw, mat = M.mark) => P.quad(mat, [u0, y0 + 0.03, vc - hw], [u1, y1 + 0.03, vc - hw], [u1, y1 + 0.03, vc + hw], [u0, y0 + 0.03, vc + hw], [0, 1, 0]);
    mk(-0.12, 0.06); mk(0.12, 0.06);
    if (i % 3 !== 2) for (const vc of [-7.3, -3.65, 3.65, 7.3]) mk(vc, 0.06);
  }
  // ------------------------------------------------------------------ railing panels (instanced) + posts, both sides, bank to bank
  const nb = Math.round(LEN / 2.0), bw = LEN / nb;
  for (const sg of [-1, 1]) {
    const v = sg * (HW - 0.14);
    const inBlock = (ua, ub) => blocks.some((q) => ub > q[0] + 0.05 && ua < q[1] - 0.05);
    for (let i = 0; i < nb; i++) {
      const ua = bw * i, w = world(ua + 0.04, v); if (inBlock(ua, ua + bw)) continue;
      rails.add({ kind: 'palace', hex: ironHex, x: w.x, y: yDeck(ua) + 0.1, z: w.z, rotY: -T, roll: Math.atan(slope(ua + bw / 2)), len: bw - 0.08 }); B.info.rails++;
    }
    for (let i = 0; i <= nb; i++) { const u = bw * i, y = yDeck(u); if (blocks.some((q) => u > q[0] + 0.2 && u < q[1] - 0.2)) continue; P.box(ironMat, u - 0.12, u + 0.12, y, y + 1.3, v - 0.12, v + 0.12, 'b', 1); P.box(ironMat, u - 0.16, u + 0.16, y + 1.25, y + 1.34, v - 0.16, v + 0.16, 'b', 1); }
    for (let i = 0; i < nb; i++) { const ua = bw * i, ub = ua + bw, ya = yDeck(ua) + 1.2, yb2 = yDeck(ub) + 1.2; if (inBlock(ua, ub)) continue; P.quad(ironMat, [ua, ya, v - 0.05], [ub, yb2, v - 0.05], [ub, yb2, v + 0.05], [ua, ya, v + 0.05], [0, 1, 0]); }
    for (const [pa, pb, kind] of PIERS) if (kind === 'tower') {        // solid granite parapet over a bascule pier: breakable sections of 2.8 m (bridges/rails.js; docs/AREAS.md 13.7)
      const u0 = pa - 0.2, u1 = pb + 0.2, h = 1.1, nS = Math.max(1, Math.ceil((u1 - u0) / 2.8));
      for (let k = 0; k < nS; k++) {
        const ua = u0 + (u1 - u0) * k / nS, ub = u0 + (u1 - u0) * (k + 1) / nS, p = world(ua, v), q = world(ub, v);
        rails.parapet({ x0: p.x, z0: p.z, x1: q.x, z1: q.z, y: yDeck(ua) + PAVE - 0.05, ye: yDeck(ub) + PAVE - 0.05, h: h + 0.05, th: 0.5, mat: par, box: true, center: true });
      }
    }
    // lamp standards: dark green poles with two hexagonal lanterns, 8 per side
    for (const u of [4, 36.2, 83.6, 111, 137.5, 166.8, 214.2, 248.5]) {
      const y = yDeck(u) + 0.12, x = u, z = sg * (HW - 0.7); B.masts.push({ ...world(x, z), y, h: 7.6, kind: 'lamp' });
      P.cyl(FI, [x, y, z], [x, y + 0.7, z], 0.26, 0.17, 8, true);
      P.cyl(FI, [x, y + 0.7, z], [x, y + 7.6, z], 0.12, 0.07, 8, false);
      P.cyl(M.gold, [x, y + 1.1, z], [x, y + 1.22, z], 0.15, 0.15, 8, true);
      for (const s2 of [-1, 1]) {
        P.cyl(FI, [x, y + 7.2, z], [x, y + 7.45, z + s2 * 0.5], 0.035, 0.03, 4, false);
        P.cyl(M.lampGlass, [x, y + 6.7, z + s2 * 0.5], [x, y + 7.25, z + s2 * 0.5], 0.2, 0.22, 6, false);
        P.cyl(M.iron, [x, y + 7.25, z + s2 * 0.5], [x, y + 7.6, z + s2 * 0.5], 0.27, 0.02, 6, true);
        P.cyl(M.iron, [x, y + 6.62, z + s2 * 0.5], [x, y + 6.7, z + s2 * 0.5], 0.14, 0.2, 6, true);
      }
    }
  }
  P.pop();
  void lampBlack;

  // ------------------------------------------------------------------ colliders
  B.colliders = () => {
    const ph = ctx.physics, rampRot = Math.atan2(f.c, f.s);
    const m = Math.ceil(LEN / 6);
    for (let i = 0; i < m; i++) { const u0 = LEN * i / m, u1 = LEN * (i + 1) / m, w = world((u0 + u1) / 2, 0); ph.addWalkRamp(w.x, w.z, 2 * HW + 0.2, u1 - u0 + 0.04, rampRot, yDeck(u0), yDeck(u1), 2.5); B.info.colliders++; }
    // the railings along both sides: every panel is a breakable bay with its own collider (rails.js); the solid granite blocks of the pier heads are structure and keep a solid box; the rest of the old long boxes is a request
    // (rails.wall) that becomes a ghost bay only where nothing drawn covers it (docs/AREAS.md 13.7)
    for (const sg of [-1, 1]) {
      for (const [q0, q1] of blocks) { const um = (q0 + q1) / 2, w = world(um, sg * (HW - 0.14)); ph.addBox(w.x, w.z, q1 - q0, 0.5, -T, -8, Math.max(yDeck(q0), yDeck(q1)) + 1.45); B.info.colliders++; }
      for (let i = 0; i < 8; i++) { const u0 = LEN * i / 8, u1 = LEN * (i + 1) / 8, p = world(u0, sg * (HW - 0.14)), q = world(u1, sg * (HW - 0.14)); rails.wall({ x0: p.x, z0: p.z, x1: q.x, z1: q.z, th: 0.4, y0: Math.min(yDeck(u0), yDeck(u1)) - 0.8, y1: Math.max(yDeck(u0), yDeck(u1), yDeck((u0 + u1) / 2)) + 1.45, y: Math.min(yDeck(u0), yDeck(u1)) }); B.info.colliders++; }
    }
    const K0 = BANK0 + 3.5, K1 = BANK1 - 3.5, nK = Math.ceil((K1 - K0) / 8);                                             // the barrier kerbs
    for (const sg of [-1, 1]) for (let i = 0; i < nK; i++) { const u0 = K0 + (K1 - K0) * i / nK, u1 = K0 + (K1 - K0) * (i + 1) / nK, w = world((u0 + u1) / 2, sg * (ROAD + KERB / 2)); ph.addBox(w.x, w.z, u1 - u0, KERB, -T, Math.min(yDeck(u0), yDeck(u1)) - 1, Math.max(yDeck(u0), yDeck(u1)) + 0.55); B.info.colliders++; }
    for (const sg of [-1, 1]) for (const u of [4, 36.2, 83.6, 111, 137.5, 166.8, 214.2, 248.5]) { const w = world(u, sg * (HW - 0.7)); ph.addCylinder(w.x, w.z, 0.28, yDeck(u) - 1, yDeck(u) + 8); B.info.colliders++; }
    for (const [uu, dir] of [[BANK0, 1], [BANK1, -1]]) for (const sg of [-1, 1]) B.info.colliders += closeBank({ site: PALACE, L: ctx.L, ph, u: uu, dir, sg, v0: HW - 0.3, len: 2.4, yTop: 0.05, draw: false, collide: false });      // (the wing's parapet is a breakable section with its own collider: closeBank above)
  };
  return B;
}
