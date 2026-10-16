# Belinsky Bridge and its neighbouring landmarks

Implemented 2026-10-04 from the user's five street/river photographs and the
existing OSM parcels. The scene's toon materials and lighting remain in use;
these are architectural exterior reconstructions, with simplified sculpture.

- **Bridge:** mapped centre (-452, -628.35), bearing 78.3°, width 19.06 m.
  Three genuine arch openings, two granite piers with triangular cutwaters,
  a green cantilever fascia, open iron railings and rectangular pier parapets.
  Its bank-fitting deck includes separate raised sidewalk floors. The dedicated
  deck service is used by walkers, traffic, people and the player's car.
  The bridge claims its OSM road and sidewalk ways to avoid duplicate surfaces.
- **Circus:** claims w28691685, replaces the generic block with a circular arena,
  a ribbed grey dome and lantern, yellow/white front with three statue niches,
  cartouches, cornices, attic crests and an iron entrance canopy. The arena dome
  diameter is 49.7 m. The entrance plaza and steps have walking floors.
- **Church of Simeon and Anna:** claims w96148838 and the corner chapel
  w96148878. Yellow/white façades, arched windows, pilasters, entrance pediment,
  dark dome and lantern, western bell tower with clock, needle spire and crosses.
  The bell tower's overall height is 47 m.

Primary references: [Mostotrest bridge description](https://mostotrest-spb.ru/bridges/belinskogo),
[circus history and dome span](https://www.circus.spb.ru/about.html),
[Visit Petersburg church description](https://visit-petersburg.ru/leisure/tp-14dopolnitelnye-obekty/tp-197025-tserkov-simeona-i-anny/).
Smaller ornaments, statue poses and intermediate vertical dimensions are
approximations from the supplied photographs, rather than survey measurements.

## Access fix and verification

The Fontanka quay formerly used unsplit 9 m collision segments. At Belinsky,
one segment extended across each end of the northern sidewalk. Explicit bridge
edge splits now apply on the Fontanka too, while Anichkov retains its existing
polygon-based gap. The bridge's railing colliders stop walkers at the river edge.

Run `npm run belinsky` for the focused real-GPU scene or
`npm run belinsky -- --full` for the complete scene. This checks:

- six walking crossings (road and both sidewalks, both directions), without
  falls, rescue teleports or obstacles;
- driving in both directions, with car height tracking the deck;
- railing containment and rejection of adjacent open river as a road surface;
- landmark claims, services and scene module errors.

The tool captures bridge, circus, church and dome views into the system temporary
directory by default. Use `--out <prefix>` to choose another screenshot location.
Both focused and full-scene runs passed in Edge / D3D11 at 1280×720, medium
quality, RTX 3090 Ti. `tools/layout-test.mjs` and the headless builds of city,
landmarksBelinsky and bridges passed. City still reports its existing triangle
budget warning. No new dependencies or raster art assets were added.
