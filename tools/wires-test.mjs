// Regression test for the trolleybus OVERHEAD WIRES (src/world/streets/wires.js): no wire may END IN THE AIR.
// Headless (node, no GPU): builds the `streets` module with the same stubs as tools/check.mjs, records every wire polyline that the builder hands to ctx.wires
// (kind: contact | arc | span | hanger | tie) and asserts, on whatever data src/world/data/city.js holds today:
//   1. every END of every polyline (contact wires, junction arcs, spans, hangers, ties) is within 0.5 m (3D) of a facade rosette, the top of a mast, or a point of ANOTHER polyline;
//   2. every connected group of touching polylines contains at least one rosette / mast (nothing hangs in the air as a whole);
//   3. every span has BOTH its ends on a rosette / mast; every rosette has a facade behind it (a building within 1.2 m behind the plate); every mast stands outside buildings;
//   4. sanity: no NaN, no wire above 12 m or below 3 m (except the sag at the spans), nothing absurdly long.
// usage: node tools/wires-test.mjs [--verbose] [--dump file.json] [--tol 0.5]     exit code 1 on failure.  Prints build time and counts.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const VERBOSE = argv.includes('--verbose');
const TOL = argv.includes('--tol') ? Number(argv[argv.indexOf('--tol') + 1]) : 0.5;
const DUMP = argv.includes('--dump') ? argv[argv.indexOf('--dump') + 1] : null;

// ---------------------------------------------------------------- DOM stubs (same as tools/check.mjs)
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  createConicGradient() { return { addColorStop() {} }; }
  createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
  isPointInPath() { return false; }
  getLineDash() { return []; }
}
const ctxProxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
class FakeCanvas {
  constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; }
  getContext(type) { if (type !== '2d') return null; return this._ctx || (this._ctx = ctxProxy(this)); }
  toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {}
}
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }),
  createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }),
  fonts: { load: async () => [] }, body: { appendChild() {} }, addEventListener() {},
};
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

// ---------------------------------------------------------------- build the streets module
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const { createAudio } = await import(pathToFileURL(path.join(root, 'src/core/audio.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
let audio; try { audio = createAudio(); } catch { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
ctx.buildList = ['streets', 'city'];
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };

const parts = [];                                   // { kind, grp, pts:[[x,y,z]..] }
const addOrig = ctx.wires.add.bind(ctx.wires);
ctx.wires.add = (pts, o = {}) => { parts.push({ kind: o.kind || 'unknown', grp: o.grp || null, pts: pts.map((p) => (Array.isArray(p) ? p : [p.x, p.y, p.z])) }); return addOrig(pts, o); };

const t0 = Date.now();
const mod = await import(pathToFileURL(path.join(root, 'src/world/streets.js')).href);
await mod.build(ctx);
const buildMs = Date.now() - t0;
const st = ctx.services.streets, W = st && st.wires;
if (!W) { console.log('FAIL: streets did not publish wires'); process.exit(1); }
const sstats = ctx.services.streetsStats && ctx.services.streetsStats.wires;
const wireMs = ctx.services.streetsStats && ctx.services.streetsStats.wireMs;

// ---------------------------------------------------------------- geometry helpers
const fails = [];
const fail = (msg) => { fails.push(msg); };
const supports = [];                                // rosettes + mast tops: [x, y, z, kind]
for (const a of W.anchors) supports.push([a.x, a.y, a.z, 'rosette']);
for (const m of W.masts) supports.push([m.x, m.h, m.z, 'mast']);
const C = 6, key = (a, b) => a * 8192 + b;
const grid = new Map();                              // segments of every part
const segs = [];
parts.forEach((p, pi) => {
  for (let i = 0; i + 1 < p.pts.length; i++) {
    const a = p.pts[i], b = p.pts[i + 1];
    const si = segs.length; segs.push([pi, a, b]);
    const x0 = Math.floor((Math.min(a[0], b[0]) - TOL) / C), x1 = Math.floor((Math.max(a[0], b[0]) + TOL) / C), z0 = Math.floor((Math.min(a[2], b[2]) - TOL) / C), z1 = Math.floor((Math.max(a[2], b[2]) + TOL) / C);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) { const k = key(cx + 4096, cz + 4096); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(si); }
  }
});
const sgrid = new Map();
for (const s of supports) { const k = key(Math.floor(s[0] / C) + 4096, Math.floor(s[2] / C) + 4096); let l = sgrid.get(k); if (!l) sgrid.set(k, (l = [])); l.push(s); }
const dSeg = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l2 = dx * dx + dy * dy + dz * dz;
  let t = l2 < 1e-12 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy + (p[2] - a[2]) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t), p[2] - (a[2] + dz * t));
};
// the + / - wires of one pair run 0.5 m apart: the sibling does not count as a support for the end of a contact wire
const sibling = (a, b) => parts[a].kind === 'contact' && parts[b].kind === 'contact' && parts[a].grp && parts[a].grp === parts[b].grp;
/** what the point p touches: { support, parts: Set of part indices (excluding `self`) } */
const touch = (p, self) => {
  const out = { support: null, parts: new Set() };
  const cx = Math.floor(p[0] / C), cz = Math.floor(p[2] / C);
  for (let a = cx - 1; a <= cx + 1; a++) for (let b = cz - 1; b <= cz + 1; b++) {
    for (const s of sgrid.get(key(a + 4096, b + 4096)) || []) if (Math.hypot(s[0] - p[0], s[1] - p[1], s[2] - p[2]) <= TOL + 0.15) out.support = s;
  }
  for (const si of grid.get(key(cx + 4096, cz + 4096)) || []) { const [pi, a, b] = segs[si]; if (pi !== self && !(self >= 0 && sibling(self, pi)) && dSeg(p, a, b) <= TOL) out.parts.add(pi); }
  return out;
};

