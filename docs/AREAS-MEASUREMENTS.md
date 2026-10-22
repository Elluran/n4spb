# Area measurements

Numbers behind docs/AREAS.md. Protocol (docs/AREAS.md section 10): headless Edge 155 (D3D11, RTX 3090 Ti), 1280 x 720, local `tools/` server without compression, a fresh browser profile per run,
three runs per cell (the median is quoted, the range in brackets), ONE GPU job at a time. Heap figures come in three kinds, and they are NOT interchangeable:

* **`performance.memory`** (what `shot --load` / `drive-bench` print): the JS heap *including garbage that has not been collected yet*. It excludes ArrayBuffer backing stores and the GPU.
* **post-GC JS heap**: CDP `HeapProfiler.collectGarbage` x2, then `Runtime.getHeapUsage`: only what is really alive in the V8 heap.
* **process-tree private bytes**: renderer(s) + GPU process + network / utility processes of the browser (`tools/nav-memory-probe.mjs`, Windows). This is what a phone's memory killer sees.

## M0 baseline of the unmodified strip (revision `ce34abb827bd5e446847`, 2026-10-21)

Raw files: `shots/areas-baseline/` (not committed): load-*.load.json, drive-* / walk-* logs, nav-memory-*.json, the 31 VIEWS screenshots, signatures, `baked-products.json` (sha256 of the 66 products).

### Cold start (`shot --load`, ready = the intro is ready, i.e. what a hop costs before the Continue tap)

| tier | ready (ms) | build | of which modules | batch | finalize + compile | first frame | simulation |
|---|---:|---:|---:|---:|---:|---:|---:|
| medium | 24 071 (23 914-24 247) | 19 555 | 15 140 | 2 856 | 866 + 693 | 2 342 | 1 228 |
| performance | 23 564 (23 497-23 696) | 19 341 | 14 988 | 2 742 | 875 + 697 | 2 273 | 905 |

About 80 % is single-thread CPU (modules + batching), so a prefetch can hide only the network share. After a navigation the same page loads in 22.2-23.1 s (warm HTTP cache).

### Memory

| what | medium | performance |
|---|---:|---:|
| `performance.memory` at ready | 1 599 MB (1 586-1 602) | 1 570 MB (1 568-1 588) |
| `performance.memory` after 20 s of walking / driving | 1 750 / 1 782 MB | 1 738 / 1 777 MB |
| post-GC JS heap | **318 MB** (323 MB total) | 316 MB (321 MB total) |
| process-tree private bytes, at rest | **4 744-4 871 MB** | 4 586-4 736 MB |

The strip's real footprint is its process tree: **~4.7 GB, about 15 times the live JS heap** (typed arrays of the field / nav / region products and the GPU buffers live outside the JS heap).
The figures in docs/STRIP.md ("JS heap 1.16 GB") are `performance.memory` readings and understate it.

### Does a navigation free a scene? (`tools/nav-memory-probe.mjs`, `location.replace` to the same page)

| run | hop 0 | hop 1 | hop 2 | hop 3 | trend |
|---|---:|---:|---:|---:|---|
| medium x4: ready (ms) | 25 955 | 22 348 | 23 138 | 22 448 | none |
| medium x4: post-GC heap (MB) | 318 | 318 | 319 | 318 | +0.1 MB / hop |
| medium x4: tree at rest (MB) | 4 871 | 4 762 | 4 854 | 4 744 | -29 MB / hop |
| medium x4: tree PEAK while the next page loads (MB) | 4 878 | 5 129 | **6 446** | 5 111 | |
| performance x3: tree at rest (MB) | 4 601 | 4 736 | 4 586 | | -7.5 MB / hop |
| performance x3: tree peak (MB) | 5 191 | 5 463 | 5 008 | | |

* **Yes: the memory of the page that is left is gone** (flat at rest over the hops, no error, ready times equal or faster). The split removes *accumulation*; it does not lower the per-scene floor.
* **The transition peak is 5.0-6.4 GB** (up to 1.3 x the resting figure): the old renderer lives on until the new page commits. That is the number a phone has to survive; M9 measures it on real devices.
* `location.assign` x3 (medium): the tree stays 4.7-4.8 GB (no stacking in headless Edge), `history.length` grows 2 -> 4; going back is possible but the page is reloaded (the probe cannot tell a bfcache
  restore from a reload). `replace` keeps ONE history entry, so a page that holds gigabytes can never be restored from the back/forward cache: the decision stands.

