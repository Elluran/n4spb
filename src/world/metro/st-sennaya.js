// metro/st-sennaya.js — Sennaya Ploshchad (line 2, -55 m, 1963, central hall doubled in 1991; docs/research/metro-south-sennaya.md section 3, photos refs/sennaya sennaya_*).
//   hall       three-vault PYLON station of the engine's pylon hall (hall-pylon.js) with a SHORTENED central hall (`central`: the OSM platform polygon is split north of local z +23, where the incline
//              climbs between the two platform tunnels): pylons of pale cream Koelga marble blocks on a black granite plinth, rectangular openings under a brass louvre cornice (recessed downlights
//              in the soffits), a sloping brass canopy that hides the cove light of the smooth white vault, two openings closed by corrugated steel shutters, pink granite floor in the central hall,
//              grey platforms, light-blue glazed track walls on a black granite plinth with the gold line, the blue band, dark spaced capitals, brass lattice doors and the line scheme
//   incline    3 lanes, axial, 55 m down (95 m of run): from the north end of the central hall up to the TAIL of the L-shaped pavilion w39036403 (the 12.5 m mouth fills the tail)
//   vestibule  the pavilion on Sennaya square (doors in the NW facade, OSM n763045997 / n763045998): the room inside the generic city shell, the turnstile row, glass partitions, ticket machines
//   transfers  the sunk stairwell in the middle of the central hall (Sadovaya) and the arched opening in the south end wall (Spasskaya): the passages are hub-sennaya.js's
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, SN_PZ, SN_HOLE, SN_SAD_Y, toWorld } from '../data/metro.js';
import { Space } from './lib.js';
import { buildPylonHall } from './hall-pylon.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet, insetPoly, ringOf, doorFrame } from './petro-kit.js';
import { sharedFloor } from './hall-vault.js';

export const SN_DIMS = { C: 4.75, PY: 6.35, EDGE: 8.5, TRK: 10.0, WALL: 13.4, RS: 3.53 };
/** the sunk stairwell of the Sadovaya passage (hall frame): the flight from z1 (platform level) down along -z to zFoot (SN_SAD_Y), the landing to z0; the passage leaves the landing west (+x) at z = cz */
export const SN_WELL = { x0: -2.6, x1: 2.6, z0: -30.4, z1: -15.6, zFoot: -15.6 - 5.5 / Math.tan(Math.PI / 6), cz: -27.75 };
const BLDG = 'w39036403', OW = 3.6, BRASS = '#9c8040';

