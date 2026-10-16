// metro/st-gork.js — Gorkovskaya (line 2, -53 m, 1963; docs/research/metro-petro.md section 2, photos refs/metro-petro 01-09).
//   hall       three-vault PYLON station with the SHORTEST central hall of the city (31 m, five openings per side): the engine's pylon hall with `central` (hall-pylon.js): pylons of ochre
//              Saaremaa limestone with rough-hewn blocks, a flat white cornice with round lamps under it, a smooth white vault, grey granite floor with pale lines, the limestone end wall with the
//              bas-relief portrait of Gorky, white porcelain-stone track walls with black letters and dark ornamental grilles. The side platforms run the whole 121 m behind blind pylon walls.
//   incline    3 lanes, 53 m down: it lands in the NORTH END OF THE CENTRAL HALL, i.e. in the middle of the platform length, and climbs between the two platform tunnels (as the OSM ways do)
//   vestibule  INSIDE the glazed drum of the "flying saucer" of 2009 (w85416499, drawn by landmarksKronverk/gorkovskaya.js: stylobate R 22.6 at 1.4 m, drum R 13.4; data GK_PAV): a round hall with
//              white panel lining, the entrance bay to the north and the exit bay to the east, the turnstiles, the mouth of the incline in the middle, the pink "craters" dish in the ceiling.
//              Without that module (?only=metro) a plain stylobate, steps and drum of the same sizes are drawn here; while its drum is still closed a stop-gap opens the colliders.
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, GK_PZ, GK_PAV, toWorld } from '../data/metro.js';
import { Space } from './lib.js';
import { buildPylonHall, PYLON } from './hall-pylon.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet } from './petro-kit.js';
import { sharedFloor } from './hall-vault.js';
import { makeSigns } from './signs.js';

const BLUE = '#0078c9', SERIF = '"Noto Serif","Times New Roman",serif';