// ---------------------------------------------------------------- 1 + 2: ends and components
const parent = parts.map((_, i) => i);
const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
const union = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
const grounded = new Set();
const bad = [];
const kinds = {};
parts.forEach((p, pi) => {
  kinds[p.kind] = (kinds[p.kind] || 0) + 1;
  for (const e of [0, p.pts.length - 1]) {
    const q = p.pts[e];
    if (!q.every(Number.isFinite)) { fail(`${p.kind}#${pi}: NaN point`); continue; }
    const t = touch(q, pi);
    for (const o of t.parts) union(pi, o);
    if (t.support) grounded.add(pi);
    if (!t.support && !t.parts.size) bad.push({ kind: p.kind, i: pi, end: e ? 'end' : 'start', x: +q[0].toFixed(1), y: +q[1].toFixed(1), z: +q[2].toFixed(1) });
  }
});
for (const b of bad) fail(`${b.kind}#${b.i} ${b.end} ends in the air at (${b.x}, ${b.y}, ${b.z})`);
const groupsOk = new Map();
parts.forEach((p, pi) => { const r = find(pi); if (!groupsOk.has(r)) groupsOk.set(r, { n: 0, ok: false, at: p.pts[0], kind: p.kind }); const g = groupsOk.get(r); g.n++; if (grounded.has(pi)) g.ok = true; });
let floating = 0;
for (const g of groupsOk.values()) if (!g.ok) { floating++; fail(`a group of ${g.n} wire(s) touches no rosette / mast (first: ${g.kind} near (${g.at[0].toFixed(1)}, ${g.at[1].toFixed(1)}, ${g.at[2].toFixed(1)}))`); }

// ---------------------------------------------------------------- 3: spans on supports, supports in valid places
const near3 = (p) => touch(p, -1).support;
for (const sp of W.spans) {
  for (const [nm, p] of [['a', sp.a], ['b', sp.b]]) if (!near3(p)) fail(`span ${sp.id}: end ${nm} (${p.map((v) => v.toFixed(1))}) has no rosette / mast`);
}
for (const a of W.anchors) {
  const bx = a.x - a.nx * 0.6, bz = a.z - a.nz * 0.6;
  if (!L.insideBuilding(bx, bz, 0.5) && !L.insideBuilding(a.x - a.nx * 1.2, a.z - a.nz * 1.2, 0.5)) fail(`rosette (${a.x.toFixed(1)}, ${a.y.toFixed(1)}, ${a.z.toFixed(1)}) has no facade behind it`);
  if (L.insideBuilding(a.x + a.nx * 0.5, a.z + a.nz * 0.5, 0.1)) fail(`rosette (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) hangs inside a building`);
}
for (const m of W.masts) if (L.insideBuilding(m.x, m.z, 0.3)) fail(`mast (${m.x.toFixed(1)}, ${m.z.toFixed(1)}) stands inside a building`);


