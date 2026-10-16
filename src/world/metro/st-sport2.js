// metro/st-sport2.js — Sportivnaya-2, the island vestibule of Sportivnaya (line 5; opened 27 May 2015; docs/research/vo-roster-metro.md section 2.3, photos refs/metro-vo s1-s4, Commons "Metro SPB Line5 Sportivnaya ...").
//   tunnel     from an arched opening in the south end wall of the LOWER hall of Sportivnaya (st-sport.js): a 250 m tube under the Malaya Neva (metro/travelator.js): 10 m level, a travelator flight of 35 m, a 5 m
//              landing, a flight of 199 m (7 degrees; three lanes: two toward the island, one back), 12 m level; then a curved corridor to the foot of the escalator (-35.3 m)
//   incline    4 lanes (two down, two up), 49 m of run, 28.3 m of rise, to the underground ticket hall (-7 m)
//   ticket hall   a 24 x 35 m hall (the lobby: a ring of six cream marble pylons with dark-red triangles, a maroon ring beam round a blue ceiling inset, a cream ring inlaid in the dark red-brown granite floor,
//              turnstiles, machines, the name in white letters on a dark granite band, a mosaic over the way in); five doors lead by corridors to the FIVE EXITS:
//              the two oval glazed pavilions (exits 6 and 7: WELLS sportivnaya2-6 / -7: a stair of 47 steps + two escalators, drawn by landmarksMakarova: the generic city until then, interiors here) and the three
//              stair pits (exits 8, 9, 10: open granite stairwells on the pavements, red-brown granite parapets, a lit oval sign, the steel-and-glass roof)
// Everything is in the escalator frame Se (head = the origin, z' toward ESE) or the frame of the hall of Sportivnaya.
import * as THREE from 'three';
import { FRAMES, ESC2, WELLS, VO_PITS, DOORWAYS, SP_PZ, S2_UY, toWorld } from '../data/metro.js';
import { Space, bezierPath, minRadius } from './lib.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { turnstile } from './st-nevsky.js';
import { panelTex, lowerHall, shaftParapet, stairPit } from './petro-kit.js';
import { endPlate } from './plate.js';
import { buildWell } from './pavilion.js';
import { buildTravelator } from './travelator.js';
import { stripFloor } from './vo-kit.js';
import { sharedFloor } from './hall-vault.js';

const PURPLE = '#702785', FONT = '"Rubik","Noto Sans",sans-serif';
const HUB = { x0: -12, x1: 12, z0: -20, z1: 15 };
const DOORS = { w6: [-12, 11], n7: [-6, -20], n8: [6, -20], e9: [12, -8], e10: [12, 4] };      // doors of the hub: x', z' (escalator frame)
const INWARD = { w6: [1, 0], n7: [0, 1], n8: [0, 1], e9: [-1, 0], e10: [-1, 0] };               // the direction of travel when entering the hub

/** the smoothest cubic Bezier between two poses (the handles are chosen to maximise the smallest turning radius) */
function smoothConnect(P0, t0, P1, t1, step = 2.5) {
  const dist = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]); let best = null;
  for (const a of [0.25, 0.35, 0.5, 0.7, 0.9, 1.2]) for (const b of [0.25, 0.35, 0.5, 0.7, 0.9, 1.2]) { const pts = bezierPath(P0, t0, P1, t1, a * dist, b * dist, step), r = minRadius(pts); if (!best || r > best.r) best = { pts, r }; }
  return best;
}

