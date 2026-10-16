// landmarksA/tickets.js - Kassovy zal No 1 (Кассовый зал № 1, OSM w662697920, 73 x 12 m, east of the platform canopy): a real door in its west wall, a plaster hall with a bank of
// ticket windows, benches, boards and signs; own indoor zone.  Station frame (u along the facade, d into the building).  Door at d 146.4..150.2.
import * as THREE from 'three';
import { Parts, TH, O, UV, wbox, C } from './common.js';

export function buildTickets(Cc) {
  const { ctx, M, T } = Cc;
  const P = new Parts();
  const plaster = T('#ece4cf', { name: 'tk-plaster' }), wood = T(C.wood), metal = T(C.metal), dark = T('#2b2d33');
  const floorTex = ctx.tex.draw(256, 256, () => {}, { key: 'st_floor', repeat: [1, 1] });                 // cached by interior.js (same key)
  const floorM = T('#ffffff', { map: floorTex, paint: 0.02 });
  const glow = ctx.mat.emissive('#ffe7b0', 1.0), glowD = ctx.mat.emissive('#fff4dc', 1.0);
  const U0 = 11.0, U1 = 22.2, D0 = 143.7, D1 = 216.4, H = 8.2, DOOR = [146.4, 150.2];
  // walls: west with the door gap, east, north, south (0.5 m thick, inner faces at U0 / U1 / D0 / D1)
  P.box(plaster, U0 - 0.55, U0, 0, H, D0 - 0.5, DOOR[0], 'b'); P.box(plaster, U0 - 0.55, U0, 0, H, DOOR[1], D1 + 0.5, 'b'); P.box(plaster, U0 - 0.55, U0, 3.6, H, DOOR[0], DOOR[1], 'b');
  P.box(plaster, U1, U1 + 0.5, 0, H, D0 - 0.5, D1 + 0.5, 'b'); P.box(plaster, U0, U1, 0, H, D0 - 0.5, D0, 'b'); P.box(plaster, U0, U1, 0, H, D1, D1 + 0.5, 'b');
  P.quad(floorM, [U0, 0.03, D0], [U1, 0.03, D0], [U1, 0.03, D1], [U0, 0.03, D1], [0, 1, 0], [[U0 / 4.8, D0 / 4.8], [U1 / 4.8, D0 / 4.8], [U1 / 4.8, D1 / 4.8], [U0 / 4.8, D1 / 4.8]]);
  P.quad(T('#e8e2d2', { name: 'tk-ceil' }), [U0, H, D0], [U1, H, D0], [U1, H, D1], [U0, H, D1], [0, -1, 0]);
  for (let d = D0 + 6; d < D1 - 3; d += 9) P.box(glowD, U0 + 2, U1 - 2, H - 0.06, H - 0.02, d, d + 0.5, 't');
  // door frame + two leaves open against the reveal; sign outside
  P.box(M.trim, U0 - 0.62, U0 - 0.5, 0, 3.6, DOOR[0], DOOR[0] + 0.15, 's'); P.box(M.trim, U0 - 0.62, U0 - 0.5, 0, 3.6, DOOR[1] - 0.15, DOOR[1], 's'); P.box(M.trim, U0 - 0.62, U0 - 0.5, 3.4, 3.8, DOOR[0], DOOR[1], 's');
  P.box(M.door, U0 - 0.5, U0 - 0.44, 0, 3.2, DOOR[0] + 0.1, DOOR[0] + 1.7); P.box(M.door, U0 - 0.5, U0 - 0.44, 0, 3.2, DOOR[1] - 1.7, DOOR[1] - 0.1);
  const sign = (text, key, w, h) => { const m = T('#ffffff', { map: ctx.tex.sign({ w, h, bg: '#1d3b6b', fg: '#ffffff', text, size: Math.round(h * 0.55), key, font: '"Noto Sans", sans-serif' }), paint: 0, name: 'tk-' + key }); m.emissiveMap = m.map; return Cc.night.toon(m, '#ffffff', 0.9, 0.3); };
  P.quad(sign('Кассовый зал № 1', 'tk_sign', 512, 96), [U0 - 0.66, 3.95, DOOR[0] - 0.4], [U0 - 0.66, 3.95, DOOR[1] + 0.4], [U0 - 0.66, 4.85, DOOR[1] + 0.4], [U0 - 0.66, 4.85, DOOR[0] - 0.4], [-1, 0, 0]);
  // a bank of ticket windows along the east wall (11 windows with numbers), counters
  const d0 = 154, n = 11, pitch = 5.4;
  P.box(dark, U1 - 1.5, U1, 0, 3.6, d0 - 1, d0 + n * pitch, 'tl'); P.box(wood, U1 - 1.65, U1 - 1.35, 0.95, 1.1, d0 - 1, d0 + n * pitch);
  for (let i = 0; i < n; i++) {
    const d = d0 + (i + 0.5) * pitch;
    P.quad(glow, [U1 - 1.52, 1.15, d - 1.2], [U1 - 1.52, 1.15, d + 1.2], [U1 - 1.52, 2.5, d + 1.2], [U1 - 1.52, 2.5, d - 1.2], [-1, 0, 0]);
    P.quad(sign(String(i + 1), 'tk_n' + i, 96, 96), [U1 - 1.55, 2.6, d + 0.4], [U1 - 1.55, 2.6, d - 0.4], [U1 - 1.55, 3.4, d - 0.4], [U1 - 1.55, 3.4, d + 0.4], [-1, 0, 0]);
  }
  P.quad(sign('КАССЫ ДАЛЬНЕГО СЛЕДОВАНИЯ · БИЛЕТЫ · ИНФОРМАЦИЯ', 'tk_kassy', 1024, 96), [U0, 5.0, D0 + 0.05], [U1, 5.0, D0 + 0.05], [U1, 6.2, D0 + 0.05], [U0, 6.2, D0 + 0.05], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  // benches in rows, queue posts, hanging boards
  const bench = (u, d, rot) => { P.push(u, 0, d, rot); P.box(wood, -1.3, 1.3, 0.42, 0.48, -0.25, 0.25); P.box(wood, -1.3, 1.3, 0.55, 1.0, 0.25, 0.3); for (const s of [-1, 1]) P.box(metal, s * 1.25 - 0.04, s * 1.25 + 0.04, 0, 0.45, -0.22, 0.22); P.pop(); wbox(ctx, u - 0.3, u + 0.3, d - 1.4, d + 1.4, 0, 1.0); };
  for (let d = 158; d < 212; d += 8) { bench(14.2, d, Math.PI / 2); bench(15.3, d, -Math.PI / 2); }
  for (let d = 156; d < 214; d += 3) P.cyl(metal, 17.8, d, 0, 1.0, 0.04, 0.04, 6);
  for (const d of [168, 195]) { P.box(dark, 14.2, 18.8, 5.6, 7.6, d - 0.1, d + 0.1); P.box(glow, 14.4, 18.6, 5.8, 7.4, d + 0.1, d + 0.12, 'b'); P.box(glow, 14.4, 18.6, 5.8, 7.4, d - 0.12, d - 0.1, 'b'); }
  const g = new THREE.Group(); g.name = 'station-tickets'; g.position.set(O.x, 0, O.z); g.rotation.y = TH;
  P.build(g, { cast: false }); ctx.addStatic(g);
  // colliders: walls (door stays free), counters
  wbox(ctx, U0 - 0.6, U0, D0 - 0.5, DOOR[0]); wbox(ctx, U0 - 0.6, U0, DOOR[1], D1 + 0.5); wbox(ctx, U1, U1 + 0.6, D0 - 0.5, D1 + 0.5); wbox(ctx, U0, U1, D0 - 0.6, D0); wbox(ctx, U0, U1, D1, D1 + 0.6);
  wbox(ctx, U1 - 1.6, U1, d0 - 1, d0 + n * pitch, 0, 3.6);
  if (ctx.zones && ctx.zones.add) ctx.zones.add({ id: 'station-tickets', test: (x, y, z) => { if (y > 9) return false; const [u, d] = UV(x, z); return u >= U0 - 0.3 && u <= U1 + 0.3 && d >= D0 - 0.3 && d <= D1 + 0.3; }, indoor: { name: 'Кассовый зал № 1', sun: 0.0, sky: true, shadows: false, ambient: { color: '#fff3e0', ground: '#d2c2a8', intensity: 1.7 }, fog: { color: '#cfd6dc', density: 0.0012 }, key: { color: '#fff0dc', intensity: 1.2, dir: [0.25, 0.9, 0.35] } } });
  return g;
}
