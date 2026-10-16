// metro/st-gorny.js — Gorny Institut (line 4, -70 m, opened 27 Dec 2024; docs/research/vo-roster-metro.md section 2.2, photos refs/metro-vo g1-g3, Commons "Metro SPB Line4 Gorny Institut").
//   hall       three-vault PYLON station of the engine's pylon hall (hall-pylon.js, own cross-section and a 4.5 m pitch): a white panelled vault, cream-tan travertine track walls (0.6 x 0.3 courses),
//              PYLONS of black-green granite with a white metal band at the waist and arched openings, COPPER LAMP BOXES over the openings (sloped milk-white panels in a copper frame with
//              a ring balustrade along the top edge), light granite floor with dark green strips behind the pylons, cream marble benches, black-and-white etched mining panels, orange name bands.
//              184.5 m long (7-car trains of line 4). The hall end toward Spasskaya carries the name panel.
//   incline    4 lanes (two down, two up), AXIAL, 63 m of rise to the underground ticket hall (-7 m), 109 m of run, a 3 m landing at the NW end
//   ticket hall   an underground hall (28 x 44 m, -7 m) under Bolshoy pr. / Kosaya liniya: barriers, machines, the bronze relief of the miners over the mouth; two corridors lead to the landing rooms
//              of the two small pavilions of Bolshoy pr. 66 (WELLS gorny-in / gorny-out: 47 steps + a down / up escalator, drawn by landmarksSredny: the generic city until then; the interiors are mine)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FRAMES, ESC2, WELLS, DOORWAYS, GN_PZ, GN_UY, toWorld } from '../data/metro.js';
import { Space } from './lib.js';
import { buildPylonHall } from './hall-pylon.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, shaftParapet } from './petro-kit.js';
import { buildWell } from './pavilion.js';
import { stripFloor } from './vo-kit.js';
import { sharedFloor } from './hall-vault.js';
import { extrudeZ } from './lib.js';
import { makeSigns } from './signs.js';

const ORANGE = '#ea7125', FONT = '"Rubik","Noto Sans",sans-serif';
const DIMS = { C: 5.2, PY: 6.7, EDGE: 9.2, TRK: 10.8, WALL: 13.3, RS: 3.3 };
const HUB = { x0: -14, x1: 14, z0: -15, z1: 29 };                                     // the ticket hall in the escalator frame (head at the origin, z along the descent toward SE)
const DOOR_W = { z: 26.4 }, DOOR_E = { z: 11.4 };                                    // the doors of the hall: west wall (corridor of the entrance pavilion), east wall (exit pavilion)

// corridor path: a "turtle" in (x', z') of the escalator frame: ['s', L] straight, ['l' | 'r', degrees, R] left / right turn (heading phi in degrees, x' east-ish, z' down)
const turtle = (p0, phi0, steps, ds = 2.5) => {
  let [x, z] = p0, phi = phi0 * Math.PI / 180; const pts = [[x, z]];
  for (const st of steps) {
    if (st[0] === 's') { const n = Math.max(1, Math.round(st[1] / ds)); for (let i = 0; i < n; i++) { x += Math.cos(phi) * st[1] / n; z += Math.sin(phi) * st[1] / n; pts.push([x, z]); } }
    else { const sg = st[0] === 'l' ? -1 : 1, dphi = st[1] * Math.PI / 180, R = st[2], n = Math.max(2, Math.round(dphi * R / ds)); for (let i = 0; i < n; i++) { const a = dphi / n; const nx = x + R * (Math.sin(phi + sg * a) - Math.sin(phi)) * sg, nz = z - R * (Math.cos(phi + sg * a) - Math.cos(phi)) * sg; x = nx; z = nz; phi += sg * a; pts.push([x, z]); } }
  }
  return { pts, end: [x, z], phi: phi * 180 / Math.PI };
};

