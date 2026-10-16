// tools/environment-petro-water.mjs - writes src/world/environment/petro-water.js: the water polygons of the Petrograd side that the city bake could not close.
// The OSM multipolygons "Малая Нева" (r72500) and "Большая Невка" (r1312674) leave the fetched area (data/osm-raw/water.json holds only the member ways inside it), so tools/bake-osm.mjs
// drops them (RIVER records with polys: []). This tool chains the member ways that DO have geometry and closes each ring with an invented continuation beyond the data extent:
//   * Malaya Neva: both real banks from the Birzhevoy Bridge (x -2700) to the Smolenka source / Petrovsky Island (x -4313 / -4148), then scenery banks WNW to the Neva Bay (x -7400)
//   * Malaya Nevka (r1266760, since the P6 bake of the north-west corner): the member ways give two chains, the Petrograd bank (Admiral Lazarev embankment; from far upstream to the Zhdanovka mouth, x -4946) and the
//     Krestovsky bank; closed by scenery banks west to x -7400 (north of the Malaya Neva's own tail) and a cap far upstream (z -4500, outside the extent)
//   * Bolshaya Nevka: the real Vyborg bank from the mouth to z -5221, the real Petrograd bank to the Aurora (z -2665) + the mapped retaining walls of Petrogradskaya embankment
//     (EMBANKMENTS w1172626353 / w1172626352, to z -2985), then the Vyborg bank shifted 195 m to the west (the river is 185-200 m wide at the Sampsonievsky Bridge and at the Karpovka mouth)
// `caps` lists the closing edges (no bank there). Run it again after a new fetch / bake of the Petrograd side:  node tools/environment-petro-water.mjs
// Source: OpenStreetMap contributors, ODbL (data/osm-raw/water.json).
import fs from 'node:fs';
import { proj } from './osm-lib.mjs';
import { EMBANKMENTS } from '../src/world/data/city.js';
import { KARPOVKA_WEST } from './environment-karpovka-west.mjs';

