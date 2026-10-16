// archetypes.js - which kind of Petersburg building is each OSM record? (levels / kind / era / street / footprint shape -> facade archetype, storey table, colour)
//
// The 14 archetypes of docs/research/architecture.md section B map onto the wall shader's ARCH ids (wallmat.js):
//   A1 CLASSIC (Empire house with a gate, 3-4 storeys)   A2 ECLECTIC (the default neo-renaissance rent house, 4-5 storeys)   A3 BRICK style   A4 TENEMENT with erkers (rich stucco)
//   A5 NOUVEAU (northern Art Nouveau, irregular windows)  A6 NEOCLASS (giant order)   A7 STALIN infill   A8 PANEL / 1960-80 infill   A9 MODERN glass-and-render infill
//   A10 MANSION (2-3 storeys, rusticated corners)         A11 COURT (courtyard wings)   A12 SERVICE (transformer houses, garages, kiosks)   A13 corner turret (a modifier)
// Petrograd side / Vasilievsky Island (regions P1..P5, V1, V2; district.js): two more archetypes, NORDIC (Northern Modern tenement) and NEOCLASSIC1910 (neoclassical revival), and a
// district-aware default: a house of the new regions without a research record takes its archetype / colours / features from the mix of its zone, never from the Nevsky mix.
// The older regions are not touched by any of it (`dist` is null there and every expression below reduces to the old one).
// Heights are NEVER invented here: L.heightOf(b) is the cornice height (era tables of layout.js); this module only distributes it over the storeys
// (plinth 1.0 + ground 1.25 u + piano nobile 1.2 u + upper floors u) and picks the look. Colours: research/architecture.md D + nevsky.md palette, applied with a
// neighbour-aware pass (two houses that share a wall never get the same colour) in assignColours().
import * as THREE from 'three';
import { ringFromFlat, polyArea, hash01 } from '../lib/massing.js';
import * as L from '../layout.js';
import { ARCH } from './wallmat.js';
import { knownFor } from './known.js';
import { heightFor } from './heights.js';
import { restoreExempt } from './exempt.js';
import { districtOf, zoneOf, isVoFresh, voZoneOf, districtArch, districtPalette, isStoneGrey, isPlainKind, isPavilion, isWorksBlock, canopyTop, INSTITUTION_NAME, INDUSTRIAL_KINDS, PUBLIC_KINDS as DISTRICT_PUBLIC } from './district.js';

const C = (h) => new THREE.Color(h);
export const pickW = (h, list) => { let t = 0; for (const [, w] of list) t += w; let x = h * t; for (const [v, w] of list) { if ((x -= w) < 0) return v; } return list[list.length - 1][0]; };

/** Facade fields (sRGB hex) with weights: architecture.md D, nevsky.md palette. Trim is always warm white (the shader derives it). */
export const PALETTE = {
  plaster: [['#dcb25e', 20], ['#e6d28f', 15], ['#c8693f', 11], ['#dca08f', 9], ['#e29d58', 6], ['#d6c29a', 10], ['#c7bf7a', 5], ['#a9b8a1', 5], ['#9fb4c2', 3], ['#e3e0d6', 5], ['#7d756c', 4], ['#b8dcc3', 2], ['#e9b896', 4], ['#c98f7e', 3], ['#b7ada8', 2]],
  nevsky: [['#e0b25c', 16], ['#ecdca0', 16], ['#d4704a', 9], ['#e2a898', 11], ['#e6a35e', 8], ['#d9c8a0', 8], ['#c9c7a8', 4], ['#b8dcc3', 5], ['#9fb9c8', 3], ['#ece8dc', 8], ['#e5806c', 6], ['#e9b896', 6]],
  brick: [['#c99b43', 34], ['#a1503f', 30], ['#8e4a3a', 18], ['#b9876a', 18]],
  stalin: [['#dcc9a2', 28], ['#e6d7b0', 22], ['#d2a998', 12], ['#cfcabd', 14], ['#e0c27a', 12], ['#c5bba6', 12]],
  panel: [['#d8d4c8', 26], ['#e6d8ae', 20], ['#e0c4b8', 14], ['#c6d0c0', 10], ['#e2e2dc', 18], ['#c9b8a0', 12]],
  nouveau: [['#e6e3da', 24], ['#c6c3b8', 16], ['#ecdca0', 14], ['#cba596', 14], ['#b9d0b6', 10], ['#a9b5c2', 8], ['#d9a98a', 14]],
  neoclass: [['#6e675f', 24], ['#cdbfa0', 30], ['#d6c29a', 20], ['#e2d9c4', 26]],
  court: [['#d4b66a', 34], ['#dccf98', 20], ['#c9a96e', 18], ['#d8c9a2', 18], ['#bfae8a', 10]],
  modern: [['#d9cdb4', 28], ['#e6e0d2', 24], ['#c8c0b0', 20], ['#d4b9a2', 12], ['#b9b8b2', 16]],
  service: [['#9a5a46', 30], ['#8d8a82', 28], ['#b7ab96', 20], ['#6e7b70', 12], ['#a39b8c', 10]],
};
const NEVSKY_RE = /Невск/, MAIN_RE = /Лиговск|Владимирск|Литейн|Марата|Маяковского|Пушкинск|Загородн|Суворовск|Фонтанк|Восстания|Гончарн|Рубинштейна|Большая Московская|Морская|Гороховая|Садовая|Итальянск|Михайловск|Думск|Конюшенн/;

