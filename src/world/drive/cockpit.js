// drive/cockpit.js - the driver's view of the red coupe (camera mode 2, V key): a SEPARATE cheap mesh set that replaces the exterior body / glass while the camera sits inside.
// Why: the exterior model is a solid side-profile extrusion (belt line 0.93 m, roof slab at 1.27 m, hollow interior drawn through a glass volume). From an eye 14 cm above that
// belt the "dashboard" was the red top of the body, the "headliner" a slab 20 cm over the eye, the wheel half sunk into the body and the camera near plane (0.25 m) clipped
// what was close. The cockpit shell below is built for the eye instead: low dash, slim header, thin A pillars, door tops, mirrors, a wheel that turns, a decorative binnacle.
// Parts (car frame: forward +Z, +X = the car's LEFT, the driver sits at x = +0.40):
//   shell  one vertex-colour mesh (dash, binnacle, door cards, pillars, roof liner, seats, floor, mirrors, hood + fender crests): 1 draw call, ~2 k triangles
//   wheel  its own mesh so that it can turn (rim with a flat bottom, hub, two spokes, red top marker): 1 draw call
//   dials  one textured quad (tacho + speed dials + digital speed + gear drawn on a canvas; redrawn only when a shown value changes): 1 draw call, self-lit (readable at night)
// There is NO window glass in this view: a real windscreen is almost invisible from inside, and the flat film of the exterior glass volume was the "blue-grey film" of the old view.
// Z-FIGHTING: every part keeps >= 1.5 cm from its neighbours' faces (the dial quad stands 2.5 cm in front of its housing).
import * as THREE from 'three';
import { VB } from '../traffic/vb.js';
import { extrudeSide } from '../traffic/mk.js';

/** the driver's eye in the car frame (rest position; drive.js adds the head sway) */
export const EYE = { x: 0.40, y: 1.00, z: -0.38 };

const RED = '#dd2230', RED_DK = '#a8141f';
const DASH = '#565d6a', DASH_TOP = '#6a7280', CARD = '#626a78', TRIMC = '#434954', LINER = '#8a919e', LEATHER = '#4c5361', FLOOR = '#353a43', GLASS_M = '#b9d2e4', VENT = '#2a2e36';

// ---- wheel / binnacle placement (car frame). Tuned with tools/drive-cockpit-shots.mjs: the dials sit just above the rim, the rim just below the dash lip.
const WHEEL = { x: EYE.x, y: 0.665, z: 0.14, R: 0.165, tilt: 0.50 };
const CLU = { x: EYE.x, y: 0.86, z: 0.27, w: 0.345, h: 0.14 };
const ROOF_IN = 1.245;                            // underside of the roof liner / the header (the cockpit may be a little roomier than the exterior roof: it is never seen from outside)

const A0 = 135, A1 = 405;                       // dial sweep in degrees (canvas angles, clockwise), the same 270 degrees as the HUD arc
const deg = (a) => a * Math.PI / 180;

