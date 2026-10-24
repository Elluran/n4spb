# intro-draft.html: how it is built

`maps/intro-draft.html` is a single self-contained page (data embedded, no network): a draft of the START MAP of the app, where a visitor picks the part of Saint Petersburg to walk in.

* **Areas** = the 111 real municipal districts (`admin_level=8`, the "okrugs") of the federal city and its towns, coloured by the 18 real city districts (`admin_level=5`). Their borders follow streets, rivers and canals (OpenStreetMap).
* **Size classes** against area B (the North, 3.947 km2): `b` = B +-20 % (3.16-4.74 km2), `large` = up to 1.5 x B (can stay), `big` = more (to split, `split` = about area / B), `small` = less than B -20 % (to merge; `mergeGroup` pairs small neighbours so the sum is close to B).
* Land area is rasterised (40 m cells) from the OSM polygons minus the sea (coastline) and inland water.
* A and B (the scenes that exist today) are drawn as dashed rectangles from `src/areas/registry.js`.

## Rebuild

```
cd maps/intro-draft-src
node fetch.mjs            # (optional) the base layers of the earlier map: coast, districts, boundary, rivers, water, roads, c_* ; cached in ./raw
node fetch2.mjs           # municipal districts, places, main roads (Overpass); cached in ./raw
node build-intro.mjs      # -> intro-data.json (git-ignored)
node assemble.mjs         # -> ../intro-draft.html
node shot-intro.mjs out "" 1500 900   # a PNG of the page through Edge (puppeteer-core from the repo's node_modules)
```

`raw/` and `intro-data.json` are git-ignored (about 25 MB of Overpass responses). Data: OpenStreetMap contributors (ODbL).
