// tools/streets-wedge-probe.mjs - fast (data only, ~15 s, no scene) model of tools/roads-surface-audit.mjs for the STREETS asphalt: which audit samples (carriageway cross-sections, the strip between paired
// one-way carriageways, junction fillets) lie on no asphalt that streets/surface.js buildAsphalt draws (way ribbons from the mitred edges, fillets)?
// The audit itself needs the whole scene (12 min); this probe answers the streets part in seconds, for the generator work on wedges / dead-end caps.
//   usage: node tools/streets-wedge-probe.mjs x,z,r [x,z,r ...] [--step 3.5] [--list]      (no centre: the whole play area is probed)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
globalThis.window = globalThis; globalThis.self = globalThis;
const argv = process.argv.slice(2);
const flag = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const STEP = Number(flag('step', 3.5)), LIST = !!flag('list', false);
const circles = argv.filter((a) => /^-?\d/.test(a) && a.includes(',')).map((a) => a.split(',').map(Number));
const L = await imp('src/world/layout.js');
const { buildNet } = await imp('src/world/streets/net.js');
const { buildAsphalt } = await imp('src/world/streets/surface.js');
const net = buildNet(L);
const MEDIAN_MAX = 7.5;

// ---- the drawn asphalt: streets/surface.js buildAsphalt run against a collecting builder (the very triangles, 32-bit like the GPU buffers), in a 8 m cell hash, tested with the barycentric tolerance of the audit
const CELL = 8, KX = 4096, grid = new Map(), f32 = Math.fround;
const T = [];                                                              // triangles: [ax, az, bx, bz, cx, cz]
const mk = () => { const V = []; return { vert: (x, y, z) => V.push([f32(x), f32(z)]) - 1, tri: (a, b, c) => T.push([...V[a], ...V[b], ...V[c]]), quad: (a, b, c, d) => { T.push([...V[a], ...V[b], ...V[c]]); T.push([...V[a], ...V[c], ...V[d]]); } }; };
buildAsphalt(net, mk(), mk());
for (const t of T) {
  const x0 = Math.min(t[0], t[2], t[4]), x1 = Math.max(t[0], t[2], t[4]), z0 = Math.min(t[1], t[3], t[5]), z1 = Math.max(t[1], t[3], t[5]), e = { t, b: [x0, x1, z0, z1] };
  for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) { const k = (cx + 2048) * KX + cz + 2048; let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(e); }
}
const inTri = (t, x, z) => { const [ax, az, bx, bz, cx, cz] = t, d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) return false; const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, l3 = 1 - l1 - l2; return !(l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4); };
const drawnTol = (x, z) => { const l = grid.get((Math.floor(x / CELL) + 2048) * KX + Math.floor(z / CELL) + 2048); if (!l) return false; for (const e of l) if (x >= e.b[0] - 1e-3 && x <= e.b[1] + 1e-3 && z >= e.b[2] - 1e-3 && z <= e.b[3] + 1e-3 && inTri(e.t, x, z)) return true; return false; };

