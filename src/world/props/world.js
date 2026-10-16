// props/world.js - spatial knowledge of the props module: a 1 m raster of the play area (+ margin) built from the baked OSM data and the services of the earlier
// modules (no global distance fields: they cost 0.5 s and 80 MB on the 9.4 M-cell west raster; the water coping strip is a one-cell dilation). Adapted from the Yakutsk props/world.js (same API) and retuned for Saint Petersburg: carriageways come from the streets
// network (`services.streets.net.ways`: half widths incl. the parking pockets, + the junction fillets), the Fontanka trench + quay edge, the metro shafts
// (`L.GROUND_HOLES`) and portals (`L.DOORWAYS`), the claimed squares, the rail platforms, tree trunks.
// Flags: building footprints, carriageways, tree trunks, water / quay, claimed paving, lawns, flowerbeds, shafts, bridge decks, steps and everything reserved by
// earlier placements or by building entrances.
//   W.roadDist / W.bldDist   metres to the nearest carriageway edge / wall     W.at(x,z)   flag bits
//   W.reserve(x,z,r) / W.reserveBox(cx,cz,w,d,rotY)  block a spot
//   W.fits(cx,cz,w,d,rotY,o)   footprint test: every sample point of an oriented box must be free of the blocking flags and satisfy the distance limits
//   W.span(x,z,dx,dz,max,mask)  distance walked from (x,z) along (dx,dz) until a flag of `mask` is hit (max if none)
import * as L from '../layout.js';
import { BUILDINGS, GREEN, AREAS, WATER, BRIDGES, PLATFORMS, RAILS, ROADS, TREES } from '../data/city.js';
import { SITES, inDeck } from '../bridges/sites.js';
import { ringHas } from './kit.js';

export const F = { BLD: 1, ROAD: 2, PAVED: 4, TREE: 8, WATER: 16, PLAZA: 32, LAWN: 128, BED: 256, SQUARE: 512, MISC: 2048, PATH: 4096, DECK: 8192, STEPS: 16384, DOOR: 32768 };   // SQUARE = the Palace Square stone field (stays an open plaza)
const BLOCK = F.BLD | F.ROAD | F.PAVED | F.TREE | F.WATER | F.PLAZA | F.BED | F.SQUARE | F.MISC | F.DECK | F.STEPS | F.DOOR;

const CELL = 1;
const PL = L.WORLD.play, M = 25;
const X0 = Math.floor(PL.x0 - M), X1 = Math.ceil(PL.x1 + M), Z0 = Math.floor(PL.z0 - M), Z1 = Math.ceil(PL.z1 + M);
const WD = Math.ceil((X1 - X0) / CELL), HT = Math.ceil((Z1 - Z0) / CELL);

