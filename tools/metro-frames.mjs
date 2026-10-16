// Derives platform FRAMES rows + entrance / interchange / tunnel facts for the not yet built metro stations (south + east districts)
// from the baked OSM data. Run from anywhere: `node tools/metro-frames.mjs` (writes docs/research/metro-frames-south-east.md and prints it).
// Method (docs/METRO.md, "Frames come from the PCA of the OSM platform polygons"):
//   origin = middle of the platform (centre of the extents along / across the PCA axis), street coordinates (+x east, +z south)
//   yaw    = atan2(dx, dz) of the local +z axis; +z points toward the HIGHER station index of the line (order of STATIONS in data/metro.js)
//   local +x = (cos yaw, -sin yaw); local = (dx cos yaw - dz sin yaw, dx sin yaw + dz cos yaw); y = -depth; len = platform length.
// Stations without a platform polygon (Pl. Aleksandra Nevskogo 1 / 2): centre = midpoint of the OSM route stop nodes, axis = bearing of the line tunnel ways.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => new URL(p, import.meta.url);
const city = await import(here('../src/world/data/city.js').href);
const { PLATFORMS, STATIONS: OSM_STATIONS, ENTRANCES, SUBWAY, SUBWAY_ROUTES } = city;
const meta = await import(here('../src/world/data/metro.js').href);
const { STATIONS: ROWS, FRAMES: BUILT } = meta;

const f2 = (v) => v.toFixed(2), f1 = (v) => v.toFixed(1), f4 = (v) => v.toFixed(4);
const deg = (r) => r * 180 / Math.PI;
const mod = (a, m) => ((a % m) + m) % m;
const compass = (ux, uz) => mod(deg(Math.atan2(ux, -uz)), 360);          // 0 = north (-z), 90 = east (+x)

