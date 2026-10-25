// The context object handed to every world module's build(ctx).
// Underground additions (docs/UNDERGROUND.md): ctx.zones (indoor zones, core/zones.js), ctx.indoor {amount, zone}, ctx.shared.uIndoor, ctx.interact (prompts,
// core/interact.js), ctx.ui (panel / toast, core/ui.js) and the visibility taggers ctx.underground / ctx.surfaceOnly / ctx.alwaysVisible. main.js fills the objects
// that need the renderer, the player or the DOM; physics.addEscalator / addConveyor / addHole and player.board / alight are on ctx.physics and ctx.playerObj.
import * as THREE from 'three';
import * as L from '../world/layout.js';
import { createMaterials, LAYER_NO_OUTLINE, PALETTE } from './materials.js';
import { createTextures } from './textures.js';
import * as geo from './geo.js';
import { Physics } from './physics.js';

export function mulberry32(seed) {
  let a = (typeof seed === 'string' ? [...seed].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619)) >>> 0, 2166136261) : seed) >>> 0;
  const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  return r;
}

export function createContext({ scene, camera, renderer = null, audio, quality, sunDir }) {
  const staticRoot = new THREE.Group(); staticRoot.name = 'static';
  const dynamicRoot = new THREE.Group(); dynamicRoot.name = 'dynamic';
  scene.add(staticRoot); scene.add(dynamicRoot);
  const updates = [];
  const shared = {
    uTime: { value: 0 },
    uWind: { value: new THREE.Vector2(0.9, 0.35) },   // wind direction * strength (m/s-ish), blows roughly +X
    uSunDir: { value: sunDir.clone() },
    uGust: { value: 0.5 },                               // 0..1 slowly varying gust strength (core animates it)
    // time of day (core/timeofday.js animates these): 0 = golden hour, 1 = night. Custom shaders (facade, water, glass) read them.
    uNight: { value: 0 },
    uSkyLow: { value: new THREE.Color('#e6e2e4') },      // horizon colour of the painted sky (as reflected in glass / water)
    uSkyMid: { value: new THREE.Color('#86b4e6') },
    uSkyTop: { value: new THREE.Color('#3f7fd2') },
    uIndoor: { value: 0 },                               // 0 outdoors .. 1 inside an indoor zone (core/zones.js): custom shaders may read it
  };
  const mat = createMaterials(shared);
  const tex = createTextures();
  const wires = geo.createWireSystem();
  const physics = new Physics(L.heightAt, L.waterLevelAt);

  const ctx = {
    THREE, scene, camera, renderer, audio, quality,
    L, layout: L,
    mat, tex, geo, wires, physics, palette: PALETTE,
    shared, sunDir,
    services: {},
    staticRoot, dynamicRoot,
    LAYER_NO_OUTLINE,
    time: 0,
    indoor: { amount: 0, zone: null },                  // live: the indoor zone the camera is in (core/zones.js)
    zones: null, interact: null, ui: null,              // set by main.js
    player: { position: new THREE.Vector3() },   // feet position, updated every frame
    /** Add static scenery (will be merged by material after all modules are built). */
    addStatic(obj) { staticRoot.add(obj); return obj; },
    /** Add animated / interactive objects (never merged). */
    add(obj) { obj.traverse((o) => { o.userData.dynamic = true; }); dynamicRoot.add(obj); return obj; },
    /** Register fn(dt, t) called every frame (t = seconds since start, deterministic in shot mode). */
    onUpdate(fn) { updates.push(fn); },
    /** Exclude from the outline pass (alpha cut-outs, particles, shader-animated meshes). */
    noOutline(obj) { obj.traverse((o) => o.layers.set(LAYER_NO_OUTLINE)); return obj; },
    /** A soft transparent veil (smoke, sparks) drawn OVER the outlines: noOutline, and its blending also lowers the colour target's alpha by its coverage, which the composite reads
     *  to fade the outlines of whatever lies behind it (core/renderer.js). Without it the lines, found by the normal / depth pass that never sees the veil, are painted over it. */
    overOutline(obj) {
      obj.traverse((o) => {
        o.layers.set(LAYER_NO_OUTLINE);
        for (const m of o.material ? [].concat(o.material) : []) {
          const additive = m.blending === THREE.AdditiveBlending;
          Object.assign(m, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
            blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
        }
      });
      return obj;
    },
    /** Underground-only: drawn only while the camera is below y = -2 m (or inside a zone with showUnder). Also keeps the object in underground batches. */
    underground(obj) { obj.userData.undergroundOnly = true; return obj; },
    /** Surface-only: not drawn while the camera is deeper than -20 m (the whole street is hidden from the metro). */
    surfaceOnly(obj) { obj.userData.surfaceOnly = true; return obj; },
    /** Never hidden by the zone visibility switch. */
    alwaysVisible(obj) { obj.userData.alwaysVisible = true; return obj; },
    /** Exclude from static merging (keep separate). */
    noBatch(obj) { obj.traverse((o) => { o.userData.noBatch = true; }); return obj; },
    rng: mulberry32,
    kit: (parent) => geo.makeKit(parent),
    _updates: updates,
  };
  return ctx;
}
