// erkers.js - the polygonal bay windows (erkers, эркеры) of the Art Nouveau / tenement houses and the corner turrets (A13).
//   * Erker: 3 faces (angled - front - angled), 1.0 m projection, spans one bay of a street wall from the piano nobile line up to the frieze (just under the cornice), faces use the wall
//     shader (arch ERKER: tall narrow windows, round heads on the top floor, turquoise / cream glazed tile spandrels), stone corbel underneath, flat roof slab on top.
//   * Turret (A13): an octagonal tower (R = 1.75 m) on a REAL street corner of a tenement, corbelled out above the ground floor, rising 3 m above the cornice under a conical grey-green roof.
//     A turret is ONE CLOSED SOLID, built bottom to top from rings of shared vertices (docs/research/city-towers.md): corbel pendant (2 bands + a cap under it) - shaft of EIGHT faces (wall shader:
//     slit windows on every storey; a face that stands wholly inside the house is only drawn above the roof deck) - eaves (soffit ring + stone fascia) - roof (profile rings + apex, wound
//     OUTWARD: ColorBuilder.tri keeps the winding it is given, the old cone was inside out and invisible from outside). It is placed only at a CONVEX corner (18 of 337 towers stood on the re-entrant
//     corner of an L / U shaped house, hanging in the notch: the turn must have the sign of the ring) where both walls are seen from the ground
//     (edges.js ground piece >= 3 m: a party wall with a lower neighbour is no front) and no ring vertex lies inside another house (kit.js neighbourIndex); a house whose research record says
//     `tu` and found no such corner by the hash of its outline gets the first real corner. Bays and erkers buried in an overlapping neighbour are not built either.
//   Both are NOT in the footprint data: they overhang the pavement by 1-1.7 m at 5+ m height (no colliders needed). Audit: node tools/city-tower-audit.mjs (every feature is announced with M.tag).
//   * NORDIC (Northern Modern, Petrograd side): the bay windows stand at the FEATURE bays chosen by walls.js (w.feat, off-centre), run through 2-4 storeys only (from the piano nobile
//     or one storey higher), are three-sided or box-shaped, sit on a corbelled tray and end in an iron-railed balcony unless they reach the eaves (always under a gable).
//     Turret tops of district houses (st.turretTop): 'helm' (bulbous helmet, Bolshoy 69 type), 'tent', 'spire', 'dome'; the old conical roof stays for everything else.
//     Sources: refs/kamennoostrovsky 64_aly69, refs/city-petro 16_frenkel + 04_bolshoy_aerial (green dome on the corner of Bolshoy pr.).
import * as THREE from 'three';
import { hash01, signedArea } from '../lib/massing.js';
import * as L from '../layout.js';
import { wallAttr, ARCH, F, wearFlags, trimFlags } from './wallmat.js';
import { labelRegistry } from './slots.js';
import { inRing, distToRing, triFacing, neighbourIndex } from './kit.js';
import { CORNICE_H } from './cornice.js';

const TOP_ROOF = ['#8a9197', '#5f7f6a', '#5a5f66', '#77838a'];
// profiles of the turret tops: [radius factor of R (+ metres), height] rings from the eaves up; the last entry is the apex
const TOPS = {
  helm: { rings: [[1.0, 0.3, 0], [1.14, 0, 0.9], [1.0, 0, 2.0], [0.62, 0, 3.0], [0.2, 0, 3.7]], apex: 5.3 },
  tent: { rings: [[1.0, 0.45, 0], [1.0, 0.1, 0.5]], apex: 6.6 },
  spire: { rings: [[1.0, 0.3, 0], [0.55, 0, 1.5]], apex: 8.4 },
  dome: { rings: [[1.0, 0.2, 0], [0.93, 0, 0.9], [0.64, 0, 1.65], [0.24, 0, 2.05]], apex: 2.9 },
  cone: { rings: [[1.0, 0.3, 0]], apex: 3.8 },                                  // the plain conical roof of every other house
};
const CONE = TOPS.cone, FASCIA = 0.22;                                            // FASCIA: height of the stone band at the eaves

