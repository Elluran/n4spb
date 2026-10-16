// environment/river.js - the geometry of the waterways for the builders (ground holes, water meshes, quay walls, field water mask, far scene). Built on waterways.js
// (stitched bank chains, extensions beyond the data, the Neva scenery ring), which is pure data shared with layout.js.
//   * riverBanks()    the bank chains of the FONTANKA (compat: landmarksC/closure.js re-derives the quay pieces beside the Anichkov Bridge from them), { name, pts, landSide, ... }
//   * waterBanks(key) bank chains of one waterway (or all)
//   * waterCuts()     the convex pieces (triangles, the Neva scenery clipped outside the EXTENT rectangles) of every water body: { key, y, poly, box }: the ground is cut by them, the
//                     water meshes are clipped by them
//   * waterPolys()    flat rings for the rasterising field
//   * deckPoly()      the Anichkov Bridge deck polygon r5537267 (claimed by landmarksC): the quay leaves the parapet / collider open there
//   * inRiverExt(x, z) point test against every water body incl. the invented continuations and the Neva scenery
import { BRIDGES, EXTENT_RECTS, PLAY_RECTS, RECT_NAMES, ROADS, WATER } from '../data/city.js';
import { WATERWAYS, BRIDGE_ZONES, allBanks, banksOf, waterPieces, pointInFlat, slopeQuads, petroZones } from './waterways.js';
import { SITES, toWorld as siteToWorld, inDeck as siteInDeck } from '../bridges/sites.js';
import { triangulateRing, subtractConvex, ccw, boxOfPoly } from './clip.js';
import { TAURIDE_WATER_UNION } from '../landmarksTauride/terrain.js';
import { inVO } from './vo-banks.js';
import { SOUTH_POND_IDS } from './south-ponds.js';
import { CHANNELS, channelRing } from './island-banks.js';      // (islands 2026-10-14) the channels between the Yelagin ponds and the Nevkas

/** the bank chains of the Fontanka (water on the left of travel; landSide -1 = the landward normal is (tz, -tx)) */
export const riverBanks = () => banksOf('fontanka').filter((b) => b.len > 60);
export const waterBanks = (key) => (key ? banksOf(key) : allBanks());

/** Vasilievsky Island: the Gulf ring, the Neva Bay outline and the new Malaya Neva tail are huge simple polygons whose earcut triangles are kilometres across: each one would put thousands of entries into the grid
 *  buckets of the ground / water builders (bucketCuts). Their triangles are halved along the longest edge until none is longer than `lim` m (the area they cover is unchanged). The older rings keep their triangles. */
function splitBig(tri, lim, out) {
  let li = 0, ll = 0; for (let i = 0; i < 3; i++) { const a = tri[i], b = tri[(i + 1) % 3], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > ll) { ll = l; li = i; } }
  if (ll <= lim) { out.push(tri); return out; }
  const a = tri[li], b = tri[(li + 1) % 3], c = tri[(li + 2) % 3], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  splitBig([a, m, c], lim, out); splitBig([m, b, c], lim, out);
  return out;
}
const splitLimit = (p, tri) => (p.id === 'neva-bay' || String(p.id).startsWith('gulf') ? 300 : p.id === 'r72500' && tri.every((v) => v[0] < -4100) ? 300 : 0);

let _cuts = null;
export function waterCuts() {
  if (_cuts) return _cuts;
  const cuts = [], rects = EXTENT_RECTS.map((r) => ccw([[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]]));
  for (const p of waterPieces()) {
    const y = WATERWAYS[p.key].water;
    for (const t0 of triangulateRing(p.o)) {
      const lim = splitLimit(p, t0);                              // lim > 0: a piece of the island's big rings: `raw` cuts, water.js lays them down as they are (no 16 m grid cells: 5 times fewer triangles over open water)
      for (const tri of lim ? splitBig(t0, lim, []) : [t0]) {
        let pieces = [tri];
        if (p.excludeExtent) for (const r of rects) { pieces = subtractConvex(pieces, r); if (!pieces.length) break; }
        for (const poly of pieces) { if (poly.length < 3) continue; cuts.push({ key: p.key, y, poly: ccw(poly), box: boxOfPoly(poly), kind: p.kind, raw: lim > 0 }); }
      }
    }
  }
  for (const sq of slopeQuads()) cuts.push({ key: sq.key, y: WATERWAYS[sq.key].water, poly: ccw(sq.q), box: boxOfPoly(sq.q), kind: 'slope' });     // the grass slopes of the Swan Canal / the Moika: the ground is cut away over them, no water there
  return (_cuts = cuts);
}
/** the water as flat convex polygons { id, key, kind, o, h: [] } for the rasterising field: exactly the area that the ground is cut by (the Neva scenery only outside the data) */
/** the ponds of the Tauride Garden (pure data, landmarksTauride/terrain.js; the garden module draws their water): they are no waterway (no quay, no key) but the ground is cut by them (bed -1.4 m, layout.heightAt) */
let _ponds = null;
/** PARK PONDS of the Petrograd side (2026-10-06): the small ponds of Alexander Park (WATER w138155241, w609619503) and the Zoo (r8601164 with its island, w310701133). Ordinary park ponds: the ground is cut by
 *  them, water.js draws a still surface POND_Y below the lawn with a sloping earth rim and a collider round the edge. A pond that a landmark module claims is left to that module: environment.js passes the claim
 *  test (layout.claimedBy) through setPondClaimTest() before it builds anything. */
