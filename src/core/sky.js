// Saint Petersburg sky dome (indoor zones, core/zones.js: uIndoorAmt / uIndoorBg replace the sky by a plain colour; indoorDir re-aims the directional light): a painted blue gradient with a pale hazy horizon, the sun (disc, aureole, a warm band
// and a tighter glow core toward its azimuth even when it is below the horizon: the white night), curled cirrus wisps, flat-based cumulus (a cel-shaded
// height field marched through a thin layer), a milky stratus veil with soft patches for the overcast days, a pink anti-solar band at dusk, a few stars and a moon if a preset asks for them.
// Plus the sun / hemisphere lights and the exponential fog (docs/LOOK.md explains the numbers; core/timeofday.js animates all of it).
//
// Every look parameter is a uniform written by timeofday.js (colours, cloud amounts, star / moon / disc visibility, overcast),
// so another season or weather (winter ice fog, smoke, rain) is only a different preset table, not a different shader.
// `uSun` is the TRUE direction of the sun (it goes below the horizon on a white night); the directional light uses the preset's own `dir`.
import * as THREE from 'three';
import { LAYER_NO_OUTLINE } from './materials.js';

export const FOG_COLOR = new THREE.Color('#b0cae6');

/** Direction of the (fixed) moon: low in the SSE, 14 degrees up (the July moon is low at 60 N). No preset shows it by default (uMoon 0). */
export const MOON_DIR = new THREE.Vector3(0.332, 0.242, 0.912).normalize();

