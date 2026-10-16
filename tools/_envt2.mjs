import { env, ctx, L } from './environment-harness.mjs';
let g = null; ctx.scene.traverse((o) => { if (o.name === 'env-ground') g = o.geometry; });
const P = g.attributes.position.array, n = P.length / 9;
const B = 32, idx = new Map();
for (let t = 0; t < n; t++) { const xs = [P[t*9], P[t*9+3], P[t*9+6]], zs = [P[t*9+2], P[t*9+5], P[t*9+8]]; for (let i = Math.floor(Math.min(...xs)/B); i <= Math.floor(Math.max(...xs)/B); i++) for (let j = Math.floor(Math.min(...zs)/B); j <= Math.floor(Math.max(...zs)/B); j++) { const k = i*100003+j; (idx.get(k) || idx.set(k, []).get(k)).push(t); } }
const mult = (x, z) => { const a = idx.get(Math.floor(x/B)*100003+Math.floor(z/B)); let c = 0; if (!a) return 0; for (const t of a) { const ax = P[t*9], az = P[t*9+2], bx = P[t*9+3], bz = P[t*9+5], cx = P[t*9+6], cz = P[t*9+8]; const d = (bx-ax)*(cz-az)-(cx-ax)*(bz-az); if (!d) continue; const u = ((x-ax)*(cz-az)-(cx-ax)*(z-az))/d, v = ((bx-ax)*(z-az)-(x-ax)*(bz-az))/d; if (u>1e-7&&v>1e-7&&u+v<1-1e-7) c++; } return c; };
let rng = 12345; const rnd = () => (rng = (rng * 1664525 + 1013904223) >>> 0) / 4294967296;
const hist = {}; let ex = [];
for (let i = 0; i < 30000; i++) { const r = L.WORLD.rects[Math.floor(rnd() * L.WORLD.rects.length)]; const x = r.x0 + rnd() * (r.x1 - r.x0), z = r.z0 + rnd() * (r.z1 - r.z0); const c = mult(x, z); hist[c] = (hist[c] || 0) + 1; if (c > 1 && ex.length < 8) ex.push([Math.round(x), Math.round(z), c]); }
console.log('coverage multiplicity histogram', JSON.stringify(hist), JSON.stringify(ex));
