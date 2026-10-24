// tools/north-hooks-test.mjs - the CPU CONTRACT TEST of the hook set of milestone M6 (docs/AREAS.md section 9): HOOKS and HEIGHT_PATCHES of the area modules, the factories of src/areas/north/hooks.js, the Paradny deck,
// the validation of the tables (lib/area-tables.js) and a TEXT check of the engine files. Written against the FROZEN CONTRACT. It needs no three.js, so it is a CI step; it does NOT run the engine: the
// behaviour of the call sites (trees, tufts, props, ways, parking, heightAt, handling, nav, sim) is proved by the engine tests of `npm run hooks:all` (local, needs `npm ci`), see docs/AREAS.md 9.6.
//   node tools/area.mjs north tools/north-hooks-test.mjs            (npm run hooks)        [--source <dir>] the source repository for the optional Paradny equality (else $PITER_SRC, else D:/git2/agi-fun-tests/102_3d_piter; skipped when absent)
//   node tools/area.mjs north tools/north-hooks-test.mjs --write-paradny-golden            rewrites tools/golden/paradny-deck.json from hooks/paradny.js (only after a deliberate change, with the source repository present)
// Groups:  strip     the strip's HOOKS is {} and HEIGHT_PATCHES is [] (a child process WITHOUT the remap: the area module of the strip, area-tables, heightAt)
//          contract  the North's HOOKS has exactly the eight keys of the contract, their types; deckServices; HEIGHT_PATCHES shape; the area module loads without the remap (child process)
//          gating    every (ctx) factory returns null for a ctx whose buildList lacks the modules it serves (absent list, empty list, other modules) and a function for each served module; parkingReject / HEIGHT_PATCHES by MODULES
//          probes    the factories fire at the fixed probes (podium (900, -1000), campus (1230, -1150), Suvorov (1413, -1217), Smolny (2380, -1833) and (2460, -1543)) and ONLY inside their declared regions: grids around
//                    every place and a coarse lattice over the whole play area, against independent oracles (rectangles, the embedded CAMPUS of landmarksKirochnaya/groups.js, the garden ring of the facade)
//          data      the Paradny literals equal the North facade STEPS; the podium ring, box, flights, landings; the deck ramps; the garden ring = GREEN r1582734; the Paradny golden (tools/golden/paradny-deck.json:
//                    flights, landings, deck heights on a 0.25 m lattice: the port is pinned WITHOUT the source repository) and, when the source repository is present, the source module bit for bit
//          height    the height patch gives 3.3 on the podium with 'landmarksTauride' in MODULES and nothing without; layout.heightAt with the module listed (child process with a patched area module)
//          pure      makeHooks / makeHeightPatches are pure (twice = the same), the hooks files import nothing but each other (no three.js, layout.js, data facade)
//          tables    lib/area-tables.js validates HOOKS and HEIGHT_PATCHES: a malformed table does not throw, drops the bad key / patch and warns, naming it (units, and a child with a malformed area module)
//          tools     tools/layout-golden.mjs refuses a dump of the wrong world (AREA=north without the remap writes nothing)
//          static    TEXT checks of the engine sources (no run): each reads its hook through lib/area-tables.js (never from area.js); layout.js gains no export
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import { register } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const argv = process.argv.slice(2);
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
/** the source of a module without its comments (strings and regular expression literals are kept intact: `streets/*.js` inside a // comment must not open a block comment) */
function stripComments(s) {
  let out = '', i = 0, prev = ';';
  const n = s.length;
  while (i < n) {
    const c = s[i], d = s[i + 1];
    if (c === '/' && d === '/') { while (i < n && s[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; out += ' '; continue; }
    if (c === '"' || c === "'" || c === '`') { out += c; i++; while (i < n && s[i] !== c) { if (s[i] === '\\') out += s[i++]; out += s[i++]; } out += c; i++; prev = c; continue; }
    if (c === '/' && '(,=:[!&|?{};'.includes(prev)) {                                // a regular expression literal
      out += c; i++;
      for (let cls = false; i < n;) { const ch = s[i++]; out += ch; if (ch === '\\') { out += s[i++]; continue; } if (ch === '[') cls = true; else if (ch === ']') cls = false; else if (ch === '/' && !cls) break; }
      prev = '/'; continue;
    }
    out += c; if (!/\s/.test(c)) prev = c; i++;
  }
  return out;
}

// ---------------------------------------------------------------- child processes (the parts that must run WITHOUT this process's area remap)
if (argv[0] === '--child') {
  const mode = argv[1], print = (o) => console.log('CHILD ' + JSON.stringify(o));
  const tables = async () => { const T = await imp('src/world/lib/area-tables.js'); return { hooks: Object.keys(T.HOOKS), hookTypes: Object.fromEntries(Object.entries(T.HOOKS).map(([k, v]) => [k, Array.isArray(v) ? 'array' : typeof v])), patches: T.HEIGHT_PATCHES.map((p) => ({ id: p.id, box: p.box })) }; };
  if (mode === 'strip') {                                    // the strip's own area module, no remap
    const A = await imp('src/world/area.js'), L = await imp('src/world/layout.js');
    const T0 = await imp('src/world/lib/area-tables.js');
    print({ id: A.ID, areaHooks: Object.keys(A.HOOKS), areaPatches: A.HEIGHT_PATCHES.length, ownTables: T0.HOOKS === A.HOOKS && T0.HEIGHT_PATCHES === A.HEIGHT_PATCHES, ...(await tables()), h: [L.heightAt(900, -1000), L.heightAt(0, 0)], layoutExports: Object.keys(L).filter((k) => /HOOKS|HEIGHT_PATCHES/.test(k)) });
  } else if (mode === 'north-noremap') {                    // the North's area module loaded as areas-test loads it: no import-map remap (its landmark groups then read the strip facade)
    const A = await imp('src/areas/north/area.js');
    print({ id: A.ID, modules: A.MODULES, keys: Object.keys(A.HOOKS), types: Object.fromEntries(Object.entries(A.HOOKS).map(([k, v]) => [k, Array.isArray(v) ? 'array' : typeof v])), patches: A.HEIGHT_PATCHES.map((p) => ({ id: p.id, box: p.box })) });
  } else if (mode === 'whatif' || mode === 'dormant' || mode === 'malformed') {   // the North with another area module: a data: URL module mapped over src/world/area.js by a data: URL loader hook
    const { REGISTRY } = await imp('src/areas/registry.js');
    const href = (rel) => pathToFileURL(path.join(root, rel)).href, northUrl = href('src/areas/north/area.js'), hooksUrl = href('src/areas/north/hooks.js');
    // whatif:    'landmarksTauride' in the MODULES (appended when absent: since T1 of the Tauride remake the page lists it already), HOOKS and HEIGHT_PATCHES built for that list
    // dormant:   the page's MODULES WITHOUT 'landmarksTauride' (the North of M5 / M6, the former real list), HOOKS and HEIGHT_PATCHES built for that list
    // malformed: the North's area module with a HOOKS and a HEIGHT_PATCHES of the wrong kinds (the table of a hand-written area), and one well-formed patch behind the bad ones
    const whatif = 'data:text/javascript,' + encodeURIComponent(mode === 'whatif' || mode === 'dormant'
      ? `export * from ${JSON.stringify(northUrl)}; import { MODULES as M0 } from ${JSON.stringify(northUrl)}; import { makeHooks, makeHeightPatches } from ${JSON.stringify(hooksUrl)};
      export const MODULES = ${mode === 'whatif' ? "[...new Set([...M0, 'landmarksTauride'])]" : "M0.filter((m) => m !== 'landmarksTauride')"}; export const HOOKS = makeHooks(MODULES); export const HEIGHT_PATCHES = makeHeightPatches(MODULES);`
      : `export * from ${JSON.stringify(northUrl)};
      export const HOOKS = { treeCleared: false, treeReject: 'yes', inGarden: () => true, deckServices: 'landmarksTauride', futureHook: 1 };
      export const HEIGHT_PATCHES = [null, { id: 'nobox', at() { return 9; } }, { id: 'nan', box: [0, 1, 0, NaN], at() { return 9; } }, { id: 'noat', box: [0, 1, 0, 1] }, { id: 'ok', box: [890, 910, -1010, -990], at: () => 7 }];`);
    const entries = Object.entries(REGISTRY.north.remap).map(([k, v]) => [href(k), k === 'src/world/area.js' ? whatif : href(v)]);
    entries.push([href('src/world/area.js'), whatif]);
    const loader = 'let map = new Map(); export async function initialize(d) { map = new Map(d); } export async function resolve(s, c, n) { const r = await n(s, c); const t = map.get(r.url); return t ? { ...r, url: t, shortCircuit: true } : r; }';
    register('data:text/javascript,' + encodeURIComponent(loader), { parentURL: import.meta.url, data: [...new Map(entries)] });
    if (mode === 'malformed') {
      const warns = [], w0 = console.warn; console.warn = (...a) => warns.push(a.join(' '));
      let threw = null, out = {};
      try {
        const T = await imp('src/world/lib/area-tables.js'), L = await imp('src/world/layout.js');
        out = { hookKeys: Object.keys(T.HOOKS).sort(), patchIds: T.HEIGHT_PATCHES.map((p) => p.id), h: [L.heightAt(900, -1000), L.heightAt(0, 0), L.heightAt(2000, -500)] };
      } catch (e) { threw = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); }
      console.warn = w0;
      print({ threw, warns, ...out });
      process.exit(0);
    }
    const L = await imp('src/world/layout.js'), T = await tables(), xs = [], zs = [], h = [];
    for (let x = 700; x <= 1100; x += 4) xs.push(x);
    for (let z = -1260; z <= -820; z += 4) zs.push(z);
    for (const x of xs) for (const z of zs) h.push(Math.round(L.heightAt(x, z) * 1e6) / 1e6);
    print({ ...T, xs: [xs[0], xs[xs.length - 1], 4], zs: [zs[0], zs[zs.length - 1], 4], h, podium: L.heightAt(900, -1000) });
  }
  process.exit(0);
}
const child = (mode) => {
  const env = { ...process.env }; delete env.AREA;
  const out = execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--child', mode], { cwd: root, env, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = out.split('\n').find((l) => l.startsWith('CHILD '));
  if (!line) throw new Error('child ' + mode + ' printed no CHILD line:\n' + out.slice(0, 500));
  return JSON.parse(line.slice(6));
};

// ---------------------------------------------------------------- harness
let n = 0, failed = 0, group = '?';
const byGroup = {};
const check = (name, ok, detail = '') => { n++; const g = (byGroup[group] = byGroup[group] || { ok: 0, bad: [] }); if (ok) g.ok++; else { failed++; g.bad.push(name); } console.log((ok ? 'ok   ' : 'FAIL ') + `[${group}] ${name}` + (!ok && detail ? '  -- ' + detail : '')); };
const section = (g) => { group = g; };
const guard = async (name, fn) => { try { await fn(); } catch (e) { check(name + ' (threw)', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bag = () => { const b = { n: 0, bad: [] }; b.add = (ok, what) => { b.n++; if (!ok) b.bad.push(what); }; b.fin = (name) => check(name + ` (${b.n} probes)`, b.bad.length === 0, b.bad.length + ' wrong, e.g. ' + b.bad.slice(0, 4).join('; ')); return b; };

const AREA = process.env.AREA || 'strip';
if (AREA !== 'north') { console.log('usage: node tools/area.mjs north tools/north-hooks-test.mjs   (AREA=' + AREA + ')'); process.exit(2); }
const A = await imp('src/world/area.js'), T = await imp('src/world/lib/area-tables.js');
const L = await imp('src/world/layout.js'), C = await imp('src/world/data/city.js');
const H = await imp('src/areas/north/hooks.js'), P = await imp('src/areas/north/hooks/paradny.js'), GH = await imp('src/world/landmarksTauride/height.js');
const KO = await imp('src/areas/north/hooks/keep-out.js'), HG = await imp('src/areas/north/hooks/height.js'), HP = await imp('src/areas/north/hooks/people.js');
const { CAMPUS, inCampus } = await imp('src/world/landmarksKirochnaya/groups.js');
const MODULES = A.MODULES, TAURIDE = 'landmarksTauride';

// ---------------------------------------------------------------- the Paradny golden (tools/golden/paradny-deck.json): the stair geometry pinned WITHOUT the source repository
// FLIGHTS, LANDINGS, Y and BOX of hooks/paradny.js (rounded to 1e-6) and paradnyDeckY on a fixed 0.25 m lattice (off the integer grid), as the count of deck points, the sum and the hash of the heights quantised to 0.1 mm.
// It is a snapshot of THIS module, taken while it equalled the source module bit for bit (the optional `source` check below); regenerate it only after a deliberate change of paradny.js:
//   node tools/area.mjs north tools/north-hooks-test.mjs --write-paradny-golden        (then run the test with the source repository present)
const GOLDEN_FILE = 'tools/golden/paradny-deck.json', Q = 1e4;
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const round6 = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === 'number' ? r6(x) : x)));
const lattice = (spec) => {
  const q = new Int32Array(spec.nx * spec.nz); let k = 0, deck = 0, sumQ = 0;
  for (let i = 0; i < spec.nx; i++) for (let j = 0; j < spec.nz; j++) { const y = P.paradnyDeckY(spec.x0 + i * spec.step, spec.z0 + j * spec.step); if (y === null) q[k++] = -2147483648; else { const v = Math.round(y * Q); q[k++] = v; deck++; sumQ += v; } }
  return { points: q.length, deck, sumQ, hash: createHash('sha256').update(Buffer.from(q.buffer, q.byteOffset, q.byteLength)).digest('hex').slice(0, 16) };
};
if (argv.includes('--write-paradny-golden')) {
  const B = P.PARADNY_BOX, step = 0.25, x0 = r6(B[0] - 2 + 0.0371), z0 = r6(B[2] - 2 + 0.0529), nx = Math.floor((B[1] + 2 - x0) / step) + 1, nz = Math.floor((B[3] + 2 - z0) / step) + 1;
  const spec = { x0, z0, step, nx, nz }, g = { schema: 1, what: 'Paradny deck of src/areas/north/hooks/paradny.js, pinned without the source repository (tools/north-hooks-test.mjs, group data)',
    regenerate: 'node tools/area.mjs north tools/north-hooks-test.mjs --write-paradny-golden', source: '102_3d_piter@0568f7af src/world/landmarksTauride/paradny-surface.js',
    y: P.PARADNY_Y, box: round6(P.PARADNY_BOX), landings: round6(P.PARADNY_LANDINGS), flights: round6(P.PARADNY_FLIGHTS), lattice: { ...spec, quantum: 1 / Q, ...lattice(spec) } };
  const j = JSON.stringify, rows = (a) => '[\n  ' + a.map((o) => j(o)).join(',\n  ') + '\n ]';                      // one flight / landing per line: a diff of the golden reads
  fs.writeFileSync(path.join(root, GOLDEN_FILE), '{\n' + Object.entries(g).map(([k, v]) => ` ${j(k)}: ${Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' && !Array.isArray(v[0]) ? rows(v) : j(v)}`).join(',\n') + '\n}\n');
  console.log(`wrote ${GOLDEN_FILE}: ${g.flights.length} flights, ${g.landings.length} landings, lattice ${nx} x ${nz} = ${g.lattice.points} points, ${g.lattice.deck} on the deck, hash ${g.lattice.hash}`);
  process.exit(0);
}

// ---------------------------------------------------------------- independent oracles
/** even-odd ring test over [x, z, ...] */
const ringHas = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) c = !c; return c; };
const ringDist = (o, x, z) => { let d = 1e9; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const dx = o[i] - o[j], dz = o[i + 1] - o[j + 1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - o[j]) * dx + (z - o[j + 1]) * dz) / l2)); d = Math.min(d, Math.hypot(o[j] + dx * t - x, o[j + 1] + dz * t - z)); } return d; };
const rectHas = (b, x, z) => x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3];
const rectDist = (b, x, z) => Math.min(Math.abs(x - b[0]), Math.abs(x - b[1]), Math.abs(z - b[2]), Math.abs(z - b[3]));
/** the podium ring of the source (paradny-surface.js, commit 0568f7af): a literal of THIS test, so that an edit of hooks/paradny.js is noticed */
const PODIUM = [744, -884, 741, -970, 777, -995, 777, -1095, 839, -1095, 840, -1137, 978, -1137, 983, -1205, 1055, -1203, 1041, -905, 974, -898, 965, -881, 900, -873, 820, -875];
const CAMPUS_RING = CAMPUS.flat();                                                  // landmarksKirochnaya/groups.js (M5): the embedded polygon of keep-out.js must equal it
const SUVOROV = [1384, 1442, -1226, -1208];                                          // the Suvorov strip (source trees.js plant())
const SMOLNY_A = [2320, 2440, -1847, -1820], SMOLNY_B = [2400, 2520, -1553, -1533];   // Smolny's mapped ceremonial approaches (source trees.js cleared())
const PARTERRE = [1356, 1436, -1660, -1598];                                         // the palace parterre of the Tauride remake (T5 fix round 1: hooks/keep-out.js PALACE_PARTERRE, a soft clearing in front of the palace's garden front)
const PROBES = { podium: [900, -1000], campus: [1230, -1150], suvorov: [1413, -1217], smolnyA: [2380, -1833], smolnyB: [2460, -1543], garden: [1200, -1500], parterre: [1380, -1630], nursery: [1040, -1700] };
/** the Tauride Garden park ring of the facade (GREEN r1582734), the independent oracle of the T5 'garden' reason of treeReject */
const GARDEN_PARK = C.GREEN.find((q) => q.id === 'r1582734').polys[0].o;
/** T8b: the ring of the garden nursery lot, an INDEPENDENT literal copy of landmarksTauride/data/nursery.js LOT_RING (this test pins the equality below): the lot north-west of the garden between Potemkinskaya, Shpalernaya and the garden fence */
const LOT_LIT = [938.4, -1819.1, 940.6, -1821.0, 943.1, -1822.4, 945.8, -1822.9, 950.9, -1823.0, 955.4, -1822.7, 969.3, -1822.4, 969.6, -1797.5, 1104.3, -1797.5, 1104.3, -1788.6, 1113.4, -1788.1, 1112.2, -1737.8, 1112.8, -1618.5, 1101.2, -1600.0, 1080.6, -1600.6, 982.4, -1604.2, 982.0, -1595.5, 931.7, -1597.0, 934.6, -1649.2, 936.3, -1692.9, 938.6, -1741.2, 938.9, -1751.9];
const EPS = 0.3;                                                                     // boundaries are not probed: an answer within 0.3 m of an edge is not graded
const S = { sm: 'landmarksSmolny', su: 'landmarksSuvorov', ki: 'landmarksKirochnaya', ta: TAURIDE };
/** expected answers for the build list `bl` at (x, z); null = not graded (on an edge) */
const near = (x, z) => rectDist(SMOLNY_A, x, z) < EPS && (rectHas([SMOLNY_A[0] - EPS, SMOLNY_A[1] + EPS, SMOLNY_A[2] - EPS, SMOLNY_A[3] + EPS], x, z))
  || rectDist(SMOLNY_B, x, z) < EPS && rectHas([SMOLNY_B[0] - EPS, SMOLNY_B[1] + EPS, SMOLNY_B[2] - EPS, SMOLNY_B[3] + EPS], x, z)
  || rectDist(SUVOROV, x, z) < EPS && rectHas([SUVOROV[0] - EPS, SUVOROV[1] + EPS, SUVOROV[2] - EPS, SUVOROV[3] + EPS], x, z)
  || rectDist(PARTERRE, x, z) < EPS && rectHas([PARTERRE[0] - EPS, PARTERRE[1] + EPS, PARTERRE[2] - EPS, PARTERRE[3] + EPS], x, z)
  || ringDist(PODIUM, x, z) < EPS || ringDist(CAMPUS_RING, x, z) < EPS || ringDist(GARDEN_PARK, x, z) < EPS;
