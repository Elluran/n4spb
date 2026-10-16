// bridges/foot2.js - the footbridges of the south-west, plugged into foot.js (FOOT_X[style] = { cfg(M), extra(S) }): docs/research/sw-canals-bridges.md 4.7 / 4.11 / 4.18 / 4.20, photos refs/sw-water 24 46 47 49 55:
//   pochtamt    Pochtamtsky chain bridge (dark green #33493a): four obelisk pylons 2.45 m with gilded balls, a cast-iron quadrant behind each, two chains per side hanging from pylon to pylon with hangers, `ovals` railing
//   lviny       Lviny Bridge (silver-grey #aab2b8): four white cast-iron lions on grey pedestals, a grey lamp standard beside each pair, `x-net` railing with gilded roundels, plank deck
//   krasnogv    Krasnogvardeysky: dark green box beam 4.5 m wide, two 7-step granite flights with cheek walls at each end, four obelisk lamps, Fontanka-type `lattice` railing
//   krasnoflot  Krasnoflotsky: slim green two-wall beam, asphalt deck 2.8 m, 5 steps each end, four granite bollards with Kryukov column lamps, `plainrods` railing
// S = { P, M, ctx, B, a, b, hD, uA, uB, yDeck, site, cfg }: the frame is the site frame (u across the canal, v along it), exactly as in foot.js.
import * as THREE from 'three';
import { lion, colLamp, obeliskLamp } from './sculpt3.js';

const sph = (P, mat, x, y, z, r, seg = 8) => P.geo(mat, new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2)), x, y, z, 0, 0, 0, r, r, r);

/** a granite obelisk pylon (square tapering shaft) with a gilded ball: base y, height h */
function pylonObelisk(P, M, x, y, z, h, w0 = 0.5, w1 = 0.3) {
  P.box(M.pylon, x - w0 / 2 - 0.12, x + w0 / 2 + 0.12, y, y + 0.35, z - w0 / 2 - 0.12, z + w0 / 2 + 0.12, 'b', 1.2);
  P.push(x, y + 0.35, z, Math.PI / 4); P.cyl(M.pylon, [0, 0, 0], [0, h - 0.35, 0], w0 * 0.7071, w1 * 0.7071, 4, true); P.pop();
  P.box(M.coping, x - w1 / 2 - 0.05, x + w1 / 2 + 0.05, y + h - 0.05, y + h + 0.05, z - w1 / 2 - 0.05, z + w1 / 2 + 0.05, 'b', 1);
  sph(P, M.gold, x, y + h + 0.17, z, 0.12, 8);
}

function pochtamt(S) {
  const { P, M, a, b, hD, yDeck } = S, br = M.ironGreenDark, iron = ctxMat(S, '#33493a');
  const vP = hD + 0.8, H = 2.9;
  for (const sg of [-1, 1]) {
    const uL = a - 0.5, uR = b + 0.5, v = sg * vP;
    pylonObelisk(P, M, uL, 0, v, H); pylonObelisk(P, M, uR, 0, v, H);
    // cast-iron quadrants (quarter wheels with 14 spokes) behind each pylon, on the quay side
    for (const [u0, dir] of [[uL, -1], [uR, 1]]) {
      const R = 2.2, cx = u0 + dir * 0.45, cy = 0.1, n = 14;
      for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI / 2, a1 = (k + 1) / n * Math.PI / 2; P.cyl(iron, [cx + dir * R * Math.cos(a0), cy + R * Math.sin(a0), v], [cx + dir * R * Math.cos(a1), cy + R * Math.sin(a1), v], 0.05, 0.05, 5, false); }
      for (let k = 0; k <= 8; k++) { const ang = k / 8 * Math.PI / 2; P.cyl(iron, [cx, cy, v], [cx + dir * R * Math.cos(ang), cy + R * Math.sin(ang), v], 0.022, 0.022, 4, false); }
      P.cyl(iron, [cx, cy, v], [cx, cy + R, v], 0.04, 0.04, 5, false); P.cyl(iron, [cx, cy, v], [cx + dir * R, cy, v], 0.04, 0.04, 5, false);
      P.cyl(iron, [u0, H - 0.15, v], [cx + dir * R * 0.9, cy + R * 0.45, v], 0.025, 0.025, 4, false);                    // back stay chain
    }
    // the two chains of 19 links (a parabola from pylon top to pylon top), hangers to the deck
    const vC = sg * (hD + 0.28), yT = H - 0.1, yM = 1.05, nL = 19 * 2;
    let prev = null;
    for (let i = 0; i <= nL; i++) {
      const t = i / nL, u = uL + (uR - uL) * t, y = yT - (yT - yM) * 4 * t * (1 - t), p = [u, y, vC];
      if (prev) P.cyl(iron, prev, p, 0.06, 0.06, 5, false);
      if (i > 0 && i < nL && i % 2 === 0) P.cyl(iron, [u, yDeck(u) + 0.95, vC], [u, y, vC], 0.012, 0.012, 3, false);
      prev = p;
    }
    void br;
  }
}
const ctxMat = (S, hex) => S.ctx.mat.toon(hex, { paint: 0.03, name: 'brg-foot-' + hex });

