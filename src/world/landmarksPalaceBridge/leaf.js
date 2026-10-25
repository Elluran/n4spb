// landmarksPalaceBridge/leaf.js - the TWO BASCULE LEAVES of the Palace Bridge: the moving parts (each ~28.7 m of deck with its fish-belly steel girders, granite barrier kerbs, asphalt pavements, markings, the cast-iron railing, one
// lamp standard per side, a counterweight on the pier side of the hinge), their physics and their dynamic colliders. Everything is a handful of meshes moved by TRANSFORM (no geometry rebuild); the physics floor is ONE walk
// ramp per leaf whose numbers are overwritten per frame (lib/bascule.js placeRamp: an item mutated at run time, the way a conveyor's `dir` is, no re-insert of grid cells: the footprint of the raised leaf lies inside the footprint
// of the closed one); the railings and the barrier kerbs are BAYS (lib/bascule.js leafBays, lib/bascule-bays.js: a knock record with a dynamic box each, re-posed with the leaf; docs/AREAS.md 13.10): boxes that follow the leaves'
// surfaces, one per bay of at most 2.5 m, short enough for the slope under them.
// Frames: the OUTER group of a leaf stands at its hinge line (u = U0 / U1) turned about y so that its local x runs from the hinge TOWARD THE MIDDLE (A: along +u, B: along -u: local z = +v / -v, the deck is symmetric
// across); PIVOT turns by theta about z (the opening: A and B rotate in OPPOSITE senses of the bridge frame); BODY turns by the rest tilt ALPHA0 so that its x axis runs along the deck surface: body coordinates
// (s, n, v) = (distance from the hinge along the surface, height above the surface, across). The closed leaf is the chord of the deck profile, within a few centimetres of the fixed deck.
// Rails and kerbs: the fixed bridge's railing panels are breakable bays (bridges/rails.js, docs/AREAS.md 13.7); the rail panels and the barrier kerb pieces of a MOVING leaf are breakable too (the owner's rule: everything that
// blocks breaks): knock records whose instances live in world-frame knock meshes that `set(theta)` re-poses, and whose collider is the record's own dynamic box (as the Troitsky leaf, 13.8; 13.10). The lamps of a leaf have
// no collider (nothing to hit or break).
import * as THREE from 'three';
import { railMat, railSpec, RAIL_FAR } from '../bridges/rails.js';
import { Parts } from '../bridges/kit.js';
import { unitBox } from '../lib/fence-bays.js';
import { createLeafBays } from '../lib/bascule-bays.js';
import { FR, HW, ROAD, KERB, PAVE, KERB_H, toWorld } from './frame.js';
import { BRIDGE, LEAVES, createRamps, placeRamps, makeBays } from './service.js';

const IRON_HEX = '#45664f', NEAR_R = 160;
const VP0 = ROAD + KERB, VP1 = HW + 0.1;
/** the depth of the lens-shaped girder under the deck line at u (the fixed bridge's span 2 of bridges/palace.js: 1.2 m at the supports .. 2.9 m at mid-span, 0.45 m of the deck) */
const girderDepth = (u) => { const t = (u - 124.25) / 38.5; return 0.45 + 1.2 + (2.9 - 1.2) * (1 - t * t); };
const LAMP_U = { A: 111, B: 137.5 };                       // the lamp standards of the fixed bridge that stand on the leaves (bridges/palace.js skips them when the leaves are drawn here)

