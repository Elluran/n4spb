// tools/bridges-cams-vo2.mjs - prints --cams strings for tools/shot.mjs / zfight.mjs around the second-pass Smolenka bridges of Vasilievsky Island (frames of src/world/bridges/sites-vo2.js).
// usage:  node tools/bridges-cams-vo2.mjs <site id> [names,...]     site ids: nalichny korablestroiteley smol1 smol2 smol3 smol4 foot     (default names: all)
//   node tools/shot.mjs --only environment,streets,city,bridges --cams "$(node tools/bridges-cams-vo2.mjs nalichny deck,face,aerial)" --out shots/bridges2/a --t 5
// names: deck (walking eye on the first roadway from the south bank), deck2 (from the north bank along the other roadway), pave (the east pavement), face (river level, the west face of the bridge),
//   face2 (the east face), aerial (from the south-west over the river), aerial2 (from the north-east), corner (walking eye at the south-west corner), corner2 (the north-east corner), under (below the deck),
//   close (1.5 m from the railing, looking along it), obel (the south-west obelisk / corner block from the street), vista (long view along the river), top (straight down)
import { VO2_SITES, FOOT } from '../src/world/bridges/sites-vo2.js';
const id = process.argv[2];
const site = id === 'foot' ? { id: 'foot', cx: FOOT.cx, cz: FOOT.cz, b: FOOT.b, v0: -FOOT.hw, v1: FOOT.hw, bank: FOOT.bank, zones: [[-FOOT.hw, FOOT.hw, 'walk']] } : VO2_SITES.find((s) => s.id === id);
if (!site) { console.error('unknown site', id, VO2_SITES.map((s) => s.id).join(' '), 'foot'); process.exit(1); }
const T = (site.b - 90) * Math.PI / 180, c = Math.cos(T), s = Math.sin(T);
const W = (u, v) => [site.cx + u * c - v * s, site.cz + u * s + v * c];
const yawOf = (dx, dz) => -(Math.atan2(dx, -dz) * 180 / Math.PI);
const look = (from, fy, to, ty) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${fy},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - fy, dh) * 180 / Math.PI).toFixed(1)}`; };
const walk = (from, to, ty = 1.6) => { const dx = to[0] - from[0], dz = to[1] - from[1], dh = Math.hypot(dx, dz); return `${from[0].toFixed(1)},${from[1].toFixed(1)},${yawOf(dx, dz).toFixed(1)},${(Math.atan2(ty - 1.7, dh) * 180 / Math.PI).toFixed(1)}`; };
const [b0, b1] = site.bank, hv = Math.max(-site.v0, site.v1), roads = site.zones.filter((z) => z[2] === 'asphalt' && z[1] - z[0] > 5), road0 = roads[0] || site.zones[0], road1 = roads[roads.length - 1] || site.zones[0];
const vr0 = (road0[0] + road0[1]) / 2, vr1 = (road1[0] + road1[1]) / 2, walks = site.zones.filter((z) => z[2] === 'walk' || z[2] === 'pave'), vw1 = walks.length ? (walks[walks.length - 1][0] + walks[walks.length - 1][1]) / 2 : hv - 3;
const cams = {
  deck: walk(W(b0 - 28, vr0), W(b1 + 28, vr0)), deck2: walk(W(b1 + 28, vr1), W(b0 - 28, vr1)), pave: walk(W(b0 - 30, vw1), W(b1 + 30, vw1)),
  face: look(W(0, -hv - 26), -1.6, W(0, -hv), 0.5), face2: look(W(0, hv + 26), -1.6, W(0, hv), 0.5),
  aerial: look(W(b0 - 38, -hv - 30), 28, W(0, -hv * 0.3), 1), aerial2: look(W(b1 + 38, hv + 30), 28, W(0, hv * 0.3), 1),
  corner: walk(W(b0 - 14, -hv - 8), W(b0 - 2, -hv + 1.5), 3), corner2: walk(W(b1 + 14, hv + 8), W(b1 + 2, hv - 1.5), 3),
  under: look(W(-3, -hv + 10), -2.3, W(0, hv * 0.4), -0.3),
  close: look(W(b0 + 4, -hv + 1.6), 1.7, W(b1 - 2, -hv + 0.2), 1.4),
  obel: walk(W(b0 - 16, -hv + 2), W(b0 - 3.1, -hv + 1.5), 5),
  vista: look(W(0, -hv - 150), 6, W(0, 0), 1), top: look(W(0, 0.01), 90, W(0, 0), -50),
};
cams.top = `${W(0, 0)[0].toFixed(1)},${(hv + 40).toFixed(0)},${W(0, 0)[1].toFixed(1)},${(-((site.b) % 360)).toFixed(1)},-89`;
const pick = (process.argv[3] || Object.keys(cams).filter((k) => k !== 'top').join(',')).split(',');
for (const k of pick) if (!cams[k]) { console.error('unknown camera', k, Object.keys(cams).join(' ')); process.exit(1); }
console.log(pick.map((k) => cams[k]).join(';'));
