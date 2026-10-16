// streets/islands.js - the street rules of ISLANDS ROUND 2 (2026-10-14: Yelagin, Kamenny, Aptekarsky, Petrovsky, Krestovsky). Pure data + small builders; every rule asks region.js isIsland(x, z) first,
// so the reviewed districts (and the Petrograd side / Vasilievsky Island) are drawn exactly as before (tools/streets-signature.mjs --diff proves it).
// Requests answered here (docs/research/islands2-requests-*.md, "streets" sections):
//   * PIERS: a pier polygon that a sight module claims (the boat bases of landmarksYelaginPark: w100146184 / w699822919 / w100868959) carries its own deck; the generic mapped footways on it (w1215034617..20,
//     w367173806: wood / unpaved, drawn as pink-brown brick ribbons) are not drawn on the deck and 0.6 m round it, a stub of <= 8 m that ends at the pier is not drawn at all (the routing line stays).
//   * CLOSED GARDEN of the Kamennoostrovsky Palace (ring r10254219, fenced and gated by landmarksKamennyPalace): the `permissive` gravel / asphalt footways inside the fence are no walkable ground
//     (no ribbon, no routing line: people/nav reads streets.paths).
//   * APRONS: the asphalt forecourt with a granite kerb in front of the Rossi Stable colonnade (photo stb_03, the PAVED_RING 'stable-forecourt' of landmarksYelaginServices) is laid as a lot + kerb runs.
//   * EDGE BANDS: the concrete apron of landmarksPetrovskyStadium is clipped against net.cover on a lattice by the module, so its edge against the four service ring roads (w236752160, w236752162, w119932154, w119932198) is a
//     saw-tooth with a bare 0.2 .. 0.6 m gap to the asphalt (measured: the apron vertices lie at cover -0.6 .. -0.1). A 0.7 m granite band is laid along the outer edge of those roads inside the apron ring (y 0.09, over the apron at
//     0.07): one straight edge on the asphalt side, the teeth of the apron are under it.
//   * PATHS: the asphalt footway ring round the Kitchen block drum (R 31.5 .. 34.5 m about the drum centre, photos kit_02 / kit_09 / kit_11) joining w231033012 in the west and w233508888 in the east.
// Nothing here stands on a carriageway: the apron is far from every road (checked with net.cover when it is laid), the ring is a footway.
import { PIERS } from '../data/city.js';
import { isIsland } from './region.js';
import { addCap } from '../lib/massing.js';
import { PAVED_RINGS as STADIUM_RINGS } from '../landmarksPetrovskyStadium/groups.js';
import { PAVED_RINGS as PALACE_RINGS } from '../landmarksYelaginPalace/groups.js';
import { PAVED_RINGS as ROSSI_RINGS } from '../landmarksYelaginRossi/groups.js';
import { PAVED_RINGS as SPITS_RINGS } from '../landmarksYelaginSpits/groups.js';
import { ROAD_Y, WALK_Y, KERB_H, KERB_W } from './surface.js';
import { UP } from './util.js';

export { CLOSED_WALKS, closedWalk } from './island-data.js';

const ringBox = (o) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } return [x0, x1, z0, z1]; };
const inRing = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) ins = !ins; return ins; };
const edgeDist = (o, x, z) => { let best = 1e9; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const ax = o[j], az = o[j + 1], dx = o[i] - ax, dz = o[i + 1] - az, l2 = dx * dx + dz * dz; let t = l2 < 1e-12 ? 0 : ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t; best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return best; };

