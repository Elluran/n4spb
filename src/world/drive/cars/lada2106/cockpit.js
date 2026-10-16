// drive/cars/lada2106/cockpit.js - the driver's view of the Lada 2106 (camera mode 2, V key): a SEPARATE cheap mesh set, shown only while the eye is inside (the exterior body,
// glass, lamps, plates and the exterior wheel are hidden then), exactly the idea of drive/cockpit.js for the red coupe.
// Based on the Commons photos of the VAZ-2103 / 2106 cabin (docs/research/lada2106-2026.md: refs 10, 12, 13): flat black padded dash, a wood-grain instrument panel with FIVE round
// gauges (fuel, water, oil, tacho, speedometer: chrome rings) under a short hood on the driver's side, a big thin black wheel with a wide horn bar, a LONG gear lever with a rubber boot,
// two round vents, brown vinyl seats with tall head restraints, brown door cards with a wind-up window handle, thin chrome-edged pillars, a beige headliner.
// Parts (car frame: forward +Z, +X = the car's LEFT, the driver sits at x = +0.34):
//   shell  one vertex-colour mesh (dash, pod, door cards, pillars, liner, seats, floor, tunnel + lever, mirrors, bonnet crest): 1 draw call
//   wheel  its own mesh so that it can turn (thin rim, horn bar with chrome ends, hub): 1 draw call
//   dials  one textured quad (5 gauges on the wood panel drawn on a canvas; needles from p.kmh / p.rpm, the gear in the odometer window; redrawn only when a shown value changes): 1 draw call
// No window glass in this view (a real windscreen is almost invisible from inside). Z-FIGHTING: every part keeps >= 1.5 cm from its neighbours' faces (the dial quad stands 2.5 cm off its housing).
import * as THREE from 'three';
import { VB } from '../../../traffic/vb.js';
import { extrudeSide } from '../../../traffic/mk.js';

/** the driver's eye in the car frame (rest position; drive.js adds the head sway) */
export const EYE = { x: 0.34, y: 1.12, z: -0.20 };

const DASH = '#232527', DASH_TOP = '#2e3033', DASH_LO = '#1a1b1d', CARD = '#563a28', CARD_DK = '#3e2a1d', TRIMC = '#1b1c1e', LINER = '#cbbfa6', SEAT = '#5e3d28', SEAT_IN = '#a98e68', FLOORC = '#262221';
const CHROMEC = '#c5cad0', GLASS_M = '#b9d2e4', RUBBER = '#161718';
const WHEEL = { x: EYE.x, y: 0.82, z: 0.26, R: 0.20, tilt: 0.68 };      // the rim now crosses the lower third of the dials, as in a real 2106 (it used to hang below the dash, out of the frame)
const PANEL = { x: EYE.x, y: 0.84, z: 0.33, w: 0.62, h: 0.155, tilt: -0.34 };
const HR = 1.35;                                  // underside of the headliner / the header
const A0 = 135, A1 = 405, deg = (a) => a * Math.PI / 180;

