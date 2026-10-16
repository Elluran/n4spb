// streets/wires.js - the TROLLEYBUS OVERHEAD WIRE network of the centre, the visual signature of Nevsky (docs/research/nevsky.md section 4, transport.md section 5, streets.md 14;
// photos nevsky 26 27 31 78, transport trolley_electricnets):
//   * pairs of contact wires (+ / -, 0.5 m apart, ~5.8 m above the road) over the kerb lane and the next lane of every carriageway that carries trolleybus routes
//     (ROADS[].trolley; 7 routes on Nevsky), hung from CROSS-SPAN wires that run from facade rosette to facade rosette across the whole street every 24-34 m (no poles in the
//     roadway; one span serves both carriageways of Nevsky); where a side of the street is open (squares, the Fontanka) a plain black mast stands at the kerb instead;
//   * the span sags to ~6.4 m at mid, short vertical hangers (<= 0.9 m) tie the contact wires to it, the contact wires sag a little between the spans;
//   * at junctions (and at the joints between two OSM ways) the wires of routes that continue, turn or cross are joined by bezier arcs, X crossings get a small crossing frame ("frog");
//   * a few blue lane-use arrow signs hang from the spans on the approaches of Nevsky junctions (streets.md summary 7).
// INVARIANT (tools/wires-test.mjs): NO WIRE ENDS IN THE AIR. Every end of a contact wire is either joined to an arc / the next way's wire, or it stops exactly on a cross-span (the hanger
// stands there), or a tie leads it to a rosette / mast; every span ends on a facade rosette or a mast. How the builder guarantees it (generic: it only looks at the network, no coordinates):
//   1. wire records per (way, travel direction, lane); the nodes join them lane to lane (straight on: every lane, also across the joints of two OSM ways) or kerb to kerb (turns);
//   2. wire ends that stay free (route stops, lane that does not continue, data extent, junction that nothing leaves from) are TERMINATED: snapped to a span within 10 m, else a new
//      span (facade / mast) is created exactly at the end, else the end is tied to a rosette / a mast by a short tie wire (kind 'tie'), else the stub is deleted;
//   3. gaps longer than ~44 m between supports (open squares, bridges) get an extra span (facade anchors or masts on the kerb / on the bridge deck);
//   4. the span profile is clamped to <= 0.9 m above the contact wire wherever a hanger stands, so every hanger really reaches its span.
// Drawn through ctx.wires (one draw call; every polyline carries kind: contact | arc | span | hanger | tie, for the test) + a few merged boxes (rosettes, frogs, masts, signs).
// Published as service `wires`: contact-wire pair centrelines for traffic (trolleybus poles), the spans (landmarksC hangs pendant lamps on the Anichkov ones) and the anchors.
import { wayAt, trackDist, streetTrackDist } from './net.js';
import { prepWay } from './surface.js';
import { latAt } from './lanes.js';
import { clearanceHit } from './bld.js';
import { hash2, clamp, inMergedStrip, poleClear, furnZone, TRACK_CLEAR } from './furn.js';
import { PointGrid, pairs, chaikin, densify } from './util.js';
import { deckAt } from './decks.js';
import { TRAMWAYS } from '../data/city.js';
import { inIsland } from '../lib/vo-island.js';
import { wayOpen, isOpen } from './region.js';
import { blagDeckY, BLAG } from '../bridges/sites-vo.js';
import * as L from '../layout.js';

const H0 = 5.8;                                  // contact wire height above the road
const WIRE = '#1d1f22', SPANC = '#2a2d31';
const HANGER = 0.9;                              // the span is never higher than this above the contact wire where a hanger stands
const ENV = (typeof process !== 'undefined' && process.env) || {};          // WIRES_SNAP / WIRES_GAP: knobs for the robustness runs of tools/wires-test.mjs
const SNAP = Number(ENV.WIRES_SNAP) || 10;       // a free wire end moves to a span at most this far away
const GAP = Number(ENV.WIRES_GAP) || 44;         // longest unsupported run of a contact wire (m)
const BRIDGE_GAP = Math.min(GAP, 56);          // ... on a bridge: a few metres longer than on the street is not needed any more: the test limit is 60 m between hangers / ties / ends            // ... on a bridge (landmarksC draws the Anichkov Bridge without masts: its wires hang from the facades at both ends)
const CHAIN = Number(ENV.WIRES_CHAIN) || 70;     // longest run over a joint: last support of one way's wire + arc + first support of the next
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// THE BLAGOVESHCHENSKY BRIDGE (Vasilievsky Island, 2026-10-08, docs/research/vo-requests-bridges.md 1): the deck is humped (bridges/sites-vo.js blagDeckY: 0.05 at the abutments, +3.4 m at the bascule) and the wires hung at a flat
// 5.8 m over y = 0 from black masts that stood in the pavements and the median at ground level: at the crown the wires were 2 m over the roadway (a trolleybus is 3.3 m tall), the poles stood 3.4 m inside the deck. Now:
//   * contact wires follow the deck (wr.hAt + blagDeckY: 5.8 m over the roadway all along, the sag as before);
//   * the cross-spans hang from the 22 historic standards of the bridge itself (BLAG.lamps u list, v +-18.15, over the pier tumbas +-18.75; drawn and collided by bridges/blag.js, streets builds BEFORE bridges: pure
//     data of sites-vo.js) at 7.4 m over the deck: one span across the whole deck (36 m) at the standard nearest to the middle of a gap of the wire, a clamp ring on the column; no mast of ours stands on the deck
//     (the 28 pavement / median masts are gone); the span profile is relative to the deck (sp.G = the deck height there: 6.45 m over the roadway at mid-span, hangers <= 0.9 m).
const BLAG_BT = (BLAG.b - 90) * Math.PI / 180, BLAG_BC = Math.cos(BLAG_BT), BLAG_BS = Math.sin(BLAG_BT);
const blagU = (x, z) => (x - BLAG.cx) * BLAG_BC + (z - BLAG.cz) * BLAG_BS;
const blagXZ = (u, v) => [BLAG.cx + u * BLAG_BC - v * BLAG_BS, BLAG.cz + u * BLAG_BS + v * BLAG_BC];
const BLAG_STD_Y = 7.4;                                                         // the span end on the column (over the deck): under the lantern arms (the columns are 8.4 / 10.4 m high)
const blagStd = (u, sg) => {                                                    // the standard at u, side sg (-1 / +1): the tumba standards (over the slim piers) stand on the railing line (HW + 0.05), the others 0.55 m inside it
  const tumba = BLAG.piers.some((q) => q[2] === 'slim' && Math.abs((q[0] + q[1]) / 2 - u) < 0.2);
  const [x, z] = blagXZ(u, sg * (tumba ? BLAG.hw + 0.05 : BLAG.hw - 0.55));
  return { x, z, y: BLAG_STD_Y, nx: sg * BLAG_BS, nz: -sg * BLAG_BC, pole: 'std' };
};

