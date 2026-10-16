// gaps-petro-scan.mjs - read-only audit of Petrogradsky Island (OSM rel 1312631): every named / tourist OSM object inside the island polygon
// (plus a 60 m rim for the embankments), read from the OSM map-API tiles in data/osm-raw/map-api (full tags), classified as
// CLAIMED by a landmark module (groups.js / layout.js), KNOWN (hand-written house record) or GENERIC.
// Usage: node tools/gaps-petro-scan.mjs [out.json]    (writes only out.json; nothing from src/ is modified)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { proj, stitch, pointInRing, bboxOf, centroid, regionOf, inPlay } from './osm-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || null;

// ---- island polygon (outer rings, local metres)
const cov = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/reference/coverage-islands-osm.json'), 'utf8'));
const rel = cov.elements.find((e) => e.id === 1312631);
const outers = rel.members.filter((m) => m.role === 'outer').map((m) => m.geometry.map((n) => [n.lon, n.lat]));
const rings = stitch(outers).map((r) => r.map((p) => proj(p[0], p[1])));
rings.sort((a, b) => b.length - a.length);
const ring = rings[0];
const bb = bboxOf(ring);
const inIsland = (x, z) => pointInRing([x, z], ring);
function dToRing(x, z) {
  let best = 1e9;
  for (let i = 0; i < ring.length - 1; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[i + 1];
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / L; t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - (ax + t * dx), z - (az + t * dz)); if (d < best) best = d;
  }
  return best;
}
const near = (x, z) => inIsland(x, z) || (x > bb.x0 - 80 && x < bb.x1 + 80 && z > bb.z0 - 80 && z < bb.z1 + 80 && dToRing(x, z) < 60);

