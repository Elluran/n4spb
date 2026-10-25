// world/lib/bascule-bays.js - BREAKABLE RAILS AND KERBS OF A MOVING BASCULE LEAF (the three.js part of the bay machinery; the pure part is lib/bascule.js leafBays / leafBayAt; docs/AREAS.md 13.8, 13.10).
// The owner's rule (CLAUDE.md): every fence, railing and kerb of the world breaks. A leaf of a bascule bridge moves, so its bays cannot be the fixed bays of lib/fence-bays.js (a thin static collider at a fixed place);
// the Troitsky leaf solved it with knock records whose instances live in WORLD-frame knock meshes that the leaf re-poses, and this file does the same for any leaf described by lib/bascule.js (any hinge, either
// direction, any number of leaves: the Palace Bridge builds two):
//   with ctx.knock  every bay is a KNOCK RECORD of its own (`rec`, kind 'fence'), its instance lives in a world-frame knock mesh (lib/knock-inst.js, one per 384 m cell and part) and `set(theta)` re-poses it whenever the
//                   angle changes: the record's origin, the rest offsets of its part (core/knock.js makePart: off / q / s) and the instance matrix follow the leaf, so a hit at ANY angle breaks the bay from the pose
//                   it has now (it topples about its foot, sparks and clank; a bay that falls over open water sinks and is gone). Its collider is a DYNAMIC box (`bay.box`, the record's own `src`: the protocol
//                   of drive/collision.js: a car hit goes through the ordinary invMassRatio / applyCarImpulse, nothing leaf-specific); `boxes(pool)` lists the boxes of the standing bays for the physics provider.
//                   RULE for what is left lying: the debris of a broken bay stays where it fell (a rest box <= 0.42 m, a car drives over it) only while the leaf lies closed; the moment the leaf moves it is swept
//                   away (rest box removed, instance hidden: the bridge crew); a broken bay is never rebuilt (nothing in the world is repaired); the posts and the top rail strip of the railing stay drawn.
//   without ctx.knock (tools/check.mjs of one module, a harness): the rail panels ride in the moving group as ONE instanced mesh (added to `body`), the kerbs are drawn by the caller, the bays are plain dynamic boxes.
// Nothing is allocated per frame: `set` reuses module scratch objects and runs only when the angle changed (the module calls it so); `boxes` appends the existing box objects.
import * as THREE from 'three';
import { knockInstances } from './knock-inst.js';
import { leafBayAt } from './bascule.js';

