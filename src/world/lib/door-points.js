// lib/door-points.js - DOOR POINTS of the buildings a landmark module claims (M7, docs/AREAS.md 8.7 "door points of every claimed building are gone"): `city` publishes no `entrances`
// for a claimed building (city/shops.js:143 puts one point 0.6 m outside the wall at every parade / shop door that the wall composition of city/walls.js chose, rotY facing out), and the modules
// copied in M5 draw their doors without publishing them, so the environment planted trees at them (PRUNE_SERVICES) and nothing stood there. doorPoints(recs) derives the points from the facade
// data instead of the city's wall composition (which needs the city's style tables and random streams):
//   * the OSM entrance=* nodes of the data (DOORS of src/world/data/city.js; 81 of them lie on the claimed footprints of the North) that lie within 1.2 m of an outer edge of the record are
//     projected onto that edge and pushed 0.6 m along its outward normal, exactly the offset and the rotY of city/shops.js; `kind` is the OSM entrance value (main, yes, staircase, shop ...);
//   * a record without a mapped door gets the parade-door rule of city/walls.js in its plain form: on every outer edge of 5 m or more that faces a named street (the test corridor() uses for its
//     fronts: L.nearestRoad 4 m out, named, within 18 m) round(len / 20) doors at (k + 0.5) / nd of the edge, `kind: 'parade'`, without the per-building hash jitter of the city.
// Pure data (no three.js of its own); points closer than 1.5 m to one already made are dropped (a part shares its edges with its outline). Consumers: environment.js (PRUNE_SERVICES door clearings),
// people/nav.js reads city and metro doors only (see docs/AREAS.md section 10 of M7). M7 polish: moved here from landmarksNorthFull/doors.js (which re-exports it) because landmarksOktyabrsky built the
// door points of the hall with it and modules do not import each other; the footprint edges are computed by the local ringEdges (the same arithmetic as landmarksD/kit.js ringEdges, which this file
// no longer imports: lib/ does not depend on a landmark module's kit).
import * as L from '../layout.js';
import { DOORS } from '../data/city.js';
import { ringFromFlat, signedArea } from './massing.js';

/** the edges of the rings of a footprint { o, h }: { i, hole, a, b, len, n } with the outward normal n (right for outer rings and for courtyard holes); edges shorter than minLen are skipped (landmarksD/kit.js ringEdges) */
function ringEdges(poly, minLen = 0.05) {
  const out = [];
  const rings = [{ r: ringFromFlat(poly.o), hole: false }, ...poly.h.map((h) => ({ r: ringFromFlat(h), hole: true }))];
  for (const { r, hole } of rings) {
    if (r.length < 3) continue;
    const A = signedArea(r);
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < minLen) continue;
      let nx = dz / len, nz = -dx / len;
      if ((A > 0) !== !hole) { nx = -nx; nz = -nz; }
      out.push({ i, hole, a, b, len, n: [nx, nz] });
    }
  }
  return out;
}

const OUT = 0.6, SNAP = 1.2, PER = 20, MIN_LEN = 5, DEDUPE = 1.5;

/** [{ x, z, rotY, bldg, kind }] for the records (the facade's building records; `dupOf` records are skipped; `o.perRec` = a Map that receives the count per id) */
export function doorPoints(recs, o = {}) {
  const out = [], perRec = o.perRec || null;
  const push = (x, z, e, bldg, kind) => {
    const px = x + e.n[0] * OUT, pz = z + e.n[1] * OUT;
    if (out.some((d) => Math.hypot(d.x - px, d.z - pz) < DEDUPE)) return false;
    out.push({ x: px, z: pz, rotY: Math.atan2(e.n[0], e.n[1]), bldg, kind }); return true;
  };
  for (const b of recs) {
    if (!b || !b.polys || b.dupOf) continue;
    const edges = b.polys.flatMap((p) => ringEdges({ o: p.o, h: p.h || [] }).filter((e) => !e.hole));
    if (!edges.length) continue;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const e of edges) { x0 = Math.min(x0, e.a[0], e.b[0]); x1 = Math.max(x1, e.a[0], e.b[0]); z0 = Math.min(z0, e.a[1], e.b[1]); z1 = Math.max(z1, e.a[1], e.b[1]); }
    let n = 0;
    for (const d of DOORS) {
      if (d.x < x0 - SNAP || d.x > x1 + SNAP || d.z < z0 - SNAP || d.z > z1 + SNAP) continue;
      let best = null, bd = SNAP;
      for (const e of edges) {
        const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1], l2 = dx * dx + dz * dz || 1;
        let t = ((d.x - e.a[0]) * dx + (d.z - e.a[1]) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = e.a[0] + dx * t, pz = e.a[1] + dz * t, dist = Math.hypot(d.x - px, d.z - pz);
        if (dist < bd) { bd = dist; best = { e, px, pz }; }
      }
      if (best && push(best.px, best.pz, best.e, b.id, d.kind || 'yes')) n++;
    }
    if (!n) for (const e of edges) {
      if (e.len < MIN_LEN) continue;
      const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2;
      if (!L.nearestRoad(mx + e.n[0] * 4, mz + e.n[1] * 4, { named: true, maxDist: 18 })) continue;
      const nd = Math.max(1, Math.round(e.len / PER));
      for (let k = 0; k < nd; k++) { const t = (k + 0.5) / nd; if (push(e.a[0] + (e.b[0] - e.a[0]) * t, e.a[1] + (e.b[1] - e.a[1]) * t, e, b.id, 'parade')) n++; }
    }
    if (perRec) perRec.set(b.id, n);
  }
  return out;
}
