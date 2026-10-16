// exempt.js - houses that must not get the random decorations that would cover something a landmark module draws ON their wall.
//
// restoreExempt(b): true for a house whose outline lies within REACH metres of a CLAIMED mapped monument / memorial / plaque node (data/city.js MONUMENTS + layout claims).
// Such a node is drawn by a landmark module as a wall piece (landmarksPetroMonuments: the Shostakovich plaque on Bolshaya Pushkarskaya 37, the topographers' panel on Pionerskaya 20 ...)
// at 1.4 - 3 m up the wall; the generic restoration scaffold (scaffold.js: a plywood hoarding 2.4 m high 1.5 m off the wall, plank platform at 2.4 m, canvas net on the facade, F.NET) would hide it.
// The rule is generic (every claimed node, not a list of ids) and applies to the new regions only (archetypes.describe: `dist`): the older regions never see it.
// The answer is per HOUSE (outline id): every part of a house agrees, as the restoration hash itself does (archetypes: hid).
import { BUILDINGS, MONUMENTS } from '../data/city.js';
import * as L from '../layout.js';

const REACH = 4;                       // m from the outline: the mapped node sits on the wall or a few metres off it (Shostakovich plaque: inside the outline of the Benois house; topographers panel: 2.9 m)
const CELL = 64;
let _fam = null;

const famOf = (b) => b.parent || (b._fillOf ? (L.buildingById(b._fillOf) || {}).parent || b._fillOf : b.id);

function distToRing(o, x, z) {
  let best = Infinity, inside = false;
  const n = o.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const ax = o[j * 2], az = o[j * 2 + 1], bx = o[i * 2], bz = o[i * 2 + 1];
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
    const d = Math.hypot(x - (ax + t * dx), z - (az + t * dz));
    if (d < best) best = d;
  }
  return inside ? 0 : best;
}

function families() {
  if (_fam) return _fam;
  _fam = new Set();
  const nodes = MONUMENTS.filter((m) => m && typeof m.x === 'number' && L.isClaimed(m.id));
  if (!nodes.length) return _fam;
  const grid = new Map();
  for (const m of nodes) { const k = Math.floor(m.x / CELL) + ',' + Math.floor(m.z / CELL); (grid.get(k) || grid.set(k, []).get(k)).push(m); }
  for (const b of BUILDINGS) {
    if (b.skip || !b.polys || !b.polys.length) continue;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of b.polys) { const o = p.o; if (!o) continue; for (let i = 0; i < o.length; i += 2) { if (o[i] < x0) x0 = o[i]; if (o[i] > x1) x1 = o[i]; if (o[i + 1] < z0) z0 = o[i + 1]; if (o[i + 1] > z1) z1 = o[i + 1]; } }
    if (x0 === Infinity) continue;
    const gx0 = Math.floor((x0 - REACH) / CELL), gx1 = Math.floor((x1 + REACH) / CELL), gz0 = Math.floor((z0 - REACH) / CELL), gz1 = Math.floor((z1 + REACH) / CELL);
    if ((gx1 - gx0 + 1) * (gz1 - gz0 + 1) > 400) continue;                       // a footprint of several km (water, parks mapped as buildings) has no wall to hang a plaque on
    for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
      const list = grid.get(gx + ',' + gz);
      if (!list) continue;
      for (const m of list) {
        if (m.x < x0 - REACH || m.x > x1 + REACH || m.z < z0 - REACH || m.z > z1 + REACH) continue;
        if (b.polys.some((p) => p.o && distToRing(p.o, m.x, m.z) <= REACH)) { _fam.add(b.parent || b.id); break; }
      }
    }
  }
  return _fam;
}

/** True when a claimed monument / memorial / plaque node stands on or within REACH m of the house (outline id or any part of it). */
export const restoreExempt = (b) => families().has(famOf(b));
