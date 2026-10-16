// entrances.js - granite steps (and a small iron-and-sheet canopy over half of the doors) in front of the parade doors (парадные) that the wall shader paints, and the grey zinc
// downpipes (architecture.md C9: every 15-25 m, from the cornice to the plinth, 12-15 cm, 8 cm off the wall; matching the facade on restored houses, yellow / green / pink on a few).
import * as THREE from 'three';
import { hash01 } from '../lib/massing.js';
import * as L from '../layout.js';
import { ColorBuilder } from './cornice.js';
import { templateOf, stamp } from './meshes.js';
import { labelRegistry } from './slots.js';
import { MONUMENTS } from '../data/city.js';

/** mapped memorial plaques of the island (OSM nodes memorial / plaque with an inscription or a name: props/vo.js draws them with the real text); lazily listed */
let _osmPlaques = null;
function osmPlaqueNear(x, z, r) {
  if (!_osmPlaques) _osmPlaques = MONUMENTS.filter((m) => m.kind === 'memorial' && m.sub === 'plaque' && (m.inscription || m.name) && m.x < -2400).map((m) => [m.x, m.z]);
  for (const q of _osmPlaques) if (Math.abs(q[0] - x) < r && Math.abs(q[1] - z) < r && Math.hypot(q[0] - x, q[1] - z) < r) return true;
  return false;
}

function stepsGeo(canopy) {
  const cb = new ColorBuilder();
  const g1 = new THREE.Color('#9b9993'), g2 = new THREE.Color('#8b8984'), dk = new THREE.Color('#34383d');
  cb.boxLite([0, 0, 0.0], 1, 0, 0, 1, 2.1, 0.17, 0.8, g1, false);
  if (canopy) {
    // a door visor: a thin sheet-iron roof (muted green-grey, 6 cm plate with a 10 cm fascia) HELD by two tie rods that rise to wall brackets (it read as a black slab floating over the door:
    // docs/research/vo-requests-city.md item 1, the Kamskaya house at (-5475, -1518))
    const sheet = new THREE.Color('#65726c'), rod = new THREE.Color('#2f3436');
    cb.boxLite([0, 2.97, 0.0], 1, 0, 0, 1, 2.1, 0.06, 1.0, sheet);
    cb.quad([[-1.05, 2.9, 1.0], [1.05, 2.9, 1.0], [1.05, 3.0, 1.0], [-1.05, 3.0, 1.0]], [0, 0, 1], dk);
    for (const sx of [-0.95, 0.95]) {
      cb.quad([[sx - 0.018, 3.62, 0.02], [sx + 0.018, 3.62, 0.02], [sx + 0.018, 3.0, 0.97], [sx - 0.018, 3.0, 0.97]], [0, 0.7, 0.7], rod);        // tie rod, wall bracket to the front corner of the sheet
      cb.quad([[sx - 0.05, 3.55, 0.0], [sx + 0.05, 3.55, 0.0], [sx + 0.05, 3.70, 0.0], [sx - 0.05, 3.70, 0.0]], [0, 0, 1], rod);                      // bracket plate on the wall
    }
  }
  return cb.build();
}
/** a field of three plaques on the wall (local +z = away from the wall, x along it, y up from the lowest plate): two dark bronze plates side by side over one grey granite plate */
function plaqueGeo() {
  const cb = new ColorBuilder(), bronze = new THREE.Color('#4f4a40'), stone = new THREE.Color('#8f918c');
  cb.boxLite([-0.19, 0.5, 0], 1, 0, 0, 1, 0.34, 0.44, 0.03, bronze, false);
  cb.boxLite([0.19, 0.5, 0], 1, 0, 0, 1, 0.34, 0.44, 0.03, bronze, false);
  cb.boxLite([0, 0, 0], 1, 0, 0, 1, 0.6, 0.38, 0.03, stone, false);
  return cb.build();
}
function pipeGeo() {
  // a square pipe without the wall-side face: front + two sides (local +z = away from the wall), unit height centred on y = 0
  const cb = new ColorBuilder(), c = new THREE.Color('#ffffff');
  const P = (x, y, z) => [x, y, z], h = 0.5, w = 0.5;
  cb.quad([P(-w, -h, w), P(w, -h, w), P(w, h, w), P(-w, h, w)], [0, 0, 1], c);
  cb.quad([P(-w, -h, -w), P(-w, -h, w), P(-w, h, w), P(-w, h, -w)], [-1, 0, 0], c);
  cb.quad([P(w, -h, w), P(w, -h, -w), P(w, h, -w), P(w, h, w)], [1, 0, 0], c);
  return cb.build();
}

