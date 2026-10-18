// landmarksCastle/chizhik.js - the CHIZHIK-PYZHIK (Чижик-Пыжик) Easter egg, on its REAL place: the little bronze siskin of the Fontanka (Rafail Bogatyrev, 1994, 11 cm, 5 kg) sits on a small granite
// ledge of the embankment wall just above the water, at the corner by the 1st Engineer Bridge (the Moika mouth) opposite the Summer Garden, below the Engineering Castle; tourists throw coins and a coin
// that stays on the ledge makes a wish come true.
// The ledge is fixed to the wall face of the Fontanka west bank, about 5 m south-east of the corner where the wall meets the bridge (the nearest wall piece to ANCHOR), 1.15 m above the water, and the bird
// looks along the wall toward the bridge. The bird is about twice the real size (about 22 cm) so that it can be seen from the quay above; a few real-size coins lie on the ledge.
// Nobody can stand on the ledge (it is below the street, in front of the quay collider): it is seen from above (look down over the railing; [E] prompt on the quay), from the water and from flight.
// Bronze: bright and rubbed (#a8793a, a little emissive), as the real one; coins M.gold. Built with Parts boxes / cylinders / ellipsoids (about 450 triangles).
// Services: svc.monuments (id 'chizhik'; people/nav.js sends the pedestrians to photograph monuments, props keep 3 m clear), ctx.interact prompt, svc.chizhik. No sound, no flag, no brand.
import * as THREE from 'three';

const ANCHOR = [-736.0, -1029.4];               // on the Fontanka west-bank wall, 5 m from the wall corner at the bridge end
const CORNER = [-738.7, -1033.6];               // where the bird looks (toward the bridge)
const LEDGE_ABOVE_WATER = 1.15;                 // metres of wall between the water line and the top of the ledge
const OUT = 0.46;                               // how far the ledge reaches from the wall face

