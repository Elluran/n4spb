// Decode shipped scene data away from input/rendering. Every typed-array view
// references this one transferred buffer: no copy of the field or mesh bytes.
import { decodeBaked, readBakedBuffer } from './baked-codec.js';

globalThis.onmessage = async ({ data: { id, url, rawBytes } }) => {
  try {
    const t0 = performance.now();
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await readBakedBuffer(response, rawBytes);
    const t1 = performance.now(), value = decodeBaked(buffer);
    globalThis.postMessage({ id, value, bytes: buffer.byteLength,
      readMs: t1 - t0, decodeMs: performance.now() - t1 }, [buffer]);
  } catch (error) {
    globalThis.postMessage({ id, error: String(error?.message || error) });
  }
};
