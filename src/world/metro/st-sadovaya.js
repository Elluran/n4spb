// metro/st-sadovaya.js — Sadovaya (line 5, -71 m, 1991; docs/research/metro-south-sennaya.md section 4, photos refs/sennaya sadovaya_*).
//   hall       single vault "Leningrad type" (hall-vault.js: 23.2 m span, tracks 8.9 m from the axis): smooth cream-white vault with shallow radial ribs, 25 BRONZE LATTICE LAMP ARCHES (instanced, with
//              the angled fluorescent boxes over the platform edges), dark red-brown granite track walls under the thin violet band, the white marble frieze with brass letters «САДОВАЯ» and
//              brass mouldings, gilded slatted service doors, red-brown granite floor, the curved bench and the info stands, the SUNK STAIRWELL in the middle (the Spasskaya transfer)
//   way out    the north end: a wide granite stair up 5.6 m through the end wall (over the running tunnels), the S-shaped passage west and back south to the foot of the 3-lane incline that climbs
//              SSW to the cassa hall of the pedestrian underpass under Sennaya square (-4.5 m): turnstiles, ticket machines, pillars, then the spur and the X of the underpass with four street
//              stair pits (OSM refs 1-4: granite parapets, lit signs, no kiosks)
//   south end  the opening and the lower hall of the 4-lane bank from the Sennaya passage (the bank, its upper hall and the passage are hub-sennaya.js's)
import * as THREE from 'three';
import { FRAMES, ESC2, SD_PZ, SD_UP_Y, SD_LOW_Y, UNDERPASS_Y, SD_PITS, SD_JUNCTIONS, toWorld } from '../data/metro.js';
import { Space, extrudeZ, archRing, smoothPath, minRadius } from './lib.js';
import { buildVaultHall, sharedFloor } from './hall-vault.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { buildJunction } from './junction.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet, stairPit } from './petro-kit.js';
import { stripFloor } from './vo-kit.js';

export const SD_DIMS = { EDGE: 7.4, TRK: 8.9, WALL: 11.6, SPRING: 3.0, B: 5.6 };              // tracks 8.9 m off the axis (OSM 9.35): the 4-lane bank at the south end passes 0.5 m clear of the running tunnels
/** the sunk stairwell of the Spasskaya passage (hall frame): the flight from z1 (platform level) down along -z to zFoot (SD_LOW_Y), the landing to z0; the passage leaves the landing west (-x) at z = cz */
export const SD_WELL = { x0: -2.2, x1: 2.2, z0: -13.0, z1: 1.6, zFoot: 1.6 - (-71 - SD_LOW_Y) / Math.tan(Math.PI / 6), cz: -10.2 };
const FONT = '"Rubik","Noto Sans",sans-serif', PURPLE = '#6E0A78';

