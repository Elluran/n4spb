// landmarksCastle/chizhik.js - the CHIZHIK-PYZHIK (Чижик-Пыжик) Easter egg: the little bronze siskin of the Fontanka (Rafail Bogatyrev, 1994, 11 cm, 5 kg, on a ledge of the embankment wall by
// the Panteleymonovsky Bridge, opposite the Engineering Castle; tourists throw coins and a coin that stays on the ledge makes a wish come true).
// WHY IT IS NOT ON THE LEDGE: the real spot (-725, -1083) is outside the play area (play stops at z = -1000), and a ledge below the street level is hidden by the ground from anyone who walks on the
// quay. So the bird is a larger copy (about 20 cm, twice the real size) on a small granite plinth on the pavement of the same east bank of the Fontanka, behind the quay railing, at the first lamp-free
// stretch inside the play area (the nearest wall piece to ANCHOR, slid along the bank until the spot is clear of asphalt). It looks toward the bridge, with a bronze plaque and a few coins on the plinth.
// Bronze: bright and rubbed (#a8793a, a little emissive), as the real one; coins M.gold. Built with Parts boxes / cylinders / ellipsoids (about 700 triangles).
// Services: svc.monuments (id 'chizhik'; people/nav.js sends the pedestrians to photograph monuments, props keep 3 m clear), ctx.interact prompt "[E] Погладить Чижика-Пыжика" (a toast with the story),
// a collider for the plinth. No sound, no flag, no brand.
import * as THREE from 'three';

const ANCHOR = [-635, -975];                    // the lamp-free wall piece of the Fontanka east bank, 25 m inside the play area (north end of the walkable embankment)
const OFFSET = 1.25;                            // plinth centre, metres landward of the wall line (the coping ends 0.62 m landward: the railing stands on it)
const SLIDE = [0, 3, -3, 6, -6, 9, -9, 12, -12];
const TOP = 0.8;                                // plinth top (the statue stands on it)
const HALF = 0.28;                              // half of the base slab

