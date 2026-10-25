// ============================================================================
//  hooks.js - THE HOOK SET of the North (docs/AREAS.md section 9, milestone M6): the small set of engine edits that give the North what the source repository hard-codes for its north, built in ONE place.
//  area.js exports HOOKS = makeHooks(MODULES) and HEIGHT_PATCHES = makeHeightPatches(MODULES); the engine reads them ONLY through src/world/lib/area-tables.js (never from area.js, and layout.js gains no
//  export: the layout golden dump lists every export). The strip's area module exports HOOKS = {} and HEIGHT_PATCHES = []: a key that is absent means the engine does what it does without the hook, so
//  every call site is `HOOKS.key?.(...)` / `HOOKS.key || default` and a no-op for the strip.
//  PURE DATA + PURE FUNCTIONS: no three.js, no import of layout.js, no data facade (tools/areas-test.mjs loads the area module without the import-map remap and would get the strip's facade).
//  The bodies live in hooks/keep-out.js (cluster B), hooks/height.js (cluster A), hooks/people.js (cluster C), hooks/ground.js (T3) and the shared geometry in hooks/paradny.js.
//
//  THE CONTRACT (frozen by the foundation commit; the H.. ids are the items of the table in docs/AREAS.md 9.5):
//    HOOKS = {
//      treeCleared(ctx)     -> ((x, z) => boolean) | null                                          H02  soft tree clearing (cleared() runs only under !o.force; no caller forces, so mapped OSM trees are cleared too)
//      treeReject(ctx)      -> ((x, z) => 'paradny' | 'garden' | 'campus' | 'suvorov' | null) | null   H03  hard reject, mapped trees included; the string is the debug reason (T5: 'garden' = the Tauride Garden outline, the garden plants its own; T8b: 'nursery' = the nursery lot, the module plants its own)
//      tuftReject(ctx)      -> ((x, z) => boolean) | null                                          H04  no grass tufts
//      propReject(ctx)      -> ((cx, cz) => boolean) | null                                        H05  no bench / bin / kiosk stamped
//      pedestrianOnly(ctx)  -> ((way) => boolean) | null                                           H06  way.rank, way.x[], way.z[]
//      parkingReject        -> ((x, z) => boolean) | undefined                                     H07  a plain function: planParking has no ctx, so makeHooks(MODULES) gates it
//      carKeepOut           -> ((x, z) => boolean) | undefined                                     T2a  the garden outline is closed to cars (drive/handling.js solidBlocked); undefined unless MODULES has 'landmarksTauride'
//      inGarden             -> ((x, z) => boolean) | undefined                                     H08  the Tauride Garden polygon, for the people crowd cap (the North always gives a function; the strip: absent)
//      deckServices         -> ['landmarksTauride']                                                H09  names of ctx.services whose deckY(x, z) is consulted FIRST (cars, pedestrians)
//      doorServices         -> ['landmarksNorthFull', 'landmarksOktyabrsky']                       T7   names of ctx.services whose `entrances` ({ x, z, rotY, bldg }) are pedestrian doors besides the city's (people/nav.js; points without rotY are clearing discs and are skipped)
//      groundHoles          -> (() => [flat ring, ...]) | undefined                                T3a  the rings cut out of the environment ground (environment/ground.js groundCuts): the garden outline moved in by 6 cm and (T8b) the nursery lot's ring moved in by 6 cm; undefined unless MODULES has 'landmarksTauride'
//      groundWayReject      -> ((road) => boolean) | undefined                                     T3b  the ways that the ground class mask does not paint (environment/field.js buildField): the 120 garden ways; undefined unless MODULES has 'landmarksTauride'
//      waterBodies          -> (() => [{ id, o, h }]) | undefined                                  T4a  the ponds of the garden as water bodies of the field's water mask (environment/field.js buildField, after the river polygons): env.waterAt / shoreDist / the water shader's distance atlas; undefined unless MODULES has 'landmarksTauride'
//      noLanding            -> ((x, z) => boolean) | undefined                                     T4a1 a flight landing on the ponds is refused as 'water' (core/player.js landingBlocked reads player.noLanding, set by main.js); true where the terrain is at or below the contour of the shore colliders; undefined unless MODULES has 'landmarksTauride'
//      duckPonds            -> (() => { y, offset, margin, rings, keepOut, shoreDist, inWater }) | undefined   T4b  duck lanes on the ponds of a landmark module (wildlife/ducks.js: the pond branch beside the waterway lanes; lane y = the water level, lanes `margin` m off every shore, none under a bridge deck); undefined unless MODULES has 'landmarksTauride'
//      deckUnderside        -> ((poly) => boolean) | undefined                                     T8a  city/roofs.js addDeck: the deck of this footprint ({ o, h }) also gets a down-facing underside (the 13 garden footprints and any deck centred in the garden outline); undefined unless MODULES has 'landmarksTauride'
//    }
//    The deck service (deckServices) may also publish `deckLift(x, z) -> number | null`: what the pedestrians' feet stand above its deckY (people/nav.js surfaceY; absent / null = the engine's pavement lift 0.12). T4b: the garden bridges answer 0.02 (the deck is the walking surface), the Paradny podium keeps 0.12.
//    HEIGHT_PATCHES = [{ id: string, box: [x0, x1, z0, z1], at: (x, z) => number | null }]       H01  heightAt: per patch in array order a box reject, then at(); the first non-null wins;
//                                                                                                     then the old waterway-bed / GROUND_Y line
//  Every (ctx) factory is evaluated ONCE per build (the tuft / prop / tree paths are hot) and returns null when none of the modules it serves is in ctx.buildList (absent list = not built). The
//  hooks that serve landmark modules are therefore DORMANT until the module is in MODULES: the Smolny, Suvorov and campus keep-outs are active in the North since M5, the Paradny ones wait for
//  'landmarksTauride' (the Tauride remake). A factory has no access to the service of a landmark module (environment builds first): the coordinates are static.
// ============================================================================
import { treeCleared, treeReject, tuftReject, propReject, pedestrianOnly, makeParkingReject, makeCarKeepOut } from './hooks/keep-out.js';
import { makeHeightPatches as terrainPatches } from './hooks/height.js';
import { inGarden } from './hooks/people.js';
import { makeGroundHoles, makeGroundWayReject } from './hooks/ground.js';
import { makeWaterBodies, makeDuckPonds } from './hooks/water.js';
import { makeDeckUnderside } from './hooks/decks.js';

