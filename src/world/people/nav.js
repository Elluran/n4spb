// people/nav.js - the walkable world of the pedestrians (simulation half): a routing graph on the real pavements and the hard walkability tests.
//
// WHAT IT BUILDS (once):
//   * the routing graph: nodes on the generated pavement centrelines (streets.sidewalks, every ~3 m), the mapped footways (streets.paths), a LATTICE of open-space nodes
//     (3 m) on every walkable cell near the avenue / the hot spots (pavements, squares, forecourts: this is what makes the Petersburg pavements one connected network, the
//     sidewalk strips alone are broken at every junction mouth), the zebra crossings (streets.crosswalks: one edge kerb to kerb, flagged with the crossing index so that the
//     simulation can wait for pedState), the Anichkov Bridge pavements, the pavements of the Palace Bridge (nav.longs: a node chain per pavement, joined to the Palace Embankment), and connectors to the building entrances, benches, bus stops, metro doors and photo spots.
//     The station (hall, forecourt, gates, apron, platforms with ramps) is added by station.js through the same node / edge helpers.
//   * obstacle colliders: the static colliders of ctx.physics (trunks, lamp posts, benches, columns, bollards, shelters, walls ...) in a grid, with the same resolution maths as
//     core/physics.js (pushOut) so that an NPC is blocked by exactly what blocks the player (the big platform decks are no obstacles, they are floors).
//   * zone weights (zones.js), A* routing, component ids.
// Inputs (all optional, with fallbacks): ctx.services.streets / city / landmarks / landmarksC / rail / metro / environment / props, layout.js, data AREAS / GREEN.
// Heights: pavements and the square paving stand at 0.12 m, zebras / asphalt at 0.03 m, the ground at 0 (layout.SURFACE); N.y holds the height of floors that differ (hall
// 0.03, platform ramps 0.1 -> 1.38, the bridge deck hump).
import * as L from '../layout.js';
import { AREAS, GREEN, FOUNTAINS } from '../data/city.js';
import { makeZones } from './zones.js';
import { makeFrame } from './frame.js';
import { makeArea } from './area.js';
import { addStation } from './station.js';
import { createCrosswalkLookup } from './crosswalks.js';
import { FR as OKT_FR, W as OKT_W, FOYER_OPEN as OKT_OPEN } from '../landmarksOktyabrsky/frame.js';       // pure data: the glazed foyer of the Oktyabrsky hall (enterable for the player, a keep-out for the pedestrians)
import { SITES, toUV as siteUV } from '../bridges/sites.js';       // pure data: the deck frames and the pavement bands of the west bridges
import { PackedEdges, PackedAdjacency } from './packed-graph.js';
import { PackedCellIndex } from './packed-cell-index.js';
const hyp = (a, b) => Math.sqrt(a * a + b * b);      // (round 4, 2026-10-16: Math.hypot allocates in V8 (117 MB per 20 s of driving); every use in this file has two arguments)

const PAVE = L.SURFACE.sidewalk, ROAD_Y = L.SURFACE.road;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ringHas = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; };
const bboxOf = (o) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } return [x0, x1, z0, z1]; };
const cellKey = (cx, cz) => (cx + 4096) * 8192 + (cz + 4096);
const hash01 = (a) => { let h = Math.imul(a | 0, 2654435761) ^ 0x9e3779b9; h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; };

