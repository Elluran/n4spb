// landmarksMars/groups.js - the layout.GROUPS sub-groups of module landmarksMars (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS:
// { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.
// Everything listed here is DRAWN by landmarksMars (docs/research/mars-field.md, docs/MARS-BRIEF.md): the Mars Field (the park relation, its lawn quarters, the shrub clumps of the four rondels and the
// gravel / granite footway network of Appendix A1: streets must not draw those ribbons, the generic ground must not plant the Field as a wood), the Memorial to the Fighters of the Revolution with the
// Eternal Flame, the Suvorov monument with its island, the Marble Palace with the forecourt fence and the Alexander III monument, the service wing, the Saltykov and Betsky houses, the Pavlovsky Barracks.
// Ordinary houses of Millionnaya / the Moika are NOT claimed (the city module draws them from its KNOWN table).
export const GROUPS_LIST = [
  { key: 'mars-field', name: 'Марсово поле', nameEn: 'Mars Field: parterre lawns, gravel alleys, the plaza, four rondels, lime rows, lamps and benches', ids: [],
    osm: [
      'r15745625', 'r15745620', 'r15745623', 'r15745621', 'r15745622',
      // shrub clumps of the four rondels
      'w307505841', 'w307505842', 'w307505843', 'w307505844', 'w307505845', 'w307505846', 'w307652467', 'w307652468', 'w307652479', 'w307652474', 'w307652476', 'w307652481',
      'w307652466', 'w307652475', 'w307652482', 'w307652472', 'w307652477', 'w307652480', 'w307652469', 'w307652473', 'w307652471', 'w307652478', 'w307652470', 'w307652483',
      // footways of the Field (OSM Appendix A1 of the dossier): fine gravel alleys, the plaza ring, the rondel loops, memorial paving strips, grass pavers
      'w45393525', 'w45393541', 'w45393542', 'w45393548', 'w116254037', 'w1164028346', 'w1164028391', 'w1164028382', 'w160003832', 'w285989623', 'w776081850', 'w308652195', 'w45393573', 'w197658136',
      'w45393530', 'w45393554', 'w151671754', 'w45393529', 'w45393552', 'w45393572', 'w307505848', 'w45393546', 'w45393547', 'w45393550', 'w45393555', 'w45393537', 'w151671757', 'w197658105',
      'w197658111', 'w197658114', 'w197658121', 'w197658122', 'w197658131', 'w307505847', 'w307505849', 'w1164028392', 'w45393527', 'w45393521', 'w45393522', 'w151671750', 'w151671751', 'w197658109',
      'w197658110', 'w197658112', 'w197658116', 'w197658132', 'w1164028393', 'w45393534', 'w45393535', 'w116254031', 'w45393536', 'w45393538', 'w45393545', 'w116254033', 'w116254039', 'w45393531',
      'w45393533', 'w116254043', 'w151671749', 'w197658104', 'w776081855', 'w285989616', 'w1164028381', 'w364436489', 'w151671755', 'w151671748',
    ], at: [-1086, -1243],
    note: 'park r15745625 (10.7 ha) + the all-park gravel area r15745620 (the generic modules would pave / plant it), lawn quarters r15745622, 24 shrub clumps, 75 footways; benches, lamps, trees are drawn here' },
  { key: 'mars-memorial', name: 'Мемориал «Борцам революции» и Вечный огонь', nameEn: 'Memorial to the Fighters of the Revolution with the Eternal Flame (four L-shaped granite walls, eight inscription slabs)', ids: [],
    osm: ['w89083040', 'n6445811888', 'n11878563079', 'w116254029', 'w116254036', 'w116254038', 'w116254042'], at: [-1086, -1243],
    note: 'memorial polygon w89083040 (52.9 m square), the flame node, the first inscription plaque node, the four wall outlines (barrier=wall)' },
  { key: 'suvorov', name: 'Памятник А. В. Суворову', nameEn: 'Suvorov monument (Kozlovsky 1801) on its island on Suvorov Square', ids: [],
    osm: ['n334791500', 'w151671746'], at: [-1197, -1502],
    note: 'statue node n334791500; the long pedestrian island w151671746 (12 m wide, 35 m long, also a kerb barrier) is paved / planted by landmarksMars' },
  { key: 'marble-palace', name: 'Мраморный дворец, Служебный корпус, дома Салтыкова и Бецкого', nameEn: 'Marble Palace (Rinaldi) with the service wing, the Saltykov and Betsky houses and the Alexander III monument', ids: ['r969622', 'r1413513', 'r1361783', 'r1361784'],
    osm: ['n1312226165', 'w116396254', 'w116396257'], at: [-1376, -1417],
    note: 'palace r969622, service wing r1413513 (green), Saltykov house r1361783 (mint), Betsky house r1361784 (pink); the forecourt fence w116396254 / w116396257; the "Komod" n1312226165' },
  { key: 'adamini-house', name: 'Дом Адамини', nameEn: 'Adamini house (Marsovo pole 7): yellow, 8-column white portico', ids: ['r7033585'], osm: [], at: [-1232, -1088],
    note: 'r7033585 (3 levels, OBB 66 x 80 m): closes the view along the Griboedov Canal at the south-west corner of the Field' },
  { key: 'pavlovsky-barracks', name: 'Павловские казармы', nameEn: 'Pavlovsky Barracks (Stasov 1821): 150 m yellow front with the ten-column portico', ids: ['r7033586'],
    osm: [], at: [-1270, -1275],
    note: 'r7033586: three courtyards; the Field-facing front is the edge (-1243.6,-1205.5)-(-1296.9,-1345.6)' },
];
