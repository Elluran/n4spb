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
node tools/areas-test.mjs                 registry vs area modules, facades, pages, gates (geometry + arrival grid of every non-dev gate, synthetic gate fixtures), generator fixtures, page.json, TEST shape
node tools/gen-area-html.mjs [--check]    generate <id>.html from index.html + src/areas/<id>/page.json (section 5.1); --check = the CI gate
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

### 5.1 The generated area page

`<id>.html` is **generated**, never edited: `node tools/gen-area-html.mjs [--area <id>] [--check] [--force-planned] [--root <dir>]`. It takes `index.html` (the source of truth, never modified by the tool) and applies targeted
replacements of stable anchors; an anchor that matches other than exactly once stops the tool (an `index.html` edit that moves one must be followed in `tools/gen-area-html.mjs`). What changes: `<html data-area>`, `<title>`,
`apple-mobile-web-app-title`, the canvas `aria-label`, the intro kicker and title, the phone "heavy scene" note (the area's MB is `REGISTRY[id].approxMB`), the `#places` tooltip, the two keyboard-help lines, the import map
(the registry's `remap` first, as URL-like keys `./src/...`; the `three` entries stay) and the facts script (`SIGHTS`, `FACTS`). Every id, class, script and style is `index.html` byte for byte (a test pins it). A `<!-- GENERATED -->` line follows the doctype.
`--check` writes nothing and exits 1 when the file on disk differs (CRLF checkouts compare equal) or is missing; with no `--area` it covers every real (non-`planned`) area except the strip. `--force-planned` generates the page of a
`planned` row (the area's own files do not exist yet, so the page fails at its first import: that is how `north.html` is committed before the data lands). The text data of an area is `src/areas/<id>/page.json`
(Cyrillic only through an editor, never a shell):

```json
{ "schema": 1, "title": "tab title", "appTitle": "home-screen label", "canvasLabel": "canvas aria-label",
  "intro": { "kicker": "line over the title", "title": "the splash h1" },
  "heavy": { "ramGB": 1, "ru": "... ~{mb} МБ ... ~{ram} ГБ ...", "en": "... ~{mb} MB ... ~{ram} GB ..." },
  "places": { "title": "tooltip of the Places list" },
  "help": { "walk": "text with <kbd>1</kbd> tags", "air": "text with <kbd> tags" },
  "sights": ["splash-name"],
  "facts": [["a true, checkable sentence"], ["another", "splash-name"]] }
```

`sights` are `assets/splash/<name>.jpg` (the nine strip pictures exist; `[]` = no pictures, the splash keeps its plain colour); a fact's optional second element is the sight whose picture shows it. At least 8 facts,
one line each, no `<` or `>`. Every fact must be true and checkable (the facts of `north` are about the Tauride Garden and Palace, Smolny, Chernyshevskaya, the Transfiguration Cathedral, Liteyny Prospekt and the Neva).
The `help` lines list the keyed views of the area: they must follow `VIEWS` in the area module.

### 5.2 Tools take the area

* `node tools/area.mjs <id> <tool.mjs> [args]` runs a headless tool as another area (loader remap, section 2); `node tools/each-area.mjs <tool.mjs> [args]` runs it once per real area (`npm run layout`, `npm run landmarks`).
* **The expectations of an area** are exported by its area module as `TEST` (the strip's are the fallback in `tools/lib/area-test-data.mjs`; same shape): `tools/layout-test.mjs` and `tools/landmarks-groups-check.mjs` read them.
  ```js
  export const TEST = {
    claimed: [{ id: 'r2404499', by: 'landmarksA', group: 'station' }, 'w123'],   // ids that must be claimed (by = module, group = sub-group); a bare id = claimed by anything
    viewKeys: ['Digit1', /* ... */ 'Digit0', 'Place.oktyabrsky'],                // the exact keys of VIEWS: keyed views in order, then Place.<id> views (those only have to exist)
    mustHaveAreas: [{ x: 592, z: 165, has: 'substring of areaAt(x, z), lower case' }],
    kept: ['landmarksA'],                         // modules whose GROUPS entries are verified against the data (default: every key of GROUPS)
    // optional: nearestRoad {at, names}, roadsNear {at, r, min}, riverAny [[x,z]], riverBed [[x,z]], streetLevelAt [x,z], onRoadNote [[x,z,text]], farPoint [x,z]
  };
  ```
* Browser tools take `--area <id>` or `--page <file>` (default: the strip, `index.html`): `shot.mjs` (also `hero`, `v1..`, `views` of THAT area), `smoke.mjs`, `drive-bench.mjs`, `drive-test.mjs`, `load-test.mjs`, `baked-check.mjs --area <id>`;
  `serve.mjs [port] [--area <id>]` serves every page of the site root (the flag only picks what `/` opens). `tools/lib/area-page.mjs` resolves the flags.
* `tools/check.mjs --area-modules [--skip a,b]` checks every module of the page's list (`npm run check:north` = `node tools/area.mjs north tools/check.mjs --area-modules`); `npm run check` stays the strip's list.
* `tools/owns-table.mjs` builds ONE union table of the `MODULES` of every real area (a module is the same file in every area that lists it).
* **Gate geometry** (`tools/lib/gate-geometry.mjs`, run by `areas-test` on every non-dev gate): the segment lies on the border of the origin play union (0.5 m inward is inside, 0.5 m outward is outside, sampled every 5 m); `inward` is a unit
  vector normal to the segment; a point at depth `zone` is inside; the arrive rectangle's corners lie 25 m inside the destination play union; the reverse gate leads back and names this gate, and no 25 m arrival-grid point is within `zone + 50 m`
  of the reverse border inside its lateral range; the arrival grid (25 m steps x walk / fly / car x both headings along the crossing axis) is resolved by `handoff.resolveArrival` with the DESTINATION layout and every result passes predicates
  written independently of the probe (25 m inset, not in a building or the river, a car on a drivable lane within 30 degrees); **a fall-back to the destination HERO counts as a failure**. A gate whose destination is another area runs the grid
  in a child (`tools/area.mjs <to> tools/areas-test.mjs --arrival-only <gate>`). The band-parity hook is `tools/band-parity.mjs` exporting `bandParity({ gate, root, REGISTRY })` (a list of problem strings); absent = skipped.
  Synthetic fixtures inside the test exercise every check and every way it must fail while no real gate exists.

## 6. Decisions in one place

Switch = full navigation; one static HTML per area; hand-off through the standard URL parameters (`cam`, `fly`, `tod`, `look`) plus a small `ho`; a one-sided 200 m band of strip territory belongs to the
North so the arrival lands on identical streets; the prompt is `ctx.ui.confirm` + a passive chip; the Continue tap stays (audio and pointer lock need a fresh gesture). The split removes
accumulation, not the per-scene floor: every crossing is a cold start of ~25-30 s on a fast desktop.

### 6.1 Bake and deploy

* `node tools/bake-scene.mjs --area strip|north|all` (default `strip`; `npm run bake` = `--area all`, `bake:strip`, `bake:north`). The page, the output directory and the manifest come from the registry: `assets/baked/` for the strip
  (unchanged: 66 files, the URL every cached page knows), `assets/baked/<id>/` for the others. A `planned` area is skipped (asked for by name it is an error, exit 2). The bake runs the areas one after another in one browser with the
  GPU lock of the session. The manifest is `{ format: 1, area, revision, files, sizes }`.
* **One global revision** (`tools/baked-revision.mjs`) and publication after ALL requested areas succeeded: the manifests and `src/core/baked-revision.js` are written only then, and only then is each area's OWN directory purged of old
  products (direct children only: the strip's directory contains `north/`). A failed or interrupted bake leaves the last good manifests and revision untouched. A bake of one area changes the global revision, so the manifests of the other
  areas stay behind it (the script warns, `bakecheck` fails): scratch bakes in a worktree may do that, a committed bake is always `--area all`.
* `bake-manifest-check` loops over the real areas (revision, `area`, required products, sizes, no `.part`; `--area <id>` for one); `baked-check [medium|performance] --area <id>` hydrates one area's bake against its generators
  (the far streaming target is the farthest play rectangle, `TEST.farPoint` overrides). `.gitignore` ignores `assets/baked/**/*.part`.
* `.github/workflows/pages.yml`: on a pull request only the CPU `verify` job runs (no `npm ci`: bake-manifest-check, gen-area-html --check, layout-test and landmarks-groups-check for every real area, areas-test, handoff-test, gates-test,
  owns-table --check, runtime-only-lint, import-lint, baked-revision-test, `strip-data-clip --check` on every `src/world/data` and `src/areas/*/data` that exists); `deploy` needs `verify` and does not run on pull requests. The site is
  `index.html`, every root page that names its area (`north.html` when it exists), `src`, `assets`, the manifest and the licences. The concurrency group is per ref, so a pull request never cancels a deployment of `main`.
  While the bake is stale (until the committed bake of milestone M8) `verify` is red on purpose.
