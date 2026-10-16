# Calibration of `yandex-center.png`

Machine-readable result: `calibration.json` (same folder). Everything is in the local frame of `src/world/data/city.js`:
metres, **+X east, +Z south (-Z = north)**, origin `ORIGIN` = 59.932421 N, 30.351279 E (the `ll` of the Yandex URL), no rotation (the screenshot is north-up).

## Result

| | |
|---|---|
| image | 1528 x 955 px, north up |
| scale | **0.9344 m / px** (1.0702 px / m); isotropic, no rotation |
| pixel of the local origin (0,0) | **u = 636.0, v = 430.4** |
| pixel -> world | `x = (u - 636.0) * 0.9344`, `z = (v - 430.4) * 0.9344` (i.e. `x = 0.9344 u - 594.3`, `z = 0.9344 v - 402.2`) |
| world -> pixel | `u = x / 0.9344 + 636.0`, `v = z / 0.9344 + 430.4` |
| ground covered (exact) | x -594.3 ... 833.5 (1427.8 m), z -402.2 ... 490.2 (892.4 m) = 1.27 km2 |
| image centre in world | (119.6, 44.0) |
| **PLAY** (the walkable rectangle, rounded out to 5 m, extended south for the station) | **x -595 ... 835, z -405 ... 860** (1430 x 1265 m = **1.81 km2**) |
| **EXTENT** (PLAY + 120 m of scenery) | x -715 ... 955, z -525 ... 980 (1670 x 1505 m = 2.51 km2) |
| hand-read residuals, 8 street crossings | rms 1.0 px = 0.9 m, max 1.4 px = 1.3 m |

The screenshot is **not centred on ORIGIN**: the `ll` of the URL falls on pixel (636.0, 430.4), on the roadway of Nevsky Prospekt between Liteyny and Mayakovskogo (opposite house 84-86); the centre of the crop (764, 477.5) is at world (119.6, 44.0), 128 m east-south-east of ORIGIN. Suggested player spawn:
Vosstaniya Square in front of the Moscow Railway Station (about x 560, z 190, the Hero City obelisk stands at (592, 165)); the origin itself is on the Nevsky roadway.

Corner coordinates of the ground (lat, lon): NW 59.93603, 30.34065; NE 59.93603, 30.36619; SW 59.92802, 30.34065; SE 59.92802, 30.36619 (`unproj()` in `tools/osm-lib.mjs` converts any point).

## How it was done

1. **Guess.** Web-Mercator at 59.93 N and zoom 15.78 is 1.393 m per CSS pixel; a Windows display scale of 150 % gives 0.929 m per device pixel. The screenshot
   is therefore at a pixel ratio of ~1.5 and the scale was treated as unknown. A first OSM extract (all `highway` ways, +-1500 m around ORIGIN) was rasterised and
   cross-correlated (OpenCV, blurred masks) with the Yandex road mask at scales 0.90 ... 1.12 m/px: one sharp maximum at **0.93 m/px**, origin pixel (635, 431).
2. **Registration (road centre lines).** The Yandex carriageways are a single flat colour (`#c0c7d5`, `#d5dae3` for small streets). Along the normal of every 4 m sample of
   the OSM centre lines (primary / secondary / tertiary / residential / unclassified / living_street, no bridges / tunnels; 2 600 usable samples after dropping junctions
   and runs touching the search window) the run of road-coloured pixels was measured and its centre compared with the predicted position. Scale and translation were solved
   by robust (Huber IRLS) least squares: **0.9339 m/px, origin pixel (635.06, 429.90)**, residual MAD 2.9 px (mostly the dual carriageways of Nevsky / Ligovsky / Vladimirsky,
   which Yandex draws as one wide band, and the difference between the Yandex drawing and the OSM centre line). Six sub-regions fitted separately differ by +-1.5 px in translation
   (mean shift of the final transform relative to this fit: 0.7 px).
3. **Independent check with the buildings.** Rasterising the baked building outlines and correlating them with the Yandex building colours (`#e8e0db`, pink `#f4dae2`, lavender)
   gives (coordinate descent on the overlap score, 0.73) **0.9349 m/px, origin pixel (635.81, 431.65)**: 0.1 % in scale, 0.8 px / 1.8 px in translation from the road fit.
