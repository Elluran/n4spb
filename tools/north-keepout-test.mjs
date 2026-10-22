// tools/north-keepout-test.mjs - CPU proof of the KEEP-OUT hooks of the North (docs/AREAS.md section 9, milestone M6, cluster B): src/areas/north/hooks/keep-out.js and its call sites in
// environment/trees.js (HOOKS.treeCleared, HOOKS.treeReject), environment/lawns.js (tuftReject), props/world.js (propReject), streets.js (pedestrianOnly) and streets/parking.js (parkingReject).
//   node tools/area.mjs north tools/north-keepout-test.mjs [--only pure] [--parallel] [--footprints] [--keep <dir>] [--baseline <off.json>]
// PART 1, the factories (pure, no engine): every (ctx) factory returns null while none of the modules it serves is in ctx.buildList (absent list, empty list, other modules); makeHooks(MODULES) has the
//   contract's eight keys and parkingReject only with landmarksTauride; the fixed probes (podium (900, -1000), campus (1230, -1150), Suvorov (1413, -1217), Smolny (2380, -1833) and (2460, -1543)) fire
//   exactly the hooks of their region with exactly their module built, and nothing else, and are silent without it.
// PART 2, the regions (pure): a lattice over the whole North (7 m, offset so that no point lies on an edge) and random points round every region, with eleven module lists (none, each module alone, all
//   four, each left out, the page's own MODULES): a hook fires iff the point is inside the declared region of a module that is built (rectangles written out here, the campus and the podium by an
//   independent winding-number test); hooks/keep-out.js CAMPUS equals CAMPUS of src/world/landmarksKirochnaya/groups.js and inCampus answers the same on 200,000 points; the pedestrianOnly rule
//   (rank 0 and MORE than 60 % of the points in the podium) on fixture ways.
// PART 3, the engine (one child process per variant: the North page's environment, streets, city and props are built headless and the sets are compared):
//   off   HOOKS emptied (the keys deleted = the engine of before M6), buildList = the page's MODULES        -> the reference
//   real  HOOKS as area.js builds them, buildList = the page's MODULES                                      -> no tree and no tuft stands in a Smolny / Suvorov / campus region; streets, parked
//                                                                                                              slots and props are IDENTICAL to `off` (the Paradny hooks are dormant)
//   fake  makeHooks(MODULES + landmarksTauride), buildList = MODULES + landmarksTauride (the module itself is
//         NOT built; the hooks only read the list)                                                          -> no tree, tuft, parked slot or bay line in the podium, no STAMPED prop there, the
//                                                                                                              rank-0 ways of the podium are pedestrianOnly, nothing else changed
//   A tree that differs between two variants OUTSIDE the regions must belong to a record that overlaps one: the trees of a GREEN polygon / a courtyard come from ONE random stream (trees.js seed()),
//   so a candidate that a hook rejects shifts the rest of its record (the same in the source); props draw from one stream for the whole page, so a prop far from the podium may be re-rolled in `fake`.
//   Mapped OSM trees and furniture: trees.js plant() has no caller that passes `force`, so the soft clearing of Smolny takes the mapped trees too (the North data has none in the regions); the mapped
//   furniture of props/osm.js is placed without fits() and stays in the podium (the source hook is in fits()).
//   --baseline <file>  also compares the `off` sets with a file written by `--child off --out <file>` of ANOTHER checkout (the pristine engine): the hook call sites are inert where the hooks are absent.
// PART 4 (--footprints, one more child, ~15 s): the static regions are numbers of the source repository and the M5 modules are verbatim copies; the three modules are built and the regions are checked against
//   what they draw (door, photo spot, frontage and footprints inside; no solid of the module in the open part of a Smolny approach; the campus buildings in the polygon).
// RESULT: OK / FAIL (exit 1). NODE_OPTIONS=--max-old-space-size=8000 (three children of ~2 GB each, one after another unless --parallel).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (k, d = null) => { const i = argv.indexOf('--' + k); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '1') : d; };
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
if ((process.env.AREA || 'strip') !== 'north') { console.error('run it as the North: node tools/area.mjs north tools/north-keepout-test.mjs'); process.exit(2); }

const r3 = (v) => Math.round(v * 1000) / 1000;
const VARIANTS = ['off', 'real', 'fake'];
const MODS = { smolny: 'landmarksSmolny', suvorov: 'landmarksSuvorov', kirochnaya: 'landmarksKirochnaya', tauride: 'landmarksTauride' };

// ---------------------------------------------------------------- the regions, written out here (not read from hooks/keep-out.js)
const rect = (x0, x1, z0, z1) => (x, z) => x > x0 && x < x1 && z > z0 && z < z1;       // open rectangles, as the source
const SMOLNY = [rect(2320, 2440, -1847, -1820), rect(2400, 2520, -1553, -1533)];
const SUVOROV = rect(1384, 1442, -1226, -1208);
/** a polygon test by the winding number (the hooks use the even-odd ray cast of the source): ring = [[x, z], ...] */
const winding = (ring, x, z) => {
  let w = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], cross = (b[0] - a[0]) * (z - a[1]) - (x - a[0]) * (b[1] - a[1]);
    if (a[1] <= z) { if (b[1] > z && cross > 0) w++; } else if (b[1] <= z && cross < 0) w--;
  }
  return w !== 0;
};
const pairs = (flat) => Array.from({ length: flat.length / 2 }, (_, i) => [flat[i * 2], flat[i * 2 + 1]]);

