// terrain-material-test.mjs - the relief is painted with the GROUND'S OWN shader (T2 fix round 2): node tools/area.mjs north tools/tauride/terrain-material-test.mjs
// QA (round 2): every hill was a smooth, flat-coloured, untextured polygon over the textured lawn with a seam along its contour, and it hid the grey way paint of the ground. The ground's colour is a function
// of the world (x, z) alone (environment/ground.js: class mask, noise tile, patches; vPWorld.xz), so a mesh drawn with the SAME program shows the same lawn at the same place. What this CPU test proves about the
// GPU result: the terrain meshes use a material that carries the ground's onBeforeCompile and customProgramCacheKey (the same compiled program and the same uniform OBJECTS), whose program-relevant
// parameters equal the ground's, without the ground's polygonOffset (the relief must win over the ground by depth), without the vertex-colour attribute; that the shader text it produces is the ground's;
// and that a context without a ground still gets the placeholder. The same checks run against copies of terrain-mesh.js with one line cut (the proof can fail). The picture itself needs a GPU look.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const imp = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);
let failed = 0, total = 0;
const ok = (name, cond, detail = '') => { total++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`); };

const SE = await imp('tools/tauride/lib/stub-env.mjs');
const eng = await SE.loadEngine(ROOT);
const TM = await imp('src/world/landmarksTauride/terrain-mesh.js');
const SRC = fs.readFileSync(path.join(ROOT, 'src/world/landmarksTauride/terrain-mesh.js'), 'utf8');

/** a copy of terrain-mesh.js with one edit, loaded from memory (the imports made absolute: the data: URL has no base) */
async function variant(re, to) {
  if (!re.test(SRC)) throw new Error(`variant: the text ${re} was not found in terrain-mesh.js (update the test with the file)`);
  let text = SRC.replace(re, to);
  text = text.replace(/from '(\.{1,2}\/[^']+)'/g, (m, rel) => `from '${pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride', rel)).href}'`).replace("from 'three'", `from '${pathToFileURL(path.join(ROOT, 'node_modules/three/build/three.module.js')).href}'`);
  return import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
}
const FAKE = () => ({ uniforms: {}, vertexShader: '#include <common>\n#include <fog_vertex>', fragmentShader: '#include <common>\n#include <map_fragment>\n#include <fog_fragment>' });
const compiled = (mat) => { const s = FAKE(); mat.onBeforeCompile(s, null); return s; };
const PARAMS = ['vertexColors', 'flatShading', 'side', 'transparent', 'alphaTest', 'fog', 'toneMapped', 'dithering', 'wireframe', 'type'];

