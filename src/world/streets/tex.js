// streets/tex.js - canvas textures of the street surfaces (worn dark-grey asphalt, grey granite slabs 0.93 x 0.7 m for Nevsky, the darker kerb band, small granite pavers 10 x 20 cm,
// red-brown block paving for courtyards, granite setts, kerb granite, dust gutter, tyre wear, road paint with wear, tactile plates, light pools).
// All tiles are seamless; the metre scale is set by the UV the meshes are built with (world-space UV = metres / tile).
// Look sources: docs/research/streets.md section 2 (asphalt #5f6264 base with patches and cracks, slabs #9b9a95, pavers #8f8c85, brick #8a4f46), photos P03 P09 P16 P23 P40 P41.
const rngOf = (seed) => { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); };

/** draw fn(x, y) at the wrapped positions when a feature of radius r touches a tile edge (keeps tiles seamless) */
function wrapped(w, h, x, y, r, fn) {
  const xs = [x], ys = [y];
  if (x < r) xs.push(x + w); if (x > w - r) xs.push(x - w);
  if (y < r) ys.push(y + h); if (y > h - r) ys.push(y - h);
  for (const xx of xs) for (const yy of ys) fn(xx, yy);
}

export const ASPHALT_TILE = 8, SLAB_TILE = 2.8, PAVER_TILE = 1.6, SAND_TILE = 2, COBBLE_TILE = 3.2, STRIP_TILE = 2, BRICK_TILE = 1.6;

