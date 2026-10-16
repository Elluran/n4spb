// people/voarea.js - VASILIEVSKY ISLAND (docs/VO-BRIEF.md, docs/research/vo-roster-metro.md section 4): the pure data of the people of the island.  petroarea.js rasters it (3 m cells, island outline of
// lib/vo-island.js), zones.js adds the hot spots, people.js adds the head-count caps, nav.js reads the pavement bands.  No imports of three.js, no services: runs in node.
//   VO_OFF      ?vo=off (tools: --vooff) switches the whole island reach off (A / B comparisons); ?petro=off switches it off together with the Petrograd side
//   VO_ZONES    the stay zones of the sights and the flows (head-count caps, people.js DENSITY.vo): index = PETRO_ZONES position (petroarea.js: the ten older zones, then these)
//   VO_CORRIDOR the named streets that carry people (zone weight of their pavements), with an x window (the island runs east to west: the 1st line is at x -3300, the Gulf at x -9700)
//   VO_HOT      the places where people stop: shop / food density cells of the roster (docs/research/vo-roster-metro.md section 4) and the hubs; zones.js adds the crowd discs of the sights
//   VO_LBAND    the pavement bands |v| of the long deck of the island (bridges owner: docs/research/vo-requests-bridges.md section 3)
//   VO_CLOSED   LANDUSE kinds of closed territory (no lattice node, no door goal): the military yards (Naval Corps, the submarine detachment) and the building sites (Lenexpo ...)
import { inIsland } from '../lib/vo-island.js';

export const VO_OFF = !!globalThis.__voOff || (typeof location !== 'undefined' && /[?&]vo=off/.test(location.search));
export const inVO = (x, z) => inIsland(x, z);

/** pavement band of the Blagoveshchensky Bridge: inner |v| = barrier kerb edge, outer |v| = railing (the Nalichny, Korablestroiteley, mouth, Novo-Andreevsky, Uralsky and Smolensky decks are sites of bridges/sites.js: nav.js westDeck) */
export const VO_LBAND = { blagoveshchensky: [16.0, 18.7], 'novo-andreevsky': [0, 1.35, 'ped'] };
/** the road bridges of the island that are sites of bridges/sites.js (their decks carry a routing weight so that the lattice reaches the pavements from bank to bank) */
export const VO_DECKS = ['uralsky', 'smolensky', 'nalichny', 'korablestroiteley', 'smol1', 'smol2', 'smol3', 'smol4'];

/**
 * name, maxPeople (high quality; people.js scales 0.7 / 0.45), discs [x, z, r], tubes [pts, halfWidth], road: [street name, half width, x0, x1] (a tube round the road centre lines inside the x window),
 * svc: sight services whose street-level crowd discs belong to the zone (r + 6), ring: GREEN / LANDUSE id of a polygon, shut: closed at night.  Later zones win where shapes overlap (list order).
 * The weights are the roster hubs (1 = an ordinary street): Vasileostrovskaya forecourt + the 6-7 line boulevard 5, Sredny tram stops 3, Sportivnaya-2 / bridge head 3, Gorny 3, Andrew + market 3,
 * Lt Schmidt embankment 2; caps follow the area and the weight (a summer afternoon, this is not Nevsky).
 */
