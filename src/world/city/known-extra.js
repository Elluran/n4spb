// known-extra.js - hand corrections of the generated known-data.js (merged over it, keyed by OSM id). Fields as in known-data.js:
//   a ARCH key, f storeys, H cornice height (m), hex facade, tr trim class (0 default, 1 white, 2 wall colour, 3 cream, 4 light grey stone, 5 dark stone, 6 green-grey patina),
//   rf roof colour, ms mansard true / false, er erkers, rust, shop true / false (force / forbid shop fronts), rich, gfTint, wear, turret.
export const KNOWN_EXTRA = {
  w60198701: { tr: 1 }, w66286146: { tr: 1 }, w548795116: { tr: 1 },       // Nevsky 60: white frames on the apricot wall
  w66925461: { tr: 1 }, w606857038: { tr: 1 },                              // Nevsky 31 (arcade house): white columns
  // granite-clad houses (rough-hewn dark / red granite, WEST-NEVSKY-3 photos n0709, n12, n01, bm3-5, bm15, gor4)
  w66233044: { a: 'NOUVEAU', granite: 1, tr: 5, er: 0, hex: '#74777a' },      // Nevsky 7-9 Wawelberg house: dark grey rough granite, arched windows, mansard-less flat roof
  r20269375: { a: 'NEOCLASS', granite: 1, tr: 5, hex: '#a27a68' },          // Nevsky 12 Junker house: red granite, four statue columns
  r1027340: { a: 'NEOCLASS', granite: 1, tr: 5, ms: true, hex: '#7d7d68' }, // Nevsky 1 / Admiralteysky 4: granite bank with mansard
  r20271182: { a: 'NEOCLASS', granite: 1, tr: 5, hex: '#8d8e8c' },          // Bolshaya Morskaya 3-5
  r448437: { a: 'NEOCLASS', granite: 1, tr: 5, hex: '#76797a' },            // Bolshaya Morskaya 15
  r1027335: { a: 'NEOCLASS', granite: 1, tr: 5, hex: '#8c8f8c' },           // Gorokhovaya 4
  r16655507: { a: 'NOUVEAU', granite: 1, tr: 6, hex: '#a08a84', er: 0 },    // Nevsky 56 Eliseyev: pink-brown granite, green patina details
  // City Duma tower (Nevsky 33): custom five-stage tower (towers.js), coral red with white pilasters
  r16774540: { hex: '#efcfaa', tr: 1, ms: false, tu: 0 },                 // City Duma building: peach (the coral red is only the tower)
  w256711798: { custom: 'duma', hex: '#d8604a', H: 47 },
  // Nevsky 25 / Kazanskaya 1 (kazan-cathedral.md 6.2, critic): 3 storeys + double mansard, green roof
  r1930011: { f: 3, H: 15, ms: true, rf: '#5f7d68' },
  // Nevsky 26 (Gansen house): cream-white neo-baroque (photos 56, 57)
  w51133428: { hex: '#e6dcc4', rf: '#8c9195', tr: 1, er: 0 },
  // ---- islands round 2 (2026-10-15, city owner; docs/research/islands2-integration-requests.md "city owner"). New regions only: none of these ids is in an older region.
  // Gote rope works, Petrovsky pr. 20: a red-brick monument complex with light-grey zinc roofs (photos refs/petrovsky-west g01 g02 g09 g10); the generic grammar drew ochre brick / grey stucco.
  // The module landmarksPetrovskyWest draws lit. V (w44425062), the mansion corp. 3 (w44425059) and the water tower w861142938; the other lits are generic. `yard`: they stand in a yard
  // (no street edge): without it every wall was the khaki courtyard wall of the generic grammar, whatever the colour here (shots of 2026-10-15).
  r3345289: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', f: 1, H: 8.5, yard: 1, shop: false },  // lit. Ya, the 28 x 400 m rope hall: ONE storey under a hipped roof (the generic height was 3 storeys, 13.5 m)
  r3345285: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },               // lit. R, hipped hall, 2 levels
  w44425032: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },             // lit. D (theatre LDM in the old rope factory)
  w248349889: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },            // lit. B
  w248349903: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },            // lit. Sh
  w248349888: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },            // lit. G (its tower part w861142938 is drawn by the module)
  w44425039: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },             // lit. Zh
  // the remaining lits / corps of the same address (Petrovsky pr. 20), also generic and also brick in photo g02 (the 3-storey block at the left)
  w44425063: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },             // 20 k8
  w44425069: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },             // 20 k5
  w248349860: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },            // 20 k7
  w248349861: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },            // lit. Z
  w248349879: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },            // lit. I
  r3345284: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },              // lit. I1
  w1179695898: { a: 'BRICK', hex: '#a64630', tr: 2, rf: '#b0b5b8', yard: 1, shop: false },           // 20 k4 s1
  // Petrovskaya kosa 3 / 3-6: the long plain yellow plaster blocks (photos refs/petrovsky-zhdanovka-2026/yacht2 k3_1 k3_3 k3_5, yacht y22: pale yellow #e3d196, white frames, grey plinth).
  // They stand free (no street edge): without `yard` every wall was the khaki courtyard wall (the ochre-mustard blocks of the full-scene shots) with a back door per 12 m.
  w31065336: { a: 'COURT', hex: '#e8d89c', tr: 1, rf: '#9ba0a3', yard: 1, wear: 0, shop: false },    // 3 lit. D, 63 x 54 m, 4 storeys
  r21379093: { a: 'COURT', hex: '#e8d89c', tr: 1, rf: '#9ba0a3', yard: 1, wear: 0, shop: false },    // part of w31065398 (3A), 1 storey
  r21379095: { a: 'COURT', hex: '#e8d89c', tr: 1, rf: '#9ba0a3', yard: 1, wear: 0, shop: false },    // 3/6, 3 storeys (a record only while prep keeps it)
};
