// The CPU walkability / wading harness of the Tauride Garden remake (REAL Player + Physics of src/core, no GPU): the test the terrain, the ponds and the colliders of the garden must pass.
//   node tools/tauride-height-test.mjs                      the generic North of today (trivial: no ponds, no hills) + the self-check of the harness on three synthetic models
//                                                           + the reproduction of the old trap on the SOURCE module when PITER_SRC is set (the 102_3d_piter checkout, read-only)
//   node tools/tauride-height-test.mjs --model <file.mjs> [--build landmarksTauride,...]   a garden team model (module exporting `model`, see tools/tauride/lib/demo-models.mjs) and / or the colliders
//                                                           of the named modules built into a North context (default heightAt = layout.heightAt, the patches of src/areas/north/area.js HEIGHT_PATCHES)
//   --model demo-trap | demo-contour | demo-wade | north     one built-in model
//   --source                                                only the old-trap reproduction (needs PITER_SRC)
//   --wade-depth 0.3  --probes 14  --max-slope 0.25  --assert-cars  --assert-landing  --no-route  --json
// WHAT IS MEASURED (per model)
//   wading   14 probes along the shore of the water outline: a walker 4 m inland walks into the water for 6 s and back for 10 s. PASS when no probe stands in water deeper than the wading depth
//            OR every probe that did can walk out again (the design rule "no wading" makes the first clause true by colliders at the -0.3 contour; the second is the minimum: no TRAP).
//   route    the walker follows the shortest way route (the 120 garden ways, bridges included) from the south gate (1226,-1267.8) to the Pioneers memorial (1371,-1452): arrives, never in deep water.
//   slope    the height model: land (> 2 m from the water, in the garden), banks (within 2 m of the shore), along the ways (per metre). The engine has NO slope limit (player.js walks anything the
//            0.12 m substeps climb: 3.75 m per metre): "max walk slope 1:4" of the plan is a CONTENT rule, asserted here for land and ways (banks are reported: the plan's 1:3 banks exceed 1:4).
//   cars     the keep-out: how much of the garden outline a car can drive across (no car-blocked point between 3 m outside and 3 m inside). NOT asserted unless --assert-cars: the engine of today
//            has no keep-out (drive/handling.js solidBlocked: heightAt < -1, holes, buildings), so the generic North reports the whole outline open.
//   landing  flight landing: the share of water cells where the real predicate (physics groundHeight < -1) refuses 'water'. NOT asserted unless --assert-landing (a pond bed of -0.5 m is not refused).
//   T2 (the land relief of the garden; runs when `--build landmarksTauride` is given, on the REAL built module): the relief rules (zero within 8 m of the outline, 3 m of the footprints, 4 m of the OSM trees, 3 m of the water, 5 m of the bridges, 4 m of the camera
//            poses, the flat zones; slope <= 1:4 on land, on the 120 ways and on the south gate -> memorial route), the terrain meshes (<= 16 draws, <= 40 k triangles, <= 5 cm, crack-free, no collider, the footprint hugs the relief: no apron), heightAt through the page's patches (the diff against the old
//            line is confined to the Paradny box and the garden box), the patch box RELIEF_HULL, determinism / purity / edge cases of gardenHeight and its cell masks against brute force, the cars with the real handling (0 m of the outline open; the same harness without the hook: 2,018 m), and 15 mutants that must turn a rule red.
//            node tools/area.mjs north tools/tauride-height-test.mjs --model north --build landmarksTauride --assert-cars --no-selfcheck
// Exit 0 = every expectation met (the main model passes, the self-check models behave as declared, the old trap reproduces).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, parseArgs, inPolys } from './tauride/lib/common.mjs';
import * as S from './tauride/lib/site.mjs';
import { loadEngine, makeContext, makePlayer, buildModules, engineRoot } from './tauride/lib/stub-env.mjs';
import { builtinModels } from './tauride/lib/demo-models.mjs';
import { makeWorld, wadeProbes, wadeSummary, wadeRing, shoreProbes, pathGraph, route, walkRoute, slopeReport, landingReport, flightLanding, carBreach } from './tauride/lib/height-harness.mjs';

const args = parseArgs();
const WADE = Number(args['wade-depth'] ?? 0.3), PROBES = Number(args.probes ?? 14), MAX_SLOPE = Number(args['max-slope'] ?? 0.25);
const BOUNDS = { x0: 900, x1: 1520, z0: -1800, z1: -1250 };
const MEMORIAL = { x: 1371.2, z: -1451.9 };
const out = { sections: [] };
let failed = 0;
const say = (s = '') => { if (!args.json) console.log(s); };
const mark = (ok) => (ok ? 'PASS' : 'FAIL');

const onlySource = !!args.source;
const engine = onlySource ? null : await loadEngine(ROOT);      // this repository's three.js; --source loads only the source repository's (two copies in one process make three.js warn)

