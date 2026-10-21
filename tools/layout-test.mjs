// Deterministic (no GPU) test of the world contract src/world/layout.js.
//   node tools/layout-test.mjs                    the strip
//   node tools/area.mjs north tools/layout-test.mjs      another area (the loader remap of its page: docs/AREAS.md section 2)
// Checks: every group id exists in the data and is claimed once, the hero / viewpoint poses are free walkable spots (not inside a building, not on a
// carriageway, inside the play area, with a look-ahead that does not end in a wall within 6 m), the road helpers, the sun vector and the area names.
// The expectations that are specific to an area (claimed ids, the keys of VIEWS, names the HUD must produce, a few road / river points) come from the area module's `TEST` export
// (the strip: tools/lib/area-test-data.mjs, its fallback); the shape is documented there.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveTest } from './lib/area-test-data.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const A = await import(pathToFileURL(path.join(root, 'src/world/area.js')).href);      // the area module of the loaded area (the loader / import map remaps this URL)
const T = resolveTest(A, L);
console.log(`area ${A.ID}: ${L.VIEWS.length} views, ${Object.keys(L.GROUPS).length} group owners`);

const problems = [], notes = [];
const fail = (m) => problems.push(m);

// ---- groups
const known = new Set();
// every record table of the bake that carries OSM ids (a landmark may claim piers, quay walls, parking areas, crossings, steps ... of its precinct, not only buildings and paving)
for (const [k, v] of Object.entries(D)) if (/^[A-Z_]+$/.test(k) && Array.isArray(v)) for (const r of v) if (r && typeof r === 'object' && r.id) known.add(r.id);
const seen = new Map();
for (const [mod, list] of Object.entries(L.GROUPS)) {
  for (const g of list) {
    for (const id of g.ids) { if (!L.buildingById(id)) fail(`group ${g.key}: building id ${id} is not in BUILDINGS`); if (seen.has(id)) fail(`id ${id} claimed by ${seen.get(id)} and ${g.key}`); seen.set(id, g.key); }
    for (const id of g.osm) { if (!known.has(id)) fail(`group ${g.key}: osm id ${id} is not in the data`); if (seen.has(id)) fail(`id ${id} claimed by ${seen.get(id)} and ${g.key}`); seen.set(id, g.key); }
    const mem = L.groupMembers(g.key);
    notes.push(`${mod}/${g.key}: ${g.ids.length} ids -> ${mem.length} records${g.osm.length ? `, ${g.osm.length} osm objects` : ''}`);
  }
}
for (const c of T.claimed) {      // TEST.claimed: the ids the area says must be claimed (and by whom)
  const by = L.claimedBy(c.id), group = L.groupOf(c.id);
  if (!group) fail(`${c.id} must be claimed by a landmark group (TEST.claimed)`);
  else if ((c.by && by !== c.by) || (c.group && group !== c.group)) fail(`${c.id} must be claimed by ${c.by || 'any module'} / ${c.group || 'any group'}, it is claimed by ${by} / ${group}`);
}

// ---- poses
const dir = (yaw) => { const b = -yaw * Math.PI / 180; return [Math.sin(b), -Math.cos(b)]; };
function look(p, max = 250) { const [dx, dz] = dir(p.yaw); for (let d = 1; d < max; d += 0.5) { const b = L.buildingAt(p.x + dx * d, p.z + dz * d); if (b) return { d, b }; } return null; }
const poses = [['HERO', L.HERO], ...L.VIEWS.map((v) => [v.key + ' ' + v.label, v])];
for (const [name, p] of poses) {
  const r = look(p), road = L.isOnRoad(p.x, p.z, 0.5, { all: false }), inside = L.insideBuilding(p.x, p.z, 0.8);
  const inPlay = L.inPlay(p.x, p.z, 5);      // the play area is a union of rectangles (WORLD.play is only its bounding box)
  if (inside) fail(`${name} (${p.x}, ${p.z}) is inside / next to a building`);
  if (road) fail(`${name} (${p.x}, ${p.z}) stands on a carriageway`);
  if (!inPlay) fail(`${name} (${p.x}, ${p.z}) is outside the play area`);
  if (r && r.d < 6) fail(`${name}: a wall ${r.d.toFixed(1)} m ahead (${r.b.id})`);
  notes.push(`${name.padEnd(34)} (${p.x}, ${p.z}) yaw ${p.yaw} pitch ${p.pitch} | ${L.areaAt(p.x, p.z)} | ahead: ${r ? `${r.d.toFixed(0)} m ${r.b.name || r.b.kind} ${r.b.id}` : 'open'}`);
}
if (JSON.stringify(L.HERO) !== JSON.stringify({ x: L.VIEWS[0].x, z: L.VIEWS[0].z, yaw: L.VIEWS[0].yaw, pitch: L.VIEWS[0].pitch })) notes.push('note: HERO differs from view 1');
// the keyed views (TEST.viewKeys; the strip: 1..9, 0 (centre, west), Shift+1..9, Alt+1..5 (metro entrances, the castle)); the rest are Places-list views (key Place.<id>), no key twice
const WANT = T.viewKeys.filter((k) => !/^Place\./.test(k));
const keyed = L.VIEWS.filter((v) => !/^Place\./.test(v.key));
if (keyed.length !== WANT.length || keyed.some((v, i) => v.key !== WANT[i])) fail(`VIEWS must be ${WANT.join(', ')} (in this order), then only Places-list views (key Place.<id>)`);
if (L.VIEWS.findIndex((v) => /^Place\./.test(v.key)) < keyed.length) fail('the Place.<id> views must come after every keyed view');
for (const k of T.viewKeys.filter((k) => /^Place\./.test(k))) if (!L.VIEWS.some((v) => v.key === k)) fail(`TEST.viewKeys names ${k}, which is not in VIEWS`);
// the HUD names the place of every view (not the generic city fallback); tools/views-check.mjs proves land / roadway / colliders with the real street network
for (const v of L.VIEWS) {
  if (L.areaAt(v.x, v.z).startsWith('Санкт-Петербург')) fail(`${v.key} ${v.label}: the HUD area name is the generic fallback`);
}
if (new Set(L.VIEWS.map((v) => v.key)).size !== L.VIEWS.length) fail('a VIEWS key is used twice');

