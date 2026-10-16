// metro/st-spasskaya.js — Spasskaya (line 4, -60 m, 2009, own vestibule 2013; docs/research/metro-south-sennaya.md section 5, photos refs/sennaya spasskaya_*).
//   hall       three-vault PYLON station (hall-pylon.js, own cross-section, seven 3 m passages per side every 20 m: solid pylon walls of 17 m): honey travertine with darker bands, STEPPED CAPITALS of four
//              projecting slabs with downlights in their soffits, white arc-panel vault with thin joints and the continuous cove light, polished dark granite floor with a lighter path band,
//              wooden benches along the pylon walls, travertine track walls on a black granite plinth with the thin cut name over the red-orange band (signs.js), line schemes
//   NW end     the RELIEF HALL (-55.4 m) over the running tunnel beyond the north-west end wall: a granite stair of 4.6 m rises to it through the end wall; ochre stone walls with medallion panels,
//              lanterns, the red wooden double door (a service door: closed), the bronze medallion «ЗОДЧЕСТВУ ПЕТЕРБУРГА»; from it the Sadovaya passage (hub-sennaya.js) and the way out
//   way out    a passage east along the hall to the foot of the 4-lane incline (OSM: 54 m off the axis) that climbs due east to the pavilion w245455781 on Sennaya square (turnstiles, the three
//              arched smalt mosaic panels of the old square in pale marble frames)
//   SE end     the opening and the lower hall of the 4-lane bank from the Sennaya passage (the bank is hub-sennaya.js's)
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, SS_PZ, SS_REL_Y, toWorld } from '../data/metro.js';
import { Space, extrudeZ, archRing, floorGeo, smoothPath, minRadius } from './lib.js';
import { buildPylonHall } from './hall-pylon.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet, insetPoly, ringOf, doorFrame } from './petro-kit.js';
import { stripFloor } from './vo-kit.js';
import { sharedFloor } from './hall-vault.js';

export const SS_DIMS = { C: 5.2, PY: 7.2, EDGE: 9.0, TRK: 10.5, WALL: 13.9, RS: 3.35 };
/** the relief hall (hall frame, floor SS_REL_Y): the stair from the NW end wall enters its hall-side wall (z1) at x = 0, the way out leaves the same wall at x = xS, the Sadovaya passage its east wall (x1) at z = zE */
export const SS_REL = { x0: -5, x1: 26, z0: -101, z1: -90, xS: 20, zE: -97 };
const BLDG = 'w245455781', OW = 3.0, FONT = '"Rubik","Noto Sans",sans-serif', SERIF = '"Noto Serif","Times New Roman",serif';

