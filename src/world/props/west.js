// props/west.js - the tourist-centre furniture of the WEST (Nevsky Prospekt from Gostiny Dvor to the Admiralty, Kazan, Palace Square surroundings, the Moika / Griboedov / Winter Canal and the Neva quays),
// from docs/research/west-life-furniture.md section 2.6 + 4.3 + 4.4 + 7, kazan-cathedral.md section 9 and palace-square-hermitage.md section 12-13:
//   * K1 dark-green press / ticket pavilions (1.7 x 1.7 x 3.2 m, lit theatre posters) at Gostiny Dvor / Sadovaya, the Nevsky Prospekt metro and Admiralteyskaya;
//   * K2 glazed "excursion" kiosks on the Gostiny Dvor pavement; K3 red-canopy carts at the Kazan garden fence (W end, fountain axis, E end); K4 hot-dog carts with umbrellas (Kazan fence, Palace
//     Embankment, the Admiralty); K5 souvenir carts (Kazan - Moika stretch, the Bolshaya Morskaya block by the arch); K6 a cafe kiosk with a parasol on the Admiralteyskaya embankment; K7 an
//     ice-cream cart at the Winter Palace corner of the Alexander Garden; K8 ticket booths beside the river-pier descents (Kazan landing on the Griboedov Canal, Moika, Winter Canal, Palace Embankment);
//   * the lime tubs of the Bolshaya Morskaya block towards the General Staff arch (dossier 7: 10-20 tubs, 3.5-4.5 m trees) and the low round concrete planters at the MANMADE `planter` nodes
//     (Nevsky edge of the Kazan garden, Isaac's garden ...);
//   * flower baskets on black brackets beside the shop doors of Nevsky / the Morskaya / Konyushennaya streets.
// NOT built on purpose: the souvenir pavilions of the Griboedov embankment at Spas na Krovi (dismantled 21 Jan 2025: the street stays empty), horse carriages (people / traffic), scooter docks (banned in the
// centre), anything on the Palace Square stone field (W flag SQUARE), flags / flagpoles, corporate logos (plain generic wordmarks: ПЕЧАТЬ, ЭКСКУРСИИ, КОФЕ ...).
import * as L from '../layout.js';
import { MANMADE } from '../data/city.js';
import { hash01 } from './kit.js';
import { faceRot, nearestWall } from './sites.js';
import { standPanel } from './stands.js';

