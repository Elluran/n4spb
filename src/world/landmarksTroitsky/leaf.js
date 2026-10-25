// landmarksTroitsky/leaf.js - the BASCULE LEAF of the Troitsky Bridge: the moving part (43.2 m of deck with its girders, kerbs, pavements, tram rails, whip railing, one lamp pair, one contact-wire pole and the
// counterweight on the bank side of the hinge), its physics and its dynamic colliders. Everything is a handful of meshes moved by TRANSFORM (no geometry rebuild); the physics floor is three ramps (the roadway
// strip and the two pavements) whose numbers are overwritten per frame (the way a conveyor's `dir` is: an item mutated at run time, no re-insert of grid cells: the footprint of the raised leaf lies inside the
// footprint of the closed one); the rails and the barrier kerbs are DYNAMIC colliders (ctx.physics.addDynamic -> refreshDynamic): boxes that follow the leaf's surface, cut into pieces that are short enough for
// the slope under them. Frames: the OUTER group stands at the hinge (u = 15.2) turned by -T (local x = along the bridge, z = across, y up); PIVOT turns by theta about z (the opening); BODY turns by the rest
// tilt ALPHA0 so that its x axis runs along the deck surface: body coordinates (s, n, v) = (distance from the hinge along the surface, height above the surface, across). frame.js has the formulas.
import * as THREE from 'three';
import { railMat, railSpec } from '../bridges/rails.js';
import { lampT, contactPoleT } from '../bridges/sculpt4.js';
import { Parts } from '../bridges/kit.js';
import { FR, HW, ROAD, KERB, PAVE, U_HINGE, Y_HINGE, ALPHA0, LEAF_S, yDeck, toWorld } from './frame.js';
import { trackV } from './bridge.js';
import { createRamps, placeRamps, leafBoxes } from './service.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const G_RAIL = 2.5, RAIL_HEX = '#8fa89a';
const VP0 = ROAD + KERB, VP1 = HW + 0.1;                          // the pavement strip |v| in [VP0, VP1]
/** girder depth under the leaf deck at distance s from the hinge: 4.2 m at the counterweight pier, 1.3 m at the tip (the source's bascD), kept 1.6 m above the water in the closed pose */
const girderDepth = (s) => Math.min(1.3 + 2.9 * Math.pow(clamp(1 - s / LEAF_S, 0, 1), 1.6), 1.8 + yDeck(U_HINGE + s));

