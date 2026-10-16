// metro/junction.js — a small flat hall where three corridors meet (the Vosstaniya passage hub: Mayakovskaya transfer from the west, the Vosstaniya-2 escalator from the east, the ramp down to the
// station hall to the north). Walls are slabs with arched openings, floor / ceiling quads, colliders around the openings. Built in the frame of a Space (local x, z; y absolute floor level).
import * as THREE from 'three';
import { extrudeX, extrudeZ, archHole, floorGeo } from './lib.js';

export function buildJunction(ctx, M, S, o) {
  const { x0, x1, z0, z1, y, arms } = o, H = o.H ?? 4.6, k = S.k, hw = o.hw ?? 3.3, spring = o.spring ?? 0.6;
  const floorMat = M.corridorFloor;
  S.group.add(new THREE.Mesh(floorGeo(x0, x1, z0, z1, y, 1), floorMat));
  S.bx(x0, x1, y - 0.4, y - 0.02, z0, z1, M.concreteDark); S.walk(x0, x1, z0, z1, y, 1.0);
  S.group.add(new THREE.Mesh(floorGeo(x0, x1, z0, z1, y + H, 1, false), M.corridorVault));
  const wallM = M.corridorWall, prof = (a0, a1) => [[a0, -0.5], [a1, -0.5], [a1, H], [a0, H]];                 // profiles are relative to the floor (uv in metres from the floor), the geometry is lifted afterwards
  const holeZ = (z) => archHole(z, hw, 0, spring, 12), holeX = (x) => archHole(x, hw, 0, spring, 12);
  const up = (g) => { g.translate(0, y, 0); return g; };
  const col = (xa, xb, za, zb) => S.col(xa, xb, y - 1.5, y + H + 1, za, zb);
  // west / east walls (planes x = x0 / x1) with openings at z = arms.W / arms.E
  for (const [x, arm, s] of [[x0, arms.W, -1], [x1, arms.E, 1]]) {
    const a = x + (s < 0 ? -0.3 : 0), b = a + 0.3;
    S.group.add(new THREE.Mesh(up(extrudeX(prof(z0, z1), a, b, arm !== undefined ? [holeZ(arm)] : null)), wallM));
    if (arm !== undefined) { col(a, b, z0, arm - hw); col(a, b, arm + hw, z1); } else col(a, b, z0, z1);
  }
  // north wall (plane z = z0) with the opening at x = arms.N, south wall closed
  S.group.add(new THREE.Mesh(up(extrudeZ([[x0, -0.5], [x1, -0.5], [x1, H], [x0, H]], z0 - 0.3, z0, arms.N !== undefined ? [holeX(arms.N)] : null)), wallM));
  if (arms.N !== undefined) { col(x0, arms.N - hw, z0 - 0.3, z0); col(arms.N + hw, x1, z0 - 0.3, z0); } else col(x0, x1, z0 - 0.3, z0);
  S.group.add(new THREE.Mesh(up(extrudeZ([[x0, -0.5], [x1, -0.5], [x1, H], [x0, H]], z1, z1 + 0.3, arms.S !== undefined ? [holeX(arms.S)] : null)), wallM));
  if (arms.S !== undefined) { col(x0, arms.S - hw, z1, z1 + 0.3); col(arms.S + hw, x1, z1, z1 + 0.3); } else col(x0, x1, z1, z1 + 0.3);
  // lights + signs
  for (const x of [-3, 3]) for (const z of [z0 + 3, (z0 + z1) / 2 + 2]) k.box(1.8, 0.08, 0.9, M.lampWhite, [x, y + H - 0.06, z]).castShadow = false;
  const sg = (txt, sub, key, x, z, rot) => { const p = k.plane(2.6, 0.65, M.board(M.blueBoard(txt, sub, null, key), 1.0), [x, y + 3.55, z], [0, rot, 0]); p.castShadow = false; };
  if (o.signs) for (const s of o.signs) sg(s.text, s.sub, s.key, s.x, s.z, s.rot);
}
