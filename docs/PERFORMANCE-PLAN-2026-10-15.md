# Performance plan, 2026-10-15: comfortable walking and driving

Goal set by the user: the old centre must be comfortable to walk and drive on this machine
(RTX 3090 Ti, Edge, D3D11, 1280 x 720, **medium** quality):

| Target | Value |
|---|---|
| Centre drive and centre walk, mean frame | **≤ 33.3 ms (≥ 30 FPS)** |
| p95 frame | **≤ 50 ms** |
| Frames > 300 ms | **none**, except an explicitly measured region load |
| Load to "intro ready" | well below the last 204 s (Oct 15 final); this plan aims at **≤ 120 s** |

This document is a plan, not a result. No source was edited. All numbers below come from
the commands listed in section 6, with their output paths. Read
[PERFORMANCE-CONTRACT.md](PERFORMANCE-CONTRACT.md) before implementing any item.

**Measurement caveat.** At the time of measurement the working tree contained uncommitted
metro-regression edits (`src/world/metro.js`, `src/world/metro/links-south.js`) that make
the source newer than the shipping bake `cd511f094f265dfbdfed`
(`bake-manifest-check` reports a stale manifest). These runs therefore use `?baked=force`,
like the regression agent's `metro-centre-after2` run. They are **diagnostic** profiles for
choosing work. They are not shipping evidence and must not be quoted as before/after
results. The instrumented runs wrap functions with `performance.now()` probes; this adds
well under 1 ms per frame but is still not a clean FPS run.

## 1. Where we are

| Run (centre, medium) | Load s | Mean ms | p50 | p95 | Max | Calls | Source |
|---|---:|---:|---:|---:|---:|---:|---|
| Oct 15 perf round, drive, normal loading | 203.7 | 57.1 | 52.3 | 70.9 | 822 | 2,757 | `shots/perf-oct15/after-centre.json` |
| Oct 15 perf round, walk, normal loading | 201.6 | 45.4 | 35.6 | 53.7 | 444 | 2,787 | `shots/perf-oct15/after-centre-walk.json` |
| Metro round baseline (`01db8635`), drive | 202.8 | 46.1 | 35.3 | 69.8 | 791 | 2,091 | `shots/perf/metro-centre-before.json` |
| Metro round, drive, normal loading | 279.1 | 228.4 | 70.3 | 864.7 | 947 | 2,802 | `shots/perf/metro-centre-after.log` |
| Metro fix in progress, drive, `baked=force` | 315.9 | 66.2 | 50.1 | 83.4 | 1,050 | 2,515 | `shots/perf/metro-centre-after2.log` |
| **This plan, drive, instrumented, `baked=force`** | 355.6 | 55.9 | 50.0 | 66.8 | 933 | 2,538 | `shots/perf/plan/plan-centre.json` (`drive`) |
| **This plan, walk, instrumented, `baked=force`** | (same load) | 52.1 | 50.0 | 50.1 | 517 | 2,971 | `shots/perf/plan/plan-centre.json` (`walk`) |

The metro round made loading **~75–150 s slower** (static batching 26 s → 95–128 s) and
the first post-metro drive stalled heavily. The regression agent owns that fix. The
steady-state frame of the in-progress tree is back near the Oct 15 level, so the profile
below is a valid map of the remaining work. Every phase of this plan must re-baseline
after the metro fix and its bake land (section 5, phase 0).

Distance to target on the centre drive: about **−23 ms mean**, **−17 ms p95**, and the
removal of four to six 330–930 ms frames per 20 s.

## 2. Where the frame goes

### 2.1 Centre drive and walk, per-frame CPU (instrumented, not profiled)

`frame` is the main `requestAnimationFrame` callback. "Outside" is the remainder of the
frame interval: garbage collection, region decode/attach tasks and browser work.

| Component, mean ms (p95) | Centre drive | Centre walk |
|---|---:|---:|
| Frame interval | 55.9 (66.8) | 52.1 (50.1) |
| Frame callback | 48.0 (54.0) | 49.4 (52.5) |
| — `pipeline.render` total | 26.8 (30.2) | 28.7 (30.3) |
| —— colour pass, including the sun shadow pass | 23.0 (26.9) | 25.4 (26.9) |
| ——— of which sun shadow pass | 2.2 | 2.2 |
| —— normal/depth (outline) pass | 2.7 | 2.2 |
| —— bloom and composite | 0.1 | 0.1 |
| — module updates (`ctx.onUpdate`) | 17.1 (22.3) | 16.2 (19.4) |
| — `LOD.update` | 2.7 | 3.0 |
| — zones, regions, time of day, physics refresh | < 0.3 | < 0.3 |
| Outside the callback | 7.9 | 2.7 |
| Draw calls, all passes | 2,538 | 2,971 |
| Colour-pass calls / triangles | 2,376 / 13.1 M | 2,804 / 14.1 M |
| Shadow-pass calls | 143 | 156 |
| Outline-pass calls | 153 | 158 |

