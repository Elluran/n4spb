# Road signs, street-name plates and house-number plates

Code: `src/world/streets/signs.js` (every sign face, one source), `streets/plates.js` (plates), `streets/furn.js makePanels().mount()` (pole mounting + the shared atlas), `streets/labels.js` (facade registry,
`docs/rules/LABELS-API.md`). Contact sheet of every face: `node tools/streets-plates-sheet.mjs` -> `shots/streets2/sheet_plates.png`, `sheet_signs.png`.

## Street-name plate (user reference 2026-10-06, the standard plates of the city)

* **600 x 375 mm** (scene scale 1.25: 0.75 x 0.47 m, `PLATE.k`; a real-size plate is 35 px wide at 12 m). Dark-blue field `#283479`, **green rim** `#1c6a46` (2.4 % of the width) with a lit edge `#2f8b61`, a bulge on top (30 % - 70 % of
  the width, S-shaped shoulders) with the city's small **ship emblem** (three masts, two sails each, hull; white; no flag), four **corner scrolls with a silver rivet** (`#c9cfd8`), white text `#f4f6f8` (Noto Sans 700, weights 500-700).
* Rows (`plateText(full)`): [ordinal `7-я`, 38 px] / [type above, 27 px] / **NAME 56 px** / [type below, 27 px] / Latin line 17 px; the type word stands where the official name has it
  (`площадь Островского`: above; `Невский проспект`, `7-я Красноармейская улица`: below; `набережная реки Фонтанки` / `канала Грибоедова`: `НАБЕРЕЖНАЯ РЕКИ` above; `набережная Обводного канала`: `НАБЕРЕЖНАЯ` / `ОБВОДНОГО` / `КАНАЛА`).
  Capitals only. A long word is set condensed (down to 72 %) and then smaller, never over the rim (`line()`; name max width 85 % of the plate).
  The district suffix of the Petrograd side / Vasilievsky Island stays with the type word under the name (`Большой проспект П.С.`: `БОЛЬШОЙ` / `ПРОСПЕКТ П.С.` / `BOLSHOY PROSPEKT P.S.`;
  `Кадетская линия В.О.`, `Троицкая площадь П.С.` likewise); the numbered lines keep their ordinal row (`1-я` / `ЛИНИЯ В.О.`). Sheet: `shots/streets2/sheet_petro_plates.png`.
* Latin line (`latinWord`): й = Y, я = YA, ю = YU, ё = YO, ы = Y, ь / ъ dropped, е = YE at the start / after a vowel / after ь ъ, ц = TS, ч = CH, ш = SH, щ = SHCH, ж = ZH, х = KH; `набережная` = NABEREZHNAJA, `улица` ULITSA,
  `площадь` PLOSHCHAD, `проспект` PROSPEKT; `НАБЕРЕЖНАЯ X КАНАЛА` = `NAB. X KAN.`. `plateInfo()` (short forms `ул.`, `Nevsky pr.`) stays for the minimap.
* Mounting: corner houses of every junction (one per corner, 7 m apart, wall faces the street, not at a door, wall >= 6.5 m high), centre 4.05 m (3.8 - 4.3 m), 3 cm off the wall, flush, face out of the wall.
  `streets.plates` / `streetPlates` list `{ x, z, y, nx, nz, text }`. Each plate reserves its rectangle in the label registry first.
* **Landmark houses get no generic plate** (open districts, `streets/region.js`; 2026-10-06): a building that a BUILT landmark module claims (`lib/claims.js isOwned`, passed as
  `buildSignals(..., { isOwned })`) gets neither a name plate nor a number plate, and its number is not borrowed for the corner plate of a neighbour. The module models the real front (a recessed
  portal, an order, bay windows: the footprint wall the plate would hang on may not exist: the plate inside the iwan of the Mosque) and hangs its own plaques. 72 plates left the Petrograd side /
  Spit that way; the older districts keep the plates the user reviewed.

* **The Lines of Vasilievsky Island come in pairs** (2026-10-07, `streets/names.js`): one street carries two lines ('4-5-я линии В.О.'; the EVEN line on the east wall = nearer the Spit, the ODD on the west wall; Kadetskaya line east, 1st line
  west of the same street); the plate of a wall shows the line of ITS side (`1-я` / `ЛИНИЯ В.О.` rows, Latin `4-YA LINIYA V.O.`), whatever way name the arm that asked for it has. The number plates match the real houses by the address spelling
  ('5-я линия В.О.' and '5-я линия Васильевского острова' are one set).
* **Address plates a landmark asked for** (`plates.js ADDRESS_PLATES`): the standard pair (name plate above, number plate at y) at a fixed wall point, reserved in the label registry; drawn even on the wall of a landmark house
  (the module leaves the spot free): «Лиговский проспект 6» on the SSW end block of the Bolshoy Concert Hall.

## House-number plate