/** (x, z) is clear of the asphalt: the streets owner's cover test when the streets module is built (clear = more than 0.3 m outside the real carriageway incl. parking pockets / fillets), else the
 *  centreline roads of layout.js (the headless harnesses of the audits build the city alone). */
function clearOfRoad(ctx, x, z) {
  const sn = ctx.services && ctx.services.streets && ctx.services.streets.net;
  if (sn && typeof sn.cover === 'function') return sn.cover(x, z, {}) < -0.3;
  return !L.isOnRoad(x, z, 0.1);
}

export function buildEntranceGeo(ctx, { M, info, net }) {
  const T0 = templateOf(stepsGeo(false)), T1 = templateOf(stepsGeo(true)), TP = templateOf(pipeGeo());
  const mk = (T) => ({ add: (it) => stamp(M.fine(it.x, it.z), T, it) });
  const plain = mk(T0), canopy = mk(T1), pipes = mk(TP), plaques = mk(templateOf(plaqueGeo())), plaqued = new Set();
  let nPlaques = 0;
  const labels = labelRegistry(ctx);
  const doorsAt = [];                                                           // centres of the steps already placed (any orientation): two sets of steps never stand closer than 2.4 m
  let nSteps = 0, nPipes = 0, nSkipPipes = 0, nShiftPipes = 0, nSkipSteps = 0;
  for (const rec of info) {
    const { b, st } = rec;
    for (const w of rec.walls) {
      if (w.gate || w.floating) continue;
      const rotY = Math.atan2(w.nx, w.nz);
      // steps / canopies at the parade doors
      for (const d of (w.street && !w.hole ? w.doors : [])) {
        const ds = d.s;                                                    // d.s is local to w.a (which already includes s0): steps never sat anywhere else
        if (ds < ((w.flags & 16) ? 2.7 : 1.2) || ds > w.len - ((w.flags & 32) ? 2.7 : 1.2)) continue;                                 // the steps are 2.1 m wide and up to 1.5 m deep: a door nearer than 1.2 m to a wall end hangs them over the end, nearer than 2.7 m to a CORNER (QUOIN flags) they meet the steps of the perpendicular wall
        const x = w.a[0] + w.dx * ds, z = w.a[1] + w.dz * ds;
        if (net && net.coverAt(x + w.nx * 1.1, z + w.nz * 1.1, rec.bi, 0)) { nSkipSteps++; continue; }       // a building wall less than ~1 m in front (a slit between two houses): no steps there
        // no steps and no visor on a carriageway or a service way (a `city-fine` mesh at y 0.17 covered the service way w1444507733 at (-4200, -628) and eight more: tools/roads-surface-audit.mjs)
        if (!clearOfRoad(ctx, x + w.nx * 0.8 + w.dx * 1.05, z + w.nz * 0.8 + w.dz * 1.05) || !clearOfRoad(ctx, x + w.nx * 0.8 - w.dx * 1.05, z + w.nz * 0.8 - w.dz * 1.05) || !clearOfRoad(ctx, x + w.nx * 0.4, z + w.nz * 0.4)) { nSkipSteps++; continue; }
        const wantCanopy = hash01(b.id + ':cn' + Math.round(d.s)) < (w.street ? 0.45 : 0.2);
        if (doorsAt.some((p) => Math.abs(p[0] - x) < 2.4 && Math.abs(p[1] - z) < 2.4 && Math.hypot(p[0] - x, p[1] - z) < 2.4)) { nSkipSteps++; continue; }
        const grp = b.id + ':' + w.id + ':' + Math.round(d.s * 10);                                 // the canopy and the steps of one door are one mesh: they never refuse each other (slots.js)
        const set = wantCanopy && labels.reserve(b.id, x + w.nx * 0.5, w.base + 2.88, z + w.nz * 0.5, 2.1, 0.3, w.nx, w.nz, 'canopy', 0, grp) ? canopy : plain;
        if (!labels.reserve(b.id, x + w.nx * 0.4, w.base + 0.09, z + w.nz * 0.4, 2.1, 0.17, w.nx, w.nz, 'steps', 0, grp)) { nSkipSteps++; continue; }          // two doors within 2.1 m (neighbouring walls): one set of steps
        doorsAt.push([x, z]);
        set.add({ x, y: w.base, z, rotY }); nSteps++;
        // PLAQUE FIELD (the island, roster 6.4): one house in nine of the old grid carries a field of memorial plaques beside its parade door ("Last address" plates, scientists' memorial plates; 133 mapped in the east grid)
        if (st.fresh && /^v(linesE|quay|bolshoy|sredny|maly)$/.test(st.zone) && !plaqued.has(b.id) && hash01(b.id + ':pq') < 0.11 && w.street && !osmPlaqueNear(x, z, 6)) {          // (a mapped OSM plaque within 6 m of the door is drawn by props with its real inscription: no statistical field beside it)
          const side = hash01(b.id + ':pqs') < 0.5 ? -1 : 1, off = side * (2.0 + hash01(b.id + ':pqo') * 0.5), ps = ds + off;
          const px = w.a[0] + w.dx * ps + w.nx * 0.03, pz = w.a[1] + w.dz * ps + w.nz * 0.03;
          if (ps > 1.0 && ps < w.len - 1.0 && labels.reserve(b.id, px, w.base + 1.85, pz, 1.0, 1.2, w.nx, w.nz, 'plaque')) { plaques.add({ x: px, y: w.base + 1.3, z: pz, rotY }); plaqued.add(b.id); nPlaques++; }
        }
      }
      // downpipes: at bay boundaries, ~ every 18 m, away from doors / balconies / gates
      if (w.len < 6 || w.arch === 12) continue;
      const n = Math.max(1, Math.round(w.len / 18));
      const colKey = hash01(b.id + ':pc');
      for (let k = 0; k < n; k++) {
        const bay0 = Math.max(1, Math.min(w.N - 1, Math.round(((k + 0.5) / n) * w.N)));
        if (w.N < 2) continue;
        const H = w.H - 0.35, yc = w.base + 0.25 + H / 2;
        // the bay boundary nearest to the ideal one that is free of balconies and of every other label (fascia signs cross the pipe at most boundaries of a shop unit)
        let bay = -1;
        for (const cand of [bay0, bay0 - 1, bay0 + 1]) {
          if (cand < 1 || cand > w.N - 1 || w.bal.some((g) => cand >= g.b0 && cand <= g.b1)) continue;
          if (labels.reserve(b.id, w.a[0] + w.dx * cand * w.bw + w.nx * 0.12, yc, w.a[1] + w.dz * cand * w.bw + w.nz * 0.12, 0.17, H, w.nx, w.nz, 'pipe')) { bay = cand; break; }
        }
        if (bay < 0) { nSkipPipes++; continue; }
        if (bay !== bay0) nShiftPipes++;
        const s = bay * w.bw;
        const col = colKey < 0.30 ? '#' + st.color.clone().multiplyScalar(0.95).getHexString() : colKey < 0.68 ? '#98a0a4' : colKey < 0.80 ? '#d9d2bf' : colKey < 0.90 ? '#d9a62c' : colKey < 0.95 ? '#4f7a5a' : '#c99aa0';
        pipes.add({ x: w.a[0] + w.dx * s + w.nx * 0.12, y: w.base + 0.25 + H / 2, z: w.a[1] + w.dz * s + w.nz * 0.12, rotY, sx: 0.13, sy: H, sz: 0.13, color: col }); nPipes++;
      }
    }
  }
  return { triangles: nSteps * 14 + nPipes * 6 + nPlaques * 30, steps: nSteps, pipes: nPipes, plaques: nPlaques, skippedSteps: nSkipSteps, skippedPipes: nSkipPipes, shiftedPipes: nShiftPipes };
}
