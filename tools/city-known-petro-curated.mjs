// city-known-petro-curated.mjs - hand-written KNOWN records of the Petrograd side / Vasilievsky Island extension (input of tools/city-known-petro.mjs; they win over the table rows).
// Fields as in src/world/city/known-data.js: a ARCH key, f storeys, H cornice (m), hex facade, tr trim class (0 warm white, 1 white, 2 wall colour, 3 cream, 4 light grey stone, 5 dark stone),
// rf roof colour, ms mansard, er bay windows, tu corner turret, ga gate, shop true / false, rich, gfTint, wear, and the Petrograd-side fields: gb gables per street front (0-2),
// yard 1 = a house that stands free in a yard or garden (all walls are fronts), gs gable shape (0 round, 1 shouldered, 2 steep, 3 stepped), mj majolica band, so rough granite socle that steps up, pp roof parapet 'bal' / 'attic' / 0, col half-columns,
// tt turret top 'helm' / 'tent' / 'spire' / 'dome'. c = confidence: 'H' seen in an opened photo, 'L' from knowledge of the place (no photo opened).
// Photos: SP/refs/city-petro/NN_* (downloaded for this pass) and SP/refs/kamennoostrovsky/NN_* (sight-kamennoostrovsky).
export const CURATED = {
  // ------------------------------------------------------------------ houses seen in opened photos
  // Bolshoy pr. 69 [kam 64_aly69]: cream-yellow smooth bands over grey-buff roughcast, round corner bay under a helmet dome, shaped attics, teal tile panels, dark rough granite socle
  r2142991: { a: 'NORDIC', f: 5, H: 21, hex: '#d6c690', er: 1, gb: 2, gs: 1, tu: 1, tt: 'helm', mj: 1, so: 1, rf: '#8a9197', c: 'H' },
  // Kamennoostrovsky 9 [kam 73_k9]: grey terrazite, toothed quoins, two-storey base with flat piers, Ionic columns in arched niches, balustraded balconies, attic storey
  r5986712: { a: 'NEOCLASSIC1910', f: 6, H: 23.5, hex: '#b7b6ae', tr: 2, rich: 1, col: 1, pp: 'attic', ms: 0, tu: 0, er: 0, c: 'H' },
  // Kamennoostrovsky 2 [city-petro 05_kronv_tram, kam 68_kam_spb01]: cream stone Stalinist front (1949-51), pilasters, iron balconies, a balustrade along the whole roof
  r3419581: { a: 'STALIN', f: 5, H: 23, hex: '#dccbb0', tr: 3, pp: 'bal', c: 'H' },
  // B. Pushkarskaya 30 [12_bpush_30]: orange stucco, white window surrounds with pediments on the second floor, terracotta roughcast ground floor, four storeys
  r1248809: { a: 'ECLECTIC', f: 4, H: 17.5, hex: '#e08a4e', tr: 1, gfTint: 2, ms: 0, er: 0, tu: 0, c: 'H' },
  // B. Pushkarskaya 38 [17_bpush_38]: ochre-yellow facing brick with tan plaster bands, bracketed eaves, arched ground-floor windows, a gate; five storeys (OSM says 4)
  r1256806: { a: 'BRICK', f: 5, H: 20, hex: '#c9a04c', er: 0, ms: 0, tu: 0, ga: [0.3, 3.4], c: 'H' },
  // ul. Kropotkina 19 / Sablinskaya 8, Frenkel house [16_frenkel]: mustard roughcast, glazed three-sided bay windows with a balcony on top, wavy gables, a row of tall dormers
  r14585053: { a: 'NORDIC', f: 5, H: 21, hex: '#cdb962', er: 1, gb: 2, gs: 1, ms: 1, mj: 0, so: 0, tu: 0, c: 'H' },
  // Makarova emb. 8 [08_makarova_8, 09_makarova_pano26]: Ministry of Trade and Industry (1912-15), now the military logistics academy: dark grey stone, giant Ionic columns, attics
  r1530755: { a: 'NEOCLASSIC1910', f: 5, H: 25, hex: '#96938a', tr: 2, col: 1, rich: 1, pp: 'attic', ms: 0, tu: 0, er: 0, shop: false, c: 'H' },
  // Makarova emb. 10 / Birzhevoy per. 1 [10_makarova_10]: yellow four-storey eclectic house, cream rusticated quoins and surrounds, balustraded stone balconies
  r1530756: { a: 'ECLECTIC', f: 4, H: 19, hex: '#e3c45c', tr: 3, rich: 1, gfTint: 0, ms: 0, tu: 0, shop: false, c: 'H' },
  // the beginning of Bolshoy pr. P. S. [04_bolshoy_aerial]: the peach five-storey house with the rounded corner (2/1) and the yellow one with the green dome on its corner (ul. Blokhina 33)
  w55413099: { a: 'ECLECTIC', f: 5, H: 21, hex: '#e9b9a4', tr: 1, ms: 0, c: 'H' },
  r2859632: { a: 'ECLECTIC', f: 5, H: 21, hex: '#e6cd7a', tr: 1, tu: 1, tt: 'dome', rf: '#4f8a5e', ms: 0, c: 'H' },

  // the church house of the Prince Vladimir Cathedral (ul. Blokhina 26 lit. B) inside the enclosure fence: one storey in the cathedral's colours, grey sheet roof
  // (docs/research/petro-requests-landmarksVladimir.md; colours #efcb7e / #f4f1e8 from the cathedral dossier). `yard`: it faces no street, every wall is a front.
  w109066965: { a: 'CLASSIC', f: 1, hex: '#efcb7e', tr: 1, rf: '#9aa0a4', yard: 1, ms: 0, tu: 0, shop: false, c: 'M' },

  // ------------------------------------------------------------------ the largest institutional / industrial footprints (tools/city-petro-audit.mjs --largest): no photo opened
  w37463857: { a: 'CLASSIC', f: 2, H: 11, hex: '#e6cf7c', tr: 1, ms: 0, shop: false, c: 'L' },          // Zhdanovskaya ul. 13: the Second Cadet Corps (Mozhaysky academy), 16 900 m2 of two-storey classicism
  w173092649: { a: 'CLASSIC', f: 3, H: 14.5, hex: '#e2c877', tr: 1, ms: 0, shop: false, c: 'L' },       // ul. Krasnogo Kursanta 18: the cadet school block of the same academy
  r409303: { a: 'BRICK', f: 3, H: 15, hex: '#9a5040', ms: 0, er: 0, tu: 0, shop: false, c: 'L' },       // Chkalovsky pr. 15: the Pechatny Dvor printing works (1910), red brick
  w28691170: { a: 'CLASSIC', f: 2, H: 11, hex: '#e3c56c', tr: 1, ms: 0, shop: false, c: 'L' },          // Kadetskaya liniya 1-3: the First Cadet Corps
  r1530759: { a: 'NEOCLASSIC1910', f: 4, H: 21, hex: '#cbc3aa', tr: 2, pp: 'attic', ms: 0, tu: 0, er: 0, shop: false, c: 'L' },   // Birzhevaya liniya 1: Library of the Academy of Sciences (1912-14)
  w1303547573: { a: 'ECLECTIC', f: 3, H: 13.5, hex: '#d8c08a', ms: 0, er: 0, tu: 0, shop: false, c: 'L' },          // the hospital blocks of the Pavlov medical university (ul. Lva Tolstogo 6-8)
  w467582670: { a: 'ECLECTIC', f: 3, H: 13.5, hex: '#dcc79a', ms: 0, er: 0, tu: 0, shop: false, c: 'L' },
  w28710432: { a: 'ECLECTIC', f: 3, H: 13.5, hex: '#d6bd8c', ms: 0, er: 0, tu: 0, shop: false, c: 'L' },
  w108814955: { a: 'MODERN', f: 7, H: 25.5, hex: '#c8c0b0', shop: false, c: 'L' },                      // pr. Dobrolyubova 16 k2: a business centre of the 2000s

  // ------------------------------------------------------------------ region P6, the north-west corner (tools/city-petro-audit.mjs --region P6 --largest 26): no photo opened, c 'L'
  // the Krasnoye Znamya knitting works (Pionerskaya 53-57 / Krasnogo Kursanta 25-31): the power station of Erich Mendelsohn (1926; OSM architect tag) in pale plaster with ribbon
  // windows, the older Kersten workshop blocks in red brick (today business centres: their OSM names would make them glass)
  w128678093: { a: 'PANEL', hex: '#cfc8b8', shop: false, c: 'L' },
  w128678116: { a: 'BRICK', hex: '#a1503f', er: 0, ms: 0, tu: 0, shop: false, c: 'L' },                  // "Red Cadet", Krasnogo Kursanta 25 lit. V
  w514314573: { a: 'BRICK', hex: '#9a5040', er: 0, ms: 0, tu: 0, shop: false, c: 'L' },                  // "Kersten", Krasnogo Kursanta 31
  w128678092: { a: 'BRICK', hex: '#a85a44', er: 0, ms: 0, tu: 0, shop: false, c: 'L' },                  // "Tusar", Krasnogo Kursanta 25 lit. N
  w128678118: { a: 'BRICK', hex: '#8e4a3a', er: 0, ms: 0, tu: 0, shop: false, c: 'L' },                  // Pionerskaya 30 lit. V
  w597992120: { a: 'PANEL', hex: '#c9c2b0', shop: false, c: 'L' },                                       // "IT-Park", Krasnogo Kursanta 25 lit. Zh: a block of the 1930s extension
  w37437365: { a: 'CLASSIC', hex: '#e2c877', tr: 1, ms: 0, shop: false, c: 'L' },                        // Pionerskaya 28: the second territory of the cadet corps / military academy (cf. w37463857)
  r14893079: { a: 'MODERN', hex: '#d9cdb4', shop: false, c: 'L' },                                       // the housing complex on the cape of the Zhdanovka: one-storey podium (r14893078) + 11-storey blocks
  w50065136: { a: 'MODERN', hex: '#e6e0d2', shop: false, c: 'L' },                                       // Vyazovaya ul. 10: a housing complex of the 2000s (the mix gave it a Stalinist front)
  w50065432: { a: 'MODERN', f: 2, H: 12, hex: '#c8c0b0', shop: false, c: 'L' },                          // the volleyball academy: a sports hall (no levels in OSM: was a 21 m block)
  w61558104: { a: 'PANEL', hex: '#cdbf9e', shop: false, c: 'L' },                                        // Chkalovsky pr. 12 / 20: the Chkalovskie baths, a plain block of the 1930s
  w61558384: { a: 'MODERN', hex: '#d9cdb4', shop: false, c: 'L' },                                       // B. Raznochinnaya 25: the community centre of the 2000s
  w115014585: { a: 'PANEL', hex: '#c9c2b0', shop: false, c: 'L' },                                       // Chkalovsky pr. 46: the Okeanpribor institute

  // ------------------------------------------------------------------ regions P7..P9 (the 20 largest of P6..P9 are right by rule; these two the rule got wrong): no photo opened, c 'L'
  w58404178: { a: 'PANEL', hex: '#c9c2b0', shop: false, c: 'L' },                                        // Chkalovsky pr. 46 lit. E: the same institute (the mix made it Art Nouveau)
  r1915364: { a: 'BRICK', f: 3, H: 15, hex: '#9a5040', er: 0, ms: 0, tu: 0, shop: false, c: 'L' },       // ul. Professora Popova 5: the first building of the Electrotechnical Institute (1903), red brick
};
