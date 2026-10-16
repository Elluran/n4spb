// CPU equivalence and timing for signal-display caching. Executes the actual lens callback and the
// countdown builder against their uncached versions; compares every instance matrix, tint and glyph.
// Run: node tools/signal-display-test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { buildCountdowns } from '../src/world/streets/countdown.js';
import { createSignalDisplayClock } from '../src/world/streets/display-clock.js';
import { groupState, groupRemain, pedGroupState, pedRemain, midState, midPed } from '../src/world/streets/lanegraph.js';

const countdownUrl = new URL('../src/world/streets/countdown.js', import.meta.url);
const countdownSource = fs.readFileSync(countdownUrl, 'utf8').replace('    if (!displayDue(t)) return;', '');
const resolvedCountdown = countdownSource.replace(/from '([^']+)'/g, (_, path) => `from '${path === 'three' ? import.meta.resolve('three') : new URL(path, countdownUrl).href}'`);
const { buildCountdowns: originalCountdowns } = await import('data:text/javascript;base64,' + Buffer.from(resolvedCountdown).toString('base64'));
const signalSource = fs.readFileSync(new URL('../src/world/streets/signals.js', import.meta.url), 'utf8');
const begin = signalSource.indexOf('  const prep = (list, n, dy)'), end = signalSource.indexOf('  out.countdowns =', begin);
assert(begin >= 0 && end > begin, 'real lens callback is present');
const lensSource = signalSource.slice(begin, end);

function graph(fraction = 0) {
  const signals = Array.from({ length: 110 }, (_, i) => ({ ofs: i + fraction, mid: i % 4 === 0, group: i % 2 }));
  const at = i => signals[i % signals.length];
  return {
    signals,
    signalState(i, ap, t) { const s = at(i); return s.mid ? midState(t, s.ofs) : groupState(ap, t, s.ofs); },
    pedState(i, t) { const s = at(i); return s.mid ? midPed(t, s.ofs) : pedGroupState(s.group, t, s.ofs); },
    signalInfo(i, ap, t) {
      const s = at(i), u = (((t + s.ofs) % 60) + 60) % 60;
      return { state: this.signalState(i, ap, t), remain: s.mid ? Math.ceil(u < 44 ? 44 - u : u < 47 ? 47 - u : 60 - u) : groupRemain(ap, t, s.ofs) };
    },
    pedInfo(i, t) {
      const s = at(i), u = (((t + s.ofs) % 60) + 60) % 60;
      return { state: this.pedState(i, t), remain: s.mid ? Math.ceil(u < 49 ? 49 - u : u < 59 ? 59 - u : 60 - u + 49) : pedRemain(s.group, t, s.ofs) };
    },
  };
}
function heads(n) {
  return Array.from({ length: n }, (_, i) => ({ kind: i % 3 ? 'veh' : 'ped', sig: i % 110, ap: i % 2, cross: i % 110, x: i * 2.13, y: 2.3 + i % 4, z: -i * 1.07, dx: Math.sin(i), dz: Math.cos(i) }));
}
function countdownFixture(build, list, graph) {
  let mesh, update;
  build({ tex: { FONTS: { sans: 'sans-serif' }, draw: () => new THREE.Texture() }, addStatic: m => { mesh = m; }, noOutline() {}, noBatch() {}, onUpdate: fn => { update = t => fn(0, t); } }, list, graph, { geo() {} });
  return { update, buffers: [mesh.instanceMatrix.array, mesh.instanceColor.array, mesh.geometry.attributes.uvOff.array] };
}
function lensFixture(list, graph, original) {
  const make = (kind, n) => Array.from({ length: n }, () => { const selected = list.filter(h => h.kind === kind); return { list: selected, im: new THREE.InstancedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial(), selected.length) }; });
  const vLens = make('veh', 3), pLens = make('ped', 2); let update;
  vm.runInNewContext(original ? lensSource.replace('    if (!displayDue(t)) return;', '') : lensSource, {
    THREE, D: new THREE.Object3D(), vLens, pLens, graph, createSignalDisplayClock,
    ctx: { onUpdate: fn => { update = t => fn(0, t); } },
  });
  return { update, buffers: [...vLens, ...pLens].map(l => l.im.instanceMatrix.array) };
}
const bytes = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
function same(a, b, t) {
  a.update(t); b.update(t);
  for (let i = 0; i < a.buffers.length; i++) assert(bytes(a.buffers[i]).equals(bytes(b.buffers[i])), `display buffer ${i} at t=${t}`);
}
const times = [];
for (let i = -220; i <= 440; i++) {
  const edge = i / 2, ulp = Number.EPSILON * (Math.abs(edge) + 1);
  for (const delta of [-1e-7, -ulp, 0, ulp, 1e-7, 0.021, 0.23]) times.push(edge + delta);
}
times.push(1e12 + 0.2, 1e12 + 0.3, 1e12 + 0.5, 23.1, 23.2, 4.7, 4.4, -60, -60.2, -60.8, 4.4);
let checks = 0;
for (const fraction of [0, 0.137]) {
  const g = graph(fraction), list = heads(220);
  for (const [a, b] of [[countdownFixture(originalCountdowns, list, g), countdownFixture(buildCountdowns, list, g)], [lensFixture(list, g, true), lensFixture(list, g, false)]]) {
    for (const t of times) { same(a, b, t); checks++; }
  }
}
globalThis.location = { search: '?signalcache=0' };
const disabled = createSignalDisplayClock(graph(), 1); assert(disabled(0.1) && disabled(0.2), 'A/B flag retains every update');
delete globalThis.location;
const g = graph(), list = heads(2200), old = countdownFixture(originalCountdowns, list, g), optimized = countdownFixture(buildCountdowns, list, g);
const bench = f => { const start = performance.now(); for (let i = 0; i < 3600; i++) f.update(i / 60 + 0.013); return performance.now() - start; };
bench(old); bench(optimized); // JIT warmup
const oldMs = bench(old), newMs = bench(optimized);
const oldLens = lensFixture(list, g, true), optimizedLens = lensFixture(list, g, false);
bench(oldLens); bench(optimizedLens);
const oldLensMs = bench(oldLens), newLensMs = bench(optimizedLens);
console.log(`RESULT: OK - ${checks} exact buffer comparisons, all phase offsets/edges, flash, floating-point boundaries, fractional offsets and time warps. CPU / 3600 frames (2200 heads): countdown ${oldMs.toFixed(1)} -> ${newMs.toFixed(1)} ms; lenses ${oldLensMs.toFixed(1)} -> ${newLensMs.toFixed(1)} ms.`);
