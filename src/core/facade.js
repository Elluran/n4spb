// Curtain-wall shader for skyscrapers (cel-shaded glass grid), used through ctx.mat.facade(opts).
//
// The geometry supplies uv = (bay index along the wall, floor index) in *cell space* (see world/lib/massing.js):
// the shader draws one window bay per unit cell, so any wall length / tower height gets crisp mullions with no
// texture resolution limit and no seams. The look: sky + ground reflection in a few painted bands, world-anchored
// diagonal highlight streaks, per-window variation (blinds, interior lights), sun glints that bloom, a height
// gradient, spandrel + mechanical-floor bands, cel-lit frames, fog.
//
//   ctx.mat.facade({ glass:'#3d6478', glassLit:'#9fc6dc', frame:'#b8c2c9', spandrel:'#56656f',
//                    bay:1.5, floor:3.9, mullion:0.09, transom:0.12, spandrelH:0.9,
//                    reflect:0.55, lit:0.06, blinds:0.10, mech:{every:0,h:0}, streak:1, sparkle:1,
//                    grad:{bottom:0.72, top:1.12, height:320}, side:'front'|'double', name })
// bay/floor are the metres per cell that the geometry's uv were built with (they only set frame thicknesses).
import * as THREE from 'three';

export function createFacadeFactory(shared, palette) {
  const cache = new Map();
  const C = (c) => new THREE.Color(c);
  if (!shared.uNight) shared.uNight = { value: 0 };
  const sky = { low: shared.uSkyLow, mid: shared.uSkyMid, top: shared.uSkyTop };

  return function facade(o = {}) {
    const key = JSON.stringify(o);
    if (cache.has(key)) return cache.get(key);
    const bay = o.bay ?? 1.5, floor = o.floor ?? 3.9;
    const mech = o.mech || { every: 0, h: 0 };
    const grad = o.grad || { bottom: 0.72, top: 1.12, height: 320 };
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uGlass: { value: C(o.glass || '#3f6a80') },
      uGlassLit: { value: C(o.glassLit || '#a9cde0') },
      uFrame: { value: C(o.frame || '#b7c1c8') },
      uSpan: { value: C(o.spandrel || '#56656f') },
      uWarm: { value: C(o.warm || '#ffd79a') },
      uSkyLow: { value: C(palette.skyHorizon) }, uSkyMid: { value: C(palette.skyMid) }, uSkyTop: { value: C(o.skyTop || palette.skyTop) },
      uGround: { value: C(o.ground || '#6d7378') },
      uCell: { value: new THREE.Vector2(bay, floor) },
      uMull: { value: new THREE.Vector2(o.mullion ?? 0.09, o.transom ?? 0.12) },
      uSpanH: { value: o.spandrelH ?? 0.9 },
      uReflect: { value: o.reflect ?? 0.55 },
      uLitFrac: { value: o.lit ?? 0.06 },
      uBlinds: { value: o.blinds ?? 0.06 },
      uMech: { value: new THREE.Vector3(mech.every || 0, mech.h || 0, mech.offset || 0) },
      uStreak: { value: o.streak ?? 1 },
      uSparkle: { value: o.sparkle ?? 1 },
      uGrad: { value: new THREE.Vector3(grad.bottom, grad.top, grad.height) },
      uSeed: { value: o.seed ?? 0 },
      uMetal: { value: o.metal ?? 0.0 },          // 0..1: mirror-like (more sky contrast) glass
      uSunWarm: { value: o.sunWarm ?? 1.0 },      // 0..1: how much the sunlit panes are tinted warm (lower keeps blue glass blue)
      uMechC: { value: C(o.mechColor || o.spandrel || '#56656f') },   // colour of the mechanical-floor bands (default: the spandrel colour)
    }]);
    uniforms.uSunDir = shared.uSunDir; uniforms.uNight = shared.uNight; uniforms.uTime = shared.uTime;
    if (sky.low) { uniforms.uSkyLow = sky.low; uniforms.uSkyMid = sky.mid; uniforms.uSkyTop = sky.top; }   // follow the time of day
    const m = new THREE.ShaderMaterial({
      uniforms, fog: true,
      side: o.side === 'double' ? THREE.DoubleSide : THREE.FrontSide,
      vertexShader: /* glsl */`
        #include <common>
        #include <fog_pars_vertex>
        varying vec2 vCell; varying vec3 vW; varying vec3 vN;
        void main(){
          vCell = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vW = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */`
        #include <common>
        #include <fog_pars_fragment>
        uniform vec3 uMechC; uniform float uSunWarm;
        uniform vec3 uGlass, uGlassLit, uFrame, uSpan, uWarm, uSkyLow, uSkyMid, uSkyTop, uGround, uSunDir, uMech, uGrad;
        uniform vec2 uCell, uMull;
        uniform float uSpanH, uReflect, uLitFrac, uBlinds, uStreak, uSparkle, uSeed, uNight, uTime, uMetal;
        varying vec2 vCell; varying vec3 vW; varying vec3 vN;

        float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }

        // painted sky as seen in a mirror: horizon glow, three-step gradient, soft cumulus
        vec3 skyRef(vec3 R, vec3 S){
          float y = R.y;
          vec3 c = mix(uSkyLow, uSkyMid, smoothstep(0.0, 0.32, y));
          c = mix(c, uSkyTop, smoothstep(0.28, 0.9, y));
          float sd = max(dot(R, S), 0.0);
          c = mix(c, vec3(1.0, 0.86, 0.68), pow(sd, 4.0) * 0.6);
          if (y > 0.02) {
            vec2 q = R.xz / (y + 0.35) * 1.6 + vec2(uTime * 0.004, 0.0);
            float cl = smoothstep(0.52, 0.66, fbm(q * 1.3));
            float lit = smoothstep(0.35, 0.6, fbm(q * 1.3 + S.xz * 0.12));
            c = mix(c, mix(vec3(0.83, 0.86, 0.95), vec3(1.0, 0.97, 0.93), lit), cl * 0.85 * smoothstep(0.02, 0.2, y));
          }
          return c;
        }
        // 3-step cel light from the sun
        float cel(float d){ return d < 0.0 ? 0.0 : d < 0.12 ? 0.42 : d < 0.42 ? 0.8 : 1.0; }

        void main(){
          vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW); if (dot(N, V) < 0.0) N = -N;
          vec3 S = normalize(uSunDir);
          vec2 cellId = floor(vCell + 1e-3);
          vec2 f = fract(vCell + 1e-3) - 1e-3;
          float aa = 0.06;
          vec2 fw = fwidth(vCell);

          // ---- layout of one bay: frame / opaque spandrel (bottom) / glass
          float mx = 0.5 * uMull.x / uCell.x;            // half vertical mullion (cell units)
          float tr = uMull.y / uCell.y;                   // transom thickness at the top of the bay
          float sp = clamp(uSpanH / uCell.y, 0.0, 0.9);   // spandrel height
          float dx = min(f.x, 1.0 - f.x);
          float isFrameX = 1.0 - smoothstep(mx, mx + max(fw.x, 0.01), dx);
          float isSpan = 1.0 - smoothstep(sp, sp + max(fw.y, 0.01), f.y);
          float isTrans = smoothstep(1.0 - tr - max(fw.y, 0.01), 1.0 - tr, f.y);
          float isFrame = clamp(max(isFrameX, isTrans), 0.0, 1.0);

          // mechanical floors: solid louvred band
          float mech = 0.0;
          if (uMech.x > 0.5) { float m = mod(cellId.y - uMech.z, uMech.x); mech = step(m, uMech.y - 0.5); }

          // ---- glass: mirror of the painted sky, fresnel + world height gradient
          float rnd = h21(cellId + uSeed);
          float rnd2 = h21(cellId.yx * 1.7 + 3.1 + uSeed);
          vec3 R = reflect(-V, N);
          float ndv = clamp(dot(N, V), 0.0, 1.0);
          float fres = pow(1.0 - ndv, 3.0);
          vec3 sky = skyRef(R, S);
          vec3 gnd = mix(uGround, uSkyLow, 0.25);
          vec3 mir = R.y > 0.0 ? sky : mix(gnd, sky, smoothstep(-0.25, 0.0, R.y));
          // banded (painted) blend so the reflection reads as flat colour steps
          float k = uReflect * (0.35 + 0.65 * fres) * (1.0 + uMetal * 0.6);
          k = floor(k * 5.0 + 0.5) / 5.0;
          vec3 glass = mix(uGlass, mir * uGlassLit / max(0.55, max(uGlassLit.r, max(uGlassLit.g, uGlassLit.b))), clamp(k, 0.0, 0.92));
          glass *= 0.86 + 0.28 * rnd;                                   // window-to-window variation
          // sun-facing panes catch warm light
          float sunf = cel(dot(N, S));
          glass = mix(glass * vec3(0.74, 0.84, 1.0), glass * mix(vec3(1.12, 1.06, 1.0), vec3(1.30, 1.13, 0.90), uSunWarm) + vec3(0.06, 0.035, 0.0) * uSunWarm, sunf);
          // world-anchored diagonal highlight streaks (anime gloss)
          float s = dot(vW, normalize(vec3(0.62, 0.78, 0.62))) * 0.045;
          float band = abs(fract(s) - 0.5);
          float streak = (smoothstep(0.02, 0.0, abs(band - 0.17)) * 0.9 + smoothstep(0.008, 0.0, abs(band - 0.235)) * 0.6) * uStreak * (0.35 + 0.65 * fres + 0.3 * sunf) * (1.0 - 0.9 * uNight);
          glass += vec3(0.95, 0.97, 1.0) * streak * 0.42;
          // sun glint (blooms in the post pass)
          float glint = pow(max(dot(R, S), 0.0), 48.0) * uSparkle;
          glass += vec3(1.0, 0.9, 0.7) * glint * 2.2 * (1.0 - 0.75 * uNight);
          // blinds + interior lights
          float blind = step(rnd2, uBlinds);
          glass = mix(glass, vec3(0.5, 0.55, 0.6) * (0.6 + 0.5 * sunf), blind * 0.55);
          // height gradient (lower floors darker / occluded, crown lighter), and night: unlit glass mirrors a dark sky
          float hg = mix(uGrad.x, uGrad.y, smoothstep(0.0, uGrad.z, vW.y));
          glass *= hg * mix(1.0, 0.2, uNight);
          // interior lights: independent windows by day, whole office bays together at night
          float litR = h21(cellId * 1.3 + 9.7 + uSeed);
          float litSeg = h21(vec2(cellId.y * 3.7 + uSeed, floor(cellId.x / 5.0) * 1.3 + 4.0));
          float lit = step(mix(litR, litSeg * 0.65 + litR * 0.35, uNight), uLitFrac + uNight * 0.36);
          glass = mix(glass, uWarm * (0.72 + 0.3 * uNight), lit * (0.28 + 0.62 * uNight) * (1.0 - blind * 0.5));
          // window head shadow just under each transom
          float head = smoothstep(1.0 - tr - 0.14, 1.0 - tr, f.y) * (1.0 - isFrame);
          glass *= 1.0 - 0.22 * head;

          // ---- opaque parts: cel-lit metal / spandrel
          float L = 0.42 + 0.58 * cel(dot(N, S));
          vec3 amb = vec3(0.86, 0.88, 1.0);
          vec3 frameC = uFrame * mix(amb * 0.62, vec3(1.0), L) * mix(1.0, 0.3, uNight);
          vec3 spanC = uSpan * mix(amb * 0.6, vec3(1.0), L) * (0.94 + 0.12 * rnd) * mix(1.0, 0.3, uNight);
          float louvre = step(0.5, fract(vCell.y * uCell.y / 0.24)); // fine horizontal louvres on mech floors
          vec3 mechC = uMechC * mix(amb * 0.6, vec3(1.0), L) * mix(1.0, 0.3, uNight) * mix(1.0, 0.8, louvre);

          vec3 col = glass;
          col = mix(col, spanC, isSpan);
          col = mix(col, mechC, mech);
          col = mix(col, frameC, isFrame);
          // slim sky-lit top edge on the spandrel (the floor slab)
          col += vec3(0.05) * smoothstep(sp - 0.03, sp, f.y) * (1.0 - smoothstep(sp, sp + 0.06, f.y)) * (1.0 - mech);
          // far away the grid is sub-pixel: blend to the wall's average colour instead of shimmering
          vec3 avg = mix(mix(glass, spanC, sp * 0.6), frameC, 0.14);
          col = mix(col, avg, smoothstep(0.30, 0.85, max(fw.x, fw.y * 0.45)));
          gl_FragColor = vec4(col, 1.0);
          #include <fog_fragment>
        }`,
    });
    m.name = o.name || 'facade';
    m.userData.facade = { bay, floor };
    cache.set(key, m);
    return m;
  };
}