export function buildWires(ctx, net, lamps, opts = {}) {
  const T0 = now();
  const { avoid = [], inPlaza = () => false, poles = null, panels = null, signTex = null } = opts;
  const stats = { pairs: 0, spans: 0, rosettes: 0, masts: 0, hangers: 0, arcs: 0, frogs: 0, signs: 0, wireKm: 0, ties: 0, snapped: 0, terminals: 0, gapSpans: 0, dropped: 0, ms: 0 };
  const service = { height: H0, pairs: [], spans: [], arcs: [], masts: [], anchors: [] };
  const add = (pts, width, color, kind, grp) => { ctx.wires.add(pts, { width, color, kind, grp }); };
  const refsOf = (w) => (w.rec && w.rec.trolley) || [];
  const tw = net.ways.filter((w) => refsOf(w).length && w.rank >= 1 && w.L > 6 && !(w.skipDraw &&
    (ctx.services.eastBridges?.deckY(w.x[0], w.z[0]) != null || ctx.services.northBridges?.deckY(w.x[0], w.z[0]) != null)));
  if (!tw.length) return { stats, service };
  for (const w of tw) prepWay(w);

  // ------------------------------------------------------------ wire records: one per (way, travel direction, lane)
  const wires = [];                                // { id, w, dir, j, refs, kerb, lo, hi (kept arclength range), jLo / jHi (joined to an arc), supports }
  for (const w of tw) {
    const K = w.lanes.nF + w.lanes.nB, refs = refsOf(w);
    const lanes = [];
    if (w.oneway) { lanes.push([1, K - 1]); if (K >= 3 && w.rank >= 3) lanes.push([1, K - 2]); }
    else { lanes.push([1, K - 1]); lanes.push([-1, 0]); }
    for (const [dir, j] of lanes) wires.push({ id: `W${w.id}:${dir > 0 ? 'f' : 'b'}${j}`, idx: wires.length, w, dir, j, refs, kerb: (dir > 0 ? j === K - 1 : j === 0), lo: 0, hi: w.L, jLo: false, jHi: false, dead: false, drawn: false, tLo: false, tHi: false, supports: [], supMap: new Map(), base: null, sups: [], hAt: () => H0 });
  }
  const latOf = (wr, q) => (latAt(wr.w, q, wr.j) + latAt(wr.w, q, wr.j + 1)) / 2;
  /** plan position of the wire (centre of the pair) of a record at arclength s; sub = -1 / +1 picks the left / right wire of the pair relative to the travel direction */
  const pt = (wr, s, sub = 0) => {
    const q = wayAt(wr.w, s), lat = latOf(wr, q) + sub * 0.25 * wr.dir, nx = -q.tz, nz = q.tx;
    return [q.x + nx * lat, q.z + nz * lat, q.tx * wr.dir, q.tz * wr.dir];
  };
  const step = 3.0;
  for (const wr of wires) {                        // plan samples of the pair centre along the whole way
    const w = wr.w, n = Math.max(2, Math.ceil(w.L / step) + 1), base = [];
    for (let i = 0; i < n; i++) { const s = w.L * i / (n - 1), p = pt(wr, s); base.push({ s, x: p[0], z: p[1] }); }
    wr.base = base;
  }

  // ------------------------------------------------------------ cross-spans
  const spans = [];                                // { id, A:[x,z,y], B:[x,z,y], tx, tz, poleA, poleB, mid, len, knots }
  /** a facade hit on one side of (px,pz) along the normal (nx,nz) * sg: a rosette position (building height gives the height) or null */
  const facadeSide = (px, pz, nx, nz, sg) => {
    const hit = clearanceHit(px, pz, nx * sg, nz * sg, 66);
    if (hit && Math.abs(hit.nx * nx + hit.nz * nz) > 0.62) {
      const b = L.buildingAt(hit.x - hit.nx * 0.4, hit.z - hit.nz * 0.4);
      const h = b ? L.heightOf(b) : 0;
      if (b && h >= 8.2 && (b.minH || 0) < 0.5 && !L.insideBuilding(hit.x + hit.nx * 0.5, hit.z + hit.nz * 0.5, 0.1)) return { x: hit.x + hit.nx * 0.1, z: hit.z + hit.nz * 0.1, y: clamp(h - 1.0, 7.2, 9.6), nx: hit.nx, nz: hit.nz, t: hit.t, pole: false };
    }
    return null;
  };
  /** a mast on the pavement edge where the asphalt ends along the ray (kerb + 1.4 m) or null */
  /** (open districts) the base stands on / beside the rails of a tram track of the streets (the median of a wide junction between two carriageways: the first clear place was between the rails) */
  const railed = (x, z) => isOpen(x, z) && streetTrackDist(x, z) < TRACK_CLEAR;
  const mastSide = (px, pz, nx, nz, sg, h = 9.0, maxD = 56) => {
    let d = 3; const openAt = isOpen(px, pz);
    while (d < 60 && (net.cover(px + nx * sg * d, pz + nz * sg * d, {}) > -2.2 || net.cover(px + nx * sg * (d + 1.6), pz + nz * sg * (d + 1.6), {}) > -0.5 || inMergedStrip(net, px + nx * sg * (d + 1.6), pz + nz * sg * (d + 1.6)) || railed(px + nx * sg * (d + 1.6), pz + nz * sg * (d + 1.6)))) d += openAt ? 0.5 : 1.0;     // the mast base itself must be clear too (a fillet, a pocket,
    d += 1.6;                                                                                                                                                             // the other carriageway behind a median gap)
    let x = px + nx * sg * d, z = pz + nz * sg * d;
    // (open districts, region.js: the ray above only looks at points along the normal: a base at the corner of a junction fillet / a strip patch / within TRACK_CLEAR of a rail slides outward in 0.6 m steps until it is
    //  clear; when nothing is clear within 4.8 m the first place stays unless it stands ON asphalt or on a rail)
    if (isOpen(x, z) && !poleClear(net, x, z, 0.5)) { let d2 = d, x2 = x, z2 = z; for (let n = 0; n < 8 && !poleClear(net, x2, z2, 0.5); n++) { d2 += 0.6; x2 = px + nx * sg * d2; z2 = pz + nz * sg * d2; } if (poleClear(net, x2, z2, 0.5) && d2 <= maxD + 5) { d = d2; x = x2; z = z2; } else if (net.cover(x, z, {}) > -0.5 || trackDist(x, z) < 0.9 || furnZone(x, z)) return null; }       // (furnZone: a base that stays inside a keep-clear zone / a metro hole is no place: review of streets-3)
    if (d > maxD || L.insideBuilding(x, z, 0.3) || L.inRiver(x, z)) return null;
    return { x, z, y: h, nx: -nx * sg, nz: -nz * sg, t: d, pole: true };
  };
  const makeSpan = (a, b) => {
    const len = Math.hypot(a.x - b.x, a.z - b.z);
    return { A: [a.x, a.z, a.y], B: [b.x, b.z, b.y], poleA: a.pole, poleB: b.pole, nxA: a.nx, nzA: a.nz, nxB: b.nx, nzB: b.nz, len, tx: (b.x - a.x) / len, tz: (b.z - a.z) / len, mid: [(a.x + b.x) / 2, (a.z + b.z) / 2], knots: [], id: -1, G: 0 };
  };
  const spanAt = (px, pz, nx, nz) => {
    const A = facadeSide(px, pz, nx, nz, 1), B = facadeSide(px, pz, nx, nz, -1);
    if (!A && !B) return null;
    // one side open: a mast at the kerb
    const a = A || mastSide(px, pz, nx, nz, 1), b = B || mastSide(px, pz, nx, nz, -1);
    if (!a || !b || (A ? 0 : 1) + (B ? 0 : 1) > 1) return null;
    const len = Math.hypot(a.x - b.x, a.z - b.z);
    if (len < 12 || len > 96) return null;
    return makeSpan(a, b);
  };
  const NG = 16, nodeGrid = new Map();             // junction nodes by cell (nearNode used to scan every node for every candidate)
  for (const n of net.nodes) if (n.arms.length >= 3) { const k = Math.floor(n.x / NG) * 4096 + Math.floor(n.z / NG); let l = nodeGrid.get(k); if (!l) nodeGrid.set(k, (l = [])); l.push(n); }
  const nearNode = (x, z, r) => {
    for (let cx = Math.floor((x - r) / NG); cx <= Math.floor((x + r) / NG); cx++) for (let cz = Math.floor((z - r) / NG); cz <= Math.floor((z + r) / NG); cz++) for (const n of nodeGrid.get(cx * 4096 + cz) || []) if (Math.hypot(n.x - x, n.z - z) < r) return true;
    return false;
  };
  const registerSpan = (sp) => { sp.id = spans.length; spans.push(sp); return sp; };
  /** a terminal / gap span, or the identical span that already stands there (two wires asking for the same cross-span) */
  const registerOrReuse = (sp) => {
    const same = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.5;
    const ex = spans.find((o) => (same(o.A, sp.A) && same(o.B, sp.B)) || (same(o.A, sp.B) && same(o.B, sp.A)));
    return ex || registerSpan(sp);
  };
  for (const w of tw) {
    if (w.bridge) continue;
    let s = 8 + hash2(w.i, 11) * 14;
    for (; s < w.L - 8; s += 24 + hash2(w.i, Math.round(s)) * 12) {
      const q = wayAt(w, s);
      if (nearNode(q.x, q.z, 9.5) || inPlaza(q.x, q.z)) continue;
      const nx = -q.tz, nz = q.tx;
      // reuse a span that already crosses here (the other carriageway of the street)
      const ex = spans.find((sp) => { const dx = sp.mid[0] - q.x, dz = sp.mid[1] - q.z; return Math.abs(dx * sp.tx + dz * sp.tz) < 9 && Math.abs(sp.tx * q.tx + sp.tz * q.tz) < 0.35 && Math.abs(-dx * sp.tz + dz * sp.tx) < sp.len / 2 + 6; });
      if (ex) continue;
      const sp = spanAt(q.x, q.z, nx, nz);
      if (sp) registerSpan(sp);
    }
  }
  // bridge ways: spans anchored at both ends of the approaches are enough for short bridges (the contact wires stretch over the deck); landmarksC hangs pendants on them.
  // Long bridges / gaps get masts below (gap fill)

  // ------------------------------------------------------------ span crossings (supports) found through a grid of the wire segments
  const segX = (ax, az, bx, bz, cx, cz, dx, dz) => {                        // intersection of AB with CD -> {t,u} or null
    const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz, den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) return null;
    const t = ((cx - ax) * sz - (cz - az) * sx) / den, u = ((cx - ax) * rz - (cz - az) * rx) / den;
    return t >= -1e-6 && t <= 1 + 1e-6 && u >= 0 && u <= 1 ? { t: clamp(t, 0, 1), u } : null;
  };
  const WG = 16, wgrid = new Map(); let wstamp = 0;
  for (const wr of wires) for (let i = 0; i + 1 < wr.base.length; i++) {
    const a = wr.base[i], b = wr.base[i + 1], e = { wr, i, st: 0 };
    for (let cx = Math.floor(Math.min(a.x, b.x) / WG); cx <= Math.floor(Math.max(a.x, b.x) / WG); cx++) for (let cz = Math.floor(Math.min(a.z, b.z) / WG); cz <= Math.floor(Math.max(a.z, b.z) / WG); cz++) { const k = cx * 4096 + cz; let l = wgrid.get(k); if (!l) wgrid.set(k, (l = [])); l.push(e); }
  }
  /** a wire may cross a span twice (a hairpin: a U turn of the way); two hits within 2 m of arclength are one crossing (a hit on a vertex shared by two segments) */
  const addSupport = (wr, sp, s, u, x, z) => {
    let l = wr.supMap.get(sp.id); if (!l) wr.supMap.set(sp.id, (l = []));
    const ex = l.find((c) => Math.abs(c.s - s) < 2); if (ex) return ex;
    const q = { s, sp, u, x, z }; l.push(q); wr.supports.push(q); return q;
  };
  const supNear = (wr, sp, s) => { let b = null; for (const c of wr.supMap.get(sp.id) || []) if (!b || Math.abs(c.s - s) < Math.abs(b.s - s)) b = c; return b; };
  const crossSpan = (sp) => {
    const stamp = ++wstamp, n = Math.max(1, Math.ceil(sp.len / 4));
    for (let k = 0; k <= n; k++) {
      const px = sp.A[0] + (sp.B[0] - sp.A[0]) * k / n, pz = sp.A[1] + (sp.B[1] - sp.A[1]) * k / n, cx0 = Math.floor(px / WG), cz0 = Math.floor(pz / WG);
      for (let cx = cx0 - 1; cx <= cx0 + 1; cx++) for (let cz = cz0 - 1; cz <= cz0 + 1; cz++) for (const e of wgrid.get(cx * 4096 + cz) || []) {
        if (e.st === stamp) continue; e.st = stamp;
        if (e.wr.dead) continue;
        const a = e.wr.base[e.i], b = e.wr.base[e.i + 1], X = segX(a.x, a.z, b.x, b.z, sp.A[0], sp.A[1], sp.B[0], sp.B[1]);
        if (X) addSupport(e.wr, sp, a.s + (b.s - a.s) * X.t, X.u, a.x + (b.x - a.x) * X.t, a.z + (b.z - a.z) * X.t);
      }
    }
  };

  // ------------------------------------------------------------ junction arcs: join the wires of routes that continue, turn or cross
  const arcs = [];                                                           // { wx, wy, sub, refs, node, fx, fy, sx, sy }: fx / fy 'lo' | 'hi' = the end of the wire, else the fixed arclength sx / sy
  const arcPoints = (P, T, Q, U, n = 12) => {                                // bezier from P (tangent T) to Q (tangent U), plan
    const d = Math.hypot(Q[0] - P[0], Q[1] - P[1]), k = d * 0.4, out = [];
    const p1 = [P[0] + T[0] * k, P[1] + T[1] * k], p2 = [Q[0] - U[0] * k, Q[1] - U[1] * k];
    for (let i = 0; i <= n; i++) { const t = i / n, v = 1 - t; out.push([v * v * v * P[0] + 3 * v * v * t * p1[0] + 3 * v * t * t * p2[0] + t * t * t * Q[0], v * v * v * P[1] + 3 * v * v * t * p1[1] + 3 * v * t * t * p2[1] + t * t * t * Q[1]]); }
    return out;
  };
  const wiresOfWay = new Map(); for (const wr of wires) { let l = wiresOfWay.get(wr.w); if (!l) wiresOfWay.set(wr.w, (l = [])); l.push(wr); }
  /** the wires of an arm's way that travel in direction `dir`, kerb wire first */
  const armWires = (a, dir) => (wiresOfWay.get(a.w) || []).filter((wr) => wr.dir === dir).sort((p, q) => (q.kerb ? 1 : 0) - (p.kerb ? 1 : 0) || (dir > 0 ? q.j - p.j : p.j - q.j));
  const isEnd = (arm) => arm.k === 0 || arm.k === arm.w.n - 1;
  /** cut the wire record at arclength s, keeping the part that lies on the far side of the node (along = the arm direction: +1 keeps s >= cut, -1 keeps s <= cut) */
  const cut = (wr, s, along) => { if (along > 0) wr.lo = Math.max(wr.lo, s); else wr.hi = Math.min(wr.hi, s); };
  const join = (wr, along) => { if (along > 0) wr.jLo = true; else wr.jHi = true; };
  for (const nd of net.nodes) {
    if (nd.arms.length < 2) continue;
    const joint = nd.arms.length === 2;
    const ent = [], lea = [];                                                // arms that traffic can enter the node from / leave it along
    for (const a of nd.arms) {
      if (!wiresOfWay.has(a.w)) continue;
      if (!a.w.oneway || a.along < 0) ent.push(a);                           // travel with +s arrives from the arm at lower s (along = -1)
      if (!a.w.oneway || a.along > 0) lea.push(a);
    }
    const connected = new Set();
    for (const X of ent) for (const Y of lea) {
      if (X.w === Y.w) continue;
      const common = refsOf(X.w).filter((r) => refsOf(Y.w).includes(r)); if (!common.length) continue;
      const dot = X.dx * Y.dx + X.dz * Y.dz;
      if (dot > 0.82) continue;                                              // no U turns
      const straight = dot < -0.8;                                           // straight on: every lane continues into the same lane of the next way
      const xs = armWires(X, -X.along), ys = armWires(Y, Y.along);
      const nPair = straight ? Math.min(xs.length, ys.length) : 1;
      const dX = joint ? 0.01 : clamp((X.box || 6) + 3, 6, 15), dY = joint ? 0.01 : clamp((Y.box || 6) + 3, 6, 15);
      const sx = clamp(X.sN + X.along * dX, 0.5, X.w.L - 0.5), sy = clamp(Y.sN + Y.along * dY, 0.5, Y.w.L - 0.5);
      for (let k = 0; k < nPair; k++) {
        const wx = xs[k], wy = ys[k]; if (!wx || !wy || (!straight && (!wx.kerb || !wy.kerb))) continue;
        for (const sub of [-1, 1]) arcs.push({ wx, wy, sub, refs: common, node: nd.id, fx: isEnd(X) ? (X.along > 0 ? 'lo' : 'hi') : null, fy: isEnd(Y) ? (Y.along > 0 ? 'lo' : 'hi') : null, sx, sy });
        if (isEnd(X)) { if (!joint) cut(wx, sx, X.along); join(wx, X.along); }
        if (isEnd(Y)) { if (!joint) cut(wy, sy, Y.along); join(wy, Y.along); }
        connected.add(wx); connected.add(wy);
      }
    }
    // wires that end at a junction without a connection (second lanes, routes that stop there) stop 7 m before it (and are terminated by a span below)
    if (!joint) for (const a of nd.arms) {
      if (!isEnd(a) || !wiresOfWay.has(a.w)) continue;
      for (const wr of wiresOfWay.get(a.w)) if (!connected.has(wr)) cut(wr, clamp(a.sN + a.along * 7, 0.5, a.w.L - 0.5), a.along);
    }
  }
  // degenerate pieces: two junctions closer than the cut distances (the wire between them collapses to one point where both arcs meet), tiny stubs without any connection are deleted
  for (const wr of wires) {
    if (wr.hi < wr.lo + 0.5) {
      if (wr.jLo && wr.jHi) wr.lo = wr.hi = (wr.lo + wr.hi) / 2;
      else if (wr.jLo) wr.hi = wr.lo;
      else if (wr.jHi) wr.lo = wr.hi;
      else wr.dead = true;
    } else if (!wr.jLo && !wr.jHi && wr.hi - wr.lo < 4) wr.dead = true;
  }
  // an arc to a wire that was deleted above is not drawn: the surviving wire is no longer joined at that end (it is terminated below instead of ending in the air)
  /** a junction arc is live while both wires live AND each wire still reaches the arc's anchor (a wire cut back to its last support no longer touches an arc anchored mid-wire: no free ends) */
  const arcOk = (a) => !a.wx.dead && !a.wy.dead && (!!a.fx || (a.sx >= a.wx.lo - 0.3 && a.sx <= a.wx.hi + 0.3)) && (!!a.fy || (a.sy >= a.wy.lo - 0.3 && a.sy <= a.wy.hi + 0.3));
  const relink = () => {
    for (const wr of wires) wr.jLo = wr.jHi = false;
    for (const a of arcs) { if (!arcOk(a)) continue; if (a.fx) a.wx[a.fx === 'lo' ? 'jLo' : 'jHi'] = true; if (a.fy) a.wy[a.fy === 'lo' ? 'jLo' : 'jHi'] = true; }
  };
  relink();
  const arcS = (a, side) => { const wr = side === 'x' ? a.wx : a.wy, f = side === 'x' ? a.fx : a.fy; return f === 'lo' ? wr.lo : f === 'hi' ? wr.hi : (side === 'x' ? a.sx : a.sy); };

  // ------------------------------------------------------------ supports: the regular spans, then terminate every free wire end, then fill long gaps
  for (const sp of spans) crossSpan(sp);
  const sortSup = (wr) => wr.supports.sort((p, q) => p.s - q.s);
  /** a short tie from a free wire end to a rosette / mast (when no span fits): the support point, or null */
  const tieTarget = (px, pz, nx, nz) => {
    const A = facadeSide(px, pz, nx, nz, 1), B = facadeSide(px, pz, nx, nz, -1);
    let pick = null;
    if (A && (!B || A.t <= B.t)) pick = A; else if (B) pick = B;
    if (pick && pick.t <= 34) return pick;
    const M = [mastSide(px, pz, nx, nz, 1, 8.0, 36), mastSide(px, pz, nx, nz, -1, 8.0, 36)].filter(Boolean).sort((p, q) => p.t - q.t);
    return M[0] || (pick && pick.t <= 48 ? pick : null);                      // a tie is a SHORT wire: never longer than ~36 m (the test flags 60 m), else the end is cut back to its last support
  };
  const ties = [];                                                           // { wr, s, target }
  const terminate = (wr, atHi) => {
    const w = wr.w; sortSup(wr);
    const s0 = atHi ? wr.hi : wr.lo, setEnd = (s) => { if (atHi) wr.hi = s; else wr.lo = s; };
    // 1. a span within SNAP: the wire stops (or is extended) there
    let best = null;
    for (const q of wr.supports) {
      const d = q.s - s0; if (Math.abs(d) > SNAP) continue;
      const inside = atHi ? d <= 0 : d >= 0;                                 // shrinking the wire
      if (inside && (atHi ? q.s < wr.lo : q.s > wr.hi)) continue;
      if (!inside && (q.s < 0 || q.s > w.L)) continue;
      const score = Math.abs(d) + (inside ? 0 : 2);
      if (!best || score < best.score) best = { q, score };
    }
    if (best) { setEnd(best.q.s); stats.snapped++; wr[atHi ? 'doneHi' : 'doneLo'] = true; return; }
    // 2. a new span exactly at the end
    const q = wayAt(w, s0), nx = -q.tz, nz = q.tx;
    const sp = spanAt(q.x, q.z, nx, nz);
    if (sp) {
      const rsp = registerOrReuse(sp); crossSpan(rsp);
      const c = supNear(wr, rsp, s0);
      if (c) setEnd(c.s);
      else { const p = pt(wr, s0), u = clamp(((p[0] - sp.A[0]) * (sp.B[0] - sp.A[0]) + (p[1] - sp.A[1]) * (sp.B[1] - sp.A[1])) / (sp.len * sp.len), 0, 1); addSupport(wr, rsp, s0, u, p[0], p[1]); }
      stats.terminals++; wr[atHi ? 'doneHi' : 'doneLo'] = true; return;
    }
    // 3. a tie to a rosette / mast
    const tg = tieTarget(q.x, q.z, nx, nz);
    if (tg) { ties.push({ wr, s: s0, target: tg }); if (atHi) wr.tHi = true; else wr.tLo = true; stats.ties++; wr[atHi ? 'doneHi' : 'doneLo'] = true; return; }
    // 4. nothing: shorten the wire to its nearest support, or delete the stub
    const cand = wr.supports.filter((c) => c.s >= wr.lo && c.s <= wr.hi && (atHi ? c.s < s0 : c.s > s0));
    if (cand.length) { const c = atHi ? cand[cand.length - 1] : cand[0]; setEnd(c.s); wr[atHi ? 'doneHi' : 'doneLo'] = true; } else wr.dead = true;
    stats.dropped++;
  };
  for (const wr of wires) {
    if (wr.dead) continue;
    if (!wr.jLo) terminate(wr, false);
    if (!wr.dead && !wr.jHi) terminate(wr, true);
  }
  for (let again = 0; again < 3; again++) {                                  // a wire deleted by terminate() leaves its arc partners open: terminate those ends too
    const was = wires.map((wr) => (wr.jLo ? 1 : 0) + (wr.jHi ? 2 : 0));
    relink();
    let changed = false;
    wires.forEach((wr, i) => {
      if (wr.dead) return;
      const now = (wr.jLo ? 1 : 0) + (wr.jHi ? 2 : 0);
      if ((was[i] & 1) && !(now & 1)) { terminate(wr, false); changed = true; }
      if (!wr.dead && (was[i] & 2) && !(now & 2)) { terminate(wr, true); changed = true; }
    });
    if (!changed) break;
  }
  // gap fill: a wire may run unsupported for GAP metres at most (open squares, bridges)
  /** a span between the two standards of the Blagoveshchensky Bridge nearest to the middle of a gap of the wire (the gap lies between the arclengths s - span / 2 and s + span / 2; a standard at least 4 m inside it), or null */
  const blagSpan = (wr, s, span) => {
    const w = wr.w, a = wayAt(w, clamp(s - span / 2, 0, w.L)), b = wayAt(w, clamp(s + span / 2, 0, w.L));
    const u0 = blagU(a.x, a.z), u1 = blagU(b.x, b.z), lo = Math.min(u0, u1) + 4, hi = Math.max(u0, u1) - 4, mid = (u0 + u1) / 2;
    let best = null;
    for (const u of BLAG.lamps) if (u >= lo && u <= hi && (best === null || Math.abs(u - mid) < Math.abs(best - mid))) best = u;
    if (best === null) return null;
    const sp = makeSpan(blagStd(best, -1), blagStd(best, 1));
    sp.G = blagDeckY(sp.mid[0], sp.mid[1]) ?? 0; sp.std = true;
    return sp;
  };
  const addGapSpan = (wr, s, span = 0) => {
    const w = wr.w;
    if (w.bridge && span > 0) { const q0 = wayAt(w, s); if (blagDeckY(q0.x, q0.z) != null) { const bs = blagSpan(wr, s, span); if (!bs) return false; const rsp = registerOrReuse(bs); crossSpan(rsp); stats.gapSpans++; stats.blagSpans = (stats.blagSpans || 0) + 1; return true; } }          // (the Blagoveshchensky Bridge: spans on its own standards)
    // (open districts, region.js: when the seven places round the middle all fail (courtyard gateways every few metres, no facade in reach), every 3 m of the gap is tried, the middle first)
    const offs = [0, -6, 6, -12, 12, -18, 18];
    if (span > 36 && wayOpen(w)) for (let d = 3; d < span / 2 - 3; d += 3) for (const sg of [-1, 1]) if (!offs.includes(d * sg)) offs.push(d * sg);
    for (const off of offs) {
      const ss = s + off; if (ss < wr.lo + 3 || ss > wr.hi - 3) continue;
      const q = wayAt(w, ss); if (nearNode(q.x, q.z, 5)) continue;
      const nx = -q.tz, nz = q.tx;
      let sp = w.bridge ? null : spanAt(q.x, q.z, nx, nz);
      if (!sp && !w.bridge) {                                                // open on both sides (a square, the edge of the data): a mast at each kerb of the whole street
        const a = facadeSide(q.x, q.z, nx, nz, 1) || mastSide(q.x, q.z, nx, nz, 1), b = facadeSide(q.x, q.z, nx, nz, -1) || mastSide(q.x, q.z, nx, nz, -1);
        if (a && b) { const len = Math.hypot(a.x - b.x, a.z - b.z); if (len >= 8 && len <= 110) sp = makeSpan(a, b); }
      }
      if (!sp) {
        // a bridge deck (no facade, the river forbids mastSide): a mast just outside the asphalt of the whole deck on each side
        // (open districts, region.js: 'the whole deck' means the whole deck: a deck of two one-way carriageways with the tram bed between them (Tuchkov Bridge: 2 x 10.6 m, the double track 6.6 m wide between)
        //  put the first mast of each side IN the median on the rails (0.3 - 1 m from a track axis, in the roadway of the bridge); the base steps on until no asphalt of another carriageway lies within 10 m
        //  further out, i.e. at the outer edge of the deck: the span crosses the whole deck)
        //  (review-streets 2026-10-08: only a deck whose WHOLE way lies in the open area, wayOpen: the Blagoveshchensky Bridge reaches into a reviewed district, its masts keep the old rules (the old zone stayed identical: the cascade of the
        //  shifted spans moved 6 masts of cell -6,-1 by 2-5 cm when only the span centre was tested))
        const deckOpen = !!w.bridge && wayOpen(w), ahead = (px, pz, sg) => { for (let k = 1.5; k <= 10; k += 1.5) if (net.cover(px + nx * sg * k, pz + nz * sg * k, {}) > -0.3) return true; return false; };
        const out = (sg) => { let d = 1.5; while (d < 40 && (net.cover(q.x + nx * sg * d, q.z + nz * sg * d, {}) > -0.3 || net.cover(q.x + nx * sg * (d + 1.3), q.z + nz * sg * (d + 1.3), {}) > -0.5 || inMergedStrip(net, q.x + nx * sg * (d + 1.3), q.z + nz * sg * (d + 1.3)) || railed(q.x + nx * sg * (d + 1.3), q.z + nz * sg * (d + 1.3)) || (deckOpen && ahead(q.x + nx * sg * (d + 1.3), q.z + nz * sg * (d + 1.3), sg)))) d += 0.5; d += 1.3; let x = q.x + nx * sg * d, z = q.z + nz * sg * d;
          if (!w.bridge && isOpen(x, z) && !poleClear(net, x, z, 0.5)) { let d2 = d, x2 = x, z2 = z; for (let m = 0; m < 8 && !poleClear(net, x2, z2, 0.5); m++) { d2 += 0.6; x2 = q.x + nx * sg * d2; z2 = q.z + nz * sg * d2; } if (poleClear(net, x2, z2, 0.5) && d2 <= 45) { d = d2; x = x2; z = z2; } else if (net.cover(x, z, {}) > -0.5 || trackDist(x, z) < 0.9 || furnZone(x, z)) return null; }       // (open districts: a base at the corner of a fillet / a strip patch slides outward until it is clear, as mastSide)
          return d > 40 || L.insideBuilding(x, z, 0.3) ? null : { x, z, y: 9.0, nx: -nx * sg, nz: -nz * sg, pole: true }; };
        const a = out(1), b = out(-1);
        if (!a || !b) continue;
        sp = makeSpan(a, b);
      }
      const rsp = registerOrReuse(sp); crossSpan(rsp); stats.gapSpans++;
      return true;
    }
    return false;
  };
  const supportsIn = (wr) => { sortSup(wr); return wr.supports.filter((q) => q.s >= wr.lo - 0.3 && q.s <= wr.hi + 0.3).map((q) => q.s); };
  for (const wr of wires) {                                                  // pass 1: the gaps inside one wire (a bridge may run longer: it has no facades to hang on)
    if (wr.dead) continue;
    const lim = wr.w.bridge ? BRIDGE_GAP : GAP;
    for (let guard = 0; guard < 12; guard++) {
      const marks = supportsIn(wr);
      if (wr.jLo || wr.tLo) marks.push(wr.lo); if (wr.jHi || wr.tHi) marks.push(wr.hi);
      marks.sort((a, b) => a - b);
      let big = null;
      for (let i = 0; i + 1 < marks.length; i++) if (marks[i + 1] - marks[i] > lim && (!big || marks[i + 1] - marks[i] > big[1] - big[0])) big = [marks[i], marks[i + 1]];
      if (!big) break;
      if (!addGapSpan(wr, (big[0] + big[1]) / 2, big[1] - big[0])) { if (ENV.WIRES_DEBUG) { const q = wayAt(wr.w, (big[0] + big[1]) / 2); console.log(`[wires] gap ${big[0].toFixed(0)}..${big[1].toFixed(0)} on ${wr.id} (L ${wr.w.L.toFixed(0)}, bridge ${!!wr.w.bridge}) near (${q.x.toFixed(0)}, ${q.z.toFixed(0)}) could not be filled`); } break; }
    }
  }
  // pass 2: the wires of two ways that meet at a joint / junction are ONE wire (joined by an arc): the run from the last support of one over the arc to the first support of the other
  // may not exceed CHAIN either (a bridge between two approach spans 40 m away on each side: the spans move to the bridge ends)
  const partnersOf = new Map();                                              // wire -> { lo: [{ wr, end, arc }], hi: [...] }
  for (const a of arcs) {
    if (!a.fx || !a.fy || a.sub < 0) continue;
    const link = (u, eu, v, ev) => { let m = partnersOf.get(u); if (!m) partnersOf.set(u, (m = { lo: [], hi: [] })); m[eu].push({ wr: v, end: ev, arc: a }); };
    link(a.wx, a.fx, a.wy, a.fy); link(a.wy, a.fy, a.wx, a.fx);
  }
  const endRun = (wr, end) => { const ss = supportsIn(wr); if (!ss.length) return wr.hi - wr.lo; return end === 'lo' ? ss[0] - wr.lo : wr.hi - ss[ss.length - 1]; };
  const arcLen = (a) => { const P = pt(a.wx, arcS(a, 'x')), Q = pt(a.wy, arcS(a, 'y')); return Math.hypot(P[0] - Q[0], P[1] - Q[1]) * 1.1; };
  for (const wr of wires) {
    if (wr.dead || wr.w.bridge || !partnersOf.has(wr)) continue;
    for (const end of ['lo', 'hi']) {
      for (let it = 0; it < 4; it++) {
        const ps = partnersOf.get(wr)[end].filter((p) => !p.wr.dead); if (!ps.length) break;
        const own = endRun(wr, end), worst = Math.max(...ps.map((p) => arcLen(p.arc) + endRun(p.wr, p.end)));
        if (own < 7 || own + worst <= CHAIN) break;
        const d = Math.max(6, own / 2);
        if (!addGapSpan(wr, end === 'lo' ? wr.lo + d : wr.hi - d)) break;
      }
    }
  }

  // NO FREE ENDS ANYWHERE: an end that is neither joined to a live arc (an arc whose partner wire was dropped is gone), nor tied, nor already terminated on a support (a joint at the data edge whose partner
  // way lost its lanes) is terminated now: snapped to a support / a new span / a tie, else cut back to the nearest support, else the stub is deleted. Repeated: cutting an end can orphan the arc of its partner.
  for (let again = 0; again < 4; again++) {
    relink(); let changed = false;
    for (const wr of wires) {
      if (wr.dead) continue;
      if (!wr.jLo && !wr.tLo && !wr.doneLo) { terminate(wr, false); changed = true; }
      if (!wr.dead && !wr.jHi && !wr.tHi && !wr.doneHi) { terminate(wr, true); changed = true; }
    }
    if (!changed) break;
  }
  // ------------------------------------------------------------ final supports per wire, span knots
  for (const wr of wires) {
    if (wr.dead) continue;
    sortSup(wr);
    wr.sups = [];
    for (const q of wr.supports) if (q.s >= wr.lo - 0.3 && q.s <= wr.hi + 0.3 && (!wr.sups.length || q.s - wr.sups[wr.sups.length - 1].s > 0.4)) wr.sups.push(q);
    for (const q of wr.sups) {                                               // where each wire of the pair meets the span (the span may cross at an angle): the hanger tops
      q.hang = [-1, 1].map((sub) => {
        const p = pt(wr, q.s, sub), sp = q.sp, u = clamp(((p[0] - sp.A[0]) * (sp.B[0] - sp.A[0]) + (p[1] - sp.A[1]) * (sp.B[1] - sp.A[1])) / (sp.len * sp.len), 0, 1);
        sp.knots.push(u);
        return { u, p };
      });
    }
    const sLo = wr.lo, sHi = wr.hi, w = wr.w, sups = wr.sups.map((q) => q.s);
    wr.hAt = (s) => {
      let a = sLo, b = sHi;
      for (const t of sups) { if (t <= s) a = Math.max(a, t); if (t > s) { b = Math.min(b, t); break; } }
      const br = w.bridge ? 0.05 * Math.sin(Math.PI * clamp(s / w.L, 0, 1)) * 4 : 0;
      if (b - a < 1) return H0 - br;
      const u = (s - a) / (b - a), D = b - a;
      return H0 - Math.min(0.5, 0.0115 * D) * 4 * u * (1 - u) - br;
    };
    if (w.bridge) { const h1 = wr.hAt; wr.hAt = (s) => { const p = pt(wr, s), g = blagDeckY(p[0], p[1]); return g == null ? h1(s) : h1(s) + g; }; }          // (the humped deck of the Blagoveshchensky Bridge: the wire follows it)
  }
  const parab = (sp, u) => { const ya = sp.A[2], yb = sp.B[2], sag = Math.max(0.25, (ya + yb) / 2 - 6.45); return ya + (yb - ya) * u - sag * 4 * u * (1 - u); };
  /** span height at fraction u from A to B: the catenary through the anchors (6.45 m at the middle), pulled down to <= HANGER above the contact wires wherever a hanger stands */
  const spanY = (sp, u) => {
    const G = sp.G || 0;                                                     // (a span over the humped deck of the Blagoveshchensky Bridge: the profile is relative to the deck)
    if (u <= 0) return sp.A[2] + G; if (u >= 1) return sp.B[2] + G;
    let d = 1e9; for (const k of sp.knots) d = Math.min(d, Math.abs(u - k) * sp.len);
    return G + Math.min(parab(sp, u), H0 + HANGER + 0.5 * d);
  };

  // ------------------------------------------------------------ supports hardware: rosettes and masts (drawn once per place)
  const placed = new Map();
  const placeSupport = (P, nx, nz, pole, G = 0) => {
    const key = Math.round(P[0] * 4) + ',' + Math.round(P[1] * 4) + ',' + Math.round(P[2] * 2);
    if (placed.has(key)) return; placed.set(key, 1);
    if (pole === 'std') {
      // the span ends on a historic standard of the Blagoveshchensky Bridge (drawn and collided by bridges/blag.js): a clamp ring + an eye on the column, nothing else
      if (poles) { poles.cyl(0.2, 0.2, 0.16, '#2a2d31', [P[0], P[2] + G, P[1]], null, 8, null, true); poles.cyl(0.035, 0.035, 0.2, '#e8e8e4', [P[0] + nx * 0.22, P[2] + G - 0.02, P[1] + nz * 0.22], [Math.PI / 2, Math.atan2(nx, nz), 0], 4, null, true); }
      stats.stdMasts = (stats.stdMasts || 0) + 1; service.masts.push({ x: P[0], z: P[1], h: P[2] + G, kind: 'blag' });
      return;
    }
    if (pole) {
      // plain black mast with a short bracket
      if (poles) { poles.cyl(0.11, 0.17, P[2], '#25282b', [P[0], 0.12 + P[2] / 2, P[1]], null, 6, null, true); poles.box(0.3, 0.3, 0.3, '#3a3d42', [P[0], 0.12 + P[2], P[1]]); }
      ctx.physics.addCylinder(P[0], P[1], 0.22, 0, 4);
      stats.masts++; service.masts.push({ x: P[0], z: P[1], h: P[2] });
    } else {
      // rosette: a round plate on the facade (white-grey) + a short eye with an insulator
      if (poles) {
        poles.cyl(0.13, 0.13, 0.05, '#bfc2c4', [P[0] + nx * 0.02, P[2], P[1] + nz * 0.02], [Math.PI / 2, Math.atan2(nx, nz), 0], 6);
        poles.cyl(0.035, 0.035, 0.22, '#e8e8e4', [P[0] + nx * 0.13, P[2] - 0.02, P[1] + nz * 0.13], [Math.PI / 2, Math.atan2(nx, nz), 0], 4, null, true);
      }
      stats.rosettes++; service.anchors.push({ x: P[0], y: P[2], z: P[1], nx, nz });
    }
  };

  // ------------------------------------------------------------ emit the contact wires
  const emitted = [];                                                        // plan segments for the crossing search
  const arcAnch = new Map();                                                 // wire -> the arclengths where an arc is anchored mid-wire: the contact wire gets a vertex there (a chord across a bend would miss the arc's end)
  for (const a of arcs) { if (!arcOk(a)) continue; for (const [wr, f, v] of [[a.wx, a.fx, a.sx], [a.wy, a.fy, a.sy]]) if (!f) { let l = arcAnch.get(wr); if (!l) arcAnch.set(wr, (l = [])); l.push(v); } }
  const hangerPts = [];
  for (const wr of wires) {
    if (wr.dead) continue;
    const w = wr.w, sLo = wr.lo, sHi = wr.hi;
    wr.drawn = sHi - sLo >= 0.5;
    if (!wr.drawn) continue;
    // sample positions: regular steps + the supports
    const S = []; const m = Math.max(2, Math.ceil((sHi - sLo) / step) + 1);
    for (let i = 0; i < m; i++) S.push(sLo + (sHi - sLo) * i / (m - 1));
    for (const q of wr.sups) S.push(q.s);
    for (const v of arcAnch.get(wr) || []) if (v > sLo && v < sHi) S.push(v);
    S.sort((a, b) => a - b);
    for (const sub of [-1, 1]) {
      const line = [];
      for (const s of S) { const p = pt(wr, s, sub); line.push([p[0], wr.hAt(s), p[1]]); }
      add(line, 0.028, WIRE, 'contact', wr.id);
      for (let i = 0; i + 1 < line.length; i++) emitted.push([line[i][0], line[i][2], line[i + 1][0], line[i + 1][2], wr.id, sub]);
    }
    if (sHi - sLo >= 4) {
      const cl = S.map((s) => { const p = pt(wr, s, 0); return [p[0], wr.hAt(s), p[1]]; });
      service.pairs.push({ id: wr.id, way: w.id, refs: wr.refs, dir: wr.dir, lane: wr.j, pts: cl });
      stats.pairs++; stats.wireKm += (sHi - sLo) / 1000;
    }
    // hangers: from the contact wire up to the span (the span polyline has a vertex right there)
    for (const q of wr.sups) {
      for (const h of q.hang) { const sp = q.sp; hangerPts.push([[h.p[0], wr.hAt(q.s), h.p[1]], [sp.A[0] + (sp.B[0] - sp.A[0]) * h.u, spanY(sp, h.u), sp.A[1] + (sp.B[1] - sp.A[1]) * h.u]]); }
    }
  }
  // ties of the free ends nothing else fits (a short wire from the wire end to a rosette / mast)
  for (const t of ties) {
    const wr = t.wr; if (wr.dead) continue;
    const tg = t.target; placeSupport([tg.x, tg.z, tg.y], tg.nx, tg.nz, tg.pole);
    for (const sub of [-1, 1]) { const p = pt(wr, t.s, sub); add([[p[0], wr.hAt(t.s), p[1]], [tg.x, tg.y, tg.z]], 0.026, WIRE, 'tie', wr.id); }
  }
  for (const a of arcs) {
    if (!arcOk(a)) { stats.dropped++; continue; }
    const sx = arcS(a, 'x'), sy = arcS(a, 'y'), P = pt(a.wx, sx, a.sub), Q = pt(a.wy, sy, a.sub);
    const y0 = a.wx.hAt(sx), y1 = a.wy.hAt(sy);
    const pl = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
    if (pl < 0.08 && Math.abs(y1 - y0) < 0.08) continue;                     // the two wires already meet
    const ap = arcPoints([P[0], P[1]], [P[2], P[3]], [Q[0], Q[1]], [Q[2], Q[3]]);
    const line = ap.map((p, i) => { const u = i / (ap.length - 1); return [p[0], y0 + (y1 - y0) * u - 0.12 * 4 * u * (1 - u), p[1]]; });
    add(line, 0.028, WIRE, 'arc', a.wx.id + '>' + a.wy.id); stats.arcs++;
    for (let i = 0; i + 1 < line.length; i++) emitted.push([line[i][0], line[i][2], line[i + 1][0], line[i + 1][2], 'A' + a.node + a.wx.id + a.wy.id, a.sub]);
    if (a.sub > 0) service.arcs.push({ from: a.wx.id, to: a.wy.id, refs: a.refs, pts: line.map((p) => [p[0], H0, p[2]]) });
  }
  for (const h of hangerPts) { add(h, 0.02, WIRE, 'hanger'); stats.hangers++; }

  // ------------------------------------------------------------ TRAM CONTACT WIRES (Vasilievsky Island, 2026-10-07)
  // ONE contact wire 5.7 m over the axis of every tram track of the island (TRAMWAYS: the main tracks and their connectors, the junction triangles; the depot yard tracks are not wired), hung from
  // the CROSS-SPANS of the trolleybus network where one crosses the track (Sredny pr.: the web of spans over the double track), plus spans of its own where none is near: at every free end
  // (exactly there, so the wires of two tracks that meet at a switch touch on one hanger) and wherever two supports are more than 34 m apart. Same invariant as above: no wire ends in the air.
  // Tracks on bridge decks are not wired (the bridges module owns the decks); tracks outside the island are not wired either, except the first 620 m of the approaches of the island bridges (see tramList below).
  const tramService = [], tramHang = [];
  {
    const TH = 5.7, TGAP = 34, SC = 24, tstat = stats.tram = { tracks: 0, wires: 0, supports: 0, newSpans: 0, ties: 0, dropped: 0, km: 0 };
    const sgrid = new Map();
    const indexSpan = (sp) => { const n = Math.max(1, Math.ceil(sp.len / 8)), seen = new Set(); for (let k = 0; k <= n; k++) { const key = Math.floor((sp.A[0] + (sp.B[0] - sp.A[0]) * k / n) / SC) * 4096 + Math.floor((sp.A[1] + (sp.B[1] - sp.A[1]) * k / n) / SC); if (seen.has(key)) continue; seen.add(key); let l = sgrid.get(key); if (!l) sgrid.set(key, (l = [])); l.push(sp); } };
    spans.forEach(indexSpan);
    const spansNear = (x, z) => { const out = new Set(); for (let a = Math.floor(x / SC) - 1; a <= Math.floor(x / SC) + 1; a++) for (let b = Math.floor(z / SC) - 1; b <= Math.floor(z / SC) + 1; b++) for (const sp of sgrid.get(a * 4096 + b) || []) out.add(sp); return out; };
    // the tracks to wire: those of the island (outline lib/vo-island.js) + the APPROACH tracks of the island bridges (2026-10-10): a bridge deck track (Tuchkov, Nalichny) that joins a track of the island
    // continues on the far bank on a track that lies outside the outline; its first APPROACH metres from the abutment are wired too (the decks themselves are wired by the bridges module: bridges/long.js,
    // styles5.js; streets stops at the deck edge, deckAt below), so a tram does not lose its wire at the abutment and carry a raised pantograph through the air
    const APPROACH = 620, plain = (t) => !(t.tunnel || t.layer < 0 || t.bridge || t.service === 'yard' || t.pts.length < 4);
    const tramList = [], endsOf = (t) => [[t.pts[0], t.pts[1]], [t.pts[t.pts.length - 2], t.pts[t.pts.length - 1]]];
    for (const t of TRAMWAYS) {
      if (!plain(t)) continue;
      const n2 = t.pts.length; if (inIsland(t.pts[0], t.pts[1]) || inIsland(t.pts[n2 - 2], t.pts[n2 - 1]) || inIsland(t.pts[n2 >> 1 & ~1], t.pts[(n2 >> 1 & ~1) + 1])) tramList.push({ t, pts: t.pts });
    }
    {
      const coreEnds = tramList.flatMap((q) => endsOf(q.t)), taken = new Set(tramList.map((q) => q.t)), d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      for (const b of TRAMWAYS) {
        if (!b.bridge || b.tunnel || b.layer < 0 || b.pts.length < 4) continue;
        const be = endsOf(b);
        for (let k = 0; k < 2; k++) {
          if (!coreEnds.some((e) => d2(e, be[k]) < 40)) continue;               // this end of the deck track meets a track of the island ...
          for (const t of TRAMWAYS) {                                            // ... the other end meets the approach track beyond the outline
            if (!plain(t) || taken.has(t)) continue;
            const te = endsOf(t), j = te.findIndex((e) => d2(e, be[1 - k]) < 8); if (j < 0) continue;
            const src = pairs(t.pts), pts = []; if (j === 1) src.reverse();
            let run = 0; for (let i = 0; i < src.length; i++) {
              if (i) { const seg = Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]); if (run + seg > APPROACH) { const f = (APPROACH - run) / seg; pts.push(src[i - 1][0] + (src[i][0] - src[i - 1][0]) * f, src[i - 1][1] + (src[i][1] - src[i - 1][1]) * f); break; } run += seg; }
              pts.push(src[i][0], src[i][1]);
            }
            taken.add(t); tramList.push({ t, pts });
          }
        }
      }
    }
    tstat.approach = tramList.filter((q) => q.pts !== q.t.pts).length;
    for (const { t, pts } of tramList) {
      let pl = pairs(pts); if (pl.length > 2) pl = chaikin(pl, 2, 40); pl = densify(pl, 2);
      tstat.tracks++;
      // runs outside the buildings (a track that passes under a roof is not wired there)
      const runs = []; let cur = [];
      for (const p of pl) { if (L.insideBuilding(p[0], p[1], 0) || deckAt(p[0], p[1], 0.5)) { if (cur.length > 1) runs.push(cur); cur = []; } else cur.push(p); }
      if (cur.length > 1) runs.push(cur);
      runs.forEach((run, ri) => {
        const S = [0]; for (let i = 1; i < run.length; i++) S.push(S[i - 1] + Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]));
        const Len = S[S.length - 1]; if (Len < 8) return;
        const posAt = (s) => { let i = 0; while (i < run.length - 2 && S[i + 1] < s) i++; const l = S[i + 1] - S[i] || 1, f = clamp((s - S[i]) / l, 0, 1), tx = (run[i + 1][0] - run[i][0]) / l, tz = (run[i + 1][1] - run[i][1]) / l; return { x: run[i][0] + (run[i + 1][0] - run[i][0]) * f, z: run[i][1] + (run[i + 1][1] - run[i][1]) * f, tx, tz }; };
        const uOf = (sp, x, z) => clamp(((x - sp.A[0]) * (sp.B[0] - sp.A[0]) + (z - sp.A[1]) * (sp.B[1] - sp.A[1])) / (sp.len * sp.len), 0, 1);
        const sup = [];                                                       // { s, sp, u }
        // 1. the cross-spans that already cross the track
        for (let i = 0; i + 1 < run.length; i++) {
          const ax = run[i][0], az = run[i][1], bx = run[i + 1][0], bz = run[i + 1][1], sl = S[i + 1] - S[i] || 1, tx = (bx - ax) / sl, tz = (bz - az) / sl;
          for (const sp of spansNear((ax + bx) / 2, (az + bz) / 2)) {
            if (Math.abs(sp.tx * tx + sp.tz * tz) > 0.7) continue;
            const X = segX(ax, az, bx, bz, sp.A[0], sp.A[1], sp.B[0], sp.B[1]); if (!X) continue;
            sup.push({ s: S[i] + sl * X.t, sp, u: X.u });
          }
        }
        sup.sort((a, b) => a.s - b.s);
        const kept = []; for (const q of sup) if (!kept.length || q.s - kept[kept.length - 1].s > 7) kept.push(q);
        // 2. a span exactly at s (reuses an identical one), or null
        const makeAt = (s) => {
          const p = posAt(s), nx = -p.tz, nz = p.tx;
          if (nearNode(p.x, p.z, 4) && s > 3 && s < Len - 3) return null;
          let sp = spanAt(p.x, p.z, nx, nz);
          if (!sp) { const a = facadeSide(p.x, p.z, nx, nz, 1) || mastSide(p.x, p.z, nx, nz, 1), b = facadeSide(p.x, p.z, nx, nz, -1) || mastSide(p.x, p.z, nx, nz, -1); if (a && b) { const len = Math.hypot(a.x - b.x, a.z - b.z); if (len >= 8 && len <= 110) sp = makeSpan(a, b); } }       // (open on both sides: a mast at each kerb of the whole street, as the gap spans of the trolleybus wires)
          if (!sp) return null;
          const had = spans.length, rsp = registerOrReuse(sp); if (spans.length > had) { indexSpan(rsp); tstat.newSpans++; }
          return { s, sp: rsp, u: uOf(rsp, p.x, p.z) };
        };
        const insert = (q) => { kept.push(q); kept.sort((a, b) => a.s - b.s); };
        // 3. both ends carry a support (at most 2 m inside: a free end would hang in the air)
        for (const [endS, near] of [[0, (q) => q.s < 2], [Len, (q) => q.s > Len - 2]]) {
          if (kept.some(near)) continue;
          let q = makeAt(endS);
          for (const off of [3, 6, 9, 12, 16]) { if (q || Len < 3 * off) break; q = makeAt(endS ? Len - off : off); }           // (open ground at a deck end: the first place that takes a span; the wire starts there, at most 16 m short)
          if (q) insert(q);
        }
        // 4. no gap longer than TGAP
        for (let guard = 0; guard < 40 && kept.length; guard++) {
          let big = null; for (let i = 0; i + 1 < kept.length; i++) if (kept[i + 1].s - kept[i].s > TGAP && (!big || kept[i + 1].s - kept[i].s > big[1] - big[0])) big = [kept[i].s, kept[i + 1].s];
          if (!big) break;
          const mid = (big[0] + big[1]) / 2; let done = false;
          for (const off of [0, -4, 4, -8, 8, -12, 12, -16, 16]) { const s = mid + off; if (s < big[0] + 8 || s > big[1] - 8) continue; const q = makeAt(s); if (q) { insert(q); done = true; break; } }
          if (!done) break;
        }
        if (ENV.WIRES_DEBUG) for (let i = 0; i + 1 < kept.length; i++) if (kept[i + 1].s - kept[i].s > TGAP) { const p = posAt((kept[i].s + kept[i + 1].s) / 2); console.log(`[wires] tram ${t.id} gap ${kept[i].s.toFixed(0)}..${kept[i + 1].s.toFixed(0)} of ${Len.toFixed(0)} near (${p.x.toFixed(0)}, ${p.z.toFixed(0)}) could not be filled`); }
        if (kept.length < 2) { tstat.dropped++; return; }
        // 5. the wire: from the first to the last support (an end support that is more than 2 m from the end of the track shortens the wire)
        const id = 'TW' + t.id + (runs.length > 1 ? '.' + ri : '');
        const pts3 = [], center = [];
        for (let k = 0; k + 1 < kept.length; k++) {
          const a = kept[k].s, b = kept[k + 1].s, D = b - a, m = Math.max(2, Math.ceil(D / 3));
          for (let j = k ? 1 : 0; j <= m; j++) { const s = a + D * j / m, p = posAt(s), u = j / m, y = TH - Math.min(0.4, 0.0115 * D) * 4 * u * (1 - u); pts3.push([p.x, y, p.z]); center.push([p.x, TH, p.z]); }
        }
        add(pts3, 0.028, WIRE, 'contact', id); tstat.wires++; tstat.km += (kept[kept.length - 1].s - kept[0].s) / 1000;
        for (const q of kept) {
          const p = posAt(q.s), sp = q.sp, u = uOf(sp, p.x, p.z); sp.knots.push(u);
          tramHang.push([[p.x, TH, p.z], [sp.A[0] + (sp.B[0] - sp.A[0]) * u, 0, sp.A[1] + (sp.B[1] - sp.A[1]) * u], sp, u]);
          tstat.supports++;
        }
        tramService.push({ id, track: t.id, pts: center });
      });
    }
  }
  for (const [a, top, sp, u] of tramHang) { top[1] = spanY(sp, u); add([a, top], 0.02, WIRE, 'hanger'); stats.hangers++; }
  service.tramWires = tramService;

  // ------------------------------------------------------------ spans, rosettes, masts
  for (const sp of spans) {
    if (!sp.knots.length) continue;
    const us = new Set([0, 1]); const n = Math.max(6, Math.ceil(sp.len / 4));
    for (let i = 1; i < n; i++) us.add(i / n);
    for (const k of sp.knots) us.add(k);
    const U = [...us].sort((a, b) => a - b), pts = [];
    for (const u of U) pts.push([sp.A[0] + (sp.B[0] - sp.A[0]) * u, spanY(sp, u), sp.A[1] + (sp.B[1] - sp.A[1]) * u]);
    add(pts, 0.034, SPANC, 'span', 'S' + sp.id); stats.spans++;
    service.spans.push({ id: sp.id, a: [sp.A[0], sp.A[2] + (sp.G || 0), sp.A[1]], b: [sp.B[0], sp.B[2] + (sp.G || 0), sp.B[1]], mid: [sp.mid[0], parab(sp, 0.5) + (sp.G || 0), sp.mid[1]], len: sp.len, poles: [sp.poleA, sp.poleB] });
    placeSupport(sp.A, sp.nxA, sp.nzA, sp.poleA, sp.G || 0); placeSupport(sp.B, sp.nxB, sp.nzB, sp.poleB, sp.G || 0);
    // PENDANT LAMPS (the old island, 2026-10-07: Commons "Saint Petersburg tram 3504 ... Sredniy Prospekt", "Sredniy prospect V.O. - panoramio"): the streets of Vasilievsky Island are lit by dome-shaded lamps that hang from the
    // cross-spans, 0.6 m below the span (every second span, the place nearest the middle that is 2.4 m from every hanger: over Sredny the tram and trolleybus hangers leave only a few); the modern west (x < -6000) has steel poles instead
    if (poles && !sp.std && sp.mid[0] > -6000 && hash2(sp.id, 13) < 0.55 && inIsland(sp.mid[0], sp.mid[1])) {
      for (const u of [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82]) {
        if (sp.knots.some((k) => Math.abs(k - u) * sp.len < 2.4)) continue;
        const x = sp.A[0] + (sp.B[0] - sp.A[0]) * u, z = sp.A[1] + (sp.B[1] - sp.A[1]) * u, y = spanY(sp, u);
        poles.rod([x, y, z], [x, y - 0.55, z], 0.012, '#1d1f22', 3, true);
        poles.cyl(0.05, 0.38, 0.24, '#2f3b38', [x, y - 0.68, z], null, 8, null, true);                              // the dome shade
        poles.ball(0.13, '#fff0cf', [x, y - 0.78, z]);                                                              // the bulb
        stats.pendants = (stats.pendants || 0) + 1; if (ENV.WIRES_DEBUG === 'pendants') console.log(`[wires] pendant span ${sp.id} u ${u} at ${x.toFixed(1)}, ${y.toFixed(2)}, ${z.toFixed(1)}`); break;
      }
    }
  }

  // ------------------------------------------------------------ crossing frames where wires of different routes cross
  if (poles) {
    const grid = new Map(), C = 10;
    emitted.forEach((e, i) => { const x0 = Math.floor(Math.min(e[0], e[2]) / C), x1 = Math.floor(Math.max(e[0], e[2]) / C), z0 = Math.floor(Math.min(e[1], e[3]) / C), z1 = Math.floor(Math.max(e[1], e[3]) / C); for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const k = a * 4096 + b; let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(i); } });
    const done = []; const seenPair = new Set();
    for (const list of grid.values()) for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const i = list[a], j = list[b]; if (seenPair.has(i * 100003 + j)) continue; seenPair.add(i * 100003 + j);
      const E = emitted[i], F = emitted[j]; if (E[4] === F[4] || E[5] !== 1 || F[5] !== 1) continue;
      const X = segX(E[0], E[1], E[2], E[3], F[0], F[1], F[2], F[3]); if (!X) continue;
      const ex = E[2] - E[0], ez = E[3] - E[1], fx = F[2] - F[0], fz = F[3] - F[1], c = Math.abs(ex * fz - ez * fx) / (Math.hypot(ex, ez) * Math.hypot(fx, fz) || 1);
      if (c < 0.25) continue;
      const x = E[0] + ex * X.t, z = E[1] + ez * X.t;
      if (done.some((d) => Math.hypot(d[0] - x, d[1] - z) < 1.6)) continue;
      done.push([x, z]);
      const ang = Math.atan2(ex, ez);
      poles.box(0.12, 0.07, 1.1, '#2d3034', [x, H0 + 0.04, z], [0, ang, 0]); poles.box(0.12, 0.07, 1.1, '#2d3034', [x, H0 + 0.04, z], [0, Math.atan2(fx, fz), 0]);
      poles.cyl(0.05, 0.05, 0.12, '#e8e8e4', [x, H0 + 0.13, z], null, 5, null, true);
      stats.frogs++;
    }
  }

  // ------------------------------------------------------------ blue lane-use signs hanging from the spans on Nevsky approaches
  if (panels && signTex && poles) {
    const jGrid = new PointGrid(64); for (const n of net.nodes) if (n.arms.length >= 3) jGrid.add(n.x, n.z, n);       // (every span asked every node)
    for (const sp of spans) {
      if (!sp.knots.length || sp.poleA || sp.poleB || hash2(sp.mid[0], sp.mid[1]) > 0.28) continue;
      // only spans over a Nevsky carriageway close to a signalised junction
      const near = jGrid.first(sp.mid[0], sp.mid[1], 70, (n) => avoid.some((a) => Math.hypot(a[0] - n.x, a[1] - n.z) < 20));
      if (!near) continue;
      for (const wr of wires) {
        if (wr.dead) continue;
        const q = wr.sups.find((c) => c.sp === sp); if (!q || !wr.kerb || wr.w.name !== 'Невский проспект') continue;
        const p = pt(wr, q.s, 0), ysp = spanY(sp, q.u);
        panels.mount(poles, signTex, p[0], ysp - 0.62, p[1], -p[2], -p[3], 0.7, 0.9, { kind: 'plate' }); stats.signs++;
      }
    }
  }
  service.wireKm = stats.wireKm;
  stats.ms = Math.round(now() - T0);
  return { stats, service };
}
export { clamp };
