// metro/hub-tekhnolog.js — Tekhnologichesky Institut 1 + 2: the node as a whole (docs/research/metro-south-vitebsky-tekhnolog.md sections 3.2, 3.3, 7, 9.3).
//   buildTekhnologHub(ctx, M, X) -> { tekhnolog, tekhnolog2, vest, passage, walks() } (null without FRAMES.tekhnolog: data/metro.js has not called define() of data/metro-tekhnolog.js)
//   halls      metro/st-tekhnolog.js (hall 1 = line 1, hall 2 = line 2: the KNOWN SIMPLIFICATION of the cross-platform interchange, see the header there)
//   vestibule  ONE ticket hall inside the Metro Administration building r2163775 (the semicircle on the corner of Moskovsky and Zagorodny pr.): white marble walls, grey marble floor with a
//              mosaic disc under the round anteroom dome (anodised metal plates) behind the entrance on Moskovsky pr., the two incline mouths (the "Y" of the two passages) with marble
//              parapets, a turnstile row and a blue attendant booth in front of each, hanging boards «к поездам» / «выход в город». Doors: DOORWAYS tekhnolog-in (west facade) / -out
//              (the curved corner front, facing NNW onto the square; data/metro-tekhnolog.js TK_FRONT). The facade, the roof and the hollow interior belong to the owner of the building (request: docs/research/metro-south-vitebsky-tekhnolog.md 9.3).
//   passage    the cross passage between the halls at FY + 4.2 (TK.PASS): hall 1 stair (middle of the hall, over its +x track) -> 21 m tiled passage -> hall 2 bridge (over its +x track) ->
//              landing -> axial stair down into the SSW end of the central hall of hall 2; signed as the transfer in both directions; about 50 m on foot.
//   routes     res.exitRoute / entryRoute per hall (platform <-> pavement, real physics in the tests) and walks() 'tekhnolog->tekhnolog2' / 'tekhnolog2->tekhnolog' (metro.js debug.walks).
import * as THREE from 'three';
import { FRAMES, ESC2, DOORWAYS, toWorld } from '../data/metro.js';
import { TK, TK_FOOTPRINT } from '../data/metro-tekhnolog.js';
import { Space, floorGeo } from './lib.js';
import { buildPolyRoom, polyHas } from './proom.js';
import { insetPoly, shaftParapet } from './petro-kit.js';
import { turnstile } from './st-nevsky.js';
import { makeSigns } from './signs.js';
import { buildTekhnolog1, buildTekhnolog2, tekhMats, TI } from './st-tekhnolog.js';
import { MeshBuilder, addCap } from '../lib/massing.js';

const say = (ctx, what, e) => { console.error('[metro] Tekhnologichesky Institut: ' + what + ' failed', e); (ctx.errors ||= []).push(e); };

export function buildTekhnologHub(ctx, M, X) {
  if (!FRAMES.tekhnolog || !FRAMES.tekhnolog2 || TK.ZC2 === null) return null;
  let h1 = null, h2 = null, vest = null, passage = null;
  try { h1 = buildTekhnolog1(ctx, M, X); } catch (e) { say(ctx, 'hall 1', e); }
  try { h2 = buildTekhnolog2(ctx, M, X); } catch (e) { say(ctx, 'hall 2', e); }
  try { vest = buildVest(ctx, M, X); } catch (e) { say(ctx, 'vestibule', e); }
  try { if (h1 && h2) passage = buildPassage(ctx, M, X, h1, h2); } catch (e) { say(ctx, 'cross passage', e); }
  if (vest) {
    if (h1) Object.assign(h1, routes1(h1, vest), { vest });
    if (h2) Object.assign(h2, routes2(h2, vest), { vest });
  }
  return { tekhnolog: h1, tekhnolog2: h2, vest, passage, walks: () => (h1 && h2 && passage ? walksOf(h1, h2) : {}) };
}