export function buildGorny(ctx, M, X) {
  const { mat, tex } = ctx;
  const GN = FRAMES.gorny, PZ = GN_PZ, FY = GN.y, E = ESC2.gorny, UY = GN_UY, res = {};
  const name = 'Горный институт', nameEn = 'Gorny Institut';
  const S = new Space(ctx, GN, { name: 'gorny' }), k = S.k;
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1];                                        // hall z of the foot of the incline (-95.25)

  // ================================================================ materials
  const rep = (t, x, y) => M.rep(t, x, y);
  const granite = mat.toon('#ffffff', { map: rep(tex.draw(256, 256, (g, w, h) => { const r = ctx.rng('gn-granite'); g.fillStyle = '#212b26'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { g.fillStyle = ['#34443b', '#15201a', '#3c5046', '#2a3a31'][(r() * 4) | 0]; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); } for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(210,225,215,0.28)'; g.fillRect(r() * w, r() * h, 1.2, 1.2); } }, { key: 'gn-granite' }), 1 / 2, 1 / 2) });
  const travertine = mat.toon('#ffffff', { map: panelTex(ctx, M, 'gn-trav', { base: '#d6bb98', w: 0.6, h: 0.3, cols: 3, rows: 8, vein: 'rgba(150,110,70,0.22)', dark: 'rgba(120,80,40,0.08)', joint: 'rgba(110,85,60,0.32)' }) });
  const floorLight = sharedFloor(ctx, M, '#f1e9d8');
  const vault = mat.toon('#f4f1ea', { side: 'double' }), white = mat.toon('#f1eee8'), copper = mat.toon('#b5612f'), copperLt = mat.toon('#c47a40'), greenDark = mat.toon('#25302a');

  // ================================================================ the hall: pylon structure + decoration
  const hall = buildPylonHall(ctx, M, S, { id: 'gorny', FY, PZ, name, nameEn, plain: true, noMeander: true, dims: DIMS, pitch: 4.5, openW: 3.0, openSpring: 2.3, zLow: zFoot - 0.8, pylonMat: granite, trackMat: travertine, floorMat: floorLight, vaultMat: vault });
  const { C, PY, EDGE, TRK, WALL } = hall;
  res.hall = hall;
  for (const m of hall.mouths) { const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {}); if (m.zs > 0 && X.realEnd && X.realEnd('gorny:1')) X.deferStub('gorny:1', go); else go(); }
  const vInfo = { openings: hall.openings, FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  // the closing plate of the lower central hall: the hall section with the profile of the incline tube cut out of it
  {
    const outl = [[-C, FY - 0.5], [-C, hall.SPC]]; for (let i = 1; i < 24; i++) { const t = Math.PI - i * Math.PI / 24; outl.push([C * Math.cos(t), hall.SPC + C * Math.sin(t)]); } outl.push([C, hall.SPC], [C, FY - 0.5]);
    const A = E.A, tube = [[-A, FY - 0.2], [-A, FY + 1.0]]; for (let i = 1; i < 36; i++) { const t = Math.PI - i * Math.PI / 36; tube.push([A * Math.cos(t), FY + 1.0 + 4.9 * Math.sin(t)]); } tube.push([A, FY + 1.0], [A, FY - 0.2]);
    const z1 = zFoot - 0.5; S.group.add(new THREE.Mesh(extrudeZ(outl, z1 - 0.5, z1 + 0.3, [tube.reverse()]), M.plasterWarm));
  }
  // dark green strips behind the pylons, white metal bands at the waist of every pylon
  for (const sx of [-1, 1]) {
    S.bx(sx > 0 ? PY + 0.15 : -PY - 2.1, sx > 0 ? PY + 2.1 : -PY - 0.15, FY, FY + 0.02, -PZ, PZ, greenDark);
    for (const z of hall.pylonZ.slice(1, -1)) S.bx(sx > 0 ? C - 0.03 : -PY - 0.03, sx > 0 ? PY + 0.03 : -C + 0.03, FY + 1.85, FY + 1.97, z - 0.78, z + 0.78, white);
  }
  // the copper lamp boxes over the openings: a copper beam on the pylon tops, a sloped milk-white panel in a copper frame (mullions every 1.2 m), the ring balustrade along the top edge
  {
    const len = 2 * PZ - 3, ring = tex.draw(128, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#c47a40'; g.lineWidth = 5; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(16 + i * 32, 36, 14, 0, 7); g.stroke(); } g.fillRect(0, 50, w, 6); }, { key: 'gn-rings' }).clone();
    ring.needsUpdate = true; ring.wrapS = ring.wrapT = THREE.RepeatWrapping; ring.repeat.set(len / 0.9, 1);
    const ringMat = mat.decal('#ffffff', { map: ring }), nm = Math.floor(len / 1.2) + 1, ang = 0.55;
    // (the mullions and the benches below are ONE merged mesh each, not InstancedMeshes: tools/roads-furniture-audit.mjs tests every instance of every InstancedMesh against the asphalt of the street
    // ABOVE and has no notion of depth, so 46 of them at -70 m under Bolshoy pr. were reported as "on the carriageway" (review-metro, 2026-10-08); a merged mesh draws the same in one call)
    const mullG = new THREE.BoxGeometry(0.06, 1.34, 0.07), mullParts = [], d = new THREE.Object3D();
    for (const sx of [-1, 1]) {
      const cx = sx * (C - 0.55), cy = hall.SPC + 0.2;                                                                          // the box hangs INSIDE the central hall over the pylon tops, its top edge leaning toward the wall
      S.bx(sx * (C - 1.0) - 0.07, sx * (C - 1.0) + 0.07, FY + 3.45, FY + 3.58, -len / 2, len / 2, copper);                    // the lower rail
      const panel = k.box(0.04, 1.3, len, M.lampWhite, [cx, cy, 0], [0, 0, -sx * ang]); panel.castShadow = false;
      for (let j = 0; j < nm; j++) { d.position.set(cx - sx * 0.04, cy, -len / 2 + j * 1.2); d.rotation.set(0, 0, -sx * ang); d.updateMatrix(); mullParts.push(mullG.clone().applyMatrix4(d.matrix)); }
      k.box(0.1, 0.1, len, copper, [sx * (C - 0.12), FY + 4.9, 0], [0, 0, 0]);                                                   // the top rail
      const p = k.plane(len, 0.5, ringMat, [sx * (C - 0.2), FY + 5.18, 0], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false;
    }
    const mull = new THREE.Mesh(mergeGeometries(mullParts, false), copper); mull.userData.noBatch = true; mull.castShadow = false; mull.frustumCulled = false; S.group.add(mull);
  }
  // cream marble benches with a wood inlay in front of the track walls, every third opening; orange name bands; etched black-and-white mining panels
  {
    const bz = hall.openZc.filter((_, i) => i % 3 === 1), bg = new THREE.BoxGeometry(0.62, 0.46, 2.3), benchParts = [];
    for (const sx of [-1, 1]) for (const z of bz) { benchParts.push(bg.clone().translate(sx * (WALL - 0.75), FY + 0.23, z)); S.col(sx * (WALL - 0.75) - 0.32, sx * (WALL - 0.75) + 0.32, FY, FY + 0.5, z - 1.15, z + 1.15); }
    const im = new THREE.Mesh(mergeGeometries(benchParts, false), mat.toon('#e2d3b4')); im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im);
    const band = M.board(M.nameBoard(name, nameEn, ORANGE, 'gn-band'), 1.0);
    const etch = tex.draw(256, 320, (g, w, h) => {
      const r = ctx.rng('gn-etch'); g.fillStyle = '#15191b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8ecee'; g.lineWidth = 2; g.fillStyle = '#e8ecee';
      for (let y = 190; y < h; y += 14) { g.beginPath(); g.moveTo(0, y + r() * 8); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + (r() - 0.5) * 12); g.stroke(); }
      g.beginPath(); g.moveTo(30, 190); g.lineTo(30, 70); g.lineTo(110, 40); g.lineTo(110, 190); g.stroke(); g.beginPath(); g.moveTo(30, 70); g.lineTo(70, 190); g.stroke();                                    // a crane / head frame
      for (const [x, s] of [[150, 1], [196, 0.85], [228, 0.7]]) { g.beginPath(); g.arc(x, 128, 11 * s, 0, 7); g.fill(); g.fillRect(x - 11 * s, 140, 22 * s, 48 * s); g.beginPath(); g.moveTo(x + 10 * s, 150); g.lineTo(x + 40 * s, 182); g.lineWidth = 4; g.stroke(); g.lineWidth = 2; }
      g.beginPath(); g.arc(70, 100, 26, 0, 7); g.stroke(); g.strokeRect(6, 6, w - 12, h - 12);
    }, { key: 'gn-etch' });
    const etchMat = mat.toon('#ffffff', { map: etch });
    for (const sx of [-1, 1]) {
      const fx = sx * (WALL - 0.19), rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      for (let z = -PZ + 18; z < PZ - 14; z += 40) { const p = k.plane(3.6, 0.5, band, [fx, FY + 3.05, z], [0, rotY, 0]); p.castShadow = false; }
      for (let q = 3; q < hall.openZc.length - 2; q += 5) { const p = k.plane(2.0, 2.5, etchMat, [fx - sx * 0.01, FY + 1.7, hall.openZc[q] + (q % 2 ? 0.3 : 0)], [0, rotY, 0]); p.castShadow = false; }
    }
  }
  // the end panel (Spasskaya end) with the name, SOS pillars (the hanging boards are the kit signs of the wayfinding block below)
  {
    const pan = tex.draw(512, 320, (g, w, h) => { g.fillStyle = '#c9b08a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(110,85,60,0.40)'; g.lineWidth = 2; for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let i = 0; i < 6; i++) { g.fillStyle = '#a8573a'; g.fillRect(24 + i * 80, 150, 56, 150); g.fillStyle = '#d4682a'; for (let j = 0; j < 5; j++) g.fillRect(30 + i * 80, 158 + j * 28, 44, 12); }
      g.fillStyle = '#2a2420'; g.fillRect(40, 30, w - 80, 90); g.fillStyle = ORANGE; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, name.toUpperCase(), w / 2, 76, w - 120, 54, FONT, 700); }, { key: 'gn-end' });
    const p = k.plane(7.6, 4.75, mat.toon('#ffffff', { map: pan }), [0, FY + 2.4, PZ - 0.04], [0, Math.PI, 0]); p.castShadow = false;
    for (const [x, z] of [[3.4, -60], [-3.4, 40]]) { k.box(0.5, 2.2, 0.5, M.marbleWhite, [x, FY + 1.1, z]); k.box(0.52, 0.2, 0.52, mat.toon(ORANGE), [x, FY + 2.0, z]); S.col(x - 0.25, x + 0.25, FY, FY + 2.3, z - 0.25, z + 0.25); }
  }
  // wayfinding signs of the Petersburg kit (docs/research/metro-wayfinding.md, signs.js); all in hall coordinates through S, castShadow false, textures shared by key.
  //   The three orange pills of the old end-panel block (z -52, 10, 56) are replaced by kit boards at the same z. Gorny is the TERMINUS of line 4: the S track (x = -TRK, toward +z / Spasskaya, Ulitsa Dybenko) is
  //   the boarding track; the N track (x = +TRK, toward -z) is the arrival track (trains come in from Spasskaya, nobody boards): no "to trains" section for it (its terminus would be this station), a
  //   "Posadki net" plaque on the N-side pylons instead. No transfers at this station. No continuous track band: the hall already draws its orange name bands on the track walls (above).
  {
    const sg = makeSigns(ctx, M), SY = FY + 3.2, BH = 0.62, SPC = hall.SPC, pz = hall.pylonZ;
    const streets = [['Большой проспект В.О.', 'Bolshoy avenue V.I.'], ['Косая линия В.О.', 'Kosaya line V.I.'], ['22-я и 23-я линии В.О.', '22nd–23rd lines V.I.'], ['24-я и 25-я линии В.О.', '24th–25th lines V.I.']];
    const secOut = [sg.sec.city('u', true), sg.sec.exit({ streets }, undefined, false)];                // 2024 style: «Выход в город / Way out» + up arrow, then the street list
    const secCity = [sg.sec.city('u', false)];
    const secToS = (arrow) => sg.sec.trains('4', +1, arrow);                                             // Улица Дыбенко (LINES[4].to[1]), the S track at x = -TRK
    // the rods reach the vault of the central hall (inner radius C about (0, SPC))
    const hb = (z, rotY, sections, both = false) => {
      const L = sg.textures.hangBoard(sections, { w: BH }).length, bx = Math.min(L / 2 - 0.4, L * 0.32);
      return sg.hangBoard(S, { x: 0, y: SY, z, rotY, sections, w: BH, both, rodLen: SPC + Math.sqrt(C * C - bx * bx) - (SY + BH / 2) - 0.05 });
    };
    // a back-to-back pair: the face toward +z (seen by people walking toward -z, rotY 0) and the face toward -z (seen walking toward +z, rotY PI)
    const pair = (z, toPlus, toMinus) => { if (toPlus) hb(z + 0.08, 0, toPlus); if (toMinus) hb(z - 0.08, Math.PI, toMinus); };
    // hall ends: the escalator landing (-z) and the far end (+z); the face toward the platform reads "to the trains", the face away from it "way out"
    pair(-PZ + 3, secOut, [secToS('r'), sg.sec.rules('right')]);                                         // landing: arrivals walk +z, the S track is on their right; keep right
    pair(PZ - 3, secOut, [secToS('r')]);                                                                 // far end: people at the end look back at the exit; the others walk on toward the S track
    // replacing the old pills at the same z
    pair(-52, secCity, [secToS('r')]);
    pair(56, secCity, [secToS('r')]);
    hb(10, 0, [secToS('l')], true);                                                                      // hall centre, two-sided: the back face mirrors the arrow
    // the linear schemes on the two track walls: between the etched panels (z about 0, +-22.5, +-45, +-67.5) and below the name bands; the way ahead is drawn toward the heading of THAT track
    let nSch = 0;
    for (const [wx, rotY, travel] of [[-(WALL - 0.15), Math.PI / 2, +1], [WALL - 0.15, -Math.PI / 2, -1]]) for (const z of [-56.25, 11.25, 56.25]) {
      sg.lineScheme(S, { x: wx, y: FY + 1.6, z, rotY, line: '4', currentId: 'gorny', dir: travel, ahead: sg.aheadOf(rotY, travel) }); nSch++;
    }
    // the network map on a pylon face of the S side (above the white waist band), facing the central hall
    sg.networkMap(S, { x: -C, y: FY + 2.55, z: pz[2], rotY: Math.PI / 2, w: 1.3 });
    // "No boarding" plaques on the outer faces of three N-side pylons (toward the arrival track)
    for (const z of [pz[1], pz[19], pz[pz.length - 2]]) sg.noBoardingPlaque(S, [PY, FY + 2.45, z], Math.PI / 2, { w: 1.3, h: 0.45 });
    res.signs = { boards: 9, schemes: nSch, map: 1, plaques: 3, pixels: sg.pixels };
  }

  // ================================================================ the incline (NW end): 4 lanes, axial; the escalator frame Se (head = the origin, z toward SE)
  const Se = new Space(ctx, E.eframe, { name: 'gorny-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, mouth: false, trench: true, shellStart: 11, lanes: E.lanes, halfW: E.A });
  res.esc = esc; res.Se = Se;

  // ================================================================ the underground ticket hall (-7 m)
  const Sv = new Space(ctx, E.eframe, { name: 'gorny-ticket', zone: 'gorny-ticket' }), kv = Sv.k;
  const fy = UY + 0.05, CH = UY + 4.2;
  const polyL = [[HUB.x0, HUB.z0], [HUB.x1, HUB.z0], [HUB.x1, HUB.z1], [HUB.x0, HUB.z1]], poly = polyL.map(([x, z]) => Sv.W(x, z));
  const dW = Sv.W(HUB.x0, DOOR_W.z), dE = Sv.W(HUB.x1, DOOR_E.z);
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 11.4], [-E.A, 11.4]].map(([x, z]) => Sv.W(x, z));
  const hubWall = mat.toon('#ffffff', { map: panelTex(ctx, M, 'gn-hubwall', { base: '#d9c3a0', w: 0.9, h: 0.45, cols: 3, rows: 6, vein: 'rgba(150,110,70,0.20)' }), side: 'double' });
  const room = buildPolyRoom(ctx, M, { id: 'gorny-ticket', poly, y0: fy, ceil: CH, under: true, holes: [hole], doors: [{ x: dW[0], z: dW[1], w: 4.4, h: 2.9, arch: true }, { x: dE[0], z: dE[1], w: 4.4, h: 2.9, arch: true }], wallMat: hubWall, ceilMat: mat.toon('#f1eee6', { side: 'double' }), colY: [UY - 1.5, UY + 4.4], lamps: false,
    floorMat: sharedFloor(ctx, M, '#e2dac8') });
  res.room = room;
  stripFloor(Sv, polyL, [[-E.A - 0.3, E.A + 0.3, 0.3, 11.7]], fy, 1.1);
  for (const [x, z, sg] of [[HUB.x0, DOOR_W.z, -1], [HUB.x1, DOOR_E.z, 1]]) Sv.walk(sg < 0 ? x - 0.9 : x - 0.4, sg < 0 ? x + 0.4 : x + 0.9, z - 2.1, z + 2.1, fy, 1.1);          // the sills of the two doors bridge the wall thickness
  shaftParapet(Sv, M, { A: E.A, len: 11.4, y: fy, mat: mat.toon('#e4ddcf') });
  for (const sx of [-1, 1]) for (const z of [2, 6, 10]) { const x = sx * (E.A + 1.3); kv.cyl(0.12, 0.15, 0.14, copper, [x, fy + 0.07, z], null, 10); kv.cyl(0.05, 0.05, 2.4, copper, [x, fy + 1.3, z], null, 6); kv.sphere(0.2, M.lampWarm, [x, fy + 2.6, z], 10); Sv.col(x - 0.2, x + 0.2, fy - 1, fy + 2.4, z - 0.2, z + 0.2); }
  for (let z = HUB.z0 + 3; z < HUB.z1 - 1; z += 5) for (const x of [-9, -3, 3, 9]) { if (z > -1 && z < 12.5 && Math.abs(x) < 6) continue; const m = kv.box(1.6, 0.07, 0.6, M.lampWhite, [x, CH - 0.05, z]); m.castShadow = false; }
  // barriers across the head (z = -4), glass partitions to the side walls, ticket machines along the north wall and the south part, the bronze relief of the miners over the mouth
  const zt = -4;
  for (let x = -4.8; x <= 4.9; x += 1.2) turnstile(kv, M, x, fy, zt, 0);
  for (const sx of [-1, 1]) { const x = sx * 5.6, z0 = zt, z1 = 11.9; kv.box(0.08, 2.3, z1 - z0, M.glass, [x, fy + 1.15, (z0 + z1) / 2]); kv.box(0.12, 0.1, z1 - z0, M.stainless, [x, fy + 2.33, (z0 + z1) / 2]); Sv.col(x - 0.1, x + 0.1, fy - 1, fy + 2.4, z0, z1); }            // the paid zone round the head: barriers in the north, glass along both sides of the shaft
  for (let x = -12; x <= -6; x += 2) { kv.box(0.8, 1.9, 0.55, mat.toon('#3d4d78'), [x, fy + 0.95, HUB.z0 + 0.6]); kv.box(0.6, 0.45, 0.06, M.lampCool, [x, fy + 1.45, HUB.z0 + 0.9]); Sv.col(x - 0.45, x + 0.45, fy - 1, fy + 2.1, HUB.z0, HUB.z0 + 1.0); }
  for (const z of [16, 19, 22]) { kv.box(0.6, 1.9, 0.9, M.kiosk, [HUB.x1 - 0.5, fy + 0.95, z]); kv.box(0.05, 0.5, 0.7, M.lampCool, [HUB.x1 - 0.83, fy + 1.4, z]); Sv.col(HUB.x1 - 0.95, HUB.x1, fy - 1, fy + 2.1, z - 0.5, z + 0.5); }
  {
    const rel = tex.draw(512, 256, (g, w, h) => {
      const r = ctx.rng('gn-relief'); g.fillStyle = '#5b4a30'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? 'rgba(210,170,100,0.18)' : 'rgba(30,20,8,0.22)'; g.fillRect(r() * w, r() * h, 3 + r() * 9, 2 + r() * 6); }
      const miner = (x, flip) => { g.save(); g.translate(x, 0); g.scale(flip, 1); g.fillStyle = '#b08a4a'; g.beginPath(); g.arc(0, 88, 20, Math.PI, 0); g.fill(); g.fillRect(-22, 86, 44, 6); g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(0, 78, 6, 0, 7); g.fill(); g.fillStyle = '#b08a4a'; g.fillRect(-16, 96, 32, 54); g.fillRect(-16, 150, 13, 84); g.fillRect(3, 150, 13, 84); g.save(); g.translate(14, 118); g.rotate(-0.8); g.fillRect(0, -4, 78, 8); g.beginPath(); g.moveTo(78, -14); g.lineTo(96, 0); g.lineTo(78, 14); g.fill(); g.restore(); g.restore(); };
      miner(150, 1); miner(362, -1); g.fillStyle = '#7d6638'; g.beginPath(); g.moveTo(190, 210); g.lineTo(230, 120); g.lineTo(256, 160); g.lineTo(288, 100); g.lineTo(326, 210); g.fill();
      g.fillStyle = '#e0c58c'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, 'ГОРНОЕ ДЕЛО', w / 2, 30, w - 200, 30, FONT, 700); g.strokeStyle = '#b08a4a'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    }, { key: 'gn-relief' });
    const p = kv.plane(8.4, 3.2, mat.toon('#ffffff', { map: rel }), [0, fy + 1.75, HUB.z0 + 0.04], [0, 0, 0]); p.castShadow = false;
    const pl = tex.draw(512, 96, (g, w, h) => { g.fillStyle = '#1b1b1d'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8e2d2'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, name.toUpperCase(), w * 0.42, h / 2, w * 0.7, 46, FONT, 700); g.strokeStyle = '#c9a24b'; g.lineWidth = 4; g.beginPath(); g.arc(w * 0.86, h / 2, 26, 0, 7); g.stroke(); tex.fitText(g, '1773', w * 0.86, h / 2, 40, 20, FONT, 700); }, { key: 'gn-plaque' });
    const q = kv.plane(8.0, 0.62, mat.toon('#ffffff', { map: pl }), [0, fy + 3.7, HUB.z0 + 0.04], [0, 0, 0]); q.castShadow = false;
    const a = kv.plane(3.4, 0.7, M.board(M.blueBoard('К поездам · Горный институт', 'To the trains · line 4', 'd', 'gn-v-trains', { bg: ORANGE }), 1.0), [0, fy + 3.3, zt + 0.25], [0, Math.PI, 0]); a.castShadow = false;
    const w1 = kv.plane(3.6, 0.7, M.board(M.blueBoard('Выход в город · Большой пр. В. О.', 'Way out · Kosaya liniya', 'l', 'gn-v-out-w', { bg: '#1b35d8' }), 1.0), [HUB.x0 + 0.1, fy + 3.2, 17], [0, Math.PI / 2, 0]); w1.castShadow = false;
    const w2 = kv.plane(3.6, 0.7, M.board(M.blueBoard('Выход в город · Большой пр. В. О.', 'Way out · Kosaya liniya', 'r', 'gn-v-out-e', { bg: '#1b35d8' }), 1.0), [HUB.x1 - 0.1, fy + 3.2, 6.5], [0, -Math.PI / 2, 0]); w2.castShadow = false;
  }

  // ================================================================ the two wells (pavilions) and the corridors from their landing rooms to the ticket hall
  const wIn = WELLS.find((w) => w.id === 'gorny-in'), wOut = WELLS.find((w) => w.id === 'gorny-out');
  const opt = { name, nameEn, color: ORANGE, signBg: ORANGE, pavWall: '#c9ccce', wallBase: '#d3b894' };
  res.wells = { in: buildWell(ctx, M, X, wIn, opt), out: buildWell(ctx, M, X, wOut, opt) };
  const grp = X.mkGroup('gorny-corridors'), CORR = { w: 4.4, h: 2.7, rise: 1.2, noLift: true };
  const toSe = (pt) => Sv.L(pt[0], pt[1]);
  const heading = (u) => { const c = Math.cos(E.yaw), s = Math.sin(E.yaw); return [u[0] * c - u[1] * s, u[0] * s + u[1] * c]; };         // world direction -> escalator-frame direction
  res.cor = {};
  for (const [id, wl, wr, turn] of [['in', wIn, res.wells.in, 'l'], ['out', wOut, res.wells.out, 'r']]) {
    const far = toSe(wr.landing.door), h = heading(wl.u), ph = Math.atan2(h[1], h[0]) * 180 / Math.PI, p0 = [far[0] + h[0] * 0.3, far[1] + h[1] * 0.3];
    const steps = turn === 'l' ? [['l', ph, 5], ['s', 12]] : [['r', 180 - ph, 5], ['s', 30]];
    const t = turtle(p0, ph, steps); res.cor[id] = t;
    const pts = t.pts.map((p) => { const q = Sv.W(p[0], p[1]); return [q[0], fy, q[1]]; });
    X.cor('gorny-corridor-' + id, grp, pts, CORR);
  }

  // ================================================================ the station object, ways out and in (tests)
  const rt = X.rtOf('gorny', X.net.gorny, GN, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'gorny', name, nameEn, frame: GN, stock: '717', line: '4', idx: X.net.gorny.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Горный институт». Выход к Большому проспекту В. О., Косой линии и Горному университету'),
  });
  X.stations.gorny = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const WeW = (wr, x, z, tol) => { const q = wr.Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const corPts = (debug, id, rev) => { const c = debug.corridors.find((q) => q.name === 'gorny-corridor-' + id).pts.map((q) => [q[0], q[2]]); const sel = c.filter((_, i, a) => i % 2 === 0 || i === a.length - 1); return rev ? sel.reverse() : sel; };
  const ow = res.wells.out, iw = res.wells.in, o = wOut, n = wIn;
  const dIn = DOORWAYS.find((d) => d.id === 'gorny-in'), dOut = DOORWAYS.find((d) => d.id === 'gorny-out'), nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)], at = (d, r, tol) => { const [nx, nz] = nOf(d), q = [d.x + nx * r, d.z + nz * r]; return tol ? [...q, tol] : q; };
  res.exitRoute = (debug) => ({ start: [...toWorld(GN, 0, 40), FY], points: [toWorld(GN, 0, -PZ + 4), SeW(1, E.run + 3, 0.4), SeW(1, E.run - 3, 0.3), SeW(1, 60, 0.3), SeW(1, 6, 0.3), SeW(1, -1.6), SeW(1, -6.5), SeW(9.5, -6.5), SeW(9.5, 4), SeW(9.5, 10), SeW(12.8, DOOR_E.z, 0.7), ...corPts(debug, 'out', true),
    WeW(ow, 0, o.run + 4), WeW(ow, o.lanes[0].x, o.run + 1.2, 0.4), WeW(ow, o.lanes[0].x, o.run - 3, 0.3), WeW(ow, o.lanes[0].x, 5, 0.3), WeW(ow, o.lanes[0].x, -1.8), WeW(ow, -0.1, -2.6), at(dOut, -0.5), at(dOut, 1.0, 0.6), at(dOut, 4)],
    door: [dOut.x, dOut.z], out: at(dOut, 4), outward: nOf(dOut) });
  res.entryRoute = (debug) => ({ start: [...at(dIn, 4), 0], points: [at(dIn, 1.0, 0.6), at(dIn, -0.5), WeW(iw, n.stairX, 1.2, 0.5), WeW(iw, n.stairX, n.run - 3, 0.6), WeW(iw, 0, n.run + 3), ...corPts(debug, 'in', false), SeW(-12.8, DOOR_W.z, 0.7), SeW(-9.5, 20), SeW(-9.5, 5), SeW(-9.5, -6.5), SeW(-1, -6.5), SeW(-1, -2), SeW(-1, 3, 0.4), SeW(-1, E.run - 2, 0.5), SeW(-1, E.run + 3), toWorld(GN, 0, -PZ + 6)], end: { station: 'gorny', y: FY } });
  res.S = S; res.Sv = Sv; res.rt = rt; res.FV = fy;
  return res;
}
