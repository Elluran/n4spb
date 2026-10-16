// Real transferable Worker round trips plus lifecycle/error fallbacks; no GPU.
import assert from 'node:assert/strict';
import http from 'node:http';
import { gzipSync } from 'node:zlib';
import { Worker as NodeWorker } from 'node:worker_threads';
const core = new URL(process.env.PITER_LOADING_CORE || '../src/core/', import.meta.url);
const { encodeBaked, decodeBaked, readBakedBuffer } = await import(new URL('baked-codec.js', core));
const { createBakedLoader } = await import(new URL('baked-world.js', core));

const shared = new Float32Array([1.25, -2, Infinity, NaN]);
const fixture = { shared, alias: shared, bytes: new Uint8Array([0, 127, 255]), empty: undefined,
  map: new Map(), set: new Set(), special: [Infinity, -Infinity, NaN] };
fixture.self = fixture; fixture.map.set(fixture, shared); fixture.set.add(fixture);
const encoded = encodeBaked(fixture), gzip = gzipSync(encoded);
const verify = value => {
  assert.equal(value.self, value); assert.equal(value.shared, value.alias);
  assert.equal(value.map.get(value), value.shared); assert(value.set.has(value));
  assert.deepEqual(value.shared, fixture.shared); assert.deepEqual(value.bytes, fixture.bytes);
  assert.deepEqual(value.special, fixture.special); assert.equal(value.empty, undefined);
  assert.equal(value.shared.buffer, value.bytes.buffer, 'one decoded backing buffer survives transfer');
};
for (const size of [encoded.length, undefined]) {
  const buffer = await readBakedBuffer(new Response(gzip), size);
  assert.deepEqual(new Uint8Array(buffer), encoded); verify(decodeBaked(buffer));
}
await assert.rejects(readBakedBuffer(new Response(gzip), encoded.length - 1), /exceeds/);
await assert.rejects(readBakedBuffer(new Response(gzip), encoded.length + 1), /shorter/);
await assert.rejects(readBakedBuffer(new Response(new Uint8Array([1, 2, 3])), encoded.length));

const server = http.createServer((req, res) => {
  if (req.url === '/missing') { res.writeHead(404); return res.end(); }
  if (req.url === '/invalid') return res.end(gzipSync(new Uint8Array(16)));
  res.end(gzip);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const asset = `http://127.0.0.1:${server.address().port}`;
const instances = [];
class WorkerBridge {
  constructor(url) {
    this.terminated = false; instances.push(this);
    const source = `import { parentPort } from 'node:worker_threads';
      globalThis.postMessage = (value, transfer) => parentPort.postMessage(value, transfer);
      await import(${JSON.stringify(url.href)});
      parentPort.on('message', data => globalThis.onmessage({ data }));`;
    this.worker = new NodeWorker(new URL(`data:text/javascript,${encodeURIComponent(source)}`));
    this.worker.on('message', data => this.onmessage?.({ data }));
    this.worker.on('error', error => this.onerror?.({ message: error.message, preventDefault() {} }));
  }
  postMessage(data) { this.worker.postMessage(data); }
  terminate() { this.terminated = true; this.worker.terminate(); }
}
const originalWorker = globalThis.Worker;
try {
  globalThis.Worker = WorkerBridge;
  const diagnostics = {}, loader = createBakedLoader({ diagnostics });
  verify(await loader.load(asset + '/fixture', encoded.length));
  verify(await loader.load(asset + '/fixture'));
  assert.equal(diagnostics.decoder.mode, 'worker'); assert.equal(diagnostics.decoder.files, 2);
  assert.equal(diagnostics.decoder.bytes, encoded.length * 2);
  await assert.rejects(loader.load(asset + '/missing'), /HTTP 404/);
  await assert.rejects(loader.load(asset + '/invalid', 16), /header/);
  await assert.rejects(loader.load(asset + '/fixture', encoded.length + 1), /shorter/);
  verify(await loader.load(asset + '/fixture', encoded.length));
  loader.dispose(); assert.equal(instances.at(-1).terminated, true);
  await assert.rejects(loader.load(asset + '/fixture'), /closed/);

  const stopped = createBakedLoader();
  const pending = stopped.load(asset + '/fixture', encoded.length);
  stopped.dispose(); await assert.rejects(pending, /closed/);

  class BlockedWorker { constructor() { throw new Error('Worker blocked'); } }
  globalThis.Worker = BlockedWorker;
  const blockedDiagnostics = {}, blocked = createBakedLoader({ diagnostics: blockedDiagnostics });
  verify(await blocked.load(asset + '/fixture', encoded.length));
  assert.equal(blockedDiagnostics.decoder.mode, 'fallback'); blocked.dispose();

  class CrashedWorker {
    postMessage() { queueMicrotask(() => this.onerror({ message: 'Worker crashed' })); }
    terminate() {}
  }
  globalThis.Worker = CrashedWorker;
  const crashedDiagnostics = {}, crashed = createBakedLoader({ diagnostics: crashedDiagnostics });
  const recovered = await Promise.all([crashed.load(asset + '/fixture', encoded.length), crashed.load(asset + '/fixture')]);
  recovered.forEach(verify); assert.equal(crashedDiagnostics.decoder.mode, 'fallback'); crashed.dispose();

  class PostFailedWorker {
    postMessage() { throw new Error('Worker post failed'); }
    terminate() {}
  }
  globalThis.Worker = PostFailedWorker;
  const postFailedDiagnostics = {}, postFailed = createBakedLoader({ diagnostics: postFailedDiagnostics });
  verify(await postFailed.load(asset + '/fixture', encoded.length));
  assert.equal(postFailedDiagnostics.decoder.mode, 'fallback'); postFailed.dispose();

  class MessageFailedWorker {
    postMessage() { queueMicrotask(() => this.onmessageerror()); }
    terminate() {}
  }
  globalThis.Worker = MessageFailedWorker;
  const messageFailedDiagnostics = {}, messageFailed = createBakedLoader({ diagnostics: messageFailedDiagnostics });
  verify(await messageFailed.load(asset + '/fixture', encoded.length));
  assert.equal(messageFailedDiagnostics.decoder.mode, 'fallback'); messageFailed.dispose();

  const disabledDiagnostics = {}, disabled = createBakedLoader({ worker: false, diagnostics: disabledDiagnostics });
  verify(await disabled.load(asset + '/fixture', encoded.length));
  assert.equal(disabledDiagnostics.decoder.mode, 'main'); disabled.dispose();
} finally {
  globalThis.Worker = originalWorker;
  for (const worker of instances) worker.terminate();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
console.log('RESULT: OK (bounded decode, real Worker transfer/aliases/cycles, asset and worker failures, shutdown)');
