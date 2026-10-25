// world/lib/bascule-gates.js - the SOLID, BREAKABLE road barriers of a bascule bridge (docs/AREAS.md 13.8, 13.10, 13.11). The red-and-white booms that drop across the carriageway and the pavements when the bridge is
// about to open used to be a picture only (a car drove through them). Here every boom is
//   * a KNOCK RECORD (kind 'fence', anchored: it holds a car that touches it below ARM_BREAK km/h, above that it breaks off, topples and lies on the road as a low rest box, like every other fence of the world),
//     whose instances (the red stripes, the white stripes, the counterweight stub) live in world-frame knock meshes (lib/knock-inst.js) that `set(barrier)` re-poses while the boom swings down or up;
//   * a DYNAMIC collider box (the record's own `src`, the protocol of drive/collision.js, as the rail and kerb bays of lib/bascule-bays.js) that exists only while the boom is (nearly) down: `boxes(pool)` appends
//     the boxes of the STANDING booms whose angle above the road is at most BOX_PSI (20 degrees); a raised boom (72 degrees) is no obstacle.
// A broken boom stays broken until the NEXT CYCLE starts: the module calls `restore()` on the 'warn' event, which re-arms every record (core/knock.js restore: the flying body is dropped, the rest box removed) and
// puts it back at its post. The NPC stop logic (stop lines, the pedestrian gate walls of lib/bascule.js) does not look at any of this and works as it did.
// Nothing is allocated per frame: `set` writes into module scratch objects and runs only when the barrier value changed (or after a restore).
import * as THREE from 'three';
import { knockInstances } from './knock-inst.js';

export const ARM_Y = 0.95;                 // m: the axis of the boom above the foot of its post
export const ARM_UP = 72 * Math.PI / 180;  // rad: the raised boom
export const BOX_PSI = 20 * Math.PI / 180; // rad: above this the boom has no collider box
export const ARM_BREAK = 15;               // km/h of the car at contact: below it the boom holds (the car stops on it), above it the boom breaks off
const UPV = new THREE.Vector3(0, 1, 0), AXZ = new THREE.Vector3(0, 0, 1), ONE = new THREE.Vector3(1, 1, 1);
const qY = new THREE.Quaternion(), qZ = new THREE.Quaternion(), qA = new THREE.Quaternion(), _p = new THREE.Vector3(), _pp = new THREE.Vector3(), _s = new THREE.Vector3(), _qq = new THREE.Quaternion(), M4 = new THREE.Matrix4(), touched = new Set();

