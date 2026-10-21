// CPU test of the area system (docs/AREAS.md): the registry against the real area modules, data facades and pages. node tools/areas-test.mjs [--area <id>]
// What it proves today (milestone M1): every registry row names an existing page whose <html data-area> equals the id, its bake directory is the one the area module declares, its play rectangles
// are exactly the data facade's PLAY_RECTS, every module of the area's module list has a file, the module list of the strip equals src/main.js MODULES, and the gates reference known areas.
// Later milestones add the gate geometry, the arrival grid and the band parity (M2, M3). Areas other than the strip are loaded through the same import-map remap the page uses (tools/area.mjs).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REGISTRY, GATES, SCHEMA } from '../src/areas/registry.js';
import { mainModules } from './modules-list.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fails = 0, passes = 0;
const check = (name, fn) => { try { fn(); passes++; console.log('  ok   ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 4).join('\n       ')); } };
const only = process.argv.includes('--area') ? process.argv[process.argv.indexOf('--area') + 1] : null;

check('registry schema is 1 and ids are unique and match their keys', () => {
  assert.equal(SCHEMA, 1);
  for (const [k, a] of Object.entries(REGISTRY)) assert.equal(a.id, k, `row ${k}`);
});
for (const a of Object.values(REGISTRY)) {
  if (only && a.id !== only) continue;
  console.log(`area ${a.id}:`);
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
  check('area tables have the shape the engine reads', () => {
    for (const k of ['NAMES', 'SQUARE', 'OBELISK', 'STATION', 'GROUPS']) assert(A[k] && typeof A[k] === 'object', k);
    for (const k of ['makeAreas', 'makeViews']) assert.equal(typeof A[k], 'function', k);
  });
}
check('gates connect known areas and are unique', () => {
  const ids = new Set(); for (const g of GATES) { assert(REGISTRY[g.from] && REGISTRY[g.to], `gate ${g.id}: unknown area`); assert(!ids.has(g.id), 'duplicate gate ' + g.id); ids.add(g.id); if (!g.dev) assert.notEqual(g.from, g.to, `gate ${g.id}: a real gate leads to ANOTHER area (only a dev gate loops back)`); }
  for (const g of GATES) { const len = Math.hypot(g.inward[0], g.inward[1]); assert(Math.abs(len - 1) < 1e-9, `gate ${g.id}: inward is not a unit vector`); assert(g.zone >= 20 && g.zone <= 200, `gate ${g.id}: zone ${g.zone}`); assert(g.arrive.x1 > g.arrive.x0 && g.arrive.z1 > g.arrive.z0, `gate ${g.id}: arrive rect`); if (g.reverse) assert(GATES.some((r) => r.id === g.reverse && r.from === g.to && r.to === g.from), `gate ${g.id}: reverse ${g.reverse} does not lead back`); }
});
console.log(`areas-test: ${passes} passed, ${fails} failed`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails ? 1 : 0);
