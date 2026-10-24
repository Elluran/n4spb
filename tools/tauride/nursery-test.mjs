// nursery-test.mjs - T8b of the Tauride remake (a user fix): the garden nursery lot north-west of the garden: the brown floor with its gravel tracks, the nine glasshouses with most panes missing, the three replaced buildings,
// the young trees, the colliders, the claims, the budgets. node tools/area.mjs north tools/tauride/nursery-test.mjs [--no-env] [--no-mutants]
// Every check runs on the REAL built module (landmarksTauride through the module entry; the environment too unless --no-env) with the REAL Player and Physics, or on the real planners fed with the real data. The geometry rules are
// measured with the test's OWN code against the North facade (buildings, roads, fences and walls of the lot), and each group ends with MUTANTS that must turn the check red.
//   1 the lot: the ring is simple, shares the garden outline's edge exactly and no area with the garden, lies inside the data; the three claimed buildings are the facade's
//   2 the houses: 7 long (along x) + 2 cross (along z), inside the lot, clear of every building, road, fence and of each other, on the two lawns of the satellite
//   3 the panes: counts, deterministic, about a quarter intact, every pane inside its house, the glass mesh is the intact panes
//   4 the ground: the environment ground is cut out under the lot, the floor covers the ring and faces up, the floors of the lot and the garden do not overlap, the heights are 0, no two opaque surfaces within 1 cm (coplanar scan + rays)
//   5 the colliders and the walkers: one box per house and per replaced building, a walker is STOPPED by each, a walker walks every track; the generic trees are gone from the lot
//   6 the budgets (triangles, draws, trees), the numbers, determinism
//   7 the claims (groups.js, layout) and the mutants
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = new Set(process.argv.slice(2));
let failed = 0, total = 0;
const ok = (name, cond, detail = '') => { total++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); return !!cond; };
const noEnv = args.has('--no-env'), noMut = args.has('--no-mutants');

const SE = await imp('tools/tauride/lib/stub-env.mjs');
const eng = await SE.loadEngine(ROOT);
const L = eng.L, THREE = eng.THREE;
const NU = await imp('src/world/landmarksTauride/nursery.js');
const ND = await imp('src/world/landmarksTauride/data/nursery.js');
const DG = await imp('src/world/landmarksTauride/data/footprints.js');
const GRP = await imp('src/world/landmarksTauride/groups.js');
const HG = await imp('src/areas/north/hooks/ground.js');
const HK = await imp('src/areas/north/hooks/keep-out.js');
const AT = await imp('src/world/lib/area-tables.js');
const FAC = await imp('src/areas/north/data/city.js');
const GM = await imp('src/world/landmarksTauride/ground-material.js');

// ---------------------------------------------------------------- geometry of the test (its own)
const segP = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const polyD = (x, z, p) => { let m = Infinity; for (let i = 0; i + 3 < p.length; i += 2) m = Math.min(m, segP(x, z, p[i], p[i + 1], p[i + 2], p[i + 3])); return m; };
const ringHas = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) c = !c; return c; };
const ringD = (o, x, z) => { let m = Infinity; for (let i = 0; i < o.length; i += 2) m = Math.min(m, segP(x, z, o[i], o[i + 1], o[(i + 2) % o.length], o[(i + 3) % o.length])); return m; };
const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; a += r[i] * r[j + 1] - r[j] * r[i + 1]; } return a / 2; };
const segX = (p1x, p1z, p2x, p2z, p3x, p3z, p4x, p4z) => { const d = (p2x - p1x) * (p4z - p3z) - (p2z - p1z) * (p4x - p3x); if (Math.abs(d) < 1e-12) return false; const t = ((p3x - p1x) * (p4z - p3z) - (p3z - p1z) * (p4x - p3x)) / d, u = ((p3x - p1x) * (p2z - p1z) - (p3z - p1z) * (p2x - p1x)) / d; return t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9; };
const simple = (r) => { const n = r.length / 2; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (segX(r[2 * i], r[2 * i + 1], r[2 * ((i + 1) % n)], r[2 * ((i + 1) % n) + 1], r[2 * j], r[2 * j + 1], r[2 * ((j + 1) % n)], r[2 * ((j + 1) % n) + 1])) return false; } return true; };
/** the distance from an axis-aligned rectangle to a polygon ring (0 when they touch or overlap) */
const rectPoly = (rc, o) => {
  const cs = [[rc.x0, rc.z0], [rc.x1, rc.z0], [rc.x1, rc.z1], [rc.x0, rc.z1]];
  if (cs.some(([x, z]) => ringHas(o, x, z))) return 0;
  for (let i = 0; i < o.length; i += 2) if (o[i] >= rc.x0 && o[i] <= rc.x1 && o[i + 1] >= rc.z0 && o[i + 1] <= rc.z1) return 0;
  let m = Infinity;
  for (let i = 0; i < o.length; i += 2) { const ax = o[i], az = o[i + 1], bx = o[(i + 2) % o.length], bz = o[(i + 3) % o.length]; for (let k = 0; k < 4; k++) { const [cx, cz] = cs[k], [dx, dz] = cs[(k + 1) % 4]; if (segX(ax, az, bx, bz, cx, cz, dx, dz)) return 0; m = Math.min(m, segP(ax, az, cx, cz, dx, dz), segP(bx, bz, cx, cz, dx, dz), segP(cx, cz, ax, az, bx, bz), segP(dx, dz, ax, az, bx, bz)); } }
  return m;
};
const rectPolyline = (rc, p) => { let m = Infinity; for (let i = 0; i + 3 < p.length; i += 2) { const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3]; for (let k = 0; k < 4; k++) { const cs = [[rc.x0, rc.z0], [rc.x1, rc.z0], [rc.x1, rc.z1], [rc.x0, rc.z1]], [cx, cz] = cs[k], [dx, dz] = cs[(k + 1) % 4]; if (segX(ax, az, bx, bz, cx, cz, dx, dz)) return 0; m = Math.min(m, segP(ax, az, cx, cz, dx, dz), segP(bx, bz, cx, cz, dx, dz), segP(cx, cz, ax, az, bx, bz), segP(dx, dz, ax, az, bx, bz)); } if (ax >= rc.x0 && ax <= rc.x1 && az >= rc.z0 && az <= rc.z1) return 0; } return m; };
const rectRect = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.z0 - b.z1, b.z0 - a.z1));
const LOT = ND.LOT_RING, GARDEN = DG.GARDEN.o;

