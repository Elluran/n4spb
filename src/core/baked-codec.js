// JSON metadata + aligned typed-array bytes. No executable code in baked data.
// Object references preserve Maps, aliases and graph cycles without duplicating
// shared geometry buffers. Compression happens in the offline bake tool.
const MAGIC = 0x50495452;
const types = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array };
// The field alone expands to nearly a GiB. Fill its final buffer directly so
// Response.arrayBuffer() need not retain the chunks and allocate a second copy.
// Older manifests without raw sizes retain the original streaming fallback.
export async function readBakedBuffer(response, rawBytes) {
  const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
  if (!Number.isSafeInteger(rawBytes) || rawBytes < 8) return new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(rawBytes), reader = stream.getReader();
  let offset = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value.length > bytes.length - offset) throw new Error('Baked asset exceeds its declared size');
      bytes.set(value, offset); offset += value.length;
    }
    if (offset !== bytes.length) throw new Error('Baked asset is shorter than its declared size');
    return bytes.buffer;
  } catch (e) {
    await reader.cancel(e).catch(() => {}); throw e;
  } finally { reader.releaseLock(); }
}
export function encodeBaked(value) {
  const nodes = [], arrays = [], seen = new Map(), queue = [], schemas = [], schemaIds = new Map(); let bytes = 0;
  const visit = v => {
    if (v === undefined) return { u: 1 };
    if (typeof v === 'number' && !Number.isFinite(v)) return { n: String(v) };
    if (v === null || typeof v !== 'object') {
      if (typeof v === 'function') throw new Error('Baked data must not contain functions');
      return v;
    }
    if (seen.has(v)) return { r: seen.get(v) };
    const id = nodes.length; seen.set(v, id); nodes.push(null);
    queue.push([id, v]);
    return { r: id };
  };
  const root = visit(value);
  for (let qi = 0; qi < queue.length; qi++) {
    const [id, v] = queue[qi];
    if (ArrayBuffer.isView(v)) {
      if (!types[v.constructor.name]) throw new Error(`Unsupported array ${v.constructor.name}`);
      bytes = Math.ceil(bytes / 8) * 8;
      nodes[id] = { t: v.constructor.name, offset: bytes, length: v.length };
      arrays.push({ v, offset: bytes }); bytes += v.byteLength;
    } else if (v instanceof Map) nodes[id] = { t: 'Map', v: [...v].map(([k, a]) => [visit(k), visit(a)]) };
    else if (v instanceof Set) nodes[id] = { t: 'Set', v: [...v].map(visit) };
    else if (Array.isArray(v)) nodes[id] = { t: 'Array', v: v.map(visit) };
    else {
      // Wall/collider/nav records repeat a few shapes hundreds of thousands of
      // times. Store their keys once, avoiding one JSON pair array per property.
      const keys = Object.keys(v), key = JSON.stringify(keys);
      let schema = schemaIds.get(key);
      if (schema === undefined) { schema = schemas.length; schemas.push(keys); schemaIds.set(key, schema); }
      nodes[id] = { t: 'Object', s: schema, v: keys.map(k => visit(v[k])) };
    }
  }
  const meta = new TextEncoder().encode(JSON.stringify({ root, nodes, schemas }));
  const start = Math.ceil((8 + meta.length) / 8) * 8, out = new Uint8Array(start + bytes);
  new DataView(out.buffer).setUint32(0, MAGIC, true); new DataView(out.buffer).setUint32(4, meta.length, true);
  out.set(meta, 8);
  for (const a of arrays) out.set(new Uint8Array(a.v.buffer, a.v.byteOffset, a.v.byteLength), start + a.offset);
  return out;
}
export function decodeBaked(buffer) {
  const h = new DataView(buffer);
  if (h.getUint32(0, true) !== MAGIC) throw new Error('Invalid baked data header');
  const length = h.getUint32(4, true), start = Math.ceil((8 + length) / 8) * 8;
  const { root, nodes, schemas } = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 8, length)));
  const invalidKey = k => typeof k !== 'string' || k === '__proto__' || k === 'constructor' || k === 'prototype';
  if (schemas) for (const keys of schemas) {
    if (!Array.isArray(keys) || keys.some(invalidKey)) throw new Error('Invalid baked property');
  }
  const objects = nodes.map(n => types[n.t] ? new types[n.t](buffer, start + n.offset, n.length) : n.t === 'Map' ? new Map() : n.t === 'Set' ? new Set() : n.t === 'Array' ? [] : {});
  const read = v => v && typeof v === 'object' ? 'r' in v ? objects[v.r] : 'n' in v ? Number(v.n) : undefined : v;
  nodes.forEach((n, i) => {
    const o = objects[i];
    if (n.t === 'Map') for (const [k, v] of n.v) o.set(read(k), read(v));
    else if (n.t === 'Set') for (const v of n.v) o.add(read(v));
    else if (n.t === 'Array') for (const v of n.v) o.push(read(v));
    else if (n.t === 'Object') {
      if (n.s === undefined) for (const [k, v] of n.v) { // original manifests
        if (invalidKey(k)) throw new Error('Invalid baked property');
        o[k] = read(v);
      }
      else {
        const keys = schemas?.[n.s];
        if (!keys || keys.length !== n.v.length) throw new Error('Invalid baked object schema');
        for (let j = 0; j < keys.length; j++) o[keys[j]] = read(n.v[j]);
      }
    }
  });
  return read(root);
}
