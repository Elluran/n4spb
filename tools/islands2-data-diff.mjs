// Record-level diff of two bakes of the region part files (islands round 2: the proof that the old districts did not move).
//   node tools/islands2-data-diff.mjs <old data dir> <new data dir> [part,part...]     (default: every part file that exists in both)
// For every export array of a part file the records are matched by id (+ occurrence number); prints per part: added / removed / changed records and, for changed ones, whether any vertex lies inside a PLAY rectangle
// of the OLD frame (the first K4 + earlier rectangles), i.e. whether a reviewed place changed. Records without an id are compared as a multiset of their JSON.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PLAY_RECTS, EXTENT_RECTS, RECT_NAMES, inUnion, distToBoundary } from './osm-lib.mjs';
const [oldDir, newDir, only] = process.argv.slice(2);
const OLDR = PLAY_RECTS.slice(0, RECT_NAMES.indexOf('K4') + 1), OLDE = EXTENT_RECTS.slice(0, RECT_NAMES.indexOf('K4') + 1);
const onOldEdge = (r) => pts(r).some(([x, z]) => inUnion(OLDE, x, z) && distToBoundary(OLDE, x, z) < 0.8);   // a vertex of the OLD record lies on the boundary of the old EXTENT union: it was cut there
const files = fs.readdirSync(newDir).filter((f) => /^city-.*\.js$/.test(f) && f !== 'city.js' && fs.existsSync(path.join(oldDir, f)) && (!only || only.split(',').includes(f.slice(5, -3))));
function pts(r) { const out = []; const walk = (v, key) => { if (Array.isArray(v)) { if (v.length >= 2 && v.every((q) => typeof q === 'number') && v.length % 2 === 0 && v.length >= 4) { for (let i = 0; i < v.length; i += 2) out.push([v[i], v[i + 1]]); } else v.forEach((q) => walk(q)); } else if (v && typeof v === 'object') { if (typeof v.x === 'number' && typeof v.z === 'number') out.push([v.x, v.z]); for (const k of Object.keys(v)) walk(v[k]); } }; walk(r); return out; };
let totals = { added: 0, removed: 0, changed: 0, changedInOld: 0, uncut: 0 };
for (const f of files) {
  const A = await import(pathToFileURL(path.join(oldDir, f)).href + '?o'), B = await import(pathToFileURL(path.join(newDir, f)).href + '?n');
  const res = { added: 0, removed: 0, changed: 0, changedInOld: 0, uncut: 0, ex: [] };
  for (const k of Object.keys(B)) {
    const a = A[k], b = B[k]; if (!Array.isArray(b) || !Array.isArray(a)) continue;
    const idx = (arr) => { const m = new Map(), seen = new Map(); for (const r of arr) { const id = r && r.id !== undefined ? String(r.id) : null; const key = id === null ? 'j' + JSON.stringify(r) : id; const n = (seen.get(key) || 0) + 1; seen.set(key, n); m.set(key + '#' + n, r); } return m; };
    const ma = idx(a), mb = idx(b);
    for (const [key, r] of mb) { if (!ma.has(key)) { res.added++; continue; } const q = ma.get(key); if (JSON.stringify(q) !== JSON.stringify(r)) { res.changed++; if (!onOldEdge(q)) { res.uncut++; if (res.ex.length < 6) res.ex.push('UNCUT ' + k + ':' + key); } const inOld = [...pts(q), ...pts(r)].some(([x, z]) => inUnion(OLDR, x, z)); if (inOld) { res.changedInOld++; if (res.ex.length < 4) res.ex.push(k + ':' + key); } } }
    for (const key of ma.keys()) if (!mb.has(key)) res.removed++;
  }
  for (const k of Object.keys(totals)) totals[k] += res[k];
  if (res.added || res.removed || res.changed) console.log(f.padEnd(14), JSON.stringify(res));
}
console.log('TOTAL', JSON.stringify(totals));
