// Page-side equivalence check of the nav bake format (tools/nav-bake-equiv.mjs runs it through shot.mjs --eval):
// builds the routing graph the long way while recording a bake into memory, round-trips it through the codec, hydrates from it (the FINAL path and,
// with `final` removed, the older path) and compares nodes, edges, crossings, components, entrances, benches, stops, spots, stats and 40 routes.
export async function run() {
  const ctx = window.__ctx;
  const { buildNav } = await import('../src/world/people/nav.js');
  const { DENSITY } = await import('../src/world/people.js');
  const { encodeBaked, decodeBaked } = await import('../src/core/baked-codec.js');
  if (ctx.drive && ctx.drive.enter) ctx.drive.enter();          // (as tools/baked-check.mjs: the parked car collider of drive is not part of the static input)
  const saved = ctx.navBake, savedRec = ctx.recordBake;
  let rec = null; ctx.recordBake = (name, v) => { rec = encodeBaked(v); };
  ctx.navBake = null;
  const t0 = performance.now(); const original = buildNav(ctx, DENSITY); const tOrig = performance.now() - t0;
  ctx.recordBake = savedRec;
  if (!rec) throw new Error('no bake recorded');
  const bakeFinal = decodeBaked(rec.buffer.slice(rec.byteOffset, rec.byteOffset + rec.byteLength));
  const bakeOld = saved && !saved.final ? saved : null;          // the bake the page loaded, when it is of the older format (recorded before the bridge chains): the long cached path
  const hasLong = !!(original.longs && original.longs.length);          // the area's data has a long Neva bridge (the strip: the Palace Bridge); derived from the built nav, never from the area id
  const strip = (s, old) => { const o = { ...s }; delete o.ms; delete o.latMs; if (old) delete o.crossings; return o; };
  const same = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('differs: ' + what); };
  const compare = (nav, label, old = false) => {
    for (const k of Object.keys(original.N)) { if (original.N[k].length !== nav.N[k].length) throw new Error(label + ' node length ' + k + ' ' + original.N[k].length + ' vs ' + nav.N[k].length); for (let i = 0; i < original.N[k].length; i++) if (!Object.is(original.N[k][i], nav.N[k][i])) throw new Error(label + ' node ' + k + ' ' + i); }
    if (original.E.length !== nav.E.length) throw new Error(label + ' edge count ' + original.E.length + ' vs ' + nav.E.length);
    for (let i = 0; i < original.E.length; i++) for (const k of Object.keys(original.E[i])) if (!Object.is(original.E[i][k], nav.E[i][k])) throw new Error(label + ' edge ' + i + ' ' + k);
    same(original.crosswalks, nav.crosswalks, label + ' crosswalks');
    if (original.comp.length !== nav.comp.length) throw new Error(label + ' comp length'); for (let i = 0; i < original.comp.length; i++) if (original.comp[i] !== nav.comp[i]) throw new Error(label + ' comp ' + i);
    if (original.main !== nav.main) throw new Error(label + ' main');
    // the long-bridge chain (nav.longK: the Palace Bridge pavements) exists only where the DATA has a long Neva bridge (nav.longs, built from the bridges service): asserted there exactly as before
    // (the strip), compared as an empty set where the area has none (the North: no bridges module, nav.longs = []); the Anichkov deck nodes (nav.bridge.nodes) are compared in every area ([] = [])
    if (hasLong) { if (!original.longK || !original.longK.size || !nav.longK) throw new Error(label + ' no long-bridge chain (nav.longK: the Palace Bridge pavements)'); }
    else if (!nav.longK || nav.longK.size) throw new Error(label + ' a long-bridge chain where the data has no long bridge (nav.longs is empty)');
    same([...original.longK].sort((p, q) => p - q), [...nav.longK].sort((p, q) => p - q), label + ' longK'); same(original.bridge.nodes, nav.bridge.nodes, label + ' bridge nodes');
    same(original.entrances, nav.entrances, label + ' entrances'); same(original.benches, nav.benches, label + ' benches'); same(original.stops, nav.stops, label + ' stops'); same(original.spots, nav.spots, label + ' spots');
    { const a = strip(original.stats, old), b = strip(nav.stats, old), bad = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])); if (bad.length) throw new Error(label + ' stats differ: ' + bad.map((k) => k + '=' + JSON.stringify(a[k]) + ' vs ' + JSON.stringify(b[k])).join('; ')); }
    const ids = original.comp.map((c, i) => (c === original.main ? i : -1)).filter((i) => i >= 0);
    for (let i = 1; i <= 40; i++) { const a = ids[Math.floor(ids.length * i / 41)], b = ids[Math.floor(ids.length * (41 - i) / 41)]; same(original.route(a, b), nav.route(a, b), label + ' route ' + i); }
  };
  ctx.navBake = bakeFinal; const t1 = performance.now(); const restored = buildNav(ctx, DENSITY); const tFinal = performance.now() - t1; compare(restored, 'final');
  let tOld = null; if (bakeOld) { ctx.navBake = bakeOld; const t2 = performance.now(); const old = buildNav(ctx, DENSITY); tOld = performance.now() - t2; compare(old, 'old', true); }      // (an older bake never carried the crossings count: that stat was undefined on the cached path before)
  ctx.navBake = saved;
  return { ok: true, area: (document.documentElement.getAttribute('data-area') || 'strip'), hasLong, longK: original.longK ? original.longK.size : 0, bridgeNodes: original.bridge.nodes.length, nodes: original.N.x.length, edges: original.E.length, comps: original.stats.mainSize0, bakeBytes: rec.length, ms: { original: Math.round(tOrig), final: Math.round(tFinal), old: tOld == null ? null : Math.round(tOld) }, finalPhases: restored.stats.ms, origPhases: original.stats.ms };
}
