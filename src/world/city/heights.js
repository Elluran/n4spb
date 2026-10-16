// heights.js - cornice heights for the OSM records that carry neither `building:levels` nor `height` (the west extension: ~300 records, side streets and courtyards).
// layout.heightOf gives them a kind default (21 m on wide streets, 17.5 m on narrow ones, 9 m for annexes). A real block is far more uniform than that: the houses of one
// street front are built to the same regulated cornice (a few storeys of difference at most), so an unknown house takes the MEDIAN storey count of the mapped houses
// around it (weights 1 / (distance + 12 m), radius 55 m, at least two mapped houses of > 150 m2), the research tables (known.js) counting as mapped.
// Returns the cornice height in metres (era table 'rent', architecture.md section A) - never invented from nothing: no neighbours -> layout.heightOf.
//
// Petrograd side / Vasilievsky Island (district.js; 500 such records, tools/city-petro-audit.mjs --heights): the street default made 21 m tenements of zoo houses, park cafes and
// moored ships, and 17.5 m blocks of lone yard and factory buildings. There (and only there: every older record takes exactly the old path)
//   * a pavilion (a record inside a park, a garden or the Zoo; a boat) is 5 m, 8 m from 600 m2;
//   * a house with no mapped neighbour within 55 m looks 110 m around (three houses at least) and never rises above five storeys by inference;
//   * a house with nobody around at all goes by its footprint: 9 m under 400 m2, 13.5 m under 1 500 m2, else 17.5 m.
import { BUILDINGS } from '../data/city.js';
import * as L from '../layout.js';
import { knownFor } from './known.js';
import { districtOf, isPavilion, isVoFresh, voZoneOf, VO_MEDIAN } from './district.js';

const RENT = [0, 5.0, 9.0, 13.5, 17.5, 21.0, 23.5, 25.5, 27];
const CELL = 64, R = 55;
// cornice by OSM kind for records of the new regions that carry no storeys (storeys x the era table: a school of the 1930s has three, a kindergarten two)
const DISTRICT_KIND_H = { boathouse: 4.5, toilets: 3.5, guardhouse: 3.5, steps: 1.5, base: 3, greenhouse: 5, stadium: 12, grandstand: 10, parking: 9, kindergarten: 9, school: 13.5, college: 13.5,
  university: 17.5, hospital: 13.5, clinic: 13.5, dormitory: 17.5, chapel: 8, train_station: 9, sports_centre: 12, sports_hall: 12, public: 13.5, civic: 13.5, retail: 9, pavilion: 5, ship: 5, boat: 5 };
let grid = null;
function build() {
  grid = new Map();
  for (const b of BUILDINGS) {
    if (b.skip || b.dupOf || b.underground || (b.layer != null && b.layer < 0) || (b.minH || 0) > 0.5 || !(b.area > 150) || b.cx === undefined) continue;
    const kn = knownFor(b);
    let n = kn && kn.floors ? kn.floors : b.levels ? b.levels : b.hSrc === 'height' && b.h ? Math.round((b.h - 1) / 3.9) : 0;
    if (!n || n < 2 || n > 8) continue;
    if (L.eraOf(b) !== 'rent') continue;                            // Stalin / panel / modern infill do not set the cornice of a historical block
    const k = Math.floor(b.cx / CELL) + ',' + Math.floor(b.cz / CELL);
    let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push({ x: b.cx, z: b.cz, n });
  }
}
/** Storeys inferred from the mapped neighbours of b (or 0). rad / min: search radius (m) and the least number of mapped houses (the defaults are the rule of the older regions). */
export function neighbourStoreys(b, rad = R, min = 2) {
  if (!grid) build();
  const items = [];
  for (let i = Math.floor((b.cx - rad) / CELL); i <= Math.floor((b.cx + rad) / CELL); i++) for (let j = Math.floor((b.cz - rad) / CELL); j <= Math.floor((b.cz + rad) / CELL); j++) {
    for (const a of grid.get(i + ',' + j) || []) { const d = Math.hypot(a.x - b.cx, a.z - b.cz); if (d <= rad && d > 1) items.push({ n: a.n, w: 1 / (d + 12) }); }
  }
  if (items.length < min) return 0;
  items.sort((p, q) => p.n - q.n);
  let tot = 0; for (const it of items) tot += it.w;
  // Math.round: OSM has `building:levels=3.5` / 4.5 (w108219870 on the 12th line of Vasilievsky Island): RENT[3.5] is undefined and the house got NaN floors, NaN vertices (2026-10-07); integers are unchanged
  let acc = 0; for (const it of items) { acc += it.w; if (acc >= tot / 2) return Math.round(Math.max(3, Math.min(6, it.n))); }
  return 0;
}
/** A corner house: its outline has a vertex within 12 m of the pavement edge of two different named streets (a junction). The records of the island without storeys get +1 there (a corner
 *  house of the 1900s carries a bay or a chamfer and is raised one storey: docs/research/vo-roster-architecture.md 6.1). */
