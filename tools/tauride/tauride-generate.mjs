// Step 1 of the Tauride data pipeline: collect the site records into one derived.json (garden polygon, water pieces, ways, fences, gates, furniture, footprints ...).
//   node tools/tauride/tauride-generate.mjs [--source facade|raw] [--raw tools/tauride/raw/tauride-raw.json] [--work tools/tauride/raw/work] [--terrain-out <file>]
// --source facade (default): reads the North data facade (src/areas/north/data): no download, no snapshot. Writes <work>/derived.json (schema tauride-derived/2).
// --source raw: the ORIGINAL behaviour of the generator of the source repository (102_3d_piter, 0568f7af): reads the Overpass snapshot tauride-raw.json (put it in tools/tauride/raw/, git-ignored;
//   fetch-tauride.mjs / tauride-extract.py make it) and writes derived.json in the old shape. Kept so that the moved pipeline can be proved byte-identical to the old terrain.js.
// --terrain-out <file>: raw mode only: also write the complete legacy terrain.js (needs <work>/union.json from tauride-union.py: run it first; the file is rewritten whole, never appended to).
// Deterministic: no clock, no randomness, no network in facade mode.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, RAW_DIR, WORK_DIR, parseArgs, loadFacade, writeJson, writeText, readJson, rel, r1 } from './lib/common.mjs';
import { gardenPolygon, waterPieces, gardenPaths, gardenFences, gardenGates, fenceOpenings, unfencedStretches, serviceLane, gardenFurniture, gardenGreen, gardenFootprints, palaceRecord } from './lib/derive.mjs';
import { CANAL_WIDTHS } from './lib/tables.mjs';

const args = parseArgs();
const source = args.source || 'facade';
const work = path.resolve(ROOT, args.work || rel(WORK_DIR));

async function fromFacade() {
  const F = await loadFacade();
  const G = gardenPolygon(F);
  const paths = gardenPaths(F, G);
  const { pieces, canals } = waterPieces(F, paths);
  const fences = gardenFences(F, G);
  const gates = gardenGates(F, G);
  const openings = fenceOpenings(fences, paths, gates);
  const unfenced = unfencedStretches(G, fences);
  const footprints = gardenFootprints(F, G);
  const palace = palaceRecord(F);
  return {
    schema: 'tauride-derived/2', source: 'facade',
    garden: [{ o: G.o, h: G.h }], gardenId: G.id, gardenName: G.name,
    ponds: pieces, canals, paths, barriers: fences, gates, openings, unfenced,
    serviceLane: serviceLane(F, G), furniture: gardenFurniture(F, G), green: gardenGreen(F, G), footprints,
    buildings: [{ id: palace.id, tags: { name: palace.name }, cx: palace.cx, cz: palace.cz, polys: palace.polys }, ...footprints.map((f) => ({ id: f.id, tags: { name: f.name }, cx: f.cx, cz: f.cz, polys: f.polys }))],
  };
}

