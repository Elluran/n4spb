// props/harbour.js - harbour and promenade furniture of the Petrovsky club shore and the stadium (islands round 2, props owner pass 2, 2026-10-15). Called by props/islands.js (placeIslands) with its helpers.
//   * STEPPED GRANITE BOLLARDS (islands2-requests-landmarksPetrovskyYacht.md "Props owner" 2; water owner item 12): the harbour walls of the Petrovskaya kosa club have no object of their own (the quay only
//     says "slab revetment / rubble mole"), so the bollards stand on the TOP of the quay behind the revetment run, along the club slab quay (waterways.js clubShoreAt, class 2) and the inner face of the arc
//     breakwater (breakwaterAt, class 3), only where a pontoon lies within 28 m of the water (the harbour side; the outer face of the mole and the open shore get nothing) and only on the "free reaches"
//     (no building / carriageway within 8 m behind the water edge: the others keep the granite wall of the Neva, whose top the quay owner closes). Granite grey, three steps and a rounded head, 0.7 m;
//     a life-buoy stand (white posts, red ring, no flag) every fourth stop. [E] the Guest harbour wall of photo y14 is not located by OSM (dossier "Guest/West [?]"): the nearest mapped walls are used.
//   * THE LIGHT GREY CAST RAILING along the COLUMN line of the Petrovsky stadium bays (islands2-requests-landmarksPetrovskyStadium.md "Review additions": photos s05 / s12): ~1 m high, a flat top rail,
//     a heavy bottom rail and a chain of plain rings between them (the same railing the quay owner draws on the island edge, environment/quay.js 'lightring'); one panel per bay between two columns.
//     No collider (the colonnade line is already solid, landmarksPetrovskyStadium/bowl.js bowlColliders).
// Both are STATIC vertex-coloured geometry, one Geo per 200 m cell in the shared 'pr-vc' material, so the batcher merges them with the other props: no new draw call (docs/research/islands2-props.md).
import * as L from '../layout.js';
import { ISLANDS2_COAST } from '../environment/islands2-context.js';
import { clubShoreAt, breakwaterAt, slopeAt } from '../environment/waterways.js';
import { PIERS } from '../data/city.js';
import { Geo, hash01, ringHas, BOT } from './kit.js';
import { bowl, COL_S, Y as STAD_Y } from '../landmarksPetrovskyStadium/frame.js';

const GRANITE = ['#85817c', '#8e8a85', '#97938d', '#a09c96'], RAIL = '#c6c9cb', RAIL_D = '#b9bcbe', BUOY_RED = '#c43a2e', BUOY_WHITE = '#f1efe9';

/** the stepped granite mooring bollard of the club harbour walls: three square steps and a rounded head, 0.7 m, ~60 triangles */
function steppedBollard() {
  const g = new Geo();
  g.boxB(0.40, 0.20, 0.40, [0, 0, 0], GRANITE[0], null, BOT);
  g.boxB(0.31, 0.20, 0.31, [0, 0.20, 0], GRANITE[1], null, BOT);
  g.boxB(0.23, 0.20, 0.23, [0, 0.40, 0], GRANITE[2], null, BOT);
  g.cyl(0.10, 0.14, 0.10, [0, 0.65, 0], GRANITE[3], 8);
  return g;
}
/** the life-buoy stand: two white posts, a cross bar and a red ring with four white tabs on the bar, front +Z; ~150 triangles */
function buoyStand() {
  const g = new Geo();
  for (const x of [-0.42, 0.42]) g.tube([x, 0, 0], [x, 1.45, 0], 0.035, BUOY_WHITE, 5);
  g.tube([-0.42, 1.4, 0], [0.42, 1.4, 0], 0.03, BUOY_WHITE, 5);
  g.torus(0.27, 0.06, [0, 1.0, 0.05], BUOY_RED, null, 4, 12);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.box(0.09, 0.09, 0.14, [Math.cos(a) * 0.27, 1.0 + Math.sin(a) * 0.27, 0.05], BUOY_WHITE, [0, 0, a]); }
  return g;
}

