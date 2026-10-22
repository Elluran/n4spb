// Pure derivations of the Tauride Garden data from the North facade records (no file access, no randomness: the same facade gives the same output).
// Everything the garden remake needs to know about the site is computed here; tauride-generate.mjs writes it, build.mjs turns it into src/world/landmarksTauride/data/*.js.
import { inRing, inPoly, inPolys, segDist, polyDist, polyLen, polyArea, ringArea, bbox, inBox, ringDist, r1, r3 } from './common.mjs';
import { GARDEN_ID, LAKE_ID, WEST_POND_ID, PALACE_ID, CANAL_WIDTHS, CANAL_WIDTH_DEFAULT, CANAL_DRY_RULE, PATH_CLASS_RULE, PATH_CLASS_OVERRIDES, FENCE_RULES, BRIDGE_SITES, BRIDGE_EXTEND, BRIDGE_DECK_WIDTH, CANAL_JOIN } from './tables.mjs';

const pts2 = (flat) => Array.from({ length: flat.length / 2 }, (_, i) => [flat[2 * i], flat[2 * i + 1]]);
const segsOf = (flat) => Array.from({ length: Math.max(0, flat.length / 2 - 1) }, (_, i) => [[flat[2 * i], flat[2 * i + 1]], [flat[2 * i + 2], flat[2 * i + 3]]]);
const anyVertexIn = (flat, ring) => { for (let i = 0; i < flat.length; i += 2) if (inRing(flat[i], flat[i + 1], ring)) return true; return false; };

/** the garden polygon (GREEN r1582734, outer ring only: the relation has no hole) */
export function gardenPolygon(F) {
  const g = F.GREEN.find((e) => e.id === GARDEN_ID);
  if (!g) throw new Error('facade has no ' + GARDEN_ID);
  return { id: g.id, name: g.name, o: g.polys[0].o.slice(), h: g.polys[0].h.map((h) => h.slice()) };
}

/** a canal centre line widened to a strip polygon {o, h: []}: the left side then the right side reversed (the generator of the source repository, so the union matches it) */
export function canalStrip(pts, width) {
  const a = pts2(pts);
  const side = (s) => a.map((p, i) => {
    const b = a[Math.max(0, i - 1)], c = a[Math.min(a.length - 1, i + 1)], dx = c[0] - b[0], dz = c[1] - b[1], l = Math.hypot(dx, dz) || 1;
    return [p[0] - dz / l * width / 2 * s, p[1] + dx / l * width / 2 * s];
  });
  const ring = [...side(1), ...side(-1).reverse()];
  const o = []; for (const p of ring) o.push(r1(p[0]), r1(p[1]));
  return { o, h: [] };
}
/**
 * Join the ends of a canal to the OSM water polygons. The facade is a simplified copy of the map (vertices moved by up to 0.3 m), so a canal end that OSM draws ON the lake outline lies 0.0-0.1 m off it:
 * the strip then only touches the lake in one point or leaves a 8 cm gap, the union pinches, the island between two joined ends is no hole, and rounding the union to 1 mm self-intersects it.
 * An end within CANAL_JOIN.tolerance of an OSM polygon (inside or outside) and not deeper than the tolerance inside it is moved CANAL_JOIN.overlap metres further along its axis, into the water body.
 * Returns { pts, joins: [{ end, gapM, extendedM, into }] } (gapM: signed distance of the end to the polygon outline, > 0 outside).
 */
export function joinCanal(pts, osmPolys) {
  const out = pts.slice(), joins = [], n = out.length;
  const ends = [{ end: 'start', i: 0, j: 2 }, { end: 'end', i: n - 2, j: n - 4 }];
  for (const { end, i, j } of ends) {
    const x = pts[i], z = pts[i + 1];
    let best = null;
    for (const p of osmPolys) {
      const inside = inPoly(x, z, p);
      const d = Math.min(ringDist(x, z, p.o), ...p.h.map((h) => ringDist(x, z, h)));
      const sd = inside ? -d : d;
      if (!best || Math.abs(sd) < Math.abs(best.sd)) best = { sd, id: p.id };
    }
    if (!best || Math.abs(best.sd) > CANAL_JOIN.tolerance) continue;
    const dx = x - pts[j], dz = z - pts[j + 1], l = Math.hypot(dx, dz) || 1;
    out[i] = r1(x + dx / l * CANAL_JOIN.overlap); out[i + 1] = r1(z + dz / l * CANAL_JOIN.overlap);
    joins.push({ end, gapM: r3(best.sd), extendedM: CANAL_JOIN.overlap, into: best.id });
  }
  return { pts: out, joins };
}