const root = new URL('../', import.meta.url);
const raw = JSON.parse(fs.readFileSync(new URL('data/osm-raw/water.json', root), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const eq = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01;
function chainOf(id) {
  const rel = raw.elements.find((e) => e.type === 'relation' && e.id === id);
  if (!rel) throw new Error('relation ' + id + ' is not in water.json');
  const pool = rel.members.filter((m) => m.role === 'outer' && m.geometry && m.geometry.length > 1).map((m) => m.geometry.map((g) => proj(g.lon, g.lat)));
  let cur = pool.shift(), hit = true;
  while (hit) {
    hit = false;
    for (let i = 0; i < pool.length; i++) {
      const s = pool[i];
      if (eq(s[0], cur[cur.length - 1])) cur = cur.concat(s.slice(1));
      else if (eq(s[s.length - 1], cur[cur.length - 1])) cur = cur.concat(s.slice().reverse().slice(1));
      else if (eq(s[s.length - 1], cur[0])) cur = s.slice(0, -1).concat(cur);
      else if (eq(s[0], cur[0])) cur = s.slice().reverse().slice(0, -1).concat(cur);
      else continue;
      pool.splice(i, 1); hit = true; break;
    }
  }
  if (pool.length) console.warn('relation', id, ':', pool.length, 'member ways not chained');
  return cur;
}
/** every chain of the outer member ways that have geometry */
function chainsOf(id) {
  const rel = raw.elements.find((e) => e.type === 'relation' && e.id === id);
  if (!rel) throw new Error('relation ' + id + ' is not in water.json');
  const pool = rel.members.filter((m) => m.role === 'outer' && m.geometry && m.geometry.length > 1).map((m) => m.geometry.map((g) => proj(g.lon, g.lat)));
  const out = [];
  while (pool.length) {
    let cur = pool.shift(), hit = true;
    while (hit) {
      hit = false;
      for (let i = 0; i < pool.length; i++) {
        const s = pool[i];
        if (eq(s[0], cur[cur.length - 1])) cur = cur.concat(s.slice(1));
        else if (eq(s[s.length - 1], cur[cur.length - 1])) cur = cur.concat(s.slice().reverse().slice(1));
        else if (eq(s[s.length - 1], cur[0])) cur = s.slice(0, -1).concat(cur);
        else if (eq(s[0], cur[0])) cur = s.slice().reverse().slice(0, -1).concat(cur);
        else continue;
        pool.splice(i, 1); hit = true; break;
      }
    }
    out.push(cur);
  }
  return out;
}
const dp = (pts, tol) => {                                     // Douglas-Peucker
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  let best = 0, bi = -1;
  for (let i = 1; i + 1 < pts.length; i++) { const d = Math.abs((pts[i][0] - a[0]) * dz - (pts[i][1] - a[1]) * dx) / l; if (d > best) { best = d; bi = i; } }
  if (best <= tol) return [a, b];
  return [...dp(pts.slice(0, bi + 1), tol).slice(0, -1), ...dp(pts.slice(bi), tol)];
};

// ---------------------------------------------------------------- Malaya Neva
const mn = chainOf(72500);                                      // south bank W -> E (Makarova embankment), the Birzhevoy Bridge line, north bank E -> W (Petrograd side, Petrovsky Island)
if (mn[0][0] > mn[mn.length - 1][0]) mn.reverse();
// scenery beyond the data (the far ends are 250-450 m outside the extent): Petrovsky Island's south shore to its spit, the bay beyond; Dekabristov Island's north shore (the Smolenka itself is not drawn)
const MN_NORTH = [[-4500, -2480], [-5000, -2620], [-5600, -2700], [-6100, -2760], [-6500, -2950], [-7400, -3600]];
const MN_SOUTH = [[-7400, -1700], [-6500, -2050], [-6000, -2180], [-5400, -2200], [-4800, -2090], [-4500, -2010]];
const malaya = [...mn, ...MN_NORTH, ...MN_SOUTH];
const malayaCaps = [[...MN_NORTH[MN_NORTH.length - 1], ...MN_SOUTH[0]]];

// ---------------------------------------------------------------- Bolshaya Nevka
let bn = chainOf(1312674);                                      // Vyborg bank N -> S, the mouth line, Petrograd bank S -> N to the Aurora
if (bn[0][1] > bn[bn.length - 1][1]) bn.reverse();
const emb = (id) => { const e = EMBANKMENTS.find((q) => q.id === id); if (!e) throw new Error('EMBANKMENTS ' + id + ' missing'); const P = []; for (let i = 0; i < e.pts.length; i += 2) P.push([e.pts[i], e.pts[i + 1]]); return P; };
let west = [bn[bn.length - 1]];
// (w1172626354 is the round niche of the wall at the Aurora, not the bank line.) Since the P7 bake the mapped walls continue past the Grenadersky Bridge and the Karpovka mouth ((-1011,-3876)..(-1018,-3897):
// the Karpovka itself is not a waterway here yet, its mouth is closed by the straight piece between the two walls) to the clip edge z -4200.
for (const id of ['w1172626353', 'w1172626352', 'w1069090570', 'w1069090563', 'w1069051552', 'w1069051554', 'w1069051555', 'w1069051553', 'w1069051568', 'w88735041', 'w1172626350', 'w1172626351', 'w1172626348']) {
  if (!EMBANKMENTS.some((q) => q.id === id)) continue;                 // (a bake without the P7 rectangle has only the first two)
  let P = emb(id); const end = west[west.length - 1];
  if (Math.hypot(P[0][0] - end[0], P[0][1] - end[1]) > Math.hypot(P[P.length - 1][0] - end[0], P[P.length - 1][1] - end[1])) P = P.reverse();
  for (const p of P) if (Math.hypot(p[0] - west[west.length - 1][0], p[1] - west[west.length - 1][1]) > 0.3) west.push(p);
}
west = west.slice(1);
// the Petrograd bank north of the mapped walls: the Vyborg bank moved 195 m to the west (left of the bank when walking north)
const lastW = west[west.length - 1], WIDTH = 195;
const eastN = dp(bn.filter((p) => p[1] < lastW[1] - 60 && p[1] > -5230).slice().reverse(), 6);     // S -> N
const off = eastN.map((p, i) => {
  const a = eastN[Math.max(0, i - 1)], b = eastN[Math.min(eastN.length - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  return [p[0] + dz / l * WIDTH, p[1] - dx / l * WIDTH];          // heading north (dz < 0): (dz, -dx) points west
});
const offClean = []; for (const p of off) { if (p[1] < lastW[1] - 40 && (!offClean.length || p[1] < offClean[offClean.length - 1][1] - 12)) offClean.push(p); }
const nevka = [...bn, ...west, ...offClean];
const nevkaCaps = [[...offClean[offClean.length - 1], ...bn[0]]];

// ---------------------------------------------------------------- Malaya Nevka + the tail of the Zhdanovka (P6)
const mk = chainsOf(1266760).filter((c) => c.length > 10);
if (mk.length !== 2) throw new Error('Malaya Nevka: expected two bank chains, got ' + mk.length);
const nearLaz = (c) => Math.min(...c.map((p) => Math.hypot(p[0] + 4320, p[1] + 3575)));
let mkS = nearLaz(mk[0]) < nearLaz(mk[1]) ? mk[0] : mk[1], mkN = mkS === mk[0] ? mk[1] : mk[0];      // the Petrograd (south) bank passes the Lazarevsky Bridge head
if (mkS[0][0] < mkS[mkS.length - 1][0]) mkS = mkS.slice().reverse();                                  // upstream (NE) -> the Zhdanovka mouth (W)
if (mkN[0][0] > mkN[mkN.length - 1][0]) mkN = mkN.slice().reverse();                                  // W -> upstream (NE)
// (the last two real edges of the south bank are the mouth line of the Zhdanovka, whose own polygon the bake holds to that line)
const MK_SOUTH_FAR = [[-5500, -3420], [-6300, -3500], [-7400, -3700]], MK_NORTH_FAR = [[-7400, -4300], [-6300, -4050], [-5500, -3850]];
const nevkaM = [...mkS, ...MK_SOUTH_FAR, ...MK_NORTH_FAR, ...mkN];
const nevkaMCaps = [[...MK_SOUTH_FAR[MK_SOUTH_FAR.length - 1], ...MK_NORTH_FAR[0]], [...mkN[mkN.length - 1], ...mkS[0]]];

const flat = (P) => P.flatMap((p) => [r1(p[0]), r1(p[1])]);
const out = [
  { id: 'r72500', name: 'Малая Нева', key: 'neva', real: mn.length, o: flat(malaya), caps: malayaCaps.map((c) => c.map(r1)) },
  { id: 'r1312674', name: 'Большая Невка', key: 'neva', real: bn.length + west.length, o: flat(nevka), caps: nevkaCaps.map((c) => c.map(r1)) },
  { id: 'r1266760', name: 'Малая Невка', key: 'neva', real: mkS.length, o: flat(nevkaM), caps: nevkaMCaps.map((c) => c.map(r1)) },
  // the west half of the Karpovka (r1312629; the east half is RIVER r1312676 of the bake): the complete outline from tools/environment-karpovka-west.mjs, every point real, no cap (it joins its neighbours edge to edge)
  { id: 'r1312629', name: 'Карповка', key: 'karpovka', real: KARPOVKA_WEST.length / 2, o: KARPOVKA_WEST.map(r1), caps: [] },
];
const area = (o) => { let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } return a / 2; };
for (const w of out) console.log(w.id, w.name, 'points', w.o.length / 2, '(real ' + w.real + ')', 'area', Math.round(Math.abs(area(w.o)) / 1e4) + ' ha');
fs.writeFileSync(new URL('src/world/environment/petro-water.js', root),
  '// GENERATED by tools/environment-petro-water.mjs (do not edit). OpenStreetMap contributors, ODbL.\n'
  + '// The water polygons of the Petrograd side that the city bake could not close (their OSM multipolygons leave the fetched area): the real banks inside the data + invented scenery\n'
  + '// continuations beyond it. o: flat ring [x, z, ...]; real: the first `real` vertices are OSM data; caps: closing edges [ax, az, bx, bz] that are no bank.\n'
  + 'export const PETRO_WATER = ' + JSON.stringify(out) + ';\n');
console.log('written src/world/environment/petro-water.js');