// ---- helpers
if (T.nearestRoad) { const { at, names } = T.nearestRoad, j = L.nearestRoad(at[0], at[1], { drivable: true, named: true }); if (!j || !names.includes(j.road.name)) fail(`nearestRoad at (${at}) returned ${j && j.road.name}`); }
for (const [x, z, text] of T.onRoadNote || []) if (!L.isOnRoad(x, z)) notes.push(`note: (${x},${z}) ${text}`);
if (T.roadsNear) { const { at, r, min } = T.roadsNear; if (L.roadsNear(at[0], at[1], r, { drivable: true }).length < min) fail(`expected at least ${min} roads within ${r} m of (${at})`); }
if (T.riverAny && !T.riverAny.some(([x, z]) => L.inRiver(x, z))) fail(`inRiver: the river should contain one of ${JSON.stringify(T.riverAny)}`);
{ const [x, z] = T.streetLevelAt || [L.HERO.x, L.HERO.z]; if (L.heightAt(x, z) !== 0) fail(`street level must be y = 0 (at ${x},${z})`); }
for (const [x, z] of T.riverBed || []) if (L.heightAt(x, z) >= -1 && L.inRiver(x, z)) fail(`river bed must be below -1 (at ${x},${z})`);
const u = L.toGrid(-165, 98), w = L.fromGrid(u.u, u.v); if (Math.hypot(w.x + 165, w.z - 98) > 1e-6) fail('toGrid / fromGrid are not inverse');
const sun = Math.hypot(...L.SUN_DIR); if (Math.abs(sun - 1) > 0.01) fail(`SUN_DIR length ${sun.toFixed(3)}`);
if (L.SUN_DIR[1] < 0.3 || L.SUN_DIR[1] > 0.8) fail('SUN_DIR elevation outside 17..53 deg');
for (const { x, z, has: want } of T.mustHaveAreas) { const n = L.areaAt(x, z).toLowerCase(); if (want && !n.includes(want.toLowerCase())) fail(`areaAt(${x}, ${z}) = "${n}", expected "${want}"`); }
notes.push(`DEFAULT heights: ${D.BUILDINGS.filter((b) => b.h == null && b.hEst == null).length} of ${D.BUILDINGS.length} records use the kind default (layout.heightOf)`);
notes.push(`footprints: ${L.groundFootprints().length}, roads: ${D.ROADS.length}, play ${JSON.stringify(L.WORLD.play)}`);

// the static claims table must match the OWNS_GROUPS exports (src/world/lib/claims.js reads it instead of importing every landmark module)
{ const { spawnSync } = await import('node:child_process'); const r = spawnSync(process.execPath, [new URL('./owns-table.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--check'], { encoding: 'utf8' }); notes.push(String(r.stdout || '').trim()); if (r.status !== 0) fail('src/world/lib/owns-table.js is stale: run node tools/owns-table.mjs'); }
for (const n of notes) console.log(n);
if (problems.length) { console.log('PROBLEMS:'); for (const p of problems) console.log('  -', p); }
console.log(problems.length ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(problems.length ? 1 : 0);
