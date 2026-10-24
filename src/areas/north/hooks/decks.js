// hooks/decks.js - T8a (the owner's bug 2, "the transparent top of a building"): the buildings of the Tauride Garden whose flat roof deck also gets an UNDERSIDE.
// PURE DATA + PURE FUNCTIONS (no three.js, no layout.js): the 13 footprints that overlap the garden outline (landmarksTauride/data/footprints.js FOOTPRINTS, the OSM records of the generic city) and the garden
// outline itself.
//   makeDeckUnderside(MODULES) -> ((poly) => boolean) | undefined     city/roofs.js addDeck asks it for every deck polygon { o: [x, z, ...], h: [...] }: true = draw the deck's underside too. A deck is a one-sided
//                                  face (the generic city draws no ceiling), so a low building that a walker can stand beside shows the sky through its roof from below (and the outline pass, which is double-sided, draws the
//                                  deck's edges in the air). True for a deck whose outline shares its first vertex with one of the 13 footprints or whose centre lies inside the garden outline; undefined unless MODULES has
//                                  'landmarksTauride'. The strip exports no HOOKS: its decks are the same bytes as before.
import { FOOTPRINTS, GARDEN } from '../../../world/landmarksTauride/data/footprints.js';

const ring = GARDEN.o;
let bx0 = Infinity, bx1 = -Infinity, bz0 = Infinity, bz1 = -Infinity;
for (let i = 0; i < ring.length; i += 2) { bx0 = Math.min(bx0, ring[i]); bx1 = Math.max(bx1, ring[i]); bz0 = Math.min(bz0, ring[i + 1]); bz1 = Math.max(bz1, ring[i + 1]); }
const inRing = (x, z) => { let c = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) if ((ring[i + 1] > z) !== (ring[j + 1] > z) && x < (ring[j] - ring[i]) * (z - ring[i + 1]) / (ring[j + 1] - ring[i + 1]) + ring[i]) c = !c; return c; };
/** the first vertices of the footprints' outer rings ("x,z" of the data's own numbers) */
const KEYS = new Set(); for (const f of FOOTPRINTS) for (const p of f.polys) KEYS.add(p.o[0] + ',' + p.o[1]);

export function makeDeckUnderside(MODULES) {
  if (!(Array.isArray(MODULES) && MODULES.includes('landmarksTauride'))) return undefined;
  return (poly) => {
    const o = poly && poly.o; if (!o || o.length < 6) return false;
    if (KEYS.has(o[0] + ',' + o[1])) return true;
    let cx = 0, cz = 0; for (let i = 0; i < o.length; i += 2) { cx += o[i]; cz += o[i + 1]; } cx /= o.length / 2; cz /= o.length / 2;
    return cx >= bx0 && cx <= bx1 && cz >= bz0 && cz <= bz1 && inRing(cx, cz);
  };
}
