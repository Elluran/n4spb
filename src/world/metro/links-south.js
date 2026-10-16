// metro/links-south.js — the REAL running tunnels of the Sennaya hub (docs/research/metro-south-sennaya.md section 7; polylines = the OSM railway=subway ways of data/city.js SUBWAY):
//   L2  Nevsky Prospekt (-z end) <-> Sennaya Ploshchad (+z end)   ~1.0 km: the southbound track w586074328 / w586074324 / w586074315 (under Sadovaya street)
//   L5  Admiralteyskaya (+z end) <-> Sadovaya (-z end)            ~1.2 km: the southbound track w193020446 (under the Moika)
//   L4  Spasskaya (+z end) <-> Dostoevskaya (-z end)              ~1.8 km: the eastbound track w321074201 (under the Fontanka)
//   L4  Gorny Institut (+z end) <-> Spasskaya (-z end)            ~3.6 km, FULL: w506098432 + w1086504196 (the tunnel passes the unopened Teatralnaya without a stop). It replaces the partial
//       link of links-vo.js: GORNY_SPASSKAYA_FULL = true asks metro.js to skip that one (buildVoLinks without `gorny`) and to treat 'gorny:1' as done (the deferred Gorny stubs are not built).
// Two single-track tubes per link as in links-vo.js (track 1 = the OSM polyline of the direction A -> B, track 2 = track 1 shifted to the left by the track separation, tapering to 7 m), handed to the
// ride as env.real['a>b'] = { path, length, lamp }. Differences from links-vo.js buildRealLink:
//   * the depth profile is linear with a sag of 4 m only where the tube passes under WATER (ctx.L.waterwayAt sampled along the path, 60 m ramps), flat over the first / last metres that a stub covers;
//   * an end whose hall already has a STUB (stubs.js registry: Nevsky -z 3.5 + 40 m, Admiralteyskaya +z and Dostoevskaya -z 70 + 40 m; their builders do not defer them) keeps it: the tubes are
//     straight along the hall axis over the stub (2/3 of a lead of max(100, 1.5 x stub + 15) m) and are drawn only beyond it, the stub's own disc stays the timetable disc of that end (the ride hides it,
//     metro.js discLeg); the other ends get a black disc 70 m from the mouth (stubs.js registerDisc, kind 'real').
import * as THREE from 'three';
import { smoothPath, bezierPath, minRadius } from './lib.js';
import { buildLongTunnel } from './tunnel.js';
import * as STUBS from './stubs.js';
import { FRAMES, toWorld, toLocal } from '../data/metro.js';

export const GORNY_SPASSKAYA_FULL = true;
const LAMPS = 18, SAG = 4.0;
const clamp01 = (v) => Math.max(0, Math.min(1, v)), pmod = (a, m) => ((a % m) + m) % m;
const cumOf = (p) => { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][2] - p[i - 1][2])); return c; };
const lenOf = (p) => cumOf(p)[p.length - 1];
/** the part of a polyline [[x, y, z]] between arc lengths s0 and s1 (end points interpolated) */
function cut(path, s0, s1) {
  const c = cumOf(path), out = [], at = (s) => { let i = 1; while (i < path.length - 1 && c[i] < s) i++; const a = path[i - 1], b = path[i], f = clamp01((s - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1])); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
  out.push(at(s0)); for (let i = 0; i < path.length; i++) if (c[i] > s0 + 0.3 && c[i] < s1 - 0.3) out.push(path[i]); out.push(at(s1));
  return out;
}
const pointAt = (path, s) => { const c = cumOf(path); let i = 1; while (i < path.length - 1 && c[i] < s) i++; const a = path[i - 1], b = path[i], f = clamp01((s - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1])); return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], hx: b[0] - a[0], hz: b[2] - a[2] }; };

