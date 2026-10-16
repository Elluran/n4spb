// landmarksMars/mats.js - materials and canvas textures of the Mars Field group: gravel alleys (#b2807a), the red-brown plaza (#a8745a), grey granite slab paving, rock-faced memorial blocks,
// pink inscription slabs, green cast-iron lamps with white opal globes / orange-red lanterns, white benches, the Suvorov bronze and red granite pedestal, the Marble Palace stone.
// Colours: docs/research/mars-field.md 3.2, 4.1, 5.2, 6.1 (hex read from the photos fld_05 mem_01 mem_17 pav_01 suv_03 marble_10).  Textures are white / grey tiles tinted by the material colour; the surface
// textures use WORLD-space uv (metres / tile) so that overlapping coplanar ribbons show identical pixels (no visible z-fighting where two alleys cross).
export const C = {
  gravel: '#b2807a', plaza: '#9f6c56', slab: '#9a9890', slabJoint: '#7a7872', lawn: '#5c9a3a', geranium: '#d8403a',
  wall: '#8f857c', wallPink: '#a8837a', slabPink: '#b48a7e', letters: '#3a2c26', platform: '#4a3f36', stub: '#9a8a84',
  lampGreen: '#2b6e4d', lampPale: '#7fa58a', globe: '#f4f1e6', lantern: '#e8742a', benchWood: '#efece4', benchIron: '#202428',
  bronze: '#3d3a30', verdigris: '#6d7f50', gilt: '#d8a838', suvPed: '#8e5545', suvBase: '#7a4a3c',
  iron: '#1e2022', gold: '#d4a838', pier: '#8b7f78', urn: '#6a6c68',
  shrub: '#3c7a34', lime: '#4f8a3a', spruce: '#46786a',
};

