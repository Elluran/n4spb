// prints the island coast ring points (ISLANDS2_COAST) inside a box, with the segment lengths: the shore line the harbour furniture of props/harbour.js follows
import { imp } from './traffic-harness.mjs';
const { ISLANDS2_COAST } = await imp('src/world/environment/islands2-context.js');
const [x0, x1, z0, z1] = (process.argv[2] || '-6560,-5700,-3800,-3300').split(',').map(Number);
for (const [k, o] of Object.entries(ISLANDS2_COAST)) {
  const pts = []; for (let i = 0; i < o.length; i += 2) if (o[i] > x0 && o[i] < x1 && o[i + 1] > z0 && o[i + 1] < z1) pts.push([i / 2, Math.round(o[i] * 10) / 10, Math.round(o[i + 1] * 10) / 10]);
  if (pts.length) console.log(k, o.length / 2, 'pts', pts.length, pts.map((p) => p.join(':')).join(' '));
}
