// lib/figures/materials.js - the materials of the figure kit, all through ctx.mat / ctx.tex (cached by name / key, so every module that asks gets the SAME material and canvas).
//
// figureMats(ctx) -> { bronze, bronzeDark, copper, gold, dark, marble, plaster, granite, graniteRed, iron } (+ .set(name) helpers: mats.keys('bronze') = { main, dark, accent })
//   bronze      dark green-black cast bronze #2F3D38 with verdigris streaks on the up-facing surfaces and blotches where rain runs off (the texture rows are read by the kit's patina uv: u = horizontal
//               position, v = normal.y);
//   copper      hammered copper turned olive green (#6d7a46, the Palace Pier lions);
//   gold        gilding (matte gold, a little emissive);
//   marble      pale weathered marble / limestone statue (cream, grey-green streaks under the ledges, dirty top surfaces);
//   plaster     the cream stucco sculpture of the Admiralty;
//   granite / graniteRed   plinths;  dark = eyes / mouth / soles;  iron = black cast iron.
// A figure's keys (main, dark, accent) map to a set: figureKeys(mats, 'bronze') = { main: bronze, dark, accent: gold }.
const cache = new WeakMap();

export function figureMats(ctx) {
  if (cache.has(ctx)) return cache.get(ctx);
  const T = ctx.mat.toon;
  const rngOf = (seed) => { let sd = seed; return () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; }; };
  const vn = (a, x) => { const i = Math.floor(x), f = x - i, p = a[((i % a.length) + a.length) % a.length], q = a[(((i + 1) % a.length) + a.length) % a.length]; return p + (q - p) * f * f * (3 - 2 * f); };
  // streaked patina texture: base colour, verdigris colour on the top rows (up-facing) + drips, blotches
  const patinaTex = (key, base, dark, light, verd, seed, reach = 1) => ctx.tex.draw(256, 256, (g, w, h) => {
    const rnd = rngOf(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.globalAlpha = 0.4; g.fillStyle = rnd() < 0.5 ? dark : light; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 8, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    const r1 = Array.from({ length: 64 }, () => rnd()), r2 = Array.from({ length: 16 }, () => rnd()), r3 = Array.from({ length: 256 }, () => rnd());
    g.fillStyle = verd + (0.34 * reach).toFixed(2) + ')'; g.fillRect(0, 0, w, h * 0.2);
    const [vr, vg, vb] = verd.match(/\d+/g).map(Number);
    for (let x = 0; x < w; x++) {
      const s = Math.max(0, Math.min(1, vn(r1, x / 11) * 0.6 + vn(r2, x / 40) * 0.7 + r3[x] * 0.12 - 0.3));
      if (s < 0.22) continue;
      const rch = 0.26 + s * 0.42, gr = g.createLinearGradient(0, 0, 0, h * rch);
      gr.addColorStop(0, `rgba(${vr},${vg},${vb},${(0.42 + 0.5 * s) * reach})`); gr.addColorStop(1, `rgba(${vr},${vg},${vb},0)`);
      g.fillStyle = gr; g.fillRect(x, 0, 3, h * rch);
    }
    for (let i = 0; i < 46; i++) { g.globalAlpha = (0.12 + rnd() * 0.16) * reach; g.fillStyle = `rgb(${vr},${vg},${vb})`; g.beginPath(); g.ellipse(rnd() * w, h * (0.28 + rnd() * 0.3), 3 + rnd() * 10, 2 + rnd() * 7, rnd() * 3, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
  }, { key, repeat: [1, 1] });
  const bronzeTex = patinaTex('fig-patina-bronze', '#2a3631', '#27312d', '#3b4c44', 'rgba(92,143,120,', 11);
  const bronze = T('#aebcb5', { map: bronzeTex, name: 'fig-bronze', paint: 0.03, emissive: '#08120d', emissiveIntensity: 0.3 });
  const bronzeDark = T('#d4dcd8', { map: bronzeTex, name: 'fig-bronzeDark', paint: 0.03, emissive: '#070f0b', emissiveIntensity: 0.4 });
  const copperTex = patinaTex('fig-patina-copper', '#5d6c3d', '#4d5b33', '#7a8a4c', 'rgba(116,150,98,', 23, 0.8);
  const copper = T('#ffffff', { map: copperTex, name: 'fig-copper', paint: 0.04, emissive: '#1a2210', emissiveIntensity: 0.35 });
  const gold = T('#d9ae32', { name: 'fig-gold', paint: 0.02, emissive: '#6a4e08', emissiveIntensity: 0.45 });
  const dark = T('#0f1416', { name: 'fig-dark' });
  const iron = T('#1d2220', { name: 'fig-iron', paint: 0.02 });
  // marble: warm white, grey-green drips from the top, grime in the creases (v = normal.y: top rows = up-facing)
  const marbleTex = ctx.tex.draw(256, 256, (g, w, h) => {
    const rnd = rngOf(31);
    g.fillStyle = '#e4ddcf'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.globalAlpha = 0.25; g.fillStyle = rnd() < 0.5 ? '#d3cab9' : '#efe9dc'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 9, 0, 6.3); g.fill(); }
    g.globalAlpha = 1;
    const r1 = Array.from({ length: 64 }, () => rnd()), r2 = Array.from({ length: 16 }, () => rnd());
    g.fillStyle = 'rgba(120,128,104,0.36)'; g.fillRect(0, 0, w, h * 0.16);
    for (let x = 0; x < w; x++) { const s = Math.max(0, vn(r1, x / 9) * 0.6 + vn(r2, x / 30) * 0.6 - 0.25); if (s < 0.2) continue; const gr = g.createLinearGradient(0, 0, 0, h * (0.2 + s * 0.4)); gr.addColorStop(0, `rgba(120,128,104,${0.3 + 0.4 * s})`); gr.addColorStop(1, 'rgba(120,128,104,0)'); g.fillStyle = gr; g.fillRect(x, 0, 3, h * (0.2 + s * 0.4)); }
    g.fillStyle = 'rgba(150,140,120,0.35)'; g.fillRect(0, h * 0.8, w, h * 0.2);                 // the underside of every ledge is grimy
  }, { key: 'fig-marble', repeat: [1, 1] });
  const marble = T('#cfc8b6', { map: marbleTex, name: 'fig-marble', paint: 0.04 });
  const plaster = T('#d9ceb0', { map: marbleTex, name: 'fig-plaster', paint: 0.05 });
  const granite = T('#9b8f88', { name: 'fig-granite', paint: 0.06 });
  const graniteRed = T('#a8837a', { name: 'fig-graniteRed', paint: 0.06 });
  const M = { bronze, bronzeDark, copper, gold, dark, iron, marble, plaster, granite, graniteRed };
  /** the material map a Figure.place wants: { main, dark, accent } */
  M.keys = (main = 'bronze', accent = 'gold') => ({ main: M[main] || main, dark, accent: M[accent] || accent });
  cache.set(ctx, M);
  return M;
}