/** pier decks that a module draws: polygons of the claimed PIERS (isOwnedId(id)) in the island regions. near(x, z, m): inside a deck or within m metres of its edge. */
export function makePierTest(isOwnedId) {
  const list = [];
  for (const p of PIERS) {
    if (!isOwnedId(p.id)) continue;
    for (const q of p.polys || []) if (q.o.length >= 6 && isIsland(q.o[0], q.o[1])) list.push({ o: q.o, b: ringBox(q.o) });
  }
  const near = (x, z, m = 0.6) => list.some((q) => x >= q.b[0] - m && x <= q.b[1] + m && z >= q.b[2] - m && z <= q.b[3] + m && (inRing(q.o, x, z) || edgeDist(q.o, x, z) < m));
  /** decision for a mapped footway (pts = [[x, z], ...], densified): 'none' = not on a pier, 'all' = no ribbon at all, 'part' = no ribbon on the deck */
  const classify = (pts) => {
    if (!list.length || !pts.length || !isIsland(pts[0][0], pts[0][1])) return 'none';
    let on = 0, len = 0;
    for (let i = 0; i < pts.length; i++) { if (near(pts[i][0], pts[i][1], 1.0)) on++; if (i) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); }
    if (!on) return 'none';
    if (on >= pts.length * 0.6) return 'all';
    const a = pts[0], b = pts[pts.length - 1];
    if (len <= 8 && (near(a[0], a[1], 1.5) || near(b[0], b[1], 1.5))) return 'all';       // the stub from the bank to the pier
    return 'part';
  };
  return { count: list.length, near, classify };
}

// ------------------------------------------------------------------------------------------------ ground that a module paves itself: no generic footway ribbon over it
/** PAVED_RINGS that the sights pave with their own surface (cobbles over the ramps and the podium, the stair feet, the east-spit plaza, the spit terrace): the mapped footways that run over them
 *  (w98992769 / w717881699 up the palace ramps, w30836344 / w1283399399 round the Rossi pavilion, ...) are not drawn there (islands2-requests-landmarksYelaginPalace.md 6 / 7, ...Rossi.md 3); the lawns
 *  of the same lists ('lawn-west', 'oil-meadow', ...) stay open: a path across a lawn is a path. The routing lines are not cut. */
const CUT = [['landmarksYelaginPalace', PALACE_RINGS, ['palace-podium', 'ramp-north', 'ramp-south', 'stair-west-foot', 'stair-east-foot']],
  ['landmarksYelaginRossi', ROSSI_RINGS, ['east-spit']], ['landmarksYelaginSpits', SPITS_RINGS, ['terrace']]];
/** inside(x, z): true over a ring of CUT whose module is built (island regions only) */
export function makePavedCut(built) {
  const list = [];
  for (const [owner, rings, ids] of CUT) {
    if (!built(owner)) continue;
    for (const r of rings || []) if (ids.includes(r.id)) { const o = r.ring.flat ? r.ring.flat() : r.ring; if (o && o.length >= 6) list.push({ o, b: ringBox(o) }); }
  }
  return (x, z) => list.length > 0 && isIsland(x, z) && list.some((q) => x >= q.b[0] && x <= q.b[1] && z >= q.b[2] && z <= q.b[3] && inRing(q.o, x, z));
}

// ------------------------------------------------------------------------------------------------ frames
const D2R = Math.PI / 180;
/** Rossi Stable frame ST (landmarksYelaginServices/frame.js): local x east-ish, z SOUTH-ish, world = O + x (cos r, -sin r) + z (sin r, cos r) */
const ST = { x: -4817.1, z: -5287.15, rot: 4.58 * D2R };
const toWorld = (F, x, z) => { const s = Math.sin(F.rot), c = Math.cos(F.rot); return [F.x + x * c + z * s, F.z - x * s + z * c]; };
const dirWorld = (F, x, z) => { const s = Math.sin(F.rot), c = Math.cos(F.rot); return [x * c + z * s, -x * s + z * c]; };
/** Kitchen block frame K (landmarksYelaginKitchen/frame.js): origin = the drum centre, local +x = u (east-ish), +z = w (SOUTH-ish) */
const KC = { x: -4628.43, z: -5298.68 }, KTH = 0.07455;
const kWorld = (u, w) => { const s = Math.sin(KTH), c = Math.cos(KTH); return [KC.x + u * c + w * s, KC.z - u * s + w * c]; };

