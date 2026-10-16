// streets/net.js - the drivable road network derived from data ROADS (pure data, no three.js, runs in node):
//   * every drivable, non-tunnel way becomes a smoothed, densified polyline with per-vertex left / right half widths (carriageway +
//     parking pockets), tangents and arclength. OSM nodes are rebuilt from the data: shared vertices, ways that end on another way's
//     segment (the baked data dropped collinear vertices, e.g. Ammosova x Yaroslavskogo) and crossings are pinned so smoothing never moves them
//   * junction NODES with sorted arms, rounded corner fillets (asphalt patches + kerb arcs), degree-2 joints taper the width
//   * kerb runs = road edges minus everything inside another road / fillet / zebra, zebra CROSSINGS (OSM ways + crossing nodes on the ways)
// Right-hand traffic, +X east, +Z south. A way's "right" normal is (-tz, tx) (south when it runs east); hR is the half width on that side.
import { ROADS, CROSSINGS, CROSSING_NODES, SIGNALS, BUS_STOPS, EXTENT, TRAMWAYS, AREAS, GREEN } from '../data/city.js';
import { facadeDist } from './bld.js';
import { deckAt } from './decks.js';
import { pairs, densify, segClosest, clamp, TAU, wrapPI, sstep, PointGrid } from './util.js';
import { isOpen, isIsland, isIslandReach } from './region.js';
import { wayFix, bumpPoints } from './island-data.js';
import { LATE_ROADS } from '../data/late-roads.js';
import { waterPieces, ringTester } from '../environment/waterways.js';

/** TEMPORARY STRUCTURES are not part of the lasting city: the timber bypass bridge of the 2025-26 reconstruction beside the Kronverksky Bridge (way, deck, two footways). Their records and the
 *  approach stubs that only lead to them (any road / footway shorter than 40 m with an end on an end of a temporary way) are dropped from the network and from the mapped footways
 *  (environment ignores them too: environment/waterways.js PETRO_NO_ZONE; the landmark module claims them and draws nothing). DROPPED = the set of ROADS ids. */
const TEMPORARY = new Set(['w1360562178', 'w1377364608', 'w1377364609', 'w1377367596']);
export const DROPPED = (() => {
  const out = new Set(), ends = [];
  for (const r of ROADS) if (TEMPORARY.has(r.id)) { out.add(r.id); ends.push([r.pts[0], r.pts[1]], [r.pts[r.pts.length - 2], r.pts[r.pts.length - 1]]); }
  if (!ends.length) return out;
  const at = (x, z) => ends.some((e) => Math.hypot(e[0] - x, e[1] - z) < 0.6);
  for (const r of ROADS) {
    if (out.has(r.id)) continue;
    const n = r.pts.length; if (!at(r.pts[0], r.pts[1]) && !at(r.pts[n - 2], r.pts[n - 1])) continue;
    let len = 0; for (let i = 2; i < n; i += 2) len += Math.hypot(r.pts[i] - r.pts[i - 2], r.pts[i + 1] - r.pts[i - 1]);
    if (len < 40) out.add(r.id);
  }
  return out;
})();

/** A TRAM RESERVATION is no road. The paved bed of a double tram track beside a carriageway (Kronverksky pr. along the Alexander Park) is mapped as a service road for emergency vehicles only
 *  (highway=service, service=emergency_access) that runs BETWEEN the two tracks. Such a way (a track within 3 m on its left AND on its right along at least 60 % of its length) carries no cars,
 *  lanes or asphalt: makeWay marks it tramBed and gives it the width of the bed (the outer rails + 1.3 m); streets.js makes it pedestrian-only, extras.js buildTramRails draws the setts bed. */
let TRACKS = null, TRACKS_ST = null;
function trackGrid(streetOnly = false) {
  if (streetOnly ? TRACKS_ST : TRACKS) return streetOnly ? TRACKS_ST : TRACKS;
  const G = new Map(); if (streetOnly) TRACKS_ST = G; else TRACKS = G;
  for (const t of TRAMWAYS) {
    if (t.tunnel || t.layer < 0 || (streetOnly && (t.bridge || t.layer > 0))) continue;
    for (let i = 0; i + 3 < t.pts.length; i += 2) {
      const e = [t.pts[i], t.pts[i + 1], t.pts[i + 2], t.pts[i + 3]];
      for (let cx = Math.floor((Math.min(e[0], e[2]) - 4) / 16); cx <= Math.floor((Math.max(e[0], e[2]) + 4) / 16); cx++) for (let cz = Math.floor((Math.min(e[1], e[3]) - 4) / 16); cz <= Math.floor((Math.max(e[1], e[3]) + 4) / 16); cz++) { const k = cx * 8192 + cz; let l = G.get(k); if (!l) G.set(k, (l = [])); l.push(e); }
    }
  }
  return G;
}
/** distance from (x, z) to the nearest tram track axis within 4 m on the side of the unit normal (nx, nz) (sg = +1) or on the other side (sg = -1); 99 when none. (nx, nz) = (0, 0): either side.
 *  out (optional array): receives the point of the track [x, z]. */
export function trackDist(x, z, nx = 0, nz = 0, sg = 1, out = null, streetOnly = false) {
  let best = 99;
  for (const e of trackGrid(streetOnly).get(Math.floor(x / 16) * 8192 + Math.floor(z / 16)) || []) {
    const c = segClosest(x, z, e[0], e[1], e[2], e[3]); if (c.d >= best || c.d > 4) continue;
    if ((nx || nz) && ((c.x - x) * nx + (c.z - z) * nz) * sg < 0) continue;
    best = c.d; if (out) { out[0] = c.x; out[1] = c.z; }
  }
  return best;
}
/** trackDist for the tracks of the streets only (not the tracks of the bridge decks, which the bridges module lays and keeps clear itself): the rail clearance of furniture, lamps and stops */
export const streetTrackDist = (x, z) => trackDist(x, z, 0, 0, 1, null, true);
function tramReservation(r, pts) {
  if (r.hw !== 'service' || r.sub !== 'emergency_access') return null;
  let n = 0, both = 0, far = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.05) continue;
    const nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l, m = Math.max(1, Math.ceil(l / 6));
    for (let k = 0; k < m; k++) {
      const x = a[0] + (b[0] - a[0]) * (k + 0.5) / m, z = a[1] + (b[1] - a[1]) * (k + 0.5) / m, dR = trackDist(x, z, nx, nz, 1), dL = trackDist(x, z, nx, nz, -1);
      n++; if (dR < 3 && dL < 3) { both++; far = Math.max(far, dR, dL); }
    }
  }
  return n && both / n >= 0.6 ? { w: 2 * (far + 1.3) } : null;
}

export const DRIVE = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street', 'service']);
const RANKS = { primary: 4, primary_link: 3, secondary: 3, secondary_link: 2, tertiary: 2, tertiary_link: 2, unclassified: 1, residential: 1, living_street: 1, service: 0 };
const PARK_DEPTH = { perpendicular: 5.0, diagonal: 4.2, parallel: 2.2 };

const turnDeg = (a, b, c) => {
  const ux = b[0] - a[0], uz = b[1] - a[1], vx = c[0] - b[0], vz = c[1] - b[1];
  const lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz); if (lu < 1e-6 || lv < 1e-6) return 0;
  return Math.acos(clamp((ux * vx + uz * vz) / (lu * lv), -1, 1)) * 180 / Math.PI;
};
/** Chaikin corner cutting that keeps the end points, the pinned vertices (junction nodes) and sharp corners fixed. */
function chaikinPinned(pts, pin, iters = 2, keepDeg = 55) {
  let P = pts.map((p, i) => ({ p, pin: !!pin[i] }));
  for (let it = 0; it < iters; it++) {
    const n = P.length; if (n < 3) break;
    const sharp = P.map((q, i) => i === 0 || i === n - 1 || q.pin || turnDeg(P[i - 1].p, q.p, P[i + 1].p) > keepDeg);
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const a = P[i].p, b = P[i + 1].p;
      if (sharp[i]) out.push(P[i]); else out.push({ p: [0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], pin: false });
      if (!sharp[i + 1]) out.push({ p: [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]], pin: false });
    }
    out.push(P[n - 1]);
    P = out;
  }
  return { pts: P.map((q) => q.p), pin: P.map((q) => q.pin) };
}

const segSeg = (a, b, c, d) => {                   // proper intersection of ab and cd -> {t, u, x, z} or null
  const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
  if (t <= 0.02 || t >= 0.98 || u <= 0.02 || u >= 0.98) return null;
  return { t, u, x: a[0] + rx * t, z: a[1] + rz * t };
};

/** A STREET UNDER RECONSTRUCTION IS DRAWN FINISHED (open districts, region.js). OSM maps the closed carriageway of a divided street as highway=construction (the bake drops that class)
 *  and, around it, the TEMPORARY traffic scheme: the carriageway that stays open (T) is tagged two-way for that stretch and two short unnamed one-way crossover links lead the closed
 *  direction onto it and back (Pionerskaya ulitsa 2025-26: A -> X -> T against its polyline -> Y -> B). Drawn as mapped, the street loses one carriageway for the length of the works:
 *  the car that follows its own side meets the end of the asphalt. The scene shows the lasting city (the same principle as DROPPED), so the pattern is undone, by topology alone:
 *    T: a two-way way of a named street, a one-way way of the same street ENDS on its first vertex and another STARTS on its last (T is a piece of that carriageway);
 *    Y: an unnamed one-way link of at most 25 m that starts on T's first vertex and ends where a one-way way B of the street starts;
 *    X: an unnamed one-way link of at most 25 m that ends on T's last vertex and starts where a one-way way A of the street ends.
 *  Then T is one-way again (its polyline already runs with its carriageway), X and Y go, and the closed carriageway is restored as a straight way from the end of A to the start of B with
 *  the class, lanes and width of A (id = T's id + 'c'). Returns [{ id, name, from, to, len }]: net.restored. */
export const RESTORED = [];
function restoreClosedCarriageways(ws) {
  const key = (q) => Math.round(q[0] * 10) + ',' + Math.round(q[1] * 10), starts = new Map(), ends = new Map();
  const put = (m, k, W) => { let l = m.get(k); if (!l) m.set(k, (l = [])); l.push(W); };
  for (const W of ws) { put(starts, key(W.pts[0]), W); put(ends, key(W.pts[W.pts.length - 1]), W); }
  const len = (W) => { let l = 0; for (let i = 1; i < W.pts.length; i++) l += Math.hypot(W.pts[i][0] - W.pts[i - 1][0], W.pts[i][1] - W.pts[i - 1][1]); return l; };
  const link = (W) => W.oneway && !W.r.name && W.rank >= 1 && !W.bridge && len(W) <= 25;
  const found = [];
  for (const T of ws) {
    if (T.oneway || !T.r.name || T.rank < 1 || T.bridge) continue;
    const a = T.pts[0], b = T.pts[T.pts.length - 1], carr = (W) => W !== T && W.oneway && W.r.name === T.r.name && W.rank >= 1 && !W.bridge;
    if (!isOpen(a[0], a[1]) || !isOpen(b[0], b[1])) continue;
    if (!(ends.get(key(a)) || []).some(carr) || !(starts.get(key(b)) || []).some(carr)) continue;
    const Y = (starts.get(key(a)) || []).find(link), X = (ends.get(key(b)) || []).find(link); if (!X || !Y || X === Y) continue;
    const A = (ends.get(key(X.pts[0])) || []).find(carr), B = (starts.get(key(Y.pts[Y.pts.length - 1])) || []).find(carr); if (!A || !B) continue;
    found.push({ T, X, Y, A, B });
  }
  const out = [];
  for (const { T, X, Y, A } of found) {
    const p = X.pts[0], q = Y.pts[Y.pts.length - 1];
    T.oneway = 1;
    const C = { r: { ...A.r, id: T.r.id + 'c', pts: [p[0], p[1], q[0], q[1]] }, pts: [[p[0], p[1]], [q[0], q[1]]], pin: [false, false], oneway: 1, rank: A.rank, bridge: false };
    ws[ws.indexOf(X)] = C; ws.splice(ws.indexOf(Y), 1);
    out.push({ id: C.r.id, name: T.r.name, from: p, to: q, len: Math.hypot(q[0] - p[0], q[1] - p[1]), open: T.r.id, dropped: [X.r.id, Y.r.id] });
  }
  return out;
}

