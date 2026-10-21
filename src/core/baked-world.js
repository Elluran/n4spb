import { decodeBaked, encodeBaked, readBakedBuffer } from './baked-codec.js';
import { BAKED_REVISION } from './baked-revision.js';
let assetBase = new URL('../../assets/baked/', import.meta.url);
/** Where the products of THIS page's area live: a path under assets/ with a trailing slash ('baked/' for the strip, 'baked/north/' for the north: docs/AREAS.md). Call before openBakedWorld. */
export function setBakeDir(dir) { assetBase = new URL('../../assets/' + String(dir).replace(/^\/+/, '').replace(/\/*$/, '/'), import.meta.url); }
/** The manifest of an area's bake (dir like setBakeDir; default: this page's), fetched fresh; null when it cannot be read. The gate preflight (core/gates.js) compares area and revision before it navigates. */
export async function peekManifest(dir) {
  try {
    const base = dir ? new URL('../../assets/' + String(dir).replace(/^\/+/, '').replace(/\/*$/, '/'), import.meta.url) : assetBase;
    const r = await fetch(new URL('manifest.json', base), { cache: 'no-cache' });
    return r.ok ? await r.json() : null;
  } catch (e) { return null; }
}
async function loadBakedFile(file, rawBytes) {
  const r = await fetch(new URL(file, assetBase)); if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
  return decodeBaked(await readBakedBuffer(r, rawBytes));
}

export function createBakedLoader({ worker = true, diagnostics = {} } = {}) {
  const pending = new Map();
  let decoder = null, nextId = 0, disposed = false;
  diagnostics.decoder = { mode: 'main', files: 0, bytes: 0, decodeMs: 0 };
  const failWorker = error => {
    decoder?.terminate(); decoder = null;
    diagnostics.decoder.mode = 'fallback'; diagnostics.decoder.error = String(error?.message || error);
    // A blocked/crashed Worker must not turn a valid bake into a procedural
    // rebuild. Retry its outstanding requests on the original loading path.
    for (const p of pending.values()) loadBakedFile(p.file, p.rawBytes).then(p.resolve, p.reject);
    pending.clear();
  };
  if (worker && typeof Worker !== 'undefined') {
    try {
      decoder = new Worker(new URL('./baked-worker.js', import.meta.url), { type: 'module' });
      diagnostics.decoder.mode = 'worker';
      decoder.onmessage = ({ data }) => {
        const p = pending.get(data.id); if (!p) return;
        pending.delete(data.id);
        if (data.error) { p.reject(new Error(`${p.file}: ${data.error}`)); return; }
        diagnostics.decoder.files++; diagnostics.decoder.bytes += data.bytes;
        diagnostics.decoder.decodeMs += data.decodeMs;
        p.resolve(data.value);
      };
      decoder.onerror = event => { event.preventDefault?.(); failWorker(event.message || 'Baked decoder failed'); };
      decoder.onmessageerror = () => failWorker('Baked decoder message could not be read');
    } catch (e) { failWorker(e); }
  }
  return {
    load(file, rawBytes) {
      if (disposed) return Promise.reject(new Error('Baked loader is closed'));
      if (!decoder) return loadBakedFile(file, rawBytes);
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject, file, rawBytes });
        try { decoder.postMessage({ id, url: new URL(file, assetBase).href, rawBytes }); }
        catch (e) { failWorker(e); }
      });
    },
    dispose() {
      disposed = true; decoder?.terminate(); decoder = null;
      for (const p of pending.values()) p.reject(new Error('Baked loader is closed'));
      pending.clear();
    },
  };
}

export function installBaker(ctx) {
  const pending = []; ctx.bakeUploads = pending; let tail = Promise.resolve();
  ctx.bakeNavOnly = new URLSearchParams(location.search).get('bake') === 'nav';
  if (ctx.bakeNavOnly) {
    // These inputs are quality independent. Reuse the completed base-stage products
    // without exposing a partial shipping manifest or enabling region streaming.
    const inputs = (async () => {
      const r = await fetch('/__bake_inputs');
      if (!r.ok) throw new Error(`Missing staged bake inputs: HTTP ${r.status}`);
      return r.json();
    })();
    ctx.bakeInputs = new Map();
    ctx.loadBakeInput = name => {
      if(ctx.bakeInputs.has(name))return ctx.bakeInputs.get(name);
      const input = inputs.then(staged => {
        const file = staged.files?.[name];
        if (!file || file !== `${name}.${staged.revision}.bin.gz`) throw new Error(`Invalid staged ${name} bake`);
        return loadBakedFile(file, staged.sizes?.[name]?.raw);
      });
      input.catch(() => {}); ctx.bakeInputs.set(name, input);return input;
    };
    for(const name of ['field','street-kerbs'])ctx.loadBakeInput(name);
  }
  ctx.recordBake = (name, value) => {
    if (ctx.bakeNavOnly && !name.startsWith('nav-')) return;
    // Encode now: mutable masks/graph arrays continue changing after this call.
    const data = encodeBaked(value);
    const upload = tail.then(async () => {
      const chunk = 4 * 1024 * 1024;
      for (let offset = 0; offset < data.length; offset += chunk) {
        const end = Math.min(data.length, offset + chunk);
        const r = await fetch(`/__bake/${name}`, { method: 'POST', body: data.subarray(offset, end),
          headers: { 'X-Bake-Offset': String(offset), 'X-Bake-Final': end === data.length ? '1' : '0' } });
        if (!r.ok) throw new Error(`Bake upload ${name}: HTTP ${r.status}`);
      }
    });
    tail = upload;
    pending.push(upload); upload.catch(() => {});
  };
}
/** `required` (a page reached by a hand-off, or ?requirebake): a missing or stale bake THROWS (the boot guard shows its error card) instead of returning null, because null means a procedural rebuild of minutes and gigabytes. Development flags still bypass. */
export async function openBakedWorld(ctx, params, { required = false } = {}) {
  if (params.has('bake') || params.get('baked') === '0' || params.has('only') || params.has('allcity') || params.has('st') || params.has('ccell') || params.has('icell') || params.has('pdens')) return null;
  try {
    const [m, v] = await Promise.all([fetch(new URL('manifest.json', assetBase)), fetch(new URL('../../__baked_revision', import.meta.url))]);
    if (!m.ok) { if (required) throw new Error(`The scene data of this area is not available (manifest: HTTP ${m.status})`); return null; }
    const manifest = await m.json();
    const revision = v.ok && v.headers.get('Content-Type')?.includes('application/json') ? (await v.json()).revision : BAKED_REVISION;
    // ?baked=force (development only): use the products of a stale bake, for performance work on code that does not change what the bake contains (engine, loaders, simulation)
    if (params.get('baked') !== 'force' && (manifest.revision !== revision || manifest.revision !== BAKED_REVISION)) throw new Error(required ? 'The scene data of this area does not match this version of the page (reload the page)' : 'Baked assets are stale; using procedural scene');
    const requests = new Map(), diagnostics = { revision, loaded: [], failures: [], released: 0 };
    const loader = createBakedLoader({ worker: params.get('bakedworker') !== '0', diagnostics });
    globalThis.addEventListener?.('pagehide', event => { if (!event.persisted) loader.dispose(); }, { once: true });
    const load = name => {
      if (!requests.has(name)) requests.set(name, (async () => {
        const file = manifest.files[name]; if (!file) return null;
        const data = await loader.load(file, manifest.sizes?.[name]?.raw);
        diagnostics.loaded.push(name); return data;
      })().catch(e => { requests.delete(name); throw e; }));
      return requests.get(name);
    };
    const baked = { manifest, load, data: {}, diagnostics, dispose: loader.dispose,
      release(name) { if (requests.delete(name)) diagnostics.released++; delete baked.data[name]; } };
    ctx.services.baked = diagnostics;
    // Network/decompression overlaps fonts and the preceding landmark modules.
    for (const name of ['field', 'street-textures', 'street-kerbs', 'street-surfaces', 'city-base', 'roof', `nav-${ctx.quality.level || ctx.quality.name}`]) {
      const p = load(name); p.catch(e => diagnostics.failures.push(String(e)));
      baked.data[name] = p;
    }
    return baked;
  } catch (e) { console.warn('[baked]', e.message); if (required) throw e; return null; }
}
export async function bakedData(ctx, name) {
  // A bake must fail if its required staged input is unavailable; silently
  // rebuilding the gigabyte-scale raster can exhaust the browser's memory.
  if (ctx.bakeInputs?.has(name)) return await ctx.bakeInputs.get(name);
  if (ctx.loadBakeInput && name.startsWith('field-')) return await ctx.loadBakeInput(name);
  if (!ctx.baked) return null;
  try { return await ctx.baked.load(name); }
  catch (e) { console.warn('[baked] fallback:', name, e.message); return null; }
}