// ---- samples (the audit's: tools/roads-surface-audit.mjs section 4)
const near = (x, z) => (!circles.length || circles.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) <= r)) && L.inPlay(x, z);
const bad = []; let n = 0;
const sample = (x, z, info) => { if (!near(x, z) || L.insideBuilding(x, z, 0)) return; n++; if (!drawnTol(x, z)) bad.push({ x, z, ...info }); };
const LAT = [0.1, 0.3, 0.5, 0.7, 0.9];
for (const w of net.ways) {
  if (w.skipDraw || w.bridge) continue;
  const m = Math.max(2, Math.ceil(w.L / STEP) + 1);
  for (let k = 0; k < m; k++) {
    const s = w.L * k / (m - 1); let i = 0; while (i < w.n - 2 && w.s[i + 1] < s) i++;
    const f = (s - w.s[i]) / Math.max(1e-9, w.s[i + 1] - w.s[i]);
    const px = w.x[i] + (w.x[i + 1] - w.x[i]) * f, pz = w.z[i] + (w.z[i + 1] - w.z[i]) * f;
    let tx = w.tx[i] + (w.tx[i + 1] - w.tx[i]) * f, tz = w.tz[i] + (w.tz[i + 1] - w.tz[i]) * f; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const hL = w.hL[i] + (w.hL[i + 1] - w.hL[i]) * f, hR = w.hR[i] + (w.hR[i + 1] - w.hR[i]) * f, rx = -tz, rz = tx;
    for (const u of LAT) { const lat = -hL + (hL + hR) * u; sample(px + rx * lat, pz + rz * lat, { kind: 'carriageway', id: w.id, s: +s.toFixed(1), L: +w.L.toFixed(1) }); }
    if (w.oneway && w.rank >= 2 && !w.bridge) {
      const lx = -rx, lz = -rz, ex = px + lx * hL, ez = pz + lz * hL; let best = null;
      net.each(ex, ez, 20, (v, vi) => {
        if (v === w || !v.oneway || v.rank < 2 || v.bridge || v.skipDraw) return;
        const dx = v.x[vi + 1] - v.x[vi], dz = v.z[vi + 1] - v.z[vi], l = Math.hypot(dx, dz) || 1;
        if ((dx * tx + dz * tz) / l > -0.8) return;
        const t = Math.max(0, Math.min(1, ((ex - v.x[vi]) * dx + (ez - v.z[vi]) * dz) / (l * l))), cx = v.x[vi] + dx * t, cz = v.z[vi] + dz * t;
        if ((cx - ex) * lx + (cz - ez) * lz <= 0) return;
        const hh = (-dz / l * (ex - cx) + dx / l * (ez - cz)) > 0 ? v.hR[vi] : v.hL[vi], dist = Math.hypot(cx - ex, cz - ez), gap = dist - hh;
        if (gap > -1 && gap < 16 && (!best || gap < best.gap)) best = { gap, v, dx: dist > 1e-6 ? (cx - ex) / dist : lx, dz: dist > 1e-6 ? (cz - ez) / dist : lz };
      });
      if (best && best.gap > 0.4 && w.i < best.v.i && best.gap < MEDIAN_MAX) for (const u of [0.15, 0.35, 0.5, 0.65, 0.85]) { const d = best.gap * u; sample(ex + best.dx * d, ez + best.dz * d, { kind: 'median', id: w.id, with: best.v.id, gap: +best.gap.toFixed(1), s: +s.toFixed(1), e: [ex, ez], dir: [best.dx, best.dz], d }); }
    }
  }
}
for (const f of net.fillets) {
  if (f.ways[0].skipDraw || f.ways[1].skipDraw) continue;
  const a = f.arc;
  for (const k of new Set([0, Math.floor((a.length - 2) / 2), a.length - 2])) if (k >= 0 && k + 1 < a.length) sample((f.P[0] + a[k][0] + a[k + 1][0]) / 3, (f.P[1] + a[k][1] + a[k + 1][1]) / 3, { kind: 'fillet', id: f.ways[0].id });
}
console.log(`${n} samples, ${bad.length} on no drawn street asphalt (fillets ${net.fillets.length})`);
// clusters: group by kind + way id + 12 m
const cl = [];
for (const b of bad) { let c = cl.find((q) => q.kind === b.kind && q.id === b.id && Math.hypot(q.x - b.x, q.z - b.z) < 12); if (!c) cl.push(c = { kind: b.kind, id: b.id, x: b.x, z: b.z, n: 0, extra: b.with || '', gap: b.gap, s: b.s, L: b.L }); c.n++; }
for (const c of cl) console.log(`  ${String(c.n).padStart(3)} ${c.kind.padEnd(11)} way ${c.id}${c.extra ? ' with ' + c.extra : ''} at ${c.x.toFixed(1)},${c.z.toFixed(1)}${c.gap != null ? ' gap ' + c.gap : ''}${c.s != null ? ' s ' + c.s + '/' + c.L : ''}`);
if (LIST) for (const b of bad) console.log(`    ${b.x.toFixed(2)},${b.z.toFixed(2)} ${b.kind} ${b.id}${b.e ? ` e(${b.e[0].toFixed(2)},${b.e[1].toFixed(2)}) dir(${b.dir[0].toFixed(3)},${b.dir[1].toFixed(3)}) d ${b.d.toFixed(2)} with ${b.with}` : ''}`);
console.log(`clusters ${cl.length}`);
process.exit(0);
