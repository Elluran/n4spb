// lib/figures.js - the shared FIGURE KIT of the Petersburg scene (see the header of each file in lib/figures/).  Public API:
//   geom.js       tube / blob / blobBetween / loopPts / ik2 / V (vector helpers) / Sculpt (collector, one merged BufferGeometry per material key) / Figure (place into a module's Parts kit) / extend / cached
//   horse.js      horse({ pose: 'stand' | 'walk' | 'trot' | 'prance' | 'rear' | 'rearHigh' | {...}, mane, tail, bridle, detail })
//   human.js      human({ pose, body, outfit, face, detail }) - man / woman, nude athlete, greatcoat + cape + epaulettes, uniform, tunic, dress, cuirass, hats
//   anatomy.js    headGeometry / face / hand / foot
//   creatures.js  lion, griffin, addWing, serpent
//   materials.js  figureMats(ctx): toon bronze with verdigris, copper, gold, marble, plaster, granite
export * from './figures/geom.js';
export { horse } from './figures/horse.js';
export { human, bust } from './figures/human.js';
export { headGeometry, face, hand, foot } from './figures/anatomy.js';
export { lion, griffin, addWing, serpent, camel } from './figures/creatures.js';
export { figureMats } from './figures/materials.js';