/** A VIADUCT THAT ENDS IN THE AIR (Vasilievsky Island, 2026-10-08, docs/research/vo-requests-environment.md "-> streets"): the ramp of the Western High-Speed Diameter (w172999967, secondary_link, bridge, layer 1) runs 30 m
 *  out over the open Gulf of Finland (the 'gulf' water rings of environment/waterways.js) where nobody draws the viaduct: an asphalt ribbon with pavements over the sea that stops in the air, lanes for cars
 *  to drive off the shore. A BRIDGE way is cut at the sea: the part that lies in a Gulf ring is dropped, the way ends on the shore line (bisected on the ring edge). Only the open sea: the bridges over the Smolenka, the
 *  harbour and the canal keep their decks (their pavements run over the water on purpose until the bridges module draws them). Open districts only (the Gulf is west of x -6500). */
let SEA = null;
function inSea(x, z) {
  if (!SEA) { SEA = []; try { for (const p of waterPieces()) if (String(p.id).startsWith('gulf')) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); } SEA.push({ b: [x0, x1, z0, z1], test: ringTester(p.o) }); } } catch (e) { SEA = []; } }
  if (!isOpen(x, z)) return false;
  for (const r of SEA) if (x >= r.b[0] && x <= r.b[1] && z >= r.b[2] && z <= r.b[3] && r.test(x, z)) return true;
  return false;
}
const SEA_BACK = 1.6;                                              // (third pass: the end stops 1.6 m before the shore line: the ribbon is 2 x 4 m wide and the shore runs at an angle across it, so the asphalt / kerb / pavers of a flush end reached 0.39 / 0.42 / 1.07 m into the Gulf ring at (-7835, 426))
/** move the end vertex `e` of the polyline `out` back along its last segment by SEA_BACK (the neighbour `e + d` is the interior); a segment that is too short keeps its end */
function pullBack(out, e, d) {
  const A = out[e], B = out[e + d]; if (!B) return out;
  const l = Math.hypot(A[0] - B[0], A[1] - B[1]); if (l < SEA_BACK + 1.0) return out;
  const q = [A[0] + (B[0] - A[0]) * SEA_BACK / l, A[1] + (B[1] - A[1]) * SEA_BACK / l];
  return e === 0 ? [q, ...out.slice(1)] : [...out.slice(0, -1), q];
}
function clipAtSea(pts) {
  const n = pts.length, flags = pts.map((p) => inSea(p[0], p[1]));
  if (!flags.some(Boolean)) return pts;
  const edge = (a, b) => { let lo = 0, hi = 1; const fa = inSea(a[0], a[1]); for (let it = 0; it < 24; it++) { const m = (lo + hi) / 2; if (inSea(a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m) === fa) lo = m; else hi = m; } const t = fa ? hi : lo; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  let out = pts;
  if (flags[0]) {                                                  // the way starts in the sea: drop the leading part
    const j = flags.findIndex((f) => !f); if (j < 0) return [];
    out = pullBack([edge(pts[j - 1], pts[j]), ...pts.slice(j)], 0, 1);
  }
  const m = out.length, fl = out.map((p) => inSea(p[0], p[1])), i = fl.findIndex(Boolean);
  if (i > 0) { out = [...out.slice(0, i), edge(out[i - 1], out[i])]; out = pullBack(out, out.length - 1, -1); }
  void n; void m;
  return out.length >= 2 && Math.hypot(out[out.length - 1][0] - out[0][0], out[out.length - 1][1] - out[0][1]) > 1 ? out : [];
}

/** DEAD ENDS THAT RUN INTO THE WATER (open districts; docs/research/vo-requests-environment.md SECOND PASS "-> streets"): a service road that the map ends ON the water edge (the passenger port quay (-8773, -2023) and
 *  (-8823, -2066), the Gavan quay (-6406, 832)) ends with its last vertex a few decimetres from the quay wall, but the asphalt of a dead end reaches one half width BEYOND that vertex (the round / flat cap of the
 *  4 m ribbon, net.cover): it overhangs the wall by 1.6 - 1.9 m (the 'quay_rail' rows of the strict furniture audit: the wall box across the mouth stands on the asphalt). Such an end is pulled back along its last
 *  segment until the cap is on land: the points 0 / half / one half width ahead of the end, each at the axis and at both edges (+ 0.2 m), none in the water (layout.inRiver). Only a DEAD end (not shared with another
 *  way: no junction, no bridge approach) that is not on a bridge deck (decks.js), of a way that is no bridge itself, and that leaves at least 2 m of way. */
export const TRIMMED = [];                                                   // [{ id, atEnd, x, z, was, back }] the ends pulled back from the water (net.trimmed)
function trimWaterEnds(ws, L) {
  TRIMMED.length = 0;
  if (!L || !L.inRiver) return 0;
  const inW = (x, z) => L.inRiver(x, z);
  let cut = 0;
  for (const W of ws) {
    if (W.bridge) continue;
    const hw = Math.max(1.5, (W.r.w || 4) / 2) + 0.2;
    for (const atEnd of [true, false]) {
      const P = W.pts; if (P.length < 2) continue;
      const e = atEnd ? P.length - 1 : 0, d = atEnd ? -1 : 1;                 // d: the step from the end towards the interior
      const p0 = P[e];
      if (W.pin[e] || !isOpen(p0[0], p0[1]) || deckAt(p0[0], p0[1])) continue;
      const wet = (q, tx, tz) => { const nx = -tz, nz = tx; for (const a of [0, 0.5, 1]) for (const l of [0, -1, 1]) if (inW(q[0] + tx * hw * a + nx * hw * l, q[1] + tz * hw * a + nz * hw * l)) return true; return false; };
      let q = p0, tx = 0, tz = 0, back = 0, dropped = 0;
      for (let guard = 0; guard < 6; guard++) {
        const e2 = atEnd ? P.length - 1 : 0, A = P[e2 + d]; if (!A) break;
        const sl = Math.hypot(P[e2][0] - A[0], P[e2][1] - A[1]); if (sl < 0.05) break;
        tx = (P[e2][0] - A[0]) / sl; tz = (P[e2][1] - A[1]) / sl;           // outward unit tangent
        if (!wet(P[e2], tx, tz)) { q = P[e2]; break; }
        let r = 0, ok = false;
        for (r = 0.2; r <= Math.min(sl - 0.5, hw + 1.5); r += 0.2) { const c = [P[e2][0] - tx * r, P[e2][1] - tz * r]; if (!wet(c, tx, tz)) { q = c; ok = true; break; } }
        if (ok) { P[e2] = q; back += r; break; }
        if (sl - 0.5 <= hw + 1.5 && P.length > 2) { atEnd ? (P.pop(), W.pin.pop()) : (P.shift(), W.pin.shift()); back += sl; dropped++; continue; }       // (a short last segment: its far vertex becomes the end)
        break;
      }
      if (back <= 0) continue;
      let len = 0; for (let i = 1; i < P.length; i++) len += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      if (len < 2) continue;                                                   // (nothing sensible left)
      cut++; TRIMMED.push({ id: W.r.id, atEnd, x: q[0], z: q[1], was: [p0[0], p0[1]], back: Math.round(back * 10) / 10, dropped });
    }
  }
  return cut;
}

/** Rebuild the OSM nodes: pin shared vertices, insert T-junction / crossing vertices into the host ways. */
function rawWays(L = null) {
  const ws = [];
  // LATE ROADS (tools/late-roads-ids.mjs): the three real streets the bake drops as highway=construction come AFTER every ROADS record, so that no existing way changes its index (w.i: the streets output
  // hashes it); a bake that holds them in ROADS (late: 1, last part file) makes src/world/data/late-roads.js redundant: records whose id ROADS has are skipped
  const ids = LATE_ROADS.length ? new Set(ROADS.map((r) => r.id)) : null, all = ids ? ROADS.concat(LATE_ROADS.filter((q) => !ids.has(q.id))) : ROADS;
  for (const r of all) {
    if (!DRIVE.has(r.hw) || r.tunnel || r.layer < 0 || r.layer >= 3) continue;      // (layer 2 = the Kazan Bridge ways: they belong to the network, the gap cut Nevsky in two)
    if (DROPPED.has(r.id)) continue;                                                // a temporary structure and its approach stubs
    let pts = pairs(r.pts).filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 0.05);
    { const fx = wayFix(r); if (fx && fx.shift) pts = bumpPoints(pts, fx); }          // (islands round 2: the centre line of Petrovskaya kosa leaves the office corner, island-data.js WAY_FIX)
    if (r.bridge || r.layer >= 1) pts = clipAtSea(pts);                             // (a viaduct over the open Gulf that nobody draws ends on the shore: clipAtSea)
    if (pts.length < 2) continue;
    let oneway = r.oneway || 0;
    if (oneway === -1) { pts.reverse(); oneway = 1; }
    ws.push({ r, pts, pin: pts.map(() => false), oneway, rank: RANKS[r.hw] ?? 0, bridge: !!(r.bridge || r.layer >= 1) });
  }
  RESTORED.length = 0; for (const e of restoreClosedCarriageways(ws)) RESTORED.push(e);
  for (const W of ws) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of W.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } W.bb = [x0 - 1.2, x1 + 1.2, z0 - 1.2, z1 + 1.2]; }
  const inBB = (W, p) => p[0] >= W.bb[0] && p[0] <= W.bb[1] && p[1] >= W.bb[2] && p[1] <= W.bb[3];
  const ins = (W, i, p) => { W.pts.splice(i + 1, 0, [p[0], p[1]]); W.pin.splice(i + 1, 0, true); };
  // ends that touch another way's segment (T junction without a shared vertex): insert the end point into the host way
  const WGc = 32, wayCells = new Map();                                       // ways by the cells of their bounding box (the end-point search scanned every way for every end)
  ws.forEach((W, wi) => { for (let cx = Math.floor(W.bb[0] / WGc); cx <= Math.floor(W.bb[1] / WGc); cx++) for (let cz = Math.floor(W.bb[2] / WGc); cz <= Math.floor(W.bb[3] / WGc); cz++) { const k = cx * 8192 + cz; let l = wayCells.get(k); if (!l) wayCells.set(k, (l = [])); l.push(wi); } });
  for (const A of ws) for (const e of [0, A.pts.length - 1]) {
    const p = A.pts[e];
    let shared = false; const hosts = [];
    for (const B of (wayCells.get(Math.floor(p[0] / WGc) * 8192 + Math.floor(p[1] / WGc)) || []).map((wi) => ws[wi])) {
      if (B === A || !inBB(B, p)) continue;
      if (B.pts.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.35)) { shared = true; continue; }
      let best = null;
      for (let i = 0; i + 1 < B.pts.length; i++) {
        const c = segClosest(p[0], p[1], B.pts[i][0], B.pts[i][1], B.pts[i + 1][0], B.pts[i + 1][1]);
        if (c.d < 1.0 && c.t > 0.001 && c.t < 0.999 && (!best || c.d < best.d)) best = { B, i, d: c.d };
      }
      if (best) hosts.push(best);
    }
    if (shared || hosts.length) A.pin[e] = true;
    for (const h of hosts) ins(h.B, h.i, p);
  }
  // proper crossings of two roads without a shared node
  const sweep = ws.map((_, i) => i).filter((i) => ws[i].rank >= 1).sort((p, q) => ws[p].bb[0] - ws[q].bb[0]), cand = new Map();       // bounding boxes by a sweep along x: the same pairs in the same order, without the 10 M pair tests
  for (let ii = 0; ii < sweep.length; ii++) {
    const a = sweep[ii], A = ws[a];
    for (let jj = ii + 1; jj < sweep.length; jj++) {
      const b = sweep[jj], B = ws[b]; if (B.bb[0] > A.bb[1]) break;
      if (A.bb[3] < B.bb[2] || B.bb[3] < A.bb[2]) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b); let l = cand.get(lo); if (!l) cand.set(lo, (l = [])); l.push(hi);
    }
  }
  for (let a = 0; a < ws.length; a++) for (const b of (cand.get(a) || []).sort((p, q) => p - q)) {
    const A = ws[a], B = ws[b];
    for (let i = 0; i + 1 < A.pts.length; i++) for (let j = 0; j + 1 < B.pts.length; j++) {
      const q = segSeg(A.pts[i], A.pts[i + 1], B.pts[j], B.pts[j + 1]); if (!q) continue;
      ins(A, i, [q.x, q.z]); ins(B, j, [q.x, q.z]); i++; break;
    }
  }
  // shared vertices
  const key = (p) => Math.round(p[0] * 8) + ',' + Math.round(p[1] * 8), seen = new Map();
  ws.forEach((W, wi) => W.pts.forEach((p, i) => { const k = key(p); let l = seen.get(k); if (!l) seen.set(k, (l = [])); l.push([wi, i]); }));
  for (const l of seen.values()) if (new Set(l.map((q) => q[0])).size >= 2) for (const [wi, i] of l) ws[wi].pin[i] = true;
  trimWaterEnds(ws, L);                                                        // (dead ends that run into the water: cut back to the shore, open districts)
  // main streets that leave the data extent run on straight for 70 m (to the edge of the environment's ground), so no avenue ends in a field
  const border = (p) => p[0] < EXTENT.x0 + 2.5 || p[0] > EXTENT.x1 - 2.5 || p[1] < EXTENT.z0 + 2.5 || p[1] > EXTENT.z1 - 2.5;
  for (const W of ws) {
    if (W.rank < 2 || !W.r.name) continue;
    for (const e of [0, W.pts.length - 1]) {
      const p = W.pts[e]; if (W.pin[e] || !border(p)) continue;
      const q = W.pts[e === 0 ? Math.min(W.pts.length - 1, 1) : W.pts.length - 2]; let back = q, acc = 0;
      for (let i = e === 0 ? 1 : W.pts.length - 2; i >= 0 && i < W.pts.length; i += e === 0 ? 1 : -1) { back = W.pts[i]; acc = Math.hypot(back[0] - p[0], back[1] - p[1]); if (acc > 25) break; }
      let dx = p[0] - back[0], dz = p[1] - back[1]; const l = Math.hypot(dx, dz); if (l < 1) continue; dx /= l; dz /= l;
      const add = [[p[0] + dx * 35, p[1] + dz * 35], [p[0] + dx * 70, p[1] + dz * 70]];
      if (e === 0) { W.pts.unshift(...add.reverse()); W.pin.unshift(false, false); } else { W.pts.push(...add); W.pin.push(false, false); }
    }
  }
  return ws;
}

