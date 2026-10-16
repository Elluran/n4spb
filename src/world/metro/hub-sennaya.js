// metro/hub-sennaya.js — the Sennaya interchange (docs/research/metro-south-sennaya.md, data block "SENNAYA HUB" of data/metro.js): Sennaya Ploshchad (line 2), Sadovaya (line 5) and Spasskaya
// (line 4), the three passages between them and the real tunnels to the built neighbours (links-south.js).
//   buildSennayaHub(ctx, M, X) -> { sennaya, sadovaya, spasskaya, links: { links, done }, walks(debug), errors }
//   passages (all walkable both ways, colliders, floors; corridors through X.cor, so they are lifted over a running tunnel they would cross: X.autoClear)
//     Sennaya <-> Sadovaya    the sunk stairwell in the middle of the Sennaya central hall (5.5 m down), a 75 m passage west under the west track, the upper hall and the 4-lane bank (10.5 m)
//                             down into the south end of Sadovaya
//     Sennaya <-> Spasskaya   the arched opening in the south end wall of Sennaya, a stair of 6.5 m up over the running tunnels, a 70 m passage west (the "1703 / 1914 / 1924 / 1991" wall), the upper
//                             hall and the 4-lane bank (11.5 m) down into the south-east end of Spasskaya
//     Sadovaya <-> Spasskaya  the sunk stairwell in the middle of Sadovaya (5.2 m down), the lower hall west under the west track, the 4-lane bank (20.8 m) up, a 70 m passage west-south-west to the
//                             relief hall of Spasskaya (ochre stone, medallion panels, lanterns, the red double door) over the running tunnel behind the north-west end wall, the stair down into the hall
//   The kit (K) handed to the station builders: cutFloor (an opening in the platform of a pylon hall), flight, well, bank, bulkhead, steps on a sloped passage, signs, materials.
import * as THREE from 'three';
import { FRAMES, ESC2, SN_PZ, SD_PZ, SS_PZ, SN_SAD_Y, SN_SPA_Y, SD_LOW_Y, SS_REL_Y, toWorld } from '../data/metro.js';
import { Space, extrudeZ, extrudeX, archHole, floorGeo, smoothPath, minRadius } from './lib.js';
import { buildEscalator } from './escalator.js';
import { buildPolyRoom } from './proom.js';
import { shaftParapet, panelTex } from './petro-kit.js';
import { stripFloor } from './vo-kit.js';
import { sharedFloor } from './hall-vault.js';
import { makeSigns } from './signs.js';
import { MeshBuilder, addCap } from '../lib/massing.js';
import { buildSennaya, SN_WELL } from './st-sennaya.js';
import { buildSadovaya, SD_WELL } from './st-sadovaya.js';
import { buildSpasskaya, SS_REL } from './st-spasskaya.js';
import { buildSouthLinks } from './links-south.js';

const FONT = '"Rubik","Noto Sans",sans-serif';