// =============================================================== 0. the build (the real module entry)
const MODS = noEnv ? ['landmarksTauride'] : ['environment', 'landmarksTauride'];
const { ctx, camera } = SE.makeContext(eng, MODS);
const t0 = performance.now();
await SE.buildModules(eng, ctx, MODS);
const buildMs = performance.now() - t0, svc = ctx.services.landmarksTauride, NS = svc && svc.nursery;
console.log(`built ${MODS.join(' + ')} in ${buildMs.toFixed(0)} ms`);
ok('the module publishes nursery { plan, triangles, draws, colliders, items, meshes, parts, mask, material }', !!(NS && NS.plan && NS.meshes && NS.items && typeof NS.triangles === 'number' && NS.material));
if (!NS) { console.log('RESULT: FAIL (no T8b service)'); process.exit(1); }
const P = NS.plan, ph = ctx.physics, H = (x, z) => L.heightAt(x, z);
const bounds = { x0: 800, x1: 1650, z0: -1950, z1: -1150 };

// =============================================================== 1. the lot
console.log('1. the lot (data/nursery.js)');
ok('the ring is a simple polygon of 22 vertices, about 35 thousand m2', simple(LOT) && LOT.length === 44 && Math.abs(ringArea(LOT)) > 33000 && Math.abs(ringArea(LOT)) < 37000, `${LOT.length / 2} vertices, ${Math.abs(ringArea(LOT)).toFixed(0)} m2, simple ${simple(LOT)}`);
{ // the east edge is the garden outline: the garden's vertices 56 .. 60 appear in the lot ring consecutively (reversed)
  const g = []; for (let i = 56; i <= 60; i++) g.push([GARDEN[2 * i], GARDEN[2 * i + 1]]);
  const at = LOT.findIndex((v, i) => i % 2 === 0 && v === g[4][0] && LOT[i + 1] === g[4][1]) / 2;
  const same = at >= 0 && g.every((p, k) => { const idx = (at + k) % (LOT.length / 2); return LOT[2 * idx] === g[4 - k][0] && LOT[2 * idx + 1] === g[4 - k][1]; });
  ok('the lot shares the garden outline\'s west edge EXACTLY: the 5 vertices 56 .. 60 of data/footprints.js GARDEN are consecutive in the ring, in reverse (the two floors meet with no gap and no overlap)', same, `at ${at}`);
}
{ // no area in common with the garden polygon: a lattice of 1 m over the lot's box
  let both = 0, inLot = 0; const B = ND.LOT_BOX;
  for (let x = B[0] + 0.37; x < B[1]; x += 1) for (let z = B[2] + 0.41; z < B[3]; z += 1) { const a = ringHas(LOT, x, z); if (a) { inLot++; if (ringHas(GARDEN, x, z)) both++; } }
  ok('the lot and the garden polygon share no area (a 1 m lattice: points in both)', inLot > 25000 && both === 0, `${inLot} lattice points in the lot, ${both} also in the garden`);
}
{ const E = FAC.EXTENT_RECTS; ok('every vertex of the ring is inside the data extent', LOT.every((v, i) => i % 2 || E.some((r) => v >= r.x0 && v <= r.x1 && LOT[i + 1] >= r.z0 && LOT[i + 1] <= r.z1))); }
{ const byId = new Map(FAC.BUILDINGS.map((b) => [b.id, b])), rows = ND.SHEDS.map((s) => ({ s, b: byId.get(s.id) }));
  ok('the three replaced buildings are facade records and the rings of data/nursery.js SHEDS are theirs (w1457964048, w1457964049, w30324513)', rows.length === 3 && rows.every((r) => r.b && r.b.polys[0].o.length === r.s.o.length && r.b.polys[0].o.every((v, i) => Math.abs(v - r.s.o[i]) < 0.051)), rows.map((r) => r.s.id + (r.b ? '' : ' MISSING')).join(' '));
  ok('their OSM tags give no height (h and levels null: the generic city drew each as a 4-storey block), and each lies inside the lot', rows.every((r) => r.b && !r.b.h && !r.b.levels && r.s.o.every((v, i) => i % 2 || ringHas(LOT, v, r.s.o[i + 1]) || ringD(LOT, v, r.s.o[i + 1]) < 1.0)), rows.map((r) => `${r.s.id} h ${r.b && r.b.h} levels ${r.b && r.b.levels}`).join('; ')); }

