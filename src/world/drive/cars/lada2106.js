// drive/cars/lada2106.js - the second drivable car: an old VAZ-2106 "Zhiguli" (Lada 1600) in eggplant / aubergine purple (баклажан), parked beside the red coupe at the Moscow station.
// Same factory contract as drive/model.js createCarModel (root, wheels, steerWheel, driver, flames, glow, headMat, tailMat, body, glass, set(p), setView(inside)) + its own cabin (cockpit.js).
// Built with the traffic module's vertex-colour builder (traffic/vb.js, mk.js) as ONE soft-bevelled side-profile extrusion for the lower body (belt line, hood, trunk, round wheel arches),
// a glass volume with thin pillars + a flat roof slab above it, chrome bumper blades with black rubber ends, four round head lamps in two rectangular housings, a flat chrome grille,
// wide tail clusters, rain gutters, door seams, rubber side mouldings, steel wheels with chrome dog-dish caps.
// Based on the Commons photos in docs/research/lada2106-2026.md (white Lada 1600 in Cuba front / rear, red 2106 at Kurfuerstendamm, blue 2106 rear, the worn red 2106 in Saint Petersburg).
// Car frame: forward +Z, origin on the ground midway between the axles, +X = the car's LEFT. Real size 4.17 x 1.61 x 1.40 m, wheelbase 2.42 m, 1035 kg.
// OLD LOOK: matt, chalky paint (roofs / bonnet / boot sun-faded, the lower body dirty), no gloss, a body that leans more than the coupe (set() scales pitch / roll by 1.25 / 1.3).
// NO badges: the grille emblem plate and the boot plate stay plain; the only logo is the Bibliotechka decal on the roof (the red coupe has the same). NO flags, no sirens.
// Z-FIGHTING: decals stand 1.2-1.6 cm proud, every other part keeps >= 1 cm from its neighbours' faces (same rules as traffic/models.js).
import * as THREE from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { VB } from '../../traffic/vb.js';
import { TYRE, archPts, extrudeSide, extrudeGlass, insetPoly, bodyTint } from '../../traffic/mk.js';
import { createLadaCockpit, EYE } from './lada2106/cockpit.js';
import { plateTexture, glowTexture, beamTexture } from './lada2106/parts.js';
import { createRoofLogo } from '../model.js';

export const SPEC_LADA = {
  name: 'lada2106',
  W: 1.62, R: 0.285, tw: 0.175, track: 1.35, yb: 0.17, wb: 2.42, front: 2.09, rear: -2.07,
  hn: 0.815, hh: 0.91, zc: 0.98, hb: 0.955, zt: -1.40, ht: 0.97, H: 1.40, zr0: 0.28, zr1: -0.88, taper: [0.06, 0.05],
  hgt: 1.40, len: 4.16, centerZ: 0.01,
  mass: 1035,                                     // kg (the red coupe is much lighter in feel: handling reads mass for the car's weight class)
  eye: { x: EYE.x, y: EYE.y, z: EYE.z }, fovRest: 72,
  exhaust: [{ x: 0.52, y: 0.235, z: -2.19 }, { x: 0.52, y: 0.235, z: -2.19 }],            // the single tail pipe (left, under the bumper); both entries for the smoke emitter of drive.js
};

const PAINT = '#552659', CHALK = '#8a6a8c', DIRT = '#34223a', HOOD = '#5b2a60';
const BLACK = '#17181a', RUBBER = '#1a1b1d', CH = '#b9bfc6', CH_DK = '#7f858d', AMBER = '#cc7a1c', CLEAR = '#d8d4c8', WHEEL_STEEL = '#8d949c';

