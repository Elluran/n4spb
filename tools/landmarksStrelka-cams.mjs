// landmarksStrelka-cams: prints `--cams` strings for tools/shot.mjs / tools/zfight.mjs from points given in the MODEL frame of the Spit ensemble (landmarksStrelka/frame.js: +z = the axis of the
// Exchange toward the tip, +x = north).  A camera is  eye -> target:  "ex,ez[,ey] > tx,tz[,ty]"  (model metres; ey omitted = walking eye height) or a preset name.
//   node tools/landmarksStrelka-cams.mjs front aerial "0,120 > 0,40,12"
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksStrelka/frame.js')).href);

export const PRESETS = {
  front: '0,112 > 0,40,13',                    // the east front of the Exchange from the garden path
  stairs: '6,60 > 0,36,9',                     // at the foot of the east stairs
  colonnade: '24,43,4.7 > -20,37,8',           // under the east colonnade
  flank: '70,30 > 20,0,10',                    // the north flank from Birzhevoy proezd
  aerial: '60,190,120 > 0,60,0',               // the whole ensemble from above the tip
  aerialW: '-40,-150,110 > 0,20,0',            // from behind the Exchange
  colN: '80,112 > 100.4,88.5,14',              // north Rostral column from the garden side
  colNclose: '95,100 > 100.4,88.5,5',          // its figure, close
  colS: '-80,112 > -102.3,88.5,14',            // south Rostral column
  colSclose: '-97,101 > -102.3,88.5,5',
  colSroad: '-130,60 > -102.3,88.5,16',        // from the Palace Bridge side
  garden: '0,128 > 20,170,0',                  // the garden toward the tip
  anchor: '-6,106 > -1.1,111.2,0.9',             // the anchor, close
  sign: '4,156 > 0,159.5,0.5',                 // the memorial sign, close
  rampN: '68.9,137.6,0.3 > 48.9,163.7,-1.6',            // on the north ramp looking down toward the landing
  landing: '13.4,181.3,-1.1 > -18.4,174.1,-1.3',        // on the landing looking back at the terrace wall and the north sphere
  sphere: '50.3,164.2,-1.1 > 54.3,166.0,-1.5', tip: '40,215,40 > 0,175,-2', landingN: '13.4,181.3,-1.1 > 54.3,166.0,-1.2',   // the south sphere, close
  whN: '40,60 > 90,13,8',                      // the east block of the north warehouse from the square
  whS: '-40,60 > -90,13,8',                    // the east block of the south warehouse
  customs: '268,-70 > 232,-88,10',             // the Customs house front from the Makarova embankment pavement
  customsFar: '300,-20 > 230,-86,14',
  vista: null,                                  // the long vista from the Palace Embankment: world camera, see below
};
const WORLD = { vista: '-2206,2.2,-960,43.8,1.5', vistaBridge: '-2400,9,-960,17,1', vistaFortress: '-2100,3,-1760,138,2', vistaTrinity: '-1330,12,-1820,114,0', customs: '-2783.1,-1425,162,14', bust: '-2787.5,-1409.8,162,22', loggiaN: '-2680,-1390,162,10', loggiaS: '-2515,-1087,66,10' };

const yawOf = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI;          // 0 = north (-z), 90 = west (-x)
function cam(spec) {
  const [e, t] = spec.split('>').map((s) => s.trim().split(',').map(Number));
  const E = F.Wa(e[0], e[1]), T = F.Wa(t[0], t[1]), ey = e[2], ty = t[2] ?? 1.7;
  const dx = T[0] - E[0], dz = T[1] - E[1], dist = Math.hypot(dx, dz), yaw = yawOf(dx, dz);
  const eyeY = ey ?? 1.7, pitch = Math.atan2(ty - eyeY, dist) * 180 / Math.PI;
  const r = (v) => Math.round(v * 10) / 10;
  return ey == null ? `${r(E[0])},${r(E[1])},${r(yaw)},${r(pitch)}` : `${r(E[0])},${r(ey)},${r(E[1])},${r(yaw)},${r(pitch)}`;
}
if (process.argv[1] && process.argv[1].endsWith('landmarksStrelka-cams.mjs')) {
  const out = [];
  for (const a of process.argv.slice(2)) out.push(WORLD[a] ? WORLD[a] : cam(PRESETS[a] || a));
  console.log(out.join(';'));
}