// ---------------------------------------------------------------- geometry helpers
function polyMoments(ring) {
  // integrals over one simple polygon (shifted to the first vertex for precision): area, first and second moments
  const ox = ring[0], oz = ring[1], n = ring.length / 2;
  let A = 0, Sx = 0, Sz = 0, Sxx = 0, Szz = 0, Sxz = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, x0 = ring[2 * i] - ox, z0 = ring[2 * i + 1] - oz, x1 = ring[2 * j] - ox, z1 = ring[2 * j + 1] - oz, c = x0 * z1 - x1 * z0;
    A += c / 2; Sx += (x0 + x1) * c / 6; Sz += (z0 + z1) * c / 6;
    Sxx += (x0 * x0 + x0 * x1 + x1 * x1) * c / 12; Szz += (z0 * z0 + z0 * z1 + z1 * z1) * c / 12;
    Sxz += (x0 * z1 + 2 * x0 * z0 + 2 * x1 * z1 + x1 * z0) * c / 24;
  }
  const s = A < 0 ? -1 : 1;                                                // orientation independent
  return {
    A: A * s, Sx: (Sx + ox * A) * s, Sz: (Sz + oz * A) * s,
    Sxx: (Sxx + 2 * ox * Sx + ox * ox * A) * s, Szz: (Szz + 2 * oz * Sz + oz * oz * A) * s, Sxz: (Sxz + ox * Sz + oz * Sx + ox * oz * A) * s,
  };
}
const addM = (a, b, k = 1) => { for (const key of Object.keys(a)) a[key] += k * b[key]; return a; };
function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
/** axis of the area-weighted second moments (PCA) of a set of polygons (outer rings minus holes) + the min-area rectangle bearing of the vertex hull */
function analyse(polys) {
  const M = { A: 0, Sx: 0, Sz: 0, Sxx: 0, Szz: 0, Sxz: 0 }, verts = [];
  for (const p of polys) {
    addM(M, polyMoments(p.o));
    for (let i = 0; i < p.o.length; i += 2) verts.push([p.o[i], p.o[i + 1]]);
    for (const h of p.h || []) addM(M, polyMoments(h), -1);
  }
  const cx = M.Sx / M.A, cz = M.Sz / M.A, vxx = M.Sxx / M.A - cx * cx, vzz = M.Szz / M.A - cz * cz, vxz = M.Sxz / M.A - cx * cz;
  const th = 0.5 * Math.atan2(2 * vxz, vxx - vzz), ux = Math.cos(th), uz = Math.sin(th);      // major axis (unit, sign arbitrary)
  const tmp = 0.5 * (vxx + vzz), rad = Math.hypot(0.5 * (vxx - vzz), vxz), l1 = tmp + rad, l2 = tmp - rad;
  // vertex-only PCA, for comparison
  const mx = verts.reduce((s, v) => s + v[0], 0) / verts.length, mz = verts.reduce((s, v) => s + v[1], 0) / verts.length;
  let wxx = 0, wzz = 0, wxz = 0;
  for (const v of verts) { wxx += (v[0] - mx) ** 2; wzz += (v[1] - mz) ** 2; wxz += (v[0] - mx) * (v[1] - mz); }
  const thV = 0.5 * Math.atan2(2 * wxz, wxx - wzz);
  // min-area rectangle
  const H = hull(verts); let best = null;
  for (let i = 0; i < H.length; i++) {
    const a = H[i], b = H[(i + 1) % H.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
    let u0 = 1e9, u1 = -1e9, w0 = 1e9, w1 = -1e9;
    for (const v of H) { const u = v[0] * dx + v[1] * dz, w = -v[0] * dz + v[1] * dx; u0 = Math.min(u0, u); u1 = Math.max(u1, u); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
    const area = (u1 - u0) * (w1 - w0);
    if (!best || area < best.area) best = { area, dx, dz, L: u1 - u0, W: w1 - w0 };
  }
  if (best.W > best.L) best = { ...best, dx: -best.dz, dz: best.dx, L: best.W, W: best.L };
  return { area: M.A, cx, cz, ux, uz, ratio: Math.sqrt(l1 / l2), verts, hullAxis: [best.dx, best.dz], hullL: best.L, hullW: best.W, vertexAxis: [Math.cos(thV), Math.sin(thV)] };
}
/** extents of the vertices along the axis u = (ux, uz) and across it (w = (uz, -ux) = local +x): centre of the extents, length, width */
function extents(verts, ux, uz) {
  const wx = uz, wz = -ux; let u0 = 1e9, u1 = -1e9, w0 = 1e9, w1 = -1e9;
  for (const [x, z] of verts) { const u = x * ux + z * uz, w = x * wx + z * wz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
  const um = (u0 + u1) / 2, wm = (w0 + w1) / 2;
  return { x: um * ux + wm * wx, z: um * uz + wm * wz, len: u1 - u0, wid: w1 - w0 };
}
const mkFrame = (x, z, yaw) => ({ x, z, yaw });
const toLocal = (f, x, z) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z; return [dx * c - dz * s, dx * s + dz * c]; };
const toWorld = (f, lx, lz) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw); return [f.x + lx * c + lz * s, f.z - lx * s + lz * c]; };
/** nearest point of a flat polyline [x0, z0, x1, z1 ...] to (px, pz): { d, x, z, seg, ux, uz } (unit direction of the nearest segment) */
function nearestOnLine(pts, px, pz) {
  let best = null;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i], az = pts[i + 1], bx = pts[i + 2], bz = pts[i + 3], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2)), x = ax + t * dx, z = az + t * dz, d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) { const L = Math.sqrt(L2); best = { d, x, z, seg: i / 2, ux: dx / L, uz: dz / L }; }
  }
  return best;
}
const lineLen = (pts) => { let s = 0; for (let i = 0; i + 3 < pts.length; i += 2) s += Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]); return s; };

