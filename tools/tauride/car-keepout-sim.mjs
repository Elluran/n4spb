// car-keepout-sim.mjs - the DYNAMIC proof of the garden's car keep-out (T2 fix round 2): real cars are DRIVEN at the closed ground, the footprint is measured after every step.
//   node tools/area.mjs north tools/tauride/car-keepout-sim.mjs [--quick | --full] [--no-world]      (default ~3 min: 60 m steps, 5 headings; --full 36 m, 7 headings; --quick 90 m, 3 headings)
// The static proof (tools/tauride-height-test.mjs: `createHandling().blocked` over the outline, 0 of 2,158 m) cannot see what the STEP does after the predicate has said yes. QA found two holes (round 2):
//   H1  collide(car) (a bus shelter between the lane and the fence) pushes the car's origin across the outline after the KEEP_OUT test; the push was never re-checked;
//   H2  the 'already embedded' rule (a blocked pose may move while the number of blocked footprint points does not grow) saturates at nine: a car with all nine points inside is free to roam.
// Parts: (A) synthetic worlds (a box + a half-plane, a footprint embedded in a building next to the ground, a car that starts inside) - fast, exact; (B) the REAL North (the page's modules without the
// moving ones, 35 k colliders, real streets / props / bus shelters) with the coupe, the roadster and the truck driven from points of the garden outline (every 60 m) at five headings (--full: 36 m, seven), with and without nitro, and
// the bus-stop site of the QA report (x 1300 .. 1450 at the south edge, headings 20 .. 50 deg) as a grid. The proof can fail: the SAME scenarios are run against handling.js with one guard cut out
// (an in-memory copy loaded through a data: URL; the cut is asserted to have found its text) and must breach: M1 = without the undo of the push, M2 = without the keep-out term of the embedded rule.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const args = process.argv.slice(2), QUICK = args.includes('--quick'), FULL = args.includes('--full'), NO_WORLD = args.includes('--no-world');
let failed = 0, total = 0;
const ok = (name, cond, detail = '') => { total++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };

const AT = await imp('src/world/lib/area-tables.js');
const { Physics } = await imp('src/core/physics.js');
const { tuningFor, MASS } = await imp('src/world/drive/cars/tuning.js');
const { createHandling: realHandling } = await imp('src/world/drive/handling.js');
const { GARDEN_RING, inGarden } = await imp('src/areas/north/hooks/people.js');
const DEG = Math.PI / 180;

/** handling.js with one guard cut out, loaded from memory: the relative imports are made absolute, the cut must find its text */
const SRC = fs.readFileSync(path.join(ROOT, 'src/world/drive/handling.js'), 'utf8');
const CUTS = {
  M1: ['the undo of the contact push', /\n[ \t]*if \(KEEP_OUT && \(car\.x !== kx \|\| car\.z !== kz\) && keepPoints\(car\.x, car\.z, sy, cy\) > keepPoints\(kx, kz, sy, cy\)\) \{ car\.x = kx; car\.z = kz; \}/],
  M2: ['the keep-out term of the embedded rule', / && \(!KEEP_OUT \|\| keepPoints\(x, z, sy, cy\) <= keepHere\)/],
};
const mutants = {};
async function mutantHandling(key) {
  if (mutants[key]) return mutants[key];
  const [what, re] = CUTS[key];
  if (!re.test(SRC)) throw new Error(`mutant ${key}: the text of ${what} was not found in src/world/drive/handling.js (the test must be updated with the guard)`);
  let text = SRC.replace(re, '');
  text = text.replace(/from '(\.{1,2}\/[^']+)'/g, (m, rel) => `from '${pathToFileURL(path.join(ROOT, 'src/world/drive', rel)).href}'`);
  const mod = await import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
  return (mutants[key] = mod.createHandling);
}

/** nine footprint points inside the keep-out (the footprint of handling.js: centre + the eight points of tuning hf / hr / hw) */
function keepCount(car, KO) {
  const T = car.tuning, sy = Math.sin(car.yaw), cy = Math.cos(car.yaw);
  let n = KO(car.x, car.z) ? 1 : 0;
  for (const [a, b] of [[T.hf, T.hw], [T.hf, -T.hw], [-T.hr, T.hw], [-T.hr, -T.hw], [0, T.hw], [0, -T.hw], [T.hf, 0], [-T.hr, 0]]) if (KO(car.x + sy * a + cy * b, car.z + cy * a - sy * b)) n++;
  return n;
}
const withHook = (KO, fn) => { const keep = AT.HOOKS.carKeepOut; AT.HOOKS.carKeepOut = KO; try { return fn(); } finally { if (keep === undefined) delete AT.HOOKS.carKeepOut; else AT.HOOKS.carKeepOut = keep; } };