export const VO_ZONES = [
  { name: 'vo-ltschmidt', maxPeople: 75, road: ['набережная Лейтенанта Шмидта', 20, -4700, -3900] },                              // the Lt Schmidt embankment (weight 2): anglers, runners, the Naval Corps front
  { name: 'vo-sredny', maxPeople: 105, road: ['Средний проспект В.О.', 20, -4700, -3380] },                                          // the high street: shops, cafes, tram stops (weight 3), the densest shop + food cells
  { name: 'vo-academy', maxPeople: 95, discs: [[-3402, -548, 65], [-3379, -508, 40], [-3505, -430, 50], [-3560, -690, 60], [-3475, -640, 50]], svc: ['landmarksAcademy'] },                     // the Academy front, the sphinx pier, Trezzini Square, the Academic garden
  { name: 'vo-menshikov', maxPeople: 85, discs: [[-3092, -705, 58], [-3135, -676, 45], [-3245, -588, 60], [-3272, -640, 60]], svc: ['landmarksMenshikov'] },                                     // the palace forecourt, the west gate, the Rumyantsev descent and garden
  { name: 'vo-andrew', maxPeople: 90, discs: [[-3797, -822, 72], [-3710, -672, 50], [-3765, -655, 30]], tubes: [[[[-3817, -777], [-3900, -880], [-3965, -965]], 28]], svc: ['landmarksAndrew'] },       // the cathedral, the market, the boulevard from Bolshoy (weight 3)
  { name: 'vo-vasil', maxPeople: 115, discs: [[-4080, -1145, 80]], tubes: [[[[-3965, -965], [-4025, -1055], [-4075, -1135]], 28]] },                                                          // the Vasileostrovskaya forecourt and the 6-7 line boulevard towards Sredny (weight 5)
  { name: 'vo-mining', maxPeople: 55, discs: [[-4562, 365, 55], [-4606, 500, 45]], svc: ['landmarksMining'] },                                                                           // the Mining University stair, the Krasin terrace
  { name: 'vo-sportivnaya', maxPeople: 70, discs: [[-3770, -1695, 65], [-3742, -1750, 40], [-3700, -1545, 45]], svc: ['landmarksMakarova'] },                                                // the Sportivnaya-2 pavilions, the Tuchkov Bridge head, the Catherine church (weight 3)
  { name: 'vo-gorny', maxPeople: 75, discs: [[-5040, 0, 70], [-5117, 70, 55]], svc: ['landmarksSredny'] },                                                                                 // the Gorny Institut pavilions and the Baltiysky mall (weight 3)
  { name: 'vo-tram', maxPeople: 40, discs: [[-5000, -650, 45], [-5035, -735, 40]] },                                                                                                          // the Geological Committee stair, the tram depot apron and museum
  { name: 'vo-kirova', maxPeople: 75, discs: [[-5430, -115, 62], [-5590, 25, 55], [-5300, -270, 70]], svc: ['landmarksKirova'] },                                                              // the DK Kirova, Erarta, the Vasileostrovets garden
  { name: 'vo-smolensky', maxPeople: 30, ring: 'r2736670', svc: ['landmarksSmolensky'], quiet: true },                                                                                    // the cemetery: calm (weight ~0.1)
  { name: 'vo-xenia', maxPeople: 55, discs: [[-5586, -1330, 30]] },                                                                                                                       // the pilgrims at the Xenia chapel (a queue disc at all hours)
  { name: 'vo-sevkabel', maxPeople: 90, discs: [[-6232, 912, 60], [-6172, 925, 50], [-6140, 850, 35], [-6230, 862, 45]], svc: ['landmarksSevkabel'] },                                                 // the Sevkabel Port promenade: a summer-evening crowd
  { name: 'vo-seaterminal', maxPeople: 45, discs: [[-6495, 640, 70], [-6560, -84, 28]], svc: ['landmarksSeaTerminal'] },                                                                     // the Sea Terminal forecourt, the D-2 museum door
  { name: 'vo-pribaltiyskaya', maxPeople: 70, discs: [[-7560, -760, 95]], svc: ['landmarksPribaltiyskaya'] },                                                                            // the Pribaltiyskaya Square: hotel plaza, Peter I, Nakhimov
  { name: 'vo-gavan', maxPeople: 50, discs: [[-6968, 20, 50], [-6938, 380, 55], [-6290, -655, 45], [-7010, -31, 25]], svc: ['landmarksGavan'] },                                                   // the Shkipersky canal promenade, the kronshpits, the workers' town courtyards
  { name: 'vo-blag', maxPeople: 30 },                                                                                                                                                      // the Blagoveshchensky Bridge deck (painted from services.bridges.spans)
];
/** the cap of the generic island zone 'vo' (the streets of the island that belong to no sight): people.js uses it instead of the old 60 of the Spit part */
export const VO_GENERIC_CAP = 220;

// the named streets: [weight, x0, x1] (x window; default everywhere).  >= 0.1 gives the pavement a light population, >= 0.16 (+0.06) gives it routing lattice nodes
export const VO_CORRIDOR = {
  'Средний проспект В.О.': [[0.4, -4700, -3380], [0.28, -5500, -4700], [0.11, -9800, -5500]],
  'Большой проспект В.О.': [[0.36, -4500, -3380], [0.22, -5300, -4500], [0.11, -9800, -5300]],
  'Малый проспект В.О.': [[0.2, -4600, -3380], [0.09, -9800, -4600]],
  'набережная Лейтенанта Шмидта': [[0.22, -4720, -3900], [0.09, -9800, -4720]],
  'Университетская набережная': [[0.45, -4000, -2400]],
  'набережная Макарова': [[0.2, -3950, -2400], [0.09, -9800, -3950]],
  'Кадетская линия В.О.': [[0.22, -9800, -3000]], '1-я линия В.О.': [[0.22, -9800, -3000]], 'Менделеевская линия': [[0.22, -9800, -3000]],
  '2-3-я линии В.О.': [[0.1, -9800, -3000]], '4-5-я линии В.О.': [[0.1, -9800, -3000]], '6-7-я линии В.О.': [[0.26, -9800, -3000]], '8-я линия В.О.': [[0.09, -9800, -3000]], '9-я линия В.О.': [[0.09, -9800, -3000]],
  '26-27-я линии В.О.': [[0.18, -5700, -5150]], '24-25-я линии В.О.': [[0.09, -5700, -5150]],
  'Прибалтийская площадь': [[0.3, -9800, -6000]], 'улица Нахимова': [[0.18, -7800, -6900]], 'Наличная улица': [[0.12, -9800, -6000]], 'Шкиперский проток': [[0.18, -7100, -6800]],
  'Детская улица': [[0.1, -9800, -5000]], 'Гаванская улица': [[0.1, -9800, -5000]],
};

