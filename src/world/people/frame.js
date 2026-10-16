// people/frame.js - the station frame of landmarksA (u along the facade to the east, d into the building toward the tracks; O + theta from services.landmarks.stationFrame,
// the same numbers as landmarksA/common.js) as a small helper, so that the people module does not import another module's files.
export function makeFrame(sf) {
  const O = (sf && sf.O) || { x: 602.7, z: 242.9 }, TH = sf && sf.theta != null ? sf.theta : 10.05 * Math.PI / 180;
  const E = [Math.cos(TH), -Math.sin(TH)], B = [Math.sin(TH), Math.cos(TH)];
  return {
    O, TH,
    /** station frame (u, d) -> world [x, z] */
    W: (u, d) => [O.x + E[0] * u + B[0] * d, O.z + E[1] * u + B[1] * d],
    /** world (x, z) -> station frame [u, d] */
    UV: (x, z) => { const dx = x - O.x, dz = z - O.z; return [dx * E[0] + dz * E[1], dx * B[0] + dz * B[1]]; },
    /** world yaw (rotY, 0 faces +Z) of a person who faces the station frame direction (fu, fd) */
    yawOf: (fu, fd) => Math.atan2(fu * E[0] + fd * B[0], fu * E[1] + fd * B[1]),
  };
}
