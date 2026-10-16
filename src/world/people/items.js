// people/items.js - things people carry, wear on the body or ride (characters half): bags, phones, ice cream, bikes, scooters, prams, dogs.
// Every item kind is ONE InstancedMesh (vertex-coloured toon material, per-instance tint via instanceColor) with one instance per owner; chars.js writes the matrices from the
// figure's torso / hand matrices.  Vehicle dimensions are the VEH constants of anim.js (world metres at vehicle scale 1).
//   torso-attached: backpack, courier (insulated box bag), crossbody, belt (sling bag), lanyard
//   hand-attached : handbag, shopbag, phone (+ screen: glows at night), icecream, cigarette
//   vehicles      : bike, escooter, kick, balance (frame + wheels), pram (frame + wheels), dog (body + 4 legs + leash)
import { Geo, TAU } from './kit.js';
import { VEH } from './anim.js';

const DARK = '#2d2f34', TYRE = '#26272b', RIM = '#c9ced3';
const tubeO = (g, a, b, r, col, seg = 5, rTop = null) => g.tube(a, b, r, col, seg, rTop, true);          // open-ended tube: the ends sit inside joints

// ------------------------------------------------------------------ worn / carried
const F = {
  backpack() { const g = new Geo(); g.box(0.3, 0.4, 0.15, [0, 0.3, -0.17], '#ffffff'); g.box(0.24, 0.16, 0.05, [0, 0.17, -0.27], '#dcdcdc'); for (const s of [-1, 1]) g.box(0.04, 0.3, 0.02, [s * 0.09, 0.36, 0.108], '#ffffff'); return g; },
  courier() { const g = new Geo(); g.box(0.44, 0.44, 0.36, [0, 0.31, -0.27], '#ffffff'); g.box(0.46, 0.05, 0.38, [0, 0.55, -0.27], '#e8e8e8'); for (const s of [-1, 1]) g.box(0.05, 0.36, 0.02, [s * 0.1, 0.36, 0.112], '#ffffff'); return g; },
  crossbody() { const g = new Geo(); g.box(0.03, 0.72, 0.014, [0.02, 0.28, 0.12], '#e8e8e8', [0, 0, -0.62]); g.box(0.22, 0.17, 0.08, [-0.2, -0.02, 0.0], '#ffffff'); return g; },
  belt() { const g = new Geo(); g.cyl(0.176, 0.178, 0.035, [0, 0.02, 0], DARK, 8, null, true); g.box(0.2, 0.11, 0.09, [0.05, 0.04, 0.15], '#ffffff'); return g; },
  lanyard() { const g = new Geo(); g.box(0.018, 0.34, 0.01, [-0.04, 0.38, 0.113], '#ffffff', [0, 0, 0.16]); g.box(0.018, 0.34, 0.01, [0.04, 0.38, 0.113], '#ffffff', [0, 0, -0.16]); g.box(0.07, 0.1, 0.012, [0, 0.2, 0.118], '#f4f4f4'); return g; },
  handbag() { const g = new Geo(); g.box(0.3, 0.2, 0.1, [0, -0.2, 0], '#ffffff'); g.box(0.012, 0.1, 0.012, [-0.07, -0.05, 0], DARK); g.box(0.012, 0.1, 0.012, [0.07, -0.05, 0], DARK); g.box(0.16, 0.012, 0.012, [0, -0.0, 0], DARK); return g; },
  shopbag() { const g = new Geo(); g.box(0.28, 0.3, 0.13, [0, -0.28, 0], '#ffffff'); g.box(0.012, 0.14, 0.012, [-0.06, -0.06, 0], '#e8e8e8'); g.box(0.012, 0.14, 0.012, [0.06, -0.06, 0], '#e8e8e8'); return g; },
  phone() { const g = new Geo(); g.box(0.07, 0.14, 0.01, [0, 0, 0], '#202228'); return g; },
  screen() { const g = new Geo(); g.quad([-0.031, -0.063, 0.0056], [0.031, -0.063, 0.0056], [0.031, 0.063, 0.0056], [-0.031, 0.063, 0.0056], '#ffffff'); return g; },
  icecream() { const g = new Geo(); g.cyl(0.032, 0.008, 0.11, [0, 0.0, 0], '#d9a85c', 5, null, true); g.sphere(0.038, 0.04, 0.038, [0, 0.07, 0], '#ffffff', 5, null, 3); return g; },
  cigarette() { return new Geo().box(0.009, 0.009, 0.09, [0, 0, 0], '#f2efe6'); },
};

