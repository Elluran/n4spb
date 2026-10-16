// tools/bridges-yelagin-main-cams.mjs - prints --cams strings for tools/shot.mjs / zfight.mjs round the 1st and the 3rd Yelagin bridge (src/world/bridges/yelaginMain.js; frame: u from the middle of the deck).
// usage:  node tools/bridges-yelagin-main-cams.mjs <bridge><name>,...     bridge 1 or 3; names:
//   deckA (walking on the deck from the Yelagin / south end), deckB (from the far end), mid (middle of the deck, looking along it, eye 1.7), rail (1.5 m from the right railing), road (centre of the carriageway, eye 2.4 = the car),
//   faceL / faceR (river level, looking at the left / right fascia), aerial (from the right, high), aerial2 (from the left), top (straight down), under (below the deck beside a pier), lamp (close to a lamp standard), plate (the name plate),
//   endA / endB (street-level view from 30 m before the ends), pier (water level looking along the river at a pier)
//   node tools/shot.mjs --only environment,streets,city,bridges --cams "$(node tools/bridges-yelagin-main-cams.mjs 1deckA,3deckA)" --out shots/bridges-yelagin-main/a --t 5
import { Y1, PIERS1 } from '../src/world/bridges/yelaginMain/first.js';
import { Y3 } from '../src/world/bridges/yelaginMain/third.js';
import { toWorld } from '../src/world/bridges/sites.js';
const S = { 1: Y1, 3: Y3 };
const yawOf = (dx, dz) => -(Math.atan2(dx, -dz) * 180 / Math.PI);
const look = (from, fy, to, ty) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${fy},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - fy, dh) * 180 / Math.PI).toFixed(1)}`; };
const walk = (from, to, ty = 1.6, y = 4) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${y},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - 1.7, dh) * 180 / Math.PI).toFixed(1)},1`; };
const out = [];
for (const key of (process.argv[2] || '1deckA,3deckA').split(',')) {
  const n = key[0], name = key.slice(1), sp = S[n]; if (!sp) { console.error('unknown bridge', key); process.exit(1); }
  const HL = sp.len / 2, W = (u, v) => { const w = toWorld(sp, u, v); return [w.x, w.z]; }, WY = -3.4, yd = (n === '1' ? 0.5 : 0.3);
  const pier = n === '1' ? PIERS1[2] : -20;
  const C = {
    deckA: walk(W(-HL - 16, 0), W(HL, 0)), deckB: walk(W(HL + 16, 0), W(-HL, 0)),
    mid: walk(W(-4, 2), W(HL, 2)), rail: walk(W(-HL + 6, sp.hw - 1.6), W(HL, sp.hw - 1.6), 1.4),
    road: `${W(-HL - 12, 0)[0].toFixed(1)},${(2.4 + yd).toFixed(1)},${W(-HL - 12, 0)[1].toFixed(1)},${yawOf(...W(HL, 0).map((a, i) => a - W(-HL - 12, 0)[i])).toFixed(1)},-4`,
    faceL: look(W(-14, -38), WY + 2.2, W(-14, -8), 0.2), faceR: look(W(14, 38), WY + 2.2, W(14, 8), 0.2),
    aerial: look(W(20, 52), 30, W(-4, 0), 0), aerial2: look(W(-35, -45), 26, W(0, 0), 0), top: `${W(0, 0)[0].toFixed(1)},${W(0, 0)[1].toFixed(1)},0,-90`,
    under: look(W(pier - 9, 3), WY + 1.0, W(pier, 0), WY + 2), lamp: look(W(-HL + 14, sp.hw - 2.5), yd + 2.5, W(-HL + 22, sp.hw - 0.45), yd + 4.0),
    plate: look(W(n === '1' ? -HL + 4 : -HL + 7.5, sp.hw - 1.2), yd + 1.7, W(n === '1' ? -HL + 7.5 : -HL + 3.4, sp.hw - (n === '1' ? 0.9 : 0.9)), yd + 2.8),
    endA: walk(W(-HL - 34, 0), W(-HL + 6, 0), 2.0), endB: walk(W(HL + 34, 0), W(HL - 6, 0), 2.0),
    pier: look(W(pier, 34), WY + 2.0, W(pier, 4), WY + 1.0),
  };
  if (!C[name]) { console.error('unknown cam', name, Object.keys(C).join(' ')); process.exit(1); }
  out.push(C[name]);
}
console.log(out.join(';'));
