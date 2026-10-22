// ============================================================================
//  hooks/paradny.js - the Paradny podium of the North: the courtyard deck (3.3 m above the street) and the nine stair flights that climb to it, as a pure surface function.
//  Port of src/world/landmarksTauride/paradny-surface.js of the source repository (102_3d_piter, commit 0568f7af): the same expressions and the same values, so paradnyDeckY answers bit for bit
//  as the source does. The only change: the podium polygon and the mapped STEPS polylines are LITERALS here instead of `import { STEPS } from '../data/city.js'`, because the area module (which
//  loads hooks.js) must not import a data facade: tools/areas-test.mjs loads it without the import-map remap and would get the strip's facade. The literals equal the North facade (the STEPS ways
//  of the ids below, in the order of the data, and the podium ring is the source's): CPU tests compare them.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js. Read by hooks/height.js (the height patch), hooks/keep-out.js (trees, tufts, props, ways, parking) and the Tauride remake (landmarksTauride).
//  DORMANT in the generic North: every consumer is gated by the module 'landmarksTauride' (docs/AREAS.md section 9).
// ============================================================================

/** Height of the podium deck above the street (m): the mapped 21-22-step approaches climb it. */
export const PARADNY_Y = 3.3;

/** The courtyard deck boundary, inferred from the OSM building edges, the access stairs and reference photographs (source paradny-surface.js): 14 vertices, x 741 .. 1055, z -1205 .. -873, 74,115 m2.
 *  { o: outer ring [x, z, x, z, ...], h: holes (none) }. */
export const PARADNY_PODIUM = { o: [744, -884, 741, -970, 777, -995, 777, -1095, 839, -1095, 840, -1137, 978, -1137, 983, -1205, 1055, -1203, 1041, -905, 974, -898, 965, -881, 900, -873, 820, -875], h: [] };

/** True when (x, z) is inside the podium ring (even-odd). */
export function inParadny(x, z) {
  let c = false;
  const r = PARADNY_PODIUM.o;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    if ((r[i + 1] > z) !== (r[j + 1] > z) && x < (r[j] - r[i]) * (z - r[i + 1]) / (r[j + 1] - r[i + 1]) + r[i]) c = !c;
  }
  return c;
}

/** The mapped stair ways (highway=steps) of the podium approaches: the STEPS records of the data, in the order of the data, pts = [x, z, x, z, ...] from the street up. w1266791538 and w1303266326 are the
 *  two halves of one L-shaped stair (spliced below); the facade records carry more fields (count, incline, handrail ...) that nothing here reads. */
export const PARADNY_STEPS = [
  { id: 'w1266791538', pts: [1047.1, -955.2, 1047.3, -959.4] },
  { id: 'w1303266326', pts: [1047.3, -959.4, 1042.8, -959.5] },
  { id: 'w1266791536', pts: [1048, -976.5, 1047.8, -972.4, 1043.6, -972.6] },
  { id: 'w1266791542', pts: [1050, -1015.5, 1050.3, -1020.1, 1046.3, -1020.3] },
  { id: 'w1266791545', pts: [1051.1, -1035.5, 1050.9, -1030.3, 1046.8, -1030.5] },
  { id: 'w1266791548', pts: [1053.3, -1079.5, 1053.4, -1083.8, 1049.4, -1084.1] },
  { id: 'w1266791551', pts: [1054.4, -1099.8, 1054.1, -1095.8, 1049.4, -1095.8] },
  { id: 'w1266791557', pts: [1056.5, -1139.3, 1056.6, -1143.7, 1053, -1143.8] },
  { id: 'w1266791560', pts: [1057.6, -1158.9, 1057.3, -1154.4, 1052.5, -1154.6] },
];

/** The eight stairs (w1266791538 with the tail of w1303266326), 1.8 m wide. */
export const PARADNY_STAIRS = PARADNY_STEPS.filter((s) => s.id !== 'w1303266326')
  .map((s) => ({ ...s, pts: s.id === 'w1266791538' ? [...s.pts, ...PARADNY_STEPS.find((t) => t.id === 'w1303266326').pts.slice(2)] : s.pts, w: 1.8 }));

