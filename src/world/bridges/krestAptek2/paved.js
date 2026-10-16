// bridges/krestAptek2/paved.js - PURE DATA (imports only data/city.js): the PAVED_RINGS of the bridge group bridges-krestovsky-aptekarsky (review 2026-10-14).
// A ring is ground that the bridge module paves itself: environment/claims.js stamps it into the claim mask, so no generic trunk, hedge, bed or grass tuft grows through our slabs (found by the reviewer: grass
// tufts stood through the asphalt of the Kantemirovsky approaches, trees on the carriageway of the pond-bridge road at (-5905.7, -4594.1) / (-5909.7, -4597.1), tufts through the boardwalk planks).
//   kantemirovsky / malokrestovsky / krestpond: the LAND stretches of the claimed way (the approach slabs of krestAptek.js), +0.4 m beside the pavements
//   yachtny: the first and last 35 m of the way (the deck there is lower than a tuft)
//   boardwalks: every plank way (width + 0.4 m)
// bridges/groups.js concatenates the list into PAVED_RINGS (owners.js reads it only while the module `bridges` is in the build list).
import { ROADS } from '../../data/city.js';

const r2 = (v) => Math.round(v * 100) / 100;
/** a rotated rectangle round the segment a -> b (+ ext at both ends, + hw to both sides) as [[x, z] x4] */
function rect(a, b, hw, ext = 0) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, tx = dx / l, tz = dz / l, nx = -tz, nz = tx;
  const p = (u, v) => [r2(a[0] + tx * u + nx * v), r2(a[1] + tz * u + nz * v)];
  return [p(-ext, -hw), p(l + ext, -hw), p(l + ext, hw), p(-ext, hw)];
}
/** the axis of a straight bridge (p0 -> p1) between the s values s0 .. s1 (metres from p0) */
function strip(p0, p1, s0, s1, hw) {
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), dx = (p1[0] - p0[0]) / L, dz = (p1[1] - p0[1]) / L;
  return rect([p0[0] + dx * s0, p0[1] + dz * s0], [p0[0] + dx * s1, p0[1] + dz * s1], hw);
}
const AX = {
  kant: { p0: [-1754.55, -5022.15], p1: [-1538.1, -5245.2], b0: 53.1, b1: 255.0, hw: 15.5 },
  mk: { p0: [-3838.15, -4596.9], p1: [-3869.9, -4508.75], b0: 30.9, b1: 69.6, hw: 5.75 },
  pb: { p0: [-5897.1, -4599.5], p1: [-5872.9, -4618.1], b0: 7.0, b1: 26.0, hw: 4.7 },
};
const out = [];
for (const [id, a] of Object.entries(AX)) {
  const L = Math.hypot(a.p1[0] - a.p0[0], a.p1[1] - a.p0[1]);
  out.push({ id: 'ka-' + id + '-A', ring: strip(a.p0, a.p1, 0, a.b0 - 1.0, a.hw + 0.4) }, { id: 'ka-' + id + '-B', ring: strip(a.p0, a.p1, a.b1 + 1.0, L, a.hw + 0.4) });
}
// Yachtny: the two ends of the OSM way w419266626 (travel from the Primorsky end)
const YA_START = [[-7789.1, -5342.3], [-7790.1, -5326.7], [-7789.9, -5310.9], [-7788.3, -5291.5]];
const YA_END = [[-7560.8, -4854.2], [-7537.9, -4827.7]];
for (let i = 0; i + 1 < YA_START.length; i++) out.push({ id: 'ka-yachtny-A' + i, ring: rect(YA_START[i], YA_START[i + 1], 9.0, 0.6) });
out.push({ id: 'ka-yachtny-B', ring: rect(YA_END[0], YA_END[1], 9.0, 0.6) });
// boardwalks
const BW = ['w1321576957', 'w1459136325', 'w1459136328', 'w1459136329', 'w1459136333', 'w1459136334', 'w1459136335', 'w1284616904', 'w1460564661', 'w1460564662', 'w1460564663', 'w1461661721'];
for (const r of ROADS) {
  if (!BW.includes(r.id)) continue;
  const pts = r.pts, n = pts.length / 2, hw = (r.w || 2.4) / 2 + 0.4;
  for (let i = 0; i + 1 < n; i++) { const a = [pts[i * 2], pts[i * 2 + 1]], b = [pts[i * 2 + 2], pts[i * 2 + 3]]; if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.2) out.push({ id: r.id, ring: rect(a, b, hw, 0.3) }); }
}
export const PAVED_RINGS = out;
