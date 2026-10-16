// props/petro.js - the tourist furniture of the PETROGRAD SIDE and the SPIT of Vasilievsky Island (regions P1..P9, V1, V2 of docs/PETRO-BRIEF.md, opened 2026-10-06 / 07: the whole of Petrogradsky Island). The benches, bins,
// racks, clocks and pillars of the area come from the generic generators (osm.js, walks.js, ads.js); this file adds what is specific and real there in summer:
//   * the SPIT: a tourist stall and a boiled-corn cart by the south Rostral column, a souvenir cart and an ice-cream cart by the north one, and three
//     coin telescope viewers at the parapet of the point (the view of the fortress and the Palace Embankment);
//   * the AURORA quay (Petrogradskaya embankment): corn, souvenirs, ice cream and a stall round the photo spot, two viewers at the parapet;
//   * the FORTRESS: a ticket kiosk ("КАССА") at the mainland head of the Ioannovsky and of the Kronverksky bridge and one at the Commandant pier (the lead asked props onto the island for
//     these three: nothing else of ours stands on it);
//   * boat-trip ticket booths at the quay descents that carry a pier (at most six, >= 120 m apart);
//   * the metro pavilions (Gorkovskaya, Petrogradskaya, Sportivnaya, Chkalovskaya): a row of hire scooters with the blue "P" tab, a press pavilion at three of them;
//   * the Zoo entrance: an ice-cream cart; flower baskets on brackets beside the shop doors of Bolshoy pr. P.S., Kamennoostrovsky pr. and the streets between them.
// Anchors come from the services of the sights (photo spots, crowd spots, bridges, the cruiser), never from hard coordinates: a site whose sight is not in the build is skipped.
// RULES (docs/AGENT-BRIEF.md "Road integrity rules"): the FINAL footprint of every object is tested against streets.net.cover (every corner < -0.5 m: carriageways, parking pockets,
// fillets, tram beds), against the tram tracks that run off the asphalt (net.trackDist), the door boxes, crossings, stops, metro portals, the lamps / benches / photo spots the sights
// publish (state.js seeds), and against every solid already built there (ctx.physics: fences, parapets, statues, guns). On a sight's own paving (claimed AREAS) only the sites listed
// above stand; on its lawns nothing. No flags, no sounds, no brands (plain wordmarks).
import * as L from '../layout.js';
import { hash01 } from './kit.js';
import * as FUR from './furniture.js';
import { faceRot, nearestWall } from './sites.js';

/** V3..V12 (2026-10-09): the frame rectangles of Vasilievsky Island (docs/VO-BRIEF.md "Frame"; the same boxes as the play rectangles of data/city-v3..v12.js). props/vo.js decides what the island gets */
export const VO_RECTS = [[-3150, -2450, -1900, -150], [-3850, -3150, -2250, -150], [-4550, -3850, -2250, 900], [-5250, -4550, -2250, 1650], [-5950, -5250, -1900, 1600], [-6650, -5950, -1900, 1250],
  [-7350, -6650, -2250, 900], [-8050, -7350, -2250, 900], [-8750, -8050, -2600, 900], [-9800, -8750, -2600, 550]];
/** the regions of the Petrograd side / Spit extension (x0, x1, z0, z1): everything here is new ground; the older play rectangles that overlap them keep their own furniture */
const PETRO_RECTS = [[-2450, -800, -2800, -1300], [-3950, -2450, -2800, -1700], [-3400, -1500, -3350, -2800], [-2900, -1700, -3900, -3350], [-800, -550, -2900, -2250], [-3050, -2300, -1700, -700], [-3950, -3050, -1800, -1300],
  // P6..P9 (2026-10-07): the rest of Petrogradsky Island (north-west corner, north-east quarter, the Karpovka strip, the west tip)
  [-4400, -2900, -3900, -2600], [-1700, -600, -4080, -2800], [-4400, -1700, -4260, -3900], [-4950, -4400, -3700, -3000]];
