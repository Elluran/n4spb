// metro/links-east.js — the REAL running tunnels of the east stations (buildRealLink of links-vo.js; polylines = the OSM `railway=subway` ways of src/world/data/city.js SUBWAY):
//   L3  Mayakovskaya (+z end) <-> Pl. Aleksandra Nevskogo 1 (-z end)   ~1.84 km, track 1 = w556602664 (the eastbound track; w431477832 is the other one)
//   L4  Dostoevskaya (+z end) <-> Ligovsky Prospekt (-z end)          ~1.05 km, generated: the Dostoevskaya hall of this map is AXIAL with its Regent Hall incline (turned ~90 degrees and ~60 m WSW
//       of the OSM platform), so the tube leaves its +z end SSW, turns left on a 150 m radius (the angle at which the arc points straight at the Ligovsky approach, ~99 degrees) and runs
//       straight to the 100 m handle of Ligovsky (the OSM way w321074201 passes the OSM Dostoevskaya 60 m away: a kink-free join to it is impossible)
//   L4  Ligovsky Prospekt (+z end) <-> Pl. Aleksandra Nevskogo 2 (-z end) ~1.5 km, track 1 = w321074201 (the eastbound track; w193019190 is the other one)
// Track 1 of every link is the right-hand track of the direction toward the higher station index (+z of every hall: the S track at x = -TRK); track 2 is offset to its left (links-vo.js).
// The black discs stand 70 m along each tube from both mouths. Ends: 'mayakovskaya:1', 'pan1:-1', 'dostoevskaya:1', 'ligovsky:-1', 'ligovsky:1', 'pan2:-1' (returned in `done` when built).
//   const lk = buildEastLinks(ctx, M, X, { east, mayak: X.stations.mayakovskaya, dost: X.stations.dostoevskaya });  Object.assign(realLinks, lk.links);
// After the links the deferred stubs of the east hub (east.deferred) are built for the ends that did not get a tunnel. For Mayakovskaya / Dostoevskaya (metro.js stubs) the platform discs of
// those ends are moved to 70 m (rt.hall.discPos): the trains of the timetable then vanish into the black disc of the real tube instead of 6 m behind the mouth.
import { buildRealLink } from './links-vo.js';
import { GDH } from './hall-gd.js';
import { PYLON } from './hall-pylon.js';
import { VAULT } from './hall-vault.js';
import { FRAMES, toWorld } from '../data/metro.js';
import { PAN1_PZ, PAN2_PZ, LG_PZ } from '../data/metro-east.js';

// OSM w556602664 between Mayakovskaya and PAN-1 (the points inside the 100 m straight handles at the halls are dropped by buildRealLink)
const L3_MID = [[523.1, 308.4], [591.7, 333.7], [707.3, 382.4], [1038.3, 514.9], [1134.5, 553.8], [1250, 602.2], [1382.7, 657.3], [1505.4, 709.1], [1682.5, 774], [1775.7, 821.9], [1833.7, 861.1], [1904.3, 921.6], [1921.7, 937.9]];
// OSM w321074201 between Ligovsky and PAN-2
const L4E_MID = [[608, 1320.9], [680.3, 1354.5], [749.5, 1372.5], [808.2, 1378.4], [849.2, 1379], [895.5, 1372.3], [940.8, 1357.3], [1018.4, 1309.6], [1075.9, 1284.2], [1155.3, 1260.8], [1508.6, 1178.6], [1576.3, 1165.6], [1605.4, 1161.3], [1793, 1148.5]];

/** the generated L4 middle between Dostoevskaya and Ligovsky: an arc of radius R that turns the heading h (unit) left by `turn` rad, starting `ax` m along h from p, sampled every ~12 m */
function arcLeft(p, h, ax, R, turn) {
  const s = [p[0] + h[0] * ax, p[1] + h[1] * ax], left = [h[1], -h[0]], c = [s[0] + left[0] * R, s[1] + left[1] * R], n = Math.max(2, Math.ceil(R * turn / 12)), out = [];
  for (let i = 1; i <= n; i++) { const f = i * turn / n; out.push([c[0] - left[0] * R * Math.cos(f) + h[0] * R * Math.sin(f), c[1] - left[1] * R * Math.cos(f) + h[1] * R * Math.sin(f)]); }
  return out;
}

