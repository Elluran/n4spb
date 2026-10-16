// wildlife-audio: do the ambient crowd / water loops of core/audio.js wake up where the wildlife module says (mock WebAudio, see audio-test.mjs)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const audioPath = path.resolve(process.argv[2] || path.join(root, 'src/core/audio.js'));
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const { createAudio } = await import(pathToFileURL(audioPath).href);
const warnings = [];
const realWarn = console.warn; console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };

// ---------------------------------------------------------------- mock WebAudio
class Param { constructor(v = 0) { this.value = v; } setTargetAtTime(v) { this.value = v; } setValueAtTime(v) { this.value = v; } linearRampToValueAtTime(v) { this.value = v; } exponentialRampToValueAtTime(v) { this.value = v; } cancelScheduledValues() {} cancelAndHoldAtTime() {} }
class MockNode { constructor(ac) { this.ac = ac; this.out = new Set(); } connect(n) { this.out.add(n); return n; } disconnect() { this.out.clear(); } }
class MockContext {
  constructor(sr = 48000) {
    this.sampleRate = sr; this.currentTime = 0; this.state = 'running'; this.buffers = []; this.sources = []; this.destination = new MockNode(this);
    this.listener = { positionX: new Param(), positionY: new Param(), positionZ: new Param(), forwardX: new Param(), forwardY: new Param(), forwardZ: new Param(), upX: new Param(), upY: new Param(), upZ: new Param() };
    this.counts = {};
  }
  _n(kind, extra = {}) { this.counts[kind] = (this.counts[kind] || 0) + 1; return Object.assign(new MockNode(this), extra); }
  createGain() { return this._n('gain', { gain: new Param(1) }); }
  createBiquadFilter() { return this._n('biquad', { type: 'lowpass', frequency: new Param(350), Q: new Param(1), gain: new Param(0) }); }
  createOscillator() { return this._n('osc', { type: 'sine', frequency: new Param(440), start() {}, stop() {} }); }
  createChannelMerger() { return this._n('merger'); }
  createDelay() { return this._n('delay', { delayTime: new Param(0) }); }
  createStereoPanner() { return this._n('spanner', { pan: new Param(0) }); }
  createConvolver() { return this._n('conv', { buffer: null }); }
  createDynamicsCompressor() { return this._n('comp', { threshold: new Param(), knee: new Param(), ratio: new Param(), attack: new Param(), release: new Param() }); }
  createWaveShaper() { return this._n('shaper', { curve: null, oversample: 'none' }); }
  createAnalyser() { return this._n('analyser', { fftSize: 2048, getFloatTimeDomainData(a) { a.fill(0); } }); }
  createPanner() { return this._n('panner', { positionX: new Param(), positionY: new Param(), positionZ: new Param(), setPosition() {}, panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 1, rolloffFactor: 1, maxDistance: 1e4, coneInnerAngle: 360, coneOuterAngle: 360 }); }
  createBuffer(nch, len, sr) {
    const data = Array.from({ length: nch }, () => new Float32Array(len));
    const b = { numberOfChannels: nch, length: len, sampleRate: sr, duration: len / sr, getChannelData: (i) => data[i] };
    this.buffers.push(b); return b;
  }
  createBufferSource() {
    const ac = this, s = this._n('source', { buffer: null, loop: false, playbackRate: new Param(1), onended: null, t0: -1, start(t) { this.t0 = t; ac.sources.push(this); }, stop() {} });
    return s;
  }
  resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); } close() { return Promise.resolve(); }
  /** fire onended of the sources whose time has come (so the engine's cleanup runs) */
  tick() { for (const s of this.sources) if (!s.done && s.t0 >= 0 && !s.loop && s.buffer && s.t0 + s.buffer.duration / s.playbackRate.value < this.currentTime) { s.done = true; if (s.onended) s.onended(); } }
}

const world = { L: { ...L, waterwayAt: (x, z) => (x > 500 ? 'neva' : x > 100 ? 'moika' : null) }, shared: { uNight: { value: 0 }, uGust: { value: 0.5 } },
  services: { environment: { shoreDist: (x, z) => Math.max(0, 1e4 * 0 + (x < 100 ? 1e4 : 0)), kindAt: () => 'paved' }, wildlife: { crowds: [{ x: -1000, z: 0, r: 20, f: 40, l: 1 }] } } };
world.services.environment.shoreDist = (x, z) => (x > 100 ? Math.max(0, x - 110) : 1e4);   // water east of x = 100
world.services.environment.shoreDist = (x, z) => (x >= 700 ? 0 : x >= 100 ? 700 - x : 1e4);
globalThis.__ctx = world;
const ac = new MockContext(); const audio = createAudio({ context: ac, seed: 7 }); audio.start();
const camera = (x, y, z) => ({ updateMatrixWorld() {}, matrixWorld: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1] } });
let lx = 0, lz = 0;
const stand = (x, z, s = 4) => { lx = x; lz = z; for (let i = 0; i < s * 60; i++) { ac.currentTime += 1 / 60; ac.tick(); audio.update(camera(lx, 1.6, lz), 1 / 60); } return audio.stats.awake; };
let g = 0; while (audio.stats.pending > 0 && g++ < 4000) audio.update(camera(0, 1.6, 0), 0.016);
const far = stand(0, 0), crowd = stand(-1000, 0), edge = stand(-1050, 0), gone = stand(-1100, 0), neva = stand(710, 0), moika = stand(250, 0);
console.log({ far, crowd, edge, gone, neva, moika });
const fails = [];
if (!(crowd > far)) fails.push('the crowd loop wakes up inside the zone');
if (gone !== far) fails.push('the crowd loop sleeps beyond the fade');
console.log(fails.length ? 'RESULT: FAIL ' + fails.join('; ') : 'RESULT: OK');