/** every region props treats as new ground: the Petrograd side / Spit (as reviewed) + V3..V12 (2026-10-09, appended: Vasilievsky Island) */
const RECTS = [...PETRO_RECTS, ...VO_RECTS];
const _in = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
let _older = null;
/** (x, z) lies in the Petrograd side / Spit extension OR on the island (V3..V12) and in no older play rectangle: props/vo.js asks this */
export function inPetro(x, z) {
  if (_older === null) { const i = L.PLAY_RECTS.findIndex((r) => r.x0 === RECTS[0][0] && r.x1 === RECTS[0][1] && r.z0 === RECTS[0][2]); _older = i < 0 ? false : L.PLAY_RECTS.slice(0, i); }
  if (!_older) return false;
  if (!RECTS.some((r) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3])) return false;
  return !_older.some((r) => _in(r, x, z));
}
/** V1 (the Spit) and V2 (the University embankment): reviewed in the Petrograd round, they keep their curated sites and stay outside the island rules of props/vo.js */
const VO_FROZEN = [[-3050, -2300, -1700, -700], [-3950, -3050, -1800, -1300]];
/** (x, z) lies in a V3..V12 rectangle and not in V1 / V2: ground that props/vo.js owns */
export const inVORect = (x, z) => VO_RECTS.some((r) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3]) && !VO_FROZEN.some((r) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3]);
/** the Petrograd side / Spit extension as it was before the island round (the rectangles of PETRO_RECTS only): placePetro and S.claimedPetro (state.js) keep exactly their reviewed behaviour, so the generic
 *  phases of props, which share one random stream, draw the older districts as before; the island is handled by props/vo.js, which runs last */
export function inCurated(x, z) {
  if (_older === null) inPetro(0, 0);
  if (!_older) return false;
  if (!PETRO_RECTS.some((r) => x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3])) return false;
  return !_older.some((r) => _in(r, x, z));
}
export const PETRO_SIGHTS = ['landmarksFortress', 'landmarksStrelka', 'landmarksUniversity', 'landmarksTroitskaya', 'landmarksAurora', 'landmarksKronverk', 'landmarksKamennoostrovsky', 'landmarksVladimir', 'landmarksKarpovka', 'landmarksYelaginPalace', 'landmarksYelaginKitchen', 'landmarksYelaginServices', 'landmarksYelaginRossi', 'landmarksYelaginSpits', 'landmarksYelaginPark', 'landmarksKamennyPalace', 'landmarksKamennyChurch', 'landmarksBotanicalGreenhouses', 'landmarksBotanicalGarden', 'landmarksPetrovskyStadium', 'landmarksPetrovskyYacht',
  // islands round 2, props pass 2 (2026-10-15): the sights built after the first props round (their published monuments / photo spots / crowd / entrances / benches stay free)
  'landmarksZhdanovka', 'landmarksKamennyTheatre', 'landmarksKamennyDachasEast', 'landmarksKamennyDachasWest', 'landmarksLETI', 'landmarksTVTower', 'landmarksTransfiguration', 'landmarksPetrovskyWest', 'landmarksPetroMonuments'];
/** the sights of Vasilievsky Island (2026-10-09): registered by props/vo.js (S.seedVO) after the generic phases, never before (the older districts must not move) */
export const VO_SIGHTS = ['landmarksAcademy', 'landmarksMenshikov', 'landmarksMining', 'landmarksAndrew', 'landmarksNavalCorps', 'landmarksSmolensky', 'landmarksSeaTerminal', 'landmarksSevkabel', 'landmarksKirova', 'landmarksMakarova', 'landmarksSredny',
  'landmarksGavan', 'landmarksPribaltiyskaya', 'landmarksMarineFacade', 'landmarksModernVO', 'landmarksVOStatues'];

