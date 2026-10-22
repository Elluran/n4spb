<!-- Copied verbatim from the source repository 102_3d_piter, docs/research/north-tauride.md at commit 0568f7af (only the line ends changed: CRLF to LF). Provenance of terrain.js and of the Paradny podium. -->
# Tauride Garden, Tauride Palace and Paradny Quarter

## Geography and scope

OpenStreetMap API map extracts retrieved 3 October 2026:

- [Garden and palace map](https://www.openstreetmap.org/#map=17/59.9462/30.3740), bbox `30.3685,59.942,30.3795,59.950`.
- [Paradny Quarter map](https://www.openstreetmap.org/#map=17/59.9415/30.3680), bbox `30.365,59.939,30.375,59.9425`.

Coordinates use the unchanged `tools/osm-lib.mjs` WGS84 conversion (origin 59.932421 N, 30.351279 E). `landmarksTauride/terrain.js` retains the surveyed/map-derived garden boundary, 118 pedestrian ways, 14 fence ways and 11 mapped gate nodes. Paths remain owned by the shared streets renderer. The garden GREEN polygon remains unclaimed so the shared environment supplies its tree canopy.

The main lake (`r1582714`, including its island) and western pond (`r6278222`) use exact mapped outlines. Four smaller waterways (`w30198531`, `w81524420`, `w112853192`, `w112853212`) are mapped in OSM only as canal centre lines. Their 6–12 m visual widths are estimated from mapped crossing lengths and [this aerial photograph](https://photos.wikimapia.org/p/00/07/34/97/78_big.jpg), not surveyed. The joined water polygon avoids overlapping water faces at mouths. The water is drawn at −0.55 m, ground cut and bed at −1.4 m; these are scene datums rather than measured lake levels. The bank geometry and bridge rail details are representative interpretations.

Eight OSM bridge way pieces form the pedestrian crossings; decks follow their exact positions and remain traversable. The [city's bridge operator](https://mostotrest-spb.ru/bridges/4-j-v-tavricheskom-sadu-401) confirms the garden's metal pedestrian bridges cross channels between ponds. Closed decks, railings and bank meshes avoid missing underside faces. Banks stop beneath bridges.

## Tauride Palace

Claim `r3801092`. The actual mapped perimeter, inner court and front courtyard are retained. [The palace's official institutional history](https://iacis.ru/About_IPA_CIS/Tavricheskiy_palace_eng) describes the three-part composition, two-storey central body, single-storey linking galleries, six-column Doric central portico and domed hall. The [official front photograph](https://iacis.ru/public/upload/news/4/3687.jpg) was downloaded and visually inspected.

The mapped footprint is split into the high central block, lower linking galleries and side wings. Its front portico footprint is removed from the solid wall body so the six-column entrance is physically open. The model adds warm yellow walls, white surrounds and cornices, high lower windows, small upper windows, six tapered Doric columns with plain capitals, triglyph frieze, pediment, timber doors, low windowed drum and shallow green dome. Flags and flagpoles shown in photographs are omitted per project instructions. Vertical dimensions are inferred from photographs; the model is an exterior architectural interpretation, not a measured conservation survey.

## Paradny Quarter

Seven apartment footprint records and four eastern office records are claimed. OSM labels the large apartment blocks at nine storeys except `w145419644` at eleven; several physical blocks share complex footprint records. The ensemble sits between Radishcheva, Vilensky Lane, Paradnaya and Kirochnaya, southwest of the garden.

[The property overview](https://lifedeluxe.ru/catalog/elite/view/paradnyy-kvartal) identifies the neoclassical architecture, granite/limestone lower storeys, pilasters, horizontal cornices and rooftop terraces. Its [facade photograph](https://images.mlabspb.ru/uploads/bb/c2/bbc2dbcba5d9bb2715023f5162ef4f65.jpg) was downloaded and visually inspected. [LSR's project history](https://special.kommersant.ru/lsr-2023/pervye-shagi.php) confirms this development as part of the company's central Petersburg work.

The model preserves real footprints and courts, with muted limestone fronts, dark stone lower storeys, sand-coloured pilasters, floor bands, large regularly spaced windows and projecting iron balconies. Decorative spacing is photo-derived rather than a window-by-window survey. Pedestrian circulation remains supplied by real OSM paths; no invented street grid is added.

## Verification

- Registered `node tools/check.mjs landmarksTauride`: OK; 496,533 triangles, 19 materials, 2 instanced meshes, 2.2 s build. Seven final merged static meshes; 63 slatted benches use shared instanced wood/iron meshes. Upper apartment windows use an atlas with projecting sills, retaining geometric surrounds on the first two floors.
- Five integrated GPU screenshots inspected: palace front, Paradny courtyard, garden entrance, garden interior, garden aerial. OSM lake shape, island, paths and buildings align. The initial generic tree canopy was too dense; this was reported to the lead for shared environment refinement.
- Module-only `zfight` at palace, Paradny courtyard and lake bridge: 5 / 18 / 5 noisy pixels, maximum 0.002%, below the 0.02% target; all three images inspected. Canal widths and terminal bridge abutments were then refined from the aerial reference, requiring a final garden-only visual check.
- Deck service `ctx.services.landmarksTauride.deckY(x,z)` returns 0.15 on bridges, otherwise null. Bridge terminal abutments are extended along their mapped axes only where needed to reach dry land; joints between consecutive mapped bridge pieces are preserved.

## Paradny courtyard fidelity revision

The user identified the missing elevated pedestrian podium at `1032.5,4.9,-953.8`. This revision replaces the original flat treatment with a connected courtyard at **3.3 m**. [The development description](https://vipflat.ru/zhilye-kompleksy/d126-paradnyj-kvartal) confirms the residential part stands on a pedestrian podium above parking. The model height is estimated from OSM's 21–22-step eastern approaches (approximately 0.15 m per step), not a surveyed elevation. The podium boundary follows mapped exterior building edges and access stairs, with photo-informed interpolation between them. Building footprints and fountain outlines remain exact OSM shapes.

[Fountain contractor Vodalux](https://vodalux-fontan.ru/ru/portfolio/276.html) specifies two triangular basins, each containing thirteen jets with the central jet reaching 5 m. These are modelled at the mapped `w1501496505` and `w1501496506` locations, with dark granite rims and animated spray. [This frontal photograph](https://www.restate.ru/attachment/b95817009f9c2480d88dbbf450cdba2558180aa3/proportional/1024x644/1.jpg) and [this close courtyard photograph](https://extpic5.kf.expert/images/1C93ADA3-2CFF-E911-B80A-0050568C58C5/nfg_wm/4A7DA97B-594E-EF11-92A4-005056BCE966.jpg) were downloaded and visually inspected. They guide the red-beige patterned paving, dark planted-bed borders, benches, lanterns, differentiated white/ochre stone facades, balconies and glazed vertical accents.

The upper two floors are recessed by a photo-estimated 2.4 m, using insets of the real building polygons rather than invented rectangular blocks. Facade doors and windows start at the podium level; the outer lower level is granite-clad. Generic trees, grass and street furniture are excluded from the raised courtyard and replaced with purpose-positioned planting and seating. Planting-bed layouts are photo-informed interpretations, not surveyed landscape polygons.

`paradny-surface.js` provides a pure `paradnyDeckY(x,z)` and `inParadny(x,z)` for shared terrain/NPC integration. The runtime landmark service combines this height with Tauride's bridge deck heights. Stairs use mapped polylines; podium caps and collision strips are cut around them so upper treads remain open.

The supplied Yandex gallery/panorama URLs could not be read through the web extraction tool. The primary fountain contractor and the inspected photographs above supply independently accessible references.

Revision verification: the registered CPU check passes at 799,542 triangles, 58 meshes (14 merged static batches), four instanced meshes and 44 materials. Three integrated GPU views were inspected at the user's eastern promenade position, fountain courtyard and aerial. A CPU harness built the actual landmark colliders and used `Player` with the shared `layout.heightAt` to walk all eight complete eastern approaches from the street, around their L-shaped landings, and 3.2 m past their final treads. All reached the 3.3 m podium without blockage; maximum endpoint error was 9 cm. The linked twelve/eight-step OSM ways form one approach. The 1.8 m clear flight widths and level landings are photo-informed estimates; level landings avoid overlapping perpendicular stair volumes at the turns.

The three-view depth probe found no podium, fountain or stair fighting. It exposed upper-floor glass overlapping the cornice; those windows now stop below the cornice. The final courtyard rerun has 34 noisy pixels (0.004%), zero identical-frame difference and no reported offender groups. All probe images were inspected.


Crowd follow-up: garden density is weighted by 0.22 and capped at 60 visible agents. Re-placement reserves capacity for each whole group immediately, including during viewpoint jumps. A two-minute CPU simulation with the camera in the garden held 59-60 visible garden visitors after arrival (previous faulty reservation allowed 122-124), with no non-finite agent positions. The rest of the city retains its existing density settings.
