// The garden site as one object for the CPU tools (cams-check, height-test): the North layout helpers (insideBuilding, buildingAt, isOnRoad, heightAt, inPlay), the data modules of
// src/world/landmarksTauride/data, and the questions the tools ask: how far to the water, to a bridge deck, to a fence; is there a line of sight; can a walker get there from the south gate.
// Import it AFTER nothing else: it registers the North import-map hooks itself (tools/area.mjs north <tool> works as well).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, DATA_DIR, enterNorth, ringDist, polyDist, inPolys, inPoly, inRing } from './common.mjs';

await enterNorth();
const imp = (f) => import(pathToFileURL(f).href);
export const L = await imp(path.join(ROOT, 'src/world/layout.js'));
export const W = await imp(path.join(DATA_DIR, 'water.js'));
export const Br = await imp(path.join(DATA_DIR, 'bridges.js'));
export const P = await imp(path.join(DATA_DIR, 'paths.js'));
export const Fu = await imp(path.join(DATA_DIR, 'furniture.js'));
export const Fo = await imp(path.join(DATA_DIR, 'footprints.js'));
export const U = W.WATER_UNION;
export const GARDEN = Fo.GARDEN;
export const S_GATE = { x: 1226, z: -1267.8 };                    // gate n828488069

/** signed distance to the water union outline: > 0 on land (distance to the shore), < 0 in the water (depth from the shore); holes (islands) count as land */
export function waterDist(x, z) {
  let m = Infinity;
  for (const p of U) for (const r of [p.o, ...p.h]) m = Math.min(m, ringDist(x, z, r));
  return inPolys(x, z, U) ? -m : m;
}
/** distance to the nearest bridge deck axis (the deck after the old extension) */
export const bridgeDist = (x, z) => Math.min(...Br.BRIDGE_WAYS.map((b) => polyDist(x, z, b.deck)));
/** distance to the nearest mapped fence */
export const fenceDist = (x, z) => Math.min(...Fu.FENCES.map((f) => polyDist(x, z, f.pts)));
/** the nearest garden way: { d, id, cls } */
export function pathNear(x, z) { let best = null; for (const p of P.PATHS) { const d = polyDist(x, z, p.pts); if (!best || d < best.d) best = { d, id: p.id, cls: p.cls }; } return best; }
export const inGarden = (x, z) => inPoly(x, z, GARDEN);
/** the nearest garden building footprint (not the palace): distance in metres, 0 inside */
export function footprintDist(x, z) { let m = Infinity; for (const f of Fo.FOOTPRINTS) for (const p of f.polys) m = Math.min(m, inPoly(x, z, p) ? 0 : ringDist(x, z, p.o)); return m; }
/** clear line of sight between two ground points: no building of the layout between them (sampled every 0.5 m) */
export function los(x0, z0, x1, z1) {
  const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.5);
  for (let i = 1; i < n; i++) { const t = i / n; if (L.buildingAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false; }
  return true;
}

/**
 * Walkable raster of the garden surroundings (1 m cells): land (not in the water union, 0.4 m from the shore), not inside a building, bridge decks always walkable. `reach(x0, z0)` flood-fills
 * (8 neighbours) from a start point and returns a function cell -> reachable. Fences are NOT obstacles (the mapped fence has openings at every gate and path crossing, the flood does not know them).
 */
export function walkGrid(box = { x0: 880, x1: 1540, z0: -1830, z1: -1230 }, cell = 1) {
  const nx = Math.ceil((box.x1 - box.x0) / cell), nz = Math.ceil((box.z1 - box.z0) / cell);
  const ok = new Uint8Array(nx * nz);
  const deckHalf = Br.BRIDGE_DECK_WIDTH.value / 2 + 0.4;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = box.x0 + (i + 0.5) * cell, z = box.z0 + (j + 0.5) * cell;
    const onDeck = bridgeDist(x, z) <= deckHalf;
    ok[j * nx + i] = onDeck || (waterDist(x, z) > 0.4 && !L.insideBuilding(x, z, 0.3)) ? 1 : 0;
  }
  const idx = (x, z) => { const i = Math.floor((x - box.x0) / cell), j = Math.floor((z - box.z0) / cell); return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : j * nx + i; };
  return {
    box, nx, nz, ok, idx,
    reach(x0, z0) {
      const seen = new Uint8Array(nx * nz); const s = idx(x0, z0);
      if (s < 0 || !ok[s]) return () => false;
      const q = [s]; seen[s] = 1;
      while (q.length) { const c = q.pop(), ci = c % nx, cj = (c - ci) / nx; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue; const n = b * nx + a; if (!seen[n] && ok[n]) { seen[n] = 1; q.push(n); } } }
      return (x, z) => { const k = idx(x, z); return k >= 0 && seen[k] === 1; };
    },
  };
}
export { inRing, inPoly, inPolys, ringDist, polyDist };