// ------------------------------------------------------------------------------------------------------------------- the curated sites
// at = anchor (map metres); R = search radius; face: 'away' (front looks away from the carriageway: pavement kiosks) | 'road' (carts: front to the street); pav: allow claimed paving (Gostiny promenade)
const SITES = [
  // K1 press / ticket pavilions
  { t: 'pressKiosk2', at: [-1012, -228], R: 22, pav: true, tag: 'press', text: 'ПЕЧАТЬ', sub: 'газеты · билеты' },           // Gostiny Dvor, Sadovaya corner
  { t: 'pressKiosk2', at: [-1146, -255], R: 22, pav: true, tag: 'press', text: 'БИЛЕТЫ', sub: 'театр · концерты' },
  { t: 'pressKiosk2', at: [-1352, -330], R: 20, tag: 'press', text: 'ПЕЧАТЬ', sub: 'газеты · журналы' },                      // Nevsky Prospekt metro / Kazan Bridge
  { t: 'pressKiosk2', at: [-2108, -496], R: 22, pav: true, tag: 'press', text: 'ПЕЧАТЬ', sub: 'газеты · журналы' },                      // Admiralteyskaya
  // K2 glazed excursion kiosks
  { t: 'excKiosk', at: [-1036, -234], R: 20, pav: true, tag: 'exc' },
  { t: 'excKiosk', at: [-1096, -246], R: 20, pav: true, tag: 'exc' },
  { t: 'excKiosk', at: [-1203, -268], R: 18, pav: true, tag: 'exc' },                                                                   // Duma / Mikhailovskaya corner
  // K3 red-canopy carts at the Kazan garden fence
  { t: 'cartRed', at: [-1505, -322], R: 16, face: 'road', pav: true, tag: 'cart' },
  { t: 'cartRed', at: [-1468, -314], R: 14, face: 'road', pav: true, tag: 'cart' },
  { t: 'cartRed', at: [-1428, -296], R: 14, face: 'road', pav: true, tag: 'cart' },
  // K4 hot-dog carts
  { t: 'cartHot0', at: [-1448, -312], R: 14, face: 'road', pav: true, tag: 'hot', text: 'ГОРЯЧИЕ СОСИСКИ', sub: 'колбаска гриль' },     // Kazan fence, Singer end
  { t: 'cartHot1', at: [-2150, -990], R: 24, face: 'road', tag: 'hot', text: 'ГОРЯЧИЕ СОСИСКИ', sub: 'колбаска гриль' },     // Palace Embankment
  { t: 'cartHot0', at: [-2330, -840], R: 24, face: 'road', tag: 'hot', text: 'ГОРЯЧИЕ СОСИСКИ', sub: 'колбаска гриль' },     // Admiralty garden gate
  // K5 souvenir carts: Kazan - Moika stretch, the arch end of Bolshaya Morskaya
  { t: 'cartSouv', at: [-1562, -372], R: 16, face: 'road', tag: 'souv', text: 'СУВЕНИРЫ', sub: 'матрёшки · магниты' },
  { t: 'cartSouv', at: [-1652, -392], R: 16, face: 'road', tag: 'souv', text: 'СУВЕНИРЫ', sub: 'матрёшки · магниты' },
  { t: 'cartSouv', at: [-1722, -409], R: 16, face: 'road', tag: 'souv', text: 'СУВЕНИРЫ', sub: 'матрёшки · магниты' },
  { t: 'cartSouv', at: [-1913, -590], R: 14, face: 'road', tag: 'souv', text: 'ПОДАРКИ', sub: 'открытки · магниты', free: true },
  { t: 'stall0', at: [-1905, -560], R: 14, face: 'road', tag: 'stall', free: true },                                          // the tents of the pedestrian block (dossier 4.4 / palace 13)
  // K6 cafe kiosk with a parasol on the Admiralteyskaya embankment
  { t: 'cafeKiosk', at: [-2373, -806], R: 30, pav: true, face: 'road', tag: 'cafe', text: 'КОФЕ · ВЫПЕЧКА', sub: null, rd: /Адмиралтейская набережная/ },
  // K7 ice-cream cart at the Winter Palace corner of the Alexander Garden
  { t: 'iceCartHood', at: [-2216, -770], R: 26, face: 'road', tag: 'ice', hard: true },
];

// FACE = the footprint searched for (incl. what hangs over: canopies, umbrellas); BODY = the solid collider
const FACE = { pressKiosk2: [1.9, 1.9], excKiosk: [2.4, 2.4], cartRed: [2.0, 1.5], cartHot0: [2.2, 1.8], cartHot1: [2.2, 1.8], cartSouv: [1.7, 1.2], cafeKiosk: [3.3, 2.4], iceCartHood: [1.3, 1.0], stall0: [3.2, 2.0], ticketBooth: [1.6, 1.6] };
const BODY = { pressKiosk2: [1.8, 1.8], excKiosk: [2.3, 2.3], cartRed: [1.7, 1.0], cartHot0: [1.5, 0.9], cartHot1: [1.5, 0.9], cartSouv: [1.6, 0.9], cafeKiosk: [3.0, 2.0], iceCartHood: [1.3, 0.9], stall0: [3.0, 1.8], ticketBooth: [1.5, 1.5] };

