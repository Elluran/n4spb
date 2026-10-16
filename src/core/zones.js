// zones.js — indoor zones (underground stations, tunnels, vestibules) and the underground / surface visibility switch.
//
// INDOOR ZONES. ctx.zones.add({ id, box:{x0,x1,y0,y1,z0,z1} | test:(x,y,z)=>bool, indoor:{...} }) registers a volume. Every frame the zone that contains the CAMERA
// (the last one added wins) is looked up (O(#zones), nothing per mesh) and blended in over ~0.35 s (snapped when dt is 0: ?shot renders and tools):
//   indoor.sun      0..1   multiplier of the sun (directional light) intensity, 0 = off
//   indoor.key      { color, intensity, dir:[x,y,z] }  optional: the directional light is re-aimed and recoloured as a ceiling "key lamp" (keeps the toon bands visible)
//   indoor.ambient  { color, ground, intensity }       the hemisphere light (flat bright ambient)
//   indoor.fog      { color, density }                 exponential fog
//   indoor.sky      bool   true = keep the sky dome (an open-air platform); false = hidden, replaced by indoor.bg (default: the fog colour), ground seen from below is covered
//   indoor.shadows  bool   false = the sun shadow pass is skipped (no wasted render underground, no sun leaking through the ground)
//   indoor.bloom    number | { bloom, glow, threshold }  indoor.exposure / .vignette  optional grading overrides (absolute values)
//   indoor.far      camera far plane inside the zone (better depth precision, less to draw)
//   indoor.name     string, shown by tools
// A zone may also carry underground / showUnder: true|false (default: showUnder when box.y0 < 0): inside it the meshes tagged userData.undergroundOnly are drawn.
// ctx.indoor = { amount 0..1, zone } and ctx.shared.uIndoor.value (0 outdoors .. 1 inside) are live for custom shaders.
// The blend is applied by timeofday.js (overlay.apply) AFTER the preset, so the T key / time of day keep working underground; the sky shader mixes in the plain
// background (uIndoorAmt / uIndoorBg), renderer.js clears to pipeline.bg and skips the shadow pass when pipeline.skipShadows.
//
// VISIBILITY. userData.undergroundOnly = true on an Object3D (or ctx.underground(obj)): drawn only while the camera is below config.undergroundY (-2 m) or inside a
// zone with showUnder. userData.surfaceOnly = true: not drawn while the camera is deeper than config.deepY (-20 m). userData.alwaysVisible: never hidden. With config.autoSurface
// (default) every other top-level object of the scene (merged cells, wires, crowds, traffic ...) is hidden at that depth too, except subtrees that contain an undergroundOnly /
// alwaysVisible node. core/batch2.js keeps tagged objects (and everything deeper than -3 m) in batches of their own, so the street view does not draw the metro and
// the metro view does not draw the city. refresh() re-collects the tagged objects (main.js calls it after the build); track(obj, kind) adds one later.
import * as THREE from 'three';

const BLEND_S = 0.35;
const DEFAULT_BG = new THREE.Color(0xdde9f3);
const NEUTRAL = {
  sun: 0, sky: false, shadows: false, name: '',
  ambient: { color: '#fff1e0', ground: '#d9c9b6', intensity: 1.9 },
  fog: { color: '#bfae93', density: 0.006 },
  key: { color: '#fff0da', intensity: 1.5, dir: [0.35, 0.8, 0.5] },
};

function norm(ind = {}) {
  const C = (v, d) => new THREE.Color(v ?? d);
  const amb = ind.ambient || {}, fog = ind.fog || {}, key = ind.key === null ? null : { ...NEUTRAL.key, ...(ind.key || {}) };
  const post = {};
  if (typeof ind.bloom === 'number') post.bloom = ind.bloom; else if (ind.bloom) Object.assign(post, ind.bloom);
  for (const k of ['exposure', 'vignette', 'glow', 'threshold']) if (ind[k] !== undefined) post[k] = ind[k];
  const fogColor = C(fog.color, NEUTRAL.fog.color);
  return {
    sun: ind.sun ?? NEUTRAL.sun, sky: !!ind.sky, shadows: !!ind.shadows, name: ind.name || '', far: ind.far || null,
    ambColor: C(amb.color, NEUTRAL.ambient.color), ambGround: C(amb.ground ?? amb.color, NEUTRAL.ambient.ground), ambI: amb.intensity ?? NEUTRAL.ambient.intensity,
    fogColor, fogD: fog.density ?? NEUTRAL.fog.density,
    bg: C(ind.bg, '#' + fogColor.getHexString()),
    key: key ? { color: C(key.color), intensity: key.intensity, dir: new THREE.Vector3(...key.dir).normalize() } : null,
    post,
  };
}

