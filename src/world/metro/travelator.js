// metro/travelator.js — the travelator tunnel of Sportivnaya-2 (docs/research/vo-roster-metro.md section 2.3, photo refs/metro-vo s3): a straight tube on the extension of the lower hall of Sportivnaya under the
// Malaya Neva: a level run-out, a flight of 35 m, a 5 m landing, a flight of 199 m (both at 7 degrees), a level arrival; three moving lanes (two toward the island, one back), stainless balustrades
// with handrails, a pale blue-grey tube with thin blue ribs, fluorescent lamps. Built in the frame of the hall (x lateral, z along the hall axis, y absolute); the profile is a list of segments.
//   lanes: x = -1.9 (the right-hand one when walking away from the station: UP, toward the island), 0 (UP), +1.9 (DOWN, toward the station)
//   the belts scroll with the lane direction (only while the camera is within 120 m); the physics surface of each flight is a conveyor ramp (physics.addEscalator, 0.9 m/s).
import * as THREE from 'three';
import { extrudeZ, archRing } from './lib.js';

const SL = Math.tan(7 * Math.PI / 180);

export function buildTravelator(ctx, M, S, o) {
  const { mat, tex, physics } = ctx, A = o.A ?? 3.6, lanes = o.lanes || [{ x: -1.9, dir: 1 }, { x: 0, dir: 1 }, { x: 1.9, dir: -1 }];
  const segs = []; { let z = o.z0, y = o.y0; for (const [type, len] of o.segs) { const rise = type === 'flight' ? len * SL : 0; segs.push({ type, za: z, zb: z + len, ya: y, yb: y + rise, sl: rise / len }); z += len; y += rise; } }
  const last = segs[segs.length - 1], yAt = (z) => { const s = segs.find((q) => z <= q.zb + 1e-6) || last; return s.ya + (Math.min(z, s.zb) - s.za) * s.sl; };
  const k = S.k;
  const tubeMat = mat.toon('#a8c3cb', { side: 'double' }), ribMat = mat.toon('#2b62ad'), slabMat = M.steelDark, steel = M.stainless;
  const shear = (geo, za, ya, sl) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + ya + (p.getZ(i) - za) * sl); geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.computeBoundingBox(); return geo; };
  const add = (geo, material, seg) => { const m = new THREE.Mesh(shear(geo, seg.za, seg.ya, seg.sl), material); m.castShadow = false; m.receiveShadow = true; S.group.add(m); return m; };
  const beltTex = tex.draw(64, 64, (g, w, h) => { g.fillStyle = '#7b828a'; g.fillRect(0, 0, w, h); g.fillStyle = '#565d65'; for (let y = 2; y < h; y += 6) g.fillRect(6, y, w - 12, 3); g.fillStyle = '#f2c500'; g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h); }, { key: 'trav-belt' });
  const belts = [];
  const tubeProf = (a) => archRing(a, 2.0, 0.4, -1.3, 0, 30, 3.0);
  for (const seg of segs) {
    const len = seg.zb - seg.za, nCh = Math.max(1, Math.ceil(len / 24)), lc = len / nCh;
    for (let c = 0; c < nCh; c++) {
      const z0 = seg.za + c * lc, z1 = z0 + lc;
      add(extrudeZ(tubeProf(A), z0, z1), tubeMat, seg);                                                                  // the tube
      add(extrudeZ([[-A, -0.55], [A, -0.55], [A, -0.04], [-A, -0.04]], z0, z1), slabMat, seg);                              // the slab under the lanes
      for (const x of [-0.95, 0.95]) add(extrudeZ([[x - 0.25, -0.04], [x + 0.25, -0.04], [x + 0.25, 0.92], [x - 0.25, 0.92]], z0, z1), steel, seg);                       // dividers
      for (const x of [-2.75, 2.75]) add(extrudeZ([[x - 0.3, -0.04], [x + 0.3, -0.04], [x + 0.3, 0.92], [x - 0.3, 0.92]], z0, z1), steel, seg);                       // outer balustrades
      for (const x of [-0.95, 0.95, -2.75, 2.75]) add(extrudeZ([[x - 0.07, 0.92], [x + 0.07, 0.92], [x + 0.07, 1.0], [x - 0.07, 1.0]], z0, z1), M.steelBlack, seg);        // handrails
    }
    if (seg.type === 'flight') for (const l of lanes) {                                                                  // the moving belts: a sheared strip with a scrolled texture
      const map = beltTex.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(1, len / 0.8);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([l.x - 0.55, 0.01, seg.za, l.x + 0.55, 0.01, seg.za, l.x + 0.55, 0.01, seg.zb, l.x - 0.55, 0.01, seg.zb], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 2, 1, 0, 3, 2]);
      const m = new THREE.Mesh(shear(g, seg.za, seg.ya, seg.sl), mat.toon('#ffffff', { map })); m.userData.noBatch = true; m.castShadow = false; S.group.add(m);
      const [cx, cz] = S.W(l.x, (seg.za + seg.zb) / 2); belts.push({ map, dir: l.dir, cx, cz, rep: 1 / 0.8 });
      const [bx, bz] = S.W(l.x, seg.za), [tx, tz] = S.W(l.x, seg.zb);
      physics.addEscalator({ bottom: { x: bx, y: seg.ya, z: bz }, top: { x: tx, y: seg.yb, z: tz }, w: 1.1, dir: l.dir, speed: 0.9, hole: false });
    }
    // lamps every 8 m (tilted with the slope), ribs every 6 m (instanced: a vertical ring shifted by the profile height)
    for (let z = seg.za + 4; z < seg.zb - 1; z += 8) { const m = k.box(1.5, 0.08, 0.45, M.lampWhite, [0, yAt(z) + 4.2, z], [-Math.atan(seg.sl), 0, 0]); m.castShadow = false; }
    // colliders: the walls and the balustrades in 6 m pieces following the slope; the floor of the level parts
    for (let z = seg.za; z < seg.zb - 1e-6; z += 6) {
      const z1 = Math.min(seg.zb, z + 6), y0 = Math.min(yAt(z), yAt(z1)) - 1.4, y1 = Math.max(yAt(z), yAt(z1)) + 4.5;
      S.col(A - 0.2, A + 0.7, y0, y1, z, z1); S.col(-A - 0.7, -A + 0.2, y0, y1, z, z1);
      if (seg.type === 'flight') { for (const x of [-0.95, 0.95]) S.col(x - 0.25, x + 0.25, y0, Math.max(yAt(z), yAt(z1)) + 1.1, z, z1); for (const x of [-2.75, 2.75]) S.col(x - 0.3, x + 0.3, y0, Math.max(yAt(z), yAt(z1)) + 1.1, z, z1); }
    }
    if (seg.type === 'level') S.walk(-A + 0.1, A - 0.1, seg.za - 0.2, seg.zb + 0.2, seg.ya, 1.1);
  }
  { const zs = []; for (const s of segs) for (let z = s.za + 3; z < s.zb; z += 6) zs.push(z);
    const geo = extrudeZ(archRing(A - 0.07, 2.0, 0.1, -1.3, 0, 24, 3.0 - 0.07), -0.14, 0.14), im = new THREE.InstancedMesh(geo, ribMat, zs.length), d = new THREE.Object3D();
    zs.forEach((z, i) => { d.position.set(0, yAt(z), z); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.instanceMatrix.needsUpdate = true; im.userData.noBatch = true; im.castShadow = false; im.frustumCulled = false; S.group.add(im); }
  // hanging signs at both ends
  const sign = (text, sub, key, z, rotY, bg) => { const p = k.plane(3.0, 0.68, M.board(M.blueBoard(text, sub, null, key, { bg }), 1.0), [0, yAt(z) + 3.0, z], [0, rotY, 0]); p.castShadow = false; };
  sign('Спортивная · Выход на Васильевский остров', 'Sportivnaya · Vasilievsky Island', 'trav-sign-1', o.z0 + 8, Math.PI, o.signBg || '#702785');
  sign('К поездам · Спортивная', 'To the trains · line 5', 'trav-sign-2', last.zb - 8, 0, o.signBg || '#702785');
  // the belts scroll while the camera is near
  const cam = ctx.camera.position;
  ctx.onUpdate((dt) => { if (Math.hypot(cam.x - belts[0].cx, cam.z - belts[0].cz) > 150 && Math.hypot(cam.x - belts[belts.length - 1].cx, cam.z - belts[belts.length - 1].cz) > 150) return; for (const b of belts) b.map.offset.y += b.dir * 0.9 * dt * b.rep; });
  return { segs, yAt, zEnd: last.zb, yEnd: last.yb, A, lanes, belts };
}
