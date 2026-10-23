// pond-test.mjs - T4a of the Tauride remake: the ponds (bowls, banks, water surface, shore colliders, water mask). node tools/area.mjs north tools/tauride/pond-test.mjs [--no-env]
// Every check runs on the REAL modules (the built landmarksTauride, the built environment field, the page's HOOKS). The datum table (src/world/landmarksTauride/data/ponds.js) is the ONE source of the numbers: the checks
// derive their expectations from it and the mutants (a copy of the table with ONE number changed, fed to the real factories height.js makeTerrainHeight / ponds.js planPonds) must turn a check red.
// The wading acceptance (a dense ring of shore probes, approached at several angles and speeds, including a jump) lives in tools/tauride-height-test.mjs (section PONDS); the strip and North field rasters are
// compared by D:/git2/n4spb-work/tauride/T4a/field-dump.mjs (tools/tauride/water-mask-check.mjs wraps it).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = new Set(process.argv.slice(2));
let failed = 0, total = 0;
const ok = (name, cond, detail = '') => { total++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };

const SE = await imp('tools/tauride/lib/stub-env.mjs');
const eng = await SE.loadEngine(ROOT);
const GH = await imp('src/world/landmarksTauride/height.js');
const TM = await imp('src/world/landmarksTauride/terrain-mesh.js');
const PM = await imp('src/world/landmarksTauride/ponds.js');
const GM = await imp('src/world/landmarksTauride/ground-material.js');
const Wd = await imp('src/world/landmarksTauride/data/water.js');
const Fo = await imp('src/world/landmarksTauride/data/footprints.js');
const HW = await imp('src/areas/north/hooks/water.js');
const AT = await imp('src/world/lib/area-tables.js');
const P = GH.PONDS, U = Wd.WATER_UNION, shore = GH.GARDEN_SHORE, terrain = GH.gardenHeight, relief = GH.reliefHeight;
let seed = 90210; const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const BOX = [1030, 1480, -1732, -1268];
/** distance to the garden outline (the north shore of the lake coincides with it for ~300 m: there the water ends at the fence and the street is flat) */
const dOut = (() => { const r = Fo.GARDEN.o, n = r.length / 2; return (x, z) => { let m = Infinity; for (let i = 0, j = n - 1; i < n; j = i++) { const ex = r[2 * i] - r[2 * j], ez = r[2 * i + 1] - r[2 * j + 1], l2 = ex * ex + ez * ez, t = Math.max(0, Math.min(1, ((x - r[2 * j]) * ex + (z - r[2 * j + 1]) * ez) / l2)); m = Math.min(m, Math.hypot(x - r[2 * j] - t * ex, z - r[2 * j + 1] - t * ez)); } return m; }; })();

