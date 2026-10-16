// props/vo-kit.js - geometry factories of the street furniture that is specific to VASILIEVSKY ISLAND (docs/VO-BRIEF.md, docs/research/vo-roster-architecture.md section 7; photos vora 08 / 11 / 43,
// streets-vo 13 / 15). Same conventions as furniture.js: local origin on the ground, front = +Z, x along the length, vertex colours. Every factory returns a Geo that props/vo.js turns into ONE shared
// BufferGeometry (a static mesh per object, merged by the static batcher into the cells of the shared 'pr-vc' material: no new draw calls).
//   benchBlock       Bolshoy pr. boulevards: pale concrete-block ends, timber seat and back (photo 08)                       ~100 triangles
//   planterVase      the big pinkish-brown stone vase planters of the Bolshoy boulevards (photo 08)                           ~260
//   benchPromenade   the land fill / Gulf promenades: light timber on galvanised legs, slim back                              ~90
//   kioskGlazed      the glazed newspaper kiosk of Sredny / Bolshoy / Maly crossings (photo 11)                              ~150
//   shopPavilion     the one-storey shop pavilions of the 1970s at the tram and bus loops of Gavan (photo 43)                ~170
//   billboardGeo     roadside billboard on a single pole (advertising=billboard: 54 on the island), 6 x 3 m, catwalk + lamps  ~110
//   totemGeo         a shop pylon (advertising=totem: 9)                                                                       ~40
//   cctvGeo          a wall-mounted camera (man_made=surveillance: 121)                                                        ~40
import { Geo, DEG, BOT, TOP, PX, NX, PZ, NZ } from './kit.js';
import { COL } from './furniture.js';

const flowers = (g, rnd, n, R, y, cols, size = 0.12) => {
  for (let i = 0; i < n; i++) { const a = rnd() * 6.2832, d = Math.sqrt(rnd()) * R; g.octa(size * (0.8 + rnd() * 0.5), size * 0.75, size * (0.8 + rnd() * 0.5), [Math.cos(a) * d, y + rnd() * 0.08, Math.sin(a) * d], cols[Math.floor(rnd() * cols.length)]); }
};

/** Bolshoy pr. boulevard bench: two pale concrete blocks with a cap, a seat of four timber slats on them, a back of three slats on two slanted posts; len along X, 1.8 m, 0.5 m deep */
export function benchBlock(len = 1.8, wood = '#8b4b33') {
  const g = new Geo(), hl = len / 2 - 0.2, blk = '#cbc7bc', cap = '#b8b4a8', woodD = '#6e3a28', SL = PX | NX | BOT;
  for (const s of [-1, 1]) { g.boxB(0.4, 0.4, 0.46, [s * hl, 0, 0], blk, null, BOT); g.boxB(0.44, 0.04, 0.5, [s * hl, 0.4, 0], cap, null, BOT); }
  for (let k = 0; k < 4; k++) g.box(len - 0.12, 0.04, 0.11, [0, 0.46, 0.19 - k * 0.126], wood, null, SL);
  for (const s of [-1, 1]) g.box(0.05, 0.52, 0.05, [s * hl, 0.72, -0.24], woodD, [-12 * DEG, 0, 0], BOT);
  for (let k = 0; k < 3; k++) g.box(len - 0.12, 0.1, 0.03, [0, 0.64 + k * 0.13, -0.265 - k * 0.028], wood, [-12 * DEG, 0, 0], SL);
  return g;
}

/** the large stone vase planter of the Bolshoy boulevards: a pinkish-brown granite bowl 1.1 m wide on a short stem, 0.92 m, bedding plants and a clipped shrub; ~260 triangles */
export function planterVase(rnd = () => 0.5) {
  const g = new Geo(), st = '#b08a80';
  g.lathe([[0, 0], [0.34, 0], [0.36, 0.08], [0.24, 0.2], [0.2, 0.4], [0.3, 0.55], [0.5, 0.72], [0.56, 0.9], [0.5, 0.92], [0.46, 0.84], [0, 0.8]], [0, 0, 0], st, 10);
  g.octa(0.46, 0.22, 0.46, [0, 0.9, 0], COL.leaf);
  g.sphere(0.26, 0.2, 0.26, [0.05, 1.08, 0], COL.leafL, 6);
  flowers(g, rnd, 9, 0.4, 0.92, ['#d9387a', '#f3f1ec', '#e8575a', '#e8b02a', '#c63d8e'], 0.12);
  return g;
}

/** promenade bench of the land fill: a light timber seat (four slats) and a slim back on galvanised steel legs, backed to the water (front +Z = the view), len 2.2 m */
export function benchPromenade(len = 2.2) {
  const g = new Geo(), wood = '#c9a36a', steel = COL.galvD, SL = PX | NX | BOT;
  for (const s of [-1, 1]) {
    const x = s * (len / 2 - 0.25);
    g.boxB(0.05, 0.44, 0.46, [x, 0, 0.02], steel, null, BOT);
    g.box(0.05, 0.5, 0.05, [x, 0.7, -0.24], steel, [-14 * DEG, 0, 0], BOT);
    g.boxB(0.34, 0.03, 0.42, [x, 0, 0.02], steel, null, TOP);
  }
  for (let k = 0; k < 4; k++) g.box(len - 0.1, 0.04, 0.1, [0, 0.46, 0.17 - k * 0.115], wood, null, SL);
  for (let k = 0; k < 2; k++) g.box(len - 0.1, 0.12, 0.03, [0, 0.66 + k * 0.17, -0.26 - k * 0.04], wood, [-14 * DEG, 0, 0], SL);
  return g;
}

