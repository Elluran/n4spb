// city-known-mars-curated.mjs - the hand-written KNOWN records of the Mars Field / Summer Garden extension (input of tools/city-known-mars.mjs).
// Sources: docs/research/mars-field-houses.json + summer-garden-houses.json (rows of confidence M / H, photo-checked: [V] tags in the notes) and docs/research/mars-field.md sec. 6-9,
// summer-garden.md sec. 9. Fields as in src/world/city/known-data.js: a ARCH key, f storeys, H cornice (m), hex facade, tr trim class (0 warm white, 1 white, 2 wall colour, 3 cream,
// 4 light grey stone, 5 dark stone, 6 patina), rf roof colour, ms mansard / hip roof visible, er erkers, rust rusticated ground floor, ga [fraction along the front, width] carriage gate,
// shop true / false, rich, gfTint, wear. c = confidence of the record: 'H' photo-checked, 'M' photo + dossier, 'L' derived from knowledge of the street (not photographed).
// Where a dossier says "photo saturation boosted" the hex here is the softened stucco, not the photo value. The H / f pairs keep |layout.heightOf(part) - H| < 5.6 m (city/archetypes.js
// sameVolume) for the parts of the same volume: 2 -> 11, 3 -> 14.5, 4 -> 18, 5 -> 21.5, 6 -> 23.5 (the 1844 limit is 23.5 m).
const GREY = '#8c9195', GREY2 = '#7d8288';

