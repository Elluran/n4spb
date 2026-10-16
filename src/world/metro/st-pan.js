// metro/st-pan.js — Ploshchad Aleksandra Nevskogo 1 (line 3, -54 m, 1967) and 2 (line 4, -60 m, 1985) with the transfer passage between them (docs/research/metro-east.md sections 3-5,
// photos refs/east pan1-*, pan2-*; data: data/metro-east.js). Called by metro/hub-east.js with the east kit K.
//   PAN-1 hall  CLOSED TYPE: hall-gd.js with its own skin: white ribbed barrel vault, cream marble blocks, a black door recess at every NeVa door with a white light box over it, the dark green
//               band on the wall top, «ПЛОЩАДЬ / АЛЕКСАНДРА НЕВСКОГО» in black capitals on the wide piers between the cars, grey granite floor with pink-grey joints; black platform doors
//               (dynamic colliders, vo-kit closedDoors). The 3-lane incline lands axially at the -z (north) end behind an 8 m landing with the round glass booth; the 21-step stair leaves the +z end.
//   PAN-1 vest  inside the hotel block r10358434: the concourse in the ground floor of the hotel wing r10358431 (two glass door groups on the square), an internal doorway into the old rotunda
//               r10358432 (the escalator hall: fluted cream drum, the dodecagon ring lamp over the mouth, the white round column, the turnstile row); the rotunda keeps its own east door.
//   passage     21 steps up to the landing over the running tubes (the copper relief «Александр Невский»: riders and gilded line ornament, NO banner anywhere), a 10 % ramp, the 75 m footway that
//               crosses over the PAN-1 track tube and the PAN-2 stub, the two short escalators down into the east end of PAN-2 (14.5 m in the dossier, 18.4 m here: the passage is 10.6 m up).
//   PAN-2 hall  COLUMN station: the engine pylon hall in `column` + `plain` mode: square cream-grey marble piers on black granite feet, round arches, the orange ribbon with the name along the
//               spandrels, a brass three-slot "loophole" lamp over every pier, white vault with ribs, grey granite floor with the rose-brown rhombus on the axis, the bronze scale ("armour") track
//               walls with the raised bronze nameplate, cream marble strip and dark granite skirt; the empty gold-smalt niche over the west passage arch (no statue).
//   PAN-2 vest  the round end of Chernoretsky 3 (w28817963): radial folded dome with the lit oculus, Saaremaa dolomite walls, Karelian granite floor, the mosaic «Ледовое побоище» (riders on the
//               ice under a gold ground: lances only, no banners) over the mouth of the incline, turnstiles with glass partitions; the incline (3 lanes, 55.3 m) lands north of the hall; a corridor
//               and a 28-step stair lead to the -z end.
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, toWorld } from '../data/metro.js';
import { PAN1_PZ, PAN1_STEPS, LANDING_Y, PASS_Y, PAN2_PZ, PAN2_FOOT_Y, PAN2_STEPS, PAN1_BLDG, PAN1_ROT, PAN2_BLDG, PAN1_MALL_DOOR } from '../data/metro-east.js';
import { Space, extrudeZ, archRing, bezierPath, minRadius } from './lib.js';
import { buildGdHall, GDH } from './hall-gd.js';
import { buildPylonHall, PYLON } from './hall-pylon.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet, doorFrame } from './petro-kit.js';
import { closedDoors } from './vo-kit.js';
import { buildJunction } from './junction.js';
import { sharedFloor } from './hall-vault.js';
import { makeSigns } from './signs.js';

const FONT = '"Rubik","Noto Sans",sans-serif', SERIF = '"Noto Serif","Times New Roman",serif';
const GREEN = '#0b6b4d', ORANGE = '#e8741f';

export function buildPan(ctx, M, X, K) {
  const pan1 = buildPan1(ctx, M, X, K), pan2 = buildPan2(ctx, M, X, K), pass = buildPassage(ctx, M, X, K, pan1, pan2);
  const walks = (debug) => {
    const S1 = pan1.S, S2 = pan2.S, Sg = pan2.Sg, Eg = pan2.Eg, P1 = PAN1_PZ, P2 = PAN2_PZ, fwd = K.cp(debug, 'pan-transfer', 3);
    return {
      'pan1->pan2': { start: [...S1.W(0, 40), FRAMES.pan1.y], points: [S1.W(0, P1 - 4), S1.W(0, P1 + 1.2), K.at(S1, 0, P1 + 4.5, 0.5), S1.W(0, 70), S1.W(0, 78.5), ...fwd.slice(1, -1), K.at(Sg, -1.1, -1.2, 0.5), K.at(Sg, -1.1, 2, 0.4), K.at(Sg, -1.1, Eg.run - 1.5, 0.4), Sg.W(-1.1, Eg.run + 1.5), S2.W(0, P2 - 2), S2.W(0, 40)], end: { station: 'pan2', y: FRAMES.pan2.y } },
      'pan2->pan1': { start: [...S2.W(0, 40), FRAMES.pan2.y], points: [S2.W(0, P2 - 4), K.at(Sg, 1.1, Eg.run + 1.8, 0.5), K.at(Sg, 1.1, Eg.run - 1.5, 0.4), K.at(Sg, 1.1, 2, 0.4), Sg.W(1.1, -1.4), ...fwd.slice(1, -1).reverse(), S1.W(0, 78.5), S1.W(0, 70), K.at(S1, 0, P1 + 4.5, 0.5), S1.W(0, P1 - 2), S1.W(0, 40)], end: { station: 'pan1', y: FRAMES.pan1.y } },
    };
  };
  return { pan1, pan2, pass, walks };
}