/** a wall that faces a pedestrian street or a living street (not `drivable` for edges.js, so `e.street` is null): the research-flagged houses of Malaya Sadovaya / Bolshaya Konyushennaya may stand a turret there */
const pedestrianFront = (e) => { const mx = e.a[0] + e.dx * e.len / 2 + e.nx * 3, mz = e.a[1] + e.dz * e.len / 2 + e.nz * 3; return L.roadsNear(mx, mz, 9).some((q) => q.road.hw === 'pedestrian' || q.road.hw === 'living_street'); };
/** The turret corners of a ring. Simple corners first: the vertices between two edges of >= 7 m (unchanged since the first turret rule). With `bevels`: a BEVEL (a chamfer or an arc of short edges
 *  between two long walls, 7 m or more each, bending 55-126 degrees in all, every bend convex, the bevel no longer than 14 m) is one corner as well: the virtual vertex is the outermost point of the
 *  bevel on the bisector of the two long walls, so the tower sits on the chamfer. Candidate = { i (hash index), v, d1 / d2 (directions of the two long walls), ia / ib (their edge indices), chain
 *  (the edge indices of the bevel) }. In pass 1 (`junction`) the bevels are ordered by junction first: two different street names meet there. */
function turretCorners(ring, bevels, junction) {
  const pts = ring.pts, n = pts.length, out = [], ringSign = Math.sign(signedArea(pts)) || 1;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  for (let i = 0; i < n; i++) out.push({ i, v: pts[i], d1: sub(pts[i], pts[(i + n - 1) % n]), d2: sub(pts[(i + 1) % n], pts[i]), ia: (i + n - 1) % n, ib: i, chain: [] });
  if (!bevels) return out;
  const elen = (i) => Math.hypot(pts[(i + 1) % n][0] - pts[i][0], pts[(i + 1) % n][1] - pts[i][1]);
  const merged = [];
  for (let s = 0; s < n; s++) {
    const ia = (s + n - 1) % n;
    if (elen(ia) < 7) continue;
    let t = s, turnSum = 0, chainLen = 0;
    for (let k = 0; k < 5; k++) {
      const p = pts[(t + n - 1) % n], v = pts[t], q = pts[(t + 1) % n];
      const d1 = sub(v, p), d2 = sub(q, v), l1 = Math.hypot(d1[0], d1[1]), l2 = Math.hypot(d2[0], d2[1]);
      const cross = d1[0] * d2[1] - d1[1] * d2[0], turn = Math.atan2(cross, d1[0] * d2[0] + d1[1] * d2[1]);
      if (cross * ringSign <= 0 || Math.abs(turn) < 0.12 || Math.abs(turn) > 1.9) break;           // not a convex bend: the chain ends
      turnSum += Math.abs(turn);
      if (k >= 1 && l2 >= 7 && turnSum >= 0.95 && turnSum <= 2.25 && chainLen <= 14) {
        const A = sub(pts[s], pts[ia]), B = sub(pts[(t + 1) % n], pts[t]);
        const la = Math.hypot(A[0], A[1]), lb = Math.hypot(B[0], B[1]);
        const m = [A[1] / la + B[1] / lb, -A[0] / la - B[0] / lb], ml = Math.hypot(m[0], m[1]);
        if (ml > 0.3) {
          const mx = m[0] / ml, mz = m[1] / ml, ch = []; for (let j = s; j !== t; j = (j + 1) % n) ch.push(j);
          const M0 = [(pts[s][0] + v[0]) / 2, (pts[s][1] + v[1]) / 2];
          let ext = 0; for (let j = s; ; j = (j + 1) % n) { ext = Math.max(ext, (pts[j][0] - M0[0]) * mx + (pts[j][1] - M0[1]) * mz); if (j === t) break; }
          // the tower stands ON the bevel: the virtual point is moved to the nearest point of the bevel polyline (its corbel touches the wall, no floating part; the audit flagged an off-line centre)
          const vp = [M0[0] + mx * ext, M0[1] + mz * ext]; let bd = 1e9, bp = vp;
          for (const j of ch) { const P = pts[j], Q = pts[(j + 1) % n], ex = Q[0] - P[0], ez = Q[1] - P[1], tt = Math.max(0, Math.min(1, ((vp[0] - P[0]) * ex + (vp[1] - P[1]) * ez) / (ex * ex + ez * ez || 1))), qx = P[0] + ex * tt, qz = P[1] + ez * tt, dd = Math.hypot(vp[0] - qx, vp[1] - qz); if (dd < bd) { bd = dd; bp = [qx, qz]; } }
          merged.push({ i: s, v: bp, d1: A, d2: B, ia, ib: t, chain: ch, turn: turnSum });
        }
      }
      if (l2 >= 11 || turnSum > 2.25) break;
      chainLen += l2; t = (t + 1) % n;
    }
  }
  if (junction) {                                                                              // the junction corner first (two different street names), then the one nearest to a right angle
    const names = (cd) => { const set = new Set(); for (const k of [cd.ia, cd.ib, ...cd.chain]) { const e = ring.edges.find((q) => q.i === k); if (e && e.street && e.street.name) set.add(e.street.name); } return set.size; };
    merged.sort((p, q) => (names(q) - names(p)) || (Math.abs(p.turn - 1.5708) - Math.abs(q.turn - 1.5708)));
  }
  return out.concat(merged);
}

