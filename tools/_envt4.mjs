import { env, ctx, L } from './environment-harness.mjs';
const lv = {}; for (const [k, v] of Object.entries(L.WATERWAYS)) lv[v.water] = (lv[v.water] ? lv[v.water] + '/' : '') + k;
console.log(JSON.stringify(lv));
const cnt = {}, per = {};
for (const t of env.trees) {
  if (t.x > -600) { continue; }
  let best = null;
  for (let a = 0; a < 16 && !best; a++) for (let d = 3; d <= 28 && !best; d += 3) { const w = L.waterLevelAt(t.x + Math.cos(a * 0.3927) * d, t.z + Math.sin(a * 0.3927) * d); if (w !== null) best = w; }
  const k = best === null ? 'none' : lv[best]; cnt[k] = (cnt[k] || 0) + 1;
}
console.log('west trees within 28 m of a waterway:', JSON.stringify(cnt));
// lengths of the banks (approx.) from the quay segments
const len = {}; for (const s of env.quay.segments) { const k = s.key || s.waterway || '?'; len[k] = (len[k] || 0) + Math.hypot(s.bx - s.ax, s.bz - s.az); }
console.log('quay segment length per key', JSON.stringify(Object.fromEntries(Object.entries(len).map(([k, v]) => [k, Math.round(v)]))), Object.keys(env.quay.segments[0]).join());