// =================================================================================================================================== PAN-1 (line 3, closed type)
function buildPan1(ctx, M, X, K) {
  const { mat, tex } = ctx;
  const F = FRAMES.pan1, PZ = PAN1_PZ, FY = F.y, E = ESC2.pan1, TRK = GDH.TRK, EDGE = GDH.EDGE, res = {};
  const name = 'Площадь Александра Невского 1', nameEn = 'Ploshchad Aleksandra Nevskogo 1';
  const S = new Space(ctx, F, { name: 'pan1' }), k = S.k;
  // ---------------------------------------------------------------- the hall
  const wallMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'pan1-wall', { base: '#e3ddcc', w: 0.9, h: 0.6, cols: 3, rows: 4, vein: 'rgba(120,112,96,0.22)', dark: 'rgba(90,80,60,0.07)' }) });
  const floorMat = sharedFloor(ctx, M, '#7a7a7f');                                                    // grey granite (the shared canvas of the new halls, tinted)
  const VB = 4.2;                                                                                       // vertical semi-axis of the vault: crown ~8.2 m over the platform (dossier ~8 m)
  const hall = buildGdHall(ctx, M, S, { id: 'pan1', FY, PZ, name, nameEn, stock: 'neva', stairHole: null, endE: { halfW: 2.4, spring: 1.0 }, endW: { halfW: 4.0, spring: 1.0 },
    skin: { wallMat, floorMat, vault: '#f3f1ea', rib: '#fbfaf5', ribPitch: 2.7, ribW: 0.2, B: VB, band: GREEN, shelf: mat.toon('#e9e6dc'), endMat: mat.toon('#e6e1d4') },
    pills: [], sos: [[3.2, -44], [-3.2, 30]] });
  const vInfo = { openings: hall.openings, FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  // stubs: the -z end (toward Mayakovskaya) waits for the real tunnel (links-east.js), the +z end (Yelizarovskaya) is a dead stub
  for (const m of hall.mouths) { const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {}); if (m.zs < 0) K.defer('pan1:-1', go); else go(); }
  // a white light box (two opal panels in a dark metal frame) over every door recess, leaning a little toward the platform; the wide piers between the cars carry the name
  {
    const frame = mat.toon('#3b3d40');
    for (const sx of [-1, 1]) for (const z of hall.doorZ) {
      const x = sx * (EDGE - 0.24);
      k.box(0.46, 0.08, 1.62, frame, [x, FY + 2.36, z]); k.box(0.46, 0.06, 1.62, frame, [x, FY + 3.22, z]);
      for (const y of [FY + 2.62, FY + 2.98]) { const b = k.box(0.4, 0.3, 1.5, M.lampWhite, [x, y, z], [0, 0, -sx * 0.08]); b.castShadow = false; }
    }
    const letters = mat.decal('#ffffff', { map: tex.draw(512, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#151515'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const sp = (s) => [...s].join(String.fromCharCode(8202, 8202, 8202));
      tex.fitText(g, sp('ПЛОЩАДЬ'), w / 2, h * 0.30, w * 0.62, 46, FONT, 500); tex.fitText(g, sp('АЛЕКСАНДРА НЕВСКОГО'), w / 2, h * 0.72, w - 20, 46, FONT, 500);
    }, { key: 'pan1-letters' }) });
    const piers = []; for (let i = 0; i + 1 < hall.doorZ.length; i++) if (hall.doorZ[i + 1] - hall.doorZ[i] > 5) piers.push((hall.doorZ[i] + hall.doorZ[i + 1]) / 2);
    res.piers = piers;
    for (const sx of [-1, 1]) for (const z of piers.filter((q) => Math.abs(Math.abs(q) - 19.65) < 1)) { const p = k.plane(3.6, 0.9, letters, [sx * (EDGE - 0.02), FY + 2.0, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
  }
  // the threshold of the stair arch (the hall floor stops at the end wall)
  K.sill(S, { x0: -2.4, x1: 2.4, z0: PZ - 0.2, z1: PZ + 0.62, y: FY });
  // ---------------------------------------------------------------- the landing + the 3-lane incline (-z end), the round glass booth
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1];
  lowerHall(ctx, M, S, { A: E.A, FY, z0: zFoot - 0.7, z1: -PZ - 0.5, floorMat });
  { const x = 3.35, z = -PZ - 3.2; k.cyl(0.58, 0.58, 0.12, mat.toon('#2a4f9a'), [x, FY + 0.06, z], null, 16); const gl = k.cyl(0.55, 0.55, 2.1, M.glass, [x, FY + 1.17, z], null, 16); gl.castShadow = false; k.cyl(0.6, 0.6, 0.14, mat.toon('#2a4f9a'), [x, FY + 2.29, z], null, 16); const [wx, wz] = S.W(x, z); ctx.physics.addCylinder(wx, wz, 0.6, FY - 0.5, FY + 2.4); }
  const Se = new Space(ctx, E.eframe, { name: 'pan1-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });

  // ---------------------------------------------------------------- the vestibule: concourse (hotel wing) + rotunda (escalator hall), joined by the internal doorway
  const Sv = new Space(ctx, E.eframe, { name: 'pan1-vestibule', tag: null, zone: 'pan1-vestibule-fx' }), kv = Sv.k;
  const dws = DOORWAYS.filter((d) => d.station === 'pan1'), dPass = dws.find((d) => d.id === 'pan1-pass'), dIn = dws.find((d) => d.id === 'pan1-in'), dOut = dws.find((d) => d.id === 'pan1-out');
  const polyA = K.inset(K.foot(PAN1_ROT), 0.45), polyB = K.clip(K.inset(K.foot(PAN1_BLDG), 0.45), [1, 0], [1880, 0]);
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z));
  const flute = M.rep(tex.draw(256, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) { const x = i * w / 8, gr = g.createLinearGradient(x, 0, x + w / 8, 0); gr.addColorStop(0, '#cdbf8d'); gr.addColorStop(0.4, '#efe3b6'); gr.addColorStop(0.8, '#e0d3a2'); gr.addColorStop(1, '#bfb17f'); g.fillStyle = gr; g.fillRect(x, 0, w / 8 + 1, h); }
    g.fillStyle = 'rgba(110,95,60,0.28)'; g.fillRect(0, h - 3, w, 3);
  }, { key: 'pan1-flute' }), 1 / 1.6, 1 / 3.2);
  const drum = mat.toon('#ffffff', { map: flute, side: 'double' });
  const vfloor = sharedFloor(ctx, M, '#8a7f74');
  const slats = mat.toon('#ffffff', { map: M.rep(tex.draw(64, 64, (g, w, h) => { for (let i = 0; i < 4; i++) { const y = i * h / 4, gr = g.createLinearGradient(0, y, 0, y + h / 4); gr.addColorStop(0, '#8a6440'); gr.addColorStop(0.5, '#b88a5c'); gr.addColorStop(1, '#6e4e30'); g.fillStyle = gr; g.fillRect(0, y, w, h / 4); } }, { key: 'pan1-slats' }), 1 / 0.6, 1 / 0.6), side: 'double' });
  const doorsA = [dPass].map((d) => ({ x: d.x, z: d.z, w: d.w, h: 2.9, arch: false })), doorsB = [dIn, dOut, dPass].map((d) => ({ x: d.x, z: d.z, w: d.w, h: 2.9, arch: false }));
  const roomA = buildPolyRoom(ctx, M, { id: 'pan1-rot', poly: polyA, ceil: 3.2, doors: doorsA, holes: [hole], wallMat: drum, ceilMat: mat.toon('#efe9d8', { side: 'double' }), floorMat: vfloor, lamps: false });
  const roomB = buildPolyRoom(ctx, M, { id: 'pan1-conc', poly: polyB, ceil: 4.2, doors: doorsB, wallMat: mat.toon('#ffffff', { map: panelTex(ctx, M, 'pan1-cwall', { base: '#d8d2c2', w: 0.9, h: 0.6, cols: 3, rows: 4 }), side: 'double' }), ceilMat: slats, floorMat: vfloor, lamps: { step: 4.2, mat: M.lampWarm, size: [1.2, 0.3], rot: -E.yaw } });
  res.rooms = [roomA, roomB]; res.room = roomA;
  K.liner(roomB.k, dPass, { dep: 1.0, h: 2.9 });
  // the closed glass door of the shopping centre in the party wall with the hotel block (OSM n5628616544): drawn on the inner face of the rotunda, no opening
  { const d = PAN1_MALL_DOOR, nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), x = d.x - nx * 0.47, z = d.z - nz * 0.47, ry = d.rotY + Math.PI, ux = nz, uz = -nx;
    roomA.k.box(d.w + 0.3, 2.75, 0.06, mat.toon('#2e3136'), [x, 1.42, z], [0, ry, 0]); const gl = roomA.k.plane(d.w - 0.1, 2.5, mat.toon('#7d93a3', { transparent: true, opacity: 0.75 }), [x - nx * 0.04, 1.32, z - nz * 0.04], [0, ry, 0]); gl.castShadow = false;
    for (const s of [-1, 1]) roomA.k.box(0.04, 0.5, 0.05, M.stainless, [x - nx * 0.07 + ux * s * 0.2, 1.1, z - nz * 0.07 + uz * s * 0.2], [0, ry, 0]); }
  shaftParapet(Sv, M, { A: E.A, len: 13, mat: mat.toon('#d9cfb0') });
  // the dodecagon ring lamp over the mouth, the round white column, the turnstile row across the free side of the shaft, machines and ticket windows in the concourse
  { const R = 6.2, cz = 6.5, y = 3.0, n = 12, seg = 2 * R * Math.sin(Math.PI / n); for (let i = 0; i < n; i++) { const a = (i + 0.5) * 2 * Math.PI / n, m = kv.box(seg, 0.09, 0.16, M.lampWhite, [R * Math.cos(Math.PI / n) * Math.cos(a), y, cz + R * Math.cos(Math.PI / n) * Math.sin(a)], [0, -a + Math.PI / 2, 0]); m.castShadow = false; } }
  for (const [x, z] of [[-6.2, 2.0], [6.2, 2.0], [-6.2, 11.0], [6.2, 11.0]]) kv.cyl(0.012, 0.012, 0.2, M.steelBlack, [x, 3.1, z], null, 4);
  { const [x, z] = [-9.5, 3.0]; if (roomA.inside(...Sv.W(x, z))) { kv.cyl(0.42, 0.42, 3.15, M.white, [x, 1.6, z], null, 18); const [wx, wz] = Sv.W(x, z); ctx.physics.addCylinder(wx, wz, 0.45, -1, 3.3); } }
  const freeA = (x, z, r = 0.5) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => roomA.inside(...Sv.W(x + dx, z + dz)));
  for (let x = 5.1; x < 14; x += 1.05) if (freeA(x, 7.0, 0.45)) turnstile(kv, M, x, 0.05, 7.0, 0);
  { const kb = roomB.k, kiosk = mat.toon('#4b4f58');
    for (const e of roomB.edges) { const rotY = Math.atan2(e.inward[0], e.inward[1]); if (e.l < 8 || e.doors.length) continue;
      for (let t = 2.0; t < e.l - 2.0 && t < 9; t += 1.6) { const x = e.a[0] + e.ux * t + e.inward[0] * 0.4, z = e.a[1] + e.uz * t + e.inward[1] * 0.4; kb.box(0.8, 1.9, 0.5, kiosk, [x, 1.0, z], [0, rotY, 0]); kb.box(0.6, 0.45, 0.05, M.lampCool, [x + e.inward[0] * 0.27, 1.45, z + e.inward[1] * 0.27], [0, rotY, 0]); ctx.physics.addBox(x, z, 0.9, 0.6, rotY, -1, 2.1); }
      break; } }
  X.addVestZone('pan1', (x, z) => roomA.inside(x, z) || roomB.inside(x, z), 6);
  // street side: stainless door frames with glass transoms; the name over the square doors (the hotel facade itself is the owner's: dossier section 10)
  { const g = new THREE.Group(); g.name = 'pan1-street'; ctx.addStatic(g); const kg = ctx.kit(g), nameMat = M.board(M.nameBoard(name, nameEn, GREEN, 'pan1-band'), 1.0);          // = the canvas of the green band of the hall (hall-gd.js key id + '-band')
    doorFrame(kg, M, dIn, { h: 2.9, name: { mat: nameMat, w: 5.2, h: 0.62 } }); doorFrame(kg, M, dOut, { h: 2.9 }); }

  // ---------------------------------------------------------------- wayfinding (signs.js; docs/research/metro-wayfinding.md sections 2, 3, 7): closed type, the green band is the hall's own
  //   S track (x -TRK) runs toward +z = Рыбацкое, N track toward -z = Беговая; the exit (incline) is at -z, the transfer (stair) at +z
  {
    const sg = makeSigns(ctx, M), LINE = '3', BH = 0.62, BY = FY + 3.2;
    const hallCeil = (x) => FY + GDH.SPRING + VB * Math.sqrt(Math.max(0, 1 - (x / GDH.A) ** 2)), lowCeil = (x) => FY + 1.0 + 4.9 * Math.sqrt(Math.max(0, 1 - (x / E.A) ** 2));
    const board = (z, rotY, sections, ceil = hallCeil) => { const L = sg.textures.hangBoard(sections, { w: BH }).length, bx = Math.min(L / 2 - 0.4, L * 0.32); return sg.hangBoard(S, { x: 0, y: BY, z: z + (rotY === 0 ? 0.065 : -0.065), rotY, sections, w: BH, both: false, rodLen: ceil(bx) + 0.04 - (BY + BH / 2) }); };
    const trS = (a) => sg.sec.trains(LINE, +1, a), trN = (a) => sg.sec.trains(LINE, -1, a), toPan2 = (a) => sg.sec.transfer({ to: 'pan2', line: '4', esc: true }, a);
    const exitP1 = { streets: [['Площадь Александра Невского', "Ploshchad' Aleksandra Nevskogo"], ['Невский проспект', 'Nevskiy prospekt']], esc: true };
    board(-PZ + 6.5, 0, [sg.sec.exit(exitP1, 'u', true)]);
    board(-PZ + 6.5, Math.PI, [trN('l'), trS('r')]);
    board(4, 0, [trS('l'), sg.sec.city('u', true), trN('r')]);
    board(4, Math.PI, [trN('l'), toPan2('u'), trS('r')]);
    board(PZ - 6.5, Math.PI, [toPan2('u')]);
    board(PZ - 6.5, 0, [trS('l'), trN('r')]);
    board(-PZ - 2.2, Math.PI, [trN('ul'), trS('ur')], lowCeil);
    board(-PZ - 4.6, 0, [sg.sec.exit(exitP1, 'u', true)], lowCeil);
    for (const [sx, rotY, travelZ] of [[-1, Math.PI / 2, +1], [1, -Math.PI / 2, -1]]) for (const z of res.piers.filter((q) => Math.abs(q) < 1 || Math.abs(Math.abs(q) - 39.3) < 1))
      sg.lineScheme(S, { x: sx * EDGE, y: FY + 1.6, z, rotY, line: LINE, currentId: 'pan1', dir: travelZ, ahead: sg.aheadOf(rotY, travelZ), w: 4.5, h: 1.2, res: 0.4 });
    sg.networkMap(S, { x: 5.7, y: FY + 1.7, z: -PZ + 0.002, rotY: 0, w: 1.4 });
    { const q = kv.plane(3.2, 0.7, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'pan1-v-trains', { bg: '#14a04f' }), 1.0), [0, 2.75, -0.8], [0, Math.PI, 0]); q.castShadow = false; }
  }

  // ---------------------------------------------------------------- the station object, the ways out and in
  const rt = X.rtOf('pan1', X.net.pan1, F, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'pan1', name, nameEn, frame: F, stock: 'neva', line: '3', idx: X.net.pan1.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Площадь Александра Невского 1». Переход на станцию «Площадь Александра Невского 2» Лахтинско-Правобережной линии'),
  });
  X.stations.pan1 = rt;
  closedDoors(ctx, rt, hall, S, F, PZ, FY);
  const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)], at = (d, out, tol) => { const [nx, nz] = nOf(d), q = [d.x + nx * out, d.z + nz * out]; return tol ? [...q, tol] : q; };
  const SeW = (x, z, tol) => K.at(Se, x, z, tol), SvW = (x, z, tol) => K.at(Sv, x, z, tol);
  res.exitRoute = () => ({ start: [...toWorld(F, 0, -20), FY], points: [toWorld(F, 0, -PZ + 2), toWorld(F, 1.5, -PZ - 3), SeW(2, E.run + 2.5, 0.4), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SvW(6.6, -1.6), SvW(6.6, 9.5), SvW(6.6, 14.0), at(dPass, -1.0), at(dPass, 1.6), at(dOut, -1.6), at(dOut, 0.4), at(dOut, 3.6)],
    door: [dOut.x, dOut.z], out: at(dOut, 3.6), outward: nOf(dOut) });
  res.entryRoute = () => ({ start: [...at(dIn, 4.5), 0], points: [at(dIn, 1.5, 0.6), at(dIn, -1.4), at(dPass, 1.6), at(dPass, -1.0), SvW(6.6, 12.0), SvW(6.6, 3.0), SvW(6.2, -2.4), SvW(-2, -2.4), SvW(-2, -1.4, 0.4), SeW(-2, 3, 0.4), SeW(-2, E.run - 2, 0.5), SeW(-1, E.run + 3), toWorld(F, 0, -PZ + 6)], end: { station: 'pan1', y: FY } });
  Object.assign(res, { S, Se, Sv, hall, esc, rt, vInfo, E });
  return res;
}