/** one railing panel between two columns of the stadium: (ax, az) .. (bx, bz) at height y0; rings along the chord, posts at the ends */
function railPanel(g, ax, az, bx, bz, y0) {
  const l = Math.hypot(bx - ax, bz - az), len = l - 0.85, cx = (ax + bx) / 2, cz = (az + bz) / 2, rot = Math.atan2(-(bz - az), bx - ax), r = [0, rot, 0];
  if (len < 1.5) return;
  const n = Math.max(5, Math.round(len / 0.56)), pitch = len / n, R = pitch / 2 - 0.012, ux = (bx - ax) / l, uz = (bz - az) / l;
  g.box(len, 0.06, 0.085, [cx, y0 + 0.97, cz], RAIL, r, 0);                                           // the flat top rail
  g.box(len, 0.15, 0.10, [cx, y0 + 0.17, cz], RAIL_D, r, BOT);                                         // the heavy bottom rail
  for (const s of [-1, 1]) g.boxB(0.075, 1.0, 0.075, [cx + ux * s * len / 2, y0, cz + uz * s * len / 2], RAIL_D, r, BOT);   // the end posts
  for (let i = 0; i < n; i++) { const u = -len / 2 + pitch * (i + 0.5); g.torus(R, 0.017, [cx + ux * u, y0 + 0.57, cz + uz * u], RAIL, r, 3, 7); }
}