// ---------------------------------------------------------------- the stations
// id (data/metro.js), line, platform ids (null = no polygon), partners (interchange), OSM station node
const TARGETS = [
  { id: 'sennaya', line: '2', pl: ['r8276303'], title: 'Sennaya Ploshchad', partners: ['sadovaya', 'spasskaya'], node: 'n94857612' },
  { id: 'spasskaya', line: '4', pl: ['w195207957'], title: 'Spasskaya', partners: ['sennaya', 'sadovaya'], node: 'n1109163153' },
  { id: 'sadovaya', line: '5', pl: ['r8362431'], title: 'Sadovaya', partners: ['sennaya', 'spasskaya'], node: 'n92580819' },
  { id: 'tekhnolog', line: '1', pl: ['w192592694'], title: 'Tekhnologichesky Institut 1', partners: ['tekhnolog2'], node: 'n1669571976' },
  { id: 'tekhnolog2', line: '2', pl: ['w418563876'], title: 'Tekhnologichesky Institut 2', partners: ['tekhnolog'], node: 'n1669571977' },
  { id: 'pushkinskaya', line: '1', pl: ['r2656886'], title: 'Pushkinskaya', partners: ['zvenigorodskaya'], node: 'n2194446558' },
  { id: 'zvenigorodskaya', line: '5', pl: ['r2656887'], title: 'Zvenigorodskaya', partners: ['pushkinskaya'], node: 'n2080777576' },
  { id: 'chernyshevskaya', line: '1', pl: ['w193159633', 'w417345103'], title: 'Chernyshevskaya', partners: [], node: 'n4179047476' },
  { id: 'ligovsky', line: '4', pl: ['w182994675'], title: 'Ligovsky Prospekt', partners: [], node: 'n94877075' },
  { id: 'pan1', line: '3', pl: null, title: 'Pl. Aleksandra Nevskogo 1', partners: ['pan2'] },
  { id: 'pan2', line: '4', pl: null, title: 'Pl. Aleksandra Nevskogo 2', partners: ['pan1'] },
];
// stations already built (validation of the method): data/metro.js FRAMES id -> platform ids
const VALIDATE = [
  ['vosstaniya', ['r5633943']], ['mayakovskaya', ['r8362462']], ['vladimirskaya', ['w193019201', 'w556602690']], ['gostiny', ['w1213628028']],
  ['admiralteyskaya', ['w143178963']], ['chkalovskaya', ['r4069761']], ['petrogradskaya', ['w104591876']], ['sportivnaya', ['w663951203']],
  ['gorkovskaya', ['w192995787', 'w1436943639']], ['vasileostrovskaya', ['w194075346']], ['gorny', ['w506098421']],
];

const rowOf = (id) => {
  for (const l of Object.keys(ROWS)) { const i = ROWS[l].findIndex((s) => s.id === id); if (i >= 0) return { line: l, idx: i, row: ROWS[l][i], list: ROWS[l] }; }
  return null;
};
/** world position of a station id of data/metro.js: OSM station node, else row pos, else the midpoint of the route stop nodes with that name */
function posOf(id) {
  const info = rowOf(id); if (!info) return null;
  const t = TARGETS.find((q) => q.id === id);
  if (t && t.node) { const n = OSM_STATIONS.find((s) => s.id === t.node); if (n) return [n.x, n.z, 'station node ' + n.id]; }
  if (info.row.pos) return [info.row.pos[0], info.row.pos[1], 'row pos'];
  const names = {};
  for (const r of SUBWAY_ROUTES.filter((q) => q.ref === info.line)) for (const s of r.stops) (names[s.name] ||= []).push(s);
  let list = names[info.row.name];
  if (!list) { const k = Object.keys(names).find((n) => n.replace(/ [12]$/, '') === info.row.name.replace(/ [12]$/, '')); list = k && names[k]; }
  if (list) return [list.reduce((s, q) => s + q.x, 0) / list.length, list.reduce((s, q) => s + q.z, 0) / list.length, 'midpoint of ' + list.length + ' route stop nodes (' + list.map((q) => q.id).join(', ') + ')'];
  const osm = OSM_STATIONS.find((s) => s.name === info.row.name && (s.lines || []).includes(info.line));
  return osm ? [osm.x, osm.z, 'station node ' + osm.id] : null;
}
/** unit direction of travel toward the higher station index at station `id`: (next - prev) over the existing neighbours */
function towardHigher(id, c) {
  const info = rowOf(id), prev = info.list[info.idx - 1], next = info.list[info.idx + 1];
  const pp = prev && posOf(prev.id), np = next && posOf(next.id);
  let dx = 0, dz = 0;
  if (np) { dx += np[0] - c[0]; dz += np[1] - c[1]; }
  if (pp) { dx += c[0] - pp[0]; dz += c[1] - pp[1]; }
  const L = Math.hypot(dx, dz) || 1;
  return { dx: dx / L, dz: dz / L, prev: prev && pp && { id: prev.id, pos: pp }, next: next && np && { id: next.id, pos: np } };
}
/** tunnel ways of the line near (x, z): sorted by distance */
function tunnelsNear(line, x, z, R) {
  return SUBWAY.filter((w) => w.line === line && w.pts && w.pts.length >= 4).map((w) => ({ w, ...nearestOnLine(w.pts, x, z) })).filter((q) => q.d <= R).sort((a, b) => a.d - b.d);
}
/** axial (mod 180) weighted mean bearing of the nearest segments of tunnel ways */
function tunnelAxis(list) {
  let sx = 0, sz = 0, W = 0;
  for (const q of list) { const w = 1 / (q.d + 10), a = Math.atan2(q.uz, q.ux); sx += w * Math.cos(2 * a); sz += w * Math.sin(2 * a); W += w; }
  if (!W) return null;
  const a = 0.5 * Math.atan2(sz, sx); return { ux: Math.cos(a), uz: Math.sin(a), spread: Math.sqrt(sx * sx + sz * sz) / W };
}
const angDiffAxial = (a, b) => Math.abs(mod(deg(a) - deg(b) + 90, 180) - 90);