export function buildNav(ctx, cfg = {}) {
  const cached = ctx.navBake;
  const svc = ctx.services, st = svc.streets, net = st && st.net, env = svc.environment, lm = svc.landmarks || {};
  const nav = { stats: {} };
  const _t0 = (typeof process !== 'undefined' && process.cpuUsage && globalThis.__peopleCpu ? { now: () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; } } : (typeof performance !== 'undefined' ? performance : Date)), _tp = { last: _t0.now() }; nav.stats.ms = {};
  const mark = (k) => { const n = _t0.now(); nav.stats.ms[k] = Math.round(n - _tp.last); _tp.last = n; };
  const inPlay = (x, z, m = 0) => L.inPlay(x, z, -m);                // the union of the play rectangles, grown by m metres
  const FR = makeFrame(lm.stationFrame);
  const marsOff = !!(cfg.mars && cfg.mars.off);
  const area = marsOff ? { info: {}, catAt: () => 0, y: () => null, walk: () => false, weight: () => 0, zone: () => -1 } : makeArea(ctx, L, st);          // the castle surfaces (area.js)
  const Z = makeZones(L, st && st.roads, lm.stationFrame, marsOff ? {} : { area }), zoneW = Z.zoneW;
  // station zone: the density factor of people.js DENSITY.station (0.35 within 'radius' m of the segments / rectangles, fading to 1 over 'fade' m)
  const SC = (cfg.station) || { factor: 1, radius: 0, fade: 1, segments: [], rects: [] }; nav.stationCfg = SC;
  const stationFactor = (x, z) => {
    if (SC.factor >= 1) return 1; let d = 1e9;
    for (const s of SC.segments) { const dx = s[2] - s[0], dz = s[3] - s[1], t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, hyp(x - s[0] - dx * t, z - s[1] - dz * t)); }
    for (const r of SC.rects) d = Math.min(d, hyp(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3])) + SC.radius - (SC.rectRadius || 0));
    const k = Math.max(0, Math.min(1, (d - SC.radius) / SC.fade)); return SC.factor + (1 - SC.factor) * k * k * (3 - 2 * k);
  };
  nav.stationFactor = stationFactor;
  nav.densityFactor = stationFactor;
  nav.inPlay = inPlay; nav.zoneW = (x, z) => zoneW(x, z) * nav.densityFactor(x, z); nav.PAVE = PAVE; nav.ROAD_Y = ROAD_Y; nav.frame = FR; nav.zones = Z; nav.area = area; nav.marsCfg = cfg.mars || { zones: [], scale: 1 }; nav.marsZone = area.zone;

  // ------------------------------------------------------------------ buildings (footprints, grid); interiors (the station hall) are walkable
  const fps = L.groundFootprints().map((p) => ({ o: p.o, h: p.h || [], b: bboxOf(p.o) }));
  const BC = 16, bGrid = new Map();
  fps.forEach((p, i) => { for (let cx = Math.floor(p.b[0] / BC); cx <= Math.floor(p.b[1] / BC); cx++) for (let cz = Math.floor(p.b[2] / BC); cz <= Math.floor(p.b[3] / BC); cz++) { const k = cellKey(cx, cz); let a = bGrid.get(k); if (!a) bGrid.set(k, (a = [])); a.push(i); } });
  const rawInBuilding = (x, z) => {
    const a = bGrid.get(cellKey(Math.floor(x / BC), Math.floor(z / BC))); if (!a) return false;
    for (let j = 0; j < a.length; j++) { const p = fps[a[j]]; if (x < p.b[0] || x > p.b[1] || z < p.b[2] || z > p.b[3]) continue; if (ringHas(p.o, x, z) && !p.h.some((h) => ringHas(h, x, z))) return true; }
    return false;
  };
  const interiors = [];                                           // [{ test(x, z) }] regions inside a footprint that are floor (the station hall)
  // the Oktyabrsky Concert Hall foyer is ENTERABLE for the player (landmarksOktyabrsky/frame.js FOYER_OPEN: five open door groups): pedestrians stay outside (decision of the people owner, 2026-10-09): the volume behind
  // the glass wall (hall frame u FR.u0 .. FR.u1, v 2.5 .. 16.4) is a keep-out like a building, the door gaps lead nowhere for the routing
  const foyer = (svc.landmarksOktyabrsky && OKT_OPEN) ? (() => { const o = []; for (const [u, v] of [[OKT_FR.u0 - 0.6, OKT_FR.glassV - 0.5], [OKT_FR.u1 + 0.6, OKT_FR.glassV - 0.5], [OKT_FR.u1 + 0.6, 16.4], [OKT_FR.u0 - 0.6, 16.4]]) { const w = OKT_W(u, v); o.push(w.x, w.z); } return o; })() : null;
  nav.foyer = foyer;
  const inBuilding = (x, z) => { if (foyer && x > 700 && x < 880 && ringHas(foyer, x, z)) return true; if (!rawInBuilding(x, z)) return false; for (let i = 0; i < interiors.length; i++) if (interiors[i](x, z)) return false; return true; };
  nav.inBuilding = inBuilding; nav.rawInBuilding = rawInBuilding; nav.interiors = interiors;
  const KC0 = { x: -1472.4, z: -269.7 }, KROT = -16.8 * Math.PI / 180, kcs = Math.cos(KROT), ksn = Math.sin(KROT);
  const inColonnade = (x, z, r0 = 44.3, r1 = 54.7) => { const dx = x - KC0.x, dz = z - KC0.z, mx = dx * kcs - dz * ksn, mz = dx * ksn + dz * kcs, r = hyp(mx, mz); if (r < r0 || r > r1) return false; const a = Math.atan2(Math.abs(mx), mz) * 180 / Math.PI; return a >= 19 && a <= 84; };
  nav.inColonnade = inColonnade;

  mark('buildings');
  // ------------------------------------------------------------------ blocked lawns (flower beds, the protected grass), water
  const claimedGreen = new Set(L.groupOsm ? L.groupOsm('landmarksA') : []);
  const blockPolys = [];
  for (const g of GREEN) if (g.kind === 'garden' || g.kind === 'flowerbed' || g.kind === 'shrubbery' || claimedGreen.has(g.id)) for (const p of g.polys) blockPolys.push({ o: p.o, h: p.h || [], b: bboxOf(p.o) });
  // a 24 m grid over the bounding boxes: blockedPoly runs ~10^6 times while the lattice is built
  const BPG = new Map(), BPC = 24; blockPolys.forEach((p, i) => { for (let cx = Math.floor(p.b[0] / BPC); cx <= Math.floor(p.b[1] / BPC); cx++) for (let cz = Math.floor(p.b[2] / BPC); cz <= Math.floor(p.b[3] / BPC); cz++) { const k = cx * 8192 + cz; let l = BPG.get(k); if (!l) BPG.set(k, (l = [])); l.push(i); } });
  const blockedPoly = (x, z) => { const l = BPG.get(Math.floor(x / BPC) * 8192 + Math.floor(z / BPC)); if (!l) return false; for (let q = 0; q < l.length; q++) { const p = blockPolys[l[q]]; if (x < p.b[0] || x > p.b[1] || z < p.b[2] || z > p.b[3]) continue; if (ringHas(p.o, x, z) && !p.h.some((h) => ringHas(h, x, z))) return true; } return false; };
  const rawWater = (x, z) => !!(env && env.waterAt && env.waterAt(x, z));
  // the decks of the WEST bridges (bridges.js: services.bridges.deckY + bridges/sites.js bands): over a deck the water polygon is no obstacle; a band is walkable when it is a pavement / sett /
  // plaza / plank band (the asphalt band of a road bridge is a carriageway like any other: the streets cover decides, people cross it on the zebras)
  const WLIFT = { asphalt: 0, pave: 0.12, lpave: 0.15, sett: 0.02, plaza: 0.1, plank: 0, slab: 0 }, WEST_X = -600;
  const bdY = svc.bridges && svc.bridges.deckY;
  // the LONG Neva bridge of the strip: the Palace Bridge (bridges/palace.js, 255 m; the first ~175 m lie inside the play area) is no site of bridges/sites.js: its axis comes from services.bridges.spans
  // ({ id, a, b, hw }), the pavement band |v| (barrier kerb .. railing) from LBAND below (the band of the full-city people/petroarea.js; the other long bridges of that list lie outside the strip).
  // nav.longs = [{ id, ax, az, ux, uz, len, hw, v0, v1 }]
  const LBAND = { palace: [11.3, 13.85] }, longs = [];
  for (const s of ((svc.bridges && svc.bridges.spans) || [])) {
    const b = LBAND[s.id]; if (!b || !s.a || !s.b) continue;
    const dx = s.b.x - s.a.x, dz = s.b.z - s.a.z, len = hyp(dx, dz); if (!(len > 5)) continue; const m = s.hw + 3;
    longs.push({ id: s.id, ax: s.a.x, az: s.a.z, ux: dx / len, uz: dz / len, len, hw: s.hw, v0: b[0], v1: b[1], x0: Math.min(s.a.x, s.b.x) - m, x1: Math.max(s.a.x, s.b.x) + m, z0: Math.min(s.a.z, s.b.z) - m, z1: Math.max(s.a.z, s.b.z) + m });
  }
  nav.longs = longs;
  const LD = { s: null, u: 0, v: 0 };
  /** the long deck under (x, z): LD = { s, u, v } (a shared record) or null; pad widens the deck sideways */
  const longDeck = (x, z, pad = 0.3) => {
    for (let i = 0; i < longs.length; i++) {
      const s = longs[i]; if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
      const dx = x - s.ax, dz = z - s.az, u = dx * s.ux + dz * s.uz; if (u < -1 || u > s.len + 1) continue;
      const v = -dx * s.uz + dz * s.ux; if (v > s.hw + pad || v < -s.hw - pad) continue;
      LD.s = s; LD.u = u; LD.v = v; return LD;
    }
    return null;
  };
  nav.longDeck = longDeck;
  const westDeck = (x, z) => {
    if (x > WEST_X) return null;
    const y = bdY ? bdY(x, z) : null;
    if (y !== null && y !== undefined && Number.isFinite(y)) {
      for (let i = 0; i < SITES.length; i++) {
        const s = SITES[i], q = siteUV(s, x, z); if (q.v < s.v0 - 0.05 || q.v > s.v1 + 0.05 || q.u < -45 || q.u > 45) continue;
        let kind = 'pave'; for (const zz of s.zones) if (q.v >= zz[0] && q.v <= zz[1]) { kind = zz[2]; break; }
        return { s, kind, y, foot: s.kind === 'foot' };
      }
    }
    if (longs.length) {
      const d = longDeck(x, z);
      if (d && y !== null && y !== undefined && Number.isFinite(y)) { const s = d.s, av = Math.abs(d.v); return { s, kind: av >= s.v0 && av <= s.v1 ? 'lpave' : 'asphalt', y, foot: false, long: true }; }
    }
    return null;
  };
  const deckWalk = (x, z) => { const d = westDeck(x, z); return !!d && (d.foot || d.kind !== 'asphalt'); };
  nav.westDeck = westDeck; nav.deckWalk = deckWalk;
  /** in the castle / Mikhailovsky reach (x -1480 .. -600, z < -635): the ground under the point is a trench / the water / a descent (the quay stairs, the canal bank) and it is no bridge deck: no pavement node there */
  const deepGround = (x, z) => { if (x > WEST_X || !(x >= -1480 && z <= -635)) return false;                    // (the pavement strips there run over the Neva quay and the canal descents)
    const h = ctx.physics.groundHeight(x, z, 0.6, false); return Number.isFinite(h) && h < -0.6 && !deckWalk(x, z); };
  const water = (x, z) => rawWater(x, z) && !westDeck(x, z);
  // the Anichkov Bridge deck covers the river polygon: people walk on its pavements (a rectangle in the bridge frame)
  const bridge = svc.landmarksC && svc.landmarksC.bridge, bfr = bridge && bridge.frame;
  const bth = bfr ? bfr.theta : 14.2 * Math.PI / 180, bcx = bfr ? bfr.cx : -441.5, bcz = bfr ? bfr.cz : -91.8, bcu = Math.cos(bth), bsu = Math.sin(bth);
  const bridgeUV = (x, z) => ({ u: (x - bcx) * bcu + (z - bcz) * bsu, v: -(x - bcx) * bsu + (z - bcz) * bcu });
  const onDeck = (x, z, m = 0) => { const q = bridgeUV(x, z); return Math.abs(q.u) < 29.3 - m && Math.abs(q.v) < 18.9 - m; };
  /** the two granite pavements of the bridge deck (3 m each, outside the roadway |v| < 15.95 and its kerb) */
  const deckPave = (x, z, m = 0) => { const q = bridgeUV(x, z), v = Math.abs(q.v); return Math.abs(q.u) < 29.3 && v > 16.25 + m && v < 18.65 - m; };
  nav.onDeck = onDeck; nav.bridgeUV = bridgeUV; nav.deckPave = deckPave;
  // the walking corridor of a long-bridge pavement: from the barrier kerb (v0 = 11.3) to the axes of the lamp standards on the railing line (|v| 13.15 - 13.3, r 0.28; the railing cores themselves are no obstacles, see below):
  // a walker pushed outward past a lamp axis is pinned between the lamp and the deck edge, so the pavement beyond v0 + LANE_W = 13.0 is no ground (nav.blocked) and no place for a follower (nav.deepAt);
  // the chain of nodes runs at v0 + LANE_C, in the middle of the corridor
  const LANE_W = 1.7, LANE_C = 0.8;
  const offLane = (x, z) => { const d = longDeck(x, z, 0); return !!d && d.u > 3 && Math.abs(d.v) > d.s.v0 + LANE_W; };          // (u > 3: the first lamp stands at u 4; the pavement stubs of the bank run into the deck head)
  // deep ground anywhere in the west (a quay edge without a parapet, a moat, a basin): the side-by-side place of a FOLLOWER must not lie there (sim.js stepFollower)
  const deepMemoW = new Map();
  nav.deepAt = (x, z) => { if (x > WEST_X) return false; if (longs.length && offLane(x, z)) return true; const k = Math.round(x * 2) * 16384 + Math.round(z * 2); let v = deepMemoW.get(k); if (v === undefined) { const h = ctx.physics.groundHeight(x, z, 0.6, false); v = Number.isFinite(h) && h < -0.9 && !westDeck(x, z) && !onDeck(x, z, 0.3) ? 1 : 0; deepMemoW.set(k, v); } return v === 1; };
  // beside the long bridge (within 40 m of the deck) the ground can lie far below the street without the water polygon covering it (the bank sliver between the deck edge and the water at the bridge head, the quay
  // descents beside it, the rim outside the railing): no standing place (the centre and the corners of the half-metre cell are probed: no walkable sliver at an open edge)
  const deepMemoB = new Map();
  const nearLong = (x, z, m) => {
    for (let i = 0; i < longs.length; i++) { const s = longs[i], dx = x - s.ax, dz = z - s.az, u = dx * s.ux + dz * s.uz; if (u < -m || u > s.len + m) continue; const v = -dx * s.uz + dz * s.ux; if (v < s.hw + m && v > -s.hw - m) return true; }
    return false;
  };
  const deepB = (x, z) => {
    if (!nearLong(x, z, 40)) return false; if (offLane(x, z)) return true; const qx = Math.round(x * 2), qz = Math.round(z * 2), k = qx * 16384 + qz; let v = deepMemoB.get(k);
    if (v === undefined) { v = 0; for (const [ox, oz] of [[0, 0], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25], [-0.25, -0.25]]) { const px = qx / 2 + ox, pz = qz / 2 + oz, h = ctx.physics.groundHeight(px, pz, 0.6, false); if (Number.isFinite(h) && h < -0.9 && !westDeck(px, pz)) { v = 1; break; } } deepMemoB.set(k, v); }
    return v === 1;
  };
  nav.blocked = longs.length ? (x, z) => blockedPoly(x, z) || (water(x, z) && !onDeck(x, z, 0.3)) || (x < WEST_X && deepB(x, z)) : (x, z) => blockedPoly(x, z) || (water(x, z) && !onDeck(x, z, 0.3));

  mark('water+deck');
  // ------------------------------------------------------------------ carriageways and zebra corridors
  const NOP = {};
  // fast cover: the same signed distance to the carriageways as streets net.cover (half width - distance, > 0 on the asphalt) without its allocations and its radius-14 grid walk: one 24 m
  // cell lookup (the grid registers every segment in all cells within its widest half width + 2 m, so everything within ~2 m of an edge is found) plus a fillet grid. Returns -50 far from roads.
  const FILG = new Map();
  if (net && net.fillets) net.fillets.forEach((f, i) => { for (let cx = Math.floor(f.box[0] / 16); cx <= Math.floor(f.box[1] / 16); cx++) for (let cz = Math.floor(f.box[2] / 16); cz <= Math.floor(f.box[3] / 16); cz++) { const k = cellKey(cx, cz); let a = FILG.get(k); if (!a) FILG.set(k, (a = [])); a.push(i); } });
  const fastCover = (px, pz) => {
    let best = -50; const list = net.grid.get((Math.floor(px / 24) + 300) * 2048 + (Math.floor(pz / 24) + 300));
    if (list) for (let q = 0; q < list.length; q++) {
      // buildNet's final grid already stores these exact coefficients after all width/median edits.
      const e = list[q], ax = e.ax, az = e.az, dx = e.dx, dz = e.dz, l2 = e.l2;
      let t = l2 < 1e-12 ? 0 : ((px - ax) * dx + (pz - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const cx = ax + dx * t, cz = az + dz * t, ux = px - cx, uz = pz - cz, d = Math.sqrt(ux * ux + uz * uz), l = e.l, side = (ux * -dz + uz * dx) / l;
      const h = side > 0 ? e.hR0 + (e.hR1 - e.hR0) * t : e.hL0 + (e.hL1 - e.hL0) * t, m = h - d; if (m > best) best = m;
    }
    if (best < 0.4) { const fl = FILG.get(cellKey(Math.floor(px / 16), Math.floor(pz / 16))); if (fl) for (let q = 0; q < fl.length; q++) { const f = net.fillets[fl[q]]; if (px < f.box[0] || px > f.box[1] || pz < f.box[2] || pz > f.box[3]) continue; if (ringHasP(f.poly, px, pz) && best < 0.6) best = 0.6; } }
    return best;
  };
  const ringHasP = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 1; i < o.length; j = i++) { const a = o[i], b = o[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
  nav.fastCover = fastCover;
  const covBase = (x, z) => (net && net.grid ? fastCover(x, z) : net && net.cover ? net.cover(x, z, NOP) : (L.isOnRoad(x, z, 0.1) ? 1 : -5));
  // on a long bridge the whole deck between the barrier kerbs is the carriageway (the streets cover leaves the tram / median strip of a deck open)
  const covAt = longs.length ? (x, z) => { if (x > WEST_X) return covBase(x, z); const d = longDeck(x, z); if (!d) return covBase(x, z); const c = covBase(x, z), m = d.s.v0 - 0.3 - Math.abs(d.v); return m > c ? m : c; } : covBase;
  const onAsphalt = (x, z, m = 0.12) => covAt(x, z) > -m;
  // OSM maps a zebra over a two-carriageway street as two collinear halves that meet in the middle of the asphalt (Nevsky has no refuge): merge such pairs into ONE crossing
  let cws;
  if (cached) cws = cached.cws.map(c=>({...c, ids:c.ids.slice()}));      // (the baked records: merged pairs, virtual crossings, kerb ends: the quadratic merge below is not repeated)
  else {
  const rawCw = ((st && st.crosswalks) || []).map((c) => ({ id: c.id, ids: [c.id], p: [c.pts[0].slice(), c.pts[1].slice()], w: c.w, signalised: !!c.signalised, signal: c.signal, road: c.road }));
  for (let i = 0; i < rawCw.length; i++) {                         // (no restart from the first record after a merge: the merged record is tried again with the rest)
    for (let merged = true; merged;) {
      merged = false;
      for (let j = i + 1; j < rawCw.length && !merged; j++) {
        const a = rawCw[i], b = rawCw[j];
        for (const [pa, pb] of [[1, 0], [0, 1], [0, 0], [1, 1]]) {
          const m = a.p[pa], n = b.p[pb]; if (Math.abs(m[0] - n[0]) > 3.6 || Math.abs(m[1] - n[1]) > 3.6 || hyp(m[0] - n[0], m[1] - n[1]) > 3.6) continue;
          const fa = a.p[1 - pa], fb = b.p[1 - pb], ux = fa[0] - m[0], uz = fa[1] - m[1], vx = fb[0] - n[0], vz = fb[1] - n[1], ul = hyp(ux, uz) || 1, vl = hyp(vx, vz) || 1;
          if ((ux * vx + uz * vz) / (ul * vl) > -0.9) continue;                                      // not a straight continuation
          rawCw[i] = { id: a.id, ids: a.ids.concat(b.ids), p: [fa, fb], w: Math.max(a.w, b.w), signalised: a.signalised || b.signalised, signal: a.signal || b.signal, road: a.road };
          rawCw.splice(j, 1); merged = true; break;
        }
      }
    }
  }
  cws = rawCw.map((c, i) => {
    const a = c.p[0], b = c.p[1], len = hyp(b[0] - a[0], b[1] - a[1]) || 1;
    return { i, id: c.id, ids: c.ids, ax: a[0], az: a[1], bx: b[0], bz: b[1], len, ux: (b[0] - a[0]) / len, uz: (b[1] - a[1]) / len, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, w: c.w, signalised: c.signalised, signal: c.signal, road: c.road, na: -1, nb: -1, edge: -1, ea: 0, eb: 0 };
  });
  }
  nav.crossIndexById = new Map(); for (const c of cws) for (const id of c.ids) nav.crossIndexById.set(id, c.i);
  // the bake (recorded below, after the node heights) holds the whole static graph: a FINAL bake also carries the component labels, the bridge chains and the final heights, so the
  // sections between the graph and the entrances are skipped too (an older bake without `final` still takes the original path through them)
  const FINAL = !!(cached && cached.final);
  // virtual crossings: most side-street mouths have no mapped zebra, but people cross them anyway (cars give way / wait for a gap). One per junction arm that has none:
  // the first perpendicular line past the junction box where the arm's asphalt is only as wide as its carriageway (+ pockets).
  // (cached: the baked cws already contain them, and a second pass could add nothing: every candidate lies within 10 m of its own baked record)
  if (cached) nav.stats.virtualCrossings = cws.reduce((n, c) => n + (c.virtual && String(c.id)[0] === 'V' ? 1 : 0), 0);
  else {
    const roadW = new Map(); for (const r of (st && st.roads) || []) roadW.set(r.id, r);
    const cov = (x, z) => covAt(x, z);
    let nv = 0;
    for (const j of (st && st.junctions) || []) {
      if (!inPlay(j.x, j.z, -10) || zoneW(j.x, j.z) < 0.14 || j.arms.length < 3) continue;
      for (const a of j.arms) {
        if (a.crossing) continue; const rd = roadW.get(a.road); if (!rd || rd.rank >= 3 || rd.bridge) continue;
        const w = rd.w || 6, dx = Math.sin(a.bearing * Math.PI / 180), dz = -Math.cos(a.bearing * Math.PI / 180), nx = -dz, nz = dx;
        for (let s = 5; s <= 46; s += 1.2) {
          const px = j.x + dx * s, pz = j.z + dz * s;
          if (cov(px, pz) < 0.3) break;                                  // the arm ended (dead end / hole)
          let tA = 0, tB = 0; while (tA < 11 && cov(px - nx * tA, pz - nz * tA) > -0.45) tA += 0.5; while (tB < 11 && cov(px + nx * tB, pz + nz * tB) > -0.45) tB += 0.5;
          if (tA >= 11 || tB >= 11 || tA + tB > w + 4.8 || tA + tB < 2.8) continue;
          const mx = px + nx * (tB - tA) / 2, mz = pz + nz * (tB - tA) / 2;
          if (cws.some((c) => hyp(c.x - mx, c.z - mz) < 10)) break;
          const A = [px - nx * (tA + 0.1), pz - nz * (tA + 0.1)], B = [px + nx * (tB + 0.1), pz + nz * (tB + 0.1)];
          if (rawInBuilding(A[0], A[1]) || rawInBuilding(B[0], B[1])) break;
          const len = hyp(B[0] - A[0], B[1] - A[1]), id = 'V' + j.id + '_' + a.index;
          cws.push({ i: cws.length, id, ids: [id], ax: A[0], az: A[1], bx: B[0], bz: B[1], len, ux: (B[0] - A[0]) / len, uz: (B[1] - A[1]) / len, x: mx, z: mz, w: 4.4, signalised: false, signal: null, road: a.road, virtual: true, na: -1, nb: -1, edge: -1, ea: 0, eb: 0 });
          nv++; break;
        }
      }
    }
    nav.stats.virtualCrossings = nv;
  }
  /** pedestrian signal state of a crossing record (virtual ones are always 'free') */
  nav.pedState = (c, t) => (c.virtual || !st || !st.pedState ? 'free' : st.pedState(c.id, t));
  nav.crossIndexById = new Map(); for (const c of cws) for (const id of c.ids) nav.crossIndexById.set(id, c.i);
  /** index of the zebra corridor that contains (x,z) (|along| < w/2 + m, between the kerbs +- m), else -1 */
  const crosswalkAt = createCrosswalkLookup(cws);
  /** the pedestrian may stand here: not inside a building, not in a bed / the hill / water, and on asphalt only inside a zebra corridor (the bridge deck is a floor) */
  const walkable = (x, z) => !inBuilding(x, z) && !blockedPoly(x, z) && (onDeck(x, z, 0.3) ? (deckPave(x, z) || crosswalkAt(x, z, 0.5) >= 0) : (!water(x, z) && (!onAsphalt(x, z) || crosswalkAt(x, z, 0.5) >= 0)));
  nav.cover = (x, z) => (onDeck(x, z, 0) ? (deckPave(x, z) ? -3 : 1) : covAt(x, z));
  nav.onAsphalt = (x, z, m) => !onDeck(x, z, 0) && onAsphalt(x, z, m); nav.crosswalkAt = crosswalkAt; nav.walkable = walkable; nav.crosswalks = cws;

  mark('zebras');
  // ------------------------------------------------------------------ obstacles = the static colliders of the player (trunks, lamps, benches, bollards, walls, columns ...)
  const OC = 6, oGrid = new Map(), obst = [], fenceCells = new Set();
  const addObst = (o, x0, x1, z0, z1) => { const id = obst.length; obst.push(o); for (let cx = Math.floor((x0 - 0.7) / OC); cx <= Math.floor((x1 + 0.7) / OC); cx++) for (let cz = Math.floor((z0 - 0.7) / OC); cz <= Math.floor((z1 + 0.7) / OC); cz++) { const k = cellKey(cx, cz); let a = oGrid.get(k); if (!a) oGrid.set(k, (a = [])); a.push(id); if (o.fence) fenceCells.add(k); } };
  /** a guard rail / chain collider (streets/barriers.js, `fence`) lies in the 6 m cell of (x, z): the cheap pre-test of the walkers' lateral offsets (sim.js: lane, follower side) before they ask segBlocked */
  nav.fenceNear = (x, z) => fenceCells.has(cellKey(Math.floor(x / OC), Math.floor(z / OC)));
  let nKeep = 0;
  // on a long bridge the colliders are measured from the deck: the piers / abutments below it are no obstacles, the lamp standards, barrier kerbs and railings ON it are
  const deckBase = (it) => { const d = longDeck(it.cx, it.cz, 6); if (!d || !bdY) return 0; const s = d.s, u = clamp(d.u, 0, s.len), v = clamp(d.v, -s.hw, s.hw), y = bdY(s.ax + s.ux * u - s.uz * v, s.az + s.uz * u + s.ux * v); return y !== null && Number.isFinite(y) ? y : 0; };
  for (const it0 of ctx.physics.items) {
    let it = it0;
    if (longs.length && it0.cx < WEST_X && (it0.type === 'cyl' || it0.type === 'box')) { const yb = deckBase(it0); if (yb > 0.3) { if (it0.y1 <= yb + 0.3) continue; it = { ...it0, y0: it0.y0 - yb, y1: it0.y1 - yb }; } }
    const west = it.cx < WEST_X;
    if (it.type === 'cyl') { if ((it.y1 <= 0.45 && !(west && it.r >= 0.9 && it.y1 > 0.2)) || it.y0 >= 1.7) continue; addObst({ t: 0, cx: it.cx, cz: it.cz, r: it.r }, it.cx - it.r, it.cx + it.r, it.cz - it.r, it.cz + it.r); }
    else if (west && it.type === 'walk' && it.y0 < 0.6 && (it.top >= 0.25 || (it.top <= -0.25 && it.top >= -3.7)) && !(it.top <= 0.46 && it.top > 0 && inColonnade(it.cx, it.cz, 41.5, 58.5))) {
      // the steps, stylobates, plinths and podiums of the landmark modules (walk boxes above the pavement) and the stairs of the embankment descents (walk boxes below it): nobody walks there
      const ex = Math.abs(it.c) * it.hw + Math.abs(it.s) * it.hd, ez = Math.abs(it.s) * it.hw + Math.abs(it.c) * it.hd; nKeep++;
      addObst({ t: 1, cx: it.cx, cz: it.cz, hw: it.hw, hd: it.hd, c: it.c, s: it.s, wall: Math.max(it.hw, it.hd) >= 0.6, keep: true }, it.cx - ex, it.cx + ex, it.cz - ez, it.cz + ez);
    }
    else if (it.type === 'box' || (it.type === 'walk' && it.top > 0.5)) {
      if (it.type === 'box' && ((it.y1 <= 0.45 && !(west && it.y1 > 0.2 && Math.max(it.hw, it.hd) >= 0.6 && Math.min(it.hw, it.hd) >= 0.25)) || it.y0 >= 1.7)) continue;
      if (it.type === 'box' && it.y0 < -2.5 && it.y1 < 3.4 && Math.max(it.hw, it.hd) > 12) continue;       // the deep quay / bridge railing cores are handled by the water test
      if (it.type === 'walk' && (it.hw * it.hd > 14 || it.top > 0.95 || Math.max(it.hw, it.hd) > 4)) continue;   // platform decks, ramps, the bridge deck, stage floors: floors, not obstacles
      const ex = Math.abs(it.c) * it.hw + Math.abs(it.s) * it.hd, ez = Math.abs(it.s) * it.hw + Math.abs(it.c) * it.hd;
      addObst({ t: 1, cx: it.cx, cz: it.cz, hw: it.hw, hd: it.hd, c: it.c, s: it.s, wall: Math.max(it.hw, it.hd) >= 0.6 || !!it.fence, fence: !!it.fence }, it.cx - ex, it.cx + ex, it.cz - ez, it.cz + ez);          // (it.fence: a guard rail run, streets/barriers.js: always a wall for the routes)
    }
  }
  nav.obstacles = obst.length; nav.keepOuts = nKeep;
  const obstacleIndex = new PackedCellIndex(oGrid);
  /** push the circle (p.x, p.z, r) out of the static colliders (same maths as Physics.resolve); returns true when it moved */
  nav.pushOut = (p, r) => {
    let moved = false;
    for (let iter = 0; iter < 2; iter++) {
      let m = false; const row = obstacleIndex.row(cellKey(Math.floor(p.x / OC), Math.floor(p.z / OC)));
      if (row < 0) break;
      for (let j = obstacleIndex.offsets[row]; j < obstacleIndex.offsets[row + 1]; j++) {
        const o = obst[obstacleIndex.values[j]];
        if (o.t === 0) { const dx = p.x - o.cx, dz = p.z - o.cz, d = hyp(dx, dz), mm = r + o.r; if (d < mm) { const k = d > 1e-6 ? (mm - d) / d : 0; p.x += dx * k; p.z += dz * k; if (d <= 1e-6) p.x += mm; m = true; } continue; }
        const dx = p.x - o.cx, dz = p.z - o.cz, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
        if (Math.abs(lx) > o.hw + r || Math.abs(lz) > o.hd + r) continue;
        const qx = clamp(lx, -o.hw, o.hw), qz = clamp(lz, -o.hd, o.hd); let ddx = lx - qx, ddz = lz - qz; const d = hyp(ddx, ddz); let nx, nz, pen;
        if (d > 1e-6) { if (d >= r) continue; nx = ddx / d; nz = ddz / d; pen = r - d; }
        else { const ex = o.hw - Math.abs(lx), ez = o.hd - Math.abs(lz); if (ex < ez) { nx = Math.sign(lx) || 1; nz = 0; pen = ex + r; } else { nx = 0; nz = Math.sign(lz) || 1; pen = ez + r; } }
        p.x += (nx * o.c + nz * o.s) * pen; p.z += (-nx * o.s + nz * o.c) * pen; m = true;
      }
      if (!m) break; moved = true;
    }
    return moved;
  };
  const segSeen = new Int32Array(1 << 16); let segStamp = 0;
  /** does the segment cross a wall / fence / guard rail (a thin long collider)? the pedestrian radius 0.2 is added */
  nav.segBlocked = (ax, az, bx, bz, pad = 0.2) => {
    segStamp++;
    for (let cx = Math.floor((Math.min(ax, bx) - 0.4) / OC); cx <= Math.floor((Math.max(ax, bx) + 0.4) / OC); cx++) for (let cz = Math.floor((Math.min(az, bz) - 0.4) / OC); cz <= Math.floor((Math.max(az, bz) + 0.4) / OC); cz++) {
      const row = obstacleIndex.row(cellKey(cx, cz)); if (row < 0) continue;
      for (let j = obstacleIndex.offsets[row]; j < obstacleIndex.offsets[row + 1]; j++) {
        const id = obstacleIndex.values[j];
        if (segSeen[id & 0xffff] === segStamp && id < 65536) continue; if (id < 65536) segSeen[id] = segStamp;
        const o = obst[id]; if (o.t !== 1 || !o.wall) continue;
        const dx0 = ax - o.cx, dz0 = az - o.cz, dx1 = bx - o.cx, dz1 = bz - o.cz, x0 = dx0 * o.c - dz0 * o.s, z0 = dx0 * o.s + dz0 * o.c, x1 = dx1 * o.c - dz1 * o.s, z1 = dx1 * o.s + dz1 * o.c, hw = o.hw + pad, hd = o.hd + pad;
        if (pad < 0.1 && Math.abs(x0) <= hw && Math.abs(z0) <= hd) continue;                      // (a tight test, the anti-tunnelling guard of sim.js move(): a walker that already stands inside the core is not stopped by it)
        let t0 = 0, t1 = 1; const ddx = x1 - x0, ddz = z1 - z0; let miss = false;
        { let p0 = x0, dd = ddx, h = hw;      // (round 4: the two slab tests unrolled, no array literals per obstacle: 83 MB per 20 s)
          if (Math.abs(dd) < 1e-9) { if (Math.abs(p0) > h) miss = true; } else { let u0 = (-h - p0) / dd, u1 = (h - p0) / dd; if (u0 > u1) { const q = u0; u0 = u1; u1 = q; } if (u0 > t0) t0 = u0; if (u1 < t1) t1 = u1; if (t0 > t1) miss = true; }
          if (!miss) { p0 = z0; dd = ddz; h = hd; if (Math.abs(dd) < 1e-9) { if (Math.abs(p0) > h) miss = true; } else { let u0 = (-h - p0) / dd, u1 = (h - p0) / dd; if (u0 > u1) { const q = u0; u0 = u1; u1 = q; } if (u0 > t0) t0 = u0; if (u1 < t1) t1 = u1; if (t0 > t1) miss = true; } } }
        if (!miss) return true;
      }
    }
    return false;
  };
  /** distance from (x,z) to the nearest obstacle surface (<= rmax, else rmax) */
  nav.obstDist = (x, z, rmax = 2) => {
    let best = rmax; const row = obstacleIndex.row(cellKey(Math.floor(x / OC), Math.floor(z / OC))); if (row < 0) return best;
    for (let j = obstacleIndex.offsets[row]; j < obstacleIndex.offsets[row + 1]; j++) {
      const o = obst[obstacleIndex.values[j]]; let d;
      if (o.t === 0) d = hyp(x - o.cx, z - o.cz) - o.r;
      else { const dx = x - o.cx, dz = z - o.cz, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c, qx = clamp(lx, -o.hw, o.hw), qz = clamp(lz, -o.hd, o.hd); d = hyp(lx - qx, lz - qz); if (d === 0) d = -1; }
      if (d < best) best = d;
    }
    return best;
  };

  mark('obstacles');
  // ------------------------------------------------------------------ the graph
  const N = cached ? Object.fromEntries(Object.entries(cached.N).map(([key, a]) => [key, Array.from(a)])) : { x: [], z: [], y: [], k: [], g: [] };          // k: 's' pavement, 'p' footway, 'c' zebra end, 'a' open lattice, 'e' entrance, 'b' bench / stop / spot access, 'h' hall floor, 'g' apron, 'f' platform / ramp, 'k' bridge; g = group id
  const E = new PackedEdges(cached?.edges);
  const adj = new PackedAdjacency(N.x.length, E);
  const dsu = Array.from({ length: N.x.length }, (_, i) => i);                                            // union-find over the edges, maintained while the graph grows (the component labels are read from it: nav.compOf)
  const dfind = (x) => { while (dsu[x] !== x) { dsu[x] = dsu[dsu[x]]; x = dsu[x]; } return x; };
  const addNode = (x, z, y, k, g = -1) => { N.x.push(x); N.z.push(z); N.y.push(y); N.k.push(k); N.g.push(g); adj.push([]); dsu.push(dsu.length); return N.x.length - 1; };
  const hasEdge = (a, b) => { const c = E.columns; for (const e of adj[a]) if (c.a[e] === b || c.b[e] === b) return true; return false; };
  const addEdge = (a, b, kind = 0, cid = -1, extra = 0, mult = 1) => {
    if (a === b || hasEdge(a, b)) return -1;
    const len = hyp(N.x[a] - N.x[b], N.z[a] - N.z[b]), e = { a, b, len, kind, cid, cost: len * mult + extra };
    E.push(e); adj.append(a, E.length - 1); adj.append(b, E.length - 1); { const ra = dfind(a), rb = dfind(b); if (ra !== rb) dsu[ra < rb ? rb : ra] = ra < rb ? ra : rb; } return E.length - 1;
  };
  /** the straight segment is free of buildings / beds / water / asphalt (a zebra corridor excepted when crossOK) */
  const edgeOK = (ax, az, bx, bz, crossOK = false, step = 1.0) => {
    if (nav.segBlocked(ax, az, bx, bz)) return false;
    const l = hyp(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / step));
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n, z = az + ((bz - az) * i) / n;
      if (inBuilding(x, z) || blockedPoly(x, z)) return false;
      if (onDeck(x, z, 0.3)) { if (!(deckPave(x, z, -0.1) || (crossOK && crosswalkAt(x, z, 0.8) >= 0))) return false; continue; }
      if (water(x, z)) return false;
      if (onAsphalt(x, z) && !(crossOK && crosswalkAt(x, z, 0.8) >= 0)) return false;
    }
    return true;
  };
  /** the segment also clears the static obstacles by `clr` metres (open areas: so that lattice routes do not run into benches and columns) */
  const segFree = (ax, az, bx, bz, clr = 0.45) => {
    const l = hyp(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / 0.9));
    for (let i = 0; i <= n; i++) if (nav.obstDist(ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n, clr + 0.1) < clr) return false;
    return true;
  };
  if (cached) for (let i = 0; i < E.length; i++) {
    const a = E.columns.a[i], b = E.columns.b[i];
    const ra = dfind(a), rb = dfind(b); if (ra !== rb) dsu[ra < rb ? rb : ra] = Math.min(ra, rb);
  }
  let groupId = cached?.groupId ?? 1;
  const api = { N, E, adj, addNode, addEdge, hasEdge, edgeOK, segFree, newGroup: () => groupId++ };

  let nSidewalk = cached?.nSidewalk ?? 0;
  if (!cached) {
  // pavements: every sidewalk centreline, nodes ~3 m apart
  for (const s of (st && st.sidewalks) || []) {
    const pts = s.pts; if (!pts || pts.length < 2) continue;
    const g = groupId++; let prev = -1, accL = 0, lastp = null;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]; if (!inPlay(p[0], p[1], 8) || onAsphalt(p[0], p[1], 0.05) || inBuilding(p[0], p[1]) || blockedPoly(p[0], p[1]) || deepGround(p[0], p[1])) { prev = -1; lastp = null; accL = 0; continue; }
      if (lastp) accL += hyp(p[0] - lastp[0], p[1] - lastp[1]);
      if (prev < 0 || accL >= 3.0 || i === pts.length - 1) {
        const id = addNode(p[0], p[1], PAVE, 's', g);
        if (prev >= 0 && edgeOK(N.x[prev], N.z[prev], p[0], p[1], false, 1.6)) addEdge(prev, id, 0, -1, 0, 1.0);
        prev = id; accL = 0;
      }
      lastp = p;
    }
  }
  nSidewalk = N.x.length;
  // mapped footways (not steps)
  for (const s of (st && st.paths) || []) {
    if (s.hw === 'steps' || !s.pts || s.pts.length < 2) continue;
    const g = groupId++; let prev = -1, accL = 0, lastp = null;
    for (let i = 0; i < s.pts.length; i++) {
      const p = s.pts[i]; if (!inPlay(p[0], p[1], 8) || onAsphalt(p[0], p[1], 0.05) || inBuilding(p[0], p[1]) || blockedPoly(p[0], p[1]) || deepGround(p[0], p[1])) { prev = -1; lastp = null; accL = 0; continue; }
      if (lastp) accL += hyp(p[0] - lastp[0], p[1] - lastp[1]);
      if (prev < 0 || accL >= 3.0 || i === s.pts.length - 1) {
        const id = addNode(p[0], p[1], 0.04, 'p', g);
        if (prev >= 0 && edgeOK(N.x[prev], N.z[prev], p[0], p[1], false, 1.6)) addEdge(prev, id, 0, -1, 0, 1.12);
        prev = id; accL = 0;
      }
      lastp = p;
    }
  }
  }
  mark('sidewalks+paths');
  const nPolyEnd = cached?.nPolyEnd ?? N.x.length;

  // ------------------------------------------------------------------ the lattice: open-space nodes (3 m) near the avenue / hot spots, joined 8-ways when the mid points are free
  const LS = 2.0, LMIN = 0.16;
  /** the ground of the west at (x, z) is a pit / a stair well / a trench (not a bridge deck): no standing place */
  const pitAt = (x, z) => { if (x > WEST_X) return false; const h = ctx.physics.groundHeight(x, z, 0.6, false); return Number.isFinite(h) && h < -0.3 && !deckWalk(x, z); };
  /** an edge over a pit (both nodes stand on the street, a point of the edge does not): sampled at 1/5 .. 4/5 */
  const pitOnEdge = (ax, az, bx, bz) => { if (ax > WEST_X && bx > WEST_X) return false; for (let k = 1; k < 5; k++) if (pitAt(ax + (bx - ax) * k / 5, az + (bz - az) * k / 5)) return true; return false; };
  const lat = new Map(), latList = cached ? Array.from(cached.latList) : [];
  // the pavement strips (streets.sidewalks centrelines, kerb to facade) in a coarse grid: a lattice cell beyond the registered range of the road grid (the outer half of the wide Nevsky
  // pavements, arcades) is still pavement when a strip centreline passes within 5.5 m
  const SWC = 8, swGrid = new Map();
  for (const sw of (st && st.sidewalks) || []) for (let i = 0; i + 1 < sw.pts.length; i++) { const a = sw.pts[i], b = sw.pts[i + 1]; for (let cx = Math.floor((Math.min(a[0], b[0]) - 6) / SWC); cx <= Math.floor((Math.max(a[0], b[0]) + 6) / SWC); cx++) for (let cz = Math.floor((Math.min(a[1], b[1]) - 6) / SWC); cz <= Math.floor((Math.max(a[1], b[1]) + 6) / SWC); cz++) { const k = cellKey(cx, cz); let l = swGrid.get(k); if (!l) swGrid.set(k, (l = [])); l.push(a[0], a[1], b[0], b[1]); } }
  // pedestrian paving areas (squares: Vosstaniya, the station forecourt ...): the whole polygon is walkable open space
  const areaRings = []; for (const a of AREAS) for (const p of a.polys) areaRings.push({ o: p.o, h: p.h || [], b: bboxOf(p.o) });
  const inArea = (x, z) => { for (const p of areaRings) { if (x < p.b[0] || x > p.b[1] || z < p.b[2] || z > p.b[3]) continue; if (ringHas(p.o, x, z) && !p.h.some((h) => ringHas(h, x, z))) return true; } return false; };
  nav.inArea = inArea;
  // ---- west: corridors THROUGH buildings (floor inside a footprint): the open gallery of Gostiny Dvor (the arcade is inside the OSM ring: piers + back wall are colliders) and the three arched
  //      gateways of the Winter Palace (vaulted passages, 24 m, to the Great Courtyard); the Great Courtyard itself is a pedestrian area. Everything is data read from the services.
  nav.passages = []; nav.passageTests = {};
  const passTests = [];
  const addPassage = (name, ax, az, bx, bz, w, o = {}) => {
    const dx = bx - ax, dz = bz - az, l = hyp(dx, dz); if (l < 3) return;
    // q = lateral offset to the left of the axis; o.qlo / o.qhi / o.slope describe a corridor that is not symmetric about the axis (the arcade of Gostiny Dvor)
    const ux = dx / l, uz = dz / l, hw = w / 2, ql = o.qlo ?? -hw, qh = o.qhi ?? hw, sl = o.slope ?? 0, test = (x, z) => { const t = (x - ax) * ux + (z - az) * uz, q = -(x - ax) * uz + (z - az) * ux; return t >= -0.1 && t <= l + 0.1 && q >= ql + sl * t && q <= qh; };
    interiors.push(test); passTests.push(test); nav.passageTests[name] = test; nav.passages.push({ name, ax, az, bx, bz, w });
  };
  const inPassage = (x, z) => { for (let i = 0; i < passTests.length; i++) if (passTests[i](x, z)) return true; return false; };
  nav.inPassage = inPassage;
  try {
    const gg = svc.landmarksE && svc.landmarksE.spots && svc.landmarksE.spots.gdGallery;
    // measured: the gallery floor runs q -0.9 .. +1.4 (east end, by the metro doors) .. -0.2 .. +2.2 (far end) beside the start-end axis; the pier bays open to the promenade up to q ~ 3.5
    if (gg && gg.start && gg.end) { const dx = gg.end[0] - gg.start[0], dz = gg.end[1] - gg.start[1], l = hyp(dx, dz), ux = dx / l, uz = dz / l, ext = 24; addPassage('gostiny-gallery', gg.start[0] - ux * ext, gg.start[1] - uz * ext, gg.end[0] + ux * ext, gg.end[1] + uz * ext, 3.4, { qlo: -1.14, qhi: 4.2, slope: 0.0055 }); }
  } catch (e) { console.error('[people] gallery passage failed:', e); }
  try {                                                             // the Winter Palace gateways: scan the three lines v = 0.55 (+- 8.4) of the palace frame (origin the Alexander Column, axis 54 deg)
    const CO = Math.cos(54 * Math.PI / 180), SI = Math.sin(54 * Math.PI / 180), wp = (u, v) => [-1983 + u * CO - v * SI, -738 + u * SI + v * CO];
    [[-7.85, 3.8], [0.55, 5.8], [8.95, 3.8]].forEach(([v, w], gi) => {
      let uf = null, uc = null;
      for (let u = -60; u > -260; u -= 0.4) { const p = wp(u, v), inb = rawInBuilding(p[0], p[1]); if (uf === null && inb) uf = u; else if (uf !== null && !inb) { uc = u; break; } }
      if (uf !== null && uc !== null && uf - uc > 12 && uf - uc < 45) { const a = wp(uf + 2.2, v), b = wp(uc - 2.4, v); addPassage('winter-palace-gate-' + gi, a[0], a[1], b[0], b[1], w); }
    });
    const cy = svc.landmarksI && svc.landmarksI.courtyard;
    if (cy && cy.length > 5) { const o = cy.flatMap((q) => [q[0], q[1]]); areaRings.push({ o, h: [], b: bboxOf(o) }); }
  } catch (e) { console.error('[people] Winter Palace gateways failed:', e); }
  try {                                                             // the Admiralty gate: a 9.2 m wide, 24 m long vault under the tower (landmarksH frame: origin the tower, b axis bearing 322.5 deg)
    const T = svc.landmarksH && svc.landmarksH.tower, tx = T ? T.x : -2387, tz = T ? T.z : -565, R = 37.5 * Math.PI / 180, cr = Math.cos(R), sr = Math.sin(R), wb = (b) => [tx - sr * b, tz - cr * b];
    const a0 = wb(-15), b0 = wb(15); addPassage('admiralty-gate', a0[0], a0[1], b0[0], b0[1], 8.6);
  } catch (e) { console.error('[people] Admiralty gate failed:', e); }
  // the Kazan colonnade: the covered promenade between the faces of the entablature (radius 44.3 .. 54.7 m round C = (-1472.4, -269.7) in the cathedral frame, angle 19 .. 84 deg from the south axis):
  // inside the OSM footprint, so an interior; its stylobate (walk boxes 0.15 / 0.30 / 0.45 m) is walkable, the columns are obstacles
  { const test = (x, z) => inColonnade(x, z, 41, 58.5) && rawInBuilding(x, z); interiors.push(test); passTests.push(test); nav.passageTests['kazan-colonnade'] = test; nav.passages.push({ name: 'kazan-colonnade', ax: KC0.x, az: KC0.z, bx: KC0.x, bz: KC0.z, w: 10.4 }); }
  const nearSw = (x, z, r) => { const l = swGrid.get(cellKey(Math.floor(x / SWC), Math.floor(z / SWC))); if (!l) return false; for (let i = 0; i < l.length; i += 4) { const ax = l[i], az = l[i + 1], dx = l[i + 2] - ax, dz = l[i + 3] - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), ex = x - ax - dx * t, ez = z - az - dz * t; if (ex * ex + ez * ez < r * r) return true; } return false; };
  // open lawns of the west (the Alexander / Admiralty / Isaac's / Kazan gardens): the lattice may run over park grass there (the east keeps its pavements-only rule)
  const parkRings = []; for (const g of GREEN) if (g.kind === 'park' || g.kind === 'grass' || g.kind === 'grassland' || g.kind === 'recreation_ground' || g.kind === 'wood') for (const p of g.polys) { const b = bboxOf(p.o); if (b[1] < WEST_X) parkRings.push({ o: p.o, h: p.h || [], b }); }
  const inPark = (x, z) => { if (x > WEST_X) return false; for (const p of parkRings) { if (x < p.b[0] || x > p.b[1] || z < p.b[2] || z > p.b[3]) continue; if (ringHas(p.o, x, z) && !p.h.some((h) => ringHas(h, x, z))) return true; } return false; };
  nav.inPark = inPark;
  {
    if (!cached) {
    const tLat = Date.now();
    for (const rc of L.WORLD.rects) {
      const gx0 = Math.ceil(rc.x0 / LS), gx1 = Math.floor(rc.x1 / LS), gz0 = Math.ceil(rc.z0 / LS), gz1 = Math.floor(rc.z1 / LS);
      const BL = 6;                                                                                        // 12 m blocks: a block whose centre / corner weights are all far below the threshold has no cell above it
      for (let bx = Math.floor(gx0 / BL); bx <= Math.floor(gx1 / BL); bx++) for (let bz = Math.floor(gz0 / BL); bz <= Math.floor(gz1 / BL); bz++) {
        const cx0 = bx * BL * LS, cz0 = bz * BL * LS, cx1 = cx0 + BL * LS, cz1 = cz0 + BL * LS;
        if (Math.max(zoneW((cx0 + cx1) / 2, (cz0 + cz1) / 2), zoneW(cx0, cz0), zoneW(cx1, cz0), zoneW(cx0, cz1), zoneW(cx1, cz1)) * 3 < LMIN) continue;
        for (let gx = Math.max(gx0, bx * BL); gx <= Math.min(gx1, bx * BL + BL - 1); gx++) for (let gz = Math.max(gz0, bz * BL); gz <= Math.min(gz1, bz * BL + BL - 1); gz++) {
        if (lat.has((gx + 4096) * 8192 + gz + 4096)) continue;                                                              // the rectangles touch: a border cell is visited once
        const x = gx * LS + 0.37 * Math.sin(gz * 12.9898) , z = gz * LS + 0.37 * Math.sin(gx * 78.233);     // a small fixed jitter breaks the regular rows
        const zw = zoneW(x, z); if (zw < LMIN) continue;
        if (x < WEST_X && zw < 0.55 && ((gx + gz) & 1)) continue;                                         // quiet parts of the west: a checkerboard (the diagonal edges still join it)
        if (inBuilding(x, z) || blockedPoly(x, z) || water(x, z) || (longs.length && x < WEST_X && longDeck(x, z))) continue;      // (the long bridge gets explicit pavement chains)
        { const c = covAt(x, z); if (c > -0.5 || (c <= -49 && !nearSw(x, z, 5.5) && !inArea(x, z) && !deckWalk(x, z) && !inPark(x, z) && !inPassage(x, z) && !area.walk(x, z))) continue; }
        if (nav.obstDist(x, z, 0.6) < 0.42) continue;
        if (x < WEST_X) { const h = ctx.physics.groundHeight(x, z, 0.6, false); if (Number.isFinite(h) && (h < -0.3 || h > 0.5) && !deckWalk(x, z)) continue; }   // steps / stairs down / sunk areas are not street level
        const id = addNode(x, z, PAVE, 'a', 5000 + gx * 7919 + gz); lat.set((gx + 4096) * 8192 + gz + 4096, id); latList.push(id);
        }
      }
    }
    nav.stats.latMs = Date.now() - tLat; const LDX = [1, 0, 1, 1], LDZ = [0, 1, 1, -1];
    for (const id of latList) {
      const gx = Math.round(N.x[id] / LS), gz = Math.round(N.z[id] / LS);
      for (let q = 0; q < 4; q++) {
        const dx = LDX[q], dz = LDZ[q];
        const j = lat.get((gx + dx + 4096) * 8192 + gz + dz + 4096); if (j === undefined) continue;
        const mx = (N.x[id] + N.x[j]) / 2, mz = (N.z[id] + N.z[j]) / 2;
        if (inBuilding(mx, mz) || covAt(mx, mz) > -0.25 || blockedPoly(mx, mz) || nav.segBlocked(N.x[id], N.z[id], N.x[j], N.z[j])) continue;
        if (nav.obstDist(mx, mz, 0.5) < 0.32) continue;
        if (pitOnEdge(N.x[id], N.z[id], N.x[j], N.z[j])) continue;
        addEdge(id, j, 0, -1, 0, dx && dz ? 1.22 : 1.18);
      }
    }
  }
  }
  nav.stats.lattice = latList.length;

  mark('lattice');
  // node grid for joins / lookups
  const NC = 8, nGrid = new Map();
  const gridAdd = (id) => { const k = cellKey(Math.floor(N.x[id] / NC), Math.floor(N.z[id] / NC)); let a = nGrid.get(k); if (!a) nGrid.set(k, (a = [])); a.push(id); };
  for (let i = 0; i < N.x.length; i++) gridAdd(i);
  const near = (x, z, r, fn) => { for (let cx = Math.floor((x - r) / NC); cx <= Math.floor((x + r) / NC); cx++) for (let cz = Math.floor((z - r) / NC); cz <= Math.floor((z + r) / NC); cz++) { const a = nGrid.get(cellKey(cx, cz)); if (a) for (const id of a) { const d = hyp(N.x[id] - x, N.z[id] - z); if (d <= r) fn(id, d); } } };
  nav.nearestNode = (x, z, maxD = 12, pred = null) => { let best = -1, bd = maxD; near(x, z, maxD, (id, d) => { if (d < bd && (!pred || pred(id))) { bd = d; best = id; } }); return best; };
  if (!cached) {
  // polyline nodes (pavement strips, footways) are joined to the lattice (2 nearest nodes within 4.6 m) and strips that touch each other are joined (3.2 m, ends 6.5 m)
  for (let i = 0; i < nPolyEnd; i++) {
    const cand = []; near(N.x[i], N.z[i], 4.6, (j, d) => { if (j >= nPolyEnd) cand.push([j, d]); }); cand.sort((p, q) => p[1] - q[1]);
    let k = 0; for (const [j] of cand) { if (k >= 2) break; if (edgeOK(N.x[i], N.z[i], N.x[j], N.z[j], false, 1.7) && !pitOnEdge(N.x[i], N.z[i], N.x[j], N.z[j])) { addEdge(i, j, 0, -1, 0, 1.15); k++; } }
  }
  const degree = (i) => adj[i].length;
  for (let i = 0; i < nPolyEnd; i++) {
    const r = degree(i) <= 1 ? 6.5 : 3.2; let cnt = 0;
    near(N.x[i], N.z[i], r, (j, d) => { if (j >= nPolyEnd || j <= i || N.g[j] === N.g[i] || cnt > 3 || hasEdge(i, j)) return; if (edgeOK(N.x[i], N.z[i], N.x[j], N.z[j], false, 1.7)) { addEdge(i, j, 0, -1, 0, 1.1); cnt++; } });
  }

  mark('joins');
  // ------------------------------------------------------------------ zebra crossings: one edge kerb to kerb, joined to the pavement nodes at both kerbs
  let nCross = 0;
  for (const c of cws) {
    if (!inPlay(c.x, c.z, 10) || zoneW(c.x, c.z) < 0.1) continue;
    // the kerb ends can lie inside the junction fillet: walk outward until the asphalt is left (+0.4 m = the standing spot)
    let ea = 0, eb = 0; while (ea < 12 && onAsphalt(c.ax - c.ux * ea, c.az - c.uz * ea, 0.45)) ea += 0.25; while (eb < 12 && onAsphalt(c.bx + c.ux * eb, c.bz + c.uz * eb, 0.45)) eb += 0.25;
    c.ea = ea + 0.4; c.eb = eb + 0.4;
    const ax = c.ax - c.ux * c.ea, az = c.az - c.uz * c.ea, bx = c.bx + c.ux * c.eb, bz = c.bz + c.uz * c.eb;
    const A = addNode(ax, az, PAVE, 'c'), B = addNode(bx, bz, PAVE, 'c'); gridAdd(A); gridAdd(B);
    let ja = 0, jb = 0;
    for (const [id, px, pz, side] of [[A, ax, az, 0], [B, bx, bz, 1]]) {
      const cand = []; near(px, pz, 8, (j, d) => { if (N.k[j] !== 'c') cand.push([j, d]); }); cand.sort((p, q) => p[1] - q[1]);
      let k = 0; for (const [j] of cand) { if (k >= 2) break; if (edgeOK(px, pz, N.x[j], N.z[j], false, 1.2) && (N.k[j] !== 'a' || segFree(px, pz, N.x[j], N.z[j], 0.3))) { addEdge(id, j, 0, -1, 0, 1.0); k++; } }
      if (side === 0) ja = k; else jb = k;
    }
    c.ja = ja; c.jb = jb;
    if (ja && jb && edgeOK(ax, az, bx, bz, true)) { const eid = addEdge(A, B, 1, c.i, c.signalised ? 26 : 12, 1.0); if (eid >= 0) { c.na = A; c.nb = B; c.edge = eid; nCross++; } }
  }
  nav.stats.crossings = nCross;

  mark('crossings');
  }
  // ------------------------------------------------------------------ connected components (union find) over the graph
  const nN = () => N.x.length;
  const comp = []; let nComp = 0; const compSize = [];
  const compOf = () => {                                          // component ids in the order of the lowest node index (from the incremental union-find)
    const n = nN(); nComp = 0; compSize.length = 0; const lab = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) { const r = dfind(i); if (lab[r] < 0) { lab[r] = nComp++; compSize.push(0); } comp[i] = lab[r]; compSize[lab[r]]++; }
  };
  let main = 0;
  if (FINAL) {                                                    // the labels of the bake point (the bridge chains below were joined AFTER this labelling: a fresh compOf over the baked dsu could merge components)
    const cc = cached.comp, cs = cached.compSize; for (let i = 0; i < cc.length; i++) comp[i] = cc[i]; for (let i = 0; i < cs.length; i++) compSize[i] = cs[i];
    nComp = cached.nComp; main = cached.main;
  } else { compOf(); for (let i = 1; i < nComp; i++) if (compSize[i] > compSize[main]) main = i; }
  const BIGN = 150;
  const mainOK = (id) => compSize[comp[id]] >= BIGN;          // 'main' = any big component (the square / station, Nevsky north, the Anichkov bank ...)
  nav.stats.mainSize0 = compSize[main];

  // ------------------------------------------------------------------ attach a point to the main graph with a short edge; returns the new node id or -1
  const attach = (x, z, y, kind, maxD = 14, crowd = 0.35) => {
    if (!walkable(x, z) || nav.blocked(x, z) || nav.obstDist(x, z, 0.6) < 0.3) return -1;          // (blocked: the railing rim of the long bridge and the deep ground beside it are no standing place)
    const cand = []; near(x, z, maxD, (j, d) => { if (mainOK(j) && N.k[j] !== 'c') cand.push([j, d]); }); cand.sort((p, q) => p[1] - q[1]);
    let id = -1, k = 0;
    let tried = 0;
    if (longs.length && x < WEST_X && nav.surfaceY && longDeck(x, z)) y = nav.surfaceY(x, z, y);          // an access node (bench, stop, photo spot) on a long bridge stands at deck height
    for (const [j] of cand) {
      if (k >= 2 || tried++ > 8) break;
      if (edgeOK(x, z, N.x[j], N.z[j]) && (N.k[j] !== 'a' || segFree(x, z, N.x[j], N.z[j], crowd))) { if (id < 0) { id = addNode(x, z, y, kind); gridAdd(id); comp[id] = main; } addEdge(id, j, 0, -1, 0, 1.0); k++; }
    }
    return id;
  };
  nav.attach = attach;
  const gridNode = (x, z, y, kind, g = -1) => { const id = addNode(x, z, y, kind, g); gridAdd(id); comp[id] = main; return id; };

  mark('components');
  if (FINAL) {                                                    // the Anichkov / long-bridge chains and the node heights are in the bake
    nav.bridge = { nodes: Array.from(cached.bridgeNodes) }; nav.stats.bridgeNodes = nav.bridge.nodes.length;
    nav.longK = new Set(cached.longK || []); nav.stats.longDecks = cached.stats.longDecks ?? ''; nav.stats.crossings = cached.stats.crossings; groupId = cached.groupId;
  } else {
  // ------------------------------------------------------------------ the Anichkov Bridge: both pavements (granite slabs, 3 m wide) on the deck hump, joined to the streets at the abutments
  nav.bridge = { nodes: [] };
  if (bridge) {
    const SUB = svc.landmarksC.parts, yAt = (x, z) => { const h = ctx.physics.groundHeight(x, z, 3); return Number.isFinite(h) ? h : 0; };
    for (const sg of [-1, 1]) {
      const g = groupId++; let prev = -1;
      for (let u = -29.0; u <= 29.01; u += 2.9) {
        const v = sg * 17.5, x = bcx + u * bcu - v * bsu, z = bcz + u * bsu + v * bcu;
        if (L.insideBuilding(x, z, 0)) { prev = -1; continue; }
        const id = gridNode(x, z, yAt(x, z) + 0.12, 'k', g); nav.bridge.nodes.push(id);
        if (prev >= 0) addEdge(prev, id, 0, -1, 0, 1.0); prev = id;
      }
    }
    void SUB;
    // the ends: join to the pavement graph within 14 m
    for (const id of nav.bridge.nodes) {
      if (adj[id].length > 1 && Math.abs(bridgeUV(N.x[id], N.z[id]).u) < 25) continue;
      const cand = []; near(N.x[id], N.z[id], 15, (j, d) => { if (mainOK(j) && N.k[j] !== 'k' && N.k[j] !== 'c') cand.push([j, d]); }); cand.sort((p, q) => p[1] - q[1]);
      let k = 0; for (const [j] of cand) { if (k >= 2) break; if (edgeOK(N.x[id], N.z[id], N.x[j], N.z[j], false, 1.2)) { addEdge(id, j, 0, -1, 0, 1.2); k++; } }
    }
    // cross links on the deck are the zebra crossings of the streets (the bridge ways are part of the street graph)
  }
  nav.stats.bridgeNodes = nav.bridge.nodes.length;
  // ------------------------------------------------------------------ the long Neva bridge (the Palace Bridge): a chain of nodes on each pavement, joined to the bank graph at the bank end.
  // The chain stops at the edge of the play area (the deck runs on to the north-west, past the border): no walker is routed off the playable part
  nav.longK = new Set(); nav.stats.longDecks = '';
  for (const s of longs) {
    const lanes = [-(s.v0 + LANE_C), s.v0 + LANE_C]; let joined = ''; const nn0 = N.x.length;
    for (const v of lanes) {
      const g = groupId++, ids = [], n = Math.max(2, Math.ceil(s.len / 3)); let prev = -1;
      for (let i = 0; i <= n; i++) {
        const u = s.len * i / n, x = s.ax + s.ux * u - s.uz * v, z = s.az + s.uz * u + s.ux * v;
        if (!inPlay(x, z, 0)) { prev = -1; continue; }
        if ((u < 0 || u > s.len) && rawWater(x, z)) continue;
        if (inBuilding(x, z) || onAsphalt(x, z, 0.2)) { prev = -1; continue; }
        const id = gridNode(x, z, PAVE, 'k', g); ids.push(id); nav.longK.add(id); if (prev >= 0) addEdge(prev, id, 0, -1, 0, 1.0); prev = id;
      }
      if (ids.length < 2) continue;
      for (const [id, dir] of [[ids[0], -1], [ids[ids.length - 1], 1]]) {
        // the bank end: the nearest pavement / lattice nodes beyond the deck end (within 18 m), nothing solid and no asphalt between (the far end lies at the play border: nothing there to join)
        const cand = []; near(N.x[id], N.z[id], 18, (j, d) => { const kj = N.k[j]; if (kj === 'k' || kj === 'c' || nav.longK.has(j)) return; const along = ((N.x[j] - N.x[id]) * s.ux + (N.z[j] - N.z[id]) * s.uz) * dir; if (along > -3) cand.push([j, d + (mainOK(j) ? 0 : 6)]); }); cand.sort((p, q) => p[1] - q[1]);
        let k = 0; for (const [j] of cand) { if (k >= 2) break; if (edgeOK(N.x[id], N.z[id], N.x[j], N.z[j], false, 1.2)) { addEdge(id, j, 0, -1, 0, 1.15); k++; } }
        joined += k;
      }
    }
    nav.stats.longDecks += s.id + ':' + (N.x.length - nn0) + '/' + joined + ' ';
  }
  }
  nav.nodeY = (i) => N.y[i];
  /** the standing height at (x, z): the pavement 0.12 / the given y, or the humped deck of the Anichkov Bridge + 0.12 */
  // feet height from the REAL walkable surface: the humped Anichkov deck (landmarksC.bridge.deckY, + the 0.12 m granite pavement) first, then physics.groundHeight (walk boxes / ramps /
  // steps, roofs excluded) when it is raised above the terrain; otherwise the given y (pavement 0.12, hall 0.03 ...)
  nav.surfaceY = (x, z, y) => {
    if (longs.length && x < WEST_X) { const wd = westDeck(x, z); if (wd && wd.long) return wd.y + (wd.foot ? 0.02 : WLIFT[wd.kind] || 0); }       // the long Neva bridge: the deck itself
    const dy = bridge && bridge.deckY ? bridge.deckY(x, z) : null;
    if (dy != null && Number.isFinite(dy)) { if (x < WEST_X) { const wd = westDeck(x, z); if (wd) return wd.y + (wd.foot ? 0 : WLIFT[wd.kind] || 0); } return dy + 0.12; }
    if (onDeck(x, z, 0.3)) { const h = ctx.physics.groundHeight(x, z, 2.0, false); return Number.isFinite(h) ? h + 0.12 : y; }
    const h = ctx.physics.groundHeight(x, z, 2.0, false);
    return Number.isFinite(h) && h > 0.06 && h > y - 0.05 ? h + 0.02 : y;
  };
  // every street-level node gets its own height once (the sim interpolates along the route, so people climb the crown smoothly)
  if (!FINAL) for (let i = 0; i < N.x.length; i++) { const k = N.k[i]; if (k === 's' || k === 'a' || k === 'p' || k === 'c' || k === 'e' || k === 'b' || k === 'k') N.y[i] = nav.surfaceY(N.x[i], N.z[i], N.y[i]); }
  // the bake: the static graph with its final heights, the component labels of the bake point and the chains above (`final`: nav hydrates past this point; an older bake without it takes the long way)
  if (ctx.recordBake) ctx.recordBake(`nav-${ctx.quality.level || ctx.quality.name}`, {
    N: { x: new Float64Array(N.x), z: new Float64Array(N.z), y: new Float64Array(N.y), k: N.k, g: new Float64Array(N.g) },
    edges: Object.fromEntries(['a', 'b', 'len', 'kind', 'cid', 'cost'].map(key => [key, E.columns[key].slice(0, E.length)])),
    cws, groupId, nSidewalk, nPolyEnd, latList: new Uint32Array(latList), final: 1,
    comp: Int32Array.from(comp), compSize: Float64Array.from(compSize), nComp, main, bridgeNodes: Uint32Array.from(nav.bridge.nodes), longK: Uint32Array.from(nav.longK),
    stats: { longDecks: nav.stats.longDecks, crossings: nav.stats.crossings },
    // the kerb-side test of the bridging crossings (below: covAt >= -3.5 for the pavement / lattice nodes) is a static property of the node
    kerbCov: (() => { const n = Math.min(N.x.length, nPolyEnd + latList.length + 1), a = new Uint8Array(n); for (let i = 0; i < n; i++) { const k = N.k[i]; if ((k === 'a' || k === 's') && covAt(N.x[i], N.z[i]) >= -3.5) a[i] = 1; } return a; })(),
  });

  mark('bridge');
  // ------------------------------------------------------------------ entrances: city doors (a zone-weighted sample), metro doors, the station doors
  nav.entrances = [];
  const addDoor = (e, kind, extra = {}) => {
    const fx = Math.sin(e.rotY), fz = Math.cos(e.rotY);
    let node = -1, ax = 0, az = 0;
    const rx = Math.cos(e.rotY), rz = -Math.sin(e.rotY);
    for (const off of [0, 1.2, -1.2, 2.4, -2.4]) { for (const d of [1.3, 2.0, 2.8, 3.6, 4.6]) { ax = e.x + fx * d + rx * off; az = e.z + fz * d + rz * off; if (walkable(ax, az)) { node = attach(ax, az, PAVE, 'e', 16, 0.3); if (node >= 0) break; } } if (node >= 0) break; }
    if (node >= 0) nav.entrances.push({ x: e.x, z: e.z, rotY: e.rotY, bldg: e.bldg, kind, node, ax, az, w: zoneW(e.x, e.z), visibleOK: kind !== 'door', ...extra });
    return node >= 0;
  };
  {
    const all = ((svc.city && svc.city.entrances) || []).filter((e) => inPlay(e.x, e.z, -4) && zoneW(e.x, e.z) > 0.3);
    let kept = 0;
    for (let i = 0; i < all.length && kept < 520; i++) { const e = all[i]; if (hash01(i * 31 + 7) > Math.min(1, 520 / Math.max(1, all.length) * 1.3)) continue; if (addDoor(e, 'door')) kept++; }
  }
  for (const e of (svc.metro && svc.metro.entrances) || []) addDoor({ x: e.x, z: e.z, rotY: e.rotY, bldg: e.id }, 'metro', { metro: e, group: 'metro-' + e.station });
  nav.metroDoors = nav.entrances.filter((e) => e.kind === 'metro');
  nav.doorGroups = {}; for (const e of nav.entrances) if (e.group) (nav.doorGroups[e.group] ||= []).push(e);
  nav.stats.entrances = nav.entrances.length; nav.stats.metroDoors = nav.metroDoors.map((e) => e.metro.id).join(','); nav.stats.passages = nav.passages.map((q) => q.name + ':' + Math.round(hyp(q.bx - q.ax, q.bz - q.az)) + 'm').join(','); nav.stats.keepOuts = nav.keepOuts;

  mark('entrances');
  // ------------------------------------------------------------------ benches (landmarks.benches + props.benches + rail platform benches): seats and an access node in front
  nav.benches = [];
  nav.addBench = (b, nodeKind = 'b') => {
    if (!inPlay(b.x, b.z)) return null;
    const fx = Math.sin(b.rotY), fz = Math.cos(b.rotY), rx = Math.cos(b.rotY), rz = -Math.sin(b.rotY), len = b.len || 1.8, n = Math.max(1, Math.floor(len / 0.8));
    const seats = []; for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * (len / n); seats.push({ x: b.x + rx * o - fx * 0.06, z: b.z + rz * o - fz * 0.06, taken: -1 }); }
    let node = -1, ax = 0, az = 0;
    for (const d of [0.95, 1.3, 1.8]) { ax = b.x + fx * d; az = b.z + fz * d; node = b.node != null ? b.node : attach(ax, az, b.y ?? PAVE, nodeKind, 12, 0.3); if (node >= 0) break; }
    if (node < 0) return null;
    const onPave = nav.nearestNode(b.x, b.z, 3.4, (id) => N.k[id] === 's' || N.k[id] === 'a') >= 0;
    const rec = { x: b.x, z: b.z, rotY: b.rotY, len, seats, node, ax, az, y: b.y ?? (onPave ? PAVE : 0), w: b.w ?? zoneW(b.x, b.z), where: b.where || 'street' };
    nav.benches.push(rec); return rec;
  };
  /** the bench records whose centre lies within r metres of (x, z): a knocked bench (core/knock.js) takes its seats with it (people.js subscribes, sim.knockBench) */
  nav.benchesNear = (x, z, r = 0.6) => nav.benches.filter((b) => Math.hypot(b.x - x, b.z - z) <= r);
  for (const b of [...(lm.benches || []), ...((svc.props && svc.props.benches) || [])]) nav.addBench(b);
  // the benches of the castle square (landmarksCastle: positions only, they face the nearest footway / pavement): a bench that props already registered is not added twice
  try {
    let nc = 0; const dup = (b) => nav.benches.some((q) => Math.abs(q.x - b.x) < 0.7 && Math.abs(q.z - b.z) < 0.7);
    for (const b of (marsOff ? [] : (svc.landmarksCastle && svc.landmarksCastle.benches) || [])) {
      if (dup(b)) continue; let tx = 0, tz = 1, bd = 12;
      for (let i = 0; i < N.x.length; i++) { const k = N.k[i]; if (k !== 's' && k !== 'p') continue; const d = hyp(N.x[i] - b.x, N.z[i] - b.z); if (d > 1.2 && d < bd) { bd = d; tx = N.x[i] - b.x; tz = N.z[i] - b.z; } }
      if (nav.addBench({ x: b.x, z: b.z, rotY: b.rotY ?? Math.atan2(tx, tz), len: b.len || 1.7, where: 'castle' })) nc++;
    }
    nav.stats.castleBenches = nc;
  } catch (e) { console.error('[people] castle benches failed:', e); }
  // the benches that landmarksF draws itself (Kazan garden: benchPoints, Voronikhin square: vorBenches) are in nobody's bench list (props skips the OSM nodes there): the garden benches face the fountain
  // within 26 m of it, otherwise the garden axis (garden.js: model-frame rotation + the cathedral frame ROT = -16.8 deg about C0 = (-1472.4, -269.7))
  try {
    const F = svc.landmarksF; let nk = 0;
    if (F) {
      const KC = { x: -1472.4, z: -269.7 }, KR = -16.8 * Math.PI / 180, kc = Math.cos(KR), ks = Math.sin(KR), seen = new Set();
      const kmdl = (x, z) => { const dx = x - KC.x, dz = z - KC.z; return { mx: dx * kc - dz * ks, mz: dx * ks + dz * kc }; };
      const fo = FOUNTAINS.find((q) => q.id === 'w101292107'), mf = fo ? kmdl(fo.x, fo.z) : kmdl(-1469, -279);
      for (const b of F.vorBenches || []) { seen.add(Math.round(b.x * 4) + ',' + Math.round(b.z * 4)); if (nav.addBench({ x: b.x, z: b.z, rotY: b.rotY, len: b.len || 1.7 })) nk++; }
      for (const b of F.benchPoints || []) {
        const key = Math.round(b.x * 4) + ',' + Math.round(b.z * 4); if (seen.has(key)) continue; seen.add(key);
        const m = kmdl(b.x, b.z), dx = mf.mx - m.mx, dz = mf.mz - m.mz, near = hyp(dx, dz) < 26;
        const rot = (near ? Math.atan2(dx, dz) : (m.mx < 0 ? Math.PI / 2 : -Math.PI / 2)) + KR;
        if (nav.addBench({ x: b.x, z: b.z, rotY: rot, len: 1.6 })) nk++;
      }
    }
    nav.stats.kazanBenches = nk;
  } catch (e) { console.error('[people] Kazan benches failed:', e); }

  mark('benches');
  // ------------------------------------------------------------------ bus stops: waiting places behind the kerb (rotY faces the road)
  nav.stops = [];
  for (const s of (st && st.busStops) || []) {
    if (!inPlay(s.x, s.z, -6)) continue;
    const fx = Math.sin(s.rotY), fz = Math.cos(s.rotY), rx = Math.cos(s.rotY), rz = -Math.sin(s.rotY);
    const spots = []; for (const [d, o] of [[-1.6, -0.6], [-1.6, 0.6], [-2.4, 0], [-1.0, 1.4], [-1.0, -1.4], [-2.8, 1.2], [-2.8, -1.2]]) { const x = s.x + fx * d + rx * o, z = s.z + fz * d + rz * o; if (walkable(x, z) && (!L.insideBuilding(x, z, 0) || inPassage(x, z))) spots.push({ x, z, taken: -1 }); }
    if (!spots.length) continue;
    const node = attach(spots[0].x, spots[0].z, PAVE, 'b', 14, 0.3); if (node < 0) continue;
    nav.stops.push({ x: s.x, z: s.z, rotY: s.rotY, name: s.name, shelter: !!s.shelter, spots, node, w: zoneW(s.x, s.z) });
  }
  nav.stats.stops = nav.stops.length;

  mark('stops');
  // ------------------------------------------------------------------ open-space spots: photograph the monuments / sights (photoSpots, monuments, the Klodt groups)
  nav.spots = [];
  const addSpot = (type, x, z, yaw, extra = {}) => { if (!walkable(x, z) || nav.obstDist(x, z, 1) < 0.5) return false; const node = attach(x, z, PAVE, 'b', 16, 0.3); if (node < 0) return false; nav.spots.push({ type, x, z, yaw, node, taken: -1, w: zoneW(x, z), ...extra }); return true; };
  nav.addSpot = addSpot;
  for (const m of lm.monuments || []) {
    if (m.id === 'peter-bust') continue;                                  // inside the hall: station.js
    const klodt = String(m.id).startsWith('klodt'), obelisk = m.id === 'w1214651508';
    const radii = klodt ? [4.5, 6.5, 9, 12] : obelisk ? [9, 13, 17] : [3, 4.5, 6];
    for (const r of radii) for (let k = 0; k < (klodt ? 8 : 10); k++) {
      const a = (k / (klodt ? 8 : 10)) * Math.PI * 2 + r * 0.7, x = m.x + Math.sin(a) * r, z = m.z + Math.cos(a) * r;
      addSpot(klodt ? 'plinth' : obelisk ? 'obelisk' : 'monument', x, z, Math.atan2(m.x - x, m.z - z), { tx: m.x, tz: m.z, th: m.h || 6, id: m.id });
    }
  }
  for (const p of lm.photoSpots || []) {
    if (p.interior) continue;
    for (const [dx, dz] of [[0, 0], [2.4, 0.8], [-2.2, 1.4], [0.6, -2.3]]) {
      const yaw = (p.yaw || 0) * Math.PI / 180 + Math.PI;                    // layout yaw (0 north, 90 west) -> rotY of a person looking that way (rotY = PI + yaw)
      addSpot('view', p.x + dx, p.z + dz, yaw, { name: p.name, clock: !!p.clock });
    }
  }
  nav.stats.spots = nav.spots.length;

  mark('spots');
  // ------------------------------------------------------------------ the station: hall, forecourt, gates, apron, platforms (station.js)
  nav.station = null;
  try { nav.station = addStation(ctx, nav, { api, FR, gridAdd, gridNode, attach, near, comp, mainOK, main, onAsphalt, walkable, inBuilding, rawInBuilding, edgeOK, segFree, interiors, addDoor, hash01 }); }
  catch (e) { console.error('[people] station graph failed:', e); }

  mark('station');
  // ------------------------------------------------------------------ bridging crossings: people cross a street wherever two big pavement components face each other across a carriageway
  // (<= 32 m, the wide ones are checked at 3 points by the simulation); each link gets a synthetic zebra record (corridor = the segment itself, state 'free': they wait for a gap in the traffic)
  {
    compOf();
    const big = (i) => compSize[comp[i]] >= BIGN, some = (i) => compSize[comp[i]] >= 24, cand = [];
    // only the kerb-side nodes (the first row of pavement next to a carriageway) can start a street crossing: a small grid of those (the lattice has ~800 nodes within 32 m of any node)
    // (FINAL bake: the asphalt-nearness flag of these static nodes comes from the bake, kerbCov; the loop asks the cover only for nodes the bake does not know)
    const KC = cached && cached.kerbCov ? cached.kerbCov : null, nKerb = nPolyEnd + latList.length + 1;
    const kerbOK = (i) => (KC && i < KC.length ? KC[i] === 1 : covAt(N.x[i], N.z[i]) >= -3.5);
    const kerb = [], KG = new Map(); for (let i = 0; i < nKerb; i++) { const ki = N.k[i]; if ((ki !== 'a' && ki !== 's') || !some(i) || !kerbOK(i)) continue; kerb.push(i); const kk = cellKey(Math.floor(N.x[i] / 32), Math.floor(N.z[i] / 32)); let a = KG.get(kk); if (!a) KG.set(kk, (a = [])); a.push(i); }
    for (const i of kerb) {
      for (let cx = Math.floor((N.x[i] - 32) / 32); cx <= Math.floor((N.x[i] + 32) / 32); cx++) for (let cz = Math.floor((N.z[i] - 32) / 32); cz <= Math.floor((N.z[i] + 32) / 32); cz++) { const a = KG.get(cellKey(cx, cz)); if (!a) continue; for (const j of a) { if (j <= i || comp[j] === comp[i]) continue; const d = hyp(N.x[j] - N.x[i], N.z[j] - N.z[i]); if (d > 32 || d < 4 || (!big(i) && !big(j))) continue; cand.push([i, j, d]); } }
    }
    cand.sort((p, q) => p[2] - q[2]);
    const kept = new Map(); let nb = 0;
    for (const [i, j, d] of cand) {
      const key = Math.min(comp[i], comp[j]) + '_' + Math.max(comp[i], comp[j]), mx = (N.x[i] + N.x[j]) / 2, mz = (N.z[i] + N.z[j]) / 2;
      let lst = kept.get(key); if (!lst) kept.set(key, (lst = [])); if (lst.length >= 8 || lst.some((p) => hyp(p[0] - mx, p[1] - mz) < 28)) continue;
      // a straight street crossing: asphalt in the middle, nothing solid
      let ok = !nav.segBlocked(N.x[i], N.z[i], N.x[j], N.z[j]), onA = 0; const n = Math.ceil(d);
      for (let q = 0; q <= n && ok; q++) { const x = N.x[i] + (N.x[j] - N.x[i]) * q / n, z = N.z[i] + (N.z[j] - N.z[i]) * q / n; if (inBuilding(x, z) || blockedPoly(x, z) || (water(x, z) && !onDeck(x, z, 0.3)) || pitAt(x, z)) ok = false; else if (covAt(x, z) > -0.1) onA++; }
      if (!ok || onA < 2) continue;
      const len = d, id = 'B' + nb++;
      cws.push({ i: cws.length, id, ids: [id], ax: N.x[i], az: N.z[i], bx: N.x[j], bz: N.z[j], len, ux: (N.x[j] - N.x[i]) / len, uz: (N.z[j] - N.z[i]) / len, x: mx, z: mz, w: 4.4, signalised: false, signal: null, road: null, virtual: true, na: i, nb: j, edge: -1, ea: 0, eb: 0 });
      const c = cws[cws.length - 1]; c.edge = addEdge(i, j, 1, c.i, 12, 1.0); nav.crossIndexById.set(id, c.i); lst.push([mx, mz]);
    }
    nav.stats.bridgingCrossings = nb;
  }
  mark('bridging');
  compOf();
  main = 0; for (let i = 1; i < nComp; i++) if (compSize[i] > compSize[main]) main = i;
  const nn = nN();
  const gS = new Float32Array(nn + 64), fromE = new Int32Array(nn + 64), stamp = new Int32Array(nn + 64); let curStamp = 0;
  let heapN = [], heapF = [];
  const hpush = (n, f) => { let i = heapN.length; heapN.push(n); heapF.push(f); while (i > 0) { const p = (i - 1) >> 1; if (heapF[p] <= f) break; heapN[i] = heapN[p]; heapF[i] = heapF[p]; i = p; } heapN[i] = n; heapF[i] = f; };
  const hpop = () => { const n0 = heapN[0], n = heapN.pop(), f = heapF.pop(); const sz = heapN.length; if (sz) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= sz) break; if (c + 1 < sz && heapF[c + 1] < heapF[c]) c++; if (heapF[c] >= f) break; heapN[i] = heapN[c]; heapF[i] = heapF[c]; i = c; } heapN[i] = n; heapF[i] = f; } return n0; };
  /** shortest route (node ids) from a to b; opts.noCross forbids zebra edges; returns null when unreachable */
  const HW = 1.18;                                                                 // heuristic weight (the lattice edges cost 1.0-1.22 per metre): slightly greedy A*, ~3x fewer expansions
  adj.rebuild();
  nav.route = (a, b, opts = {}) => {
    nav.lastPops = 0; if (a < 0 || b < 0) return null; if (a === b) return [a];
    if (comp[a] !== comp[b]) return null;                                         // different components: no route (and no exhaustive search)
    if (adj.dirty) adj.rebuild();
    const offsets = adj.offsets, indices = adj.values, ec = E.columns;
    curStamp++; heapN.length = 0; heapF.length = 0; gS[a] = 0; stamp[a] = curStamp; fromE[a] = -1; hpush(a, 0);
    const bx = N.x[b], bz = N.z[b], maxPops = opts.maxPops || 60000; let guard = 0;          // (opts.maxPops: a smaller expansion cap, people/sim.js far routes; default the old 60 000)
    while (heapN.length && guard++ < maxPops) {
      const u = hpop(); if (u === b) break;
      const gu = gS[u];
      for (let at = offsets[u]; at < offsets[u + 1]; at++) {
        const ei = indices[at]; if (opts.noCross && ec.kind[ei] === 1) continue;
        const v = ec.a[ei] === u ? ec.b[ei] : ec.a[ei], g = gu + ec.cost[ei] + (opts.noise ? opts.noise(ei) : 0);
        if (stamp[v] !== curStamp || g < gS[v]) { gS[v] = g; stamp[v] = curStamp; fromE[v] = ei; hpush(v, g + HW * hyp(N.x[v] - bx, N.z[v] - bz)); }
      }
    }
    nav.lastPops = guard;
    if (stamp[b] !== curStamp) return null;
    const out = []; let v = b; while (v !== a) { out.push(v); const ei = fromE[v]; v = ec.a[ei] === v ? ec.b[ei] : ec.a[ei]; } out.push(a); out.reverse(); return out;
  };
  /** the edge between two adjacent nodes (or null) */
  // (2026-10-15, plan item 3) the same answer read from the CSR columns: no adjacency subarray, no edge snapshot per neighbour (makeRoute asks once per route segment); ?pedge=0 = the old scan
  const edgeBetweenOld = (a, b) => { for (const ei of adj[a]) { const e = E[ei]; if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) return e; } return null; };
  nav.fastEdge = !(typeof location !== 'undefined' && new URLSearchParams(location.search).get('pedge') === '0');
  nav.edgeBetween = (a, b) => {
    if (!nav.fastEdge || !Number.isInteger(a) || a < 0 || a >= adj.length) return edgeBetweenOld(a, b);
    const off = adj.offsets, vals = adj.values, ec = E.columns, from = off[a] || 0, to = off[a + 1] || from;
    for (let at = from; at < to; at++) { const ei = vals[at], ea = ec.a[ei], eb = ec.b[ei]; if ((ea === a && eb === b) || (ea === b && eb === a)) return E[ei]; }
    const extra = adj.extra.get(a); if (extra) for (const ei of extra) { const ea = ec.a[ei], eb = ec.b[ei]; if ((ea === a && eb === b) || (ea === b && eb === a)) return E[ei]; }
    return null;
  };

  Object.assign(nav, { N, E, adj, comp, main, nComp, compSize, mainOK: (id) => compSize[comp[id]] >= BIGN, edgeOK, segFree, addNode, addEdge, gridAdd, api });
  mark('final');
  nav.stats.nodes = N.x.length; nav.stats.edges = E.length; nav.stats.components = nComp; nav.stats.mainSize = compSize[main]; nav.stats.obstacles = obst.length;
  nav.hash01 = hash01;
  void AREAS;
  return nav;
}