const AXZ = new THREE.Vector3(0, 0, 1), ONE = new THREE.Vector3(1, 1, 1), IDQ = new THREE.Quaternion(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const qZ = new THREE.Quaternion(), qB = new THREE.Quaternion(), Mb = new THREE.Matrix4(), Ml = new THREE.Matrix4(), Mw = new THREE.Matrix4();
const _p = new THREE.Vector3(), _pp = new THREE.Vector3(), _qq = new THREE.Quaternion(), _s = new THREE.Vector3(), _o = new THREE.Vector3(), SC = {}, touched = new Set();

/**
 * createLeafBays(ctx, { B, leaf, outer, body, bays, rail, kerb, name }) -> { bays, set(th), boxes(pool), info }
 *   B, leaf      the bridge description and the leaf (lib/bascule.js makeLeaf)
 *   outer, body  the THREE groups of the leaf (outer: at the hinge, turned about y; body: the rest-tilt group): `outer` gives the frame, `body` takes the plain rail mesh without ctx.knock
 *   bays         lib/bascule.js leafBays(leaf, spec)
 *   rail, kerb   { geo (a unit geometry: x 0..1 along the bay; the rail panel is scaled by its height sy), mat, far, shadow?, receive?, noOutline?, rec(bay) -> the knock record template { kind: 'fence', mass, h, r, w, d, anchored, ... } }
 *                (kerb is optional: without ctx.knock the caller draws it into the moving group)
 *   name         mesh name prefix
 */
export function createLeafBays(ctx, { B, leaf, outer, body, bays, rail, kerb = null, name }) {
  const knock = !!ctx.knock, dir = leaf.dir, T = B.frame.T, qOuter = outer.quaternion.clone(), hinge = outer.position.clone();
  const lz = (b) => dir * b.v;                                  // the body's local z is +v for a leaf that points toward +u and -v for the other (its outer group is turned by pi)
  /** the body-to-world matrix of the leaf at opening angle th = outer (hinge, turned) * pivot (th about z) * body (alpha0 about z) */
  const bodyMatrix = (th) => { qZ.setFromAxisAngle(AXZ, th + leaf.alpha0); return Mb.compose(hinge, qB.copy(qOuter).multiply(qZ), ONE); };
  /** the world matrix of a bay (its unit geometry x 0..1 scaled by the length) for the current bodyMatrix */
  const bayMatrix = (b, out) => out.multiplyMatrices(Mb, Ml.compose(_p.set(b.s0, b.n, lz(b)), IDQ, _s.set(b.len, b.sy, 1)));
  /** the world position of the foot of a bay at its middle (the origin of its knock record) for the current bodyMatrix */
  const foot = (b, out) => out.set(b.s0 + b.len / 2, b.n, lz(b)).applyMatrix4(Mb);

  if (knock) {
    const makeSet = (suffix, list, part) => {
      if (!list.length) return;
      bodyMatrix(0);
      const spots = list.map((b) => { const o = foot(b, _o); return { x: o.x, y: o.y, z: o.z, rotY: -T }; });
      const res = knockInstances(ctx, { name: name + '-' + suffix, parts: [{ geo: part.geo, mat: part.mat, name: part.name || suffix, noOutline: part.noOutline, shadow: part.shadow ?? true, receive: part.receive ?? true, far: part.far, place: (s, i) => bayMatrix(list[i], new THREE.Matrix4()) }], spots, rec: (s, i) => ({ ...part.rec(list[i]) }), far: part.far });
      list.forEach((b, i) => { b.rec = res.records[i]; if (b.rec) { b.box = b.rec.src; b.rec.dynamic = true; } });      // (dynamic: its collider is the box of the physics provider, not a physics item: tools read the flag)
    };
    makeSet('rail', bays.filter((b) => b.rail), { name: 'rail', noOutline: true, shadow: true, receive: false, ...rail });
    if (kerb) makeSet('kerb', bays.filter((b) => !b.rail), { name: 'kerb', shadow: true, receive: true, ...kerb });
  } else {
    const rails = bays.filter((b) => b.rail), im = new THREE.InstancedMesh(rail.geo, rail.mat, rails.length), m4 = new THREE.Matrix4();
    rails.forEach((b, i) => { m4.compose(_p.set(b.s0, b.n, lz(b)), IDQ, _s.set(b.len, b.sy, 1)); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = false; im.name = name + '-rail'; im.frustumCulled = false; ctx.noOutline(im); body.add(im);
  }

  /** the bays at opening angle th: the boxes and (with knock) the pose of every STANDING record; the debris that lies on the moving leaf is swept away (the rule in the header). Runs when the angle changed. */
  const set = (th) => {
    bodyMatrix(th);
    for (let i = 0; i < bays.length; i++) {
      const b = bays[i], t = leafBayAt(B, leaf, th, b.s0 + b.len / 2, b.len, b.v, b.k, SC), bx = b.box, r = b.rec;
      bx.cx = t.cx; bx.cz = t.cz; bx.w = t.w; bx.d = t.d; bx.rotY = t.rotY; bx.y0 = t.y0; bx.y1 = t.y1;
      if (!r) continue;
      if (r.state === 'stand') {
        const o = foot(b, _o); r.x = o.x; r.y = o.y; r.z = o.z; r.rotY = -T;
        const p0 = r.parts[0]; if (!p0) continue;
        bayMatrix(b, Mw).decompose(_pp, _qq, _s);
        p0.off.set(_pp.x - o.x, _pp.y - o.y, _pp.z - o.z); p0.q.copy(_qq); p0.s.copy(_s);
        if (!r.wobble && p0.mesh) { p0.mesh.setMatrixAt(p0.index, Mw); touched.add(p0.mesh); }
      } else if (r.state === 'rest' && th > 1e-3) {
        for (const c of r.items) ctx.physics.remove(c);
        r.items = []; r.item = null; r.state = 'lost';
        for (const p of r.parts) if (p.mesh) { p.mesh.setMatrixAt(p.index, ZERO); touched.add(p.mesh); }
      }
    }
    for (const m of touched) m.instanceMatrix.needsUpdate = true;
    touched.clear();
  };
  /** append the collider boxes of the STANDING bays to `pool`; returns the pool */
  const boxes = (pool) => { for (let i = 0; i < bays.length; i++) { const b = bays[i]; if (!b.rec || b.rec.state === 'stand') pool.push(b.box); } return pool; };
  return { bays, set, boxes, info: { rails: bays.filter((b) => b.rail).length, kerbs: bays.filter((b) => !b.rail).length } };
}
