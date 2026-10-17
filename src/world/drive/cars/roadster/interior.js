// cars/roadster/interior.js - the driver's view of the Tesla Roadster (camera mode 2): a SEPARATE cheap mesh set shown only while model.setView(true), like drive/cockpit.js (coupe) and cars/cybertruck/interior.js.
// Based on the official interior renders (docs of the Roadster spec, sec. 3.7; Auto Express "New_Tesla_Roadster-5" + the yoke / seats / track-mode-screen details):
// a low flat dash in dark microsuede with a carbon herringbone edge, ONE angled landscape screen (black + red UI, it carries the speed: there is NO cluster behind the yoke),
// a SQUARE YOKE (two white grips, a black hub bar, bronze spokes), two deep white buckets with grey suede bolsters, hex head restraints and a tall white tunnel between them,
// door cards with a red ambient strip, a dark headliner with a central spar and a camera pod at the windscreen top, a carbon wall behind the seats.
// Draw calls: shell (1 vertex-colour mesh, ~2.7 k triangles) + the yoke (its own mesh, it turns; the exterior model shows the very same mesh) + the red ambient strip (1 emissive mesh) + the screen (1 textured quad, self-lit).
// Frame: car frame (+Z forward, +X left); the driver sits at x = +0.36, the eye at SPEC_ROADSTER.eye (0.36, 0.93, 0.20).
// There is NO window glass in this view (the bronze arrowhead of the exterior is hidden): a real windscreen is almost invisible from inside.
// Z-FIGHTING: every part keeps >= 1.5 cm from the faces of its neighbours; the screen stands 2.5 cm in front of its bezel.
import * as THREE from 'three';
import { VB } from '../../../traffic/vb.js';
import { hullGeo, sym, extrudeZY, glassHW, roofY, beltY, sideX } from './geo.js';

const SUEDE = '#090C13', SUEDE2 = '#0C1018', CARBON = '#0E1014', POCKET = '#030406', HERRING = '#2A2D36', FRIT = '#050609';
const SEAT = '#E6E6EA', BOLSTER = '#5C5E6A', PANEL = '#6A6C78', INLAY = '#8D8F9A', GRIP = '#9A9BA4', HUB = '#1A1F27', PAD = '#2A303A', BRONZE = '#8C6B4A', TRAY = '#0B0D12', EDGE = '#9A9BA4', TRIM = '#4B4E59';
/** the yoke: centre of the hub bar, tilted with its top toward the driver (the exterior driver's hands rest on the grips at ~ (0.36 +- 0.16, 0.70, 0.76)) */
export const YOKE = { x: 0.36, y: 0.72, z: 0.78, tilt: 0.40 };
const SCR = { x: 0.02, y: 0.835, z: 0.98, w: 0.38, h: 0.23, yaw: 0.35, tilt: -0.25 };
const DASH_Z0 = 0.50, DASH_Z1 = 1.42, DASH_Y0 = 0.57, DASH_Y1 = 0.80, DASH_HW = 0.90, BULK = -0.75;
const dashY = (z) => DASH_Y0 + (DASH_Y1 - DASH_Y0) * (z - DASH_Z0) / (DASH_Z1 - DASH_Z0);
const DASH_TILT = -Math.atan2(DASH_Y1 - DASH_Y0, DASH_Z1 - DASH_Z0);        // a box laid on the dash top rises forward (rotation about x: negative = the front edge up)

/** the screen: a black UI with a red accent (the track-mode look): the speed (big, white), the power bar (the tacho value, red), the gear row P R N D (D red), a car from above and a small THRUST bar bound to the tank;
 *  redrawn only when a shown value changes, at most 30 times a second */