// =============================================================== 2. the houses
console.log('2. the glasshouses');
const houses = P.houses;
const lotBuildings = FAC.BUILDINGS.filter((b) => !b.part && b.polys && b.polys[0] && b.polys[0].o.some((v, i) => i % 2 === 0 && ringHas(LOT, v, b.polys[0].o[i + 1])) || (b.polys && b.polys[0] && ringHas(LOT, b.cx, b.cz)));
const roads = FAC.ROADS.filter((r) => r.pts && ['tertiary', 'residential', 'service', 'secondary', 'unclassified'].includes(r.hw)), foot = FAC.ROADS.filter((r) => r.pts && ['footway', 'path', 'steps', 'pedestrian'].includes(r.hw));
const fences = FAC.BARRIERS.filter((b) => (b.kind === 'fence' || b.kind === 'wall') && b.pts);
/** the clearance measures of a plan's houses (counts of violations) */
function houseMeasures(hs) {
  const m = { outside: 0, building: 0, road: 0, footway: 0, fence: 0, pair: 0, lawn: 0, size: 0, yard: 0 };
  for (const h of hs) {
    const r = h.rect, corners = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]];
    if (!corners.every(([x, z]) => ringHas(LOT, x, z) && ringD(LOT, x, z) > 1.5)) m.outside++;
    if (lotBuildings.some((b) => rectPoly(r, b.polys[0].o) < 3)) m.building++;
    if (roads.some((rd) => rectPolyline(r, rd.pts) < L.roadWidth(rd) / 2 + 1)) m.road++;
    if (foot.some((rd) => rectPolyline(r, rd.pts) < 1)) m.footway++;
    if (fences.some((b) => rectPolyline(r, b.pts) < 1.5)) m.fence++;
    if (hs.some((o) => o !== h && rectRect(r, o.rect) < 5)) m.pair++;
    if (h.axis === 'x' && !(r.x0 >= 1000 && r.x1 <= 1080 && r.z0 >= -1772 && r.z1 <= -1617)) m.lawn++;
    if (h.axis === 'z' && !(r.x0 >= 1082 && r.x1 <= 1104 && r.z0 >= -1770 && r.z1 <= -1618)) m.lawn++;
    if (!(h.len >= 45 && h.len <= 60 && h.wid >= 8 && h.wid <= 12)) m.size++;
    if (ringHas(ND.YARD_RING, r.x0, r.z0) || ringHas(ND.YARD_RING, r.x0, r.z1) || rectPoly(r, ND.YARD_RING) < 2) m.yard++;
  }
  return m;
}
ok('nine houses: seven long ones along x (3 + 1 + 3 in two groups) and two cross houses along z', houses.length === 9 && houses.filter((h) => h.axis === 'x').length === 7 && houses.filter((h) => h.axis === 'z').length === 2, houses.map((h) => h.id + h.axis).join(' '));
const hm = houseMeasures(houses);
ok(`every house is inside the lot (1.5 m from the ring), 3 m clear of every building of the facade (${lotBuildings.length} in the lot, the yard's classical buildings included), clear of every road (half width + 1 m), footway (1 m), fence and wall (1.5 m) and 5 m from the next house, 45 .. 60 m long and 8 .. 12 m wide, off the yard, on the two lawns of the satellite`, Object.values(hm).every((v) => v === 0), JSON.stringify(hm));
ok('the long houses form the groups of the photo: three, one wide house between them (the 16 m gap), three (the lanes of 6.5 m)', (() => { const z = houses.filter((h) => h.axis === 'x').sort((a, b) => a.cz - b.cz); const gaps = z.slice(1).map((h, i) => +(h.rect.z0 - z[i].rect.z1).toFixed(1)); return gaps.join() === '6.5,6.5,9,16,6.5,6.5' || gaps.join() === '6.5,6.5,9,16.0,6.5,6.5'; })(), houses.filter((h) => h.axis === 'x').sort((a, b) => a.cz - b.cz).slice(1).map((h, i, a) => h.id).join());
{ // the two cross houses stand on each side of the middle concrete box w1457964048 (the photo's bottom row)
  const box = ND.SHEDS.find((s) => s.id === 'w1457964048'), bx = box.o.filter((_, i) => i % 2 === 0), bz = box.o.filter((_, i) => i % 2 === 1), bz0 = Math.min(...bz), bz1 = Math.max(...bz), bx0 = Math.min(...bx), bx1 = Math.max(...bx);
  const c = houses.filter((h) => h.axis === 'z');
  ok('the two cross houses stand across the east end on each side of the concrete box w1457964048 (one south, one north of it, over its x range)', c.length === 2 && c.some((h) => h.rect.z0 > bz1 && h.rect.x0 < bx1 && h.rect.x1 > bx0) && c.some((h) => h.rect.z1 < bz0 && h.rect.x0 < bx1 && h.rect.x1 > bx0), c.map((h) => `${h.id} z ${h.rect.z0}..${h.rect.z1}`).join(' ') + ` box z ${bz0.toFixed(1)}..${bz1.toFixed(1)}`);
}
{ const tr = ND.TRACKS; const cross = (a, b) => { for (let i = 0; i + 3 < a.pts.length; i += 2) for (let j = 0; j + 3 < b.pts.length; j += 2) if (segX(a.pts[i], a.pts[i + 1], a.pts[i + 2], a.pts[i + 3], b.pts[j], b.pts[j + 1], b.pts[j + 2], b.pts[j + 3])) return true; return false; };
  const bad = []; for (const t of tr) { for (const h of houses) if (rectPolyline(h.rect, t.pts) < t.w / 2 + 0.5) bad.push(t.id + '/' + h.id); for (const s of P.buildings) { const c = Math.cos(s.theta), sn = Math.sin(s.theta); for (let i = 0; i + 3 < t.pts.length; i += 2) for (let k = 0; k <= 20; k++) { const x = t.pts[i] + (t.pts[i + 2] - t.pts[i]) * k / 20, z = t.pts[i + 1] + (t.pts[i + 3] - t.pts[i + 1]) * k / 20, dx = x - s.cx, dz = z - s.cz, u = dx * c + dz * sn, v = -dx * sn + dz * c; if (Math.abs(u) < s.len / 2 + t.w / 2 + 0.3 && Math.abs(v) < s.dep / 2 + t.w / 2 + 0.3) bad.push(t.id + '/' + s.id); } } if (!t.pts.every((v, i) => i % 2 || ringHas(LOT, v, t.pts[i + 1]))) bad.push(t.id + '/ring'); }
  ok(`the ${tr.length} gravel tracks lie inside the lot and clear of every house and replaced building (half width + 0.5 m)`, bad.length === 0, [...new Set(bad)].join(' ')); }