export function buildEastLinks(ctx, M, X, st) {
  const links = {}, done = new Set(), say = (e, what) => { console.error('[metro] real link ' + what + ' failed', e); (ctx.errors ||= []).push(e); }, info = {};
  const east = st.east || {}, dirZ = (f) => [Math.sin(f.yaw), Math.cos(f.yaw)];
  const discTo70 = (rt) => { if (rt && rt.hall) rt.hall.discPos = rt.hall.mouth + X.STUB_VISIBLE; };
  // ---- L3 Mayakovskaya -> PAN-1
  if (st.mayak && east.pan1) try {
    const MF = FRAMES.mayakovskaya, P1 = FRAMES.pan1, h = st.mayak.hall, T = h.TRK;
    const r = buildRealLink(ctx, M, X, { id: 'l3-mayak-pan1', key1: 'mayakovskaya>pan1', key2: 'pan1>mayakovskaya', sag: 3.0, sepMid: 7.0, discs: { A: true, B: true }, mid: L3_MID,
      A: { p1: toWorld(MF, -T, h.mouth), h: dirZ(MF), sep: 2 * T, y1: h.FY - 1.1, y2: h.FY - 1.1 },
      B: { p1: toWorld(P1, -GDH.TRK, -(PAN1_PZ + 0.6)), h: dirZ(P1), sep: 2 * GDH.TRK, y1: P1.y - 1.1, y2: P1.y - 1.1 } });
    Object.assign(links, r.links); done.add('mayakovskaya:1'); done.add('pan1:-1'); discTo70(st.mayak); info.l3 = { L: Math.round(r.L) };
  } catch (e) { say(e, 'L3 Mayakovskaya - Pl. Aleksandra Nevskogo 1'); }
  // ---- L4 Dostoevskaya -> Ligovsky (generated: arc + straight)
  if (st.dost && east.ligovsky) try {
    const DF = FRAMES.dostoevskaya, LG = FRAMES.ligovsky, h = st.dost.hall, T = h.TRK, TL = VAULT.TRK, hA = dirZ(DF), pA = toWorld(DF, -T, h.mouth), hB = dirZ(LG), pB = toWorld(LG, -TL, -(LG_PZ + 0.6));
    // the turn angle at which the arc's tangent points straight at the start of the Ligovsky handle (no kink between the arc and the straight)
    const qB = [pB[0] - hB[0] * 100, pB[1] - hB[1] * 100], R = 150, left = [hA[1], -hA[0]], s0 = [pA[0] + hA[0] * 100, pA[1] + hA[1] * 100], c = [s0[0] + left[0] * R, s0[1] + left[1] * R];
    let best = 100 * Math.PI / 180, bestErr = 1e9;
    for (let f = 0.5; f < 2.6; f += 0.002) { const P = [c[0] - left[0] * R * Math.cos(f) + hA[0] * R * Math.sin(f), c[1] - left[1] * R * Math.cos(f) + hA[1] * R * Math.sin(f)], tg = [hA[0] * Math.cos(f) + left[0] * Math.sin(f), hA[1] * Math.cos(f) + left[1] * Math.sin(f)], dx = qB[0] - P[0], dz = qB[1] - P[1], l = Math.hypot(dx, dz), err = Math.abs(Math.atan2(tg[0] * dz - tg[1] * dx, tg[0] * dx + tg[1] * dz)); if (l > 150 && err < bestErr) { bestErr = err; best = f; } }
    const arc = arcLeft(pA, hA, 100, R, best), last = arc[arc.length - 1], mid = [...arc];
    info.l4wTurn = +(best * 180 / Math.PI).toFixed(1);
    for (let f = 0.25; f < 0.8; f += 0.25) mid.push([last[0] + (qB[0] - last[0]) * f, last[1] + (qB[1] - last[1]) * f]);
    const r = buildRealLink(ctx, M, X, { id: 'l4-dost-lig', key1: 'dostoevskaya>ligovsky', key2: 'ligovsky>dostoevskaya', sag: 2.5, sepMid: 7.0, discs: { A: true, B: true }, mid,
      A: { p1: pA, h: hA, sep: 2 * T, y1: h.FY - 1.1, y2: h.FY - 1.1 }, B: { p1: pB, h: hB, sep: 2 * TL, y1: LG.y - 1.1, y2: LG.y - 1.1 } });
    Object.assign(links, r.links); done.add('dostoevskaya:1'); done.add('ligovsky:-1'); discTo70(st.dost); info.l4w = { L: Math.round(r.L) };
  } catch (e) { say(e, 'L4 Dostoevskaya - Ligovsky Prospekt'); }
  // ---- L4 Ligovsky -> PAN-2
  if (east.ligovsky && east.pan2) try {
    const LG = FRAMES.ligovsky, P2 = FRAMES.pan2, TL = VAULT.TRK, T2 = PYLON.TRK;
    const r = buildRealLink(ctx, M, X, { id: 'l4-lig-pan2', key1: 'ligovsky>pan2', key2: 'pan2>ligovsky', sag: 3.0, sepMid: 7.0, discs: { A: true, B: true }, mid: L4E_MID,
      A: { p1: toWorld(LG, -TL, LG_PZ + 0.6), h: dirZ(LG), sep: 2 * TL, y1: LG.y - 1.1, y2: LG.y - 1.1 },
      B: { p1: toWorld(P2, -T2, -(PAN2_PZ + 0.6)), h: dirZ(P2), sep: 2 * T2, y1: P2.y - 1.1, y2: P2.y - 1.1 } });
    Object.assign(links, r.links); done.add('ligovsky:1'); done.add('pan2:-1'); info.l4e = { L: Math.round(r.L) };
  } catch (e) { say(e, 'L4 Ligovsky Prospekt - Pl. Aleksandra Nevskogo 2'); }
  if (east.flushStubs) east.flushStubs(done);                                     // the stubs of the east halls at the ends that did not get a tunnel
  X.debug.eastLinks = info;
  return { links, done };
}
