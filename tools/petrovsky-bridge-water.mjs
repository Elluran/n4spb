// tools/petrovsky-bridge-water.mjs - wet / land profile of the Betancourt route in the environment (headless, ~100 s): prints the s ranges of water along the centre line and along both deck edges
import { makeEnv } from './petrovsky-bridge-env.mjs';
import fs from 'node:fs';
const { ctx, L } = await makeEnv();
const A = [[-4530.2,-3082.4],[-4540.7,-3073.3],[-4558.6,-3059.7],[-4583,-3044.9],[-4617.9,-3030.5],[-4670.7,-3008.8],[-4694,-2993.9],[-4714.1,-2971.1],[-4729.1,-2951.5],[-4741.7,-2930.6],[-4754.9,-2900.4],[-4803.6,-2784.9],[-4822.5,-2736.3],[-4831.5,-2705.6],[-4836.4,-2676.3],[-4835.3,-2645],[-4828.4,-2609.2],[-4817.7,-2580.4],[-4800,-2547.9],[-4779.6,-2512.3],[-4760.6,-2480],[-4746.6,-2453],[-4736.7,-2426],[-4732.2,-2405.8],[-4730.1,-2391.3],[-4730,-2378.1],[-4734.6,-2350.1],[-4736.7,-2338.7],[-4739.1,-2328],[-4742,-2320.2]];
const OFF = 6.9;   // the centre line lies 6.9 m to the left of way A (A is the right-hand carriageway)
const n = A.length, C = A.map((p, i) => { const a = A[Math.max(0, i - 1)], b = A[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return [p[0] + dz / l * OFF, p[1] - dx / l * OFF]; });   // left of travel = (+dz, -dx)/l ... verified below
console.log('centre line nodes', JSON.stringify(C.map((p) => p.map((v) => +v.toFixed(1)))));
// densify by catmull-rom
const pts = [];
for (let i = 0; i + 1 < n; i++) { const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(n - 1, i + 2)], m = Math.max(2, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2)); for (let k = 0; k < m; k++) { const t = k / m, t2 = t * t, t3 = t2 * t; pts.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } }
pts.push(C[n - 1]);
const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
console.log('length', S[S.length - 1].toFixed(1));
const wet = (x, z) => !!(L.waterwayAt(x, z) || L.inRiver(x, z));
for (const v of [0, 18, -18]) {
  let prev = null, st = 0; const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), x = pts[i][0] - v * dz / l, z = pts[i][1] + v * dx / l, w = wet(x, z);
    if (prev === null) { prev = w; st = S[i]; } else if (w !== prev) { out.push(`${prev ? 'WET' : 'land'} ${st.toFixed(0)}..${S[i].toFixed(0)}`); prev = w; st = S[i]; }
  }
  out.push(`${prev ? 'WET' : 'land'} ${st.toFixed(0)}..${S[S.length - 1].toFixed(0)}`);
  console.log('v', v, out.join(' | '));
}
console.log('waterY', JSON.stringify(Object.fromEntries(Object.entries((ctx.services.environment && ctx.services.environment.waterways) || {}).map(([k, e]) => [k, e.y]))));
// pylon: nearest centre-line point to the platform steps (-4811,-2778)
let bi = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] + 4811, pts[i][1] + 2778); if (d < bd) { bd = d; bi = i; } }
console.log('pylon s', S[bi].toFixed(1), pts[bi].map((v) => v.toFixed(1)).join(','));
process.exit(0);