/** The services whose own deckY(x, z) (a podium, stairs, garden bridges) is consulted before the bridge decks by the drive handling and the pedestrian navigation (H09). An absent service is skipped. */
const DECK_SERVICES = Object.freeze(['landmarksTauride']);
/** the deck services of the page whose module list is MODULES: DECK_SERVICES, plus 'eastBridges' (the raised Alexander Nevsky Bridge deck and the street-level slabs of the Lavra crossings), 'northBridges' (the raised Bolsheokhtinsky / Liteyny Neva decks, ported from the source) and 'landmarksTroitsky' (the Troitsky Bridge with its MOVING bascule leaf, docs/AREAS.md 13.8) when those modules are built; asked after the garden / podium (the decks never overlap). The North and the strip keep the default list. */
const makeDeckServices = (MODULES) => {
  const extra = ['eastBridges', 'northBridges', 'landmarksTroitsky'].filter((m) => Array.isArray(MODULES) && MODULES.includes(m));
  return extra.length ? Object.freeze([...DECK_SERVICES, ...extra]) : DECK_SERVICES;
};

/** T7 (M7b): the landmark services of PRUNE_SERVICES whose entrances carry a facing (the door points of lib/door-points.js: landmarksNorthFull 86, landmarksOktyabrsky 9); the others (Smolny, Suvorov, Kirochnaya) publish clearing discs only. */
const DOOR_SERVICES = Object.freeze(['landmarksNorthFull', 'landmarksOktyabrsky']);

/** HOOKS of the North for the page whose module list is MODULES (area.js passes its own list). */
export function makeHooks(MODULES) {
  return {
    treeCleared, treeReject, tuftReject, propReject, pedestrianOnly,      // factories of (ctx): evaluated once per build, null when their modules are not built
    parkingReject: makeParkingReject(MODULES),      // no ctx in planParking: gated by the module list here
    carKeepOut: makeCarKeepOut(MODULES),            // T2: the garden is closed to cars (a plain function, gated by the module list like parkingReject)
    inGarden,
    deckServices: makeDeckServices(MODULES),
    doorServices: DOOR_SERVICES,                    // T7: the door points of the landmark modules are doors for the pedestrians (people/nav.js)
    groundHoles: makeGroundHoles(MODULES),          // T3: the environment ground is cut out under the garden's own floor (a plain function, gated by the module list like parkingReject)
    groundWayReject: makeGroundWayReject(MODULES),  // T3: the garden's ways are not painted into the ground class mask (the garden draws them)
    waterBodies: makeWaterBodies(MODULES),          // T4a: the garden's ponds enter the field's water mask (env.waterAt, shoreDist, the water shader's distance atlas)
    duckPonds: makeDuckPonds(MODULES),              // T4b: duck lanes on the garden's ponds (wildlife/ducks.js)
    deckUnderside: makeDeckUnderside(MODULES),      // T8a: the flat decks of the garden's buildings also get an underside (city/roofs.js addDeck): no sky through a low roof seen from below
  };
}

/** HEIGHT_PATCHES of the North for the page whose module list is MODULES (layout.js has no ctx). Order = priority: the Paradny podium first, the pond bed of the Tauride remake appends after it. */
export function makeHeightPatches(MODULES) {
  return [...terrainPatches(MODULES)];
}
