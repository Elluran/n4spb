// metro/links-vo.js — the REAL running tunnels under Vasilievsky Island (docs/research/vo-roster-metro.md section 2.5; polylines = the OSM `railway=subway` ways):
//   L3  Vasileostrovskaya <-> Gostiny Dvor   3.25 km (w193014326 / w294697648): ESE under the Universitetskaya embankment and the Bolshaya Neva
//   L5  Admiralteyskaya <-> Sportivnaya      2.47 km (w192964810 / w193020446): NW under the Neva and the island, 100-200 m west of the Sredny pr. / 1st liniya corner, under the Malaya Neva
// Two single-track tubes per link (tunnel.js buildLongTunnel) handed to the ride (env.real['a>b'] = { path: [[x, y, z]], length }): a metro ride between two real halls then runs through real geometry.
// Track 1 is the OSM polyline itself (it is the right-hand track of direction 1); track 2 is track 1 shifted to the left by the separation of the two tracks, which tapers from the separation at the
// halls to 7 m in the running tunnel. Both tubes run parallel to the hall axis for the first / last 100 m (the black disc stands 70 m from the mouth: the trains of the platform timetable come out of
// it), then follow the polyline; the depth profile is linear with a sag under the river. A part of a tube that would pierce another structure (the north end of the Nevsky Prospekt hall near the
// west end of Gostiny Dvor) is only shown while a ride is running (EXT_GROUPS), like the tube behind a disc.
//   L4  Gorny Institut -> Spasskaya (PARTIAL, w506098432 / w506098437): the OSM polyline is known to x -2422 only, there is no hall at the far end: the tubes end in a black disc 50 m before the end of
//       the path; the ride (ride.js, `link.partial`) runs through the real tube, vanishes behind the disc and goes on in the generic tunnel to the generic hall of Spasskaya.
import * as THREE from 'three';
import { smoothPath } from './lib.js';
import { buildLongTunnel } from './tunnel.js';
import { EXT_GROUPS, STUB_VISIBLE, registerDisc } from './stubs.js';
import { FRAMES, VO_PZ, GD_PZ, AD_PZ, SP_PZ, toWorld } from '../data/metro.js';
import { GDH } from './hall-gd.js';
import { PYLON } from './hall-pylon.js';

const lenOf = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][2] - p[i - 1][2]); return L; };
const cumOf = (p) => { const c = [0]; for (let i = 1; i < p.length; i++) c.push(c[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][2] - p[i - 1][2])); return c; };
/** the point s m along a polyline (interpolated) and the direction of its segment there */
const pointAt = (p, c, s) => { let i = 1; while (i < p.length - 1 && c[i] < s) i++; const a = p[i - 1], b = p[i], f = Math.max(0, Math.min(1, (s - c[i - 1]) / Math.max(1e-6, c[i] - c[i - 1]))); return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], hx: b[0] - a[0], hz: b[2] - a[2] }; };
const LAMP_STEP = 18;                                                   // default lamp spacing of the long tubes (buildLongTunnel; spec.lamps): lamps at step / 2 + n * step m of each tube in its A -> B order
const pmod = (a, m) => ((a % m) + m) % m;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/**
 * spec: { id, key1, key2, mid: [[x, z], ...] (the OSM polyline of track 1 without the hall ends), A: { p1: [x, z] mouth of track 1, h: [hx, hz] direction of travel A -> B at A, sep, y1, y2 },
 *         B: { p1, h (direction of travel A -> B arriving at B), sep, y1, y2 }, sag, sepMid, rideOnly: 'A' | 'B' | null, rideOnlyLength, discs: { A: bool, B: bool } }
 * y1 / y2 = the bed (rail foot) of track 1 / 2 at that hall. Track 1 runs A -> B (key1), track 2 B -> A (key2).
 * PARTIAL link: B = { free: true, y1, y2 }, `mid` ends at the last point of the polyline, no key2: the far end is a free end (the path stops there, a black disc stands 50 m before it).
 */
