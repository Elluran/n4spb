// cars/cybertruck/interior.js - the driver's view of the taxi Cybertruck (camera mode 2): a SEPARATE cheap mesh set shown only while model.setView(true), like drive/cockpit.js does for the coupe.
// Based on the Commons photos "Both Doors Open" / "Hands on the Tesla Cybertruck" (docs/research/cybertruck-2026.md): a very low, thin dash that rises toward the windscreen base,
// ONE wide landscape screen in the middle (it carries the speed, there is NO instrument cluster behind the wheel), a round wheel (the real one is a yoke; the brief asks for a round one),
// big triangular side mirrors at the A-pillar bases, slim A pillars, a long flat bonnet that barely shows, grey seats, door cards.
// Draw calls: shell (1 vertex-colour mesh, ~1.5 k triangles) + the steering wheel (its own mesh, it turns; the exterior model uses the very same mesh) + the screen (1 textured quad, self-lit).
// Frame: car frame (+Z forward, +X left); the driver sits at x = +0.37, the eye at EYE (SPEC_TRUCK.eye).
// Z-FIGHTING: every part keeps >= 1.5 cm from the faces of its neighbours; the screen stands 2.5 cm in front of its bezel.
import * as THREE from 'three';
import { VB } from '../../../traffic/vb.js';
import { extrudeZY, hullGeo, sym, CAB, sideHW, roofY, roofHW, glassY, beltY, MIRROR } from './geo.js';

const DASH = '#3b414b', DASH_TOP = '#4a515c', CARD = '#4d5460', TRIMC = '#2b2f36', LINER = '#8a919e', SEAT = '#3a4049', SEAT_HI = '#4a515c', FLOOR = '#2c3037', GLASS_M = '#b9d2e4', BLK = '#15171a', VENT = '#23272d';
export const WHEEL = { x: 0.37, y: 1.06, z: 0.98, R: 0.18, tilt: 0.42 };
const SCR = { x: 0.0, y: 1.19, z: 1.31, w: 0.46, h: 0.276, yaw: 0.36, tilt: -0.30 };