export const POND_Y = -0.35;
// islands round 2 (2026-10-14): the ponds of the Botanical Garden (the Japanese garden ponds w413677927 / w413677928 under the plank bridge, requests of landmarksBotanicalGarden 5 / 17) and the channel between the 4th and 5th Northern ponds of Yelagin (r18509888, under the 8.8 m road deck w369563619: the bridges owner's request 1)
const PARK_POND_IDS = new Set(['w138155241', 'w609619503', 'r8601164', 'w310701133', 'w413677927', 'w413677928', 'r18509888',
  'r3270894', 'r3270939', 'r1576172']);      // the canals of Kamenny Island (Bolshoy canal r3270894 970 m, Maly canal r3270939) and the Krestovsky rowing canal r1576172 (2.2 km): WATER records of kind canal that no environment builder drew (grey asphalt-coloured bands in the aerial)
let _pondSkip = () => false, _pp = null;
export function setPondClaimTest(fn) { _pondSkip = fn; _pp = null; _ponds = null; }
export function parkPonds() {
  if (_pp) return _pp;
  _pp = [];
  for (const w of WATER) { if ((!PARK_POND_IDS.has(w.id) && !SOUTH_POND_IDS.has(w.id)) || _pondSkip(w.id)) continue; w.polys.forEach((p, i) => _pp.push({ id: w.id + '#' + i, osm: w.id, o: p.o, h: p.h || [] })); }
  for (const c of CHANNELS) { if (_pondSkip(c.id)) continue; _pp.push({ id: c.id + '#0', osm: c.id, o: channelRing(c), h: [] }); }
  return _pp;
}
export function pondCuts() {
  if (_ponds) return _ponds;
  const cuts = [];
  for (const p of parkPonds()) for (const poly of triangulateRing(p.o, p.h)) cuts.push({ key: null, y: POND_Y, poly, box: boxOfPoly(poly), kind: 'pond' });
  for (const p of TAURIDE_WATER_UNION) for (const poly of triangulateRing(p.o, p.h || [])) cuts.push({ key: null, y: -0.4, poly, box: boxOfPoly(poly), kind: 'pond' });
  return (_ponds = cuts);
}
export const waterPolys = () => [...waterCuts().filter((c) => c.kind !== 'slope').map((c, i) => ({ id: 'w' + i, key: c.key, kind: c.kind, o: c.poly.flat(), h: [] })), ...TAURIDE_WATER_UNION.map((p, i) => ({ id: 'pond' + i, key: null, kind: 'pond', o: p.o, h: p.h || [] })), ...parkPonds().map((p, i) => ({ id: 'ppond' + i, key: null, kind: 'pond', o: p.o, h: p.h }))];
/** the water bodies as rings (data pieces, plugs, continuations, the Neva scenery ring): far.js keeps its blocks off them */
export const waterRings = () => waterPieces().map((p) => ({ id: p.id, key: p.key, kind: p.kind, o: p.o }));
/** true when (x, z) lies in any water body incl. the invented continuations (not the Neva scenery inside the data extent: there the data polygons rule) */
export function inRiverExt(x, z) {
  for (const p of waterPieces()) { if (x < p.box[0] || x > p.box[1] || z < p.box[2] || z > p.box[3]) continue; if (pointInFlat(x, z, p.o)) return true; }
  return false;
}
/** the Anichkov Bridge deck polygon (OSM relation r5537267, claimed by landmarksC) as a flat ring, or null */
export function deckPoly() {
  const b = BRIDGES.find((d) => d.id === 'r5537267');
  return b && b.polys && b.polys[0] ? b.polys[0].o : null;
}

