// landmarksG/groups.js - the layout.GROUPS sub-groups of module landmarksG (pure data, no imports: layout.js merges them). Fields as in layout.js GROUPS: { key, name, nameEn, ids: [OSM building ids + parts parents], osm: [non-building OSM ids], at: [x, z], note }.
// Everything claimed here is drawn by landmarksG (OWNS_GROUPS = true): the General Staff wings and arch, the Guards Corps HQ, the Alexander Column (the parts r18056121 / w13162447xx follow their parent
// r2000648 automatically) and the granite stone field of the square (AREAS r1947507).
export const GROUPS_LIST = [
  { key: 'general-staff', name: 'Здание Главного штаба и арка', nameEn: 'General Staff Building (Rossi) with the Triumphal Arch', ids: ['w309796655', 'r1453436', 'r1453435', 'w100016301', 'w102048766'], osm: [], at: [-1930, -610],
    note: 'east wing w309796655, centre + west wing r1453436 (with the dome courtyard), west end block r1453435 (Dvortsovaya pl. 12), the two roofed arch passages w100016301 / w102048766; wings 4 storeys, cornice ~23 m, arch 28 m + chariot to 36 m' },
  { key: 'guards-hq', name: 'Штаб Гвардейского корпуса', nameEn: 'Guards Corps Headquarters (Bryullov)', ids: ['w41289421'], osm: [], at: [-1872, -866],
    note: 'Dvortsovaya pl. 4: 12 Ionic columns over a two-storey base, front towards the column' },
  { key: 'alexander-column', name: 'Александровская колонна', nameEn: 'Alexander Column', ids: ['r2000648'], osm: [], at: [-1983, -738],
    note: '47.5 m monolith, pedestal with reliefs, angel + cross, fence 16.5 m (parts follow the parent r2000648; step3 r18056121)' },
  { key: 'palace-square', name: 'Дворцовая площадь (каменное поле)', nameEn: 'Palace Square stone field', ids: [], osm: ['r1947507', 'r1947508', 'w217399816', 'w143820667', 'w180425990'], at: [-1972, -723],
    note: 'granite pedestrian area r1947507 (17 679 m2): the bell-shaped field of diabase setts in 12.6 m fields framed by grey granite bands and pink diagonals; r1947508 = the whole square (area=square, u -92..123, v -121..246 in the palace frame): asphalt; w217399816 / w143820667 / w180425990 = the OSM living-street trace round the stone field and across the palace front (NOT a real carriageway: streets may skip these ways, the asphalt of the square covers them)' },
];
