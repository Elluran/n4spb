// The rules a Tauride relief must obey (docs/TAURIDE-REMAKE.md section 3, T2), as functions over a height function `gh(x, z) -> number | null` and the committed data. Shared by tools/tauride-height-test.mjs (the
// gate), tools/tauride/relief-check.mjs (the authoring loop) and tools/tauride-relief-plan.mjs. Import it AFTER nothing else: it loads tools/tauride/lib/site.mjs (the North hooks).
import * as S from './site.mjs';
import { inRing, ringDist, loadFacade } from './common.mjs';
import { CAMS, VIEWS_PROPOSAL } from '../../tauride-cams.mjs';

/** the margins, metres: ZERO relief within this distance of the thing */
export const MARGINS = { outline: 8, footprint: 3, tree: 4, water: 3, bridge: 5, flat: 3, pose: 4 };
/** places that must stay flat although no building stands on them: the pitch, the playgrounds, the fitness station (their OSM rings) and the fountain plaza and the two statue plazas (DESIGN radii for the point features) */
export const FLAT_DISCS = [
  { id: 'fountain', x: 1282.6, z: -1400.5, r: 14 },
  { id: 'chaikovsky', x: 932, z: -1311.1, r: 8 },
  { id: 'esenin', x: 1004.7, z: -1359.3, r: 8 },
];
/** the ground acceptance poses T01..T11 (T12 is the flight) and the two VIEWS poses of the garden (Digit5, Digit6): the relief keeps 4 m round them flat, so that they stay valid and at street level */
export const POSES = [...CAMS.filter((c) => !c.flight).map((c) => ({ id: c.id, x: c.x, z: c.z })), ...VIEWS_PROPOSAL.filter((v) => v.x > 900 && v.x < 1500 && v.z > -1800 && v.z < -1250).map((v) => ({ id: 'D' + v.key.slice(-1), x: v.x, z: v.z }))];
export const MAX_SLOPE = 0.25;
export const SLOPE_DESIGN = 0.22;           // what the authoring aims at: a margin under the asserted 1:4

const gb = S.GARDEN.o;
export const outlineDist = (x, z) => ringDist(x, z, gb);
/** the rings of the flat zones: the OSM pitch, playgrounds and fitness station inside the garden (GARDEN_GREEN.others) */
const facade = await loadFacade();
export const FLAT_RINGS = (() => { const ids = new Set(S.Fo.GARDEN_GREEN.others.map((o) => o.id)); const out = []; for (const r of facade.PITCHES) if (ids.has(r.id)) for (const p of r.polys) out.push(p.o); return out; })();

/** the distance from (x, z) to each constraint, for a point that is lifted: { outline, footprint, tree, water, bridge, flat } (the flat zones: the pitch ring, playgrounds etc. come from `flatPolys`) */
export function distances(x, z, flatPolys = FLAT_RINGS) {
  const d = { outline: outlineDist(x, z), footprint: S.footprintDist(x, z), tree: Infinity, water: S.waterDist(x, z), bridge: S.bridgeDist(x, z), flat: Infinity, pose: Infinity };
  for (const q of POSES) d.pose = Math.min(d.pose, Math.hypot(x - q.x, z - q.z));
  for (const t of S.Fu.OSM_TREES) d.tree = Math.min(d.tree, Math.hypot(x - t.x, z - t.z));
  for (const f of FLAT_DISCS) d.flat = Math.min(d.flat, Math.hypot(x - f.x, z - f.z) - f.r);
  for (const p of flatPolys || []) d.flat = Math.min(d.flat, inRing(x, z, p) ? 0 : ringDist(x, z, p));
  return d;
}

/** Sample the lifted cells of `gh` on a `step` m lattice over the garden box and list every rule violation: [{ rule, n, worst, at: {x, z}, h }]. `flatPolys` = rings of the flat zones. */
export function checkMargins(gh, flatPolys = FLAT_RINGS, step = 1, margins = MARGINS) {
  const bad = {};
  let cells = 0, lifted = 0, maxH = 0;
  for (let x = 917.8; x <= 1497.3; x += step) for (let z = -1788.5; z <= -1259.7; z += step) {
    cells++;
    const h = gh(x, z); if (!(h > 1e-9)) continue;
    lifted++; if (h > maxH) maxH = h;
    const d = distances(x, z, flatPolys), ins = inRing(x, z, gb);
    const sd = { outline: ins ? d.outline : -d.outline, footprint: d.footprint, tree: d.tree, water: d.water, bridge: d.bridge, flat: d.flat, pose: d.pose };
    for (const k of Object.keys(margins)) if (sd[k] < margins[k]) { const b = bad[k] || (bad[k] = { rule: k, n: 0, worst: Infinity, at: null, h: 0 }); b.n++; if (sd[k] - margins[k] < b.worst) { b.worst = +(sd[k] - margins[k]).toFixed(2); b.at = { x: +x.toFixed(1), z: +z.toFixed(1) }; b.h = +h.toFixed(2); } }
  }
  return { cells, lifted, maxH, violations: Object.values(bad) };
}

/** steepest gradient (per metre, central difference over +-1 m) of the lifted field on a `step` lattice, and over the ways (per metre of way): { land: {max, at}, ways: {max, at, id} } */
export function slopes(gh, step = 2) {
  const H = (x, z) => gh(x, z) ?? 0;
  let land = { max: 0, at: null };
  for (let x = 917.8; x <= 1497.3; x += step) for (let z = -1788.5; z <= -1259.7; z += step) {
    if (H(x, z) === 0 && H(x + 1, z) === 0 && H(x - 1, z) === 0 && H(x, z + 1) === 0 && H(x, z - 1) === 0) continue;
    const g = Math.hypot(H(x + 1, z) - H(x - 1, z), H(x, z + 1) - H(x, z - 1)) / 2;
    if (g > land.max) land = { max: g, at: { x: +x.toFixed(1), z: +z.toFixed(1) } };
  }
  let ways = { max: 0, at: null, id: null };
  for (const p of S.P.PATHS) {
    if (p.bridge) continue;
    let prev = null;
    for (let i = 0; i + 3 < p.pts.length; i += 2) {
      const L0 = Math.hypot(p.pts[i + 2] - p.pts[i], p.pts[i + 3] - p.pts[i + 1]), n = Math.max(1, Math.ceil(L0));
      for (let t = 0; t <= n; t++) {
        const x = p.pts[i] + (p.pts[i + 2] - p.pts[i]) * t / n, z = p.pts[i + 1] + (p.pts[i + 3] - p.pts[i + 1]) * t / n, h = H(x, z);
        if (prev !== null) { const g = Math.abs(h - prev.h) / Math.max(1e-6, Math.hypot(x - prev.x, z - prev.z)); if (g > ways.max) ways = { max: g, at: { x: +x.toFixed(1), z: +z.toFixed(1) }, id: p.id }; }
        prev = { x, z, h };
      }
      // the next segment starts at this one's end: keep `prev` (continuous)
    }
  }
  return { land, ways };
}
