// streets/signs.js - THE ROAD SIGNS of the scene: Russian GOST R 52290-2004 faces drawn on canvases (crisp, antialiased, the right proportions and colours), one source for every consumer
// (signals.js crossings / mast arms / parking / lane signs, stops.js bus stops, extras.js bay signs, wires.js). furn.js makePanels packs the canvases into the shared sign atlas pages, so a sign
// is a 2-triangle quad on a pole: add a face here, never in a consumer. docs/rules/SIGNS-AND-PLATES.md lists the signs and how to mount them.
//   code     sign                                          class II size (m)   backing
//   5.19     pedestrian crossing 5.19.1 / 5.19.2           0.70 square         fluorescent yellow-green frame (0.05 m each side: 0.80 overall)
//   1.22     warning 'pedestrian crossing'                  0.90 triangle       fluorescent yellow-green backing triangle (1.0 overall)
//   2.1      main road                                      0.70 diamond        -
//   2.4      give way                                       0.90 triangle (point down)
//   2.5      stop                                           0.70 octagon
//   3.1      no entry                                       0.70 disc
//   3.2      no vehicles                                    0.70 disc
//   3.24.N   speed limit N km/h                             0.70 disc
//   3.27     no stopping                                    0.70 disc
//   3.28     no parking                                     0.70 disc
//   4.1.1 .. 4.1.6   direction of movement (straight, right, left, straight + right, straight + left, right + left)   0.70 disc
//   4.5      pedestrian and cycle track (shared)            0.70 disc
//   5.5      one-way road                                   0.70 square
//   5.15.2   direction of movement in the lane (straight)   0.70 x 0.90 rectangle (hangs over the carriageway: 0.9)
//   5.16     bus / trolleybus stop                          0.70 square
//   6.4      parking                                        0.70 square
//   6.16     stop line plate 'СТОП'                         0.50 x 0.25 plate
//   8.4      plates under 6.4: taxi / coach bay             0.70 x 0.35 plates (the P square above, the plate below: tex 'bay-taxi', 'bay-coach')
// Colours (GOST R 52290 retroreflective films, drawn a little lighter for the toon look): red #d3171e, blue #1558a8, yellow #f4c20d, fluorescent yellow-green #cfe32a, white #f6f6f1, black #1a1a1c.
// No logos, no flags.
const RED = '#d3171e', BLUE = '#1558a8', YEL = '#f4c20d', LIME = '#cfe32a', WHITE = '#f6f6f1', BLACK = '#1a1a1c';

/** class II sizes in metres: [width, height] of the quad (backing frames included) */
export const SIGN_SIZE = {
  '5.19': [0.8, 0.8], '1.22': [1.0, 0.9], '2.1': [0.99, 0.99], '2.4': [0.9, 0.78], '2.5': [0.7, 0.7], '3.1': [0.7, 0.7], '3.2': [0.7, 0.7], '3.24': [0.7, 0.7], '3.27': [0.7, 0.7], '3.28': [0.7, 0.7],
  '4.1': [0.7, 0.7], '4.5': [0.7, 0.7], '5.5': [0.7, 0.7], '5.15.2': [0.7, 0.9], '5.16': [0.7, 0.7], '5.17': [0.7, 0.7], '6.4': [0.7, 0.7], '6.16': [0.5, 0.25], 'bay': [0.6, 0.9], 'chevron': [0.4, 0.8],
};
/** shape of a sign (the mount draws a round back plate for discs, a rectangular one otherwise) */
export const SIGN_ROUND = new Set(['3.1', '3.2', '3.24', '3.27', '3.28', '4.1', '4.5']);

