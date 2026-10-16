# Scene loading measurements and next optimizations

> **Full-city numbers.** Every measurement in this file (60 s intro, 20 of 129 regions, 115.5 MiB bake, 7993 x 6137 roof grid) was taken on the whole 102_3d_piter city before it was cut down to the Nevsky strip. They are kept for the method and the reasoning. The strip has about 25 regions (23 city-base + about 25 street-surface region files), a bake of an estimated 50-75 MiB gzip in about 65-70 files and a roof grid of about 7.8k x 5.0k at 0.5 m; the real strip figures appear only after the first strip bake and are recorded in [STRIP.md](STRIP.md).

Measured 2026-10-04 on Edge headless, RTX 3090 Ti / ANGLE D3D11,
1280 × 720, a new browser profile per run. Full city, normal intro path,
including roof capture and the initial ten seconds of simulation. These are
individual observations, not a cross-device benchmark or a guaranteed speedup.

## Results

| Configuration | Intro ready |
| --- | ---: |
| Original, Medium, local Three.js, CPU profiler enabled | 67.48 s |
| Original, Medium, early shader compilation disabled, profiler enabled | 70.69 s |
| Indexed party walls, Medium, local Three.js, profiler enabled | 60.59 s |
| Indexed party walls, Medium, repeat through the new loading tool | 59.29 s |
| Indexed party walls, High, real CDN requests, no profiler | 60.55 s |

The like-for-like Medium comparisons save 6.89–8.19 s (10.2–12.1%). The original
screenshot path took about 63 s but skips roof capture and defaults to zero
simulation time; it is not a valid normal-loading benchmark.

The High run breaks down as follows (rounded; phases sum to ready time):

| Work | Time |
| --- | ---: |
| Page, dependencies and initial setup | 1.28 s |
| Font readiness | 0.28 s |
| Module work, including module import waits | 44.00 s |
| Early shader preparation | 2.30 s |
| Other module-loop waits | 0.24 s |
| Wire finalization and static batching | 2.45 s |
| Normal/depth proxy, matrix freeze and zones | 1.64 s |
| Final color shader compilation | 0.24 s |
| Roof capture | 1.48 s |
| Ten-second simulation initialization | 2.96 s |
| First frame, uploads and other render-pass shaders | 3.69 s |

The largest modules after the fix are streets (10.17 s), environment
(7.60 s), generic city (7.03 s), people (5.01 s), props (3.11 s) and traffic
(1.74 s). Quality High still builds the whole city; selecting Medium does
not remove its construction costs. The new Belinsky landmarks take 78 ms.

Useful deeper measurements from the High run:

- Environment: ground/distance field 4.41 s, tree preparation 1.53 s.
- Streets: textures/network/lane graph 2.65 s, sidewalks 2.59 s,
  paths/areas 1.20 s, signals 1.14 s.
- Generic city: details 4.29 s, walls 1.27 s, adjacency 0.85 s.
- People: routing graph 4.60 s of the module's 5.01 s.
- Roof grid is 7993 × 6137 at 0.78125 m resolution. It temporarily allocates
  a large readback buffer; removing it would break roof walking and saves
  only about 1.5 s here.
- Initial Three.js CDN request took 1.05 s. Local resource transfers were
  about 20 MB. Network improvements alone do not address the minute-long
  geometry construction.

## Implemented fix

Seven landmark house builders scanned all 64,823 eligible city edges for
each of three sample points on every facade. The CPU profile attributes
about eight seconds to these party-wall scans. An edge-start spatial grid
now retrieves only candidates inside the existing ±90 m rejection window.
Normal, distance, ownership and D's height-aware checks remain intact.
The indexed scans take 0.49 s in the comparable CPU profile.

`party-wall-test.mjs` compares 2,100 decisions across all seven builders with
the original full scan, with exposed/shared walls, custom tolerances,
ownership and height restrictions. Boundary fixtures cover negative cells,
the inclusive 90 m limit and long edges. The comparable browser runs retain
1,314 draw calls and 17,562,413 triangles at the initial Medium pose.

Disabling early shader preparation moved the shader wait to the end and
increased total time; retain it. Font waiting is also needed before baking
text into canvases. Moving heavy synchronous work to a Promise does not
make it parallel or reduce its CPU cost.

Validation also passed the layout check and full-scene Belinsky regression:
six walking crossings, both car directions, rail containment and landmark
claims. Normal High and Medium loading runs reported no module errors.

## Recommended next work

### Implemented: versioned shipping bake and regional geometry

`npm run bake` now generates gzip-compressed binary products under
`assets/baked`: ground fields, canvas street textures, street surface regions,
generic city regions, global collision/service measurements, the roof map,
and a primary pedestrian graph for each quality tier. `baked=0` retains the
procedural authoring path. A source hash covers all scene modules and the HTML;
the local server checks it against the manifest, so edits use the generators
until the products are rebuilt. Static hosting uses the generated revision.

