// traffic/trams.js (Saint Petersburg) - the TRAMS: one-section cars that run on the rails of streets.tram (the OSM tram tracks), never on the lane graph. Pure data, no three.js (runs in node).
//
// WHAT IT DOES
//   * buildTramNet(st, opts): the tracks become a directed graph of their vertices. Every track of a double line is one-way; its sense is found from the geometry (right-hand running: the
//     twin track lies on the LEFT; 122 of the 145 tracks of the data are drawn in the travel direction, 16 short ones against it, 7 single connectors may be used both ways). A LINE of
//     TRAM_LINES is the shortest rail path between its two terminals (track ends at the data edge), searched once per direction (no reversing at a switch: the turn between two rail
//     pieces is < ~70 degrees); each path is one long polyline (`route`) with
//       stops   the tram stop positions of the map (opts.stops: STATIONS kind 'tram') that lie on it,
//       lights  the signalled stop lines of the carriageway beside it (same direction, <= 12 m to the side): the tram obeys the phase of the cars it runs beside,
//       vlim    a speed profile: 11 m/s on the straight, sqrt(0.9 R) in the curves and the switches (never under 3.2 m/s), smoothed backwards with the service brake.
//     Lines whose terminals are not in the data (a scene built without those districts) are skipped: no trams, no error.
//   * createTrams(net, env): the tram simulation, stepped by traffic/sim.js with its fixed step. A tram follows the tram ahead on its own route (IDM), stops at every stop (14-22 s),
//     at a red / late amber light, and behind anything that is in its way. Its way is the swept gauge of its own rails ahead (the route polyline sampled every 2.5 m up to the braking
//     distance, 1.35 m either side: a queue of cars in the lane beside the rails, or a tram on the other track of a curve, is NOT in the way; a car standing on the rails is). Trams are
//     in sim.vehicles, so the cars see them through the collision net of sim.js; trams have negative ids: at a crossing of paths without a signal the cars give way to the tram (the
//     higher id yields in sim.js), a tram only brakes for a vehicle that is in its gauge already (a car crossing ahead at speed is gone before the tram arrives: ignored beyond 7 m).
//     The whole route is simulated all the time (a few dozen trams in the whole map), independent of the active region of the cars: a tram that leaves the bridge does not vanish at the
//     edge of the region. Trams are born at their terminal at the data edge and leave there. Deterministic: its own random stream (the cars' stream is not touched).
//   * TRAM LANES (sim.js, net.onRails): a car lane of a carriageway with two or more lanes that lies on the rails of a route for most of its length is left to the trams: no cars are
//     seeded or born on it and a car only turns into it when it has no other way (the tram lanes of the Tuchkov Bridge, pr. Dobrolyubova, Sadovaya: a queue of cars on the rails would
//     hold the tram for minutes).
// Sources: docs/research/transport.md section 6 (red-white-grey one-section cars), the tram routes of 2026 (3 pl. Repina - pl. Lenina over the Trinity and Sampsonievsky bridges; 6 and 40
// from Vasilievsky Island over the Tuchkov Bridge, pr. Dobrolyubova, Kronverksky pr., ul. Kuibysheva and the Sampsonievsky Bridge; ul. Chapaeva and Bolshaya Monetnaya carry no regular
// service, the rails of ul. Lva Tolstogo neither: no trams there).
import { ARCH, ROUTE_BY_REF } from './fleetdata.js';