// the roster hot spots [x, z, amplitude, sigma]: the densest 250 m cells of shops + food (139 / 63 / 58 / 58 / 53 / 43 ... features), then the hubs of the flows
export const VO_HOT = [
  [-4125, -1125, 0.75, 80], [-3875, -1125, 0.45, 70], [-3625, -875, 0.4, 70], [-3625, -1375, 0.4, 70], [-6875, -625, 0.35, 70], [-3875, -1375, 0.3, 65], [-3875, -875, 0.3, 65], [-4125, -875, 0.3, 65], [-5117, 70, 0.4, 60], [-4375, -1625, 0.3, 65],
  [-4080, -1145, 2.4, 26], [-4089, -1148, 1.2, 18], [-3965, -965, 1.2, 34], [-4020, -1050, 1.2, 34],                                    // Vasileostrovskaya forecourt + the 6-7 line boulevard (weight 5)
  [-3758, -1678, 1.5, 16], [-3792, -1700, 1.5, 16], [-3742, -1752, 1.0, 22],                                                         // Sportivnaya-2 pavilions, the Tuchkov Bridge head (weight 3)
  [-5058, 12, 1.5, 16], [-5025, -26, 1.5, 16], [-5036, -5, 0.6, 20],                                                                 // Gorny Institut pavilions and plaza (weight 3)
  [-3794, -825, 1.5, 28], [-3708, -671, 1.4, 22], [-3765, -655, 0.7, 14],                                                            // the Andrew cathedral, the market, the Pel corner (weight 3)
  [-3402, -548, 1.6, 26], [-3379, -508, 1.4, 16], [-3505, -430, 0.8, 24], [-3560, -690, 0.5, 36],                                    // the Academy of Arts and the sphinxes, Trezzini Square, the Academic garden
  [-3090, -705, 1.5, 22], [-3270, -640, 0.7, 40], [-3245, -588, 0.8, 22],                                                            // the Menshikov Palace, the Rumyantsev garden and descent
  [-4563, 361, 1.4, 20], [-4610, 500, 0.8, 16], [-3986, -244, 0.8, 14],                                                              // the Mining University stair, the Krasin, the Krusenstern monument (Lt Schmidt embankment weight 2)
  [-5586, -1328, 2.2, 14], [-5603, -1511, 0.5, 16],                                                                                  // the Xenia chapel (pilgrims), the Smolensk church; the cemetery stays quiet
  [-5590, 25, 1.2, 22], [-5426, -110, 0.9, 24], [-5300, -270, 0.3, 40],                                                              // Erarta, the DK Kirova, the Vasileostrovets garden
  [-6232, 912, 1.3, 40], [-6172, 925, 1.0, 30], [-6140, 852, 0.7, 14],                                                               // Sevkabel Port promenade, hall, gate
  [-6500, 640, 0.8, 40], [-6560, -84, 0.5, 14],                                                                                      // the Sea Terminal forecourt, the D-2 museum door
  [-7560, -760, 1.0, 40], [-7520, -775, 0.8, 22],                                                                                    // Pribaltiyskaya Square
  [-6968, 20, 0.6, 26], [-6938, 380, 0.6, 24], [-6290, -655, 0.4, 24],                                                               // the Shkipersky canal promenade, the kronshpits, the Gavan courtyards
  [-3440, -1000, 0.8, 26],                                                                                                           // the Lutheran church of St Catherine (gravel square)
  [-3520, -265, 0.8, 30], [-3376, -113, 0.7, 24],                                                                                    // the Blagoveshchensky Bridge heads
];

/** LANDUSE kinds of closed territory */
export const VO_CLOSED = ['military', 'construction'];
