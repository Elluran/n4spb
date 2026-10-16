// props/osm.js - the street furniture that OpenStreetMap maps point by point (data FURNITURE, 971 records): benches (292), waste baskets (183), bicycle parking (53), street
// clocks (17), post boxes (17), advertising columns (10), bike-share stations (2) and a few ATMs on facades (the other 80 are inside buildings: vending machines, dumpsters,
// toilets, ATMs of banks are not street furniture). The forecourt of the Moscow station is furnished by landmarksA (S.inForecourt): anything there is skipped. Positions
// that fall on a carriageway / inside a footprint / into the water are skipped (or, for the pillars, nudged to the nearest free pavement spot).
import * as L from '../layout.js';
import { FURNITURE } from '../data/city.js';
import { Geo, hash01 } from './kit.js';
import { COL } from './furniture.js';
import { faceRot, nearestWall, nearestWalk } from './sites.js';
import { addPillar, addClock } from './ads.js';

/** nearest of the pavement strips and the mapped footways: { x, z, tx, tz, dist } or null */
export function nearestWay(S, x, z, maxD = 30) {
  let best = nearestWalk(S, x, z, maxD);
  // the segments of the mapped footways in a 32 m grid, built once per build (the linear scan over every path cost 5 s once the Petrograd side added its 3 500 fortress / park ways)
  let g = S._pathGrid;
  if (!g) {
    g = S._pathGrid = new Map();
    for (const p of (S.st && S.st.paths) || []) { const pts = p.pts; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], sg = [a[0], a[1], b[0] - a[0], b[1] - a[1]]; for (let cx = Math.floor(Math.min(a[0], b[0]) / PG); cx <= Math.floor(Math.max(a[0], b[0]) / PG); cx++) for (let cz = Math.floor(Math.min(a[1], b[1]) / PG); cz <= Math.floor(Math.max(a[1], b[1]) / PG); cz++) { const k = cx * 65536 + cz; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(sg); } } }
  }
  for (let cx = Math.floor((x - maxD) / PG); cx <= Math.floor((x + maxD) / PG); cx++) for (let cz = Math.floor((z - maxD) / PG); cz <= Math.floor((z + maxD) / PG); cz++) for (const sg of g.get(cx * 65536 + cz) || []) {
    const ax = sg[0], az = sg[1], dx = sg[2], dz = sg[3], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < maxD && (!best || d < best.dist)) { const l = Math.sqrt(l2); best = { x: px, z: pz, tx: dx / l, tz: dz / l, dist: d }; }
  }
  return best;
}
const PG = 32;

