// environment/island-banks.js - the island-only pieces of the quay of the round-2 islands (Yelagin, Kamenny, Aptekarsky, Petrovsky, Serny, Krestovsky), owner (B) water-banks, 2026-10-14 (integration pass).
// Pure data + geometry helpers (no layout reads here: quay.js, waterways.js and water.js call them). Everything is restricted to the island ground (environment/islands.js inIslands): the older districts never see it.
//   GANGWAYS      walkable gangways from a natural slope to a floating landing stage (the water-bus dock of Yelagin Island, OSM w100868959; request of landmarksYelaginPark 6):
//                 { id, head: { x, z } (the slope-top barrier line, y 0), foot: { x, z, y } (on the pontoon deck), w }; the pontoon and its railing are drawn by landmarksYelaginPark, the slope and the slope-top
//                 barrier by quay.js: the gangway is the gate in that barrier, a sticky walk ramp from the barrier to the pontoon, two railing colliders and a light steel deck with handrails (1 mesh)
//   gangwayGates() the gates [{ x, z, hw }] that quay.js cuts out of the slope-top barrier boxes
//   gangwayGeometry(B, g) / gangwayColliders(ph, g, info)   the mesh (MeshBuilder B) and the colliders of one gangway
// (no imports: river.js reads CHANNELS, so this file stays pure data; quay.js passes revet.js prism() to gangwayGeometry)

// ---- the water-bus dock "Елагин остров" (OSM w100868959, a 23.8 x 5.0 m floating pontoon beside the grass slope of the Srednyaya Nevka; landmarksYelaginPark/piers.js dock() draws the pontoon 1 m off the OSM
// polygon, deck y = water + 0.6 = -2.8). The OSM polygon touches the shore with its long edge o1-o2 (that edge IS the bank line, the slope rises landward from it, the slope-top barrier of quay.js stands 7.2 m
// inland); the gangway crosses from that barrier to the near edge of the pontoon, 8.2 m along the pontoon from its middle (between the bollard at 6.1 m and the one at 9.5 m, clear of the canopy posts).
const DOCK_O = [[-5549.5, -4971.3], [-5546.3, -4975.1], [-5527.9, -4960.0], [-5531.1, -4956.2]];
function dockGangway() {
  const o = DOCK_O, a = [(o[0][0] + o[1][0]) / 2, (o[0][1] + o[1][1]) / 2], b = [(o[2][0] + o[3][0]) / 2, (o[2][1] + o[3][1]) / 2];
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len, sx = -uz, sz = ux;      // along the pontoon; side = toward the water (the module shifts its pontoon +1 m that way)
  const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, at = 8.2, BAR = 7.2;                                                  // the middle of the OSM polygon; the position along; the barrier distance from the bank line
  const P = (u, s) => ({ x: cx + ux * u + sx * s, z: cz + uz * u + sz * s });
  // side coordinates relative to the middle of the OSM polygon: bank line -2.5, slope-top barrier -2.5 - 7.2, pontoon near edge -1.5 (the module's 1 m shift), the foot 0.6 m onto the deck
  const head = P(at, -2.5 - BAR - 0.6), foot = P(at, -1.5 + 0.6);
  return { id: 'yelagin-dock', head, foot: { ...foot, y: -2.8 }, w: 1.5, gate: P(at, -2.5 - BAR) };
}
export const GANGWAYS = [dockGangway()];
export const gangwayGates = () => GANGWAYS.map((g) => ({ x: g.gate.x, z: g.gate.z, hw: g.w / 2 + 0.55 }));