/** asphalt aprons with a granite kerb: local polygon (counter-clockwise or not: addCap fixes it) + kerbed edges [x0, z0, x1, z1, nx, nz] (the normal points away from the asphalt) */
const APRONS = [
  { id: 'stable-forecourt', owner: 'landmarksYelaginServices', F: ST,
    poly: [[-30, 10], [30, 10], [30, 31], [-30, 31]],                                            // (PAVED_RING stable-forecourt: x +-30, z 9 .. 32; the pavilion fronts stand at z 10.0)
    kerbs: [[-30, 10, -30, 31, -1, 0], [-30, 31, 30, 31, 0, 1], [30, 31, 30, 10, 1, 0]] },
  // Rossi Music Pavilion (docs/research/islands2-requests-landmarksYelaginRossi.md 3, photos rossi 03 / 04: the alley in front of the steps is ~8 m of asphalt, OSM has only the 2.4 m footway w222212068): the 18 x 8.7 m
  // PAVED_RING 'music-apron' of the module (a world polygon, no kerb: the alley runs out into the lawn)
  { id: 'music-apron', owner: 'landmarksYelaginRossi', ring: () => (ROSSI_RINGS.find((q) => q.id === 'music-apron') || {}).ring, kerbs: [] },
];
/** asphalt footways (mapped paths that OSM lacks): a ribbon of width w through pts (world), routed like every mapped footway */
function islandPaths() {
  const ring = [];
  ring.push([-4661.6, -5303.8]);                                                                         // the vertex of w231033012 that the ring starts from (R 33.6)
  for (let d = -92; d <= 80.01; d += 4) { const a = d * D2R; ring.push(kWorld(33 * Math.sin(a), 33 * Math.cos(a))); }
  ring.push([-4590.0, -5299.1]);                                                                         // the vertex of w233508888 (R 38.4) where the ring ends
  return [{ id: 'ye-kitchen-ring', owner: 'landmarksYelaginKitchen', pts: ring, w: 3.0 }];
}

/** one straight kerb stone run (the profile of surface.js buildKerbs: inner face down to the asphalt, top 0.15, outer face down to the lawn); n = unit outward normal */
function kerbRun(B, ax, az, bx, bz, nx, nz) {
  const l = Math.hypot(bx - ax, bz - az); if (l < 0.2) return 0;
  const nIn = [-nx, 0, -nz], nOut = [nx, 0, nz], cols = [[0.78, 0.78, 0.8], [0.88, 0.88, 0.9], [1, 1, 1], [1, 1, 1], [0.93, 0.93, 0.95], [0.88, 0.88, 0.9]];
  const mk = (x, z, u) => [
    B.vert(x, ROAD_Y - 0.004, z, u, 0, nIn, cols[0]), B.vert(x, KERB_H, z, u, 0.5, nIn, cols[1]), B.vert(x, KERB_H, z, u, 0.2, UP, cols[2]),
    B.vert(x + nx * KERB_W, KERB_H, z + nz * KERB_W, u, 0.8, UP, cols[3]), B.vert(x + nx * KERB_W, KERB_H, z + nz * KERB_W, u, 0.5, nOut, cols[4]), B.vert(x + nx * KERB_W, 0, z + nz * KERB_W, u, 0, nOut, cols[5])];
  const p = mk(ax, az, 0), q = mk(bx, bz, l);
  B.quad(p[0], p[1], q[1], q[0], nIn); B.quad(p[2], p[3], q[3], q[2], UP); B.quad(p[4], p[5], q[5], q[4], nOut);
  const dx = (bx - ax) / l, dz = (bz - az) / l;
  B.tri(p[0], p[1], p[3], [-dx, 0, -dz]); B.tri(p[0], p[3], p[5], [-dx, 0, -dz]);              // (the end caps)
  B.tri(q[0], q[1], q[3], [dx, 0, dz]); B.tri(q[0], q[3], q[5], [dx, 0, dz]);
  return 1;
}