let fails = 0, passes = 0;
const check = (name, fn) => {
  try { fn(); passes++; console.log('  ok   ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 10).join('\n       ')); }
};
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };
const ok = (c, what) => { if (!c) throw new Error(what); };

// ================================================================ the engine child
if (opt('child')) {
  const variant = opt('child'), outFile = opt('out');
  class Ctx2D {
    constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
    measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
    createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createConicGradient() { return { addColorStop() {} }; } createPattern() { return {}; }
    getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; } createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
    putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; } isPointInPath() { return false; } getLineDash() { return []; }
  }
  const ctxProxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  class FakeCanvas {
    constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; }
    getContext(type) { if (type !== '2d') return null; return this._ctx || (this._ctx = ctxProxy(this)); }
    toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {}
  }
  globalThis.window = globalThis; globalThis.self = globalThis;
  const stubEl = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, children: [], textContent: '', innerHTML: '', addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {}, querySelector: () => null, querySelectorAll: () => [] });
  globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : stubEl()), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {} };
  globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
  globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
  globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16); globalThis.addEventListener = () => {};
  globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1; globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
  globalThis.performance = globalThis.performance || { now: () => Date.now() };

  const THREE = await import('three');
  const { createContext } = await imp('src/core/ctx.js');
  const L = await imp('src/world/layout.js');
  const A = await imp('src/world/area.js');
  const { HOOKS } = await imp('src/world/lib/area-tables.js');
  const { makeHooks } = await imp('src/areas/north/hooks.js');
  const { mainModules } = await imp('tools/modules-list.mjs');
  if (A.ID !== 'north') throw new Error('the area module is ' + A.ID);
  let buildList = mainModules();
  if (variant === 'off') { for (const k of Object.keys(HOOKS)) delete HOOKS[k]; }                                  // the engine of before M6: every call site meets an absent key
  else if (variant === 'fake') { buildList = [...buildList, MODS.tauride]; Object.assign(HOOKS, makeHooks(buildList)); }    // the Paradny set switched on without building the module
  else if (variant !== 'real' && variant !== 'modules') throw new Error('variant ' + variant);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
  const ctx = createContext({ scene, camera, renderer: null, audio: null, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
  ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
  ctx.buildList = buildList;
  const out = { variant, buildList, hooks: Object.keys(HOOKS).sort() };
  const build = async (m) => { const t0 = Date.now(); await (await imp('src/world/' + m + '.js')).build(ctx); console.log(`[${variant}] ${m} built in ${Date.now() - t0} ms`); };

  if (variant === 'modules') {                       // --footprints: what the three M5 modules really put on the ground (their services, colliders and the footprints of their groups)
    out.modules = {};
    for (const m of [MODS.smolny, MODS.suvorov, MODS.kirochnaya]) {
      const n0 = ctx.physics.items.length;
      await build(m);
      out.modules[m] = { service: JSON.parse(JSON.stringify(ctx.services[m], (k, v) => (Array.isArray(v) && v.length > 50 ? undefined : v))), colliders: ctx.physics.items.slice(n0).map((it) => [it.type, r3(it.cx), r3(it.cz), r3(it.hw || it.r || 0), r3(it.hd || it.r || 0), r3(it.c ?? 1), r3(it.s ?? 0)]) };
    }
    out.groups = {};
    for (const g of ['north-smolny-cathedral', 'north-smolny-ensemble', 'north-suvorov-museum', 'kirochnaya-clinical-institute']) out.groups[g] = L.groupMembers(g).map((r) => ({ id: r.id, rings: (r.polys || [{ o: r.o }]).map((p) => p.o.map(r3)) }));
    fs.writeFileSync(outFile, JSON.stringify(out));
    console.log(`[modules] written ${outFile}`);
    process.exit(0);
  }

  await build('environment');
  const env = ctx.services.environment;
  out.trees = env.trees.map((t) => [r3(t.x), r3(t.z), t.sp]);                          // read before any other service exists: no lamp / door pruning yet, only the placement
  out.treeStats = env.treeStats;
  // the grass tufts: a camera-centred pool re-scattered every 2.2 m of walking; stand at the probes of the regions and at controls, read the pool
  let tuftMesh = null; ctx.scene.traverse((o) => { if (o.name === 'env-tufts') tuftMesh = o; }); ctx.staticRoot.traverse((o) => { if (o.name === 'env-tufts') tuftMesh = o; });
  if (!tuftMesh) throw new Error('no env-tufts mesh');
  const SPOTS = { podium: [900, -1000], podiumEdge: [757, -1040], campus: [1230, -1150], campusEdge: [1120, -1230], campusSouth: [1250, -1062], suvorov: [1413, -1217], smolny1: [2380, -1833], smolny2: [2460, -1543], garden: [1200, -1500], chernyshevskaya: [444, -1351] };
  out.tufts = {};
  for (const [name, [x, z]] of Object.entries(SPOTS)) {
    camera.position.set(x, 1.7, z);
    for (const f of ctx._updates) f(0.016, 0);
    const A16 = tuftMesh.instanceMatrix.array, n = tuftMesh.count, pts = [];
    for (let i = 0; i < n; i++) pts.push([r3(A16[i * 16 + 12]), r3(A16[i * 16 + 14])]);
    out.tufts[name] = pts;
  }
  await build('streets');
  const st = ctx.services.streets;
  out.wayCount = st.net.ways.length;
  out.pedWays = st.net.ways.filter((w) => w.pedestrianOnly).map((w) => w.id).sort();
  out.laneCount = st.lanes.length;
  out.parked = st.parkedSlots.map((s) => [r3(s.x), r3(s.z), s.kind]);
  out.parkLines = (st.parkedSlots.lines || []).map((p) => [r3((p[0] + p[2]) / 2), r3((p[1] + p[3]) / 2)]);
  const PB = (await imp('src/areas/north/hooks/paradny.js')).PARADNY_BOX;
  out.podiumWays = st.net.ways.filter((w) => w.x.some((x, i) => x >= PB[0] && x <= PB[1] && w.z[i] >= PB[2] && w.z[i] <= PB[3])).map((w) => [w.id, w.rank, !!w.pedestrianOnly, w.x.map(r3), w.z.map(r3)]);      // every way that touches the box of the podium: id, rank, flag, points
  await build('city');
  await build('props');
  const pr = ctx.services.props, pos = (a) => (a || []).map((o) => [r3(o.x), r3(o.z)]);
  out.props = { benches: pos(pr.benches), bins: pos(pr.bins), kiosks: pos(pr.kiosks), pillars: pos(pr.pillars), planters: pos(pr.planters), urns: pos(pr.urns), racks: pos(pr.racks), boxes: pos(pr.boxes), clocks: pos(pr.clocks), stalls: pos(pr.stalls) };
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log(`[${variant}] written ${outFile}: trees ${out.trees.length}, tuft spots ${Object.keys(out.tufts).length}, ways ${out.wayCount} (pedestrianOnly ${out.pedWays.length}), parked ${out.parked.length}, benches ${out.props.benches.length}`);
  process.exit(0);
}

// ================================================================ the parent
const KO = await imp('src/areas/north/hooks/keep-out.js');
const PD = await imp('src/areas/north/hooks/paradny.js');
const HK = await imp('src/areas/north/hooks.js');
const A = await imp('src/world/area.js');
const GRP = await imp('src/world/landmarksKirochnaya/groups.js');
const MODULES = A.MODULES;
const FAC = ['treeCleared', 'treeReject', 'tuftReject', 'propReject', 'pedestrianOnly'];
const CONTRACT_KEYS = ['deckServices', 'inGarden', 'parkingReject', 'pedestrianOnly', 'propReject', 'tuftReject', 'treeCleared', 'treeReject'].sort();
const podium = PD.PARADNY_PODIUM.o.length ? pairs(PD.PARADNY_PODIUM.o) : [];
const inPodium = (x, z) => winding(podium, x, z);
const campusRing = GRP.CAMPUS;
const inCampusRef = (x, z) => winding(campusRing, x, z);

console.log('north-keepout-test: ' + MODULES.length + ' modules in the North list; Paradny set ' + (MODULES.includes(MODS.tauride) ? 'ACTIVE (landmarksTauride is in MODULES)' : 'dormant (landmarksTauride is not in MODULES)'));

/** the hooks of a module list as the engine meets them: factories evaluated ONCE for a ctx whose buildList is `list` */
const evaluate = (list) => {
  const ctx = { buildList: list };
  return { cleared: KO.treeCleared(ctx), reject: KO.treeReject(ctx), tuft: KO.tuftReject(ctx), prop: KO.propReject(ctx), ped: KO.pedestrianOnly(ctx), parking: KO.makeParkingReject(list) };
};
/** what the declared regions say at (x, z) for the built set */
const expected = (built, x, z) => ({
  cleared: built.has(MODS.smolny) && (SMOLNY[0](x, z) || SMOLNY[1](x, z)),
  reject: built.has(MODS.tauride) && inPodium(x, z) ? 'paradny' : built.has(MODS.kirochnaya) && inCampusRef(x, z) ? 'campus' : built.has(MODS.suvorov) && SUVOROV(x, z) ? 'suvorov' : null,
  tuft: (built.has(MODS.tauride) && inPodium(x, z)) || (built.has(MODS.kirochnaya) && inCampusRef(x, z)),
  prop: built.has(MODS.tauride) && inPodium(x, z),
  parking: built.has(MODS.tauride) && inPodium(x, z),
});
const got = (h, x, z) => ({ cleared: !!(h.cleared && h.cleared(x, z)), reject: h.reject ? h.reject(x, z) : null, tuft: !!(h.tuft && h.tuft(x, z)), prop: !!(h.prop && h.prop(x, z)), parking: !!(h.parking && h.parking(x, z)) });

console.log('PART 1: the factories');
check('every (ctx) factory is null while none of its modules is built (no ctx, no list, empty list, other modules)', () => {
  for (const f of FAC) for (const c of [undefined, {}, { buildList: [] }, { buildList: ['environment', 'streets', 'landmarksNorthFull', 'landmarksOktyabrsky'] }]) ok(KO[f](c) === null, `${f}(${JSON.stringify(c)}) is not null`);
  ok(KO.makeParkingReject(undefined) === undefined && KO.makeParkingReject([]) === undefined && KO.makeParkingReject(MODULES.filter((m) => m !== MODS.tauride)) === undefined, 'makeParkingReject gives a function without landmarksTauride');
});
check('each factory serves exactly the modules of its contract', () => {
  const serves = { treeCleared: [MODS.smolny], treeReject: [MODS.tauride, MODS.kirochnaya, MODS.suvorov], tuftReject: [MODS.tauride, MODS.kirochnaya], propReject: [MODS.tauride], pedestrianOnly: [MODS.tauride] };
  for (const f of FAC) for (const m of Object.values(MODS)) ok((KO[f]({ buildList: [m] }) !== null) === serves[f].includes(m), `${f} with only ${m}: ${KO[f]({ buildList: [m] }) !== null}`);
  ok(typeof KO.makeParkingReject([MODS.tauride]) === 'function', 'makeParkingReject with landmarksTauride is no function');
  for (const m of [MODS.smolny, MODS.suvorov, MODS.kirochnaya]) ok(KO.makeParkingReject([m]) === undefined, 'parking gated by ' + m);
});
check('makeHooks(MODULES) has the eight keys of the contract; parkingReject only with landmarksTauride; the area module exports the same table', () => {
  const real = HK.makeHooks(MODULES), fake = HK.makeHooks([...MODULES, MODS.tauride]);
  eq(Object.keys(real).sort(), CONTRACT_KEYS, 'keys');
  eq(Object.keys(fake).sort(), CONTRACT_KEYS, 'keys with landmarksTauride');
  for (const f of FAC) ok(typeof real[f] === 'function' && real[f] === KO[f], f + ' is not the factory of keep-out.js');
  ok((typeof real.parkingReject === 'function') === MODULES.includes(MODS.tauride), 'parkingReject of the page\'s own list');
  ok(typeof fake.parkingReject === 'function', 'parkingReject with landmarksTauride');
  eq(Object.keys(A.HOOKS).sort(), CONTRACT_KEYS, 'area.js HOOKS keys');
  ok(A.HOOKS.treeReject === KO.treeReject && A.HOOKS.pedestrianOnly === KO.pedestrianOnly, 'area.js HOOKS are not built by hooks.js');
});
const PROBES = [
  { name: 'podium (900, -1000)', at: [900, -1000], module: MODS.tauride, fires: { reject: 'paradny', tuft: true, prop: true, parking: true } },
  { name: 'campus (1230, -1150)', at: [1230, -1150], module: MODS.kirochnaya, fires: { reject: 'campus', tuft: true } },
  { name: 'Suvorov (1413, -1217)', at: [1413, -1217], module: MODS.suvorov, fires: { reject: 'suvorov' } },
  { name: 'Smolny (2380, -1833)', at: [2380, -1833], module: MODS.smolny, fires: { cleared: true } },
  { name: 'Smolny (2460, -1543)', at: [2460, -1543], module: MODS.smolny, fires: { cleared: true } },
];
const NOTHING = { cleared: false, reject: null, tuft: false, prop: false, parking: false };
check('the fixed probes fire exactly the hooks of their region with exactly their module built, and nothing without it', () => {
  const all = Object.values(MODS);
  for (const p of PROBES) {
    const [x, z] = p.at;
    eq(got(evaluate([p.module]), x, z), { ...NOTHING, ...p.fires }, `${p.name} with only ${p.module}`);
    eq(got(evaluate(all), x, z), { ...NOTHING, ...p.fires }, `${p.name} with all four modules`);
    eq(got(evaluate(all.filter((m) => m !== p.module)), x, z), NOTHING, `${p.name} without ${p.module}`);
    eq(got(evaluate([]), x, z), NOTHING, `${p.name} with an empty list`);
    eq(got(evaluate(['environment', 'streets', 'city']), x, z), NOTHING, `${p.name} with other modules`);
  }
});
check('the Paradny hooks are dormant in the page\'s own list unless landmarksTauride is in it; the other three keep-outs are active (M5 modules built)', () => {
  const h = evaluate(MODULES), tauride = MODULES.includes(MODS.tauride);
  for (const m of [MODS.smolny, MODS.suvorov, MODS.kirochnaya]) ok(MODULES.includes(m), m + ' is not in the North MODULES');
  eq(got(h, 900, -1000), tauride ? { ...NOTHING, reject: 'paradny', tuft: true, prop: true, parking: true } : NOTHING, 'podium probe on the page\'s list');
  eq(got(h, 1230, -1150), { ...NOTHING, reject: 'campus', tuft: true }, 'campus probe on the page\'s list');
  eq(got(h, 1413, -1217), { ...NOTHING, reject: 'suvorov' }, 'Suvorov probe on the page\'s list');
  eq(got(h, 2380, -1833), { ...NOTHING, cleared: true }, 'Smolny 1 probe on the page\'s list');
  eq(got(h, 2460, -1543), { ...NOTHING, cleared: true }, 'Smolny 2 probe on the page\'s list');
});
check('pedestrianOnly: rank 0 and MORE than 60 % of the points in the podium (fixture ways)', () => {
  const f = KO.pedestrianOnly({ buildList: [MODS.tauride] });
  const inside = [[900, -1000], [905, -1010], [910, -1020], [915, -1030], [920, -1040]], outside = [[100, -100], [110, -100], [120, -100], [130, -100], [140, -100]];
  const way = (rank, pts) => ({ rank, x: pts.map((p) => p[0]), z: pts.map((p) => p[1]) });
  ok(inPodium(...inside[0]) && inPodium(...inside[4]), 'fixture points are not in the podium');
  ok(f(way(0, inside)) === true, 'all inside, rank 0');
  ok(f(way(1, inside)) === false, 'all inside, rank 1');
  ok(f(way(0, outside)) === false, 'all outside');
  ok(f(way(0, [...inside.slice(0, 3), ...outside.slice(0, 2)])) === false, '3 of 5 (60 %, not more than 60 %)');
  ok(f(way(0, [...inside.slice(0, 4), ...outside.slice(0, 1)])) === true, '4 of 5');
});

console.log('PART 2: the regions');
check('CAMPUS of hooks/keep-out.js equals CAMPUS of landmarksKirochnaya/groups.js; inCampus answers the same on 200,000 points', () => {
  eq(KO.CAMPUS, GRP.CAMPUS, 'CAMPUS');
  let s = 12345; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  let n = 0, inside = 0;
  for (let i = 0; i < 200000; i++) { const x = 1100 + rnd() * 260, z = -1260 + rnd() * 230; n++; const a = KO.inCampus(x, z); if (a) inside++; if (a !== GRP.inCampus(x, z)) throw new Error(`inCampus differs at ${x}, ${z}`); if (a !== inCampusRef(x, z)) throw new Error(`inCampus differs from the winding number at ${x}, ${z}`); }
  ok(inside > 50000 && inside < 190000, 'implausible inside share ' + inside + '/' + n);
});
const LISTS = (() => {
  const all = Object.values(MODS), lists = [['none', []], ['all four', all], ['page MODULES', MODULES.slice()]];
  for (const m of all) { lists.push(['only ' + m, [m]]); lists.push(['all but ' + m, all.filter((q) => q !== m)]); }
  return lists;
})();
check(`a hook fires iff the point lies in the declared region of a built module: lattice of 7 m over the North + 300,000 random points round the regions, ${LISTS.length} module lists`, () => {
  const lattice = []; for (let x = -600.37; x < 2700; x += 7) for (let z = -2300.61; z < 100; z += 7) lattice.push([x, z]);
  let s = 777; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const near = []; const boxes = [[2316, 2444, -1851, -1816], [2396, 2524, -1557, -1529], [1380, 1446, -1230, -1204], [1106, 1347, -1246, -1043], [737, 1062, -1209, -869]];
  for (const b of boxes) for (let i = 0; i < 60000; i++) near.push([b[0] + rnd() * (b[1] - b[0]), b[2] + rnd() * (b[3] - b[2])]);
  const hits = { cleared: 0, reject: 0, tuft: 0, prop: 0, parking: 0 };
  for (const [name, list] of LISTS) {
    const h = evaluate(list), built = new Set(list);
    for (const pts of [lattice, near]) for (const [x, z] of pts) {
      const g = got(h, x, z), e = expected(built, x, z);
      if (g.cleared !== e.cleared || g.reject !== e.reject || g.tuft !== e.tuft || g.prop !== e.prop || g.parking !== e.parking) throw new Error(`module list "${name}" at (${x.toFixed(2)}, ${z.toFixed(2)}): hook ${JSON.stringify(g)}, declared regions ${JSON.stringify(e)}`);
      if (name === 'all four') { if (g.cleared) hits.cleared++; if (g.reject) hits.reject++; if (g.tuft) hits.tuft++; if (g.prop) hits.prop++; if (g.parking) hits.parking++; }
    }
  }
  for (const k of Object.keys(hits)) ok(hits[k] > 0, 'the sweep never saw hook ' + k + ' fire (vacuous)');
  console.log('       fired with all four modules built: ' + JSON.stringify(hits));
});

// ================================================================ PART 3: the engine
if (opt('only') === 'pure') { console.log(fails ? `RESULT: FAIL (${fails} failed, ${passes} passed)` : `RESULT: OK (${passes} checks, engine part skipped)`); process.exit(fails ? 1 : 0); }
console.log('PART 3: the engine (children: ' + VARIANTS.join(', ') + ')');
const tmp = opt('keep') ? path.resolve(opt('keep')) : fs.mkdtempSync(path.join(os.tmpdir(), 'north-keepout-'));
fs.mkdirSync(tmp, { recursive: true });
const childArgs = (v) => [path.join(root, 'tools/area.mjs'), 'north', path.join(root, 'tools/north-keepout-test.mjs'), '--child', v, '--out', path.join(tmp, v + '.json')];
const T0 = Date.now();
if (argv.includes('--parallel')) await Promise.all(VARIANTS.map((v) => new Promise((res) => spawn(process.execPath, childArgs(v), { stdio: 'inherit' }).on('exit', res))));
else for (const v of VARIANTS) { const r = spawnSync(process.execPath, childArgs(v), { stdio: 'inherit' }); if (r.status !== 0) { fails++; console.log('  FAIL child ' + v + ' exited with ' + r.status); } }
console.log(`children done in ${((Date.now() - T0) / 1000).toFixed(0)} s (${tmp})`);
const load = (v) => { const f = path.join(tmp, v + '.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const S = Object.fromEntries(VARIANTS.map((v) => [v, load(v)]));
if (VARIANTS.some((v) => !S[v])) { console.log('RESULT: FAIL (a child produced no result)'); if (!opt('keep')) fs.rmSync(tmp, { recursive: true, force: true }); process.exit(1); }

const D = await imp('src/world/data/city.js');
const k2 = (a) => a[0].toFixed(2) + ',' + a[1].toFixed(2) + (a.length > 2 ? ',' + a.slice(2).join(',') : '');
const sets = (A1, B1) => { const a = new Set(A1.map(k2)), b = new Set(B1.map(k2)); return { gone: A1.filter((p) => !b.has(k2(p))), came: B1.filter((p) => !a.has(k2(p))) }; };
const describe = (a) => a.slice(0, 6).map((p) => `(${p[0]}, ${p[1]}${p[2] ? ' ' + p.slice(2).join(' ') : ''})`).join(' ') + (a.length > 6 ? ' ...' : '');
/** is (x, z) inside a declared region of a module of the built set? (the regions written out above) */
const inRegions = (built, x, z) => { const e = expected(built, x, z); return !!(e.cleared || e.reject || e.tuft || e.prop || e.parking); };
const inFlat = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) c = !c; return c; };
const bboxOf = (o) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } return [x0, x1, z0, z1]; };
const segCross = (ax, az, bx, bz, cx, cz, dx, dz) => {
  const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (!d) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};
