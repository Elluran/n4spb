# Performance contract for new areas and landmarks

Read this before extending the city, copying a landmark helper, changing a renderer,
or adding work to the frame loop. Read the latest pass in [PERFORMANCE.md](PERFORMANCE.md)
for measured bottlenecks and rejected experiments. The road, marking, label and facade
rules in [AGENT-BRIEF.md](AGENT-BRIEF.md) apply as well.

The whole strip (Moscow Station -> Nevsky -> Admiralty, [STRIP.md](STRIP.md)) must remain usable while walking and driving. A district that performs
well alone can still slow every other district if its objects, updates or caches run
city-wide. Validate the integrated scene at both ends of the strip (Vosstaniya Square and the Admiralty / Palace Square).

## Rendering and instances

* Use the shared material factories, vertex colours and existing sign/texture atlases.
  Avoid a distinct material or texture for every house, window, lamp or sign. Material
  count and draw calls matter even for low-polygon objects; the colour, outline and
  shadow passes can each repeat the cost.
* Submit immutable geometry with `ctx.addStatic`. Let the engine batch it, split it
  into spatial cells and register its LOD. Do not add `noBatch`, `noND` or
  `frustumCulled = false` just to make an object appear. Explain unavoidable exceptions
  next to the code and include their measured cost in the handoff.
* Static repeated fixtures need correct aggregate bounds and frustum culling. A
  district-wide instanced mesh must not force all its instances through every pass
  throughout the city. Use the existing spatial splitting rules rather than one
  uncullable global batch. Keep placement, colliders and service records identical.
  After splitting, the engine may combine compatible low-poly fixture pieces in
  the same cell and authored range (`core/fixture-cells.js`). Keep its eligibility
  narrow: immutable buffers, the standard toon shader, matching zones/materials,
  and conservative union bounds. Dynamic, reflected, transparent and custom-shader
  instances retain their original path. Run `tools/fixture-cells-test.mjs` when
  changing this pass; measure expanded-buffer memory as well as draw calls.
* An instance buffer that is repacked, animated, or reassigned between LODs is dynamic,
  even when its parent is under `staticRoot`. Mark it accordingly and use
  `THREE.DynamicDrawUsage`; otherwise static splitting or outline proxies can capture
  stale transforms. Bounds must contain every possible member, all LOD geometries,
  scale/rotation and shader displacement. A bound based on the current short prefix
  becomes wrong when that prefix changes. Hide empty buckets and retain pending
  upload ranges until the GPU has consumed them.
  Landmark tree generators use `prepareTreeLods(lods, immutableMatrices)` from
  `world/lib/tree-bounds.js`; repacking updates counts and empty visibility, not
  the full-placement bounds. Verify changes with `tools/landmark-tree-bounds-test.mjs`.
  Its 2 m wind margin covers the current shaders and wind strengths. Revalidate
  that margin when changing shader displacement or parent scaling; instance
  matrices are mesh-local and existing landmark roots use identity scale.
* Keep the existing skyline protection for tall spires and distant landmark masses.
  Material batching alone is not geometry LOD. When adding simpler geometry at
  distance, preserve roof profiles and landmark silhouettes.
  Use authored ranges through the LOD registry. Do not bypass region parents or zone
  visibility, duplicate registrations, or register moving boats/trains as static
  sector objects. Underground content must stay hidden from the surface.
  Static batching must preserve an existing LOD registration, including its
  anchor, radius, near/far switch and shadow policy. An aggregate collector's
  large bounds do not make its carvings or rail details infinite-range geometry.
  Outline proxies must respect short detail and replacement ranges too; verify
  `tools/authored-lod-test.mjs` when changing either batching pass.
* Copying a helper also copies its bugs. Check equivalent shared helpers and recent
  fixes before copying `trees.js`, instancing kits, material factories or batching
  code from an older landmark. Prefer one tested shared rule.

## Work during a frame

* Use spatial queries for nearby entities. Avoid scanning every road, tree, parked
  car, label or pedestrian in the enlarged city each frame.
* Preserve the existing far-agent scheduling and discrete signal-display clocks.
  Render-range culling must not change traffic rules, collision safety or navigation.
  Measure new pedestrian groups and scripted activities from the old centre too:
  leaders/followers currently bypass the ordinary far-agent slowdown, so an unseen
  crowd can still consume simulation time. Render culling alone does not stop it.
* Cache immutable transforms and geometry. Upload only changed active ranges and
  share instance buffers where compatible. Do not rebuild materials, textures,
  geometry, indexes or large temporary arrays in the frame loop.
  For opaque tree LODs, use the persistent bucket writer in
  `world/environment/tree-instances.js`: unchanged membership should not repack
  every following instance. Preserve each geometry's transform and colour, use
  full-placement bounds, and run `tools/tree-instance-test.mjs`. Do not apply unordered
  swap removal to transparent instances whose order affects blending.
* Navigation edges remain packed numeric columns with ordered CSR adjacency.
  Routing must preserve edge order, costs, crossings and tie-breaking. Use the
  graph's append helpers for station/access nodes; numeric edge indexing returns
  a read-only snapshot. Run `tools/packed-graph-test.mjs` for storage/routing edits.
  Release the decoded navigation cache after hydration and keep geometry-builder
  scratch arrays out of long-lived shader/update closures.
  Static obstacle cell IDs use ordered packed storage with allocation-free
  queries (`people/packed-cell-index.js`). Preserve insertion order and exact
  collider arithmetic; run `tools/packed-cell-index-test.mjs`. Road cross-section
  records with the same width within a way are immutable shared values, tested
  by `tools/lane-bounds-storage-test.mjs`. Bridge builders clear their scratch
  buckets after flushing, before their service closures become long-lived.
