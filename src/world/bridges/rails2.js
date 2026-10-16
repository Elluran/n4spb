// bridges/rails2.js - the railing patterns of the Mars Field / Summer Garden bridges (docs/research/mars-bridges-canals.md section 3, photos refs/mars-bridges 53 55 60 72 89 12 37 43 66), the same
// technique as rails.js: white-on-clear canvas panels (alpha cut-out) tinted by the material colour.  Every kind with a gilded part has a twin kind whose name ends in `G` ("gold layer": only the
// gilded details, drawn into the same panel frame and stood 1.2 cm in front of the iron panel by B.railLine({ gold: true })):
//   lances    1st Engineer: short spear rods with diamond heads, a bar + a band of small rings, bottom feet, a trophy plaque (Medusa shield, crossed lances, wreath) in each bay
//   lances2   2nd Sadovy: the same with an S-scroll frieze at the top and a Greek-key band at the bottom (the Tarakanovka pattern)
//   lancesT   Panteleymonovsky: dense short darts with a hexagonal wreath plaque and crossed axes, gilded
//   lancesW   Bolshoy Konyushenny: dense darts, two wreaths pierced by spear shafts, gilded rail cap (the cap is drawn by railLine)
//   discs     1st Sadovy: a big disc medallion (rim with studs, 12-ring lattice, rosette) flanked by fan palmettes and crossed spears with laurel
//   wheel     Lower Swan: a spoked wheel / rosette medallion between two fans and leaf scrolls, plain top and bottom rails
//   aegis     Triple Bridge: round pikes with palmette buds, S brackets, a gilded aegis (Medusa mask on a shield + crescent) and palm leaves
//   whip      Troitsky: Art Nouveau S-whiplash scrolls with volute centres crossing in a lens pattern, a wide lower rail with oval eyes
// Sizes in metres at 400 px / m (PX of rails.js), y runs down from the top rail.
export const PATTERNS2 = {
  lances: { W: 2.2, H: 1.05 }, lancesG: { W: 2.2, H: 1.05 },
  lances2: { W: 2.2, H: 1.05 }, lances2G: { W: 2.2, H: 1.05 },
  lancesT: { W: 2.0, H: 1.05 }, lancesTG: { W: 2.0, H: 1.05 },
  lancesW: { W: 2.0, H: 1.0 }, lancesWG: { W: 2.0, H: 1.0 },
  discs: { W: 2.0, H: 1.0 }, discsG: { W: 2.0, H: 1.0 },
  wheel: { W: 2.2, H: 0.95 }, wheelG: { W: 2.2, H: 0.95 },
  aegis: { W: 2.0, H: 1.05 }, aegisG: { W: 2.0, H: 1.05 },
  whip: { W: 2.4, H: 1.1 },
  // the south-west reach (docs/research/sw-canals-bridges.md section 3)
  palmettes: { W: 2.0, H: 0.95 }, acacia: { W: 2.0, H: 1.0 }, rosettes: { W: 2.0, H: 1.0 }, fleur: { W: 2.4, H: 1.0 }, lyre: { W: 2.2, H: 1.0 }, arches: { W: 2.0, H: 0.95 },
  lancetarc: { W: 2.2, H: 1.1 }, trident: { W: 2.5, H: 1.1 }, hairpin: { W: 2.4, H: 1.1 }, ringbal: { W: 2.0, H: 1.15 }, hpipes: { W: 2.0, H: 1.1 }, barsring: { W: 2.25, H: 1.0 },   // the big bridges of the Petrograd side (docs/research/petro-bridges.md)
  hippocamp: { W: 2.8, H: 1.22 },                                                           // the Blagoveshchensky Bridge (docs/research/vo-bridges-wave1.md)
  hexlat: { W: 2.4, H: 1.0 }, ovalchain: { W: 2.0, H: 0.95 },                                 // Nalichny / Korablestroiteley (welded lattice of long hexagons) and the Novo-Andreevsky footbridge (a chain of loops), docs/research/vo-bridges-wave2.md
  plainrods: { W: 2.0, H: 1.0 }, hrods: { W: 2.0, H: 1.0 }, 'lattice-star': { W: 2.5, H: 1.0 }, 'x-net': { W: 2.2, H: 1.0 }, 'x-netG': { W: 2.2, H: 1.0 }, ovals: { W: 2.0, H: 1.0 }, ovalsG: { W: 2.0, H: 1.0 }, lattice: { W: 2.0, H: 0.95 },
};
const PX = 400;

