// Render pipeline (pipeline.bg / pipeline.skipShadows are driven by core/zones.js for indoor zones): normal/depth pre-pass -> MSAA HDR colour pass -> bloom -> composite
// (colour-aware anime outlines, soft glow, grading, light leak, vignette, sRGB).
import * as THREE from 'three';
import { LAYER_NO_OUTLINE } from './materials.js';

// Layers: 0 = default (drawn by the normal / depth pre-pass AND the colour pass), LAYER_NO_OUTLINE (1) = colour pass only, LAYER_ND (2) = merged proxies of the static scene (core/ndproxy.js),
// normal / depth pass only, LAYER_COLOR (3) = static meshes that have such a proxy: colour pass (and sun shadow) only. The sun shadow pass tests the layers of the main camera (three.js),
// so the colour pass must include every layer that holds a shadow caster.
export const LAYER_ND = 2, LAYER_COLOR = 3;
export const MASK_ND = (1 << 0) | (1 << LAYER_ND);
export const MASK_COLOR = (1 << 0) | (1 << LAYER_NO_OUTLINE) | (1 << LAYER_COLOR);
// The outline fades out between 35 and 190 m (the composite shader), so the normal / depth pass only draws what is nearer than ND_FAR.
export const ND_FAR = 200;

// Sun shadow casters: three.js draws every caster with ONE shared depth material, and its program choice is re-evaluated (getProgram: ~0.1 ms) each time consecutive casters
// alternate between an InstancedMesh and a plain Mesh (the lamps, benches and people between the merged cells). Instanced casters without an alpha cut-out get a depth material of
// their own, so the two kinds never share program state (the shadow pass fell from ~19 to a few ms a frame at the start pose).
const depthInst = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), depthInstColor = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
/** Instanced meshes that share a material but differ in having an instance colour attribute flip the program state between consecutive draws (getProgram each time): the ones
 *  without get a white instance colour (the shader multiplies by 1). Returns the number of meshes changed. */
export function unifyInstanceColor(root) {
  const byMat = new Map();
  root.traverse((o) => { if (o.isInstancedMesh && o.material && !Array.isArray(o.material)) { let e = byMat.get(o.material); if (!e) byMat.set(o.material, (e = { with: 0, without: [] })); if (o.instanceColor) e.with++; else e.without.push(o); } });
  let n = 0;
  for (const e of byMat.values()) if (e.with && e.without.length) for (const o of e.without) { const cap = o.instanceMatrix.count; o.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3); if (o.instanceMatrix.usage === THREE.DynamicDrawUsage) o.instanceColor.setUsage(THREE.DynamicDrawUsage); n++; }
  return n;
}
export function assignShadowMaterials(root) {
  let n = 0;
  root.traverse((o) => {
    if (!o.isInstancedMesh || !o.castShadow || o.customDepthMaterial || o.isSkinnedMesh || o.morphTexture) return;
    const m = o.material; if (!m || Array.isArray(m) || (m.map && m.alphaTest > 0) || (m.alphaMap && m.alphaTest > 0) || m.displacementMap) return;
    if (o.geometry.morphAttributes && o.geometry.morphAttributes.position) return;
    o.customDepthMaterial = o.instanceColor ? depthInstColor : depthInst; n++;      // (the instance colour attribute is part of the program state too)
  });
  return n;
}

