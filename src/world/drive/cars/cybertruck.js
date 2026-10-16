// drive/cars/cybertruck.js - the drivable TAXI CYBERTRUCK: an angular stainless-steel-style electric pickup in the livery of an ordinary taxi of this scene
// (taxi yellow body, black-and-white checker band along the doors, a roof lamp with the word ТАКСИ; NO company logo, NO badge, no beacon, no siren).
// It is a sibling of drive/model.js (the red coupe): the same car frame (forward +Z, origin on the ground midway between the axles, +X = the car's LEFT), the same model API
// (root, wheels, steerWheel, driver, flames, glow, headMat, tailMat, body, glass, cockpit, set(p), setView(inside)), built with the traffic module's vertex-colour builder.
// SHAPE (docs/research/cybertruck-2026.md, Commons photos "2024 Tesla Cybertruck Foundation Series IMG 0629" side, "front 9.7.24", "rear 9.7.24", "front left / rear left (Greenwich)", "Both Doors Open"):
//   5.68 m long, 2.03 m wide (mirrors excluded), 1.80 m high, wheelbase 3.80 m; a flat-faced wedge made of PLANES only: vertical front slab with a full-width light bar on its top lip, a short flat bonnet
//   (15 deg), ONE steep windscreen (20 deg) from the cowl to the roof peak above the B pillar, a flat roof falling 6 deg into the covered bed (black cover), a vertical tailgate slab with a full-width
//   tail-light bar; flat doors that lean inward above the belt; big black angular wheel-arch cladding, a black rocker panel, black front and rear bumpers; 20-inch wheels with flat aero covers on 0.86 m tyres.
//   The side silhouette: nose lip 1.04 m, bonnet rises to the cowl 1.21 m, windscreen to the peak 1.80 m at z = +0.32, roof down to 1.66 m at the cab rear, bed top 1.60 m -> 1.37 m at the tail.
// DRAW CALLS: exterior 13 (body, glass, head lamps, tail lamps, roof lamp, driver, steering wheel, 4 wheels, 2 plates) + glow + head-lamp pool; interior (mode 2): shell, wheel (shared), screen.
// TRIANGLES: see tools/drive-truck-shots.mjs (printed with every shot). Materials are shared ('drive-body', 'drive-wheel', 'drive-steer' toons are the coupe's own cache entries).
// Z-FIGHTING: non-decal parts keep >= 2 cm from the surface they sit next to; the livery band / checker squares are 2.0 / 3.2 cm proud (the doors are flat, the camera is >= 2 m away).
// LIVERY: opts.livery 'yellow' (default, the classic taxi) or 'white' (the scene's Saint Petersburg fleet colour: white body, yellow band).
import * as THREE from 'three';
import { VB } from '../../traffic/vb.js';
import { TYRE, insetPoly } from '../../traffic/mk.js';
import { hullGeo, sym, extrudeZY, CAB, roofY, roofHW, sideHW, MIRROR } from './cybertruck/geo.js';
import { createTruckCockpit } from './cybertruck/interior.js';
import { plateTexture, roofLampTexture, glowTexture, beamTexture } from './cybertruck/textures.js';

export const SPEC_TRUCK = {
  W: 2.03, R: 0.43, tw: 0.285, track: 1.76, yb: 0.40, wb: 3.80, front: 2.63, rear: -3.05,
  hn: 1.04, hh: 1.21, zc: 1.95, hb: 1.30, zt: -0.95, ht: 1.60, H: 1.80, zr0: 0.32, zr1: -0.95, taper: [0, 0],
  hgt: 1.80, len: 5.68, centerZ: -0.21,
  eye: { x: 0.37, y: 1.44, z: 0.55 }, fovRest: 72, mass: 3100,
};
/** what the handling should do with this car, relative to the coupe (mass 1350 kg, ACC 15.5, BRAKE 30, VMAX 48 m/s): heavier and a bit slower; a suggestion for the registry owner */
export const TUNE_TRUCK = { mass: 3100, acc: 12.2, brake: 25, vmax: 42, nitroVmax: 1.28, nitroAcc: 1.6, steerIn: 4.8, steerOut: 8.5, maxLat: 19, bodyRoll: 1.6, bodyPitch: 1.5, impactMass: 3100 / 1350 };