// ---------------------------------------------------------------- 5: unsupported runs (bridges, squares): no contact wire may run more than MAXRUN metres between hangers / ties / the ends
const MAXRUN = Number(process.env.WIRES_MAXRUN) || 60;
let worstRun = 0;
const cumOf = parts.map((p) => { const c = [0]; for (let i = 1; i < p.pts.length; i++) c.push(c[i - 1] + Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][2] - p.pts[i - 1][2])); return c; });
const supAt = parts.map((p, i) => [0, cumOf[i][cumOf[i].length - 1]]);          // arclengths of the supports of every polyline (its two ends count: they are checked by 1 and 2)
const along = (pi, pt3) => { const p = parts[pi]; let best = null; for (let i = 0; i + 1 < p.pts.length; i++) { const d = dSeg(pt3, p.pts[i], p.pts[i + 1]); if (d < 0.1 && (!best || d < best.d)) best = { d, i }; } return best ? cumOf[pi][best.i] + Math.hypot(pt3[0] - p.pts[best.i][0], pt3[2] - p.pts[best.i][2]) : null; };
parts.forEach((h, hi) => {
  if (h.kind !== 'hanger' && h.kind !== 'tie') return;
  const b = h.pts[0];                                                                          // the lower end of a hanger / tie stands on the contact wire
  for (const pi of touch(b, hi).parts) if (parts[pi].kind === 'contact') { const a = along(pi, b); if (a != null) supAt[pi].push(a); }
});
const inner = supAt.map((a) => a.slice(2));                                                    // hangers / ties only
parts.forEach((p, pi) => {
  if (p.kind !== 'contact') return;
  const at = supAt[pi].sort((x, y) => x - y);
  for (let i = 0; i + 1 < at.length; i++) { const run = at[i + 1] - at[i]; if (run > worstRun) worstRun = run; if (run > MAXRUN) { fail(`contact wire #${pi} runs ${run.toFixed(0)} m without a support near (${p.pts[0][0].toFixed(0)}, ${p.pts[0][2].toFixed(0)})`); break; } }
});

// the wires of two ways joined by an arc are one wire: last support + arc + first support may not exceed CHAIN_MAX (a bridge 40 m from the approach spans on both sides)
const CHAIN_MAX = Number(process.env.WIRES_CHAINMAX) || 80;
const endRunOf = (pi, atEnd) => { const tot = cumOf[pi][cumOf[pi].length - 1], a = inner[pi]; if (!a.length) return tot; return atEnd ? tot - Math.max(...a) : Math.min(...a); };
const arcLenOf = (ai) => cumOf[ai][cumOf[ai].length - 1];
let worstChain = 0;
const contactEnds = [];
parts.forEach((p, pi) => { if (p.kind === 'contact') { contactEnds.push([pi, false, p.pts[0]]); contactEnds.push([pi, true, p.pts[p.pts.length - 1]]); } });
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.1;
parts.forEach((a, ai) => {
  if (a.kind !== 'arc') return;
  const F = a.pts[a.pts.length - 1], S = a.pts[0];
  const ca = contactEnds.filter((e) => near(e[2], S)), cb = contactEnds.filter((e) => near(e[2], F));
  for (const x of ca) for (const y of cb) {
    if (x[0] === y[0]) continue;
    const chain = endRunOf(x[0], x[1]) + arcLenOf(ai) + endRunOf(y[0], y[1]);
    if (chain > worstChain) worstChain = chain;
    if (chain > CHAIN_MAX) fail(`wires #${x[0]} and #${y[0]} joined by an arc run ${chain.toFixed(0)} m without a support near (${S[0].toFixed(0)}, ${S[2].toFixed(0)})`);
  }
});

// ---------------------------------------------------------------- 4: sanity
for (const p of parts) for (let i = 0; i + 1 < p.pts.length; i++) {
  const a = p.pts[i], b = p.pts[i + 1];
  if (Math.hypot(a[0] - b[0], a[2] - b[2]) > 60) { fail(`${p.kind}: a ${Math.hypot(a[0] - b[0], a[2] - b[2]).toFixed(0)} m straight piece near (${a[0].toFixed(0)}, ${a[2].toFixed(0)})`); break; }
  if (p.kind !== 'span' && (a[1] > 12 || a[1] < 3)) { fail(`${p.kind}: wire height ${a[1].toFixed(1)} m near (${a[0].toFixed(0)}, ${a[2].toFixed(0)})`); break; }
}