function makeWay(W, idx) {
  const r = W.r;
  const sm = W.pts.length > 2 ? chaikinPinned(W.pts, W.pin, 2, 55) : { pts: W.pts, pin: W.pin };
  // densify, keeping the pinned flags
  const out = [], pin = [];
  for (let i = 0; i < sm.pts.length; i++) {
    if (i === 0) { out.push(sm.pts[0]); pin.push(sm.pin[0]); continue; }
    const a = sm.pts[i - 1], b = sm.pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), step = W.rank >= 2 ? 6 : 10, k = Math.max(1, Math.ceil(l / step));
    for (let j = 1; j <= k; j++) { out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); pin.push(j === k ? sm.pin[i] : false); }
  }
  // the decks of the bridges module (decks.js): a vertex at every deck edge, on the deck side, so asphalt ribbons can stop exactly there
  for (let i = out.length - 1; i >= 1; i--) {
    const a = out[i - 1], b = out[i], da = !!deckAt(a[0], a[1]), db = !!deckAt(b[0], b[1]); if (da === db) continue;
    let lo = 0, hi = 1;
    for (let it = 0; it < 14; it++) { const m = (lo + hi) / 2; if (!!deckAt(a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m) === da) lo = m; else hi = m; }
    const t = da ? lo : hi; out.splice(i, 0, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); pin.splice(i, 0, false);
  }
  const n = out.length;
  const x = new Array(n), z = new Array(n), s = new Array(n);
  for (let i = 0; i < n; i++) { x[i] = out[i][0]; z[i] = out[i][1]; s[i] = i ? s[i - 1] + Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]) : 0; }
  const tx = new Array(n), tz = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    const dx = x[b] - x[a], dz = z[b] - z[a], l = Math.hypot(dx, dz) || 1; tx[i] = dx / l; tz[i] = dz / l;
  }
  const bed = tramReservation(r, W.pts), fix = wayFix(r), w0 = bed ? bed.w : (fix && fix.w ? fix.w : (r.w ?? 6));
  return {
    i: idx, id: r.id, hw: r.hw, name: r.name || null, rank: W.rank, w: w0, oneway: W.oneway, rec: r, bridge: W.bridge, tramBed: !!bed,
    cobble: false,                                    // every drivable road is asphalt (the two OSM surface=cobblestone service ways included); surface.js no longer reads the flag
    lanesTag: r.lanes || 0, lanesF: r.lanesFwd || 0, lanesB: r.lanesBwd || 0,
    n, x, z, s, L: s[n - 1], tx, tz, pin, deck: x.map((px, i) => (deckAt(px, z[i]) ? 1 : 0)),
    hb: new Array(n).fill(w0 / 2),                    // base (carriageway) half width, tapered at joints
    hL: new Array(n).fill(w0 / 2), hR: new Array(n).fill(w0 / 2),   // + parking pockets
    parkL: new Array(n).fill(0), parkR: new Array(n).fill(0),
    cuts: { L: [], R: [] }, nodes: [], free0: false, free1: false,
  };
}

const nearestIdx = (w, s) => { let k = 0; while (k < w.n - 2 && w.s[k + 1] < s) k++; return k; };
export function pointAtS(w, s) {
  s = clamp(s, 0, w.L); const k = nearestIdx(w, s), f = (s - w.s[k]) / Math.max(1e-9, w.s[k + 1] - w.s[k]);
  return { x: w.x[k] + (w.x[k + 1] - w.x[k]) * f, z: w.z[k] + (w.z[k + 1] - w.z[k]) * f, k, f };
}

// ------------------------------------------------------------------ junction nodes
function buildNodes(net) {
  const byKey = new Map();
  for (const w of net.ways) for (let k = 0; k < w.n; k++) {
    if (!w.pin[k]) continue;
    const key = Math.round(w.x[k] * 4) + ',' + Math.round(w.z[k] * 4);
    let nd = byKey.get(key);
    if (!nd) { nd = { id: 'N' + net.nodes.length, x: w.x[k], z: w.z[k], inc: [], arms: [] }; byKey.set(key, nd); net.nodes.push(nd); }
    nd.inc.push({ w, k });
    w.nodes.push({ k, s: w.s[k], node: nd });
  }
  for (const w of net.ways) w.nodes.sort((a, b) => a.k - b.k);
  // way ends that are not nodes: free ends (map border / dead ends)
  for (const w of net.ways) { w.free0 = !w.pin[0]; w.free1 = !w.pin[w.n - 1]; }
}

/** half widths on the +normal / -normal side of an arm that leaves the node along the way (along = +1 / -1) */
function armAt(w, k, along, nd) {
  const sN = w.s[k], la = clamp(sN + along * 9, 0, w.L);
  if (Math.abs(la - sN) < 1.2) return null;
  const p = pointAtS(w, la);
  let dx = p.x - nd.x, dz = p.z - nd.z; const l = Math.hypot(dx, dz); if (l < 0.8) return null; dx /= l; dz /= l;
  const kk = nearestIdx(w, la);
  const hp = along > 0 ? w.hR[kk] : w.hL[kk], hm = along > 0 ? w.hL[kk] : w.hR[kk];
  // the arm ends at the next node / the end of the way
  let len = along > 0 ? w.L - sN : sN;
  for (const q of w.nodes) { const d = (q.s - sN) * along; if (d > 1.5 && d < len) len = d; }
  return { w, k, along, sN, dx, dz, th: Math.atan2(dz, dx), hp, hm, len: Math.min(len, 60), box: 0 };
}

function taperJoint(a, b) {
  const wa = a.w, wb = b.w; if (Math.abs(wa.w - wb.w) < 0.05) return;
  // true continuation: the two arms point away from each other
  if (a.dx * b.dx + a.dz * b.dz > -0.75) return;
  const mid = (wa.w + wb.w) / 4, D = 26;
  for (const [arm, w] of [[a, wa], [b, wb]]) {
    for (let k = 0; k < w.n; k++) {
      const d = Math.abs(w.s[k] - arm.sN); if (d > D) continue;
      const g = 1 - sstep(0, D, d);
      w.hb[k] = w.hb[k] + (mid - w.hb[k]) * g;
    }
  }
}

function makeFillet(J, X, Y) {
  const phi = ((Y.th - X.th) % TAU + TAU) % TAU;
  if (phi < 0.55 || phi > Math.PI - 0.12) return null;
  const nX = [-X.dz, X.dx], nY = [-Y.dz, Y.dx];
  const rx = -(X.hp * nX[0] + Y.hm * nY[0]), rz = -(X.hp * nX[1] + Y.hm * nY[1]);
  const det = -Math.sin(phi);
  const a = (-rx * Y.dz + Y.dx * rz) / det, b = (X.dx * rz - X.dz * rx) / det;
  const Px = J.x + X.hp * nX[0] + a * X.dx, Pz = J.z + X.hp * nX[1] + a * X.dz;
  const small = X.w.rank === 0 || Y.w.rank === 0;
  let R = small ? 2.8 : clamp(0.35 * (X.w.w + Y.w.w) + 0.5, 3, 9);
  let t = R / Math.tan(phi / 2);
  const tmax = 0.6 * Math.min(X.len - Math.max(a, 0), Y.len - Math.max(b, 0));
  if (tmax < 1.0) return null;
  if (t > tmax) { R *= tmax / t; t = tmax; }
  if (R < 1.4) return null;
  const TX = [Px + t * X.dx, Pz + t * X.dz], TY = [Px + t * Y.dx, Pz + t * Y.dz];
  const C = [TX[0] + R * nX[0], TX[1] + R * nX[1]];
  const aX = Math.atan2(TX[1] - C[1], TX[0] - C[0]), aY = Math.atan2(TY[1] - C[1], TY[0] - C[0]);
  const dA = wrapPI(aY - aX);
  const m = R < 3.5 ? Math.max(2, Math.ceil(Math.abs(dA) / 0.5)) : Math.max(3, Math.ceil(Math.abs(dA) / 0.3)), arc = [];     // 15 degrees per piece (was 9): corner kerbs / asphalt fans / corner patches were a third of the ground triangles
  for (let k = 0; k <= m; k++) { const ang = aX + dA * k / m; arc.push([C[0] + R * Math.cos(ang), C[1] + R * Math.sin(ang)]); }
  const cut = (arm, ext, side) => {
    const e = Math.max(ext, 0) + t + 0.12;
    if (arm.along > 0) arm.w.cuts[side].push([arm.sN - 0.6, arm.sN + e]); else arm.w.cuts[side].push([arm.sN - e, arm.sN + 0.6]);
  };
  cut(X, a, X.along > 0 ? 'R' : 'L');
  cut(Y, b, Y.along > 0 ? 'L' : 'R');
  X.box = Math.max(X.box, Math.max(a, 0) + t); Y.box = Math.max(Y.box, Math.max(b, 0) + t);
  // polygon of the asphalt patch: P + the arc (a fan)
  const poly = [[Px, Pz], ...arc];
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  return { P: [Px, Pz], TX, TY, C, R, t, arc, poly, box: [x0, x1, z0, z1], ways: [X.w, Y.w], arms: [X, Y], nA: nX, nB: nY, a, b, node: J };
}