const SITE_OF = { belinsky: 'belinsky', kazansky: 'kazansky', green: 'green', pevchesky: 'pevchesky', red: 'red', blue: 'blue', 'novo-konyushenny': 'novo', hermitage: 'hermitage', 'zimny-1': 'zimny1', 'zimny-2': 'zimny2', bankovsky: 'bankovsky', muchnoy: 'mucny', italyansky: 'italyansky',
  // the Mars Field reach: the bridges module's sites.js ids (docs/research/mars-bridges-canals.md section 7); until a site exists the zone table of waterways.js rules
  'swan-upper': 'swan-upper', 'swan-lower': 'swan-lower', prachechny: 'prachechny', panteleymonovsky: 'panteleymonovsky', eng1: 'eng1', garden1: 'garden1', garden2: 'garden2', 'bolshoy-konyushenny': 'bolsh-konyushenny', teatralny: 'teatralny', 'malo-konyushenny': 'malo-konyushenny',
  // the south-west reach: zone id = site id (sites.js, docs/research/sw-canals-bridges.md section 5)
  kamenny: 'kamenny', demidov: 'demidov', sennoy: 'sennoy', kokushkin: 'kokushkin', voznesensky: 'voznesensky', podyachesky: 'podyachesky', lviny: 'lviny', kharlamov: 'kharlamov', 'novo-nikolsky': 'novo-nikolsky', pikalov: 'pikalov', krasnogvardeysky: 'krasnogvardeysky', 'staro-nikolsky': 'staro-nikolsky', mogilevsky: 'mogilevsky', kashin: 'kashin', torgovy: 'torgovy', dekabristov: 'dekabristov', matveev: 'matveev', krasnoflotsky: 'krasnoflotsky', potseluev: 'potseluev', pochtamtsky: 'pochtamtsky', fonarny: 'fonarny', khrapovitsky: 'khrapovitsky', krushtein1: 'krushtein1', krushtein2: 'krushtein2', admiralteysky: 'admiralteysky', obukhovsky: 'obukhovsky', izmailovsky: 'izmailovsky', blagoveshchensky: 'blagoveshchensky' };
let _zones = null;
/** Every bridge crossing of the quay: { id, name, key (waterway), c: [x, z] (middle of the deck), axis (compass deg of the road), w (deck width along the water), len, own (a bridge the bridges module draws),
 *  foot, test(x, z, grow) (a point lies in the gap of the quay) }. The bridges module's sites.js (the real decks) wins over the dossier table where both exist. */
