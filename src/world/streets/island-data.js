// streets/island-data.js - pure data of the islands round 2 street rules (no imports but region.js; net.js, paths.js and islands.js read it). Every entry asks region.js isIsland() first.
import { isIsland } from './region.js';

/** mapped footways that are NOT walkable ground: the permissive gravel / asphalt footways inside the closed, fenced palace garden of Kamenny Island (ring r10254219; landmarksKamennyPalace fences and gates it,
 *  docs/research/islands2-requests-landmarksKamennyPalace.md 7, kamenny-2026.md 5.1): no ribbon, no routing line (people/nav reads streets.paths) */
// + (streets owner 2) w739448361: the covered passage through the Yelagin Kitchen block (landmarksYelaginKitchen claims it; its door is painted shut and the walls are solid: islands2-requests-landmarksYelaginKitchen.md, streets 2)
export const CLOSED_WALKS = new Set(['w546166965', 'w640402009', 'w640402010', 'w640402011', 'w739448361']);
export const closedWalk = (r) => CLOSED_WALKS.has(r.id) && isIsland(r.pts[0], r.pts[1]);

/** CARRIAGEWAYS THAT OSM DRAWS TOO WIDE OR TOO CLOSE TO A SIGHT (docs/research/islands2-requests-landmarksPetrovskyYacht.md, streets 1): Petrovskaya kosa (w218269115, unclassified, 7.2 m by class) is about 5.5 m wide in the
 *  Commons photos and the office "Петровская коса 3/6" (r21379094) and the transformer hut (r21379092) stand directly at its north edge with no pavement; the mapped centre line runs through the office corner (1.4 m).
 *  w = the carriageway width (m); noPark = no kerbside pockets (they would put 2.2 m of asphalt more under the buildings); shift = a local bump of the centre line (cosine profile): at = [x, z] its middle, half = half length (m),
 *  d = the offset (m) toward the unit normal (nx, nz). The width / the bump apply to the whole way / the stretch in the island regions only. */
export const WAY_FIX = {
  w218269115: { w: 5.5, noPark: true, shift: { at: [-5703, -3372], half: 26, d: 2.0, nx: -0.312, nz: 0.95 } },
};
export const wayFix = (r) => { const f = WAY_FIX[r.id]; return f && r.pts && isIsland(r.pts[0], r.pts[1]) ? f : null; };

/** the points of a way [[x, z], ...] with the centre-line bump of its WAY_FIX: the polyline is resampled every 4 m inside the bump and the points move along the normal by d * (1 + cos) / 2; the end points stay */
export function bumpPoints(pts, f) {
  const s = f.shift; if (!s) return pts;
  const out = [pts[0]];
  const near = (p) => Math.hypot(p[0] - s.at[0], p[1] - s.at[1]) < s.half + 4;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), k = near(a) || near(b) || near([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]) ? Math.max(1, Math.ceil(l / 4)) : 1;
    for (let j = 1; j <= k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  return out.map((p, i) => {
    if (i === 0 || i === out.length - 1) return p;
    const d = Math.hypot(p[0] - s.at[0], p[1] - s.at[1]); if (d >= s.half) return p;
    const o = s.d * (1 + Math.cos(Math.PI * d / s.half)) / 2;
    return [p[0] + s.nx * o, p[1] + s.nz * o];
  });
}