const expect = {
  treeCleared: (bl, x, z) => (bl.includes(S.sm) && (rectHas(SMOLNY_A, x, z) || rectHas(SMOLNY_B, x, z))) || (bl.includes(S.ta) && rectHas(PARTERRE, x, z)),      // T5 fix round 1: the palace parterre is cleared with landmarksTauride
  treeReject: (bl, x, z) => (bl.includes(S.ta) && ringHas(PODIUM, x, z) ? 'paradny' : bl.includes(S.ta) && ringHas(GARDEN_PARK, x, z) ? 'garden' : bl.includes(S.ta) && ringHas(LOT_LIT, x, z) ? 'nursery' : bl.includes(S.ki) && ringHas(CAMPUS_RING, x, z) ? 'campus' : bl.includes(S.su) && rectHas(SUVOROV, x, z) ? 'suvorov' : null),      // T5: 'garden' = the OSM park ring of the facade (the garden plants its own trees, the 7 mapped ones too)
  tuftReject: (bl, x, z) => (bl.includes(S.ta) && (ringHas(PODIUM, x, z) || ringHas(LOT_LIT, x, z))) || (bl.includes(S.ki) && ringHas(CAMPUS_RING, x, z)),      // T8b: no grass tufts on the nursery's earth
  propReject: (bl, x, z) => bl.includes(S.ta) && (ringHas(PODIUM, x, z) || ringHas(LOT_LIT, x, z)),      // T8b: no bench / bin / kiosk stamped in the nursery lot
};
/** the modules each (ctx) factory serves (docs/AREAS.md 9.1) */
const SERVES = { treeCleared: [S.sm, S.ta], treeReject: [S.ta, S.ki, S.su], tuftReject: [S.ta, S.ki], propReject: [S.ta], pedestrianOnly: [S.ta] };
const FACTORIES = Object.keys(SERVES);
const OTHER = ['environment', 'landmarksNorthFull', 'landmarksD', 'landmarksOktyabrsky', 'streets', 'city', 'props', 'traffic', 'people', 'wildlife', 'drive'];
const grids = (() => {                                                                // points: a grid round every place (step 6 m, offset .37) and a coarse lattice over the play area (step 41.3 m)
  const pts = [], add = (x, z) => pts.push([x, z]);
  for (const b of [[741, 1055, -1205, -873], [1110, 1343.1, -1242.2, -1047], SUVOROV, SMOLNY_A, SMOLNY_B]) for (let x = b[0] - 40; x <= b[1] + 40; x += 6) for (let z = b[2] - 40; z <= b[3] + 40; z += 6) add(x + 0.37, z + 0.37);
  const W = L.WORLD.play; for (let x = W.x0 - 100; x <= W.x1 + 100; x += 41.3) for (let z = W.z0 - 100; z <= W.z1 + 100; z += 41.3) add(x + 0.37, z + 0.37);
  for (const [x, z] of Object.values(PROBES)) add(x, z);
  return pts;
})();

