# Central north expansion

Branch: `feat/piter-east-neva`; isolated worktree `D:/git2/agi-fun-tests-piter-east`.
Preview: http://localhost:5178 (run `node tools/serve.mjs 5178`).

## Scope

The N2/N3 map tiles add 2,134 OSM building records, bringing the data set to 6,548
records / 6,211 footprints. Existing western work in the original checkout is untouched.

- Tauride Garden: mapped paths, lake/island/canals, eight bridge segments, gates,
  fences and 63 benches; preserved mapped trees, thinner procedural infill and clear paths.
- Tauride Palace: mapped footprint, Doric portico, galleries, wings and green dome.
- Paradny Quarter: 11 mapped buildings with stone facades, pilasters, balconies and cornices.
- Smolny: 93.7 m cathedral, bell towers, convent and Institute with eight-column portico.
- Transfiguration: five domes, open west portico and cannon-chain fence.
- Podpisnye Izdaniya: researched grey facade, shop portal, book displays and named sign.
- Chernyshevskaya: surface vestibule and 14 individually detailed addresses toward Moscow Station.
- Liteyny and Bolsheokhtinsky: mapped axes, solid decks and approaches, railings,
  structural spans, lamps/contact wires and shared walking/driving height services.

## Visit

Use the **Places** selector on desktop or touch screens. Shift+1 through Shift+6
visit the bookstore, Transfiguration, Chernyshevskaya, Paradny, Tauride and Smolny.
The original 1?8 viewpoints remain available.

## Research and limits

- [Corridor, cathedral and bookstore sources](research/north-corridor.md)
- [Tauride and Paradny sources](research/north-tauride.md)
- [Smolny and bridge sources](research/north-smolny.md)

OSM geometry establishes geography and footprints. Architectural ornament is a
photo-informed procedural interpretation, not a scan. Unmapped canal widths are
estimated at 6?12 m using photos and bridge spans. Upper roof profiles and minor
sculpture are simplified. The Chernyshevskaya addition is its surface vestibule.

## Checkpoints

- `9ddb3ad`: preceding Alexander Nevsky monument detail and paving fix.
- `f9fc21f`: central north OSM data and reliable cached map API importer.
- `7efefd3`: researched landmarks, landscaping, bridges and navigation integration.

## Verification

All four new modules pass CPU geometry checks: North 206,100 triangles; Smolny
430,984; Tauride 496,533; bridges 193,820. Fourteen viewpoints pass layout checks.
Individual landmark screenshots were inspected; sampled z-fight checks were at
most 0.002% changed pixels for the new priority landmarks.

Integrated Medium smoke: PASS, no module errors. Walked 17.4 m; flight,
view-directed climb, ground landing, rooftop walking and take-off all passed.
Measured 30 FPS / 1,213 draw calls / 23.93 M triangles at the station on an RTX
3090 Ti; initial load 122.9 seconds. This map expansion increases startup and GPU
cost, and performance on weaker hardware has not been established.

All six north shortcuts place the player on dry, grounded surfaces (Tauride bridge
height 0.15 m). Liteyny walking advanced 7.5 m with player and deck both at 6 m.
Full-scene destination, garden aerial, palace and Liteyny screenshots inspected;
no browser console errors. Evidence: `D:/temp/piter-east/north-*.png` and
`north-ui-results.json`.

Mobile 390?844: Places selector reached Tauride, no horizontal overflow, HUD
labels and controls fit, touch flight passed, no console errors. Screenshot
`D:/temp/piter-east/north-mobile.png` inspected.
