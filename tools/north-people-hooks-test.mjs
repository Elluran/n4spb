// CPU test of the PEOPLE hook of the North (docs/AREAS.md section 9, milestone M6 cluster C): the Tauride Garden crowd cap (people.js DENSITY.garden, people/nav.js inGarden / densityFactor, people/sim.js
// crowdedAt / recycle / recount, area.js ZONES.peopleDensity.garden, hooks/people.js inGarden) and the deck services of the pedestrians (people/nav.js surfaceY, HOOKS.deckServices).
//   node tools/north-people-hooks-test.mjs            the fast checks (~1 s; run it plain, not through tools/area.mjs: it imports the strip's and the North's area modules itself)
//   node tools/north-people-hooks-test.mjs --scene [--minutes 3]    + the crowd cap in a real North scene (environment, streets, city, people; one build, then four simulations side by side, ~1 minute)
// What it proves:
//   * hooks/people.js: the embedded ring equals the record r1582734 of the North facade GREEN vertex for vertex (one ring, no holes: there is nothing to probe on a hole), is the outline of the source's
//     TAURIDE_GARDEN within the simplification of the data cut (when the source repository is at PITER_SRC / D:/git2/agi-fun-tests/102_3d_piter), inGarden agrees with an independent winding-number test on a
//     grid and on fixed probes inside / outside / outside the bbox, and rejects NaN;
//   * the area module: the cap row ZONES.peopleDensity.garden { factor 0.22, maxPeople 60 } is in the North's tables, NOT gated by MODULES (integration decision, docs/AREAS.md section 9.1: the cap is
//     active in the generic North, with or without 'landmarksTauride'), HOOKS.inGarden is the function; the strip exports no hook and no row; the three engine files read the hooks through
//     lib/area-tables.js only;
//   * --scene (the density cap logic on the real North nav: crowdedAt / recycle / recount are closures of createSim, a synthetic nav would need ~60 fields): ONE scene is built, with the row the North has
//     today { factor 0.22, maxPeople 60 }, and people.build is run three more times in it with the NEUTRAL row (no factor, no cap: what the North had before M6), with the head cap alone and with the density
//     factor alone; nav.densityFactor is 0.22 inside the garden and 1 outside, 1 everywhere with the neutral row; with the camera in the middle of the garden all four simulations are stepped for N minutes
//     (the camera jump makes every walker re-placed around it) and the number of visible people inside the garden is counted every second: the neutral one fills it (~400), the row holds it near the cap
//     (soft: walkers who come in along a route and the scripted ones are not refused, ~75 against 60) and each half works alone; nav.surfaceY asks the services of HOOKS.deckServices first (+0.12), skips a
//     service that is not built, has no deckY or answers null / NaN.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = (rel) => pathToFileURL(path.join(root, rel)).href;
const args = process.argv.slice(2);
const flagVal = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const CAP = { factor: 0.22, maxPeople: 60 };               // the numbers of area.js ZONES.peopleDensity.garden (the source's DENSITY.tauride)
const SOURCE_REPO = process.env.PITER_SRC || 'D:/git2/agi-fun-tests/102_3d_piter';

/** a point-in-polygon test written differently from the one under test (winding number, not even-odd crossings); holes: none in this data */
const windingHas = (o, x, z) => {
  let w = 0;
  for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
    const x0 = o[j], z0 = o[j + 1], x1 = o[i], z1 = o[i + 1], cr = (x1 - x0) * (z - z0) - (x - x0) * (z1 - z0);
    if (z0 <= z) { if (z1 > z && cr > 0) w++; } else if (z1 <= z && cr < 0) w--;
  }
  return w !== 0;
};
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const ringDist = (o, x, z) => { let d = 1e9; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) d = Math.min(d, segDist(x, z, o[j], o[j + 1], o[i], o[i + 1])); return d; };
const shoelace = (o) => { let s = 0; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) s += o[j] * o[i + 1] - o[i] * o[j + 1]; return s / 2; };