Street and city visuals use 640 m regions. The loader first awaits a 700 m
buffer around the start camera, prefetches within 900 m while moving, and fills
remaining regions during idle time. Cheap footprint shells preserve distant
building silhouettes until their detailed region replaces them. Global road,
collision and routing services remain available before gameplay. Viewpoint
travel awaits its destination; movement pauses when the nearby regions have
not arrived. Screenshot mode awaits all regions for reproducible captures.
Failed region requests can be retried, and failed core products fall back to
their procedural builders. Hashed binary assets have immutable caching in the
development server; the manifest remains uncached.

Fresh Edge/D3D11 High runs at 1280×720, local Three, 10 s simulation: procedural
59.9 s versus baked 43.0–43.8 s to the ready intro (about 28% faster). The
initial scene awaits 20 of 129 regions. These are local measurements, not a
network SLA or an under-15-second result. The complete shipping bake is about
115.5 MiB compressed; specialist models, environment geometry, furniture,
traffic and crowds still build at startup. Further reducing those costs and
network payload is necessary for a much faster first visit.

Differential checks (`tools/baked-check.mjs`) pass all three quality tiers
(every node/edge, 20 routes, 1,000 field samples, destination and all-region
loading). Subfolder hosting is verified with
`node tools/shot.mjs --base /n4spb --load --q medium --out shots/load/subpath`,
which serves the repository under `/n4spb/` and loads the baked assets from there.

Run `node tools/baked-check.mjs high` (or medium/low) to compare hydrated
navigation, routes and field queries against the original generators and to
exercise destination loading and complete streaming. Run `npm run bake`
after changing scene sources and commit the generated revision and manifest
with their referenced files. The following recommendations record the
original investigation; the first three are now implemented as described above.

1. **Bake deterministic static products before shipping.** Start with the
   environment field (including distance transforms), street surface buffers
   and generic city geometry/sign atlases. Load typed arrays or region assets
   instead of repeating these generators on every visit. Ship versioned
   manifests alongside collision and service data; include claim sets,
   geometry parameters and quality in cache keys. Keep procedural builders
   available for authoring. The field, streets and city together account for
   roughly 25 seconds of current module work; this is the most valuable
   substantial next change, with savings to be measured after implementation.
2. **Make initial loading regional.** Load the station/Nevsky starting area
   and a surrounding buffer first, then nearby regions. Include cheap distant
   silhouettes immediately. Keep the global claims table so specialist
   buildings are not temporarily drawn twice. Split render batches as well
   as data; otherwise a full-city batch still requires all geometry up front.
   Collision/road services must precede each region's crowds and cars. View
   shortcuts and teleport destinations must await their region, and fast
   driving needs prefetch beyond the visible radius. This requires a lifecycle
   change, not just moving existing modules after the Start button.
3. **Bake routing data and reduce city-wide scans.** People navigation is
   almost entirely a 4.6 s graph build. Cache its static graph with the same
   street/bridge/claim version, then connect changing entrances at runtime.
   Use spatial queries for prop placement and city sign exclusion tests.
4. **Move remaining pure preparation into workers.** Field/graph/buffer work
   can use transferable arrays; scene objects, WebGL and DOM canvas text stay
   on the main thread. This improves responsiveness and permits real overlap,
   but does not by itself eliminate full-city work.
5. **Optimize GPU preparation after reducing static load.** The first frame
   costs 3.7 s and draws about 17.7 million triangles at High. Smaller spatial
   batches, distant LOD and regional uploads address both loading and frame
   time. Keep accurate roof capture, or make it regional with flight/landing
   behavior tested. Local dependency/font hosting and HTTP caching are useful
   followups, especially on slower networks, but have smaller measured impact.

A useful goal for regional loading is a playable start in under 15 seconds;
that is a target for the next architecture change, not an achieved result.

## Reproduce

Run from the repository root:

```sh
npm run load -- --q high --network --out shots/load/high-network
npm run load -- --q medium --profile --out shots/load/medium
npm run load -- --q medium --params "earlycompile=0" --out shots/load/noearly
npm run partywalls
```

The loading tool writes `<out>.load.json` and a screenshot of the ready intro.
`--profile` also writes `<out>.cpuprofile` for browser DevTools. The default
intercepts Three.js from local `node_modules` to isolate CPU/GPU work;
`--network` exercises the actual CDN. Do not run other CPU/GPU checks at the
same time as a timing comparison. Compare matching quality, camera, dimensions,
simulation time and profiling settings, ideally using several fresh runs.

`window.__stats.timing` exposes startup phases. `modulesMs` includes fonts,
module work, early compile and loop yields; do not add it to those components
again. `buildMs` spans the whole build before roof/simulation/warmup, whereas
`readyMs` is navigation-to-ready. Environment/street/city subphases are
durations; people phase timestamps are cumulative after `t0`.