export function buildSportivnaya2(ctx, M, X) {
  const { mat, tex } = ctx;
  const sp = X.petro && X.petro.sport; if (!sp) throw new Error('Sportivnaya (st-sport.js) has to be built first');
  const SP = FRAMES.sportivnaya, PZ = SP_PZ, FYL = SP.y, E = ESC2.sport2, UY = S2_UY, res = {};
  const name = 'Спортивная', nameEn = 'Sportivnaya', rep = (t, x, y) => M.rep(t, x, y);

  // ================================================================ the travelator tunnel (frame of the hall of Sportivnaya)
  const St = new Space(ctx, SP, { name: 'sportivnaya2-tunnel' });
  const trav = buildTravelator(ctx, M, St, { z0: PZ + 0.6, y0: FYL, segs: [['level', 10], ['flight', 35], ['level', 5], ['flight', 199], ['level', 12]], signBg: PURPLE });
  res.trav = trav; res.St = St;

  // ================================================================ the escalator (frame Se: head at the origin, z' toward ESE) with a lower hall and the plate to the corridor
  const Se = new Space(ctx, E.eframe, { name: 'sportivnaya2-esc' });
  const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, mouth: false, trench: true, shellStart: 11, lanes: E.lanes, halfW: E.A });
  lowerHall(ctx, M, Se, { A: E.A, FY: E.FY, z0: E.run - 0.7, z1: E.run + 8, vaultMat: mat.toon('#e9e3d6', { side: 'double' }) });
  endPlate(Se, M, { A: E.A, y: E.FY, z0: E.run + 7.5, z1: E.run + 8, halfW: 2.9, spring: 1.4, yBase: E.FY + 0.05 });
  { const p = Se.k.plane(2.8, 0.7, M.board(M.blueBoard('К поездам · Спортивная', 'To the trains · line 5', 'd', 'sp2-lower-trains', { bg: PURPLE }), 1.0), [0, E.FY + 3.7, E.run + 6.4], [0, 0, 0]); p.castShadow = false; }
  res.esc = esc; res.Se = Se;

  // ---- the corridor from the end of the tunnel to the lower hall of the escalator: a straight run, a right turn of ~88 degrees, a straight run (solved from the two end poses)
  const grp = X.mkGroup('sportivnaya2-corridors'), CORR = { w: 4.4, h: 2.6, rise: 1.4, noLift: true }, CORR_T = { w: 5.8, h: 2.6, rise: 1.5, noLift: true };
  const Wt = toWorld(SP, 0, trav.zEnd), tw0 = [Math.sin(SP.yaw), Math.cos(SP.yaw)], Pe = Se.W(0, E.run + 7.7), te = [-Math.sin(Se.frame.yaw), -Math.cos(Se.frame.yaw)];
  {
    const f0 = Math.atan2(tw0[1], tw0[0]), f1 = Math.atan2(te[1], te[0]); let d = f1 - f0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const R = 9, sg = d > 0 ? 1 : -1, arcEnd = [sg * R * (Math.sin(f0 + d) - Math.sin(f0)), -sg * R * (Math.cos(f0 + d) - Math.cos(f0))];         // displacement of the arc (turtle convention of st-gorny)
    // P0 + L1 (cos f0, sin f0) + arc + L2 (cos f1, sin f1) = Pe
    const bx = Pe[0] - Wt[0] - arcEnd[0], bz = Pe[1] - Wt[1] - arcEnd[1], det = Math.cos(f0) * Math.sin(f1) - Math.sin(f0) * Math.cos(f1);
    const L1 = (bx * Math.sin(f1) - bz * Math.cos(f1)) / det, L2 = (Math.cos(f0) * bz - Math.sin(f0) * bx) / det;
    res.cor0 = { L1, L2, d: d * 180 / Math.PI };
    const pts = [Wt]; let [x, z] = Wt, phi = f0; const n1 = Math.max(1, Math.round(Math.max(L1, 0) / 2.5));
    for (let i = 0; i < n1; i++) { x += Math.cos(phi) * Math.max(L1, 0) / n1; z += Math.sin(phi) * Math.max(L1, 0) / n1; pts.push([x, z]); }
    const na = Math.max(2, Math.round(Math.abs(d) * R / 2.5)); for (let i = 0; i < na; i++) { const a = d / na; const nx = x + sg * R * (Math.sin(phi + a) - Math.sin(phi)), nz = z - sg * R * (Math.cos(phi + a) - Math.cos(phi)); x = nx; z = nz; phi += a; pts.push([x, z]); }
    const n2 = Math.max(1, Math.round(Math.max(L2, 0) / 2.5)); for (let i = 0; i < n2; i++) { x += Math.cos(phi) * Math.max(L2, 0) / n2; z += Math.sin(phi) * Math.max(L2, 0) / n2; pts.push([x, z]); }
    res.cor0.end = [x, z]; res.cor0.err = Math.hypot(x - Pe[0], z - Pe[1]); res.cor0.R = minRadius(pts);
    X.cor('sportivnaya2-tunnel', grp, pts.map((p) => [p[0], trav.yEnd, p[1]]), CORR_T);
  }

  // ================================================================ the ticket hall (escalator frame): ring colonnade, barriers, machines, the name, the mosaic
  const Sv = new Space(ctx, E.eframe, { name: 'sportivnaya2-hall', zone: 'sportivnaya2-hall' }), kv = Sv.k;
  const fy = UY + 0.05, CH = UY + 4.6, polyL = [[HUB.x0, HUB.z0], [HUB.x1, HUB.z0], [HUB.x1, HUB.z1], [HUB.x0, HUB.z1]], poly = polyL.map(([x, z]) => Sv.W(x, z));
  const doors = Object.entries(DOORS).map(([k, [x, z]]) => { const q = Sv.W(x, z); return { x: q[0], z: q[1], w: 4.4, h: 2.9, arch: true, k }; });
  const hole = [[-E.A, 0], [E.A, 0], [E.A, 11.4], [-E.A, 11.4]].map(([x, z]) => Sv.W(x, z));
  const white = mat.toon('#ffffff', { map: panelTex(ctx, M, 'sp2-wall', { base: '#e5decf', w: 0.9, h: 0.6, cols: 3, rows: 4, vein: 'rgba(140,125,100,0.20)' }), side: 'double' });
  const redFloor = sharedFloor(ctx, M, '#6b4a45');
  const room = buildPolyRoom(ctx, M, { id: 'sp2-hall', poly, y0: fy, ceil: CH, under: true, holes: [hole], doors, wallMat: white, ceilMat: mat.toon('#f3f1ec', { side: 'double' }), colY: [UY - 1.5, UY + 5], lamps: false, floorMat: redFloor });
  res.room = room;
  stripFloor(Sv, polyL, [[-E.A - 0.3, E.A + 0.3, 0.3, 11.7]], fy, 1.1);
  for (const d of Object.entries(DOORS)) { const [x, z] = d[1], sg = x < 0 ? -1 : x > 0 && Math.abs(x) > 8 ? 1 : 0; if (sg) Sv.walk(sg < 0 ? x - 0.9 : x - 0.4, sg < 0 ? x + 0.4 : x + 0.9, z - 2.1, z + 2.1, fy, 1.1); else Sv.walk(x - 2.1, x + 2.1, z - 0.9, z + 0.4, fy, 1.1); }          // the sills of the doors bridge the wall thickness
  shaftParapet(Sv, M, { A: E.A, len: 11.4, y: fy, mat: mat.toon('#7a5b52') });
  // the ring colonnade round the lobby (centre (0, -11), R 7.5): six cream pylons with dark-red triangles at the head and the foot, a maroon ring beam, a cream band, a blue ceiling inset, a cream ring inlaid in the floor
  {
    const cz = -11, R = 7.5, cream = mat.toon('#e8dfcf'), redGr = mat.toon('#6a2e22'), maroon = mat.toon('#6a2328'), blue = mat.toon('#2d4a73');
    const ringMesh = (r0, r1, y0, y1, material) => { const sh = new THREE.Shape(); sh.absarc(0, 0, r1, 0, Math.PI * 2, false); const hl = new THREE.Path(); hl.absarc(0, 0, r0, 0, Math.PI * 2, true); sh.holes.push(hl); const g = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 40 }); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, material); m.position.set(0, y0, cz); m.castShadow = false; Sv.group.add(m); };
    ringMesh(R - 0.2, R + 0.9, CH - 1.0, CH - 0.25, maroon); ringMesh(R - 0.45, R - 0.2, CH - 0.85, CH - 0.35, cream);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R - 0.5, 40), blue); disc.rotation.x = Math.PI / 2; disc.position.set(0, CH - 0.04, cz); disc.castShadow = false; Sv.group.add(disc);
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = R * Math.cos(a), z = cz + R * Math.sin(a), ry = -a;
      kv.box(1.5, CH - 1.0 - fy, 0.95, cream, [x, (CH - 1.0 + fy) / 2, z], [0, ry + Math.PI / 2, 0]); Sv.col(x - 0.8, x + 0.8, fy - 1, CH - 1, z - 0.8, z + 0.8);
      for (const yy of [CH - 1.35, fy + 0.35]) kv.box(0.55, 0.55, 0.97, redGr, [x, yy, z], [0, ry + Math.PI / 2, Math.PI / 4]); }
    const rg = new THREE.Mesh(new THREE.RingGeometry(R - 0.12, R + 0.12, 64), mat.decal('#dcd0b2')); rg.rotation.x = -Math.PI / 2; rg.position.set(0, fy + 0.012, cz); rg.castShadow = false; Sv.group.add(rg);
    for (let z = HUB.z0 + 3; z < HUB.z1 - 1; z += 5) for (const x of [-9, -4.5, 4.5, 9]) { if (z > -1 && z < 12.5 && Math.abs(x) < 6) continue; const m = kv.box(1.6, 0.07, 0.6, M.lampWhite, [x, CH - 0.05, z]); m.castShadow = false; }
  }
  // barriers across the head (z' = -3.5), glass along the sides of the shaft (the paid zone), ticket machines, the name on a dark granite band, the mosaic over the way in (north wall)
  const zt = -3.5;
  for (let x = -4.8; x <= 4.9; x += 1.2) turnstile(kv, M, x, fy, zt, 0);
  for (const sx of [-1, 1]) { const x = sx * 5.6, z0 = zt, z1 = 11.9; kv.box(0.08, 2.3, z1 - z0, M.glass, [x, fy + 1.15, (z0 + z1) / 2]); kv.box(0.12, 0.1, z1 - z0, M.stainless, [x, fy + 2.33, (z0 + z1) / 2]); Sv.col(x - 0.1, x + 0.1, fy - 1, fy + 2.4, z0, z1); }
  for (const z of [2, 6, 10]) for (const sx of [-1, 1]) { const x = sx * (E.A + 1.3); kv.cyl(0.07, 0.09, 2.3, M.brass, [x, fy + 1.15, z], null, 8); kv.cyl(0.33, 0.09, 0.4, M.brass, [x, fy + 2.5, z], null, 12); const l = kv.cyl(0.3, 0.3, 0.05, M.lampWarm, [x, fy + 2.72, z], null, 12); l.castShadow = false; Sv.col(x - 0.2, x + 0.2, fy - 1, fy + 2.3, z - 0.2, z + 0.2); }
  for (let x = -10.5; x <= -8; x += 1.4) { kv.box(0.8, 1.9, 0.55, mat.toon('#2f4f9a'), [x, fy + 0.95, HUB.z1 - 0.5]); kv.box(0.6, 0.45, 0.06, M.lampCool, [x, fy + 1.45, HUB.z1 - 0.8], [0, Math.PI, 0]); Sv.col(x - 0.45, x + 0.45, fy - 1, fy + 2.1, HUB.z1 - 1.0, HUB.z1); }
  {
    const band = tex.draw(1024, 128, (g, w, h) => { g.fillStyle = '#3a3a3e'; g.fillRect(0, 0, w, h); const r = ctx.rng('sp2-band'); for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.18)'; g.fillRect(r() * w, r() * h, 2, 2); } g.fillStyle = '#f1efe8'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, [...name.toUpperCase()].join(String.fromCharCode(8202, 8202, 8202)), w / 2, h / 2 + 2, w - 120, 78, FONT, 700); }, { key: 'sp2-band' });
    const bm = mat.toon('#ffffff', { map: band });
    for (const sx of [-1, 1]) { const p = kv.plane(8.0, 1.0, bm, [sx * (HUB.x1 - 0.06), fy + 3.4, -1.5], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]); p.castShadow = false; }
    const mos = tex.draw(512, 192, (g, w, h) => { const r = ctx.rng('sp2-mos'); g.fillStyle = '#6e2a22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,200,120,0.16)' : 'rgba(30,5,0,0.20)'; g.fillRect(r() * w, r() * h, 6, 6); }
      g.fillStyle = '#d9b040'; g.beginPath(); g.arc(w / 2, 66, 50, 0, 7); g.fill(); g.fillStyle = '#f1ead8'; g.fillRect(w / 2 - 10, 90, 20, 80); g.fillStyle = '#e9632c'; g.beginPath(); g.moveTo(w / 2, 22); g.quadraticCurveTo(w / 2 + 28, 56, w / 2, 80); g.quadraticCurveTo(w / 2 - 28, 56, w / 2, 22); g.fill();
      const fig = (x, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, 62, 11, 0, 7); g.fill(); g.fillRect(x - 10, 74, 20, 96); }; for (const [x, c] of [[60, '#f1ead8'], [108, '#d9b040'], [156, '#f1ead8'], [356, '#f1ead8'], [404, '#d9b040'], [452, '#f1ead8']]) fig(x, c);
      g.strokeStyle = '#d9b040'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); }, { key: 'sp2-mosaic' });
    const p = kv.plane(8.6, 3.2, mat.toon('#ffffff', { map: mos }), [0, fy + 2.25, HUB.z0 + 0.04], [0, 0, 0]); p.castShadow = false;
    const a = kv.plane(3.4, 0.7, M.board(M.blueBoard('К поездам · Спортивная', 'To the trains · line 5', 'd', 'sp2-v-trains', { bg: PURPLE }), 1.0), [0, fy + 3.3, zt - 0.25], [0, 0, 0]); a.castShadow = false;
    const exits = [['w6', 'Выход № 6 · Набережная Макарова', 'l', -1], ['e10', 'Выход № 10 · 1-я линия', 'r', 1], ['n7', 'Выход № 7 · Кадетская линия', 'u', 0], ['n8', 'Выходы № 8, 9 · Тучков мост', 'u', 0]];
    for (const [i, [id, text, arrow, sg]] of exits.entries()) { const [dx, dz] = DOORS[id]; const q = kv.plane(3.6, 0.7, M.board(M.blueBoard(text, 'Way out', arrow, 'sp2-v-out-' + id, { bg: '#1b35d8' }), 1.0), sg ? [dx - sg * 0.1, fy + 3.2, dz + (id === 'e10' ? 3.5 : -3.5)] : [dx + (id === 'n7' ? 3.5 : -3.5), fy + 3.2, dz + 0.1], sg ? [0, sg > 0 ? -Math.PI / 2 : Math.PI / 2, 0] : [0, 0, 0]); q.castShadow = false; void i; }
  }

  // ================================================================ the exits: two wells (pavilions 6 and 7) and three stair pits (8, 9, 10), the corridors to the doors of the hall
  const w6 = WELLS.find((w) => w.id === 'sportivnaya2-6'), w7 = WELLS.find((w) => w.id === 'sportivnaya2-7');
  const opt = { name, nameEn, color: PURPLE, signBg: PURPLE, pavWall: '#d4d8da', wallBase: '#d6c8b4' };
  res.wells = { w6: buildWell(ctx, M, X, w6, opt), w7: buildWell(ctx, M, X, w7, opt) };
  const dirSe = (u) => { const c = Math.cos(E.yaw), s = Math.sin(E.yaw); return [u[0] * c - u[1] * s, u[0] * s + u[1] * c]; };           // world direction -> escalator frame (E.yaw = the yaw of Se)
  const toSe = (p) => Sv.L(p[0], p[1]);
  const link = (id, P0w, t0w, doorKey, cw = CORR) => {
    const P0 = toSe(P0w), t0 = dirSe(t0w), P1 = DOORS[doorKey], t1 = INWARD[doorKey], c = smoothConnect(P0, t0, P1, t1);
    res['cor_' + id] = { r: c.r, n: c.pts.length };
    X.cor('sportivnaya2-' + id, grp, c.pts.map((p) => { const q = Sv.W(p[0], p[1]); return [q[0], UY, q[1]]; }), cw);
  };
  link('w6', [res.wells.w6.landing.door[0] + w6.u[0] * 0.3, res.wells.w6.landing.door[1] + w6.u[1] * 0.3], w6.u, 'w6');
  link('w7', [res.wells.w7.landing.door[0] + w7.u[0] * 0.3, res.wells.w7.landing.door[1] + w7.u[1] * 0.3], w7.u, 'n7');
  // the stair pits: granite stairwells (stairPit), a lit oval sign, a steel-and-glass roof over the open part
  const pitGroup = new THREE.Group(); pitGroup.name = 'sportivnaya2-pits'; ctx.addStatic(pitGroup);
  const oval = M.board(tex.draw(512, 128, (g, w, h) => { g.fillStyle = '#f1ede0'; tex.roundRect(g, 2, 2, w - 4, h - 4, 56); g.fill(); g.fillStyle = '#1d4e9b'; g.font = `800 84px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('М', 64, h / 2 + 5); g.fillStyle = '#2a2a30'; tex.fitText(g, name, 262, h * 0.38, 290, 46, FONT, 700); g.globalAlpha = 0.8; tex.fitText(g, nameEn, 262, h * 0.74, 290, 26, FONT, 500); g.globalAlpha = 1; g.fillStyle = PURPLE; tex.roundRect(g, 440, 44, 40, 40, 9); g.fill(); g.fillStyle = '#fff'; g.font = `700 30px ${FONT}`; g.fillText('5', 460, 66); }, { key: 'sport-oval' }), 1.0);
  res.pits = {};
  for (const p of VO_PITS) {
    const info = stairPit(ctx, M, pitGroup, p, { depth: 7, sign: oval, canopy: true, stone: mat.toon('#7a5b52'), coping: mat.toon('#8a6c62') });
    link('pit' + p.n, info.foot, p.e, { 8: 'n8', 9: 'e9', 10: 'e10' }[p.n]); res.pits[p.n] = { ...p, ...info };
  }

  // ================================================================ routes for the tests: the way out (lower platform -> tunnel -> escalator -> hall -> pavilion 6 -> street), the way in (pit 10 -> hall -> escalator -> tunnel -> platform)
  const SeW = (x, z, tol) => { const q = Se.W(x, z); return tol ? [q[0], q[1], tol] : q; }, TW = (x, z, tol) => { const q = St.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const WeW = (wr, x, z, tol) => { const q = wr.Se.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  const corPts = (debug, nm, rev, step = 2) => { const c = debug.corridors.find((q) => q.name === 'sportivnaya2-' + nm).pts.map((q) => [q[0], q[2]]); const sel = c.filter((_, i, a) => i % step === 0 || i === a.length - 1); return rev ? sel.reverse() : sel; };
  const d6 = DOORWAYS.find((d) => d.id === 'sportivnaya2-6'), nOf = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)], at = (d, r, tol) => { const [nx, nz] = nOf(d), q = [d.x + nx * r, d.z + nz * r]; return tol ? [...q, tol] : q; };
  const pit10 = res.pits[10], w6r = res.wells.w6;
  res.exitRoute = (debug) => ({ start: [...toWorld(SP, 2.5, 64), FYL], points: [toWorld(SP, 2.5, 70), toWorld(SP, -0.5, 79.5), TW(-1.9, 86, 1.2), TW(-1.9, 100, 1.2), TW(-1.9, 140, 1.5), TW(-1.9, 200, 1.5), TW(-1.9, 260, 1.5), TW(-1.9, 320, 1.5), TW(-1.2, trav.zEnd - 2, 1.5), ...corPts(debug, 'tunnel', false, 3),
    SeW(1, E.run + 4.5, 0.6), SeW(1, E.run - 3, 0.3), SeW(1, 40, 0.3), SeW(1, 6, 0.3), SeW(1, -1.6), SeW(1, -6), SeW(-8, -6), SeW(-8, 8), SeW(-10.5, 11, 0.8), ...corPts(debug, 'w6', true),
    WeW(w6r, 0, w6.run + 4), WeW(w6r, w6.lanes[1].x, w6.run + 1.2, 0.4), WeW(w6r, w6.lanes[1].x, w6.run - 3, 0.3), WeW(w6r, w6.lanes[1].x, 5, 0.3), WeW(w6r, w6.lanes[1].x, -1.8), WeW(w6r, 0.2, -2.8), at(d6, -0.5), at(d6, 1.0, 0.6), at(d6, 4)],
    door: [d6.x, d6.z], out: at(d6, 4), outward: nOf(d6) });
  res.entryRoute = (debug) => ({ start: [pit10.mouth[0] - pit10.e[0] * 3, pit10.mouth[1] - pit10.e[1] * 3, 0], points: [[pit10.mouth[0] + pit10.e[0] * 1, pit10.mouth[1] + pit10.e[1] * 1, 0.7], [pit10.mouth[0] + pit10.e[0] * 9, pit10.mouth[1] + pit10.e[1] * 9, 0.7], ...corPts(debug, 'pit10', false),
    SeW(9, 4), SeW(9, -6), SeW(-1, -6), SeW(-1, -2), SeW(-1, 3, 0.4), SeW(-1, E.run - 2, 0.5), SeW(-1, E.run + 4), ...corPts(debug, 'tunnel', true, 3), TW(1.9, trav.zEnd - 3, 1.5), TW(1.9, 320, 1.5), TW(1.9, 260, 1.5), TW(1.9, 200, 1.5), TW(1.9, 140, 1.5), TW(1.9, 100, 1.5), TW(1.0, 86, 1.5), toWorld(SP, 2.5, 72), toWorld(SP, 2.5, 64)], end: { station: 'sportivnaya', y: FYL } });
  res.S = St; res.Sv = Sv; res.FV = fy; res.hall = { FY: FYL };
  return res;
}