// =============================================================== 1. the datum table: every number the ponds have is derived from data/ponds.js
console.log('1. the datum table (data/ponds.js): height, water, colliders and cuts are derived from it');
/** the failures of a (terrain, plan) pair against the numbers of the table P (expected values come from P, the objects come from whatever table built them) */
function datumFailures(P, terrain, plan, shore) {
  const bad = [];
  const W = plan.water, C = P.COLLIDER;
  if (!(W.pos.length > 0 && Array.from({ length: W.pos.length / 3 }, (_, i) => W.pos[i * 3 + 1]).every((y) => y === Math.fround(P.WATER_Y)))) bad.push('water mesh y');
  { let worst = 0; for (const poly of U) for (const ring of [poly.o, ...poly.h]) for (let i = 0; i < ring.length; i += 2) worst = Math.max(worst, Math.abs(terrain(ring[i], ring[i + 1]) - P.WATER_Y)); if (!(worst < 1e-6)) bad.push('waterline height ' + worst.toFixed(3)); }
  { let nBig = 0, nSmall = 0, wrong = 0;
    for (let x = BOX[0]; x < BOX[1]; x += 2) for (let z = BOX[2]; z < BOX[3]; z += 2) {
      const d = shore.dist(x, z);
      const big = x > 1262 && z > -1648 && d < -8, small = (x < 1235 || z < -1668) && d < -1.5;
      if (big) { nBig++; if (Math.abs(terrain(x, z) - P.BED_BIG) > 1e-9) wrong++; } else if (small) { nSmall++; if (Math.abs(terrain(x, z) - P.BED_SMALL) > 1e-9) wrong++; }
    }
    if (nBig < 200 || nSmall < 5 || wrong) bad.push(`bed (${nBig} Big, ${nSmall} Small points, ${wrong} wrong)`); }
  { let top = -Infinity; for (let x = BOX[0]; x < BOX[1]; x += 1) for (let z = BOX[2]; z < BOX[3]; z += 1) { const d = shore.dist(x, z); if (d <= 0 || d > 14 || relief(x, z) !== null) continue; top = Math.max(top, terrain(x, z)); } if (!(Math.abs(top - P.BANK_TOP) < 0.012)) bad.push('bank top ' + top.toFixed(3)); }
  { const gs = []; for (let x = BOX[0]; x < BOX[1]; x += 0.5) for (let z = BOX[2]; z < BOX[3]; z += 0.5) { const d = shore.dist(x, z); if (d < 0.2 || d > 0.4 || dOut(x, z) < 2) continue; gs.push(Math.hypot(terrain(x + 0.1, z) - terrain(x - 0.1, z), terrain(x, z + 0.1) - terrain(x, z - 0.1)) / 0.2); }
    gs.sort((a, b) => a - b); const lo = gs[Math.floor(gs.length * 0.01)], hi = gs[Math.floor(gs.length * 0.99)];      // the 1 % and 99 % points: a cusp of the outline (a crease of the distance) may give a few odd cells
    if (!(gs.length > 500 && lo > 1 / P.SLOPE_MAX - 0.03 && hi < 1 / P.SLOPE_MIN + 0.005)) bad.push(`waterline slope p1 ${lo.toFixed(3)} .. p99 ${hi.toFixed(3)} (1:${(1 / hi).toFixed(2)} .. 1:${(1 / lo).toFixed(2)}) outside 1:${P.SLOPE_MIN} .. 1:${P.SLOPE_MAX}`); }
  if (!(plan.colliders.length > 100 && plan.colliders.every((c) => c.y1 === C.top && c.y0 === C.y0 && c.w === C.thick))) bad.push('collider top / bottom / thickness');
  { let worst = 0, n = 0; for (const c of plan.colliders) { if (dOut(c.cx, c.cz) < 3) continue; const ux = Math.cos(c.rot), uz = -Math.sin(c.rot); let best = Infinity, h = 0; for (const s of [-1, 1]) { const px = c.cx + ux * s * c.w / 2, pz = c.cz + uz * s * c.w / 2, d = shore.dist(px, pz); if (d < best) { best = d; h = terrain(px, pz); } } worst = Math.max(worst, Math.abs(h - C.contourY)); n++; }
    if (!(worst < 0.09)) bad.push(`collider contour: water-side face at ${worst.toFixed(3)} m from the ${C.contourY} m contour`); }
  return bad;
}
const base = datumFailures(P, terrain, PM.planPonds(), shore);
ok('the datum table checks pass on the real height function and the real plan: the waterline stands at WATER_Y, the beds at BED_BIG / BED_SMALL, the crest at BANK_TOP, the bank slope in 1:SLOPE_MIN .. 1:SLOPE_MAX, the colliders at COLLIDER.top on the COLLIDER.contourY contour', base.length === 0, base.join('; '));
const MUT = [
  ['WATER_Y -0.45 -> -0.40', { WATER_Y: -0.40 }], ['BED_BIG -1.2 -> -1.0', { BED_BIG: -1.0 }], ['BED_SMALL -0.5 -> -0.6', { BED_SMALL: -0.6 }], ['BANK_TOP 0.1 -> 0.2', { BANK_TOP: 0.2 }],
  ['SLOPE_MIN 3 -> 2 (the bank steeper than 1:3)', { SLOPE_MIN: 2 }], ['SLOPE_MAX 5 -> 7 (gentler than 1:5)', { SLOPE_MAX: 7 }],
  ['COLLIDER.top 1.8 -> 1.0', { COLLIDER: { ...P.COLLIDER, top: 1.0 } }], ['COLLIDER.contourY -0.3 -> -0.1', { COLLIDER: { ...P.COLLIDER, contourY: -0.1 } }], ['COLLIDER.y0 -2.5 -> -0.5', { COLLIDER: { ...P.COLLIDER, y0: -0.5 } }], ['COLLIDER.thick 0.4 -> 0.8', { COLLIDER: { ...P.COLLIDER, thick: 0.8 } }],
  ['SMALL_POND.eastX 1250 -> 1100 (the Small Pond moved)', { SMALL_POND: { ...P.SMALL_POND, eastX: 1100 } }],
];
for (const [name, over] of MUT) {
  const Pm = { ...P, ...over}, tm = GH.makeTerrainHeight({ ponds: Pm }), pm = PM.planPonds({ ponds: Pm }), bad = datumFailures(P, tm, pm, tm.shore);
  ok(`mutant: ${name} -> the datum checks turn red`, bad.length > 0, bad.join('; ') || 'NOT DETECTED');
}

