// people/crosswalks.js - spatial lookup for the routing graph's zebra corridors (nav.js).
// Index the SAME conservative square used by the original scan, preserving crossing order and exact
// edge/margin tests. Crossings are append-only during nav construction; kerb extensions ea/eb may change.
const CELL = 32;
const key = (x, z) => (x + 4096) * 8192 + z + 4096;

export function createCrosswalkLookup(crossings) {
  const cells = new Map(); let indexed = 0;
  function extend() {
    for (; indexed < crossings.length; indexed++) {
      const c = crossings[indexed], radius = c.len / 2 + 6;
      for (let x = Math.floor((c.x - radius) / CELL), x1 = Math.floor((c.x + radius) / CELL); x <= x1; x++) {
        for (let z = Math.floor((c.z - radius) / CELL), z1 = Math.floor((c.z + radius) / CELL); z <= z1; z++) {
          const k = key(x, z); let list = cells.get(k); if (!list) cells.set(k, list = []); list.push(indexed);
        }
      }
    }
  }
  return (x, z, margin = 0.3) => {
    if (indexed < crossings.length) extend();
    const list = cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return -1;
    for (let j = 0; j < list.length; j++) {
      const i = list[j], c = crossings[i];
      if (Math.abs(x - c.x) > c.len / 2 + 6 || Math.abs(z - c.z) > c.len / 2 + 6) continue;
      const dx = x - c.ax, dz = z - c.az, along = dx * c.ux + dz * c.uz, lateral = -dx * c.uz + dz * c.ux;
      if (along > -margin - 0.3 - c.ea && along < c.len + margin + 0.3 + c.eb && Math.abs(lateral) < c.w / 2 + margin) return i;
    }
    return -1;
  };
}