export const CURATED = {
  // ------------------------------------------------------------------ Mars Field dossier (Millionnaya, Moika, Dvortsovaya nab., Konyushennaya)
  r20041388: { a: 'CLASSIC', f: 4, H: 18, hex: '#d9ad58', tr: 3, rust: 1, ga: [0.5, 3.6], ms: 0, rf: GREY2, shop: false, c: 'M' },        // Moika 27 [V h_29]: ochre-orange, arched ground floor, central gate
  w100432952: { a: 'ECLECTIC', f: 4, H: 18.5, hex: '#c98f55', tr: 3, rust: 1, ms: 0, er: 0, rich: 1, rf: GREY2, c: 'M' },               // Millionnaya 27 [V h_18]: orange-brown, deep rustication
  w100345508: { a: 'ECLECTIC', f: 5, H: 21.5, hex: '#adb8c8', tr: 1, rust: 1, ms: 0, er: 0, rich: 1, shop: false, rf: GREY, wear: 0, c: 'M' }, // Dvortsovaya nab. 24 [V h_16]: grey-blue, columned centre bay
  w69121307: { a: 'ECLECTIC', f: 3, H: 12, hex: '#d0cf92', tr: 3, ms: 1, er: 0, rust: 0, shop: false, rf: '#9fb0bd', c: 'M' },             // Dvortsovaya nab. 22 [V h_07]: yellow-green, hip roof, dormers
  w99315502: { a: 'CLASSIC', f: 4, H: 17.5, hex: '#bfc2a8', tr: 3, ga: [0.5, 3.6], ms: 0, shop: false, rf: GREY2, c: 'M' },              // Moika 13 [V h_21]: grey-green, centre gate
  w61411464: { a: 'ECLECTIC', f: 5, H: 21.5, hex: '#e2bd4c', tr: 3, er: 1, rust: 1, ga: [0.18, 3.4], ms: 1, rich: 1, shop: false, rf: GREY2, c: 'M' }, // Moika 11 [V h_30]: yellow-ochre, two oriels
  r1418971: { a: 'ECLECTIC', f: 4, H: 18, hex: '#cdac6e', tr: 3, rust: 1, ms: 1, rich: 1, shop: true, rf: GREY, c: 'M' },                 // Millionnaya 17 [V h_22]: sand-ochre, paired pilasters, shaped attic
  r1422277: { a: 'ECLECTIC', f: 4, H: 17, hex: '#d0c0b0', tr: 3, rust: 1, ms: 0, rich: 1, rf: GREY, c: 'M' },                          // Millionnaya 10 [V h_20]: beige-grey, relief panels
  w98945339: { a: 'CLASSIC', f: 3, H: 12.5, hex: '#8f9356', tr: 1, rust: 1, ga: [0.5, 3.4], gfTint: 2, ms: 0, shop: false, rf: GREY2, c: 'H' }, // Millionnaya 13 [V h_24]: olive plaster, salmon ground floor, black gate
  w84837996: { a: 'CLASSIC', f: 3, H: 16, hex: '#e0b8a0', tr: 1, ms: 0, rust: 0, shop: false, rf: '#8a5a48', c: 'M' },                    // Konyushennaya church [V stab_06]: pink-beige rotunda, rust-brown dome (the dome itself is not drawn by the city grammar)
  r7033683: { a: 'CLASSIC', f: 2, H: 11, hex: '#cf8f5c', tr: 1, rust: 1, ms: 0, shop: false, rf: '#7a706a', c: 'M' },                    // Main Imperial Stables [V stab_06, stab_03]: ochre-orange wall, white arch rims
  w84837975: { a: 'CLASSIC', f: 1, H: 6.5, hex: '#cf8f5c', tr: 1, ms: 0, shop: false, rf: '#7a706a', c: 'M' },                          // stables, low wings of the court
  w84837977: { a: 'CLASSIC', f: 2, H: 11, hex: '#cf8f5c', tr: 1, rust: 1, ms: 0, shop: false, rf: '#7a706a', c: 'M' },
  w84837982: { a: 'CLASSIC', f: 1, H: 6.5, hex: '#cf8f5c', tr: 1, ms: 0, shop: false, rf: '#7a706a', c: 'M' },
  w84837986: { a: 'CLASSIC', f: 3, H: 14.5, hex: '#d89a68', tr: 1, ms: 0, shop: false, rf: '#7a706a', c: 'M' },
  w84838001: { a: 'CLASSIC', f: 1, H: 6.5, hex: '#cf8f5c', tr: 1, ms: 0, shop: false, rf: '#7a706a', c: 'M' },
  r1417763: { a: 'CLASSIC', f: 3, H: 15, hex: '#cdd6e0', tr: 1, rust: 1, ms: 0, shop: false, rf: GREY, wear: 0, c: 'M' },                 // Dvortsovaya nab. 10 [V gagar_01]: pale blue-white palace, central pediment
  w98932259: { a: 'CLASSIC', f: 3, H: 15, hex: '#d9c3ab', tr: 1, rust: 1, ms: 0, shop: false, rf: GREY, c: 'M' },                       // Dvortsovaya nab. 8 [V h_11]: pink-beige, columned portal, rusticated plinth
  r17343294: { a: 'ECLECTIC', f: 3, H: 17, hex: '#e2d3a6', tr: 1, ms: 0, rich: 1, shop: false, rf: GREY, wear: 0, c: 'L' },              // Novo-Mikhailovsky Palace (Stakenschneider 1857-61), colour unverified (B&W photo only)
  r1410730: { a: 'CLASSIC', f: 1, H: 8, hex: '#dcc08a', tr: 1, ms: 0, shop: false, rf: '#7d6a58', c: 'L' },                              // Round Market (Moika 3): one-storey arcaded ring

  // ------------------------------------------------------------------ Summer Garden dossier (Fontanka, Pestelya, Chaikovskogo, Solyanoy ...)
  r2050420: { a: 'ECLECTIC', f: 5, H: 21.5, hex: '#e5d28f', tr: 1, ms: 0, rich: 1, shop: false, rf: GREY, c: 'L' },                     // Fontanka 14 Olsufiev houses [V 265]: pale yellow, white rosettes
  w96702284: { a: 'CLASSIC', f: 3, H: 15, hex: '#d7897a', tr: 1, ms: 0, rust: 0, shop: false, rf: GREY, c: 'M' },                         // Fontanka 18 Pashkov house [V 268]: salmon pink, 4-column portico
  r6573519: { a: 'CLASSIC', f: 3, H: 15, hex: '#f0dc86', tr: 1, ms: 1, shop: false, rf: '#6a9a5c', c: 'M' },                             // Fontanka 20 Nekludov house [V 268]: lemon yellow, green roof
  w96700960: { a: 'CLASSIC', f: 4, H: 18, hex: '#cfd6c0', tr: 1, ms: 0, shop: false, rf: GREY, c: 'M' },                                 // Fontanka 22 Gromov house [V 268]: pale grey-green, long portico
  r1394710: { a: 'CLASSIC', f: 3, H: 17, hex: '#e6d495', tr: 1, ms: 1, shop: false, rf: '#7f8c86', c: 'M' },                             // Fontanka 6 Law School [V 192]: pale yellow wings, green-grey roof
  w97348149: { a: 'NOUVEAU', f: 5, H: 22, hex: '#d9c48e', tr: 3, er: 1, rich: 1, rust: 1, ms: 1, shop: true, rf: GREY, c: 'H' },           // Pestelya 13-15 Ratkov-Rozhnov house [V 264]: cream-ochre, atlantes, bay tower
  w604592782: { a: 'NOUVEAU', f: 5, H: 22, hex: '#d9c48e', tr: 3, er: 1, rich: 1, rust: 1, ms: 1, rf: GREY, c: 'M' },                    // the second wing of the same house
  w96827444: { a: 'CLASSIC', f: 3, H: 14, hex: '#cc4a38', tr: 1, ms: 0, rust: 0, shop: false, rf: '#b7d2c4', c: 'H' },                   // Panteleimon church [V 263]: coral red, white pilasters (domes / bell tower are not drawn by the city grammar)
  r1394028: { a: 'BRICK', f: 4, H: 20, hex: '#a95e48', tr: 1, rich: 1, ms: 0, shop: false, rf: GREY, c: 'L' },                            // Stieglitz Museum (Solyanoy 15, Messmacher 1885-95): red-brown brick, white stone
  w96731786: { a: 'ECLECTIC', f: 4, H: 18.5, hex: '#d4c3a0', tr: 1, er: 1, rich: 1, ms: 0, rf: GREY, c: 'L' },                           // Mokhovaya 27-29 Rossiya insurance house (Lyalevich 1898-1900): ornate neo-baroque
  r18175293: { a: 'ECLECTIC', f: 5, H: 21.5, hex: '#e0cf98', tr: 1, ms: 0, rf: GREY, c: 'L' },                                          // Chaikovskogo 2/7 court servants' houses: yellow-ochre block round the Mosaic yard
  w61411458: { a: 'ECLECTIC', f: 6, H: 23.5, hex: '#dcc590', tr: 1, ms: 0, rf: GREY, c: 'L' },                                          // Chaikovskogo 2/7 litR: the old court servants' house
  w96878424: { a: 'MODERN', f: 6, H: 22, hex: '#d9cdb4', tr: 1, ms: 0, shop: false, rf: GREY, c: 'L' },                                  // Chaikovskogo 1 (Senator business centre, infill)
  w51530964: { a: 'CLASSIC', f: 2, H: 11, hex: '#e3cf9a', tr: 1, ms: 0, rust: 0, shop: false, rf: '#7d8288', c: 'L' },                    // Chaikovskogo 4 litZ, Kokoshkin house (c. 1820): two-storey classicism
  r18178309: { a: 'CLASSIC', f: 3, H: 14.5, hex: '#e6cfa2', tr: 1, ms: 0, shop: false, rf: GREY, c: 'L' },                               // Kutuzova 22, Serebryakova mansion
  r1395569: { a: 'CLASSIC', f: 4, H: 18, hex: '#e8d6b0', tr: 1, ms: 0, shop: false, rf: GREY, c: 'L' },                                 // Gagarinskaya 3, Small Marble Palace
};
