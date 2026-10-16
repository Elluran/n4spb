// metro/release.js — the metro's canvases leave the browser's memory budget once nothing needs them on the CPU.
//
// Why (2026-10-15, tools/metro-surface-probe.mjs --gctrace): the whole city sits at V8's GLOBAL memory limit (JS heap + ArrayBuffers + canvas backing stores, ~8.66 GB);
// above it every external allocation (a region decode, an audio buffer) starts a full mark-compact of the 2.4 GB heap ("external memory pressure", ~0.85-1.1 s each),
// about once a second, on the street, standing or driving. The nine-station round added ~40 M canvas pixels (the wayfinding kit, the new halls) and pushed the
// city over that line. The metro is built once at load and never streamed, so after the load:
//   * ORPHANS: canvases the metro painted that no mesh of the scene uses (core/batch2.js copied them into an atlas page, or nothing uses them) are shrunk to 1x1 at once;
//   * METRO-ONLY: canvases used only by underground meshes (never drawn from the street, so never uploaded there) are uploaded with renderer.initTexture, a few per
//     frame, and then shrunk. The GL textures stay; three.js re-uploads only on needsUpdate, which the metro never sets on them after the build.
// Kept: textures also used by street meshes (pavilions, totems, street doors), every texture reachable from the material kit M (the lazily built trains use it),
// the runtime-painted name boards of the generic hall ('nb-...') and the in-car strips ('strip-...'). A lost WebGL context cannot restore the shrunk canvases (the same
// policy as core/spatial.js releaseOnUpload: a reload); ?keepcpu=1 keeps them (tools that read canvases); ?metrorelease=0 switches this pass off (A/B).
const SLOTS = ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'bumpMap', 'gradientMap', 'aoMap', 'lightMap', 'specularMap', 'roughnessMap', 'metalnessMap', 'displacementMap', 'envMap'];
/** runtime-painted canvases (generic hall name boards nb-<id>, in-car strips): never shrunk here and never content-keyed in mats.js (show() may assign them any time) */
export const KEEP_KEY = /^(nb-|strip-)/;

/** records the textures the metro CREATES while it builds (a cache hit of another module's key is not recorded); stop() restores ctx.tex.draw */
export function recordCanvases(ctx) {
  const tex = ctx.tex, set = new Set(), orig = tex && tex.draw;
  if (!orig) return { set, stop() {} };
  tex.draw = function (w, h, fn, opts) { const hit = !!(opts && opts.key && tex.cache && tex.cache.has(opts.key)); const t = orig.call(this, w, h, fn, opts); if (!hit && t) set.add(t); return t; };
  return { set, stop() { if (tex.draw !== orig) tex.draw = orig; } };
}

/**
 * NO ATLAS COPY for underground-only canvases (plan 2026-10-15 item 5; ?metroatlasskip=0 restores the old path for A/B).
 * core/batch2.js copies every clamp-to-edge canvas whose meshes keep their UVs in [0, 1] into 4096 px atlas pages. For the metro that was 388 canvases / 45.7 M px
 * (release stats of the nine-station round): three to four extra 64 MB pages allocated during static batching, at the global memory limit where every external
 * allocation can start a full mark-compact, and kept for the whole session, while the originals become orphans. A canvas that only underground meshes use is never
 * drawn from the street and draws only inside its own zone, so sharing a page saves a few draws in one hall at most. Such textures keep their own canvas instead;
 * after the load the pass below uploads it and shrinks it (the 'uploaded' path), so neither copy stays on the CPU.
 * How: atlasableTex() in core/batch2.js rejects a texture with a UV offset, and there is no explicit opt-out yet: offset.x = 1e-30 (far below the float32 resolution of
 * any UV in [0, 1]: the sampled texel is bit-identical) keeps it out; userData.noAtlas names the intent for an explicit check. A texture any street / surface mesh
 * uses stays an atlas candidate. Kit textures (M) and the runtime-painted boards (KEEP_KEY) are marked too (no page copy) and are still kept by the pass below.
 * Runs once at the end of the metro build (before batching); returns { textures, px }.
 */
export function keepOutOfAtlas(ctx, created) {
  const stats = { textures: 0, px: 0, skipped: false };
  const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  if ((params && params.get('metroatlasskip') === '0') || ctx.recordBake || !created.size) { stats.skipped = true; return stats; }
  const scene = ctx.staticRoot ? ctx.staticRoot.parent || ctx.staticRoot : ctx.scene;
  const use = new Map();                                 // texture -> 1 (underground meshes only) | 2 (anything else) | 3
  const note = (t, metro) => { if (t && t.isTexture && created.has(t)) use.set(t, (use.get(t) || 0) | (metro ? 1 : 2)); };
  scene.traverse((o) => {
    if (!o.material) return; let metro = null;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m) continue; if (metro === null) metro = underTag(o);
      for (const s of SLOTS) if (m[s]) note(m[s], metro);
    }
  });
  for (const [t, u] of use) {
    if (u !== 1) continue;
    if (t.wrapS !== 1001 || t.wrapT !== 1001 || t.repeat.x !== 1 || t.repeat.y !== 1 || t.offset.x !== 0 || t.offset.y !== 0 || t.rotation !== 0) continue;   // (1001 = ClampToEdgeWrapping) not an atlas candidate anyway
    t.offset.x = 1e-30; t.userData.noAtlas = true; t.updateMatrix && t.updateMatrix();
    if (t.anisotropy < 8) t.anisotropy = 8;                      // (the anisotropy of the atlas pages it used to be drawn from)
    stats.textures++; if (t.image) stats.px += (t.image.width || 0) * (t.image.height || 0);
  }
  return stats;
}

