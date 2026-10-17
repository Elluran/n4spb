// The engine voices of the four garage cars (drive/sound.js profiles from drive/cars/tuning.js SOUND), headless: a recording WebAudio mock, no browser.
//   node tools/drive-garage-sound-test.mjs
// Checks: the coupe's default graph is the old one (saw / saw / square, the old pitch law), the pickup hums with sines / a triangle (no sawtooth, no square: nothing harsh, no alarm-like pitch jump), the
// Zhiguli is rough (wider detune, higher resonance), setProfile re-voices a running graph, the gear blip is silent for the electric truck and the Roadster, the Roadster whines in pure tones (sines and a triangle, a fifth on top, wind-heavy) with a calm thrust hiss profile,
// and no voice ever exceeds a calm frequency / gain range.
import assert from 'node:assert/strict';
import { createCarSound } from '../src/world/drive/sound.js';
import { SOUND } from '../src/world/drive/cars/tuning.js';

function mockAudio() {
  const nodes = [];
  const param = (v = 0) => ({ value: v, log: [], setTargetAtTime(x, t, k) { this.log.push(x); this.value = x; }, setValueAtTime(x) { this.value = x; }, exponentialRampToValueAtTime(x) { this.value = x; } });
  const node = (kind, extra = {}) => { const n = { kind, connect() { return this; }, start() {}, stop() {}, gain: param(1), frequency: param(440), Q: param(1), type: 'lowpass', ...extra }; nodes.push(n); return n; };
  const ac = { currentTime: 0, state: 'running', sampleRate: 8000, destination: node('dest'),
    createGain: () => node('gain'), createOscillator: () => node('osc', { type: 'sine' }), createBiquadFilter: () => node('filter'), createWaveShaper: () => node('shaper', { curve: null }),
    createBufferSource: () => node('buf', { buffer: null, loop: false, loopStart: 0 }), createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }) };
  return { audio: { context: ac, muted: false, play() {} }, nodes };
}
const state = (o) => ({ rpm: 0.5, throttle: 1, drifting: false, vL: 0, boosting: false, gear: 1, speed: 80, ...o });
function voice(profile) {
  const m = mockAudio(), s = createCarSound(m.audio, profile); assert(s.start(), 'the graph builds');
  s.update(state({}), true); s.update(state({ rpm: 0.9, gear: 2 }), true);
  const osc = m.nodes.filter((n) => n.kind === 'osc'), filt = m.nodes.filter((n) => n.kind === 'filter');
  return { s, m, bufs: m.nodes.filter((n) => n.kind === 'buf').length, types: osc.map((o) => o.type), f1: osc[0].frequency.log.at(-1), f2: osc[1].frequency.log.at(-1), f3: osc[2].frequency.log.at(-1), lpQ: filt[0].Q.value, lpFreq: filt[0].frequency.log.at(-1), gains: osc.length };
}
const coupe = voice(null), coupe2 = voice(SOUND.coupe), truck = voice(SOUND.truck), lada = voice(SOUND.lada), roadster = voice(SOUND.roadster);
assert.deepEqual(coupe.types, ['sawtooth', 'sawtooth', 'square']); assert.deepEqual(coupe2.types, coupe.types);
assert.equal(coupe.f1, 26 + 0.9 * 118, 'the coupe keeps the old pitch law'); assert.equal(coupe2.f1, coupe.f1);
assert(Math.abs(coupe.f2 / coupe.f1 - 1.007) < 1e-9 && Math.abs(coupe.f3 / coupe.f1 - 0.5) < 1e-9, 'the coupe keeps the old detune / sub ratios');
assert.equal(coupe.lpQ, 2.2);
assert.deepEqual(truck.types, ['sine', 'triangle', 'sine'], 'the pickup hums: no harsh waveforms');
assert(truck.f1 < 200 && truck.f1 > 60, `the pickup stays in a calm range (${truck.f1} Hz)`); assert(truck.f3 / truck.f1 === 2, 'a single octave of whine');
assert(truck.lpFreq < coupe.lpFreq, 'the pickup is darker than the coupe');
assert.deepEqual(lada.types, ['sawtooth', 'square', 'square']); assert(Math.abs(lada.f2 / lada.f1 - 1.016) < 1e-9, 'the Zhiguli beats with a wider detune'); assert(lada.lpQ > coupe.lpQ, 'rougher resonance');
assert.deepEqual(roadster.types, ['sine', 'sine', 'triangle'], 'the Roadster whines in pure tones: nothing harsh');
assert(roadster.f1 > truck.f1 && roadster.f1 < 400, `the Roadster's whine is higher than the pickup's hum but calm (${roadster.f1.toFixed(0)} Hz)`); assert(Math.abs(roadster.f3 / roadster.f1 - 1.5) < 1e-9, 'a fifth on top of the whine');
assert(roadster.lpQ <= 1.0 && roadster.lpFreq < 4000, 'a soft filter: no resonant ring');
assert(SOUND.roadster.jet && SOUND.roadster.jet.gain <= 0.2 && SOUND.roadster.jet.hp >= 1200 && SOUND.roadster.jet.release >= 0.25, 'the thrust hiss is airy (high-passed) and fades out slowly: never a siren');
assert(SOUND.roadster.volume <= 0.9 && SOUND.roadster.wind > 1, 'quieter engine, more wind than the coupe');
// the gear blip (a short noise burst on an up-shift under power): the coupe and the Zhiguli click, the electric truck never does (voice() shifted 1 -> 2 once; the graph itself owns 4 noise sources)
assert.equal(coupe.bufs, 5, 'the coupe blips once'); assert.equal(lada.bufs, 5, 'the Zhiguli blips once'); assert.equal(truck.bufs, 4, 'the pickup does not blip'); assert.equal(roadster.bufs, 4, 'the Roadster does not blip (one gear, no clutch)');
// a live switch: the same graph becomes the pickup's, then the coupe's again
const live = mockAudio(), ls = createCarSound(live.audio); ls.start(); const oscs = live.nodes.filter((n) => n.kind === 'osc');
assert.deepEqual(oscs.map((o) => o.type), ['sawtooth', 'sawtooth', 'square']);
ls.setProfile(SOUND.truck); assert.deepEqual(oscs.map((o) => o.type), ['sine', 'triangle', 'sine']);
ls.setProfile(SOUND.lada); assert.deepEqual(oscs.map((o) => o.type), ['sawtooth', 'square', 'square']);
ls.setProfile(SOUND.roadster); assert.deepEqual(oscs.map((o) => o.type), ['sine', 'sine', 'triangle']);
ls.setProfile({}); assert.deepEqual(oscs.map((o) => o.type), ['sawtooth', 'sawtooth', 'square'], 'the coupe\'s voice comes back');
// a profile set BEFORE the graph exists (the first enter() into the pickup) is applied when the graph is built
const early = mockAudio(), es = createCarSound(early.audio); es.setProfile(SOUND.truck); es.start();
assert.deepEqual(early.nodes.filter((n) => n.kind === 'osc').map((o) => o.type), ['sine', 'triangle', 'sine']);
// ranges: no voice asks for a wild frequency at the redline
for (const [name, p] of Object.entries(SOUND)) { const v = voice(p); assert(v.f1 < (name === 'roadster' ? 400 : 300) && v.f1 > 20, `${name} fundamental ${v.f1} Hz`); assert(v.lpFreq < 4000, `${name} filter ${v.lpFreq} Hz`); }
console.log(`PASS garage sound: coupe ${coupe.f1.toFixed(0)} Hz saw/saw/square (old), pickup ${truck.f1.toFixed(0)} Hz sine/triangle/sine, Zhiguli ${lada.f1.toFixed(0)} Hz detune 1.016, Roadster ${roadster.f1.toFixed(0)} Hz sine/sine/triangle whine, live profile switching`);