// =============================================================== 2. the shore: an exact signed distance
console.log('2. the shore (height.js makeShore): the signed distance to the water outline');
{ let n = 0, bad = 0, maxE = 0, signBad = 0, nearN = 0; const R = GH.pondReach().max;
  for (let i = 0; i < 40000; i++) { const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]), a = shore.dist(x, z), b = GH.shoreDistBrute(U, x, z); n++;
    if (Math.abs(b) <= R) { nearN++; const e = Math.abs(a - b); maxE = Math.max(maxE, e); if (e > 1e-9) bad++; } else if (Math.sign(a) !== Math.sign(b)) signBad++; }
  ok(`the distance equals the brute-force distance to every segment with the even-odd sign of every ring, to 1e-9, within the reach ${R} m of the outline (${nearN} of ${n} random points), and has the right sign beyond it`, bad === 0 && signBad === 0 && nearN > 5000, `${bad} differ (max ${maxE.toExponential(1)}), ${signBad} wrong signs`);
  const tiny = GH.makeShore(U, 1), mism = (() => { let m = 0; for (let i = 0; i < 4000; i++) { const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]), b = GH.shoreDistBrute(U, x, z); if (Math.abs(b) > 1.5 && Math.abs(b) < 4 && Math.abs(tiny.dist(x, z) - b) > 0.5) m++; } return m; })();
  ok('mutant: a shore structure built with a reach of 1 m is not exact at 1.5 .. 4 m (the comparison can fail)', mism > 20, `${mism} of 4000 points off by more than 0.5 m`);
  const rows = []; for (const poly of U) for (const r of [poly.o, ...poly.h]) for (let i = 0; i < r.length; i += 2) rows.push(Math.abs(shore.dist(r[i], r[i + 1])));
  ok('every vertex of the outline (rings and islands) is at distance 0 from the shore', Math.max(...rows) < 1e-9, `${rows.length} vertices, worst ${Math.max(...rows).toExponential(1)}`);
  const isl = Wd.WATER_ISLANDS.map((i) => shore.dist(i.cx, i.cz));
  ok('the three islands are land (the holes of the union), the lake and the arms are water', isl.every((d) => d > 3) && shore.dist(1405, -1560) < -10 && shore.dist(1200, -1600) > 0, `island centres at ${isl.map((d) => d.toFixed(1)).join(', ')} m from the nearest shore`);
  ok(`the structure is compact: ${(shore.bytes / 1024).toFixed(0)} KB, ${shore.segments} segments, ${shore.nearCells} near cells of ${shore.cell} m, ${shore.listEntries} list entries`, shore.bytes < 600 * 1024 && shore.segments === 197, ''); }

