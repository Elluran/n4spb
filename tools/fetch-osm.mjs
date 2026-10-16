// Downloads the OpenStreetMap layers for the Saint Petersburg centre scene (Moscow Railway Station, Vosstaniya Square, Nevsky, and the western extension to the
// Admiralty / Palace Square) into data/osm-raw/*.json.
//   node tools/fetch-osm.mjs                  fetch only what is MISSING (every layer, every EXTENT rectangle that is not yet covered), merge into the raw files
//   node tools/fetch-osm.mjs buildings roads  only the named layers
//   node tools/fetch-osm.mjs --all            ignore the coverage records and fetch everything again (then merge: the old elements stay first)
//   node tools/fetch-osm.mjs --list           print what would be fetched
//   node tools/fetch-osm.mjs --regions=YE1,KA1 [--tile=900 | --tilemul=2.2] [--coalesce=1.5] [--no-guard]   only the named regions (appended rectangles); see EARLIER-REGION GUARD below
// Data (c) OpenStreetMap contributors, ODbL. The baked result is committed (src/world/data/city*.js), so this only needs to be re-run to refresh / extend the map.
// Always "out geom;" (NOT "out geom tags;"): it keeps the member geometry of relations.
//
// Coverage: every raw file carries `covered`: [{ x0, x1, z0, z1 }] (local metres: the boxes that were downloaded for this layer; a file without it covers the old EXTENT = the first build)
// and `progress` (boxes that are only partly done, one entry per finished tile). The EXTENT_RECTS of tools/osm-lib.mjs (+ 40 m) minus the covered boxes are cut into tiles, one
// Overpass query per tile (small answers for the public servers), and the answers are MERGED into the raw file (de-duplicated by element type + id, existing elements keep
// their place, new ones are appended: the baked arrays therefore keep the old records first). The file is saved after every tile, so a crash / ^C loses nothing.
// Overpass is slow and rate limited: one request at a time, sleeps, retries, mirrors (log: data/fetch4.log). The Neva (relation 2599821, 70 km of banks) is NEVER requested
// whole inside the bbox queries (it makes them time out): the two relations of the Neva near the scene (Bolshaya Neva 1114249 and the Neva 2599821, 330 KB with geometry) are
// requested ONCE with their own query (`once` of the water layer).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unproj, EXTENT_RECTS, RECT_NAMES, OLD_EXTENT, EXTENT, ORIGIN, KX, KY } from './osm-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'data', 'osm-raw');
fs.mkdirSync(outDir, { recursive: true });
const logFile = path.join(root, 'data', 'fetch4.log');
const log = (...a) => { const s = `[${new Date().toISOString().slice(11, 19)}] ${a.join(' ')}`; console.log(s); try { fs.appendFileSync(logFile, s + '\n'); } catch { /* ignore */ } };

const M = 40;   // metres of margin around every EXTENT rectangle (the bake clips to the EXTENT union)
const grow = (r, m) => ({ x0: r.x0 - m, x1: r.x1 + m, z0: r.z0 - m, z1: r.z1 + m });
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const UA = 'piter-anime-walk/1.0 (data bake; research; nepo7771@gmail.com)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bbQ = (r) => { const [w, n] = unproj(r.x0, r.z0), [e, s] = unproj(r.x1, r.z1); return `${s.toFixed(5)},${w.toFixed(5)},${n.toFixed(5)},${e.toFixed(5)}`; };