/** evaluate one model; returns the verdicts */
async function evaluate(model, { engine, world, wet, ring, bounds = BOUNDS, label, assertCars, assertLanding, carBlocked: realCar, route: doRoute = true }) {
  const res = { name: model.name, verdict: {} };
  say(`--- ${model.name}`);
  const probes = shoreProbes(engine.L, wet, ring, { count: PROBES });
  const rows = wadeProbes(world, probes), ws = wadeSummary(rows);
  res.wade = ws;
  const wadeOk = ws.trapped === 0;
  say(`  wading : ${ws.probes} shore probes, ${ws.entered} had water over the feet (deepest ${ws.maxDepth} m), ${ws.deep} deeper than the wading depth ${model.wadeDepth} m, ${ws.deepExited} of those walked out, ${ws.trapped} trapped  -> ${mark(wadeOk)}`);
  if (ws.entered === 0) say(`           (nothing to wade: ${rows.filter((r) => r.touchedWater).length} of ${rows.length} probes walked onto the footprint of the water, where the model's ground is ${model.heightAt(probes[0].x + probes[0].wx * 2, probes[0].z + probes[0].wz * 2).toFixed(2)} m against a water level of ${model.waterLevel} m: the depth is 0)`);
  res.verdict.wade = wadeOk;
  if (doRoute) {
    const g = pathGraph(S.P.PATHS), a = g.nearest(S.S_GATE.x, S.S_GATE.z, 12), b = g.nearest(MEMORIAL.x, MEMORIAL.z, 12);
    const r = a && b ? route(g, a, b) : null;
    if (!r) { say('  route  : no way route from the south gate to the memorial in the garden ways  -> FAIL'); res.verdict.route = false; }
    else {
      const w = walkRoute(world, r);
      // T4a: the ponds are impassable and the bridges are T4b (the 8 bridge ways are claimed and not drawn): until they exist the walk MUST stop at a shore, on a bridge way, dry (model.routeToShore)
      const bridgeIds = new Set(S.P.PATHS.filter((p) => p.bridge).map((p) => p.id)), atShore = !w.ok && !!w.stuckAt && bridgeIds.has(w.stuckAt.way) && S.waterDist(w.stuckAt.x, w.stuckAt.z) >= 0 && S.waterDist(w.stuckAt.x, w.stuckAt.z) < 3.5;
      const ok = (w.ok || (model.routeToShore && atShore)) && w.maxDepth <= model.wadeDepth;
      res.route = { ways: [...new Set(r.map((q) => q.way).filter(Boolean))].length, ...w, atShore };
      say(`  route  : south gate -> memorial along ${res.route.ways} ways, ${w.lengthM} m: ${w.ok ? 'arrived' : 'STUCK at ' + JSON.stringify(w.stuckAt)} in ${(w.ticks / 60).toFixed(0)} s, lowest feet ${w.minY} m, deepest water ${w.maxDepth} m  -> ${mark(ok)}${!w.ok && model.routeToShore ? (atShore ? ` (T4a: reachable up to the shore of the water, where the bridge way ${w.stuckAt.way} needs its deck: T4b)` : ' (NOT at a bridge head)') : ''}`);
      res.verdict.route = ok;
    }
  }
  const sl = slopeReport(S, (x, z) => model.heightAt(x, z)); res.slope = sl;
  const slopeOk = sl.land.max <= MAX_SLOPE && sl.ways.max <= MAX_SLOPE;
  say(`  slope  : land max ${sl.land.max} (p95 ${sl.land.p95}, ${sl.land.n} cells), ways max ${sl.ways.max} per metre (${sl.ways.n} steps), banks max ${sl.bank.max} (${sl.bank.n} cells within 3 m of the shore), ways in the bank zone max ${sl.waysBank.max} (${sl.waysBank.n}); limit ${MAX_SLOPE} (= 1:${(1 / MAX_SLOPE).toFixed(0)}) on land and ways away from the water -> ${mark(slopeOk)}${Math.max(sl.bank.max, sl.waysBank.max) > MAX_SLOPE ? ` (banks ${Math.max(sl.bank.max, sl.waysBank.max)} exceed ${MAX_SLOPE}: the plan's 1:3 banks contradict its 1:4 rule; reported, not asserted)` : ''}`);
  res.verdict.slope = slopeOk;
  const carBlocked = realCar || model.carBlocked || ((x, z) => model.heightAt(x, z) < -1 || engine.L.insideBuilding(x, z));
  const cb = carBreach(S, carBlocked); res.cars = cb;
  const carsOk = cb.breachM === 0;
  say(`  cars   : ${cb.breachM} m of the ${cb.perimeterM} m garden outline can be driven across (${cb.stretches.length} stretches${realCar ? ', the real drive/handling.js blocked()' : ''})  -> ${assertCars ? mark(carsOk) : 'not asserted (the engine of today has no keep-out; --assert-cars to require it)'}`);
  if (assertCars) res.verdict.cars = carsOk;
  const ld = landingReport(world, S); res.landing = ld;
  const landOk = ld.landableDeep === 0;
  say(`  landing: ${ld.cells} water cells, ${ld.refused} refuse a flight landing (bed below -1 m), ${ld.landableDeep} would let the flyer land in water deeper than ${model.wadeDepth} m  -> ${assertLanding ? mark(landOk) : 'not asserted (--assert-landing)'}`);
  if (assertLanding) res.verdict.landing = landOk;
  res.pass = Object.values(res.verdict).every(Boolean);
  return res;
}

/** a model on this repository's engine */
async function runModel(model, extra = {}) {
  const { ctx, camera } = makeContext(engine, extra.buildList || []);
  let ph = null;
  if (extra.buildList && extra.buildList.length) { await buildModules(engine, ctx, extra.buildList); ph = ctx.physics; if (model.addColliders) model.addColliders(ph, engine); }
  const world = makeWorld(engine, model, camera, BOUNDS, ph);
  let carBlocked = null;
  if (extra.buildList && extra.buildList.includes('landmarksTauride') && !model.carBlocked) { const { createHandling } = await import(pathToFileURL(path.join(ROOT, 'src/world/drive/handling.js')).href); const car = createHandling({ L: engine.L, physics: ph, services: ctx.services }); carBlocked = (x, z) => car.blocked(x, z); }
  extra.built = { ctx, ph };
  return evaluate(model, { engine, world, wet: (x, z) => inPolys(x, z, S.U), ring: S.U[0].o, assertCars: !!args['assert-cars'], assertLanding: !!args['assert-landing'], route: !args['no-route'], carBlocked, ...extra });
}

// ---------------------------------------------------------------- T2: the land relief of the garden, on the REAL built module (not a stand-in)
/** RELIEF section: the module is built by buildModules (stub-env), so the published service, the terrain meshes, the colliders, the page's HEIGHT_PATCHES and the real drive/handling.js are the ones of the page. */
async function reliefSection(ctx, ph, engine) {
  const R = await import('./tauride/lib/relief-rules.mjs');
  const AT = await import(pathToFileURL(path.join(ROOT, 'src/world/lib/area-tables.js')).href);
  const GH = await import(pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride/height.js')).href);
  const TM = await import(pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride/terrain-mesh.js')).href);
  const Hk = await import(pathToFileURL(path.join(ROOT, 'src/areas/north/hooks/paradny.js')).href);
  const { createHandling } = await import(pathToFileURL(path.join(ROOT, 'src/world/drive/handling.js')).href);
  const { CAMS, EYE } = await import('./tauride-cams.mjs');
  const L = engine.L, svc = ctx.services.landmarksTauride, RH = GH.reliefHeight;      // T4a: the T2 relief rules and the mesh checks of the relief run on the pure RELIEF (reliefHeight); gardenHeight is now the terrain: ponds + relief
  let bad = 0;
  const rel = (name, ok, detail = '') => { say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); out.sections.push({ role: 'relief', name, ok, detail }); if (!ok) bad++; };
  say('RELIEF (T2) on the real built module');
  const live = AT.HEIGHT_PATCHES, saved = live.slice();
  const OLD = (x, z) => { live.length = 0; const h = L.heightAt(x, z); live.push(...saved); return h; };
  // ---- the module and its service
  rel('the page lists the garden patch after the Paradny patch (HEIGHT_PATCHES of src/areas/north/area.js); its box is TERRAIN_HULL, the hull of the hills and of the shore band of the ponds', saved.map((p) => p.id).join() === 'paradny,garden' && saved[1].at === GH.gardenHeight && JSON.stringify(saved[1].box) === JSON.stringify(GH.TERRAIN_HULL), saved.map((p) => p.id).join() + ' ' + JSON.stringify(saved[1] && saved[1].box));
  rel('the built module publishes the pure gardenHeight as terrain.heightAt, and deckY / paradny are still the Paradny deck', !!svc && svc.terrain.heightAt === GH.gardenHeight && typeof svc.deckY === 'function' && !!svc.paradny, '');
  const meshes = []; ctx.staticRoot.traverse((o) => { if (o.isMesh && /^tauride-terrain-/.test(o.name)) meshes.push(o); });
  const tris = meshes.reduce((s, m) => s + m.geometry.index.count / 3, 0);
  rel(`the terrain is at most ${TM.TERRAIN.drawsMax} meshes and ${TM.TERRAIN.trianglesTarget} triangles, and the service counts them`, meshes.length > 0 && meshes.length <= TM.TERRAIN.drawsMax && tris <= TM.TERRAIN.trianglesTarget && svc.terrain.draws === meshes.length && svc.terrain.triangles === tris, `${meshes.length} meshes, ${tris} triangles`);
  rel('the terrain meshes are noBatch (the garden ground material of T3, no vertex colour, one draw per chunk), carry normals and are inside the garden box', meshes.every((m) => m.userData.noBatch && !m.geometry.attributes.color && m.geometry.attributes.normal && m.material.userData.tauride === 'ground') && meshes.every((m) => { const b = m.geometry.boundingBox; return b.min.x >= GH.RELIEF_BOX[0] - 1 && b.max.x <= GH.RELIEF_BOX[1] + 1 && b.min.z >= GH.RELIEF_BOX[2] - 1 && b.max.z <= GH.RELIEF_BOX[3] + 1 && b.min.y >= GH.PONDS.BED_BIG - 0.01; }), '');
  { const c2 = makeContext(engine, []), n0 = c2.ctx.physics.count; TM.buildTerrain(c2.ctx, new engine.THREE.Group(), TM.planTerrain()); rel('the terrain builder adds no collider (the player follows heightAt)', c2.ctx.physics.count === n0, `${n0} -> ${c2.ctx.physics.count}`); }
  rel('the module has the colliders of T1 (Paradny and palace: 1,270) and the shore colliders of the ponds (T4a), nothing else', ph.count === 1270 + svc.ponds.colliders && svc.ponds.colliders > 100, `${ph.count} = 1270 + ${svc.ponds.colliders}`);
  // ---- the mesh against the height function
  const plan = TM.planTerrain(), M = TM.measurePlan(plan);
  rel(`the planned mesh is within ${TM.TERRAIN.tol * 100} cm of gardenHeight (rasterised on a 0.5 m lattice)`, M.maxErr <= TM.TERRAIN.tol, `max ${(M.maxErr * 100).toFixed(2)} cm at ${JSON.stringify(M.at)}, ${M.samples} samples`);
  rel(`the mesh covers every point lifted by ${TM.TERRAIN.drop * 100} cm or more, is crack-free (no edge in more than 2 triangles; open edges only at the foot, <= ${TM.TERRAIN.drop * 100} cm)`, M.uncovered === 0 && M.nonManifold === 0 && M.boundaryHigh <= TM.TERRAIN.drop + 1e-9, `uncovered ${M.uncovered} of ${M.lifted}, non-manifold edges ${M.nonManifold}, highest open edge ${(M.boundaryHigh * 100).toFixed(2)} cm`);
  // T2 fix round 1: the "pad" of the aerial views. The mesh used to keep every 16 m leaf that had one lifted sample, so each hill sat on an apron of flat triangles (25 % of the footprint) painted in the placeholder colour over the
  // textured lawn, with straight leaf edges. Now a leaf across the foot splits down to TERRAIN.edge, and the footprint hugs the lifted ground.
  rel(`the mesh footprint hugs the relief: ${(M.padArea).toFixed(0)} m2 of triangles for ${M.liftedArea.toFixed(0)} m2 lifted by ${TM.TERRAIN.drop * 100} cm or more (at most +20 %), and only ${(M.apronArea).toFixed(0)} m2 (${(100 * M.apronArea / M.padArea).toFixed(1)} %, at most 6 %) are flat triangles with no corner above ${TM.TERRAIN.drop * 100} cm`, M.padArea <= 1.2 * M.liftedArea && M.apronArea <= 0.06 * M.padArea && M.liftedArea > 8000, '');
  { const old = TM.measurePlan(TM.planTerrain(RH, GH.RELIEF_BOX, { edge: 16 }));
    rel('mutant: leaves that straddle the foot left at 16 m (the apron of the first T2) turn the footprint check red (the check can fail)', !(old.padArea <= 1.2 * old.liftedArea && old.apronArea <= 0.06 * old.padArea), `pad ${old.padArea.toFixed(0)} m2 for ${old.liftedArea.toFixed(0)} lifted, apron ${old.apronArea.toFixed(0)} m2`); }
  const planBuilt = TM.planTerrain(GH.gardenHeight, GH.RELIEF_BOX, TM.floorOptions());
  rel('the plan of the build (the COVER plan of T3: the whole floor of the garden) equals the plan of the test (deterministic)', planBuilt.tris === svc.terrain.triangles, `${planBuilt.tris} triangles, ${planBuilt.leaves} leaves, ${planBuilt.chunksBefore} chunks -> ${planBuilt.chunks.length} draws (the relief-only plan of T2: ${plan.tris})`);
  { const bad2 = TM.measurePlan(TM.planTerrain(RH, GH.RELIEF_BOX, { split: 0.4 }));
    rel('mutant: a split tolerance of 40 cm turns the 5 cm check red (the check can fail)', bad2.maxErr > TM.TERRAIN.tol, `max ${(bad2.maxErr * 100).toFixed(1)} cm`); }
  // ---- heightAt through the page's patches
  { let n = 0, bad1 = 0, lifted = 0; const b = GH.RELIEF_BOX;
    for (let x = b[0] - 6; x <= b[1] + 6; x += 2) for (let z = b[2] - 6; z <= b[3] + 6; z += 2) { n++; const g = GH.gardenHeight(x, z), p = Hk.paradnyDeckY(x, z), h = L.heightAt(x, z), want = p ?? g ?? OLD(x, z); if (g !== null) lifted++; if (h !== want) bad1++; }
    rel('layout.heightAt equals gardenHeight where the relief lifts and the old line elsewhere, over the garden box + 6 m (2 m lattice)', bad1 === 0 && lifted > 1000, `${n} points, ${lifted} lifted, ${bad1} differ`); }
  { const w = L.WORLD.play; let n = 0, diff = 0, outside = 0, notEq = 0; const PB = Hk.PARADNY_BOX, GB = GH.RELIEF_BOX;
    for (let x = w.x0 - 150; x <= w.x1 + 150; x += 2) for (let z = w.z0 - 150; z <= w.z1 + 150; z += 2) {
      n++; const h = L.heightAt(x, z), o = OLD(x, z); if (h === o) continue; diff++;
      const inP = x >= PB[0] && x <= PB[1] && z >= PB[2] && z <= PB[3], inG = x >= GB[0] && x <= GB[1] && z >= GB[2] && z <= GB[3];
      if (!inP && !inG) outside++; else if (inP && h !== Hk.paradnyDeckY(x, z)) notEq++; else if (!inP && h !== GH.gardenHeight(x, z)) notEq++;
    }
    rel('heightAt against the old line over the whole North + 150 m (2 m lattice): every difference is inside the Paradny box or the garden box and equals the patch', outside === 0 && notEq === 0 && diff > 1000, `${n} points, ${diff} differ, ${outside} outside both boxes, ${notEq} not equal to their patch`); }
  // ---- the patch box (T2 fix round 1, the start-up cost of heightAt): the HULL of the hills, so that layout.heightAt does not call gardenHeight for the 39 % of the garden box where no hill stands
  { const Hh = GH.RELIEF_HULL, b = GH.RELIEF_BOX, countOutside = (hull) => { let lifted = 0, out = 0, x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let x = b[0]; x <= b[1]; x += 0.5) for (let z = b[2]; z <= b[3]; z += 0.5) { if (RH(x, z) === null) continue; lifted++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); if (!(x >= hull[0] && x <= hull[1] && z >= hull[2] && z <= hull[3])) out++; }
      return { lifted, out, ext: [x0, x1, z0, z1] }; }, m = countOutside(Hh);
    rel('the patch box RELIEF_HULL holds every lifted point of a 0.5 m lattice over the garden box, is at most 65 % of the garden box, and each side lies within 3 m of the outermost lifted point (tight)', m.out === 0 && m.lifted > 20000 && (Hh[1] - Hh[0]) * (Hh[3] - Hh[2]) <= 0.65 * (b[1] - b[0]) * (b[3] - b[2]) && Hh[0] <= m.ext[0] && m.ext[0] - Hh[0] <= 3 && Hh[1] >= m.ext[1] && Hh[1] - m.ext[1] <= 3 && Hh[2] <= m.ext[2] && m.ext[2] - Hh[2] <= 3 && Hh[3] >= m.ext[3] && Hh[3] - m.ext[3] <= 3,
      `hull ${JSON.stringify(Hh)} = ${(100 * (Hh[1] - Hh[0]) * (Hh[3] - Hh[2]) / ((b[1] - b[0]) * (b[3] - b[2]))).toFixed(0)} % of the garden box, ${m.lifted} lifted points, ${m.out} outside, outermost lifted ${JSON.stringify(m.ext)}`);
    const small = countOutside(GH.reliefHull(GH.FEATURES.filter((f) => f.key !== 'N')));
    rel('mutant: the hull of the features without the north hill leaves lifted points outside (the hull check can fail)', small.out > 1000, `${small.out} lifted points of the north hill outside`); }
  // ---- the rules, on layout.heightAt (the whole chain) and on the pure function
  // the engine's height minus the bank profile of the ponds (the terrain is bank + relief): what is left is the relief (null in the water and where nothing lifts)
  const viaEngine = (x, z) => { const d = GH.GARDEN_SHORE.dist(x, z); if (d < 0) return null; const pr = GH.gardenHeight.profile, r = L.heightAt(x, z) - (GH.GARDEN_SHORE.inGarden(x, z) ? pr.landH(d, pr.slopeAt(x, z)) : 0); return r > 1e-9 ? r : null; };
  for (const [label, fn] of [['layout.heightAt minus the bank', viaEngine], ['reliefHeight', RH]]) {
    const m = R.checkMargins(fn, undefined, 1), sl = R.slopes(fn, 2), vio = Object.fromEntries(m.violations.map((v) => [v.rule, v]));
    for (const k of Object.keys(R.MARGINS)) rel(`[${label}] relief is zero within ${R.MARGINS[k]} m of ${{ outline: 'the garden outline (no cliff at the fence line, inside or outside)', footprint: 'every building footprint (HILL_KEEP_OUT_MARGIN)', tree: 'every OSM tree', water: 'the water (the banks of T4 are cut there)', bridge: 'every bridge way', flat: 'the pitch, playgrounds, fitness station, fountain and statues', pose: 'the camera poses T01-T11 and the VIEWS poses' }[k]}`, !vio[k], vio[k] ? `${vio[k].n} cells, worst ${vio[k].worst} m at ${JSON.stringify(vio[k].at)}` : `${m.lifted} lifted cells checked`);
    rel(`[${label}] land slope <= 1:4 (${R.MAX_SLOPE}) on every lifted cell; ways <= 1:4 per metre on the 120 ways`, sl.land.max <= R.MAX_SLOPE && sl.ways.max <= R.MAX_SLOPE, `land ${sl.land.max.toFixed(3)} at ${JSON.stringify(sl.land.at)}, ways ${sl.ways.max.toFixed(3)} (${sl.ways.id})`);
  }
  { // the south gate -> memorial route: the shortest way route, per metre
    const g = pathGraph(S.P.PATHS), a = g.nearest(S.S_GATE.x, S.S_GATE.z, 12), b = g.nearest(MEMORIAL.x, MEMORIAL.z, 12), r = a && b ? route(g, a, b) : null;
    let mx = 0, up = 0, down = 0, len = 0, prev = null;
    if (r) for (let i = 0; i + 1 < r.length; i++) { const A = r[i], B = r[i + 1], l = Math.hypot(B.x - A.x, B.z - A.z), n = Math.max(1, Math.ceil(l)); for (let k = 0; k <= n; k++) { const x = A.x + (B.x - A.x) * k / n, z = A.z + (B.z - A.z) * k / n, h = L.heightAt(x, z); if (prev) { const d = h - prev.h, s = Math.hypot(x - prev.x, z - prev.z); if (s > 1e-6) mx = Math.max(mx, Math.abs(d) / s); if (d > 0) up += d; else down -= d; len += s; } prev = { x, z, h }; } }
    rel('the south gate -> memorial route (shortest way route) never exceeds 1:4 per metre, and is not flat (the memorial stands on its plateau)', !!r && mx <= R.MAX_SLOPE && L.heightAt(MEMORIAL.x, MEMORIAL.z) > 0.9, `${r ? len.toFixed(0) : '-'} m, steepest ${mx.toFixed(3)}, climbs ${up.toFixed(2)} m, descends ${down.toFixed(2)} m, the memorial at ${L.heightAt(MEMORIAL.x, MEMORIAL.z).toFixed(2)} m`); }
  { // the camera poses stay at street level and keep their view: no hill between the eye and the target
    let worst = Infinity, wp = null, hmax = 0;
    for (const c of CAMS) { if (c.flight) continue; const h0 = L.heightAt(c.x, c.z); hmax = Math.max(hmax, h0); const ex = c.x, ez = c.z, ey = h0 + EYE, tx = c.target.x, tz = c.target.z, ty = L.heightAt(tx, tz) + c.target.y, d = Math.hypot(tx - ex, tz - ez), n = Math.max(2, Math.ceil(d));
      for (let k = 1; k < n; k++) { const s = k / n; if ((1 - s) * d < 3) break; const ry = ey + (ty - ey) * s, gy = L.heightAt(ex + (tx - ex) * s, ez + (tz - ez) * s), clear = ry - gy; if (clear < worst) { worst = clear; wp = c.id; } } }
    rel('the 11 ground camera poses stand at street level (relief 0 within 4 m; the crest of a pond bank, at most BANK_TOP, may lift a pose that is 3 .. 8 m from the water) and no hill hides their target (the eye line clears the terrain by 0.5 m or more except in the last 3 m)', hmax <= GH.PONDS.BANK_TOP + 1e-9 && worst > 0.5, `highest pose ground ${hmax.toFixed(2)} m, tightest eye-line clearance ${worst.toFixed(2)} m at ${wp}`); }
  // ---- determinism, purity, edge cases
  { let det = 0, nonNum = 0; const f1 = RH, f2 = GH.makeGardenHeight();
    for (let i = 0; i < 20000; i++) { const x = GH.RELIEF_BOX[0] + ((i * 7919) % 5803) / 10, z = GH.RELIEF_BOX[2] + ((i * 104729) % 5290) / 10, a = f1(x, z), b = f1(x, z), c = f2(x, z); if (a !== b || a !== c) det++; if (a !== null && !(typeof a === 'number' && Number.isFinite(a) && a > 0)) nonNum++; }
    rel('gardenHeight is deterministic (same bits on a second call and from a fresh makeGardenHeight()) and answers null or a finite number > 0', det === 0 && nonNum === 0, `20,000 points, ${det} differ, ${nonNum} malformed`);
    const edge = [[NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity], [undefined, undefined], [null, null], [1e9, -1e9], [-1e9, 1e9], [0, 0], [GH.RELIEF_BOX[0] - 1e-9, -1500], [GH.RELIEF_BOX[1] + 1e-9, -1500], [1200, GH.RELIEF_BOX[2] - 1e-9], [1200, GH.RELIEF_BOX[3] + 1e-9]];
    rel('gardenHeight answers null (and does not throw) for NaN, +-Infinity, undefined, null, far points and points just outside the box', edge.every(([x, z]) => { try { return f1(x, z) === null; } catch (e) { return false; } }), '');
    const src = f1.toString(); rel('the body of gardenHeight allocates nothing (no new, closure, array / object literal, spread, iterator method): text check', !/\bnew\b|=>|\.\.\.|\.map\(|\.forEach\(|\.filter\(|\.reduce\(|\bfunction\b.*\bfunction\b|\{\s*[A-Za-z]+\s*:|\[\s*[^\]\s]+\s*,[^\]]*\]\s*[;,)]/.test(src.replace(/^function gardenHeight\(x, z\)/, '')), `${src.length} chars`); }
  { // T2 fix round 1: the cell masks of gardenHeight (4 m cells, one bit per feature) against BRUTE FORCE (every feature at every point, the same arithmetic, no grid): bit for bit on a 1 m lattice, random points and a rotated / stretched copy of the features
    const brute = (feats, box = GH.RELIEF_BOX) => (x, z) => {
      if (!(x >= box[0] && x <= box[1] && z >= box[2] && z <= box[3])) return null;
      let best = 0;
      for (const f of feats) {
        const a = (f.rot || 0) * Math.PI / 180, co = Math.cos(a), si = Math.sin(a), dx = x - f.x, dz = z - f.z, top = f.top || 0, u = (dx * co + dz * si) * (1 / f.rx), v = (-dx * si + dz * co) * (1 / f.rz), q = Math.sqrt(u * u + v * v);
        if (q >= 1) continue;
        let h; if (q <= top) h = f.h; else { const t = (1 - q) / (1 - top); h = f.h * t * t * (3 - 2 * t); }
        if (h > best) best = h;
      }
      return best > 0 ? best : null;
    };
    const b = GH.RELIEF_BOX; let s = 4242; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const sweep = (fa, fb) => { let n = 0, d = 0, lifted = 0; const one = (x, z) => { n++; const p = fa(x, z), r = fb(x, z); if (p !== null) lifted++; if (p !== r) d++; };
      for (let x = b[0] - 2; x <= b[1] + 2; x += 1) for (let z = b[2] - 2; z <= b[3] + 2; z += 1) one(x, z);
      for (let i = 0; i < 400000; i++) one(b[0] - 4 + rnd() * (b[1] - b[0] + 8), b[2] - 4 + rnd() * (b[3] - b[2] + 8));
      for (const f of GH.FEATURES) for (let i = 0; i < 20000; i++) one(f.x + (rnd() * 2 - 1) * (Math.max(f.rx, f.rz) + 3), f.z + (rnd() * 2 - 1) * (Math.max(f.rx, f.rz) + 3));
      return { n, d, lifted }; };
    const m = sweep(RH, brute(GH.FEATURES));
    rel('gardenHeight (cell masks) equals the brute-force evaluation of every feature bit for bit (1 m lattice + 400,000 random + the feet of the nine hills)', m.d === 0 && m.lifted > 50000, `${m.n} points, ${m.lifted} lifted, ${m.d} differ`);
    const mut = GH.FEATURES.map((f, i) => ({ ...f, rot: (f.rot || 0) + 23 * i, rx: f.rx * 1.25, rz: f.rz * 0.85 })), m2 = sweep(GH.makeGardenHeight(mut), brute(mut));
    rel('... also for a rotated and stretched copy of the features (overlapping hills included)', m2.d === 0 && m2.lifted > 50000, `${m2.n} points, ${m2.lifted} lifted, ${m2.d} differ`);
    const m3 = sweep(RH, brute(GH.FEATURES.map((f) => (f.key === 'C' ? { ...f, h: f.h + 0.01 } : f))));
    rel('mutant: one hill 1 cm higher in the reference makes the comparison red (the check can fail)', m3.d > 100, `${m3.d} points differ`);
    let threw = false; try { GH.makeGardenHeight(Array.from({ length: 33 }, () => GH.FEATURES[0])); } catch (e) { threw = /at most 32/.test(String(e.message)); }
    rel('makeGardenHeight refuses more than 32 features (the cell masks are 32 bits) with a clear error', threw, ''); }
  { const hs = fs.readFileSync(path.join(ROOT, 'src/world/landmarksTauride/height.js'), 'utf8').replace(/\/\/.*$/gm, ''), rs = fs.readFileSync(path.join(ROOT, 'src/world/landmarksTauride/data/relief.js'), 'utf8').replace(/\/\/.*$/gm, '');
    rel('height.js imports only the four pure data modules (relief, water, footprints, ponds), they import nothing, neither names three.js, layout.js, a facade, ctx, the DOM or a random source', [...hs.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]).join() === './data/relief.js,./data/water.js,./data/footprints.js,./data/ponds.js' && !/^import/m.test(rs) && ['water', 'footprints', 'ponds'].every((n) => !/^import/m.test(fs.readFileSync(path.join(ROOT, 'src/world/landmarksTauride/data/' + n + '.js'), 'utf8'))) && !/\bTHREE\b|\bthree\b|layout|facade|\bctx\b|\bdocument\b|\bwindow\b|Math\.random|Date\.now/.test(hs + rs), ''); }
  { const feats = GH.FEATURES, ids = feats.map((f) => f.id), keys = feats.map((f) => f.key);
    rel('every relief feature has a unique id and key, a provenance (osm | design) and an evidence text, and is inside the garden box', new Set(ids).size === ids.length && new Set(keys).size === keys.length && feats.every((f) => (f.prov === 'osm' || f.prov === 'design') && typeof f.evidence === 'string' && f.evidence.length > 10 && f.x - f.rx >= GH.RELIEF_BOX[0] && f.x + f.rx <= GH.RELIEF_BOX[1] && f.z - f.rz >= GH.RELIEF_BOX[2] && f.z + f.rz <= GH.RELIEF_BOX[3]), `${feats.length} features, ${feats.filter((f) => f.prov === 'osm').length} with an OSM position, highest ${Math.max(...feats.map((f) => f.h))} m`);
    rel('the relief heights are within the plan: hills <= 6 m, the north hill 3-6 m, mounds 1.2-3 m, island mound ~1.5 m', Math.max(...feats.map((f) => f.h)) <= 6 && feats.find((f) => f.id === 'north-hill').h >= 3 && feats.find((f) => f.id === 'island-south-mound').h >= 1 && feats.filter((f) => /mound|knoll|gorka/.test(f.id)).every((f) => f.h >= 1.2 || f.id === 'island-south-mound'), ''); }
  // ---- the cars: the real handling, with and without the hook
  { const mk = (hookless) => { const keep = AT.HOOKS.carKeepOut; if (hookless) delete AT.HOOKS.carKeepOut; try { return createHandling({ L, physics: ph, services: ctx.services }); } finally { if (hookless) AT.HOOKS.carKeepOut = keep; } };
    const withHook = mk(false), without = mk(true), a = carBreach(S, (x, z) => withHook.blocked(x, z)), b = carBreach(S, (x, z) => without.blocked(x, z));
    rel('cars: with the hook 0 m of the garden outline can be driven across (the real createHandling().blocked, no exception for the service lane)', typeof AT.HOOKS.carKeepOut === 'function' && a.breachM === 0, `${a.breachM} of ${a.perimeterM} m`);
    rel('cars: without the hook the same harness finds the outline open (the check can fail)', b.breachM > 1000, `${b.breachM} of ${b.perimeterM} m (the generic North of today: 2,018 of 2,158 m)`);
    let inside = 0, tested = 0; for (const w of S.Fu.SERVICE_LANE.ways) for (let i = 0; i + 3 < w.pts.length; i += 2) { const l = Math.hypot(w.pts[i + 2] - w.pts[i], w.pts[i + 3] - w.pts[i + 1]), n = Math.max(1, Math.ceil(l)); for (let k = 0; k <= n; k++) { const x = w.pts[i] + (w.pts[i + 2] - w.pts[i]) * k / n, z = w.pts[i + 1] + (w.pts[i + 3] - w.pts[i + 1]) * k / n; if (S.inGarden(x, z)) { tested++; if (!withHook.blocked(x, z)) inside++; } } }
    rel('cars: no point of the service lane inside the garden is drivable (the lane is not an exception)', tested > 0 && inside === 0, `${tested} lane points inside the outline, ${inside} drivable`);
    const G = (await import(pathToFileURL(path.join(ROOT, 'src/world/lib/area-tables.js')).href)).GARAGE, spawns = [G.spawn, ...Object.values(G.poses)].filter(Boolean);
    rel('cars: no garage spawn or parking pose of the North lies inside the closed garden', spawns.every((p) => !S.inGarden(p.x, p.z)), `${spawns.length} poses`); }
  // ---- mutation checks: each edit of the relief must turn the matching rule red (the rules can fail)
  { const base = JSON.parse(JSON.stringify(GH.FEATURES)), byId = (a, id) => a.find((f) => f.id === id);
    const mutants = [
      ['a hill 1 m too high (north hill +1 m)', (a) => { byId(a, 'north-hill').h += 1; }, 'slope'],
      ['a hill much too high (centre mound 2 m -> 6 m)', (a) => { byId(a, 'centre-mound').h = 6; }, 'slope'],
      ['the blend removed (memorial plateau with a flat top over 99 % of its radius: a cliff)', (a) => { byId(a, 'memorial-tip').top = 0.99; }, 'slope'],
      ['the blend removed (north hill with a flat top over 99.9 %)', (a) => { byId(a, 'north-hill').top = 0.999; }, 'slope'],
      ['the water margin removed (island mound 14 m wider)', (a) => { byId(a, 'island-south-mound').rx += 14; }, 'water'],
      ['the footprint margin removed (Gorka hill moved 12 m over the building)', (a) => { const f = byId(a, 'gorka'); f.x -= 12; f.z -= 4; }, 'footprint'],
      ['the tree margin removed (lake-west mound moved onto the oaks)', (a) => { const f = byId(a, 'lake-west-mound'); f.x += 14; f.z -= 40; }, 'tree'],
      ['the outline margin removed (north hill moved 40 m west over the fence)', (a) => { byId(a, 'north-hill').x -= 40; }, 'outline'],
      ['the bridge margin removed (memorial tip 14 m wider towards bridge No.3)', (a) => { const f = byId(a, 'memorial-tip'); f.rx += 14; f.x += 10; }, 'bridge'],
      ['the pose margin removed (dam knoll moved over the Dam pose T05)', (a) => { byId(a, 'dam-knoll').x += 38; }, 'pose'],
      ['the flat-zone margin removed (centre mound moved over the fountain plaza)', (a) => { const f = byId(a, 'centre-mound'); f.x += 30; f.z += 15; }, 'flat'],
    ];
    const clean = (() => { const fn = GH.makeGardenHeight(base, GH.RELIEF_BOX), m = R.checkMargins(fn, undefined, 2), s = R.slopes(fn, 2); return m.violations.length === 0 && s.land.max <= R.MAX_SLOPE && s.ways.max <= R.MAX_SLOPE; })();
    rel('mutation baseline: an unedited copy of the relief passes the rules at the coarse lattice', clean, '');
    for (const [name, edit, rule] of mutants) {
      const a = JSON.parse(JSON.stringify(base)); edit(a); const fn = GH.makeGardenHeight(a, GH.RELIEF_BOX), m = R.checkMargins(fn, undefined, 2), s = R.slopes(fn, 2);
      const red = rule === 'slope' ? s.land.max > R.MAX_SLOPE || s.ways.max > R.MAX_SLOPE : m.violations.some((v) => v.rule === rule);
      rel(`mutant: ${name} -> the ${rule} rule turns red`, red, rule === 'slope' ? `land ${s.land.max.toFixed(3)}, ways ${s.ways.max.toFixed(3)}` : (m.violations.find((v) => v.rule === rule) ? `${m.violations.find((v) => v.rule === rule).n} cells` : 'NOT DETECTED'));
    } }
  return bad;
}

// ---------------------------------------------------------------- T4a: the ponds are impassable (the wading acceptance on the REAL built module)
/** PONDS section: a dense ring of shore probes (<= 3 m apart) approached from land at several angles and speeds including a jump, on the real Physics of the built module (the shore colliders, the Paradny colliders, the engine's heightAt
 *  with the garden patch); the mutants (no shore colliders; the old module's 0.22 m box) must let walkers into the water; the datum numbers the harness relies on. Returns the number of failed checks. */
async function pondSection(ctx, ph, engine) {
  const GH = await import(pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride/height.js')).href);
  const PM = await import(pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride/ponds.js')).href);
  const { STEP_HEIGHT } = engine;
  const svc = ctx.services.landmarksTauride, L = engine.L, P = GH.PONDS, C = P.COLLIDER;
  let bad = 0;
  const rel = (name, ok, detail = '') => { say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); out.sections.push({ role: 'ponds', name, ok, detail }); if (!ok) bad++; };
  say('PONDS (T4a): impassable shores on the real built module');
  const segs = GH.shoreSegments(S.U), shore = GH.GARDEN_SHORE, { camera } = makeContext(engine, []);
  const world = (physics, hAt) => ({ engine, L, ph: physics, model: { waterLevel: P.WATER_Y, inWater: (x, z) => shore.dist(x, z) < 0 }, camera, bounds: BOUNDS, heightAt: hAt, player: () => makePlayer(engine, camera, physics, BOUNDS) });
  const real = world(ph, (x, z) => L.heightAt(x, z));
  rel(`the contour collider stands above any feet that can reach it: top ${C.top} m > contour ${C.contourY} + STEP_HEIGHT ${STEP_HEIGHT} + a jump 0.73 m + the crest ${P.BANK_TOP} m, bottom ${C.y0} m below the deepest bed ${Math.min(P.BED_BIG, P.BED_SMALL)} m`, C.top > C.contourY + STEP_HEIGHT && C.top > P.BANK_TOP + 0.73 + STEP_HEIGHT && C.y0 < Math.min(P.BED_BIG, P.BED_SMALL), '');
  rel('the module published its pond service: level, triangles, colliders, build time', svc.ponds && svc.ponds.y === P.WATER_Y && svc.ponds.colliders === svc.ponds.stats.colliders && svc.ponds.colliders > 100, svc.ponds ? `${svc.ponds.colliders} colliders, ${svc.ponds.triangles} water triangles, built in ${svc.ponds.buildMs.toFixed(1)} ms` : 'no service');
  const t0 = Date.now(), ring = wadeRing(real, shore, segs, { spacing: 3 }), sec = ((Date.now() - t0) / 1000).toFixed(0);
  rel(`RING: ${ring.runs} runs from ${ring.runs / 21 | 0} starts every 3 m along the 2,666 m of shore (${ring.skipped} starts skipped), 7 angles (0, +-30, +-60, +-80 degrees from the perpendicular) x walk / sprint / jump: 0 entered the water (closest feet to the waterline ${ring.minD.toFixed(2)} m, p1 ${ring.p01.toFixed(2)}, median ${ring.p50.toFixed(2)})`, ring.entered === 0 && ring.trapped === 0 && ring.runs > 12000 && ring.minD > 0, `${ring.entered} entered, ${ring.trapped} trapped, by mode ${JSON.stringify(ring.byMode)}, ${sec} s`);
  const walkOnly = wadeRing(real, shore, segs, { spacing: 3, angles: [0], modes: ['walk'], limit: 400, offset: 0.1 });
  rel('RING (a second lattice of starts, straight walk): 0 entered', walkOnly.entered === 0 && walkOnly.runs > 300, `${walkOnly.runs} runs, closest ${walkOnly.minD.toFixed(2)} m`);
  // the mutants: the harness must be able to see a trap
  { const bareH = (x, z) => L.heightAt(x, z), bare = new engine.Physics(bareH), n = wadeRing(world(bare, bareH), shore, segs, { spacing: 3, angles: [0], modes: ['walk'], limit: 120, offset: 0.2 });
    rel('mutant: no shore colliders -> walkers wade into the water (the ring can fail)', n.entered > n.runs * 0.5, `${n.entered} of ${n.runs} entered, closest ${n.minD.toFixed(2)} m`); }
  { const old = new engine.Physics((x, z) => L.heightAt(x, z)), pl = PM.planPonds({ ponds: { ...P, COLLIDER: { ...C, top: 0.22, y0: -1.5, contourY: 0.05 } } });
    for (const c of pl.colliders) old.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1);
    const n = wadeRing(world(old, (x, z) => L.heightAt(x, z)), shore, segs, { spacing: 3, angles: [0], modes: ['walk', 'sprint'], limit: 150, offset: 0.3 });
    rel("mutant: the old module's shore box (top 0.22 m, bottom -1.5 m, on the ground at the crest: a walker at feet 0.05 steps over it) -> walkers get into the water and cannot get out (the old trap)", n.entered > n.runs * 0.3 && n.trapped > 0, `${n.entered} of ${n.runs} entered, ${n.trapped} trapped`); }
  { const low = new engine.Physics((x, z) => L.heightAt(x, z)), pl = PM.planPonds({ ponds: { ...P, COLLIDER: { ...C, top: C.contourY + 0.3 } } });
    for (const c of pl.colliders) low.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1);
    const n = wadeRing(world(low, (x, z) => L.heightAt(x, z)), shore, segs, { spacing: 3, angles: [0], modes: ['walk'], limit: 120, offset: 0.4 });
    rel('mutant: a top below contour + STEP_HEIGHT (a box that a walker steps over) -> entries (the top is a real parameter)', n.entered > 0, `${n.entered} of ${n.runs} entered`); }
  // FLIGHT LANDING (T4a fix round 1). The engine refuses a landing only where the ground is below -1 m (the Big Pond deeper than 0.55 m); in the shallows and the whole Small Pond (-0.5 m) a flyer landed INSIDE the ring of the
  // shore colliders and could not walk out (QA: 9 of 9). HOOKS.noLanding (hooks/water.js, handed to the Player by main.js) refuses the ponds.
  const AT = await import(pathToFileURL(path.join(ROOT, 'src/world/lib/area-tables.js')).href), HW = await import(pathToFileURL(path.join(ROOT, 'src/areas/north/hooks/water.js')).href), hook = AT.HOOKS.noLanding;
  rel('the page has HOOKS.noLanding (a function: the ponds refuse a flight landing); a module list without the garden has none (the strip is untouched)', typeof hook === 'function' && HW.makeNoLanding(['environment']) === undefined && HW.makeNoLanding(undefined) === undefined, '');
  const ld0 = landingReport(real, S), ld = landingReport(real, S, hook);
  rel("flight landing over the water, the lattice of 4 m: the hook refuses EVERY water cell (the engine's own test refused " + ld0.refused + ' of ' + ld0.cells + ')', ld.cells > 1000 && ld.refused === ld.cells && ld0.refused < ld0.cells && ld.landableDeep === 0, `${ld.cells} water cells, ${ld.refused} refused with the hook, ${ld0.refused} without (the engine's ground < -1), ${ld.landableDeep} landable deeper than ${real.model.wadeDepth ?? 0.3} m`);
  // the real Player at spots over the water: shallows of the Big Pond, the Small Pond, the middle depths, the deep
  const lat = []; for (const p of S.U) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); }
    for (let x = x0; x <= x1; x += 3) for (let z = z0; z <= z1; z += 3) { const d = shore.dist(x, z); if (d > -1.5) continue; lat.push({ x, z, g: real.ph.groundHeight(x, z, 60), d }); } }
  const pick = (fn, n) => { const a = lat.filter(fn), out = []; for (let i = 0; i < n && a.length; i++) out.push(a[Math.floor((i + 0.5) * a.length / n)]); return out; };
  const spots = [...pick((c) => c.g > -0.6 && c.x > 1250, 6), ...pick((c) => c.x <= 1250, 5), ...pick((c) => c.g <= -0.6 && c.g > -1.0, 4), ...pick((c) => c.g <= -1.0, 3)];
  const shallowIn = spots.filter((c) => c.g > -1.0);
  const withHook = flightLanding(real, shore, segs, spots, { noLanding: hook });
  rel(`the real Player at ${spots.length} spots over the water (the shallows of the Big Pond, the Small Pond, the middle, the deep) presses F with the hook: every landing is refused as 'water'`, withHook.n === spots.length && withHook.refused === spots.length && withHook.landed === 0, `${withHook.refused} of ${withHook.n} refused`);
  const noHook = flightLanding(real, shore, segs, shallowIn, { noLanding: null });
  rel("mutant: WITHOUT the hook the landings in the shallows and the Small Pond are accepted and the flyer cannot walk out of the shore ring (the QA finding is reproduced: the check can fail)", noHook.landed > 0 && noHook.trapped > 0, `${noHook.landed} of ${noHook.n} accepted, ${noHook.trapped} trapped (walking toward the nearest shore ends on the wet slope, shore distance ${noHook.rows.filter((r) => r.end).slice(0, 3).map((r) => r.end[3]).join(' / ')} m)`);
  const dry = []; for (let x = 1040; x < 1470; x += 5) for (let z = -1730; z < -1270; z += 5) { const d = shore.dist(x, z); if (d >= 4 && d <= 14 && S.inGarden(x, z) && !L.insideBuilding(x, z, 4)) dry.push({ x, z }); }
  const dryPts = []; for (let i = 0; i < 10; i++) dryPts.push(dry[Math.floor((i + 0.5) * dry.length / 10)]);
  const dryLand = flightLanding(real, shore, segs, dryPts, { noLanding: hook });
  rel('the hook does not over-refuse: 10 spots on the lawn 4 .. 14 m from the shore (inside the garden) are landable, the flyer ends on land', dryLand.refused === 0 && dryLand.landed === dryPts.length, `${dryLand.landed} of ${dryPts.length} landed`);
  return bad;
}

