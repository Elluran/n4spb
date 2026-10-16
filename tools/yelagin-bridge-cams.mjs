// tools/yelagin-bridge-cams.mjs - prints --cams strings for tools/shot.mjs / zfight.mjs round the 2nd Yelagin Bridge (src/world/bridges/yelagin.js; frame: u from the middle, +u toward Krestovsky).
// usage:  node tools/yelagin-bridge-cams.mjs [names,...]       names: user (the pose of the report: -5207.2,1.5,-4837.7,105.8,1.5), deckN (walking on the deck from the Yelagin end), deckS (from the Krestovsky end),
//   mid (walking at the middle, looking along the deck), rail (1.5 m from the west railing looking along it), lift (the bascule span from the deck), face (river level, the west face), face2 (the east face),
//   aerial (from the SE), aerial2 (from the NW), under (below the deck beside a pier), top (straight down), yel (Yelagin gate), kres (Krestovsky gate), lamp (close to a lamp standard), vista (long view along the river)
//   node tools/shot.mjs --only environment,streets,city,bridges --cams "$(node tools/yelagin-bridge-cams.mjs user,face)" --out shots/yelagin-bridge/a --t 5
import { YEL, PIERS } from '../src/world/bridges/yelagin.js';
import { toWorld } from '../src/world/bridges/sites.js';
const names = (process.argv[2] || 'user,deckN,face,aerial').split(',');
const W = (u, v) => toWorld(YEL, u, v);
const yawOf = (dx, dz) => -(Math.atan2(dx, -dz) * 180 / Math.PI);
const look = (from, fy, to, ty) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${fy},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - fy, dh) * 180 / Math.PI).toFixed(1)}`; };
const walk = (from, to, ty = 1.6, y = 4) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${y},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - 1.7, dh) * 180 / Math.PI).toFixed(1)},1`; };
const p = (u, v) => { const w = W(u, v); return [w.x, w.z]; };
const HL = YEL.len / 2, WY = -3.4;
const C = {
  user: '-5207.2,1.5,-4837.7,105.8,1.5',
  deckN: walk(p(-HL - 14, 0), p(HL, 0)), deckS: walk(p(HL + 14, 0), p(-HL, 0)),
  mid: walk(p(-6, 3), p(HL, 3)), rail: walk(p(-HL + 6, 6.2), p(HL, 6.2), 1.4),
  lift: walk(p(-30, -3), p(10, 0), 1.2),
  face: look(p(-14, 32), WY + 2.0, p(-14, 8), 0.2), face2: look(p(14, -32), WY + 2.0, p(14, -8), 0.2),
  aerial: look(p(20, -45), 38, p(-4, 0), 0), aerial2: look(p(-45, 40), 34, p(0, 0), 0), top: `${W(0, 0).x.toFixed(1)},${W(0, 0).z.toFixed(1)},0,-90`,
  under: look(p(PIERS[3] - 9, 3), WY + 1.0, p(PIERS[3], 0), WY + 2),
  yel: walk(p(-HL - 30, 0), p(-HL + 8, 0), 2.0), kres: walk(p(HL + 30, 0), p(HL - 8, 0), 2.0),
  lamp: walk(p(-60, 3), p(-62.3, 7.3), 5.5, 4),
  vista: look(p(0, 120), 12, p(0, 0), 0),
};
const out = [];
for (const n of names) { if (!C[n]) { console.error('unknown cam', n, Object.keys(C).join(' ')); process.exit(1); } out.push(C[n]); }
console.log(out.join(';'));
