// people/isl2area.js - the ISLANDS of round 2 (docs/ISLANDS2-BRIEF.md, docs/research/people-isl2.md): Yelagin, Kamenny, Aptekarsky, Petrovsky (+ Serny) and the Krestovsky stadium area.  Same recipe as people/petroarea.js
// (Petrograd side / Spit / Vasilievsky Island): a 3 m raster of "where a person may walk off the generic pavements, how much a place is wanted and which quiet zone it belongs to", composed into nav.area by people/area.js.
//   cat 1  pavement of a named street / pavement inside a stay zone of a sight        cat 2  generic OSM footway inside a stay zone (the park paths)      y 0.04
//   cat 3  crowd disc published by a sight service (crowd: [{ x, z, r }])              y null (the pavement / the module's own surface)
//   flg 1  lawn nobody walks on (the beds of the Botanical Garden stay blocked by nav.js blockedPoly)   flg 2 closed territory (palace garden, yards, yacht clubs, nurseries, building sites): no lattice node, no footway node, no door goal
// ZONES (head-count caps: people.js DENSITY.isl, in ISL_ZONES order; the global zone index is the number of older zones + the local one: nav.area.zone).  Shapes paint in list order, later shapes win; the generic island zones
// (the whole island polygon) come first.  Everything is read from the services / the baked OSM data; every input is optional.  ?isl=off (tools: --isloff) switches the whole reach off (A / B); ?petro=off does too.
// Pure data + a raster: no three.js, runs in node.
import { AREAS, GREEN, LANDUSE } from '../data/city.js';

