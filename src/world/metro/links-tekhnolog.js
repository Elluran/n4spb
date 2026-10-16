// metro/links-tekhnolog.js — the REAL running tunnels of Tekhnologichesky Institut (polylines = the OSM `railway=subway` ways, data/city.js SUBWAY; links-vo.js buildRealLink):
//   L1  Tekhnologichesky Institut 1 (-z end, NNE) <-> Pushkinskaya (+z end, WSW)   ~1.1 km: w586074311 + w378159370 (southbound) / w586074310 + w31292487 (northbound). In the real
//       cross-platform layout the northbound line-1 track runs through HALL 2; here both line-1 tracks leave hall 1 (KNOWN SIMPLIFICATION, metro/st-tekhnolog.js), so the pair is drawn
//       about the SOUTHBOUND polyline: track 1 (northbound, Tekhn. -> Pushkinskaya, the right-hand track) is that polyline shifted 3.5 m to its right, track 2 3.5 m to its left.
//   L2  Tekhnologichesky Institut 2 (+z end, NNE) <-> Sennaya Ploshchad (-z end, S) ~1.27 km: w586125754 (northbound, through hall 2) + w586074314 (the OSM data has a 142 m gap between them,
//       bridged by the smoothing); track 1 (northbound, Tekhn. 2 -> Sennaya) is the OSM northbound polyline.
// buildTekhnologLinks(ctx, M, X) -> { links: { 'a>b': { path, length, lamp } }, done: Set('tekhnolog:-1', 'pushkinskaya:1', ...) }. A link is built only when both halls exist
// (X.stations[...]) and both of its ends are REAL ends (X.realEnd: the station builders deferred their stubs there); otherwise the ends keep their stubs (metro.js flushes the deferred ones
// that are not in `done`). Call it in metro.js before that flush.
// The two links CROSS in plan about 380 m from the halls (near (-1672, 1540): L1 turns NE to Pushkinskaya, L2 runs N to Sennaya): L1 sags 4 m and L2 humps 4 m (negative sag), so the
// tubes pass about 9 m apart vertically there (both at ~-41 m in the halls; the OSM data does not say which line is above).
import { FRAMES, toWorld } from '../data/metro.js';
import { buildRealLink } from './links-vo.js';

// OSM points between the halls (more than 130 m from either mouth; buildRealLink drops points inside its 100 m straight handles anyway)
const L1_SOUTH = [[-1777.9, 1673.1], [-1750.7, 1629.6], [-1721.5, 1587.5], [-1673.7, 1536.6], [-1619.2, 1491.3], [-1548.4, 1451.2], [-1462.3, 1415.3], [-1382.0, 1385.4]];     // Tekhn. -> Pushkinskaya order
const L2_NORTH = [[-1754.7, 1719.9], [-1710.0, 1635.5], [-1688.7, 1588.4], [-1665.8, 1528.1], [-1656.4, 1488.5], [-1652.0, 1452.5], [-1664.0, 1311.0], [-1689.9, 1188.8], [-1727.2, 990.4]];   // Tekhn. 2 -> Sennaya

/** shift a polyline [[x, z]] by `d` metres to the RIGHT of its direction of travel (+x east, +z south: right of (hx, hz) is (-hz, hx)) */
function shiftRight(pts, d) {
  return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], hx = b[0] - a[0], hz = b[1] - a[1], l = Math.hypot(hx, hz) || 1; return [p[0] - hz / l * d, p[1] + hx / l * d]; });
}
const dirZ = (f, s) => [s * Math.sin(f.yaw), s * Math.cos(f.yaw)];
/** the hall data a link needs from a built station: track offset, mouth z, bed level of a track */
function hallOf(rt, key) {
  const h = rt.hall, tk = rt.platform && rt.platform.trackByKey ? rt.platform.trackByKey(key) : null, fy = tk && tk.fy !== undefined ? tk.fy : h.FY;
  return { TRK: h.TRK ?? 10, mouth: h.mouth ?? (h.PZ + 0.6), bed: fy - 1.1 };
}

