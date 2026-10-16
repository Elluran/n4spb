// metro/st-sport.js — Sportivnaya (line 5, 1997; docs/research/metro-petro.md section 4, photos refs/metro-petro 20-29): the TWO-LEVEL single-vault station.
//   upper level (-57.4)  one vault of broad white rings over an island platform (hall-vault.js), pale marble track walls with a dark band, torch-shaped lamps over the track; the northbound
//                        track (toward Chkalovskaya) on its +x side, the other side is the reserve of the planned ring line (a fenced empty bed). Round WELLS in the floor with white parapets:
//                        brass torch standards rise through them from the lower level.
//   lower level (-64)    a flat coffered ceiling with the same round openings, two rows of square marble columns with fluted white capitals, red-brown track walls with gold mosaic
//                        medallions, the gold mosaic of ancient athletes on the north end wall; the southbound track (toward Admiralteyskaya) on its -x side.
//                        (Real: both used tracks lie on the south-east side, one above the other; here the lower one is mirrored so that the engine's right-hand rule holds.)
//   between the levels   two banks of three short escalators (6.6 m), both descending toward +z, in rectangular openings of the upper floor.
//   way out              from the north end of the UPPER level: 8 m of landing, the incline of 4 lanes (52.4 m up) to the UNDERGROUND vestibule (-5 m) under the crossing of Bolshoy pr. P. S.
//                        and pr. Dobrolyubova: a long hall with the dimpled silver ceiling, the mosaic "Olympic flame" over the mouth, brass torch lamps, turnstiles; three street stairs
//                        (SPORT_PITS 1, 4, 5: open granite stairwells on the pavements) joined to it by short passages. The exit to Vasilievsky Island (2015: the travelator tunnel, st-sport2.js) leaves the south end of the lower level through an arched opening.
import * as THREE from 'three';
import { FRAMES, ESC2, SPORT_PITS, SP_PZ, SP_UY, SP_RISE, TAN, toWorld } from '../data/metro.js';
import { Space, floorGeo, smoothPath } from './lib.js';
import { buildVaultHall, circlePoly, sharedFloor } from './hall-vault.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, stairPit } from './petro-kit.js';
import { MeshBuilder, addCap } from '../lib/massing.js';
import { makeSigns } from './signs.js';

const FONT = '"Rubik","Noto Sans",sans-serif', PURPLE = '#702785', DIMS = { EDGE: 6.4, TRK: 7.9, WALL: 10.6, SPRING: 3.0, B: 6.6 };