export function build(K, M, D, svc) {
  const ctx = K.ctx, P = K.P;
  const q = ctx.services.environment?.quay;
  const segs = (q?.segments || []).filter((s) => s.key === 'fontanka' && s.nx !== undefined);
  let best = null, bd = 1e9, bw = null;
  for (const s of segs) {                        // the wall point nearest to the anchor (projection on the piece, kept 1 m from its ends)
    const tx = s.bx - s.ax, tz = s.bz - s.az, len = Math.hypot(tx, tz); if (len < 2.5) continue;
    const ux = tx / len, uz = tz / len;
    const t = Math.min(len - 1, Math.max(1, (ANCHOR[0] - s.ax) * ux + (ANCHOR[1] - s.az) * uz));
    const w = [s.ax + ux * t, s.az + uz * t], d = Math.hypot(w[0] - ANCHOR[0], w[1] - ANCHOR[1]);
    if (d < bd) { bd = d; best = { s, ux, uz }; bw = w; }
  }
  if (!best || bd > 6) { console.warn('[landmarksCastle] chizhik: no Fontanka wall piece near the anchor, the statue is left out'); return; }
  const { s: seg } = best, nx = seg.nx, nz = seg.nz;           // landward normal; the water lies the other way
  const water = q.water ?? -3.2, Y = water + LEDGE_ABOVE_WATER;
  // the bird looks along the wall toward the corner / the bridge
  let fx = best.ux, fz = best.uz; if (fx * (CORNER[0] - bw[0]) + fz * (CORNER[1] - bw[1]) < 0) { fx = -fx; fz = -fz; }
  const rotY = Math.atan2(fx, fz);               // local +z = the facing direction; local +x = (fz, -fx)
  const sgn = (fz * -nx + -fx * -nz) >= 0 ? 1 : -1;            // +1: local +x points to the water
  const U = (a, b) => (sgn > 0 ? [a, b] : [-b, -a]);          // a range [a, b] out from the wall (u) as a local x range

  const bronze = K.mat('#a8793a', { name: 'lmC-chizhik', paint: 0.02, emissive: '#331f06', emissiveIntensity: 0.3 });
  const eye = M.dark;
  const box = (mat, u0, u1, y0, y1, hz, skip = '') => { const [a, b] = U(u0, u1); P.box(mat, a, b, y0, y1, -hz, hz, skip); };

  P.push(bw[0], Y, bw[1], rotY);
  // ---- the ledge: a granite slab (its back end sunk 8 cm into the wall) on two stepped corbels
  box(M.granite, -0.08, OUT, -0.08, 0, 0.27, 'b');
  box(M.graniteDark, -0.08, 0.3, -0.26, -0.08, 0.2, 'b');
  box(M.graniteDark, -0.08, 0.14, -0.42, -0.26, 0.14, 'b');
  // ---- the siskin on the slab (about 22 cm tall with the tail 28 cm), looking along +z
  P.push(sgn * 0.25, 0, 0, 0);
  const sph = new THREE.SphereGeometry(1, 9, 7);
  const S2 = 1.0;
  P.geo(bronze, sph, 0, 0.088 * S2, -0.015 * S2, -0.5, 0, 0, 0.055 * S2, 0.07 * S2, 0.092 * S2);                // body, breast raised
  P.geo(bronze, sph, 0, 0.158 * S2, 0.07 * S2, 0, 0, 0, 0.04 * S2, 0.04 * S2, 0.042 * S2);                     // head
  P.cyl(bronze, [0, 0.152, 0.105], [0, 0.144, 0.15], 0.014, 0.002, 6, false);                                  // the short conical beak
  for (const k of [-1, 1]) {
    P.geo(eye, sph, k * 0.034, 0.166, 0.082, 0, 0, 0, 0.008);                                                  // eyes
    P.geo(bronze, sph, k * 0.056, 0.092, -0.025, -0.5, 0, k * 0.12, 0.014, 0.046, 0.078);                      // folded wings
    P.geo(bronze, new THREE.BoxGeometry(0.034, 0.012, 0.1), k * 0.017, 0.05, -0.14, -0.5, k * 0.1, 0);         // the forked tail: two flat prongs spread a little
    P.cyl(bronze, [k * 0.024, 0.0, 0.02], [k * 0.024, 0.05, 0.02], 0.006, 0.006, 5, false);                    // legs
    P.box(bronze, k * 0.024 - 0.011, k * 0.024 + 0.011, 0, 0.005, 0.0, 0.05, 'b');                             // feet
  }
  P.pop();
  // ---- the coins the visitors left on the ledge (real size, 2.4 cm)
  const rng = ctx.rng(1994);
  for (let i = 0; i < 8; i++) {
    const u = 0.06 + rng() * 0.36, z = (rng() - 0.5) * 0.46;
    if (Math.abs(u - 0.25) < 0.07 && Math.abs(z) < 0.07) continue;       // the feet
    P.cyl(M.gold, [sgn * u, 0, z], [sgn * u, 0.003, z], 0.012, 0.012, 8, true);
  }
  P.pop();

  const wx = -nx, wz = -nz;                                              // toward the water
  const bx = bw[0] + wx * 0.25, bz = bw[1] + wz * 0.25;                  // the bird
  svc.monuments.push({ id: 'chizhik', name: 'Чижик-Пыжик', x: bw[0] + nx * 0.8, z: bw[1] + nz * 0.8, h: 0.5 });      // pedestrians gather on the quay above it
  svc.chizhik = { x: bx, z: bz, y: Y, wall: { x: bw[0], z: bw[1] } };

  if (ctx.interact) {
    const SAYINGS = [
      'Чижик-Пыжик: бронзовая птичка ростом 11 сантиметров, с 1994 года. Он сидит на выступе стены над самой водой — посмотрите вниз. Здесь он вдвое крупнее.',
      'Говорят, если бросить монетку так, чтобы она осталась на выступе, желание сбудется.',
      'Чижик-Пыжик, где ты был? На Фонтанке…',
    ];
    let n = 0;
    ctx.interact.add({
      id: 'chizhik', radius: 6.5, label: 'Чижик-Пыжик на выступе стены', labelEn: 'Chizhik-Pyzhik on the wall ledge',
      at: () => ({ x: bx, y: Y + 0.1, z: bz }),
      enabled: () => { const p = ctx.playerObj; return !!p && !p.fly && !p.riding; },
      onUse: () => { ctx.ui?.toast?.(SAYINGS[n++ % SAYINGS.length]); },
    });
  }
}