/** the glazed newspaper kiosk (photo 11: charcoal body, a glass front full of magazines, a counter shelf, a white sign band under a flat grey roof): W x D x H = 2.3 x 1.5 x 2.45, front +Z.
 *  The sign band is a textured panel added by the caller (centre y 2.18, 2.0 x 0.4, 3.6 cm in front of the box). */
export function kioskGlazed(rnd = () => 0.5, W = 2.3, D = 1.5, H = 2.45) {
  const g = new Geo(), body = '#3b4148', glass = '#1d2a31', trim = '#d9d6cc', roof = '#7c838a';
  g.boxB(W + 0.06, 0.12, D + 0.06, [0, 0, 0], '#8d8f90', null, BOT);                                           // plinth slab
  g.boxB(W, H - 0.62, D, [0, 0.12, 0], body, null, BOT | TOP);                                                  // the body
  g.boxB(W - 0.3, 1.18, 0.04, [0, 0.74, D / 2 + 0.005], glass, null, PX | NX | TOP | BOT | NZ);                   // glass front
  const cols = ['#b8483f', '#3f6fb0', '#d9b34a', '#e9e6dc', '#4a8f6a', '#8a5fa0', '#c8607e', '#cf8a3a', '#6a7f8f'];      // rows of magazine and newspaper covers behind the glass (2 triangles each), muted colours, dark shelf rails
  for (let r = 0; r < 3; r++) {
    const y0 = 0.9 + r * 0.33, z = D / 2 + 0.03, n = 9, cw = (W - 0.5) / n;
    g.boxB(W - 0.4, 0.025, 0.05, [0, y0 - 0.03, z], '#14191d', null, BOT | TOP);
    for (let c = 0; c < n; c++) {
      const x0 = -W / 2 + 0.25 + c * cw + 0.015, h = 0.22 + rnd() * 0.07;
      g.quad([x0, y0, z], [x0 + cw - 0.03, y0, z], [x0 + cw - 0.03, y0 + h, z], [x0, y0 + h, z], cols[Math.floor(rnd() * cols.length)]);
    }
  }
  for (const x of [-(W / 2 - 0.12), W / 2 - 0.12]) g.boxB(0.07, 1.3, 0.07, [x, 0.7, D / 2 + 0.02], trim, null, BOT | TOP);   // window jambs
  g.boxB(W - 0.2, 0.05, 0.3, [0, 0.76, D / 2 + 0.16], trim, null, BOT);                                          // counter shelf
  g.boxB(W + 0.04, 0.46, D + 0.04, [0, H - 0.52, 0], '#eceae3', null, BOT);                                     // the white sign band (box)
  g.boxB(W + 0.04, 0.05, D + 0.04, [0, H - 0.52, 0], '#2d3a46', null, BOT);                                      // dark edge under it
  g.boxB(W + 0.24, 0.08, D + 0.24, [0, H - 0.06, 0], roof, null, 0);                                            // flat roof with an overhang
  g.cylB(0.2, 0.2, 0.05, [W / 2 - 0.35, H + 0.02, -0.1], '#c9c6bd', 8);                                          // a roof vent
  return g;
}

/** a 1970s shop pavilion (photo 43): a one-storey flat-roofed box of beige panels on a concrete plinth, a long glazed ribbon with brown mullions on the +Z side, a doorway with a flat canopy on two
 *  posts, a parapet. Length L (6 .. 10 m) x 5.2 x 3.7 m; the fascia (a textured panel) goes above the glazing at y 3.0, 0.68 m high. */