/** do two flat rings [x, z, ...] overlap (an edge crosses an edge, or one contains a vertex of the other)? */
const ringsOverlap = (A1, B1) => {
  const a = bboxOf(A1), b = bboxOf(B1);
  if (a[1] < b[0] || b[1] < a[0] || a[3] < b[2] || b[3] < a[2]) return false;
  if (inFlat(B1, A1[0], A1[1]) || inFlat(A1, B1[0], B1[1])) return true;
  for (let i = 0; i < A1.length; i += 2) { const i2 = (i + 2) % A1.length; for (let j = 0; j < B1.length; j += 2) { const j2 = (j + 2) % B1.length; if (segCross(A1[i], A1[i + 1], A1[i2], A1[i2 + 1], B1[j], B1[j + 1], B1[j2], B1[j2 + 1])) return true; } }
  return false;
};
const box2ring = (b) => [b[0], b[2], b[1], b[2], b[1], b[3], b[0], b[3]];
/** the rings of the declared regions of the modules in `built`, and the records that the engine draws from ONE random stream and that overlap them */
const regionRings = (built, only) => {
  const rings = [];
  if (built.has(MODS.smolny) && only.smolny) rings.push(box2ring([2320, 2440, -1847, -1820]), box2ring([2400, 2520, -1553, -1533]));
  if (built.has(MODS.suvorov) && only.suvorov) rings.push(box2ring([1384, 1442, -1226, -1208]));
  if (built.has(MODS.kirochnaya) && only.campus) rings.push(KO.CAMPUS.flat());
  if (built.has(MODS.tauride) && only.podium) rings.push(PD.PARADNY_PODIUM.o.slice());
  return rings;
};
/** Trees of one GREEN polygon / one courtyard (building hole) are drawn from one stream (trees.js seed()): a candidate that a hook rejects shifts the rest of ITS record, so a difference outside
 *  the regions is legitimate exactly when it lies in a record that overlaps a region (or in a 6 m yard cell next to one: the halo). */