// ---------------------------------------------------------------- derive
const out = [];                                                     // markdown lines
const log = (s = '') => out.push(s);
const platformById = (id) => PLATFORMS.find((p) => p.id === id);

function derive(id, line, plIds) {
  const info = rowOf(id);
  const res = { id, line, row: info && info.row };
  let centre, ax;
  if (plIds) {
    const pls = plIds.map(platformById);
    if (pls.some((p) => !p)) throw new Error('platform missing for ' + id);
    const a = analyse(pls.flatMap((p) => p.polys));
    res.pl = pls; res.an = a; ax = { ux: a.ux, uz: a.uz }; centre = [a.cx, a.cz];
  } else {
    const p = posOf(id); centre = [p[0], p[1]]; res.posSrc = p[2];
    const near = tunnelsNear(line, centre[0], centre[1], 150), ta = tunnelAxis(near);
    res.tunnelSpread = ta && ta.spread; ax = ta;
  }
  const dir = towardHigher(id, centre);
  let { ux, uz } = ax; if (ux * dir.dx + uz * dir.dz < 0) { ux = -ux; uz = -uz; }
  res.dir = dir; res.u = [ux, uz]; res.yaw = Math.atan2(ux, uz); res.bearing = compass(ux, uz);
  if (plIds) { const e = extents(res.an.verts, ux, uz); res.c = [e.x, e.z]; res.len = e.len; res.wid = e.wid; }
  else { res.c = centre; res.len = null; res.wid = null; }
  // tunnel bearing cross-check for every station
  const near = tunnelsNear(line, res.c[0], res.c[1], 150), ta = tunnelAxis(near);
  res.tunnelAxis = ta; res.tunnelDiff = ta ? angDiffAxial(Math.atan2(uz, ux), Math.atan2(ta.uz, ta.ux)) : null; res.tunnels150n = near.length;
  return res;
}

log('# Metro frames: south + east stations (derived from the baked OSM data)');
log();
log('Generated by `node tools/metro-frames.mjs` (do not edit by hand). Street coordinates: +x east, +z south. `yaw = atan2(dx, dz)` of the local +z axis, local +x = (cos yaw, -sin yaw),');
log('local = (dx cos yaw - dz sin yaw, dx sin yaw + dz cos yaw). **+z points toward the HIGHER station index of the line** (STATIONS order in data/metro.js: L1 Devyatkino -> Veteranov, L2 Kupchino -> Parnas,');
log('L3 Begovaya -> Rybatskoye, L4 Gorny Institut -> Dybenko, L5 Komendantsky -> Shushary). Compass: 0 = north (-z), 90 = east (+x).');
log('Method: area-weighted PCA of the OSM platform polygon(s) (holes subtracted); the origin is the middle of the extents of the vertices along / across the axis; `len` / `wid` are those extents.');
log('The sign of the axis is fixed by (next station - previous station) of the line, positions from the OSM station nodes / route stops.');
log();
log('## 0. Validation of the method on the built stations');
log();
log('Same procedure applied to stations whose FRAMES row is already in data/metro.js (hand-derived, some slid or re-aimed for the building): axis delta in degrees, centre offset in metres.');
log();
log('| station | built yaw | derived yaw | axis delta (deg) | centre offset (m) | built len | derived len x wid | note |');
log('|---|---|---|---|---|---|---|---|');
for (const [id, pls] of VALIDATE) {
  const f = BUILT[id], info = rowOf(id); if (!f || !info) continue;
  try {
    const d = derive(id, info.line, pls), dy = angDiffAxial(f.yaw, d.yaw), same = Math.cos(f.yaw - d.yaw) > 0;
    log(`| ${id} | ${f4(f.yaw)} | ${f4(d.yaw)} | ${f1(dy)}${same ? '' : ' (+z opposite!)'} | ${f1(Math.hypot(f.x - d.c[0], f.z - d.c[1]))} | ${f.len} | ${f1(d.len)} x ${f1(d.wid)} | ${info.row.note || ''} |`);
  } catch (e) { log(`| ${id} | - | - | - | - | - | - | ${e.message} |`); }
}
log();