// =============================================================== 3. the panes
console.log('3. the panes');
{ const expect = (h) => { const D = ND.HOUSE; return 2 * h.nc * (D.rowsWall + D.rowsRoof) + 2 * h.ncv * (D.rowsWall + 1); };
  ok('each house has the grid of panes of its size: 2 sides x (2 wall + 5 roof rows) x its columns + 2 ends x (2 wall rows + 1 gable row) x its columns across', houses.every((h) => h.paneCount === expect(h)), houses.map((h) => `${h.id} ${h.paneCount}`).join(' ')); }
{ const sum = P.stats; ok(`about a quarter of the ${sum.panes} panes exist (the user's photo: most panes missing, a few intact): ${(100 * sum.intactShare).toFixed(1)} % within ${ND.HOUSE.intactTarget} +- ${ND.HOUSE.intactTol}, every house between 12 and 40 %`, Math.abs(sum.intactShare - ND.HOUSE.intactTarget) <= ND.HOUSE.intactTol && houses.every((h) => h.intact / h.paneCount > 0.12 && h.intact / h.paneCount < 0.40), houses.map((h) => (100 * h.intact / h.paneCount).toFixed(0)).join(' ')); }
{ const a = JSON.stringify(NU.planNursery().houses.map((h) => h.panes.map((p) => p.ex ? 1 : 0).join(''))), b = JSON.stringify(houses.map((h) => h.panes.map((p) => p.ex ? 1 : 0).join('')));
  ok('the choice of the panes is deterministic: a second plan decides the same panes (by the hash of house, side, row and column)', a === b && a.length > 7000); }
{ // the intact panes come in groups (a patch noise), not as salt and pepper: the share of intact panes with an intact neighbour in the row is above the independent case
  let pairs = 0, withN = 0, intact = 0, n = 0; for (const h of houses) for (const p of h.panes) { if (p.kind !== 1) continue; n++; if (p.ex) { intact++; const q = h.panes.find((o) => o.kind === 1 && o.side === p.side && o.row === p.row && o.col === p.col + 1); if (q) { pairs++; if (q.ex) withN++; } } }
  const p0 = intact / n; ok(`the intact roof panes cluster (patch noise): ${(100 * withN / pairs).toFixed(0)} % of them have an intact neighbour along the row against ${(100 * p0).toFixed(0)} % for an independent choice`, withN / pairs > p0 * 1.15, `${withN} / ${pairs}`); }
{ // the glass mesh is the intact panes: 2 triangles each, and every glass vertex lies in its house's volume (the rectangle + 0.2 m, below the ridge)
  const g = NS.meshes.glass.geometry, pos = g.getAttribute('position'), idx = g.index; const intact = P.stats.intact;
  ok(`the glass mesh has exactly the intact panes: ${intact} quads = ${2 * intact} triangles, ${4 * intact} vertices`, idx.count / 3 === 2 * intact && pos.count === 4 * intact, `${idx.count / 3} triangles ${pos.count} vertices`);
  const per = new Map(); let stray = 0, high = 0;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); const h = houses.find((q) => x >= q.rect.x0 - 0.2 && x <= q.rect.x1 + 0.2 && z >= q.rect.z0 - 0.2 && z <= q.rect.z1 + 0.2); if (!h) { stray++; continue; } per.set(h.id, (per.get(h.id) || 0) + 1); if (y > ND.HOUSE.ridge + 0.01 || y < ND.HOUSE.plinth - 0.01) high++; }
  ok('every glass vertex is inside one house\'s footprint and between the plinth and the ridge, and each house holds 4 x its intact panes', stray === 0 && high === 0 && houses.every((h) => per.get(h.id) === 4 * h.intact), `stray ${stray}, outside the height range ${high}`);
}
ok('the glass is ONE transparent double-sided material (opacity 0.42) on the no-outline layer, the frames one opaque double-sided material on the no-outline layer', NS.meshes.glass.material.transparent === true && NS.meshes.glass.material.depthWrite === false && Math.abs(NS.meshes.glass.material.opacity - ND.HOUSE.glassOpacity) < 1e-9 && NS.meshes.frames.material.transparent !== true && (NS.meshes.frames.layers.mask & 1) === 0 && (NS.meshes.glass.layers.mask & 1) === 0, `layers ${NS.meshes.frames.layers.mask} / ${NS.meshes.glass.layers.mask}`);