export function bridgeZones() {
  if (_zones) return _zones;
  const out = [];
  for (const z of BRIDGE_ZONES) {
    const site = SITES.find((s) => s.id === SITE_OF[z.id]);
    if (site) {
      const mid = (site.v0 + site.v1) / 2, c = siteToWorld(site, 0, mid), foot = site.kind === 'foot';
      const pad = z.pad || 0;      // a zone row may widen the opening (asphalt flares of a bridge mouth that run to the wall beside the deck)
      out.push({ id: z.id, name: z.name, key: z.key, c: [c.x, c.z], axis: site.b, w: site.v1 - site.v0 + 2 * pad, len: z.len, own: true, foot, site, test: (x, zz, grow = 0) => siteInDeck(site, x, zz, 30, grow + pad + (foot ? 0.8 : 0.0)) });
    } else {
      const a = z.axis * Math.PI / 180, ux = Math.sin(a), uz = -Math.cos(a), hl = z.len / 2 + 14, hw = z.w / 2;
      out.push({ id: z.id, name: z.name, key: z.key, c: z.c, axis: z.axis, w: z.w, len: z.len, own: z.own && z.id !== 'anichkov', foot: false, test: (x, zz, grow = 0) => { const px = x - z.c[0], pz = zz - z.c[1], u = px * ux + pz * uz, v = -px * uz + pz * ux; return Math.abs(u) <= hl + grow && Math.abs(v) <= hw + grow; } });
    }
  }
  // a record of kind 'zone' in bridges/sites.js (BLAG_ZONE: the south landing of the Blagoveshchensky Bridge, no geometry of its own) makes its quay opening without a BRIDGE_ZONES row: the opening is the
  // owner's deck frame (|u| <= 30, v0 .. v1 round the origin); the length 90 is the one the old row had (the quay's gap radius), so the opening is exactly what it was (water-2 2026-10-08)
  { const rows = new Set(BRIDGE_ZONES.map((z) => z.id)), LEN = { blagoveshchensky: 90 };
    for (const [zid, sid] of Object.entries(SITE_OF)) {
      if (rows.has(zid)) continue;
      const site = SITES.find((s) => s.id === sid && s.kind === 'zone'); if (!site) continue;
      const mid = (site.v0 + site.v1) / 2, c = siteToWorld(site, 0, mid);
      out.push({ id: zid, name: site.name, key: site.ww, c: [c.x, c.z], axis: site.b, w: site.v1 - site.v0, len: LEN[zid] || 90, own: true, foot: false, site, test: (x, zz, grow = 0) => siteInDeck(site, x, zz, 30, grow) });
    }
  }
  for (const z of eastBridgeZones()) out.push(z);
  for (const site of SITES.filter(s => s.south)) {
    const foot=site.kind==='foot';
    out.push({id:site.id,name:site.name,key:site.ww,c:[site.cx,site.cz],axis:site.b,w:site.v1-site.v0,len:60,own:true,foot,site,
      test:(x,z,grow=0)=>siteInDeck(site,x,z,30,grow+(foot?.4:0))});
  }
  for (const z of moatBridgeZones()) out.push(z);
  for (const z of nhBridgeZones()) out.push(z);
  // a deck of the Petrograd side that is an ordinary site of bridges/sites.js (the seven Karpovka bridges): the quay opens exactly over the owner's deck interval (v0 - 0.3 .. v1 + 0.3), not over the OSM deck
  // polygon + 2 m (decks wider than 40 m along the river - the skewed Aptekarsky deck - keep the polygon zone) - the wider opening left 1-2 m of bank beside every deck with neither our wall nor the owner's (tools/environment-banks.mjs zone walk, 2026-10-07)
  const used = new Set(Object.values(SITE_OF));
  for (const z of petroZones()) {
    const site = SITES.find((s) => { if (used.has(s.id) || s.v1 - s.v0 > 40) return false; const c = siteToWorld(s, 0, (s.v0 + s.v1) / 2); return z.test(c.x, c.z, 0); });
    // (review-water-2 2026-10-09) Vasilievsky Island, sites that know their bank interval (sites-vo2.js `bank: [u of the first bank, u of the far bank]`, the 1st / 2nd Smolensky bridges): the opening reaches 1.5 m past
    // the banks instead of 30 m (the water edge crosses the deck strip at |u| <= 15.3 for every v between the faces: measured, no skew). At the corner of the mouth basin the shore turns and runs along the deck's side for
    // 12 m beyond the abutment, 0.7 m inside the strip: the 30 m opening left that stretch with a wall FACE only (no coping, no collider; the owner's wing follows the bank line across the strip and cannot follow a shore
    // that runs along it): a 7 m hole beside the 2nd Smolensky Bridge (zone walk: 3 open edges, shot c_0 of review-water2). The reviewed Petrograd sites (no inVO) keep 30.
    const halfU = site && site.bank && inVO(z.c[0], z.c[1]) ? Math.max(Math.abs(site.bank[0]), Math.abs(site.bank[1])) + 1.5 : 30;
    if (site) { z.site = site; z.test = (x, zz, grow = 0) => siteInDeck(site, x, zz, halfU, grow + 0.3); }
  }
  for (const z of petroZones()) out.push(z);                // the decks of the Petrograd side / the Spit (waterways.js: key '*' = any waterway, auto, cut exactly at the zone border)
  return (_zones = out);
}

/** The bridges of the east / north extension (regions E1, N2, N3 that no older rectangle contains): the modules eastBridges / northBridges (and landmarksTauride) draw their decks (street-level slabs with
 *  walk ramps, the raised Alexander Nevsky, Liteyny and Bolsheokhtinsky decks) and publish deckY, so the quay only has to leave its wall / parapet / collider open under them: every mapped bridge road
 *  piece (OSM bridge=yes) makes a zone whose test is the distance to its polyline (half the road width + 3 m, the rule of the east branch's quay). No splits, no fallback deck. */
