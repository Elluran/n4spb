// CPU test of the area system (docs/AREAS.md): the registry against the real area modules, data facades and pages. node tools/areas-test.mjs [--area <id>]
// What it proves today (milestone M1): every registry row names an existing page whose <html data-area> equals the id, its bake directory is the one the area module declares, its play rectangles
// are exactly the data facade's PLAY_RECTS, every module of the area's module list has a file, the module list of the strip equals src/main.js MODULES, and the gates reference known areas.
// Areas other than the strip are loaded through the same import-map remap the page uses (tools/area.mjs).
// M3 adds: the GATE GEOMETRY of every non-dev gate (tools/lib/gate-geometry.mjs: the segment lies on the border of the origin play union on both sides, inward points into the area, a point at depth
// `zone` is inside, the arrival rectangle lies 25 m inside the destination play union, the reverse gate leads back and its zone stays clear of the arrival grid, the arrival grid - 25 m steps x walk / fly / car x
// both headings - is resolved by handoff.resolveArrival with the DESTINATION layout and 100 percent valid, and the band-parity hook tools/band-parity.mjs `bandParity({ gate, root, REGISTRY })`
// when the data task provides it); synthetic gate fixtures exercise every one of those checks (and every way they must fail) even while no real gate exists; the generated area pages
// (tools/gen-area-html.mjs: fixtures, the page.json files, and for a real area the page on disk); the shape of each area module's TEST.
//   node tools/areas-test.mjs [--area <id>]        a gate whose destination is another area runs its arrival grid in a child: node tools/area.mjs <to> tools/areas-test.mjs --arrival-only <gate>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REGISTRY, GATES, SCHEMA } from '../src/areas/registry.js';
import { mainModules } from './modules-list.mjs';
import * as GG from './lib/gate-geometry.mjs';
import { testShapeProblems, stripTest, resolveTest } from './lib/area-test-data.mjs';
import { generatePage, generateFor, validatePage, pageJsonFile } from './gen-area-html.mjs';
import { resolveArea } from './lib/area-page.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, passes = 0;
const check = (name, fn) => { try { fn(); passes++; console.log('  ok   ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 8).join('\n       ')); } };
const only = process.argv.includes('--area') ? process.argv[process.argv.indexOf('--area') + 1] : null;
const hereArea = process.env.AREA || 'strip';      // the area whose layout.js this process loads (tools/area.mjs sets AREA)
const layoutUrl = pathToFileURL(path.join(root, 'src/world/layout.js')).href;

// child mode: print the arrival grid of ONE gate for the layout of THIS process's area (the destination of the gate)
if (process.argv.includes('--arrival-only')) {
  const g = GATES.find((x) => x.id === process.argv[process.argv.indexOf('--arrival-only') + 1]);
  if (!g || g.to !== hereArea) { console.error(`arrival-only: gate ${g && g.id} does not lead to ${hereArea}`); process.exit(2); }
  console.log('ARRIVAL_GRID ' + JSON.stringify(GG.arrivalGrid(g, await import(layoutUrl))));
  process.exit(0);
}

check('registry schema is 1 and ids are unique and match their keys', () => {
  assert.equal(SCHEMA, 1);
  for (const [k, a] of Object.entries(REGISTRY)) assert.equal(a.id, k, `row ${k}`);
});
for (const a of Object.values(REGISTRY)) {
  if (only && a.id !== only) continue;
  console.log(`area ${a.id}${a.status === 'planned' ? ' (planned: its files do not exist yet)' : ''}:`);
  if (a.status === 'planned') {
    check('planned area: well-formed play rectangles that do not overlap each other, in a sensible total area', () => {
      assert(a.play.length >= 1);
      for (const r of a.play) { assert(r.x1 > r.x0 && r.z1 > r.z0, 'rect ' + r.name); assert(Math.abs(r.x0) < 20000 && Math.abs(r.z0) < 20000); }
      for (let i = 0; i < a.play.length; i++) for (let j = i + 1; j < a.play.length; j++) { const p = a.play[i], q = a.play[j]; assert(!(p.x0 < q.x1 && q.x0 < p.x1 && p.z0 < q.z1 && q.z0 < p.z1), `${p.name} overlaps ${q.name}`); }
      const km2 = a.play.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0) / 1e6; assert(km2 > 0.5 && km2 < 5.5, km2.toFixed(3) + ' km2');
    });
    continue;
  }
  check('page exists and names its area (<html data-area>)', () => {
    const f = path.join(root, a.page); assert(fs.existsSync(f), a.page + ' is missing');
    const html = fs.readFileSync(f, 'utf8'); const m = /<html[^>]*\sdata-area="([^"]+)"/.exec(html);
    assert(m, a.page + ' has no data-area'); assert.equal(m[1], a.id);
  });
  check('bake directory is a path under assets/ with a trailing slash', () => { assert(/^[a-z0-9/_-]+\/$/.test(a.bake), a.bake); assert(!a.bake.startsWith('/')); });
  check('remap keys exist as files and so do their targets', () => {
    for (const [k, v] of Object.entries(a.remap || {})) { assert(fs.existsSync(path.join(root, k)), 'remap key ' + k); assert(fs.existsSync(path.join(root, v)), 'remap target ' + v); }
  });
  // the area's own modules are read through the remap the page uses
  let A, C;
  try {
    if (a.id === 'strip') { A = await import(pathToFileURL(path.join(root, 'src/world/area.js')).href); C = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href); }
    else { const { areaModules } = await import('./lib/area-hooks.mjs'); ({ A, C } = await areaModules(root, a)); }
  } catch (e) { check('area modules load', () => { throw e; }); continue; }
  check('area module ID and BAKE_DIR agree with the registry', () => { assert.equal(A.ID, a.id); assert.equal(A.BAKE_DIR, a.bake); assert.equal(!!A.REQUIRE_BAKE, !!a.requireBake); });
  check('play rectangles equal the data facade PLAY_RECTS (names and numbers)', () => {
    assert.equal(a.play.length, C.PLAY_RECTS.length);
    a.play.forEach((r, i) => { const f = C.PLAY_RECTS[i]; assert.deepEqual([r.x0, r.x1, r.z0, r.z1], [f.x0, f.x1, f.z0, f.z1], `rect ${i} ${r.name}`); assert.equal(r.name, C.RECT_NAMES[i], `name ${i}`); });
  });
  check('every module of the area exists', () => {
    const list = a.id === 'strip' ? mainModules() : A.MODULES; assert(Array.isArray(list) && list.length > 10, 'module list');
    for (const m of list) assert(fs.existsSync(path.join(root, 'src/world', m + '.js')), 'src/world/' + m + '.js is missing');
    assert.equal(new Set(list).size, list.length, 'duplicate module');
    if (a.id === 'strip') assert(!A.MODULES, 'the strip keeps its module list in src/main.js MODULES');
  });
  check('area TEST (the expectations of layout-test / landmarks-groups-check) has the documented shape', () => {
    if (a.id === 'strip' && !A.TEST) return;      // the strip's expectations are the fallback in tools/lib/area-test-data.mjs
    assert(A.TEST, `src/areas/${a.id}/area.js must export TEST`);
    const pr = testShapeProblems(A.TEST); assert.equal(pr.length, 0, pr.join('; '));
  });
  check('page.json help line names every digit view of TEST.viewKeys (the keyboard help follows VIEWS)', () => {
    const pj = pageJsonFile(root, a.id); if (a.id === 'strip' || !fs.existsSync(pj)) return;
    const help = JSON.parse(fs.readFileSync(pj, 'utf8')).help.walk;
    for (const k of A.TEST?.viewKeys || []) { const m = /^Digit(\d)$/.exec(k); if (m) assert(help.includes(`<kbd>${m[1]}</kbd>`), `help.walk of src/areas/${a.id}/page.json has no <kbd>${m[1]}</kbd> for the view ${k}`); }
  });
  check('area tables have the shape the engine reads', () => {
    for (const k of ['NAMES', 'SQUARE', 'OBELISK', 'STATION', 'GROUPS']) assert(A[k] && typeof A[k] === 'object', k);
    for (const k of ['makeAreas', 'makeViews']) assert.equal(typeof A[k], 'function', k);
  });
}
check('gates connect known areas and are unique', () => {
  const ids = new Set(); for (const g of GATES) { assert(REGISTRY[g.from] && REGISTRY[g.to], `gate ${g.id}: unknown area`); assert(!ids.has(g.id), 'duplicate gate ' + g.id); ids.add(g.id); if (!g.dev) assert.notEqual(g.from, g.to, `gate ${g.id}: a real gate leads to ANOTHER area (only a dev gate loops back)`); }
  for (const g of GATES) { const len = Math.hypot(g.inward[0], g.inward[1]); assert(Math.abs(len - 1) < 1e-9, `gate ${g.id}: inward is not a unit vector`); assert(g.zone >= 20 && g.zone <= 200, `gate ${g.id}: zone ${g.zone}`); assert(g.arrive.x1 > g.arrive.x0 && g.arrive.z1 > g.arrive.z0, `gate ${g.id}: arrive rect`); if (g.reverse) assert(GATES.some((r) => r.id === g.reverse && r.from === g.to && r.to === g.from), `gate ${g.id}: reverse ${g.reverse} does not lead back`); }
});

