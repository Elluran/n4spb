# Centre to Obvodny and Moskovsky Prospekt

Requested 2026-10-11: finish missing central coverage to Obvodny Canal and follow
Moskovsky Prospekt south to Moskovskaya, including Moscow Victory Park. Inherit
the established city engine, July look, real OSM footprints, streets, signs,
traffic and input conventions. No flags or alarm sounds.

The appended C1–C4 regions fill the centre's southern gaps. MP1–MP3 cover the
avenue and neighbouring blocks; VP includes the entire park and its eastern
edge; MS includes Chesme and Moscow Square through Moskovskaya. The extent
includes 120 m of scenery beyond each playable rectangle. Existing region
priority, IDs and seeded generation remain stable.

Distinct specialists author the central-south sights, Moskovsky sights and
Victory Park. Recognition targets: Trinity Cathedral's blue five-domed mass,
Vitebsky Station's asymmetric Art Nouveau facade, Moscow Triumphal Gate's green
Doric order, the park's entrance and formal sculpture/fountain axes, Chesme's
pink-and-white Gothic church, and the House of Soviets at Moscow Square.

The project-only [coverage.html](../coverage.html) distinguishes playable OSM
coverage from individually authored landmarks and uncovered city areas. It uses
actual region and claim data: 53 regions and 364 landmark groups. Coverage does
not mean every building is hand-authored. It works offline, with pan, zoom,
layer controls and region selection; the generator checks its embedded script.

Validation: serial integrated medium-quality driving and walking in Nevsky and
the new corridor, nearby/distant screenshots and teleports, car controls,
road/marking audits, affected streaming/bake regressions, final shipping bake,
normal-loading retest, and recorded performance limitations. Checkpoint commits
include the completed source and its matching shipping assets.

The appended playable union adds **21.4569 km²**, including canals/scenery water
inside playable rectangles. The data now has 26,958 building/part records (+8,463),
72,611 road/path records (+23,519), 12,034 green records (+4,573), and 11,808 mapped
trees (+4,013). Coverage is a union, not the large bounding box: areas between the
southern corridor and the islands remain outside play.

Southern bridge frames come from the mapped decks and road axes. Asphalt,
walk ramps, rails and quay openings share one frame; the Lomonosov and Egyptian
clear decks use researched widths because OSM polygons include tower projections
and flared aprons. Lomonosov has three spans and four authored towers; Egyptian
has four sphinxes. Primary bridge references:
[Ново-Московский](https://www.mostotrest-spb.ru/bridges/novo-moskovskij),
[Ново-Каменный](https://www.mostotrest-spb.ru/bridges/novo-kamennyj),
[Ново-Петергофский](https://www.mostotrest-spb.ru/bridges/novo-petergofskij).

Research dossiers: [central south](research/central-south.md),
[Moskovsky](research/moskovsky.md), [Victory Park](research/victory-park.md).
The new station pass authors exteriors; Vitebsky interiors/train operations and
additional underground station interiors are not part of this extension.

The expanded terrain payload exceeds Chromium's single ArrayBuffer limit.
The bake stores six typed planes separately and loads at most two at once,
sharing the decoded typed storage. Legacy monolithic bakes and source fallback
remain supported. The city collector seals temporary arrays into bounded typed
chunks between building stages, then emits the same geometry per spatial cell.
Regression fixtures prove identical geometry bytes and preserve audit consumers
that inspect the original unsealed collectors. Neither change reduces detail.

Normal loading now stores the class mask as lossless palette indices at its
original 1 m resolution: all 26 RGBA values reconstruct exactly. The four private
CPU masks use uniform/mixed 32 x 32 storage tiles, preserving every byte and
bounded subsequent keep-out updates. These save 525 MiB and 556 MiB of CPU
storage respectively; the class palette saves another 525 MiB on the GPU. The
offline bake continues to write the compatible raw planes.

The distance field also retains full 1 m RGBA values. Uniform 64 x 64 tiles
use palette entries; mixed tiles use an atlas with real neighbour gutters,
including diagonal and clamped outer edges. Ground and water share the same
filtered sampler. Its 699.97 MiB raw plane becomes 306.45 MiB of shared CPU/GPU
storage, saving 393.52 MiB on each. Every original byte and 20,000 complete CPU
query cases match; border/filter emulation has error below 7e-14. Raw bake
products remain compatible, and dense/custom fields retain the raw fallback.

Static batching prepares one private source at a time into final typed buffers,
releases replaced LOD entries and temporary references before far proxies, and
releases outline bins per completed spatial group. Ten legacy landmark modules
share one immutable neighbour-edge cache, saving a measured 577 MiB. Exact
geometry/classification fixtures verify unchanged triangles, order, bounds,
materials and visibility layers. These changes address integrated startup
memory; timing evidence belongs in [PERFORMANCE.md](PERFORMANCE.md).

Private final static batch buffers now use the existing upload-release hook.
Their counts, precomputed bounds and LOD stay intact; outline/far generation
reads the arrays before GPU upload. Shared originals and dynamic model templates
retain their CPU data, and `keepcpu` retains the diagnostic path. Regression
fixtures verify these lifetimes as well as exact pre-upload geometry bytes.

Integrated review corrected the Institute's blocked Places camera and claimed
its orphan OSM part `r11736533`, already represented by the joined campus shell.
The park entrance now uses the actual `r15756570` / `r15756569` roof footprints;
these replace duplicate generic pavilions and correct the estimated positions.

The reported green wall at `-1783.8,22.3,4324,377.8,-25.4` was the legacy
4.7 km horizon curtain. Its old protection considered only P/V regions. The far
generator now follows every coverage rectangle and derives its radial search
limit from their corners. A regression audits complete strip chords after
jitter, checks that all coverage stays inside the horizon, and includes a
future distant extension. Clearance from the reported pose changes from 6.07 m
to 3,178.72 m; every chord stays at least 2,007 m outside the current extents.
