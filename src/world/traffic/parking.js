// traffic/parking.js (Saint Petersburg) - the PARKED cars: which kerb bays / lot slots of streets.parkedSlots are occupied and by what (docs/research/transport.md section 8: paid parking everywhere
// except Nevsky / Ligovsky / the squares; parallel at the kerb of the side streets, lots in the courtyards / behind the railings).
//   * occupancy: parallel bays 88-96 % (busier near Vosstaniya Square), lots 60-97 % per lot (paid zone, always full); a few empty slots everywhere
//   * the fleet mix is the moving one (fleetdata.ARCH weights); vans in parallel bays and lots, trucks / minibuses never (they do not fit); 3 % of the cars are taxis (white + yellow stripe), 0.4 % police
//   * irregular parking: lateral / longitudinal jitter, small yaw, 22 % of the lot cars are reversed in, ~10 % have a driver (+ a passenger) sitting inside
//   * never on a tree trunk (environment.trees), inside a building (layout.insideBuilding) or on a bus stop / crossing. No yard cars (the courtyards stay clean, brief)
//   * only the slots inside the data extent (L.inExtent): the OSM ways that stick out of the extent keep whole kerb pockets beyond it, nobody can see them
//   * taxi ranks of white taxis at the squares and the Admiralteysky corner; tour coaches / double-decker / minibuses at the Palace Square, Isaac's Square, Kazanskaya st and Gostiny Dvor where a quiet kerb exists
// Pure data in, plain records out (no three.js): { id, kind, x, z, rotY, c, s, color (hex), plate, driver, pax, taxi, police }
import { ARCH, PALETTE, KINDS_W, pickW, TAXI_KINDS, TAXI_WHITE, PLATES_COUNT } from './fleetdata.js';

const hash = (str) => { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return (h >>> 0) / 4294967296; };