export function buildLeaves(env) {
  const { ctx, M } = env, T = FR.T, FI = M.fasPalace || M.fasIron;
  const ironMat = ctx.mat.toon(IRON_HEX, { paint: 0.03, name: 'brg-palace-rail' });
  const outers = [], pivots = [], bodies = [], meshes = [], sets = [], knock = !!ctx.knock;
  let tris = 0, railCount = 0, kerbCount = 0;
  const spec = railSpec('palace');

  for (const lf of LEAVES) {
    const P = new Parts(), S = lf.S, dir = lf.dir, gB = (s) => girderDepth(lf.uHinge + dir * s);
    const outer = new THREE.Group(), pivot = new THREE.Group(), body = new THREE.Group();
    outer.name = 'palacebridge-leaf-' + lf.id; const hw = toWorld(lf.uHinge, 0); outer.position.set(hw.x, lf.yHinge, hw.z); outer.rotation.y = -T + (dir < 0 ? Math.PI : 0);
    body.rotation.z = lf.alpha0; pivot.add(body); outer.add(pivot);
    const faceShape = (mat, pts, v, sg, tile = 2.2) => {
      const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
      const g = new THREE.ShapeGeometry(sh, 1), pa = g.attributes.position, ua = g.attributes.uv, na = g.attributes.normal;
      for (let i = 0; i < pa.count; i++) { ua.setXY(i, pa.getX(i) / tile, pa.getY(i) / tile); na.setZ(i, sg); }
      if (sg < 0) { const ix = g.index; for (let i = 0; i < ix.count; i += 3) { const a = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, a); } }
      P.geo(mat, g, 0, 0, v); g.dispose();
    };
    // ---------------------------------------------------------------- deck: asphalt, granite barrier kerbs, asphalt pavements, markings (body frame: x = s, y = n)
    const n = Math.max(2, Math.ceil(S / 3.2));
    for (let i = 0; i < n; i++) {
      const s0 = S * i / n, s1 = S * (i + 1) / n;
      P.quad(M.asphalt, [s0, 0, -ROAD], [s1, 0, -ROAD], [s1, 0, ROAD], [s0, 0, ROAD], [0, 1, 0], [[s0 / 4, -ROAD / 4], [s1 / 4, -ROAD / 4], [s1 / 4, ROAD / 4], [s0 / 4, ROAD / 4]]);
      for (const sg of [-1, 1]) {
        const va = sg * ROAD, vb = sg * VP1, vk = sg * VP0;
        P.quad(M.footAsphalt, [s0, PAVE, vk], [s1, PAVE, vk], [s1, PAVE, vb], [s0, PAVE, vb], [0, 1, 0], [[s0 / 2.4, vk / 2.4], [s1 / 2.4, vk / 2.4], [s1 / 2.4, vb / 2.4], [s0 / 2.4, vb / 2.4]]);
        if (knock) P.quad(M.kerb, [s0, 0, va], [s1, 0, va], [s1, 0, vk], [s0, 0, vk], [0, 1, 0], [[s0, 0], [s1, 0], [s1, KERB], [s0, KERB]]);      // the deck strip under the breakable kerb pieces (below): it stays when a piece is gone
        else {                                                                                                                                   // (no ctx.knock: the kerb is part of the moving mesh and a plain box)
          P.quad(M.kerb, [s0, 0, va], [s1, 0, va], [s1, KERB_H, va], [s0, KERB_H, va], [0, 0, -sg], [[s0, 0], [s1, 0], [s1, KERB_H], [s0, KERB_H]]);
          P.quad(M.kerb, [s0, KERB_H, va], [s1, KERB_H, va], [s1, KERB_H, vk], [s0, KERB_H, vk], [0, 1, 0], [[s0, 0], [s1, 0], [s1, KERB], [s0, KERB]]);
          P.quad(M.kerb, [s0, PAVE, vk], [s1, PAVE, vk], [s1, KERB_H, vk], [s0, KERB_H, vk], [0, 0, sg], [[s0, 0], [s1, 0], [s1, KERB_H], [s0, KERB_H]]);
        }
      }
      const mk = (vc, w) => P.quad(M.mark, [s0, 0.03, vc - w], [s1, 0.03, vc - w], [s1, 0.03, vc + w], [s0, 0.03, vc + w], [0, 1, 0]);
      mk(-0.12, 0.06); mk(0.12, 0.06);
      if (i % 3 !== 2) for (const vc of [-7.3, -3.65, 3.65, 7.3]) mk(vc, 0.06);
    }
    // ---------------------------------------------------------------- the fish-belly girders: the plate fascia on both faces, the cornice, the flange line, the soffit, six inner girders
    const nF = Math.max(6, Math.round(S / 3));
    for (const sg of [-1, 1]) {
      const v = sg * (HW + 0.12), pts = [];
      for (let i = 0; i <= nF; i++) { const s = S * i / nF; pts.push([s, -gB(s)]); }
      for (let i = nF; i >= 0; i--) pts.push([S * i / nF, -0.32]);
      faceShape(FI, pts, v, sg);
      for (let i = 0; i < nF; i++) {
        const s0 = S * i / nF, s1 = S * (i + 1) / nF;
        P.quad(M.copingDark, [s0, -0.32, v + sg * 0.1], [s1, -0.32, v + sg * 0.1], [s1, 0, v + sg * 0.1], [s0, 0, v + sg * 0.1], [0, 0, sg]);
        P.quad(M.copingDark, [s0, 0, v + sg * 0.1], [s1, 0, v + sg * 0.1], [s1, 0, v - sg * 0.4], [s0, 0, v - sg * 0.4], [0, 1, 0]);
        P.quad(FI, [s0, -gB(s0) - 0.12, v + sg * 0.05], [s1, -gB(s1) - 0.12, v + sg * 0.05], [s1, -gB(s1), v + sg * 0.05], [s0, -gB(s0), v + sg * 0.05], [0, 0, sg]);
      }
    }
    for (let i = 0; i < nF; i++) {
      const s0 = S * i / nF, s1 = S * (i + 1) / nF;
      P.quad(M.soffitIron, [s0, -gB(s0), -HW - 0.12], [s1, -gB(s1), -HW - 0.12], [s1, -gB(s1), HW + 0.12], [s0, -gB(s0), HW + 0.12], [0, -1, 0]);
      for (let g = -3; g <= 3; g++) { const v = g * 3.6; if (Math.abs(v) < 0.1) continue; P.quad(FI, [s0, -gB(s0) - 0.35, v - 0.1], [s1, -gB(s1) - 0.35, v - 0.1], [s1, -gB(s1) - 0.35, v + 0.1], [s0, -gB(s0) - 0.35, v + 0.1], [0, -1, 0]); }
    }
    // the end plates: the tip (the seam of the two leaves at the midspan; the free end that stands up in the air when the bridge is open) and the hinge housing
    P.box(FI, S - 0.04, S + 0.04, -gB(S), 0.0, -HW - 0.12, HW + 0.12, '', 1.6);
    P.box(FI, -0.3, 0.02, -gB(0), -0.02, -HW - 0.12, HW + 0.12, 't', 1.6);
    // ---------------------------------------------------------------- the counterweight: on the PIER side of the hinge (s < 0), inside the pier body; it swings DOWN into the pier as the leaf rises (two steel lever arms and a concrete block)
    const cw = lf.cwLen;
    for (const sg of [-1, 1]) P.box(M.soffitIron, -cw - 0.2, 0.1, -1.55, -0.6, sg * (HW - 2.2) - 0.45, sg * (HW - 2.2) + 0.45, '', 1.6);
    P.box(M.concreteRust || M.graniteDark, -cw - 0.2, -3.2, -3.2, -0.6, -HW + 3.0, HW - 3.0, '', 2.2);
    // ---------------------------------------------------------------- the lamp standards on the leaf (the two of the fixed bridge's list that stand on this span), fixed to it
    const lampS = dir > 0 ? LAMP_U[lf.id] - lf.uHinge : lf.uHinge - LAMP_U[lf.id];
    for (const sg of [-1, 1]) {
      const x = lampS, y = 0.12, z = sg * (HW - 0.7);
      P.cyl(FI, [x, y, z], [x, y + 0.7, z], 0.26, 0.17, 8, true);
      P.cyl(FI, [x, y + 0.7, z], [x, y + 7.6, z], 0.12, 0.07, 8, false);
      P.cyl(M.gold, [x, y + 1.1, z], [x, y + 1.22, z], 0.15, 0.15, 8, true);
      for (const s2 of [-1, 1]) {
        P.cyl(FI, [x, y + 7.2, z], [x, y + 7.45, z + s2 * 0.5], 0.035, 0.03, 4, false);
        P.cyl(M.lampGlass, [x, y + 6.7, z + s2 * 0.5], [x, y + 7.25, z + s2 * 0.5], 0.2, 0.22, 6, false);
        P.cyl(M.iron, [x, y + 7.25, z + s2 * 0.5], [x, y + 7.6, z + s2 * 0.5], 0.27, 0.02, 6, true);
        P.cyl(M.iron, [x, y + 6.62, z + s2 * 0.5], [x, y + 6.7, z + s2 * 0.5], 0.14, 0.2, 6, true);
      }
    }
    // ---------------------------------------------------------------- the railing: posts with caps and a top rail (Parts), the panels as ONE instanced mesh of alpha-cut planes (it moves with the leaf)
    const nb = Math.max(2, Math.round(S / spec.W)), bw = S / nb;
    for (const sg of [-1, 1]) {
      const v = sg * (HW - 0.14);
      for (let i = 0; i < nb; i++) P.quad(ironMat, [bw * i, 1.2 + 0.12, v - 0.05], [bw * (i + 1), 1.2 + 0.12, v - 0.05], [bw * (i + 1), 1.2 + 0.12, v + 0.05], [bw * i, 1.2 + 0.12, v + 0.05], [0, 1, 0]);
      for (let i = 0; i <= nb; i++) { const s = bw * i; P.box(ironMat, s - 0.12, s + 0.12, PAVE, PAVE + 1.3, v - 0.12, v + 0.12, 'b', 1); P.box(ironMat, s - 0.16, s + 0.16, PAVE + 1.25, PAVE + 1.34, v - 0.16, v + 0.16, 'b', 1); }
    }
    const ms = P.build(body, { name: 'palacebridge-leaf-' + lf.id });
    for (const m of ms) if (M.decalMats.has(m.material)) ctx.noOutline(m);
    meshes.push(...ms);
    ctx.add(outer);                                                                                         // the dynamic root: never merged, matrices live
    // the BAYS of the two rails and the two barrier kerbs of this leaf (docs/AREAS.md 13.10): breakable knock records that ride on it (lib/bascule-bays.js)
    const bays = makeBays(lf, spec), kl = bays.find((b) => !b.rail).len;
    for (const b of bays) b.leaf = lf;
    const lb = createLeafBays(ctx, {
      B: BRIDGE, leaf: lf, outer, body, bays, name: 'palacebridge-leaf-' + lf.id,
      rail: { geo: new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), mat: railMat(ctx, 'palace', IRON_HEX), far: RAIL_FAR, rec: (b) => ({ kind: 'fence', mass: 60, h: spec.H, r: 0.04, w: b.len, d: 0.3, anchored: 12, hitK: 0.2, metal: true, minDv: 0 }) },
      kerb: { geo: unitBox(0, KERB_H, -KERB / 2, KERB / 2, { uLen: kl }), mat: M.kerb, far: 450, rec: (b) => ({ kind: 'fence', mass: 900, h: KERB_H, r: 0.2, w: b.len, d: KERB, anchored: 30, hitK: 0.4, metal: false, minDv: 0 }) },
    });
    sets.push(lb);
    tris += P.tris + lb.info.rails * 2 + (knock ? lb.info.kerbs * 10 : 0); railCount += lb.info.rails; kerbCount += lb.info.kerbs;
    outers.push(outer); pivots.push(pivot); bodies.push(body);
  }

  // ---------------------------------------------------------------- physics: the floor (one ramp per leaf, overwritten per frame) and the dynamic colliders (one box per STANDING bay of the railings and the barrier kerbs of both leaves)
  const ph = ctx.physics;
  let items = [], theta = 0;
  const colliders = () => { items = createRamps(ph); return items.length; };
  const boxes = [], near = { x: 0, z: 0 }, NONE = [], r2 = NEAR_R * NEAR_R;      // (the boxes of the STANDING bays: the knock records' own sources; broken bays drop out)
  { const c = toWorld((LEAVES[0].uHinge + LEAVES[1].uHinge) / 2, 0); near.x = c.x; near.z = c.z; }
  const provide = () => {
    const pp = ctx.player && ctx.player.position;
    if (pp) { const dx = pp.x - near.x, dz = pp.z - near.z; if (dx * dx + dz * dz > r2) return NONE; }      // nobody within 160 m: nothing to collide with
    boxes.length = 0; for (let i = 0; i < sets.length; i++) sets[i].boxes(boxes);
    return boxes;
  };
  provide.stableBoxes = true;                                                                              // the same box objects every call (the bays' own sources): physics.refreshDynamic keeps one OBB per box
  ph.addDynamic(provide);

  return {
    outers, pivots, bodies, meshes, tris, colliders, items: () => items,
    /** set the opening angle (rad): the transform of both pivots (A turns by +theta, B by +theta about its own local z: the opposite sense in the bridge frame), the two floor ramps and the pose of the bays (the module calls it only when the angle changed) */
    set(th) { theta = th; for (const p of pivots) p.rotation.z = th; placeRamps(items, th); for (let i = 0; i < sets.length; i++) sets[i].set(th); },
    get theta() { return theta; },
    bays: sets.flatMap((q) => q.bays), info: { rails: railCount, kerbs: kerbCount },
  };
}
