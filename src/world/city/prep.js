// prep.js - the draw records of the city: OSM records normalised for the builder (before archetypes.describe / edges.analyse).
//
// Two data traps of OSM building parts (found by the west-extension audit):
//  1. A RAISED part (min_level / min_height > 0: an attic storey, a tower on a base, a room over an arch) carries its ABSOLUTE top (`h`, or `levels` counted from the ground).
//     The city grammar draws y0 = minH .. y0 + heightOf(b), i.e. it used to add the top to the bottom: a 6-level attic part with min_level 5 became a 40 m block that floated
//     over the street (Nevsky 22-24, (-1509,-402)). `view(b)` gives such a part its real THICKNESS (top - bottom, storeys from the era table so the floor lines continue).
//  2. The body BELOW a raised part is often missing: the outline (building=yes) is hidden because it has parts, and no ground part covers the footprint of the raised one.
//     `prepare` synthesises a base record (id `<part>~f`, same footprint, y 0 .. bottom) for every raised part that has nothing under it and does not span a carriage arch
//     (OSM passage way) or a bridge: no house floats any more. The base gets `noDeck` (the raised part stands on it).
//  3. PLINTH PARTS (regions baked from the Petrograd-side extension on; the older regions are frozen): a complex mapped in 3D on a plinth (outline `height=0.5`, hidden because it
//     has parts; every part `min_height=0.5 .. 1.2`) floated half a metre above the ground with an open slit all round, and the walls of its neighbours were hidden from the
//     pavement up (11 gap runs of the wall audit on Petrovsky island, w265775222). Such a part stands on the ground: bottom 0, the mapped top kept.
//  Records of the landmark owners (owned groups) are not touched here; they only act as occluders (their view() thickness is used for the party walls of the neighbours).
import * as L from '../layout.js';
import { ROADS } from '../data/city.js';
import { knownFor } from './known.js';
import { regionOf } from './district.js';

const HC = { rent: [0, 5.0, 9.0, 13.5, 17.5, 21.0, 23.5, 25.5, 27], stalin: [0, 4.5, 8.5, 12.5, 17.0, 21.5, 25.0, 28.0, 30], panel: [0, 3.5, 6.5, 9.5, 12.5, 15.5, 18.5, 21.5, 24], modern: [0, 4.0, 7.0, 11.0, 15.0, 19.0, 22.5, 26.0, 30] };
const levelsTop = (era, n) => { const t = HC[era] || HC.rent; return n <= 8 ? t[Math.max(0, Math.round(n))] : t[8] + (n - 8) * 3.3; };

const ringHas = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const polyHas = (p, x, z) => ringHas(p.o, x, z) && !p.h.some((h) => ringHas(h, x, z));

/** Absolute { bottom, top } (m above the pavement) of a record. */
export function span(b) {
  const era = L.eraOf(b);
  const raised = (b.minH || 0) > 0.5;
  if (!raised) return { bottom: 0, top: L.heightOf(b) };
  const top = b.hSrc === 'height' && b.h ? b.h : b.levels ? levelsTop(era, b.levels) : (b.h || L.heightOf(b));
  const bottom = b.minLevel && !(b.hSrc === 'height' && b.minH) ? levelsTop(era, b.minLevel) : b.minH;
  return { bottom, top: Math.max(top, bottom + 1.0) };
}

const _views = new WeakMap();
/** The record the builder draws: ground records unchanged (same object), raised parts as a copy with minH = bottom and a thickness height. */
export function view(b) {
  let v = _views.get(b); if (v) return v;
  const mh = b.minH || 0;
  if (mh > 0 && mh <= 1.2 && regionOf(b)) {
    const g = b.hSrc === 'height' && b.h ? { ...b, minH: 0, minLevel: null, h: Math.max(b.h, mh + 1), _plinth: true } : { ...b, minH: 0, minLevel: null, _plinth: true };
    v = g.area < 40 && g.kind !== 'tower' && g.kind !== 'chimney' && L.heightOf(g) > 8 ? { ...g, hSrc: 'height', h: 6.5, levels: null, _tiny: true } : g;
    _views.set(b, v); return v;
  }
  if (!((b.minH || 0) > 0.5)) {
    // a tiny footprint with a storey count is a roof lift / lantern / stair shaft mapped as a part (the count is from the ground): drawn from the ground it would be a thin tower
    if (b.area < 40 && b.kind !== 'tower' && b.kind !== 'chimney' && L.heightOf(b) > 8) { v = { ...b, hSrc: 'height', h: 6.5, levels: null, _tiny: true }; _views.set(b, v); return v; }
    return b;
  }
  const { bottom, top } = span(b);
  v = { ...b, minH: bottom, hSrc: 'height', h: top - bottom, levels: null, minLevel: null, _raised: true, _src: b };
  _views.set(b, v);
  return v;
}

let _passSamples = null;
function passageSamples() {
  if (_passSamples) return _passSamples;
  const g = new Map(), add = (x, z) => { const k = Math.floor(x / 32) + ',' + Math.floor(z / 32); let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(x, z); };
  for (const r of ROADS) {
    if (!(r.passage || r.tunnel || r.covered) || !r.pts) continue;
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      const ax = r.pts[i], az = r.pts[i + 1], bx = r.pts[i + 2], bz = r.pts[i + 3], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
      for (let k = 0; k <= n; k++) add(ax + (bx - ax) * k / n, az + (bz - az) * k / n);
    }
  }
  return (_passSamples = g);
}
/** True when an OSM passage way runs within 3.5 m of (x, z). */
function nearPassage(x, z) {
  const g = passageSamples();
  for (let cx = Math.floor((x - 3.5) / 32); cx <= Math.floor((x + 3.5) / 32); cx++) for (let cz = Math.floor((z - 3.5) / 32); cz <= Math.floor((z + 3.5) / 32); cz++) {
    const a = g.get(cx + ',' + cz); if (!a) continue;
    for (let i = 0; i < a.length; i += 2) if (Math.abs(a[i] - x) < 3.5 && Math.abs(a[i + 1] - z) < 3.5) return true;
  }
  return false;
}