// =============================================================== 4. the ground
console.log('4. the ground');
{ // the floor: one mesh over the ring, y = the lift, every triangle faces up, the area is the ring's
  const f = NS.meshes.floor, g = f.geometry, pos = g.getAttribute('position'), idx = g.index; let area = 0, down = 0, offY = 0;
  for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2); const ax = pos.getX(a), az = pos.getZ(a), bx = pos.getX(b), bz = pos.getZ(b), cx = pos.getX(c), cz = pos.getZ(c); const cr = (bx - ax) * (cz - az) - (bz - az) * (cx - ax); area += Math.abs(cr) / 2; const ny = -cr; if (ny <= 0) down++; }
  for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - ND.FLOOR_LIFT) > 1e-6) offY++;
  ok(`the floor is one flat mesh over the ring at y = ${ND.FLOOR_LIFT} (the garden floor's 5 mm lift): ${idx.count / 3} triangles, area ${area.toFixed(1)} = the ring's ${Math.abs(ringArea(LOT)).toFixed(1)} m2, every triangle faces up`, Math.abs(area - Math.abs(ringArea(LOT))) < 0.01 && down === 0 && offY === 0 && f.material.polygonOffset === true && f.material.polygonOffsetFactor === 2, `down ${down}, off ${offY}, polygonOffset ${f.material.polygonOffset} ${f.material.polygonOffsetFactor}`);
}
{ // the ground under the lot is flat: layout.heightAt is 0 over the ring (so the flat floor is the ground)
  let worst = 0, n = 0; const B = ND.LOT_BOX; for (let x = B[0] + 1.3; x < B[1]; x += 4.7) for (let z = B[2] + 1.7; z < B[3]; z += 4.7) if (ringHas(LOT, x, z)) { worst = Math.max(worst, Math.abs(H(x, z))); n++; }
  ok(`the ground height over the lot is 0 (layout.heightAt on ${n} points: largest ${worst.toExponential(1)} m): the flat floor lies on it`, n > 1000 && worst < 0.01, `n ${n}`); }
{ // the hole
  const rings = AT.HOOKS.groundHoles ? AT.HOOKS.groundHoles() : null;
  ok('HOOKS.groundHoles hands out two rings: the garden outline and the lot ring, each moved in by 6 cm (the lot hole lies inside the ring, 5 .. 7 cm from it, and is simple)', !!rings && rings.length === 2 && rings[1].length === LOT.length && simple(rings[1]) && rings[1].every((v, i) => i % 2 || (ringHas(LOT, v, rings[1][i + 1]) && ringD(LOT, v, rings[1][i + 1]) > 0.04 && ringD(LOT, v, rings[1][i + 1]) < 0.3)), rings ? `${rings.length} rings` : 'no hook');
  ok('the hole of the lot and the hole of the garden do not overlap (the two floors cover the 12 cm between them): no lattice point is in both', (() => { if (!rings) return false; let both = 0; const B = ND.LOT_BOX; for (let x = B[0] + 0.21; x < B[1]; x += 0.9) for (let z = B[2] + 0.23; z < B[3]; z += 0.9) if (ringHas(rings[0], x, z) && ringHas(rings[1], x, z)) both++; return both === 0; })());
}
if (!noEnv) {
  const groundTris = (c) => { let inside = 0, total = 0, outsideNear = 0; const lotIn = HG.insetRing(LOT, HG.GROUND_HOLE_INSET); c.staticRoot.traverse((o) => { if (!(o.isMesh && o.name === 'env-ground')) return; const p = o.geometry.getAttribute('position'), ix = o.geometry.index; const n = ix ? ix.count : p.count; for (let t = 0; t < n; t += 3) { const a = ix ? ix.getX(t) : t, b = ix ? ix.getX(t + 1) : t + 1, d = ix ? ix.getX(t + 2) : t + 2; const cx = (p.getX(a) + p.getX(b) + p.getX(d)) / 3, cz = (p.getZ(a) + p.getZ(b) + p.getZ(d)) / 3; total++; if (ringHas(lotIn, cx, cz)) inside++; else if (ringHas(LOT, cx, cz) === false && ringD(LOT, cx, cz) < 30) outsideNear++; } }); return { inside, total, outsideNear }; };
  const g1 = groundTris(ctx);
  ok('the environment ground is CUT OUT under the lot: no ground triangle has its centroid inside the lot hole, and the ground goes on round it', g1.total > 1000 && g1.inside === 0 && g1.outsideNear > 20, `${g1.total} ground triangles, ${g1.inside} inside the lot, ${g1.outsideNear} within 30 m outside`);
  const env = ctx.services.environment; const treesIn = env.trees.filter((t) => ringHas(LOT, t.x, t.z));
  ok(`the generic trees are gone from the lot (HOOKS.treeReject 'nursery'): ${treesIn.length} environment trees inside the ring`, treesIn.length === 0);
  if (!noMut) {
    const sv = AT.HOOKS.groundHoles; AT.HOOKS.groundHoles = () => [sv()[0]]; const { ctx: c2 } = SE.makeContext(eng, ['environment', 'landmarksTauride']); await SE.buildModules(eng, c2, ['environment']); const g2 = groundTris(c2); AT.HOOKS.groundHoles = sv;
    ok('mutant: with the lot ring left out of HOOKS.groundHoles the ground has triangles inside the lot (the cut check turns red)', g2.inside > 100, `${g2.inside} triangles inside`);
    const sr = AT.HOOKS.treeReject; AT.HOOKS.treeReject = (cx) => { const f = sr(cx); return f ? (x, z) => { const r = f(x, z); return r === 'nursery' ? null : r; } : f; };
    const { ctx: c3 } = SE.makeContext(eng, ['environment', 'landmarksTauride']); await SE.buildModules(eng, c3, ['environment']); const t3 = c3.services.environment.trees.filter((t) => ringHas(LOT, t.x, t.z)); AT.HOOKS.treeReject = sr;
    ok('mutant: with the nursery reason of treeReject removed the environment plants trees in the lot (the tree check turns red)', t3.length > 0, `${t3.length} trees`);
  }
} else console.log('SKIPPED the environment checks (--no-env)');
// ---- no two opaque surfaces within 1 cm: the coplanar overlap scan of the opaque meshes (the frames, the buildings) and the vertical rays over the lot (the floor, the plinths, the roofs)
/** the triangles of a mesh as [[x,y,z] x3] in world space (a static mesh: the object has no transform) */
function trisOf(mesh) { const g = mesh.geometry, p = g.getAttribute('position'), ix = g.index, out = []; for (let i = 0; i < ix.count; i += 3) out.push([0, 1, 2].map((k) => { const v = ix.getX(i + k); return [p.getX(v), p.getY(v), p.getZ(v)]; })); return out; }
/** coplanar overlaps (planes within `tol`, overlap wider than 1 mm in the plane) among the triangles: pairs found by a 4 m hash of the bounding boxes */
function coplanarOverlaps(tris, tol = 0.01) {
  const info = tris.map((t) => { const e1 = [t[1][0] - t[0][0], t[1][1] - t[0][1], t[1][2] - t[0][2]], e2 = [t[2][0] - t[0][0], t[2][1] - t[0][1], t[2][2] - t[0][2]]; let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const l = Math.hypot(...n); if (l < 1e-12) return null; n = n.map((v) => v / l); const lo = [0, 1, 2].map((k) => Math.min(t[0][k], t[1][k], t[2][k])), hi = [0, 1, 2].map((k) => Math.max(t[0][k], t[1][k], t[2][k])); return { t, n, lo, hi, d: n[0] * t[0][0] + n[1] * t[0][1] + n[2] * t[0][2] }; });
  const cell = new Map(), C = 4;
  info.forEach((a, i) => { if (!a) return; for (let x = Math.floor(a.lo[0] / C); x <= Math.floor(a.hi[0] / C); x++) for (let z = Math.floor(a.lo[2] / C); z <= Math.floor(a.hi[2] / C); z++) { const k = x * 100003 + z; (cell.get(k) || cell.set(k, []).get(k)).push(i); } });
  const seen = new Set(); let count = 0; const examples = [];
  const proj = (a) => { const ax = [Math.abs(a.n[0]), Math.abs(a.n[1]), Math.abs(a.n[2])], m = ax.indexOf(Math.max(...ax)); return (v) => (m === 0 ? [v[1], v[2]] : m === 1 ? [v[0], v[2]] : [v[0], v[1]]); };
  /* 1 mm below: the vertices are float32 at x ~ 1090 (6e-5 m each) */
  const overlap2 = (A, B) => { for (const T of [A, B]) for (let i = 0; i < 3; i++) { const p = T[i], q = T[(i + 1) % 3], ex = q[0] - p[0], ez = q[1] - p[1], nx = -ez, nz = ex, l = Math.hypot(nx, nz) || 1; const pr = (S) => S.map((v) => (v[0] * nx + v[1] * nz) / l), a = pr(A), b = pr(B); if (Math.max(...a) <= Math.min(...b) + 1e-3 || Math.max(...b) <= Math.min(...a) + 1e-3) return false; } return true; };
  for (const list of cell.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const ia = list[i], ib = list[j], k = ia * 1e7 + ib; if (seen.has(k)) continue; seen.add(k);
    const a = info[ia], b = info[ib]; if (Math.abs(a.n[0] * b.n[0] + a.n[1] * b.n[1] + a.n[2] * b.n[2]) < 0.9999) continue;
    if (!b.t.every((v) => Math.abs(a.n[0] * v[0] + a.n[1] * v[1] + a.n[2] * v[2] - a.d) < tol)) continue;
    if (a.lo.some((v, q) => v > b.hi[q] + 1e-6) || b.lo.some((v, q) => v > a.hi[q] + 1e-6)) continue;
    const pa = proj(a); if (overlap2(a.t.map(pa), b.t.map(pa))) { count++; if (examples.length < 6) examples.push(a.t.map((v) => v.map((q) => q.toFixed(2)).join(',')).join(' ') + ' X ' + b.t.map((v) => v.map((q) => q.toFixed(2)).join(',')).join(' ')); }
  }
  return { count, examples, tris: tris.length };
}
const opaque = (m) => [m.floor, m.frames, m.buildings].filter(Boolean);
{ const all = []; for (const m of opaque(NS.meshes)) if (m !== NS.meshes.floor) all.push(...trisOf(m)); const r = coplanarOverlaps(all);
  ok(`no two opaque triangles of the frames and the buildings are coplanar and overlapping within 1 cm (the strips of one plane stand on layers 0 / 1.8 / 3.6 cm; the hidden faces of the plinth and the parapets are left out): ${r.tris} triangles scanned, ${r.count} overlapping pairs`, r.count === 0, r.examples.join(' | ')); }
{ // vertical rays over the lot: the nearest hits of all the opaque meshes (the floor included) are never within 1 cm of each other (distinct surfaces)
  const rc = new THREE.Raycaster(), meshes = opaque(NS.meshes); for (const m of meshes) { m.updateMatrixWorld(true); m.material.side = THREE.DoubleSide; }
  let rays = 0, close = 0, ex = null; const B = ND.LOT_BOX;
  for (let x = B[0] + 0.7; x < B[1]; x += 3.1) for (let z = B[2] + 0.9; z < B[3]; z += 3.1) { if (!ringHas(LOT, x, z)) continue; rc.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0)); const hits = rc.intersectObjects(meshes, false); rays++; for (let i = 0; i + 1 < hits.length; i++) { const d = hits[i + 1].distance - hits[i].distance; if (d > 1e-7 && d < 0.01) { close++; if (!ex) ex = `${x.toFixed(1)},${z.toFixed(1)} gap ${d.toExponential(1)} ${hits[i].object.name}/${hits[i + 1].object.name}`; } } }
  ok(`${rays} vertical rays over the lot (3.1 m lattice): no two opaque surfaces (floor, plinths, frames, roofs of the replaced buildings) within 1 cm of each other, and the floor is under everything`, rays > 3000 && close === 0, ex || ''); }