// ---------------------------------------------------------------------------------------------------------------- the vestibule
function buildVest(ctx, M, X) {
  const { mat } = ctx, ti = tekhMats(ctx, M), sg = makeSigns(ctx, M), V = TK.VEST, FV = V.floor, CEIL = V.ceil;
  const E1 = ESC2.tekhnolog, E2 = ESC2.tekhnolog2;
  const Sv1 = new Space(ctx, E1.eframe, { name: 'tekh-vest-1', tag: null, zone: 'tekh-vestibule-fx' }), Sv2 = new Space(ctx, E2.eframe, { name: 'tekh-vest-2', tag: null, zone: 'tekh-vestibule-fx' });
  const poly = insetPoly(TK_FOOTPRINT, 0.35);
  const hole = (Sv, A) => [[-A, 0], [A, 0], [A, 13], [-A, 13]].map(([x, z]) => Sv.W(x, z));
  const dws = DOORWAYS.filter((d) => d.bldg === V.bldg), dIn = dws.find((d) => d.kind === 'entrance'), dOut = dws.find((d) => d.kind === 'exit');
  const floorMat = mat.toon('#ffffff', { map: M.T.granite('ti-vfloor', '#c9c4ba', 'rgba(60,55,50,0.25)', 'rgba(255,255,255,0.35)') });
  const room = buildPolyRoom(ctx, M, { id: 'tekh-vest', poly, y0: FV, ceil: CEIL, doors: dws.map((d) => ({ x: d.x, z: d.z, w: d.w, h: 3.2, arch: true })), doorSnap: 1.2, holes: [hole(Sv1, E1.A), hole(Sv2, E2.A)],
    wallMat: ti.vest, floorMat, noCeiling: true, colY: [-1.5, 6.5] });
  const kg = room.k;
  // the ceiling with the round anteroom dome behind the entrance (anodised metal plates), lamps on a grid
  const nIn = [Math.sin(dIn.rotY), Math.cos(dIn.rotY)], DC = [dIn.x - nIn[0] * 6.5, dIn.z - nIn[1] * 6.5], RD = 4.2;
  {
    const circ = []; for (let i = 0; i < 32; i++) { const a = -i * Math.PI * 2 / 32; circ.push([DC[0] + RD * Math.cos(a), DC[1] + RD * Math.sin(a)]); }
    const cb = new MeshBuilder(); addCap(cb, { o: poly.flat(), h: [circ.flat()] }, CEIL, { up: false, uvScale: 6 }); room.group.add(new THREE.Mesh(cb.build(), mat.toon('#f1efe9', { side: 'double' })));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(RD, 32, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat.toon('#c3c6cb', { side: 'double' })); dome.scale.y = 0.62; dome.position.set(DC[0], CEIL, DC[1]); dome.castShadow = false; room.group.add(dome);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; kg.box(0.5, 0.08, 0.22, M.lampWhite, [DC[0] + (RD - 0.35) * Math.cos(a), CEIL - 0.05, DC[1] + (RD - 0.35) * Math.sin(a)], [0, -a, 0]).castShadow = false; }
    const holes = [hole(Sv1, E1.A), hole(Sv2, E2.A)], yawL = -E1.yaw, c = Math.cos(yawL), s = Math.sin(yawL);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = Math.hypot(x1 - x0, z1 - z0) / 2;
    for (let u = -R; u <= R; u += 4.5) for (let v = -R; v <= R; v += 4.5) {
      const x = cx + u * c - v * s, z = cz + u * s + v * c;
      if (!polyHas(poly, x, z) || holes.some((h) => polyHas(h, x, z)) || Math.hypot(x - DC[0], z - DC[1]) < RD + 0.6) continue;
      kg.box(1.6, 0.08, 0.6, M.lampWhite, [x, CEIL - 0.05, z], [0, -yawL, 0]).castShadow = false;
    }
    const disc = new THREE.Mesh(new THREE.RingGeometry(1.2, 3.2, 40), mat.decal('#9a7a52')); disc.rotation.x = -Math.PI / 2; disc.position.set(DC[0], FV + 0.012, DC[1]); room.group.add(disc);
    const inner = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), mat.decal('#6f6a62')); inner.rotation.x = -Math.PI / 2; inner.position.set(DC[0], FV + 0.012, DC[1]); room.group.add(inner);
  }
  // the two incline mouths: parapets, a turnstile row 5 m behind each head, a blue booth, the boards
  for (const [Sv, E, line] of [[Sv1, E1, '1'], [Sv2, E2, '2']]) {
    shaftParapet(Sv, M, { A: E.A, len: 13, y: FV, mat: M.marbleWhite });
    for (let x = -E.A + 0.45; x <= E.A - 0.4; x += 1.2) turnstile(Sv.k, M, x, FV, -5, 0);
    Sv.k.box(1.4, 2.3, 1.8, mat.toon('#1b2e96', { transparent: true, opacity: 0.7 }), [E.A + 1.6, FV + 1.15, -1.0]); Sv.col(E.A + 0.85, E.A + 2.35, FV - 0.5, FV + 2.4, -1.95, -0.05);
    sg.hangBoard(Sv, { x: 0, y: FV + 3.7, z: -7.0, rotY: Math.PI, both: false, rodLen: CEIL - FV - 4.0, sections: [sg.sec.trains(line, 1, 'd'), sg.sec.trains(line, -1, 'd')] });
    sg.hangBoard(Sv, { x: 0, y: FV + 3.7, z: -2.6, rotY: 0, both: false, rodLen: CEIL - FV - 4.0, sections: [sg.sec.city('u'), sg.sec.transfer({ to: line === '1' ? 'tekhnolog2' : 'tekhnolog', line: line === '1' ? '2' : '1', plain: true }, line === '1' ? 'r' : 'l')] });
  }
  // a lit stand with the network map in the anteroom, out of the way of the entrance flow
  { const p = [DC[0] + nIn[0] * -2.6 + nIn[1] * 3.0, DC[1] + nIn[1] * -2.6 - nIn[0] * 3.0], g = kg.group([p[0], FV, p[1]], dIn.rotY);
    const kk = ctx.kit(g); kk.box(1.5, 1.4, 0.18, M.steelDark, [0, 1.5, 0]); kk.box(0.12, 0.8, 0.12, M.steelDark, [0, 0.4, 0]); sg.networkMap(g, { x: 0, y: 1.5, z: 0.1, rotY: 0, w: 1.3, res: 0.5, lit: true }); sg.networkMap(g, { x: 0, y: 1.5, z: -0.1, rotY: Math.PI, w: 1.3, res: 0.5, lit: true });
    ctx.physics.addBox(p[0], p[1], 1.6, 0.4, dIn.rotY + Math.PI / 2, FV - 0.5, FV + 2.3); }
  X.addVestZone && X.addVestZone('tekhnolog', room.inside, 7);
  return { room, Sv1, Sv2, dIn, dOut, DC, poly };
}

