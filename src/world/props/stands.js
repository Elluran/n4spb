// props/stands.js - trade and café life at street level in central Saint Petersburg, July (docs/research/nevsky.md section 7 + 11, streets.md section 5 + 9, people.md S4):
//   * summer verandas (летние веранды) in front of the POIS cafés / restaurants / bars / fast-food on the pavements: black iron railing 0.9 m with pink flower boxes, cane chairs,
//     round tables, burgundy / cream / green umbrellas, patio heaters, a chalk A-frame; the fabric awnings are the city module's. Rules: on the pavement against the facade of
//     the café's own building, never in front of a door (porch box), never on a crosswalk end / stop / metro portal, and the walking lane in front stays >= 2.9 m (Nevsky,
//     chain bollards at the kerb) / 2.5 m (other streets) to the carriageway;
//   * dark-green press kiosks (газетные киоски) at the metro exits and busy stops, ice-cream and blini carts with round umbrellas, souvenir cabins, tourist stalls with
//     postcards and matryoshkas around the Anichkov Bridge / the quay / Vosstaniya, river-boat ticket kiosks beside the piers;
//   * the 68 tubs with small trees of Nevsky (lilac, birch, maple), flower pots and black cast-iron urns beside shop doors, bike racks at shops, rows of rental scooters at the
//     metro exits and crossings, bike-share docks.
// Placement is driven by POIS and by the pavement stations (S.stations); everything registered in the occupancy registry + raster so nothing overlaps.
// KNOCKABLE (ctx.knock, core/knock.js; the KNOCK rows are in props/state.js): the press / excursion kiosks, cabins, ticket booths, hot-dog / souvenir carts and the chalk A-frames are linked to their
//   collider by S.add + S.box / S.solidBox; their fascias, posters and chalk boards are standalone panels (standPanel -> S.panelObj + S.attach) that the car throws along with the stand. Without
//   ctx.knock every panel is still a merged world-space quad: the module builds what it always built. Scooter rows (one collider per row) and tourist stalls stay solid.
import { POIS } from '../data/city.js';
import * as L from '../layout.js';
import { Geo, DEG, TAU, hash01, BOT, TOP, PX, NX } from './kit.js';
import { WEST_CAFES } from './west_sites.js';
import * as FUR from './furniture.js';
import { COL } from './furniture.js';
import { faceRot, nearestWall, streetClass, insideFp } from './sites.js';

const CANE = '#8a5f35', CANE_D = '#5f3f26', IRON = COL.black;

/** a fascia / poster / chalk board of a stand. The stand just placed (S.add + its collider) that is a linked knockable (ctx.knock, core/knock.js) gets a STANDALONE panel that is attached to it and
 *  travels with it when the car throws the stand over; everything else (no ctx.knock, a stand that is not knockable) keeps the merged world-space quad, so the build without ctx.knock is unchanged.
 *  The standalone quad stands 1.2 cm further out: the fascia of the press kiosk is coplanar with the pediment of its roof, which the merged quad (drawn after the static meshes) used to win by draw order */
export function standPanel(S, tex, cx, cy, cz, nx, nz, w, h, o = {}) {
  if (S.ctx.knock && S.last && S.last.rec) { const obj = S.panelObj(tex, cx + nx * 0.012, cy, cz + nz * 0.012, nx, nz, w, h, o); if (obj && S.attach(obj)) return obj; }
  S.panels.panel(tex, cx, cy, cz, nx, nz, w, h, o);
  return null;
}
const UMB = [COL.burgundy, '#efe8d4', COL.green, COL.navy];