/** the fixed probes: [x, z, expected] */
const PROBES = [
  [1226, -1290, true], [1226, -1268.5, true], [1200, -1500, true], [1150, -1450, true], [1400, -1500, true], [1000, -1400, true], [1120, -1780, true], [960, -1450, true], [920, -1300, true], [1227.4, -1454.8, true],
  [1226, -1266, false], [1100, -1650, false], [1000, -1700, false], [1300, -1700, false], [1400, -1700, false], [1250, -1740, false], [1050, -1560, false], [1000, -1500, false], [915.5, -1300, false], [1497, -1500, false],       // in the bbox, outside the ring
  [900, -1500, false], [1226, -1240, false], [1510, -1400, false], [1226, -1810, false], [0, 0, false], [NaN, NaN, false], [1200, NaN, false],       // outside the bbox
];

let fails = 0, passes = 0;
/** run one check; a failure is printed and counted */
const check = async (name, fn) => {
  try { const detail = await fn(); passes++; console.log('  ok   ' + name + (detail ? '  ' + detail : '')); }
  catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 8).join('\n       ')); }
};

// ------------------------------------------------------------------ the fast checks
async function fast() {
  const { inGarden, GARDEN_RING } = await import(url('src/areas/north/hooks/people.js'));
  const F = await import(url('src/areas/north/data/city.js'));
  const rec = F.GREEN.filter((g) => g.id === 'r1582734');

  await check('the facade record r1582734 is ONE park polygon without holes', () => {
    assert.equal(rec.length, 1, 'records of r1582734: ' + rec.length);
    assert.equal(rec[0].kind, 'park'); assert.equal(rec[0].polys.length, 1);
    assert.equal((rec[0].polys[0].h || []).length, 0, 'the record has holes: hooks/people.js inGarden does not subtract them');
  });
  await check('the embedded ring equals the facade ring, vertex for vertex', () => {
    assert.deepEqual(GARDEN_RING, rec[0].polys[0].o);
    return GARDEN_RING.length / 2 + ' vertices';
  });
  await check('the embedded ring is the outline of the source TAURIDE_GARDEN (the data cut simplified it)', async () => {
    const file = path.join(SOURCE_REPO, 'src/world/landmarksTauride/terrain.js');
    if (!fs.existsSync(file)) return 'SKIPPED (the source repository is not at ' + SOURCE_REPO + ', set PITER_SRC)';
    const { TAURIDE_GARDEN } = await import(pathToFileURL(file).href);
    assert.equal(TAURIDE_GARDEN.length, 1); assert.equal(TAURIDE_GARDEN[0].h.length, 0);
    const b = TAURIDE_GARDEN[0].o, a = GARDEN_RING, known = new Set(); for (let i = 0; i < a.length; i += 2) known.add(a[i] + ',' + a[i + 1]);
    for (let i = 0; i < a.length; i += 2) assert.ok(ringDist(b, a[i], a[i + 1]) < 1e-9, 'a facade vertex is not on the source ring: ' + a[i] + ',' + a[i + 1]);
    let far = 0, dropped = 0; for (let i = 0; i < b.length - 2; i += 2) if (!known.has(b[i] + ',' + b[i + 1])) { dropped++; far = Math.max(far, ringDist(a, b[i], b[i + 1])); }
    assert.ok(far < 0.5, 'a source vertex lies ' + far.toFixed(2) + ' m from the facade ring');
    const areaA = Math.abs(shoelace(a)), areaB = Math.abs(shoelace(b));
    let n = 0, differ = 0; for (let x = 900; x <= 1510; x += 0.5) for (let z = -1800; z <= -1250; z += 0.5) { n++; if (windingHas(a, x, z) !== windingHas(b, x, z)) differ++; }
    assert.ok(Math.abs(areaA - areaB) / areaB < 2e-4, 'areas ' + areaA.toFixed(1) + ' / ' + areaB.toFixed(1));
    assert.ok(differ / n < 2e-4, differ + ' of ' + n + ' probes differ');
    return `${dropped} source vertices are not in the facade ring (all within ${far.toFixed(2)} m of it), areas ${areaA.toFixed(0)} / ${areaB.toFixed(0)} m2, ${differ} of ${n} probes of a 0.5 m grid differ`;
  });
  await check('inGarden on the fixed probes (inside, in the bbox but outside, outside the bbox, NaN)', () => {
    for (const [x, z, want] of PROBES) assert.equal(inGarden(x, z), want, `inGarden(${x}, ${z})`);
    return PROBES.length + ' probes';
  });
  await check('inGarden equals an independent winding-number test on a 2.3 m grid (no point within 1 mm of the ring)', () => {
    let n = 0, inside = 0, skipped = 0;
    for (let x = 890; x <= 1520; x += 2.3) for (let z = -1820; z <= -1240; z += 2.3) {
      if (ringDist(GARDEN_RING, x, z) < 1e-3) { skipped++; continue; }
      const want = windingHas(GARDEN_RING, x, z) && x > 915 && x < 1500 && z > -1800 && z < -1250; n++; if (want) inside++;
      assert.equal(inGarden(x, z), want, `inGarden(${x.toFixed(2)}, ${z.toFixed(2)})`);
    }
    assert.ok(inside > 30000 && inside < n, 'the grid has no inside points: ' + inside + ' of ' + n);
    return `${n} points, ${inside} inside (${(inside * 2.3 * 2.3).toFixed(0)} m2)`;
  });
  await check('every vertex of the ring is within the bbox of inGarden (the bbox cuts nothing of the garden)', () => {
    for (let i = 0; i < GARDEN_RING.length; i += 2) assert.ok(GARDEN_RING[i] > 915 && GARDEN_RING[i] < 1500 && GARDEN_RING[i + 1] > -1800 && GARDEN_RING[i + 1] < -1250, 'vertex ' + i / 2);
  });

  // ---- the area modules
  const N = await import(url('src/areas/north/area.js'));
  const S = await import(url('src/world/area.js'));
  await check('the strip: no hook, no cap row (the engine does what it did)', () => {
    assert.equal(S.ID, 'strip', 'run this test plain (not through tools/area.mjs): src/world/area.js is remapped to ' + S.ID);
    assert.deepEqual(S.HOOKS, {}); assert.equal(S.ZONES.peopleDensity.garden, undefined);
  });
  await check('the North today: the cap row is { factor 0.22, maxPeople 60 } although no landmarksTauride is built; HOOKS.inGarden is the hooks/people.js function', () => {
    assert.ok(!N.MODULES.includes('landmarksTauride'), 'landmarksTauride is in MODULES: the Tauride remake has landed, this check is about the generic North (the next one covers the listed case)');
    assert.deepEqual(N.ZONES.peopleDensity.garden, CAP);
    assert.equal(N.HOOKS.inGarden, inGarden); assert.deepEqual([...N.HOOKS.deckServices], ['landmarksTauride']);
  });
  await check("the North with 'landmarksTauride' in MODULES: the cap row stays { factor 0.22, maxPeople 60 } (a copy of area.js with the module listed, imports made absolute)", async () => {
    const file = path.join(root, 'src/areas/north/area.js'), dir = path.dirname(file);
    let src = fs.readFileSync(file, 'utf8').replace(/from '(\.\.?\/[^']+)'/g, (m, p) => `from '${pathToFileURL(path.resolve(dir, p)).href}'`);
    const listed = src.replace(/(export const MODULES = \[\s*'environment',)/, "$1 'landmarksTauride',"); assert.notEqual(listed, src, 'MODULES has changed its shape: adapt this check');
    const tmp = path.join(os.tmpdir(), `north-area-tauride-${process.pid}.mjs`); fs.writeFileSync(tmp, listed);
    try {
      const T = await import(pathToFileURL(tmp).href);
      assert.ok(T.MODULES.includes('landmarksTauride')); assert.deepEqual(T.ZONES.peopleDensity.garden, CAP);
      assert.equal(T.HOOKS.inGarden, inGarden);
      assert.deepEqual(T.ZONES.peopleDensity.west, N.ZONES.peopleDensity.west); assert.deepEqual(T.ZONES.peopleDensity.mars, N.ZONES.peopleDensity.mars);
    } finally { fs.rmSync(tmp, { force: true }); }
  });
  await check('the engine files read the hooks through lib/area-tables.js only', () => {
    for (const f of ['src/world/people.js', 'src/world/people/nav.js', 'src/world/people/sim.js']) {
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      for (const m of src.matchAll(/from '(\.[^']*)'/g)) {
        const target = path.resolve(path.dirname(path.join(root, f)), m[1]).split(path.sep).join('/');
        assert.ok(!target.endsWith('/src/world/area.js') && !target.includes('/src/areas/'), f + ' imports ' + m[1]);       // (people/area.js, the castle surfaces, is another file)
      }
    }
    assert.match(fs.readFileSync(path.join(root, 'src/world/people/nav.js'), 'utf8'), /import \{ HOOKS \} from '\.\.\/lib\/area-tables\.js'/);
  });
}