/** metres of the given ways (non-bridge garden ways) that lie inside the strips and outside the OSM polygons (sampled every 25 cm); also the ids hit */
function wetAlong(ways, strips, osm) {
  let wet = 0; const ids = new Set();
  for (const p of ways) for (let i = 0; i + 3 < p.pts.length; i += 2) {
    const sl = Math.hypot(p.pts[i + 2] - p.pts[i], p.pts[i + 3] - p.pts[i + 1]);
    for (let t = 0; t < sl; t += 0.25) {
      const x = p.pts[i] + (p.pts[i + 2] - p.pts[i]) * t / sl, z = p.pts[i + 1] + (p.pts[i + 3] - p.pts[i + 1]) * t / sl;
      if (!inPolys(x, z, osm) && inPolys(x, z, strips)) { wet += 0.25; ids.add(p.id); }
    }
  }
  return { wet, ids: [...ids].sort() };
}
/** the width used for a canal: the estimate, lowered in CANAL_DRY_RULE.step steps while the strip would put more than `tolerance` m of a mapped non-bridge way under water */
export function dryWidth(stripPts, estimate, ways, osm) {
  const R = CANAL_DRY_RULE;
  for (let w = estimate; w >= R.min; w -= R.step) {
    const r = wetAlong(ways, [canalStrip(stripPts, w)], osm);
    if (r.wet <= R.tolerance) return { width: w, ...(w < estimate ? { wetAtEstimateM: Math.round(wetAlong(ways, [canalStrip(stripPts, estimate)], osm).wet * 10) / 10 } : {}) };
  }
  return { width: R.min };
}

