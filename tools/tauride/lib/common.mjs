// Shared helpers of the Tauride Garden tools (tools/tauride/*, tools/tauride-*.mjs): repo-relative paths, the North facade loader, small pure geometry on flat rings,
// a deterministic writer for the pure-data modules, and the Python launcher for the shapely steps. Nothing here knows an absolute path: every location is derived from this file.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const TAURIDE_DIR = path.join(ROOT, 'tools/tauride');
export const RAW_DIR = path.join(TAURIDE_DIR, 'raw');            // git-ignored: third-party snapshots (Overpass / OSM API), photos, intermediate files
export const WORK_DIR = path.join(RAW_DIR, 'work');              // intermediate files of the build (derived.json, union.json ...)
export const DATA_DIR = path.join(ROOT, 'src/world/landmarksTauride/data');   // the committed pure-data modules
export const FACADE_URL = pathToFileURL(path.join(ROOT, 'src/areas/north/data/city.js')).href;
export const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

/** `--key value` / `--flag` command line, positional arguments in `_` */
export function parseArgs(argv = process.argv.slice(2)) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const s = argv[i];
    if (s.startsWith('--')) { const k = s.slice(2); const n = argv[i + 1]; if (n !== undefined && !n.startsWith('--')) { a[k] = n; i++; } else a[k] = true; } else a._.push(s);
  }
  return a;
}

/** The North data facade (src/areas/north/data/city.js, imported from its real file: no import map needed). Cached. */
let facade = null;
export async function loadFacade() { return facade || (facade = await import(FACADE_URL)); }

// ---------------------------------------------------------------- geometry on flat rings [x, z, x, z, ...] (the data format of the whole project)
/** point in a flat ring (even-odd) */
export function inRing(x, z, r) {
  let c = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) if ((r[i + 1] > z) !== (r[j + 1] > z) && x < (r[j] - r[i]) * (z - r[i + 1]) / (r[j + 1] - r[i + 1]) + r[i]) c = !c;
  return c;
}
/** point in a polygon {o, h: [holes]} */
export const inPoly = (x, z, p) => inRing(x, z, p.o) && !p.h.some((h) => inRing(x, z, h));
/** point in any polygon of a list */
export const inPolys = (x, z, ps) => ps.some((p) => inPoly(x, z, p));
/** distance of a point to the segment a-b */
export function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
}
/** distance of a point to a flat polyline */
export function polyDist(x, z, pts) { let m = Infinity; for (let i = 0; i + 3 < pts.length; i += 2) m = Math.min(m, segDist(x, z, pts[i], pts[i + 1], pts[i + 2], pts[i + 3])); return m; }
/** distance of a point to the boundary of a flat ring (closed) */
export function ringDist(x, z, r) { let m = Infinity; for (let i = 0; i < r.length; i += 2) m = Math.min(m, segDist(x, z, r[i], r[i + 1], r[(i + 2) % r.length], r[(i + 3) % r.length])); return m; }
/** length of a flat polyline */
export function polyLen(p) { let s = 0; for (let i = 0; i + 3 < p.length; i += 2) s += Math.hypot(p[i + 2] - p[i], p[i + 3] - p[i + 1]); return s; }
/** signed area (shoelace; > 0 = counter-clockwise in x-right z-up, i.e. clockwise on the map where z is south) of a flat ring */
export function ringArea(r) { let a = 0; for (let i = 0; i < r.length; i += 2) { const j = (i + 2) % r.length; a += r[i] * r[j + 1] - r[j] * r[i + 1]; } return a / 2; }
/** area of a polygon {o, h} (m2, positive) */
export const polyArea = (p) => Math.abs(ringArea(p.o)) - p.h.reduce((s, h) => s + Math.abs(ringArea(h)), 0);
/** bounding box of a flat ring or polyline */
export function bbox(r) { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < r.length; i += 2) { if (r[i] < x0) x0 = r[i]; if (r[i] > x1) x1 = r[i]; if (r[i + 1] < z0) z0 = r[i + 1]; if (r[i + 1] > z1) z1 = r[i + 1]; } return { x0, x1, z0, z1 }; }
export const inBox = (x, z, b, m = 0) => x >= b.x0 - m && x <= b.x1 + m && z >= b.z0 - m && z <= b.z1 + m;
/** do the segments p1-p2 and p3-p4 cross properly (interior points)? */
export function segCross(p1x, p1z, p2x, p2z, p3x, p3z, p4x, p4z) {
  const d1 = (p4x - p3x) * (p1z - p3z) - (p4z - p3z) * (p1x - p3x), d2 = (p4x - p3x) * (p2z - p3z) - (p4z - p3z) * (p2x - p3x);
  const d3 = (p2x - p1x) * (p3z - p1z) - (p2z - p1z) * (p3x - p1x), d4 = (p2x - p1x) * (p4z - p1z) - (p2z - p1z) * (p4x - p1x);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
/** does a flat ring cross itself? (O(n^2); the rings here have < 300 vertices) */
export function selfIntersects(r) {
  const n = r.length / 2;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segCross(r[2 * i], r[2 * i + 1], r[2 * ((i + 1) % n)], r[2 * ((i + 1) % n) + 1], r[2 * j], r[2 * j + 1], r[2 * ((j + 1) % n)], r[2 * ((j + 1) % n) + 1])) return true;
  }
  return false;
}
/** do two flat rings cross each other? */
export function ringsCross(a, b) {
  const n = a.length / 2, m = b.length / 2;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if (segCross(a[2 * i], a[2 * i + 1], a[2 * ((i + 1) % n)], a[2 * ((i + 1) % n) + 1], b[2 * j], b[2 * j + 1], b[2 * ((j + 1) % m)], b[2 * ((j + 1) % m) + 1])) return true;
  return false;
}
export const r1 = (v) => Math.round(v * 10) / 10;
export const r3 = (v) => Math.round(v * 1000) / 1000;
export const pairs = (flat) => { const o = []; for (let i = 0; i < flat.length; i += 2) o.push([flat[i], flat[i + 1]]); return o; };

