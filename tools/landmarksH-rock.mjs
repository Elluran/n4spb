// landmarksH-rock.mjs - offline test of the Thunder Stone mesh: triangle count, build ms, orientation / hole statistics.
globalThis.__rockTime = true;
import { buildRock } from '../src/world/landmarksH/thunder_rock.js';
globalThis.__rockStats = {};
const P = { quad() {} };
const t0 = performance.now();
const r = buildRock(P, null, { ru: 1, la: 1 });
console.log('tris', r.tris, 'ms', (performance.now() - t0).toFixed(0));
console.log(JSON.stringify(globalThis.__rockStats));