export function makeMats(ctx) {
  const T = ctx.mat.toon, tex = ctx.tex;
  const M = { C };
  // ---- textures (white / light tiles)
  const pebbles = tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng(4411); g.fillStyle = '#e6e2dc'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const v = 200 + Math.floor(r() * 55); g.fillStyle = `rgb(${v},${v - 4},${v - 8})`; const s = 1 + r() * 3.2; g.fillRect(r() * w, r() * h, s, s * (0.6 + r() * 0.7)); }
    for (let i = 0; i < 380; i++) { const v = 150 + Math.floor(r() * 50); g.fillStyle = `rgba(${v},${v - 10},${v - 14},0.55)`; const s = 1 + r() * 2.4; g.fillRect(r() * w, r() * h, s, s); }
  }, { key: 'lmM-pebbles', repeat: [1, 1] });
  const slab = tex.draw(256, 256, (g, w, h) => {
    // tile = 1.6 m x 1.6 m: two rows of 0.8 m, slabs 1.6 m long, rows shifted by half a slab
    g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, w, h);
    const r = ctx.rng(5522);
    for (let row = 0; row < 2; row++) for (let k = 0; k < 2; k++) { const v = 228 + Math.floor(r() * 26); g.fillStyle = `rgb(${v},${v - 1},${v - 5})`; g.fillRect((k * 128 + row * 64) % w, row * 128, 128, 128); if (k === 1 && row === 1) g.fillRect(0, row * 128, 64, 128); }
    g.fillStyle = '#8a8680'; for (let row = 0; row < 2; row++) { g.fillRect(0, row * 128 - 1, w, 3); for (let k = 0; k < 2; k++) g.fillRect(((k * 128 + row * 64) % w) - 1, row * 128, 3, 128); }
    g.fillRect(0, h - 2, w, 2);
  }, { key: 'lmM-slab', repeat: [1, 1] });
  const blocks = tex.draw(512, 256, (g, w, h) => {
    // tile = 2.4 m x 1.2 m: two courses of rock-faced blocks 1.2 m x 0.6 m, grey-pink mix, pale mortar, moss in the joints
    const r = ctx.rng(6633); g.fillStyle = '#6a625a'; g.fillRect(0, 0, w, h);
    const bw = 128, bh = 128;
    for (let row = 0; row < 2; row++) for (let k = -1; k < 4; k++) {
      const x0 = k * bw * 1 + (row ? bw / 2 : 0), pink = r() < 0.3, base = pink ? [190, 164, 154] : [178, 170, 162], j = 0.86 + r() * 0.26;
      g.fillStyle = `rgb(${base[0] * j | 0},${base[1] * j | 0},${base[2] * j | 0})`; g.fillRect(x0 + 3, row * bh + 3, bw - 6, bh - 6);
      for (let i = 0; i < 40; i++) { const v = 150 + Math.floor(r() * 90); g.fillStyle = `rgba(${v},${v - 10},${v - 16},0.30)`; g.fillRect(x0 + 4 + r() * (bw - 12), row * bh + 4 + r() * (bh - 12), 2 + r() * 8, 2 + r() * 6); }
      g.fillStyle = 'rgba(70,100,50,0.30)'; g.fillRect(x0 + 3, row * bh + bh - 7, bw - 6, 4);
    }
  }, { key: 'lmM-blocks', repeat: [1, 1] });
  const grass = tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng(7744); g.fillStyle = '#f0f4e6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) { const v = 208 + Math.floor(r() * 47); g.fillStyle = `rgba(${v - 24},${v},${v - 40},0.5)`; const s = 3 + r() * 14; g.beginPath(); g.ellipse(r() * w, r() * h, s, s * (0.4 + r() * 0.5), r() * 3.1, 0, 6.3); g.fill(); }
    for (let i = 0; i < 160; i++) { g.fillStyle = r() < 0.7 ? 'rgba(255,255,240,0.55)' : 'rgba(250,236,120,0.5)'; g.fillRect(r() * w, r() * h, 2, 2); }
  }, { key: 'lmM-grass', repeat: [1, 1] });
  M.pebbles = pebbles;
  const surf = (hex, map, name, off = -2) => T(hex, { map, name: 'lmM-' + name, paint: 0.05, polygonOffset: off });
  Object.assign(M, {
    gravel: surf(C.gravel, pebbles, 'gravel'), plaza: surf(C.plaza, pebbles, 'plaza'), slab: surf(C.slab, slab, 'slab', -3), slabDark: surf('#85837c', slab, 'slabD', -3),
    paver: surf('#7a8e66', pebbles, 'paver', -4), lawnTop: T(C.lawn, { map: grass, name: 'lmM-lawn', paint: 0.06, polygonOffset: -1 }),
    geranium: T(C.geranium, { name: 'lmM-geranium', paint: 0.1, polygonOffset: -5 }),
    wall: T('#ffffff', { map: blocks, name: 'lmM-wall', paint: 0.03 }), wallCap: T('#9a9088', { name: 'lmM-wallCap', paint: 0.04 }),
    slabPink: T(C.slabPink, { name: 'lmM-slabPink', paint: 0.03 }), slabPinkDark: T('#8f6d64', { name: 'lmM-slabPinkD', paint: 0.03 }),
    gravestone: T('#9d6e66', { name: 'lmM-gravestone', paint: 0.03, polygonOffset: -6 }),
    platform: T(C.platform, { name: 'lmM-platform', paint: 0.03 }), burner: T('#15171a', { name: 'lmM-burner' }), stub: T(C.stub, { name: 'lmM-stub', paint: 0.03 }),
    bronzePlaque: T('#4a3a2c', { name: 'lmM-plaque', paint: 0.02 }),
    flame: T('#ffb23a', { name: 'lmM-flame', emissive: '#ff8a1a', emissiveIntensity: 1.3, side: 'double', transparent: true, opacity: 0.92, depthWrite: false }),
    flameCore: T('#fff0a0', { name: 'lmM-flameCore', emissive: '#ffd860', emissiveIntensity: 1.5, side: 'double', transparent: true, opacity: 0.95, depthWrite: false }),
    lampGreen: T(C.lampGreen, { name: 'lmM-lampGreen', paint: 0.02 }), lampPale: T(C.lampPale, { name: 'lmM-lampPale', paint: 0.02 }),
    globe: T(C.globe, { name: 'lmM-globe', emissive: '#ffe9b0', emissiveIntensity: 0.25 }), lantern: T(C.lantern, { name: 'lmM-lantern', emissive: '#ff7a20', emissiveIntensity: 0.35 }),
    benchWood: T(C.benchWood, { name: 'lmM-benchWood', paint: 0.03 }), benchIron: T(C.benchIron, { name: 'lmM-benchIron' }), bin: T('#4c5258', { name: 'lmM-bin' }),
    bronze: T(C.bronze, { name: 'lmM-bronze', paint: 0.02 }), gilt: T(C.gilt, { name: 'lmM-gilt', emissive: '#6a4a08', emissiveIntensity: 0.4 }),
    suvPed: T(C.suvPed, { name: 'lmM-suvPed', paint: 0.02 }), suvBase: T(C.suvBase, { name: 'lmM-suvBase', paint: 0.03 }),
    kerb: T('#8f8a82', { name: 'lmM-kerb', paint: 0.03 }), hedge: T('#2c5a32', { name: 'lmM-hedge', paint: 0.1 }), flowers: T('#c8503c', { name: 'lmM-flowers', paint: 0.1, polygonOffset: -5 }),
    granite: T('#9a948c', { name: 'lmM-granite', paint: 0.03 }), graniteDark: T('#5d5f62', { name: 'lmM-graniteD', paint: 0.03 }), graniteRed: T('#8f6a60', { name: 'lmM-graniteR', paint: 0.03 }),
    iron: T(C.iron, { name: 'lmM-iron' }), gold: T(C.gold, { name: 'lmM-goldF', emissive: '#6a4a08', emissiveIntensity: 0.4 }),
  });
  M.decals = new Set();
  M.cutouts = new Set();
  M.flames = new Set([M.flame, M.flameCore]);
  M.blocksTex = blocks;
  return M;
}