export const ISL_OFF = !!globalThis.__islOff || (typeof location !== 'undefined' && /[?&]isl=off/.test(location.search));
/** the island outlines of docs/reference/islands2-island-polys.json, simplified to 6 m (flat x, z, ...) */
const POLY = {
  yelagin: [[-5204,-4873,-5052,-4860,-4750,-4777,-4685,-4788,-4641,-4834,-4643,-4850,-4630,-4849,-4613,-4870,-4508,-5025,-4409,-5254,-4335,-5362,-4334,-5391,-4398,-5426,-4548,-5474,-4674,-5501,-4726,-5527,-4832,-5537,-4876,-5557,-4987,-5564,-5038,-5561,-5088,-5543,-5325,-5544,-5527,-5532,-5942,-5486,-6296,-5404,-6379,-5403,-6418,-5348,-6423,-5309,-6412,-5286,-6394,-5276,-6106,-5275,-6024,-5201,-5996,-5186,-5834,-5165,-5798,-5168,-5501,-4940,-5426,-4934,-5270,-4896,-5241,-4877,-5204,-4873]],
  kamenny: [[-4107,-4850,-4127,-4813,-3991,-4731,-3985,-4718,-3994,-4690,-3800,-4525,-3774,-4517,-3746,-4523,-3445,-4692,-3405,-4706,-3106,-4950,-2852,-5085,-2839,-5080,-2814,-5094,-2788,-5121,-2574,-5252,-2525,-5345,-2539,-5362,-2786,-5463,-2886,-5485,-3018,-5494,-3178,-5518,-3643,-5493,-3808,-5460,-4034,-5377,-4128,-5379,-4198,-5346,-4230,-5299,-4232,-5279,-4279,-5225,-4313,-5138,-4338,-5007,-4351,-5003,-4399,-5021,-4413,-4990,-4339,-4954,-4332,-4937,-4342,-4892,-4295,-4858,-4234,-4839,-4120,-4862,-4107,-4850]],
  aptekarsky: [[-2450,-4164,-2423,-4179,-2362,-4178,-2339,-4151,-2303,-4073,-2265,-4033,-2201,-3999,-2014,-3952,-1969,-3950,-1472,-4007,-1344,-3997,-1151,-3921,-1018,-3897,-1028,-3945,-1270,-4520,-1326,-4624,-1447,-4795,-1628,-4989,-1768,-5098,-1867,-5147,-1939,-5157,-2263,-5143,-2358,-5130,-2364,-5111,-2597,-5027,-2719,-4962,-2740,-4966,-2767,-4951,-2770,-4938,-3094,-4736,-3319,-4559,-3645,-4415,-3719,-4354,-3772,-4287,-3828,-4121,-3848,-3979,-3796,-3968,-3725,-4024,-3669,-4040,-3329,-4054,-3206,-4031,-3167,-4034,-3108,-4061,-3102,-4074,-2912,-4203,-2844,-4219,-2776,-4206,-2642,-4135,-2612,-4129,-2564,-4131,-2450,-4164]],
  petrovsky: [[-4478,-3184,-4666,-3288,-4716,-3288,-4927,-3426,-4985,-3442,-5312,-3458,-5486,-3496,-5509,-3492,-5605,-3528,-5601,-3535,-5668,-3566,-5715,-3577,-5742,-3556,-5816,-3443,-5821,-3453,-5768,-3544,-5931,-3596,-5925,-3617,-6053,-3644,-6051,-3652,-6076,-3660,-6084,-3636,-6235,-3678,-6286,-3743,-6303,-3727,-6278,-3690,-6354,-3483,-6459,-3550,-6486,-3611,-6485,-3653,-6473,-3683,-6426,-3729,-6410,-3735,-6388,-3728,-6384,-3748,-6408,-3752,-6454,-3727,-6482,-3696,-6498,-3658,-6499,-3594,-6458,-3527,-6117,-3328,-6094,-3331,-6066,-3368,-6066,-3378,-6091,-3396,-6047,-3460,-6006,-3447,-6018,-3361,-5996,-3358,-5998,-3347,-6018,-3352,-6031,-3277,-6020,-3250,-5842,-3184,-5837,-3171,-5767,-3140,-5758,-3122,-5330,-2987,-5285,-2976,-5281,-2989,-5156,-2957,-4978,-2876,-4956,-2874,-4931,-2853,-4892,-2839,-4866,-2809,-4541,-2627,-4281,-2373,-4159,-2322,-4148,-2325,-4111,-2373,-4128,-2424,-4047,-2480,-3926,-2456,-3868,-2417,-3828,-2406,-3668,-2279,-3774,-2139,-3771,-2103,-3668,-2027,-3633,-2031,-3527,-2183,-3528,-2233,-3542,-2259,-3617,-2320,-3617,-2332,-3714,-2404,-3786,-2434,-3955,-2533,-4052,-2638,-4105,-2717,-4189,-2920,-4243,-3017,-4478,-3184]],
  serny: [[-5020,-2666,-5014,-2635,-4945,-2567,-4896,-2551,-4808,-2483,-4790,-2477,-4741,-2489,-4744,-2521,-4847,-2654,-4993,-2730,-5005,-2730,-5017,-2713,-5020,-2666]],
  krestovsky: [[-7810,-4805,-7851,-4731,-7883,-4631,-7892,-4447,-7880,-4323,-7832,-4204,-7820,-4200,-7760,-4224,-7734,-4217,-7681,-4115,-7651,-4097,-7643,-4079,-7600,-4089,-7601,-4127,-7448,-4169,-7437,-4183,-7085,-4118,-7061,-4069,-7004,-4096,-6874,-4084,-6813,-4061,-6730,-3963,-6687,-3965,-6663,-3989,-6618,-4010,-6615,-4057,-6590,-4055,-6578,-4051,-6568,-4016,-6336,-3915,-6291,-3910,-6284,-3886,-6240,-3873,-6206,-3893,-6145,-3845,-6089,-3830,-6064,-3826,-6032,-3844,-6013,-3844,-5811,-3823,-5725,-3835,-5716,-3815,-5678,-3805,-5518,-3812,-5340,-3760,-5319,-3769,-5289,-3765,-5117,-3714,-5023,-3711,-4981,-3693,-4807,-3693,-4796,-3678,-4775,-3682,-4762,-3672,-4671,-3684,-4375,-3692,-4372,-3684,-4178,-3759,-4099,-3804,-3989,-3932,-3956,-4024,-3919,-4247,-3821,-4485,-3824,-4497,-3962,-4623,-4292,-4826,-4398,-4873,-4442,-4863,-4583,-4728,-4654,-4678,-4765,-4655,-4833,-4665,-5100,-4741,-5282,-4734,-5416,-4764,-5729,-4893,-5740,-4913,-5761,-4914,-5838,-4952,-5912,-4847,-5969,-4852,-5907,-4960,-5934,-4998,-6154,-5069,-6221,-5106,-6332,-5129,-6411,-5100,-6468,-5121,-6521,-5117,-6553,-5124,-6574,-5155,-6638,-5172,-6728,-5145,-6744,-5121,-6742,-5075,-6702,-5019,-6581,-4934,-6550,-4938,-6474,-4986,-6403,-4946,-6356,-4953,-6329,-4936,-6295,-4895,-6301,-4885,-6336,-4888,-6331,-4865,-5961,-4827,-5945,-4809,-5950,-4760,-5966,-4745,-7447,-4877,-7445,-4964,-7337,-4953,-7331,-4975,-7342,-4985,-7431,-4990,-7446,-5002,-7474,-5003,-7536,-4993,-7629,-4960,-7712,-4906,-7810,-4805]],
};
const BB = {}; for (const k of Object.keys(POLY)) for (const o of POLY[k]) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } (BB[k] ||= []).push([x0, x1, z0, z1]); }
const ringHasF = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; };
/** the name of the island under (x, z) ('yelagin' | 'kamenny' | 'aptekarsky' | 'petrovsky' | 'serny' | 'krestovsky') or null */
export function islandAt(x, z) {
  if (x < -7950 || x > -900 || z < -5770 || z > -2010) return null;
  for (const k in POLY) { const bs = BB[k]; for (let q = 0; q < bs.length; q++) { const b = bs[q]; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue; if (ringHasF(POLY[k][q], x, z)) return k; } }
  return null;
}
export const inIsl = (x, z) => islandAt(x, z) !== null;

