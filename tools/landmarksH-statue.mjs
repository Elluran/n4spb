// landmarksH-statue.mjs - offline build of the bronze group: triangle count and build ms.
import { buildStatue } from '../src/world/landmarksH/bronze_statue.js';
import { rockH, PLATEAU } from '../src/world/landmarksH/thunder_rock.js';
let tris = 0, parts = 0;
const P = { geo(m, g) { parts++; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } };
rockH(0, 0);
const t0 = performance.now();
buildStatue(P, { bronze: 1, snake: 2, dark: 3 }, rockH, PLATEAU);
console.log('statue tris', Math.round(tris), 'parts', parts, 'ms', (performance.now() - t0).toFixed(0));