export function placeWest(S) {
  const { W, F, T = S.sign } = S, cnt = { sites: 0, missed: [], booths: 0, limeTubs: 0, planters: 0, baskets: 0 };
  const PAVED = F.PAVED || 0;
  const doorHit = (x, z, w, d, rot) => { const c = Math.cos(rot), s = Math.sin(rot); for (const [a, b] of [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lx = a * (w / 2 + 0.2), lz = b * (d / 2 + 0.2); if (S.inDoorBox(x + lx * c + lz * s, z - lx * s + lz * c, 0)) return true; } return false; };
  const roadAt = (x, z, re) => { const rs = L.roadsNear(x, z, 45, { drivable: true }); return re ? rs.find((r) => re.test(r.road.name || '')) || rs[0] : rs[0]; };

  /** the free spot nearest to `at`: expanding rings; the footprint (inflated by 0.8 m: a walking lane round it) must clear every blocking flag, doors, crossings, stops, metro, other props */
  const findSpot = (o, w, d) => {
    const allow = (o.pav ? PAVED : 0) | F.DOOR;                                   // the 3 x 3.2 m door boxes are tested exactly below (corners), not by the raster
    for (let r = 0; r <= o.R; r += 1.0) {
      const n = r === 0 ? 1 : Math.max(8, Math.round(r * 1.6)), a0 = hash01(o.at[0], o.at[1], r) * 6.2832;
      for (let k = 0; k < n; k++) {
        const a = a0 + (k / n) * 6.2832, x = o.at[0] + Math.cos(a) * r, z = o.at[1] + Math.sin(a) * r;
        if (!W.inPlay(x, z, 2) || S.inForecourt(x, z)) continue;
        const rd = roadAt(x, z, o.rd); if (!rd) continue;
        const rot = o.face === 'road' ? faceRot(rd.x - x, rd.z - z) : faceRot(x - rd.x, z - rd.z);
        if (!W.fits(x, z, w + 1.0, d + 1.0, rot, { margin: 0.1, allow })) continue;
        if (o.hard && (W.at(x, z) & F.LAWN || !(W.at(x, z) & F.PATH) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => W.at(x + a * 1.2, z + b * 1.2) & F.LAWN))) continue;   // a cart stands on a hard surface, not on the grass
        if (S.placed.near(x, z, Math.max(w, d) / 2 + 0.7) || doorHit(x, z, w, d, rot)) continue;
        if (S.placed.near(x, z, Math.max(w, d) / 2 + 1.5, 'cross') || S.placed.near(x, z, Math.max(w, d) / 2 + 1.0, 'metro') || S.placed.near(x, z, Math.max(w, d) / 2 + 1.0, 'stop')) continue;
        return { x, z, rot };
      }
    }
    return null;
  };

  /** the fascias / posters of a knockable (kiosk, cart, booth) are standalone panels that the car throws along with it (standPanel); the cafe kiosk is not knockable */
  const panelsFor = (o, x, z, rot, y) => {
    const n = [Math.sin(rot), Math.cos(rot)];
    if (o.t === 'pressKiosk2') {
      standPanel(S, T.fascia(o.text, '#2c4a3c', '#f3eedf', o.sub), x + n[0] * 0.9, y + 2.22, z + n[1] * 0.9, n[0], n[1], 1.3, 0.34, { lit: true });
      standPanel(S, T.cityLight(3), x + n[0] * 0.915, y + 1.15, z + n[1] * 0.915, n[0], n[1], 1.25, 0.95, { lit: true });
    } else if (o.t === 'excKiosk') {
      standPanel(S, T.fascia('ЭКСКУРСИИ', '#1f56a8', '#ffffff', 'Петергоф · Пушкин · Павловск'), x + n[0] * 1.075, y + 1.85, z + n[1] * 1.075, n[0], n[1], 1.8, 0.5, { lit: true });
      standPanel(S, T.cityLight(5), x + n[0] * 1.075, y + 1.1, z + n[1] * 1.075, n[0], n[1], 1.5, 0.75, { lit: true });
    } else if (o.t.startsWith('cartHot')) {
      standPanel(S, T.fascia(o.text, '#7d1d2b', '#f3eedf', o.sub), x + n[0] * 0.37, y + 0.55, z + n[1] * 0.37, n[0], n[1], 1.2, 0.3, {});
    } else if (o.t === 'cartSouv') {
      standPanel(S, T.fascia(o.text, '#8a5a36', '#f6eedc', o.sub), x + n[0] * 0.41, y + 0.62, z + n[1] * 0.41, n[0], n[1], 1.2, 0.3, {});
    } else if (o.t === 'cafeKiosk') {
      S.panels.panel(T.fascia(o.text, '#6a3a28', '#f3eedf', null), x + n[0] * 0.98, y + 2.0, z + n[1] * 0.98, n[0], n[1], 2.4, 0.4, { lit: true });
    } else if (o.t === 'ticketBooth') {
      standPanel(S, T.boats(), x + n[0] * 0.74, y + 1.62, z + n[1] * 0.74, n[0], n[1], 1.3, 0.48, { lit: true });
    }
  };

  const put = (o, sp) => {
    const [w, d] = FACE[o.t] || [2, 2], y = S.levelAt(sp.x, sp.z);
    S.add(o.t, sp.x, sp.z, sp.rot);
    const [bw, bd] = BODY[o.t] || [w - 0.2, d - 0.2];
    S.box(sp.x, sp.z, bw, bd, sp.rot, o.t.startsWith('cart') || o.t === 'iceCartHood' ? 1.2 : 2.6, { r: Math.max(w, d) / 2, tag: o.t === 'cartRed' || o.t.startsWith('cartHot') || o.t === 'cartSouv' || o.t === 'iceCartHood' ? 'stand' : 'kiosk' });
    panelsFor(o, sp.x, sp.z, sp.rot, y);
    S.svc.kiosks.push({ x: sp.x, z: sp.z, rotY: sp.rot, kind: o.t === 'pressKiosk2' ? 'press' : o.t });
    if (o.t === 'stall0') S.svc.stalls.push({ x: sp.x, z: sp.z, rotY: sp.rot });
  };

  for (const o of SITES) {
    const [w, d] = FACE[o.t] || [2, 2], sp = findSpot(o, w, d);
    if (!sp) { cnt.missed.push(o.t + '@' + o.at.join(',')); continue; }
    put(o, sp); cnt.sites++;
  }

  // ---- K8 ticket booths beside the descents that carry a pier (the stair head stands on the quay top; n = the inland normal, the descent runs along t)
  const quay = S.ctx.services.environment && S.ctx.services.environment.quay;
  for (const st of ((quay && quay.allStairs) || []).filter((q) => q.pier && q.key !== 'fontanka').slice(0, 14)) {
    if (!W.inPlay(st.x, st.z, 3)) continue;
    let done = false;
    for (const [dn, dt] of [[3.6, 0], [3.6, 3.0], [3.6, -3.0], [4.8, 0], [4.8, 3.4], [4.8, -3.4], [6.0, 0]]) {
      const x = st.x + st.nx * dn + st.tx * dt, z = st.z + st.nz * dn + st.tz * dt, rot = faceRot(-st.nx, -st.nz);
      if (!W.fits(x, z, 1.5 + 1.2, 1.5 + 1.2, rot, { margin: 0.1, allow: PAVED }) || S.placed.near(x, z, 1.8) || S.inDoorBox(x, z, 0.8)) continue;
      put({ t: 'ticketBooth' }, { x, z, rot }); cnt.booths++; done = true; break;
    }
    void done;
  }

  // ---- the lime tubs of the Bolshaya Morskaya block (pedestrian, towards the General Staff arch): two rows at the edges of the walkway
  { const A = [-1896, -452], B = [-1917, -622], len = Math.hypot(B[0] - A[0], B[1] - A[1]), dx = (B[0] - A[0]) / len, dz = (B[1] - A[1]) / len, nx = -dz, nz = dx; let k = 0;
    for (let s = 12; s < len - 6 && cnt.limeTubs < 18; s += 10.5) {
      const px = A[0] + dx * s, pz = A[1] + dz * s;
      for (const side of [1, -1]) {
        const sp = W.span(px, pz, nx * side, nz * side, 24, F.BLD | F.ROAD | F.WATER); if (sp < 8) continue;
        const x = px + nx * side * (sp - 2.2), z = pz + nz * side * (sp - 2.2);
        if (!W.fits(x, z, 1.4, 1.4, 0, { margin: 0.05, allow: PAVED | F.BLD }) || S.placed.near(x, z, 1.5) || S.inDoorBox(x, z, 0.8)) continue;
        S.add(['tubMaple', 'tubBirch', 'tubLilac'][k++ % 3], x, z, hash01(x, z) * 6.28); S.solidCyl(x, z, 0.52, 1.0); S.occupy(x, z, 0.8, 'tub'); S.svc.planters.push({ x, z }); cnt.limeTubs++;
      }
    } }

  // ---- low round concrete planters at the MANMADE `planter` nodes of the west
  { const bad = F.ROAD | F.WATER | F.DECK | F.STEPS | F.MISC | F.SQUARE | F.TREE;
    let k = 0;
    for (const m of MANMADE) {
      if (m.kind !== 'planter' || !W.inArea(m.x, m.z) || (W.at(m.x, m.z) & bad) || (S.st && S.st.net.cover(m.x, m.z, {}) > -0.9) || W.insideBld(m.x, m.z) || S.placed.near(m.x, m.z, 0.9) || S.inDoorBox(m.x, m.z, 0.3) || S.inForecourt(m.x, m.z)) continue;
      S.add(k++ % 2 ? 'planterR1' : 'planterR0', m.x, m.z, hash01(m.x, m.z) * 6.28); S.solidCyl(m.x, m.z, 0.62, 0.5); S.occupy(m.x, m.z, 0.9, 'tub'); S.svc.planters.push({ x: m.x, z: m.z }); cnt.planters++;
    } }

  // ---- flower baskets on brackets beside the shop doors of the west shopping streets (about one door in five)
  { const ents = (S.city && S.city.entrances) || [], RE = /Невск|Морск|Конюшенн|Итальянск|Садовая|Думск|Михайловск|Грибоедова|Мойки|Адмиралтейск|Гороховая/, seen = [];
    for (const e of ents) {
      if (cnt.baskets >= 150) break;
      if (e.x > -700 || !W.inPlay(e.x, e.z, -2)) continue;
      if (hash01(Math.round(e.x * 2), Math.round(e.z * 2), 'bsk') > 0.2) continue;
      const nx = Math.sin(e.rotY), nz = Math.cos(e.rotY), tx = nz, tz = -nx, rd = L.roadsNear(e.x + nx * 4, e.z + nz * 4, 10, { drivable: true })[0];
      if (!rd || rd.gap > 8 || !RE.test(rd.road.name || '')) continue;
      const sd = hash01(Math.round(e.x), Math.round(e.z), 'bs') < 0.5 ? 1 : -1, wx = e.x - nx * 0.62 + tx * sd * 1.25, wz = e.z - nz * 0.62 + tz * sd * 1.25;
      if (seen.some((q) => Math.hypot(q[0] - wx, q[1] - wz) < 2.0) ) continue;
      const wl = nearestWall(wx + nx * 0.6, wz + nz * 0.6, 1.4); if (!wl || wl.d > 1.0) continue;                          // the wall must really be there
      seen.push([wx, wz]);
      S.add(hash01(wx, wz) < 0.5 ? 'wallBasket0' : 'wallBasket1', wl.x + wl.nx * 0.02, wl.z + wl.nz * 0.02, faceRot(wl.nx, wl.nz), { y: S.levelAt(wl.x, wl.z) + 2.3 });
      cnt.baskets++;
    } }
  S.stats.west = cnt;
}
