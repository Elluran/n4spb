// metro/plate.js — the plate that closes the end of an escalator tube (the vertical plane where the sheared vault ends) with an arched opening for the corridor / hall behind it.
// Frame: the escalator's own Space (x lateral, z along the descent, y absolute). `y` = the lane surface height AT the plate (the vault profile is `archRing(A, spv, ...)` above it).
import * as THREE from 'three';
import { extrudeZ, archHole } from './lib.js';

/** o: { A, spv, bv, y, z0, z1, halfW (opening half width), spring (opening wall height above y), yBase (opening floor, default y), mat } */
export function endPlate(S, M, o) {
  const A = o.A ?? 4.05, spv = o.spv ?? 1.0, bv = o.bv ?? 4.9, y = o.y, n = 36, prof = [[-A, y - 1.4], [-A, y + spv]];
  for (let i = 1; i < n; i++) { const t = Math.PI - i * Math.PI / n; prof.push([A * Math.cos(t), y + spv + bv * Math.sin(t)]); }
  prof.push([A, y + spv], [A, y - 1.4]);
  const hole = o.halfW ? [archHole(0, o.halfW, o.yBase ?? y, (o.yBase ?? y) + (o.spring ?? 0.6), 12)] : null;
  const m = new THREE.Mesh(extrudeZ(prof, o.z0, o.z1, hole), o.mat || M.plasterWarm); m.receiveShadow = true; S.group.add(m);
  if (o.floor && o.halfW) S.walk(-o.halfW, o.halfW, o.z0 - 0.3, o.z1 + 0.05, o.yBase ?? y, 1.1);          // a floor under the opening (the plate is as thick as a floor piece is long: no hole between the corridor and the lane ends)
  return m;
}