// ---------------------------------------------------------------------------------------------- the generated area pages (tools/gen-area-html.mjs)
console.log('area pages (generator fixtures, page.json data, pages on disk):');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replaceAll('\r\n', '\n');
const FIX_ROW = { id: 'fix', page: 'fix.html', approxMB: 20, remap: { 'src/world/data/city.js': 'src/areas/fix/data/city.js', 'src/world/area.js': 'src/areas/fix/area.js' } };
const FIX_PAGE = {
  schema: 1, title: 'Fixture area · Saint Petersburg', appTitle: 'Fix', canvasLabel: 'A fixture area: 3D scene', intro: { kicker: 'Fixture walk', title: 'Fixture title' },
  heavy: { ramGB: 2, ru: 'Heavy scene (ru slot): ~{mb} MB, ~{ram} GB', en: 'Heavy scene (en slot): ~{mb} MB, ~{ram} GB' },
  places: { title: '1-2: the first two fixture places, tooltip of the list' },
  help: { walk: '<kbd>1</kbd> One <kbd>2</kbd> Two', air: '<kbd>W</kbd> Fly where you look' },
  sights: ['one-sight', 'two-sight'],
  facts: Array.from({ length: 9 }, (_, i) => [`Fact number ${i} with 'single' and "double" quotes, a backslash \\ and a dollar $\{x} in it.`, ...(i % 3 === 0 ? ['one-sight'] : [])]),
};
const idsOf = (h) => [...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const classesOf = (h) => [...h.matchAll(/\sclass="([^"]+)"/g)].map((m) => m[1]);
const scriptOpeners = (h) => [...h.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
check('generator fixture: a valid page.json validates, a short fact list / a "<" in a fact / an unknown sight do not', () => {
  assert.deepEqual(validatePage(FIX_PAGE), []);
  assert(validatePage({ ...FIX_PAGE, facts: FIX_PAGE.facts.slice(0, 3) }).length);
  assert(validatePage({ ...FIX_PAGE, facts: [...FIX_PAGE.facts, ['A fact that contains <b>markup</b> must be refused by the validator.']] }).length);
  assert(validatePage({ ...FIX_PAGE, facts: [...FIX_PAGE.facts, ['A fact about a sight that is not listed in the sights.', 'nope']] }).length);
  assert(validatePage({ ...FIX_PAGE, help: { ...FIX_PAGE.help, walk: '<b>1</b> not a kbd tag in this help line' } }).length);
});
{
  const out = generatePage(indexHtml, FIX_ROW, FIX_PAGE);
  check('generator fixture: <html data-area>, the import map (remap first, three kept), the texts', () => {
    assert(/<html[^>]*\sdata-area="fix"/.test(out));
    const imports = JSON.parse(/<script type="importmap">\s*([\s\S]*?)\s*<\/script>/.exec(out)[1]).imports;
    assert.deepEqual(Object.keys(imports), ['./src/world/data/city.js', './src/world/area.js', 'three', 'three/addons/']);
    assert.equal(imports['./src/world/area.js'], './src/areas/fix/area.js');
    assert(out.includes('<title>Fixture area · Saint Petersburg</title>') && out.includes('content="Fix"') && out.includes('Fixture walk') && out.includes('Fixture title'));
    assert(!out.includes('Nevsky Prospekt, Saint Petersburg: 3D scene'), 'the strip canvas label is still there');
    assert(out.includes('~20 MB, ~2 GB') && out.includes('~20 MB') && !out.includes('~51 MB'), 'the heavy-scene note takes the registry MB and the page.json RAM');
    assert(!out.includes('\r'));
  });
  check('generator fixture: every id, class and script of index.html is kept (the engine finds all it needs)', () => {
    assert.deepEqual(idsOf(out), idsOf(indexHtml));
    assert.deepEqual(classesOf(out), classesOf(indexHtml));
    assert.deepEqual(scriptOpeners(out), scriptOpeners(indexHtml));
    assert(out.includes('<script type="module" src="./src/main.js"></script>'));
  });
  check('generator fixture: SIGHTS and FACTS are the page.json data, quoted so that the script parses', () => {
    const sights = new Function('return ' + /const SIGHTS = (\[[^\n]*?\]);/.exec(out)[1])();
    const facts = new Function('return ' + /const FACTS = (\[[\s\S]*?\n {4}\]);/.exec(out)[1])();
    assert.deepEqual(sights, FIX_PAGE.sights); assert.deepEqual(facts, FIX_PAGE.facts);
    const script = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('const FACTS'));
    new Function(script);      // parses (not run)
  });
  check('generator fixture: no splash pictures -> the splash does not request assets/splash/undefined.jpg', () => {
    const e = generatePage(indexHtml, FIX_ROW, { ...FIX_PAGE, sights: [], facts: FIX_PAGE.facts.map((f) => [f[0]]) });
    assert(e.includes('const SIGHTS = [];') && e.includes('if (sight || SIGHTS.length) document.getElementById'));
    assert(!generatePage(indexHtml, FIX_ROW, FIX_PAGE).includes('if (sight || SIGHTS.length)'));
  });
  check('generator fixture: an anchor that moved in index.html stops the generator (it never writes a half-replaced page)', () => {
    assert.throws(() => generatePage(indexHtml.replace('<div class="kicker">', '<div class="kicker2">'), FIX_ROW, FIX_PAGE), /anchor "intro kicker"/);
    assert.throws(() => generatePage(indexHtml.replace('<h1 class="title" id="stname">', '<h1 class="title" id="stname2">'), FIX_ROW, FIX_PAGE), /anchor "intro title"/);
  });
}
check('generator CLI on a throw-away root: writes the page, --check passes, a changed or missing page fails it, strip / planned areas are refused', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-area-'));
  try {
    fs.mkdirSync(path.join(tmp, 'src/areas/north'), { recursive: true });
    fs.copyFileSync(path.join(root, 'index.html'), path.join(tmp, 'index.html'));
    fs.copyFileSync(pageJsonFile(root, 'north'), pageJsonFile(tmp, 'north'));
    const run = (...a) => spawnSync(process.execPath, [path.join(root, 'tools/gen-area-html.mjs'), '--root', tmp, ...a], { encoding: 'utf8' });
    assert.equal(run('--area', 'north').status, 2, 'a planned area needs --force-planned');
    assert.equal(run('--area', 'strip').status, 2, 'the strip page is index.html');
    assert.equal(run('--area', 'nope').status, 2);
    assert.equal(run('--area', 'north', '--force-planned', '--check').status, 1, '--check without a page must fail');
    assert.equal(run('--area', 'north', '--force-planned').status, 0);
    assert(fs.existsSync(path.join(tmp, 'north.html')));
    assert.equal(run('--area', 'north', '--force-planned', '--check').status, 0);
    fs.appendFileSync(path.join(tmp, 'north.html'), '<!-- hand edit -->\n');
    const stale = run('--area', 'north', '--force-planned', '--check');
    assert.equal(stale.status, 1); assert(/STALE/.test(stale.stdout), stale.stdout);
    fs.writeFileSync(path.join(tmp, 'north.html'), fs.readFileSync(path.join(tmp, 'north.html'), 'utf8').replace(/<!-- hand edit -->\n/, '').replaceAll('\n', '\r\n'));
    assert.equal(run('--area', 'north', '--force-planned', '--check').status, 0, 'CRLF checkouts (Windows autocrlf) compare equal');
    assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8').replaceAll('\r\n', '\n'), indexHtml, 'index.html is never touched');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
for (const row of Object.values(REGISTRY)) {
  if (row.id === 'strip' || (only && row.id !== only)) continue;
  const pj = pageJsonFile(root, row.id), pageFile = path.join(root, row.page);
  if (row.status !== 'planned') check(`area ${row.id}: src/areas/${row.id}/page.json and ${row.page} exist`, () => { assert(fs.existsSync(pj), 'page.json missing'); assert(fs.existsSync(pageFile), row.page + ' missing: node tools/gen-area-html.mjs --area ' + row.id); });
  if (!fs.existsSync(pj)) continue;
  check(`area ${row.id}: page.json is valid (every sight has a splash picture, true to the schema of tools/gen-area-html.mjs)`, () => {
    const pr = validatePage(JSON.parse(fs.readFileSync(pj, 'utf8')), { id: row.id, splashDir: path.join(root, 'assets/splash') }); assert.equal(pr.length, 0, pr.join('\n       '));
  });
  if (fs.existsSync(pageFile)) check(`area ${row.id}: ${row.page} on disk equals the generated page`, () => {
    assert.equal(fs.readFileSync(pageFile, 'utf8').replaceAll('\r\n', '\n'), generateFor(root, row), `${row.page} is stale: node tools/gen-area-html.mjs --area ${row.id}${row.status === 'planned' ? ' --force-planned' : ''}`);
  });
}
check('page selection of the browser tools (--area / --page): strip by default, a registered page, conflicts and strangers refused', () => {
  assert.equal(resolveArea({}, root).page, 'index.html'); assert.equal(resolveArea({}, root).id, 'strip');
  assert.equal(resolveArea({ page: 'index.html' }, root).id, 'strip');
  assert.equal(resolveArea({ area: '1', page: '1' }, root).id, 'strip');      // a flag without a value is absent
  if (fs.existsSync(path.join(root, REGISTRY.north.page))) { const r = resolveArea({ area: 'north' }, root); assert.equal(r.page, 'north.html'); assert.equal(resolveArea({ page: 'north.html' }, root).id, 'north'); assert.throws(() => resolveArea({ area: 'north', page: 'index.html' }, root), /belongs to area/); }
  assert.throws(() => resolveArea({ area: 'nope' }, root), /unknown area/);
  assert.throws(() => resolveArea({ page: '../index.html' }, root), /site root/);
  assert.throws(() => resolveArea({ page: 'missing.html' }, root), /does not exist/);
});
check('TEST contract fixtures (what layout-test / landmarks-groups-check read from an area module): the strip fallback validates, tuples and bare ids normalise, broken objects are refused', () => {
  const fakeL = { OBELISK: { x: 1, z: 2 }, STATION: { x: 3, z: 4 }, SQUARE: { x: 5, z: 6 }, GROUPS: { landmarksA: [], landmarksB: [] } };
  assert.deepEqual(testShapeProblems(stripTest(fakeL)), []);
  const good = { claimed: ['r1', { id: 'r2', by: 'm', group: 'g' }], viewKeys: ['Digit1', 'Place.x'], mustHaveAreas: [[1, 2, 'abc'], { x: 3, z: 4, has: 'd' }] };
  assert.deepEqual(testShapeProblems(good), []);
  const r = resolveTest({ ID: 'fix', TEST: good }, fakeL);
  assert.deepEqual(r.claimed, [{ id: 'r1' }, { id: 'r2', by: 'm', group: 'g' }]); assert.deepEqual(r.mustHaveAreas[0], { x: 1, z: 2, has: 'abc' }); assert.deepEqual(r.kept, ['landmarksA', 'landmarksB']);
  assert.deepEqual(resolveTest({ ID: 'fix', TEST: { ...good, kept: ['k'] } }, fakeL).kept, ['k']); assert.deepEqual(resolveTest({ ID: 'fix', KEPT: ['kk'], TEST: good }, fakeL).kept, ['kk']);
  assert(testShapeProblems({ ...good, viewKeys: [] }).length && testShapeProblems({ ...good, viewKeys: ['a', 'a'] }).length && testShapeProblems({ ...good, claimed: [5] }).length && testShapeProblems({ ...good, mustHaveAreas: [[1, 2]] }).length);
  assert(testShapeProblems({ ...good, nearestRoad: { at: [1], names: [] } }).length && testShapeProblems({ ...good, roadsNear: { at: [1, 2], r: 0, min: 1 } }).length && testShapeProblems({ ...good, riverBed: [] }).length);
  assert.throws(() => resolveTest({ ID: 'fix' }, fakeL), /exports no TEST/); assert.throws(() => resolveTest({ ID: 'fix', TEST: { claimed: [] } }, fakeL), /malformed/);
});

// ---------------------------------------------------------------------------------------------- gate geometry (tools/lib/gate-geometry.mjs)
console.log('gate geometry fixtures (the checks must pass a good synthetic gate pair and catch every way a gate can be wrong):');
const R = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const FA = [R(0, 1000, 0, 1000)], FB = [R(0, 1000, -1000, 0)];      // area A lies south of area B; they share the border z = 0
const fa = { id: 'fa', from: 'A', to: 'B', seg: [[100, 0], [900, 0]], inward: [0, 1], zone: 30, arrive: R(150, 850, -300, -100), reverse: 'fb' };
const fb = { id: 'fb', from: 'B', to: 'A', seg: [[100, 0], [900, 0]], inward: [0, -1], zone: 30, arrive: R(150, 850, 100, 300), reverse: 'fa' };
const probsOf = (g, rev = g.from === 'A' ? fb : fa) => GG.gateProblems(g, { fromRects: g.from === 'A' ? FA : FB, toRects: g.from === 'A' ? FB : FA, reverse: rev });
const fixtureFails = (name, g, rev, re) => check(`fixture: ${name} is caught`, () => { const p = probsOf(g, rev).join('\n'); assert(re.test(p), p || '(no problem reported)'); });
check('fixture: a good gate pair has no problem on either side (0.5 m inward inside, 0.5 m outward outside, depth `zone` inside, arrival 25 m inside, reverse clear)', () => { assert.deepEqual(probsOf(fa), []); assert.deepEqual(probsOf(fb), []); });
check('fixture: GG.inUnion honours the inset against the boundary of the UNION, not of one rectangle', () => {
  const two = [R(0, 100, 0, 100), R(100, 200, 0, 100)];      // two rectangles sharing x = 100: (100, 50) is 50 m inside the union, 0 m inside either rectangle
  assert(GG.inUnion(two, 100, 50, 25)); assert(!GG.inUnion(two, 10, 50, 25)); assert(!GG.inUnion(two, 250, 50)); assert(GG.inUnion(two, 150, 50, 25));
});
fixtureFails('a segment 5 m inside the area (not on its border)', { ...fa, seg: [[100, 5], [900, 5]] }, fb, /must lie on the border/);
fixtureFails('a segment beside the area (outside it)', { ...fa, seg: [[1100, 0], [1300, 0]] }, fb, /must lie on the border/);
fixtureFails('an inward vector that points out of the area', { ...fa, inward: [0, -1] }, fb, /must lie on the border/);
fixtureFails('an inward vector that is not a unit vector', { ...fa, inward: [0, 2] }, fb, /unit vector/);
fixtureFails('an inward vector that is not normal to the segment', { ...fa, inward: [0.6, 0.8] }, fb, /perpendicular/);
fixtureFails('a zone deeper than the area', { ...fa, zone: 1200 }, fb, /depth 1200/);
fixtureFails('an arrival rectangle outside the destination', { ...fa, arrive: R(150, 850, 100, 300) }, fb, /not 25 m inside the destination/);
fixtureFails('an arrival rectangle closer than 25 m to the destination border', { ...fa, arrive: R(150, 850, -300, -10) }, fb, /not 25 m inside the destination/);
fixtureFails('a reverse gate that does not lead back', fa, { ...fb, to: 'B' }, /does not lead back/);
fixtureFails('a reverse gate that does not name this gate', fa, { ...fb, reverse: 'zz' }, /names zz/);
fixtureFails('a missing reverse gate', fa, null, /does not exist/);
fixtureFails('an arrival grid inside the reverse gate zone + 50 m', { ...fa, arrive: R(150, 850, -120, -30) }, fb, /reverse gate fb/);
check('fixture: an arrival grid inside the reverse zone depth but outside its lateral range is fine', () => assert.deepEqual(probsOf({ ...fa, arrive: R(920, 970, -120, -30) }), []));
{
  const fake = (rects, { river = [], buildings = [], hero = { x: 500, z: -500, yaw: 0, pitch: 0 } } = {}) => {
    const hit = (list, x, z, m = 0) => list.some((r) => GG.inRect(r, x, z, -m)), road = (t) => { const f = ((t % 50) + 50) % 50; return Math.min(f, 50 - f) <= 4; };
    return {
      HERO: hero, inPlay: (x, z, m = 0) => GG.inUnion(rects, x, z, m), insideBuilding: (x, z, m = 0) => hit(buildings, x, z, m), inRiver: (x, z) => hit(river, x, z),
      roadsNear: (x, z) => [...(road(z) ? [{ gap: 0, tx: 1, tz: 0 }] : []), ...(road(x) ? [{ gap: 0, tx: 0, tz: 1 }] : [])],      // a 50 m grid of 8 m wide streets
    };
  };
  const good = GG.arrivalGrid(fa, fake(FB, { buildings: [R(300, 340, -250, -210), R(600, 700, -180, -120)], river: [R(0, 120, -1000, -900)] }));
  check(`fixture: the arrival grid (${good.total} resolutions) is 100 % valid, walk / fly / car, both headings, and the buildings really exercise the ring search`, () => {
    assert.equal(good.total, GG.gridPoints(fa.arrive).length * 6); assert.equal(good.badCount, 0, good.bad.join('\n')); assert.equal(good.hero, 0); assert(good.ring > 0 && good.direct > 0, JSON.stringify(good));
  });
  const bad = GG.arrivalGrid(fa, fake(FB, { river: [R(0, 1000, -400, -90)] }));
  check('fixture: an arrival rectangle drowned in the river is caught (every resolution falls back to the HERO)', () => { assert.equal(bad.badCount, bad.total); assert(bad.bad.length && /HERO|river/.test(bad.bad[0]), bad.bad[0]); });
  const noRoad = GG.arrivalGrid(fa, { ...fake(FB), roadsNear: () => [] });
  check('fixture: a car arrival needs a drivable lane (an area without roads fails the car grid, not the walk grid)', () => { assert(noRoad.badCount > 0 && noRoad.badCount <= noRoad.total / 3 + 1, JSON.stringify([noRoad.badCount, noRoad.total])); assert(/car/.test(noRoad.bad[0])); });
}

// ---------------------------------------------------------------------------------------------- gate geometry of the real gates
console.log('gates (non-dev; the dev gate g0 loops back to the same page and has no border):');
const realGates = GATES.filter((g) => !g.dev && (!only || g.from === only || g.to === only));
if (!realGates.length) console.log('  (no real gate in the registry yet: the checks above ran on the fixtures)');
const bandFile = path.join(root, 'tools/band-parity.mjs');
for (const g of realGates) {
  const from = REGISTRY[g.from], to = REGISTRY[g.to];
  check(`gate ${g.id} (${g.from} -> ${g.to}): border, inward, depth, arrival rectangle, reverse gate`, () => {
    const pr = GG.gateProblems(g, { fromRects: from.play, toRects: to.play, reverse: GATES.find((r) => r.id === g.reverse) }); assert.equal(pr.length, 0, pr.join('\n       '));
  });
  let grid = null, gridError = null;
  try {
    if (g.to === hereArea) grid = GG.arrivalGrid(g, await import(layoutUrl));
    else {
      const env = { ...process.env }; delete env.AREA;      // the child sets it itself
      const r = spawnSync(process.execPath, [path.join(root, 'tools/area.mjs'), g.to, path.join(root, 'tools/areas-test.mjs'), '--arrival-only', g.id], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
      const line = String(r.stdout || '').split('\n').find((l) => l.startsWith('ARRIVAL_GRID '));
      if (!line) throw new Error(`the arrival-grid child for ${g.to} printed nothing (exit ${r.status}): ${String(r.stderr || r.stdout).slice(0, 400)}`);
      grid = JSON.parse(line.slice(13));
    }
  } catch (e) { gridError = e; }
  check(`gate ${g.id}: arrival grid in ${g.to} (25 m steps x walk / fly / car x both headings)${grid ? `: ${grid.total} resolutions, ${grid.direct} direct, ${grid.ring} ring, ${grid.hero} hero` : ''} 100 % valid`, () => {
    if (gridError) throw gridError; assert.equal(grid.badCount, 0, `${grid.badCount} of ${grid.total} invalid:\n       ` + grid.bad.join('\n       '));
  });
  if (fs.existsSync(bandFile)) {
    // the data task's band parity hook: bandParity({ gate, root, REGISTRY }) -> a list of problems (or nothing)
    let bp = null, bpError = null;
    try { const m = await import(pathToFileURL(bandFile).href); if (typeof m.bandParity === 'function') bp = (await m.bandParity({ gate: g, root, REGISTRY })) || []; } catch (e) { bpError = e; }
    if (bp || bpError) check(`gate ${g.id}: band parity (tools/band-parity.mjs)`, () => { if (bpError) throw bpError; assert.equal(bp.length, 0, bp.slice(0, 6).join('\n       ')); });
  }
}

console.log(`areas-test: ${passes} passed, ${fails} failed`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails ? 1 : 0);
