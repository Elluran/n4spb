// Real WebGL regression: an offline roof capture needs neither runtime colour
// batches nor sun shadows. Compare depth-derived walkable cells before/after
// batching, including transformed roofs, instances, holes and elevated decks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<title>Roof capture regression</title><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>');
    return;
  }
  const file = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname);
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream'); res.end(data);
  });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const executablePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], protocolTimeout: 60000 });
try {
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async () => {
    const T = await import('three');
    const { captureRoofMap } = await import('/src/core/roofmap.js');
    const { batchStatic } = await import('/src/core/batch2.js');
    const scene = new T.Scene(), root = new T.Group(); scene.add(root);
    const renderer = new T.WebGLRenderer(); renderer.setSize(64, 64); renderer.shadowMap.enabled = true;
    const mat = new T.MeshToonMaterial({ color: 0xaaaabb });
    const house = new T.Mesh(new T.BoxGeometry(12, 8, 10), mat);
    house.position.set(0, 4, 0); house.castShadow = true; root.add(house);
    const roof = new T.Mesh(new T.BoxGeometry(8, 0.6, 6), mat);
    roof.position.set(0, 9, 0); roof.rotation.y = 0.32; roof.castShadow = true; root.add(roof);
    const group = new T.Group(); group.position.set(18, 0, 1); group.rotation.y = 0.2; root.add(group);
    const canopy = new T.Mesh(new T.BoxGeometry(8, 6, 9), mat); canopy.position.y = 3; group.add(canopy);
    const inst = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat, 2), matrix = new T.Matrix4();
    inst.setMatrixAt(0, matrix.makeScale(2, 3, 2).setPosition(2, 10, 2));
    inst.setMatrixAt(1, matrix.makeScale(3, 4, 3).setPosition(18, 8, 2)); inst.castShadow = true; root.add(inst);
    const sun = new T.DirectionalLight(); sun.castShadow = true; sun.position.set(4, 30, 10); scene.add(sun);
    const footprints = [{ o: [-7,-6,7,-6,7,6,-7,6], h: [[-5,-4,-5,-2,-3,-2,-3,-4]] }, { o: [11,-7,25,-7,25,8,11,8], h: [] }];
    const physics = { items: [{ type: 'walk', top: 4, cx: 20, cz: 4, hw: 1, hd: 1, c: 1, s: 0 }] };
    scene.updateMatrixWorld(true);
    const before = captureRoofMap(renderer, scene, root, footprints, physics);
    if (!renderer.shadowMap.enabled) throw Error('Shadow state was not restored');
    const batched = batchStatic(root, { nearCell: 192, farCell: 640 });
    const after = captureRoofMap(renderer, scene, root, footprints, physics);
    let mismatches = 0; for (let i = 0; i < before.data.length; i++) if (before.data[i] !== after.data[i]) mismatches++;
    const render = renderer.render; renderer.render = () => { throw Error('capture failure'); };
    try { captureRoofMap(renderer, scene, root, footprints, physics); } catch (e) { if (e.message !== 'capture failure') throw e; }
    renderer.render = render;
    const restored = renderer.shadowMap.enabled && !scene.overrideMaterial && renderer.getRenderTarget() === null && sun.visible;
    renderer.dispose();
    return { cells: before.cells, compared: before.data.length, mismatches, sameGrid: before.w === after.w && before.h === after.h, restored, batched };
  });
  assert.deepEqual(errors, []); assert.equal(result.mismatches, 0); assert.ok(result.cells > 0 && result.sameGrid && result.restored);
  console.log('Roof capture: OK', JSON.stringify(result));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