function findJunctions(net) {
  for (const nd of net.nodes) {
    const arms = [];
    for (const { w, k } of nd.inc) {
      if (k > 0) { const a = armAt(w, k, -1, nd); if (a) arms.push(a); }
      if (k < w.n - 1) { const a = armAt(w, k, 1, nd); if (a) arms.push(a); }
    }
    arms.sort((p, q) => p.th - q.th);
    const M = [];
    for (const a of arms) { const l = M[M.length - 1]; if (l && Math.abs(wrapPI(a.th - l.th)) < 0.2) { if (a.hp + a.hm > l.hp + l.hm) M[M.length - 1] = a; } else M.push(a); }
    if (M.length > 1 && Math.abs(wrapPI(M[0].th - M[M.length - 1].th)) < 0.2) M.pop();
    nd.arms = M;
    nd.deg = M.length;
    if (M.length === 2) taperJoint(M[0], M[1]);
  }
  // parking pockets / half widths need the tapered base widths: recompute hL / hR after the tapers, then the arms
  for (const w of net.ways) applyPockets(net, w);
  for (const nd of net.nodes) {
    for (const a of nd.arms) { const kk = nearestIdx(a.w, clamp(a.sN + a.along * 9, 0, a.w.L)); a.hp = a.along > 0 ? a.w.hR[kk] : a.w.hL[kk]; a.hm = a.along > 0 ? a.w.hL[kk] : a.w.hR[kk]; }
    if (nd.arms.length < 3) continue;
    const M = nd.arms;
    for (let k = 0; k < M.length; k++) {
      const X = M[k], Y = M[(k + 1) % M.length];
      if (X.w.rank === 0 && Y.w.rank === 0) continue;                   // courtyard alleys: no kerbs, no fillets
      if (X.w.tramBed || Y.w.tramBed) continue;                         // a tram reservation is no road mouth: no asphalt fan, no kerb arc where the tracks join the street
      const f = makeFillet(nd, X, Y); if (f) net.fillets.push(f);
    }
  }
}

const STOP_POS = BUS_STOPS.filter((b) => b.kind === 'platform').map((b) => [b.x, b.z]);
let STOP_GRID = null;
const stopGrid = () => { if (!STOP_GRID) { STOP_GRID = new PointGrid(20); for (const p of STOP_POS) STOP_GRID.add(p[0], p[1]); } return STOP_GRID; };

/** Kerbside parking policy of a way: { tag: 'left'|'right'|'both', ori } or null. OSM parkingLane tags win; otherwise the narrow side streets of the centre
 *  (docs/research/transport.md section 8: parallel paid parking on Marata, Kolokolnaya, Rubinshteina, Zhukovskogo, Pushkinskaya ...; Bolshaya Moskovskaya
 *  diagonal on the right; Fontanka parallel on the left; NO stopping on Nevsky, Ligovsky, Vosstaniya square, the squares and the primary avenues). */
const NO_PARK = new Set(['Невский проспект', 'Лиговский проспект', 'площадь Восстания', 'Суворовский проспект', 'Гончарная улица', 'Аничков мост', 'Владимирский проспект', 'Литейный проспект', 'Загородный проспект', 'Владимирская площадь', 'Манежная площадь',
  'Дворцовая площадь', 'Дворцовая набережная', 'Дворцовый проезд', 'Адмиралтейский проезд', 'Адмиралтейский проспект', 'Дворцовый мост', 'Садовая улица']);   // west: Palace Square / Embankment / Dvortsovy proezd = no parking (west-life-furniture.md 3.3)
function parkPolicy(w) {
  if (w.bridge) return null;
  { const fx = wayFix(w.rec); if (fx && fx.noPark) return null; }
  if (w.rec.parkingLane) return { tag: w.rec.parkingLane, ori: w.rec.parkingOri || 'parallel' };
  if (w.rank < 1 || w.rank > 3 || !w.name || NO_PARK.has(w.name) || w.hw === 'primary_link' || w.hw === 'secondary_link' || w.hw === 'primary') return null;
  if (w.w > 7.5 || w.L < 30) return null;
  if (w.name === 'набережная реки Фонтанки') return { tag: 'left', ori: 'parallel' };
  if (w.name === 'Большая Московская улица') return { tag: 'right', ori: 'parallel' };
  return { tag: w.oneway ? 'right' : 'both', ori: 'parallel' };
}

/** Parking pockets: the asphalt widens along the kerb (2.2 m parallel bays), tapering in over 5 m, clear of the junctions, the bus stops and wherever the facades
 *  leave less than the pocket + a 1.6 m pavement. */
function applyPockets(net, w) {
  for (let k = 0; k < w.n; k++) { w.hL[k] = w.hR[k] = w.hb[k]; w.parkL[k] = w.parkR[k] = 0; }
  const pol = parkPolicy(w); if (!pol) return;
  const { tag, ori } = pol, depth = PARK_DEPTH[ori] ?? 2.2, margin = ori === 'parallel' ? 11 : 24;
  const stops = w.nodes.filter((q) => q.node.deg >= 3).map((q) => q.s);
  if (!w.free0) stops.push(0); if (!w.free1) stops.push(w.L);
  let any = false;
  for (let k = 0; k < w.n; k++) {
    let d = 1e9; for (const sp of stops) d = Math.min(d, Math.abs(w.s[k] - sp));
    if (deckAt(w.x[k], w.z[k], 8)) continue;                         // no parking pockets on or next to a bridge deck
    const dBus = stopGrid().minDist(w.x[k], w.z[k], 20);               // (the nearest platform within 20 m; sstep(13, 20) is 1 for everything farther: the same ramp as the scan of every stop)
    const ramp = sstep(margin, margin + 9, d) * sstep(13, 20, dBus);
    if (ramp <= 0) continue;
    const rx = -w.tz[k], rz = w.tx[k];
    for (const side of ['R', 'L']) {
      if (!((side === 'R' && (tag === 'right' || tag === 'both')) || (side === 'L' && (tag === 'left' || tag === 'both')))) continue;
      const sg = side === 'R' ? 1 : -1, h = w.hb[k];
      if (facadeDist(w.x[k] + rx * sg * (h + depth + 1.8), w.z[k] + rz * sg * (h + depth + 1.8), 2.4) < 2.0) continue;     // too narrow between the houses
      if (net.shore(w.x[k] + rx * sg * (h + depth * ramp), w.z[k] + rz * sg * (h + depth * ramp)) < 0.8) continue;           // the bay would reach the quay wall (Moika, Fontanka, Sadovaya ...): the asphalt stays clear of the coping
      if (side === 'R') { w.hR[k] += depth * ramp; w.parkR[k] = depth * ramp; } else { w.hL[k] += depth * ramp; w.parkL[k] = depth * ramp; }
      any = true;
    }
  }
  if (any) w.parkOri = ori;
}

// ------------------------------------------------------------------ spatial grid + queries
function buildGrid(net) {
  const c = net.cell;
  for (const w of net.ways) {
    const m = Math.max(...w.hL, ...w.hR) + 2;                             // (the way's widest half width, once per way: it was spread per segment)
    for (let i = 0; i < w.n - 1; i++) {
      const x0 = Math.floor((Math.min(w.x[i], w.x[i + 1]) - m) / c), x1 = Math.floor((Math.max(w.x[i], w.x[i + 1]) + m) / c);
      const z0 = Math.floor((Math.min(w.z[i], w.z[i + 1]) - m) / c), z1 = Math.floor((Math.max(w.z[i], w.z[i + 1]) + m) / c);
      const ax = w.x[i], az = w.z[i], dx = w.x[i + 1] - ax, dz = w.z[i + 1] - az, l2 = dx * dx + dz * dz;
      const e = { w, i, st: 0, ax, az, dx, dz, l2, l: Math.sqrt(l2) || 1, hL0: w.hL[i], hL1: w.hL[i + 1], hR0: w.hR[i], hR1: w.hR[i + 1] };       // (cover() reads these: no way lookups in the hot loop)
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const k = (cx + 300) * 2048 + (cz + 300); let l = net.grid.get(k); if (!l) net.grid.set(k, (l = [])); l.push(e);
      }
    }
  }
}

/** closest point of way w's segment i to (px,pz), the signed lateral offset (+ = right) and the half width on that side */
export function segInfo(w, i, px, pz) {
  const c = segClosest(px, pz, w.x[i], w.z[i], w.x[i + 1], w.z[i + 1]);
  const dx = w.x[i + 1] - w.x[i], dz = w.z[i + 1] - w.z[i], l = Math.hypot(dx, dz) || 1;
  const nRx = -dz / l, nRz = dx / l;
  const side = (px - c.x) * nRx + (pz - c.z) * nRz;
  const hL = w.hL[i] + (w.hL[i + 1] - w.hL[i]) * c.t, hR = w.hR[i] + (w.hR[i + 1] - w.hR[i]) * c.t;
  return { c, side, h: side > 0 ? hR : hL, dx: dx / l, dz: dz / l, t: c.t };
}

