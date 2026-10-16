// tools/landmarksMakarova-trimscan.mjs - draw-call histogram of the colour pass at several poses, by material kind (used for landmarksSredny as well).
// usage: node tools/shot.mjs --only ... --cams "<cams>" --out ... --eval "$(node tools/landmarksMakarova-trimscan.mjs '<cams>')" --evalout file.json
// For every camera (same strings as --cams) the page moves the camera, renders, and lists every visible mesh of the colour pass (same frustum / layer tests as three.js) grouped by material kind:
// { calls, info (renderer.info calls of that frame), kinds: [{ key, n, tris, shadow }] }.  Diff two runs (module off / on) with tools/landmarksMakarova-trimdiff.mjs.
const cams = process.argv[2] || '';
const code = `(async () => {
  const ctx = window.__ctx, scene = ctx.scene, cam = ctx.camera;
  const mask = (1 << 0) | (1 << 1) | (1 << 3);
  const out = [];
  for (const cs of ${JSON.stringify(cams)}.split(';')) {
    const v = cs.split(',').map(Number);
    if (v.length === 4) window.__setCam(v[0], null, v[1], v[2], v[3]); else window.__setCam(v[0], v[1], v[2], v[3], v[4], v.length >= 6 && !!v[5]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
    cam.updateMatrixWorld();
    const m4 = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse), e = m4.elements, planes = [];
    const P = (a, b, c, d) => { const l = Math.hypot(a, b, c); planes.push([a / l, b / l, c / l, d / l]); };
    P(e[3] + e[0], e[7] + e[4], e[11] + e[8], e[15] + e[12]); P(e[3] - e[0], e[7] - e[4], e[11] - e[8], e[15] - e[12]);
    P(e[3] + e[1], e[7] + e[5], e[11] + e[9], e[15] + e[13]); P(e[3] - e[1], e[7] - e[5], e[11] - e[9], e[15] - e[13]);
    P(e[3] + e[2], e[7] + e[6], e[11] + e[10], e[15] + e[14]); P(e[3] - e[2], e[7] - e[6], e[11] - e[10], e[15] - e[14]);
    const kinds = new Map(); let calls = 0;
    const walk = (o, vis) => {
      vis = vis && o.visible; if (!vis) return;
      if (o.isMesh) {
        const g = o.geometry;
        if (g && g.attributes.position && (o.layers.mask & mask)) {
          let inside = true;
          if (o.frustumCulled) {
            let bs;
            if (o.isInstancedMesh) { if (!o.boundingSphere) o.computeBoundingSphere(); bs = o.boundingSphere.clone(); } else { if (!g.boundingSphere) g.computeBoundingSphere(); bs = g.boundingSphere.clone(); }
            bs.applyMatrix4(o.matrixWorld);
            for (const p of planes) if (p[0] * bs.center.x + p[1] * bs.center.y + p[2] * bs.center.z + p[3] < -bs.radius) { inside = false; break; }
          }
          if (inside) {
            const m = o.material, mp = m && m.map;
            const key = (m ? m.type : '?') + '|' + ((m && m.name) || '') + '|' + (mp ? (mp.image && mp.image.width === 4096 ? 'atlas' : 'tex' + (mp.image ? mp.image.width + 'x' + mp.image.height : '?')) : '') + (m && m.transparent ? '|tr' : '') + (m && m.alphaTest ? '|at' : '') + (m && m.vertexColors ? '|vc' : '') + '|' + (o.castShadow ? 'S' : '-');
            const n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
            let k = kinds.get(key); if (!k) kinds.set(key, (k = { key, n: 0, tris: 0, shadow: !!o.castShadow })); k.n++; k.tris += Math.round(n); calls++;
          }
        }
      }
      for (const c of o.children) walk(c, vis);
    };
    walk(scene, true);
    out.push({ cam: cs, calls, info: window.__stats.calls, kinds: [...kinds.values()].sort((a, b) => b.n - a.n) });
  }
  return out;
})()`;
console.log(code.replace(/\s*\n\s*/g, ' '));