async function fromRaw() {
  // the legacy path: identical to tauride-generate.mjs of the source repository, with the roots made relative
  const { proj, elementPolys, flat, centroid, pointInPoly } = await import('../osm-lib.mjs');
  const rawFile = path.resolve(ROOT, args.raw || path.join(rel(RAW_DIR), 'tauride-raw.json'));
  if (!fs.existsSync(rawFile)) throw new Error(`no raw snapshot at ${rel(rawFile)} (git-ignored, third-party: run tools/tauride/fetch-tauride.mjs, or tauride-extract.py on an OSM XML, or copy a tauride-raw.json there)`);
  const elems = readJson(rawFile).elements;
  const id = (e) => e.type[0] + e.id;
  const garden = elementPolys(elems.find((e) => id(e) === 'r1582734'));
  const convert = (p) => ({ o: flat(p.o), h: p.h.map(flat) });
  const ponds = elems.filter((e) => ['r1582714', 'r6278222'].includes(id(e))).flatMap((e) => elementPolys(e).map((p) => ({ id: id(e), ...convert(p) })));
  // OSM maps the garden's small southern channels as centre lines, not areas. Widths estimated (tables.mjs CANAL_WIDTHS: the old generator's 12/12/6/10, default 8)
  for (const e of elems.filter((e) => e.tags.waterway === 'canal')) {
    const width = (CANAL_WIDTHS[id(e)] || { estimate: 8 }).estimate;
    const a = e.geometry.map((p) => proj(p.lon, p.lat));
    const side = (s) => a.map((p, i) => { const b = a[Math.max(0, i - 1)], c = a[Math.min(a.length - 1, i + 1)], dx = c[0] - b[0], dz = c[1] - b[1], l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * width / 2 * s, p[1] + dx / l * width / 2 * s]; });
    ponds.push({ id: id(e), estimatedWidth: width, o: flat([...side(1), ...side(-1).reverse()]), h: [] });
  }
  const inside = (p) => garden.some((g) => pointInPoly(p, g));
  const paths = elems.filter((e) => e.type === 'way' && ['footway', 'path', 'pedestrian', 'steps'].includes(e.tags.highway) && e.geometry?.some((p) => inside(proj(p.lon, p.lat)))).map((e) => ({ id: id(e), pts: flat(e.geometry.map((p) => proj(p.lon, p.lat))), bridge: !!e.tags.bridge, w: parseFloat(e.tags.width) || 3 }));
  const barriers = elems.filter((e) => e.type === 'way' && e.tags.barrier === 'fence' && e.geometry?.some((p) => inside(proj(p.lon, p.lat)))).map((e) => ({ id: id(e), pts: flat(e.geometry.map((p) => proj(p.lon, p.lat))) }));
  const gates = elems.filter((e) => e.type === 'node' && ['gate', 'entrance'].includes(e.tags.barrier) && garden.some((p) => pointInPoly(proj(e.lon, e.lat), p))).map((e) => ({ id: id(e), p: proj(e.lon, e.lat) }));
  const buildings = elems.filter((e) => e.tags.building).flatMap((e) => { const ps = elementPolys(e); if (!ps.length) return []; const c = centroid(ps[0].o); return [{ id: id(e), tags: e.tags, polys: ps.map(convert), cx: c[0], cz: c[1] }]; });
  return { schema: 'tauride-derived/1', source: 'raw', garden: garden.map(convert), ponds, paths, barriers, gates, buildings };
}

/** the complete legacy terrain.js (the five exports of the old generator + TAURIDE_WATER_UNION): ONE write of a whole file */
function legacyTerrain(d, union) {
  const head = '// OpenStreetMap contributors, ODbL. API map snapshots 2026-10-03. Local frame from tools/osm-lib.mjs.\n// Pond polygons exact; canal widths estimated at 6-12m from aerial references and mapped bridge spans.\n';
  const base = Object.entries({ TAURIDE_GARDEN: d.garden, TAURIDE_PONDS: d.ponds, TAURIDE_PATHS: d.paths, TAURIDE_FENCES: d.barriers, TAURIDE_GATES: d.gates }).map(([k, v]) => 'export const ' + k + ' = ' + JSON.stringify(v) + ';').join('\n') + '\n';
  return head + base + 'export const TAURIDE_WATER_UNION = ' + JSON.stringify(union.polygons) + ';\n';
}

const d = source === 'raw' ? await fromRaw() : await fromFacade();
fs.mkdirSync(work, { recursive: true });
const out = path.join(work, 'derived.json');
const bytes = writeJson(out, d);
console.log(`derived (${source}): garden ${d.garden.length} polygon(s) ${d.garden[0].o.length / 2} verts, ponds ${d.ponds.length}, paths ${d.paths.length}, fences ${d.barriers.length}, gates ${d.gates.length}, buildings ${d.buildings.length} -> ${rel(out)} (${bytes} B)`);
if (source === 'raw' && args['terrain-out']) {
  const u = path.join(work, 'union.json');
  if (!fs.existsSync(u)) throw new Error(`--terrain-out needs ${rel(u)}: run tools/tauride/tauride-union.py first`);
  const n = writeText(path.resolve(ROOT, args['terrain-out']), legacyTerrain(d, readJson(u)));
  console.log(`legacy terrain.js written whole -> ${args['terrain-out']} (${n} B)`);
}
