// metro/st-chk.js — Chkalovskaya (line 5, -60 m, 1997; docs/research/metro-petro.md section 5, photos refs/metro-petro 30-37).
//   hall       single vault of broad white rings (hall-vault.js), track walls of pale grey marble in narrow vertical panels under a thin dark-purple line with the name, grey-violet granite floor with
//              the pale "airfield" stripes and chevrons, steel truss lamps over both tracks (the wing of the ANT-6), the stained-glass panel on the south end wall, purple hanging signs
//   incline    3 lanes, axial, 60 m down (104 m of run), 8 m of landing at the north end of the hall
//   vestibule  the pavilion w50064533 at Bolshaya Zelenina / Chkalovsky pr.: entrance in the west wall, exit in the north-east wall, the mouth of the incline in the middle; the bronze bust of
//              Chkalov on a granite pillar in front of the west wall. The shell is the generic city's until the metro module owns the building (layout GROUPS.metro `chkalovskaya-pavilion`):
//              then the real pavilion is drawn here (glazed ground floor, the overhanging granite cornice with the letters, the propeller brackets).
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, CK_PZ, toWorld } from '../data/metro.js';
import { Space } from './lib.js';
import { buildVaultHall, sharedFloor } from './hall-vault.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { insetPoly, ringOf, panelTex, lowerHall, shaftParapet, doorFrame } from './petro-kit.js';
import { addPolyColliders } from '../lib/massing.js';
import { bust, figureMats } from '../lib/figures.js';
import { makeSigns } from './signs.js';

const FONT = '"Rubik","Noto Sans",sans-serif';
const BLDG = 'w50064533', PURPLE = '#702785';

