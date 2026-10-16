// people/area.js - the pedestrian surfaces of the ENGINEERING CASTLE reach (docs/MARS-BRIEF.md; the Mars Field and the Summer Garden of that brief lie north of the strip): a 3 m raster of "where a person may walk and how much a
// place is wanted". The castle module draws its OWN footways and the generic pavement graph of the streets module is cut into small pieces there, so the routing lattice (nav.js) learns the surfaces from here:
//   cat 1  pavement strip (streets.sidewalks centre line, 6 m round it)                                         weight 0.2
//   cat 4  castle precinct footway (landmarksCastle paths, Klenovaya alley, the south terrace)                  weight 0.3, walkable although the streets cover says "no pavement"
// Everything is read from the layout groups / the services / the baked OSM data (data/city.js); every input is optional.
import { AREAS } from '../data/city.js';

// the raster covers the castle reach: the Mikhailovsky Castle, the Mikhailovsky Garden and the streets round them (x -1470 .. -600, z -1130 (the data extent) .. -640)
const X0 = -1470, X1 = -600, Z0 = -1130, Z1 = -640, CS = 3;
const NX = Math.ceil((X1 - X0) / CS), NZ = Math.ceil((Z1 - Z0) / CS);
const CASTLE_BOX = [-810, -640, -960, -700];                           // the castle precinct: the zone of the head-count cap
const ringHas = (r, x, z) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };

export function makeArea(ctx, L, st) {
  const cOsm = new Set(L.groupOsm ? L.groupOsm('landmarksCastle') : []);
  const cat = new Uint8Array(NX * NZ), idx = (x, z) => { const i = Math.floor((x - X0) / CS), j = Math.floor((z - Z0) / CS); return i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : j * NX + i; };
  /** burn the buffer (half width hw) round a polyline into the raster as `c` (a lower category never overwrites a higher one except 1) */
  const burn = (pts, hw, c) => {
    for (let s = 0; s + 1 < pts.length; s++) {
      const ax = pts[s][0], az = pts[s][1], bx = pts[s + 1][0], bz = pts[s + 1][1];
      const ex = Math.min(ax, bx) - hw, fx = Math.max(ax, bx) + hw, ez = Math.min(az, bz) - hw, fz = Math.max(az, bz) + hw;
      if (fx < X0 || ex > X1 || fz < Z0 || ez > Z1) continue;
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      for (let j = Math.max(0, Math.floor((ez - Z0) / CS)); j <= Math.min(NZ - 1, Math.floor((fz - Z0) / CS)); j++) for (let i = Math.max(0, Math.floor((ex - X0) / CS)); i <= Math.min(NX - 1, Math.floor((fx - X0) / CS)); i++) {
        const px = X0 + (i + 0.5) * CS, pz = Z0 + (j + 0.5) * CS, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
        if (Math.hypot(px - ax - dx * t, pz - az - dz * t) <= hw + CS * 0.35) { const k = j * NX + i; if (c === 1 ? cat[k] === 0 : cat[k] < c || cat[k] === 1) cat[k] = c; }
      }
    }
  };
  const burnRing = (o, c) => {                                                       // an area polygon (flat [x, z, ...] ring)
    const r = []; for (let i = 0; i < o.length; i += 2) r.push([o[i], o[i + 1]]); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    if (x1 < X0 || x0 > X1 || z1 < Z0 || z0 > Z1) return;
    for (let j = Math.max(0, Math.floor((z0 - Z0) / CS)); j <= Math.min(NZ - 1, Math.floor((z1 - Z0) / CS)); j++) for (let i = Math.max(0, Math.floor((x0 - X0) / CS)); i <= Math.min(NX - 1, Math.floor((x1 - X0) / CS)); i++) { const px = X0 + (i + 0.5) * CS, pz = Z0 + (j + 0.5) * CS; if (ringHas(r, px, pz)) { const k = j * NX + i; if (cat[k] < c || cat[k] === 1) cat[k] = c; } }
  };
  // 1. the pavement strips of the streets module
  for (const s of (st && st.sidewalks) || []) if (s.pts && s.pts.length > 1) burn(s.pts, 5.5, 1);
  // 2. the footways: the claimed ones by the castle module, the generic ones of the castle square / Klenovaya alley
  let nC = 0;
  for (const p of (st && st.paths) || []) {
    if (!p.pts || p.pts.length < 2 || p.hw === 'steps') continue;
    if (cOsm.has(p.id) || (p.pts[0][0] > -800 && p.pts[0][0] < -640 && p.pts[0][1] > -960 && p.pts[0][1] < -700)) { burn(p.pts, Math.max(1.3, (p.w || 3) / 2) + 0.3, 4); nC++; }
  }
  // 3. the squares of the castle group
  for (const a of AREAS) if (cOsm.has(a.id) && a.hw !== 'steps') for (const p of a.polys) burnRing(p.o, 4);
  const info = { nC };

  const catAt = (x, z) => { const k = idx(x, z); return k < 0 ? 0 : cat[k]; };
  const area = {
    info, catAt,
    /** the lattice may put a node here although the streets cover says "no pavement" (the castle footways) */
    walk: (x, z) => catAt(x, z) === 4,
    /** the zone weight of the surface itself (added to the hot spots of zones.js): the lattice exists where the weight is >= 0.16 */
    weight: (x, z) => { const c = catAt(x, z); return c === 4 ? 0.3 : c === 1 ? 0.2 : 0; },
    /** quiet-zone index for the head-count cap (people.js DENSITY.mars.zones): 0 the castle precinct, else -1 */
    zone: (x, z, m = 0) => {                                             // m > 0: also 'in the zone' when it is within ~m metres (the targets of the goals use a margin: people pass through the zone on the way, they do not queue up at its border)
      if (m > 0) { const k0 = area.zone(x, z); if (k0 >= 0) return k0; for (const [dx, dz] of [[m, 0], [-m, 0], [0, m], [0, -m]]) { const k = area.zone(x + dx, z + dz); if (k >= 0) return k; } return -1; }
      return x > CASTLE_BOX[0] && x < CASTLE_BOX[1] && z > CASTLE_BOX[2] && z < CASTLE_BOX[3] ? 0 : -1;
    },
  };
  return area;
}
