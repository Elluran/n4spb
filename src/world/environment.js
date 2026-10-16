// STATUS (environment specialist, paused 2026-10-03): DONE ground (holes: river + metro shafts), Fontanka quay (wall, coping, posts, railing, rings, plates, stairs, colliders, bridge-deck gap), water (wall shadow, foam,
//   under-bridge dark), trees (15 families), lawns / beds / hedges / tufts, far blocks + landmarks + Neva + TV tower (no flags). NOT DONE tub trees on Vosstaniya Sq, tree crown polish, descents cut into the quay.
//   NEXT landmarksC publishes services.landmarksC.bridge {cutwaters, deck}; Neva / extra waterways now extended by the waterways builder (quay.js, water.js, far.js, river.js, waterways.js are theirs).
// environment - the ground, the Fontanka trench, lawns, trees and the far horizon of Saint Petersburg (July, summer afternoon).
//
// WHAT IT DRAWS (files in environment/):
//   river.js   the geometry of the Fontanka trench: the data polygon split into its two banks and continued ~1.5 km past the data extent (north to the Neva, WSW)
//   field.js   the raster "field" of the unbuilt ground built from the OSM data: ground-class mask (lawn / asphalt / granite setts + pavers / gravel per metre),
//              distances to buildings / carriageways / paving / water, a noise tile, and the placement queries (free, clear, categoryAt ...)
//   ground.js  ONE tessellated ground plane (16 m cells over the data, growing to +-7.6 km) with a painterly world-space shader (worn courtyard asphalt, setts and red
//              block pavers, trimmed lawn, ballast gravel, dust at the road edges); the mesh has HOLES: the Fontanka trench and layout.GROUND_HOLES (metro shafts)
//   quay.js    the granite quay walls (water line -3.2, coping +0.17), posts + black railing panels, mooring rings, anchor plates, stair flights, and the colliders that
//              make the trench impassable (open under the Anichkov Bridge deck r5537267: the bridge owner closes that gap)
//   waterways.js / river.js   (pure data / geometry) every waterway of the map from the baked water polygons: stitched bank chains, water levels per waterway (layout.WATERWAYS), invented
//              continuations beyond the data and the Neva scenery ring, the bridge gaps of the quay; layout.js (inRiver, heightAt, shoreDist, waterwayAt) is built on them
//   boats.js   piers (floating pontoons) and tourist boats of the canals and the Neva; lions.js the two copper lions of the Palace Pier descent (the quay builds the pedestals)
//   water.js   the toon water of the Fontanka (wall shadow from the sun direction, foam at the bridge cutwaters), the Neva band far to the north
//   lawns.js   raised flowerbeds with white kerbs (GREEN flowerbed / garden: petunia, geranium, lobelia), round beds on the biggest garden lawns, pitches, clipped privet hedges,
//              a camera-centred pool of grass tufts (only where the shader paints lawn)
//   trees.js + treegeo.js + leafmat.js   ~2200 trees and shrubs: small-leaved limes (young rows on the west bank of the Fontanka, old giants in gardens), Norway maples, elms, ash,
//              oak, horse chestnut, poplar, birch, the clipped maple balls of Vosstaniya Sq, blue spruce in the Anichkov garden; 15 instanced families x 4 LODs, wind sway,
//              contact shadows, trunk colliders; NONE on Nevsky itself
//   far.js     beyond the data extent: ~6000 instanced perimeter-block boxes (5-6 storeys, window shader, mansard band) on the continuation of the street grid, the Admiralty
//              spire / St Isaac / Kazan / Spilled Blood / Peter and Paul / Smolny silhouettes in their real directions, the TV tower (316 m), the Neva, a suburb ring
//   farconf.js shared constants (far fog, street grid in the Nevsky frame)
// Sources: docs/research/fontanka.md (D, modelling spec), streets.md section 6, photos refs/fontanka 11-13 40-47; the siblings 101_3d_yakutsk/environment (field, ground,
// trees, lawns, far) and 100_3d_moscow_city/environment (embankment).
// Claims: environment owns no landmark group (OWNS_GROUPS is not set). Everything a landmark owner draws (lib/claims.js) is left alone: owned GREEN polygons, owned AREAS (a claimed `square` may hold a
//   garden: St Isaac's, Admiralty, Catherine / Kazan gardens) and the courtyards of owned buildings (Winter Palace Great Courtyard) go into the field's `claim` mask = no trunks, hedges, round beds or
//   grass tufts here (the owner plants its own lawns / trees; field.claimed(x, z)); the ground below such an AREA is paving with the mapped lawns painted over it; OSM tree nodes / rows inside a claimed
//   area are skipped (the owner has its own), the ones outside stay (loose: they ignore mapped fences / footways / hedges, 0.8 m from a carriageway) except the maple balls of Vosstaniya Sq.
//   Wave 3 (2026-10-03): view-cone culling of far instanced trees / blocks (coneCulled in util.js), 4-point hedge profile, LOD 3 trees without a stub trunk, pedestrian streets / footway surfaces painted
//   into the ground classes, distance fields quantised one at a time (peak memory -280 MB), round / garden beds lifted to 0.19 m and kept off footway AREAS (z-fight), ground shader: the grey / red stone grids are
//   evaluated separately and blended as colours (a size that varied with the position made the pattern sweep = grain at every border) and the 2 mm pebble speckle is gone (frame-to-frame flicker), ENV tools: tools/environment-harness.mjs (node build + claims), tools/environment-tris.mjs (GPU triangles per spot).
// Debug: ENV_DEBUG=1 node tools/check.mjs environment prints the counts. Budget: ~230k static triangles at the hero view (limit 600k), ~1.4 s build in tools/check.mjs.
//
// MARS FIELD EXTENSION (canals builder, 2026-10-06): grass-slope banks (waterways.js slopeRuns / slopeQuads / slopeAt / slopeRings; quay.js; river.js waterCuts 'slope'; field.js claim), BRIDGE_ZONES of the new bridges, rails of the Fontanka north,
//   Swan Canal lime row (trees.js 6), tourist boat reaches (boats.js); slopes count as water for env.waterAt / layout.shoreDist (nobody stands on them); tools/environment-banks.mjs walks the banks.
// PETROGRAD SIDE / SPIT (build-water, 2026-10-06; docs/research/petro-water.md, answers to the sight modules in docs/research/petro-requests-environment.md): the whole Neva, Kronverksky strait, Malaya Neva and
//   Bolshaya Nevka (environment/petro-water.js: the two polygons the bake cannot close; tools/environment-petro-water.mjs) are ONE 'neva' water; new waterways 'zhdanovka' (wall + bar railing below the Zhdanovsky
//   Bridge, grass slopes above it) and 'kronverk-moat' (grass slopes); NATURAL banks (waterways.js petroNatural: slope into the water, no banquette; quay.js sand / cobble / grass); bridge zones from the OSM deck
//   polygons (petroZones, cut exactly, invisible fallback decks while no built module claims the bridge); hand-over to the sights by their claims (OWNER_WATER: the Spit descent, the Shi-Tsza pit; OWNER_BANK:
//   Zayachy Island; KEEP_OUT for descents / piers / boats); far.js: block belt + suburb ring round the new rectangles, TV tower at its real place, silhouettes keyed on claims; ground.js: the data look for the
//   P / V rectangles (the shader knew eight rectangles); water.js: glint noise on a wrapped lattice (dotted rows far from the origin); boats.js: Neva / strait / Malaya Neva / Nevka reaches, a "Meteor".
//   Tools: environment-banks.mjs (now also every Petrograd bank), environment-walk.mjs, environment-regress.mjs (signature of the older areas: mesh / collider / descent sums per box, --diff).
// VASILIEVSKY ISLAND (build-water, 2026-10-07, wave 1; docs/research/vo-water.md, requests in docs/research/vo-requests-environment.md): the generated vo-water.js (tools/environment-vo-water.py: the Gulf of Finland from the
//   island outline and the real coasts, the complete Neva Bay, the real Malaya Neva beyond the Smolenka source; the invented FAR_BANKS south / vasSE and the invented Malaya Neva tail are gone), new waterways 'smolenka' /
//   'gavan' (Galerny Harbour + Shkipersky canal) / 'kovsh' (level -3.4 like the Neva: one water, no step), vo-banks.js (which bank stands where: natural slopes of the Smolenka / Harbour / Kovsh / Dekabristov shore, a rubble
//   revetment on the Gulf shore, concrete PORT quays, the plain slab parapet of Makarova, roster descents), owners.js (the hand-over API of the sight modules: WATER_RINGS / BANK_RINGS / KEEP_OUT / PAVED_RINGS in groups.js),
//   quay.js (port / slab / rubble styles, bank colliders mitred at turns and closed at the sides of slopes, gap ends, 1 m quay openings at the island's bridge decks), boats.js (cargo ships, a second Meteor, tour boats on the
//   Bolshaya Neva below the Blagoveshchensky Bridge and on the Malaya Neva at the Makarova landing stages), trees.js (bank trees), water.js (the Gulf reaches the horizon: cells to x -17.6 km), far.js (the suburb strip is broken
//   over the Gulf). Tools: tools/environment-vo-walk.mjs (walk probe of every island bank), environment-banks.mjs (--strict-zones), environment-regress.mjs (the older boxes stay identical).
// VASILIEVSKY ISLAND, SECOND PASS (water-2, 2026-10-08; docs/research/vo-water.md section SECOND PASS, answers in docs/research/vo-requests-environment.md): plain granite parapet block on the island's Lt Schmidt /
//   Universitetskaya embankment (vo-banks.js STYLE.BLOCK), the cast-iron meander railing at the Dormition church / S-189 reach (waterways.js meanderRail), the 0.5 m wall-face seal beside the sights' water rings
//   (quay.js segOpen), the pale wall + paved berm of the Smolenka mouth arms, a scenery pier w74745049 and the river tram at the Menshikov pontoon (boats.js), BRIDGE_SHADES of the Blagoveshchensky / Uralsky / Smolensky decks,
//   trees keep off tram rails (2 m) and off the real asphalt (prune below), the late roads are road for the field; tools: environment-vo-seal.mjs --modules, environment-regress.mjs --extra.
// VASILIEVSKY ISLAND, THIRD PASS (water-3, 2026-10-09; docs/research/vo-water.md section THIRD PASS): the Gavan east shore is a concrete port quay with the sloping D-2 revetment (two blue stair flights, a chain on cast-iron
//   posts: environment/revet.js), two descents at the OSM steps of that shore, yellow mushroom bollards on the passenger port berths, the Sevkabel river tram (boats.js), a shade row for the Shkipersky bridge, no fallback deck over
//   dry ground, a longer zone-border square at wide deck openings, the outline of the sights' paving in the claim mask, 8 m clear round the Sobchak monument, `prune()` reads the entrances of the island sights.
// REVIEW OF THE THIRD PASS (review-water-3, 2026-10-09): the pale slab under a mushroom bollard is 9 cm (the module's berth strip covered the 6 cm slab), mushrooms only on island berth walls (46 stood across the fairway),
//   the cut face at the end of an island slope wears the wall texture of its bank (was a flat mauve polygon), the Shkipersky canal-mouth moles are limestone (vo-banks.js STYLE.MOLE: cream ashlar, flat coping, no roll),
//   no plate / culvert inside a sight's water ring + 1 m (island only). Proof: docs/research/vo-water.md section REVIEW 3.
// SECOND REVIEW OF THE THIRD PASS (review-water-3b, 2026-10-09 evening): hedge runs of the open districts are closed at both ends and a brighter green (lawns.js), ground class `port` for the passenger-port land-use polygon
//   w704134882 (field.js), no yellow mushroom bollards on the tip of the south arm (quay.js). Proof: docs/research/vo-water.md section REVIEW 3b.
// SERVICE  ctx.services.environment = {
//   groundAt(x, z)                    layout.heightAt (0, the river bed -4.6 inside the trench)
//   trees: [{ x, z, r (crown radius), h, tr (trunk radius), sp, shrub? }]    every trunk and shrub (keep clear of them)
//   green: [{ id, kind, o, h }]       GREEN polygons that this module draws (claimed + owned ones are left out)
//   quay: { water: -3.2, top (coping top, +0.17), segments: [{ax,az,bx,bz,nx,nz,bank}] (the collider pieces, nx,nz = landward normal), gaps: [deck ring r5537267 (no parapet / collider there)],
//           stairs: [{x,z,tx,tz,nx,nz,bank,length,landingY}] (stair flights: the landing is 0.22 m above the water; pontoons / boats belong to landmarksC), rings, signs, posts, panels }
//   free(x, z, extra, opts) / kindAt(x, z) / waterAt(x, z) / shoreDist(x, z) / treesInRect(...) / field
// }
import * as L from './layout.js';
import { bakedData } from '../core/baked-world.js';
import { GREEN } from './data/city.js';
import { ownedGroups, isOwned } from './lib/claims.js';
import { roadPlan } from './lib/road-plan.js';
import { buildField, loadFieldBake, recordFieldBake } from './environment/field.js';
import { slopeAt } from './environment/waterways.js';
import { inVO } from './environment/vo-banks.js';
import { setPondClaimTest } from './environment/river.js';
import { buildGround } from './environment/ground.js';
import { buildQuay } from './environment/quay.js';
import { buildWater } from './environment/water.js';
import { buildBoats } from './environment/boats.js';
import { buildTrees } from './environment/trees.js';
import { buildFar } from './environment/far.js';
import { buildSurfaces, buildHedges, buildTufts } from './environment/lawns.js';

