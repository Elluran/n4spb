// props/furniture.js - geometry factories of the street furniture of central Saint Petersburg (all local: origin on the ground, front = +Z, x along the length). Each returns a
// Geo (vertex-coloured) that props.js instances. Sources: docs/research/streets.md section 5 + 8 (black cast iron, orange-brown slat benches with cast ends: photo P74 /
// refs/streets 74; cast-concrete cube urn with a dark-green rim: P43; dark-grey steel bin: P16; big tubs with small trees on Nevsky 2025-26; rental scooters with yellow stems:
// P85-P87; dark-green press kiosk with a gable roof: P17, P59; blue Russian post boxes), nevsky.md section 7 (summer verandas: low railings, flower boxes, burgundy / cream umbrellas),
// west-life-furniture.md section 4.3-4.4 (white slatted garden benches with cast S-scroll ends: P19-P24 / P41 / P107; K1-K9 kiosks, carts and cabins of the west) and the Yakutsk
// props/furniture.js (the Geo kit, bike racks, scooter, A-frame). Colours are the Petersburg palette: black iron #1c1e1d.
// TRIANGLE DIET (wave 3): every factory leaves out the faces nobody sees (box bottoms, the end faces of slats hidden by the cast ends), thin tubes are open, round parts use 5-8 sides,
// flowers / foliage tufts are octahedra (8 triangles) instead of spheres (24-48): bench 96 (was 144), cast bin 60 (160), steel bin 56 (116), cube urn 22 (48), flower urn ~210 (480),
// tub with a tree ~200 (500-700), pot ~80 (150), bike loops 24 (48). The cafe terraces (stands.js) draw their railings as alpha-tested picket strips (2 triangles per run).
import { Geo, DEG, TAU, BOT, TOP, PX, NX, PZ, NZ } from './kit.js';

export const COL = {
  black: '#1c1e1d', iron: '#2c2f33', ironL: '#454b52', galv: '#9aa3a8', galvD: '#7b858b', granite: '#8d8f90', graniteL: '#a8a8a2', concrete: '#a7a59f', concreteD: '#8d8b86', concreteL: '#c0beb6',
  wood: '#b8793a', woodL: '#c99356', woodD: '#7a4a2a', woodBrown: '#6a3a28', paintWhite: '#e9e5d8',
  binGrey: '#4d535a', binGreen: '#2f4f43',
  white: '#f1ece0', cream: '#e8dcc4', red: '#c8453c', burgundy: '#8c1d2e', navy: '#1f3d6b', green: '#2f5f45', blue: '#2f64b5', yellow: '#f0c230', mail: '#2f5fa8',
  flower: ['#d9387a', '#f3f1ec', '#c63d8e', '#e8575a', '#7c4fa0', '#e8b02a'], leaf: '#4f6e34', leafL: '#6f8a44', leafD: '#3f5a2c', soil: '#4a3a2e',
};

/** n flower blobs (octahedra) scattered on a disc of radius R at height y */
const flowerMass = (g, rnd, n, R, y, spread = 1, cols = COL.flower, size = 0.11) => {
  for (let i = 0; i < n; i++) {
    const a = rnd() * TAU, d = Math.sqrt(rnd()) * R * spread;
    g.octa(size * (0.8 + rnd() * 0.5), size * 0.75, size * (0.8 + rnd() * 0.5), [Math.cos(a) * d, y + rnd() * 0.08, Math.sin(a) * d], cols[Math.floor(rnd() * cols.length)]);
  }
};