export function makeStreetTextures(ctx) {
  const T = {};

  // ---- asphalt: 8 m tile, dark neutral grey with fine aggregate, lighter dusty blotches, darker oil / worn lanes, repair patches, tar cracks
  T.asphalt = ctx.tex.draw(512, 512, (g, w, h) => {
    const r = rngOf(9127);
    g.fillStyle = '#5f6264'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {                                    // big soft blotches (worn / dusty areas)
      const x = r() * w, y = r() * h, rr = 40 + r() * 100, d = r() < 0.5;
      wrapped(w, h, x, y, rr, (xx, yy) => { g.fillStyle = d ? 'rgba(40,40,44,0.05)' : 'rgba(196,184,160,0.06)'; g.beginPath(); g.ellipse(xx, yy, rr, rr * (0.4 + r() * 0.5), r() * 3, 0, 6.3); g.fill(); });
    }
    for (let i = 0; i < 3; i++) {                                     // rectangular repair patches (fresher / darker bitumen)
      const x = r() * w, y = r() * h, pw = 50 + r() * 110, ph = 28 + r() * 60, d = r() < 0.7;
      wrapped(w, h, x, y, Math.max(pw, ph), (xx, yy) => { g.fillStyle = d ? 'rgba(40,40,44,0.06)' : 'rgba(175,170,160,0.05)'; g.fillRect(xx, yy, pw, ph); g.strokeStyle = 'rgba(30,30,34,0.09)'; g.lineWidth = 1.2; g.strokeRect(xx, yy, pw, ph); });
    }
    for (let i = 0; i < 5200; i++) {                                  // aggregate speckle
      const x = r() * w, y = r() * h, v = r();
      g.fillStyle = v < 0.45 ? 'rgba(30,32,40,0.16)' : v < 0.88 ? 'rgba(206,204,200,0.12)' : 'rgba(238,236,230,0.18)';
      const s = 1 + (r() < 0.2 ? 1 : 0);
      wrapped(w, h, x, y, 2, (xx, yy) => g.fillRect(xx, yy, s, s));
    }
    g.strokeStyle = 'rgba(24,26,32,0.38)'; g.lineWidth = 1.2; g.lineCap = 'round';
    for (let i = 0; i < 5; i++) {                                     // tar-sealed cracks
      let x = 40 + r() * (w - 80), y = 40 + r() * (h - 80), a = r() * 6.28;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 10; k++) { a += (r() - 0.5) * 1.0; x += Math.cos(a) * (9 + r() * 14); y += Math.sin(a) * (9 + r() * 14); g.lineTo(x, y); }
      g.stroke();
    }
  }, { key: 'pt-asphalt', repeat: [1, 1], anisotropy: 8 });

  // ---- Nevsky slabs: large grey granite slabs ~0.93 x 0.7 m, running bond, 5 mm joints (2.8 m tile = 3 columns x 4 rows), a few pinkish / darker slabs (docs/research/streets.md P16, P23)
  T.slab = ctx.tex.draw(256, 256, (g, w, h) => {
    const r = rngOf(4451);
    g.fillStyle = '#76736e'; g.fillRect(0, 0, w, h);
    const cols = 3, rows = 4, bw = w / cols, bh = h / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh, v = 0.96 + r() * 0.07, k = r();
      const c = k < 0.1 ? [166, 156, 152] : k < 0.28 ? [150, 150, 147] : [158, 158, 153];
      g.fillStyle = `rgb(${Math.round(c[0] * v)},${Math.round(c[1] * v)},${Math.round(c[2] * v)})`;
      g.fillRect(x + 0.9, y + 0.9, bw - 1.8, bh - 1.8);
      for (let q = 0; q < 26; q++) { g.fillStyle = r() < 0.5 ? 'rgba(70,66,64,0.10)' : 'rgba(255,252,246,0.10)'; g.fillRect(x + r() * bw, y + r() * bh, 1.4, 1.4); }
    }
  }, { key: 'pt-slab', repeat: [1, 1], anisotropy: 8 });

  // ---- darker granite band along the Nevsky kerb: 0.5 m wide stones laid across, red-grey #8c6b66 / grey #5d5f62 mix (2 m tile)
  T.strip = ctx.tex.draw(128, 128, (g, w, h) => {
    const r = rngOf(3917);
    g.fillStyle = '#4f4d4c'; g.fillRect(0, 0, w, h);
    const n = 4, bw = w / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = 0.92 + r() * 0.16, red = r() < 0.4, c = red ? [140, 112, 108] : [104, 106, 108];
      g.fillStyle = `rgb(${Math.round(c[0] * v)},${Math.round(c[1] * v)},${Math.round(c[2] * v)})`; g.fillRect(i * bw + 0.8, j * bw + 0.8, bw - 1.6, bw - 1.6);
    }
  }, { key: 'pt-strip', repeat: [1, 1], anisotropy: 4 });

  // ---- small granite pavers 10 x 20 cm in running bond, grey #8f8c85 with a few warm ones, 12 mm joints (Ligovsky, the side streets; 1.6 m tile)
  T.paver = ctx.tex.draw(256, 256, (g, w, h) => {
    const r = rngOf(5503);
    g.fillStyle = '#5d5a56'; g.fillRect(0, 0, w, h);
    const cols = 8, rows = 16, bw = w / cols, bh = h / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh, v = 0.9 + r() * 0.2, warm = r() < 0.18;
      const c = warm ? [150, 134, 126] : [140, 138, 133];
      g.fillStyle = `rgb(${Math.round(c[0] * v)},${Math.round(c[1] * v)},${Math.round(c[2] * v)})`;
      g.fillRect(x + 0.9, y + 0.9, bw - 1.8, bh - 1.8);
    }
  }, { key: 'pt-paver', repeat: [1, 1], anisotropy: 8 });

  // ---- red-brown concrete block paving 10 x 20 cm, herringbone-ish running bond #8a4f46 (courtyards, footpaths; 1.6 m tile)
  T.brick = ctx.tex.draw(256, 256, (g, w, h) => {
    const r = rngOf(6203);
    g.fillStyle = '#4e3a34'; g.fillRect(0, 0, w, h);
    const cols = 8, rows = 16, bw = w / cols, bh = h / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh, v = 0.88 + r() * 0.24, c = r() < 0.2 ? [128, 98, 86] : [138, 79, 70];
      g.fillStyle = `rgb(${Math.round(c[0] * v)},${Math.round(c[1] * v)},${Math.round(c[2] * v)})`;
      g.fillRect(x + 0.9, y + 0.9, bw - 1.8, bh - 1.8);
    }
  }, { key: 'pt-brick', repeat: [1, 1], anisotropy: 8 });

  // ---- precast slabs 1 x 2 m, sand-beige #a89a7e with 2 cm gaps (footpaths across grass), 2 m tile
  T.sand = ctx.tex.draw(256, 256, (g, w, h) => {
    const r = rngOf(7001);
    g.fillStyle = '#6c6250'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      const v = 0.94 + r() * 0.12;
      g.fillStyle = `rgb(${Math.round(168 * v)},${Math.round(154 * v)},${Math.round(126 * v)})`; g.fillRect(i * w / 2 + 1.5, 1.5, w / 2 - 3, h - 3);
      for (let k = 0; k < 90; k++) { g.fillStyle = r() < 0.5 ? 'rgba(70,60,40,0.10)' : 'rgba(255,248,226,0.10)'; g.fillRect(i * w / 2 + r() * w / 2, r() * h, 1.5, 1.5); }
    }
  }, { key: 'pt-sand2', repeat: [1, 1], anisotropy: 8 });

  // ---- granite setts 10 x 10 cm laid in shallow fan arcs (embankment carriageways, bands beside the kerbs; 3.2 m tile)
  T.cobble = ctx.tex.draw(512, 512, (g, w, h) => {
    const r = rngOf(9301);
    g.fillStyle = '#4a4846'; g.fillRect(0, 0, w, h);
    const n = 32, s = w / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const sh = (j % 2 ? s / 2 : 0) + Math.sin(j / n * 6.283 * 2) * s * 0.4, v = 0.86 + r() * 0.28, k = r();
      const c = k < 0.15 ? [128, 118, 112] : [118, 118, 116];
      g.fillStyle = `rgb(${Math.round(c[0] * v)},${Math.round(c[1] * v)},${Math.round(c[2] * v)})`;
      const x = i * s + sh, y = j * s;
      for (const xx of [x, x - w]) { g.beginPath(); g.roundRect ? g.roundRect(xx + 1.2, y + 1.2, s - 2.4, s - 2.4, 3) : g.rect(xx + 1.2, y + 1.2, s - 2.4, s - 2.4); g.fill(); }
    }
  }, { key: 'pt-cobble', repeat: [1, 1], anisotropy: 8 });

  // ---- kerb granite: 1 m stones along u, joint line at the tile edge
  T.kerb = ctx.tex.draw(128, 32, (g, w, h) => {
    const r = rngOf(771);
    g.fillStyle = '#d2cfca'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 320; i++) { g.fillStyle = r() < 0.5 ? 'rgba(90,86,84,0.12)' : 'rgba(255,255,255,0.14)'; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    g.fillStyle = 'rgba(70,66,66,0.55)'; g.fillRect(0, 0, 2, h); g.fillRect(w - 1, 0, 1, h);
  }, { key: 'pt-kerb', repeat: [1, 1], anisotropy: 4 });

  // ---- sand / dust gutter along a kerb: u = 0 at the kerb -> 1 toward the road (1.6 m), v along (6 m tile), drifts and dark tyre-dust edge
  T.gutter = ctx.tex.draw(64, 256, (g, w, h) => {
    const r = rngOf(6121);
    const img = [];
    for (let y = 0; y < h; y++) {
      // slowly varying reach of the sand (0.35 .. 1.0 of the width)
      const reach = 0.42 + 0.34 * (0.5 + 0.5 * Math.sin(y / h * 6.283 * 3 + 1.1)) + 0.2 * (0.5 + 0.5 * Math.sin(y / h * 6.283 * 7 + 0.3));
      for (let x = 0; x < w; x++) {
        const u = x / w, f = Math.max(0, 1 - u / reach), a = 0.62 * f * f * (0.7 + 0.3 * r());
        g.fillStyle = `rgba(154,140,118,${a.toFixed(3)})`; g.fillRect(x, y, 1, 1);
      }
    }
    for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,108,88,0.35)' : 'rgba(205,194,170,0.35)'; g.fillRect(r() * w * 0.6, r() * h, 1.6, 1.6); }
    void img;
  }, { key: 'pt-gutter', anisotropy: 2 });

  // ---- tyre wear on one lane: u across the lane, two soft dark bands
  T.wear = ctx.tex.draw(128, 8, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const u = x / w; const a = 0.14 * Math.exp(-((u - 0.27) ** 2) / 0.0035) + 0.14 * Math.exp(-((u - 0.73) ** 2) / 0.0035) + 0.04 * Math.exp(-((u - 0.5) ** 2) / 0.05);
      g.fillStyle = `rgba(20,22,30,${a.toFixed(3)})`; g.fillRect(x, 0, 1, h);
    }
  }, { key: 'pt-wear', anisotropy: 2 });

  // ---- road paint with wear: alpha speckle / scuffs (the colour comes from the vertex colour), used for lines, zebra bars, arrows
  T.paint = ctx.tex.draw(128, 128, (g, w, h) => {
    const r = rngOf(8089);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 380; i++) { g.fillStyle = `rgba(0,0,0,${(0.25 + r() * 0.6).toFixed(2)})`; const s = 1 + r() * 4; g.fillRect(r() * w, r() * h, s, s * (0.5 + r())); }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(r() * w, r() * h, 8 + r() * 30, 2 + r() * 8); }
    g.globalCompositeOperation = 'source-over';
  }, { key: 'pt-paint', anisotropy: 4 });

  // ---- yellow tactile plate (dots), 0.5 m tile
  T.tactile = ctx.tex.draw(64, 64, (g, w, h) => {
    g.fillStyle = '#d9bd45'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(130,102,18,0.55)';
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(8 + i * 16, 8 + j * 16, 4.2, 0, 6.3); g.fill(); }
  }, { key: 'pt-tactile', repeat: [1, 1], anisotropy: 4 });

  // ---- bicycle pictogram (white on transparent), 1 x 1.6 m decal on the cycle track
  T.bike = ctx.tex.draw(128, 128, (g, w, h) => {
    g.strokeStyle = '#f2f0e8'; g.fillStyle = '#f2f0e8'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.arc(34, 88, 22, 0, 6.3); g.stroke(); g.beginPath(); g.arc(94, 88, 22, 0, 6.3); g.stroke();
    g.beginPath(); g.moveTo(34, 88); g.lineTo(54, 52); g.lineTo(84, 52); g.lineTo(94, 88); g.moveTo(54, 52); g.lineTo(66, 88); g.lineTo(34, 88); g.moveTo(66, 88); g.lineTo(84, 52); g.stroke();
    g.beginPath(); g.moveTo(50, 40); g.lineTo(62, 40); g.moveTo(84, 52); g.lineTo(88, 38); g.lineTo(100, 38); g.stroke();
  }, { key: 'pt-bike', anisotropy: 4 });

  // ---- soft light pool (night lamps): white radial falloff
  T.pool = ctx.tex.draw(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { key: 'pt-pool', anisotropy: 1 });

  return T;
}