async function query(name, ql) {
  for (let attempt = 0; attempt < 14; attempt++) {
    const ep = ENDPOINTS[attempt % ENDPOINTS.length]; // Try a mirror after a rate limit or timeout.
    try {
      const res = await fetch(ep, { method: 'POST', headers: { 'User-Agent': UA, Accept: '*/*', 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(ql), signal: AbortSignal.timeout(ep === ENDPOINTS[0] ? 200000 : 40000) });
      const text = await res.text();
      if (text.trimStart().startsWith('{')) {
        const j = JSON.parse(text);
        if (j.remark && /runtime error|timed out|out of memory/i.test(j.remark)) { log(`  ${name}: attempt ${attempt + 1} remark "${j.remark.slice(0, 80)}" via ${new URL(ep).host}`); }
        else { log(`  ${name}: ${j.elements.length} elements (${(text.length / 1e6).toFixed(2)} MB) via ${new URL(ep).host}`); return j.elements; }
      } else log(`  ${name}: attempt ${attempt + 1} not JSON (${res.status}) via ${new URL(ep).host}`);
    } catch (e) { log(`  ${name}: attempt ${attempt + 1} ${e.message} via ${new URL(ep).host}`); }
    await sleep(6000 + attempt * 3000);
  }
  throw new Error('giving up on ' + name);
}

const wrap = (body) => `[out:json][timeout:170];(${body});out geom;`;
// layer = { tile: target tile edge in metres, q(b) -> [Overpass QL] } ; b = "south,west,north,east"
const LAYERS = {
  // rivers / canals (Fontanka, Moika, Griboedov, Winter Canal ...: natural=water polygons or waterway lines), ponds, basins, fountains; the Neva banks: see header
  water: { tile: 2600, q: (b) => [wrap(`nwr["natural"="water"](${b});nwr["waterway"](${b});nwr["landuse"="basin"](${b});nwr["amenity"="fountain"](${b});nwr["water"](${b});`)
  ], once: [`[out:json][timeout:170];(rel(1114249);rel(2599821););out geom;`] /* Bolshaya Neva (Admiralty / Senate banks) + the Neva (Palace embankment), 330 KB, requested once */ },
  // carriageways, footways, pedestrian streets/areas (highway=pedestrian + area=yes, multipolygons), steps, crossings, squares; tunnels / bridges are flagged by their tags
  roads: { tile: 900, q: (b) => [wrap(`way["highway"](${b});relation["highway"]["type"="multipolygon"](${b});nwr["place"="square"](${b});nwr["area:highway"](${b});`)] },
  // nodes on/next to the street: signals, crossings, bus stops, lamps, traffic calming, doors, benches, bins, shelters, bike racks...
  street: { tile: 900, q: (b) => [wrap(`node["highway"~"^(traffic_signals|crossing|bus_stop|street_lamp|stop|give_way|speed_camera|traffic_mirror|mini_roundabout|turning_circle|elevator|platform)$"](${b});`
    + `node["traffic_calming"](${b});way["traffic_calming"](${b});node["entrance"](${b});`
    + `node["amenity"~"^(bench|shelter|waste_basket|waste_disposal|bicycle_parking|vending_machine|post_box|telephone|clock|drinking_water|toilets|bicycle_rental|taxi|atm|charging_station|fuel)$"](${b});`
    + `node["emergency"](${b});node["leisure"~"^(picnic_table|fitness_station)$"](${b});node["advertising"](${b});way["advertising"](${b});`)] },
  // public transport objects: stop positions / platforms / stations / stop areas
  transit: { tile: 1600, q: (b) => [wrap(`nwr["public_transport"](${b});nwr["highway"="bus_stop"](${b});nwr["amenity"="bus_station"](${b});`)] },
  // every railway=* object: main line + yard tracks, platforms, stations / halts, subway tunnels + stations + entrances, tramways, buffer stops, crossings, signals
  rail: { tile: 1100, q: (b) => [wrap(`nwr["railway"](${b});nwr["station"="subway"](${b});nwr["building"~"^(train_station|transportation)$"](${b});nwr["subway"](${b});`)] },
  // subway route relations (ordered station members; whole line geometry, a handful of relations) and their member nodes
  subwayroutes: { tile: 5000, q: (b) => [`[out:json][timeout:170];rel["route"="subway"](${b})->.r;.r out geom;node(r.r);out;`,
    `[out:json][timeout:170];rel["route_master"~"^(subway|light_rail)$"](${b});out body;`] },
  // trolleybus / tram / bus routes: members only ("out body": way ids + stop nodes); the geometry comes from the roads / rail layers by way id, the stop nodes are fetched with them
  routes: { tile: 1100, q: (b) => [`[out:json][timeout:170];rel["route"~"^(trolleybus|tram)$"](${b})->.r;.r out body;node(r.r)(${b});out;`,
    `[out:json][timeout:170];rel["route"~"^(bus|share_taxi)$"](${b})->.r;.r out body;node(r.r)(${b});out;`] },
  // parks, gardens, pitches, playgrounds, stadiums, sports centres; landuse (grass, forest, residential, commercial, construction...); natural (wood, scrub, tree_row...)
  green: { tile: 1100, q: (b) => [wrap(`nwr["leisure"](${b});nwr["landuse"](${b});nwr["natural"~"^(wood|scrub|grassland|tree_row|heath|wetland|sand|bare_rock|shrubbery|fell|scree)$"](${b});`)] },
  trees: { tile: 1600, q: (b) => [`[out:json][timeout:120];(node["natural"="tree"](${b}););out;`] },
  parking: { tile: 1600, q: (b) => [wrap(`nwr["amenity"~"^(parking|parking_space|parking_entrance|motorcycle_parking|bicycle_parking|taxi)$"](${b});`)] },
  barriers: { tile: 900, q: (b) => [wrap(`way["barrier"](${b});node["barrier"](${b});relation["barrier"](${b});`)] },
  // everything man_made (embankments / quays, flagpoles, towers, masts, chimneys, lamps, street cabinets, monuments...) + substations
  manmade: { tile: 900, q: (b) => [wrap(`nwr["man_made"](${b});nwr["power"~"^(substation|tower|pole|transformer|generator)$"](${b});nwr["pipeline"](${b});nwr["location"="overground"](${b});nwr["waterway"~"^(bank|weir|lock_gate|dock|boatyard)$"](${b});`)] },
  historic: { tile: 900, q: (b) => [wrap(`nwr["historic"](${b});nwr["memorial"](${b});nwr["tourism"="artwork"](${b});nwr["heritage"](${b});`)] },
  // named (and unnamed) points of interest: for the signage module
  pois: { tile: 600, q: (b) => [wrap(`nwr["shop"](${b});nwr["amenity"](${b});nwr["tourism"](${b});nwr["office"](${b});nwr["craft"](${b});nwr["healthcare"](${b});nwr["leisure"]["name"](${b});nwr["historic"]["name"](${b});`)] },
  bridges: { tile: 1400, q: (b) => [wrap(`way["bridge"](${b});nwr["man_made"="bridge"](${b});way["tunnel"](${b});way["man_made"="bridge"](${b});`)] },
  // buildings (+ parts): the densest layer, small tiles keep every response small enough for the public servers
  buildings: { tile: 520, q: (b) => [wrap(`nwr["building"](${b});nwr["building:part"](${b});`)] },
};

// ---------------------------------------------------------------- rectangle arithmetic (local metres)
// todo = (union of the wanted rectangles) minus (union of the covered boxes): the cells of the grid of all rectangle edges, merged into row runs, then equal-width rows,
// then every piece thinner than MINW is grown (re-fetching a little overlap is cheaper than a query for a 10 m sliver; the merge de-duplicates).
const MINW = 140;
const inBox = (r, x, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;
function missing(want, covered) {
  const xs = [...new Set([...want, ...covered].flatMap((r) => [r.x0, r.x1]))].sort((a, b) => a - b), zs = [...new Set([...want, ...covered].flatMap((r) => [r.z0, r.z1]))].sort((a, b) => a - b);
  const rows = [];
  for (let j = 0; j + 1 < zs.length; j++) {
    const cz = (zs[j] + zs[j + 1]) / 2, runs = [];
    for (let i = 0; i + 1 < xs.length; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      if (!want.some((r) => inBox(r, cx, cz)) || covered.some((r) => inBox(r, cx, cz))) continue;
      const last = runs[runs.length - 1]; if (last && last.x1 === xs[i]) last.x1 = xs[i + 1]; else runs.push({ x0: xs[i], x1: xs[i + 1], z0: zs[j], z1: zs[j + 1] });
    }
    for (const r of runs) { const o = rows.find((q) => q.x0 === r.x0 && q.x1 === r.x1 && q.z1 === r.z0); if (o) o.z1 = r.z1; else rows.push(r); }
  }
  return rows.map((r) => { const gx = Math.max(0, (MINW - (r.x1 - r.x0)) / 2), gz = Math.max(0, (MINW - (r.z1 - r.z0)) / 2); return { x0: r.x0 - gx, x1: r.x1 + gx, z0: r.z0 - gz, z1: r.z1 + gz }; });
}
// --coalesce[=1.5]: merge neighbouring pieces of the todo list while the bounding box of two pieces is at most that many times their own area (a staircase of rectangles is one
// query per step otherwise: ~400 queries for the islands round 2 against ~60). The merged box is fetched whole (what is already in the layer is skipped by the merge).
function coalesce(rs, ratio) {
  const area = (r) => (r.x1 - r.x0) * (r.z1 - r.z0), bb = (a, b) => ({ x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), z0: Math.min(a.z0, b.z0), z1: Math.max(a.z1, b.z1) });
  const ov = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0));
  let list = rs.map((r) => ({ ...r })), again = true;
  while (again) {
    again = false; let best = null;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const m = bb(list[i], list[j]), own = area(list[i]) + area(list[j]) - ov(list[i], list[j]), q = area(m) / own;
      if (q <= ratio && (!best || q < best.q)) best = { i, j, m, q };
    }
    if (best) { list = list.filter((_, k) => k !== best.i && k !== best.j); list.push(best.m); again = true; }
  }
  return list;
}
const tileOf = (r, edge) => { const nx = Math.max(1, Math.round((r.x1 - r.x0) / edge)), nz = Math.max(1, Math.round((r.z1 - r.z0) / edge)), t = []; for (let i = 0; i < nz; i++) for (let j = 0; j < nx; j++) t.push({ x0: r.x0 + (r.x1 - r.x0) * j / nx, x1: r.x0 + (r.x1 - r.x0) * (j + 1) / nx, z0: r.z0 + (r.z1 - r.z0) * i / nz, z1: r.z0 + (r.z1 - r.z0) * (i + 1) / nz }); return t; };
const r0 = (r) => ({ x0: Math.round(r.x0), x1: Math.round(r.x1), z0: Math.round(r.z0), z1: Math.round(r.z1) });

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const wanted = args.filter((a) => !a.startsWith('--'));
const names = wanted.length ? wanted : Object.keys(LAYERS);
// Scope incremental district fetches without downloading another agent's regions.
// Example: --regions=E1 --tile=1200 (tile override is optional, in metres).
const regionArg = args.find((a) => a.startsWith('--regions='));
const regions = regionArg ? regionArg.slice(10).split(',') : RECT_NAMES;
for (const region of regions) if (!RECT_NAMES.includes(region)) throw new Error('Unknown region: ' + region);
const coArg = args.find((a) => a.startsWith('--coalesce'));
const coRatio = coArg ? (coArg.includes('=') ? Number(coArg.split('=')[1]) : 1.5) : 0;
const tileArg = args.find((a) => a.startsWith('--tile='));
const tileOverride = tileArg ? Number(tileArg.slice(7)) : null;
const mulArg = args.find((a) => a.startsWith('--tilemul='));
const tileMul = mulArg ? Number(mulArg.slice(10)) : 1;   // the tile edges of LAYERS were tuned for the dense centre: parks / islands / water take bigger tiles (islands round 2: 2.2)
if (!Number.isFinite(tileMul) || tileMul < 0.5 || tileMul > 6) throw new Error('--tilemul must be 0.5 .. 6');
if (tileArg && (!Number.isFinite(tileOverride) || tileOverride < 140)) throw new Error('--tile must be at least 140 metres');
const WANT = EXTENT_RECTS.filter((r, i) => regions.includes(RECT_NAMES[i])).map((r) => grow(r, M));
// EARLIER-REGION GUARD (2026-10-13, islands round 2; the same rule as tools/fetch-osm-map.py): the tiles of a new region overlap the regions that were fetched, baked and reviewed before it,
// and Overpass knows newer / broader data than the first fetches (OSM edits, other tag lists). An element that is NEW to a raw layer and lies wholly inside the EXTENT rectangles of the
// regions listed BEFORE the first requested region is not added (it would only add records to a finished district; the count is logged). Elements that reach new ground are kept whole.
const firstIdx = Math.min(...regions.map((r) => RECT_NAMES.indexOf(r)));
const EARLIER = flags.has('--no-guard') ? [] : EXTENT_RECTS.slice(0, firstIdx);
const inEarlier = (lon, lat) => { const x = (lon - ORIGIN.lon) * KX, z = -(lat - ORIGIN.lat) * KY; return EARLIER.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1); };
function* elPoints(e) {
  if (e.type === 'node') { yield [e.lon, e.lat]; return; }
  if (e.type === 'way') { for (const p of e.geometry || []) yield [p.lon, p.lat]; return; }
  for (const m of e.members || []) { for (const p of m.geometry || []) yield [p.lon, p.lat]; if (m.lat !== undefined) yield [m.lon, m.lat]; }
}
const reachesNewGround = (e) => { let any = false; for (const [lon, lat] of elPoints(e)) { any = true; if (!inEarlier(lon, lat)) return true; } return !any; };
let pruned = 0;