const _corner = new Map();
function isCornerHouse(b) {
  let v = _corner.get(b.id); if (v !== undefined) return v;
  v = false;
  const o = b.polys[0].o, step = Math.max(2, 2 * Math.ceil(o.length / 2 / 24));
  for (let i = 0; i < o.length && !v; i += step) {
    const names = new Set();
    for (const r of L.roadsNear(o[i], o[i + 1], 12, { drivable: true })) if (r.road.name && r.road.hw !== 'service') { const m = /^(\d+)(?:-\d+)?-я лини/.exec(r.road.name); names.add(m ? 'L' + Math.floor(Number(m[1]) / 2) : r.road.name); }      // one street per pair of Lines
    v = names.size >= 2;
  }
  _corner.set(b.id, v);
  return v;
}
/** true when another drawn record (not a part of the same house) reaches into the footprint of b: the OSM footprints overlap along a wall. Such a pair keeps equal storeys: a record raised above an
 *  overlapping neighbour (w996655585 and r1242812 of the 5th / 6th Line, 4 against 5 storeys) made both hide the wall between them (wall audit: a 3.6 m hole). */
function overlapsOther(b) {
  for (const poly of b.polys) {
    const o = poly.o, n = o.length / 2; let cx = 0, cz = 0; for (let i = 0; i < o.length; i += 2) { cx += o[i]; cz += o[i + 1]; } cx /= n; cz /= n;
    for (let i = 0; i < o.length; i += 2) {
      const dx = cx - o[i], dz = cz - o[i + 1], d = Math.hypot(dx, dz) || 1, g = L.buildingAt(o[i] + dx / d * 0.4, o[i + 1] + dz / d * 0.4);
      if (g && g.id !== b.id && !g.skip && g.parent !== b.id && (!b.parent || g.parent !== b.parent) && g.id !== b.parent && (g.minH || 0) < 3) return true;
    }
  }
  return false;
}
/** Storeys of an island record without mapped levels: the median of the mapped houses around (55 m, then 110 m), else the district median of section 4; +1 for a corner house (never above 7); small
 *  footprints are yard wings (2-3 storeys). Returns the cornice height. */
function voHeight(b) {
  let n = neighbourStoreys(b) || Math.min(5, neighbourStoreys(b, 110, 3));
  const zone = voZoneOf(b.cx, b.cz, b.addr && b.addr.street);
  if (!n) n = VO_MEDIAN[zone] || 4;
  if (b.area < 250) n = Math.min(n, 2); else if (b.area < 450) n = Math.min(n, 3);
  if (n >= 3 && n < 7 && /^v(quay|bolshoy|sredny|maly|linesE|linesW|gavan)$/.test(zone) && isCornerHouse(b) && !overlapsOther(b)) n += 1;
  return RENT[Math.max(2, Math.min(7, n))];
}
/** Cornice height of a record (replaces layout.heightOf for the generic grammar). */
export function heightFor(b) {
  const plain = L.heightOf(b);
  if (b.levels || b.hSrc === 'height' || b._raised || b._fill) return plain;
  const dist = districtOf(b);
  if (dist && isPavilion(b)) return b.area >= 600 ? 8 : 5;
  if (dist && b.kind && L.DEFAULT_H[b.kind] === undefined) {
    // kinds without a default in layout.js fell through to the tenement default (a 21 m boathouse): a height by kind, for the new regions only
    const kh = DISTRICT_KIND_H[b.kind];
    if (kh !== undefined) return kh;
    if (b.kind === 'industrial' || b.kind === 'warehouse' || b.kind === 'hangar' || b.kind === 'manufacture') return b.area < 400 ? 6 : b.area < 2000 ? 10 : 13.5;
  }
  if (b.kind && b.kind !== 'yes' && b.kind !== 'apartments' && b.kind !== 'residential' && b.kind !== 'commercial' && b.kind !== 'office' && b.kind !== 'hotel') return plain;
  if (!(b.area > 150)) return plain;
  if (dist && isVoFresh(b)) return voHeight(b);
  const n = neighbourStoreys(b);
  if (n || !dist) return n ? RENT[n] : plain;
  const far = neighbourStoreys(b, 110, 3);
  if (far) return RENT[Math.min(5, far)];
  return b.area < 400 ? RENT[2] : b.area < 1500 ? RENT[3] : RENT[4];
}