/** Every stair segment is one flight and every vertex a landing; the height climbs linearly along the whole polyline (0 at the street end, PARADNY_Y at the top). A flight is
 *  { id, w, pts: [x0, z0, x1, z1] (shortened by 0.9 m at the landings), start, end (the heights at its ends), total (its length) }, a landing { x, z, y, w }. */
export const PARADNY_FLIGHTS = [], PARADNY_LANDINGS = [];
for (const s of PARADNY_STAIRS) {
  const pts = Array.from({ length: s.pts.length / 2 }, (_, i) => s.pts.slice(i * 2, i * 2 + 2));
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let along = 0;
  for (let i = 0; i < lens.length; i++) {
    const a = pts[i], b = pts[i + 1], len = lens[i], dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, lo = i ? .9 : 0, hi = .9;
    PARADNY_FLIGHTS.push({ id: s.id, w: s.w, pts: [a[0] + dx * lo, a[1] + dz * lo, b[0] - dx * hi, b[1] - dz * hi], start: PARADNY_Y * along / total, end: PARADNY_Y * (along + len) / total });
    along += len;
    PARADNY_LANDINGS.push({ x: b[0], z: b[1], y: PARADNY_Y * along / total, w: 1.82 });
  }
}

// Start-up performance: layout.heightAt calls the deck for every point of the whole map, so ONE bounding box of the podium + stairs rejects almost every call before any polygon / segment work;
// the flight lengths are computed once.
for (const r of PARADNY_FLIGHTS) {
  const pts = r.pts;
  let total = 0;
  for (let i = 0; i + 3 < pts.length; i += 2) total += Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
  r.total = total;
}

/** The bounding box [x0, x1, z0, z1] of the podium ring, the landings and the flights (the box of the height patch; paradnyDeckY rejects outside it first). */
export const PARADNY_BOX = (() => {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  const add = (x, z, m) => { x0 = Math.min(x0, x - m); x1 = Math.max(x1, x + m); z0 = Math.min(z0, z - m); z1 = Math.max(z1, z + m); };
  const o = PARADNY_PODIUM.o;
  for (let i = 0; i < o.length; i += 2) add(o[i], o[i + 1], 0);
  for (const p of PARADNY_LANDINGS) add(p.x, p.z, p.w / 2 + .01);
  for (const r of PARADNY_FLIGHTS) for (let i = 0; i < r.pts.length; i += 2) add(r.pts[i], r.pts[i + 1], r.w / 2 + .01);
  return [x0, x1, z0, z1];
})();

/** Height of the Paradny surface at (x, z): a landing, else a flight (linear along its polyline), else the podium deck PARADNY_Y; null anywhere else (the caller keeps the terrain). */
export function paradnyDeckY(x, z) {
  const B = PARADNY_BOX;
  if (x < B[0] || x > B[1] || z < B[2] || z > B[3]) return null;
  for (const p of PARADNY_LANDINGS) if (Math.abs(x - p.x) <= p.w / 2 && Math.abs(z - p.z) <= p.w / 2) return p.y + .015;
  for (const r of PARADNY_FLIGHTS) {
    const pts = r.pts, total = r.total;
    let along = 0;
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const dx = pts[i + 2] - pts[i], dz = pts[i + 3] - pts[i + 1], len = Math.hypot(dx, dz);
      const u = ((x - pts[i]) * dx + (z - pts[i + 1]) * dz) / len, v = Math.abs((x - pts[i]) * dz - (z - pts[i + 1]) * dx) / len;
      if (u >= 0 && u <= len && v <= r.w / 2) return r.start + (r.end - r.start) * (along + u) / total;
      along += len;
    }
  }
  return inParadny(x, z) ? PARADNY_Y : null;
}