export function buildWorld(ctx) {
  const flags = new Uint16Array(WD * HT);
  const idx = (x, z) => { const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL); return i < 0 || j < 0 || i >= WD || j >= HT ? -1 : j * WD + i; };

  function fillRings(rings, bit) {
    let zmin = 1e9, zmax = -1e9;
    for (const r of rings) for (let i = 1; i < r.length; i += 2) { zmin = Math.min(zmin, r[i]); zmax = Math.max(zmax, r[i]); }
    const j0 = Math.max(0, Math.floor((zmin - Z0) / CELL)), j1 = Math.min(HT - 1, Math.floor((zmax - Z0) / CELL));
    for (let j = j0; j <= j1; j++) {
      const z = Z0 + (j + 0.5) * CELL, xs = [];
      for (const r of rings) for (let i = 0; i < r.length; i += 2) {
        const k = (i + 2) % r.length, az = r[i + 1], bz = r[k + 1];
        if ((az <= z && bz > z) || (bz <= z && az > z)) xs.push(r[i] + ((z - az) / (bz - az)) * (r[k] - r[i]));
      }
      xs.sort((a, b) => a - b);
      for (let m = 0; m + 1 < xs.length; m += 2) {
        const i0 = Math.max(0, Math.ceil((xs[m] - X0) / CELL - 0.5)), i1 = Math.min(WD - 1, Math.floor((xs[m + 1] - X0) / CELL - 0.5));
        for (let i = i0; i <= i1; i++) flags[j * WD + i] |= bit;
      }
    }
  }
  function stamp(x, z, rad, bit) {
    const i0 = Math.max(0, Math.floor((x - rad - X0) / CELL)), i1 = Math.min(WD - 1, Math.floor((x + rad - X0) / CELL));
    const j0 = Math.max(0, Math.floor((z - rad - Z0) / CELL)), j1 = Math.min(HT - 1, Math.floor((z + rad - Z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = X0 + (i + 0.5) * CELL - x, dz = Z0 + (j + 0.5) * CELL - z;
      if (dx * dx + dz * dz <= rad * rad) flags[j * WD + i] |= bit;
    }
  }
  /** tapered capsule: the segment a -> b with the radius r0 at a and r1 at b, rasterised cell by cell inside its bounding box (replaces a disc stamped every 0.6 m: 25x fewer cell writes) */
  function stampTaper(ax, az, bx, bz, r0, r1, bit) {
    const rm = Math.max(r0, r1), dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - rm - X0) / CELL)), i1 = Math.min(WD - 1, Math.floor((Math.max(ax, bx) + rm - X0) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - rm - Z0) / CELL)), j1 = Math.min(HT - 1, Math.floor((Math.max(az, bz) + rm - Z0) / CELL));
    for (let j = j0; j <= j1; j++) {
      const z = Z0 + (j + 0.5) * CELL;
      for (let i = i0; i <= i1; i++) {
        const x = X0 + (i + 0.5) * CELL; let t = ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = x - ax - dx * t, ez = z - az - dz * t, r = r0 + (r1 - r0) * t;
        if (ex * ex + ez * ez <= r * r) flags[j * WD + i] |= bit;
      }
    }
  }
  function stampLine(pts, rad, bit, step = 0.7) {
    for (let i = 0; i + 3 < pts.length; i += 2) {
      const ax = pts[i], az = pts[i + 1], bx = pts[i + 2], bz = pts[i + 3], l = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(l / step));
      for (let k = 0; k <= n; k++) stamp(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n, rad, bit);
    }
  }
  function stampBox(cx, cz, w, d, rotY, bit, fudge = 0.5) {            // oriented box (local x = width, local z = depth), rotY as three.js
    const c = Math.cos(rotY), s = Math.sin(rotY), hw = w / 2, hd = d / 2, r = Math.hypot(hw, hd);
    const i0 = Math.max(0, Math.floor((cx - r - X0) / CELL)), i1 = Math.min(WD - 1, Math.floor((cx + r - X0) / CELL));
    const j0 = Math.max(0, Math.floor((cz - r - Z0) / CELL)), j1 = Math.min(HT - 1, Math.floor((cz + r - Z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = X0 + (i + 0.5) * CELL - cx, dz = Z0 + (j + 0.5) * CELL - cz;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) <= hw + fudge && Math.abs(lz) <= hd + fudge) flags[j * WD + i] |= bit;
    }
  }

  // ---- buildings (ground-standing footprints; the courtyard holes stay open)
  for (const p of L.groundFootprints()) fillRings([p.o, ...p.h], F.BLD);
  // ---- carriageways: the streets network (half widths incl. the parking pockets) + junction fillets; bridges / steps / mapped footways flagged apart
  const st = ctx.services.streets, net = st && st.net;
  if (net && net.ways) {
    for (const w of net.ways) {
      if (w.skipDraw && !w.bridge) continue;
      const n = w.x.length;
      for (let i = 0; i + 1 < n; i++) {
        stampTaper(w.x[i], w.z[i], w.x[i + 1], w.z[i + 1], Math.max(w.hL[i], w.hR[i]) + 0.25, Math.max(w.hL[i + 1], w.hR[i + 1]) + 0.25, w.bridge ? F.DECK : F.ROAD);
      }
    }
    for (const f of net.fillets || []) { const flat = []; for (const p of f.poly) flat.push(p[0], p[1]); fillRings([flat], F.ROAD); }
  } else {                                                              // fallback without the streets module: OSM road widths
    for (const r of ROADS) { if (r.tunnel || !L.isDrivable(r)) continue; stampLine(r.pts, L.roadWidth(r) / 2 + 2.2, r.bridge ? F.DECK : F.ROAD); }
  }
  for (const r of ROADS) {
    if (r.tunnel || r.layer >= 1) continue;
    if (r.hw === 'steps') stampLine(r.pts, Math.max(0.9, L.roadWidth(r) / 2), F.STEPS);
  }
  // ---- green: lawns, flowerbeds (drawn by environment with a kerb); the claimed ones belong to their owner
  const owned = (id) => !!L.claimedBy(id);
  for (const g of GREEN) {
    if (g.kind === 'pitch' || g.kind === 'playground' || g.kind === 'fitness_station' || g.kind === 'track') continue;
    if (owned(g.id)) { for (const p of g.polys) fillRings([p.o, ...p.h], F.PLAZA); continue; }
    const bit = g.kind === 'flowerbed' || g.kind === 'garden' ? F.BED : F.LAWN;
    for (const p of g.polys) fillRings([p.o, ...p.h], bit);
  }
  // ---- paving areas of the owners (landmarksA draws and furnishes the square), bridge decks, water
  for (const a of AREAS) if (owned(a.id)) for (const p of a.polys) fillRings([p.o], F.PAVED);          // PAVED = paving a landmark module draws (walkable: the Gostiny Dvor promenade ...); PLAZA = its gardens / lawns
  for (const w of WATER) if (w.kind !== 'fountain') for (const p of w.polys || []) fillRings([p.o, ...(p.h || [])], F.WATER);
  for (const b of BRIDGES || []) if ((b.layer || 0) >= 1 || b.kind === 'deck') for (const p of b.polys || []) fillRings([p.o], F.DECK);
  // ---- rail platforms (the rail module furnishes them) and the track field
  for (const p of PLATFORMS) if (p.kind === 'rail') for (const q of p.polys || []) fillRings([q.o], F.MISC);
  for (const r of RAILS) if (!r.tunnel && !r.bridge) stampLine(r.pts, 2.4, F.MISC);
  // ---- the bridge decks (bridges/sites.js: u along the span, v across the width; the approach pavements stay usable) and the quay descents (stairs down to the piers)
  for (const s of SITES) {
    const R = 16 + Math.max(Math.abs(s.v0), Math.abs(s.v1)) + 4, i0 = Math.max(0, Math.floor((s.cx - R - X0) / CELL)), i1 = Math.min(WD - 1, Math.floor((s.cx + R - X0) / CELL));
    const j0 = Math.max(0, Math.floor((s.cz - R - Z0) / CELL)), j1 = Math.min(HT - 1, Math.floor((s.cz + R - Z0) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (inDeck(s, X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL, 16, 1.2)) flags[j * WD + i] |= F.DECK;
  }
  { const q = ctx.services.environment && ctx.services.environment.quay;
    for (const st of (q && q.allStairs) || []) { stampLine([st.x, st.z, st.endX ?? st.x, st.endZ ?? st.z], (st.w || 3) / 2 + 1.2, F.STEPS, 0.6); stamp(st.x, st.z, (st.w || 3) / 2 + 2.2, F.STEPS); } }
  // ---- the Palace Square stone field (landmarksG spots.stoneField): no furniture in the middle of the plaza
  { const sf = ctx.services.landmarksG && ctx.services.landmarksG.spots && ctx.services.landmarksG.spots.stoneField;
    if (sf && sf.length > 2) { const flat = []; for (const p of sf) flat.push(p[0], p[1]); fillRings([flat], F.SQUARE); } }
  // ---- metro shafts (ground holes) and portals: keep 3 m clear
  for (const h of L.GROUND_HOLES || []) stampBox(h.x, h.z, h.w + 3, h.d + 3, h.rotY || 0, F.MISC, 0.5);
  for (const d of L.DOORWAYS || []) stampBox(d.x + Math.sin(d.rotY) * 1.8, d.z + Math.cos(d.rotY) * 1.8, d.w + 2.4, 4.2, d.rotY, F.DOOR, 0.3);
  // ---- trunks from the environment service
  const env = ctx.services.environment;
  const trees = (env && env.trees) || [];
  for (const t of TREES) stamp(t[0], t[1], 0.7, F.TREE);                 // the OSM tree nodes too (the landmarks plant their own at them: the promenade of Gostiny Dvor, the gardens)
  for (const t of trees) stamp(t.x, t.z, t.shrub ? Math.max(0.5, t.r * 0.55) : Math.min(1.25, Math.max(0.5, (t.tr || 0.3) + 0.35)), F.TREE);

  {                                                                    // the quay coping + railing strip: every cell within 1.1 m (= a 4-neighbour) of the water becomes water too (temporary bit 64 keeps the dilation from cascading)
    const T = 64, W_ = F.WATER;
    for (let j = 0; j < HT; j++) for (let i = 0; i < WD; i++) {
      const k = j * WD + i; if (flags[k] & W_) continue;
      if ((i > 0 && (flags[k - 1] & W_)) || (i < WD - 1 && (flags[k + 1] & W_)) || (j > 0 && (flags[k - WD] & W_)) || (j < HT - 1 && (flags[k + WD] & W_))) flags[k] |= T;
    }
    for (let k = 0; k < flags.length; k++) if (flags[k] & T) flags[k] = (flags[k] & ~T) | W_;
  }
  // exact "inside a ground building" test through a 24 m grid of the footprints (L.insideBuilding scans every footprint: too slow for the placement loops)
  const GC = 24, bgrid = new Map(), fps = L.groundFootprints();
  for (const p of fps) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); }
    const e = { p, b: [x0, x1, z0, z1] };
    for (let i = Math.floor(x0 / GC); i <= Math.floor(x1 / GC); i++) for (let j = Math.floor(z0 / GC); j <= Math.floor(z1 / GC); j++) { const k = i + ',' + j; let a = bgrid.get(k); if (!a) bgrid.set(k, (a = [])); a.push(e); }
  }
  const insideBld = (x, z) => { const a = bgrid.get(Math.floor(x / GC) + ',' + Math.floor(z / GC)); if (!a) return false; for (const e of a) { const b = e.b; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue; if (ringHas(e.p.o, x, z) && !e.p.h.some((h) => ringHas(h, x, z))) return true; } return false; };
  const at = (x, z) => { const k = idx(x, z); return k < 0 ? (F.MISC | F.ROAD) : flags[k]; };

  const W = {
    ctx, L, X0, X1, Z0, Z1, trees, F, BLOCK,
    at,
    /** metres from (x, z) to the nearest carriageway cell, searched out to `max` (returns max when none is that close; 0 on the carriageway): a bounded ring search, no global field */
    roadDist(x, z, max = 10) {
      const k0 = idx(x, z); if (k0 < 0) return 0; if (flags[k0] & F.ROAD) return 0;
      const i0 = Math.floor((x - X0) / CELL), j0 = Math.floor((z - Z0) / CELL), R = Math.ceil(max / CELL); let best = max * max;
      for (let dj = -R; dj <= R; dj++) { const j = j0 + dj; if (j < 0 || j >= HT) continue; for (let di = -R; di <= R; di++) { const i = i0 + di; if (i < 0 || i >= WD) continue; if (!(flags[j * WD + i] & F.ROAD)) continue; const ex = X0 + (i + 0.5) * CELL - x, ez = Z0 + (j + 0.5) * CELL - z, d2 = ex * ex + ez * ez; if (d2 < best) best = d2; } }
      return Math.sqrt(best);
    },
    lawn: (x, z) => !!(at(x, z) & F.LAWN),
    insideBld,
    blocked: (x, z, mask = BLOCK) => !!(at(x, z) & mask),
    inPlay: (x, z, m = 0) => L.inPlay(x, z, m),                    // the union of the play rectangles (PL is only its bounding box: the raster below)
    inArea: (x, z, m = 0) => x > PL.x0 - M + m && x < PL.x1 + M - m && z > PL.z0 - M + m && z < PL.z1 + M - m,
    reserve(x, z, r, bit = F.MISC) { stamp(x, z, r, bit); },
    reserveBox(cx, cz, w, d, rotY, bit = F.MISC, fudge = 0.5) { stampBox(cx, cz, w, d, rotY, bit, fudge); },
    reserveLine(pts, r, bit = F.MISC) { stampLine(pts, r, bit); },
    mark: (rings, bit) => { fillRings(rings, bit); },
    refresh() {},
    /** walk from (x,z) along the unit vector (dx,dz) in 0.25 m steps until a flag of `mask` is hit; returns the distance (max when nothing is hit) */
    span(x, z, dx, dz, max = 8, mask = F.BLD) {
      for (let s = 0.25; s <= max; s += 0.25) if (at(x + dx * s, z + dz * s) & mask) return s - 0.25;
      return max;
    },
    /** footprint test for an oriented box (local x = w, local z = d, rotY as three.js). Samples the corners, the edge midpoints and the centre (+ a margin).
     *  o: { allow (flags that may be hit), road (min carriageway distance), bld (min wall distance), margin, noLawn, water (min distance to the Fontanka water) } */
    fits(cx, cz, w, d, rotY, o = {}) {
      const c = Math.cos(rotY), s = Math.sin(rotY), m = o.margin ?? 0.1, hw = w / 2 + m, hd = d / 2 + m, mask = BLOCK & ~(o.allow || 0);
      const nx = Math.max(2, Math.ceil(w / 1.0)), nz = Math.max(2, Math.ceil(d / 1.0));
      for (let a = 0; a <= nx; a++) for (let b = 0; b <= nz; b++) {
        const lx = -hw + 2 * hw * a / nx, lz = -hd + 2 * hd * b / nz;
        const x = cx + lx * c + lz * s, z = cz - lx * s + lz * c;     // local x axis in the world = (cos, -sin), local z = (sin, cos)
        if (!this.inArea(x, z)) return false;
        const f = at(x, z);
        if (f & mask) return false;
        if (insideBld(x, z)) return false;
        if (o.noLawn && (f & F.LAWN)) return false;
      }
      return true;
    },
  };
  return W;
}

/** point-in-ring helper re-exported for the callers */
export { ringHas };
void BUILDINGS;
