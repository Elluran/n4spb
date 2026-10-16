// drive/model.js - the player's car: a low red sports coupe ("Б-Спорт") built with the traffic module's vertex-colour builder, so it shares the look of the fleet
// (soft-bevelled side-profile extrusion, wheel arches, hollow dark interior under a transparent glass volume). It is NOT part of the fleet: one dynamic Group with its own
// wheels (they roll and steer), emissive head / tail lamps (the tail lamps brighten on braking), a driver, a steering wheel, a rear wing, exhausts with nitro flames,
// a neon underglow at night and the Bibliotechka logo ("Б." on the four brand colours, assets/bibliotechka.png) on the roof only (an easter egg
// for the user's reader app).
// Car frame: forward +Z, origin on the ground midway between the axles, +X = the car's LEFT (like every vehicle of the traffic module).
// Z-FIGHTING: decals stand 1.2-1.6 cm proud of the surface and carry a negative polygonOffset, every other part keeps >= 2 cm from its neighbours (same rules as traffic/models.js).
import * as THREE from 'three';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';
import { VB } from '../traffic/vb.js';
import { TYRE, TRIM, GLASSC, INT, CHROME, WHITE, archPts, extrudeSide, extrudeGlass, insetPoly, bodyTint } from '../traffic/mk.js';
import { createCockpit } from './cockpit.js';

export const SPEC = {
  W: 1.82, R: 0.335, tw: 0.25, track: 1.56, yb: 0.17, wb: 2.62, front: 2.12, rear: -2.02,
  hn: 0.66, hh: 0.80, zc: 0.70, hb: 0.93, zt: -1.62, ht: 0.98, H: 1.27, zr0: 0.10, zr1: -1.08, taper: [0.10, 0.08],
  hgt: 1.3, len: 4.14, centerZ: 0.05,
};
const RED = '#dd2230', RED_DK = '#a8141f', BLACK = '#17191d', SILVER = '#d6dae0';
export const PAINT_RED = RED;

export const LOGO_URL = './assets/bibliotechka.png';
const _logoTextures = new Map();
/** One shared logo texture per url (the three garage cars carry the same decal). */
export function sharedLogoTexture(url = LOGO_URL) { let t = _logoTextures.get(url); if (!t) _logoTextures.set(url, (t = logoTexture(url))); return t; }
/**
 * The Bibliotechka roof decal of the other garage cars (the coupe builds its own below): a flat `drive-logo` plane lying on the roof, the top of the icon pointing forward. `y` is the roof surface
 * at `z` (the decal stands 1.4 cm proud), `tilt` the fall of a sloping roof to the rear in radians. drive/damage.js treats every `drive-logo` mesh that is a direct child of the car root as a
 * rigid decal that follows the crushed roof and disappears with it, so the caller only adds the returned mesh to its `outer` list (hidden in the cockpit view).
 */
export function createRoofLogo(ctx, root, { w = 0.8, x = 0, y, z, tilt = 0, url = LOGO_URL }) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), ctx.mat.toon('#ffffff', { map: sharedLogoTexture(url), alphaTest: 0.5, side: 'double', polygonOffset: -2, paint: 0.0, name: 'drive-logo' }));
  m.rotation.order = 'XYZ'; m.rotation.set(-Math.PI / 2 - tilt, 0, Math.PI);          // lie flat (normal up, leaning back with the roof), then turn the icon so its top points forward
  m.position.set(x, y + 0.014, z); m.name = 'drive-logo'; root.add(m);
  return m;
}

/** the logo as a rounded app icon on a canvas texture (the PNG is drawn as soon as it has loaded) */
function logoTexture(url) {
  const S = 384, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const draw = (img) => {
    g.clearRect(0, 0, S, S);
    g.save(); g.beginPath();
    const r = S * 0.22, p = 3; g.moveTo(p + r, p); g.arcTo(S - p, p, S - p, S - p, r); g.arcTo(S - p, S - p, p, S - p, r); g.arcTo(p, S - p, p, p, r); g.arcTo(p, p, S - p, p, r); g.closePath(); g.clip();
    if (img) g.drawImage(img, 0, 0, S, S);
    else { g.fillStyle = '#ff4d57'; g.fillRect(0, 0, S, S); g.fillStyle = '#fff'; g.font = '900 280px Rubik, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Б', S / 2 - 8, S / 2 + 12); }
    g.restore();
  };
  draw(null);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  try {
    const img = new Image(); img.onload = () => { draw(img); tex.needsUpdate = true; }; img.onerror = () => {}; img.src = url;
  } catch (e) { /* the fallback letter stays */ }
  return tex;
}