// ================================================================ strip
section('strip');
await guard('strip child', async () => {
  const s = child('strip');
  check('the strip area module is the strip', s.id === 'strip', s.id);
  check('strip: area.js HOOKS is {} and HEIGHT_PATCHES is []', eq(s.areaHooks, []) && s.areaPatches === 0, JSON.stringify([s.areaHooks, s.areaPatches]));
  check('strip: lib/area-tables.js gives HOOKS {} and HEIGHT_PATCHES []', eq(s.hooks, []) && s.patches.length === 0, JSON.stringify([s.hooks, s.patches]));
  check('strip: heightAt is the old line (street level 0 at the probes)', s.h[0] === 0 && s.h[1] === 0, JSON.stringify(s.h));
  check('strip: layout.js exports neither HOOKS nor HEIGHT_PATCHES', s.layoutExports.length === 0, s.layoutExports.join());
  check('strip: lib/area-tables.js hands out the area module\'s own {} and [] (a well-formed table is not copied)', s.ownTables === true, String(s.ownTables));
});

// ================================================================ contract
section('contract');
const KEYS = ['treeCleared', 'treeReject', 'tuftReject', 'propReject', 'pedestrianOnly', 'parkingReject', 'carKeepOut', 'inGarden', 'deckServices', 'doorServices', 'groundHoles', 'groundWayReject', 'waterBodies', 'noLanding', 'duckPonds', 'deckUnderside'];
const HK = T.HOOKS;
check('north: HOOKS has exactly the sixteen keys of the contract (T2 added carKeepOut, T3 groundHoles and groundWayReject, T4a waterBodies, T4a fix 1 noLanding, T4b duckPonds, T7 doorServices, T8a deckUnderside)', eq(Object.keys(HK).sort(), [...KEYS].sort()), Object.keys(HK).join());
check('north: area-tables HOOKS is the area module HOOKS (same keys)', eq(Object.keys(HK).sort(), Object.keys(A.HOOKS).sort()));
for (const k of FACTORIES) check(`north: HOOKS.${k} is a factory (function of ctx)`, typeof HK[k] === 'function' && HK[k].length <= 1, typeof HK[k] + '/' + (HK[k] && HK[k].length));
check('north: HOOKS.inGarden is a function of (x, z)', typeof HK.inGarden === 'function' && HK.inGarden.length === 2, typeof HK.inGarden + '/' + (HK.inGarden && HK.inGarden.length));
check('north: HOOKS.deckServices is ["landmarksTauride"], frozen', eq(HK.deckServices, [TAURIDE]) && Object.isFrozen(HK.deckServices), JSON.stringify(HK.deckServices) + ' frozen ' + Object.isFrozen(HK.deckServices));
// TRIPWIRES FLIPPED in T1 of the Tauride remake (docs/TAURIDE-REMAKE.md 12): the next two checks used to accept both states of the page's module list; landmarksTauride is in MODULES now, so the active branch is the only one that passes
// (the gated-by-MODULES behaviour of both hooks is still proved with synthetic lists in the `gating` group and by the `dormant` child of the `height` group).
check('north: landmarksTauride is in the North MODULES (T1 of the Tauride remake) and HOOKS.parkingReject is a function', MODULES.includes(TAURIDE) && typeof HK.parkingReject === 'function', MODULES.includes(TAURIDE) + ' ' + typeof HK.parkingReject);
check('north: HEIGHT_PATCHES is an array shaped { id, box[4], at() }', Array.isArray(T.HEIGHT_PATCHES) && T.HEIGHT_PATCHES.every((p) => typeof p.id === 'string' && Array.isArray(p.box) && p.box.length === 4 && p.box[0] < p.box[1] && p.box[2] < p.box[3] && typeof p.at === 'function'));
check('north: HEIGHT_PATCHES is the Paradny patch first (landmarksTauride is in MODULES since T1)', MODULES.includes(TAURIDE) && T.HEIGHT_PATCHES[0]?.id === 'paradny', T.HEIGHT_PATCHES.map((p) => p.id).join());
check('north: the MODULES list parsed by tools/modules-list.mjs is the one of the area module', eq((await imp('tools/modules-list.mjs')).mainModules('north'), MODULES));
await guard('north child', async () => {
  const c = child('north-noremap');
  check('the North area module loads without the remap (child process)', c.id === 'north' && eq(c.keys.sort(), [...KEYS].sort()), JSON.stringify(c.keys));
  check('without the remap: the same module list, factory / function types and an empty patch list', eq(c.modules, MODULES) && eq(c.types, Object.fromEntries(Object.keys(c.types).map((k) => [k, Array.isArray(HK[k]) ? 'array' : typeof HK[k]]))) && c.patches.length === T.HEIGHT_PATCHES.length, JSON.stringify(c.types));
});

// ================================================================ gating
section('gating');
const ctxOf = (bl) => (bl === undefined ? {} : { buildList: bl });
const VARIANTS = [['absent buildList', undefined], ['empty buildList', []], ['other modules only', OTHER], ['buildList undefined', 'u']];
for (const k of FACTORIES) {
  for (const [label, bl] of VARIANTS) check(`${k}: null for ${label}`, HK[k](bl === 'u' ? { buildList: undefined } : ctxOf(bl)) === null, String(HK[k](ctxOf(bl))));
  for (const m of [S.sm, S.su, S.ki, S.ta]) {
    const f = HK[k](ctxOf([...OTHER, m]));
    check(`${k}: ${SERVES[k].includes(m) ? 'a function' : 'null'} when only ${m} is built`, SERVES[k].includes(m) ? typeof f === 'function' : f === null, String(f));
  }
  check(`${k}: null when only the modules it does not serve are built`, HK[k](ctxOf([...OTHER, ...Object.values(S).filter((m) => !SERVES[k].includes(m))])) === null);
  check(`${k}: the result is a predicate of (x, z) / (way)`, (() => { const f = HK[k](ctxOf(Object.values(S))); return typeof f === 'function' && f.length === (k === 'pedestrianOnly' ? 1 : 2); })());
}
check('parkingReject is gated by MODULES: makeHooks([landmarksTauride]) has a function, makeHooks(OTHER) has none', typeof H.makeHooks([...OTHER, TAURIDE]).parkingReject === 'function' && H.makeHooks(OTHER).parkingReject === undefined,
  typeof H.makeHooks([...OTHER, TAURIDE]).parkingReject + ' / ' + typeof H.makeHooks(OTHER).parkingReject);
check('carKeepOut (T2) is gated by MODULES: a function with landmarksTauride, undefined without; it is the garden ring (inGarden) with no exception: true inside the outline, false outside, on 40,000 probes of the garden box + 40 m', (() => { const on = H.makeHooks([...OTHER, TAURIDE]).carKeepOut, off = H.makeHooks(OTHER).carKeepOut, off2 = H.makeHooks(undefined).carKeepOut; if (typeof on !== 'function' || off !== undefined || off2 !== undefined) return false; let bad = 0; for (let i = 0; i < 40000; i++) { const x = 877 + ((i * 7919) % 200) * 3.3, z = -1830 + (Math.floor(i / 200)) * 2.6; if (on(x, z) !== HK.inGarden(x, z)) bad++; } return bad === 0 && on(1226, -1268.5) === true && on(1226, -1260) === false && on(NaN, 0) === false; })(), typeof H.makeHooks([...OTHER, TAURIDE]).carKeepOut + ' / ' + typeof H.makeHooks(OTHER).carKeepOut);
check('makeHooks always has the sixteen keys (a gated parkingReject / carKeepOut / groundHoles / groundWayReject / waterBodies / noLanding / duckPonds / deckUnderside is a key with the value undefined)', eq(Object.keys(H.makeHooks(OTHER)).sort(), [...KEYS].sort()) && eq(Object.keys(H.makeHooks([...OTHER, TAURIDE])).sort(), [...KEYS].sort()));
check('duckPonds (T4b) is gated by MODULES: a function with landmarksTauride, undefined without; it answers the water level of data/ponds.js, four rings with the water on the left, the six deck keep-outs and the exact shore distance', (() => { const on = H.makeHooks([...OTHER, TAURIDE]).duckPonds, off = H.makeHooks(OTHER).duckPonds; if (typeof on !== 'function' || off !== undefined) return false; const d = on(); return d.y === -0.45 && d.rings.length === 4 && d.keepOut.length === 6 && typeof d.shoreDist === 'function' && d.shoreDist(1405, -1560) < -10 && d.shoreDist(1100, -1400) > 10 && d.margin >= 3 && d.offset > d.margin; })());
check('makeHeightPatches is gated by MODULES: [] without landmarksTauride, [paradny, garden] with it (T2)', H.makeHeightPatches(OTHER).length === 0 && H.makeHeightPatches([...OTHER, TAURIDE]).length === 2 && H.makeHeightPatches([...OTHER, TAURIDE]).map((p) => p.id).join() === 'paradny,garden',
  H.makeHeightPatches(OTHER).length + ' / ' + H.makeHeightPatches([...OTHER, TAURIDE]).length);