// ---------------------------------------------------------------- which runs
const models = onlySource ? {} : builtinModels(S, engine.L);
for (const m of Object.values(models)) m.wadeDepth = WADE;
let main = null;
if (!onlySource) {
  const buildList = args.build ? String(args.build).split(',') : [];
  if (args.model && !models[args.model]) {
    const mod = await import(pathToFileURL(path.resolve(ROOT, args.model)).href);
    const m = mod.model || mod.default;
    main = { name: path.basename(args.model), waterLevel: -0.45, inWater: (x, z) => inPolys(x, z, S.U), addColliders() {}, ...m, wadeDepth: m.wadeDepth ?? WADE };      // defaults for what a model leaves out
  } else main = models[args.model || 'north'];
  if (main && main === models.north && buildList.includes('landmarksTauride')) main = { ...main, name: 'north + landmarksTauride (the REAL built module: ponds, banks, shore colliders)', waterLevel: (await import(pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride/data/ponds.js')).href)).WATER_Y, routeToShore: true, heightAt: (x, z) => engine.L.heightAt(x, z) };      // the engine's heightAt of the page: the garden patch (bowls, banks, hills) is what is tested
  if (!main) { console.error(`unknown model ${args.model}`); process.exit(2); }
  say(`TAURIDE HEIGHT TEST (real Player + Physics of ${path.basename(ROOT)})${buildList.length ? ', modules built: ' + buildList.join(', ') : ''}`);
  const ex = { buildList };
  const r = await runModel(main, ex);
  out.sections.push({ role: 'main', ...r });
  if (!r.pass) failed++;
  say(`  => ${main.name.split(' (')[0]}: ${mark(r.pass)}`);
  say();
  if (buildList.includes('landmarksTauride') && ex.built) { const nb = await reliefSection(ex.built.ctx, ex.built.ph, engine); if (nb) failed++; say(`  => RELIEF (T2): ${nb ? nb + ' check(s) FAILED' : 'every check passed'}`); say(); const np = await pondSection(ex.built.ctx, ex.built.ph, engine); if (np) failed++; say(`  => PONDS (T4a): ${np ? np + ' check(s) FAILED' : 'every check passed'}`); say(); }
}

// the self-check of the harness: a trap must FAIL, a contour fix and a wade model must PASS
if (!onlySource && !args.model && !args['no-selfcheck']) {
  say('SELF-CHECK of the harness on synthetic models (they must behave as declared, else the harness is wrong)');
  for (const [name, expectPass] of [['demo-trap', false], ['demo-contour', true], ['demo-wade', true]]) {
    const r = await runModel(models[name], { route: true });
    const ok = r.pass === expectPass && (name !== 'demo-trap' || (r.wade.trapped >= 8 && r.wade.deepExited === 0));
    out.sections.push({ role: 'self-check', expectPass, ok, ...r });
    if (!ok) failed++;
    say(`  => ${name}: ${r.pass ? 'passes' : 'fails'} as ${expectPass ? 'a passing' : 'a failing'} model must -> ${ok ? 'harness ok' : 'HARNESS WRONG'}`);
    say();
  }
}

// the old trap on the source module
if (onlySource || args.source || process.env.PITER_SRC) {
  say('OLD TRAP: the source module landmarksTauride at ' + (process.env.PITER_SRC || '(PITER_SRC unset)'));
  if (!process.env.PITER_SRC) { say('  PITER_SRC is not set: not run'); if (onlySource) process.exit(2); }
  else {
    const root = engineRoot(true), eng = await loadEngine(root);
    const { ctx, camera } = makeContext(eng, ['landmarksTauride']);
    await buildModules(eng, ctx, ['landmarksTauride']);
    const T = await import(pathToFileURL(path.join(root, 'src/world/landmarksTauride/terrain.js')).href);
    const U = T.TAURIDE_WATER_UNION, wet = (x, z) => inPolys(x, z, U);
    const model = { name: 'source landmarksTauride @' + root, heightAt: (x, z) => eng.L.heightAt(x, z), waterLevel: -0.55, wadeDepth: WADE, inWater: wet, addColliders() {} };
    const world = makeWorld(eng, model, camera, BOUNDS, ctx.physics);
    const probes = shoreProbes(eng.L, wet, U[0].o, { count: PROBES });
    const rows = wadeProbes(world, probes), ws = wadeSummary(rows);
    const reproduced = ws.entered >= 10 && ws.deepExited === 0 && ws.trapped >= 10;
    out.sections.push({ role: 'old-trap', reproduced, ...ws, colliders: ctx.physics.count });
    say(`  built the old module: ${ctx.physics.count} colliders; heightAt in the lake centre ${eng.L.heightAt(1330, -1540)} m`);
    say(`  ${ws.probes} shore probes: ${ws.entered} walked into the lake and stand at y ${rows.filter((r) => r.entered).map((r) => r.yIn)[0]} m, ${ws.deepExited} of ${ws.deep} got out again, ${ws.trapped} trapped (the shore box y -1.5 .. 0.22 is ignored from y 0 because physics.js skips a box when feet + 0.45 >= its top, but blocks at feet -1.4)`);
    say(`  => the old trap ${reproduced ? 'REPRODUCED (expected: 12 enter, 0 exit)' : 'NOT reproduced'}: ${mark(reproduced)}`);
    if (!reproduced) failed++;
    say();
  }
} else if (!args.json) say('OLD TRAP reproduction: not run (set PITER_SRC to the source repository checkout, e.g. PITER_SRC=D:/git2/agi-fun-tests/102_3d_piter)\n');

if (args.json) console.log(JSON.stringify(out, null, 1));
say(failed ? `RESULT: FAIL (${failed} section(s))` : 'RESULT: OK');
process.exit(failed ? 1 : 0);