Module updates, mean ms (p95), identified by their source:

| Update callback | Drive | Walk |
|---|---:|---:|
| People simulation, fixed-step loop (`world/people.js`) | 6.76 (8.7) | 8.00 (11.1) |
| Environment tree cone/LOD (`world/environment/trees.js`) | 2.30 (6.0) | 1.36 (3.8) |
| Traffic frame (`world/traffic.js`) | 2.24 (3.2) | 2.23 (2.5) |
| Wildlife parts (`world/wildlife.js`) | 1.30 (2.3) | 2.08 (2.1) |
| Player car (`world/drive.js`) | 1.21 (1.5) | — |
| Wreck physics step (`world/drive/wrecks.js`) | 1.00 (1.8) | 0.73 (1.1) |
| About 170 other callbacks together | ≈ 2.3 | ≈ 1.8 |

Physics queries are small: about 226 `surfaceAt` calls (0.42 ms), 32 `columnBlocked` calls
(0.42 ms) and 16 `querySolids` calls (0.16 ms) per driving frame.

The crowd has 2,954 agents; only 37–60 are drawn near the camera, in 49 instanced
draws per pass. Traffic had 58–94 moving vehicles. The people simulation is therefore
almost entirely spent on agents the player cannot see.

### 2.2 CPU profile attribution

Profiled repeats of the same routes (`--profile`-style sampling at 500 µs) were split by
`shots/perf/plan/profile-split.mjs`. Profiling inflates GC and update time; use the shares,
not the absolute milliseconds.

| Bucket, share of samples | Post-drive stationary (Oct 15) | Drive, profiled |
|---|---:|---:|
| Native WebGL/ANGLE command work ("(program)") | 55.0 % | 32.7 % |
| `pipeline.render` JavaScript | 29.4 % | 26.4 % |
| Garbage collector | 0.4 % | **21.4 %** |
| People | 4.7 % | 6.0 % |
| LOD.update | 2.4 % | 2.2 % |
| Environment | 0.1 % | 2.3 % |
| Traffic | 1.6 % | 2.2 % |

Inside rendering, the top three.js costs are `projectObject`, `multiplyMatrices`,
`renderBufferDirect`, `intersectsObject` and `setProgram`. The GPU timer query
(`EXT_disjoint_timer_query_webgl2`) reports 23.1 ms elapsed for the colour pass at the
drive endpoint, equal to its CPU submission time. Earlier passes showed that the frame
does not change with resolution. **The frame is bound by draw submission, not by pixels
or by scene traversal.** Each colour draw costs about **8–10 µs** of main-thread time.

### 2.3 Fixed cameras: passes and what-if upper bounds

`whatIf` renders 20 frames per variant with `__bench` in the live page, restoring every
toggle. Variants are diagnostic upper bounds, not proposed settings. Repeated fixed-camera
renders in one page vary by about ±1.5 ms, so single small deltas are noise.

| Pose (x, y, z) | Base ms / calls / tris | Colour ms (calls) | Shadow ms (calls) | Outline ms (calls) | Traversal only, per render |
|---|---|---|---|---|---:|
| Drive endpoint (139, 11) | 22.3 / 2,203 / 13.9 M | 19.6 (2,038) | 2.5 (158) | 2.0 (156) | 0.41 ms |
| Walk endpoint (442, 146) | 26.0 / 2,910 / 16.1 M | 23.2 (2,758) | 2.0 (141) | 1.8 (143) | 0.54 ms |
| Nevsky eye level (−63, 2.7, −4) | 27.0 / 3,063 / 16.3 M | 23.9 (2,871) | 2.2 (156) | 2.0 (183) | 0.46 ms |
| Nevsky eye level (−153, 2.4, −26) | 30.8 / 2,819 / 15.4 M | 27.3 (2,632) | 2.7 (158) | 2.4 (178) | 0.60 ms |
| Aerial over the Moika (−1200, 60, −200) | 20.2 / 2,115 / 12.2 M | 16.7 (1,891) | 2.0 (175) | 2.4 (215) | 0.47 ms |

Savings from each what-if (ms / calls):