* Register detail ranges through `registerLOD(mesh, authoredFar, opts)` from
  `core/spatial.js` (or `LOD.add` when world bounds are already known). The engine
  groups compatible static details under conservative distance bounds. `opts.attach`
  is for engine-owned immutable world-space matrices, not arbitrary landmark roots.
  Keep far silhouettes and outline
  proxies in their existing pass roots. If changing group membership, invalidate
  cached shadow bounds and test zones, streaming removal and camera turns with
  `tools/lod-range-test.mjs` and `tools/shadow-sector-test.mjs`.
* Bound caches and their prefetch working sets together. A prefetch ring larger than
  the cache repeatedly creates and evicts the same entries, including while standing
  still. Test stationary, moving and teleporting cases; an idle cache must settle.

## Loading and baked products

Use [AREA-DEVELOPMENT.md](AREA-DEVELOPMENT.md) for the short authoring loop;
full-city construction and baking belong at integration checkpoints. Keep a
matching source+bake snapshot for performance comparisons. Run GPU jobs serially
and keep CPU audits out of timed loading/driving intervals.

Private static batch outputs may pack bounded normals/colours to normalized
16-bit attributes after far-proxy construction. Positions, UVs, topology, shared
source geometries and dynamic templates stay exact. Preserve upload-release
callbacks and HDR fallback; run `tools/compact-static-test.mjs` and
`tools/static-batch-upload-test.mjs`. Quantization is not geometry LOD.

* Keep normal baked loading enabled and region loading limited to the player's
  surroundings. Preload a teleport destination before moving the player or car.
  `ensureAll` belongs to offline baking and explicit diagnostics, not normal startup
  or a background task that loads the entire city during driving.
* Preserve baked schema compatibility, shared typed-array storage, texture state,
  bounds and the generator fallback. Avoid duplicate decoded buffers and retaining
  temporary packed records after hydration. Large decode work belongs off the main
  thread; a worker must have a tested failure path.
* New static district data needs a deliberate bake/streaming integration. Do not
  defer a whole landmark builder without handling its colliders, claims, labels,
  wires, services, dynamics and distant silhouette. Other modules consume those
  during startup.
  Use `bakedData`/`ctx.baked.load`, `ctx.regions.register`, and the shared
  `packGeometry`/`packMeshes` functions so worker decoding and saved bounds apply.
  Run the codec, loader, baked-mesh and region-streamer regressions when extending
  the payload; do not replace the loader with a main-thread `fetch`/`JSON.parse` path.
* Every `src/` change invalidates the shipping bake, even a runtime-only change.
  Once all source edits are complete, run `npm run bake`, verify the source revision
  and manifest match, then commit the source and generated assets. A failed or
  interrupted bake must leave the last complete manifest intact. Do not publish
  partial products or manually relabel stale assets as current.
* `?baked=force` is only for controlled developer comparisons when the data is known
  to remain compatible. Final validation must use normal loading without it.

## Evidence required before a checkpoint is reported complete

1. Record a before/after run on the same browser/GPU, viewport, quality and scene
   revision/data. Test the start/Nevsky area and a road in the new district. For an
   FPS comparison, use `tools/drive-bench.mjs` with the same road-lane start and input,
   `--json`, and no `--profile` or `--mid-shot`. Report load time, mean/p50/p95 frame
   times, hitches, draw calls and distance travelled. Explain traffic or route
   differences; a frozen-camera render benchmark is not driving FPS.
2. Keep the full scene intact. Do not benchmark a tiny `--only` scene, disabled
   crowds/traffic/shadows, a stale forced bake or a lower quality as evidence that
   the normal integrated scene became faster. Such runs are useful diagnostics
   when labelled explicitly. Run GPU benchmarks serially on a quiet machine.
3. Check nearby and distant views, camera turns, region boundaries and a teleport
   into the district. Turn toward the old centre and dense skyline as well as the
   local district during integrated tests. Inspect actual screenshots for missing
   trees, roofs, spires, signage, shadows and stale outlines. Exercise entry, acceleration, braking and
   exit from the red car. Report relevant console/module/asset failures.
4. Run the focused existing regressions for changed systems, plus the road/marking
   audits required by the agent brief. Extend coverage for new invariants; do not
   add tests that merely reproduce implementation details. Never accept fewer
   reported draws alone: measure frame time and memory too.
   With `--diagnostics`, record CDP `heap.usedSize` and `backingStorageSize`
   separately. A modest retained-object increase can push a larger city into
   repeated GC stalls even when geometry and draw-call growth look acceptable.
   Allocation sampling/profiling is a separate diagnostic run, never a timed FPS
   comparison. For runtime-only work, `bake-product-compare.mjs <baseline-dir>`
   verifies product equality, allowing only the explicitly listed build timings.
5. Add measured results and limitations to `PERFORMANCE.md`, including new-area
   overhead in the old centre. If comfortable driving (at least 30 FPS / 33.3 ms)
   is still not reached, say so plainly. Leave a reproducible command and the next
   measured bottleneck, rather than claiming the performance goal is finished.

Example (substitute a verified drivable lane for the new district):

```powershell
node tools/drive-bench.mjs --q medium --seconds 20 --start "498.2286,135.1625,76.0322" --json --diagnostics --out shots/perf/centre
node tools/drive-bench.mjs --q medium --seconds 20 --start "x,z,yaw" --json --diagnostics --out shots/perf/new-area
node tools/drive-test.mjs --q medium --nofuzz --out shots/perf/controls
npm run roads
npm run markings
npm run bake
```

After baking, rerun the normal-loading benchmarks against that final bake before
committing. If a check leads to another source change, bake again.