/** the sight modules of the islands: their services (crowd discs, photoSpots, monuments, benches, entrances) belong to the island reach */
export const ISL_SIGHTS = ['landmarksYelaginPalace', 'landmarksYelaginKitchen', 'landmarksYelaginServices', 'landmarksYelaginRossi', 'landmarksYelaginSpits', 'landmarksYelaginPark', 'landmarksKamennyPalace', 'landmarksKamennyChurch',
  'botanicalGreenhouses', 'landmarksBotanicalGarden', 'landmarksPetrovskyStadium', 'landmarksPetrovskyYacht', 'landmarksKrestovsky',
  // the second wave of 2026-10-15 (the services are optional: a module that is not built publishes nothing)
  'landmarksKamennyTheatre', 'landmarksKamennyDachasEast', 'landmarksKamennyDachasWest', 'landmarksTVTower', 'landmarksLETI', 'landmarksTransfiguration', 'landmarksPetrovskyWest', 'landmarksZhdanovka'];

/**
 * ISL_ZONES: name, maxPeople (high quality; people.js scales 0.7 / 0.45), poly: island key (+ clip [x0, x1, z0, z1]), discs [x, z, r], tubes [pts, halfWidth], road: [street name, half width, z0, z1] (a tube round the road centre lines inside the z window),
 * svc: sight services whose street-level crowd discs belong to the zone (r + 6), quiet: calm (weight ~0.12), shut: closed at night, stay: the walkers of a full zone keep their goals inside it.  w: the weight of the pavements
 * (default 0.24).  Later zones win where shapes overlap (list order).
 */
