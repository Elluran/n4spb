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
};