| What-if | Drive end | Walk end | Nevsky (−63) | Nevsky (−153) | Aerial |
|---|---|---|---|---|---|
| Camera far 3,000 m (from 7,000) | −4.5 / −691 | −7.6 / −1,156 | −7.0 / −1,082 | −8.2 / −989 | −1.7 / −264 |
| Camera far 1,500 m | −7.2 / −1,011 | −11.6 / −1,699 | −10.1 / −1,618 | −11.8 / −1,466 | −4.4 / −673 |
| Camera far 800 m | **−9.8 / −1,297** | **−14.3 / −2,076** | **−13.7 / −2,037** | **−15.2 / −1,809** | −6.7 / −1,013 |
| No shadow-map pass | −2.8 / −158 | −2.4 / −141 | −2.1 / −156 | −1.8 / −158 | −2.0 / −175 |
| Outline range 150 → 100 m | −1.1 / −9 | +0.3 / −7 | −0.1 / −10 | 0 / −4 | −0.6 / −12 |
| Hide all static sector pieces (colour) | −9.7 / −802 | −11.9 / −1,189 | −11.2 / −1,135 | −13.1 / −1,052 | −6.6 / −503 |
| Hide landmark boats (`landmarksC-boats`) | −1.6 / −59 | −1.5 / −133 | −1.5 / −133 | +1.4 (noise) / −80 | −1.1 / −51 |
| Hide birds (`wildlife-birds`) | −1.5 / −30 | 0 / −30 | −0.7 / −30 | −4.0 / −30 | 0 / −30 |
| Hide the player car (`drive-car`) | −2.0 / −28 | −0.3 / −28 | −1.0 / −28 | −3.7 / −28 | +0.5 (noise) / −29 |
| Hide embankment boats (`env-boats-dyn`) | −0.9 / −18 | −0.5 / −18 | −0.4 / −18 | −1.7 / −18 | −0.3 / −18 |

Conclusions:

* **Everything beyond 800 m costs 10–15 ms and 1,300–2,100 colour calls at street level,
  about half of the render.** Even the band beyond 3 km costs 4.5–8 ms and 700–1,150 calls,
  for geometry a few pixels tall. This is the largest single render target.
* The colour-pass triangle scan attributes 4.2–5.7 M triangles to far proxies (about 40 %
  of colour triangles), 0.44 M to the city-wide `wires` mesh (one uncullable call,
  8.8 km radius) and 0.27–0.32 M to unloaded-region silhouettes. Triangles are cheap on
  this GPU, but they dominate weaker GPUs; the call count is what limits this machine.
* The shadow pass (about 2–2.8 ms) and the outline pass (about 2 ms) are already small.
  Shrinking them further cannot reach the target by itself.
* Scene traversal with every layer rejected costs only 0.4–0.6 ms per render: the sector
  grouping already removed the 30 k-object traversal problem. About 73 k objects exist
  and 4.3–4.7 k are visible after LOD.
* Moving dynamic objects are expensive per call. Landmark boats use 51–133 calls, birds
  30, the player car 28. Together they cost about 1–8 ms depending on the view.

The three "Nevsky eye level" poses are where the in-page camera actually stood (it drifted
west from the requested views). Fixed-camera results at the exact historic poses from
`node tools/shot.mjs --bench 20` are in section 2.7.

### 2.4 Hitches

Frames over 300 ms in the instrumented 20-second runs: drive 933, 333, 450, 400, 850 ms;
walk 383, 433, 334, 517, 450, 383, 384, 433 ms. Two mechanisms were found.

1. **Major garbage collection of a 2.47 GB JavaScript heap** (CDP `usedSize` 2,469,767,752
   bytes; backing storage 3,072,618,262 bytes). Each mark-compact pause costs about
   **750–800 ms** in the profiled runs. It is triggered by whatever allocates at the time.
   `shots/perf/plan/gc-neighbours.mjs` attributes the GC runs ≥ 20 ms to the preceding
   JavaScript:

   | Preceding code | GC in profiled drive | GC in profiled fast drive* |
   |---|---:|---:|
   | Region attach: outline-proxy build (`ndproxy.js` `emit`, `binTriangles`) | 761 ms (14 runs) | 923 ms (4 runs) |
   | `environment/trees.js` `assign` (tree LOD membership) | 546 ms (9 runs) | 543 ms (10 runs) |
   | Landmark tree `repack` (19 copied modules, on every 4 m of player movement) | 35 ms | 502 ms |
   | `environment/tree-instances.js` `mark`/`flush` | — | 439 ms |
   | `environment/lawns.js` `repack` → `field.roadDist` | 191 ms | — |
   | `LOD.update`, minimap `draw`, audio `playSrc`, people `sim.update`, physics, wildlife | 90–229 ms single runs | 744–800 ms single runs |

   *The second profiled segment was meant to walk, but the car could not be exited at
   150 km/h, so it is a second fast drive (`walkProfiled` in `plan-centre.json`).
2. **Region attach on the main thread.** `city-base-0_-3` (37 meshes, 185 k vertices)
   took **760 ms** inside `ctx.onRegionAttach`, which builds outline proxies for the region
   with per-vertex JavaScript. The metro round's first run showed three such attaches of
   789–880 ms. Most attaches take 2–45 ms.

