// props/islands.js - the street props of the ISLANDS built on 2026-10-13 / 14 (docs/ISLANDS2-BRIEF.md, docs/research/islands2-requests-*.md "props"): Yelagin, Kamenny, Aptekarsky (Botanical Garden), Petrovsky + Serny
// and the Krestovsky surroundings. The generic generators (osm.js, walks.js, ...) already furnish these islands from the baked OSM data (benches 150 / bins 89 on Yelagin, 288 benches on Aptekarsky ...). This phase
// runs LAST (after vo, with its own random stream: the shared stream of the generic phases does not move, so every older district keeps every instance it had) and only inside inIsl(x, z) = the island outlines
// (docs/reference/islands2-island-polys.json via environment/islands2-context.js + krestovsky-context.js) outside the frozen rectangles OLD..S5 (the islands lie in K1..K4, YE1, KA1..KA5, AP1..AP7, PE1..PE6 and in the edge of P2 / P6..P9):
//   * SEED / CLEAN-UP: the island sights the generic seeding misses (another service key, a sight not listed in PETRO_SIGHTS) are registered; OSM benches a sight redrew itself (within 0.8 m of a published bench)
//     are taken away with their colliders; nothing generic stands within 8 m of the Kirov stele, the Hercules plinth or on the arena of the Estradny Theatre;
//   * RESTYLE (docs/research/yelagin-park-2026.md 5.9): the park benches of Yelagin are dark-green slatted wood on cast-iron ends (the generic code painted every bench of a park white), except round the Palace /
//     Kitchen / Stables where they are white (islands2-requests-yelagin-palace.md 14); the benches of the Botanical Garden are green on a black frame; the 89 Yelagin bins are grey square concrete bins without a medallion;
//   * WHITE CONICAL BOLLARDS along the Oil Meadow paths (w30836330, w233508888, w717881710: islands2-requests-landmarksYelaginServices.md 8 / 15, ...Palace.md 5 / 13); the Kitchen module draws its own arc;
//   * park cafe kiosks at the OSM cafe / fast_food NODES of the parks (plain words on the fascia: БЛИНЫ, ПЫШКИ, ХОТ-ДОГИ ...: no brands), the two boat rental booths of Yelagin;
//   * information boards (tourism=information: the plant boards of the Botanical Garden, the park plans);
//   * BOATS at the pontoons of the Petrovskaya kosa harbours, of the Serny marina and the Svetlana marina (rowing boats, motor boats, yachts with BARE masts and no flags) and a few rowing boats at the Yelagin piers.
//   * EXTRAS (2026-10-15, props owner pass 2): LETI court benches + racks, a bench / bin set north of the Standart yard; harbour walls (stepped granite bollards, life-buoy stands) and the stadium railing: props/harbour.js.
// RULES (docs/AGENT-BRIEF.md "Road integrity rules"): every standing footprint is tested on its FINAL position against streets.net.cover (< -0.5), the tram tracks, door boxes, crossings, stops and the solids
// already built; no flags, no sounds, no brands (plain wordmarks); statues / sights keep their free zones.
import * as THREE from 'three';
import * as L from '../layout.js';
import { ISLANDS2_COAST } from '../environment/islands2-context.js';
import { KRESTOVSKY_ISLAND } from '../environment/krestovsky-context.js';
import { PIERS } from '../data/city.js';
import { keepOut } from '../environment/waterways.js';
import { Geo, hash01, ringHas, BOT, TOP, PX, NX, PZ, NZ } from './kit.js';
import * as FUR from './furniture.js';
import { COL } from './furniture.js';
import { faceRot } from './sites.js';
import { nearestWay } from './osm.js';
import { streetTrackDist } from '../streets/net.js';
import { KIOSK_NODES, INFO_BOARDS } from './islands-data.js';
import { placeHarbour } from './harbour.js';

/** the frame rectangles of the island rounds (K1..K4 of 2026-10-12, YE1 KA1..KA5 AP1..AP7 PE1..PE6 of 2026-10-13): everything from K1 on in PLAY_RECTS; the DISTRICTS THAT STAY FROZEN are the rectangles before P1 (OLD..S5:
 *  the centre, the west, the east, the south). The southern part of the Botanical Garden and the stadium end of Petrovsky lie in P2 / P6 / P7 / P8 / P9 (the Petrograd round, which only crossed the islands' edge):
 *  they are island ground (the island outline decides), so that one garden gets one bench style. */
const K1 = { x0: -4900, x1: -3700, z0: -5250, z1: -3520 }, P1 = { x0: -2450, x1: -800, z0: -2800, z1: -1300 };
let _older = null, _olderK = null;
const idx = (q) => L.PLAY_RECTS.findIndex((r) => r.x0 === q.x0 && r.x1 === q.x1 && r.z0 === q.z0 && r.z1 === q.z1);
/** the rectangles that stay frozen (before P1) */
const older = () => { if (_older === null) { const i = idx(P1); _older = i < 0 ? false : L.PLAY_RECTS.slice(0, i); } return _older; };
/** every rectangle before K1 (the water round the islands is new ground only where no older round owns it) */
const olderK = () => { if (_olderK === null) { const i = idx(K1); _olderK = i < 0 ? false : L.PLAY_RECTS.slice(0, i); } return _olderK; };
const boxOf = (o) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } return [x0, x1, z0, z1]; };
const RINGS = Object.entries({ ...ISLANDS2_COAST, krestovsky: KRESTOVSKY_ISLAND }).map(([k, o]) => ({ k, o, b: boxOf(o) }));
const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
/** the island ring (key: yelagin, kamenny, aptekarsky, petrovsky, serny, krestovsky) that holds (x, z) and in no frozen play rectangle (OLD..S5); null elsewhere */
export function islandAt(x, z) {
  const old = older(); if (!old) return null;
  for (const q of RINGS) if (x >= q.b[0] && x <= q.b[1] && z >= q.b[2] && z <= q.b[3] && ringHas(q.o, x, z)) return old.some((r) => inR(r, x, z)) ? null : q.k;
  return null;
}
/** (x, z) lies on one of the islands (see islandAt) */
export const inIsl = (x, z) => islandAt(x, z) !== null;
/** (x, z) lies in a rectangle of the island rounds (K1..PE6) and in no older play rectangle: the water round the islands, where the pontoons and boats of the harbours are */
export function inIslRect(x, z) {
  const old = olderK(); if (!old) return false;
  return L.PLAY_RECTS.slice(old.length).some((r) => inR(r, x, z)) && !old.some((r) => inR(r, x, z));
}

