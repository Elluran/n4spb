// ground-bench.mjs - the numbers of T3 (docs/TAURIDE-REMAKE.md log): what the floor, the mask and the alleys cost. node --expose-gc tools/area.mjs north tools/tauride/ground-bench.mjs
// Counts the heightAt-type calls (gardenHeight) of each step, times them, measures the JS heap that stays after building the module's T3 parts (gc before and after), and the P50 / P90 / max
// offset of the ribbon centrelines from the data ways (CIRCULAR: a model against the data it was built from; the overlay of tools/tauride-overlay.mjs against an image is T7).
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
const C = await imp('tools/tauride/lib/common.mjs');
const TM = await imp('src/world/landmarksTauride/terrain-mesh.js');
const GM = await imp('src/world/landmarksTauride/ground-material.js');
const PD = await imp('src/world/landmarksTauride/paths-draped.js');
const GH = await imp('src/world/landmarksTauride/height.js');
const Fo = await imp('src/world/landmarksTauride/data/footprints.js');
const Wd = await imp('src/world/landmarksTauride/data/water.js');
const Pd = await imp('src/world/landmarksTauride/data/paths.js');
const Fu = await imp('src/world/landmarksTauride/data/furniture.js');
const FAC = await imp('src/areas/north/data/city.js');
let calls = 0; const gh = (x, z) => { calls++; return GH.gardenHeight(x, z); };
const timed = (f) => { const t = process.hrtime.bigint(); const c0 = calls; const r = f(); return [r, Number(process.hrtime.bigint() - t) / 1e6, calls - c0]; };
const heap = () => { if (global.gc) { global.gc(); global.gc(); } const m = process.memoryUsage(); return { heap: m.heapUsed, buf: m.arrayBuffers }; };
const inputs = (g) => GM.collectGroundInputs({ GARDEN: Fo.GARDEN, GARDEN_GREEN: Fo.GARDEN_GREEN, FOOTPRINTS: Fo.FOOTPRINTS, WATER_UNION: Wd.WATER_UNION, PATHS: Pd.PATHS, BENCHES: Fu.BENCHES, GATES: Fu.GATES, MONUMENTS: Fu.MONUMENTS, FOUNTAINS: Fu.FOUNTAINS }, FAC.GREEN, g);
// warm-up (JIT), not counted
TM.planTerrain(GH.gardenHeight, GH.RELIEF_BOX, TM.floorOptions()); GM.planGroundMask(inputs(GH.gardenHeight));
const h0 = heap();
const [plan, tMs, tCalls] = timed(() => TM.planTerrain(gh, GH.RELIEF_BOX, TM.floorOptions()));
const [mask, mMs, mCalls] = timed(() => GM.planGroundMask(inputs(gh)));
const [mesh, hMs] = timed(() => TM.makeMeshHeight(plan));
const [pp, pMs, pCalls] = timed(() => PD.planPaths(Pd.PATHS, { meshHeight: mesh, gh }));
const [noise, nMs] = timed(() => GM.noiseTileData());
const relief = TM.planTerrain(GH.reliefHeight, GH.RELIEF_BOX);
const h1 = heap();
console.log(`terrain (cover) : ${plan.tris} triangles, ${plan.chunks.length} draws, ${tMs.toFixed(0)} ms, ${tCalls} gardenHeight calls (relief only T2: ${relief.tris} triangles)`);
console.log(`ground mask     : ${mask.box.W} x ${mask.box.H} cells, ${mask.data.length} bytes, ${mMs.toFixed(0)} ms, ${mCalls} gardenHeight calls (slope of the stripe cells)`);
console.log(`noise tile      : ${noise.length} bytes, ${nMs.toFixed(0)} ms`);
console.log(`mesh height     : ${hMs.toFixed(0)} ms`);
console.log(`paths           : ${pp.stats.ribbonTriangles} ribbon (${pp.stats.discTriangles} in ${pp.stats.junctions} discs) + ${pp.stats.stairTriangles} stair triangles, ${pp.stats.rows} rows, ${pp.stats.vertices} vertices, ${pMs.toFixed(0)} ms, ${pCalls} gardenHeight calls (the mesh answers; gardenHeight only off the mesh)`);
console.log(`retained by the plans (after gc; they are the arrays the meshes keep: terrain chunks, mask, noise tile, mesh-height buckets, path arrays): JS heap ${((h1.heap - h0.heap) / 1e6).toFixed(2)} MB + typed-array buffers ${((h1.buf - h0.buf) / 1e6).toFixed(2)} MB`);
// ribbon centreline offset from the data (circular)
const rb = pp.ribbons, off = [];
for (let v = 0; v < rb.pos.length / 3; v++) if (rb.wayOf[v] >= 0 && rb.path[3 * v] === 0) { const src = Pd.PATHS.find((p) => p.id === pp.ways[rb.wayOf[v]].id); off.push(C.polyDist(rb.pos[3 * v], rb.pos[3 * v + 2], src.pts)); }
off.sort((a, b) => a - b); const q = (p) => off[Math.min(off.length - 1, Math.floor(p * off.length))];
console.log(`centreline offset of the ribbons from the data ways (circular): P50 ${q(0.5).toFixed(3)} m, P90 ${q(0.9).toFixed(3)} m, max ${off[off.length - 1].toFixed(3)} m over ${off.length} rows`);
