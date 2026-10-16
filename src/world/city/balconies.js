// balconies.js - the black cast-iron railings of Petersburg: stone balcony slabs on the piano nobile (long, cantilevered, 3 bays, with console brackets), the iron roof railing
// along the cornice (snow guards, architecture.md E / nevsky.md "Roof railing: black iron fence 0.8 m high along the whole cornice"), and the railing texture (alpha cut-out cards).
// Slabs are vertex-coloured boxes (batched); railings are double-sided alpha-tested cards on the no-outline layer (outline pass cannot see cut-outs).
import { CORNICE_H } from './cornice.js';

export function railingTexture(ctx) {
  return ctx.tex.draw(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 2, w, 10);                                 // top rail
    g.fillRect(0, h - 16, w, 9);                            // bottom rail
    g.fillRect(0, h - 40, w, 3);                            // mid rail
    for (let x = 5; x < w; x += 16) g.fillRect(x, 11, 6, h - 25);                     // bars
    g.lineWidth = 3; g.strokeStyle = '#ffffff';
    for (let x = 0; x < w; x += 64) { g.beginPath(); g.arc(x + 32, h * 0.52, 15, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x + 32, h * 0.52, 6, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill(); }
    for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, 8, 4, 0, Math.PI * 2); g.fill(); }
  }, { key: 'piter-railing', repeat: [1, 1] });
}

const card = (B, x0, z0, x1, z1, y0, y1, nx, nz, tiles) => {
  const a = B.vert(x0, y0, z0, nx, 0, nz, 0, 0), b = B.vert(x1, y0, z1, nx, 0, nz, tiles, 0), c = B.vert(x1, y1, z1, nx, 0, nz, tiles, 1), d = B.vert(x0, y1, z0, nx, 0, nz, 0, 1);
  B.quad(a, b, c, d);
};

export function buildBalconies(ctx, { M, info }) {
  const sB = (x, z) => M.core(x, z), rB = (x, z) => M.rails(x, z);
  let nBal = 0, nRoof = 0;
  for (const rec of info) {
    const { b, st } = rec;
    const col = st.trim.clone().multiplyScalar(0.93);
    const dark = st.trim.clone().multiplyScalar(0.75);
    for (const w of rec.walls) {
      if (!w.bal || !w.bal.length) continue;
      const yF = w.base + w.plinth + w.G;                      // floor line of the piano nobile
      for (const g of w.bal) {
        const s0 = g.b0 * w.bw - 0.25, s1 = g.b1 * w.bw + 0.25, len = s1 - s0, mid = (s0 + s1) / 2;
        const cx = w.a[0] + w.dx * mid, cz = w.a[1] + w.dz * mid;
        const D = 0.95;
        if (typeof process !== 'undefined' && process.env && process.env.CITY_DEBUG && len > 7) console.log('[bigbal]', b.id, w.id, 'len', len.toFixed(1), 'N', w.N, 'bw', w.bw.toFixed(2), 'wlen', w.len.toFixed(1), 'at', Math.round(cx), Math.round(cz));
        // slab 0.22 thick, the top at the floor line; console brackets under both ends
        sB(cx, cz).boxLite([cx, yF - 0.17, cz], w.dx, w.dz, w.nx, w.nz, len, 0.22, D, col);
        for (const sd of [-1, 1]) { const ex = w.a[0] + w.dx * (mid + sd * (len / 2 - 0.35)), ez = w.a[1] + w.dz * (mid + sd * (len / 2 - 0.35)); sB(cx, cz).boxLite([ex, yF - 0.75, ez], w.dx, w.dz, w.nx, w.nz, 0.3, 0.58, 0.55, dark, false); }
        // railing on the front and the two returns
        const R = rB(cx, cz), y0 = yF + 0.06, y1 = yF + 1.0;
        const fx0 = w.a[0] + w.dx * s0 + w.nx * (D - 0.03), fz0 = w.a[1] + w.dz * s0 + w.nz * (D - 0.03), fx1 = w.a[0] + w.dx * s1 + w.nx * (D - 0.03), fz1 = w.a[1] + w.dz * s1 + w.nz * (D - 0.03);
        card(R, fx0, fz0, fx1, fz1, y0, y1, w.nx, w.nz, len / 1.0);
        card(R, w.a[0] + w.dx * s0 + w.nx * 0.05, w.a[1] + w.dz * s0 + w.nz * 0.05, fx0, fz0, y0, y1, -w.dx, -w.dz, D / 1.0);
        card(R, fx1, fz1, w.a[0] + w.dx * s1 + w.nx * 0.05, w.a[1] + w.dz * s1 + w.nz * 0.05, y0, y1, w.dx, w.dz, D / 1.0);
        nBal++;
      }
    }
    // roof railing along the street pieces
    if (st.railing) {
      for (const ring of rec.rings) {
        if (ring.hole) continue;
        for (const e of ring.edges) {
          if (!e.street) continue;
          for (const pc of e.pieces) {
            if (pc.yLow > 0.2 || pc.t1 - pc.t0 < 2) continue;
            const y0 = Math.max(0, b.minH || 0) + st.H + CORNICE_H, d = 0.3;
            const x0 = e.a[0] + e.dx * pc.t0 + e.nx * d, z0 = e.a[1] + e.dz * pc.t0 + e.nz * d, x1 = e.a[0] + e.dx * pc.t1 + e.nx * d, z1 = e.a[1] + e.dz * pc.t1 + e.nz * d;
            card(rB((x0 + x1) / 2, (z0 + z1) / 2), x0, z0, x1, z1, y0, y0 + 0.9, e.nx, e.nz, (pc.t1 - pc.t0) / 1.2);
            nRoof++;
          }
        }
      }
    }
  }
  const tris = nBal * 36 + nRoof * 2;
  return { triangles: tris, balconies: nBal, roofRailings: nRoof };
}
