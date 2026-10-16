# Look: sky, light, grading, palette (Saint Petersburg, July)

Owner files: `src/core/sky.js`, `src/core/timeofday.js`, the `PALETTE` of `src/core/materials.js`, and the grading / fog / bloom constants of `src/core/renderer.js`
(plus the branding of `index.html`). Sources: `docs/research/streets.md` section 7 (sun table, sky colours, night light), `architecture.md` section D (facade colours),
`nevsky.md` / `fontanka.md` / `station.md` / `metro.md` / `transport.md` (colours of the landmarks), and the reference photos `refs/streets/19 22 57 59 62`, `refs/nevsky/21`.
API unchanged: `createSky(scene, sunDir, quality)`, `createTimeOfDay({sky, scene, shared, sunDir, pipeline, overlay})`, `ctx.mat`, `ctx.palette`,
`ctx.shared.uNight / uSkyLow / uSkyMid / uSkyTop / uSunDir`. One new pipeline uniform: `compMat.uniforms.uSat` (saturation, written per preset).

## 1. What it looks like (T key cycles: day -> golden -> night -> overcast -> day)

* **Day (15:20)**: the default start. A saturated mid-blue sky (zenith `#2c6cc4`, mid `#5a92d4`) that turns pale and hazy toward a flat horizon (`#b0cae6`), big puffy
  flat-based cumulus with white tops and blue-grey bases, thin curled cirrus, a clean sun disc with an aureole in the SW (azimuth 222, 45 deg up). Warm-white sun, blue-grey shadows
  (about 35 % of the lit value): the ochre / pink / yellow stucco keeps its photographic colour and glows against the sky. The north side of Nevsky (facades facing SSW) is lit, the south side is in shade.
* **Golden evening (19:10)**: the sun is WNW (azimuth 282, 17 deg up), **exactly along the Nevsky axis** (bearing 283.5): the avenue is back-lit gold looking west, shadows run straight down the street.
  Peach horizon, steel-blue to lilac sky, pink-lit cloud tops and mauve undersides, a pink anti-solar band opposite, more haze (fog 0.00052), long cool shadows, `uNight` 0 (lamps off: sunset is at 22:06).
* **White night (00:20)**: the sun is 7 deg below the north horizon. A deep ultramarine zenith (`#0f2b84`), a violet-blue horizon, a **wide cream-rose glow in the north** (azimuth 349: warm band + a tighter core),
  dark blue-violet clouds with rose undersides toward the glow, no stars, no moon, `uNight` 1: every window and lamp is on. Never black. The directional light is a cool lilac "glow of the north" from the NNW at 12 deg.
* **Overcast (11:20)**: "Petersburg milk": a grey-white stratus veil with soft darker lumps and lighter thin places, lighter and hazier toward the horizon, no sun disc, a diffuse bright patch where the sun hides,
  flat soft light (sun x0.3 of the day, hemisphere 2.4), saturation 0.80 (muted, cool). Streets read soft and tidy, not dull.
* Transitions: every number is interpolated (`k` 0..4, `?tod=0.5` works; `k = 4` is the day again, the T cycle wraps forward), also the light, sun direction, fog, clouds, exposure, bloom, saturation.

## 2. Time-of-day table (`core/timeofday.js` PRESETS)

