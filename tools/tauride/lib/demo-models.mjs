// Height models for tools/tauride-height-test.mjs. A MODEL is { name, heightAt(x, z), waterLevel, wadeDepth, inWater(x, z), addColliders(ph, engine), carBlocked?(x, z) }:
//   heightAt      the terrain the walker stands on (the engine's layout.heightAt: the garden team's terrain goes here)
//   waterLevel    the surface of the ponds (m); the depth of the water at a point is max(0, waterLevel - heightAt) where inWater is true
//   wadeDepth     the deepest water a walker may stand in (m); the design rule is "no wading": colliders keep the walker out of anything deeper
//   addColliders  adds the collider set of the model to a core/physics.js Physics (shore blocks, bridge decks, ...)
//   carBlocked    the predicate the drive code would use for the keep-out (default: the engine's today: heightAt < -1 or inside a building)
// 'north' is the generic North of today (no ponds, no hills: the height is the engine's flat ground). 'demo-trap', 'demo-contour' and 'demo-wade' are SYNTHETIC models on the real water outline of the
// garden: they exist to prove that the harness tells a trap from a fix (the design numbers of the plan: water -0.45, bed -1.2, bank 1:3; the old module: bed -1.4 with a 0.22 m shore box).
// A garden team model is an ES module `export const model = { ... }` (or `export default`) given with --model <file>.
import { inPolys, ringDist, bbox } from './common.mjs';

const DECK = { top: 0.15, y0: -0.25, w: 3 };
/** shore segments of the water union (outer rings and island holes) as { x, z, len, rot, nx, nz } with (nx, nz) the unit normal pointing to the LAND */
export function shoreSegments(U, wet) {
  const out = [];
  for (const p of U) for (const r of [p.o, ...p.h]) for (let i = 0; i < r.length; i += 2) {
    const a = [r[i], r[i + 1]], b = [r[(i + 2) % r.length], r[(i + 3) % r.length]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.2) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; let nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
    if (wet(mx + nx * 1.5, mz + nz * 1.5)) { nx = -nx; nz = -nz; }          // point the normal to the land side
    out.push({ x: mx, z: mz, len, rot: Math.atan2(b[0] - a[0], b[1] - a[1]), nx, nz });
  }
  return out;
}

function bridgeBoxes(ph, Br) {
  for (const w of Br.BRIDGE_WAYS) for (let i = 0; i + 3 < w.deck.length; i += 2) {
    const ax = w.deck[i], az = w.deck[i + 1], bx = w.deck[i + 2], bz = w.deck[i + 3], len = Math.hypot(bx - ax, bz - az);
    ph.addWalkBox((ax + bx) / 2, (az + bz) / 2, DECK.w, len, Math.atan2(bx - ax, bz - az), DECK.top, DECK.y0);
  }
}
const nearDeck = (Br, x, z, m) => Br.BRIDGE_WAYS.some((w) => { for (let i = 0; i + 3 < w.deck.length; i += 2) { const dx = w.deck[i + 2] - w.deck[i], dz = w.deck[i + 3] - w.deck[i + 1], l2 = dx * dx + dz * dz; const t = Math.max(0, Math.min(1, ((x - w.deck[i]) * dx + (z - w.deck[i + 1]) * dz) / (l2 || 1))); if (Math.hypot(x - w.deck[i] - t * dx, z - w.deck[i + 1] - t * dz) < m) return true; } return false; });

/** the models, built on a site (lib/site.mjs) and an engine layout L */
export function builtinModels(S, L) {
  const U = S.U, Br = S.Br;
  const wet = (x, z) => inPolys(x, z, U) && !nearDeck(Br, x, z, DECK.w / 2 + 0.2);
  const water = { waterLevel: -0.45, wadeDepth: 0.3, inWater: wet };
  const bed = -1.2;
  /** signed distance to the shore: > 0 land, < 0 water (the union outline) */
  const sd = (x, z) => S.waterDist(x, z);
  const bank = (x, z) => {                         // the design profile: bank top +0.1 -> 1:3 -> waterline -0.45 at the outline -> 1:3 -> bed -1.2
    const d = sd(x, z);
    if (d > 0) return Math.min(0.1, -0.45 + d / 3);
    return Math.max(bed, -0.45 + d / 3);
  };
  return {
    north: { name: 'north (the generic North of today: flat ground, no ponds, no hills)', heightAt: (x, z) => L.heightAt(x, z), waterLevel: 0, wadeDepth: 0.3, inWater: wet, addColliders() {} },
    'demo-trap': {
      name: 'demo-trap (synthetic copy of the old module: bed -1.4 inside the water outline, shore blocks y -1.5 .. 0.22, decks)', ...water, waterLevel: -0.55,
      heightAt: (x, z) => (wet(x, z) ? -1.4 : L.heightAt(x, z)),
      addColliders(ph) {
        for (const s of shoreSegments(U, (x, z) => inPolys(x, z, U))) { const n = Math.max(1, Math.ceil(s.len / 4)); for (let k = 0; k < n; k++) { const f = (k + 0.5) / n - 0.5; const x = s.x + Math.sin(s.rot) * s.len * f, z = s.z + Math.cos(s.rot) * s.len * f; if (nearDeck(Br, x, z, DECK.w / 2 + 1.2)) continue; ph.addBox(x, z, 0.64, s.len / n + 0.02, s.rot, -1.5, 0.22); } }
        bridgeBoxes(ph, Br);
      },
    },
    'demo-contour': {
      name: 'demo-contour (the plan: bank profile 1:3, waterline -0.45, bed -1.2, colliders on the -0.3 contour that reach 1.25 m: no wading)', ...water, heightAt: bank,
      addColliders(ph) {
        const d0 = 0.45;                                    // the -0.3 contour lies 0.15 m above the waterline = 0.45 m inland on a 1:3 bank
        for (const s of shoreSegments(U, (x, z) => inPolys(x, z, U))) {
          const x = s.x + s.nx * d0, z = s.z + s.nz * d0; if (nearDeck(Br, s.x, s.z, DECK.w / 2 + 1.0)) continue;
          ph.addBox(x, z, 0.3, s.len + 0.2, s.rot, -1.5, 1.25);
        }
        bridgeBoxes(ph, Br);
      },
    },
    'demo-wade': {
      name: 'demo-wade (the plan profile with NO colliders: the walker wades in to 0.75 m and can walk out again)', ...water, heightAt: bank,
      addColliders(ph) { bridgeBoxes(ph, Br); },
    },
  };
}
export { bbox, ringDist };
