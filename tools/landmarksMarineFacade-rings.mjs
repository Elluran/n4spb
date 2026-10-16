// tools/landmarksMarineFacade-rings.mjs - prints the PAVED_RINGS data of the berth apron of landmarksMarineFacade (groups.js): for each berth wall the polygon between the measured quay edge
// (frame.js quayEdge, the water raster) and 21 m inland, sampled every 29 m.  usage: node tools/landmarksMarineFacade-rings.mjs   (paste the printed array into groups.js when the walls change)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksMarineFacade/frame.js')).href);
const r1 = (v) => Math.round(v * 10) / 10;
const W = (u, v) => { const p = F.FW(u, v); return [r1(p.x), r1(p.z)]; };
const walls = [
  { key: 'south', from: 10, to: 596, at: (s, e, d) => W(s, e - d) },                      // land is v < edge
  { key: 'east', from: 10, to: 800, at: (s, e, d) => W(e - d, s) },                        // land is u < edge
  { key: 'north', from: 82, to: 636, at: (s, e, d) => W(s, e + d) },                       // land is v > edge
];
const out = [];
for (const w of walls) {
  const pts = []; for (let s = w.from; s <= w.to + 1e-6; s += 29) pts.push([s, F.quayEdge(w.key, s)]);
  const a = pts.filter((p) => p[1] != null);
  const ring = a.map(([s, e]) => w.at(s, e + (w.key === 'north' ? 0.1 : 0.1) * 0, 0)).concat(a.slice().reverse().map(([s, e]) => w.at(s, e, 21)));
  out.push(ring);
}
console.log('export const BERTH_RINGS = ' + JSON.stringify(out) + ';');