// ================================================================================================================================ the kit
export function makeHubKit(ctx, M, X) {
  const { mat, tex, physics } = ctx, K = {};
  K.sg = makeSigns(ctx, M);
  // ---- materials shared by the passages of the hub (dossier section 6: cream wall panels, granite floors, a lamp strip on the crown)
  K.passWallTex = panelTex(ctx, M, 'hub-pass-wall', { base: '#efe9dc', w: 1.2, h: 0.8, cols: 2, rows: 3, veins: 8, joint: 'rgba(110,95,70,0.32)' });     // one light panel canvas, tinted per use (no new pixels)
  K.wall = (tint) => mat.toon(tint, { map: K.passWallTex, side: 'double' });
  K.passWall = K.wall('#f3e8c8');
  K.passFloor = sharedFloor(ctx, M, '#c9c5bf');
  K.darkFloor = sharedFloor(ctx, M, '#8d8f96');
  K.passVault = mat.toon('#efe9d8', { side: 'double' });
  K.ceil = mat.toon('#f0ede4', { side: 'double' });
  K.granite = mat.toon('#5a5b60'); K.graniteDark = mat.toon('#3d3e43'); K.stepMat = mat.toon('#8f8a84'); K.parapet = mat.toon('#6a6a6e');
  K.PASS = { w: 6.0, h: 2.7, rise: 1.4, wallMat: K.passWall, floorMat: K.passFloor, vaultMat: K.passVault };
  // ---- signs: every hanging board of the hub is 0.5 m high (pixels ~ height squared) and the boards that say the same thing share one canvas (the same sections, no sideways arrow: no back canvas)
  K.hang = (target, o) => K.sg.hangBoard(target, { w: 0.5, ...o });
  const sec = K.sg.sec;
  K.SEC = {
    toSennaya: () => sec.transfer({ to: 'sennaya', line: '2', esc: true }, 'u'), toSadovaya: () => sec.transfer({ to: 'sadovaya', line: '5', esc: true }, 'u'), toSpasskaya: () => sec.transfer({ to: 'spasskaya', line: '4', esc: true }, 'u'),
    spasNW: () => [sec.exit({ streets: [['Сенная площадь', 'Sennaya ploshchad'], ['Московский проспект', 'Moskovsky prospekt']] }, 'u', true), sec.transfer({ to: 'sadovaya', line: '5' }, 'u')],
    sadTrains: () => [sec.trains('5', 1, null, ['Садовая', 'Sadovaya']), sec.transfer({ to: 'sennaya', line: '2', plain: true }, null), sec.transfer({ to: 'spasskaya', line: '4', plain: true }, null)],
  };
  /** station names in spaced capitals on a small canvas (512 x 64) for the track walls / friezes */
  K.letters = (key, text, fill) => mat.decal('#ffffff', { map: tex.draw(512, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = fill; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, [...text.toUpperCase()].join(String.fromCharCode(8202, 8202)), w / 2, h / 2 + 2, w - 12, 46, '"Noto Serif","Times New Roman",serif', 600); }, { key }) });
  /** the station name over the doors of a pavilion (512 x 96): white on the line colour */
  K.nameBoard = (key, name, nameEn, color) => M.board(tex.draw(512, 96, (g, w, h) => { g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, h - 6, w, 6); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; tex.fitText(g, name, w / 2, h * 0.38, w - 40, 40, FONT, 700); g.globalAlpha = 0.9; tex.fitText(g, nameEn, w / 2, h * 0.77, w - 40, 22, FONT, 500); g.globalAlpha = 1; }, { key }), 1.0);

  /**
   * An opening in the platform of a hall built by hall-pylon.js (it has one walk box and one floor quad over the whole platform): the walk box is replaced by strips round the holes and the
   * floor quad by a cap with the holes. o: { FY, x0, x1, z0, z1 (the platform slab), mat (the floor material handed to the hall builder), holes: [[x0, x1, z0, z1]] } (hall frame of S)
   */
  K.cutFloor = (S, o) => {
    const it = S.items.find((q) => q.type === 'walk' && Math.abs(q.top - o.FY) < 1e-6 && Math.abs(q.hw * 2 - (o.x1 - o.x0)) < 0.05 && Math.abs(q.hd * 2 - (o.z1 - o.z0)) < 0.05);
    if (it) { physics.remove(it); S.items.splice(S.items.indexOf(it), 1); }
    stripFloor(S, [[o.x0, o.z0], [o.x1, o.z0], [o.x1, o.z1], [o.x0, o.z1]], o.holes, o.FY, 1.1, { margin: 0.02 });
    const fm = S.group.children.find((c) => c.isMesh && c.material === o.mat && c.geometry.attributes.position && c.geometry.attributes.position.count === 4 && Math.abs(c.geometry.attributes.position.getY(0) - o.FY) < 1e-4);
    if (fm) {
      const b = new MeshBuilder();
      addCap(b, { o: [o.x0, o.z0, o.x1, o.z0, o.x1, o.z1, o.x0, o.z1], h: o.holes.map(([a, c, d, e]) => [a, d, c, d, c, e, a, e]) }, o.FY, { uvScale: 2 });         // uv = metres / 2 (floorGeo 0.5)
      fm.geometry.dispose(); fm.geometry = b.build();
    }
    if (!it || !fm) console.warn('[metro] Sennaya hub: the platform of ' + S.name + ' was not opened (walk ' + !!it + ', floor ' + !!fm + ')');
    return { walk: !!it, floor: !!fm };
  };

  /** a straight flight of steps along local z of S: yA at zA, yB at zB (either way); the visible steps are the physics boxes (physics.addStairs); a yellow nosing on the top step */
  K.flight = (S, o) => {
    const zLo = Math.min(o.zA, o.zB), zHi = Math.max(o.zA, o.zB), yLo = o.zA < o.zB ? o.yA : o.yB, yHi = o.zA < o.zB ? o.yB : o.yA, d = zHi - zLo, n = Math.max(2, Math.round(Math.abs(yHi - yLo) / 0.165));
    const [cx, cz] = S.W((o.x0 + o.x1) / 2, (zLo + zHi) / 2);
    const items = physics.addStairs(cx, cz, o.x1 - o.x0, d, S.frame.yaw, yLo, yHi, n);
    for (const it of items) it.y0 = it.top - 1.2;                                                      // a slab, not a column down to -300 (a hall or a passage may lie below)
    const top = (i) => yLo + (yHi - yLo) * (i + 1) / n, base = Math.min(yLo, yHi) - 0.35, prof = [[zLo, base], [zLo, top(0)]];
    for (let i = 0; i < n; i++) { const za = zLo + d * i / n, zb = zLo + d * (i + 1) / n; if (i > 0) prof.push([za, top(i)]); prof.push([zb, top(i)]); }
    prof.push([zHi, base]);
    S.group.add(new THREE.Mesh(extrudeX(prof, o.x0, o.x1), o.mat || K.stepMat));
    const iTop = yHi > yLo ? n - 1 : 0, zt = yHi > yLo ? zHi - d / n / 2 : zLo + d / n / 2;            // the highest tread
    S.bx(o.x0, o.x1, Math.max(yLo, yHi) + 0.002, Math.max(yLo, yHi) + 0.012, zt - 0.12, zt + 0.12, M.yellow); void iTop;
    return items;
  };

  /**
   * A sunk stairwell in a hall floor (frame of S; the platform opening is the caller's): the flight from (z1, FY) down along -z to (zFoot, yLow), a landing from zFoot to z0, granite walls,
   * parapets with brass rails on three sides (the top end z1 is the way in), an opening in the side wall at the landing: open = { side: +1 | -1 (x1 | x0), zc, w, h }
   */
  K.well = (S, o) => {
    const { x0, x1, z0, z1, zFoot, FY, yLow } = o, k = S.k, T = 0.3, stone = o.stone || K.granite, pm = o.parapetMat || K.graniteDark, ph = 1.0;
    K.flight(S, { x0: x0 + 0.04, x1: x1 - 0.04, zA: zFoot, zB: z1, yA: yLow, yB: FY, mat: o.stepMat || K.stepMat });
    S.group.add(new THREE.Mesh(floorGeo(x0, x1, z0, zFoot + 0.02, yLow, 0.5), o.floorMat || K.passFloor)); S.walk(x0, x1, z0 - 0.05, zFoot + 0.3, yLow, 1.0);
    const yb = yLow - 0.35, yt = FY - 0.03;
    for (const sx of [-1, 1]) {
      const xa = sx < 0 ? x0 - T : x1, xb = sx < 0 ? x0 : x1 + T, op = o.open && o.open.side === sx ? o.open : null;
      const pieces = op ? [[z0 - T, op.zc - op.w / 2, yb, yt], [op.zc + op.w / 2, z1, yb, yt], [op.zc - op.w / 2, op.zc + op.w / 2, yLow + op.h, yt]] : [[z0 - T, z1, yb, yt]];
      for (const [za, zb, ya, yc] of pieces) { if (zb - za < 0.02 || yc - ya < 0.02) continue; S.bx(xa, xb, ya, yc, za, zb, stone); S.col(xa, xb, ya - 0.6, yc, za, zb); }
      S.bx(xa, xb, FY - 0.02, FY + ph, z0 - T, z1, pm); S.col(xa, xb, FY - 0.3, FY + ph + 0.1, z0 - T, z1);
      k.cyl(0.03, 0.03, z1 - z0 + T, M.brass, [(xa + xb) / 2, FY + ph + 0.06, (z0 - T + z1) / 2], [Math.PI / 2, 0, 0], 6);
    }
    S.bx(x0 - T, x1 + T, yb, yt, z0 - T, z0, stone); S.col(x0 - T, x1 + T, yb - 0.6, yt, z0 - T, z0);
    S.bx(x0 - T, x1 + T, FY - 0.02, FY + ph, z0 - T, z0, pm); S.col(x0 - T, x1 + T, FY - 0.3, FY + ph + 0.1, z0 - T, z0);
    k.cyl(0.03, 0.03, x1 - x0 + 2 * T, M.brass, [(x0 + x1) / 2, FY + ph + 0.06, z0 - T / 2], [0, 0, Math.PI / 2], 6);
    // small lamps on the parapet posts at the corners, a lamp strip under the parapet over the landing
    for (const [x, z] of [[x0 - T / 2, z1], [x1 + T / 2, z1], [x0 - T / 2, z0 - T / 2], [x1 + T / 2, z0 - T / 2]]) { k.box(0.34, 0.12, 0.34, pm, [x, FY + ph + 0.06, z]); const l = k.sphere(0.15, M.lampWarm, [x, FY + ph + 0.27, z], 8); l.castShadow = false; }
    S.bx(x0 + 0.1, x1 - 0.1, FY - 0.32, FY - 0.24, z0 + 0.05, z0 + 0.2, M.lampWarm);
  };

  /** runs fn() and turns every stair it adds through physics.addStairs into slabs (the street stairs of petro-kit stairPit are solid columns down to -300 m: one stands over the Spasskaya hall) */
  K.slabbed = (fn) => { const orig = physics.addStairs, got = []; physics.addStairs = (...a) => { const r = orig.apply(physics, a); got.push(...r); return r; }; try { return fn(); } finally { physics.addStairs = orig; for (const it of got) it.y0 = it.top - 1.2; } };

  /** the plate that closes the lower end of an escalator tube in front of a passage (escalator frame): the tube profile with an arched opening of half width halfW */
  K.bulkhead = (Se, A, yLane, run, halfW = 3.1) => {
    const prof = [[-A, yLane - 1.4], [-A, yLane + 1.0]]; for (let i = 1; i < 36; i++) { const t = Math.PI - i * Math.PI / 36; prof.push([A * Math.cos(t), yLane + 1.0 + 4.9 * Math.sin(t)]); } prof.push([A, yLane + 1.0], [A, yLane - 1.4]);
    const m = new THREE.Mesh(extrudeZ(prof, run - 0.5, run, [archHole(0, halfW, yLane, yLane + 0.7, 12)]), M.plasterWarm); m.receiveShadow = true; Se.group.add(m);
  };

  /**
   * A bank of four escalators between two underground levels and the upper hall round its head (the escalator frame Se: head = origin, +z = the descent). The lower end is the caller's (a lower
   * hall of a station or K.bulkhead + a passage). o: { name, doors: [{ x, z, w }] (escalator frame, ON the inner wall line), side (half width 7.5), back (13: the hall reaches z = -back), sign }
   */
  K.bank = (E, o) => {
    const Se = new Space(ctx, E.eframe, { name: o.name + '-bank' }), k = Se.k;
    const esc = buildEscalator(ctx, M, Se, { FY: E.FY, yTop: E.yTop, zTop: 0, zBottom: E.run, mouth: false, trench: true, shellStart: 11, lanes: E.lanes, halfW: E.A });
    const fy = E.yTop + 0.05, CH = E.yTop + 4.1, HW = o.side ?? 7.5, Z0 = -(o.back ?? 13), Z1 = 12.6;
    const polyL = [[-HW, Z0], [HW, Z0], [HW, Z1], [-HW, Z1]], poly = polyL.map(([x, z]) => Se.W(x, z));
    const hole = [[-E.A, 0], [E.A, 0], [E.A, 11.4], [-E.A, 11.4]].map(([x, z]) => Se.W(x, z));
    const doors = o.doors.map((d) => { const [x, z] = Se.W(d.x, d.z); return { x, z, w: d.w ?? 4.4, h: 3.0, arch: true }; });
    const room = buildPolyRoom(ctx, M, { id: o.name + '-hall', poly, y0: fy, ceil: CH, under: true, holes: [hole], doors, wallMat: o.wallMat || K.passWall, ceilMat: K.ceil, colY: [E.yTop - 1.5, E.yTop + 4.6], lamps: false, floorMat: o.floorMat || K.passFloor });
    stripFloor(Se, polyL, [[-E.A - 0.3, E.A + 0.3, 0.3, 11.7]], fy, 1.1);
    for (const d of o.doors) { const w = (d.w ?? 4.4) / 2 + 0.2; if (Math.abs(Math.abs(d.x) - HW) < 0.2) Se.walk(d.x - 0.9, d.x + 0.9, d.z - w, d.z + w, fy, 1.1); else Se.walk(d.x - w, d.x + w, d.z - 0.9, d.z + 0.9, fy, 1.1); }
    shaftParapet(Se, M, { A: E.A, len: 11.4, y: fy, mat: K.parapet });
    for (let z = Z0 + 2.5; z < Z1 - 1; z += 4) for (const x of [-5, 0, 5]) { if (z > -0.6 && z < 12 && Math.abs(x) < E.A + 0.5) continue; const m = k.box(1.5, 0.07, 0.55, M.lampWhite, [x, CH - 0.05, z]); m.castShadow = false; }
    for (const sx of [-1, 1]) for (const z of [1.5, 6, 10.5]) { const x = sx * (E.A + 0.45); k.cyl(0.05, 0.05, 0.9, M.brass, [x, fy + 1.45, z], null, 6); const l = k.sphere(0.17, M.lampWarm, [x, fy + 1.98, z], 10); l.castShadow = false; }
    if (o.sign) K.hang(Se, { x: 0, y: CH - 0.75, z: -1.0, rotY: Math.PI, rodLen: 0.42, sections: o.sign });
    return { Se, esc, room, fy, CH, HW, Z0, Z1, W: (x, z) => Se.W(x, z) };
  };

  /** visible steps on the sloped (ramp) part of a passage that runs along local z of S: the inner corners of the steps lie on the ramp line (the walker stays on the ramp of the corridor) */
  K.rampSteps = (S, o) => {
    const { x0, x1 } = o, lo = o.yA < o.yB ? { z: o.zA, y: o.yA } : { z: o.zB, y: o.yB }, hi = o.yA < o.yB ? { z: o.zB, y: o.yB } : { z: o.zA, y: o.yA };
    const n = Math.max(2, Math.round((hi.y - lo.y) / 0.165)), zAt = (t) => lo.z + (hi.z - lo.z) * t, yAt = (t) => lo.y + (hi.y - lo.y) * t;
    const prof = [[lo.z, lo.y - 0.2]]; for (let i = 0; i < n; i++) { prof.push([zAt(i / n), yAt((i + 1) / n)]); prof.push([zAt((i + 1) / n), yAt((i + 1) / n)]); }
    prof.push([hi.z, hi.y - 0.2]);
    const m = new THREE.Mesh(extrudeX(prof, x0, x1), o.mat || K.stepMat); m.receiveShadow = true; S.group.add(m);
    S.bx(x0, x1, hi.y + 0.002, hi.y + 0.012, hi.z - Math.sign(hi.z - lo.z) * 0.32, hi.z - Math.sign(hi.z - lo.z) * 0.08, M.yellow);
  };

  /** a hanging board in WORLD coordinates (passages): the board faces the world direction (fx, fz) */
  K.boardAt = (grp, x, y, z, fx, fz, sections, o = {}) => K.hang(grp, { x, y, z, rotY: Math.atan2(fx, fz), rodLen: o.rodLen ?? 0.6, sections, ...(o.w ? { w: o.w } : {}) });
  K.worldGroup = (name) => { const g = new THREE.Group(); g.name = name; g.userData.undergroundOnly = true; g.userData.zone = name; ctx.addStatic(g); return g; };
  return K;
}