function createScreenTexture() {
  const W = 704, H = 426, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), base = document.createElement('canvas'); base.width = W; base.height = H;
  const b = base.getContext('2d'), FONT = '"Rubik", "Noto Sans", Arial, sans-serif';
  b.fillStyle = '#030406'; b.fillRect(0, 0, W, H);
  b.fillStyle = '#0a0c11'; b.fillRect(14, 14, 452, H - 28);
  b.fillStyle = '#07080c'; b.fillRect(478, 14, W - 492, H - 28);
  b.fillStyle = '#ff2038'; b.fillRect(14, 14, 452, 3);                                         // the thin red header line
  b.fillStyle = '#7d818c'; b.font = `700 34px ${FONT}`; b.textAlign = 'center'; b.textBaseline = 'middle';
  b.fillText('км/ч', 240, 262);
  b.fillStyle = '#2a0c12'; b.fillRect(46, 318, 388, 20);                                          // the power bar track
  // the car from above (right pane): a red outline, a dark cabin, four wheels, the four thruster ports at the tail
  b.strokeStyle = '#ff2038'; b.lineWidth = 4; b.beginPath(); b.roundRect(540, 50, 92, 214, 26); b.stroke();
  b.fillStyle = '#1a1d25'; b.beginPath(); b.roundRect(552, 104, 68, 100, 14); b.fill();
  b.fillStyle = '#3a3f4a'; for (const [x, y] of [[526, 74], [632, 74], [526, 196], [632, 196]]) b.fillRect(x, y, 14, 44);
  b.fillStyle = '#ff2038'; for (const x of [560, 576, 592, 608]) b.fillRect(x - 3, 262, 6, 6);
  b.fillStyle = '#9a9ea8'; b.font = `700 22px ${FONT}`; b.fillText('THRUST', 586, 302);
  b.fillStyle = '#2a0c12'; b.fillRect(512, 322, 148, 14);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  let lk = -1, lr = -1, lg = '', lb = -1, lt = -1e9;
  const GEARS = ['P', 'R', 'N', 'D'];
  return {
    tex,
    update(kmh, rpm, gear, tank) {
      const k = Math.round(kmh), r = Math.round(rpm * 48), gl = gear === 'R' ? 'R' : gear === 'N' ? 'N' : 'D', tb = Math.round(tank * 32);
      if (k === lk && r === lr && gl === lg && tb === lb) return;
      const now = performance.now(); if (now - lt < 30) return;
      lt = now; lk = k; lr = r; lg = gl; lb = tb;
      g.drawImage(base, 0, 0);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#f4f6fa'; g.font = `900 176px ${FONT}`; g.fillText(String(k), 240, 142);
      const f = Math.max(0, Math.min(1, (rpm - 0.12) / 0.9));
      g.fillStyle = f > 0.85 ? '#ff7a86' : '#ff2038'; g.fillRect(46, 318, 388 * f, 20);
      g.font = `800 40px ${FONT}`;
      for (let i = 0; i < 4; i++) { g.fillStyle = GEARS[i] === gl ? '#ff2038' : '#4a4d58'; g.fillText(GEARS[i], 230 + i * 52, 384); }
      g.fillStyle = '#ff2038'; g.fillRect(512, 322, 148 * Math.max(0, Math.min(1, tank)), 14);
      tex.needsUpdate = true;
    },
  };
}

