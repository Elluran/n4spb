import './wildlife-pre.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = 'D:/git2/agi-fun-tests/102_3d_piter';
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500); camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
const calls = [];
const audio = { play: (n, o) => calls.push([n, o]), loop: () => ({ setVolume() {}, stop() {} }) };
const ctx = createContext({ scene, camera, renderer: null, audio, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir });
const list = (process.env.MODS || 'environment,streets,city,landmarksA,landmarksC,landmarksD,landmarksE,landmarksF,landmarksG,landmarksH,landmarksI,landmarksJ,bridges,props,wildlife').split(',');
ctx.buildList = list;
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const START = process.env.START ? process.env.START.split(',').map(Number) : null;
for (const name of list) { if (name === 'wildlife' && START) ctx.player.position.set(START[0], 0, START[1]); const t0 = performance.now(); const mod = await import(pathToFileURL(path.join(root, `src/world/${name}.js`)).href); await mod.build(ctx); console.log('built', name, Math.round(performance.now() - t0), 'ms'); }
export { ctx, L, THREE, calls };