export function createLadaModel(ctx, { plate = ['Е 106 КХ', '78'] } = {}) {
  const { mat } = ctx, S = SPEC_LADA;
  const s = { W: S.W, R: S.R, tw: S.tw, track: S.track, yb: S.yb, Ra: S.R + 0.065, bev: 0.04, zr: -S.wb / 2, zf: S.wb / 2, front: S.front, rear: S.rear };
  s.arches = [s.zr, s.zf];
  const { front, rear, yb, hn, hh, zc, hb, zt, ht, H, zr0, zr1 } = S;
  const fz = front - 0.04, rz = rear + 0.04;                              // the body's front / rear faces; the bumper blades stand in front of them
  const V = new VB(0), G = new VB(0), LH = new VB(0), LT = new VB(0), DR = new VB(0);
  const taper = { zF0: front - 0.9, zF1: front + 0.05, kF: S.taper[0], zR0: rear + 0.9, zR1: rear - 0.05, kR: S.taper[1], kS: 0, yS: hb, yT: H };
  const kAt = (z) => 1 - taper.kF * Math.pow(Math.max(0, (z - taper.zF0) / (taper.zF1 - taper.zF0)), 2) - taper.kR * Math.pow(Math.max(0, (taper.zR0 - z) / (taper.zR0 - taper.zR1)), 2);
  const hw = (z) => S.W / 2 * kAt(z);                                     // half width of the body at z (flat side face)
  const hoodY = (z) => hn + (hh - hn) * (fz - 0.08 - z) / (fz - 0.08 - zc);   // the bonnet surface (straight from the lip to the cowl)

  // ---- paint: matt + chalky. The arch lining / underside come from bodyTint; sun-faded tops, a slightly different bonnet (repainted), a dirty lower body
  const baseTint = bodyTint(s), _t = new THREE.Color(), chalk = new THREE.Color(CHALK), dirt = new THREE.Color(DIRT), hood = new THREE.Color(HOOD);
  const paintTint = (p, c, n, info) => {
    _t.copy(c); baseTint(p, c, n, info);
    if (!c.equals(_t)) return;
    if (n.y > 0.55) c.lerp(chalk, 0.24);
    if (p.z > 1.0 && p.y > 0.70 && n.y > 0.3) c.lerp(hood, 0.55);
    const k = Math.max(0, Math.min(1, (0.46 - p.y) / 0.26)); if (k > 0) c.lerp(dirt, 0.50 * k);
    else if (p.y < 0.72 && n.y < 0.5) c.multiplyScalar(0.94);
  };

  // ---- body: side profile -> front face -> hood -> cowl -> belt -> trunk -> rear face -> back along the sill with the two round wheel arches
  const top = [[fz - 0.08, yb + 0.10], [fz, yb + 0.20], [fz, 0.69], [fz - 0.04, hn - 0.02], [fz - 0.08, hn],
    [zc, hh], [zc - 0.07, hb], [zt, ht - 0.005], [rz + 0.16, ht + 0.005], [rz + 0.05, ht - 0.03], [rz, ht - 0.09], [rz, yb + 0.20], [rz + 0.09, yb + 0.10]];
  const pts = top.slice();
  for (const za of s.arches) pts.push(...archPts(s, za, 8));
  const shell = extrudeSide(pts, s.W, s.bev, taper);
  const panels = new TessellateModifier(0.22, 7).modify(shell);            // short panel edges: a damaged panel follows its trim
  V.add(panels, PAINT, null, paintTint);
  shell.dispose(); panels.dispose();

  // ---- greenhouse: glass volume (sunk 3 cm into the belt), dark cabin block + seats seen through it, the flat roof slab with its gutters, thin pillars
  const Wg = 1.46;
  const gpoly = [[0.93, hh], [zr0, H - 0.04], [zr1, H - 0.04], [zt, ht - 0.04]];
  G.add(extrudeGlass(gpoly, Wg), '#ffffff');
  V.add(extrudeGlass(insetPoly(gpoly, 0.06), Wg - 0.20), '#3d3630', new THREE.Matrix4().makeScale(-1, 1, 1));         // the dark beige cabin block seen through the glass
  for (const sx of [-0.34, 0.34]) {                                                     // front seats with their tall head restraints (brown vinyl)
    V.box(0.46, 0.50, 0.13, '#4c3223', [sx, 0.88, -0.56], [-0.22, 0, 0]);
    V.box(0.26, 0.18, 0.10, '#4c3223', [sx, 1.20, -0.64], [-0.20, 0, 0]);
  }
  V.box(Wg - 0.50, 0.30, 0.12, '#2b211c', [0, 0.95, zt + 0.22], [-0.28, 0, 0]);          // rear bench back
  V.box(1.50, 0.05, zr0 - zr1 + 0.04, PAINT, [0, H - 0.025, (zr0 + zr1) / 2], null, (p, c, n) => { if (n.y > 0.5) c.lerp(chalk, 0.34); });          // roof slab (3 cm wider than the glass each side)
  V.box(Wg - 0.10, 0.01, zr0 - zr1 - 0.02, '#a89d86', [0, H - 0.058, (zr0 + zr1) / 2]);               // beige headliner under the slab
  const gut = (z0, z1) => { for (const sd of [-1, 1]) V.box(0.022, 0.026, z1 - z0, CH, [sd * 0.752, H - 0.034, (z0 + z1) / 2]); };
  gut(zr1 + 0.02, zr0 - 0.02);                                                           // rain gutters (chrome strips along the roof edges)
  V.box(1.50, 0.020, 0.024, CH, [0, H - 0.030, zr0 + 0.016]);                            // chrome edge of the roof over the windscreen
  for (const sd of [-1, 1]) {
        V.rod([sd * 0.738, hh + 0.005, 0.97], [sd * 0.738, H - 0.03, zr0 + 0.005], 0.026, PAINT, 6);        // A pillar (thin)
    V.box(0.05, H - 0.04 - hb, 0.07, '#141517', [sd * 0.742, (H - 0.04 + hb) / 2 - 0.01, -0.32]);       // B pillar (black rubber trim)
    V.rod([sd * 0.742, hb - 0.005, 0.50], [sd * 0.742, hh + (H - 0.04 - hh) * (0.93 - 0.50) / (0.93 - zr0) - 0.012, 0.50], 0.0075, CH, 5);                  // quarter-light divider
    // C pillar: a thin panel in the body colour between the side window and the rear window, with the fresh-air vent
    const cp = extrudeSide([[-0.95, hb - 0.005], [-0.72, H - 0.03], [-0.88, H - 0.03], [zt, hb - 0.005]], 0.07, 0.012, null);
    V.add(cp, PAINT, new THREE.Matrix4().makeTranslation(sd * 0.715, 0, 0), (p, c, n) => { if (n.y > 0.5) c.lerp(chalk, 0.3); }); cp.dispose();
    V.box(0.012, 0.075, 0.13, '#0e0f10', [sd * 0.760, 1.10, -1.03], [0, 0, 0]);                          // the vent grille on the C pillar
  }
  // chrome window sill strips + wipers + the hood vents
  for (const sd of [-1, 1]) V.box(0.026, 0.022, 2.25, CH, [sd * 0.742, hb + 0.011, -0.12 + 0.0]);
  for (const sd of [-1, 1]) V.box(0.20, 0.012, 0.055, '#101112', [sd * 0.45, hoodY(1.12) + 0.006, 1.12], [Math.atan((hh - hn) / (fz - 0.08 - zc)), 0, 0]);   // hood air vents near the cowl
  {
    const th = Math.atan2(1.37 - hh, 0.93 - zr0);                                          // windscreen rake
    const nz = Math.sin(th), ny = Math.cos(th), t = 0.10, wz = 0.93 - (0.93 - zr0) * t, wy = hh + (H - 0.04 - hh) * t;
    for (const [x0, x1] of [[0.06, 0.48], [-0.42, -0.02]]) V.box(x1 - x0, 0.012, 0.014, '#0d0e10', [(x0 + x1) / 2, wy + 0.026 * ny, wz + 0.026 * nz], [th, 0, 0]);   // wipers lie on the screen
  }

  // ---- side details (the body half width follows the front / rear taper): chrome waist strip, rubber moulding, door seams, handles, sill, side lamps, mirrors
  const stripe = (z0, z1, y, h, th, color) => {
    for (let z = z0; z > z1 + 1e-4; z -= 0.2) {
      const za = z, zb = Math.max(z1, z - 0.2), zm = (za + zb) / 2;
      for (const sd of [-1, 1]) V.box(th, h, za - zb + 0.004, color, [sd * (hw(zm) + th / 2 - 0.012), y, zm]);
    }
  };
  stripe(1.72, -1.80, 0.795, 0.024, 0.026, CH);                                          // chrome waist strip
  stripe(0.70, -1.06, 0.585, 0.045, 0.028, RUBBER);                               // rubber moulding on the doors
  for (const sd of [-1, 1]) {
    const dx = sd * (S.W / 2 + 0.004);
    V.box(0.026, 0.60, 0.012, '#16111a', [dx, 0.62, 0.76]);                                          // door seams
    V.box(0.026, 0.60, 0.012, '#16111a', [dx, 0.62, -0.32]);
    V.box(0.026, 0.28, 0.012, '#16111a', [dx, 0.795, -1.10]);
    V.box(0.026, 0.010, 0.92, '#16111a', [dx, 0.895, 0.22]);                                       // (the seam of the door tops is the waist: a thin black line under the sill strip)
    V.box(0.030, 0.026, 0.14, CH, [sd * (S.W / 2 + 0.010), 0.84, -0.12]);                          // door handles (chrome, flat)
    V.box(0.030, 0.026, 0.14, CH, [sd * (S.W / 2 + 0.010), 0.84, -0.98]);
    V.box(0.040, 0.075, 1.62, RUBBER, [sd * (S.W / 2 - 0.0), 0.225, -0.01]);                       // black plastic sills
    V.box(0.014, 0.034, 0.075, AMBER, [sd * (hw(1.80) + 0.006), 0.675, 1.80]);                      // side repeaters on the front wings
    // door mirror: a small black plate on a chrome arm
    V.rbox(0.040, 0.085, 0.16, 0.012, '#202225', [sd * 0.895, 1.00, 0.73], [0, sd * -0.28, 0], 1);
    V.rod([sd * 0.80, 0.965, 0.76], [sd * 0.88, 1.0, 0.74], 0.009, CH, 5);
  }
  // inner wheel liners + the chassis block (closes the hollow arches), mud flaps behind the rear wheels
  V.box(S.W - 0.46, 0.20, S.len - 0.45, BLACK, [0, 0.265, S.centerZ]);
  for (const side of [-1, 1]) for (const z of [-S.wb / 2, S.wb / 2])
    V.cyl(S.R + 0.025, S.R + 0.025, 0.045, BLACK, [side * (S.track / 2 - 0.18), S.R - 0.03, z], [0, 0, Math.PI / 2], 18);
  for (const sd of [-1, 1]) V.box(0.22, 0.20, 0.014, RUBBER, [sd * 0.64, 0.255, -1.57]);
  V.cyl(0.032, 0.032, 0.20, '#6e625a', [0.52, 0.235, rz - 0.06], [Math.PI / 2, 0, 0], 8);        // the tail pipe (rusty chrome)

  // ---- front: the 4 round lamps in two rectangular housings, flat chrome grille, indicators, valance, bumper blade, rubber ends, over-riders, plate holder
  V.box(0.70, 0.22, 0.032, CH_DK, [0, 0.605, fz + 0.011]);                                                // grille frame (chrome)
  V.box(0.60, 0.155, 0.030, '#0b0c0e', [0, 0.605, fz + 0.021]);                                           // dark grille field
  for (const dy of [-0.045, -0.015, 0.015, 0.045]) V.box(0.60, 0.010, 0.016, CH, [0, 0.605 + dy, fz + 0.036]);              // horizontal chrome bars
  for (const dx of [-0.28, -0.10, 0.10, 0.28]) V.box(0.008, 0.155, 0.012, CH_DK, [dx, 0.605, fz + 0.034]);
  V.box(0.07, 0.085, 0.014, '#3a3c40', [0, 0.605, fz + 0.045]);                                           // the emblem plate: plain, empty
  V.box(0.66, 0.050, 0.020, '#0e0f10', [0, 0.465, fz + 0.002]);                                           // lower air slot
  V.box(1.20, 0.10, 0.060, BLACK, [0, 0.265, fz - 0.040]);                                                // lower valance under the bumper
  for (const sd of [-1, 1]) {
    V.box(0.41, 0.175, 0.030, CH_DK, [sd * 0.565, 0.64, fz + 0.011]);                                     // head lamp housing
    for (const dx of [0.46, 0.66]) {
      const x = sd * dx;
      V.cyl(0.082, 0.082, 0.020, CH, [x, 0.64, fz + 0.034], [Math.PI / 2, 0, 0], 16);                      // chrome rim
      LH.cyl(0.066, 0.066, 0.016, '#fff3d6', [x, 0.64, fz + 0.050], [Math.PI / 2, 0, 0], 14);              // lens (emissive)
    }
    V.box(0.15, 0.052, 0.022, AMBER, [sd * 0.64, 0.495, fz - 0.002]);                                     // indicator (amber, dull)
    V.box(0.06, 0.045, 0.020, CLEAR, [sd * 0.50, 0.495, fz - 0.002]);                                    // clear position lamp
    V.box(0.076, 0.13, 0.10, BLACK, [sd * 0.34, 0.37, front - 0.035]);                                   // black rubber over-riders on the blade
    V.box(0.075, 0.115, 0.30, BLACK, [sd * 0.765, 0.375, front - 0.185]);                                 // black rubber wrap-around end
    V.box(0.075, 0.115, 0.30, BLACK, [sd * 0.765, 0.375, rear + 0.185]);
    V.box(0.076, 0.13, 0.10, BLACK, [sd * 0.34, 0.37, rear + 0.035]);
  }
  V.box(1.50, 0.095, 0.045, CH, [0, 0.375, front - 0.027]);                                              // front bumper blade
  V.box(1.50, 0.095, 0.045, CH, [0, 0.375, rear + 0.027]);                                               // rear bumper blade
  V.box(1.20, 0.022, 0.050, CH_DK, [0, 0.43, front - 0.022]);

  // ---- rear: wide tail clusters (red = emissive stop lamp, amber indicator, clear reverse lamp), chrome trim along the boot lid, plain plate recess
  for (const sd of [-1, 1]) {
    V.box(0.42, 0.20, 0.028, CH_DK, [sd * 0.56, 0.76, rz - 0.007]);                                       // housing
    LT.box(0.17, 0.13, 0.014, '#ff3a30', [sd * 0.45, 0.76, rz - 0.028]);                                  // stop / tail lens (inner)
    V.box(0.08, 0.13, 0.014, CLEAR, [sd * 0.575, 0.76, rz - 0.028]);                                       // reverse lamp
    V.box(0.12, 0.13, 0.014, AMBER, [sd * 0.68, 0.76, rz - 0.028]);                                        // indicator (outer)
  }
  V.box(0.90, 0.014, 0.014, CH, [0, 0.905, rz - 0.01]);                                                   // chrome strip under the boot lid
  V.box(0.08, 0.04, 0.018, CH_DK, [0, 0.855, rz - 0.01]);                                                  // boot lock (plain)
  V.box(0.60, 0.15, 0.016, '#202225', [0, 0.605, rz - 0.003]);                                             // plate recess

  // ---- driver (seated at x = +0.34) + steering wheel (own meshes: the wheel turns, the driver is hidden in the cockpit view)
  const jacket = '#4a5160';
  DR.box(0.44, 0.50, 0.24, jacket, [0.34, 0.86, -0.36], [-0.1, 0, 0]);
  DR.box(0.10, 0.60, 0.10, jacket, [0.54, 0.93, -0.025], [1.99, 0, 0]);
  DR.box(0.10, 0.60, 0.10, jacket, [0.14, 0.93, -0.025], [1.99, 0, 0]);
  DR.sph(0.11, '#e0b08c', [0.34, 1.22, -0.30], 8);
  DR.sph(0.12, '#6a5238', [0.34, 1.245, -0.34], 8, [1, 0.8, 1]);
  const body = new THREE.Mesh(V.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0.05, name: 'drive-body' }));
  body.castShadow = true; body.receiveShadow = true; body.name = 'drive-body';
  const glassBase = mat.glass({ tint: '#2f423c', opacity: 0.48, streaks: true });
  const glassMat = glassBase.clone();
  glassMat.fragmentShader = glassBase.fragmentShader.replace('0.35 + 0.45 * fres', '0.10 + 0.5 * fres').replace('streak * 0.55', 'streak * 0.30');
  if (ctx.shared.uSkyMid) { glassMat.uniforms.uSkyTop = ctx.shared.uSkyMid; glassMat.uniforms.uSkyLow = ctx.shared.uSkyLow; }
  const glass = new THREE.Mesh(G.build(), glassMat); glass.name = 'drive-glass'; glass.renderOrder = 2;
  const headMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, name: 'drive-head' });
  const tailMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, name: 'drive-tail' });
  const lampH = new THREE.Mesh(LH.build(), headMat), lampT = new THREE.Mesh(LT.build(), tailMat);
  headMat.color.setScalar(0.9); tailMat.color.set(0.55, 0.05, 0.05);
  const driver = new THREE.Mesh(DR.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'drive-driver' }));

  const root = new THREE.Group(); root.name = 'drive-car'; root.rotation.order = 'YXZ';
  root.add(body, glass, lampH, lampT, driver);

  const steerWheel = new THREE.Group(); steerWheel.position.set(EYE.x, 0.82, 0.26); steerWheel.rotation.x = Math.PI + 0.68;
  { const W = new VB(0); W.torus(0.20, 0.0125, '#0f1011', [0, 0, 0], [0, 0, 0], 5, 22); W.rbox(0.36, 0.05, 0.034, 0.014, '#17181a', [0, 0, 0], null, 1); W.rbox(0.045, 0.056, 0.038, 0.01, '#c5cad0', [0.16, 0, 0], null, 1); W.rbox(0.045, 0.056, 0.038, 0.01, '#c5cad0', [-0.16, 0, 0], null, 1);
    steerWheel.add(new THREE.Mesh(W.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0, name: 'drive-steer-lada' }))); }
  root.add(steerWheel);

  // ---- the cockpit set for camera mode 2 (hidden until setView(true)); it replaces the body, glass, lamps, plates and the exterior wheel while the eye is inside
  const frontPts = top.slice(0, 6).concat([[0.62, hh], [0.62, 0.34], [fz - 0.08, yb + 0.10]]);
  const cockpit = createLadaCockpit(ctx, { S, frontPts, bev: s.bev, taper, paintTint });
  root.add(cockpit.group);

  // ---- wheels: pivot (steering about Y) -> mesh (rolling about X). Rim detail on +X; the right side is mirrored. A thin 175/70 R13 tyre, a plain steel rim, a chrome dog-dish cap.
  const WV = new VB(0), R = S.R, tw = S.tw;
  WV.cyl(R, R, tw, TYRE, [0, 0, 0], [0, 0, Math.PI / 2], 20);
  WV.cyl(R * 0.97, R * 0.97, tw + 0.012, '#2e2f34', [0, 0, 0], [0, 0, Math.PI / 2], 20);              // sidewall shade (slightly proud of the tread plane)
  WV.cyl(R * 0.60, R * 0.60, tw + 0.026, WHEEL_STEEL, [0, 0, 0], [0, 0, Math.PI / 2], 18);          // painted steel rim disc
  WV.cyl(R * 0.46, R * 0.46, tw + 0.034, '#555b63', [0, 0, 0], [0, 0, Math.PI / 2], 14);             // the dished centre
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; WV.cyl(0.013, 0.013, tw + 0.060, '#cfd3d8', [0, Math.cos(a) * 0.092, Math.sin(a) * 0.092], [0, 0, Math.PI / 2], 6); }   // the 4 wheel nuts
  WV.cyl(0.074, 0.074, tw + 0.070, '#d9dde1', [0, 0, 0], [0, 0, Math.PI / 2], 12);                  // the chrome cap
  WV.cyl(0.040, 0.040, tw + 0.088, '#b5babf', [0, 0, 0], [0, 0, Math.PI / 2], 10);
  const wheelGeo = WV.build(), wheelMat = mat.toon('#ffffff', { vertexColors: true, paint: 0.03, name: 'drive-wheel' });
  const wheels = [];
  for (const [sx, z, fr] of [[1, S.wb / 2, true], [-1, S.wb / 2, true], [1, -S.wb / 2, false], [-1, -S.wb / 2, false]]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * S.track / 2, R, z);
    const m = new THREE.Mesh(wheelGeo, wheelMat); m.castShadow = true; m.scale.x = sx; m.name = 'drive-wheel';
    pivot.add(m); root.add(pivot); wheels.push({ pivot, mesh: m, front: fr });
  }

  // ---- plates (a plain Russian plate: no flag, no emblem)
  const pTex = plateTexture(plate[0], plate[1]);
  const plateMat = mat.toon('#ffffff', { map: pTex, paint: 0, name: 'drive-plate' });
  // ---- the Bibliotechka logo on the roof (like the red coupe's): flat on the roof slab, the top of the icon pointing forward
  const roofLogo = createRoofLogo(ctx, root, { w: 0.78, y: H, z: (zr0 + zr1) / 2 });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.113), plateMat); pf.position.set(0, 0.375, front + 0.018); root.add(pf);
  const pr = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.113), plateMat); pr.position.set(0, 0.605, rz - 0.022); pr.rotation.y = Math.PI; root.add(pr);

  // ---- exhaust flicker (a very short blue-grey puff at the pipe, only under nitro) + the (invisible) glow + the head lamp pool
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.68, 0.95), transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, name: 'drive-flame' });
  const flameGeo = new THREE.ConeGeometry(0.05, 1, 8, 1, true); flameGeo.rotateX(-Math.PI / 2); flameGeo.translate(0, 0, -0.5);
  const flames = [];
  for (let i = 0; i < 2; i++) { const f = new THREE.Mesh(flameGeo, flameMat); f.position.set(S.exhaust[i].x, S.exhaust[i].y, S.exhaust[i].z); f.visible = false; f.scale.set(1, 1, 0.01); root.add(f); flames.push(f); ctx.noOutline(f); }
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(1, 0.9, 0.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, name: 'drive-glow' });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.06, 0.05); glow.visible = false; root.add(glow); ctx.noOutline(glow);   // no neon underglow on this car
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, name: 'drive-beam' });
  const beamGeo = new THREE.PlaneGeometry(6.4, 16); beamGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(0, 0.05, front + 8.0); root.add(beam); ctx.noOutline(beam);
  root.traverse((o) => { if (o.isMesh && o !== glow) o.frustumCulled = false; });
  for (const m of [lampH, lampT, driver]) m.castShadow = false;

  const night = ctx.shared.uNight;
  let flameK = 0, inside = false;
  const outer = [body, glass, lampH, lampT, steerWheel, roofLogo, pf, pr];
  const api = {
    spec: S, root, wheels, steerWheel, driver, flames, glow, headMat, tailMat, body, glass, cockpit, exhaust: S.exhaust,
    /** pose: x y z yaw (rotY) pitchUp roll; steer in -1..1 (+ = left); roll the wheels by `spin` radians since the last call; brake / boost / lights 0..1 */
    set(p) {
      root.position.set(p.x, p.y, p.z); root.rotation.set(-p.pitch * 1.25, p.yaw, p.roll * 1.3);       // soft old springs: the body leans more than the coupe
      const del = p.steerAngle, sp = p.spin;
      for (const w of wheels) { if (w.front) w.pivot.rotation.y = del; w.mesh.rotation.x += sp; }
      steerWheel.rotation.z = -p.steer * 2.6;
      if (inside) cockpit.update({ steer: p.steer, kmh: p.kmh || 0, rpm: p.rpm ?? 0.15, gear: p.gear || 'N', night: night ? night.value : 0 });
      const n = night ? night.value : 0;
      headMat.color.setScalar(p.lights ? 0.9 + 1.3 * n : 0.82);
      const br = p.brake > 0.05 ? 2.0 + 0.5 * n : 0.40 + 0.8 * n;
      tailMat.color.set(Math.min(2.6, br), Math.min(2.6, br) * 0.1, Math.min(2.6, br) * 0.08);
      beamMat.opacity = p.lights ? Math.min(0.62, 0.8 * n) : 0; beam.visible = beamMat.opacity > 0.01;
      flameK += ((p.boost > 0.05 ? 1 : 0) - flameK) * Math.min(1, (p.dt || 0.016) * 9);
      const tt = performance.now() / 1000, wob = 1 + 0.18 * Math.sin(tt * 47) + 0.10 * Math.sin(tt * 31 + 1.3);
      const fl = flames[0]; fl.visible = flameK > 0.05; fl.scale.set(0.5 + 0.5 * flameK, 0.5 + 0.5 * flameK, (0.04 + 0.26 * flameK) * wob);     // 30 cm at most
    },
    /** camera mode 2 (cockpit): the exterior shell, glass, lamps, plates and the exterior wheel are replaced by the cockpit set */
    setView(v) {
      inside = !!v; driver.visible = !inside;
      for (const o of outer) o.visible = !inside;
      cockpit.setVisible(inside);
    },
  };
  return api;
}