export function shopPavilion(L = 9.0, D = 5.2) {
  const g = new Geo(), wall = '#cfc5a6', plinth = '#9d9a92', glass = '#243038', frame = '#5b4636', roof = '#8b857a';
  g.boxB(L + 0.2, 0.22, D + 0.2, [0, 0, 0], plinth, null, BOT);
  g.boxB(L, 3.0, D, [0, 0.22, 0], wall, null, BOT);
  const gw = L - 1.8, n = Math.max(3, Math.round(gw / 1.5)), z = D / 2 + 0.02;
  g.boxB(gw, 1.55, 0.06, [-0.45, 0.62, z], glass, null, PX | NX | TOP | BOT | NZ);                              // the glazed ribbon
  for (let i = 0; i <= n; i++) g.boxB(0.07, 1.6, 0.1, [-0.45 - gw / 2 + i * gw / n, 0.6, z + 0.02], frame, null, BOT | TOP);
  g.boxB(gw, 0.07, 0.1, [-0.45, 2.18, z + 0.02], frame, null, BOT); g.boxB(gw, 0.07, 0.1, [-0.45, 0.58, z + 0.02], frame, null, BOT);
  g.boxB(1.0, 2.05, 0.08, [L / 2 - 0.9, 0.22, z], '#3a2d24', null, PX | NX | TOP | BOT | NZ);                    // the door
  g.boxB(2.6, 0.12, 1.3, [L / 2 - 1.0, 2.6, D / 2 + 0.65], frame, null, BOT);                                    // flat canopy over the doorway
  for (const s of [-1, 1]) g.boxB(0.1, 2.6, 0.1, [L / 2 - 1.0 + s * 1.15, 0, D / 2 + 1.2], frame, null, BOT | TOP);
  g.boxB(L + 0.3, 0.2, D + 0.3, [0, 3.22, 0], roof, null, 0);                                                    // cornice slab
  g.boxB(L + 0.3, 0.3, 0.12, [0, 3.42, D / 2 + 0.09], wall, null, BOT); g.boxB(L + 0.3, 0.3, 0.12, [0, 3.42, -D / 2 - 0.09], wall, null, BOT);   // parapet front / back
  for (const s of [-1, 1]) g.boxB(0.12, 0.3, D + 0.3, [s * (L / 2 + 0.09), 3.42, 0], wall, null, BOT);
  g.boxB(0.9, 0.5, 0.9, [-L / 2 + 1.2, 3.42, -0.6], '#b8b4a8', null, BOT);                                      // a roof vent box
  return g;
}

/** roadside billboard on one pole: a 0.3 m box pole up to the frame (3.1 m; the 0.12 m core carries the rest), a frame 6.2 x 3.2 m at y 3.1 .. 6.3 with a catwalk and five lamps over it. The poster faces are textured panels (normal +Z and -Z) the caller
 *  puts 8 cm in front of / behind the core (5.8 x 2.9 m, centre y 4.7). */
export function billboardGeo() {
  const g = new Geo(), steel = '#5d646b', dark = '#4a5058';
  g.boxB(0.5, 0.12, 0.5, [0, 0, 0], dark, null, BOT); g.boxB(0.3, 2.98, 0.3, [0, 0.12, 0], steel, null, BOT);      // the pole ends under the frame (review 2026-10-10: a 0.3 m deep pole up to 6.2 m stood 9 cm in front of the 6 cm core and cut the poster in two; the spine is inside the 0.12 m core)
  g.boxB(6.0, 2.9, 0.12, [0, 3.25, 0], '#6b727a', null, 0);                                                      // the core
  g.boxB(6.2, 0.14, 0.26, [0, 3.1, 0], dark, null, BOT); g.boxB(6.2, 0.14, 0.26, [0, 6.14, 0], dark, null, BOT);
  for (const s of [-1, 1]) g.boxB(0.14, 3.18, 0.26, [s * 3.03, 3.1, 0], dark, null, BOT | TOP);
  g.boxB(5.6, 0.04, 0.5, [0, 3.0, 0], '#8d949a', null, BOT);                                                      // the catwalk
  for (let i = 0; i < 5; i++) { const x = -2.4 + i * 1.2; g.tube([x, 6.28, 0.0], [x, 6.4, 0.55], 0.018, dark, 4); g.box(0.2, 0.08, 0.14, [x, 6.4, 0.6], '#cfd2d4'); g.tube([x, 6.28, 0.0], [x, 6.4, -0.55], 0.018, dark, 4); g.box(0.2, 0.08, 0.14, [x, 6.4, -0.6], '#cfd2d4'); }
  return g;
}

/** shop totem (pylon): a dark pole 1.3 m, a 1.1 x 2.5 m pylon box 2.0 .. 4.5 m with an edge frame; the lit faces are textured panels (normal +Z / -Z, centre y 3.25, 1.0 x 2.3 m) */
export function totemGeo() {
  const g = new Geo(), dark = '#2b2e33';
  g.boxB(0.5, 0.1, 0.5, [0, 0, 0], dark, null, BOT); g.boxB(0.22, 2.1, 0.22, [0, 0.1, 0], '#4a5058', null, BOT);
  g.boxB(1.14, 2.5, 0.24, [0, 2.0, 0], dark, null, BOT);
  return g;
}

/** a small outdoor camera on a wall bracket: 0.3 x 0.1 x 0.1 white housing with a sun shield and a dark lens, tilted 14 degrees down; front +Z (away from the wall), the wall plane is z = 0 */
export function cctvGeo() {
  const g = new Geo();
  g.box(0.05, 0.05, 0.16, [0, 0, 0.08], '#8f969c', null, BOT | NZ);
  g.box(0.1, 0.1, 0.3, [0, -0.03, 0.26], '#e9ecee', [14 * DEG, 0, 0], 0);
  g.box(0.13, 0.015, 0.34, [0, 0.032, 0.27], '#d4d8db', [14 * DEG, 0, 0], 0);
  g.cyl(0.036, 0.036, 0.02, [0, -0.07, 0.42], '#12161a', 6, [Math.PI / 2 + 14 * DEG, 0, 0]);
  return g;
}

void NZ; void PZ;