/** the screen: dark UI with the speed (big), the power bar (the tacho value) and the gear row P R N D; redrawn only when a shown value changes, at most 30 times a second */
function createScreenTexture() {
  const W = 640, H = 384, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), base = document.createElement('canvas'); base.width = W; base.height = H;
  const b = base.getContext('2d'), FONT = '"Rubik", "Noto Sans", Arial, sans-serif';
  b.fillStyle = '#0a0d12'; b.fillRect(0, 0, W, H);
  b.fillStyle = '#121821'; b.fillRect(14, 14, 392, H - 28);
  b.fillStyle = '#0e131a'; b.fillRect(418, 14, W - 432, H - 28);
  b.fillStyle = '#7e8896'; b.font = `700 34px ${FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle';
  b.fillText('км/ч', 210, 262);
  b.fillStyle = '#26303d'; b.fillRect(46, 316, 328, 22);
  // the car seen from above (right pane): body, cabin, four wheels
  b.fillStyle = '#c9cfd8'; b.beginPath(); b.roundRect(484, 62, 82, 190, 12); b.fill();
  b.fillStyle = '#6c7683'; b.fillRect(494, 100, 62, 72);
  b.fillStyle = '#2c333d'; for (const [x, y] of [[470, 84], [566, 84], [470, 190], [566, 190]]) b.fillRect(x, y, 14, 42);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  let lk = -1, lr = -1, lg = '', lt = -1e9;
  const GEARS = ['P', 'R', 'N', 'D'];
  return {
    tex,
    update(kmh, rpm, gear) {
      const k = Math.round(kmh), r = Math.round(rpm * 48), gl = gear === 'R' ? 'R' : gear === 'N' ? 'N' : 'D';
      if (k === lk && r === lr && gl === lg) return;
      const now = performance.now(); if (now - lt < 30) return;
      lt = now; lk = k; lr = r; lg = gl;
      g.drawImage(base, 0, 0);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#f4f7fa'; g.font = `900 168px ${FONT}`; g.fillText(String(k), 210, 138);
      const f = Math.max(0, Math.min(1, (rpm - 0.12) / 0.9));
      g.fillStyle = f > 0.85 ? '#ff6a3c' : '#4fd08a'; g.fillRect(46, 316, 328 * f, 22);
      g.font = `800 40px ${FONT}`;
      for (let i = 0; i < 4; i++) { const on = GEARS[i] === gl; g.fillStyle = on ? '#ffd23a' : '#4b5562'; g.fillText(GEARS[i], 450 + i * 56 - 12 + 22 * (i > 1 ? 0 : 0), 296); }
      tex.needsUpdate = true;
    },
  };
}

/** build the cockpit: returns { group (shell + screen, hidden until setVisible(true)), wheel (the steering-wheel group: the exterior model shows it too), setVisible(b), update(p) }; `paint` is the body colour of the bonnet */
export function createTruckCockpit(ctx, S, paint) {
  const { mat } = ctx, V = new VB(0), cx = S.eye.x;

  // ---- bonnet (the exterior shows it from outside; from inside it is a flat strip under the horizon) + the light-bar edge at its lip
  V.add(hullGeo(sym([[1.0, 1.205, 1.93], [1.0, 1.045, 2.62], [1.0, 0.86, 1.93], [1.0, 0.86, 2.62]])), paint);
  V.box(1.94, 0.02, 0.025, '#dfe7f4', [0, 1.046, 2.62]);

  // ---- dash: a thin wedge rising from the driver's lip toward the windscreen base; vent line on its face; the screen housing stands on it
  const dashPts = [[1.00, 0.55], [1.00, 0.965], [1.14, 0.995], [1.55, 1.07], [1.93, 1.20], [1.93, 0.55]];
  V.add(extrudeZY(dashPts, -0.95, 1.9), DASH, null, (p, c, n) => { if (n.y > 0.6) c.set(DASH_TOP); else if (n.z < -0.4) c.multiplyScalar(0.84); });
  V.box(1.70, 0.026, 0.022, VENT, [0, 0.905, 0.989]);
  V.box(1.70, 0.012, 0.022, '#6a7380', [0, 0.935, 0.989]);
  const sc = new THREE.Euler(SCR.tilt, Math.PI - SCR.yaw, 0, 'YXZ');
  // the bezel shares the screen's YXZ orientation (VB.rbox rotates in XYZ order, so go through a pushed matrix); it sits 3 cm behind the self-lit quad
  V.push(new THREE.Matrix4().compose(new THREE.Vector3(SCR.x, SCR.y, SCR.z), new THREE.Quaternion().setFromEuler(sc), new THREE.Vector3(1, 1, 1)));
  V.rbox(SCR.w + 0.03, SCR.h + 0.03, 0.04, 0.012, BLK, [0, 0, -0.03], null, 1);
  V.pop();
  V.box(0.10, 0.12, 0.05, TRIMC, [SCR.x, SCR.y - 0.17, SCR.z + 0.035]);
  V.box(1.62, 0.012, 0.09, '#101216', [0, glassY(1.84) + 0.012, 1.84], [0.347, 0, 0]);                 // the dark frit band along the windscreen base
  // steering column + knee cover
  V.rod([WHEEL.x, WHEEL.y - 0.02, WHEEL.z + 0.03], [WHEEL.x, WHEEL.y - 0.16, WHEEL.z + 0.20], 0.045, TRIMC, 8);
  V.rbox(0.40, 0.22, 0.05, 0.02, TRIMC, [cx, 0.70, 1.03], [0.2, 0, 0], 1);

  // ---- A pillars (slim, black), roof header, rear-view mirror at the glass, wiper at rest
  const A = CAB.A, B = CAB.B;
  for (const sd of [-1, 1]) {
    V.rod([sd * 0.985, A[1] - 0.005, A[0] - 0.01], [sd * (B[2] - 0.005), B[1] - 0.02, B[0] + 0.01], 0.030, '#202328', 6);
    V.rod([sd * (B[2] - 0.005), B[1] - 0.03, B[0] + 0.02], [sd * (CAB.C[2] - 0.01), CAB.C[1] - 0.04, CAB.C[0] + 0.03], 0.026, '#202328', 6);          // roof rail
  }
  V.box(1.56, 0.04, 0.07, '#202328', [0, B[1] - 0.04, B[0] + 0.06], [0.11, 0, 0]);                      // windscreen header
  V.rbox(0.20, 0.06, 0.04, 0.014, TRIMC, [0.0, 1.64, 0.50], [0, -0.30, 0], 1);
  V.box(0.17, 0.038, 0.012, GLASS_M, [0.01, 1.64, 0.478], [0, -0.30, 0]);
  V.rod([0.0, 1.71, 0.55], [0.0, 1.67, 0.51], 0.011, TRIMC, 5);
  V.rod([-0.88, glassY(1.86) + 0.03, 1.86], [0.40, glassY(1.86) + 0.03, 1.86], 0.012, BLK, 5);

  // ---- doors: card, top rail (follows the belt line), B pillar, C pillar, armrests, mirrors
  for (const sd of [-1, 1]) {
    V.bar([sd * 0.945, 0.62, 1.60], [sd * 0.945, 0.62, -0.92], 0.06, 0.55, CARD);                       // door card: a tall thin slab along the car (w across x, t = height)
    V.bar([sd * 0.972, beltY(1.9) - 0.018, 1.88], [sd * 0.972, beltY(-0.92) - 0.018, -0.92], 0.07, 0.05, TRIMC);   // door top rail, follows the belt line
    V.rbox(0.08, 0.04, 0.50, 0.015, SEAT_HI, [sd * 0.90, 1.04, 0.35], null, 1);                          // armrest
    V.box(0.05, 0.52, 0.09, TRIMC, [sd * (sideHW(1.00, 0.07) - 0.04), 1.00, 0.06]);                        // B pillar (the plane leans inward)
    V.add(hullGeo(MIRROR.map((p) => [sd * p[0], p[1], p[2]])), BLK);                                       // the big wedge mirror at the A-pillar base
    V.box(0.14, 0.095, 0.012, GLASS_M, [sd * 1.155, 1.385, 1.045]);                                        // its glass, facing the driver
  }

  // ---- floor, centre console, seats, rear bench, rear wall (what shows when the head turns)
  V.box(1.84, 0.04, 3.2, FLOOR, [0, 0.50, 0.15]);
  V.rbox(0.24, 0.30, 1.30, 0.03, DASH, [0, 0.70, 0.40], null, 1);
  V.rbox(0.22, 0.05, 0.50, 0.02, SEAT, [0, 0.87, 0.10], null, 1);
  for (const sd of [-1, 1]) {
    const x = sd * 0.37;
    V.rbox(0.50, 0.13, 0.52, 0.04, SEAT, [x, 0.63, 0.30], null, 1);
    V.rbox(0.50, 0.62, 0.13, 0.05, SEAT, [x, 1.00, -0.04], [-0.18, 0, 0], 1);
    V.rbox(0.30, 0.20, 0.10, 0.04, SEAT_HI, [x, 1.42, -0.12], [-0.18, 0, 0], 1);
  }
  V.rbox(1.60, 0.13, 0.54, 0.04, SEAT, [0, 0.63, -0.60], null, 1);
  V.rbox(1.60, 0.60, 0.13, 0.05, SEAT, [0, 0.98, -0.88], [-0.15, 0, 0], 1);
  V.box(1.84, 0.88, 0.05, FLOOR, [0, 0.98, -0.93]);
  // roof liner (what shows when looking up and back): a thin hull under the roof plane from the peak to the rear corner
  const z0 = 0.30, z1 = -0.93, yl = (z) => roofY(z) - 0.06, hl = (z) => roofHW(z) - 0.03;
  V.add(hullGeo(sym([[hl(z0), yl(z0) - 0.012, z0], [hl(z1), yl(z1) - 0.012, z1], [hl(z0), yl(z0) + 0.012, z0], [hl(z1), yl(z1) + 0.012, z1], [0, yl(z0) - 0.012, z0], [0, yl(z1) - 0.012, z1], [0, yl(z0) + 0.012, z0], [0, yl(z1) + 0.012, z1]])), LINER);

  const shellMat = mat.toon('#ffffff', { vertexColors: true, paint: 0.02, emissive: '#2c3a4c', emissiveIntensity: 0, name: 'drive-truck-cockpit' });
  const shell = new THREE.Mesh(V.build(), shellMat);
  shell.name = 'drive-truck-cockpit'; shell.castShadow = true; shell.receiveShadow = true; shell.frustumCulled = false;

  // ---- steering wheel (round; rim, hub, three spokes); turns with the steering. The exterior model shows the same mesh through the windows.
  const WV = new VB(0), r0 = WHEEL.R;
  WV.torus(r0, 0.019, BLK, [0, 0, 0], [0, 0, 0], 6, 24);
  WV.cyl(0.055, 0.055, 0.045, '#262a31', [0, 0, 0.012], [Math.PI / 2, 0, 0], 14);
  for (const sd of [-1, 1]) WV.box(r0 - 0.04, 0.028, 0.022, '#1d2127', [sd * (r0 / 2 + 0.018), 0, 0]);
  WV.box(0.05, 0.11, 0.022, '#1d2127', [0, -0.07, 0]);
  const wheel = new THREE.Mesh(WV.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0, name: 'drive-steer' }));
  wheel.name = 'drive-truck-wheel'; wheel.frustumCulled = false; wheel.castShadow = false;
  const wheelG = new THREE.Group(); wheelG.name = 'drive-truck-wheelg'; wheelG.rotation.order = 'YXZ'; wheelG.position.set(WHEEL.x, WHEEL.y, WHEEL.z); wheelG.rotation.set(-WHEEL.tilt, Math.PI, 0);
  wheelG.add(wheel);

  // ---- the screen: one self-lit quad in front of its bezel
  const scr = createScreenTexture();
  const scrMat = new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false, name: 'drive-truck-screen' });
  const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), scrMat);
  scrMesh.rotation.order = 'YXZ'; scrMesh.rotation.set(SCR.tilt, Math.PI - SCR.yaw, 0); scrMesh.position.set(SCR.x, SCR.y, SCR.z);
  scrMesh.name = 'drive-truck-screen'; scrMesh.frustumCulled = false;
  ctx.noOutline(scrMesh);

  const group = new THREE.Group(); group.name = 'drive-truck-cockpit-set';
  group.add(shell, scrMesh); group.visible = false;
  return {
    group, shell, wheel: wheelG, screen: scrMesh,
    setVisible(on) { group.visible = on; },
    /** p: { steer (+ = left), kmh, rpm, gear (string), night 0..1 } */
    update(p) {
      if (!group.visible) return;
      scr.update(p.kmh, p.rpm, p.gear);
      const n = p.night || 0;
      scrMat.color.setScalar(0.85 + 0.75 * n);
      shellMat.emissiveIntensity = 0.30 - 0.12 * n;
    },
  };
}
