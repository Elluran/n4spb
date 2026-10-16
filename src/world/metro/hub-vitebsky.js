// metro/hub-vitebsky.js — the Vitebsky node (docs/research/metro-south-vitebsky-tekhnolog.md sections 3.3, 4, 5): Pushkinskaya (line 1) + Zvenigorodskaya (line 5), the 2008 passage between them and
// the real tunnels Vladimirskaya -> Pushkinskaya / Sadovaya -> Zvenigorodskaya (links-vitebsky.js).
//   const vit = buildVitebskyHub(ctx, M, X)  ->  { pushkinskaya, zvenigorodskaya, links, passage, walks(), register(debug) }   (X: see metro.js; X.vitebsky = the same object)
// The passage (geometry: data/metro-vitebsky.js XFER):
//   * Pushkinskaya, NNW side (local -x): two stairs climb from the central hall through the pylon openings at z -6 / -12 to bridges 3.62 m over the platform, over the side platform and the
//     southbound track, through portals in the track wall; Zvenigorodskaya, SSE side (local -x): three stairs in the arches at z -11.4 / -15.2 / -19.0, the same way to the same level.
//     Every stair + bridge is an enclosed tube (marble side walls, ceiling, lamps, brass rails); people on the side platform walk under the bridge decks. The side vault over the bridges is
//     replaced by a raised flat BAY (its gables close the vault ends; the track wall collider is split at the portals).
//   * between the two track walls: two corridors (corridor.js via X.cor, noLift: they keep the level of the bridges) and the transfer chamber in front of Zvenigorodskaya (two square piers, the
//     arms of both corridors on its west wall, the three portals of the bridges on its east side).
// Static geometry only (no per-frame work); textures go through ctx.tex.draw by key.
import * as THREE from 'three';
import { FRAMES, toWorld } from '../data/metro.js';
import { XFER, PS_ARCADE, ZV_ARCADE, PUSH_STREETS } from '../data/metro-vitebsky.js';
import { extrudeZ, extrudeX, archRing, floorGeo, bezierPath, minRadius } from './lib.js';
import { buildPushkinskaya, vitGranite } from './st-pushkinskaya.js';
import { buildZvenigorodskaya } from './st-zvenigorodskaya.js';
import { buildVladimirskayaPushkinskayaLink, buildZvenigorodskayaSadovayaLink } from './links-vitebsky.js';
import { makeSigns } from './signs.js';

export { buildZvenigorodskayaSadovayaLink };

export function buildVitebskyHub(ctx, M, X) {
  const res = { pushkinskaya: null, zvenigorodskaya: null, links: {}, passage: null };
  X.vitebsky = res;
  const say = (e, what) => { console.error('[metro] Vitebsky node: ' + what + ' failed', e); (ctx.errors ||= []).push(e); };
  try { res.pushkinskaya = buildPushkinskaya(ctx, M, X); } catch (e) { say(e, 'Pushkinskaya'); }
  try { res.zvenigorodskaya = buildZvenigorodskaya(ctx, M, X); } catch (e) { say(e, 'Zvenigorodskaya'); }
  const push = res.pushkinskaya, zven = res.zvenigorodskaya;
  // ---- the real tunnels (an end without a link gets its stubs)
  if (push) { let lk = null; try { lk = buildVladimirskayaPushkinskayaLink(ctx, M, X); } catch (e) { say(e, 'the tunnel Vladimirskaya - Pushkinskaya'); } if (lk) Object.assign(res.links, lk.links); else push.endStubs(-1); }
  if (zven) {
    if (!FRAMES.sadovaya) { zven.endStubs(-1); zven.endDone = 'stubs'; }
    else if (X.stations.sadovaya) { const lk = buildZvenigorodskayaSadovayaLink(ctx, M, X); if (lk) Object.assign(res.links, lk.links); }
    else res.sadovayaPending = true;                                     // the Sadovaya builder runs later: call buildZvenigorodskayaSadovayaLink(ctx, M, X) after it (register() is the fallback)
  }
  // ---- the passage
  if (push && zven) try { res.passage = buildPassage(ctx, M, X, push, zven); } catch (e) { say(e, 'the passage Pushkinskaya - Zvenigorodskaya'); }
  res.walks = () => (res.passage ? res.passage.walks() : {});
  /** call at the end of metro.js build() (after debug.walks exists): the ways in / out, the transfer walks; the fallback stubs of the Zvenigorodskaya -z end */
  res.register = (debug) => {
    if (zven && !zven.endDone) { console.warn('[metro] Zvenigorodskaya: buildZvenigorodskayaSadovayaLink was not called, the -z end gets stubs'); zven.endStubs(-1); zven.endDone = 'stubs'; }
    debug.exits ||= {}; debug.entries ||= {}; debug.walks ||= {};
    for (const [id, st] of [['pushkinskaya', push], ['zvenigorodskaya', zven]]) if (st) { debug.exits[id] = st.exitRoute(); debug.entries[id] = st.entryRoute(); }
    Object.assign(debug.walks, res.walks());
    debug.vitebsky = { links: Object.keys(X.realLinks).filter((k) => /pushkinskaya|zvenigorodskaya/.test(k)), zvenEnd: zven ? zven.endDone : null, radii: res.passage ? res.passage.radii : null };
  };
  return res;
}

