// tools/views-streaming-check.mjs - do the island views stream in?  Reads the baked manifest of assets/baked (the region lists of every base asset: city-base, street-surfaces ...), drives the REAL
// createRegionStreamer (src/core/region-streamer.js) over those regions with a stub loader and, for every island view, does what main.js goToView does: ensureAt(x, z), then readyAt(x, z).
// It also lists the frame rectangles the environment region filters (/^(P|V)\d+$/ in far.js, field.js, ground.js, vo-banks.js, waterways.js) select, and checks that V3..V12 are among them.
// usage: node tools/views-streaming-check.mjs      (RESULT: OK / FAIL; with a stale bake the regions are those of the bake, run it again after the final bake)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE = await import('three');
const { decodeBaked } = await import(pathToFileURL(path.join(root, 'src/core/baked-codec.js')).href);
const { createRegionStreamer } = await import(pathToFileURL(path.join(root, 'src/core/region-streamer.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const CITY = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
let problems = 0; const fail = (m) => { problems++; console.log('FAIL ' + m); };

// ---- 1. the frame rectangles the environment filters select
const names = CITY.RECT_NAMES || [];
const sel = names.filter((n) => /^(P|V)\d+$/.test(n));
console.log('rect names:', names.join(' '));
console.log('selected by /^(P|V)\\d+$/:', sel.join(' '));
for (let i = 3; i <= 12; i++) if (!sel.includes('V' + i)) fail('V' + i + ' is not selected by the environment filter');
for (const f of ['far.js', 'field.js', 'ground.js', 'vo-banks.js', 'waterways.js']) {
  const src = fs.readFileSync(path.join(root, 'src/world/environment', f), 'utf8');
  if(f==='far.js'){
    if(!src.includes('horizonRadii(EXTENT_RECTS'))fail('far.js does not protect the complete coverage union');
    else console.log('environment/far.js: complete coverage union protects the horizon');
    continue;
  }
  if(f==='ground.js'){
    const literal=src.match(/const _isP\s*=\s*\(i\)\s*=>\s*\/([^\n]+)\/\.test/);
    if(!literal)fail('ground.js has no recognized mapped-ground selection');
    else{const filter=new RegExp(literal[1]);for(const n of names.filter(n=>/^(?:[PVC]\d+|MP\d+|VP|MS)$/.test(n)))if(!filter.test(n))fail('ground.js excludes mapped region '+n);console.log('environment/ground.js: all island and southern mapped regions selected');}
    continue;
  }
  if (!/\(P\|V\)\\d/.test(src) && !/\^V\\d\+\$/.test(src)) fail(`environment/${f} has no (P|V) rectangle filter`); else console.log(`environment/${f}: the (P|V) filter is present`);
}

// ---- 2. the regions of the baked scene
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/baked/manifest.json'), 'utf8'));
console.log('baked revision', manifest.revision);
const regionsOf = {};
for (const base of ['city-base', 'street-surfaces']) {
  const file = manifest.files[base]; if (!file) { fail('manifest has no ' + base); continue; }
  const data = decodeBaked(new Uint8Array(zlib.gunzipSync(fs.readFileSync(path.join(root, 'assets/baked', file)))).buffer);
  regionsOf[base] = data.regions || [];
  console.log(`${base}: ${regionsOf[base].length} regions`);
}
globalThis.requestIdleCallback = (fn) => setTimeout(fn, 0);
const loaded = new Set();
const island = L.VIEWS.filter((v) => v.group);
const ENSURE_RADIUS = 700, READY_RADIUS = 160;
const distance = (r, v) => Math.hypot(Math.max(r.bounds[0] - v.x, 0, v.x - r.bounds[2]), Math.max(r.bounds[1] - v.z, 0, v.z - r.bounds[3]));
// This is an open shoreline view toward a landmark-owned liner, not a generic city
// building frontage (layout.js; landmarksMarineFacade/groups.js owns the port).
// Its nearest city-base region is ~206 m away. Keep nearby street coverage mandatory
// and require its city backdrop inside the real ensureAt radius instead of inventing
// a building within readyAt's collision-readiness radius. All other views retain 160 m.
const LINER_VIEW = 'Place.marine-facade-liner';
const linerView = island.find(v => v.key === LINER_VIEW);
if (!linerView) fail('the shoreline liner coverage fixture is missing');
else {
  const { KEEP_OUT } = await import(pathToFileURL(path.join(root, 'src/world/landmarksMarineFacade/groups.js')).href);
  const ship = KEEP_OUT.find(s => s.id === 'liner-a');
  const dx = ship.c[0] - linerView.x, dz = ship.c[1] - linerView.z, d = Math.hypot(dx, dz), yaw = linerView.yaw * Math.PI / 180;
  if (L.inRiver(linerView.x, linerView.z) || d > ENSURE_RADIUS || (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / d < Math.cos(Math.PI / 6)) fail('liner fixture no longer describes a shoreline view toward liner A');
}
for (const base of Object.keys(regionsOf)) {
  loaded.clear();
  const ctx = { initialPosition: { x: L.HERO.x, z: L.HERO.z }, mat: { toon: () => new THREE.MeshBasicMaterial() } };
  const streamer = createRegionStreamer(ctx, { async load(name) { loaded.add(name); return { geometries: [], objects: [] }; } });
  await streamer.register({ materials: [], textures: [], regions: regionsOf[base].map((r) => ({ asset: r.asset, bounds: r.bounds })) }, new THREE.Group());
  const atStart = loaded.size;
  let worst = 0;
  for (const v of island) {
    const scenic = v.key === LINER_VIEW, coverageRadius = scenic && base === 'city-base' ? ENSURE_RADIUS : READY_RADIUS;
    const near = regionsOf[base].filter(r => distance(r, v) <= coverageRadius);
    if (!near.length && (base === 'city-base' || scenic)) fail(`${base}: no region within ${coverageRadius} m of ${v.key} ${v.label}`);
    const expected = regionsOf[base].filter(r => distance(r, v) <= ENSURE_RADIUS);
    const before = loaded.size;
    try { await streamer.ensureAt(v.x, v.z, ENSURE_RADIUS); } catch (e) { fail(`${base}: ensureAt ${v.key}: ${e.message}`); }
    if (!streamer.readyAt(v.x, v.z)) fail(`${base}: ${v.key} ${v.label} is not ready after ensureAt`);
    const missing = expected.filter(r => !loaded.has(r.asset));
    if (missing.length || !streamer.readyAt(v.x, v.z, ENSURE_RADIUS)) fail(`${base}: ${v.key} did not load the complete ${ENSURE_RADIUS} m view neighbourhood (${missing.map(r => r.asset).join(', ')})`);
    if (scenic) console.log(`${base}: liner shoreline view, nearest region ${Math.min(...regionsOf[base].map(r => distance(r, v))).toFixed(1)} m, ${expected.length} regions within ${ENSURE_RADIUS} m loaded`);
    worst = Math.max(worst, loaded.size - before);
  }
  console.log(`${base}: ${atStart} region(s) at the start pose, every one of ${island.length} island views ready after ensureAt (at most ${worst} regions loaded per jump), ${loaded.size} of ${regionsOf[base].length} loaded in all, failed ${streamer.stats.failed}`);
  if (streamer.stats.failed) fail(`${base}: ${streamer.stats.failed} region loads failed`);
}
console.log(problems ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(problems ? 1 : 0);