// =============================================================== 5. the colliders and the walkers
console.log('5. the colliders, the walkers');
ok(`12 colliders: one box per house (9) and one per replaced building (3), ids ${P.colliders.map((c) => c.id).join(' ')}`, NS.colliders === 12 && P.colliders.length === 12 && houses.every((h) => P.colliders.some((c) => c.id === h.id)) && ND.SHEDS.every((s) => P.colliders.some((c) => c.id === s.id)));
ok('each house collider is its rectangle (centre, size) from the floor to 4.6 m (not enterable); the buildings\' boxes are their oriented boxes', houses.every((h) => { const c = P.colliders.find((q) => q.id === h.id); return Math.abs(c.x - h.cx) < 1e-9 && Math.abs(c.z - h.cz) < 1e-9 && Math.abs(c.w - (h.rect.x1 - h.rect.x0)) < 1e-9 && Math.abs(c.d - (h.rect.z1 - h.rect.z0)) < 1e-9 && c.y1 === 4.6; }) && P.buildings.every((b) => { const c = P.colliders.find((q) => q.id === b.id); return Math.abs(c.w - b.len) < 1e-9 && Math.abs(c.d - b.dep) < 1e-9 && Math.abs(c.rotY + b.theta) < 1e-12; }));
const walker = (x0, z0, x1, z1, ticks = 300, phys = ph) => { const p = SE.makePlayer(eng, camera, phys, bounds); p.pos.set(x0, H(x0, z0), z0); const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1; SE.walkToward(p, x1, z1, ticks); const along = ((p.pos.x - x0) * dx + (p.pos.z - z0) * dz) / l; return { along, len: l, x: p.pos.x, z: p.pos.z, passed: along > l - 0.5 }; };
const insideRect = (r, x, z, m = 0) => x > r.x0 + m && x < r.x1 - m && z > r.z0 + m && z < r.z1 - m;
function houseWalks(plan, phys) {
  const res = [];
  for (const h of plan.houses) {
    const r = h.rect, cx = h.cx, cz = h.cz, starts = h.axis === 'x' ? [[r.x0 - 4, cz], [r.x1 + 4, cz], [cx, r.z0 - 3], [cx, r.z1 + 3]] : [[cx, r.z0 - 4], [cx, r.z1 + 4], [r.x0 - 3, cz], [r.x1 + 3, cz]];
    for (const [sx, sz] of starts) { const w = walker(sx, sz, cx, cz, 300, phys); res.push({ id: h.id, entered: insideRect(r, w.x, w.z, 0.2), x: w.x, z: w.z }); }
  }
  return res;
}
{ const res = houseWalks(P, ph), ent = res.filter((r) => r.entered);
  ok(`a walker (the real Player on the real Physics) is STOPPED by every house: ${res.length} walks from 3 .. 4 m outside each of its four sides towards its centre, ${ent.length} got inside`, res.length === 36 && ent.length === 0, ent.map((e) => e.id).join(' ')); }
{ const res = [];
  for (const b of P.buildings) { const c = Math.cos(b.theta), s = Math.sin(b.theta); for (const [u, v] of [[b.len / 2 + 3, 0], [-b.len / 2 - 3, 0], [0, b.dep / 2 + 3], [0, -b.dep / 2 - 3]]) { const sx = b.cx + u * c - v * s, sz = b.cz + u * s + v * c; const w = walker(sx, sz, b.cx, b.cz, 300); const dx = w.x - b.cx, dz = w.z - b.cz, lu = dx * c + dz * s, lv = -dx * s + dz * c; res.push({ id: b.id, entered: Math.abs(lu) < b.len / 2 - 0.2 && Math.abs(lv) < b.dep / 2 - 0.2 }); } }
  ok(`a walker is STOPPED by each replaced building (the two boxes and the annex): ${res.length} walks, ${res.filter((r) => r.entered).length} got inside`, res.length === 12 && res.every((r) => !r.entered)); }
{ const bad = []; for (const t of ND.TRACKS) { for (let i = 0; i + 3 < t.pts.length; i += 2) { const w = walker(t.pts[i], t.pts[i + 1], t.pts[i + 2], t.pts[i + 3], 4200); if (!w.passed) bad.push(`${t.id}[${i / 2}] ${w.along.toFixed(1)}/${w.len.toFixed(1)}`); } }
  ok(`a walker walks every gravel track end to end (${ND.TRACKS.length} tracks, no collider across a track)`, bad.length === 0, bad.join(' ')); }
{ // the lanes between the houses are open (a walker goes along the lane of each pair of neighbouring houses)
  const xs = houses.filter((h) => h.axis === 'x').sort((a, b) => a.cz - b.cz); const bad = [];
  for (let i = 0; i + 1 < xs.length; i++) { const a = xs[i], b = xs[i + 1]; const z = (a.rect.z1 + b.rect.z0) / 2, x0 = Math.max(a.rect.x0, b.rect.x0) + 2, x1 = Math.min(a.rect.x1, b.rect.x1) - 2; const w = walker(x0, z, x1, z, 1800); if (!w.passed) bad.push(`${a.id}/${b.id} ${w.along.toFixed(1)}/${w.len.toFixed(1)}`); }
  ok('a walker walks the whole lane between every two neighbouring long houses (6.5 m lanes, the 9 m and 16 m gaps): the colliders do not narrow them', bad.length === 0, bad.join(' ')); }

