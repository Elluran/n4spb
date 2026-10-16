// metro/links-vitebsky.js — the REAL running tunnels of the Vitebsky node (links-vo.js buildRealLink: two single-track tubes, 100 m axial at both halls, OSM polyline in between, black discs
// 70 m from the mouths, linear depth with a sag):
//   L1  Vladimirskaya (+z end) <-> Pushkinskaya (-z end)   ~1.0 km, OSM w378159370 (track I southbound, layer -7) between the halls
//   L5  Sadovaya (+z end) <-> Zvenigorodskaya (-z end)       ~1.3 km, OSM w193020446 (southbound) — built only when FRAMES.sadovaya exists and the Sadovaya hall is a real station
// A link is NOT built over an end that already carries tunnel stubs (two coincident tubes): the caller then builds the stubs of its own end (the ride falls back to the generic tunnel).
import { buildRealLink } from './links-vo.js';
import { STUB_PATHS } from './stubs.js';
import { FRAMES, toWorld } from '../data/metro.js';

/** OSM w378159370 between Vladimirskaya and Pushkinskaya (without the 100 m axial runs at the halls) */
export const L1_VL_PUSH = [[-501.1, 856.6], [-613.0, 943.4], [-747.0, 1059.7]];
/** OSM w193020446 between Sadovaya and Zvenigorodskaya */
export const L5_SAD_ZVEN = [[-1823.8, 796.3], [-1825.3, 899.3], [-1821.7, 940.5], [-1813.8, 972.1], [-1799.6, 1008.1], [-1784.5, 1038.8], [-1762.6, 1070.8], [-1692.5, 1146.8], [-1655.9, 1178.5], [-1625.4, 1199.7]];

const stubAt = (p) => STUB_PATHS.some((q) => q && q.length && Math.hypot(q[0][0] - p[0], q[0][2] - p[1]) < 2.0);
const axis = (f) => [Math.sin(f.yaw), Math.cos(f.yaw)];
const keep = (pts, a, b, r) => pts.filter((p) => Math.hypot(p[0] - a[0], p[1] - a[1]) > r && Math.hypot(p[0] - b[0], p[1] - b[1]) > r);

/** the link between the +z end of hall `ra` (station A, lower index) and the -z end of hall `rb` (station B); returns the buildRealLink result or null (an end has stubs) */
function link(ctx, M, X, id, ra, rb, fa, fb, mid, what) {
  const TA = ra.hall.TRK, TB = rb.hall.TRK, a1 = toWorld(fa, -TA, ra.hall.mouth), a2 = toWorld(fa, TA, ra.hall.mouth), b1 = toWorld(fb, -TB, -rb.hall.mouth), b2 = toWorld(fb, TB, -rb.hall.mouth);
  if ([a1, a2, b1, b2].some(stubAt)) { console.warn('[metro] ' + what + ': an end already has tunnel stubs, the real tunnel is not built (defer those stubs, docs/METRO.md "Vitebsky node")'); return null; }
  const r = buildRealLink(ctx, M, X, { id, key1: ra.id + '>' + rb.id, key2: rb.id + '>' + ra.id, sag: 3.0, sepMid: 7.0, discs: { A: true, B: true }, mid: keep(mid, a1, b1, 130),
    A: { p1: a1, h: axis(fa), sep: 2 * TA, y1: ra.hall.FY - 1.1, y2: ra.hall.FY - 1.1 }, B: { p1: b1, h: axis(fb), sep: 2 * TB, y1: rb.hall.FY - 1.1, y2: rb.hall.FY - 1.1 } });
  Object.assign(X.realLinks, r.links);
  X.debug.vitLinks = { ...(X.debug.vitLinks || {}), [id]: { L: r.L } };
  return r;
}

/** L1 Vladimirskaya -> Pushkinskaya (both halls must be registered in X.stations) */
export function buildVladimirskayaPushkinskayaLink(ctx, M, X) {
  const a = X.stations.vladimirskaya, b = X.stations.pushkinskaya;
  if (!a || !b || !FRAMES.vladimirskaya || !FRAMES.pushkinskaya) return null;
  return link(ctx, M, X, 'l1-vl-push', a, b, FRAMES.vladimirskaya, FRAMES.pushkinskaya, L1_VL_PUSH, 'L1 Vladimirskaya - Pushkinskaya');
}

/**
 * L5 Sadovaya -> Zvenigorodskaya. Call it once the Sadovaya hall is built (X.stations.sadovaya) and only when FRAMES.sadovaya exists; hub-vitebsky.js calls it itself when both exist at its
 * build time. Whatever happens, the -z end of Zvenigorodskaya gets either this tunnel or its own stubs (exactly once: X.vitebsky.zvenigorodskaya.endDone).
 */
export function buildZvenigorodskayaSadovayaLink(ctx, M, X) {
  const zv = X.vitebsky && X.vitebsky.zvenigorodskaya; if (!zv || zv.endDone) return null;
  const a = X.stations.sadovaya, b = X.stations.zvenigorodskaya;
  let r = null;
  if (FRAMES.sadovaya && a && b) { try { r = link(ctx, M, X, 'l5-sad-zven', a, b, FRAMES.sadovaya, FRAMES.zvenigorodskaya, L5_SAD_ZVEN, 'L5 Sadovaya - Zvenigorodskaya'); } catch (e) { console.error('[metro] real link L5 Sadovaya - Zvenigorodskaya failed', e); (ctx.errors ||= []).push(e); } }
  if (r) zv.endDone = 'link'; else { zv.endStubs(-1); zv.endDone = 'stubs'; }
  return r;
}