// ------------------------------------------------------------------------------------------------------------------- geometry
/** a cane chair (seat, back, two side frames; 32 triangles) */
function chair(g, x, z, ry) {
  const c = new Geo();
  c.box(0.44, 0.04, 0.44, [0, 0.46, 0], CANE, null, BOT); c.box(0.44, 0.36, 0.03, [0, 0.66, -0.21], CANE, null, PX | NX | BOT);
  c.box(0.03, 0.46, 0.4, [-0.2, 0.23, 0], CANE_D, null, TOP | BOT); c.box(0.03, 0.46, 0.4, [0.2, 0.23, 0], CANE_D, null, TOP | BOT);       // the two side frames stand for the four legs
  g.put(c, x, 0, z, ry);
}
/** round table + chairs set (table 0.7 square on a pedestal, n cane chairs around it, optional umbrella; ~180 triangles with three chairs and an umbrella) */
function tableSet(rnd, n = 3, umb = null, top = '#f0ede4') {
  const g = new Geo();
  g.boxB(0.72, 0.04, 0.72, [0, 0.72, 0], top, null, BOT); g.tube([0, 0, 0], [0, 0.72, 0], 0.03, IRON, 4); g.boxB(0.4, 0.025, 0.4, [0, 0, 0], IRON, null, BOT);
  const spots = [[0, 0.62, Math.PI], [0, -0.62, 0], [-0.62, 0, Math.PI / 2], [0.62, 0, -Math.PI / 2]];
  for (let i = 0; i < n; i++) { const [x, z, ry] = spots[i]; chair(g, x, z, ry + (rnd() - 0.5) * 0.25); }
  if (umb) {
    g.tube([0, 0, 0], [0, 2.3, 0], 0.025, '#e8e4d8', 4);
    g.lathe([[0, 2.62], [1.2, 2.32], [1.2, 2.28], [0.0, 2.38]], [0, 0, 0], umb, 8);
  }
  return g;
}
/** the corner / intermediate posts of a railing run of length len along x (0.95 m, 10 triangles each) + a thin 3D top rail (8): the pickets are an alpha-tested strip drawn by the caller */
function railPosts(len, rail = true) {
  const g = new Geo(), n = Math.max(1, Math.round(len / 2.0)), s = len / n;
  for (let i = 0; i <= n; i++) g.boxB(0.06, 0.95, 0.06, [-len / 2 + i * s, 0, 0], IRON, null, BOT);
  if (rail) g.box(len, 0.04, 0.04, [0, 0.9, 0], IRON, null, PX | NX);
  return g;
}
const flowerBox = (len, rnd) => {                                   // a dark timber box with a green mat of foliage and small pink / white / red blooms (~50 triangles)
  const g = new Geo(); g.boxB(len, 0.2, 0.24, [0, 0, 0], '#5a4636', null, BOT); g.boxB(len - 0.04, 0.08, 0.2, [0, 0.2, 0], COL.leaf, null, BOT);
  const k = Math.max(3, Math.round(len * 2.5));
  for (let i = 0; i < k; i++) g.octa(0.07, 0.06, 0.07, [-len / 2 + 0.15 + i * (len - 0.3) / Math.max(1, k - 1), 0.34 + rnd() * 0.03, (rnd() - 0.5) * 0.08], COL.flower[Math.floor(rnd() * COL.flower.length)]);
  return g;
};

/** the terrace group (local frame: wall at z = 0, terrace extends to +z; x along the wall, centred): the entrance gap sits in the right end rail. The picket strips are panels (see placeTerraces) */
function terraceGeo(Lt, Dt, rnd, umbCols) {
  const g = new Geo();
  g.put(railPosts(Lt), 0, 0, Dt, 0); g.put(railPosts(Dt, true), -Lt / 2, 0, Dt / 2, Math.PI / 2);
  const gate = 1.0, seg = Dt - gate;                                         // right end: a rail of (Dt - 1.0) m from the wall side, leaving the gate at the front corner
  g.put(railPosts(seg, true), Lt / 2, 0, seg / 2, Math.PI / 2);
  g.put(flowerBox(Math.min(2.0, Lt * 0.35), rnd), -Lt * 0.25, 0.92, Dt, 0); g.put(flowerBox(Math.min(2.0, Lt * 0.35), rnd), Lt * 0.25, 0.92, Dt, 0);
  const nt = Math.max(2, Math.floor((Lt - 0.8) / 2.0)), tops = ['#f0ede4', '#e8f0f4', '#f4e8d0'];
  for (let i = 0; i < nt; i++) {
    const x = -Lt / 2 + 1.0 + i * ((Lt - 2.0) / Math.max(1, nt - 1)), z = Dt * 0.46 + (i % 2 ? 0.08 : -0.08);
    g.put(tableSet(rnd, 2 + Math.floor(rnd() * 3), (i % 2 === 0 || Dt > 2.3) ? umbCols[i % 2] : null, tops[i % 3]), x, 0, z, (rnd() - 0.5) * 0.3);
  }
  return g;
}

export function registerStandTypes(S) {
  const T = S.type;
  T('pressKiosk', () => FUR.pressKiosk());
  T('pressKiosk2', () => FUR.pressKiosk('#2c4a3c', 1.7, 1.7, 2.4, 0.8));            // K1 of the west dossier: 1.7 x 1.7 x 3.2 m
  T('excKiosk', () => FUR.excursionKiosk(2.2));                                     // K2
  T('cartRed', () => FUR.cartRedCanopy());                                          // K3
  T('cartHot0', () => FUR.cartHotdog('#7d1d2b'));                                   // K4
  T('cartHot1', () => FUR.cartHotdog('#efe8d4'));
  T('cartSouv', () => FUR.souvenirCart());                                          // K5
  T('cafeKiosk', () => FUR.cafeKiosk());                                            // K6
  T('iceCartHood', () => FUR.iceCartHood());                                        // K7
  T('ticketBooth', () => FUR.ticketBooth());                                        // K8
  T('cabinIce', () => FUR.cabin('#f1efe9', COL.blue, COL.blue, COL.blue, '#eef0f2'));
  T('cabinSouv', () => FUR.cabin('#d9b27a', '#8a5a36', '#7a4a2a', COL.burgundy, '#f4f4f0'));
  T('cabinBoats', () => FUR.cabin('#f4f4f0', '#1f56a8', '#1f56a8', '#1f56a8', '#f4f4f0'));
  T('stall0', () => FUR.touristStall(S.ctx.rng('stall0')));
  T('stall1', () => FUR.touristStall(S.ctx.rng('stall1')));
  T('iceCart0', () => FUR.iceCart(COL.burgundy));
  T('iceCart1', () => FUR.iceCart('#efe8d4'));
  T('iceCart2', () => FUR.iceCart(COL.green));
}

