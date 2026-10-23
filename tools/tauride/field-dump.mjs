// tools/tauride/field-dump.mjs - the raster of the environment FIELD (the water mask and everything the ground classes derive from it), CPU only.
//   node tools/tauride/field-dump.mjs --root <tree> --out <file.bin> [--step 4]            (strip: plain node; North: node tools/area.mjs north tools/tauride/field-dump.mjs --root <tree> ...)
//   node tools/tauride/field-dump.mjs --diff a.bin b.bin                                    where do two dumps differ (per quantity, bounding box, count)
// T4a proof that the strip's field is untouched: dump the strip field of the clean tree and of the branch (sha1 equal) and the North field before / after (only `shore` and `free` differ, inside the garden box).
// The dump: for every point of a step-metre lattice over the field box: shore, bldDist, roadDist, pathDist, ptDist, hardDist, hardOnlyDist (float32), the four class weights (float32), free() (0 / 1).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (argv.includes('--diff')) {
  const [a, b] = argv.slice(argv.indexOf('--diff') + 1, argv.indexOf('--diff') + 3).map((f) => fs.readFileSync(f));
  const ha = JSON.parse(fs.readFileSync(argv[argv.indexOf('--diff') + 1] + '.json', 'utf8')), hb = JSON.parse(fs.readFileSync(argv[argv.indexOf('--diff') + 2] + '.json', 'utf8'));
  if (ha.nx !== hb.nx || ha.nz !== hb.nz) { console.log('lattices differ', ha.nx, ha.nz, hb.nx, hb.nz); process.exit(2); }
  const fa = new Float32Array(a.buffer, a.byteOffset, a.byteLength / 4), fb = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4), Q = ha.quantities.length, n = ha.nx * ha.nz;
  const diff = Object.fromEntries(ha.quantities.map((q) => [q, { n: 0, x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity }]));
  for (let k = 0; k < n; k++) for (let q = 0; q < Q; q++) if (fa[k * Q + q] !== fb[k * Q + q]) {
    const r = diff[ha.quantities[q]], i = k % ha.nx, j = (k - i) / ha.nx, x = ha.x0 + i * ha.step, z = ha.z0 + j * ha.step;
    r.n++; r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.z0 = Math.min(r.z0, z); r.z1 = Math.max(r.z1, z);
  }
  let total = 0; for (const [q, r] of Object.entries(diff)) { total += r.n; console.log(q.padEnd(10), String(r.n).padStart(8), r.n ? `x ${r.x0}..${r.x1}  z ${r.z0}..${r.z1}` : ''); }
  console.log('hashes', ha.sha1, hb.sha1, total === 0 ? 'IDENTICAL' : 'DIFFERENT');
  process.exit(0);
}
const root = path.resolve(arg('root', '.')), out = arg('out', 'field.bin'), step = Number(arg('step', 4));
const SE = await import(pathToFileURL(path.join(root, 'tools/tauride/lib/stub-env.mjs')).href);
const eng = await SE.loadEngine(root);
const { ctx } = SE.makeContext(eng, ['environment']);
const t0 = Date.now();
await SE.buildModules(eng, ctx, ['environment']);
const f = ctx.services.environment.field;
const B = f.box, x0 = Math.ceil(B.x0), z0 = Math.ceil(B.z0), nx = Math.floor((B.x1 - x0) / step), nz = Math.floor((B.z1 - z0) / step);
const quantities = ['shore', 'bldDist', 'roadDist', 'pathDist', 'ptDist', 'hardDist', 'hardOnlyDist', 'cls0', 'cls1', 'cls2', 'cls3', 'free'], Q = quantities.length;
const data = new Float32Array(nx * nz * Q), tmp = [0, 0, 0, 0];
for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
  const x = x0 + i * step + 0.5, z = z0 + j * step + 0.5, o = (j * nx + i) * Q;
  data[o] = f.shore(x, z); data[o + 1] = f.bldDist(x, z); data[o + 2] = f.roadDist(x, z); data[o + 3] = f.pathDist(x, z); data[o + 4] = f.ptDist(x, z); data[o + 5] = f.hardDist(x, z); data[o + 6] = f.hardOnlyDist(x, z);
  const w = f.clsAt(x, z, tmp); data[o + 7] = w[0]; data[o + 8] = w[1]; data[o + 9] = w[2]; data[o + 10] = w[3]; data[o + 11] = f.free(x, z) ? 1 : 0;
}
const buf = Buffer.from(data.buffer);
fs.writeFileSync(out, buf);
const sha1 = crypto.createHash('sha1').update(buf).digest('hex');
fs.writeFileSync(out + '.json', JSON.stringify({ root, step, x0: x0 + 0.5, z0: z0 + 0.5, nx, nz, quantities, sha1, box: B, ms: Date.now() - t0 }));
console.log('field dump', root, 'box', JSON.stringify(B), 'lattice', nx, 'x', nz, 'step', step, 'sha1', sha1, 'ms', Date.now() - t0);