// ------------------------------------------------------------------ wheels
/** a wheel centred at the origin, axle along X (rotate about X to spin) */
export function wheelGeo(r, spokes = true, rim = RIM, tyre = TYRE) {
  const g = new Geo(), t = Math.max(0.018, r * 0.09);
  g.torus(r - t, t, [0, 0, 0], tyre, [0, Math.PI / 2, 0], 3, r > 0.2 ? 14 : 10);
  g.cyl(0.03, 0.03, 0.06, [0, 0, 0], rim, 6, [0, 0, Math.PI / 2], true);
  if (spokes) g.box(0.008, (r - t) * 1.9, 0.012, [0, 0, 0], rim, [0, 0, 0]);
  return g;
}

// ------------------------------------------------------------------ vehicles
function bikeFrame() {
  const V = VEH.bike, g = new Geo(), col = '#ffffff', rear = [0, 0.34, -0.5], front = [0, 0.34, 0.5], bb = [0, V.bb[1], V.bb[0]], seatTop = [0, 0.92, -0.2], headT = [0, 0.86, 0.36], headB = [0, 0.7, 0.42], bar = [0, 0.98, 0.33];
  tubeO(g, rear, bb, 0.018, col, 5); tubeO(g, bb, seatTop, 0.02, col, 5); tubeO(g, seatTop, rear, 0.014, col, 5);
  tubeO(g, seatTop, headT, 0.02, col, 5); tubeO(g, bb, headB, 0.024, col, 5); tubeO(g, headB, headT, 0.026, col, 5);
  tubeO(g, headB, front, 0.016, DARK, 5); tubeO(g, headT, bar, 0.014, DARK, 5);
  g.box(0.58, 0.03, 0.03, bar, DARK); g.box(0.06, 0.03, 0.1, [0.29, 0.98, 0.33], '#25272b'); g.box(0.06, 0.03, 0.1, [-0.29, 0.98, 0.33], '#25272b');
  g.box(0.13, 0.05, 0.26, [0, 0.97, -0.22], DARK);
  g.box(0.11, 0.025, 0.06, [0.15, V.bb[1] - 0.02, V.bb[0]], '#25272b'); g.box(0.11, 0.025, 0.06, [-0.15, V.bb[1] + 0.02, V.bb[0]], '#25272b');
  g.cyl(0.07, 0.07, 0.02, [0.03, V.bb[1], V.bb[0]], '#8a9096', 8, [0, 0, Math.PI / 2]);
  g.box(0.03, 0.03, 0.34, [0, 0.62, -0.63], col);
  return g;
}
function escooterBody() {
  const V = VEH.escooter, g = new Geo();
  g.box(0.17, 0.035, 0.48, [0, 0.1425, -0.06], '#2a2b30'); g.box(0.15, 0.05, 0.1, [0, 0.12, -0.31], '#2a2b30');
  tubeO(g, V.stem[0], V.stem[1], 0.017, '#f2c300', 6); g.box(0.07, 0.1, 0.09, [0, 0.2, 0.38], '#f2c300');
  g.box(0.5, 0.024, 0.024, V.stem[1], '#2a2b30'); for (const s of [-1, 1]) g.cyl(0.017, 0.017, 0.1, [s * 0.24, V.stem[1][1], V.stem[1][2]], '#15161a', 6, [0, 0, Math.PI / 2]);
  tubeO(g, [0, 0.12, 0.42], [0, 0.16, 0.38], 0.014, '#8a9096', 5);
  return g;
}
function kickBody() {
  const V = VEH.kick, g = new Geo();
  g.box(0.13, 0.03, 0.4, [0, 0.085, -0.05], '#ffffff'); tubeO(g, V.stem[0], V.stem[1], 0.014, '#c5c8cc', 5);
  g.box(0.36, 0.022, 0.022, V.stem[1], '#c5c8cc'); for (const s of [-1, 1]) g.cyl(0.015, 0.015, 0.08, [s * 0.18, V.stem[1][1], V.stem[1][2]], '#e8563c', 5, [0, 0, Math.PI / 2]);
  tubeO(g, [0, 0.07, 0.36], [0, 0.1, 0.34], 0.012, '#8a9096', 5);
  return g;
}
function balanceBody() {
  const g = new Geo(); tubeO(g, [0, 0.14, -0.3], [0, 0.34, -0.05], 0.016, '#ffffff', 5); tubeO(g, [0, 0.34, -0.05], [0, 0.4, -0.1], 0.016, '#ffffff', 5); tubeO(g, [0, 0.34, -0.05], [0, 0.45, 0.26], 0.016, '#ffffff', 5); tubeO(g, [0, 0.45, 0.26], [0, 0.14, 0.3], 0.014, DARK, 5);
  g.box(0.1, 0.035, 0.18, [0, 0.4, -0.1], DARK); g.box(0.36, 0.022, 0.022, [0, 0.55, 0.25], DARK);
  for (const s of [-1, 1]) g.box(0.04, 0.025, 0.07, [s * 0.18, 0.55, 0.25], '#e8563c');
  return g;
}
// ------------------------------------------------------------------ station / tourist / street-life items (Saint Petersburg)
/** rolling hard-shell suitcase pulled beside / behind the walker: origin on the floor at the root-local point (0.34, 0, -0.1) (chars.js places it); the telescopic handle reaches the left hand */
function suitcaseBody() {
  const g = new Geo();
  g.box(0.38, 0.6, 0.22, [0, 0.4, 0], '#ffffff');                                              // shell (tinted per instance)
  g.box(0.4, 0.05, 0.24, [0, 0.12, 0], '#d4d4d8'); g.box(0.4, 0.03, 0.24, [0, 0.68, 0], '#d4d4d8');   // bumper rails
  for (const s of [-1, 1]) g.box(0.012, 0.5, 0.225, [s * 0.1, 0.4, 0], '#e8e8ee');                     // ribs
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.cyl(0.03, 0.03, 0.04, [sx * 0.15, 0.04, sz * 0.07], DARK, 6, [0, 0, Math.PI / 2]);
  tubeO(g, [0, 0.66, 0.04], [-0.14, 0.88, 0.12], 0.012, '#9a9ea4', 5); g.box(0.1, 0.025, 0.03, [-0.14, 0.9, 0.12], DARK);
  return g;
}
/** a plain coloured umbrella held aloft: origin = the grip, pole up +Y, canopy ~1 m above (NO flag: the tour guide's rally point) */
function umbrellaBody() {
  const g = new Geo();
  tubeO(g, [0, -0.1, 0], [0, 1.02, 0], 0.011, '#3a3c42', 5);
  g.cyl(0.02, 0.02, 0.12, [0, -0.1, 0], '#2b2d32', 5);
  const R = [[0.0, 1.16], [0.2, 1.1], [0.4, 1.0], [0.52, 0.93]], n = 8;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
    for (let k = 0; k + 1 < R.length; k++) {
      const [r0, y0] = R[k], [r1, y1] = R[k + 1];
      const p = (r, y, a, dy = 0) => [Math.sin(a) * r, y + dy, Math.cos(a) * r];
      g.quad(p(r0, y0, a0), p(r1, y1, a0), p(r1, y1, a1), p(r0, y0, a1), '#ffffff');                  // outside
      g.quad(p(r0, y0, a0, -0.012), p(r0, y0, a1, -0.012), p(r1, y1, a1, -0.012), p(r1, y1, a0, -0.012), '#c9c9cf');   // inside (darker)
    }
  }
  g.sphere(0.02, 0.02, 0.02, [0, 1.17, 0], '#2b2d32', 4, null, 3);
  return g;
}
/** acoustic guitar in the torso frame (strap over the shoulder): body low on the right, neck pointing to the left-forward */
function guitarBody() {
  const g = new Geo();
  g.sphere(0.13, 0.04, 0.15, [-0.02, 0.06, 0.2], '#ffffff', 8, [0.15, 0, 0], 4); g.sphere(0.1, 0.04, 0.11, [-0.04, 0.12, 0.34], '#ffffff', 8, [0.15, 0, 0], 4);
  g.cyl(0.045, 0.045, 0.012, [-0.03, 0.1, 0.27], '#2a1e16', 8, [0.15, 0, 0]);
  tubeO(g, [0.02, 0.15, 0.4], [0.3, 0.27, 0.6], 0.02, '#4a3224', 5); g.box(0.07, 0.03, 0.12, [0.34, 0.28, 0.64], '#2a1e16', [0.2, 0.6, 0]);
  g.box(0.02, 0.5, 0.01, [0.1, 0.34, 0.11], '#2b2b30', [0, 0, 0.1]);
  return g;
}
/** an easel with a portrait on it (origin on the floor, canvas facing +Z) */
function easelBody() {
  const g = new Geo();
  for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [0, 0.3]]) tubeO(g, [x * 0.35, 1.2, 0], [x, 0, z], 0.014, '#c9a46a', 5);
  g.box(0.62, 0.78, 0.03, [0, 1.1, 0.03], '#f4f1ea');
  g.box(0.5, 0.64, 0.01, [0, 1.1, 0.05], '#e8dcc8');
  g.sphere(0.12, 0.15, 0.01, [0, 1.12, 0.058], '#e9bfa0', 8, null, 4); g.sphere(0.13, 0.09, 0.012, [0, 1.2, 0.06], '#3a2a20', 8, null, 3); g.box(0.28, 0.2, 0.012, [0, 0.9, 0.056], '#3d5a8a');
  g.box(0.56, 0.02, 0.07, [0, 0.76, 0.06], '#c9a46a');
  return g;
}
/** a street broom held in the right hand: origin at the grip, the pole runs down-forward in the item frame, the brush head at its end */
function broomBody() {
  const g = new Geo();
  tubeO(g, [0, 0.2, 0], [0, -1.15, 0.22], 0.014, '#a47c4c', 5);
  g.box(0.48, 0.07, 0.1, [0, -1.2, 0.26], '#d98a2a', [0.2, 0, 0]); g.box(0.46, 0.05, 0.08, [0, -1.24, 0.27], '#7a5a30', [0.2, 0, 0]);
  return g;
}
/** a fishing rod held in the right hand: origin at the grip, the rod points forward and up over the parapet (item +z = forward of the person), the line hangs from the tip down to the water */
function rodBody() {
  const g = new Geo();
  tubeO(g, [0, -0.28, -0.2], [0, 1.9, 2.9], 0.013, '#33363c', 5, 0.004);
  g.box(0.045, 0.07, 0.09, [0.02, -0.03, 0.1], '#b9bec4');
  g.box(0.006, 6.0, 0.006, [0, -1.1, 2.9], '#e9e9e4');
  return g;
}
function bouquetBody() {
  const g = new Geo();
  g.cyl(0.015, 0.02, 0.18, [0, 0.0, 0], '#4f8a3a', 5);
  for (const [x, y, z] of [[0, 0.12, 0], [0.05, 0.1, 0.03], [-0.05, 0.1, 0.03], [0.02, 0.1, -0.05], [-0.03, 0.13, -0.03]]) g.sphere(0.05, 0.045, 0.05, [x, y, z], '#ffffff', 5, null, 3);
  return g;
}
function cameraBody() { const g = new Geo(); g.box(0.13, 0.08, 0.07, [0, 0.27, 0.15], '#25272b'); g.cyl(0.032, 0.036, 0.06, [0, 0.27, 0.205], '#15161a', 6, [Math.PI / 2, 0, 0]); g.box(0.02, 0.4, 0.01, [0, 0.45, 0.12], '#2b2d32'); return g; }
const BLUE = '#2f3f7a', YEL = '#e5c02a', RED = '#c7443a';
function pramBody() {
  const g = new Geo(), h = VEH.pram.handle;      // origin: the handle bar centre projected on the ground; +Z forward
  g.box(0.5, 0.025, 0.025, [0, 0.98, 0], DARK);
  for (const s of [-1, 1]) { tubeO(g, [s * 0.25, 0.98, 0], [s * 0.25, 0.3, 0.2], 0.014, BLUE, 5); tubeO(g, [s * 0.25, 0.3, 0.2], [s * 0.24, 0.16, 0.92], 0.014, BLUE, 5); tubeO(g, [s * 0.25, 0.3, 0.2], [s * 0.26, 0.14, 0.12], 0.012, BLUE, 5); tubeO(g, [s * 0.24, 0.3, 0.9], [s * 0.24, 0.13, 0.9], 0.012, BLUE, 5); }
  g.box(0.5, 0.04, 0.9, [0, 0.34, 0.5], BLUE);
  g.box(0.5, 0.2, 0.82, [0, 0.46, 0.55], '#f0eee8');                                  // basket
  g.box(0.46, 0.18, 0.12, [0, 0.49, 0.18], '#f0eee8');
  g.box(0.5, 0.1, 0.78, [0, 0.58, 0.55], RED);                                        // upper rim / seat colour
  g.sphere(0.27, 0.22, 0.27, [0, 0.58, 0.25], RED, 8);                                // hood over the baby's head end
  g.box(0.4, 0.05, 0.38, [0, 0.62, 0.65], '#efe3d2');                                // blanket
  g.sphere(0.075, 0.08, 0.075, [0, 0.63, 0.5], '#f1cfb6', 6);                         // a hint of a baby
  return g;
}
function dogBody() {
  const g = new Geo();
  g.sphere(0.13, 0.14, 0.27, [0, 0.4, 0], '#ffffff', 7).sphere(0.09, 0.085, 0.095, [0, 0.55, 0.3], '#ffffff', 7).box(0.07, 0.06, 0.1, [0, 0.5, 0.39], '#3a3232')
    .box(0.035, 0.09, 0.05, [0.065, 0.63, 0.27], '#d8d0c4', [0, 0, -0.3]).box(0.035, 0.09, 0.05, [-0.065, 0.63, 0.27], '#d8d0c4', [0, 0, 0.3]).tube([0, 0.45, -0.24], [0, 0.64, -0.36], 0.026, '#ffffff', 5, 0.014);
  return g;
}
const dogLeg = () => new Geo().tube([0, 0, 0], [0, -0.34, 0], 0.035, '#ffffff', 5, 0.024, true).box(0.06, 0.03, 0.09, [0, -0.34, 0.02], '#3a3232');
const leash = () => new Geo().box(0.012, 0.012, 1, [0, 0, 0.5], '#c8453c');