const inRing = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 1; i < o.length; j = i++) { const a = o[i], b = o[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };

/** the fillets whose box touches the 32 m cell of (x, z) (a lazily built grid: cover() used to scan every fillet for every query) */
const FG = 32, NOF = [];
function filletsAt(net, x, z) {
  if (!net._fg || net._fgN !== net.fillets.length) {
    const g = new Map();
    for (const f of net.fillets) for (let cx = Math.floor(f.box[0] / FG); cx <= Math.floor(f.box[1] / FG); cx++) for (let cz = Math.floor(f.box[2] / FG); cz <= Math.floor(f.box[3] / FG); cz++) { const k = cx * 4096 + cz; let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(f); }
    net._fg = g; net._fgN = net.fillets.length;
  }
  return net._fg.get(Math.floor(x / FG) * 4096 + Math.floor(z / FG)) || NOF;
}

function cover(net, px, pz, o) {
  let best = -1e9;
  const c = net.cell, st = ++net.stamp, skip = o.skip, skip2 = o.skip2, minRank = o.minRank || 0, own = o.own, noBed = o.noBed;       // own = { w, s, d }: ignore the segments of w within d metres of s along it (the rest of a looping way counts); noBed: tram reservations (tramBed ways) are no asphalt
  const x0 = Math.floor((px - 14) / c), x1 = Math.floor((px + 14) / c), z0 = Math.floor((pz - 14) / c), z1 = Math.floor((pz + 14) / c);
  for (let cx0 = x0; cx0 <= x1; cx0++) for (let cz0 = z0; cz0 <= z1; cz0++) {
    const list = net.grid.get((cx0 + 300) * 2048 + (cz0 + 300)); if (!list) continue;
    for (let q = 0; q < list.length; q++) {
      const e = list[q]; if (e.st === st) continue; e.st = st;
      const w = e.w; if (w === skip || w === skip2 || w.noCover || (minRank && w.rank < minRank) || (noBed && w.tramBed)) continue;       // (noCover: a rank-0 service way that a sight claims and paves itself: streets.js sets it in the open districts, it is no carriageway any more)
      if (own && w === own.w && Math.abs(w.s[e.i] + e.l / 2 - own.s) < own.d) continue;
      // (segInfo without the allocations and without Math.hypot: this loop runs for every lamp / parking slot / signal candidate)
      const ax = e.ax, az = e.az, dx = e.dx, dz = e.dz, l2 = e.l2;
      let t = l2 < 1e-12 ? 0 : ((px - ax) * dx + (pz - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - (ax + dx * t), ez = pz - (az + dz * t), d2 = ex * ex + ez * ez;
      const side = (ex * -dz + ez * dx) / e.l;                      // (p - c) . n  with n = (-dz, dx) / l
      const h = side > 0 ? e.hR0 + (e.hR1 - e.hR0) * t : e.hL0 + (e.hL1 - e.hL0) * t;
      if (best > -1e8) { const lim = h - best; if (lim <= 0 || d2 >= lim * lim) continue; }        // cannot beat the best cover so far
      const m = h - Math.sqrt(d2);
      if (m > best) best = m;
    }
  }
  if (best < 0.4 && !o.noFillets) for (const f of filletsAt(net, px, pz)) {
    if (px < f.box[0] || px > f.box[1] || pz < f.box[2] || pz > f.box[3]) continue;
    if (f.ways[0] === o.skip && f.ways[1] === o.skip2) continue;
    if (inRing(f.poly, px, pz)) best = Math.max(best, 0.6);
  }
  if (best < 0.4 && !skip) for (const f of patchesAt(net, px, pz)) {         // the strip patches between merged carriageways are carriageway for everybody (buildStripPatches); a caller that asks for the
                                                                               // asphalt of OTHER ways (skip: paint hidden under a foreign carriageway) does not mean them: the median line runs across a patch
    if (px < f.box[0] || px > f.box[1] || pz < f.box[2] || pz > f.box[3]) continue;
    if (inRing(f.poly, px, pz)) { best = 0.6; break; }
  }
  return best;
}

/** cover() for many probes around one point: the segments that can matter within R metres of (cx, cz) are collected once (a segment whose distance from the centre exceeds R + its widest
 *  half width + 0.3 m cannot cover any probe within R by more than -0.3), the returned function answers net.cover(px, pz, o) for probes within R of the centre with the same arithmetic.
 *  Exact for every decision at a threshold above -2 m (the walks / kerb planner: thresholds -0.3 .. 0.3). */
export function coverLocal(net, cx, cz, R, o = {}) {
  // o.ownWay: the returned function takes (px, pz, ownS, ownD) and skips the segments of that way within ownD metres of ownS along it (cover's `own` with a per-probe s)
  const c = net.cell, st = ++net.stamp, skip = o.skip, skip2 = o.skip2, own = o.own, ownWay = o.ownWay || null, ents = [];
  const x0 = Math.floor((cx - R) / c), x1 = Math.floor((cx + R) / c), z0 = Math.floor((cz - R) / c), z1 = Math.floor((cz + R) / c);
  for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
    const list = net.grid.get((gx + 300) * 2048 + (gz + 300)); if (!list) continue;
    for (let q = 0; q < list.length; q++) {
      const e = list[q]; if (e.st === st) continue; e.st = st;
      const w = e.w; if (w === skip || w === skip2 || w.noCover) continue;
      if (own && w === own.w && Math.abs(w.s[e.i] + e.l / 2 - own.s) < own.d) continue;
      let t = e.l2 < 1e-12 ? 0 : ((cx - e.ax) * e.dx + (cz - e.az) * e.dz) / e.l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = cx - (e.ax + e.dx * t), ez = cz - (e.az + e.dz * t), lim = R + Math.max(e.hL0, e.hL1, e.hR0, e.hR1) + 0.3;
      if (ex * ex + ez * ez <= lim * lim) ents.push(e);
    }
  }
  const fil = [];
  if (!o.noFillets) for (let gx = Math.floor((cx - R) / FG); gx <= Math.floor((cx + R) / FG); gx++) for (let gz = Math.floor((cz - R) / FG); gz <= Math.floor((cz + R) / FG); gz++) {
    for (const f of filletsAt(net, gx * FG, gz * FG)) if (!fil.includes(f) && f.box[0] <= cx + R && f.box[1] >= cx - R && f.box[2] <= cz + R && f.box[3] >= cz - R && !(f.ways[0] === skip && f.ways[1] === skip2)) fil.push(f);
  }
  const pat = [];
  if (net.patches && net.patches.length) for (let gx = Math.floor((cx - R) / FG); gx <= Math.floor((cx + R) / FG); gx++) for (let gz = Math.floor((cz - R) / FG); gz <= Math.floor((cz + R) / FG); gz++) {
    for (const f of patchesAt(net, gx * FG, gz * FG)) if (!pat.includes(f) && f.box[0] <= cx + R && f.box[1] >= cx - R && f.box[2] <= cz + R && f.box[3] >= cz - R) pat.push(f);
  }
  return (px, pz, ownS, ownD) => {
    let best = -1e9;
    for (let q = 0; q < ents.length; q++) {
      const e = ents[q], dx = e.dx, dz = e.dz;
      if (ownWay && e.w === ownWay && Math.abs(e.w.s[e.i] + e.l / 2 - ownS) < ownD) continue;
      let t = e.l2 < 1e-12 ? 0 : ((px - e.ax) * dx + (pz - e.az) * dz) / e.l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - (e.ax + dx * t), ez = pz - (e.az + dz * t), d2 = ex * ex + ez * ez;
      const h = (ex * -dz + ez * dx) / e.l > 0 ? e.hR0 + (e.hR1 - e.hR0) * t : e.hL0 + (e.hL1 - e.hL0) * t;
      if (best > -1e8) { const lim = h - best; if (lim <= 0 || d2 >= lim * lim) continue; }
      const m = h - Math.sqrt(d2);
      if (m > best) best = m;
    }
    if (best < 0.4 && fil.length) for (const f of fil) {
      if (px < f.box[0] || px > f.box[1] || pz < f.box[2] || pz > f.box[3]) continue;
      if (inRing(f.poly, px, pz)) best = Math.max(best, 0.6);
    }
    if (best < 0.4 && pat.length) for (const f of pat) {
      if (px < f.box[0] || px > f.box[1] || pz < f.box[2] || pz > f.box[3]) continue;
      if (inRing(f.poly, px, pz)) { best = 0.6; break; }
    }
    return best;
  };
}

// ------------------------------------------------------------------ crossings
const CROSS_KINDS = new Set(['traffic_signals', 'marked', 'yes', 'uncontrolled', 'zebra']);
function analyseCrossings(net) {
  const sites = [], siteGrid = new PointGrid(8), junctions = new PointGrid(16);       // (the sites and the junction nodes were scanned in full for every crossing candidate)
  for (const nd of net.nodes) if (nd.deg >= 3) junctions.add(nd.x, nd.z, nd);
  const near = (x, z, r) => siteGrid.first(x, z, r);
  const roadAt = (x, z) => {
    let best = null;
    net.each(x, z, 16, (w, i) => {
      if (w.rank < 1) return;
      const q = segInfo(w, i, x, z); if (!best || q.c.d - q.h < best.d - best.h) best = { w, i, q, d: q.c.d, h: q.h };
    });
    return best;
  };
  const add = (x, z, o) => {
    const rd = roadAt(x, z); if (!rd || rd.d > rd.h + 3) return;
    const { w, i, q } = rd;
    const k = clamp(i + q.c.t, 0, w.n - 1.001), k0 = Math.floor(k), f = k - k0;
    let tx = w.tx[k0] + (w.tx[k0 + 1] - w.tx[k0]) * f, tz = w.tz[k0] + (w.tz[k0 + 1] - w.tz[k0]) * f; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const cx = q.c.x, cz = q.c.z, s = w.s[i] + (w.s[i + 1] - w.s[i]) * q.t;
    const hL = w.hL[i] + (w.hL[i + 1] - w.hL[i]) * q.t, hR = w.hR[i] + (w.hR[i + 1] - w.hR[i]) * q.t;
    // keep crossings off the junction mouths: at least the cross road's half width + 2 m from every node
    if (junctions.any(cx, cz, 3.5)) return;
    const e = near(cx, cz, 4.5);
    if (e) { e.signalised = e.signalised || !!o.signalised; e.w = Math.max(e.w, o.w || 3); e.ids.push(o.id); return; }
    sites.push(siteGrid.add(cx, cz, { id: o.id, ids: [o.id], x: cx, z: cz, road: w, s, tx, tz, nx: -tz, nz: tx, hL, hR, w: w.hw === 'primary' ? 5 : 3, signalised: !!o.signalised, kind: o.kind || null }));   // zebra width 6 m on the avenue, 4 m elsewhere (stripe zone = w + 1)
  };
  for (const c of CROSSINGS) {
    const P = pairs(c.pts); if (P.length < 2) continue;
    // the point of the crossing line nearest to a road centreline
    let best = null;
    for (let i = 0; i + 1 < P.length; i++) for (const t of [0.15, 0.3, 0.5, 0.7, 0.85]) {
      const x = P[i][0] + (P[i + 1][0] - P[i][0]) * t, z = P[i][1] + (P[i + 1][1] - P[i][1]) * t, rd = roadAt(x, z);
      if (rd && (!best || rd.d / Math.max(rd.h, 1) < best.r)) best = { x, z, r: rd.d / Math.max(rd.h, 1) };
    }
    if (best) add(best.x, best.z, { id: c.id, w: c.w || 3, kind: c.kind });
  }
  const sig = (n) => n.kind === 'traffic_signals' || n.signals === 1;
  for (const n of CROSSING_NODES) {
    if (!CROSS_KINDS.has(n.kind) && n.kind !== 'traffic_signals') continue;
    const e = near(n.x, n.z, 5);
    if (e) { e.signalised = e.signalised || sig(n); continue; }
    add(n.x, n.z, { id: n.id, w: 3, signalised: sig(n), kind: n.kind });
  }
  net.crossings = sites;
}

const CG = 24;
function crossingGrid(net) {
  if (net._cg && net._cgN === net.crossings.length) return net._cg;
  const g = new Map();
  for (const c of net.crossings) {                                  // every crossing in the cells its stripe zone (+ the 8 m of the largest query) can touch
    const R = Math.hypot(c.w / 2 + 8, Math.max(c.hL, c.hR) + 10);
    for (let cx = Math.floor((c.x - R) / CG); cx <= Math.floor((c.x + R) / CG); cx++) for (let cz = Math.floor((c.z - R) / CG); cz <= Math.floor((c.z + R) / CG); cz++) { const k = cx * 4096 + cz; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(c); }
  }
  net._cg = g; net._cgN = net.crossings.length; return g;
}
export function nearCrossing(net, x, z, r) {
  const list = crossingGrid(net).get(Math.floor(x / CG) * 4096 + Math.floor(z / CG)); if (!list) return null;
  for (const c of list) {
    // inside the stripe zone: |along| < w/2 + r and the lateral position within the carriageway + r
    const dx = x - c.x, dz = z - c.z, al = dx * c.tx + dz * c.tz, la = dx * c.nx + dz * c.nz;
    if (Math.abs(al) < c.w / 2 + r && la > -c.hL - r - 2 && la < c.hR + r + 2) return c;
  }
  return null;
}

// ------------------------------------------------------------------ kerb runs
/** mitre factors: the asphalt ribbon (surface.js) offsets a vertex by h * mit along the vertex normal, so that it keeps its width in the bends; the kerbs and the pavements start there too */
export function mitres(w) {
  const mit = new Array(w.n).fill(1);
  for (let i = 1; i < w.n - 1; i++) {
    const ax = w.x[i] - w.x[i - 1], az = w.z[i] - w.z[i - 1], al = Math.hypot(ax, az) || 1, bx = w.x[i + 1] - w.x[i], bz = w.z[i + 1] - w.z[i], bl = Math.hypot(bx, bz) || 1;
    const nx = -w.tz[i], nz = w.tx[i];
    mit[i] = 1 / Math.max(0.55, Math.min(nx * (-az / al) + nz * (ax / al), nx * (-bz / bl) + nz * (bx / bl)));
  }
  return mit;
}
const KERB_STEP = 1.4;
/** Only cache which contiguous samples survived clipping. Coordinates and normals
 * are reconstructed from the current ways/fillets, with the generator's exact arithmetic. */
export function packKerbRuns(net) {
  const fillets = new Map(net.fillets.map((f, i) => [f, i]));
  const runs = new Int32Array(net.kerbRuns.length * 5);
  for (let i = 0; i < net.kerbRuns.length; i++) {
    const r = net.kerbRuns[i], arc = r.kind === 'arc', side = ['L', 'R', 'A'].indexOf(r.side);
    const n = Math.max(2, Math.ceil(r.w.L / KERB_STEP) + 1);
    const first = arc ? r.fillet.arc.findIndex(p => p[0] === r.pts[0].x && p[1] === r.pts[0].z) : Math.round(r.pts[0].s / r.w.L * (n - 1));
    const fi = arc ? fillets.get(r.fillet) : -1;
    if (side < 0 || first < 0 || (arc && fi === undefined) || arc !== (side === 2) || net.ways[r.w.i] !== r.w) throw new Error('Invalid kerb run for bake');
    // Fail the bake if a future generator no longer emits contiguous samples.
    for (let j = 0; j < r.pts.length; j++) {
      const p = r.pts[j], a = arc && r.fillet.arc[first + j];
      if (arc ? !a || a[0] !== p.x || a[1] !== p.z : p.s !== r.w.L * (first + j) / (n - 1)) throw new Error('Non-contiguous kerb run');
    }
    runs.set([r.w.i, side, fi, first, r.pts.length], i * 5);
  }
  return { format: 1, ways: net.ways.length, fillets: net.fillets.length, runs };
}
export function hydrateKerbRuns(net, baked) {
  if (!baked || baked.format !== 1 || baked.ways !== net.ways.length || baked.fillets !== net.fillets.length || !(baked.runs instanceof Int32Array) || baked.runs.length % 5) throw new Error('Invalid street-kerbs bake');
  const runs = [], mits = new Map(), data = baked.runs;
  for (let at = 0; at < data.length; at += 5) {
    const w = net.ways[data[at]], side = data[at + 1], fi = data[at + 2], first = data[at + 3], count = data[at + 4];
    if (!w || side < 0 || side > 2 || first < 0 || count < 2) throw new Error('Invalid baked kerb sample range');
    if (side === 2) {
      const f = net.fillets[fi];
      if (!f || f.ways[0] !== w || first + count > f.arc.length) throw new Error('Invalid baked fillet run');
      const r = { pts: [], w, side: 'A', kind: 'arc', fillet: f };
      for (let k = first; k < first + count; k++) {
        const [ax, az] = f.arc[k], ox = f.C[0] - ax, oz = f.C[1] - az, ol = Math.hypot(ox, oz) || 1;
        r.pts.push({ x: ax, z: az, ox: ox / ol, oz: oz / ol, s: 0 });
      }
      runs.push(r);
    } else {
      const n = Math.max(2, Math.ceil(w.L / KERB_STEP) + 1);
      if (fi !== -1 || first + count > n) throw new Error('Invalid baked road-edge run');
      let mit = mits.get(w); if (!mit) { mit = w.mit || mitres(w); mits.set(w, mit); }
      const r = { pts: [], w, side: side ? 'R' : 'L', kind: 'edge' }, sg = side ? 1 : -1;
      for (let k = first; k < first + count; k++) {
        const s = w.L * k / (n - 1), p = pointAtS(w, s), i = p.k, f = p.f;
        const tx = w.tx[i] + (w.tx[i + 1] - w.tx[i]) * f, tz = w.tz[i] + (w.tz[i + 1] - w.tz[i]) * f, tl = Math.hypot(tx, tz) || 1;
        const nRx = -tz / tl, nRz = tx / tl;
        const h = (side ? w.hR[i] + (w.hR[i + 1] - w.hR[i]) * f : w.hL[i] + (w.hL[i + 1] - w.hL[i]) * f) * (mit[i] + (mit[i + 1] - mit[i]) * f);
        r.pts.push({ x: p.x + nRx * h * sg, z: p.z + nRz * h * sg, ox: nRx * sg, oz: nRz * sg, s });
      }
      runs.push(r);
    }
  }
  // Commit only after every range was validated and reconstructed.
  net.kerbRuns = runs;
}
function buildKerbRuns(net) {
  const STEP = KERB_STEP, runs = [];
  // the probes of a way come in 40 m stretches of s: ONE local cover per stretch (coverLocal with the way as ownWay: exact above -0.3 for every probe of the stretch, whose centreline
  // point is within 20 m of the stretch centre and whose kerb offset is below 1.9 x the way's widest half width (the mitre factor is at most 1 / 0.55); the test is at -0.28)
  let cl = null, clW = null, clC = -1, maxH = 0;
  const slabs = !!(net.slabs && net.slabs.length);
  const visible = (x, z, w, s) => cl(x, z, s, 40) < -0.28 && !nearCrossing(net, x, z, 0.4) && !deckAt(x, z, 0.2);
  for (const w of net.ways) {
    if (w.rank < 1) continue;                                        // courtyard roads: no kerbs
    const mit = w.mit || mitres(w);
    maxH = 0; for (let i = 0; i < w.n; i++) maxH = Math.max(maxH, w.hL[i], w.hR[i]);
    for (const side of ['L', 'R']) {
      let cur = null;
      const cuts = w.cuts[side];
      const n = Math.max(2, Math.ceil(w.L / STEP) + 1);
      for (let k = 0; k < n; k++) {
        const s = w.L * k / (n - 1), p = pointAtS(w, s), i = p.k, f = p.f;
        const chunk = Math.floor(s / 40);
        if (clW !== w || clC !== chunk) { const pc = pointAtS(w, Math.min(w.L, (chunk + 0.5) * 40)); cl = coverLocal(net, pc.x, pc.z, 20 + 1.9 * maxH + 0.5, { ownWay: w }); clW = w; clC = chunk; }
        const tx = w.tx[i] + (w.tx[i + 1] - w.tx[i]) * f, tz = w.tz[i] + (w.tz[i + 1] - w.tz[i]) * f, tl = Math.hypot(tx, tz) || 1;
        const nRx = -tz / tl, nRz = tx / tl;
        const h = (side === 'R' ? w.hR[i] + (w.hR[i + 1] - w.hR[i]) * f : w.hL[i] + (w.hL[i + 1] - w.hL[i]) * f) * (mit[i] + (mit[i + 1] - mit[i]) * f);
        const sg = side === 'R' ? 1 : -1;
        const ex = p.x + nRx * h * sg, ez = p.z + nRz * h * sg;
        const vis = !cuts.some((c) => s >= c[0] && s <= c[1]) && visible(ex, ez, w, s) && !(slabs && slabAt(net, ex + nRx * sg * 0.45, ez + nRz * sg * 0.45));       // (no kerb along a slab median)
        if (vis) {
          if (!cur) { cur = { pts: [], w, side, kind: 'edge' }; runs.push(cur); }
          cur.pts.push({ x: ex, z: ez, ox: nRx * sg, oz: nRz * sg, s });
        } else cur = null;
      }
    }
  }
  for (const f of net.fillets) {
    let cur = null;
    const kisl = isIslandReach(f.P[0], f.P[1]);
    for (const [ax, az] of f.arc) {
      const ox = f.C[0] - ax, oz = f.C[1] - az, ol = Math.hypot(ox, oz) || 1;
      // clear of every other carriageway, and not inside the asphalt of its own two ways either (an arc computed before fillMedians widened a way lies inside the merged roadway)
      // (nor a kerb whose pavement side, 0.35 m towards the centre of the arc, is asphalt again: the fan of ANOTHER junction's fillet, a strip patch; open districts since the Petrograd round, every district
      //  since 2026-10-07: the 'kerb stone on the carriageway' clusters of the surface audit, w356551710 at (346, 403) and the 4-ya Sovetskaya fillet (904, -196))
      if (cover(net, ax, az, { skip: f.ways[0], skip2: f.ways[1], noFillets: true }) < -0.2 && cover(net, ax, az, { noFillets: true }) < 0.3 && !nearCrossing(net, ax, az, 0.4) && !deckAt(ax, az, 0.2)
        && !(cover(net, ax + ox / ol * 0.35, az + oz / ol * 0.35, {}) > 0.1)) {
        // islands round 2 (streets owner 2): the STONE between two kerb points lies on the asphalt of ANOTHER junction fillet when two fillets overlap at a multi-way junction (the two arcs of w159233352 at (-3638, -4945):
        // each end point passes the tests above, the stone between them lies along the closing edge of the neighbour polygon: its inner edge, the arc chord, is inside it): the run is cut there (the surface audit's single 'kerb stone on the carriageway')
        if (kisl && cur) { const q = cur.pts[cur.pts.length - 1], mx = (q.x + ax) / 2, mz = (q.z + az) / 2; if (cover(net, mx, mz, { skip: f.ways[0], skip2: f.ways[1] }) > 0.1) cur = null; }
        if (!cur) { cur = { pts: [], w: f.ways[0], side: 'A', kind: 'arc', fillet: f }; runs.push(cur); }
        cur.pts.push({ x: ax, z: az, ox: ox / ol, oz: oz / ol, s: 0 });
      } else cur = null;
    }
  }
  net.kerbRuns = runs.filter((r) => r.pts.length >= 2);
}

// ------------------------------------------------------------------ the slab median of Nalichnaya ulitsa
/** STREETS WITH A TRAM MEDIAN OF CONCRETE SLABS (open districts). Most tram streets of Vasilievsky Island lay the double track flush in a wide asphalt roadway (Sredny pr., Kosaya liniya): two one-way
 *  carriageways closer than 7.5 m are ONE roadway there (fillMedians). Nalichnaya ulitsa is different (docs/research/streets-vo.md, Commons "Nalichnaya street(1).jpg"): two kerbless asphalt
 *  carriageways with the double track between them on a flush strip of grey concrete slabs. Where a tram track lies in the gap of such a street the carriageways stay apart; the gap is drawn
 *  as a slab ribbon under the asphalt (extras.js buildTramRails, net.slabs), without kerb, pavement or lamp row (w.cuts). */
export const SLAB_MEDIAN = new Set(['Наличная улица']);
const slabGap = (w, mx, mz, gap) => gap > 3.2 && SLAB_MEDIAN.has(w.name) && isOpen(mx, mz) && trackDist(mx, mz) < 3.2;
/** true when (x, z) lies on a slab median ribbon (net.slabs) */
export function slabAt(net, x, z) {
  if (!net.slabs || !net.slabs.length) return false;
  if (!net._sg) {
    const g = new Map();
    for (const r of net.slabs) for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], q = [[a.ax, a.az], [a.mx, a.mz], [b.mx, b.mz], [b.ax, b.az]];
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const c of q) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); z0 = Math.min(z0, c[1]); z1 = Math.max(z1, c[1]); }
      const e = { q, b: [x0, x1, z0, z1] };
      for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++) for (let cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz++) { const k = cx * 8192 + cz; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(e); }
    }
    net._sg = g;
  }
  for (const e of net._sg.get(Math.floor(x / 16) * 8192 + Math.floor(z / 16)) || []) {
    if (x < e.b[0] || x > e.b[1] || z < e.b[2] || z > e.b[3]) continue;
    let ins = false; for (let i = 0, j = 3; i < 4; j = i++) { const a = e.q[i], c = e.q[j]; if ((a[1] > z) !== (c[1] > z) && x < (c[0] - a[0]) * (z - a[1]) / (c[1] - a[1]) + a[0]) ins = !ins; }
    if (ins) return true;
  }
  return false;
}

