// tools/yelagin-ponds-cams.mjs - prints --cams strings for tools/shot.mjs / zfight.mjs round the pond bridges and sluices of the Yelagin park (src/world/bridges/yelaginPonds.js).
// usage:  node tools/yelagin-ponds-cams.mjs id:view,id:view,...      ids: p1s2s pcat p2s3s p3s4s p4n5nA pzoo p4n5nB p3n4n p2n3n pthea p1n2n s4s s1s s5n sne
//   views: deck (walking eye 1.7 m, 6 m before the deck end, looking along the axis), side (free camera 2.2 m high, 11 m off the axis, looking at the middle), low (1.0 m above the water, 10 m beside, looking at the
//   face), aerial (28 m high, 30 m off), end (walking eye, 3 m past the end looking back at the deck), close (free camera 1.6 m, 4.5 m off the axis, at the rail)
import { PONDS, SLUICES, frameOfPond } from '../src/world/bridges/yelaginPonds.js';
const REC = [...PONDS, ...SLUICES];
const yawOf = (dx, dz) => -(Math.atan2(dx, -dz) * 180 / Math.PI);
const look = (from, fy, to, ty) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${fy},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - fy, dh) * 180 / Math.PI).toFixed(1)}`; };
const walk = (from, to, ty = 1.4) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - 1.7, dh) * 180 / Math.PI).toFixed(1)}`; };
const out = [];
for (const spec of (process.argv[2] || 'p3s4s:deck,p3s4s:side').split(',')) {
  const [id, view] = spec.split(':'), sp = REC.find((q) => q.id === id); if (!sp) { console.error('unknown', id); process.exit(1); }
  const f = frameOfPond(sp), HL = Math.max(f.len, sp.ring ? sp.ring[0] : 0, sp.len || 0) / 2, W = (u, v) => { const x = f.cx + u * f.c - v * f.s, z = f.cz + u * f.s + v * f.c; return [x, z]; };
  if (view === 'deck') out.push(walk(W(-HL - 6, 0), W(HL, 0)));
  else if (view === 'end') out.push(walk(W(HL + 3, 0.3), W(-HL, 0)));
  else if (view === 'side') out.push(look(W(0, 11), 2.2, W(0, 0), 0.5));
  else if (view === 'low') out.push(look(W(2, 10), 0.9, W(0, 0), 0.4));
  else if (view === 'aerial') out.push(look(W(-14, 24), 26, W(0, 0), 0));
  else if (view === 'close') out.push(look(W(-HL * 0.5, 4.5), 1.6, W(-HL * 0.5 + 3, 0), 0.8));
  else { console.error('unknown view', view); process.exit(1); }
}
console.log(out.join(';'));