// terminals in map metres (track ends at the data edge; within 90 m): a = the Vyborg end of the Sampsonievsky Bridge (towards pl. Lenina / Tikhoretsky pr.)
export const TRAM_LINES = [
  { refs: ['3'], a: [-430, -2860], b: [-1456, 280], headway: 190 },           // b = Sadovaya ulitsa at Apraksin Dvor: the rails leave the data there for 95 m (the notch between two map rectangles)
  { refs: ['3'], a: [-1530, 341], b: [-3390, 1508], headway: 190 },           // ... and come back: Sennaya ploshchad - Sadovaya - ploshchad Repina (b)
  // Vasilievsky Island (2026-10-09): the rails run on over Sredny pr. to Gavan (route 6: Gavanskaya st. - Maly pr. - Nalichnaya st. - the Nalichny Bridge, the rails end at (-6530, -2295) on the Dekabristov Island side) and to
  // Detskaya st. (route 40: 22-23 liniya - Kosaya liniya, the terminus loop of three track ends round (-5455, 645)); the two routes share the trunk Sampsonievsky Bridge - Tuchkov Bridge - Sredny pr. up to the 22-23 liniya junction.
  // stopTol: the tram stops of the island are mapped on one of the two tracks of a double line (3.6 m apart): a stop within 4.3 m of the route serves it. The tourist T1 (a ring Vasileostrovskaya - Zverinskaya - Gorkovskaya - Dobrolyubova
  // pr. from the museum, OSM relation 11921539, running days unknown) needs a turn-back loop in the middle of the network and is NOT run (its boards exist in fleetdata.ROUTES).
  { refs: ['6'], a: [-430, -2860], b: [-6530, -2295], headway: 450, stopTol: 4.3 },
  { refs: ['40'], a: [-430, -2860], b: [-5455, 645], headway: 450, stopTol: 4.3 },
];
const V_MAX = 11, V_MIN = 3.2, A_MAX = 0.95, B_SERVICE = 1.15, B_EMERGENCY = 4.2, LAT = 0.9;
const hyp = Math.hypot;