// ------------------------------------------------------------------ the scene part (a child: people-test.mjs builds the North and hands the context to the default export below)
function sceneParent() {
  const minutes = flagVal('minutes', '3'), out = path.join(os.tmpdir(), `north-people-scene-${process.pid}.json`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, ['tools/area.mjs', 'north', 'tools/people-test.mjs', '--mods', 'environment,streets,city,people', '--eval', 'tools/north-people-hooks-test.mjs', '--minutes', minutes],
    { cwd: root, encoding: 'utf8', maxBuffer: 256 << 20, env: { ...process.env, NPH_OUT: out, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=8000' } });
  let res = null; try { res = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* the child died before it wrote */ } finally { fs.rmSync(out, { force: true }); }
  if (!res) { fails++; console.log('  FAIL the scene child wrote no result (exit ' + r.status + ')\n' + String(r.stdout).slice(-1500) + String(r.stderr).slice(-1500)); return; }
  for (const c of res.checks) { if (c.ok) passes++; else fails++; console.log((c.ok ? '  ok   ' : '  FAIL ') + c.name + (c.detail ? '\n       ' + c.detail : '')); }
  console.log(`  (scene: ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

/** The eval hook of tools/people-test.mjs: ctx holds the North (environment, streets, city, people: the people of the cap row, which is what the North has today). */
export default async function scene(ctx, L, THREE) {
  const minutes = Number(flagVal('minutes', '3')) || 3, checks = [];
  const note = (name, ok, detail = '') => { checks.push({ name, ok, detail }); console.log('[scene] ' + (ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : '')); };
  const run = (name, fn) => { try { const d = fn(); note(name, true, d || ''); } catch (e) { note(name, false, String(e.message).split('\n').slice(0, 5).join(' | ')); } };
  try {
    const { inGarden, GARDEN_RING } = await import(url('src/areas/north/hooks/people.js'));
    const people = await import(url('src/world/people.js'));
    const A = ctx.services.people;                                         // built by people-test with people.js DENSITY.garden of the North today (the cap row of area.js)
    const today = people.DENSITY.garden;
    run('the North today builds its people with the cap row of area.js', () => { assert.deepEqual({ factor: today.factor, maxPeople: today.maxPeople }, CAP); assert.equal(A.sim.nav.gardenCfg, today); });
    // more populations in the same scene (the earlier ones keep running, all see the same camera): the NEUTRAL row (what the North had before M6: no factor, no cap), and each half of the row alone
    const ROWS = { neutral: { factor: 1, maxPeople: Infinity }, capOnly: { factor: 1, maxPeople: CAP.maxPeople }, factorOnly: { factor: CAP.factor, maxPeople: Infinity } }, pops = { row: A };
    for (const [name, row] of Object.entries(ROWS)) { people.DENSITY.garden = row; await people.build(ctx); pops[name] = ctx.services.people; }
    people.DENSITY.garden = today; ctx.services.people = A;
    const B = A, NEU = pops.neutral;
    run('the other builds got their rows', () => {
      assert.equal(new Set(Object.values(pops)).size, 4);
      for (const [name, row] of Object.entries(ROWS)) assert.deepEqual({ factor: pops[name].sim.nav.gardenCfg.factor, maxPeople: pops[name].sim.nav.gardenCfg.maxPeople }, row, name);
    });

    // ---- nav.densityFactor / zoneW on a 9 m grid
    run('nav.densityFactor: 0.22 inside the garden and 1 outside with the row, 1 everywhere with the neutral one; zoneW follows', () => {
      const nA = NEU.sim.nav, nB = B.sim.nav; let inside = 0, n = 0;
      for (let x = 900; x <= 1520; x += 9) for (let z = -1810; z <= -1240; z += 9) {
        const g = inGarden(x, z); n++; if (g) inside++;
        assert.equal(nA.densityFactor(x, z), 1, `neutral (${x}, ${z})`);
        assert.equal(nB.densityFactor(x, z), g ? CAP.factor : 1, `row (${x}, ${z})`);
        assert.ok(Math.abs(nB.zoneW(x, z) - nA.zoneW(x, z) * (g ? CAP.factor : 1)) < 1e-9, `zoneW (${x}, ${z})`);
        assert.equal(nB.inGarden(x, z), g);
      }
      return `${n} points, ${inside} inside`;
    });
    run('nav.stationFactor is untouched by the garden (the North has no station zone: 1)', () => { assert.equal(B.sim.nav.stationFactor(1226, -1400), 1); assert.equal(B.sim.nav.stationCfg.factor, 1); });

    // ---- nav.surfaceY and the deck services of the area
    run('nav.surfaceY asks HOOKS.deckServices first (+0.12), skips an absent service / one without deckY / null / NaN', () => {
      const nav = B.sim.nav, P = [[1005, -1300], [1020, -1300], [1226, -1290], [700, -700]];
      const base = P.map(([x, z]) => nav.surfaceY(x, z, 0.12));
      assert.ok(base.every(Number.isFinite));
      const svc = ctx.services; assert.equal(svc.landmarksTauride, undefined);
      try {
        svc.landmarksTauride = { deckY: (x, z) => (x > 1000 && x < 1010 ? 3.3 : null) };
        assert.ok(Math.abs(nav.surfaceY(1005, -1300, 0.12) - 3.42) < 1e-9, 'on the deck: ' + nav.surfaceY(1005, -1300, 0.12));
        for (const k of [1, 2, 3]) assert.equal(nav.surfaceY(...P[k], 0.12), base[k], 'off the deck ' + k);
        svc.landmarksTauride = {}; for (const k of [0, 1, 2, 3]) assert.equal(nav.surfaceY(...P[k], 0.12), base[k], 'no deckY ' + k);
        svc.landmarksTauride = { deckY: () => NaN }; for (const k of [0, 1, 2, 3]) assert.equal(nav.surfaceY(...P[k], 0.12), base[k], 'NaN ' + k);
        svc.landmarksTauride = { deckY: () => null }; for (const k of [0, 1, 2, 3]) assert.equal(nav.surfaceY(...P[k], 0.12), base[k], 'null ' + k);
        svc.landmarksTauride = { deckY: () => 0 }; assert.ok(Math.abs(nav.surfaceY(1005, -1300, 0.5) - 0.12) < 1e-9, 'a deck at 0 m answers 0.12 (0 is not "no deck")');
      } finally { delete svc.landmarksTauride; }
      assert.equal(nav.surfaceY(1005, -1300, 0.12), base[0], 'the service is gone');
    });

    // ---- the cap in a simulation: the camera in the middle of the garden, so that every walker is re-placed round it (sim.mass) and the garden is the busiest place of the scene
    const cx = 1227, cz = -1455, cam = ctx.camera, dt = 0.1, steps = Math.round(minutes * 60 / dt), warm = 30, names = Object.keys(pops);
    const count = (P) => { let n = 0; for (const a of P.sim.agents) if (!a.hidden && inGarden(a.x, a.z)) n++; return n; };
    const series = Object.fromEntries(names.map((k) => [k, []]));
    for (let i = 1; i <= steps; i++) {
      const t = i * dt; ctx.time = t; ctx.shared.uTime.value = t;
      ctx.player.position.set(cx, 0, cz); cam.position.set(cx, 1.7, cz); cam.updateMatrixWorld(true);
      for (const f of ctx._updates) f(dt, t);
      if (i % 10 === 0 && t >= warm) for (const k of names) series[k].push(count(pops[k]));
    }
    const mean = (v) => v.reduce((p, q) => p + q, 0) / Math.max(1, v.length), max = (v) => Math.max(0, ...v), vis = (P) => P.sim.agents.filter((a) => !a.hidden).length;
    const m = Object.fromEntries(names.map((k) => [k, mean(series[k])])), mx = Object.fromEntries(names.map((k) => [k, max(series[k])]));
    const stat = names.map((k) => `${k}: mean ${m[k].toFixed(1)} max ${mx[k]}`).join(' | ') + ` (${series.neutral.length} samples after ${warm} s of ${minutes} min; visible people ${names.map((k) => vis(pops[k])).join(' / ')})`;
    run('the neutral population fills the garden far beyond the cap (the scene stresses it)', () => { assert.ok(mx.neutral > CAP.maxPeople * 3, 'max ' + mx.neutral); return stat; });
    run('the row holds the garden near the cap (soft: walkers who come in along a route and the scripted ones are not refused) and thins it', () => {
      assert.ok(m.row <= CAP.maxPeople * 1.5, 'mean ' + m.row.toFixed(1) + ' > ' + CAP.maxPeople * 1.5);
      assert.ok(mx.row <= CAP.maxPeople * 1.75, 'max ' + mx.row + ' > ' + CAP.maxPeople * 1.75);
      assert.ok(m.row < 0.3 * m.neutral, 'mean ' + m.row.toFixed(1) + ' vs ' + m.neutral.toFixed(1));
    });
    run('each half of the row works alone (the head cap does most of it), and the row is not thicker than either (within the noise of two chaotic runs)', () => {
      assert.ok(m.capOnly < 0.6 * m.neutral, 'the head cap alone: ' + m.capOnly.toFixed(1) + ' vs ' + m.neutral.toFixed(1));
      assert.ok(m.factorOnly < 0.6 * m.neutral, 'the density factor alone: ' + m.factorOnly.toFixed(1) + ' vs ' + m.neutral.toFixed(1));
      assert.ok(m.row <= 1.25 * Math.min(m.capOnly, m.factorOnly), 'the row ' + m.row.toFixed(1) + ' vs ' + m.capOnly.toFixed(1) + ' / ' + m.factorOnly.toFixed(1));
    });
    run('the people outside the garden are not thinned by the row (visible people in the whole scene within 10 %)', () => { for (const k of names) assert.ok(vis(pops[k]) > 0.9 * vis(A) && vis(pops[k]) < 1.1 * vis(A), k + ' ' + vis(pops[k]) + ' vs ' + vis(A)); });
  } catch (e) { note('the scene run', false, String(e && e.stack || e).split('\n').slice(0, 6).join(' | ')); }
  const bad = checks.filter((c) => !c.ok).length;
  console.log(bad ? '[scene] RESULT: FAIL' : '[scene] RESULT: OK');
  if (process.env.NPH_OUT) fs.writeFileSync(process.env.NPH_OUT, JSON.stringify({ checks }));
}

// ------------------------------------------------------------------ main (not when people-test.mjs imports this file as its eval script)
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  console.log('north-people-hooks-test');
  await fast();
  if (args.includes('--scene')) { console.log('  --scene:'); sceneParent(); }
  console.log(`${passes} passed, ${fails} failed`);
  console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
  process.exit(fails ? 1 : 0);
}