let _eastZones = null;
function eastBridgeZones() {
  if (_eastZones) return _eastZones;
  const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
  const isEast = (n) => n === 'E1' || n === 'N2' || n === 'N3';
  const newR = PLAY_RECTS.filter((r, i) => isEast(RECT_NAMES[i])), oldR = PLAY_RECTS.filter((r, i) => !isEast(RECT_NAMES[i]));
  const out = [];
  for (const r of ROADS) {
    if (!r.bridge || r.tunnel || r.pts.length < 4) continue;
    const x0 = r.pts[0], z0 = r.pts[1];
    if (!newR.some((q) => inR(q, x0, z0)) || oldR.some((q) => inR(q, x0, z0))) continue;
    const hw = (r.w || 8) / 2 + 3, n = r.pts.length / 2;
    let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9;
    for (let i = 0; i < n; i++) { bx0 = Math.min(bx0, r.pts[i * 2]); bx1 = Math.max(bx1, r.pts[i * 2]); bz0 = Math.min(bz0, r.pts[i * 2 + 1]); bz1 = Math.max(bz1, r.pts[i * 2 + 1]); }
    const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, diag = Math.hypot(bx1 - bx0, bz1 - bz0) + 2 * hw;
    const pts = r.pts;
    const test = (x, z, grow = 0) => {
      if (x < bx0 - hw - grow || x > bx1 + hw + grow || z < bz0 - hw - grow || z > bz1 + hw + grow) return false;
      for (let i = 0; i + 3 < pts.length; i += 2) {
        const ax = pts[i], az = pts[i + 1], dx = pts[i + 2] - ax, dz = pts[i + 3] - az, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        if (Math.hypot(ax + dx * t - x, az + dz * t - z) < hw + grow) return true;
      }
      return false;
    };
    // all east waterways are keyed 'neva' (Neva, Obvodny canal, Monastyrka); the Fontanka / Moika near the new rectangles have their own zones
    out.push({ id: 'eb-' + r.id, name: r.name || r.id, key: 'neva', c: [cx, cz], axis: 0, w: diag, len: 0, own: true, foot: false, auto: true, test });
  }
  return (_eastZones = out);
}

/** The decks over the castle moat (key 'moat'): every mapped bridge road piece (OSM bridge=yes, 2.4 - 7.2 m wide) inside the moat's window; landmarksCastle (Three-part bridge, footbridges) and the 2nd Engineer bridge draw them: the quay only leaves its
 *  wall / collider open under them (auto zone, test = distance to the polyline < half width + 3 m, as eastBridgeZones). No splits, no fallback deck. */
let _moatZones = null, _nhZones = null;
function moatBridgeZones() { return _moatZones || (_moatZones = windowBridgeZones('moat', [-800, -600, -885, -795], 'moat-')); }
/** the footbridges over the inner canals of New Holland (drawn by landmarksNewHolland): bridge=yes roads inside the island's canal window */
function nhBridgeZones() { return _nhZones || (_nhZones = windowBridgeZones('nh-inner', [-3460, -3250, 265, 475], 'nh-')); }
function windowBridgeZones(key, win, prefix) {
  const out = [];
  for (const r of ROADS) {
    if (!r.bridge || r.tunnel || r.pts.length < 4) continue;
    const pts = r.pts, n = pts.length / 2;
    let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9; for (let i = 0; i < n; i++) { bx0 = Math.min(bx0, pts[i * 2]); bx1 = Math.max(bx1, pts[i * 2]); bz0 = Math.min(bz0, pts[i * 2 + 1]); bz1 = Math.max(bz1, pts[i * 2 + 1]); }
    if (bx0 < win[0] || bx1 > win[1] || bz0 < win[2] || bz1 > win[3]) continue;
    const hw = (r.w || 4) / 2 + 3, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, diag = Math.hypot(bx1 - bx0, bz1 - bz0) + 2 * hw;
    const test = (x, z, grow = 0) => {
      if (x < bx0 - hw - grow || x > bx1 + hw + grow || z < bz0 - hw - grow || z > bz1 + hw + grow) return false;
      for (let i = 0; i + 3 < pts.length; i += 2) { const ax = pts[i], az = pts[i + 1], dx = pts[i + 2] - ax, dz = pts[i + 3] - az, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); if (Math.hypot(ax + dx * t - x, az + dz * t - z) < hw + grow) return true; }
      return false;
    };
    out.push({ id: prefix + r.id, name: r.name || r.id, key, c: [cx, cz], axis: 0, w: diag, len: 0, own: true, foot: false, auto: true, test });
  }
  return out;
}