/** a Russian-style plate (no flag, region only) */
function plateTexture(text, region) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 112;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4f4ef'; g.fillRect(0, 0, 512, 112);
  g.strokeStyle = '#15171a'; g.lineWidth = 6; g.strokeRect(5, 5, 502, 102);
  g.fillStyle = '#15171a'; g.textBaseline = 'middle';
  g.font = '700 74px "Noto Sans", Arial, sans-serif'; g.textAlign = 'center'; g.fillText(text, 188, 60);
  g.fillRect(372, 12, 3, 88);
  g.font = '700 54px "Noto Sans", Arial, sans-serif'; g.fillText(region, 442, 50);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

/** the pool of light of the head lamps on the road (additive, night only): bright at the car, widening and fading ahead; canvas row 0 = near the car */
function beamTexture() {
  const W = 128, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1), half = 0.16 + 0.84 * Math.pow(t, 0.7), fall = Math.pow(1 - t, 1.5);
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1) - 0.5) * 2, a = Math.max(0, 1 - Math.pow(Math.abs(u) / half, 2.2)) * fall * (0.55 + 0.45 * Math.max(0, 1 - Math.abs(u) / 0.5));
      const i = (y * W + x) * 4; im.data[i] = 255; im.data[i + 1] = 244; im.data[i + 2] = 214; im.data[i + 3] = Math.round(255 * Math.min(1, a));
    }
  }
  g.putImageData(im, 0, 0);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

