// ============================================================================
//  hooks/keep-out.js - the KEEP-OUT hooks of the North (docs/AREAS.md section 9, milestone M6, cluster B): places where the engine plants no tree, grows no grass tuft, stamps no bench and draws no
//  lanes because a landmark module of the page draws the place itself. The coordinates are static (the source hard-codes them too): `environment` is built FIRST, so it cannot read the service of a
//  landmark module, only the module list.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap). hooks/paradny.js (inParadny) is the one import.
//
//  Each (ctx) factory is called ONCE per build by its engine module (the tuft / prop / tree paths are hot) and returns null when none of the modules it serves is in ctx.buildList (an absent
//  ctx.buildList counts as "not built", as in the source: `ctx.buildList?.includes(name)`); the engine calls the returned function per candidate. THE SIGNATURES ARE FROZEN.
//    treeCleared(ctx)      -> ((x, z) => boolean) | null    H02  environment/trees.js cleared(): SOFT clearing (cleared() runs only under `!o.force`; no caller forces, so mapped OSM trees are cleared too: none lies in the rectangles).  Serves landmarksSmolny (the two ceremonial approaches),
//                              landmarksTauride (T5 fix round 1: the palace parterre, PALACE_PARTERRE: the vista from the garden's lake to the palace's garden front)
//    treeReject(ctx)       -> ((x, z) => 'paradny' | 'garden' | 'campus' | 'suvorov' | null) | null    H03  environment/trees.js plant(): HARD reject, mapped trees too; the reason string is the ENV_DEBUG
//                              counter.  Serves landmarksTauride (the podium; T5: the garden outline too, the garden plants its own trees), landmarksKirochnaya (the CAMPUS polygon, embedded here), landmarksSuvorov (x 1384 .. 1442, z -1226 .. -1208)
//    tuftReject(ctx)       -> ((x, z) => boolean) | null    H04  environment/lawns.js buildTufts() live(): no grass tufts.  Serves landmarksTauride, landmarksKirochnaya
//    propReject(ctx)       -> ((cx, cz) => boolean) | null    H05  props/world.js fits(): no bench / bin / kiosk stamped.  Serves landmarksTauride
//    pedestrianOnly(ctx)   -> ((way) => boolean) | null    H06  streets.js build(): way.pedestrianOnly (no lanes, no lamps, no parking); uses way.rank, way.x[], way.z[] (the source: rank 0 and more than 60 % of the
//                              points in the podium).  Serves landmarksTauride
//  and one plain function, because streets/parking.js planParking(net) has NO ctx: it is gated by the page's module list when hooks.js runs makeHooks(MODULES):
//    makeParkingReject(MODULES) -> ((x, z) => boolean) | undefined    H07  streets/parking.js: no parked-car slot / line (the source: inParadny, unconditional).  undefined unless MODULES has landmarksTauride
//    makeCarKeepOut(MODULES)    -> ((x, z) => boolean) | undefined    T2a  drive/handling.js solidBlocked (T2 of the Tauride remake): the garden is CLOSED to cars, the polygon is the garden outline (hooks/people.js inGarden), no exception for the service lane.  undefined unless MODULES has landmarksTauride
//
//  The Smolny, Suvorov and campus keep-outs are ACTIVE in the North since M5 (their modules are built); the Paradny ones are DORMANT until the Tauride remake adds 'landmarksTauride' to the MODULES.
//  Port of the source (102_3d_piter @ 0568f7af): environment/trees.js :185-188 and :261-263, environment/lawns.js :366-368, props/world.js :185-186, streets.js :106-107, streets/parking.js :74-75.
// ============================================================================
import { inParadny } from './paradny.js';
import { inGarden } from './people.js';
import { inNursery } from '../../../world/landmarksTauride/data/nursery.js';        // T8b: the nursery lot (pure data, no imports): the module plants its own trees, draws its own earth and stamps no prop there

const built = (ctx, name) => !!(ctx && ctx.buildList && ctx.buildList.includes(name));
/** strictly inside the box [x0, x1, z0, z1] (the open rectangles of the source) */
const inBox = (b, x, z) => x > b[0] && x < b[1] && z > b[2] && z < b[3];

/** Smolny's mapped ceremonial approaches, [x0, x1, z0, z1]: the last 120 m to the west doors of the cathedral (entrance (2425, -1833), z centre -1833.5; the east 12 m reach into its apse, footprint x >= 2428) and the
 *  last 120 m to the portico of the Institute (portico axis z -1544.5, x 2517.85). Verified against the M5 module (tools/north-keepout-test.mjs, docs/AREAS.md section 9): no collider of the module stands in the open part. */
export const SMOLNY_APPROACHES = [[2320, 2440, -1847, -1820], [2400, 2520, -1553, -1533]];
/** The palace parterre, [x0, x1, z0, z1] (T5 fix round 1 of the Tauride remake): the open lawn in front of the central bow of the Tauride Palace's garden front (the bow spans x 1360 .. 1394 at z -1643 .. -1658; the lake's north
 *  shore is the garden outline, z -1607 .. -1639 there), the width of the bow + 4 .. 10 m to each side, from the quay to the facade. OSM maps the whole palace side as the wood w1274934137 (11,641 m2, U-shaped round the palace,
 *  outside the park polygon) and the engine planted it at wood density up to the facade, which hid the palace front from the garden (the GPU QA of T5: from the T11 pose, 107 m across the lake, the facade stood behind
 *  6 crowns). The vista from the lake to the palace's garden front is the historical axis of the ensemble; the wood keeps its trees on both sides of the parterre. A soft clearing (H02), so the mapped trees go too. */