| | day | golden | night | overcast |
|---|---|---|---|---|
| `tod.clockText()` (minutes then advance with `t / 60`) | 15:20 | 19:10 | 00:20 | 11:20 |
| light `dir` (to the light) | `[-0.473, 0.707, 0.526]` = layout `SUN_DIR` | `[-0.931, 0.292, -0.2]` (az 282, el 17) | `[-0.253, 0.208, -0.945]` (az 345, el 12: glow of the north) | `[-0.159, 0.788, 0.595]` (az 195, el 52) |
| true sun for the sky (`sky:`) | = dir | = dir | `[-0.189, -0.122, -0.974]` (az 349, el -7) | = dir |
| sun colour / intensity | `#fff8ee` / 2.1 | `#ffc88a` / 2.1 | `#aab8f0` / 0.95 | `#f2f0ec` / 0.65 |
| hemisphere sky / ground / intensity | `#b0c6ea` / `#cbb99e` / 1.9 | `#9aa6dc` / `#d6a98a` / 1.7 | `#88a0e0` / `#7a7490` / 1.9 | `#b3c3de` / `#aaa49c` / 2.4 |
| zenith / mid / horizon | `#2c6cc4` / `#5a92d4` / `#b0cae6` | `#3a62b6` / `#7f98cc` / `#eac3a4` | `#0f2b84` / `#2c52ae` / `#7580b8` | `#97a4bb` / `#b6c0d0` / `#d9dde3` |
| warm band (toward the sun azimuth) / strength | `#fff0d0` / 0.28 | `#ffb070` / 0.8 | `#f6c8b2` / 0.95 | `#f4efe6` / 0.22 |
| fog colour / `FogExp2` density | `#b0cae6` / 0.00042 | `#e6c3a6` / 0.00052 | `#5e6a9e` / 0.00058 | `#d1d7df` / 0.0005 |
| `uNight` | 0 | 0 | 1 | 0 |
| exposure / bloom / glow / leak / vignette / threshold / saturation | 1.0 / 0.26 / 0.10 / 0.8 / 0.18 / 1.05 / 1.02 | 1.02 / 0.36 / 0.18 / 1.15 / 0.22 / 0.95 / 1.10 | 1.2 / 0.5 / 0.3 / 0.3 / 0.28 / 0.85 / 1.05 | 1.0 / 0.14 / 0.10 / 0.15 / 0.24 / 1.1 / 0.80 |
| cumulus / cirrus / stratus veil / anti-solar band | 0.64 / 0.5 / 0 / 0 | 0.5 / 0.55 / 0 / 0.35 | 0.32 / 0.4 / 0 / 0.2 | 0 / 0 / 0.92 / 0 |

* Sun path (docs/research/streets.md section 7, 15 July): 15:00 az ~219 el 46, 19:10 az 282 el 17.8, 21:00 az 305 el 5, sunset 22:06, midnight az 345 el -7.6.
  Azimuth / elevation -> vector: `x = sin(az) cos(el)`, `y = sin(el)`, `z = -cos(az) cos(el)` (+X east, -Z north).
* **Light budget** (three r170 toon, lit wall = albedo x (sunI / pi + hemiI x skyLuma / pi)): day lit ~1.05 x albedo, shade ~0.37; so **palette hex values are lit, photographic colours**: a sunlit wall comes out within a few % of its hex,
  and the shade side is a cool blue-grey. Nothing in the pipeline raises saturation on sunny days (1.02).
* **uNight contract** (unchanged): `ctx.shared.uNight.value` 0 = day ... 1 = night, smooth. Windows, lamps (`lamps` ramp in from 0.05 to 0.55), signs and facade up-lighting key off it. Golden = 0 (lamps off), the white night = 1;
  between golden and night the lamps and windows come on progressively (k 1.1-1.6).
* `tod.set('day'|'golden'|'night'|'overcast'|0..4, instant)`, aliases `dusk`, `evening`, `sunset` -> golden, `white` -> night, `cloudy` / `grey` / `milk` -> overcast; `tod.cycle()` (key T) returns the label,
  `tod.label`, `tod.k`, `tod.target`, `tod.clockText(simSeconds)`, `tod.setVariant(name)`, `tod.variant`, `tod.setSeason(name)`. URL: `?tod=...`, `?look=overcast|cloudy`.
* Indoor zones: `overlay.apply()` still runs at the end of every `apply(k)` (`node tools/under-test.mjs` passes, 55 checks).

## 3. The sky shader (`core/sky.js`, one dome)

Layers, bottom to top, all driven by uniforms that `timeofday.js` writes:

1. gradient `uHorizon -> uMid -> uZenith` (smoothsteps at elevation 0..0.24 and 0.12..0.92 of `sin(el)`), a pale haze band `uHaze * exp(-11 el)`, at night the horizon away from the sun is darkened by `0.30 * uNight`;
2. a warm band toward the **azimuth** of the sun plus a tighter, lower core (`pow(az, 14)`): works with the sun below the horizon (the cream-rose glow of the white night); a pink anti-solar band (`uAnti`, `uAntiAmt`);
3. sun aureole + disc (`uDisc`, radius 1.2 deg), moon (`uMoon`, off in all presets), stars (`uStars`, off);
4. **cirrus**: a plane at "altitude 6", two domain-warped anisotropic noise layers, patchy coverage, alpha <= 0.42;
5. **stratus veil** (`uOvercast`): two noise scales (broad lumps + finer streaks), `lump` darkens soft stratocumulus, `thin` lightens, lighter / hazier toward the horizon, a diffuse bright patch toward the sun (`uCloudGlow`);
6. **cumulus**: a height field marched through a layer (8 steps + 5 bisection steps; `CUM_STEPS` = 5 on `?q=low`). Inside the cloud where `fbm4(p) - thr > y^2 / 3`. **Footprint `CSC` 1.35** (big puffy clouds) and the
   footprint growth from base to top **`CPAR` 0.42** (the Yakutsk value 0.9 sheared the stack into "totem" layers at low elevations). Shading from the field's normal: lit tops, shaded sides, flat underside, warm rim toward the sun;