/**
 * The stairs + bridges of one hall and the raised bay over them (the -x side of the hall). st = the station builder result (S, dims, FY, PZ); o = { stairs: [z], TW (tube inner width = the arch
 * width), bay: [z0, z1], mats: { stair, deck, wall, ceil, bay, bayCeil } }. Returns { x0 (foot of the flights), xE (top), xW (outer face of the bay wall, where the corridor / chamber starts), YB }.
 */
export function transferBay(ctx, M, st, o) {
  const { physics } = ctx, S = st.S, k = S.k, { C, PY, WALL, RS } = st.dims, FY = st.FY, PZ = st.PZ, BED = FY - 1.1, SPS = FY + 3.6, CXS = (PY + WALL) / 2;
  const YB = FY + XFER.YB, TH = XFER.tubeH, TOP = FY + XFER.bayTop, [g0, g1] = o.bay, hw = o.TW / 2, TS = XFER.TANS, AL = Math.atan(TS);
  const x0 = -(C - XFER.inset), run = XFER.YB / TS, xE = x0 - run, xW = -WALL - 0.3;
  const yS = (x) => FY + Math.max(0, Math.min(XFER.YB, (x0 - x) * TS));
  const mt = o.mats;
  // ---- 1. the side vault over the bay goes (two segments of the same ring stay)
  let vault = null;
  for (const m of S.group.children) {
    if (!m.isMesh || !m.geometry || m.position.lengthSq() > 1e-6) continue; const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox;
    if (b.max.x < -PY + 0.9 && b.max.x > -PY + 0.2 && b.min.x < -WALL - 0.3 && b.max.z - b.min.z > PZ && b.max.y > SPS + RS - 0.1 && b.min.y > SPS - 0.5) { vault = m; break; }
  }
  if (vault) { S.group.remove(vault); const ring = archRing(RS, SPS, 0.5, SPS, -CXS, 36); for (const [a, b] of [[-PZ, g0], [g1, PZ + 0.6]]) S.group.add(new THREE.Mesh(extrudeZ(ring, a, b), vault.material)); }
  else console.warn('[metro] transfer bay ' + S.name + ': the side vault was not found');
  // ---- 2. the bay: flat ceiling, gables (the transverse arches at both ends), the track-side wall with the portals, the wall over the pylon row (notched where the tubes pass)
  S.bx(xW, -PY + 0.3, TOP, TOP + 0.3, g0 - 0.3, g1 + 0.3, mt.bayCeil);
  const gable = [[-WALL - 0.5, SPS], [-WALL - 0.5, TOP], [-PY + 0.3, TOP], [-PY + 0.3, SPS]]; for (let i = 0; i <= 24; i++) { const t = i * Math.PI / 24; gable.push([-CXS + RS * Math.cos(t), SPS + RS * Math.sin(t)]); }
  for (const [za, zb] of [[g0 - 0.3, g0], [g1, g1 + 0.3]]) S.group.add(new THREE.Mesh(extrudeZ(gable, za, zb), mt.bay));
  const portals = o.stairs.map((zs) => [zs - hw, zs + hw]).sort((p, q) => p[0] - q[0]);
  S.group.add(new THREE.Mesh(extrudeX([[g0, SPS - 0.3], [g1, SPS - 0.3], [g1, TOP], [g0, TOP]], xW, -WALL, portals.map(([a, b]) => [[a, YB], [b, YB], [b, YB + TH], [a, YB + TH]])), mt.bay));
  const yP = yS(-PY) + TH, yCap = yP + 0.2;                                                                                 // the tube ceiling where it leaves the pylon row, the top of its slab
  { let zc = g0 - 0.3; for (const [a, b] of portals) { if (a - 0.3 > zc + 0.05) S.bx(-PY, -PY + 0.3, FY + 4.0, yCap, zc, a - 0.3, mt.bay); zc = b + 0.3; } if (g1 + 0.3 > zc + 0.05) S.bx(-PY, -PY + 0.3, FY + 4.0, yCap, zc, g1 + 0.3, mt.bay); }
  S.bx(-PY, -PY + 0.3, yCap, TOP, g0 - 0.3, g1 + 0.3, mt.bay);
  for (const z of [(g0 + g1) / 2 - 3, (g0 + g1) / 2 + 3]) { const l = k.box(1.6, 0.06, 0.8, M.lampWhite, [-CXS, TOP - 0.04, z]); l.castShadow = false; }
  // ---- 3. per stair: the flight (solid granite profile + sticky walk boxes), the deck, the tube (side walls, sloped / flat ceiling, the cap over the pylon), lamps, brass rails
  for (const zs of o.stairs) {
    const za = zs - hw, zb = zs + hw, n = Math.max(8, Math.round(XFER.YB / 0.16)), t = run / n, h = XFER.YB / n, prof = [[x0, FY - 0.3]];
    for (let i = 0; i < n; i++) prof.push([x0 - i * t, FY + (i + 1) * h], [x0 - (i + 1) * t, FY + (i + 1) * h]);
    prof.push([xE, FY - 0.3]);
    S.group.add(new THREE.Mesh(extrudeZ(prof, za + 0.01, zb - 0.01), mt.stair));
    for (let i = 0; i < n; i++) { const it = S.walk(x0 - (i + 1) * t, x0 - i * t, za, zb, FY + (i + 1) * h, (i + 1) * h + 1.2); it.sticky = true; }
    S.bx(x0 - t, x0, FY + h, FY + h + 0.006, za, zb, M.yellow); S.bx(xE, xE + t, YB, YB + 0.006, za, zb, M.yellow);
    S.bx(xW - 0.05, xE, YB - 0.3, YB, za - 0.3, zb + 0.3, mt.deck); S.walk(xW - 0.6, xE + 0.05, za, zb, YB, 0.3);
    for (const sz of [-1, 1]) {
      const zw = zs + sz * (hw + 0.15), poly = [[-PY, FY - 0.05], [xE, FY - 0.05], [xE, YB - 0.35], [xW, YB - 0.35], [xW, YB + TH + 0.2], [xE, YB + TH + 0.2], [-PY, yP + 0.2]];
      S.group.add(new THREE.Mesh(extrudeZ(poly, zw - 0.15, zw + 0.15), mt.wall));
      S.col(xE, -PY, FY - 1.2, YB + TH + 0.3, zw - 0.15, zw + 0.15); S.col(xW, xE, YB - 0.35, YB + TH + 0.3, zw - 0.15, zw + 0.15);
      const zr = zs + sz * (hw - 0.07), L = run / Math.cos(AL);
      k.cyl(0.028, 0.028, L, M.brass, [(x0 + xE) / 2, (FY + YB) / 2 + 0.9, zr], [0, 0, Math.PI / 2 - AL], 6);
      k.cyl(0.028, 0.028, xE - xW, M.brass, [(xE + xW) / 2, YB + 0.9, zr], [0, 0, Math.PI / 2], 6);
    }
    S.group.add(new THREE.Mesh(extrudeZ([[-PY, yP], [xE, YB + TH], [xE, YB + TH + 0.2], [-PY, yP + 0.2]], za - 0.3, zb + 0.3), mt.ceil));
    S.bx(xW, xE, YB + TH, YB + TH + 0.2, za - 0.3, zb + 0.3, mt.ceil);
    S.bx(-PY, -PY + 0.3, FY + 4.0, yP + 0.2, za, zb, mt.wall);                                                             // closes the tube over the top of the pylon row
    { const l1 = k.box((xE - xW) - 0.4, 0.05, 0.5, M.lampWarm, [(xE + xW) / 2, YB + TH - 0.03, zs]); l1.castShadow = false; const l2 = k.box((-PY - xE) / Math.cos(AL) - 0.6, 0.05, 0.5, M.lampWarm, [(-PY + xE) / 2, (yP + YB + TH) / 2 - 0.03, zs], [0, 0, -AL]); l2.castShadow = false; }
  }
  // ---- 4. the track wall collider of this side: split at the portals (the pieces in the bay stop at the bay wall: the chamber / corridors start there)
  const twc = S.items.find((it) => it.type === 'box' && Math.abs(it.hw - 0.575) < 0.02 && Math.abs(it.hd - PZ) < 0.02 && Math.abs(it.y1 - (FY + 8)) < 0.05 && S.L(it.cx, it.cz)[0] < 0);
  if (twc) {
    physics.remove(twc);
    const xa = -WALL - 1.0, xb = -WALL + 0.15, y0 = BED - 1.2, y1 = FY + 8;
    S.col(xa, xb, y0, y1, -PZ, g0); S.col(xa, xb, y0, y1, g1, PZ);
    let zc = g0; for (const [a, b] of portals) { if (a > zc + 0.02) S.col(xW, xb, y0, y1, zc, a); S.col(xW, xb, y0, YB - 0.3, a, b); S.col(xW, xb, YB + TH, y1, a, b); zc = b; } if (g1 > zc + 0.02) S.col(xW, xb, y0, y1, zc, g1);
  } else console.warn('[metro] transfer bay ' + S.name + ': the track wall collider was not found');
  return { x0, xE, xW, YB, run };
}

