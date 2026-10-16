# Sevkabel cultural-place detail pass

Requested 2026-10-11: enrich the buildings, installations, food trucks, restaurants,
cafés and lighting; make the main hall walkable with an actual fair inside.

## Reference and interpretation

The existing footprint, eleven river-side ribs, murals, gantry and industrial skyline
remain the architectural reference from `research/sevkabel.md`. Local reference
photos 007/008 show the industrial interior, green steel structure, yellow seating,
wooden stairs and market tables; 031 shows rounded food trailers with open serving
windows and bulbs; 021/022 show café tables, spool lamps and festoons across the yard.

The [official venue guide](https://sevcableport.ru/) describes the former production
hall as an events/exhibition/retail space, the food court with outdoor terraces,
and recurring markets. The [official programme](https://sevcableport.ru/afisha/)
includes fairs, exhibitions, concerts and workshops. This pass authors a timeless
summer craft fair, rather than claiming to reproduce a specific dated event or
tenant plan. Plain Russian descriptive signs replace commercial logos.

## Implementation checkpoints

1. Record the reference, scope, existing normal-bake baseline and routes.
2. Build the walkable hall and fair, then exterior dining/activity details; verify
   geometry, entrances, walking routes, labels, roads, markings, rendered day/night
   views and integrated performance. Re-bake all shipping qualities, verify the
   manifest, then commit source and generated products together.

Door openings and their wall colliders must derive from one shared plan. Keep a
continuous central aisle, transverse paths, the inner alley and quay route open.
Indoor walls and a ceiling must have inward-facing geometry. Use the engine indoor
zone for warm lighting, shared sign atlases, immutable static batching and bounded
instances for repeated bulbs. Avoid new city-wide simulation callbacks.

## Reproducible integrated baseline

Full scene, normal shipping bake, headless Edge/D3D11, 1280 × 720, medium quality,
20 seconds of W input, serial runs, no profiler or mid-run screenshots:

```powershell
node tools/drive-bench.mjs --q medium --seconds 20 --start "498.2286,135.1625,76.0322" --json --diagnostics --out shots/sevkabel-culture/before-centre-drive
node tools/drive-bench.mjs --q medium --seconds 20 --start "-5992.65,943.58,-112.4875223" --json --diagnostics --out shots/sevkabel-culture/before-sevkabel-drive
node tools/drive-bench.mjs --walk --q medium --seconds 20 --start "501.2759,160.9113,76.0322" --json --diagnostics --out shots/sevkabel-culture/before-centre-walk
node tools/drive-bench.mjs --walk --q medium --seconds 20 --start "-6153.9251,888.4419,-127.0016144" --json --diagnostics --out shots/sevkabel-culture/before-sevkabel-walk
```

After implementation, repeat with `after-` output names against the final normal
bake. Results and limits belong in `PERFORMANCE.md`.

## Implemented content and focused verification

The main hall has three permanent open doors (sea-square gable, pier-plaza gable,
inner alley), a continuous 10 m central aisle, 24 stocked craft stalls, ceramics,
book/zine shelves, framed prints, clothing rails, jewellery and flower displays,
posed vendors/visitors, a pottery-workshop table, a print gallery, coffee counter,
yellow lounge seating, exposed green structure, pendant lamps and indoor festoons.
The programme board and workshop use the existing E/panel/Escape controls.

Outside: three rounded food trailers with open hatches, menus, counters and vendors;
five restaurant/café fronts with reserved signage/awnings and terrace tables;
picnic seating and planters, an original cable-ring sculpture, outdoor print
displays, a small summer stage with speakers/microphone/drum kit, wall fixtures and
300 spatially grouped festoon bulbs. The stage sits beside the entrance rather
than placing a raised deck across it. Public fixture footprints are checked against
actual road cover, building footprints and water before drawing/registering them.

`landmarksSevkabel-walk.mjs` checks entry, central/transverse aisles, solid counters,
remaining closed walls, the quay, neighbouring landmarks and photo spots. Door rays
also verify that glass/walls do not visually seal the collision openings. Its full
environment run passes; the optional `--no-env` probe cannot prove quay blocking.
`sevkabel-culture-test.mjs` verifies real player walking, the normal bake, indoor
zone transitions and E/Escape input restoration in the complete rendered scene.

Source-view inspection covered entrance, hall aisle, trailer serving hatch, inner
alley, sea square/stage and the high overview, plus indoor/outdoor night views.
The four source depth probes report 0.002%, 0.000%, 0.001% and 0.001% noisy pixels,
all below 0.02%. Screenshots and logs are ignored under `shots/sevkabel-culture/`.

The source module checks pass together with streets/city, with approximately
170,000 triangles, 101 materials, 4.57 million canvas pixels and zero update
callbacks. Existing whole-map streets/city historical budget warnings remain.
The content is an authored summer market; the posed venue visitors do not run a
separate pedestrian simulation, and the upper floor is not furnished for entry.

Final shipping bake `600b5ba52e3b6ec9ad80` contains 329 verified products across all
qualities. Normal-page door/aisle/E/Escape/lighting checks and red-car controls pass.
The final full-scene baked depth probes also pass (worst 0.002%). Integrated medium
walking averages 31.8 FPS in the alley and 55.6 FPS inside the fair; the old centre
and exterior driving remain below 30 FPS. Complete measured results and comparison
limits are in `PERFORMANCE.md`.

## Follow-up: marked courtyard locations

User review requests a supported cable attachment at
`-6151,1.5,875.5,-140.4,8.1`; trdelnik and coffee/churros trailers around
`-6183.3,1.5,871.5,-205,-2.5`; full restaurant terraces at
`-6245.8,1.5,846.5,1.4,2.4` and `-6225.1,1.5,832.9,25.5,1.3`; and cafés along
the brick wall seen at `-6204.2,1.5,836.1,-85.7,2.6`.

The normal-bake before images are `shots/sevkabel-refinement/before_0..4.png`.
The cable endpoint was based on an approximate rectangular outline and fell
outside the actual podium corner. Attachment positions must come from real
footprint edges, with brackets joining the wall and cable. Shared café plans
must cut the ground-level glazing in the building generator and align furnished
window alcoves, fascia, canopy and walkable terrace to those same wall frames.
Trailer placement must leave the boat, tower/stair, hall doors and alley clear.

Implemented: `public-life-plan.js` derives inset wall anchors from OSM edges and
shares the café opening rectangles between `yard.js` and `dining.js`. The four
glazed dining alcoves have inward-facing backs, sides and ceilings, counters,
shelves, pendant lamps, artwork and staff. Their covered, walkable terraces
contain twelve tables in total, chairs, seated guests, planters, menu boards and
open centre aisles. Three existing podium dining fronts are retained.

The two additional trailers serve trdelniks (visible spiral dough on roasting
spits) and coffee/churros (espresso machine, cups and pastries). The second spool
tower moves to the opposite side of the alley and its shared cable plan follows
the new position. The fixture records now contain five trailers, seven dining
fronts, 331 instanced festoon bulbs and six wall anchors. Atlas artwork slots
20–25 remain unchanged; new titles use the six previously unused final slots.

The full-environment walk/raycast audit passes all existing paths, actual wall
support under each cable anchor, opaque enclosing backs behind all four dining
windows, and all four terrace centre aisles (deck height 0.14 m). Source screenshots
cover the supplied views, anchor close-up and broader dining frontage. Four source
depth probes report eight noisy pixels total, each rounding to 0.000%, with no
listed offenders. Static fixture/culling conventions and zero venue update
callbacks are retained; texture pixel count remains 4.57 M with one extra shared
glass material. Shipping bake and normal-loading checks are recorded in PERFORMANCE.md.

Follow-up shipping bake `9abc1cd62311e43e55bb` is verified across all qualities.
Normal-page hall/terrace/programme controls and red-car controls pass. The final
normal-bake views cover every supplied camera plus both trailers together and
the restaurant terrace. Final depth probes have ten noisy pixels total and no
listed offenders. Integrated walking past the new frontage averages 34.6 FPS;
driving/old-centre performance limits remain documented in `PERFORMANCE.md`.