// ---------------------------------------------------------------------------------------------------------------- the cross passage between the halls
function buildPassage(ctx, M, X, h1, h2) {
  const ti = tekhMats(ctx, M), sg = makeSigns(ctx, M), F1 = FRAMES.tekhnolog, F2 = FRAMES.tekhnolog2, Y = F1.y + TK.PASS, PW = TK.PW, HP = 3.0;
  // from the plate of the hall-1 landing (hall-1 x WALL + 0.3) to the end of the walls of the hall-2 bridge (hall-2 x WALL + 0.3): no coplanar overlap with either
  const P0 = toWorld(F1, TI.WALL + 0.3, 0), P1 = toWorld(F2, TI.WALL + 0.3, TK.ZC2), Lp = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
  const S = new Space(ctx, { x: P0[0], z: P0[1], yaw: Math.atan2(P1[0] - P0[0], P1[1] - P0[1]) }, { name: 'tekhnolog-passage' }), k = S.k;
  S.mesh(floorGeo(-PW / 2, PW / 2, 0, Lp, Y + 0.004, 1), M.corridorFloor);
  S.bx(-PW / 2 - 0.3, PW / 2 + 0.3, Y - 0.35, Y, 0, Lp, ti.plaster);
  for (const sx of [-1, 1]) {
    const x = sx * PW / 2;
    S.group.add(new THREE.Mesh(quadPlaneX(x, 0, Lp, Y, Y + HP, -sx), ti.tile));
    S.bx(sx > 0 ? x + 0.02 : x - 0.3, sx > 0 ? x + 0.3 : x - 0.02, Y, Y + HP + 0.15, 0, Lp, ti.plaster);
    S.bx(sx > 0 ? x - 0.04 : x, sx > 0 ? x : x + 0.04, Y, Y + 0.25, 0.02, Lp - 0.02, M.graniteGrey);
    S.col(sx > 0 ? x : x - 0.4, sx > 0 ? x + 0.4 : x, Y - 0.5, Y + 3.3, -0.4, Lp + 0.4);
  }
  S.mesh(floorGeo(-PW / 2, PW / 2, 0, Lp, Y + HP, 1, false), ti.plaster);
  S.bx(-PW / 2 - 0.3, PW / 2 + 0.3, Y + HP + 0.02, Y + HP + 0.15, 0, Lp, ti.plaster);
  for (let z = 1.5; z < Lp; z += 3) k.box(1.4, 0.06, 0.45, M.lampWhite, [0, Y + HP - 0.04, z]).castShadow = false;
  S.walk(-PW / 2, PW / 2, -0.45, Lp + 0.45, Y, 0.3);
  // boards: toward hall 2 (read when walking from hall 1) and toward hall 1; the hours plate of the interchange (photo 02)
  const hours = { kind: 'rules', text: 'Переход между станциями до 00:15', sub: 'Station interchange is open till 00:15' };
  sg.hangBoard(S, { x: 0, y: Y + 2.45, z: 2.0, rotY: Math.PI, both: false, rodLen: 0.12, sections: [sg.sec.transfer({ to: 'tekhnolog2', line: '2' }, 'u'), hours] });
  sg.hangBoard(S, { x: 0, y: Y + 2.45, z: Lp - 2.0, rotY: 0, both: false, rodLen: 0.12, sections: [sg.sec.transfer({ to: 'tekhnolog', line: '1' }, 'u'), hours] });
  return { S, Lp, P0, P1, Y };
}
/** vertical quad in the plane x = const of a Space (faces +x when fx > 0), uv (z, y) in metres */
function quadPlaneX(x, z0, z1, y0, y1, fx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0, z0, x, y0, z1, x, y1, z1, x, y1, z0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Array(4).fill([fx > 0 ? 1 : -1, 0, 0]).flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([z0, y0, z1, y0, z1, y1, z0, y1], 2));
  g.setIndex(fx > 0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
  return g;
}