const _roadCache = new Map();
/** street class of a point: 0 Nevsky, 1 main street, 2 side street / courtyard; also the nearest named road. */
export function streetClass(x, z, maxDist = 40) {
  const k = Math.round(x / 6) + ',' + Math.round(z / 6);
  let r = _roadCache.get(k);
  if (r !== undefined) return r;
  const n = L.nearestRoad(x, z, { drivable: true, named: true, maxDist });
  const name = n ? n.road.name || '' : '';
  r = { sc: !n ? 3 : NEVSKY_RE.test(name) ? 0 : MAIN_RE.test(name) ? 1 : 2, name, gap: n ? n.gap : 99, w: n ? n.w : 0 };
  _roadCache.set(k, r);
  return r;
}

/** minimum-area oriented box of a footprint: { w (long), d (short), ang, cx, cz, ux, uz, fill, nv } */
export function obb(poly) {
  const r = ringFromFlat(poly.o); let best = null;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const p of r) { const u = (p[0] - a[0]) * ux + (p[1] - a[1]) * uz, v = -(p[0] - a[0]) * uz + (p[1] - a[1]) * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const A = (u1 - u0) * (v1 - v0);
    if (!best || A < best.A) { const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2; best = { A, w: u1 - u0, d: v1 - v0, ux, uz, cx: a[0] + ux * mu - uz * mv, cz: a[1] + uz * mu + ux * mv }; }
  }
  if (best.d > best.w) { const t = best.w; best.w = best.d; best.d = t; const ux = best.ux; best.ux = -best.uz; best.uz = ux; }
  best.ang = Math.atan2(best.uz, best.ux);
  best.fill = Math.abs(polyArea(poly)) / Math.max(1, best.A);
  best.nv = r.length;
  return best;
}