for (const name of names) {
  if (!LAYERS[name]) { log('unknown layer', name); continue; }
  const file = path.join(outDir, name + '.json');
  const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { elements: [] };
  raw.covered = raw.covered || (raw.elements.length ? [grow(OLD_EXTENT, M)] : []);   // the first build: the old EXTENT (+ margin)
  raw.progress = raw.progress || [];
  if (flags.has('--all')) { raw.covered = []; raw.progress = []; }
  const seen = new Set(raw.elements.map((e) => e.type + e.id));
  // everything we want minus what is covered (the finished boxes + the finished tiles)
  const todo = missing(WANT, [...raw.covered, ...raw.progress]);
  const tiles = (coRatio ? coalesce(todo, coRatio) : todo).flatMap((r) => tileOf(r, tileOverride || LAYERS[name].tile * tileMul));
  const once = (LAYERS[name].once || []).filter(() => !seen.has('relation2599821'));
  log(`layer ${name}: ${raw.elements.length} elements, ${tiles.length} tile(s) to fetch${tiles.length ? '' : ' (complete)'}`);
  if (flags.has('--list')) { for (const t of tiles) log('   ', JSON.stringify(r0(t))); continue; }
  const save = () => { raw.extent = EXTENT; raw.fetched = new Date().toISOString().slice(0, 10); fs.writeFileSync(file + '.tmp', JSON.stringify(raw)); fs.renameSync(file + '.tmp', file); };
  for (const ql of once) { for (const el of await query(`${name} once`, ql)) { const k = el.type + el.id; if (!seen.has(k)) { seen.add(k); raw.elements.push(el); } } raw.progress = raw.progress || []; save(); await sleep(5000); }
  let n = 0;
  for (const t of tiles) {
    n++;
    const b = bbQ(t); let added = 0;
    for (const [qi, ql] of LAYERS[name].q(b).entries()) {
      for (const el of await query(`${name} tile ${n}/${tiles.length} q${qi + 1}`, ql)) { const k = el.type + el.id; if (seen.has(k)) continue; if (!reachesNewGround(el)) { pruned++; continue; } seen.add(k); raw.elements.push(el); added++; }
      await sleep(5000);
    }
    raw.progress.push(r0(t)); save();
    log(`  tile ${n}/${tiles.length} ${JSON.stringify(r0(t))}: +${added} new elements (${raw.elements.length} total)`);
  }
  // all wanted boxes are now covered: fold the tiles into `covered`
  if (tiles.length) { raw.covered = [...raw.covered, ...WANT.map(r0)]; raw.progress = []; save(); }
  log(`  -> data/osm-raw/${name}.json (${raw.elements.length} unique elements; ${pruned} new elements wholly inside the earlier regions were not added)`); pruned = 0;
}
log('done');