const YELLOW = '#f6c200', WHITE = '#f2f1ec', BAND_W = '#f4f4f0', BLACK = '#17191d', CLAD = '#1c1e22', UNDER = '#23262b', LINING = '#17191d', CABIN = '#1b2027', INT = '#1a1f25', PILLAR = '#1d2025';
const HW = 1.015, ZF = 2.58, ZR = -2.99, AX = 1.90;           // body half width, the slab faces (the bumpers add 5 cm at the front / 6 cm at the back), the axles at +-AX
const ARCH = [[-0.64, 0.40], [-0.64, 0.52], [-0.30, 0.96], [0.30, 0.96], [0.64, 0.52], [0.64, 0.40]];       // the wheel opening, relative to the axle: (dz, y)
const bedY = (z) => 1.60 + (z + 0.95) * 0.1127;               // the bed top / cover plane

export function createTruckModel(ctx, { livery = 'yellow', plate = ['Т 250 ТТ', '178'] } = {}) {
  const { mat } = ctx, S = SPEC_TRUCK, R = S.R, tw = S.tw;
  const PAINT = livery === 'white' ? WHITE : YELLOW, BAND = livery === 'white' ? YELLOW : BAND_W;
  const V = new VB(0), G = new VB(0), LH = new VB(0), LT = new VB(0), DR = new VB(0);

  // ================================================================================== body: the side profile extruded straight (flat doors), arches cut in
  const prof = [[ZF - 0.01, 0.60], [ZF, 1.04], [1.95, 1.21], [-0.95, 1.30], [-0.95, 1.60], [ZR, 1.37], [ZR, 0.60], [ZR + 0.25, 0.40]];
  for (const za of [-AX, AX]) for (const [dz, y] of ARCH) prof.push([za + dz, y]);
  prof.push([ZF - 0.03, 0.40]);
  const tintBody = (p, c, n, info) => {
    if (n.y < -0.7) { c.set(UNDER); info.kind = 0; return; }                                                 // underside + the flat roof of every wheel opening
    if (Math.abs(n.x) < 0.5) for (const za of [-AX, AX]) if (Math.abs(p.z - za) < 0.70 && p.y < 1.0 && p.y > 0.39) { c.set(LINING); info.kind = 0; return; }   // the arch lining
    if (n.y > 0.998 && p.z < 1.96 && p.z > -0.96 && p.y < 1.4) { c.set(CABIN); info.kind = 0; }              // the belt plane inside the cab (slope 1.8 deg; the bonnet is 15 deg, the bed 6 deg): the dark cabin floor seen through the glass
  };
  V.add(extrudeZY(prof, -HW, 2 * HW), PAINT, null, tintBody);

  // ---- cladding: the black angular flares around the four wheel openings (a U-shaped polygon, 7.5 cm proud), the rocker panel, the dark wheel wells
  const open = ARCH.map((p) => [p[0], p[1]]), grown = insetPoly(open, -0.125);
  const ring = grown.concat(open.slice().reverse());
  for (const za of [-AX, AX]) for (const sd of [-1, 1]) {
    const g = extrudeZY(ring.map((p) => [p[0] + za, p[1]]), sd > 0 ? HW - 0.01 : -HW - 0.065, 0.075);
    V.add(g, CLAD);
  }
  for (const za of [-AX, AX]) V.box(1.32, 0.60, 1.30, '#101113', [0, 0.70, za]);                              // the dark wheel house between the two tyres (closes the see-through tunnel of the arch cut-outs)
  V.box(2 * HW - 0.04, 0.15, 2.26, UNDER, [0, 0.325, 0]);                                                      // underbody between the arches
  for (const sd of [-1, 1]) V.box(0.05, 0.16, 2.26, BLACK, [sd * (HW + 0.01), 0.335, 0]);                      // rocker cover, black
  V.box(2.06, 0.315, 0.33, BLACK, [0, 0.4375, 2.465]);                                                            // front bumper
  V.box(1.40, 0.07, 0.30, UNDER, [0, 0.26, 2.40]);                                                             // chin / skid
  V.box(1.34, 0.11, 0.03, '#0b0c0e', [0, 0.40, 2.645]);                                                        // grille slot
  V.box(2.06, 0.35, 0.25, BLACK, [0, 0.445, -2.925]);                                                          // rear bumper
  V.box(1.50, 0.07, 0.24, UNDER, [0, 0.26, -2.80]);

  // ---- bed: the black tonneau cover (a flat slab 3 cm above the steel rails, along the roofline), the black band over the tailgate (the tail-lamp housing)
  const hb = 0.88, zb0 = -0.99, zb1 = ZR + 0.03;
  V.add(hullGeo(sym([[hb, bedY(zb0), zb0], [hb, bedY(zb0) + 0.03, zb0], [hb, bedY(zb1), zb1], [hb, bedY(zb1) + 0.03, zb1]])), '#1a1c20');
  V.box(2.0, 0.18, 0.025, BLACK, [0, 1.275, ZR - 0.0125]);
  V.box(2.0, 0.05, 0.025, UNDER, [0, 0.62, ZR - 0.0125]);

  // ---- the cab: roof slab (paint), pillars (black), glass volume, dark cabin shell + seats
  const zr0 = 0.34, zr1 = -0.97;
  V.add(hullGeo(sym([[roofHW(zr0) + 0.012, roofY(zr0) - 0.045, zr0], [roofHW(zr0) + 0.012, roofY(zr0), zr0], [roofHW(zr1) + 0.012, roofY(zr1) - 0.045, zr1], [roofHW(zr1) + 0.012, roofY(zr1), zr1]])), PAINT);
  const A = CAB.A, B = CAB.B, C = CAB.C, D = CAB.D;
  for (const sd of [-1, 1]) {
    V.rod([sd * (A[2] - 0.004), A[1] + 0.0, A[0] - 0.01], [sd * (B[2] - 0.002), B[1] - 0.02, B[0] + 0.02], 0.034, PILLAR, 6);            // A pillar
    V.rod([sd * (D[2] - 0.004), D[1] + 0.0, D[0] + 0.02], [sd * (C[2] - 0.002), C[1] - 0.03, C[0] + 0.02], 0.034, PILLAR, 6);            // C pillar
    V.rod([sd * (A[2] - 0.004), A[1] + 0.0, A[0] - 0.01], [sd * (D[2] - 0.004), D[1] + 0.0, D[0] + 0.02], 0.026, PILLAR, 6);            // belt line
    V.rod([sd * (sideHW(1.27, 0.07) + 0.002), 1.27, 0.07], [sd * (sideHW(1.76, 0.07) + 0.002), 1.76, 0.07], 0.030, PILLAR, 6);          // B pillar
    V.box(0.012, 0.80, 0.014, '#8a6e00', [sd * (HW + 0.0075), 0.84, 1.24]);                                                              // door seams (front door front / its rear = B pillar line / rear door rear)
    V.box(0.012, 0.80, 0.014, '#8a6e00', [sd * (HW + 0.0075), 0.84, 0.07]);
    V.box(0.012, 0.80, 0.014, '#8a6e00', [sd * (HW + 0.0075), 0.84, -1.00]);
    V.box(0.02, 0.035, 0.20, BLACK, [sd * (HW + 0.012), 1.10, 0.22]);                                                                     // door handles (flush)
    V.box(0.02, 0.035, 0.20, BLACK, [sd * (HW + 0.012), 1.10, -0.28]);
    V.add(hullGeo(MIRROR.map((p) => [sd * p[0], p[1], p[2]])), BLACK);                                                                    // the wedge mirror
  }
  V.rod([-0.88, 1.263, 1.855], [0.40, 1.263, 1.855], 0.012, BLACK, 5);                                                                  // the wiper at rest along the windscreen base
  // glass volume (sunk below the belt) and the dark shell inside it
  const gz0 = 1.945, gz1 = -0.93;
  const gpts = sym([[0.99, 1.212, gz0], [0.99, 1.10, gz0], [0.80, 1.785, 0.33], [0.86, 1.64, gz1], [0.99, 1.30, gz1], [0.99, 1.10, gz1]]);
  G.add(hullGeo(gpts), '#ffffff');
  const ipts = sym([[0.90, 1.20, 1.85], [0.90, 1.00, 1.85], [0.72, 1.70, 0.36], [0.78, 1.58, -0.86], [0.90, 1.28, -0.86], [0.90, 1.00, -0.86]]);
  V.add(hullGeo(ipts), INT, new THREE.Matrix4().makeScale(-1, 1, 1));                                    // inside-out: its faces look into the cabin
  for (const sd of [-1, 1]) {                                                                              // what shows above the belt: the front seat backs + head restraints, the rear bench back
    const x = sd * 0.37;
    V.rbox(0.50, 0.62, 0.13, 0.05, '#2b3036', [x, 1.00, -0.04], [-0.18, 0, 0], 1);
    V.rbox(0.30, 0.20, 0.10, 0.04, '#343a42', [x, 1.42, -0.12], [-0.18, 0, 0], 1);
  }
  V.rbox(1.60, 0.62, 0.13, 0.05, '#2b3036', [0, 1.00, -0.88], [-0.15, 0, 0], 1);

  // ---- livery: a band along the doors (2 cm proud) with two rows of black checker squares (1.2 cm further)
  const bandY = 0.78, bz0 = -1.22, bz1 = 1.22, cell = 0.088, cols = Math.floor((bz1 - bz0) / cell);
  for (const sd of [-1, 1]) {
    V.box(0.02, 0.19, bz1 - bz0, BAND, [sd * (HW + 0.01), bandY, (bz0 + bz1) / 2]);
    for (let i = 0; i < cols; i++) for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) V.box(0.012, cell, cell, BLACK, [sd * (HW + 0.026), bandY + (j ? -1 : 1) * cell / 2, bz0 + (i + 0.5) * cell]);
  }

  // ================================================================================== lamps (emissive): light bars + lower head lamps (white), tail bar + corner lenses (red)
  LH.box(1.96, 0.036, 0.03, '#ffffff', [0, 1.003, ZF + 0.015]);                     // the full-width bar on the top lip of the front slab
  for (const sd of [-1, 1]) {
    LH.box(0.52, 0.034, 0.03, '#ffffff', [sd * 0.62, 0.665, ZF + 0.015]);           // lower head lamps at the bottom of the slab
    V.box(0.56, 0.05, 0.03, '#0f1114', [sd * 0.62, 0.665, ZF + 0.008]);               // their dark housings
    LT.box(0.20, 0.04, 0.03, '#ffffff', [sd * 0.88, 0.665, ZR - 0.012]);            // small red lenses under the tail band
  }
  LT.box(1.94, 0.04, 0.03, '#ffffff', [0, 1.285, ZR - 0.03]);                       // the full-width tail bar in its black band

  // ================================================================================== driver: upper body behind the wheel (hidden in the cockpit view)
  const jacket = '#2b3a67';
  DR.box(0.44, 0.52, 0.26, jacket, [0.37, 1.06, 0.20]);
  for (const sd of [-1, 1]) DR.rod([0.37 + sd * 0.22, 1.28, 0.22], [0.37 + sd * 0.17, 1.12, 0.84], 0.055, jacket, 6);
  DR.sph(0.115, '#e8b894', [0.37, 1.47, 0.26], 8);
  DR.sph(0.125, '#3a2a22', [0.37, 1.50, 0.22], 8, [1, 0.8, 1]);

  // ---- wheels: 0.86 m all-terrain tyres, flat dark aero covers with spokes (the rolling marker), tread lugs on the shoulder. Rim detail on +X; the right side is mirrored.
  const WV = new VB(0);
  WV.cyl(R, R, tw, TYRE, [0, 0, 0], [0, 0, Math.PI / 2], 24);
  WV.cyl(R * 0.82, R * 0.82, tw + 0.014, '#2a2c31', [0, 0, 0], [0, 0, Math.PI / 2], 24);                    // sidewall
  WV.cyl(R * 0.62, R * 0.62, tw + 0.026, '#34383f', [0, 0, 0], [0, 0, Math.PI / 2], 18);                    // aero cover
  WV.cyl(R * 0.50, R * 0.50, tw + 0.038, '#24272c', [0, 0, 0], [0, 0, Math.PI / 2], 18);
  for (let k = 0; k < 4; k++) WV.box(0.014, R * 1.10, 0.07, '#565d68', [tw / 2 + 0.021, 0, 0], [k * Math.PI / 4, 0, 0]);
  WV.cyl(0.05, 0.05, tw + 0.07, '#c9ced6', [0, 0, 0], [0, 0, Math.PI / 2], 8);
  for (let k = 0; k < 16; k++) { const a = k * Math.PI * 2 / 16; WV.box(0.028, 0.075, 0.07, '#3a3c42', [tw / 2 - 0.004, Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92], [a, 0, 0]); }
  const wheelGeo = WV.build(), wheelMat = mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'drive-wheel' });

  const zl = -0.30, tilt = Math.atan(0.1102);
  V.box(0.40, 0.03, 0.14, BLACK, [0, roofY(zl) + 0.015, zl], [-tilt, 0, 0]);                                  // the foot of the roof lamp (part of the body mesh: one draw call less)

  // ================================================================================== meshes
  const body = new THREE.Mesh(V.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'drive-body' }));
  body.castShadow = true; body.receiveShadow = true; body.name = 'drive-body';
  const glassBase = mat.glass({ tint: '#0f1a24', opacity: 0.72, streaks: true });
  const glassMat = glassBase.clone();
  glassMat.fragmentShader = glassBase.fragmentShader.replace('0.35 + 0.45 * fres', '0.12 + 0.5 * fres').replace('streak * 0.55', 'streak * 0.36');
  if (ctx.shared.uSkyMid) { glassMat.uniforms.uSkyTop = ctx.shared.uSkyMid; glassMat.uniforms.uSkyLow = ctx.shared.uSkyLow; }
  const glass = new THREE.Mesh(G.build(), glassMat); glass.name = 'drive-glass'; glass.renderOrder = 2;
  const headMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, name: 'drive-head' });
  const tailMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, name: 'drive-tail' });
  const lampH = new THREE.Mesh(LH.build(), headMat), lampT = new THREE.Mesh(LT.build(), tailMat);
  headMat.color.setScalar(0.9); tailMat.color.set(0.55, 0.05, 0.05);
  const driver = new THREE.Mesh(DR.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'drive-driver' }));

  const root = new THREE.Group(); root.name = 'drive-car'; root.rotation.order = 'YXZ';
  root.add(body, glass, lampH, lampT, driver);

  // ---- the roof lamp: a white-amber lit box with ТАКСИ on its two long faces, on a black foot; it follows the roof plane (6.3 deg)
  const lampGeo = new THREE.BoxGeometry(0.58, 0.13, 0.22), uv = lampGeo.attributes.uv;
  for (let i = 0; i < 16; i++) uv.setXY(i, 0.03, 0.5);                         // +-x, +-y faces: the plain strip of the texture
  const roofMat = new THREE.MeshBasicMaterial({ map: roofLampTexture(), toneMapped: false, name: 'drive-truck-roof-lamp' });
  const roofLamp = new THREE.Mesh(lampGeo, roofMat); roofLamp.name = 'drive-truck-roof-lamp';
  roofLamp.position.set(0, roofY(zl) + 0.03 + 0.065, zl); roofLamp.rotation.set(-tilt, 0, 0);
  root.add(roofLamp);

  // ---- the cockpit set for camera mode 2 (interior.js): hidden until setView(true)
  const cockpit = createTruckCockpit(ctx, S, PAINT);
  root.add(cockpit.group);
  const steerWheel = cockpit.wheel; root.add(steerWheel);                        // the very same mesh is the exterior steering wheel, seen through the glass

  // ---- wheels: pivot (steering about Y) -> mesh (rolling about X)
  const wheels = [];
  for (const [sx, z, front] of [[1, S.wb / 2, true], [-1, S.wb / 2, true], [1, -S.wb / 2, false], [-1, -S.wb / 2, false]]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * S.track / 2, R, z);
    const m = new THREE.Mesh(wheelGeo, wheelMat); m.castShadow = true; m.scale.x = sx; m.name = 'drive-wheel';
    pivot.add(m); root.add(pivot); wheels.push({ pivot, mesh: m, front });
  }

  // ---- plates (white Russian plate, region only) on the bumpers
  const plane = (w, h) => new THREE.PlaneGeometry(w, h);
  const plateMat = mat.toon('#ffffff', { map: plateTexture(plate[0], plate[1]), paint: 0, name: 'drive-plate' });
  const pf = new THREE.Mesh(plane(0.52, 0.113), plateMat); pf.position.set(0, 0.53, 2.65); root.add(pf);
  const pr = new THREE.Mesh(plane(0.52, 0.113), plateMat); pr.position.set(0, 0.53, -3.07); pr.rotation.y = Math.PI; root.add(pr);

  // ---- no exhaust flames on an electric truck: two hidden stand-ins keep the API; the boost shows as a cool glow under the rear axle
  const flames = [];
  for (let i = 0; i < 2; i++) { const f = new THREE.Mesh(plane(0.01, 0.01), new THREE.MeshBasicMaterial({ visible: false })); f.visible = false; root.add(f); flames.push(f); }
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(0.45, 0.78, 1.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, name: 'drive-truck-glow' });
  const glow = new THREE.Mesh(plane(3.0, 4.2), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.06, -1.9); root.add(glow); ctx.noOutline(glow);
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, name: 'drive-truck-beam' });
  const beamGeo = new THREE.PlaneGeometry(8.0, 19); beamGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(0, 0.05, S.front + 9.5); root.add(beam); ctx.noOutline(beam);
  root.traverse((o) => { if (o.isMesh && o !== glow) o.frustumCulled = false; });
  for (const m of [lampH, lampT, driver, roofLamp]) m.castShadow = false;

  const night = ctx.shared.uNight;
  let boostK = 0, inside = false;
  // damage (drive/damage.js) bends only the body mesh: the roof lamp follows the sagging roof (read from the body's bounding box, which damage.sync recomputes) and falls off when it is crushed
  body.geometry.computeBoundingBox();
  const topY = body.geometry.boundingBox.max.y, lampY0 = roofLamp.position.y;
  const outer = [body, glass, lampH, lampT, roofLamp, pf, pr];
  const api = {
    root, wheels, steerWheel, driver, flames, glow, headMat, tailMat, body, glass, cockpit, roofLamp, spec: S,
    /** pose: x y z yaw (rotY) pitchUp roll; steer in -1..1 (+ = left); roll the wheels by `spin` radians since the last call; brake / boost / lights 0..1 */
    set(p) {
      root.position.set(p.x, p.y, p.z); root.rotation.set(-p.pitch, p.yaw, p.roll);
      const del = p.steerAngle, sp = p.spin;
      for (const w of wheels) { if (w.front) w.pivot.rotation.y = del; w.mesh.rotation.x += sp; }
      steerWheel.rotation.z = p.steer * 2.2;
      const n = night ? night.value : 0;
      if (inside) cockpit.update({ steer: p.steer, kmh: p.kmh || 0, rpm: p.rpm ?? 0.15, gear: p.gear || 'N', night: n });
      headMat.color.setScalar(p.lights ? 0.9 + 1.6 * n : 0.55);
      const br = p.brake > 0.05 ? 2.2 + 0.5 * n : 0.45 + 0.9 * n;
      tailMat.color.set(Math.min(2.6, br), Math.min(2.6, br) * 0.1, Math.min(2.6, br) * 0.08);
      roofMat.color.setScalar(0.95 + 0.55 * n);
      const bb = body.geometry.boundingBox, sag = bb ? Math.max(0, topY - bb.max.y) : 0;
      roofLamp.position.y = lampY0 - sag; roofLamp.visible = !inside && sag < 0.17;
      boostK += ((p.boost > 0.05 ? 1 : 0) - boostK) * Math.min(1, (p.dt || 0.016) * 7);
      glowMat.opacity = Math.min(1, (0.10 + 0.35 * n) * (p.glow ?? 1) + 0.75 * boostK);
      beamMat.opacity = p.lights ? Math.min(0.75, 0.9 * n) : 0; beam.visible = beamMat.opacity > 0.01;
    },
    /** camera mode 2 (cockpit): the exterior shell, glass, lamps, roof lamp, plates and the driver are replaced by the cockpit set (interior.js); the wheel mesh stays */
    setView(v) {
      inside = !!v; driver.visible = !inside;
      for (const o of outer) o.visible = !inside;
      cockpit.setVisible(inside);
    },
  };
  return api;
}
