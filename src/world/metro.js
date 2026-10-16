// metro.js — the Saint Petersburg metro (docs/METRO.md, docs/UNDERGROUND.md, docs/research/metro*.md).
//
//   stations   7 real halls (Vosstaniya, Vladimirskaya, Mayakovskaya, Dostoevskaya, Gostiny Dvor, Nevsky Prospekt, Admiralteyskaya) + passages + two real tunnels (Vosstaniya - Vladimirskaya,
//              Gostiny Dvor - Mayakovskaya); each line end is ONE out-of-strip neighbour station served by the shared generic hall (a terminus: data/metro.js STATIONS)
//   data       data/metro.js and metro/net.js: stations, frames, HOPS, TRANSFERS; builders st-*.js are called from here
//   ride       metro/ride.js: board by walking into an open door or [E]; the ride is a chain of legs to the end of the line, in REAL time, stopping at every station; get off at any stop; no map panel
//   signs      metro/signs.js: hanging boards, line schemes, track bands, network map; the in-car strips are in metro/train.js
// Publishes ctx.services.metro = { stations, entrances, network, ride(from, to) } (people use the entrances) and ctx.metro (debug, hubs, discs, ride controller).
import * as THREE from 'three';
import { recordCanvases, scheduleRelease, keepOutOfAtlas } from './metro/release.js';
import { FRAMES, escGeom, roomGeom, SHAFT_LEN, DOORWAYS, PITS, LINES, toWorld, toLocal } from './data/metro.js';
import { Space, inPoly, clamp, smoothPath, extrudeZ, archHole, bezierPath, minRadius } from './metro/lib.js';
import { buildRoom } from './metro/room.js';
import { buildCorridor } from './metro/corridor.js';
import { buildJunction } from './metro/junction.js';
import { makeMats } from './metro/mats.js';
import { buildPylonHall, PYLON } from './metro/hall-pylon.js';
import { buildEscalator } from './metro/escalator.js';
import { buildRotunda } from './metro/rotunda.js';
import { buildVestibule } from './metro/vestibule.js';
import { buildCarProtos, makeTrain, STOCK, carOffset } from './metro/train.js';
import { createPlatform } from './metro/platform.js';
import { createRide } from './metro/ride.js';
import { buildStub, STUB_VISIBLE, STUB_PATHS, EXT_GROUPS, DISCS, registerDisc } from './metro/stubs.js';
import { buildTunnel, buildLongTunnel } from './metro/tunnel.js';
import { buildGenericHall, GEN } from './metro/hall-generic.js';
import * as NET from './metro/net.js';
import { buildAdmiralteyskaya } from './metro/st-adm.js';
import { buildNevsky } from './metro/st-nevsky.js';
import { buildGostiny } from './metro/st-gd.js';
import { GDH } from './metro/hall-gd.js';
import { addPolyColliders } from './lib/massing.js';

export const OWNS_GROUPS = true;

const LOOK_UNDER = { name: 'metro', sun: 0, sky: false, shadows: false, far: 420, ambient: { color: '#fff1e0', ground: '#d9c9b6', intensity: 1.9 }, fog: { color: '#bfae93', density: 0.006 }, key: { color: '#fff0da', intensity: 1.5, dir: [0.35, 0.8, 0.5] }, bloom: { bloom: 0.34, glow: 0.18, threshold: 0.95 }, vignette: 0.22 };
const LOOK_VEST = { name: 'vestibule', sun: 0.25, sky: false, shadows: false, ambient: { color: '#fff2dc', ground: '#e6d6c0', intensity: 1.75 }, fog: { color: '#cdbfa8', density: 0.003 }, key: { color: '#fff1d8', intensity: 1.7, dir: [0.3, 0.8, 0.5] }, bloom: 0.3 };

// the shared generic hall + tunnel live far from everything (north-west corner of the map, deeper than any station)
const GENERIC_FRAME = { x: -250, z: -160, yaw: 0, y: -72 };
const GENERIC_TUNNEL = { x0: -520, z0: -330, bed: -84, length: 800, gbase: 200, ghi: 500, loop: 288 };

// the metro's canvases are released after the load (metro/release.js: the city sits at V8's global memory limit; every canvas the metro keeps adds full GCs on the street)
export async function build(ctx) {
  const rec = recordCanvases(ctx);
  let M = null;
  try { M = buildMetro(ctx); } finally { rec.stop(); }
  const noAtlas = keepOutOfAtlas(ctx, rec.set);          // underground-only canvases skip the batch atlas pages (metro/release.js; ?metroatlasskip=0 = old path)
  const stats = scheduleRelease(ctx, M, rec.set);
  if (ctx.metro) { ctx.metro.release = stats; ctx.metro.noAtlas = noAtlas; }
}