const R = TARGETS.map((t) => derive(t.id, t.line, t.pl));
const byId = Object.fromEntries(R.map((r) => [r.id, r]));
const FR = (r) => mkFrame(r.c[0], r.c[1], r.yaw);
const tOf = (id) => TARGETS.find((q) => q.id === id);
const osmOf = (t) => t.node ? OSM_STATIONS.find((s) => s.id === t.node) : null;

log('## 1. Summary table');
log();
log('| id | line | source | centre x, z | yaw (rad) | +z compass | axis (mod 180) | len x wid (m) | depth OSM / row -> y | tunnel axis delta (deg) |');
log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of R) {
  const t = tOf(r.id), osm = osmOf(t);
  log(`| ${r.id} | ${r.line} | ${t.pl ? t.pl.join(' + ') : 'route stops'} | ${f2(r.c[0])}, ${f2(r.c[1])} | ${f4(r.yaw)} | ${f1(r.bearing)} | ${f1(mod(r.bearing, 180))} | ${r.len ? f1(r.len) + ' x ' + f1(r.wid) : 'n/a (no polygon)'} | ${osm ? osm.depth : '-'} / ${r.row.depth} -> ${-r.row.depth} | ${r.tunnelDiff == null ? '-' : f1(r.tunnelDiff)} (${r.tunnels150n} ways) |`);
}
log();

log('## 2. Ready-to-paste FRAMES rows');
log();
log('`y = -depth` of the data/metro.js STATIONS row; `len` = the platform extent along the axis (PCA), rounded; the PAN rows have no polygon, `len: 150` is a placeholder.');
log();
log('```js');
for (const r of R) {
  const len = r.len ? Math.round(r.len * 10) / 10 : 150, to = r.dir.next ? r.dir.next.id : r.dir.prev.id;
  log(`FRAMES.${r.id} = { x: ${f2(r.c[0])}, z: ${f2(r.c[1])}, yaw: ${f4(r.yaw)}, y: ${-r.row.depth}, len: ${len}, line: '${r.line}' };   // +z compass ${f1(r.bearing)} toward ${to}`);
}
log('```');