The walk run's 330–450 ms frames fall inside the update callbacks, which is where an
allocation-triggered collection lands. Section 2.6 repeats the walk on a fresh load; the
mechanism there is consistent with collections but not yet proven.

### 2.5 Loading

| Phase, s | Oct 15 final | Metro, normal loading | This plan (`baked=force`) |
|---|---:|---:|---:|
| Modules | 77.7 | 77.8 | 106.2 |
| Static batching | 26.3 | **95.2** | **127.5** |
| Finalize (outline proxies and more) | 75.7 | 81.3 | 96.7 |
| Start simulation | 8.8 | 9.6 | 9.9 |
| First frame + upload | 9.8 | — | 9.6 |
| Intro ready | 203.5 | 279.1 | 355.6 |

The outline proxies alone took **65.8 s** at the Oct 15 load and hold **20.75 M triangles in
29,295 meshes (676 MB)** for the whole city. The outline pass draws only about
**2.1–2.9 M** of those triangles, all within 150 m at medium quality. The largest modules
are `environment` (21–26 s), `streets` (10–14 s), `people` (6–9 s), `props` (5.5–8 s) and
`traffic` (3.5–5.5 s). The module times in this plan's run are about 30 % higher than the
regression agent's run, which suggests background CPU load during startup. Compare
phases rather than totals.

### 2.6 Walk profile and draw calls by distance

A second, walk-only load (`plan-walk.json`, intro ready after 290.6 s) repeated the centre
walk without driving first, then profiled a 15-second walk and audited the colour calls.

| Centre walk, second load | Mean ms (p95, max) |
|---|---|
| Frame interval | 60.2 (66.8, 767) |
| Frame callback | 55.7 |
| Render: colour incl. shadow / shadow / outline | 26.7 / 2.1 / 2.0 |
| Module updates | 20.7 |
| People loop, mean / p95 / max | 10.2 / 10.7 / 255 |
| Wildlife parts, mean / max | 3.8 / 145 |
| Traffic frame, mean / max | 3.0 / 36 |
| Environment tree cone, mean / max | 1.3 / 342 |
| `LOD.update` | 3.1 |

This walk had **13 frames over 300 ms in 20 s** (350–767 ms), in pairs: a 335–460 ms
frame callback, with the spike inside the tree cone, people or wildlife update, followed
by a further 380–415 ms pause outside the callback with no region attach. The profiled
walk spends 14.9 % of samples in 341 collections, most of them short. These spikes
match allocation-triggered collections over the large heap, but the cause is not yet
proven. Item 2 starts with that proof: a GC trace or allocation-sampling run that
separates scavenges from mark-compact pauses during the walk.

**Colour draw calls by distance** (`callsByBand`, same visibility rules as
`tools/perf-scan-page.js`):

| Band | Walk end (462, 151): calls / triangles | Aerial over the Moika: calls / triangles |
|---|---|---|
| ≤ 200 m | 139 / 1.53 M | 158 / 1.44 M |
| 200–800 m | 304 / 3.68 M | 226 / 1.00 M |
| 800–1,500 m | 312 / 1.12 M | 345 / 3.94 M |
| 1,500–3,000 m | 476 / 2.87 M | 597 / 1.33 M |
| **> 3,000 m** | **1,315 / 3.97 M** | 353 / 0.36 M |
| Total | 2,546 / 13.2 M | 1,679 / 8.1 M |

At street level, **more than half of all colour calls are beyond 3 km**. In that band:

| Family beyond 3 km (walk end) | Calls | Triangles |
|---|---:|---:|
| Unnamed static sector pieces (`sectors`) | **449** | 167 k (≈ 370 each) |
| Far proxies | 237 | 2.87 M |
| Ground cells (`env-ground`) | 128 | 178 k |
| Unloaded-region silhouettes | 86 | 254 k |
| Pond water pieces | 21 | 1.5 k |
| Bridge rail pieces (`brg-rail-*`) | about 45 | 3 k |
| Landmark boats | 12 | 1.5 k |

Detail pieces of about 370 triangles should never draw at 3 km, so their ranges need an
audit. In `batch2.js`, an L-class piece (large, or lifted by the skyline rule) gets an
infinite range, and only pieces whose material passes `farOK` (opaque toon, surface, no
zone) are replaced by the sector's far proxy beyond `FAR_SWITCH`. The other L pieces
therefore draw at every distance. Further candidates are the 483 "skyline-lifted" pieces
in `__stats.batch.skylineLifted`, whose sample includes paving (`pt-cobble`, `pt-slab`,
`pt-steps`) as well as towers, and region meshes without a baked LOD record, which
`region-streamer.js` registers with an infinite range. Loaded regions are never evicted,
so a long drive accumulates them. The first task of item 1a is to list the 449 pieces by
source name, material and reason; this plan did not separate those three causes. Moving landmark boats draw 85 calls at 800–1,500 m. The parked red car still
draws 19 calls at 1.5–3 km in the aerial view, because all of its meshes have
`frustumCulled = false` (`world/drive/model.js`).

