// tools/bridges-krestovsky-aptekarsky-bridge-cams.mjs - prints --cams strings for tools/shot.mjs / zfight.mjs round the bridges of src/world/bridges/krestAptek.js
// (Maly Krestovsky = mk, Bychy = by, Grebnoy = gr, Kantemirovsky = ka, + the second group of krestAptek2.js when it exists). Frame: u from the first bank line, +u toward the far bank, v right of travel.
// usage:  node tools/bridges-krestovsky-aptekarsky-bridge-cams.mjs mkdeck,mkface,kaaerial,...      names = <bridge><view>, views:
//   deckA (walking on the deck from the first land side), deckB (from the far side), mid (standing at mid-bridge looking along), rail (1.4 m inside the right railing looking along), face (low over the water, the right fascia),
//   face2 (the left fascia), under (below the deck beside the first pier / strut), aerial (SE-ish high view), aerial2 (opposite), top (straight down), a (walking approach 30 m before the first bank), b (30 m before the far bank)
//   node tools/shot.mjs --only environment,streets,city,bridges --cams "$(node tools/bridges-krestovsky-aptekarsky-bridge-cams.mjs mkdeckA,mkface)" --out shots/ka/x --t 5
import { SPECS } from '../src/world/bridges/krestAptek.js';
import { toWorld } from '../src/world/bridges/sites.js';
import { hump } from '../src/world/bridges/long.js';
let EXTRA = [];
try { const m = await import('../src/world/bridges/krestAptek2.js'); EXTRA = m.CAM_SPECS || []; } catch (e) { /* the second group does not exist yet */ }
const PREFIX = { malokrestovsky: 'mk', bychy: 'by', grebnoy: 'gr', kantemirovsky: 'ka' };
const all = [...SPECS.map((s) => ({ sp: s, p: PREFIX[s.id] })), ...EXTRA.map((e) => ({ sp: e.sp, p: e.p, y: e.y }))];
const yawOf = (dx, dz) => -(Math.atan2(dx, -dz) * 180 / Math.PI);
const look = (from, fy, to, ty) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${fy.toFixed(2)},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - fy, dh) * 180 / Math.PI).toFixed(1)}`; };
// the curved Yachtny Bridge (prefix ya): s = station coordinate along the way (0 .. L), v + = right of travel (west); views: a (walking, 30 m before the Primorsky end), b (30 m before the Krestovsky end), mid (deck, s 250, east
// pavement, looking ahead), west (west pavement looking ahead), rail, aerial / aerial2 (high, from the Gulf / the east), face (low over the water, west fascia), under (below the deck beside a pier), top, end1 / end2 (at the mouths)
const YAM = await import('../src/world/bridges/krestAptek2/yachtny.js');
const yaCam = (view) => {
  const P = (s, v) => YAM.pointAt(s, v), Lh = YAM.STATIONS.L, Y = YAM.deckProfile, mk = (s, v, y, s2, v2, y2) => { const a = P(s, v), b = P(s2, v2); return look([a.x, a.z], y, [b.x, b.z], y2); };
  const C = {
    a: mk(0, 0, 1.75, 40, 0, Y(40) + 1.0).replace(/^[^,]+,[^,]+,[^,]+/, (m) => { const p = P(0, 0); return `${(p.x - p.tx * 30).toFixed(1)},1.75,${(p.z - p.tz * 30).toFixed(1)}`; }),
    b: (() => { const p = P(Lh, 0), q = P(Lh - 40, 0); return look([p.x + p.tx * 30, p.z + p.tz * 30], 1.75, [q.x, q.z], Y(Lh - 40) + 1.0); })(),
    mid: mk(240, -6, Y(240) + 1.75, 330, -6, Y(330) + 1.3), west: mk(240, 6.2, Y(240) + 1.75, 330, 6.2, Y(330) + 1.3), rail: mk(120, 7.0, Y(120) + 1.6, 220, 7.0, Y(220) + 1.4),
    face: (() => { const p = P(250, 40), q = P(260, 8.5); return look([p.x, p.z], -1.2, [q.x, q.z], Y(260) - 1.0); })(),
    under: (() => { const p = P(215, 16), q = P(250, 0); return look([p.x, p.z], -1.8, [q.x, q.z], Y(250) - 1.5); })(),
    aerial: (() => { const p = P(200, 120), q = P(260, 0); return look([p.x, p.z], 70, [q.x, q.z], 6); })(), aerial2: (() => { const p = P(330, -140), q = P(250, 0); return look([p.x, p.z], 90, [q.x, q.z], 6); })(),
    top: (() => { const p = P(Lh / 2, 0); return `${p.x.toFixed(1)},${(Lh * 0.9).toFixed(0)},${p.z.toFixed(1)},0,-89`; })(),
    end1: mk(10, 5, Y(10) + 1.75, 50, 5, Y(50) + 1.3), end2: mk(Lh - 10, -5, Y(Lh - 10) + 1.75, Lh - 55, -5, Y(Lh - 55) + 1.3),
  };
  return C[view];
};
const names = (process.argv[2] || 'mkdeckA,kaaerial').split(',');
const out = [];
for (const n of names) {
  if (n.startsWith('ya')) { const c = yaCam(n.slice(2)); if (!c) { console.error('unknown yachtny view', n); process.exit(1); } out.push(c); continue; }
  const ent = all.find((e) => n.startsWith(e.p)); if (!ent) { console.error('unknown bridge in', n, all.map((e) => e.p).join(' ')); process.exit(1); }
  const sp = ent.sp, view = n.slice(ent.p.length), L = sp.len, HW = sp.hw, yD = ent.y || ((sp.piers || sp.spans) && sp.crown !== undefined ? hump(L, sp.crown) : () => 0.05);
  const W = (u, v) => { const w = toWorld(sp, u, v); return [w.x, w.z]; };
  const WY = -3.4, big = Math.max(L, 40), land = (sp.ka && sp.ka.slabA !== undefined) ? -sp.ka.slabA : 30;
  const C = {
    deckA: look(W(-Math.min(land, 25), 0), 1.75, W(L, 0), yD(L * 0.6) + 1.2), deckB: look(W(L + Math.min(land, 25), 0), 1.75, W(0, 0), yD(L * 0.4) + 1.2),
    mid: look(W(L / 2, HW * 0.4), yD(L / 2) + 1.75, W(L, -HW * 0.4), yD(L * 0.8) + 1.3),
    rail: look(W(-6, HW - 1.3), yD(0) + 1.65, W(L, HW - 1.3), yD(L) + 1.4),
    face: look(W(L * 0.3, HW + big * 0.5), WY + 2.2, W(L * 0.45, HW), WY + 4), face2: look(W(L * 0.7, -HW - big * 0.5), WY + 2.2, W(L * 0.55, -HW), WY + 4),
    under: look(W(L * 0.12, HW + big * 0.18), WY + 1.2, W(L * 0.22, 0), WY + 3),
    aerial: look(W(L * 0.35, HW + big * 0.9 + 25), 30 + big * 0.2, W(L * 0.5, 0), 0), aerial2: look(W(L * 0.65, -HW - big * 0.9 - 25), 30 + big * 0.2, W(L * 0.5, 0), 0),
    top: `${W(L / 2, 0)[0].toFixed(1)},${(60 + big * 0.5).toFixed(0)},${W(L / 2, 0)[1].toFixed(1)},${(-(Math.atan2(W(L, 0)[0] - W(0, 0)[0], -(W(L, 0)[1] - W(0, 0)[1])) * 180 / Math.PI)).toFixed(1)},-89`,
    a: look(W(-30, 0), 1.75, W(L / 2, 0), yD(L / 2) + 1), b: look(W(L + 30, 0), 1.75, W(L / 2, 0), yD(L / 2) + 1),
  };
  if (!C[view]) { console.error('unknown view', view, Object.keys(C).join(' ')); process.exit(1); }
  out.push(C[view]);
}
console.log(out.join(';'));