const touchedRecords = (rings) => {
  const zones = [];
  for (const g of D.GREEN) for (const p of g.polys) if (rings.some((r) => ringsOverlap(p.o, r))) zones.push({ what: 'GREEN ' + g.id + ':' + g.kind, o: p.o, h: p.h || [] });
  for (const b of D.BUILDINGS) for (const p of b.polys) for (const h of p.h || []) if (rings.some((r) => ringsOverlap(h, r))) zones.push({ what: 'courtyard of ' + b.id, o: h, h: [] });
  return zones;
};
const recordOf = (zones, rings, x, z) => {
  for (const r of rings) if (inFlat(r, x, z)) return 'region';
  for (const q of zones) if (inFlat(q.o, x, z) && !q.h.some((h) => inFlat(h, x, z))) return q.what;
  for (const r of rings) { const b = bboxOf(r); if (x > b[0] - 9 && x < b[1] + 9 && z > b[2] - 9 && z < b[3] + 9) return 'halo'; }      // the 6 m yard cells (+ jitter) round a region
  return null;
};
const reasons = (S1) => { const o = {}; for (const [k, v] of Object.entries(S1.treeStats.rej)) { const m = /:(campus|suvorov|paradny|cleared)$/.exec(k); if (m) o[m[1]] = (o[m[1]] || 0) + v; } return o; };