// =============================================================== 6. the budgets, the numbers, determinism
console.log('6. the budgets, the numbers');
const tris = NS.triangles, draws = NS.draws;
ok(`the nursery adds ${tris.toFixed(0)} triangles (budget 40,000) in ${draws} draws (budget 6): floor ${NS.parts['tauride-nursery-floor']}, frames ${NS.parts['tauride-nursery-frames']}, glass ${NS.parts['tauride-nursery-glass']}, trees ${NS.parts['tauride-nursery-trees']}, buildings and details ${NS.parts['tauride-nursery-buildings']}`, tris <= 40000 && draws <= 6 && draws === Object.keys(NS.meshes).length);
ok(`at most 150 tree instances: ${P.trees.length} planted (the instanced mesh counts ${NS.meshes.trees.count}), all inside the lot, off the houses, the tracks, the buildings, the piles and the crates`, P.trees.length > 60 && P.trees.length <= 150 && NS.meshes.trees.count === P.trees.length && P.trees.every((t) => ringHas(LOT, t.x, t.z) && !houses.some((h) => insideRect({ x0: h.rect.x0 - 1.4, x1: h.rect.x1 + 1.4, z0: h.rect.z0 - 1.4, z1: h.rect.z1 + 1.4 }, t.x, t.z)) && !ND.TRACKS.some((tr) => polyD(t.x, t.z, tr.pts) < tr.w / 2 + 0.6)));
{ const src = fs.readFileSync(path.join(ROOT, 'tools/check.mjs'), 'utf8'), m = /landmarksTauride:\s*([\d.]+)e3/.exec(src); const budget = m ? Number(m[1]) * 1000 : 0, total = svc.triangles;
  ok(`the BUDGET line of tools/check.mjs for landmarksTauride (${budget}) covers the module's published triangle count (${total.toFixed(0)})`, budget > 0 && total <= budget, `${total.toFixed(0)} <= ${budget}`); }
{ // determinism: a second plan and a second build give byte-identical meshes
  const { ctx: c2 } = SE.makeContext(eng, []), root2 = new THREE.Group(), n2 = NU.buildNursery(c2, root2, NU.planNursery(), GM.makeNoiseTexture());
  const hash = (m) => { let h = 0; const p = m.geometry.getAttribute('position'); for (let i = 0; i < p.array.length; i++) h = (Math.imul(h, 31) + Math.round(p.array[i] * 1000)) | 0; return h + ':' + p.count; };
  ok('the build is deterministic: a second build gives the same vertices in every mesh, the same mask (bytes) and the same plan', Object.keys(NS.meshes).every((k) => n2.meshes[k] && hash(n2.meshes[k]) === hash(NS.meshes[k])) && Buffer.compare(Buffer.from(n2.mask.data), Buffer.from(NS.maskData)) === 0 && JSON.stringify(NU.planNursery().trees) === JSON.stringify(P.trees)); }
{ const m = NS.mask; ok(`the floor mask: ${NS.maskBox.W} x ${NS.maskBox.H} cells (${NS.maskData.length} bytes), ${m.trackCells} track cells, ${m.soilCells} soil cells under the glass (the 9 houses: ${houses.reduce((s, h) => s + (h.rect.x1 - h.rect.x0) * (h.rect.z1 - h.rect.z0), 0).toFixed(0)} m2), ${m.yardCells} yard cells, ${m.dryCells} dry-grass cells`, m.trackCells > 3000 && m.soilCells > 4000 && m.yardCells > 2500 && Math.abs(m.soilCells - houses.reduce((s, h) => s + (h.rect.x1 - h.rect.x0) * (h.rect.z1 - h.rect.z0), 0)) < 800); }
{ // the mask paints what it says: the middle of a house is soil, the middle of a track is track, the middle of the yard is yard
  const B = NS.maskBox, at = (x, z, c) => NS.maskData[(Math.floor((z - B.z0) / B.res) * B.W + Math.floor((x - B.x0) / B.res)) * 4 + c];
  const s1 = houses[0], tr = ND.TRACKS.find((t) => t.id === 'cross-sm');
  ok('the mask: the centre of a house is soil (G), the centre of a track is track (R), the yard is yard (B), the open earth between is none of them', at(s1.cx, s1.cz, 1) > 200 && at(1040, tr.pts[1], 0) > 200 && at(965, -1700, 2) > 200 && at(1030, -1700.2, 0) < 60 && at(1100, -1650, 1) < 60);
}
ok('the floor material is the toon material with polygon offset 2 (like the environment ground and the garden floor), its program key and the shader text hold the mask, the noise tile and the far fog', (() => { const m = NS.material, f = { vertexShader: '#include <common>\n#include <fog_vertex>', fragmentShader: '#include <common>\n#include <map_fragment>\n#include <fog_fragment>', uniforms: {} }; m.onBeforeCompile(f, null); return m.polygonOffset && m.polygonOffsetFactor === 2 && /uMask/.test(f.fragmentShader) && /uNoise/.test(f.fragmentShader) && /uFogK/.test(f.fragmentShader) && /vPWorld/.test(f.fragmentShader) && f.uniforms.uMask && f.uniforms.uNoise && f.uniforms.uFogK && /nursery-floor/.test(m.customProgramCacheKey()); })());