/** the whole passage: both bays, the chamber, the two corridors, the signs; returns { walks(), radii, corridors } */
function buildPassage(ctx, M, X, push, zven) {
  const { mat } = ctx, P = push.frame, Z = zven.frame, sg = makeSigns(ctx, M);
  const vg = vitGranite(M), granite = (key, tint) => mat.toon(tint, { map: vg });
  const pm = { stair: granite('vit-stair-push', '#4c3a35'), deck: granite('vit-deck-push', '#5a4640'), wall: mat.toon('#ece8de'), ceil: mat.toon('#f2efe6', { side: 'double' }), bay: mat.toon('#efebe0'), bayCeil: mat.toon('#efebe0', { side: 'double' }) };
  const zm = { stair: granite('vit-stair-zven', '#5a2a26'), deck: granite('vit-deck-zven', '#6a3a34'), wall: mat.toon('#d6d2c8'), ceil: mat.toon('#f4f4f0', { side: 'double' }), bay: mat.toon('#f2f2ee'), bayCeil: mat.toon('#f4f4f0', { side: 'double' }) };
  const bp = transferBay(ctx, M, push, { stairs: XFER.push.stairs, TW: PS_ARCADE.openW, bay: XFER.push.bay, mats: pm });
  const bz = transferBay(ctx, M, zven, { stairs: XFER.zven.stairs, TW: ZV_ARCADE.openW, bay: XFER.zven.bay, mats: zm });
  const Wp = (x, z, tol) => { const q = toWorld(P, x, z); return tol ? [q[0], q[1], tol] : q; }, Wz = (x, z, tol) => { const q = toWorld(Z, x, z); return tol ? [q[0], q[1], tol] : q; };
  const dirP = [-Math.cos(P.yaw), Math.sin(P.yaw)], dirZ = [Math.cos(Z.yaw), -Math.sin(Z.yaw)];                // Pushkinskaya local -x, Zvenigorodskaya local +x (world)

  // ---- the transfer chamber (Zvenigorodskaya frame), its floor at the bridge level
  const CH = XFER.chamber, Sz = zven.S, kz = Sz.k, YZ = zven.FY + XFER.YB, H = CH.h, cw = XFER.corrW / 2;
  const wallMat = mat.toon('#ebe7dd', { side: 'double' }), vaultMat = mat.toon('#f2f0ea', { side: 'double' });
  Sz.group.add(new THREE.Mesh(floorGeo(CH.x0, CH.x1, CH.z0, CH.z1, YZ, 0.5), M.corridorFloor)); Sz.bx(CH.x0, CH.x1, YZ - 0.4, YZ - 0.02, CH.z0, CH.z1, M.concreteDark); Sz.walk(CH.x0 - 0.2, CH.x1 + 0.4, CH.z0, CH.z1, YZ, 0.4);
  Sz.group.add(new THREE.Mesh(floorGeo(CH.x0 - 0.3, CH.x1, CH.z0 - 0.3, CH.z1 + 0.3, YZ + H, 1, false), vaultMat));
  for (const [za, zb] of [[CH.z0 - 0.3, CH.z0], [CH.z1, CH.z1 + 0.3]]) { Sz.bx(CH.x0 - 0.3, CH.x1, YZ - 0.5, YZ + H, za, zb, wallMat); Sz.col(CH.x0 - 0.3, CH.x1, YZ - 1.0, YZ + H + 0.5, za, zb); }
  const arms = Object.values(XFER.arms).sort((a, b) => a - b);
  Sz.group.add(new THREE.Mesh(extrudeX([[CH.z0 - 0.3, YZ - 0.5], [CH.z1 + 0.3, YZ - 0.5], [CH.z1 + 0.3, YZ + H], [CH.z0 - 0.3, YZ + H]], CH.x0 - 0.3, CH.x0, arms.map((a) => [[a - cw, YZ], [a + cw, YZ], [a + cw, YZ + 2.9], [a - cw, YZ + 2.9]])), wallMat));
  { let zc = CH.z0 - 0.3; for (const a of arms) { Sz.col(CH.x0 - 0.3, CH.x0, YZ - 1.0, YZ + H + 0.5, zc, a - cw); Sz.col(CH.x0 - 0.3, CH.x0, YZ + 2.9, YZ + H + 0.5, a - cw, a + cw); zc = a + cw; } Sz.col(CH.x0 - 0.3, CH.x0, YZ - 1.0, YZ + H + 0.5, zc, CH.z1 + 0.3); }
  for (const [px, pz] of CH.piers) { Sz.bx(px - 0.4, px + 0.4, YZ, YZ + H, pz - 0.4, pz + 0.4, wallMat); Sz.col(px - 0.4, px + 0.4, YZ - 0.5, YZ + H, pz - 0.4, pz + 0.4); }
  Sz.bx(CH.x0, CH.x1, YZ + H - 0.32, YZ + H, CH.piers[0][1] - 0.25, CH.piers[0][1] + 0.25, mat.toon('#dcd8ce'));                // the beam over the piers (the flat-arched vaults)
  for (let x = CH.x0 + 2.5; x < CH.x1 - 1; x += 4) for (const z of [CH.z0 + 2.4, (CH.z0 + CH.z1) / 2 + 2.6, CH.z1 - 2.2]) { const l = kz.box(1.4, 0.05, 0.7, M.lampWhite, [x, YZ + H - 0.03, z]); l.castShadow = false; }
  // signs: to the trains of line 5 for the arrivals from Pushkinskaya (they walk +x), to Pushkinskaya + the exits of Pushkinskaya for the others
  sg.hangBoard(Sz, { x: (CH.x0 + CH.x1) / 2 + 0.6, y: YZ + 2.5, z: -15.2, rotY: -Math.PI / 2, rodLen: H - 2.5 - 0.31, both: false, sections: [sg.sec.transfer({ to: 'zvenigorodskaya', line: '5' }, 'u')] });
  sg.hangBoard(Sz, { x: (CH.x0 + CH.x1) / 2 - 0.6, y: YZ + 2.5, z: -15.2, rotY: Math.PI / 2, rodLen: H - 2.5 - 0.31, both: false, sections: [sg.sec.transfer({ to: 'pushkinskaya', line: '1' }, 'u'), sg.sec.exit({ streets: PUSH_STREETS }, 'u')] });
  // signs in the Pushkinskaya tubes (for the climbers, near the top of each flight)
  for (const zs of XFER.push.stairs) sg.hangBoard(push.S, { x: bp.xE - 1.5, y: bp.YB + 2.1, z: zs, rotY: Math.PI / 2, w: 0.5, rodLen: XFER.tubeH - 2.1 - 0.25, both: false, sections: [sg.sec.transfer({ to: 'zvenigorodskaya', line: '5' }, 'u')] });

  // ---- the two corridors: from each Pushkinskaya portal (heading local -x) to an arm of the chamber (heading Zvenigorodskaya +x); y = the bridge level (linear if the halls differ)
  const corr = {}, radii = {};
  const grp = X.mkGroup('vitebsky-passage');
  for (const zs of XFER.push.stairs) {
    const p0 = Wp(bp.xW, zs), p1 = Wz(CH.x0, XFER.arms[String(zs)]);
    const pts2 = bezierPath(p0, dirP, p1, dirZ, 9, 9, 1.5); radii[zs] = minRadius(pts2);
    const y0 = push.FY + XFER.YB, y1 = zven.FY + XFER.YB, L = pts2.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts2[i - 1][0], p[1] - pts2[i - 1][1]) : 0), 0);
    let acc = 0; const pts = pts2.map((p, i) => { if (i) acc += Math.hypot(p[0] - pts2[i - 1][0], p[1] - pts2[i - 1][1]); return [p[0], y0 + (y1 - y0) * acc / (L || 1), p[1]]; });
    const check = X.autoClear ? X.autoClear(pts, X.debug.tubes || []) : pts;
    if (check.some((q, i) => Math.abs(q[1] - pts[i][1]) > 0.05)) console.warn('[metro] Vitebsky passage ' + zs + ': a running tunnel passes within the clearance of the corridor');
    corr[zs] = pts;
    X.cor('vitebsky-passage' + zs, grp, pts, { w: XFER.corrW, h: 2.5, rise: 0.4, wallMat, vaultMat, noLift: true });
  }

  // ---- the transfer walks (tests): platform -> stairs -> bridge -> corridor -> chamber -> bridge -> stairs -> platform
  const walks = () => {
    const cp = (pts, step = 3) => pts.filter((_, i, a) => i % step === 0 || i === a.length - 1).map((p) => [p[0], p[2]]);
    const zIn = -15.2, zOut = -19.0, armIn = XFER.arms['-12'], armOut = XFER.arms['-6'];
    return {
      'pushkinskaya->zvenigorodskaya': { start: [...Wp(0, 10), push.FY], points: [Wp(-1.5, -12), Wp(bp.x0 - 0.3, -12, 0.5), Wp(bp.xE + 0.4, -12, 0.5), Wp(bp.xE - 3, -12, 0.6), ...cp(corr[-12]).slice(1), Wz(CH.x0 + 1.2, armIn, 0.7), Wz(-17.5, zIn, 0.6), Wz(bz.xW + 0.6, zIn, 0.5), Wz(bz.xE - 1.0, zIn, 0.5), Wz(bz.xE + 0.5, zIn, 0.5), Wz(bz.x0 + 0.2, zIn, 0.5), Wz(-0.5, zIn), Wz(0, -5)], end: { station: 'zvenigorodskaya', y: zven.FY } },
      'zvenigorodskaya->pushkinskaya': { start: [...Wz(0, 10), zven.FY], points: [Wz(-0.5, zOut), Wz(bz.x0 - 0.3, zOut, 0.5), Wz(bz.xE + 0.4, zOut, 0.5), Wz(bz.xE - 2, zOut, 0.6), Wz(bz.xW - 0.6, zOut, 0.6), Wz(-17.5 - 2.5, zOut, 0.6), Wz(CH.x0 + 1.2, armOut, 0.7), ...cp(corr[-6]).reverse().slice(1), Wp(bp.xW + 0.6, -6, 0.6), Wp(bp.xE - 1.0, -6, 0.5), Wp(bp.xE + 0.5, -6, 0.5), Wp(bp.x0 + 0.2, -6, 0.5), Wp(-1.5, -6), Wp(0, 20)], end: { station: 'pushkinskaya', y: push.FY } },
    };
  };
  return { walks, radii, corridors: corr, bays: { push: bp, zven: bz } };
}