export function placeOsm(S) {
  const { W, R, F } = S;
  const BAD = F.ROAD | F.WATER | F.DECK | F.STEPS | F.MISC | F.SQUARE;           // SQUARE: the Palace Square stone field stays an open plaza
  const cnt = { benches: 0, bins: 0, racks: 0, clocks: 0, posts: 0, pillars: 0, docks: 0, atms: 0, skipped: 0, dupBench: 0, whiteBench: 0 };
  const okPoint = (f, r = 0.3) => W.inArea(f.x, f.z) && !S.inForecourt(f.x, f.z) && !(W.at(f.x, f.z) & BAD) && !W.insideBld(f.x, f.z) && !(r > 0 && (W.at(f.x + r, f.z) & F.ROAD) && (W.at(f.x - r, f.z) & F.ROAD)) && !S.placed.near(f.x, f.z, 0.4, 'metro');
  const atmDone = [];
  // OSM maps benches / bins / racks / post boxes on the lanes of courtyard service ways (the ROAD grid is 1 m coarse): a node whose footprint (w x d, rot as in S.box) is not 0.2 m clear of the asphalt
  // is nudged away from it in 0.6 m steps (<= 1.8 m), else skipped
  const net = S.st && S.st.net, cover = (x, z) => net.cover(x, z, {});
  const nudge = (f, w, d, rot) => {
    if (!net) return f;
    const ax = Math.cos(rot) * w / 2, az = -Math.sin(rot) * w / 2, bx = Math.sin(rot) * d / 2, bz = Math.cos(rot) * d / 2;
    const clear = (x, z) => { for (const u of [-1, 0, 1]) for (const v of [-1, 0, 1]) if (cover(x + ax * u + bx * v, z + az * u + bz * v) > -0.2) return false; return true; };
    let x = f.x, z = f.z;
    for (let k = 0; k < 4 && !clear(x, z); k++) {
      const gx = cover(x + 0.3, z) - cover(x - 0.3, z), gz = cover(x, z + 0.3) - cover(x, z - 0.3), l = Math.hypot(gx, gz);
      if (l < 1e-6 || k === 3) return null;
      x -= gx / l * 0.6; z -= gz / l * 0.6;
    }
    const q = x === f.x && z === f.z ? f : { ...f, x, z };
    return q === f || okPoint(q) ? q : null;
  };
  for (let f of FURNITURE) {
    if (!W.inArea(f.x, f.z)) continue;
    if (f.kind === 'bench') {
      if (!okPoint(f)) { cnt.skipped++; continue; }
      if (S.lmBench.some((b) => Math.abs(b[0] - f.x) < 0.8 && Math.abs(b[1] - f.z) < 0.8 && Math.hypot(b[0] - f.x, b[1] - f.z) < 0.8)) { cnt.dupBench++; continue; }          // a landmark module drew this bench itself
      const wall = nearestWall(f.x, f.z, 2.2), way = nearestWay(S, f.x, f.z, 40);
      let rot = way ? faceRot(way.x - f.x, way.z - f.z) : R() * 6.28;
      if (wall && wall.d < 1.4) rot = faceRot(wall.nx, wall.nz);                                // back to the facade
      if (way && way.dist < 0.4) rot = Math.atan2(-way.tz, way.tx) + (wall ? 0 : 0);
      const white = f.x < -595 && S.gardenAt(f.x, f.z);                                       // the white-painted garden benches of the west gardens (dossier 4.3)
      const type = f.backrest === 'no' && !white ? 'benchGranite' : white ? (hash01(f.id, 'bl') < 0.3 ? 'benchWhiteL' : 'benchWhite') : hash01(f.id, 'b') < 0.08 ? 'benchGranite' : hash01(f.id, 'bt') < 0.18 ? 'benchParkD' : hash01(f.id, 'bl') < 0.2 ? 'benchParkL' : 'benchPark';
      const len = type === 'benchWhiteL' ? 2.3 : type === 'benchWhite' ? 1.9 : type === 'benchParkL' ? 2.1 : type === 'benchGranite' ? 2.0 : 1.8;
      if (!(f = nudge(f, len, 0.6, rot))) { cnt.skipped++; continue; }
      if (S.placed.near(f.x, f.z, 1.1, 'bench')) { cnt.skipped++; continue; }
      if (!S.placeBench(type, f.x, f.z, rot)) { cnt.skipped++; continue; }
      if (white) cnt.whiteBench++;
      cnt.benches++;
    } else if (f.kind === 'waste_basket') {
      if (!okPoint(f, 0.2) || !(f = nudge(f, 0.5, 0.5, 0)) || S.placed.near(f.x, f.z, 0.7, 'bin')) { cnt.skipped++; continue; }
      const roll = hash01(f.id, 'bin'), g = L.toGrid(f.x, f.z), westG = f.x < -595 && S.gardenAt(f.x, f.z);
      S.add(westG ? (roll < 0.7 ? 'binCast' : 'binSteel') : roll < 0.45 ? 'binCast' : roll < 0.75 ? 'binCube' : 'binSteel', f.x, f.z, R() * 6.28);
      S.svc.bins.push({ x: f.x, z: f.z }); S.solidCyl(f.x, f.z, 0.25, 0.9); S.occupy(f.x, f.z, 0.5, 'bin'); cnt.bins++; void g;
    } else if (f.kind === 'bicycle_parking') {
      if (!okPoint(f) || S.placed.near(f.x, f.z, 1.4)) { cnt.skipped++; continue; }
      const way = nearestWay(S, f.x, f.z, 30), rot = way ? Math.atan2(-way.tz, way.tx) : 0;
      const big = hash01(f.id, 'rk') < 0.4, len = big ? 3.0 : 1.8;
      if (!(f = nudge(f, len, 0.4, rot))) { cnt.skipped++; continue; }
      S.add(big ? 'rack5' : 'rack3', f.x, f.z, rot);
      S.box(f.x, f.z, len, 0.4, rot, 0.8, { r: len / 2, tag: 'rack' }); S.svc.racks.push({ x: f.x, z: f.z }); cnt.racks++;
    } else if (f.kind === 'post_box') {
      if (!okPoint(f)) { cnt.skipped++; continue; }
      const wall = nearestWall(f.x, f.z, 2.5), way = nearestWay(S, f.x, f.z, 30);
      const rot = wall && wall.d < 1.6 ? faceRot(wall.nx, wall.nz) : way ? faceRot(way.x - f.x, way.z - f.z) : 0;
      if (!(f = nudge(f, 0.45, 0.4, rot)) || S.placed.near(f.x, f.z, 0.8)) { cnt.skipped++; continue; }
      S.add('postBox', f.x, f.z, rot); S.solidBox(f.x, f.z, 0.45, 0.4, rot, 1.2); S.occupy(f.x, f.z, 0.5, 'post'); cnt.posts++;
    } else if (f.kind === 'advertising:column') {
      if (S.placed.near(f.x, f.z, 15, 'pillar')) { cnt.skipped++; continue; }                  // landmarksA built two (the obelisk island and the forecourt)
      let spot = null;
      for (const r of [0, 1.2, 2.4, 3.6]) {
        for (let a = 0; a < (r ? 8 : 1) && !spot; a++) {
          const ang = a / 8 * 6.2832 + hash01(f.id, 'a'), x = f.x + Math.cos(ang) * r, z = f.z + Math.sin(ang) * r;
          if (!(W.at(x, z) & (BAD | F.BLD | F.TREE | F.BED)) && W.fits(x, z, 1.4, 1.4, 0, { margin: 0.05, allow: F.LAWN }) && !S.placed.near(x, z, 1.8, 'pillar') && !S.inDoorBox(x, z, 0.9)) spot = [x, z];
        }
        if (spot) break;
      }
      if (!spot) { cnt.skipped++; continue; }
      addPillar(S, spot[0], spot[1], hash01(f.id, 'p') * 10 | 0); cnt.pillars++;
    } else if (f.kind === 'clock') {
      if (S.inForecourt(f.x, f.z)) { cnt.skipped++; continue; }
      const wall = nearestWall(f.x, f.z, 2.6);
      if (wall && wall.d < 2.3) {                                                               // bracket clock projecting from the facade at 4.7 m (above the shop awnings and sign bands) (OSM maps them on the footprint edge)
        const x = wall.x + wall.nx * 0.5, z = wall.z + wall.nz * 0.5, g = new Geo();
        if (!nearestWalk(S, x, z, 7) || S.placed.near(x, z, 6, 'clock')) { cnt.skipped++; continue; }
        addClock(S, x, S.levelAt(x, z) + 4.7, z, wall.tx, wall.tz, 0.38, true);
        g.box(0.07, 0.07, 0.5, [0, 0, 0], COL.black); S.addStaticGeo(new Geo().put(g, x - wall.nx * 0.25, S.levelAt(x, z) + 4.7, z - wall.nz * 0.25, faceRot(wall.nx, wall.nz)), 'pr-clock-arm');
        S.placed.add(x, z, 1, 'clock');
      } else {
        if (!okPoint(f, 0)) { cnt.skipped++; continue; }
        const way = nearestWay(S, f.x, f.z, 30) || { tx: 1, tz: 0 };
        if (!W.fits(f.x, f.z, 0.5, 0.5, 0, { margin: 0.05, allow: F.LAWN }) || S.placed.near(f.x, f.z, 1.0)) { cnt.skipped++; continue; }
        S.add('clockPole', f.x, f.z, faceRot(way.tx, way.tz)); addClock(S, f.x, S.levelAt(f.x, f.z) + 3.3, f.z, way.tx, way.tz, 0.46, false);
        S.solidCyl(f.x, f.z, 0.22, 3.0); S.occupy(f.x, f.z, 0.7, 'clock');
      }
      cnt.clocks++;
    } else if (f.kind === 'bicycle_rental') {
      if (!okPoint(f) || S.inForecourt(f.x, f.z, 10)) { cnt.skipped++; continue; }
      const way = nearestWay(S, f.x, f.z, 30), tx = way ? way.tx : 1, tz = way ? way.tz : 0, n = 6, rot = Math.atan2(-tx, -tz);   // the bikes stand in a row along the way, each across it
      let k = 0;
      for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 0.62, x = f.x + tx * o, z = f.z + tz * o; if (!W.fits(x, z, 0.5, 1.7, rot, { margin: 0, allow: F.LAWN })) continue; S.add(i % 2 ? 'bicycleB' : 'bicycle', x, z, rot); k++; }
      if (k) { S.box(f.x, f.z, n * 0.62, 1.7, Math.atan2(-tz, tx), 1.1, { r: n * 0.3, tag: 'docks' }); cnt.docks++; }
    } else if (f.kind === 'atm') {
      if (atmDone.length >= 14 || S.inForecourt(f.x, f.z) || atmDone.some((q) => Math.hypot(q[0] - f.x, q[1] - f.z) < 60)) continue;
      const wall = nearestWall(f.x, f.z, 3.0); if (!wall || wall.d > 2.6) continue;
      const x = wall.x, z = wall.z, rot = faceRot(wall.nx, wall.nz);
      if (S.inDoorBox(x, z, 0.6) || !nearestWalk(S, x, z, 5) || W.span(x + wall.nx * 0.3, z + wall.nz * 0.3, wall.nx, wall.nz, 6, F.ROAD) < 2.2) continue;
      const y = S.levelAt(x, z) + 1.35;
      S.panels.panel(S.sign.atm(), x + wall.nx * 0.1, y, z + wall.nz * 0.1, wall.nx, wall.nz, 0.58, 0.87, { lit: true });
      S.addStaticGeo(new Geo().put(new Geo().box(0.7, 1.0, 0.07, [0, 0, 0], '#2b4a7a'), x + wall.nx * 0.05, y, z + wall.nz * 0.05, rot), 'pr-atm-frame');
      atmDone.push([f.x, f.z]); cnt.atms++;
    }
  }
  S.stats.osm = cnt;
}
