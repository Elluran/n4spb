// bridges/troitsky.js - the Troitsky (Trinity) Bridge (Троицкий мост, 1897-1903, Batignolles; south end rebuilt 1965-67) over the Neva, COMPLETE from the Mars Field bank to Troitskaya Square:
// docs/research/petro-bridges.md section 1 (+ mars-bridges-canals.md section 5 for the south end), photos refs/petro-bridges 01 02 03 07 09 12 15 17, refs/mars-bridges 79 86 89 90.
// 582 m with the land parts, 554.0 m bank to bank on the OSM axis, 10 spans from the south (u from the Mars Field bank line): 11.4 fixed (granite false arch) | pier 3.8 | 43.2 single-leaf bascule
// (deep girder with a curved bottom chord, closed: summer day) | pier 12.1 (granite) | 53.3 | 76.4 | 96.4 | 76.4 | 53.3 steel spans (straight top chord under a plate fascia with a rosette band,
// flat arched lower chord, verticals + crossed diagonals) on four river piers (grey granite drum with round ends 2.3 m above the water + a green cast portal up to the deck) | junction pylon |
// the GRANITE VIADUCT of the right bank: three segmental arches 22 / 20 / 18 m (the 18 m one at the bank) on piers with cone-capped round cutwaters, a torus course and a SOLID granite parapet |
// abutment pylons at the bank line.  Cross-section: 23.6 m between the railings = 2 x 2.3 m pavements (granite slabs) + 19.0 m roadway (2 + 2 lanes, two tram tracks in the middle on both sides
// of a narrow raised median with 21 twin-arm contact-wire poles), a granite barrier kerb 0.5 m high (green steel on the bascule leaf).  Railing `whip` (sage) between square posts with pyramid caps
// on the steel part, granite parapets on the south span and on the viaduct; 16 three-globe candelabra in pairs over the piers (steel pedestal boxes on the river piers, granite pedestals on the
// granite piers / pylons), 24 one-globe lamps at the kerb, two polished red-brown obelisks with rostra and the gilded eagle at the SOUTH entrance only (NO star, NO flags).
// FRAME: origin = the deck centre on the Mars Field bank line = the midline of the OSM carriageways w142545019 / w142545020, of both tram ways and of both footways (x -1222.74, z -1564.93);
// +u along the bridge toward the Petrograd side (bearing 336.99), +v to the ENE (right of travel).  (Until 2026-10-06 the deck stood 5.45 m too far ENE: an error of the first dossier.)
// Our street level is flat (y 0 = 3.4 m above the Neva) on both banks, the real approaches rise: the deck profile here is +0.05 at both bank lines and +4.7 at the crown (8.1 m above the water), so
// the viaduct arches are lower than the real ones (crowns 2.4 - 3.4 m above the water instead of ~4.7).  Estimates [E]: pier thicknesses (12.1 m by subtraction), the profile, the portal shapes.
import * as THREE from 'three';
import { frameOf, toUV, frameBounds } from './sites.js';
import { obeliskTroitsky } from './sculpt2.js';
import { candelabraT, pedestalT, lampT, contactPoleT } from './sculpt4.js';
import { closeBank } from './long.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const TROITSKY = { id: 'troitsky', cx: -1222.74, cz: -1564.93, b: 336.99 };
export const LEN = 554.0, HW = 11.8, ROAD = 9.5;
const HV = HW + 0.55, KERB = 0.35, PAVE = 0.2;
const STEEL0 = 15.2, STEEL1 = 474.5;                                 // the steel part (whip railing, sage cornice); granite parapets outside it
/** [u0, u1, kind]: granite = massive granite pier up to the deck (the 1967 bascule piers), drum = granite drum + green cast portal, pylon = the junction block granite / steel, via = viaduct pier */
export const PIERS = [[11.4, 15.2, 'granite'], [58.2, 70.3, 'granite'], [123.6, 135.7, 'drum'], [212.1, 224.2, 'drum'], [320.6, 332.7, 'drum'], [409.1, 421.2, 'drum'], [474.5, 483.4, 'pylon'], [505.4, 510.7, 'via'], [530.7, 536.0, 'via']];
export const SPANS = [[0, 11.4, 'fixed'], [15.2, 58.2, 'bascule'], [70.3, 123.6, 'arch'], [135.7, 212.1, 'arch'], [224.2, 320.6, 'arch'], [332.7, 409.1, 'arch'], [421.2, 474.5, 'arch'], [483.4, 505.4, 'stone'], [510.7, 530.7, 'stone'], [536.0, LEN, 'stone']];
const KEYS = [[0, 0.05], [15.2, 0.45], [58.2, 1.5], [129.6, 3.1], [218, 4.35], [272, 4.7], [326, 4.35], [415, 3.0], [479, 1.75], [536, 0.42], [LEN, 0.05]];
const FASCIA = 1.3;                                                  // deck girder depth under the pavement (the plate fascia)
const SEAT = -1.0;                                                   // lower chord seat on the drum piers (2.4 m above the Neva)
const SPRING = -2.6;                                                 // springing of the granite arches (0.8 m above the Neva)