export function buildSpasskaya(ctx, M, X, K) {
  const { mat, tex } = ctx;
  const SS = FRAMES.spasskaya, PZ = SS_PZ, FY = SS.y, E = ESC2.spasskaya, R = SS_REL, RY = SS_REL_Y, res = {};
  const name = 'Спасская', nameEn = 'Spasskaya';
  const S = new Space(ctx, SS, { name: 'spasskaya' }), k = S.k;

  // ================================================================ the hall
  const trav = mat.toon('#ffffff', { map: panelTex(ctx, M, 'ss-trav', { base: '#cdae74', w: 0.9, h: 0.45, cols: 2, rows: 4, veins: 16, vein: 'rgba(140,100,40,0.24)', lite: 'rgba(255,240,200,0.10)', dark: 'rgba(110,70,20,0.13)', joint: 'rgba(120,88,40,0.36)' }) });
  const floorMat = sharedFloor(ctx, M, '#5f636c');
  const hall = buildPylonHall(ctx, M, S, { id: 'ss', FY, PZ, name, nameEn, plain: true, noMeander: true, dims: SS_DIMS, pitch: 20, openW: OW, openSpring: 2.0, pylonMat: trav, trackMat: trav, floorMat,
    vaultMat: mat.toon('#f1eee2', { side: 'double' }), endHole: { N: { halfW: 3.3, spring: 0.8 }, S: { halfW: 4.6, spring: 1.0 } } });
  const { C, PY, EDGE, TRK, WALL, BED, SPS, SPC } = hall;
  res.hall = hall;
  for (const m of hall.mouths) { const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, BED, {}); K.defer(m.zs > 0 ? 'spasskaya:1' : 'spasskaya:-1', go); }     // both ends: real tunnels (Dostoevskaya, Gorny Institut)
  const vInfo = { openings: hall.openings, FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  S.walk(-3.3, 3.3, -PZ - 0.9, -PZ + 0.3, FY, 1.1);                                                    // the sill of the NW opening (the relief stair)

  // ---- stepped capitals (four slabs) beside every passage on both faces of the pylon walls, downlights in their soffits; the panel joints of the vault; the path band; benches
  {
    const capM = mat.toon('#d6b77c'), slabs = [], lamps = [];
    for (const zo of hall.openZc) for (const sx of [-1, 1]) for (const face of [sx * C, sx * PY]) for (const zz of [zo - OW / 2 - 0.55, zo + OW / 2 + 0.55]) {
      const inward = face === sx * C ? -sx : sx;                                                              // the slabs project into the central hall (central face) or over the platform
      for (let j = 0; j < 4; j++) { const p = 0.08 + 0.1 * j, wz = 1.0 + 0.16 * j; slabs.push([face + inward * p / 2, FY + 3.05 + j * 0.15, zz, p, 0.15, wz]); }
      lamps.push([face + inward * 0.2, FY + 2.99, zz]);
    }
    const box = new THREE.BoxGeometry(1, 1, 1), im = new THREE.InstancedMesh(box, capM, slabs.length), d = new THREE.Object3D();
    slabs.forEach(([x, y, z, w, h, dz], i) => { d.position.set(x, y + h / 2, z); d.scale.set(w, h, dz); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im);
    const lm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 10), M.lampWarm, lamps.length);
    d.scale.set(1, 1, 1); lamps.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.updateMatrix(); lm.setMatrixAt(i, d.matrix); });
    lm.instanceMatrix.needsUpdate = true; lm.userData.noBatch = true; lm.castShadow = false; lm.frustumCulled = false; S.group.add(lm);
    // the arc panels of the central vault: thin joints every 2.4 m
    const n = Math.floor((2 * PZ) / 2.4), jg = extrudeZ(archRing(C - 0.03, SPC, 0.03, SPC + 0.05, 0, 20), -0.03, 0.03), jm = new THREE.InstancedMesh(jg, mat.toon('#c9c4b6'), n);
    for (let i = 0; i < n; i++) { d.position.set(0, 0, -PZ + 1.2 + i * 2.4); d.updateMatrix(); jm.setMatrixAt(i, d.matrix); }
    jm.instanceMatrix.needsUpdate = true; jm.userData.noBatch = true; jm.castShadow = false; jm.frustumCulled = false; S.group.add(jm);
    { const plinth = mat.toon('#2a2a2e'); let z0 = -PZ; const segs = []; for (const zo of hall.openZc) { segs.push([z0, zo - OW / 2]); z0 = zo + OW / 2; } segs.push([z0, PZ]);
      for (const sx of [-1, 1]) for (const [a, b] of segs) S.bx(sx * (C - 0.02) - 0.03, sx * (C - 0.02) + 0.03, FY, FY + 0.32, a, b, plinth); }        // dark granite plinth along the central faces (not across the passages)
    for (const sx of [-1, 1]) S.bx(sx > 0 ? PY : -PY - 0.1, sx > 0 ? PY + 0.1 : -PY, FY + 3.74, FY + 3.82, -PZ + 0.5, PZ - 0.5, M.lampWarm);       // the cove light of the side vaults over the platforms
    { const band = mat.decal('#7c7f88'); const p = k.plane(2.2, 2 * PZ - 2, band, [0, FY + 0.006, 0], [-Math.PI / 2, 0, 0]); p.castShadow = false; }
    const wood = mat.toon('#8a5a32'), stoneB = mat.toon('#b89a62');
    for (const sx of [-1, 1]) for (let i = 0; i < hall.openZc.length - 1; i++) { const zc = (hall.openZc[i] + hall.openZc[i + 1]) / 2; for (const dz of [-4.5, 4.5]) { const z = zc + dz, x = sx * (C - 0.35); k.box(0.5, 0.42, 3.0, stoneB, [x, FY + 0.21, z]); k.box(0.56, 0.06, 3.05, wood, [x, FY + 0.45, z]); S.col(x - 0.28, x + 0.28, FY, FY + 0.5, z - 1.5, z + 1.5); } }
  }
  // ---- track walls: black granite plinth, the red-orange band with the white names (signs.js), the thin cut name above it, line schemes
  {
    const letters = K.letters('ss-letters', name, '#9a7f4c'), black = mat.toon('#1a1a1c');
    for (const sx of [-1, 1]) {
      const fx = sx * (WALL - 0.15), rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2, a = sx > 0 ? WALL - 0.2 : -WALL + 0.16, b = sx > 0 ? WALL - 0.16 : -WALL + 0.2;
      S.bx(a, b, BED, FY + 0.8, -PZ, PZ, black);
      K.sg.trackBand(S, { x: fx, y: FY + 2.12, z0: -PZ + 1.5, z1: PZ - 1.5, rotY, line: '4', name, nameEn, every: 10 });
      for (const z of [-50, -10, 30, 70]) { const p = k.plane(3.6, 0.42, letters, [fx - sx * 0.02, FY + 2.75, z], [0, rotY, 0]); p.castShadow = false; }
      const travelZ = sx < 0 ? 1 : -1;
      K.sg.lineScheme(S, { x: fx - sx * 0.01, y: FY + 1.4, z: 10, rotY, line: '4', currentId: 'spasskaya', dir: travelZ, ahead: K.sg.aheadOf(rotY, travelZ), w: 4.0, h: 1.08, res: 0.35 });
    }
  }
  // ---- hanging boards (signs.js)
  {
    const sg = K.sg, y = FY + 3.2;
    K.hang(S, { x: 0, y, z: -PZ + 6, rotY: 0, rodLen: 1.6, sections: K.SEC.spasNW() });
    K.hang(S, { x: 0, y, z: PZ - 6, rotY: Math.PI, rodLen: 1.6, sections: [K.SEC.toSennaya()] });
    K.hang(S, { x: 0, y, z: 0, rotY: 0, rodLen: 1.6, sections: [sg.sec.trains('4', 1, null), sg.sec.trains('4', -1, null)] });
  }
  // ---- the SE end: the lower hall of the bank from the Sennaya passage
  const Es = ESC2.senSpa, zFootS = S.L(Es.bottom.x, Es.bottom.z)[1];
  lowerHall(ctx, M, S, { A: Es.A, FY, z0: PZ + 0.5, z1: zFootS + 0.7, floorMat });
  S.walk(-4.6, 4.6, PZ - 0.4, PZ + 1.2, FY, 1.1);                                                    // the sill of the SE opening (the platform ends at PZ, the lower hall begins 0.3 m behind the end wall)

  // ================================================================ the NW end: the stair up to the relief hall, the relief hall
  const grp = X.mkGroup('spasskaya-relief');
  const zr0 = -(PZ + 0.35), zr1 = -(PZ + 0.9), zr2 = R.z1 + 0.4, rise = RY - FY;                         // the stair: from the end wall up along -z to the hall-side wall of the relief hall
  const xyz = (q, y) => [q[0], y, q[1]], stair = [xyz(toWorld(SS, 0, zr0), FY), xyz(toWorld(SS, 0, zr1), FY)]; for (let i = 1; i <= 5; i++) { const q = toWorld(SS, 0, zr1 + (zr2 - zr1) * i / 5); stair.push([q[0], FY + rise * i / 5, q[1]]); }
  { const q = toWorld(SS, 0, R.z1 - 0.3); stair.push([q[0], RY, q[1]]); }
  X.cor('spasskaya-relief-stair', grp, stair, { w: 6.0, h: 2.8, rise: 1.4, noLift: true, wallMat: K.wall('#e2b46a'), vaultMat: mat.toon('#efe7d2', { side: 'double' }), floorMat: K.darkFloor });
  K.rampSteps(S, { x0: -2.95, x1: 2.95, zA: zr1, yA: FY, zB: zr2, yB: RY, mat: mat.toon('#77777b') });
  for (const sx of [-1, 1]) { const len = Math.hypot(zr1 - zr2, rise), tilt = Math.atan2(rise, zr1 - zr2), g = new THREE.Group(); g.position.set(sx * 2.7, 0, 0); S.group.add(g);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), M.brass); m.position.set(0, FY + rise / 2 + 0.95, (zr1 + zr2) / 2); m.rotation.x = Math.PI / 2 - tilt; m.castShadow = false; g.add(m); }
  // the relief hall: a room under the street (ochre stone), doors: the stair (hall-side wall, x 0), the way out (hall-side wall, x xS), the Sadovaya passage (east wall, z zE)
  const ochre = K.wall('#e2b46a');
  const fy = RY + 0.05, CHr = RY + 4.0;
  const relL = [[R.x0, R.z0], [R.x1, R.z0], [R.x1, R.z1], [R.x0, R.z1]], relPoly = relL.map(([x, z]) => toWorld(SS, x, z));
  const relDoors = [[0, R.z1, 6.2], [R.xS, R.z1, 4.6], [R.x1, R.zE, 4.6]].map(([x, z, w]) => { const [wx, wz] = toWorld(SS, x, z); return { x: wx, z: wz, w, h: 3.1, arch: true }; });
  const relief = buildPolyRoom(ctx, M, { id: 'ss-relief', poly: relPoly, y0: fy, ceil: CHr, under: true, doors: relDoors, wallMat: ochre, ceilMat: mat.toon('#efe6d0', { side: 'double' }), colY: [RY - 1.5, RY + 4.4], lamps: { step: 5, mat: M.lampWarm, size: [1.2, 0.5], rot: -SS.yaw }, floorMat: K.darkFloor });
  res.relief = relief;
  stripFloor(S, relL, [], fy, 1.0);
  S.walk(-3.3, 3.3, R.z1 - 0.4, R.z1 + 0.32, fy, 1.0); S.walk(R.xS - 2.5, R.xS + 2.5, R.z1 - 0.4, R.z1 + 0.9, fy, 1.0);      // (the stair sill stops where the ramp of the stair ends) S.walk(R.x1 - 0.4, R.x1 + 0.9, R.zE - 2.5, R.zE + 2.5, fy, 1.0);
  {
    // the bronze medallion «ЗОДЧЕСТВУ ПЕТЕРБУРГА» on the far wall, two medallion panels, lanterns, the red double door on the west wall
    const med = tex.draw(256, 256, (g, w, h) => {
      const cx = w / 2, cy = h / 2; g.clearRect(0, 0, w, h); g.fillStyle = '#b8923e'; g.beginPath(); g.arc(cx, cy, 124, 0, 7); g.fill(); g.strokeStyle = '#e2c27a'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, 118, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, 86, 0, 7); g.stroke();
      g.fillStyle = '#5a4316'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, 'ЗОДЧЕСТВУ', cx, cy - 22, 150, 26, SERIF, 700); tex.fitText(g, 'ПЕТЕРБУРГА', cx, cy + 12, 160, 26, SERIF, 700);
      g.font = `600 11px ${SERIF}`; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.save(); g.translate(cx + 102 * Math.cos(a), cy + 102 * Math.sin(a)); g.rotate(a + Math.PI / 2); g.fillText('·', 0, 0); g.restore(); }
      g.fillStyle = '#7a5c22'; g.fillRect(cx - 50, cy + 40, 100, 3);
    }, { key: 'ss-medal' });
    const kr = relief.k, F = (x, z) => toWorld(SS, x, z), faceZ = SS.yaw;                                    // the far wall (z0) faces +z of the hall frame
    const [mx, mz] = F(10.5, R.z0 + 0.04), discM = mat.decal('#ffffff', { map: med });
    { const p = kr.plane(2.6, 2.6, discM, [mx, fy + 2.0, mz], [0, faceZ, 0]); p.castShadow = false; }
    for (const x of [2, 19]) { const [px, pz] = F(x, R.z0 + 0.05); kr.box(2.4, 1.6, 0.06, mat.toon('#e7dcc0'), [px, fy + 2.1, pz], [0, faceZ, 0]); kr.box(0.9, 0.9, 0.05, M.bronze, [px + Math.sin(faceZ) * 0.05, fy + 2.1, pz + Math.cos(faceZ) * 0.05], [0, faceZ, 0]); }
    for (const [x, z, f] of [[6, R.z0 + 0.25, faceZ], [15, R.z0 + 0.25, faceZ], [R.x0 + 0.25, -94, faceZ + Math.PI / 2], [R.x0 + 0.25, -98, faceZ + Math.PI / 2]]) { const [px, pz] = F(x, z); kr.box(0.3, 0.06, 0.3, M.brass, [px, fy + 2.75, pz], [0, f, 0]); const l = kr.box(0.24, 0.42, 0.24, M.lampWarm, [px, fy + 2.5, pz], [0, f, 0]); l.castShadow = false; }
    const dm = mat.toon('#ffffff', { map: tex.draw(128, 160, (g, w, h) => { g.fillStyle = '#7d2418'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a120b'; g.lineWidth = 4; g.strokeRect(6, 6, w / 2 - 8, h - 12); g.strokeRect(w / 2 + 2, 6, w / 2 - 8, h - 12); g.fillStyle = '#c9a24b'; g.fillRect(w / 2 - 8, h / 2, 4, 14); g.fillRect(w / 2 + 4, h / 2, 4, 14); }, { key: 'ss-reddoor' }) });
    { const [px, pz] = F(R.x0 + 0.03, -96.2); const p = kr.plane(2.0, 2.5, dm, [px, fy + 1.25, pz], [0, faceZ + Math.PI / 2, 0]); p.castShadow = false; }
    K.hang(relief.group, (() => { const [px, pz] = F(10, R.z1 - 2.2); return { x: px, y: CHr - 0.75, z: pz, rotY: faceZ, rodLen: 0.4, sections: K.SEC.spasNW() }; })());
    K.hang(relief.group, (() => { const [px, pz] = F(R.x1 - 2.6, R.zE); return { x: px, y: CHr - 0.75, z: pz, rotY: faceZ - Math.PI / 2, rodLen: 0.4, sections: [K.sg.sec.trains('4', 1, 'u', ['Спасская', 'Spasskaya'])] }; })());
  }

  // ================================================================ the way out: the passage from the relief hall along the hall to the foot of the incline, the incline, the vestibule
  const Se = new Space(ctx, E.eframe, { name: 'spasskaya-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });
  K.bulkhead(Se, E.A, E.FY, E.run, 3.1);
  res.esc = esc; res.Se = Se;
  {
    const up = [-E.e[0], -E.e[1]], foot = [E.bottom.x, E.bottom.z], L = (x, z) => toWorld(SS, x, z), tz = [Math.sin(SS.yaw), Math.cos(SS.yaw)];
    const pts = smoothPath([L(R.xS, R.z1 + 0.2), L(R.xS, R.z1 + 6), L(R.xS, -70), L(R.xS + 0.5, -55), L(R.xS + 4, -43), L(R.xS + 13, -33.5), [foot[0] - up[0] * 6, foot[1] - up[1] * 6], foot], tz, up, 2.5);
    X.debug.radii.spasskayaExit = minRadius(pts);
    X.cor('spasskaya-exit', grp, pts.map((p) => [p[0], RY, p[1]]), { ...K.PASS, w: 4.6 });
  }
  // the vestibule inside the pavilion (the generic city shell of w245455781, 3.3 m high)
  const dws = DOORWAYS.filter((d) => d.station === 'spasskaya'), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  const Sv = new Space(ctx, E.eframe, { name: 'spasskaya-vestibule', tag: null, zone: 'spasskaya-vestibule-fx' }), kv = Sv.k;
  const b = ctx.L.buildingById ? ctx.L.buildingById(BLDG) : null, CEIL = Math.max(2.9, Math.min(5.2, ((b && b.h) || 3.3) - 0.25));
  if (b) {
    const poly = insetPoly(ringOf(b.polys[0].o), 0.45), hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z));
    const wall = K.wall('#ece6d8');
    const room = buildPolyRoom(ctx, M, { id: 'ss-vest', poly, ceil: CEIL, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 2.5, arch: false })), doorSnap: 1.2, holes: [hole], wallMat: wall, ceilMat: mat.toon('#efede6', { side: 'double' }),
      floorMat: sharedFloor(ctx, M, '#e9e4dc'), lamps: { step: 4.4, mat: M.lampWhite, size: [1.3, 0.5], rot: -E.yaw } });
    res.room = room;
    shaftParapet(Sv, M, { A: E.A, len: 13, mat: M.marbleWhite });
    const ins = (x, z) => room.inside(...Sv.W(x, z)), zt = -3.6;
    for (let x = -6.0; x <= 6.01; x += 1.2) if (ins(x, zt) && ins(x, zt - 0.8)) turnstile(kv, M, x, 0.05, zt, 0);
    // the three arched smalt mosaic panels of the old Sennaya square (market, the Spas-na-Sennoy church) in pale marble frames: on the wall the arrivals face (the east end)
    const mos = tex.draw(512, 192, (g, w, h) => {
      const r = ctx.rng('ss-mosaic'); g.fillStyle = '#e8e0cc'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) {
        const x0 = 14 + i * 166, pw = 150; g.save(); g.beginPath(); g.moveTo(x0, h - 10); g.lineTo(x0, 70); g.arc(x0 + pw / 2, 70, pw / 2, Math.PI, 0); g.lineTo(x0 + pw, h - 10); g.closePath(); g.clip();
        for (let y = 0; y < h; y += 6) for (let x = x0; x < x0 + pw; x += 6) { g.fillStyle = y < 96 ? ['#9cb8d8', '#b0c8e0', '#c8d8e8'][(r() * 3) | 0] : ['#a07a4a', '#8a6a3e', '#b8935a', '#6e5a3c'][(r() * 4) | 0]; g.fillRect(x, y, 5, 5); }
        if (i === 1) { g.fillStyle = '#e6dcc0'; g.fillRect(x0 + 52, 70, 46, 80); g.fillStyle = '#c9a24b'; g.beginPath(); g.arc(x0 + 75, 66, 18, Math.PI, 0); g.fill(); g.fillRect(x0 + 73, 28, 4, 22); }
        else for (let q = 0; q < 6; q++) { g.fillStyle = ['#c8392f', '#e6dcc0', '#3d5a8a'][q % 3]; g.fillRect(x0 + 12 + q * 22, 110 + (q % 2) * 8, 16, 26); }
        g.restore(); g.strokeStyle = '#f4efe2'; g.lineWidth = 8; g.beginPath(); g.moveTo(x0, h - 10); g.lineTo(x0, 70); g.arc(x0 + pw / 2, 70, pw / 2, Math.PI, 0); g.lineTo(x0 + pw, h - 10); g.stroke();
      }
    }, { key: 'ss-mosaic' });
    let best = null; for (let i = 0; i < poly.length; i++) { const a = poly[i], c = poly[(i + 1) % poly.length], l = Math.hypot(c[0] - a[0], c[1] - a[1]), m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2], lz = Sv.L(m[0], m[1])[1]; if (l > 8 && (!best || lz < best.lz)) best = { a, c, l, m, lz }; }
    if (best) {                                                                                              // a plane in WORLD coordinates on the room's own group (the room kit is in world coordinates)
      const ux = (best.c[0] - best.a[0]) / best.l, uz = (best.c[1] - best.a[1]) / best.l; let nx = -uz, nz = ux; if (!room.inside(best.m[0] + nx * 0.5, best.m[1] + nz * 0.5)) { nx = -nx; nz = -nz; }
      const w = Math.min(7.6, best.l - 1), h = w * 192 / 512, p = room.k.plane(w, h, mat.toon('#ffffff', { map: mos }), [best.m[0] + nx * 0.04, 0.65 + h / 2, best.m[1] + nz * 0.04], [0, Math.atan2(nx, nz), 0]); p.castShadow = false;
    }
    { const p = kv.plane(2.8, 0.6, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'ss-v-trains', { bg: '#EA7125' }), 1.0), [0, CEIL - 0.45, zt - 0.1], [0, Math.PI, 0]); p.castShadow = false; }
    X.addVestZone('spasskaya', room.inside, CEIL + 1.5);
  } else console.warn('[metro] Spasskaya: the pavilion ' + BLDG + ' is not in the layout: no vestibule room');
  {
    const g = new THREE.Group(); g.name = 'spasskaya-street'; ctx.addStatic(g); const kg = ctx.kit(g);
    for (const d of dws) doorFrame(kg, M, d, { h: 2.5 });
    const nx = Math.sin(dIn.rotY), nz = Math.cos(dIn.rotY), cx = (dIn.x + dOut.x) / 2 + nx * 0.06, cz = (dIn.z + dOut.z) / 2 + nz * 0.06, lab = ctx.services && ctx.services.labels;
    if (!lab || lab.reserve(BLDG, cx, 2.85, cz, 4.4, 0.56, nx, nz, 'metro')) { const p = kg.plane(4.4, 0.56, K.nameBoard('ss-out-name', name, nameEn, '#EA7125'), [cx, 2.85, cz], [0, dIn.rotY, 0]); p.castShadow = false; }
  }

  // ================================================================ the station object, the ways out and in, the relief hall waypoints (tests)
  const rt = X.rtOf('spasskaya', X.net.spasskaya, SS, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'spasskaya', name, nameEn, frame: SS, stock: '717', line: '4', idx: X.net.spasskaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Спасская». Переход на станции «Сенная площадь» и «Садовая». Выход на Сенную площадь и Московский проспект'),
  });
  X.stations.spasskaya = rt;
  const SsW = (x, z, tol) => { const q = toWorld(SS, x, z); return tol ? [q[0], q[1], tol] : q; }, SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)], at = (d, r, tol) => { const [nx, nz] = nOf(d), q = [d.x + nx * r, d.z + nz * r]; return tol ? [...q, tol] : q; };
  res.stairUp = () => [SsW(0, -PZ + 4), SsW(0, zr0 + 0.2, 0.6), SsW(0, zr1 + (zr2 - zr1) * 0.3, 0.6), SsW(0, zr1 + (zr2 - zr1) * 0.7, 0.6), SsW(0, R.z1 - 0.9)];
  res.stairDown = () => [SsW(0, R.z1 - 0.6), SsW(0, zr1 + (zr2 - zr1) * 0.7, 0.6), SsW(0, zr1 + (zr2 - zr1) * 0.3, 0.6), SsW(0, zr0 + 0.3, 0.6), SsW(0, -PZ + 4), SsW(0, -40)];
  res.reliefIn = () => [SsW(R.x1 - 1.5, R.zE), SsW(8, -95.5), SsW(0, R.z1 - 1.6)];
  res.reliefOut = () => [SsW(8, -95.5), SsW(R.x1 - 1.5, R.zE), SsW(R.x1 + 0.6, R.zE)];
  const get = (debug, n) => { const c = debug.corridors.find((q) => q.name === n); return c ? c.pts.filter((_, i, a) => i % 3 === 0 || i === a.length - 1).map((q) => [q[0], q[2]]) : []; };
  res.exitRoute = (debug) => {
    const [lx, lz] = Sv.L(dOut.x, dOut.z);
    return { start: [...SsW(0, -40), FY], points: [...res.stairUp(), SsW(R.xS - 4, R.z1 - 2.0), SsW(R.xS, R.z1 - 1.0), ...get(debug, 'spasskaya-exit'), SeW(1, E.run - 3, 0.3), SeW(1, 60, 0.3), SeW(1, 10, 0.3), SeW(1, 0.5, 0.3), SeW(1, -1.6), SeW(E.A + 1.6, -1.6), SeW(E.A + 1.6, 14.4), SeW(Math.max(lx + 2.0, 0), Math.min(lz - 2.0, 17)), at(dOut, -0.8, 0.6), at(dOut, 1.0, 0.6), at(dOut, 3.5)],
      door: [dOut.x, dOut.z], out: at(dOut, 3.5), outward: nOf(dOut) };
  };
  res.entryRoute = (debug) => {
    const [lx, lz] = Sv.L(dIn.x, dIn.z);
    return { start: [...at(dIn, 4), 0], points: [at(dIn, 1.0, 0.6), at(dIn, -1.2, 0.6), SeW(lx * 0.4 - 1, lz * 0.4 - 2), SeW(-1, -4.6), SeW(-1, -1.6), SeW(-1, 3, 0.4), SeW(-1, E.run - 2, 0.5), SeW(-1, E.run + 1.0), ...get(debug, 'spasskaya-exit').reverse(), SsW(R.xS, R.z1 - 1.2), SsW(R.xS - 4, R.z1 - 2.2), ...res.stairDown()], end: { station: 'spasskaya', y: FY } };
  };
  Object.assign(res, { S, Sv, rt, FY, vInfo, name });
  void floorGeo; void SPS; void PY;
  return res;
}