check('the variants built what they should: `off` has no hook, `real` the page\'s, `fake` the Paradny set too', () => {
  eq(S.off.hooks, [], 'off hooks');
  eq(S.real.hooks, CONTRACT_KEYS, 'real hooks');
  eq(S.fake.hooks, CONTRACT_KEYS, 'fake hooks');
  eq(S.real.buildList, MODULES, 'real buildList');
  ok(S.fake.buildList.includes(MODS.tauride) && S.fake.buildList.length === MODULES.length + (MODULES.includes(MODS.tauride) ? 0 : 1), 'fake list');
});

if (opt('baseline')) check('the hook call sites are inert where the hooks are absent: `off` equals the sets of --baseline (the engine before the hook edits)', () => {
  const B = JSON.parse(fs.readFileSync(path.resolve(opt('baseline')), 'utf8'));
  for (const k of ['trees', 'treeStats', 'tufts', 'wayCount', 'pedWays', 'laneCount', 'parked', 'parkLines', 'podiumWays', 'props']) eq(S.off[k], B[k], k + ' differs from the baseline');
});

check('trees: `real` has no tree inside a declared region; a difference from `off` outside the regions lies in a record that overlaps one', () => {
  const built = new Set(S.real.buildList), { gone, came } = sets(S.off.trees, S.real.trees);
  const inside = S.real.trees.filter((t) => inRegions(built, t[0], t[1]));
  ok(inside.length === 0, `${inside.length} trees of \`real\` stand in a keep-out region: ${describe(inside)}`);
  const offIn = S.off.trees.filter((t) => inRegions(built, t[0], t[1]));
  ok(offIn.length > 0, 'vacuous: `off` has no tree in the regions');
  const per = { smolny1: 0, smolny2: 0, suvorov: 0, campus: 0 };
  for (const t of offIn) { if (SMOLNY[0](t[0], t[1])) per.smolny1++; else if (SMOLNY[1](t[0], t[1])) per.smolny2++; else if (SUVOROV(t[0], t[1])) per.suvorov++; else per.campus++; }
  const rings = regionRings(built, { smolny: 1, suvorov: 1, campus: 1 }), zones = touchedRecords(rings), stray = [], by = {};
  for (const t of [...gone, ...came]) { const r = recordOf(zones, rings, t[0], t[1]); if (!r) stray.push(t); else by[r] = (by[r] || 0) + 1; }
  console.log(`       off ${S.off.trees.length} trees, real ${S.real.trees.length}: ${offIn.length} stood in the regions ${JSON.stringify(per)}, all gone; ${gone.length - offIn.length} more gone and ${came.length} came in records that overlap a region: ${JSON.stringify(by)}`);
  console.log(`       rejections by reason: off ${JSON.stringify(reasons(S.off))}, real ${JSON.stringify(reasons(S.real))}`);
  ok(stray.length === 0, `${stray.length} tree differences outside every region and every record that overlaps one: ${describe(stray)}`);
  ok(offIn.every((t) => !S.real.trees.some((q) => k2(q) === k2(t))), 'a tree inside a region survived');
  ok(!reasons(S.real).paradny && (reasons(S.real).campus || 0) + (reasons(S.real).suvorov || 0) > 0 && reasons(S.real).cleared > (reasons(S.off).cleared || 0), 'the rejection counters do not show the Smolny / Suvorov / campus reasons (or show a Paradny one)');
  ok(!reasons(S.off).campus && !reasons(S.off).suvorov && !reasons(S.off).paradny, '`off` counts a hook reason');
});
check('trees: `fake` has no tree in the podium; a difference from `real` outside it lies in a record that overlaps it', () => {
  const built = new Set(S.fake.buildList), { gone, came } = sets(S.real.trees, S.fake.trees);
  const inside = S.fake.trees.filter((t) => inPodium(t[0], t[1]));
  ok(inside.length === 0, `${inside.length} trees of \`fake\` stand in the podium: ${describe(inside)}`);
  const realIn = S.real.trees.filter((t) => inPodium(t[0], t[1]));
  ok(realIn.length > 0, 'vacuous: `real` has no tree in the podium');
  const rings = regionRings(built, { podium: 1 }), zones = touchedRecords(rings), stray = [];
  for (const t of [...gone, ...came]) if (!recordOf(zones, rings, t[0], t[1])) stray.push(t);
  console.log(`       real ${S.real.trees.length} trees, fake ${S.fake.trees.length}: ${realIn.length} stood in the podium, ${gone.length - realIn.length} more gone and ${came.length} came in records that overlap it; rejections by reason: ${JSON.stringify(reasons(S.fake))}`);
  ok(stray.length === 0, `${stray.length} tree differences outside the podium and every record that overlaps it: ${describe(stray)}`);
  ok((reasons(S.fake).paradny || 0) > 0, 'the rejection counters show no paradny reason');
});
check('tufts: no tuft stands in a keep-out (campus; with landmarksTauride the podium too) and the hooks change nothing outside it', () => {
  let removed = 0;
  const cmp = (a, b, label, reg) => {
    for (const name of Object.keys(a.tufts)) {
      const { gone, came } = sets(a.tufts[name], b.tufts[name]), bad = gone.filter((t) => !reg(t[0], t[1]));
      ok(bad.length === 0, `${label} at ${name}: ${bad.length} tufts vanished outside the regions: ${describe(bad)}`);
      ok(came.length === 0 || a.tufts[name].length >= 5299, `${label} at ${name}: ${came.length} tufts appeared (pool ${a.tufts[name].length}): ${describe(came)}`);
      removed += gone.length;
    }
  };
  const campus = (x, z) => inCampusRef(x, z), podiumOnly = (x, z) => inPodium(x, z);
  cmp(S.off, S.real, 'real vs off', campus);
  cmp(S.real, S.fake, 'fake vs real', podiumOnly);
  for (const [v, reg] of [['real', campus], ['fake', (x, z) => campus(x, z) || podiumOnly(x, z)]]) for (const [name, pts] of Object.entries(S[v].tufts)) ok(!pts.some((p) => reg(p[0], p[1])), `${v}: a tuft stands in a keep-out at ${name}`);
  const inCampusOff = Object.values(S.off.tufts).flat().filter((p) => campus(p[0], p[1])).length, inPodiumReal = Object.values(S.real.tufts).flat().filter((p) => podiumOnly(p[0], p[1])).length;
  ok(inCampusOff > 0 && inPodiumReal > 0, `vacuous: tufts in the campus under \`off\` ${inCampusOff}, in the podium under \`real\` ${inPodiumReal}`);
  ok(Object.values(S.real.tufts).filter((a) => a.length > 0).length >= 6, 'too many empty tuft pools');
  console.log(`       ${Object.keys(S.off.tufts).length} camera spots; ${inCampusOff} tufts of \`off\` stood in the campus, ${inPodiumReal} of \`real\` in the podium; ${removed} removed in all`);
});
check('streets: dormant in `real` (pedestrianOnly ways, lanes, parked slots, bay lines identical to `off`); in `fake` the podium ways (rank 0, MORE than 60 % of the points in the podium) are pedestrianOnly and no slot or line stands in the podium', () => {
  eq(S.real.pedWays, S.off.pedWays, 'pedestrianOnly ways real vs off');
  eq(S.real.laneCount, S.off.laneCount, 'lane count real vs off');
  eq(S.real.parked, S.off.parked, 'parked slots real vs off');
  eq(S.real.parkLines, S.off.parkLines, 'bay lines real vs off');
  eq(S.real.podiumWays, S.off.podiumWays, 'podium ways real vs off');
  const rule = (w) => w[1] === 0 && w[3].filter((x, i) => inPodium(x, w[4][i])).length > w[3].length * .6;
  const realFlag = new Map(S.real.podiumWays.map((w) => [w[0], w[2]])), bad = [];
  let newPed = 0, ruled = 0;
  for (const w of S.fake.podiumWays) {
    const want = realFlag.get(w[0]) || rule(w);
    if (w[2] !== want) bad.push(w[0] + ':' + w[2] + '/' + want);
    if (w[2] && !realFlag.get(w[0])) newPed++;
    if (rule(w)) ruled++;
  }
  ok(S.fake.podiumWays.length === S.real.podiumWays.length && S.fake.podiumWays.length > 50, 'way lists differ or are implausibly short: ' + S.fake.podiumWays.length);
  ok(bad.length === 0, `${bad.length} ways whose pedestrianOnly flag is not "claimed by a module, or rank 0 and > 60 % in the podium": ${bad.slice(0, 8).join(' ')}`);
  ok(newPed > 0 && newPed === S.fake.pedWays.length - S.real.pedWays.length, `newly pedestrianOnly ways ${newPed} vs ${S.fake.pedWays.length - S.real.pedWays.length} (vacuous or ways outside the podium box)`);
  console.log(`       fake: ${newPed} ways became pedestrianOnly (${S.real.pedWays.length} before; ${ruled} satisfy the rule), lanes ${S.real.laneCount} -> ${S.fake.laneCount}, parked ${S.real.parked.length} -> ${S.fake.parked.length}, bay lines ${S.real.parkLines.length} -> ${S.fake.parkLines.length}`);
  ok(S.fake.laneCount < S.real.laneCount, 'the lane graph kept the podium lanes');
  const { gone, came } = sets(S.real.parked, S.fake.parked);
  ok(gone.length > 0 && gone.every((s) => inPodium(s[0], s[1])) && came.length === 0, `parked slots changed outside the podium (gone ${gone.length}, outside ${gone.filter((s) => !inPodium(s[0], s[1])).length}, came ${came.length})`);
  ok(!S.fake.parked.some((s) => inPodium(s[0], s[1])), 'a parked slot stands in the podium');
  const ll = sets(S.real.parkLines, S.fake.parkLines);
  ok(ll.gone.length > 0 && ll.came.length === 0 && ll.gone.every((s) => inPodium(s[0], s[1])), `bay lines changed outside the podium (gone ${ll.gone.length}, came ${ll.came.length})`);
  ok(!S.fake.parkLines.some((s) => inPodium(s[0], s[1])), 'a bay line stands in the podium');
});
check('props: dormant in `real` (every list identical to `off`); in `fake` nothing is STAMPED in the podium (the mapped OSM furniture, which props/osm.js places without fits(), stays)', () => {
  const LISTS_P = Object.keys(S.off.props);
  for (const k of LISTS_P) eq(S.real.props[k], S.off.props[k], 'props.' + k + ' real vs off');
  let goneIn = 0, mapped = 0;
  for (const k of LISTS_P) {
    const { gone, came } = sets(S.real.props[k], S.fake.props[k]), had = new Set(S.real.props[k].map(k2));
    const inFake = S.fake.props[k].filter((p) => inPodium(p[0], p[1]));
    ok(inFake.every((p) => had.has(k2(p))), `fake: a ${k} that \`real\` did not have stands in the podium: ${describe(inFake.filter((p) => !had.has(k2(p))))}`);
    ok(came.every((p) => !inPodium(p[0], p[1])), `fake: ${k} came into the podium`);
    goneIn += gone.filter((p) => inPodium(p[0], p[1])).length; mapped += inFake.length;
    console.log(`       ${k.padEnd(9)} real ${String(S.real.props[k].length).padStart(4)}, fake ${String(S.fake.props[k].length).padStart(4)}  (${gone.length} gone, ${came.length} came; ${inFake.length} stay in the podium)`);
  }
  ok(goneIn > 0, 'vacuous: no prop of `real` that stood in the podium is gone in `fake`');
  console.log(`       ${goneIn} props gone from the podium, ${mapped} mapped ones stay`);
  // props draw from ONE stream for the whole page (props/state.js R): a stamp that fits() refuses shifts the later placements, so props far from the podium may be re-rolled; the totals must stay close
  for (const k of ['benches', 'bins', 'kiosks']) ok(Math.abs(S.fake.props[k].length - S.real.props[k].length) <= Math.max(3, 0.03 * S.real.props[k].length), `${k}: ${S.real.props[k].length} -> ${S.fake.props[k].length}`);
});