export const ISL_ZONES = [
  // ---- the generic island zones (the whole island polygon: the park footways, the streets that belong to no sight)
  { name: 'ye-island', maxPeople: 130, poly: 'yelagin', quiet: true },
  { name: 'ka-island', maxPeople: 70, poly: 'kamenny', quiet: true },
  { name: 'ap-island', maxPeople: 70, poly: 'aptekarsky', quiet: true },
  { name: 'pe-island', maxPeople: 60, poly: 'petrovsky', clip: [-9000, -3985, -9000, 0], quiet: true },
  // ---- Yelagin (docs/research/yelagin-park-2026.md section 6, the palace / kitchen / services / rossi / spits requests)
  { name: 'ye-meadow', maxPeople: 55, discs: [[-4625, -5226, 42]] },                                                                                               // the Butter Meadow (the open lawn west of the palace): picnics, families, kites
  { name: 'ye-palace', maxPeople: 75, discs: [[-4584, -5226, 26], [-4508, -5226, 24], [-4546, -5224, 34]], svc: ['landmarksYelaginPalace'] },                          // the west / east stair of the palace, the rotunda
  { name: 'ye-court', maxPeople: 60, discs: [[-4625, -5258, 22], [-4629, -5311, 18], [-4818, -5270, 22], [-4823, -5328, 20], [-4631, -5316, 18]], svc: ['landmarksYelaginKitchen', 'landmarksYelaginServices'] },   // the Kitchen portico, the Stable gate, the round court, the Orangery front
  { name: 'ye-rossi', maxPeople: 50, discs: [[-4362, -5378, 26], [-4617, -4930, 28]], svc: ['landmarksYelaginRossi'] },                                                // the East pavilion + the granite pier, the Music pavilion alley
  { name: 'ye-spit', maxPeople: 70, discs: [[-6409, -5309, 24], [-6397, -5309, 26]], svc: ['landmarksYelaginSpits'], w: 0.3 },                                         // the west spit terrace: the sunset gathering
  { name: 'ye-theatre', maxPeople: 65, discs: [[-5233, -5343, 40]], svc: ['landmarksYelaginPark'] },                                                                // the Estradny theatre: the audience under the two canopies
  { name: 'ye-boats', maxPeople: 45, discs: [[-5537.5, -5384, 30], [-4871, -4967, 20]] },                                                                          // the boat rental on the 4th Northern pond, the catamaran pier
  { name: 'ye-hercules', maxPeople: 35, discs: [[-5545, -5114, 28], [-5549, -5132, 14]] },                                                                          // the Hercules on his cape
  { name: 'ye-beach', maxPeople: 100, discs: [[-5921, -5211, 44], [-5890, -5325, 58], [-5966, -5366, 30], [-5982, -5364, 24]] },                                      // Green Beach + volleyball, the mini-zoo, the rope park
  { name: 'ye-kirov', maxPeople: 55, discs: [[-5214, -4909, 24], [-5210, -4822, 34]] },                                                                             // the Kirov bust, the 2nd bridge head (the main entrance)
  // ---- Kamenny (docs/research/islands2-requests-kamenny.md 14: the avenue pavements, the church forecourt, Starogo Teatra square, the Olympic alley; the palace garden is closed)
  { name: 'ka-avenue', maxPeople: 45, road: ['Каменноостровский проспект', 24, -5560, -4900], discs: [[-2870, -5338, 28]], svc: ['landmarksKamennyPalace'] },                                // Kamennoostrovsky pr. and the guardhouse corner
  { name: 'ka-church', maxPeople: 35, discs: [[-2861, -5413, 26], [-2832, -5459, 20]], svc: ['landmarksKamennyChurch'] },                                              // the church forecourt, the chapel quay lawn
  { name: 'ka-theatre', maxPeople: 40, discs: [[-4250, -4942, 42]], svc: ['landmarksKamennyTheatre'] },                                                                                              // Starogo Teatra square: theatre-goers, scooters
  { name: 'ka-olympic', maxPeople: 30, discs: [[-2925, -5425, 34]], tubes: [[[[-3126, -5013], [-3050, -5022], [-2967, -5030]], 16]] },                                // the Olympic alley, the Oldenburg embankment path
  // ---- Aptekarsky (docs/research/islands2-requests-aptekarsky.md 25: garden visitors on the alleys and the museum square only)
  { name: 'ap-garden', maxPeople: 140, ring: 'r11561805', shut: true, w: 0.22 },                                                                                       // the arboretum (the open garden): strollers on the alleys
  { name: 'ap-palm', maxPeople: 60, discs: [[-1503.6, -4162.8, 18], [-1581.7, -4309.7, 18], [-1459.5, -4280.3, 18]], svc: ['botanicalGreenhouses'], shut: true },                // the Palm House portal, the museum door, the vestibule bow
  { name: 'ap-institute', maxPeople: 45, discs: [[-1757, -4055, 24], [-1572, -4283, 24]], svc: ['landmarksBotanicalGarden'], shut: true },                              // the Institute porch, the north court with the Peter bust
  { name: 'ap-leti', maxPeople: 40, discs: [[-1560, -4395, 26], [-1587, -4404, 12], [-1563, -4473, 12], [-1464, -4462, 14], [-1770, -4281, 16], [-1772, -4386, 14], [-1708, -4292, 12]], svc: ['landmarksLETI'] },  // LETI Corpus 5: the students on the stairs, the busts of Popov and Vologdin, the war memorial, the clock corner of Corpus 1
  // ---- Petrovsky (docs/research/islands2-requests-petrovsky-zhdanovka.md: park walkers, skaters, anglers; the club is closed)
  { name: 'pe-park', maxPeople: 70, discs: [[-4200, -2680, 70], [-4270, -2575, 40]] },                                                                               // the sand paths of Petrovsky Park, the pond
  { name: 'pe-betancourt', maxPeople: 40, discs: [[-4758, -2866, 34]] },                                                                                            // Betancourt Plaza: skaters, benches
  { name: 'pe-savina', maxPeople: 25, discs: [[-5398, -3379, 40]], quiet: true },                                                                                    // the Savina garden: a few elderly residents
  // ---- Krestovsky (the stadium surroundings as built)
  { name: 'kr-stadium', maxPeople: 110, discs: [[-7310, -4519, 215]], w: 0.3 },                                                                                       // the apron round the arena and the plaza
  // ---- the second wave (2026-10-15): appended, so the indices of the zones above do not move
  { name: 'ka-sphinx', maxPeople: 25, discs: [[-2964, -5037, 20]], svc: ['landmarksKamennyDachasEast'] },                                                                // the sphinx pier of the Oldenburg dacha: photographers on the embankment lawn above the flight
  { name: 'ap-transfig', maxPeople: 20, discs: [[-1466, -4533, 22]], svc: ['landmarksTransfiguration'], quiet: true },                                                    // the church of the Transfiguration seen from Instrumentalnaya ul.
  { name: 'ap-tower', maxPeople: 20, discs: [[-1626, -4916, 14], [-1711, -4847, 14], [-1764, -4930, 14], [-1681, -4984, 14]], quiet: true },                             // the photo spots round the fence of the TV tower (nobody inside it)
  { name: 'pe-west', maxPeople: 15, discs: [[-5343, -3256, 24]], svc: ['landmarksPetrovskyWest'], quiet: true },                                                         // the Almaz office front on Petrovsky pr.
];

/** the named streets that carry people on the islands: [weight, z0, z1] windows */
export const ISL_CORRIDOR = {
  'Каменноостровский проспект': [[0.3, -5700, -4000]], 'Большая аллея': [[0.2, -9000, 0]], '1-я Берёзовая аллея': [[0.14, -9000, 0]], '2-я Берёзовая аллея': [[0.14, -9000, 0]], 'площадь Старого Театра': [[0.3, -9000, 0]],
  'набережная реки Большой Невки': [[0.2, -5700, -4000]], 'набережная реки Малой Невки': [[0.2, -5700, -4000]], 'набережная реки Средней Невки': [[0.18, -5700, -4000]], 'набережная реки Крестовки': [[0.16, -5700, -4000]],
  'улица Профессора Попова': [[0.36, -4800, -3900]], 'проспект Медиков': [[0.2, -4800, -3900]], 'Аптекарская набережная': [[0.2, -4800, -4000]], 'Песочная набережная': [[0.18, -4800, -4000]], 'Аптекарский проспект': [[0.18, -4800, -3900]],
  'улица Академика Павлова': [[0.18, -4800, -3900]], 'Петровский проспект': [[0.28, -9000, 0]], 'Ремесленная улица': [[0.14, -9000, 0]], 'Петровская коса': [[0.16, -9000, 0]],
  'Футбольная аллея': [[0.4, -9000, 0]], 'Морской проспект': [[0.18, -5000, -3000]], 'Северная дорога': [[0.16, -9000, 0]], 'Южная дорога': [[0.16, -9000, 0]], 'Крестовский проспект': [[0.16, -9000, 0]],
};