/** the island sights whose published benches / lamps / monuments / photo spots / crowd / entrances this phase respects (the first 14 are also in PETRO_SIGHTS; `botanicalGreenhouses` is the service key of landmarksBotanicalGreenhouses) */
export const ISLAND_SIGHTS = ['landmarksYelaginPalace', 'landmarksYelaginKitchen', 'landmarksYelaginServices', 'landmarksYelaginRossi', 'landmarksYelaginSpits', 'landmarksYelaginPark', 'landmarksKamennyPalace', 'landmarksKamennyChurch',
  'landmarksBotanicalGreenhouses', 'botanicalGreenhouses', 'landmarksBotanicalGarden', 'landmarksPetrovskyStadium', 'landmarksPetrovskyYacht', 'landmarksVladimir', 'landmarksKrestovsky',
  'landmarksZhdanovka', 'landmarksKamennyTheatre', 'landmarksKamennyDachasEast', 'landmarksKamennyDachasWest', 'landmarksLETI', 'landmarksTVTower', 'landmarksTransfiguration', 'landmarksPetrovskyWest'];

// ------------------------------------------------------------------------------------------------------------------------------------------------------------ colours / geometry
const GREEN_SLAT = '#3d5a3f', BIN_GREY = '#9ea3a6', BIN_DARK = '#7d8286', BOLLARD = '#ece8dc';
/** the Yelagin park bench: dark-green slats on black cast-iron ends (yelagin-park-2026.md 5.9), len along X */
const benchGreen = (len) => FUR.benchPark(len, GREEN_SLAT);
/** the square grey concrete bin 0.45 x 0.45 x 0.6 m of the Yelagin park, a plain dark mouth and a thin rim (no medallion: logo rule); 24 triangles */
function binConcrete() {
  const g = new Geo();
  g.boxB(0.45, 0.6, 0.45, [0, 0, 0], BIN_GREY, null, BOT); g.boxB(0.49, 0.05, 0.49, [0, 0.6, 0], BIN_DARK, null, BOT);
  g.boxB(0.3, 0.02, 0.3, [0, 0.645, 0], '#2a2d30', null, BOT | PX | NX | PZ | NZ);
  return g;
}
/** the white conical bollard of the Yelagin meadows (kit_10: a squat cone with a rounded head), 0.62 m; 60 triangles */
function bollard() {
  const g = new Geo();
  g.lathe([[0, 0], [0.17, 0], [0.12, 0.42], [0.125, 0.5], [0.07, 0.6], [0, 0.62]], [0, 0, 0], BOLLARD, 6);
  return g;
}
/** the park information stand: two green posts, a dark-green frame and a pale board (the printed face is a panel added by the caller): 1.1 x 0.8 board at 1.0 m, front +Z; 40 triangles */
function infoStand() {
  const g = new Geo();
  for (const x of [-0.5, 0.5]) g.tube([x, 0, -0.03], [x, 1.9, -0.03], 0.04, '#2f4f43', 5);
  g.boxB(1.2, 0.9, 0.05, [0, 0.95, 0], '#2f4f43', null, BOT); g.boxB(1.24, 0.06, 0.1, [0, 1.85, 0], '#26403a', null, BOT);
  return g;
}
/** the park cafe kiosk: a pale pavilion 2.6 x 2.0 m with a serving window, a hip roof and a striped awning over the counter (fascia = a panel added by the caller); front +Z; ~110 triangles */
function parkCabin(body = '#efe9d9', band = '#2f6b4a', roof = '#2f5f45') {
  const g = new Geo(), W = 2.6, D = 2.0;
  g.boxB(W + 0.2, 0.1, D + 0.2, [0, 0, 0], '#8d8b87', null, BOT); g.boxB(W, 2.15, D, [0, 0.1, 0], body, null, BOT | TOP); g.boxB(W + 0.04, 0.3, D + 0.04, [0, 0.1, 0], band, null, BOT);
  g.boxB(1.7, 0.95, 0.03, [0.2, 1.05, D / 2 + 0.005], '#20252b', null, PX | NX | TOP | BOT | NZ); g.boxB(1.9, 0.06, 0.4, [0.2, 1.0, D / 2 + 0.2], '#c9c4b8', null, BOT);
  g.boxB(0.7, 1.9, 0.03, [-0.85, 0.1, D / 2 + 0.005], band, null, PX | NX | TOP | BOT | NZ);
  const e = 0.35, hx = W / 2 + e, hz = D / 2 + e, y0 = 2.3, top = 3.05;                                   // hip roof
  g.quad([-hx, y0, hz], [hx, y0, hz], [0.5, top, 0], [-0.5, top, 0], roof); g.quad([hx, y0, -hz], [-hx, y0, -hz], [-0.5, top, 0], [0.5, top, 0], roof);
  g.quad([hx, y0, hz], [hx, y0, -hz], [0.5, top, 0], [0.5, top, 0], roof); g.quad([-hx, y0, -hz], [-hx, y0, hz], [-0.5, top, 0], [-0.5, top, 0], roof);
  g.boxB(W + 0.7, 0.1, D + 0.7, [0, 2.25, 0], roof, null, TOP | BOT);
  const y1 = 2.2, yb = 1.7, d = 0.8, n = 6, w = 2.2 / n;                                                  // awning over the counter
  for (let i = 0; i < n; i++) { const x = -1.1 + 0.2 + i * w, col = i % 2 ? '#f4f1e8' : band; g.quad([x, y1, D / 2 + 0.03], [x, yb, D / 2 + 0.03 + d], [x + w, yb, D / 2 + 0.03 + d], [x + w, y1, D / 2 + 0.03], col); }
  return g;
}