// ================================================================================================================================ the hub
export function buildSennayaHub(ctx, M, X) {
  const K = makeHubKit(ctx, M, X), res = { errors: [] }, stubs = {};
  K.defer = (key, fn) => { (stubs[key] ||= []).push(fn); };                       // the stubs of the hall ends that wait for a real tunnel (links-south.js); built below when no tunnel came
  const fail = (what, e) => { console.error('[metro] Sennaya hub: ' + what + ' failed', e); (ctx.errors ||= []).push(e); res.errors.push(what); };
  for (const [id, fn] of [['sennaya', buildSennaya], ['sadovaya', buildSadovaya], ['spasskaya', buildSpasskaya]]) { try { res[id] = fn(ctx, M, X, K); } catch (e) { fail(id, e); } }
  const { sennaya: sn, sadovaya: sd, spasskaya: ss } = res;
  const P = {};                                                                    // passage parts (routes for the tests)
  if (sn && sd) try { P.senSad = passageSenSad(ctx, M, X, K, sn, sd); } catch (e) { fail('passage Sennaya - Sadovaya', e); }
  if (sn && ss) try { P.senSpa = passageSenSpa(ctx, M, X, K, sn, ss); } catch (e) { fail('passage Sennaya - Spasskaya', e); }
  if (sd && ss) try { P.sadSpa = passageSadSpa(ctx, M, X, K, sd, ss); } catch (e) { fail('passage Sadovaya - Spasskaya', e); }
  res.passages = P;
  // ---- the real tunnels to the built neighbours, then the stubs of the ends that did not get one
  try { res.links = buildSouthLinks(ctx, M, X, { sennaya: sn, sadovaya: sd, spasskaya: ss }); } catch (e) { fail('real tunnels', e); res.links = { links: {}, done: new Set() }; }
  for (const [key, fns] of Object.entries(stubs)) if (!res.links.done.has(key)) for (const f of fns) { try { f(); } catch (e) { fail('stub ' + key, e); } }
  // ---- transfer walks (tests): platform -> platform through the passages, real physics (tools/metro-south-test.mjs, tools/metro-test.mjs section 7)
  res.walks = (debug) => {
    const get = (name) => { const c = debug.corridors.find((q) => q.name === name); return c ? c.pts : []; };
    const xz = (pts, step = 3) => pts.filter((_, i, a) => i % step === 0 || i === a.length - 1).map((p) => [p[0], p[2]]);
    const out = {}; for (const p of Object.values(P)) if (p && p.walks) Object.assign(out, p.walks(get, xz));
    return out;
  };
  return res;
}

