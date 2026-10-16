// environment - the ground, the quays and the water of the canals and the Neva, lawns, trees and the far horizon of the Nevsky strip of Saint Petersburg (July, summer afternoon).
// The module is the one of the whole-city project cut down to the strip (docs/STRIP.md): every rule that belonged to the islands, the Petrograd side, Vasilievsky Island, the south or the east was removed with its data.
//
// WHAT IT DRAWS (files in environment/):
//   waterways.js / river.js   (pure data / geometry) every waterway of the strip from the baked water polygons (RIVER of data/city.js, clipped to the extent + 600 m): stitched bank chains, water levels per waterway
//              (layout.WATERWAYS), the bridge gaps of the quay (BRIDGE_ZONES), the grass-slope banks of the Swan Canal / the Moika; the NEVA continues beyond the data as scenery (the real OSM polygons of data/east-water.js
//              upstream and neva-downstream.js downstream, out to the horizon ring: farBanks() / waterPieces()); layout.js (inRiver, heightAt, shoreDist, waterwayAt) is built on them
//   field.js   the raster "field" of the unbuilt ground built from the OSM data: ground-class mask (lawn / asphalt / granite setts + pavers / gravel per metre), distances to buildings / carriageways / paving / water, a noise
//              tile, and the placement queries (free, clear, categoryAt ...)
//   ground.js  ONE tessellated ground plane (16 m cells over the data, growing to +-7.6 km) with a painterly world-space shader (worn courtyard asphalt, setts and red block pavers, trimmed lawn, ballast gravel, dust at
//              the road edges); the mesh has HOLES: every water body and layout.GROUND_HOLES (metro shafts); beyond the data the shader paints the street grid, the rail ballast band and the suburb colour
//   quay.js    the granite quay walls (water line -2.8 ... -3.4, coping +0.17), posts + black railing panels, mooring rings, anchor plates, stair flights (descents), and the colliders that make the trenches impassable
//              except in the gaps of the bridge crossings; the plain granite wall of the Neva scenery beyond the data
//   boats.js   piers (floating pontoons) and tourist boats of the canals and the Neva; lions.js the two copper lions of the Palace Pier descent (the quay builds the pedestals)
//   water.js   the toon water of every waterway (wall shadow from the sun direction, foam at the bridge cutwaters, dark under the decks) and the Neva to the horizon
//   lawns.js   raised flowerbeds with white kerbs (GREEN flowerbed / garden), round beds on the biggest garden lawns, pitches, clipped privet hedges, a camera-centred pool of grass tufts
//   trees.js + treegeo.js + leafmat.js   ~5000 trees and shrubs (limes, maples, elms, ash, oak, chestnut, poplar, birch, the clipped maple balls of Vosstaniya Sq, spruce in the Anichkov garden); 15 instanced families x 4 LODs,
//              wind sway, contact shadows, trunk colliders; NONE on Nevsky itself
//   far.js     beyond the data extent: ~6000 instanced perimeter-block boxes on the continuation of the street grid, the silhouettes of the sights across the Neva and on the horizon that no module builds (Peter and
//              Paul spire, the Strelka columns / Exchange, the University embankment, Smolny, the TV tower), a suburb ring on the horizon (broken where the Neva runs through it)
//   farconf.js shared constants (far fog, street grid in the Nevsky frame)
// Claims: environment owns no landmark group (OWNS_GROUPS is not set). Everything a landmark owner draws (lib/claims.js) is left alone: owned GREEN polygons, owned AREAS (a claimed `square` may hold a garden: St Isaac's,
//   Admiralty, Catherine / Kazan gardens) and the courtyards of owned buildings (Winter Palace Great Courtyard) go into the field's `claim` mask = no trunks, hedges, round beds or grass tufts here (the owner plants its own
//   lawns / trees; field.claimed(x, z)); the ground below such an AREA is paving with the mapped lawns painted over it; OSM tree nodes / rows inside a claimed area are skipped (the owner has its own), the ones outside stay
//   (loose: they ignore mapped fences / footways / hedges, 0.8 m from a carriageway) except the maple balls of Vosstaniya Sq. Buildings and lawns that a DROPPED module used to claim are generic here.
//   View-cone culling of far instanced trees / blocks (coneCulled in util.js), 4-point hedge profile, pedestrian streets / footway surfaces painted into the ground classes, distance fields quantised one at a time.
// Debug: ENV_DEBUG=1 node tools/check.mjs environment prints the counts and the build phases. Tools: tools/environment-harness.mjs (node build + claims), environment-tris.mjs (GPU triangles per spot),
//   environment-regress.mjs (signature of the meshes / colliders per box: --out a.json, --diff a.json b.json), environment-banks.mjs and environment-walk.mjs (walk probes of every bank piece and descent).
// Strip numbers (node, tools/check.mjs environment, 2026-10-16): 685 k static triangles (95 k ground + 95 k its far super-cell copy, 60 k water, 22 k far blocks, the quay with its instanced posts / panels, 5000 trees), 6.3 s build
//   (the field, 2.4 s of it, is baked in production). The whole-city module measured 1.06 M / 10.6 s on the same data before it was clipped and cut down.
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
  const quay = await step('quay', () => buildQuay(ctx, root));
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
      if (S.streets && !done.has('streets')) {
        done.add('streets');
        for (const l of S.streets.lamps || []) pts.push([l.x, l.z, 3.0]);
        for (const b of S.streets.busStops || S.streets.stops || []) pts.push([b.x, b.z, 4.5]);
        for (const s of S.streets.signals || []) pts.push([s.x, s.z, 3.0]);
      }
      if (S.props && S.props.lamps && !done.has('props')) { done.add('props'); for (const l of S.props.lamps) pts.push([l.x, l.z, 2.6]); }
      if (S.metro && Array.isArray(S.metro.entrances) && !done.has('metro')) { done.add('metro'); for (const e of S.metro.entrances) if (Number.isFinite(e.x)) pts.push([e.x, e.z, 6]); }
      for (const k of ['city', 'landmarksA', 'landmarksB', 'landmarksC', 'landmarksD', 'landmarksNorth']) {
        if (done.has(k) || !S[k] || !Array.isArray(S[k].entrances)) continue;
        done.add(k);
        for (const d of S[k].entrances) if (Number.isFinite(d.x)) pts.push([d.x, d.z, d.clearance || 4.5]);
      }
      if (pts.length) env.treesPruned = (env.treesPruned || 0) + trees.prune(pts);
    };
    Object.defineProperty(env, 'trees', { get() { prune(); return trees.info; }, enumerable: true, configurable: true });
    ctx.onUpdate(prune);
  }
  const water = await step('water', () => buildWater(ctx, root, field));
  const boats = await step('boats', () => buildBoats(ctx, root, env.quay));
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
