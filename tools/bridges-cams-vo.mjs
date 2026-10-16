// tools/bridges-cams-vo.mjs - prints --cams strings for tools/shot.mjs / zfight.mjs around the Blagoveshchensky Bridge (frame of src/world/bridges/sites-vo.js BLAG: origin (-3376.35, -112.95),
// +u toward Vasilievsky Island, bearing 334.3, +v east / upstream).  The two Smolenka bridges are ordinary sites: use tools/bridges-cams.mjs uralsky|smolensky.
// usage:  node tools/bridges-cams-vo.mjs [names,...]            default: all names
//   node tools/shot.mjs --only environment,streets,city,bridges --cams "$(node tools/bridges-cams-vo.mjs sdeck,qtr,bpier)" --out shots/bridges-vo/x --t 5
// names: sdeck / vdeck (walking eye on the roadway from the south / north landing), sdeck2 (the upstream pavement), mid (mid-river deck), aerial, neva (river level, whole bridge), qtr / vqtr (river level,
// three-quarter views of the south / north spans), bpier (the downstream bascule pier + pavilion), face / face2 (girder face and haunch lattice), rail / rail2 (the railing from the pavement),
// bpieru / bpieru2 (the upstream bascule balcony with the pavilion), aeriale (aerial from upstream), under (below the girders), sabut / vabut (the quay beside the south / north abutment), sdown / vdown (the abutments from the water), palace (the long view from the Palace Bridge)
import { BLAG, blagY } from '../src/world/bridges/sites-vo.js';
const T = (BLAG.b - 90) * Math.PI / 180, c = Math.cos(T), s = Math.sin(T);
const W = (u, v) => [BLAG.cx + u * c - v * s, BLAG.cz + u * s + v * c];
const yawOf = (dx, dz) => -(Math.atan2(dx, -dz) * 180 / Math.PI);
const look = (from, fy, to, ty) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${fy},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - fy, dh) * 180 / Math.PI).toFixed(1)}`; };
const walk = (from, to, ty = 1.6) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - 1.7, dh) * 180 / Math.PI).toFixed(1)}`; };
const eye = (u) => (blagY(u) + 1.7).toFixed(2);                          // a free camera standing on the deck at u
const cams = {
  sdeck: walk(W(-18, 10), W(60, 10)), vdeck: walk(W(356, -10), W(270, -10)), sdeck2: walk(W(30, 17.4), W(110, 17.4)), mid: walk(W(170, 12), W(230, 12)),
  aerial: look(W(60, -75), 38, W(140, 0), 2), neva: look(W(150, -110), -1.8, W(150, 0), 3),
  qtr: look(W(60, -62), -1.8, W(100, -18), 1.5), vqtr: look(W(285, -58), -1.8, W(300, -18), 1.5), bpier: look(W(104, -42), -1.8, W(124, -19), 2.5),
  face: look(W(104, -34), -0.4, W(108, -18.7), 0.8), face2: look(W(60, -30), -0.6, W(62, -18.7), 0.2), under: look(W(100, -10), -2.2, W(130, 8), 0.5),
  rail: look(W(92, 15.9), eye(92), W(92, 18.56), blagY(92) + 1.1), rail2: look(W(40, 15.9), eye(40), W(40, 18.56), blagY(40) + 1.0),
  sabut: look(W(-6, 40), 1.7, W(10, 15), 0.5), vabut: look(W(345, -45), 1.7, W(335, -18), 0.5), sdown: look(W(18, -80), -1.8, W(0, -22), 1.5), vdown: look(W(316, -80), -1.8, W(334, -22), 1.5),
  bpieru: look(W(100, 55), -1.8, W(126.35, 24), 3.5), bpieru2: look(W(150, 44), -1.8, W(126.35, 24), 3), aeriale: look(W(150, 90), 30, W(150, 0), 3),
  palace: look([-2420, -977], 8, W(170, 0), 4),
};
const pick = (process.argv[2] || Object.keys(cams).join(',')).split(',');
for (const k of pick) if (!cams[k]) { console.error('unknown camera', k, Object.keys(cams).join(' ')); process.exit(1); }
console.log(pick.map((k) => cams[k]).join(';'));
