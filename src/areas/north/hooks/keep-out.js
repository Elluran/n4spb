// ============================================================================
//  hooks/keep-out.js - the KEEP-OUT hooks of the North (docs/AREAS.md section 9, milestone M6, cluster B): places where the engine plants no tree, grows no grass tuft, stamps no bench and draws no
//  lanes because a landmark module of the page draws the place itself. The coordinates are static (the source hard-codes them too): `environment` is built FIRST, so it cannot read the service of a
//  landmark module, only the module list.
//  FOUNDATION STUB: every factory returns null (makeParkingReject: undefined) = the engine does what it does without the hook. Cluster B fills in the bodies; THE SIGNATURES ARE FROZEN.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap). hooks/paradny.js (inParadny) is the one import to make.
//
//  Each (ctx) factory is called ONCE per build by its engine module (the tuft / prop / tree paths are hot) and returns null when none of the modules it serves is in ctx.buildList (an absent
//  ctx.buildList counts as "not built", as in the source: `ctx.buildList?.includes(name)`); the engine calls the returned function per candidate.
//    treeCleared(ctx)      -> ((x, z) => boolean) | null    H02  environment/trees.js cleared(): SOFT clearing, not applied to forced / mapped OSM trees.  Serves landmarksSmolny (the two ceremonial approaches)
//    treeReject(ctx)       -> ((x, z) => 'paradny' | 'campus' | 'suvorov' | null) | null    H03  environment/trees.js plant(): HARD reject, mapped trees too; the reason string is the ENV_DEBUG
//                              counter.  Serves landmarksTauride (the podium), landmarksKirochnaya (the CAMPUS polygon, embedded here), landmarksSuvorov (x 1384 .. 1442, z -1226 .. -1208)
//    tuftReject(ctx)       -> ((x, z) => boolean) | null    H04  environment/lawns.js buildTufts() live(): no grass tufts.  Serves landmarksTauride, landmarksKirochnaya
//    propReject(ctx)       -> ((cx, cz) => boolean) | null    H05  props/world.js fits(): no bench / bin / kiosk stamped.  Serves landmarksTauride
//    pedestrianOnly(ctx)   -> ((way) => boolean) | null    H06  streets.js build(): way.pedestrianOnly (no lanes, no lamps, no parking); uses way.rank, way.x[], way.z[] (the source: rank 0 and more than 60 % of the
//                              points in the podium).  Serves landmarksTauride
//  and one plain function, because streets/parking.js planParking(net) has NO ctx: it is gated by the page's module list when hooks.js runs makeHooks(MODULES):
//    makeParkingReject(MODULES) -> ((x, z) => boolean) | undefined    H07  streets/parking.js: no parked-car slot / line (the source: inParadny, unconditional).  undefined unless MODULES has landmarksTauride
// ============================================================================

export function treeCleared(ctx) { return null; }
export function treeReject(ctx) { return null; }
export function tuftReject(ctx) { return null; }
export function propReject(ctx) { return null; }
export function pedestrianOnly(ctx) { return null; }
export function makeParkingReject(MODULES) { return undefined; }