/** the stub (stubs.js) that a station builder already built at the end of track x (local) of the hall `frame` (mouth at local |z| = mouth, out = +1 / -1): { vis, ext, disc } or null */
function stubAt(ctx, M, X, frame, x, mouth, out) {
  const discs = STUBS.DISCS || X.discs || [];
  for (const d of discs) {
    const u = d.userData && d.userData.disc; if (!u || u.kind !== 'stub' || !u.c) continue;
    const [lx, lz] = toLocal(frame, u.c[0], u.c[2]);
    if (Math.abs(lx - x) < 0.6 && lz * out > mouth) { const vis = u.vis ?? Math.abs(lz) - mouth; return { vis, ext: u.ext ?? (STUBS.STUB_EXT ?? 40), disc: d }; }
  }
  // (an older stubs.js without the registry: look for the black disc meshes of the stub in the scene)
  let found = null;
  if (!STUBS.DISCS) ctx.staticRoot.traverse((o) => { if (found || !o.isMesh || o.material !== M.discBlack || !o.geometry || o.geometry.type !== 'CircleGeometry') return; const v = new THREE.Vector3(); o.getWorldPosition(v); const [lx, lz] = toLocal(frame, v.x, v.z); if (Math.abs(lx - x) < 0.6 && lz * out > mouth && Math.abs(lz) - mouth < 80) found = { vis: Math.abs(lz) - mouth, ext: 40, disc: o }; });
  return found;
}

/**
 * spec: { id, key1, key2, mid: [[x, z], ...] (the OSM polyline of track 1 between the halls), A / B: { p1: [x, z] mouth of track 1, h: [hx, hz] heading of track 1 (A -> B) at that mouth, sep (track
 * separation at the hall), y (rail foot of both tracks at the hall), stub: { vis, ext } | null }, sepMid (7), rideOnly: [[s0, s1], ...] (track-1 metres shown only while a ride runs) }
 */
