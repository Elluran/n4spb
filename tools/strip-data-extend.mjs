// tools/strip-data-extend.mjs - add ONE new play rectangle (and its 120 m scenery margin) to the strip from the data of the full city.
//
// The strip (docs/STRIP.md) was cut from 102_3d_piter; the original data (src/world/data of that repository, its city.js facade holds every region) is still on disk. This script adds the rectangle
// SG ("Summer Garden / the Fontanka mouth": the Mikhailovsky Castle's north corner, the 1st Engineer and Panteleymonovsky bridges, the Chizhik-Pyzhik corner, the south half of the Summer Garden):
//   play   x -1000 .. -600, z -1300 .. -1000       extent (+120 m) x -1120 .. -480, z -1420 .. -880
// Only the part of the new extent that the old union does not cover is new data: the band B = x -1120 .. -480, z -1420 .. -1120. What the script does:
//   1. collects candidate records from the ORIGINAL arrays (whole records: BUILDINGS by centroid in B and not yet in the strip; points in B; lines / polygons whose bbox touches B; tree rows
//      touching B that the strip does not hold yet; OVERLAPS between new buildings; WATER only for ids the strip lacks: the strip's water polygons already reach 600 m beyond the old extent)
//   2. writes them as one part file into a scratch folder together with a one-rectangle facade (EXTENT_RECTS = [B]) and runs tools/strip-data-clip.mjs on it (the same clip functions: lines and polygons are
//      cut at the border of B, points outside B are dropped; the pieces that continue a record of an old part start exactly at the old border, like every other seam of the strip)
//   3. the result is written as src/world/data/city-sg.js (the format of every part file) and the facade src/world/data/city.js is patched (import, PLAY_RECTS, EXTENT_RECTS, RECT_NAMES, REGIONS, the concat lists)
// Idempotent: a second run finds the facade already patched and only rewrites city-sg.js.
// Usage: node tools/strip-data-extend.mjs [--orig D:/git2/agi-fun-tests/102_3d_piter/src/world/data] [--scratch <dir>] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(n); return i < 0 ? d : argv[i + 1]; };
const ORIG = path.resolve(arg('--orig', 'D:/git2/agi-fun-tests/102_3d_piter/src/world/data'));
const SCRATCH = path.resolve(arg('--scratch', path.join(root, '..', 'n4spb-scratch-sg')));
const DRY = argv.includes('--dry');
const dataDir = path.join(root, 'src', 'world', 'data');

const NAME = 'SG', FILE = 'city-sg.js';
const PLAY_SG = { x0: -1000, x1: -600, z0: -1300, z1: -1000 };
const EXT_SG = { x0: PLAY_SG.x0 - 120, x1: PLAY_SG.x1 + 120, z0: PLAY_SG.z0 - 120, z1: PLAY_SG.z1 + 120 };
const B = { x0: EXT_SG.x0, x1: EXT_SG.x1, z0: EXT_SG.z0, z1: -1120 };       // the new band: the extent of SG minus the old union (W1 extent reaches z -1120)
const inB = (x, z) => x >= B.x0 && x <= B.x1 && z >= B.z0 && z <= B.z1;

const O = await import(pathToFileURL(path.join(ORIG, 'city.js')).href);
const S = await import(pathToFileURL(path.join(dataDir, 'city.js')).href);
const facadePath = path.join(dataDir, 'city.js');
let facade = fs.readFileSync(facadePath, 'utf8');
const NAMES = [...fs.readFileSync(path.join(dataDir, 'city-n1.js'), 'utf8').matchAll(/^export const (\w+) = /gm)].map((m) => m[1]);

// ---- candidate selection
const flatBox = (f) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i + 1 < f.length; i += 2) { x0 = Math.min(x0, f[i]); x1 = Math.max(x1, f[i]); z0 = Math.min(z0, f[i + 1]); z1 = Math.max(z1, f[i + 1]); } return { x0, x1, z0, z1 }; };
const boxHits = (b) => b.x1 >= B.x0 && b.x0 <= B.x1 && b.z1 >= B.z0 && b.z0 <= B.z1;
const recHits = (r) => {
  if (typeof r.x === 'number' && typeof r.z === 'number' && !(r.pts && r.pts.length) && !(r.polys && r.polys.length)) return inB(r.x, r.z);
  if (r.pts && r.pts.length) return boxHits(flatBox(r.pts));
  if (r.polys && r.polys.length) return r.polys.some((p) => boxHits(flatBox(p.o)));
  if (r.line && r.line.length) return r.line.some((l) => boxHits(flatBox(l)));
  return false;
};
const haveIds = (name) => new Set((S[name] || []).map((r) => r && r.id).filter(Boolean));
const cand = {};
const newBuildings = new Set();
for (const name of NAMES) {
  const arr = O[name] || [];
  let out;
  if (name === 'BUILDINGS') {
    const have = haveIds('BUILDINGS');
    out = arr.filter((b) => b.cx !== undefined && inB(b.cx, b.cz) && !have.has(b.id));
    for (const b of out) newBuildings.add(b.id);
  } else if (name === 'OVERLAPS') {
    out = arr.filter((q) => newBuildings.has(q.a) && newBuildings.has(q.b));
  } else if (name === 'TREES') {
    out = []; for (let i = 0; i < arr.length; i += 2) if (inB(arr[i], arr[i + 1])) out.push(arr[i], arr[i + 1]);
  } else if (name === 'TREE_ROWS') {
    const have = new Set((S.TREE_ROWS || []).map((r) => JSON.stringify(r)));
    out = arr.filter((r) => { const f = Array.isArray(r) ? r : (r.pts || r.line || []); return boxHits(flatBox(f)) && !have.has(JSON.stringify(r)); });
  } else if (name === 'WATER' || name === 'FOUNTAINS' || name === 'STREAMS') {
    const have = haveIds(name);
    out = arr.filter((r) => !have.has(r.id) && recHits(r));
  } else {
    out = arr.filter((r) => r && typeof r === 'object' && recHits(r));
  }
  cand[name] = out;
}