function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** the directed vertex graph of the tracks + the routes of TRAM_LINES; opts: { atEdge(x, z, m), stops: [{ x, z, name }], lines } */
export function buildTramNet(st, opts = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const stats = { tracks: 0, km: 0, forward: 0, reversed: 0, both: 0, nodes: 0, routes: 0, missing: [] };
  const tracks = [];
  for (const t of st.tram || []) {
    const p = []; for (let i = 0; i + 1 < t.pts.length; i += 2) { const x = t.pts[i], z = t.pts[i + 1]; if (!p.length || hyp(x - p[p.length - 1][0], z - p[p.length - 1][1]) > 0.05) p.push([x, z]); }
    if (p.length >= 2) tracks.push({ id: t.id, p, dir: 0 });
  }
  stats.tracks = tracks.length;
  if (!tracks.length) return { routes: [], stats };
  // ---- the sense of every track: the nearest parallel piece of ANOTHER track 1.5 .. 6 m to the side is its twin; twin on the left = drawn in the travel direction
  const CS = 24, sgrid = new Map(), segs = [];
  tracks.forEach((t, ti) => { for (let k = 0; k + 1 < t.p.length; k++) { const a = t.p[k], b = t.p[k + 1], sg = { ti, ax: a[0], az: a[1], bx: b[0], bz: b[1] }, i = segs.push(sg) - 1; for (let cx = Math.floor(Math.min(a[0], b[0]) / CS); cx <= Math.floor(Math.max(a[0], b[0]) / CS); cx++) for (let cz = Math.floor(Math.min(a[1], b[1]) / CS); cz <= Math.floor(Math.max(a[1], b[1]) / CS); cz++) { const key = cx * 65536 + cz; (sgrid.get(key) || sgrid.set(key, []).get(key)).push(i); } } });
  tracks.forEach((t, ti) => {
    let l = 0, r = 0, n = 0;
    for (let k = 0; k + 1 < t.p.length; k++) {
      const a = t.p[k], b = t.p[k + 1], dl = hyp(b[0] - a[0], b[1] - a[1]) || 1e-9, tx = (b[0] - a[0]) / dl, tz = (b[1] - a[1]) / dl, mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      let bd = 6, side = 0; const cx = Math.floor(mx / CS), cz = Math.floor(mz / CS);
      for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) for (const si of sgrid.get(i * 65536 + j) || []) {
        const s = segs[si]; if (s.ti === ti) continue;
        const ex = s.bx - s.ax, ez = s.bz - s.az, el = hyp(ex, ez) || 1e-9; if (Math.abs((ex * tx + ez * tz) / el) < 0.9) continue;
        const u = ((mx - s.ax) * ex + (mz - s.az) * ez) / (el * el); if (u < 0 || u > 1) continue;
        const qx = s.ax + ex * u - mx, qz = s.az + ez * u - mz, d = hyp(qx, qz); if (d < 1.5 || d >= bd) continue;
        bd = d; side = qx * -tz + qz * tx;                           // > 0: on the right of the drawn direction ((-tz, tx) is the right-hand normal: x east, z south)
      }
      n += dl; if (side > 0) r += dl; else if (side < 0) l += dl;
    }
    t.dir = l > r && l > n * 0.3 ? 1 : r > l && r > n * 0.3 ? -1 : 0;
    stats[t.dir > 0 ? 'forward' : t.dir < 0 ? 'reversed' : 'both']++; stats.km += n / 1000;
  });
  // ---- nodes: the vertices of all tracks, merged within 0.6 m (the OSM ways share their switch nodes)
  const NC = 2, ngrid = new Map(), nodes = [];
  const nodeAt = (x, z) => {
    const cx = Math.floor(x / NC), cz = Math.floor(z / NC);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) for (const ni of ngrid.get(i * 65536 + j) || []) if (hyp(nodes[ni].x - x, nodes[ni].z - z) < 0.6) return ni;
    const ni = nodes.push({ x, z, out: [], ends: 0, deg: 0 }) - 1; (ngrid.get(cx * 65536 + cz) || ngrid.set(cx * 65536 + cz, []).get(cx * 65536 + cz)).push(ni); return ni;
  };
  const edges = [];                                                    // { a, b (node ids), len, tx, tz, w (cost factor) }
  for (const t of tracks) {
    const ids = t.p.map((q) => nodeAt(q[0], q[1]));
    nodes[ids[0]].ends++; nodes[ids[ids.length - 1]].ends++;
    for (let k = 0; k + 1 < ids.length; k++) {
      if (ids[k] === ids[k + 1]) continue;
      const A = nodes[ids[k]], B = nodes[ids[k + 1]], len = hyp(B.x - A.x, B.z - A.z), tx = (B.x - A.x) / len, tz = (B.z - A.z) / len;
      A.deg++; B.deg++;
      if (t.dir >= 0) { A.out.push(edges.length); edges.push({ a: ids[k], b: ids[k + 1], len, tx, tz, w: t.dir ? 1 : 2.5 }); }
      if (t.dir <= 0) { B.out.push(edges.length); edges.push({ a: ids[k + 1], b: ids[k], len, tx: -tx, tz: -tz, w: t.dir ? 1 : 2.5 }); }
    }
  }
  stats.nodes = nodes.length;
  // ---- shortest rail path between two terminals (Dijkstra over the edges: a tram never turns back at a switch)
  const near = (n, p, r) => hyp(n.x - p[0], n.z - p[1]) < r;
  function path(from, to) {
    const dist = new Float64Array(edges.length).fill(Infinity), prev = new Int32Array(edges.length).fill(-1), done = new Uint8Array(edges.length), heap = [];
    const push = (e, d) => { heap.push([d, e]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    edges.forEach((e, i) => { const A = nodes[e.a]; if (A.deg === 1 && near(A, from, 90)) { dist[i] = e.len; push(i, e.len); } });       // a track end at the terminal
    let goal = -1, closest = null, cd = 1e9, starts = heap.length;
    while (heap.length) {
      const [d, ei] = pop(); if (done[ei]) continue; done[ei] = 1;
      const e = edges[ei], B = nodes[e.b];
      { const q = hyp(B.x - to[0], B.z - to[1]); if (q < cd) { cd = q; closest = B; } }
      if (B.deg === 1 && near(B, to, 90)) { goal = ei; break; }
      for (const oi of B.out) { const o = edges[oi]; if (done[oi] || o.tx * e.tx + o.tz * e.tz < 0.35) continue; const nd = d + o.len * o.w; if (nd < dist[oi]) { dist[oi] = nd; prev[oi] = ei; push(oi, nd); } }
    }
    if (goal < 0) { path.why = `${starts} track ends at the start; the rails lead to (${closest ? Math.round(closest.x) + ', ' + Math.round(closest.z) : '-'}), ${Math.round(cd)} m short`; return null; }
    const ids = []; for (let ei = goal; ei >= 0; ei = prev[ei]) ids.push(ei); ids.reverse();
    const pts = [[nodes[edges[ids[0]].a].x, nodes[edges[ids[0]].a].z]]; for (const ei of ids) pts.push([nodes[edges[ei].b].x, nodes[edges[ei].b].z]);
    return pts;
  }
  // ---- helpers on a route polyline
  const mk = (pts) => {
    const n = pts.length, xs = new Float64Array(n), zs = new Float64Array(n), cum = new Float64Array(n);
    for (let i = 0; i < n; i++) { xs[i] = pts[i][0]; zs[i] = pts[i][1]; if (i) cum[i] = cum[i - 1] + hyp(xs[i] - xs[i - 1], zs[i] - zs[i - 1]); }
    return { xs, zs, cum, n, len: cum[n - 1] };
  };
  /** nearest point of the route to (x, z) within maxD: { s, d, tx, tz } | null (grid of the route's segments) */
  const projector = (R) => {
    const g = new Map();
    for (let i = 0; i + 1 < R.n; i++) for (let cx = Math.floor(Math.min(R.xs[i], R.xs[i + 1]) / CS) - 1; cx <= Math.floor(Math.max(R.xs[i], R.xs[i + 1]) / CS) + 1; cx++) for (let cz = Math.floor(Math.min(R.zs[i], R.zs[i + 1]) / CS) - 1; cz <= Math.floor(Math.max(R.zs[i], R.zs[i + 1]) / CS) + 1; cz++) { const key = cx * 65536 + cz; (g.get(key) || g.set(key, []).get(key)).push(i); }
    return (x, z, maxD) => {
      let best = null;
      for (const i of g.get(Math.floor(x / CS) * 65536 + Math.floor(z / CS)) || []) {
        const dx = R.xs[i + 1] - R.xs[i], dz = R.zs[i + 1] - R.zs[i], l2 = dx * dx + dz * dz || 1e-9; let u = ((x - R.xs[i]) * dx + (z - R.zs[i]) * dz) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
        const d = hyp(R.xs[i] + dx * u - x, R.zs[i] + dz * u - z); if (d > maxD || (best && d >= best.d)) continue;
        const l = Math.sqrt(l2); best = { s: R.cum[i] + l * u, d, tx: dx / l, tz: dz / l };
      }
      return best;
    };
  };
  const lanesById = new Map(); for (const l of st.lanes || []) (lanesById.get(l.id) || lanesById.set(l.id, []).get(l.id)).push(l);
  const sigLines = [];
  for (const sl of st.stopLines || []) {
    if (!sl.signal) continue;
    let best = null, bd = 6;                                           // (a lane id may occur twice: the lane that really ends / passes at the line)
    for (const l of lanesById.get(sl.lane) || []) { let acc = 0; for (let i = 0; i + 1 < l.pts.length; i++) { const a = l.pts[i], b = l.pts[i + 1], sl2 = hyp(b[0] - a[0], b[1] - a[1]); if (acc + sl2 >= sl.s - 0.5 || i + 2 === l.pts.length) { const u = Math.max(0, Math.min(1, (sl.s - acc) / (sl2 || 1))), d = hyp(a[0] + (b[0] - a[0]) * u - sl.x, a[1] + (b[1] - a[1]) * u - sl.z); if (d < bd) { bd = d; best = [(b[0] - a[0]) / (sl2 || 1), (b[1] - a[1]) / (sl2 || 1)]; } break; } acc += sl2; } }
    if (best) sigLines.push({ x: sl.x, z: sl.z, tx: best[0], tz: best[1], signal: sl.signal, approach: sl.approach });
  }
  const routes = [];
  let li = 0;
  for (const line of opts.lines || TRAM_LINES) {
    li++;
    for (const way of ['a', 'b']) {
      const from = way === 'a' ? line.b : line.a, to = way === 'a' ? line.a : line.b;      // way 'a' runs TOWARDS terminal a
      const pts = path(from, to);
      if (!pts || pts.length < 3) { stats.missing.push(line.refs.join('/') + way + ': ' + path.why); continue; }
      const R = mk(pts), proj = projector(R);
      // stops (the same stop position is never taken twice; two positions closer than 35 m along the route are one stop)
      const stops = [];
      for (const q of opts.stops || []) { const h = proj(q.x, q.z, line.stopTol || 2.6); if (h && h.s > 12 && h.s < R.len - 12) stops.push({ s: h.s, name: q.name || '', id: `${Math.round(q.x)},${Math.round(q.z)}`, d: h.d }); }
      stops.sort((p, q) => p.s - q.s); for (let i = stops.length - 1; i > 0; i--) if (stops[i].s - stops[i - 1].s < 35) stops.splice(i, 1);
      // the two platforms of one stop (one per track of a double line, mapped up to ~200 m apart along the route) are ONE stop: the one nearer to this route's rails stays
      for (let i = stops.length - 1; i > 0; i--) if (stops[i].name && stops[i].name === stops[i - 1].name && stops[i].s - stops[i - 1].s < 220) stops.splice(stops[i].d < stops[i - 1].d ? i - 1 : i, 1);
      // lights: per signal the FIRST stop line the tram meets (the entry line of the junction: its approach is the tram's phase), of lanes that run the tram's way within 12 m of the rails;
      // of two lights of different signals closer than 8 m along the route the one beside the rails stays (the other belongs to the carriageway of another junction node)
      const bySig = new Map();
      for (const q of sigLines) { const h = proj(q.x, q.z, 12); if (!h || h.tx * q.tx + h.tz * q.tz < 0.85 || h.s < 6 || h.s > R.len - 6) continue; const o = bySig.get(q.signal); if (!o || h.s < o.s) bySig.set(q.signal, { s: h.s, d: h.d, signal: q.signal, approach: q.approach }); }
      const lights = [...bySig.values()].sort((p, q) => p.s - q.s);
      for (let i = lights.length - 1; i > 0; i--) if (lights[i].s - lights[i - 1].s < 8) lights.splice(lights[i].d < lights[i - 1].d ? i - 1 : i, 1);
      // speed profile per vertex
      const vlim = new Float64Array(R.n).fill(V_MAX);
      for (let i = 1; i + 1 < R.n; i++) {
        const ax = R.xs[i] - R.xs[i - 1], az = R.zs[i] - R.zs[i - 1], bx = R.xs[i + 1] - R.xs[i], bz = R.zs[i + 1] - R.zs[i], la = hyp(ax, az), lb = hyp(bx, bz);
        const th = Math.abs(Math.atan2(ax * bz - az * bx, ax * bx + az * bz)); if (th < 0.012) continue;
        vlim[i] = Math.max(V_MIN, Math.min(V_MAX, Math.sqrt(LAT * Math.max((la + lb) / 2, 2) / th)));      // radius ~ chord / angle
      }
      for (let i = R.n - 2; i >= 0; i--) vlim[i] = Math.min(vlim[i], Math.sqrt(vlim[i + 1] ** 2 + 2 * B_SERVICE * (R.cum[i + 1] - R.cum[i])));
      for (let i = 1; i < R.n; i++) vlim[i] = Math.min(vlim[i], Math.sqrt(vlim[i - 1] ** 2 + 2 * A_MAX * 1.6 * (R.cum[i] - R.cum[i - 1])));
      routes.push({ id: 'TR' + li + ':' + line.refs.join('-') + way, refs: line.refs, way, headway: line.headway || 150, pts, len: R.len, stops, lights, vlim, boards: line.refs.map((n) => ROUTE_BY_REF.get('R' + n + way)).filter((i) => i !== undefined) });
    }
  }
  stats.routes = routes.length; stats.km = +stats.km.toFixed(1); stats.ms = Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - t0);
  stats.routeKm = +(routes.reduce((a, r) => a + r.len, 0) / 1000).toFixed(1);
  // onRails(x, z, tx, tz, maxD): a tram route runs through (x, z) in the direction (tx, tz) (sim.js: the car lanes that lie on the rails are tram lanes)
  const rgrid = new Map(), rsegs = [];
  for (const r of routes) for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1], l = hyp(b[0] - a[0], b[1] - a[1]); if (l < 0.05) continue; const k = rsegs.push([a[0], a[1], b[0], b[1], (b[0] - a[0]) / l, (b[1] - a[1]) / l, l]) - 1; for (let cx = Math.floor(Math.min(a[0], b[0]) / CS); cx <= Math.floor(Math.max(a[0], b[0]) / CS); cx++) for (let cz = Math.floor(Math.min(a[1], b[1]) / CS); cz <= Math.floor(Math.max(a[1], b[1]) / CS); cz++) { const key = cx * 65536 + cz; (rgrid.get(key) || rgrid.set(key, []).get(key)).push(k); } }
  const onRails = (x, z, tx, tz, maxD = 1.1) => {
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) for (const k of rgrid.get(i * 65536 + j) || []) {
      const s = rsegs[k]; if (s[4] * tx + s[5] * tz < 0.9) continue;
      const u = Math.max(0, Math.min(s[6], (x - s[0]) * s[4] + (z - s[1]) * s[5])); if (hyp(s[0] + s[4] * u - x, s[1] + s[5] * u - z) < maxD) return true;
    }
    return false;
  };
  return { routes, stats, onRails };
}

