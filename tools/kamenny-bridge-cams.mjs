// tools/kamenny-bridge-cams.mjs - prints --cams strings for tools/shot.mjs / zfight.mjs round the Kamenny Island bridges (src/world/bridges/kamenny/spec.js; frames: u along the bridge from the first
// bank line, +v right of travel; the small bridges: origin = the middle of the deck, u along the OSM way).
// usage:  node tools/kamenny-bridge-cams.mjs name,name,...
//   Kamennoostrovsky (kam-): aerial (from the east, high), aerial2 (from the west), face (river level, the east face, looking along the bridge), pier (beside the second pier, lamp standard),
//                deckN (walking on the deck from the Kamenny end), deckS (from the Aptekarsky end), pave (on the west pavement at the middle), under (below the deck between two piers), stele (the Kamenny abutment
//                with the obelisks), top (straight down)
//   Ushakovsky (ush-): aerial, aerial2, arcade (river level, the Kamenny arcade), column (a column of the bastion), deckN (walking from the Kamenny end), deckS, pave, top
//   small: s-<id> (3/4 view of a small bridge from 12 m, 4 m high), w-<id> (walking along the deck, eye level)
//   node tools/shot.mjs --only environment,streets,bridges --cams "$(node tools/kamenny-bridge-cams.mjs kam-aerial,ush-aerial)" --out shots/kamenny-bridges/a --t 5
import { BIG, SMALL } from '../src/world/bridges/kamenny.js';
import { toWorld } from '../src/world/bridges/sites.js';
const names = (process.argv[2] || 'kam-aerial').split(',');
const yawOf = (dx, dz) => -(Math.atan2(dx, -dz) * 180 / Math.PI);
const look = (from, fy, to, ty) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${fy},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - fy, dh) * 180 / Math.PI).toFixed(1)}`; };
const walk = (from, to, ty = 1.6, y = 4) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${y},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - 1.7, dh) * 180 / Math.PI).toFixed(1)},1`; };
const P = (sp) => (u, v) => { const w = toWorld(sp, u, v); return [w.x, w.z]; };
const C = {};
for (const [pre, sp] of [['kam', BIG[0]], ['ush', BIG[1]]]) {
  const p = P(sp), L = sp.len, HW = sp.hw;
  C[pre + '-aerial'] = look(p(L * 0.35, -70), 42, p(L * 0.5, 0), 0);
  C[pre + '-aerial2'] = look(p(L * 0.62, 70), 36, p(L * 0.45, 0), 0);
  C[pre + '-face'] = look(p(L * 0.3, -42), -1.4, p(L * 0.55, -HW), 1.5);
  C[pre + '-deckN'] = walk(p(-14, -6.6), p(L * 0.5, -6.6), 1.8);
  C[pre + '-deckS'] = walk(p(L + 14, 6.6), p(L * 0.5, 6.6), 1.8);
  C[pre + '-pave'] = walk(p(L * 0.3, HW - 1.4), p(L * 0.7, HW - 1.4), 1.6);
  C[pre + '-top'] = `${p(L / 2, 0)[0].toFixed(1)},${p(L / 2, 0)[1].toFixed(1)},0,-90`;
  C[pre + '-stele'] = look(p(-16, -HW - 8), 3.5, p(0, -HW), 3);
}
{ const sp = BIG[0], p = P(sp), u = (sp.piers[1][0] + sp.piers[1][1]) / 2; C['kam-pier'] = look(p(u + 9, -HW(sp) - 6), 3.2, p(u, -HW(sp)), 5.5); C['kam-under'] = look(p(u - 14, -9), -1.4, p(u - 2, -4), 0.2); }
{ const sp = BIG[1], p = P(sp), bu = 31.2; C['ush-arcade'] = look(p(14, -36), -1.2, p(bu, -sp.hw), 1.8); C['ush-column'] = look(p(bu + 7, -sp.hw - 7), 4, p(bu, -sp.hw - 0.5), 8); }
function HW(sp) { return sp.hw; }
for (const sp of SMALL) {
  const p = P(sp), HU = sp.len / 2, vmax = Math.max(...sp.strips.map((s) => s[1]));
  C['s-' + sp.id] = look(p(HU * 0.4, vmax + 11), 4, p(0, 0), 0.4);
  C['w-' + sp.id] = walk(p(-HU - 8, 0), p(HU + 8, 0), 1.7);
  { const w = p(0, 0); C['t-' + sp.id] = w[0].toFixed(1) + ',22,' + w[1].toFixed(1) + ',0,-89'; }
}
const out = [];
for (const n of names) { if (!C[n]) { console.error('unknown cam', n, Object.keys(C).join(' ')); process.exit(1); } out.push(C[n]); }
console.log(out.join(';'));
