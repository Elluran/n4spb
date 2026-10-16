// landmarksK/church.js - the Church of the Saviour on Spilled Blood in the church frame C (frame.js): body (cube + gables), tower, porches, tent, onions, apses, mosaics, precinct buildings.
import * as L from './../layout.js';
import { C0, ROT_C, CF } from './frame.js';
import { body } from './church/body.js';
import { tower } from './church/tower.js';
import { porches } from './church/porches.js';
import { tent } from './church/tent.js';
import { onions } from './church/onions.js';
import { apses } from './church/apses.js';
import { addPolyColliders } from '../lib/massing.js';

const STAGES = [['body', body], ['tower', tower], ['porches', porches], ['tent', tent], ['onions', onions], ['apses', apses]];

export async function build(K) {
  const P = K.P, errs = [];
  P.push(C0.x, 0, C0.z, ROT_C);
  for (const [name, fn] of STAGES) {
    try { fn(K); } catch (e) { console.error(`[landmarksK] church/${name}:`, e); errs.push(`${name}: ${e && e.stack || e}`); }
  }
  P.pop();
  try { const rec = L.buildingById('w28966446'); if (rec) for (const poly of rec.polys) addPolyColliders(K.ctx, poly, 0, 45, 1.0); } catch (e) { errs.push('colliders: ' + e); }
  // ---- services for people / props / traffic (dossier 13.10)
  const yawTo = (x, z, tx, tz) => L.yawToward(x, z, tx, tz);
  K.svc.church = {
    centre: [C0.x, C0.z], rotY: ROT_C, frame: 'x = a toward the altar (bearing 101.5 deg), z = b toward the south porch',
    entrances: { visitors: [-1270.4, -874.2], turnstile: [-1267.8, -880.9], ticket: [-1254.5, -877.0], sPorch: [-1278.2, -835.4], gateE: [-1201.2, -840.6] },
    queue: [[-1250, -887], [-1260, -889], [-1267, -887], [-1268, -881]], towerFace: [-1282.1, -856.2], hood: [-1282.4, -856.2],
  };
  K.svc.crowd.push({ id: 'saviour-queue', kind: 'queue', pts: K.svc.church.queue, n: 40 },
    { id: 'saviour-guides', kind: 'group', x: -1268, z: -884, r: 5, n: 18 }, { id: 'saviour-photo-S', kind: 'photo', x: -1262, z: -812, r: 12, n: 26 },
    { id: 'saviour-photo-W', kind: 'photo', x: -1303, z: -840, r: 14, n: 22 }, { id: 'saviour-painters', kind: 'painters', x: -1214, z: -870, r: 8, n: 8 });
  for (const [x, z, name] of [[-1318, -720, 'Спас на Крови с набережной канала Грибоедова'], [-1262, -893, 'Северный вход Спаса на Крови'], [-1258, -812, 'Южный портал Спаса на Крови'], [-1188, -841, 'Спас на Крови из Михайловского сада'], [-1330, -600, 'Спас на Крови: вид с канала от Итальянского моста']]) K.svc.photoSpots.push({ x, z, yaw: yawTo(x, z, C0.x, C0.z), pitch: 10, name });
  K.svc.monuments.push({ id: 'w28966446', name: 'Спас на Крови', x: C0.x, z: C0.z, h: 81 });
  // the vases at the porch fronts are solid
  for (const [mx, mz] of [[-14.9, -20.65], [-23.5, -20.65], [-23.5, 21.75], [-14.9, 21.75]]) CF.cyl(K.ctx.physics, mx, mz, 0.7, 0, 2.9);
  if (errs.length) throw new Error(errs.join('\n'));
}