/** the Saint Petersburg park / street bench: black cast-iron ends with an arm, timber slats (3 seat + 3 back), len along X; 96 triangles. wood = slat colour (orange-brown street bench, white-painted garden bench) */
export function benchPark(len = 1.8, wood = COL.wood) {
  const g = new Geo(), hl = len / 2 - 0.12, SL = PX | NX | BOT;
  for (const s of [-1, 1]) {
    const x = s * hl;
    g.boxB(0.07, 0.44, 0.5, [x, 0, 0.0], COL.black, null, BOT);                                      // seat support (cast end)
    g.box(0.07, 0.5, 0.06, [x, 0.66, -0.23], COL.black, [-10 * DEG, 0, 0], BOT);                     // back leg
    g.box(0.075, 0.05, 0.4, [x, 0.7, -0.03], COL.black, null, BOT);                                  // arm rest
  }
  for (let k = 0; k < 3; k++) g.box(len - 0.2, 0.04, 0.13, [0, 0.46, 0.15 - k * 0.15], wood, null, SL);
  for (let k = 0; k < 3; k++) g.box(len - 0.2, 0.1, 0.03, [0, 0.6 + k * 0.12, -0.225 - k * 0.012], wood, [-10 * DEG, 0, 0], SL);
  return g;
}
/** backless granite-and-timber bench for squares and the embankment: two granite blocks with timber slats, len along X; 58 triangles */
export function benchGranite(len = 2.0) {
  const g = new Geo(), hl = len / 2 - 0.2;
  for (const s of [-1, 1]) { g.boxB(0.34, 0.42, 0.5, [s * hl, 0, 0], COL.granite, null, BOT); g.boxB(0.4, 0.05, 0.56, [s * hl, 0.42, 0], COL.graniteL, null, BOT); }
  for (let k = 0; k < 3; k++) g.box(len - 0.34, 0.05, 0.13, [0, 0.495, 0.15 - k * 0.15], COL.wood, null, PX | NX | BOT);
  return g;
}
/** black cast-iron litter urn (the classic Petersburg урна): a vase with a flared lip on a round foot; 0.78 m, hexagonal, 60 triangles */
export function binCast() {
  const g = new Geo();
  g.lathe([[0.0, 0.0], [0.2, 0.0], [0.11, 0.12], [0.27, 0.5], [0.29, 0.76], [0.0, 0.74]], [0, 0, 0], COL.black, 6);
  return g;
}
/** cast-concrete cube urn 0.4 x 0.4 x 0.6, pale grey with a dark-green painted rim (P43); 22 triangles */
export function binCube() {
  const g = new Geo();
  g.boxB(0.42, 0.6, 0.42, [0, 0.04, 0], COL.concreteL, null, BOT); g.boxB(0.46, 0.06, 0.46, [0, 0.64, 0], COL.binGreen, null, BOT);
  g.boxB(0.3, 0.1, 0.02, [0, 0.46, 0.215], '#2a2d30', null, PX | NX | TOP | BOT | NZ);
  return g;
}
/** dark-grey steel bucket bin on a post (P16): 0.35 m dia, 0.9 m; 56 triangles */
export function binSteel() {
  const g = new Geo();
  g.lathe([[0.0, 0.34], [0.16, 0.34], [0.18, 0.86], [0.19, 0.88], [0.0, 0.88]], [0, 0, 0], COL.binGrey, 6);
  g.tube([0, 0, 0], [0, 0.36, 0], 0.03, COL.black, 4);
  return g;
}
/** black cast-iron flower urn on a pedestal: 0.95 m, 0.7 m dia, with a mass of petunias (rnd = seeded); ~210 triangles */
export function urnCast(rnd = () => 0.5, big = false) {
  const g = new Geo(), s = big ? 1.2 : 1;
  g.lathe([[0, 0], [0.26 * s, 0], [0.2 * s, 0.1 * s], [0.12 * s, 0.4 * s], [0.2 * s, 0.56 * s], [0.34 * s, 0.68 * s], [0.38 * s, 0.86 * s], [0.0, 0.84 * s]], [0, 0, 0], COL.black, 8);
  g.octa(0.33 * s, 0.1 * s, 0.33 * s, [0, 0.9 * s, 0], COL.leaf);
  flowerMass(g, rnd, big ? 9 : 7, 0.3 * s, 0.95 * s);
  return g;
}
/** big round tub with a small tree (the 68 tubs of Nevsky, 2025-26: lilac, willow, apple, birch, maple): 0.95 m dia x 0.7 m + a 2.4 m tree; kind 0 birch, 1 round crown, 2 lilac bush; ~200 triangles */
export function tubTree(kind = 0, rnd = () => 0.5) {
  const g = new Geo();
  g.lathe([[0, 0], [0.4, 0], [0.5, 0.62], [0.53, 0.72], [0.45, 0.72], [0.0, 0.7]], [0, 0, 0], '#3b3f43', 8);
  g.octa(0.4, 0.05, 0.4, [0, 0.72, 0], COL.soil);
  if (kind === 0) {                                                                                  // birch: white trunk, loose crown
    g.tube([0, 0.66, 0], [0.06, 2.0, 0.02], 0.045, '#e6e2d6', 4, 0.03);
    for (let i = 0; i < 3; i++) g.sphere(0.42 + rnd() * 0.1, 0.36, 0.42 + rnd() * 0.1, [0.05 + (rnd() - 0.5) * 0.4, 2.1 + rnd() * 0.5, (rnd() - 0.5) * 0.4], i % 2 ? '#7fa05a' : '#6f9050', 6);
  } else if (kind === 1) {                                                                           // maple / apple: round dense crown
    g.tube([0, 0.66, 0], [0, 1.65, 0], 0.05, '#5a4636', 4, 0.035);
    g.sphere(0.72, 0.62, 0.72, [0, 2.15, 0], '#5d8a3a', 6); g.sphere(0.5, 0.42, 0.5, [0.25, 2.55, 0.1], '#6f9a46', 6);
  } else {                                                                                           // lilac bush: dark leaves + lilac heads
    g.sphere(0.62, 0.5, 0.62, [0, 1.1, 0], '#4a6f34', 6); g.sphere(0.45, 0.4, 0.45, [0.1, 1.55, 0.05], '#5a7f3c', 6);
    for (let i = 0; i < 6; i++) { const a = rnd() * TAU, d = 0.25 + rnd() * 0.35; g.octa(0.11, 0.17, 0.11, [Math.cos(a) * d, 1.15 + rnd() * 0.55, Math.sin(a) * d], rnd() < 0.5 ? '#a98bd0' : '#d6c0e6'); }
  }
  return g;
}
/** terracotta flower pot with geraniums, 0.4 m: for shop doors; ~80 triangles */
export function flowerPot(rnd = () => 0.5) {
  const g = new Geo();
  g.lathe([[0, 0], [0.13, 0], [0.2, 0.4], [0.17, 0.4], [0, 0.36]], [0, 0, 0], '#b5603c', 5);
  g.octa(0.2, 0.12, 0.2, [0, 0.46, 0], COL.leaf);
  for (let i = 0; i < 3; i++) g.octa(0.07, 0.06, 0.07, [(rnd() - 0.5) * 0.24, 0.55 + rnd() * 0.04, (rnd() - 0.5) * 0.24], i === 0 ? '#d21f26' : i === 1 ? '#e8575a' : '#f3f1ec');
  return g;
}
/** low round concrete planter 1.2 m dia x 0.5 m (the OSM `planter` nodes of the Nevsky edge / Kazan garden / Isaac's: P35 "1.1-1.3 m dark-grey round planters"), a heap of petunias / geraniums; ~150 triangles */
export function roundPlanter(rnd = () => 0.5) {
  const g = new Geo();
  g.lathe([[0, 0], [0.6, 0], [0.62, 0.5], [0.53, 0.5], [0.52, 0.44], [0.0, 0.42]], [0, 0, 0], '#6d6a66', 8);
  g.octa(0.5, 0.14, 0.5, [0, 0.5, 0], COL.leaf);
  flowerMass(g, rnd, 8, 0.45, 0.58, 1, COL.flower, 0.13);
  return g;
}
/** wall-hung basket of petunias on a black bracket (flower baskets at the shop doors of Nevsky, P36): the wall plane is z = 0, the basket sticks out to +Z; ~50 triangles */
export function wallBasket(rnd = () => 0.5) {
  const g = new Geo();
  g.box(0.04, 0.04, 0.42, [0, 0, 0.21], COL.black, null, BOT | NZ);
  g.octa(0.2, 0.15, 0.2, [0, -0.1, 0.36], '#3f5a2c');
  flowerMass(g, rnd, 5, 0.17, -0.02, 1, ['#d9387a', '#f3f1ec', '#c63d8e', '#7c4fa0'], 0.09);
  return g;
}
/** the blue Russian post box on short legs: 0.42 x 0.36 x 1.15, arched top, a mail slot */
export function postBox() {
  const g = new Geo();
  g.boxB(0.4, 0.78, 0.34, [0, 0.3, 0], COL.mail, null, BOT); g.cyl(0.17, 0.17, 0.4, [0, 1.08, 0], COL.mail, 8, [0, 0, Math.PI / 2]);
  for (const x of [-0.16, 0.16]) g.boxB(0.06, 0.3, 0.06, [x, 0, 0], COL.iron, null, BOT | TOP);
  g.box(0.24, 0.04, 0.02, [0, 0.9, 0.18], '#10213f', null, PX | NX | TOP | BOT | NZ); g.box(0.22, 0.12, 0.02, [0, 0.62, 0.18], '#e8ecef', null, PX | NX | TOP | BOT | NZ);
  return g;
}
/** row of n inverted-U bicycle loops along X (24 triangles per loop) */
export function bikeRack(n = 5, gap = 0.6) {
  const g = new Geo(), w = (n - 1) * gap;
  g.boxB(w + 0.3, 0.03, 0.06, [0, 0, 0], COL.galvD, null, BOT);
  for (let i = 0; i < n; i++) { const x = -w / 2 + i * gap; g.tube([x, 0.02, -0.09], [x, 0.72, -0.09], 0.022, COL.galv, 4); g.tube([x, 0.02, 0.09], [x, 0.72, 0.09], 0.022, COL.galv, 4); g.tube([x, 0.72, -0.09], [x, 0.72, 0.09], 0.022, COL.galv, 4); }
  return g;
}
/** one city-share bicycle parked sideways (length along X): 1.7 m, two wheels, a frame, a basket */
export function bicycle(col = '#3f8f5b') {
  const g = new Geo();
  for (const x of [-0.6, 0.6]) g.torus(0.34, 0.025, [x, 0.36, 0], '#1f2226', [0, 0, 0], 4, 12);
  g.tube([-0.6, 0.36, 0], [0.0, 0.42, 0], 0.02, col, 5); g.tube([0.0, 0.42, 0], [0.5, 0.82, 0], 0.02, col, 5); g.tube([0.5, 0.82, 0], [0.6, 0.36, 0], 0.02, col, 5); g.tube([-0.6, 0.36, 0], [-0.1, 0.8, 0], 0.02, col, 5);
  g.box(0.22, 0.04, 0.12, [-0.14, 0.84, 0], '#1d1f24'); g.box(0.06, 0.04, 0.5, [0.5, 0.88, 0], '#1d1f24'); g.box(0.28, 0.2, 0.3, [0.68, 0.62, 0], '#cdd1d4');
  return g;
}
/** electric kick-scooter (rental fleet: yellow stem, black deck, no brand) - 0.5 x 1.1 m, parked upright on its stand; ~100 triangles */
export function scooter() {
  const g = new Geo();
  g.box(0.2, 0.05, 0.62, [0, 0.14, 0], '#1d1f24', null, BOT); g.box(0.14, 0.08, 0.22, [0, 0.12, -0.34], '#2a2d33', null, BOT);
  g.cyl(0.11, 0.11, 0.05, [0, 0.11, -0.46], '#222428', 7, [0, 0, Math.PI / 2]); g.cyl(0.11, 0.11, 0.05, [0, 0.11, 0.42], '#222428', 7, [0, 0, Math.PI / 2]);
  g.tube([0, 0.15, 0.38], [0, 1.04, 0.3], 0.022, '#f2c300', 4); g.box(0.44, 0.03, 0.04, [0, 1.05, 0.3], '#1d1f24');
  return g;
}
/** A-frame chalk board (café pavement sign, 0.6 x 1.0): returns the frame; the board face is a textured panel placed by the caller; ~90 triangles */
export function aFrame(frame = COL.burgundy) {
  const g = new Geo();
  for (const s of [-1, 1]) { g.tube([s * 0.3, 0, 0.36], [s * 0.26, 0.98, 0.04], 0.018, frame, 4); g.tube([s * 0.3, 0, -0.36], [s * 0.26, 0.98, -0.04], 0.018, frame, 4); }
  g.box(0.6, 0.02, 0.04, [0, 0.99, 0], frame, null, BOT); g.boxB(0.52, 0.02, 0.5, [0, 0.0, 0], frame, null, BOT);
  g.box(0.56, 0.86, 0.025, [0, 0.55, 0.2], '#1f2a24', [-24 * DEG, 0, 0], PX | NX | TOP | BOT | NZ); g.box(0.56, 0.86, 0.025, [0, 0.55, -0.2], '#1f2a24', [24 * DEG, 0, 0], PX | NX | TOP | BOT | PZ);
  return g;
}
/** cable cabinet on a plinth (0.62 x 0.36 x 1.25) */
export function cableCabinet(col = '#8f969c') {
  const g = new Geo();
  g.boxB(0.66, 0.18, 0.4, [0, 0, 0], COL.concreteD, null, BOT); g.boxB(0.6, 1.1, 0.34, [0, 0.18, 0], col, null, BOT); g.boxB(0.64, 0.05, 0.38, [0, 1.28, 0], '#6d747a', null, BOT);
  g.box(0.02, 1.0, 0.01, [0, 0.7, 0.18], '#6d747a', null, PX | NX | TOP | BOT | NZ); g.box(0.1, 0.16, 0.02, [0.18, 1.0, 0.18], '#c8c62a', null, PX | NX | TOP | BOT | NZ);
  return g;
}