### Frame cost at four poses (`shot --load --bench 40`, ms per frame, draw calls, triangles)

| pose | medium ms | calls | triangles | performance ms | calls | triangles |
|---|---:|---:|---:|---:|---:|---:|
| hero (Vosstaniya Square) | 12.3 | 1 273 | 2.33 M | 11.3 | 1 164 | 2.17 M |
| Nevsky (502, 158) | 11.9 | 1 271 | 4.43 M | 10.0 | 1 002 | 4.04 M |
| Palace Square | 8.4 | 824 | 3.38 M | 8.5 | 739 | 3.05 M |
| Admiralty / Alexander Garden | 9.2 | 1 027 | 3.73 M | 7.9 | 893 | 3.33 M |

### Playing (`drive-bench`, 20 s, headless 1280 x 720; the display is vsync limited)

| tier | walk mean ms / p95 / fps | drive mean ms / p95 / fps | draw calls walk / drive |
|---|---|---|---|
| medium | 20.2 / 33.4 / 50 | 21.4 / 33.4 / 47 | 1 330 / 1 362 |
| performance | 16.8 / 16.8 / 59 | 18.4 / 33.3 / 54 | 1 064 / 1 118 |

(The earlier "52 fps walking, 57 driving at medium" of docs/STRIP.md was another window state; use these numbers as the baseline for the comparisons below.)

### What the area seam must not change (M1 oracle)

`tools/golden/layout-strip.json` (CPU, every export of layout.js and the data facade), `streets-signature.json`, `city-signature.json`, the 66 product hashes, the 31 VIEWS screenshots,
`npm run check` and `views-check` logs. After M1: golden, signatures and `check` counts identical; a scratch bake of the new source compared with `tools/bake-product-compare.mjs`.

## M3: the generic North (scratch bake of revision `7657797864a16b075b89`, 2026-10-21)

Same protocol as above (headless Edge 155, D3D11, RTX 3090 Ti, 1280 x 720, real bake served by the local `tools/` server, ONE GPU job at a time). The bake is a scratch bake of the worktree
(`BAKE_VERBOSE=1 node tools/bake-scene.mjs --area all`), not committed; a copy is kept outside the repository. Raw files: `shots/areas/` (not committed): `hop-test.json`, `nav-memory-north.json`, `nav-memory-both.json`.

### The bake

| | strip | north |
|---|---:|---:|
| products | 66 | 56 |
| compressed size | 47.7 MiB | **32.0 MiB** |
| city-base regions / street-surface regions | 27 / 27 | 21 / 23 |
| field, roof, nav-medium, nav-low | 1 each | 1 each |

`--area all` took **123 s** for both areas (one browser, GPU), no error, no warning besides the known texture-painter notes, **no procedural fallback** (the North page runs from its bake with `requireBake`;
`baked-check medium --area north`: 25 101 nodes, 40 450 edges, 1 000 field samples, 42 of 42 regions streamed, 0 failures). The strip's scratch bake equals the M0 baseline bake: `bake-product-compare`
reports 64 of 66 products byte-identical, the other two (`city-base`, `roof`) differ only in the build-timing fields the baseline still carried.

### Cold start (`shot --load`, ready = the intro is ready), three runs per tier

| tier | ready (ms) | build | of which modules | batch | finalize + compile | first frame | simulation |
|---|---:|---:|---:|---:|---:|---:|---:|
| medium | **12 098** (11 991-12 261) | 8 935 | 5 724 | 514 | 172 + 2 526 | 1 295 | 987 |
| performance | **11 784** (11 683-11 998) | 8 654 | 5 656 | 493 | 216 + 2 289 | 1 500 | 666 |

The strip needs 24 071 / 23 564 ms (M0): the North is **half** of that (modules 5.7 s against 15 s; the 2.4 s shader compile is the same fixed cost). After a navigation (warm cache) the page is ready in
8.0-8.4 s (hop test, `nav-memory-probe`).

