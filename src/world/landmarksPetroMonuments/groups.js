// landmarksPetroMonuments/groups.js - the layout.GROUPS sub-groups of module landmarksPetroMonuments (pure data, no imports: layout.js merges them).  Claim ONLY what the module really draws (the check tool
// tools/landmarksPetroMonuments-claims.mjs compares the claims with the pieces that were drawn).  Dossier docs/research/petro-monuments-2026.md section 4.1 (66 objects: 62 catalogue ids + 4 added violin pieces).
// NOT claimed (decisions of the dossier, section 4.2): the kindergarten animals, the Carp, "Разводной мост", w974001001, four unknown fountain nodes and Omega (water layer), n10245075680 (drawn by landmarksTroitskaya),
// the Ushakov / Nakhimov busts, the roof pair n11124706605, "300 лет", the grape wall, the buildings and the maze w530129977 (its hedge ways are drawn by the environment).
const ALL = [
  { key: 'pm-busts', name: 'Бюсты Петроградской стороны', nameEn: 'Bronze busts of Petrogradsky Island: Chkalov, Lenin x2, Shostakovich, Roentgen, the seven medics of the Pavlov University alley, Blagoev', ids: [],
    osm: ['n3726726189', 'n725118926', 'n5195119079', 'n747744042', 'n2758253373', 'n6123121475', 'n6123121476', 'n6123121477', 'n6123105714', 'n6123121478', 'n6123121479', 'n6123121480', 'n5840603167'],
    at: [-2200, -3300], note: 'bronze busts on granite pillars with the real plates' },
  { key: 'pm-men', name: 'Памятники людям Петроградской стороны', nameEn: 'Bronze men and groups: Popov, Shevchenko, Nizami, the Uglov group, Hygieia stele, Tukay, Dobrolyubov, Tovstonogov, Mylnikov, Dudin, the front-line cameraman, Volodin', ids: [],
    osm: ['n1970545795', 'n252128651', 'n292325680', 'n4440220895', 'n1899707783', 'n1320897720', 'n725118930', 'n1319290219', 'n6546310315', 'n10184233931', 'n10042444673', 'n13252677726'],
    at: [-2300, -3300], note: 'modelled figures (human kit) on plinths' },
  { key: 'pm-peter-path', name: 'Путь Петра', nameEn: 'The Peter path: seven bronze compositions on boulders (A. Gasparyan, 2024)', ids: [],
    osm: ['n14123598289', 'n14123598292', 'n14123598291', 'n14123598288', 'n14123598293', 'n14123598294', 'n14123598295'], at: [-1262, -2331], note: 'Rus-Europe, Streltsy, Azov, Exit to the sea, Knowledge, Found his home, Paradise' },
  { key: 'pm-violins', name: 'Первая скрипка (сквер композитора Андрея Петрова)', nameEn: 'First Violin sculptures of the Andrey Petrov square + the Skripka-Zhenshchina ring fountain', ids: [],
    osm: ['n6837973312', 'n6837973313', 'n6837973645', 'n1351327777', 'n4496341909', 'n3614187009', 'n4496341907', 'n5931568248'], at: [-2130, -3450], note: 'n3614187009 drawn as the Swan [E]; the lane node is slid onto the lawn' },
  { key: 'pm-small', name: 'Малые формы и памятные знаки', nameEn: 'Nobel tree, Sad Angel, Hippocratic cup, MPVO figure, milestone, boulders, oars, children stele, pioneer steles, anchor', ids: [],
    osm: ['n1986132168', 'n8494731017', 'n4454944698', 'n13955259802', 'n6272612187', 'n2498854016', 'n12897071426', 'n3189624700', 'n2858004279', 'n9014705990', 'n1514171553', 'n7281165650', 'n9822832283', 'n10737731574'], at: [-2000, -3000], note: '' },
  { key: 'pm-alexander', name: 'Александровский парк: скульптуры, лев, цветочные часы', nameEn: 'Alexander Park: four 1972 figures (identities guessed), the cafe lion, the flower clock', ids: [],
    osm: ['n4350028791', 'n9833556017', 'n4782577266', 'n9833556021', 'n8514860399', 'n339816775'], at: [-1790, -2450], note: '' },
  { key: 'pm-fountains', name: 'Фонтаны Петроградской стороны', nameEn: 'Fountains: Swan Lake, Sun, Nakhimov school, Lidval garden, cafe maidens, One Trinity Place splash pad', ids: [],
    osm: ['w946425790', 'w128494923', 'w116399315', 'w1048465851', 'n8514862218', 'n9129609484'], at: [-1800, -2800], note: 'basins are solid, water / jets use the shared uTime' },
];
export const GROUPS_LIST = ALL;