/** every check on one built (environment + landmarksTauride) context, for the module `mod` (the shipped file or a cut copy) */
async function checks(label, mod, expectPass) {
  const { ctx } = SE.makeContext(eng, ['environment', 'landmarksTauride']);
  await SE.buildModules(eng, ctx, ['environment']);
  const gm = mod.groundMaterial(ctx);
  const rows = [];
  const R = (name, cond, detail) => rows.push([name, !!cond, detail]);
  R('the environment publishes a ground material that groundMaterial() finds (group env > env-ground)', gm && gm.name === 'env-ground' && typeof gm.onBeforeCompile === 'function' && gm.polygonOffset === true, gm ? gm.name : 'none');
  if (!gm) return rows;
  const root = new eng.THREE.Group(), plan = TM.planTerrain(), built = mod.buildTerrain(ctx, root, plan);
  const meshes = built.group.children, mats = new Set(meshes.map((m) => m.material));
  R('the relief uses ONE material for all its meshes and is built with the shared flag', meshes.length === plan.chunks.length && mats.size === 1 && built.shared === true, `${meshes.length} meshes, ${mats.size} materials, shared ${built.shared}`);
  const tm = [...mats][0];
  R('... its onBeforeCompile and customProgramCacheKey are the ground\'s (one compiled program, one set of uniform objects)', tm !== gm && tm.onBeforeCompile === gm.onBeforeCompile && tm.customProgramCacheKey === gm.customProgramCacheKey && tm.customProgramCacheKey() === gm.customProgramCacheKey(), tm.customProgramCacheKey());
  R('... the parameters that enter a program key equal the ground\'s (vertexColors, flatShading, side, transparent, alphaTest, fog, map ...)', PARAMS.every((k) => tm[k] === gm[k]) && tm.map === gm.map && tm.alphaMap === gm.alphaMap && tm.gradientMap === gm.gradientMap, PARAMS.filter((k) => tm[k] !== gm[k]).join(',') || 'equal');
  R('... NO polygonOffset (the ground is pushed back 2 depth units; the relief, 2 cm and more above it, must keep winning over it at any distance)', tm.polygonOffset === false && gm.polygonOffset === true, `relief ${tm.polygonOffset}, ground ${gm.polygonOffset}`);
  R('... the geometry has no vertex-colour attribute (the placeholder colours are not drawn)', meshes.every((m) => !m.geometry.getAttribute('color')), '');
  const a = compiled(gm), b = compiled(tm);
  R('... the shader text it compiles is the ground\'s (vertex and fragment, with the world-space paint body)', a.fragmentShader === b.fragmentShader && a.vertexShader === b.vertexShader && /vPWorld/.test(b.fragmentShader) && /uCls/.test(b.fragmentShader) && b.fragmentShader.length > a.fragmentShader.length * 0.99 && b.fragmentShader.length > 3000, `${b.fragmentShader.length} characters`);
  // uPaint / uGrime are made per material by the toon patch (core/materials.js patchPaint: { value: amount }); every other uniform is the ground's shared object
  const own = new Set(['uPaint', 'uGrime']), keys = Object.keys(a.uniforms), same = keys.filter((k) => a.uniforms[k] === b.uniforms[k]);
  R('... the uniforms are the SAME objects as the ground\'s (one class mask, one noise tile, one set of lawn colours; only uPaint / uGrime are per material, with equal values)', keys.length === Object.keys(b.uniforms).length && keys.every((k) => (own.has(k) ? a.uniforms[k].value === b.uniforms[k].value : a.uniforms[k] === b.uniforms[k])) && same.includes('uCls') && same.includes('uNoise') && same.includes('uGrassA') && same.length > 20, `${same.length} of ${keys.length} shared`);
  R('... the meshes keep the contract of T2 (noBatch, receive shadow, cast none, one draw per chunk, no collider)', meshes.every((m) => m.userData.noBatch === true && m.receiveShadow === true && m.castShadow === false) && built.draws === plan.chunks.length, '');
  R('... the meshes are drawn before the ground (renderOrder -1: after the sky\'s -10, before everything else; the ground fragments under a hill fail the early depth test instead of running the dear shader twice)', meshes.every((m) => m.renderOrder === -1) && !gm.renderOrder, '');
  // a context without a ground: the placeholder
  const bare = SE.makeContext(eng, []).ctx, pb = mod.buildTerrain(bare, new eng.THREE.Group(), plan), pm = pb.group.children[0].material;
  R('no environment: the vertex-coloured placeholder (a headless test of the builder alone)', pb.shared === false && pm.vertexColors === true && !!pb.group.children[0].geometry.getAttribute('color') && mod.groundMaterial(bare) === null, '');
  console.log(`${label}: ${rows.filter((r) => r[1]).length} of ${rows.length} hold`);
  return rows;
}

const real = await checks('shipped terrain-mesh.js', TM, true);
for (const [name, cond, detail] of real) ok(name, cond, detail);
// the proof can fail: three copies of the file with one line cut, each must turn the matching checks red
const cuts = [
  ['the copy of the ground\'s shader is gone (onBeforeCompile / customProgramCacheKey not taken)', /mat\.onBeforeCompile = gm\.onBeforeCompile; mat\.customProgramCacheKey = gm\.customProgramCacheKey;/, '', /ONE compiled|shader text|uniforms are the SAME|onBeforeCompile and customProgramCacheKey/],
  ['the relief carries the ground\'s polygonOffset (it would tie with the ground at long range)', /\{ paint: 0\.02, name: 'tauride-terrain-ground' \}/, "{ paint: 0.02, polygonOffset: 2, name: 'tauride-terrain-ground' }", /NO polygonOffset/],
  ['the relief is not drawn before the ground (the ground fragments under a hill are shaded twice)', /if \(shared\) m\.renderOrder = -1;/, '', /drawn before the ground/],
  ['the ground is not looked up (the placeholder is always used)', /const gm = groundMaterial\(ctx\);\n/, 'const gm = null;\n', /ONE material|onBeforeCompile and customProgramCacheKey|shader text/],
];
for (const [what, re, to, expect] of cuts) {
  const mod = await variant(re, to), rows = await checks('mutant', mod, false);
  const red = rows.filter((r) => !r[1]).map((r) => r[0]);
  ok(`mutant: ${what} turns a check red (the proof can fail)`, red.length > 0 && red.some((n) => expect.test(n)), `${red.length} red`);
}
console.log(failed ? `RESULT: FAIL (${failed} of ${total} checks)` : `RESULT: OK (${total} checks)`);
process.exit(failed ? 1 : 0);