// ------------------------------------------------------------------------------------------------ edge bands
const RING_ROADS = new Set(['w236752160', 'w236752162', 'w119932154', 'w119932198']);       // the service ring roads round the stadium bowl (landmarksPetrovskyStadium, field.js roadClip)
const BAND_W = 0.7, BAND_Y = 0.09;
function edgeBands(B, net, ring) {
  let n = 0;
  const o = ring; if (!o || o.length < 6) return 0;
  for (const w of net.ways) {
    if (!RING_ROADS.has(w.id) || w.bridge || !isIsland(w.x[0], w.z[0])) continue;
    for (const side of [1, -1]) {                                                        // +1 = right (normal (-tz, tx)), -1 = left
      let s = 0;
      for (let i = 0; i + 1 < w.n; i++) {
        const ax = w.x[i], az = w.z[i], bx = w.x[i + 1], bz = w.z[i + 1], l = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.ceil(l / 2));
        for (let j = 0; j < k; j++) {
          const t0 = j / k, t1 = (j + 1) / k, ends = [t0, t1].map((t) => {
            const x = ax + (bx - ax) * t, z = az + (bz - az) * t, tx = w.tx[i] + (w.tx[i + 1] - w.tx[i]) * t, tz = w.tz[i] + (w.tz[i + 1] - w.tz[i]) * t, tl = Math.hypot(tx, tz) || 1;
            const nx = (side > 0 ? -tz : tz) / tl, nz = (side > 0 ? tx : -tx) / tl, h = side > 0 ? w.hR[i] + (w.hR[i + 1] - w.hR[i]) * t : w.hL[i] + (w.hL[i + 1] - w.hL[i]) * t;
            return { x0: x + nx * h, z0: z + nz * h, x1: x + nx * (h + BAND_W), z1: z + nz * (h + BAND_W), mx: x + nx * (h + BAND_W / 2), mz: z + nz * (h + BAND_W / 2) };
          });
          const ok = ends.every((e) => inRing(o, e.mx, e.mz) && net.cover(e.x0, e.z0, { skip: w }) < -0.3 && net.cover(e.x1, e.z1, { skip: w }) < -0.3 && net.cover(e.mx, e.mz, { skip: w }) < -0.3);
          const u0 = (s + l * t0) / 1.0, u1 = (s + l * t1) / 1.0;
          if (ok) {
            const q = (e, u, inner) => B.vert(inner ? e.x0 : e.x1, BAND_Y, inner ? e.z0 : e.z1, u, inner ? 0.2 : 0.8, UP, [0.86, 0.86, 0.88]);
            B.quad(q(ends[0], u0, true), q(ends[0], u0, false), q(ends[1], u1, false), q(ends[1], u1, true)); n++;
          }
        }
        s += l;
      }
    }
  }
  return n;
}

/** Lays the island aprons and paths. lots = massing MeshBuilder of the parking lots (asphalt), kerb = MB(true) of the kerb stones, asph = MB of the asphalt footways, ribbon(B, pts, w, y, tile) of paths.js,
 *  built(owner) = is the module of the owner in the build list, net = the street network (an apron cell on a carriageway is dropped), lines = the routing lines of buildPaths (pathLines). */
export function buildIslands({ lots, kerb, asph, ribbon, built, net, lines, asphTile = 3, y = 0.04 }) {
  const out = { aprons: 0, kerbs: 0, paths: 0 };
  for (const A of APRONS) {
    if (!built(A.owner)) continue;
    const o = []; if (A.ring) { const r = A.ring(); for (const q of r || []) o.push(...(Array.isArray(q) ? q : [q.x, q.z])); } else for (const [x, z] of A.poly) o.push(...toWorld(A.F, x, z));
    if (o.length < 6) continue;
    if (!isIsland(o[0], o[1])) continue;
    let onRoad = 0; for (let i = 0; i < o.length; i += 2) if (net.cover(o[i], o[i + 1], {}) > -0.5) onRoad++;
    if (onRoad) continue;                                                                          // (a corner on a carriageway: the rule would have to clip; none does today)
    addCap(lots, { o, h: [] }, ROAD_Y - 0.002, { uvScale: 8 }); out.aprons++;
    for (const [x0, z0, x1, z1, nx, nz] of A.kerbs) {
      const a = toWorld(A.F, x0, z0), b = toWorld(A.F, x1, z1), n = dirWorld(A.F, nx, nz), l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
      // the end of a run that meets another run is lengthened by one kerb width at the END point only, so the corner square is covered once
      out.kerbs += kerbRun(kerb, a[0], a[1], b[0] + ux * KERB_W, b[1] + uz * KERB_W, n[0], n[1]);
    }
  }
  if (built('landmarksPetrovskyStadium')) { const r = STADIUM_RINGS.find((q) => q.id === 'apron'); out.bands = edgeBands(kerb, net, r && r.ring.flat ? r.ring.flat() : r && r.ring); }
  for (const P of islandPaths()) {
    if (!built(P.owner)) continue;
    ribbon(asph, P.pts, P.w, y + 0.001, asphTile); out.paths++;
    lines.push({ id: P.id, pts: P.pts.slice(), w: P.w, hw: 'footway' });
  }
  return out;
}