export function buildLeaf(env) {
  const { ctx, M } = env, T = FR.T, P = new Parts();
  const outer = new THREE.Group(), pivot = new THREE.Group(), body = new THREE.Group();
  outer.name = 'troitsky-leaf'; outer.position.set(toWorld(U_HINGE, 0).x, Y_HINGE, toWorld(U_HINGE, 0).z); outer.rotation.y = -T;
  body.rotation.z = ALPHA0; pivot.add(body); outer.add(pivot);
  const S = LEAF_S, sage = M.sageT;

  const faceShape = (mat, pts, v, sg, tile = 2.4) => {
    const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ShapeGeometry(sh, 1), pa = g.attributes.position, ua = g.attributes.uv, na = g.attributes.normal;
    for (let i = 0; i < pa.count; i++) { ua.setXY(i, pa.getX(i) / tile, pa.getY(i) / tile); na.setZ(i, sg); }
    if (sg < 0) { const ix = g.index; for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a); } }
    P.geo(mat, g, 0, 0, v); g.dispose();
  };

  // ---------------------------------------------------------------- deck: asphalt, steel barrier kerbs, granite pavements, the median, lane marks, tram rails (body frame: x = s, y = n)
  P.quad(M.asphalt, [0, 0, -ROAD], [S, 0, -ROAD], [S, 0, ROAD], [0, 0, ROAD], [0, 1, 0], [[0, -ROAD / 4], [S / 4, -ROAD / 4], [S / 4, ROAD / 4], [0, ROAD / 4]]);
  for (const sg of [-1, 1]) {
    const va = sg * ROAD, vk = sg * VP0, vb = sg * VP1;
    P.quad(M.pave, [0, PAVE, vk], [S, PAVE, vk], [S, PAVE, vb], [0, PAVE, vb], [0, 1, 0], [[0, vk / 2.4], [S / 2.4, vk / 2.4], [S / 2.4, vb / 2.4], [0, vb / 2.4]]);
    P.quad(M.steelTroitsky, [0, 0, va], [S, 0, va], [S, 0.5, va], [0, 0.5, va], [0, 0, -sg], [[0, 0], [S, 0], [S, 0.5], [0, 0.5]]);
    P.quad(M.steelTroitsky, [0, 0.5, va], [S, 0.5, va], [S, 0.5, vk], [0, 0.5, vk], [0, 1, 0], [[0, 0], [S, 0], [S, KERB], [0, KERB]]);
    P.quad(M.steelTroitsky, [0, PAVE, vk], [S, PAVE, vk], [S, 0.5, vk], [0, 0.5, vk], [0, 0, sg], [[0, 0], [S, 0], [S, 0.3], [0, 0.3]]);
    for (const w of [0.32]) P.quad(M.kerb, [0, 0, sg * w], [S, 0, sg * w], [S, 0.14, sg * w], [0, 0.14, sg * w], [0, 0, sg]);                 // the median
  }
  P.quad(M.kerb, [0, 0.14, -0.32], [S, 0.14, -0.32], [S, 0.14, 0.32], [0, 0.14, 0.32], [0, 1, 0]);
  const nm = Math.ceil(S / 3.2);
  for (let i = 0; i < nm; i++) {
    const s0 = S * i / nm, s1 = S * (i + 1) / nm, mk = (vc, hw) => P.quad(M.mark, [s0, 0.03, vc - hw], [s1, 0.03, vc - hw], [s1, 0.03, vc + hw], [s0, 0.03, vc + hw], [0, 1, 0]);
    for (const vc of [-5.8, 5.8]) if (i % 3 !== 2) mk(vc, 0.06);
    for (const vc of [-3.05, 3.05]) mk(vc, 0.06);
  }
  for (let k = 0; k < 2; k++) for (const dv of [-0.76, 0.76]) {                                                                                  // the two tram tracks (the leaf is flat: the track offset is constant)
    const vc = trackV(k, U_HINGE + S / 2) + dv;
    P.quad(M.tramRail, [0, 0.035, vc - 0.035], [S, 0.035, vc - 0.035], [S, 0.035, vc + 0.035], [0, 0.035, vc + 0.035], [0, 1, 0]);
  }
  // ---------------------------------------------------------------- the deep girder: the plate fascia on both faces (the lower chord curves up toward the tip), the cornice, the soffit, five inner girders
  const nF = Math.max(6, Math.round(S / 3));
  for (const sg of [-1, 1]) {
    const v = sg * HW, pts = [];
    for (let i = 0; i <= nF; i++) { const s = S * i / nF; pts.push([s, -girderDepth(s)]); }
    for (let i = nF; i >= 0; i--) pts.push([S * i / nF, -0.22]);
    faceShape(M.steelTroitsky, pts, v + sg * 0.02, sg, 2.4);
    P.quad(M.railSage, [0, -0.34, v + sg * 0.12], [S, -0.34, v + sg * 0.12], [S, PAVE, v + sg * 0.12], [0, PAVE, v + sg * 0.12], [0, 0, sg]);
    P.quad(M.railSage, [0, PAVE, v + sg * 0.12], [S, PAVE, v + sg * 0.12], [S, PAVE, v - sg * 0.3], [0, PAVE, v - sg * 0.3], [0, 1, 0]);
  }
  for (let i = 0; i < nF; i++) {
    const s0 = S * i / nF, s1 = S * (i + 1) / nF, d0 = girderDepth(s0) + 0.02, d1 = girderDepth(s1) + 0.02;
    P.quad(M.steelTroitskyDark, [s0, -d0, -HW], [s1, -d1, -HW], [s1, -d1, HW], [s0, -d0, HW], [0, -1, 0]);
    for (const vv of [-8, -4, 0, 4, 8]) {
      for (const w of [-0.12, 0.12]) P.quad(M.steelTroitsky, [s0, -d0 - 0.5, vv + w], [s1, -d1 - 0.5, vv + w], [s1, -d1, vv + w], [s0, -d0, vv + w], [0, 0, w < 0 ? -1 : 1]);
      P.quad(M.steelTroitskyDark, [s0, -d0 - 0.5, vv - 0.12], [s1, -d1 - 0.5, vv - 0.12], [s1, -d1 - 0.5, vv + 0.12], [s0, -d0 - 0.5, vv + 0.12], [0, -1, 0]);
    }
  }
  // the end plates: the tip (resting on the 12.1 m pier) and the hinge housing
  P.box(M.steelTroitskyDark, S - 0.05, S + 0.08, -girderDepth(S), PAVE, -HW, HW, '', 1.6);
  P.box(M.steelTroitskyDark, -0.3, 0.05, -girderDepth(0), PAVE, -HW, HW, '', 1.6);
  // ---------------------------------------------------------------- the counterweight: on the BANK side of the hinge (s < 0), under the first span; it swings DOWN into the pit as the leaf rises (the pit is the dark under-span of the bank:
  // everything below the street is hidden by the ground / the quay wall). Two steel lever arms and a concrete block.
  for (const sg of [-1, 1]) P.box(M.steelTroitskyDark, -10.6, 0.1, -1.55, -0.55, sg * (HW - 1.7) - 0.45, sg * (HW - 1.7) + 0.45, '', 1.6);
  P.box(M.concreteRust || M.graniteDark, -10.6, -3.4, -3.9, -0.55, -HW + 2.4, HW - 2.4, '', 2.2);
  P.box(M.steelTroitskyDark, -10.7, -3.3, -4.0, -3.9, -HW + 2.3, HW - 2.3, '', 1.6);
  // ---------------------------------------------------------------- the lamp pair (u 36.7) and the contact-wire pole (u 40.3) that stand on the leaf, fixed to it
  for (const sg of [-1, 1]) lampT(P, M, 36.7 - U_HINGE, PAVE, sg * (ROAD + KERB + 0.28), 0);
  contactPoleT(P, M, 40.3 - U_HINGE, 0.14, 0, Math.PI / 2, 3.4);
  // ---------------------------------------------------------------- the whip railing: posts with pyramid caps and a top rail (Parts), the panels as ONE instanced mesh of alpha-cut planes (it moves with the leaf)
  const nb = Math.round(S / G_RAIL), bw = S / nb, postMat = M.railSage;
  for (const sg of [-1, 1]) {
    const v = sg * (HW - 0.14);
    for (let i = 0; i < nb; i++) P.quad(postMat, [bw * i, PAVE + 1.2, v - 0.06], [bw * (i + 1), PAVE + 1.2, v - 0.06], [bw * (i + 1), PAVE + 1.2, v + 0.06], [bw * i, PAVE + 1.2, v + 0.06], [0, 1, 0]);
    for (let i = 0; i <= nb; i++) {
      const s = bw * i;
      P.box(postMat, s - 0.11, s + 0.11, PAVE, PAVE + 1.25, v - 0.11, v + 0.11, 'b', 1);
      P.push(s, PAVE + 1.25, v, Math.PI / 4); P.cyl(postMat, [0, 0, 0], [0, 0.07, 0], 0.2, 0.2, 4, true); P.cyl(postMat, [0, 0.07, 0], [0, 0.24, 0], 0.17, 0.01, 4, false); P.pop();
    }
  }
  const meshes = P.build(body, { name: 'troitsky-leaf' });
  const spec = railSpec('whip'), geo = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), im = new THREE.InstancedMesh(geo, railMat(ctx, 'whip', RAIL_HEX), 2 * nb), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  let k = 0; for (const sg of [-1, 1]) for (let i = 0; i < nb; i++) { m4.compose(ps.set(bw * i + 0.04, PAVE, sg * (HW - 0.14)), q, sc.set(bw - 0.08, spec.H, 1)); im.setMatrixAt(k++, m4); }
  im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = false; im.name = 'troitsky-leaf-rail'; im.frustumCulled = false; ctx.noOutline(im); body.add(im);
  ctx.add(outer);                                                                                         // the dynamic root: never merged, matrices live
  const tris = P.tris + nb * 4;

  // ---------------------------------------------------------------- physics: the floor (three ramps overwritten per frame, service.js) and the dynamic colliders (the rails and the barrier kerbs)
  const ph = ctx.physics;
  let items = [], theta = 0;
  const colliders = () => { items = createRamps(ph); return items.length; };
  const boxes = [], near = { x: 0, z: 0, r2: 160 * 160 }, NONE = [];
  { const c = toWorld(U_HINGE + S / 2, 0); near.x = c.x; near.z = c.z; }
  ph.addDynamic(() => {
    const pp = ctx.player && ctx.player.position;
    if (pp) { const dx = pp.x - near.x, dz = pp.z - near.z; if (dx * dx + dz * dz > near.r2) return NONE; }      // nobody within 160 m: nothing to collide with
    return leafBoxes(theta, boxes);
  });

  return {
    outer, pivot, meshes, tris, colliders, items: () => items,
    /** set the opening angle: the transform of the pivot and the three floor ramps */
    set(th) { theta = th; pivot.rotation.z = th; placeRamps(items, th); },
    get theta() { return theta; },
    info: { rails: 2 * nb },
  };
}