function southLink(ctx, M, X, spec) {
  const A = spec.A, B = spec.B, sepMid = spec.sepMid ?? 7.0;
  const skA = A.stub ? A.stub.vis + A.stub.ext : 0, skB = B.stub ? B.stub.vis + B.stub.ext : 0, leadA = Math.max(100, skA * 1.5 + 15), leadB = Math.max(100, skB * 1.5 + 15);
  const along = (E, p) => (p[0] - E.p1[0]) * E.h[0] + (p[1] - E.p1[1]) * E.h[1], hand = (E, L) => [E.p1[0] + E.h[0] * L, E.p1[1] + E.h[1] * L];
  // the path: the straight leads along the hall axes (exactly straight over a stub), the OSM polyline between them (points more than lead + 150 m from both mouths), joined by cubic
  // Bezier curves with long handles (a hall whose axis does not follow the OSM route, the axial Dostoevskaya, gets a wide smooth loop instead of a sharp vertex), then relaxed ([1 2 1] / 4):
  // no vertex of the 12 m polyline turns sharply (the ride heading changes < 1.5 deg per 1/60 s frame)
  const dist = (E, p) => Math.hypot(p[0] - E.p1[0], p[1] - E.p1[1]), unit = (x, z) => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };
  let mid = spec.mid.filter((p) => along(A, p) > leadA && dist(A, p) > leadA + 150 && dist(B, p) > leadB + 150);
  const straight = (P, h, L0, L1) => { const k = Math.max(1, Math.ceil((L1 - L0) / 12)), o = []; for (let i = 0; i <= k; i++) { const t = L0 + (L1 - L0) * i / k; o.push([P[0] + h[0] * t, P[1] + h[1] * t]); } return o; };
  const bez = (P, tP, Q, tQ) => { const D = Math.hypot(Q[0] - P[0], Q[1] - P[1]); return bezierPath(P, tP, Q, tQ, 0.42 * D, 0.42 * D, 12); };
  const aEnd = hand(A, leadA), bStart = hand(B, -leadB);
  // an OSM point whose join to a lead would curve on a radius under 60 m is dropped (the join then starts farther out): the ride turns smoothly
  const tan0 = () => (mid.length >= 2 ? unit(mid[1][0] - mid[0][0], mid[1][1] - mid[0][1]) : unit(bStart[0] - aEnd[0], bStart[1] - aEnd[1])), tan1 = () => (mid.length >= 2 ? unit(mid[mid.length - 1][0] - mid[mid.length - 2][0], mid[mid.length - 1][1] - mid[mid.length - 2][1]) : unit(bStart[0] - aEnd[0], bStart[1] - aEnd[1]));
  while (mid.length && minRadius(bez(aEnd, A.h, mid[0], tan0())) < 60) mid.shift();
  while (mid.length && minRadius(bez(mid[mid.length - 1], tan1(), bStart, B.h)) < 60) mid.pop();
  let body;
  if (mid.length >= 2) { const t0 = unit(mid[1][0] - mid[0][0], mid[1][1] - mid[0][1]), t1 = unit(mid[mid.length - 1][0] - mid[mid.length - 2][0], mid[mid.length - 1][1] - mid[mid.length - 2][1]);
    body = [...bez(aEnd, A.h, mid[0], t0), ...smoothPath(mid, t0, t1, 12).slice(1), ...bez(mid[mid.length - 1], t1, bStart, B.h).slice(1)]; }
  else if (mid.length === 1) { const t = unit(bStart[0] - aEnd[0], bStart[1] - aEnd[1]); body = [...bez(aEnd, A.h, mid[0], t), ...bez(mid[0], t, bStart, B.h).slice(1)]; }
  else body = bez(aEnd, A.h, bStart, B.h);
  const relax = (P, lo, hi, passes = 12) => { const c = [0]; for (let i = 1; i < P.length; i++) c.push(c[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); for (let q = 0; q < passes; q++) { const Q = P.map((p) => p.slice()); for (let i = 1; i < P.length - 1; i++) if (c[i] > lo && c[i] < c[c.length - 1] - hi) { Q[i][0] = 0.25 * P[i - 1][0] + 0.5 * P[i][0] + 0.25 * P[i + 1][0]; Q[i][1] = 0.25 * P[i - 1][1] + 0.5 * P[i][1] + 0.25 * P[i + 1][1]; } P = Q; } return P; };
  const raw = [...straight(A.p1, A.h, 0, leadA), ...body.slice(1, -1), ...straight(B.p1, B.h, -leadB, 0)].filter((p, i, a) => i === 0 || i === a.length - 1 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 4);      // (bezierPath may repeat its end point)
  const rA = Math.max(skA, 80) + 6, rB = Math.max(skB, 80) + 6;                                        // relaxed beyond the stub / the platform trains' 70 m straight: the joins of the leads too
  const pts = relax(raw, rA, rB), n = pts.length, cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[n - 1], stA = leadA, stB = leadB;
  // the depth profile: flat over the stubs, linear between, a sag of SAG m under the water (60 m ramps)
  const wet = [], L_ = ctx.L || {}; let w0 = null;
  for (let s = 0; s <= L; s += 6) { let i = 1; while (i < n - 1 && cum[i] < s) i++; const f = clamp01((s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])), x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, z = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f;
    const w = !!(L_.waterwayAt && L_.waterwayAt(x, z)); if (w && w0 === null) w0 = s; if (!w && w0 !== null) { wet.push([w0, s]); w0 = null; } }
  if (w0 !== null) wet.push([w0, L]);
  const fA = skA + 5, fB = skB + 5, ramp = 60;
  const sagAt = (s) => { let v = 0; for (const [a, b] of wet) { const d = s < a ? a - s : s > b ? s - b : 0; v = Math.max(v, d >= ramp ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d / ramp)); } return SAG * v * clamp01((s - fA) / 40) * clamp01((L - fB - s) / 40); };
  const yOf = (yA, yB, s) => (s <= fA ? yA : s >= L - fB ? yB : yA + (yB - yA) * (s - fA) / Math.max(1, L - fA - fB)) - sagAt(s);
  const sm = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };                                  // smoothstep taper: no kink of track 2 where the taper starts / ends
  const sepOf = (s) => sepMid + (A.sep - sepMid) * sm(1 - (s - stA) / 150) + (B.sep - sepMid) * sm(1 - (L - stB - s) / 150);
  const tan = (i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  const path1 = pts.map((p, i) => [p[0], yOf(A.y, B.y, cum[i]), p[1]]);
  const off2 = relax(pts.map((p, i) => { const t = tan(i), sp = sepOf(cum[i]); return [p[0] + t[1] * sp, p[1] - t[0] * sp]; }), rA, rB, 8);
  const path2 = off2.map((p, i) => [p[0], yOf(A.y, B.y, cum[i]), p[1]]);          // the left of the heading (hx, hz) is (hz, -hx)
  const grp = new THREE.Group(); grp.name = 'real-link-' + spec.id; grp.userData.undergroundOnly = true; grp.userData.zone = 'tunnel-' + spec.id; ctx.addStatic(grp);
  // the tubes: drawn beyond the stubs; ride-only parts (EXT_GROUPS: shown while a ride runs) where they would pierce another structure
  const ro = (spec.rideOnly || []).slice().sort((a, b) => a[0] - b[0]);
  const addTube = (path) => {
    const Lp = lenOf(path), s0 = skA, s1 = Lp - skB, parts = []; let s = s0;
    for (const [a, b] of ro) { const ra = Math.max(s, a), rb = Math.min(s1, b); if (rb <= ra) continue; if (ra > s) parts.push([s, ra, false]); parts.push([ra, rb, true]); s = rb; }
    if (s1 > s) parts.push([s, s1, false]);
    for (const [a, b, ride] of parts) {
      if (b - a < 1) continue; let g = grp;
      if (ride) { g = new THREE.Group(); g.visible = false; ctx.noBatch(g); grp.add(g); STUBS.EXT_GROUPS.push(g); }
      buildLongTunnel(ctx, M, g, cut(path, a, b), { lamps: LAMPS, s0: a });
    }
  };
  addTube(path1); addTube(path2);
  X.debug.tubes.push(path1, path2);
  // black discs 70 m from the mouths of the ends without a stub (the platform trains come out of / vanish into them)
  const disc = (path, s, faceA) => {
    const Lp = lenOf(path), sAt = s < 0 ? Lp + s : s, q = pointAt(path, sAt);
    const d = new THREE.Mesh(new THREE.CircleGeometry(2.78, 28), M.discBlack); d.position.set(q.p[0], q.p[1] + 2.0, q.p[2]); d.rotation.y = faceA ? Math.atan2(-q.hx, -q.hz) : Math.atan2(q.hx, q.hz); grp.add(d);
    if (STUBS.registerDisc) STUBS.registerDisc(ctx, d, { kind: 'real', link: spec.id, s: sAt }); else if (X.discs) X.discs.push(d);
  };
  const VIS = STUBS.STUB_VISIBLE ?? 70;
  if (!A.stub) for (const p of [path1, path2]) disc(p, VIS, true);
  if (!B.stub) for (const p of [path1, path2]) disc(p, -VIS, false);
  const L1 = lenOf(path1), L2 = lenOf(path2), out = {};
  out[spec.key1] = { path: path1, length: L1, lamp: { step: LAMPS, at0: LAMPS / 2 } };
  out[spec.key2] = { path: path2.slice().reverse(), length: L2, lamp: { step: LAMPS, at0: pmod(L2 - LAMPS / 2, LAMPS) } };
  return { links: out, L, wet, group: grp, path1, path2, skip: [skA, skB] };
}

