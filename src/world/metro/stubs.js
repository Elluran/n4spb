// metro/stubs.js — the tunnel behind a station mouth that leads nowhere in this map: a lit tube (lining rings, rails, cables, caged lamps) that ends in a black DISC 70 m from the mouth.
// Trains arrive out of the disc and leave into it (platform.js hides them behind it), so only the part inside the stub is ever seen; 40 m of tube continue behind the disc (the ride
// train jumps to / from the shared generic tunnel there, while the rider's car is wholly behind the disc: ride.js). The mouth itself is closed for walkers by the end wall collider.
// Every black disc of the metro (stubs, real tunnels, the free end of a partial link) is registered in DISCS (= X.discs = ctx.metro.discs): a ride hides exactly the discs of its own track.
import * as THREE from 'three';
import { buildTunnel, TUBE_CY } from './tunnel.js';

export const STUB_VISIBLE = 70, STUB_EXT = 40;
export const EXT_GROUPS = [];               // tube parts behind the disc: shown only while a ride is running (corridors may pass through the same space)
export const STUB_PATHS = [];                // world polylines of every stub (tests: clearance against the corridors)
export const DISCS = [];                     // every black disc mesh (registerDisc); metro.js publishes it as X.discs / ctx.metro.discs

/**
 * Registers a black disc. It is kept OUT of the static batching (ctx.noBatch: an exception to the batching rule for ~60 small circles, 56 triangles each): the ride hides the discs of the
 * rider's own track (metro.js env.onLegStart) and a merged copy could never be hidden. mesh.userData.disc = { kind: 'stub' | 'real' | 'free', c: world centre [x, y, z],
 * n: world normal [x, y, z] (the drawn face, toward the approaching / leaving train), ...meta }. The mesh must already hang in the scene (its world matrix is read here).
 */
export function registerDisc(ctx, mesh, meta = {}) {
  ctx.noBatch(mesh);
  mesh.updateWorldMatrix(true, false);
  const c = new THREE.Vector3().setFromMatrixPosition(mesh.matrixWorld), n = new THREE.Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
  mesh.userData.disc = { kind: 'stub', ...meta, c: [c.x, c.y, c.z], n: [n.x, n.y, n.z] };
  DISCS.push(mesh);
  return mesh;
}

/**
 * S: Space of the station, x: lateral position of the track (local), zMouth: z of the mouth plane, out: +1 / -1 (direction away from the hall), bed: rail foot level (BED).
 * o: visible (m to the disc, 70), ext (m of tube behind the disc, 40), sign (false: no warning board), mirror (default: the stub of an ARRIVING track, sign(x) === out, by the platform.js
 *    convention S = dir +1 at x = -TRK: its lamps / contact rail are mirrored so that they stay on the left / outer side of the travel direction, as in the generic tunnel).
 * The part behind the disc continues the lamp / texture phase of the visible part (lamps 4.5 + 9 n m from the mouth). Returns the disc distance from the mouth.
 */
export function buildStub(ctx, M, S, x, zMouth, out, bed, o = {}) {
  const vis = o.visible ?? STUB_VISIBLE, ext = o.ext ?? STUB_EXT, mirror = o.mirror ?? (x !== 0 && Math.sign(x) === out);
  const nv = Math.max(2, Math.ceil(vis / 6)), pathV = []; for (let i = 0; i <= nv; i++) pathV.push([x, bed, zMouth + out * (i * vis / nv)]);
  buildTunnel(ctx, M, S.group, pathV, { lamps: 9, mirror });
  STUB_PATHS.push(pathV.map((p) => { const [wx, wz] = S.W(p[0], p[2]); return [wx, p[1], wz]; }));
  { const eg = new THREE.Group(); eg.visible = false; const ne = Math.max(2, Math.ceil(ext / 6)), pathE = []; for (let i = 0; i <= ne; i++) pathE.push([x, bed, zMouth + out * (vis + i * ext / ne)]);
    buildTunnel(ctx, M, eg, pathE, { lamps: 9, mirror, s0: vis }); ctx.noBatch(eg); S.group.add(eg); EXT_GROUPS.push(eg); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(2.78, 28), M.discBlack);
  disc.position.set(x, bed + TUBE_CY, zMouth + out * vis); disc.rotation.y = out > 0 ? Math.PI : 0; S.group.add(disc);
  registerDisc(ctx, disc, { kind: 'stub', space: S.name, x, out, vis, ext });
  // a warning board a few metres inside the mouth (hung from the lining) and red / white post at the bed edge
  if (o.sign !== false) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.45), M.board(M.blueBoard('Проход воспрещён', '', null, 'stub-nopass', { bg: '#b8231f' }), 0.9)); p.position.set(x, bed + 3.6, zMouth + out * 6); p.rotation.y = out > 0 ? Math.PI : 0; S.group.add(p); }
  return vis;
}
