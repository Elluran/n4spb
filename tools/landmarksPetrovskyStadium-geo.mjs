// landmarksPetrovskyStadium-geo.mjs - headless geometry sanity checks of the stadium frame (no GPU): stations, rings inside rings, mast legs on the plateau, infield inside the track, annex / canopies on the apron.   node tools/landmarksPetrovskyStadium-geo.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyStadium/frame.js')).href);
const FD = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyStadium/field.js')).href);
const B = F.bowl(), ring = F.offsetRing(F.TIP, -0.7);
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
console.log('stations', B.N, 'perimeter', B.perimeter.toFixed(1), 'bay', (B.perimeter / B.N).toFixed(2), 'dirSign', B.dirSign);
const hole = []; for (let k = 0; k < B.N; k++) { const q = B.at(k, F.GAL, 0); hole.push([q[0], q[2]]); }
ok(hole.every((p) => FD.inRing(ring, p[0], p[1])), 'gallery wall ring inside the apron ring');
const outerOut = []; for (let k = 0; k < B.N; k++) { const q = B.at(k, -0.6, 0); outerOut.push([q[0], q[2]]); }
ok(outerOut.every((p) => FD.inRing(ring, p[0], p[1])), 'cornice line inside the apron ring: ' + outerOut.filter((p) => !FD.inRing(ring, p[0], p[1])).length + ' stations outside');
// minimal / maximal apron width round the bowl
let wmin = 1e9, wmax = 0; for (let k = 0; k < B.N; k++) { const p = B.at(k, -0.6, 0); let d = 1e9; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[2] - a[1]) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(p[0] - a[0] - dx * t, p[2] - a[1] - dz * t)); } wmin = Math.min(wmin, d); wmax = Math.max(wmax, d); }
console.log('apron width from the cornice to the bank: min', wmin.toFixed(1), 'max', wmax.toFixed(1));
for (const [x, z] of F.MASTS) { ok(FD.inRing(ring, x, z), 'mast node on the apron ' + x + ',' + z); }
const LL = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
for (const [x, z] of F.MASTS) { const dx = B.c[0] - x, dz = B.c[1] - z, l = Math.hypot(dx, dz), ax = dz / l, az = -dx / l; for (const s of [-1, 1]) ok(!LL.isOnRoad(x + s * 5.7 * ax, z + s * 5.7 * az, 1.5), 'tower leg off the carriageway ' + x); }
const T = FD.trackFrame(); console.log('track frame', JSON.stringify({ cx: +T.cx.toFixed(1), cz: +T.cz.toFixed(1), half: +T.half.toFixed(1), halfV: +T.halfV.toFixed(1) }));
const inner = []; for (let k = 0; k < B.N; k++) { const q = B.at(k, B.st[k].D, 0); inner.push([q[0], q[2]]); }
// infield stadium ring vs inner ring
const A = T.A, R = T.R; console.log('track frame A', A.toFixed(1), 'R', R.toFixed(1)); let worst = 0;
for (let i = 0; i <= 8; i++) for (let t = 0; t < 360; t += 5) { const a = t * Math.PI / 180, r = R + 1.22 * i; const u = (t < 90 || t > 270 ? A : -A) + Math.cos(a) * r, v = Math.sin(a) * r; const x = T.cx + T.ux * u + T.vx * v, z = T.cz + T.uz * u + T.vz * v; if (!FD.inRing(inner, x, z)) worst = Math.max(worst, i); }
console.log('lanes outside the inner ring up to lane line', worst);
console.log(bad ? 'RESULT: ' + bad + ' FAIL' : 'RESULT: OK');