export function buildTekhnologLinks(ctx, M, X) {
  const links = {}, done = new Set(), say = (e, what) => { console.error('[metro] real link ' + what + ' failed', e); (ctx.errors ||= []).push(e); };
  const real = (key) => !!(X.realEnd && X.realEnd(key)), st = X.stations || {};
  // ---- L1 Tekhnologichesky Institut 1 (-z end) <-> Pushkinskaya (+z end)
  if (st.tekhnolog && st.pushkinskaya && FRAMES.pushkinskaya && real('tekhnolog:-1') && real('pushkinskaya:1')) try {
    const T1 = FRAMES.tekhnolog, P = FRAMES.pushkinskaya, a = hallOf(st.tekhnolog, 'N'), a2 = hallOf(st.tekhnolog, 'S'), b = hallOf(st.pushkinskaya, 'N'), b2 = hallOf(st.pushkinskaya, 'S');
    const r = buildRealLink(ctx, M, X, { id: 'l1-tekh-push', key1: 'tekhnolog>pushkinskaya', key2: 'pushkinskaya>tekhnolog', sag: 4.0, sepMid: 7.0, discs: { A: true, B: true },
      mid: shiftRight(L1_SOUTH, 3.5),
      A: { p1: toWorld(T1, a.TRK, -a.mouth), h: dirZ(T1, -1), sep: 2 * a.TRK, y1: a.bed, y2: a2.bed },               // track 1 = N (x = +TRK, toward -z) of hall 1
      B: { p1: toWorld(P, b.TRK, b.mouth), h: dirZ(P, -1), sep: 2 * b.TRK, y1: b.bed, y2: b2.bed } });                // arriving at Pushkinskaya on its N track (x = +TRK, toward -z)
    Object.assign(links, r.links); done.add('tekhnolog:-1'); done.add('pushkinskaya:1'); X.debug && (X.debug.tekhLinks = { ...(X.debug.tekhLinks || {}), l1: { L: r.L } });
  } catch (e) { say(e, 'L1 Tekhnologichesky Institut - Pushkinskaya'); }
  // ---- L2 Tekhnologichesky Institut 2 (+z end) <-> Sennaya Ploshchad (-z end)
  if (st.tekhnolog2 && st.sennaya && FRAMES.sennaya && real('tekhnolog2:1') && real('sennaya:-1')) try {
    const T2 = FRAMES.tekhnolog2, SN = FRAMES.sennaya, a = hallOf(st.tekhnolog2, 'S'), a2 = hallOf(st.tekhnolog2, 'N'), b = hallOf(st.sennaya, 'S'), b2 = hallOf(st.sennaya, 'N');
    const r = buildRealLink(ctx, M, X, { id: 'l2-tekh2-senn', key1: 'tekhnolog2>sennaya', key2: 'sennaya>tekhnolog2', sag: -4.0, sepMid: 7.0, discs: { A: true, B: true },
      mid: L2_NORTH,
      A: { p1: toWorld(T2, -a.TRK, a.mouth), h: dirZ(T2, 1), sep: 2 * a.TRK, y1: a.bed, y2: a2.bed },               // track 1 = S (x = -TRK, toward +z) of hall 2
      B: { p1: toWorld(SN, -b.TRK, -b.mouth), h: dirZ(SN, 1), sep: 2 * b.TRK, y1: b.bed, y2: b2.bed } });             // arriving at Sennaya on its S track (x = -TRK, toward +z)
    Object.assign(links, r.links); done.add('tekhnolog2:1'); done.add('sennaya:-1'); X.debug && (X.debug.tekhLinks = { ...(X.debug.tekhLinks || {}), l2: { L: r.L } });
  } catch (e) { say(e, 'L2 Tekhnologichesky Institut 2 - Sennaya'); }
  return { links, done };
}