4. **Hand check on street crossings.** Eight crossings of narrow streets were read by eye on 10x crops of the screenshot with the OSM centre lines drawn on top
   (where the middle of each Yandex road band crosses relative to the OSM junction; reading accuracy ~ +-1 px). The mean offset (+0.6, -0.4 px) was taken into the final
   translation (`u0 = 636.0`, `v0 = 430.4`; the three independent estimates agree within 1 px and the scale within 0.1 %):

| # | intersection | OSM x, z (m) | pixel read | pixel predicted | error |
|---|---|---|---|---|---|
| 1 | Поварской переулок x Стремянная улица | 69.1, 175.4 | 710.1, 617.2 | 710.0, 618.1 | 0.9 px |
| 2 | Графский переулок x улица Рубинштейна | -356.0, 192.8 | 254.9, 637.1 | 255.0, 636.7 | 0.4 px |
| 3 | Лиговский переулок x Пушкинская улица | 321.4, 391.0 | 980.0, 850.2 | 979.9, 848.8 | 1.4 px |
| 4 | переулок Ульяны Громовой x улица Восстания | 496.7, -211.1 | 1168.4, 204.9 | 1167.6, 204.5 | 0.9 px |
| 5 | Дмитровский переулок x Стремянная улица | -37.7, 149.5 | 596.6, 590.3 | 595.7, 590.4 | 0.9 px |
| 6 | Владимирский проспект x Графский переулок | -204.6, 248.8 | 417.2, 696.1 | 417.0, 696.7 | 0.6 px |
| 7 | Дмитровский переулок x Колокольная улица | -99.1, 399.7 | 529.3, 857.0 | 529.9, 858.1 | 1.3 px |
| 8 | Колокольная улица x Поварской переулок | 7.1, 435.8 | 642.5, 897.2 | 643.6, 896.8 | 1.2 px |

   rms 0.99 px (0.9 m), max 1.4 px (1.3 m). The reading accuracy is of the same size as the residual, so the transform is a pure scale + translation (similarity with rotation 0)
   accurate to about +-1.5 px (+-1.4 m) over the whole picture.
5. **Check.** `docs/reference/plan-overlay.png` draws the baked building outlines (magenta), parts (orange), road centre lines (cyan), rails (black), platforms (blue), Fontanka
   polygon (light blue), metro tunnels / entrances (violet) on the screenshot with this transform (`node tools/plan.mjs`). Looked at in four places at 3x-5x: Anichkov Bridge
   and the Fontanka quays, Mayakovskaya (entrance ring inside the Yandex "M"), Vosstaniya Square (obelisk, Hotel Oktyabrskaya, crossing of Nevsky / Ligovsky), the Moscow
   Railway Station (the L-shaped concourse parts, the train hall and the platform heads fall on the grey Yandex footprint within 1-2 px).

Why 0.9344 m/px: Yandex's zoom 15.78 gives 1.393 m per CSS pixel at this latitude; 1.393 / 0.9344 = 1.49, i.e. the screenshot was taken at a device pixel ratio of 1.5.
The scale comes from the OSM geometry, not from that formula.

## PLAY and EXTENT

* The screenshot ground (x -594.3 ... 833.5, z -402.2 ... 490.2) is inside PLAY on every side.
* The Moscow Railway Station complex: the concourse (Nevsky 85, building:parts from z 245 to 340, clock tower at (602, 246)), the train hall (z 340 ... 420), the heads of the six
  platforms (z 414 ... 484) and 380 ... 440 m of platforms and tracks beyond them end inside PLAY (z1 = 860); the platforms run on to z 936 ... 1055 (520 ... 640 m long) which is
  in the scenery ring only for z <= 980. `PLAY.z1 = 1060` would contain them completely (2.09 km2) - a one-line change in `tools/osm-lib.mjs` plus `node tools/fetch-osm.mjs && node tools/bake-osm.mjs`.
* Hotel Oktyabrskaya (Ligovsky 10, centre (648, -1)) and the whole of Vosstaniya Square (obelisk (592, 165), metro vestibule (516, 92)) are inside.
* The Anichkov Palace (x ~ -640) and the Fontanka west of x = -595 are in the scenery ring only (the Anichkov Bridge deck, x -475 ... -409, z -120 ... -65, is inside PLAY).
