// wildlife/boats.js - every tourist boat of the map seen by the animals: one descriptor per boat, whatever module drew it.
//   * the Fontanka boats of landmarksC (services.landmarksC.boats: state(t) -> { x, z, rotY }, the boat's local +z is its bow, local x across)
//   * the boats of environment/boats.js (services.environment.boats: state(t) -> { x, z, yaw, speed }; local +x is the bow, local z across; moored boats lie alongside the piers, the moving
//     ones run back and forth on short reaches of the Moika, the Griboedov Canal, the Winter Canal and the Neva, some of them scaled: neva-hydro 1.7, neva-tour 1.4)
// A descriptor: { id, key (waterway), moving, hull: { len, wid } (size included), slots: [{ lx, lz, y }] (the places a gull can stand: roof slabs and railings, local metres in the boat's
//   own frame, y above the boat's origin), y0 (y of the boat's origin), at(t) -> { x, z, rot } (rot = the rotation of the local frame), pose(slot, t) -> { x, y, z, yaw } (world pose of a
//   slot; yaw = the heading of the bow) }. Everything is a pure function of t (the boats are).
// Roof heights are read off environment/boats.js boatGeometry (tram: flat roof slab top 2.13 m, open boat: wheelhouse roof 2.08 m and railing top 1.43 m, speedboat: canopy 1.88 m) and from
// the former landmarksC numbers (BOAT_ROOF: roof 3.0-3.05 m above the water).
/** gull slots per boat: the director and the birds key the taken slots as boatIndex * BOAT_KEY + slot, so no boat may carry more than BOAT_KEY slots */
export const BOAT_KEY = 16;
const ENV_SLOTS = {
  tram: [{ lx: -3.6, lz: 0.55, y: 2.15 }, { lx: -0.7, lz: -0.6, y: 2.15 }, { lx: 2.2, lz: 0.5, y: 2.15 }],
  open: [{ lx: 4.4, lz: 0, y: 2.1 }, { lx: -3.4, lz: 1.6, y: 1.44 }, { lx: -0.8, lz: -1.6, y: 1.44 }],
  speed: [{ lx: -1.0, lz: 0.2, y: 1.9 }],
  // the river-sea cargo ships of the Bolshaya Neva (environment/boats.js boatGeometry 'cargo' / 'cargo2', 110 x 14 m, local +x = bow, y above the water line; deck 4.45): the numbers are read off that
  // builder - deckhouse aft (ax -42): tier 1 roof 7.85 (18 x 11.2 m), tier 2 roof 11.25 (14 x 9.8), wheelhouse roof 14.35 (9 x 11.2), bare mast top 17.95 (x -40.5); the two deck cranes (posts at x 9.5 / -15.5,
  // z 5.04) carry 8 m jibs at 12.88; hatch coamings top 6.26; the forecastle block top 6.6; the bare jackstaff top 8.85 (x 51). No funnel slot (the funnel is hot) and no flag.
  cargo: [
    { lx: -44.2, lz: 3.6, y: 14.37 }, { lx: -42.0, lz: -3.4, y: 14.37 }, { lx: -37.0, lz: 2.6, y: 11.27 }, { lx: -34.2, lz: -3.0, y: 7.87 }, { lx: -40.5, lz: 0, y: 17.97 },
    { lx: 15.3, lz: 5.04, y: 12.9 }, { lx: -9.7, lz: 5.04, y: 12.9 }, { lx: 22, lz: -3.5, y: 6.28 }, { lx: -28, lz: 3.0, y: 6.28 }, { lx: 44, lz: 1.5, y: 6.62 }, { lx: 51, lz: 0, y: 8.87 },
  ],
};
ENV_SLOTS.cargo2 = ENV_SLOTS.cargo;
const ENV_HULL = { tram: [13, 3.2], open: [12, 3.4], speed: [7, 2.4], cargo: [110, 14], cargo2: [110, 14] };
const ENV_SIZE = { 'neva-hydro': 1.7, 'neva-tour': 1.4 };         // the scaled boats of environment/boats.js REACHES (not in the service)
const C_ROOF = { tram: { y: 3.05, z: [-3, 1.5, 6.2] }, vintage: { y: 3.0, z: [-2, 3.5] } };    // landmarksC/boats.js (the Fontanka)