/** the places where people stop [x, z, amplitude, sigma]: the dossiers (people owner sections); zones.js adds the crowd discs of the services */
export const ISL_HOT = [
  [-6405, -5309, 2.4, 14], [-6409, -5315, 1.2, 28],                                              // the west spit terrace: benches + the sunset viewpoint (azimuth 255)
  [-4584, -5226, 1.8, 14], [-4508, -5226, 1.4, 14], [-4546, -5222, 0.9, 30], [-4625, -5226, 0.9, 30],        // the Yelagin Palace stairs + the Butter Meadow
  [-4625, -5258, 1.3, 11], [-4629, -5311, 1.0, 10], [-4818, -5268, 1.2, 12], [-4823, -5328, 0.9, 12], [-4631, -5316, 1.0, 12],      // the Kitchen portico, the Stable gate + round court, the Orangery
  [-4362, -5378, 1.2, 14], [-4617, -4930, 1.1, 14],                                              // the East pavilion + pier, the Music pavilion
  [-5233, -5343, 2.0, 18], [-5537, -5384, 1.6, 14], [-5545, -5114, 1.3, 14], [-5214, -4909, 1.2, 12], [-5210, -4822, 1.2, 18],   // the theatre, the boat rental, Hercules, Kirov bust, the 2nd bridge head
  [-5921, -5211, 1.6, 22], [-5890, -5325, 1.3, 30], [-5966, -5366, 1.0, 14], [-5487, -5333, 0.7, 14], [-4871, -4967, 0.7, 12],    // the beach, the mini-zoo, the rope park, the rinks, the catamaran pier
  [-4740, -5388, 0.6, 20], [-4970, -5538, 0.4, 14], [-4869, -5501, 0.4, 14],                    // the Big Square, the tennis courts, crossfit
  [-2870, -5338, 0.8, 14], [-2861, -5413, 1.0, 12], [-2832, -5459, 0.6, 10], [-4250, -4942, 1.0, 24], [-2925, -5425, 0.6, 16],     // Kamenny: guardhouse corner, church, chapel, Starogo Teatra, the Olympic alley
  [-1523, -4154, 1.5, 12], [-1471, -4280, 1.2, 12], [-1582, -4310, 1.2, 12], [-1757, -4055, 1.0, 14], [-1572, -4283, 1.0, 14], [-1526, -4268, 0.7, 12], [-1560, -4395, 1.0, 14], [-1832, -4017, 0.8, 10],        // the Botanical Garden
  [-4200, -2680, 0.7, 40], [-4270, -2575, 0.8, 18], [-4758, -2866, 1.2, 18], [-5398, -3379, 0.5, 24],     // Petrovsky Park, the pond, Betancourt Plaza, the Savina garden
  [-7310, -4519, 0.8, 70], [-7310, -4630, 0.9, 40],                                              // the stadium apron
  [-2964, -5037, 1.1, 12], [-4275, -4946, 1.0, 12], [-1565, -4404, 1.2, 14], [-1587, -4404, 0.7, 8], [-1563, -4473, 0.6, 8], [-1464, -4462, 0.6, 10], [-1770, -4281, 0.9, 12], [-1477, -4531, 0.8, 10], [-1455, -4534, 0.6, 10],     // the sphinx pier, the Kamenny theatre steps, LETI (Corpus 5 plaza, busts, memorial, clock corner), the Transfiguration church
  [-1626, -4916, 0.5, 10], [-1711, -4847, 0.5, 10], [-1764, -4930, 0.5, 10], [-5343, -3256, 0.5, 10],          // the photo spots of the TV tower, the Almaz office
];

/** walkable ground without any OSM footway or area: the granite apron round the Krestovsky arena (landmarksKrestovsky/plaza.js: an elliptical ring between 0.84 and 1.42 x the radii (148.2, 147.7) round (-7310.1, -4518.9)): the arc between a0 and a1 (degrees from +x, z south) is a gravel-class surface for the lattice */
export const ISL_PLAZAS = [{ x: -7310.1, z: -4518.9, rx: 148.2, rz: 147.7, r0: 0.84, r1: 1.42, a0: -62, a1: 62, w: 0.3, zone: 'kr-stadium' }];