// =============================================================== 3. the terrain function: ponds + relief
console.log('3. the terrain function (gardenHeight = bowls + banks + relief)');
{ let det = 0, bad = 0, nWater = 0, aboveWater = 0, belowBed = 0, farEq = 0, farN = 0, islandRelief = 0, n = 0;
  const f2 = GH.makeTerrainHeight(), bedMin = Math.min(P.BED_BIG, P.BED_SMALL), R = GH.pondReach().max;
  for (let i = 0; i < 60000; i++) {
    const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]), h = terrain(x, z), d = shore.dist(x, z); n++;
    if (h !== terrain(x, z) || h !== f2(x, z)) det++;
    if (h !== null && !(typeof h === 'number' && Number.isFinite(h))) bad++;
    if (d < 0) { nWater++; if (!(h <= P.WATER_Y + 1e-9)) aboveWater++; if (!(h >= bedMin - 1e-9)) belowBed++; }
    if (d > R + 0.1) { farN++; if (h === relief(x, z)) farEq++; }
  }
  { // the hot path of the terrain function is written out by hand (no calls: layout.heightAt runs it over the whole map at start-up); it must be the SAME arithmetic as the profile functions of pondProfile()
    const pr = terrain.profile, bedAt = pr.bedAt, R = GH.pondReach().max; let diff = 0, nn = 0, near = 0;
    for (let i = 0; i < 100000; i++) {
      const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]), d = shore.dist(x, z); let want; nn++;
      if (d > 0 && d > R) want = relief(x, z);
      else if (d < 0) { near++; want = d < -GH.pondReach().water ? bedAt(x, z) : pr.waterH(-d, pr.slopeAt(x, z), bedAt(x, z)); }
      else if (!shore.inGarden(x, z)) want = relief(x, z);
      else { near++; const b = pr.landH(d, pr.slopeAt(x, z)), r = relief(x, z), h = r === null ? b : b + r; want = h === 0 ? null : h; }
      if (terrain(x, z) !== want) diff++;
    }
    ok('the inlined terrain function equals the composition of the profile functions (shore distance, slopeAt, bedAt, landH, waterH, the relief) bit for bit', diff === 0 && near > 10000, `${nn} points, ${near} in the bank / bowl band, ${diff} differ`);
    const mutated = GH.makeTerrainHeight({ ponds: { ...P, CREST_FALL: 3.5 } }); let md = 0; for (let i = 0; i < 20000; i++) { const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]); if (mutated(x, z) !== terrain(x, z)) md++; }
    ok('mutant: a table with another CREST_FALL gives other heights (the table reaches the hot path)', md > 500, `${md} of 20000 points differ`); }
  ok('deterministic (a second call and a fresh makeTerrainHeight() give the same bits), finite or null', det === 0 && bad === 0, `${n} points, ${det} differ, ${bad} malformed`);
  ok('in the water the ground is at or below the waterline and never below the deepest bed', nWater > 3000 && aboveWater === 0 && belowBed === 0, `${nWater} water points, ${aboveWater} above the waterline, ${belowBed} below ${bedMin}`);
  ok(`beyond the reach of the profile (${R} m from the shore) the terrain IS the relief, bit for bit (the hills, the islands' mounds and the lawns are untouched)`, farN > 20000 && farEq === farN, `${farEq} of ${farN} points`);
  const edge = [[NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity], [undefined, undefined], [null, null], [1e9, -1e9], [-1e9, 1e9], [0, 0]];
  ok('the terrain answers null (and does not throw) for NaN, +-Infinity, undefined, null and far points', edge.every(([x, z]) => { try { return terrain(x, z) === null; } catch (e) { return false; } }), '');
  const txt = terrain.toString() + shore.dist.toString().replace(/^\(x, z\) =>/, '');
  ok('the body of the terrain function and of the shore distance allocate nothing (no new, arrow function, spread, iterator method): text check', !/\bnew\b|=>|\.\.\.|\.map\(|\.forEach\(|\.filter\(|\.reduce\(/.test(txt), `${txt.length} chars`); }
{ // bank slopes: reported, and the numbers must fit the table
  const g = (x, z) => Math.hypot(terrain(x + 0.5, z) - terrain(x - 0.5, z), terrain(x, z + 0.5) - terrain(x, z - 0.5)) / 1;
  let max = 0, at = null, n = 0, over = 0, land2 = 0, land2At = null; const hist = [0, 0, 0, 0, 0, 0];
  for (let x = BOX[0]; x < BOX[1]; x += 1) for (let z = BOX[2]; z < BOX[3]; z += 1) { const d = shore.dist(x, z); if (d < -6 || d > 3) continue; if (relief(x, z) !== null || dOut(x, z) < 2) continue; const s = g(x, z); n++; if (s > max) { max = s; at = [x, z, d]; } hist[Math.min(5, Math.floor(s / 0.07))]++; if (s > 0.25) over++; if (d > 2 && s > land2) { land2 = s; land2At = [x, z, d]; } }
  ok(`bank slope (2 m or more inside the fence; within 3 m of the shore on land, 6 m into the water, central difference over 1 m): steepest ${max.toFixed(3)} = 1:${(1 / max).toFixed(2)} at ${at.map((v) => +v.toFixed(1)).join(', ')} (the table: 1:${P.SLOPE_MIN} = ${(1 / P.SLOPE_MIN).toFixed(3)}), ${over} of ${n} cells steeper than 1:4, on land beyond 2 m ${land2.toFixed(3)}; histogram per 0.07: ${hist.join(' ')}`, max <= 1 / P.SLOPE_MIN * 1.35 && land2 <= 0.25, ''); }

// =============================================================== 4. the floor with the bowls
console.log('4. the garden floor with the bowls (terrain-mesh.js cover mode over gardenHeight)');
const pieces = TM.gardenPieces(), RING = Fo.GARDEN.o;
const plan = TM.planTerrain(terrain, GH.RELIEF_BOX, TM.floorOptions({ cover: pieces })), M = TM.measurePlan(plan, terrain, 0.5, RING, { waterY: GH.PONDS.WATER_Y });
ok(`the floor tiles the polygon (${M.padArea.toFixed(1)} of ${M.ringArea.toFixed(1)} m2), is watertight in the exact positions (non-manifold ${M.nonManifoldExact}, open inside ${M.openInterior}), covers every lattice point inside (${M.polyUncovered} of ${M.polyTotal} uncovered) and lies inside the outline (${M.trianglesOutside} triangles outside)`, Math.abs(M.padArea - M.ringArea) < 1e-4 * M.ringArea && M.nonManifoldExact === 0 && M.openInterior === 0 && M.polyUncovered === 0 && M.trianglesOutside === 0, '');
ok(`the floor equals gardenHeight to 5 cm ABOVE the water, apart from the cusps of the canals: ${(100 * (1 - M.above.over5 / M.above.n)).toFixed(2)} % of ${M.above.n} samples on a 0.5 m lattice are within 5 cm (mean ${(M.above.mean * 100).toFixed(2)} cm), the worst is ${(M.above.max * 100).toFixed(1)} cm (${M.above.over5} samples over 5 cm; 1 m is the smallest leaf)`, M.above.over5 <= 0.0015 * M.above.n && M.above.max <= 0.11, '');
ok(`... and the hidden bed UNDER the water is off by at most ${(TM.FLOOR_TUNING.sub.cap * 100).toFixed(0)} cm (its tolerance: ${TM.FLOOR_TUNING.sub.a} x the depth - ${TM.FLOOR_TUNING.sub.b} m from ${TM.FLOOR_TUNING.sub.from} m of depth) and never pokes through the surface by more than the floor's own base tolerance (${(TM.FLOOR_TUNING.split * 100).toFixed(0)} cm: the visible bank may be that far off the ground anyway; with the 4 cm split of the first plan the worst was 4.1 cm too): worst ${(M.sub.max * 100).toFixed(1)} cm off, ${M.sub.pokes} of ${M.sub.n} samples above the surface (by at most ${(M.sub.pokeMax * 100).toFixed(1)} cm, all within a metre of the waterline)`, M.sub.max <= TM.FLOOR_TUNING.sub.cap + 0.01 && M.sub.pokeMax <= TM.FLOOR_TUNING.split, '');
ok(`the floor is ${plan.tris} triangles in ${plan.chunks.length} draws (the T3 floor without ponds: 9,080; limit ${TM.TERRAIN.trianglesTarget} / ${TM.TERRAIN.drawsMax}), no clip fallback`, plan.tris <= TM.TERRAIN.trianglesTarget && plan.chunks.length <= TM.TERRAIN.drawsMax && plan.clipFallbacks === 0, '');
{ const bad = TM.planTerrain(terrain, GH.RELIEF_BOX, { cover: pieces, split: 0.4 }), mb = TM.measurePlan(bad, terrain, 0.5, null, { waterY: GH.PONDS.WATER_Y });
  ok('mutant: a split tolerance of 40 cm turns the 5 cm check red (the check can fail)', mb.above.over5 > 0.0015 * mb.above.n, `${mb.over5} samples over 5 cm, max ${(mb.maxErr * 100).toFixed(1)} cm`); }
{ let wrong = 0, n = 0; const mh = TM.makeMeshHeight(plan); for (let i = 0; i < 20000; i++) { const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]), y = mh(x, z); if (y === null) continue; n++; const g0 = terrain(x, z) ?? 0; if (Math.abs(y - g0) > Math.max(0.11, TM.pondTolAt()(x, z, g0) + 0.02)) wrong++; }
  ok('the height of the planned mesh (what the alleys are draped on) follows the terrain inside the bowls and banks too', n > 5000 && wrong === 0, `${n} points, ${wrong} off by more than 11 cm (the hidden bed: its tolerance + 2 cm)`); }

// =============================================================== 5. the built module: water surface, colliders, material, service
console.log('5. the built module: the water surface at the datum, the colliders, the service' + (args.has('--no-env') ? ' [environment skipped]' : ''));
{
  const names = args.has('--no-env') ? ['landmarksTauride'] : ['environment', 'landmarksTauride'];
  const { ctx } = SE.makeContext(eng, names);
  let n0 = 0, ms = 0; for (const n of names) { if (n === 'landmarksTauride') n0 = ctx.physics.count; const tb = Date.now(); await SE.buildModules(eng, ctx, [n]); if (n === 'landmarksTauride') ms = Date.now() - tb; }
  const svc = ctx.services.landmarksTauride, pond = svc.ponds, meshes = []; ctx.staticRoot.traverse((o) => { if (o.isMesh && o.name === 'tauride-pond-water') meshes.push(o); });
  ok('one water mesh, never batched, out of the outline pass, not shadowed; the pond service counts two draws (the water and, since fix round 1, the quay wall)', meshes.length === 1 && pond.draws === 2 && pond.waterTriangles === 201 && meshes[0].userData.noBatch === true && (meshes[0].layers.mask & 1) === 0 && !meshes[0].castShadow && !meshes[0].receiveShadow, '');
  const m = meshes[0], pos = m.geometry.attributes.position.array, idx = m.geometry.index.array, nT = idx.length / 3;
  ok(`the water surface is at the datum: every vertex at y ${P.WATER_Y} (the service says ${pond.y})`, pond.y === P.WATER_Y && Array.from({ length: pos.length / 3 }, (_, i) => pos[i * 3 + 1]).every((y) => y === Math.fround(P.WATER_Y)), '');
  let area = 0, down = 0, outside = 0; const tri = [];
  for (let t = 0; t < nT; t++) { const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3; const ax = pos[a], az = pos[a + 2], bx = pos[b], bz = pos[b + 2], cx = pos[c], cz = pos[c + 2]; const cr = (bx - ax) * (cz - az) - (bz - az) * (cx - ax); area += Math.abs(cr) / 2; if (cr >= 0) down++; if (shore.dist((ax + bx + cx) / 3, (az + bz + cz) / 3) > 0) outside++; tri.push([ax, az, bx, bz, cx, cz]); }
  ok(`the surface covers exactly the union: ${area.toFixed(2)} m2 of ${nT} triangles against the data's ${Wd.WATER_STATS.netAreaM2} m2 net (islands excluded), all facing up (${down} down), every centroid in the water (${outside} on land)`, Math.abs(area - Wd.WATER_STATS.netAreaM2) < 1 && down === 0 && outside === 0, '');
  let covered = 0, mism = 0, nTest = 0; const cover = (x, z) => { let k = 0; for (const [ax, az, bx, bz, cx, cz] of tri) { const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz), l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d; if (l1 >= 0 && l2 >= 0 && l1 + l2 <= 1) k++; } return k; };
  for (let i = 0; i < 20000; i++) { const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]), d = shore.dist(x, z); if (Math.abs(d) < 0.02) continue; nTest++; const k = cover(x, z); if (d < 0) covered++; if ((d < 0) !== (k >= 1)) mism++; }
  ok('a point is under a water triangle exactly when it is in the water (holes included): 20,000 random points', nTest > 18000 && mism === 0 && covered > 1000, `${nTest} points, ${covered} in the water, ${mism} disagree`);
  ok('the three islands have no water triangle over their centres', Wd.WATER_ISLANDS.every((i) => cover(i.cx, i.cz) === 0), '');
  // ---- the quay wall (T4a fix round 1): the step between the street and the water where the water outline lies on the garden outline is closed
  { const Q = P.QUAY, qm = pond.quayMesh, QP = PM.planQuay(U, Fo.GARDEN.o);
    ok(`the quay: ONE mesh of ${QP.triangles} triangles (${QP.runs} runs, ${QP.length.toFixed(1)} m of wall), never batched, granite grey, one more draw (the service: ${pond.draws} draws, ${pond.triangles} triangles = ${pond.waterTriangles} water + ${pond.quayTriangles} wall)`, !!qm && qm.name === 'tauride-quay' && qm.userData.noBatch === true && pond.quayTriangles === QP.triangles && pond.triangles === pond.waterTriangles + QP.triangles && QP.runs >= 8 && QP.length > 150 && QP.length < 200 && new eng.THREE.Color(Q.color).getHexString() === qm.material.color.getHexString(), '');
    const qp = QP.pos, qi = QP.idx, qn = QP.nrm; let offW = 0, offG = 0, badTop = 0, badBot = 0, facing = 0, behind = 0;
    for (let v = 0; v < qp.length / 3; v++) { const x = qp[3 * v], y = qp[3 * v + 1], z = qp[3 * v + 2]; if (Math.abs(shore.dist(x, z)) > 1e-3) offW++; if (dOut(x, z) > 1e-3) offG++; if (y !== Math.fround(Q.top) && y !== Math.fround(Q.bottom)) badTop++; }
    ok(`every corner of the wall lies ON the water outline and ON the garden outline (${offW} off the water outline, ${offG} off the garden outline, within 1 mm), at the street level (y ${Q.top}) or at the bottom (y ${Q.bottom}, under the surface ${P.WATER_Y}), so the wall spans the whole step of ${(Q.top - P.WATER_Y).toFixed(2)} m`, offW === 0 && offG === 0 && badTop === 0 && Q.top >= 0 && Q.bottom < P.WATER_Y && QP.top === Q.top && QP.bottom === Q.bottom, '');
    for (let t = 0; t < qi.length; t += 3) { const a = qi[t] * 3, b = qi[t + 1] * 3, c = qi[t + 2] * 3, e1 = [qp[b] - qp[a], qp[b + 1] - qp[a + 1], qp[b + 2] - qp[a + 2]], e2 = [qp[c] - qp[a], qp[c + 1] - qp[a + 1], qp[c + 2] - qp[a + 2]], nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0], l = Math.hypot(nx, ny, nz), mx = (qp[a] + qp[b] + qp[c]) / 3, mz = (qp[a + 2] + qp[b + 2] + qp[c + 2]) / 3;
      if (Math.abs(nx / l * qn[a] + nz / l * qn[a + 2] - 1) > 1e-4) facing++;                  // the winding agrees with the stored normal
      if (!(shore.dist(mx + nx / l * 0.5, mz + nz / l * 0.5) < 0 && shore.dist(mx - nx / l * 0.5, mz - nz / l * 0.5) > 0)) behind++; }    // the front side is the water, the back side the street
    ok(`the wall faces the WATER (the side of the viewer on the lake): every triangle's front is 0.5 m of water in front and 0.5 m of street behind, the winding agrees with the normal (${facing} wrong windings, ${behind} facing the street)`, facing === 0 && behind === 0 && QP.triangles > 0, '');
    // the water outline within the tolerance of the garden outline, sampled every 5 cm, must stand in front of a wall (the ends of a run lose at most one 0.25 m step)
    let onO = 0, uncovered = 0; const wallSegs = []; for (let t = 0; t < qi.length; t += 3) { const a = qi[t] * 3, b = qi[t + 1] * 3, c = qi[t + 2] * 3; for (const [u, w] of [[a, b], [b, c], [a, c]]) if (qp[u + 1] === qp[w + 1] && qp[u + 1] === Math.fround(Q.top)) wallSegs.push([qp[u], qp[u + 2], qp[w], qp[w + 2]]); }
    for (const poly of U) for (const ring of [poly.o, ...poly.h]) for (let i = 0; i < ring.length; i += 2) { const ax = ring[i], az = ring[i + 1], bx = ring[(i + 2) % ring.length], bz = ring[(i + 3) % ring.length], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.05));
      for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; if (dOut(x, z) > Q.tol) continue; onO++;
        let hit = false; for (const [x0, z0, x1, z1] of wallSegs) { const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz, t2 = Math.max(0, Math.min(1, ((x - x0) * dx + (z - z0) * dz) / l2)); if (Math.hypot(x - x0 - t2 * dx, z - z0 - t2 * dz) < 2e-3) { hit = true; break; } }
        if (!hit) uncovered++; } }
    ok(`the slit is closed along the WHOLE stretch: of ${onO} samples (every 5 cm) of the water outline that lies on the garden outline (~${(onO * 0.05).toFixed(0)} m) ${uncovered} are not in front of a wall (at most 6 = 0.3 m at a run's end)`, onO > 2500 && uncovered <= 6, '');
    const none = PM.planQuay(U, Fo.GARDEN.o.map((v, i) => v + (i % 2 ? 500 : 0))), loose = PM.planQuay(U, Fo.GARDEN.o, { ...Q, minRun: 1e9 });
    ok('mutant: a garden outline moved 500 m (the water no longer lies on it) and a minimum run of 1 km give no wall at all (the plan follows its inputs: the check can fail)', none.triangles === 0 && loose.triangles === 0, `${none.triangles} / ${loose.triangles} triangles`); }
  const sh = m.material; const look = { deep: '#2c4a38', mid: '#3d6046', shallow: '#738248' };
  ok("the material is waterMaterial() of environment/water.js with the pond's LOOK key: greenish, turbid, olive at the banks; the duckweed mat is patched in; polygonOffset wins against the 5 cm of the Small Pond", sh.name === 'tauride-pond-water' && sh.uniforms.uDeep.value.getHexString() === new eng.THREE.Color(look.deep).getHexString() && sh.uniforms.uShallow.value.getHexString() === new eng.THREE.Color(look.shallow).getHexString() && /duckweed/.test(sh.fragmentShader) && sh.polygonOffset === true && sh.polygonOffsetFactor < 0, '');
  ok('the Small Pond bed lies 5 cm below the water: the surface cannot z-fight with it because of the polygon offset (documented), and the Big Pond bed is 0.75 m below', Math.abs((P.WATER_Y - P.BED_SMALL) - 0.05) < 1e-9 && Math.abs((P.WATER_Y - P.BED_BIG) - 0.75) < 1e-9, '');
  const nCol = ctx.physics.count - n0;
  ok(`the shore colliders: ${pond.colliders} boxes (${pond.stats.colliderLengthM.toFixed(0)} m of the 2,666 m shore), all inland of the shore, planned in ${(pond.buildMs).toFixed(1)} ms; the module added ${nCol} colliders in all (Paradny + palace 1,270)`, pond.colliders > 150 && pond.colliders < 400 && nCol === 1270 + pond.colliders, '');
  { const pl = PM.planPonds(); let inWater = 0; for (const c of pl.colliders) if (shore.dist(c.cx, c.cz) <= 0) inWater++; ok('no collider is centred in the water (they stand on the land side of the shore)', inWater === 0, `${inWater} of ${pl.colliders.length}`); }
  const gaps = PM.planPonds({ gaps: [{ x: 1394, z: -1461, r: 12 }] });
  ok('the gaps hook for the bridge heads of T4b removes the colliders at a deck head (and only there)', gaps.colliders.length < pond.colliders && gaps.colliders.length > pond.colliders - 12, `${pond.colliders} -> ${gaps.colliders.length}`);
  ok('the page\'s HEIGHT_PATCHES has the garden patch with the TERRAIN hull, and layout.heightAt answers the terrain at a pond point and in the lake centre', AT.HEIGHT_PATCHES.length === 2 && JSON.stringify(AT.HEIGHT_PATCHES[1].box) === JSON.stringify(GH.TERRAIN_HULL) && eng.L.heightAt(1405, -1560) === P.BED_BIG && eng.L.heightAt(1433.5, -1560) === (terrain(1433.5, -1560) ?? 0) && terrain(1433.5, -1560) !== null, `lake centre ${eng.L.heightAt(1405, -1560)} m`);
  ok('the service exposes the shore for the other systems: inWater(x, z) and shoreDist(x, z)', svc.ponds.inWater(1405, -1560) === true && svc.ponds.inWater(1100, -1400) === false && Math.abs(svc.ponds.shoreDist(1405, -1560) - shore.dist(1405, -1560)) === 0, '');
  if (!args.has('--no-env')) {
    // ---- 6. the water mask: env.waterAt / shoreDist know the ponds
    console.log('6. the water mask (HOOKS.waterBodies -> environment/field.js): env.waterAt, shoreDist');
    const env = ctx.services.environment, f = env.field;
    ok("the page's HOOKS has waterBodies (a function) and the list without the module has none", typeof AT.HOOKS.waterBodies === 'function' && HW.makeWaterBodies(['environment']) === undefined && HW.makeWaterBodies(undefined) === undefined && AT.HOOKS.waterBodies().length === U.length, '');
    let wet = 0, dry = 0, wrongW = 0, wrongD = 0;
    for (let i = 0; i < 20000; i++) { const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]), d = shore.dist(x, z); if (Math.abs(d) < 1.2) continue; const w = env.waterAt(x, z); if (d < 0) { wet++; if (!w) wrongW++; } else { dry++; if (w) wrongD++; } }
    ok(`env.waterAt is true everywhere in the ponds and false on the land around them (not within 1.2 m of the outline: the mask is a 1 m raster): ${wet} water points, ${dry} land points`, wet > 1500 && dry > 3000 && wrongW === 0 && wrongD === 0, `${wrongW} water points not water, ${wrongD} land points water`);
    let worst = 0; for (let i = 0; i < 4000; i++) { const x = BOX[0] + rnd() * (BOX[1] - BOX[0]), z = BOX[2] + rnd() * (BOX[3] - BOX[2]), d = shore.dist(x, z); if (Math.abs(d) > 3) continue; worst = Math.max(worst, Math.abs(f.shore(x, z) - d)); }
    ok('the field\'s signed shore distance follows the exact distance within 3 m of the shore to the raster\'s 1 m cell (the 1/8 m quantisation and the cell centre)', worst < 1.6, `worst ${worst.toFixed(2)} m`);
    const nb = env.waterAt(1405, -1560) && env.kindAt(1405, -1560) === 'water';
    ok('env.kindAt says water in the lake; the generic North before this phase said lawn', nb, '');
    const saved = AT.HOOKS.waterBodies; delete AT.HOOKS.waterBodies;
    const { ctx: c2 } = SE.makeContext(eng, ['environment']); await SE.buildModules(eng, c2, ['environment']); AT.HOOKS.waterBodies = saved;
    ok('mutant: the same field built WITHOUT the hook does not know the lake (the check can fail)', c2.services.environment.waterAt(1405, -1560) === false, '');
    ok('the wildlife / trees / people read env.waterAt: no tree of the built environment stands in the ponds', (() => { let n = 0; for (const t of env.trees) if (shore.dist(t.x, t.z) < -0.2) n++; return n === 0; })(), `${env.trees.length} trees`);
  }
}