// ------------------------------------------------------------------ medians that are no medians
/** Divided avenues are mapped as two one-way carriageways; where the gap between their asphalt edges is not a real median (Nevsky: no median anywhere, west of Bolshaya Morskaya only
 *  2 + 2 lanes of 7.2 m on centres 13.4 m apart, the rest is bus lane / shoulder; Dvortsovy proezd, Admiralteysky pr., Liteyny, Mytninskaya) each carriageway's asphalt grows by half the
 *  gap on its left, so the two meet in the middle: no kerbed 'island' between them. Everywhere in the city, for every ranked street. w.med[k] = 1 where the two meet (a double solid
 *  line is drawn there, by the lower-numbered way of the pair, w.medDraw[k]). Pairing guard: the partner must be the same street (same name, or unnamed), or both ways are arterial
 *  (rank >= 3: the Dvortsovaya / Admiralteyskaya and square arms are mapped under different names), and the middle of the gap must not be a building: two unrelated one-way streets
 *  that merely run side by side stay apart. */
function fillMedians(net, L) {
  const fill = new Map();
  const cand = net.ways.filter((w) => w.oneway && w.rank >= 1 && !w.bridge && w.L >= 3 && (w.name || w.rank >= 2));       // (an unnamed carriageway counts from rank 2: links, unnamed tertiary pairs)
  /** the partner of w across its left edge at the point (px, pz) (the left edge of the asphalt, tangent t, left normal n): { gap, v } or null */
  const partnerAt = (w, px, pz, tx, tz, nxL, nzL) => {
    let best = null, slab = null;
    const c = net.cell, R = 12, x0 = Math.floor((px - R) / c), x1 = Math.floor((px + R) / c), z0 = Math.floor((pz - R) / c), z1 = Math.floor((pz + R) / c), st = ++net.stamp;
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const list = net.grid.get((cx + 300) * 2048 + (cz + 300)); if (!list) continue;
      for (let q = 0; q < list.length; q++) {
        const e = list[q]; if (e.st === st) continue; e.st = st;
        const v = e.w; if (v === w || !v.oneway || v.rank < 1 || v.bridge) continue;
        if ((e.dx * tx + e.dz * tz) / e.l > -0.85) continue;                  // must run the opposite way
        const dx = e.dx, dz = e.dz, l2 = e.l2;
        let t = l2 < 1e-12 ? 0 : ((px - e.ax) * dx + (pz - e.az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cxp = e.ax + dx * t, czp = e.az + dz * t, ex = px - cxp, ez = pz - czp;
        if ((cxp - px) * nxL + (czp - pz) * nzL <= 0) continue;               // and lie on our left
        const i = e.i, h = (ex * -dz + ez * dx) > 0 ? v.hR[i] + (v.hR[i + 1] - v.hR[i]) * t : v.hL[i] + (v.hL[i + 1] - v.hL[i]) * t;       // (live widths: the passes change them)
        const gap = Math.sqrt(ex * ex + ez * ez) - h;
        if (!(gap > -1.4 && gap < 7.5) || (best && gap >= best.gap)) continue;
        if (v.name !== w.name && v.name && w.name && !(w.rank >= 3 && v.rank >= 3) && !(gap < 3 && w.rank >= 2 && v.rank >= 2)) continue;     // pairing guard: the same street (or an unnamed twin), two arterials, or two carriageways closer than 3 m (never a boulevard)
        const mx = (px + cxp) / 2, mz = (pz + czp) / 2;
        if (L && L.inRiver && L.inRiver(mx, mz)) continue;                                   // across the water (two embankments): no median to fill
        if (L && L.insideBuilding && L.insideBuilding(mx, mz, 0)) continue;                  // a block between two streets, not a median
        if (slabGap(w, mx, mz, gap)) { const dd = Math.sqrt(ex * ex + ez * ez) || 1; if (!slab || gap < slab.gap) slab = { gap, v, ex: px, ez: pz, fx: px - ex / dd * gap, fz: pz - ez / dd * gap }; continue; }       // (a slab median: the carriageways stay apart)
        best = { gap, v };
      }
    }
    if (slab && (!best || slab.gap <= best.gap)) return { slab };
    return best;
  };
  // Each carriageway closes half of the gap on its left at every vertex (the partner closes the other half). The two centrelines wobble against each other and the widths are interpolated
  // between the vertices, so one pass leaves a bare strip of 0.5 - 2 m here and there: the next passes close the remaining gap of the paired stretches by half again (it never grows: the
  // gap is measured against the partner's current edge).
  const PASSES = 4;
  for (let pass = 0; pass < PASSES; pass++) {
    const add = new Map();
    for (const w of cand) {
      let e = fill.get(w);
      if (pass > 0 && !e) continue;
      if (!e) e = { f: new Array(w.n).fill(0), med: new Array(w.n).fill(0), draw: new Array(w.n).fill(0), partner: new Array(w.n).fill(null), any: false };
      const a = new Array(w.n).fill(0);
      for (let k = 0; k < w.n; k++) {
        if (pass > 0 && !e.med[k]) continue;
        const nxL = w.tz[k], nzL = -w.tx[k];                                 // left normal of the travel direction
        const best = partnerAt(w, w.x[k] + nxL * w.hL[k], w.z[k] + nzL * w.hL[k], w.tx[k], w.tz[k], nxL, nzL);     // (the left edge of the asphalt)
        if (best && best.slab) { if (pass === 0) (w._slab || (w._slab = new Array(w.n).fill(null)))[k] = best.slab; continue; }
        if (!best) continue;
        if (pass === 0) { e.med[k] = 1; e.draw[k] = w.i < best.v.i ? 1 : 0; e.partner[k] = best.v; e.any = true; }
        if (best.gap > 0.05) a[k] = best.gap / 2;
      }
      if (e.any) { fill.set(w, e); add.set(w, a); }
    }
    for (const [w, a] of add) { const e = fill.get(w); for (let k = 0; k < w.n; k++) if (a[k] > 0) { w.hL[k] += a[k]; e.f[k] += a[k]; } }
  }
  net.slabs = []; net._sg = null;
  for (const w of net.ways) {                                                          // the slab medians: every carriageway draws its half of the gap (own edge + 0.35 m under its asphalt .. the middle), no kerb / pavement on that side
    if (!w._slab) continue;
    let run = null; const close = () => { if (run && run.pts.length >= 2) { net.slabs.push(run); w.cuts.L.push([run.pts[0].s - 0.05, run.pts[run.pts.length - 1].s + 0.05]); } run = null; };
    for (let k = 0; k < w.n; k++) {
      const q = w._slab[k];
      if (!q) { close(); continue; }
      const nxL = w.tz[k], nzL = -w.tx[k], dx = q.fx - q.ex, dz = q.fz - q.ez, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl;
      (run || (run = { way: w, v: q.v, pts: [] })).pts.push({ s: w.s[k], ax: q.ex - nxL * 0.35, az: q.ez - nzL * 0.35, mx: q.ex + dx / 2 + ux * 0.03, mz: q.ez + dz / 2 + uz * 0.03 });
    }
    close();
  }
  for (const [w, e] of fill) { w.med = e.med; w.medDraw = e.draw; w.medPartner = e.partner; w.fillL = e.f; }       // medPartner[k] = the carriageway across the shared edge at vertex k (markings.js draws the one double line of a pair)
  return fill.size;
}

// ------------------------------------------------------------------ what is left between two merged carriageways
/** STRIP PATCHES (open districts, region.js). fillMedians closes the gap of a paired street vertex by vertex, each carriageway by its own measure, and the widths are interpolated between the
 *  vertices: where a pair diverges into a real median (or one side measures 7.4 m and the other 7.6 m) a wedge of bare ground, pavement or traffic island stays in the roadway: a strip that
 *  is still narrower than 7.5 m but is no asphalt (the 'median' rows of tools/roads-surface-audit.mjs). The rule "two carriageways of one street closer than 7.5 m are ONE roadway" is applied to
 *  what is left: along every one-way carriageway the gap from its left asphalt edge to the edge of the opposite carriageway is measured again every 2 m (final widths, the pairing guard of
 *  fillMedians), and every piece between two stations where that gap is under 7.5 m becomes an asphalt patch from edge to edge (cut where the gap reaches 7.5 m: the blunt nose of the median).
 *  net.patches = [{ poly: [[x, z] ...], box, ways: [w, v] }]: cover() counts them as carriageway (pavements, islands, kerbs and furniture keep off), surface.js buildAsphalt draws them. */
const STRIP_MAX = 7.5, PATCH_LAP = 0.35, NOSE_SLACK = 0.8;
/** ISLANDS ROUND 2 (region.js isIsland): the patch of one station segment as the convex hull of its lapped quad, the unlapped edge / opposite points, and an overlap of PATCH_LAP along the way beyond the first / last
 *  station of a way (where the next way of the street begins: the cross-line there is the bare wedge of a joint, tools/roads-surface-audit.mjs 'median' rows at a node). The lapped quad alone folds into a bow-tie where
 *  the strip degenerates to a fan round the opposite carriageway's vertex (the edge slides along the radial line: e0 and e1 lie on one line with the pivot) and leaves a sliver on the cross-lines.
 *  Winding as the quad (negative shoelace sum). */
function islandPatch(a, cur, t0, t1, quad, atStart, atEnd) {
  const lerp = (p, q, t) => p + (q - p) * t, E = (t) => [lerp(a.ex, cur.ex, t), lerp(a.ez, cur.ez, t)], F = (t) => [lerp(a.fx, cur.fx, t), lerp(a.fz, cur.fz, t)];
  const pts = [...quad, E(t0), E(t1), F(t0), F(t1)];
  if (atStart) { const tx = -a.nz, tz = a.nx; for (const q of [E(t0), F(t0)]) pts.push([q[0] - tx * PATCH_LAP, q[1] - tz * PATCH_LAP]); }
  if (atEnd) { const tx = -cur.nz, tz = cur.nx; for (const q of [E(t1), F(t1)]) pts.push([q[0] + tx * PATCH_LAP, q[1] + tz * PATCH_LAP]); }
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]), lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-9) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 1e-9) up.pop(); up.push(p); }
  const hull = lo.slice(0, -1).concat(up.slice(0, -1));
  if (hull.length < 3) return quad;
  let area = 0; for (let i = 0, j = hull.length - 1; i < hull.length; j = i++) area += hull[j][0] * hull[i][1] - hull[i][0] * hull[j][1];
  return area > 0 ? hull.reverse() : hull;
}
function buildStripPatches(net, L) {
  const out = [], lerp = (a, b, t) => a + (b - a) * t;
  const ringHas = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; };
  const claimed = [];                                                          // the polygons (squares, footway areas, gardens) that a landmark module claims, in the open districts: no patch of ours on them
  if (L && L.groupOf) for (const a of [...AREAS, ...GREEN]) {
    if (!L.groupOf(a.id) || !a.polys) continue;
    for (const q of a.polys) { const o = q.o; if (!o || o.length < 6 || !isOpen(o[0], o[1])) continue; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } claimed.push({ o, b: [x0, x1, z0, z1] }); }
  }
  const cand = net.ways.filter((w) => w.oneway && w.rank >= 1 && !w.bridge && !w.tramBed && w.L >= 3 && (w.name || w.rank >= 2));
  /** the left edge point of w at the station (x, z, unit tangent, left half width) and the nearest edge of an opposite carriageway on that side: { g, ex, ez, fx, fz, v } (g = Infinity: none within 16 m) */
  const leftGap = (w, x, z, tx, tz, hL) => {
    const nxL = tz, nzL = -tx, px = x + nxL * hL, pz = z + nzL * hL;
    const res = { g: Infinity, ex: px, ez: pz, nx: nxL, nz: nzL, fx: 0, fz: 0, v: null, slab: false }, isl = isIsland(px, pz);       // (islands: the half width of the opposite carriageway is the one of the vertex the segment starts at, as tools/roads-surface-audit.mjs measures the strip: where a median fill tapers off, the ribbon edge has a corner at the wide vertex)
    const c = net.cell, R = 20, x0 = Math.floor((px - R) / c), x1 = Math.floor((px + R) / c), z0 = Math.floor((pz - R) / c), z1 = Math.floor((pz + R) / c), st = ++net.stamp;
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const list = net.grid.get((cx + 300) * 2048 + (cz + 300)); if (!list) continue;
      for (let q = 0; q < list.length; q++) {
        const e = list[q]; if (e.st === st) continue; e.st = st;
        const v = e.w; if (v === w || !v.oneway || v.rank < 1 || v.bridge || v.tramBed) continue;
        if ((e.dx * tx + e.dz * tz) / e.l > -0.75) continue;                  // must run the opposite way
        let t = e.l2 < 1e-12 ? 0 : ((px - e.ax) * e.dx + (pz - e.az) * e.dz) / e.l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cxp = e.ax + e.dx * t, czp = e.az + e.dz * t, ex = px - cxp, ez = pz - czp, d = Math.sqrt(ex * ex + ez * ez);
        if ((cxp - px) * nxL + (czp - pz) * nzL <= 0 || d < 1e-6) continue;   // and lie on our left
        const hR = (ex * -e.dz + ez * e.dx) > 0, h = isl ? (hR ? e.hR0 : e.hL0) : hR ? e.hR0 + (e.hR1 - e.hR0) * t : e.hL0 + (e.hL1 - e.hL0) * t, gap = d - h;
        if (!(gap > -1.4 && gap < 16) || gap >= res.g) continue;
        if (v.name !== w.name && v.name && w.name && !(w.rank >= 3 && v.rank >= 3) && !(gap < 3 && w.rank >= 2 && v.rank >= 2)) continue;     // the pairing guard of fillMedians
        res.g = gap; res.v = v; res.fx = cxp + ex / d * h; res.fz = czp + ez / d * h;
      }
    }
    if (res.v) res.slab = slabGap(w, (res.ex + res.fx) / 2, (res.ez + res.fz) / 2, res.g);
    return res;
  };
  for (const w of cand) {
    // stations: every vertex and every <= 2 m in between (the gap is not linear between two vertices 6 m apart: the carriageway across has vertices and widths of its own)
    const S = [];
    for (let k = 0; k < w.n; k++) {
      if (k) { const l = w.s[k] - w.s[k - 1], m = Math.max(1, Math.ceil(l / 2)); for (let j = 1; j < m; j++) { const f = j / m; let tx = lerp(w.tx[k - 1], w.tx[k], f), tz = lerp(w.tz[k - 1], w.tz[k], f); const tl = Math.hypot(tx, tz) || 1; S.push([lerp(w.x[k - 1], w.x[k], f), lerp(w.z[k - 1], w.z[k], f), tx / tl, tz / tl, lerp(w.hL[k - 1], w.hL[k], f)]); } }
      S.push([w.x[k], w.z[k], w.tx[k], w.tz[k], w.hL[k]]);
    }
    let prev = null;
    for (let si = 0; si < S.length; si++) {
      const st = S[si];
      if (!isOpen(st[0], st[1])) { prev = null; continue; }
      const cur = leftGap(w, st[0], st[1], st[2], st[3], st[4]), a = prev; prev = cur;
      if (!a || !Number.isFinite(a.g) || !Number.isFinite(cur.g)) continue;
      if (a.slab || cur.slab) continue;                                          // (a slab median is no strip to fill)
      const SM = isIsland(cur.ex, cur.ez) ? STRIP_MAX + NOSE_SLACK : STRIP_MAX;       // (islands: the nose of the median reaches NOSE_SLACK further: the gap between two stations is not linear)
      if (Math.min(a.g, cur.g) >= SM || Math.max(a.g, cur.g) < 0.3) continue;
      // the part of the segment where the gap is under 7.5 m (linear in between)
      let t0 = 0, t1 = 1;
      if (a.g >= SM) t0 = (a.g - SM) / (a.g - cur.g); else if (cur.g >= SM) t1 = (SM - a.g) / (cur.g - a.g);
      const P = (t) => {                                                        // my edge (drawn back PATCH_LAP into my asphalt) and the edge across (PATCH_LAP into that asphalt) at t
        const ex = lerp(a.ex, cur.ex, t), ez = lerp(a.ez, cur.ez, t), fx = lerp(a.fx, cur.fx, t), fz = lerp(a.fz, cur.fz, t), nx = lerp(a.nx, cur.nx, t), nz = lerp(a.nz, cur.nz, t);
        let ux = fx - ex, uz = fz - ez; const ul = Math.hypot(ux, uz); if (ul > 1e-3) { ux /= ul; uz /= ul; } else { ux = nx; uz = nz; }
        return [[ex - nx * PATCH_LAP, ez - nz * PATCH_LAP], [fx + ux * PATCH_LAP, fz + uz * PATCH_LAP]];
      };
      const [e0, f0] = P(t0), [e1, f1] = P(t1); let poly = [e0, e1, f1, f0];
      let area = 0, mx = 0, mz = 0; for (let i = 0, j = 3; i < 4; j = i++) { area += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]; mx += poly[i][0] / 4; mz += poly[i][1] / 4; }
      const isl = isIsland(mx, mz);
      if (isl) {                                                                  // (islands: the hull of the lapped quad, the edge points and the overlap at the ends of a way; its area decides, a fan round a pivot is a thin quad)
        poly = islandPatch(a, cur, t0, t1, poly, si === 1 && t0 === 0, si === S.length - 1 && t1 === 1);
        area = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) area += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
      }
      if (Math.abs(area) / 2 < (isl ? 0.04 : 0.4) || !poly.every((q) => isOpen(q[0], q[1]))) continue;       // (a patch that reaches into a reviewed district is not laid)
      if (L && ((L.inRiver && L.inRiver(mx, mz)) || (L.insideBuilding && L.insideBuilding(mx, mz, 0)))) continue;      // across the water / a block between two streets
      if (claimed.some((c) => mx >= c.b[0] && mx <= c.b[1] && mz >= c.b[2] && mz <= c.b[3] && ringHas(c.o, mx, mz))) continue;      // a platform / garden a landmark module claims (the Rostral column islands)
      let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9; for (const p of poly) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); bz0 = Math.min(bz0, p[1]); bz1 = Math.max(bz1, p[1]); }
      out.push({ poly, box: [bx0, bx1, bz0, bz1], ways: [w, cur.v || a.v] });
    }
  }
  net.patches = out;
  net._pg = null;
  // A SWALLOWED ISLAND: a mapped traffic island of which more than half lies on carriageway asphalt (ways, fillets, the patches above: the island of a strip narrower than 7.5 m, an
  // island the mapped lanes run across) is no island any more: a rag of paving with bare ground round it would stay in the roadway. Its whole polygon (grown by 0.4 m) becomes a patch.
  let swallowed = 0;
  for (const a of AREAS) {
    if (a.hw !== 'traffic_island' || a.tunnel || a.bridge || (L && L.groupOf && L.groupOf(a.id))) continue;      // (an island a landmark module claims is its business)
    for (const q of a.polys) {
      const o = q.o, n = o.length / 2; if (n < 3) continue;
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0;
      for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); cx += o[i] / n; cz += o[i + 1] / n; }
      if (!isOpen(x0, z0) || !isOpen(x1, z1) || !isOpen(x0, z1) || !isOpen(x1, z0) || x1 - x0 > 60 || z1 - z0 > 60) continue;
      let all = 0, on = 0; const st = Math.max(0.6, Math.min(1.5, Math.min(x1 - x0, z1 - z0) / 6));
      for (let x = x0 + st / 2; x < x1; x += st) for (let z = z0 + st / 2; z < z1; z += st) { if (!ringHas(o, x, z)) continue; all++; if (cover(net, x, z, {}) > -0.1) on++; }
      if (all < 3 || on / all <= 0.5) continue;
      const poly = []; for (let i = 0; i < o.length; i += 2) { const dx = o[i] - cx, dz = o[i + 1] - cz, d = Math.hypot(dx, dz) || 1; poly.push([o[i] + dx / d * 0.4, o[i + 1] + dz / d * 0.4]); }
      out.push({ poly, box: [x0 - 0.4, x1 + 0.4, z0 - 0.4, z1 + 0.4], ways: [], fan: [cx, cz], island: a.id }); swallowed++;
    }
  }
  net._pg = null;
  net.swallowedIslands = swallowed;
  return out.length;
}
/** the strip patches whose box touches the 32 m cell of (x, z) */
function patchesAt(net, x, z) {
  if (!net.patches || !net.patches.length) return NOF;
  if (!net._pg) {
    const g = new Map();
    for (const f of net.patches) for (let cx = Math.floor(f.box[0] / FG); cx <= Math.floor(f.box[1] / FG); cx++) for (let cz = Math.floor(f.box[2] / FG); cz <= Math.floor(f.box[3] / FG); cz++) { const k = cx * 4096 + cz; let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(f); }
    net._pg = g;
  }
  return net._pg.get(Math.floor(x / FG) * 4096 + Math.floor(z / FG)) || NOF;
}

