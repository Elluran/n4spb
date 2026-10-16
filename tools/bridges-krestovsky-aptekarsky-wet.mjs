// tools/bridges-krestovsky-aptekarsky-wet.mjs - wet / land intervals along OSM ways of the claimed / unclaimed bridges of the group (headless, ~70 s): prints per way the length, the wet intervals along the centre line and the surface heights
// usage: node tools/bridges-krestovsky-aptekarsky-wet.mjs w1321576957,w82407394,... [low]  (low: a ground height under -0.8 counts as wet too: the park ponds)
import { makeEnv } from './bridges-krestovsky-aptekarsky-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ctx, L } = await makeEnv();
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const ids = process.argv[2].split(',');
const wet = (x, z) => !!(L.waterwayAt(x, z) || L.inRiver(x, z) || (process.argv[3] === 'low' && L.heightAt(x, z) < -0.8));
for (const id of ids) {
  const r = D.ROADS.find((q) => q.id === id), b = D.BRIDGES.find((q) => q.id === id);
  const pts = r ? r.pts : (b && b.pts && b.pts.length ? b.pts : null);
  if (!pts) { console.log(id, 'no polyline (deck polygon?)', b && b.polys && b.polys.length ? JSON.stringify(b.polys[0].o) : ''); continue; }
  const P = []; for (let i = 0; i < pts.length; i += 2) P.push([pts[i], pts[i + 1]]);
  const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L0 = S[S.length - 1], out = []; let prev = null, st = 0;
  const at = (s) => { let i = 1; while (i < S.length - 1 && S[i] < s) i++; const t = (s - S[i - 1]) / ((S[i] - S[i - 1]) || 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t]; };
  const hs = [];
  for (let s = -10; s <= L0 + 10; s += 1) { const q = at(Math.max(0, Math.min(L0, s))); const w = wet(q[0], q[1]); if (prev === null) { prev = w; st = s; } else if (w !== prev) { out.push(`${prev ? 'WET' : 'land'} ${st.toFixed(0)}..${s.toFixed(0)}`); prev = w; st = s; } if (s % 10 === 0) hs.push(+L.heightAt(q[0], q[1]).toFixed(1)); }
  out.push(`${prev ? 'WET' : 'land'} ${st.toFixed(0)}..${(L0 + 10).toFixed(0)}`);
  console.log(id, r ? `${r.hw} w${r.w} ${r.name || ''}` : 'deck', 'len', L0.toFixed(1), 'nodes', P.length, '|', out.join(' | '), '| heights/10m', hs.join(','));
}
process.exit(0);
