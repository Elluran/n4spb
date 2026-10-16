// landmarksK/mats.js - the materials of the Church of the Saviour on Spilled Blood, the Winkler fence, the Mikhailovsky Palace group, the Rossi pavilion and the Arts Square monument.
// Colours: docs/research/saviour-mikhailovsky.md 3.8 (brick #a8603f, white marble #e8e4d8, gold #d8b030, rock-faced granite #8d8f92, red-pink granite #a87870, copper patina #5a9a80, bronze doors #2e2a26)
// and 9.2 (palace buttery yellow #f0cc70 / white trim / grey-green roof).  Textures are painted in art.js.
import { makeArt } from './art.js';

export const C = {
  white: '#e8e4d8', whiteShade: '#cdc6b4', ochre: '#d8b060', gold: '#e0b030', goldFlat: '#d8aa28', copper: '#5a9a80', copperDark: '#3f7a66', bronze: '#2e2a26', iron: '#1c1f22', gun: '#2a2e34',
  granite: '#b0aca4', graniteDark: '#4a4b50', glass: '#1f2e4a', glassBlue: '#2a4a82', booth: '#7a1e1e', lawn: '#78b040', gravel: '#c8a088', soil: '#3a2c26', black: '#14161a',
  yellowPalace: '#f0cc70', yellowShade: '#d8a850', roofPalace: '#7a8478', pavilionWall: '#f0e0a8', pavilionRoof: '#6aa088', pinkGranite: '#a87870', pinkDark: '#8f7270',
};