/** Houses the research photographs and describes (nevsky.md section 10, architecture.md): arch / colour / storeys / extras. hex = facade field colour (sRGB). */
export const KNOWN = {
  w60198689: { arch: ARCH.NEOCLASS, hex: '#d8d3c4', floors: 5 },                                   // Nevsky 68 Lopatin 'Literary house': cream-grey, Corinthian loggia
  w60198695: { arch: ARCH.ECLECTIC, hex: '#e4dcc0', floors: 6, H: 23.5 },                            // 74-76 corner
  w60196038: { arch: ARCH.TENEMENT, hex: '#e2c882', floors: 5, erkers: false },                      // 78 Tupikov: pale / ochre, balconies
  w60196036: { arch: ARCH.ECLECTIC, hex: '#e0d4a0', floors: 6, H: 23.5 },                            // 80 Dernov
  w98396423: { arch: ARCH.CLASSIC, hex: '#e6d28f', floors: 4 },                                       // 88
  w60195641: { arch: ARCH.ECLECTIC, hex: '#e8c8b0', floors: 4 },                                      // 98 Lopatin
  w60195636: { arch: ARCH.ECLECTIC, hex: '#c9c7a8', floors: 5, H: 23, rich: true, gfTint: 0 },        // 100 Lopatin income house + cinema: greenish olive-grey, white arch frames
  w60195643: { arch: ARCH.ECLECTIC, hex: '#e0c098', floors: 5 },                                      // 102
  w60195639: { arch: ARCH.ECLECTIC, hex: '#e0a850', floors: 4, gfTint: 3 },                          // 104 'Teatr Sever' house: ochre-yellow
  w60195635: { arch: ARCH.ECLECTIC, hex: '#d9985a', floors: 4, rich: true, gfTint: 3, wear: 0 },     // 108 Ivanov: orange-ochre, white window frames, frieze, gateway (Nevsky 108 photo)
  w60195647: { arch: ARCH.CLASSIC, hex: '#e6d28f', floors: 4 },                                       // 110
  w60195648: { arch: ARCH.ECLECTIC, hex: '#d6c29a', floors: 4 },                                      // 112
  w52267621: { arch: ARCH.TENEMENT, hex: '#c4755a', floors: 5, rich: true },                         // 47 Palkin house: terracotta
  w113591143: { arch: ARCH.ECLECTIC, hex: '#dca08f', floors: 5 },                                     // 45 Rostovtsev: dusty pink
  w52016434: { arch: ARCH.ECLECTIC, hex: '#b7ada8', floors: 4 },                                      // 61: grey-lilac
  w245953204: { arch: ARCH.TENEMENT, hex: '#e6e3a3', floors: 5, erkers: true },                      // 55 Nevsky Plaza: pale yellow, bay windows
  w453040626: { arch: ARCH.TENEMENT, hex: '#dcc09a', floors: 5, erkers: true },                      // 77 Maltsev baths: sand-beige, heavy rustication, corner bay
  w51729688: { arch: ARCH.CLASSIC, hex: '#e9d9b0', floors: 4 },                                       // 53
  r3323319: { arch: ARCH.ECLECTIC, hex: '#d9b25a', floors: 4 },                                       // 51 Dom Kozhevnikova (dull rose in the photos; kept ochre until landmarksB owns it)
  w96331715: { arch: ARCH.ECLECTIC, hex: '#d7b366', floors: 5, rich: true },                         // Vosstaniya 1 / Ligovsky 39 Znamenskaya house: ochre
  w96331378: { arch: ARCH.ECLECTIC, hex: '#d7b366', floors: 4, rich: true },
  w113471377: { arch: ARCH.ECLECTIC, hex: '#e5c0a6', floors: 4, rich: true },                         // 92 Menyaev house: dusty pink, cream trim
};
const SERVICE_KINDS = new Set(['service', 'garage', 'garages', 'kiosk', 'garbage_shed', 'elevator', 'shed', 'roof', 'transportation', 'pavilion']);
const PUBLIC_KINDS = new Set(['school', 'kindergarten', 'hospital', 'university', 'civic', 'government', 'public', 'sports_centre', 'dormitory']);
const CHURCH_KINDS = new Set(['church', 'cathedral', 'chapel', 'basilica']);

/** Cornice-height distribution over the storeys: plinth 1.0, ground 1.25 u (1.35 on Nevsky), piano nobile 1.2 u, upper floors u. Returns { plinth, G, PN, UF, floors }. */
export function storeyTable(H, floors, arch, sc) {
  const plinth = 1.0, total = Math.max(2.5, H - plinth);
  const wG = arch === ARCH.NORDIC ? 1.15 : arch === ARCH.NEOCLASSIC1910 ? 1.2 : arch === ARCH.PANEL ? 1.15 : arch === ARCH.COURT ? 1.0 : (arch === ARCH.STALIN || arch === ARCH.MODERN) ? 1.3 : sc === 0 ? 1.35 : 1.25;
  const wPN = arch === ARCH.NORDIC ? 1.0 : arch === ARCH.NEOCLASSIC1910 ? 1.1 : (arch === ARCH.PANEL || arch === ARCH.COURT) ? 1.0 : arch === ARCH.STALIN ? 1.05 : 1.2;
  if (floors <= 1) return { plinth, G: total, PN: 0, UF: 0, floors: 1 };
  if (floors === 2) { const u = total / (wG + wPN); return { plinth, G: wG * u, PN: wPN * u, UF: 0, floors: 2 }; }
  const u = total / (wG + wPN + (floors - 2));
  return { plinth, G: wG * u, PN: wPN * u, UF: u, floors };
}