// ============================================================================================ (A) synthetic worlds
const FLAT = (extra = {}) => ({ physics: new Physics(() => 0), L: { WORLD: { rects: [] }, inPlay: () => true, inExtent: () => true, heightAt: () => 0, insideBuilding: () => false, ...extra }, services: {} });
/** drive `secs` seconds with the given input; returns the worst keep-out count and the final pose */
function drive(car, KO, secs, inp, hook) {
  let worst = 0, k0 = null;
  for (let i = 0; i < secs * 60; i++) { car.step(1 / 60, inp); const k = keepCount(car, KO); if (k > worst) worst = k; if (k0 === null) k0 = k; if (hook) hook(i, car); }
  return { worst, x: car.x, z: car.z, speed: car.speed };
}
const THR = { thr: 1, brk: 0, steer: 0, hand: false, nitro: false };

/** A1: a box between the lane and the closed ground (half-plane z > 0): the car brushes past its flank and the contact pushes it toward the ground */
async function scenarioPush(factory) {
  return withHook((x, z) => z > 0, () => {
    let runs = 0, breaches = 0, deepest = 0;
    for (let lat = -2.3; lat <= -1.15; lat += 0.1) for (let yawOff = -40; yawOff <= 40; yawOff += 8) for (const tune of [null, 'roadster', 'truck']) {
      const w = FLAT(); w.physics.addBox(12, -1.95, 5, 2.3, 0, 0, 3);       // x 9.5 .. 14.5, z -3.1 .. -0.8 : its +z face is 0.8 m short of the ground
      const spec = tune === 'roadster' ? { W: 2.00, R: 0.355, wb: 2.96, front: 2.36, rear: -2.26, hgt: 1.22, len: 4.62, centerZ: 0.05, mass: MASS.roadster } : { W: 2.03, R: 0.43, wb: 3.80, front: 2.63, rear: -3.05, hgt: 1.80, len: 5.68, centerZ: -0.21, mass: MASS.truck };
      const car = factory(w, tune ? tuningFor(tune, spec) : null);
      const KO = (x, z) => z > 0;
      car.reset(-4, lat, (90 + yawOff) * DEG);      // yaw 90 faces +x
      if (keepCount(car, KO) > 0) continue;
      runs++; const r = drive(car, KO, 4, THR); if (r.worst > 0) breaches++; deepest = Math.max(deepest, r.worst);
    }
    return { runs, breaches, deepest };
  });
}
/** A2: a footprint embedded in a building that touches the closed ground (the building z < 0, the ground z > 0): the old rule let it drive through */
async function scenarioEmbedded(factory) {
  return withHook((x, z) => z > 0, () => {
    let runs = 0, breaches = 0;
    for (let x0 = -6; x0 <= 6; x0 += 3) for (let yawOff = -30; yawOff <= 30; yawOff += 15) {
      const w = FLAT({ insideBuilding: (x, z) => x > -40 && x < 40 && z > -60 && z < 0 });
      const car = factory(w, null); const KO = (x, z) => z > 0;
      car.reset(x0, -20, yawOff * DEG);             // yaw 0 faces +z: toward the ground, nine points in the building
      runs++; const r = drive(car, KO, 6, THR); if (r.worst > 0) breaches++;
    }
    return { runs, breaches };
  });
}
const rows = [];
{
  const a = await scenarioPush(realHandling);
  ok('A1 push: a car brushing past a box between the lane and the closed ground is never carried into it (coupe, roadster, truck)', a.runs >= 150 && a.breaches === 0, `${a.runs} runs, ${a.breaches} breaches`);
  const m = await scenarioPush(await mutantHandling('M1'));
  ok('A1 mutant M1 (no undo of the contact push) breaches the same scenario (the proof can fail)', m.breaches >= 5, `${m.runs} runs, ${m.breaches} breaches, ${m.deepest} of 9 footprint points in the ground at worst`);
  const e = await scenarioEmbedded(realHandling);
  ok('A2 embedded: a footprint embedded in a building that touches the closed ground cannot drive into it', e.runs >= 20 && e.breaches === 0, `${e.runs} runs, ${e.breaches} breaches`);
  const m2 = await scenarioEmbedded(await mutantHandling('M2'));
  ok('A2 mutant M2 (no keep-out term in the embedded rule) breaches the same scenario (the proof can fail)', m2.breaches >= 10, `${m2.runs} runs, ${m2.breaches} breaches`);
  // a car that starts INSIDE the closed ground (a teleport, a test) must be able to drive out, and must not drive back in
  const out = withHook((x, z) => z > 0, () => {
    const KO = (x, z) => z > 0; let escaped = 0, runs = 0, reentered = 0;
    for (let d = 0.3; d <= 8; d += 0.7) for (const yawOff of [0, 25, -25, 50, -50]) {
      const car = realHandling(FLAT(), null); car.reset(0, d, (180 + yawOff) * DEG);      // yaw 180 faces -z: out of the ground, turned up to 50 deg
      runs++; let left = false, back = false;
      for (let i = 0; i < 8 * 60; i++) { car.step(1 / 60, i < 5 * 60 ? THR : { thr: 0, brk: 0, steer: 0, hand: false, nitro: false }); const k = keepCount(car, KO); if (k === 0) left = true; else if (left) back = true; }
      if (left) escaped++; if (back) reentered++;
    }
    return { runs, escaped, reentered };
  });
  ok('A3 a car that starts inside the closed ground (the first 8 m) can drive out of it and does not drive back in', out.escaped === out.runs && out.reentered === 0, `${out.runs} runs, ${out.escaped} left, ${out.reentered} re-entered`);
}