// ================================================================================================================================ the passages
/** Sennaya (sunk stairwell, -60.5) -> passage west under the west track -> the upper hall at the south end of Sadovaya -> 4-lane bank down into its lower hall */
function passageSenSad(ctx, M, X, K, sn, sd) {
  const SN = FRAMES.sennaya, SD = FRAMES.sadovaya, E = ESC2.senSad, W = SN_WELL, grp = X.mkGroup('sennaya-sadovaya-passage');
  // the bank and its upper hall: the door in the back wall (behind the head: the side toward the south)
  const bank = K.bank(E, { name: 'sen-sad', doors: [{ x: 0, z: -13, w: 4.6 }], sign: [K.sg.sec.trains('5', 1, 'd', ['Садовая', 'Sadovaya'])] });
  // the passage: from the landing of the Sennaya well (heading west, Sennaya +x) to the back door of the upper hall (heading north, Sadovaya -z)
  const a = toWorld(SN, W.x1 + 0.2, W.cz), a2 = toWorld(SN, 18, W.cz), b = bank.W(0, -13.2), b2 = bank.W(0, -21), tA = [Math.cos(SN.yaw), -Math.sin(SN.yaw)], tB = [E.e[0], E.e[1]];
  const pts = smoothPath([a, a2, toWorld(SD, 22, 140), toWorld(SD, 8, 127), b2, b], tA, tB, 2.5);
  X.debug.radii.senSad = minRadius(pts);
  X.cor('sennaya-sadovaya', grp, pts.map((p) => [p[0], SN_SAD_Y, p[1]]), { ...K.PASS, w: 4.6 });
  // signs: at the bottom of the well (toward the passage), in the passage near the upper hall
  const g = K.worldGroup('sennaya-sadovaya-signs');
  { const p = toWorld(SN, W.x1 + 1.6, W.cz); K.boardAt(g, p[0], SN_SAD_Y + 2.75, p[1], -tA[0], -tA[1], [K.SEC.toSadovaya()], { rodLen: 0.5 }); }
  { const p = bank.W(0, -16.5); K.boardAt(g, p[0], SN_SAD_Y + 2.75, p[1], tB[0], tB[1], [K.SEC.toSennaya()], { rodLen: 0.5 }); }
  const SnW = (x, z, tol) => { const q = toWorld(SN, x, z); return tol ? [...q, tol] : q; }, SdW = (x, z, tol) => { const q = toWorld(SD, x, z); return tol ? [...q, tol] : q; }, BW = (x, z, tol) => { const q = bank.W(x, z); return tol ? [...q, tol] : q; };
  return { bank, walks: (get, xz) => {
    const c = xz(get('sennaya-sadovaya'));
    return {
      'sennaya->sadovaya': { start: [...SnW(0, -6), SN.y], points: [SnW(0, -13), SnW(0, W.z1 + 0.4, 0.5), SnW(0, (W.z1 + W.zFoot) / 2, 0.6), SnW(0, W.zFoot - 0.6, 0.5), SnW(1.2, W.cz, 0.6), ...c, BW(0, -11), BW(-1, -2.2), BW(-1, 2.5, 0.4), BW(-1, E.run - 2, 0.5), BW(-1, E.run + 2.6), SdW(0, SD_PZ - 4), SdW(0, 50)], end: { station: 'sadovaya', y: SD.y } },
      'sadovaya->sennaya': { start: [...SdW(0, 50), SD.y], points: [SdW(0, SD_PZ - 3), SdW(1, SD_PZ + 2.5), BW(1, E.run + 2.2, 0.4), BW(1, E.run - 3, 0.3), BW(1, 1.2, 0.3), BW(1, -1.8), BW(0, -11), ...c.slice().reverse(), SnW(1.2, W.cz, 0.6), SnW(0, W.zFoot - 0.6, 0.5), SnW(0, W.zFoot + 2, 0.5), SnW(0, W.z1 - 1, 0.6), SnW(0, W.z1 + 2), SnW(0, -6)], end: { station: 'sennaya', y: SN.y } },
    };
  } };
}