/** Per-record classification. Returns the style used by walls.js / roofs.js / details. */
export function describe(b) {
  const poly = b.polys[0], ob = obb(poly), area = Math.abs(b.area || polyArea(poly));
  const dist = districtOf(b);                                           // 'petro' | 'vasil' for the new regions, null everywhere else
  const hid = dist ? (b.parent || b._fillOf || b.id) : b.id;            // district houses: every part hashes like its outline
  const h = hash01(hid), h2 = hash01(hid + 'a'), h3 = hash01(hid + 'b'), h4 = hash01(hid + 'c'), h5 = hash01(hid + 'd');
  const kind = b.kind || 'yes', x = b.cx, z = b.cz;
  const sInfo = streetClass(x, z, 45);
  const fresh = dist === 'vasil' && isVoFresh(b);                       // a record of the island rectangles V3..V12: the island grammar (district.js voZoneOf / VO_MIX / palette 'vo'); V1, V2 and the Petrograd side keep theirs
  const zone = dist ? (fresh ? voZoneOf(x, z, sInfo.name || (b.addr && b.addr.street) || '') : zoneOf(dist, x, z, sInfo.name)) : null;
  const sc = !dist ? sInfo.sc : (zone === 'kam' || zone === 'bolshoy' || zone === 'avenue' || zone === 'quay' || zone === 'vavenue' || zone === 'vbolshoy' || zone === 'vsredny' || zone === 'vmaly' || zone === 'vquay') ? 1 : sInfo.sc === 3 ? 3 : 2;
  const H = heightFor(b);
  const holes = b.polys.some((p) => p.h && p.h.length);
  const era = L.eraOf(b);
  const dSq = Math.hypot(x - L.SQUARE.x, z - L.SQUARE.z);
  const lv = b.levels || 0;
  const st = { id: b.id, ob, area, seed: h, h, h2, h3, h4, h5, sc, street: sInfo.name, kind, holes, H, era, dSq, tallLevels: lv };
  const floors = lv ? Math.max(1, Math.min(10, Math.round(lv))) : Math.max(1, Math.min(9, Math.round((H - 1.0) / 3.9)));
  let arch;
  const small = area < 160 && floors <= 2;
  if (SERVICE_KINDS.has(kind) || area < 60 || (small && b.part === 0 && kind !== 'apartments' && kind !== 'yes' && kind !== 'commercial')) arch = ARCH.SERVICE;
  else if (small && sc >= 2) arch = ARCH.COURT;
  else if (dist && isPavilion(b)) arch = area < 200 ? ARCH.SERVICE : ARCH.COURT;          // zoo houses, park cafes, moored boats: a plain pavilion (heights.js: 5-8 m)
  else if (era === 'modern') arch = ARCH.MODERN;
  else if (era === 'panel') arch = ARCH.PANEL;
  else if (era === 'stalin') arch = ARCH.STALIN;
  else if (CHURCH_KINDS.has(kind)) arch = ARCH.CLASSIC;
  else if (dist) arch = districtArch({ district: dist, zone, floors, kind, area, hid, x: b.cx, z: b.cz, fresh, name: b.name, material: b.material ? String(b.material).toLowerCase() : '', h: h2, year: parseInt(b.startDate, 10) || 0, tag: String((b.tags && b.tags['building:architecture']) || '').toLowerCase() });
  else if (PUBLIC_KINDS.has(kind)) arch = h < 0.5 ? ARCH.STALIN : ARCH.ECLECTIC;
  else if (kind === 'hotel' || kind === 'office' || kind === 'commercial' || kind === 'retail') arch = floors <= 3 ? ARCH.ECLECTIC : (h < 0.35 ? ARCH.MODERN : h < 0.7 ? ARCH.ECLECTIC : ARCH.NOUVEAU);
  else {
    // residential / unknown: the research distribution (Nevsky block: 3 x A2, 2 x A4, 1 x A5, 1 x A1, 1 x A7, 1 x A9, 1 x A3 / A6; side street: 3 x A2, 2 x A1, 2 x A4, 1 x A3, 1 x A10, 1 x A8)
    const cand = [];
    const add = (a, w, ok = true) => { if (ok && w > 0) cand.push([a, w]); };
    const nev = sc === 0, main = sc <= 1;
    add(ARCH.ECLECTIC, nev ? 36 : 34, floors >= 3);
    add(ARCH.TENEMENT, nev ? 22 : 18, floors >= 4);
    add(ARCH.NOUVEAU, nev ? 12 : 9, floors >= 4);
    add(ARCH.CLASSIC, nev ? 3.5 : 8, floors <= 4);
    add(ARCH.MANSION, nev ? 2 : 6, floors <= 3);
    const west = x < -595;           // the historical west (Moika, Griboedov, Morskaya, Admiralty quarter): Soviet / modern infill is rare
    add(ARCH.STALIN, (west ? 2.5 : (nev ? 8 : 5) * (dSq < 480 ? 1.8 : 1)), floors >= 4 && (lv >= 5 || !lv));
    add(ARCH.MODERN, west ? 2 : nev ? 5 : 3, floors <= 6);
    add(ARCH.BRICK, nev ? 5 : 8, floors >= 3 && floors <= 6);
    add(ARCH.NEOCLASS, nev ? 5 : 2, floors >= 5);
    add(ARCH.PANEL, west ? 1.2 : main ? 1 : 6, floors <= 9 && !nev);
    add(ARCH.ECLECTIC, 4, floors < 3);
    if (!cand.length) cand.push([ARCH.ECLECTIC, 1]);
    arch = pickW(h2, cand);
  }
  // KNOWN houses: the first-build table above (east of the Fontanka) + the research tables of the west (known.js: archetype, storeys, cornice, colours, trim, roof)
  const k0 = knownFor(b), kl = KNOWN[b.id], kn = k0 || kl ? { ...(kl || {}), ...(k0 || {}) } : null;
  let floors2 = floors, H2 = H;
  if (kn) {
    if (kn.arch !== undefined) arch = kn.arch;
    // raised parts keep their own thickness; a part of a known house keeps its own height when it is clearly another volume (porch, annex); a synthesised base follows the known cornice
    const own = !b._raised && !(b._fill && !b._fillKnown);
    const sameVolume = !b.parent || !lv || !kn.H || Math.abs(L.heightOf(b) - kn.H) < 5.6;
    if (own && sameVolume) {
      if (kn.floors) floors2 = kn.floors;
      H2 = kn.H || (kn.floors && kn.floors !== floors ? ({ 3: 13.5, 4: 17.5, 5: 21, 6: 23.5, 7: 25.5 }[kn.floors] || H) : H);
    }
  }
  // island (docs/research/vo-roster-architecture.md section 2: OSM height / levels of n = 92 five-level Gavan blocks = 3.70 m per level): a Stalinist block is 5 st = 18.5 m, 7 st = 26 m, not the 21 / 28 m of the era table
  if (fresh && !kn && arch === ARCH.STALIN && floors2 >= 5 && floors2 <= 7 && !(b._raised || b._fill)) H2 = Math.round(floors2 * 3.7 * 10) / 10;
  st.fresh = fresh;
  st.arch = arch; st.floors = floors2; st.H = H2; st.known = !!kn; st.knownHex = kn && kn.hex; st.trimClass = kn && kn.trim || 0; st.roofKnown = kn && kn.roofHex; st.shop = kn ? kn.shop : undefined; st.name = kn && kn.name; st.granite = !!(kn && kn.granite); st.turret = kn ? !!kn.turret : undefined; st.custom = kn && kn.custom; st.gate = kn && kn.gate;
  st.tab = storeyTable(H2, floors2, arch, sc);
  // facade character
  st.rich = arch === ARCH.TENEMENT || (arch === ARCH.ECLECTIC && h3 < 0.4) || arch === ARCH.NOUVEAU;
  st.erkers = (arch === ARCH.TENEMENT && h4 < 0.8) || (arch === ARCH.NOUVEAU && h4 < 0.7) || (arch === ARCH.ECLECTIC && floors2 >= 5 && h4 < 0.12);
  if (kn) { if (kn.rich !== undefined) st.rich = kn.rich; if (kn.erkers !== undefined) st.erkers = kn.erkers && (arch === ARCH.TENEMENT || arch === ARCH.NOUVEAU || arch === ARCH.ECLECTIC); }
  st.mansard = (arch === ARCH.ECLECTIC || arch === ARCH.TENEMENT || arch === ARCH.CLASSIC || arch === ARCH.NOUVEAU || arch === ARCH.NEOCLASS) && h5 < (sc === 0 ? 0.20 : 0.16);
  if (kn && kn.mansard !== undefined && !b._raised) { st.mansard = kn.mansard; st.knownMansard = kn.mansard; }
  st.noDeck = !!b.noDeck;
  st.allFronts = !!(kn && kn.allFronts);          // a house that stands free in a yard / garden (KNOWN `yard`): every wall is a front in its own colours, not a courtyard wall
  st.bayTarget = arch === ARCH.CLASSIC ? 2.8 : arch === ARCH.PANEL ? 2.9 : arch === ARCH.MODERN ? 3.4 : arch === ARCH.COURT ? 2.7 : arch === ARCH.STALIN ? 3.2 : arch === ARCH.SERVICE ? 3.4 : arch === ARCH.NOUVEAU ? 3.1 : 2.9 + h4 * 0.3;
  // ground-floor tint: same / dark grey-brown / terracotta / pale
  const gt = h3;
  st.gfTint = arch === ARCH.PANEL || arch === ARCH.MODERN ? 0 : gt < 0.66 ? 0 : gt < 0.80 ? 1 : gt < 0.86 ? 2 : 3;
  if (kn && kn.gfTint !== undefined) st.gfTint = kn.gfTint;
  // wear: Nevsky is clean (restored 2024-26), side streets are worn
  const w = hash01(hid + 'w');
  st.wear = sc === 0 ? (w < 0.36 ? 0 : w < 0.82 ? 1 : w < 0.96 ? 2 : 3) : (w < 0.14 ? 0 : w < 0.5 ? 1 : w < 0.82 ? 2 : 3);
  // restoration: printed canvas net (2 %), a few green nets; only tall street houses
  const rs = hash01(hid + 'r');
  if (kn && kn.wear !== undefined) st.wear = kn.wear;
  st.restore = (floors2 >= 3 && arch !== ARCH.SERVICE && arch !== ARCH.COURT) ? (rs < (sc === 0 ? 0.030 : 0.014) ? 1 : rs < (sc === 0 ? 0.040 : 0.021) ? 2 : 0) : 0;
  // a house that carries a module-drawn plaque / monument on its wall gets no restoration scaffold (hoarding 2.4 m, planks, net would hide it): exempt.js, new regions only
  if (st.restore && dist && restoreExempt(b)) st.restore = 0;
  st.railing = hash01(hid + 'rl') < (sc <= 1 ? 0.5 : 0.32) && floors >= 2 && arch !== ARCH.SERVICE;
  const lm = L.isClaimed(b.id);
  st.claimed = lm;
  if (dist || arch === ARCH.NORDIC || arch === ARCH.NEOCLASSIC1910) districtFeatures(st, b, kn, dist, zone, hid);
  return st;
}