/** the instrument cluster texture: static dial faces drawn once, then needles + digital speed + gear on top whenever a shown value changes */
function createDialTexture() {
  const W = 768, H = 312, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const b = base.getContext('2d');
  const FONT = '"Rubik", "Noto Sans", Arial, sans-serif';
  const L = { cy: 156, r: 134, cxT: 150, cxS: W - 150 };     // tacho (left) and speedometer (right)
  // housing + bezel
  b.fillStyle = '#07090c'; b.fillRect(0, 0, W, H);
  const dial = (cx, max, step, labelEvery, red0, fmt) => {
    const gr = b.createRadialGradient(cx, L.cy, 10, cx, L.cy, L.r); gr.addColorStop(0, '#171c24'); gr.addColorStop(1, '#0b0e13');
    b.fillStyle = gr; b.beginPath(); b.arc(cx, L.cy, L.r, 0, 7); b.fill();
    b.strokeStyle = '#8a929e'; b.lineWidth = 6; b.beginPath(); b.arc(cx, L.cy, L.r - 3, 0, 7); b.stroke();
    if (red0 != null) { b.strokeStyle = '#ff3b45'; b.lineWidth = 12; b.beginPath(); b.arc(cx, L.cy, L.r - 22, deg(A0 + (A1 - A0) * red0 / max), deg(A1)); b.stroke(); }
    b.textAlign = 'center'; b.textBaseline = 'middle';
    for (let v = 0, i = 0; v <= max + 1e-6; v += step, i++) {
      const a = deg(A0 + (A1 - A0) * v / max), major = i % labelEvery === 0, r0 = L.r - (major ? 36 : 28), r1 = L.r - 14;
      b.strokeStyle = major ? '#f2f5f8' : '#8d96a3'; b.lineWidth = major ? 5 : 3;
      b.beginPath(); b.moveTo(cx + Math.cos(a) * r0, L.cy + Math.sin(a) * r0); b.lineTo(cx + Math.cos(a) * r1, L.cy + Math.sin(a) * r1); b.stroke();
      if (major) { b.fillStyle = '#f2f5f8'; b.font = `700 ${max > 100 ? 25 : 30}px ${FONT}`; b.fillText(fmt(v), cx + Math.cos(a) * (L.r - 62), L.cy + Math.sin(a) * (L.r - 62)); }
    }
  };
  dial(L.cxT, 8, 0.5, 2, 6.5, (v) => String(v));
  dial(L.cxS, 260, 10, 5, null, (v) => String(v));
  b.fillStyle = '#9aa3b0'; b.font = `700 20px ${FONT}`; b.textAlign = 'center';
  b.fillText('x1000', L.cxT, L.cy + 58); b.fillText('KM/H', L.cxS, L.cy + 58);
  // centre display panel
  b.fillStyle = '#0d1218'; b.fillRect(W / 2 - 86, 40, 172, 232);
  b.strokeStyle = '#2a323d'; b.lineWidth = 3; b.strokeRect(W / 2 - 86, 40, 172, 232);
  b.fillStyle = '#9aa3b0'; b.font = `700 20px ${FONT}`; b.fillText('KM/H', W / 2, 160);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  let lk = -1, lr = -1, lg = '', lt = -1e9;
  const needle = (cx, f, len, col) => {
    const a = deg(A0 + (A1 - A0) * Math.max(0, Math.min(1.03, f)));
    g.strokeStyle = col; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - Math.cos(a) * 18, L.cy - Math.sin(a) * 18); g.lineTo(cx + Math.cos(a) * len, L.cy + Math.sin(a) * len); g.stroke();
    g.fillStyle = '#e8ecf1'; g.beginPath(); g.arc(cx, L.cy, 14, 0, 7); g.fill();
  };
  return {
    tex,
    /** kmh, rpm 0..1.05 (the HUD's tacho value), gear string; redraws only when the quantised values change */
    update(kmh, rpm, gear) {
      const k = Math.round(kmh), r = Math.round(rpm * 64);
      if (k === lk && r === lr && gear === lg) return;
      const now = performance.now(); if (now - lt < 30) return;          // at most ~30 redraws / s; a skipped change is still pending (lk / lr / lg keep the old values)
      lt = now; lk = k; lr = r; lg = gear;
      g.drawImage(base, 0, 0);
      needle(L.cxT, rpm * 0.93, L.r - 30, '#ff5a3c');
      needle(L.cxS, kmh / 260, L.r - 30, '#ff5a3c');
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#f4f7fa'; g.font = `900 74px ${FONT}`; g.fillText(String(k), W / 2, 108);
      g.fillStyle = gear === 'R' ? '#ff6a6a' : '#ffe05a'; g.font = `900 64px ${FONT}`; g.fillText(gear, W / 2, 224);
      tex.needsUpdate = true;
    },
  };
}

