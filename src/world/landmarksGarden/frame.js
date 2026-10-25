// landmarksGarden/frame.js - the garden frame G, the garden ring and the fence data (docs/research/summer-garden.md 2.2, 3.2-3.3, 4.1).
//   G0 = (-967.7, -1639.2) = centre of the Neva fence = the central gate = the axis of the Main alley.  s runs INTO the garden (unit (0.3325, 0.9432), bearing 160.6 deg), q to the east (unit (0.9432, -0.3325)).
//   World: x = G0x + 0.3325 s + 0.9432 q ; z = G0z + 0.9432 s - 0.3325 q.
// The Neva fence is skewed 95 deg to the alleys (the real skew): its columns are given in world coordinates, derived from the OSM way w197658144.
import { GARDEN_RING } from './groups.js';

export const G0 = { x: -967.7, z: -1639.2 };
export const SU = [0.3325, 0.9432], QU = [0.9432, -0.3325];
export const fromG = (s, q) => ({ x: G0.x + SU[0] * s + QU[0] * q, z: G0.z + SU[1] * s + QU[1] * q });
export const toG = (x, z) => { const dx = x - G0.x, dz = z - G0.z; return { s: SU[0] * dx + SU[1] * dz, q: QU[0] * dx + QU[1] * dz }; };

export const RING = GARDEN_RING;
export const RING_FLAT = GARDEN_RING.flat();
export function inRing(x, z, ring = GARDEN_RING) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if ((ring[i][1] > z) !== (ring[j][1] > z) && x < (ring[j][0] - ring[i][0]) * (z - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c;
  return c;
}

/** distance from (x, z) to the polyline pts ([[x,z]..]) and the nearest point */
export function nearestOnLine(pts, x, z) {
  let best = 1e9, bx = 0, bz = 0, bt = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bx = px; bz = pz; bt = i + t; }
  }
  return { d: best, x: bx, z: bz, t: bt };
}

// ------------------------------------------------------------------------------------------------ the Neva fence: 36 columns (table of the dossier 3.3), gates between columns 8-9, 15-16 and 22-23
export const NEVA_COLS = [
  [-1056.6, -1599.1], [-1050.4, -1601.9], [-1044.2, -1604.7], [-1038.1, -1607.5], [-1031.9, -1610.3], [-1025.7, -1613.0], [-1019.5, -1615.8], [-1013.4, -1618.6],
  [-1006.9, -1621.5], [-1000.8, -1624.3], [-994.6, -1627.0], [-988.5, -1629.8], [-982.4, -1632.5], [-976.2, -1635.3], [-970.5, -1637.9], [-964.8, -1640.5],
  [-959.1, -1643.0], [-953.0, -1645.8], [-946.8, -1648.5], [-940.7, -1651.3], [-934.6, -1654.1], [-928.5, -1656.8], [-921.5, -1659.9], [-915.8, -1662.5],
  [-910.0, -1665.1], [-904.2, -1667.7], [-898.5, -1670.3], [-892.7, -1672.9], [-886.9, -1675.5], [-881.2, -1678.1], [-875.4, -1680.7], [-869.6, -1683.3],
  [-863.9, -1685.9], [-858.1, -1688.5], [-852.4, -1691.1], [-846.6, -1693.7],
];
/** gates as index pairs (0-based) of the columns they lie between */
export const NEVA_GATES = [{ a: 7, b: 8, kind: 'small', id: 'neva-west' }, { a: 14, b: 15, kind: 'big', id: 'neva-central' }, { a: 21, b: 22, kind: 'small', id: 'neva-east' }];
/** direction of the fence (unit, world x / z) and the rotY of a model whose +x runs along it (+z then points to the garden, -z to the Neva) */
export const NEVA_DIR = (() => { const a = NEVA_COLS[0], b = NEVA_COLS[35], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return [dx / l, dz / l]; })();
/** rotY for a model whose +x points along the world direction (dx, dz): three's Ry(rot) maps +x to (cos rot, -sin rot), +z to (sin rot, cos rot) */
export const rotOf = (dx, dz) => Math.atan2(-dz, dx);
export const NEVA_ROT = rotOf(NEVA_DIR[0], NEVA_DIR[1]);

// ------------------------------------------------------------------------------------------------ the Moika fence (dossier 4.1, OSM w197658145) from the Lebyazhy corner to the Fontanka corner
// shifted 1.3 m toward the garden (the OSM way lies on the pavement footway w308448838, which the fence must not cross)
const MOIKA_RAW = [[-856.2, -1015.4], [-852, -1017], [-850, -1018], [-846.6, -1020.4], [-823.1, -1037.1], [-812.9, -1044.2], [-807.9, -1047.9], [-797.9, -1055], [-764.8, -1078.4], [-762.6, -1080], [-760.9, -1081.2], [-754.9, -1085.3], [-752.4, -1087.7], [-750.5, -1089.5]];
export const MOIKA_PTS = MOIKA_RAW.map((p) => [p[0] - 0.75, p[1] - 1.07]);
export const MOIKA_GATES = [{ x: -848.3, z: -1019.2, id: 'moika-west', open: false }, { x: -810.4, z: -1046.0, id: 'moika-main', open: true, half: 4.2 }, { x: -751.4, z: -1088.8, id: 'moika-east', open: false }];
export const PORPHYRY_VASE = { x: -814, z: -1057 };
