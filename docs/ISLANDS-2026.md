# Island completion and Krestovsky start — 2026-10-12

Continue the established Saint Petersburg scene: finish verified Vasilievsky
and Petrogradsky gaps, start Krestovsky, and update the offline coverage map.
Existing island coverage is already complete in the map frame; old handoffs
must be checked against the current source before repeating work.

Three distinct sight authors work on these bounded tasks:

* Vasilievsky: Erarta sculpture visibility, real side-path and visitor fixtures,
  and label reservations in the Kirov Palace/Erarta module.
* Petrogradsky: Mendelsohn's Red Banner power station, historic Sytny Market,
  and Pechatny Dvor, on their mapped building footprints.
* Krestovsky: stadium roof/pylons, eastern metro exterior and Victory Park entry
  details. Real roads, paths, ponds, trees and ordinary buildings come from OSM.

Append K1–K4 after all established map regions. Keep old record IDs and region
ownership through the region-locked OSM bake. The first Krestovsky pass covers
the island frame and authors selected sights; it does not promise detailed
amusement rides, every residential facade or new underground station interiors.

The authoring keeps July daylight, the established cel materials and input,
shared labels, static spatial batching, conservative skyline/tree bounds and
normal baked loading. Road surfaces and furniture obey the generator rules.
No flags, flagpoles, corporate marks or alarm sounds.

Validation: serial integrated old-centre and island walking/driving with normal
loading; nearby, distant and reverse-direction screenshots; region teleports;
car entry, acceleration, brake and exit; roads/markings and focused regressions.
Finish all source edits before the shipping bake, retest the final normal bake,
and commit matching source/assets. Record timings and limitations in
[PERFORMANCE.md](PERFORMANCE.md). The coverage map distinguishes map coverage
from individually authored sight groups.

References and photographic evidence belong in the three author dossiers.
Krestovsky's park context uses the [park operator](https://pppark.ru/about)
and [city administration](https://www.gov.spb.ru/press/government/81600/).
Stadium geometry uses the [operator](https://gazprom-arena.com/technologies/)
and [roof contractor](https://www.iasoglobal.com/es/proyectos-emblematicos/zenit-arena/).

The final frame covers **81.6360 km²** of playable union (+8.1445 km²,
including surrounding water/scenery), with 57 regions, 27,659 building/part
records (+701) and 75,361 road/path pieces (+2,750). All old building IDs and
road pieces remain present. Region locking preserves ownership; 33 formerly
clipped edge-building records acquire completed geometry as coverage grows.
The map contains 370 authored sight groups, separate from ordinary OSM buildings.

Krestovsky uses the full island and Nevka relation outlines, the established
data-ground shader and road-side pavement rules, and road/building-safe natural
park banks. The generic environment retains the six actual park ponds, paths
and tree cover. Geographic validation samples 3,050 shoreline positions,
2,987 dry interior positions and all six ponds, including terrain height.

The new sights add no frame callbacks: Petrogradsky is 97,582 triangles and
17 materials; Krestovsky is 44,720 triangles and 14 materials. Erarta/Kirova
remains 39 meshes and 21 materials after its detail fixes. Photographic
research, module statistics, supported stairs and rejected-label checks are
in [Vasilievsky](research/vo-finish-2026.md),
[Petrogradsky](research/petro-completion-2026.md) and
[Krestovsky](research/krestovsky-2026.md) dossiers.

Full roads/markings pass: zero strict furniture/median/lot/tram violations,
four documented legacy furniture allowances, 992 surface residuals below
the existing 2,170 limit, and 172,685/172,687 solid marking samples covered.
Loader/codec, geometry bounds, region streaming, LOD ranges, shadows,
tree bounds, field-storage queries, driving input and full shoreline/horizon
fixtures pass. Shipping bake **ac5d0c4c385cc03c3e34** contains all three tiers,
514 files and 430.0 MiB gzip; source, generated revision and manifest agree.
Final normal loading passes five destination preloads, 251 bridge-floor
samples, all six park ponds and 32 stadium-plinth samples, with no module,
asset or region failures. The Vasilievsky car accelerates 94 m, brakes to
1 km/h and exits with walking restored. Seventeen integrated views were
rendered and inspected, plus three final close/reverse views. The six-view
depth audit passes at 0.000–0.003% noisy pixels with no listed offenders.
Measured timings and limitations are in
[PERFORMANCE.md](PERFORMANCE.md).

Rendered review corrected Sytny's upper arch backing, the Erarta disc's 8 cm
pedestal gap and the pavilion glass/frieze intersection. The stadium plinth
now has 192 bounded static walking supports inside its actual outer polygon,
outside the glass envelope and clear of asphalt; 1,920 angular/radial floor
samples match the rendered 1.15 m top. These add no geometry or frame work.

The offline map now draws full primary island coastlines, rather than asking
playable rectangles to communicate island shapes. It includes the complete
Vasilievsky outline, a full OSM Petrogradsky relation and full surrounding
Nevka/Neva/Gulf water context. **Острова** fits all three islands; individual
buttons fit each complete outline. Desktop/mobile and keyboard checks pass.