function buildMetro(ctx) {
  const M = makeMats(ctx);
  const mSign = ctx.tex.draw(128, 256, (gg, w, h) => { gg.fillStyle = '#1d4e9b'; ctx.tex.roundRect(gg, 0, 0, w, h, 14); gg.fill(); gg.fillStyle = '#fff'; ctx.tex.roundRect(gg, 10, 10, w - 20, w - 20, 16); gg.fill(); gg.fillStyle = '#1d4e9b'; gg.font = '800 96px "Rubik","Noto Sans",sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText('М', w / 2, w / 2 + 4); gg.fillStyle = '#fff'; ctx.tex.fitText(gg, 'МЕТРО', w / 2, h - 52, w - 14, 30, '"Rubik","Noto Sans",sans-serif', 700); }, { key: 'metro-totem' });
  const mSignMat = () => M.board(mSign, 0.9);
  const protoCache = {}; const protos = (id) => (protoCache[id] ||= buildCarProtos(ctx, M, id));
  const cam = ctx.camera.position, player = () => ctx.playerObj;
  const SHORT = 6;                                                      // stub length (to the black disc) at the ends where a corridor leaves the hall
  const stations = {};                                                  // id -> runtime station

  // ================================================================ Ploshchad Vosstaniya
  const V = FRAMES.vosstaniya, g = escGeom('vosstaniya');
  const S = new Space(ctx, V, { name: 'vosstaniya' });
  const hall = buildPylonHall(ctx, M, S, { id: 'vosst', FY: V.y, zLow: g.zBottom, name: 'Площадь Восстания', hang: [{ z: -50, text: 'Выход в город', sub: 'Way out' }, { z: 55, text: 'Переход на «Маяковская» · Выход к вокзалу', sub: 'To Mayakovskaya · Moscow Station' }], endHole: { S: { halfW: 3.3, spring: 0.6 } } });
  const discs = DISCS; discs.length = 0;                                  // EVERY black disc (stubs.js registerDisc: not batched, userData.disc = { kind, c, n }); a ride hides those of its own track
  const esc = buildEscalator(ctx, M, S, { FY: V.y, zTop: g.zTop, zBottom: g.zBottom, shellStart: 12 });
  const vInfo = { openings: hall.openings, FY: V.y, TRK: PYLON.TRK, EDGE: PYLON.EDGE, PZ: PYLON.PZ, mouth: PYLON.PZ + 0.6, discNeg: PYLON.PZ + 0.6 + STUB_VISIBLE, discPos: PYLON.PZ + 0.6 + STUB_VISIBLE, activeRadius: 260 };
  const vStubsN = () => { for (const m of hall.mouths) if (m.zs < 0) buildStub(ctx, M, S, m.sx * PYLON.TRK, m.zs * vInfo.mouth, m.zs, hall.BED, {}); };   // north end: a black-disc stub (the real tunnel to Chernyshevskaya is outside the strip: a ride jumps into the generic tunnel); the south end is the real tunnel to Vladimirskaya
  // street: the rotunda
  const bs = ctx.L.groupMembers('vosstaniya-rotunda');
  const outline = bs.find((b) => b.id === 'w28962850'), drumB = bs.find((b) => b.id === 'w310869151');
  const doors = DOORWAYS.filter((d) => d.bldg === 'w28962850');
  const rot = buildRotunda(ctx, M, { poly: outline.polys[0], drum: drumB.polys[0], doors });
  addPolyColliders(ctx, outline.polys[0], -1, 12.5);
  const vest = buildVestibule(ctx, M, { frame: V, poly: outline.polys[0], zTop: g.zTop, A: esc.A, shaftLen: SHAFT_LEN, doors, esc });

  const rtOf = (id, def, frame, info, platform, extra = {}) => ({ id, def, frame, hall: info, platform, W: (lx, lz) => toWorld(frame, lx, lz), L: (x, z) => toLocal(frame, x, z), ...extra });
  const net = NET.BY_ID;
  const toast = (ru, en) => { try { ctx.ui?.toast(ru); } catch (e) { /* headless */ } void en; };
  stations.vosstaniya = rtOf('vosstaniya', net.vosstaniya, V, vInfo, null);
  stations.vosstaniya.platform = createPlatform(ctx, M, { id: 'vosstaniya', name: net.vosstaniya.name, nameEn: net.vosstaniya.nameEn, frame: V, stock: 'baltiets', line: '1', idx: 9 }, vInfo, protos, {
    _onArrive: () => toast('Станция «Площадь Восстания». Переход на станцию «Маяковская». Выход к Московскому вокзалу'),
  });

  // ---- helpers shared by the stations behind a vestibule room
  const mkGroup = (name) => { const gp = new THREE.Group(); gp.name = name; gp.userData.undergroundOnly = true; gp.userData.zone = name; ctx.addStatic(gp); return gp; };
  const bulkhead = (Se, esc, FYv, run) => {          // plate between the sheared escalator tube and the corridor opening
    const A = esc.A, tubeIn = [[-A, FYv - 1.4], [-A, FYv + 1.0]]; for (let i = 1; i < 36; i++) { const t = Math.PI - i * Math.PI / 36; tubeIn.push([A * Math.cos(t), FYv + 1.0 + 4.9 * Math.sin(t)]); } tubeIn.push([A, FYv + 1.0], [A, FYv - 1.4]);
    Se.group.add(new THREE.Mesh(extrudeZ(tubeIn, run - 0.5, run, [archHole(0, 3.3, FYv, FYv + 0.6, 12)]), M.plasterWarm));
  };
  const CORR = { w: 6.4, h: 2.5, rise: 1.4 };
  const debug = { radii: {}, corridors: [], tubes: [], stubs: STUB_PATHS };
  // corridors are built at the very end (after every tube and stub exists): a corridor that has to cross a running tunnel / stub at the same level is lifted over it (slope <= 25 %)
  const pendingCor = [];
  const cor = (name, grp, pts, o) => { pendingCor.push({ name, grp, pts, o }); };
  const autoClear = (pts, obstacles) => {
    const n = pts.length, sArr = [0]; for (let i = 1; i < n; i++) sArr.push(sArr[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
    const y = pts.map((p) => p[1]), req = new Array(n).fill(-1e9);
    for (let i = 0; i < n; i++) for (const t of obstacles) for (const q of t) { if (Math.hypot(pts[i][0] - q[0], pts[i][2] - q[2]) < 5.55 && pts[i][1] < q[1] + 4.7 + 0.9 && pts[i][1] + 4.4 > q[1] - 0.7) req[i] = Math.max(req[i], q[1] + 4.7 + 0.9); }
    const SL = 0.36;
    for (let pass = 0; pass < 2; pass++) { for (let i = 1; i < n; i++) y[i] = Math.max(y[i], Math.max(req[i], y[i - 1] - 1e9, y[i - 1] - SL * (sArr[i] - sArr[i - 1]))); for (let i = n - 2; i >= 0; i--) y[i] = Math.max(y[i], y[i + 1] - SL * (sArr[i + 1] - sArr[i])); }
    return pts.map((p, i) => [p[0], Math.max(p[1], y[i], req[i]), p[2]]);
  };

  // ================================================================ Vladimirskaya (line 1, -55 m) + the real tunnel
  const VL = FRAMES.vladimirskaya, rg = roomGeom('vladimirskaya'), PZ = PYLON.PZ, TRK = PYLON.TRK;
  const S2 = new Space(ctx, VL, { name: 'vladimirskaya' });
  const hall2 = buildPylonHall(ctx, M, S2, { id: 'vlad', FY: VL.y, name: 'Владимирская', hang: [{ z: -40, text: 'Выход в город', sub: 'Way out' }, { z: 40, text: 'Переход на «Достоевская»', sub: 'To Dostoyevskaya' }], endHole: { N: { halfW: 3.3, spring: 0.6 }, S: { halfW: 3.3, spring: 0.6 } },
    skin: { pylon: { plaster: '#f3efe6', marble: '#ece6da', vein: '#b9b0a0', plinth: '#3b3b40', corn: '#f8f4ea' }, track: { plaster: '#f3efe6', marble: '#ece6da', vein: '#b9b0a0', skirt: '#17171d', corn: '#f8f4ea' }, floor: '#4d4b52', sideFloor: '#58565d', letters: '#4a3a28' } });
  const vlStubs = () => { for (const m of hall2.mouths) if (m.zs > 0) buildStub(ctx, M, S2, m.sx * TRK, m.zs * (PZ + 0.6), m.zs, hall2.BED, {}); };   // +z end: black-disc stubs (the real tunnel to Pushkinskaya is outside the strip)
  const vInfo2 = { openings: hall2.openings, FY: VL.y, TRK, EDGE: PYLON.EDGE, PZ, mouth: PZ + 0.6, discNeg: PZ + 0.6 + STUB_VISIBLE, discPos: PZ + 0.6 + STUB_VISIBLE, activeRadius: 260 };
  // the escalator tube (3 lanes, hung on the room), the vestibule room, the bulkhead and the lower corridor to the hall
  const Se = new Space(ctx, rg.eframe, { name: 'vladimirskaya-esc' });
  const esc2 = buildEscalator(ctx, M, Se, { FY: VL.y, zTop: 0, zBottom: rg.run, shellStart: 12 });
  const room = buildRoom(ctx, M, rg);
  bulkhead(Se, esc2, VL.y, rg.run);
  const corrGroup = new THREE.Group(); corrGroup.name = 'vladimirskaya-corridor'; corrGroup.userData.undergroundOnly = true; corrGroup.userData.zone = 'vladimirskaya-corridor'; ctx.addStatic(corrGroup);
  {
    const t1 = [Math.sin(VL.yaw), Math.cos(VL.yaw)], endP = toWorld(VL, 0, -PZ), appr = [endP[0] - t1[0] * 16, endP[1] - t1[1] * 16];
    const start = [rg.bottom.x, rg.bottom.z];
    const pts = smoothPath([start, [start[0] + rg.n[0] * 12, start[1] + rg.n[1] * 12], appr, endP], rg.n, t1, 2.5);
    cor('vladimirskaya-lower', corrGroup, pts.map((p) => [p[0], VL.y, p[1]]), CORR);
  }
  // the real tunnel (two tubes, one per direction) between the stations
  const BEDv = V.y - 1.1, BEDl = VL.y - 1.1;
  const tubeGroup = new THREE.Group(); tubeGroup.name = 'vosstaniya-vladimirskaya-tunnel'; tubeGroup.userData.undergroundOnly = true; tubeGroup.userData.zone = 'tunnel-v-vl'; ctx.addStatic(tubeGroup);
  const makeTube = (a, b) => {                       // a, b: [x, z, tx, tz] mouth point + heading
    const pts = smoothPath([[a[0], a[1]], [a[0] + a[2] * 28, a[1] + a[3] * 28], [b[0] - b[2] * 28, b[1] - b[3] * 28], [b[0], b[1]]], [a[2], a[3]], [b[2], b[3]], 3);
    let L = 0; const cum = [0]; for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
    return pts.map((p, i) => { const f = cum[i] / L; return [p[0], a[4] + (b[4] - a[4]) * f - 2.2 * Math.sin(Math.PI * f), p[1]]; });
  };
  const dV = [Math.sin(V.yaw), Math.cos(V.yaw)], dL = [Math.sin(VL.yaw), Math.cos(VL.yaw)];
  const pathS = makeTube([...toWorld(V, -TRK, PZ + 0.6), dV[0], dV[1], BEDv], [...toWorld(VL, -TRK, -PZ - 0.6), dL[0], dL[1], BEDl]);                    // V -> Vl (right-hand track)
  const pathN = makeTube([...toWorld(VL, TRK, -PZ - 0.6), -dL[0], -dL[1], BEDl], [...toWorld(V, TRK, PZ + 0.6), -dV[0], -dV[1], BEDv]);               // Vl -> V
  for (const p of [pathS, pathN]) { buildLongTunnel(ctx, M, tubeGroup, p, { lamps: 9 }); debug.tubes.push(p); }
  const lenOf = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][2] - p[i - 1][2]); return L; };
  const realLinks = { 'vosstaniya>vladimirskaya': { path: pathS, length: lenOf(pathS) }, 'vladimirskaya>vosstaniya': { path: pathN, length: lenOf(pathN) } };
  // a black disc STUB_VISIBLE m inside the real tube that leaves the mouth (Sp local x, z = the mouth plane, out = away from the hall), facing the hall: ON the tube polyline (debug.tubes) that
  // starts / ends at that mouth (the L1 and Gostiny Dvor - Mayakovskaya tubes curve up to 34 deg right behind the mouth: a disc on the straight axis stood 2-6 m off the tube, poking into it)
  const addDisc = (Sp, x, z, out, bed) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(2.78, 28), M.discBlack), [mx, mz] = Sp.W(x, z);
    let tube = null; for (const p of debug.tubes) for (const q of [p[0], p[p.length - 1]]) if (!tube && Math.hypot(q[0] - mx, q[2] - mz) < 1.5 && Math.abs(q[1] - bed) < 1.5) tube = q === p[0] ? p : p.slice().reverse();
    if (tube) {
      let acc = 0, i = 1; for (; i < tube.length - 1; i++) { const l = Math.hypot(tube[i][0] - tube[i - 1][0], tube[i][2] - tube[i - 1][2]); if (acc + l >= STUB_VISIBLE) break; acc += l; }
      const a = tube[i - 1], b = tube[i], hx = b[0] - a[0], hz = b[2] - a[2], f = Math.min(1, (STUB_VISIBLE - acc) / (Math.hypot(hx, hz) || 1)), [lx, lz] = Sp.L(a[0] + hx * f, a[2] + hz * f);
      d.position.set(lx, a[1] + (b[1] - a[1]) * f + 2.0, lz); d.rotation.y = Math.atan2(-hx, -hz) - Sp.frame.yaw;
    } else { d.position.set(x, bed + 2.0, z + out * STUB_VISIBLE); d.rotation.y = out > 0 ? Math.PI : 0; }
    Sp.group.add(d); registerDisc(ctx, d, { kind: 'real', space: Sp.name, x, out, onTube: !!tube });
  };
  for (const sx of [-1, 1]) { addDisc(S, sx * TRK, vInfo.mouth, 1, hall.BED); addDisc(S2, sx * TRK, -vInfo.mouth, -1, hall2.BED); }

  stations.vladimirskaya = rtOf('vladimirskaya', net.vladimirskaya, VL, vInfo2, null);
  stations.vladimirskaya.platform = createPlatform(ctx, M, { id: 'vladimirskaya', name: net.vladimirskaya.name, nameEn: net.vladimirskaya.nameEn, frame: VL, stock: 'baltiets', line: '1', idx: 10 }, vInfo2, protos, {
    _onArrive: () => toast('Станция «Владимирская». Выход к Владимирскому проспекту'),
  });

  // ================================================================ Dostoevskaya (line 4, -64 m): column hall on the axis of its escalator, vestibule in the Regent Hall, transfer to Vladimirskaya
  const DF = FRAMES.dostoevskaya, dg = roomGeom('dostoevskaya'), DPZ = dg.axial.PZ, dBottom = -(DPZ + dg.axial.lower), dTop = dBottom - dg.run;
  const S4 = new Space(ctx, DF, { name: 'dostoevskaya' });
  const hall4 = buildPylonHall(ctx, M, S4, { id: 'dost', FY: DF.y, name: 'Достоевская', nameEn: 'Dostoyevskaya', PZ: DPZ, zLow: dBottom, column: true, noMeander: true, hang: [{ z: -30, text: 'Выход в город', sub: 'Way out' }, { z: 40, text: 'Переход на «Владимирская»', sub: 'To Vladimirskaya' }], endHole: { S: { halfW: 3.3, spring: 0.6 } },
    skin: { pylon: { plaster: '#8c817a', marble: '#6e5f58', vein: '#a89c94', plinth: '#1b1b1b', corn: '#8c817a' }, track: { plaster: '#cfc7b4', marble: '#a9a08a', vein: '#7d7566', skirt: '#111114', corn: '#d8d0be' }, floor: '#6f6f72', sideFloor: '#6f6f72' } });
  const earlyStubs = [];                                                   // stubs that are built after the west stations and the Gostiny Dvor link (flushed under their keys, see X.deferStub)
  for (const m of hall4.mouths) { const go = () => buildStub(ctx, M, S4, m.sx * TRK, m.zs * (DPZ + 0.6), m.zs, hall4.BED, { visible: m.zs > 0 ? SHORT : STUB_VISIBLE }); if (m.zs > 0) earlyStubs.push(['dostoevskaya:1', go]); else go(); }
  const dInfo = { openings: hall4.openings, FY: DF.y, TRK, EDGE: PYLON.EDGE, PZ: DPZ, mouth: DPZ + 0.6, discNeg: DPZ + 0.6 + STUB_VISIBLE, discPos: DPZ + 0.6 + SHORT, activeRadius: 260 };
  const esc4 = buildEscalator(ctx, M, S4, { FY: DF.y, zTop: dTop, zBottom: dBottom, shellStart: 12 });
  const room4 = buildRoom(ctx, M, dg);
  {
    const grp = mkGroup('dostoevskaya-vladimirskaya-transfer');
    const Wd = (x, z) => toWorld(DF, x, z), Wv = (x, z) => toWorld(VL, x, z), tD = [Math.sin(DF.yaw), Math.cos(DF.yaw)], tEnd = [-Math.sin(VL.yaw), -Math.cos(VL.yaw)];
    const wps = [Wd(0, DPZ), Wv(-40, 145), Wv(-24, 152), Wv(-8, 150), Wv(0, 138)];
    const sm = smoothPath(wps, tD, tEnd, 2.5), poly = [...sm, Wv(0, 118), Wv(0, 108), Wv(0, 100), Wv(0, 92), Wv(0, PZ)];
    debug.radii.dost = minRadius(poly);
    const nearest = (p) => { let k = 0, dm = 1e9; poly.forEach((q, i) => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dm > dd) { dm = dd; k = i; } }); return k; };
    const kc = nearest(Wv(-10, 151)), kd = nearest(Wv(0, 138)), cum = [0]; for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
    const y = (i) => (i <= kc ? DF.y + (-50 - DF.y) * cum[i] / cum[kc] : i <= kd ? -50 : -50 + (VL.y + 50) * (cum[i] - cum[kd]) / (cum[cum.length - 1] - cum[kd]));
    cor('dostoevskaya-vladimirskaya-transfer', grp, poly.map((p, i) => [p[0], y(i), p[1]]), CORR);
  }
  stations.dostoevskaya = rtOf('dostoevskaya', net.dostoevskaya, DF, dInfo, null);
  stations.dostoevskaya.platform = createPlatform(ctx, M, { id: 'dostoevskaya', name: net.dostoevskaya.name, nameEn: net.dostoevskaya.nameEn, frame: DF, stock: '717', line: '4', idx: 2 }, dInfo, protos, {
    _onArrive: () => toast('Станция «Достоевская». Переход на станцию «Владимирская» Кировско-Выборгской линии'),
  });

  // ================================================================ Mayakovskaya (line 3, -51 m): closed-type hall, the Nevsky Atrium vestibule, the transfer passage to Vosstaniya
  const MF = FRAMES.mayakovskaya, mg = roomGeom('mayakovskaya');
  const MD = { EDGE: PYLON.EDGE, TRK: PYLON.TRK, WALL: PYLON.WALL, PZ: 64 };
  const S3 = new Space(ctx, MF, { name: 'mayakovskaya' });
  const hall3 = buildPylonHall(ctx, M, S3, { id: 'mayak', FY: MF.y, name: 'Маяковская', nameEn: 'Mayakovskaya', PZ: MD.PZ, noMeander: true, hang: [{ z: -40, text: 'Выход в город', sub: 'Way out' }, { z: 40, text: 'Переход на «Площадь Восстания»', sub: 'To Vosstaniya' }], endHole: { N: { halfW: 3.3, spring: 0.6 }, S: { halfW: 3.3, spring: 0.6 } },
    skin: { pylon: { plaster: '#ece8e0', marble: '#9aa0a6', vein: '#e6eaee', plinth: '#2a2d30', corn: '#f4f1ea' }, track: { plaster: '#ece8e0', marble: '#b22a1e', vein: '#ffb347', skirt: '#1b1b21', corn: '#f2ecdc' }, floor: '#8a8a86', sideFloor: '#7d7a78', letters: '#7a1812' } });
  for (const m of hall3.mouths) if (m.zs > 0) earlyStubs.push(['mayakovskaya:1', () => buildStub(ctx, M, S3, m.sx * TRK, m.zs * (MD.PZ + 0.6), m.zs, hall3.BED, { visible: SHORT })]);          // the -z end is the real tunnel to Gostiny Dvor (below)
  const mInfo = { openings: hall3.openings, FY: MF.y, TRK: MD.TRK, EDGE: MD.EDGE, PZ: MD.PZ, mouth: MD.PZ + 0.6, discNeg: MD.PZ + 0.6 + STUB_VISIBLE, discPos: MD.PZ + 0.6 + SHORT, activeRadius: 260 };
  const Se3 = new Space(ctx, mg.eframe, { name: 'mayakovskaya-esc' });
  const esc3 = buildEscalator(ctx, M, Se3, { FY: MF.y, zTop: 0, zBottom: mg.run, shellStart: 12 });
  bulkhead(Se3, esc3, MF.y, mg.run);
  const room3 = buildRoom(ctx, M, mg);
  {
    const grp = mkGroup('mayakovskaya-corridor');
    const t1 = [Math.sin(MF.yaw), Math.cos(MF.yaw)], end = toWorld(MF, 0, -MD.PZ), start = [mg.bottom.x, mg.bottom.z];
    const appr = [end[0] - t1[0] * 20, end[1] - t1[1] * 20], pts = bezierPath(start, mg.n, appr, t1, 70, 30, 2.5); for (let q = 17.5; q > 0; q -= 2.5) pts.push([end[0] - t1[0] * q, end[1] - t1[1] * q]); pts.push(end); debug.radii.mayakovskaya = minRadius(pts);
    cor('mayakovskaya-lower', grp, pts.map((p) => [p[0], MF.y, p[1]]), CORR);
    // the Marata exit: a corridor from the paid zone to the east door of the building
    const ex = mg.exit, F = mg.frame, T = (lx, lz) => toWorld(F, lx, lz), c0 = T(mg.halfW + 0.3, ex.z), c1 = T(ex.to[0] - 0.3, ex.to[1]);
    const ep = smoothPath([c0, T(12, ex.z + 2), T(17, ex.to[1] - 1), c1], [Math.sin(Math.PI / 2 - F.yaw) * 0 + Math.cos(F.yaw), -Math.sin(F.yaw)], [Math.cos(F.yaw), -Math.sin(F.yaw)], 2.2);
    cor('mayakovskaya-exit', grp, ep.map((p) => [p[0], 0, p[1]]), { w: 3.6, h: 2.6, rise: 0.8, lamps: true });
  }
  // transfer passage Mayakovskaya (E end) -> Vosstaniya (S end): out and around the west side of the Vosstaniya hall, level -51 until it has crossed the running tunnels, then down to -58
  {
    const grp = mkGroup('transfer-mayakovskaya-vosstaniya');
    const start = toWorld(MF, 0, MD.PZ), Wv = (x, z) => toWorld(V, x, z), tIn = [Math.sin(MF.yaw), Math.cos(MF.yaw)], tZ = [Math.sin(V.yaw), Math.cos(V.yaw)];
    const R1 = 13, right = [-tIn[1], tIn[0]], C = [start[0] + R1 * right[0], start[1] + R1 * right[1]], poly = [];
    for (let k = 0; k <= 8; k++) { const th = k * Math.PI / 16; poly.push([C[0] - R1 * right[0] * Math.cos(th) + R1 * tIn[0] * Math.sin(th), C[1] - R1 * right[1] * Math.cos(th) + R1 * tIn[1] * Math.sin(th)]); }
    const a0 = poly[poly.length - 1], leg = smoothPath([a0, Wv(-21, 40), Wv(-20.5, 80), Wv(-20, 102)], right, tZ, 2.5);
    poly.push(...leg.slice(1));
    for (let k = 1; k <= 12; k++) { const th = Math.PI - k * Math.PI / 24; poly.push(Wv(-10 + 10 * Math.cos(th), 102 + 10 * Math.sin(th))); }
    poly.push(Wv(-6, 112));                                                  // the west wall of the junction hall
    debug.radii.transfer = minRadius(poly);
    let tot = 0; for (let i = 1; i < poly.length; i++) tot += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    cor('transfer-mayakovskaya-vosstaniya', grp, poly.map((p) => [p[0], MF.y, p[1]]), CORR);
    // the junction hall in front of the Vosstaniya south end (Mayakovskaya from the west, Vosstaniya-2 from the east) and the ramp down to the platform level
    buildJunction(ctx, M, S, { x0: -6, x1: 6, z0: 106, z1: 118, y: MF.y, arms: { W: 112, E: 112, N: 0 }, signs: [
      { text: 'К поездам · Площадь Восстания', sub: 'To the trains', key: 'jn-trains', x: 0, z: 106.6, rot: 0 }, { text: 'Переход на «Маяковскую»', sub: 'To Mayakovskaya', key: 'jn-mayak', x: -5.7, z: 112, rot: Math.PI / 2 }, { text: 'Выход к Московскому вокзалу', sub: 'Way out to the station', key: 'jn-v2', x: 5.7, z: 112, rot: -Math.PI / 2 } ] });
    const trunk = []; for (let z = 106; z > PYLON.PZ; z -= 3) trunk.push(Wv(0, z)); trunk.push(Wv(0, PYLON.PZ));
    cor('vosstaniya-ramp', grp, trunk.map((p, i) => [p[0], MF.y + (V.y - MF.y) * i / (trunk.length - 1), p[1]]), CORR);
    // Vosstaniya-2: the escalator from the station wing (see rooms) arrives at the east wall of the same hall
    {
      const g2 = roomGeom('vosstaniya2'), Se5 = new Space(ctx, g2.eframe, { name: 'vosstaniya2-esc' });
      buildEscalator(ctx, M, Se5, { FY: V.y, zTop: 0, zBottom: g2.run, shellStart: 12 });
      bulkhead(Se5, { A: 4.05 }, V.y, g2.run);
      buildRoom(ctx, M, g2);
      const s0 = [g2.bottom.x, g2.bottom.z], endE = Wv(6, 112), tw = [-Math.cos(V.yaw), Math.sin(V.yaw)], appr = [endE[0] - tw[0] * 16, endE[1] - tw[1] * 16];
      const p2 = bezierPath(s0, g2.e, appr, tw, 45, 30, 2.5); for (let q = 12.5; q > 0; q -= 2.5) p2.push([endE[0] - tw[0] * q, endE[1] - tw[1] * q]); p2.push(endE);
      debug.radii.v2 = minRadius(p2); let L2 = 0; for (let i = 1; i < p2.length; i++) L2 += Math.hypot(p2[i][0] - p2[i - 1][0], p2[i][1] - p2[i - 1][1]);
      let acc = 0; cor('vosstaniya2-lower', grp, p2.map((p, i) => { if (i) acc += Math.hypot(p[0] - p2[i - 1][0], p[1] - p2[i - 1][1]); return [p[0], V.y + (MF.y - V.y) * acc / L2, p[1]]; }), CORR);
    }
    debug.transferLen = tot;
  }

  stations.mayakovskaya = rtOf('mayakovskaya', net.mayakovskaya, MF, mInfo, null);
  stations.mayakovskaya.platform = createPlatform(ctx, M, { id: 'mayakovskaya', name: net.mayakovskaya.name, nameEn: net.mayakovskaya.nameEn, frame: MF, stock: 'neva', line: '3', idx: 5 }, mInfo, protos, {
    _onArrive: () => toast('Станция «Маяковская». Переход на станцию «Площадь Восстания» Кировско-Выборгской линии'),
  });

  // ================================================================ the west stations (docs/research/metro-west.md): Admiralteyskaya (line 5), later Nevsky Prospekt (line 2) and Gostiny Dvor (line 3)
  const X = { debug, stations, rtOf, net, protos, toast, mkGroup, cor, CORR, SHORT, mSign: mSignMat, discs, realLinks, autoClear, buildStub, STUB_VISIBLE, addDisc,
    addVestZone: (id, inside, h = 8) => ctx.zones?.add({ id: id + '-vestibule', test: (x, y, z) => y > -1.2 && y < h && inside(x, z), showUnder: true, indoor: LOOK_VEST }) };
  // stub ends that must be built after the real tunnels and the west stations (the discs of the real links are registered first): station builders defer them under 'station:end' (X.deferStub)
  const deferred = {};
  Object.assign(X, { deferStub: (key, fn) => { (deferred[key] ||= []).push(fn); } });
  for (const [key, fn] of earlyStubs) X.deferStub(key, fn);
  const west = {};
  try { west.adm = buildAdmiralteyskaya(ctx, M, X); } catch (e) { console.error('[metro] Admiralteyskaya failed', e); (ctx.errors ||= []).push(e); }
  try { west.nev = buildNevsky(ctx, M, X); } catch (e) { console.error('[metro] Nevsky Prospekt failed', e); (ctx.errors ||= []).push(e); }
  try {
    west.gd = buildGostiny(ctx, M, X);
    Object.assign(realLinks, west.gd.link({ frame: MF, TRK, PZ: MD.PZ, BED: hall3.BED }));
    for (const sx of [-1, 1]) { addDisc(west.gd.S, sx * GDH.TRK, west.gd.rt.hall.mouth, 1, west.gd.hall.BED); addDisc(S3, sx * TRK, -(MD.PZ + 0.6), -1, hall3.BED); }
  } catch (e) { console.error('[metro] Gostiny Dvor failed', e); (ctx.errors ||= []).push(e); }

  // ================================================================ the ends of the hall tunnels that have no real tunnel
  // Vosstaniya N and Vladimirskaya S end in black-disc stubs (the real tunnels to the neighbour stations are not built: a ride leaves through the stub and jumps into the generic tunnel, ride.js);
  // the deferred stubs (Mayakovskaya +z, Dostoevskaya +z) are flushed here
  vStubsN(); vlStubs();
  for (const fns of Object.values(deferred)) for (const f of fns) { try { f(); } catch (e) { console.error('[metro] stub failed', e); } }

  // ================================================================ the generic hall + tunnel
  const GF = GENERIC_FRAME;
  const SG = new Space(ctx, GF, { name: 'generic-hall' });
  const gh = buildGenericHall(ctx, M, SG, { FY: GF.y, line: '1' });
  const gInfo = { FY: GF.y, TRK: GEN.TRK, EDGE: GEN.EDGE, PZ: GEN.PZ, mouth: GEN.PZ + 0.6, discNeg: GEN.PZ + 0.6 + STUB_VISIBLE, discPos: GEN.PZ + 0.6 + STUB_VISIBLE, activeRadius: 260 };
  const gdef = { ...net.pushkinskaya };                   // the generic hall starts as a neighbour terminus of line 1
  stations.generic = rtOf('generic', gdef, GF, gInfo, null, { generic: true, gh });
  stations.generic.platform = createPlatform(ctx, M, { id: 'generic', name: gdef.name, nameEn: gdef.nameEn, frame: GF, stock: 'baltiets', line: '1', idx: 7 }, gInfo, protos, { stocks: ['baltiets', 'neva', '717'] });
  const showGeneric = (def) => {
    const rt = stations.generic; rt.def = def;
    gh.show(def, LINES[def.line].color);
    for (const tk of rt.platform.tracks) rt.platform.setStock(tk, LINES[def.line].stock);
    rt.shownId = def.id;
  };
  showGeneric(gdef);
  // the generic tunnel (straight, periodic: lamps every 9 m, the period is a multiple of it)
  const GT = GENERIC_TUNNEL, gtGroup = new THREE.Group(); gtGroup.name = 'generic-tunnel'; gtGroup.userData.undergroundOnly = true; gtGroup.userData.zone = 'generic-tunnel'; ctx.addStatic(gtGroup);
  { const path = []; for (let i = 0; i <= GT.length / 6; i++) path.push([GT.x0 + i * 6, GT.bed, GT.z0]); buildTunnel(ctx, M, gtGroup, path, { lamps: 9 }); /* full 28-sided lining like the stubs: the jump into it must not change the facets */ }
  const genericTunnel = { x0: GT.x0, z0: GT.z0, y: GT.bed + 1.1, gbase: GT.gbase, ghi: GT.ghi, loop: GT.loop, length: GT.length };

  // ================================================================ rolling stock for the rides, the ride controller
  const sessionTrains = {};
  // the ride trains are built on first use (a lazy cache: only the stocks that were ridden exist)
  const mkSession = (id) => { const tr = makeTrain(ctx, M, protos(id)); tr.root.visible = false; tr.root.userData.undergroundOnly = true; ctx.add(tr.root); try { ctx.zones?.track?.(tr.root, 'under'); } catch (e) { /* headless */ } return tr; };
  let rideCtl = null;
  // ---- black discs during a ride: a leg hides EXACTLY the discs of the rider's own track: the discs its path passes (route.trace: the stub / tube at the end of the origin hall it leaves
  // through, the real link in between, the stub / tube at the end of the destination hall it arrives through; every disc stands on its tube axis, addDisc / stubs.js); every
  // other disc stays. The free-end disc of a partial link (kind free; none is built in the strip) stays drawn while the rider's car approaches (the cars ahead vanish into it) and is hidden the moment the front of
  // the car reaches it (it would be a black wall the rider's car drives through). env.discState: for the tools.
  const discState = { route: null, hide: [], dyn: [] };
  const discLeg = (route) => {
    for (const d of discState.hide) d.visible = true; for (const q of discState.dyn) q.mesh.visible = true;
    discState.route = route || null; discState.hide = []; discState.dyn = [];
    if (!route) return;
    const trace = route.trace ? route.trace(2) : [];                                  // [x, y, z, s]: floor-level path of the train outside the generic tunnel (ride.js)
    for (const d of discs) {
      const u = d.userData.disc; if (!u) continue;
      let near = Infinity, sAt = 0;
      for (const p of trace) { if (Math.abs(p[0] - u.c[0]) > 4 || Math.abs(p[2] - u.c[2]) > 4) continue; const e = Math.hypot(p[0] - u.c[0], p[1] + 0.9 - u.c[1], p[2] - u.c[2]); if (e < near) { near = e; sAt = p[3]; } }
      if (u.kind === 'free') { if (near < 2) discState.dyn.push({ mesh: d, sHide: sAt }); continue; }
      if (near < 1.5) { d.visible = false; discState.hide.push(d); }
    }
  };
  ctx.onUpdate(() => {                                 // the free-end disc: hidden from the moment the front of the rider's car is within 1 m of it
    if (!discState.dyn.length) return;
    const S = rideCtl && rideCtl.session, st = S && S.state; if (!st || S.route !== discState.route) return;
    const front = st.s + carOffset(S.route.stock, S.car) + S.route.stock.len / 2 + 1;
    for (const q of discState.dyn) q.mesh.visible = front < q.sHide;
  });
  const env = {
    stations, real: realLinks, generic: { rt: stations.generic, tunnel: genericTunnel }, net: NET, toast,
    makeSessionTrain: (id) => (sessionTrains[id] ||= mkSession(id)), addSessionTrain: () => {}, removeSessionTrain: (tr) => { tr.root.visible = false; },
    resolve: (picked, tk, o = {}) => {              // the hall that shows a station (a real one or the generic hall) and the track that arrives there; o.show === false: do not re-label the generic hall now
      const real = stations[picked.id] && picked.built ? stations[picked.id] : null, destRt = real || stations.generic;
      if (!real && o.show !== false) showGeneric(picked);
      return { destRt, destTk: destRt.platform.trackByKey(tk.key) };
    },
    showGeneric,
    onAlight: () => {},
    onRideStart: (route) => { for (const e of EXT_GROUPS) e.visible = true; discLeg(route); }, onLegStart: (leg) => discLeg(leg.route),
    onRideEnd: () => { for (const e of EXT_GROUPS) e.visible = false; discLeg(null); for (const d of discs) d.visible = true; }, discState,
  };
  rideCtl = createRide(ctx, M, env);

  // ---- interaction: board at the doors of a standing train, get off when the doors open
  const boardable = (rt, tk) => { const s = rt.platform.state(tk, ctx.time); return !tk.override && s.phase === 'dwell' && s.open > 0.9; };
  for (const rt of Object.values(stations)) {
    for (const tk of rt.platform.tracks) {
      ctx.interact?.add({
        id: `board-${rt.id}-${tk.key}`, label: 'Войти в вагон', labelEn: 'Board the train', radius: 3.6,
        at: () => { const [, lz] = rt.L(cam.x, cam.z), half = tk.half, zz = clamp(lz, -half + 3, half - 3), [wx, wz] = rt.W(-tk.dir * (rt.hall.EDGE - 0.25), zz); return { x: wx, y: (tk.fy ?? rt.hall.FY) + 1.0, z: wz }; },
        enabled: () => !player().riding && !rideCtl.session && boardable(rt, tk),
        onUse: () => rideCtl.board(rt, tk),
      });
    }
  }
  ctx.interact?.add({ id: 'metro-alight', label: 'Выйти на платформу', labelEn: 'Get off', radius: 12, at: () => ({ x: cam.x, y: cam.y, z: cam.z }),
    enabled: () => !!(player().riding && rideCtl.session && rideCtl.session.state && ['open', 'boarding', 'closing'].includes(rideCtl.session.state.phase)), onUse: () => rideCtl.alight() });   // get off at any stop, or before the doors close

  // ---- walking into an open door boards the train (nothing to fall through: the rider is attached to the car frame); falling onto the track bed is rescued
  const prev = { x: 0, z: 0, t: 0 };
  ctx.onUpdate((dt, t) => {
    const pl = player(); if (!pl || pl.riding || rideCtl.session || dt <= 0) { prev.x = cam.x; prev.z = cam.z; return; }
    if (Math.hypot(cam.x - prev.x, cam.z - prev.z) > 2.5) { prev.x = cam.x; prev.z = cam.z; return; }                  // a teleport (respawn, a test): the jump is not a walking speed (it boarded a standing train from a distance)
    const vx = (cam.x - prev.x) / dt, vz = (cam.z - prev.z) / dt; prev.x = cam.x; prev.z = cam.z;
    for (const rt of Object.values(stations)) {
      const H = rt.hall, fy = pl.pos.y;
      if (Math.hypot(cam.x - rt.frame.x, cam.z - rt.frame.z) > 100) continue;
      const [lx, lz] = rt.L(cam.x, cam.z);
      for (const tk of rt.platform.tracks) {
        const FYt = tk.fy ?? H.FY; if (Math.abs(fy - FYt) > 3) continue;                       // the level of this track (two-level stations: one track per level)
        const s = rt.platform.state(tk, t), st = STOCK[tk.stock];
        // rescue: on the track bed (below the platform) while this track's train is moving through the hall
        if (fy < FYt - 0.6 && Math.abs(lx - tk.xl) < 2.4 && Math.abs(lz) < H.PZ + 1 && s.visible && s.phase !== 'dwell') {
          const zc = s.zc; if (Math.abs(lz - zc) < tk.half + 18) { const [wx, wz] = rt.W(-tk.dir * (H.EDGE - 1.0), clamp(lz, -H.PZ + 4, H.PZ - 4)); pl.setPose(wx, wz, pl.yaw * 180 / Math.PI, 0, FYt, { stand: true }); ctx.ui?.toast('Вернитесь на платформу, приближается поезд'); return; }
        }
        // auto-board: the train stands with open doors, the player is at an open door and moves toward the train
        if (tk.override || s.phase !== 'dwell' || s.open < 0.5 || (tk.noBoardUntil || 0) > t || fy < FYt - 1.4) continue;   /* a player who dropped onto the bed inside a standing car is boarded too */
        const sgn = tk.dir > 0 ? 1 : -1, xt = (lx - tk.xl) * sgn, vt = (vx * Math.cos(rt.frame.yaw) - vz * Math.sin(rt.frame.yaw)) * sgn;
        if (xt > 2.6 || xt < 0.2) continue;
        let i0 = 0, bd = 1e9; for (let i = 0; i < st.cars; i++) { const d = Math.abs(lz - tk.dir * carOffset(st, i)); if (d < bd) { bd = d; i0 = i; } }
        const zc = tk.dir * lz - carOffset(st, i0);
        if (xt >= 1.95 && ![-6.6, -2.2, 2.2, 6.6].some((d) => Math.abs(zc - d) < 0.95)) continue;   /* inside the body any spot boards; at the threshold only a door */
        if (xt < 1.95 || (xt < 2.6 && -vt > 0.35)) { if (rideCtl.autoBoard(rt, tk)) return; }
      }
    }
  });

  // ---- door prompts: [E] at an entrance steps inside (a helper for the player who stands in front of the door and does not see where to go)
  for (const d of DOORWAYS.filter((q) => q.kind === 'entrance')) {
    const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY);
    ctx.interact?.add({ id: 'enter-' + d.id, label: 'Вход в метро', labelEn: 'Enter the metro', radius: 7, at: () => ({ x: d.x + nx * 1.5, y: (d.y || 0) + 1.5, z: d.z + nz * 1.5 }),
      enabled: () => !player().riding && cam.y > -2 && (cam.x - d.x) * nx + (cam.z - d.z) * nz > 0.3,
      onUse: () => player().setPose(d.x - nx * 4, d.z - nz * 4, Math.atan2(nx, nz) * 180 / Math.PI, 0) });
  }

  // ---- zones: everything below the street shares one look, the rotunda interior its own (added later = wins)
  ctx.zones?.add({ id: 'metro-under', test: (x, y, z) => y < -1.2, showUnder: true, underground: true, indoor: LOOK_UNDER });
  // the running tunnel (added later: wins over 'metro-under'): a dim lit tube while the rider's car is more than 30 m past the origin mouth and 30 m before the destination mouth of the running
  // leg (the hall look stays at the platforms; the zone parameters glide in ~0.3 s)
  const LOOK_TUNNEL = { name: 'metro-tunnel', sun: 0, sky: false, shadows: false, far: 220, ambient: { color: '#d9d2c4', ground: '#3a362f', intensity: 0.55 }, fog: { color: '#15130f', density: 0.012 }, key: { color: '#fff0da', intensity: 0.6, dir: [0.35, 0.8, 0.5] }, bloom: LOOK_UNDER.bloom, vignette: LOOK_UNDER.vignette };
  ctx.zones?.add({ id: 'metro-tunnel', showUnder: true, underground: true, indoor: LOOK_TUNNEL, test: (x, y) => {
    const S = rideCtl.session, st = S && S.state, R = S && S.route; if (y > -1.2 || !st || !R || st.phase !== 'running' || !(player() && player().riding)) return false;
    const sr = st.s + carOffset(R.stock, S.car); return sr > R.from.hall.mouth + 30 && sr < R.S_end - R.destRt.hall.mouth - 30;
  } });
  const op = outline.polys[0].o;
  const roomZone = (g, rm) => { const rw = g.halfW + 0.5, rd = rm.D; ctx.zones?.add({ id: g.id + '-vestibule', test: (x, y, z) => { if (y < -1.2 || y > 8) return false; const dx = x - g.door[0], dz = z - g.door[1], lx = dx * Math.cos(g.yaw) - dz * Math.sin(g.yaw), lz = dx * Math.sin(g.yaw) + dz * Math.cos(g.yaw); return Math.abs(lx) < rw + (g.exit ? 16 : 0) && lx > -rw && lz > 0 && lz < rd + (g.exit ? 6 : 0); }, showUnder: true, indoor: LOOK_VEST }); };
  roomZone(rg, room); roomZone(mg, room3); roomZone(dg, room4); roomZone(roomGeom('vosstaniya2'), { D: roomGeom('vosstaniya2').headZ + 3 });
  ctx.zones?.add({ id: 'vosstaniya-vestibule', test: (x, y, z) => y > -1.2 && y < 12 && inPoly(op, x, z), showUnder: true, indoor: LOOK_VEST });

  for (const c of pendingCor) { const pts = c.o && c.o.noLift ? c.pts : autoClear(c.pts, [...debug.tubes, ...STUB_PATHS]); debug.corridors.push({ name: c.name, pts }); buildCorridor(ctx, M, c.grp, pts, c.o); }

  let gdRoutes = null;
  // ---- exit routes (used by tests/metro-test.mjs: walk from the platform up the UP lane to the pavement): world waypoints [x, z]
  {
    const rev = (name) => debug.corridors.find((c) => c.name === name).pts.slice().reverse().filter((_, i, a) => i % 4 === 0 || i === a.length - 1).map((p) => [p[0], p[2]]);
    const roomRoute = (g, Efr, pre, platformSpot) => {
      const R = (x, z) => toWorld(g.frame, x, z), outPt = [g.door[0] - g.n[0] * 3.5, g.door[1] - g.n[1] * 3.5];
      const post = g.back ? [R(6, g.headZ + 1.5), R(6, g.ticket + 1.4), R(0.55, g.ticket + 1.4), R(0.55, g.ticket - 2.5), R(0.55, 1.5), outPt] : [R(5.7, g.headZ - 2.5), R(0.55, g.ticket + 2), R(0.55, g.ticket - 2.5), R(0.55, 1.5), outPt];
      return { start: platformSpot, points: [...pre, ...post], door: g.door, out: outPt, outward: [-g.n[0], -g.n[1]] };
    };
    const viaCorridor = (g, name) => [...rev(name), [...toWorld(g.eframe, 2, g.run + 4), 0.25], [...toWorld(g.eframe, 2, g.run - 3), 0.3], toWorld(g.eframe, 2, -1.5)];
    const FYspot = (rt, lx, lz) => [...rt.W(lx, lz), rt.hall.FY];
    debug.exits = {
      vosstaniya: { start: FYspot(stations.vosstaniya, 0, -40), points: [[...toWorld(V, 2, -90), 0.25], [...toWorld(V, 2, -98), 0.3], toWorld(V, 2, g.zTop - 1.5), toWorld(V, -6, g.zTop - 1.5), toWorld(V, -6, g.zTop + 2.6), toWorld(V, -12, g.zTop + 2.6), [496.6 - 3.5, 92.7]], door: [496.6, 92.7], out: [493.1, 92.7], outward: [-1, 0] },
      vosstaniya2: roomRoute(roomGeom('vosstaniya2'), null, viaCorridor(roomGeom('vosstaniya2'), 'vosstaniya2-lower'), FYspot(stations.vosstaniya, 0, 60)),
      vladimirskaya: roomRoute(rg, null, viaCorridor(rg, 'vladimirskaya-lower'), FYspot(stations.vladimirskaya, 0, -40)),
      mayakovskaya: roomRoute(mg, null, viaCorridor(mg, 'mayakovskaya-lower'), FYspot(stations.mayakovskaya, 0, -30)),
      dostoevskaya: roomRoute(dg, null, [toWorld(DF, 2, -50), [...toWorld(DF, 2, dBottom + 4), 0.25], [...toWorld(DF, 2, dBottom - 3), 0.3], toWorld(DF, 2, dTop - 1.5)], FYspot(stations.dostoevskaya, 0, -30)),
    };
    if (west.adm) debug.exits.admiralteyskaya = west.adm.exitRoute(debug);
    if (west.nev) Object.assign(debug.exits, west.nev.routes(debug));
    if (west.gd && west.nev) { gdRoutes = west.gd.routes(debug, west.nev); Object.assign(debug.exits, gdRoutes.exits); }
    debug.entries = {};
  }

  // ---- transfer walks (tests): platform -> platform through the passages
  {
    const cp = (name, step = 4) => debug.corridors.find((c) => c.name === name).pts.filter((_, i, a) => i % step === 0 || i === a.length - 1).map((p) => [p[0], p[2]]);
    const FYs = (rt, lx, lz) => [...rt.W(lx, lz), rt.hall.FY];
    debug.walks = {
      'dostoevskaya->vladimirskaya': { start: FYs(stations.dostoevskaya, 0, 40), points: [toWorld(DF, 0, DPZ - 4), ...cp('dostoevskaya-vladimirskaya-transfer'), toWorld(VL, 0, PZ - 6), toWorld(VL, 0, 60)], end: { station: 'vladimirskaya', y: VL.y } },
      'mayakovskaya->vosstaniya': { start: FYs(stations.mayakovskaya, 0, 40), points: [toWorld(MF, 0, MD.PZ - 4), ...cp('transfer-mayakovskaya-vosstaniya'), toWorld(V, 0, 112), ...cp('vosstaniya-ramp', 2), toWorld(V, 0, PYLON.PZ - 6), toWorld(V, 0, 60)], end: { station: 'vosstaniya', y: V.y } },
      'vosstaniya->mayakovskaya': { start: FYs(stations.vosstaniya, 0, 60), points: [toWorld(V, 0, PYLON.PZ - 4), ...cp('vosstaniya-ramp', 2).reverse(), toWorld(V, 0, 112), ...cp('transfer-mayakovskaya-vosstaniya').reverse(), toWorld(MF, 0, MD.PZ - 6), toWorld(MF, 0, 40)], end: { station: 'mayakovskaya', y: MF.y } },
      'vladimirskaya->dostoevskaya': { start: FYs(stations.vladimirskaya, 0, 60), points: [toWorld(VL, 0, PZ - 4), ...cp('dostoevskaya-vladimirskaya-transfer').reverse(), toWorld(DF, 0, DPZ - 6), toWorld(DF, 0, 40)], end: { station: 'dostoevskaya', y: DF.y } },
    };
  }

  if (gdRoutes) Object.assign(debug.walks, gdRoutes.walks);

  // ---- surface signs: a plain blue "М" totem (white rounded box, blue letter) in front of every vestibule that has no pylon of its own
  // (the totem texture mSign is built at the top)
  const signs = new THREE.Group(); signs.name = 'metro-signs'; ctx.addStatic(signs); const ks = ctx.kit(signs);
  const totemSeen = new Set();
  for (const d of DOORWAYS.filter((q) => q.station !== 'vosstaniya' && q.station !== 'gostiny' && q.station !== 'admiralteyskaya' && q.station !== 'nevsky' && !q.noTotem && !totemSeen.has(q.station) && totemSeen.add(q.station))) {
    const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), jx = -nz, jz = nx; let px = null, pz = null;
    for (const [o, l] of [[3.5, 3.2], [3.5, -3.2], [2.4, 3.9], [2.4, -3.9], [4.8, 3.2], [4.8, -3.2]]) { const x = d.x + nx * o + jx * l, z = d.z + nz * o + jz * l; if (!(ctx.L.isOnRoad && ctx.L.isOnRoad(x, z, 0.6)) && !(ctx.L.insideBuilding && ctx.L.insideBuilding(x, z, 0.5))) { px = x; pz = z; break; } }          // road integrity: never a pole on a carriageway
    if (px === null) continue;
    ks.cyl(0.07, 0.07, 2.6, M.steelBlack, [px, 1.3, pz], null, 8); ks.box(0.5, 1.0, 0.12, M.blue, [px, 3.1, pz], [0, d.rotY, 0]);
    for (const f of [1, -1]) { const p = ks.plane(0.46, 0.92, M.board(mSign, 0.9), [px + nx * 0.07 * f, 3.1, pz + nz * 0.07 * f], [0, d.rotY + (f > 0 ? 0 : Math.PI), 0]); p.castShadow = false; }
  }

  // ---- services
  const entrances = DOORWAYS.map((d) => ({ id: d.id, x: d.x, z: d.z, rotY: d.rotY, station: d.station, kind: d.kind }));
  for (const p of PITS) entrances.push({ id: p.id, x: p.mouth[0], z: p.mouth[1], rotY: Math.atan2(-p.e[0], -p.e[1]), station: 'nevsky', kind: 'pit' });
  ctx.services.metro = {
    stations: Object.values(stations).map((r) => ({ id: r.id, name: r.def.name, line: r.def.line, frame: r.frame })), entrances, network: NET,
    ride: (from, to) => { const rt = stations[from]; return rt ? { from, to, seconds: NET.gameRideSeconds(rt.def.line, rt.def.idx, NET.BY_ID[to].idx) } : null; },
  };
  ctx.metro = { debug, M, S, hall, esc, rot, vest, stations, ride: rideCtl, protos, showGeneric, sessionTrains, genericTunnel, env, GENERIC_FRAME, west, discs };
  return M;
}