/** closed territory: GREEN / LANDUSE polygons by id, whole LANDUSE kinds inside the islands, hand-measured discs [x, z, r] (no lattice node, no footway node, no door goal; a public street that passes is allowed) */
export const ISL_CLOSED_IDS = ['r10254219', 'w188630570', 'r11561831', 'r11561843', 'r13550909', 'w1040003617', 'w857633542', 'w1236324269', 'r19933500', 'w466342518', 'r14600641', 'w136941280', 'r1576111', 'r1576113', 'r1576117', 'r1576119', 'w938558335', 'w985984623'];
export const ISL_CLOSED_KINDS = ['military', 'construction', 'plant_nursery'];
export const ISL_CLOSED_DISCS = [[-6265, -3652, 55], [-6115, -3525, 35], [-5954, -3490, 38], [-2713, -5228, 10], [-2735, -5246, 16], [-2765, -5265, 18], [-2800, -5288, 18], [-1696, -4915.7, 36], [-4825, -3150, 45]];     // + the fenced territory of the TV tower (hexagon fence, circumradius 34), the malthouse / ruin / hoarding yard of Petrovskaya kosa west (landmarksPetrovskyWest)
/** closed plots outlined by their fences (flat x, z rings; the pavements of the public streets round them are not touched, see isl2area closed()): the Gauswald compound (two rings), the Follenweider plot, the Polovtsov plot (fence chain + the line of the avenue side), the Oldenburg dacha plot (fences w640543962 / w741702547 + wall w640543965) */
export const ISL_CLOSED_POLYS = [
  [-3850.8, -5050.1, -3818.5, -5069.1, -3803.4, -5078, -3780.8, -5097.3, -3744.4, -5052.8, -3727.3, -5031.8, -3671.9, -4964.1, -3686, -4960.9, -3732.4, -4964.9, -3759.1, -4967.2, -3768.6, -4968.1, -3833.1, -4973.6],
  [-3832.7, -4977.4, -3829.6, -5005, -3827.3, -5025.2, -3850.8, -5050.1, -3852.7, -5049.1, -3860.1, -5045.3, -3886.6, -5024.1, -3889.9, -5021.5, -3910.8, -5002.6, -3924.9, -4979.8, -3878.3, -4976.7, -3837.6, -4974.1],
  [-3798.6, -5141.5, -3802.9, -5144.8, -3815.1, -5159.2, -3852.9, -5207.7, -3816.3, -5235.5, -3784.4, -5249.5, -3779.6, -5248.7, -3763.5, -5247.4, -3753.1, -5248, -3730, -5245, -3728, -5170, -3750, -5125, -3790, -5120],
  [-4235.4, -4979.5, -4238.8, -4981.3, -4243.6, -4972.7, -4258.8, -4981, -4262.7, -4983.8, -4266.1, -4988.7, -4269.3, -4996.5, -4269.8, -5004.7, -4261.1, -5168.8, -4252.1, -5194.7, -4242.1, -5213.2, -4230.7, -5227.6, -4219.5, -5237.1, -4193.3, -5256, -4171.7, -5269.3, -4149.5, -5284.8, -4130.8, -5295.9, -4113.8, -5303.7, -4095.7, -5311.5, -4062.8, -5324.4, -4075, -5290, -4105, -5190, -4128, -5128, -4160, -5062, -4213, -5022],
  [-3045, -5018, -3043, -5016, -3041, -5016, -3039, -5017, -2948, -5067, -2944, -5067, -2909, -5087, -2909, -5091, -2943, -5151, -2994, -5168, -3055, -5148, -3083, -5094, -3072, -5069, -3074, -5065, -3074, -5061],
];