/** Features of the Petrograd-side grammar (bay windows, gables, turrets, socles, majolica, mansards, parapets): from the research record where it says so, else by hash of the outline id. */
function districtFeatures(st, b, kn, dist, zone, hid) {
  const g = (k) => hash01(hid + ':' + k), arch = st.arch, K = kn || {};
  const or = (v, d) => (v !== undefined ? v : d);
  st.dist = dist; st.zone = zone;
  st.fam = dist && (b.parent || b._fillOf) ? (b.parent || b._fillOf) : null;          // parts of one house take one colour (assignColours)
  if (arch === ARCH.NORDIC) {
    st.rich = false;
    st.erkers = or(K.erkers, g('er') < 0.72) && st.floors >= 3;
    st.gable = or(K.gables, g('gb') < 0.58 ? (g('gb2') < 0.35 ? 2 : 1) : 0);            // most gables one street front may carry
    st.gableShape = K.gableShape !== undefined ? K.gableShape : Math.floor(g('gs') * 4) % 4;
    st.majolica = !!or(K.majolica, g('mj') < 0.34);
    // island (roster section 6.4): the granite ground floors of the Northern Modern houses of the three prospects, and a corner bay / turret on 60 % of the corners
    const prospect = st.fresh && (zone === 'vbolshoy' || zone === 'vsredny' || zone === 'vmaly');
    st.socle = !!or(K.socle, g('so') < (prospect ? 0.88 : st.fresh ? 0.66 : 0.55));
    if (K.mansard === undefined && !b._raised) st.mansard = g('ms') < 0.28 && st.floors >= 4;
    st.turret = or(K.turret, g('tur') < (st.fresh ? 0.64 : 0.24)) && st.floors >= 4;
    st.turretTop = K.turretTop || ['helm', 'tent', 'helm', 'spire'][Math.floor(g('tt') * 4) % 4];
    st.bayTarget = 3.0 + g('bt') * 0.35;
    st.gfTint = 0;
    if (st.gable) st.railing = false;                                                    // no iron roof railing in front of a gable
  } else if (arch === ARCH.NEOCLASSIC1910) {
    st.rich = !!or(K.rich, g('ri') < 0.6);
    st.erkers = !!or(K.erkers, g('er') < 0.14) && st.floors >= 4;
    st.parapet = K.parapet !== undefined ? K.parapet : (g('pp') < 0.50 ? 'bal' : g('pp') < 0.74 ? 'attic' : null);
    if (K.mansard === undefined && !b._raised) st.mansard = g('ms') < 0.36 && st.floors >= 4;
    st.columns = !!or(K.columns, g('col') < 0.3);                                        // half-columns instead of flat pilasters
    st.turret = !!or(K.turret, g('tur') < 0.05) && st.floors >= 4;
    st.turretTop = K.turretTop || 'dome';
    st.bayTarget = 3.1 + g('bt') * 0.3;
    if (K.gfTint === undefined) st.gfTint = g('gt') < 0.7 ? 0 : 1;
    if (st.parapet) st.railing = false;
  } else if (dist) {
    if (arch === ARCH.STALIN && K.parapet === undefined) st.parapet = g('pp') < 0.22 ? 'bal' : null; else if (K.parapet !== undefined) st.parapet = K.parapet;
    if (st.parapet) st.railing = false;
    if ((arch === ARCH.TENEMENT || arch === ARCH.ECLECTIC || arch === ARCH.NOUVEAU) && !K.turretTop) st.turretTop = g('tt') < 0.4 ? 'helm' : null;
    if (K.turretTop) st.turretTop = K.turretTop;
    if (INDUSTRIAL_KINDS.has(st.kind) || (!kn && isWorksBlock(zone, st.kind, st.area, st.floors) && (arch === ARCH.BRICK || arch === ARCH.PANEL || arch === ARCH.MODERN))) { st.industrial = true; if (st.shop === undefined) st.shop = false; st.erkers = false; st.mansard = false; st.turret = false; st.railing = false; st.rich = false; st.bayTarget = 4.0; st.gfTint = 0; }
  }
  if (dist && (DISTRICT_PUBLIC.has(st.kind) || CHURCH_KINDS.has(st.kind) || isPlainKind(st.kind) || (b.name && INSTITUTION_NAME.test(b.name))) && st.shop === undefined) st.shop = false;      // no shop fronts on schools, hospitals, institutes
  if (dist && isPlainKind(st.kind) && !kn) { st.erkers = false; st.mansard = false; st.turret = false; st.gable = 0; st.parapet = null; st.rich = false; st.majolica = false; }
  // a one-storey house is all ground floor: the hashed ground-floor tint (dark / terracotta / pale) would repaint the whole wall, also over a researched colour
  if (dist && st.floors <= 1 && !(kn && kn.gfTint !== undefined)) st.gfTint = 0;
  // records that are not houses (canopies.js): a `building=roof` is a roof on posts, a `building=ship` / `boat` a moored hull. city.js keeps them out of the wall pipeline.
  if (dist && st.kind === 'roof' && !((b.minH || 0) > 0.5)) { st.special = 'canopy'; st.H = canopyTop(b); st.shop = false; }
  // a RAISED `roof` part (min_height 3.3 m, a mansard roof mapped over a yard or a pavilion: w537736642 / 644 / 646) has no body below it: a roof on posts up to its mapped top, like every other building=roof
  else if (dist && st.fresh && st.kind === 'roof' && b._raised && b.part && !kn) { st.special = 'canopy'; st.H = Math.max(canopyTop(b), (b.minH || 0) + (b.h || 0)); st.shop = false; }      // (the island rectangles V3..V12 only: the reviewed V1 / V2 / Petrograd records keep their output, tools/city-signature.mjs)
  if (dist && (st.kind === 'ship' || st.kind === 'boat')) st.special = 'ship';
  // a mapped podium (the 1-2 m base slab of a complex mapped in 3D: w304196168, 7758 m2 at height 1): a plain low wall. walls.js gives it no doors (they were squashed to 1 m)
  if (dist && st.H < 2.2 && !kn && !st.special) { st.podium = true; st.shop = false; st.erkers = false; st.mansard = false; st.turret = false; st.gable = 0; st.parapet = null; st.railing = false; }
  // a housing complex of the 2000s-20s does not peel: the hashed wear 3 showed brick under the plaster of a 16-storey block of 2015 (r14893079). Zones of the rectangles P6..P9.
  if (dist && (zone === 'works' || zone === 'newbuild' || zone === 'posad') && !(kn && kn.wear !== undefined) && (st.arch === ARCH.MODERN || (zone === 'newbuild' && st.arch === ARCH.PANEL))) st.wear = Math.min(st.wear, 1);
  // a tower or slab of a new complex stands free in its own grounds: it has no courtyard side. Without a street edge every wall of the 14-storey towers of r14893079 was the
  // worn khaki courtyard wall with brick patches (terracotta-mottled drums in an aerial view of the cape).
  if (dist && zone === 'newbuild' && (st.arch === ARCH.MODERN || st.arch === ARCH.PANEL) && st.floors >= 5) { st.allFronts = true; st.noFirewall = true; }      // noFirewall: walls.js draws the wall above a lower wing as a facade too
  // building=construction: a shell behind a green net (the scaffold pass builds the frame); never a finished tenement
  if (dist && st.kind === 'construction' && !kn) { st.restore = 2; st.wear = 0; st.railing = false; st.gfTint = 0; }
}

