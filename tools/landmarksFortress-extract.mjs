// tools/landmarksFortress-extract.mjs - writes src/world/landmarksFortress/osm-data.js from the BAKED city data (src/world/data/city*.js): the outline of Zayachy Island (the baked data has no island
// polygon: the ring is traced along the edges of the Neva / Kronverksky strait water polygons that touch the island's land), and the id lists of everything that lies on the island (buildings, greens,
// roads, areas, barriers, steps, furniture, lamps, trees, monuments) + the two island bridges, which landmarksFortress/groups.js claims.
// usage: node tools/landmarksFortress-extract.mjs [--dry]      (--dry prints the summary only).  Re-run only when the bake changes; the output is committed.
// Data (c) OpenStreetMap contributors, ODbL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const dry = process.argv.includes('--dry');
const BB = { x0: -2470, x1: -1530, z0: -2300, z1: -1670 };            // window of the island + margin
const SEED = [-1949, -1981];                                           // the cathedral
const r1 = (v) => Math.round(v * 10) / 10;
const pairs = (f) => { const r = []; for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; };
const inRing = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };

// ---------------------------------------------------------------- water polygons near the island (outer rings only: the Neva "holes" are bridge piers)
const waterRings = [];
const near = (o) => { for (let i = 0; i < o.length; i += 2) if (o[i] > BB.x0 - 50 && o[i] < BB.x1 + 50 && o[i + 1] > BB.z0 - 50 && o[i + 1] < BB.z1 + 50) return true; return false; };
const seen = new Set();
for (const src of [D.RIVER, D.WATER]) for (const r of src) for (const p of r.polys || []) {
  if (r.kind !== 'river' && r.kind !== 'canal') continue;
  if (!near(p.o)) continue;
  const k = r.id + ':' + p.o.length + ':' + p.o[0]; if (seen.has(k)) continue; seen.add(k);
  waterRings.push({ id: r.id, name: r.name, ring: pairs(p.o) });
}
const isWater = (x, z) => waterRings.some((w) => inRing(x, z, w.ring));

// ---------------------------------------------------------------- the land component of the island (1 m raster flood fill from the cathedral)
const W = BB.x1 - BB.x0, H = BB.z1 - BB.z0, land = new Uint8Array(W * H);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) land[j * W + i] = isWater(BB.x0 + i + 0.5, BB.z0 + j + 0.5) ? 0 : 1;
const isl = new Uint8Array(W * H), st = [[Math.floor(SEED[0] - BB.x0), Math.floor(SEED[1] - BB.z0)]];
let edgeHit = false, area = 0;
while (st.length) {
  const [i, j] = st.pop(); if (i < 0 || j < 0 || i >= W || j >= H) { edgeHit = true; continue; }
  const k = j * W + i; if (!land[k] || isl[k]) continue; isl[k] = 1; area++;
  st.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
}
if (edgeHit) throw new Error('the land around the cathedral reaches the window border: the island is not closed by water polygons');
const onIsland = (x, z) => { const i = Math.floor(x - BB.x0), j = Math.floor(z - BB.z0); return i >= 0 && j >= 0 && i < W && j < H && isl[j * W + i] === 1; };

// ---------------------------------------------------------------- bank edges: water-polygon edges with island land on one side; chained into the ring
const edges = [];
for (const w of waterRings) for (let i = 0; i < w.ring.length; i++) {
  const a = w.ring[i], b = w.ring[(i + 1) % w.ring.length], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
  const nx = dz / l, nz = -dx / l; let hit = 0;
  for (const t of [0.25, 0.5, 0.75]) for (const s of [-1.6, 1.6]) { const x = a[0] + dx * t + nx * s, z = a[1] + dz * t + nz * s; if (onIsland(x, z) && !isWater(x, z)) hit++; }
  if (hit >= 2) edges.push({ a, b, id: w.id });
}
const key = (p) => Math.round(p[0] * 5) + ',' + Math.round(p[1] * 5);
const pool = edges.slice(); let ring = [pool[0].a, pool[0].b]; pool.shift();
for (let guard = 0; guard < 5000 && pool.length; guard++) {
  const end = key(ring[ring.length - 1]); let i = pool.findIndex((e) => key(e.a) === end || key(e.b) === end);
  if (i < 0) {                                                           // a seam between two water polygons: jump to the nearest free end (< 6 m)
    let best = 6, bi = -1, rev = false; const p = ring[ring.length - 1];
    pool.forEach((e, k2) => { const da = Math.hypot(e.a[0] - p[0], e.a[1] - p[1]), db = Math.hypot(e.b[0] - p[0], e.b[1] - p[1]); if (da < best) { best = da; bi = k2; rev = false; } if (db < best) { best = db; bi = k2; rev = true; } });
    if (bi < 0) break; const e = pool.splice(bi, 1)[0]; ring.push(rev ? e.b : e.a, rev ? e.a : e.b); continue;
  }
  const e = pool.splice(i, 1)[0]; ring.push(key(e.a) === end ? e.b : e.a);
}
if (key(ring[0]) === key(ring[ring.length - 1])) ring.pop();
// drop duplicate consecutive points
ring = ring.filter((p, i) => i === 0 || Math.hypot(p[0] - ring[i - 1][0], p[1] - ring[i - 1][1]) > 0.15).map((p) => [r1(p[0]), r1(p[1])]);
let sa = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; sa += p[0] * q[1] - q[0] * p[1]; }
const gap = Math.hypot(ring[0][0] - ring[ring.length - 1][0], ring[0][1] - ring[ring.length - 1][1]);
console.log(`island: raster area ${area} m2, ring ${ring.length} pts, polygon area ${Math.abs(sa / 2).toFixed(0)} m2, closing gap ${gap.toFixed(1)} m, unused bank edges ${pool.length}`);
console.log('water polygons used:', waterRings.map((w) => `${w.id} ${w.name} (${w.ring.length})`).join('; '));
if (Math.abs(Math.abs(sa / 2) - area) > area * 0.03) console.warn('WARNING: ring area differs from the raster area by more than 3 %');