export function createCarModel(ctx, { logoUrl = './assets/bibliotechka.png', plate = ['Б 001 КА', '78'] } = {}) {
  const { mat } = ctx, S = SPEC;
  const s = { W: S.W, R: S.R, tw: S.tw, track: S.track, yb: S.yb, Ra: S.R + 0.07, bev: 0.04, zr: -S.wb / 2, zf: S.wb / 2, front: S.front, rear: S.rear };
  s.arches = [s.zr, s.zf];
  const { front, rear, yb, hn, hh, zc, hb, zt, ht, H, zr0, zr1 } = S;
  const V = new VB(0), G = new VB(0), LH = new VB(0), LT = new VB(0), DR = new VB(0);

  // ---- body: side profile -> up over the nose and the bonnet -> beltline -> fastback tail -> back along the sill with the two wheel arches
  const top = [[front - 0.09, yb + 0.10], [front, yb + 0.20], [front + 0.004, hn - 0.20], [front - 0.05, hn - 0.05], [front - 0.17, hn],
    [(front + zc) / 2 + 0.2, (hn + hh) / 2 + 0.015], [zc + 0.04, hh], [zc - 0.10, hb], [zt + 0.06, hb],
    [zt - 0.20, ht], [rear + 0.30, ht + 0.005], [rear + 0.05, ht - 0.10], [rear, ht - 0.26], [rear, yb + 0.20], [rear + 0.09, yb + 0.10]];
  const pts = top.slice();
  for (const za of s.arches) pts.push(...archPts(s, za, 7));
  const taper = { zF0: front - 0.9, zF1: front + 0.05, kF: S.taper[0], zR0: rear + 0.9, zR1: rear - 0.05, kR: S.taper[1], kS: 0, yS: hb, yT: H };
  const paintTint = bodyTint(s);
  // Short panel edges let a buckled bonnet follow its trim instead of cutting
  // through it as a single long triangle. Only the player's outer shell needs it.
  const shell = extrudeSide(pts, s.W, s.bev, taper);
  const panels = new TessellateModifier(0.22, 7).modify(shell);
  V.add(panels, RED, null, (p, c, n, info) => {
    // New bonnet samples sit near the arch radius too, but face up, not into it.
    if (n.y < 0.5) paintTint(p, c, n, info);
  });
  shell.dispose(); panels.dispose();

  // ---- greenhouse (glass volume sunk 6 cm below the belt), hollow interior, seats, roof slab, pillars
  const Wg = s.W - 0.28;
  const gpoly = [[zc - 0.04, hh - 0.06], [zr0, H - 0.04], [zr1, H - 0.04], [zt + 0.10, hb - 0.06]];
  G.add(extrudeGlass(gpoly, Wg), '#ffffff');
  V.add(extrudeGlass(insetPoly(gpoly, 0.06), Wg - 0.20), INT, new THREE.Matrix4().makeScale(-1, 1, 1));
  for (const sx of [-0.4, 0.4]) V.box(0.46, 0.46, 0.14, '#272c33', [sx, 0.86, zr0 - 0.84], [-0.22, 0, 0]);
  V.box(Wg - 0.40, 0.36, 0.14, '#272c33', [0, 0.92, zr1 + 0.30], [-0.28, 0, 0]);
  V.box(Wg + 0.04, 0.06, zr0 - zr1 + 0.10, RED, [0, H - 0.015, (zr0 + zr1) / 2]);                       // roof slab (2 cm wider than the glass)
  V.box(Wg - 0.10, 0.01, zr0 - zr1 - 0.02, '#2b2e35', [0, H - 0.052, (zr0 + zr1) / 2]);                  // dark headliner under the slab (cockpit view)
  for (const sd of [-1, 1]) {
    const x = sd * (Wg / 2 - 0.01);
    V.rod([x, hh + 0.02, zc + 0.01], [x, H - 0.05, zr0 + 0.03], 0.03, BLACK, 5);                          // A pillar
    V.rod([x, hb, zt + 0.03], [x, H - 0.05, zr1 - 0.02], 0.034, RED, 5);                                 // C pillar
    V.box(0.045, H - 0.07 - hb, 0.085, TRIM, [sd * (Wg / 2 + 0.002), (H + hb) / 2 - 0.035, (zr0 + zr1) / 2 - 0.05]);   // B pillar
  }

  // ---- aero: splitter, side skirts, diffuser, rear wing, bonnet vents, door seams
  V.box(s.W - 0.06, 0.16, 0.20, BLACK, [0, 0.21, front - 0.04]);                                         // front valance / splitter (joined to the bumper above it)
  V.box(s.W - 0.10, 0.17, 0.12, BLACK, [0, 0.38, front - 0.03]);                                         // front bumper lower lip
  V.box(s.W - 0.10, 0.17, 0.12, BLACK, [0, 0.38, rear + 0.03]);                                          // rear bumper
  V.box(s.W - 0.50, 0.075, 0.20, BLACK, [0, 0.15, rear + 0.04]);                                         // diffuser
  for (const sd of [-1, 1]) {
    V.box(0.05, 0.075, 1.30, BLACK, [sd * (s.W / 2 + 0.005), 0.22, 0]);                                  // side skirt
    V.box(0.045, 0.62, 0.012, '#7d0e17', [sd * (s.W / 2 + 0.003), 0.56, -0.62]);                          // door seam (rear)
    V.box(0.045, 0.62, 0.012, '#7d0e17', [sd * (s.W / 2 + 0.003), 0.56, 0.58]);                           // door seam (front)
    V.box(0.04, 0.035, 0.16, BLACK, [sd * (s.W / 2 + 0.004), 0.70, -0.28]);                               // door handle
    V.box(0.10, 0.07, 0.16, BLACK, [sd * (s.W / 2 + 0.06), hb + 0.07, 0.52]);                            // mirror
    V.box(0.30, 0.012, 0.36, BLACK, [sd * 0.58, 0.717, 1.78], [0.245, 0, 0]);                              // bonnet vent beside the logo (sits 1.2 cm proud of the bonnet)
    V.box(0.05, 0.20, 0.10, BLACK, [sd * 0.55, ht + 0.12, rear + 0.40]);                                  // wing strut
  }
  V.box(s.W - 0.34, 0.04, 0.34, BLACK, [0, ht + 0.235, rear + 0.40]);                                    // wing
  V.box(s.W - 0.34, 0.03, 0.07, RED, [0, ht + 0.265, rear + 0.31]);                                      // red leading edge accent
  // grille + fog lamps
  V.box(0.62, 0.10, 0.03, BLACK, [0, hn - 0.30, front + 0.012]);
  V.box(0.62, 0.012, 0.03, CHROME, [0, hn - 0.285, front + 0.02]);
  for (const sd of [-1, 1]) V.box(0.22, 0.07, 0.03, BLACK, [sd * 0.62, 0.30, front + 0.012]);
  // exhausts
  for (const sd of [-1, 1]) V.cyl(0.048, 0.048, 0.14, CHROME, [sd * 0.46, 0.28, rear - 0.01], [Math.PI / 2, 0, 0], 8);

  // ---- lamps (emissive): head lamps / DRL (white), tail bar + corner lenses (red)
  const lensX = s.W / 2 - 0.30;
  for (const sd of [-1, 1]) {
    LH.box(0.42, 0.075, 0.04, '#ffffff', [sd * lensX, hn - 0.12, front - 0.005]);
    LH.box(0.14, 0.035, 0.04, '#ffffff', [sd * (lensX - 0.30), hn - 0.115, front - 0.012]);
    LT.box(0.34, 0.09, 0.04, '#ffffff', [sd * (lensX + 0.02), ht - 0.12, rear + 0.01]);
  }
  LT.box(s.W - 1.08, 0.04, 0.04, '#ffffff', [0, ht - 0.115, rear + 0.01]);
  V.box(0.46, 0.085, 0.05, '#3a1014', [-lensX, ht - 0.12, rear + 0.005]);                                // dull tail housings behind the glowing lenses
  V.box(0.46, 0.085, 0.05, '#3a1014', [lensX, ht - 0.12, rear + 0.005]);
  for (const sd of [-1, 1]) V.box(0.48, 0.095, 0.05, '#20232a', [sd * lensX, hn - 0.12, front - 0.012]);   // head lamp housings

  // ---- driver + wheel (own meshes: the wheel turns, the driver can be hidden in the bonnet view)
  const jacket = '#2b3a67';
  DR.box(0.44, 0.50, 0.26, jacket, [0.4, 0.78, -0.52]);
  DR.box(0.12, 0.40, 0.12, jacket, [0.66, 0.80, -0.30], [0.9, 0, 0.1]);
  DR.box(0.12, 0.40, 0.12, jacket, [0.14, 0.80, -0.30], [0.9, 0, -0.1]);
  DR.sph(0.115, '#e8b894', [0.4, 1.10, -0.50], 8);
  DR.sph(0.125, '#3a2a22', [0.4, 1.13, -0.54], 8, [1, 0.8, 1]);

  // Inner wheel wells and a closed lower chassis keep damaged arches from
  // exposing the opposite wheel or daylight through the hollow outer shell.
  V.box(S.W - 0.46, 0.36, S.len - 0.25, BLACK, [0, 0.38, S.centerZ]);
  for (const side of [-1, 1]) for (const z of [-S.wb / 2, S.wb / 2])
    V.cyl(S.R + 0.025, S.R + 0.025, 0.045, BLACK, [side * (S.track / 2 - 0.18), S.R - 0.03, z], [0, 0, Math.PI / 2], 18);
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

  // steering wheel
  const steerWheel = new THREE.Group(); steerWheel.position.set(0.4, 0.88, 0.16); steerWheel.rotation.x = Math.PI + 0.55;       // the rim faces the driver (normal back and slightly up)
  { const W = new VB(0); W.torus(0.17, 0.018, '#15171a', [0, 0, 0], [0, 0, 0], 5, 16); W.box(0.022, 0.30, 0.02, '#15171a', [0, 0, 0]); W.box(0.30, 0.022, 0.02, '#15171a', [0, 0, 0]);
    steerWheel.add(new THREE.Mesh(W.build(), mat.toon('#ffffff', { vertexColors: true, paint: 0, name: 'drive-steer' }))); }
  root.add(steerWheel);

  // ---- the cockpit set for camera mode 2 (drive/cockpit.js): hidden until setView(true); it replaces the body, glass, lamps, plates, roof logo and the exterior wheel while the eye is inside
  const frontPts = top.slice(0, 7).concat([[0.62, hh], [0.62, 0.34], [front - 0.09, yb + 0.10]]);
  const cockpit = createCockpit(ctx, { S, frontPts, bev: s.bev, taper, paintTint, H, zr0, zr1 });
  root.add(cockpit.group);

  // ---- wheels: pivot (steering about Y) -> mesh (rolling about X). The geometry has its rim detail on +X; the right side is mirrored.
  const WV = new VB(0), R = S.R, tw = S.tw;
  WV.cyl(R, R, tw, TYRE, [0, 0, 0], [0, 0, Math.PI / 2], 18);
  WV.cyl(R * 0.69, R * 0.69, tw + 0.025, '#b7bdc6', [0, 0, 0], [0, 0, Math.PI / 2], 18);
  WV.cyl(R * 0.52, R * 0.52, tw + 0.040, '#2a2d33', [0, 0, 0], [0, 0, Math.PI / 2], 18);
  for (let k = 0; k < 5; k++) WV.box(0.02, R * 1.28, 0.06, SILVER, [tw / 2 + 0.032, 0, 0], [k * Math.PI * 2 / 5, 0, 0]);
  WV.cyl(0.05, 0.05, tw + 0.07, '#f2f4f7', [0, 0, 0], [0, 0, Math.PI / 2], 8);
  WV.cyl(R * 0.62, R * 0.62, 0.02, '#d02430', [-tw / 2 + 0.03, 0, 0], [0, 0, Math.PI / 2], 14);        // brake disc glow (red caliper look)
  const wheelGeo = WV.build(), wheelMat = mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'drive-wheel' });
  const wheels = [];
  for (const [sx, z, front] of [[1, S.wb / 2, true], [-1, S.wb / 2, true], [1, -S.wb / 2, false], [-1, -S.wb / 2, false]]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * S.track / 2, R, z);
    const m = new THREE.Mesh(wheelGeo, wheelMat); m.castShadow = true; m.scale.x = sx; m.name = 'drive-wheel';
    pivot.add(m); root.add(pivot); wheels.push({ pivot, mesh: m, front });
  }

  // ---- Bibliotechka logo decals + plates
  const logo = logoTexture(logoUrl);
  const decalMat = mat.toon('#ffffff', { map: logo, alphaTest: 0.5, side: 'double', polygonOffset: -2, paint: 0.0, name: 'drive-logo' });
  const plane = (w, h) => new THREE.PlaneGeometry(w, h);
  const decal = (w, x, y, z, rx, ry) => { const m = new THREE.Mesh(plane(w, w), decalMat); m.rotation.order = 'YXZ'; m.rotation.set(rx, ry, 0); m.position.set(x, y, z); m.name = 'drive-logo'; root.add(m); return m; };
  const roofLogo = decal(0.80, 0, H + 0.030, (zr0 + zr1) / 2, -Math.PI / 2, Math.PI);                      // roof: the top of the icon points forward
  // the bonnet and door logos are removed for now: the roof carries the only one
  const pTex = plateTexture(plate[0], plate[1]);
  const plateMat = mat.toon('#ffffff', { map: pTex, paint: 0, name: 'drive-plate' });
  const pf = new THREE.Mesh(plane(0.52, 0.113), plateMat); pf.position.set(0, 0.40, front + 0.052); root.add(pf);
  const pr = new THREE.Mesh(plane(0.52, 0.113), plateMat); pr.position.set(0, 0.40, rear - 0.052); pr.rotation.y = Math.PI; root.add(pr);

  // ---- nitro flames (additive cones at the exhausts) and the neon underglow
  const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.18), transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, name: 'drive-flame' });
  const flameGeo = new THREE.ConeGeometry(0.12, 1, 10, 1, true); flameGeo.rotateX(-Math.PI / 2); flameGeo.translate(0, 0, -0.5);    // apex points back (-Z), base at the pipe
  const flames = [];
  for (const sd of [-1, 1]) { const f = new THREE.Mesh(flameGeo, flameMat); f.position.set(sd * 0.46, 0.28, rear - 0.07); f.visible = false; f.scale.set(1, 1, 0.01); root.add(f); flames.push(f); }
  ctx.noOutline(flames[0]); ctx.noOutline(flames[1]);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(0.2, 0.9, 1.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, name: 'drive-glow' });
  const glow = new THREE.Mesh(plane(2.9, 5.2), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.06, 0.05); root.add(glow); ctx.noOutline(glow);

  const beamMat = new THREE.MeshBasicMaterial({ map: beamTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, name: 'drive-beam' });
  const beamGeo = new THREE.PlaneGeometry(7.5, 18); beamGeo.rotateX(-Math.PI / 2);
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(0, 0.05, front + 9.0); root.add(beam); ctx.noOutline(beam);
  root.traverse((o) => { if (o.isMesh && o !== glow) { o.frustumCulled = false; } });
  for (const m of [lampH, lampT, driver]) m.castShadow = false;

  const night = ctx.shared.uNight;
  let flameK = 0, inside = false;
  const outer = [body, glass, lampH, lampT, steerWheel, roofLogo, pf, pr];
  const api = {
    root, wheels, steerWheel, driver, flames, glow, headMat, tailMat, body, glass, cockpit,
    /** pose: x y z yaw (rotY) pitchUp roll; steer in -1..1 (+ = left); roll the wheels by `spin` radians since the last call; brake / boost / lights 0..1 */
    set(p) {
      root.position.set(p.x, p.y, p.z); root.rotation.set(-p.pitch, p.yaw, p.roll);
      const del = p.steerAngle, sp = p.spin;
      for (const w of wheels) { if (w.front) w.pivot.rotation.y = del; w.mesh.rotation.x += sp; }
      steerWheel.rotation.z = -p.steer * 2.2;
      if (inside) cockpit.update({ steer: p.steer, kmh: p.kmh || 0, rpm: p.rpm ?? 0.15, gear: p.gear || 'N', night: night ? night.value : 0 });
      const n = night ? night.value : 0;
      headMat.color.setScalar(p.lights ? 0.9 + 1.6 * n : 0.55);
      const br = p.brake > 0.05 ? 2.2 + 0.5 * n : 0.45 + 0.9 * n;
      tailMat.color.set(Math.min(2.6, br), Math.min(2.6, br) * 0.1, Math.min(2.6, br) * 0.08);
      glowMat.opacity = Math.min(1, 0.22 + 0.7 * n) * (p.glow ?? 1);
      beamMat.opacity = p.lights ? Math.min(0.75, 0.9 * n) : 0; beam.visible = beamMat.opacity > 0.01;
      // the flames fade in / out smoothly (no popping when the nitro starts / stops) and flicker with a smooth deterministic wobble instead of a random size every frame
      flameK += ((p.boost > 0.05 ? 1 : 0) - flameK) * Math.min(1, (p.dt || 0.016) * 9);
      const tt = performance.now() / 1000, wob = 1 + 0.16 * Math.sin(tt * 43) + 0.10 * Math.sin(tt * 29 + 1.3);
      for (let i = 0; i < 2; i++) { const fl = flames[i]; fl.visible = flameK > 0.03; const w = 1 + 0.12 * Math.sin(tt * 37 + i * 2.1); fl.scale.set(0.45 + 0.5 * flameK, 0.45 + 0.5 * flameK, (0.15 + 0.95 * flameK) * wob * w); }
    },
    /** camera mode 2 (cockpit): the exterior shell, glass, lamps, plates, roof logo and the exterior wheel are replaced by the cockpit set (drive/cockpit.js) */
    setView(v) {
      inside = !!v; driver.visible = !inside;
      for (const o of outer) o.visible = !inside;
      cockpit.setVisible(inside);
    },
  };
  return api;
}