### 2.7 Fixed-camera benchmark at historic poses (`shot.mjs --bench 20`)

`shot.mjs` renders a still scene at simulation time 0 (no stepping), so these are render-only
figures. The Oct 7 "after" column is the same command on a much smaller city and an older
renderer; it is context, not a comparison.

| Pose | Oct 7 after: ms / calls / triangles | Now: ms / calls / triangles |
|---|---|---|
| `hero` (Vosstaniya Square) | 34.0 / 1,659 / 4.3 M | 14.5 / 1,566 / 5.6 M |
| `v3` (Nevsky eye level, long view) | 52.6 / 3,227 / 11.3 M | **35.9 / 4,103 / 19.9 M** |
| Anichkov Bridge pavement `-430,3.4,-70,-100,-8` | 42.6 / 2,333 / 6.2 M | 18.3 / 1,921 / 7.4 M |
| Moika aerial `-1200,60,-200,-140,-20` | 41.9 / 2,012 / 6.4 M | 23.9 / 2,584 / 13.4 M |

**The Nevsky long view alone renders in 35.9 ms with 4,103 calls**, above the 33.3 ms
budget before any simulation runs. It is the acceptance view for item 1.

### 2.8 Memory and textures

* 369 M canvas pixels were painted (`ctx.tex.pixels`): about 1.48 GB of RGBA canvas
  backing store. `CanvasTexture`s keep their canvas after upload; nothing in
  `core/textures.js` releases them. Static batching (`batch2.js` atlases and far-proxy
  mean colours) and the roof capture read some canvases after creation, so a release
  must happen after finalize and the upload frame.
* 586 textures and 34.7 k geometries are resident; 1,176 MB of static CPU copies are
  already released after upload.
* The metro module alone paints 30.9 M canvas pixels (`check.mjs metro`). The batching
  slowdown after the metro round is the first suspect for canvas atlas work and must be
  confirmed with `drive-bench --startup-phases` (`[batch-phase] atlas-start/atlas-complete`).

## 3. Ranked optimisations

Gains are estimates for the **centre drive mean frame** unless stated, derived from the
measurements above. Upper bounds come from the what-if table; expected gains assume a
safe implementation keeps 40–60 % of an upper bound. They do not add up linearly.