// ================================================================ PART 4 (--footprints): the static regions against the real geometry of the M5 modules
// The regions are numbers of the SOURCE repository (the keep-outs cannot read a service: environment is built first); the M5 modules are verbatim copies. This builds the three modules and proves that the
// regions still sit where the modules draw: the doors, photo spot and frontage inside, nothing solid of the module in the open part of an approach, the campus buildings in the campus polygon.
if (argv.includes('--footprints')) {
  console.log('PART 4: the regions against the M5 modules (child: modules)');
  const r = spawnSync(process.execPath, childArgs('modules'), { stdio: 'inherit' });
  const M = r.status === 0 && fs.existsSync(path.join(tmp, 'modules.json')) ? JSON.parse(fs.readFileSync(path.join(tmp, 'modules.json'), 'utf8')) : null;
  if (!M) { fails++; console.log('  FAIL the modules child produced no result'); }
  else {
    const cols = (m) => M.modules[m].colliders.map(([type, cx, cz, hw, hd, c, s]) => ({ type, cx, cz, hw, hd, c, s, ex: type === 'cyl' ? hw : Math.abs(c) * hw + Math.abs(s) * hd, ez: type === 'cyl' ? hw : Math.abs(s) * hw + Math.abs(c) * hd }));
    const touching = (list, b) => list.filter((it) => it.cx + it.ex > b[0] && it.cx - it.ex < b[1] && it.cz + it.ez > b[2] && it.cz - it.ez < b[3]);
    const SM = [[2320, 2440, -1847, -1820], [2400, 2520, -1553, -1533]], SU = [1384, 1442, -1226, -1208];
    const ringsOf = (g) => M.groups[g].flatMap((q) => q.rings), xz = (ring) => pairs(ring);
    const distRing = (poly, x, z) => { let d = 1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)); } return d; };
    check('Smolny: the cathedral door and the photo spot lie in the first approach; the module draws nothing solid in it west of the apse, nor in the second approach west of the portico', () => {
      const S = M.modules[MODS.smolny].service, c = cols(MODS.smolny);
      ok(S.entrances.length === 1 && SMOLNY[0](S.entrances[0].x, S.entrances[0].z), 'the cathedral entrance is outside the first approach');
      ok(S.photoSpots.length === 1 && SMOLNY[0](S.photoSpots[0].x, S.photoSpots[0].z), 'the photo spot is outside the first approach');
      const a1 = touching(c, SM[0]), a2 = touching(c, SM[1]), xmin1 = Math.min(...a1.map((it) => it.cx - it.ex)), xmin2 = Math.min(...a2.map((it) => it.cx - it.ex));
      const cathedral = ringsOf('north-smolny-cathedral').map(xz).map((p) => Math.min(...p.map((q) => q[0]))), apse = Math.min(...cathedral);
      console.log(`       approach 1: ${a1.length} colliders of the module, the westmost at x ${xmin1.toFixed(1)} (cathedral footprint from x ${apse.toFixed(1)}); approach 2: ${a2.length} colliders, the westmost at x ${xmin2.toFixed(1)}`);
      ok(a1.length > 0 && xmin1 >= apse - 3, `a solid of the module stands in the open part of the first approach (x ${xmin1}, the apse starts at ${apse})`);
      ok(a2.length > 0 && xmin2 >= 2505, `a solid of the module stands west of the portico in the second approach (x ${xmin2})`);
      ok(SMOLNY[0](2330, -1833.5) && SMOLNY[1](2410, -1544), 'the approaches do not cover their own axes');
    });
    check('Suvorov: the doorstep and the whole width of the museum lie in the strip; the module draws nothing north of it', () => {
      const S = M.modules[MODS.suvorov].service, c = cols(MODS.suvorov), all = ringsOf('north-suvorov-museum').flatMap(xz);
      ok(S.entrances.length === 1 && SUVOROV(S.entrances[0].x, S.entrances[0].z), 'the entrance is outside the strip');
      const x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0])), zN = Math.min(...all.map((p) => p[1])), cz0 = Math.min(...c.map((it) => it.cz - it.ez)), cx0 = Math.min(...c.map((it) => it.cx - it.ex)), cx1 = Math.max(...c.map((it) => it.cx + it.ex));
      console.log(`       museum footprint x ${x0.toFixed(1)} .. ${x1.toFixed(1)}, northmost wall z ${zN.toFixed(1)}; colliders x ${cx0.toFixed(1)} .. ${cx1.toFixed(1)}, northmost z ${cz0.toFixed(1)}; strip x 1384 .. 1442, z -1226 .. -1208`);
      ok(x0 >= 1384 - 1 && x1 <= 1442 + 1, 'the museum is wider than the strip');
      ok(zN >= -1226 && cz0 >= -1226, 'something of the museum stands north of the strip');
      ok(cx0 >= 1383 && cx1 <= 1443, 'a collider of the module is wider than the strip');
    });
    check('Kirochnaya: the campus buildings lie in the campus polygon (two straddle its edge), the module\'s colliders outside it are those two buildings, and the gates stand on its border', () => {
      const recs = M.groups['kirochnaya-clinical-institute'], inside = (p) => pairs(p).filter((q) => winding(campusRing, q[0], q[1])).length;
      const stat = recs.map((q) => q.rings.map((p) => [inside(p), p.length / 2])).flat(), whole = stat.filter(([a, n]) => a === n).length, part = stat.filter(([a, n]) => a > 0 && a < n).length, none = stat.filter(([a]) => a === 0).length;
      const c = cols(MODS.kirochnaya), out = c.filter((it) => !winding(campusRing, it.cx, it.cz)), far = out.filter((it) => distRing(campusRing, it.cx, it.cz) > 8);
      console.log(`       ${recs.length} records: ${whole} rings wholly inside, ${part} straddle the edge, ${none} outside; ${out.length} of ${c.length} colliders outside the polygon (${far.length} more than 8 m from it)`);
      ok(none === 0 && part <= 2 && whole >= 18, `campus rings: ${whole} inside, ${part} straddling, ${none} outside`);
      ok(far.length === 0, `${far.length} colliders of the module stand more than 8 m outside the polygon`);
      ok(M.modules[MODS.kirochnaya].service.campus === true, 'the module does not publish campus: true');
      for (const e of M.modules[MODS.kirochnaya].service.entrances) ok(distRing(campusRing, e.x, e.z) <= (e.clearance || 5) + 2, `the gate (${e.x}, ${e.z}) is ${distRing(campusRing, e.x, e.z).toFixed(1)} m from the polygon`);
    });
  }
}

console.log(fails ? `RESULT: FAIL (${fails} failed, ${passes} passed)` : `RESULT: OK (${passes} checks)`);
if (!opt('keep')) fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fails ? 1 : 0);