// ---------------------------------------------------------------------------------------------------------------- kiosks and stalls
/** the dark-green press / ticket kiosk (газетный киоск): W wide (x) x D deep x H to the eaves, a gable roof, pediment on the front, glass window (panels by the caller). Defaults 2.4 x 1.6 x 2.05
 *  (the east); the K1 pavilion of the west dossier is 1.7 x 1.7 x 3.2 incl. the roof: pressKiosk(body, 1.7, 1.7, 2.4, 0.8) */
export function pressKiosk(body = '#2f4f43', W = 2.4, D = 1.6, H = 2.05, rh = 0.62) {
  const g = new Geo(), trim = '#d9d3c0', roof = '#26403a';
  g.boxB(W + 0.12, 0.1, D + 0.12, [0, 0, 0], '#8d8f90', null, BOT); g.boxB(W, H - 0.1, D, [0, 0.1, 0], body, null, BOT | TOP); g.boxB(W + 0.04, 0.12, D + 0.04, [0, 0.1, 0], '#24403a', null, BOT);
  g.boxB(W - 0.5, 1.15, 0.04, [0, 0.82, D / 2 + 0.005], '#1d2a2e', null, PX | NX | TOP | BOT | NZ);                                           // glass front (dark; a lit poster panel is added in front by the caller)
  g.boxB(W - 0.4, 0.05, 0.3, [0, 0.8, D / 2 + 0.12], trim, null, BOT);                                                                       // counter shelf
  for (const x of [-(W / 2 - 0.22), W / 2 - 0.22]) g.boxB(0.06, 1.2, 0.07, [x, 0.8, D / 2 + 0.02], trim, null, BOT | TOP);                    // window jambs
  g.boxB(W + 0.3, 0.1, D + 0.3, [0, H - 0.03, 0], roof, null, TOP);                                                                           // eaves slab
  const hz = (D + 0.3) / 2, hx = (W + 0.3) / 2;                                                                                               // gable roof: two sloped planes ridge along X, plus the front / back pediments
  g.quad([-hx, H + 0.02, hz], [hx, H + 0.02, hz], [hx, H + rh, 0], [-hx, H + rh, 0], roof); g.quad([-hx, H + 0.02, -hz], [-hx, H + rh, 0], [hx, H + rh, 0], [hx, H + 0.02, -hz], roof);
  g.quad([-hx, H, hz], [-hx, H + rh, 0], [-hx, H, -hz], [-hx, H, -hz], roof); g.quad([hx, H, -hz], [hx, H + rh, 0], [hx, H, hz], [hx, H, hz], roof);
  g.quad([-W / 2, H, D / 2 + 0.02], [W / 2, H, D / 2 + 0.02], [0, H + rh * 0.8, D / 2 + 0.02], [0, H + rh * 0.8, D / 2 + 0.02], trim);
  g.boxB(0.5, 0.18, 0.1, [0, H + rh - 0.05, 0], roof, null, BOT);
  return g;
}
/** glazed "excursion" kiosk (K2): 2.2 x 2.2 m, grey base, glass band with mullions, a grey hip roof, boards under the eaves (fascia panels by the caller); ~100 triangles */
export function excursionKiosk(sz = 2.2) {
  const g = new Geo(), h = sz / 2, base = '#8d939a', gl = '#2a3a44', roof = '#7b838b';
  g.boxB(sz, 0.5, sz, [0, 0, 0], base, null, BOT); g.boxB(sz - 0.12, 1.55, sz - 0.12, [0, 0.5, 0], gl, null, BOT | TOP);
  for (const [x, z] of [[-h, -h], [h, -h], [-h, h], [h, h]]) g.boxB(0.08, 1.6, 0.08, [x * 0.97, 0.5, z * 0.97], base, null, BOT | TOP);
  g.boxB(sz + 0.3, 0.1, sz + 0.3, [0, 2.05, 0], roof, null, 0);
  const e = h + 0.15, top = 2.7; g.quad([-e, 2.15, e], [e, 2.15, e], [0, top, 0], [0, top, 0], roof); g.quad([e, 2.15, e], [e, 2.15, -e], [0, top, 0], [0, top, 0], roof); g.quad([e, 2.15, -e], [-e, 2.15, -e], [0, top, 0], [0, top, 0], roof); g.quad([-e, 2.15, -e], [-e, 2.15, e], [0, top, 0], [0, top, 0], roof);
  g.boxB(0.14, 0.14, 0.14, [0, top - 0.04, 0], base, null, BOT);
  return g;
}
/** ice-cream / souvenir / ticket cabin 2.2 x 1.7 x 2.4 (front +z): cabin, serving window, striped canopy on the front, fascia panel by the caller */
export function cabin(body = '#f1efe9', band = COL.blue, roof = COL.blue, canopyA = COL.blue, canopyB = '#eef0f2') {
  const g = new Geo();
  g.boxB(2.5, 0.1, 2.0, [0, 0, 0], '#8d8b87', null, BOT); g.boxB(2.2, 2.35, 1.6, [0, 0.1, -0.15], body, null, BOT | TOP); g.boxB(2.24, 0.3, 1.64, [0, 0.1, -0.15], band, null, BOT); g.boxB(2.5, 0.14, 1.9, [0, 2.45, -0.1], roof);
  g.boxB(1.5, 0.95, 0.03, [0.1, 1.05, 0.66], '#20252b', null, PX | NX | TOP | BOT | NZ);
  g.boxB(1.7, 0.06, 0.4, [0.1, 1.0, 0.85], '#c9c4b8', null, BOT); g.boxB(0.5, 0.65, 0.4, [-0.82, 0.1, 0.78], band, null, BOT);
  g.boxB(2.3, 0.62, 0.06, [0.05, 2.59, 0.5], band, null, BOT); g.boxB(0.06, 0.62, 0.5, [-1.1, 2.59, 0.25], band, null, BOT); g.boxB(0.06, 0.62, 0.5, [1.2, 2.59, 0.25], band, null, BOT);
  const len = 2.6, d = 0.95, y0 = 2.42, n = 7, w = len / n, yb = y0 - d * 0.34;                              // striped awning over the window
  for (let i = 0; i < n; i++) { const x = -len / 2 + i * w, col = i % 2 ? canopyB : canopyA; g.quad([x, y0, 0.66], [x, yb, 0.66 + d], [x + w, yb, 0.66 + d], [x + w, y0, 0.66], col); g.boxB(w, 0.14, 0.03, [x + w / 2, yb - 0.14, 0.66 + d], col, null, BOT | TOP); }
  return g;
}
/** tourist stall: a 4-post tent (white canopy, navy valance), a long table with postcards / magnets / matryoshka rows (3.0 x 1.8, front +z) */
export function touristStall(rnd = () => 0.5) {
  const g = new Geo();
  for (const [x, z] of [[-1.4, -0.8], [1.4, -0.8], [-1.4, 0.8], [1.4, 0.8]]) g.tube([x, 0, z], [x, 2.4, z], 0.035, '#c8ccd0', 5);
  const n = 6, w = 3.0 / n;
  for (let i = 0; i < n; i++) { const x = -1.5 + i * w, c = i % 2 ? '#f1efe9' : '#e2e6ea'; g.quad([x, 2.7, -0.85], [x, 2.45, 0.95], [x + w, 2.45, 0.95], [x + w, 2.7, -0.85], c); g.boxB(w, 0.18, 0.03, [x + w / 2, 2.27, 0.95], i % 2 ? COL.navy : '#f1efe9', null, BOT | TOP); }
  for (let i = 0; i < n; i++) { const x = -1.5 + i * w; g.quad([x, 2.68, -0.85], [x + w, 2.68, -0.85], [x + w, 2.43, 0.95], [x, 2.43, 0.95], '#8a8e92'); }
  g.boxB(2.8, 0.06, 0.8, [0, 0.82, 0.15], '#c9a46a', null, BOT); g.boxB(0.06, 0.82, 0.6, [-1.3, 0, 0.15], '#8a6a46', null, BOT | TOP); g.boxB(0.06, 0.82, 0.6, [1.3, 0, 0.15], '#8a6a46', null, BOT | TOP);
  g.boxB(2.7, 0.78, 0.5, [0, 0, -0.35], '#e8e4d8', null, BOT);
  for (let i = 0; i < 8; i++) { const x = -1.15 + i * 0.33; g.cylB(0.07, 0.09, 0.22 + (i % 3) * 0.04, [x, 0.88, 0.1 + (i % 2) * 0.2], i % 3 === 0 ? '#c8453c' : i % 3 === 1 ? '#2f64b5' : '#e8b02a', 5); g.octa(0.065, 0.06, 0.065, [x, 1.16 + (i % 3) * 0.04, 0.1 + (i % 2) * 0.2], '#f1d4a8'); }
  g.boxB(0.5, 1.4, 0.3, [1.15, 0, -0.5], '#6a4a3a', null, BOT); for (let i = 0; i < 4; i++) g.box(0.44, 0.18, 0.03, [1.15, 0.45 + i * 0.3, -0.33], rnd() < 0.5 ? '#2a7fc4' : '#f1efe9', null, PX | NX | TOP | BOT | NZ);   // postcard carousel
  return g;
}
/** ice-cream / blini cart on two wheels with a round umbrella (1.2 x 1.0): umbrella colour by the caller */
export function iceCart(umb = COL.burgundy) {
  const g = new Geo();
  g.boxB(1.2, 0.8, 0.8, [0, 0.25, 0], '#f1efe9', null, BOT); g.boxB(1.24, 0.08, 0.84, [0, 1.05, 0], '#d8dde1', null, BOT); g.boxB(1.24, 0.1, 0.84, [0, 0.2, 0], COL.blue, null, BOT);
  for (const z of [-0.45, 0.45]) g.cyl(0.25, 0.25, 0.08, [-0.2, 0.25, z], '#1c1e22', 8, [Math.PI / 2, 0, 0]);
  g.tube([0.6, 0.35, 0], [1.3, 0.28, 0], 0.025, '#4a4e54', 4);
  g.tube([0, 1.1, 0], [0, 2.95, 0], 0.02, '#e8e4d8', 4); g.lathe([[0, 3.0], [0.55, 2.84], [1.05, 2.6], [1.05, 2.56], [0, 2.7]], [0, 0, 0], umb, 8);
  return g;
}
/** K3: red-canopy glazed cart at the Kazan garden fence: a white cart 1.6 x 0.9 with a glass front, a red canopy 2.0 x 1.5 m on four poles; ~100 triangles. front +Z */
export function cartRedCanopy() {
  const g = new Geo(), red = '#b8262b';
  g.boxB(1.6, 0.85, 0.9, [0, 0.12, 0], '#e9e6de', null, BOT); g.boxB(1.5, 0.5, 0.04, [0, 1.0, 0.43], '#27363f', null, PX | NX | TOP | BOT | NZ); g.boxB(1.66, 0.06, 0.96, [0, 0.97, 0], '#c9c6bd', null, BOT);
  for (const x of [-0.7, 0.7]) g.cyl(0.12, 0.12, 0.06, [x, 0.14, 0.5], '#1c1e22', 7, [0, 0, Math.PI / 2]);
  for (const [x, z] of [[-0.95, -0.7], [0.95, -0.7], [-0.95, 0.7], [0.95, 0.7]]) g.tube([x, 0, z], [x, 2.25, z], 0.025, '#cfd2d4', 4);
  g.boxB(2.0, 0.05, 1.5, [0, 2.25, 0], red, null, BOT); g.boxB(2.0, 0.2, 0.04, [0, 2.07, 0.73], red, null, BOT | TOP);
  g.box(0.5, 0.35, 0.02, [0.3, 1.45, 0.45], '#f3eedf', null, PX | NX | TOP | BOT | NZ);
  return g;
}
/** K4: hot-dog cart with a 3 m umbrella: steel counter 1.4 x 0.7, a steamer, a bin, a pole and a maroon (or cream) umbrella; ~110 triangles */
export function cartHotdog(umb = '#7d1d2b') {
  const g = new Geo();
  g.boxB(1.4, 0.82, 0.7, [0, 0.14, 0], '#b9bfc4', null, BOT); g.boxB(1.46, 0.05, 0.76, [0, 0.96, 0], '#8f979d', null, BOT); g.boxB(0.5, 0.2, 0.4, [-0.35, 1.01, 0], '#a7aeb3', null, BOT);
  for (const x of [-0.55, 0.55]) g.cyl(0.14, 0.14, 0.05, [x, 0.16, 0.38], '#1c1e22', 7, [0, 0, Math.PI / 2]);
  g.cylB(0.2, 0.18, 0.5, [1.0, 0, 0.1], '#3a3f45', 6);
  for (let i = 0; i < 5; i++) g.cylB(0.03, 0.03, 0.2, [0.1 + i * 0.12, 1.01, 0.18], i % 2 ? '#c8453c' : '#e8b02a', 4);
  g.tube([0.45, 0.96, -0.1], [0.45, 2.55, -0.1], 0.025, '#e8e4d8', 4);
  g.lathe([[0, 2.85], [0.9, 2.6], [1.5, 2.32], [1.5, 2.27], [0, 2.5]], [0.45, 0, -0.1], umb, 8);
  return g;
}
/** K5: souvenir cart: a grey perforated-steel cart 1.5 x 0.8 on two wheels, a translucent canopy 1.6 x 1.0 m, a row of matryoshkas on the counter; ~170 triangles */
export function souvenirCart(rnd = () => 0.5) {
  const g = new Geo();
  g.boxB(1.5, 0.78, 0.8, [0, 0.14, 0], '#8a8f94', null, BOT); g.boxB(1.56, 0.05, 0.86, [0, 0.9, 0], '#6d7378', null, BOT);
  for (const x of [-0.6, 0.6]) g.cyl(0.14, 0.14, 0.05, [x, 0.16, 0.42], '#1c1e22', 7, [0, 0, Math.PI / 2]);
  for (const [x, z] of [[-0.8, -0.42], [0.8, -0.42], [-0.8, 0.42], [0.8, 0.42]]) g.tube([x, 0.9, z], [x, 2.15, z], 0.02, '#cfd2d4', 4);
  g.quad([-0.85, 2.2, -0.55], [-0.85, 2.0, 0.55], [0.85, 2.0, 0.55], [0.85, 2.2, -0.55], '#e8eceb');
  const cols = ['#c8302a', '#2b4f9a', '#e8b02a', '#1c1e1d'];
  for (let i = 0; i < 6; i++) { const x = -0.6 + i * 0.24, h = 0.2 + (i % 3) * 0.04; g.cylB(0.06, 0.08, h, [x, 0.95, 0.2], cols[i % 4], 5); g.octa(0.055, 0.055, 0.055, [x, 0.95 + h + 0.03, 0.2], '#f1d4a8'); }
  g.boxB(0.5, 0.32, 0.04, [0.3, 1.02, 0.34], '#e8e4d8', null, BOT);
  void rnd; return g;
}
/** K6: cafe kiosk with a cream parasol (Admiralteyskaya embankment, P59): glazed kiosk 3 x 2 m with a corrugated roof, a 4 m parasol, planters on a black rail; ~150 triangles. front +Z */
export function cafeKiosk() {
  const g = new Geo();
  g.boxB(3.0, 0.3, 2.0, [0, 0, 0], '#6d7378', null, BOT); g.boxB(2.9, 1.9, 1.9, [0, 0.3, 0], '#2a3a44', null, BOT | TOP);
  for (const x of [-1.45, -0.5, 0.5, 1.45]) g.boxB(0.08, 1.95, 0.08, [x, 0.3, 0.96], '#c9c4b8', null, BOT | TOP);
  g.boxB(3.2, 0.12, 2.2, [0, 2.2, 0], '#8c4a3a'); g.boxB(3.0, 0.1, 0.5, [0, 1.0, 1.15], '#c9c4b8', null, BOT);
  g.tube([1.9, 0, 1.6], [1.9, 3.1, 1.6], 0.035, '#e8e4d8', 5); g.lathe([[0, 3.5], [1.9, 3.1], [1.9, 3.04], [0, 3.3]], [1.9, 0, 1.6], '#efe8d4', 8);
  g.tube([-1.5, 0.0, 1.05], [-1.5, 0.9, 1.05], 0.02, COL.black, 4); g.tube([-0.2, 0.0, 1.55], [-0.2, 0.9, 1.55], 0.02, COL.black, 4);
  for (const [x, z] of [[-1.3, 1.5], [0.4, 1.7]]) { g.boxB(0.9, 0.25, 0.3, [x, 0.0, z], '#5a4636', null, BOT); for (let i = 0; i < 3; i++) g.octa(0.09, 0.08, 0.09, [x - 0.3 + i * 0.3, 0.33, z], i % 2 ? '#7c4fa0' : '#e8b02a'); }
  return g;
}
/** K7: ice-cream cart in red and white with a hood (Winter Palace corner of the Alexander Garden, P103): 1.2 x 0.8 m, a sloped hood over the counter; ~70 triangles. front +Z */
export function iceCartHood() {
  const g = new Geo();
  g.boxB(1.2, 0.82, 0.8, [0, 0.2, 0], '#e9e6de', null, BOT); g.boxB(1.24, 0.14, 0.84, [0, 0.55, 0], '#c8302a', null, BOT); g.boxB(1.24, 0.06, 0.84, [0, 1.02, 0], '#c9c6bd', null, BOT);
  for (const z of [-0.45, 0.45]) g.cyl(0.2, 0.2, 0.06, [-0.2, 0.22, z], '#1c1e22', 7, [Math.PI / 2, 0, 0]);
  g.tube([0.6, 0.35, 0], [1.3, 0.28, 0], 0.025, '#4a4e54', 4);
  g.quad([-0.65, 1.95, -0.4], [-0.65, 1.7, 0.5], [0.65, 1.7, 0.5], [0.65, 1.95, -0.4], '#c8302a'); g.quad([-0.65, 1.95, -0.4], [0.65, 1.95, -0.4], [0.65, 1.7, -0.4], [-0.65, 1.7, -0.4], '#c8302a');
  for (const x of [-0.62, 0.62]) g.tube([x, 1.02, 0.38], [x, 1.78, 0.45], 0.02, '#cfd2d4', 4);
  return g;
}
/** ticket booth at the piers (K8): a glass cabin 1.5 x 1.5 m with a pitched blue roof; ~60 triangles */
export function ticketBooth() {
  const g = new Geo(), bl = '#1f56a8';
  g.boxB(1.5, 0.4, 1.5, [0, 0, 0], '#e9e6de', null, BOT); g.boxB(1.42, 1.5, 1.42, [0, 0.4, 0], '#2a3a44', null, BOT | TOP);
  for (const [x, z] of [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]]) g.boxB(0.07, 1.55, 0.07, [x, 0.4, z], '#e9e6de', null, BOT | TOP);
  g.boxB(1.7, 0.08, 1.7, [0, 1.95, 0]); g.quad([-0.85, 2.03, 0.85], [0.85, 2.03, 0.85], [0.85, 2.35, 0], [-0.85, 2.35, 0], bl); g.quad([0.85, 2.03, -0.85], [-0.85, 2.03, -0.85], [-0.85, 2.35, 0], [0.85, 2.35, 0], bl);
  g.quad([-0.85, 2.03, -0.85], [-0.85, 2.03, 0.85], [-0.85, 2.35, 0], [-0.85, 2.35, 0], bl); g.quad([0.85, 2.03, 0.85], [0.85, 2.03, -0.85], [0.85, 2.35, 0], [0.85, 2.35, 0], bl);
  g.boxB(1.0, 0.05, 0.3, [0, 1.0, 0.8], '#c9c4b8', null, BOT);
  return g;
}
/** street-clock pole: black cast iron, 3.6 m, a round double-sided housing at the top (the dial panels + hands are added by the caller at y 3.3) */
export function clockPole() {
  const g = new Geo();
  g.lathe([[0, 0], [0.2, 0], [0.22, 0.08], [0.14, 0.3], [0.1, 0.6], [0.08, 1.6], [0.1, 2.5], [0.12, 2.7], [0, 2.7]], [0, 0, 0], COL.black, 8);
  g.cyl(0.46, 0.46, 0.2, [0, 3.3, 0], COL.black, 12, [Math.PI / 2, 0, 0]);
  g.cylB(0.12, 0.12, 0.45, [0, 2.7, 0], COL.black, 6); g.sphere(0.1, 0.1, 0.1, [0, 3.85, 0], COL.black, 6); g.cylB(0.03, 0.03, 0.12, [0, 3.78, 0], COL.black, 5);
  return g;
}
/** tourist wayfinding post: a black pole 3.2 m with a cap; the brown arrow plates are textured panels added by the caller */
export function wayPost() {
  const g = new Geo();
  g.cylB(0.06, 0.07, 3.3, [0, 0, 0], COL.black, 6); g.cylB(0.12, 0.12, 0.12, [0, 0, 0], COL.black, 6); g.sphere(0.07, 0.07, 0.07, [0, 3.35, 0], COL.black, 5);
  return g;
}
/** patio heater: a 2.2 m pole, a round base and a reflector cone; ~70 triangles */
export function heater() {
  const g = new Geo();
  g.cylB(0.28, 0.28, 0.04, [0, 0, 0], '#6d7278', 6); g.tube([0, 0.04, 0], [0, 2.14, 0], 0.035, '#8d9298', 4); g.cyl(0.4, 0.04, 0.2, [0, 2.2, 0], '#aeb4b9', 8, null, true); g.cylB(0.07, 0.07, 0.18, [0, 1.9, 0], '#6d7278', 5);
  return g;
}
/** light box (city-light): 1.2 x 1.8 m double-sided box on a dark plinth; faces are lit panels added by the caller (y 0.62..2.42 of the box) */
export function cityLightBox() {
  const g = new Geo();
  g.boxB(1.3, 0.55, 0.42, [0, 0, 0], '#2b2e33', null, BOT); g.boxB(1.34, 0.06, 0.46, [0, 0.55, 0], COL.burgundy, null, BOT);
  g.boxB(1.34, 0.08, 0.44, [0, 2.42, 0], '#2b2e33', null, BOT); g.boxB(0.06, 1.82, 0.4, [-0.64, 0.61, 0], '#2b2e33', null, BOT | TOP); g.boxB(0.06, 1.82, 0.4, [0.64, 0.61, 0], '#2b2e33', null, BOT | TOP);
  g.boxB(1.2, 1.8, 0.12, [0, 0.62, 0], '#d9dde0', null, BOT | TOP);
  return g;
}
/** the round advertising pillar (афишная тумба): dark base drum, a 1.9 m wrap zone (the poster cylinder is a separate textured mesh), a domed cap, a finial; ~190 triangles. Local origin at the axis */
export function pillarGeo() {
  const g = new Geo(), dome = '#1d1e22';
  g.cylB(0.62, 0.66, 0.5, [0, 0, 0], dome, 10); g.cylB(0.66, 0.66, 0.08, [0, 0.5, 0], '#2c2f33', 10); g.cylB(0.57, 0.57, 1.9, [0, 0.5, 0], '#26282c', 8);
  g.cylB(0.66, 0.66, 0.08, [0, 2.38, 0], '#2c2f33', 10); g.lathe([[0, 0], [0.66, 0], [0.62, 0.12], [0.4, 0.3], [0.0, 0.44]], [0, 2.46, 0], dome, 10);
  g.tube([0, 2.86, 0], [0, 3.06, 0], 0.04, dome, 4, 0.03); g.sphere(0.07, 0.07, 0.07, [0, 3.08, 0], dome, 5);
  return g;
}
/** a 2.0 m black sign pole (rental-scooter parking tab, small plates): the plate is a textured panel added by the caller */
/** coin-operated telescope viewer of the Neva quays (the Spit, the Aurora quay): a grey steel column 1.2 m on a round foot, a fork, a binocular head with two barrels (tilted a little down
 *  towards the water), a coin box and a step for children; front (the eyepieces) is -Z, the lenses look to +Z; ~350 triangles (a dozen in the whole map) */