### Memory and the hops (`tools/nav-memory-probe.mjs`, performance tier)

| run | hop 0 | hop 1 | hop 2 | hop 3 |
|---|---:|---:|---:|---:|
| `--page north.html` x3: ready (ms) | 11 792 | 8 023 | 8 027 | |
| post-GC JS heap (MB) | **191** | 192 | 191 | |
| process tree at rest (MB) | **2 437** | 2 576 | 2 580 | |
| process tree PEAK while the next page loads (MB) | 2 714 | 3 454 | 2 910 | |
| `--pages index.html,north.html` x4: page | strip | north | strip | north |
| ready (ms) | 26 590 | 9 271 | 23 508 | 8 332 |
| post-GC JS heap (MB) | 316 | 191 | 316 | 191 |
| process tree at rest (MB) | 4 663 | 2 653 | 4 666 | 2 598 |
| process tree PEAK (MB) | 4 817 | 3 070 | **5 121** | 3 009 |

The North holds **191 MB of live JS heap and ~2.6 GB of process tree**, 56 % of the strip's 316 MB / 4.7 GB (the strip's resting figure is the M0 one). The alternation strip > north > strip > north is
clean: every arrival is within +-15 % of the first arrival of ITS page in heap, tree and ready time, the trend over the hops is nil (the verdict says OK), no error, `history.length` stays 2. The worst
transition peak is the 5.1 GB of the hop that leaves the north and loads the strip (M0: 5.0-6.4 GB). A same-page `--page north.html` run reports FAIL on its own verdict only because hop 0 is a cold HTTP cache
(11.8 s against 8.0 s); the heap is flat. `performance.memory` at ready (the garbage-including figure of `shot --load`): 493-535 MB in the hop test against 1 570-1 640 MB for the strip.

### Frame cost at the HERO pose (`shot --load --bench 40`), three runs per tier

| pose | medium ms | calls | triangles | performance ms | calls | triangles |
|---|---:|---:|---:|---:|---:|---:|
| North HERO (Chernyshevskaya, 444 -1351) | **8.5** (8.4-8.7) | 924 | 1.66 M | **7.4** (7.3-7.6) | 815 | 1.33 M |
| strip HERO (M0, for scale) | 12.3 | 1 273 | 2.33 M | 11.3 | 1 164 | 2.17 M |

Across the 11 VIEWS of the North (medium, `shot --cams views`): 640-1 175 calls, 1.14-1.84 M triangles. `smoke --area north --q performance`: 60 fps, 910 calls, 1.44 M triangles, flight and roofs pass.
Module triangles (`check`): environment 319 k, streets 590 k, city 836 k, props 211 k, traffic 3.8 k, wildlife 48 k, drive 46 k (the strip: 739 k, 835 k, 969 k, 287 k, 5.4 k, 62 k). Population (people-test, high):
637 people, 90 birds (9 crows, 16 gulls, 12 swifts, 37 pigeons, 16 sparrows), 11 ducks in 3 groups, traffic and the four garage cars.

### The real hop test (`tools/areas-hop-test.mjs`, 25 checks, 2 min 12 s)

The REAL bakes, the real gates, real key presses (no fast harness): the strip boots (24-26 s), the walker teleported to (211, -330) facing north walks to the question of g1 (opens at z -375 .. -405) and
accepts; north.html arrives in **8.2-8.4 s**, walking, inside the arrival rectangle of g1 and at the departure x, no error. From (211, -300) facing south the question of g2 opens inside its zone; the strip
arrives (21-22 s) inside the rectangle of g2, walking. **Driving**: the coupe in the cockpit view on the centre line of Vosstaniya ulitsa is held inside the zone of g1 (no roll-on), north.html arrives in 7.7 s
with the SAME car at rest, the cockpit view kept, on a drivable lane within 30 degrees of its heading inside the rectangle; the same back through g2. No page error, no module error in the whole run.
(The first attempt drove the coupe along the pavement of Mayakovskogo ulitsa and hit a bollard 25 m in: the test now drives on the centre line of a straight street.)