// Review fix: x1 1404 -> 1436 and z1 -1606 -> -1598. The box covered the central bow only; the east wing (the facade east of x 1394 up to 1420) stood behind 17 crowns of the wood (lime / maple / ash / birch, 70 .. 90 m from T11, x 1406 .. 1433, z -1640 .. -1602) in a CPU sight test from the T11 pose (vegetation-test: the whole garden front).
export const PALACE_PARTERRE = [1356, 1436, -1660, -1598];
/** The north frontage of the Suvorov Museum, [x0, x1, z0, z1]: its width (the footprint is x 1384.3 .. 1441.2) and the 17 m from the doorstep (wall z -1224.9) to the middle of the building (it reaches z -1194.2). */
export const SUVOROV_STRIP = [1384, 1442, -1226, -1208];
/** The garden campus of the Elena Pavlovna Clinical Institute, 8 vertices [x, z]. A COPY of CAMPUS in src/world/landmarksKirochnaya/groups.js (that file imports the data facade, and the hooks files import none;
 *  tools/north-hooks-test.mjs and tools/north-keepout-test.mjs assert the two are equal). */
export const CAMPUS = [[1118, -1237.6], [1150.5, -1242.2], [1241.6, -1239.8], [1343.1, -1237], [1336.5, -1068.8], [1244, -1047], [1134.4, -1048.8], [1110.1, -1100.5]];

/** True when (x, z) is inside the campus polygon (even-odd; the expression of landmarksKirochnaya/groups.js inCampus). */
export function inCampus(x, z) {
  let hit = false;
  for (let i = 0, j = CAMPUS.length - 1; i < CAMPUS.length; j = i++) {
    const a = CAMPUS[i], b = CAMPUS[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}

/** H02: the soft clearing of the Smolny approaches (trees.js cleared(): all candidates, since no caller passes `force`) and, with landmarksTauride built, of the palace parterre (T5 fix round 1). */
export function treeCleared(ctx) {
  const smolny = built(ctx, 'landmarksSmolny'), tauride = built(ctx, 'landmarksTauride');
  if (!smolny && !tauride) return null;
  return (x, z) => (smolny && (inBox(SMOLNY_APPROACHES[0], x, z) || inBox(SMOLNY_APPROACHES[1], x, z))) || (tauride && inBox(PALACE_PARTERRE, x, z));
}

/** H03: the hard reject of plant(), in the order of the source (podium, campus, Suvorov strip); the string is the reason counter of ENV_DEBUG.
 *  T5 (the Tauride remake): 'garden' inside the garden outline (hooks/people.js inGarden) when landmarksTauride is built: the garden plants its own trees (landmarksTauride/vegetation.js), the 7 mapped OSM trees among them;
 *  the facade's TREES carry no ids to claim, and plant() applies this reject to the mapped trees too (the procedural ones are already kept out by the claimed park and woods). */
export function treeReject(ctx) {
  const tauride = built(ctx, 'landmarksTauride'), campus = built(ctx, 'landmarksKirochnaya'), suvorov = built(ctx, 'landmarksSuvorov');
  if (!tauride && !campus && !suvorov) return null;
  return (x, z) => (tauride && inParadny(x, z) ? 'paradny' : tauride && inGarden(x, z) ? 'garden' : tauride && inNursery(x, z) ? 'nursery' : campus && inCampus(x, z) ? 'campus' : suvorov && inBox(SUVOROV_STRIP, x, z) ? 'suvorov' : null);
}

/** H04: no grass tufts on the podium or in the campus. */
export function tuftReject(ctx) {
  const tauride = built(ctx, 'landmarksTauride'), campus = built(ctx, 'landmarksKirochnaya');
  if (!tauride && !campus) return null;
  return (x, z) => (tauride && (inParadny(x, z) || inNursery(x, z))) || (campus && inCampus(x, z));
}

/** H05: nothing is stamped on the podium (props/world.js fits(); the mapped OSM furniture of props/osm.js does not go through fits() and stays). */
export function propReject(ctx) {
  return built(ctx, 'landmarksTauride') ? (cx, cz) => inParadny(cx, cz) || inNursery(cx, cz) : null;
}

/** H06: a rank-0 way with MORE than 60 % of its points in the podium is the module's to draw (no lanes, lamps, parking). */
export function pedestrianOnly(ctx) {
  if (!built(ctx, 'landmarksTauride')) return null;
  return (w) => {
    if (w.rank !== 0) return false;
    let n = 0;
    for (let i = 0; i < w.x.length; i++) if (inParadny(w.x[i], w.z[i])) n++;
    return n > w.x.length * .6;
  };
}

/** H07: no parked-car slot or bay line on the podium; planParking has no ctx, so the module list gates it (the source filters unconditionally). */
export function makeParkingReject(MODULES) {
  return Array.isArray(MODULES) && MODULES.includes('landmarksTauride') ? (x, z) => inParadny(x, z) : undefined;
}

/** T2a: the Tauride Garden is closed to cars. A plain function like parkingReject (the handling reads it once per car, no ctx needed), gated by the page's module list: the polygon is the garden outline (inGarden: strict bbox first, then the ring), the same as the people cap; the service lane through the west gate is NOT an exception. 11 gate bollards would leave 13 openings, 4 unfenced stretches and the service lane open (docs/TAURIDE-REMAKE.md 6.5). */
export function makeCarKeepOut(MODULES) {
  return Array.isArray(MODULES) && MODULES.includes('landmarksTauride') ? (x, z) => inGarden(x, z) : undefined;
}