let _env = null;
/** the trees whose trunk lies inside a rectangle (x0 <= x <= x1, z0 <= z <= z1); [] before the module is built */
export function treesInRect(x0, z0, x1, z1) {
  if (!_env) return [];
  return _env.trees.filter((t) => t.x >= x0 && t.x <= x1 && t.z >= z0 && t.z <= z1);
}

export async function build(ctx) {
  const { THREE } = ctx;
  const root = new THREE.Group(); root.name = 'env'; ctx.addStatic(root);
  const owned = await ownedGroups(ctx);
  const env = { groundAt: L.heightAt, trees: [], green: [], quay: { water: L.RIVER_Y.water, segments: [] }, free: () => true, kindAt: () => 'asphalt', shoreDist: L.shoreDist, waterAt: (x, z) => L.inRiver(x, z) };
  ctx.services.environment = env; _env = env; env.treesInRect = treesInRect;
  const DBG = typeof process !== 'undefined' && process.env && process.env.ENV_DEBUG, timing = {};
  const step = async (name, fn) => { const t0 = Date.now(); try { return await fn(); } catch (e) { console.error('[environment] ' + name + ' failed:', e); if(ctx.recordBake)throw e;return null; } finally { timing[name] = Date.now() - t0; } };

  setPondClaimTest((id) => !!L.claimedBy(id));                   // park ponds that a landmark module claims are that module's (river.js parkPonds)
  await step('road-plan', () => roadPlan(ctx));
  const field = await step('field', async () => {
    const f=buildField(ctx,owned,await loadFieldBake(ctx));await recordFieldBake(ctx,f);return f;
  });
  if (!field) return;
  env.field = field;
  env.free = (x, z, extra = 0, opts) => field.free(x, z, extra, opts);
  env.waterAt = (x, z) => field.shore(x, z) <= 0 || slopeAt(x, z);                 // a grass slope bank (Swan Canal, Moika at the Mikhailovsky Garden) counts as water: nobody may stand on it
  env.kindAt = (x, z) => (field.shore(x, z) <= 0 || slopeAt(x, z) ? 'water' : field.categoryAt(x, z));
  for (const g of GREEN) { if (isOwned(owned, g.id)) continue; for (const p of g.polys) env.green.push({ id: g.id, kind: g.kind, o: p.o, h: p.h }); }

  const ground = await step('ground', () => buildGround(ctx, root, field));
  if (ground) env.ground = { cells: ground.cells, clipped: ground.clipped, triangles: ground.triangles, chunks: ground.chunks };
  const quay = await step('quay', () => buildQuay(ctx, root, owned));
  if (quay) env.quay = quay;
  const surf = await step('surfaces', () => buildSurfaces(ctx, root, field, owned));
  const hedges = await step('hedges', () => buildHedges(ctx, root, field, owned));
  env.hedges = hedges ? hedges.runs : []; env.beds = surf ? surf.round : [];
  await step('tufts', () => buildTufts(ctx, root, field));
  const trees = await step('trees', () => buildTrees(ctx, root, field, owned, env.hedges.map((r) => ({ kind: 'hedge', ...r }))));
  if (trees) {
    env.treeStats = trees.stats;
    // Street lamps, bus shelters and signal poles exist only after streets / props are built (environment is built first): the first time anyone reads the tree list after
    // that (or on the first frame), trees within 3 m of a lamp / signal pole or 4.5 m of a bus stop are removed (instances, collider, list).
    // Door clearings: every service that lists building entrances (city, landmarks) is read as soon as it exists; trees within 4.5 m of a door go too.
    const done = new Set();
    const prune = () => {
      const S = ctx.services, pts = [];
      // (water-2 2026-10-08, the strict furniture audit) streets draws asphalt that the layout does not know (junction fillets, parking pockets, merged carriageways, service lanes of the lots): on the island
      // (inVO, the open districts) a trunk whose footprint reaches that real asphalt (net.cover, the test of tools/roads-furniture-audit.mjs) is removed together with its collider; the older districts keep their trees
      let kill = null;
      if (S.streets && S.streets.net && typeof S.streets.net.cover === 'function' && !done.has('cover')) {
        done.add('cover'); const net = S.streets.net;
        kill = (t) => inVO(t.x, t.z) && field.roadDist(t.x, t.z) < 6 && net.cover(t.x, t.z, {}) > -(t.tr + 0.1);
      }
      if (S.streets && !done.has('streets')) {
        done.add('streets');
        for (const l of S.streets.lamps || []) pts.push([l.x, l.z, 3.0]);
        for (const b of S.streets.busStops || S.streets.stops || []) pts.push([b.x, b.z, 4.5]);
        for (const s of S.streets.signals || []) pts.push([s.x, s.z, 3.0]);
      }
      if (S.props && S.props.lamps && !done.has('props')) { done.add('props'); for (const l of S.props.lamps) pts.push([l.x, l.z, 2.6]); }
      if (S.metro && Array.isArray(S.metro.entrances) && !done.has('metro')) { done.add('metro'); for (const e of S.metro.entrances) if (Number.isFinite(e.x)) pts.push([e.x, e.z, 6]); }
      // (water-3 2026-10-09, request of landmarksKirova) + the Vasilievsky Island sights that publish `entrances` (a generic trunk 4.5 m from a door goes; the older districts are untouched: none of these modules stands there)
      for (const k of ['city', 'landmarksA', 'landmarksB', 'landmarksC', 'landmarksD', 'landmarksEast', 'landmarksNorth', 'landmarksSmolny', 'landmarksTauride', 'landmarksSuvorov', 'landmarksKirochnaya',
        'landmarksAcademy', 'landmarksAndrew', 'landmarksGavan', 'landmarksKirova', 'landmarksMakarova', 'landmarksMarineFacade', 'landmarksMenshikov', 'landmarksMining', 'landmarksModernVO', 'landmarksNavalCorps',
        'landmarksPribaltiyskaya', 'landmarksSeaTerminal', 'landmarksSevkabel', 'landmarksSmolensky', 'landmarksSredny']) {
        if (done.has(k) || !S[k] || !Array.isArray(S[k].entrances)) continue;
        done.add(k);
        for (const d of S[k].entrances) if (Number.isFinite(d.x)) pts.push([d.x, d.z, d.clearance || 4.5]);
      }
      if (pts.length || kill) env.treesPruned = (env.treesPruned || 0) + trees.prune(pts, kill);
    };
    Object.defineProperty(env, 'trees', { get() { prune(); return trees.info; }, enumerable: true, configurable: true });
    ctx.onUpdate(prune);
  }
  const water = await step('water', () => buildWater(ctx, root, field));
  const boats = await step('boats', () => buildBoats(ctx, root, env.quay, owned));
  if (boats) { env.boats = boats.boats; env.piers = boats.piers; }
  const far = await step('far', () => buildFar(ctx, root));
  if (far) env.far = far;
  env.buildPhases = timing;
  if (DBG) {
    const tri = {}; root.traverse((o) => { if (!o.isMesh) return; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); const k = o.name.replace(/-\d+$/, ''); tri[k] = (tri[k] || 0) + Math.round(n); });
    console.log('[environment] ms', JSON.stringify(timing)); console.log('[environment] tris', JSON.stringify(Object.entries(tri).sort((a, b) => b[1] - a[1]).slice(0, 24)));
  }
  if (DBG) console.log('[environment]', JSON.stringify({ trees: env.treeStats, nTrees: trees && trees.count, far: env.far, ground: env.ground, water: water && water.triangles, quay: { segments: env.quay.segments.length, posts: env.quay.posts, panels: env.quay.panels, rings: env.quay.rings, signs: env.quay.signs, stairs: (env.quay.stairs || []).length, colliders: env.quay.colliders } }));
}