7. below the horizon the dome is the fog colour.

Drift: cumulus 0.0025 units/s, cirrus 0.0012, stratus 0.0022. Everything is a pure function of `t`.

## 4. Fog and the far field

`scene.fog = FogExp2`, colour = `uFog` = the horizon colour of the sky (identical hex in the day preset). `fog = 1 - exp(-(density x distance)^2)`:
day 0.00042 -> 500 m 4 %, 1 km 16 %, 1.5 km 33 %, 2 km 51 %, 3 km 80 %. The Fontanka bridge (1.05 km from Vosstaniya Square) is clearly visible, the far roofline melts into the horizon colour.
Golden 0.00052 (1 km 24 %): looking into the sun the avenue glows. The environment far scene fades with the scene fog density.

## 5. Grading constants in `renderer.js`

`uBloom 0.26`, `uGlow 0.10`, `uVignette 0.18` defaults (= the day preset) and **`uSat` 1.06 default** (a new uniform: saturation, per preset 0.8 ... 1.1); shadow cooling `vec3(0.90, 0.93, 1.10)` at strength 0.55
(was 0.88 / 0.91 / 1.12 at 0.6: the Yakutsk values made the Petersburg shade too navy); highlight warmth `(0.016, 0.009, -0.008)` (was 0.026 / 0.014 / -0.014: warm stucco must not turn orange). Outline colour, fade distance and
strength unchanged. Per-time-of-day exposure / bloom / glow / leak / vignette / threshold / saturation live in the preset table.

## 6. Palette (`core/materials.js` `PALETTE`, `ctx.palette`; ~430 keys)

Every key of the Yakutsk palette is kept (copied code reads them) with Petersburg values; the legacy tree keys hold July greens (`birch #5f8a3a`, `lindenGold #6a9a3e` = lime, `mapleOrange #5e9a35` = Norway maple, `mapleRed #3f6b2a` = poplar).
The Petersburg keys ("pb") are below; all hex are albedos (lit photographic colours, see the light budget). Sources: A = architecture.md D, N = nevsky.md, F = fontanka.md, S = station.md, M = metro.md, T = transport.md, R = streets.md.

