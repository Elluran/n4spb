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
