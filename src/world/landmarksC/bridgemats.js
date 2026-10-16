// landmarksC/bridgemats.js - canvas textures and materials of the Anichkov Bridge: pink-red granite courses (photos refs/fontanka 01 02 15), the water-line stained pier granite,
// red granite pavement slabs, the brick of the vault, the three cast-iron railing panels (photos 05 09 10: Greek-key frame, naiads with a scallop shell and sea-dragons, sea-horses,
// dolphins; gunmetal green #4e6d5c, lit #6f9079) and the little signs ("3.4" clearance plate, boat pictogram, the NW pedestal plaque, shell scars).
// Colours: rapakivi granite #b98c7e (shade) / #cf9d8c (sun); railing #3f5a50 ... #7aa08a; vault soffit #2a2724 (research section B / modelling spec 5).
const rngOf = (ctx, k) => ctx.rng('lmC-' + k);

export function makeBridgeMats(ctx) {
  const T = ctx.mat.toon, tex = ctx.tex;
  const M = {};

  // ------------------------------------------------------------------ granite: 2.2 m square tile, 4 courses of 0.55 m, blocks 1.1 - 1.7 m
  const graniteDraw = (stain) => (g, w, h) => {
    const r = rngOf(ctx, stain ? 'pier' : 'granite');
    g.fillStyle = '#efe6e2'; g.fillRect(0, 0, w, h);
    const rows = 4, rh = h / rows;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 150;
      while (x < w) {
        const bw = 150 + r() * 130, k = 0.9 + r() * 0.12;
        g.fillStyle = `rgb(${Math.round(240 * k)},${Math.round(228 * k)},${Math.round(224 * k)})`; g.fillRect(x + 1.5, j * rh + 1.5, bw - 3, rh - 3);
        for (let s = 0; s < 40; s++) { g.fillStyle = r() < 0.5 ? 'rgba(120,70,60,0.16)' : 'rgba(255,245,240,0.22)'; g.fillRect(x + r() * bw, j * rh + r() * rh, 2 + r() * 3, 2 + r() * 2); }
        x += bw;
      }
    }
    g.fillStyle = 'rgba(70,40,34,0.62)';
    for (let j = 0; j < rows; j++) g.fillRect(0, j * rh - 1.5, w, 3.5);
    // vertical joints
    const r2 = rngOf(ctx, stain ? 'pier-j' : 'granite-j');
    for (let j = 0; j < rows; j++) { let x = r2() * 120 + (j % 2) * 90; while (x < w) { g.fillRect(x - 1.5, j * rh, 3.5, rh); x += 150 + r2() * 130; } }
    if (stain) {
      // the dark water line (tile bottom = y -3.55 m, water at -3.2 = 0.16 of the 2.2 m tile): slime band below it, a damp fringe above
      const wl = h * (1 - 0.159);
      const gr = g.createLinearGradient(0, wl - 110, 0, h);
      gr.addColorStop(0, 'rgba(60,70,48,0)'); gr.addColorStop(0.45, 'rgba(52,62,44,0.55)'); gr.addColorStop(1, 'rgba(26,36,32,0.88)');
      g.fillStyle = gr; g.fillRect(0, wl - 110, w, h - wl + 110);
      for (let i = 0; i < 40; i++) { const x = r() * w, hh = 6 + r() * 16; g.strokeStyle = `rgba(${70 + Math.round(r() * 40)},${100 + Math.round(r() * 40)},50,${0.3 + r() * 0.35})`; g.lineWidth = 1.5 + r() * 1.5; g.beginPath(); g.moveTo(x, wl + 4); g.lineTo(x + (r() - 0.5) * 8, wl - hh); g.stroke(); }
    }
  };
  M.texGranite = tex.draw(512, 512, graniteDraw(false), { key: 'lmC-granite', repeat: [1, 1], anisotropy: 8 });
  M.texPier = tex.draw(512, 512, graniteDraw(true), { key: 'lmC-pier', repeat: [1, 1], anisotropy: 8 });
  M.granite = T('#cfa496', { map: M.texGranite, paint: 0.05, name: 'lmC-granite' });
  M.pier = T('#cfa496', { map: M.texPier, paint: 0.04, name: 'lmC-pier' });
  M.coping = T('#cfa595', { paint: 0.05, name: 'lmC-coping' });
  M.graniteDark = T('#8e6a60', { paint: 0.04, name: 'lmC-granite-dark' });
  M.cap = T('#3a3d3f', { paint: 0.03, name: 'lmC-tumba-cap' });
  M.bronzePlinth = T('#2c2f2c', { paint: 0.03, name: 'lmC-bronze-plinth' });

  // ------------------------------------------------------------------ pavement slabs 2.4 x 2.4 m tile (1.2 x 0.8 m slabs)
  M.texPave = tex.draw(512, 512, (g, w, h) => {
    const r = rngOf(ctx, 'pave');
    g.fillStyle = '#e8d8d0'; g.fillRect(0, 0, w, h);
    const rows = 3, rh = h / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < 2; i++) {
      const x = i * w / 2 + (j % 2) * w / 4, k = 0.9 + r() * 0.13;
      for (const dx of [0, -w]) { g.fillStyle = `rgb(${Math.round(236 * k)},${Math.round(216 * k)},${Math.round(208 * k)})`; g.fillRect(x + dx + 2, j * rh + 2, w / 2 - 4, rh - 4); }
      for (let s = 0; s < 30; s++) { g.fillStyle = r() < 0.5 ? 'rgba(120,70,60,0.14)' : 'rgba(255,245,240,0.2)'; g.fillRect(x + r() * w / 2, j * rh + r() * rh, 2 + r() * 3, 2 + r() * 2); }
    }
    g.fillStyle = 'rgba(80,50,44,0.5)';
    for (let j = 0; j < rows; j++) g.fillRect(0, j * rh - 1.5, w, 3);
    for (let j = 0; j < rows; j++) for (const x of [(j % 2) * w / 4, w / 2 + (j % 2) * w / 4]) g.fillRect(x - 1.5, j * rh, 3, rh);
  }, { key: 'lmC-pave', repeat: [1, 1], anisotropy: 8 });
  M.pave = T('#c6aa9e', { map: M.texPave, paint: 0.04, name: 'lmC-pave' });
  M.kerb = T('#a98678', { paint: 0.04, name: 'lmC-kerb' });

  // ------------------------------------------------------------------ vault: dark brick
  M.texBrick = tex.draw(256, 256, (g, w, h) => {
    const r = rngOf(ctx, 'brick');
    g.fillStyle = '#5e4640'; g.fillRect(0, 0, w, h);
    const rows = 16, rh = h / rows;
    for (let j = 0; j < rows; j++) { for (let i = 0; i < 8; i++) { const x = i * 32 + (j % 2) * 16, k = 0.8 + r() * 0.4; g.fillStyle = `rgb(${Math.round(112 * k)},${Math.round(76 * k)},${Math.round(64 * k)})`; g.fillRect(x + 1, j * rh + 1, 30, rh - 2); } }
  }, { key: 'lmC-brick', repeat: [1, 1] });
  M.vault = T('#6a5a58', { map: M.texBrick, paint: 0.03, name: 'lmC-vault' });

  // ------------------------------------------------------------------ asphalt, markings
  M.asphalt = T('#5a5d60', { paint: 0.07, name: 'lmC-asphalt' });
  M.mark = ctx.mat.decal('#f1f1ec', { name: 'lmC-mark' });
  M.markY = ctx.mat.decal('#e8c548', { name: 'lmC-mark-y' });

  // ------------------------------------------------------------------ railing: three cast-iron panels (alpha cut-out), 1.75 x 1.0 m = 512 x 292 px
  const GREEN = '#4e6d5c', LIGHT = '#7aa08a', DARK = '#2f4a40';
  const iron = (g, fn) => { g.save(); g.translate(2.5, 2.5); g.fillStyle = DARK; g.strokeStyle = DARK; fn(); g.restore(); g.fillStyle = GREEN; g.strokeStyle = GREEN; fn(); };
  const meander = (g, x0, x1, y, hh, step) => {                        // Greek key band (openwork): a square spiral per step
    g.lineWidth = 3.4; g.lineCap = 'butt';
    for (let x = x0; x + step <= x1 + 0.1; x += step) {
      g.beginPath(); const s = step, h2 = hh;
      g.moveTo(x, y + h2); g.lineTo(x, y); g.lineTo(x + s * 0.78, y); g.lineTo(x + s * 0.78, y + h2 * 0.74); g.lineTo(x + s * 0.28, y + h2 * 0.74); g.lineTo(x + s * 0.28, y + h2 * 0.34); g.lineTo(x + s * 0.52, y + h2 * 0.34); g.stroke();
      g.beginPath(); g.moveTo(x + s * 0.78, y + h2); g.lineTo(x + s, y + h2); g.stroke();
    }
  };
  const frame = (g, w, h, relief) => {
    g.clearRect(0, 0, w, h);
    iron(g, () => {
      g.fillRect(0, 0, w, 20); g.fillRect(0, h - 22, w, 22); g.fillRect(0, 20, 14, h - 42); g.fillRect(w - 14, 20, 14, h - 42);   // outer rails and posts
      g.fillRect(14, 20, w - 28, 6); g.fillRect(14, h - 28, w - 28, 6);                                                         // inner lips
      g.fillRect(14, 62, w - 28, 5); g.fillRect(14, h - 70, w - 28, 5);                                                         // inner field border
      g.fillRect(14, 62, 5, h - 132); g.fillRect(w - 19, 62, 5, h - 132);
      meander(g, 24, w - 24, 33, 22, 22); meander(g, 24, w - 24, h - 61, 22, 22);                                                // Greek key bands
      for (const [cx, cy] of [[24, 40], [w - 24, 40], [24, h - 46], [w - 24, h - 46]]) { g.beginPath(); g.arc(cx, cy, 8, 0, 6.3); g.fill(); }   // corner rosettes
      relief(g);
    });
  };
  const naiad = (g, cx, dir) => {                                      // seated naiad (torso, head, arm to the shell, fish tail curling under)
    g.beginPath(); g.ellipse(cx, 168, 20, 30, 0, 0, 6.3); g.fill();                                   // torso
    g.beginPath(); g.arc(cx, 130, 12, 0, 6.3); g.fill();                                              // head
    g.beginPath(); g.ellipse(cx + dir * 4, 124, 13, 8, 0, 3.14, 6.3); g.fill();                       // hair
    g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + dir * 12, 150); g.quadraticCurveTo(cx + dir * 36, 138, cx + dir * 42, 126); g.stroke();   // raised arm
    g.beginPath(); g.moveTo(cx - dir * 12, 156); g.quadraticCurveTo(cx - dir * 30, 176, cx - dir * 34, 196); g.stroke();                                          // other arm
    g.lineWidth = 11; g.beginPath(); g.moveTo(cx, 190); g.quadraticCurveTo(cx - dir * 30, 214, cx - dir * 56, 204); g.quadraticCurveTo(cx - dir * 70, 196, cx - dir * 60, 182); g.stroke();   // tail
    g.beginPath(); g.moveTo(cx - dir * 62, 176); g.lineTo(cx - dir * 80, 168); g.lineTo(cx - dir * 70, 192); g.closePath(); g.fill();
  };
  const dragon = (g, cx, dir) => {                                     // sea-dragon: scaled coil, fan fins, a head with an open jaw
    g.lineWidth = 15; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - dir * 30, 214); g.quadraticCurveTo(cx - dir * 6, 150, cx + dir * 14, 196); g.quadraticCurveTo(cx + dir * 26, 214, cx + dir * 36, 188); g.stroke();
    g.lineWidth = 10; g.beginPath(); g.moveTo(cx + dir * 36, 188); g.quadraticCurveTo(cx + dir * 44, 150, cx + dir * 30, 124); g.stroke();
    g.beginPath(); g.ellipse(cx + dir * 26, 118, 16, 9, dir * 0.4, 0, 6.3); g.fill();
    for (const a of [-0.5, 0.2, 0.9]) { g.beginPath(); g.moveTo(cx - dir * 6, 174); g.lineTo(cx - dir * 6 + Math.cos(a) * 30 * dir, 174 - 34 - Math.sin(a) * 10); g.lineTo(cx - dir * 6 + Math.cos(a) * 12 * dir, 174); g.fill(); }
    g.beginPath(); g.moveTo(cx - dir * 30, 214); g.lineTo(cx - dir * 50, 200); g.lineTo(cx - dir * 44, 224); g.closePath(); g.fill();
  };
  const hippocamp = (g, cx, dir) => {                                  // sea-horse: horse head and forelegs, scaled coiled tail
    g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - dir * 40, 204); g.quadraticCurveTo(cx - dir * 20, 150, cx + dir * 20, 168); g.stroke();
    g.beginPath(); g.moveTo(cx - dir * 40, 204); g.quadraticCurveTo(cx - dir * 66, 214, cx - dir * 54, 188); g.stroke();
    g.lineWidth = 13; g.beginPath(); g.moveTo(cx + dir * 20, 168); g.quadraticCurveTo(cx + dir * 36, 140, cx + dir * 34, 124); g.stroke();
    g.beginPath(); g.ellipse(cx + dir * 42, 116, 18, 9, dir * 0.5, 0, 6.3); g.fill();
    g.lineWidth = 6; g.beginPath(); g.moveTo(cx + dir * 22, 168); g.lineTo(cx + dir * 46, 188); g.moveTo(cx + dir * 14, 176); g.lineTo(cx + dir * 34, 198); g.stroke();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(cx + dir * (24 + i * 4), 148 - i * 8, 8, 3, dir * 0.8, 0, 6.3); g.fill(); }
  };
  const dolphin = (g, cx, dir) => {
    g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - dir * 50, 214); g.quadraticCurveTo(cx - dir * 6, 118, cx + dir * 40, 188); g.stroke();
    g.beginPath(); g.moveTo(cx - dir * 50, 214); g.lineTo(cx - dir * 70, 196); g.lineTo(cx - dir * 62, 226); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(cx - dir * 6, 142); g.lineTo(cx + dir * 12, 120); g.lineTo(cx + dir * 14, 152); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(cx + dir * 54, 192, 12, 6, dir * 0.4, 0, 6.3); g.fill();
    g.lineWidth = 5; g.beginPath(); g.moveTo(cx + dir * 30, 176); g.lineTo(cx + dir * 52, 168); g.stroke();
    g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(cx - dir * (10 + i * 12), 204 - i * 4, 7, 0, 6.3); g.stroke(); }
  };
  const shell = (g, cx) => { g.beginPath(); g.moveTo(cx, 200); for (let i = 0; i <= 14; i++) { const a = Math.PI + i / 14 * Math.PI; g.lineTo(cx + Math.cos(a) * 36, 200 + Math.sin(a) * 52); } g.closePath(); g.fill();
    g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 3; for (let i = 1; i < 7; i++) { const a = Math.PI + i / 7 * Math.PI; g.beginPath(); g.moveTo(cx, 198); g.lineTo(cx + Math.cos(a) * 33, 200 + Math.sin(a) * 48); g.stroke(); } g.restore(); };
  const mk = (key, relief) => tex.draw(512, 292, (g, w, h) => frame(g, w, h, relief), { key: 'lmC-rail-' + key, repeat: [1, 1], anisotropy: 8 });
  M.texRail = [
    mk('a', (g) => { naiad(g, 214, 1); naiad(g, 298, -1); shell(g, 256); dragon(g, 120, -1); dragon(g, 392, 1); }),
    mk('b', (g) => { hippocamp(g, 150, 1); hippocamp(g, 362, -1); shell(g, 256); }),
    mk('c', (g) => { dolphin(g, 140, 1); dolphin(g, 372, -1); shell(g, 256); }),
  ];
  M.rail = M.texRail.map((m, i) => { const mat = T('#ffffff', { map: m, alphaTest: 0.5, side: 'double', paint: 0.02, name: 'lmC-rail-' + i }); return mat; });
  M.railSolid = T('#4e6d5c', { paint: 0.04, name: 'lmC-rail-solid' });
  M.railPost = T('#3f5a50', { paint: 0.03, name: 'lmC-rail-post' });

  // ------------------------------------------------------------------ signs
  M.texClear = tex.draw(128, 256, (g, w, h) => {                       // the red-framed "3.4" clearance plate
    g.fillStyle = '#d0242e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f6f4ee'; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#16181a'; tex.fitText(g, '3.4', w / 2, h * 0.5, w * 0.8, h * 0.4, tex.FONTS.sans, 800);
    g.fillStyle = '#d0242e'; g.fillRect(10, h * 0.16, w - 20, 4); g.fillRect(10, h * 0.84, w - 20, 4);
  }, { key: 'lmC-sign-3.4', repeat: [1, 1] });
  M.texBoat = tex.draw(128, 128, (g, w, h) => {                        // blue square with a white boat pictogram (generic)
    g.fillStyle = '#1b5fb0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f6f4ee'; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = '#f6f4ee'; g.beginPath(); g.moveTo(24, 74); g.lineTo(104, 74); g.lineTo(92, 96); g.lineTo(36, 96); g.closePath(); g.fill();
    g.fillRect(48, 52, 34, 20); g.fillRect(56, 38, 12, 14); g.fillRect(28, 102, 72, 5);
  }, { key: 'lmC-sign-boat', repeat: [1, 1] });
  M.texAnchor = tex.draw(128, 128, (g, w, h) => {                      // anchor prohibited: white disc, red ring and slash, black anchor
    g.clearRect(0, 0, w, h); const c = w / 2;
    g.fillStyle = '#f4f2ec'; g.beginPath(); g.arc(c, c, 62, 0, 6.3); g.fill();
    g.strokeStyle = '#d0242e'; g.lineWidth = 12; g.beginPath(); g.arc(c, c, 56, 0, 6.3); g.stroke();
    g.strokeStyle = '#1b1f20'; g.fillStyle = '#1b1f20'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.arc(c, 34, 8, 0, 6.3); g.stroke(); g.beginPath(); g.moveTo(c, 42); g.lineTo(c, 98); g.stroke(); g.beginPath(); g.moveTo(c - 15, 55); g.lineTo(c + 15, 55); g.stroke();
    g.beginPath(); g.arc(c, 80, 28, 0.15, Math.PI - 0.15); g.stroke();
    g.strokeStyle = '#d0242e'; g.lineWidth = 10; g.beginPath(); g.moveTo(c - 44, c - 44); g.lineTo(c + 44, c + 44); g.stroke();
  }, { key: 'lmC-sign-anchor', repeat: [1, 1] });
  M.signClear = T('#ffffff', { map: M.texClear, name: 'lmC-sign-clear' });
  M.signBoat = T('#ffffff', { map: M.texBoat, name: 'lmC-sign-boat' });
  M.signAnchor = T('#ffffff', { map: M.texAnchor, alphaTest: 0.5, name: 'lmC-sign-anchor' });
  // foam of the cutwaters: a ring of bubbles round the nose and a wash that streams downstream (canvas top = upstream)
  M.texFoam = tex.draw(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); const r = rngOf(ctx, 'foam');
    const gr = g.createRadialGradient(w / 2, 70, 30, w / 2, 70, 74); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(w / 2, 70, 76, 0, 6.3); g.fill();
    for (let i = 0; i < 4; i++) { const x = w / 2 + (i - 1.5) * 26, y0 = 80 + i % 2 * 10, gl = g.createLinearGradient(0, y0, 0, h); gl.addColorStop(0, 'rgba(255,255,255,0.8)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = gl; g.lineWidth = 12 - Math.abs(i - 1.5) * 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + (i - 1.5) * 14, (y0 + h) / 2, x + (i - 1.5) * 26, h - 6); g.stroke(); }
    for (let i = 0; i < 90; i++) { const a = r() * 6.3, d = 30 + r() * 52; g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`; g.beginPath(); g.arc(w / 2 + Math.cos(a) * d, 70 + Math.sin(a) * d, 1.5 + r() * 3, 0, 6.3); g.fill(); }
  }, { key: 'lmC-foam', repeat: [1, 1] });
  M.foam = ctx.mat.emissive('#eef6fa', 1.0, { map: M.texFoam, transparent: true, opacity: 0.85, depthWrite: false, name: 'lmC-foam' });
  M.foam.polygonOffset = true; M.foam.polygonOffsetFactor = -3; M.foam.polygonOffsetUnits = -6;
  M.plaque = T('#4a4234', { paint: 0.02, polygonOffset: -2, name: 'lmC-plaque' });
  M.scar = ctx.mat.decal('#3c2c28', { name: 'lmC-scar' });
  M.black = T('#1c1f21', { paint: 0.02, name: 'lmC-black' });
  return M;
}
