// metro/st-vo.js — Vasileostrovskaya (line 3, -64 m, 3 Nov 1967; docs/research/vo-roster-metro.md section 2.1, photos refs/metro-vo v1-v4, Commons "Metro SPB Line3 Vasileostrovskaya").
//   hall       CLOSED TYPE ("horizontal lift"), the first of the six: the hall of hall-gd.js with its own skin: one white elliptical vault of broad segments on a vertical lower part lined with
//              blue-green SMALT, a dark bronze-brown bracketed cornice, a thin dark-green band, cream marble blocks with a black door recess at every train door, bronze capital letters
//              "ВАСИЛЕОСТРОВСКАЯ" on the wide piers, dark grey granite floor with aluminium joint strips; the blind west end carries a brass grille screen with the name. Black platform doors
//              slide away while a train stands with open doors (dynamic colliders keep them shut otherwise), 6-car NeVa trains.
//   incline    3 lanes, AXIAL, 65.65 m of rise (the pavilion floor is 11 steps = 1.65 m over the street), 114 m of run, a 3 m landing; the tube is lined with the same smalt
//   vestibule  the ONE pavilion w183122885 (Sredny pr. 32 / 7th liniya, drawn by landmarksAndrew; the generic city shell until then): the interior of the footprint is drawn here
//              (floor 1.7, ceiling, ticket barriers, machines, the mouth of the incline); doors DOORWAYS vasileostrovskaya-in (east end, OSM n2045866983) and -out (Sredny face, n2045866996).
//              Contract with landmarksAndrew (docs/research/vo-requests-metro.md): ctx.services.landmarksAndrew.metro = { podium: true, ceil } means "my pavilion stands on the 1.65 m podium and
//              draws the 11 steps in front of the doors": the stop-gap steps and door frames of this file are then skipped.
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, VO_PZ, VO_FLOOR, toWorld } from '../data/metro.js';
import { Space } from './lib.js';
import { buildGdHall, GDH } from './hall-gd.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { createPlatform } from './platform.js';
import { turnstile } from './st-nevsky.js';
import { insetPoly, ringOf, panelTex, lowerHall, shaftParapet, doorFrame } from './petro-kit.js';
import { sharedFloor } from './hall-vault.js';
import { stripFloor, outerSteps, closedDoors, roomPoly } from './vo-kit.js';
import { makeSigns } from './signs.js';

const BLDG = 'w183122885', FONT = '"Rubik","Noto Sans",sans-serif', GREEN = '#2f7a63';
// the baked footprint of the pavilion (used when the baked data are not loaded)
const FOOT = [[-4105.4, -1138], [-4080.2, -1153], [-4063.3, -1124.5], [-4081.2, -1113.9], [-4083.9, -1118.4], [-4091.2, -1114.1]];