log();
log('## 3. Per station');
for (const r of R) {
  const t = tOf(r.id), F = FR(r);
  log();
  log(`### ${t.title} (${r.id}, line ${r.line})`);
  log();
  if (r.pl) {
    const a = r.an;
    log(`* **Platform polygon${r.pl.length > 1 ? 's' : ''}:** ${r.pl.map((p) => `${p.id} "${p.name}" (${p.polys.map((q) => q.o.length / 2).join('+')} vertices, holes ${p.polys.reduce((s, q) => s + (q.h || []).length, 0)}, centre ${p.x}, ${p.z}, area ${p.area} m2)`).join('; ')}`);
    log(`* **Axis:** area-weighted PCA ${f1(mod(compass(a.ux, a.uz), 180))} deg (aspect sqrt(l1/l2) = ${f1(a.ratio)}); vertex-only PCA ${f1(mod(compass(a.vertexAxis[0], a.vertexAxis[1]), 180))}; min-area rectangle ${f1(mod(compass(a.hullAxis[0], a.hullAxis[1]), 180))} (${f1(a.hullL)} x ${f1(a.hullW)}). Area centroid ${f2(a.cx)}, ${f2(a.cz)} (extent centre ${f2(r.c[0])}, ${f2(r.c[1])}; offset ${f1(Math.hypot(a.cx - r.c[0], a.cz - r.c[1]))} m).`);
    log(`* **Frame:** centre (${f2(r.c[0])}, ${f2(r.c[1])}), axis bearing ${f1(mod(compass(r.u[0], r.u[1]), 180))} deg, **+z compass ${f1(r.bearing)}, yaw ${f4(r.yaw)} rad (${f1(deg(r.yaw))} deg)**, length ${f1(r.len)} m along, width ${f1(r.wid)} m across (local +x compass ${f1(mod(r.bearing + 90, 360))}).`);
    if (r.pl.length > 1) {
      log('* **Polygons separately in the frame:** ' + r.pl.map((p) => {
        const [lx, lz] = toLocal(F, p.x, p.z), v = []; for (let i = 0; i < p.polys[0].o.length; i += 2) v.push([p.polys[0].o[i], p.polys[0].o[i + 1]]);
        const e = extents(v, r.u[0], r.u[1]); return `${p.id}: centre local (${f1(lx)}, ${f1(lz)}), ${f1(e.len)} x ${f1(e.wid)}`;
      }).join('; ') + '.');
      const [l0x, l0z] = toLocal(F, r.pl[0].x, r.pl[0].z), [l1x, l1z] = toLocal(F, r.pl[1].x, r.pl[1].z), dX = Math.abs(l0x - l1x), dZ = Math.abs(l0z - l1z);
      log(`* **Reading of the two polygons:** their centres differ by ${f1(dX)} m across and ${f1(dZ)} m along the axis, so they lie ${dX >= dZ ? 'SIDE BY SIDE (two parallel strips, e.g. two side platforms or the two platform edges of one hall, gap between them ' + f1(Math.max(0, dX - 5)) + ' m)' : 'END TO END (one platform in two pieces)'}; the frame is the union.`);
    }
    const vloc = a.verts.map(([x, z]) => toLocal(F, x, z)), lxs = vloc.map((v) => v[0]), lzs = vloc.map((v) => v[1]);
    log(`* **Hull in the frame:** local x ${f1(Math.min(...lxs))} .. ${f1(Math.max(...lxs))}, local z ${f1(Math.min(...lzs))} .. ${f1(Math.max(...lzs))}; ends (world): -z end (${toWorld(F, 0, Math.min(...lzs)).map(f1).join(', ')}), +z end (${toWorld(F, 0, Math.max(...lzs)).map(f1).join(', ')}).`);
  } else {
    log(`* **No platform polygon.** Centre = ${r.posSrc}: (${f2(r.c[0])}, ${f2(r.c[1])}). Axis = bearing of the line-${r.line} tunnel ways within 150 m (weighted axial mean of the nearest segments, concentration ${f2(r.tunnelSpread)}, 1.00 = all parallel).`);
    log(`* **Frame:** centre (${f2(r.c[0])}, ${f2(r.c[1])}), tunnel axis ${f1(mod(compass(r.u[0], r.u[1]), 180))} deg, **+z compass ${f1(r.bearing)}, yaw ${f4(r.yaw)} rad (${f1(deg(r.yaw))} deg)**; platform length unknown (use 150 m or the row type).`);
  }
  const nb = (x) => x ? `${x.id} at (${f1(x.pos[0])}, ${f1(x.pos[1])}), ${f1(Math.hypot(x.pos[0] - r.c[0], x.pos[1] - r.c[1]))} m` : 'none (end of the known line)';
  log(`* **Direction rule:** +z toward the higher index. Previous = ${nb(r.dir.prev)}. Next = ${nb(r.dir.next)}. (next - prev) points ${f1(compass(r.dir.dx, r.dir.dz))} deg, the axis is kept at ${f1(r.bearing)}.`);
  const osm = osmOf(t);
  log(`* **Depth:** OSM ${osm ? osm.depth : 'n/a'}${osm ? ` (station node ${osm.id} at ${osm.x}, ${osm.z}, ${f1(Math.hypot(osm.x - r.c[0], osm.z - r.c[1]))} m from the frame centre)` : ''}; data/metro.js row ${r.row.depth} (${r.row.type}) -> y = ${-r.row.depth}${osm && osm.depth !== r.row.depth ? ' **(differs)**' : ''}.`);
  if (r.tunnelAxis) log(`* **Tunnel cross-check:** ${r.tunnels150n} line-${r.line} way(s) within 150 m, axial bearing ${f1(mod(compass(r.tunnelAxis.ux, r.tunnelAxis.uz), 180))} deg (concentration ${f2(r.tunnelAxis.spread)}); difference to the frame axis ${f1(r.tunnelDiff)} deg.`);

  const ent = ENTRANCES.map((e) => ({ e, d: Math.hypot(e.x - r.c[0], e.z - r.c[1]) })).filter((q) => q.d <= 250).sort((x, y) => x.d - y.d);
  log();
  log(`**Entrances within 250 m of the centre (${ent.length}).** Local x, z are in the frame of ${r.id}.`);
  log();
  log('| name | ref | kind | osm id | x, z | bldg | dist (m) | local x, z |');
  log('|---|---|---|---|---|---|---|---|');
  for (const { e, d } of ent) { const [lx, lz] = toLocal(F, e.x, e.z); log(`| ${e.name || ''} | ${e.ref || ''} | ${e.kind || ''} | ${e.id || ''} | ${e.x}, ${e.z} | ${e.bldg || ''} | ${f1(d)} | ${f1(lx)}, ${f1(lz)} |`); }
  if (!ent.length) {
    const nn = ENTRANCES.map((e) => ({ e, d: Math.hypot(e.x - r.c[0], e.z - r.c[1]) })).sort((x, y) => x.d - y.d).slice(0, 3);
    log(`| (none within 250 m; nearest three:) | | | | | | | |`);
    for (const { e, d } of nn) { const [lx, lz] = toLocal(F, e.x, e.z); log(`| ${e.name || ''} | ${e.ref || ''} | ${e.kind || ''} | ${e.id || ''} | ${e.x}, ${e.z} | ${e.bldg || ''} | ${f1(d)} | ${f1(lx)}, ${f1(lz)} |`); }
  }

  if (t.partners.length) {
    log();
    log('**Interchange partners** (centre of the partner in the frame of this station):');
    log();
    log('| partner | line | partner centre (world) | local x, z | distance (m) | partner +z vs this +z | axis angle (deg) | depth (this / partner) |');
    log('|---|---|---|---|---|---|---|---|');
    for (const pid of t.partners) {
      const p = byId[pid], [lx, lz] = toLocal(F, p.c[0], p.c[1]), ang = deg(Math.atan2(Math.sin(p.yaw - r.yaw), Math.cos(p.yaw - r.yaw)));
      log(`| ${pid} | ${p.line} | ${f1(p.c[0])}, ${f1(p.c[1])} | ${f1(lx)}, ${f1(lz)} | ${f1(Math.hypot(lx, lz))} | ${Math.abs(ang) < 90 ? 'same way' : 'opposite'} (rotated ${f1(ang)} deg) | ${f1(angDiffAxial(r.yaw, p.yaw))} | ${r.row.depth} / ${p.row.depth} |`);
    }
  }

  const tun = tunnelsNear(r.line, r.c[0], r.c[1], 60);
  log();
  log(`**Line-${r.line} SUBWAY ways within 60 m of the centre (${tun.length}).** Closest point and both endpoints, world and (local); "near built" = the nearest built FRAMES centre to the endpoint.`);
  log();
  log('| way | length (m) | closest d (m) | closest local x, z | seg dir local | endpoint A world (local) | endpoint B world (local) | A near built | B near built |');
  log('|---|---|---|---|---|---|---|---|---|');
  const builtNear = (x, z) => { let b = null; for (const [bid, f] of Object.entries(BUILT)) { const d = Math.hypot(f.x - x, f.z - z); if (!b || d < b.d) b = { bid, d }; } return `${b.bid} ${Math.round(b.d)} m`; };
  for (const q of tun) {
    const p = q.w.pts, ax = p[0], az = p[1], bx = p[p.length - 2], bz = p[p.length - 1], [cx, cz] = toLocal(F, q.x, q.z);
    const sd = [q.ux * Math.cos(r.yaw) - q.uz * Math.sin(r.yaw), q.ux * Math.sin(r.yaw) + q.uz * Math.cos(r.yaw)], la = toLocal(F, ax, az), lb = toLocal(F, bx, bz);
    log(`| ${q.w.id} | ${Math.round(lineLen(p))} | ${f1(q.d)} | ${f1(cx)}, ${f1(cz)} | (${f2(sd[0])}, ${f2(sd[1])}) | ${f1(ax)}, ${f1(az)} (${f1(la[0])}, ${f1(la[1])}) | ${f1(bx)}, ${f1(bz)} (${f1(lb[0])}, ${f1(lb[1])}) | ${builtNear(ax, az)} | ${builtNear(bx, bz)} |`);
  }
}