| group | keys (hex) and where used |
|---|---|
| stucco field colours (A, N, F) | `stuccoOchre #dbb060` (21 % of houses, Nevsky 84), `stuccoPaleYellow #e6d28f`, `stuccoTerracotta #c56e4c` (Marata 50, Palkin), `stuccoSalmon #dca08f`, `stuccoDustyRose #d9a99a` (Menyaev 92, Yakovlev 96), `stuccoRose #d98a82`, `stuccoMint #b8d4bc` (Bryun 82), `stuccoGreyGreen #a9b8a1`, `stuccoPeach #e9b896` (San Remo 90), `stuccoSand #d6c29a`, `stuccoOrange #dea060`, `stuccoOrangeBrown #c98b5f` (Nevsky 75), `stuccoGreyOlive #c9c7a8` (Lopatin 100), `stuccoOliveYellow #c7bf7a`, `stuccoPaleBlue #9fb4c2`, `stuccoGreyBlue #aab2c0` (Shuvalov Palace), `stuccoGreyLilac #b7ada8` (Rossiya 61), `stuccoCoral #d98671` (Beloselsky palace), `stuccoWhite #e3e0d6`, `stuccoSoot #6e6760`, `stuccoBrick #a8573f` |
| trim, stains | `trimCream #e8dcc4`, `trimWarmWhite #f1ece0` (= `trimWhite`), `corniceShade #bda98a`, `rusticShade #b09c80`, `stainBrown #a8957a` |
| windows, doors, shops | `windowFrameBrown #6a4a35`, `windowFrameWhite #f0efe9`, `windowFrameGreen #4d5a52`, `windowGlass #2e3c46` (dark blue-grey by day), `windowSkyGlass #6fa3d4`, `windowDark #2a3140`, `doorBrown #4a2f26`, `doorStation #7a4f2b`, `doorMetro #8c5a32`, `gateDark #2a2622`, `awningRed #8c1d2e` (dark red awnings), `awningRedValance #6d1523`, `awningGreen #2f5d3a`, `awningCream`, `shutterBrown #5a3b2c`, sign fascias `signRedFascia #c8202a / signOrangeFascia #f28c00 / signGreenFascia #1d8f4c / signBlueFascia #1b4fa8`, `signBandDark`, `signBandCream`, `pharmacyGreen #2fb35a` |
| granite (R, F, S) | quay `graniteQuay #8b8783`, `graniteQuayPink #9a8077`, `graniteQuayDark #5b5a58`, `graniteCoping #a49a95`, `graniteWaterline #4c4f4d`; pavements `granitePavement #9b9a95` (Nevsky slabs), `granitePavementPink #a99b95`, kerbs `graniteKerb #8c8f92`, `graniteStrip #5d5f62`, `graniteRedStrip #8c6b66`; Anichkov Bridge `graniteRed #b98c7e`, `graniteRedLit #cf9d8c`, `graniteRedDark #8e5b43`, `graniteRedPolished #b3685c` (Klodt plinths), `granitePylon #a89a96`; `graniteStation #8a8b88` (station plinth), `graniteObelisk #7f6e66`, `graniteSquare #858177`, `graniteInlay #4a3f3a`, `graniteGuardStone #9a8b86`, `graniteShopPlinth #6a3a38` (dark red granite shop plinths) |
| asphalt, setts, paving (R) | `asphalt #5a5e61` (worn mid), `asphaltDark #3f4448`, `asphaltLight #7a7f7f`, `asphaltFresh #34383b` (re-asphalted east Nevsky), `asphaltWorn #6a6e6f` (wheel tracks), `asphaltPatch #2e3b43`, `asphaltBleach #969e9a`, `asphaltBridge #5a5d60`, `sett #8a8d8f`, `settDark #6f7377`, `settBrown #7d7a76`, `pavingBrick #8a4f46`, `courtyardBrick #8a5a4a`, `crushedBrick #99765f` (garden paths), `stationForecourt #b6a89e`, `manhole #6b5546`, `kerbYellow #e8c32a`, `zebraWhite #f2f2f0`, `zebraBrick #a14a3a` |
| sheet-iron roofs, chimneys (A) | `roofSheetSilver #9ba0a3` (50 %), `roofSheetGreen #5a7a63` (25 %), `roofSheetRed #8b4a3d` (25 %), `roofSheetGreenBright #4d8a5e` (mansards), `roofSlate #4a4a52`, `roofDarkMetal #3c3a3b`, `roofLibrary #4a7a4d`, `chimneyBrick #b4523c`, `zinc #9a9ea0` (downpipes), `downpipeYellow #f0a800`, `downpipeGreen #4d8a5e` |
| black cast iron, bronze (R, F) | `ironBlack #1b1f20` (lamps, chain bollards, guard rails), `ironFontanka #202428` (quay railing), `ironTealGreen #243d38` (lamp pedestal), `ironFenceGreen #2e5a3d`, `ironFountainFence #25382d`, `lampGlobe #f2efe4`, `lampLed #ffb875` (3000 K), `facadeUplight #ffc880`, `shopWindowWarm #ffdcb8`, `bronze #5a4a36`, `bronzeDark #2f332f`, `bronzeKlodt #33372f`, `patina #56695c`, `patinaLight #6f9079`, `bridgeGreen #4d7b66` (mermaid railing, lit `#6f9079`), `bridgeGreenDark #3f5a50`, `gold #c9a24b`, `goldBright #e3b53c` (obelisk star), `goldFinial #d4aa3c` |
| Moscow Station + square (S) | `stationSand #e3c288` (lit wall), `stationSandShade #cfa865`, `stationWhite #f3efe4` (columns, pilasters, trim), `stationRoof #3c3a3b`, `stationTowerRoof #4a4a52`, `stationLightHallRoof #5d6b4c`, `stationLetters #e6e9ed`, `stationWing #e0bc7f`, `metroRotunda #e6d49a` (cream-yellow rotunda), `hotelOktyabrskaya #d9bda3`, `hotelLigovsky #b9bec2`, `obeliskHedge #4e7a3a`; platforms `stationPlatform #55555a`, `stationPlatformStrip #6f6f73`, `stationMaroon #6f1d2b` (canopy column base), `stationYellowLine #f2c500`, `stationSignGreen #4c5a44`, `stationSignRed #c8252c`; hall `stationHallFloor #77746f`, `stationHallWall #b7a98c`, `stationHallCeiling #b8b5ae`, `stationHallFarWall #b8786a` |
| rail, rolling stock (S) | `ballast #6c6c6e`, `ballastDark #555558`, `sleeper #b9b7b0` (concrete), `railSide #6b5648`, `railTop #b8bcc0`; `sapsanWhite #f2f4f6`, `sapsanRed #d9452f`, `sapsanBlue #2e5a9e`, `redArrow #b3162a`, `redArrowSilver #b9bec2`, `rzdRed #d2232a`, `rzdGrey #8c8f94`, `locoRed #d71920`, `locoStripe #d9c530`, `elektrichkaGreen #4c7a46`, `elektrichkaOrange #e38b2d` |
| road transport (T) | `trolleyBlue #1f7fd6` (new PKTS), `trolleyBlueOld #2a74c8` + `trolleyWhite #f2f2f2` (white-and-blue BKM), `trolleyNavy #12304f`, `busTurquoise #5fc4b8` ("lazur"), `busWindow #17181a`, `taxiWhite #f2f1ec` + `taxiYellow #f6c200` (stripe), `cityTourRed #d8352a`, `cityTourPurple #3b2f7a`, `policeBlue #1d4fa0`, `ambulanceRed #d8262e`, `tramRed #b52a2a`, `scooterYellow #f6c200`; cars `carWhite #eceae4`, `carSilver #b9bcbf`, `carGrey #5a5e63`, `carBlack #1d1f23`, `carRed #a52a2b`, `carBlue #2c4a86`, `carBrown`, `carGreen`, `carOrange #c9622a` |
| metro (M) | **lines** `metroRed #d6083b` (L1), `metroBlue #0078c9` (L2), `metroGreen #009a49` (L3), `metroOrange #ea7125` (L4), `metroViolet #702785` (L5), `metroBrown #9c5b2a` (L6): verified against metro.md; sign `metroM #1795d4` (street "M"), `metroMDark #1f4e9e`, `metroMGlow #36b6ee`, `metroSignBlue #1d4e9b` (direction boards), `metroExitGreen #0a8f4d`, `metroTactile #f2c500`; **marbles / fittings** Vosstaniya `metroMarbleRed #8e3a2f`, `metroPlaster #eee7d4`, `metroCeiling #e9e1c9`, `metroFloorRed #9b4f3f`, `metroGold #c9a24b`, `metroBronze #5a4630`, `metroSkirt #181820`, `metroGrilleNavy #1e2a55`; Vladimirskaya / Gostiny `metroMarbleWhite #efeae0`, `metroMarbleCream #d9cdb0`; Mayakovskaya smalt `metroSmaltRed #b22a1e` -> `metroSmaltOrange #d4452a`; floors `metroGraniteFloor #8a8a86`, `metroFloorDark #5a5a5e`, `metroFloorPink #a9604f`; Dostoevskaya `metroColumnPink #6e5f58`, `metroLimestone #a9a08a`, `metroLantern #1a1a1a`; `metroSteel #b8bcc0`, `metroEscalatorLight #fff2c8`; **cars** `metroCarGrey #c9cdd0`, `metroCarRed #e4232b` (Baltiets), `metroCarBlue #1e58c8` (Yubileiny), `metroCarTeal #3d7ba0` + `metroCarCream #e6d6a8` (L4), seats `metroSeatBlue #233680`, `metroSeatBrown #5b4a3e`, `metroSeatPink #b3615c` |
| street furniture (R) | `streetPlate #1c2a5a` (navy name plates: dark blue, white text; photo-checked on `refs/streets/37`), `streetPlateRim #2d4a32` (dark-green rim), `streetPlateText #f2f2ee`, `trafficBlue #1a58a8`, `signFluor #c4dc1c` (crossing-sign border), `signRedDisc #d3232a`, `priorityYellow #f2c230`, `kioskGreen #2f4f43`, `adPillar #2e3236`, `benchSlat #b8793a`, `binGreen #2f5d3a`, `binGrey #6f7377`, `scaffoldNet #2f6b3d`, `worksOrange #e8692a`, `galleryGreen #3f7a52` |
| water (F) | `fontankaWater #27507f` (deep blue in sunshine), `fontankaWaterShade #4a4a37` (olive in shade), `fontankaWaterRipple #7fa8e0`, `fontankaWaterCloudy #4d5f6a`, `waterFoam #e8eef0`, `nevaWater #4e6f94` |
| July vegetation (R) | lime `limeLit #86b04a / limeMid #4f7a2e / limeShade #2d4a22`, `limeHighlight #b5c860`, `limeBark #3d3328`; Norway maple `mapleLit #8fbf55 / mapleMid #5e9a35 / mapleShade #3a6a26`, `mapleBall #5fae3a` (clipped ball crowns at the Oktyabrskaya hotel); oak `oakLit #7a9a42 / oakMid #4a6e2c / oakShade #2c4720`; poplar `poplarMid #3f6b2a`, `poplarUnder #8aa68a`; `chestnutMid #3f6a3f`, `hedgeBox #4e7a3a`, `hedgePrivet #3f6a30`, `creeperRed #a8322a`, `ivyGreen #3a6a30`, birch bark `#d9d4c7`, blue spruce `spruce #3f6b66` (Anichkov garden); lawns `lawn #5f8f2a`, `lawnLit #7aa83a`, `lawnDark #3f6a22`, `lawnDry #7a9a3a` (the Yakutsk `lawnStraw*` keys hold lawn greens too); flowerbeds `petuniaPink #e0457b`, `petuniaLightPink #f08cb4`, `geraniumRed #d0242e`, `petuniaWhite #f5f1f0`, `lobeliaBlue #5a6fd0` |
| far field | `ridge #7b8798` (far roofline of the city), `taiga #4f6a45` (far suburban green), `taigaHaze #7a8a9a`, `lenaWater #4e6f94` (Neva), `lenaBank #5c5b57` (granite embankment), `farHaze #a9bfd8` |