/** the instrument panel texture: wood-grain base + 5 gauge faces drawn once; needles, gear and oil / fuel pointers redrawn when a shown value changes */
function createDialTexture() {
  const W = 1024, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  const b = base.getContext('2d');
  const FONT = '"Noto Sans", Arial, sans-serif';
  const CY = 122;
  // wood-grain veneer
  const wg = b.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#6e4627'); wg.addColorStop(0.5, '#7b5130'); wg.addColorStop(1, '#5f3b20');
  b.fillStyle = wg; b.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const y = (i * 37) % H, a = 0.05 + ((i * 13) % 7) * 0.012; b.strokeStyle = (i % 3 ? `rgba(40,22,10,${a})` : `rgba(160,110,60,${a})`); b.lineWidth = 1 + (i % 3); b.beginPath(); b.moveTo(0, y); b.bezierCurveTo(W * 0.3, y + ((i * 7) % 11) - 5, W * 0.6, y - ((i * 5) % 9) + 4, W, y + ((i * 3) % 7) - 3); b.stroke(); }
  b.strokeStyle = '#2c1a0d'; b.lineWidth = 6; b.strokeRect(3, 3, W - 6, H - 6);
  const face = (cx, cy, r) => {
    b.fillStyle = '#7c8088'; b.beginPath(); b.arc(cx, cy, r + 9, 0, 7); b.fill();                        // chrome ring
    b.fillStyle = '#d6dadf'; b.beginPath(); b.arc(cx, cy, r + 4, 0, 7); b.fill();
    const gr = b.createRadialGradient(cx, cy, 6, cx, cy, r); gr.addColorStop(0, '#1d2127'); gr.addColorStop(1, '#0b0d10');
    b.fillStyle = gr; b.beginPath(); b.arc(cx, cy, r, 0, 7); b.fill();
  };
  const ticks = (cx, cy, r, a0, a1, max, step, every, fmt, size, red0) => {
    b.textAlign = 'center'; b.textBaseline = 'middle';
    if (red0 != null) { b.strokeStyle = '#e03a30'; b.lineWidth = 8; b.beginPath(); b.arc(cx, cy, r - 12, deg(a0 + (a1 - a0) * red0 / max), deg(a1)); b.stroke(); }
    for (let v = 0, i = 0; v <= max + 1e-6; v += step, i++) {
      const a = deg(a0 + (a1 - a0) * v / max), major = i % every === 0, r0 = r - (major ? 24 : 17), r1 = r - 8;
      b.strokeStyle = major ? '#f2f3f0' : '#9aa0a8'; b.lineWidth = major ? 3.5 : 2.2;
      b.beginPath(); b.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); b.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); b.stroke();
      if (major && fmt) { b.fillStyle = '#f2f3f0'; b.font = `700 ${size}px ${FONT}`; b.fillText(fmt(v), cx + Math.cos(a) * (r - 42), cy + Math.sin(a) * (r - 42)); }
    }
  };
  const SM = [{ cx: 100, name: 'fuel' }, { cx: 262, name: 'water' }, { cx: 424, name: 'oil' }], rS = 66, TA = { cx: 650, r: 106 }, SP = { cx: 902, r: 106 };
  for (const s of SM) face(s.cx, CY, rS);
  face(TA.cx, CY, TA.r); face(SP.cx, CY, SP.r);
  // small gauges: three labels on the upper arc each
  const small = (cx, labels, a0, a1) => {
    b.textAlign = 'center'; b.textBaseline = 'middle';
    labels.forEach((t, i) => { const a = deg(a0 + (a1 - a0) * i / (labels.length - 1)); b.strokeStyle = '#f2f3f0'; b.lineWidth = 3; b.beginPath(); b.moveTo(cx + Math.cos(a) * (rS - 20), CY + Math.sin(a) * (rS - 20)); b.lineTo(cx + Math.cos(a) * (rS - 7), CY + Math.sin(a) * (rS - 7)); b.stroke();
      b.fillStyle = '#f2f3f0'; b.font = `700 17px ${FONT}`; b.fillText(t, cx + Math.cos(a) * (rS - 34), CY + Math.sin(a) * (rS - 34)); });
  };
  small(SM[0].cx, ['0', '1/2', '1'], 215, 325); small(SM[1].cx, ['50', '90', '130'], 215, 325); small(SM[2].cx, ['0', '4', '8'], 215, 325);
  b.fillStyle = '#9aa0a8'; b.font = `700 13px ${FONT}`; b.textAlign = 'center';
  b.fillText('БЕНЗИН', SM[0].cx, CY + 36); b.fillText('ВОДА', SM[1].cx, CY + 36); b.fillText('МАСЛО', SM[2].cx, CY + 36);
  ticks(TA.cx, CY, TA.r, A0, A1, 80, 5, 2, (v) => String(v), 21, 65);
  ticks(SP.cx, CY, SP.r, A0, A1, 240, 10, 2, (v) => String(v), 17);
  b.fillStyle = '#9aa0a8'; b.font = `700 14px ${FONT}`; b.fillText('x100', TA.cx, CY + 56); b.fillText('КМ/Ч', SP.cx, CY + 74);
  // the odometer window (shows the gear) + the black switches under the small gauges
  b.fillStyle = '#05070a'; b.fillRect(SP.cx - 36, CY + 22, 72, 28); b.strokeStyle = '#6a7078'; b.lineWidth = 2; b.strokeRect(SP.cx - 36, CY + 22, 72, 28);
  for (const s of SM) { b.fillStyle = '#17181a'; b.fillRect(s.cx - 28, 218, 56, 28); b.strokeStyle = '#3a3c40'; b.lineWidth = 2; b.strokeRect(s.cx - 28, 218, 56, 28); b.fillStyle = '#b8bcc2'; b.fillRect(s.cx - 8, 228, 16, 8); }
  b.fillStyle = '#2b2d30'; b.beginPath(); b.arc(768, CY + 100, 15, 0, 7); b.fill(); b.strokeStyle = '#8a8f96'; b.lineWidth = 3; b.stroke();       // the trip reset knob

  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  let lk = -1, lr = -1, lg = '', lt = -1e9;
  const needle = (cx, f, len, tail, col, a0 = A0, a1 = A1, w = 6) => {
    const a = deg(a0 + (a1 - a0) * Math.max(0, Math.min(1.03, f)));
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - Math.cos(a) * tail, CY - Math.sin(a) * tail); g.lineTo(cx + Math.cos(a) * len, CY + Math.sin(a) * len); g.stroke();
    g.fillStyle = '#d8dce0'; g.beginPath(); g.arc(cx, CY, w * 1.5, 0, 7); g.fill();
  };
  return {
    tex,
    /** kmh, rpm 0..1.05 (the HUD's tacho value), gear string; redraws only when the quantised values change (at most ~30 times a second) */
    update(kmh, rpm, gear) {
      const k = Math.round(kmh), r = Math.round(rpm * 64);
      if (k === lk && r === lr && gear === lg) return;
      const now = performance.now(); if (now - lt < 30) return;
      lt = now; lk = k; lr = r; lg = gear;
      g.drawImage(base, 0, 0);
      needle(SM[0].cx, 0.62, rS - 14, 8, '#e9edf0', 215, 325, 4);          // fuel (a third full tank is fine)
      needle(SM[1].cx, 0.40 + 0.12 * Math.min(1, kmh / 90), rS - 14, 8, '#e9edf0', 215, 325, 4);        // water warms a little with the speed
      needle(SM[2].cx, 0.30 + 0.35 * Math.min(1, rpm), rS - 14, 8, '#e9edf0', 215, 325, 4);             // oil pressure follows the revs
      needle(TA.cx, rpm * 0.93, TA.r - 16, 16, '#f4f4ee', A0, A1, 7);
      needle(SP.cx, kmh / 240, SP.r - 16, 16, '#f4f4ee', A0, A1, 7);
      g.fillStyle = gear === 'R' ? '#ff9a8a' : '#e9eef2'; g.font = `700 22px "Noto Sans", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(gear, SP.cx, CY + 37);
      tex.needsUpdate = true;
    },
  };
}

/** build the cockpit: returns { group, shell, wheel, dials, setVisible(b), update(p) }.  ext = { S (SPEC_LADA), frontPts (bonnet outline), bev, taper, paintTint, roofY } */
export function createLadaCockpit(ctx, ext) {
  const { mat } = ctx, { S } = ext;
  const V = new VB(0), cx = EYE.x;

  // ---- bonnet seen over the dash: the exterior front outline cut at the cowl, same paint tint
  V.add(extrudeSide(ext.frontPts, S.W, ext.bev, ext.taper), '#552659', null, ext.paintTint);

  // ---- dashboard: one soft extrusion across the cabin, the driver's pod with its hood, the knee panel, glove box, vents, radio, column cover
  const dashPts = [[0.97, 0.875], [0.93, 0.915], [0.62, 0.925], [0.50, 0.92], [0.405, 0.89], [0.37, 0.78], [0.44, 0.50], [0.97, 0.50]];
  V.add(extrudeSide(dashPts, 1.40, 0.02, null), DASH, null, (p, c, n) => { if (n.y > 0.6) c.set(DASH_TOP); else if (n.z < -0.4) c.set(DASH_LO); });
  V.rbox(PANEL.w + 0.04, 0.03, 0.07, 0.01, DASH, [cx, PANEL.y + PANEL.h / 2 + 0.02, PANEL.z + 0.04], [-0.2, 0, 0], 1);                // brow over the panel
  for (const sd of [-1, 1]) V.rbox(0.025, PANEL.h + 0.04, 0.07, 0.01, DASH, [cx + sd * (PANEL.w / 2 + 0.02), PANEL.y, PANEL.z + 0.045], null, 1);
  V.rbox(PANEL.w + 0.06, 0.03, 0.08, 0.01, DASH_LO, [cx, PANEL.y - PANEL.h / 2 - 0.025, PANEL.z + 0.04], null, 1);
  V.rbox(0.42, 0.17, 0.03, 0.012, '#2a2c2f', [-0.28, 0.72, 0.385], null, 1);                                                           // glove box lid
  V.rbox(0.05, 0.03, 0.02, 0.008, CHROMEC, [-0.28, 0.80, 0.37], null, 1);                                                              // its latch
  for (const x of [-0.04, 0.10]) { V.cyl(0.047, 0.047, 0.014, CHROMEC, [x, 0.845, 0.378], [Math.PI / 2, 0, 0], 14); V.cyl(0.036, 0.036, 0.020, '#0c0d0e', [x, 0.845, 0.373], [Math.PI / 2, 0, 0], 12); }   // round vents
  V.rbox(0.30, 0.095, 0.03, 0.012, '#141517', [0.0, 0.64, 0.45], null, 1);                                                             // radio slot
  V.rbox(0.07, 0.03, 0.02, 0.008, CHROMEC, [0.0, 0.64, 0.43], null, 1);
  V.rod([WHEEL.x, WHEEL.y - 0.01, WHEEL.z + 0.03], [WHEEL.x, WHEEL.y - 0.20, WHEEL.z + 0.22], 0.045, TRIMC, 8);                          // column shroud
  V.rbox(0.30, 0.09, 0.05, 0.015, DASH_LO, [cx, 0.62, 0.43], [0.35, 0, 0], 1);                                                         // ignition / knee cover
  V.box(1.34, 0.012, 0.09, '#0e0f10', [0, 0.926, 0.92]);                                                                               // black frit shade at the screen base

  // ---- windscreen frame: slim header, thin A pillars, sun visors, the rear-view mirror
  const hz = S.zr0 + 0.03;
  V.box(1.44, 0.04, 0.07, TRIMC, [0, HR + 0.02, hz]);
  for (const sd of [-1, 1]) {
    V.rod([sd * 0.715, 0.93, 0.96], [sd * 0.700, HR + 0.01, hz], 0.024, TRIMC, 6);
    V.rod([sd * 0.708, 0.96, 0.64], [sd * 0.700, 1.34, 0.52], 0.008, CHROMEC, 5);                // the quarter-light divider seen at the edge
  }
  V.box(1.44, 0.04, 1.205, LINER, [0, HR + 0.02, -0.3275], null, (p, c, n) => { if (n.y < -0.5) c.multiplyScalar(0.80 + 0.30 * Math.max(0, Math.min(1, (p.z + 0.9) / 1.0))); });   // headliner (also the shadow caster); it ends exactly where the header begins (z 0.275): the two used to overlap by 1.5 cm with coplanar undersides, a flickering band across the roof (tools/zfight.mjs)
  for (const x of [cx, -0.34]) V.rbox(0.32, 0.012, 0.17, 0.004, '#8c8269', [x, HR - 0.010, 0.17], null, 1);                            // sun visors, flipped up
  V.rbox(0.20, 0.06, 0.04, 0.014, TRIMC, [0.0, HR - 0.085, hz + 0.075], [0, -0.52, 0], 1);
  V.box(0.17, 0.038, 0.012, GLASS_M, [0.012, HR - 0.085, hz + 0.075 - 0.024], [0, -0.52, 0]);
  V.rod([0.0, HR, hz + 0.045], [0.0, HR - 0.06, hz + 0.08], 0.011, TRIMC, 5);

  // ---- doors: vinyl card, top rail, chrome sill strip, wind-up handle, door handle, B pillar, C pillar, the exterior mirrors seen through the side windows
  for (const sd of [-1, 1]) {
    V.box(0.05, 0.50, 1.50, CARD, [sd * 0.735, 0.68, -0.10]);
    V.box(0.05, 0.14, 1.50, CARD_DK, [sd * 0.735, 0.46, -0.10]);                                  // the darker lower pocket
    V.box(0.06, 0.04, 1.52, TRIMC, [sd * 0.735, 0.945, -0.10]);
    V.box(0.020, 0.018, 1.46, CHROMEC, [sd * 0.718, 0.972, -0.10]);                               // chrome edge of the window sill
    V.rod([sd * 0.704, 0.80, -0.02], [sd * 0.660, 0.80, -0.02], 0.007, CHROMEC, 5);                // window winder: shaft ...
    V.rod([sd * 0.660, 0.80, -0.02], [sd * 0.660, 0.80, -0.10], 0.010, CHROMEC, 6);               // ... crank ...
    V.sph(0.022, '#14151a', [sd * 0.660, 0.80, -0.115], 8);                                          // ... and its knob
    V.box(0.030, 0.026, 0.11, CHROMEC, [sd * 0.700, 0.84, 0.20]);                                  // door opening lever
    V.rod([sd * 0.715, 0.955, 0.10], [sd * 0.715, 1.015, 0.10], 0.006, '#d6d8da', 5);              // lock pin
    V.box(0.045, 0.40, 0.09, TRIMC, [sd * 0.730, 1.15, -0.32]);                                      // B pillar
    V.rod([sd * 0.715, 0.97, -1.34], [sd * 0.705, HR + 0.01, -0.90], 0.032, TRIMC, 6);             // C pillar
    V.rbox(0.05, 0.10, 0.17, 0.014, RUBBER, [sd * 0.90, 1.00, 0.73], [0, sd * 0.28, 0], 1);        // mirror housing, seen from behind
    V.box(0.012, 0.075, 0.13, GLASS_M, [sd * 0.87, 1.00, 0.655], [0, sd * 0.28, 0]);               // its glass toward the driver
    V.rod([sd * 0.80, 0.965, 0.76], [sd * 0.88, 1.00, 0.74], 0.010, CHROMEC, 5);
  }

  // ---- floor, tunnel, the LONG gear lever with its boot, the hand brake, seats, rear bench, shelf
  V.box(1.40, 0.04, 2.30, FLOORC, [0, 0.34, -0.55]);
  V.box(0.24, 0.17, 1.30, DASH, [0, 0.44, -0.05]);
  V.cyl(0.062, 0.062, 0.016, CHROMEC, [0.04, 0.545, 0.06], null, 14);                              // chrome ring of the boot
  V.cyl(0.040, 0.062, 0.08, RUBBER, [0.04, 0.595, 0.06], null, 12);                                 // rubber boot
  V.rod([0.04, 0.60, 0.06], [0.07, 0.90, -0.02], 0.011, '#9aa0a8', 6);                             // the lever: 32 cm
  V.sph(0.03, '#101112', [0.07, 0.915, -0.025], 8);
  V.rod([0.13, 0.50, -0.22], [0.13, 0.66, -0.40], 0.012, '#2b2d30', 6); V.sph(0.022, RUBBER, [0.13, 0.67, -0.415], 8);                   // hand brake
  for (const [x, back] of [[cx, true], [-0.34, false]]) {
    V.rbox(0.46, 0.13, 0.50, 0.035, SEAT, [x, 0.46, -0.32], null, 1);
    V.rbox(0.30, 0.012, 0.36, 0.004, SEAT_IN, [x, 0.53, -0.32], null, 1);
    V.rbox(0.46, 0.56, 0.13, 0.04, SEAT, [x, 0.80, -0.56], [-0.22, 0, 0], 1);
    V.rbox(0.30, 0.38, 0.012, 0.004, SEAT_IN, [x, 0.80, -0.488], [-0.22, 0, 0], 1);
    V.rbox(0.27, 0.19, 0.11, 0.04, SEAT, [x, 1.18, -0.64], [-0.20, 0, 0], 1);                       // the tall head restraint
    void back;
  }
  V.rbox(1.34, 0.14, 0.50, 0.04, SEAT, [0, 0.44, -1.18], null, 1);
  V.rbox(1.34, 0.52, 0.13, 0.04, SEAT, [0, 0.82, -1.44], [-0.20, 0, 0], 1);
  V.box(1.40, 0.05, 0.42, LINER, [0, 0.96, -1.62]);
  V.box(1.40, 0.36, 0.05, CARD_DK, [0, 0.78, -1.82]);

  const shellMat = mat.toon('#ffffff', { vertexColors: true, paint: 0.02, emissive: '#2c3a4c', emissiveIntensity: 0, name: 'drive-cockpit-lada' });
  const shell = new THREE.Mesh(V.build(), shellMat);
  shell.name = 'drive-cockpit'; shell.castShadow = true; shell.receiveShadow = true; shell.frustumCulled = false;

  // ---- steering wheel: a big thin rim (40 cm), a wide horn bar with chrome ends, a hub; faces the driver and tilts up
  const WV = new VB(0), r0 = WHEEL.R;
  WV.torus(r0, 0.0125, '#0f1011', [0, 0, 0], [0, 0, 0], 6, 30);
  WV.rbox(2 * r0 - 0.04, 0.052, 0.034, 0.014, '#17181a', [0, 0, 0], null, 1);                    // the bar across the hub (the horn pad)
  WV.rbox(0.045, 0.058, 0.04, 0.01, CHROMEC, [-(r0 - 0.04), 0, 0], null, 1);
  WV.rbox(0.045, 0.058, 0.04, 0.01, CHROMEC, [(r0 - 0.04), 0, 0], null, 1);
  WV.cyl(0.05, 0.05, 0.05, '#1c1d1f', [0, 0, 0.012], [Math.PI / 2, 0, 0], 12);
  const wheel = new THREE.Mesh(WV.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0, name: 'drive-steer-lada' }));
  wheel.name = 'drive-cockpit-wheel'; wheel.frustumCulled = false; wheel.castShadow = false;
  const wheelG = new THREE.Group(); wheelG.name = 'drive-cockpit-wheelg'; wheelG.rotation.order = 'YXZ'; wheelG.position.set(WHEEL.x, WHEEL.y, WHEEL.z); wheelG.rotation.set(-WHEEL.tilt, Math.PI, 0);
  wheelG.add(wheel);

  // ---- the instrument panel: one self-lit textured quad in front of the pod
  const dial = createDialTexture();
  const dialMat = new THREE.MeshBasicMaterial({ map: dial.tex, toneMapped: false, name: 'drive-dials-lada' });
  const dialMesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL.w, PANEL.h), dialMat);
  dialMesh.rotation.order = 'YXZ'; dialMesh.rotation.set(PANEL.tilt, Math.PI, 0); dialMesh.position.set(PANEL.x, PANEL.y, PANEL.z);
  dialMesh.name = 'drive-dials'; dialMesh.frustumCulled = false;
  ctx.noOutline(dialMesh);

  const group = new THREE.Group(); group.name = 'drive-cockpit-set';
  group.add(shell, wheelG, dialMesh); group.visible = false;
  return {
    group, shell, wheel: wheelG, dials: dialMesh,
    setVisible(on) { group.visible = on; },
    /** p: { steer (+ = left), kmh, rpm, gear (string), night 0..1 } */
    update(p) {
      if (!group.visible) return;
      wheelG.rotation.z = p.steer * 2.6;
      dial.update(p.kmh, p.rpm, p.gear);
      const n = p.night || 0;
      dialMat.color.setScalar(0.84 + 0.7 * n);
      shellMat.emissiveIntensity = 0.30 - 0.12 * n;
    },
  };
}