// ---------------------------------------------------------------------------------------------------------------- routes (tests walk them with the real player physics)
const nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)];
const inside = (d, m, tol) => { const n = nOf(d), p = [d.x - n[0] * m, d.z - n[1] * m]; return tol ? [...p, tol] : p; };
const outside = (d, m) => { const n = nOf(d); return [d.x + n[0] * m, d.z + n[1] * m]; };

/** from the entrance door to the north side of the head of incline `Sv` (around the far end of the hall-1 mouth, which lies just inside the entrance) */
function toHead(v, Sv, lane) {
  const pre = [inside(v.dIn, 1.6), v.Sv1.W(-0.8, 18.5), v.Sv1.W(8.2, 16.5), v.Sv1.W(8.4, -3.0)];
  return [...pre, Sv.W(lane, -7.5), [...Sv.W(lane, -3.0), 0.5], Sv.W(lane, -0.8)];
}
/** from the top of an up lane of `Sv` through the turnstiles to the exit door */
// (from the hall-2 head the straight line to the exit would graze the notch of the north-east front at (-1795, 1776): a waypoint in the middle of the hall)
const MID = [-1808, 1777];
const toExit = (v, Sv, lane) => [Sv.W(lane, -1.6), [...Sv.W(lane, -3.5), 0.5], Sv.W(lane, -7.5), ...(Sv === v.Sv2 ? [MID] : []), inside(v.dOut, 2.2), inside(v.dOut, 0.5, 0.6), outside(v.dOut, 3.0)];