/** build the cockpit: returns { group, wheel, update(p), setVisible(b) }.  `ext` carries what the exterior model computed (front profile of the body, taper, paint tint, material) so that the bonnet matches it. */
export function createCockpit(ctx, ext) {
  const { mat } = ctx, { S } = ext;
  const V = new VB(0);
  const cx = EYE.x;

  // ---- bonnet: the exterior front profile cut at the windscreen base (identical outline + paint tint), plus two low fender crests so that the nose reads from inside
  V.add(extrudeSide(ext.frontPts, S.W, ext.bev, ext.taper), RED, null, ext.paintTint);

  // ---- dashboard: soft extrusion across the cabin (profile in z, y), the tilted knee panel under the wheel, the hooded binnacle on the driver's side
  const dashPts = [[0.68, 0.775], [0.62, 0.78], [0.40, 0.80], [0.30, 0.80], [0.20, 0.785], [0.21, 0.69], [0.28, 0.46], [0.68, 0.46]];
  V.add(extrudeSide(dashPts, 1.70, 0.02, null), DASH, null, (p, c, n) => { if (n.y > 0.6) c.set(DASH_TOP); else if (n.z < -0.4) c.multiplyScalar(0.84); });
  // binnacle: dark housing behind the dial quad, a brow over it, cheeks on both sides
  V.rbox(CLU.w + 0.02, CLU.h - 0.01, 0.10, 0.012, '#15181d', [cx, CLU.y, CLU.z + 0.075], null, 1);
  V.rbox(CLU.w + 0.10, 0.03, 0.16, 0.012, DASH, [cx, CLU.y + CLU.h / 2 + 0.016, CLU.z + 0.03], null, 1);
  for (const sd of [-1, 1]) V.rbox(0.03, CLU.h + 0.03, 0.14, 0.01, DASH, [cx + sd * (CLU.w / 2 + 0.02), CLU.y, CLU.z + 0.04], null, 1);
  // steering column cover + knee panel trim
  V.rod([WHEEL.x, WHEEL.y - 0.01, WHEEL.z + 0.02], [WHEEL.x, WHEEL.y - 0.11, WHEEL.z + 0.20], 0.042, TRIMC, 8);
  V.rbox(0.36, 0.10, 0.04, 0.015, TRIMC, [cx, 0.60, 0.235], [0.22, 0, 0], 1);
  // centre stack: screen, vents, a red accent strip along the dash
  V.rbox(0.17, 0.095, 0.05, 0.015, '#10151b', [0.0, 0.745, 0.20], [0.22, 0, 0], 1);
  V.rbox(0.19, 0.012, 0.052, 0.005, '#8a93a0', [0.0, 0.685, 0.205], [0.22, 0, 0], 1);
  for (const x of [0.80, -0.80, 0.14, -0.14]) V.rbox(0.09, 0.045, 0.03, 0.012, VENT, [x, 0.77, 0.185], [0.22, 0, 0], 1);
  // glare shade on the dash top (the black frit of a windscreen edge)
  V.box(1.62, 0.012, 0.08, '#101216', [0, 0.792, 0.58]);

  // ---- windscreen frame: slim header, thin A pillars (the glass itself is not drawn)
  const hz = ext.zr0 + 0.04, HR = ROOF_IN;
  V.box(1.62, 0.04, 0.075, TRIMC, [0, HR + 0.02, hz]);
  for (const sd of [-1, 1]) {
    V.rod([sd * 0.805, 0.77, 0.63], [sd * 0.775, HR + 0.01, hz], 0.026, TRIMC, 6);
  }
  // roof liner + slab (the slab also casts the car's shadow); rear-view mirror at the top centre, facing the driver
  V.box(1.60, 0.05, 1.26, LINER, [0, HR + 0.025, ext.zr1 + 0.63 + 0.02], null, (p, c, n) => { if (n.y < -0.5) c.multiplyScalar(0.78 + 0.4 * Math.max(0, Math.min(1, (p.z + 0.5) / 0.7))); });
  V.rbox(0.19, 0.055, 0.04, 0.014, TRIMC, [0.0, HR - 0.07, hz + 0.075], [0, -0.60, 0], 1);
  V.box(0.16, 0.036, 0.012, GLASS_M, [0.012, HR - 0.07, hz + 0.075 - 0.022], [0, -0.60, 0]);
  V.rod([0.0, HR, hz + 0.045], [0.0, HR - 0.05, hz + 0.08], 0.011, TRIMC, 5);

  // ---- doors: card, top rail (red outer lip), B pillar, side mirrors
  for (const sd of [-1, 1]) {
    V.box(0.05, 0.50, 1.62, CARD, [sd * 0.835, 0.68, -0.14]);
    V.box(0.07, 0.045, 1.62, TRIMC, [sd * 0.835, 0.915, -0.14]);
    V.box(0.045, 0.045, 1.62, RED, [sd * 0.885, 0.915, -0.14]);
    V.rbox(0.07, 0.035, 0.46, 0.014, LEATHER, [sd * 0.79, 0.865, -0.05], null, 1);              // armrest
    V.box(0.05, 0.33, 0.09, TRIMC, [sd * 0.80, 1.09, -0.55]);                                    // B pillar
    V.rod([sd * 0.80, 0.93, -1.52], [sd * 0.77, HR + 0.01, ext.zr1], 0.032, TRIMC, 6);          // C pillar
    V.rbox(0.10, 0.07, 0.16, 0.025, RED, [sd * 0.975, 1.0, 0.52], null, 1, ext.paintTint);       // mirror housing
    V.box(0.085, 0.055, 0.010, GLASS_M, [sd * 0.975, 1.0, 0.52 - 0.085]);                        // its glass, facing the driver
    V.rod([sd * 0.90, 0.955, 0.50], [sd * 0.955, 0.99, 0.52], 0.012, TRIMC, 5);
  }
  // ---- floor, centre tunnel + gear lever, seats, rear shelf, rear wall (what shows when the head turns)
  V.box(1.66, 0.04, 2.2, FLOOR, [0, 0.36, -0.45]);
  V.box(0.26, 0.24, 1.55, DASH, [0, 0.50, -0.32]);
  V.rod([0.0, 0.62, -0.10], [0.0, 0.76, -0.12], 0.014, '#9aa0a8', 5);
  V.sph(0.03, '#15171a', [0.0, 0.78, -0.125], 8);
  for (const sd of [-1, 1]) {
    const x = sd * 0.40;
    V.rbox(0.46, 0.10, 0.52, 0.03, LEATHER, [x, 0.52, -0.58], null, 1);
    V.rbox(0.46, 0.50, 0.12, 0.04, LEATHER, [x, 0.77, -0.86], [-0.2, 0, 0], 1);
    V.rbox(0.26, 0.18, 0.10, 0.04, LEATHER, [x, 1.07, -0.93], [-0.2, 0, 0], 1);
    V.box(0.40, 0.02, 0.014, RED_DK, [x, 0.77, -0.795], [-0.2, 0, 0]);
  }
  V.box(1.62, 0.05, 0.5, DASH, [0, 0.93, -1.30]);
  V.box(1.62, 0.34, 0.05, DASH, [0, 0.78, -1.55]);

  const shellMat = mat.toon('#ffffff', { vertexColors: true, paint: 0.02, emissive: '#2c3a4c', emissiveIntensity: 0, name: 'drive-cockpit' });
  const shell = new THREE.Mesh(V.build(), shellMat);
  shell.name = 'drive-cockpit'; shell.castShadow = true; shell.receiveShadow = true; shell.frustumCulled = false;

  // ---- steering wheel: flat-bottom rim (a torus arc), flat chord, hub, two spokes, a red top marker; faces the driver, tilted up
  const WV = new VB(0), r0 = WHEEL.R, gap = Math.PI / 3, chord = r0 * Math.cos(gap / 2);
  WV.torus(r0, 0.0175, '#15171a', [0, 0, 0], [0, 0, -Math.PI / 2 + gap / 2], 6, 22, Math.PI * 2 - gap);
  WV.box(2 * r0 * Math.sin(gap / 2), 0.033, 0.034, '#15171a', [0, -chord, 0]);
  WV.box(0.034, 0.012, 0.036, RED, [0, r0, 0]);
  WV.cyl(0.050, 0.050, 0.040, '#20242a', [0, 0, 0.012], [Math.PI / 2, 0, 0], 12);
  WV.cyl(0.028, 0.028, 0.044, '#3b414b', [0, 0, 0.014], [Math.PI / 2, 0, 0], 10);
  for (const sd of [-1, 1]) WV.box(r0 - 0.04, 0.026, 0.020, '#1d2127', [sd * (r0 / 2 + 0.014), 0, 0]);
  WV.box(0.05, 0.10, 0.02, '#1d2127', [0, -0.05, 0]);
  const wheel = new THREE.Mesh(WV.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0, name: 'drive-steer' }));
  wheel.name = 'drive-cockpit-wheel'; wheel.frustumCulled = false; wheel.castShadow = false;
  const wheelG = new THREE.Group(); wheelG.name = 'drive-cockpit-wheelg'; wheelG.rotation.order = 'YXZ'; wheelG.position.set(WHEEL.x, WHEEL.y, WHEEL.z); wheelG.rotation.set(-WHEEL.tilt, Math.PI, 0);
  wheelG.add(wheel);

  // ---- dials: one self-lit textured quad over the binnacle housing
  const dial = createDialTexture();
  const dialMat = new THREE.MeshBasicMaterial({ map: dial.tex, toneMapped: false, name: 'drive-dials' });
  const tiltX = -0.19;                                              // the face looks at the eye (normal toward -Z and up)
  const dialMesh = new THREE.Mesh(new THREE.PlaneGeometry(CLU.w, CLU.h), dialMat);
  dialMesh.rotation.order = 'YXZ'; dialMesh.rotation.set(tiltX, Math.PI, 0); dialMesh.position.set(CLU.x, CLU.y, CLU.z);
  dialMesh.name = 'drive-dials'; dialMesh.frustumCulled = false;
  ctx.noOutline(dialMesh);

  // interior lift at night (emissive on the shell material is driven from update)
  const group = new THREE.Group(); group.name = 'drive-cockpit-set';
  group.add(shell, wheelG, dialMesh); group.visible = false;

  return {
    group, shell, wheel: wheelG, dials: dialMesh,
    setVisible(on) { group.visible = on; },
    /** p: { steer (+ = left), kmh, rpm, gear (string), night 0..1 } */
    update(p) {
      if (!group.visible) return;
      wheelG.rotation.z = p.steer * 2.2;
      dial.update(p.kmh, p.rpm, p.gear);
      const n = p.night || 0;
      dialMat.color.setScalar(0.82 + 0.8 * n);
      shellMat.emissiveIntensity = 0.30 - 0.12 * n;       // a soft lift by day, a dim one at night so that the lit dials carry the cabin
    },
  };
}