export function buildChkalovskaya(ctx, M, X) {
  const { mat, tex } = ctx;
  const CK = FRAMES.chkalovskaya, PZ = CK_PZ, FY = CK.y, E = ESC2.chkalovskaya, res = {};
  const name = 'Чкаловская', nameEn = 'Chkalovskaya';

  // ================================================================ the hall
  const S = new Space(ctx, CK, { name: 'chkalovskaya' }), k = S.k;
  const wallMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'chk-wall', { base: '#cfcabd', w: 0.45, h: 2.05, cols: 5, rows: 1, vein: 'rgba(110,105,100,0.20)' }) });
  const floorMat = sharedFloor(ctx, M, '#e6e1f6');                                                    // grey-violet granite
  const hall = buildVaultHall(ctx, M, S, { id: 'chk', FY, PZ, name, nameEn, skin: { wallMat, floorMat, band: '#3a2a6a', vault: '#f2f0ec', rib: '#fbfaf6' }, endHole: { N: { halfW: 4.0, spring: 1.0 } } });
  const { EDGE, TRK, WALL, SPS } = hall;
  for (const m of hall.mouths) X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {});
  const vInfo = { FY, TRK, EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  // the "airfield" floor: two pale bands along the platform, chevrons on the axis
  {
    const pale = mat.decal('#d9d2bc');
    for (const sx of [-1, 1]) { const p = k.plane(1.1, 2 * PZ - 8, pale, [sx * 3.5, FY + 0.012, 0], [-Math.PI / 2, 0, 0]); p.castShadow = false; }
    const chev = tex.draw(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#d9d2bc'; g.beginPath(); g.moveTo(w / 2, 26); g.lineTo(w - 14, 150); g.lineTo(w - 14, 232); g.lineTo(w / 2, 118); g.lineTo(14, 232); g.lineTo(14, 150); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3; g.strokeRect(3, 3, w - 6, h - 6); }, { key: 'chk-chevron' });
    const cm = mat.decal('#ffffff', { map: chev });
    for (const z of [-54, -18, 18, 54]) { const p = k.plane(5.4, 5.4, cm, [0, FY + 0.016, z], [-Math.PI / 2, 0, z < 0 ? Math.PI : 0]); p.castShadow = false; }
  }
  // truss lamps over the tracks: a steel cantilever from the wall every 9 m with a lit strip under it
  {
    const steel = mat.toon('#8f959b'), y0 = SPS + 0.55;
    for (const sx of [-1, 1]) for (let z = -PZ + 6; z < PZ - 3; z += 9) {
      const xw = sx * (WALL - 0.5), xt = sx * (EDGE + 0.6);
      k.box(Math.abs(xw - xt), 0.12, 0.16, steel, [(xw + xt) / 2, y0, z]);
      k.box(Math.abs(xw - xt) * 0.62, 0.08, 0.1, steel, [xw - sx * Math.abs(xw - xt) * 0.3, y0 - 0.42, z], [0, 0, sx * 0.62]);
      k.box(0.1, 0.5, 0.1, steel, [xt + sx * 0.5, y0 - 0.25, z]);
      const lamp = k.box(1.7, 0.1, 0.34, M.lampWarm, [xt + sx * 0.3, y0 - 0.55, z]); lamp.castShadow = false;
      k.box(1.9, 0.04, 0.5, steel, [xt + sx * 0.3, y0 - 0.48, z]);
    }
    for (const sx of [-1, 1]) S.bx(sx * (EDGE + 0.55) - 0.05, sx * (EDGE + 0.55) + 0.05, y0 - 0.06, y0 + 0.06, -PZ + 4, PZ - 3, mat.toon('#8f959b'));
  }
  // the south end wall: the stained-glass panel (a flyer whose silhouette turns into an aircraft; blues and violets)
  {
    const sg = tex.draw(384, 512, (g, w, h) => {
      const r = ctx.rng('chk-glass'), cols = ['#1f3f8a', '#2c5fb0', '#5a86c8', '#8fb3dd', '#3a2a7a', '#6a4aa8', '#c9d8ee', '#e9c46a'];
      g.fillStyle = '#16264f'; g.fillRect(0, 0, w, h);
      for (let j = 0; j < 12; j++) for (let i = 0; i < 9; i++) { g.fillStyle = cols[(r() * 7) | 0]; g.beginPath(); const x = i * w / 9, y = j * h / 12, dx = (r() - 0.5) * 14; g.moveTo(x + 2 + dx, y + 2); g.lineTo(x + w / 9 - 2, y + 2 + dx * 0.4); g.lineTo(x + w / 9 - 2 - dx, y + h / 12 - 2); g.lineTo(x + 2, y + h / 12 - 2); g.closePath(); g.fill(); }
      // the figure: head, body, arms that spread into wings, a tail fin
      g.fillStyle = '#f3ecd4'; g.beginPath(); g.arc(w / 2, 120, 26, 0, 7); g.fill();
      g.beginPath(); g.moveTo(w / 2 - 22, 150); g.lineTo(w / 2 + 22, 150); g.lineTo(w / 2 + 14, 400); g.lineTo(w / 2, 460); g.lineTo(w / 2 - 14, 400); g.closePath(); g.fill();
      g.fillStyle = '#e9c46a'; g.beginPath(); g.moveTo(w / 2 - 18, 176); g.lineTo(20, 250); g.lineTo(20, 282); g.lineTo(w / 2 - 16, 236); g.closePath(); g.fill(); g.beginPath(); g.moveTo(w / 2 + 18, 176); g.lineTo(w - 20, 250); g.lineTo(w - 20, 282); g.lineTo(w / 2 + 16, 236); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(w / 2 - 12, 392); g.lineTo(w / 2 - 70, 430); g.lineTo(w / 2 - 70, 446); g.lineTo(w / 2 - 10, 424); g.closePath(); g.fill(); g.beginPath(); g.moveTo(w / 2 + 12, 392); g.lineTo(w / 2 + 70, 430); g.lineTo(w / 2 + 70, 446); g.lineTo(w / 2 + 10, 424); g.closePath(); g.fill();
      g.strokeStyle = '#0d1630'; g.lineWidth = 3; for (let i = 1; i < 9; i++) { g.beginPath(); g.moveTo(i * w / 9, 0); g.lineTo(i * w / 9, h); g.stroke(); } for (let j = 1; j < 12; j++) { g.beginPath(); g.moveTo(0, j * h / 12); g.lineTo(w, j * h / 12); g.stroke(); }
    }, { key: 'chk-glass' });
    S.bx(-2.6, 2.6, FY, FY + 7.4, PZ - 0.5, PZ, M.marbleWhite); S.col(-2.6, 2.6, FY - 1, FY + 8, PZ - 0.5, PZ);
    const p = k.plane(3.9, 5.2, M.board(sg, 0.85), [0, FY + 4.4, PZ - 0.53], [0, Math.PI, 0]); p.castShadow = false;
  }
  // Petersburg wayfinding (signs.js kit; docs/research/metro-wayfinding.md): hanging boards over the axis (they replace the three purple pills), linear schemes on both track walls, one network map.
  //   The hall (hall-vault.js) already draws the thin purple track-wall line with the name every 26 m (dossier section 6), so signs.trackBand is NOT used here.
  //   Boards hang at FY + 3.2 on rods to the vault; S track (x = -TRK) runs toward +z (Shushary), N track (x = +TRK) toward -z (Komendantsky Prospekt). Nothing stands on a track bed or blocks a door.
  {
    const sg = makeSigns(ctx, M), LINE = '5', BH = 0.62, BY = FY + 3.2, { B, SPS } = hall;
    const exitCk = { streets: [['Чкаловский проспект', 'Chkalovsky prospekt'], ['Большая Зеленина улица', 'Bolshaya Zelenina street']], esc: true };
    // one one-sided board per face (back-to-back pairs 0.13 m apart); the rods run up to the elliptical vault
    const board = (z, rotY, sections) => {
      const L = sg.textures.hangBoard(sections, { w: BH }).length, bx = Math.min(L / 2 - 0.4, L * 0.32), vault = SPS + B * Math.sqrt(Math.max(0, 1 - (bx / WALL) * (bx / WALL)));
      return sg.hangBoard(S, { x: 0, y: BY, z: z + (rotY === 0 ? 0.065 : -0.065), rotY, sections, w: BH, both: false, rodLen: vault - (BY + BH / 2) + 0.03 });
    };
    const trS = (arrow) => sg.sec.trains(LINE, +1, arrow), trN = (arrow) => sg.sec.trains(LINE, -1, arrow);
    // rotY 0 faces +z, read by someone walking north (S track on the left, N track on the right); rotY PI faces -z, read walking south (N track left, S track right)
    const north = [trS('l'), sg.sec.city('u', true), trN('r')], pairSouthbound = [trN('l'), trS('r')];
    // the escalator landing (north end): arrivals see the two tracks and the rules of the escalator side, people on the platform see the way out
    board(-PZ + 7, Math.PI, pairSouthbound);
    board(-PZ + 7, 0, north);
    board(-PZ + 4, Math.PI, [sg.sec.rules('right')]);
    // the old exit pill (z -44): the street list of the exit
    board(-44, 0, [sg.sec.exit(exitCk, 'u', true)]);
    board(-44, Math.PI, pairSouthbound);
    // hall centre, over the benches
    board(10, 0, north);
    board(10, Math.PI, pairSouthbound);
    board(44, 0, [trS('l'), trN('r')]);
    board(44, Math.PI, pairSouthbound);
    // south end (the stained glass): seen from the end of the platform
    board(PZ - 7, 0, north);
    board(PZ - 7, Math.PI, pairSouthbound);
    // linear schemes: 3 per track wall in the gaps between the name boards (z = -62 + 26 n, 3.4 m wide); the way ahead is on the side the trains of THAT track head to
    for (const [sx, rotY, travelZ] of [[-1, Math.PI / 2, +1], [1, -Math.PI / 2, -1]])
      for (const z of [-23, 3, 29]) sg.lineScheme(S, { x: sx * (WALL - 0.152), y: FY + 1.6, z, rotY, line: LINE, currentId: 'chkalovskaya', dir: travelZ, ahead: sg.aheadOf(rotY, travelZ) });
    // the network map on the south end wall, east of the stained-glass block (|x| < 2.6) and clear of the tunnel mouths (|x| > 4.9)
    sg.networkMap(S, { x: 3.7, y: FY + 1.45, z: PZ - 0.002, rotY: Math.PI, w: 1.5 });
  }
  // info columns with benches round them
  for (const z of [-30, 0, 30]) { k.box(0.6, 2.4, 0.6, M.marbleWhite, [0, FY + 1.2, z]); k.box(0.64, 0.24, 0.64, M.purple, [0, FY + 2.2, z]); k.box(2.6, 0.45, 2.6, M.graniteGrey, [0, FY + 0.225, z]); k.box(2.7, 0.05, 2.7, M.woodDark, [0, FY + 0.47, z]); S.col(-1.3, 1.3, FY, FY + 0.5, z - 1.3, z + 1.3); S.col(-0.3, 0.3, FY, FY + 2.5, z - 0.3, z + 0.3); }

  // ================================================================ the landing + the incline (north end)
  const Se = new Space(ctx, E.eframe, { name: 'chkalovskaya-esc' });
  const zFoot = Se.frame && S.L(E.bottom.x, E.bottom.z)[1];                                     // hall z of the foot (-PZ - 8)
  lowerHall(ctx, M, S, { A: E.A, FY, z0: zFoot - 0.7, z1: -PZ - 0.5, floorMat });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });

  // ================================================================ the vestibule inside the pavilion
  const Sv = new Space(ctx, E.eframe, { name: 'chk-vestibule', tag: null, zone: 'chk-vestibule-fx' }), kv = Sv.k;
  const b = ctx.L.buildingById(BLDG), foot = ringOf(b.polys[0].o), own = ctx.L.claimedBy(BLDG) === 'metro' || (typeof location !== 'undefined' && /[?&]chkpav=1/.test(location.search));      // ?chkpav=1: preview of the pavilion before the claim exists
  const CEIL = own ? 6.4 : 4.3, poly = insetPoly(foot, 0.45);
  const dws = DOORWAYS.filter((d) => d.station === 'chkalovskaya'), doors = dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 3.0, arch: false }));
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z));
  const vwall = mat.toon('#ffffff', { map: panelTex(ctx, M, 'chk-vwall', { base: '#d6d2c8', w: 0.9, h: 0.6, cols: 3, rows: 4 }), side: 'double' });
  const room = buildPolyRoom(ctx, M, { id: 'chk-vest', poly, ceil: CEIL, doors, holes: [hole], wallMat: vwall, ceilMat: mat.toon('#e9e7e0', { side: 'double' }),
    floorMat: sharedFloor(ctx, M), lamps: { step: 4.6, mat: M.lampWarm, size: [1.5, 0.5], rot: -E.yaw } });
  res.room = room;
  shaftParapet(Sv, M, { A: E.A, len: 13 });
  const free = (x, z, r = 0.7) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => room.inside(...Sv.W(x + dx, z + dz)));
  for (let z = -8.2; z <= -1.0; z += 1.2) if (free(-8.6, z, 0.4)) turnstile(kv, M, -8.6, 0.05, z, Math.PI / 2);
  for (const [x, z] of [[-13.5, -9.2], [-11.4, -9.6], [-9.3, -10.0]]) if (free(x, z, 0.8)) { kv.box(0.8, 1.9, 0.6, M.kiosk, [x, 1.0, z]); kv.box(0.6, 0.45, 0.06, M.lampCool, [x, 1.45, z + 0.32]); Sv.col(x - 0.45, x + 0.45, -1, 2.1, z - 0.35, z + 0.35); }
  // the propeller lamps of the escalator hall: three-bladed steel fans with a lit hub over the mouth
  for (const z of [2.5, 7, 11.5]) { const y = CEIL - 0.75; kv.cyl(0.02, 0.02, 0.7, M.steelBlack, [0, CEIL - 0.35, z], null, 5); kv.sphere(0.2, M.lampWarm, [0, y, z], 10); for (let i = 0; i < 3; i++) kv.box(1.5, 0.03, 0.26, M.stainless, [0.72 * Math.cos(i * 2.094), y, z + 0.72 * Math.sin(i * 2.094)], [0, -i * 2.094, 0.12]); }
  { const p = kv.plane(3.2, 0.7, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'chk-v-trains', { bg: PURPLE }), 1.0), [0, 3.3, -0.6], [0, Math.PI, 0]); p.castShadow = false; }
  X.addVestZone('chkalovskaya', room.inside, own ? 10 : 9);

  // ================================================================ the street: door frames, the name, the plain blue «М», the bust of Chkalov
  {
    const g = new THREE.Group(); g.name = 'chkalovskaya-street'; ctx.addStatic(g); const kg = ctx.kit(g);
    const nameMat = M.board(M.nameBoard(name, nameEn, '#3a2a6a', 'chk-band'), 1.0);
    for (const d of dws) doorFrame(kg, M, d, { h: 3.0, name: own ? null : { mat: nameMat, w: 4.4, h: 0.6 } });
    // the bust: on a dark granite pillar in front of the west wall, 5 m from the entrance (photo 32, 36)
    const d0 = dws.find((d) => d.kind === 'entrance'), nx = Math.sin(d0.rotY), nz = Math.cos(d0.rotY), ux = nz, uz = -nx, bx = d0.x + nx * 3.4 + ux * 4.4, bz = d0.z + nz * 3.4 + uz * 4.4;
    if (!ctx.L.isOnRoad(bx, bz, 1.2) && !ctx.L.insideBuilding(bx, bz, 0.6)) {
      kg.box(0.95, 0.3, 0.95, mat.toon('#3a3836'), [bx, 0.15, bz], [0, d0.rotY, 0]); kg.box(0.72, 2.3, 0.72, mat.toon('#4a4744'), [bx, 1.45, bz], [0, d0.rotY, 0]);
      ctx.physics.addBox(bx, bz, 0.95, 0.95, d0.rotY, -1, 4);
      try { const mk = figureMats(ctx).keys('bronze', 'bronze'), fig = bust({ style: 'uniform', turn: -0.25, pitch: -0.05, detail: 0.8, face: { hair: 'short' } }).toGroup(mk); fig.position.set(bx, 2.6, bz); fig.rotation.y = d0.rotY; fig.scale.setScalar(2.0); g.add(fig); } catch (e) { console.warn('[metro] Chkalov bust skipped', e.message); }
      const pl = tex.draw(256, 128, (gg, w, h) => { gg.fillStyle = '#3a3836'; gg.fillRect(0, 0, w, h); gg.fillStyle = '#c9a24b'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; tex.fitText(gg, 'ВАЛЕРИЙ', w / 2, 34, w - 30, 30, FONT, 700); tex.fitText(gg, 'ЧКАЛОВ', w / 2, 72, w - 30, 38, FONT, 800); tex.fitText(gg, '1904–1938', w / 2, 108, w - 30, 22, FONT, 500); }, { key: 'chk-bust-plate' });
      const pm = kg.plane(0.6, 0.3, mat.toon('#ffffff', { map: pl }), [bx + nx * 0.365, 1.9, bz + nz * 0.365], [0, d0.rotY, 0]); pm.castShadow = false;
      res.bust = [bx, bz];
    }
    if (own) buildPavilion(ctx, M, g, kg, foot, dws, name);
  }

  // ================================================================ the station object, the way out and the way in (tests)
  const rt = X.rtOf('chkalovskaya', X.net.chkalovskaya, CK, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'chkalovskaya', name, nameEn, frame: CK, stock: '717-l5', line: '5', idx: X.net.chkalovskaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Чкаловская». Выход к Чкаловскому проспекту и Большой Зелениной улице'),
  });
  X.stations.chkalovskaya = rt;
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const dOut = dws.find((d) => d.kind === 'exit'), dIn = dws.find((d) => d.kind === 'entrance'), nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)];
  res.exitRoute = () => { const [nx, nz] = nOf(dOut), [lx, lz] = Se.L(dOut.x, dOut.z);
    return { start: [...toWorld(CK, 3.5, -20), FY], points: [toWorld(CK, 3.5, -PZ + 8), toWorld(CK, 0, -PZ + 1), SeW(2, E.run + 3, 0.4), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SeW(Math.min(lx - 2.5, 7), Math.min(lz, -1.6)), [dOut.x - nx * 0.6, dOut.z - nz * 0.6], [dOut.x + nx * 3.5, dOut.z + nz * 3.5]],
      door: [dOut.x, dOut.z], out: [dOut.x + nx * 3.5, dOut.z + nz * 3.5], outward: [nx, nz] }; };
  res.entryRoute = () => { const [nx, nz] = nOf(dIn);
    return { start: [dIn.x + nx * 4, dIn.z + nz * 4, 0], points: [[dIn.x - nx * 1.5, dIn.z - nz * 1.5], SeW(-6, -4.5), SeW(-2, -1.6), SeW(-2, 3, 0.4), SeW(-2, E.run - 2, 0.5), SeW(-1, E.run + 3), toWorld(CK, 0, -PZ + 6)], end: { station: 'chkalovskaya', y: FY } }; };
  res.S = S; res.Se = Se; res.hall = hall; res.esc = esc; res.rt = rt;
  return res;
}