// ---------------------------------------------------------------- deterministic output of pure-data ES modules
/** a JSON value on one line (numbers as given, keys in insertion order) */
const one = (v) => JSON.stringify(v);
/**
 * Serialise `export const NAME = value;` blocks. An array is written one element per line, an object one key per line when `spread` lists its name, anything else on one line.
 * LF line ends, UTF-8 without BOM: the same bytes on every machine.
 */
export function moduleText(header, exportsObj, spread = []) {
  const out = [header.trim().split('\n').map((l) => (l.startsWith('//') ? l : '// ' + l)).join('\n'), ''];
  for (const [name, v] of Object.entries(exportsObj)) {
    if (Array.isArray(v) && v.length > 1 && v.every((e) => typeof e === 'object' && e !== null)) out.push(`export const ${name} = [\n${v.map((e) => '  ' + one(e)).join(',\n')}\n];`);
    else if (spread.includes(name) && v && typeof v === 'object' && !Array.isArray(v)) out.push(`export const ${name} = {\n${Object.entries(v).map(([k, e]) => `  ${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${one(e)}`).join(',\n')}\n};`);
    else out.push(`export const ${name} = ${one(v)};`);
    out.push('');
  }
  return out.join('\n');
}
/** write a text file with LF only, creating the folder; returns the byte length */
export function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const t = text.replace(/\r\n/g, '\n');
  fs.writeFileSync(file, t, 'utf8');
  return Buffer.byteLength(t);
}
export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const writeJson = (file, v) => writeText(file, JSON.stringify(v) + '\n');

// ---------------------------------------------------------------- Python (the shapely steps)
/** the first working Python 3 launcher, or null */
export function findPython() {
  for (const c of [process.env.PYTHON, 'python', 'python3', 'py'].filter(Boolean)) {
    const r = spawnSync(c, ['-c', 'import sys;print(sys.version_info[0])'], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim() === '3') return c;
  }
  return null;
}
/** is shapely importable? { ok, version, python } */
export function shapelyInfo() {
  const py = findPython();
  if (!py) return { ok: false, why: 'no python 3 on PATH (set PYTHON=...)' };
  const r = spawnSync(py, ['-c', 'import shapely;print(shapely.__version__)'], { encoding: 'utf8' });
  return r.status === 0 ? { ok: true, version: r.stdout.trim(), python: py } : { ok: false, why: 'python found but `import shapely` failed (pip install shapely)', python: py };
}
/** run a script of tools/tauride/ with the UTF-8 mode on; throws with the script's output on failure */
export function runPython(script, args = []) {
  const info = shapelyInfo();
  if (!info.ok) throw new Error('Python/shapely missing: ' + info.why);
  const r = spawnSync(info.python, [path.join(TAURIDE_DIR, script), ...args], { encoding: 'utf8', env: { ...process.env, PYTHONUTF8: '1', PYTHONHASHSEED: "0", PYTHONDONTWRITEBYTECODE: "1" }, cwd: ROOT, maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`${script} failed (${r.status}):\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}

export const PROVENANCE = 'OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright), via the North data facade src/areas/north/data (cut from the full-city data of 102_3d_piter at commit 0568f7af, OSM snapshot 2026-10)';

/** the node loader hooks of the North page (tools/area.mjs does the same): for the tools that need layout.js as the North. Idempotent. */
export async function enterNorth() {
  if (process.env.AREA === 'north') return;      // tools/area.mjs north <tool> (or an earlier call) already registered the hooks and set AREA
  const { register } = await import('node:module');
  const { REGISTRY } = await import(pathToFileURL(path.join(ROOT, 'src/areas/registry.js')).href);
  process.env.AREA = 'north';
  register(pathToFileURL(path.join(ROOT, 'tools/lib/area-hooks.mjs')).href, { parentURL: import.meta.url, data: { root: ROOT, remap: REGISTRY.north.remap || {} } });
}