export function planParked(ctx, st, opts = {}) {
  const L = ctx.L; let r = ctx.rng('traffic-parked');
  const env = ctx.services.environment;
  const trees = (env && env.trees) || [];
  const TC = 16, grid = new Map();
  for (const t of trees) { const k = Math.floor(t.x / TC) * 4096 + Math.floor(t.z / TC); (grid.get(k) || grid.set(k, []).get(k)).push(t); }
  const treeNear = (x, z, rad) => {
    const cx = Math.floor(x / TC), cz = Math.floor(z / TC), out = [];
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) for (const t of grid.get(i * 4096 + j) || []) if (Math.hypot(t.x - x, t.z - z) < rad + 6) out.push(t);
    return out;
  };
  const sq = L.SQUARE || { x: 589, z: 173 };
  const sqx = sq.x, sqz = sq.z, stn = L.STATION || { x: 612, z: 300 };
  const stops = (st.busStops || []).map((b) => [b.x, b.z]);
  const walkXs = (st.crosswalks || []).map((c) => [c.x, c.z, Math.max(4, c.w || 4)]);
  const cars = [], placed = [];
  // never on a bridge deck (the humped decks: bridges.deckY) and never on the paved field of Palace Square (the AREAS polygons of the square; the carriageways of the square are no parking either)
  const deckY = (ctx.services.bridges && ctx.services.bridges.deckY) || null;
  const palaceRings = (L.AREAS || []).filter((a) => a.poly && /Дворцовая площадь/.test(a.name)).map((a) => a.poly);
  const inRing = (ring, x, z) => { let c = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) { const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const forbidden = (x, z) => { if (deckY) { const y = deckY(x, z); if (y !== null && y !== undefined) return true; } return palaceRings.some((r) => inRing(r, x, z)); };

  // circle-vs-oriented-rectangle (trunk against a car footprint)
  const hitsTree = (x, z, c, s, hl, hw) => {
    for (const t of treeNear(x, z, hl + 1)) {
      const rad = (t.tr || 0.18) + (t.shrub ? Math.min(0.6, (t.r || 1) * 0.5) : 0.22);
      const dx = t.x - x, dz = t.z - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      const qx = Math.max(-hw, Math.min(hw, lx)), qz = Math.max(-hl, Math.min(hl, lz));
      if (Math.hypot(lx - qx, lz - qz) < rad) return true;
    }
    return false;
  };
  // the placed cars in 8 m cells: a candidate only meets the cars of the 3 x 3 cells round it (every car within 7 m lies there)
  const PC = 8, pgrid = new Map(), pkey = (x, z) => Math.floor(x / PC) * 65536 + Math.floor(z / PC);
  const placedAdd = (p) => { const k = pkey(p.x, p.z); (pgrid.get(k) || pgrid.set(k, []).get(k)).push(p); placed.push(p); };
  const overlapsPlaced = (x, z, c, s, hl, hw) => {
    const cx = Math.floor(x / PC), cz = Math.floor(z / PC);
    for (let gi = cx - 1; gi <= cx + 1; gi++) for (let gj = cz - 1; gj <= cz + 1; gj++) { const cell = pgrid.get(gi * 65536 + gj); if (!cell) continue; for (const p of cell) {
      if (Math.abs(p.x - x) > 7 || Math.abs(p.z - z) > 7) continue;
      const dx = p.x - x, dz = p.z - z;
      // separating axes: the forward and right axes of both cars; (sin, cos) forward, (cos, -sin) right
      let sep = false;
      for (const [nx, nz, h1] of [[s, c, hl], [c, -s, hw], [p.s, p.c, 0], [p.c, -p.s, 0]]) {
        const ra = hl * Math.abs(s * nx + c * nz) + hw * Math.abs(c * nx - s * nz), rb = p.hl * Math.abs(p.s * nx + p.c * nz) + p.hw * Math.abs(p.c * nx - p.s * nz);
        if (Math.abs(dx * nx + dz * nz) > ra + rb - 0.04) { sep = true; break; }
        void h1;
      }
      if (!sep) return true;
    } }
    return false;
  };
  const inBuilding = (x, z, c, s, hl, hw) => {
    for (const [a, b] of [[0, 0], [hw, hl], [-hw, hl], [hw, -hl], [-hw, -hl]]) if (L.insideBuilding(x + a * c + b * s, z - a * s + b * c, 0.25)) return true;
    return false;
  };
  const onForbidden = (x, z, c, s, hl, hw) => { for (const [a, b] of [[0, 0], [hw, hl], [-hw, hl], [hw, -hl], [-hw, -hl]]) if (forbidden(x + a * c + b * s, z - a * s + b * c)) return true; return false; };
  // stops / crossings in a grid whose cell is at least the widest test radius: the 3 x 3 cells round a point hold every candidate within that radius
  const SC = Math.max(16, ...walkXs.map((p) => p[2] * 0.5 + 2.2), 6.5), sgrid = new Map(), skey = (x, z) => Math.floor(x / SC) * 65536 + Math.floor(z / SC);
  for (const p of stops) { const k = skey(p[0], p[1]); (sgrid.get(k) || sgrid.set(k, []).get(k)).push([p[0], p[1], 6.5]); }
  for (const p of walkXs) { const k = skey(p[0], p[1]); (sgrid.get(k) || sgrid.set(k, []).get(k)).push([p[0], p[1], p[2] * 0.5 + 2.2]); }
  const nearStop = (x, z) => {
    const cx = Math.floor(x / SC), cz = Math.floor(z / SC);
    for (let gi = cx - 1; gi <= cx + 1; gi++) for (let gj = cz - 1; gj <= cz + 1; gj++) { const cell = sgrid.get(gi * 65536 + gj); if (!cell) continue; for (const p of cell) if (Math.hypot(p[0] - x, p[1] - z) < p[2]) return true; }
    return false;
  };

  const addCar = (slot, jit = {}, force = null) => {
    let kind = force && force.kind ? force.kind : pickW(KINDS_W, r);
    if (!force && (kind === 'truck' || kind === 'minibus')) kind = r() < 0.5 ? 'cross_m' : 'sedan';
    if (!force && kind === 'van' && slot.kind !== 'parallel' && r() < 0.6) kind = 'ladasw';
    const a = ARCH[kind];
    let rot = slot.rotY;
    if (slot.kind !== 'parallel' && r() < 0.22) rot += Math.PI;
    rot += (r() - 0.5) * (jit.yaw ?? 0.08);
    // slot axes: forward = (sin rotY, cos rotY), right-hand normal of the car = (cos, -sin) ... jitter along / across the car
    const sC = Math.sin(slot.rotY), cC = Math.cos(slot.rotY);
    const along = (r() - 0.5) * (jit.along ?? 0.6), across = (r() - 0.5) * (jit.across ?? 0.3);
    let x = slot.x + sC * along + cC * across, z = slot.z + cC * along - sC * across;
    // a car shorter than a bay sits nose-in: shift so that its nose is near the kerb (bays: slot centre is the middle of the 5 m)
    const c = Math.cos(rot), s = Math.sin(rot), hl = a.len / 2, hw = a.wid / 2;
    if (onForbidden(x, z, c, s, hl, hw) || inBuilding(x, z, c, s, hl, hw) || hitsTree(x, z, c, s, hl, hw) || overlapsPlaced(x, z, c, s, hl, hw) || nearStop(x, z)) return null;
    const taxi = force && force.taxi !== undefined ? force.taxi : TAXI_KINDS.includes(kind) && r() < (Math.hypot(slot.x - stn.x, slot.z - stn.z) < 170 ? 0.3 : 0.03);        // the taxis queue at the Moscow Station (transport.md section 3)
    const police = !taxi && !force && kind === 'liftback' && r() < 0.012;
    const car = {
      id: cars.length, kind, x, z, y: 0.03, rotY: rot, c, s, hl, hw, color: taxi ? TAXI_WHITE : police ? '#f4f4f1' : pickW(PALETTE[kind], r), plate: Math.floor(r() * PLATES_COUNT),
      driver: r() < 0.10 || taxi || !!(force && force.driver), pax: r() < 0.3, taxi, police, slot: slot.kind,
    };
    if (force && force.color) car.color = force.color;
    cars.push(car); placedAdd(car);
    return car;
  };

  // ---- taxi ranks of the west (west-life-furniture.md 3.4: 4-5 white taxis wait together at the Admiralteysky corner, ranks at the squares): the nearest kerb bays to each anchor, planned BEFORE
  // the ordinary cars so that the bays are theirs
  const parallel = (st.parkedSlots || []).filter((q) => q.kind === 'parallel');
  const RANKS = [[-2215, -512, 5], [-1048, -50, 3], [-1566, -205, 3], [-2445, -118, 3], [-1890, -350, 2]];
  let nTaxiRank = 0; const dbg = [], rankMissing = [];
  for (const [ax, az, n] of RANKS) {
    const cand = parallel.filter((q) => Math.hypot(q.x - ax, q.z - az) < 80).sort((a, b) => Math.hypot(a.x - ax, a.z - az) - Math.hypot(b.x - ax, b.z - az));
    let got = 0; dbg.push(`rank ${ax},${az}: ${cand.length} bays near`);
    for (const q of cand) { if (got >= n) break; if (addCar(q, { yaw: 0.03, along: 0.5, across: 0.12 }, { kind: TAXI_KINDS[Math.floor(r() * TAXI_KINDS.length)], taxi: true, color: TAXI_WHITE, driver: true })) { got++; nTaxiRank++; } }
    if (got < n) rankMissing.push([ax, az, n, got]);
  }
  // ---- tour buses / coaches / minibuses at their pick-up points (west-life-furniture.md 3.5): Palace Square stops, Isaac's loop, Kazanskaya st, Gostiny Dvor, the Moika at the Pevchesky bridge; kerb of a quiet lane (rank 1-2), nose to tail
  const TOURS = [[-2480, -255, ['coach', 'coach', 'dd', 'minibus']], [-2455, -215, ['coach', 'minibus']], [-2500, -284, ['coach']], [-1566, -205, ['coach']], [-2000, -45, ['coach', 'coach']]];
  // (Palace Square, the Palace Embankment and the Sadovaya / Nevsky stops carry no parked coaches: there the tour buses of sim.js stop at the bays and leave)
  const quiet = (st.lanes || []).filter((l) => l.rank >= 1 && l.rank <= 2 && !l.bridge && l.len >= 16 && l.idx === 0);
  const cover = st.net && st.net.cover ? (x, z) => st.net.cover(x, z, {}) : null;
  /** a row of vehicles nose to tail along the kerb of the nearest quiet lane within `reach` metres of (ax, az); mk(kind) -> record; returns the number placed */
  const placeRow = (ax, az, kinds, mk, reach = 45, gap = 1.6) => {
    let best = null;
    for (const l of quiet) for (let i = 0; i + 1 < l.pts.length; i++) {
      const a = l.pts[i], b = l.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((ax - a[0]) * dx + (az - a[1]) * dz) / l2)), d = Math.hypot(a[0] + dx * u - ax, a[1] + dz * u - az);
      if (d < reach && (!best || d < best.d)) best = { d, l, i, u };
    }
    if (!best) { dbg.push(`row ${ax},${az}: no quiet lane within ${reach} m`); return 0; }
    const l = best.l, cum = [0]; for (let i = 1; i < l.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]));
    const at = (sArc) => { let i = 1; while (i < l.pts.length - 1 && cum[i] < sArc) i++; const a = l.pts[i - 1], b = l.pts[i], seg = cum[i] - cum[i - 1] || 1e-9, f = Math.max(0, Math.min(1, (sArc - cum[i - 1]) / seg)); return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, tx: (b[0] - a[0]) / seg, tz: (b[1] - a[1]) / seg }; };
    const sAnchor = cum[best.i] + (cum[best.i + 1] - cum[best.i]) * best.u;
    const total = kinds.reduce((t, k) => t + (ARCH[k] ? ARCH[k].len + gap : 0), 0);
    let s0 = Math.max(Math.min(sAnchor + total / 2, l.len - 3), total + 3), n = 0;          // (nose to tail, the last bumper at s0, walking back along the lane)
    for (const kind of kinds) {
      const a = ARCH[kind]; if (!a) continue;
      const sMid = s0 - a.len / 2 - 0.5; if (sMid < a.len / 2 + 1 || sMid > l.len - a.len / 2 - 1) { dbg.push(`row ${ax},${az} ${kind}: lane ${l.id} too short (s0 ${s0.toFixed(0)}/${l.len.toFixed(0)})`); break; }
      const q = at(sMid), rot = Math.atan2(q.tx, q.tz), c = Math.cos(rot), sn = Math.sin(rot), hl = a.len / 2, hw = a.wid / 2;
      // lateral position: as far towards the kerb as the asphalt allows (outer side 0.45 .. -0.6 m beyond the lane edge)
      let px = 0, pz = 0, offOk = false;
      for (const over of [0.45, 0.2, 0, -0.3, -0.6]) {
        const side = (l.width || 3.4) / 2 - a.wid / 2 + over; px = q.x - q.tz * side; pz = q.z + q.tx * side;
        if (!cover || [[hw, hl], [-hw, hl], [hw, -hl], [-hw, -hl]].every(([ca, cb]) => cover(px + ca * c + cb * sn, pz - ca * sn + cb * c) > -0.2)) { offOk = true; break; }
      }
      const mid = (a.front + a.rear) / 2, ox = px - Math.sin(rot) * mid, oz = pz - Math.cos(rot) * mid;      // origin of the model: the body centre minus half of (front + rear)
      s0 -= a.len + gap;
      if (!offOk || onForbidden(px, pz, c, sn, hl, hw) || inBuilding(px, pz, c, sn, hl, hw) || overlapsPlaced(px, pz, c, sn, hl, hw)) { dbg.push(`row ${ax},${az} ${kind}: blocked on ${l.id} (asphalt ${offOk})`); continue; }
      const car = mk(kind); car.id = cars.length; car.x = ox; car.z = oz; car.y = 0.03; car.rotY = rot; car.c = c; car.s = sn; car.hl = hl; car.hw = hw;
      cars.push(car); placedAdd({ ...car, x: px, z: pz }); n++;
    }
    return n;
  };
  let nTour = 0;
  for (const [ax, az, kinds, reach] of TOURS) nTour += placeRow(ax, az, kinds, (kind) => ({ kind, color: pickW(PALETTE[kind], r), plate: Math.floor(r() * PLATES_COUNT), driver: true, pax: false, taxi: false, police: false, slot: 'tour' }), reach || 45);
  // taxi ranks without kerb bays near them (Admiralteysky corner, Gostiny Dvor): a short row on the nearest quiet street
  for (const [ax, az, n, got] of rankMissing) {
    const kinds = []; for (let i = 0; i < n - got; i++) kinds.push(TAXI_KINDS[Math.floor(r() * TAXI_KINDS.length)]);
    nTaxiRank += placeRow(ax, az, kinds, (kind) => ({ kind, color: TAXI_WHITE, plate: Math.floor(r() * PLATES_COUNT), driver: true, pax: false, taxi: true, police: false, slot: 'rank' }), 120, 0.9);
  }

  // ---- the slots
  const lotOcc = new Map();
  const occ = (slot) => {
    const d = Math.hypot(slot.x - sqx, slot.z - sqz), near = Math.max(0, Math.min(1, 1 - d / 650));
    if (slot.kind === 'parallel') return 0.88 + 0.08 * near;
    let o = lotOcc.get(slot.lot);
    if (o === undefined) { const h = hash(slot.lot); o = 0.60 + 0.36 * h + 0.10 * near; o = Math.min(0.97, o); lotOcc.set(slot.lot, o); }
    return o;
  };
  const jitter = { parallel: { yaw: 0.07, along: 1.2, across: 0.22 }, lot: { yaw: 0.07, along: 0.35, across: 0.26 } };
  for (const slot of st.parkedSlots || []) {
    if (!L.inExtent(slot.x, slot.z)) continue;
    if (r() > occ(slot)) continue;
    addCar(slot, jitter[slot.kind] || jitter.lot);
  }
  const nSlots = cars.length;

  // ---- yards: cars along the service roads, half on the kerb (courtyards of the panel blocks are full of cars)
  let nYard = 0;
  if (opts.yards === true) {
    const done = new Set();
    for (const l of st.lanes || []) {
      if (l.hw !== 'service' || l.idx !== 0 || l.len < 14 || done.has(l.road)) continue;
      done.add(l.road);
      const pts = l.pts;
      let acc = 0, next = 3 + r() * 5;
      for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0], az = pts[i - 1][1], bx = pts[i][0], bz = pts[i][1], seg = Math.hypot(bx - ax, bz - az); if (seg < 1e-3) continue;
        const tx = (bx - ax) / seg, tz = (bz - az) / seg;
        while (next < acc + seg) {
          const u = next - acc, px = ax + tx * u, pz = az + tz * u;
          next += 6.4 + r() * 5.5;
          if (r() > 0.34) continue;
          const side = r() < 0.5 ? 1 : -1, nx = -tz * side, nz = tx * side;       // right of travel is (-tz, tx)
          const off = (l.width || 3.2) / 2 + 0.9 + r() * 0.4;
          const slot = { x: px + nx * off, z: pz + nz * off, rotY: Math.atan2(tx * (r() < 0.5 ? 1 : -1), tz * (r() < 0.5 ? 1 : -1)), kind: 'parallel' };
          if (L.insideBuilding(slot.x, slot.z, 1.6)) continue;
          const c0 = addCar(slot, { yaw: 0.10, along: 0.5, across: 0.2 });
          if (c0) { c0.slot = 'yard'; c0.y = 0.03; nYard++; }
        }
        acc += seg;
      }
    }
  }
  return { cars, stats: { slots: (st.parkedSlots || []).length, placed: nSlots, yard: nYard, taxiRank: nTaxiRank, tour: nTour, dbg } };
}