export function paint2(g, W, H, kind) {
  const gold = kind.endsWith('G') && kind !== 'whip', base = gold ? kind.slice(0, -1) : kind;
  const p = (m) => m * PX;
  const w = W / PX, h = H / PX;
  g.clearRect(0, 0, W, H);
  const stroke = (fn) => {
    g.save(); g.translate(1.6, 1.6); g.fillStyle = '#8c8c8c'; g.strokeStyle = '#8c8c8c'; g.lineCap = 'round'; fn(); g.restore();
    g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineCap = 'round'; fn();
  };
  const ring = (x, y, r, t) => { g.lineWidth = p(t); g.beginPath(); g.arc(p(x), p(y), p(r), 0, 6.3); g.stroke(); };
  const disc = (x, y, r) => { g.beginPath(); g.arc(p(x), p(y), p(r), 0, 6.3); g.fill(); };
  const line = (x0, y0, x1, y1, t) => { g.lineWidth = p(t); g.beginPath(); g.moveTo(p(x0), p(y0)); g.lineTo(p(x1), p(y1)); g.stroke(); };
  const rect = (x0, y0, x1, y1) => g.fillRect(p(x0), p(y0), p(x1 - x0), p(y1 - y0));
  const bez = (x0, y0, c1x, c1y, c2x, c2y, x1, y1, t) => { g.lineWidth = p(t); g.beginPath(); g.moveTo(p(x0), p(y0)); g.bezierCurveTo(p(c1x), p(c1y), p(c2x), p(c2y), p(x1), p(y1)); g.stroke(); };
  const poly = (pts) => { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(p(q[0]), p(q[1])) : g.moveTo(p(q[0]), p(q[1])))); g.closePath(); g.fill(); };
  const ell = (x, y, rx, ry, a = 0) => { g.beginPath(); g.ellipse(p(x), p(y), p(rx), p(ry), a, 0, 6.3); g.fill(); };
  const head = (x, y0, hw, hl) => poly([[x, y0], [x + hw, y0 + hl * 0.55], [x, y0 + hl], [x - hw, y0 + hl * 0.55]]);   // diamond spear head
  const fan = (x, y, R, n, ang = Math.PI) => { for (let k = 0; k < n; k++) { const a = Math.PI + (k + 0.5) * ang / n; ell(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55, R * 0.5, R * 0.115, a); } disc(x, y, R * 0.16); };
  const petals = (x, y, R, n) => { for (let k = 0; k < n; k++) { const a = k * 6.283 / n; ell(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55, R * 0.45, R * 0.15, a); } disc(x, y, R * 0.22); };
  const volute = (x, y, r, t) => { g.lineWidth = p(t); g.beginPath(); for (let k = 0; k <= 30; k++) { const a = k * 0.28, rr = r * (1 - k / 36); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (k) g.lineTo(p(px), p(py)); else g.moveTo(p(px), p(py)); } g.stroke(); };
  /** the trophy plaque: shield with a Medusa mask, crossed lance + axe, laurel wreath; layer iron / gold */
  const trophy = (cx, cy, s) => {
    if (!gold) {
      line(cx - 0.26 * s, cy + 0.26 * s, cx + 0.26 * s, cy - 0.26 * s, 0.03 * s); line(cx - 0.26 * s, cy - 0.26 * s, cx + 0.26 * s, cy + 0.26 * s, 0.03 * s);
      ring(cx, cy + 0.01 * s, 0.2 * s, 0.035 * s);
      poly([[cx - 0.13 * s, cy - 0.16 * s], [cx + 0.13 * s, cy - 0.16 * s], [cx + 0.13 * s, cy + 0.04 * s], [cx, cy + 0.2 * s], [cx - 0.13 * s, cy + 0.04 * s]]);
      ell(cx + 0.06 * s, cy - 0.22 * s, 0.05 * s, 0.1 * s, 0.4);                                           // plume
    } else {
      g.lineWidth = p(0.016 * s); g.beginPath(); g.moveTo(p(cx - 0.13 * s), p(cy - 0.16 * s)); g.lineTo(p(cx + 0.13 * s), p(cy - 0.16 * s)); g.lineTo(p(cx + 0.13 * s), p(cy + 0.04 * s)); g.lineTo(p(cx), p(cy + 0.2 * s)); g.lineTo(p(cx - 0.13 * s), p(cy + 0.04 * s)); g.closePath(); g.stroke();
      disc(cx, cy - 0.03 * s, 0.065 * s);
      for (let k = 0; k < 8; k++) { const a = k * 0.785; disc(cx + Math.cos(a) * 0.085 * s, cy - 0.03 * s + Math.sin(a) * 0.085 * s, 0.012 * s); }
      disc(cx - 0.27 * s, cy - 0.27 * s, 0.025 * s); disc(cx + 0.27 * s, cy - 0.27 * s, 0.025 * s);
    }
  };
  stroke(() => {
    if (base === 'lances' || base === 'lances2') {
      const two = base === 'lances2';
      if (!gold) {
        rect(0, 0, w, 0.04);
        const n = Math.round(w / 0.11);
        for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; head(x, 0.07, 0.027, 0.15); line(x, 0.2, x, h - 0.15, 0.02); }
        rect(0, 0.17, w, 0.2); rect(0, 0.36, w, 0.385); rect(0, 0.455, w, 0.48);
        for (let i = 0; i < n; i++) { const x = (i + 1) * w / n; ring(x, 0.42, 0.026, 0.013); }
        rect(0, h - 0.2, w, h - 0.17);
        for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; poly([[x - 0.028, h - 0.17], [x + 0.028, h - 0.17], [x, h - 0.06]]); disc(x, h - 0.07, 0.016); }
        rect(0, h - 0.045, w, h);
        if (two) {
          for (let i = 0; i < 10; i++) { const x0 = i * w / 10; bez(x0 + 0.01, 0.1, x0 + 0.06, 0.02, x0 + 0.14, 0.12, x0 + w / 10 - 0.05, 0.05, 0.016); ring(x0 + w / 10 - 0.03, 0.065, 0.022, 0.012); }
          for (let i = 0; i < 20; i++) { const x = i * w / 20; line(x, h - 0.045, x, h - 0.02, 0.012); line(x, h - 0.02, x + w / 20 * 0.6, h - 0.02, 0.012); }
        }
      }
      trophy(w / 2, 0.62, 1.0);
    } else if (base === 'lancesT') {
      if (!gold) {
        rect(0, 0, w, 0.045); rect(0, 0.16, w, 0.19);
        const n = Math.round(w / 0.075);
        for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; head(x, 0.07, 0.02, 0.12); line(x, 0.17, x, h - 0.14, 0.017); }
        rect(0, h - 0.2, w, h - 0.17); rect(0, h - 0.05, w, h);
        ring(w / 2, 0.55, 0.23, 0.04);
        line(w / 2 - 0.3, 0.3, w / 2 + 0.3, 0.8, 0.03); line(w / 2 - 0.3, 0.8, w / 2 + 0.3, 0.3, 0.03);
      } else {
        g.lineWidth = p(0.02); g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * 1.047 + 0.52, X = w / 2 + Math.cos(a) * 0.2, Y = 0.55 + Math.sin(a) * 0.2; if (k) g.lineTo(p(X), p(Y)); else g.moveTo(p(X), p(Y)); } g.closePath(); g.stroke();
        disc(w / 2, 0.55, 0.075); for (let k = 0; k < 6; k++) { const a = k * 1.047; disc(w / 2 + Math.cos(a) * 0.12, 0.55 + Math.sin(a) * 0.12, 0.014); }
        ell(w / 2 - 0.32, 0.27, 0.05, 0.022, 0.6); ell(w / 2 + 0.32, 0.27, 0.05, 0.022, -0.6); ell(w / 2 - 0.32, 0.83, 0.05, 0.022, -0.6); ell(w / 2 + 0.32, 0.83, 0.05, 0.022, 0.6);
        for (let i = 0; i <= 5; i++) disc(i * w / 5, 0.03, 0.02);
      }
    } else if (base === 'lancesW') {
      if (!gold) {
        rect(0, 0, w, 0.04); rect(0, 0.17, w, 0.2);
        const n = Math.round(w / 0.09);
        for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; head(x, 0.06, 0.026, 0.14); line(x, 0.2, x, h - 0.12, 0.02); }
        rect(0, h - 0.17, w, h - 0.14); rect(0, h - 0.05, w, h);
        for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; poly([[x - 0.026, h - 0.14], [x + 0.026, h - 0.14], [x, h - 0.05]]); }
        for (const cx of [w * 0.27, w * 0.73]) line(cx - 0.25, 0.8, cx + 0.25, 0.3, 0.025);       // spear shafts piercing the wreaths
      } else {
        for (const cx of [w * 0.27, w * 0.73]) { ring(cx, 0.55, 0.15, 0.035); head(cx + 0.18, 0.2, 0.03, 0.14); ell(cx - 0.18, 0.8, 0.04, 0.02, 0.6); for (let k = 0; k < 12; k++) { const a = k * 0.5236; disc(cx + Math.cos(a) * 0.15, 0.55 + Math.sin(a) * 0.15, 0.016); } }
        for (let i = 0; i < 10; i++) disc((i + 0.5) * w / 10, 0.185, 0.018);
      }
    } else if (base === 'discs') {
      const cx = w / 2, cy = 0.5;
      if (!gold) {
        rect(0, 0, w, 0.04); rect(0, 0.07, w, 0.085); rect(0, h - 0.13, w, h - 0.1); rect(0, h - 0.05, w, h);
        ring(cx, cy, 0.31, 0.05); ring(cx, cy, 0.25, 0.012);
        for (let k = 0; k < 12; k++) { const a = k * 0.5236; ring(cx + Math.cos(a) * 0.14, cy + Math.sin(a) * 0.14, 0.085, 0.014); }
        petals(cx, cy, 0.11, 8);
        for (const sx of [-1, 1]) {
          fan(cx + sx * 0.6, 0.76, 0.34, 9);
          line(cx + sx * 0.34, 0.85, cx + sx * 0.96, 0.3, 0.028); head(cx + sx * 0.96 - 0.025, 0.2, 0.03, 0.15);
          ell(cx + sx * 0.78, 0.5, 0.05, 0.022, -sx * 0.9); ell(cx + sx * 0.7, 0.62, 0.05, 0.022, -sx * 0.9); ell(cx + sx * 0.86, 0.38, 0.05, 0.022, -sx * 0.9);
        }
        for (const sx of [0.04, w - 0.04]) { line(sx, 0.085, sx, h - 0.13, 0.03); }
      } else {
        for (let k = 0; k < 8; k++) { const a = k * 0.785; disc(cx + Math.cos(a) * 0.31, cy + Math.sin(a) * 0.31, 0.022); }
        disc(cx, cy, 0.04);
      }
    } else if (base === 'wheel') {
      const cx = w / 2, cy = 0.47;
      if (!gold) {
        rect(0, 0, w, 0.05); rect(0, h - 0.12, w, h - 0.085); rect(0, h - 0.045, w, h);
        ring(cx, cy, 0.3, 0.045); ring(cx, cy, 0.215, 0.014);
        for (let k = 0; k < 12; k++) { const a = k * 0.5236; line(cx + Math.cos(a) * 0.05, cy + Math.sin(a) * 0.05, cx + Math.cos(a) * 0.22, cy + Math.sin(a) * 0.22, 0.016); ell(cx + Math.cos(a + 0.26) * 0.255, cy + Math.sin(a + 0.26) * 0.255, 0.032, 0.014, a + 0.26); }
        disc(cx, cy, 0.06);
        for (const sx of [-1, 1]) {
          fan(cx + sx * 0.6, 0.66, 0.28, 7);
          volute(cx + sx * 0.88, 0.5, 0.08, 0.016); volute(cx + sx * 0.88, 0.76, 0.07, 0.016);
          line(cx + sx * 0.88, 0.5, cx + sx * 0.88, 0.76, 0.014);
        }
        for (const sx of [0.04, w - 0.04]) line(sx, 0.05, sx, h - 0.12, 0.03);
      } else {
        disc(cx, cy, 0.03);
        for (let k = 0; k < 12; k++) { const a = k * 0.5236; disc(cx + Math.cos(a) * 0.3, cy + Math.sin(a) * 0.3, 0.013); }
      }
    } else if (base === 'aegis') {
      const cx = w / 2;
      if (!gold) {
        rect(0, 0, w, 0.045); rect(0, h - 0.14, w, h - 0.115); rect(0, h - 0.03, w, h);
        const n = Math.round(w / 0.1);
        for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; ell(x, 0.095, 0.02, 0.04); line(x, 0.1, x, h - 0.12, 0.018); }
        for (let i = 0; i < 10; i++) volute((i + 0.5) * w / 10, h - 0.075, 0.035, 0.013);
        for (const sx of [-1, 1]) { bez(cx + sx * 0.3, 0.14, cx + sx * 0.12, 0.3, cx + sx * 0.46, 0.6, cx + sx * 0.3, 0.86, 0.03); volute(cx + sx * 0.3, 0.15, 0.06, 0.02); volute(cx + sx * 0.3, 0.86, 0.06, 0.02); }
        ell(cx, 0.52, 0.17, 0.2); 
      } else {
        disc(cx, 0.5, 0.1);
        for (let k = 0; k < 9; k++) { const a = Math.PI + (k + 0.5) * Math.PI / 9; ell(cx + Math.cos(a) * 0.17, 0.46 + Math.sin(a) * 0.17, 0.05, 0.012, a + 1.57); }
        g.lineWidth = p(0.025); g.beginPath(); g.arc(p(cx), p(0.3), p(0.06), 0.3, 2.84); g.stroke();
        for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) ell(cx + sx * (0.1 + k * 0.045), 0.62 + k * 0.05, 0.045, 0.014, sx * (0.5 + k * 0.2));
        const n = Math.round(w / 0.1); for (let i = 0; i < n; i++) ell((i + 0.5) * w / n, 0.095, 0.014, 0.03);
      }
    } else if (base === 'whip') {
      rect(0, 0, w, 0.06); rect(0, 0.74, w, 0.86);
      for (let i = 0; i < 2; i++) {
        const x0 = i * w / 2, ww = w / 2;
        for (const s of [1, -1]) {
          const xa = s > 0 ? x0 + 0.04 : x0 + ww - 0.04, xb = s > 0 ? x0 + ww - 0.04 : x0 + 0.04;
          bez(xa, 0.74, xa + s * 0.5, 0.74, xa + s * 0.3, 0.1, x0 + ww / 2 + s * 0.2, 0.2, 0.05);
          volute(x0 + ww / 2 + s * 0.2, 0.24, 0.1, 0.045);
          void xb;
        }
        for (let k = 0; k < 3; k++) { const x = x0 + (k + 0.5) * ww / 3; g.lineWidth = p(0.03); g.beginPath(); g.ellipse(p(x), p(0.95), p(0.09), p(0.06), 0, 0, 6.3); g.stroke(); }
      }
      rect(0, 1.04, w, h);
    } else if (base === 'palmettes') {                                   // Demidov: a continuous band of fan palmettes over a scroll frieze, rod-and-ring top rail
      rect(0, 0, w, 0.04); line(0, 0.1, w, 0.1, 0.02);
      const n = 6; for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; fan(x, 0.7, 0.33, 7); line(x, 0.62, x, 0.1, 0.014); }
      rect(0, 0.72, w, 0.745); for (let i = 0; i < 10; i++) volute((i + 0.5) * w / 10, 0.83, 0.05, 0.014);
      rect(0, h - 0.045, w, h);
    } else if (base === 'acacia') {                                      // Voznesensky: flat bars, a medallion (shield, crossed swords) and acacia sprigs per bay
      rect(0, 0, w, 0.045); rect(0, 0.08, w, 0.095); rect(0, h - 0.13, w, h - 0.1); rect(0, h - 0.045, w, h);
      const n = Math.round(w / 0.11); for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; line(x, 0.095, x, h - 0.13, 0.016); }
      ring(w / 2, 0.5, 0.22, 0.03); line(w / 2 - 0.15, 0.35, w / 2 + 0.15, 0.65, 0.025); line(w / 2 - 0.15, 0.65, w / 2 + 0.15, 0.35, 0.025); disc(w / 2, 0.5, 0.06);
      for (const sg of [-1, 1]) for (let k = 0; k < 4; k++) ell(w / 2 + sg * (0.3 + k * 0.1), 0.42 + (k % 2) * 0.1, 0.045, 0.014, sg * 0.5);
    } else if (base === 'rosettes') {                                    // Kokushkin: square bars, a round rosette per bay, a swag frieze under the top rail
      rect(0, 0, w, 0.045); rect(0, h - 0.05, w, h); rect(0, h - 0.14, w, h - 0.115);
      const n = Math.round(w / 0.12); for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; line(x, 0.1, x, h - 0.14, 0.018); }
      for (let i = 0; i < 5; i++) { const x0 = i * w / 5; g.lineWidth = p(0.014); g.beginPath(); g.moveTo(p(x0), p(0.07)); g.quadraticCurveTo(p(x0 + w / 10), p(0.2), p(x0 + w / 5), p(0.07)); g.stroke(); }
      ring(w / 2, 0.52, 0.17, 0.03); ring(w / 2, 0.52, 0.12, 0.012); petals(w / 2, 0.52, 0.1, 8);
    } else if (base === 'fleur') {                                       // Staro-Nikolsky: arches with fleur-de-lis finials over spear-blade tents, rosettes, C-scroll band
      rect(0, 0, w, 0.04); line(0, 0.2, w, 0.2, 0.02); rect(0, h - 0.045, w, h); line(0, h - 0.17, w, h - 0.17, 0.02);
      const n = 8; for (let i = 0; i < n; i++) {
        const x0 = i * w / n, x1 = x0 + w / n, xc = (x0 + x1) / 2;
        g.lineWidth = p(0.02); g.beginPath(); g.arc(p(xc), p(0.2), p(w / n / 2 - 0.01), Math.PI, 0); g.stroke();
        disc(xc, 0.12, 0.022); ell(xc - 0.035, 0.1, 0.03, 0.012, 0.6); ell(xc + 0.035, 0.1, 0.03, 0.012, -0.6);
        poly([[x0 + 0.02, h - 0.17], [xc, 0.26], [x1 - 0.02, h - 0.17], [xc + 0.02, h - 0.17], [xc, 0.34], [x0 + 0.04, h - 0.17]]);
        petals(x1, 0.55, 0.05, 4); volute(xc, h - 0.1, 0.04, 0.012);
      }
    } else if (base === 'lyre') {                                        // Dekabristov: lyre / S-scroll pairs around a tall loop, fleur finials on the top tube, scroll feet
      rect(0, 0, w, 0.05); rect(0, h - 0.04, w, h);
      const n = 4; for (let i = 0; i < n; i++) {
        const xc = (i + 0.5) * w / n, ww = w / n;
        for (const sg of [-1, 1]) { bez(xc + sg * 0.07, 0.9, xc + sg * 0.3, 0.8, xc + sg * 0.3, 0.2, xc + sg * 0.14, 0.2, 0.026); volute(xc + sg * 0.14, 0.26, 0.06, 0.02); }
        g.lineWidth = p(0.016); g.beginPath(); g.roundRect(p(xc - 0.05), p(0.2), p(0.1), p(0.7), p(0.05)); g.stroke();
        disc(xc, 0.05, 0.03); ell(xc - 0.045, 0.1, 0.03, 0.012, 0.6); ell(xc + 0.045, 0.1, 0.03, 0.012, -0.6);
        line(xc + ww / 2, 0.05, xc + ww / 2, h - 0.04, 0.026);
      }
    } else if (base === 'arches') {                                      // Kharlamov / Novo-Nikolsky / Kashin: thin round bars under a row of small round-headed arches
      rect(0, 0, w, 0.04); rect(0, h - 0.05, w, h);
      const n = Math.round(w / 0.22); for (let i = 0; i < n; i++) { const x0 = i * w / n; g.lineWidth = p(0.014); g.beginPath(); g.arc(p(x0 + w / n / 2), p(0.15), p(w / n / 2 - 0.01), Math.PI, 0); g.stroke(); }
      const m = Math.round(w / 0.11); for (let i = 0; i < m; i++) line((i + 0.5) * w / m, 0.15, (i + 0.5) * w / m, h - 0.05, 0.016);
      line(0, 0.15, w, 0.15, 0.014);
    } else if (base === 'plainrods') {                                   // Torgovy / Matveev / Krasnoflotsky: vertical rods between a top tube and a flat bottom rail
      rect(0, 0, w, 0.05); rect(0, h - 0.07, w, h);
      const n = Math.round(w / 0.12); for (let i = 0; i < n; i++) line((i + 0.5) * w / n, 0.05, (i + 0.5) * w / n, h - 0.07, 0.022);
    } else if (base === 'hrods') {                                       // Pikalov: horizontal steel rods on cast posts
      rect(0, 0, w, 0.05); for (const y of [0.22, 0.4, 0.58, 0.76]) rect(0, y, w, y + 0.03); rect(0, h - 0.06, w, h);
    } else if (base === 'lattice-star') {                                // Izmailovsky: diamond lattice with star rosettes at the crossings
      rect(0, 0, w, 0.06); rect(0, 0.065, w, 0.08); rect(0, h - 0.05, w, h);
      const d = 0.25; for (let k = -6; k < 14; k++) { line(k * d, 0.1, k * d + 0.85, h - 0.06, 0.02); line(k * d + 0.85, 0.1, k * d, h - 0.06, 0.02); }
      for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) { const x = i * d + 0.125 + (j % 2) * d / 2; if (x < w) petals(x, 0.28 + j * 0.2, 0.05, 6); }
    } else if (base === 'x-net') {                                       // Lviny: a net of crossed flat rods, figure-8 arcs top and bottom, gilded roundels at the crossings
      if (!gold) {
        rect(0, 0, w, 0.05); rect(0, h - 0.05, w, h);
        const d = 0.22; for (let k = -6; k < 14; k++) { line(k * d, 0.1, k * d + 0.7, h - 0.1, 0.014); line(k * d + 0.7, 0.1, k * d, h - 0.1, 0.014); }
        for (let i = 0; i < 10; i++) { const x = (i + 0.5) * w / 10; ring(x - 0.05, 0.075, 0.04, 0.012); ring(x + 0.05, 0.075, 0.04, 0.012); ring(x - 0.05, h - 0.075, 0.04, 0.012); ring(x + 0.05, h - 0.075, 0.04, 0.012); }
      } else for (let i = 0; i < 5; i++) for (const y of [0.35, 0.65]) { disc(i * w / 5 + w / 10, y, 0.045); }
    } else if (base === 'ovals') {                                       // Pochtamtsky: crossing ovals with bronzed rosettes, a band of rosettes along the top
      if (!gold) {
        rect(0, 0, w, 0.04); rect(0, h - 0.04, w, h);
        for (let i = 0; i < 5; i++) { const x = (i + 0.5) * w / 5; for (const a of [0.62, -0.62]) { g.lineWidth = p(0.014); g.beginPath(); g.ellipse(p(x), p(0.55), p(0.1), p(0.4), a, 0, 6.3); g.stroke(); } }
        line(0, 0.12, w, 0.12, 0.012);
      } else { for (let i = 0; i < 5; i++) petals((i + 0.5) * w / 5, 0.55, 0.045, 6); for (let i = 0; i < 14; i++) disc((i + 0.5) * w / 14, 0.08, 0.022); }
    } else if (base === 'lattice') {                                     // Fontanka type: diamond lattice with a rosette per bay (Krasnogvardeysky)
      rect(0, 0, w, 0.06); rect(0, h - 0.05, w, h);
      const d = 0.2; for (let k = -6; k < 14; k++) { line(k * d, 0.08, k * d + 0.6, h - 0.05, 0.016); line(k * d + 0.6, 0.08, k * d, h - 0.05, 0.016); }
      for (let i = 0; i < 4; i++) petals((i + 0.5) * w / 4, 0.5, 0.07, 8);
    } else if (base === 'trident') {                                     // Birzhevoy: square bars with alternating spear tips under a flat rail; in the middle of the bay a pair of fluted posts holding a ring with Neptune's trident
      rect(0, 0, w, 0.07); rect(0, h - 0.07, w, h);
      const n = Math.round(w / 0.115), xc = w / 2;
      for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; if (Math.abs(x - xc) < 0.34) continue; const y0 = i % 2 ? 0.12 : 0.2; head(x, y0, 0.03, 0.13); line(x, y0 + 0.1, x, h - 0.07, 0.022); }
      line(0, 0.36, xc - 0.34, 0.36, 0.02); line(xc + 0.34, 0.36, w, 0.36, 0.02);
      for (const sx of [-1, 1]) {                                        // the paired posts with gear-like caps
        const x = xc + sx * 0.29; rect(x - 0.055, 0.1, x + 0.055, h - 0.07); rect(x - 0.08, 0.07, x + 0.08, 0.13); rect(x - 0.075, h - 0.16, x + 0.075, h - 0.07); disc(x, 0.05, 0.05);
      }
      g.lineWidth = p(0.045); g.beginPath(); g.ellipse(p(xc), p(0.58), p(0.2), p(0.27), 0, 0, 6.3); g.stroke();
      disc(xc, 0.27, 0.04); disc(xc, 0.89, 0.04);
      line(xc, 0.4, xc, 0.8, 0.03); line(xc - 0.1, 0.56, xc + 0.1, 0.56, 0.026);                                    // the trident: shaft, crossbar, three prongs with spear tips
      for (const dx of [-0.1, 0, 0.1]) { line(xc + dx, 0.56, xc + dx, 0.43, 0.022); head(xc + dx, 0.36, 0.028, 0.09); }
    } else if (base === 'hairpin') {                                     // Tuchkov: flat bars bent into tall narrow hairpin loops, alternately closed at the top and at the bottom, set skewed so that neighbours overlap
      rect(0, 0, w, 0.09); rect(0, h - 0.06, w, h);
      const n = Math.round(w / 0.15), pw = w / n;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * pw, up = i % 2 === 0, y0 = up ? 0.13 : 0.2, y1 = up ? h - 0.13 : h - 0.08, r = pw * 0.42;
        g.lineWidth = p(0.02); g.beginPath();
        if (up) { g.moveTo(p(x - r - 0.02), p(y1)); g.lineTo(p(x - r + 0.03), p(y0 + r)); g.arc(p(x + 0.03), p(y0 + r), p(r), Math.PI, 0); g.lineTo(p(x + r - 0.02), p(y1)); }
        else { g.moveTo(p(x - r + 0.03), p(y0)); g.lineTo(p(x - r - 0.02), p(y1 - r)); g.arc(p(x - 0.02), p(y1 - r), p(r), Math.PI, 0, true); g.lineTo(p(x + r + 0.03), p(y0)); }
        g.stroke();
      }
    } else if (base === 'ringbal') {                                     // Sampsonievsky: rounded top rail, a frieze of touching pearl-studded rings, plain round balusters with small collars
      rect(0, 0, w, 0.08); line(0, 0.245, w, 0.245, 0.02); rect(0, h - 0.06, w, h);
      const n = Math.round(w / 0.125); for (let i = 0; i < n; i++) { const x = (i + 0.5) * w / n; ring(x, 0.16, 0.052, 0.018); disc(x + w / n / 2, 0.16, 0.014); }
      const m = Math.round(w / 0.12); for (let i = 0; i < m; i++) { const x = (i + 0.5) * w / m; line(x, 0.25, x, h - 0.06, 0.03); rect(x - 0.024, 0.52, x + 0.024, 0.55); rect(x - 0.024, h - 0.12, x + 0.024, h - 0.06); }
    } else if (base === 'lancetarc') {                                   // Bolshoy Krestovsky: slender balusters with small capitals under interlaced pointed arches (each arch spans two bays), a low rail with short feet
      rect(0, 0, w, 0.06); rect(0, h - 0.05, w, h); rect(0, h - 0.23, w, h - 0.2);
      const n = Math.round(w / 0.17), pw = w / n;
      for (let i = 0; i <= n; i++) { const x = i * pw; line(x, 0.31, x, h - 0.2, 0.026); rect(x - 0.024, 0.3, x + 0.024, 0.335); line(x, h - 0.2, x, h - 0.05, 0.036); }
      g.lineWidth = p(0.02);
      for (let i = -1; i < n; i++) { const x0 = i * pw, x1 = x0 + 2 * pw, xm = x0 + pw; g.beginPath(); g.moveTo(p(x0), p(0.31)); g.quadraticCurveTo(p(x0 + 0.02), p(0.11), p(xm), p(0.075)); g.quadraticCurveTo(p(x1 - 0.02), p(0.11), p(x1), p(0.31)); g.stroke(); }
    } else if (base === 'hpipes') {                                      // (named hpipes, not tubes: tools/roads-furniture-audit.mjs reads `tub` in a mesh name as a planter tub)
      //                                       // plain modern tube railing: posts and four horizontal tubes (Malo-Petrovsky type), also the thin bar railings of the Zhdanovka footbridges
      rect(0, 0, w, 0.06); for (const y of [0.3, 0.52, 0.74]) rect(0, y, w, y + 0.035); rect(0, h - 0.05, w, h); rect(w / 2 - 0.03, 0, w / 2 + 0.03, h);
    } else if (base === 'barsring') {                                    // Krasnogo Kursanta: plain vertical bars under a double top rail that holds a row of small rings
      rect(0, 0, w, 0.05); rect(0, 0.17, w, 0.2); rect(0, h - 0.05, w, h);
      const n = Math.round(w / 0.16); for (let i = 0; i < n; i++) ring((i + 0.5) * w / n, 0.11, 0.05, 0.016);
      const m = Math.round(w / 0.13); for (let i = 0; i < m; i++) line((i + 0.5) * w / m, 0.2, (i + 0.5) * w / m, h - 0.05, 0.022);
    } else if (base === 'hexlat') {                                      // Nalichny / Korablestroiteley (photo n05, cropped and looked at): a flat top rail and a base rail, between them a chain of TALL hexagons with vertical sides (a point at the top and at the bottom) that share their sides, 0.30 m wide, flat bars
      // (review, photo n05 enlarged 10x) the real bay is NOT a pointed hexagon: between two full-height flat bars (pitch 0.37 m) stands a narrow tall inner rectangle (x 0.34 .. 0.68 of the bay, 15 % / 13 % of the field
      // below the top / above the bottom rail) whose four corners are tied to the bars' ends on the rails by 4 diagonals: the field reads as a chain of tall hexagons with a flat-bottomed V notch at top and bottom
      rect(0, 0, w, 0.055); rect(0, 0.075, w, 0.095); rect(0, h - 0.07, w, h);
      const n = Math.max(1, Math.round(w / 0.37)), cw = w / n, y0 = 0.17, y1 = h - 0.07, fh = y1 - y0, ct = 0.155 * fh, cb = 0.13 * fh, a0 = 0.34 * cw, a1 = 0.68 * cw, t = 0.026;
      for (let i = 0; i < n; i++) {
        const x0 = i * cw, x1 = x0 + cw;
        g.lineWidth = p(t); g.beginPath(); g.rect(p(x0 + a0), p(y0 + ct), p(a1 - a0), p(fh - ct - cb)); g.stroke();                       // the inner rectangle
        line(x0, y0, x0 + a0, y0 + ct, t); line(x1, y0, x0 + a1, y0 + ct, t); line(x0, y1, x0 + a0, y1 - cb, t); line(x1, y1, x0 + a1, y1 - cb, t);   // the four diagonals
      }
      for (let i = 0; i <= n; i++) line(i * cw, y0, i * cw, y1, t + 0.004);                                                                  // the full-height bars
    } else if (base === 'ovalchain') {                                   // Novo-Andreevsky footbridge (photos f01 f02): a forged chain of tall loops with small rings between, under a plain handrail
      rect(0, 0, w, 0.04); rect(0, h - 0.07, w, h);
      const n = Math.round(w / 0.17), cw = w / n;
      for (let i = 0; i < n; i++) { const x = (i + 0.5) * cw; g.lineWidth = p(0.016); g.beginPath(); g.ellipse(p(x), p(0.47), p(0.085), p(0.34), 0, 0, 6.3); g.stroke(); ring(x + cw / 2, 0.47, 0.034, 0.012); }
      line(0, 0.12, w, 0.12, 0.012);
    } else if (base === 'hippocamp') {                                   // Blagoveshchensky (1850 pattern): two sea-horses with curled fish tails face a trident on a scallop shell, woven into acanthus scrolls; scroll friezes above and below the framed field [photo b05]
      const xc = w / 2, mv = (x, y, r, t, sx) => { g.save(); g.translate(p(x), 0); g.scale(sx, 1); g.translate(-p(x), 0); volute(x, y, r, t); g.restore(); };
      rect(0, 0, w, 0.07); rect(0, 0.07, w, 0.1);
      const nf = Math.round(w / 0.19);
      for (let i = 0; i < nf; i++) { const x = (i + 0.5) * w / nf; mv(x - 0.045, 0.235, 0.065, 0.017, 1); mv(x + 0.045, 0.235, 0.065, 0.017, -1); ell(x, 0.26, 0.025, 0.05, 0); disc(x, 0.19, 0.016); }
      line(0.08, 0.31, w - 0.08, 0.31, 0.035); line(0.08, 0.9, w - 0.08, 0.9, 0.035); line(0.08, 0.31, 0.08, 0.9, 0.035); line(w - 0.08, 0.31, w - 0.08, 0.9, 0.035);
      fan(xc, 0.86, 0.2, 9);                                             // the scallop shell under the trident
      line(xc, 0.42, xc, 0.78, 0.03); line(xc - 0.1, 0.57, xc + 0.1, 0.57, 0.028);
      for (const dx of [-0.1, 0, 0.1]) { line(xc + dx, 0.57, xc + dx, 0.45, 0.022); head(xc + dx, 0.37, 0.03, 0.1); }
      for (const s of [-1, 1]) {
        const hx = xc + s * 0.25;
        ell(hx, 0.53, 0.085, 0.05, -s * 0.5); ell(xc + s * 0.19, 0.58, 0.055, 0.032, -s * 0.35);     // the head and the snout (facing the trident)
        poly([[hx + s * 0.03, 0.47], [hx + s * 0.07, 0.38], [hx + s * 0.09, 0.48]]);                // an ear
        bez(hx + s * 0.02, 0.56, xc + s * 0.34, 0.58, xc + s * 0.41, 0.64, xc + s * 0.42, 0.75, 0.1);   // the arched neck
        bez(xc + s * 0.42, 0.75, xc + s * 0.55, 0.82, xc + s * 0.7, 0.82, xc + s * 0.86, 0.72, 0.075); // the body running into the tail
        for (let k = 0; k < 4; k++) ell(xc + s * (0.31 + 0.028 * k), 0.5 + 0.035 * k, 0.045, 0.014, s * 1.1);   // the mane
        ell(xc + s * 0.33, 0.77, 0.075, 0.022, s * 0.6); ell(xc + s * 0.3, 0.82, 0.06, 0.02, s * 0.25); // fore fins
        mv(xc + s * 0.98, 0.68, 0.17, 0.05, s); ell(xc + s * 0.88, 0.58, 0.06, 0.03, s * 0.9);           // the curled tail and its fin
        mv(xc + s * 1.2, 0.62, 0.15, 0.03, -s); petals(xc + s * 1.13, 0.47, 0.085, 6); petals(xc + s * 0.62, 0.43, 0.07, 5);
        bez(xc + s * 0.5, 0.44, xc + s * 0.68, 0.33, xc + s * 0.86, 0.46, xc + s * 1.04, 0.36, 0.022);                // acanthus vines with leaves and tendrils fill the field
        for (let k = 0; k < 5; k++) ell(xc + s * (0.56 + 0.1 * k), 0.4 + 0.02 * ((k % 2) * 2 - 1), 0.05, 0.02, s * (0.5 - k * 0.2));
        mv(xc + s * 0.58, 0.84, 0.075, 0.02, s); mv(xc + s * 1.05, 0.83, 0.07, 0.02, -s); mv(xc + s * 0.14, 0.4, 0.05, 0.016, -s);
        bez(xc + s * 0.1, 0.78, xc + s * 0.2, 0.9, xc + s * 0.42, 0.86, xc + s * 0.6, 0.78, 0.02);
      }
      rect(0, 0.93, w, 0.955);
      const nb = Math.round(w / 0.16);
      for (let i = 0; i < nb; i++) { const x = (i + 0.5) * w / nb; mv(x - 0.035, 1.03, 0.05, 0.014, 1); mv(x + 0.035, 1.03, 0.05, 0.014, -1); }
      rect(0, h - 0.07, w, h);
    }
  });
}