// boats (x = along the keel, +x the bow, y up, the origin at the waterline); the hull is an extruded top-view outline so that the bow is pointed. ~50 .. 130 triangles each
const hull = (g, len, beam, y0, y1, col, bowK = 0.28, sternK = 0.9) => {
  const l = len / 2, w = beam / 2, b = len * bowK;
  g.poly([[-l, -w * sternK], [l - b, -w], [l, 0], [l - b, w], [-l, w * sternK]], y1 - y0, [0, (y0 + y1) / 2, 0], col, [-Math.PI / 2, 0, 0]);
};
/** an open hull: the same pointed outline as hull() with a hole (the wall is `wall` thick), from y0 to y1 */
const openHull = (g, len, beam, y0, y1, col, wall, bowK = 0.28, sternK = 0.9) => {
  const l = len / 2, w = beam / 2, b = len * bowK, ol = (l2, w2, b2) => [[-l2, -w2 * sternK], [l2 - b2, -w2], [l2, 0], [l2 - b2, w2], [-l2, w2 * sternK]].map((p) => new THREE.Vector2(p[0], p[1]));
  const sh = new THREE.Shape(ol(l, w, b)); sh.holes.push(new THREE.Path(ol(l - wall * 1.3, w - wall, b * 0.85)));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1 }); geo.translate(0, 0, -(y1 - y0) / 2);
  g.add(geo, new THREE.Matrix4().makeTranslation(0, (y0 + y1) / 2, 0).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), col);
};
/** a wooden rowing boat 3.6 m: a tarred keel body, an open painted hull with the pale floorboards inside, three thwarts and a pair of shipped oars; ~90 triangles */
function rowBoat(col = '#7a5a3a') {
  const g = new Geo();
  hull(g, 3.5, 1.2, -0.12, 0.1, '#3a2a20'); openHull(g, 3.6, 1.25, 0.1, 0.34, col, 0.07);
  g.box(2.5, 0.02, 0.62, [-0.1, 0.11, 0], '#c9b48a', null, 0);
  for (const x of [-0.95, 0.05, 0.95]) g.box(0.22, 0.04, 1.08, [x, 0.25, 0], '#8a6a44', null, 0);
  for (const s of [-1, 1]) g.tube([-0.1, 0.42, s * 0.5], [0.0, 0.55, s * 1.5], 0.02, '#c9b48a', 4);
  return g;
}
/** a white fibreglass motor boat 6.5 m with a blue stripe, a windscreen and a small console; 110 triangles */
function motorBoat(col = '#f1efe9', stripe = '#1f56a8') {
  const g = new Geo();
  hull(g, 6.5, 2.3, -0.3, 0.7, col, 0.32, 0.85); hull(g, 6.54, 2.34, 0.45, 0.58, stripe, 0.32, 0.85); hull(g, 6.1, 2.0, 0.7, 0.74, '#cfcabd', 0.3, 0.8);
  g.boxB(1.1, 0.85, 1.0, [-0.2, 0.74, 0], '#e8e4d8', null, BOT); g.boxB(0.04, 0.5, 1.8, [0.5, 0.74, 0], '#2a3a44', [0, 0, -0.35], BOT);
  g.tube([-2.9, 0.5, 0], [-3.2, 0.1, 0], 0.07, '#2a2d30', 5);
  return g;
}
/** a cruising yacht 10 m: white hull, a low cabin, a bare mast 12.5 m with a furled boom and a thin forestay (NO sail, NO flag, no logo); 150 triangles */
function yacht(col = '#f4f2ea', stripe = '#24476f', mast = 12.5) {
  const g = new Geo();
  hull(g, 10, 3.0, -0.45, 0.95, col, 0.34, 0.8); hull(g, 10.04, 3.04, 0.55, 0.7, stripe, 0.34, 0.8); hull(g, 9.6, 2.7, 0.95, 1.0, '#c9c0a8', 0.32, 0.78);
  g.boxB(3.4, 0.75, 1.9, [-0.6, 1.0, 0], '#efe8d8', null, BOT); g.boxB(3.5, 0.08, 2.0, [-0.6, 1.72, 0], '#e2dccb', null, BOT); g.boxB(3.0, 0.22, 0.04, [-0.6, 1.25, 0.96], '#27323a', null, PX | NX | TOP | BOT | NZ);
  g.tube([0.9, 1.0, 0], [0.9, mast, 0], 0.06, '#c9ced2', 5, 0.035);
  g.tube([0.9, 2.5, 0], [-3.4, 2.4, 0], 0.055, '#c9ced2', 5); g.tube([0.9, 2.6, 0], [-3.2, 2.45, 0], 0.095, '#ebe7da', 5);
  g.tube([0.9, mast - 0.4, 0], [4.7, 1.0, 0], 0.012, '#8d9298', 3); g.tube([0.9, mast - 0.4, 0], [-4.6, 0.9, 0], 0.012, '#8d9298', 3);
  g.tube([0.9, mast - 3.0, 0], [0.4, 1.0, 1.35], 0.012, '#8d9298', 3); g.tube([0.9, mast - 3.0, 0], [0.4, 1.0, -1.35], 0.012, '#8d9298', 3);
  return g;
}

