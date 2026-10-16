import * as L from '../src/world/layout.js';
const cams = []; const step = Number(process.argv[2] || 150);
for (const r of L.WORLD.rects) { if (r.x0 > -600) continue; for (let x = r.x0 + step / 2; x < r.x1; x += step) for (let z = r.z0 + step / 2; z < r.z1; z += step) { if (!L.inPlay(x, z, 0) || L.insideBuilding(x, z, 1.5) || L.inRiver(x, z)) continue; for (let k = 0; k < 2; k++) cams.push(`${Math.round(x)},${Math.round(z)},${Math.round(((k * 180) + (((x * 7 + z * 13) | 0) % 90) + 360) % 360)},2`); } }
console.log(cams.join(';'));
