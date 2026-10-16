// metro/vestibule.js — the inside of the Vosstaniya rotunda (docs/research/metro.md section 6, photos 150 / 165 / 173): the ticket hall (cashier windows with arched glass, ticket machines, a security
// frame + bag scanner at the entrance), the turnstile row, the escalator head hall behind it (paid zone: the three lanes start here, an exit corridor leads to the west door) and the floor / ceiling
// of the whole building. Everything stands on the street plane (y = 0, floors drawn 5 cm up), in the frame of the escalator (local x lateral, z along the slope, the head at z = zTop).
import * as THREE from 'three';
import { MeshBuilder, ringFromFlat, addCap } from '../lib/massing.js';
import { Space, inPoly, chord } from './lib.js';

const CEIL = 6.8, WALLH = 3.4;

/**
 * o: { frame, poly: { o }, zTop, A, shaftLen, doors, esc (escalator handles) }
 * returns { Sv, turnstiles, gates: [...], paid: { inside(x, z) } }
 */
export function buildVestibule(ctx, M, o) {
  const { mat, tex, physics } = ctx;
  const Sv = new Space(ctx, o.frame, { name: 'vosstaniya-vest', tag: null, zone: 'vosstaniya-rotunda' });
  const k = Sv.k, zT = o.zTop, A = o.A;
  const P = (x, z) => [x, zT + z];                                        // head-relative -> station-local
  const poly = o.poly;
  // ---- floor (5 cm over the ground plane) with the shaft opening, ceiling, light panels
  const world = new THREE.Group(); world.userData.zone = 'vosstaniya-rotunda'; ctx.addStatic(world);
  const hole = [[-A, 0], [A, 0], [A, o.shaftLen], [-A, o.shaftLen]].map(([x, z]) => Sv.W(x, zT + z));
  const floorB = new MeshBuilder(); addCap(floorB, { o: poly.o, h: [hole.flat()] }, 0.05, { uvScale: 1 });
  const floorTex = M.T.granite('vest-floor', '#cfc6b0', 'rgba(70,55,40,0.28)', 'rgba(255,255,255,0.40)', { tint: '#8a6a50' });
  const fm = new THREE.Mesh(floorB.build(), mat.toon('#ffffff', { map: floorTex })); fm.receiveShadow = true; world.add(fm);
  const ceilB = new MeshBuilder(); addCap(ceilB, poly, CEIL, { up: false, uvScale: 6 }); world.add(new THREE.Mesh(ceilB.build(), M.ceiling));
  // light panels on a 5 m grid, a ring of globes over the round hall
  const b = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }; for (let i = 0; i < poly.o.length; i += 2) { b.x0 = Math.min(b.x0, poly.o[i]); b.x1 = Math.max(b.x1, poly.o[i]); b.z0 = Math.min(b.z0, poly.o[i + 1]); b.z1 = Math.max(b.z1, poly.o[i + 1]); }
  const kw = ctx.kit(world);
  for (let x = Math.ceil(b.x0 / 5) * 5; x < b.x1; x += 5) for (let z = Math.ceil(b.z0 / 5) * 5; z < b.z1; z += 5) {
    if (!inPoly(poly.o, x, z)) continue;
    // keep the panels clear of the walls (inside by 1.5 m on every side)
    if ([[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]].some(([dx, dz]) => !inPoly(poly.o, x + dx, z + dz))) continue;
    kw.box(1.8, 0.08, 0.9, M.lampWhite, [x, CEIL - 0.06, z]).castShadow = false;
  }

  // ---- walls of the building are drawn by rotunda.js; here the partitions of the paid zone
  const X = 8.0, ZT = -4.5;                                                 // paid zone |x| <= 8 behind the turnstile row at z = ZT (head-relative)
  const partitionMat = M.partition || (M.partition = mat.toon('#ffffff', { map: M.T.vestWall }));
  const wallPiece = (x0, x1, z0, z1, h = WALLH) => {
    const [a0, a1, b0, b1] = [x0, x1, zT + z0, zT + z1];
    Sv.bx(a0, a1, 0.05, h, b0, b1, M.plasterWarm); Sv.col(a0, a1, -1, h + 1, b0, b1);
  };
  // east / west partitions (0.25 m thick); the west one has a gap for the exit corridor (z = 0.9 .. 4.3)
  wallPiece(X, X + 0.25, ZT, 19.5); wallPiece(-X - 0.25, -X, ZT, 0.9); wallPiece(-X - 0.25, -X, 4.3, 12);
  // exit corridor walls toward the west door at (-16.6, 2.6)
  const cEnd = (zr) => { const [wx, wz] = Sv.W(-X, zT + zr), c = Math.cos(o.frame.yaw), s = Math.sin(o.frame.yaw), ch = chord(poly.o, wx, wz, -c, s); return ch ? -X - ch[1] + 0.5 : -17.5; };
  wallPiece(cEnd(0.78), -X, 0.65, 0.9); wallPiece(cEnd(4.42), -X, 4.3, 4.55);
  // turnstile row: solid wings at the ends, nine stainless housings with open lanes between them
  wallPiece(-X, -5.35, ZT - 0.15, ZT + 0.15); wallPiece(5.35, X, ZT - 0.15, ZT + 0.15);
  const gates = [];
  for (let x = -5; x <= 5.01; x += 1.25) {
    Sv.bx(x - 0.15, x + 0.15, 0.05, 1.05, zT + ZT - 0.5, zT + ZT + 0.5, M.steel); Sv.col(x - 0.15, x + 0.15, -1, 2, zT + ZT - 0.5, zT + ZT + 0.5);
    Sv.bx(x - 0.16, x + 0.16, 1.05, 1.1, zT + ZT - 0.5, zT + ZT + 0.5, M.steelBlack);
    Sv.bx(x - 0.1, x + 0.1, 1.1, 1.3, zT + ZT - 0.25, zT + ZT + 0.25, M.black);
    Sv.bx(x - 0.09, x + 0.09, 1.3, 1.34, zT + ZT - 0.2, zT + ZT + 0.2, M.lampGreen);                       // green "go" light on every unit
    gates.push(x);
  }
  // overhead boards: "К поездам" over the lanes, "Выход в город" over the corridor, "Кассы" over the cashier row
  const board = (text, sub, arrow, key, x, y, z, w, h, rotY, intensity = 1.0) => { const p = k.plane(w, h, M.board(M.blueBoard(text, sub, arrow, key), intensity), [x, y, zT + z], [0, rotY, 0]); p.castShadow = false; return p; };
  board('К поездам', 'To the trains', 'd', 'vv-trains', 0, 3.7, ZT - 0.3, 2.6, 0.65, Math.PI);
  board('К поездам', 'To the trains', 'd', 'vv-trains', 0, 3.7, ZT + 0.3, 2.6, 0.65, 0);
  board('Выход в город', 'Way out', 'l', 'vv-exit', -X - 1.5, 3.0, 2.6, 2.6, 0.65, Math.PI / 2);
  board('Выход в город', 'Way out', 'r', 'vv-exit-r', -X - 1.5, 3.0, 2.6, 2.6, 0.65, -Math.PI / 2);
  // the escalator head: keep-right sign on the partitions, comb of the three lanes is the escalator's
  const keep = tex.sign({ text: 'Стойте справа, проходите слева', sub: 'Stand on the right, walk on the left', w: 640, h: 140, bg: '#1d4e9b', fg: '#ffffff', radius: 10, border: 5, borderColor: '#ffffff', key: 'vv-keepright', size: 40 });
  for (const sx of [-1, 1]) k.plane(2.2, 0.48, M.board(keep, 0.9), [sx * (X - 0.2), 2.3, zT + 3.0], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0]);
  // machinist booth: a glass cabin next to the lanes
  Sv.bx(X - 2.4, X - 0.4, 0.05, 2.4, zT + 4.5, zT + 6.0, M.steelDark); Sv.bx(X - 2.38, X - 0.42, 1.0, 2.2, zT + 4.48, zT + 4.52, M.glass); Sv.col(X - 2.4, X - 0.4, -1, 2.6, zT + 4.5, zT + 6.0);
  // ---- ticket hall: cashier windows on the north wall, ticket machines on the diagonals, security frame + scanner at the entrance
  const ring = ringFromFlat(poly.o);
  const local = ring.map((p) => Sv.L(p[0], p[1])).map(([x, z]) => [x, z - zT]);        // head-relative polygon
  // find the north edge: the longest edge whose inward normal points toward +z (south) and which lies north of the head
  let best = null;
  for (let i = 0; i < local.length; i++) {
    const a = local[i], c = local[(i + 1) % local.length], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
    if (l > 8 && (a[1] + c[1]) / 2 < -20 && (!best || l > best.l)) best = { a, c, l, i };
  }
  const edgePoint = (e, t, off) => { const dx = e.c[0] - e.a[0], dz = e.c[1] - e.a[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l; let nx = -uz, nz = ux; const mx = (e.a[0] + e.c[0]) / 2 + nx, mz = (e.a[1] + e.c[1]) / 2 + nz; if (!inPoly(local.flat(), mx, mz)) { nx = -nx; nz = -nz; } return { x: e.a[0] + ux * l * t + nx * off, z: e.a[1] + uz * l * t + nz * off, ux, uz, nx, nz, rot: Math.atan2(nx, nz) }; };
  if (best) {
    const cashierMat = M.cashier || (M.cashier = mat.toon('#2f2a28'));
    // counter + five windows
    for (let i = 0; i < 5; i++) {
      const p = edgePoint(best, 0.2 + i * 0.15, 0.55), q = edgePoint(best, 0.2 + i * 0.15, 0.1);
      k.box(2.0, 1.05, 0.9, cashierMat, [p.x, 0.55, zT + p.z], [0, p.rot, 0]);
      k.box(1.7, 0.06, 0.95, M.steel, [p.x, 1.08, zT + p.z], [0, p.rot, 0]);
      // arched window panel (glass behind a brass arch)
      k.box(1.5, 1.7, 0.1, M.gold, [q.x + p.nx * 0.2, 1.95, zT + q.z + p.nz * 0.2], [0, p.rot, 0]);
      const gl = k.plane(1.28, 1.5, M.glass, [q.x + p.nx * 0.27, 1.95, zT + q.z + p.nz * 0.27], [0, p.rot, 0]); void gl;
      const cap = k.plane(1.2, 0.3, M.board(M.blueBoard('Касса ' + (i + 1), '', null, 'vv-kassa' + (i + 1)), 1.0), [q.x + p.nx * 0.28, 2.95, zT + q.z + p.nz * 0.28], [0, p.rot, 0]); cap.castShadow = false;
      physics.addBox(Sv.W(p.x, zT + p.z)[0], Sv.W(p.x, zT + p.z)[1], 2.0, 0.9, o.frame.yaw + p.rot, -1, 2.5);
    }
    // a long blue board over the cashiers
    const mid = edgePoint(best, 0.5, 0.2);
    const kb = k.plane(4.2, 0.9, M.board(M.blueBoard('Кассы', 'Ticket office', null, 'vv-kassy'), 1.0), [mid.x, 4.0, zT + mid.z], [0, mid.rot, 0]); kb.castShadow = false;
    void best;
  }
  // ticket machines: two groups on the diagonal walls
  const machineTex = tex.draw(128, 256, (g, w, h) => { g.fillStyle = '#3a3d44'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff9a2a'; g.fillRect(14, 30, w - 28, 74); g.fillStyle = '#1b1b20'; g.fillRect(30, 130, w - 60, 40); g.fillStyle = '#9aa0aa'; g.fillRect(24, 190, w - 48, 20); g.fillStyle = '#fff'; g.font = '700 22px sans-serif'; g.textAlign = 'center'; g.fillText('Пополнить', w / 2, 70); }, { key: 'vv-machine' });
  const machine = (x, z, rot) => { k.box(0.75, 1.9, 0.55, M.kiosk, [x, 0.95 + 0.05, zT + z], [0, rot, 0]); const p = k.plane(0.6, 1.25, M.board(machineTex, 0.55), [x + Math.sin(rot) * 0.29, 1.15, zT + z + Math.cos(rot) * 0.29], [0, rot, 0]); p.castShadow = false; physics.addBox(Sv.W(x, zT + z)[0], Sv.W(x, zT + z)[1], 0.8, 0.6, o.frame.yaw + rot, -1, 2.2); };
  for (const e of local.map((p, i) => ({ a: p, c: local[(i + 1) % local.length], i }))) {
    const dx = e.c[0] - e.a[0], dz = e.c[1] - e.a[1], l = Math.hypot(dx, dz), my = (e.a[1] + e.c[1]) / 2, mx = (e.a[0] + e.c[0]) / 2;
    if (l < 5 || l > 9 || my > -9 || my < -26 || Math.abs(mx) < 4) continue;
    const wm = Sv.W(mx, zT + my); if (o.doors.some((d) => Math.hypot(d.x - wm[0], d.z - wm[1]) < 8)) continue;                  // keep the doors clear
    const n = (l / 1.5) | 0; for (let t = 0; t < Math.min(3, n); t++) { const p = edgePoint(e, 0.25 + t * 0.25, 0.5); machine(p.x, p.z, p.rot); }
  }
  // security frame (metal detector) + bag scanner just inside the east door
  const door = o.doors.find((d) => d.kind === 'entrance');
  if (door) {
    const [dx, dz] = Sv.L(door.x, door.z); const dzr = dz - zT;
    const fx = dx - 4.0;
    k.box(0.12, 2.1, 0.12, M.steel, [fx, 1.05, zT + dzr - 0.8]); k.box(0.12, 2.1, 0.12, M.steel, [fx, 1.05, zT + dzr + 0.8]); k.box(0.14, 0.2, 1.8, M.steelBlack, [fx, 2.1, zT + dzr]);
    k.box(0.1, 0.1, 0.1, M.lampGreen, [fx, 2.2, zT + dzr]);
    physics.addBox(Sv.W(fx, zT + dzr - 0.8)[0], Sv.W(fx, zT + dzr - 0.8)[1], 0.2, 0.2, 0, -1, 2.3); physics.addBox(Sv.W(fx, zT + dzr + 0.8)[0], Sv.W(fx, zT + dzr + 0.8)[1], 0.2, 0.2, 0, -1, 2.3);
    k.box(1.7, 0.8, 0.8, M.steelBlack, [fx + 0.4, 0.45, zT + dzr + 2.2], [0, Math.PI / 2, 0]); k.box(1.2, 0.5, 0.6, M.steelDark, [fx + 0.4, 1.1, zT + dzr + 2.2], [0, Math.PI / 2, 0]);
    k.plane(1.0, 0.3, M.board(M.blueBoard('Пункт досмотра', '', null, 'vv-screen'), 1.0), [fx, 2.6, zT + dzr + 0.0], [0, door.rotY + Math.PI / 2 * 0 + Math.PI, 0]);
  }
  return { Sv, gates, zT, X, ZT, local };
}