/** item kinds -> { geo: () => Geo, tint?: bool, mat: 'vc' | 'screen', cast: bool } */
export const KINDS = {
  backpack: { geo: F.backpack }, courier: { geo: F.courier }, crossbody: { geo: F.crossbody }, belt: { geo: F.belt }, lanyard: { geo: F.lanyard },
  handbag: { geo: F.handbag }, shopbag: { geo: F.shopbag }, phone: { geo: F.phone, cast: false }, screen: { geo: F.screen, mat: 'screen', cast: false }, icecream: { geo: F.icecream }, cigarette: { geo: F.cigarette, cast: false },
  bike: { geo: bikeFrame }, bikeWheel: { geo: () => wheelGeo(VEH.bike.wheelR) },
  escooter: { geo: escooterBody }, escooterWheel: { geo: () => wheelGeo(VEH.escooter.wheelR, false, '#9aa0a8') },
  kick: { geo: kickBody }, kickWheel: { geo: () => wheelGeo(VEH.kick.wheelR, false, '#e8563c') },
  balance: { geo: balanceBody }, balanceWheel: { geo: () => wheelGeo(VEH.balance.wheelR, false, '#e8563c') },
  pram: { geo: pramBody }, pramWheel: { geo: () => wheelGeo(0.13, true, YEL) },
  dog: { geo: dogBody }, dogLeg: { geo: dogLeg }, leash: { geo: leash, cast: false },
  suitcase: { geo: suitcaseBody }, umbrella: { geo: umbrellaBody }, guitar: { geo: guitarBody }, easel: { geo: easelBody }, broom: { geo: broomBody }, rod: { geo: rodBody, cast: false }, bouquet: { geo: bouquetBody }, camera: { geo: cameraBody },
};
