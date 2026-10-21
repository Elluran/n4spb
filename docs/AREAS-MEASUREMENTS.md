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
