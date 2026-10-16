import { rockF, macroF } from '../src/world/landmarksH/thunder_rock.js';
globalThis.__rockNoDetail = !!process.env.NODETAIL;
const z = Number(process.argv[2] ?? -3);
for (const y of [-0.3, -0.1, 0, 0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 2]) {
  let a = 0, b = 6; if (rockF(0, y, z) > 0) { console.log(y, 'empty'); continue; }
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (rockF(m, y, z) < 0) a = m; else b = m; }
  console.log('y', y, 'x edge', a.toFixed(3));
}
