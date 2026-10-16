// landmarksPetrovskyStadium-cams.mjs - prints a --cams string for tools/shot.mjs / zfight.mjs round the Petrovsky stadium (positions computed from the bowl stations).
//   node tools/landmarksPetrovskyStadium-cams.mjs [set]      sets: a (overview + tourist views), b (close-ups), c (small arena + chimney + canopies)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyStadium/frame.js')).href);
const B = F.bowl(), pf = F.pitchFrame(), N = B.N;
const yawTo = (x0, z0, x1, z1) => Math.round(Math.atan2(-(x1 - x0), -(z1 - z0)) * 180 / Math.PI * 10) / 10;
const stOut = (dir) => { let bk = 0, bv = -1e9; for (let k = 0; k < N; k++) { const q = B.st[k], v = -q.nx * dir[0] - q.nz * dir[1]; if (v > bv) { bv = v; bk = k; } } return bk; };
const U = [pf.ux, pf.uz], V = [pf.vx, pf.vz];
const kNE = stOut(U), kSW = stOut([-U[0], -U[1]]), kSE = stOut(V), kNW = stOut([-V[0], -V[1]]);
const pt = (k, s) => { const p = B.at(k, s, 0); return [p[0], p[2]]; };
const face = (k, s, h = 1.7, pitch = 3) => { const p = pt(k, s), c = B.c; return `${p[0].toFixed(1)},${p[1].toFixed(1)},${yawTo(p[0], p[1], c[0], c[1])},${pitch}`; };
const set = process.argv[2] || 'a', out = [];
if (set === 'a') {
  out.push('-3478,-2200,90,3');                                      // tourist on the Zhdanovskaya embankment (east bank)
  out.push('-3613,-2369,180,2');                                     // the Zhdanovsky bridge looking at the NE end
  out.push('-3660,6,-1985,0,4');                                     // the Malaya Neva side, low
  out.push('-3440,75,-2100,68,-20');                                 // aerial from the east
  out.push(`${B.c[0]},6,${B.c[1]},54,6`);                            // inside the bowl, toward the NW stand
  out.push(face(kNW, -9));                                           // on the NW apron facing the colonnade
}
if (set === 'b') {
  out.push(face(kSE, -9, 1.7, 4)); out.push(face(kSE, -3.0, 1.7, 10)); out.push(face(kNE, -8, 1.7, 5));
  const m = F.MASTS[0]; out.push(`${(m[0] - 9).toFixed(1)},${(m[1] + 1).toFixed(1)},-90,28`);
}
if (set === 'c') {
  out.push('-3858,-2261,127,6');                                     // inside the small arena, toward the covered stand
  out.push('-3790,14,-2185,43,-14');                                 // the small arena from the north-east, aerial
  out.push(`${F.CHIMNEY[0] + 25},${F.CHIMNEY[1] + 25},45,10`);       // the boiler house and the chimney from the Zhdanovsky bridge side
  out.push('-3640,-2330,200,6');                                     // the ticket office and the canopies at the north-east end, from the neck
}
if (set === 'd') {
  out.push(face(kNE, -16, 1.7, 5));                                  // the canopies and the entrances at the north-east end
  out.push('-3690,-2345,-113,4');                                    // the ticket office from the north-west
  out.push(face(kNW, -24, 1.7, 22));                                 // the covered press stand on the north-west rim
  out.push('-3690,3,-2018,0,8');                                     // the annex at the south-west end
  out.push('-3613,-2369,72,-5');                                     // the dolphins from the Zhdanovsky bridge
  out.push('-3858,-2261,127,6'); out.push('-3790,14,-2185,43,-14');   // the small arena
  out.push(`${F.CHIMNEY[0] + 25},${F.CHIMNEY[1] + 25},45,10`);
}
if (set === 'e') {
  out.push('-3775,3,-2210,-75,4');                                   // from the arm west of the stadium, looking at the NW side
  out.push(face(kNE, -16, 1.7, 5));                                  // the canopies and entrances at the north-east end
  out.push(face(kSE, -9, 1.7, 3));                                   // the south-east side colonnade
  out.push(`${F.MASTS[3][0] - 2},4,${F.MASTS[3][1] + 12},-30,28`); // the foot of the south-west tower
  out.push('-3790,14,-2185,43,-14');                                 // the small arena
  out.push('-3440,75,-2100,68,-20');                                 // the aerial from the east (compare s02)
}
console.log(out.join(';'));