/** the water pieces: the two OSM polygons and the strips of the four canal centre lines; also the canal centre lines with the width table. `paths` = the garden ways (gardenPaths) */
export function waterPieces(F, paths) {
  const poly = (id) => {
    const w = F.WATER.find((e) => e.id === id);
    if (!w) throw new Error('facade has no WATER ' + id);
    return { id, kind: 'osm-polygon', o: w.polys[0].o.slice(), h: w.polys[0].h.map((h) => h.slice()) };
  };
  const pieces = [poly(LAKE_ID), poly(WEST_POND_ID)];
  const osm = pieces.slice();
  const G = gardenPolygon(F);
  const gb = bbox(G.o);
  const walk = paths.filter((p) => !p.bridge);
  const canals = F.STREAMS.filter((s) => s.kind === 'canal' && (anyVertexIn(s.pts, G.o) || inBox(s.pts[0], s.pts[1], gb, 5))).map((s) => {
    const entry = CANAL_WIDTHS[s.id];
    const estimate = entry ? entry.estimate : CANAL_WIDTH_DEFAULT;
    const j = joinCanal(s.pts, osm);
    const dw = dryWidth(j.pts, estimate, walk, osm);
    return { id: s.id, kind: 'canal', pts: s.pts.slice(), strip: j.pts, joins: j.joins, width: dw.width, estimate, ...(dw.wetAtEstimateM !== undefined ? { wetAtEstimateM: dw.wetAtEstimateM } : {}), provenance: entry ? entry.provenance : 'default', len: r1(polyLen(s.pts)) };
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const c of canals) pieces.push({ id: c.id, kind: 'canal-strip', width: c.width, ...canalStrip(c.strip, c.width) });
  return { pieces, canals };
}

// ---------------------------------------------------------------- paths
const PAVED = new Set(['paving_stones', 'concrete:plates', 'asphalt', 'concrete', 'paved', 'sett']);
const GRAVEL = new Set(['compacted', 'fine_gravel', 'gravel']);
const EARTH = new Set(['earth', 'ground', 'dirt', 'unpaved', 'grass']);
/** ground material of the way for the ground shader / the draped ribbon: gravel | earth | paved | wood | metal | unknown */
export function surfaceClass(r) {
  const s = r.surface;
  if (!s) return 'unknown';
  if (GRAVEL.has(s)) return 'gravel';
  if (EARTH.has(s)) return 'earth';
  if (PAVED.has(s)) return 'paved';
  if (s === 'wood') return 'wood';
  if (s === 'metal') return 'metal';
  return 'unknown';
}
/**
 * The class of a garden way. The facade (and the OSM snapshot of 2026-10) carries NO width tag on any of the 118 ways, so the class is derived from what is mapped: highway, bridge, surface, lit, and
 * the length of the way (a long way is a through route). RULE (PATH_CLASS_RULE in tables.mjs):
 *   steps  = highway=steps;  bridge = bridge=yes;
 *   trail  = highway=path                                   -> 1.4 m
 *   main   = footway, not a bridge, and (length >= 150 m, or lit=yes and length >= 30 m)   -> width 3.5 + min(length, 300) / 300 m, i.e. 3.5 .. 4.5 m
 *   side   = every other footway                            -> 2.4 m
 * A manual entry of PATH_CLASS_OVERRIDES wins. The rule is a heuristic made from the map, not a survey: it is the starting point the garden team may override per way.
 */
export function classOf(r, len) {
  const R = PATH_CLASS_RULE;
  if (PATH_CLASS_OVERRIDES[r.id]) return PATH_CLASS_OVERRIDES[r.id];
  if (r.hw === 'steps') return 'steps';
  if (r.bridge) return 'bridge';
  if (r.hw === 'path') return 'trail';
  if (r.hw === 'footway' || r.hw === 'pedestrian') return (len >= R.main.minLen || (r.lit && len >= R.main.litMinLen)) ? 'main' : 'side';
  return 'side';
}
export function widthOf(cls, len, r) {
  const R = PATH_CLASS_RULE;
  if (cls === 'main') return r1(R.main.wMin + (R.main.wMax - R.main.wMin) * Math.min(len, R.main.lengthForMax) / R.main.lengthForMax);
  if (cls === 'trail') return R.trail.w;
  if (cls === 'steps') return r.w || R.steps.w;
  if (cls === 'bridge') return BRIDGE_DECK_WIDTH.value;
  return R.side.w;
}

/** the garden ways: highway footway / path / pedestrian / steps with any vertex inside the garden polygon (the rule of the source generator), in the facade order */
export function gardenPaths(F, G) {
  const out = [];
  for (const r of F.ROADS) {
    if (!['footway', 'path', 'pedestrian', 'steps'].includes(r.hw)) continue;
    if (!anyVertexIn(r.pts, G.o)) continue;
    const len = polyLen(r.pts);
    const cls = classOf(r, len);
    out.push({
      id: r.id, hw: r.hw, cls, w: widthOf(cls, len, r), len: Math.round(len * 10) / 10, surface: r.surface || null, surfaceClass: surfaceClass(r), lit: r.lit ? 1 : 0,
      bridge: r.bridge ? 1 : 0, layer: r.layer || 0, ...(r.steps ? { steps: r.steps } : {}), facadeW: r.w, pts: r.pts.slice(),
    });
  }
  return out;
}

// ---------------------------------------------------------------- fences, gates, openings
export function gardenFences(F, G) {
  return F.BARRIERS.filter((b) => b.kind === 'fence' && anyVertexIn(b.pts, G.o)).map((b) => {
    const pts = b.pts.slice();
    if (b.closed && (pts[0] !== pts[pts.length - 2] || pts[1] !== pts[pts.length - 1])) pts.push(pts[0], pts[1]);     // a closed way is stored with its first vertex repeated (the source's terrain.js does the same)
    return { id: b.id, closed: b.closed ? 1 : 0, len: Math.round(polyLen(pts) * 10) / 10, pts };
  });
}
export function gardenGates(F, G) {
  return F.BARRIER_NODES.filter((b) => (b.kind === 'gate' || b.kind === 'entrance') && inRing(b.x, b.z, G.o)).map((b) => ({ id: b.id, kind: b.kind, x: b.x, z: b.z, ...(b.access ? { access: b.access } : {}) }));
}
/**
 * The openings of the mapped fence (the rule of the old garden.js: every 2.7 m panel within 4 m of a gate node or within 2.1 m of a path is left out; consecutive skipped panels of one fence way
 * form one opening). Each opening: the fence way, start / end, panel count, whether a gate node and / or which paths cause it.
 */
export function fenceOpenings(fences, paths, gates) {
  const R = FENCE_RULES;
  const pathSegs = paths.flatMap((p) => segsOf(p.pts).map((s) => ({ id: p.id, s })));
  const out = [];
  for (const f of fences) {
    let cur = null;
    for (const [a, b] of segsOf(f.pts)) {
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 0.2) continue;
      const n = Math.ceil(len / R.panel);
      for (let i = 0; i < n; i++) {
        const x = a[0] + dx * (i + 0.5) / n, z = a[1] + dz * (i + 0.5) / n;
        const g = gates.filter((q) => Math.hypot(x - q.x, z - q.z) < R.gateClear).map((q) => q.id);
        const p = pathSegs.filter((q) => segDist(x, z, q.s[0][0], q.s[0][1], q.s[1][0], q.s[1][1]) < R.pathClear).map((q) => q.id);
        if (g.length || p.length) {
          if (!cur) { cur = { fence: f.id, x: r1(x), z: r1(z), panels: 0, gates: new Set(), paths: new Set() }; out.push(cur); }
          cur.panels++; g.forEach((v) => cur.gates.add(v)); p.forEach((v) => cur.paths.add(v)); cur.x2 = r1(x); cur.z2 = r1(z);
        } else cur = null;
      }
    }
  }
  return out.map((o) => ({ fence: o.fence, x: o.x, z: o.z, x2: o.x2, z2: o.z2, panels: o.panels, widthM: r1(o.panels * R.panel), gates: [...o.gates].sort(), paths: [...o.paths].sort(), kind: o.paths.size ? 'path' : 'gate' }));
}
/** the stretches of the garden polygon boundary longer than 8 m with no mapped fence within 3 m (sampled every 2 m) */
export function unfencedStretches(G, fences) {
  const R = FENCE_RULES;
  const fs = fences.flatMap((f) => segsOf(f.pts));
  const o = G.o, gaps = [];
  let gap = null, perimeter = 0, covered = 0;
  for (let i = 0; i < o.length; i += 2) {
    const a = [o[i], o[i + 1]], b = [o[(i + 2) % o.length], o[(i + 3) % o.length]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(len / R.sample));
    for (let k = 0; k < n; k++) {
      const x = a[0] + (b[0] - a[0]) * (k + 0.5) / n, z = a[1] + (b[1] - a[1]) * (k + 0.5) / n;
      const near = fs.some(([u, v]) => segDist(x, z, u[0], u[1], v[0], v[1]) < R.perimeterNear);
      perimeter += len / n;
      if (near) { covered += len / n; if (gap) { gaps.push(gap); gap = null; } } else { if (!gap) gap = { x, z, len: 0 }; gap.len += len / n; gap.x2 = x; gap.z2 = z; }
    }
  }
  if (gap) gaps.push(gap);
  return { perimeterM: Math.round(perimeter), coveredM: Math.round(covered), gaps: gaps.filter((g) => g.len > R.gapMin).map((g) => ({ x: Math.round(g.x), z: Math.round(g.z), x2: Math.round(g.x2), z2: Math.round(g.z2), lenM: Math.round(g.len) })) };
}

