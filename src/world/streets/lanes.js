// streets/lanes.js - lane structure of a way (counts, lateral boundaries) shared by the markings and the lane graph service.
// Offsets are lateral distances from the way's centreline along its right normal (-tz, tx): + = right. Right-hand traffic:
// lanes that run WITH the polyline (+s) are on the right, lanes against it on the left.
import { clamp } from './util.js';

/** number of lanes running with (+s, nF) and against (-s, nB) the polyline */
export function laneInfo(w) {
  if (w.rank === 0) return { nF: 1, nB: w.oneway ? 0 : 1 };
  if (w.oneway) return { nF: Math.max(1, w.lanesTag || Math.round(w.w / 3.4)), nB: 0 };
  if (w.lanesF && w.lanesB) return { nF: w.lanesF, nB: w.lanesB };
  const tot = w.lanesTag || (w.w >= 9 ? 4 : 2);
  return { nF: Math.max(1, Math.ceil(tot / 2)), nB: Math.max(1, Math.floor(tot / 2)) };
}

/** lateral lane boundaries at vertex i of way w, left to right (carriageway only, parking pockets excluded), travel direction per lane
 *  (+1 with the polyline, -1 against it) and the index of the centre line boundary (-1 on one-way roads). The centre line is where the
 *  lanes against and with the polyline meet: with an uneven split (2 + 1) it sits off the centreline so every lane keeps the same width. */
export function laneBounds(w, i) {
  const { nF, nB } = w.lanes, h = w.hb[i], tot = nF + nB, lw = 2 * h / tot;
  const b = [], dir = [];
  for (let k = 0; k <= tot; k++) b.push(-h + k * lw);
  for (let k = 0; k < nB; k++) dir.push(-1);
  for (let k = 0; k < nF; k++) dir.push(1);
  return { b, dir, mid: nB > 0 ? nB : -1, lw };
}

export function prepLanes(w) {
  if (w.lanes) return;
  w.lanes = laneInfo(w);
  // Widths repeat for most vertices of a way. These records are immutable;
  // reuse exactly equal cross-sections instead of retaining millions of
  // identical boundary/direction arrays across the expanded road network.
  const byWidth = new Map();
  w.bnd = w.x.map((_, i) => {
    const h = w.hb[i];
    let bounds = byWidth.get(h);
    if (!bounds) { bounds = laneBounds(w, i); byWidth.set(h, bounds); }
    return bounds;
  });
}

/** interpolated lateral boundary j at the arclength sample q returned by wayAt (q.k, q.f) */
export const latAt = (w, q, j) => w.bnd[q.k].b[j] + (w.bnd[q.k + 1].b[j] - w.bnd[q.k].b[j]) * q.f;
export { clamp };