export function buildSadovaya(ctx, M, X, K) {
  const { mat, tex } = ctx;
  const SD = FRAMES.sadovaya, PZ = SD_PZ, FY = SD.y, E = ESC2.sadovaya, UY = UNDERPASS_Y, res = {};
  const name = 'Садовая', nameEn = 'Sadovaya';
  const S = new Space(ctx, SD, { name: 'sadovaya' }), k = S.k;

  // ================================================================ the hall
  const wallMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'sd-wall', { base: '#6e3b34', w: 1.2, h: 0.9, cols: 2, rows: 3, veins: 22, vein: 'rgba(200,170,160,0.22)', lite: 'rgba(255,220,210,0.06)', dark: 'rgba(30,10,8,0.12)', joint: 'rgba(25,10,8,0.45)' }) });
  const floorMat = sharedFloor(ctx, M, '#ffd2c4');
  const W = SD_WELL;
  const hall = buildVaultHall(ctx, M, S, { id: 'sd', FY, PZ, dims: SD_DIMS, name, nameEn, ribPitch: 3.6, skin: { wallMat, floorMat, band: '#3e1e5a', bandY: 2.62, vault: '#eee6da', rib: '#f6f1e8' },
    endHole: { N: { halfW: 4.0, spring: 1.0 }, S: { halfW: 4.4, spring: 1.0 } }, holes: [{ x0: W.x0, x1: W.x1, z0: W.z0, z1: W.z1 }] });
  const { EDGE, TRK, WALL, SPS, BED, B } = hall;
  res.hall = hall;
  // north end: the real tunnel to Admiralteyskaya (links-south.js, the hub's own deferral); south end: the real tunnel to Zvenigorodskaya of the Vitebsky node (links-vitebsky.js) when metro.js
  // lists 'sadovaya:1' in REAL_ENDS (its flush builds these stubs only when that link did not come: the closure checks X.realLinks itself), else stubs now
  for (const m of hall.mouths) {
    const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, BED, {});
    if (m.zs < 0) K.defer('sadovaya:-1', go); else if (X.realEnd && X.realEnd('sadovaya:1')) X.deferStub('sadovaya:1', () => { if (!(X.realLinks && X.realLinks['sadovaya>zvenigorodskaya'])) go(); }); else go();
  }
  const vInfo = { FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  K.well(S, { x0: W.x0, x1: W.x1, z0: W.z0, z1: W.z1, zFoot: W.zFoot, FY, yLow: SD_LOW_Y, open: { side: -1, zc: W.cz, w: 4.4, h: 2.9 }, stone: mat.toon('#4a4b50'), parapetMat: mat.toon('#55565c'), floorMat: K.passFloor });

  // ---- the bronze lattice lamp arches (25, one every 6 m) with the angled lamp boxes, the white marble frieze with brass letters, the brass mouldings, the gilded service doors
  {
    const R = WALL - 0.42, Bv = B - 0.42, n = 25, zs = Array.from({ length: n }, (_, i) => -72 + i * 6);
    const archGeo = extrudeZ(archRing(R, SPS, 0.2, SPS + 0.4, 0, 26, Bv), -0.14, 0.14), bronze = mat.toon('#8c7b4e');
    const im = new THREE.InstancedMesh(archGeo, bronze, n), d = new THREE.Object3D();
    zs.forEach((z, i) => { d.position.set(0, 0, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im);
    // the lamp boxes: two per side on the lower part of every arch (angled to follow the vault)
    const lampGeo = new THREE.BoxGeometry(1.5, 0.12, 0.34), lm = new THREE.InstancedMesh(lampGeo, M.lampWhite, n * 4); let q = 0;
    for (const z of zs) for (const sx of [-1, 1]) for (const t of [0.2, 0.42]) {
      const th = sx > 0 ? t * Math.PI : Math.PI - t * Math.PI, x = (R - 0.22) * Math.cos(th), y = SPS + (Bv - 0.22) * Math.sin(th), slope = Math.atan2(Bv * Math.cos(th), -R * Math.sin(th));
      d.position.set(x, y, z); d.rotation.set(0, 0, slope); d.updateMatrix(); lm.setMatrixAt(q++, d.matrix);
    }
    lm.instanceMatrix.needsUpdate = true; lm.userData.noBatch = true; lm.castShadow = false; lm.frustumCulled = false; S.group.add(lm);
    const marble = mat.toon('#e9e4da'), brass = mat.toon('#b09445'), letters = K.letters('sd-letters', name, '#a4863c');
    const door = mat.toon('#ffffff', { map: tex.draw(128, 256, (g, w, h) => { g.fillStyle = '#8a6d2a'; g.fillRect(0, 0, w, h); for (let x = 8; x < w - 6; x += 10) { g.fillStyle = '#d9b75c'; g.fillRect(x, 8, 5, h - 16); g.fillStyle = '#5d4a1c'; g.fillRect(x + 5, 8, 2, h - 16); } g.strokeStyle = '#e8c870'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); }, { key: 'sd-door' }) });
    for (const sx of [-1, 1]) {
      const a = sx > 0 ? WALL - 0.34 : -WALL + 0.14, b = sx > 0 ? WALL - 0.14 : -WALL + 0.34, fx = sx * (WALL - 0.35), rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      S.bx(a, b, FY + 3.02, FY + 3.56, -PZ, PZ, marble); S.bx(a - sx * 0.03, b - sx * 0.03, FY + 2.96, FY + 3.02, -PZ, PZ, brass); S.bx(a - sx * 0.03, b - sx * 0.03, FY + 3.56, FY + 3.62, -PZ, PZ, brass);
      for (const z of [-60, -30, 0, 30, 60]) { const p = k.plane(2.6, 0.36, letters, [fx - sx * 0.01, FY + 3.29, z], [0, rotY, 0]); p.castShadow = false; }
      for (const z of [-45, -15, 15, 45]) { const p = k.plane(1.1, 2.1, door, [sx * (WALL - 0.17), FY + 1.1, z], [0, rotY, 0]); p.castShadow = false; }
      const travelZ = sx < 0 ? 1 : -1;
      K.sg.lineScheme(S, { x: sx * (WALL - 0.16), y: FY + 1.55, z: 24, rotY, line: '5', currentId: 'sadovaya', dir: travelZ, ahead: K.sg.aheadOf(rotY, travelZ), w: 4.0, h: 1.08, res: 0.35 });
    }
  }
  // ---- the curved granite bench and the info stands south of the stairwell, the white globe lamps on stems at the north stair
  {
    const gr = mat.toon('#5d4f4a'), wood = M.woodDark;
    for (let i = 0; i < 7; i++) { const a = -0.6 + i * 0.2, x = 3.2 * Math.sin(a), z = 16 + 3.2 * Math.cos(a) - 3.2; k.box(1.0, 0.45, 0.55, gr, [x, FY + 0.225, z], [0, a, 0]); k.box(1.02, 0.05, 0.57, wood, [x, FY + 0.47, z], [0, a, 0]); }
    S.col(-2.4, 2.4, FY, FY + 0.5, 15.2, 16.4);
    for (const z of [26, -24]) { k.box(0.5, 2.2, 0.4, mat.toon('#2b2b44'), [0, FY + 1.1, z]); k.box(0.52, 0.3, 0.42, mat.toon(PURPLE), [0, FY + 2.05, z]); S.col(-0.3, 0.3, FY, FY + 2.3, z - 0.25, z + 0.25); }
    for (const sx of [-1, 1]) { const x = sx * 4.9, z = -PZ + 1.4; k.cyl(0.06, 0.08, 3.0, M.steelBlack, [x, FY + 1.5, z], null, 8); const l = k.sphere(0.32, M.lampWarm, [x, FY + 3.2, z], 12); l.castShadow = false; S.col(x - 0.12, x + 0.12, FY, FY + 3, z - 0.12, z + 0.12); }
  }
  // ---- hanging boards (signs.js)
  {
    const sg = K.sg, y = FY + 3.3;
    K.hang(S, { x: 0, y, z: -PZ + 6, rotY: 0, rodLen: 2.2, sections: [sg.sec.exit({ streets: [['Сенная площадь', 'Sennaya ploshchad'], ['Садовая улица', 'Sadovaya ulitsa']] }, 'u', true)] });
    K.hang(S, { x: 0, y, z: W.z1 + 3.0, rotY: 0, rodLen: 2.2, sections: [sg.sec.transfer({ to: 'spasskaya', line: '4', esc: true }, 'd')] });
    K.hang(S, { x: 0, y, z: PZ - 6, rotY: Math.PI, rodLen: 2.2, sections: [K.SEC.toSennaya()] });
  }
  // ---- the south end: the lower hall of the bank from the Sennaya passage (the bank is hub-sennaya.js's)
  const Es = ESC2.senSad, zFootS = S.L(Es.bottom.x, Es.bottom.z)[1];
  lowerHall(ctx, M, S, { A: Es.A, FY, z0: PZ + 0.5, z1: zFootS + 0.7, floorMat });

  // ================================================================ the way out: the north stair + the S-shaped passage (-65.4), the incline, the cassa hall of the underpass, the underpass, the pits
  const grp = X.mkGroup('sadovaya-exit'), Se = new Space(ctx, E.eframe, { name: 'sadovaya-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, mouth: false, trench: true, shellStart: 11, lanes: E.lanes, halfW: E.A });
  K.bulkhead(Se, E.A, E.FY, E.run, 3.3);
  res.esc = esc; res.Se = Se;
  const run = (SD_UP_Y - FY) / Math.tan(Math.PI / 6), zs0 = -(PZ + 0.35), zs1 = -(PZ + 1.0), zs2 = zs1 - run;                       // the stair: from the end wall up 5.6 m along -z
  const xyz = (q, y) => [q[0], y, q[1]], stair = [xyz(toWorld(SD, 0, zs0), FY), xyz(toWorld(SD, 0, zs1), FY)]; for (let i = 1; i <= 5; i++) { const q = toWorld(SD, 0, zs1 - run * i / 5); stair.push([q[0], FY + (SD_UP_Y - FY) * i / 5, q[1]]); }
  {
    const up = [-E.e[0], -E.e[1]], foot = [E.bottom.x, E.bottom.z], L = (x, z) => toWorld(SD, x, z), tN = [-Math.sin(SD.yaw), -Math.cos(SD.yaw)];
    const flat = smoothPath([L(0, zs2), L(0, zs2 - 3.5), L(-5, zs2 - 9), L(-15, zs2 - 11), L(-26, zs2 - 8), L(-33, zs2 + 0.5), [foot[0] - up[0] * 7, foot[1] - up[1] * 7], foot], tN, up, 2.5);
    X.debug.radii.sadovayaExit = minRadius(flat);
    X.cor('sadovaya-exit', grp, [...stair, ...flat.slice(1).map((p) => [p[0], SD_UP_Y, p[1]])], { w: 7.0, h: 2.7, rise: 1.4, noLift: true, wallMat: K.wall('#f2efe6'), vaultMat: mat.toon('#dfe8dc', { side: 'double' }), floorMat: K.passFloor });
    K.rampSteps(S, { x0: -3.45, x1: 3.45, zA: zs1, yA: FY, zB: zs2, yB: SD_UP_Y, mat: mat.toon('#8a827a') });
    res.stairN = stair.length;
    S.walk(-4.0, 4.0, -PZ - 1.2, -PZ + 0.2, FY, 1.1);                                                    // the sill of the north end opening
  }

  // ---- the cassa hall (escalator frame Sv: head = origin, +z = the descent NNE; the hall reaches back to z = -15 where the spur leaves)
  const fy = UY + 0.05, CH = UY + 3.6, HW = 9, Z0 = -15, Z1 = 12.6;
  const Sv = new Space(ctx, E.eframe, { name: 'sadovaya-cassa', zone: 'sadovaya-cassa' }), kv = Sv.k;
  const underWall = K.wall('#e3ded5'), underFloor = sharedFloor(ctx, M, '#ffe0d6');
  {
    const polyL = [[-HW, Z0], [HW, Z0], [HW, Z1], [-HW, Z1]], poly = polyL.map(([x, z]) => Sv.W(x, z)), hole = [[-E.A, 0], [E.A, 0], [E.A, 11.4], [-E.A, 11.4]].map(([x, z]) => Sv.W(x, z));
    const [dx, dz] = Sv.W(0, Z0);
    const room = buildPolyRoom(ctx, M, { id: 'sd-cassa', poly, y0: fy, ceil: CH, under: true, holes: [hole], doors: [{ x: dx, z: dz, w: 4.6, h: 2.8, arch: true }], wallMat: underWall, ceilMat: mat.toon('#f2f0ea', { side: 'double' }), colY: [UY - 1.5, UY + 4], lamps: false, floorMat: underFloor });
    res.cassa = room;
    stripFloor(Sv, polyL, [[-E.A - 0.3, E.A + 0.3, 0.3, 11.7]], fy, 1.0); Sv.walk(-2.5, 2.5, Z0 - 0.9, Z0 + 0.4, fy, 1.0);
    shaftParapet(Sv, M, { A: E.A, len: 11.4, y: fy, mat: mat.toon('#b9b3a9') });
    const zt = -4.5; for (let x = -4.8; x <= 4.81; x += 1.2) turnstile(kv, M, x, fy, zt, 0);
    for (const sx of [-1, 1]) { const a = sx > 0 ? 5.4 : -HW + 0.1, b = sx > 0 ? HW - 0.1 : -5.4; kv.box(b - a, 2.2, 0.08, M.glass, [(a + b) / 2, fy + 1.1, zt]); kv.box(b - a, 0.1, 0.12, M.stainless, [(a + b) / 2, fy + 2.25, zt]); Sv.col(a, b, fy - 1, fy + 2.4, zt - 0.15, zt + 0.15); }
    for (const [x, z] of [[-8.4, -8.5], [-8.4, -11], [8.4, -8.5], [8.4, -11]]) { kv.box(0.7, 1.9, 0.9, M.kiosk, [x, fy + 0.95, z]); kv.box(0.05, 0.5, 0.7, M.lampCool, [x - Math.sign(x) * 0.36, fy + 1.4, z]); Sv.col(x - 0.4, x + 0.4, fy - 1, fy + 2.2, z - 0.5, z + 0.5); }
    const pillar = mat.toon('#d6d0c4'); for (const [x, z] of [[-6.6, 3], [6.6, 3], [-6.6, 9], [6.6, 9]]) { kv.box(0.7, CH - fy, 0.7, pillar, [x, (CH + fy) / 2, z]); Sv.col(x - 0.38, x + 0.38, fy - 1, CH, z - 0.38, z + 0.38); }
    for (let z = Z0 + 2.5; z < Z1 - 1; z += 4) for (const x of [-6.5, 0, 6.5]) { if (z > -0.6 && z < 12 && Math.abs(x) < 5) continue; const m = kv.box(1.6, 0.06, 0.4, M.lampWhite, [x, CH - 0.05, z]); m.castShadow = false; const m2 = kv.box(1.6, 0.03, 0.12, mat.emissive('#d9f2dc', 1.2), [x, CH - 0.09, z]); m2.castShadow = false; }
    // the brass lattice screen on the west wall, the boards
    const lat = mat.decal('#ffffff', { map: tex.draw(256, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#b79f4c'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8); g.lineWidth = 3; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x + 24, h - 6); g.moveTo(x + 24, 6); g.lineTo(x, h - 6); g.stroke(); } }, { key: 'sd-lattice' }) });
    { const p = kv.plane(6.0, 2.4, lat, [-HW + 0.03, fy + 1.9, 3.0], [0, Math.PI / 2, 0]); p.castShadow = false; }
    K.hang(Sv, { x: 0, y: CH - 0.65, z: zt + 0.3, rotY: Math.PI, rodLen: 0.3, sections: K.SEC.sadTrains() });
    K.hang(Sv, { x: 0, y: CH - 0.65, z: Z0 + 2.2, rotY: 0, rodLen: 0.3, sections: [K.sg.sec.city('d')] });
  }

  // ---- the underpass: the three junctions of the X (J0 pits 3 / 4, J1 the spur, J2 pits 1 / 2), the corridors, the four pits
  const J = SD_JUNCTIONS, jr = 4.6, UC = { w: 4.6, h: 2.6, rise: 1.0, noLift: true, wallMat: underWall, floorMat: underFloor, vaultMat: mat.toon('#f0eee6', { side: 'double' }) };
  const jf = (P) => ({ x: P[0], z: P[1], yaw: J.yaw }), jx = [Math.cos(J.yaw), -Math.sin(J.yaw)], jz = [Math.sin(J.yaw), Math.cos(J.yaw)];
  const Sj = {};
  for (const [id, arms] of [['J0', { S: 0, W: 0, E: 0 }], ['J1', { N: 0, S: 0, E: 0 }], ['J2', { N: 0, W: 0, E: 0 }]]) {
    Sj[id] = new Space(ctx, jf(J[id]), { name: 'sadovaya-' + id });
    buildJunction(ctx, M, Sj[id], { x0: -jr, x1: jr, z0: -jr, z1: jr, y: UY, hw: 2.3, spring: 1.2, H: 3.5, arms });
  }
  const ugrp = X.mkGroup('sadovaya-underpass'), ucor = (n, pts) => X.cor(n, ugrp, pts.map((p) => [p[0], UY, p[1]]), UC);
  { const a = Sv.W(0, Z0 - 0.2), b = Sj.J1.W(jr + 0.2, 0), ta = [-E.e[0], -E.e[1]], tb = [-jx[0], -jx[1]];
    ucor('sadovaya-spur', smoothPath([a, [a[0] + ta[0] * 6, a[1] + ta[1] * 6], [b[0] - tb[0] * 6, b[1] - tb[1] * 6], b], ta, tb, 2.2)); }
  { const a = Sj.J0.W(0, jr + 0.2), b = Sj.J1.W(0, -jr - 0.2); ucor('sadovaya-diag-1', [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b]); }
  { const a = Sj.J1.W(0, jr + 0.2), b = Sj.J2.W(0, -jr - 0.2); ucor('sadovaya-diag-2', [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b]); }
  // the pits (a pit whose open hole would touch a carriageway or the water is not built: road integrity rule)
  const pitGroup = new THREE.Group(); pitGroup.name = 'sadovaya-pits'; ctx.addStatic(pitGroup);
  const oval = M.board(tex.draw(512, 128, (g, w, h) => { g.fillStyle = '#f1ede0'; tex.roundRect(g, 2, 2, w - 4, h - 4, 56); g.fill(); g.fillStyle = '#1d4e9b'; g.font = `800 84px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('М', 64, h / 2 + 5); g.fillStyle = '#2a2a30'; tex.fitText(g, name, 262, h * 0.38, 290, 46, FONT, 700); g.globalAlpha = 0.8; tex.fitText(g, nameEn, 262, h * 0.74, 290, 28, FONT, 500); g.globalAlpha = 1; for (const [i, c] of [['5', PURPLE], ['2', '#0078C9'], ['4', '#EA7125']].entries()) { g.fillStyle = c[1]; tex.roundRect(g, 420 + i * 30, 46, 26, 36, 6); g.fill(); g.fillStyle = '#fff'; g.font = `700 22px ${FONT}`; g.fillText(c[0], 433 + i * 30, 65); } }, { key: 'sd-oval' }), 1.0);
  const stone = mat.toon('#77746f'), steps = mat.toon('#9a958d'), coping = mat.toon('#8c8882');
  const L = ctx.L, onRoad = (x, z) => !!((L.isOnRoad && L.isOnRoad(x, z, 0)) || (L.waterwayAt && L.waterwayAt(x, z)));
  const armOf = { 1: ['J2', -1], 2: ['J2', 1], 3: ['J0', -1], 4: ['J0', 1] };
  res.pits = {}; res.skippedPits = [];
  for (const p of SD_PITS) {
    const yaw = Math.atan2(p.e[0], p.e[1]), c = Math.cos(yaw), s = Math.sin(yaw), hw = (p.w + 0.6) / 2;
    const corners = [[-hw, 0], [hw, 0], [hw, p.open], [-hw, p.open], [0, p.open / 2]].map(([lx, lz]) => [p.mouth[0] + lx * c + lz * s, p.mouth[1] - lx * s + lz * c]);
    if (corners.some(([x, z]) => onRoad(x, z))) { console.warn('[metro] Sadovaya: stair pit ' + p.n + ' would open on a carriageway / in the water: not built'); res.skippedPits.push(p.id); continue; }
    const info = K.slabbed(() => stairPit(ctx, M, pitGroup, p, { depth: -UY, sign: oval, stone, steps, coping }));
    const [jid, side] = armOf[p.n], arm = Sj[jid].W(side * (jr + 0.2), 0), tin = [-side * jx[0], -side * jx[1]];
    ucor('sadovaya-pit-' + p.n, smoothPath([info.foot, [info.foot[0] + p.e[0] * 2.5, info.foot[1] + p.e[1] * 2.5], [arm[0] - tin[0] * 2.5, arm[1] - tin[1] * 2.5], arm], p.e, tin, 1.5));
    res.pits[p.n] = { ...p, ...info };
  }
  // boards in the underpass: at J1 toward the cassa, at J0 / J2 toward the pits
  { const sg = K.sg, gu = K.worldGroup('sadovaya-underpass-signs');
    { const q = Sj.J1.W(jr - 0.9, 0); K.boardAt(gu, q[0], UY + 2.8, q[1], -jx[0], -jx[1], K.SEC.sadTrains(), { rodLen: 0.2 }); }
    for (const id of ['J0', 'J2']) { const q = Sj[id].W(0, id === 'J0' ? jr - 0.9 : -jr + 0.9), f = id === 'J0' ? jz : [-jz[0], -jz[1]]; K.boardAt(gu, q[0], UY + 2.8, q[1], f[0], f[1], [sg.sec.city('u')], { rodLen: 0.2 }); } }

  // ================================================================ the station object, the ways out and in (tests)
  const rt = X.rtOf('sadovaya', X.net.sadovaya, SD, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'sadovaya', name, nameEn, frame: SD, stock: '717-l5', line: '5', idx: X.net.sadovaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Садовая». Переход на станции «Сенная площадь» и «Спасская». Выход на Сенную площадь и Садовую улицу'),
  });
  X.stations.sadovaya = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; }, SdW = (x, z, tol) => { const q = toWorld(SD, x, z); return tol ? [q[0], q[1], tol] : q; };
  const get = (debug, n) => { const c = debug.corridors.find((q) => q.name === n); return c ? c.pts.map((q) => [q[0], q[2]]) : []; }, thin = (a, s = 3) => a.filter((_, i, b) => i % s === 0 || i === b.length - 1);
  const pitW = (n, lx, lz, tol) => { const p = res.pits[n]; if (!p) return null; const c = Math.cos(p.yaw), s = Math.sin(p.yaw), q = [p.mouth[0] + lx * c + lz * s, p.mouth[1] - lx * s + lz * c]; return tol ? [...q, tol] : q; };
  const exitPit = res.pits[4] ? 4 : res.pits[3] ? 3 : null, entryPit = res.pits[1] ? 1 : res.pits[2] ? 2 : null;
  const toPit = (debug, n, rev) => { const [jid] = armOf[n], c = thin(get(debug, 'sadovaya-pit-' + n), 2); return rev ? [Sj[jid].W(0, 0), ...c.reverse()] : [...c, Sj[jid].W(0, 0)]; };
  res.exitRoute = (debug) => {
    if (!exitPit) return null;
    const flat = thin(get(debug, 'sadovaya-exit').slice(res.stairN)), p = res.pits[exitPit], n = exitPit;
    const viaJ = n === 4 || n === 3 ? [Sj.J1.W(0, 0), ...thin(get(debug, 'sadovaya-diag-1')).reverse(), Sj.J0.W(0, 0)] : [Sj.J1.W(0, 0), ...thin(get(debug, 'sadovaya-diag-2')), Sj.J2.W(0, 0)];
    return { start: [...SdW(0, -40), FY], points: [SdW(0, -PZ + 3), SdW(0, zs0 - 0.3, 0.6), SdW(0, zs1 - run / 3, 0.6), SdW(0, zs1 - 2 * run / 3, 0.6), SdW(0, zs2 - 0.6, 0.6), ...flat, SeW(2, E.run - 0.6, 0.4), SeW(2, E.run - 4, 0.3), SeW(2, 60, 0.3), SeW(2, 10, 0.3), SeW(2, 0.5, 0.3), SeW(2, -3), SeW(0, -9), SeW(0, Z0 + 1.2), ...thin(get(debug, 'sadovaya-spur')), ...viaJ.slice(1), ...toPit(debug, n, true).slice(1), pitW(n, 0, p.run - 1, 0.5), pitW(n, 0, p.run - 4, 0.4), pitW(n, 0, 1, 0.4), pitW(n, 0, -3.5)],
      door: p.mouth, out: pitW(n, 0, -3.5), outward: [-p.e[0], -p.e[1]] };
  };
  res.entryRoute = (debug) => {
    if (!entryPit) return null;
    const flat = thin(get(debug, 'sadovaya-exit').slice(res.stairN)), p = res.pits[entryPit], n = entryPit;
    const viaJ = n === 1 || n === 2 ? [...thin(get(debug, 'sadovaya-diag-2')).reverse(), Sj.J1.W(0, 0)] : [...thin(get(debug, 'sadovaya-diag-1')), Sj.J1.W(0, 0)];
    return { start: [...pitW(n, 0, -3.5), 0], points: [pitW(n, 0, 1, 0.6), pitW(n, 0, p.run - 1.5, 0.6), ...toPit(debug, n, false), ...viaJ, ...thin(get(debug, 'sadovaya-spur')).reverse(), SeW(0, Z0 + 1.5), SeW(-1, -6), SeW(0, -1.6), SeW(0, 3, 0.4), SeW(0, E.run - 2, 0.5), SeW(0, E.run + 1.2), ...flat.reverse(), SdW(0, zs2 - 0.5, 0.6), SdW(0, zs1 - 2 * run / 3, 0.6), SdW(0, zs1 - run / 3, 0.6), SdW(0, zs0 + 0.5, 0.6), SdW(0, -PZ + 4), SdW(0, -40)], end: { station: 'sadovaya', y: FY } };
  };
  Object.assign(res, { S, Sv, Sj, rt, FY, vInfo, name, junctions: Sj });
  return res;
}
