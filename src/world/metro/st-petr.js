// metro/st-petr.js — Petrogradskaya (line 2, -53 m, 1963; docs/research/metro-petro.md section 3, photos refs/metro-petro 10-14, 38).
//   hall       CLOSED TYPE ("horizontal lift"): the hall of hall-gd.js with its own skin: a smooth white elliptical vault, walls of cream FLUTED ceramic with a black door recess at every train
//              door, a blue band with the name, a gold anodised louvre cornice that hides the lamps, dark granite floor; the blind south end wall carries the gold profiles of a worker and a
//              peasant woman on a dark-blue grille. Black platform doors slide away while a train stands with open doors (dynamic colliders keep them shut otherwise), as at Gostiny Dvor.
//   incline    3 lanes, axial, 53 m down (92 m of run), a 10 m lower hall at the north end
//   vestibule  the ground floor of the House of Fashion (Kamennoostrovsky pr. 37, r1256096, drawn by landmarksKamennoostrovsky with the glass doors, «ПЕТРОГРАДСКАЯ» and the «М»):
//              one doorway in its west front (DOORWAYS petrogradskaya-in), a ticket hall, the mouth of the incline.
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, PG_PZ, toWorld } from '../data/metro.js';
import { Space } from './lib.js';
import { buildGdHall, GDH } from './hall-gd.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet } from './petro-kit.js';
import { sharedFloor } from './hall-vault.js';
import { makeSigns } from './signs.js';

const BLUE = '#1f6fd0';