// monotone cubic (Fritsch-Carlson) through KEYS: a smooth hump without the flats a per-interval ease leaves at every key
const _kx = KEYS.map((k) => k[0]), _ky = KEYS.map((k) => k[1]), _kd = [], _km = [];
for (let i = 0; i + 1 < KEYS.length; i++) _kd.push((_ky[i + 1] - _ky[i]) / (_kx[i + 1] - _kx[i]));
for (let i = 0; i < KEYS.length; i++) _km.push(i === 0 ? _kd[0] : i === KEYS.length - 1 ? _kd[i - 1] : _kd[i - 1] * _kd[i] <= 0 ? 0 : 2 / (1 / _kd[i - 1] + 1 / _kd[i]));
export const yDeck = (u) => {
  if (u <= _kx[0]) return _ky[0];
  const n = _kx.length; if (u >= _kx[n - 1]) return _ky[n - 1];
  let i = 0; while (u > _kx[i + 1]) i++;
  const h = _kx[i + 1] - _kx[i], t = (u - _kx[i]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * _ky[i] + (t3 - 2 * t2 + t) * h * _km[i] + (-2 * t3 + 3 * t2) * _ky[i + 1] + (t3 - t2) * h * _km[i + 1];
};
const slopeOf = (u) => (yDeck(u + 0.5) - yDeck(u - 0.5)) / 1.0;
// the two tram tracks: at the bank lines they stand where the OSM tram ways w142545024 (east) / w142545023 (west) end (the street rails join there), on the bridge 1.85 m from the axis
const _tr = (x0, z0, x1, z1) => { const a = toUV(TROITSKY, x0, z0), b = toUV(TROITSKY, x1, z1); return [a.v, b.v]; };
const TRACKS = [[..._tr(-1220.4, -1565.9, -1437.5, -2075.0), 1.85], [..._tr(-1224.1, -1564.3, -1440.8, -2073.6), -1.85]];
const trackV = (k, u) => { const [v0, v1, vm] = TRACKS[k], e = (t) => t * t * (3 - 2 * t); return u < 40 ? v0 + (vm - v0) * e(clamp(u / 40, 0, 1)) : u > LEN - 40 ? v1 + (vm - v1) * e(clamp((LEN - u) / 40, 0, 1)) : vm; };
/** stations of the candelabra pairs [u, pedestal kind] and of the small lamps / contact poles (for services.bridges.masts) */
export const CANDELABRA = [[13.3, 'granite'], [64.25, 'granite'], [129.65, 'steel'], [218.15, 'steel'], [326.65, 'steel'], [415.15, 'steel'], [476.3, 'granite'], [555.1, 'granite']];
const LAMPS = [36.7, 97, 161.2, 186.6, 248.3, 272.4, 296.5, 358.2, 383.6, 447.9, 494.5, 520.7];
const POLES = Array.from({ length: 21 }, (_, k) => 14 + k * 26.3);
const candV = (u) => (u > LEN ? HV + 0.1 : HW + 0.3);                 // the pedestals straddle the railing line (the pavement stays 1.2 m clear)

export function buildTroitsky(env) {
  const { ctx, P, M, rails } = env, f = frameOf(TROITSKY), T = f.T, waterY = env.waterY;
  const world = (u, v) => ({ x: f.cx + u * f.c - v * f.s, z: f.cz + u * f.s + v * f.c });
  const B = { id: 'troitsky', x: world(LEN / 2, 0).x, z: world(LEN / 2, 0).z, yDeck, info: { rails: 0, colliders: 0 } };
  B.anchors = [60, 180, 300, 420, 520].map((u) => world(u, 0));     // traffic prefilters by 190 m round a list entry: the 554 m deck needs several
  B.span = { a: world(0, 0), b: world(LEN, 0), hw: HW };
  B.at = world(272, -10.9);                                           // photo spot: the west pavement at the crown (the fortress and the Spit lie to the west)
  B.bounds = frameBounds(TROITSKY, -1.6, LEN + 0.8, -HW - 0.3, HW + 0.3, 1.5);
  B.deckAt = (x, z) => { const q = toUV(TROITSKY, x, z); return Math.abs(q.v) <= HW + 0.3 && q.u >= -1.6 && q.u <= LEN + 0.8 ? yDeck(clamp(q.u, 0, LEN)) : null; };
  const faceShape = (mat, pts, v, sg, tile = 2.4, holes = []) => {
    const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    for (const h of holes) sh.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1]))));
    const g = new THREE.ShapeGeometry(sh, 1), pa = g.attributes.position, ua = g.attributes.uv, na = g.attributes.normal;
    for (let i = 0; i < pa.count; i++) { ua.setXY(i, pa.getX(i) / tile, pa.getY(i) / tile); na.setZ(i, sg); }
    if (sg < 0) { const ix = g.index; for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a); } }
    P.geo(mat, g, 0, 0, v); g.dispose();
  };
  const railHex = '#8fa89a', stone = M.granitePeach, sage = M.sageT;
  const yb = -4.7;

  P.push(f.cx, 0, f.cz, -T);
  // ------------------------------------------------------------------ the fascia along the bridge (both faces): granite false arch, bascule girder, steel plate band, the viaduct wall
  const bascD = (u) => 1.3 + 2.9 * Math.pow(clamp((58.2 - u) / 43, 0, 1), 1.6);                  // girder depth, 4.2 m at the counterweight pier
  const seatOf = (pu) => { const p = PIERS.find((q) => Math.abs(q[0] - pu) < 0.01 || Math.abs(q[1] - pu) < 0.01); return p && p[2] === 'drum' ? SEAT : p && p[2] === 'pylon' ? SEAT - 0.6 : -2.2; };
  const archLow = (s, u) => {                                       // lower chord of a steel span: a parabola between the two seats, crown 1.65 m under the deck
    const [a, b] = s, mid = (a + b) / 2, cy = yDeck(mid) - FASCIA - 0.35, t = (u - mid) / ((b - a) / 2), ya = seatOf(a), yb2 = seatOf(b), base = ya + (yb2 - ya) * (u - a) / (b - a);
    return base + (cy - (ya + yb2) / 2) * (1 - t * t);
  };
  const lowerOf = (s, u) => s[2] === 'bascule' ? Math.max(yDeck(u) - bascD(u), waterY + 1.6) : yDeck(u) - FASCIA;      // y of the deck girder soffit
  /** circular segment of a granite arch: points from (a, SPRING) over the crown to (b, SPRING) */
  const stoneArc = (s, n = 16, grow = 0) => {
    const [a, b] = s, c = (b - a) / 2, mid = (a + b) / 2, cy = yDeck(mid) - 1.25, fr = cy - SPRING, R = (c * c + fr * fr) / (2 * fr), y0 = cy - R, a0 = Math.asin(c / R), pts = [];
    for (let i = 0; i <= n; i++) { const al = -a0 + 2 * a0 * i / n; pts.push([mid + Math.sin(al) * (R + grow), y0 + Math.cos(al) * (R + grow)]); }
    return pts;
  };
  const STONE = SPANS.filter((s) => s[2] === 'stone'), VIA0 = STEEL1, VIA1 = LEN + 2.6;
  for (const sg of [-1, 1]) {
    const v = sg * HW;
    for (const s of SPANS) {
      const [a, b] = [s[0], s[1]], n = Math.max(4, Math.round((b - a) / 3));
      if (s[2] === 'stone') continue;
      const pts = [];
      for (let i = 0; i <= n; i++) { const u = a + (b - a) * i / n; pts.push([u, lowerOf(s, u)]); }
      for (let i = n; i >= 0; i--) { const u = a + (b - a) * i / n; pts.push([u, yDeck(u) - 0.22]); }
      if (s[2] === 'fixed') {                                       // granite false arch over the 11.4 m opening (the face is stone, bank to the first pier)
        const yt = yDeck(0) - 0.05, op = [[0.6, yb + 0.2]]; const nA = 12;
        for (let i = 0; i <= nA; i++) { const u = 0.6 + (b - 0.6) * i / nA, t = (i / nA) * 2 - 1; op.push([u, -2.0 + 1.9 * (1 - t * t)]); }
        op.push([b, yb + 0.2]);
        faceShape(M.pierPink, [[0, yb], [b + 3.8, yb], [b + 3.8, yDeck(b + 3.8) - 0.1], [0, yt]], v + sg * 0.02, sg, 2.2, [op]);
      } else {
        faceShape(s[2] === 'bascule' ? M.steelTroitsky : M.bandTroitsky, pts, v + sg * 0.02, sg, s[2] === 'bascule' ? 2.4 : 2.6);
      }
    }
    for (const [pa, pb, kind] of PIERS) if (kind === 'drum') faceShape(M.bandTroitsky, [[pa, yDeck(pa) - FASCIA], [pb, yDeck(pb) - FASCIA], [pb, yDeck(pb) - 0.22], [pa, yDeck(pa) - 0.22]], v + sg * 0.02, sg, 2.6);   // the plate band runs on over the river piers
    // the viaduct wall: one granite face from the junction pylon to the abutment with the three arch openings, the lighter voussoir rings, the torus course
    {
      const top = [], nT = Math.ceil((VIA1 - VIA0) / 3);
      for (let i = nT; i >= 0; i--) { const u = VIA0 + (VIA1 - VIA0) * i / nT; top.push([u, yDeck(u) + PAVE - 0.02]); }
      const holes = STONE.map((s) => [[s[0], yb + 0.2], ...stoneArc(s), [s[1], yb + 0.2]]);
      faceShape(stone, [[VIA0, yb], [VIA1, yb], ...top], sg * HV, sg, 2.2, holes);
      for (const s of STONE) {
        const inn = stoneArc(s, 16, 0), out = stoneArc(s, 16, 0.9), vz = sg * (HV + 0.06);
        for (let i = 0; i < 16; i++) {
          P.quad(M.voussoir, [inn[i][0], inn[i][1], vz], [inn[i + 1][0], inn[i + 1][1], vz], [out[i + 1][0], out[i + 1][1], vz], [out[i][0], out[i][1], vz], [0, 0, sg], [[i * 0.5, 0], [i * 0.5 + 0.5, 0], [i * 0.5 + 0.5, 0.4], [i * 0.5, 0.4]]);
          P.quad(M.voussoir, [out[i][0], out[i][1], vz], [out[i + 1][0], out[i + 1][1], vz], [out[i + 1][0], out[i + 1][1], sg * HV], [out[i][0], out[i][1], sg * HV], [0, 1, 0]);
        }
      }
      for (let i = 0; i < nT; i++) {                                // torus string course under the parapet
        const u0 = VIA0 + (VIA1 - VIA0) * i / nT, u1 = VIA0 + (VIA1 - VIA0) * (i + 1) / nT, y0 = yDeck(u0) + PAVE, y1 = yDeck(u1) + PAVE, vo = sg * (HV + 0.2);
        P.quad(M.coping, [u0, y0 - 0.3, vo], [u1, y1 - 0.3, vo], [u1, y1 - 0.04, vo], [u0, y0 - 0.04, vo], [0, 0, sg]);
        P.quad(M.coping, [u0, y0 - 0.04, vo], [u1, y1 - 0.04, vo], [u1, y1 - 0.04, sg * HV], [u0, y0 - 0.04, sg * HV], [0, 1, 0]);
        P.quad(M.copingDark, [u0, y0 - 0.3, vo], [u1, y1 - 0.3, vo], [u1, y1 - 0.3, sg * HV], [u0, y0 - 0.3, sg * HV], [0, -1, 0]);
      }
    }
    // a cornice along the deck edge: sage steel on the steel part, granite on the south span
    const nc = Math.ceil(STEEL1 / 3);
    for (let i = 0; i < nc; i++) {
      const u0 = STEEL1 * i / nc, u1 = STEEL1 * (i + 1) / nc, y0 = yDeck(u0), y1 = yDeck(u1), cm = u1 <= STEEL0 + 0.5 ? M.coping : M.railSage;
      P.quad(cm, [u0, y0 - 0.34, v + sg * 0.12], [u1, y1 - 0.34, v + sg * 0.12], [u1, y1 + PAVE, v + sg * 0.12], [u0, y0 + PAVE, v + sg * 0.12], [0, 0, sg]);
      P.quad(cm, [u0, y0 + PAVE, v + sg * 0.12], [u1, y1 + PAVE, v + sg * 0.12], [u1, y1 + PAVE, v - sg * 0.3], [u0, y0 + PAVE, v - sg * 0.3], [0, 1, 0]);
    }
  }
  // soffit: the deck underside of the steel part, dark inner girders of the bascule; the granite vaults
  for (const s of SPANS) {
    const [a, b] = [s[0], s[1]], n = Math.max(4, Math.round((b - a) / 4));
    if (s[2] === 'stone') {
      const arc = stoneArc(s, 16);
      for (let i = 0; i < 16; i++) P.quad(M.graniteDark, [arc[i][0], arc[i][1], -HV], [arc[i + 1][0], arc[i + 1][1], -HV], [arc[i + 1][0], arc[i + 1][1], HV], [arc[i][0], arc[i][1], HV], [0, -1, 0], [[arc[i][0] / 2.2, -HV / 2.2], [arc[i + 1][0] / 2.2, -HV / 2.2], [arc[i + 1][0] / 2.2, HV / 2.2], [arc[i][0] / 2.2, HV / 2.2]]);
      for (const [uu, nx] of [[a, 1], [b, -1]]) P.quad(M.graniteDark, [uu, yb, -HV], [uu, yb, HV], [uu, SPRING, HV], [uu, SPRING, -HV], [nx, 0, 0], [[-HV / 2.2, yb / 2.2], [HV / 2.2, yb / 2.2], [HV / 2.2, SPRING / 2.2], [-HV / 2.2, SPRING / 2.2]]);
      continue;
    }
    for (let i = 0; i < n; i++) {
      const u0 = a + (b - a) * i / n, u1 = a + (b - a) * (i + 1) / n;
      P.quad(M.steelTroitskyDark, [u0, lowerOf(s, u0) - 0.02, -HW], [u1, lowerOf(s, u1) - 0.02, -HW], [u1, lowerOf(s, u1) - 0.02, HW], [u0, lowerOf(s, u0) - 0.02, HW], [0, -1, 0]);
    }
    if (s[2] === 'bascule') for (const vv of [-8, -4, 0, 4, 8]) for (let i = 0; i < n; i++) {
      const u0 = a + (b - a) * i / n, u1 = a + (b - a) * (i + 1) / n, y0 = lowerOf(s, u0), y1 = lowerOf(s, u1);
      for (const w of [-0.12, 0.12]) P.quad(M.steelTroitsky, [u0, y0 - 0.5, vv + w], [u1, y1 - 0.5, vv + w], [u1, y1, vv + w], [u0, y0, vv + w], [0, 0, w < 0 ? -1 : 1]);
      P.quad(M.steelTroitskyDark, [u0, y0 - 0.5, vv - 0.12], [u1, y1 - 0.5, vv - 0.12], [u1, y1 - 0.5, vv + 0.12], [u0, y0 - 0.5, vv + 0.12], [0, -1, 0]);
    }
  }
  // the five steel spans: the arched lower chord (two outer ribs with their visible faces, two inner ribs), verticals and crossed diagonals between the chord and the fascia
  for (const s of SPANS) {
    if (s[2] !== 'arch') continue;
    const [a, b] = [s[0], s[1]], L = b - a, mid = (a + b) / 2, n = Math.max(8, Math.round(L / 2.4));
    for (const vv of [-HW + 0.45, HW - 0.45, -3.8, 3.8]) {
      const outer = Math.abs(vv) > 5, sg0 = vv < 0 ? -1 : 1;
      const lo = [], hi = [];
      for (let i = 0; i <= n; i++) { const u = a + L * i / n, t = Math.abs((u - mid) / (L / 2)), y = archLow(s, u), th = 0.95 - 0.4 * (1 - t); lo.push([u, y]); hi.push([u, Math.min(y + th, yDeck(u) - FASCIA + 0.1)]); }
      const pts = lo.concat(hi.slice().reverse());
      for (const side of outer ? [sg0] : [-1, 1]) faceShape(outer ? M.steelTroitsky : M.steelTroitskyDark, pts, vv + side * 0.14, side, 2.6);
      if (outer) {
        for (let i = 0; i < n; i++) P.quad(M.steelTroitskyDark, [lo[i][0], lo[i][1], vv - 0.14], [lo[i + 1][0], lo[i + 1][1], vv - 0.14], [lo[i + 1][0], lo[i + 1][1], vv + 0.14], [lo[i][0], lo[i][1], vv + 0.14], [0, -1, 0]);
        const nv = Math.max(4, Math.round(L / 3.4)), top = (u) => yDeck(u) - FASCIA - 0.02, ys = (u) => archLow(s, u) + 0.55;
        for (let i = 0; i <= nv; i++) {
          const u = a + L * i / nv, h0 = top(u) - ys(u);
          if (h0 > 0.25) P.box(sage, u - 0.11, u + 0.11, ys(u) - 0.1, top(u), vv + sg0 * 0.02 - 0.1, vv + sg0 * 0.02 + 0.1, 'b', 1);
          if (i < nv) {
            const u1 = a + L * (i + 1) / nv, hm = Math.min(h0, top(u1) - ys(u1));
            if (hm > 0.5) { P.cyl(sage, [u, top(u), vv], [u1, ys(u1) - 0.05, vv], 0.075, 0.075, 4, false); P.cyl(sage, [u, ys(u) - 0.05, vv + sg0 * 0.03], [u1, top(u1), vv + sg0 * 0.03], 0.075, 0.075, 4, false); }
          }
        }
      }
    }
  }
  // ------------------------------------------------------------------ piers
  const halfDrum = (mat, pm, sg, R, rv, y0, y1, seg = 10, tile = 2.2) => {       // a half elliptic cylinder nose beyond the face v = sg * HV (radius R along u, rv across)
    for (let i = 0; i < seg; i++) {
      const a0 = Math.PI * i / seg, a1 = Math.PI * (i + 1) / seg, p0 = [pm - Math.cos(a0) * R, sg * (HV + Math.sin(a0) * rv)], p1 = [pm - Math.cos(a1) * R, sg * (HV + Math.sin(a1) * rv)], am = (a0 + a1) / 2;
      P.quad(mat, [p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], [-Math.cos(am), 0, sg * Math.sin(am)], [[a0 * R / tile, y0 / tile], [a1 * R / tile, y0 / tile], [a1 * R / tile, y1 / tile], [a0 * R / tile, y1 / tile]]);
      P.fan(M.coping, [[pm, y1, sg * HV], [p0[0], y1, p0[1]], [p1[0], y1, p1[1]]], [0, 1, 0]);
    }
  };
  for (const [pa, pb, kind] of PIERS) {
    const pm = (pa + pb) / 2, hu = (pb - pa) / 2, wl = waterY;
    if (kind === 'granite') {                                       // grey caisson base, pink-red granite up to the deck, pointed ice-breakers up- and downstream
      const top = yDeck(pm) - 0.32, baseTop = wl + 1.4;
      P.box(M.pierGrey, pa - 0.6, pb + 0.6, yb, baseTop, -HV - 0.6, HV + 0.6, 'b', 2.2);
      P.box(M.coping, pa - 0.7, pb + 0.7, baseTop - 0.05, baseTop + 0.15, -HV - 0.7, HV + 0.7, 'b', 1.4);
      P.box(M.pierPink, pa, pb, baseTop + 0.15, top, -HV, HV, '', 2.2);
      P.box(M.coping, pa - 0.12, pb + 0.12, top - 0.22, top, -HV - 0.1, HV + 0.1, 'b', 1.4);
      for (const sg of [-1, 1]) {
        const v0 = sg * (HV + 0.6), v1 = sg * (HV + 5.2);
        for (const s2 of [-1, 1]) P.quad(M.pierGrey, [pm + s2 * (hu + 0.6), yb, v0], [pm, yb, v1], [pm, wl + 0.2, v1], [pm + s2 * (hu + 0.6), baseTop, v0], [s2 * 0.9, 0, sg * 0.45], [[0, 0], [2, 0], [2, 1], [0, 1]]);
        P.fan(M.coping, [[pm - hu - 0.6, baseTop, v0], [pm + hu + 0.6, baseTop, v0], [pm, wl + 0.2, v1]], [0, 1, 0.3]);
      }
    } else if (kind === 'drum') {                                   // grey granite drum with round ends 2.3 m above the water, the green cast portal on each face, a dark cross frame under the deck
      const dTop = wl + 2.3, top = yDeck(pm) - 0.3;
      P.box(M.pierGrey, pa - 0.3, pb + 0.3, yb, dTop, -HV, HV, 'b', 2.2);
      P.box(M.coping, pa - 0.42, pb + 0.42, dTop - 0.28, dTop, -HV, HV, 'bfk', 1.4);
      for (const sg of [-1, 1]) {
        halfDrum(M.pierGrey, pm, sg, hu + 0.3, 4.6, yb, dTop - 0.28);
        halfDrum(M.coping, pm, sg, hu + 0.42, 4.72, dTop - 0.28, dTop, 10, 1.4);
        // the portal: flared foot on the drum, a shaft up to the cornice, a round cartouche, the bearing shoes of the two lower chords
        const vf = sg * (HV + 0.05), w0 = hu - 0.5, w1 = hu - 1.9;
        faceShape(sage, [[pm - w0, dTop], [pm + w0, dTop], [pm + w1, dTop + 1.3], [pm + w1, top], [pm - w1, top], [pm - w1, dTop + 1.3]], vf, sg, 2.6);
        P.box(M.steelTroitsky, pm - w1 + 0.5, pm + w1 - 0.5, dTop + 1.5, top - 1.5, Math.min(vf, vf + sg * 0.05), Math.max(vf, vf + sg * 0.05), 'b', 1);        // recessed relief panel
        P.push(pm, top - 0.75, vf + sg * 0.06, 0); P.cyl(M.railSage, [0, 0, 0], [0, 0, sg * 0.08], 0.48, 0.48, 12, true); P.cyl(M.steelTroitsky, [0, 0, sg * 0.08], [0, 0, sg * 0.12], 0.3, 0.3, 10, true); P.pop();
        for (const s2 of [-1, 1]) { P.quad(sage, [pm + s2 * w1, dTop + 1.3, vf], [pm + s2 * w1, top, vf], [pm + s2 * w1, top, vf - sg * 1.1], [pm + s2 * w1, dTop + 1.3, vf - sg * 1.1], [s2, 0, 0]); P.quad(sage, [pm + s2 * w0, dTop, vf], [pm + s2 * w1, dTop + 1.3, vf], [pm + s2 * w1, dTop + 1.3, vf - sg * 1.1], [pm + s2 * w0, dTop, vf - sg * 1.1], [s2 * 0.7, 0.7, 0]); }
      }
      P.box(M.steelTroitskyDark, pm - hu + 1.9, pm + hu - 1.9, dTop, top, -HV + 1.1, HV - 1.1, 'bt', 2);
      P.box(M.steelTroitskyDark, pa, pb, top - 0.05, top + 0.08, -HW, HW, 't', 2);                                                                                // the deck soffit over the pier
    } else if (kind === 'pylon') {                                  // the junction block: its faces belong to the viaduct wall; a projecting pylon with quoins at the steel end, the seat of the last steel span
      const top = yDeck(pm) + PAVE;
      P.box(stone, pa, pb, yb, top - 0.3, -HV + 0.02, HV - 0.02, 'tbfkr', 2.2);                                                                                   // (the face toward the 22 m arch is drawn with the arch)                                                                                    // the end face toward the steel span
      for (const sg of [-1, 1]) {
        const v0 = sg * HV, v1 = sg * (HV + 0.85), q0 = Math.min(v0, v1), q1 = Math.max(v0, v1);
        P.box(M.pierPink, pa, pa + 3.6, yb, top + 0.02, q0, q1, 'b' + (sg > 0 ? 'k' : 'f'), 2.2);
        P.box(M.coping, pa - 0.15, pa + 3.75, top - 0.55, top - 0.3, q0, q1 + (sg > 0 ? 0.15 : 0), 'b', 1.4);
        for (let k = 0; k < 7; k++) { const y0 = wl + 0.6 + k * 0.92; if (y0 + 0.5 > top - 0.6) break; for (const uu of [pa, pa + 3.6 - 0.55]) P.box(M.voussoir, uu - 0.03, uu + 0.58, y0, y0 + 0.5, Math.min(v1, v1 + sg * 0.05), Math.max(v1, v1 + sg * 0.05), 'b', 1.6); }
      }
    } else {                                                        // viaduct pier: the body is the wall face; round cutwaters with a moulded collar and a low cone cap
      for (const sg of [-1, 1]) {
        const cz = sg * HV, R = hu + 0.2, yT = wl + 1.2;
        P.cyl(stone, [pm, yb, cz], [pm, yT, cz], R + 0.12, R, 14, false);
        P.cyl(M.coping, [pm, yT, cz], [pm, yT + 0.22, cz], R + 0.14, R + 0.14, 14, true);
        P.cyl(stone, [pm, yT + 0.22, cz], [pm, yT + 1.5, cz], R, 0.35, 14, true);
      }
    }
  }
  // the first pier (the counterweight pit of the bascule) is only 3.8 m wide: dark counterweight boxes under the deck beside it
  P.box(M.steelTroitskyDark, 15.2, 21.0, yDeck(18) - 3.6, yDeck(18) - FASCIA, -HW + 0.3, HW - 0.3, 'b', 1.6);
  // the north abutment (the bank is the back of the 18 m arch): two pylons with a dentil band that carry the last candelabra
  for (const sg of [-1, 1]) {
    const v0 = sg * (HV - 0.02), v1 = sg * (HV + 1.0), q0 = Math.min(v0, v1), q1 = Math.max(v0, v1), top = yDeck(LEN) + PAVE;
    P.box(stone, LEN - 0.4, LEN + 2.6, yb, top, q0, q1, 'b', 2.2);
    P.box(M.coping, LEN - 0.55, LEN + 2.75, top - 0.5, top - 0.26, q0, q1 + (sg > 0 ? 0.15 : 0), 'b', 1.4);
    for (let k = 0; k < 9; k++) P.box(M.voussoir, LEN - 0.3 + k * 0.33, LEN - 0.12 + k * 0.33, top - 0.82, top - 0.52, Math.min(v1, v1 + sg * 0.06), Math.max(v1, v1 + sg * 0.06), '', 1);   // dentils
  }

  // ------------------------------------------------------------------ deck: asphalt roadway, barrier kerbs, granite pavements, the median, lane marks, tram rails
  const U0 = -1.6, U1 = LEN + 0.8, nD = Math.ceil((U1 - U0) / 3.2);
  for (let i = 0; i < nD; i++) {
    const u0 = U0 + (U1 - U0) * i / nD, u1 = U0 + (U1 - U0) * (i + 1) / nD, y0 = yDeck(u0), y1 = yDeck(u1), um = (u0 + u1) / 2;
    P.quad(M.asphalt, [u0, y0, -ROAD], [u1, y1, -ROAD], [u1, y1, ROAD], [u0, y0, ROAD], [0, 1, 0], [[u0 / 4, -ROAD / 4], [u1 / 4, -ROAD / 4], [u1 / 4, ROAD / 4], [u0 / 4, ROAD / 4]]);
    const steelKerb = um > STEEL0 && um < 58.2, km = steelKerb ? M.steelTroitsky : M.kerb, kh = um < 2 || um > LEN - 2 ? PAVE : 0.5;
    for (const sg of [-1, 1]) {
      const va = sg * ROAD, vk = sg * (ROAD + KERB), vb = sg * (HW + 0.1);
      P.quad(M.pave, [u0, y0 + PAVE, vk], [u1, y1 + PAVE, vk], [u1, y1 + PAVE, vb], [u0, y0 + PAVE, vb], [0, 1, 0], [[u0 / 2.4, vk / 2.4], [u1 / 2.4, vk / 2.4], [u1 / 2.4, vb / 2.4], [u0 / 2.4, vb / 2.4]]);
      P.quad(km, [u0, y0, va], [u1, y1, va], [u1, y1 + kh, va], [u0, y0 + kh, va], [0, 0, -sg], [[u0, 0], [u1, 0], [u1, kh], [u0, kh]]);
      P.quad(km, [u0, y0 + kh, va], [u1, y1 + kh, va], [u1, y1 + kh, vk], [u0, y0 + kh, vk], [0, 1, 0], [[u0, 0], [u1, 0], [u1, KERB], [u0, KERB]]);
      if (kh > PAVE) P.quad(km, [u0, y0 + PAVE, vk], [u1, y1 + PAVE, vk], [u1, y1 + kh, vk], [u0, y0 + kh, vk], [0, 0, sg], [[u0, 0], [u1, 0], [u1, kh], [u0, kh]]);
    }
    if (um > 8 && um < LEN - 8) {                                    // the narrow raised median that carries the contact-wire poles
      for (const sg of [-1, 1]) P.quad(M.kerb, [u0, y0, sg * 0.32], [u1, y1, sg * 0.32], [u1, y1 + 0.14, sg * 0.32], [u0, y0 + 0.14, sg * 0.32], [0, 0, sg]);
      P.quad(M.kerb, [u0, y0 + 0.14, -0.32], [u1, y1 + 0.14, -0.32], [u1, y1 + 0.14, 0.32], [u0, y0 + 0.14, 0.32], [0, 1, 0]);
    }
    const mk = (vc, hw, mat = M.mark) => P.quad(mat, [u0, y0 + 0.03, vc - hw], [u1, y1 + 0.03, vc - hw], [u1, y1 + 0.03, vc + hw], [u0, y0 + 0.03, vc + hw], [0, 1, 0]);
    if (um > 6 && um < LEN - 6) {
      for (const vc of [-5.8, 5.8]) if (i % 3 !== 2) mk(vc, 0.06);                      // dashed line between the two lanes of each carriageway
      for (const vc of [-3.05, 3.05]) mk(vc, 0.06);                                     // solid line beside the tram zone
    }
    const ra = Math.max(u0, 0), rb = Math.min(u1, LEN);              // the rails stop at the bank lines (the street rails run on from there)
    if (rb > ra + 0.05) for (let k = 0; k < 2; k++) { const vc0 = trackV(k, ra), vc1 = trackV(k, rb), ya = yDeck(ra), yc = yDeck(rb); for (const dv of [-0.76, 0.76]) P.quad(M.tramRail, [ra, ya + 0.035, vc0 + dv - 0.035], [rb, yc + 0.035, vc1 + dv - 0.035], [rb, yc + 0.035, vc1 + dv + 0.035], [ra, ya + 0.035, vc0 + dv + 0.035], [0, 1, 0]); }
  }
  // ------------------------------------------------------------------ railings: `whip` panels between square posts with pyramid caps on the steel part; solid granite parapets on the south span and the viaduct
  const gaps = CANDELABRA.filter((c) => c[0] > STEEL0 && c[0] < STEEL1).map((c) => (c[1] === 'steel' ? [c[0] - 1.42, c[0] + 1.42] : [c[0] - 1.06, c[0] + 1.06]));
  const inGap = (ua, ub) => gaps.some((g) => ub > g[0] + 0.02 && ua < g[1] - 0.02);
  const nb = Math.round((STEEL1 - STEEL0) / 2.5), bw = (STEEL1 - STEEL0) / nb, postMat = M.railSage;
  for (const sg of [-1, 1]) {
    const v = sg * (HW - 0.14);
    for (let i = 0; i < nb; i++) {
      const ua = STEEL0 + bw * i, ub = ua + bw; if (inGap(ua, ub)) continue;
      const w = world(ua + 0.04, v);
      rails.add({ kind: 'whip', hex: railHex, x: w.x, y: yDeck(ua) + PAVE, z: w.z, rotY: -T, roll: Math.atan(slopeOf(ua + bw / 2)), len: bw - 0.08 }); B.info.rails++;
      P.quad(postMat, [ua, yDeck(ua) + PAVE + 1.2, v - 0.06], [ub, yDeck(ub) + PAVE + 1.2, v - 0.06], [ub, yDeck(ub) + PAVE + 1.2, v + 0.06], [ua, yDeck(ua) + PAVE + 1.2, v + 0.06], [0, 1, 0]);
    }
    for (let i = 0; i <= nb; i++) {
      const u = STEEL0 + bw * i, y = yDeck(u) + PAVE; if (gaps.some((g) => u > g[0] + 0.3 && u < g[1] - 0.3)) continue;
      P.box(postMat, u - 0.11, u + 0.11, y, y + 1.25, v - 0.11, v + 0.11, 'b', 1);
      P.push(u, y + 1.25, v, Math.PI / 4); P.cyl(postMat, [0, 0, 0], [0, 0.07, 0], 0.2, 0.2, 4, true); P.cyl(postMat, [0, 0.07, 0], [0, 0.24, 0], 0.17, 0.01, 4, false); P.pop();
    }
    for (const [pa, pb] of [[U0, STEEL0], [STEEL1, LEN + 2.6]]) {     // granite parapets: 1.1 m above the pavement, 0.4 m thick, blocks ~2.4 m
      const n = Math.ceil((pb - pa) / 2.4);
      for (let i = 0; i < n; i++) {
        const u0 = pa + (pb - pa) * i / n, u1 = pa + (pb - pa) * (i + 1) / n, y0 = yDeck(u0) + PAVE, y1 = yDeck(u1) + PAVE, h = 1.1, va = v - 0.2, vb2 = v + 0.2;
        for (const [vv, nz] of [[va, -1], [vb2, 1]]) P.quad(M.parapetPeach, [u0, y0 - 0.05, vv], [u1, y1 - 0.05, vv], [u1, y1 + h, vv], [u0, y0 + h, vv], [0, 0, nz], [[0, 0], [0.5, 0], [0.5, 1], [0, 1]]);
        P.quad(M.coping, [u0, y0 + h, va - 0.03], [u1, y1 + h, va - 0.03], [u1, y1 + h, vb2 + 0.03], [u0, y0 + h, vb2 + 0.03], [0, 1, 0]);
      }
      for (const [uu, nx] of [[pa, -1], [pb, 1]]) P.quad(M.parapetPeach, [uu, yDeck(uu) + PAVE, v - 0.2], [uu, yDeck(uu) + PAVE, v + 0.2], [uu, yDeck(uu) + PAVE + 1.1, v + 0.2], [uu, yDeck(uu) + PAVE + 1.1, v - 0.2], [nx, 0, 0], [[0, 0], [0.1, 0], [0.1, 1], [0, 1]]);
    }
  }
  // ------------------------------------------------------------------ furniture: candelabra pairs over the piers, one-globe lamps at the kerb, contact-wire poles on the median, obelisks
  B.masts = [];
  for (const sg of [-1, 1]) for (const [u, kind] of CANDELABRA) {
    const v = sg * candV(u), y = yDeck(u) + PAVE - 0.02;
    const h = pedestalT(P, M, u, y, v, 0, kind);
    candelabraT(P, M, u, y + h, v, 0);
    B.masts.push({ ...world(u, v), y: y + h, h: 4.6, kind: 'candelabra' });
  }
  for (const sg of [-1, 1]) for (const u of [13.3, 64.25]) P.box(M.pierPink, u - 1.05, u + 1.05, waterY + 1.5, yDeck(u) + PAVE - 0.02, Math.min(sg * (HV - 0.02), sg * (HV + 0.82)), Math.max(sg * (HV - 0.02), sg * (HV + 0.82)), 'bt', 2.2);   // corbel blocks under the granite pedestals of piers 1, 2
  for (const sg of [-1, 1]) for (const u of LAMPS) { const v = sg * (ROAD + KERB + 0.28); lampT(P, M, u, yDeck(u) + PAVE, v, 0); B.masts.push({ ...world(u, v), y: yDeck(u) + PAVE, h: 5.3, kind: 'lamp' }); }
  for (const u of POLES) { contactPoleT(P, M, u, yDeck(u) + 0.14, 0, Math.PI / 2, 3.4); B.masts.push({ ...world(u, 0), y: yDeck(u), h: 10.2, kind: 'contact' }); }
  // south entrance: two obelisks with rostra, standing on the embankment beside the roadway
  for (const sg of [-1, 1]) obeliskTroitsky(P, M, -9, 0.05, sg * 13.2, Math.PI / 2);
  // the south landing: wing walls with a parapet from the deck edge along the bank line to the quay of the environment (its zone is wider than the deck)
  for (const sg of [-1, 1]) closeBank({ site: TROITSKY, P, M, L: ctx.L, u: 0, dir: 1, sg, v0: HV, len: 3.0, yTop: 0.05, mat: M.pierPink, parapet: M.parapetPeach, collide: false });
  P.pop();

  // ------------------------------------------------------------------ colliders
  B.colliders = () => {
    const ph = ctx.physics, rampRot = Math.atan2(f.c, f.s), m = Math.ceil((U1 - U0) / 6);
    for (let i = 0; i < m; i++) { const u0 = U0 + (U1 - U0) * i / m, u1 = U0 + (U1 - U0) * (i + 1) / m, w = world((u0 + u1) / 2, 0); ph.addWalkRamp(w.x, w.z, 2 * HW + 0.2, u1 - u0 + 0.04, rampRot, yDeck(u0), yDeck(u1), 2.5); B.info.colliders++; }
    const R0 = U0, R1 = LEN + 3.6, nR = Math.ceil((R1 - R0) / 8);
    for (const sg of [-1, 1]) for (let i = 0; i < nR; i++) { const u0 = R0 + (R1 - R0) * i / nR, u1 = R0 + (R1 - R0) * (i + 1) / nR, w = world((u0 + u1) / 2, sg * (HW - 0.14)); ph.addBox(w.x, w.z, u1 - u0, 0.4, -T, -8, Math.max(yDeck(u0), yDeck(u1)) + PAVE + 1.25); B.info.colliders++; }
    // the barrier kerbs keep the cars on the roadway and the walkers on the pavements (open for 3 m at both ends)
    const K0 = 3, K1 = LEN - 3, nK = Math.ceil((K1 - K0) / 8);
    for (const sg of [-1, 1]) for (let i = 0; i < nK; i++) { const u0 = K0 + (K1 - K0) * i / nK, u1 = K0 + (K1 - K0) * (i + 1) / nK, w = world((u0 + u1) / 2, sg * (ROAD + KERB / 2)); ph.addBox(w.x, w.z, u1 - u0, KERB, -T, Math.min(yDeck(u0), yDeck(u1)) - 1, Math.max(yDeck(u0), yDeck(u1)) + 0.55); B.info.colliders++; }
    for (const sg of [-1, 1]) for (const [u, kind] of CANDELABRA) { const steel = kind === 'steel', v = sg * candV(u), w = world(u, v); ph.addBox(w.x, w.z, steel ? 2.84 : 2.1, steel ? 1.44 : 2.1, -T, -8, yDeck(u) + 4); B.info.colliders++; }
    for (const u of POLES) { const w = world(u, 0); ph.addCylinder(w.x, w.z, 0.26, yDeck(u) - 1, yDeck(u) + 9); B.info.colliders++; }
    for (const sg of [-1, 1]) for (const u of LAMPS) { const w = world(u, sg * (ROAD + KERB + 0.28)); ph.addCylinder(w.x, w.z, 0.16, yDeck(u) - 1, yDeck(u) + 5); B.info.colliders++; }
    for (const sg of [-1, 1]) { const wo = world(-9, sg * 13.2); ph.addBox(wo.x, wo.z, 2.0, 2.0, -T, -1, 8); B.info.colliders++; }
    for (const sg of [-1, 1]) B.info.colliders += closeBank({ site: TROITSKY, L: ctx.L, ph, u: 0, dir: 1, sg, v0: HW - 0.3, len: 3.0, yTop: 0.05, draw: false });
  };
  return B;
}
