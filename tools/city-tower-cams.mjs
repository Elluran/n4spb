// city-tower-cams.mjs - camera strings for tools/shot.mjs that look at the corner turrets of the generic city (headless, no GPU).
//   node tools/city-tower-cams.mjs --ids w98414550,r1051208 [--d 12] [--eye 1.7] [--views face,left,right,above,low] [--pitch 10] [--top any|helm|tent|spire|dome|cone]
//   node tools/city-tower-cams.mjs --region P2 [--n 3] [--pick spread|first]      turrets of one data region (OLD, W1, N3, E1, M1.., P1.., V1..), --near x,z,r also works
// Prints one line per turret (id, region, position, top, storeys) and the --cams string. A view stands `d` metres from the tower on the outward bisector of the corner ('face': looking straight
// at the tower, 'left' / 'right': 55 degrees to either side along the street, 'above': from the roof height of the house looking down on the eaves). Pose format of shot.mjs: x,y,z,yawDeg,pitchDeg
// (yaw 0 north, 90 west, 180 south, -90 east; local metres, +x east, +z south).
import { buildFeatures, imp } from './city-tower-lib.mjs';

const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const d = Number(args.d || 12), eye = Number(args.eye || 1.7), basePitch = Number(args.pitch ?? 10), views = (args.views || 'face').split(',');
const near = args.near ? args.near.split(',').map(Number) : null;
const W = await buildFeatures({ near, all: false });
const D = await imp('src/world/data/city.js');
const regionOf = new Map();
for (const r of D.REGIONS) { const mod = await imp('src/world/data/' + r.file); for (const b of mod.BUILDINGS) regionOf.set(b.id, r.name); }
let list = W.features.filter((f) => f.kind === 'turret');
if (args.ids) { const ids = new Set(args.ids.split(',')); list = list.filter((f) => ids.has(f.id)); }
if (args.region) list = list.filter((f) => regionOf.get(String(f.id).replace(/~f$/, '')) === args.region);
if (args.top) list = list.filter((f) => (args.top === 'any') || f.meta.top === args.top);
const n = Number(args.n || list.length);
if (!args.ids && list.length > n) { if ((args.pick || 'spread') === 'spread') list = Array.from({ length: n }, (_, i) => list[Math.floor((i + 0.5) * list.length / n)]); else list = list.slice(0, n); }
const yawOf = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI;          // yaw 0 = north (-z), 90 = west (-x)
const cams = [];
for (const f of list) {
  const rec = W.recById.get(f.id); if (!rec) continue;
  // the corner vertex nearest to the tower centre and its outward bisector
  let best = null;
  for (const ring of rec.rings) { if (ring.hole) continue; const pts = ring.pts, k = pts.length; pts.forEach((v, i) => { const dd = Math.hypot(v[0] - f.meta.x, v[1] - f.meta.z); if (!best || dd < best.dd) best = { dd, i, ring, v, p: pts[(i + k - 1) % k], q: pts[(i + 1) % k] }; }); }
  const { v, p, q } = best;
  const l1 = Math.hypot(v[0] - p[0], v[1] - p[1]), l2 = Math.hypot(q[0] - v[0], q[1] - v[1]);
  const n1 = [(v[1] - p[1]) / l1, -(v[0] - p[0]) / l1], n2 = [(q[1] - v[1]) / l2, -(q[0] - v[0]) / l2];
  let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
  const row = [];
  for (const view of views) {
    let ang = 0, y = eye, pitch = basePitch, dist = d;
    if (view === 'left') ang = 55; else if (view === 'right') ang = -55; else if (view === 'above') { y = rec.st.H + 4; pitch = -14; dist = d * 0.9; } else if (view === 'low') { pitch = 28; dist = d * 0.6; }
    const a = ang * Math.PI / 180, dx = mx * Math.cos(a) - mz * Math.sin(a), dz = mx * Math.sin(a) + mz * Math.cos(a);
    const cx = f.meta.x + dx * dist, cz = f.meta.z + dz * dist;
    const pose = [cx, y, cz, yawOf(f.meta.x - cx, f.meta.z - cz), pitch].map((x, i) => (i === 3 ? x.toFixed(1) : x.toFixed(1)));
    row.push(pose.join(','));
  }
  cams.push(...row);
  console.log(`${f.id.padEnd(13)} ${(regionOf.get(String(f.id).replace(/~f$/, '')) || '?').padEnd(4)} (${f.meta.x.toFixed(1)}, ${f.meta.z.toFixed(1)}) top ${f.meta.top.padEnd(5)} storeys ${f.meta.nF}  H ${rec.st.H.toFixed(1)}  ${rec.st.street || ''}  ->  ${row.join(' ; ')}`);
}
console.log('--cams "' + cams.join(';') + '"');
process.exit(0);