// ---- scratch folder: one-rectangle facade + the candidate part
fs.rmSync(SCRATCH, { recursive: true, force: true });
fs.mkdirSync(path.join(SCRATCH, 'in'), { recursive: true });
const j2 = (v) => `JSON.parse(${JSON.stringify(JSON.stringify(v))})`;
const partText = (c) => [`// GENERATED by tools/strip-data-extend.mjs (region ${NAME}: the Summer Garden / Fontanka mouth band x ${B.x0}..${B.x1}, z ${B.z0}..${B.z1}) from the full-city data of 102_3d_piter - OpenStreetMap data (c) OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright) - see docs/STRIP.md section 10`]
  .concat(NAMES.map((n) => `export const ${n} = ${j2(c[n] || [])};`)).join('\n') + '\n';
fs.writeFileSync(path.join(SCRATCH, 'in', FILE), partText(cand));
fs.writeFileSync(path.join(SCRATCH, 'in', 'city.js'), `import * as P0 from './${FILE}';\nexport const PLAY_RECTS = ${JSON.stringify([B])};\nexport const EXTENT_RECTS = ${JSON.stringify([B])};\nexport const RECT_NAMES = ["B"];\n`);
const r = spawnSync(process.execPath, [path.join(root, 'tools', 'strip-data-clip.mjs'), '--in', path.join(SCRATCH, 'in'), '--out', path.join(SCRATCH, 'out'), '--water-ring', '0'], { stdio: 'inherit' });
if (r.status !== 0 && r.status !== null) throw new Error('strip-data-clip failed: ' + r.status);
const outFile = path.join(SCRATCH, 'out', FILE);
if (!fs.existsSync(outFile)) throw new Error('no clipped part: ' + outFile);
const res = await import(pathToFileURL(outFile).href);
const counts = Object.fromEntries(NAMES.map((n) => [n, Array.isArray(res[n]) ? (n === 'TREES' ? res[n].length / 2 : res[n].length) : 0]).filter(([, v]) => v));
console.log('new records by array:', JSON.stringify(counts));
if (DRY) process.exit(0);
fs.copyFileSync(outFile, path.join(dataDir, FILE));

// ---- patch the facade (once)
if (!facade.includes(`'./${FILE}'`)) {
  const idx = Math.max(...[...facade.matchAll(/^import \* as P(\d+) from /gm)].map((m) => +m[1])) + 1;
  facade = facade.replace(/^(import \* as P\d+ from '\.\/city-[\w-]+\.js';\n)(?!import \* as P)/m, `$1import * as P${idx} from './${FILE}';\n`);
  const lastP = idx - 1;
  facade = facade.replace(new RegExp(`\\bP${lastP}\\.(\\w+)\\)`, 'g'), (m, n) => `P${lastP}.${n}, P${idx}.${n})`);
  const addRect = (name, rect, after) => { facade = facade.replace(new RegExp(`(export const ${name} = \\[.*?)\\];`), `$1,${JSON.stringify(rect)}];`); void after; };
  addRect('PLAY_RECTS', PLAY_SG); addRect('EXTENT_RECTS', EXT_SG);
  facade = facade.replace(/(export const RECT_NAMES = \[.*?)\];/, `$1,"${NAME}"];`);
  facade = facade.replace(/(export const REGIONS = \[.*)\];/, `$1,${JSON.stringify({ name: NAME, file: FILE, playRect: PLAY_SG, extentRect: EXT_SG })}];`);
  fs.writeFileSync(facadePath, facade);
  console.log('facade patched: P' + idx + ' = ' + FILE);
}
console.log('done: ' + path.join(dataDir, FILE));