export function buildErkers(ctx, { M, info }) {
  const fB = (x, z) => M.walls(x, z), cB = (x, z) => M.core(x, z);
  const tag = typeof M.tag === 'function' ? (k, id, meta) => M.tag(k, id, meta) : () => {};          // tools/city-tower-lib.mjs: announces the feature that is being built (a no-op on the production meshes)
  let nErk = 0, nTur = 0, extra = 0;
  const neighbourIn = neighbourIndex(info);                                      // is a point inside ANOTHER house (not the host, not a part of it) that reaches above yMin? (kit.js)
  const roofC = new THREE.Color('#6f8a7a'), slabC = new THREE.Color('#bdb7aa');
  let labels = null;
  for (const rec of info) {
    const { b, st } = rec, tab = st.tab;
    if (b.minH > 0.5 || tab.floors < 4) continue;
    const trimC = st.trim.clone().multiplyScalar(0.95), darkC = st.trim.clone().multiplyScalar(0.7);
    const wcol = st.color.clone().lerp(st.trim, 0.35);
    const plainSp = st.arch === ARCH.NORDIC && !st.majolica ? F.SOCLE : 0;          // NORDIC bays carry tile spandrels only on the houses with a majolica band
    const mkAt = (nF, firstH, upH, H, bw, seed) => wallAttr({ arch: ARCH.ERKER, floors: nF, H, bw, N: 1, i0: seed, seed: st.seed, flags: wearFlags(st.wear) | trimFlags(st.trimClass) | F.NOCENTRE | plainSp, plinth: 0, G: firstH, PN: nF >= 2 ? upH : 0, centre: -1 });
    if (st.arch === ARCH.NORDIC) {
      // ---- bay windows of the Northern Modern fronts: at the feature bays, through 2-4 storeys
      if (!labels) labels = labelRegistry(ctx);
      for (const w of rec.walls) {
        if (!w.feat || w.gate) continue;
        for (const f of w.feat) {
          if (!f.erker) continue;
          const hk = hash01(b.id + ':nk' + w.id + f.bay), hs = hash01(b.id + ':ns' + w.id + f.bay), hn = hash01(b.id + ':nn' + w.id + f.bay);
          const sMid = (f.bay + 0.5) * w.bw, ww = Math.min(w.bw - 0.2, 3.4), P = 0.95, box = hk < 0.3;
          const fw = box ? ww : ww * 0.5;
          const yG1 = w.base + w.plinth + w.G;
          const up = tab.floors >= 5 && hs < 0.35 ? 1 : 0;                              // starts one storey above the piano nobile
          const maxF = tab.floors - 1 - up;
          const nF = f.gable ? maxF : Math.max(2, Math.min(maxF, 2 + Math.floor(hn * 3)));
          const full = nF === maxF;
          const yStart = yG1 + (up ? tab.PN : 0);
          const span = (up ? 0 : tab.PN) + (nF - (up ? 0 : 1)) * tab.UF;
          const yEnd = full ? w.base + w.H - 0.9 : yStart + span, Hc = yEnd - yStart;
          const A = [[-ww / 2, 0], [-fw / 2, P], [fw / 2, P], [ww / 2, 0]];
          const Pt = (p, y) => [w.a[0] + w.dx * (sMid + p[0]) + w.nx * p[1], y, w.a[1] + w.dz * (sMid + p[0]) + w.nz * p[1]];
          const cx = w.a[0] + w.dx * sMid, cz = w.a[1] + w.dz * sMid;
          labels.reserve(b.id, cx + w.nx * 0.05, (yStart + yEnd) / 2, cz + w.nz * 0.05, ww, Hc, w.nx, w.nz, 'erker');      // BEFORE the buried test: the slot stays taken as it always was, so the downpipes / signs around do not move because a buried bay is not drawn (audit-towers: 14 pipes moved, one doubled)
          if (neighbourIn(Pt(A[1], yStart)[0], Pt(A[1], yStart)[2], rec, yStart - 0.7) && neighbourIn(Pt(A[2], yStart)[0], Pt(A[2], yStart)[2], rec, yStart - 0.7)) continue;      // the wall piece stands inside another house (overlapping footprints): a bay there would be buried
          const FB = fB(cx, cz), CB = cB(cx, cz);
          // (the label slot of the bay was reserved above, before the buried test)
          tag('bay', b.id, { x: cx, z: cz, nF, full, box });
          const faceN = (i) => { const dx = A[i + 1][0] - A[i][0], dz = A[i + 1][1] - A[i][1]; const lx = w.dx * dx + w.nx * dz, lz = w.dz * dx + w.nz * dz, ln = Math.hypot(lx, lz) || 1; return [lz / ln, -lx / ln, Math.hypot(dx, dz)]; };
          for (let i = 0; i < 3; i++) {
            const [nx, nz, l] = faceN(i);
            const a0 = Pt(A[i], yStart), a1 = Pt(A[i + 1], yStart);
            FB.quad([a0[0], a0[2]], [a1[0], a1[2]], yStart, yEnd, nx, nz, 0, 1, 0, Hc, mkAt(nF, up ? tab.UF : tab.PN, tab.UF, Hc, l, Math.round(sMid * 3 + i)), wcol);
            // corbelled tray: from the wall 0.7 m below up to the foot of the bay
            // (its foot ring stands 4 cm off the wall: with the foot ON the wall plane half of every side quad was coplanar with the facade and z-fought, zfight.mjs 0.018 %)
            const t0 = Pt([A[i][0] * 0.72, A[i][1] * 0.3 + 0.04], yStart - 0.7), t1 = Pt([A[i + 1][0] * 0.72, A[i + 1][1] * 0.3 + 0.04], yStart - 0.7);
            CB.quad([t0, t1, a1, a0], [nx * 0.5 + w.nx * 0.3, -0.8, nz * 0.5 + w.nz * 0.3], darkC);
            // top: slab edge
            const q0 = Pt(A[i], yEnd), q1 = Pt(A[i + 1], yEnd);
            CB.quad([q0, q1, [q1[0], q1[1] + 0.14, q1[2]], [q0[0], q0[1] + 0.14, q0[2]]], [nx, 0, nz], trimC);
            if (!full) {                                                             // iron railing of the balcony on top (alpha card, as balconies.js)
              const R = M.rails(cx, cz), y0 = yEnd + 0.16, y1 = yEnd + 1.08, tl = l / 1.0;
              const i0 = R.vert(q0[0], y0, q0[2], nx, 0, nz, 0, 0), i1 = R.vert(q1[0], y0, q1[2], nx, 0, nz, tl, 0), i2 = R.vert(q1[0], y1, q1[2], nx, 0, nz, tl, 1), i3 = R.vert(q0[0], y1, q0[2], nx, 0, nz, 0, 1);
              R.quad(i0, i1, i2, i3);
              extra += 2;
            }
          }
          CB.quad([Pt(A[0], yEnd), Pt(A[1], yEnd), Pt(A[2], yEnd), Pt(A[3], yEnd)].map((p) => [p[0], p[1] + 0.14, p[2]]), [0, 1, 0], full ? slabC : trimC);
          // the underside of the tray: the ring the three tray quads end in is closed by a flat soffit (the tray was an open funnel: looking up from the street its rim showed the wall behind)
          CB.quad(A.map((q) => Pt([q[0] * 0.72, q[1] * 0.3 + 0.04], yStart - 0.7)), [0, -1, 0], darkC);
          tag(null);
          extra += 8;
          nErk++; if (typeof process !== 'undefined' && process.env && process.env.CITY_DEBUG) console.log('[bay]', Math.round(cx), Math.round(cz), b.id, st.street, 'storeys', nF, full ? 'full' : 'balcony');
        }
      }
    } else if (st.erkers) {
    // ---- erkers on street walls
      for (const w of rec.walls) {
        if (!w.street || w.hole || w.gate || w.shop === undefined || w.N < 5 || w.len < 12) continue;
        const nE = w.len > 55 ? 3 : w.len > 28 ? 2 : 1;
        const taken = new Set(w.doors.map((d) => Math.floor(d.s / w.bw)));
        for (const g of w.bal) for (let k = g.b0 - 1; k <= g.b1; k++) taken.add(k);
        const used = [];
        for (let k = 0; k < nE; k++) {
          let c = Math.floor(((k + 0.5) / nE + (hash01(b.id + ':ek' + w.id + k) - 0.5) * 0.3) * w.N);
          c = Math.max(1, Math.min(w.N - 2, c));
          if (taken.has(c) || used.some((u) => Math.abs(u - c) < 3)) continue;
          used.push(c);
          const sMid = (c + 0.5) * w.bw, ww = Math.min(w.bw - 0.15, 3.3), fw = ww * 0.52, P = 1.0;
          const yG1 = w.base + w.plinth + w.G, yEnd = w.base + w.H - 0.9, Hc = yEnd - yG1;
          const nF = tab.floors - 1;
          const A = [[-ww / 2, 0], [-fw / 2, P], [fw / 2, P], [ww / 2, 0]];
          const Pt = (p, y) => [w.a[0] + w.dx * (sMid + p[0]) + w.nx * p[1], y, w.a[1] + w.dz * (sMid + p[0]) + w.nz * p[1]];
          const cx = w.a[0] + w.dx * sMid, cz = w.a[1] + w.dz * sMid;
          if (neighbourIn(Pt(A[1], yG1)[0], Pt(A[1], yG1)[2], rec, yG1) && neighbourIn(Pt(A[2], yG1)[0], Pt(A[2], yG1)[2], rec, yG1)) continue;      // buried in another house (see the bays above)
          const FB = fB(cx, cz), CB = cB(cx, cz);
          tag('erker', b.id, { x: cx, z: cz, nF });
          for (let i = 0; i < 3; i++) {
            const p0 = A[i], p1 = A[i + 1], l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
            const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
            // outward normal of this face in world coordinates
            const lx = w.dx * dx + w.nx * dz, lz = w.dz * dx + w.nz * dz, ln = Math.hypot(lx, lz) || 1;
            const nx = lz / ln, nz = -lx / ln;
            const a0 = Pt(p0, yG1), a1 = Pt(p1, yG1);
            FB.quad([a0[0], a0[2]], [a1[0], a1[2]], yG1, yEnd, nx, nz, 0, 1, 0, Hc, mkAt(nF, tab.PN, tab.UF, Hc, l, Math.round(sMid * 3 + i)), wcol);
          }
          // corbel underside (stone), roof slab (flat, with a thin edge)
          const under = [Pt(A[0], yG1), Pt(A[1], yG1), Pt(A[2], yG1), Pt(A[3], yG1)];
          CB.quad(under, [0, -1, 0], darkC);
          CB.quad([Pt(A[0], yEnd), Pt(A[1], yEnd), Pt(A[2], yEnd), Pt(A[3], yEnd)].map((p) => [p[0], p[1] + 0.12, p[2]]), [0, 1, 0], slabC);
          for (let i = 0; i < 3; i++) { const q0 = Pt(A[i], yEnd), q1 = Pt(A[i + 1], yEnd); const lx = w.dx * (A[i + 1][0] - A[i][0]) + w.nx * (A[i + 1][1] - A[i][1]), lz = w.dz * (A[i + 1][0] - A[i][0]) + w.nz * (A[i + 1][1] - A[i][1]), ln = Math.hypot(lx, lz) || 1; CB.quad([q0, q1, [q1[0], q1[1] + 0.12, q1[2]], [q0[0], q0[1] + 0.12, q0[2]]], [lz / ln, 0, -lx / ln], trimC); }
          tag(null);
          nErk++; if (typeof process !== 'undefined' && process.env && process.env.CITY_DEBUG) console.log('[erker]', Math.round(cx), Math.round(cz), b.id, st.street);
        }
      }
    }
    // ---- corner turrets
    let turrets = 0;
    const placedC = [];
    if ((st.turret !== undefined ? st.turret : hash01(b.id + ':tur') < (st.sc === 0 ? 0.30 : 0.16)) && [ARCH.TENEMENT, ARCH.NOUVEAU, ARCH.ECLECTIC, ARCH.CLASSIC, ARCH.NEOCLASS, ARCH.NORDIC, ARCH.NEOCLASSIC1910].includes(st.arch)) {
      const top = st.turretTop && st.turretTop !== 'cone' && TOPS[st.turretTop] ? TOPS[st.turretTop] : null, prof0 = top || CONE;      // district houses: helm / tent / spire / dome; null = the conical roof
      // pass 0 picks corners by the hash of the outline (about half of the vertices); pass 1 runs only for a house whose research record SAYS it has a turret and found no corner in pass 0: every real corner qualifies
      for (let pass = 0; pass < 2; pass++) {
      if (pass === 1 && !(st.known && st.turret === true && turrets === 0)) break;
      for (const ring of rec.rings) {
        if (ring.hole) continue;
        const pts = ring.pts, n = pts.length, ringSign = Math.sign(signedArea(pts)) || 1;
        // corners: the real vertices of two edges of >= 7 m (unchanged), then BEVELS merged into one corner (chamfers and arcs of short edges between two long walls; Nevsky 66 / Fontanka 29, Nevsky 32A,
        // Dekabristov 36/1 ...): in pass 1 for houses the research flags, in pass 0 for the houses of the island rectangles V3..V12 (the older regions keep their hash-chosen turrets bit for bit)
        const corners = turretCorners(ring, pass === 1 || st.fresh, pass === 1);
        for (const cd of corners) {
          const i = cd.i, v = cd.v, d1x = cd.d1[0], d1z = cd.d1[1], d2x = cd.d2[0], d2z = cd.d2[1], l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
          if (l1 < 7 || l2 < 7) continue;
          const cross = (d1x * d2z - d1z * d2x) / (l1 * l2), dot = (d1x * d2x + d1z * d2z) / (l1 * l2);
          const turn = Math.atan2(cross, dot);
          if (Math.abs(turn) < 0.95 || Math.abs(turn) > 2.2) continue;
          // a RE-ENTRANT vertex (the inside corner of an L / U shaped house, 18 of 337 turrets stood on one: the tower hung in the notch like a bay window in a courtyard corner) is no tower corner:
          // the turn must have the sign of the ring (outer rings are counter-clockwise here, so convex = positive cross); the crude centre test below does not see it for the notch of an L
          if (cross * ringSign < 0) continue;
          // convex corner of an outer ring with outward normals (dz, -dx): cross < 0 convex for this orientation? test with the bisector against the footprint centre
          const n1 = [d1z / l1, -d1x / l1], n2 = [d2z / l2, -d2x / l2], m = [n1[0] + n2[0], n1[1] + n2[1]], ml = Math.hypot(m[0], m[1]) || 1;
          const mx = m[0] / ml, mz = m[1] / ml;
          if ((v[0] - st.ob.cx) * mx + (v[1] - st.ob.cz) * mz < 0) continue;                    // concave
          if (turrets >= (st.ob.w > 60 ? 2 : 1) || (pass === 0 && hash01(b.id + ':tc' + i) > (st.fresh && st.arch === ARCH.NORDIC ? 0.25 : 0.5))) continue;
          // both edges must face a street (pass 1, the research-flagged houses: a pedestrian street counts as one)
          const e1 = ring.edges.find((e) => e.i === cd.ia), e2 = ring.edges.find((e) => e.i === cd.ib);
          if (!e1 || !e2 || !(e1.street || (pass === 1 && pedestrianFront(e1))) || !(e2.street || (pass === 1 && pedestrianFront(e2)))) continue;
          if (cd.chain.length && !cd.chain.every((k) => { const e = ring.edges.find((q) => q.i === k); return !e || e.street || !e.pieces.length || (pass === 1 && pedestrianFront(e)); })) continue;      // the bevel itself faces the street too
          // a REAL corner: both walls at the vertex are seen from the ground (a ground piece of >= 3 m, edges.js; an edge that only shows above a lower neighbour is a party wall of the corner house, not a front)
          // and the tower stands in the open: no ring vertex of it lies inside ANOTHER house (the neighbour would stand inside the tower; 157 of 398 old corners failed one of the two tests, docs/research/city-towers.md)
          const gmin = pass === 1 && turrets === 0 ? 2.2 : 3;                                        // the FIRST tower of a house the research flags may stand where a taller neighbour leaves only 2.2 m of the end wall (Dekabristov 36/1: 2.6 m; the tower radius is 1.75 m, the crowding test below still refuses a neighbour inside it); a second tower keeps 3 m
          const ground = (e) => e.pieces.some((pc) => pc.yLow <= 0.2 && pc.t1 - pc.t0 >= gmin);
          if (!ground(e1) || !ground(e2)) continue;
          const R = 1.75, c0 = [v[0] + mx * 0.1, v[1] + mz * 0.1];
          if (placedC.some((q) => Math.hypot(q[0] - c0[0], q[1] - c0[1]) < 5)) continue;                // two candidates of one bevel: one tower
          const yG1 = tab.plinth + tab.G, yStart = yG1, yTop = st.H + 3.0, Hc = yTop - yG1, nF = tab.floors;
          const seg = 8, ang0 = Math.atan2(mz, mx), deckY = st.deckY ?? (st.H + CORNICE_H);
          { const ovr = prof0.rings[0][1]; let crowded = false;
            for (let k = 0; k < seg && !crowded; k++) { const a = ang0 - Math.PI + (k / seg) * Math.PI * 2; crowded = !!(neighbourIn(c0[0] + Math.cos(a) * R, c0[1] + Math.sin(a) * R, rec, yG1 - 1.45) || neighbourIn(c0[0] + Math.cos(a) * (R + ovr), c0[1] + Math.sin(a) * (R + ovr), rec, yTop)); }
            if (crowded || neighbourIn(c0[0], c0[1], rec, yG1 - 1.45)) continue; }
          const FB = fB(c0[0], c0[1]), CB = cB(c0[0], c0[1]);
          const flagsBase = wearFlags(st.wear) | trimFlags(st.trimClass) | F.NOCENTRE;
          const prof = top || CONE, ov = prof.rings[0][1];
          const tc = top ? new THREE.Color(st.roofKnown || TOP_ROOF[Math.floor(hash01(b.id + ':tr' + i) * TOP_ROOF.length) % TOP_ROOF.length]) : roofC;      // the research roof colour (the green dome of ul. Blokhina 33) wins
          tag('turret', b.id, { x: c0[0], z: c0[1], top: st.turretTop || 'cone', nF });
          // ONE CLOSED SOLID, bottom to top (docs/research/city-towers.md): corbel pendant (2 bands + a cap under it) - shaft of EIGHT faces (the wall shader paints the slit windows) - eaves (soffit ring + fascia)
          // - roof (profile rings, apex). Every part shares its ring of vertices with the next one, so there is no gap to look through; winding comes from the outward normal of each part.
          const ang = (k) => ang0 - Math.PI + (k / seg) * Math.PI * 2;
          const at = (r, y, k) => [c0[0] + Math.cos(ang(k)) * r, y, c0[1] + Math.sin(ang(k)) * r];
          const band = (lo, hi, k, col) => {                                     // quad between two rings (r, y) on sector k; the normal is the profile normal
            const dr = hi[0] - lo[0], dy = hi[1] - lo[1], nl = Math.hypot(dr, dy) || 1, am = (ang(k) + ang(k + 1)) / 2;
            CB.quad([at(lo[0], lo[1], k), at(lo[0], lo[1], k + 1), at(hi[0], hi[1], k + 1), at(hi[0], hi[1], k)], [Math.cos(am) * dy / nl, -dr / nl, Math.sin(am) * dy / nl], col);
          };
          for (let k = 0; k < seg; k++) {
            const a0 = ang(k), a1 = ang(k + 1), am = (a0 + a1) / 2, ux = Math.cos(am), uz = Math.sin(am);
            const p0 = at(R, 0, k), p1 = at(R, 0, k + 1);
            const l = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
            // a face that stands INSIDE the house (both ends and its middle, 8 cm out, are inside the footprint) is only seen above the roof deck: below it the wall of the house hides it
            const mxp = c0[0] + ux * R * Math.cos(Math.PI / seg) + ux * 0.08, mzp = c0[1] + uz * R * Math.cos(Math.PI / seg) + uz * 0.08;
            const within = (x, z) => inRing(pts, x, z) && distToRing(pts, x, z) > 0.08;
            const inside = within(mxp, mzp) && within(p0[0], p0[2]) && within(p1[0], p1[2]);       // both ends and the middle: a face that only half sticks out of the wall is drawn in full
            const yLow = inside ? Math.min(yTop - 0.5, deckY - 0.05) : yStart;
            FB.quad([p0[0], p0[2]], [p1[0], p1[2]], yLow, yTop, ux, uz, 0, 1, yLow - yStart, Hc, wallAttr({ arch: ARCH.ERKER, floors: nF, H: Hc, bw: l, N: 1, i0: k * 5 + i, seed: st.seed, flags: flagsBase | plainSp, plinth: 0, G: tab.PN, PN: nF >= 2 ? tab.UF : 0, centre: -1 }), wcol);
            // corbel pendant under the shaft (2 bands) and its cap: all eight sectors, so that the ring of the lowest band is closed from below (the sectors inside the house cost 5 triangles each)
            band([0.40 * R, yStart - 1.5], [0.72 * R, yStart - 0.7], k, darkC);
            band([0.72 * R, yStart - 0.7], [R, yStart], k, darkC);
            triFacing(CB, [c0[0], yStart - 1.5, c0[1]], at(0.40 * R, yStart - 1.5, k + 1), at(0.40 * R, yStart - 1.5, k), [0, -1, 0], darkC);
            // eaves: the underside ring from the shaft out to the overhang, then the fascia band (stone), then the roof starts on the fascia's top ring
            band([R, yTop], [R + ov, yTop], k, darkC);
            band([R + ov, yTop], [R + ov, yTop + FASCIA], k, trimC);
            // roof: rings of the profile (radius factor x R + metres, height above the fascia), then the apex
            for (let j = 0; j + 1 < prof.rings.length; j++) {
              const lo = prof.rings[j], hi = prof.rings[j + 1];
              band([R * lo[0] + lo[1], yTop + FASCIA + lo[2]], [R * hi[0] + hi[1], yTop + FASCIA + hi[2]], k, tc);
            }
            const last = prof.rings[prof.rings.length - 1], rl = R * last[0] + last[1], dyA = prof.apex - last[2], nl = Math.hypot(rl, dyA) || 1;
            triFacing(CB, at(rl, yTop + FASCIA + last[2], k), at(rl, yTop + FASCIA + last[2], k + 1), [c0[0], yTop + FASCIA + prof.apex, c0[1]], [Math.cos(am) * dyA / nl, rl / nl, Math.sin(am) * dyA / nl], tc);
          }
          extra += seg * (7 + prof.rings.length * 2);
          tag(null);
          nTur++; turrets++; placedC.push(c0); if (typeof process !== 'undefined' && process.env && process.env.CITY_DEBUG) console.log('[turret]', Math.round(c0[0]), Math.round(c0[1]), b.id, st.street);
        }
      }
      }
    }
  }
  const tris = nErk * 20 + extra;                                              // (turret triangles are counted in `extra` where they are built)
  return { triangles: tris, erkers: nErk, turrets: nTur };
}