* **600 x 160 mm** (0.75 x 0.2 m): same colours and scrolls, no bulge; ONE shared texture; the digits are quads of one glyph atlas (`0-9 - / А Б В Г Д Е Ж З И К Л М`, cell 48 x 80 px): the house number large in the middle (cap 0.115 m),
  the neighbours on the same side of the street small left / right (cap 0.0625 m): the numbers of the **real neighbouring buildings** (BUILDINGS `addr`, same street, same parity, nearest to the left / right as seen from the street,
  suffixes and ranges kept: `155/5`, `130А`, `22-24`); only one side known: the other = n -+ the same step; none known: n - 2 / n + 2.
* Under every corner name plate (gap 2.5 cm) when the corner house (or an addressed house of the street within 25 m on the same facade) has a number; alone on other addressed houses at 3.1 m near the corner end of the facade
  that faces the street (one per street + number). Houses whose number hangs here get no second plate from the city (`labels.has(id, 'number')`).

## Road signs (GOST R 52290-2004, class II sizes)

| code | sign | size m | placed |
|---|---|---|---|
| 5.19 | pedestrian crossing 5.19.1 / 5.19.2: blue square, thin white edge, white triangle, black pedestrian, zebra bars on the base; **fluorescent yellow-green frame** `#cfe32a` | 0.70 (+0.05 frame = 0.80) | every zebra, both ends (2.9 / 3.3 m pole), signal mast arms |
| 6.4 | parking | 0.70 | ends of parking pockets (2.75 m post) |
| 6.4 + 8.x | taxi rank / coach bay (P over a plate) | 0.60 x 0.90 | `extras.js TAXI_RANKS / COACH_BAYS` |
| 5.16 | bus / trolleybus stop | 0.70 | every stop with a shelter |
| 5.15.2 | direction of movement in the lane (hangs from the spans over Nevsky) | 0.70 x 0.90 | `wires.js` |
| 5.17 | tram stop (blue square, white square with the tram seen from the front: pantograph on the contact wire, rails) | 0.70 | the stop pole of a stop that only trams serve (`stops.js`, open districts) |
| 6.16 | stop-line plate `СТОП` | 0.50 x 0.25 | signal poles at the stop line |
| chevron | red-white island post plate | 0.4 x 0.8 | traffic islands |
| 1.22, 2.1, 2.4, 2.5, 3.1, 3.2, 3.24.N, 3.27, 3.28, 4.1.1 - 4.1.6, 4.5, 5.5 | drawn in the atlas (`makeSigns(ctx).tex(code)`), not placed by the generator yet | 0.7 round / square, 0.9 triangle | - |

Colours: red `#d3171e`, blue `#1558a8`, yellow `#f4c20d`, lime `#cfe32a`, white `#f6f6f1`, black `#1a1a1c`. No logos, no flags.

### Mounting (`panels.mount(poles, tex, x, y, z, nx, nz, w, h, { pole, round })`)

Plain grey round tube (`post()` in signals.js, r 0.045 - 0.06, never on a carriageway: `poleClear` / `nudgeClear` / `clearSpot`), the face in front of the pole on a galvanised back plate (a disc for round signs), **two clamp bands**
(light strips 4 cm high across the pole on the rear of the plate; 4 triangles), face normal towards the approaching traffic, lower edge >= 2.0 m above a footway (crossing sign centre = pole height - 0.45 m).

### Where a sign or a stop may NOT stand (rules of 2026-10-06, open districts)

* **Chevron posts** of a traffic island (`signals.js`): ON the island that is really drawn (inside its polygon, >= 0.3 m off the asphalt that carves it, not on a strip that `fillMedians`
  merged); a pointed / curved tip slides towards the middle of the island in 0.5 m steps (40 % of the way at most), else that end has no post. An island that the carriageways swallow
  (`net.js buildStripPatches`: more than half on asphalt) has no posts at all.
* **Bus / tram stop shelter, bench and stop pole 5.16** (`stops.js`): the footprint (3.5 x 1.7 m) and the pole stand on no asphalt (tram beds included) and on no tram track; a stop that fails
  moves to its tram platform (the side away from the rails) or to the kerb of the way its platform really stands behind, else it gets no furniture. No yellow zigzag at a tram platform.
* Every pole base (`furn.js poleClear`) also keeps 1.1 m off the axis of a tram track that runs off the asphalt.

### Adding a sign

1. Draw the face in `signs.js` (`S['code'] = () => draw(key, w, h, fn)` with the helpers `disc`, `ring`, `tri`, `arrow`, `walker`), add its size to `SIGN_SIZE` (and `SIGN_ROUND` for discs).
2. Place it with a builder that clears the carriageway (`signals.js roadSign(tex, x, z, nx, nz, size, h)` or `panels.mount`), reading `shared.signs.tex('code')` / `shared.signs.size('code')`.
3. `node tools/streets-plates-sheet.mjs`, open `sheet_signs.png`, then `node tools/check.mjs streets` and `npm run roads`.