function routes1(h, v) {
  const { S, Se, E } = h, FY = FRAMES.tekhnolog.y, PZ = TK.PZ1, Wh = (x, z, tol) => { const p = S.W(x, z); return tol ? [...p, tol] : p; }, We = (x, z, tol) => { const p = Se.W(x, z); return tol ? [...p, tol] : p; };
  return {
    exitRoute: () => ({ start: [...S.W(0, -30), FY], points: [Wh(0, -PZ + 3), Wh(0, -PZ - 3.0), We(1, E.run + 2.2, 0.4), We(1, E.run - 3, 0.3), We(1, 40, 0.3), We(1, 6, 0.3), ...toExit(v, v.Sv1, 1)],
      door: [v.dOut.x, v.dOut.z], out: outside(v.dOut, 3.0), outward: nOf(v.dOut) }),
    entryRoute: () => ({ start: [...outside(v.dIn, 3.0), 0], points: [...toHead(v, v.Sv1, -1), We(-1, 3, 0.4), We(-1, E.run - 2, 0.5), We(-1, E.run + 2.4), Wh(0, -PZ - 1.5), Wh(0, -PZ + 4), Wh(0, -40)], end: { station: 'tekhnolog', y: FY } }),
  };
}
function routes2(h, v) {
  const { S, Se, E, zB, zFoot } = h, FY = FRAMES.tekhnolog2.y, Wh = (x, z, tol) => { const p = S.W(x, z); return tol ? [...p, tol] : p; }, We = (x, z, tol) => { const p = Se.W(x, z); return tol ? [...p, tol] : p; };
  return {
    exitRoute: () => ({ start: [...S.W(0, 30), FY], points: [Wh(0, zB - 2), Wh(0, zB + 3), We(2, E.run + 2.2, 0.4), We(2, E.run - 3, 0.3), We(2, 40, 0.3), We(2, 6, 0.3), ...toExit(v, v.Sv2, 2)],
      door: [v.dOut.x, v.dOut.z], out: outside(v.dOut, 3.0), outward: nOf(v.dOut) }),
    entryRoute: () => ({ start: [...outside(v.dIn, 3.0), 0], points: [...toHead(v, v.Sv2, 0), We(0, 3, 0.4), We(0, E.run - 2, 0.5), We(0, E.run + 2.4), Wh(0, zFoot - 3), Wh(0, zB - 3), Wh(0, 20)], end: { station: 'tekhnolog2', y: FY } }),
  };
}
/** platform -> platform through the cross passage (both ways) */
function walksOf(h1, h2) {
  const S1 = h1.S, S2 = h2.S, s1 = h1.stair, s2 = h2.stair, ZC = TK.ZC2, WALL = TI.WALL, FY1 = FRAMES.tekhnolog.y, FY2 = FRAMES.tekhnolog2.y;
  const w = (S, x, z, tol) => { const p = S.W(x, z); return tol ? [...p, tol] : p; };
  const a = [w(S1, 1.0, 0), w(S1, s1.XS0 - 0.3, 0), w(S1, s1.XS1 - 0.5, 0, 0.6), w(S1, WALL - 1.0, 0)];
  const b = [w(S2, WALL - 1.0, ZC), w(S2, TI.C, ZC), w(S2, 0, ZC, 0.6), w(S2, 0, s2.zTop + 0.4, 0.5), w(S2, 0, s2.zA + 0.6), w(S2, 0, s2.zA + 6)];
  return {
    'tekhnolog->tekhnolog2': { start: [...S1.W(-1.5, 20), FY1], points: [...a, ...b, S2.W(0, 25)], end: { station: 'tekhnolog2', y: FY2 } },
    'tekhnolog2->tekhnolog': { start: [...S2.W(0, 25), FY2], points: [...b.slice().reverse(), ...a.slice().reverse(), S1.W(-1.5, 20)], end: { station: 'tekhnolog', y: FY1 } },
  };
}