// =================================================================================================================================== PAN-2 (line 4, column hall)
function buildPan2(ctx, M, X, K) {
  const { mat, tex } = ctx;
  const F = FRAMES.pan2, PZ = PAN2_PZ, FY = F.y, E = ESC2.pan2, Eg = ESC2.pan2gal, { C, PY, EDGE, TRK, WALL } = PYLON, res = {};
  const name = 'Площадь Александра Невского 2', nameEn = 'Ploshchad Aleksandra Nevskogo 2';
  const S = new Space(ctx, F, { name: 'pan2' }), k = S.k;
  // ---------------------------------------------------------------- materials
  const pierMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'pan2-pier', { base: '#d5cfc1', w: 0.75, h: 0.5, cols: 4, rows: 8, vein: 'rgba(120,110,95,0.24)', dark: 'rgba(80,70,55,0.08)' }) });
  // the track wall measured from the track bed (uv in metres): pit 0-1.1, dark granite skirt to 1.7, bronze scales to 3.9, brass cornice, cream marble strip to the vault spring (4.7)
  const scaleTex = M.rep(tex.draw(256, 602, (g, w, h) => {
    const ppm = 128, Y = (v) => h - v * ppm, r = ctx.rng('pan2-scales');
    g.fillStyle = '#d6cfbe'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d1d22'; g.fillRect(0, Y(1.1), w, 1.1 * ppm); g.fillStyle = '#2f2e33'; g.fillRect(0, Y(1.7), w, 0.6 * ppm); g.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 0; x < w; x += 0.6 * ppm) g.fillRect(x, Y(1.7), 1.5, 0.6 * ppm);
    const top = Y(3.9), bot = Y(1.7), s = 0.25 * ppm; g.fillStyle = '#6e5a22'; g.fillRect(0, top, w, bot - top);
    for (let row = 0, y = bot; y > top - s; row++, y -= s * 0.62) for (let x = (row % 2) * s / 2 - s; x < w + s; x += s) {
      const gr = g.createRadialGradient(x + s * 0.5, y - s * 0.55, 1, x + s * 0.5, y - s * 0.4, s * 0.62); const t = r();
      gr.addColorStop(0, t < 0.3 ? '#f0d58a' : '#d9b866'); gr.addColorStop(0.7, '#a68b2e'); gr.addColorStop(1, '#5c4a18'); g.fillStyle = gr;
      g.beginPath(); g.moveTo(x, y - s * 0.55); g.arc(x + s * 0.5, y - s * 0.55, s * 0.5, Math.PI, 0, true); g.lineTo(x + s, y - s * 0.55); g.closePath(); g.fill();
    }
    g.fillStyle = '#c8a64a'; g.fillRect(0, Y(3.97), w, 0.07 * ppm); g.fillStyle = '#e2dccb'; g.fillRect(0, Y(4.7), w, 0.73 * ppm); g.fillStyle = 'rgba(120,110,90,0.3)'; for (let x = 0; x < w; x += 0.9 * ppm) g.fillRect(x, Y(4.7), 1.5, 0.73 * ppm);
  }, { key: 'pan2-scales' }), 1 / 2, 1 / 4.7);
  const trackMat = mat.toon('#ffffff', { map: scaleTex });
  const floorMat = sharedFloor(ctx, M, '#6e6c72');
  // ---------------------------------------------------------------- the hall (column mode: 2 m piers, 4 m round arches)
  const hall = buildPylonHall(ctx, M, S, { id: 'pan2', FY, PZ, name, nameEn, plain: true, column: true, noMeander: true, pylonMat: pierMat, trackMat, floorMat, vaultMat: mat.toon('#f3f1eb', { side: 'double' }),
    endHole: { N: { halfW: 2.4, spring: 1.0 }, S: { halfW: 3.0, spring: 1.2 } } });
  const vInfo = { openings: hall.openings, FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  for (const m of hall.mouths) { const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {}); if (m.zs < 0) K.defer('pan2:-1', go); else go(); }
  const inner = hall.pylonZ.slice(1, -1);
  // black granite feet of the piers, the orange ribbon with the name along the spandrels, a brass "loophole" lamp over every pier, ribs over the piers, cove light of the side halls
  {
    const brass = mat.toon('#c78938'), black = mat.toon('#1c1c1f'), ribbon = mat.toon(ORANGE), rib = mat.toon('#fbfaf6', { side: 'double' });
    for (const sx of [-1, 1]) {
      for (const z of inner) S.bx(sx > 0 ? C - 0.03 : -PY - 0.03, sx > 0 ? PY + 0.03 : -C + 0.03, FY, FY + 0.3, z - 1.03, z + 1.03, black);
      for (const [a, b] of [[-PZ, hall.openZ[0] - 2.0], [hall.openZ[hall.openZ.length - 1] + 2.0, PZ]]) S.bx(sx > 0 ? C - 0.03 : -PY - 0.03, sx > 0 ? PY + 0.03 : -C + 0.03, FY, FY + 0.3, a, b, black);
      const fx = sx * (C - 0.03); S.bx(fx - 0.02, fx + 0.02, FY + 3.62, FY + 3.97, -PZ + 0.6, PZ - 0.6, ribbon);
      const nb = M.board(M.nameBoard(name, nameEn, ORANGE, 'pan2-ribbon'), 1.0);
      for (let z = -PZ + 10; z < PZ - 6; z += 18) { const p = k.plane(3.0, 0.33, nb, [sx * (C - 0.06), FY + 3.795, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
      for (const z of inner) {                                                                              // the loophole lamp: a stepped brass box with three lit slots
        const x = sx * (C - 0.18); k.box(0.3, 0.62, 0.7, brass, [x, FY + 3.05, z]); k.box(0.42, 0.12, 0.84, brass, [x - sx * 0.04, FY + 2.7, z]);
        for (const dz of [-0.2, 0, 0.2]) { const l = k.box(0.06, 0.42, 0.1, M.lampWarm, [x - sx * 0.16, FY + 3.1, z + dz]); l.castShadow = false; }
      }
      S.bx(sx * (PY + 0.12) - 0.05, sx * (PY + 0.12) + 0.05, FY + 3.5, FY + 3.6, -PZ + 1, PZ - 1, M.lampWarm);
    }
    const geo = extrudeZ(archRing(C - 0.26, FY + 4.0, 0.28, FY + 4.0, 0, 28), -0.3, 0.3), im = new THREE.InstancedMesh(geo, rib, inner.length), d = new THREE.Object3D();
    inner.forEach((z, i) => { d.position.set(0, 0, z); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im);
    for (const sx of [-1, 1]) S.bx(sx * (C - 0.12) - 0.06, sx * (C - 0.12) + 0.06, FY + 4.05, FY + 4.15, -PZ + 0.5, PZ - 0.5, M.lampWarm);
  }
  // the floor of the central hall: the rose-brown rhombus between every pair of piers; benches in a few arches
  {
    const rh = tex.draw(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#7d6560'; g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w - 6, h / 2); g.lineTo(w / 2, h - 6); g.lineTo(6, h / 2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(40,30,28,0.5)'; g.lineWidth = 3; g.stroke(); }, { key: 'pan2-rhomb' });
    const rm = mat.decal('#ffffff', { map: rh });
    for (const z of hall.openZ) { const p = k.plane(3.0, 5.2, rm, [0, FY + 0.012, z], [-Math.PI / 2, 0, 0]); p.castShadow = false; }
    const wood = M.woodDark;
    for (const sx of [-1, 1]) for (const z of [hall.openZ[3], hall.openZ[hall.openZ.length - 4]]) { const x = sx * 5.3; k.box(0.55, 0.45, 2.4, mat.toon('#5d5a5e'), [x, FY + 0.225, z]); k.box(0.58, 0.05, 2.45, wood, [x, FY + 0.47, z]); S.col(x - 0.3, x + 0.3, FY, FY + 0.5, z - 1.2, z + 1.2); }
  }
  // the raised bronze nameplate on both track walls
  {
    const plate = mat.toon('#ffffff', { map: tex.draw(1024, 96, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d8b768'); gr.addColorStop(1, '#9c7d34'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a3a18'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = '#2e2412'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, [...'ПЛОЩАДЬ АЛЕКСАНДРА НЕВСКОГО'].join(String.fromCharCode(8202)), w / 2, h / 2 + 2, w - 40, 64, SERIF, 600); }, { key: 'pan2-plate' }) });
    for (const sx of [-1, 1]) for (const z of [-50, -10, 30, 66]) { const fx = sx > 0 ? WALL - 0.15 : -WALL + 0.15; k.box(0.06, 0.42, 5.6, mat.toon('#7a6230'), [fx - sx * 0.03, FY + 2.55, z]); const p = k.plane(5.4, 0.36, plate, [fx - sx * 0.065, FY + 2.55, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
  }
  // the empty gold-smalt niche over the west passage arch (a bronze Alexander Nevsky was planned and never made: no statue)
  {
    const smalt = tex.draw(256, 256, (g, w, h) => { const r = ctx.rng('pan2-smalt'); g.fillStyle = '#b8922e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = ['#d9b54a', '#a8842a', '#e8c868', '#8a6a1e', '#c9a03c'][(r() * 5) | 0]; g.fillRect(r() * w, r() * h, 3 + r() * 4, 3 + r() * 3); } }, { key: 'pan2-smalt' });
    const z0 = -PZ + 0.02, ring = []; for (let i = 0; i <= 20; i++) { const t = Math.PI - i * Math.PI / 20; ring.push([1.7 * Math.cos(t), FY + 5.6 + 1.7 * Math.sin(t)]); }
    const sh = new THREE.Shape([new THREE.Vector2(-1.7, FY + 4.4), ...ring.map((p) => new THREE.Vector2(p[0], p[1])), new THREE.Vector2(1.7, FY + 4.4)]);
    const sm = new THREE.Mesh(new THREE.ShapeGeometry(sh), mat.toon('#ffffff', { map: M.rep(smalt, 1 / 1.2, 1 / 1.2) })); K.uv(sm.geometry, 1, 1); sm.position.z = z0; sm.castShadow = false; S.group.add(sm);
    S.bx(-1.95, 1.95, FY + 4.25, FY + 4.4, z0, z0 + 0.4, M.marbleWhite);
  }
  K.sill(S, { x0: -2.4, x1: 2.4, z0: -PZ - 0.8, z1: -PZ + 0.2, y: FY });
  K.sill(S, { x0: -3.0, x1: 3.0, z0: PZ - 0.2, z1: PZ + 0.8, y: FY });

  // ---------------------------------------------------------------- the west passage: 28 steps up from the -z end, a corridor to the foot of the incline
  const st = K.stair(S, { z0: -PZ - 0.6, z1: -PZ - 0.6 - PAN2_STEPS * 0.28, y0: FY, y1: PAN2_FOOT_Y, n: PAN2_STEPS, w: 4.0 }), zTop = -PZ - 0.6 - st.run;
  K.plate(S, { z: zTop - 0.15, y: PAN2_FOOT_Y, ow: 3.8, oh: 4.4, hw: 2.3, spring: 0.7 });
  K.sill(S, { x0: -2.3, x1: 2.3, z0: zTop - 0.7, z1: zTop + 0.1, y: PAN2_FOOT_Y });              // the joint corridor / top tread (the corridor floor stops 5 cm short of it)
  const Se = new Space(ctx, E.eframe, { name: 'pan2-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });
  K.bulkhead(Se, { A: E.A, FY: E.FY, run: E.run });
  {
    const grp = X.mkGroup('pan2-incline-passage'), t1 = [Math.sin(F.yaw), Math.cos(F.yaw)], end = toWorld(F, 0, zTop - 0.3);
    const pts = bezierPath([E.bottom.x, E.bottom.z], E.e, end, t1, 30, 13, 2.5); res.radius = minRadius(pts);
    X.cor('pan2-incline-passage', grp, pts.map((p) => [p[0], PAN2_FOOT_Y, p[1]]), X.CORR);
  }
  // ---------------------------------------------------------------- the gallery at the +z end: a short landing, two small escalators up to the transfer passage
  lowerHall(ctx, M, S, { A: Eg.A, FY, z0: PZ + 0.1, z1: S.L(Eg.bottom.x, Eg.bottom.z)[1] + 0.7, bv: 3.2, floorMat });
  const Sg = new Space(ctx, Eg.eframe, { name: 'pan2-gallery' });
  const gal = buildEscalator(ctx, M, Sg, { FY: Eg.FY, yTop: Eg.yTop, zTop: 0, zBottom: Eg.run, mouth: false, trench: false, shellStart: 0, lanes: Eg.lanes, halfW: Eg.A, bv: 3.2 });
  K.plate(Sg, { z: -0.1, y: Eg.yTop, ow: 3.6, oh: 4.6, hw: 2.4, spring: 1.0 });

  // ---------------------------------------------------------------- the vestibule in the round end of Chernoretsky 3
  const Sv = new Space(ctx, E.eframe, { name: 'pan2-vestibule', tag: null, zone: 'pan2-vestibule-fx' }), kv = Sv.k;
  const dws = DOORWAYS.filter((d) => d.station === 'pan2'), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  const ex = [Math.cos(E.yaw), -Math.sin(E.yaw)];
  const poly = K.clip(K.clip(K.inset(K.foot(PAN2_BLDG), 0.45), ex, Sv.W(-18.5, 0)), [-E.e[0], -E.e[1]], Sv.W(0, 19));
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z)), CEIL = 9.0;
  const dolomite = mat.toon('#ffffff', { map: panelTex(ctx, M, 'pan2-vwall', { base: '#d8c9a0', w: 0.8, h: 0.5, cols: 3, rows: 6, vein: 'rgba(130,110,70,0.2)' }), side: 'double' });
  const room = buildPolyRoom(ctx, M, { id: 'pan2-vest', poly, ceil: CEIL, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 3.0, arch: false })), holes: [hole], wallMat: dolomite, ceilMat: mat.toon('#e8e2d4', { side: 'double' }),
    floorMat: sharedFloor(ctx, M, '#a48a80'), lamps: false });                                          // Karelian granite
  res.room = room;
  shaftParapet(Sv, M, { A: E.A, len: 13, mat: mat.toon('#9a8f80') });
  // the radial folded dome with the lit oculus (folds of white concrete, a brown timber soffit ring under it), centred on the rotunda
  {
    const [ccx, ccz] = Sv.L(1795.8, 982.9), N = 32, Ro = 12.0, Ri = 2.4, yo = 6.0, yi = 8.4, P = [], I = [];
    for (let i = 0; i < N; i++) { const a = i * 2 * Math.PI / N, ro = Ro, h = i % 2 ? 0.7 : 0; P.push(ccx + ro * Math.cos(a), yo + h, ccz + ro * Math.sin(a), ccx + Ri * Math.cos(a), yi, ccz + Ri * Math.sin(a)); }
    for (let i = 0; i < N; i++) { const j = (i + 1) % N, a = 2 * i, b = 2 * i + 1, c = 2 * j, d2 = 2 * j + 1; I.push(a, c, b, b, c, d2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
    const dm = new THREE.Mesh(g.toNonIndexed(), mat.toon('#f2efe8', { side: 'double' })); dm.geometry.computeVertexNormals(); dm.castShadow = false; Sv.group.add(dm);
    const ocu = new THREE.Mesh(new THREE.CircleGeometry(Ri, 24), M.lampWhite); ocu.rotation.x = Math.PI / 2; ocu.position.set(ccx, yi + 0.3, ccz); ocu.castShadow = false; Sv.group.add(ocu);
    const sof = new THREE.Mesh(new THREE.CylinderGeometry(Ro + 0.6, Ro + 0.6, 0.5, 40, 1, true), mat.toon('#6e4a2c', { side: 'double' })); sof.position.set(ccx, yo - 0.2, ccz); sof.castShadow = false; Sv.group.add(sof);
    for (let i = 0; i < 16; i++) { const a = (i + 0.25) * 2 * Math.PI / 16, l = kv.box(0.9, 0.08, 0.3, M.lampWarm, [ccx + (Ro - 0.6) * Math.cos(a), yo - 0.5, ccz + (Ro - 0.6) * Math.sin(a)], [0, -a, 0]); l.castShadow = false; }
  }
  // the mosaic «Ледовое побоище» on the south wall over the mouth (gold ground, riders with lances on the ice: no banners)
  {
    let zw = 19; for (let z = 13.5; z < 30; z += 0.1) if (!room.inside(...Sv.W(0, z))) { zw = z - 0.06; break; }
    const mos = tex.draw(768, 256, (g, w, h) => {
      const r = ctx.rng('pan2-ice');
      for (let i = 0; i < 2600; i++) { g.fillStyle = ['#d8b44a', '#c9a23c', '#e6c65e', '#b8902e'][(r() * 4) | 0]; g.fillRect(r() * w, r() * h * 0.62, 4, 4); }
      for (let i = 0; i < 1800; i++) { g.fillStyle = ['#c9dbe6', '#e8f0f4', '#9fb8c8', '#b2c8d6'][(r() * 4) | 0]; g.fillRect(r() * w, h * 0.62 + r() * h * 0.38, 4, 3); }
      g.strokeStyle = '#5a7484'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); let x = r() * w, y = h * 0.66; g.moveTo(x, y); for (let q = 0; q < 4; q++) { x += (r() - 0.5) * 80; y += r() * 22; g.lineTo(x, y); } g.stroke(); }
      const rider = (x, y, s, dir, col, horse) => {
        g.fillStyle = horse; g.beginPath(); g.ellipse(x, y, 34 * s, 15 * s, 0, 0, 7); g.fill(); g.fillRect(x - 26 * s, y, 7 * s, 30 * s); g.fillRect(x + 20 * s, y, 7 * s, 30 * s);
        g.beginPath(); g.moveTo(x + dir * 26 * s, y - 6 * s); g.lineTo(x + dir * 50 * s, y - 24 * s); g.lineTo(x + dir * 46 * s, y - 8 * s); g.closePath(); g.fill();
        g.fillStyle = col; g.fillRect(x - 8 * s, y - 40 * s, 16 * s, 28 * s); g.beginPath(); g.arc(x, y - 47 * s, 8 * s, 0, 7); g.fill();
        g.strokeStyle = '#3a3226'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x - dir * 10 * s, y - 20 * s); g.lineTo(x + dir * 70 * s, y - 52 * s); g.stroke();        // the lance
        g.fillStyle = col; g.beginPath(); g.ellipse(x - dir * 12 * s, y - 24 * s, 7 * s, 12 * s, 0, 0, 7); g.fill();                                                      // a round shield
      };
      for (let i = 0; i < 5; i++) rider(80 + i * 62, 150 + (i % 2) * 8, 0.9, 1, '#7a2a1e', '#4a3a2e');
      for (let i = 0; i < 5; i++) rider(w - 80 - i * 62, 152 + (i % 2) * 8, 0.9, -1, '#dcdcd8', '#8a8a86');
    }, { key: 'pan2-mosaic' });
    const p = kv.plane(10.5, 3.5, M.boardToon(mos), [0, 5.0, zw], [0, Math.PI, 0]); p.castShadow = false;
  }
  // turnstiles across the room north of the mouth, glass partitions to the walls; the sign
  {
    const zt = -3.6, free = (x, z, r = 0.5) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => room.inside(...Sv.W(x + dx, z + dz)));
    for (let x = -6.6; x <= 6.6; x += 1.2) if (free(x, zt, 0.4)) turnstile(kv, M, x, 0.05, zt, 0);
    for (const sx of [-1, 1]) { let xe = sx * 7.2; while (free(xe + sx * 0.3, zt, 0.2) && Math.abs(xe) < 30) xe += sx * 0.3; const xa = Math.min(sx * 7.2, xe), xb = Math.max(sx * 7.2, xe); if (xb - xa < 0.2) continue;
      kv.box(xb - xa, 2.2, 0.08, M.glass, [(xa + xb) / 2, 1.15, zt]); kv.box(xb - xa, 0.1, 0.12, M.stainless, [(xa + xb) / 2, 2.3, zt]); Sv.col(xa, xb, -0.5, 2.4, zt - 0.15, zt + 0.15); }
    const q = kv.plane(3.2, 0.7, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'pan2-v-trains', { bg: '#e8741f' }), 1.0), [0, 3.4, -0.9], [0, Math.PI, 0]); q.castShadow = false;
  }
  X.addVestZone('pan2', room.inside, 10);
  { const g = new THREE.Group(); g.name = 'pan2-street'; ctx.addStatic(g); const kg = ctx.kit(g), nameMat = M.board(M.nameBoard(name, nameEn, ORANGE, 'pan2-ribbon'), 1.0);       // = the canvas of the orange ribbon of the hall
    doorFrame(kg, M, dIn, { h: 3.0, name: { mat: nameMat, w: 5.0, h: 0.6 } }); doorFrame(kg, M, dOut, { h: 3.0 }); }

  // ---------------------------------------------------------------- wayfinding: exit (incline passage) at -z, the transfer (gallery) at +z; S track toward +z = Улица Дыбенко
  {
    const sg = makeSigns(ctx, M), SPC = FY + 4.0, SPS = FY + 3.6, CXS = (PY + WALL) / 2, RS = PYLON.RS, YB = FY + 3.3, line = '4', BH = 0.62;
    const vaultY = (x, side) => side ? SPS + Math.sqrt(Math.max(0, RS * RS - (Math.abs(x) - CXS) ** 2)) : SPC + Math.sqrt(Math.max(0, C * C - x * x));
    const board = (o, side) => {
      const L = sg.textures.hangBoard(o.sections, { w: BH }).length, r = o.rotY || 0, bx = Math.min(L / 2 - 0.4, L * 0.32), top = o.y + BH / 2;
      const b = sg.hangBoard(S, { ...o, w: BH, rodLen: 0, both: false });
      for (const s of [-1, 1]) { const rx = o.x + s * bx * Math.cos(r), rz = o.z - s * bx * Math.sin(r), len = vaultY(rx, side) + 0.1 - top, rod = k.cyl(0.012, 0.012, len, M.steelBlack, [rx, top + len / 2, rz], null, 4); rod.castShadow = false; }
      return b;
    };
    const trS = (a) => sg.sec.trains(line, +1, a), trN = (a) => sg.sec.trains(line, -1, a), toPan1 = (a) => sg.sec.transfer({ to: 'pan1', line: '3', esc: true }, a);
    const exitP2 = { streets: [['Невский проспект', 'Nevskiy prospekt'], ['Чернорецкий переулок', 'Chernoretskiy lane']], esc: true };
    board({ x: 0, y: YB, z: -PZ + 4.5, rotY: 0, sections: [sg.sec.exit(exitP2, 'u', true)] }, false);
    board({ x: 0, y: YB, z: -PZ + 4.3, rotY: Math.PI, sections: [trN('l'), trS('r')] }, false);
    board({ x: 0, y: YB, z: 0.1, rotY: 0, sections: [trS('l'), sg.sec.city('u', true), trN('r')] }, false);
    board({ x: 0, y: YB, z: -0.1, rotY: Math.PI, sections: [trN('l'), toPan1('u'), trS('r')] }, false);
    board({ x: 0, y: YB, z: PZ - 4.3, rotY: Math.PI, sections: [toPan1('u')] }, false);
    board({ x: 0, y: YB, z: PZ - 4.5, rotY: 0, sections: [trS('l'), trN('r')] }, false);
    for (const sx of [-1, 1]) { board({ x: sx * 7.9, y: YB, z: -PZ + 9, rotY: 0, sections: [sg.sec.city('u', true)] }, true); board({ x: sx * 7.9, y: YB, z: PZ - 9, rotY: Math.PI, sections: [sg.sec.transfer({ to: 'pan1', line: '3', plain: true }, 'u')] }, true); }
    for (const [wx, rotY, travelZ] of [[-WALL + 0.15, Math.PI / 2, +1], [WALL - 0.15, -Math.PI / 2, -1]]) for (const z of [-30, 10, 48]) sg.lineScheme(S, { x: wx, y: FY + 1.6, z, rotY, line, currentId: 'pan2', dir: travelZ, ahead: sg.aheadOf(rotY, travelZ), res: 0.4 });
    sg.networkMap(S, { x: 3.35, y: FY + 1.7, z: -PZ + 0.002, rotY: 0, w: 1.2 });
    // the gallery: the transfer board at its foot (read by those who walk toward +z) and the trains board for those who come down
    board({ x: 0, y: YB, z: PZ - 1.6, rotY: 0, sections: [trS('ul'), trN('ur')] }, false);
  }

  // ---------------------------------------------------------------- the station object, the ways out and in
  const rt = X.rtOf('pan2', X.net.pan2, F, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'pan2', name, nameEn, frame: F, stock: '717', line: '4', idx: X.net.pan2.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Площадь Александра Невского 2». Переход на станцию «Площадь Александра Невского 1» Невско-Василеостровской линии'),
  });
  X.stations.pan2 = rt;
  const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)], at = (d, out, tol) => { const [nx, nz] = nOf(d), q = [d.x + nx * out, d.z + nz * out]; return tol ? [...q, tol] : q; };
  const SeW = (x, z, tol) => K.at(Se, x, z, tol), SvW = (x, z, tol) => K.at(Sv, x, z, tol);
  res.exitRoute = (debug) => ({ start: [...toWorld(F, 0, -30), FY], points: [toWorld(F, 0, -PZ + 2), toWorld(F, 0, -PZ - 1.4), K.at(S, 0, zTop + 1.0, 0.6), toWorld(F, 0, zTop - 1.5), ...K.cp(debug, 'pan2-incline-passage', 3, true).slice(1, -1), SeW(2, E.run + 1.0, 0.5), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SvW(6.6, -1.6), at(dOut, -1.4), at(dOut, 0.4), at(dOut, 3.6)],
    door: [dOut.x, dOut.z], out: at(dOut, 3.6), outward: nOf(dOut) });
  res.entryRoute = (debug) => ({ start: [...at(dIn, 4.5), 0], points: [at(dIn, 1.5, 0.6), at(dIn, -1.4), SvW(1.5, -6.5), SvW(0.6, -2.4), SvW(-2, -1.6, 0.4), SeW(-2, 3, 0.4), SeW(-2, E.run - 2, 0.5), SeW(-1, E.run + 1.2, 0.6), ...K.cp(debug, 'pan2-incline-passage', 3).slice(1, -1), toWorld(F, 0, zTop - 1.5), K.at(S, 0, zTop + 1.0, 0.6), toWorld(F, 0, -PZ - 1.4), toWorld(F, 0, -PZ + 6)], end: { station: 'pan2', y: FY } });
  Object.assign(res, { S, Se, Sg, Sv, hall, esc, gal, rt, vInfo, E, Eg, zTop });
  return res;
}

// =================================================================================================================================== the transfer passage PAN-1 <-> PAN-2
function buildPassage(ctx, M, X, K, p1, p2) {
  const { mat, tex } = ctx, S = p1.S, F = FRAMES.pan1, PZ = PAN1_PZ, FY = F.y, Eg = p2.Eg, res = {};
  const marble = mat.toon('#ffffff', { map: panelTex(ctx, M, 'pan-pass-wall', { base: '#e6e2d8', w: 0.9, h: 0.45, cols: 3, rows: 6, vein: 'rgba(90,96,100,0.30)', veins: 40 }), side: 'double' });
  const floor = mat.toon('#9c938a', { map: M.T.granite('gen-floor', '#8b8782', 'rgba(25,25,28,0.35)', 'rgba(255,255,255,0.30)'), side: 'double' });       // the shared floor canvas (hall-vault sharedFloor), double sided for the corridor loft
  // 21 steps up from the +z end of PAN-1 to the landing
  const st = K.stair(S, { z0: PZ + 0.6, z1: PZ + 0.6 + PAN1_STEPS * 0.3, y0: FY, y1: LANDING_Y, n: PAN1_STEPS, w: 4.0, wallMat: marble }), zL = PZ + 0.6 + st.run;
  // the landing: a tall room over the running tubes with the copper relief on its west wall (to the right of those who come up the stair)
  const L0 = zL, L1 = zL + 12.1, H = 6.0;
  buildJunction(ctx, M, S, { x0: -5.5, x1: 5.5, z0: L0, z1: L1, y: LANDING_Y, arms: { N: 0, S: 0 }, H, hw: 2.4, spring: 0.6 });
  K.sill(S, { x0: -2.4, x1: 2.4, z0: L1 - 0.2, z1: L1 + 0.7, y: LANDING_Y });                      // the threshold of the south arch (the landing floor stops at the wall, the ramp starts behind it)
  {
    const rel = tex.draw(512, 384, (g, w, h) => {
      g.save(); g.scale(w / 768, h / 576); w = 768; h = 576;
      const r = ctx.rng('pan-relief');
      g.clearRect(0, 0, w, h); g.save();
      g.beginPath(); g.moveTo(40, h); g.lineTo(96, 150); g.bezierCurveTo(150, 10, w - 150, 10, w - 96, 150); g.lineTo(w - 40, h); g.closePath(); g.clip();
      g.fillStyle = '#25231f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(70,90,70,0.10)' : 'rgba(0,0,0,0.12)'; g.fillRect(r() * w, r() * h, 3 + r() * 8, 2 + r() * 6); }
      // gilded line ornament: shield outlines (tall drops), onion-dome silhouettes on the horizon, helmets of the host
      g.strokeStyle = '#c9a24b'; g.lineWidth = 4;
      for (let i = 0; i < 9; i++) { const x = 70 + i * 72, y = h - 130; g.beginPath(); g.moveTo(x, y - 70); g.bezierCurveTo(x + 34, y - 60, x + 34, y + 10, x, y + 60); g.bezierCurveTo(x - 34, y + 10, x - 34, y - 60, x, y - 70); g.stroke(); g.beginPath(); g.arc(x, y - 18, 14, 0, 7); g.stroke(); }
      for (let i = 0; i < 7; i++) { const x = 120 + i * 82, y = 215 + (i % 2) * 14; g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x - 18, y - 22); g.bezierCurveTo(x - 20, y - 40, x - 2, y - 44, x, y - 58); g.bezierCurveTo(x + 2, y - 44, x + 20, y - 40, x + 18, y - 22); g.lineTo(x + 18, y); g.stroke(); g.beginPath(); g.moveTo(x, y - 58); g.lineTo(x, y - 74); g.stroke(); }
      for (let i = 0; i < 16; i++) { const x = 60 + i * 42, y = 300 + (i % 3) * 6; g.beginPath(); g.arc(x, y, 11, Math.PI, 0); g.lineTo(x + 11, y + 10); g.lineTo(x - 11, y + 10); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x, y - 22); g.stroke(); }
      g.restore(); g.restore();
    }, { key: 'pan-relief-field' });
    const riders = tex.draw(384, 288, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.save(); g.scale(w / 512, h / 384); w = 512; h = 384;
      const bronze = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#d9b56a'); gr.addColorStop(0.5, '#a07a38'); gr.addColorStop(1, '#5e4320'); return gr; };
      // four horses in echelon (the front one fully, three behind it), five riders: helmets, shields, lances (no banner, no flag)
      for (let i = 3; i >= 0; i--) {
        const dx = i * 46, dy = -i * 16; g.fillStyle = bronze(60 + dx, 160 + dy, 360 + dx, 330 + dy);
        g.beginPath(); g.ellipse(210 + dx, 250 + dy, 118, 50, -0.05, 0, 7); g.fill();                                                 // body
        g.beginPath(); g.moveTo(300 + dx, 230 + dy); g.lineTo(370 + dx, 140 + dy); g.lineTo(402 + dx, 150 + dy); g.lineTo(392 + dx, 190 + dy); g.lineTo(330 + dx, 260 + dy); g.closePath(); g.fill();   // neck + head
        for (const [lx, ld] of [[120, 0.35], [160, -0.25], [270, 0.3], [300, -0.2]]) { g.save(); g.translate(lx + dx, 280 + dy); g.rotate(ld); g.fillRect(-9, 0, 18, 92); g.restore(); }
        g.beginPath(); g.moveTo(95 + dx, 240 + dy); g.quadraticCurveTo(40 + dx, 260 + dy, 50 + dx, 330 + dy); g.lineTo(70 + dx, 330 + dy); g.quadraticCurveTo(70 + dx, 270 + dy, 105 + dx, 258 + dy); g.fill();        // tail
      }
      for (let i = 4; i >= 0; i--) {
        const dx = Math.min(3, i) * 46 + (i === 4 ? 22 : 0), dy = -Math.min(3, i) * 16 - (i === 4 ? 30 : 0); g.fillStyle = bronze(170 + dx, 60 + dy, 260 + dx, 230 + dy);
        g.beginPath(); g.moveTo(180 + dx, 215 + dy); g.lineTo(196 + dx, 120 + dy); g.lineTo(236 + dx, 120 + dy); g.lineTo(246 + dx, 215 + dy); g.closePath(); g.fill();   // torso in mail
        g.beginPath(); g.arc(216 + dx, 100 + dy, 20, 0, 7); g.fill(); g.beginPath(); g.moveTo(196 + dx, 92 + dy); g.lineTo(216 + dx, 58 + dy); g.lineTo(236 + dx, 92 + dy); g.closePath(); g.fill();   // head + pointed helmet
        g.beginPath(); g.ellipse(180 + dx, 170 + dy, 22, 40, 0.1, 0, 7); g.fill();                                                                                          // shield
        g.strokeStyle = '#5e4320'; g.lineWidth = 6; g.beginPath(); g.moveTo(150 + dx, 250 + dy); g.lineTo(330 + dx, 40 + dy); g.stroke();                                 // lance
      }
      g.restore();
    }, { key: 'pan-relief-riders' });
    const x = -5.5 + 0.03, zc = (L0 + L1) / 2, y = LANDING_Y;
    S.k.box(0.12, 0.25, 7.0, mat.toon('#5a4a30'), [x + 0.06, y + 0.55, zc]);
    const p = S.k.plane(6.6, 4.95, mat.decal('#ffffff', { map: rel }), [x + 0.02, y + 3.1, zc], [0, Math.PI / 2, 0]); p.castShadow = false;
    const q = S.k.plane(3.9, 2.9, mat.decal('#ffffff', { map: riders }), [x + 0.14, y + 3.5, zc - 0.2], [0, Math.PI / 2, 0]); q.castShadow = false;
    // the row of small brass loophole lamps along the top of the relief, the bench in front of it
    for (let i = 0; i < 7; i++) { const zz = zc - 2.7 + i * 0.9, yy = y + 5.35 - Math.abs(i - 3) * 0.12; S.k.box(0.2, 0.36, 0.3, mat.toon('#c78938'), [x + 0.1, yy, zz]); const l = S.k.box(0.04, 0.24, 0.08, M.lampWarm, [x + 0.21, yy, zz]); l.castShadow = false; }
    S.k.box(0.6, 0.45, 3.0, mat.toon('#6b6660'), [x + 1.4, y + 0.225, zc]); S.k.box(0.64, 0.06, 3.05, M.woodDark, [x + 1.4, y + 0.48, zc]); S.col(x + 1.1, x + 1.7, y, y + 0.5, zc - 1.5, zc + 1.5);
    res.relief = { x, zc, y };
  }
  // the footway: a 10 % ramp along the axis (between the running tubes), then the curve that crosses over the PAN-1 track tube to the head of the gallery
  {
    const grp = X.mkGroup('pan-transfer'), W = (lx, lz) => toWorld(F, lx, lz), t1 = [Math.sin(F.yaw), Math.cos(F.yaw)], z0 = L1 + 0.3;
    const ramp = []; for (let z = z0; z < z0 + 10.01; z += 2.5) { const q = W(0, z); ramp.push([q[0], LANDING_Y + (PASS_Y - LANDING_Y) * (z - z0) / 10, q[1]]); }
    const P = W(0, z0 + 10), G = [Eg.head.x, Eg.head.z], curve = bezierPath(P, t1, G, Eg.e, 22, 26, 2.5);
    res.radius = minRadius([...ramp.map((q) => [q[0], q[2]]), ...curve.slice(1)]);
    X.cor('pan-transfer', grp, [...ramp, ...curve.slice(1).map((q) => [q[0], PASS_Y, q[1]])], { w: 5.2, h: 2.6, rise: 1.2, wallMat: marble, floorMat: floor });
  }
  // signs: on the landing toward the arriving walkers of both stations, at the head of the gallery
  {
    const sg = makeSigns(ctx, M), BH = 0.62, y = LANDING_Y + 3.1, toPan2 = (a) => sg.sec.transfer({ to: 'pan2', line: '4', esc: true }, a), toPan1 = (a) => sg.sec.transfer({ to: 'pan1', line: '3', esc: true }, a);
    sg.hangBoard(S, { x: 0, y, z: L0 + 2.5, rotY: Math.PI, sections: [toPan2('u')], w: BH, both: false, rodLen: LANDING_Y + H - 0.06 - (y + BH / 2) });
    sg.hangBoard(S, { x: 0, y, z: L1 - 2.0, rotY: 0, sections: [toPan1('u')], w: BH, both: false, rodLen: LANDING_Y + H - 0.06 - (y + BH / 2) });
    const Sg = p2.Sg, yg = Eg.yTop + 2.95;
    sg.hangBoard(Sg, { x: 0, y: yg, z: -4.0, rotY: Math.PI, sections: [toPan2('u')], w: BH, both: false, rodLen: Eg.yTop + 3.75 - (yg + BH / 2) });
    sg.hangBoard(Sg, { x: 0, y: yg, z: -6.5, rotY: 0, sections: [toPan1('u')], w: BH, both: false, rodLen: Eg.yTop + 3.75 - (yg + BH / 2) });
  }
  X.debug.radii.panTransfer = res.radius;
  Object.assign(res, { st, L0, L1 });
  return res;
}