/** the service lane that runs into the garden from the west gate: the service ways w1258039516 / w1258039517 (4 m, asphalt / paving) */
export function serviceLane(F, G) {
  const ways = F.ROADS.filter((r) => r.hw === 'service' && anyVertexIn(r.pts, G.o));
  const ids = ways.map((r) => r.id).sort();
  return { ids, w: ways[0] ? ways[0].w : 4, lenM: Math.round(ways.reduce((s, r) => s + polyLen(r.pts), 0)), surfaces: ways.map((r) => r.surface || null), ways: ways.map((r) => ({ id: r.id, w: r.w, surface: r.surface || null, pts: r.pts.slice() })) };
}

// ---------------------------------------------------------------- furniture, trees, monuments
export function gardenFurniture(F, G) {
  const inG = (x, z) => inRing(x, z, G.o);
  const fur = F.FURNITURE.filter((f) => inG(f.x, f.z));
  const pick = (kind) => fur.filter((f) => f.kind === kind);
  const trees = []; for (let i = 0; i < F.TREES.length; i += 2) if (inG(F.TREES[i], F.TREES[i + 1])) trees.push({ x: F.TREES[i], z: F.TREES[i + 1] });
  return {
    benches: pick('bench').map((f) => ({ id: f.id, x: f.x, z: f.z, ...(f.backrest ? { backrest: f.backrest } : {}) })),
    bins: pick('waste_basket').map((f) => ({ id: f.id, x: f.x, z: f.z })),
    other: fur.filter((f) => !['bench', 'waste_basket', 'fountain'].includes(f.kind)).map((f) => ({ id: f.id, kind: f.kind, x: f.x, z: f.z, ...(f.name ? { name: f.name } : {}) })),
    fountains: F.FOUNTAINS.filter((f) => inG(f.x, f.z)).map((f) => ({ id: f.id, x: f.x, z: f.z, ...(fur.find((q) => q.id === f.id && q.name) ? { name: fur.find((q) => q.id === f.id).name } : {}) })).concat(fur.filter((f) => f.kind === 'fountain' && !F.FOUNTAINS.some((q) => q.id === f.id)).map((f) => ({ id: f.id, x: f.x, z: f.z, ...(f.name ? { name: f.name } : {}) }))),
    trees,
    monuments: F.MONUMENTS.filter((m) => inG(m.x, m.z)).map((m) => ({ id: m.id, kind: m.kind, sub: m.sub || null, name: m.name || null, x: m.x, z: m.z, startDate: m.startDate || null, ...(m.artist ? { artist: m.artist } : {}) })),
    lamps: F.LAMPS.filter((l) => inG(l.x, l.z)).length,
  };
}

