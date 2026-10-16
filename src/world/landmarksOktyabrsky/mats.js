// landmarksOktyabrsky/mats.js - materials of the module (ctx.mat.toon / glass only; every name starts with 'lmOkt-').  Colours: docs/research/oktyabrsky.md section 7, oktyabrsky-square.md section 9.
// M.cutouts = alpha cut-outs (no outline pass), M.decals = sheets that lie 2-6 cm in front of a surface (polygonOffset), M.glassy = transparent sheets (no outline, no shadow).
import { makeArt, COL } from './art.js';

export const C = { ...COL };

export function makeMats(ctx) {
  const T = ctx.mat.toon, A = makeArt(ctx), M = { A, C };
  const W = '#ffffff';
  const sheet = (name, map, o = {}) => T(W, { map, name: 'lmOkt-' + name, paint: 0.02, ...o });
  const flat = (name, col, o = {}) => T(col, { name: 'lmOkt-' + name, paint: 0.03, ...o });
  Object.assign(M, {
    // ---- hall: stone
    strips: sheet('strips', A.strips, { paint: 0.03 }), slabs: sheet('slabs', A.slabs, { paint: 0.03 }), soffit: sheet('soffit', A.soffit, { paint: 0.01 }), apert: sheet('apert', A.apert, { paint: 0.02 }),
    dolo: flat('dolo', C.dolo, { paint: 0.04 }), doloShade: flat('doloShade', '#c4bca6', { paint: 0.03 }),
    roof: T('#68655e', { map: A.roof, name: 'lmOkt-roof', paint: 0.04 }), ribs: sheet('ribs', A.ribs, { paint: 0.02 }),
    // ---- hall: front
    mull: flat('mull', C.mull, { paint: 0.01 }), doorFrame: flat('doorFrame', C.doorFrame, { paint: 0.01 }), spandrel: flat('spandrel', C.spandrel, { paint: 0.02 }),
    glassDark: flat('glassDark', '#27323a', { paint: 0 }), glassSide: sheet('glassSide', A.sideGlass, { paint: 0, polygonOffset: -2 }),
    frieze: sheet('frieze', A.frieze, { paint: 0.01 }), friezeBack: flat('friezeBack', C.frieze, { paint: 0.02 }),
    posters: sheet('posters', A.posters, { paint: 0, polygonOffset: -2, emissive: '#ffffff', emissiveIntensity: 0.0 }), stand: sheet('stand', A.stand, { paint: 0 }),
    reflect: ctx.mat.emissive('#ffffff', 0.8, { map: A.reflect, transparent: true, opacity: 0.36, depthWrite: false }),
    doorGlass: ctx.mat.glass({ tint: '#26333d', opacity: 0.72, streaks: false }),
    glass: ctx.mat.glass({ tint: '#5d7f8e', opacity: 0.5, streaks: false }),
    // ---- hall: stair, platform, plaza
    tread: flat('tread', C.tread, { paint: 0.05 }), riser: flat('riser', C.riser, { paint: 0.05 }), plinth: flat('plinth', C.plinth, { paint: 0.05 }),
    platform: T(W, { map: A.slabLight, name: 'lmOkt-platform', paint: 0.03 }),
    paving: T(W, { map: A.paving, name: 'lmOkt-paving', paint: 0.04, polygonOffset: -4 }), pavingRed: T(W, { map: A.pavingRed, name: 'lmOkt-pavingRed', paint: 0.04, polygonOffset: -4 }),
    slabLight: T(W, { map: A.slabLight, name: 'lmOkt-slabLight', paint: 0.03 }), kerb: T(W, { map: A.kerb, name: 'lmOkt-kerb', paint: 0.05 }),
    // ---- hall: furniture
    lamp: flat('lamp', C.lamp, { paint: 0.01 }), globe: T(C.globe, { name: 'lmOkt-globe', paint: 0, emissive: '#e8e6d6', emissiveIntensity: 0.25 }), iron: flat('iron', '#1d2220', { paint: 0.01 }),
    bollard: flat('bollard', '#8a8a86', { paint: 0.05 }), steel: flat('steel', '#7c8084', { paint: 0.02 }), rail: flat('rail', '#e4e4e0', { paint: 0.01 }), pipe: flat('pipe', '#bdbab2', { paint: 0.02 }),
    plant: flat('plant', '#8e9296', { paint: 0.03 }), hatch: flat('hatch', '#b9bcbd', { paint: 0.03 }), hatchTop: flat('hatchTop', '#4d6a78', { paint: 0.02 }), bronzeGrid: flat('bronzeGrid', '#4a4540', { paint: 0.01 }),
    // ---- hall: interior (dim: seen through the glass)
    parquet: sheet('parquet', A.parquet, { paint: 0, emissive: '#7a5426', emissiveIntensity: 0.55 }), wallIn: flat('wallIn', '#cfc8b4', { paint: 0.01, emissive: '#cfc7ad', emissiveIntensity: 0.55 }), ceilIn: flat('ceilIn', '#e0ddd2', { paint: 0.01, emissive: '#d6d2c4', emissiveIntensity: 0.5 }), colIn: flat('colIn', '#efede6', { paint: 0.01, emissive: '#4a4840', emissiveIntensity: 0.4 }),
    treadIn: flat('treadIn', '#b98343', { paint: 0.01, emissive: '#5a3a14', emissiveIntensity: 0.5 }), screen: flat('screen', '#1b2636', { paint: 0, emissive: '#2c5586', emissiveIntensity: 0.4 }),
    // ---- the October group
    octGranite: flat('octGranite', C.graniteOct, { paint: 0.05 }),
  });
  M.cutouts = new Set();
  M.decals = new Set([M.posters, M.paving, M.pavingRed, M.glassSide]);
  M.glassy = new Set([M.glass, M.reflect, M.doorGlass]);
  return M;
}