log();
log('## 4. Tunnel ways that join the new stations to their neighbours');
log();
log('For each pair (new station, neighbour on the same line): the SUBWAY ways of that line that pass within 60 m of either centre. "dA / dB" = distance of the polyline to the first / second centre (m); "ends" = distance');
log('of the nearer polyline endpoint to the first / second centre. A way within 60 m of BOTH is a continuous tunnel between the two stations. Otherwise the baked tunnels have a GAP: the verdict gives the smallest');
log('distance between an endpoint of a way near the first station and an endpoint of a way near the second one (builders must bridge it with a generated tunnel).');
log();
log('| from | to | line | verdict | ways near either centre |');
log('|---|---|---|---|---|');
const CONN = [['sennaya', 'nevsky'], ['spasskaya', 'gorny'], ['spasskaya', 'dostoevskaya'], ['sadovaya', 'admiralteyskaya'], ['pushkinskaya', 'vladimirskaya'], ['chernyshevskaya', 'vosstaniya'], ['ligovsky', 'dostoevskaya'], ['pan1', 'mayakovskaya'], ['tekhnolog2', 'sennaya'], ['tekhnolog', 'pushkinskaya'], ['zvenigorodskaya', 'sadovaya'], ['pan2', 'ligovsky']];
for (const [a, b] of CONN) {
  const ia = rowOf(a), pa = byId[a] ? byId[a].c : posOf(a), pb = BUILT[b] ? [BUILT[b].x, BUILT[b].z] : (byId[b] ? byId[b].c : posOf(b));
  if (!ia || !pa || !pb) { log(`| ${a} | ${b} | - | no position |`); continue; }
  const endD = (w, p) => Math.min(Math.hypot(w.pts[0] - p[0], w.pts[1] - p[1]), Math.hypot(w.pts[w.pts.length - 2] - p[0], w.pts[w.pts.length - 1] - p[1]));
  const all = SUBWAY.filter((w) => w.line === ia.line && w.pts && w.pts.length >= 4).map((w) => ({ w, da: nearestOnLine(w.pts, pa[0], pa[1]).d, db: nearestOnLine(w.pts, pb[0], pb[1]).d }));
  const near = all.filter((q) => q.da <= 60 || q.db <= 60).sort((x, y) => x.da + x.db - y.da - y.db), both = near.filter((q) => q.da <= 60 && q.db <= 60);
  let verdict;
  if (both.length) verdict = 'continuous: ' + both.map((q) => q.w.id).join(', ');
  else {
    const ea = near.filter((q) => q.da <= 60).flatMap((q) => [[q.w.pts[0], q.w.pts[1]], [q.w.pts[q.w.pts.length - 2], q.w.pts[q.w.pts.length - 1]]]);
    const eb = near.filter((q) => q.db <= 60).flatMap((q) => [[q.w.pts[0], q.w.pts[1]], [q.w.pts[q.w.pts.length - 2], q.w.pts[q.w.pts.length - 1]]]);
    let g = null; for (const p of ea) for (const s of eb) { const d = Math.hypot(p[0] - s[0], p[1] - s[1]); if (!g || d < g) g = d; }
    verdict = near.length ? `GAP${g != null ? ' about ' + Math.round(g) + ' m between endpoints' : ' (no baked way near ' + (near.some((q) => q.da <= 60) ? b : a) + ')'}; centres ${Math.round(Math.hypot(pa[0] - pb[0], pa[1] - pb[1]))} m apart` : 'no baked way near either centre';
  }
  log(`| ${a} | ${b} | ${ia.line} | ${verdict} | ${near.map((q) => `${q.w.id} (dA ${Math.round(q.da)} / dB ${Math.round(q.db)}, ends ${Math.round(endD(q.w, pa))} / ${Math.round(endD(q.w, pb))})`).join('; ')} |`);
}
log();
log('Cross-check: docs/research/metro-south-sennaya.md and metro-south-vitebsky-tekhnolog.md hold hand-derived rows for the same halls.');

const text = out.join('\n') + '\n';
const target = fileURLToPath(here('../docs/research/metro-frames-south-east.md'));
fs.writeFileSync(target, text);
console.log(text);
console.log('written ' + target);
