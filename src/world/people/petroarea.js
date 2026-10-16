// people/petroarea.js - the PETROGRAD SIDE (the whole of Petrogradsky Island: regions P1..P9) and the SPIT of Vasilievsky Island (docs/PETRO-BRIEF.md, V1, V2): a 3 m raster of "where a person may walk off the generic pavements,
// how much a place is wanted and which quiet zone it belongs to".  The same idea as people/area.js (Mars Field / Summer Garden / the south-west), which composes this raster into nav.area:
//   cat 1  pavement of a named avenue / embankment (a corridor round the road centre line: Kamennoostrovsky pr., Bolshoy pr. P.S., Kronverksky pr., the embankments ...) and the pavements inside a sight zone
//   cat 2  generic OSM footway near a sight (gardens, squares)                          y 0.04
//   cat 3  crowd disc published by a sight service (crowd: [{ x, z, r }])               y null (the pavement / the module's own surface)
//   cat 4  Alexander Park / Kronverk footway                                            y 0.04
//   cat 5  Troitskaya Square garden path (landmarksTroitskaya.paths)                    y 0.04
//   cat 6  the Spit: the footways and squares landmarksStrelka claims                   y null
//   cat 7  Zayachy Island (inside the island outline: a marker, NOT walkable by itself; there are no carriageways on the island: nav.js treats its service ways as footways),
//   cat 8  the ways (service ways + footways, widened to the cobbled alleys) and squares of the fortress, cat 9 the beach                                     y 0.04
// ZONES (head-count caps: people.js DENSITY.petro.zones, in this order; the global zone index is the number of older zones + the local one):
//   0 fortress (Zayachy Island + Ioannovsky / Kronverksky bridges; shut at night), 1 strelka, 2 university (Universitetskaya embankment), 3 troitskaya (the square, the Mosque, Kshesinskaya, Gorky),
//   4 kronverk (Alexander Park, the Artillery Museum, Narodny Dom, the zoo gate), 5 aurora (Petrovskaya embankment, the Cabin, the Nakhimov school, the cruiser), 6 petro (every other street of the
//   Petrograd side: the avenues, Austrian and Lev Tolstoy squares), 7 vladimir (the cathedral garden, Yubileyny, Tuchkov Buyan, the stadium), 8 bridges (the decks of the Trinity, Palace, Birzhevoy,
//   Tuchkov and Sampsonievsky bridges), 9 vo (the streets of Vasilievsky Island).
// Everything is read from the services / the baked OSM data; every input is optional.  ?petro=off (tools: --petrooff) switches the whole reach off (A / B comparisons).
// VASILIEVSKY ISLAND (docs/VO-BRIEF.md; people/voarea.js holds the data): the raster reaches x -9800 (the Gulf shore) and z +1700 (the whole island), `isVO` is the island outline (lib/vo-island.js), eighteen more stay zones
// (PETRO_ZONES after 'vo': the sights and the flows of the roster, caps in people.js DENSITY.vo), the named streets of the island carry the pavement weights, the services of the sixteen island sights publish crowd discs,
// footways, lawns (vetoed) and closed territory (military yards, building sites: no lattice node, no door goal).  ?vo=off (tools: --vooff) restores the old reach exactly (x -4960, z -690, the Spit part only).
import { AREAS, GREEN, LANDUSE } from '../data/city.js';
import { VO_OFF, inVO, VO_ZONES, VO_CORRIDOR, VO_LBAND, VO_CLOSED, VO_DECKS } from './voarea.js';
import { SITES, toWorld } from '../bridges/sites.js';                // pure data: the decks of the island bridges
import { ISLAND } from '../lib/vo-island.js';

