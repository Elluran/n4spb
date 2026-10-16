// tools/landmarksSeaTerminal-cams.mjs - prints camera strings for tools/shot.mjs aimed at the Sea Terminal reach (frames of landmarksSeaTerminal/frame.js).
// usage: node tools/landmarksSeaTerminal-cams.mjs [set]   sets: a (first round) | terminal | d2 | boat | far
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
globalThis.window = globalThis;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksSeaTerminal/frame.js')).href);
const T = (u, v) => F.T.W(u, v), D = (a, b) => F.D.W(a, b), B = (a, b) => F.B.W(a, b);
const walk = (p, q, pitch = 6) => { const y = L.yawToward(p.x, p.z, q.x, q.z); return `${p.x.toFixed(1)},${p.z.toFixed(1)},${y.toFixed(1)},${pitch}`; };
const free = (p, y, q, qy, pitch) => { const yaw = L.yawToward(p.x, p.z, q.x, q.z); const dist = Math.hypot(q.x - p.x, q.z - p.z); const pt = pitch ?? -Math.atan2(y - qy, dist) * 180 / Math.PI; return `${p.x.toFixed(1)},${y},${p.z.toFixed(1)},${yaw.toFixed(1)},${pt.toFixed(1)}`; };
const SETS = {
  a: [
    walk({ x: -6469, z: 613.7 }, T(60, -4), 12),                        // the NE face from the lot (T-A), eye 1.7
    free(T(60, 130), 14, T(50, 28), 14),                                // the sea face from the water, 100 m
    walk({ x: -6588, z: -48 }, D(0, -4), 8),                            // D-2 port side from the SE path (D-A)
    walk({ x: -6538, z: 348 }, B(0, 0), 8),                             // torpedo boat from the footpath (B-A)
    free(T(30, -120), 60, T(50, 28), 22),                               // aerial from the lot side
  ],
  terminal: [
    walk(T(60, -45), T(60, 0), 20), walk(T(110, -40), T(98, 0), 15), free(T(-30, 80), 12, T(10, 40), 12), free(T(20, 100), 35, T(40, 30), 30), walk({ x: -6371.5, z: 685.3 }, T(60, 20), 10),
  ],
  d2: [walk(D(7, 6), D(0, 4), 8), walk({ x: -6633, z: -17 }, D(0, 30), 6), walk({ x: -6556, z: -80 }, D(0, -30), 6), free(D(-6, 60), 20, D(0, 0), 8), walk(D(8, 30), D(0, 20), 10), free(D(14, -60), 25, D(-8, -10), 4)],
  b: [walk(T(66, -12), T(59.2, -17), 6), walk({ x: -6371.5, z: 685.3 }, T(100, 10), 8), free(T(55, 100), 16, T(37, 51), 28), walk(T(45, -40), T(40, 0), 22), free(T(110, -50), 30, T(60, 20), 20)],
  boat: [walk(B(7, 8), B(0, 4), 12), walk(B(0, 28), B(0, 0), 14), walk(B(6, -14), B(0, 0), 12), free(B(12, 22), 12, B(0, 0), 3)],
  c: [walk({ x: -6000, z: 560 }, T(50, 28), 3), free({ x: -5800, z: 1150 }, 18, T(50, 28), 40, 3), walk(D(7, -4), D(0, -4), 22), walk({ x: -6580, z: 385 }, B(0, 3), 6), walk({ x: -6568.5, z: 586.8 }, T(0, 20), 10), walk(T(106, -27), T(104, -12), 18), free(T(45, 88), 50, T(37.4, 51), 56)],
  far: [free({ x: -6200, z: 640 }, 6, T(50, 28), 40, 3), free({ x: -6750, z: 1100 }, 30, T(50, 28), 40, 4)],
};
const set = process.argv[2] || 'a';
console.log((SETS[set] || SETS.a).join(';'));