export function buildGorkovskaya(ctx, M, X) {
  const { mat, tex } = ctx;
  const GK = FRAMES.gorkovskaya, PZ = GK_PZ, FY = GK.y, E = ESC2.gorkovskaya, C = PYLON.C, PY = PYLON.PY, WALL = PYLON.WALL, TRK = PYLON.TRK, res = {};
  const name = 'Горьковская', nameEn = 'Gorkovskaya';
  const S = new Space(ctx, GK, { name: 'gorkovskaya' }), k = S.k;
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1], zB = zFoot - 3, zA = -zB;                                     // the central hall: zA .. zB (the foot of the incline 3 m behind its north end)

  // ================================================================ textures
  // limestone: ochre blocks 0.75 x 0.5 m with a few rough-hewn darker ones (3 m x 4.5 m tile)
  const lime = M.rep(tex.draw(256, 384, (g, w, h) => {
    const r = ctx.rng('gork-lime'), cw = w / 4, ch = h / 9;
    for (let j = 0; j < 9; j++) for (let i = 0; i < 4; i++) {
      const rough = r() < 0.16, x = i * cw + (j % 2) * cw / 2, c = rough ? ['#8e6f3e', '#96743f', '#84673a'][(r() * 3) | 0] : ['#c2a468', '#bd9e62', '#c8ab70', '#b8995c'][(r() * 4) | 0];
      for (const xx of [x, x - w]) { g.fillStyle = c; g.fillRect(xx, j * ch, cw, ch); if (rough) for (let q = 0; q < 26; q++) { g.fillStyle = r() < 0.5 ? 'rgba(40,25,5,0.28)' : 'rgba(255,225,160,0.22)'; g.fillRect(xx + r() * cw, j * ch + r() * ch, 2 + r() * 5, 2 + r() * 4); } }
    }
    g.strokeStyle = 'rgba(70,50,20,0.40)'; g.lineWidth = 2; for (let j = 0; j <= 9; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(w, j * ch); g.stroke(); }
    for (let j = 0; j < 9; j++) for (let i = 0; i <= 4; i++) { const x = (i * cw + (j % 2) * cw / 2) % w; g.beginPath(); g.moveTo(x, j * ch); g.lineTo(x, (j + 1) * ch); g.stroke(); }
  }, { key: 'gork-lime' }), 1 / 3, 1 / 4.5);
  const limeMat = mat.toon('#ffffff', { map: lime });

  // ================================================================ the hall
  const hall = buildPylonHall(ctx, M, S, { id: 'gork', FY, PZ, name, nameEn, plain: true, noMeander: true, central: [zA, zB], pylonMat: limeMat, floorMat: sharedFloor(ctx, M, '#dcd8d2'), trackMat: mat.toon('#ffffff', { map: panelTex(ctx, M, 'gork-track', { base: '#eeece6', w: 1.2, h: 0.6, cols: 2, rows: 4, veins: 6, joint: 'rgba(150,150,150,0.35)' }) }), vaultMat: mat.toon('#f4f2ec', { side: 'double' }),
    endHole: { S: { halfW: 3.6, spring: 0.8 } },
  });
  for (const sx of [-1, 1]) S.bx(sx > 0 ? WALL - 0.2 : -WALL + 0.16, sx > 0 ? WALL - 0.16 : -WALL + 0.2, hall.BED, FY + 0.45, -PZ, PZ, M.blackTile);          // the black skirting of the track walls
  for (const m of hall.mouths) X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {});
  const vInfo = { openings: hall.openings, FY, TRK, EDGE: PYLON.EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  // the flat white cornice over the pylons with round lamps under it: on the central-hall faces and along both platforms
  {
    for (const sx of [-1, 1]) { S.bx(sx > 0 ? C - 0.45 : -C, sx > 0 ? C : -C + 0.45, FY + 3.72, FY + 3.98, zA + 0.1, zB - 0.1, M.white); S.bx(sx > 0 ? PY : -PY - 0.5, sx > 0 ? PY + 0.5 : -PY, FY + 3.3, FY + 3.56, -PZ + 0.2, PZ - 0.2, M.white); }
    const spots = []; for (const sx of [-1, 1]) { for (let z = zA + 1.2; z < zB - 0.6; z += 1.5) spots.push([sx * (C - 0.22), FY + 3.7, z]); for (let z = -PZ + 1.5; z < PZ - 1; z += 2.4) spots.push([sx * (PY + 0.25), FY + 3.28, z]); }
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), M.lampWarm, spots.length), d = new THREE.Object3D();
    spots.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im);
  }
  // the floor of the central hall: pale lines (two long ones and a cross line at every opening)
  { const pale = mat.decal('#c9b88e'); for (const sx of [-1, 1]) { const p = k.plane(0.14, zB - zA - 2, pale, [sx * 2.1, FY + 0.012, 0], [-Math.PI / 2, 0, 0]); p.castShadow = false; } for (const z of hall.openZc) { const p = k.plane(4.2, 0.14, pale, [0, FY + 0.012, z], [-Math.PI / 2, 0, 0]); p.castShadow = false; } }
  // the south end wall of the central hall: limestone with the bas-relief portrait (a head in three-quarter profile with the moustache and the swept hair, cut out of the same stone)
  {
    const rel = tex.draw(384, 320, (g, w, h) => {
      const r = ctx.rng('gork-relief'); g.fillStyle = '#c6aa70'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(70,50,20,0.35)'; g.lineWidth = 2; for (let j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(0, j * h / 8); g.lineTo(w, j * h / 8); g.stroke(); for (let i = 0; i <= 4; i++) { const x = (i * w / 4 + (j % 2) * w / 8) % w; g.beginPath(); g.moveTo(x, j * h / 8); g.lineTo(x, (j + 1) * h / 8); g.stroke(); } }
      const shape = (dx, dy, fill) => { g.fillStyle = fill; g.beginPath(); g.moveTo(150 + dx, 96 + dy); g.bezierCurveTo(160 + dx, 44 + dy, 250 + dx, 40 + dy, 262 + dx, 92 + dy); g.bezierCurveTo(286 + dx, 110 + dy, 280 + dx, 150 + dy, 262 + dx, 164 + dy); g.lineTo(250 + dx, 196 + dy); g.lineTo(276 + dx, 236 + dy); g.lineTo(244 + dx, 262 + dy); g.lineTo(196 + dx, 268 + dy); g.lineTo(120 + dx, 232 + dy); g.lineTo(168 + dx, 208 + dy); g.lineTo(166 + dx, 186 + dy); g.lineTo(150 + dx, 178 + dy); g.lineTo(154 + dx, 160 + dy); g.lineTo(138 + dx, 150 + dy); g.lineTo(152 + dx, 126 + dy); g.closePath(); g.fill(); };
      shape(5, 6, 'rgba(60,40,10,0.45)'); shape(0, 0, '#d8bf86');
      g.fillStyle = 'rgba(90,65,25,0.55)'; g.beginPath(); g.moveTo(150, 96); g.bezierCurveTo(170, 60, 240, 56, 262, 92); g.bezierCurveTo(240, 80, 196, 84, 168, 104); g.closePath(); g.fill();                    // hair
      g.fillRect(154, 152, 30, 9); g.fillRect(160, 122, 22, 5);                                                                                       // moustache, brow
      for (let i = 0; i < 240; i++) { g.fillStyle = r() < 0.5 ? 'rgba(60,40,10,0.10)' : 'rgba(255,235,180,0.12)'; g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 3); }
    }, { key: 'gork-relief' });
    const p = k.plane(5.4, 4.5, mat.toon('#ffffff', { map: rel }), [0, FY + 3.0, zA + 0.03], [0, 0, 0]); p.castShadow = false;
    S.bx(-C, C, FY, FY + 0.75, zA, zA + 0.06, limeMat);
  }
  // track walls: black letters, dark ornamental grilles
  {
    const letters = mat.decal('#ffffff', { map: tex.draw(1024, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#1d1d20'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, [...name.toUpperCase()].join(String.fromCharCode(8202, 8202, 8202)), w / 2, h / 2, w - 20, 64, SERIF, 600); }, { key: 'gork-letters' }) });
    const grille = mat.decal('#ffffff', { map: tex.draw(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = '#2a2622'; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8); g.lineWidth = 3; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(i * w / 6, 6); g.lineTo(i * w / 6, h - 6); g.stroke(); } g.lineWidth = 5; g.beginPath(); g.moveTo(14, 84); g.bezierCurveTo(40, 30, 70, 40, 64, 66); g.bezierCurveTo(84, 30, 110, 40, 114, 60); g.stroke(); g.beginPath(); g.moveTo(64, 66); g.lineTo(96, 100); g.stroke(); }, { key: 'gork-grille' }) });
    for (const sx of [-1, 1]) { const fx = sx > 0 ? WALL - 0.18 : -WALL + 0.18, rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
      for (let z = -45; z <= 45; z += 30) { const p = k.plane(4.6, 0.52, letters, [fx, FY + 2.0, z], [0, rotY, 0]); p.castShadow = false; }
      for (let z = -30; z <= 30; z += 30) { const p = k.plane(1.5, 1.5, grille, [fx, FY + 1.75, z], [0, rotY, 0]); p.castShadow = false; }
      for (let z = -PZ + 6; z < PZ - 3; z += 8) { const m = k.box(1.4, 0.07, 0.5, M.lampWhite, [sx * (PY + WALL) / 2, FY + 7.05, z]); m.castShadow = false; } }
  }
  // benches in the central hall, the name on the cornice
  for (const sx of [-1, 1]) for (const z of [-9, 3]) { k.box(0.5, 0.45, 2.0, mat.toon('#b8995c'), [sx * 3.5, FY + 0.225, z]); k.box(0.54, 0.05, 2.05, M.woodDark, [sx * 3.5, FY + 0.47, z]); S.col(sx * 3.5 - 0.28, sx * 3.5 + 0.28, FY, FY + 0.5, z - 1.0, z + 1.0); }

  // ================================================================ wayfinding signage (shared kit metro/signs.js; docs/research/metro-wayfinding.md): hanging boards, linear scheme panels, one network map
  //   trains: the S track (x = -TRK) runs toward +z = Парнас (higher index), the N track (x = +TRK) toward -z = Купчино. Boards hang at FY + 3.3 (underside 2.99 m), rods run to the vault.
  //   No transfers here (the station has none); no track-wall band: the hall draws its own black serif letters and the dossier has no coloured band for Gorkovskaya.
  {
    const sg = makeSigns(ctx, M), SPC = FY + 4.0, SPS = FY + 3.6, CXS = (PY + WALL) / 2, RS = PYLON.RS, YB = FY + 3.3, line = '2', BH = 0.62;
    const vaultY = (x, side) => side ? SPS + Math.sqrt(Math.max(0, RS * RS - (Math.abs(x) - CXS) ** 2)) : SPC + Math.sqrt(Math.max(0, C * C - x * x));       // inner surface of the central / side vault
    const board = (o, side) => {                                                                                  // a hanging board whose two rods end in the vault above each rod
      const L = sg.textures.hangBoard(o.sections, { w: BH }).length, r = o.rotY || 0, bx = Math.min(L / 2 - 0.4, L * 0.32), top = o.y + BH / 2;
      const b = sg.hangBoard(S, { ...o, w: BH, rodLen: 0 });
      for (const s of [-1, 1]) { const rx = o.x + s * bx * Math.cos(r), rz = o.z - s * bx * Math.sin(r), len = vaultY(rx, side) + 0.1 - top, rod = k.cyl(0.012, 0.012, len, M.steelBlack, [rx, top + len / 2, rz], null, 4); rod.castShadow = false; }
      return b;
    };
    const trS = sg.sec.trains(line, +1, 'l'), trN = sg.sec.trains(line, -1, 'r');                                  // facing +z (rotY 0) the S track is on the left of the reader, the N track on the right (the back face mirrors the arrows)
    // central hall: the landing board (faces the incline: trains both ways + the rules), the exit board over the former pill, the hall centre (both faces), the south end
    board({ x: 0, y: YB, z: zB - 1.3, rotY: 0, sections: [trS, sg.sec.rules('right'), trN] }, false);
    board({ x: 0, y: YB, z: zB - 5, rotY: Math.PI, both: false, sections: [sg.sec.exit({ streets: [['Александровский парк', 'Alexander park'], ['Кронверкский проспект', 'Kronverksky prospekt'], ['Каменноостровский проспект', 'Kamennoostrovsky prospekt']] }, 'u', true)] }, false);
    board({ x: 0, y: YB, z: 0, rotY: 0, sections: [trS, trN] }, false);
    board({ x: 0, y: YB, z: zA + 2.3, rotY: 0, both: false, sections: [trS, trN] }, false);
    // the platform ends: «Выход в город» over each side platform, read by those who leave the rearmost cars (arrow ahead, toward the central hall)
    for (const sx of [-1, 1]) for (const zs of [-1, 1]) board({ x: sx * 8.2, y: YB, z: zs * 44, rotY: zs < 0 ? Math.PI : 0, both: false, sections: [sg.sec.city('u', false)] }, true);
    // linear scheme panels on the track walls: the way ahead is drawn on the side the trains of THAT track head to; the current station is Gorkovskaya
    for (const [wx, rotY, travelZ] of [[-WALL + 0.15, Math.PI / 2, +1], [WALL - 0.15, -Math.PI / 2, -1]])
      for (const z of [-22.5, 6.7, 37.5]) sg.lineScheme(S, { x: wx, y: FY + 1.6, z, rotY, line, currentId: 'gorkovskaya', dir: travelZ, ahead: sg.aheadOf(rotY, travelZ) });
    // the network map on a pylon face of the central hall (the pylon between the openings at z = -3), eye height
    sg.networkMap(S, { x: C, y: FY + 1.7, z: -3, rotY: -Math.PI / 2 });
  }

  // ================================================================ the landing + the incline (it leaves the north end of the central hall and climbs between the platform tunnels)
  lowerHall(ctx, M, S, { A: E.A, FY, z0: zB + 0.5, z1: zFoot + 0.7, floorMat: hall.floorMat });
  const Se = new Space(ctx, E.eframe, { name: 'gorkovskaya-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });

  // ================================================================ the vestibule inside the glazed drum of the saucer (floor 5 cm over the stylobate, 1.45 m above the street)
  const PV = GK_PAV, FV = PV.FY, CEIL = PV.YS + 3.6, RI = PV.RD - 0.35, kr = ctx.services?.landmarksKronverk?.metro || null;
  const Sv = new Space(ctx, E.eframe, { name: 'gork-vestibule', tag: null, zone: 'gork-vestibule-fx' }), kv = Sv.k;
  const [ccx, ccz] = Sv.L(PV.x, PV.z);                                                                        // the centre of the pavilion in the escalator frame: (0, 6.3)
  const dws = DOORWAYS.filter((d) => d.station === 'gorkovskaya'), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  // the inner lining: a circle of R 13.05 with a straight 5.4 m chord at each door bay
  const poly = (() => { const cut = dws.map((d) => Math.atan2(d.z - PV.z, d.x - PV.x)), dl = Math.asin(2.7 / RI), out = [];
    for (let i = 0; i < 48; i++) { const a = -Math.PI + i * Math.PI / 24; if (cut.some((c) => { let q = a - c; q = Math.atan2(Math.sin(q), Math.cos(q)); return Math.abs(q) < dl + 0.02; })) continue; out.push(a); }
    for (const c of cut) out.push(c - dl, c + dl);
    return out.map((a) => Math.atan2(Math.sin(a), Math.cos(a))).sort((p, q) => p - q).map((a) => [PV.x + RI * Math.cos(a), PV.z + RI * Math.sin(a)]); })();
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z));
  const white = mat.toon('#ffffff', { map: panelTex(ctx, M, 'gork-vwall', { base: '#ecebe6', w: 1.2, h: 0.7, cols: 2, rows: 3, veins: 0, joint: 'rgba(120,125,130,0.40)' }), side: 'double' });
  const room = buildPolyRoom(ctx, M, { id: 'gork-vest', poly, y0: FV, ceil: CEIL, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 2.5, arch: false })), doorSnap: 1.2, holes: [hole], wallMat: white, ceilMat: mat.toon('#f1f0ec', { side: 'double' }),
    floorMat: sharedFloor(ctx, M), colY: [PV.YS - 0.4, PV.YS + 4.2], lamps: { step: 4.4, mat: M.lampWhite, size: [1.3, 0.45], rot: -E.yaw } });
  res.room = room;
  // walk surfaces: strips of a disc / an annulus round the centre (escalator frame), the mouth of the incline left open; solid from the street up (it is a stylobate)
  const floors = (annulus) => {                                                                            // strips along x of the escalator frame, their ends on the circles (generous inside, exact outside)
    const RO = PV.RS - 0.1, RIN = PV.RD - 0.1, xs = [-E.A - 0.3 - ccx, E.A + 0.3 - ccx, RO]; for (let x = -RO; x < RO - 0.01; x += 1.7) xs.push(x); xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i], x1 = xs[i + 1]; if (x1 - x0 < 0.02) continue;
      const xo = Math.max(Math.abs(x0), Math.abs(x1)), xi = x0 * x1 < 0 ? 0 : Math.min(Math.abs(x0), Math.abs(x1)), half = (r, x) => (r > x ? Math.sqrt(r * r - x * x) : 0), a0 = ccx + x0, a1 = ccx + x1;
      const hi = half(RIN, xi), hc = half(RIN, xo), ho = half(RO, xo), shaft = a1 > -E.A - 0.29 && a0 < E.A + 0.29;
      if (!annulus) { if (hi < 0.2) continue; if (shaft) { Sv.walk(a0, a1, ccz - hi, 0, FV, FV); Sv.walk(a0, a1, 13, ccz + hi, FV, FV); } else Sv.walk(a0, a1, ccz - hi, ccz + hi, FV, FV); }
      else if (ho > 0.3) { if (hc > 0.3) { Sv.walk(a0, a1, ccz - ho, ccz - hc, PV.YS, PV.YS); Sv.walk(a0, a1, ccz + hc, ccz + ho, PV.YS, PV.YS); } else Sv.walk(a0, a1, ccz - ho, ccz + ho, PV.YS, PV.YS); }
    }
  };
  floors(false);
  if (kr && kr.closed) {
    // STOP-GAP while landmarksKronverk keeps the drum closed (docs/research/petro-requests-metro.md): its solid drum cylinder and the eight star walk boxes of the stylobate fill the vestibule and the shaft
    let n = 0; for (const it of ctx.physics.items.slice()) { if (Math.hypot(it.cx - PV.x, it.cz - PV.z) > 0.8) continue; if ((it.type === 'cyl' && it.r > PV.RD - 0.5 && it.r < PV.RD + 0.8) || (it.type === 'walk' && Math.abs(it.top - PV.YS) < 0.05 && it.hw > 15)) { ctx.physics.remove(it); n++; } }
    if (n) floors(true);
    console.info('[metro] Gorkovskaya: the closed drum of landmarksKronverk was opened at run time (' + n + ' colliders replaced)');
  }
  if (!kr) {
    // without the saucer (?only=metro, tests): a plain stylobate with both flights of steps and a glazed drum of the same sizes, so that the station is complete on its own
    const g = new THREE.Group(); g.name = 'gorkovskaya-standalone'; g.position.set(PV.x, 0, PV.z); ctx.addStatic(g); const kg = ctx.kit(g), granite = mat.toon('#7a5e50'), slab = mat.toon('#9a948c');
    const side = new THREE.Mesh(new THREE.CylinderGeometry(PV.RS, PV.RS, PV.YS, 48, 1, true), granite); side.position.y = PV.YS / 2; g.add(side);
    const ring = new THREE.Mesh(new THREE.RingGeometry(PV.RD - 0.05, PV.RS, 48), slab); ring.rotation.x = -Math.PI / 2; ring.position.y = PV.YS; g.add(ring);
    floors(true);
    const glass = mat.toon('#5f89a8', { transparent: true, opacity: 0.55, depthWrite: false, side: 'double' });
    for (let i = 0; i < 36; i++) { const a = (i + 0.5) / 36 * Math.PI * 2, nx = Math.sin(a), nz = Math.cos(a); if (dws.some((d) => nx * Math.sin(d.rotY) + nz * Math.cos(d.rotY) > Math.cos(2.5 / PV.RD))) continue;
      const p = kg.plane(2 * PV.RD * Math.sin(Math.PI / 36) + 0.02, CEIL - PV.YS, glass, [nx * PV.RD * Math.cos(Math.PI / 36), (CEIL + PV.YS) / 2, nz * PV.RD * Math.cos(Math.PI / 36)], [0, a, 0]); p.castShadow = false; }
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 21.2, 2.6, 48), mat.toon('#8b6a55')); disc.position.y = CEIL + 1.6; g.add(disc);
    const sof = new THREE.Mesh(new THREE.CylinderGeometry(21.2, PV.RD - 0.6, 1.0, 48, 1, true), mat.toon('#6f5344', { side: 'double' })); sof.position.y = CEIL - 0.2 + 0.5; g.add(sof);
    for (const d of dws) { const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), NS = 8, run = PV.steps / NS, SW = 10;
      for (let i = 0; i < NS; i++) kg.box(SW, PV.YS - i * PV.YS / NS, run, granite, [nx * (PV.RS + (i + 0.5) * run), (PV.YS - i * PV.YS / NS) / 2, nz * (PV.RS + (i + 0.5) * run)], [0, d.rotY, 0]);
      const mid = PV.RS + PV.steps / 2; ctx.physics.addStairs(PV.x + nx * mid, PV.z + nz * mid, SW, PV.steps, d.rotY + Math.PI, 0, PV.YS, NS); }
  }
  // fittings: parapets round the mouth, the turnstile row between the entrance and the head, glass partitions to the lining, ticket machines, the sign
  shaftParapet(Sv, M, { A: E.A, len: 13, y: FV, mat: mat.toon('#e4e2dc') });
  const zt = -3.7; for (let x = -4.8; x <= 4.9; x += 1.2) turnstile(kv, M, x, FV, zt, 0);
  { const hc = Math.sqrt(RI * RI - (zt - ccz) * (zt - ccz)) - 0.1; for (const sx of [-1, 1]) { const xa = sx > 0 ? 5.5 : -hc, xb = sx > 0 ? hc : -5.5; kv.box(xb - xa, 2.2, 0.08, M.glass, [(xa + xb) / 2, FV + 1.1, zt]); kv.box(xb - xa, 0.1, 0.12, M.stainless, [(xa + xb) / 2, FV + 2.25, zt]); Sv.col(xa, xb, FV - 0.5, FV + 2.4, zt - 0.15, zt + 0.15); } }
  for (const [x, z] of [[-10.6, 3.4], [-11.2, 6.0], [-10.9, 8.6]]) { kv.box(0.6, 1.9, 0.9, M.kiosk, [x, FV + 0.95, z]); kv.box(0.05, 0.5, 0.7, M.lampCool, [x + 0.32, FV + 1.4, z]); Sv.col(x - 0.4, x + 0.4, FV - 0.5, FV + 2.1, z - 0.5, z + 0.5); }
  // the art object in the ceiling over the mouth: a white hemisphere with truncated pink cones ("craters")
  { const dish = new THREE.Mesh(new THREE.SphereGeometry(3.2, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat.toon('#f4f2ee', { side: 'double' })); dish.scale.y = 0.2; dish.position.set(ccx, CEIL - 0.02, ccz); dish.castShadow = false; Sv.group.add(dish);
    const pink = mat.toon('#e79ab0'); for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = i === 0 ? 0 : 0.9 + (i % 3) * 0.75, y = CEIL - 0.64 * Math.sqrt(Math.max(0, 1 - (rr * rr) / 10.24)); kv.cyl(0.18, 0.3, 0.26, pink, [ccx + rr * Math.cos(a), y - 0.08, ccz + rr * Math.sin(a)], null, 12); } }
  { const p = kv.plane(3.0, 0.66, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'gork-v-trains'), 1.0), [0, FV + 2.75, zt + 0.2], [0, Math.PI, 0]); p.castShadow = false; }
  X.addVestZone('gorkovskaya', room.inside, 9);
  // the name over both door bays when the saucer does not carry it (its own sign boards hang there otherwise)
  if (!kr) { const g = new THREE.Group(); g.name = 'gorkovskaya-street'; ctx.addStatic(g); const kg = ctx.kit(g), nameMat = M.board(M.nameBoard(name, nameEn, BLUE, 'gork-out-name'), 1.0);
    for (const d of dws) { const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), p = kg.plane(4.2, 0.56, nameMat, [d.x + nx * 0.2, PV.YS + 3.0, d.z + nz * 0.2], [0, d.rotY, 0]); p.castShadow = false; } }

  // ================================================================ the station object, the ways out and in (tests)
  const rt = X.rtOf('gorkovskaya', X.net.gorkovskaya, GK, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'gorkovskaya', name, nameEn, frame: GK, stock: '717-l2', line: '2', idx: X.net.gorkovskaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Горьковская». Выход к Александровскому парку, Петропавловской крепости и Каменноостровскому проспекту'),
  });
  X.stations.gorkovskaya = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)], at = (d, r, tol) => { const [nx, nz] = nOf(d), p = [PV.x + nx * r, PV.z + nz * r]; return tol ? [...p, tol] : p; };      // a point on the radius of a door bay
  res.exitRoute = () => { const [lx, lz] = Se.L(dOut.x, dOut.z), foot = at(dOut, PV.RS + PV.steps + 1.8);
    return { start: [...toWorld(GK, 7.3, -30), FY], points: [toWorld(GK, 7.3, -6), toWorld(GK, 2, -6), toWorld(GK, 0, zB - 2), SeW(2, E.run + 2.2, 0.4), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SeW(6.8, -1.6), SeW(lx - 3, lz - 2), at(dOut, PV.RD - 0.9), at(dOut, PV.RS - 0.8), foot],
      door: [dOut.x, dOut.z], out: foot, outward: nOf(dOut) }; };
  res.entryRoute = () => ({ start: [...at(dIn, PV.RS + PV.steps + 2), 0], points: [at(dIn, PV.RS - 0.8, 0.6), at(dIn, PV.RD - 1.2), SeW(0, -1.6), SeW(0, 3, 0.4), SeW(0, E.run - 2, 0.5), SeW(0, E.run + 2.4), toWorld(GK, 0, zB - 4), toWorld(GK, 0, 0)], end: { station: 'gorkovskaya', y: FY } });
  res.S = S; res.Se = Se; res.hall = hall; res.esc = esc; res.rt = rt; res.central = [zA, zB]; res.mode = kr ? (kr.closed ? 'saucer closed: stop-gap' : 'saucer') : 'standalone';
  return res;
}