export function placeHarbour(S, H) {
  const { part, cnt, offRoad, solidAt } = H, { W, F } = S;
  if ((typeof location !== 'undefined' && /[?&]noharbour=1/.test(location.search || '')) || (typeof process !== 'undefined' && process.env && process.env.PROPS_NOHARBOUR)) { cnt.harbour = { skip: '?noharbour=1 / PROPS_NOHARBOUR (A/B of the draw calls)' }; return; }
  const cell = H.cells;                                              // shared with the boats and pontoons of islands.js (same 200 m cells, flushed once at the end of placeIslands)
  const grp = (x, z) => { const k = Math.floor(x / 200) + ',' + Math.floor(z / 200); let g = cell.get(k); if (!g) cell.set(k, (g = new Geo())); return g; };
  const h = (cnt.harbour = { bollards: 0, buoys: 0, rail: 0, railTris: 0, skipped: {}, reach: { quay: 0, mole: 0 } });
  const skip = (k) => { h.skipped[k] = (h.skipped[k] || 0) + 1; };

  // ============================================================================================================================================ stepped granite bollards + life-buoy stands
  part('harbourWalls', () => {
    const ring = ISLANDS2_COAST.petrovsky; if (!ring) return;
    const BOX = [-6520, -5740, -3790, -3320];
    const piers = [];
    for (const p of PIERS) { const q = p.pts; if (!q || q.length < 4 || !p.id) continue; for (let i = 0; i + 3 < q.length; i += 2) if (q[i] > BOX[0] - 40 && q[i] < BOX[1] + 40 && q[i + 1] > BOX[2] - 40 && q[i + 1] < BOX[3] + 40) piers.push([q[i], q[i + 1], q[i + 2], q[i + 3]]); }
    /** the nearest pier point to (x, z) within r metres, or null */
    const pierAt = (x, z, r) => { let best = null, bd = r; for (const [ax, az, bx, bz] of piers) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; best = [px, pz]; } } return best; };
    const GEO = steppedBollard(), BUOY = buoyStand();
    const NB = ring.length / 2;
    let stops = 0, acc = 0;
    const SPACING = { 2: 18, 3: 14 };
    for (let i = 0; i < NB; i++) {
      const j = (i + 1) % NB, ax = ring[i * 2], az = ring[i * 2 + 1], bx = ring[j * 2], bz = ring[j * 2 + 1], l = Math.hypot(bx - ax, bz - az);
      if (l < 0.5) continue;
      if (Math.max(ax, bx) < BOX[0] || Math.min(ax, bx) > BOX[1] || Math.max(az, bz) < BOX[2] || Math.min(az, bz) > BOX[3]) { acc = 0; continue; }
      const tx = (bx - ax) / l, tz = (bz - az) / l;
      let nx = -tz, nz = tx;                                                                         // the inland normal: the side of the island polygon
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      if (!ringHas(ring, mx + nx * 2, mz + nz * 2)) { nx = -nx; nz = -nz; if (!ringHas(ring, mx + nx * 2, mz + nz * 2)) { acc = 0; continue; } }
      for (let s = 0.5; s < l; s += 1) {
        const x = ax + tx * s, z = az + tz * s;
        const mole = breakwaterAt(x, z, nx, nz), quay = !mole && clubShoreAt(x, z, nx, nz), cls = mole ? 3 : quay ? 2 : 0;
        if (!cls) { acc = 0; continue; }
        // the harbour side: a pontoon within 14 m of the point 6 m out on the WATER side of the wall (the outer face of the mole looks at open water, the pontoons lie 15 m behind it)
        if (!pierAt(x - nx * 6, z - nz * 6, 14)) { acc = 0; skip('notHarbour'); continue; }
        // the free-reach test of the quay (waterways.js petroNatural): nothing built / no carriageway 1.2, 3.5 and 8 m behind the water edge, no other water
        const free = [1.2, 3.5, 8.0].every((d) => !(W.at(x + nx * d, z + nz * d) & (F.BLD | F.ROAD)));
        if (!free) { acc = 0; skip('notFree'); continue; }
        acc += 1;
        if (acc < SPACING[cls] * (0.7 + 0.6 * hash01(Math.round(x), Math.round(z), 'bsp'))) continue;
        const run = cls === 3 ? 3.6 : 5.0;
        let ok = null;
        for (const d of [run + 1.3, run + 2.0, run + 2.8]) {
          const px = x + nx * d, pz = z + nz * d;
          if (!W.inPlay(px, pz, 2) || L.inRiver(px, pz) || slopeAt(px, pz, 0.6) || (W.at(px, pz) & (F.BLD | F.ROAD | F.WATER | F.TREE | F.DOOR | F.DECK)) || !offRoad(px, pz, 0.45, 0.45, 0) || S.placed.near(px, pz, 1.0) || S.inDoorBox(px, pz, 0.5) || solidAt(px, pz, 0.35)) continue;
          ok = [px, pz]; break;
        }
        if (!ok) { skip('noSpot'); continue; }
        acc = 0;
        const [px, pz] = ok, y = S.levelAt(px, pz), rot = Math.atan2(-tz, tx) + (hash01(px, pz) - 0.5) * 0.1;
        grp(px, pz).put(GEO, px, y, pz, rot);
        S.solidCyl(px, pz, 0.22, 0.7); S.occupy(px, pz, 0.5, 'bollard'); (S.svc.bollards ||= []).push({ x: px, z: pz, kind: 'granite' });
        h.bollards++; h.reach[cls === 3 ? 'mole' : 'quay']++;
        if (++stops % 4 === 0) {                                                                       // a life-buoy stand 2.4 m further inland, facing the water
          const bx2 = px + nx * 2.4, bz2 = pz + nz * 2.4;
          const bad = !W.inPlay(bx2, bz2, 2) ? 'play' : (W.at(bx2, bz2) & (F.BLD | F.ROAD | F.WATER | F.TREE | F.DOOR)) ? 'flags' : slopeAt(bx2, bz2, 0.6) ? 'slope' : !offRoad(bx2, bz2, 0.9, 0.3, 0) ? 'road' : S.placed.near(bx2, bz2, 0.9) ? 'near' : solidAt(bx2, bz2, 0.4) ? 'solid' : '';
          if (!bad) {
            grp(bx2, bz2).put(BUOY, bx2, S.levelAt(bx2, bz2), bz2, Math.atan2(-nx, -nz));
            S.solidBox(bx2, bz2, 0.95, 0.2, Math.atan2(-nx, -nz), 1.4); S.occupy(bx2, bz2, 0.8, 'sign'); h.buoys++;
          } else skip('buoy-' + bad);
        }
      }
    }
  });

  // ============================================================================================================================================ the light grey cast railing along the stadium column line
  part('stadiumRail', () => {
    const B = bowl(); if (!B) { skip('noBowl'); return; }
    for (let k = 0; k < B.N; k++) {
      const a = B.at(k, COL_S, 0), b = B.at(k + 1, COL_S, 0), cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2;
      if (!H.inIsl(cx, cz)) { skip('railOut'); continue; }
      const g = grp(cx, cz), t0 = g.tris;
      railPanel(g, a[0], a[2], b[0], b[2], STAD_Y.floor);
      h.rail++; h.railTris += g.tris - t0;
    }
  });
}
