// environment/islands.js - WHERE the island rules of the 2026-10-14 integration pass apply (docs/research/islands2-integration-env-ground-trees.md).
// The islands of round 2 (Krestovsky K1..K4, Yelagin YE1, Kamenny KA1..KA5, Aptekarsky AP1..AP7, Petrovsky PE1..PE6) are the rectangles appended after the Vasilievsky frame in data/city.js RECT_NAMES.
// A point is "island ground" when it lies in the PLAY rectangle of one of them and in NO play rectangle of an older region (OLD .. MS): the reviewed districts keep every tree, lawn and bed exactly as
// they were (the rules that read this file are generators of trees / claims / ground class; tools/environment-regress.mjs --extra and field-class hashes prove the old boxes).
import { PLAY_RECTS, RECT_NAMES } from '../data/city.js';

const FIRST = RECT_NAMES.indexOf('K1');
const NEW = FIRST < 0 ? [] : PLAY_RECTS.filter((r, i) => i >= FIRST), OLD = FIRST < 0 ? PLAY_RECTS : PLAY_RECTS.filter((r, i) => i < FIRST);
const hit = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

/** true on the ground of the round-2 islands (inside an island play rectangle, outside every older play rectangle) */
export function inIslands(x, z) {
  let a = false;
  for (let i = 0; i < NEW.length; i++) if (hit(NEW[i], x, z)) { a = true; break; }
  if (!a) return false;
  for (let i = 0; i < OLD.length; i++) if (hit(OLD[i], x, z)) return false;
  return true;
}

/** a closed 24-gon ring (flat [x, z, ...]) round (cx, cz) with radius r: the claim rings of the sight corridors are given as discs */
export function discRing(cx, cz, r, n = 24) {
  const out = [];
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; out.push(cx + Math.cos(a) * r, cz + Math.sin(a) * r); }
  return out;
}

/** the play rectangles of the round-2 islands, each with the older play rectangles that overlap it (field.js paints the island yards cell by cell over these only): [{ x0, x1, z0, z1, old: [rect, ...] }] */
export const ISLAND_RECTS = NEW.map((r) => ({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, old: OLD.filter((o) => o.x0 < r.x1 && o.x1 > r.x0 && o.z0 < r.z1 && o.z1 > r.z0) }));

/** the parks of Yelagin / Kamenny / Aptekarsky / Petrovsky (rectangles YE, KA, AP, PE; not the Krestovsky round of 2026-10-12): island ground that is not in an older play rectangle */
const ROUND2 = PLAY_RECTS.filter((r, i) => i >= FIRST && /^(YE|KA|AP|PE)\d+$/.test(RECT_NAMES[i]));
export function inRound2(x, z) {
  let a = false;
  for (let i = 0; i < ROUND2.length; i++) if (hit(ROUND2[i], x, z)) { a = true; break; }
  if (!a) return false;
  for (let i = 0; i < OLD.length; i++) if (hit(OLD[i], x, z)) return false;
  return true;
}

/** lawn strips along the short end edges of sight buildings (landmarksLETI request: lawn strips with a low steel rail in front of the NW / NE arm ends of Corpus 7, photos 04 / 15): { module, id, edges: [edge index i = vertex i -> i + 1 of the first polygon], w } */
export const SIGHT_STRIPS = [{ module: 'landmarksLETI', id: 'w28370226', edges: [3, 6], w: 3 }];
/** the strips of the owned buildings as [{ quad: [x, z] x 4, a: [x, z], b: [x, z], nx, nz, w }] (a -> b is the building edge, (nx, nz) points away from the building) */
export function sightStrips(BUILDINGS, isOwnedId) {
  const out = [];
  for (const s of SIGHT_STRIPS) {
    if (!isOwnedId(s.id)) continue;
    const b = BUILDINGS.find((q) => q.id === s.id); if (!b) continue;
    const o = b.polys[0].o, n = o.length / 2; let cx = 0, cz = 0; for (let i = 0; i < o.length; i += 2) { cx += o[i]; cz += o[i + 1]; } cx /= n; cz /= n;
    for (const e of s.edges) {
      const i = e % n, j = (e + 1) % n, ax = o[2 * i], az = o[2 * i + 1], bx = o[2 * j], bz = o[2 * j + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
      let nx = -dz / l, nz = dx / l; if (nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) { nx = -nx; nz = -nz; }
      out.push({ a: [ax, az], b: [bx, bz], nx, nz, w: s.w, quad: [ax, az, bx, bz, bx + nx * s.w, bz + nz * s.w, ax + nx * s.w, az + nz * s.w] });
    }
  }
  return out;
}