export function telescopeViewer(body = '#7d868c') {
  const g = new Geo(), dk = '#3a4046';
  g.cylB(0.3, 0.34, 0.06, [0, 0, 0], dk, 10); g.cylB(0.085, 0.11, 1.18, [0, 0.06, 0], body, 8); g.cylB(0.13, 0.085, 0.07, [0, 1.24, 0], dk, 8);
  for (const x of [-0.17, 0.17]) g.boxB(0.035, 0.26, 0.1, [x, 1.3, 0], dk, null, BOT);
  g.box(0.3, 0.2, 0.34, [0, 1.52, 0.02], body, [-0.12, 0, 0]);
  for (const x of [-0.085, 0.085]) { g.cyl(0.062, 0.062, 0.56, [x, 1.53, 0.06], body, 8, [Math.PI / 2 - 0.12, 0, 0]); g.cyl(0.05, 0.05, 0.02, [x, 1.497, 0.345], '#12161a', 8, [Math.PI / 2 - 0.12, 0, 0]); g.cyl(0.035, 0.04, 0.07, [x, 1.572, -0.25], dk, 6, [Math.PI / 2 - 0.12, 0, 0]); }
  g.box(0.13, 0.2, 0.1, [0.2, 1.02, 0], dk); g.box(0.07, 0.012, 0.012, [0.2, 1.07, 0.052], '#c9cdd0');
  g.boxB(0.5, 0.16, 0.3, [0, 0, -0.42], dk, null, BOT);
  return g;
}
/** boiled-corn cart (the tourist quays in summer): a steel counter 1.3 x 0.7 on two wheels with a round steamer pot, a row of cobs on the counter, a yellow umbrella; ~370 triangles. front +Z */
export function cornCart(umb = '#e8b02a') {
  const g = new Geo();
  g.boxB(1.3, 0.8, 0.7, [0, 0.14, 0], '#c2c7cb', null, BOT); g.boxB(1.36, 0.05, 0.76, [0, 0.94, 0], '#8f979d', null, BOT); g.boxB(1.3, 0.16, 0.02, [0, 0.5, 0.36], '#3f7a3c', null, BOT | TOP);
  for (const x of [-0.5, 0.5]) g.cyl(0.14, 0.14, 0.05, [x, 0.16, 0.38], '#1c1e22', 7, [0, 0, Math.PI / 2]);
  g.cylB(0.24, 0.24, 0.3, [-0.3, 0.99, -0.02], '#9aa1a7', 10); g.cylB(0.25, 0.25, 0.03, [-0.3, 1.29, -0.02], '#6d7378', 10); g.sphere(0.035, 0.035, 0.035, [-0.3, 1.34, -0.02], '#22252a', 5);
  for (let i = 0; i < 5; i++) g.cyl(0.035, 0.03, 0.2, [0.12 + i * 0.1, 1.03, 0.12], i === 2 ? '#e3c23a' : '#f0d24c', 5, [Math.PI / 2, 0, 0.15 * (i - 2)]);
  g.tube([0.5, 0.94, -0.2], [0.5, 2.5, -0.2], 0.025, '#e8e4d8', 4);
  g.lathe([[0, 2.8], [0.9, 2.56], [1.4, 2.3], [1.4, 2.25], [0, 2.46]], [0.5, 0, -0.2], umb, 8);
  return g;
}
export function signPole() {
  const g = new Geo();
  g.tube([0, 0, 0], [0, 2.1, 0], 0.03, COL.black, 4); g.cylB(0.07, 0.07, 0.06, [0, 0, 0], COL.black, 5);
  return g;
}
