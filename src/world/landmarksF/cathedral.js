// landmarksF/cathedral.js - Kazan Cathedral: orchestrates the colonnade, the pavilions, the porticos, the body of the church and the dome stack in the cathedral frame (frame.js).
import * as L from '../layout.js';
import { C0, ROT, W } from './frame.js';
import { colonnade, balusterMesh } from './colonnade.js';
import { pavilions } from './pavilion.js';
import { porticos } from './portico.js';
import { churchBody } from './body.js';
import { domeStack } from './dome.js';
import { cylAt } from './frame.js';
import { interior } from './interior.js';

export function build(K) {
  const P = K.P, errs = [];
  K.cols = []; K.interior = true;
  P.push(C0.x, 0, C0.z, ROT);
  for (const [name, fn] of [['colonnade', colonnade], ['pavilions', pavilions], ['porticos', porticos], ['body', churchBody], ['dome', domeStack], ['interior', interior]]) {
    try { fn(K); } catch (e) { console.error(`[landmarksF] cathedral/${name}:`, e); errs.push(`${name}: ${e && e.stack || e}`); }
  }
  P.pop();
  for (const c of K.cols) if (c[2] === 'p') cylAt(K.ctx.physics, c[0], c[1], 0.8, 0, 40);
  try { const im = balusterMesh(K); if (im) { K.ctx.noOutline(im); K.ctx.addStatic(im); K.extraTris += im.userData.tris || 0; } } catch (e) { errs.push('balusters: ' + e); }
  if (errs.length) throw new Error(errs.join('\n'));
}