export function buildSennaya(ctx, M, X, K) {
  const { mat, tex } = ctx;
  const SN = FRAMES.sennaya, PZ = SN_PZ, FY = SN.y, E = ESC2.sennaya, res = {};
  const name = 'Сенная площадь', nameEn = 'Sennaya Ploshchad';
  const S = new Space(ctx, SN, { name: 'sennaya' }), k = S.k;
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1], zB = zFoot - 3;                                       // the central hall ends 3 m before the foot of the incline (+3.7 / +0.7)

  // ================================================================ materials
  const pylonMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'sen-pylon', { base: '#d8c8a9', w: 0.6, h: 0.4, cols: 4, rows: 6, veins: 12, vein: 'rgba(150,128,96,0.22)', joint: 'rgba(120,100,70,0.38)' }) });
  const trackMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'sen-tile', { base: '#a9b4e2', w: 0.6, h: 0.6, cols: 4, rows: 4, veins: 0, lite: 'rgba(255,255,255,0.10)', dark: 'rgba(40,52,120,0.07)', joint: 'rgba(58,68,128,0.42)' }) });
  const floorMat = sharedFloor(ctx, M, '#ffccb9');                                                     // pinkish-red granite of the central hall (#8C6A5C)
  const brass = mat.toon(BRASS), brassDark = mat.toon('#6e5a2c'), black = mat.toon('#1e1e22');

  // ================================================================ the hall
  const hall = buildPylonHall(ctx, M, S, { id: 'sen', FY, PZ, name, nameEn, plain: true, noMeander: true, dims: SN_DIMS, pitch: 7, openW: OW, openSpring: 2.0, central: [-PZ, zB],
    pylonMat, trackMat, floorMat, vaultMat: mat.toon('#eceae0', { side: 'double' }), endHole: { N: { halfW: 3.3, spring: 0.8 }, S: { halfW: 3.4, spring: 0.9 } } });
  const { C, PY, EDGE, TRK, WALL, BED, SPS, SPC } = hall;
  res.hall = hall;
  // the opening of the sunk stairwell in the platform (the hall builder lays one floor over the whole platform), the well itself
  const W = SN_WELL;
  K.cutFloor(S, { FY, x0: -EDGE, x1: EDGE, z0: -PZ, z1: PZ, mat: floorMat, holes: [[W.x0, W.x1, W.z0, W.z1]] });
  K.well(S, { x0: W.x0, x1: W.x1, z0: W.z0, z1: W.z1, zFoot: W.zFoot, FY, yLow: SN_SAD_Y, open: { side: 1, zc: W.cz, w: 4.6, h: 2.95 }, floorMat: K.passFloor });
  S.walk(-3.3, 3.3, -PZ - 0.9, -PZ + 0.3, FY, 1.1);                                                    // the sill of the south end opening (the Spasskaya passage)
  // stubs at the two ends of the platform tunnels
  // (north: the real tunnel to Nevsky Prospekt of links-south.js, the hub's own deferral; south: the real tunnel to Tekhnologichesky Institut 2 of links-tekhnolog.js when metro.js lists 'sennaya:-1'
  // in REAL_ENDS: its flush builds these stubs only when that link did not come, the closure checks X.realLinks itself; else stubs now)
  for (const m of hall.mouths) {
    const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, BED, {});
    if (m.zs > 0) K.defer('sennaya:1', go); else if (X.realEnd && X.realEnd('sennaya:-1')) X.deferStub('sennaya:-1', () => { if (!(X.realLinks && X.realLinks['sennaya>tekhnolog2'])) go(); }); else go();
  }
  const vInfo = { openings: hall.openings, FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };

  // ---- pylons: black granite plinth (between the openings), the brass louvre cornice over the openings on both faces, the sloping brass canopy at the springing, downlights, shutters
  const solid = (za, zb) => { const out = []; let z = za; for (const zo of hall.openZc) { const a = zo - OW / 2, b = zo + OW / 2; if (b <= za || a >= zb) continue; if (a > z) out.push([z, a]); z = Math.max(z, b); } if (zb > z + 0.01) out.push([z, zb]); return out; };
  for (const sx of [-1, 1]) {
    const xc = sx * C, xp = sx * PY;                                                                     // the central face and the platform face of the pylon row
    for (const [a, b] of solid(-PZ, zB)) S.bx(Math.min(xc, xc - sx * 0.04), Math.max(xc, xc - sx * 0.04), FY, FY + 0.3, a, b, black);
    for (const [a, b] of solid(-PZ, PZ)) S.bx(Math.min(xp, xp + sx * 0.04), Math.max(xp, xp + sx * 0.04), FY, FY + 0.3, a, b, black);
    S.bx(Math.min(xc, xc - sx * 0.12), Math.max(xc, xc - sx * 0.12), FY + 2.92, FY + 3.95, -PZ, zB, brass);
    S.bx(Math.min(xp, xp + sx * 0.12), Math.max(xp, xp + sx * 0.12), FY + 2.92, FY + 3.95, -PZ, PZ, brass);
    for (const y of [3.18, 3.44, 3.70]) S.bx(Math.min(xc - sx * 0.12, xc - sx * 0.15), Math.max(xc - sx * 0.12, xc - sx * 0.15), FY + y, FY + y + 0.05, -PZ, zB, brassDark);
    const can = k.box(0.8, 0.05, PZ + zB, brass, [sx * (C - 0.36), FY + 4.18, (zB - PZ) / 2], [0, 0, sx * 0.5]); can.castShadow = false;
    for (const zo of hall.openZc) { const l = k.box(0.55, 0.04, 0.55, M.lampWarm, [sx * (C + PY) / 2, FY + 3.74, zo]); l.castShadow = false; }
    S.bx(Math.min(xp, xp + sx * 0.1), Math.max(xp, xp + sx * 0.1), FY + 3.97, FY + 4.05, -PZ + 0.5, PZ - 0.5, M.lampWarm);                    // the cove light of the side vault over the platform
  }
  {
    const sh = tex.draw(64, 128, (g, w, h) => { g.fillStyle = '#8d9196'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { g.fillStyle = '#b4b8bc'; g.fillRect(x, 0, 3, h); g.fillStyle = '#5f6368'; g.fillRect(x + 5, 0, 2, h); } g.fillStyle = '#4a4d52'; g.fillRect(0, h - 10, w, 10); }, { key: 'sen-shutter' });
    const shm = mat.toon('#ffffff', { map: sh, side: 'double' });
    for (const zo of [hall.openZc[0]]) for (const sx of [-1, 1]) {
      for (const x of [sx * (C + 0.06), sx * (PY - 0.06)]) { const p = k.plane(OW, 2.92, shm, [x, FY + 1.46, zo], [0, Math.PI / 2, 0]); p.castShadow = false; }
      S.col(sx > 0 ? C : -PY, sx > 0 ? PY : -C, FY - 0.5, FY + 4.0, zo - OW / 2, zo + OW / 2);
    }
  }
  // ---- floors: grey granite platform strips, the yellow tactile band is the hall builder's
  { const grey = mat.decal('#8f8d89'); for (const sx of [-1, 1]) { const p = k.plane(EDGE - 0.7 - PY - 0.05, 2 * PZ, grey, [sx * (PY + 0.05 + (EDGE - 0.7 - PY - 0.05) / 2), FY + 0.006, 0], [-Math.PI / 2, 0, 0]); p.castShadow = false; } }
  // ---- track walls: black granite plinth, the gold line, the blue band (signs.js), dark spaced capitals, brass lattice doors, the line scheme
  {
    const letters = K.letters('sen-letters', name, '#2b2f3c');
    const door = mat.toon('#ffffff', { map: tex.draw(128, 256, (g, w, h) => { g.fillStyle = '#7a6230'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9a85a'; g.fillRect(6, 6, w - 12, h - 12); g.fillStyle = '#2a2418'; for (let y = 16; y < h - 12; y += 16) for (let x = 14; x < w - 12; x += 16) g.fillRect(x, y, 10, 10); g.strokeStyle = '#e2c27a'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20); }, { key: 'sen-door' }) });
    for (const sx of [-1, 1]) {
      const fx = sx * (WALL - 0.15), rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2, a = sx > 0 ? WALL - 0.2 : -WALL + 0.16, b = sx > 0 ? WALL - 0.16 : -WALL + 0.2;
      S.bx(a, b, BED, FY + 1.0, -PZ, PZ, black); S.bx(a, b, SPS - 0.14, SPS - 0.05, -PZ, PZ, brass); S.bx(a, b, FY + 1.0, FY + 1.05, -PZ, PZ, brass);
      K.sg.trackBand(S, { x: fx, y: FY + 2.38, z0: -PZ + 1.5, z1: PZ - 1.5, rotY, line: '2', name, nameEn, every: 12 });
      for (const z of [-45, -15, 15, 45]) { const p = k.plane(4.0, 0.46, letters, [fx - sx * 0.02, FY + 2.92, z], [0, rotY, 0]); p.castShadow = false; }
      for (const z of [-30, 0, 30]) { const p = k.plane(1.0, 1.9, door, [fx - sx * 0.02, FY + 1.2, z], [0, rotY, 0]); p.castShadow = false; }
      const travelZ = sx < 0 ? 1 : -1;                                                                     // the -x wall faces the S track (trains toward +z, Nevsky Prospekt)
      K.sg.lineScheme(S, { x: fx - sx * 0.01, y: FY + 1.62, z: 14, rotY, line: '2', currentId: 'sennaya', dir: travelZ, ahead: K.sg.aheadOf(rotY, travelZ), w: 4.0, h: 1.08, res: 0.35 });
    }
  }
  // ---- info totems (SOS / ИНФО) on the axis, benches of cream marble along the pylons of the central hall
  {
    const blueM = mat.toon('#1d4e9b'), info = mat.toon('#ffffff', { map: tex.draw(64, 256, (g, w, h) => { g.fillStyle = '#1d4e9b'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 16px "Rubik",sans-serif'; g.textAlign = 'center'; g.fillText('SOS', w / 2, 30); g.fillText('ИНФО', w / 2, 52); g.fillStyle = '#9fc1e8'; g.fillRect(12, 80, w - 24, 34); g.fillStyle = '#3d74c4'; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.fillRect(14 + j * 18, 140 + i * 22, 14, 16); }, { key: 'sen-info' }) });
    for (const [x, z] of [[2.9, -8], [-2.9, -40]]) { k.box(0.5, 2.3, 0.35, blueM, [x, FY + 1.15, z]); for (const f of [1, -1]) { const p = k.plane(0.46, 2.2, info, [x, FY + 1.15, z + f * 0.18], [0, f > 0 ? 0 : Math.PI, 0]); p.castShadow = false; } S.col(x - 0.3, x + 0.3, FY, FY + 2.4, z - 0.2, z + 0.2); }
    const bench = mat.toon('#e2d6bd');
    for (const sx of [-1, 1]) for (const [a, b] of solid(-PZ + 2, zB - 1)) { if (b - a < 2.4) continue; const zc = (a + b) / 2, L = Math.min(2.2, b - a - 0.6); if (zc > W.z0 - 1.5 && zc < W.z1 + 1.5) continue; k.box(0.5, 0.45, L, bench, [sx * (C - 0.3), FY + 0.225, zc]); S.col(sx * (C - 0.3) - 0.26, sx * (C - 0.3) + 0.26, FY, FY + 0.5, zc - L / 2, zc + L / 2); }
  }
  // ---- hanging boards (signs.js): the way out at the escalator end, the transfer to Sadovaya over the stairwell, to Spasskaya at the south end, the trains in the middle
  {
    const y = FY + 3.15, sg = K.sg, exitS = sg.sec.exit({ streets: [['Сенная площадь', 'Sennaya ploshchad'], ['Садовая улица', 'Sadovaya ulitsa'], ['Московский проспект', 'Moskovsky prospekt']] }, 'u', true);
    K.hang(S, { x: 0, y, z: zB - 3.5, rotY: Math.PI, rodLen: 1.4, sections: [exitS] });
    K.hang(S, { x: 0, y, z: W.z1 + 2.4, rotY: 0, rodLen: 1.4, sections: [sg.sec.transfer({ to: 'sadovaya', line: '5' }, 'd'), sg.sec.transfer({ to: 'spasskaya', line: '4' }, 'u')] });
    K.hang(S, { x: 0, y, z: -PZ + 5, rotY: 0, rodLen: 1.4, sections: [K.SEC.toSpasskaya()] });
  }

  // ================================================================ the lower hall + the incline (north end of the central hall; it climbs between the platform tunnels)
  lowerHall(ctx, M, S, { A: E.A, FY, z0: zB + 0.5, z1: zFoot + 0.7, floorMat });
  const Se = new Space(ctx, E.eframe, { name: 'sennaya-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A, holeLen: SN_HOLE });
  res.esc = esc; res.Se = Se;

  // ================================================================ the vestibule inside the pavilion (the generic city shell of w39036403, 3.3 m high)
  const dws = DOORWAYS.filter((d) => d.station === 'sennaya'), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  const Sv = new Space(ctx, E.eframe, { name: 'sennaya-vestibule', tag: null, zone: 'sennaya-vestibule-fx' }), kv = Sv.k;
  const b = ctx.L.buildingById ? ctx.L.buildingById(BLDG) : null;
  const CEIL = Math.max(2.9, Math.min(5.2, ((b && b.h) || 3.3) - 0.25));
  let room = null;
  if (b) {
    const poly = insetPoly(ringOf(b.polys[0].o), 0.45), hole = [[-E.A, 0], [E.A, 0], [E.A, SN_HOLE], [-E.A, SN_HOLE]].map(([x, z]) => Sv.W(x, z));
    const wall = K.wall('#e8e3d8');
    room = buildPolyRoom(ctx, M, { id: 'sen-vest', poly, ceil: CEIL, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 2.5, arch: false })), doorSnap: 1.2, holes: [hole], wallMat: wall, ceilMat: mat.toon('#eeece6', { side: 'double' }),
      floorMat: sharedFloor(ctx, M, '#efe9df'), lamps: { step: 4.2, mat: M.lampWhite, size: [1.3, 0.5], rot: -E.yaw } });
    res.room = room;
    shaftParapet(Sv, M, { A: E.A, len: SN_HOLE, mat: M.marbleWhite });
    const ins = (x, z) => room.inside(...Sv.W(x, z)), zt = -3.6;
    let xl = 0, xr = 0; while (xl > -40 && ins(xl - 0.2, zt)) xl -= 0.2; while (xr < 40 && ins(xr + 0.2, zt)) xr += 0.2;
    for (let x = -4.8; x <= 4.81; x += 1.2) if (ins(x, zt)) turnstile(kv, M, x, 0.05, zt, 0);
    for (const [a, c] of [[xl + 0.1, -5.4], [5.4, xr - 0.1]]) if (c - a > 0.3) { kv.box(c - a, 2.2, 0.08, M.glass, [(a + c) / 2, 1.15, zt]); kv.box(c - a, 0.1, 0.12, M.stainless, [(a + c) / 2, 2.3, zt]); Sv.col(a, c, -0.5, 2.4, zt - 0.15, zt + 0.15); }
    const free = (x, z, r = 0.8) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => ins(x + dx, z + dz));
    let nm = 0; for (const x of [7.5, 6.5, -7.5]) for (const z of [-6.5, -8.5, -10.5]) { if (nm >= 3 || !free(x, z)) continue; kv.box(0.8, 1.9, 0.6, M.kiosk, [x, 1.0, z]); kv.box(0.6, 0.45, 0.06, M.lampCool, [x, 1.45, z - 0.32]); Sv.col(x - 0.45, x + 0.45, -1, 2.1, z - 0.35, z + 0.35); nm++; }
    { const p = kv.plane(2.8, 0.6, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'sen-v-trains'), 1.0), [0, CEIL - 0.45, zt - 0.1], [0, Math.PI, 0]); p.castShadow = false; }
    X.addVestZone('sennaya', room.inside, CEIL + 1.5);
  } else console.warn('[metro] Sennaya: the pavilion ' + BLDG + ' is not in the layout: no vestibule room');
  // the street: stainless door frames, the name over the doors (reserved in the facade label registry)
  {
    const g = new THREE.Group(); g.name = 'sennaya-street'; ctx.addStatic(g); const kg = ctx.kit(g);
    for (const d of dws) doorFrame(kg, M, d, { h: 2.5 });
    const nx = Math.sin(dIn.rotY), nz = Math.cos(dIn.rotY), cx = (dIn.x + dOut.x) / 2 + nx * 0.06, cz = (dIn.z + dOut.z) / 2 + nz * 0.06, lab = ctx.services && ctx.services.labels;
    if (!lab || lab.reserve(BLDG, cx, 2.85, cz, 5.0, 0.56, nx, nz, 'metro')) { const p = kg.plane(5.0, 0.56, K.nameBoard('sen-out-name', name, nameEn, '#0078c9'), [cx, 2.85, cz], [0, dIn.rotY, 0]); p.castShadow = false; }
  }

  // ================================================================ the station object, the ways out and in (tests)
  const rt = X.rtOf('sennaya', X.net.sennaya, SN, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'sennaya', name, nameEn, frame: SN, stock: '717-l2', line: '2', idx: X.net.sennaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Сенная площадь». Переход на станции «Садовая» и «Спасская». Выход на Сенную площадь, Садовую улицу и Московский проспект'),
  });
  X.stations.sennaya = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)], at = (d, r, tol) => { const [nx, nz] = nOf(d), q = [d.x + nx * r, d.z + nz * r]; return tol ? [...q, tol] : q; };
  res.exitRoute = () => { const [lx, lz] = Sv.L(dOut.x, dOut.z);
    return { start: [...toWorld(SN, 0, -8), FY], points: [toWorld(SN, 1.2, zB - 2), SeW(2, E.run + 2.2, 0.4), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SeW(2, -5.6), SeW(lx + 2.2, Math.max(lz + 1.6, -5.6)), at(dOut, -0.8, 0.6), at(dOut, 1.0, 0.6), at(dOut, 3.5)],
      door: [dOut.x, dOut.z], out: at(dOut, 3.5), outward: nOf(dOut) }; };
  res.entryRoute = () => { const [lx, lz] = Sv.L(dIn.x, dIn.z);
    return { start: [...at(dIn, 4), 0], points: [at(dIn, 1.0, 0.6), at(dIn, -1.0, 0.6), SeW(lx * 0.5, (lz - 5.6) * 0.5), SeW(0, -5.6), SeW(0, -1.6), SeW(0, 3, 0.4), SeW(0, E.run - 2, 0.5), SeW(0, E.run + 2.4), toWorld(SN, 0, zB - 4), toWorld(SN, 0, -8)], end: { station: 'sennaya', y: FY } }; };
  Object.assign(res, { S, Sv, rt, FY, zB, zFoot, vInfo, name });
  void SPC;
  return res;
}
