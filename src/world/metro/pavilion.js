// metro/pavilion.js — the WELL of a small surface pavilion: a stair flight (47 steps, 30 degrees) and one or two escalators go 7 m down from the floor of the pavilion to a landing room of the underground
// ticket hall (Gorny Institut: the two small glass pavilions of Bolshoy pr. 66; Sportivnaya-2: the oval pavilions of exits 6 and 7). Data: WELLS in data/metro.js (door anchor, direction of descent = the long
// axis of the building, lobby, open length of the floor opening, lanes, stair position). The building shell is the owner's (landmarksSredny / landmarksMakarova, the generic city until then); this file draws
// everything INSIDE the footprint and below it:
//   pavilion room  floor 5 cm over the street, a ceiling at 3.1 m, wall slabs inset 0.4 m inside the footprint with the door openings, lamps, parapets round the opening, signs
//   well           the escalator tube (escalator.js, mouth = true: the street floor is open over `open` m) + the stair flight beside the lanes (the same slope), a plate closes the tube end
//   landing room   6 m x (2A + 1) at the foot, a door in its far end wall (the corridor to the ticket hall starts there)
// Returns { Se (well frame), Sv, room, esc, landing: { room, door: [x, z], dir: [dx, dz] }, foot }.
import * as THREE from 'three';
import { Space, extrudeX } from './lib.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { insetPoly, ringOf, shaftParapet, panelTex } from './petro-kit.js';
import { WELL_DEPTH, DOORWAYS } from '../data/metro.js';
import { roomPoly } from './vo-kit.js';
import { sharedFloor } from './hall-vault.js';