// ------------------------------------------------------------------------------------------------------------------- placement
const NEVSKY = 'Невский проспект';
const AW = { burgundy: COL.burgundy, red: '#b8262b', green: COL.green, cream: '#efe8d4', teal: '#2a8fa6' };
const idsOf = (s) => String(s || '').split(/[\s,/]+/).filter(Boolean);

/** summer verandas: the OSM POIS cafés (found through the pavement stations) + the cafés of the west dossier tables (west_sites.js: found through the wall edges of their house). Rules in the header. */
export function placeTerraces(S) {
  const { W, R, F } = S, grid = S.stGrid, cnt = S.standCnt = { terraces: 0, stands: 0, tubs: 0, racks: 0, scooters: 0, aframes: 0, press: 0, carts: 0, stalls: 0, boats: 0, pots: 0, docks: 0 };
  const dyn = S.dynGeo = new Geo();                                    // terraces: one static geometry
  const rnd = S.ctx.rng('terrace');
  const why = S.stats.terraceWhy = {}; let cur = null; const no = (k) => { why[k] = (why[k] || 0) + 1; if (cur) cur[k] = (cur[k] || 0) + 1; };
  const RAIL = S.sign.railing();

  const ok = (p) => (p.sub === 'cafe' || p.sub === 'restaurant' || p.sub === 'fast_food' || p.sub === 'bar' || p.sub === 'pub') && W.inPlay(p.x, p.z, -5) && !S.inForecourt(p.x, p.z);
  const sites = POIS.filter(ok).map((p) => ({ p, blds: p.bldg ? [L.buildingById(p.bldg)].filter(Boolean) : [], aw: null }));
  WEST_CAFES.forEach((c, i) => { const p = { id: 'wc' + i, x: c.x, z: c.z, name: c.a, sub: 'cafe' }; if (W.inPlay(p.x, p.z, -5)) sites.push({ p, blds: idsOf(c.id).map((id) => L.buildingById(id)).filter(Boolean), aw: AW[c.aw] || null, virt: true }); });
  // priority: the dossier cafés of the west first, then Nevsky and the main streets, then the rest; the cap keeps the triangle budget
  const cafes = sites.map((o) => {
    const p = o.p, rd = L.nearestRoad(p.x, p.z, { drivable: true, named: true, maxDist: 30 });
    return { ...o, nev: o.virt ? -1 : rd && rd.road.name === NEVSKY ? 0 : rd && /Фонтанк|Лиговск|Владимирск|Литейн|Марата|Рубинштейна|Восстания|Маяковск|Пушкинск|Мойки|Грибоедова|Морская|Конюшенн/.test(rd.road.name) ? 1 : 2, h: hash01(p.id, 'ter') };
  }).sort((a, b) => a.nev - b.nev || a.h - b.h);
  const CAP = 120, centres = [], SHIFT = [0, 1.6, -1.6, 3.2, -3.2, 4.8, -4.8, 6.4, -6.4];

  /** wall candidates of a house (west dossier cafés): every outer-ring edge >= 5 m long whose outward side has a pavement >= 4.4 m deep, as { x, z (wall point), tx, tz, nx, nz, poly, depth, lane } sampled every 2.5 m, deepest pavements first */
  const wallsOf = (blds, p) => {
    const out = [];
    for (const b of blds) for (const poly of b.polys) {
      const o = poly.o;
      for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
        const ax = o[j], az = o[j + 1], bx = o[i], bz = o[i + 1], len = Math.hypot(bx - ax, bz - az); if (len < 5) continue;
        const tx = (bx - ax) / len, tz = (bz - az) / len; let nx = tz, nz = -tx;
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        if (insideFp(mx + nx * 0.4, mz + nz * 0.4)) { nx = -nx; nz = -nz; }
        for (let u = 1.5; u < len - 1.0; u += 2.5) {
          const x = ax + tx * u, z = az + tz * u, sp = W.span(x + nx * 0.25, z + nz * 0.25, nx, nz, 12, F.ROAD | F.BLD | F.WATER | F.TREE);
          if (sp < 4.4) continue;
          const rd = L.roadsNear(x + nx * 4, z + nz * 4, 14, { drivable: true })[0];
          out.push({ x, z, tx, tz, nx, nz, poly, depth: sp, lane: rd && rd.road.name === NEVSKY ? 2.9 : 2.5, near: Math.hypot(x - p.x, z - p.z) });
        }
      }
    }
    return out.sort((a, b) => (b.depth >= 6 ? 1 : 0) - (a.depth >= 6 ? 1 : 0) || a.near - b.near);
  };

  /** try the sizes / slides of a terrace against ONE wall point wl; true when placed */
  const tryWall = (wl, lane, site, umbCols) => {
    const p = site.p;
    for (const [Lt, Dt] of [[6.0, 2.0], [4.6, 2.0], [3.4, 2.0], [3.4, 1.6]]) {
      // centre the terrace on the café's projection onto the wall (a dossier café: on the wall point itself), then slide it along the wall until it clears the doors
      const t0 = site.virt ? 0 : Math.max(-2.5, Math.min(2.5, (p.x - wl.x) * wl.tx + (p.z - wl.z) * wl.tz));
      for (const sh of SHIFT) {
        const tt = Math.max(-9, Math.min(9, t0 + sh)), cx0 = wl.x + wl.tx * tt, cz0 = wl.z + wl.tz * tt;
        const rot = faceRot(wl.nx, wl.nz), cx = cx0 + wl.nx * (0.14 + Dt / 2), cz = cz0 + wl.nz * (0.14 + Dt / 2);
        if (!W.fits(cx, cz, Lt, Dt, rot, { margin: 0.05, allow: F.BLD | F.LAWN | F.DOOR | F.PAVED })) { no('fits'); continue; }
        if (S.placed.near(cx, cz, Lt / 2 - 0.4)) { no('placed'); continue; }
        const fx = cx + wl.nx * (Dt / 2 + 0.1), fz = cz + wl.nz * (Dt / 2 + 0.1);
        if (W.span(fx, fz, wl.nx, wl.nz, 8, F.ROAD | F.BLD | F.TREE | F.WATER) < lane) { no('corridor'); continue; }
        // not in front of a door / porch (the box test along the whole run) and not on a metro portal / stop (registry)
        let door = false; for (let a = -Lt / 2; a <= Lt / 2 && !door; a += 0.8) for (let b = 0; b <= Dt + 0.3 && !door; b += 0.6) { const x = cx0 + wl.tx * a + wl.nx * (0.14 + b), z = cz0 + wl.tz * a + wl.nz * (0.14 + b); if (S.inDoorBox(x, z, 0.1)) door = true; }
        if (door) { no('door'); continue; }
        if (S.placed.near(cx, cz, Lt / 2, 'metro') || S.placed.near(cx, cz, Lt / 2, 'cross') || S.placed.near(cx, cz, Lt / 2, 'stop')) { no('reg'); continue; }
        if (S.placed.near(cx, cz, Math.hypot(Lt, Dt) / 2 - 0.2, 'lamp')) { no('lamp'); continue; }     // the nearest lamp must not stand inside the railing
        const ox = cx0 + wl.nx * 0.14, oz = cz0 + wl.nz * 0.14, y = S.levelAt(cx, cz);
        dyn.put(terraceGeo(Lt, Dt, rnd, umbCols), ox, y, oz, rot);
        // the picket strips (alpha-tested quads): front run, left end, right end (leaving the gate at the front corner)
        const co = Math.cos(rot), si = Math.sin(rot), wx = (lx, lz) => ox + lx * co + lz * si, wz = (lx, lz) => oz - lx * si + lz * co, seg = Dt - 1.0;
        S.panels.panel(RAIL, wx(0, Dt), y + 0.46, wz(0, Dt), si, co, Lt, 0.92, { alpha: true, u1: Lt / 0.6 });
        S.panels.panel(RAIL, wx(-Lt / 2, Dt / 2), y + 0.46, wz(-Lt / 2, Dt / 2), co, -si, Dt, 0.92, { alpha: true, u1: Dt / 0.6 });
        S.panels.panel(RAIL, wx(Lt / 2, seg / 2), y + 0.46, wz(Lt / 2, seg / 2), co, -si, seg, 0.92, { alpha: true, u1: seg / 0.6 });
        // colliders: front rail, left end, right end (leaving the gate at the front corner)
        const px = Math.cos(rot), pz = -Math.sin(rot);
        S.solidBox(cx + wl.nx * Dt / 2, cz + wl.nz * Dt / 2, Lt, 0.12, rot, 1.0);
        S.solidBox(cx - px * Lt / 2, cz - pz * Lt / 2, 0.12, Dt, rot, 1.0);
        S.solidBox(cx + px * Lt / 2 - wl.nx * 0.5, cz + pz * Lt / 2 - wl.nz * 0.5, 0.12, Dt - 1.0, rot, 1.0);
        S.W.reserveBox(cx, cz, Lt, Dt, rot); S.placed.add(cx, cz, Math.min(Lt / 2, 2.4), 'terrace');
        S.svc.terraces.push({ x: cx, z: cz, rotY: rot, w: Lt, d: Dt, name: p.name || '', poly: [[cx - px * Lt / 2 - wl.nx * Dt / 2, cz - pz * Lt / 2 - wl.nz * Dt / 2], [cx + px * Lt / 2 - wl.nx * Dt / 2, cz + pz * Lt / 2 - wl.nz * Dt / 2], [cx + px * Lt / 2 + wl.nx * Dt / 2, cz + pz * Lt / 2 + wl.nz * Dt / 2], [cx - px * Lt / 2 + wl.nx * Dt / 2, cz - pz * Lt / 2 + wl.nz * Dt / 2]] });
        // a patio heater or two inside, a chalk A-frame at the end of the terrace beside the pavement
        if (Lt >= 4.6 && R() < 0.6) { const hx = cx - px * (Lt / 2 - 0.5) - wl.nx * 0.2, hz = cz - pz * (Lt / 2 - 0.5) - wl.nz * 0.2; S.add('heater', hx, hz, 0); S.solidCyl(hx, hz, 0.25, 2.2); }
        const ax = cx0 + wl.nx * 1.15 + wl.tx * (Lt / 2 + 1.15), az = cz0 + wl.nz * 1.15 + wl.tz * (Lt / 2 + 1.15);
        if (W.fits(ax, az, 0.7, 0.8, rot, { margin: 0.02, allow: F.BLD }) && !S.inDoorBox(ax, az, 0.2) && W.span(ax, az, wl.nx, wl.nz, 5, F.ROAD) > lane) {
          S.add(R() < 0.5 ? 'aFrameR' : 'aFrameK', ax, az, rot);
          const lines = [['Бизнес-ланч', ['12:00 – 16:00', 'от 390 ₽', 'суп · горячее']], ['Кофе', ['Эспрессо 160 ₽', 'Капучино 220 ₽', 'Чай 150 ₽']], ['Летнее меню', ['окрошка', 'пельмени', 'морс']], ['Десерты', ['сырники', 'эклеры', 'мороженое']]][Math.floor(R() * 4)];
          const n = [Math.sin(rot), Math.cos(rot)], ya = S.levelAt(ax, az);
          S.solidBox(ax, az, 0.6, 0.8, rot, 1.0);                                   // (before the chalk board: it travels with the A-frame, see standPanel)
          standPanel(S, S.sign.chalk(lines[0], lines[1]), ax + n[0] * 0.2, ya + 0.56, az + n[1] * 0.2, n[0], n[1], 0.52, 0.8, { tilt: -0.42 });
          S.placed.add(ax, az, 0.5, 'aframe'); cnt.aframes++;
        }
        return true;
      }
    }
    return false;
  };

  for (const site of cafes) {
    const { p, blds } = site; cur = site.virt ? {} : null;
    if (cnt.terraces >= CAP) break;
    if (centres.some((c) => Math.hypot(c[0] - p.x, c[1] - p.z) < 9)) { no('dup'); continue; }
    const umbCols = site.aw ? [site.aw, '#efe8d4'] : [UMB[Math.floor(rnd() * UMB.length)], UMB[Math.floor(rnd() * UMB.length)]];
    let done = false;
    if (site.virt) {
      const walls = blds.length ? wallsOf(blds, p) : []; if (!walls.length) no('nowall');
      const tried = new Set();
      for (const wl of walls.slice(0, 40)) { const key = Math.round(wl.x / 2.5) + ',' + Math.round(wl.z / 2.5); if (tried.has(key)) continue; tried.add(key); if (tryWall(wl, wl.lane, site, umbCols)) { done = true; break; } }
    } else {
      const cand = grid ? grid.near(p.x, p.z, 34, (s) => s.eb < 8.6 && s.eb > 3.0 && streetClass(s) !== 'yard') : [];
      if (!cand.length) no('nocand');
      const tried = new Set();
      for (const { s: st } of cand.slice(0, 70)) {
        const wl = nearestWall(st.x - st.nx * st.eb, st.z - st.nz * st.eb, 2.5);
        if (!wl || Math.abs(wl.tx * st.tx + wl.tz * st.tz) < 0.92) { no('wall'); continue; }
        if (blds.length && !blds.some((b) => b.polys.includes(wl.poly))) { no('bld'); continue; }
        const key = Math.round(wl.x * 0.5) + ',' + Math.round(wl.z * 0.5); if (tried.has(key)) continue; tried.add(key);
        if (tryWall(wl, streetClass(st) === 'nevsky' ? 2.9 : 2.5, site, umbCols)) { done = true; break; }
      }
    }
    if (done) { centres.push([p.x, p.z]); cnt.terraces++; }
    else if (site.virt) (S.stats.terraceMissed ||= []).push(p.name + '@' + Math.round(p.x) + ',' + Math.round(p.z) + JSON.stringify(cur));
    cur = null;
  }
  S.stats.terraces = cnt.terraces;
  void TAU; void DEG;
}