/** { cover, pass }: share (0..1) of sample points of the polygons of b inside a GROUND record other than b, and share of the UNCOVERED points that lie over a passage way. */
export function support(b) {
  let n = 0, c = 0, u = 0, up = 0;
  for (const poly of b.polys) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < poly.o.length; i += 2) { x0 = Math.min(x0, poly.o[i]); x1 = Math.max(x1, poly.o[i]); z0 = Math.min(z0, poly.o[i + 1]); z1 = Math.max(z1, poly.o[i + 1]); }
    const step = Math.max(1.5, Math.sqrt((x1 - x0) * (z1 - z0) / 80));
    for (let x = x0 + step / 2; x < x1; x += step) for (let z = z0 + step / 2; z < z1; z += step) {
      if (!polyHas(poly, x, z)) continue;
      n++;
      const g = L.buildingAt(x, z);
      if (g && g.id !== b.id && !(g.minH > 3)) c++; else { u++; if (nearPassage(x, z)) up++; }
    }
  }
  return { cover: n ? c / n : 1, pass: u ? up / u : 0 };
}

/** draw records of the generic modules: [{ b: record to describe / draw }], plus the synthesised bases. `skipFn(b)` = owned by a landmark module. */
export function prepare(buildings, skipFn) {
  const list = [], occluders = [], fills = [];
  const byId = new Map(buildings.map((q) => [q.id, q]));
  // the baked duplicate filter sometimes keeps the RAISED part and drops the ground body that carries it (Nevsky 22-24: w535381121 is `dupOf` the attic part w535381118): that body is the base, keep it
  const isBase = (b) => !!b.dupOf && (b.minH || 0) < 0.5 && ((byId.get(b.dupOf) || {}).minH || 0) > 2.5;
  for (const b of buildings) {
    if (b.skip || (b.dupOf && !isBase(b)) || (b.layer != null && b.layer < 0) || b.underground) continue;
    if (skipFn(b)) { occluders.push({ b: view(b), H: L.heightOf(view(b)) }); continue; }
    const v = view(b);
    let drop = false;
    if (v._raised && v.kind !== 'bridge' && (b.minH || 0) >= 2.5 && v.area > 6) {
      const bottom = v.minH, sp = span(b), kn = knownFor(b);
      const sup = support(b);
      if (sup.cover < 0.5 && sup.pass < 0.4) {
        // the research gives the cornice of the whole house: when it reaches the top of the raised part (an attic storey), the base is built that high and the part is dropped
        const merge = !!(kn && kn.H && kn.H >= sp.top - 3.0 && kn.H <= sp.top + 3.5 && sp.top - bottom <= 6);
        fills.push({ ...b, id: b.id + '~f', minH: 0, hSrc: 'height', h: merge ? kn.H : bottom, levels: null, minLevel: null, part: 1, parts: 0, skip: 0, noDeck: !merge && true, _fillOf: b.id, _fill: true, _fillKnown: merge });
        if (merge) drop = true;
      }
    }
    if (!drop) list.push(v);
  }
  for (const f of fills) list.push(f);
  // CLAIM RULE: a record that stands (> 60 % of its sample points) inside the footprint of a building a landmark module owns belongs to that landmark: ALL of its city output is dropped
  // (walls are hidden by the occluder but the deck, railings and balconies of such a part / duplicate used to stay: roof terraces hanging in the air). Its own claim (id / parent) is already handled above.
  let dropped = 0;
  if (occluders.length) {
    const grid = new Map(), C = 64;
    for (const o of occluders) for (const p of o.b.polys) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); }
      const rec = { p, box: [x0, x1, z0, z1] };
      for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) for (let cz = Math.floor(z0 / C); cz <= Math.floor(z1 / C); cz++) { const k = cx + ',' + cz; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(rec); }
    }
    const inOwned = (x, z) => { const a = grid.get(Math.floor(x / C) + ',' + Math.floor(z / C)); if (!a) return false; for (const r of a) { const b = r.box; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue; if (polyHas(r.p, x, z)) return true; } return false; };
    for (let k = list.length - 1; k >= 0; k--) {
      const b = list[k]; let n = 0, c = 0;
      for (const poly of b.polys) {
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < poly.o.length; i += 2) { x0 = Math.min(x0, poly.o[i]); x1 = Math.max(x1, poly.o[i]); z0 = Math.min(z0, poly.o[i + 1]); z1 = Math.max(z1, poly.o[i + 1]); }
        const step = Math.max(0.8, Math.sqrt((x1 - x0) * (z1 - z0) / 30));
        for (let x = x0 + step / 2; x < x1; x += step) for (let z = z0 + step / 2; z < z1; z += step) { if (!polyHas(poly, x, z)) continue; n++; if (inOwned(x, z)) c++; }
      }
      if (n && c / n > 0.6) { list.splice(k, 1); dropped++; }
    }
  }
  return { list, occluders, fills: fills.length, droppedInOwned: dropped };
}
