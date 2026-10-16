// bridges/foot.js - the footbridges of the Griboyedov Canal: Bankovsky (steel beam deck of planks 1.83 m wide between cast fan railings, four winged lions on grey pedestals with gilded wings and
// globe lamps, decorative chains; docs/research/west-canals-bridges.md 4.6, photos refs/canals 29-34), Mucny (humpback steel girder, three steps at each end, scroll railing, granite pylons with a name
// pole; photos 52-54) and Italyansky (flat dark-green plate girder, loop railing, four granite tumbas with lamp standards; photos 82 87).  The environment leaves a short gap in the quay
// (BRIDGE_ZONES w 5-6.5 m): this file closes it beside the deck with a railing on the bank line + a solid collider.
// Frame as in sites.js (u across the canal, v along it).  The deck: y(u) = y0 + hump (1 - t^2) between the banks, steps up from the ground at both ends.
import * as THREE from 'three';
import { frameOf, toUV, frameBounds } from './sites.js';
import { waterAt } from './arch.js';
import { railSpec, railWorld } from './rails.js';
import { griffin, lampBlack, pylon, tripod, tumba } from './sculpt.js';
import { FOOT_X } from './foot2.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function makeFoot(env, site) {
  const { ctx, P, M, rails } = env, f = frameOf(site), T = f.T;
  const w0 = waterAt(site, 0) || [-8.5, 8.5], a = w0[0], b = w0[1], D = site.deckW, hD = D / 2;
  const st = site.style;
  const X = FOOT_X[st];                                                    // the south-west footbridges (foot2.js)
  const table = {
    bankovsky: { y0: 0.22, steps: 2, rise: 0.11, ext: 1.4, th: 0.5, fas: M.fasPale, rail: 'fan', hex: '#7a8478', plank: true },
    mucny: { y0: 0.5, steps: 3, rise: 0.17, ext: 1.0, th: 0.45, fas: M.white, rail: 'scroll', hex: '#c4c8cc', plank: true },
    italyansky: { y0: 0.16, steps: 1, rise: 0.08, ext: 0.8, th: 0.5, fas: M.fasForest, rail: 'loops', hex: '#202428', plank: false },
  };
  const cfg = { ...(X ? X.cfg(M) : table[st] || table.mucny) };
  if (site.hex && !X) { cfg.hex = site.hex; cfg.fas = M.fasSennoy; }       // Sennoy: the Mucny twin in dark green
  const uA = a - cfg.ext, uB = b + cfg.ext, uc = (a + b) / 2, hw = (uB - uA) / 2, hump = site.hump;
  const yDeck = (u) => { const t = clamp((u - uc) / hw, -1, 1); return cfg.y0 + hump * (1 - t * t); };
  const slope = (u) => (Math.abs(u - uc) >= hw ? 0 : -2 * hump * (u - uc) / (hw * hw));
  const B = { site, f, T, a, b, uc, yDeck, info: { rails: 0, colliders: 0 } };
  B.world = (u, v) => ({ x: f.cx + u * f.c - v * f.s, z: f.cz + u * f.s + v * f.c });
  B.bounds = frameBounds(site, uA, uB, -hD, hD, 1.5);
  B.deckAt = (x, z) => { const q = toUV(site, x, z); return Math.abs(q.v) <= hD + 0.05 && q.u >= uA && q.u <= uB ? yDeck(q.u) : null; };

  B.draw = () => {
    P.push(f.cx, 0, f.cz, -T);
    const n = 16, deckMat = cfg.plank ? M.plank : M.footAsphalt, th = cfg.th;
    for (let i = 0; i < n; i++) {
      const u0 = uA + (uB - uA) * i / n, u1 = uA + (uB - uA) * (i + 1) / n, y0 = yDeck(u0), y1 = yDeck(u1);
      P.quad(deckMat, [u0, y0, -hD], [u1, y1, -hD], [u1, y1, hD], [u0, y0, hD], [0, 1, 0], [[u0, -hD / 0.9], [u1, -hD / 0.9], [u1, hD / 0.9], [u0, hD / 0.9]]);
      for (const sg of [-1, 1]) {
        const v = sg * (hD + 0.06);
        P.quad(cfg.fas, [u0, y0 - th, v], [u1, y1 - th, v], [u1, y1 + 0.02, v], [u0, y0 + 0.02, v], [0, 0, sg]);                  // girder face
        P.quad(cfg.fas, [u0, y0 + 0.02, v - sg * 0.06], [u1, y1 + 0.02, v - sg * 0.06], [u1, y1 + 0.02, v], [u0, y0 + 0.02, v], [0, 1, 0]);
        P.quad(cfg.fas, [u0, y0 - th, v - sg * 0.06], [u1, y1 - th, v - sg * 0.06], [u1, y1 - th, v], [u0, y0 - th, v], [0, -1, 0]);
      }
      P.quad(cfg.fas, [u0, y0 - th, -hD - 0.06], [u1, y1 - th, -hD - 0.06], [u1, y1 - th, hD + 0.06], [u0, y0 - th, hD + 0.06], [0, -1, 0]);
    }
    // approach steps at both ends (granite, width = deck + girders)
    const steps = cfg.steps, run = 0.32;
    for (const sg of [-1, 1]) {
      const uE = sg < 0 ? uA : uB;
      for (let k = 0; k < steps; k++) {
        const u0 = uE + sg * run * k, u1 = uE + sg * run * (k + 1);
        P.box(M.pave, Math.min(u0, u1), Math.max(u0, u1), 0, yDeck(uE) - cfg.rise * (k + 1), -hD - 0.08, hD + 0.08, 'b', 1);
      }
    }
    // railings: fan / scroll / loop panels between square posts, along both sides from bank to bank (+ the steps)
    const spec = railSpec(cfg.rail), uR0 = a - 0.2, uR1 = b + 0.2, len = uR1 - uR0, nb = Math.max(1, Math.round(len / spec.W)), bw = len / nb;
    const hexPost = ctx.mat.toon(cfg.hex, { paint: 0.03, name: 'brg-fpost-' + cfg.hex });
    for (const sg of [-1, 1]) {
      const v = sg * (hD - 0.02);
      for (let i = 0; i < nb; i++) {
        const ua = uR0 + bw * i, w = B.world(ua + 0.04, v);
        rails.add({ kind: cfg.rail, hex: cfg.hex, x: w.x, y: yDeck(ua) + 0.06, z: w.z, rotY: -T, roll: Math.atan(slope(ua + bw / 2)), len: bw - 0.08 }); B.info.rails++;
        if (cfg.gold) for (const dv of [0.012, -0.012]) { const wg = B.world(ua + 0.04, v + dv); rails.add({ kind: cfg.gold.kind, hex: cfg.gold.hex, x: wg.x, y: yDeck(ua) + 0.06, z: wg.z, rotY: -T, roll: Math.atan(slope(ua + bw / 2)), len: bw - 0.08 }); }
      }
      for (let i = 0; i <= nb; i++) { const u = uR0 + bw * i, y = yDeck(u); P.box(hexPost, u - 0.045, u + 0.045, y, y + spec.H + 0.12, v - 0.045, v + 0.045, 'b', 1); P.box(hexPost, u - 0.07, u + 0.07, y + spec.H + 0.1, y + spec.H + 0.15, v - 0.07, v + 0.07, 'b', 1); }
      for (let i = 0; i < nb; i++) { const ua = uR0 + bw * i, ub = ua + bw, ya = yDeck(ua) + 0.06 + spec.H, yb = yDeck(ub) + 0.06 + spec.H; P.quad(hexPost, [ua, ya + 0.05, v - 0.04], [ub, yb + 0.05, v - 0.04], [ub, yb + 0.05, v + 0.04], [ua, ya + 0.05, v + 0.04], [0, 1, 0]); }
    }
    if (X) X.extra({ P, M, ctx, B, a, b, hD, uA, uB, yDeck, site, cfg });
    else if (st === 'bankovsky') bankovsky(); else if (st === 'mucny') mucny(); else italyansky();
    closeGap();
    P.pop();
  };

  // ---------------------------------------------------------------- Bankovsky: four griffins on pedestals, chains, the gilded lamps
  function bankovsky() {
    for (const [u, ts] of [[a - 0.55, -1], [b + 0.55, 1]]) for (const sg of [-1, 1]) {
      const y = 0.0, v = sg * (hD + 0.62);
      griffin(P, M, u, y, v, ts > 0 ? Math.PI / 2 : -Math.PI / 2, { ph: 1.0 });
    }
    // chains: a catenary of round links outside each railing from pedestal top to pedestal top, with thin hangers to the deck
    for (const sg of [-1, 1]) {
      const v = sg * (hD + 0.1), u0 = a - 0.55, u1 = b + 0.55, seg = 20;
      let prev = null;
      for (let i = 0; i <= seg; i++) {
        const t = i / seg, u = u0 + (u1 - u0) * t, p = [u, yDeck(u) + 0.95 - 0.42 * 4 * t * (1 - t), v];
        if (prev) P.cyl(M.iron, prev, p, 0.024, 0.024, 5, false);
        if (i > 0 && i < seg && i % 2 === 0) P.cyl(M.iron, [u, yDeck(u) + 0.06, v], [u, p[1], v], 0.008, 0.008, 3, false);
        prev = p;
      }
    }
  }
  // ---------------------------------------------------------------- Mucny: two granite pylons + the black tripod name pole at the west end, a steel handrail
  function mucny() {
    for (const sg of [-1, 1]) {
      const u0 = uA - 1.4, u1 = uA - 0.4, y0 = 0;
      P.box(M.pylonRough, u0, u1, y0, y0 + 1.15, sg * (hD + 0.45) - 0.4, sg * (hD + 0.45) + 0.4, 'b', 1.4);
      P.box(M.coping, u0 - 0.06, u1 + 0.06, y0 + 1.1, y0 + 1.2, sg * (hD + 0.45) - 0.46, sg * (hD + 0.45) + 0.46, 'b', 1.4);
    }
    tripod(P, M, uA - 0.9, 1.2, hD + 0.45, site.id === 'sennoy' ? 'Сенной мост' : 'Мучной мост', 0);
  }
  // ---------------------------------------------------------------- Italyansky: four granite tumbas with black lamp standards
  function italyansky() {
    for (const [u, ts] of [[a - 0.6, -1], [b + 0.6, 1]]) for (const sg of [-1, 1]) {
      const v = sg * (hD + 0.55), y = 0;
      tumba(P, M, u, y, v, 0, 0.8, 1.15, 0.3);
      lampBlack(P, M, u, 1.45, v, 2.6);
    }
  }

  // ---------------------------------------------------------------- closing the quay gap beside the deck (world frame)
  function closeGap() {
    const zoneW = site.gapW ?? 6.5, hz = zoneW / 2, vEdge = hD + (st === 'bankovsky' ? 1.35 : 0.9);
    for (const [u, ts] of [[a - 0.35, -1], [b + 0.35, 1]]) for (const sg of [-1, 1]) {
      const v0 = sg * vEdge, v1 = sg * (hz + 0.3), vm = (v0 + v1) / 2, len = Math.abs(v1 - v0);
      if (len < 0.3) continue;
      const w = B.world(u, vm);
      ctx.physics.addBox(w.x, w.z, 0.5, len + 0.1, -T, -6, 1.45); B.info.colliders++;                       // box local z runs along v after the rotation by -T
      const pw = ctx.mat.toon('#b9a89e', { paint: 0.05, name: 'brg-quaycop' });
      P.box(pw, u - 0.3, u + 0.3, 0.0, 0.2, Math.min(v0, v1), Math.max(v0, v1), 'b', 1);
      P.box(M.parapetPink, u - 0.25, u + 0.25, 0.2, 1.0, Math.min(v0, v1), Math.max(v0, v1), 'b', 1.2);
    }
  }

  B.colliders = () => {
    const ph = ctx.physics, rampRot = Math.atan2(f.c, f.s);
    const m = 8;
    for (let i = 0; i < m; i++) { const u0 = uA + (uB - uA) * i / m, u1 = uA + (uB - uA) * (i + 1) / m, w = B.world((u0 + u1) / 2, 0); ph.addWalkRamp(w.x, w.z, D + 0.1, u1 - u0 + 0.04, rampRot, yDeck(u0), yDeck(u1), 2.5); B.info.colliders++; }
    for (const sg of [-1, 1]) {                                                       // steps up to the deck at both ends
      const uE = sg < 0 ? uA : uB, w = B.world(uE + sg * cfg.steps * 0.16, 0);
      ph.addStairs(w.x, w.z, D + 0.1, cfg.steps * 0.32, sg < 0 ? rampRot : rampRot + Math.PI, 0, yDeck(uE), cfg.steps); B.info.colliders++;
    }
    for (const sg of [-1, 1]) { const w = B.world(uc, sg * (hD + 0.02)); ph.addBox(w.x, w.z, uB - uA, 0.3, -T, -6, yDeck(uc) + 1.2); B.info.colliders++; }   // the railings: solid from the water to hand height
  };
  return B;
}
void THREE; void pylon;