/** @returns {Array} boat descriptors (empty when no module publishes boats) */
export function collectBoats(ctx, L) {
  const out = [], S = ctx.services;
  const piers = S.environment?.piers || [];
  for (const b of S.landmarksC?.boats || []) {
    if (!b || typeof b.state !== 'function') continue;
    const spec = String(b.kind).startsWith('tram') ? C_ROOF.tram : C_ROOF.vintage, tram = spec === C_ROOF.tram;
    const water = L.RIVER_Y.water;
    const slots = spec.z.map((lz, i) => ({ lx: i % 2 ? 0.7 : -0.7, lz, y: spec.y }));
    out.push(make({ id: 'c-' + (b.id ?? out.length), key: 'fontanka', moving: true, hull: { len: tram ? 24 : 18, wid: tram ? 4.4 : 4 }, slots, y0: water, state: b.state, rotOf: (st) => st.rotY, yawOf: (st) => st.rotY }));
  }
  for (const b of S.environment?.boats || []) {
    if (!b || typeof b.state !== 'function' || !ENV_SLOTS[b.type]) continue;
    const size = ENV_SIZE[b.id] || 1, [len, wid] = ENV_HULL[b.type], slots = ENV_SLOTS[b.type].map((s) => ({ lx: s.lx * size, lz: s.lz * size, y: s.y * size }));
    let y0 = L.WATERWAYS[b.key]?.water ?? L.RIVER_Y.water;
    if (!b.moving) {                                                  // moored boats sit on the level of their pontoon (environment/boats.js puts the hull origin at the pier y)
      const s0 = b.state(0); let bd = 60, py = null;
      for (const p of piers) { if (p.key !== b.key) continue; const d = Math.hypot(p.x - s0.x, p.z - s0.z); if (d < bd) { bd = d; py = p.y; } }
      if (py != null) y0 = py;
    }
    out.push(make({ id: 'e-' + b.id, key: b.key, moving: !!b.moving, hull: { len: len * size, wid: wid * size }, slots, y0, state: b.state, rotOf: (st) => st.yaw, yawOf: (st) => st.yaw + Math.PI / 2 }));
  }
  // the two moored liners of the Marine Facade port (landmarksMarineFacade/ships.js; static, no horn): ctx.services.landmarksMarineFacade.ships = [{ id, c, ax, L, B, wall }]
  for (const sh of S.landmarksMarineFacade?.ships || []) {
    const slots = linerSlots(sh); if (!slots.length || !Array.isArray(sh.c)) continue;
    const st = { x: sh.c[0], z: sh.c[1], rot: Math.atan2(-sh.ax[1], sh.ax[0]), yaw: Math.atan2(sh.ax[0], sh.ax[1]) };      // the ship frame: +x = bow (sh.ax), +z = starboard (-ax1, ax0): the same frame as the boats of the environment
    out.push(make({ id: 'm-' + sh.id, key: 'neva', moving: false, hull: { len: sh.L, wid: sh.B }, slots, y0: L.WATERWAYS.neva.water, state: () => st, rotOf: (q) => q.rot, yawOf: (q) => q.yaw }));
  }
  return out;
}

/** numbers of landmarksMarineFacade/ships.js (SHIPS rows and liner()): the wheelhouse (x bridge, wing roofs y 39.0, bridge roof 42.0, mast cross-bars 52.3 / 57.2), the funnel cap (x funnelX, top funnelTop), the glass solarium roof (top + 2.4),
 *  the tender roofs (12 per side from x tender0 every 14 m, 14.55 m off the centre line, y 13.2), y over the water line */
