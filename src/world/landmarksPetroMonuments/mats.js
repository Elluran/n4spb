// landmarksPetroMonuments/mats.js - the materials of the module (ctx.mat.toon only; every material / texture key starts with 'lmpm-'): about 14 in all.
//   vc / vc2   ONE vertex-colour material for every plain surface (granite, limestone, steel, paint, boulders, hedges, flowers): Parts.tint(hex) before the geometry.  The engine merges all of it per cell.
//   bronzeSet  { main, dark, accent } of the figure kit (patinated bronze with verdigris, eyes, gilt);  bronzeMono = the same without gilt trim;  copper (oars, clock hands);  gilt
//   plates     ATLAS pages of the name plates (plates.js), decals 2 cm in front of a surface
//   water      shallow fountain water with a slowly scrolling ripple texture (the shared uTime uniform: NO per-frame callback);  jet = white streaked alpha strips with a falling-water scroll (same clock)
// Colours of the photographs (dossier docs/research/petro-monuments-2026*.md section 5): granite red-brown #4b2a26, pink #9a5448, grey #8c8a86, black #1f1f22, limestone #b9b5a6, boulder #a98274, white #e6e2da.
import { figureMats } from '../lib/figures.js';
import { makePlates } from './plates.js';

export const PAL = {
  graniteRedBrown: '#4b2a26', granitePink: '#9a5448', graniteRed: '#7a4a3c', graniteGrey: '#8c8a86', graniteGreyDark: '#6f6e6b', graniteBlack: '#1f1f22', graniteDarkGrey: '#3b3e40',
  graniteLight: '#a8a79f', limestone: '#b9b5a6', boulder: '#a98274', boulderDark: '#8d7a72', white: '#e6e2da', whitePaint: '#e9e9e4', steel: '#4a4d52', iron: '#23282a',
  brick: '#a8573f', plaster: '#b4b0a6', copper: '#a8643a', oarBlue: '#5f7a76', gravel: '#b8a58d', hedge: '#35592f', bronzeNew: '#a9783f', bronzeOld: '#3a3631', verdigris: '#4d6b5c', gold: '#c9a23a',
};

export function makeMats(ctx) {
  const T = ctx.mat.toon, fm = figureMats(ctx), tex = ctx.tex, M = { PAL, fm };
  M.vc = T('#ffffff', { vertexColors: true, name: 'lmpm-vc', paint: 0.04 });
  M.vc2 = T('#ffffff', { vertexColors: true, side: 'double', name: 'lmpm-vc2', paint: 0.03 });
  M.bronzeSet = { main: fm.bronze, dark: fm.dark, accent: fm.gold };
  M.bronzeMono = { main: fm.bronze, dark: fm.dark, accent: fm.bronze };
  M.bronzeDarkSet = { main: fm.bronzeDark, dark: fm.dark, accent: fm.gold };
  M.copperSet = { main: fm.copper, dark: fm.dark, accent: fm.copper };
  M.gilt = fm.gold; M.copper = fm.copper;
  M.plates = makePlates(ctx);
  M.cutouts = new Set(); M.decals = new Set(M.plates);
  // water: a soft ripple texture scrolled by the shared clock in the fragment shader
  const rip = tex.draw(128, 128, (g, w, h) => {
    const r = ctx.rng(7711); g.fillStyle = '#4a7c84'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? '200,230,240' : '30,70,86'},${0.1 + r() * 0.16})`; g.lineWidth = 1 + r() * 2; const y = r() * h, x = r() * w, l = 10 + r() * 30; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 6, x + l, y); g.stroke(); g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w + l / 2, y + (r() - 0.5) * 6, x - w + l, y); g.stroke(); }
  }, { key: 'lmpm-ripple', repeat: [1, 1] });
  rip.wrapS = rip.wrapT = 1000;                                              // THREE.RepeatWrapping
  M.water = T('#ffffff', { map: rip, name: 'lmpm-water', paint: 0.01, emissive: '#10303a', emissiveIntensity: 0.25, polygonOffset: -3 });
  const jt = tex.draw(64, 128, (g, w, h) => {
    const r = ctx.rng(7712); g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(245,250,252,0.28)'; g.fillRect(0, 0, w, h);   // a pale veil between the streaks (a falling sheet is never dark in between)
    // five soft streaks of falling water (wide, feathered edges, a few breaks): fine 1-3 px stripes alias to speckle at 2-5 m (review 2026-10-15)
    for (let k = 0; k < 5; k++) { const cx = (k + 0.5) * w / 5 + (r() - 0.5) * 3, hw = 4.5 + r() * 2.5, a = 0.45 + r() * 0.4, gx = g.createLinearGradient(cx - hw, 0, cx + hw, 0); gx.addColorStop(0, 'rgba(245,250,252,0)'); gx.addColorStop(0.5, `rgba(245,250,252,${a})`); gx.addColorStop(1, 'rgba(245,250,252,0)'); g.fillStyle = gx; g.fillRect(cx - hw, 0, hw * 2, h); }
  }, { key: 'lmpm-jet', repeat: [1, 1] });
  jt.wrapS = jt.wrapT = 1000;
  M.jet = T('#ffffff', { map: jt, name: 'lmpm-jet', transparent: true, depthWrite: false, side: 'double', paint: 0, emissive: '#cfe6ee', emissiveIntensity: 0.4 });
  const sh = ctx.shared || (ctx.services && ctx.services.shared);
  const clock = (m, sx, sy) => {
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (shader, renderer) => {
      if (prev) prev(shader, renderer);
      shader.uniforms.uTime = (sh && sh.uTime) || { value: 0 };
      shader.fragmentShader = 'uniform float uTime;\n' + shader.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP\n vec4 sampledDiffuseColor = texture2D( map, vMapUv + vec2( uTime * ${sx.toFixed(4)}, uTime * ${sy.toFixed(4)} ) );\n diffuseColor *= sampledDiffuseColor;\n#endif`);
    };
    m.customProgramCacheKey = () => 'lmpm-clock-' + sx + '-' + sy;
  };
  clock(M.water, 0.012, 0.008); clock(M.jet, 0, -0.9);
  M.cutouts.add(M.jet); M.waterish = new Set([M.water, M.jet]);
  // the flower clock bed: dark red foliage with silver numerals 1..12 and a pale rim ring (photos flowerclock/01-06), one 512 px tile, uv 0..1 over the ellipse
  M.clockTex = tex.draw(512, 512, (g, w, h) => {
    const r = ctx.rng(7713); g.fillStyle = '#5e1c22'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? '#6b2128' : '#4f1820'; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 5, 0, 6.3); g.fill(); }
    g.strokeStyle = '#c9ceca'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, h / 2, w * 0.455, 0, 6.3); g.stroke();
    g.fillStyle = '#cfd3cf'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2 - Math.PI / 2; tex.fitText(g, String(i), w / 2 + Math.cos(a) * w * 0.36, h / 2 + Math.sin(a) * h * 0.36, 70, 58, tex.FONTS.sans, 700); }
  }, { key: 'lmpm-clock' });
  M.clock = T('#ffffff', { map: M.clockTex, name: 'lmpm-clock', paint: 0.03, polygonOffset: -2 });
  M.sets = { stone: { main: M.vc, dark: M.vc, accent: M.vc } };
  return M;
}
