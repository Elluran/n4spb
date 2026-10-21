# Areas: one page per scene

n4spb used to be ONE scene (the Nevsky strip). A scene that grows keeps growing in memory and frame time (the whole source city needed 84-90 s to load, ~5 GB and 17-33 fps), so the world is
now split into **areas**: each area is its own page, with its own data, module list and bake. The player walks in one area; near the border toward another area the game asks whether to load it,
and the answer is a page navigation (`location.replace`). The old page dies with its memory; the new one loads from its own bake. The plan and the decisions behind it: the approved plan of
2026-10-21 (summarised in section 6); measurements: [AREAS-MEASUREMENTS.md](AREAS-MEASUREMENTS.md).

## 1. Glossary (these words are easy to confuse)

| Word | Meaning |
|---|---|
| **area** | a scene that is loaded on its own: `strip` (the Nevsky strip, `index.html`), `north` (`north.html`, from milestone M3). Identified by `ID` |
| **area module** | `src/world/area.js` (strip) or `src/areas/<id>/area.js`: the pure-data tables that say WHAT the world is (names, anchors, landmark groups, HUD location table, viewpoints, module list, water tables ...) |
| **registry** | `src/areas/registry.js`: which areas exist, their page, bake directory, import-map remap and the gates between them. Runtime-only (not part of the bake revision) |
| **gate** | a stretch of the border of an area where the player is offered the neighbour (milestone M2) |
| `AREAS` (layout.js) | the HUD table of **named places** for the location toast (`areaAt`): NOT the areas of this document |
| `dev:area` (package.json) | the authoring preview of one module (`tools/area-dev.mjs`, docs/AREA-DEVELOPMENT.md): also unrelated |

## 2. How a page picks its area

Every area page is the same engine with a different import map. `index.html` has none for the area (its files are the defaults). `<id>.html` (generated from `index.html`) remaps URL-like keys:

```html
<script type="importmap">{ "imports": {
  "./src/world/data/city.js": "./src/areas/north/data/city.js",
  "./src/world/area.js": "./src/areas/north/area.js",
  "three": "..." } }</script>
```

A URL-like key matches every relative importer and `import()` after resolution (HTML spec, "resolve a module specifier"), so the ~170 files that import the data facade or `layout.js` are untouched.
`tools/importmap-probe.mjs` proves it (Edge 155 and Firefox 158: PASS at the site root and under a sub-path; `--serve` hosts the probe for a phone). **Import maps do not apply inside Workers**:
the only worker (`core/baked-worker.js`) imports nothing area-specific. `<html data-area="<id>">` must equal the area module's `ID`: `main.js` throws (fatal card) when they disagree, so a stale
cached page can never build the wrong world.

Headless tools run as another area with `node tools/area.mjs <area> <tool.mjs> [args]` (`tools/lib/area-hooks.mjs`: Node loader hooks with the same remap). `tools/modules-list.mjs` reads the
module list of `AREA` (strip: `src/main.js MODULES`; another area: `MODULES` of its area module).

## 3. What lives where

* `src/world/area.js` / `src/areas/<id>/area.js`: `ID, BAKE_DIR, REQUIRE_BAKE, NAMES, SQUARE/OBELISK/STATION, GROUPS (landmark claims), makeAreas(h) (the HUD table), makeViews({yawToward}) -> { HERO, VIEWS }`;
  another area adds `MODULES, LABELS` (and, from M3, `WATER, ZONES, GARAGE, HOOKS, HEIGHT_PATCHES, PRUNE_SERVICES`). `layout.js` re-exports them, so the engine keeps importing from `layout.js`.
* `src/world/data/city.js`: the data facade of the area (OSM records, `PLAY_RECTS`, `EXTENT_RECTS`, `RECT_NAMES`, `REGIONS`). Another area has its own facade built by `tools/area-data-cut.mjs` (M3).
* `assets/baked/` (strip) and `assets/baked/<id>/`: the baked products. ONE global revision covers all areas (`tools/baked-revision.mjs`).
* `src/core/baked-world.js`: `setBakeDir(dir)` (called by `main.js` from the area module), `openBakedWorld(ctx, params, { required })` (a page reached by a hand-off must not fall back to a procedural
  build: it throws), `peekManifest(dir)` (the gate preflight).

## 4. The bake revision (what makes a bake stale)

The revision is the first 20 hex digits of a sha256 over `index.html`, every other `*.html` with a `data-area` attribute, and every `*.js` under `src/` except `src/core/baked-revision.js` and the
**runtime-only files** (`RUNTIME_ONLY` in `tools/baked-revision.mjs`: `src/core/gates.js`, `src/core/handoff.js`, `src/areas/registry.js`). Files are ordered by their POSIX-relative path (a native
sort orders `landmarksNorth/` and `landmarksNorthFull.js` differently on Windows and Linux, and the CI would reject a Windows bake; `tools/baked-revision-test.mjs` pins the order).
Runtime-only files never build or change anything that is baked; `tools/runtime-only-lint.mjs` enforces that only `src/main.js` imports them. Tuning a gate rectangle or a prompt text therefore
does not make a bake stale. Two bakes of the same source are byte-identical: no wall-clock field is recorded (`city-base` service timings and the roof capture time were removed from the products).

## 5. Checks (CPU unless noted)

```
node tools/areas-test.mjs                 registry vs area modules, facades, pages, gates
node tools/layout-golden.mjs --diff       every export of layout.js and the data facade equals tools/golden/layout-strip.json (the area seam must not change the strip)
node tools/import-lint.mjs                relative imports exist with EXACTLY the spelling used (Windows develops, Linux hosts), module lists have files
node tools/runtime-only-lint.mjs          only main.js imports the runtime-only files
node tools/baked-revision-test.mjs        hash order and exclusions
node tools/handoff-test.mjs               the hand-off codec, the URL, resolveArrival (also on the real strip layout)
node tools/gates-test.mjs                 gate geometry, the state machine (zone, arming, decline, teleports) and the preflight logic with fakes
node tools/gate-hold-test.mjs             the four cars held while a question is open: stop inside the zone, never reverse
node tools/importmap-probe.mjs            go/no-go of the import-map mechanism (Edge, Firefox; GPU-free)
node tools/area-boot-test.mjs             browser: the page boots as its area, refuses a mismatching one (fast harness)
node tools/areas-flow-test.mjs            browser, GPU, fast harness: prompt, arming, decline, accept, arrival, required bake, driving, flying, failures
node tools/nav-memory-probe.mjs           browser, GPU: does a navigation free a scene (post-GC heap, process-tree bytes, per hop)
```

## 6. Decisions in one place

Switch = full navigation; one static HTML per area; hand-off through the standard URL parameters (`cam`, `fly`, `tod`, `look`) plus a small `ho`; a one-sided 200 m band of strip territory belongs to the
North so the arrival lands on identical streets; the prompt is `ctx.ui.confirm` + a passive chip; the Continue tap stays (audio and pointer lock need a fresh gesture). The split removes
accumulation, not the per-scene floor: every crossing is a cold start of ~25-30 s on a fast desktop.
