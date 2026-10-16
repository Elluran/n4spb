// landmarksOktyabrsky/october.js - the bronze group "Октябрь" (A. T. Matveev; plaster 1927, cast 1968 for the hall; OSM n1732981183) in front of the NNE end of the stair, on the forecourt.
// Dossier docs/research/oktyabrsky.md section 9, oktyabrsky-square.md 5.4, photos refs/oktyabrsky 03 (left edge), 06, 10, sq_05 crops: THREE nude male figures (a Red Army soldier, a peasant, a worker)
// in a compact pyramid on a plain unpolished grey granite block 1.1 m high (~2.4 x 1.4 m): one standing figure at the back rising to ~2.0 m, one seated upright at the left, one kneeling in front
// leaning forward; dark green-brown bronze.  The photos put it at hall (u 56, v -9), at the foot of the stair, not at the OSM node (u 53.9, v -15): kept +-6 m open.  Faces the front (WNW).
import * as THREE from 'three';
import * as L from '../layout.js';
import { OCT } from './frame.js';
import { octoberFigs } from './figure.js';
import { figureMats } from '../lib/figures.js';
import { coverFn } from './surfaces.js';

export function build(K) {
  const ctx = K.ctx, P = K.P, M = K.M, ph = ctx.physics, cover = coverFn(ctx);
  if (cover(OCT.x, OCT.z) > -1.0 || L.insideBuilding(OCT.x, OCT.z, 0.5)) { console.warn('[landmarksOktyabrsky] the October group stands on a carriageway: skipped'); return; }
  const mk = figureMats(ctx).keys('bronze', 'bronze'), figs = octoberFigs(), s = 1.15, Y = 1.1;
  P.push(OCT.x, 0, OCT.z, OCT.rot);
  // block: a low step and the granite block with a chamfered cap
  P.box(M.octGranite, -1.45, 1.45, 0, 0.18, -0.95, 0.95, 'b', 1);
  P.box(M.octGranite, -1.2, 1.2, 0.18, Y - 0.1, -0.7, 0.7, 'b', 1);
  P.box(M.octGranite, -1.26, 1.26, Y - 0.1, Y, -0.76, 0.76, 'b', 1);
  // a bronze groundwork under the figures (a flat mound), a boulder under the seated one
  P.geo(mk.main, new THREE.SphereGeometry(1, 12, 6), 0, Y + 0.03, 0.0, 0, 0, 0, 1.12, 0.07, 0.66);
  P.geo(mk.main, new THREE.SphereGeometry(1, 10, 7), 0.62, Y + 0.2, -0.05, 0, 0, 0, 0.42, 0.26, 0.4);
  // standing (back), seated (left, seen from the front), kneeling (front, leaning forward)
  figs[0].place(P, mk, -0.28, Y + 0.05, -0.3, 0.15, s);
  figs[1].place(P, mk, 0.62, Y + 0.28, -0.02, -0.35, s);
  figs[2].place(P, mk, -0.12, Y + 0.05, 0.12, 0.25, s);
  P.pop();
  ph.addBox(OCT.x, OCT.z, 2.5, 1.5, OCT.rot, 0, 3.4);
  K.svc.monuments.push({ id: 'n1732981183', name: 'Скульптурная группа «Октябрь» (А. Т. Матвеев)', x: OCT.x, z: OCT.z, h: 3.3 });
}
