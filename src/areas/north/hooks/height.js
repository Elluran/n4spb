// ============================================================================
//  hooks/height.js - the HEIGHT PATCHES of the North (docs/AREAS.md section 9, milestone M6, cluster A): terrain that is not the flat street level and not a waterway bed. layout.heightAt reads the
//  list through src/world/lib/area-tables.js (HEIGHT_PATCHES), which hooks.js builds from here; the garden relief (T2) follows the Paradny patch, the pond beds of T4 append after them.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap). hooks/paradny.js has the deck.
//
//    makeHeightPatches(MODULES) -> [{ id: string, box: [x0, x1, z0, z1], at: (x, z) => number | null }]    H01  layout.heightAt: for each patch in array order a box reject, then at(x, z); the FIRST
//                                  non-null height wins; then the old waterway-bed / GROUND_Y line.  The box is checked before at() (heightAt is called for the whole map at start-up).
//                                  layout.js has no ctx, so the list is gated by the page's module list: [] unless MODULES has 'landmarksTauride', else
//                                  [{ id: 'paradny', box: PARADNY_BOX, at: paradnyDeckY }, { id: 'garden', box: RELIEF_HULL, at: gardenHeight }] (hooks/paradny.js; src/world/landmarksTauride/height.js, T2: the land
//                                  relief of the Tauride Garden, null where no hill lifts the ground, so the old line answers there).
//                                  A fresh array on every call: hooks.js spreads it and the Tauride remake appends its patches after the Paradny one (T2: the land relief of the garden; T4: the pond beds).
// ============================================================================
import { PARADNY_BOX, paradnyDeckY } from './paradny.js';
import { RELIEF_HULL, gardenHeight } from '../../../world/landmarksTauride/height.js';

export function makeHeightPatches(MODULES) {
  const patches = [];
  if (MODULES && MODULES.includes('landmarksTauride')) {
    patches.push({ id: 'paradny', box: [...PARADNY_BOX], at: paradnyDeckY });
    patches.push({ id: 'garden', box: [...RELIEF_HULL], at: gardenHeight });      // T2: the land relief of the Tauride Garden (pure: landmarksTauride/height.js + data/relief.js); the box is the hull of the hills (62 % of the garden box: heightAt skips the call elsewhere); the pond beds of T4 append after it
  }
  return patches;
}
