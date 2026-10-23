// CPU probe of the module landmarksNorthFull (the full copy of the source landmarksNorth that the North builds; the strip builds its trimmed landmarksNorth).
//   node tools/area.mjs north tools/northfull-sign-probe.mjs            asserts: the Chernyshevskaya vestibule w22999175 is claimed by landmarksNorthFull (group north-chernyshevskaya) and has a member in the
//                                                                       data, the module builds without a caught error, and the metro part emits the sign ЧЕРНЫШЕВСКАЯ (K.fascia in metro(): a mesh named
//                                                                       north-chernyshevskaya whose material map is the sign texture drawn for that text); prints the triangles of every part.
//   node tools/area.mjs north tools/northfull-sign-probe.mjs --parity   also prints "PARITY <id> <triangles> <position hash>" for the band ids (the bookstore + the corridor houses both areas build)
//   node tools/area.mjs strip tools/northfull-sign-probe.mjs --parity   the same lines from the strip's trimmed landmarksNorth: the two outputs must agree (the code of corridor() and bookstore() is the same text)
// Exit code 1 when an assertion fails.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = (p) => pathToFileURL(path.join(root, p)).href;
const AREA = process.env.AREA || 'strip', MOD = AREA === 'north' ? 'landmarksNorthFull' : 'landmarksNorth', DIR = AREA === 'north' ? 'landmarksNorthFull' : 'landmarksNorth';
const SIGN = 'ЧЕРНЫШЕВСКАЯ', PARITY = process.argv.includes('--parity');

// ---------------------------------------------------------------- DOM stubs (as tools/check.mjs); the 2D context records every fillText
const painted = new Set();
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  fillText(t) { painted.add(String(t)); }
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  getLineDash() { return []; }
}
class FakeCanvas {
  constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; }
  getContext(type) { return type !== '2d' ? null : (this._ctx ||= new Proxy(new Ctx2D(this), { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } })); }
  toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {}
}
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, setAttribute() {} }), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {} };
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16); globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1; globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

const THREE = await import('three');
const { createContext } = await import(url('src/core/ctx.js'));
const { createAudio } = await import(url('src/core/audio.js'));
const { createKnock } = await import(url('src/core/knock.js'));
const L = await import(url('src/world/layout.js'));
const { GROUPS_LIST } = await import(url(`src/world/${DIR}/groups.js`));
const mod = await import(url(`src/world/${MOD}.js`));

const problems = [], fail = (m) => problems.push(m);
const caught = [];
for (const k of ['error', 'warn']) { const orig = console[k].bind(console); console[k] = (...a) => { const line = a.map((x) => (x && x.stack) || String(x)).join(' '); if (/failed|is not a function|is not defined|Cannot read/.test(line)) caught.push(line.split('\n')[0].slice(0, 200)); orig(...a); }; }