// ---------------------------------------------------------------- the OSM polylines of track 1 (A -> B) between the halls (the hall ends are dropped by southLink: lead + 30 m)
const L2_MID = [[-1271, -252], [-1280, -219], [-1312, -87], [-1326, -38], [-1345, 16], [-1370, 75], [-1383, 101], [-1399, 128], [-1413, 149], [-1430, 171], [-1494, 242], [-1578, 310], [-1608, 337], [-1626, 356], [-1641, 375], [-1687, 452], [-1699, 478], [-1712, 505], [-1726, 551]];
const L5_MID = [[-1966, -340], [-1934, -321], [-1906, -300], [-1883, -280], [-1862, -259], [-1842, -235], [-1823, -210], [-1807, -185], [-1793, -159], [-1779, -127], [-1750, -41], [-1741, -7], [-1737, 39], [-1775, 407]];
const L4E_MID = [[-1799, 809], [-1764, 846], [-1727, 880], [-1699, 904], [-1657, 929], [-1610, 954], [-1578, 964], [-1530, 973], [-1452, 980], [-1365, 982], [-1295, 977], [-1260, 969], [-1219, 957], [-1171, 936], [-1137, 915], [-1102, 884], [-1037, 807], [-991, 763], [-925, 710], [-865, 668], [-830, 647], [-795, 628], [-752, 612], [-716, 603], [-664, 596], [-628, 595], [-589, 597], [-463, 612], [-425, 618]];
const L4W_MID = [[-4357, 698], [-4245, 808], [-4109, 896], [-3817, 953], [-3641, 916], [-3336, 786], [-3165, 713], [-2901, 532], [-2614, 353], [-2422, 337], [-2346, 341], [-2282, 354], [-2207, 379], [-2136, 416], [-2072, 463], [-2022, 514], [-1990, 554]];