export function placeIslands(S) {
  const cnt = { removed: {}, restyled: { bench: 0, benchWhite: 0, bin: 0 }, bollards: 0, kiosks: 0, rental: 0, boards: 0, boats: { row: 0, motor: 0, yacht: 0, piers: 0 }, dupBench: 0, missed: [], skipped: {}, failed: [], ms: {} };
  S.stats.islands = cnt;
  if (!inIsl(-4700, -5250) && !inIsl(-1700, -4100) && !inIsl(-5100, -3000)) { cnt.skip = 'the islands are not in this map'; return; }
  if ((typeof location !== 'undefined' && /[?&]noisl=1/.test(location.search || '')) || (typeof process !== 'undefined' && process.env && process.env.PROPS_NOISL)) { cnt.skip = '?noisl=1 / PROPS_NOISL (A/B of the draw calls and of the older districts: the island phase is off)'; return; }
  const { W, F } = S, ctx = S.ctx, T = S.sign, SV = ctx.services, net = S.st && S.st.net;
  const rnd = ctx.rng('spb-props-islands');
  const cover = (x, z) => (net ? net.cover(x, z, {}) : -9);
  const track = (x, z) => (net ? streetTrackDist(x, z) : 99);
  const solidAt = (x, z, r) => { const p = { x, z }; ctx.physics.resolve(p, r, 0, 1.7); return Math.hypot(p.x - x, p.z - z) > 0.02; };
  const corners = (x, z, w, d, rot, m = 0) => { const c = Math.cos(rot), s = Math.sin(rot), out = [[x, z]]; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) { const lx = a * (w / 2 + m), lz = b * (d / 2 + m); out.push([x + lx * c + lz * s, z - lx * s + lz * c]); } return out; };
  /** the road rule on the final footprint: every corner 0.5 m clear of the asphalt, 1.9 m off a tram track axis, not on water */
  const offRoad = (x, z, w, d, rot) => corners(x, z, w, d, rot).every(([px, pz]) => { if (cover(px, pz) > -0.5 || L.inRiver(px, pz)) return false; const t = track(px, pz); return !(t !== null && t !== undefined && t < 1.9); });
  const doorHit = (x, z, w, d, rot) => corners(x, z, w, d, rot, 0.2).some(([px, pz]) => S.inDoorBox(px, pz, 0));
  const cells = new Map();                                          // the static geometry of the water side by 200 m cell: boats + pontoons (boats part) and the harbour furniture + stadium railing (props/harbour.js)
  const part = (name, fn) => { const t0 = performance.now(); try { fn(); } catch (e) { console.error(`[props] islands ${name} failed:`, e); cnt.failed.push(`${name}: ${e && e.message}`); } cnt.ms[name] = Math.round(performance.now() - t0); };
  const no = (k) => { cnt.skipped[k] = (cnt.skipped[k] || 0) + 1; };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  /** the free spot nearest to o.at (expanding rings) for a w x d footprint: o { at, R, r0, look: [x, z] | null (else the front faces the nearest mapped way), hard, allow } -> { x, z, rot } | null */
  const findSpot = (o, w, d) => {
    const allow = F.PAVED | F.DOOR | F.PATH | (o.allow || 0);
    for (let r = o.r0 || 0; r <= o.R; r += 0.75) {
      const n = r === 0 ? 1 : Math.max(8, Math.round(r * 1.6)), a0 = hash01(o.at[0], o.at[1], r) * 6.2832;
      for (let k = 0; k < n; k++) {
        const a = a0 + (k / n) * 6.2832, x = o.at[0] + Math.cos(a) * r, z = o.at[1] + Math.sin(a) * r;
        if (!W.inPlay(x, z, 2) || !inIsl(x, z) || L.inRiver(x, z)) continue;
        let rot;
        if (o.look) { if (Math.hypot(o.look[0] - x, o.look[1] - z) < 1.2) continue; rot = faceRot(o.look[0] - x, o.look[1] - z); }
        else { const way = nearestWay(S, x, z, 30); if (!way) continue; rot = faceRot(way.x - x, way.z - z); }
        if (!W.fits(x, z, w + 0.8, d + 0.8, rot, { margin: 0.1, allow })) continue;
        if (!offRoad(x, z, w, d, rot) || doorHit(x, z, w, d, rot)) continue;
        if (o.hard && (W.at(x, z) & F.LAWN)) continue;
        const m = Math.max(w, d) / 2;
        if (S.placed.near(x, z, m + 0.6) || S.placed.near(x, z, m + 1.5, 'cross') || S.placed.near(x, z, m + 1.0, 'metro') || S.placed.near(x, z, m + 1.5, 'stop') || S.placed.near(x, z, m + 0.5, 'mon')) continue;
        if (solidAt(x, z, m + 0.2)) continue;
        return { x, z, rot };
      }
    }
    return null;
  };

  // ============================================================================================================================================ SEED + CLEAN-UP
  part('seed', () => {
    const published = [];                                           // every bench an island sight draws itself
    for (const name of ISLAND_SIGHTS) { const sv = SV[name]; if (!sv) continue; if (Array.isArray(sv.benches)) for (const b of sv.benches) if (b && typeof b.x === 'number') published.push([b.x, b.z]); }
    // sights that PETRO_SIGHTS does not list (or lists under another key): their lamps / monuments / photo spots / doors stay free for what this phase places
    for (const name of ['botanicalGreenhouses', 'landmarksKrestovsky']) if (SV[name]) S.seedSight(SV[name]);
    const dup = (x, z) => published.some((b) => Math.abs(b[0] - x) < 0.8 && Math.abs(b[1] - z) < 0.8);
    const yp = SV.landmarksYelaginPark || {};
    const keep = [];                                                // 8 m clear round the Kirov stele and the Hercules plinth (islands2-requests-landmarksYelaginPark.md 11); the arena of the theatre
    for (const q of [yp.kirov, yp.hercules]) if (q && typeof q.x === 'number') keep.push([q.x, q.z, 8]);
    for (const m of yp.monuments || []) if (m && typeof m.x === 'number' && /Киров|Геракл|Hercules/i.test((m.name || '') + (m.nameEn || ''))) keep.push([m.x, m.z, 8]);
    const arena = Array.isArray(yp.theatreArena) && yp.theatreArena.length >= 6 ? (typeof yp.theatreArena[0] === 'number' ? yp.theatreArena : yp.theatreArena.flatMap((p) => [p[0] ?? p.x, p[1] ?? p.z])) : null;
    const arenaBox = arena ? boxOf(arena) : null;
    const FREE = /^(bench|bin|rack|planter|urn|cabinet|postBox)/;
    const why = { dup: 0, keep: 0, arena: 0 };
    cnt.removedN = S.removeWhere((x, z, name) => {
      if (!inIsl(x, z)) return false;
      if (/^bench/.test(name) && dup(x, z)) { why.dup++; return true; }
      if (FREE.test(name)) {
        if (keep.some((k) => Math.hypot(k[0] - x, k[1] - z) < k[2])) { why.keep++; return true; }
        if (arena && x > arenaBox[0] - 1.5 && x < arenaBox[1] + 1.5 && z > arenaBox[2] - 1.5 && z < arenaBox[3] + 1.5 && (ringHas(arena, x, z) || arena.length && nearRing(arena, x, z) < 1.5)) { why.arena++; return true; }
      }
      return false;
    });
    cnt.removed = why; cnt.publishedBenches = published.length;
  });
  /** distance from (x, z) to the nearest edge of a flat ring */
  function nearRing(o, x, z) { let best = 1e9; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const ax = o[j], az = o[j + 1], dx = o[i] - ax, dz = o[i + 1] - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return best; }

  // ============================================================================================================================================ RESTYLE: benches and bins
  part('restyle', () => {
    S.type('benchGreen', () => benchGreen(1.8)); S.type('benchGreenL', () => benchGreen(2.2)); S.type('binConcrete', () => binConcrete());
    const whiteZone = (x, z) => x > -4870 && x < -4400 && z > -5350 && z < -5140;                   // the Palace / Kitchen / Stables precinct: white-painted wooden benches (islands2-requests-yelagin-palace.md 14)
    const botanical = (x, z) => x > -1860 && x < -1050 && z > -4470 && z < -3920;                  // the Botanical Garden: green slats on a black frame (aptekarsky-2026.md "Park furniture")
    const move = (names, to, pick) => {
      for (const n of names) {
        const list = S.inst.get(n); if (!list) continue;
        const keep = [];
        for (const m of list) {
          const x = m.elements[12], z = m.elements[14];
          if (inIsl(x, z) && pick(x, z, n)) { const t = typeof to === 'function' ? to(n) : to; let a = S.inst.get(t); if (!a) S.inst.set(t, (a = [])); a.push(m); cnt.restyled[/^bench/.test(t) ? 'bench' : 'bin']++; }
          else keep.push(m);
        }
        S.inst.set(n, keep);
      }
    };
    const BENCHES = ['benchWhite', 'benchWhiteL', 'benchPark', 'benchParkD', 'benchParkL'];
    const big = (n) => (n === 'benchWhiteL' || n === 'benchParkL' ? 'benchGreenL' : 'benchGreen');
    move(BENCHES, big, (x, z) => (islandAt(x, z) === 'yelagin' && !whiteZone(x, z)) || (islandAt(x, z) === 'aptekarsky' && botanical(x, z)));
    cnt.restyled.benchWhite = BENCHES.reduce((s, n) => s + (S.inst.get(n) || []).filter((m) => islandAt(m.elements[12], m.elements[14]) === 'yelagin').length, 0);
    move(['binCast', 'binCube', 'binSteel'], 'binConcrete', (x, z) => islandAt(x, z) === 'yelagin');
  });

  // ============================================================================================================================================ WHITE CONICAL BOLLARDS along the Oil Meadow paths
  part('bollards', () => {
    S.type('bollardWhite', () => bollard());
    const WAYS = new Set(['w30836330', 'w233508888', 'w717881710']), KC = [-4628.4, -5298.7];
    const lines = ((S.st && S.st.paths) || []).filter((p) => WAYS.has(p.id));
    cnt.bollardWays = lines.length;
    for (const p of lines) {
      const pts = p.pts, hw = (p.w || 2.4) / 2 + 0.55;
      let acc = 0, next = 3 + hash01(p.id, 'bo') * 4;
      for (let i = 0; i + 1 < pts.length; i++) {
        const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1], l = Math.hypot(bx - ax, bz - az); if (l < 0.3) continue;
        const tx = (bx - ax) / l, tz = (bz - az) / l;
        while (next - acc < l) {
          const s = next - acc, cx = ax + tx * s, cz = az + tz * s; next += 10;
          for (const side of [1, -1]) {
            const x = cx - tz * hw * side, z = cz + tx * hw * side;
            if (!W.inPlay(x, z, 2) || !inIsl(x, z)) { no('bollardOut'); continue; }
            const d = Math.hypot(x - KC[0], z - KC[1]), ang = Math.atan2(x - KC[0], z - KC[1]);        // the Kitchen module draws 13 of its own on the arc R 33-38 round the drum, south side
            if (d > 29 && d < 42 && Math.abs(ang) < 1.6) { no('bollardKitchen'); continue; }
            if (!W.fits(x, z, 0.4, 0.4, 0, { margin: 0.02, allow: F.LAWN | F.PATH }) || !offRoad(x, z, 0.4, 0.4, 0) || S.placed.near(x, z, 1.4, 'bollard') || S.placed.near(x, z, 0.7) || S.inDoorBox(x, z, 0.3) || solidAt(x, z, 0.3)) { no('bollardSpot'); continue; }
            S.add('bollardWhite', x, z, hash01(x, z) * 6.28); S.solidCyl(x, z, 0.16, 0.6); S.occupy(x, z, 0.4, 'bollard'); (S.svc.bollards ||= []).push({ x, z }); cnt.bollards++;
          }
        }
        acc += l;
      }
    }
  });

  // ============================================================================================================================================ PARK CAFE KIOSKS + BOAT RENTAL BOOTHS
  part('kiosks', () => {
    S.type('parkCabinA', () => parkCabin('#efe9d9', '#2f6b4a', '#2f5f45')); S.type('parkCabinB', () => parkCabin('#e9dcc0', '#8a3a2a', '#6a3a2c')); S.type('parkCabinC', () => parkCabin('#e4ecef', '#1f56a8', '#2a4a78'));
    const WORDS = [[/хот-?дог|dog/i, 'ХОТ-ДОГИ', 'B', 'сосиски · булочки'], [/пирожк/i, 'ПИРОЖКИ', 'B', 'выпечка'], [/чебурек|чебурет/i, 'ЧЕБУРЕКИ', 'B', 'горячие'], [/блин/i, 'БЛИНЫ', 'B', 'с начинкой'], [/пышк/i, 'ПЫШКИ', 'B', 'горячие'],
      [/шаверм/i, 'ШАВЕРМА', 'B', 'с собой'], [/трдельник/i, 'ТРДЕЛЬНИК', 'B', 'сладкая выпечка']];
    const pad = (kind) => (kind === 'B' ? 'parkCabinB' : kind === 'C' ? 'parkCabinC' : 'parkCabinA');
    const place = (o, text, sub, kind, tag) => {
      const sp = findSpot(o, 2.8, 2.2);
      if (!sp) { cnt.missed.push(`${tag}@${Math.round(o.at[0])},${Math.round(o.at[1])}`); return false; }
      const y = S.levelAt(sp.x, sp.z), n = [Math.sin(sp.rot), Math.cos(sp.rot)], col = kind === 'B' ? '#8a3a2a' : kind === 'C' ? '#1f56a8' : '#2f6b4a';
      S.add(pad(kind), sp.x, sp.z, sp.rot);
      S.box(sp.x, sp.z, 2.6, 2.0, sp.rot, 2.6, { r: 1.7, tag: 'stand' });
      S.panels.panel(T.fascia(text, col, '#f6eedc', sub), sp.x + n[0] * 1.38, y + 2.36, sp.z + n[1] * 1.38, n[0], n[1], 2.1, 0.52, { lit: true });      // the board hangs on the front edge of the eaves (the hip roof overhangs 0.35 m)
      S.svc.kiosks.push({ x: sp.x, z: sp.z, rotY: sp.rot, kind: 'parkCabin' });
      return true;
    };
    const done = [];
    for (const [x, z, name] of KIOSK_NODES) {
      if (!inIsl(x, z) || !W.inPlay(x, z, 2)) continue;
      if (W.insideBld(x, z) || [[3, 0], [-3, 0], [0, 3], [0, -3]].some(([a, b]) => W.insideBld(x + a, z + b)) || !S.gardenAt(x, z)) { no('kioskBuilding'); continue; }      // a cafe in a house (or at its wall) is the house; the kiosks stand in the parks
      if (done.some((q) => dist(q, [x, z]) < 14) || (S.svc.terraces || []).some((t) => Math.hypot(t.x - x, t.z - z) < 10)) { no('kioskNear'); continue; }
      const w = WORDS.find((q) => q[0].test(name)), h = hash01(Math.round(x), Math.round(z), 'kw'), blank = !name, text = w ? w[1] : blank ? (h < 0.4 ? 'МОРОЖЕНОЕ' : h < 0.7 ? 'ВЫПЕЧКА' : 'НАПИТКИ') : 'КАФЕ', sub = w ? w[3] : blank ? 'на вынос' : 'напитки · десерты', kind = w ? w[2] : blank && h < 0.4 ? 'C' : 'A';
      if (cnt.kiosks >= 18) break;
      if (place({ at: [x, z], R: 7 }, text, sub, kind, 'kiosk ' + name)) { done.push([x, z]); cnt.kiosks++; }
    }
    // the two boat rental bases of Yelagin: a booth at the root of the trunk (4th Northern pond, node n11428185175) and one at the catamaran pier (2nd Southern pond)
    const yp = SV.landmarksYelaginPark || {};
    const bases = [[[-5533, -5379], 'ПРОКАТ ЛОДОК', 'лодки · катамараны', [-5537, -5392]], [[-4850, -4964], 'ПРОКАТ КАТАМАРАНОВ', 'лодки · катамараны', [-4871, -4967]]];
    for (const [at, text, sub, look] of bases) if (place({ at, R: 9, r0: 2, look, allow: F.LAWN }, text, sub, 'C', 'rental')) cnt.rental++;
    void yp;
  });

  // ============================================================================================================================================ the plaza of the west spit: a litter bin on the south return (islands2-requests-landmarksYelaginSpits.md review: photo 09 shows one; the module has none)
  part('spit', () => {
    const sp = SV.landmarksYelaginSpits; if (!sp) return;
    const at = [-6410.6, -5297.2];
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [-1, 1], [2, 1], [1, 2]]) {
      const x = at[0] + dx, z = at[1] + dz;
      if (!inIsl(x, z) || !W.fits(x, z, 0.5, 0.5, 0, { margin: 0.02, allow: F.PLAZA | F.PAVED | F.PATH | F.LAWN }) || !offRoad(x, z, 0.5, 0.5, 0) || S.placed.near(x, z, 1.2) || solidAt(x, z, 0.3)) continue;
      S.add('binConcrete', x, z, 0.4); S.solidCyl(x, z, 0.26, 0.9); S.occupy(x, z, 0.6, 'bin'); S.svc.bins.push({ x, z }); cnt.spitBin = [Math.round(x * 10) / 10, Math.round(z * 10) / 10]; return;
    }
    cnt.missed.push('spit bin');
  });

  // ============================================================================================================================================ INFORMATION BOARDS
  part('boards', () => {
    S.type('infoStand', () => infoStand());
    const SKIP = /ЖК|Памятный|Skandi/;
    let i = 0;
    for (const [x, z, name] of INFO_BOARDS) {
      if (!inIsl(x, z) || !W.inPlay(x, z, 1) || SKIP.test(name)) continue;
      if (W.insideBld(x, z)) { no('boardBuilding'); continue; }
      if (W.at(x, z) & F.DECK) { no('boardDeck'); continue; }                                  // Betancourt Bridge platforms: nothing of props stands on a bridge deck
      const way = nearestWay(S, x, z, 25);
      let placed = false;
      const why = { fits: 0, road: 0, near: 0, door: 0, solid: 0 };
      // the node first, then the old nine offsets (up to 2.4 m), then rings of 1.2 m steps from 3.6 to 7.2 m (2026-10-15: the 2.4 m search missed the Betancourt plaza boards and the second Transfiguration stand, all of them real signs)
      const offs = [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [2.4, 0], [-2.4, 0], [0, 2.4], [0, -2.4]]; for (let r = 3.6; r <= 7.3; r += 1.2) { const n = Math.round(r * 3.3); for (let k = 0; k < n; k++) { const a = hash01(x, z, 'ba') * 6.28 + (k / n) * 6.2832; offs.push([Math.cos(a) * r, Math.sin(a) * r]); } }
      why.flags = W.at(x, z);
      // pass 1: lawn / path / paving as before (every board the first round placed keeps its place); pass 2 (only for a board that found no spot): flowerbeds and claimed paving too (the plant boards of the
      // Botanical Garden stand in the beds, the plaza boards of Betancourt Square on its claimed paving)
      for (const allow of [F.LAWN | F.PATH | F.PAVED, F.LAWN | F.PATH | F.PAVED | F.BED | F.PLAZA]) for (const [dx, dz] of offs) {
        if (placed) break;
        const px = x + dx, pz = z + dz, rot = way ? faceRot(way.x - px, way.z - pz) : 0;
        if (!inIsl(px, pz)) continue;
        if (!W.fits(px, pz, 1.4, 0.7, rot, { margin: 0.05, allow })) { why.fits++; continue; }
        if (!offRoad(px, pz, 1.3, 0.5, rot)) { why.road++; continue; }
        if (S.placed.near(px, pz, 1.3)) { why.near++; continue; }
        if (S.inDoorBox(px, pz, 0.6)) { why.door++; continue; }
        if (solidAt(px, pz, 0.6)) { why.solid++; continue; }
        const y = S.levelAt(px, pz), n = [Math.sin(rot), Math.cos(rot)], text = name || 'Схема парка';
        S.add('infoStand', px, pz, rot);
        S.panels.panel(T.plaque(text, 'marble', 192, 144, 'isl|' + text), px + n[0] * 0.04, y + 1.4, pz + n[1] * 0.04, n[0], n[1], 1.1, 0.8, {});
        S.panels.panel(T.plaque(text, 'marble', 192, 144, 'isl|' + text), px - n[0] * 0.07, y + 1.4, pz - n[1] * 0.07, -n[0], -n[1], 1.1, 0.8, {});
        S.solidCyl(px, pz, 0.35, 1.9); S.occupy(px, pz, 0.8, 'sign'); (S.svc.boards ||= []).push({ x: px, z: pz, rotY: rot, text }); cnt.boards++; placed = true; break;
      }
      if (!placed) { cnt.missed.push(`board@${Math.round(x)},${Math.round(z)}`); (cnt.boardWhy ||= {})[`${Math.round(x)},${Math.round(z)}`] = why; }
      i++;
    }
    void i;
  });

  // ============================================================================================================================================ EXTRAS asked by the sight modules (2026-10-15)
  // landmarksLETI "Props": white park benches west of the Popov bust facing the court of Corpus 5, bicycle racks at the right-hand wing of its stair (photo 60); landmarksPetrovskyYacht "Props owner" 4 (bench / bin set north of the Standart yard).
  // (The squares of landmarksZhdanovka lie on the Petrograd bank, outside the island rectangles: their bins stay with the generic phases.)
  part('extras', () => {
    cnt.extras = { letiBench: 0, letiRack: 0 };
    const bench = (at, look, tag) => { const sp = findSpot({ at, R: 3.5, look }, 1.9, 0.6); if (!sp) { cnt.missed.push(tag); return; } if (S.placeBench('benchWhite', sp.x, sp.z, sp.rot)) cnt.extras.letiBench++; else cnt.missed.push(tag); };
    if (SV.landmarksLETI) {
      const court = [-1565.6, -4404.2];
      bench([-1592.5, -4400.2], court, 'leti bench 1'); bench([-1592.5, -4407.4], court, 'leti bench 2');
      const b = L.buildingById('r11983462');
      if (b && b.polys && b.polys[0] && b.polys[0].o.length >= 8) {
        const o = b.polys[0].o, ax = o[4], az = o[5], bx = o[6], bz = o[7], l = Math.hypot(bx - ax, bz - az) || 1, cx = o.reduce((q, v, i) => q + (i % 2 ? 0 : v), 0) / (o.length / 2), cz = o.reduce((q, v, i) => q + (i % 2 ? v : 0), 0) / (o.length / 2);
        let nx = (bz - az) / l, nz = -(bx - ax) / l; const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        if (nx * (mx - cx) + nz * (mz - cz) < 0) { nx = -nx; nz = -nz; }                                      // the outward normal of the stair front (edge 2 of Corpus 5, facing WSW)
        const rx = nz, rz = -nx;                                                                              // to the right as seen from outside (LETI frame.js Frame)
        for (const [k, u] of [[0, 14.5], [1, 18]]) {
          const sp = findSpot({ at: [mx + rx * u + nx * 4.5, mz + rz * u + nz * 4.5], R: 4 }, 2.7, 0.5); if (!sp) { cnt.missed.push('leti rack ' + k); continue; }
          const rot = Math.atan2(nx, nz);
          S.add('rack5', sp.x, sp.z, rot); S.box(sp.x, sp.z, 2.6, 0.35, rot, 0.8, { r: 1.5, tag: 'rack' }); S.svc.racks.push({ x: sp.x, z: sp.z }); cnt.extras.letiRack++;
        }
      } else cnt.missed.push('leti stair front');
    }
    // landmarksPetrovskyYacht "Props owner" 4: a bench / bin set for the lawn north of the Standart yard (the shed w200731337 at (-5953.6, -3490.2); north = -z)
    if (SV.landmarksPetrovskyYacht) {
      const yard = [-5953.6, -3490.2];
      cnt.extras.standart = 0;
      for (const at of [[-5962, -3519], [-5945, -3519]]) { const sp = findSpot({ at, R: 9, look: [yard[0], yard[1] - 10], allow: F.LAWN }, 1.9, 0.6); if (sp && S.placeBench('benchPark', sp.x, sp.z, sp.rot)) cnt.extras.standart++; else cnt.missed.push('standart bench'); }
      const sp = findSpot({ at: [-5953.6, -3519], R: 9, r0: 1, look: yard, allow: F.LAWN }, 0.5, 0.5);
      if (sp) { S.add('binConcrete', sp.x, sp.z, sp.rot); S.solidCyl(sp.x, sp.z, 0.26, 0.9); S.occupy(sp.x, sp.z, 0.6, 'bin'); S.svc.bins.push({ x: sp.x, z: sp.z }); cnt.extras.standart++; } else cnt.missed.push('standart bin');
    }
  });

  // ============================================================================================================================================ PONTOONS + BOATS of the harbours
  // The OSM pier / pontoon WAYS of the yacht clubs (PIERS records with `pts`, no polygon) are drawn by nobody (streets draws a ribbon only on the ones tagged highway=footway, the park module claims its own):
  // each becomes a floating plank pontoon 2 m wide on dark floats (deck 0.45 m over the water, like the Moika pontoons of environment/boats.js) with boats moored across it on both sides: rowing boats,
  // white motor boats and sailing yachts with BARE masts (no sails, no flags, no logos). The decks are visual only (closed territory: nobody walks out on a private pontoon); the quay colliders of the shore
  // stay. Nothing within 160 m of the west spit of Yelagin (the sunset vista, islands2-requests-landmarksYelaginSpits.md 2) or inside a KEEP_OUT circle of a sight.
  part('boats', () => {
    // the boats and the pontoons are STATIC geometry (one Geo per 200 m cell, vertex colours, the shared 'pr-vc' material): the batcher merges them into the cells of the material the other props use, so the harbours
    // add almost no draw calls (instanced boat types cost +66 calls at the Parade harbour with 5 types, +45 with 3: docs/research/islands2-props.md 6); the geometry is built once per boat type
    const GEOS = { rowBoat0: rowBoat('#7a5a3a'), motorBoat0: motorBoat('#f1efe9', '#1f56a8'), yacht0: yacht('#f4f2ea', '#24476f', 12.5) };
    const groups = cells;                                           // one Geo per 200 m cell, shared with props/harbour.js (bollards, buoys, railing): the same static mesh per cell, no extra pieces
    const grp = (x, z) => { const k = Math.floor(x / 200) + ',' + Math.floor(z / 200); let g = groups.get(k); if (!g) groups.set(k, (g = new Geo())); return g; };
    const SPIT = [-6420, -5308], POND_Y = -0.35;
    const pathIds = new Set(((S.st && S.st.paths) || []).map((p) => p.id));
    const segs = [];
    for (const p of PIERS) {
      if (!p.pts || p.pts.length < 4 || !p.id || L.claimedBy(p.id)) continue;
      if (pathIds.has(p.id)) { no('pierFootway'); continue; }
      for (let i = 0; i + 3 < p.pts.length; i += 2) {
        const ax = p.pts[i], az = p.pts[i + 1], bx = p.pts[i + 2], bz = p.pts[i + 3], len = Math.hypot(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2;
        if (len < 5 || !inIslRect(mx, mz) || !W.inPlay(mx, mz, 4)) continue;
        if (Math.hypot(mx - SPIT[0], mz - SPIT[1]) < 160 || keepOut(ax, az, 2) || keepOut(bx, bz, 2) || keepOut(mx, mz, 2)) { no('pierKeepOut'); continue; }
        segs.push({ id: p.id, ax, az, bx, bz, len, ux: (bx - ax) / len, uz: (bz - az) / len });
      }
    }
    cnt.boats.piers = segs.length;
    const levelOf = (s) => { for (const t of [0.5, 0.25, 0.75, 0.05, 0.95, 0]) { const w = L.waterLevelAt(s.ax + (s.bx - s.ax) * t, s.az + (s.bz - s.az) * t); if (w !== null && w !== undefined) return w; } return null; };
    const berths = [];
    for (const s of segs) {
      const y = levelOf(s);
      if (y === null) { no('pierNoWater'); continue; }
      s.y = y;
      const rot = Math.atan2(-s.uz, s.ux), cx = (s.ax + s.bx) / 2, cz = (s.az + s.bz) / 2, g = grp(cx, cz);
      g.box(s.len, 0.3, 2.0, [cx, y + 0.3, cz], '#9a8a72', [0, rot, 0], BOT);                                   // the plank deck (top y + 0.45)
      g.box(s.len - 0.1, 0.4, 1.86, [cx, y - 0.05, cz], '#2b2f33', [0, rot, 0], TOP | BOT);                      // the dark floats
      s.rot = rot; cnt.boats.decks = (cnt.boats.decks || 0) + 1; (S.svc.pontoons ||= []).push({ x: cx, z: cz, rotY: rot, len: s.len, y: y + 0.45 });
      berths.push(s);
    }
    // the boats: across the pontoon on both sides. Every berth is a candidate; the candidates are taken in a hash order (a uniform thinning when there are more than CAP: no yacht club is favoured by its
    // way ids) and each is tested against the water, the neighbouring boats and every OTHER pontoon (a 10 m yacht across one pontoon must not run into the deck of the next)
    const TYPES = [['yacht0', 10, 3.0, 1.0], ['yacht0', 10, 3.0, 1.0], ['motorBoat0', 6.5, 2.3, 0.9], ['rowBoat0', 3.6, 1.25, 0.8], ['rowBoat0', 3.6, 1.25, 0.8]], CAP = 650;
    const water = (x, z) => L.inRiver(x, z) || !!(W.at(x, z) & F.WATER);
    const grid = new Map();
    for (const s of berths) for (let i = Math.floor((Math.min(s.ax, s.bx) - 8) / 32); i <= Math.floor((Math.max(s.ax, s.bx) + 8) / 32); i++) for (let j = Math.floor((Math.min(s.az, s.bz) - 8) / 32); j <= Math.floor((Math.max(s.az, s.bz) + 8) / 32); j++) { const k = i + ',' + j; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(s); }
    /** the distance from (x, z) to the nearest pontoon axis other than `own` (999 when none within 8 m) */
    const pontoonDist = (x, z, own) => {
      let best = 999;
      for (const s of grid.get(Math.floor(x / 32) + ',' + Math.floor(z / 32)) || []) {
        if (s === own) continue;
        const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / l2));
        best = Math.min(best, Math.hypot(x - s.ax - dx * t, z - s.az - dz * t));
      }
      return best;
    };
    const cands = [];
    for (const s of berths) {
      const yachtPier = s.len >= 14;
      for (const side of [1, -1]) {
        let t = 1.6;
        for (;;) {
          const h = hash01(s.id, side, Math.round(t), 'bt');
          const pick = yachtPier ? (h < 0.5 ? 0 : h < 0.68 ? 1 : h < 0.9 ? 2 : 3) : (h < 0.12 ? 0 : h < 0.45 ? 2 : h < 0.8 ? 3 : 4);
          const [type, len0, beam0, gap] = TYPES[pick], sc = type.startsWith('yacht') ? 0.8 + hash01(s.id, side, Math.round(t), 'sc') * 0.55 : 1, pitch = beam0 * sc + gap;
          const along = t + pitch / 2;
          if (along > s.len - 0.6) break;
          t += pitch;
          if (hash01(s.id, side, Math.round(along), 'sk') < 0.3) { no('berthEmpty'); continue; }
          const nx = -s.uz * side, nz = s.ux * side, d = 1.0 + 0.35 + len0 * sc / 2, hl = len0 * sc * 0.5;                // the bow points away from the pontoon
          const x = s.ax + s.ux * along + nx * d, z = s.az + s.uz * along + nz * d;
          cands.push({ s, type, len0, beam0, sc, x, z, nx, nz, hl, along, ord: hash01(s.id, side, Math.round(along), 'ord') });
        }
      }
    }
    cands.sort((p, q) => p.ord - q.ord);
    let total = 0;
    for (const c of cands) {
      if (total >= CAP) { no('berthCap'); continue; }
      const { s, type, len0, beam0, sc, x, z, nx, nz, hl } = c, tx = x + nx * hl, tz = z + nz * hl, sx = x - nx * hl, sz = z - nz * hl;
      if (!water(x, z) || !water(tx, tz) || !water(sx, sz) || keepOut(x, z, 1) || keepOut(tx, tz, 1)) { no('berthDry'); continue; }
      const need = 1.2 + beam0 * sc / 2;
      if ([[x, z], [tx, tz], [sx, sz], [x + nx * hl * 0.5, z + nz * hl * 0.5], [x - nx * hl * 0.5, z - nz * hl * 0.5]].some(([px, pz]) => pontoonDist(px, pz, s) < need)) { no('berthPontoon'); continue; }
      if (S.placed.near(x, z, 1.2, 'boat') || S.placed.near(tx, tz, 1.0, 'boat') || S.placed.near(sx, sz, 1.0, 'boat')) { no('berthTaken'); continue; }
      grp(x, z).put(GEOS[type], x, s.y, z, Math.atan2(-nz, nx) + (hash01(s.id, c.along, 'yw') - 0.5) * 0.06, sc);
      for (const q of [[x, z], [tx, tz], [sx, sz]]) S.placed.add(q[0], q[1], Math.max(0.9, beam0 * sc / 2 + 0.2), 'boat');
      total++; { const ck = Math.round(x / 500) + ',' + Math.round(z / 500); (cnt.boatClusters ||= {})[ck] = (cnt.boatClusters[ck] || 0) + 1; } cnt.boats[type.startsWith('yacht') ? 'yacht' : type.startsWith('motor') ? 'motor' : 'row']++;
      void len0;
    }
    // the Yelagin boat rental (the 4th Northern pond): rowing boats moored along both sides of the 33 m trunk (the pedal boats of the park module lie across the T-bar and the side bar)
    { const A = [-5537.5, -5383.5], B = [-5536.6, -5415.9], len = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / len, uz = (B[1] - A[1]) / len;
      let n = 0;
      for (const side of [1, -1]) for (let t = 5.5; t < len - 3 && n < 10; t += 4.4) {
        const nx = -uz * side, nz = ux * side, x = A[0] + ux * t + nx * 2.35, z = A[1] + uz * t + nz * 2.35;
        if (!(W.at(x, z) & F.WATER) && !L.inRiver(x, z)) { no('rentalDry'); continue; }
        if (side === -1 && z > -5400.5 && z < -5392) { no('rentalSideBar'); continue; }                              // the side bar with its pedal boats leaves the trunk to the west here
        if (S.placed.near(x, z, 1.5, 'boat')) { no('rentalTaken'); continue; }
        grp(x, z).put(GEOS.rowBoat0, x, POND_Y, z, Math.atan2(-uz, ux) + (side < 0 ? 0 : Math.PI) + (hash01(x, z, 'rr') - 0.5) * 0.08);
        S.placed.add(x, z, 1.8, 'boat'); n++; cnt.boats.row++; cnt.boats.rental = (cnt.boats.rental || 0) + 1;
      } }
    void rnd;
  });

  // harbour walls (stepped bollards, life-buoy stands) of the club shore and the railing of the stadium bays: props/harbour.js
  placeHarbour(S, { part, cnt, offRoad, solidAt, inIsl, cells });
  part('flushStatic', () => { for (const [k, g] of cells) if (!g.empty) S.addStaticGeo(g, 'pr-harbour-' + k); cnt.staticCells = cells.size; });
}