export function buildWell(ctx, M, X, w, o = {}) {
  const { mat } = ctx, D = WELL_DEPTH, run = w.run, A = w.A, res = {};
  const frame = { x: w.head[0], z: w.head[1], yaw: w.yaw };
  // the well is drawn always (alwaysVisible): seen from the street through the door it must not show the sky through the opening of the floor
  const Se = new Space(ctx, frame, { name: w.id + '-well', tag: null, zone: w.id + '-well-fx' }), Sv = new Space(ctx, frame, { name: w.id + '-pavilion', tag: null, zone: w.id + '-pavilion-fx' });
  Se.group.userData.alwaysVisible = true;
  const esc = buildEscalator(ctx, M, Se, { FY: -D, yTop: 0, zTop: 0, zBottom: run, mouth: true, holeLen: w.open, trench: true, shellStart: w.open - 0.6, lanes: w.lanes, halfW: A });
  res.esc = esc;

  // ---- the stair flight beside the lanes: 47 granite treads on the same 30 degree slope, a yellow nosing on the first and the last
  {
    const n = Math.round(D / 0.15), x0 = w.stairX - w.stairW / 2, x1 = w.stairX + w.stairW / 2, tread = run / n, rise = D / n, prof = [];
    for (let i = 0; i < n; i++) { prof.push([i * tread, -rise * i], [i * tread, -rise * (i + 1)]); }
    prof.push([run, -D], [run, -D - 0.4], [0, -0.4]);
    const m = new THREE.Mesh(extrudeX(prof, x0, x1), o.stepMat || mat.toon('#8d8983')); m.receiveShadow = true; Se.group.add(m);
    for (const z of [0.5 * tread, run - 0.5 * tread]) Se.k.box(w.stairW, 0.02, tread, M.yellow, [w.stairX, z < 1 ? -rise + 0.012 : -D + 0.012, z]);
    const [cx, cz] = Se.W(w.stairX, run / 2); ctx.physics.addStairs(cx, cz, w.stairW - 0.1, run, w.yaw, 0, -D, n);
    // a handrail on the side toward the tube wall
    const sx = x0 - 0.02, rail = new THREE.Group(); rail.position.set(sx, -D / 2 + 0.95, run / 2); rail.rotation.order = 'YXZ'; rail.rotation.x = Math.PI / 2 + Math.atan2(D, run);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, Math.hypot(run, D), 6), M.stainless); r.castShadow = false; rail.add(r); Se.group.add(rail);
  }
  // ---- the landing room (underground) at the foot: Lr m long, width of the tube; a door in the far end wall; the near wall is the bulkhead of the tube
  const Lr = o.landing ?? 6, hw = A + 0.5, y0 = -D + 0.05, ceil = y0 + 3.7;
  {
    const P = [[-hw, run - 0.2], [hw, run - 0.2], [hw, run + Lr], [-hw, run + Lr]].map(([x, z]) => Se.W(x, z));
    const dFar = Se.W(0, run + Lr), dNear = Se.W(0, run - 0.2);
    const wall = mat.toon('#ffffff', { map: panelTex(ctx, M, 'well-wall', { base: o.wallBase || '#d9ceb8', w: 0.9, h: 0.6, cols: 3, rows: 4 }), side: 'double' });
    const room = buildPolyRoom(ctx, M, { id: w.id + '-landing', poly: P, y0, ceil, under: true, doors: [{ x: dFar[0], z: dFar[1], w: o.doorW ?? 4.2, h: 3.0, arch: true }, { x: dNear[0], z: dNear[1], w: 2 * (A - 0.35), h: 3.2, arch: true }], wallMat: wall, ceilMat: mat.toon('#eae5da', { side: 'double' }),
      floorMat: o.floorMat || sharedFloor(ctx, M, '#cfc9be'), lamps: { step: 3.4, mat: M.lampWhite, size: [1.4, 0.45], rot: -w.yaw }, wallThick: 0.3, colY: [-D - 1.5, -D + 5] });
    Se.walk(-hw, hw, run - 0.35, run + Lr, y0, 1.1);
    // signs in the landing: the way to the trains / the way out (blue) above the near wall
    const sg = (text, sub, key, arrow, z, rotY) => { const q = Se.W(0, z), p = room.k.plane(2.8, 0.62, M.board(M.blueBoard(text, sub, arrow, key, { bg: o.signBg || '#1d4e9b' }), 1.0), [q[0], y0 + 2.9, q[1]], [0, rotY, 0]); p.castShadow = false; };
    if (w.kind === 'exit') sg('Выход в город', 'Way out', w.id + '-sign-land', 'u', run + 1.0, w.yaw); else sg('К поездам', 'To the trains', w.id + '-sign-land', 'd', run + Lr - 0.5, w.yaw + Math.PI);
    res.landing = { room, door: dFar, dir: w.u, W: Se.W };
  }
  // ---- the pavilion room: the interior of the footprint at street level; the opening in the floor above the well
  {
    const b = ctx.L.buildingById(w.bldg), foot = b ? ringOf(b.polys[0].o) : null;
    const dws = DOORWAYS.filter((d) => d.bldg === w.bldg);
    if (foot) {
      const poly = roomPoly(foot, 0.4, dws, insetPoly), hole = [[-A, 0], [A, 0], [A, w.open], [-A, w.open]].map(([x, z]) => Se.W(x, z));
      const wall = mat.toon('#ffffff', { map: panelTex(ctx, M, 'pav-wall', { base: o.pavWall || '#cfd2d4', w: 0.9, h: 0.6, cols: 3, rows: 4 }), side: 'double' });
      const room = buildPolyRoom(ctx, M, { id: w.id + '-pav', poly, y0: 0.05, ceil: o.ceil ?? 3.1, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 2.8, arch: false })), holes: [hole], wallMat: wall, ceilMat: mat.toon('#eceae4', { side: 'double' }),
        floorMat: o.pavFloor || sharedFloor(ctx, M, '#d4cfc5'), lamps: { step: 3.6, mat: M.lampWhite, size: [1.4, 0.45], rot: -w.yaw } });
      res.room = room;
      shaftParapet(Sv, M, { A, len: w.open, y: 0.05, mat: o.parapet || mat.toon('#6d6a66') });
      X.addVestZone(w.id, room.inside, 5);
      // the name board over the lobby end and a plain strip of ticket-office window on one wall
      const nb = M.board(M.nameBoard(o.name || w.id, o.nameEn || '', o.color || '#1d4e9b', 'pav-name-' + (o.nameEn || w.id)), 1.0);
      for (const d of dws) { const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), p = room.k.plane(4.2, 0.56, nb, [d.x - nx * 0.5, 2.55, d.z - nz * 0.5], [0, d.rotY + Math.PI, 0]); p.castShadow = false; }
    } else console.warn('[metro] pavilion footprint not found', w.bldg);
  }
  res.Se = Se; res.Sv = Sv; res.foot = w.foot; res.w = w;
  return res;
}