// ---------------------------------------------------------------- the pavilion of 1997 (only when the metro module owns w50064533): glazed ground floor, granite cornice, letters, brackets
function buildPavilion(ctx, M, g, kg, foot, dws, name) {
  const { mat, tex } = ctx, n = foot.length, H0 = 4.4, H1 = 6.2, H2 = 9.0, OV = 2.4;
  const granite = mat.toon('#c9c6bd'), dark = mat.toon('#55524e'), glass = mat.toon('#5f7f95', { transparent: true, opacity: 0.6, depthWrite: false }), mull = mat.toon('#9aa0a6');
  let area = 0, cx = 0, cz = 0; for (let i = 0; i < n; i++) { const a = foot[i], c = foot[(i + 1) % n]; area += a[0] * c[1] - c[0] * a[1]; cx += a[0]; cz += a[1]; } cx /= n; cz /= n;
  const sg = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const a = foot[i], c = foot[(i + 1) % n], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
    const ux = dx / l, uz = dz / l, nx = uz * sg, nz = -ux * sg, rotY = Math.atan2(nx, nz), mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2;
    const gaps = dws.map((d) => ({ t: (d.x - a[0]) * ux + (d.z - a[1]) * uz, off: Math.abs((d.x - a[0]) * -uz + (d.z - a[1]) * ux), w: d.w })).filter((q) => q.off < 1.6 && q.t > 0 && q.t < l).sort((p, q) => p.t - q.t);
    // plinth, glazing in 1.5 m bays (open at the doors), the granite band over the glass
    let t0 = 0; const runs = []; for (const q of gaps) { if (q.t - q.w / 2 > t0 + 0.05) runs.push([t0, q.t - q.w / 2]); t0 = q.t + q.w / 2; } if (l - t0 > 0.05) runs.push([t0, l]);
    for (const [r0, r1] of runs) { const len = r1 - r0, c0 = (r0 + r1) / 2, px = a[0] + ux * c0, pz = a[1] + uz * c0;
      kg.box(len, 0.5, 0.3, dark, [px, 0.25, pz], [0, rotY, 0]); const gl = kg.plane(len, H0 - 0.5, glass, [px + nx * 0.02, 0.5 + (H0 - 0.5) / 2, pz + nz * 0.02], [0, rotY, 0]); gl.castShadow = false;
      for (let q = 0; q <= Math.round(len / 1.5); q++) { const tt = r0 + q * len / Math.max(1, Math.round(len / 1.5)); kg.box(0.07, H0 - 0.5, 0.1, mull, [a[0] + ux * tt + nx * 0.04, 0.5 + (H0 - 0.5) / 2, a[1] + uz * tt + nz * 0.04], [0, rotY, 0]); }
      for (const yy of [1.9, 3.2]) kg.box(len, 0.06, 0.1, mull, [px + nx * 0.04, yy, pz + nz * 0.04], [0, rotY, 0]); }
    kg.box(l + 0.3, H1 - H0, 0.5, granite, [mx - nx * 0.1, (H0 + H1) / 2, mz - nz * 0.1], [0, rotY, 0]);
    // the overhanging cornice: a sloped soffit and the fascia of granite panels
    kg.box(l + 2 * OV * 0.7, 0.3, OV, dark, [mx + nx * OV / 2, H1 + 0.75, mz + nz * OV / 2], [0, rotY, 0]);
    kg.box(l + 2 * OV, H2 - H1 - 0.9, 0.35, granite, [mx + nx * OV, (H1 + 0.9 + H2) / 2, mz + nz * OV], [0, rotY, 0]);
    for (let q = 1; q < Math.round(l / 2.2); q++) { const tt = -l / 2 + q * l / Math.round(l / 2.2); kg.box(0.04, H2 - H1 - 0.9, 0.02, dark, [mx + ux * tt + nx * (OV + 0.19), (H1 + 0.9 + H2) / 2, mz + uz * tt + nz * (OV + 0.19)], [0, rotY, 0]); }
    // propeller brackets under the slab
    for (let q = 0; q < Math.max(1, Math.floor(l / 7)); q++) { const tt = (q + 0.5) * l / Math.max(1, Math.floor(l / 7)), px = a[0] + ux * tt, pz = a[1] + uz * tt; for (const s of [-1, 1]) kg.box(0.08, 0.08, 2.4, mull, [px + nx * 1.15 + ux * s * 0.55, H1 + 0.45, pz + nz * 1.15 + uz * s * 0.55], [0, rotY + s * 0.45, 0]); kg.box(0.08, 0.08, 2.3, mull, [px + nx * 1.15, H1 + 0.45, pz + nz * 1.15], [0, rotY, 0]); kg.cyl(0.16, 0.16, 0.5, mull, [px + nx * 0.2, H1 + 0.3, pz + nz * 0.2], null, 8); }
    if (gaps.length && dws.find((d) => d.kind === 'entrance' && Math.abs((d.x - a[0]) * -uz + (d.z - a[1]) * ux) < 1.6)) {
      const lt = tex.draw(1024, 128, (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.fillStyle = '#2f2d2b'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; const t = [...name.toUpperCase()].join(String.fromCharCode(8202, 8202)); tex.fitText(gg, t, w / 2, h / 2, w - 30, 84, FONT, 600); }, { key: 'chk-letters' });
      const p = kg.plane(7.2, 0.9, mat.decal('#ffffff', { map: lt }), [mx + nx * (OV + 0.2), (H1 + 0.9 + H2) / 2, mz + nz * (OV + 0.2)], [0, rotY, 0]); p.castShadow = false;
    }
  }
  // the roof slab, wall colliders (split at the doorways)
  const roof = new THREE.Shape(foot.map((p) => new THREE.Vector2(p[0], p[1]))), rg = new THREE.ShapeGeometry(roof); rg.rotateX(Math.PI / 2); rg.translate(0, H2 - 0.05, 0);
  g.add(new THREE.Mesh(rg, mat.toon('#77746f', { side: 'double' })));
  addPolyColliders(ctx, { o: foot.flat(), h: [] }, -1, H2);
  void cx; void cz;
}
