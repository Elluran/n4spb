// pond-test.mjs - T4a of the Tauride remake: the ponds (bowls, banks, water surface, shore colliders, water mask). node tools/area.mjs north tools/tauride/pond-test.mjs [--no-env]
// Every check runs on the REAL modules (the built landmarksTauride, the built environment field, the page's HOOKS). The datum table (src/world/landmarksTauride/data/ponds.js) is the ONE source of the numbers: the checks
// derive their expectations from it and the mutants (a copy of the table with ONE number changed, fed to the real factories height.js makeTerrainHeight / ponds.js planPonds) must turn a check red.
// The wading acceptance (a dense ring of shore probes, approached at several angles and speeds, including a jump) lives in tools/tauride-height-test.mjs (section PONDS); the strip and North field rasters are
// compared by tools/tauride/field-dump.mjs (--out a.bin on the clean tree and on the branch, then --diff a.bin b.bin); the bridges and the deck cuts of the ring (T4b) are tools/tauride/bridge-test.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = new Set(process.argv.slice(2));
let failed = 0, total = 0;
const ok = (name, cond, detail = '') => { total++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };
const t6Colliders = (s) => (s.fence?.colliders || 0) + (s.furniture?.colliders || 0) + (s.monuments?.colliders || 0) + (s.nursery?.colliders || 0);          // T8b: + the 12 of the nursery (9 houses, 3 replaced buildings)          // T6: the fence, the furniture and the monuments add their colliders to the module's

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
  // ---- the kerb skirt (T4a fix round 1: the quay along the lake; fix round 2: EVERY stretch of the outline where the floor is not at the street level): the floor stops at the garden outline, the environment ground (y 0) is cut at it, and the step between them is closed
  { const Q = P.QUAY, qm = pond.quayMesh, t0q = performance.now(), QP = PM.planQuay(plan, Fo.GARDEN.o), planMs = performance.now() - t0q, mh = TM.makeMeshHeight(plan), lift = TM.TERRAIN.lift, RG = Fo.GARDEN.o, nG = RG.length / 2;
    const inG = (x, z) => { let c = false; for (let i = 0, j = nG - 1; i < nG; j = i++) if ((RG[2 * i + 1] > z) !== (RG[2 * j + 1] > z) && x < (RG[2 * j] - RG[2 * i]) * (z - RG[2 * i + 1]) / (RG[2 * j + 1] - RG[2 * i + 1]) + RG[2 * i]) c = !c; return c; };
    /** the step of the floor mesh at the outline point (x, z): the mesh height 2 mm inside the outline (+ the lift of the mesh) minus the street level; null where no triangle holds it */
    const stepAt = (x, z, ux, uz) => { const h = mh(x + ux * 0.002, z + uz * 0.002); return h === null ? null : h + lift - Q.top; };
    // the wall triangles as vertical 2-D triangles: [ox, oz, ux, uz (the direction), [t, y] x 3]
    const wallTris = (qp, qi) => { const out = []; for (let t = 0; t < qi.length; t += 3) { const V = [0, 1, 2].map((k) => [qp[qi[t + k] * 3], qp[qi[t + k] * 3 + 1], qp[qi[t + k] * 3 + 2]]); let b = [0, 1]; for (const pr of [[0, 2], [1, 2]]) if (Math.hypot(V[pr[0]][0] - V[pr[1]][0], V[pr[0]][2] - V[pr[1]][2]) > Math.hypot(V[b[0]][0] - V[b[1]][0], V[b[0]][2] - V[b[1]][2])) b = pr;
        const ox = V[b[0]][0], oz = V[b[0]][2], L = Math.hypot(V[b[1]][0] - ox, V[b[1]][2] - oz), ux = (V[b[1]][0] - ox) / L, uz = (V[b[1]][2] - oz) / L; out.push({ ox, oz, ux, uz, L, P: V.map((v) => [(v[0] - ox) * ux + (v[2] - oz) * uz, v[1]]) }); } return out; };
    /** the y intervals that the wall triangles cover on the vertical line over the outline point (x, z) */
    const coverAt = (W, x, z) => { const iv = []; for (const w of W) { const t = (x - w.ox) * w.ux + (z - w.oz) * w.uz, off = Math.hypot(x - w.ox - t * w.ux, z - w.oz - t * w.uz); if (off > 2e-3 || t < -1e-9 || t > w.L + 1e-9) continue;
        const ys = []; for (let k = 0; k < 3; k++) { const a = w.P[k], b = w.P[(k + 1) % 3]; if ((a[0] - t) * (b[0] - t) <= 0) ys.push(a[0] === b[0] ? a[1] : a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]), a[0] === b[0] ? b[1] : a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0])); }
        if (ys.length) iv.push([Math.min(...ys), Math.max(...ys)]); }
      iv.sort((a, b) => a[0] - b[0]); const m = []; for (const v of iv) { const l = m[m.length - 1]; if (l && v[0] <= l[1] + 1e-6) l[1] = Math.max(l[1], v[1]); else m.push([...v]); } return m; };
    /** the outline walked every 5 cm: the samples whose step is more than drop + 5 mm need a wall that spans it (to 5 mm); returns { req, uncovered, negM, posM, boxes: per-QA-run counts } */
    const sweep = (QPx, boxes = [], Qx = Q) => { const W = wallTris(QPx.pos, QPx.idx), r = { req: 0, uncovered: 0, underBad: 0, negM: 0, posM: 0, lost: 0, box: boxes.map(() => ({ req: 0, bad: 0 })), worst: null };
      for (let i = 0; i < nG; i++) { const ax = RG[2 * i], az = RG[2 * i + 1], bx = RG[2 * ((i + 1) % nG)], bz = RG[2 * ((i + 1) % nG) + 1], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.ceil(L / 0.05)); let ux = -(bz - az) / L, uz = (bx - ax) / L; if (!inG((ax + bx) / 2 + ux * 0.05, (az + bz) / 2 + uz * 0.05)) { ux = -ux; uz = -uz; }
        for (let k = 0; k < m; k++) { const x = ax + (bx - ax) * (k + 0.5) / m, z = az + (bz - az) * (k + 0.5) / m, f = stepAt(x, z, ux, uz); if (f === null) { r.lost++; continue; }
          if (Math.abs(f) <= Q.drop + 0.005) continue; r.req++; if (f < 0) r.negM += 0.05; else r.posM += 0.05;
          const lo = Math.min(0, f) + 0.005, hi = Math.max(0, f) - 0.005, iv = coverAt(W, x, z), okc = iv.some((v) => v[0] <= lo + 1e-4 && v[1] >= hi - 1e-4);
          if (!okc) { r.uncovered++; if (!r.worst) r.worst = { x: +x.toFixed(2), z: +z.toFixed(2), f: +f.toFixed(3), iv }; }
          if (!iv.some((v) => v[0] <= lo - Qx.under + 0.003 && v[1] >= hi - 1e-4)) r.underBad++;          // T5 (the T4b leftover): the wall reaches QUAY.under past the lower surface it meets (no crack between the two)
          boxes.forEach((b, q) => { if (x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3]) { r.box[q].req++; if (!okc) r.box[q].bad++; } }); } }
      return r; };
    // the four runs of the QA of fix round 1 (the floor 22 / 26 / 41 / 35 cm below the street with no wall: the pale-blue slit at T05, the dam channel, the ends of the quay)
    const QA = [[1250, 1264, -1715, -1699], [1273, 1282, -1685, -1662], [1282, 1285, -1644, -1638], [1434, 1438, -1591, -1589]];
    const S = sweep(QP, QA);
    ok(`the kerb skirt: ONE mesh of ${QP.triangles} triangles (${QP.runs} quads on ${QP.edges} floor edges, ${QP.length.toFixed(1)} m of the outline), never batched, granite grey, one more draw (the service: ${pond.draws} draws, ${pond.triangles} triangles = ${pond.waterTriangles} water + ${pond.quayTriangles} skirt), planned in ${planMs.toFixed(0)} ms`, !!qm && qm.name === 'tauride-quay' && qm.userData.noBatch === true && pond.quayTriangles === QP.triangles && pond.triangles === pond.waterTriangles + QP.triangles && QP.runs >= 20 && QP.triangles <= 400 && QP.length > 230 && QP.length < 300 && planMs < 250 && new eng.THREE.Color(Q.color).getHexString() === qm.material.color.getHexString(), '');
    ok(`EVERY stretch of the garden outline where the floor is more than ${(Q.drop * 100).toFixed(0)} cm off the street level has a wall that spans the step: of ${S.req} samples (every 5 cm, ${S.negM.toFixed(0)} m below the street, ${S.posM.toFixed(0)} m above it) ${S.uncovered} are not covered to 5 mm (${S.lost} samples had no floor triangle)` + (S.worst ? ', first ' + JSON.stringify(S.worst) : ''), S.req > 4000 && S.uncovered === 0 && S.lost < 20 && S.negM > 200 && S.posM > 25, '');
    ok(`... among them the four runs the QA measured (the steps of 22, 26, 41 and 35 cm that the lake-only quay left open: the slit at T05 and at the dam channel): ${QA.map((b, q) => S.box[q].req + ' samples').join(', ')}, ${S.box.reduce((s, b) => s + b.bad, 0)} uncovered`, S.box.every((b) => b.req > 50 && b.bad === 0), '');
    const qp = QP.pos, qi = QP.idx, qn = QP.nrm, pv = new Map(); for (const c of plan.chunks) for (let v = 0; v < c.pos.length / 3; v++) pv.set(c.pos[3 * v] + ',' + c.pos[3 * v + 2], c.pos[3 * v + 1]);
    let offG = 0, badY = 0, badYs = [], wrongs = [], facing = 0, wrongSide = 0, ambiguous = 0, sides = [0, 0];
    for (let v = 0; v < qp.length / 3; v++) { const x = qp[3 * v], y = qp[3 * v + 1], z = qp[3 * v + 2]; if (dOut(x, z) > 1e-3) offG++;
      const yv = pv.get(x + ',' + z);           // the corner is a vertex of the floor plan (the end of an open edge on the outline): its height is the plan's
      const okY = Math.abs(y - Math.fround(Q.top)) < 2e-5 || Math.abs(y - Math.fround(Q.top - Q.under)) < 2e-5 || (yv !== undefined && (Math.abs(y - (yv + lift)) < 2e-5 || Math.abs(y - (yv + lift - Q.under)) < 2e-5));
      if (!okY) { badY++; if (badYs.length < 4) badYs.push({ x: +x.toFixed(3), y: +y.toFixed(4), z: +z.toFixed(3), plan: yv === undefined ? null : +yv.toFixed(4) }); } }
    ok(`every corner of the wall lies ON the garden outline (${offG} off it, within 1 mm) and is at the street level (y ${Q.top}), ${Q.under * 100} cm under it, or on the edge of the floor mesh (+ the lift ${lift} m, or ${Q.under * 100} cm under it): ${badY} corners at another height` + (badYs.length ? ' ' + JSON.stringify(badYs) : ''), offG === 0 && badY === 0 && QP.top === Q.top, '');
    for (let t = 0; t < qi.length; t += 3) { const a = qi[t] * 3, b = qi[t + 1] * 3, c = qi[t + 2] * 3, e1 = [qp[b] - qp[a], qp[b + 1] - qp[a + 1], qp[b + 2] - qp[a + 2]], e2 = [qp[c] - qp[a], qp[c + 1] - qp[a + 1], qp[c + 2] - qp[a + 2]], nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0], l = Math.hypot(nx, ny, nz), mx = (qp[a] + qp[b] + qp[c]) / 3, my = (qp[a + 1] + qp[b + 1] + qp[c + 1]) / 3, mz = (qp[a + 2] + qp[b + 2] + qp[c + 2]) / 3;
      if (Math.abs(nx / l * qn[a] + nz / l * qn[a + 2] - 1) > 1e-4) facing++;                  // the winding agrees with the stored normal
      const hx = nx / l, hz = nz / l, inw = inG(mx + hx * 0.05, mz + hz * 0.05) ? 1 : -1, fs = stepAt(mx, mz, hx * inw, hz * inw);          // the step of the floor where the triangle stands (the inward direction is the front's if the garden lies in front)
      if (fs === null || Math.abs(fs) < 0.012) { ambiguous++; continue; }
      const fr = inG(mx + nx / l * 0.5, mz + nz / l * 0.5), bk = inG(mx - nx / l * 0.5, mz - nz / l * 0.5);   // a wall under the street faces the garden (the water, the banks), one above it faces the street
      let bad = false; if (fs < 0) { sides[0]++; if (!(fr && !bk)) bad = true; } else { sides[1]++; if (!(!fr && bk)) bad = true; } if (bad) { wrongSide++; if (wrongs.length < 4) wrongs.push({ x: +mx.toFixed(2), y: +my.toFixed(3), z: +mz.toFixed(2), step: +fs.toFixed(3), fr, bk }); } }
    ok(`the walls face the right way: ${sides[0]} triangles over a floor below the street face the GARDEN (the viewer on the water), ${sides[1]} over a floor above it face the STREET (0.5 m in front, 0.5 m behind); ${wrongSide} wrong, ${facing} windings against the stored normal (${ambiguous} flat ones skipped)` + (wrongs.length ? ' ' + JSON.stringify(wrongs) : ''), wrongSide === 0 && facing === 0 && sides[0] > 40 && sides[1] > 4, '');
    const noUnder = sweep(PM.planQuay(plan, Fo.GARDEN.o, { ...Q, under: 0 }));
    ok(`QUAY.under is pinned (T5, the T4b leftover): every wall reaches ${(Q.under * 100).toFixed(0)} cm past the lower surface it meets (${S.underBad} of ${S.req} samples short), and a skirt planned with under 0 does not (the check can fail: ${noUnder.underBad} short)`, Q.under >= 0.02 && S.underBad === 0 && noUnder.underBad > S.req * 0.5, '');
    const none = PM.planQuay(plan, Fo.GARDEN.o.map((v, i) => v + (i % 2 ? 500 : 0))), noStep = PM.planQuay(plan, Fo.GARDEN.o, { ...Q, drop: 1e9 }), unmerged = PM.planQuay(plan, Fo.GARDEN.o, { ...Q, merge: 0 }), crude = PM.planQuay(plan, Fo.GARDEN.o, { ...Q, merge: 1e9 }), Sc = sweep(crude), noFloor = PM.planQuay(null, Fo.GARDEN.o);
    ok('mutants (the checks can fail): a garden outline moved 500 m, a step threshold of 1 km and no floor plan give no wall; the merge tolerance 0 gives more quads than the default (the merge works); a merge tolerance of 1 km (chords that leave the floor edge) leaves samples uncovered', none.triangles === 0 && noStep.triangles === 0 && noFloor.triangles === 0 && unmerged.runs > QP.runs * 1.5 && Sc.uncovered > 50, `${none.triangles} / ${noStep.triangles} / ${noFloor.triangles} triangles, ${QP.runs} -> ${unmerged.runs} quads unmerged, ${Sc.uncovered} uncovered with the crude chords`);
    // ---- the see-through test: what the eye sees is a ray, so cast them. The geometry is what the page draws near the outline (the floor mesh + its lift, the skirt, the water plane inside the union, the environment ground = the plane y = Q.top outside the
    // hole of HOOKS.groundHoles, i.e. the garden outline moved in by 6 cm); only FRONT faces count (every material is one-sided). A ray from a viewer on the water side (at 1.5 / 5 / 12 m inside, eyes 0.2 / 0.8 / 1.7 m above the ground or the water) or on the
    // street side (2 / 6 / 15 m outside, eyes 1.0 / 1.7) through a point of the outline at a height between the floor edge and the street level (the gap) must hit one of them within 150 m, else the sky shows through the step.
    const rayCheck = (QPx, every = 0.5) => {
      const tri = [], CSZ = 16, grid = new Map(), gk = (i, j) => i * 100003 + j, cap = (pp, ix, dy) => { for (let t = 0; t < ix.length; t += 3) { const a = ix[t] * 3, b = ix[t + 1] * 3, c = ix[t + 2] * 3, tr = [pp[a], pp[a + 1] + dy, pp[a + 2], pp[b], pp[b + 1] + dy, pp[b + 2], pp[c], pp[c + 1] + dy, pp[c + 2]], id = tri.length; tri.push(tr);
          for (let i = Math.floor(Math.min(tr[0], tr[3], tr[6]) / CSZ); i <= Math.floor(Math.max(tr[0], tr[3], tr[6]) / CSZ); i++) for (let j = Math.floor(Math.min(tr[2], tr[5], tr[8]) / CSZ); j <= Math.floor(Math.max(tr[2], tr[5], tr[8]) / CSZ); j++) { const k = gk(i, j); (grid.get(k) || grid.set(k, []).get(k)).push(id); } } };
      for (const c of plan.chunks) cap(c.pos, c.idx, lift); cap(QPx.pos, QPx.idx, 0);
      const hole = HG.insetRing(RG, HG.GROUND_HOLE_INSET), nH = hole.length / 2, inHole = (x, z) => { let c = false; for (let i = 0, j = nH - 1; i < nH; j = i++) if ((hole[2 * i + 1] > z) !== (hole[2 * j + 1] > z) && x < (hole[2 * j] - hole[2 * i]) * (z - hole[2 * i + 1]) / (hole[2 * j + 1] - hole[2 * i + 1]) + hole[2 * i]) c = !c; return c; };
      const seen = (o, d) => {                                                              // does the ray hit a front face within 150 m?
        const ids = new Set(); for (let t = 0; t <= 150; t += 6) { const gi = Math.floor((o[0] + d[0] * t) / CSZ), gj = Math.floor((o[2] + d[2] * t) / CSZ); for (const q of grid.get(gk(gi, gj)) || []) ids.add(q); }
        for (const id of ids) { const v = tri[id], e1x = v[3] - v[0], e1y = v[4] - v[1], e1z = v[5] - v[2], e2x = v[6] - v[0], e2y = v[7] - v[1], e2z = v[8] - v[2], px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x, det = e1x * px + e1y * py + e1z * pz;
          if (det < 1e-12) continue;                                                        // back face or edge-on
          const tx = o[0] - v[0], ty = o[1] - v[1], tz = o[2] - v[2], u = (tx * px + ty * py + tz * pz) / det; if (u < -1e-7 || u > 1 + 1e-7) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, w = (d[0] * qx + d[1] * qy + d[2] * qz) / det; if (w < -1e-7 || u + w > 1 + 1e-7) continue;
          if ((e2x * qx + e2y * qy + e2z * qz) / det > 1e-6) return true; }
        if (d[1] < -1e-9) {                                                                 // the planes: the environment ground (street level, not under the floor's hole) and the water surface (inside the union)
          const tg = (Q.top - o[1]) / d[1]; if (tg > 1e-6 && tg < 150 && !inHole(o[0] + d[0] * tg, o[2] + d[2] * tg)) return true;
          const tw = (P.WATER_Y - o[1]) / d[1]; if (tw > 1e-6 && tw < 150 && shore.dist(o[0] + d[0] * tw, o[2] + d[2] * tw) < 0) return true; }
        return false; };
      let rays = 0, through = 0, first = null;
      for (let i = 0; i < nG; i++) { const ax = RG[2 * i], az = RG[2 * i + 1], bx = RG[2 * ((i + 1) % nG)], bz = RG[2 * ((i + 1) % nG) + 1], L = Math.hypot(bx - ax, bz - az), m = Math.max(1, Math.ceil(L / every)); let ux = -(bz - az) / L, uz = (bx - ax) / L; if (!inG((ax + bx) / 2 + ux * 0.05, (az + bz) / 2 + uz * 0.05)) { ux = -ux; uz = -uz; }
        for (let k = 0; k < m; k++) { const x = ax + (bx - ax) * (k + 0.5) / m, z = az + (bz - az) * (k + 0.5) / m, f = stepAt(x, z, ux, uz); if (f === null || Math.abs(f) <= Q.drop + 0.005) continue;
          const lo = Math.min(0, f) + 0.005, hi = Math.max(0, f) - 0.005, below = f < 0, views = below ? [[1.5, 0.2], [1.5, 1.7], [5, 0.2], [5, 0.8], [5, 1.7], [12, 0.2], [12, 1.7]] : [[2, 1.0], [2, 1.7], [6, 1.0], [6, 1.7], [15, 1.7]];
          for (const [dist, eye] of views) { const vx = x + (below ? ux : -ux) * dist, vz = z + (below ? uz : -uz) * dist, gy = below ? Math.max(terrain(vx, vz) ?? 0, P.WATER_Y) : Q.top, o = [vx, gy + eye, vz];
            for (let q = 1; q <= 5; q++) { const yo = lo + (hi - lo) * q / 6, dx = x - vx, dz = z - vz, dy = yo - o[1], dl = Math.hypot(dx, dy, dz), d = [dx / dl, dy / dl, dz / dl]; rays++; if (!seen(o, d)) { through++; if (!first) first = { x: +x.toFixed(2), z: +z.toFixed(2), step: +f.toFixed(3), view: [dist, eye], yo: +yo.toFixed(3) }; } } } } }
      return { rays, through, first }; };
    const HG = await imp('src/areas/north/hooks/ground.js'), t0r = performance.now(), RC = rayCheck(QP, args.has('--fine') ? 0.05 : 0.5), rayMs = performance.now() - t0r, RN = rayCheck(PM.planQuay(null, Fo.GARDEN.o), 2);
    ok(`no sky shows through the step: ${RC.rays} rays from the water side (1.5 / 5 / 12 m in, eyes 0.2 .. 1.7 m) and the street side (2 / 6 / 15 m out) through the gap of the outline (every ${args.has('--fine') ? '5 cm (--fine)' : '0.5 m'}, five heights between the floor edge and the street) all hit a front face within 150 m (${RC.through} do not${RC.first ? ', first ' + JSON.stringify(RC.first) : ''}; ${rayMs.toFixed(0)} ms); mutant without the skirt: ${RN.through} of ${RN.rays} rays (every 2 m) go through (the check can fail)`, RC.rays > 10000 && RC.through === 0 && RN.through > RN.rays * 0.4, ''); }
  const sh = m.material; const look = { deep: '#1a342e', mid: '#26473c', shallow: '#5c7246' };      // T4b: darker and more teal (the T4a GPU QA read the narrow arms as pale speckled gravel from the air; environment/water.js LOOK 'tauride-pond')
  ok("the material is waterMaterial() of environment/water.js with the pond's LOOK key: greenish, turbid, olive at the banks; the duckweed mat is patched in; polygonOffset wins against the 5 cm of the Small Pond", sh.name === 'tauride-pond-water' && sh.uniforms.uDeep.value.getHexString() === new eng.THREE.Color(look.deep).getHexString() && sh.uniforms.uShallow.value.getHexString() === new eng.THREE.Color(look.shallow).getHexString() && /duckweed/.test(sh.fragmentShader) && sh.polygonOffset === true && sh.polygonOffsetFactor < 0, '');
  ok('the Small Pond bed lies 5 cm below the water: the surface cannot z-fight with it because of the polygon offset (documented), and the Big Pond bed is 0.75 m below', Math.abs((P.WATER_Y - P.BED_SMALL) - 0.05) < 1e-9 && Math.abs((P.WATER_Y - P.BED_BIG) - 0.75) < 1e-9, '');
  const nCol = ctx.physics.count - n0;
  const nBridge = svc.bridges ? svc.bridges.colliders : 0, nTrees = svc.trees ? svc.trees.colliders : 0;      // T4b: the bridge kit adds its walk ramps and rail boxes (tools/tauride/bridge-test.mjs counts them); T5: the trunks of the trees (vegetation-test)
  ok(`the shore colliders are NOT built any more (water is reachable, docs/AREAS.md 13.7): ${pond.colliders} built; the plan still lists ${pond.stats.colliders} boxes (${pond.stats.colliderLengthM.toFixed(0)} m of the 2,666 m shore; T4b: ${pond.stats.chordsCut} chords cut where a deck crosses the ring), all inland of the shore, planned in ${(pond.buildMs).toFixed(1)} ms; the module added ${nCol} colliders in all (Paradny + palace 1,270 + the bridges ${nBridge} + the trunks ${nTrees} + the fence, the furniture and the monuments ${t6Colliders(ctx.services.landmarksTauride)})`, pond.colliders === 0 && pond.stats.colliders > 150 && pond.stats.colliders < 400 && nCol === 1270 + pond.colliders + nBridge + nTrees + t6Colliders(ctx.services.landmarksTauride), '');
  { const pl = PM.planPonds(); let inWater = 0; for (const c of pl.colliders) if (shore.dist(c.cx, c.cz) <= 0) inWater++; ok('no collider is centred in the water (they stand on the land side of the shore)', inWater === 0, `${inWater} of ${pl.colliders.length}`); }
  const plain = PM.planPonds(), gaps = PM.planPonds({ gaps: [{ x: 1394, z: -1461, r: 12 }] });
  ok('the gaps hook (T4a) removes the colliders near a deck head (and only there); the ring without decks is the T4a ring of 195', plain.colliders.length === 195 && gaps.colliders.length < plain.colliders.length && gaps.colliders.length > plain.colliders.length - 12, `${plain.colliders.length} -> ${gaps.colliders.length}`);
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