// ---------------------------------------------------------------- GREEN ids and building footprints
/** the GREEN records the garden claims or owns: the park, the wood polygons whose centroid is inside, and the special areas inside */
export function gardenGreen(F, G) {
  const cen = (g) => { const o = g.polys[0].o; let sx = 0, sz = 0; const n = o.length / 2; for (let i = 0; i < o.length; i += 2) { sx += o[i]; sz += o[i + 1]; } return [sx / n, sz / n]; };
  const gb = bbox(G.o);
  const rows = [];
  for (const g of F.GREEN) {
    if (g.id === GARDEN_ID) continue;
    const [cx, cz] = cen(g);
    if (!inBox(cx, cz, gb) || !inRing(cx, cz, G.o)) continue;
    rows.push({ id: g.id, kind: g.kind, area: Math.round(g.polys.reduce((s, p) => s + polyArea(p), 0)), cx: r1(cx), cz: r1(cz), ...(g.sport ? { sport: g.sport } : {}) });
  }
  const by = (k) => rows.filter((r) => r.kind === k);
  const woods = by('wood');
  return {
    park: { id: GARDEN_ID, name: G.name, areaM2: Math.round(polyArea(G)) },
    woods, woodAreaM2: woods.reduce((s, r) => s + r.area, 0),
    others: rows.filter((r) => r.kind !== 'wood'),
  };
}
const sampleOverlapArea = (A, B, step = 0.25) => {                    // area of A intersect B by grid sampling (deterministic; error ~ perimeter * step / 2)
  const ba = bbox(A.o), bb = bbox(B.o);
  const x0 = Math.max(ba.x0, bb.x0), x1 = Math.min(ba.x1, bb.x1), z0 = Math.max(ba.z0, bb.z0), z1 = Math.min(ba.z1, bb.z1);
  if (x0 >= x1 || z0 >= z1) return 0;
  let n = 0;
  for (let x = x0 + step / 2; x < x1; x += step) for (let z = z0 + step / 2; z < z1; z += step) if (inPoly(x, z, A) && inPoly(x, z, B)) n++;
  return n * step * step;
};
/** every building record (outline or part) whose footprint overlaps the garden polygon by more than 1 m2 (grid sampling 0.25 m), without the palace */
export function gardenFootprints(F, G) {
  const gb = bbox(G.o), out = [];
  for (const b of F.BUILDINGS) {
    if (b.id === PALACE_ID || b.underground) continue;
    if (!b.polys || !b.polys.length) continue;
    const bb = bbox(b.polys[0].o);
    if (bb.x1 < gb.x0 || bb.x0 > gb.x1 || bb.z1 < gb.z0 || bb.z0 > gb.z1) continue;
    let ov = 0; for (const p of b.polys) ov += sampleOverlapArea(p, { o: G.o, h: G.h });
    if (ov < 1) continue;
    out.push({ id: b.id, kind: b.kind || null, name: b.name || null, part: b.part ? 1 : 0, parent: b.parent || null, h: b.h ?? null, levels: b.levels ?? null, areaM2: Math.round(b.area ?? b.polys.reduce((s, p) => s + polyArea(p), 0)), overlapM2: Math.round(ov), cx: b.cx, cz: b.cz, polys: b.polys.map((p) => ({ o: p.o.slice(), h: p.h.map((h) => h.slice()) })) });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}
/** the palace footprint record(s) for the palace slicing step */
export function palaceRecord(F) {
  const b = F.BUILDINGS.find((e) => e.id === PALACE_ID);
  if (!b) throw new Error('facade has no ' + PALACE_ID);
  return { id: b.id, kind: b.kind, name: b.name, h: b.h, levels: b.levels, cx: b.cx, cz: b.cz, polys: b.polys.map((p) => ({ o: p.o.slice(), h: p.h.map((h) => h.slice()) })) };
}

// ---------------------------------------------------------------- bridges (need the water union)
const dryAt = (x, z, union) => !inPolys(x, z, union);
/**
 * The deck of every mapped bridge way after the old garden.js extension: a free end (not shared with another bridge way, 0.15 m) that stands in the water union moves along the way's axis in 0.5 m
 * steps (at most 12 m) until it is dry, then 0.7 m further (the abutment). Returns one record per bridge way with the OSM points, the deck points, the extension of each end and the metres of
 * the OSM way that lie inside the water (a data-derived span).
 */
export function bridgeDecks(paths, union) {
  const E = BRIDGE_EXTEND;
  const bridges = paths.filter((p) => p.bridge);
  return bridges.map((r) => {
    const pts = r.pts.slice(), n = pts.length, ext = [0, 0];
    [0, n - 2].forEach((end, ei) => {
      const x = pts[end], z = pts[end + 1], other = end === 0 ? 2 : n - 4;
      if (bridges.some((s) => s !== r && [[s.pts[0], s.pts[1]], [s.pts[s.pts.length - 2], s.pts[s.pts.length - 1]]].some((p) => Math.hypot(x - p[0], z - p[1]) < E.junctionTolerance))) return;
      const dx = x - pts[other], dz = z - pts[other + 1], len = Math.hypot(dx, dz);
      let shift = 0;
      while (shift < E.max && inPolys(x + dx / len * shift, z + dz / len * shift, union)) shift += E.step;
      if (shift) { shift += E.abutment; pts[end] = r1(x + dx / len * shift); pts[end + 1] = r1(z + dz / len * shift); ext[ei] = r3(shift); }
    });
    // the part of the OSM axis inside the water (sampled every 5 cm)
    let wet = 0; const step = 0.05, L = polyLen(r.pts);
    for (let d = 0; d < L; d += step) {
      let acc = 0, x = r.pts[0], z = r.pts[1];
      for (let i = 0; i + 3 < r.pts.length; i += 2) { const sl = Math.hypot(r.pts[i + 2] - r.pts[i], r.pts[i + 3] - r.pts[i + 1]); if (acc + sl >= d) { const t = (d - acc) / (sl || 1); x = r.pts[i] + (r.pts[i + 2] - r.pts[i]) * t; z = r.pts[i + 1] + (r.pts[i + 3] - r.pts[i + 1]) * t; break; } acc += sl; }
      if (!dryAt(x, z, union)) wet += step;
    }
    return { id: r.id, surface: r.surface, surfaceClass: r.surfaceClass, lit: r.lit, w: r.w, facadeW: r.facadeW, osmLenM: Math.round(L * 10) / 10, deckLenM: Math.round(polyLen(pts) * 10) / 10, wetSpanM: Math.round(wet * 10) / 10, ext, pts: r.pts.slice(), deck: pts, endsDry: dryAt(pts[0], pts[1], union) && dryAt(pts[n - 2], pts[n - 1], union) };
  });
}
/** the narrowest cross-section of the water between two points of the chain (used for the dam decision): width of the union along the perpendicular through (x, z) */
export function crossSection(union, x, z, ang, reach = 60, step = 0.25) {
  const c = Math.cos(ang), s = Math.sin(ang);
  let first = null, last = null, wet = 0;
  for (let d = -reach; d <= reach; d += step) { if (inPolys(x + c * d, z + s * d, union)) { if (first === null) first = d; last = d; wet += step; } }
  return { wetM: r1(wet), from: first, to: last };
}
export { ringArea, polyArea, polyDist, ringDist };
