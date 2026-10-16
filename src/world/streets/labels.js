// streets/labels.js - the REGISTRY OF FACADE LABELS (docs/rules/LABELS-API.md): street-name plates, house-number plates, shop signs, bracket clocks, ads - everything that hangs flat on a wall.
// Two labels on the same wall that overlap in the wall plane z-fight / cross each other (the 'labels crossing each other' report). Every builder reserves the rectangle it is about to draw BEFORE
// drawing and skips (or moves) the label when reserve() says no:
//     const labels = ctx.services.labels;                 // published by streets.js (build order: environment, streets, city, ... props)
//     if (labels && !labels.reserve(buildingId, x, y, z, w, h, nx, nz, 'shop')) return;     // occupied: do not draw
// (x, y, z) = the CENTRE of the label's rectangle on (or 3-60 cm in front of) the wall, w x h metres, (nx, nz) = the unit normal pointing OUT of the wall. The wall axis is (nz, -nx).
// Two boxes collide when they face the same way (normals within ~37 degrees), stand within 0.7 m of one plane and overlap in the wall axis and in height (2 cm margin).
// A shop fascia that must not move is reserved first (reserve returns false for the LATER label): the plates are placed by streets.js before the city module builds, so city/signs.js and
// city/shops.js ask reserve() for their rectangle and skip / shift the sign where a plate (or any earlier label) already holds it.
export function makeLabels() {
  const CELL = 6, grid = new Map(), all = [];
  const cells = (b, fn) => { const r = Math.max(b.w, b.h) / 2 + 1.0; for (let cx = Math.floor((b.x - r) / CELL); cx <= Math.floor((b.x + r) / CELL); cx++) for (let cz = Math.floor((b.z - r) / CELL); cz <= Math.floor((b.z + r) / CELL); cz++) fn(cx * 4096 + cz); };
  const hit = (a, b) => {
    if (a.nx * b.nx + a.nz * b.nz < 0.8) return false;
    const dx = b.x - a.x, dz = b.z - a.z;
    if (Math.abs(dx * a.nx + dz * a.nz) > 0.7) return false;
    return Math.abs(dx * a.nz - dz * a.nx) < (a.w + b.w) / 2 + 0.02 && Math.abs(b.y - a.y) < (a.h + b.h) / 2 + 0.02;
  };
  const isFree = (x, y, z, w, h, nx, nz) => {
    const b = { x, y, z, w, h, nx, nz }; let free = true;
    cells(b, (k) => { if (!free) return; for (const o of grid.get(k) || []) if (hit(b, o)) { free = false; return; } });
    return free;
  };
  /** reserve the rectangle: true = it is yours (draw it), false = another label holds the place (nothing is recorded) */
  const reserve = (bld, x, y, z, w, h, nx, nz, kind = 'label') => {
    const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
    if (!isFree(x, y, z, w, h, nx, nz)) return false;
    const b = { bld, x, y, z, w, h, nx, nz, kind };
    cells(b, (k) => { let g = grid.get(k); if (!g) grid.set(k, (g = [])); g.push(b); });
    all.push(b); return true;
  };
  return { reserve, isFree, list: () => all, count: () => all.length, clear: () => { grid.clear(); all.length = 0; } };
}