/** a kiosk-like object on the pavement at a station: kerb-side placement with the walking lane kept free behind it */
function standSpot(S, st, w, d, gapKerb = 1.0, lane = 2.9) {
  const { W, F } = S;
  const px = st.x + st.nx * (Math.min(st.ek, 9) - gapKerb - d / 2), pz = st.z + st.nz * (Math.min(st.ek, 9) - gapKerb - d / 2), rot = faceRot(-st.nx, -st.nz);
  if (st.ek - gapKerb - d < 1.0) return null;
  if (!W.fits(px, pz, w, d, rot, { margin: 0.15, allow: F.LAWN }) || S.placed.near(px, pz, Math.max(w, d) / 2 + 0.6) || S.inDoorBox(px, pz, 1.2)) return null;
  if (S.placed.near(px, pz, Math.max(w, d) / 2 + 1.5, 'cross') || S.placed.near(px, pz, Math.max(w, d) / 2 + 1.0, 'metro')) return null;
  if (W.span(px - st.nx * (d / 2 + 0.1), pz - st.nz * (d / 2 + 0.1), -st.nx, -st.nz, 9, F.BLD | F.TREE | F.WATER) < lane) return null;
  return { px, pz, rot };
}

export function placeStands(S) {
  const { W, R, F } = S, sts = S.stations || [], grid = S.stGrid, cnt = S.standCnt, T = S.sign;
  const hubs = {
    press: [...((S.ctx.services.metro && S.ctx.services.metro.entrances) || []).filter((e) => e.kind === 'entrance').map((e) => [e.x, e.z]), ...((S.st && S.st.busStops) || []).filter((b) => b.shelter).map((b) => [b.x, b.z])],
    tour: [[-425, -85], [-455, -60], [-395, -120], [490, 120], [-160, 500], [-205, 105], [140, 30]],
  };
  const near = (pts, st, d) => pts.reduce((a, q) => a + Math.exp(-Math.hypot(q[0] - st.x, q[1] - st.z) / d), 0);
  const taken = [];
  const free = (st, gap) => !taken.some((t) => Math.hypot(t[0] - st.x, t[1] - st.z) < gap);

  // ---- dark-green press kiosks near the metro exits and the busiest stops (5-6 in the map), faces to the walkway
  { const sc = sts.filter((st) => st.x > -595 && /Невск|Лиговск|Владимирск|Литейн|Маяковск|Восстания/.test(st.rn) && !S.inForecourt(st.x, st.z, 6) && W.inPlay(st.x, st.z, 4) && st.eb > 4.2 && st.ek > 2.6).map((st) => ({ st, a: near(hubs.press, st, 22) + R() * 0.2 })).sort((x, y) => y.a - x.a);
    for (const { st, a } of sc) {
      if (cnt.press >= 6 || a < 0.35) break;
      if (!free(st, 90)) continue;
      const sp = standSpot(S, st, 2.5, 1.7, 1.2, 2.9); if (!sp) continue;
      S.add('pressKiosk', sp.px, sp.pz, sp.rot); S.box(sp.px, sp.pz, 2.4, 1.6, sp.rot, 2.8, { r: 1.5, tag: 'kiosk' });
      const n = [Math.sin(sp.rot), Math.cos(sp.rot)], y = S.levelAt(sp.px, sp.pz);
      standPanel(S, T.fascia('ПЕЧАТЬ', '#2f4f43', '#f3eedf', 'газеты · журналы'), sp.px + n[0] * 0.82, y + 2.2, sp.pz + n[1] * 0.82, n[0], n[1], 1.6, 0.34, { lit: true });
      standPanel(S, T.cityLight(2), sp.px + n[0] * 0.865, y + 1.15, sp.pz + n[1] * 0.865, n[0], n[1], 1.5, 0.9, { lit: true });
      S.svc.kiosks.push({ x: sp.px, z: sp.pz, rotY: sp.rot, kind: 'press' }); taken.push([st.x, st.z]); cnt.press++;
    }
  }

  // ---- tourist life around the Anichkov Bridge, the quay, Vosstaniya and Vladimirskaya: stalls, souvenir / ice-cream cabins, boat tickets, carts
  { const sc = sts.filter((st) => st.x > -595 && !S.inForecourt(st.x, st.z, 6) && W.inPlay(st.x, st.z, 4) && st.eb > 4.0 && st.ek > 2.4 && /Невск|Фонтанк|Лиговск|Владимирск|Литейн|Маяковск|Восстания/.test(st.rn)).map((st) => ({ st, a: near(hubs.tour, st, 40) + near(hubs.press, st, 30) * 0.5 + R() * 0.3 })).sort((x, y) => y.a - x.a);
    const kinds = [['cabinIce', 3, 'МОРОЖЕНОЕ', '#2f64b5'], ['cabinSouv', 3, 'СУВЕНИРЫ', '#8a5a36'], ['stall0', 3, null, null], ['stall1', 2, null, null], ['iceCart0', 3, null, null], ['iceCart1', 2, null, null], ['iceCart2', 2, null, null]];
    for (const [type, want, text, col] of kinds) {
      let got = 0;
      for (const { st, a } of sc) {
        if (got >= want || a < 0.3) break;
        if (!free(st, type.startsWith('stall') ? 60 : type === 'cabinBoats' ? 120 : 70)) continue;
        const dims = type.startsWith('cabin') ? [2.7, 2.1] : type.startsWith('stall') ? [3.2, 2.0] : [1.5, 1.3];
        const sp = standSpot(S, st, dims[0], dims[1], 1.1, 2.9); if (!sp) continue;
        S.add(type, sp.px, sp.pz, sp.rot);
        const n = [Math.sin(sp.rot), Math.cos(sp.rot)], y = S.levelAt(sp.px, sp.pz);
        if (type.startsWith('cabin')) {
          S.box(sp.px, sp.pz, 2.4, 1.8, sp.rot, 2.6, { r: 1.7, tag: 'stand' });
          if (type === 'cabinBoats') standPanel(S, T.boats(), sp.px + n[0] * 0.6, y + 2.88, sp.pz + n[1] * 0.6, n[0], n[1], 2.2, 0.82, { lit: true });
          else standPanel(S, T.fascia(text, col), sp.px + n[0] * 0.545, y + 2.9, sp.pz + n[1] * 0.545, n[0], n[1], 2.1, 0.54, { lit: true });
          cnt.stands++;
        } else if (type.startsWith('stall')) { S.box(sp.px, sp.pz, 3.0, 1.8, sp.rot, 2.6, { r: 1.7, tag: 'stand' }); cnt.stalls++; S.svc.stalls.push({ x: sp.px, z: sp.pz, rotY: sp.rot }); }
        else { S.box(sp.px, sp.pz, 1.3, 1.0, sp.rot, 1.1, { r: 1.0, tag: 'stand' }); cnt.carts++; }
        S.svc.kiosks.push({ x: sp.px, z: sp.pz, rotY: sp.rot, kind: type });
        taken.push([st.x, st.z]); got++;
      }
    }
  }

  // ---- river-boat ticket kiosks beside the piers of landmarksC (people.md S4 spot 4: queue for boat tickets), a few metres inland from the stair head, front to the quay
  for (const pr of ((S.ctx.services.landmarksC && S.ctx.services.landmarksC.piers) || []).slice(0, 3)) {
    let done = false;
    for (const d of [5.5, 7, 4.5, 9]) { for (const tt of [3.2, -3.2, 5.2, -5.2, 0]) {
      const px = pr.stair.x + pr.nx * d + pr.tx * tt, pz = pr.stair.z + pr.nz * d + pr.tz * tt, rot = faceRot(-pr.nx, -pr.nz);
      if (!W.fits(px, pz, 2.8, 2.2, rot, { margin: 0.15, allow: F.LAWN }) || S.placed.near(px, pz, 2.0) || S.inDoorBox(px, pz, 1.2)) continue;
      if (W.span(px + pr.nx * 1.3, pz + pr.nz * 1.3, pr.nx, pr.nz, 6, F.ROAD | F.BLD | F.TREE) < 2.4) continue;
      S.add('cabinBoats', px, pz, rot); S.box(px, pz, 2.4, 1.8, rot, 2.6, { r: 1.7, tag: 'stand' });
      const n = [Math.sin(rot), Math.cos(rot)], y = S.levelAt(px, pz);
      standPanel(S, T.boats(), px + n[0] * 0.6, y + 2.88, pz + n[1] * 0.6, n[0], n[1], 2.2, 0.82, { lit: true });
      S.svc.kiosks.push({ x: px, z: pz, rotY: rot, kind: 'cabinBoats' }); cnt.stands++; cnt.boats++; done = true; break;
    } if (done) break; }
  }

  // ---- the tubs with small trees of Nevsky (68 in the city; here along both pavements, at the facade line, in singles and pairs), also Ligovsky / Vosstaniya near the square
  { let nxt = new Map(), lastLine = -1, nextS = 0, i = 0; const tubs = ['tubBirch', 'tubMaple', 'tubLilac'];
    for (const st of sts) {
      if (!((st.rn === NEVSKY && st.x > -900) || (/Лиговск|Восстания/.test(st.rn) && Math.hypot(st.x - L.SQUARE.x, st.z - L.SQUARE.z) < 260)) || !W.inPlay(st.x, st.z, 3) || S.inForecourt(st.x, st.z, 6)) continue;        // west of Malaya Sadovaya the avenue has no tubs (dossier 7: Anichkov Palace, Malaya Sadovaya, the station, the arch)
      if (st.line !== lastLine) { lastLine = st.line; nextS = st.s + R() * 30; }
      if (st.s < nextS || st.eb < 3.6) continue;
      const wl = nearestWall(st.x - st.nx * st.eb, st.z - st.nz * st.eb, 2.5);
      if (!wl || Math.abs(wl.tx * st.tx + wl.tz * st.tz) < 0.9) { nextS = st.s + 2; continue; }
      let placed = 0;
      for (const k of [0, 1.3]) {
        const px = wl.x + wl.nx * 0.95 + wl.tx * k, pz = wl.z + wl.nz * 0.95 + wl.tz * k;
        if (!W.fits(px, pz, 1.2, 1.2, 0, { margin: 0.05, allow: F.LAWN | F.BLD }) || S.inDoorBox(px, pz, 0.9) || S.placed.near(px, pz, 1.2) || S.placed.near(px, pz, 1.8, 'cross') || S.placed.near(px, pz, 2.4, 'metro')) continue;
        if (W.span(px + wl.nx * 0.6, pz + wl.nz * 0.6, wl.nx, wl.nz, 8, F.ROAD | F.WATER) < 2.9) continue;
        S.add(tubs[i++ % 3], px, pz, R() * 6.28); S.solidCyl(px, pz, 0.52, 1.0); S.occupy(px, pz, 0.8, 'tub'); S.svc.planters.push({ x: px, z: pz }); cnt.tubs++; placed++;
      }
      nextS = st.s + (placed ? 12 + R() * 22 : 3);
    }
    void nxt;
  }

  // ---- bicycle racks at shops / cafés / banks on the pavements; rows of rental scooters at the metro exits, crossings and the station side
  const shopsP = POIS.filter((p) => (p.kind === 'shop' || p.sub === 'cafe' || p.sub === 'restaurant' || p.sub === 'bank' || p.sub === 'pharmacy' || p.sub === 'fast_food') && W.inPlay(p.x, p.z, -5) && !S.inForecourt(p.x, p.z));
  for (const p of shopsP) {
    if (hash01(p.id, 'rack') > 0.12 || !grid) continue;
    for (const { s: st } of grid.near(p.x, p.z, 16, (s) => s.eb > 2.4 && s.eb < 8 && s.rn !== NEVSKY).slice(0, 25)) {
      const wl = nearestWall(st.x - st.nx * st.eb, st.z - st.nz * st.eb, 2.5);
      if (!wl || Math.abs(wl.tx * st.tx + wl.tz * st.tz) < 0.92) continue;
      const rack = hash01(p.id, 'r3') < 0.5 ? 'rack3' : 'rack5', len = rack === 'rack3' ? 1.4 : 2.6;
      const cx = wl.x + wl.nx * 0.55, cz = wl.z + wl.nz * 0.55, rot = Math.atan2(-wl.tz, wl.tx);
      if (!W.fits(cx, cz, len + 0.2, 0.9, rot, { margin: 0.02, allow: F.BLD }) || S.placed.near(cx, cz, len / 2 + 0.3) || S.inDoorBox(cx, cz, len / 2) || W.span(cx + wl.nx * 0.6, cz + wl.nz * 0.6, wl.nx, wl.nz, 6, F.ROAD) < 2.4) continue;
      S.add(rack, cx, cz, rot); S.box(cx, cz, len, 0.35, rot, 0.8, { r: len / 2 + 0.2, tag: 'rack' }); S.svc.racks.push({ x: cx, z: cz }); cnt.racks++; break;
    }
  }
  { let nsc = 0;
    const spots = [...((S.ctx.services.metro && S.ctx.services.metro.entrances) || []).map((e) => [e.x + Math.sin(e.rotY) * 3, e.z + Math.cos(e.rotY) * 3, 'm']), ...((S.st && S.st.crosswalks) || []).filter((c) => hash01(c.id, 'sc') < 0.2).map((c) => [c.x, c.z, 'c'])];
    for (const [sx, sz] of spots) {
      if (nsc >= 6 || sx < -595 || !W.inPlay(sx, sz, 5) || S.inForecourt(sx, sz, 4)) continue;                // rental scooters: east only (parking is banned in the central districts, dossier 1.13)
      const near2 = grid ? grid.near(sx, sz, 22, (s) => s.eb > 2.2 && s.ek > 1.6) : [];
      for (const { s: st } of near2.slice(0, 30)) {
        const n = 5 + Math.floor(R() * 4), rot = Math.atan2(-st.tz, st.tx), off = Math.min(st.ek, 8) - 0.95;
        const cx = st.x + st.nx * off, cz = st.z + st.nz * off;
        if (off < 0.5 || !W.fits(cx, cz, n * 0.55 + 0.4, 1.0, rot, { margin: 0.05 }) || S.placed.near(cx, cz, n * 0.28 + 0.6) || S.inDoorBox(cx, cz, n * 0.28) || S.placed.near(cx, cz, n * 0.28 + 3.5, 'cross') || S.placed.near(cx, cz, n * 0.28 + 2.5, 'metro')) continue;
        if (W.span(cx - st.nx * 0.6, cz - st.nz * 0.6, -st.nx, -st.nz, 9, F.BLD | F.TREE | F.WATER) < 2.5) continue;
        for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 0.55; S.add('scooter', cx + st.tx * o, cz + st.tz * o, faceRot(st.nx, st.nz) + (hash01(sx, i) - 0.5) * 0.25); }
        S.box(cx, cz, n * 0.55, 0.5, rot, 1.0, { r: n * 0.28, tag: 'scooters' }); cnt.scooters += n; nsc++;
        { const sx = cx + st.tx * (n * 0.28 + 0.45), sz = cz + st.tz * (n * 0.28 + 0.45);                 // the blue "scooter parking" tab on a pole at the end of the row
          if (W.fits(sx, sz, 0.3, 0.3, 0, { margin: 0.02 }) && !S.placed.near(sx, sz, 0.5)) { const fr = faceRot(st.nx, st.nz), nn = [Math.sin(fr), Math.cos(fr)]; S.add('signPole', sx, sz, 0); S.panels.panel(T.park(), sx + nn[0] * 0.04, S.levelAt(sx, sz) + 1.75, sz + nn[1] * 0.04, nn[0], nn[1], 0.4, 0.4, {}); S.solidCyl(sx, sz, 0.08, 2.0); S.occupy(sx, sz, 0.3, 'sign'); } }
        break;
      }
    }
  }
  if (!S.dynGeo.empty) S.addStaticGeo(S.dynGeo, 'pr-terraces');
  S.stats.stands = cnt;
}
void streetClass;