export function createZones({ scene, camera, sky, pipeline, shared, staticRoot, dynamicRoot, indoor, heightAt = null }) {
  const list = [];
  const state = indoor || { amount: 0, zone: null };
  const baseFar = camera.far;
  // autoUnderground: a camera more than 0.6 m below the terrain that is in no zone gets the default indoor look (the sky never shows through the ground seen from below)
  const config = { undergroundY: -2, deepY: -20, autoSurface: true, autoUnderground: true, blendSeconds: BLEND_S, freezeHidden: true, freezeKinds: 'u' };      // freezeKinds: which hidden groups stop composing matrices: u = undergroundOnly (hidden on the street, the case that matters), s = surfaceOnly, n = other units (NOT the light target: it must keep updating)
  const autoZone = { id: 'auto-underground', box: null, test: null, def: { id: 'auto-underground', indoor: { name: 'underground (default)' } }, p: norm({}), enabled: true, showUnder: true, underground: true };
  let amount = 0, appliedAmount = 0, zone = null;
  let underOn = false, deepOn = false;
  // blended indoor parameters (current values; they glide toward the zone's own while inside)
  const cur = { sun: 0, skyKeep: 0, shadows: false, ambColor: new THREE.Color(), ambGround: new THREE.Color(), ambI: 1, fogColor: new THREE.Color(), fogD: 0.005, bg: new THREE.Color(),
    keyOn: 0, keyColor: new THREE.Color(), keyI: 1, keyDir: new THREE.Vector3(0, 1, 0), post: {}, far: null };
  const hasKey = () => cur.keyOn > 0.001;
  const lerp = (a, b, t) => a + (b - a) * t;

  function setCur(p, t) {      // t = 1: copy; else glide
    cur.sun = lerp(cur.sun, p.sun, t); cur.skyKeep = lerp(cur.skyKeep, p.sky ? 1 : 0, t); cur.shadows = p.shadows;
    cur.ambColor.lerp(p.ambColor, t); cur.ambGround.lerp(p.ambGround, t); cur.ambI = lerp(cur.ambI, p.ambI, t);
    cur.fogColor.lerp(p.fogColor, t); cur.fogD = lerp(cur.fogD, p.fogD, t); cur.bg.lerp(p.bg, t);
    cur.keyOn = lerp(cur.keyOn, p.key ? 1 : 0, t);
    if (p.key) { cur.keyColor.lerp(p.key.color, t); cur.keyI = lerp(cur.keyI, p.key.intensity, t); cur.keyDir.lerp(p.key.dir, t).normalize(); }
    cur.far = p.far;
    for (const k in p.post) cur.post[k] = cur.post[k] === undefined ? p.post[k] : lerp(cur.post[k], p.post[k], t);
    for (const k in cur.post) if (p.post[k] === undefined) delete cur.post[k];
  }

  /** the zone containing (x,y,z): the last added wins; null outdoors */
  function at(x, y, z) {
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i]; if (q.enabled === false) continue;
      const b = q.box;
      if (b ? (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && z >= b.z0 && z <= b.z1) : q.test(x, y, z)) return q;
    }
    return null;
  }

  function add(def) {
    if (!def || (!def.box && !def.test)) throw new Error('zones.add: box or test is required');
    const q = { id: def.id ?? 'zone' + list.length, box: def.box || null, test: def.test || null, def, p: norm(def.indoor), enabled: true,
      showUnder: def.showUnder ?? def.indoor?.showUnder ?? (def.box ? def.box.y0 < 0 : false), underground: def.underground ?? (def.box ? def.box.y1 <= 0.5 : false),
      remove() { const i = list.indexOf(q); if (i >= 0) list.splice(i, 1); } };
    const old = list.findIndex((o) => o.id === q.id); if (old >= 0) list.splice(old, 1);
    list.push(q);
    return q;
  }

  // ------------------------------------------------------------------ visibility registry
  const reg = { under: [], surf: [], units: [] };
  // a hidden subtree does not need its matrices composed every frame (the metro platforms and trains are ~1 200 objects): they are frozen while hidden and thawed when shown
  const freeze = (n, on, kind) => (!on || (config.freezeHidden && config.freezeKinds.includes(kind))) && n.traverse((o) => { const d = o.userData; if (on) { if (o.matrixAutoUpdate) { d._zmau = true; o.matrixAutoUpdate = false; } } else if (d._zmau) { d._zmau = false; o.matrixAutoUpdate = true; } });
  const mark = (n, hidden, kind = 'u') => {
    const u = n.userData;
    if (hidden) { if (!u._zh) { u._zv = n.visible; u._zh = true; freeze(n, true, kind); } n.visible = false; }
    else if (u._zh) { n.visible = u._zv; u._zh = false; freeze(n, false); }
  };
  function keepsUnder(n) {          // the subtree contains a node that must stay drawn underground
    let k = false; n.traverse((o) => { if (o.userData.undergroundOnly || o.userData.alwaysVisible) k = true; }); return k;
  }
  function refresh() {
    // show everything that is hidden, collect again, re-apply
    for (const n of [...reg.under, ...reg.surf, ...reg.units]) mark(n, false);
    reg.under.length = reg.surf.length = reg.units.length = 0;
    const walk = (n) => {
      const u = n.userData;
      if (u.undergroundOnly) { reg.under.push(n); return; }
      if (u.surfaceOnly) { reg.surf.push(n); return; }
      if (u.alwaysVisible) return;
      for (const c of n.children) walk(c);
    };
    const roots = [staticRoot, dynamicRoot].filter(Boolean);
    for (const r of roots) walk(r);
    const tagged = new Set([...reg.under, ...reg.surf]);
    const units = [];
    for (const r of roots) for (const c of r.children) { if (r === staticRoot && (c.name === 'static-batched' || c.name === 'static-nd')) units.push(...c.children); else units.push(c); }
    for (const c of scene.children) if (c !== staticRoot && c !== dynamicRoot && c !== sky.mesh && !c.isLight && c.visible) units.push(c);
    for (const n of units) if (!tagged.has(n) && !keepsUnder(n) && !n.userData.alwaysVisible) reg.units.push(n);
    underOn = deepOn = null; applyVisibility(true);
  }
  /** registers the tagged nodes of a subtree attached after the build (a streamed region) and applies the current visibility to them: unlike refresh() it does not walk the
   *  whole static scene (~40 000 objects) nor re-mark every registered node, which cost a hitch per region while driving */
  function attach(group) {
    let n = 0;
    const walk = (node) => {
      const u = node.userData;
      if (u.undergroundOnly) { reg.under.push(node); mark(node, !underOn, 'u'); n++; return; }
      if (u.surfaceOnly) { reg.surf.push(node); mark(node, !!deepOn, 's'); n++; return; }
      if (u.alwaysVisible) return;
      for (const c of node.children) walk(c);
    };
    walk(group);
    return n;
  }
  function track(obj, kind = 'under') {
    obj.userData[kind === 'surface' ? 'surfaceOnly' : kind === 'always' ? 'alwaysVisible' : 'undergroundOnly'] = true;
    if (kind === 'under') { reg.under.push(obj); mark(obj, !underOn); }
    else if (kind === 'surface') { reg.surf.push(obj); mark(obj, !!deepOn); }
    return obj;
  }
  function applyVisibility(force) {
    const p = camera.position;
    const wantUnder = underOn ? (p.y < config.undergroundY + 0.5 || !!(zone && zone.showUnder)) : (p.y < config.undergroundY || !!(zone && zone.showUnder));
    const wantDeep = deepOn ? p.y < config.deepY + 3 : p.y < config.deepY;
    if (!force && wantUnder === underOn && wantDeep === deepOn) return;
    underOn = wantUnder; deepOn = wantDeep;
    for (const n of reg.under) mark(n, !underOn, 'u');
    for (const n of reg.surf) mark(n, deepOn, 's');
    if (config.autoSurface) for (const n of reg.units) mark(n, deepOn, 'n');
  }

  // ------------------------------------------------------------------ per-frame
  function update(dt) {
    const p = camera.position;
    let z = at(p.x, p.y, p.z);
    if (!z && config.autoUnderground && heightAt && p.y < heightAt(p.x, p.z) - 0.6) z = autoZone;
    const target = z ? 1 : 0;
    if (z) {
      if (amount <= 0.0005 || dt <= 0) setCur(z.p, 1);                  // coming in from outdoors (or a snapped frame): the fade-in is the amount
      else setCur(z.p, 1 - Math.exp(-dt / 0.12));                       // between two zones: the parameters glide
    }
    zone = z;
    if (dt <= 0) amount = target;
    else { const r = dt / config.blendSeconds; amount += Math.max(-r, Math.min(r, target - amount)); }
    if (amount < 0.0005 && target === 0) amount = 0;
    state.amount = amount; state.zone = z ? z.def : null; state.zoneObj = z;
    shared.uIndoor.value = amount;
    // camera far plane: the zone's, once it is mostly in force
    const wantFar = amount > 0.5 && cur.far ? cur.far : baseFar;
    if (camera.far !== wantFar) { camera.far = wantFar; camera.updateProjectionMatrix(); }
    applyVisibility(false);
  }

  /** called at the end of timeofday.apply(): blend the zone over the fresh preset values */
  function apply() {
    appliedAmount = amount;
    const a = amount, sunL = sky.sun, hemi = sky.hemi, u = sky.uniforms, c = pipeline.compMat.uniforms;
    if (a <= 0) {
      sky.mesh.visible = true; u.uIndoorAmt.value = 0; sky.indoorW = 0; pipeline.bg.copy(DEFAULT_BG); pipeline.skipShadows = false;
      return;
    }
    const skyA = a * (1 - cur.skyKeep);
    // sun / key lamp
    if (hasKey()) {
      const w = a * cur.keyOn;
      sunL.color.lerp(cur.keyColor, w); sunL.intensity = lerp(sunL.intensity * lerp(1, cur.sun, a), cur.keyI, w);
      sky.indoorDir.copy(cur.keyDir); sky.indoorW = w;
    } else { sunL.intensity *= lerp(1, cur.sun, a); sky.indoorW = 0; }
    // ambient
    hemi.color.lerp(cur.ambColor, a); hemi.groundColor.lerp(cur.ambGround, a); hemi.intensity = lerp(hemi.intensity, cur.ambI, a);
    // fog
    scene.fog.color.lerp(cur.fogColor, a); scene.fog.density = lerp(scene.fog.density, cur.fogD, a);
    // sky -> plain background
    u.uIndoorBg.value.copy(cur.bg); u.uIndoorAmt.value = skyA; sky.mesh.visible = !(skyA >= 0.999);
    pipeline.bg.copy(DEFAULT_BG).lerp(cur.bg, skyA);
    // grading
    const P = cur.post;
    if (P.exposure !== undefined) c.uExposure.value = lerp(c.uExposure.value, P.exposure, a);
    if (P.bloom !== undefined) c.uBloom.value = lerp(c.uBloom.value, P.bloom, a);
    if (P.glow !== undefined) c.uGlow.value = lerp(c.uGlow.value, P.glow, a);
    if (P.vignette !== undefined) c.uVignette.value = lerp(c.uVignette.value, P.vignette, a);
    if (P.threshold !== undefined && pipeline.brightMat) pipeline.brightMat.uniforms.uThreshold.value = lerp(pipeline.brightMat.uniforms.uThreshold.value, P.threshold, a);
    pipeline.leakScale *= 1 - a;
    pipeline.skipShadows = a >= 0.999 && !cur.shadows;
  }

  return {
    add, at, update, refresh, attach, track, config, list: () => list.slice(), get: (id) => list.find((q) => q.id === id) || null,
    remove(idOrZone) { const q = typeof idOrZone === 'object' ? idOrZone : list.find((z) => z.id === idOrZone); if (q) q.remove(); return !!q; },
    overlay: { apply, get active() { return amount > 0 || appliedAmount > 0; } },
    get amount() { return amount; }, get current() { return zone; },
    /** { under: undergroundOnly meshes drawn, deep: surface hidden } and the registry sizes (tools / tests) */
    get visibility() { return { under: underOn, deep: deepOn, undergroundNodes: reg.under.length, surfaceNodes: reg.surf.length, autoUnits: reg.units.length }; },
  };
}