/** builds the module in a fresh context; returns { ctx, drawn (texture key -> texture), parts (mesh name -> triangles), meshes } */
async function buildOnce() {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
  let audio; try { audio = createAudio(); } catch { audio = null; }
  const ctx = createContext({ scene, camera, renderer: null, audio, quality: { name: 'medium', pixelRatio: 1, msaa: 4, shadowMap: 2048, shadowSize: 70, petals: 0.6 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
  ctx.buildList = [MOD]; ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} }; ctx.knock = createKnock(ctx);
  const drawn = new Map(), draw = ctx.tex.draw;
  ctx.tex.draw = (w, h, fn, o = {}) => { const t = draw(w, h, fn, o); if (o.key) drawn.set(o.key, t); return t; };
  await mod.build(ctx);
  const parts = {}, meshes = [], hashes = {};      // hashes: FNV-1a over the vertex positions (1 mm) of every mesh of a part, in scene order
  scene.traverse((o) => {
    if (!o.isMesh || !o.name) return;
    const g = o.geometry, pos = g.attributes.position; parts[o.name] = (parts[o.name] || 0) + (g.index ? g.index.count : pos.count) / 3; meshes.push(o);
    let h = hashes[o.name] ?? 2166136261; for (let i = 0; i < pos.array.length; i++) h = Math.imul(h ^ Math.round(pos.array[i] * 1000), 16777619); hashes[o.name] = h >>> 0;
  });
  return { ctx, drawn, parts, meshes, hashes };
}

console.log(`area ${AREA}, module ${MOD}`);
const r = await buildOnce();
console.log('services:', Object.keys(r.ctx.services).join(', '), '| module triangles', r.ctx.services[MOD] && r.ctx.services[MOD].triangles);
for (const [name, n] of Object.entries(r.parts)) console.log(`  part ${name.padEnd(24)} ${String(Math.round(n)).padStart(8)} triangles`);

if (AREA === 'north') {
  const id = 'w22999175';
  if (!L.buildingById(id)) fail(`${id} is not in the data of the North`);
  if (L.groupOf(id) !== 'north-chernyshevskaya' || L.claimedBy(id) !== MOD) fail(`${id} must be claimed by ${MOD} / north-chernyshevskaya, it is claimed by ${L.claimedBy(id)} / ${L.groupOf(id)}`);
  const members = L.groupMembers('north-chernyshevskaya');
  console.log(`vestibule ${id}: ${members.length} member(s), claimed by ${L.claimedBy(id)}`);
  if (members.length < 1) fail('the group north-chernyshevskaya resolves to no building');
  if (!r.parts['north-chernyshevskaya']) fail('the module emitted no mesh for the part north-chernyshevskaya');
  const key = [...r.drawn.keys()].find((k) => k.startsWith('lmD-sign|' + SIGN + '|')), tex = key && r.drawn.get(key);
  if (!tex) fail(`no sign texture was requested for the text ${SIGN} (K.fascia in metro())`);
  if (!painted.has(SIGN)) fail(`the canvas was never painted with the text ${SIGN}`);
  const onMetro = r.meshes.filter((m) => m.name === 'north-chernyshevskaya' && tex && m.material.map === tex);
  if (tex && !onMetro.length) fail(`no mesh of the part north-chernyshevskaya carries the ${SIGN} texture`);
  console.log(`sign ${SIGN}: texture requested ${!!tex}, painted ${painted.has(SIGN)}, meshes of north-chernyshevskaya that carry it: ${onMetro.length}${onMetro.length ? `, ${Math.round(onMetro.reduce((s, m) => s + m.geometry.index.count / 3, 0))} triangles` : ''}`);
  for (const t of ['МЕТРОПОЛИТЕН']) if (!painted.has(t)) fail(`the canvas was never painted with ${t}`);
  // M7, the night term (the M5 GPU QA finding 5: the signs stayed dark at night): the three sign materials of the vestibule (ЧЕРНЫШЕВСКАЯ, МЕТРОПОЛИТЕН, М) carry their sign texture as the emissive map and
  // follow ctx.shared.uNight through the kit's night update (landmarksD/common.js nightMats, landmarksNorthFull.js litFascia): dark by day (intensity 0), lit at night (> 0.5)
  const signKeys = ['ЧЕРНЫШЕВСКАЯ', 'МЕТРОПОЛИТЕН', 'М'].map((t) => [t, [...r.drawn.keys()].find((k) => k.startsWith('lmD-sign|' + t + '|'))]);
  const signMats = [];
  for (const [t, k] of signKeys) {
    const tx = k && r.drawn.get(k), mats = r.meshes.filter((m) => m.name === 'north-chernyshevskaya' && tx && m.material.map === tx).map((m) => m.material);
    if (!mats.length) { fail(`no mesh of north-chernyshevskaya carries the sign ${t}`); continue; }
    for (const m of mats) { if (m.emissiveMap !== tx) fail(`the sign ${t} has no emissive map (its own texture)`); signMats.push([t, m]); }
  }
  const run = (night) => { r.ctx.shared.uNight.value = night; for (const f of r.ctx._updates) f(0.1, 1); return signMats.map(([t, m]) => [t, +m.emissiveIntensity.toFixed(3)]); };
  const day = run(0), night = run(1); r.ctx.shared.uNight.value = 0;
  for (const [t, v] of day) if (v !== 0) fail(`by day the sign ${t} emits (${v})`);
  for (const [t, v] of night) if (!(v > 0.5)) fail(`at night the sign ${t} is not lit (emissiveIntensity ${v})`);
  console.log(`night: emissive intensity by day ${JSON.stringify(day)}, at night ${JSON.stringify(night)}`);
}

if (PARITY) {
  // the geometry of one id: the corridor group is cut down to that id in place (layout.SUBGROUPS shares the `ids` array of GROUPS_LIST), the other parts are built as usual
  const corridor = GROUPS_LIST.find((g) => g.key === 'north-corridor-houses'), all = corridor.ids.slice();
  console.log(`PARITY north-podpisnye w96123542 ${Math.round(r.parts['north-podpisnye'] || 0)} ${r.hashes['north-podpisnye']}`);
  for (const id of ['w60354379', 'w96364627', 'r1394323', 'w98394819']) {
    if (!all.includes(id)) { console.log(`PARITY ${id} absent`); continue; }
    corridor.ids.splice(0, corridor.ids.length, id);
    const p = await buildOnce();
    console.log(`PARITY ${id} ${Math.round(p.parts['north-corridor'] || 0)} ${p.hashes['north-corridor']}`);
  }
  corridor.ids.splice(0, corridor.ids.length, ...all);
}

if (caught.length) { fail(`${caught.length} caught sub-build error(s): ${caught.slice(0, 5).join(' | ')}`); }
for (const p of problems) console.log('PROBLEM', p);
console.log(problems.length ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(problems.length ? 1 : 0);