/** Sennaya (south end wall) -> stair up 6.5 m over the running tunnels -> passage west -> the upper hall at the SE end of Spasskaya -> 4-lane bank down into its lower hall */
function passageSenSpa(ctx, M, X, K, sn, ss) {
  const SN = FRAMES.sennaya, SS = FRAMES.spasskaya, E = ESC2.senSpa, PZ = SN_PZ, FY = SN.y, grp = X.mkGroup('sennaya-spasskaya-passage');
  const bank = K.bank(E, { name: 'sen-spa', doors: [{ x: 0, z: -13, w: 4.6 }], sign: [K.sg.sec.trains('4', 1, 'd', ['Спасская', 'Spasskaya'])] });
  // the passage: the stair (axial, Sennaya -z) from the end wall up to SN_SPA_Y, then west round to the back door of the upper hall (heading Spasskaya -z)
  const run = (SN_SPA_Y - FY) / Math.tan(Math.PI / 6), z0 = -(PZ + 0.35), zs = -(PZ + 1.6), zt = zs - run, W = (x, z) => toWorld(SN, x, z);
  const tS = [-Math.sin(SN.yaw), -Math.cos(SN.yaw)], tB = [E.e[0], E.e[1]];
  const xyz = (q, y) => [q[0], y, q[1]], stair = [xyz(W(0, z0), FY), xyz(W(0, zs), FY)]; for (let i = 1; i <= 6; i++) { const q = W(0, zs - run * i / 6); stair.push([q[0], FY + (SN_SPA_Y - FY) * i / 6, q[1]]); }
  const b = bank.W(0, -13.2), b2 = bank.W(0, -20);
  const flat = smoothPath([W(0, zt), W(0, zt - 4), W(-0.5, zt - 9), W(9, zt - 15), toWorld(SS, 20, 128), b2, b], tS, tB, 2.5);
  X.debug.radii.senSpa = minRadius(flat);
  const pts = [...stair, ...flat.slice(1).map((p) => [p[0], SN_SPA_Y, p[1]])];
  X.cor('sennaya-spasskaya', grp, pts, { ...K.PASS, w: 6.0, noLift: true });
  K.rampSteps(sn.S, { x0: -2.95, x1: 2.95, zA: zs, yA: FY, zB: zt, yB: SN_SPA_Y });
  // the wall text "1703 САНКТ-ПЕТЕРБУРГ / 1914 ПЕТРОГРАД / 1924 ЛЕНИНГРАД / 1991 САНКТ-ПЕТЕРБУРГ" in white marble over a half-column base: on the side wall of the upper hall, facing the arrivals
  const g = K.worldGroup('sennaya-spasskaya-signs'), kg = ctx.kit(g);
  {
    const t = ctx.tex.draw(256, 192, (q, w, h) => { q.scale(w / 512, h / 384); w = 512; h = 384;
      q.fillStyle = '#ece6d6'; q.fillRect(0, 0, w, h); q.strokeStyle = 'rgba(120,110,90,0.35)'; q.lineWidth = 3; q.strokeRect(6, 6, w - 12, h - 12);
      q.fillStyle = '#3a3428'; q.textAlign = 'center'; q.textBaseline = 'middle';
      [['1703', 'САНКТ-ПЕТЕРБУРГ'], ['1914', 'ПЕТРОГРАД'], ['1924', 'ЛЕНИНГРАД'], ['1991', 'САНКТ-ПЕТЕРБУРГ']].forEach(([y, n], i) => { ctx.tex.fitText(q, y, 86, 62 + i * 84, 120, 50, FONT, 700); ctx.tex.fitText(q, n, 300, 62 + i * 84, 340, 44, FONT, 600); });
    }, { key: 'hub-1703' });
    const xd = [bank.W(1, 0)[0] - bank.W(0, 0)[0], bank.W(1, 0)[1] - bank.W(0, 0)[1]], p = bank.W(-7.48, -6.0), rot = Math.atan2(xd[0], xd[1]);     // the -x wall of the upper hall, the panel faces +x (into the hall)
    const pm = kg.plane(3.2, 2.4, mat(ctx, t), [p[0] + xd[0] * 0.03, SN_SPA_Y + 2.15, p[1] + xd[1] * 0.03], [0, rot, 0]); pm.castShadow = false;
    kg.box(3.4, 0.85, 0.5, mat(ctx, null, '#ece6d6'), [p[0] + xd[0] * 0.25, SN_SPA_Y + 0.45, p[1] + xd[1] * 0.25], [0, rot, 0]);
    ctx.physics.addBox(p[0] + xd[0] * 0.25, p[1] + xd[1] * 0.25, 3.5, 0.6, rot, SN_SPA_Y - 0.5, SN_SPA_Y + 0.95);
  }
  { const p = W(0, zt - 2.0); K.boardAt(g, p[0], SN_SPA_Y + 2.75, p[1], -tS[0], -tS[1], [K.SEC.toSpasskaya()], { rodLen: 0.5 }); }
  { const p = bank.W(0, -17.5); K.boardAt(g, p[0], SN_SPA_Y + 2.75, p[1], tB[0], tB[1], [K.SEC.toSennaya()], { rodLen: 0.5 }); }
  const SnW = (x, z, tol) => { const q = toWorld(SN, x, z); return tol ? [...q, tol] : q; }, SsW = (x, z, tol) => { const q = toWorld(SS, x, z); return tol ? [...q, tol] : q; }, BW = (x, z, tol) => { const q = bank.W(x, z); return tol ? [...q, tol] : q; };
  const nStair = stair.length;
  return { bank, walks: (get, xz) => {
    const c = xz(get('sennaya-spasskaya').slice(nStair));                          // the flat part after the stair
    return {
      'sennaya->spasskaya': { start: [...SnW(0, -40), FY], points: [SnW(0, -PZ + 3), SnW(0, z0 - 0.4, 0.6), SnW(0, zs - 1, 0.6), SnW(0, zs - run / 2, 0.6), SnW(0, zt - 0.5, 0.6), ...c, BW(0, -11), BW(-1, -2.2), BW(-1, 2.5, 0.4), BW(-1, E.run - 2, 0.5), BW(-1, E.run + 2.6), SsW(0, SS_PZ - 4), SsW(0, 50)], end: { station: 'spasskaya', y: SS.y } },
      'spasskaya->sennaya': { start: [...SsW(0, 50), SS.y], points: [SsW(0, SS_PZ - 3), SsW(1, SS_PZ + 2.5), BW(1, E.run + 2.2, 0.4), BW(1, E.run - 3, 0.3), BW(1, 1.2, 0.3), BW(1, -1.8), BW(0, -11), ...c.slice().reverse(), SnW(0, zt - 0.5, 0.6), SnW(0, zs - run / 2, 0.6), SnW(0, zs + 0.3, 0.6), SnW(0, -PZ + 3), SnW(0, -40)], end: { station: 'sennaya', y: SN.y } },
    };
  } };
}

