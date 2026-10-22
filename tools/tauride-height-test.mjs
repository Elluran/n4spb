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
//            poses, the flat zones; slope <= 1:4 on land, on the 120 ways and on the south gate -> memorial route), the terrain meshes (<= 16 draws, <= 40 k triangles, <= 5 cm, crack-free, no collider), heightAt through the page's patches (the diff against the old
//            line is confined to the Paradny box and the garden box), determinism / purity / edge cases of gardenHeight, the cars with the real handling (0 m of the outline open; the same harness without the hook: 2,018 m), and 11 mutants that must turn a rule red.
//            node tools/area.mjs north tools/tauride-height-test.mjs --model north --build landmarksTauride --assert-cars --no-selfcheck
// Exit 0 = every expectation met (the main model passes, the self-check models behave as declared, the old trap reproduces).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, parseArgs, inPolys } from './tauride/lib/common.mjs';
import * as S from './tauride/lib/site.mjs';
import { loadEngine, makeContext, buildModules, engineRoot } from './tauride/lib/stub-env.mjs';
import { builtinModels } from './tauride/lib/demo-models.mjs';
import { makeWorld, wadeProbes, wadeSummary, shoreProbes, pathGraph, route, walkRoute, slopeReport, landingReport, carBreach } from './tauride/lib/height-harness.mjs';

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
      const w = walkRoute(world, r), ok = w.ok && w.maxDepth <= model.wadeDepth;
      res.route = { ways: [...new Set(r.map((q) => q.way).filter(Boolean))].length, ...w };
      say(`  route  : south gate -> memorial along ${res.route.ways} ways, ${w.lengthM} m: ${w.ok ? 'arrived' : 'STUCK at ' + JSON.stringify(w.stuckAt)} in ${(w.ticks / 60).toFixed(0)} s, lowest feet ${w.minY} m, deepest water ${w.maxDepth} m  -> ${mark(ok)}`);
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
  const L = engine.L, svc = ctx.services.landmarksTauride;
  let bad = 0;
  const rel = (name, ok, detail = '') => { say(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`); out.sections.push({ role: 'relief', name, ok, detail }); if (!ok) bad++; };
  say('RELIEF (T2) on the real built module');
  const live = AT.HEIGHT_PATCHES, saved = live.slice();
  const OLD = (x, z) => { live.length = 0; const h = L.heightAt(x, z); live.push(...saved); return h; };
  // ---- the module and its service
  rel('the page lists the garden patch after the Paradny patch (HEIGHT_PATCHES of src/areas/north/area.js)', saved.map((p) => p.id).join() === 'paradny,garden' && saved[1].at === GH.gardenHeight, saved.map((p) => p.id).join());
  rel('the built module publishes the pure gardenHeight as terrain.heightAt, and deckY / paradny are still the Paradny deck', !!svc && svc.terrain.heightAt === GH.gardenHeight && typeof svc.deckY === 'function' && !!svc.paradny, '');
  const meshes = []; ctx.staticRoot.traverse((o) => { if (o.isMesh && /^tauride-terrain-/.test(o.name)) meshes.push(o); });
  const tris = meshes.reduce((s, m) => s + m.geometry.index.count / 3, 0);
  rel(`the terrain is at most ${TM.TERRAIN.drawsMax} meshes and ${TM.TERRAIN.trianglesTarget} triangles, and the service counts them`, meshes.length > 0 && meshes.length <= TM.TERRAIN.drawsMax && tris <= TM.TERRAIN.trianglesTarget && svc.terrain.draws === meshes.length && svc.terrain.triangles === tris, `${meshes.length} meshes, ${tris} triangles`);
  rel('the terrain meshes are noBatch (custom vertex-coloured material, one draw per chunk), carry colours and normals and are inside the garden box', meshes.every((m) => m.userData.noBatch && m.geometry.attributes.color && m.geometry.attributes.normal) && meshes.every((m) => { const b = m.geometry.boundingBox; return b.min.x >= GH.RELIEF_BOX[0] - 1 && b.max.x <= GH.RELIEF_BOX[1] + 1 && b.min.z >= GH.RELIEF_BOX[2] - 1 && b.max.z <= GH.RELIEF_BOX[3] + 1 && b.min.y >= -1e-6; }), '');
  { const c2 = makeContext(engine, []), n0 = c2.ctx.physics.count; TM.buildTerrain(c2.ctx, new engine.THREE.Group(), TM.planTerrain()); rel('the terrain builder adds no collider (the player follows heightAt)', c2.ctx.physics.count === n0, `${n0} -> ${c2.ctx.physics.count}`); }
  rel('the module still has the colliders of T1 only (Paradny and palace: 1,270)', ph.count === 1270, String(ph.count));
  // ---- the mesh against the height function
  const plan = TM.planTerrain(), M = TM.measurePlan(plan);
  rel(`the planned mesh is within ${TM.TERRAIN.tol * 100} cm of gardenHeight (rasterised on a 0.5 m lattice)`, M.maxErr <= TM.TERRAIN.tol, `max ${(M.maxErr * 100).toFixed(2)} cm at ${JSON.stringify(M.at)}, ${M.samples} samples`);
  rel('the mesh covers every lifted point (> 0.5 mm), is crack-free (no edge in more than 2 triangles; open edges only at the foot, <= 1 cm) and has no triangle where the ground is flat', M.uncovered === 0 && M.nonManifold === 0 && M.boundaryHigh <= 0.01, `uncovered ${M.uncovered} of ${M.lifted}, non-manifold edges ${M.nonManifold}, highest open edge ${(M.boundaryHigh * 100).toFixed(2)} cm`);
  rel('the plan of the build equals the plan of the test (deterministic)', plan.tris === svc.terrain.triangles, `${plan.tris} triangles, ${plan.leaves} leaves, ${plan.chunksBefore} chunks -> ${plan.chunks.length} draws`);
  { const bad2 = TM.measurePlan(TM.planTerrain(GH.gardenHeight, GH.RELIEF_BOX, { split: 0.4 }));
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
  // ---- the rules, on layout.heightAt (the whole chain) and on the pure function
  const viaEngine = (x, z) => { const h = L.heightAt(x, z); return h > 0 ? h : null; };
  for (const [label, fn] of [['layout.heightAt', viaEngine], ['gardenHeight', GH.gardenHeight]]) {
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
    rel('the 11 ground camera poses stand at street level (relief 0 within 4 m) and no hill hides their target (the eye line clears the terrain by 0.5 m or more except in the last 3 m)', hmax === 0 && worst > 0.5, `highest pose ground ${hmax.toFixed(2)} m, tightest eye-line clearance ${worst.toFixed(2)} m at ${wp}`); }
  // ---- determinism, purity, edge cases
  { let det = 0, nonNum = 0; const f1 = GH.gardenHeight, f2 = GH.makeGardenHeight();
    for (let i = 0; i < 20000; i++) { const x = GH.RELIEF_BOX[0] + ((i * 7919) % 5803) / 10, z = GH.RELIEF_BOX[2] + ((i * 104729) % 5290) / 10, a = f1(x, z), b = f1(x, z), c = f2(x, z); if (a !== b || a !== c) det++; if (a !== null && !(typeof a === 'number' && Number.isFinite(a) && a > 0)) nonNum++; }
    rel('gardenHeight is deterministic (same bits on a second call and from a fresh makeGardenHeight()) and answers null or a finite number > 0', det === 0 && nonNum === 0, `20,000 points, ${det} differ, ${nonNum} malformed`);
    const edge = [[NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity], [undefined, undefined], [null, null], [1e9, -1e9], [-1e9, 1e9], [0, 0], [GH.RELIEF_BOX[0] - 1e-9, -1500], [GH.RELIEF_BOX[1] + 1e-9, -1500], [1200, GH.RELIEF_BOX[2] - 1e-9], [1200, GH.RELIEF_BOX[3] + 1e-9]];
    rel('gardenHeight answers null (and does not throw) for NaN, +-Infinity, undefined, null, far points and points just outside the box', edge.every(([x, z]) => { try { return f1(x, z) === null; } catch (e) { return false; } }), '');
    const src = f1.toString(); rel('the body of gardenHeight allocates nothing (no new, closure, array / object literal, spread, iterator method): text check', !/\bnew\b|=>|\.\.\.|\.map\(|\.forEach\(|\.filter\(|\.reduce\(|\bfunction\b.*\bfunction\b|\{\s*[A-Za-z]+\s*:|\[\s*[^\]\s]+\s*,[^\]]*\]\s*[;,)]/.test(src.replace(/^function gardenHeight\(x, z\)/, '')), `${src.length} chars`); }
  { const hs = fs.readFileSync(path.join(ROOT, 'src/world/landmarksTauride/height.js'), 'utf8').replace(/\/\/.*$/gm, ''), rs = fs.readFileSync(path.join(ROOT, 'src/world/landmarksTauride/data/relief.js'), 'utf8').replace(/\/\/.*$/gm, '');
    rel('height.js imports only ./data/relief.js, relief.js imports nothing, neither names three.js, layout.js, a facade, ctx, the DOM or a random source', [...hs.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]).join() === './data/relief.js' && !/^import/m.test(rs) && !/\bTHREE\b|\bthree\b|layout|facade|\bctx\b|\bdocument\b|\bwindow\b|Math\.random|Date\.now/.test(hs + rs), ''); }
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
  if (!main) { console.error(`unknown model ${args.model}`); process.exit(2); }
  say(`TAURIDE HEIGHT TEST (real Player + Physics of ${path.basename(ROOT)})${buildList.length ? ', modules built: ' + buildList.join(', ') : ''}`);
  const ex = { buildList };
  const r = await runModel(main, ex);
  out.sections.push({ role: 'main', ...r });
  if (!r.pass) failed++;
  say(`  => ${main.name.split(' (')[0]}: ${mark(r.pass)}`);
  say();
  if (buildList.includes('landmarksTauride') && ex.built) { const nb = await reliefSection(ex.built.ctx, ex.built.ph, engine); if (nb) failed++; say(`  => RELIEF (T2): ${nb ? nb + ' check(s) FAILED' : 'every check passed'}`); say(); }
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