// ------------------------------------------------------------------ build
export function buildNet(L, kerbBake = null) {
  const raw = rawWays(L);
  const ways = [];
  raw.forEach((W) => { const w = makeWay(W, ways.length); if (w) ways.push(w); });
  const net = { ways, nodes: [], fillets: [], kerbRuns: [], crossings: [], cell: 24, grid: new Map(), stamp: 0, shore: L ? L.shoreDist : () => 1e4, restored: RESTORED.slice(), trimmed: TRIMMED.slice() };       // shore(x, z): distance to the nearest water edge (the quay wall); restored: the closed carriageways drawn finished
  buildNodes(net);
  findJunctions(net);
  net.each = (px, pz, r, fn) => {
    const c = net.cell, st = ++net.stamp;
    const x0 = Math.floor((px - r) / c), x1 = Math.floor((px + r) / c), z0 = Math.floor((pz - r) / c), z1 = Math.floor((pz + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const list = net.grid.get((cx + 300) * 2048 + (cz + 300)); if (!list) continue;
      for (const e of list) { if (e.st === st) continue; e.st = st; fn(e.w, e.i); }
    }
  };
  net.cover = (px, pz, o = {}) => cover(net, px, pz, o);
  buildGrid(net);
  net.medians = fillMedians(net, L);
  if (net.medians) { net.grid.clear(); buildGrid(net); }                       // the filled asphalt is wider: hash again
  net.patches = []; buildStripPatches(net, L);                                 // (after the merge, before the kerb runs: a kerb inside a patch is not drawn)
  analyseCrossings(net);
  if (kerbBake) {
    try { hydrateKerbRuns(net, kerbBake); }
    catch (e) { console.warn('[baked] fallback: street-kerbs', e.message); buildKerbRuns(net); }
  } else buildKerbRuns(net);
  void L;
  return net;
}

/** nearest drivable way at (x,z): { w, i, q, off } where off = distance beyond the edge (<= 0 on the carriageway) */
export function nearestWay(net, x, z, maxD = 12, minRank = 0) {
  let bw = null, bi = -1, boff = 0;
  net.each(x, z, maxD + 14, (w, i) => {                                 // (segInfo's arithmetic without its objects: the service runs for every car / walker placed at the start)
    if (w.rank < minRank) return;
    const ax = w.x[i], az = w.z[i], dx = w.x[i + 1] - ax, dz = w.z[i + 1] - az, l2 = dx * dx + dz * dz;
    const t = l2 < 1e-12 ? 0 : clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
    const cx = ax + dx * t, cz = az + dz * t, d = Math.hypot(x - cx, z - cz), l = Math.hypot(dx, dz) || 1;
    const side = (x - cx) * (-dz / l) + (z - cz) * (dx / l);
    const h = side > 0 ? w.hR[i] + (w.hR[i + 1] - w.hR[i]) * t : w.hL[i] + (w.hL[i + 1] - w.hL[i]) * t, off = d - h;
    if (off > maxD) return;
    if (!bw || off < boff) { bw = w; bi = i; boff = off; }
  });
  return bw ? { w: bw, i: bi, q: segInfo(bw, bi, x, z), off: boff } : null;
}

/** arclength-parametrised sample of a way: { x, z, tx, tz, hL, hR, hb, k, f } */
export function wayAt(w, s) {
  s = clamp(s, 0, w.L);
  const k = nearestIdx(w, s), f = (s - w.s[k]) / Math.max(1e-9, w.s[k + 1] - w.s[k]);
  const L = (a) => a[k] + (a[k + 1] - a[k]) * f;
  let tx = L(w.tx), tz = L(w.tz); const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
  return { x: L(w.x), z: L(w.z), tx, tz, hL: L(w.hL), hR: L(w.hR), hb: L(w.hb), parkL: L(w.parkL), parkR: L(w.parkR), k, f };
}
export { SIGNALS };