check('makeHooks does not change the other keys with the module list (only parkingReject, carKeepOut, groundHoles, groundWayReject, waterBodies, noLanding, duckPonds and deckUnderside)', (() => { const a = H.makeHooks(OTHER), b = H.makeHooks([...OTHER, TAURIDE]); return Object.keys(a).filter((k) => k !== 'parkingReject' && k !== 'carKeepOut' && k !== 'groundHoles' && k !== 'groundWayReject' && k !== 'waterBodies' && k !== 'noLanding' && k !== 'duckPonds' && k !== 'deckUnderside').every((k) => a[k] === b[k] || (Array.isArray(a[k]) && eq(a[k], b[k]))); })());

// ================================================================ probes
section('probes');
const LISTS = { all: Object.values(S), 'smolny only': [S.sm], 'suvorov only': [S.su], 'kirochnaya only': [S.ki], 'tauride only': [S.ta], 'north M5 (smolny, suvorov, kirochnaya)': [S.sm, S.su, S.ki] };
for (const [label, bl] of Object.entries(LISTS)) {
  for (const k of ['treeCleared', 'treeReject', 'tuftReject', 'propReject']) {
    const f = HK[k](ctxOf([...OTHER, ...bl])), b = bag();
    if (f) for (const [x, z] of grids) { if (near(x, z)) continue; const want = expect[k](bl, x, z), got = f(x, z); b.add(got === want, `(${x.toFixed(1)}, ${z.toFixed(1)}) ${JSON.stringify(got)} != ${JSON.stringify(want)}`); }
    else b.add(!SERVES[k].some((m) => bl.includes(m)), 'null although a served module is built');
    b.fin(`${k} [${label}] fires inside its regions and nowhere else`);
  }
}
for (const [name, [x, z]] of Object.entries(PROBES)) {
  const all = ctxOf([...OTHER, ...Object.values(S)]), want = { podium: ['paradny', false, true, true], campus: ['campus', false, true, false], suvorov: ['suvorov', false, false, false], smolnyA: [null, true, false, false], smolnyB: [null, true, false, false], garden: ['garden', false, false, false], parterre: [null, true, false, false], nursery: ['nursery', false, true, true] }[name];
  const call = (k, ...a) => { const f = HK[k](all); return f ? f(...a) : '(factory is null)'; };
  const got = [call('treeReject', x, z), call('treeCleared', x, z), call('tuftReject', x, z), call('propReject', x, z)];
  check(`probe ${name} (${x}, ${z}): treeReject ${want[0]}, treeCleared ${want[1]}, tuftReject ${want[2]}, propReject ${want[3]}`, eq(got, want), JSON.stringify(got));
}
{
  const f = HK.pedestrianOnly(ctxOf([...OTHER, TAURIDE]));
  const way = (rank, pts) => ({ rank, x: pts.map((p) => p[0]), z: pts.map((p) => p[1]) });
  const inside = [[900, -1000], [905, -1004], [912, -1010], [880, -1000], [870, -980]], outside = [[2380, -1833], [1230, -1150], [1413, -1217], [300, -700], [500, -900]];
  const mix = (k) => way(0, [...inside.slice(0, k), ...outside.slice(0, 5 - k)]);
  if (f) {
    check('pedestrianOnly: a rank-0 way inside the podium is pedestrian-only', f(way(0, inside)) === true);
    check('pedestrianOnly: a rank-1 way inside the podium is not (rank must be 0)', f(way(1, inside)) === false && f(way(2, inside)) === false && f(way(4, inside)) === false);
    check('pedestrianOnly: more than 60 % of the points inside (4 of 5 yes, 3 of 5 no, 2 of 5 no)', f(mix(4)) === true && f(mix(3)) === false && f(mix(2)) === false, [f(mix(4)), f(mix(3)), f(mix(2))].join());
    const many = (k) => way(0, Array.from({ length: 20 }, (_, i) => (i < k ? [900 + i, -1000 - i] : [100 + i, -100])));            // 20 vertices: the fractions the 5-vertex fixtures cannot give
    check('pedestrianOnly: 13 of 20 vertices (65 %) is pedestrian-only (a threshold of 0.7 would refuse it); 12 of 20 (60 %) and 11 of 20 (55 %) are not', f(many(13)) === true && f(many(12)) === false && f(many(11)) === false && P.inParadny(900 + 12, -1000 - 12), [f(many(13)), f(many(12)), f(many(11))].join());
    check('pedestrianOnly: a rank-0 way at Smolny / the campus / Suvorov is not', f(way(0, outside)) === false && f(way(0, [[2380, -1833], [2390, -1830]])) === false && f(way(0, [[1230, -1150], [1240, -1150]])) === false);
    check('pedestrianOnly: the answer is a boolean, also for a way without points', f(way(0, inside)) === true && f(way(0, outside)) === false && f({ rank: 0, x: [], z: [] }) === false);
  } else { check('pedestrianOnly: the factory yields a predicate when landmarksTauride is built', false, 'null'); }
}
{
  const pk = H.makeHooks([...MODULES, TAURIDE]).parkingReject, b = bag();
  if (typeof pk === 'function') for (const [x, z] of grids) { if (near(x, z)) continue; b.add(pk(x, z) === ringHas(PODIUM, x, z), `(${x.toFixed(1)}, ${z.toFixed(1)}) ${pk(x, z)}`); } else b.add(false, 'parkingReject is not a function');
  b.fin('parkingReject (makeHooks with landmarksTauride) is true inside the podium and nowhere else');
}
{
  const g = HK.inGarden, park = C.GREEN.find((q) => q.id === 'r1582734');                // the OSM park of the Tauride Garden: one ring, no holes
  const b = bag(), o = park && park.polys[0] ? park.polys[0].o : [], bb = o.length ? o.reduce((a, v, i) => (i % 2 ? [a[0], a[1], Math.min(a[2], v), Math.max(a[3], v)] : [Math.min(a[0], v), Math.max(a[1], v), a[2], a[3]]), [1e9, -1e9, 1e9, -1e9]) : [0, 0, 0, 0];
  for (let x = bb[0] - 60; x <= bb[1] + 60; x += 9) for (let z = bb[2] - 60; z <= bb[3] + 60; z += 9) { const px = x + 0.41, pz = z + 0.29; if (ringDist(o, px, pz) < EPS) continue; b.add(g(px, pz) === ringHas(o, px, pz), `(${px.toFixed(1)}, ${pz.toFixed(1)}) ${g(px, pz)}`); }
  for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length, mx = (o[i] + o[j]) / 2, mz = (o[i + 1] + o[j + 1]) / 2, dx = o[j] - o[i], dz = o[j + 1] - o[i + 1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    for (const s of [-1, 1]) { const px = mx + nx * 0.6 * s, pz = mz + nz * 0.6 * s; if (ringDist(o, px, pz) < 0.4) continue; b.add(g(px, pz) === ringHas(o, px, pz), `edge ${i / 2} side ${s}`); } }
  b.fin('inGarden equals the ring of GREEN r1582734 (lattice over its box, 0.6 m either side of every edge)');
  check('inGarden is false far from the garden (Chernyshevskaya, Smolny, the campus, the podium)', [[461, -1350], [2425, -1833], [1230, -1150], [900, -1000], [-300, -300]].every(([x, z]) => g(x, z) === false), [[461, -1350], [2425, -1833], [1230, -1150], [900, -1000]].map(([x, z]) => g(x, z)).join());
  check('inGarden is true in the middle of the garden', [[1200, -1500], [1100, -1400]].every(([x, z]) => ringHas(o, x, z) === g(x, z)) && g(1200, -1500) === ringHas(o, 1200, -1500), String(g(1200, -1500)));
}