/**
 * Builds the four links between the stations that exist (X.stations: nevsky, admiralteyskaya, dostoevskaya, gorny + the hub `st`: { sennaya, sadovaya, spasskaya }) and returns
 * { links: { 'a>b': { path, length, lamp } }, done: Set of 'station:end' keys that have a real tunnel now, info }. A failed link is logged; its ends keep / get their stubs.
 */
export function buildSouthLinks(ctx, M, X, st) {
  const links = {}, done = new Set(), info = {}, R = X.stations || {};
  const say = (e, what) => { console.error('[metro] real link ' + what + ' failed', e); (ctx.errors ||= []).push(e); };
  const fwd = (f) => [Math.sin(f.yaw), Math.cos(f.yaw)], back = (f) => [-Math.sin(f.yaw), -Math.cos(f.yaw)];
  const end = (rt, x, zs, h) => ({ p1: toWorld(rt.frame, x, zs * rt.hall.mouth), h, sep: 2 * rt.hall.TRK, y: rt.hall.FY - 1.1, stub: stubAt(ctx, M, X, rt.frame, x, rt.hall.mouth, zs) });
  const run = (key, what, mk, ends) => { try { const r = southLink(ctx, M, X, mk()); Object.assign(links, r.links); for (const e of ends) done.add(e); info[key] = { L: Math.round(r.L), wet: r.wet.map((w) => w.map(Math.round)), skip: r.skip }; } catch (e) { say(e, what); } };
  // L2 Nevsky Prospekt (-z end, track N at +TRK) -> Sennaya (+z end, track N): southbound
  if (R.nevsky && st.sennaya) { const nv = R.nevsky, sn = st.sennaya.rt;
    run('l2', 'L2 Nevsky Prospekt - Sennaya', () => ({ id: 'l2-nevsky-sennaya', key1: 'nevsky>sennaya', key2: 'sennaya>nevsky', mid: L2_MID, A: end(nv, nv.hall.TRK, -1, back(nv.frame)), B: end(sn, sn.hall.TRK, 1, back(sn.frame)) }), ['nevsky:-1', 'sennaya:1']); }
  // L5 Admiralteyskaya (+z end, track S at -TRK) -> Sadovaya (-z end, track S): southbound
  if (R.admiralteyskaya && st.sadovaya) { const ad = R.admiralteyskaya, sd = st.sadovaya.rt;
    run('l5', 'L5 Admiralteyskaya - Sadovaya', () => ({ id: 'l5-adm-sadovaya', key1: 'admiralteyskaya>sadovaya', key2: 'sadovaya>admiralteyskaya', mid: L5_MID, A: end(ad, -ad.hall.TRK, 1, fwd(ad.frame)), B: end(sd, -sd.hall.TRK, -1, fwd(sd.frame)) }), ['admiralteyskaya:1', 'sadovaya:-1']); }
  // L4 Spasskaya (+z end, track S) -> Dostoevskaya (-z end, track S): eastbound
  if (st.spasskaya && R.dostoevskaya) { const ss = st.spasskaya.rt, dt = R.dostoevskaya;
    run('l4e', 'L4 Spasskaya - Dostoevskaya', () => ({ id: 'l4-spas-dost', key1: 'spasskaya>dostoevskaya', key2: 'dostoevskaya>spasskaya', mid: L4E_MID, A: end(ss, -ss.hall.TRK, 1, fwd(ss.frame)), B: end(dt, -dt.hall.TRK, -1, fwd(dt.frame)) }), ['spasskaya:1', 'dostoevskaya:-1']); }
  // L4 Gorny Institut (+z end, track S) -> Spasskaya (-z end, track S): eastbound, the full link (the partial one of links-vo.js is skipped by metro.js)
  if (GORNY_SPASSKAYA_FULL && R.gorny && st.spasskaya) { const gn = R.gorny, ss = st.spasskaya.rt;
    run('l4w', 'L4 Gorny Institut - Spasskaya', () => ({ id: 'l4-gorny-spas', key1: 'gorny>spasskaya', key2: 'spasskaya>gorny', mid: L4W_MID, A: end(gn, -gn.hall.TRK, 1, fwd(gn.frame)), B: end(ss, -ss.hall.TRK, -1, fwd(ss.frame)) }), ['gorny:1', 'spasskaya:-1']); }
  X.debug.southLinks = info;
  void FRAMES;
  return { links, done, info };
}