| # | Item | Measured basis | Expected gain | Risk | Owner subsystem | Verification |
|---:|---|---|---|---|---|---|
| 1a | **Range audit of small pieces drawn beyond 3 km**: L pieces that cannot join a far proxy get a far proxy of their own or a finite range; skyline lifting limited to real tall silhouettes; region meshes without a baked LOD get a size-based range instead of infinity; bridge rails and pond pieces get ranges | 449 sector pieces (≈ 370 triangles each), about 45 rail and 21 pond pieces beyond 3 km at the walk end | **−3 to −4.5 ms** (about −450 calls at 8–10 µs) | Low–medium: real spires, domes and towers must stay lifted | `core/batch2.js` skyline lifting, `core/region-streamer.js` default range, `core/spatial.js` | `callsByBand` calls beyond 3 km below 300; skyline cams plus `png-diff`; `authored-lod-test`, `lod-range-test` |
| 1b | **Far super-cells beyond ~1.5 km**: one merged, decimated mesh per km super-cell for far proxies, ground cells and silhouettes, preserving roof profiles and lifted landmarks | Beyond 1.5 km: 288 far-proxy, 149 ground and 105 silhouette calls; far proxies carry 4.2–5.7 M colour triangles; camera far 1,500 m saves 7–12 ms in total | **−3 to −5 ms** on top of 1a; −3 to −4 M triangles | Medium–high: skyline, popping, outline/shadow parity | `core/batch2.js` far proxies, `core/lod.js`, `world/environment` ground | `whatIf` camera-far rows; `v3` Nevsky long view ≤ 25 ms; skyline cams plus `png-diff`; `authored-lod-test`, `lod-range-test`, `shadow-sector-test` |
| 2 | **Allocation-free per-frame updates** to stop major-GC hitches: tree LOD `assign`, persistent landmark tree repacks behind one shared distance-gated scheduler, lawns repack, `LOD.update`, minimap draw | 750–800 ms mark-compact pauses; tree code precedes 1.0–1.5 s of GC per profiled 12 s | **Removes most 330–930 ms frames**; −2 to −4 ms mean | Low–medium | `world/environment` (trees, tree-instances, lawns), `world/lib` shared tree helper, `core/lod.js`, `core/minimap.js` | `drive-bench --diagnostics` frames > 300 ms; profiled run + `gc-neighbours.mjs`; separate allocation sampling; `tree-bucket-test`, `landmark-tree-bounds-test` |
| 3 | **People far-agent scheduling**: persistent phase lists, distance-bounded scheduling of whole leader/follower groups, coarser far steps | 6.8–8.0 ms mean (p95 8.7–11.1) for 2,954 agents with 37–60 drawn | **−3 to −5 ms** | Medium: seeded replay, group cohesion, crossings, signals | `world/people.js`, `world/people/sim.js` | People, fence, cover and crosswalk regressions; exact seeded-replay check; `plan-bench` update table; centre and island walks |
| 4 | **Outline proxies built only where they are drawn**: per-sector lazy build within the outline range plus margin, time-sliced, or baked into region products | 65.8 s and 676 MB at startup for 20.75 M triangles, of which 2.1–2.9 M are ever drawn; 760 ms region attach; proxy allocation precedes 0.8–0.9 s of GC | **Load −50 to −60 s**, heap/backing −0.5 GB, attach hitch < 50 ms | Medium: outline parity, zone tags, authored ranges | `core/ndproxy.js`, `main.js` finalize, `core/region-streamer.js` | `ndproxy-lifetime-test`, `renderer-pass-test`, outline golden digest, `authored-lod-test`; attach list in `drive-bench`; load phases |
| 5 | **Metro batching regression**: exclude huge/underground canvases from batch atlases or bake them | Batching 26 s → 95–128 s after the metro round | **Load −70 to −100 s** | Low–medium | `core/batch2.js` atlas eligibility, `world/metro` canvases (coordinate with the regression agent) | `drive-bench --startup-phases`; batch phases; underground screenshots |
| 6 | **Dynamic draw consolidation and culling**: distance-cull landmark boats (85 calls at 0.8–1.5 km), give the red car a bounding sphere instead of `frustumCulled = false`, instanced boat hull kinds, birds, embankment boats | 3–8 ms and 125–220 calls depending on view | **−2 to −3 ms** | Low–medium: moving objects must stay out of the static sector registry | `world/landmarksC` boats, `world/wildlife`, `world/drive` model, `world/environment/boats.js` | `whatIf` hide rows; boat/bird/car screenshots; `drive-test --nofuzz` |
| 7 | **Near static colour pieces**: texture arrays/atlases for repeat-textured street materials, vertex paint/grime instead of material variants, fewer material splits per cell | Static sector pieces cost 9.7–13.1 ms and 800–1,190 calls; part overlaps item 1 | **−1.5 to −3 ms** | Medium: material look, UV wrap | `core/batch2.js`, `core/materials.js`, streets materials | `png-diff` at street cams; `static-merge-test`, `fixture-cells-test`, `compact-static-test` |
| 8 | **Environment tree cone update** made incremental | 2.3 ms mean, p95 6.0 ms while driving | **−1 to −1.5 ms** | Low | `world/environment/trees.js`, `landmarksSmolensky/forest.js` | `tree-bucket-test`; skyline/tree screenshots |
| 9 | **Shadow pass scope**: no shadows from small far casters and distant dynamic objects; keep map size and cascade | 1.8–2.8 ms, 141–175 calls | **−0.5 to −1 ms** | Low | `core/renderer.js`, LOD shadow policy | `shadow-sector-test`, `renderer-pass-test`, shadow screenshots |
| 10 | **Release canvases after upload** (after finalize, roof capture and the upload frame), with a regeneration path for context loss | 369 M canvas pixels ≈ 1.48 GB | Memory −1 to −1.4 GB; no FPS claim | Medium: re-upload paths, roof capture, atlas readers | `core/textures.js`, `main.js` upload frame | Memory before/after; context-loss smoke; texture screenshots |
| 11 | **Wires split by cell with frustum culling and a distance cap** | One uncullable 440 k-triangle transparent call | GPU-side only, about 0 ms here; helps weaker GPUs | Low | `core/geo.js` wires | Wire screenshots near and far; `npm run roads` |
| 12 | **Module build budget**: bake or defer the slowest generators (`environment`, `streets`, `props`) | 77–106 s of modules | Load −20 to −40 s | High: claims, colliders, services consumed at startup | Per module owners | Contract "Loading and baked products"; bake regressions |

Not recommended now:

* **Outline range reduction**: 150 → 100 m saves at most about 1 ms and costs visible
  outline coverage.
* **Shadow map size or cascade distance changes**: the shadow pass is CPU-bound by its
  calls, not by map resolution.
* **More traversal work**: traversal is 0.4–0.6 ms per render.
* **Physics or collider queries while driving**: about 1 ms per frame in total.
* **Merging far proxies into a `BatchedMesh` without reducing geometry**: rejected on
  2026-10-11 for 274 MB of copies with an inconsistent gain. Item 1 differs because it
  reduces both calls and vertices and replaces whole distance bands.