// Shadow-map traversal needs only sectors intersecting the sun's shadow camera. Camera-visible
// sectors can extend several kilometres; walking all their meshes again wastes CPU even when
// Three.js rejects every draw. This uses the same world bounding spheres as Three.js, no proxy
// geometry, and restores visibility before the already-collected colour render list is drawn.
export function installShadowSectorCulling(renderer, pipeline) {
  const shadows = renderer.shadowMap, original = shadows.render;
  if (typeof original !== 'function') return;
  let bounds = new WeakMap();
  const sphere = new THREE.Sphere(), box = new THREE.Box3(), hidden = [], frusta = [];
  const stats = pipeline.shadowCullStats = { tested: 0, hidden: 0, meshesSkipped: 0 };
  pipeline.refreshShadowSectors = () => { bounds = new WeakMap(); };
  function sectorBounds(group) {
    let entry = bounds.get(group);
    const version = group.userData.lodBoundsVersion || 0;
    if (entry && entry.children === group.children.length && entry.version === version) return entry;
    entry = { children: group.children.length, version, box: new THREE.Box3(), uncullable: false, meshes: 0 };
    group.traverse(o => {
      if (!(o.isMesh || o.isLine || o.isPoints)) return;
      entry.meshes++;
      if (!o.castShadow) return;
      // Custom callbacks may change vertex positions; frustumCulled=false explicitly opts out.
      if (!o.frustumCulled || o.userData.dynamic || (o.isInstancedMesh && o.instanceMatrix.usage !== THREE.StaticDrawUsage) || o.isSkinnedMesh || o.onBeforeShadow !== THREE.Object3D.prototype.onBeforeShadow || o.geometry?.morphAttributes?.position?.length) { entry.uncullable = true; return; }
      let s;
      if (o.boundingSphere !== undefined) {
        if (o.boundingSphere === null) o.computeBoundingSphere();
        s = o.boundingSphere;
      } else {
        if (!o.geometry?.boundingSphere) o.geometry?.computeBoundingSphere();
        s = o.geometry?.boundingSphere;
      }
      if (!s || !Number.isFinite(s.radius)) { entry.uncullable = true; return; }
      sphere.copy(s).applyMatrix4(o.matrixWorld);
      if (!Number.isFinite(sphere.center.x + sphere.center.y + sphere.center.z + sphere.radius)) { entry.uncullable = true; return; }
      sphere.getBoundingBox(box); entry.box.union(box);
    });
    bounds.set(group, entry); return entry;
  }
  shadows.render = function(lights, scene, camera) {
    const root = pipeline.sectorsRoot;
    if (!pipeline.cullShadowSectors || !pipeline.frozenRoot || !root?.visible || !this.enabled || (!this.autoUpdate && !this.needsUpdate) || !lights.length || this.type === THREE.VSMShadowMap) return original.call(this, lights, scene, camera);
    // The city has one directional sun. Multiple directional/spot lights use the union of
    // their frusta; cube shadows retain Three.js' original path (six changing viewports).
    frusta.length = 0;
    for (const light of lights) {
      const shadow = light.shadow;
      if (!shadow || (!shadow.autoUpdate && !shadow.needsUpdate)) continue;
      if (shadow.getViewportCount() !== 1) return original.call(this, lights, scene, camera);
      shadow.camera.updateProjectionMatrix(); shadow.updateMatrices(light);
      frusta.push(shadow.getFrustum());
    }
    stats.tested = stats.hidden = stats.meshesSkipped = 0;
    if (!frusta.length) return original.call(this, lights, scene, camera);
    for (const group of root.children) {
      if (!group.visible) continue;
      const entry = sectorBounds(group); stats.tested++;
      if (entry.uncullable || (!entry.box.isEmpty() && frusta.some(f => f.intersectsBox(entry.box)))) continue;
      group.visible = false; hidden.push(group); stats.hidden++; stats.meshesSkipped += entry.meshes;
    }
    try { return original.call(this, lights, scene, camera); }
    finally { for (const group of hidden) group.visible = true; hidden.length = 0; }
  };
}

const FS_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function fsTriangle() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  return g;
}