// ---- claims: every groups.js + the ids quoted in layout.js
const claimed = new Map();
const srcDir = path.join(ROOT, 'src/world');
for (const d of fs.readdirSync(srcDir)) {
  const f = path.join(srcDir, d, 'groups.js');
  if (!fs.existsSync(f)) continue;
  try {
    const m = await import(pathToFileURL(f).href);
    for (const g of m.GROUPS_LIST || []) for (const id of [...(g.ids || []), ...(g.osm || [])]) if (!claimed.has(id)) claimed.set(id, d + ':' + g.key);
  } catch (e) { console.error('groups fail', d, e.message); }
}
const lay = fs.readFileSync(path.join(srcDir, 'layout.js'), 'utf8');
for (const m of lay.matchAll(/['"]([wrn]\d{5,})['"]/g)) if (!claimed.has(m[1])) claimed.set(m[1], 'layout.js');

let known = new Set();
try { known = (await import(pathToFileURL(path.join(srcDir, 'city/known.js')).href)).knownIds(); } catch (e) { console.error('known fail', e.message); }

// ---- OSM map-API tiles
const NOTABLE_KEYS = ['tourism', 'historic', 'amenity', 'leisure', 'man_made', 'railway', 'public_transport', 'shop', 'office', 'building', 'artwork_type', 'memorial', 'natural', 'waterway', 'bridge', 'highway', 'landuse'];
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const nodes = new Map(), ways = new Map(), rels = new Map(), ntags = new Map();
const tagsOf = (body) => { const t = {}; for (const m of body.matchAll(/<tag k="([^"]*)" v="([^"]*)"\/>/g)) t[unesc(m[1])] = unesc(m[2]); return t; };
const mapDir = path.join(ROOT, 'data/osm-raw/map-api');
let nTiles = 0;
for (const f of fs.readdirSync(mapDir)) {
  if (!f.endsWith('.osm')) continue;
  const m = f.match(/^[A-Za-z0-9]+-([\d.]+),([\d.]+),([\d.]+),([\d.]+)\.osm$/);
  let take = false;
  if (m) { const [x0, z0] = proj(+m[1], +m[4]), [x1, z1] = proj(+m[3], +m[2]); take = x1 > bb.x0 - 100 && x0 < bb.x1 + 100 && z1 > bb.z0 - 100 && z0 < bb.z1 + 100; }
  else take = f.startsWith('relation');
  if (!take) continue;
  nTiles++;
  const txt = fs.readFileSync(path.join(mapDir, f), 'utf8');
  for (const mm of txt.matchAll(/<node id="(\d+)"[^>]*? lat="([\d.-]+)" lon="([\d.-]+)"(\/>|>([\s\S]*?)<\/node>)/g)) {
    nodes.set(mm[1], [+mm[3], +mm[2]]);
    if (mm[5]) { const t = tagsOf(mm[5]); if (Object.keys(t).length) ntags.set(mm[1], t); }
  }
  for (const mm of txt.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
    if (ways.has(mm[1])) continue;
    ways.set(mm[1], { nd: [...mm[2].matchAll(/<nd ref="(\d+)"/g)].map((q) => q[1]), tags: tagsOf(mm[2]) });
  }
  for (const mm of txt.matchAll(/<relation id="(\d+)"[^>]*>([\s\S]*?)<\/relation>/g)) {
    if (rels.has(mm[1])) continue;
    rels.set(mm[1], { mem: [...mm[2].matchAll(/<member type="(\w+)" ref="(\d+)" role="([^"]*)"/g)].map((q) => ({ t: q[1], ref: q[2], role: q[3] })), tags: tagsOf(mm[2]) });
  }
}
console.error('tiles', nTiles, 'nodes', nodes.size, 'ways', ways.size, 'rels', rels.size);
const wayRing = (w) => w.nd.map((n) => nodes.get(n)).filter(Boolean).map((p) => proj(p[0], p[1]));
const rows = new Map();
const areaRing = (r) => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return Math.abs(s / 2); };
function consider(id, t, p, area) {
  if (!t || !p || rows.has(id)) return;
  if (!near(p[0], p[1])) return;
  const named = !!(t.name || t['name:ru']);
  const A = t.amenity, Lz = t.leisure;
  const notable = !!(t.tourism || t.start_date || t.architect || t['building:architecture'] || t['roof:shape'] === 'dome' || +t['building:levels'] >= 8 || t.historic || t.memorial || t.artwork_type || t.heritage || t.wikipedia || t.wikidata ||
    ['place_of_worship', 'theatre', 'cinema', 'museum', 'school', 'hospital', 'university', 'college', 'kindergarten', 'library', 'marketplace', 'townhall', 'courthouse', 'arts_centre', 'clinic', 'police', 'fire_station', 'post_office', 'fountain', 'public_bath', 'community_centre', 'social_facility', 'bank'].includes(A) ||
    ['park', 'garden', 'stadium', 'sports_centre', 'pitch', 'playground', 'swimming_pool', 'marina', 'fitness_centre', 'dog_park'].includes(Lz) ||
    t.railway === 'subway_entrance' || t.railway === 'station' || ['tower', 'chimney', 'pier', 'lighthouse', 'obelisk', 'water_tower'].includes(t.man_made) ||
    ['church', 'cathedral', 'chapel', 'mosque', 'synagogue', 'school', 'hospital', 'university', 'kindergarten', 'civic', 'public', 'government', 'train_station', 'stadium', 'theatre', 'museum', 'hotel', 'dormitory'].includes(t.building) ||
    (t.building && area > 3500) || t.bridge || t.tunnel);
  if (!named && !notable) return;
  const kind = Object.keys(t).filter((k) => NOTABLE_KEYS.includes(k)).map((k) => k + '=' + t[k]).slice(0, 4).join(' ');
  rows.set(id, { id, name: t.name || t['name:ru'] || '', kind, x: Math.round(p[0]), z: Math.round(p[1]), region: regionOf(p[0], p[1]), inPlay: inPlay(p[0], p[1]), inIsland: inIsland(p[0], p[1]), area: Math.round(area || 0), levels: t['building:levels'] || '', height: t.height || '', start: t.start_date || '', arch: t.architect || '', wiki: t.wikipedia || t.wikidata || '', heritage: t.heritage || t['ref:okn'] || '', tags: t });
}
for (const [id, t] of ntags) { const p = nodes.get(id); consider('n' + id, t, proj(p[0], p[1]), 0); }
for (const [id, w] of ways) {
  if (!Object.keys(w.tags).length) continue;
  const r = wayRing(w); if (r.length < 2) continue;
  const closed = r.length > 3 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < 0.01;
  consider('w' + id, w.tags, closed ? centroid(r) : r[Math.floor(r.length / 2)], closed ? areaRing(r) : 0);
}
for (const [id, r] of rels) {
  if (!Object.keys(r.tags).length) continue;
  const ws = r.mem.filter((q) => q.t === 'way').map((q) => ways.get(q.ref)).filter(Boolean);
  const pts = []; for (const w of ws) pts.push(...wayRing(w));
  if (!pts.length) { const mem = r.mem.find((q) => q.t === 'node' && nodes.has(q.ref)); if (mem) { const n = nodes.get(mem.ref); pts.push(proj(n[0], n[1])); } }
  if (!pts.length) continue;
  const bx = bboxOf(pts);
  const inFrac = pts.filter((q) => inIsland(q[0], q[1])).length / pts.length;
  if (inFrac < 0.4 && !(pts.length < 40 && near((bx.x0 + bx.x1) / 2, (bx.z0 + bx.z1) / 2))) continue;
  let bestR = null, bestA = -1;
  for (const w of ws) { const q = wayRing(w); if (q.length > 3) { const A = areaRing(q); if (A > bestA) { bestA = A; bestR = q; } } }
  consider('r' + id, r.tags, [(bx.x0 + bx.x1) / 2, (bx.z0 + bx.z1) / 2], ws.length < 4 && bestA > 0 ? bestA : (bx.x1 - bx.x0) * (bx.z1 - bx.z0) * 0.5);
}
const list = [...rows.values()].map((r) => ({ ...r, claim: claimed.get(r.id) || null, known: known.has(r.id) }));
console.error('island bbox', JSON.stringify(bb), 'rows', list.length, 'claimed ids', claimed.size, 'known', known.size);
if (out) fs.writeFileSync(out, JSON.stringify(list));
const stat = { claimed: 0, known: 0, generic: 0 };
for (const r of list) { if (r.claim) stat.claimed++; else if (r.known) stat.known++; else stat.generic++; }
console.log(JSON.stringify(stat));
// ---- debug helper: node tools/gaps-petro-scan.mjs --rel r1445800 prints the member bbox
if (process.argv[2] === '--rel') {
  for (const id of process.argv.slice(3)) {
    const r = rels.get(id.slice(1)); if (!r) { console.log(id, 'not in tiles'); continue; }
    const pts = []; let have = 0;
    for (const q of r.mem) if (q.t === 'way' && ways.get(q.ref)) { have++; pts.push(...wayRing(ways.get(q.ref))); }
    const bx = bboxOf(pts); console.log(id, r.tags.name || '', 'members', r.mem.length, 'withGeom', have, JSON.stringify(bx, (k, v) => typeof v === 'number' ? Math.round(v) : v));
  }
}