export function buildVasileostrovskaya(ctx, M, X) {
  const { mat, tex } = ctx;
  const VO = FRAMES.vasileostrovskaya, PZ = VO_PZ, FY = VO.y, E = ESC2.vasileostrovskaya, TRK = GDH.TRK, res = {};
  const name = 'Василеостровская', nameEn = 'Vasileostrovskaya';
  const S = new Space(ctx, VO, { name: 'vasileostrovskaya' }), k = S.k;

  // ================================================================ materials: smalt, cream marble blocks, dark granite with aluminium strips
  const smaltTex = tex.draw(256, 128, (g, w, h) => {
    const r = ctx.rng('vo-smalt'); g.fillStyle = '#3a8890'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = ['#2b6f7d', '#4f9ea4', '#1f5663', '#6db3b0', '#357c86'][(r() * 5) | 0]; g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 3); }
    for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(255,255,255,0.20)'; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  }, { key: 'vo-smalt' });
  M.rep(smaltTex, 1 / 2.4, 1 / 1.05);
  const smalt = mat.toon('#ffffff', { map: smaltTex }), smaltTube = mat.toon('#ffffff', { map: smaltTex, side: 'double' });
  const wallMat = mat.toon('#ffffff', { map: panelTex(ctx, M, 'vo-wall', { base: '#d9ceb4', w: 1.2, h: 0.6, cols: 2, rows: 4, vein: 'rgba(140,120,90,0.22)', dark: 'rgba(80,60,30,0.07)' }) });
  const floorMat = mat.toon('#ffffff', { map: M.T.granite('vo-floor', '#6b6560', 'rgba(15,12,10,0.38)', 'rgba(255,255,255,0.20)', { joint: 'rgba(214,217,222,0.60)' }) });
  const lettersTex = M.bronzeName(name, 'vo-letters', { fill: '#c2a25c' });

  // ================================================================ the hall
  const hall = buildGdHall(ctx, M, S, { id: 'vo', FY, PZ, name, nameEn, stock: 'neva', stairHole: null, endE: { halfW: 4.0, spring: 1.0 }, endW: null,
    skin: { wallMat, floorMat, vault: '#f8f6f0', rib: '#e6e1d6', ribPitch: 4.4, ribW: 0.07, spring: 5.0, B: 3.4, frieze: smalt, fins: mat.toon('#3d352b'), shelf: mat.toon('#43392f'), band: GREEN, endMat: mat.toon('#e3dccb') },
    pills: [],                                                                  // the three pills (Begovaya z -34, way out z 6, Rybatskoye z 38) are replaced at the same spots by the kit boards of the signage block below
    sos: [[3.2, -40], [-3.2, 30]] });
  for (const sx of [-1, 1]) { const p = k.plane(0.06, 2 * PZ - 2, mat.decal('#e8e6e0'), [sx * (GDH.EDGE - 0.75), FY + 0.012, 0], [-Math.PI / 2, 0, 0]); p.castShadow = false; }
  const vInfo = { openings: hall.openings, FY, TRK, EDGE: GDH.EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + X.STUB_VISIBLE, discPos: PZ + 0.6 + X.STUB_VISIBLE, activeRadius: 260 };
  res.vInfo = vInfo;
  // the tunnel stubs: the -z end (toward Primorskaya) is a dead stub with a black disc; the +z end carries the real tunnel to Gostiny Dvor (metro/links-vo.js; the stub is the fallback)
  for (const m of hall.mouths) { const go = () => X.buildStub(ctx, M, S, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall.BED, {}); if (m.zs > 0 && X.realEnd && X.realEnd('vasileostrovskaya:1')) X.deferStub('vasileostrovskaya:1', go); else go(); }
  res.stubs = hall.mouths;
  // the blind west end: a brass grille screen in an arch with the name (photo v2)
  {
    const pan = tex.draw(512, 384, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.save(); g.beginPath(); g.moveTo(14, h); g.lineTo(14, h * 0.5); g.bezierCurveTo(14, 8, w - 14, 8, w - 14, h * 0.5); g.lineTo(w - 14, h); g.closePath(); g.clip();
      g.fillStyle = '#2b2418'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b39a5e'; for (let x = 20; x < w - 14; x += 17) g.fillRect(x, 0, 9, h);
      g.fillStyle = '#d2b977'; for (const y of [h * 0.30, h * 0.46, h * 0.62]) g.fillRect(0, y, w, 10);
      g.fillStyle = '#3a301d'; g.fillRect(70, h * 0.335, w - 140, h * 0.11);
      g.fillStyle = '#e1c985'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, [...name.toUpperCase()].join(String.fromCharCode(8202)), w / 2, h * 0.39, w - 170, 46, FONT, 600);
      g.restore();
    }, { key: 'vo-grille' });
    const p = k.plane(7.8, 5.9, mat.decal('#ffffff', { map: pan }), [0, FY + 3.0, -PZ + 0.03], [0, 0, 0]); p.castShadow = false;
  }

  // ================================================================ wayfinding signage (shared kit signs.js; docs/research/metro-wayfinding.md sections 2, 3, 7)
  //   hanging boards on the axis (x 0, centre FY + 3.3, rods to the vault), back to back one board per reading direction; linear schemes on two of the five wide piers of each wall (where the bronze letters were);
  //   one network map on a narrow pier near the incline end. No track band: this closed hall already draws its green name band under the cornice (hall-gd.js).
  {
    const sg = makeSigns(ctx, M), LN = '3', EDGE = GDH.EDGE, ID = 'vasileostrovskaya', BY = FY + 3.3, BH = 0.62, SPG = FY + 5.0;
    const ceilAt = (x) => SPG + 3.4 * Math.sqrt(Math.max(0, 1 - (x / GDH.A) ** 2));                       // inner face of the elliptical vault (skin B 3.4)
    const EXIT = { streets: [['Средний проспект В.О.', 'Sredny prospekt V.I.'], ['6-я и 7-я линии В.О.', '6th and 7th lines V.I.']] };
    const trk = (key, arrow) => sg.sec.trains(LN, key === 'S' ? 1 : -1, arrow);                              // S = toward +z (higher index, Rybatskoye), N = toward -z (Begovaya)
    const toPlusZ = [trk('N', 'l'), trk('S', 'r')];                                                          // read by people walking +z (board faces -z): +x is on their left
    const toMinusZ = [trk('S', 'l'), trk('N', 'r')];                                                         // read by people walking -z (board faces +z): -x is on their left
    let nb = 0;
    const board = (z, rotY, sections, rods = true) => {
      const L = sg.textures.hangBoard(sections, { w: BH, flip: false }).length, rx = Math.min(L / 2 - 0.4, L * 0.32);
      nb++;
      return sg.hangBoard(S, { x: 0, y: BY, z: z + (rotY ? -0.065 : 0.065), rotY, sections, w: BH, both: false, rodLen: rods ? Math.max(0.6, ceilAt(rx) - (BY + BH / 2) + 0.05) : 0 });
    };
    const pair = (z, facingMinusZ, facingPlusZ) => { if (facingMinusZ) board(z, Math.PI, facingMinusZ); if (facingPlusZ) board(z, 0, facingPlusZ, !facingMinusZ); };
    pair(-PZ + 4.5, [sg.sec.exit(EXIT, 'u', true)], toMinusZ);                                               // the blind end (grille): the way out lies ahead along the hall
    pair(-34, toPlusZ, toMinusZ);                                                                            // replaces the Begovaya pill
    pair(6, [trk('N', 'l'), sg.sec.city('u', true), trk('S', 'r')], toMinusZ);                               // hall centre, replaces the way-out pill
    pair(38, toPlusZ, toMinusZ);                                                                             // replaces the Rybatskoye pill
    pair(PZ - 4.5, [sg.sec.exit(EXIT, 'u', true), sg.sec.rules('right')], toMinusZ);                         // over the passage to the incline: way out + the rules board; the back reads to the trains
    // piers between the train doors: wide (between two cars, 4.55 m clear) and narrow (2.95 m)
    const dz = hall.doorZ, wide = [], narrow = [];
    for (let i = 0; i + 1 < dz.length; i++) (dz[i + 1] - dz[i] > 5 ? wide : narrow).push((dz[i] + dz[i + 1]) / 2);
    const lm = mat.decal('#ffffff', { map: lettersTex });
    let ns = 0, nl = 0;
    for (const sx of [-1, 1]) {
      const rotY = sx > 0 ? -Math.PI / 2 : Math.PI / 2, travel = sx > 0 ? -1 : 1, ahead = sg.aheadOf(rotY, travel);
      wide.forEach((z, i) => {
        if (i === 1 || i === 3) { sg.lineScheme(S, { x: sx * EDGE, y: FY + 1.6, z, rotY, line: LN, currentId: ID, dir: travel, ahead, w: 4.4, h: 1.2 }); ns++; }
        else { const p = k.plane(4.6, 0.46, lm, [sx * (EDGE - 0.03), FY + 1.75, z], [0, rotY, 0]); p.castShadow = false; nl++; }          // the bronze name letters of hall-gd.js, kept on the piers without a scheme
      });
    }
    const zm = narrow.reduce((a, z) => (Math.abs(z - 43.6) < Math.abs(a - 43.6) ? z : a), narrow[0]);
    sg.networkMap(S, { x: EDGE, y: FY + 1.55, z: zm, rotY: -Math.PI / 2, w: 1.6 });
    res.signs = { boards: nb, schemes: ns, letters: nl, mapZ: zm, widePiers: wide, narrowPiers: narrow.length, pixels: sg.pixels };
  }

  // ================================================================ the lower hall + the 3-lane incline (east end, +z), the tube lined with smalt
  const zFoot = S.L(E.bottom.x, E.bottom.z)[1];
  lowerHall(ctx, M, S, { A: E.A, FY, z0: PZ + 0.5, z1: zFoot + 0.7, vaultMat: smaltTube });
  { const p = k.plane(2.7, 0.7, M.board(M.blueBoard('Выход в город · Way out', 'Эскалатор · Escalator', null, 'vo-lower-out', { bg: '#1b35d8' }), 1.0), [0, FY + 3.7, PZ + 1.2], [0, Math.PI, 0]); p.castShadow = false; }
  const Se = new Space(ctx, E.eframe, { name: 'vasileostrovskaya-esc', tag: null, zone: 'vasileostrovskaya-esc-fx' });
  Se.group.userData.alwaysVisible = true;                                       // the mouth of the incline is seen from the street through the doors: it must not show the sky through the opening of the floor
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, shellStart: 12, lanes: E.lanes, halfW: E.A, shellMat: smaltTube });

  // ================================================================ the vestibule inside the pavilion (escalator frame: head at the origin, z along the descent toward WNW)
  const Sv = new Space(ctx, E.eframe, { name: 'vo-vestibule', tag: null, zone: 'vo-vestibule-fx' }), kv = Sv.k;
  const b = ctx.L.buildingById(BLDG), foot = b ? ringOf(b.polys[0].o) : FOOT;
  const av = (ctx.services && ctx.services.landmarksAndrew && ctx.services.landmarksAndrew.metro) || null, podium = !!(av && av.podium);   // landmarksAndrew draws the real pavilion on the podium
  const FV = VO_FLOOR + 0.05, CEIL = FV + ((av && av.ceil) || 3.4);
  const dws = DOORWAYS.filter((d) => d.station === 'vasileostrovskaya'), poly = roomPoly(foot, 0.45, dws, insetPoly), doors = dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 3.2, arch: false }));
  const holeLoc = [-E.A - 0.3, E.A + 0.3, 0, 13.4], hole = [[-E.A, 0], [E.A, 0], [E.A, 13], [-E.A, 13]].map(([x, z]) => Sv.W(x, z));
  const vwall = mat.toon('#ffffff', { map: panelTex(ctx, M, 'vo-vwall', { base: '#cdb98f', w: 0.9, h: 0.6, cols: 3, rows: 4 }), side: 'double' });
  const room = buildPolyRoom(ctx, M, { id: 'vo-vest', poly, y0: FV, ceil: CEIL, doors, holes: [hole], wallMat: vwall, ceilMat: mat.toon('#e9e5da', { side: 'double' }),
    floorMat: sharedFloor(ctx, M, '#cfc9be'), lamps: { step: 4.4, mat: M.lampWhite, size: [1.8, 0.5], rot: -E.yaw } });
  res.room = room;
  // the floor is a podium: solid from the street (0) up to 1.7 over the whole plan, the shaft left open; the sills of the two doors bridge the wall thickness
  stripFloor(Sv, poly.map((p) => Sv.L(p[0], p[1])), [holeLoc], FV, FV);
  for (const d of dws) { const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY); ctx.physics.addWalkBox(d.x - nx * 0.3, d.z - nz * 0.3, d.w, 1.1, d.rotY, FV, 0); }
  shaftParapet(Sv, M, { A: E.A, len: 13, y: FV, mat: mat.toon('#6d6a66') });
  // ticket barriers along x = -9 (entrance door in their middle), glass partitions to the walls with an exit gate, machines and the ticket-office signs
  const free = (x, z, r = 0.6) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => room.inside(...Sv.W(x + dx, z + dz)));
  for (let z = -11.2; z <= -2.7; z += 1.2) turnstile(kv, M, -9, FV, z, Math.PI / 2);
  for (const z of [-12.1, -2.0]) kv.box(0.1, 1.1, 0.1, M.stainless, [-9, FV + 0.6, z]);
  const glass = (z0, z1) => { kv.box(0.08, 2.2, z1 - z0, M.glass, [-9, FV + 1.1, (z0 + z1) / 2]); kv.box(0.12, 0.1, z1 - z0, M.stainless, [-9, FV + 2.25, (z0 + z1) / 2]); Sv.col(-9.15, -8.85, FV - 0.1, FV + 2.4, z0, z1); };
  glass(-13.0, -12.2); glass(-1.8, 4.2); glass(6.0, 14.6);
  for (const z of [4.2, 6.0]) { kv.box(0.1, 1.0, 0.1, M.stainless, [-9, FV + 0.5, z]); kv.box(0.12, 0.14, 0.14, M.lampGreen, [-9, FV + 1.05, z]); }
  for (const e of room.edges) {                                               // ticket machines / offices along the walls of the free zone
    const dn = e.doors.length; if (!dn) continue; const rotY = Math.atan2(e.inward[0], e.inward[1]);
    for (const dd of e.doors) for (const off of [-5.2, -3.9, 3.9, 5.2]) { const t = dd.t + off; if (t < 1.2 || t > e.l - 1.2) continue; const x = e.a[0] + e.ux * t + e.inward[0] * 0.55, z = e.a[1] + e.uz * t + e.inward[1] * 0.55, [lx, lz] = Sv.L(x, z);
      if (lx > -10 || !free(lx, lz, 0.5)) continue; room.k.box(0.8, 1.9, 0.55, mat.toon('#3d4d78'), [x, FV + 1.0, z], [0, rotY, 0]); room.k.box(0.6, 0.45, 0.06, M.lampCool, [x + e.inward[0] * 0.3, FV + 1.45, z + e.inward[1] * 0.3], [0, rotY, 0]); ctx.physics.addBox(x, z, 0.9, 0.7, rotY, FV - 0.2, FV + 2.1); }
  }
  {
    const ks = M.board(M.blueBoard('Касса', 'Ticket office', null, 'vo-kassa', { bg: '#1d8a4c' }), 1.0);
    for (const d of dws) { const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), p = room.k.plane(1.5, 0.4, ks, [d.x - nx * 0.6, FV + 3.3, d.z - nz * 0.6], [0, d.rotY + Math.PI, 0]); p.castShadow = false; }
    const q = kv.plane(3.4, 0.7, M.board(M.blueBoard('К поездам', 'To the trains', 'd', 'vo-v-trains'), 1.0), [-4.2, FV + 3.3, -3.4], [0, Math.PI, 0]); q.castShadow = false;
    const o = kv.plane(3.6, 0.66, M.board(M.blueBoard('Выход в город', 'Средний проспект · 6–7-я линии · Way out', 'l', 'vo-v-out', { bg: '#1b35d8' }), 1.0), [-8.95, FV + 3.2, 5.1], [0, Math.PI / 2, 0]); o.castShadow = false;
    const band = kv.plane(6.4, 0.6, M.board(M.nameBoard(name, nameEn, '#0f9b4a', 'vo-band'), 1.0), [0, FV + 3.0, 13.6], [0, Math.PI, 0]); band.castShadow = false;
  }
  X.addVestZone('vasileostrovskaya', room.inside, 10);

  // ================================================================ the street side: stop-gap steps + door frames (skipped when landmarksAndrew draws the pavilion on its podium)
  res.podium = podium; res.steps = [];
  if (!podium) {
    const g = new THREE.Group(); g.name = 'vasileostrovskaya-street'; ctx.addStatic(g);
    for (const d of dws) res.steps.push(outerSteps(ctx, M, g, d, { n: 11, run: 3.3, top: VO_FLOOR }));
  }

  // ================================================================ the platform doors (closed type), the station object
  const rt = X.rtOf('vasileostrovskaya', X.net.vasileostrovskaya, VO, vInfo, null);
  rt.platform = createPlatform(ctx, M, { id: 'vasileostrovskaya', name, nameEn, frame: VO, stock: 'neva', line: '3', idx: X.net.vasileostrovskaya.idx }, vInfo, X.protos, {
    onArrive: () => X.toast('Станция «Василеостровская». Выход к Среднему проспекту и Андреевскому бульвару (6–7-я линии)'),
  });
  X.stations.vasileostrovskaya = rt;
  closedDoors(ctx, rt, hall, S, VO, PZ, FY);

  // ---- routes for the tests: the way out (platform -> lower hall -> UP lane -> barriers -> exit gate -> door -> steps -> street) and the way in
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit'), nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)];
  const at = (d, out, tol) => { const [nx, nz] = nOf(d), q = [d.x + nx * out, d.z + nz * out]; return tol ? [...q, tol] : q; };
  res.exitRoute = () => ({ start: [...toWorld(VO, 0, 20), FY], points: [toWorld(VO, 0, PZ - 1), toWorld(VO, -1, PZ + 2), SeW(2, E.run + 3, 0.4), SeW(2, E.run - 3, 0.3), SeW(2, 60, 0.3), SeW(2, 6, 0.3), SeW(2, -1.4), SeW(-5.8, -1.8), SeW(-6.8, 5.1), SeW(-11.5, 5.4), SeW(-13.2, 8.4), at(dOut, -1.0), at(dOut, 0.4), at(dOut, 1.8, 0.6), at(dOut, 4.6)],
    door: [dOut.x, dOut.z], out: at(dOut, 4.6), outward: nOf(dOut) });
  res.entryRoute = () => ({ start: [...at(dIn, 5.0), 0], points: [at(dIn, 2.0, 0.6), at(dIn, 0.4), at(dIn, -1.0), SeW(-12, -6.5), SeW(-6.5, -6.5), SeW(-2, -1.6), SeW(-2, 3, 0.4), SeW(-2, E.run - 2, 0.5), SeW(-1, E.run + 3), toWorld(VO, 0, PZ - 6)], end: { station: 'vasileostrovskaya', y: FY } });
  res.S = S; res.Se = Se; res.Sv = Sv; res.hall = hall; res.esc = esc; res.rt = rt; res.doors = dws; res.FV = FV;
  return res;
}
