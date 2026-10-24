// roofs.js - roof decks of the Petersburg houses: standing-seam sheet iron (grey 50 % / green 25 % / red-brown 25 %, architecture.md E), flat on purpose (core/roofmap.js captures what
// is drawn, so the player can land and walk on them); the pitched / mansard forms visible from the street are built by mansard.js.
import * as THREE from 'three';
import { MeshBuilder, addCap, ringFromFlat, signedArea } from '../lib/massing.js';
import { HOOKS } from '../lib/area-tables.js';

export const ROOF_COLOURS = [['#9ba0a3', 58], ['#5f7d68', 21], ['#8a5246', 21]];

export function roofMaterials(ctx) {
  if (ctx._roofMats) return ctx._roofMats;
  const metal = ctx.tex.draw(64, 64, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(0, 0, 3, h);                                    // standing seam
    g.fillStyle = 'rgba(255,255,255,0.20)'; g.fillRect(3, 0, 3, h);
    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(w / 2, 0, w / 2, h);
  }, { key: 'piter-roof-metal', repeat: [1, 1] });
  ctx._roofMats = { metal };
  return ctx._roofMats;
}

/** MeshBuilder with free-form triangles that compute the face normal. */
export class RoofBuilder extends MeshBuilder {
  tri3(p, q, r, uv0, uv1, uv2, hint) {
    let ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { const t = q; q = r; r = t; const tu = uv1; uv1 = uv2; uv2 = tu; nx = -nx; ny = -ny; nz = -nz; }
    const a = this.vert(p[0], p[1], p[2], nx, ny, nz, uv0[0], uv0[1]), b = this.vert(q[0], q[1], q[2], nx, ny, nz, uv1[0], uv1[1]), c = this.vert(r[0], r[1], r[2], nx, ny, nz, uv2[0], uv2[1]);
    this.tri(a, b, c);
  }
  quad3(p, q, r, s, uv, hint) { this.tri3(p, q, r, uv[0], uv[1], uv[2], hint); this.tri3(p, r, s, uv[0], uv[2], uv[3], hint); }
}

/** DECKS OF OVERLAPPING RECORDS OF ONE HEIGHT (data OVERLAPS, same = 1: their decks are coplanar and would z-fight). Returns { skip, lift }: ids that give up their deck, ids whose
 *  deck is drawn 3 cm higher. drawn = Set of the ids this module draws, isNew(id) = the record is not in a frozen older region.
 *  Older regions (and any pair that touches one): the later record of a pair gives up its deck when the earlier one is drawn - right for same-footprint twins, the only case there.
 *  New regions (3D-mapped complexes: a slab, porches and dozens of 2 m2 columns of one height): that rule took the deck of a 489 m2 slab because an 8 m2 part of the same height
 *  came first, then the decks of the 76 columns on it (wall audit: 76 roofless records). There the SMALLER footprint gives way when it lies inside the other; same-size twins
 *  keep the old rule; a partial overlap keeps both decks, the later one lifted. */
export function deckPlan(OVERLAPS, drawn, isNew) {
  const skip = new Set(), lift = new Set();
  for (const o of OVERLAPS) {
    if (!o.same) continue;
    if (!(isNew(o.a) && isNew(o.b))) { if (drawn.has(o.a)) skip.add(o.b); continue; }
    if (!drawn.has(o.a) || !drawn.has(o.b)) continue;
    const ratio = Math.min(o.areaA, o.areaB) / Math.max(o.areaA, o.areaB, 1e-6), inside = (o.frac ?? 1) > 0.85;
    if (ratio > 0.85 && inside) skip.add(o.b);
    else if (inside || ratio < 0.5) skip.add(o.areaA >= o.areaB ? o.b : o.a);
    else lift.add(o.b);
  }
  return { skip, lift };
}
/** Flat deck of a footprint polygon (with courtyard holes) at height y. uvScale = metres per texture tile. */
export function addDeck(B, poly, y, uvScale = 1.2) {
  addCap(B, poly, y, { uvScale });
  // T8a (HOOKS.deckUnderside, an area's table; the strip has none: nothing changes there): the deck is a one-sided face, so a viewer who stands BELOW it (a low building in a park, the eaves 1 m from the eye) sees the sky through the roof
  // while the outline pass (a double-sided normal / depth pre-pass) still draws its edges. For the buildings the hook names the deck also gets its UNDERSIDE: the same polygon 1 cm lower, facing down, in the roof colour x 0.6 (a soffit).
  if (HOOKS.deckUnderside && HOOKS.deckUnderside(poly)) {
    const keep = B.cur && B.cur.clone ? B.cur.clone() : null;
    if (keep) B.cur.multiplyScalar(0.6);
    addCap(B, poly, y - 0.01, { uvScale, up: false });
    if (keep) B.cur.copy(keep);
  }
}
export { ringFromFlat, signedArea };