export function makeSigns(ctx) {
  const F = ctx.tex.FONTS, cache = new Map();
  const draw = (key, w, h, fn) => { let t = cache.get(key); if (!t) { t = ctx.tex.draw(w, h, (g) => { g.clearRect(0, 0, w, h); fn(g, w, h); }, { key: 'pt-gost-' + key, anisotropy: 8 }); cache.set(key, t); } return t; };
  const poly = (g, pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } };
  const disc = (g, cx, cy, r, fill) => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); };
  const ring = (g, cx, cy, r, wd, col) => { g.beginPath(); g.arc(cx, cy, r - wd / 2, 0, Math.PI * 2); g.lineWidth = wd; g.strokeStyle = col; g.stroke(); };
  const rr = (g, x, y, w, h, r, fill) => { ctx.tex.roundRect(g, x, y, w, h, r); g.fillStyle = fill; g.fill(); };
  /** a rounded triangle (corner radius r) through three points, filled */
  const tri = (g, a, b, c, r, fill) => { g.beginPath(); g.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); g.arcTo(b[0], b[1], c[0], c[1], r); g.arcTo(c[0], c[1], a[0], a[1], r); g.arcTo(a[0], a[1], b[0], b[1], r); g.closePath(); g.fillStyle = fill; g.fill(); };

  /** the walking pedestrian of the GOST pictograms (faces right): figure height h, feet on y0, centred on cx. Round-capped strokes, so the limbs read at any size. */
  const walker = (g, cx, y0, h, col) => {
    const u = h, X = (v) => cx + v * u, Y = (v) => y0 - (0.46 - v) * u;          // v: figure units, 0 = hip level, -0.54 = top of the head, +0.46 = feet
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    const seg = (pts, wd) => { g.lineWidth = wd * u; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); };
    disc(g, X(0.075), Y(-0.455), 0.088 * u, col);                                 // head
    seg([[0.045, -0.335], [-0.02, -0.05]], 0.16);                                // torso, leaning forward
    seg([[-0.02, -0.04], [0.14, 0.17], [0.15, 0.43]], 0.125);                    // front leg
    seg([[-0.02, -0.04], [-0.14, 0.2], [-0.25, 0.42]], 0.125);                   // back leg
    seg([[0.03, -0.29], [0.17, -0.14], [0.23, -0.04]], 0.1);                     // front arm (forward)
    seg([[0.03, -0.29], [-0.09, -0.15], [-0.16, -0.06]], 0.1);                   // back arm
  };
  /** the zebra of the 5.19 / 1.22 pictograms: black bars standing on the base of the triangle */
  const zebra = (g, x0, x1, y0, y1, n, col) => { const bw = (x1 - x0) / (n * 2 - 1); for (let k = 0; k < n; k++) { g.fillStyle = col; g.fillRect(x0 + k * 2 * bw, y0, bw, y1 - y0); } };
  /** arrows (white, thick): drawn into a unit box centred at (cx, cy), size s; dir 'up' / 'left' / 'right' */
  const arrow = (g, cx, cy, s, dir, col) => {
    g.save(); g.translate(cx, cy); g.rotate(dir === 'right' ? Math.PI / 2 : dir === 'left' ? -Math.PI / 2 : 0);
    poly(g, [[0, -0.5 * s], [0.30 * s, -0.12 * s], [0.12 * s, -0.12 * s], [0.12 * s, 0.5 * s], [-0.12 * s, 0.5 * s], [-0.12 * s, -0.12 * s], [-0.30 * s, -0.12 * s]], col); g.restore();
  };
  /** the bent arrows of 4.1.x: a stem from the bottom with a branch to the side (right / left) ending in a head */
  const turnArrow = (g, cx, cy, s, side, col) => {
    const k = side === 'right' ? 1 : -1;
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'butt'; g.lineJoin = 'miter';
    g.lineWidth = 0.22 * s; g.beginPath(); g.moveTo(cx, cy + 0.5 * s); g.lineTo(cx, cy + 0.05 * s); g.lineTo(cx + k * 0.27 * s, cy - 0.22 * s); g.stroke();
    // head at the end of the branch, pointing up-and-sideways
    const hx = cx + k * 0.27 * s, hy = cy - 0.22 * s;
    g.save(); g.translate(hx, hy); g.rotate(k > 0 ? Math.PI / 4 : -Math.PI / 4);
    poly(g, [[0, -0.2 * s], [0.24 * s, 0.1 * s], [-0.24 * s, 0.1 * s]], col); g.restore();
  };

  const S = {};
  // ------------------------------------------------------------------ 5.19.1 / 5.19.2 pedestrian crossing (blue square, white triangle, black pedestrian, zebra) on the fluorescent frame
  S['5.19'] = () => draw('5.19', 256, 256, (g, w, h) => {
    rr(g, 0, 0, w, h, 14, LIME);
    rr(g, 16, 16, 224, 224, 5, WHITE);                      // the thin white edge of the sign
    rr(g, 21, 21, 214, 214, 3, BLUE);
    const a = [128, 40], b = [212, 196], c = [44, 196];
    tri(g, a, b, c, 7, WHITE);
    walker(g, 124, 176, 92, BLACK);
    zebra(g, 66, 190, 178, 194, 5, BLACK);
  });
  // ------------------------------------------------------------------ 1.22 warning triangle on the fluorescent backing
  S['1.22'] = () => draw('1.22', 256, 230, (g, w, h) => {
    tri(g, [128, 4], [252, 226], [4, 226], 12, LIME);
    tri(g, [128, 20], [238, 212], [18, 212], 9, WHITE);
    tri(g, [128, 20], [238, 212], [18, 212], 9, RED);
    tri(g, [128, 56], [212, 190], [44, 190], 4, WHITE);
    walker(g, 124, 172, 78, BLACK);
    zebra(g, 68, 188, 172, 186, 5, BLACK);
  });
  // ------------------------------------------------------------------ 2.1 main road: white diamond, thin black line, yellow centre
  S['2.1'] = () => draw('2.1', 256, 256, (g, w, h) => {
    const d = (r, fill) => poly(g, [[128, 128 - r], [128 + r, 128], [128, 128 + r], [128 - r, 128]], fill);
    d(126, WHITE); d(100, BLACK); d(95, WHITE); d(82, YEL);
  });
  // ------------------------------------------------------------------ 2.4 give way: red-bordered triangle point down
  S['2.4'] = () => draw('2.4', 256, 222, (g, w, h) => {
    tri(g, [4, 4], [252, 4], [128, 218], 14, WHITE);
    tri(g, [14, 10], [242, 10], [128, 208], 12, RED);
    tri(g, [56, 40], [200, 40], [128, 166], 5, WHITE);
  });
  // ------------------------------------------------------------------ 2.5 stop: red octagon, white edge, STOP (СТОП)
  S['2.5'] = () => draw('2.5', 256, 256, (g, w, h) => {
    const oct = (r, fill) => poly(g, Array.from({ length: 8 }, (_, k) => { const t = Math.PI / 8 + k * Math.PI / 4; return [128 + r * Math.sin(t), 128 - r * Math.cos(t)]; }), fill);
    oct(138, WHITE); oct(126, RED);
    g.fillStyle = WHITE; g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, 'СТОП', 128, 132, 190, 78, F.sans, 800);
  });
  // ------------------------------------------------------------------ 3.1 no entry
  S['3.1'] = () => draw('3.1', 256, 256, (g) => { disc(g, 128, 128, 126, WHITE); disc(g, 128, 128, 118, RED); rr(g, 36, 104, 184, 48, 3, WHITE); });
  // ------------------------------------------------------------------ 3.2 no vehicles
  S['3.2'] = () => draw('3.2', 256, 256, (g) => { disc(g, 128, 128, 126, WHITE); disc(g, 128, 128, 118, RED); disc(g, 128, 128, 90, WHITE); });
  // ------------------------------------------------------------------ 3.24.N speed limit
  S['3.24'] = (v = 40) => draw('3.24.' + v, 256, 256, (g) => {
    disc(g, 128, 128, 126, WHITE); disc(g, 128, 128, 118, RED); disc(g, 128, 128, 86, WHITE);
    g.fillStyle = BLACK; g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, String(v), 128, 134, 124, 100, F.sans, 800);
  });
  // ------------------------------------------------------------------ 3.27 no stopping (two diagonals), 3.28 no parking (one diagonal)
  const noStop = (key, both) => draw(key, 256, 256, (g) => {
    disc(g, 128, 128, 126, WHITE); disc(g, 128, 128, 118, RED); disc(g, 128, 128, 94, BLUE);
    g.save(); g.beginPath(); g.arc(128, 128, 96, 0, Math.PI * 2); g.clip();
    g.strokeStyle = RED; g.lineWidth = 24; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(52, 52); g.lineTo(204, 204); g.stroke();
    if (both) { g.beginPath(); g.moveTo(204, 52); g.lineTo(52, 204); g.stroke(); }
    g.restore();
  });
  S['3.27'] = () => noStop('3.27', true);
  S['3.28'] = () => noStop('3.28', false);
  // ------------------------------------------------------------------ 4.1.x direction of movement: blue disc, thin white edge, white arrows
  const dirSign = (n, fn) => draw('4.1.' + n, 256, 256, (g) => { disc(g, 128, 128, 126, WHITE); disc(g, 128, 128, 120, BLUE); fn(g); });
  S['4.1.1'] = () => dirSign(1, (g) => arrow(g, 128, 128, 170, 'up', WHITE));
  S['4.1.2'] = () => dirSign(2, (g) => turnArrow(g, 112, 128, 170, 'right', WHITE));
  S['4.1.3'] = () => dirSign(3, (g) => turnArrow(g, 144, 128, 170, 'left', WHITE));
  S['4.1.4'] = () => dirSign(4, (g) => { arrow(g, 108, 128, 170, 'up', WHITE); turnArrow(g, 108, 128, 170, 'right', WHITE); });
  S['4.1.5'] = () => dirSign(5, (g) => { arrow(g, 148, 128, 170, 'up', WHITE); turnArrow(g, 148, 128, 170, 'left', WHITE); });
  S['4.1.6'] = () => dirSign(6, (g) => { turnArrow(g, 128, 132, 170, 'right', WHITE); turnArrow(g, 128, 132, 170, 'left', WHITE); });
  // ------------------------------------------------------------------ 4.5 pedestrian and cycle track (shared): pedestrian + cyclist on blue
  S['4.5'] = () => draw('4.5', 256, 256, (g) => {
    disc(g, 128, 128, 126, WHITE); disc(g, 128, 128, 120, BLUE);
    walker(g, 170, 198, 112, WHITE);
    g.strokeStyle = WHITE; g.fillStyle = WHITE; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 8;
    g.beginPath(); g.arc(70, 176, 24, 0, 6.3); g.stroke(); g.beginPath(); g.arc(126, 176, 24, 0, 6.3); g.stroke();
    g.beginPath(); g.moveTo(70, 176); g.lineTo(88, 142); g.lineTo(116, 142); g.lineTo(126, 176); g.moveTo(88, 142); g.lineTo(98, 176); g.lineTo(70, 176); g.moveTo(116, 142); g.lineTo(112, 128); g.lineTo(126, 128); g.stroke();
    g.lineWidth = 10; g.beginPath(); g.moveTo(84, 128); g.lineTo(98, 128); g.stroke();
    disc(g, 108, 106, 9, WHITE);
    g.lineWidth = 12; g.beginPath(); g.moveTo(104, 120); g.lineTo(96, 142); g.stroke();
  });
  // ------------------------------------------------------------------ 5.5 one-way road
  S['5.5'] = () => draw('5.5', 256, 256, (g) => { rr(g, 0, 0, 256, 256, 14, WHITE); rr(g, 6, 6, 244, 244, 10, BLUE); arrow(g, 128, 128, 188, 'up', WHITE); });
  // ------------------------------------------------------------------ 5.15.2 direction of movement in the lane (blue rectangle 0.7 x 0.9)
  S['5.15.2'] = () => draw('5.15.2', 256, 330, (g, w, h) => { rr(g, 0, 0, w, h, 12, WHITE); rr(g, 6, 6, w - 12, h - 12, 8, BLUE); arrow(g, 128, 170, 220, 'up', WHITE); });
  // ------------------------------------------------------------------ 5.16 bus / trolleybus stop
  S['5.16'] = () => draw('5.16', 256, 256, (g, w, h) => {
    rr(g, 0, 0, w, h, 14, WHITE); rr(g, 6, 6, w - 12, h - 12, 10, BLUE);
    rr(g, 44, 44, 168, 168, 12, WHITE);                                      // the white square with the bus (front view)
    g.fillStyle = BLUE;
    ctx.tex.roundRect(g, 66, 62, 124, 118, 16); g.fill();                    // body
    rr(g, 78, 74, 100, 44, 8, WHITE);                                         // windscreen
    disc(g, 90, 148, 11, WHITE); disc(g, 166, 148, 11, WHITE);                // lights
    g.fillRect(70, 174, 30, 26); g.fillRect(156, 174, 30, 26);                // wheels
    g.fillRect(104, 156, 48, 8);                                              // grille
  });
  // ------------------------------------------------------------------ 5.17 tram stop (a tram with its pantograph on the contact wire)
  S['5.17'] = () => draw('5.17', 256, 256, (g, w, h) => {
    rr(g, 0, 0, w, h, 14, WHITE); rr(g, 6, 6, w - 12, h - 12, 10, BLUE);
    rr(g, 44, 44, 168, 168, 12, WHITE);                                      // the white square with the tram (front view)
    g.fillStyle = BLUE;
    g.fillRect(58, 62, 140, 7);                                              // the contact wire
    g.lineWidth = 7; g.strokeStyle = BLUE; g.beginPath(); g.moveTo(112, 92); g.lineTo(138, 69); g.stroke();       // the pantograph arm
    ctx.tex.roundRect(g, 74, 88, 108, 88, 14); g.fill();                     // body
    rr(g, 86, 98, 84, 36, 6, WHITE);                                          // windscreen
    disc(g, 98, 156, 9, WHITE); disc(g, 158, 156, 9, WHITE);                  // lights
    g.fillRect(64, 184, 128, 7);                                              // the rails
    g.fillRect(84, 176, 12, 10); g.fillRect(160, 176, 12, 10);               // bogies
  });
  // ------------------------------------------------------------------ 6.4 parking
  S['6.4'] = () => draw('6.4', 256, 256, (g, w, h) => {
    rr(g, 0, 0, w, h, 14, WHITE); rr(g, 6, 6, w - 12, h - 12, 10, BLUE);
    g.fillStyle = WHITE; g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, 'P', 128, 138, 150, 190, F.sans, 800);
  });
  // ------------------------------------------------------------------ 6.16 stop line plate
  S['6.16'] = () => draw('6.16', 256, 128, (g, w, h) => {
    rr(g, 0, 0, w, h, 12, BLACK); rr(g, 5, 5, w - 10, h - 10, 8, WHITE);
    g.fillStyle = BLACK; g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, 'СТОП', 128, 68, 200, 86, F.sans, 800);
  });
  // ------------------------------------------------------------------ 6.4 over an 8.x plate: taxi rank / coach bay (the P square on top, the plate below), 256 x 384
  const bay = (key, plate) => draw(key, 256, 384, (g, w, h) => {
    rr(g, 0, 0, w, 256, 14, WHITE); rr(g, 6, 6, w - 12, 244, 10, BLUE);
    g.fillStyle = WHITE; g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, 'P', 128, 136, 150, 190, F.sans, 800);
    rr(g, 0, 262, w, 122, 10, BLACK); rr(g, 5, 267, w - 10, 112, 6, WHITE);
    plate(g, w);
  });
  S['bay-taxi'] = () => bay('bay-taxi', (g, w) => {
    g.fillStyle = BLACK; for (let k = 0; k < 9; k++) { g.fillRect(14 + k * 26, 276, 13, 13); g.fillRect(27 + k * 26, 289, 13, 13); }       // the checker band
    g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, 'ТАКСИ', 128, 340, 210, 56, F.sans, 800);
  });
  S['bay-coach'] = () => bay('bay-coach', (g, w) => {
    g.fillStyle = BLACK; ctx.tex.roundRect(g, 52, 276, 152, 56, 10); g.fill();
    g.fillStyle = WHITE; for (let k = 0; k < 4; k++) g.fillRect(62 + k * 34, 284, 26, 22);
    g.fillStyle = BLACK; g.beginPath(); g.arc(88, 336, 9, 0, 6.3); g.arc(168, 336, 9, 0, 6.3); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle'; ctx.tex.fitText(g, 'АВТОБУСЫ', 128, 358, 224, 30, F.sans, 800);
  });
  // ------------------------------------------------------------------ red-white chevron post plate (vertical marking 2.x on traffic islands), 64 x 128
  S['chevron'] = () => draw('chevron', 64, 128, (g, w, h) => {
    g.fillStyle = WHITE; g.fillRect(0, 0, w, h); g.fillStyle = RED;
    for (let k = 0; k < 4; k++) { const y = 10 + k * 30; g.beginPath(); g.moveTo(0, y); g.lineTo(w / 2, y + 16); g.lineTo(w, y); g.lineTo(w, y + 12); g.lineTo(w / 2, y + 28); g.lineTo(0, y + 12); g.closePath(); g.fill(); }
    g.strokeStyle = BLACK; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
  });
  return { tex: (code, arg) => { const f = S[code]; if (!f) throw new Error('unknown sign ' + code); return f(arg); }, size: (code) => { const p = code.split('.'); for (let n = p.length; n > 0; n--) { const v = SIGN_SIZE[p.slice(0, n).join('.')]; if (v) return v; } return [0.7, 0.7]; }, codes: Object.keys(S) };
}