const isCanvas = (img) => !!img && typeof img.getContext === 'function' && img.width > 1;
const underTag = (o) => { for (let p = o; p; p = p.parent) { const u = p.userData; if (u.undergroundOnly) return true; if (u.alwaysVisible || u.surfaceOnly) return false; } return false; };

/** textures reachable from the material kit (two levels: M.x, M.x.y; a material's slots) */
function kitTextures(M) {
  const out = new Set(), seen = new Set();
  const visit = (v, depth) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return; seen.add(v);
    if (v.isTexture) { out.add(v); return; }
    if (v.isMaterial) { for (const s of SLOTS) if (v[s] && v[s].isTexture) out.add(v[s]); return; }
    if (depth <= 0 || v.isObject3D || v.isBufferGeometry) return;
    for (const k of Object.keys(v)) visit(v[k], depth - 1);
  };
  visit(M, 2);
  return out;
}

/**
 * Schedules the release pass: it runs once the page is loaded (batching, atlases and the upload frame are done), spread over frames.
 * created: the Set from recordCanvases; M: the material kit. Returns a stats object (also ctx.metro.release once metro.js stores it).
 */
export function scheduleRelease(ctx, M, created, { perFrame = 8 } = {}) {
  const stats = { orphans: 0, orphanPx: 0, uploaded: 0, uploadedPx: 0, kept: 0, done: false, ms: 0 };
  const R = ctx.renderer;
  const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  if (!R || !R.initTexture || typeof document === 'undefined' || !params || params.has('keepcpu') || params.get('metrorelease') === '0' || ctx.recordBake || !created.size) { stats.done = true; stats.skipped = true; return stats; }
  let queue = null;
  ctx.onUpdate(() => {
    if (stats.done) return;
    if (queue === null) {
      if (!document.body || !document.body.classList.contains('loaded')) return;
      const t0 = performance.now();
      queue = plan(ctx, M, created, stats);
      stats.ms += performance.now() - t0;
    }
    const t0 = performance.now();
    for (let n = 0; n < perFrame && queue.length; n++) {
      const group = queue.pop();                                   // the scene textures that share one canvas (a clone with another repeat is its own GL texture)
      try { for (const t of group.textures) R.initTexture(t); } catch (e) { stats.kept++; continue; }
      stats.uploaded++; stats.uploadedPx += group.img.width * group.img.height;
      group.img.width = 1; group.img.height = 1;
    }
    stats.ms += performance.now() - t0;
    if (!queue.length) stats.done = true;
  });
  return stats;
}

function plan(ctx, M, created, stats) {
  const scene = ctx.staticRoot ? ctx.staticRoot.parent : ctx.scene;
  const use = new Map(), bySource = new Map();          // texture -> 1 (underground meshes only) | 2 (anything else) | 3; canvas -> the scene textures painted on it
  const note = (t, metro) => { if (!t || !t.isTexture) return; use.set(t, (use.get(t) || 0) | (metro ? 1 : 2)); const img = t.image; if (img) { let a = bySource.get(img); if (!a) bySource.set(img, (a = new Set())); a.add(t); } };
  scene.traverse((o) => {
    const mats = [o.material, o.customDepthMaterial, o.customDistanceMaterial]; let metro = null;
    for (const m0 of mats) for (const m of Array.isArray(m0) ? m0 : m0 ? [m0] : []) {
      if (metro === null) metro = underTag(o);
      for (const s of SLOTS) if (m[s]) note(m[s], metro);
      if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) note(u.value, metro);
    }
  });
  const keep = kitTextures(M), keepImg = new Set([...keep].map((t) => t.image).filter(Boolean)), keyOf = new Map();
  if (ctx.tex.cache) for (const [k, t] of ctx.tex.cache) if (created.has(t)) keyOf.set(t, k);
  const queue = [], queued = new Set();
  for (const t of created) {
    const img = t.image;
    if (!isCanvas(img) || queued.has(img)) continue;
    if (keep.has(t) || keepImg.has(img) || KEEP_KEY.test(keyOf.get(t) || '')) { stats.kept++; continue; }
    const users = bySource.get(img);
    if (!users) { stats.orphans++; stats.orphanPx += img.width * img.height; img.width = 1; img.height = 1; queued.add(img); continue; }    // in an atlas page (or unused): the copy is not needed
    let ok = true; for (const u of users) if (use.get(u) !== 1 || keep.has(u)) { ok = false; break; }
    if (!ok) { stats.kept++; continue; }
    queued.add(img); queue.push({ img, textures: [...users] });
  }
  return queue;
}