Projected outcome, adding expected gains with no overlap credit and counting items 1a and
1b as −6 to −9.5 ms together: items 1–3, 6 and 8 take the centre drive from about 56 ms to
roughly 33–42 ms; adding items 7 and 9 gives about 29–40 ms. The walk (52 ms instrumented) lands at about 32–40 ms, because its far-field and
people shares are larger. GC frames over 300 ms should disappear with items 2 and 4.
**Reaching ≤ 33 ms needs most of the far-field gain (items 1a and 1b, ≥ 7 ms together).** If it
falls short, the next lever is a shorter default far distance at medium quality, which is
a visual change and needs the user's approval. Items 4 and 5 should take normal loading
from the metro round's 279 s to roughly 120–160 s; the ≤ 120 s aim also needs item 12.

## 4. Measurement protocol for every phase

1. **One GPU job at a time.** Before any browser run, confirm that no other
   `drive-bench`, `shot.mjs`, `islands-check` or bake process is running.
2. **Frozen baseline.** Each phase starts from a committed source+bake snapshot and keeps
   a frozen copy for its "before" run, as the contract requires.
3. **Timed FPS runs** (no profiler, no mid-run shots, no `baked=force` for final evidence):

   ```powershell
   node tools/drive-bench.mjs --q medium --seconds 20 --start "498.2286,135.1625,76.0322" --json --diagnostics --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/<phase>/centre-drive
   node tools/drive-bench.mjs --q medium --seconds 20 --start "501.2759,160.9113,76.0322" --walk --json --diagnostics --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/<phase>/centre-walk
   node tools/drive-bench.mjs --q medium --seconds 20 --start "-3985.131825,-1247.700307,120.170520" --json --diagnostics --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/<phase>/vo-drive
   ```

   Report load, mean/p50/p95/max, frames > 80 ms and > 300 ms, calls, distance and the
   attach list, as the contract requires. Repeat a route when traffic changes its path.
4. **Diagnostics** (separate runs, labelled): the frame probe for per-component
   attribution and what-if bounds, and profiled segments for GC and update attribution:

   ```powershell
   node shots/perf/plan/plan-bench.mjs --q medium --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/<phase>/probe
   node shots/perf/plan/profile-split.mjs shots/perf/<phase>/probe-driveProfiled.cpuprofile
   node shots/perf/plan/gc-neighbours.mjs shots/perf/<phase>/probe-driveProfiled.cpuprofile
   node tools/shot.mjs --q medium --cams "hero;v3;-430,3.4,-70,-100,-8;-1200,60,-200,-140,-20" --bench 20 --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/<phase>/cams
   node tools/drive-bench.mjs --q medium --seconds 20 --start "498.2286,135.1625,76.0322" --startup-phases --json --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/<phase>/startup
   ```

   Add `--params "baked=force"` only while source and bake are known to be compatible and
   label such runs as diagnostic. The probe and helper scripts live in `shots/perf/plan/`
   and change nothing in `src/`.
5. **Visual parity** at the street, skyline and aerial cameras with `png-diff`, plus
   camera turns toward the dense centre skyline. Items 1, 7 and 9 change pixels by design
   at distance; review the images, not only the numbers.
6. **Focused regressions** for each touched system (named in section 3), then
   `npm run roads` and `npm run markings` if streets, wires or ground surfaces change.
7. **Final bake** once after the last source edit of a checkpoint, `bake-manifest-check`,
   then the timed runs again with normal loading before the commit.

## 5. Phased schedule for parallel agents

One owner per subsystem and per file. Agents edit only their files; the main agent
merges, bakes and commits. GPU runs are serialised through the main agent's queue.
CPU-only regressions may run in parallel, but never during a timed load or drive.

