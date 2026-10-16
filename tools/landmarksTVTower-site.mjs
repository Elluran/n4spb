// tools/landmarksTVTower-site.mjs - ASCII map of the site of the TV tower from the baked data: B building, R road, W water, g walkable green, # module fence ring, T tower hexagon.
// usage: node tools/landmarksTVTower-site.mjs [halfSize=70] [step=2]
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = globalThis;
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksTVTower/frame.js')).href);
const { FENCE_R } = await import(pathToFileURL(path.join(root, 'src/world/landmarksTVTower/fence.js')).href);
const half = Number(process.argv[2] || 70), step = Number(process.argv[3] || 2);
const hexDist = (x, z, r) => { // distance-like value of the point to the regular hexagon (corners N / S): <= r means inside
  const ax = Math.abs(x), az = Math.abs(z), s = Math.sqrt(3) / 2;
  return Math.max(ax / s, az + ax * 0.5 / s);
};
console.log('site centre', F.O, ' inPlay', L.inPlay ? L.inPlay(F.O.x, F.O.z) : '?');
for (let dz = -half; dz <= half; dz += step) {
  let row = '';
  for (let dx = -half; dx <= half; dx += step) {
    const x = F.O.x + dx, z = F.O.z + dz;
    let ch = '.';
    if (L.insideBuilding && L.insideBuilding(x, z, 0)) ch = 'B';
    else if (L.isOnRoad && L.isOnRoad(x, z, 0)) ch = 'R';
    else if (L.waterAt && L.waterAt(x, z)) ch = 'W';
    const hd = hexDist(dx, dz, 1);
    if (Math.abs(hd - FENCE_R) < step * 0.6) ch = '#';
    else if (hd < F.R_FOOT) ch = ch === '.' ? 't' : ch;
    row += ch;
  }
  console.log(row);
}
console.log('exports with road/water/ground names:', Object.keys(L).filter((k) => /road|water|ground|surface|walk|barrier|fence/i.test(k)).join(' '));
