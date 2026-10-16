// metro/links-north.js — the REAL running tunnels of line 1 north of Ploshchad Vosstaniya (docs/research/metro-frames-south-east.md section 4: "chernyshevskaya - vosstaniya: continuous"):
//   L1  Chernyshevskaya (+z end) <-> Ploshchad Vosstaniya (-z end)   ~1.6 km. Track 1 = the OSM way w378159370 (the right-hand track of a train that leaves Chernyshevskaya toward Vosstaniya:
//       local x = -TRK in both halls), track 2 = track 1 shifted left (links-vo.js buildRealLink: 100 m parallel to each hall axis, the separation tapers from 2 TRK to 7 m, discs 70 m from both
//       mouths, a linear depth profile -71.1 -> -59.1 with a 3 m sag). The polyline runs SSE from Chernyshevskaya, bends east round x 750 (under Kirochnaya / Vosstaniya streets) and comes back
//       SSW to the north end of the Vosstaniya hall; the OSM points inside a 130 m handle are dropped by buildRealLink, so the curves stay smooth and there is no gap to bridge.
// Wiring (metro.js): REAL_ENDS gets 'chernyshevskaya:1' and 'vosstaniya:-1'; the Vosstaniya north stubs are deferred under 'vosstaniya:-1'; this link runs with the other real links and its
// `done` keys join theirs before the deferred stubs are built. Keys: 'chernyshevskaya>vosstaniya' (track 1, A -> B) and 'vosstaniya>chernyshevskaya' (track 2, B -> A).
import { buildRealLink } from './links-vo.js';
import { FRAMES, toWorld, toLocal } from '../data/metro.js';
import { SUBWAY } from '../data/city.js';
import { PYLON } from './hall-pylon.js';
import { CH_PZ, CH_LINK_MID, CH_LINK_WAY } from '../data/metro-chernyshevskaya.js';

export const NORTH_REAL_ENDS = ['chernyshevskaya:1', 'vosstaniya:-1'];

/** the OSM points of track 1 between the +z end of Chernyshevskaya and the -z end of Vosstaniya, in travel order (falls back to the copy in data/metro-chernyshevskaya.js) */
export function northMid() {
  const ch = FRAMES.chernyshevskaya, V = FRAMES.vosstaniya;
  try {
    const w = (SUBWAY || []).find((q) => q.id === CH_LINK_WAY), raw = w && (w.pts || w.points);
    if (raw && raw.length) {
      const pts = Array.isArray(raw[0]) ? raw.map((p) => [p[0], p[1]]) : (() => { const r = []; for (let i = 0; i + 1 < raw.length; i += 2) r.push([raw[i], raw[i + 1]]); return r; })();
      const sel = pts.filter((p) => toLocal(ch, p[0], p[1])[1] > CH_PZ + 0.6 && toLocal(V, p[0], p[1])[1] < -(PYLON.PZ + 0.6));
      if (sel.length >= 2) { const a = toWorld(ch, 0, CH_PZ), d0 = Math.hypot(sel[0][0] - a[0], sel[0][1] - a[1]), d1 = Math.hypot(sel[sel.length - 1][0] - a[0], sel[sel.length - 1][1] - a[1]); return d0 <= d1 ? sel : sel.reverse(); }
    }
  } catch (e) { /* the data part is not loaded (tools): the copy */ }
  return CH_LINK_MID.map((p) => [p[0], p[1]]);
}

/**
 * st: { che: the result of buildChernyshevskaya, vosst: { TRK, PZ } of the Vosstaniya hall (default: the engine's pylon hall, as metro.js builds it) }.
 * Returns { links, done: Set of 'station:end' keys that now have a real tunnel }. A failure is logged and leaves the stubs (the deferred stubs of X.deferStub run in metro.js).
 */
export function buildNorthLinks(ctx, M, X, st = {}) {
  const links = {}, done = new Set();
  if (!st.che || !FRAMES.chernyshevskaya || !FRAMES.vosstaniya) return { links, done };
  try {
    const ch = FRAMES.chernyshevskaya, V = FRAMES.vosstaniya, TC = st.che.hall.TRK, PC = st.che.hall.PZ, TV = (st.vosst && st.vosst.TRK) || PYLON.TRK, PV = (st.vosst && st.vosst.PZ) || PYLON.PZ;
    const dC = [Math.sin(ch.yaw), Math.cos(ch.yaw)], dV = [Math.sin(V.yaw), Math.cos(V.yaw)];
    const r = buildRealLink(ctx, M, X, { id: 'l1-che-vosst', key1: 'chernyshevskaya>vosstaniya', key2: 'vosstaniya>chernyshevskaya', sag: 3.0, sepMid: 7.0, discs: { A: true, B: true }, mid: northMid(),
      A: { p1: toWorld(ch, -TC, PC + 0.6), h: dC, sep: 2 * TC, y1: ch.y - 1.1, y2: ch.y - 1.1 },
      B: { p1: toWorld(V, -TV, -(PV + 0.6)), h: dV, sep: 2 * TV, y1: V.y - 1.1, y2: V.y - 1.1 } });
    Object.assign(links, r.links); for (const k of NORTH_REAL_ENDS) done.add(k);
    X.debug.northLinks = { l1: { L: r.L, keys: Object.keys(r.links) } };
  } catch (e) { console.error('[metro] real link L1 Chernyshevskaya - Vosstaniya failed', e); (ctx.errors ||= []).push(e); }
  return { links, done };
}