// FACE = the footprint searched for (incl. canopies / umbrellas), BODY = the solid collider
const FACE = { pressKiosk2: [1.9, 1.9], cartCorn: [2.2, 1.8], cartSouv: [1.7, 1.2], iceCartHood: [1.3, 1.0], iceCart0: [1.5, 1.3], iceCart1: [1.5, 1.3], stall0: [3.2, 2.0], stall1: [3.2, 2.0], ticketBooth: [1.6, 1.6], viewer: [0.7, 1.0] };
const BODY = { pressKiosk2: [1.8, 1.8], cartCorn: [1.4, 0.8], cartSouv: [1.6, 0.9], iceCartHood: [1.3, 0.9], iceCart0: [1.3, 1.0], iceCart1: [1.3, 1.0], stall0: [3.0, 1.8], stall1: [3.0, 1.8], ticketBooth: [1.5, 1.5], viewer: [0.5, 0.5] };
const LOW = new Set(['cartCorn', 'cartSouv', 'iceCartHood', 'iceCart0', 'iceCart1', 'viewer']);

export function placePetro(S) {
  const { W, F } = S, T = S.sign, SV = S.ctx.services, net = S.st && S.st.net;
  const cnt = { sites: 0, missed: [], viewers: 0, booths: 0, boats: 0, scooters: 0, scooterRows: 0, press: 0, baskets: 0 };
  S.stats.petro = cnt;
  if (!inPetro(-2580, -1240) && !inPetro(-1579, -2360)) { cnt.skipped = 'the Petrograd side is not in this map'; return; }
  S.type('viewer', () => FUR.telescopeViewer());
  S.type('cartCorn', () => FUR.cornCart());
  const cover = (x, z) => (net ? net.cover(x, z, {}) : -9);
  const track = (x, z) => (net && net.trackDist ? net.trackDist(x, z) : null);
  /** something solid stands within r of (x, z) already (a fence, a parapet, a statue, a gun, a lamp of a sight): the player's own collision test */
  const solidAt = (x, z, r) => { const p = { x, z }; S.ctx.physics.resolve(p, r, 0, 1.7); return Math.hypot(p.x - x, p.z - z) > 0.02; };
  const dry = (x, z, w, d, rot, m = 4.0) => corners(x, z, w, d, rot, m).every(([px, pz]) => !L.inRiver(px, pz));      // 4 m off the river outline: not on a descent / a pier (the sunk ramps of the Spit lie inside it), not in the mouth of a ramp, not at the parapet where people lean
  const corners = (x, z, w, d, rot, m = 0) => { const c = Math.cos(rot), s = Math.sin(rot), out = [[x, z]]; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) { const lx = a * (w / 2 + m), lz = b * (d / 2 + m); out.push([x + lx * c + lz * s, z - lx * s + lz * c]); } return out; };
  /** the road rule on the final footprint: every corner clear of the asphalt by 0.5 m, 1.9 m off a tram track axis */
  const offRoad = (x, z, w, d, rot) => corners(x, z, w, d, rot).every(([px, pz]) => { if (cover(px, pz) > -0.5) return false; const t = track(px, pz); return !(t !== null && t !== undefined && t < 1.9); });
  const doorHit = (x, z, w, d, rot) => corners(x, z, w, d, rot, 0.2).some(([px, pz]) => S.inDoorBox(px, pz, 0));
  const photoSpot = (mod, re) => { const s = SV[mod]; const q = s && (s.photoSpots || []).find((p) => re.test(p.name || '')); return q ? [q.x, q.z] : null; };
  const crowdSpot = (mod, test) => { const s = SV[mod]; const q = s && (s.crowd || []).find(test); return q ? [q.x, q.z] : null; };

  /** the free spot nearest to o.at (expanding rings); o: { t, at, R, look: [x, z] (the front faces it; else away from / towards the nearest road by o.face), pav (a sight's paving allowed), hard } */
  const findSpot = (o, w, d) => {
    const allow = (o.pav ? F.PAVED : 0) | F.DOOR | (o.allow || 0);
    for (let r = o.r0 || 0; r <= o.R; r += 1.0) {
      const n = r === 0 ? 1 : Math.max(8, Math.round(r * 1.6)), a0 = hash01(o.at[0], o.at[1], r) * 6.2832;
      for (let k = 0; k < n; k++) {
        const a = a0 + (k / n) * 6.2832, x = o.at[0] + Math.cos(a) * r, z = o.at[1] + Math.sin(a) * r;
        if (!W.inPlay(x, z, 2) || !inCurated(x, z)) continue;
        let rot;
        if (o.look) { if (Math.hypot(o.look[0] - x, o.look[1] - z) < 1.5) continue; rot = faceRot(o.look[0] - x, o.look[1] - z); }
        else { const rd = L.roadsNear(x, z, 45, { drivable: true })[0]; if (!rd) continue; rot = o.face === 'road' ? faceRot(rd.x - x, rd.z - z) : faceRot(x - rd.x, z - rd.z); }
        if (!W.fits(x, z, w + 1.0, d + 1.0, rot, { margin: 0.1, allow })) continue;
        if (!offRoad(x, z, w, d, rot) || doorHit(x, z, w, d, rot) || !dry(x, z, w, d, rot, o.wm ?? 4.0)) continue;
        if (o.hard !== false && (W.at(x, z) & F.LAWN || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([p, q]) => W.at(x + p * 1.2, z + q * 1.2) & (F.LAWN | F.BED)))) continue;      // a cart stands on a hard surface
        if (S.placed.near(x, z, Math.max(w, d) / 2 + 0.7)) continue;
        if (S.placed.near(x, z, Math.max(w, d) / 2 + 1.5, 'cross') || S.placed.near(x, z, Math.max(w, d) / 2 + 1.0, 'metro') || S.placed.near(x, z, Math.max(w, d) / 2 + 1.0, 'stop')) continue;
        if (solidAt(x, z, Math.max(w, d) / 2 + 0.25)) continue;
        if (o.bld && nearestWall(x, z, o.bld)) continue;                                    // (a kiosk does not lean on the guardhouse / the pavilion that stands there already)
        return { x, z, rot };
      }
    }
    return null;
  };
  const panelsFor = (o, x, z, rot, y) => {
    const n = [Math.sin(rot), Math.cos(rot)];
    if (o.t === 'pressKiosk2') {
      S.panels.panel(T.fascia(o.text || 'ПЕЧАТЬ', '#2c4a3c', '#f3eedf', o.sub || 'газеты · журналы'), x + n[0] * 0.9, y + 2.22, z + n[1] * 0.9, n[0], n[1], 1.3, 0.34, { lit: true });
      S.panels.panel(T.cityLight(o.poster || 3), x + n[0] * 0.915, y + 1.15, z + n[1] * 0.915, n[0], n[1], 1.25, 0.95, { lit: true });
    } else if (o.t === 'cartCorn') {
      S.panels.panel(T.fascia('ВАРЁНАЯ КУКУРУЗА', '#3f7a3c', '#f6eedc', 'горячая · с солью'), x + n[0] * 0.375, y + 0.58, z + n[1] * 0.375, n[0], n[1], 1.2, 0.3, {});
    } else if (o.t === 'cartSouv') {
      S.panels.panel(T.fascia(o.text || 'СУВЕНИРЫ', '#8a5a36', '#f6eedc', o.sub || 'матрёшки · магниты'), x + n[0] * 0.41, y + 0.62, z + n[1] * 0.41, n[0], n[1], 1.2, 0.3, {});
    } else if (o.t === 'ticketBooth') {
      if (o.boats) S.panels.panel(T.boats(), x + n[0] * 0.74, y + 1.62, z + n[1] * 0.74, n[0], n[1], 1.3, 0.48, { lit: true });
      else S.panels.panel(T.fascia(o.text || 'КАССА', '#7a2a22', '#f3eedf', o.sub || 'билеты · экскурсии'), x + n[0] * 0.74, y + 1.62, z + n[1] * 0.74, n[0], n[1], 1.3, 0.4, { lit: true });
    }
  };
  const put = (o, sp) => {
    const [w, d] = FACE[o.t] || [2, 2], y = S.levelAt(sp.x, sp.z), [bw, bd] = BODY[o.t] || [w - 0.2, d - 0.2], low = LOW.has(o.t);
    S.add(o.t, sp.x, sp.z, sp.rot);
    S.box(sp.x, sp.z, bw, bd, sp.rot, low ? 1.2 : 2.6, { r: Math.max(w, d) / 2, tag: low ? 'stand' : 'kiosk' });
    panelsFor(o, sp.x, sp.z, sp.rot, y);
    S.svc.kiosks.push({ x: sp.x, z: sp.z, rotY: sp.rot, kind: o.kind || (o.t === 'pressKiosk2' ? 'press' : o.t) });
    if (o.t === 'stall0' || o.t === 'stall1') S.svc.stalls.push({ x: sp.x, z: sp.z, rotY: sp.rot });
  };
  const site = (o) => {
    if (!o.at) return false;
    const [w, d] = FACE[o.t] || [2, 2], sp = findSpot(o, w, d);
    if (!sp) { cnt.missed.push(`${o.tag || o.t}@${Math.round(o.at[0])},${Math.round(o.at[1])}`); return false; }
    put(o, sp); cnt.sites++; return true;
  };
  const off = (p, q, dist, side = 0) => {            // the point `dist` metres from p towards q, `side` metres to the left of that direction
    if (!p || !q) return null; const dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1; return [p[0] + dx / l * dist + dz / l * side, p[1] + dz / l * dist - dx / l * side];
  };

  /** a telescope viewer at the parapet: walk from `from` along (dx, dz) until the water / a solid (the parapet) / asphalt is met, stand 0.9 m before it, lenses to the water */
  const viewerAt = (from, dx, dz, maxD = 26) => {
    if (!from) return false;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    let hit = -1;
    for (let s = 0.5; s <= maxD; s += 0.25) { const x = from[0] + dx * s, z = from[1] + dz * s; if (L.inRiver(x, z) || (W.at(x, z) & F.WATER) || solidAt(x, z, 0.2)) { hit = s; break; } if (cover(x, z) > -0.5) return false; }
    if (hit < 1.6) return false;
    for (const back of [0.95, 1.25, 1.6, 2.0]) {
      const x = from[0] + dx * (hit - back), z = from[1] + dz * (hit - back), rot = faceRot(dx, dz);
      if (!inCurated(x, z) || !offRoad(x, z, 0.7, 1.0, rot) || solidAt(x, z, 0.4) || S.placed.near(x, z, 0.8)) continue;
      S.add('viewer', x, z, rot); S.solidCyl(x, z, 0.3, 1.6); S.occupy(x, z, 0.8, 'stand');
      S.svc.kiosks.push({ x, z, rotY: rot, kind: 'viewer' }); cnt.viewers++;
      return true;
    }
    return false;
  };
  /** direction from p to the nearest water within 40 m (16 rays) or null */
  const toWater = (p) => {
    let best = null;
    for (let k = 0; k < 24; k++) { const a = k / 24 * 6.2832, dx = Math.cos(a), dz = Math.sin(a); for (let s = 1; s <= 40; s += 1) if (L.inRiver(p[0] + dx * s, p[1] + dz * s)) { if (!best || s < best.s) best = { s, dx, dz }; break; } }
    return best;
  };

  // ---- the Spit (landmarksStrelka)
  {
    const south = photoSpot('landmarksStrelka', /Южная ростральная/), north = photoSpot('landmarksStrelka', /Северная ростральная/), tip = photoSpot('landmarksStrelka', /Стрелка: вид/), garden = photoSpot('landmarksStrelka', /Биржа из сквера/);
    if (south) site({ t: 'stall0', at: off(south, north, -9), R: 24, pav: true, look: south, tag: 'spit stall' });
    if (north) site({ t: 'cartSouv', at: off(north, south, -9), R: 24, pav: true, look: north, tag: 'spit souvenirs' });
    // the corn and the ice cream stand on the promenade of the point, behind the people at the parapet (10 m inland of the viewpoint, either side of the axis)
    // (the paved round of the viewpoint lies inside the garden polygon the sight claims: the two carts are let onto it, 5 m round their anchors at most, so they cannot stray onto the lawn)
    if (tip && garden) { site({ t: 'cartCorn', at: off(tip, garden, 9, 6.5), R: 5, pav: true, allow: F.PLAZA, wm: 3, look: tip, tag: 'spit corn' }); site({ t: 'iceCartHood', at: off(tip, garden, 9, -6.5), R: 5, pav: true, allow: F.PLAZA, wm: 3, look: tip, tag: 'spit ice' }); }
    if (tip) { const w = toWater(tip); if (w) for (const side of [-7, 0, 7]) for (const j of [0, 1.5, -1.5, 3]) if (viewerAt([tip[0] - w.dx * 6 + w.dz * (side + j), tip[1] - w.dz * 6 - w.dx * (side + j)], w.dx, w.dz, 40)) break; }
  }
  // ---- the Aurora quay (landmarksAurora)
  {
    const spot = photoSpot('landmarksAurora', /Аврора/), ship = SV.landmarksAurora && SV.landmarksAurora.ship;
    if (spot) {
      const w = toWater(spot), tx = w ? -w.dz : 1, tz = w ? w.dx : 0, inl = w ? [-w.dx, -w.dz] : [0, 0];      // t along the quay, inl = inland
      const at = (along, inland) => [spot[0] + tx * along + inl[0] * inland, spot[1] + tz * along + inl[1] * inland];
      site({ t: 'cartCorn', at: at(-14, 3), R: 22, look: spot, tag: 'aurora corn' });
      site({ t: 'cartSouv', at: at(14, 3), R: 22, look: spot, tag: 'aurora souvenirs', text: 'СУВЕНИРЫ', sub: 'бескозырки · магниты' });
      site({ t: 'stall1', at: at(-26, 5), R: 26, look: spot, tag: 'aurora stall' });
      site({ t: 'iceCartHood', at: at(26, 4), R: 24, look: spot, tag: 'aurora ice' });
      if (w) for (const side of [-1, 1]) for (const along of [20, 17, 23, 14, 26, 11, 30]) if (viewerAt(at(side * along, 4), w.dx, w.dz, 30)) break;      // (the first spot between the quay lamps that is free)
      void ship;
    }
  }
  // ---- the fortress (landmarksFortress): ticket kiosks at the mainland heads of its two bridges and at the Commandant pier
  {
    const fs = SV.landmarksFortress, C = [-1949, -1981];
    for (const b of (fs && fs.bridges) || []) {
      if (!b.a || !b.b) continue;
      const far = Math.hypot(b.a[0] - C[0], b.a[1] - C[1]) > Math.hypot(b.b[0] - C[0], b.b[1] - C[1]) ? [b.a, b.b] : [b.b, b.a];
      const at = off(far[0], far[1], -9, (b.w || 10) / 2 + 3.5);
      if (site({ t: 'ticketBooth', at, R: 20, bld: 6, look: off(far[0], far[1], -9), tag: 'fortress tickets ' + (b.name || ''), text: 'КАССА', sub: 'Петропавловская крепость', kind: 'tickets' })) cnt.booths++;
    }
    const pier = crowdSpot('landmarksFortress', (q) => q.kind === 'pier');
    if (pier) { const w = toWater(pier), at = w ? [pier[0] - w.dx * 7 - w.dz * 6, pier[1] - w.dz * 7 + w.dx * 6] : pier; if (site({ t: 'ticketBooth', at, R: 18, look: pier, pav: true, allow: F.PLAZA | F.LAWN, hard: false, wm: 1.2, tag: 'Commandant pier tickets', text: 'КАССА', sub: 'прогулки по Неве', kind: 'tickets' })) cnt.booths++; }
  }
  // ---- boat-trip booths at the descents with a pier
  {
    const quay = SV.environment && SV.environment.quay, done = [];
    for (const st of ((quay && quay.allStairs) || []).filter((q) => q.pier && inCurated(q.x, q.z))) {
      if (cnt.boats >= 6) break;
      if (S.svc.kiosks.some((q) => q.kind === 'ticketBooth' && Math.hypot(q.x - st.x, q.z - st.z) < 30)) { done.push([st.x, st.z]); cnt.boatsWest = (cnt.boatsWest || 0) + 1; continue; }      // west.js (K8) put its booth at this descent already
      if (done.some((q) => Math.hypot(q[0] - st.x, q[1] - st.z) < 120) || !W.inPlay(st.x, st.z, 3)) continue;
      for (const [dn, dt] of [[3.6, 3.0], [3.6, -3.0], [3.6, 0], [4.8, 3.4], [4.8, -3.4], [6.0, 4], [6.0, -4]]) {
        const x = st.x + st.nx * dn + st.tx * dt, z = st.z + st.nz * dn + st.tz * dt, rot = faceRot(-st.nx, -st.nz);
        if (!W.fits(x, z, 1.5 + 1.2, 1.5 + 1.2, rot, { margin: 0.1 }) || !offRoad(x, z, 1.6, 1.6, rot) || S.placed.near(x, z, 1.8) || S.inDoorBox(x, z, 0.8) || solidAt(x, z, 1.0)) continue;
        put({ t: 'ticketBooth', boats: true, kind: 'boats' }, { x, z, rot }); cnt.boats++; done.push([st.x, st.z]); break;
      }
    }
  }
  // ---- the metro pavilions: hire scooters in a row at the kerb side of the pavement + the blue P tab; a press pavilion at the first three stations
  {
    const ents = [];
    const add = (x, z, name) => { if (x == null || !inCurated(x, z) || ents.some((e) => Math.hypot(e[0] - x, e[1] - z) < 70)) return; ents.push([x, z, name || '']); };
    for (const e of (SV.metro && SV.metro.entrances) || []) if (e.kind !== 'pit') add(e.x + Math.sin(e.rotY || 0) * 4, e.z + Math.cos(e.rotY || 0) * 4, e.name || e.station);
    { const m = SV.landmarksKronverk && SV.landmarksKronverk.metro; if (m && m.entrance && m.entrance.foot) add(m.entrance.foot[0], m.entrance.foot[1], m.station); }
    for (const e of (SV.landmarksVladimir && SV.landmarksVladimir.metroExits) || []) add(e.x, e.z, e.name);
    const grid = S.stGrid, R = S.R;
    for (const [sx, sz] of ents) {
      const near = grid ? grid.near(sx, sz, 34, (s) => s.eb > 2.2 && s.ek > 1.6 && inCurated(s.x, s.z)) : [];
      for (const { s: st } of near.slice(0, 40)) {
        const n = 5 + Math.floor(hash01(sx, sz, 'n') * 4), rot = Math.atan2(-st.tz, st.tx), o = Math.min(st.ek, 8) - 0.95, cx = st.x + st.nx * o, cz = st.z + st.nz * o, len = n * 0.55;
        if (o < 0.5 || !W.fits(cx, cz, len + 0.4, 1.0, rot, { margin: 0.05 }) || !offRoad(cx, cz, len, 0.9, rot) || S.placed.near(cx, cz, len / 2 + 0.6) || S.inDoorBox(cx, cz, len / 2) || S.placed.near(cx, cz, len / 2 + 3.5, 'cross') || S.placed.near(cx, cz, len / 2 + 2.5, 'metro') || S.placed.near(cx, cz, len / 2 + 2.5, 'stop')) continue;
        if (W.span(cx - st.nx * 0.6, cz - st.nz * 0.6, -st.nx, -st.nz, 9, F.BLD | F.TREE | F.WATER) < 2.5 || solidAt(cx, cz, 0.6)) continue;
        for (let i = 0; i < n; i++) { const q = (i - (n - 1) / 2) * 0.55; S.add('scooter', cx + st.tx * q, cz + st.tz * q, faceRot(st.nx, st.nz) + (hash01(sx, i) - 0.5) * 0.25); }
        S.box(cx, cz, len, 0.5, rot, 1.0, { r: len / 2, tag: 'scooters' }); cnt.scooters += n; cnt.scooterRows++;
        const px = cx + st.tx * (len / 2 + 0.45), pz = cz + st.tz * (len / 2 + 0.45);
        if (W.fits(px, pz, 0.3, 0.3, 0, { margin: 0.02 }) && offRoad(px, pz, 0.3, 0.3, 0) && !S.placed.near(px, pz, 0.5)) { const fr = faceRot(st.nx, st.nz), nn = [Math.sin(fr), Math.cos(fr)]; S.add('signPole', px, pz, 0); S.panels.panel(T.park(), px + nn[0] * 0.04, S.levelAt(px, pz) + 1.75, pz + nn[1] * 0.04, nn[0], nn[1], 0.4, 0.4, {}); S.solidCyl(px, pz, 0.08, 2.0); S.occupy(px, pz, 0.3, 'sign'); }
        break;
      }
      void R;
      if (cnt.press < 3 && site({ t: 'pressKiosk2', at: [sx, sz], r0: 5, R: 30, tag: 'press at the metro', poster: 2 + cnt.press })) cnt.press++;
    }
    cnt.metro = ents.length;
  }
  // ---- the Zoo entrance
  { const zoo = photoSpot('landmarksKronverk', /зоопарк/i); if (zoo) site({ t: 'iceCart0', at: zoo, r0: 4, R: 22, look: zoo, pav: true, tag: 'zoo ice' }); }

  // ---- flower baskets on brackets beside the shop doors of the main shopping streets (about one door in five)
  { const ents = (S.city && S.city.entrances) || [], RE = /Большой проспект П|Каменноостровский|Кронверкский проспект|Введенская|Большая Пушкарская|Ленина/, seen = [];
    for (const e of ents) {
      if (cnt.baskets >= 110) break;
      if (!inCurated(e.x, e.z) || !W.inPlay(e.x, e.z, -2)) continue;
      if (hash01(Math.round(e.x * 2), Math.round(e.z * 2), 'bsk') > 0.2) continue;
      const nx = Math.sin(e.rotY), nz = Math.cos(e.rotY), tx = nz, tz = -nx, rd = L.roadsNear(e.x + nx * 4, e.z + nz * 4, 10, { drivable: true })[0];
      if (!rd || rd.gap > 8 || !RE.test(rd.road.name || '')) continue;
      const sd = hash01(Math.round(e.x), Math.round(e.z), 'bs') < 0.5 ? 1 : -1, wx = e.x - nx * 0.62 + tx * sd * 1.25, wz = e.z - nz * 0.62 + tz * sd * 1.25;
      if (seen.some((q) => Math.hypot(q[0] - wx, q[1] - wz) < 2.0)) continue;
      const wl = nearestWall(wx + nx * 0.6, wz + nz * 0.6, 1.4); if (!wl || wl.d > 1.0) continue;
      seen.push([wx, wz]);
      S.add(hash01(wx, wz) < 0.5 ? 'wallBasket0' : 'wallBasket1', wl.x + wl.nx * 0.02, wl.z + wl.nz * 0.02, faceRot(wl.nx, wl.nz), { y: S.levelAt(wl.x, wl.z) + 2.3 });
      cnt.baskets++;
    } }
}