const LINERS = { 'liner-a': { bridge: 96, tender0: -108, funnelX: -40, funnelTop: 52, top: 36, fRx: 9.3 }, 'liner-b': { bridge: 82, tender0: -88, funnelX: -60, funnelTop: 48, top: 39, fRx: 4.2 } };
function linerSlots(sh) {
  const d = sh && LINERS[sh.id]; if (!d || !Array.isArray(sh.ax)) return [];
  const s = [], add = (lx, lz, y) => s.push({ lx, lz, y });
  for (const [dx, lz] of [[-2, 12], [-2, -12], [2, 16], [2, -16]]) add(d.bridge + dx, lz, 39.03);
  add(d.bridge - 0.5, 3.0, 42.03);
  for (const sg of [-1, 1]) add(d.funnelX + sg * d.fRx * 0.45, -sg * 0.9, d.funnelTop + 0.02);
  add(10, 3, d.top + 2.43); add(30, -4, d.top + 2.43);
  for (const [n, sg] of [[1, 1], [4, -1], [7, 1], [10, -1]]) add(d.tender0 + 14 * n, sg * 14.55, 13.22);
  add(d.bridge - 0.5, 2.4, 52.32); add(d.bridge - 0.5, -1.6, 57.22);
  return s;
}

function make(o) {
  const at = (t) => { const st = o.state(t); return { x: st.x, z: st.z, rot: o.rotOf(st), yaw: o.yawOf(st) }; };
  const pose = (slot, t) => {
    const a = at(t), s = o.slots[slot % o.slots.length], cs = Math.cos(a.rot), sn = Math.sin(a.rot);
    return { x: a.x + s.lx * cs + s.lz * sn, y: o.y0 + s.y, z: a.z - s.lx * sn + s.lz * cs, yaw: a.yaw };
  };
  return { id: o.id, key: o.key, moving: o.moving, hull: o.hull, slots: o.slots, y0: o.y0, at, pose, n: o.slots.length };
}

/** world oriented hull boxes of every boat over a whole lap (positions every `dt` seconds up to `T`): [{ x, z, c, s, hl, hw }]; a moored boat gives one entry. `rotOf` is the local frame's rotation;
 *  the long axis is local x for the environment boats and local z for the Fontanka ones, hence `longZ`. */
export function hullBoxes(boats, T = 480, dt = 2.5) {
  const out = [];
  for (const b of boats) {
    const longZ = b.id.startsWith('c-'), n = b.moving ? Math.ceil(T / dt) : 1;
    for (let k = 0; k < n; k++) {
      const a = b.at(k * dt);
      out.push({ x: a.x, z: a.z, c: Math.cos(a.rot), s: Math.sin(a.rot), hl: b.hull.len / 2, hw: b.hull.wid / 2, longZ });
    }
  }
  return out;
}

/** gap (m) between a point and the nearest hull box (0 inside), with a spatial hash of the boxes (cells of 40 m) */
export function makeHullIndex(boxes) {
  const CELL = 40, grid = new Map(), key = (i, j) => i * 40009 + j;
  for (const h of boxes) { const i = Math.floor(h.x / CELL), j = Math.floor(h.z / CELL); const k = key(i, j); (grid.get(k) || grid.set(k, []).get(k)).push(h); }
  return function gap(x, z) {
    let m = 1e9; const ci = Math.floor(x / CELL), cj = Math.floor(z / CELL);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const h of grid.get(key(i, j)) || []) {
      const dx = x - h.x, dz = z - h.z;
      const lx = dx * h.c - dz * h.s, lz = dx * h.s + dz * h.c;              // into the boat frame (x across for longZ boats, x along otherwise)
      const ax = h.longZ ? h.hw : h.hl, az = h.longZ ? h.hl : h.hw;
      const g = Math.hypot(Math.max(Math.abs(lx) - ax, 0), Math.max(Math.abs(lz) - az, 0));
      if (g < m) m = g;
    }
    return m;
  };
}