// ================================================================ data
section('data');
await guard('paradny data', async () => {
  const fac = C.STEPS, ids = P.PARADNY_STEPS.map((s) => s.id);
  const rec = ids.map((id) => fac.find((s) => s.id === id));
  check('PARADNY_STEPS: every id is a STEPS record of the North facade', rec.every(Boolean), ids.filter((id, i) => !rec[i]).join());
  check('PARADNY_STEPS: the polylines equal the facade (pts)', P.PARADNY_STEPS.every((s, i) => rec[i] && eq(s.pts, rec[i].pts)), P.PARADNY_STEPS.filter((s, i) => !rec[i] || !eq(s.pts, rec[i].pts)).map((s) => s.id).join());
  check('PARADNY_STEPS: in the order of the data', eq(ids.map((id) => fac.findIndex((s) => s.id === id)), ids.map((id) => fac.findIndex((s) => s.id === id)).slice().sort((a, b) => a - b)) && ids.length === 9, ids.map((id) => fac.findIndex((s) => s.id === id)).join());
  check('PARADNY_PODIUM equals the ring of the source (literal of this test), no holes', eq(P.PARADNY_PODIUM.o, PODIUM) && eq(P.PARADNY_PODIUM.h, []), P.PARADNY_PODIUM.o.length + ' numbers');
  check('PARADNY_Y is 3.3', P.PARADNY_Y === 3.3);
  check('stairs, flights, landings: 8 stairs of width 1.8 (w1303266326 spliced into w1266791538), 16 flights, 16 landings', P.PARADNY_STAIRS.length === 8 && P.PARADNY_STAIRS.every((s) => s.w === 1.8) && P.PARADNY_FLIGHTS.length === 16 && P.PARADNY_LANDINGS.length === 16 && !P.PARADNY_STAIRS.some((s) => s.id === 'w1303266326'));
  const box = (() => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; const add = (x, z, m) => { x0 = Math.min(x0, x - m); x1 = Math.max(x1, x + m); z0 = Math.min(z0, z - m); z1 = Math.max(z1, z + m); };
    for (let i = 0; i < PODIUM.length; i += 2) add(PODIUM[i], PODIUM[i + 1], 0); for (const p of P.PARADNY_LANDINGS) add(p.x, p.z, p.w / 2 + .01); for (const r of P.PARADNY_FLIGHTS) for (let i = 0; i < r.pts.length; i += 2) add(r.pts[i], r.pts[i + 1], r.w / 2 + .01); return [x0, x1, z0, z1]; })();
  check('PARADNY_BOX is the box of the ring, landings and flights ([741, 1058.51, -1205, -873])', P.PARADNY_BOX.every((v, i) => Math.abs(v - box[i]) < 1e-9) && Math.abs(P.PARADNY_BOX[1] - 1058.51) < 1e-9 && P.PARADNY_BOX[0] === 741 && P.PARADNY_BOX[2] === -1205 && P.PARADNY_BOX[3] === -873, JSON.stringify(P.PARADNY_BOX));
  check('inParadny equals the independent ring test (lattice 3 m over the box, edges not graded)', (() => { let bad = 0; for (let x = 730; x <= 1070; x += 3.01) for (let z = -1215; z <= -860; z += 3.01) { if (ringDist(PODIUM, x, z) < EPS) continue; if (P.inParadny(x, z) !== ringHas(PODIUM, x, z)) bad++; } return bad === 0; })());
  check('the probe (900, -1000) stands on the podium: 3.3 m', P.paradnyDeckY(900, -1000) === 3.3 && P.inParadny(900, -1000), String(P.paradnyDeckY(900, -1000)));
  check('paradnyDeckY is null at Smolny, the campus, Suvorov and the box corners outside the ring', [[2380, -1833], [1230, -1150], [1413, -1217], [742, -874], [1056, -1204], [700, -900], [1100, -1000]].every(([x, z]) => P.paradnyDeckY(x, z) === null), [[2380, -1833], [1230, -1150], [742, -874]].map(([x, z]) => P.paradnyDeckY(x, z)).join());
  check('the deck is 3.3 m on the podium and never above it', (() => { let max = 0, bad = 0; for (let x = 735; x <= 1062; x += 1.7) for (let z = -1210; z <= -870; z += 1.7) { const y = P.paradnyDeckY(x, z); if (y !== null) { max = Math.max(max, y); if (y < -1e-9) bad++; } } return bad === 0 && max <= 3.3 + 0.02; })());
  for (const s of P.PARADNY_STAIRS) {                                                        // each stair climbs from the street to the podium along its centre line (the source deck dips by up to 8 mm in two flights: 2 cm tolerance)
    let prev = null, first = null, last = null, dip = 0, hole = 0;
    for (let k = 0; k + 3 < s.pts.length; k += 2) for (let t = 0; t <= 1.0001; t += 0.01) { const x = s.pts[k] + (s.pts[k + 2] - s.pts[k]) * t, z = s.pts[k + 1] + (s.pts[k + 3] - s.pts[k + 1]) * t, y = P.paradnyDeckY(x, z); if (y === null) { hole++; continue; } if (first === null) first = y; last = y; if (prev !== null) dip = Math.max(dip, prev - y); prev = y; }
    check(`stair ${s.id}: a monotone ramp from the street (${first === null ? '-' : first.toFixed(2)}) to the podium (${last === null ? '-' : last.toFixed(2)}), no hole on its centre line`, hole === 0 && first !== null && first < 0.35 && last > 3.2 && dip < 0.02, `hole ${hole} dip ${dip.toFixed(3)}`);
  }
});
await guard('paradny golden', async () => {                  // the port pinned without the source repository (CI never has it): flights, landings, the +.015 landing step, the 0.9 m cuts, the widths
  const file = path.join(root, GOLDEN_FILE);
  if (!fs.existsSync(file)) { check(`${GOLDEN_FILE} exists`, false, 'missing; regenerate: node tools/area.mjs north tools/north-hooks-test.mjs --write-paradny-golden'); return; }
  const g = JSON.parse(fs.readFileSync(file, 'utf8')), fl = round6(P.PARADNY_FLIGHTS), ld = round6(P.PARADNY_LANDINGS);
  const where = (a, b) => 'differs at index ' + (a.map((v, i) => (eq(v, b[i]) ? -1 : i)).filter((i) => i >= 0).join() || '(length ' + a.length + ' vs ' + b.length + ')');
  check(`golden: PARADNY_Y and PARADNY_BOX equal ${GOLDEN_FILE}`, P.PARADNY_Y === g.y && eq(round6(P.PARADNY_BOX), g.box), JSON.stringify([P.PARADNY_Y, round6(P.PARADNY_BOX)]) + ' vs ' + JSON.stringify([g.y, g.box]));
  check(`golden: the ${g.landings.length} landings (x, z, y, w) equal ${GOLDEN_FILE}`, eq(ld, g.landings), where(ld, g.landings));
  check(`golden: the ${g.flights.length} flights (id, w, pts, start, end, total) equal ${GOLDEN_FILE}`, eq(fl, g.flights), where(fl, g.flights));
  const t = lattice(g.lattice), w = g.lattice;
  check(`golden: paradnyDeckY on the ${w.nx} x ${w.nz} lattice (${w.step} m) equals ${GOLDEN_FILE}: ${w.deck} deck points, the heights hash to ${w.hash}`, t.points === w.points && t.deck === w.deck && t.sumQ === w.sumQ && t.hash === w.hash,
    `deck ${t.deck} vs ${w.deck}, sum ${t.sumQ} vs ${w.sumQ} (units of ${w.quantum} m), hash ${t.hash} vs ${w.hash}`);
});
await guard('paradny source', async () => {
  const dir = (() => { const i = argv.indexOf('--source'); return i >= 0 ? argv[i + 1] : process.env.PITER_SRC || 'D:/git2/agi-fun-tests/102_3d_piter'; })(), file = path.join(dir, 'src/world/landmarksTauride/paradny-surface.js');          // --source, else $PITER_SRC (as north-people-hooks-test.mjs), else the default checkout
  if (!fs.existsSync(file)) { console.log(`skip [data] Paradny port equals the source module (${file} not found)`); return; }
  const S0 = await import(pathToFileURL(file).href);
  check('source: PARADNY_PODIUM, PARADNY_STAIRS, FLIGHTS, LANDINGS and Y equal the source module (commit 0568f7af)', eq(P.PARADNY_PODIUM, S0.PARADNY_PODIUM) && eq(P.PARADNY_STAIRS.map((s) => [s.id, s.pts, s.w]), S0.PARADNY_STAIRS.map((s) => [s.id, s.pts, s.w])) && eq(P.PARADNY_FLIGHTS, S0.PARADNY_FLIGHTS) && eq(P.PARADNY_LANDINGS, S0.PARADNY_LANDINGS) && P.PARADNY_Y === S0.PARADNY_Y);
  const b = bag(); let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 60000; i++) { const x = 721 + rnd() * 358, z = -1225 + rnd() * 372; b.add(P.paradnyDeckY(x, z) === S0.paradnyDeckY(x, z), `(${x.toFixed(2)}, ${z.toFixed(2)})`); }
  b.fin('source: paradnyDeckY answers bit for bit as the source module does');
});
await guard('paradny twin', async () => {                    // T1 of the Tauride remake: the module landmarksTauride has its OWN copy of the deck logic (paradny-surface.js, verbatim from the source) next to the port of hooks/paradny.js (docs/AREAS.md 9.5 point 4): they must never drift
  const M = await imp('src/world/landmarksTauride/paradny-surface.js');            // needs no three.js: it imports the data facade only (the North's, through the remap of tools/area.mjs)
  check('twin: PARADNY_Y, PARADNY_PODIUM, PARADNY_STAIRS (id, w, pts), PARADNY_FLIGHTS and PARADNY_LANDINGS of landmarksTauride/paradny-surface.js equal hooks/paradny.js', P.PARADNY_Y === M.PARADNY_Y && eq(P.PARADNY_PODIUM, M.PARADNY_PODIUM) && eq(P.PARADNY_STAIRS.map((s) => [s.id, s.pts, s.w]), M.PARADNY_STAIRS.map((s) => [s.id, s.pts, s.w])) && eq(P.PARADNY_FLIGHTS, M.PARADNY_FLIGHTS) && eq(P.PARADNY_LANDINGS, M.PARADNY_LANDINGS));
  const file = path.join(root, GOLDEN_FILE);
  if (fs.existsSync(file)) {                                  // the module's copy against the pinned golden (the same lattice the port is held to: a mutant of either file is caught without the source repository)
    const g = JSON.parse(fs.readFileSync(file, 'utf8')), w = g.lattice, q = new Int32Array(w.nx * w.nz); let k = 0, deck = 0, sumQ = 0;
    for (let i = 0; i < w.nx; i++) for (let j = 0; j < w.nz; j++) { const y = M.paradnyDeckY(w.x0 + i * w.step, w.z0 + j * w.step); if (y === null) q[k++] = -2147483648; else { const v = Math.round(y * Q); q[k++] = v; deck++; sumQ += v; } }
    const hash = createHash('sha256').update(Buffer.from(q.buffer, q.byteOffset, q.byteLength)).digest('hex').slice(0, 16);
    check(`twin: the module's paradnyDeckY on the golden ${w.nx} x ${w.nz} lattice (${w.step} m) hashes to ${w.hash} (${w.deck} deck points)`, q.length === w.points && deck === w.deck && sumQ === w.sumQ && hash === w.hash, `deck ${deck} vs ${w.deck}, sum ${sumQ} vs ${w.sumQ}, hash ${hash} vs ${w.hash}`);
  } else check(`twin: ${GOLDEN_FILE} exists`, false, 'missing');
  const b = bag(), B = P.PARADNY_BOX; let seed = 987654; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let x = B[0] - 3; x <= B[1] + 3; x += 0.5) for (let z = B[2] - 3; z <= B[3] + 3; z += 0.5) b.add(P.paradnyDeckY(x, z) === M.paradnyDeckY(x, z) && P.inParadny(x, z) === M.inParadny(x, z), `(${x}, ${z}) ${P.paradnyDeckY(x, z)} vs ${M.paradnyDeckY(x, z)}`);
  for (let i = 0; i < 60000; i++) { const x = 721 + rnd() * 358, z = -1225 + rnd() * 372; b.add(P.paradnyDeckY(x, z) === M.paradnyDeckY(x, z), `(${x.toFixed(3)}, ${z.toFixed(3)})`); }
  for (const [x, z] of [[NaN, 0], [0, NaN], [1e9, 1e9], [-1e9, 5], [900, -1000], [1058.51, -1000], [741, -873]]) b.add(Object.is(P.paradnyDeckY(x, z), M.paradnyDeckY(x, z)), `edge (${x}, ${z})`);
  b.fin('twin: hooks/paradny.js paradnyDeckY / inParadny answer bit for bit as the module\'s paradny-surface.js on a 0.5 m lattice over the box (+ 3 m) and 60,000 random points');
});
await guard('campus and garden data', async () => {
  const camp = [...CAMPUS_RING], b = bag();
  for (let x = 1090; x <= 1365; x += 1.3) for (let z = -1262; z <= -1030; z += 1.3) { if (ringDist(camp, x, z) < EPS) continue; b.add(inCampus(x, z) === ringHas(camp, x, z), `(${x}, ${z})`); }
  b.fin('landmarksKirochnaya/groups.js inCampus equals the ring of CAMPUS (oracle check)');
  const f = HK.treeReject(ctxOf([...OTHER, S.ki])), c2 = bag();
  if (f) { for (let x = 1090; x <= 1365; x += 1.3) for (let z = -1262; z <= -1030; z += 1.3) { if (ringDist(camp, x, z) < EPS) continue; c2.add((f(x, z) === 'campus') === inCampus(x, z), `(${x.toFixed(1)}, ${z.toFixed(1)}) ${f(x, z)}`); }
    for (let i = 0; i < camp.length; i += 2) { const j = (i + 2) % camp.length, mx = (camp[i] + camp[j]) / 2, mz = (camp[i + 1] + camp[j + 1]) / 2, dx = camp[j] - camp[i], dz = camp[j + 1] - camp[i + 1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
      for (const s of [-1, 1]) for (const [px, pz] of [[mx + nx * 0.6 * s, mz + nz * 0.6 * s], [camp[i] + nx * 0.6 * s - dx / l * 0.6, camp[i + 1] + nz * 0.6 * s - dz / l * 0.6]]) { if (ringDist(camp, px, pz) < 0.4) continue; c2.add((f(px, pz) === 'campus') === inCampus(px, pz), `edge ${i / 2} side ${s}`); } } }
  else c2.add(false, 'treeReject is null with landmarksKirochnaya built');
  c2.fin('the CAMPUS embedded in hooks/keep-out.js equals landmarksKirochnaya/groups.js CAMPUS (lattice 1.3 m, 0.6 m either side of every edge and vertex)');
  if (KO.CAMPUS) check('keep-out.js exports CAMPUS: equal to groups.js', eq(KO.CAMPUS, CAMPUS), JSON.stringify(KO.CAMPUS));
  const g = C.GREEN.find((q) => q.id === 'r1582734');
  check('the facade has GREEN r1582734: the Tauride Garden park, one ring, no holes', !!g && g.kind === 'park' && g.polys.length === 1 && g.polys[0].h.length === 0 && g.polys[0].o.length > 6, g ? `${g.kind} ${g.polys.length} polys` : 'missing');
  if (HP.GARDEN_RING || HP.GARDEN) check('hooks/people.js exports its ring: equal to the facade GREEN ring', eq(HP.GARDEN_RING || HP.GARDEN, g.polys[0].o));
});

await guard('env snapshot rings', async () => {              // tools/north-env-snapshot.mjs is a script (it cannot be imported): its two ring literals are read back from the text
  const txt = read('tools/north-env-snapshot.mjs'), lit = (name) => { const m = new RegExp(`const ${name} = (\\[[^\\]]*\\]);`).exec(txt); return m ? JSON.parse(m[1]) : null; };
  check('tools/north-env-snapshot.mjs: PODIUM_RING equals the podium ring of hooks/paradny.js and of the source', eq(lit('PODIUM_RING'), P.PARADNY_PODIUM.o) && eq(lit('PODIUM_RING'), PODIUM), JSON.stringify(lit('PODIUM_RING')));
  check('tools/north-env-snapshot.mjs: CAMPUS_RING equals CAMPUS of landmarksKirochnaya/groups.js and of hooks/keep-out.js', eq(lit('CAMPUS_RING'), CAMPUS.flat()) && eq(lit('CAMPUS_RING'), KO.CAMPUS.flat()), JSON.stringify(lit('CAMPUS_RING')));
});

// ================================================================ height
section('height');
{
  const withT = H.makeHeightPatches([...OTHER, TAURIDE]), without = H.makeHeightPatches(OTHER);
  const par = withT.find((p) => p && p.id === 'paradny');                                // by id, not by position: a malformed or wide patch in front of it must fail a check, not hang a loop below
  check('height: no patch without landmarksTauride in MODULES', without.length === 0, String(without.length));
  check('height: exactly the Paradny patch, then the garden terrain patch (T2 relief, T4a ponds), with landmarksTauride; the Paradny box of paradny.js, the box of the hills and of the shore band TERRAIN_HULL', withT.length === 2 && withT[0].id === 'paradny' && eq(withT[0].box, P.PARADNY_BOX) && typeof withT[0].at === 'function' && withT[1].id === 'garden' && eq(withT[1].box, GH.TERRAIN_HULL) && withT[1].at === GH.gardenHeight, JSON.stringify(withT.map((p) => p.id)));
  check('height: the Paradny patch gives 3.3 on the podium (900, -1000)', par ? par.at(900, -1000) === 3.3 : false, String(par && par.at(900, -1000)));
  check('height: the patch answers null where the deck is none (Smolny, the campus, a street at the foot of the podium)', par ? [[2380, -1833], [1230, -1150], [1413, -1217], [700, -900], [1100, -1000]].every(([x, z]) => par.at(x, z) === null) : false);
  check('height: the patch equals paradnyDeckY on a lattice over the Paradny box', par ? (() => { let bad = 0; const B = P.PARADNY_BOX; for (let x = B[0] - 2; x <= B[1] + 2; x += 3.7) for (let z = B[2] - 2; z <= B[3] + 2; z += 3.7) if (par.at(x, z) !== P.paradnyDeckY(x, z)) bad++; return bad === 0; })() : false);
  // TRIPWIRE FLIPPED in T1 of the Tauride remake (docs/TAURIDE-REMAKE.md 12): this check used to read "the North as built (no landmarksTauride in MODULES) leaves layout.heightAt at street level on the podium", with an
  // `|| MODULES.includes(TAURIDE)` escape that made it pass either way. The module is in MODULES now: the page's own layout.heightAt is the deck on the podium; the street-level answer is asserted in the `dormant` child below.
  check('height: the North as built (landmarksTauride IS in MODULES since T1) answers the podium deck: heightAt(900, -1000) = 3.3, the street at the foot of the podium stays 0', MODULES.includes(TAURIDE) && L.heightAt(900, -1000) === 3.3 && L.heightAt(1100, -1000) === 0 && L.heightAt(2000, -500) === 0, MODULES.includes(TAURIDE) + ' ' + L.heightAt(900, -1000) + ' ' + L.heightAt(1100, -1000));
}
await guard('dormant child', async () => {
  const d = child('dormant');
  check('dormant (the page\'s MODULES without landmarksTauride, the former real list): no height patch, no parkingReject, heightAt(900, -1000) is street level', d.patches.length === 0 && d.hookTypes.parkingReject !== 'function' && d.podium === 0, JSON.stringify({ patches: d.patches.map((p) => p.id), parkingReject: d.hookTypes.parkingReject, podium: d.podium }));
  const OLD0 = (x, z) => { const k = L.waterwayAt(x, z); return k ? L.WATERWAYS[k].bed : L.GROUND_Y; };
  const b = bag(); let i = 0;
  for (let x = d.xs[0]; x <= d.xs[1]; x += d.xs[2]) for (let z = d.zs[0]; z <= d.zs[1]; z += d.zs[2]) { const want = OLD0(x, z); b.add(Math.abs(d.h[i++] - want) < 1e-5, `(${x}, ${z}) ${d.h[i - 1]} != ${want.toFixed(5)}`); }
  b.fin('dormant: layout.heightAt is the old waterway-bed / street-level line on the lattice 4 m over the podium box');
});
await guard('what-if child', async () => {
  const w = child('whatif');
  check('what-if (landmarksTauride appended to MODULES): HEIGHT_PATCHES holds the Paradny patch first', w.patches.length >= 1 && w.patches[0].id === 'paradny' && eq(w.patches[0].box, P.PARADNY_BOX), JSON.stringify(w.patches.map((p) => p.id)));
  check('what-if: HOOKS.parkingReject is a function', w.hookTypes.parkingReject === 'function', String(w.hookTypes.parkingReject));
  check('what-if: layout.heightAt(900, -1000) is 3.3 (the engine reads the patch through area-tables)', w.podium === 3.3, String(w.podium));
  // baseline = the OLD line (waterway bed / street level; since T1 this process has the patch itself, so its own heightAt is no baseline): heightAt must equal paradnyDeckY(x, z) ?? old line on the lattice
  const OLD = (x, z) => { const k = L.waterwayAt(x, z); return k ? L.WATERWAYS[k].bed : L.GROUND_Y; };
  const b = bag(); let i = 0;
  for (let x = w.xs[0]; x <= w.xs[1]; x += w.xs[2]) for (let z = w.zs[0]; z <= w.zs[1]; z += w.zs[2]) { const want = P.paradnyDeckY(x, z) ?? OLD(x, z); b.add(Math.abs(w.h[i++] - want) < 1e-5, `(${x}, ${z}) ${w.h[i - 1]} != ${want.toFixed(5)}`); }
  b.fin('what-if: layout.heightAt = paradnyDeckY ?? the old line on the lattice 4 m over the podium and its stairs');
});

// ================================================================ pure
section('pure');
{
  const snap = (hooks) => { const o = {}; for (const bl of [[], [S.sm], [S.su, S.ki], Object.values(S)]) for (const k of FACTORIES) { const f = hooks[k](ctxOf(bl)); o[k + ':' + bl.join()] = f ? grids.filter((_, i) => i % 7 === 0).map(([x, z]) => (k === 'pedestrianOnly' ? f({ rank: 0, x: [x, x + 1], z: [z, z + 1] }) : f(x, z))) : null; }
    o.inGarden = grids.filter((_, i) => i % 11 === 0).map(([x, z]) => hooks.inGarden(x, z)); o.parking = typeof hooks.parkingReject === 'function' ? grids.filter((_, i) => i % 7 === 0).map(([x, z]) => hooks.parkingReject(x, z)) : null; o.deck = hooks.deckServices; return o; };
  const M1 = Object.freeze([...MODULES, TAURIDE]);
  check('makeHooks is pure: the same module list gives the same answers twice (frozen input, no state)', eq(snap(H.makeHooks(M1)), snap(H.makeHooks(M1))) && eq(snap(H.makeHooks(MODULES)), snap(H.makeHooks(MODULES))));
  check('makeHooks does not depend on the order of earlier calls (Tauride, then not)', (() => { const a = snap(H.makeHooks(MODULES)); H.makeHooks(M1); return eq(a, snap(H.makeHooks(MODULES))); })());
  const pa = (ps) => ps.map((p) => ({ id: p.id, box: p.box, at: grids.filter((_, i) => i % 5 === 0).map(([x, z]) => p.at(x, z)) }));
  check('makeHeightPatches is pure (frozen input, twice = the same ids, boxes and heights)', eq(pa(H.makeHeightPatches(M1)), pa(H.makeHeightPatches(M1))) && eq(pa(H.makeHeightPatches(MODULES)), pa(H.makeHeightPatches(MODULES))));
  check('makeHeightPatches returns a new array each call (a caller may append the pond bed to it)', H.makeHeightPatches(M1) !== H.makeHeightPatches(M1));
  check('the area module HOOKS / HEIGHT_PATCHES are the output of makeHooks / makeHeightPatches for its MODULES', eq(Object.keys(A.HOOKS).sort(), Object.keys(H.makeHooks(MODULES)).sort()) && eq(pa(A.HEIGHT_PATCHES), pa(H.makeHeightPatches(MODULES))));
  const files = ['src/areas/north/hooks.js', ...fs.readdirSync(path.join(root, 'src/areas/north/hooks')).filter((f) => f.endsWith('.js')).map((f) => 'src/areas/north/hooks/' + f)];
  const bad = [];
  for (const f of files) {
    const src = stripComments(read(f));
    for (const m of src.matchAll(/(?:^|\s)(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]|(?:^|\s)import\s+['"]([^'"]+)['"]/gm)) {
      const spec = m[1] || m[2] || m[3], target = path.posix.normalize(path.posix.join(path.posix.dirname(f), spec));
      if (target === 'src/world/landmarksTauride/height.js' && f === 'src/areas/north/hooks/height.js') continue;      // T2: the garden relief, itself pure (checked below)
      if (target === 'src/world/landmarksTauride/data/paths.js' && f === 'src/areas/north/hooks/ground.js') continue;     // T3: the ids of the garden ways, pure data with no import (checked below)
      if (target === 'src/world/landmarksTauride/data/nursery.js' && (f === 'src/areas/north/hooks/ground.js' || f === 'src/areas/north/hooks/keep-out.js')) continue;     // T8b: the ring of the nursery lot and inNursery, pure data with no import (checked below)
      if (target === 'src/world/landmarksTauride/data/water.js' && f === 'src/areas/north/hooks/water.js') continue;     // T4a: the union outline of the ponds, pure data with no import (checked below)
      if ((target === 'src/world/landmarksTauride/height.js' || target === 'src/world/landmarksTauride/data/ponds.js') && f === 'src/areas/north/hooks/water.js') continue;      // T4a fix 1: noLanding reads the pure terrain function and the datum table (both checked below)
      if (target === 'src/world/landmarksTauride/data/footprints.js' && f === 'src/areas/north/hooks/decks.js') continue;      // T8a: deckUnderside reads the 13 footprints and the garden outline (pure data with no import)
      if (target === 'src/world/landmarksTauride/data/bridges.js' && f === 'src/areas/north/hooks/water.js') continue;      // T4b: duckPonds reads the bridge sites (pure data with no import: the deck keep-outs of the lanes)
      if (!spec.startsWith('./') || !target.startsWith('src/areas/north/hooks')) bad.push(`${f} imports ${spec}`);
    }
    if (/\bctx\.services\b|\bdocument\b|\bwindow\b|THREE|three/.test(src)) bad.push(`${f} reads services / DOM / three`);
  }
  check('the hooks files are pure data + pure functions: they import only each other (no three.js, layout.js, data facade, world module; the exceptions: hooks/height.js imports the pure landmarksTauride/height.js, T2, hooks/ground.js the pure data landmarksTauride/data/paths.js, T3, and hooks/water.js the pure data landmarksTauride/data/water.js, T4a, and, T4a fix 1, the pure height.js and data/ponds.js), no ctx.services', bad.length === 0, bad.join('; '));
  // T8b: data/nursery.js (the lot ring, inNursery) is pure data with no import, and its ring equals the literal of this test
  { const nz = stripComments(read('src/world/landmarksTauride/data/nursery.js')), N = await imp('src/world/landmarksTauride/data/nursery.js');
    check('landmarksTauride/data/nursery.js imports nothing (pure: no three.js, layout.js, facade, ctx, DOM) and its LOT_RING equals the independent literal of this test; inNursery equals the ring test on the probe', !/(?:^|\s)import\s|import\s*\(|ctx|document|window|THREE/.test(nz) && eq(N.LOT_RING, LOT_LIT) && N.inNursery(...PROBES.nursery) && !N.inNursery(1200, -1500) && !N.inNursery(900, -1000), String(N.LOT_RING.length)); }
  // the relief module the garden patch calls: pure too (T2): height.js imports only data/relief.js, relief.js imports nothing; neither touches three.js, layout.js, a facade, ctx or the DOM
  { const hs = stripComments(read('src/world/landmarksTauride/height.js')), rs = stripComments(read('src/world/landmarksTauride/data/relief.js')), imps = (t) => [...t.matchAll(/(?:^|\s)(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|\bimport\s*\(|(?:^|\s)import\s+['"]([^'"]+)['"]/gm)].map((m) => m[1] || m[2] || 'dynamic import');
    check('landmarksTauride/height.js imports only the pure data modules data/relief.js, data/water.js, data/footprints.js and data/ponds.js, and they import nothing (pure: no three.js, layout.js, facade, ctx, DOM)', eq(imps(hs), ['./data/relief.js', './data/water.js', './data/footprints.js', './data/ponds.js']) && imps(rs).length === 0 && ['data/water.js', 'data/footprints.js', 'data/ponds.js'].every((n) => imps(stripComments(read('src/world/landmarksTauride/' + n))).length === 0) && !/\bctx\b|\bdocument\b|\bwindow\b|THREE|three|Math\.random|Date\.now/.test(hs + rs), JSON.stringify([imps(hs), imps(rs)])); }
}

// ================================================================ tables
section('tables');
{
  const W = [], warn = (m) => W.push(String(m)), flush = () => W.splice(0);
  const tryit = (fn) => { try { return { v: fn() }; } catch (e) { return { threw: String(e && e.message || e) }; } };
  const named = (ws, text) => ws.filter((m) => m.includes(text)).length;
  check('north: lib/area-tables.js hands out the area module\'s own HOOKS and HEIGHT_PATCHES (a well-formed table is not copied)', T.HOOKS === A.HOOKS && T.HEIGHT_PATCHES === A.HEIGHT_PATCHES);
  check('checkHooks / checkPatches: the tables of the North pass as they are, without a warning', (() => { const h = H.makeHooks(MODULES), p = H.makeHeightPatches([...MODULES, TAURIDE]); return T.checkHooks(h, warn) === h && T.checkPatches(p, warn) === p && W.length === 0; })(), flush().join(' | '));
  // HOOKS: every known key must be a function (undefined / null = none), deckServices an array of strings
  const bad = { treeCleared: false, treeReject: 'yes', tuftReject: 0, propReject: {}, pedestrianOnly: [], parkingReject: true, carKeepOut: 'closed', inGarden: 'garden', deckServices: 'landmarksTauride', doorServices: 'landmarksNorthFull', groundHoles: 'rings', groundWayReject: 3, waterBodies: 'ponds', noLanding: 'no', duckPonds: { y: -0.45 }, deckUnderside: 'roofs' };
  let r = tryit(() => T.checkHooks(bad, warn)), ws = flush();
  check('checkHooks: a table of the wrong kinds (false, string, 0, object, array, true, string; deckServices a string) does not throw and drops all sixteen keys (doorServices: a string instead of an array, carKeepOut: a string, groundHoles: a string, groundWayReject: a number, waterBodies: a string, noLanding: a string, duckPonds: an object instead of a function, deckUnderside: a string), the input stays as it was', !r.threw && eq(Object.keys(r.v || { x: 1 }), []) && Object.keys(bad).length === 16 && bad.treeCleared === false, r.threw || Object.keys(r.v).join());
  check('checkHooks: one warning per dropped key, each names its key', ws.length === 16 && Object.keys(bad).every((k) => named(ws, 'HOOKS.' + k + ' ') === 1), ws.join(' | '));
  const f = () => null, mix = { treeCleared: f, inGarden: undefined, parkingReject: null, deckServices: ['a', 3], futureHook: 5 };
  r = tryit(() => T.checkHooks(mix, warn)); ws = flush();
  check('checkHooks: a function stays, undefined / null mean none (no warning), a list with a non-string is dropped (one warning naming deckServices), an unknown key passes', !r.threw && r.v.treeCleared === f && 'inGarden' in r.v && r.v.parkingReject === null && !('deckServices' in r.v) && r.v.futureHook === 5 && ws.length === 1 && named(ws, 'HOOKS.deckServices') === 1 && Array.isArray(mix.deckServices), r.threw || ws.join(' | '));
  check('checkHooks: a table that is not an object is ignored with one warning ({} comes back); undefined and null are silent', [false, 'x', 5, [], () => 1].every((v) => { const q = tryit(() => T.checkHooks(v, warn)), n = flush().length; return !q.threw && eq(q.v, {}) && n === 1; }) && [undefined, null].every((v) => { const q = tryit(() => T.checkHooks(v, warn)); return !q.threw && eq(q.v, {}) && flush().length === 0; }));
  // HEIGHT_PATCHES: { id: string, box: 4 finite numbers, at: function }
  const okp = { id: 'ok', box: [0, 1, 0, 1], at: () => 1 };
  const list = [okp, null, { id: 'nobox', at() {} }, { id: 'nan', box: [0, 1, 0, NaN], at() {} }, { id: 'noat', box: [0, 1, 0, 1] }, { box: [0, 1, 0, 1], at() {} }, { id: 'short', box: [0, 1, 0], at() {} }, 5];
  r = tryit(() => T.checkPatches(list, warn)); ws = flush();
  check('checkPatches: entries that are not { id, box[4 finite], at() } are skipped, the well-formed one stays, the input list is not touched', !r.threw && r.v.length === 1 && r.v[0] === okp && list.length === 8, r.threw || r.v.length);
  check('checkPatches: seven warnings, those with an id name it (nobox, nan, noat, short), those without an id name their index (1, 5, 7)', ws.length === 7 && ['"nobox"', '"nan"', '"noat"', '"short"', 'HEIGHT_PATCHES[1]', 'HEIGHT_PATCHES[5]', 'HEIGHT_PATCHES[7]'].every((t) => named(ws, t) === 1), ws.join(' | '));
  check('checkPatches: a list that is not an array is ignored with one warning ([] comes back); undefined and null are silent', [{}, 'x', 5, () => 1].every((v) => { const q = tryit(() => T.checkPatches(v, warn)), n = flush().length; return !q.threw && eq(q.v, []) && n === 1; }) && [undefined, null].every((v) => { const q = tryit(() => T.checkPatches(v, warn)); return !q.threw && eq(q.v, []) && flush().length === 0; }));
}
await guard('malformed child', async () => {                // the real path: an area module with malformed tables, area-tables.js and layout.heightAt on top of it
  const m = child('malformed'), pre = m.warns.filter((x) => x.includes('[area-tables]'));
  check('malformed area module: loading area-tables.js and calling layout.heightAt does not throw', m.threw === null, String(m.threw));
  check('malformed area module: HOOKS keeps the function and the unknown key only (treeCleared false, treeReject "yes", deckServices a string are dropped)', eq(m.hookKeys, ['futureHook', 'inGarden']), JSON.stringify(m.hookKeys));
  check('malformed area module: HEIGHT_PATCHES keeps the one well-formed patch only', eq(m.patchIds, ['ok']), JSON.stringify(m.patchIds));
  check('malformed area module: it warns, naming each dropped key and each skipped patch (3 keys, 4 patches)', pre.length === 7 && ['HOOKS.treeCleared', 'HOOKS.treeReject', 'HOOKS.deckServices', '"nobox"', '"nan"', '"noat"', 'HEIGHT_PATCHES[0]'].every((t) => pre.filter((x) => x.includes(t)).length === 1), pre.join(' | '));
  check('malformed area module: heightAt answers through the good patch (7 inside its box) and the old line elsewhere (0)', eq(m.h, [7, 0, 0]), JSON.stringify(m.h));
});

// ================================================================ tools
section('tools');
{                                                                  // a golden must never be written from the wrong world: AREA=north in the shell without the remap of tools/area.mjs would dump the strip under the North's name
  const tmp = path.join(os.tmpdir(), `layout-golden-refusal-${process.pid}.json`);
  const r = spawnSync(process.execPath, ['tools/layout-golden.mjs', '--out', tmp], { cwd: root, env: { ...process.env, AREA: 'north' }, encoding: 'utf8' });
  const wrote = fs.existsSync(tmp); fs.rmSync(tmp, { force: true });
  check('tools/layout-golden.mjs: AREA=north without the remap of tools/area.mjs is refused (exit 2, the strip\'s world is not dumped under the North\'s name) and writes nothing', r.status === 2 && !wrote && /not "north"/.test(r.stderr), `exit ${r.status}, wrote ${wrote}, ${String(r.stderr).slice(0, 160)}`);
}

// ================================================================ static
section('static');
{                                                                  // TEXT checks only (a regex over the engine files): they notice a hook that is no longer read through lib/area-tables.js, not a call site that misbehaves (that is `npm run hooks:all`)
  const WIRING = { 'src/world/layout.js': ['HEIGHT_PATCHES'], 'src/world/drive/handling.js': ['deckServices', 'carKeepOut'], 'src/world/environment/trees.js': ['treeCleared', 'treeReject'], 'src/world/environment/lawns.js': ['tuftReject'], 'src/world/environment/ground.js': ['groundHoles'], 'src/world/environment/field.js': ['groundWayReject', 'waterBodies'],
    'src/world/props/world.js': ['propReject'], 'src/world/streets.js': ['pedestrianOnly'], 'src/world/streets/parking.js': ['parkingReject'], 'src/world/people/nav.js': ['inGarden', 'deckServices', 'doorServices', 'HEIGHT_PATCHES'], 'src/main.js': ['noLanding'], 'src/world/city/roofs.js': ['deckUnderside'], 'src/world/wildlife/ducks.js': ['duckPonds'] };
  const strip = stripComments;
  for (const [file, keys] of Object.entries(WIRING)) {
    const src = strip(read(file)), imports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)];
    const isTables = (spec) => /(^|\/)lib\/area-tables\.js$|^\.\/area-tables\.js$/.test(spec);
    const fromTables = imports.filter((m) => isTables(m[2]) && /\b(HOOKS|HEIGHT_PATCHES)\b/.test(m[1]));
    const ns = [...src.matchAll(/import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g)].filter((m) => isTables(m[2])).map((m) => m[1]);             // import * as T from '.../lib/area-tables.js'
    if (ns.length) fromTables.push(...ns);
    for (const k of keys) {
      const uses = k === 'HEIGHT_PATCHES' ? new RegExp(`\\bHEIGHT_PATCHES\\b|\\b(?:${ns.join('|') || '$^'})\\.HEIGHT_PATCHES\\b`).test(src.replace(/import[^;]*;/g, ''))
        : new RegExp(`\\bHOOKS\\s*(?:\\?)?\\.\\s*${k}\\b|\\bHOOKS\\s*\\[\\s*['"]${k}['"]|\\{[^}]*\\b${k}\\b[^}]*\\}\\s*=\\s*(?:\\w+\\.)?HOOKS\\b`).test(src);
      check(`${file} reads ${k === 'HEIGHT_PATCHES' ? k : 'HOOKS.' + k} through lib/area-tables.js`, uses && fromTables.length > 0, uses ? 'no import of HOOKS / HEIGHT_PATCHES from lib/area-tables.js' : 'the file does not use it (the cluster has not landed)');
    }
  }
  // review fix: a place picked while driving (the garden's Digit5 is inside the closed ground) must not announce an arrival that drive.place() refused
  { const m = strip(read('src/main.js')), i = m.indexOf('async function goToView'), g = i < 0 ? '' : m.slice(i, m.indexOf('\n}\n', i));
    check('src/main.js goToView keeps the answer of drive.place(): a refused spot shows no place label and no area name', /=\s*ctx\.drive\.place\([^)]*\)\s*!==\s*false/.test(g) && /if \(!placed\) \{.*showToast\(.*\);\s*return;/.test(g) && g.indexOf('!placed') < g.indexOf('showToast(v.label)'), g ? 'the placed flag is missing' : 'goToView not found'); }
  // no engine file imports HOOKS / HEIGHT_PATCHES from an area module
  const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + '/' + e.name) : e.name.endsWith('.js') ? [d + '/' + e.name] : []));
  const offenders = [];
  for (const f of walk('src/world')) { const src = strip(read(f)); for (const m of src.matchAll(/import\s*(?:\{([^}]*)\}|\*\s*as\s+\w+)\s*from\s*['"]([^'"]+)['"]/g)) if (/(^|\/)area\.js$/.test(m[2]) && /\b(HOOKS|HEIGHT_PATCHES)\b/.test(m[1] || '')) offenders.push(f); }
  check('no engine file imports HOOKS / HEIGHT_PATCHES from area.js (only from lib/area-tables.js)', offenders.length === 0, offenders.join());
  check('layout.js has no export of HOOKS / HEIGHT_PATCHES (the layout golden lists every export)', !/export\s+(?:const|let|var|function)\s+(?:HOOKS|HEIGHT_PATCHES)\b/.test(read('src/world/layout.js')) && !/export\s*\{[^}]*\b(?:HOOKS|HEIGHT_PATCHES)\b/.test(read('src/world/layout.js')) && !/export\s*\*[^;]*area-tables/.test(read('src/world/layout.js')));
  check('area.js of the North builds both tables in one place: makeHooks(MODULES) and makeHeightPatches(MODULES)', /export const HOOKS = makeHooks\(MODULES\)/.test(read('src/areas/north/area.js')) && /export const HEIGHT_PATCHES = makeHeightPatches\(MODULES\)/.test(read('src/areas/north/area.js')));
  check('the strip area module exports HOOKS = {} and HEIGHT_PATCHES = []', /export const HOOKS = \{\};/.test(read('src/world/area.js')) && /export const HEIGHT_PATCHES = \[\];/.test(read('src/world/area.js')));
}

// ---------------------------------------------------------------- summary
console.log('');
for (const [g, v] of Object.entries(byGroup)) console.log(`${g.padEnd(9)} ${v.ok} ok, ${v.bad.length} FAIL${v.bad.length ? ': ' + v.bad.map((s) => s.slice(0, 70)).join(' | ') : ''}`);
console.log(failed ? `RESULT: FAIL (${failed} of ${n} checks)` : `RESULT: OK (${n} checks)`);
process.exit(failed ? 1 : 0);