export { VO_OFF };
export const PETRO_OFF = !!globalThis.__petroOff || (typeof location !== 'undefined' && /[?&]petro=off/.test(location.search));
export const PETRO_ZONES = ['fortress', 'strelka', 'university', 'troitskaya', 'kronverk', 'aurora', 'petro', 'vladimir', 'bridges', 'vo'].concat(VO_OFF ? [] : VO_ZONES.map((z) => z.name));
const X0 = VO_OFF ? -4960 : -9800, X1 = -540, Z0 = -4270, Z1 = VO_OFF ? -690 : 1700, CS = 3;                 // (P6..P9: the north and west of Petrogradsky Island, the Karpovka; the island: V3..V12)
const NX = Math.ceil((X1 - X0) / CS), NZ = Math.ceil((Z1 - Z0) / CS);
/** the new reach: the Petrograd side, the islands and the Spit (north of the Neva / north-west of the Bolshaya Neva centre line); the older areas keep their own tables */
export const inPetro = (x, z) => x > -4960 && x < X1 && z > Z0 && z < -690 && (x > -2330 ? z < -1575 : z < -891 - 0.74 * (x + 2500));
/** Vasilievsky Island (south of the Malaya Neva) inside the new reach */
const isVO = (x, z) => x < -2400 && z > (x < -2680 ? -1545 + 0.298 * (x + 2680) : -1500);
/** the pavement band |v| of the long bridges, from the barrier kerb to the railing (docs/research/petro-requests-bridges.md); ped: the whole deck is a footway */
export const LBAND = { troitsky: [9.85, 11.8], palace: [11.3, 13.85], birzhevoy: [10.8, 13.65], tuchkov: [14.8, 18.0], samps: [10.8, 13.5], zhdanovsky: [0, 17.0, 'ped'], kursant: [6.3, 11.0], ...(VO_OFF ? {} : VO_LBAND) };
/** the sixteen sight modules of the island: crowd discs / footways / lawns of their services and groups belong to the island reach */
export const VO_SIGHTS = ['landmarksAcademy', 'landmarksMenshikov', 'landmarksMining', 'landmarksAndrew', 'landmarksNavalCorps', 'landmarksSmolensky', 'landmarksSeaTerminal', 'landmarksSevkabel', 'landmarksKirova', 'landmarksMakarova', 'landmarksSredny', 'landmarksGavan', 'landmarksPribaltiyskaya', 'landmarksMarineFacade', 'landmarksModernVO'];
// the named streets that carry people (zone weight of their pavements): the avenues with shops and cafes, the embankments, the streets between the sights; side streets stay quiet
const CORRIDOR = {
  'Каменноостровский проспект': 0.48, 'Большой проспект П.С.': 0.46, 'Кронверкский проспект': 0.4, 'проспект Добролюбова': 0.3, 'улица Куйбышева': 0.3, 'Александровский парк': 0.36,
  'Кронверкская набережная': 0.34, 'Петровская набережная': 0.4, 'Петроградская набережная': 0.3, 'Мытнинская набережная': 0.3, 'Университетская набережная': 0.45, 'набережная Макарова': 0.26,
  'Ждановская набережная': 0.22, 'Биржевая площадь': 0.46, 'Биржевой проезд': 0.26, 'Менделеевская линия': 0.3, 'улица Льва Толстого': 0.24, 'Большая Пушкарская улица': 0.22,
  'Введенская улица': 0.22, 'улица Блохина': 0.2, 'улица Мира': 0.2,
  // P6..P9 (the rest of Petrogradsky Island): ordinary residential streets, the Karpovka and the Nevka embankments
  'набережная реки Карповки': 0.3, 'Чкаловский проспект': 0.28, 'Левашовский проспект': 0.22, 'Малый проспект П.С.': 0.24, 'Большая Зеленина улица': 0.22, 'Пионерская улица': 0.2, 'улица Ленина': 0.2,
  'набережная Адмирала Лазарева': 0.22, 'Аптекарская набережная': 0.22, 'улица Рентгена': 0.18, 'Корпусная улица': 0.16, 'Ждановская улица': 0.16,
  'Троицкий мост': 0.3, 'Дворцовый мост': 0.3, 'Биржевой мост': 0.3, 'Тучков мост': 0.28, 'Сампсониевский мост': 0.2, 'Троицкая площадь': 0.4,
};
// generic OSM footways count as walkable ground within these discs [x, z, r, weight] (gardens and squares without a module of their own)
const FOOT_DISCS = [[-2198, -3714, 75, 0.34], [-1906, -3065, 60, 0.3], [-2324, -2745, 85, 0.3], [-1135, -2305, 95, 0.34], [-3130, -2135, 125, 0.32], [-3290, -2035, 105, 0.28], [-3400, -1845, 110, 0.24], [-3640, -2250, 230, 0.2], [-790, -2520, 125, 0.3],
  [-1440, -2265, 150, 0.32], [-1520, -2500, 105, 0.3], [-2560, -1275, 190, 0.3], [-2880, -1040, 200, 0.26], [-1775, -2844, 60, 0.26]];