/** a geometry of axis-aligned boxes [x0, x1, y0, y1, z0, z1] (flat normals, uv in metres) */
export function boxesGeo(list) {
  const pos = [], nrm = [], uv = [], idx = [];
  const face = (a, b, c, d, n) => { const k = pos.length / 3; for (const p of [a, b, c, d]) { pos.push(...p); nrm.push(...n); } uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  for (const [x0, x1, y0, y1, z0, z1] of list) {
    face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]); face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
    face([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]); face([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
    face([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]); face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeBoundingSphere(); return g;
}
/** the unit boom (x 0..1 along the boom, 0.1 x 0.1 across): n stripes, the even ones (parity 0) or the odd ones (parity 1) */
const stripes = (n, parity) => { const l = []; for (let i = parity; i < n; i += 2) l.push([i / n, (i + 1) / n, -0.05, 0.05, -0.05, 0.05]); return boxesGeo(l); };

/**
 * createBarrierArms(ctx, { name, toWorld, arms, mats: { red, white, post }, near }) -> { count, arms, set(barrier), restore(), boxes(pool), tip(i, out), info }
 *   toWorld(u, v, out) -> { x, z }   the frame of the bridge
 *   arms   [{ u, v (the post), to (the tip, at the lowered pose), y0 (the foot of the post), ped }]
 *   near   optional { x, z, r }: the provider hands out nothing while the player is farther than r from (x, z) (like the leaf bays)
 * Each arm: { u, v, to, y0, len, p (post, world), dx, dz (the direction toward the tip), yaw, box, rec, refs: [{ mesh, index }] x 3, state }.
 */
export function createBarrierArms(ctx, { name, toWorld, arms: specs, mats, near = null }) {
  const knock = !!ctx.knock, arms = [];
  for (const s of specs) {
    const a = toWorld(s.u, s.v, { x: 0, z: 0 }), b = toWorld(s.u, s.to, { x: 0, z: 0 }), len = Math.abs(s.v - s.to), dx = (b.x - a.x) / len, dz = (b.z - a.z) / len;
    arms.push({ ...s, len, px: a.x, pz: a.z, dx, dz, yaw: Math.atan2(-dz, dx), rec: null, refs: null, box: { cx: 0, cz: 0, w: len, d: 0.3, rotY: 0, y0: 0, y1: 1 }, spotIndex: 0, cls: s.ped ? 'ped' : 'road' });
  }
  const stub = boxesGeo([[-0.45, 0, -0.09, 0.09, -0.09, 0.09]]), geos = { road: { r: stripes(12, 0), w: stripes(12, 1) }, ped: { r: stripes(4, 0), w: stripes(4, 1) } };
  /** the world matrix of part k (0 red, 1 white, 2 stub) of arm a with the boom raised by psi above the road */
  const matrix = (a, psi, k, out) => {
    qY.setFromAxisAngle(UPV, a.yaw); qZ.setFromAxisAngle(AXZ, psi);
    return out.compose(_p.set(a.px, a.y0 + ARM_Y, a.pz), qA.copy(qY).multiply(qZ), k === 2 ? ONE : _s.set(a.len, 1, 1));
  };
  for (const cls of ['road', 'ped']) {
    const list = arms.filter((a) => a.cls === cls); if (!list.length) continue;
    list.forEach((a, i) => { a.spotIndex = i; });
    const spots = list.map((a) => ({ x: a.px + a.dx * a.len / 2, y: a.y0, z: a.pz + a.dz * a.len / 2, rotY: a.yaw }));      // (the record stands at the middle of the lowered boom: it topples about that)
    const place = (k) => (s, i) => matrix(list[i], ARM_UP, k, new THREE.Matrix4());
    const res = knockInstances(ctx, {
      name: name + '-' + cls, spots, far: 450,
      parts: [{ geo: geos[cls].r, mat: mats.red, name: 'red', noOutline: true, shadow: true, receive: false, place: place(0) }, { geo: geos[cls].w, mat: mats.white, name: 'white', noOutline: true, shadow: true, receive: false, place: place(1) },
        { geo: stub, mat: mats.post, name: 'stub', noOutline: true, shadow: true, receive: false, place: place(2) }],
      rec: (s, i) => ({ kind: 'fence', mass: 40, h: 1.0, r: 0.06, w: list[i].len, d: 0.3, anchored: ARM_BREAK, hitK: 0.15, metal: true, minDv: 0, originY: ARM_Y }),
    });
    list.forEach((a, i) => {
      a.rec = res.records[i] || null;
      if (a.rec) { a.box = a.rec.src; a.rec.dynamic = true; a.refs = a.rec.parts; }
      else a.refs = res.meshes.map((mesh) => ({ mesh, index: i }));
    });
  }
  let last = -1, nowBarrier = 0;
  /** pose every STANDING arm for barrier = 0 (up) .. 1 (down); force = also when the value is the same (after a restore) */
  const set = (barrier, force = false) => {
    if (barrier === last && !force) return;
    last = barrier; nowBarrier = barrier;
    const psi = (1 - barrier) * ARM_UP, c = Math.cos(psi), sn = Math.sin(psi);
    for (let i = 0; i < arms.length; i++) {
      const a = arms[i], r = a.rec, bx = a.box;
      if (r && r.state !== 'stand') continue;
      const run = a.len * c;
      bx.cx = a.px + a.dx * run / 2; bx.cz = a.pz + a.dz * run / 2; bx.w = run + 0.1; bx.d = 0.3; bx.rotY = a.yaw; bx.y0 = a.y0 + ARM_Y - 0.15; bx.y1 = a.y0 + ARM_Y + a.len * sn + 0.15;
      for (let k = 0; k < a.refs.length; k++) {
        const ref = a.refs[k]; matrix(a, psi, k, M4);
        if (r) {
          const p = r.parts[k]; M4.decompose(_pp, _qq, _s);
          p.off.set(_pp.x - r.x, _pp.y - (r.y + ARM_Y), _pp.z - r.z); p.q.copy(_qq); p.s.copy(_s);
          if (r.wobble) continue;
        }
        ref.mesh.setMatrixAt(ref.index, M4); touched.add(ref.mesh);
      }
    }
    for (const m of touched) m.instanceMatrix.needsUpdate = true;
    touched.clear();
  };
  /** re-arm every broken boom (the module calls it when the next cycle starts); returns how many came back */
  const restore = () => {
    let n = 0;
    if (ctx.knock && ctx.knock.restore) for (let i = 0; i < arms.length; i++) { const r = arms[i].rec; if (r && r.state !== 'stand' && ctx.knock.restore(r)) n++; }
    if (n) set(nowBarrier, true);
    return n;
  };
  const boxes = [];
  const lowAt = (1 - BOX_PSI / ARM_UP) - 1e-9, r2 = near ? near.r * near.r : 0;
  const provide = () => {
    boxes.length = 0;
    if (nowBarrier < lowAt) return boxes;                                                    // (every boom is above BOX_PSI: nothing to collide with)
    if (near) { const pp = ctx.player && ctx.player.position; if (pp) { const dx = pp.x - near.x, dz = pp.z - near.z; if (dx * dx + dz * dz > r2) return boxes; } }
    for (let i = 0; i < arms.length; i++) { const a = arms[i]; if (!a.rec || a.rec.state === 'stand') boxes.push(a.box); }
    return boxes;
  };
  provide.stableBoxes = true;
  ctx.physics.addDynamic(provide);
  set(0, true);
  const tipV = new THREE.Vector3();
  return {
    count: arms.length, arms, set, restore, boxes: provide,
    /** the world position of the tip of arm i (read back from its instance matrix: what is drawn) */
    tip(i, out = new THREE.Vector3()) { const a = arms[i], ref = a.refs[0]; ref.mesh.getMatrixAt(ref.index, M4); return out.set(1, 0, 0).applyMatrix4(M4); },
    get barrier() { return nowBarrier; },
    info: { arms: arms.length, standing: () => arms.filter((a) => !a.rec || a.rec.state === 'stand').length },
  };
}