Albedo rule: the hex values are albedos (a sunlit wall comes out ~1.05 x); keep new accents <= ~0.92 brightness; the darkest albedo is ~`#1b1f20` (black cast iron) and the outline ink is `#33384a`.
Most-used stucco colours are ~60 % saturated: they are the photographic values (Nevsky 83 pink `#e29a8c`, station `#e3a940` in evening sun), not toned down.

## 7. Variants and a later winter

* `VARIANTS` in `timeofday.js` are shallow overrides merged over the preset table (`xName` keys multiply): `overcast` (a stratus veil over whatever the preset is: sun x0.35, hemisphere x1.12, grey sky, saturation 0.88)
  and `cloudy` (cumulus 0.8, sun x0.8). `?look=overcast`, `tod.setVariant('overcast')`. The overcast **preset** (T key, `?tod=overcast`) is the fully tuned version.
* `SEASONS` maps a name to a preset table (`summer` now); a winter = one more table + `tod.setSeason('winter')` (ideas as in the Yakutsk document: ice fog, low sun, snow ground; the sky shader needs no change).
* Not built: rain / storm (the research mentions dark violet clouds with a golden slit of light on the facades, `refs/streets/50`, and a rainbow: one more table row + a wet-asphalt material on the streets side).

## 8. Verification (shots in `shots/look/`, git-ignored)

A temporary test street (`src/world/looktest.js`, deleted again) with stucco houses in 12 palette colours, white trim, granite quay and pylon, a bronze group, lamps, vehicles, limes; day / golden / night / overcast at k = 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5,
street level (eye 1.7 m) looking west and east, free cameras at the sky; compared with refs `streets/19` (clear day, Vosstaniya Sq), `streets/22` (milk), `streets/57` (white night), `streets/62` (evening on the station tower), `nevsky/21`.
`node tools/under-test.mjs`: RESULT OK (55 checks); T-cycle and `?tod` aliases checked in node (k wrap 4 -> 0, clock text 15:20 / 19:10 / 00:20 / 11:20).
Known limits: cumulus edges are soft (no hard cel edge), cumulus bases can look slightly terraced at very low elevation; the fog colour is one colour for all directions, so the north glow of the white night is not echoed by far
geometry (a seam of dim fog under the cream horizon in the north); the real streets / city modules were still empty when this was tuned, so the palette was checked on the test street only.