/**
 * the tram simulation on the routes of a net. env = { vehicles (sim.vehicles), mkSeg(kind, id, pts), place(v), signalState(sig, ap, t), DT, remove(v), eachNear(x, z, r, fn) }
 * -> { segs, reset(time), step(time), count() }
 */
export function createTrams(net, env) {
  const A = ARCH.tram, DT = env.DT;
  const segs = net.routes.map((r) => {
    const s = env.mkSeg('rail', r.id, r.pts);
    s.route = r; s.rank = 0; s.lane = { id: r.id, name: 'трамвай ' + r.refs.join(' / '), road: null, rank: 0 }; s.timer = 0; s.k = 0;
    return s;
  });
  let rnd = mulberry(0x51d7a3), nextId = -1, n = 0, pushes = 0, retired = 0;
  const vAt = (seg, s) => {                                           // the speed profile at arclength s
    const { cum, n: N } = seg, vl = seg.route.vlim; let lo = 0, hi = N - 1;
    if (s <= 0) return vl[0]; if (s >= seg.len) return vl[N - 1];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const f = (s - cum[lo]) / (cum[hi] - cum[lo] || 1e-9); return vl[lo] + (vl[hi] - vl[lo]) * f;
  };
  const mkTram = (seg, s, v) => {
    const r = seg.route, board = r.boards.length ? r.boards[seg.k++ % r.boards.length] : null;
    const veh = {
      id: nextId--, tram: true, born: 0, die: Infinity, kind: 'tram', arch: A, len: A.len, wid: A.wid, wb: A.wb, fo: A.front - A.wb / 2, bus: true, trolley: false, seg, s, v, vf: 0.92 + rnd() * 0.12,
      next: null, trail: [], x: 0, z: 0, rot: 0, px: 0, pz: 0, prot: 0, x2: 0, z2: 0, rot2: 0, px2: 0, pz2: 0, prot2: 0, acc: 0, brake: false, wait: 0, dwell: 0, served: new Set(), door: 0, at: null, holding: false,
      color: '#b52a2a', taxi: false, police: false, amb: false, plate: 0, seat: 0, pax: false, route: board, cgOn: false, cgGap: 0, cgVl: 0, sn: 0, cs: 1, why: '', passL: -1, sigS: -1e9,
    };
    let i = seg.veh.length; while (i > 0 && seg.veh[i - 1].s > s) i--; seg.veh.splice(i, 0, veh);
    env.place(veh); env.vehicles.push(veh); n++;
    return veh;
  };
  function reset(time) {
    rnd = mulberry(0x51d7a3); nextId = -1; n = 0; pushes = 0; retired = 0;
    for (const seg of segs) {
      seg.veh.length = 0; seg.k = Math.floor(rnd() * 4);
      const gap = seg.route.headway * 6.2;                              // (a tram covers ~6.2 m/s with its stops and lights)
      for (let s = seg.len - rnd() * gap; s > A.len + 4; s -= gap * (0.75 + rnd() * 0.5)) mkTram(seg, s, vAt(seg, s) * 0.6);
      seg.timer = time + rnd() * seg.route.headway;
    }
  }
  /** point + tangent of a rail segment at arclength s (clamped) -> _q */
  const _q = { x: 0, z: 0, tx: 0, tz: 1 };
  const at = (seg, s) => {
    const { xs, zs, cum, n: N } = seg; let lo = 0, hi = N - 1;
    if (s <= 0) hi = 1; else if (s >= seg.len) lo = N - 2; else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const dx = xs[lo + 1] - xs[lo], dz = zs[lo + 1] - zs[lo], l = cum[lo + 1] - cum[lo] || 1e-9, f = Math.max(0, Math.min(1, (s - cum[lo]) / l));
    _q.x = xs[lo] + dx * f; _q.z = zs[lo] + dz * f; _q.tx = dx / l; _q.tz = dz / l; return _q;
  };
  /** the nearest vehicle in the gauge of the rails ahead of tram v: -> gap (m along the rails; Infinity when the way is free), _obsV = its speed along the rails */
  let _obsV = 0;
  const GAUGE = 1.35;
  const ahead = (v) => {
    const seg = v.seg, look = Math.min(60, v.v * v.v / (2 * B_SERVICE) + 9);
    for (let d = 1.0; d <= look; d += 2.5) {
      const p = at(seg, v.s + d), px = p.x, pz = p.z, tx = p.tx, tz = p.tz;
      let hit = false, hv = 0;
      env.eachNear(px, pz, 9, (u) => {
        if (!u || u === v || u.seg === seg) return;
        const ua = u.arch, fx = Math.sin(u.rot), fz = Math.cos(u.rot), mid = (ua.front + ua.rear) / 2, dx = px - (u.x + fx * mid), dz = pz - (u.z + fz * mid);
        const lz = Math.abs(dx * fx + dz * fz) - (ua.front - ua.rear) / 2, lx = Math.abs(dx * fz - dz * fx) - u.wid / 2;
        if (Math.hypot(Math.max(0, lx), Math.max(0, lz)) > GAUGE) return;
        const du = fx * tx + fz * tz;
        if (u.tram && du < -0.5) return;                                                     // a tram on the other track (the two rails of a bridge are mapped closer than two car bodies)
        if (du > 0.35) { hit = true; hv = Math.max(hv, u.v * du); v.obs = u; }               // runs the tram's way: follow it
        else if (u.v < 0.4 || d < 7) { hit = true; v.obs = u; }                              // stands on the rails, or crosses right in front
      });
      if (hit) { _obsV = hv; return Math.max(0.05, d - 1.2); }
    }
    return Infinity;
  };
  const idm = (v, v0, gap, vl, s0) => { const dv = v.v - vl, sStar = s0 + Math.max(0, v.v * 1.4 + v.v * dv / (2 * Math.sqrt(A_MAX * B_SERVICE))), r = sStar / Math.max(gap, 0.05); return A_MAX * (1 - Math.pow(v.v / Math.max(v0, 0.5), 4) - r * r); };
  function step(time) {
    for (const seg of segs) {
      const arr = seg.veh, r = seg.route;
      if (time >= seg.timer) {                                         // a new car leaves the terminal when the track is free
        const first = arr[0];
        if (!first || first.s - first.len > A.len + 25) { mkTram(seg, A.len + 0.5, Math.min(vAt(seg, A.len), 5)); seg.timer = time + r.headway * (0.8 + rnd() * 0.4); } else seg.timer = time + 5;
      }
      for (let i = arr.length - 1; i >= 0; i--) {
        const v = arr[i], front = v.s;
        const v0 = Math.min(vAt(seg, front), vAt(seg, front - v.len)) * v.vf;
        let acc = A_MAX * (1 - Math.pow(v.v / Math.max(v0, 0.5), 4)), holding = false, why = '';
        if (i + 1 < arr.length) { const u = arr[i + 1], a = idm(v, v0, u.s - u.len - front, u.v, 3.0); if (a < acc) { acc = a; why = 'lead'; } }
        // the gauge ahead. PATIENCE: a tram held for 30 s by a standing car (a queue across the rails that waits, in its turn, for the tram's own body: a ring) rolls on at walking pace for
        // 14 s whatever stands there; the cars see the tram and stay where they are. Rare (the tram lanes keep the cars off the rails), but without it such a ring never opens.
        if (v.push > 0) { v.push -= DT; v.cgOn = false; const a = A_MAX * (1 - Math.pow(v.v / 2.2, 4)); if (a < acc) { acc = a; why = 'push'; } }
        else {
          const g = env.eachNear ? ahead(v) : Infinity; v.cgOn = g < Infinity; v.cgGap = g;
          if (g < Infinity) {
            const a = idm(v, v0, g, _obsV, 1.6); if (a < acc) { acc = a; why = 'col'; }
            if (v.v < 0.3 && _obsV < 0.4 && v.obs && !v.obs.tram) {
              v.blockT = (v.blockT || 0) + DT;
              // (a car that nobody can see ends its trip there instead: env.hidden is the camera test of traffic.js; only a car in view is rolled through)
              if (v.blockT > 30) { v.blockT = 0; if (env.hidden && env.hidden(v.obs.x, v.obs.z) && env.vehicles.includes(v.obs)) { env.remove(v.obs); v.obs = null; retired++; } else { v.push = 14; pushes++; } }
            }
          } else v.blockT = 0;
        }
        // lights: red = stop; amber = stop when the service brake still does it; a light passed on green frees the lights of the same junction cluster (45 m)
        for (const q of r.lights) {
          const d = q.s - front; if (d < -0.4) continue; if (d > 140) break;
          if (q.s - v.sigS < 45 && q.s > v.sigS) continue;
          const stt = env.signalState(q.signal, q.approach, time);
          if (stt === 'red' || (stt === 'amber' && d > v.v * v.v / (2 * 1.6) + 1.2)) { const a = idm(v, v0, Math.max(0.05, d - 1.0), 0, 1.0); if (a < acc) { acc = a; why = 'light'; } if (d < 4 && v.v < 0.8) holding = true; break; }
          if (d < 0.6) v.sigS = q.s;
        }
        // stops: the middle of the car at the stop position
        if (v.dwell > 0) { acc = -3; holding = true; why = 'stop'; }
        else for (const q of r.stops) {
          if (v.served.has(q.id)) continue;
          const d = q.s + v.len / 2 - front; if (d < -3) continue; if (d > 120) break;
          if (d < 1.0 && v.v < 0.35) { v.dwell = 14 + rnd() * 8; v.at = q; acc = -3; holding = true; why = 'stop'; }
          else { const a = idm(v, v0, Math.max(0.05, d), 0, 0.3); if (a < acc) { acc = a; why = 'stop'; } }
          break;
        }
        if (v.dwell > 0) { v.dwell -= DT; v.door = Math.min(1, v.door + DT / 1.2); if (v.dwell <= 0 && v.at) { v.served.add(v.at.id); v.at = null; } } else v.door = Math.max(0, v.door - DT / 1.2);
        acc = Math.max(-B_EMERGENCY, acc);
        v.acc = acc; v.why = why; v.holding = holding;
        v.v = Math.max(0, v.v + acc * DT); if (v.dwell > 0) v.v = 0;
        v.s += v.v * DT;
        v.brake = acc < -0.6 || v.dwell > 0 || (v.v < 0.25 && holding);
        if (v.v < 0.25) v.wait += DT; else if (v.v > 1) v.wait = 0;
        if (v.s > seg.len + v.len + 2) { env.remove(v); n--; }             // out of the data at the far terminal
      }
    }
  }
  return { segs, reset, step, count: () => n, pushes: () => pushes, retired: () => retired };
}