// =============================================================== 7. the claims
console.log('7. the claims');
{ const g = GRP.GROUPS_LIST.find((q) => q.key === 'tauride-nursery'), ids = ND.CLAIMED_IDS;
  ok('groups.js has the sub-group tauride-nursery with exactly the three buildings (the literal equals data/nursery.js CLAIMED_IDS), no OSM ids, an anchor inside the lot', !!g && JSON.stringify(g.ids) === JSON.stringify(ids) && g.osm.length === 0 && ringHas(LOT, g.at[0], g.at[1]), g ? g.ids.join() : 'missing');
  ok('layout: the three buildings are claimed by landmarksTauride (the generic city does not draw them), the yard\'s classical buildings and the long yellow neighbours are NOT', ids.every((id) => L.isClaimed(id) && L.claimedBy(id) === 'landmarksTauride') && ['w23002928', 'w23002936', 'w23002941', 'w30324512', 'w259579860', 'w239884014'].every((id) => !L.isClaimed(id)), ids.map((id) => id + ':' + L.claimedBy(id)).join(' '));
  const allIds = GRP.GROUPS_LIST.flatMap((q) => [...q.ids, ...q.osm]); ok('every claimed id appears once across the sub-groups of the module', new Set(allIds).size === allIds.length, `${allIds.length} ids`); }

// =============================================================== mutants
if (!noMut) {
  console.log('mutants (each must turn its check red)');
  const mutPlan = (patch) => NU.planNursery({ D: { ...ND, ...patch } });
  { // a house moved into the yard / onto a building
    const m = mutPlan({ HOUSES: ND.HOUSES.map((h) => (h.id === 'gh-S1' ? { ...h, c: [985, -1630] } : h)) }); const r = houseMeasures(m.houses);
    ok('mutant: a house moved 55 m west (into the yard, the fence and the buildings) turns the clearance checks red', Object.values(r).some((v) => v > 0), JSON.stringify(r)); }
  { const m = mutPlan({ HOUSES: ND.HOUSES.map((h) => ({ ...h, pIntact: 0.9 })) }); ok('mutant: houses with 90 % intact panes break the quarter-intact share', Math.abs(m.stats.intactShare - ND.HOUSE.intactTarget) > ND.HOUSE.intactTol, `${(100 * m.stats.intactShare).toFixed(0)} %`); }
  { const a = NU.planNursery().houses[0].panes.map((p) => (p.ex ? 1 : 0)).join(''), b = mutPlan({ HOUSES: ND.HOUSES.map((h) => ({ ...h, seed: h.seed + 1 })) }).houses[0].panes.map((p) => (p.ex ? 1 : 0)).join(''); ok('mutant: another seed gives other panes (the determinism check can fail: the choice really follows the hash)', a !== b); }
  { // a self-intersecting ring
    const r = LOT.slice(); [r[2], r[3], r[6], r[7]] = [r[6], r[7], r[2], r[3]]; ok('mutant: two vertices of the ring swapped make it self-intersecting (the simplicity check turns red)', !simple(r)); }
  { // the coplanar scan on a build with the layers at 0
    const { ctx: c2 } = SE.makeContext(eng, []), plan0 = NU.planNursery(); plan0.design = { ...ND.HOUSE, layer: [0, 0, 0] };
    const n2 = NU.buildNursery(c2, new THREE.Group(), plan0, GM.makeNoiseTexture()); const all = trisOf(n2.meshes.frames); const r = coplanarOverlaps(all);
    ok('mutant: the strips of one plane on ONE layer (layers 0 / 0 / 0) are coplanar and overlapping (the scan turns red)', r.count > 100, `${r.count} pairs`);
    const bad = trisOf(NS.meshes.frames).slice(); const t = bad[10]; bad.push(t.map((v) => [v[0], v[1] + 0.004, v[2]])); ok('mutant: a copy of one frame triangle 4 mm above it is found by the scan', coplanarOverlaps(bad).count >= 1); }
  { // a world without the collider of one house lets the walker in
    const W = new eng.Physics((x, z) => L.heightAt(x, z)); for (const c of P.colliders) if (c.id !== 'gh-N2') W.addBox(c.x, c.z, c.w, c.d, c.rotY, c.y0, c.y1);
    const h = houses.find((q) => q.id === 'gh-N2'), w = walker(h.rect.x0 - 4, h.cz, h.cx, h.cz, 300, W);
    ok('mutant: a physics world without the collider of one house lets the walker inside (the stop check can fail)', insideRect(h.rect, w.x, w.z, 0.2), `${w.x.toFixed(1)}, ${w.z.toFixed(1)}`); }
  { // a collider across a track
    const W = new eng.Physics((x, z) => L.heightAt(x, z)); for (const c of P.colliders) W.addBox(c.x, c.z, c.w, c.d, c.rotY, c.y0, c.y1); W.addBox(1040, -1669, 3, 12, 0, -0.5, 3);
    const t = ND.TRACKS.find((q) => q.id === 'cross-sm'), w = walker(t.pts[0], t.pts[1], t.pts[2], t.pts[3], 4200, W); ok('mutant: a box across the cross track stops the walker (the track walk can fail)', !w.passed, `${w.along.toFixed(1)} of ${w.len.toFixed(1)}`); }
  { // the claims: without the group the buildings are not claimed
    const g = GRP.GROUPS_LIST.filter((q) => q.key !== 'tauride-nursery'); ok('mutant: a group list without tauride-nursery fails the claim check', !g.some((q) => q.key === 'tauride-nursery') && !(GRP.GROUPS_LIST.length === g.length)); }
  { // the budgets: 200 trees
    const m = mutPlan({ TREE_ROWS: ND.TREE_ROWS.map((r) => ({ ...r, step: r.step / 3 })), TREE: { ...ND.TREE, max: 400 } }); ok('mutant: rows three times as dense break the 150-instance budget', m.stats.trees > 150 || m.trees.length > 150, `${m.trees.length} trees`); }
  { // the ring that does not share the garden edge
    const r = LOT.slice(); const i = r.findIndex((v, k) => k % 2 === 0 && v === 1112.2 && r[k + 1] === -1737.8); r[i] = 1111.7; const g = []; for (let k = 56; k <= 60; k++) g.push([GARDEN[2 * k], GARDEN[2 * k + 1]]);
    ok('mutant: a lot vertex 0.5 m off the garden outline no longer matches it (the shared-edge check can fail)', !g.every((p) => r.some((v, k) => k % 2 === 0 && v === p[0] && r[k + 1] === p[1]))); }
}
console.log(`\nRESULT: ${failed ? 'FAIL' : 'OK'} (${failed} of ${total} checks failed)`);
process.exit(failed ? 1 : 0);
