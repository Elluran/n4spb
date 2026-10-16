// people/area.js - the pedestrian surfaces of the MARS FIELD / SUMMER GARDEN / ENGINEERING CASTLE reach (docs/MARS-BRIEF.md): a 3 m raster of "where a person may walk and how much a place is wanted".
// The landmark modules draw their OWN footways (gravel alleys, the memorial plaza, the garden alleys and fountain squares) and the generic pavement graph of the streets module is cut into small pieces
// there, so the routing lattice (nav.js) learns the surfaces from here:
//   cat 1  pavement strip (streets.sidewalks centre line, 6 m round it)           y = the pavement (null)
//   cat 2  Mars Field gravel alley / plaza (streets.paths of landmarksMars, half width + 0.4 m, the plaza area)   y 0.04
//   cat 3  Summer Garden gravel alley / fountain square (landmarksGarden paths: 6.2 / 3.8 / 3.0 m wide + AREAS)    y 0.04
//   cat 5  the Main alley of the Summer Garden (6.2 m between the statue rows: the busiest alley, an extra weight), cat 6  the two main alleys of the Mars Field (8 m)
//   cat 4  castle precinct footway (landmarksCastle paths, Klenovaya alley, the south terrace)                     y null
// Outside the surfaces the Summer Garden is lawn / bosquet: nobody walks there (rule: no walking on lawns), the Mars Field lawns may be walked (a low zone weight only).
// Everything is read from the layout groups / the services / the baked OSM data (data/city.js); every input is optional.
import { AREAS, GREEN } from '../data/city.js';
import { makePetroArea, PETRO_OFF } from './petroarea.js';
import { makeIsl2Area, ISL_OFF } from './isl2area.js';

// the raster covers the Mars reach (x -1470 .. -600, z -1740 .. -640) and the SOUTH-WEST (x -3980 .. -1650, z -260 .. 1420: Teatralnaya Square / Mariinsky, Yusupov Palace, New Holland, Nikolsky Cathedral)
const X0 = -3980, X1 = -600, Z0 = -1740, Z1 = 1420, CS = 3;
const MARS_BOX = [-1470, -600, -1740, -640];
export const PETRO_ZONE0 = 8;                                         // the first zone index of the Petrograd side / the Spit (people.js DENSITY.petro.zones follow the eight zones of DENSITY.mars.zones)
// the sights of the south-west [x, z, reach]: the pavement strips (cat 1) get their zone weight only within `reach` metres of a sight (side streets elsewhere stay empty / low density)
const SW_ANCH = [[-3040, 730, 300], [-2930, 380, 220], [-3500, 300, 380], [-2900, 1090, 280], [-3000, 560, 130], [-3000, 930, 150]];
export const SW_OFF = !!globalThis.__swOff || (typeof location !== 'undefined' && /[?&]sw=off/.test(location.search));        // ?sw=off: the population without the south-west work (A / B)
const swNear = (x, z) => { if (SW_OFF) return false; for (const a of SW_ANCH) if ((x - a[0]) * (x - a[0]) + (z - a[1]) * (z - a[1]) < a[2] * a[2]) return true; return false; };
const inMarsBox = (x, z) => x >= MARS_BOX[0] && x <= MARS_BOX[1] && z >= MARS_BOX[2] && z <= MARS_BOX[3];
const NX = Math.ceil((X1 - X0) / CS), NZ = Math.ceil((Z1 - Z0) / CS);
// the Mars Field relation (landmarksMars/field.js FIELD_RING) and the Summer Garden relation (landmarksGarden/groups.js GARDEN_RING), copied (pure data)
const FIELD_RING = [[-1286, -1359], [-1221, -1193], [-1216, -1180], [-1172, -1066], [-1154, -1052], [-1127, -1047], [-1000, -1018], [-927, -1004], [-916, -1063], [-991, -1283], [-1056, -1472], [-1083, -1484], [-1208, -1425], [-1275, -1394]];
const GARDEN_RING = [[-1059.2, -1597.9], [-843.5, -1695.1], [-831.6, -1646.4], [-796.9, -1529], [-776.4, -1421.2], [-751.8, -1093.1], [-750.5, -1089.5], [-754.9, -1085.3], [-850, -1018], [-856.2, -1015.4]];
// garden footway classes (landmarksGarden/ground.js): the Main alley 6.2 m, the wide cross alleys 3.8 m, every other footway 3.0 m
const G_MAIN = new Set(['w159079282', 'w197658096', 'w197658097', 'w159079329', 'w311015871', 'w311015894']);
const F_MAIN = new Set(['w151671754', 'w151671755']);
const G_WIDE = new Set(['w197658098', 'w159079296', 'w591647539', 'w159079316', 'w159079288', 'w159079285', 'w159079284', 'w311015873', 'w159079295', 'w159079332', 'w159079343', 'w197658123']);
const ringHas = (r, x, z) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };

export function makeArea(ctx, L, st, opts = {}) {
  const sv = ctx.services, gOsm = new Set(L.groupOsm ? L.groupOsm('landmarksGarden') : []), mOsm = new Set(L.groupOsm ? L.groupOsm('landmarksMars') : []), cOsm = new Set(L.groupOsm ? L.groupOsm('landmarksCastle') : []);
  const gRing = (sv.landmarksGarden && sv.landmarksGarden.ring) || GARDEN_RING;
  const cat = new Uint8Array(NX * NZ), idx = (x, z) => { const i = Math.floor((x - X0) / CS), j = Math.floor((z - Z0) / CS); return i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : j * NX + i; };
  /** burn the buffer (half width hw) round a polyline into the raster as `c` (a lower category never overwrites a higher one except 1) */
  const burn = (pts, hw, c, ok = null) => {
    for (let s = 0; s + 1 < pts.length; s++) {
      const ax = pts[s][0], az = pts[s][1], bx = pts[s + 1][0], bz = pts[s + 1][1];
      const ex = Math.min(ax, bx) - hw, fx = Math.max(ax, bx) + hw, ez = Math.min(az, bz) - hw, fz = Math.max(az, bz) + hw;
      if (fx < X0 || ex > X1 || fz < Z0 || ez > Z1) continue;
      const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
      for (let j = Math.max(0, Math.floor((ez - Z0) / CS)); j <= Math.min(NZ - 1, Math.floor((fz - Z0) / CS)); j++) for (let i = Math.max(0, Math.floor((ex - X0) / CS)); i <= Math.min(NX - 1, Math.floor((fx - X0) / CS)); i++) {
        const px = X0 + (i + 0.5) * CS, pz = Z0 + (j + 0.5) * CS, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
        if (Math.hypot(px - ax - dx * t, pz - az - dz * t) <= hw + CS * 0.35 && (!ok || ok(px, pz))) { const k = j * NX + i; if (c === 1 ? cat[k] === 0 : cat[k] < c || cat[k] === 1) cat[k] = c; }
      }
    }
  };
  const burnRing = (o, c) => {                                                       // an area polygon (flat [x, z, ...] ring)
    const r = []; for (let i = 0; i < o.length; i += 2) r.push([o[i], o[i + 1]]); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    if (x1 < X0 || x0 > X1 || z1 < Z0 || z0 > Z1) return;
    for (let j = Math.max(0, Math.floor((z0 - Z0) / CS)); j <= Math.min(NZ - 1, Math.floor((z1 - Z0) / CS)); j++) for (let i = Math.max(0, Math.floor((x0 - X0) / CS)); i <= Math.min(NX - 1, Math.floor((x1 - X0) / CS)); i++) { const px = X0 + (i + 0.5) * CS, pz = Z0 + (j + 0.5) * CS; if (ringHas(r, px, pz)) { const k = j * NX + i; if (cat[k] < c || cat[k] === 1) cat[k] = c; } }
  };
  // 1. the pavement strips of the streets module
  for (const s of (st && st.sidewalks) || []) if (s.pts && s.pts.length > 1) burn(s.pts, 5.5, 1, (px, pz) => inMarsBox(px, pz) || swNear(px, pz));
  // 2. the footways: the claimed ones by module, the generic ones of the castle square / Klenovaya alley as castle footways
  let nG = 0, nM = 0, nC = 0;
  for (const p of (st && st.paths) || []) {
    if (!p.pts || p.pts.length < 2 || p.hw === 'steps') continue;
    if (gOsm.has(p.id)) { burn(p.pts, (G_MAIN.has(p.id) ? 6.2 : G_WIDE.has(p.id) ? 3.8 : 3.0) / 2 + 0.25, G_MAIN.has(p.id) ? 5 : 3); nG++; }
    else if (mOsm.has(p.id)) { burn(p.pts, Math.max(1.3, (p.w || 3) / 2) + 0.3, F_MAIN.has(p.id) ? 6 : 2); nM++; }
    else if (cOsm.has(p.id) || (p.pts[0][0] > -800 && p.pts[0][0] < -640 && p.pts[0][1] > -960 && p.pts[0][1] < -700)) { burn(p.pts, Math.max(1.3, (p.w || 3) / 2) + 0.3, 4); nC++; }
  }
  const mp = sv.landmarksMars && sv.landmarksMars.paths; if (mp) for (const p of mp) burn(p.closed ? p.pts.concat([p.pts[0]]) : p.pts, Math.max(1.3, p.w / 2) + 0.3, F_MAIN.has(p.id) ? 6 : 2);
  // 3. the squares / plazas of the claimed groups (the memorial plaza, the garden fountain squares)
  for (const a of AREAS) { const c = mOsm.has(a.id) ? 2 : gOsm.has(a.id) ? 3 : cOsm.has(a.id) ? 4 : 0; if (c && a.hw !== 'steps') for (const p of a.polys) burnRing(p.o, c); }
  // ---- the SOUTH-WEST: the footways / squares of the four sights (cat 7 New Holland granite-sett paths, quays and footbridges, cat 8 Nikolsky garden paths, cat 9 Yusupov garden gravel, cat 10 Mariinsky square / garden paths)
  const grp = (k) => new Set(L.groupOsm ? L.groupOsm(k) : []), nhOsm = grp('landmarksNewHolland'), nkOsm = grp('landmarksNikolsky'), yuOsm = grp('landmarksYusupov'), maOsm = grp('landmarksMariinsky');
  let nSW = 0;
  if (!SW_OFF) for (const p of (st && st.paths) || []) {
    if (!p.pts || p.pts.length < 2 || p.hw === 'steps') continue;
    const c = nhOsm.has(p.id) ? 7 : nkOsm.has(p.id) ? 8 : yuOsm.has(p.id) ? 9 : maOsm.has(p.id) ? 10 : 0; if (!c) continue;
    burn(p.pts, Math.max(1.3, (p.w || 3) / 2) + 0.3, c); nSW++;
  }
  if (!SW_OFF) for (const a of AREAS) { const c = nhOsm.has(a.id) ? 7 : nkOsm.has(a.id) ? 8 : yuOsm.has(a.id) ? 9 : maOsm.has(a.id) ? 10 : 0; if (c && a.hw !== 'steps') for (const p of a.polys) burnRing(p.o, c); }
  // the footbridges of New Holland lie over the canal water at y 0.04 (walk boxes): every cell near a bridge whose ground is a deck is a walkable cell (cat 7)
  const env = sv.environment, ph = ctx.physics, nh = sv.landmarksNewHolland;
  if (!SW_OFF && nh && nh.bridges && env && env.waterAt && ph) for (const b of nh.bridges) {
    const R = (b.len || 20) / 2 + 3;
    for (let j = Math.max(0, Math.floor((b.z - R - Z0) / CS)); j <= Math.min(NZ - 1, Math.floor((b.z + R - Z0) / CS)); j++) for (let i = Math.max(0, Math.floor((b.x - R - X0) / CS)); i <= Math.min(NX - 1, Math.floor((b.x + R - X0) / CS)); i++) {
      const px = X0 + (i + 0.5) * CS, pz = Z0 + (j + 0.5) * CS; if (Math.hypot(px - b.x, pz - b.z) > R) continue;
      const h = ph.groundHeight(px, pz, 0.3, false); if (Number.isFinite(h) && h > -0.3 && h < 1.2 && env.waterAt(px, pz)) { const k = j * NX + i; if (cat[k] < 7) cat[k] = 7; }
    }
  }
  // lawns / bosquets of the Yusupov garden, the Nikolsky garden and the Mariinsky gardens: nobody walks there (veto flag; the alleys and squares are cat >= 2)
  const lawn = new Uint8Array(NX * NZ);
  const burnLawn = (o) => { const r = []; for (let i = 0; i < o.length; i += 2) r.push([o[i], o[i + 1]]); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of r) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } if (x1 < X0 || x0 > X1 || z1 < Z0 || z0 > Z1) return; for (let j = Math.max(0, Math.floor((z0 - Z0) / CS)); j <= Math.min(NZ - 1, Math.floor((z1 - Z0) / CS)); j++) for (let i = Math.max(0, Math.floor((x0 - X0) / CS)); i <= Math.min(NX - 1, Math.floor((x1 - X0) / CS)); i++) if (ringHas(r, X0 + (i + 0.5) * CS, Z0 + (j + 0.5) * CS)) lawn[j * NX + i] = 1; };
  if (!SW_OFF) for (const g of GREEN) if (yuOsm.has(g.id) || nkOsm.has(g.id) || maOsm.has(g.id)) for (const q of g.polys) burnLawn(q.o);
  const info = { nG, nM, nC, nSW };

  const catAt = (x, z) => { const k = idx(x, z); return k < 0 ? 0 : cat[k]; };
  const inGarden = (x, z) => x > -1065 && x < -745 && z > -1700 && z < -1010 && ringHas(gRing, x, z);
  const inField = (x, z) => x > -1290 && x < -910 && z > -1490 && z < -1000 && ringHas(FIELD_RING, x, z);
  const area = {
    info, catAt, inGarden, inField,
    /** the standing height on the gravel (the claimed surfaces lie at 0.03 - 0.04 m, the pavement at 0.12), or null */
    y: (x, z) => { const c = catAt(x, z); return c === 2 || c === 3 || c === 5 || c === 6 || c === 7 || c === 8 || c === 9 ? 0.04 : null; },
    /** the lattice may put a node here although the streets cover says "no pavement" (the gravel alleys, the plazas, the castle footways) */
    walk: (x, z) => catAt(x, z) >= 2,
    /** no node here at all: the Summer Garden lawns, bosquets and flower beds (rule: nobody walks on the lawns; the alleys and the squares are cat 3) */
    veto: (x, z) => { const k = idx(x, z); if (k >= 0 && lawn[k] && cat[k] < 2) return true; if (!inGarden(x, z)) return false; const c = catAt(x, z); return c !== 3 && c !== 5; },
    /** the zone weight of the surface itself (added to the hot spots of zones.js): the lattice exists where the weight is >= 0.16 */
    weight: (x, z) => { const c = catAt(x, z); return c === 5 ? 1.3 : c === 3 ? 0.62 : c === 6 ? 0.68 : c === 2 ? 0.34 : c === 4 ? 0.3 : c === 7 ? 0.5 : c === 8 ? 0.45 : c === 9 ? 0.5 : c === 10 ? 0.5 : c === 1 ? 0.2 : (inField(x, z) ? 0.03 : 0); },
    /** quiet-zone index for the head-count caps (people.js DENSITY.mars.zones): 0 Field + Suvorov Square + Marble Palace, 1 Summer Garden + the Neva embankment in front of it, 2 castle precinct, else -1 */
    zone: (x, z, m = 0) => {                                             // m > 0: also 'in the zone' when it is within ~m metres (the targets of the goals use a margin: people pass through the zone on the way, they do not queue up at its border)
      if (m > 0) { const k0 = area.zone(x, z); if (k0 >= 0) return k0; for (const [dx, dz] of [[m, 0], [-m, 0], [0, m], [0, -m]]) { const k = area.zone(x + dx, z + dz); if (k >= 0) return k; } return -1; }
      if (x > -1065 && x < -745 && z > -1710 && z < -1010 && (ringHas(gRing, x, z) || (z < -1590 && x > -1075 && x < -835 && z > -1710))) return 1;
      if (inField(x, z) || (Math.hypot(x + 1197, z + 1502) < 55) || (x > -1400 && x < -1290 && z > -1500 && z < -1400)) return 0;
      if (x > -810 && x < -640 && z > -960 && z < -700) return 2;
      // the south-west: 3 Mariinsky + Teatralnaya Square + Conservatory, 4 Yusupov Palace + garden, 5 New Holland island, 6 Nikolsky Cathedral + garden
      if (x < -1650 && !SW_OFF) {
        if ((x + 2930) * (x + 2930) + (z - 395) * (z - 395) < 170 * 170) return 4;
        if ((x + 3040) * (x + 3040) + (z - 740) * (z - 740) < 230 * 230) return 3;
        if (x > -3665 && x < -3285 && z > 155 && z < 480) return 5;
        if ((x + 2895) * (x + 2895) + (z - 1100) * (z - 1100) < 210 * 210) return 6;
        if ((x + 1746) * (x + 1746) + (z - 718) * (z - 718) < 120 * 120) return 7;                 // 7 Sennaya Square (low density)
      }
      return -1;
    },
  };
  // ---- the PETROGRAD SIDE / the SPIT (people/petroarea.js): its raster is composed into this one (the older reaches win where they overlap; its zones follow the eight zones above: PETRO_ZONE0 + local index)
  let PA = null; if (!PETRO_OFF && !globalThis.__petroOff) try { PA = makePetroArea(ctx, L, st); } catch (e) { console.error('[people] petro area failed:', e); }
  if (PA) {
    const b = { catAt: area.catAt, y: area.y, walk: area.walk, veto: area.veto, weight: area.weight, zone: area.zone };
    area.petro = PA; info.petro = PA.info; area.closed = (x, z) => PA.inBox(x, z) && PA.closed(x, z);                // (closed territory of the island: petroarea.js)
    area.y = (x, z) => { const y = b.y(x, z); return y !== null || !PA.inBox(x, z) ? y : PA.y(x, z); };
    area.walk = (x, z) => b.walk(x, z) || PA.walk(x, z);
    area.veto = (x, z) => b.veto(x, z) || PA.veto(x, z);
    area.weight = (x, z) => { const w = b.weight(x, z); return PA.inBox(x, z) ? Math.max(w, PA.weight(x, z)) : w; };
    area.zone = (x, z, m = 0) => {
      if (m > 0) { const k0 = area.zone(x, z); if (k0 >= 0) return k0; for (const [dx, dz] of [[m, 0], [-m, 0], [0, m], [0, -m]]) { const k = area.zone(x + dx, z + dz); if (k >= 0) return k; } return -1; }
      const k = b.zone(x, z); if (k >= 0) return k; const q = PA.zone(x, z); return q < 0 ? -1 : PETRO_ZONE0 + q;
    };
  }
  // ---- the ISLANDS of round 2 (people/isl2area.js: Yelagin, Kamenny, Aptekarsky, Petrovsky, the Krestovsky stadium): composed on top; its zones follow the older ones (opts.islBase + local index, people.js); ?isl=off / ?petro=off: none
  let IA = null; if (PA && !ISL_OFF && !globalThis.__islOff && opts.islBase >= 0) try { IA = makeIsl2Area(ctx, L, st); } catch (e) { console.error('[people] island area failed:', e); }
  if (IA) {
    const b = { y: area.y, walk: area.walk, veto: area.veto, weight: area.weight, zone: area.zone, closed: area.closed }, base = opts.islBase;
    area.isl = IA; info.isl = IA.info; area.islBase = base;
    area.closed = (x, z) => (b.closed ? b.closed(x, z) : false) || (IA.inBox(x, z) && IA.closed(x, z));
    area.y = (x, z) => { const y = b.y(x, z); return y !== null || !IA.inBox(x, z) ? y : IA.y(x, z); };
    area.walk = (x, z) => b.walk(x, z) || (IA.inBox(x, z) && IA.walk(x, z));
    area.veto = (x, z) => b.veto(x, z) || (IA.inBox(x, z) && IA.veto(x, z));
    area.weight = (x, z) => { const w = b.weight(x, z); return IA.inBox(x, z) ? Math.max(w, IA.weight(x, z)) : w; };
    area.zone = (x, z, m = 0) => {
      if (m > 0) { const k0 = area.zone(x, z); if (k0 >= 0) return k0; for (const [dx, dz] of [[m, 0], [-m, 0], [0, m], [0, -m]]) { const k = area.zone(x + dx, z + dz); if (k >= 0) return k; } return -1; }
      if (IA.inBox(x, z)) { const q = IA.zone(x, z); if (q >= 0) return base + q; }
      return b.zone(x, z);
    };
  }
  area.inPier = (() => { const ring = nh && nh.pier && nh.pier.ring; return (x, z) => !!ring && x > -3425 && x < -3370 && z > 315 && z < 385 && ringHas(ring, x, z); })();
  return area;
}