## M5: the North with its landmarks (scratch bake of revision `85bc4307da0223b590ed`, 2026-10-21)

GPU and visual verification of milestone M5 (the CPU side is docs/AREAS.md section 8). Same protocol as above (headless Edge 155, D3D11, RTX 3090 Ti, 1280 x 720, real scratch bake of BOTH areas served by the local `tools/`
server, ONE GPU job at a time) with **four interleaved runs per cell instead of three** (strip, north, strip, north ...; the fourth was added because the machine was not quiet, see below). Everything is **medium** quality. Medians are
quoted, ranges in brackets. Raw files and the screenshots: `shots/qa/` of the worktree (not committed; a copy in `D:/git2/n4spb-work/m5-gpu-qa/`).

**Machine load.** An M6 agent ran CPU-only node jobs on the same machine. Total CPU at the start of each run (`typeperf`): rounds 1 and 2 3-18 %, round 3 20-45 % (the strip needed 32.9 s to become ready in it), round 4 3-54 % (it waited for < 8 % before
each measurement type, which did not always happen). Ready times and frame times are therefore **inflated and noisy**; the lowest value of each cell is the one with the least interference (the strip's equals M0). The verdicts below use the medians
(unfavourable to the North, whose later runs ran under the heavier load) and the gates were checked against the quiet runs as well; no verdict changes.

### The bake

| | strip | north | north, M3 (generic) |
|---|---:|---:|---:|
| files (products) | 66 | **56** | 56 |
| compressed size, all products | 47.75 MiB | **31.30 MiB** | 32.0 MiB |
| of which per tier (medium = all but `nav-low`; performance = all but `nav-medium`) | 44.05 / 44.06 MiB | **30.50 / 30.50 MiB** | |
| city-base / street-surfaces / field-dtex / nav / roof | 21.78 / 7.77 / 6.69 / 3.69 / 1.30 | 17.13 / 6.04 / 3.77 / 0.80 / 0.80 | |

`node tools/bake-scene.mjs --area all` (`BAKE_VERBOSE=1`) took **about 2 min for both areas**, no error, no procedural fallback; `bake-manifest-check`: OK (122 products, 79.0 MiB). `baked-check medium --area north`: 25 038 nodes, 40 047 edges,
1 000 field samples, 42 of 42 regions streamed, **0 failures**; `performance`: 25 044 / 40 110, 42 of 42, 0 failures (M3: 25 101 / 40 450; the landmark colliders remove a few nodes). The North bake is **0.7 MiB smaller** than the generic one: the claimed
buildings are no longer in `city-base` (the landmark modules build at run time, they add nothing to the bake).

### Cold start (`shot --load`, ready = the intro is ready), four runs

| | strip | north (M5) | north, M3 generic (3 runs) |
|---|---:|---:|---:|
| **ready (ms)** | 26 534 (23 808-32 860) | **14 038** (12 634-15 568) | 12 098 (11 991-12 261) |
| ready, lowest (least load) | 23 808 | 12 634 | |
| build | 21 628 | 10 651 | 8 935 |
| of which modules | 16 675 | 7 337 (6 698-8 528) | 5 724 |
| batch | 3 237 | **1 550** (1 424-1 612) | 514 |
| finalize + compile | 898 + 819 | 509 + 980 | 172 + 2 526 |
| first frame / simulation | 2 386 / 1 354 | 1 531 / 950 | 1 295 / 987 |
| `nav-memory-probe` hop 0 ready (ms, fresh profile, cold cache) | 29 003 (25 098-32 676) | 15 237 (13 028-21 223) | |

North / strip ready = **0.53** (medians) and 0.53 (lowest runs). The landmarks added **+1.6 s to the modules and +1.0 s to the batching**; with the lowest runs the whole
page is 12.6 s against 12.1 s of the generic North (+4 %), with the medians 14.0 s (+16 %, load). (The batch phase merged 608 sources into 280 meshes; the M3 table did not record the count.)

Per-module build ms, North (median of 4 and range) next to the strip's own figure of the same module:

| module | north | strip | | module | north | strip |
|---|---:|---:|---|---|---:|---:|
| environment | 1 949 (1 802-2 414) | 3 129 | | props | 740 | 1 023 |
| **landmarksNorthFull** | **745** (679-768) | 376 (`landmarksNorth`, trimmed) | | traffic | 459 | 534 |
| **landmarksSmolny** | **497** (440-561) | | | people | 373 | 1 017 |
| **landmarksSuvorov** | **64** (51-78) | | | wildlife | 79 | 100 |
| **landmarksKirochnaya** | **102** (84-118) | | | drive | 369 | 372 |
| streets | 1 081 | 1 400 | | landmarksD | 97 (81-152) | 510 (4 sub-groups) |
| city | 367 | 377 | | landmarksOktyabrsky | 202 (174-220) | 154 |

The six modules that M5 put into the North cost **1.7 s of the 7.3 s** (NorthFull 0.75, Smolny 0.50, Oktyabrsky 0.20, Kirochnaya 0.10, library / hospital 0.10, Suvorov 0.06). The two cheap sights to cut, Kirochnaya and Suvorov, would save 0.17 s and 0.17 M triangles together.

### Memory (`tools/nav-memory-probe.mjs --hops 1`, a fresh browser per run), four runs

| | strip | north (M5) | North / strip | north, M3 (performance tier, 3 hops) |
|---|---:|---:|---:|---:|
| **post-GC JS heap** (MB) | 318 (318-318) | **200** (200-200) | **0.63** | 191 |
| `performance.memory` after the GC (MB) | 927 | 562 | 0.61 | 493-535 |
| process tree at rest (MB) | 4 656 (4 585-4 727) | **2 755** (2 669-2 829) | 0.59 | 2 437-2 653 |
| process tree peak while loading (MB) | 5 166 (4 886-5 403) | 3 017 (2 765-3 095) | 0.58 | 2 714-3 454 (hops) |
| by type: GPU process / renderers (run 1, MB) | 3 072 / 1 572 | 1 723 / 980 | | |

The landmarks add about **9 MB of live heap (+5 %)** and roughly **0.1-0.2 GB of process tree** to the generic North (the M3 figures are the performance tier; the strip's medium tier is about 0.1 GB higher than its performance tier).

### Frame cost (`shot --load --bench 40`, ms per frame), four runs

| pose | ms, median (range) | calls | triangles | north, M3 generic |
|---|---:|---:|---:|---|
| strip HERO (Vosstaniya Square) | 14.02 (12.05-15.83) | 1 273 | 2.33 M | M0: 12.3 ms, 1 273 calls, 2.33 M |
| **North HERO** (Chernyshevskaya) | **9.58** (8.61-12.87) | **960** | **2.03 M** | 8.5 ms, 924 calls, 1.66 M |
| Digit2 Transfiguration Cathedral | 11.42 (9.46-13.95) | 1 105 | 2.71 M | |
| Digit3 Dom Muruzi | 8.97 (7.79-12.04) | 862 | 2.82 M | |
| Digit7 Smolny Cathedral | 7.10 (5.78-10.66) | 691 | 2.47 M | |
| Digit8 Smolny Institute | 7.01 (6.37-10.81) | 735 | 2.30 M | |
| Digit9 Suvorov Museum | 7.58 (6.25-11.34) | 791 | 1.77 M | |
| Digit0 Kirochnaya | 9.15 (7.91-12.05) | 940 | 2.33 M | |
| Place.oktyabrsky | 10.21 (8.32-14.90) | 1 137 | 2.20 M | |

At the HERO pose the landmarks add **+36 calls (+4 %) and +0.37 M triangles (+22 %)**, +0.4 ms in the quiet run (8.93 against 8.5 ms). The most expensive North view is the Transfiguration Cathedral (11.4 ms median, 9.5 ms lowest) and the most triangles
are on Dom Muruzi (2.82 M, of which the building is 0.24 M). Every pose is below the strip's HERO.

### Playing (`drive-bench`, 20 s, medium), four runs

| | strip | north (M5) |
|---|---|---|
| start | `view:Digit3`, Nevsky Prospekt | walk: HERO (444, -1351) facing north along Chernyshevskogo prospekt; drive: the coupe at (700, -1273) facing east on Kirochnaya ulitsa (no steering) |
| **walk** mean / p50 / **p95** (ms) | 21.8 (20.3-27.9) / 16.7 / **33.4** (33.4-33.4) | 17.5 (16.7-18.8) / 16.7 / **25.1** (16.8-33.4) |
| walk fps | 46.1 (35.8-49.3) | **57.3** (53.1-60.0) |
| walk draw calls | 1 330 | 959 |
| **drive** mean / p50 / **p95** (ms) | 24.8 (23.3-30.7) / 16.8 / **33.5** (33.4-50.0) | 18.4 (17.4-19.2) / 16.7 / **33.3** (16.8-33.3) |
| drive fps | 40.3 (32.6-42.9) | **54.3** (52.1-57.5) |
| drive distance (m) | 186, 144, 183, 42 (the car stops against something) | 425, 425, 475, 503 (to x 1124 .. 1202 on Kirochnaya, it passes the campus and the Suvorov Museum) |
| worst frame (ms), long tasks | 158 (67-200), 1-11 | **308** (250-317), 2-4 |

The North drive covers two to three times the strip's distance in the same 20 s and streams the regions of two sights meanwhile, which is where the 250-317 ms worst frames come from (2-4 long tasks of 138-298 ms: a region attach). They are not part of the gates; M8 should
look at them on a phone. The strip walks at 46 fps under this load (M0: 50) and drives at 40 (M0: 47): the machine was loaded.

### Pass criteria (plan section 10, proposed)

| criterion | strip | north | ratio / margin | verdict |
|---|---:|---:|---:|---|
| post-GC heap <= 1.15 x strip | 318 MB | 200 MB | 0.63 | **PASS** |
| readyMs <= 1.15 x strip | 26 534 ms (23 808 lowest) | 14 038 ms (12 634 lowest) | 0.53 (0.53) | **PASS** |
| walk p95 not worse than strip + 10 % | 33.4 ms | 25.1 ms (<= 33.4 in every run) | 0.75 | **PASS** |
| drive p95 not worse than strip + 10 % | 33.5 ms | 33.3 ms | 0.99 | **PASS** |
| median >= 50 fps at medium, walking | | 57.3 (lowest run 53.1) | +15 % | **PASS** |
| median >= 50 fps at medium, driving | | 54.3 (lowest run 52.1) | +8.6 % | **PASS** (within 10 % of the limit: repeated, the fourth run is in the numbers; the lowest run stays above 50) |
| bake <= 45 MiB per tier | 44.05 MiB | 30.50 MiB (31.30 all products) | 0.68 of the limit | **PASS** |

### The cost of M5 against the generic North

Ready +4 % (lowest runs) to +16 % (medians, loaded), modules +1.6 s, batch +1.0 s, heap +9 MB, process tree +0.1-0.2 GB, HERO +36 calls / +0.37 M triangles / +0.4 ms, bake -0.7 MiB. The North with its landmarks is **well inside the plan's budget** on every gate;
nothing needs to be cut. If a cut is wanted later, the data say: Kirochnaya (0.10 s, 0.12 M triangles) and Suvorov (0.06 s, 0.05 M) are the cheapest sights and also the ones that save least; Smolny (0.50 s, 0.43 M) and `landmarksNorthFull` (0.75 s, 0.58 M, of which
Dom Muruzi 0.24 M) are where the time and the triangles are.

### Smoke, boot and hop (all with the real bake)

`smoke --area north --q medium`: RESULT OK (intro ready 22.2 s under 32 % machine load, walked 16.3 m, 52 fps, 1 034 calls, 2.14 M triangles, area toast "Chernyshevskaya", flight, landing and roofs pass); `smoke --q medium` (strip): RESULT OK (32.5 s, 25 fps under 34 % load,
1 239 calls, 2.34 M); `npm run areaboot:north`: OK; **`npm run areahop`: 25 passed, 0 failed** (strip first load 29.6 s, North arrival 12.2 s, walking and driving, both gates, no page error).

### Visual QA of the North (1600 x 900, medium, real bake; screenshots in `shots/qa/`, copies in `D:/git2/n4spb-work/m5-gpu-qa/shots/`)

What was seen (every picture was opened and looked at):

* **HERO (`v/a1-hero.png`).** The vestibule is drawn once, glass facade with six brown doors and the roof sign: `ЧЕРНЫШЕВСКАЯ` and, above it, `МЕТРОПОЛИТЕН` on the cornice, the blue `М` plate on the roof. The text reads left to right, is not mirrored and is
  legible at 17 m (the main line about 12 px high at 1600 px; the small `МЕТРОПОЛИТЕН` line is barely legible). The sign is on the west facade, which is the facade HERO looks at (it is straight ahead, not on a side wall). From 3 m (`a3-sign-close`) it is crisp.
* **Night (`v-night/`, dusk `v-golden/`).** The sign letters stay the same dark grey as by day, the `М` plate is not emissive, the glazing of the vestibule is not lit, while the neighbouring houses have lit windows: the sign is "black", not lit (cosmetic, finding 5).
* **Transfiguration Cathedral (`b1`-`b6`).** Yellow nave, four Ionic columns, black domes and four bell turrets, doors; the captured-cannon fence is a rectangle of granite plinths with three dark-green barrels each (brass rims) and drooping chains, four
  open approaches. No hole, no double mass, no floating part, aerial `b2`/`b3` shows the cathedral inside the circular plaza among the generic blocks. The barrels are chunky.
* **Dom Muruzi (`c1`-`c3`).** Rich facade with arched windows, balconies and corner turrets, ground-floor shops with readable Russian signs (`Грузинская кухня`); it fills its block in the aerial. A signal pole stands 3 m in front of the camera at Digit3 and covers
  the right quarter of the view.
* **Smolny (`d1`-`d3`, `e1`-`e3`).** Blue cathedral with white details and five domes, the surrounding ensemble, the Institute (yellow, pedimented portico); the aerials show the Neva behind. No missing facade texture, no black or white surface.
* **Suvorov Museum (`f1`-`f4`).** Green roofs, tower, arcaded cornice and the two mosaics with their captions `ПЕРЕХОД СУВОРОВА ЧЕРЕЗ АЛЬПЫ` / `ОТЪЕЗД СУВОРОВА В ПОХОД 1799 ГОДА` on the north (Kirochnaya) face, readable and not mirrored. Digit9 stands south of it, so it shows the plain rear.
* **Kirochnaya (`g1`-`g5`, `v2/m1`-`m5`).** Pink-ochre blocks with the sign `КЛИНИЧЕСКИЙ ИНСТИТУТ` over the arch of the main gate, lawns, service lanes, fence, trees. The top view `m4` shows every claimed building drawn, with lanes and lawn between.
* **Library, hospital, bookstore, Oktyabrsky (`h*`, `k*`, `i*`, `v3/`).** Library and hospital (yellow block with a portico) are drawn; the bookstore has its glass shopfront with colourful book spines and bookshelves inside; the Oktyabrsky hall shows its stone cladding, steps,
  glazed foyer, a `КОНЦЕРТ` stand. `v2/k1` (top view of the band) and `vstrip/k1` (the same view on the strip) are the same picture except for the Fontanka boats and the bridge, which the North does not build (no `bridges` module).
* **Colliders (drive-bench `--walk`, W held, from a start pose towards the building).** The walker stops at: the glass facade of the vestibule (x 460.3, facade 461: there is no door to enter), the Transfiguration Cathedral (inside the portico, between the columns,
  x 52.6), Dom Muruzi (x -138.6, its west wall), the Smolny Cathedral (x 2427.6, wall at 2428), the Smolny Institute (stops at (2513, -1542), 5 m from the footprint r2133719), the Suvorov Museum (27 m in, at its south face), the front of the
  Kirochnaya block (7 m in) and the east wall of the Mariinsky hospital block (x -81, 51 m from the start). The library was **not** walked. The colliders are sane; entering the vestibule or the bookstore interior was **not run** (a walk-in needs the door logic of M7; the
  vestibule is closed by design). (A first "hospital" walk started at (-102, -215), which is INSIDE the neighbouring building w113471411: its 7 m are that building's wall, not the hospital's.)

Checks behind the pictures (probes in the running page): of the 54 claimed building records, 53 have a mesh standing in them (a ray from above hits a roof at 5-74 m); the exception is the vestibule, whose merged meshes are not raycastable (a ray passes through it, a pixel
probe too; it is plainly drawn in `a1` / `a6`), so that one rests on the pictures; **0 tree centres inside
any claimed footprint and none within 0.8 m of a wall** (the Oktyabrsky hall has 2 hidden inside its volume, invisible); **0 parked cars inside or within 1.2 m of any footprint**; `zfight` (the same frame with a different depth quantisation, 12 poses, 0.00-0.04 % noisy pixels at the landmark poses)
finds nothing between a landmark and `city`; the only noisy pose is the band pose (-170, 2, -265) at 0.136 % (1 257 px; the strip has 1 245 px there: the pre-existing coplanar bookstore meshes and distant city walls).

Findings (none is a blocker):

| # | view / pose | severity | what is seen | suspected cause | picture |
|---|---|---|---|---|---|
| 1 | gate stubs across the Kirochnaya pavement, (1230, -1244) and (1312, -1238) | cosmetic | the 10 m stubs are flat, untextured slate-blue asphalt over the grey pavement; at the street end they stick 1-3 m into the textured carriageway as a lighter trapezoid with a dashed edge. **No z-fighting and no flicker** (the pavement slab does not hide them; 3 and 10 noisy px) | `landmarksKirochnaya/landscape.js` `P.box(road ...)` at y 0.051-0.055 is not clipped at the kerb line | `v/g4-stub2-close`, `v2/m1-stub1-top`, `v2/m2-stub2-top` |
| 2 | Smolny approaches, Suvorov strip, campus | minor | trees stand on the ceremonial approach of the Smolny Cathedral (13 records in x 2320..2440, z -1847..-1820: 8 trees (oak, lime, maple, poplar, elm) and 5 shrubs, several on the axis of `d1`), a 17 m lime and a shrub in the Suvorov rectangle (1394, -1217), 2 in the campus; none through a wall | the tree hooks of the source are not ported (docs section 8.7, M6) | `v/d1-smolny-cath-v7`, `v/f1-suvorov-v9` |
| 3 | Digit0 Kirochnaya (1225, -1243, yaw 180) | minor (pose) | the camera stands 5 m from the front wall of w232918735, so the view is a facade close-up, not the campus | pose of M3 (not moved by M5) | `v/g1-kirochnaya-v10` |
| 4 | Digit3 Dom Muruzi | cosmetic (pose) | a signal pole 3 m ahead covers the right quarter of the picture | pose | `v/c1-muruzi-v3` |
| 5 | vestibule at night | cosmetic | sign letters and `М` plate unlit, glazing dark, neighbours lit | `landmarksNorthFull.js` `metro()`: the fascia material is not emissive, no night glow | `v-night/a1-hero`, `v-night/a3-sign-close` |
| 6 | Podpisnye bookstore roof | cosmetic | the roof (about 120 m x 16 m) is near-black and flat and reads as a dark slab from the air; **identical on the strip** | `landmarksNorth*/bookstore.js` roof colour (shared module) | `v2/k1-band-top-west` / `vstrip/k1-band-top-west`, `v/h5-bookstore-aerial` |
| 7 | band pose (-170, 2, -265, yaw 90) | cosmetic | 0.136 % noisy depth pixels; 0.135 % on the strip | pre-existing, shared band | `shots/qa/zf/` |
| 8 | Transfiguration cannon fence | cosmetic | the piers read fat (three thick barrels each); no colliders, not knockable (docs 8.7) | `landmarksNorthFull.js` fence | `v/b5-fence-south-row` |

Not findings: a ghostly, see-through look of walls appears only when the free camera stands INSIDE a building (my first set had eight such poses, listed in `D:/git2/n4spb-work/m5-gpu-qa/progress.md`: the shot tool does not collide); the poses behind the findings above are VIEWS poses (validated by `views-check`) or were checked with `insideBuilding`.

Not run: the performance tier (only the bake check ran for it), a phone, Firefox, the interior of the bookstore, entering the vestibule, the cannon-fence piers as colliders (none exist), real knock tests, `people` at the landmark doors (docs 8.7: no doors).
