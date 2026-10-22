// Hand-authored judgement tables of the Tauride tools: every number here that is NOT read from the OSM data, with its provenance. The computations live in derive.mjs; this file is the one place
// to edit when the garden team replaces an estimate by a better value (then re-run `node tools/tauride/build.mjs`).

export const GARDEN_ID = 'r1582734';          // OSM relation "Tavricheskiy sad" (GREEN, kind park)
export const LAKE_ID = 'r1582714';            // the big lake with the island (WATER, kind pond)
export const WEST_POND_ID = 'r6278222';       // the west pond (WATER, kind pond)
export const PALACE_ID = 'r3801092';          // the Tauride Palace (BUILDINGS, kind castle)

/**
 * Widths of the four canal strips. OSM maps the canals of the garden as centre lines only (the facade keeps them as STREAMS records, kind 'canal'; the lake and the west pond are polygons).
 * PROVENANCE: 'estimated' (not surveyed). `estimate` = the number of the source repository's generator (tauride-generate.mjs / terrain.js header): "estimated at 6-12 m from aerial reference
 * photographs and mapped bridge spans" (the photographs are third-party and not in this repository). The width USED is the estimate unless a mapped, non-bridge garden way would lie under the
 * water: derive.mjs dryWidth lowers the width in 0.5 m steps (CANAL_DRY_RULE) until no more than `tolerance` metres of such ways are inside the strip. The mapped ways are survey-grade evidence
 * (OSM footways along the banks), the estimate is not: with the estimate the south arm w81524420 (12 m) would swallow 33 m of four footways, w112853212 (10 m) 1.5 m of three. The bridge spans do NOT
 * give an independent bound (a bridge's water span is the strip width itself): only the deck length bounds it from above (deck minus two abutments).
 */
export const CANAL_WIDTHS = {
  w30198531: { estimate: 12, provenance: 'estimated', note: 'east arm round the Pioneers island; crossed by the metal bridge w882128034 (No.4 site, 16.4 m deck)' },
  w81524420: { estimate: 12, provenance: 'estimated', note: 'south arm; crossed by the metal bridge w112880644 (No.5 site, 15.8 m deck)' },
  w112853192: { estimate: 6, provenance: 'estimated', note: 'short 28 m channel by the north-west bay (no bridge): the narrowest' },
  w112853212: { estimate: 10, provenance: 'estimated', note: 'canal of the west pond, runs to the dam; crossed by the wooden bridge w112853204 (No.1 site, 15.3 m deck) and the dam way w112880645' },
};
export const CANAL_DRY_RULE = { step: 0.5, min: 4, tolerance: 0.25 };
/** canal ends within `tolerance` m of an OSM water polygon are moved `overlap` m into it so the union is watertight (derive.mjs joinCanal); provenance: modelling choice of this repository */
export const CANAL_JOIN = { tolerance: 0.5, overlap: 1.5 };
export const CANAL_WIDTH_DEFAULT = 8;          // the generator's default for a canal not in the table (none today)

/**
 * The five numbered historical bridges and the dam. The plan (section 5) names No.3 (iron arch, 13.15 m span), No.4 (iron arch, 10.6 m), No.1 (humped wooden), "flat metal No.2 and No.5" and "a low
 * weir at the dam"; it never says which OSM way is which. The mapping below is derived from the sites the plan itself gives for its camera poses (No.3 (1390,-1457), No.4 (1334,-1427), No.1
 * (1103,-1586), dam (1272,-1674)) and from the water chain for the two it does not locate (No.2, No.5). `confidence`: 'plan' = the plan gives the site, 'inferred' = by the order along the water.
 * `ways` are in walking order along the site; `type` is the design type of the new bridge kit (C3 of the plan).
 */
export const BRIDGE_SITES = [
  { site: 'No.1', name: 'wooden humped bridge (west pond, south bay)', type: 'wood-humped', ways: ['w112853204'], confidence: 'plan', basis: 'OSM bridge=yes surface=wood: the only wooden way; plan camera (1103,-1586) is on it' },
  { site: 'No.2', name: 'flat metal bridge (north end of the west pond)', type: 'metal-flat', ways: ['w112853220'], confidence: 'inferred', basis: 'metal, 13.4 m, at (1226,-1712) = first metal crossing along the water chain west pond -> dam -> lake; the plan names neither No.2 nor No.5' },
  { site: 'dam', name: 'overflow dam / weir between the west pond and the lake', type: 'weir', ways: ['w112880645'], confidence: 'data', basis: 'the 7.0 m way without a surface tag across the narrowest neck of the water chain: see DAM_DECISION' },
  { site: 'No.3', name: 'iron arch bridge to the Pioneers island', type: 'iron-arch', ways: ['w81524417', 'w882132271', 'w882132272'], confidence: 'plan', basis: 'plan camera (1390,-1457) is on w81524417; the three ways are ONE chain (21.8 m): compacted ramp, 9.4 m metal span, compacted ramp; plan span 13.15 m' },
  { site: 'No.4', name: 'iron arch bridge (east arm)', type: 'iron-arch', ways: ['w882128034'], confidence: 'plan', basis: 'metal, 16.4 m at (1334,-1427) = plan camera "bridge No.4 (1334,-1427)"; plan span 10.6 m' },
  { site: 'No.5', name: 'flat metal bridge (south arm)', type: 'metal-flat', ways: ['w112880644'], confidence: 'inferred', basis: 'metal, 15.8 m at (1338,-1330) = last crossing along the chain (south end of the lake)' },
];
/** design deck width of every bridge (m): the facade carries 2.4 m (the highway=footway class default, not a survey); the old module drew 3 m */
export const BRIDGE_DECK_WIDTH = { value: 3.0, provenance: 'design', note: 'facade w = 2.4 is the class default; the old garden.js drew r.w = 3; iron footbridges of the garden are 3-4 m wide in photographs' };
/** the old garden.js extension: a free bridge end that stands in the water is moved along its axis in 0.5 m steps (max 12 m) until dry, plus 0.7 m of abutment */
export const BRIDGE_EXTEND = { step: 0.5, max: 12, abutment: 0.7, junctionTolerance: 0.15 };

/** Class rule of the garden ways (docs/TAURIDE-REMAKE.md section 5): see derive.mjs classOf. Widths in metres. */
export const PATH_CLASS_RULE = {
  main: { wMin: 3.5, wMax: 4.5, lengthForMax: 300, minLen: 150, litMinLen: 30 },
  side: { w: 2.4 },
  trail: { w: 1.4 },
  steps: { w: 2.2 },
};
/** manual class overrides { 'w123': 'main' | 'side' | 'trail' } for the garden team (empty: the rule decides) */
export const PATH_CLASS_OVERRIDES = {};

/** the 12 + 1 buildings and the rest: nothing hand-authored */
export const FENCE_RULES = { panel: 2.7, gateClear: 4, pathClear: 2.1, perimeterNear: 3, gapMin: 8, sample: 2 };    // the numbers of the old garden.js / the scout's fence-gaps.mjs