function lviny(S) {
  const { P, M, a, b, hD } = S, v0 = hD + 0.7;
  for (const [u, dir] of [[a - 0.55, 1], [b + 0.55, -1]]) for (const sg of [-1, 1]) {
    lion(P, M, u, 0, sg * v0, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    // the cast frame behind the lions: a thin pylon rod with a gilded ball (suggesting the chain pylons)
    P.cyl(M.fasLviny, [u - dir * 0.5, 0, sg * (v0 + 0.5)], [u - dir * 0.5, 2.0, sg * (v0 + 0.5)], 0.045, 0.035, 6, false); sph(P, M.gold, u - dir * 0.5, 2.06, sg * (v0 + 0.5), 0.07, 6);
  }
  for (const [u, dir] of [[a - 0.55, 1], [b + 0.55, -1]]) for (const sg of [-1, 1]) {                                    // slender grey lamp standards 3.6 m with a scroll bracket and a hexagonal lantern
    const x = u, z = sg * (v0 + 1.2), iron = M.fasLviny;
    P.cyl(iron, [x, 0, z], [x, 0.4, z], 0.14, 0.07, 6, true); P.cyl(iron, [x, 0.4, z], [x, 3.4, z], 0.055, 0.04, 6, false);
    P.cyl(iron, [x, 3.35, z], [x, 3.55, z - sg * 0.3], 0.025, 0.02, 5, false);
    P.cyl(M.lampGlass, [x, 3.0, z - sg * 0.3], [x, 3.5, z - sg * 0.3], 0.14, 0.18, 6, false); P.cyl(M.gold, [x, 3.5, z - sg * 0.3], [x, 3.72, z - sg * 0.3], 0.2, 0.012, 6, true);
  }
  void dirSign;
}
const dirSign = 0;

function krasnogv(S) {
  const { P, M, a, b, hD, uA, uB, yDeck, cfg } = S;
  const run = 0.32, st = cfg.steps, hw = hD + 0.1;
  for (const sg of [-1, 1]) {                                                                  // cheek walls of the flights (pink granite, stepped like a swan neck)
    for (const [uE, ts] of [[uA, -1], [uB, 1]]) for (let k = 0; k < st + 2; k++) {
      const u0 = uE + ts * run * k, u1 = uE + ts * run * (k + 1), hh = Math.max(0.25, yDeck(uE) - cfg.rise * Math.min(k, st) + 0.55 - (k >= st ? (k - st + 1) * 0.15 : 0));
      P.box(M.pylon, Math.min(u0, u1), Math.max(u0, u1), 0, hh, sg * (hw + 0.8) - 0.4 + (sg > 0 ? 0 : 0), sg * (hw + 0.8) + 0.4, 'b', 1.2);
    }
  }
  // obelisk lamps at the top of the flights
  for (const [uE, ts] of [[uA + 0.4, -1], [uB - 0.4, 1]]) for (const sg of [-1, 1]) obeliskLamp(P, M, uE, yDeck(uE) - 0.02, sg * (hD + 0.95), sg > 0 ? Math.PI / 2 : -Math.PI / 2, { cone: true, h: 3.4, plinthH: 0.6 });
  void a; void b; void ts0;
}
const ts0 = 0;

function krasnoflot(S) {
  const { P, M, uA, uB, hD } = S;
  for (const [uE, ts] of [[uA - 0.9, -1], [uB + 0.9, 1]]) for (const sg of [-1, 1]) {
    const z = sg * (hD + 0.55);
    P.box(M.pylon, uE - 0.25, uE + 0.25, 0, 0.9, z - 0.25, z + 0.25, 'b', 1.1); P.box(M.coping, uE - 0.3, uE + 0.3, 0.86, 0.94, z - 0.3, z + 0.3, 'b', 1);
    colLamp(P, M, uE, 0.94, z, Math.PI / 2, sg);
    void ts;
  }
}

export const FOOT_X = {
  pochtamt: { cfg: (M) => ({ y0: 0.3, steps: 2, rise: 0.15, ext: 1.0, th: 0.3, fas: M.fasPochtamt, rail: 'ovals', hex: '#33493a', gold: { kind: 'ovalsG', hex: '#8a6a2a' }, plank: true }), extra: pochtamt },
  lviny: { cfg: (M) => ({ y0: 0.2, steps: 2, rise: 0.1, ext: 1.2, th: 0.35, fas: M.fasLviny, rail: 'x-net', hex: '#aab2b8', gold: { kind: 'x-netG', hex: '#d8aa30' }, plank: true }), extra: lviny },
  krasnogv: { cfg: (M) => ({ y0: 0.98, steps: 7, rise: 0.14, ext: 1.0, th: 0.7, fas: M.fasKrasnogv, rail: 'lattice', hex: '#202428', plank: false }), extra: krasnogv },
  krasnoflot: { cfg: (M) => ({ y0: 0.8, steps: 5, rise: 0.16, ext: 1.0, th: 0.9, fas: M.fasKrasnoflot, rail: 'plainrods', hex: '#3f5a46', plank: false }), extra: krasnoflot },
};