function paletteOf(st) {
  if (st.dist) { const p = districtPalette(st); if (p) return p; }
  switch (st.arch) {
    case ARCH.NORDIC: return PALETTE.nouveau;
    case ARCH.NEOCLASSIC1910: return PALETTE.neoclass;
    case ARCH.BRICK: return PALETTE.brick;
    case ARCH.STALIN: return PALETTE.stalin;
    case ARCH.PANEL: return PALETTE.panel;
    case ARCH.NOUVEAU: return PALETTE.nouveau;
    case ARCH.NEOCLASS: return PALETTE.neoclass;
    case ARCH.COURT: return PALETTE.court;
    case ARCH.MODERN: return PALETTE.modern;
    case ARCH.SERVICE: return PALETTE.service;
    default: return st.sc === 0 ? PALETTE.nevsky : PALETTE.plaster;
  }
}

/** Pick a colour for every style, avoiding the colours of the neighbours that share a wall (adj: Map id -> [ids]). b.colour tags override. */
export function assignColours(styles, adj, buildings) {
  const byId = new Map(buildings.map((b) => [b.id, b]));
  const order = [...styles.keys()].sort((a, c) => (styles.get(a).ob.cx - styles.get(c).ob.cx) || (styles.get(a).ob.cz - styles.get(c).ob.cz));
  const TAGS = { red: '#b8503e', white: '#e6e2d8', lightgrey: '#c8c6c0', grey: '#a6a49e', yellow: '#e6cf7c', brown: '#8a6a52', green: '#a9bfa0', blue: '#a4b8c8', pink: '#dca89c', orange: '#e09a52', beige: '#d9c8a4' };
  const fam = new Map();                    // district houses: outline id -> colour (the parts of one house agree)
  // the revival order is cut from the wall stone on grey terrazite fronts and is white on coloured ones (unless the research record says otherwise)
  const annex = (st) => st.arch === ARCH.COURT || st.arch === ARCH.SERVICE;      // yard wings and sheds neither give nor take the colour of the house
  const done = (st) => { if (st.arch === ARCH.NEOCLASSIC1910 && !st.trimClass && st.dist) st.trimClass = isStoneGrey(st.hex) ? 2 : 1; if (st.fam && !fam.has(st.fam) && !annex(st)) fam.set(st.fam, st.hex); };
  for (const id of order) {
    const st = styles.get(id), b = byId.get(id);
    const tag = b && b.colour && TAGS[String(b.colour).toLowerCase()];
    if (tag) { st.hex = tag; st.color = C(tag); if (st.dist) done(st); continue; }
    if (st.knownHex) { st.hex = st.knownHex; st.color = C(st.hex); if (st.dist) done(st); continue; }
    if (st.fam && fam.has(st.fam) && !annex(st)) { st.hex = fam.get(st.fam); st.color = C(st.hex); done(st); continue; }
    const pal = paletteOf(st);
    const used = new Set(); for (const n of adj.get(id) || []) { const s2 = styles.get(n); if (s2 && s2.hex) used.add(s2.hex); }
    let hex = pickW(st.h, pal);
    for (let k = 1; used.has(hex) && k < 8; k++) hex = pickW(hash01(id + 'col' + k), pal);
    st.hex = hex; st.color = C(hex);
    if (st.dist) done(st);
  }
}