/** build the cockpit: returns { group (shell + ambient strip + screen, hidden until setVisible(true)), wheel (the yoke group: the exterior model shows it too), setVisible(b), update(p) }; `paint` is the body colour of the bonnet */
export function createRoadsterCockpit(ctx, S, paint) {
  const { mat } = ctx, V = new VB(0), E = new VB(0), cx = S.eye.x;

  // ---- bonnet (hidden behind the cowl from the eye, but it closes the view when the body pitches) + the thin white rim strip at the cowl
  V.add(hullGeo(sym([[0.45, 0.80, 1.43], [0.60, 0.77, 2.20], [0.62, 0.50, 2.34], [0.45, 0.76, 1.43], [0.60, 0.72, 2.20]])), paint);
  V.box(0.92, 0.012, 0.03, SEAT, [0, DASH_Y1 + 0.020, 1.395]);

  // ---- dash: a low flat suede wedge (13 deg) across the cabin, a carbon herringbone strip along its near edge, a square dark pocket in front of the driver, the glare shade at the cowl
  const rows = [[DASH_Z0, DASH_HW], [0.9, DASH_HW], [DASH_Z1, DASH_HW]], dp = [];
  for (const [z, hw] of rows) dp.push([hw, dashY(z), z], [hw, 0.45, z]);
  V.add(hullGeo(sym(dp)), SUEDE, null, (p, c, n) => { if (n.z < -0.4) c.multiplyScalar(0.8); });
  V.box(1.70, 0.016, 0.05, HERRING, [0, dashY(DASH_Z0 + 0.04) + 0.012, DASH_Z0 + 0.04], [DASH_TILT, 0, 0]);
  V.box(1.70, 0.020, 0.012, HERRING, [0, 0.49, DASH_Z0 - 0.012]);
  V.box(0.36, 0.010, 0.30, POCKET, [cx, dashY(1.12) + 0.014, 1.12], [DASH_TILT, 0, 0]);
  for (const [dx, dz, w, d] of [[-0.19, 0, 0.012, 0.32], [0.19, 0, 0.012, 0.32], [0, -0.16, 0.38, 0.012], [0, 0.16, 0.38, 0.012]]) V.box(w, 0.008, d, TRIM, [cx + dx, dashY(1.12 + dz) + 0.012, 1.12 + dz], [DASH_TILT, 0, 0]);       // the silver rim of the pocket
  V.box(0.50, 0.010, 0.012, TRIM, [-0.30, dashY(DASH_Z0 + 0.12) + 0.014, DASH_Z0 + 0.12], [DASH_TILT, 0, 0]);                      // a slim vent slit by the passenger
  V.box(1.60, 0.012, 0.09, FRIT, [0, dashY(1.36) + 0.012, 1.36], [DASH_TILT, 0, 0]);
  V.box(1.74, 0.20, 0.03, '#0C0E12', [0, 0.34, DASH_Z1 + 0.02]);                                 // the footwell's front wall
  // the yoke column (a dark housing rising out of the dash) and the pedals (two ribbed pads under the dash)
  V.box(0.20, 0.10, 0.20, POCKET, [cx, 0.64, 0.98], [DASH_TILT, 0, 0]);
  V.rod([YOKE.x, YOKE.y - 0.02, YOKE.z + 0.02], [YOKE.x, 0.62, 1.00], 0.034, POCKET, 6);
  for (const x of [0.30, 0.42]) V.box(0.07, 0.14, 0.02, '#202226', [x, 0.30, 1.18], [-0.55, 0, 0]);

  // ---- the screen: a black bezel behind the self-lit quad (it shares the quad's YXZ orientation), one slim stalk to the dash
  const sc = new THREE.Euler(SCR.tilt, Math.PI - SCR.yaw, 0, 'YXZ');
  V.push(new THREE.Matrix4().compose(new THREE.Vector3(SCR.x, SCR.y, SCR.z), new THREE.Quaternion().setFromEuler(sc), new THREE.Vector3(1, 1, 1)));
  V.box(SCR.w + 0.03, SCR.h + 0.03, 0.04, '#05060a', [0, 0, -0.03]);
  V.pop();
  V.box(0.12, 0.10, 0.05, POCKET, [SCR.x - 0.02, SCR.y - 0.145, SCR.z + 0.05], [-0.25, 0, 0]);
  // the black glass tray bridging the yoke column and the console, silver-edged
  V.box(0.15, 0.025, 0.46, TRAY, [0.17, 0.585, 0.72], [-0.20, 0, 0]);
  V.box(0.012, 0.02, 0.46, EDGE, [0.095, 0.585, 0.72], [-0.20, 0, 0]);

  // ---- A pillars (black), the windscreen header with the camera pod, the roof edge panels, rails and the central spar
  const A1 = [0.50, 0.83, 1.41], A2 = [0.76, 1.184, 0.36];
  for (const sd of [-1, 1]) {
    V.rod([sd * (A1[0] - 0.03), A1[1] + 0.005, A1[2] - 0.02], [sd * (A2[0] - 0.045), A2[1] - 0.045, A2[2] - 0.01], 0.028, CARBON, 6);
  }
  V.box(1.50, 0.03, 0.09, SUEDE, [0, 1.145, 0.325], [0.16, 0, 0]);                                // the windscreen header
  V.box(0.20, 0.035, 0.08, '#05060a', [0.0, 1.118, 0.33], [0.16, 0, 0]);               // the camera pod (there is no interior mirror)
  V.box(0.03, 0.012, 0.012, '#1b2a44', [0.0, 1.110, 0.375], [0.16, 0, 0]);
  const RZ = [0.30, -0.10, -0.50, BULK + 0.01], ry = (z) => roofY(z) - 0.072;
  for (const sd of [-1, 1]) {
    const pts = [];
    for (const z of RZ) { const hw = glassHW(z); pts.push([sd * (hw + 0.005), ry(z) + 0.012, z], [sd * (hw + 0.005), ry(z) - 0.012, z], [sd * (hw - 0.15), ry(z) + 0.012, z], [sd * (hw - 0.15), ry(z) - 0.012, z]);}
    V.add(hullGeo(pts), SUEDE);                                                                  // the roof edge panel (the glass between them is open sky)
    for (let i = 0; i < RZ.length - 1; i++) V.rod([sd * (glassHW(RZ[i]) + 0.0), ry(RZ[i]) - 0.01, RZ[i]], [sd * (glassHW(RZ[i + 1]) + 0.0), ry(RZ[i + 1]) - 0.01, RZ[i + 1]], 0.026, CARBON, 6);   // the roof rail
  }
  V.box(0.06, 0.03, 1.10, SUEDE, [0, ry(-0.2) - 0.012, -0.20], [0.09, 0, 0]);                       // the central spar
  V.box(1.56, 0.07, 0.08, SUEDE, [0, ry(BULK) - 0.02, BULK + 0.03]);                              // the rear header over the wall

  // ---- doors: a card that follows the belt line (a dark suede top, a grey lower panel under a red strip), the top rail
  const BZ = [1.40, 1.2, 0.9, 0.2, -0.4, BULK];
  for (const sd of [-1, 1]) {
    const poly = [[1.40, 0.28], ...BZ.map((z) => [z, beltY(z) - 0.02]), [BULK, 0.28]];
    V.add(extrudeZY(poly, sd > 0 ? 0.84 : -0.89, 0.05), SUEDE2);
    V.add(extrudeZY([[0.95, 0.32], [0.95, 0.60], [0.5, 0.595], [0.1, 0.575], [-0.2, 0.55], [-0.55, 0.50], [-0.55, 0.32]], sd > 0 ? 0.828 : -0.84, 0.012), PANEL);
    for (let i = 0; i < BZ.length - 1; i++) V.bar([sd * 0.875, beltY(BZ[i]) - 0.005, BZ[i]], [sd * 0.875, beltY(BZ[i + 1]) - 0.005, BZ[i + 1]], 0.09, 0.045, SUEDE);
    V.box(0.07, 0.035, 0.46, BOLSTER, [sd * 0.80, beltY(0.1) - 0.045, 0.15]);       // armrest
    // the red ambient strip along each door card, curling down at the rear; plus the dots on the headliner and the dash line
    const sp = [[0.95, 0.66], [0.5, 0.655], [0.1, 0.635], [-0.2, 0.60], [-0.5, 0.55]];
    for (let i = 0; i < sp.length - 1; i++) { E.bar([sd * 0.825, sp[i][1], sp[i][0]], [sd * 0.825, sp[i + 1][1], sp[i + 1][0]], 0.012, 0.014, '#ffffff'); E.bar([sd * 0.827, sp[i][1] - 0.012, sp[i][0]], [sd * 0.827, sp[i + 1][1] - 0.012, sp[i + 1][0]], 0.008, 0.05, '#2a0509'); }
    for (const z of [0.0, -0.4]) E.box(0.025, 0.006, 0.025, '#ffffff', [sd * (glassHW(z) - 0.08), ry(z) - 0.014, z]);
  }
  E.box(1.56, 0.008, 0.008, '#ffffff', [0, 0.468, DASH_Z0 - 0.006]);

  // ---- floor, centre tunnel (white, padded), seats, the carbon wall behind the seats
  V.box(1.80, 0.04, 2.20, '#101318', [0, 0.215, 0.30]);
  V.rbox(0.20, 0.30, 0.86, 0.04, SEAT, [0, 0.34, 0.37], null, 1);
  V.box(0.14, 0.02, 0.50, '#B9BAC2', [0, 0.50, 0.33]);
  const bk = -0.37, bc = [0.06, 0.62];                                                           // the backrest: tilted 21 deg, base (z 0.18, y 0.36) up to (z -0.03, y 0.88)
  for (const sd of [-1, 1]) {
    const x = sd * 0.36;
    V.rbox(0.48, 0.10, 0.50, 0.04, SEAT, [x, 0.32, 0.42], null, 1);
    for (const w of [-1, 1]) V.box(0.07, 0.14, 0.52, BOLSTER, [x + w * 0.255, 0.33, 0.42]);
    V.rbox(0.44, 0.60, 0.10, 0.04, SEAT, [x, bc[1], bc[0]], [bk, 0, 0], 1);
    for (const w of [-1, 1]) V.box(0.075, 0.56, 0.16, BOLSTER, [x + w * 0.255, bc[1] - 0.01, bc[0] + 0.02], [bk, 0, 0]);
    V.box(0.26, 0.012, 0.30, INLAY, [x, 0.392, 0.40]);                                           // the grey suede inlays of the cushion and the back (the white shoulders and wings frame them)
    V.box(0.26, 0.34, 0.012, INLAY, [x, bc[1] - 0.04, bc[0] + 0.083], [bk, 0, 0]);
    V.geo(new THREE.CylinderGeometry(1, 1, 1, 6), SEAT, [x, 1.00, -0.075], [Math.PI / 2 + bk, Math.PI / 6, 0], [0.145, 0.10, 0.165]);   // the hex head restraint
    E.box(0.15, 0.03, 0.01, '#ffffff', [x, 0.98, -0.135], [bk, 0, 0]);                          // its red ROADSTER plate (on the back, lit)
  }
  V.box(1.80, 0.90, 0.04, '#14171B', [0, 0.69, BULK - 0.01]);

  const shellMat = mat.toon('#ffffff', { vertexColors: true, paint: 0.02, emissive: '#2c3a4c', emissiveIntensity: 0, name: 'drive-roadster-cockpit' });
  const shell = new THREE.Mesh(V.build(), shellMat);
  shell.name = 'drive-roadster-cockpit'; shell.castShadow = true; shell.receiveShadow = true; shell.frustumCulled = false;
  const redMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1830'), vertexColors: true, toneMapped: false, name: 'drive-roadster-ambient' });
  const red = new THREE.Mesh(E.build(), redMat); red.name = 'drive-roadster-ambient'; red.frustumCulled = false; ctx.noOutline(red);

  // ---- the yoke: a rectangular wheel, open at the bottom: two white grips, a black hub bar with a hex pad, two bronze spokes, a slim dark bridge across the top; turns with the steering
  const WV = new VB(0);
  WV.rbox(0.30, 0.075, 0.07, 0.02, HUB, [0, 0, 0], null, 1);
  for (const sd of [-1, 1]) WV.rbox(0.052, 0.20, 0.050, 0.022, GRIP, [sd * 0.16, 0, 0], null, 1);
  WV.box(0.26, 0.016, 0.028, '#23272f', [0, 0.092, -0.005]);
  WV.cyl(0.03, 0.03, 0.015, PAD, [0, 0, 0.04], [Math.PI / 2, 0, 0], 6);
  for (const sd of [-1, 1]) WV.bar([sd * 0.03, 0, 0.0], [sd * 0.13, 0, 0.0], 0.012, 0.012, BRONZE);
  const wheel = new THREE.Mesh(WV.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'drive-steer' }));
  wheel.name = 'drive-roadster-yoke'; wheel.frustumCulled = false; wheel.castShadow = false;
  const wheelG = new THREE.Group(); wheelG.name = 'drive-roadster-yokeg'; wheelG.rotation.order = 'YXZ'; wheelG.position.set(YOKE.x, YOKE.y, YOKE.z); wheelG.rotation.set(-YOKE.tilt, Math.PI, 0);
  wheelG.add(wheel);

  // ---- the screen: one self-lit quad in front of its bezel
  const scr = createScreenTexture();
  const scrMat = new THREE.MeshBasicMaterial({ map: scr.tex, toneMapped: false, name: 'drive-roadster-screen' });
  const scrMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), scrMat);
  scrMesh.rotation.order = 'YXZ'; scrMesh.rotation.set(SCR.tilt, Math.PI - SCR.yaw, 0); scrMesh.position.set(SCR.x, SCR.y, SCR.z);
  scrMesh.name = 'drive-roadster-screen'; scrMesh.frustumCulled = false;
  ctx.noOutline(scrMesh);

  const group = new THREE.Group(); group.name = 'drive-roadster-cockpit-set';
  group.add(shell, red, scrMesh); group.visible = false;
  let tank = 1;
  return {
    group, shell, wheel: wheelG, screen: scrMesh, ambient: red,
    setVisible(on) { group.visible = on; },
    /** p: { steer (+ = left), kmh, rpm, gear (string), night 0..1, boost (the roadster's p.boost: tank + 0.2 while thrusting, else 0), dt } */
    update(p) {
      if (!group.visible) return;
      if (p.boost > 0.05) tank = Math.max(0, Math.min(1, p.boost - 0.2)); else tank = Math.min(1, tank + 0.045 * (p.dt || 0.016));      // the tank refills at the handling's rate while the thrust is off
      scr.update(p.kmh, p.rpm, p.gear, tank);
      const n = p.night || 0;
      scrMat.color.setScalar(0.85 + 0.75 * n);
      shellMat.emissiveIntensity = 0.14 - 0.06 * n;
      redMat.color.set('#ff1830').multiplyScalar(1.0 + 0.5 * n);
    },
  };
}