// ---------------------------------------------------------------- everything on the island
const inIsl = (x, z) => inRing(x, z, ring);
const cOf = (o) => { let x = 0, z = 0; for (let i = 0; i < o.length; i += 2) { x += o[i]; z += o[i + 1]; } return [x / (o.length / 2), z / (o.length / 2)]; };
const fracIn = (o) => { let n = 0; for (let i = 0; i < o.length; i += 2) if (inIsl(o[i], o[i + 1])) n++; return n / (o.length / 2); };
const out = { buildings: [], parts: 0, greens: [], roads: [], bridgeRoads: [], areas: [], barriers: [], walls: [], steps: [], piers: [], pitches: [], parking: [], nodes: [], bridges: [], crossings: [] };
for (const b of D.BUILDINGS) { if (!inIsl(b.cx, b.cz)) continue; if (b.part) { out.parts++; continue; } out.buildings.push(b.id); }
for (const g of D.GREEN) if (g.polys.some((p) => fracIn(p.o) > 0.5)) out.greens.push(g.id);
for (const g of D.LANDUSE || []) if (g.polys.some((p) => fracIn(p.o) > 0.5)) out.greens.push(g.id);
for (const r of D.ROADS) { const f = fracIn(r.pts); if (f > 0.5) out.roads.push(r.id); else if (f > 0 && r.bridge) out.bridgeRoads.push(r.id); }
for (const a of D.AREAS) if (a.polys.some((p) => fracIn(p.o) > 0.5)) out.areas.push(a.id);
for (const w of D.BARRIERS) if (fracIn(w.pts) > 0.5) out.barriers.push(w.id);
for (const w of D.WALLS) if (fracIn(w.pts) > 0.5) out.walls.push(w.id);
for (const w of D.EMBANKMENTS || []) if (fracIn(w.pts) > 0.5 && !out.walls.includes(w.id)) out.walls.push(w.id);
for (const s of D.STEPS) if (fracIn(s.pts) > 0.5) out.steps.push(s.id);
for (const p of D.PIERS || []) { const o = p.polys && p.polys[0] ? p.polys[0].o : p.pts; if (o && o.length && fracIn(o) > 0) out.piers.push(p.id); }
for (const p of D.PITCHES || []) if (inIsl(p.x, p.z)) out.pitches.push(p.id);
for (const p of D.PARKING || []) if (p.x != null ? inIsl(p.x, p.z) : (p.polys || []).some((q) => fracIn(q.o) > 0.5)) out.parking.push(p.id);
for (const c of D.CROSSINGS || []) if (fracIn(c.pts) > 0.5) out.crossings.push(c.id);
for (const b of D.BRIDGES) { const o = b.pts && b.pts.length ? b.pts : (b.polys && b.polys[0] ? b.polys[0].o : null); if (!o) continue; const f = fracIn(o); const c = cOf(o); if (f > 0 || Math.hypot(c[0] + 1619, c[1] + 2191) < 60 || Math.hypot(c[0] + 2351, c[1] + 1927) < 50) out.bridges.push(b.id); }
for (const k of ['TREES', 'LAMPS', 'FURNITURE', 'MONUMENTS', 'BARRIER_NODES', 'MANMADE', 'DOORS', 'CROSSING_NODES', 'CALMING']) for (const n of D[k] || []) if (n && n.x != null && inIsl(n.x, n.z) && n.id) out.nodes.push(n.id);
const counts = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.isArray(v) ? v.length : v]));
console.log('on the island:', JSON.stringify(counts));
console.log('bridge roads:', out.bridgeRoads.join(' '), '| bridges:', out.bridges.join(' '));

if (!dry) {
  const fmt = (a) => JSON.stringify(a);
  const body = `// landmarksFortress/osm-data.js - GENERATED by tools/landmarksFortress-extract.mjs from the baked city data (OpenStreetMap contributors, ODbL). Do not edit by hand.
// ISLAND_RING = the outline of Zayachy Island traced along the edges of the Neva / Kronverksky strait water polygons that touch the island's land ([x, z], ${ring.length} points, ${Math.abs(sa / 2).toFixed(0)} m2).
// ON_ISLAND = ids of the baked records that lie on the island (the claims of groups.js are built from these lists).
export const ISLAND_RING = ${fmt(ring)};
export const ON_ISLAND = ${JSON.stringify(out)};
`;
  fs.writeFileSync(path.join(root, 'src/world/landmarksFortress/osm-data.js'), body);
  console.log('wrote src/world/landmarksFortress/osm-data.js');
}