/** the frame of a gangway: unit vector from the head to the foot (t), its left normal (n) and the length */
function frame(g) {
  const dx = g.foot.x - g.head.x, dz = g.foot.z - g.head.z, len = Math.hypot(dx, dz), tx = dx / len, tz = dz / len;
  return { tx, tz, nx: -tz, nz: tx, len };
}
/** the colliders: a terrain hole under it, a sticky walk ramp (y 0 at the head, the pontoon deck at the foot) and a solid rail line on each side (0.12 m, from the water to 1.1 m above the head) */
export function gangwayColliders(ph, g, info) {
  const f = frame(g), cx = (g.head.x + g.foot.x) / 2, cz = (g.head.z + g.foot.z) / 2, rot = Math.atan2(f.tx, f.tz);
  ph.addHole(cx, cz, g.w + 0.2, f.len, rot);      // the terrain under the gangway is no floor: it lies at street level (the slope is only a mesh), the ramp must be the surface the walker stands on
  ph.addWalkRamp(cx, cz, g.w, f.len, rot, 0, g.foot.y, 0.4);
  for (const sg of [-1, 1]) {
    const off = g.w / 2 + 0.07;
    ph.addBox(cx + f.nx * sg * off, cz + f.nz * sg * off, 0.12, f.len, rot, -6, 1.15);
  }
  if (info) info.colliders += 4;
}
/** the mesh: a light steel deck on two stringers with cleats every 0.4 m, handrails (top 1.0, middle 0.5) on posts every 1.6 m, a flush granite landing at the head and a hinge plate on the pontoon */
export function gangwayGeometry(B, g, prism) {
  const f = frame(g), n = Math.max(2, Math.ceil(f.len / 0.4)), yAt = (t) => g.foot.y * Math.min(1, Math.max(0, t / f.len));
  const P3 = (t, s, dy) => [g.head.x + f.tx * t + f.nx * s, yAt(t) + dy, g.head.z + f.tz * t + f.nz * s];
  const hw = g.w / 2;
  prism(B, P3(0, 0, -0.08), P3(f.len, 0, -0.08), f.nx, f.nz, g.w, 0.06);                                          // the deck plate
  for (const sg of [-1, 1]) {
    prism(B, P3(0, sg * (hw - 0.05), -0.24), P3(f.len, sg * (hw - 0.05), -0.24), f.nx, f.nz, 0.08, 0.26);        // the two stringers
    for (const rail of [1.0, 0.5]) prism(B, P3(0, sg * (hw + 0.04), rail), P3(f.len, sg * (hw + 0.04), rail), f.nx, f.nz, 0.05, 0.05);
    for (let t = 0.15; t <= f.len + 1e-6; t += (f.len - 0.3) / Math.max(1, Math.round((f.len - 0.3) / 1.6))) {   // the posts
      const q = P3(Math.min(t, f.len - 0.15), sg * (hw + 0.04), 0);
      prism(B, [q[0], q[1] - 0.04, q[2]], [q[0], q[1] + 1.03, q[2]], f.nx, f.nz, 0.05, 0.05);
    }
  }
  for (let i = 0; i < n; i++) { const t = (i + 0.5) * f.len / n; prism(B, P3(t, 0, -0.01), P3(t + 0.04, 0, -0.01), f.nx, f.nz, g.w - 0.1, 0.03); }      // the cleats
  // the granite landing at the head: flush with the lawn, 1.9 x 1.0 m, the hinge plate on the pontoon deck
  prism(B, P3(-0.5, 0, -0.02), P3(0.45, 0, -0.02), f.nx, f.nz, g.w + 0.4, 0.06);
  prism(B, P3(f.len - 0.35, 0, 0.0), P3(f.len + 0.05, 0, 0.0), f.nx, f.nz, g.w, 0.05);
}

// ---- CHANNELS: the short water channels that join the Yelagin ponds to the Nevkas (OSM waterway=canal, no polygon in the data; requests of bridges/yelaginPonds.js 1, landmarksYelaginPark 7, the Yelagin critic 8): river.js parkPonds() lays
// each as a park pond (ground cut, still water 0.35 m under the lawn, 1.1 m sloping rim, outline collider), so the deck of its bridge crosses water and the arch opening shows. pts: the OSM line (lock gate on the Nevka -> pond), w: the
// outline width (the water is w - 2.2 m wide: the rim slopes 1.1 m inward on each side). Only the channel of the north-east gate (lock gate n1157617458, deck w100147063) has water, the culverts are underground.
export const CHANNELS = [
  { id: 'ye-gate-canal', pts: [[-4471.8, -5444.5], [-4476.8, -5430.5], [-4478.2, -5426.2]], w: 5.4 },      // w100145334, 19 m, from the lock gate on the Bolshaya Nevka to the east tip of the 1st Northern pond
];
/** the outline of a channel as a flat ring [x, z, ...]: the polyline offset by w / 2 on both sides (mitred), closed */
export function channelRing(c) {
  const P = c.pts, n = P.length, hw = c.w / 2, left = [], right = [];
  const nrm = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
  for (let i = 0; i < n; i++) {
    const a = nrm(P[Math.max(0, i - 1)], P[i === 0 ? 1 : i]), b = nrm(P[i === n - 1 ? n - 2 : i], P[Math.min(n - 1, i + 1)]);
    let mx = a[0] + b[0], mz = a[1] + b[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = Math.min(2, 1 / Math.max(0.5, mx * b[0] + mz * b[1]));
    left.push([P[i][0] + mx * hw * k, P[i][1] + mz * hw * k]); right.push([P[i][0] - mx * hw * k, P[i][1] - mz * hw * k]);
  }
  return [...left, ...right.reverse()].flat();
}
