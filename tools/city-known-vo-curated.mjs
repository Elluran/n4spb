// city-known-vo-curated.mjs - hand-written KNOWN records of Vasilievsky Island (input of tools/city-known-vo.mjs; they win over the table rows).
// Source: docs/research/vo-roster-architecture.md section 8 (the 82 ordinary houses, rows with photo-read colours `v`) and section 8.2 (row -> entry). Fields as in src/world/city/known-data.js:
// a ARCH key, f storeys, H cornice (m), hex facade (ONLY photo-read: a street must not be painted in one colour), tr trim class (0 warm white, 1 white, 2 wall colour, 3 cream, 4 light grey stone, 5 dark stone),
// rf roof colour, ms mansard / hipped roof visible, er bay windows, tu corner turret, tt turret top, ga carriage gate [fraction, width], shop true / false, rich, gfTint, so rough granite socle, mj majolica band,
// gb / gs gables, pp parapet, col half-columns. c = confidence: 'H' seen in an opened photo (roster `v`), 'M' dossier / dated, 'L' knowledge of the place. A claimed id (bol18, pel16, akad2, gor47, the
// ModernVO hero houses ...) is skipped by the tool: its module draws it. Photos: the roster table of section 9 (Commons files, opened by the roster agent).
export const CURATED = {
  // Troekurov house, 6th Line 13 [V61]: Petrine "house for the notable", pale yellow with a white order, red-brown hip roof, plastered chimneys
  w84046080: { a: 'CLASSIC', f: 2, H: 10, hex: '#edd99d', tr: 1, ms: 1, rf: '#8e3b2e', er: 0, tu: 0, c: 'M' },
  // Solovyov house, 5th Line 10: Romanesque brick style with paired windows and devil masks in hexagrams (estimate colour)
  w82802090: { a: 'BRICK', f: 4, tr: 4, er: 0, tu: 0, ms: 0, c: 'M' },
  // Junker house, Bolshoy 10 [V05]: rusticated ground floor on granite, paired arched windows on the first floor, dark iron balcony, gate at the left end
  w82802094: { a: 'CLASSIC', f: 3, H: 15, hex: '#d5bba6', tr: 1, rich: 1, ga: [0.12, 3.0], ms: 0, er: 0, tu: 0, c: 'M' },
  // Breitfus house, Bolshoy 37 [V56]: orange field, cream surrounds, rusticated quoins, round-headed arch gate, stone brackets
  r1204529: { a: 'ECLECTIC', f: 4, hex: '#d98b5c', tr: 3, rich: 1, ga: [0.5, 3.4], ms: 0, er: 0, tu: 0, c: 'M' },
  // Petrov mansion, Bolshoy 44 [V59]: olive-yellow stucco, quoins, shops in the ground floor, behind the boulevard trees
  w32434769: { a: 'ECLECTIC', f: 3, hex: '#c4bf86', tr: 3, ms: 0, er: 0, tu: 0, c: 'M' },
  // Finnish Regiment hospital, Bolshoy 65: a long two-storey classical front
  w45965956: { a: 'CLASSIC', f: 2, H: 11, tr: 1, shop: false, er: 0, tu: 0, c: 'M' },
  // police station, Bolshoy 71 [V07]: yellow brick with red polychrome bands
  w45965975: { a: 'BRICK', f: 3, hex: '#c9a24e', tr: 5, shop: false, er: 0, tu: 0, ms: 0, c: 'M' },
  // fire station with the watch tower, Bolshoy 73 [V07]: red brick, round tower with a gallery (no beacons, no sirens)
  w45965973: { a: 'BRICK', f: 2, H: 12, hex: '#9f4a33', tr: 5, shop: false, tu: 1, tt: 'tent', er: 0, ms: 0, c: 'H' },
  // Olga shelter, Sredny 80 [V58]: red and yellow brick, blue-grey metal roof
  w45965992: { a: 'BRICK', f: 3, hex: '#a4543b', tr: 4, rf: '#4f7ea1', ms: 1, shop: false, er: 0, tu: 0, c: 'M' },
  // Borkhov house, Bolshoy 54 [V54]: roughcast over two floors of dark granite, olive tile band at the top, octagonal corner bay with a small grey cupola
  w160229193: { a: 'NORDIC', f: 6, H: 23.5, hex: '#a89a86', er: 1, tu: 1, tt: 'dome', mj: 1, so: 1, ms: 0, rf: '#a9aba6', c: 'H' },
  // Borkhov house, Bolshoy 56: twin of no. 54 (damaged by a fire in 2014)
  r2144616: { a: 'NORDIC', f: 6, H: 23.5, er: 1, tu: 1, tt: 'dome', mj: 1, so: 1, ms: 0, rf: '#a9aba6', c: 'M' },
  // Kollan house (Lidval), Bolshoy 92 [V55]: dark mauve-brown roughcast, pebble-dash bands, cream half-round bay with a metal cap
  w65710570: { a: 'NORDIC', f: 4, hex: '#86655f', er: 1, tu: 0, so: 1, mj: 0, ms: 0, c: 'H' },
  // Kornilova house, Sredny 56 / 14th Line [V57]: dark granite floors, khaki-olive plaster, red-brown tile panels, blue-grey tile frieze, round corner tower with a small cupola
  w96579812: { a: 'NORDIC', f: 7, H: 25.5, hex: '#b8b288', er: 1, tu: 1, tt: 'dome', mj: 1, so: 1, ms: 0, rf: '#8c9b9e', c: 'H' },
  // Mokin house, Sredny 90 [V26]: soot-stained ochre, rusticated ground floor, rounded corner bay (the dome is lost: no turret)
  w32862849: { a: 'ECLECTIC', f: 6, H: 23.5, hex: '#c9a54f', tr: 2, er: 1, tu: 0, rich: 1, ms: 0, c: 'M' },
  // Gedike house, 8th Line 23 [V06]: brick-pattern field with white pilaster strips, rusticated dark ground floor with the arch gate (the dragon stands in the yard)
  w80146009: { a: 'ECLECTIC', f: 4, hex: '#d79a52', tr: 1, rich: 1, ga: [0.3, 3.4], ms: 0, er: 0, tu: 0, c: 'M' },
  // Gavanskaya 24 [V20]: Stalinist 1953, four giant half-columns over three floors, rusticated base, balconies on brackets, hip roof
  w18501621: { a: 'STALIN', f: 5, H: 18.5, hex: '#dcb862', tr: 3, col: 1, rich: 1, ms: 1, rf: '#5f7d68', er: 0, tu: 0, c: 'H' },
  // Sovkov house, Gavanskaya 22 [V21]: grey-green roughcast, cream rounded bays, stepped gables, black roof railing
  w64281740: { a: 'NORDIC', f: 7, H: 25.5, hex: '#8c8f74', er: 1, gb: 2, gs: 3, so: 1, ms: 0, tu: 0, c: 'M' },
  // Reshetkin house, Opochinina 5 [V18]: Art Nouveau 1909, dusty pink-brown
  w64156456: { a: 'NORDIC', f: 6, er: 1, so: 1, ms: 0, tu: 0, c: 'M' },
  // Lenexpo pavilion 8, Bolshoy 103 lit K (raw building:levels 7 = a tagging error: the generic city drew it 23 m tall): a flat-roofed hall about 11 m high (landmarksSeaTerminal request 1)
  w53337502: { a: 'PANEL', f: 2, H: 11, rf: '#8c9296', shop: false, er: 0, tu: 0, c: 'M' },
  // Istkabel, Kozhevennaya 34 (r8702903 + 12 parts; landmarksSevkabel request 1, photos 010 / 011 / 035): white / pale-mint plaster, grey-blue zinc hip roofs, a pedimented avant-corps with engaged columns
  r8702903: { a: 'CLASSIC', f: 4, H: 16, hex: '#e4e9dc', tr: 1, rf: '#8e9aa6', ms: 1, shop: false, er: 0, tu: 0, c: 'M' },
  // Kozhevennaya 33 (landmarksSevkabel request 2): pale green-grey, three storeys
  w98440157: { a: 'ECLECTIC', f: 3, hex: '#c8cdb8', tr: 1, er: 0, tu: 0, c: 'M' },
  // Colonnaded house, Sredny 76 / 18th Line [V10]: yellow-green three-storey classical block, a free-standing white colonnade at the left end
  w23180817: { a: 'CLASSIC', f: 3, H: 13.5, hex: '#c9c474', tr: 1, col: 1, ms: 0, er: 0, tu: 0, c: 'M' },
  // Maly 53 [V14]: mustard plaster, rusticated quoins and ground floor, a bay with a wrought-iron balcony over the door
  w89594146: { a: 'ECLECTIC', f: 5, hex: '#c8923a', tr: 3, er: 1, rich: 1, ms: 0, tu: 0, c: 'M' },
  // Sredny 42 / 10th Line 25 [V11]: tan stucco, heavy rustication in the ground floor, a corner bay with a balcony, shops
  r1204537: { a: 'ECLECTIC', f: 4, hex: '#b98c55', tr: 3, er: 1, rich: 1, ms: 0, tu: 0, c: 'M' },
};