const LAWN_KINDS = new Set(['grass', 'flowerbed', 'scrub', 'wood', 'pitch', 'track', 'cemetery', 'garden', 'stadium', 'shrubbery']);
const ringHas = (r, x, z) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
const pairs = (o) => { if (!o || !o.length) return []; if (Array.isArray(o[0])) return o; const r = []; for (let i = 0; i + 1 < o.length; i += 2) r.push([o[i], o[i + 1]]); return r; };

export function makePetroArea(ctx, L, st) {
  const sv = ctx.services, grp = (k) => new Set(L.groupOsm ? L.groupOsm(k) : []);
  const cat = new Uint8Array(NX * NZ), wt = new Uint8Array(NX * NZ), zn = new Int8Array(NX * NZ).fill(-1), flg = new Uint8Array(NX * NZ);                    // flg: bit 1 lawn (nobody walks), bit 2 closed territory (island), bit 4 open (bridge approach: neither of the others applies)
  const idx = (x, z) => { const i = Math.floor((x - X0) / CS), j = Math.floor((z - Z0) / CS); return i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : j * NX + i; };
  const cells = (x0, x1, z0, z1, fn) => { for (let j = Math.max(0, Math.floor((z0 - Z0) / CS)); j <= Math.min(NZ - 1, Math.floor((z1 - Z0) / CS)); j++) for (let i = Math.max(0, Math.floor((x0 - X0) / CS)); i <= Math.min(NX - 1, Math.floor((x1 - X0) / CS)); i++) fn(j * NX + i, X0 + (i + 0.5) * CS, Z0 + (j + 0.5) * CS); };
  const put = (k, c, w) => { if (c > cat[k]) cat[k] = c; const q = Math.min(255, Math.round(w * 50)); if (q > wt[k]) wt[k] = q; };
  /** every cell within hw of the polyline: fn(k, x, z) */
  const tube = (pts, hw, fn) => {
    for (let s = 0; s + 1 < pts.length; s++) {
      const ax = pts[s][0], az = pts[s][1], bx = pts[s + 1][0], bz = pts[s + 1][1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, R = hw + CS * 0.35;
      if (Math.max(ax, bx) + R < X0 || Math.min(ax, bx) - R > X1 || Math.max(az, bz) + R < Z0 || Math.min(az, bz) - R > Z1) continue;
      cells(Math.min(ax, bx) - R, Math.max(ax, bx) + R, Math.min(az, bz) - R, Math.max(az, bz) + R, (k, px, pz) => { const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)), ex = px - ax - dx * t, ez = pz - az - dz * t; if (ex * ex + ez * ez <= R * R) fn(k, px, pz); });
    }
  };
  const fill = (ring, fn) => { const r = pairs(ring); if (r.length < 3) return; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } cells(x0, x1, z0, z1, (k, px, pz) => { if (ringHas(r, px, pz)) fn(k, px, pz); }); };
  const disc = (x, z, r, fn) => cells(x - r, x + r, z - r, z + r, (k, px, pz) => { if ((px - x) * (px - x) + (pz - z) * (pz - z) <= r * r) fn(k, px, pz); });
  const _pt = (typeof performance !== 'undefined' ? performance : Date), _t0 = _pt.now(); let _tl = _t0; const ms = {}, lap = (k) => { const n = _pt.now(); ms[k] = Math.round(n - _tl); _tl = n; };
  const info = { ms, corridors: 0, footways: 0, crowd: 0, fortress: 0, lawns: 0, vo: 0, voCorridors: 0, voFootways: 0, voCrowd: 0, voPaths: 0, closed: 0 };
  const F = sv.landmarksFortress || {}, S = sv.landmarksStrelka || {}, T = sv.landmarksTroitskaya || {}, K = sv.landmarksKronverk || {}, U = sv.landmarksUniversity || {}, A = sv.landmarksAurora || {}, V = sv.landmarksVladimir || {}, KM = sv.landmarksKamennoostrovsky || {};
  /** every cell whose centre lies inside the polygon (flat x, z, x, z ... or pairs), row by row: fn(k) */
  const scan = (poly, fn) => {
    const n = poly.length >> 1; for (let j = 0; j < NZ; j++) {
      const z = Z0 + (j + 0.5) * CS, xs = []; for (let i = 0, q = n - 1; i < n; q = i++) { const zi = poly[i * 2 + 1], zq = poly[q * 2 + 1]; if ((zi > z) !== (zq > z)) xs.push(poly[i * 2] + (z - zi) * (poly[q * 2] - poly[i * 2]) / (zq - zi)); }
      if (xs.length < 2) continue; xs.sort((a, b) => a - b);
      for (let s = 0; s + 1 < xs.length; s += 2) { const i0 = Math.max(0, Math.ceil((xs[s] - X0) / CS - 0.5)), i1 = Math.min(NX - 1, Math.floor((xs[s + 1] - X0) / CS - 0.5)); for (let i = i0; i <= i1; i++) fn(j * NX + i, X0 + (i + 0.5) * CS, z); }
    }
  };

  // ---------------------------------------------------------------- zones (later shapes win)
  const Z = (id) => (k) => { zn[k] = id; };
  cells(-4960, X1, Z0, -690, (k, x, z) => { if (inPetro(x, z)) zn[k] = isVO(x, z) ? 9 : 6; });                                              // (the old reach only: the island outline is scanned below)
  if (!VO_OFF) scan(ISLAND, (k) => { zn[k] = 9; });                                                                                   // the whole island outline is the generic island zone 'vo'
  lap('alloc+zones');
  const VZ0 = PETRO_ZONES.indexOf('vo') + 1, VZ = (name) => VZ0 + VO_ZONES.findIndex((q) => q.name === name);                              // the first island sight zone / the index of a named one
  const onVO = (k) => zn[k] >= 9;
  disc(-2010, -2330, 405, (k, x, z) => { if (z < -2222) zn[k] = 4; });                                                                    // Alexander Park inside the arc of Kronverksky prospekt
  tube([[-1395, -2125], [-1110, -2250], [-860, -2365], [-790, -2440], [-765, -2520], [-790, -2640]], 70, Z(5)); disc(-1135, -2305, 85, Z(5)); disc(-845, -2570, 110, Z(5));
  disc(-1440, -2265, 150, Z(3)); disc(-1520, -2500, 105, Z(3)); disc(-1757, -2705, 55, Z(3));
  disc(-3130, -2135, 125, Z(7)); disc(-3290, -2035, 105, Z(7)); disc(-3640, -2250, 230, Z(7)); disc(-3400, -1845, 110, Z(7));
  cells(-2730, -2400, -1425, -1125, Z(1)); disc(-2790, -1392, 65, Z(1));
  tube([[-2540, -1045], [-2610, -985], [-2700, -915], [-2800, -850], [-2960, -735]], 70, Z(2)); tube([[-2800, -860], [-3010, -1225]], 45, Z(2));
  const ring = pairs(F.ring);
  if (ring.length > 3) { fill(ring, Z(0)); tube(ring.concat([ring[0]]), 16, Z(0)); }
  else cells(-2380, -1575, -2232, -1700, Z(0));
  for (const b of F.bridges || []) if (b.a && b.b) tube([b.a, b.b], (b.w || 9) / 2 + 1, Z(0));
  const spans = ((sv.bridges && sv.bridges.spans) || []).filter((s) => LBAND[s.id] && s.a && s.b);
  for (const s of spans) if (!LBAND[s.id][2] && s.id !== 'kursant' && !(s.id === 'blagoveshchensky' && !VO_OFF)) tube([[s.a.x, s.a.z], [s.b.x, s.b.z]], s.hw + 0.5, Z(8));
  // ---- Vasilievsky Island: the stay zones of the sights and the flows (voarea.js VO_ZONES, in list order: later shapes win), the Blagoveshchensky deck has its own zone
  if (!VO_OFF) {
    const greenById = (id) => GREEN.find((g) => g.id === id) || LANDUSE.find((g) => g.id === id);
    VO_ZONES.forEach((zd, zi) => {
      const paint = Z(VZ0 + zi);
      if (zd.road) for (const r of (st && st.roads) || []) { if (r.name !== zd.road[0] || !r.pts || r.pts.length < 2) continue; tube(r.pts, zd.road[1], (k, x) => { if (x >= zd.road[2] && x <= zd.road[3]) paint(k); }); }
      if (zd.ring) { const g = greenById(zd.ring); if (g) for (const q of g.polys) scan(q.o, paint); }
      for (const [x, z, r] of zd.discs || []) disc(x, z, r, paint);
      for (const [pts, hw] of zd.tubes || []) tube(pts, hw, paint);
      for (const sk of zd.svc || []) for (const c of (sv[sk] && sv[sk].crowd) || []) if (Number.isFinite(c.x) && !(c.y !== undefined && Math.abs(c.y) > 0.5)) disc(c.x, c.z, (c.r || 5) + 6, paint);
    });
    for (const s of spans) if (s.id === 'blagoveshchensky') tube([[s.a.x, s.a.z], [s.b.x, s.b.z]], s.hw + 0.5, Z(VZ('vo-blag')));
    // the road bridges of the island (sites of bridges/sites.js: Uralsky, Smolensky, Nalichny, Korablestroiteley, the mouth bridges): a routing weight along the deck and 55 m of both approaches, so that the lattice joins the pavements of the banks
    for (const id of VO_DECKS) { const s = SITES.find((q) => q.id === id); if (!s) continue; const vm = (s.v0 + s.v1) / 2, a = toWorld(s, -55, vm), b = toWorld(s, 55, vm); tube([[a.x, a.z], [b.x, b.z]], (s.v1 - s.v0) / 2 + 1, (k) => { put(k, 1, 0.3); flg[k] |= 4; }); info.voDecks = (info.voDecks || 0) + 1; }
  }

  lap('vo-zones+decks');
  // ---------------------------------------------------------------- 1. the pavements of the named avenues / embankments / bridges, and every pavement inside a sight zone
  for (const r of (st && st.roads) || []) {
    if (!r.pts || r.pts.length < 2) continue;
    const w = CORRIDOR[r.name], rows = VO_OFF ? null : VO_CORRIDOR[r.name];
    if (w) { info.corridors++; tube(r.pts, (r.w || 7) / 2 + 8, (k, x, z) => { if (r.bridge || inPetro(x, z) || (!VO_OFF && onVO(k))) put(k, 1, w); }); }
    if (rows) { info.voCorridors++; tube(r.pts, (r.w || 7) / 2 + 8, (k, x) => { if (!onVO(k)) return; for (const [rw, x0, x1] of rows) if (x >= x0 && x <= x1) { put(k, 1, rw); return; } }); }          // (the Lines, the prospects and the embankments of the island: windows along x)
  }
  for (const s of (st && st.sidewalks) || []) if (s.pts && s.pts.length > 1) {
    if (!VO_OFF) { let old = false, hit = false; for (const p of s.pts) { if (p[0] > -4960 && p[0] < X1 && p[1] > Z0 && p[1] < -690) { old = true; break; } const k0 = idx(p[0], p[1]); if (k0 >= 0 && zn[k0] >= VZ0) hit = true; } if (!old && !hit) continue; }          // (a pavement wholly in the new reach matters only inside a stay zone of the island: skipping the others saves the 14 k island pavements)
    tube(s.pts, 5.5, (k) => { const q = zn[k]; if (q >= 0 && q !== 6 && q !== 9 && q !== 8) put(k, 1, q === 7 ? 0.2 : (q >= VZ0 && VO_ZONES[q - VZ0].quiet) ? 0.12 : 0.24); });
  }
  lap('corridors+sidewalks');
  // ---------------------------------------------------------------- 2. footways: the claimed ones by module, the generic ones near the sights
  const fOsm = grp('landmarksFortress'), sOsm = grp('landmarksStrelka'), tOsm = grp('landmarksTroitskaya'), kOsm = grp('landmarksKronverk'), vOsm = grp('landmarksVladimir'), uOsm = grp('landmarksUniversity'), aOsm = grp('landmarksAurora');
  const footDisc = (x, z) => { for (const d of FOOT_DISCS) if ((x - d[0]) * (x - d[0]) + (z - d[1]) * (z - d[1]) < d[2] * d[2]) return d[3]; return 0; };
  for (const p of (st && st.paths) || []) {
    if (!p.pts || p.pts.length < 2 || p.hw === 'steps') continue; const a = p.pts[0], hw = Math.max(1.3, (p.w || 3) / 2) + 0.3;
    if (fOsm.has(p.id)) { tube(p.pts, hw, (k) => put(k, 8, 0.4)); info.footways++; continue; }
    if (sOsm.has(p.id)) { tube(p.pts, hw, (k) => put(k, 6, 0.5)); info.footways++; continue; }
    if (!VO_OFF) { const k0 = idx(a[0], a[1]), q = k0 >= 0 ? zn[k0] : -1; if (q >= VZ0) { if (VO_ZONES[q - VZ0].quiet) continue; tube(p.pts, hw, (k) => put(k, 2, 0.3)); info.voFootways++; continue; } }          // (the cemetery: only the alleys the module draws, see the service paths below)          // a footway that starts in a stay zone of the island sights
    if (!inPetro(a[0], a[1])) continue;
    const k0 = idx(a[0], a[1]), q = k0 >= 0 ? zn[k0] : -1;
    if (q === 4 || kOsm.has(p.id)) { tube(p.pts, hw, (k) => put(k, 4, 0.32)); info.footways++; continue; }
    const w = footDisc(a[0], a[1]) || (tOsm.has(p.id) || vOsm.has(p.id) || uOsm.has(p.id) || aOsm.has(p.id) ? 0.3 : 0); if (!w) continue;
    tube(p.pts, hw, (k) => put(k, 2, w)); info.footways++;
  }
  for (const p of T.paths || []) if (p.pts && p.pts.length > 1) tube(p.closed ? p.pts.concat([p.pts[0]]) : p.pts, Math.max(1.2, (p.w || 2.4) / 2) + 0.3, (k) => put(k, 5, 0.45));
  for (const a of AREAS) { if (a.hw === 'steps') continue; const c = fOsm.has(a.id) ? 8 : sOsm.has(a.id) ? 6 : tOsm.has(a.id) ? 5 : 0; if (c) for (const p of a.polys) fill(p.o, (k) => put(k, c, c === 6 ? 0.5 : 0.4)); }
  lap('footways');
  // ---------------------------------------------------------------- 3. Zayachy Island: the whole ground inside the outline (the ramparts are colliders, the lawns are vetoed below), the beach
  if (ring.length > 3) {
    fill(ring, (k) => { put(k, 7, 0); info.fortress++; });
    for (const r of (st && st.roads) || []) { if (!r.pts || r.pts.length < 2) continue; const m = r.pts[Math.floor(r.pts.length / 2)]; if (m[0] < -2400 || m[0] > -1560 || m[1] < -2260 || m[1] > -1690 || !ringHas(ring, m[0], m[1])) continue; tube(r.pts, Math.min(4.5, Math.max(2, (r.w || 4) / 2)), (k) => { if (cat[k] >= 7) put(k, 8, 0.38); }); info.islandWays = (info.islandWays || 0) + 1; }
  }
  if (F.beach && F.beach.ring) fill(F.beach.ring, (k) => put(k, 9, 0.3));
  // ---------------------------------------------------------------- 4. the crowd discs the sight services publish (street level only)
  for (const svc of [F, S, T, K, U, A, V, KM, sv.landmarksKarpovka || {}]) for (const c of svc.crowd || []) { if (!Number.isFinite(c.x) || (c.y !== undefined && Math.abs(c.y) > 0.5)) continue; info.crowd++; disc(c.x, c.z, (c.r || 5) + 2, (k) => put(k, 3, 0.3)); }
  if (!VO_OFF) {
    for (const sk of VO_SIGHTS) {
      const svc = sv[sk]; if (!svc) continue;
      for (const c of svc.crowd || []) { if (!Number.isFinite(c.x) || (c.y !== undefined && Math.abs(c.y) > 0.5)) continue; info.voCrowd++; disc(c.x, c.z, (c.r || 5) + 2, (k) => put(k, 3, /^xenia/.test(c.id || '') ? 0.5 : 0.3)); }
      for (const p of svc.paths || []) if (p && p.pts && p.pts.length > 1) { info.voPaths++; const wq = sk === 'landmarksSmolensky' ? 0.12 : 0.3; tube(p.closed ? p.pts.concat([p.pts[0]]) : p.pts, Math.max(1.2, (p.w || 2.4) / 2) + 0.3, (k) => put(k, 5, wq)); }          // the alleys a module draws itself (the cemetery: 66 mapped alleys)
    }
    // closed territory: military yards (the Naval Corps, the submarine detachment) and building sites (Lenexpo ...) of the island: nobody walks there, no door of theirs is a goal
    for (const g of LANDUSE) {
      if (!VO_CLOSED.includes(g.kind) || !g.polys) continue;
      for (const q of g.polys) { const o = q.o; if (!o || o.length < 6 || !inVO(o[0], o[1])) continue; const k0 = idx(o[0], o[1]); if (k0 >= 0 && (zn[k0] === 1 || zn[k0] === 2)) continue; scan(o, (k) => { if (flg[k] & 4) return; flg[k] |= 2; info.closed++; }); }          // (the Spit and the Universitetskaya embankment are reviewed: their building sites stay as they were)
    }
  }
  // ---------------------------------------------------------------- lawns nobody walks on: the green of the fortress, the Spit garden, Troitskaya Square, the Kronverk, the stadium
  lap('fortress+crowd+closed');
  const voOsm = new Set(); if (!VO_OFF) for (const sk of VO_SIGHTS) for (const id of L.groupOsm ? L.groupOsm(sk) : []) voOsm.add(id);                      // every OSM id the island sights claim
  for (const g of GREEN) {
    const own = fOsm.has(g.id) || tOsm.has(g.id) || kOsm.has(g.id) || vOsm.has(g.id), spit = sOsm.has(g.id), ownVO = voOsm.has(g.id);
    if (!(own && LAWN_KINDS.has(g.kind)) && !spit && !(ownVO && LAWN_KINDS.has(g.kind))) continue;
    for (const q of g.polys) fill(q.o, (k) => { if (!VO_OFF && (flg[k] & 4)) return; flg[k] |= 1; info.lawns++; });
  }

  lap('lawns');
  const catAt = (x, z) => { const k = idx(x, z); return k < 0 ? 0 : cat[k]; };
  return {
    info, catAt, inBox: (x, z) => x > X0 && x < X1 && z > Z0 && z < Z1,
    y: (x, z) => { const c = catAt(x, z); return c === 2 || c === 4 || c === 5 || c === 7 || c === 8 || c === 9 ? 0.04 : null; },
    walk: (x, z) => { const c = catAt(x, z); return c >= 2 && c !== 7; },
    veto: (x, z) => { const k = idx(x, z); return k >= 0 && ((flg[k] & 1) || (!VO_OFF && (flg[k] & 2))) && cat[k] < 2; },
    /** closed territory of the island (military yards, building sites): no lattice node, no door goal */
    closed: (x, z) => { if (VO_OFF) return false; const k = idx(x, z); return k >= 0 && (flg[k] & 2) !== 0 && cat[k] < 2; },
    /** the first island sight zone (local index) and the number of them; -1 / 0 with ?vo=off */
    voZone0: VO_OFF ? -1 : VZ0, voZones: VO_OFF ? 0 : VO_ZONES.length,
    weight: (x, z) => { const k = idx(x, z); return k < 0 ? 0 : wt[k] / 50; },
    /** local zone index (PETRO_ZONES) or -1 */
    zone: (x, z) => { const k = idx(x, z); return k < 0 ? -1 : zn[k]; },
    spans,
  };
}
