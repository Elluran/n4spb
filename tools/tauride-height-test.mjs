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
// Exit 0 = every expectation met (the main model passes, the self-check models behave as declared, the old trap reproduces).
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
async function evaluate(model, { engine, world, wet, ring, bounds = BOUNDS, label, assertCars, assertLanding, route: doRoute = true }) {
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
  const carBlocked = model.carBlocked || ((x, z) => model.heightAt(x, z) < -1 || engine.L.insideBuilding(x, z));
  const cb = carBreach(S, carBlocked); res.cars = cb;
  const carsOk = cb.breachM === 0;
  say(`  cars   : ${cb.breachM} m of the ${cb.perimeterM} m garden outline can be driven across (${cb.stretches.length} stretches)  -> ${assertCars ? mark(carsOk) : 'not asserted (the engine of today has no keep-out; --assert-cars to require it)'}`);
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
  return evaluate(model, { engine, world, wet: (x, z) => inPolys(x, z, S.U), ring: S.U[0].o, assertCars: !!args['assert-cars'], assertLanding: !!args['assert-landing'], route: !args['no-route'], ...extra });
}

// ---------------------------------------------------------------- which runs
const models = onlySource ? {} : builtinModels(S, engine.L);
for (const m of Object.values(models)) m.wadeDepth = WADE;
let main = null;
if (!onlySource) {
  const buildList = args.build ? String(args.build).split(',') : [];
  if (args.model && !models[args.model]) {
    const mod = await import(pathToFileURL(path.resolve(ROOT, args.model)).href);
    main = { ...(mod.model || mod.default), wadeDepth: (mod.model || mod.default).wadeDepth ?? WADE };
  } else main = models[args.model || 'north'];
  if (!main) { console.error(`unknown model ${args.model}`); process.exit(2); }
  say(`TAURIDE HEIGHT TEST (real Player + Physics of ${path.basename(ROOT)})${buildList.length ? ', modules built: ' + buildList.join(', ') : ''}`);
  const r = await runModel(main, { buildList });
  out.sections.push({ role: 'main', ...r });
  if (!r.pass) failed++;
  say(`  => ${main.name.split(' (')[0]}: ${mark(r.pass)}`);
  say();
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