export function makeIsl2Area(ctx, L, st) {
  const sv = ctx.services;
  const X0 = -7950, X1 = -900, Z0 = -5780, Z1 = -2000, CS = 3, NX = Math.ceil((X1 - X0) / CS), NZ = Math.ceil((Z1 - Z0) / CS);
  const cat = new Uint8Array(NX * NZ), wt = new Uint8Array(NX * NZ), zn = new Int8Array(NX * NZ).fill(-1), flg = new Uint8Array(NX * NZ);
  const idx = (x, z) => { const i = Math.floor((x - X0) / CS), j = Math.floor((z - Z0) / CS); return i < 0 || j < 0 || i >= NX || j >= NZ ? -1 : j * NX + i; };
  const cells = (x0, x1, z0, z1, fn) => { for (let j = Math.max(0, Math.floor((z0 - Z0) / CS)); j <= Math.min(NZ - 1, Math.floor((z1 - Z0) / CS)); j++) for (let i = Math.max(0, Math.floor((x0 - X0) / CS)); i <= Math.min(NX - 1, Math.floor((x1 - X0) / CS)); i++) fn(j * NX + i, X0 + (i + 0.5) * CS, Z0 + (j + 0.5) * CS); };
  const put = (k, c, w) => { if (c > cat[k]) cat[k] = c; const q = Math.min(255, Math.round(w * 50)); if (q > wt[k]) wt[k] = q; };
  const tube = (pts, hw, fn) => {
    for (let s = 0; s + 1 < pts.length; s++) {
      const ax = pts[s][0], az = pts[s][1], bx = pts[s + 1][0], bz = pts[s + 1][1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, R = hw + CS * 0.35;
      if (Math.max(ax, bx) + R < X0 || Math.min(ax, bx) - R > X1 || Math.max(az, bz) + R < Z0 || Math.min(az, bz) - R > Z1) continue;
      cells(Math.min(ax, bx) - R, Math.max(ax, bx) + R, Math.min(az, bz) - R, Math.max(az, bz) + R, (k, px, pz) => { const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)), ex = px - ax - dx * t, ez = pz - az - dz * t; if (ex * ex + ez * ez <= R * R) fn(k, px, pz); });
    }
  };
  const disc = (x, z, r, fn) => cells(x - r, x + r, z - r, z + r, (k, px, pz) => { if ((px - x) * (px - x) + (pz - z) * (pz - z) <= r * r) fn(k, px, pz); });
  /** every cell whose centre lies inside the flat polygon (x, z, x, z ...), row by row */
  const scan = (poly, fn) => {
    const n = poly.length >> 1; let zmin = 1e9, zmax = -1e9; for (let i = 1; i < poly.length; i += 2) { zmin = Math.min(zmin, poly[i]); zmax = Math.max(zmax, poly[i]); }
    for (let j = Math.max(0, Math.floor((zmin - Z0) / CS)); j <= Math.min(NZ - 1, Math.ceil((zmax - Z0) / CS)); j++) {
      const z = Z0 + (j + 0.5) * CS, xs = []; for (let i = 0, q = n - 1; i < n; q = i++) { const zi = poly[i * 2 + 1], zq = poly[q * 2 + 1]; if ((zi > z) !== (zq > z)) xs.push(poly[i * 2] + (z - zi) * (poly[q * 2] - poly[i * 2]) / (zq - zi)); }
      if (xs.length < 2) continue; xs.sort((a, b) => a - b);
      for (let s = 0; s + 1 < xs.length; s += 2) { const i0 = Math.max(0, Math.ceil((xs[s] - X0) / CS - 0.5)), i1 = Math.min(NX - 1, Math.floor((xs[s + 1] - X0) / CS - 0.5)); for (let i = i0; i <= i1; i++) fn(j * NX + i, X0 + (i + 0.5) * CS, z); }
    }
  };
  const _pt = (typeof performance !== 'undefined' ? performance : Date); let _tl = _pt.now(); const ms = {}, lap = (k) => { const n = _pt.now(); ms[k] = Math.round(n - _tl); _tl = n; };
  const info = { ms, zones: ISL_ZONES.length, corridors: 0, sidewalks: 0, footways: 0, crowd: 0, closed: 0 };
  const poly = (z) => (z.poly ? POLY[z.poly] : null);
  const inClip = (z, x, zz) => !z.clip || (x >= z.clip[0] && x <= z.clip[1] && zz >= z.clip[2] && zz <= z.clip[3]);

  // ---------------------------------------------------------------- zones (list order: later shapes win)
  const greenById = (id) => GREEN.find((g) => g.id === id) || LANDUSE.find((g) => g.id === id);
  ISL_ZONES.forEach((zd, zi) => {
    const paint = (k) => { zn[k] = zi; }, paintC = (k, x, z) => { if (inClip(zd, x, z)) zn[k] = zi; };
    for (const o of poly(zd) || []) scan(o, (k, x, z) => paintC(k, x, z));
    if (zd.road) for (const r of (st && st.roads) || []) { if (r.name !== zd.road[0] || !r.pts || r.pts.length < 2) continue; tube(r.pts, zd.road[1], (k, x, z) => { if (z >= zd.road[2] && z <= zd.road[3]) paint(k); }); }
    if (zd.ring) { const g = greenById(zd.ring); if (g) for (const q of g.polys) scan(q.o, paint); }
    for (const [x, z, r] of zd.discs || []) disc(x, z, r, paint);
    for (const [pts, hw] of zd.tubes || []) tube(pts, hw, paint);
    for (const sk of zd.svc || []) for (const c of (sv[sk] && sv[sk].crowd) || []) if (Number.isFinite(c.x) && !(c.y !== undefined && Math.abs(c.y) > 0.5)) disc(c.x, c.z, (c.r || 5) + 6, paint);
  });
  lap('zones');
  // ---------------------------------------------------------------- 1. pavements: the named streets of the islands, and every pavement strip inside a stay zone of a sight
  const wz = (q) => { const z = ISL_ZONES[q]; return z.quiet ? 0.12 : (z.w ?? 0.24); };
  const SIGHT0 = ISL_ZONES.findIndex((z) => !z.poly);                      // the first sight zone (the generic island zones come before)
  for (const r of (st && st.roads) || []) {
    const rows = ISL_CORRIDOR[r.name]; if (!rows || !r.pts || r.pts.length < 2) continue;
    info.corridors++; tube(r.pts, (r.w || 7) / 2 + 8, (k, x, z) => { if (zn[k] < 0) return; for (const [w, z0, z1] of rows) if (z >= z0 && z <= z1) { put(k, 1, w); return; } });
  }
  for (const s of (st && st.sidewalks) || []) {
    if (!s.pts || s.pts.length < 2) continue; let hit = false;
    for (const p of s.pts) { const k0 = idx(p[0], p[1]); if (k0 >= 0 && zn[k0] >= SIGHT0) { hit = true; break; } }
    if (!hit) continue; info.sidewalks++;
    tube(s.pts, 5.5, (k) => { const q = zn[k]; if (q >= SIGHT0) put(k, 1, wz(q)); });
  }
  lap('corridors+sidewalks');
  // ---------------------------------------------------------------- 2. the footways of the park inside a stay zone (the paths nobody draws: they are the lattice of the zone)
  for (const p of (st && st.paths) || []) {
    if (!p.pts || p.pts.length < 2 || p.hw === 'steps') continue;
    const a = p.pts[0], k0 = idx(a[0], a[1]), q = k0 >= 0 ? zn[k0] : -1; if (q < SIGHT0 || ISL_ZONES[q].quiet) continue;
    tube(p.pts, Math.max(1.3, (p.w || 3) / 2) + 0.3, (k) => { if (zn[k] === q) put(k, 2, wz(q)); }); info.footways++;
  }
  // the paved areas of the sights (squares, pedestrian areas, the apron of the arena, Betancourt Plaza, the spit plaza): the whole polygon inside a stay zone carries the weight of the zone (the lattice runs over it through nav.inArea; no category: the
  // area itself is the walkable ground)
  for (const a of AREAS) {
    if (a.hw === 'steps') continue;
    for (const p of a.polys) { const o = p.o; if (!o || o.length < 6) continue; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } if (x1 < X0 || x0 > X1 || z1 < Z0 || z0 > Z1) continue; scan(o, (k) => { const q = zn[k]; if (q >= SIGHT0 && !ISL_ZONES[q].quiet) { put(k, 0, wz(q)); info.areas = (info.areas || 0) + 1; } }); }
  }
  for (const pl of ISL_PLAZAS) { const zi = ISL_ZONES.findIndex((z) => z.name === pl.zone); disc(pl.x, pl.z, Math.max(pl.rx, pl.rz) * pl.r1 + 3, (k, x, z) => { const dx = (x - pl.x) / pl.rx, dz = (z - pl.z) / pl.rz, e = Math.hypot(dx, dz); if (e < pl.r0 || e > pl.r1) return; const a = Math.atan2(z - pl.z, x - pl.x) * 180 / Math.PI; if (a < pl.a0 || a > pl.a1) return; put(k, 2, pl.w); if (zi >= 0 && zn[k] < 0) zn[k] = zi; info.plaza = (info.plaza || 0) + 1; }); }
  lap('footways');
  // ---------------------------------------------------------------- 3. the crowd discs the sight services publish (street level only)
  for (const sk of ISL_SIGHTS) for (const c of (sv[sk] && sv[sk].crowd) || []) { if (!Number.isFinite(c.x) || (c.y !== undefined && Math.abs(c.y) > 0.5)) continue; info.crowd++; disc(c.x, c.z, (c.r || 5) + 2, (k) => put(k, 3, 0.3)); }
  // ---------------------------------------------------------------- 4. closed territory
  const closeRing = (o) => scan(o, (k) => { flg[k] |= 2; info.closed++; });
  for (const id of ISL_CLOSED_IDS) { const g = greenById(id); if (g) for (const q of g.polys) closeRing(q.o); }
  for (const g of LANDUSE) { if (!ISL_CLOSED_KINDS.includes(g.kind) || !g.polys) continue; for (const q of g.polys) { const o = q.o; if (!o || o.length < 6) continue; if (islandAt(o[0], o[1]) && !(o[0] > -4000 && o[1] > -2800)) closeRing(o); } }          // (the stadium arm of the old reach keeps its rules)
  for (const o of ISL_CLOSED_POLYS) closeRing(o);
  for (const [x, z, r] of ISL_CLOSED_DISCS) disc(x, z, r, (k) => { flg[k] |= 2; info.closed++; });
  lap('closed');

  const catAt = (x, z) => { const k = idx(x, z); return k < 0 ? 0 : cat[k]; };
  return {
    info, catAt, inBox: (x, z) => x > X0 && x < X1 && z > Z0 && z < Z1,
    y: (x, z) => { const c = catAt(x, z); return c === 2 ? 0.04 : null; },
    walk: (x, z) => catAt(x, z) >= 2,
    veto: (x, z) => { const k = idx(x, z); return k >= 0 && (flg[k] & 3) !== 0 && cat[k] < 2; },
    /** closed territory (palace garden, yards, yacht clubs, nurseries, building sites): no lattice node, no footway node, no door goal */
    closed: (x, z) => { const k = idx(x, z); return k >= 0 && (flg[k] & 2) !== 0 && cat[k] < 2; },
    weight: (x, z) => { const k = idx(x, z); return k < 0 ? 0 : wt[k] / 50; },
    /** local zone index (ISL_ZONES) or -1 */
    zone: (x, z) => { const k = idx(x, z); return k < 0 ? -1 : zn[k]; },
  };
}
