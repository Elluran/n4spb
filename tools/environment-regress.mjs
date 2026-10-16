// tools/environment-regress.mjs - a signature of what the environment module builds inside a few boxes of the strip (Moscow station - Nevsky - Admiralty - Palace Square - Hermitage): meshes (vertex count + coordinate sums per
// mesh name), instanced meshes (instances + position sums), physics items, trees, quay segments / descents. Two signatures are compared to prove that a change left the banks exactly as they were.
// usage: node tools/environment-regress.mjs --out a.json            (builds the environment of THIS checkout)
//        node tools/environment-regress.mjs --diff base.json a.json  (prints every difference; exit 1 when there is one)
// The tool resolves the project root from its own location: copy it into a snapshot of an older commit (git archive <commit> src tools package.json | tar -x -C dir; link node_modules) to make the base signature.
import fs from 'node:fs';
const args = process.argv.slice(2), arg = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
export const BOXES = {                       // name: [x0, x1, z0, z1]
  palaceEmb: [-2000, -1800, -1250, -1050], winterCanal: [-1950, -1750, -1150, -850], palaceBridgeS: [-2420, -2250, -950, -800], anichkov: [-520, -360, -180, 0], swanCanal: [-1100, -850, -1120, -1000],
  nevaWall: [-2900, -1900, -1300, -1000], fontankaNorth: [-900, -600, -1120, -700], griboedov: [-2100, -1700, -400, 300], nevsky: [-1500, -1000, -600, 0], vosstaniya: [-100, 300, -300, 100], railYard: [500, 900, 400, 1100],
  stripAll: [-3100, 1000, -1500, 1300],
};
if (args.includes('--diff')) {
  const i = args.indexOf('--diff'), A = JSON.parse(fs.readFileSync(args[i + 1], 'utf8')), B = JSON.parse(fs.readFileSync(args[i + 2], 'utf8'));
  let bad = 0;
  for (const box of Object.keys(A.boxes)) {
    const a = A.boxes[box], b = (B.boxes || {})[box] || {}; let n = 0;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const va = JSON.stringify(a[k]), vb = JSON.stringify(b[k]);
      if (va !== vb) { n++; if (n <= (args.includes('--verbose') ? 1e9 : 6)) console.log('  DIFF', box, k, va, '->', vb); }
    }
    console.log(box.padEnd(18), Object.keys(a).length, 'entries', n ? n + ' DIFFERENT' : 'identical'); bad += n;
  }
  console.log(bad ? 'RESULT: ' + bad + ' differences' : 'RESULT: OK (identical in every box)');
  process.exit(bad ? 1 : 0);
}
const { env, ctx, ms } = await import('./environment-harness.mjs');
const inB = (b, x, z) => x >= b[0] && x <= b[1] && z >= b[2] && z <= b[3];
const r2 = (v) => Math.round(v * 100) / 100;
const out = { ms, boxes: {} };
if (arg('--list')) {                          // --list <instanced mesh name>,<box>: the instance positions of one instanced mesh inside one box (diagnostics)
  const [mesh, box] = arg('--list').split(','), b = BOXES[box], rows = [];
  ctx.scene.traverse((o) => { if (!o.isInstancedMesh || o.name !== mesh) return; const A = o.instanceMatrix.array; for (let i = 0; i < o.count; i++) { const x = A[i * 16 + 12], y = A[i * 16 + 13], z = A[i * 16 + 14]; if (inB(b, x, z)) rows.push([r2(x), r2(y), r2(z)]); } });
  rows.sort((p, q) => p[0] - q[0]); console.log(rows.map((r) => r.join(',')).join('  ')); process.exit(0);
}
for (const [name, b] of Object.entries(BOXES)) {
  const sig = {};
  ctx.scene.updateMatrixWorld(true);
  ctx.scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const key = o.name || 'mesh';
    if (o.isInstancedMesh) {
      const A = o.instanceMatrix.array; let n = 0, sx = 0, sy = 0, sz = 0;
      for (let i = 0; i < o.count; i++) { const x = A[i * 16 + 12], y = A[i * 16 + 13], z = A[i * 16 + 14]; if (!inB(b, x, z)) continue; n++; sx += x; sy += y; sz += z; }
      // (review-water-2 2026-10-09) the y of a BOAT is the waterline plus a bob that is a function of the clock t of the last update (boats.js: sin(t * 0.9 + idx * 1.7) * 0.025): two builds of identical code differ by up to
      // 0.05 m (found: winterCanal / makarovaEast "differences" between two runs of the same tree). The y sum of the env-boat meshes is left out of the signature.
      if (n) { const s = sig['inst:' + key] || [0, 0, 0, 0]; sig['inst:' + key] = [s[0] + n, r2(s[1] + sx), key.startsWith('env-boat') ? 0 : r2(s[2] + sy), r2(s[3] + sz)]; }
      return;
    }
    const P = o.geometry.attributes.position, e = o.matrixWorld.elements, ident = e[0] === 1 && e[5] === 1 && e[10] === 1 && e[12] === 0 && e[13] === 0 && e[14] === 0;
    let n = 0, sx = 0, sy = 0, sz = 0;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (!ident) { const X = e[0] * x + e[4] * y + e[8] * z + e[12], Y = e[1] * x + e[5] * y + e[9] * z + e[13], Z = e[2] * x + e[6] * y + e[10] * z + e[14]; x = X; y = Y; z = Z; }
      if (!inB(b, x, z)) continue; n++; sx += x; sy += y; sz += z;
    }
    if (n) { const s = sig['mesh:' + key] || [0, 0, 0, 0]; sig['mesh:' + key] = [s[0] + n, r2(s[1] + sx), r2(s[2] + sy), r2(s[3] + sz)]; }
  });
  const ph = {}; for (const it of ctx.physics.items) { if (!inB(b, it.cx, it.cz)) continue; const s = ph[it.type] || [0, 0, 0]; ph[it.type] = [s[0] + 1, r2(s[1] + it.cx), r2(s[2] + it.cz)]; }
  for (const [k, v] of Object.entries(ph)) sig['physics:' + k] = v;
  const tr = env.trees.filter((t) => inB(b, t.x, t.z)); sig.trees = [tr.length, r2(tr.reduce((a, t) => a + t.x, 0)), r2(tr.reduce((a, t) => a + t.z, 0)), r2(tr.reduce((a, t) => a + t.h, 0))];
  const sg = env.quay.segments.filter((s) => inB(b, s.ax, s.az)); sig.segments = [sg.length, r2(sg.reduce((a, s) => a + s.ax + s.bx, 0)), r2(sg.reduce((a, s) => a + s.az + s.bz, 0))];
  const st = env.quay.allStairs.filter((s) => inB(b, s.x, s.z)); sig.stairs = st.map((s) => [r2(s.x), r2(s.z), s.key, r2(s.length), !!s.pier]);
  const pr = (env.piers || []).filter((p) => inB(b, p.x, p.z)); sig.piers = pr.map((p) => [r2(p.x), r2(p.z), r2(p.w), r2(p.d)]);
  out.boxes[name] = sig;
}
fs.writeFileSync(arg('--out') || 'environment-regress.json', JSON.stringify(out));
if (globalThis.gc) globalThis.gc();
const ru = process.resourceUsage(), mu = process.memoryUsage();
console.log('memory: maxRSS', Math.round(ru.maxRSS / 1024), 'MB, heapUsed', Math.round(mu.heapUsed / 1048576), 'MB, rss', Math.round(mu.rss / 1048576), 'MB');
console.log('written', arg('--out') || 'environment-regress.json', 'build ms', ms, Object.entries(out.boxes).map(([k, v]) => k + ':' + Object.keys(v).length).join(' '));
process.exit(0);