/** Sadovaya (sunk stairwell, -76.2) -> the lower hall west under the west track -> 4-lane bank up to -55.4 -> passage WSW -> the relief hall of Spasskaya -> stair down into its NW end */
function passageSadSpa(ctx, M, X, K, sd, ss) {
  const SD = FRAMES.sadovaya, SS = FRAMES.spasskaya, E = ESC2.sadSpa, W = SD_WELL, R = SS_REL, grp = X.mkGroup('sadovaya-spasskaya-passage');
  const bank = K.bank(E, { name: 'sad-spa', doors: [{ x: 0, z: -13, w: 4.6 }], sign: [K.sg.sec.transfer({ to: 'sadovaya', line: '5' }, 'd')] });
  K.bulkhead(bank.Se, E.A, E.FY, E.run, 3.1);
  // the lower hall: from the landing of the Sadovaya well (heading west, Sadovaya -x) to the foot of the bank (heading the climb)
  const up = [-E.e[0], -E.e[1]], foot = [E.bottom.x, E.bottom.z], a = toWorld(SD, W.x0 - 0.2, W.cz), tA = [-Math.cos(SD.yaw), Math.sin(SD.yaw)];
  const low = smoothPath([a, toWorld(SD, -12, W.cz), toWorld(SD, -20, W.cz + 3.5), [foot[0] - up[0] * 6, foot[1] - up[1] * 6], foot], tA, up, 2.2);
  X.debug.radii.sadSpaLow = minRadius(low);
  X.cor('sadovaya-spasskaya-lower', grp, low.map((p) => [p[0], SD_LOW_Y, p[1]]), { ...K.PASS, w: 5.6, h: 2.6, rise: 0.9, noLift: true });
  // the upper passage: the back door of the upper hall (heading the climb: WSW) -> the east door of the relief hall of Spasskaya (heading Spasskaya -x)
  const b0 = bank.W(0, -13.2), b1 = bank.W(0, -19), r0 = toWorld(SS, R.x1 + 0.2, R.zE), r1 = toWorld(SS, R.x1 + 7, R.zE), tR = [-Math.cos(SS.yaw), Math.sin(SS.yaw)];
  const upper = smoothPath([b0, b1, toWorld(SS, 62, -84), r1, r0], up, tR, 2.5);
  X.debug.radii.sadSpa = minRadius(upper);
  X.cor('sadovaya-spasskaya', grp, upper.map((p) => [p[0], SS_REL_Y, p[1]]), { ...K.PASS, w: 4.6 });
  const g = K.worldGroup('sadovaya-spasskaya-signs');
  { const p = toWorld(SD, W.x0 - 1.6, W.cz); K.boardAt(g, p[0], SD_LOW_Y + 2.6, p[1], -tA[0], -tA[1], [K.SEC.toSpasskaya()], { rodLen: 0.3 }); }
  { const p = bank.W(0, -18); K.boardAt(g, p[0], SS_REL_Y + 2.75, p[1], -up[0], -up[1], [K.SEC.toSpasskaya()], { rodLen: 0.5 }); }               // for the walkers leaving the bank toward Spasskaya
  { const p = toWorld(SS, R.x1 + 3.2, R.zE); K.boardAt(g, p[0], SS_REL_Y + 2.75, p[1], tR[0], tR[1], [K.SEC.toSadovaya()], { rodLen: 0.5 }); }   // for the walkers leaving the relief hall toward Sadovaya
  const SdW = (x, z, tol) => { const q = toWorld(SD, x, z); return tol ? [...q, tol] : q; }, BW = (x, z, tol) => { const q = bank.W(x, z); return tol ? [...q, tol] : q; };
  return { bank, walks: (get, xz) => {
    const lw = xz(get('sadovaya-spasskaya-lower')), uw = xz(get('sadovaya-spasskaya'));
    return {
      'sadovaya->spasskaya': { start: [...SdW(0, 10), SD.y], points: [SdW(0, W.z1 + 2.5), SdW(0, W.z1 - 0.4, 0.5), SdW(0, (W.z1 + W.zFoot) / 2, 0.6), SdW(0, W.zFoot - 0.5, 0.5), SdW(-1.0, W.cz, 0.6), ...lw, BW(1, E.run + 2.2, 0.4), BW(1, E.run - 3, 0.3), BW(1, 1.2, 0.3), BW(1, -1.8), BW(0, -11), ...uw, ...ss.reliefIn(), ...ss.stairDown()], end: { station: 'spasskaya', y: SS.y } },
      'spasskaya->sadovaya': { start: [...toWorld(SS, 0, -40), SS.y], points: [...ss.stairUp(), ...ss.reliefOut(), ...uw.slice().reverse(), BW(0, -11), BW(-1, -2.2), BW(-1, 2.5, 0.4), BW(-1, E.run - 2, 0.5), BW(-1, E.run + 1.5), ...lw.slice().reverse(), SdW(-1.0, W.cz, 0.6), SdW(0, W.zFoot - 0.5, 0.5), SdW(0, W.zFoot + 2, 0.5), SdW(0, W.z1 - 1, 0.6), SdW(0, W.z1 + 2), SdW(0, 10)], end: { station: 'sadovaya', y: SD.y } },
    };
  } };
}

// ---------------------------------------------------------------- small helpers
const toLocalZ = (f, p) => (p[0] - f.x) * Math.sin(f.yaw) + (p[1] - f.z) * Math.cos(f.yaw);
const mat = (ctx, map, color = '#ffffff') => (map ? ctx.mat.toon(color, { map }) : ctx.mat.toon(color));
void SD_PZ; void SN_SAD_Y;
