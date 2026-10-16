// city-cams.mjs - camera strings for tools/shot.mjs that look at the KNOWN houses of the city module from the street (eye 1.7 m).
// usage: node tools/city-cams.mjs "<substring of the address>" [more substrings] [--d 20] [--pitch 8] [--list]
//   prints   --cams "x,z,yaw,pitch;..."   and, per house, id / address / centre / storeys / colour. The camera stands `d` metres in front of the facade, on the side of the nearest road.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), subs = [], opt = { d: 20, pitch: 8 };
for (let i = 0; i < argv.length; i++) { if (argv[i] === '--d') opt.d = +argv[++i]; else if (argv[i] === '--pitch') opt.pitch = +argv[++i]; else if (argv[i] === '--list') opt.list = 1; else subs.push(argv[i]); }
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const KD = await import(pathToFileURL(path.join(root, 'src/world/city/known-data.js')).href);
const KE = await import(pathToFileURL(path.join(root, 'src/world/city/known-extra.js')).href);
const all = { ...KD.KNOWN_DATA }; for (const [k, v] of Object.entries(KE.KNOWN_EXTRA)) all[k] = { ...(all[k] || {}), ...v };
const seen = new Set(), cams = [];
for (const [id, e] of Object.entries(all)) {
  if (opt.list || !subs.length) { /* list all */ } else if (!subs.some((s) => (e.n || '').includes(s) || id === s)) continue;
  const b = L.buildingById(id); if (!b || b.cx === undefined) continue;
  const key = (e.n || id) + '|' + Math.round(b.cx / 30);
  if (seen.has(key)) continue; seen.add(key);
  const near = L.nearestRoad(b.cx, b.cz, { drivable: true, maxDist: 60 }) || L.nearestRoad(b.cx, b.cz, { maxDist: 80 });
  let nx = 0, nz = 1;
  if (near) { const dx = near.x - b.cx, dz = near.z - b.cz, l = Math.hypot(dx, dz) || 1; nx = dx / l; nz = dz / l; }
  // stand opposite the facade: from the building centre go to the road, then `d` metres short of the building edge along the same ray (approximated with the distance to the road + d/2)
  const dist = Math.max(10, (near ? Math.hypot(near.x - b.cx, near.z - b.cz) : 20) - 6) * 0 + (near ? Math.hypot(near.x - b.cx, near.z - b.cz) : 20) + opt.d * 0.3;
  const cx = b.cx + nx * dist, cz = b.cz + nz * dist;
  const yaw = L.yawToward(cx, cz, b.cx, b.cz);
  cams.push({ id, n: e.n, f: e.f, hex: e.hex, c: `${cx.toFixed(1)},${cz.toFixed(1)},${yaw.toFixed(1)},${opt.pitch}` });
}
for (const c of cams) console.log(c.c, ' | ', c.id, c.n, 'f' + c.f, c.hex || '');
console.log('--cams "' + cams.map((c) => c.c).join(';') + '"');