export function createRenderPipeline(renderer, quality) {
  const size = new THREE.Vector2();
  const HF = THREE.HalfFloatType;
  const rtColor = new THREE.WebGLRenderTarget(4, 4, { type: HF, samples: quality.msaa ?? 4 });
  const rtND = new THREE.WebGLRenderTarget(4, 4, { type: HF, samples: 0, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const rtB1 = new THREE.WebGLRenderTarget(4, 4, { type: HF });
  const rtB2 = new THREE.WebGLRenderTarget(4, 4, { type: HF });
  const rtB3 = new THREE.WebGLRenderTarget(4, 4, { type: HF });
  const rtB4 = new THREE.WebGLRenderTarget(4, 4, { type: HF });
  // ambient occlusion: half resolution, R = visibility (1 = open), G = linear depth (m) for the depth-aware blur / upsample
  const aoOpts = { type: HF, format: THREE.RGFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false };
  const rtAO = new THREE.WebGLRenderTarget(4, 4, aoOpts), rtAO2 = new THREE.WebGLRenderTarget(4, 4, aoOpts);

  // normal + linear depth override material (handles instancing & skinning through chunks)
  const ndMat = new THREE.ShaderMaterial({
    uniforms: { uFar: { value: 2000 } },
    vertexShader: /* glsl */`
      #include <common>
      #include <batching_pars_vertex>
      #include <skinning_pars_vertex>
      varying vec3 vN; varying float vD;
      void main(){
        #include <batching_vertex>
        #include <beginnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        #include <project_vertex>
        vN = normalize(transformedNormal); vD = -mvPosition.z;
      }`,
    fragmentShader: /* glsl */`
      uniform float uFar; varying vec3 vN; varying float vD;
      void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*0.5+0.5, vD/uFar); }`,
    side: THREE.DoubleSide,
  });

  // The layer-0 objects that are not proxied (dynamic: people, cars, trains, birds; static: the cone-culled trees, meshes with material arrays) are drawn into the normal / depth
  // target with a VARIANT of ndMat per program state (plain / instanced / instanced + colour / morphs) swapped in for the pass instead of scene.overrideMaterial: with one override
  // material three.js re-evaluates the program (getProgram, ~0.1 ms) every time consecutive objects differ in instancing. The static list is collected after the build (main.js:
  // pipeline.refreshND), the dynamic roots are re-walked every 30 frames (they are small).
  const ndVariants = new Map([['M', ndMat]]);
  const ndMatFor = (o) => {
    const k = (o.isBatchedMesh ? (o._colorsTexture ? 'Bc' : 'B') : o.isInstancedMesh ? (o.instanceColor ? 'Ic' : 'I') : 'M') + (o.morphTexture ? 'm' : '') + (o.isSkinnedMesh ? 's' : '');
    let m = ndVariants.get(k); if (!m) { m = ndMat.clone(); ndVariants.set(k, m); }
    return m;
  };
  const ndStatic = [], ndDynamic = []; let ndFrame = 0;
  const collectND = (root, list) => { root.traverse((o) => { if (o.isMesh && (o.layers.mask & 1) && !o.userData.ndProxy) list.push(o); }); };
  const ndSwap = (list) => { for (const o of list) { if (o.__ndSaved !== undefined) continue; o.__ndSaved = o.material; o.material = ndMatFor(o); } };
  const ndRestore = (list) => { for (const o of list) { if (o.__ndSaved === undefined) continue; o.material = o.__ndSaved; o.__ndSaved = undefined; } };

  const quad = new THREE.Mesh(fsTriangle());
  quad.frustumCulled = false;
  const qScene = new THREE.Scene(); qScene.add(quad);
  const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const brightMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uThreshold: { value: 1.05 }, uKnee: { value: 0.5 } },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc; uniform float uThreshold; uniform float uKnee; varying vec2 vUv;
      void main(){
        vec3 c = texture2D(tSrc, vUv).rgb;
        float l = max(c.r, max(c.g, c.b));
        float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0*uKnee); soft = soft*soft/(4.0*uKnee+1e-4);
        float w = max(soft, l - uThreshold) / max(l, 1e-4);
        gl_FragColor = vec4(min(c * w, vec3(8.0)), 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        vec3 s = texture2D(tSrc, vUv).rgb * 0.2270270270;
        s += texture2D(tSrc, vUv + uDir*1.3846153846).rgb * 0.3162162162;
        s += texture2D(tSrc, vUv - uDir*1.3846153846).rgb * 0.3162162162;
        s += texture2D(tSrc, vUv + uDir*3.2307692308).rgb * 0.0702702703;
        s += texture2D(tSrc, vUv - uDir*3.2307692308).rgb * 0.0702702703;
        gl_FragColor = vec4(s, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });

  // Ambient occlusion (scalable ambient obscurance, McGuire et al. 2012) from the normal / depth pre-pass: no extra geometry pass, so the cost is fill only (half resolution, quality.ao
  // samples, 0 = off). The outline target holds view-space normals and linear depth up to ndFar: the AO fades out before that cut (uMaxD, compMat.uAOFade: 0.4 - 0.75 x ndFar), the sky / beyond reads as open.
  const aoMat = new THREE.ShaderMaterial({
    defines: { SAMPLES: 8 },
    uniforms: { tND: { value: rtND.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uFar: { value: 2000 }, uTan: { value: new THREE.Vector2(1, 1) }, uProj: { value: 500 },
      uRadius: { value: 1.5 }, uBias: { value: 0.2 }, uIntensity: { value: 10 }, uMaxPx: { value: 90 }, uMaxD: { value: 100 } },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tND; uniform vec2 uRes, uTan; uniform float uFar, uProj, uRadius, uBias, uIntensity, uMaxPx, uMaxD; varying vec2 vUv;
      vec3 viewPos(vec2 uv, float d){ return vec3((uv*2.0-1.0)*uTan*d, -d); }
      void main(){
        vec4 c = texture2D(tND, vUv); float d = c.a * uFar;
        float rPx = uProj * uRadius / max(d, 0.1);      // the world radius in full-resolution pixels
        if (d > uMaxD || rPx < 1.5) { gl_FragColor = vec4(1.0, d, 0.0, 1.0); return; }
        rPx = min(rPx, uMaxPx);
        vec3 P = viewPos(vUv, d), N = normalize(c.rgb*2.0-1.0);
        float spin = 6.2831853 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));      // interleaved gradient noise: a per-pixel rotation the blur removes
        float r2 = uRadius*uRadius, occ = 0.0;
        for (int i = 0; i < SAMPLES; i++) {
          float a = (float(i) + 0.5) / float(SAMPLES), th = a * 43.9822972 + spin;      // 7 turns of a spiral
          vec2 uv = vUv + vec2(cos(th), sin(th)) * (a * rPx) / uRes;
          vec3 v = viewPos(uv, texture2D(tND, uv).a * uFar) - P;
          float vv = dot(v, v);
          occ += max(dot(v, N) * inversesqrt(vv + 1e-4) - uBias, 0.0) * max(1.0 - vv / r2, 0.0);
        }
        gl_FragColor = vec4(max(1.0 - occ * uIntensity / float(SAMPLES), 0.0), d, 0.0, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const aoBlurMat = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
      void main(){
        vec2 c = texture2D(tSrc, vUv).rg; float k = 1.0 / (0.03 * c.g + 0.05), s = c.r, w = 1.0;
        for (int i = -3; i <= 3; i++) {
          if (i == 0) continue;
          vec2 t = texture2D(tSrc, vUv + uDir * float(i)).rg;
          float wi = exp(-0.12 * float(i*i)) * max(1.0 - abs(t.g - c.g) * k, 0.0);
          s += t.r * wi; w += wi;
        }
        gl_FragColor = vec4(s / w, c.g, 0.0, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });

  const compMat = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rtColor.texture }, tND: { value: rtND.texture }, tBloom: { value: rtB2.texture }, tBloom2: { value: rtB4.texture },
      uRes: { value: new THREE.Vector2(1, 1) }, uFar: { value: 2000 }, uPx: { value: 1.0 },
      uOutline: { value: 1.0 }, uLine: { value: new THREE.Color('#2e2740') },
      uBloom: { value: 0.28 }, uGlow: { value: 0.12 }, uExposure: { value: 1.0 },
      uSunScreen: { value: new THREE.Vector3(0.2, 0.9, 0) }, uLeak: { value: 1.0 }, uTime: { value: 0 },
      uVignette: { value: 0.18 }, uSat: { value: 1.06 },      // vignette / saturation: written per time of day by core/timeofday.js (overcast = 0.84: muted, cool)
      tAO: { value: rtAO.texture }, uAORes: { value: new THREE.Vector2(1, 1) }, uAO: { value: 0.9 }, uAOTint: { value: new THREE.Color(0.30, 0.32, 0.46) }, uAOFade: { value: new THREE.Vector2(60, 95) },
    },
    vertexShader: FS_VERT,
    fragmentShader: /* glsl */`
      uniform sampler2D tColor, tND, tBloom, tBloom2, tAO; uniform vec2 uRes, uAORes, uAOFade; uniform float uFar, uPx, uOutline, uBloom, uGlow, uExposure, uLeak, uTime, uVignette, uSat, uAO;
      uniform vec3 uLine, uAOTint; uniform vec3 uSunScreen; varying vec2 vUv;
      vec4 nd(vec2 uv){ return texture2D(tND, uv); }
      float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
      vec3 softClip(vec3 c){ vec3 k = vec3(0.78); vec3 over = max(c - k, 0.0); return min(c, k) + (1.0-k) * (1.0 - exp(-over/(1.0-k))); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      vec3 toSRGB(vec3 c){ c = max(c, 0.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
      void main(){
        vec2 px = uPx / uRes;
        vec3 col = texture2D(tColor, vUv).rgb;
        // ---------- outlines (inverse-depth laplacian + normal discontinuity)
        vec4 c0 = nd(vUv);
        float d0 = c0.a * uFar;
        #ifdef USE_AO
        // ---------- ambient occlusion: the 4 nearest half-resolution texels, bilinear weights x depth similarity (no dark halo across a silhouette); darkens toward a cool shade
        {
          vec2 st = vUv * uAORes - 0.5, f = fract(st), b = (floor(st) + 0.5) / uAORes, o = 1.0 / uAORes;
          vec2 a00 = texture2D(tAO, b).rg, a10 = texture2D(tAO, b + vec2(o.x, 0.0)).rg, a01 = texture2D(tAO, b + vec2(0.0, o.y)).rg, a11 = texture2D(tAO, b + o).rg;
          float k = 1.0 / (0.02 * d0 + 0.03);
          vec4 w = vec4((1.0-f.x)*(1.0-f.y), f.x*(1.0-f.y), (1.0-f.x)*f.y, f.x*f.y) * (vec4(1e-3) + max(vec4(1.0) - abs(vec4(a00.g, a10.g, a01.g, a11.g) - d0) * k, 0.0));
          float vis = dot(w, vec4(a00.r, a10.r, a01.r, a11.r)) / max(w.x + w.y + w.z + w.w, 1e-4);
          float occ = clamp(1.0 - vis, 0.0, 1.0) * uAO * (1.0 - smoothstep(uAOFade.x, uAOFade.y, d0));
          col = mix(col, col * uAOTint, occ);
          #ifdef AO_VIEW
          gl_FragColor = vec4(vec3(1.0 - occ), 1.0); return;      // debug (?aoview=1): the occlusion alone, white = open
          #endif
        }
        #endif
        vec4 cl = nd(vUv - vec2(px.x,0.0)), cr = nd(vUv + vec2(px.x,0.0)), cu = nd(vUv + vec2(0.0,px.y)), cd = nd(vUv - vec2(0.0,px.y));
        float i0 = 1.0/max(d0,0.05);
        float il = 1.0/max(cl.a*uFar,0.05), ir = 1.0/max(cr.a*uFar,0.05), iu = 1.0/max(cu.a*uFar,0.05), idn = 1.0/max(cd.a*uFar,0.05);
        float lapX = abs(il + ir - 2.0*i0) / i0, lapY = abs(iu + idn - 2.0*i0) / i0;
        float dEdge = smoothstep(0.06, 0.18, max(lapX, lapY));
        // silhouette against much farther stuff (one-sided)
        float dmin = min(min(cl.a,cr.a),min(cu.a,cd.a))*uFar;
        dEdge = max(dEdge, smoothstep(0.10, 0.25, (d0 - dmin)/max(dmin,0.05)) );
        vec3 n0 = c0.rgb*2.0-1.0;
        float nEdge = 0.0;
        nEdge = max(nEdge, 1.0 - dot(n0, cl.rgb*2.0-1.0));
        nEdge = max(nEdge, 1.0 - dot(n0, cr.rgb*2.0-1.0));
        nEdge = max(nEdge, 1.0 - dot(n0, cu.rgb*2.0-1.0));
        nEdge = max(nEdge, 1.0 - dot(n0, cd.rgb*2.0-1.0));
        nEdge = smoothstep(0.30, 0.65, nEdge);
        float dNear = min(d0, dmin);
        float fade = 1.0 - smoothstep(35.0, 190.0, dNear);
        float edge = max(dEdge, nEdge * 0.85) * fade * uOutline;
        // colour-aware line: darken & cool the underlying colour rather than paint black
        vec3 lineCol = mix(col * vec3(0.42, 0.38, 0.5), uLine, 0.35);
        col = mix(col, lineCol, edge * 0.82);
        // ---------- bloom & soft glow (anime film diffusion)
        vec3 b1 = texture2D(tBloom, vUv).rgb, b2 = texture2D(tBloom2, vUv).rgb;
        col += b1 * uBloom + b2 * uGlow;
        // ---------- exposure / tone
        col *= uExposure;
        col = softClip(col);
        float L = lum(col);
        // cool the shadows (blue-violet), warm the highlights
        col = mix(col, col * vec3(0.90, 0.93, 1.10), (1.0 - smoothstep(0.08, 0.55, L)) * 0.55);
        col += vec3(0.016, 0.009, -0.008) * smoothstep(0.55, 1.0, L);
        // saturation (per time of day: a gentle lift on sunny days, muted under the Petersburg milk)
        col = mix(vec3(lum(col)), col, uSat);
        // ---------- light leak from the sun side
        vec2 asp = vec2(uRes.x/uRes.y, 1.0);
        vec2 sp = uSunScreen.xy;
        float ds = length((vUv - sp) * asp);
        float leak = exp(-ds*ds*1.8) * 0.10 + exp(-ds*ds*10.0) * 0.09 * uSunScreen.z;
        col += vec3(1.0, 0.86, 0.68) * leak * uLeak * (0.55 + 0.45*uSunScreen.z);
        // ---------- vignette
        vec2 q = (vUv - 0.5) * asp * 0.9;
        col *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));
        vec3 outc = toSRGB(col);
        outc += (hash(vUv * uRes + fract(uTime)) - 0.5) / 255.0;
        gl_FragColor = vec4(outc, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });

  function setSize(w, h, pr) {
    const W = Math.max(4, Math.floor(w * pr)), H = Math.max(4, Math.floor(h * pr));
    size.set(W, H);
    rtColor.setSize(W, H); rtND.setSize(W, H);
    const bw = Math.max(4, W >> 2), bh = Math.max(4, H >> 2);
    rtB1.setSize(bw, bh); rtB2.setSize(bw, bh);
    rtB3.setSize(Math.max(4, W >> 4), Math.max(4, H >> 4)); rtB4.setSize(Math.max(4, W >> 4), Math.max(4, H >> 4));
    compMat.uniforms.uRes.value.set(W, H);
    compMat.uniforms.uPx.value = Math.max(1.0, H / 1100);
    const aw = Math.max(4, W >> 1), ah = Math.max(4, H >> 1);
    rtAO.setSize(aw, ah); rtAO2.setSize(aw, ah);
    aoMat.uniforms.uRes.value.set(W, H); aoMat.uniforms.uMaxPx.value = 0.12 * H; compMat.uniforms.uAORes.value.set(aw, ah);
  }

  /** Ambient occlusion samples per pixel (0 = off: no AO passes, the composite drops its 4 fetches). */
  function setAO(samples) {
    samples = Math.max(0, Math.round(Number(samples) || 0));
    if (samples === pipeline.aoSamples) return;
    pipeline.aoSamples = samples;
    if (samples) { aoMat.defines.SAMPLES = samples; aoMat.needsUpdate = true; compMat.defines.USE_AO = 1; } else delete compMat.defines.USE_AO;
    compMat.needsUpdate = true;
  }

  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qScene, qCam); }

  // Layers reject a mesh's draw but still walk every descendant. The two static sector trees are separate so a pass can skip the other tree in one visibility check.
  function renderWithoutSectors(scene, camera, hideColour, hideND) {
    const colour = hideColour && pipeline.sectorsRoot, nd = hideND && pipeline.ndSectorsRoot;
    const colourVisible = colour && colour.visible, ndVisible = nd && nd.visible;
    if (colour) colour.visible = false; if (nd) nd.visible = false;
    try { renderer.render(scene, camera); }
    finally { if (colour) colour.visible = colourVisible; if (nd) nd.visible = ndVisible; }
  }

  const _v = new THREE.Vector3();
  const clearND = new THREE.Color(0.5, 0.5, 1.0);
  function render(scene, camera, sunDir, t) {
    // the frozen static root (main.js) is never walked: three.js would visit its ~2 700 objects in every render() call (twice a frame); the other scene children are updated here once
    // instanced meshes with no instance (people part variants nobody wears here, species out of range ...) cost a full draw call each: hidden while empty (only if this loop hid them)
    for (const m of pipeline.emptyCull) {
      const u = m.userData;
      if (m.count === 0) { if (m.visible && !u._zh) { m.visible = false; u._ec = true; } }
      else if (u._ec) { u._ec = false; if (!u._zh) m.visible = true; }
    }
    if (pipeline.frozenRoot) { scene.matrixWorldAutoUpdate = false; for (const c of scene.children) if (c !== pipeline.frozenRoot) c.updateMatrixWorld(); if (camera.parent === null) camera.updateMatrixWorld(); }
    // 1. normal + depth pre-pass (outline source): first the static proxies (LAYER_ND, they carry ndMat as their own material: no override, no program flips), then layer 0 (the dynamic
    //    objects) with ndMat as the override material
    const farFull = camera.far;
    ndMat.uniforms.uFar.value = farFull; compMat.uniforms.uFar.value = farFull;
    const bg = scene.background, fog = scene.fog;
    scene.background = null; scene.fog = null;
    renderer.shadowMap.autoUpdate = false;
    if (farFull > pipeline.ndFar) { camera.far = pipeline.ndFar; camera.updateProjectionMatrix(); }
    renderer.setRenderTarget(rtND);
    renderer.setClearColor(clearND, 1.0);
    renderer.clear();
    renderer.autoClear = false;
    // the lights must be collected by the proxies-only render too: three.js hashes the light set per render, and a render without the sun bumps the lights state version, which
    // makes EVERY material re-evaluate its program in the next pass (~300 getProgram calls, ~7 ms a frame)
    for (const c of scene.children) if (c.isLight && !c.layers.isEnabled(LAYER_ND)) c.layers.enable(LAYER_ND);
    if (pipeline.ndRoots) {
      if (ndFrame++ % 30 === 0) { ndDynamic.length = 0; for (const r of pipeline.ndRoots) collectND(r, ndDynamic); }
      for (const m of ndVariants.values()) m.uniforms.uFar.value = farFull;
      ndSwap(ndStatic); ndSwap(ndDynamic);
      try {
        // Proxies already use ndMat, and the other meshes have per-state variants of the same shader. One pass draws both without another scene traversal/light setup/sort.
        camera.layers.mask = pipeline.combineND ? MASK_ND : 1 << LAYER_ND;
        renderWithoutSectors(scene, camera, true, false);
        if (!pipeline.combineND) { camera.layers.mask = 1; renderWithoutSectors(scene, camera, true, true); }      // debug A/B: the former two-pass route
      } finally { ndRestore(ndStatic); ndRestore(ndDynamic); }
    } else {
      camera.layers.mask = 1 << LAYER_ND;
      renderWithoutSectors(scene, camera, true, false);
      scene.overrideMaterial = ndMat;
      camera.layers.mask = 1 << 0;
      renderer.render(scene, camera);
      scene.overrideMaterial = null;
    }
    if (camera.far !== farFull) { camera.far = farFull; camera.updateProjectionMatrix(); }
    scene.background = bg; scene.fog = fog;
    // 2. colour pass — layers 0, 1 and LAYER_COLOR (the sun shadow pass inside this render call tests the same mask)
    camera.layers.mask = MASK_COLOR;
    if (!pipeline.skipShadows) renderer.shadowMap.needsUpdate = true;      // underground (core/zones.js): no sun, no shadow pass at all
    renderer.setRenderTarget(rtColor);
    renderer.setClearColor(pipeline.bg, 1.0);
    renderer.clear();
    renderWithoutSectors(scene, camera, false, true);
    renderer.autoClear = true;
    // 3. ambient occlusion (half resolution) + a depth-aware blur, from the normal / depth target; fades out before the end of that pass (ndFar)
    if (pipeline.aoSamples) {
      const u = aoMat.uniforms, ty = Math.tan(THREE.MathUtils.DEG2RAD * 0.5 * camera.fov) / camera.zoom, fadeEnd = 0.75 * pipeline.ndFar;
      u.uFar.value = farFull; u.uTan.value.set(ty * camera.aspect, ty); u.uProj.value = size.y / (2 * ty); u.uMaxD.value = fadeEnd;
      compMat.uniforms.uAOFade.value.set(0.4 * pipeline.ndFar, fadeEnd);
      pass(aoMat, rtAO);
      aoBlurMat.uniforms.tSrc.value = rtAO.texture; aoBlurMat.uniforms.uDir.value.set(1 / rtAO.width, 0); pass(aoBlurMat, rtAO2);
      aoBlurMat.uniforms.tSrc.value = rtAO2.texture; aoBlurMat.uniforms.uDir.value.set(0, 1 / rtAO.height); pass(aoBlurMat, rtAO);
    }
    // 4. bloom chain
    brightMat.uniforms.tSrc.value = rtColor.texture; pass(brightMat, rtB1);
    blurMat.uniforms.tSrc.value = rtB1.texture; blurMat.uniforms.uDir.value.set(1 / rtB1.width, 0); pass(blurMat, rtB2);
    blurMat.uniforms.tSrc.value = rtB2.texture; blurMat.uniforms.uDir.value.set(0, 1 / rtB1.height); pass(blurMat, rtB1);
    blurMat.uniforms.tSrc.value = rtB1.texture; blurMat.uniforms.uDir.value.set(1.5 / rtB1.width, 0); pass(blurMat, rtB2);
    // wide glow from the (already blurred) bloom at 1/16
    blurMat.uniforms.tSrc.value = rtB2.texture; blurMat.uniforms.uDir.value.set(1 / rtB3.width, 0); pass(blurMat, rtB3);
    blurMat.uniforms.tSrc.value = rtB3.texture; blurMat.uniforms.uDir.value.set(0, 1 / rtB3.height); pass(blurMat, rtB4);
    blurMat.uniforms.tSrc.value = rtB4.texture; blurMat.uniforms.uDir.value.set(1.6 / rtB3.width, 0); pass(blurMat, rtB3);
    blurMat.uniforms.tSrc.value = rtB3.texture; blurMat.uniforms.uDir.value.set(0, 1.6 / rtB3.height); pass(blurMat, rtB4);
    // 5. composite
    _v.copy(sunDir).multiplyScalar(1000).add(camera.position).project(camera);
    const inFront = _v.z < 1 ? 1 : 0;
    const sx = _v.x * 0.5 + 0.5, sy = _v.y * 0.5 + 0.5;
    const onScreen = inFront * (1 - Math.min(1, Math.max(0, Math.hypot(Math.max(0, Math.abs(sx - 0.5) - 0.5), Math.max(0, Math.abs(sy - 0.5) - 0.5)) * 2.5)));
    // light leak stays near the sun side edge even when the sun is off-screen
    compMat.uniforms.uSunScreen.value.set(inFront ? THREE.MathUtils.clamp(sx, -0.3, 1.3) : (sx < 0.5 ? 1.4 : -0.4), inFront ? THREE.MathUtils.clamp(sy, -0.2, 1.3) : 1.2, onScreen);
    compMat.uniforms.uLeak.value = (inFront ? 1.0 : 0.25) * (pipeline.leakScale ?? 1);
    compMat.uniforms.uTime.value = t;
    compMat.uniforms.tBloom.value = rtB2.texture; compMat.uniforms.tBloom2.value = rtB4.texture;
    pass(compMat, null);
  }

  // bg: clear colour of the colour pass (visible only where no sky dome is drawn: indoor zones); skipShadows: no shadow-map render (sun off underground)
  // aoSamples / setAO(n): ambient occlusion samples (quality.ao; 0 = off); aoMat: its tuning uniforms (uRadius m, uBias), compMat.uAO / uAOTint: its strength and shade colour
  const pipeline = { render, setSize, setAO, aoSamples: 0, aoMat, compMat, ndMat, targets: { rtColor, rtND, rtAO }, size, leakScale: 1, brightMat, bg: new THREE.Color(0xdde9f3), skipShadows: false, ndFar: ND_FAR, frozenRoot: null, emptyCull: [],
    // ndRoots: the dynamic roots whose layer-0 meshes are drawn into the normal / depth target (main.js); refreshND(staticRoot): re-collects the static ones (after the build / a region attach)
    combineND: true, cullShadowSectors: typeof location === 'undefined' || new URLSearchParams(location.search).get('shadowsectors') !== '0', sectorsRoot: null, ndSectorsRoot: null, ndRoots: null, addND(group) { const n = ndStatic.length; collectND(group, ndStatic); return ndStatic.length - n; },      // a subtree attached later (a streamed region)
    refreshND(staticRoot) { pipeline.refreshShadowSectors?.(); ndStatic.length = 0; collectND(staticRoot, ndStatic); for (const c of staticRoot.parent ? staticRoot.parent.children : []) if (c !== staticRoot && !(pipeline.ndRoots || []).includes(c) && c.isMesh && (c.layers.mask & 1)) ndStatic.push(c); return ndStatic.length; } };
  installShadowSectorCulling(renderer, pipeline);
  setAO(quality.ao ?? 8);
  return pipeline;
}