| Phase | Agent | Owns | Work | Exit criterion |
|---|---|---|---|---|
| 0 | perf-baseline (main) | `shots/perf/phase0/` | Wait for the metro fix and its bake. Run section 4 steps 3–4 with normal loading. Freeze source+bake. | Clean baseline table; the metro load regression resolved or assigned (item 5) |
| 1 (parallel) | far-lod | `core/batch2.js` far proxies and skyline lifting, `core/lod.js` far bands, `core/region-streamer.js` default range | Item 1a first as its own checkpoint, then 1b | Calls beyond 3 km below 300 at the walk end; `v3` ≤ 25 ms; skyline images approved |
| 1 (parallel) | gc-updates | `world/environment/trees.js`, `tree-instances.js`, `lawns.js`, `world/lib` tree helper, landmark `trees.js` copies via the shared helper | Item 2 and item 8 | No GC run ≥ 300 ms attributed to these files; tree regressions pass |
| 1 (parallel) | people-sched | `world/people.js`, `world/people/sim.js` | Item 3 | People update ≤ 3 ms mean at the centre; replay and crowd regressions pass |
| 1 (parallel) | outline-lazy | `core/ndproxy.js`, `core/region-streamer.js` attach, outline hooks in `main.js` | Item 4 | Finalize ≤ 20 s; attach ≤ 50 ms; outline golden digest unchanged |
| 1 (parallel) | load-batch | `core/batch2.js` atlas eligibility only (coordinate the file with far-lod: separate functions, one merge owner) | Item 5 | Batching ≤ 30 s |
| 2 (parallel) | dyn-draws | landmark boats, `world/wildlife`, `world/drive` model, `environment/boats.js` | Item 6 | −100 calls in the walk and Nevsky cams; car drive test passes |
| 2 (parallel) | static-near | `core/materials.js`, streets materials, near-piece batching | Items 7 and 11 | −300 colour calls at street cams, pixel review approved |
| 2 (parallel) | shadow-scope | `core/renderer.js` shadow policy | Item 9 | Shadow pass ≤ 1.5 ms; shadow screenshots approved |
| 2 (parallel) | memory | `core/textures.js` release path | Item 10 | Canvas backing −1 GB; no texture loss after context restore |
| 3 | main | integration | Merge, focused regressions, roads/markings, bake, section 4 timed runs on centre, Vasilievsky and Krestovsky, `PERFORMANCE.md` entry | Targets met or the remaining gap and next bottleneck documented |
| 4 (optional) | load-modules | per-module owners | Item 12 | Modules ≤ 50 s |

Phase 1 agents start from the same frozen baseline. Each delivers a probe run and a timed
run on its own change against that baseline, then hands its diff to the main agent.
The main agent integrates phase 1 before phase 2 begins, re-baselines, and repeats.
Item 1 and item 5 share `core/batch2.js`: the far-lod agent owns that file, and the
load-batch agent supplies its atlas change as a patch for that owner to apply.

## 6. Commands run for this plan and their outputs

All outputs are under `shots/perf/plan/` (local, ignored) unless noted. GPU jobs ran
serially after the regression agent's `metro-centre-after2.log` reported its frame times.

```sh
# Instrumented diagnostic run: drive 20 s, walk 20 s, profiled drive/walk repeats, what-ifs at the endpoints and four cams
node shots/perf/plan/plan-bench.mjs --q medium --params "baked=force" --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/plan/plan-centre
#   -> plan-centre.json, plan-centre.log, plan-centre-{drive,walk,driveProfiled,walkProfiled}_end.png,
#      plan-centre-driveProfiled.cpuprofile, plan-centre-walkProfiled.cpuprofile, plan-centre-cam-*.png
node shots/perf/plan/profile-split.mjs shots/perf/plan/plan-centre-driveProfiled.cpuprofile
node shots/perf/plan/gc-neighbours.mjs shots/perf/plan/plan-centre-driveProfiled.cpuprofile
node shots/perf/plan/profile-split.mjs shots/perf-oct15/after-centre.post.cpuprofile
# Walk-only diagnostic run with a profiled walk and the calls-by-distance audit
node shots/perf/plan/plan-bench.mjs --walk-only 1 --q medium --params "baked=force" --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/plan/plan-walk
#   -> plan-walk.json (walk, walkProfiled, callsByBand), plan-walk.log, plan-walk-walkProfiled.cpuprofile, plan-walk-*_end.png
node shots/perf/plan/profile-split.mjs shots/perf/plan/plan-walk-walkProfiled.cpuprofile
node shots/perf/plan/gc-neighbours.mjs shots/perf/plan/plan-walk-walkProfiled.cpuprofile
# Fixed cameras at historic poses
node tools/shot.mjs --q medium --cams "hero;v3;-430,3.4,-70,-100,-8;-1200,60,-200,-140,-20" --bench 20 --params "baked=force" --load-timeout 900000 --protocol-timeout 900000 --out shots/perf/plan/shot-bench
#   -> shot-bench.log, shot-bench_0..3.png
node tools/bake-manifest-check.mjs     # reported the stale manifest described at the top
```

Reused inputs: `shots/perf-oct15/after-centre.json` (diagnostics, load phases, outline
proxy statistics), `shots/perf-oct15/after-centre-walk.json`,
`shots/perf/metro-centre-before.json`, `metro-centre-after.{json,log}` and
`metro-centre-after2.{json,log}`.

The probe (`frame-probe.js`) wraps the main frame callback, `LOD.update`, every
`ctx.onUpdate` callback, zones, regions, time of day, physics queries, `pipeline.render`,
each `renderer.render` call (labelled by render target) and the shadow-map render.
`whatIf` toggles `pipeline.skipShadows`, `pipeline.ndFar`, `camera.far`, the static
sector root and each dynamic root, then restores them. `gpuPasses` uses
`EXT_disjoint_timer_query_webgl2`.
