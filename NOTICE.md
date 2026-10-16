# Notices and credits

## Engine and look: Sakuragaoka Station (MIT)

The rendering engine and the anime cel-shaded look are derived from **Sakuragaoka Station**
(<https://github.com/Kenton-GMI/sakuragaoka-station>, MIT License, Copyright (c) 2026 Sakuragaoka Station contributors),
which is included in this repository as the git submodule `../sakuragaoka-station` and served as the reference for this project
(through the sibling project `../100_3d_moscow_city`, which adapted it first).
The files under `src/core/` (renderer with colour-aware outlines and bloom, toon materials, sky, geometry kit, physics, first-person
player, static batcher, canvas textures, WebAudio synth) and the dev tools in `tools/` (`serve`, `shot`, `check`, `smoke`, `tour`)
started from that project and were adapted. The original licence text is kept in
[`LICENSE-sakuragaoka-station.txt`](LICENSE-sakuragaoka-station.txt).
Everything under `src/world/` (except where a file says it was adapted from the reference) is new work for Saint Petersburg (the sibling projects `../100_3d_moscow_city` and `../101_3d_yakutsk` served as code libraries).

## Map data: OpenStreetMap (ODbL)

Building footprints, levels, roads, crossings, pavements, lawns, water, street furniture, monuments and points of interest come from
**OpenStreetMap** data, (c) OpenStreetMap contributors, available under the
[Open Database Licence (ODbL) 1.0](https://www.openstreetmap.org/copyright).
`src/world/data/city.js` is a derived extract baked by `tools/fetch-osm.mjs` + `tools/bake-osm.mjs`; if you redistribute it, keep
this attribution and the ODbL share-alike terms. `docs/images/plan.*` and `docs/reference/plan-overlay.png` are rendered from the same data.
The extract is registered to a screenshot of Yandex Maps (`docs/reference/yandex-center.png`) that is kept **only as a private
layout reference** for checking the building and street pattern; nothing of it is drawn in the scene.

## Reference photographs

Photographs (mostly Wikimedia Commons, each under its own licence) were used **only as visual references** while modelling (shapes,
colours, proportions, details); no photograph is copied into the repository or the scene.

## Names and brands

Place, street, building and institution names are real. Corporate logos and trademarks are not reproduced: signage uses generic
pictograms and plain wordmarks. This is an unofficial fan visualisation and is not affiliated with the City of Saint Petersburg, the Government
of Saint Petersburg, Russian Railways, the metro, the museums, hotels, shops or businesses that appear in it.