export function build(K, M, D, svc) {
  const ctx = K.ctx, P = K.P, L = K.L;
  const segs = (ctx.services.environment?.quay?.segments || []).filter((s) => s.key === 'fontanka' && s.bank && s.nx !== undefined);
  let best = null, bd = 1e9;
  for (const s of segs) { const d = Math.hypot((s.ax + s.bx) / 2 - ANCHOR[0], (s.az + s.bz) / 2 - ANCHOR[1]); if (d < bd) { bd = d; best = s; } }
  if (!best || bd > 30) { console.warn('[landmarksCastle] chizhik: no Fontanka wall piece near the anchor, the statue is left out'); return; }
  const len = Math.hypot(best.bx - best.ax, best.bz - best.az), tx = (best.bx - best.ax) / len, tz = (best.bz - best.az) / len, nx = best.nx, nz = best.nz;
  const cover = ctx.services.streets?.net?.cover;
  const clear = (x, z) => !L.insideBuilding(x, z, 0.6) && (cover ? cover(x, z, {}) < -0.5 : !L.isOnRoad(x, z, 0.5));
  const mx = (best.ax + best.bx) / 2, mz = (best.az + best.bz) / 2;
  let X = null, Z = null;
  for (const s of SLIDE) {                      // slide along the bank until plinth centre and its landward side are off the asphalt
    const x = mx + tx * s + nx * OFFSET, z = mz + tz * s + nz * OFFSET;
    if (clear(x, z) && clear(x + nx * 0.7, z + nz * 0.7)) { X = x; Z = z; break; }
  }
  if (X === null) { console.warn('[landmarksCastle] chizhik: no clear pavement spot, the statue is left out'); return; }
  // frame: local +z = the way the bird looks = along the bank toward the Panteleymonovsky Bridge (north-west, against the piece direction); local -x = landward (the plaque side)
  const fx = -tx, fz = -tz, rotY = Math.atan2(fx, fz);

  const bronze = K.mat('#a8793a', { name: 'lmC-chizhik', paint: 0.02, emissive: '#331f06', emissiveIntensity: 0.3 });
  const eye = M.dark;

  P.push(X, 0, Z, rotY);
  // ---- the plinth: a dark granite base, a pink-grey die, a moulded cap and a slab (the base stands 0.14 m out of the pavement, which is +0.12 m)
  const box = (mat, hx, hz, y0, y1, skip = '') => P.box(mat, -hx, hx, y0, y1, -hz, hz, skip);
  box(M.graniteDark, HALF, HALF, 0, 0.26, 'b');
  box(M.graniteWarm, 0.22, 0.22, 0.26, 0.7, 'b');
  box(M.granite, 0.26, 0.26, 0.7, 0.76, 'b');
  box(M.graniteDark, 0.24, 0.24, 0.76, TOP, 'b');
  // ---- the plaque on the landward (-x) face of the die: a thin bronze frame and the lettering
  P.push(0, 0, 0, -Math.PI / 2);                // local +z of this frame = the plinth's -x direction (landward)
  P.box(bronze, -0.2, 0.2, 0.4, 0.58, 0.22, 0.232, 'kb');
  K.fascia(-0.185, 0.185, 0.415, 0.565, 'ЧИЖИК-ПЫЖИК', { w: 512, h: 160, bg: '#3a2c1a', fg: '#e9c56e', font: ctx.tex.FONTS.serif, weight: 700, size: 0.5, fill: 0.9, z: 0.236 });
  P.pop();
  // ---- the siskin on the slab (length 0.26 m with the tail, height 0.2 m), looking along +z
  P.push(0, TOP, 0, 0);
  const sph = new THREE.SphereGeometry(1, 9, 7);
  P.geo(bronze, sph, 0, 0.088, -0.015, -0.5, 0, 0, 0.055, 0.07, 0.092);                                    // body, breast raised
  P.geo(bronze, sph, 0, 0.158, 0.07, 0, 0, 0, 0.04, 0.04, 0.042);                                          // head
  P.cyl(bronze, [0, 0.152, 0.105], [0, 0.144, 0.15], 0.014, 0.002, 6, false);                              // the short conical beak
  for (const s of [-1, 1]) {
    P.geo(eye, sph, s * 0.034, 0.166, 0.082, 0, 0, 0, 0.008);                                              // eyes
    P.geo(bronze, sph, s * 0.056, 0.092, -0.025, -0.5, 0, s * 0.12, 0.014, 0.046, 0.078);                  // folded wings
    P.geo(bronze, new THREE.BoxGeometry(0.034, 0.012, 0.1), s * 0.017, 0.05, -0.14, -0.5, s * 0.1, 0);   // the forked tail: two flat prongs spread a little
    P.cyl(bronze, [s * 0.024, 0.0, 0.02], [s * 0.024, 0.05, 0.02], 0.006, 0.006, 5, false);                // legs
    P.box(bronze, s * 0.024 - 0.011, s * 0.024 + 0.011, 0, 0.005, 0.0, 0.05, 'b');                         // feet
  }
  P.pop();
  // ---- the coins the visitors left on the slab (real size, 2.4 cm): a few lie flat, one stands against the bird
  const rng = ctx.rng(1994);
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2, r = 0.09 + rng() * 0.12, x = Math.cos(a) * r * 0.9, z = Math.sin(a) * r * 0.9;
    if (Math.abs(x) < 0.05 && z > -0.1 && z < 0.07) continue;               // the feet
    P.cyl(M.gold, [x, TOP, z], [x, TOP + 0.003, z], 0.012, 0.012, 8, true);
  }
  P.pop();

  // the plinth blocks walking and driving (a bronze statue is not knockable)
  ctx.physics.addBox(X, Z, HALF * 2, HALF * 2, rotY, 0, TOP + 0.25);
  svc.monuments.push({ id: 'chizhik', name: 'Чижик-Пыжик', x: X, z: Z, h: 1.0 });
  svc.chizhik = { x: X, z: Z };

  if (ctx.interact) {
    const SAYINGS = [
      'Чижик-Пыжик: бронзовая птичка в 11 сантиметров, 1994 год. Здесь он вдвое крупнее, чтобы его было видно.',
      'Говорят, если бросить монетку так, чтобы она осталась на постаменте, желание сбудется.',
      'В жизни он сидит над самой водой у Пантелеймоновского моста: Чижик-Пыжик, где ты был?',
    ];
    let n = 0;
    ctx.interact.add({
      id: 'chizhik', radius: 2.8, label: 'Погладить Чижика-Пыжика', labelEn: 'Pet the Chizhik-Pyzhik',
      at: () => ({ x: X, y: 1.0, z: Z }),
      enabled: () => { const p = ctx.playerObj; return !!p && !p.fly && !p.riding; },
      onUse: () => { ctx.ui?.toast?.(SAYINGS[n++ % SAYINGS.length]); },
    });
  }
}