// ---------------------------------------------------------------- optional plan image: --plan x0,z0,x1,z1,pxPerM,out.png (buildings grey, roads dark, wires coloured, free ends red, supports white)
if (argv.includes('--plan')) {
  const [x0, z0, x1, z1, sc, out] = argv[argv.indexOf('--plan') + 1].split(',');
  const X0 = +x0, Z0 = +z0, S = +sc, Wd = Math.ceil((+x1 - X0) * S), Hd = Math.ceil((+z1 - Z0) * S);
  const img = new Uint8Array(Wd * Hd * 3).fill(238);
  const px = (x, z, c) => { const i = Math.round((x - X0) * S), j = Math.round((z - Z0) * S); if (i < 0 || j < 0 || i >= Wd || j >= Hd) return; const o = (j * Wd + i) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
  const line = (ax, az, bx, bz, c) => { const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * S * 1.5)); for (let k = 0; k <= n; k++) px(ax + (bx - ax) * k / n, az + (bz - az) * k / n, c); };
  const disc = (x, z, r, c) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) px(x + a / S, z + b / S, c); };
  for (const r of st.roads) for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; for (let o = -r.w / 2; o <= r.w / 2; o += 1 / S) { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; line(a[0] - dz / l * o, a[1] + dx / l * o, b[0] - dz / l * o, b[1] + dx / l * o, [190, 190, 196]); } }
  for (const p of L.groundFootprints()) for (const ring of [p.o, ...p.h]) for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) line(ring[j], ring[j + 1], ring[i], ring[i + 1], [120, 110, 100]);
  const col = { contact: [30, 90, 220], arc: [20, 160, 60], span: [200, 120, 0], hanger: [150, 150, 150], tie: [160, 0, 200] };
  for (const p of parts) for (let i = 0; i + 1 < p.pts.length; i++) line(p.pts[i][0], p.pts[i][2], p.pts[i + 1][0], p.pts[i + 1][2], col[p.kind] || [0, 0, 0]);
  for (const s of supports) disc(s[0], s[2], 3, s[3] === 'mast' ? [0, 0, 0] : [255, 255, 255]);
  for (const n of st.net.nodes) disc(n.x, n.z, n.arms.length >= 3 ? 3 : 2, n.arms.length >= 3 ? [0, 200, 200] : [230, 200, 0]);
  for (const b of bad) disc(b.x, b.z, 4, [255, 0, 0]);
  const zlib = await import('node:zlib');
  const raw = Buffer.alloc((Wd * 3 + 1) * Hd); for (let j = 0; j < Hd; j++) { raw[j * (Wd * 3 + 1)] = 0; Buffer.from(img.buffer, j * Wd * 3, Wd * 3).copy(raw, j * (Wd * 3 + 1) + 1); }
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(Wd, 0); ihdr.writeUInt32BE(Hd, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  console.log('plan image written', out, Wd + 'x' + Hd);
}

// ---------------------------------------------------------------- report
const ms = (n) => (n == null ? '-' : n + ' ms');
console.log(`wires-test: streets built in ${buildMs} ms (wire builder ${ms(wireMs)}); parts ${parts.length} ${JSON.stringify(kinds)}; pairs ${W.pairs.length}, arcs ${W.arcs.length}, spans ${W.spans.length}, anchors ${W.anchors.length}, masts ${W.masts.length}, ${W.wireKm.toFixed(2)} km`);
if (sstats) console.log('builder stats', JSON.stringify(sstats));
console.log(`longest unsupported run ${worstRun.toFixed(0)} m (limit ${MAXRUN}), over a joint ${worstChain.toFixed(0)} m (limit ${CHAIN_MAX})`);
console.log(`free ends: ${bad.length}, floating groups: ${floating}, other problems: ${fails.length - bad.length - floating}`);
{ let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of parts) for (const q of p.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[2]); z1 = Math.max(z1, q[2]); } console.log(`extent of the wires: x ${x0.toFixed(0)}..${x1.toFixed(0)}, z ${z0.toFixed(0)}..${z1.toFixed(0)}`); }
if (argv.includes('--ties')) for (const p of parts) if (p.kind === 'tie') console.log(`tie from (${p.pts[0].map((v) => v.toFixed(1))}) to (${p.pts[1].map((v) => v.toFixed(1))}) len ${Math.hypot(p.pts[0][0] - p.pts[1][0], p.pts[0][2] - p.pts[1][2]).toFixed(1)}`);
if (argv.includes('--near')) { const [nx_, nz_, r_] = argv[argv.indexOf('--near') + 1].split(',').map(Number); for (const sp of W.spans) if (Math.hypot(sp.mid[0] - nx_, sp.mid[2] - nz_) < r_) console.log(`span ${sp.id} len ${sp.len.toFixed(0)} poles ${sp.poles.map(Number)} a (${sp.a[0].toFixed(0)}, ${sp.a[2].toFixed(0)}) b (${sp.b[0].toFixed(0)}, ${sp.b[2].toFixed(0)})`); }
if (argv.includes('--spans')) for (const sp of W.spans) console.log(`span ${sp.id} len ${sp.len.toFixed(0)} poles ${sp.poles.map(Number)} mid (${sp.mid[0].toFixed(0)}, ${sp.mid[2].toFixed(0)}) y ${sp.mid[1].toFixed(2)}`);
if (DUMP) fs.writeFileSync(DUMP, JSON.stringify({ bad, fails }, null, 1));
if (fails.length) {
  const shown = VERBOSE ? fails : fails.slice(0, 25);
  for (const f of shown) console.log('  - ' + f);
  if (fails.length > shown.length) console.log(`  ... ${fails.length - shown.length} more (use --verbose)`);
  console.log('RESULT: FAIL');
  process.exit(1);
}
console.log('RESULT: OK');
process.exit(0);
