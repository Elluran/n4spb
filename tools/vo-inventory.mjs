// vo-inventory.mjs - every NAMED OSM object that lies on Vasilievsky Island (the polygon docs/reference/vo-island-polygon.json), from the raw layers data/osm-raw/*.json
// (buildings, pois, historic, manmade, green, water, bridges, transit, rail, roads, street, parking, barriers + the route relations that serve a stop on the island).
//   node tools/vo-inventory.mjs [out.json] [stats.json]      default out: docs/reference/vo-osm-inventory.json (an array, one object per line, sorted by importance)
// Record: { id ('w123' / 'r123' / 'n123' as in the baked data; 'street:<name>' for a street merged from its ways), type (OSM type; 'street'), name, name:en, kind[] (museum, worship, monument, historic,
// attraction, heritage, education, culture, station, rail, stop, bridge, pier, cemetery, park, square, water, health, shop-or-food, building, street, route, other), tags (a subset),
// x, z (centroid / middle of a line, local metres), areaM2 (closed outlines), lengthM (lines), importance (tourism / historic / worship / museum first), layers }.
// A node or an area counts when its centroid is inside the polygon (+ 8 m), a line when a vertex is within 60 m of it (bridges end on the quay, the polygon is the shore line).
// The raw layers come from tools/fetch-osm-map.py (Overpass is not needed); they are git-ignored, so run fetch-osm-map.py first on a fresh clone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const lib = await import(pathToFileURL(ROOT + 'tools/osm-lib.mjs').href);
const poly = JSON.parse(fs.readFileSync(ROOT + 'docs/reference/vo-island-polygon.json', 'utf8')).points;
const PB = poly.reduce((b, p) => ({ x0: Math.min(b.x0, p[0]), x1: Math.max(b.x1, p[0]), z0: Math.min(b.z0, p[1]), z1: Math.max(b.z1, p[1]) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
const inside = (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const dseg = (px, pz, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1; let t = ((px - a[0]) * dx + (pz - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - a[0] - t * dx, pz - a[1] - t * dz); };
const dpoly = (x, z) => { let m = 1e9; for (let i = 0; i < poly.length; i++) m = Math.min(m, dseg(x, z, poly[i], poly[(i + 1) % poly.length])); return m; };
const near = (x, z, m = 30) => (x < PB.x0 - m || x > PB.x1 + m || z < PB.z0 - m || z > PB.z1 + m) ? false : (inside(x, z) || dpoly(x, z) <= m);

const LAYERS = ['buildings', 'pois', 'historic', 'manmade', 'green', 'water', 'bridges', 'transit', 'rail', 'roads', 'street', 'parking', 'barriers'];
const KEEP = ['name', 'name:en', 'name:ru', 'alt_name', 'old_name', 'official_name', 'short_name', 'addr:street', 'addr:housenumber', 'addr:city', 'start_date', 'architect', 'architect:wikidata', 'building', 'building:levels', 'building:architecture', 'building:part', 'building:material', 'height', 'roof:shape',
  'tourism', 'historic', 'heritage', 'heritage:operator', 'amenity', 'leisure', 'religion', 'denomination', 'man_made', 'bridge', 'bridge:name', 'memorial', 'artwork_type', 'wikidata', 'wikipedia', 'railway', 'station', 'subway', 'public_transport', 'landuse', 'natural', 'waterway', 'water',
  'highway', 'shop', 'office', 'operator', 'ref', 'inscription', 'subject', 'description', 'layer', 'tunnel', 'place', 'sport', 'cuisine', 'opening_hours', 'heritage:ref', 'ref:okn', 'wheelchair', 'lanes', 'maxspeed', 'oneway', 'surface', 'tram', 'trolleybus', 'bus', 'barrier', 'entrance'];

const area2 = (r) => { let a = 0; for (let i = 0, n = r.length - 1; i < n; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
const geomOf = (e) => {
  if (e.type === 'node') { if (e.lat == null) return null; const p = lib.proj(e.lon, e.lat); return { x: p[0], z: p[1], pts: [p], area: 0, len: 0 }; }
  if (e.type === 'way') {
    if (!e.geometry || !e.geometry.length) return null;
    const pts = e.geometry.map((n) => lib.proj(n.lon, n.lat));
    const closed = pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1];
    if (closed) { const c = lib.centroid(pts); return { x: c[0], z: c[1], pts, area: Math.abs(area2(pts)), len: 0, closed: true }; }
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let acc = 0, mid = pts[0]; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (acc + l >= len / 2) { const t = (len / 2 - acc) / (l || 1); mid = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; break; } acc += l; }
    return { x: mid[0], z: mid[1], pts, area: 0, len };
  }
  // relation: polygons from the members (outer rings), else the points of the member geometry / member nodes
  const polys = lib.elementPolys(e);
  if (polys.length) {
    let A = 0, cx = 0, cz = 0; const all = [];
    for (const p of polys) { const a = Math.abs(area2(p.o.concat([p.o[0]]))); const holes = p.h.reduce((s, h) => s + Math.abs(area2(h.concat([h[0]]))), 0); const c = lib.centroid(p.o.concat([p.o[0]])); A += a - holes; cx += c[0] * a; cz += c[1] * a; all.push(...p.o); }
    const w = polys.reduce((s, p) => s + Math.abs(area2(p.o.concat([p.o[0]]))), 0) || 1;
    return { x: cx / w, z: cz / w, pts: all, area: Math.max(0, A), len: 0, closed: true };
  }
  const pts = []; for (const m of e.members || []) { if (m.geometry) for (const n of m.geometry) pts.push(lib.proj(n.lon, n.lat)); else if (m.lat != null) pts.push(lib.proj(m.lon, m.lat)); }
  if (!pts.length) return null;
  const c = pts.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
  return { x: c[0] / pts.length, z: c[1] / pts.length, pts, area: 0, len: 0 };
};

// ---------------------------------------------------------------- classification + importance
const WORSHIP_B = new Set(['church', 'cathedral', 'chapel', 'synagogue', 'mosque', 'temple', 'monastery', 'shrine', 'bell_tower']);
function classify(t) {
  const k = [];
  if (t.tourism === 'museum' || t.tourism === 'gallery' || t.amenity === 'arts_centre') k.push('museum');
  if (t.amenity === 'place_of_worship' || WORSHIP_B.has(t.building) || t.religion) k.push('worship');
  if (t.historic === 'monument' || t.historic === 'memorial' || t.memorial || t.tourism === 'artwork' || t.historic === 'wayside_cross') k.push('monument');
  if (t.historic && !k.includes('monument')) k.push('historic');
  if (t.tourism === 'attraction' || t.tourism === 'viewpoint') k.push('attraction');
  if (t.heritage) k.push('heritage');
  if (t.amenity === 'university' || t.amenity === 'college' || t.building === 'university' || t.amenity === 'school' || t.amenity === 'kindergarten') k.push('education');
  if (t.amenity === 'theatre' || t.amenity === 'cinema' || t.amenity === 'library' || t.amenity === 'townhall' || t.amenity === 'courthouse') k.push('culture');
  if (t.railway === 'station' || t.railway === 'subway_entrance' || t.station === 'subway' || (t.public_transport === 'station')) k.push('station');
  if (t.railway === 'tram' || t.railway === 'tram_stop' || t.tram === 'yes' || t.trolleybus === 'yes' || t.railway === 'subway') k.push('rail');
  if (t.public_transport === 'stop_position' || t.public_transport === 'platform' || t.highway === 'bus_stop') k.push('stop');
  if (t.bridge || t.man_made === 'bridge') k.push('bridge');
  if (t.man_made === 'pier' || t.man_made === 'quay' || t.man_made === 'embankment' || t.man_made === 'breakwater' || t.waterway === 'dock' || t.leisure === 'marina' || t.leisure === 'slipway') k.push('pier');
  if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') k.push('cemetery');
  if (t.leisure === 'park' || t.leisure === 'garden' || t.leisure === 'playground' || t.landuse === 'recreation_ground' || t.leisure === 'stadium' || t.leisure === 'sports_centre' || t.leisure === 'pitch') k.push('park');
  if (t.place === 'square' || (t.highway === 'pedestrian' && t.area === 'yes')) k.push('square');
  if (t.natural === 'water' || t.waterway || t.water) k.push('water');
  if (t.amenity === 'hospital' || t.amenity === 'clinic' || t.healthcare) k.push('health');
  if (t.shop || t.amenity === 'restaurant' || t.amenity === 'cafe' || t.amenity === 'bar' || t.amenity === 'pub' || t.amenity === 'fast_food' || t.amenity === 'bank' || t.amenity === 'pharmacy' || t.tourism === 'hotel' || t.tourism === 'hostel' || t.tourism === 'guest_house') k.push('shop-or-food');
  if (t.building && !k.length) k.push('building');
  if (t.highway && !k.length) k.push('street');
  if (!k.length) k.push('other');
  return k;
}
function importance(t, kinds, area) {
  let s = 0;
  const has = (x) => kinds.includes(x);
  if (has('museum') || has('attraction') || has('monument') || has('historic')) s = 100;
  else if (has('worship')) s = 96;
  if (has('heritage')) s = Math.max(s, 90);
  if (t.wikidata || t.wikipedia) s = Math.max(s, 88) + 3;
  if (has('culture') || has('education') && (t.amenity === 'university' || t.amenity === 'college' || t.building === 'university')) s = Math.max(s, 84);
  if (has('station')) s = Math.max(s, 80);
  if (has('bridge')) s = Math.max(s, 78);
  if (has('square') || has('cemetery')) s = Math.max(s, 76);
  if (has('park')) s = Math.max(s, t.name ? 70 : 0);
  if (has('pier')) s = Math.max(s, 66);
  if (has('education') || has('health')) s = Math.max(s, 62);
  if (has('stop') || has('rail')) s = Math.max(s, 50);
  if (has('water')) s = Math.max(s, 55);
  if (has('shop-or-food')) s = Math.max(s, 30);
  if (t.building && s < 40) s = 40;
  if (kinds.includes('street')) s = Math.max(s, 20);
  if (t.start_date) s += 2; if (t.architect) s += 2; if (t['building:levels'] || t.height) s += 0.5;
  return s + Math.min(5, Math.log10(1 + (area || 0)) );
}

const objects = new Map();
let scanned = 0;
for (const layer of LAYERS) {
  const j = JSON.parse(fs.readFileSync(ROOT + 'data/osm-raw/' + layer + '.json', 'utf8'));
  for (const e of j.elements) {
    const t = e.tags; if (!t) continue; scanned++;
    if (!(t.name || t['name:ru'] || t['name:en'] || t.alt_name || t.official_name)) continue;
    const key = e.type[0] + e.id;
    let o = objects.get(key);
    if (o) { o.layers.push(layer); continue; }
    const g = geomOf(e); if (!g) continue;
    // a node / area: its centroid on the island; a line: any vertex within 30 m of the polygon
    let ok;
    if (e.type === 'node' || g.closed) ok = near(g.x, g.z, 8);
    else { ok = false; const step = Math.max(1, Math.floor(g.pts.length / 40)); for (let i = 0; i < g.pts.length && !ok; i += step) ok = near(g.pts[i][0], g.pts[i][1], 60); }
    if (!ok) continue;
    const tags = {}; for (const k of KEEP) if (t[k] !== undefined) tags[k] = t[k];
    const kinds = classify(t);
    objects.set(key, { id: key, type: e.type, name: t.name || t['name:ru'] || t['name:en'] || t.alt_name || t.official_name, 'name:en': t['name:en'] || null, kind: kinds, tags, x: Math.round(g.x * 10) / 10, z: Math.round(g.z * 10) / 10, areaM2: Math.round(g.area), lengthM: g.len ? Math.round(g.len) : undefined, importance: 0, layers: [layer], _t: t, _kinds: kinds });
  }
}
// route relations of the transit layers: those that serve a stop on the island (members are refs, the stops come from the transit layer)
const stopNodes = new Map();
for (const e of JSON.parse(fs.readFileSync(ROOT + 'data/osm-raw/transit.json', 'utf8')).elements) if (e.type === 'node' && e.lat != null) { const p = lib.proj(e.lon, e.lat); if (inside(p[0], p[1])) stopNodes.set(e.id, p); }
for (const e of JSON.parse(fs.readFileSync(ROOT + 'data/osm-raw/rail.json', 'utf8')).elements) if (e.type === 'node' && e.lat != null) { const p = lib.proj(e.lon, e.lat); if (inside(p[0], p[1])) stopNodes.set(e.id, p); }
const routes = [];
for (const f of ['routes', 'subwayroutes']) {
  for (const e of JSON.parse(fs.readFileSync(ROOT + 'data/osm-raw/' + f + '.json', 'utf8')).elements) {
    const t = e.tags || {}; if (!t.route) continue;
    const onIsland = (e.members || []).filter((m) => m.type === 'node' && stopNodes.has(m.ref));
    let geomIn = 0; for (const m of e.members || []) if (m.geometry) for (const n of m.geometry) { const p = lib.proj(n.lon, n.lat); if (inside(p[0], p[1])) { geomIn++; break; } }
    if (!onIsland.length && !geomIn) continue;
    const pts = onIsland.map((m) => stopNodes.get(m.ref));
    const c = pts.length ? pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]) : [0, 0];
    routes.push({ id: 'r' + e.id, type: 'relation', name: t.name || (t.route + ' ' + (t.ref || '')), 'name:en': t['name:en'] || null, kind: ['route'], tags: { route: t.route, ref: t.ref, name: t.name, operator: t.operator, from: t.from, to: t.to, network: t.network }, x: Math.round(c[0]), z: Math.round(c[1]), areaM2: 0, importance: t.route === 'subway' ? 58 : 52, layers: [f], stopsOnIsland: onIsland.length });
  }
}
// ---------------------------------------------------------------- finish
const list = [];
for (const o of objects.values()) { o.importance = Math.round(importance(o._t, o._kinds, o.areaM2) * 10) / 10; delete o._t; delete o._kinds; list.push(o); }
for (const r of routes) list.push(r);
// streets: one entry per name (the ways merged: total length on the island, the classes, the mean position of the vertices on the island)
const st = new Map();
for (const o of list.filter((q) => q.tags.highway && q.type === 'way' && !q.tags.bridge && !(q.kind.includes('bridge')))) {
  if (['footway', 'path', 'steps', 'service', 'cycleway', 'track', 'corridor'].includes(o.tags.highway) && !o.tags.name) continue;
  const s = st.get(o.name) || { n: 0, len: 0, x: 0, z: 0, classes: new Set(), ids: [] }; s.n++; s.len += o.lengthM || 0; s.x += o.x; s.z += o.z; s.classes.add(o.tags.highway); if (s.ids.length < 8) s.ids.push(o.id); st.set(o.name, s);
}
const streets = [...st.entries()].map(([name, s]) => ({ id: 'street:' + name, type: 'street', name, 'name:en': null, kind: ['street'], tags: { highway: [...s.classes].join('/'), ways: s.n, ids: s.ids.join(',') }, x: Math.round(s.x / s.n), z: Math.round(s.z / s.n), areaM2: 0, lengthM: Math.round(s.len), importance: 20 + Math.min(5, s.len / 1000), layers: ['roads'] }));
const nonStreetWays = list.filter((q) => !(q.tags.highway && q.type === 'way' && !q.tags.bridge && !q.kind.includes('bridge') && !q.kind.includes('square') && !q.kind.includes('pier')));
const out = [...nonStreetWays, ...streets];
out.sort((a, b) => b.importance - a.importance || b.areaM2 - a.areaM2 || String(a.name).localeCompare(String(b.name), 'ru'));
const outFile = process.argv[2] || ROOT + 'docs/reference/vo-osm-inventory.json';
fs.writeFileSync(outFile, '[\n' + out.map((o) => '  ' + JSON.stringify(o)).join(',\n') + '\n]\n');
const byKind = {}; for (const o of out) { const k = o.kind[0]; byKind[k] = (byKind[k] || 0) + 1; }
const stats = { scannedTagged: scanned, named: out.length, byKind, routes: routes.length, streets: streets.length, stopsOnIsland: stopNodes.size };
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(stats, null, 1));
console.log(JSON.stringify(stats));
