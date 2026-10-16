// Deterministic (no GPU) test of the world contract src/world/layout.js.
//   node tools/layout-test.mjs
// Checks: every group id exists in the data and is claimed once, the hero / viewpoint poses are free walkable spots (not inside a building, not on a
// carriageway, inside the play area, with a look-ahead that does not end in a wall within 6 m), the road helpers, the sun vector and the area names.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);

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
if (L.claimedBy('r2404499') !== 'landmarksA' || L.groupOf('r2404499') !== 'station') fail('the Moscow station r2404499 must be claimed by landmarksA / station');
if (L.groupOf('r16492039') !== 'station') fail('parts of a claimed outline (clock tower r16492039) must be claimed too');
if (L.claimedBy('w28962850') !== 'metro') fail('the metro rotunda w28962850 must be claimed by metro');

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
// the keyed views of the strip: 1..9, 0 (centre, west), Shift+1..9, Alt+1..5 (metro entrances, the castle); the rest are Places-list views (key Place.<id>), no key twice
const WANT = [...Array(9)].map((_, i) => 'Digit' + (i + 1)).concat(['Digit0'], [...Array(9)].map((_, i) => 'ShiftDigit' + (i + 1)), [...Array(5)].map((_, i) => 'AltDigit' + (i + 1)));
const keyed = L.VIEWS.filter((v) => !/^Place\./.test(v.key));
if (keyed.length !== WANT.length || keyed.some((v, i) => v.key !== WANT[i])) fail('VIEWS must be 1-9, 0, Shift+1-9, Alt+1-5 (in this order), then only Places-list views (key Place.<id>)');
if (L.VIEWS.findIndex((v) => /^Place\./.test(v.key)) < keyed.length) fail('the Place.<id> views must come after every keyed view');
// the HUD names the place of every view (not the generic city fallback); tools/views-check.mjs proves land / roadway / colliders with the real street network
for (const v of L.VIEWS) {
  if (L.areaAt(v.x, v.z).startsWith('Санкт-Петербург')) fail(`${v.key} ${v.label}: the HUD area name is the generic fallback`);
}
if (new Set(L.VIEWS.map((v) => v.key)).size !== L.VIEWS.length) fail('a VIEWS key is used twice');

// ---- helpers
const j = L.nearestRoad(L.OBELISK.x, L.OBELISK.z, { drivable: true, named: true });
if (!j || !['Невский проспект', 'площадь Восстания', 'Лиговский проспект'].includes(j.road.name)) fail(`nearestRoad at the obelisk returned ${j && j.road.name}`);
if (!L.isOnRoad(L.SQUARE.x - 60, 150)) notes.push('note: (529,150) is not on a road (check Nevsky position)');
if (L.roadsNear(L.SQUARE.x, L.SQUARE.z, 75, { drivable: true }).length < 3) fail('expected the roads around Vosstaniya Square within 75 m');
if (!L.inRiver(-480, 0) && !L.inRiver(-440, -90)) fail('inRiver: the Fontanka should contain (-440,-90) or (-480,0)');
if (L.heightAt(0, 0) !== 0) fail('street level must be y = 0');
if (L.heightAt(-470, 0) >= -1 && L.inRiver(-470, 0)) fail('river bed must be below -1');
const u = L.toGrid(-165, 98), w = L.fromGrid(u.u, u.v); if (Math.hypot(w.x + 165, w.z - 98) > 1e-6) fail('toGrid / fromGrid are not inverse');
const sun = Math.hypot(...L.SUN_DIR); if (Math.abs(sun - 1) > 0.01) fail(`SUN_DIR length ${sun.toFixed(3)}`);
if (L.SUN_DIR[1] < 0.3 || L.SUN_DIR[1] > 0.8) fail('SUN_DIR elevation outside 17..53 deg');
for (const [x, z, want] of [[L.OBELISK.x, L.OBELISK.z, 'обелиск'], [-441, -93, 'Аничков'], [L.STATION.x, L.STATION.z, 'вокзал']]) { const n = L.areaAt(x, z).toLowerCase(); if (want && !n.includes(want.toLowerCase())) fail(`areaAt(${x}, ${z}) = "${n}", expected "${want}"`); }
notes.push(`DEFAULT heights: ${D.BUILDINGS.filter((b) => b.h == null && b.hEst == null).length} of ${D.BUILDINGS.length} records use the kind default (layout.heightOf)`);
notes.push(`footprints: ${L.groundFootprints().length}, roads: ${D.ROADS.length}, play ${JSON.stringify(L.WORLD.play)}`);

// the static claims table must match the OWNS_GROUPS exports (src/world/lib/claims.js reads it instead of importing every landmark module)
{ const { spawnSync } = await import('node:child_process'); const r = spawnSync(process.execPath, [new URL('./owns-table.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '--check'], { encoding: 'utf8' }); notes.push(String(r.stdout || '').trim()); if (r.status !== 0) fail('src/world/lib/owns-table.js is stale: run node tools/owns-table.mjs'); }
for (const n of notes) console.log(n);
if (problems.length) { console.log('PROBLEMS:'); for (const p of problems) console.log('  -', p); }
console.log(problems.length ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(problems.length ? 1 : 0);