export function buildPetrogradskaya(ctx, M, X) {
  const { mat, tex } = ctx;
  const PG = FRAMES.petrogradskaya, PZ = PG_PZ, FY = PG.y, E = ESC2.petrogradskaya, TRK = GDH.TRK, res = {};
  const name = 'Петроградская', nameEn = 'Petrogradskaya';

  // ================================================================ the hall
  const S = new Space(ctx, PG, { name: 'petrogradskaya' }), k = S.k;
  // cream fluted ceramic: eight vertical flutes per 1.2 m, a joint every 0.3 m
  const flute = M.rep(tex.draw(256, 128, (g, w, h) => {
    for (let i = 0; i < 8; i++) { const x = i * w / 8, gr = g.createLinearGradient(x, 0, x + w / 8, 0); gr.addColorStop(0, '#cfc8a6'); gr.addColorStop(0.35, '#f1ecd2'); gr.addColorStop(0.75, '#e2dcbc'); gr.addColorStop(1, '#bdb694'); g.fillStyle = gr; g.fillRect(x, 0, w / 8 + 1, h); }
    g.fillStyle = 'rgba(120,110,80,0.30)'; for (let j = 0; j < 4; j++) g.fillRect(0, j * h / 4, w, 2);
  }, { key: 'petr-flute' }), 1 / 1.2, 1 / 1.2);
  const wallMat = mat.toon('#ffffff', { map: flute });
  const louvre = (() => { const t = tex.draw(64, 64, (g, w, h) => { for (let i = 0; i < 4; i++) { const x = i * w / 4, gr = g.createLinearGradient(x, 0, x + w / 4, 0); gr.addColorStop(0, '#8a6a1e'); gr.addColorStop(0.5, '#e2bb52'); gr.addColorStop(1, '#a8842c'); g.fillStyle = gr; g.fillRect(x, 0, w / 4 + 1, h); } }, { key: 'petr-louvre' }).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2 * PZ / 0.8, 1); return mat.toon('#ffffff', { map: t }); })();
  const hall = buildGdHall(ctx, M, S, { id: 'petr', FY, PZ, name, nameEn, stock: '717-l2', stairHole: null, endE: { halfW: 4.0, spring: 1.0 }, endW: null,
    skin: { wallMat, floorMat: sharedFloor(ctx, M, '#8f8e9a'), vault: '#f4f2ec', ribs: false, band: BLUE, shelf: louvre, endMat: mat.toon('#f1eee6') },
    pills: [{ z: -30, text: 'Купчино · Kupchino', sub: 'Линия 2 · Петроградская', bg: '#1b53c8' }, { z: 40, text: 'Парнас · Parnas', sub: 'Линия 2 · Петроградская', bg: '#1b53c8' }],      // the way-out pill at z = 8 is replaced by the wayfinding boards of the hall centre (below)
    sos: [[3.2, -40], [-3.2, 30]] });
  for (const sx of [-1, 1]) { const p = k.plane(0.06, 2 * PZ - 2, mat.decal('#e8e6e0'), [sx * (GDH.EDGE - 0.75), FY + 0.012, 0], [-Math.PI / 2, 0, 0]); p.castShadow = false; }                // the white line along the walls
  for (const m of hall.mouths) X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {});
  const vInfo = { openings: hall.openings, FY, TRK, EDGE: GDH.EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  // the blind south end wall: gold profiles of the worker and the peasant woman on a dark-blue grille (an arched panel)
  {
    const pan = tex.draw(512, 384, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.save(); g.beginPath(); g.moveTo(8, h); g.lineTo(8, h * 0.52); g.bezierCurveTo(8, 10, w - 8, 10, w - 8, h * 0.52); g.lineTo(w - 8, h); g.closePath(); g.clip();
      g.fillStyle = '#17285e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2b448f'; g.lineWidth = 3; for (let x = 6; x < w; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.strokeStyle = '#d9b040'; g.fillStyle = '#d9b040'; g.lineWidth = 15; g.lineJoin = 'miter'; g.lineCap = 'butt';
      const prof = (ox, oy, s) => { g.beginPath(); g.moveTo(ox + 62 * s, oy); g.lineTo(ox + 10 * s, oy + 18 * s); g.lineTo(ox, oy + 76 * s); g.lineTo(ox - 22 * s, oy + 112 * s); g.lineTo(ox, oy + 120 * s); g.lineTo(ox - 4 * s, oy + 150 * s); g.lineTo(ox + 14 * s, oy + 156 * s); g.lineTo(ox + 4 * s, oy + 182 * s); g.lineTo(ox + 36 * s, oy + 206 * s); g.stroke(); };
      prof(170, 96, 1.0); prof(132, 118, 0.86);
      g.lineWidth = 16; for (const [x0, y0, x1, y1] of [[190, 76, 372, 96], [246, 128, 392, 148], [236, 176, 404, 196], [268, 226, 404, 246]]) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0 + 4); g.lineTo(x1, y1); g.stroke(); }
      g.beginPath(); g.moveTo(232, 118); g.lineTo(300, 210); g.lineTo(392, 222); g.stroke();
      g.restore();
    }, { key: 'petr-panel' });
    const p = k.plane(8.6, 6.4, mat.decal('#ffffff', { map: pan }), [0, FY + 3.2, -PZ + 0.03], [0, 0, 0]); p.castShadow = false;
  }

  // ---------------------------------------------------------------- Petersburg wayfinding (signs.js kit; docs/research/metro-wayfinding.md sections 2, 3, 7): hanging boards, linear schemes on the piers, the network map
  //   Closed type: the blue name band on the cornice already exists in hall-gd.js, so signs.trackBand is NOT used. Signs hang above head height (boards at FY + 3.2, schemes centred at FY + 1.6)
  //   and change no collider. S track = x -TRK, trains run toward +z (Parnas); N track = x +TRK, toward -z (Kupchino). A one-sided board is read from its front only; a back-to-back pair
  //   (rotY 0 faces +z, rotY PI faces -z, offset 0.065 m each) serves both walking directions.
  {
    const sg = makeSigns(ctx, M), LINE = '2', BH = 0.62, BY = FY + 3.2;
    const exitPetr = { streets: [['Каменноостровский проспект', 'Kamennoostrovsky prospekt'], ['Большой проспект П.С.', 'Bolshoy prospekt P.S.']], esc: true };
    const hallCeil = (x) => FY + GDH.SPRING + GDH.B * Math.sqrt(Math.max(0, 1 - (x / GDH.A) ** 2));           // inner face of the hall vault (hall-gd.js archRing)
    const lowCeil = (x) => FY + 1.0 + 4.9 * Math.sqrt(Math.max(0, 1 - (x / E.A) ** 2));                          // inner face of the lower-hall vault (petro-kit.js lowerHall)
    const board = (z, rotY, sections, ceil = hallCeil) => {
      const L = sg.textures.hangBoard(sections, { w: BH }).length, bx = Math.min(L / 2 - 0.4, L * 0.32);
      return sg.hangBoard(S, { x: 0, y: BY, z: z + (rotY === 0 ? 0.065 : -0.065), rotY, sections, w: BH, both: false, rodLen: ceil(bx) + 0.04 - (BY + BH / 2) });
    };
    const trS = (arrow) => sg.sec.trains(LINE, +1, arrow), trN = (arrow) => sg.sec.trains(LINE, -1, arrow);     // Парнас (S track, left of a rotY 0 board) / Купчино (N track, right)
    // south end (the blind wall with the gold profiles): the trains of both sides facing the platform, the way out (street list) facing the dead end
    const zS = -PZ + 6.5;
    board(zS, 0, [trS('l'), trN('r')]);
    board(zS, Math.PI, [sg.sec.exit(exitPetr, 'u', true)]);
    // hall centre (replaces the old way-out pill at z = 8): north-bound walkers see Kupchino on the left, the city exit ahead, Parnas on the right; south-bound walkers the mirror pair
    board(8, Math.PI, [trN('l'), sg.sec.city('u', true), trS('r')]);
    board(8, 0, [trS('l'), trN('r')]);
    // north end: the trains board faces the arriving passengers (+z, seen through the arch); the way-out board hangs in the lower hall at the old pill spot, facing the platform (-z)
    board(PZ - 6.5, 0, [trS('l'), trN('r')]);
    board(PZ + 1.2, Math.PI, [sg.sec.exit(exitPetr, 'u', true)], lowCeil);
    // escalator landing (the foot of the incline is at z ~ 71.7): the two tracks ahead-left / ahead-right, then the rules of the escalator side
    board(PZ + 4.4, 0, [trS('ul'), trN('ur')], lowCeil);
    board(PZ + 7.6, 0, [sg.sec.rules('right')], lowCeil);
    // linear schemes on the wide piers between the cars (the piers inside a car are only ~3 m): the way ahead is drawn on the side the trains of THAT track head to
    const piers = []; for (let i = 0; i + 1 < hall.doorZ.length; i++) if (hall.doorZ[i + 1] - hall.doorZ[i] > 5) piers.push((hall.doorZ[i] + hall.doorZ[i + 1]) / 2);
    const mid = piers.filter((z) => Math.abs(z) < 1 || Math.abs(Math.abs(z) - 39.3) < 1);            // z = -39.3, 0, +39.3
    for (const [sx, rotY, travelZ] of [[-1, Math.PI / 2, +1], [1, -Math.PI / 2, -1]])
      for (const z of mid) sg.lineScheme(S, { x: sx * GDH.EDGE, y: FY + 1.6, z, rotY, line: LINE, currentId: 'petrogradskaya', dir: travelZ, ahead: sg.aheadOf(rotY, travelZ), w: 4.5, h: 1.2 });
    // the network map on the blind end wall beside the gold-profile panel, at eye height
    sg.networkMap(S, { x: 5.65, y: FY + 1.7, z: -PZ + 0.002, rotY: 0, w: 1.4 });
  }

  // ================================================================ the lower hall + the incline (north end, +z)
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1];
  lowerHall(ctx, M, S, { A: E.A, FY, z0: PZ + 0.5, z1: zFoot + 0.7 });
  // (the old blue way-out pill of the lower hall at z = PZ + 1.2 is replaced by the exit board of the wayfinding block below, same spot)
  const Se = new Space(ctx, E.eframe, { name: 'petrogradskaya-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A });

  // ================================================================ the ticket hall in the House of Fashion (escalator frame: x east-north-east, z along the descent, the west front at x ~ -16.9)
  const Sv = new Space(ctx, E.eframe, { name: 'petr-vestibule', tag: null, zone: 'petr-vestibule-fx' }), kv = Sv.k;
  const polyL = [[-16.94, -14], [5.6, -14], [5.6, 15], [-15.24, 15]], poly = polyL.map(([x, z]) => Sv.W(x, z));
  const dws = DOORWAYS.filter((d) => d.station === 'petrogradskaya'), doors = dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 2.7, arch: false }));
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z)), CEIL = 4.6;
  const vwall = mat.toon('#ffffff', { map: panelTex(ctx, M, 'petr-vwall', { base: '#dedbd0', w: 0.9, h: 0.6, cols: 3, rows: 4 }), side: 'double' });
  const room = buildPolyRoom(ctx, M, { id: 'petr-vest', poly, ceil: CEIL, doors, holes: [hole], wallMat: vwall, ceilMat: mat.toon('#eeece4', { side: 'double' }),
    floorMat: sharedFloor(ctx, M), lamps: { step: 4.4, mat: M.lampWhite, size: [1.6, 0.5], rot: -E.yaw } });
  res.room = room;
  shaftParapet(Sv, M, { A: E.A, len: 13, mat: mat.toon('#5d5b5e') });
  for (let z = -11.5; z <= -1.4; z += 1.25) turnstile(kv, M, -8.8, 0.05, z, Math.PI / 2);
  for (const z of [-12.6, -0.4]) kv.box(0.1, 1.1, 0.1, M.stainless, [-8.8, 0.6, z]);
  { const x0 = -8.8, z0 = -0.2, z1 = 14.6; kv.box(0.08, 2.2, z1 - z0, M.glass, [x0, 1.15, (z0 + z1) / 2]); kv.box(0.12, 0.1, z1 - z0, M.stainless, [x0, 2.3, (z0 + z1) / 2]); Sv.col(x0 - 0.15, x0 + 0.15, -1, 2.4, z0, z1); }      // glass partition: paid zone
  for (const x of [-15, -12.8, -10.6]) { kv.box(0.8, 1.9, 0.55, mat.toon('#3d4d78'), [x, 1.0, 14.2]); kv.box(0.6, 0.45, 0.06, M.lampCool, [x, 1.45, 13.9]); Sv.col(x - 0.45, x + 0.45, -1, 2.0, 13.85, 14.6); }
  for (const x of [0.5, 3.4]) { kv.box(2.4, 2.0, 1.2, mat.toon('#6a5b50'), [x, 1.0, -13.2]); kv.box(2.2, 0.7, 0.06, M.lampWarm, [x, 1.5, -12.58]); Sv.col(x - 1.3, x + 1.3, -1, 2.1, -13.9, -12.5); }
  { const p = kv.plane(3.2, 0.7, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'petr-v-trains'), 1.0), [0, 3.3, -0.6], [0, Math.PI, 0]); p.castShadow = false;
    const q = kv.plane(3.4, 0.66, M.board(M.blueBoard('Выход в город', 'Каменноостровский проспект · Way out', 'l', 'petr-v-out', { bg: '#1b35d8' }), 1.0), [-8.75, 3.2, -6.2], [0, Math.PI / 2, 0]); q.castShadow = false;
    const band = kv.plane(6.4, 0.6, M.board(M.nameBoard(name, nameEn, BLUE, 'petr-band'), 1.0), [0, 3.6, 14.95 - 0.12], [0, Math.PI, 0]); band.castShadow = false; }
  X.addVestZone('petrogradskaya', room.inside, 8);

  // ================================================================ the platform doors (closed type), the station object
  const rt = X.rtOf('petrogradskaya', X.net.petrogradskaya, PG, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'petrogradskaya', name, nameEn, frame: PG, stock: '717-l2', line: '2', idx: X.net.petrogradskaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Петроградская». Выход к Каменноостровскому и Большому проспектам'),
  });
  X.stations.petrogradskaya = rt;
  {
    const cam = ctx.camera.position, byDir = (sx) => rt.platform.tracks.find((t) => (t.dir > 0 ? -1 : 1) === sx);
    const closed = (tk, t) => { if (!tk) return true; if ((tk.rideOpen || 0) > 0.05) return false; if (tk.override) return true; const s = rt.platform.state(tk, t); return !(s.visible && s.phase === 'dwell' && s.open > 0.05); };
    const state = { closed: { '-1': true, 1: true } };
    ctx.onUpdate((dt, t) => { const near = Math.hypot(cam.x - PG.x, cam.z - PG.z) < 140 && Math.abs(cam.y - FY) < 30; for (const pn of hall.panels) { const c = near ? closed(byDir(pn.sx), t) : true; pn.mesh.visible = c; state.closed[pn.sx] = c; } });
    ctx.physics.addDynamic(() => {
      if (Math.hypot(cam.x - PG.x, cam.z - PG.z) > 140 || Math.abs(cam.y - FY) > 30) return [];
      const out = []; for (const sx of [-1, 1]) if (state.closed[sx]) { const [wx, wz] = S.W(sx * (GDH.EDGE + 0.12), 0); out.push({ cx: wx, cz: wz, w: 0.3, d: 2 * PZ, rotY: PG.yaw, y0: FY - 0.5, y1: FY + 2.5 }); }
      return out;
    });
  }
  // ---- routes for the tests: the way out (platform -> lower hall -> UP lane -> ticket hall -> door -> along the front past the stair canopy -> pavement) and the way in
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const d = dws[0], nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), ax = 0.4205, az = 0.9073;                    // (ax, az): along the front toward Lev Tolstoy Square
  const at = (out, along) => [d.x + nx * out + ax * along, d.z + nz * out + az * along];
  res.exitRoute = () => ({ start: [...toWorld(PG, 0, 20), FY], points: [toWorld(PG, 0, PZ - 1), toWorld(PG, -1, PZ + 4), SeW(2, E.run + 3, 0.4), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SeW(-4, -3.5), SeW(-12, -6.0), at(-0.7, 0), at(1.6, 1.0), at(1.7, 12.6), at(6.0, 13.6)],
    door: [d.x, d.z], out: at(6.0, 13.6), outward: [nx, nz] });
  res.entryRoute = () => ({ start: [...at(1.6, 12.5), 0], points: [at(1.6, 0.6), at(-1.5, 0), SeW(-10.5, -6.0), SeW(-6.5, -6.0), SeW(-2, -1.6), SeW(-2, 3, 0.4), SeW(-2, E.run - 2, 0.5), SeW(-1, E.run + 3), toWorld(PG, 0, PZ - 6)], end: { station: 'petrogradskaya', y: FY } });
  res.S = S; res.Se = Se; res.hall = hall; res.esc = esc; res.rt = rt;
  return res;
}