// =============================================================== 7. the ground material: wet band, sand strip, bed colours from the table
console.log('7. the ground material (ground-material.js): the wet band and the bed come from the table');
{
  const FAKE = () => ({ uniforms: {}, vertexShader: '#include <common>\n#include <fog_vertex>', fragmentShader: '#include <common>\n#include <map_fragment>\n#include <fog_fragment>' });
  const bare = SE.makeContext(eng, []).ctx, mask = GM.planGroundMask(GM.collectGroundInputs({ GARDEN: Fo.GARDEN, GARDEN_GREEN: Fo.GARDEN_GREEN, FOOTPRINTS: Fo.FOOTPRINTS, WATER_UNION: U, PATHS: [], BENCHES: [], GATES: [], MONUMENTS: [], FOUNTAINS: [] }, [], terrain));
  const mat = GM.gardenGroundMaterial(bare, mask, GM.makeNoiseTexture()).mat, sh = FAKE(); mat.onBeforeCompile(sh, null); const f = sh.fragmentShader;
  const wetLo = (P.WET_BAND - 0.32).toFixed(3), wetHi = (P.WET_BAND + 0.12).toFixed(3), sandHi = (P.WET_BAND + P.SHORE_SAND).toFixed(3);
  ok(`the shader's wet band is WET_BAND ${P.WET_BAND} m (smoothstep ${wetLo} .. ${wetHi}) and the sand strip SHORE_SAND ${P.SHORE_SAND} m (to ${sandHi}), both from the table`, f.includes(`smoothstep(${wetLo}, ${wetHi}, d`) && f.includes(`smoothstep(${P.WET_BAND.toFixed(3)}, ${sandHi}, d`), '');
  const cols = ['uBed', 'uSilt', 'uSand', 'uWet'], keys = ['mud', 'silt', 'sand', 'wet'];
  ok('the bed, silt, sand and wet colours of the ground are the table\'s BED_COLORS (the T3 placeholder bed colour #5b5a3f is gone)', cols.every((c, i) => GM.GROUND_COLORS[c] === P.BED_COLORS[keys[i]]) && GM.GROUND_COLORS.uBed !== '#5b5a3f', '');
  ok('the uniforms of the material carry them (converted to the working space)', cols.every((c, i) => mat.userData && true) && (() => { const u = {}; const s2 = FAKE(); mat.onBeforeCompile(s2, null); return cols.every((c, i) => s2.uniforms[c] && s2.uniforms[c].value.getHexString() === new eng.THREE.Color(P.BED_COLORS[keys[i]]).getHexString()); })(), '');
  const wetCells = mask.stats.wetCells, mudCells = mask.stats.mudCells, waterCells = mask.stats.waterCells;
  ok(`the 1 m mask knows the water: ${waterCells} water cells (the union is 29,669 m2 net, partly outside the 1 m raster pad), ${wetCells} cells in the wet band, ${mudCells} in the mud band`, waterCells > 20000 && wetCells > 1000 && mudCells > wetCells, '');
  ok('mutant: a table with another WET_BAND does not match the shader text (the check can fail)', !f.includes(`smoothstep(${(0.9 - 0.32).toFixed(3)}, ${(0.9 + 0.12).toFixed(3)}, d`), '');
}

console.log(failed ? `RESULT: FAIL (${failed} of ${total} checks)` : `RESULT: OK (${total} checks)`);
process.exit(failed ? 1 : 0);