export function createSky(scene, sunDir, quality) {
  const C = (h) => new THREE.Color(h);
  const uniforms = {
    uSun: { value: sunDir.clone() },
    uTime: { value: 0 },
    uZenith: { value: C('#2c6cc4') },
    uMid: { value: C('#5a92d4') },
    uHorizon: { value: C('#b0cae6') },
    uWarm: { value: C('#fff0d0') },          // colour of the horizon band toward the sun and of its aureole
    uFog: { value: FOG_COLOR.clone() },
    uNight: { value: 0 },                   // 0 = day ... 1 = night (kept for the shared contract: darkens the far side of the horizon, a trace of lamp haze)
    uCloudLit: { value: C('#fffaf0') },
    uCloudShade: { value: C('#d6deee') },
    uCloudBase: { value: C('#b0bfd9') },
    uCloudGlow: { value: C('#ffd9a8') },
    uAnti: { value: C('#e8a0b8') },
    uOverCol: { value: C('#b9c0cf') },
    uMoonDir: { value: MOON_DIR.clone() },
    uDisc: { value: 1 },                    // sun disc visibility
    uGlowAmt: { value: 0.3 },               // strength of the warm horizon band toward the sun azimuth
    uHaze: { value: 0.45 },                 // pale low haze band
    uCumulus: { value: 0.5 },               // 0..1 cumulus coverage
    uCirrus: { value: 0.5 },                // 0..1 cirrus coverage
    uOvercast: { value: 0 },                // 0..1 stratus veil (rain / smoke / winter variants)
    uStars: { value: 0 },
    uMoon: { value: 0 },
    uAntiAmt: { value: 0 },
    uIndoorBg: { value: C('#b9a98f') },    // plain background colour that replaces the sky inside an indoor zone (core/zones.js)
    uIndoorAmt: { value: 0 },              // 0 outdoors .. 1 fully indoors (the sky dome is also hidden at 1)
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun, uZenith, uMid, uHorizon, uWarm, uFog, uCloudLit, uCloudShade, uCloudBase, uCloudGlow, uAnti, uOverCol, uMoonDir;
      uniform float uTime, uNight, uDisc, uGlowAmt, uHaze, uCumulus, uCirrus, uOvercast, uStars, uMoon, uAntiAmt, uIndoorAmt;
      uniform vec3 uIndoorBg;
      varying vec3 vDir;
      float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
      float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
      const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);
      float fbm3(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<3;i++){ s += a*vn(p); p = ROT*p; a*=0.5; } return s / 0.875; }
      float fbm4(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<4;i++){ s += a*vn(p); p = ROT*p; a*=0.5; } return s / 0.9375; }
      const vec2 WIND = vec2(0.93, 0.36);
      const float CPAR = 0.42;                 // how much the footprint grows from the cloud base to the tops (less = less sideways shear of the stack)
      const float CSC = 1.35;                  // cumulus footprint frequency (bigger = smaller clouds): Petersburg fair-weather cumulus are big and puffy

      // cloud field above a footprint point: inside the cloud where cumF > y^2 / 3 (a rounded dome with a flat base at y = 0)
      float cumF(vec2 p, float thr){ return fbm4(p) - thr; }

      void main(){
        vec3 d = normalize(vDir);
        float h = d.y, hp = max(h, 0.0);
        vec3 S = normalize(uSun);
        float sd = dot(d, S);
        vec2 dh = normalize(d.xz + vec2(1e-5)), sh = normalize(S.xz + vec2(1e-5));
        float az = max(dot(dh, sh), 0.0);                       // 1 toward the azimuth of the sun
        float low = 1.0 - smoothstep(0.0, 0.40, hp);

        // ---- gradient: deep continental blue overhead, paler and hazier toward a dead flat horizon
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.24, hp));
        col = mix(col, uZenith, smoothstep(0.12, 0.92, hp));
        col = mix(col, uHorizon, uHaze * exp(-hp * 11.0));
        col *= 1.0 - 0.30 * uNight * (1.0 - az) * low;          // at night the horizon away from the sun is darker
        // warm band toward the sun azimuth (stays when the sun is below the horizon: the pale cream-rose glow of the white night) + a tighter, lower core of it
        float core = 1.0 - smoothstep(0.0, 0.22, hp);
        col = mix(col, uWarm, clamp(pow(az, 3.0) * low * 0.75 + pow(az, 14.0) * core * 0.9, 0.0, 1.0) * uGlowAmt);
        col += uWarm * (1.0 - smoothstep(0.0, 0.3, hp)) * uNight * 0.04;     // a trace of street-lamp haze over the city at night
        // pink anti-solar band (the belt of Venus) above the opposite horizon
        float anti = pow(max(-dot(dh, sh), 0.0), 2.0) * smoothstep(0.0, 0.05, hp) * (1.0 - smoothstep(0.08, 0.34, hp));
        col = mix(col, uAnti, anti * uAntiAmt);

        // ---- sun: aureole + disc (the aureole fades out once the sun is below the horizon)
        float up = smoothstep(-0.30, 0.0, S.y);
        vec3 aur = mix(uWarm, vec3(1.0), 0.45);
        col += aur * (pow(max(sd, 0.0), 22.0) * 0.16 + pow(max(sd, 0.0), 120.0) * 0.30) * up;
        vec3 discCol = mix(vec3(1.0, 0.97, 0.90), uWarm * 1.5, 0.5) * 2.3;
        col += discCol * smoothstep(0.99962, 0.99978, sd) * uDisc;

        // ---- moon (white night only): a pale gibbous disc, the lit limb facing up and to the right
        if (uMoon > 0.01) {
          vec3 M = normalize(uMoonDir);
          float md = dot(d, M);
          vec3 t1 = normalize(cross(M, vec3(0.0, 1.0, 0.0))), t2 = cross(t1, M);
          vec2 q = vec2(dot(d, t1), dot(d, t2)) / 0.026;                  // unit = moon radius (1.5 deg)
          float r = length(q);
          float disk = smoothstep(1.0, 0.92, r) * step(0.0, md);
          vec2 ax = normalize(vec2(0.35, 1.0)), pp = vec2(ax.y, -ax.x);
          float lit = smoothstep(-0.06, 0.06, dot(q, ax) + 0.38 * sqrt(max(1.0 - dot(q, pp) * dot(q, pp), 0.0)));
          vec3 moonCol = vec3(0.93, 0.95, 1.0) * (0.16 + 0.84 * lit) * (0.86 + 0.14 * vn(q * 2.6 + 4.0));
          col += moonCol * disk * 1.35 * uMoon;
          col += vec3(0.60, 0.70, 1.0) * (pow(max(md, 0.0), 90.0) * 0.18 + pow(max(md, 0.0), 700.0) * 0.30) * uMoon;
        }

        // ---- thin cirrus: fine short wisps, high up
        if (h > 0.0 && uCirrus > 0.01) {
          vec2 cp = d.xz / (h + 0.18) * 0.9;
          cp = vec2(dot(cp, WIND), dot(cp, vec2(-WIND.y, WIND.x)));
          cp.x += uTime * 0.0012;
          cp += (vec2(fbm3(cp * 0.7 + 3.1), fbm3(cp * 0.7 + 8.7)) - 0.5) * 1.1;         // curl the wisps: no parallel speed lines
          float st = fbm3(vec2(cp.x * 1.2, cp.y * 2.6) + 5.0) * 0.75 + fbm3(vec2(cp.x * 3.4, cp.y * 8.0) + 17.0) * 0.40;
          float cir = smoothstep(0.70 - 0.12 * uCirrus, 0.86 - 0.10 * uCirrus, st);
          cir *= smoothstep(0.40, 0.68, fbm3(cp * 0.3 + 2.0));             // patchy coverage
          cir *= smoothstep(0.02, 0.16, hp);
          vec3 cc = mix(uCloudLit, uCloudShade, 0.15);
          col = mix(col, cc, cir * 0.42);
          col += uCloudGlow * cir * pow(max(sd, 0.0), 6.0) * 0.30;
        }

        // ---- stratus veil (the milky Petersburg overcast): broad soft lumps + finer streaks, lighter and hazier toward the horizon, a diffuse bright patch where the sun hides
        if (uOvercast > 0.01 && h > 0.0) {
          vec2 op = d.xz / (h + 0.30) * 0.55; op += WIND * uTime * 0.0022;
          float ov = fbm3(op * 1.1 + 9.0) * 0.62 + fbm3(vec2(op.x * 3.2, op.y * 2.2) + 2.0) * 0.38;
          float thin = smoothstep(0.55, 0.85, fbm3(op * 0.45 + 31.0));            // thin places where the veil is brighter
          float lump = smoothstep(0.34, 0.74, ov);                                   // darker stratocumulus lumps in a lighter milky veil
          vec3 oc = uOverCol * (1.08 - 0.40 * lump);
          oc = mix(oc, uCloudLit, thin * 0.45);
          oc = mix(oc, uHorizon, (1.0 - smoothstep(0.0, 0.42, hp)) * 0.55);
          oc += uCloudGlow * (pow(max(sd, 0.0), 7.0) * 0.30 + pow(max(sd, 0.0), 40.0) * 0.25);
          col = mix(col, oc, uOvercast * smoothstep(-0.01, 0.05, h));
        }

        // ---- small flat-based cumulus: a height field marched through a thin layer (base = 1, tops up to 1.9 units), shaded with the field's own normal
        if (h > 0.01 && uCumulus > 0.01) {
          float thr = mix(0.80, 0.52, clamp(uCumulus, 0.0, 1.0)) + 0.20 * smoothstep(0.25, 0.75, hp);   // the zenith stays clearer
          vec2 dir = d.xz / (h + 0.22);
          vec2 drift = WIND * uTime * 0.0025;
          float yPrev = 0.0, yHit = -1.0, bestM = -1.0, bestY = 0.0;
          for (int i = 0; i < CUM_STEPS; i++) {
            float y = float(i) / float(CUM_STEPS - 1);
            float m = cumF((dir * (1.0 + CPAR * y) + drift) * CSC, thr) - y * y * 0.3333;   // > 0 inside the cloud
            if (m > bestM) { bestM = m; bestY = y; }
            if (yHit < 0.0 && m > 0.0) {
              if (i == 0) yHit = 0.0;
              else {                                                      // refine the crossing by bisection (no stair-steps)
                float lo = yPrev, hi = y;
                for (int j = 0; j < 5; j++) { float mid = 0.5 * (lo + hi); if (cumF((dir * (1.0 + CPAR * mid) + drift) * CSC, thr) - mid * mid * 0.3333 > 0.0) hi = mid; else lo = mid; }
                yHit = hi;
              }
            }
            yPrev = y;
          }
          float a = smoothstep(-0.012, 0.012, bestM) * smoothstep(0.012, 0.075, h);
          if (a > 0.003) {
            float ys = yHit >= 0.0 ? yHit : bestY;
            vec2 pH = (dir * (1.0 + CPAR * ys) + drift) * CSC;
            // outward normal of the surface F(p) = y^2 / 3 (units: base altitudes)
            float f0 = cumF(pH, thr);
            vec2 g = vec2(fbm3(pH + vec2(0.16, 0.0)) - fbm3(pH - vec2(0.16, 0.0)), fbm3(pH + vec2(0.0, 0.16)) - fbm3(pH - vec2(0.0, 0.16))) / 0.32;   // smooth gradient (3 octaves)
            vec3 N = normalize(vec3(-g.x * CSC, ys * 0.74 + 0.05, -g.y * CSC));
            float lit = smoothstep(0.04, 0.26, dot(N, S));
            float under = 1.0 - smoothstep(0.0, 0.12, ys);
            vec3 cc = mix(uCloudShade, uCloudLit, lit);
            cc = mix(cc, uCloudBase, under);
            cc += uCloudGlow * pow(max(sd, 0.0), 5.0) * (0.25 + 0.55 * lit);
            cc = mix(cc, col, (1.0 - smoothstep(0.02, 0.22, h)) * 0.55);   // aerial perspective: far clouds melt into the haze
            col = mix(col, cc, a);
          }
        }

        // ---- stars: a handful, only high up
        if (uStars > 0.01 && h > 0.0) {
          vec2 sp = d.xz / (h + 0.25) * 150.0;
          vec2 id = floor(sp), fr = fract(sp) - 0.5;
          float rnd = h21(id);
          float star = smoothstep(0.994, 1.0, rnd) * smoothstep(0.30, 0.0, length(fr + (h21(id + 3.7) - 0.5) * 0.4));
          star *= 0.6 + 0.4 * sin(uTime * (1.5 + rnd * 3.0) + rnd * 60.0);
          col += vec3(0.85, 0.92, 1.0) * star * smoothstep(0.25, 0.6, h) * uStars;
        }

        // ---- below the horizon: the fog colour (the far scenery fades into the same colour)
        col = mix(col, uFog, 1.0 - smoothstep(-0.10, 0.015, h));
        col = mix(col, uIndoorBg, uIndoorAmt);                  // indoor zone: a plain background instead of the sky
        gl_FragColor = vec4(col, 1.0);
      }`,
    defines: { CUM_STEPS: (quality.level || quality.name) === 'low' ? 5 : 8 },          // low quality marches fewer steps through the cloud layer
    side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(5200, 48, 24), mat);
  mesh.layers.set(LAYER_NO_OUTLINE);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.userData.noBatch = true;
  mesh.name = 'sky';
  scene.add(mesh);

  // --- lights (colours / intensities are overwritten by timeofday.js; these are the afternoon values)
  const hemi = new THREE.HemisphereLight('#b0c6ea', '#cbb99e', 1.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff8ee', 2.1);
  sun.castShadow = quality.shadows !== false;
  const ms = quality.shadowMap || 4096;
  sun.shadow.mapSize.set(ms, ms);
  const S = quality.shadowSize || 75;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 700 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 1.6;
  sun.shadow.camera.layers.enableAll();
  scene.add(sun); scene.add(sun.target);

  // FogExp2 (fog = 1 - exp(-(d r)^2)); day density 0.00042: 500 m 4 %, 1 km 16 %, 1.5 km 33 %, 2 km 51 %, 3 km 80 %: the Fontanka bridge is clearly visible from Vosstaniya Square (1.05 km),
  // the far roofline of the city melts into the horizon colour (the fog colour equals the horizon colour of the sky)
  scene.fog = new THREE.FogExp2(FOG_COLOR.clone(), 0.00042);

  const _c = new THREE.Vector3(), _fwd = new THREE.Vector3(), _ld = new THREE.Vector3();
  // indoorDir / indoorW (written by core/zones.js): inside a zone with a key light the directional light is re-aimed from the sun toward this direction
  const api = { mesh, sun, hemi, uniforms, update, indoorDir: new THREE.Vector3(0.3, 0.85, 0.4).normalize(), indoorW: 0 };
  function update(t, camera) {
    const L = _ld.copy(sunDir); if (api.indoorW > 0) L.lerp(api.indoorDir, api.indoorW).normalize();   // the light direction used below
    uniforms.uTime.value = t;
    mesh.position.copy(camera.position);
    // shadow box follows the camera, pushed forward, snapped to texels to avoid shimmering
    camera.getWorldDirection(_fwd); _fwd.y = 0; _fwd.normalize();
    _c.copy(camera.position).addScaledVector(_fwd, S * 0.45);
    const texel = (2 * S) / ms;
    // snap in light space
    const lx = new THREE.Vector3().crossVectors(L, new THREE.Vector3(0, 1, 0)).normalize();
    const ly = new THREE.Vector3().crossVectors(lx, L).normalize();
    const px = Math.round(_c.dot(lx) / texel) * texel, py = Math.round(_c.dot(ly) / texel) * texel, pz = _c.dot(L);
    _c.copy(lx).multiplyScalar(px).addScaledVector(ly, py).addScaledVector(L, pz);
    sun.target.position.copy(_c);
    sun.position.copy(_c).addScaledVector(L, 340);
    sun.target.updateMatrixWorld();
  }
  return api;
}