// ============================================================================================ (B) the real North
if (!NO_WORLD) {
  const SE = await imp('tools/tauride/lib/stub-env.mjs');
  const { mainModules } = await imp('tools/modules-list.mjs');
  const eng = await SE.loadEngine(ROOT);
  const all = mainModules('north'), names = all.filter((n) => !['people', 'wildlife', 'drive'].includes(n));
  const { ctx } = SE.makeContext(eng, all);
  const t0 = Date.now(); await SE.buildModules(eng, ctx, names);
  console.log(`built ${names.length} modules (${names.join(', ')}) in ${Date.now() - t0} ms: ${ctx.physics.count} colliders`);
  const KO = AT.HOOKS.carKeepOut;
  ok('the page publishes the car keep-out hook (the North list has landmarksTauride)', typeof KO === 'function');
  const SPECS = { roadster: { W: 2.00, R: 0.355, wb: 2.96, front: 2.36, rear: -2.26, hgt: 1.22, len: 4.62, centerZ: 0.05, mass: MASS.roadster }, truck: { W: 2.03, R: 0.43, wb: 3.80, front: 2.63, rear: -3.05, hgt: 1.80, len: 5.68, centerZ: -0.21, mass: MASS.truck } };
  const world = { L: eng.L, physics: ctx.physics, services: ctx.services };
  const make = (factory, kind) => factory(world, kind === 'coupe' ? null : tuningFor(kind, SPECS[kind]));

  // outline sample points with an outward normal
  const R = GARDEN_RING, pts = [];
  { const step = QUICK ? 90 : FULL ? 36 : 60, n = R.length / 2; let carry = 0;      // GARDEN_RING is flat: [x, z, x, z, ...]
    for (let i = 0; i < n; i++) { const a = [R[2 * i], R[2 * i + 1]], b = [R[2 * ((i + 1) % n)], R[2 * ((i + 1) % n) + 1]], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!(l > 0)) continue;
      let s = carry; for (; s < l; s += step) { const t = s / l, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l, o = inGarden(x + nx * 0.6, z + nz * 0.6) ? -1 : 1; pts.push({ x, z, nx: nx * o, nz: nz * o }); }
      carry = s - l; } }
  const OFFS = QUICK ? [-60, 0, 60] : FULL ? [-75, -60, -30, 0, 30, 60, 75] : [-75, -45, 0, 45, 75];
  function sweepOutline(factory) {
    let runs = 0, skipped = 0, breaches = 0, deepest = 0, firstBad = null;
    for (const kind of ['coupe', 'roadster', 'truck']) for (const p of pts) for (const off of OFFS) for (const nitro of [true, false]) {
      // the car starts 14 m out on the normal turned by `off`, facing the point; headings are measured from the inward normal
      const ang = Math.atan2(p.nx, p.nz) + off * DEG, sx = p.x + Math.sin(ang) * 14, sz = p.z + Math.cos(ang) * 14, yaw = Math.atan2(p.x - sx, p.z - sz);
      const car = make(factory, kind); car.reset(sx, sz, yaw);
      if (car.blocked(sx, sz) || keepCount(car, KO) > 0) { skipped++; continue; }
      runs++; let worst = 0;
      for (let k = 0; k < 8 * 60; k++) { car.step(1 / 60, { thr: 1, brk: 0, steer: 0, hand: false, nitro: nitro && k > 120 }); const c = keepCount(car, KO); if (c > worst) worst = c; }
      if (worst > 0) { breaches++; if (!firstBad) firstBad = `${kind} (${sx.toFixed(0)},${sz.toFixed(0)}) off ${off} nitro ${nitro}`; }
      deepest = Math.max(deepest, worst);
    }
    return { runs, skipped, breaches, deepest, firstBad };
  }
  /** the QA site: the south edge by the bus stop, x 1300 .. 1450, heading 20 .. 50 deg off the edge, from 14 m out */
  function sweepSite(factory) {
    let runs = 0, breaches = 0, deepest = 0;
    for (const X of [1300, 1340, 1360, 1380, 1388, 1392, 1397, 1400, 1405, 1420, 1450]) for (const A of [20, 30, 36, 42, 50]) for (const nitro of [true, false]) {
      let zb = null; for (let z = -1240; z >= -1300; z -= 0.25) if (KO(X, z)) { zb = z; break; }
      if (zb === null) continue;
      const car = make(factory, 'coupe'); car.reset(X + Math.sin(A * DEG) * 14, zb + Math.cos(A * DEG) * 14, Math.PI + A * DEG);
      runs++; let worst = 0;
      for (let k = 0; k < 8 * 60; k++) { car.step(1 / 60, { thr: 1, brk: 0, steer: 0, hand: false, nitro: nitro && k > 120 }); const c = keepCount(car, KO); if (c > worst) worst = c; }
      if (worst > 0) breaches++; deepest = Math.max(deepest, worst);
    }
    return { runs, breaches, deepest };
  }
  const ts = Date.now();
  const site = sweepSite(realHandling), siteM1 = sweepSite(await mutantHandling('M1'));
  ok('B1 the bus-stop site of the QA report (x 1300 .. 1450, 20 .. 50 deg, plain and nitro): no run puts a footprint point in the garden', site.runs >= 100 && site.breaches === 0, `${site.runs} runs, ${site.breaches} breaches`);
  ok('B1 mutant M1 (no undo of the contact push) breaches the same site (QA: 31 of 110 here; the proof can fail)', siteM1.breaches >= 10, `${siteM1.runs} runs, ${siteM1.breaches} breaches, ${siteM1.deepest} of 9 points at worst`);
  const full = await sweepOutline(realHandling);
  ok(`B2 the whole outline (${pts.length} points x ${OFFS.length} headings x nitro / plain x 3 cars, 8 s each): no run puts a footprint point in the garden`, full.runs >= (QUICK ? 100 : FULL ? 800 : 400) && full.breaches === 0, `${full.runs} runs (${full.skipped} starts skipped as blocked), ${full.breaches} breaches${full.firstBad ? ', first ' + full.firstBad : ''}`);
  const fullM1 = await sweepOutline(await mutantHandling('M1'));
  ok('B2 mutant M1 breaches somewhere on the outline (the proof can fail)', fullM1.breaches >= 3, `${fullM1.runs} runs, ${fullM1.breaches} breaches`);
  // the hook gone: the same drives enter the ground freely (the scenarios do cross the line)
  const noHook = withHook(undefined, () => { let enter = 0, runs = 0; for (const p of pts) { const ang = Math.atan2(p.nx, p.nz), sx = p.x + Math.sin(ang) * 14, sz = p.z + Math.cos(ang) * 14; const car = make(realHandling, 'coupe'); car.reset(sx, sz, Math.atan2(p.x - sx, p.z - sz)); if (car.blocked(sx, sz)) continue; runs++; let c = 0; for (let k = 0; k < 8 * 60; k++) { car.step(1 / 60, THR); c = Math.max(c, keepCount(car, KO)); } if (c > 0) enter++; } return { runs, enter }; });
  ok('B3 without the hook the head-on drives enter the garden (the scenarios cross the outline)', noHook.runs >= 10 && noHook.enter >= noHook.runs * 0.4, `${noHook.enter} of ${noHook.runs} enter`);
  console.log(`(part B ${((Date.now() - ts) / 1000).toFixed(0)} s)`);
}
console.log(failed ? `RESULT: FAIL (${failed} of ${total} checks)` : `RESULT: OK (${total} checks)`);
process.exit(failed ? 1 : 0);