export function makeMats(ctx) {
  const T = ctx.mat.toon;
  const A = makeArt(ctx);
  const M = { A };
  const mos = (name, map) => T('#ffffff', { map, name: 'lmK-' + name, paint: 0.0, polygonOffset: -2 });
  Object.assign(M, {
    brick: T('#ffffff', { map: A.brick, name: 'lmK-brick', paint: 0.04 }),
    brickDark: T('#e6cabc', { map: A.brick, name: 'lmK-brickD', paint: 0.04 }),
    brickPlain: T('#a86a54', { name: 'lmK-brickP', paint: 0.05 }),
    rock: T('#ffffff', { map: A.rock, name: 'lmK-rock', paint: 0.03 }),
    slab: T('#ffffff', { map: A.slab, name: 'lmK-slab', paint: 0.03 }),
    pink: T('#ffffff', { map: A.pinkBlocks, name: 'lmK-pink', paint: 0.03 }),
    pinkPlain: T(C.pinkGranite, { name: 'lmK-pinkP', paint: 0.03 }),
    sett: T('#ffffff', { map: A.sett, name: 'lmK-sett', paint: 0.03 }),
    graniteDark: T(C.graniteDark, { name: 'lmK-granD', paint: 0.03 }),
    plaza: T('#aaa8a3', { map: A.slab, name: 'lmK-plaza', paint: 0.03, polygonOffset: -1 }),
    forecourt: T('#ffffff', { map: A.forecourt, name: 'lmK-forecourt', paint: 0.03, polygonOffset: -1 }), hedge: T('#2c5a32', { name: 'lmK-hedge', paint: 0.1 }),
    vase: T('#9a9a9c', { name: 'lmK-vase', paint: 0.03 }),
    white: T(C.white, { name: 'lmK-white', paint: 0.03 }), whiteShade: T(C.whiteShade, { name: 'lmK-whiteS', paint: 0.03 }),
    ochre: T(C.ochre, { name: 'lmK-ochre', paint: 0.03 }), ochreTan: T('#c89850', { name: 'lmK-ochreT', paint: 0.04 }),
    gold: T('#ffffff', { map: A.gold, emissive: '#6a4a08', emissiveIntensity: 0.4, name: 'lmK-gold' }),
    goldFlat: T(C.goldFlat, { emissive: '#6a4a08', emissiveIntensity: 0.4, name: 'lmK-goldF' }),
    fringe: T(C.goldFlat, { map: A.fringe, alphaTest: 0.5, side: 'double', emissive: '#6a4a08', emissiveIntensity: 0.4, name: 'lmK-fringe' }),
    copper: T(C.copper, { name: 'lmK-copper', paint: 0.04 }), copperDark: T(C.copperDark, { name: 'lmK-copperD', paint: 0.04 }),
    bronze: T(C.bronze, { name: 'lmK-bronze', paint: 0.02 }), iron: T(C.iron, { name: 'lmK-iron' }), gun: T(C.gun, { name: 'lmK-gun' }), black: T(C.black, { name: 'lmK-black' }),
    glass: T(C.glass, { name: 'lmK-glass', polygonOffset: -1 }), glassBlue: T(C.glassBlue, { name: 'lmK-glassB', emissive: '#10244a', emissiveIntensity: 0.25, polygonOffset: -1 }),
    booth: T(C.booth, { name: 'lmK-booth' }), granite: T(C.granite, { name: 'lmK-gran', paint: 0.03 }),
    lawn: T(C.lawn, { name: 'lmK-lawn', paint: 0.06 }), lawnTop: T(C.lawn, { name: 'lmK-lawnTop', paint: 0.06, polygonOffset: -4 }), pinkDark: T('#85605e', { name: 'lmK-pinkDark', paint: 0.03 }), gravel: T(C.gravel, { name: 'lmK-gravel', paint: 0.05 }), soil: T(C.soil, { name: 'lmK-soil' }),
    // belts, ornaments, arcades
    belt: T('#ffffff', { map: A.belt, name: 'lmK-belt', paint: 0.0, polygonOffset: -1 }), arcature: T('#ffffff', { map: A.arcature, name: 'lmK-arcature', paint: 0.0, polygonOffset: -1 }), balusters: T('#ffffff', { map: A.balusters, name: 'lmK-balusters', paint: 0.02 }),
    checker: T('#ffffff', { map: A.checker, name: 'lmK-checker', paint: 0.02 }), teeth: T('#ffffff', { map: A.teeth, name: 'lmK-teeth', paint: 0.02 }), meander: T('#ffffff', { map: A.meander, name: 'lmK-meander', paint: 0.02 }),
    arcade6: T('#ffffff', { map: A.arcade6, name: 'lmK-arc6', paint: 0.02 }), arcade8: T('#ffffff', { map: A.arcade8, name: 'lmK-arc8', paint: 0.02 }), arcade12: T('#ffffff', { map: A.arcade12, name: 'lmK-arc12', paint: 0.02 }),
    kokoshnik: T('#ffffff', { map: A.kokoshnik, name: 'lmK-kokosh', paint: 0.02 }), belfry: T('#ffffff', { map: A.belfry, name: 'lmK-belfry', paint: 0.02 }), archBelt: T('#ffffff', { map: A.archBelt, name: 'lmK-archBelt', paint: 0.02 }),
    pilTiles: T('#ffffff', { map: A.pilasterTiles, name: 'lmK-pilTiles', paint: 0.0, polygonOffset: -1 }),
    majolica: T('#ffffff', { map: A.majolica, name: 'lmK-majolica', paint: 0.0, polygonOffset: -2 }), roundels: T('#ffffff', { map: A.roundels, name: 'lmK-roundels', paint: 0.0, polygonOffset: -2 }),
    // roofs, onions, tent
    roofTiles: T('#ffffff', { map: A.roofTiles, name: 'lmK-roofTiles', paint: 0.02, side: 'double' }),
    tent: T('#ffffff', { map: A.tent, name: 'lmK-tent', paint: 0.02 }),
    scaleBlue: T('#6a7cc4', { map: A.scales, name: 'lmK-scBlue', paint: 0.02 }), scaleYellow: T('#e4b832', { map: A.scales, name: 'lmK-scYel', paint: 0.02 }), scaleWhite: T('#ece8dc', { map: A.scales, name: 'lmK-scWhite', paint: 0.02 }),
    scaleGrey: T('#7c8aa8', { map: A.scales, name: 'lmK-scGrey', paint: 0.02 }), scaleGreen: T('#4a7a62', { map: A.scales, name: 'lmK-scGreen', paint: 0.02 }), scaleDeep: T('#46608a', { map: A.scales, name: 'lmK-scDeep', paint: 0.02 }),
    enNW: T('#ffffff', { map: A.enamelNW, name: 'lmK-enNW', paint: 0.0 }), enNE: T('#ffffff', { map: A.enamelNE, name: 'lmK-enNE', paint: 0.0 }),
    enSW: T('#ffffff', { map: A.enamelSW, name: 'lmK-enSW', paint: 0.0 }), enSE: T('#ffffff', { map: A.enamelSE, name: 'lmK-enSE', paint: 0.0 }),
    twist: T('#ffffff', { map: A.twist, name: 'lmK-twist', paint: 0.0 }),
    // mosaics
    mosGlory: mos('mosGlory', A.mosChristGlory), mosRes: mos('mosRes', A.mosResurrection), mosCarry: mos('mosCarry', A.mosCarry), mosCruc: mos('mosCruc', A.mosCruc), mosHell: mos('mosHell', A.mosHell), mosDepos: mos('mosDepos', A.mosDepos),
    mosLunette: mos('mosLunette', A.mosLunette), mosCalvary: T('#ffffff', { map: A.mosCalvary, name: 'lmK-mosCal', polygonOffset: -2 }),
    iconMother: mos('iconMother', A.iconMother), iconJohn: mos('iconJohn', A.iconJohn), mosDeesis: mos('mosDeesis', A.mosDeesis), mosVirgin: mos('mosVirgin', A.mosVirgin), mosApse: mos('mosApse', A.mosApse),
    plaque: mos('plaque', A.plaque), plaques: A.plaques.map((t, i) => mos('plaque' + i, t)),
    armsW: T('#ffffff', { map: A.armsW, name: 'lmK-armsW', paint: 0.0, polygonOffset: -1 }), armsNS: T('#ffffff', { map: A.armsNS, name: 'lmK-armsNS', paint: 0.0, polygonOffset: -1 }), armsStrip: T('#ffffff', { map: A.armsStrip, name: 'lmK-armsStrip', paint: 0.0, polygonOffset: -1 }),
    // fences (alpha cut-outs: no outline pass)
    winkler: T('#2a2e34', { map: A.winkler, alphaTest: 0.5, side: 'double', name: 'lmK-winkler', paint: 0.0 }),
    winklerBronze: T('#6a4a3a', { map: A.winkler, alphaTest: 0.5, side: 'double', name: 'lmK-winklerB', paint: 0.0 }),
    lampGlobe: T('#f2efe4', { emissive: '#ffe9b0', emissiveIntensity: 0.3, name: 'lmK-lampGlobe' }),
    spears: T('#1e2226', { map: A.spears, alphaTest: 0.5, side: 'double', name: 'lmK-spears', paint: 0.0 }),
    rossiFence: T('#26282c', { map: A.rossiFence, alphaTest: 0.5, side: 'double', name: 'lmK-rossiFence', paint: 0.0 }),
  });
  M.cutouts = new Set([M.winkler, M.winklerBronze, M.spears, M.rossiFence, M.fringe]);
  M.decals = new Set([M.mosGlory, M.mosRes, M.mosCarry, M.mosCruc, M.mosHell, M.mosDepos, M.mosLunette, M.mosCalvary, M.iconMother, M.iconJohn, M.mosDeesis, M.mosVirgin, M.mosApse, M.plaque, ...M.plaques, M.armsW, M.armsNS, M.armsStrip, M.majolica, M.roundels, M.pilTiles]);
  return M;
}