export function buildSportivnaya(ctx, M, X) {
  const { mat, tex } = ctx;
  const SP = FRAMES.sportivnaya, PZ = SP_PZ, FYL = SP.y, FYU = SP.yUpper, E = ESC2.sportivnaya, UY = SP_UY, res = {};
  const name = 'Спортивная', nameEn = 'Sportivnaya', { EDGE, TRK, WALL } = DIMS, CL = FYL + 4.3;                     // CL: ceiling of the lower level
  const S = new Space(ctx, SP, { name: 'sportivnaya' }), k = S.k;

  // ================================================================ openings of the upper floor: three round wells (torch standards), two rectangular ones (the short escalators)
  const RW = 2.6, wells = [-34, -8, 18].map((z) => ({ z, r: RW, x0: -RW, x1: RW, z0: z - RW, z1: z + RW }));
  const runS = SP_RISE / TAN, banks = [{ zTop: -62 }, { zTop: 43 }].map((b) => ({ ...b, x0: -3.1, x1: 3.1, z0: b.zTop, z1: b.zTop + 8.6, zFoot: b.zTop + runS }));
  const holes = [...wells, ...banks];

  // ================================================================ the upper level
  const marble = mat.toon('#ffffff', { map: panelTex(ctx, M, 'sport-wall', { base: '#d8cdb8', w: 1.2, h: 0.55, cols: 2, rows: 4, vein: 'rgba(150,125,95,0.22)' }) });
  const floorMat = sharedFloor(ctx, M);
  const up = buildVaultHall(ctx, M, S, { id: 'sport', FY: FYU, PZ, dims: DIMS, name, nameEn, tracks: { neg: false, pos: true }, holes, ribPitch: 5.0,
    skin: { wallMat: marble, floorMat, band: '#3b2a70', vault: '#efeef2', rib: '#fbfaf8', bandY: 2.4 }, endHole: { N: { halfW: 4.4, spring: 1.0 } } });
  for (const m of up.mouths) { const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, up.BED, {}); if (m.zs > 0 && X.realEnd && X.realEnd('sportivnaya:1')) X.deferStub('sportivnaya:1', go); else go(); }      // the +z end: the real tunnel to Admiralteyskaya (links-vo.js)
  // torch lamps over the live track: black inclined brackets with a lit bowl (photo 20), the "Ode to Sport" plate on the south end wall
  for (let z = -PZ + 7; z < PZ - 4; z += 10) { const x = WALL - 0.5, y = FYU + 3.3; k.box(1.9, 0.09, 0.12, M.steelBlack, [x - 0.8, y + 0.35, z], [0, 0, 0.42]); k.cyl(0.34, 0.12, 0.3, M.steelBlack, [x - 1.75, y + 0.9, z], null, 10); const l = k.cyl(0.3, 0.3, 0.06, M.lampWarm, [x - 1.75, y + 1.07, z], null, 10); l.castShadow = false; }
  for (let z = -PZ + 7; z < PZ - 4; z += 10) { const x = -WALL + 0.5, y = FYU + 3.3; k.box(1.9, 0.09, 0.12, M.steelBlack, [x + 0.8, y + 0.35, z], [0, 0, -0.42]); k.cyl(0.34, 0.12, 0.3, M.steelBlack, [x + 1.75, y + 0.9, z], null, 10); const l = k.cyl(0.3, 0.3, 0.06, M.lampWarm, [x + 1.75, y + 1.07, z], null, 10); l.castShadow = false; }
  {
    const ode = tex.draw(512, 384, (g, w, h) => { g.fillStyle = '#e8e2d2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b89a4a'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#5a4a2a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      tex.fitText(g, 'ОДА СПОРТУ', w / 2, 62, w - 80, 46, FONT, 800); tex.fitText(g, 'Пьер де Кубертен', w / 2, 108, w - 120, 22, FONT, 500);
      const lines = ['О спорт! Ты — наслаждение!', 'Ты верный, неизменный спутник жизни.', 'О спорт! Ты — зодчий!', 'О спорт! Ты — справедливость!', 'О спорт! Ты — радость!', 'О спорт! Ты — мир!']; lines.forEach((t, i) => tex.fitText(g, t, w / 2, 158 + i * 34, w - 70, 24, FONT, 500)); }, { key: 'sport-ode' });
    const p = k.plane(5.6, 4.2, mat.toon('#ffffff', { map: ode }), [0, FYU + 3.4, PZ - 0.03], [0, Math.PI, 0]); p.castShadow = false;
  }
  // (the former blue pills at x 4.6 are replaced by the hanging boards of the wayfinding block below)

  // ================================================================ the lower level: the same plan under a flat ceiling (the live track on the -x side)
  const redMarble = mat.toon('#ffffff', { map: panelTex(ctx, M, 'sport-wall-low', { base: '#7a4634', w: 1.2, h: 0.6, cols: 2, rows: 4, vein: 'rgba(230,190,150,0.20)', lite: 'rgba(255,220,190,0.07)', dark: 'rgba(30,10,5,0.12)', joint: 'rgba(30,15,10,0.45)' }) });
  const low = buildVaultHall(ctx, M, S, { id: 'sport-low', FY: FYL, PZ, dims: { ...DIMS, SPRING: 4.3 }, name, nameEn, tracks: { neg: true, pos: false }, vault: false, endHole: { S: { halfW: 3.4, spring: 0.4 } },
    skin: { wallMat: redMarble, floorMat, band: '#3b2a70', bandKey: 'sport-band', bandY: 2.6, endMat: mat.toon('#e2d6c2') } });
  for (const m of low.mouths) { const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, low.BED, {}); if (m.zs > 0 && X.realEnd && X.realEnd('sportivnaya:1')) X.deferStub('sportivnaya:1', go); else go(); }
  {
    // ceiling with the openings, collars of the wells, the cove lamps along both walls
    const cb = new MeshBuilder(), outer = [[-WALL, -PZ - 0.6], [WALL, -PZ - 0.6], [WALL, PZ + 0.6], [-WALL, PZ + 0.6]];
    const hp = holes.map((h) => (h.r ? circlePoly(0, h.z, h.r, 32) : [[h.x0, h.z0], [h.x1, h.z0], [h.x1, h.z1], [h.x0, h.z1]]));
    addCap(cb, { o: outer.flat(), h: hp.map((p) => p.flat()) }, CL, { up: false, uvScale: 2.4 });
    const coffer = M.rep(tex.draw(128, 128, (g, w, h) => { g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,120,125,0.45)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2); g.fillStyle = 'rgba(255,250,235,0.9)'; g.beginPath(); g.arc(w / 2, h / 2, 9, 0, 7); g.fill(); }, { key: 'sport-coffer' }), 2, 2);
    S.group.add(new THREE.Mesh(cb.build(), mat.toon('#ffffff', { map: coffer, side: 'double' })));
    const collar = mat.toon('#f1eee6', { side: 'double' });
    for (const h of wells) { const c = new THREE.Mesh(new THREE.CylinderGeometry(h.r, h.r, FYU - CL, 32, 1, true), collar); c.position.set(0, (FYU + CL) / 2, h.z); c.castShadow = false; S.group.add(c); }
    for (const b of banks) for (const [x0, x1, z0, z1] of [[b.x0 - 0.06, b.x0, b.z0, b.z1], [b.x1, b.x1 + 0.06, b.z0, b.z1], [b.x0, b.x1, b.z0, b.z0 + 0.06], [b.x0, b.x1, b.z1 - 0.06, b.z1]]) S.bx(x0, x1, CL, FYU - 0.02, z0, z1, collar);
    for (const sx of [-1, 1]) S.bx(sx * (WALL - 0.6) - 0.1, sx * (WALL - 0.6) + 0.1, CL - 0.12, CL - 0.04, -PZ + 1, PZ - 1, M.lampWarm);
    for (const sx of [-1, 1]) S.bx(sx * 4.2 - 0.1, sx * 4.2 + 0.1, CL - 0.1, CL - 0.03, -PZ + 1, PZ - 1, M.lampWhite);
  }
  {
    // two rows of square columns (pitch 6 m): shaft, plinth and fluted capital, instanced
    const zs = []; for (let z = -PZ + 6; z <= PZ - 6; z += 6) zs.push(z);
    const cols = []; for (const sx of [-1, 1]) for (const z of zs) { if (banks.some((b) => z > b.zTop - 1.2 && z < b.zFoot + 1.2 && false)) continue; cols.push([sx * 4.2, z]); }
    const mk = (geo, material, y) => { const im = new THREE.InstancedMesh(geo, material, cols.length), d = new THREE.Object3D(); cols.forEach((c, i) => { d.position.set(c[0], y, c[1]); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im); };
    mk(new THREE.BoxGeometry(0.9, 3.5, 0.9), mat.toon('#d9c3a6'), FYL + 0.25 + 1.75); mk(new THREE.BoxGeometry(1.0, 0.25, 1.0), mat.toon('#6e625a'), FYL + 0.125); mk(new THREE.BoxGeometry(1.25, 0.55, 1.25), mat.toon('#f3f0e8'), CL - 0.275);
    for (const [x, z] of cols) S.col(x - 0.5, x + 0.5, FYL - 0.2, CL, z - 0.5, z + 0.5);
    for (const sx of [-1, 1]) S.bx(sx * 4.2 - 0.5, sx * 4.2 + 0.5, CL - 0.6, CL - 0.02, -PZ + 5.4, PZ - 5.4, mat.toon('#e2d6c2'));           // the beam over each row
  }
  {
    // gold mosaic medallions on the track walls, the gold mosaic of ancient athletes on the north end wall, the sign over the way to Vasilievsky Island on the south end wall
    const med = tex.draw(128, 128, (g, w, h) => { const r = ctx.rng('sport-med'); g.fillStyle = '#c79a2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,225,130,0.35)' : 'rgba(110,70,10,0.25)'; g.fillRect(r() * w, r() * h, 5, 5); } g.strokeStyle = '#f1ead8'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, 46, 0, 7); g.stroke(); g.fillStyle = '#8a3a22'; g.beginPath(); g.arc(w / 2, h / 2, 40, 0, 7); g.fill();
      g.fillStyle = '#f1ead8'; g.beginPath(); g.arc(w / 2 + 2, h / 2 - 8, 15, 0, 7); g.fill(); g.beginPath(); g.moveTo(w / 2 - 12, h / 2 + 2); g.lineTo(w / 2 + 16, h / 2 + 2); g.lineTo(w / 2 + 22, h / 2 + 34); g.lineTo(w / 2 - 18, h / 2 + 34); g.closePath(); g.fill(); g.fillStyle = '#8a3a22'; g.fillRect(w / 2 - 14, h / 2 - 12, 30, 3); }, { key: 'sport-med' });
    const mm = mat.toon('#ffffff', { map: med });
    for (const sx of [-1, 1]) for (let z = -PZ + 12; z < PZ - 8; z += 16) { const p = k.plane(1.9, 1.9, mm, [sx * (WALL - 0.19), FYL + 1.35, z], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
    const ath = tex.draw(512, 256, (g, w, h) => { const r = ctx.rng('sport-ath'); g.fillStyle = '#c79a2e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,225,130,0.30)' : 'rgba(110,70,10,0.22)'; g.fillRect(r() * w, r() * h, 6, 6); }
      const fig = (x, s, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, 78, 13 * s, 0, 7); g.fill(); g.fillRect(x - 11 * s, 92, 22 * s, 62 * s); g.fillRect(x - 13 * s, 92 + 60 * s, 10 * s, 62 * s); g.fillRect(x + 3 * s, 92 + 60 * s, 10 * s, 62 * s); g.save(); g.translate(x, 100); g.rotate(-0.9); g.fillRect(0, -5, 46 * s, 9 * s); g.restore(); };
      for (const [x, s, c] of [[70, 1, '#f1ead8'], [130, 0.9, '#b5562c'], [200, 1.05, '#f1ead8'], [318, 1.05, '#f1ead8'], [386, 0.9, '#b5562c'], [444, 1, '#f1ead8']]) fig(x, s, c);
      g.fillStyle = '#f1ead8'; g.fillRect(246, 96, 22, 120); g.fillRect(232, 86, 50, 12); g.fillStyle = '#e9632c'; g.beginPath(); g.moveTo(257, 30); g.quadraticCurveTo(284, 62, 257, 86); g.quadraticCurveTo(230, 62, 257, 30); g.fill();
      g.strokeStyle = '#8a3a22'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }, { key: 'sport-ath' });
    const p = k.plane(8.0, 4.0, mat.toon('#ffffff', { map: ath }), [0, FYL + 2.15, -PZ + 0.03], [0, 0, 0]); p.castShadow = false;
  }
  // ---- the wells: white parapet ring with lit glass balusters on the upper floor, a brass torch standard from the lower floor up into the vault, a round bench at its foot
  for (const h of wells) {
    const ring = (r0, r1, y0, y1, material) => { const sh = new THREE.Shape(); sh.absarc(0, 0, r1, 0, Math.PI * 2, false); const hl = new THREE.Path(); hl.absarc(0, 0, r0, 0, Math.PI * 2, true); sh.holes.push(hl); const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 24 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, material); m.position.set(0, y0, h.z); m.castShadow = false; S.group.add(m); };
    ring(h.r, h.r + 0.55, FYU, FYU + 0.28, M.marbleWhite); ring(h.r + 0.1, h.r + 0.42, FYU + 0.28, FYU + 0.82, M.lampWhite); ring(h.r - 0.02, h.r + 0.6, FYU + 0.82, FYU + 1.0, M.marbleWhite);
    const [wx, wz] = S.W(0, h.z); ctx.physics.addCylinder(wx, wz, h.r + 0.6, FYU - 0.4, FYU + 1.1); ctx.physics.addCylinder(wx, wz, 1.05, FYL - 0.2, FYL + 0.55);
    k.cyl(0.11, 0.13, FYU + 5.6 - FYL, M.brass, [0, (FYU + 5.6 + FYL) / 2, h.z], null, 12); k.cyl(1.0, 1.0, 0.45, M.graniteGrey, [0, FYL + 0.225, h.z], null, 20); k.cyl(1.04, 1.04, 0.05, M.woodDark, [0, FYL + 0.47, h.z], null, 20);
    k.cyl(0.85, 0.2, 0.6, M.brass, [0, FYU + 5.9, h.z], null, 18); const fl = k.cyl(0.8, 0.8, 0.08, M.lampWarm, [0, FYU + 6.22, h.z], null, 18); fl.castShadow = false; k.sphere(0.5, M.lampWarm, [0, FYU + 6.3, h.z], 12);
  }
  // ---- the two banks of short escalators (3 lanes each), parapets round their openings, a blue booth at the foot
  res.banks = banks.map((b, i) => {
    const f = { x: toWorld(SP, 0, b.zTop)[0], z: toWorld(SP, 0, b.zTop)[1], yaw: SP.yaw }, Sb = new Space(ctx, f, { name: 'sportivnaya-bank-' + i });
    const lanes = i === 0 ? [{ x: -1.8, dir: -1 }, { x: 0, dir: 1 }, { x: 1.8, dir: 1 }] : [{ x: -1.8, dir: -1 }, { x: 0, dir: -1 }, { x: 1.8, dir: 1 }];
    const esc = buildEscalator(ctx, M, Sb, { FY: FYL, yTop: FYU, zTop: 0, zBottom: runS, mouth: false, trench: false, shell: false, shellStart: 0, lanes, halfW: 3.0 });
    for (const sx of [-1, 1]) { S.bx(sx > 0 ? b.x1 : b.x0 - 0.3, sx > 0 ? b.x1 + 0.3 : b.x0, FYU, FYU + 1.0, b.z0 - 0.3, b.z1 + 0.3, M.marbleWhite); S.col(sx > 0 ? b.x1 : b.x0 - 0.3, sx > 0 ? b.x1 + 0.3 : b.x0, FYU - 0.3, FYU + 1.1, b.z0 - 0.3, b.z1 + 0.3); }
    S.bx(b.x0, b.x1, FYU, FYU + 1.0, b.z1, b.z1 + 0.3, M.marbleWhite); S.col(b.x0, b.x1, FYU - 0.3, FYU + 1.1, b.z1, b.z1 + 0.3);
    k.box(1.3, 2.3, 1.3, mat.toon('#1d3a9a'), [0, FYL + 1.15, b.zFoot + 3.2]); k.box(1.32, 0.9, 1.32, M.glass, [0, FYL + 1.7, b.zFoot + 3.2]); S.col(-0.7, 0.7, FYL, FYL + 2.4, b.zFoot + 2.5, b.zFoot + 3.9);
    return { ...b, Sb, esc, lanes };
  });

  // ================================================================ the landing + the incline to the underground vestibule (north end of the upper level)
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1];
  lowerHall(ctx, M, S, { A: E.A, FY: FYU, z0: zFoot - 0.7, z1: -PZ - 0.5, floorMat });
  const Se = new Space(ctx, E.eframe, { name: 'sportivnaya-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, mouth: false, trench: true, shellStart: 11, lanes: E.lanes, halfW: E.A });

  // ================================================================ Petersburg wayfinding (shared kit metro/signs.js; docs/research/metro-wayfinding.md sections 2, 3, 7)
  //   trains: the N track (upper level, x = +TRK) runs toward -z = Komendantsky Prospekt, the S track (lower level, x = -TRK) toward +z = Shushary. A viewer facing -z (the front of a rotY = 0 board) has +x on the right,
  //   so the N track is 'r' on the front of an upper board and 'l' on its back (both:true flips the horizontal arrows); on the lower level the S track is 'l' on the front and 'r' on the back.
  //   The halls already draw their track-wall name bands (dark violet band with the white name plate every 26 m), so signs.trackBand is NOT used. No transfers (the station has none; Sportivnaya-2 is an exit).
  //   Boards hang at FY + 3.2 (underside 2.89 m); the rods run up to the vault (upper hall, landing) or the flat ceiling (lower hall); nothing stands on a track bed; colliders unchanged.
  {
    const sg = makeSigns(ctx, M), px0 = sg.pixels, k0 = sg.keys.size, LINE = '5', BH = 0.62, YU = FYU + 3.2, YL = FYL + 3.2, WALLX = up.WALL - 0.15;
    const vaultU = (x) => up.SPS + up.B * Math.sqrt(Math.max(0, 1 - (x / up.WALL) ** 2));                          // inner surface of the upper vault (ellipse WALL x B about the spring line)
    const vaultLand = (x) => FYU + 1.0 + 4.9 * Math.sqrt(Math.max(0, 1 - (x / E.A) ** 2));                          // inner surface of the landing tube (petro-kit lowerHall: spring FY + 1, bv 4.9)
    const flatL = () => CL;                                                                                           // the coffered ceiling of the lower level
    const boards = [];
    const board = (o, ceilOf) => {                                                                                    // a board on two rods that end in the ceiling above each rod; one-sided boards of a back-to-back pair are offset by 6.5 cm
      const L = sg.textures.hangBoard(o.sections, { w: BH }).length, bx = Math.min(L / 2 - 0.4, L * 0.32), top = o.y + BH / 2, both = o.both === true;
      const r = sg.hangBoard(S, { w: BH, ...o, both, z: o.z + (both ? 0 : (o.rotY ? -0.065 : 0.065)), rodLen: ceilOf(Math.abs(o.x || 0) + bx) + 0.03 - top });
      boards.push({ x: o.x, y: o.y, z: o.z, rotY: o.rotY, length: r.length, both }); return r;
    };
    const trN = (arrow, t) => sg.sec.trains(LINE, -1, arrow, t || ['Комендантский\nпроспект', 'Komendantsky\nProspekt']), trS = (arrow, t) => sg.sec.trains(LINE, +1, arrow, t);   // N: Komendantsky prospekt (LINES[5].to[0]), S: Shushary (to[1])
    const toLowerT = trS('d', ['К поездам до ст.\nШушары', 'Trains to\nShushary']), toUpperT = trN('u', ['К поездам до ст.\nКомендантский проспект', 'Trains to\nKomendantsky Prospekt']);
    const exitU = sg.sec.exit({ streets: [['Большой проспект П.С.', 'Bolshoy prospekt P.S.'], ['проспект Добролюбова', 'Dobrolyubova prospekt'], ['Тучков мост', 'Tuchkov bridge']] }, 'u', true);
    const rules = { ...sg.sec.rules('right'), text: 'Держитесь правой\nстороны!', sub: 'Keep to\nthe right!' }, city = sg.sec.city('u', true);
    const exitVO = { kind: 'exit', text: 'Василеостровский выход\nтравалатор', sub: 'Vasilievsky Island exit\nTravelator', arrow: 'u' };

    // ---- upper level (-57.4): the way out is at the north end, the N track on the +x side
    board({ x: 0, y: YU, z: -PZ + 6, rotY: 0, sections: [exitU] }, vaultU);                                            // north end, faces the platform (read by those walking to the exit)
    board({ x: 0, y: YU, z: -PZ + 6, rotY: Math.PI, sections: [trN('l'), toLowerT] }, vaultU);                         // the same hanger seen from the landing: Komendantsky on the left, the lower level down the banks
    for (const b of banks) board({ x: 0, y: YU, z: b.zTop - 1.5, rotY: 0, both: true, sections: [trN('r'), toLowerT] }, vaultU);   // over the head of each escalator bank (the floor opening lies south of it)
    for (const z of [-21, 5, 31]) board({ x: 0, y: YU, z, rotY: 0, both: true, sections: [trN('r')] }, vaultU);       // hall centre between the wells (z -34, -8, 18)
    board({ x: 0, y: YU, z: PZ - 6, rotY: Math.PI, sections: [trN('l'), rules] }, vaultU);                              // south end (tunnel to Admiralteyskaya), faces the platform
    // the landing (8 m between the north end wall and the foot of the incline; E.A 4.5): the way out + the rules for the arriving / leaving, the trains for the arriving
    const zLand = (zFoot + (-PZ - 0.5)) / 2;
    board({ x: 0, y: YU, z: zLand, rotY: 0, sections: [city, rules] }, vaultLand);
    board({ x: 0, y: YU, z: zLand, rotY: Math.PI, sections: [trN('ul'), toLowerT] }, vaultLand);

    // ---- lower level (-64): the S track on the -x side, the exit to Vasilievsky Island through the arch of the south end
    board({ x: 0, y: YL, z: -PZ + 3, rotY: 0, sections: [trS('l'), rules] }, flatL);                                   // north end (the mosaic of the athletes), faces the platform
    for (const b of banks) board({ x: 0, y: YL, z: b.zFoot + 1.0, rotY: 0, both: true, sections: [city, toUpperT] }, flatL);    // in front of the foot of each bank (the escalator climbs toward -z; the blue booth stands 2.6 m further)
    for (const z of [-21, 5, 31]) board({ x: 0, y: YL, z, rotY: 0, both: true, sections: [trS('l')] }, flatL);          // hall centre between the wells / banks
    board({ x: 0, y: YL, z: PZ - 1.0, rotY: Math.PI, sections: [exitVO] }, flatL);                                      // replaces the former pill over the arch to the travelator of Sportivnaya-2

    // ---- linear schemes on the live track walls (between the name plates z = -66 + 26 n and, below, the medallions z = -68 + 16 n): the way ahead is drawn on the side the trains of THAT track head to
    for (const z of [-27, -1, 25]) sg.lineScheme(S, { x: WALLX, y: FYU + 1.5, z, rotY: -Math.PI / 2, line: LINE, currentId: 'sportivnaya', dir: -1, ahead: sg.aheadOf(-Math.PI / 2, -1), res: 0.75 });
    for (const z of [-28, 4, 36]) sg.lineScheme(S, { x: -WALLX, y: FYL + 1.6, z, rotY: Math.PI / 2, line: LINE, currentId: 'sportivnaya', dir: +1, ahead: sg.aheadOf(Math.PI / 2, +1), res: 0.75 });
    // ---- one network map per level, on the solid part of an end wall beside the arch (eye height)
    sg.networkMap(S, { x: -5.4, y: FYU + 1.7, z: -PZ + 0.002, rotY: 0 });                                              // upper: north end wall, beside the arch of the incline, platform side of the reserve track
    sg.networkMap(S, { x: 5.0, y: FYL + 1.7, z: PZ - 0.002, rotY: Math.PI });                                          // lower: south end wall, beside the arch to Vasilievsky Island
    if (typeof process !== 'undefined' && process.env && process.env.SPORT_SIGNS_LOG) console.log('SPORTSIGNS px', sg.pixels - px0, 'keys', sg.keys.size - k0, JSON.stringify(boards.map((b) => [b.z, b.rotY ? 'b' : 'f', +b.length.toFixed(2)])));
  }


  // ================================================================ the underground vestibule (escalator frame: +z toward the station, -z north-east toward the street stairs; floor -5)
  const fy = UY + 0.05, CH = UY + 4.0, HW = 9, Z0 = -58.5, Z1 = 12.6;
  const Sv = new Space(ctx, E.eframe, { name: 'sportivnaya-vestibule', zone: 'sportivnaya-vestibule' }), kv = Sv.k;
  const D1 = { x: -HW, z: -52 }, D4 = { x: HW, z: -54.5 }, D5 = { x: HW, z: -48.4 };                               // the three doors of the passages (pits 1, 4, 5)
  let room;
  {
    const poly = [[-HW, Z0], [HW, Z0], [HW, Z1], [-HW, Z1]].map(([x, z]) => Sv.W(x, z)), hole = [[-E.A, 0], [E.A, 0], [E.A, 11.4], [-E.A, 11.4]].map(([x, z]) => Sv.W(x, z));
    const dimple = M.rep(tex.draw(128, 128, (g, w, h) => { g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, w, h); for (const [cx, cy] of [[32, 32], [96, 32], [32, 96], [96, 96]]) { const gr = g.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 22); gr.addColorStop(0, '#f4f5f6'); gr.addColorStop(0.7, '#9da2a8'); gr.addColorStop(1, '#d6d9dc'); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 21, 0, 7); g.fill(); } }, { key: 'sport-dimple' }), 1.6, 1.6);
    const wallM = mat.toon('#ffffff', { map: panelTex(ctx, M, 'sport-vwall', { base: '#e2dccf', w: 0.9, h: 0.65, cols: 3, rows: 3 }), side: 'double' });
    const doors = [D1, D4, D5].map((d) => { const [x, z] = Sv.W(d.x, d.z); return { x, z, w: 4.2, h: 2.8, arch: true }; });
    room = buildPolyRoom(ctx, M, { id: 'sport-vest', poly, y0: fy, ceil: CH, under: true, holes: [hole], doors, wallMat: wallM, ceilMat: mat.toon('#ffffff', { map: dimple, side: 'double' }), colY: [UY - 1.5, UY + 4.4], lamps: false,
      floorMat: sharedFloor(ctx, M) });
    res.room = room;
    Sv.walk(-HW, HW, Z0, 0, fy, 1.0); Sv.walk(E.A + 0.75, HW, 0, Z1, fy, 1.0); Sv.walk(-HW, -E.A - 0.75, 0, Z1, fy, 1.0); Sv.walk(-E.A - 0.75, E.A + 0.75, 11.4, Z1, fy, 1.0);
    for (const d of [D1, D4, D5]) Sv.walk(d.x - 0.9, d.x + 0.9, d.z - 2.1, d.z + 2.1, fy, 1.0);                                    // the sills of the three doorways
    // parapets with brass rails round the mouth, brass torch lamps on the balconies, the mosaic "Olympic flame" over the mouth (south wall)
    for (const sx of [-1, 1]) { kv.box(0.35, 1.0, 11.2, M.marbleWhite, [sx * (E.A + 0.45), fy + 0.5, 5.8]); Sv.col(sx * (E.A + 0.45) - 0.2, sx * (E.A + 0.45) + 0.2, fy - 1, fy + 1.1, 0.3, 11.5); kv.cyl(0.03, 0.03, 11.2, M.brass, [sx * (E.A + 0.45), fy + 1.08, 5.8], [Math.PI / 2, 0, 0], 6); }
    kv.box(2 * E.A + 1.25, 1.0, 0.35, M.marbleWhite, [0, fy + 0.5, 11.55]); Sv.col(-E.A - 0.6, E.A + 0.6, fy - 1, fy + 1.1, 11.4, 11.75);
    const torch = (x, z) => { kv.cyl(0.2, 0.24, 0.16, M.brass, [x, fy + 0.08, z], null, 10); kv.cyl(0.07, 0.09, 2.3, M.brass, [x, fy + 1.3, z], null, 8); kv.cyl(0.36, 0.09, 0.42, M.brass, [x, fy + 2.62, z], null, 12); const l = kv.cyl(0.33, 0.33, 0.05, M.lampWarm, [x, fy + 2.85, z], null, 12); l.castShadow = false; Sv.col(x - 0.22, x + 0.22, fy - 1, fy + 2.4, z - 0.22, z + 0.22); };
    for (const sx of [-1, 1]) for (const z of [1.5, 5.8, 10.2]) torch(sx * (E.A + 1.5), z);
    const flame = tex.draw(512, 192, (g, w, h) => { const r = ctx.rng('sport-flame'); g.fillStyle = '#7a2a1e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,200,120,0.14)' : 'rgba(30,5,0,0.18)'; g.fillRect(r() * w, r() * h, 6, 6); }
      g.fillStyle = '#d9b040'; g.beginPath(); g.arc(w / 2, 70, 58, 0, 7); g.fill(); g.fillStyle = '#f1ead8'; g.fillRect(w / 2 - 12, 92, 24, 80); g.fillRect(w / 2 - 34, 84, 68, 12); g.fillStyle = '#e9632c'; g.beginPath(); g.moveTo(w / 2, 22); g.quadraticCurveTo(w / 2 + 32, 60, w / 2, 86); g.quadraticCurveTo(w / 2 - 32, 60, w / 2, 22); g.fill();
      const fig = (x, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, 62, 11, 0, 7); g.fill(); g.fillRect(x - 10, 74, 20, 96); }; for (const [x, c] of [[70, '#f1ead8'], [116, '#d9b040'], [162, '#f1ead8'], [350, '#f1ead8'], [396, '#d9b040'], [442, '#f1ead8']]) fig(x, c);
      g.strokeStyle = '#d9b040'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); }, { key: 'sport-flame' });
    const p = kv.plane(8.6, 3.2, mat.toon('#ffffff', { map: flame }), [0, fy + 2.1, Z1 - 0.04], [0, Math.PI, 0]); p.castShadow = false;
    // columns of the long hall, the turnstile row, ticket machines, the lit coffers, the signs
    for (const sx of [-1, 1]) for (let z = -52; z <= -20; z += 8) { kv.box(0.7, CH - fy, 0.7, mat.toon('#d9c3a6'), [sx * 4.6, (CH + fy) / 2, z]); Sv.col(sx * 4.6 - 0.4, sx * 4.6 + 0.4, fy - 1, CH, z - 0.4, z + 0.4); }
    const zt = -9; for (let x = -4.8; x <= 4.9; x += 1.2) turnstile(kv, M, x, fy, zt, 0);
    for (const sx of [-1, 1]) { const x0 = sx * 5.5, x1 = sx * (HW - 0.05), xa = Math.min(x0, x1), xb = Math.max(x0, x1); kv.box(xb - xa, 2.3, 0.08, M.glass, [(xa + xb) / 2, fy + 1.15, zt]); kv.box(xb - xa, 0.1, 0.12, M.stainless, [(xa + xb) / 2, fy + 2.33, zt]); Sv.col(xa, xb, fy - 1, fy + 2.4, zt - 0.15, zt + 0.15); }
    for (const z of [-13, -15.4, -17.8]) { kv.box(0.6, 1.9, 0.9, M.kiosk, [-HW + 0.5, fy + 0.95, z]); kv.box(0.05, 0.5, 0.7, M.lampCool, [-HW + 0.83, fy + 1.4, z]); Sv.col(-HW, -HW + 0.9, fy - 1, fy + 2.1, z - 0.5, z + 0.5); }
    for (let z = Z0 + 3; z < Z1 - 1; z += 5) for (const x of [-6, 0, 6]) { if (z > -0.5 && z < 12 && Math.abs(x) < 5) continue; const m = kv.box(1.6, 0.07, 0.6, M.lampWhite, [x, CH - 0.05, z]); m.castShadow = false; }
    { const a = kv.plane(3.4, 0.7, M.board(M.blueBoard('К поездам · Спортивная', 'To the trains · line 5', 'd', 'sport-v-trains', { bg: PURPLE }), 1.0), [0, fy + 3.2, zt + 0.25], [0, Math.PI, 0]); a.castShadow = false;
      const b = kv.plane(4.6, 0.7, M.board(M.blueBoard('Выход: Большой пр. П. С. · пр. Добролюбова', 'Way out', 'u', 'sport-v-out', { bg: '#1b35d8' }), 1.0), [0, fy + 3.2, -30], [0, 0, 0]); b.castShadow = false; }
  }

  // ================================================================ the three street stairs and their passages
  const pitGroup = new THREE.Group(); pitGroup.name = 'sportivnaya-pits'; ctx.addStatic(pitGroup);
  const oval = M.board(tex.draw(512, 128, (g, w, h) => { g.fillStyle = '#f1ede0'; tex.roundRect(g, 2, 2, w - 4, h - 4, 56); g.fill(); g.fillStyle = '#1d4e9b'; g.font = `800 84px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('М', 64, h / 2 + 5); g.fillStyle = '#2a2a30'; tex.fitText(g, name, 262, h * 0.38, 290, 46, FONT, 700); g.globalAlpha = 0.8; tex.fitText(g, nameEn, 262, h * 0.74, 290, 26, FONT, 500); g.globalAlpha = 1; g.fillStyle = PURPLE; tex.roundRect(g, 440, 44, 40, 40, 9); g.fill(); g.fillStyle = '#fff'; g.font = `700 30px ${FONT}`; g.fillText('5', 460, 66); }, { key: 'sport-oval' }), 1.0);
  const pits = {}, grp = X.mkGroup('sportivnaya-underpass'), UC = { w: 4.4, h: 2.6, rise: 1.0, noLift: true };
  for (const p of SPORT_PITS) {
    const info = stairPit(ctx, M, pitGroup, p, { depth: -UY, sign: oval, canopy: true }), d = { 1: D1, 4: D4, 5: D5 }[p.n], side = d.x < 0 ? 1 : -1, door = Sv.W(d.x - side * 0.25, d.z), ein = [Math.cos(E.yaw) * side, -Math.sin(E.yaw) * side];   // ein: into the hall
    const via = { 1: [[-24.0, -43.5], [-21.6, -49.0], [-16.5, -51.8]], 4: [[22, -54.6]], 5: [[23.3, -47.1], [19.5, -48.3]] }[p.n].map(([x, z]) => Sv.W(x, z));                  // waypoints in the escalator frame: the passage of pit 1 turns 90 degrees on a radius of 8 m
    const pts = smoothPath([info.foot, ...via, Sv.W(d.x - side * 3.2, d.z), door], p.e, ein, 2.2);
    X.cor('sportivnaya-pit-' + p.n, grp, pts.map((q) => [q[0], UY, q[1]]), UC);
    pits[p.n] = { ...p, ...info, door: d };
  }
  res.pits = pits;

  // ================================================================ the station object (one track per level), routes for the tests
  const vInfo = { FY: FYU, trackFY: { N: FYU, S: FYL }, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  const rt = X.rtOf('sportivnaya', X.net.sportivnaya, SP, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'sportivnaya', name, nameEn, frame: SP, stock: '717-l5', line: '5', idx: X.net.sportivnaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Спортивная». Выход к Большому проспекту Петроградской стороны и проспекту Добролюбова'),
  });
  X.stations.sportivnaya = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const corPts = (debug, n, rev) => { const c = debug.corridors.find((q) => q.name === 'sportivnaya-pit-' + n).pts.map((q) => [q[0], q[2]]); return rev ? c.reverse() : c; };
  res.exitRoute = (debug) => { const p = pits[1], out = [p.mouth[0] - p.e[0] * 3, p.mouth[1] - p.e[1] * 3];
    return { start: [...toWorld(SP, 4.6, -20), FYU], points: [toWorld(SP, 4.6, -PZ + 4), toWorld(SP, 1, -PZ - 2), SeW(1, E.run + 3, 0.4), SeW(1, E.run - 3, 0.3), SeW(1, 50, 0.3), SeW(1, 5, 0.3), SeW(1, -1.5), SeW(0, -9, 0.5), SeW(0, -30), SeW(-3, -47), SeW(D1.x + 1.5, D1.z), ...corPts(debug, 1, true).filter((_, i, a) => i % 2 === 0 || i === a.length - 1), [p.mouth[0] + p.e[0] * 6, p.mouth[1] + p.e[1] * 6, 0.5], [p.mouth[0], p.mouth[1], 0.6], out],
      door: p.mouth, out, outward: [-p.e[0], -p.e[1]] }; };
  res.entryRoute = (debug) => { const p = pits[4];
    return { start: [p.mouth[0] - p.e[0] * 3, p.mouth[1] - p.e[1] * 3, 0], points: [[p.mouth[0] + p.e[0] * 1, p.mouth[1] + p.e[1] * 1, 0.6], [p.mouth[0] + p.e[0] * 9, p.mouth[1] + p.e[1] * 9, 0.6], ...corPts(debug, 4, false).filter((_, i, a) => i % 2 === 0 || i === a.length - 1), SeW(D4.x - 2, D4.z), SeW(2, -44), SeW(0, -30), SeW(0, -9, 0.5), SeW(-1, -1.6), SeW(-1, 3, 0.4), SeW(-1, E.run - 2, 0.5), SeW(-1, E.run + 3), toWorld(SP, 4.6, -PZ + 6)], end: { station: 'sportivnaya', y: FYU } }; };
  // between the levels: down by bank 0 (lane x = -1.8), up by bank 1 (lane x = +1.8)
  res.walks = () => { const b0 = res.banks[0], b1 = res.banks[1], W = (x, z, tol) => { const q = toWorld(SP, x, z); return tol ? [q[0], q[1], tol] : q; };
    return {
      'sportivnaya upper->lower': { start: [...toWorld(SP, 4.6, -72), FYU], points: [W(-1.8, b0.zTop - 2.5), W(-1.8, b0.zTop + 1.5, 0.4), W(-1.8, b0.zFoot - 1.5, 0.5), W(-1.8, b0.zFoot + 4.5), W(-5.3, b0.zFoot + 3.6), W(-5.3, 0)], end: { station: 'sportivnaya', y: FYL } },
      'sportivnaya lower->upper': { start: [...toWorld(SP, -5.3, 30), FYL], points: [W(-5.3, b1.zFoot + 6.6), W(1.8, b1.zFoot + 6.1), W(1.8, b1.zFoot + 1.6), W(1.8, b1.zFoot - 1.5, 0.4), W(1.8, b1.zTop + 1.5, 0.5), W(1.8, b1.zTop - 2), W(4.6, b1.zTop - 6), W(4.6, 20)], end: { station: 'sportivnaya', y: FYU } },
    }; };
  res.S = S; res.Se = Se; res.Sv = Sv; res.up = up; res.low = low; res.esc = esc; res.rt = rt; res.levels = { upper: FYU, lower: FYL };
  void floorGeo;
  return res;
}