export function buildRealLink(ctx, M, X, spec) {
  const LAMPS = spec.lamps ?? LAMP_STEP, free = !!spec.B.free, ax = 100, sag = spec.sag ?? 3.0, sepMid = spec.sepMid ?? 7.0, A = spec.A;
  const B = free ? (() => { const m = spec.mid, p = m[m.length - 1], q = m[m.length - 2], l = Math.hypot(p[0] - q[0], p[1] - q[1]); return { ...spec.B, p1: p, h: [(p[0] - q[0]) / l, (p[1] - q[1]) / l], sep: sepMid }; })() : spec.B;
  // an OSM point inside a straight handle (less than ax + 30 m along the hall axis from a mouth) folds the path back onto itself: L5 had its first point 93.5 m along the Admiralteyskaya axis,
  // 6.5 m before the end of the 100 m handle (a 61 deg kink on track 1 and a cusp on the offset track 2, the yaw steps of the ride): such points are dropped (the handle replaces them)
  const along = (E, p) => (p[0] - E.p1[0]) * E.h[0] + (p[1] - E.p1[1]) * E.h[1];
  const mid = free ? [...spec.mid.slice(0, -1).filter((p) => along(A, p) > ax + 30), spec.mid[spec.mid.length - 1]] : spec.mid.filter((p) => along(A, p) > ax + 30 && -along(B, p) > ax + 30);
  const ctl = free ? [A.p1, [A.p1[0] + A.h[0] * ax, A.p1[1] + A.h[1] * ax], ...mid] : [A.p1, [A.p1[0] + A.h[0] * ax, A.p1[1] + A.h[1] * ax], ...mid, [B.p1[0] - B.h[0] * ax, B.p1[1] - B.h[1] * ax], B.p1];
  const pts = smoothPath(ctl, A.h, B.h, 12), n = pts.length, cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[n - 1];
  const sepOf = (s) => (sepMid + (A.sep - sepMid) * clamp01(1 - (s - ax) / 150)) + (sepMid + (B.sep - sepMid) * clamp01(1 - (L - ax - s) / 150)) - sepMid;
  const tan = (i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  const yOf = (y0, y1, s) => { const f = s / L; return y0 + (y1 - y0) * f - sag * Math.sin(Math.PI * f); };
  const path1 = pts.map((p, i) => [p[0], yOf(A.y1, B.y1, cum[i]), p[1]]);
  const path2 = pts.map((p, i) => { const t = tan(i), sp = sepOf(cum[i]); return [p[0] + t[1] * sp, yOf(A.y2, B.y2, cum[i]), p[1] - t[0] * sp]; });      // the left of the heading (hx, hz) is (hz, -hx)
  const grp = new THREE.Group(); grp.name = 'real-link-' + spec.id; grp.userData.undergroundOnly = true; grp.userData.zone = 'tunnel-' + spec.id; ctx.addStatic(grp);
  const only = spec.rideOnly || null, cut = spec.rideOnlyLength ?? 120;
  // paths are in A -> B order; track 2 is ridden B -> A: built MIRRORED (its lamps on the left of that travel, the contact rail on the outer side, as in the halls and the generic tunnel)
  const addTube = (path, mirror) => {
    if (!only) { buildLongTunnel(ctx, M, grp, path, { lamps: LAMPS, mirror }); return; }
    const split = Math.max(1, only === 'A' ? cum.findIndex((c) => c >= cut) : cum.findIndex((c) => c >= L - cut)), pc = cumOf(path);
    const parts = only === 'A' ? [[0, split, true], [split, n - 1, false]] : [[0, split, false], [split, n - 1, true]];
    for (const [a, b, ride] of parts) {
      const sub = path.slice(a, b + 1); if (sub.length < 2) continue; let g = grp;
      if (ride) { g = new THREE.Group(); g.visible = false; ctx.noBatch(g); grp.add(g); EXT_GROUPS.push(g); }
      buildLongTunnel(ctx, M, g, sub, { lamps: LAMPS, s0: pc[a], mirror });                             // s0: the lamps / textures continue across the split
    }
  };
  addTube(path1, false); addTube(path2, true);
  X.debug.tubes.push(path1, path2);
  // black discs exactly 70 m along each tube from a mouth (the platform trains come out of / vanish into them): faceA = the disc faces the A end. All of them are registered (stubs.js
  // registerDisc: not batched, userData.disc); the ride hides the discs of the rider's own track (metro.js env.onLegStart), the free-end disc only once the rider's car reaches it
  const disc = (path, s, faceA, kind) => {
    const c = cumOf(path), sAt = s < 0 ? c[c.length - 1] + s : s, q = pointAt(path, c, sAt);
    const d = new THREE.Mesh(new THREE.CircleGeometry(2.78, 28), M.discBlack); d.position.set(q.p[0], q.p[1] + 2.0, q.p[2]);
    d.rotation.y = faceA ? Math.atan2(-q.hx, -q.hz) : Math.atan2(q.hx, q.hz); grp.add(d); registerDisc(ctx, d, { kind, link: spec.id, s: sAt });
    return sAt;
  };
  const dsc = spec.discs || {};
  for (const [side, atEnd] of [['A', false], ['B', true]]) if (dsc[side] && !(free && side === 'B')) for (const p of [path1, path2]) disc(p, atEnd ? -STUB_VISIBLE : STUB_VISIBLE, !atEnd, 'real');
  const out = {}, L1 = lenOf(path1), L2 = lenOf(path2);
  // lamp: the lamp phase of a link in its TRAVEL order (lamps at at0 + n * step m from its start; ride.js aligns the generic tunnel with it)
  if (free) {                                                                                       // the free end: a disc facing the approaching train, 50 m before the end of each path
    const sd = disc(path1, -50, true, 'free'); disc(path2, -50, true, 'free');
    out[spec.key1] = { path: path1, length: L1, lamp: { step: LAMPS, at0: LAMPS / 2 }, partial: { discS: sd } };
    // track 2 (free end -> A) is ridden by no leg end to end, but a generic leg that arrives at A on it follows its last metres (ride.js makeRoute finds a tube by its end points;
    // a key without '>' never matches a leg)
    out['tube:' + spec.id + ':2'] = { path: path2.slice().reverse(), length: L2, lamp: { step: LAMPS, at0: pmod(L2 - LAMPS / 2, LAMPS) } };
  } else { out[spec.key1] = { path: path1, length: L1, lamp: { step: LAMPS, at0: LAMPS / 2 } }; out[spec.key2] = { path: path2.slice().reverse(), length: L2, lamp: { step: LAMPS, at0: pmod(L2 - LAMPS / 2, LAMPS) } }; }
  return { links: out, L, group: grp, path1, path2 };
}

/**
 * Builds the L3 and L5 links between the stations that are built (`st`: { vo, gd, adm, sport, gorny } = the results of the station builders) and returns { links, done: Set of 'station:end' keys that now
 * have a real tunnel }. A failure of one link is logged and leaves the stubs of its ends (the deferred stubs of X.deferStub run in metro.js).
 */
export function buildVoLinks(ctx, M, X, st) {
  const links = {}, done = new Set(), say = (e, what) => { console.error('[metro] real link ' + what + ' failed', e); (ctx.errors ||= []).push(e); };
  // ---- L3 Vasileostrovskaya (+z end) <-> Gostiny Dvor (-z end): 3.25 km
  if (st.vo && st.gd) try {
    const vo = FRAMES.vasileostrovskaya, gd = FRAMES.gostiny, T = GDH.TRK, dV = [Math.sin(vo.yaw), Math.cos(vo.yaw)], dG = [Math.sin(gd.yaw), Math.cos(gd.yaw)];
    const r = buildRealLink(ctx, M, X, { id: 'l3-vo-gd', key1: 'vasileostrovskaya>gostiny', key2: 'gostiny>vasileostrovskaya', sag: 3.5, rideOnly: 'B', rideOnlyLength: 125, discs: { A: true, B: false },
      mid: [[-3872, -1024], [-3602, -910], [-3179, -752], [-2062, -311], [-1874, -283], [-1559, -264]],
      A: { p1: toWorld(vo, -T, VO_PZ + 0.6), h: dV, sep: 2 * T, y1: vo.y - 1.1, y2: vo.y - 1.1 }, B: { p1: toWorld(gd, -T, -(GD_PZ + 0.6)), h: dG, sep: 2 * T, y1: gd.y - 1.1, y2: gd.y - 1.1 } });
    Object.assign(links, r.links); done.add('vasileostrovskaya:1'); done.add('gostiny:-1'); X.debug.voLinks = { ...(X.debug.voLinks || {}), l3: { L: r.L } };
  } catch (e) { say(e, 'L3 Vasileostrovskaya - Gostiny Dvor'); }
  // ---- L5 Admiralteyskaya (-z end) <-> Sportivnaya (+z end, both levels): 2.47 km; track 1 = the north track (upper level of Sportivnaya)
  if (st.adm && st.sport) try {
    const ad = FRAMES.admiralteyskaya, sp = FRAMES.sportivnaya, TA = PYLON.TRK, TS = 7.9;
    const r = buildRealLink(ctx, M, X, { id: 'l5-adm-sport', key1: 'admiralteyskaya>sportivnaya', key2: 'sportivnaya>admiralteyskaya', sag: 3.0, sepMid: 7.0, discs: { A: true, B: true },
      mid: [[-2235, -492], [-2795, -657], [-3058, -815], [-3507, -1255], [-3610, -1431], [-3632, -1579], [-3591, -1750]],
      A: { p1: toWorld(ad, TA, -(AD_PZ + 0.6)), h: [-Math.sin(ad.yaw), -Math.cos(ad.yaw)], sep: 2 * TA, y1: ad.y - 1.1, y2: ad.y - 1.1 },
      B: { p1: toWorld(sp, TS, SP_PZ + 0.6), h: [-Math.sin(sp.yaw), -Math.cos(sp.yaw)], sep: 2 * TS, y1: sp.yUpper - 1.1, y2: sp.y - 1.1 } });
    Object.assign(links, r.links); done.add('admiralteyskaya:-1'); done.add('sportivnaya:1'); X.debug.voLinks = { ...(X.debug.voLinks || {}), l5: { L: r.L } };
  } catch (e) { say(e, 'L5 Admiralteyskaya - Sportivnaya'); }
  // ---- L4 Gorny Institut (+z end) -> Spasskaya: PARTIAL (the polyline ends at x -2422, there is no hall there); only the Gorny -> Spasskaya direction rides it
  if (st.gorny) try {
    const gn = FRAMES.gorny, T = st.gorny.hall.TRK, dG = [Math.sin(gn.yaw), Math.cos(gn.yaw)], zEnd = st.gorny.hall.PZ + 0.6;
    const r = buildRealLink(ctx, M, X, { id: 'l4-gorny-spas', key1: 'gorny>spasskaya', lamps: 9, sag: 3.0, sepMid: 7.0, discs: { A: true },
      mid: [[-4357, 698], [-4245, 808], [-4109, 896], [-3817, 953], [-3641, 916], [-3336, 786], [-3165, 713], [-2901, 532], [-2614, 353], [-2422, 337]],
      A: { p1: toWorld(gn, -T, zEnd), h: dG, sep: 2 * T, y1: gn.y - 1.1, y2: gn.y - 1.1 }, B: { free: true, y1: -61.1, y2: -61.1 } });
    Object.assign(links, r.links); done.add('gorny:1'); X.debug.voLinks = { ...(X.debug.voLinks || {}), l4: { L: r.L } };
  } catch (e) { say(e, 'L4 Gorny Institut - Spasskaya (partial)'); }
  return { links, done };
}
