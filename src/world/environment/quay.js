// environment/quay.js - the granite quays of EVERY waterway: Fontanka, Griboedov Canal, Moika, Winter Canal, Swan Canal and the Neva (south bank: Palace and Admiralty embankments).
// Swept along the real bank chains of waterways.js / river.js (mitre joints, 9 m pieces inside the data, 120 m pieces on the invented continuations), per waterway with its own
// cross-section (WATERWAYS: water level, wall texture, coping profile, parapet kind, post type, bay):
//   * wall: pink-grey granite ashlar in 0.55-0.7 m courses (the Fontanka: grey with pink veining), a dark water-line band + algae stain, rain streaks under the coping, a seam every
//     7.2 m; water line at the waterway's level (-2.9 ... -3.4), wall foot 0.55 m below it, coping top y = +0.17 (above the kerb 0.15 so the streets' kerbs / pavements never cover it)
//   * Fontanka: box coping 0.34 high, pale pink-grey posts 0.45 x 1.0 m every ~3.2 m, black lattice / clover / bar panels (as before)
//   * Griboedov Canal: rolled coping, pink posts 0.5 x 1.1 m (two-step cap) every 2.7 m, black bar panels with a loop band; the Kazan stretch of the west bank has stout granite posts
//     joined by ONE silver steel tube (docs/research/west-canals-bridges.md section 2.1); the east bank near Kazansky and the WSW stretch carry the tall stadium-loop railing
//   * Moika: the "ring / quatrefoil / vase" railing (top frieze of rings, pointed arcs with quatrefoils, turned balusters, a diagonal band), rose-red posts, bay 2.4 m
//   * Winter Canal: round granite pylons on bell corbels every 2.3 m with the black lancet-arch railing (Dunker's design, 1782-84)
//   * Neva (Dvortsovaya / Admiralteyskaya): batter 1:12 wall, a rolled string course and the monolithic rounded granite parapet roll (0.88 m wide, 1.0 m high, sections of 2.2 m with
//     joint lines and a recessed panel on the river face): no iron railing
//   * mooring rings and "anchor prohibited" plates on the wall, drain culverts at the bridges, stair flights (descents with a landing 0.22 m above the water) at the OSM steps / piers,
//     and the COLLIDER that keeps everybody out of the trench (boxes 1.6 m thick, y -6 ... +1.25) except in the GAPS of the bridge crossings (bridges/sites.js decks, BRIDGE_ZONES):
//     there the wall face is still drawn (pushed back by polygonOffset so the bridge's abutment faces always win) but coping, parapet and collider are left out for the bridge owner;
//     the crossings that no bridge module draws get an invisible fallback deck (walk box + parapet boxes) so nobody falls into the water
// DESCENTS (every waterway but the Fontanka): at each OSM steps way / landing stage near a bank the wall gets a walkable descent - a GATE in the parapet / railing line (a landing flush with
//   the pavement between cheek walls, 3.8 m), a FLIGHT of 15-20 granite steps (0.34 run, <= 0.19 rise) hugging the wall face with a stepped cheek wall on the water side, and a LOWER LANDING
//   0.22 m above the water; planned on a first frames pass (straight stretch, no bridge zone within 9 m, 24 m apart), then the wall pieces are split at the gate / flight / landing ends
//   (segKind). Inside PLAY they are physical: walk boxes + sticky stairs, solid barriers on the water side / back / end (nobody can step off into the trench; tools/environment-walk.mjs
//   walks a simulated player down every one and pushes at every edge). The quay collider is a thin wall box now (0.4 m landward of the wall line .. 0.05 m beyond, y -8 .. 1.25).
//   A pier (OSM landing stage) near the lower landing is moved beside it (a 0.4 m gap to the wall, quay.pierOverride -> boats.js draws it; deck walk box + railing barriers, an opening toward
//   the landing). The widest descent (nearest to the Palace Pier of the OSM data) is the LIONS DESCENT: two red-granite pedestals flank its gate with a copper lion each (lions.js).
// Anichkov Bridge: the deck polygon r5537267 (landmarksC) is the gap of the Fontanka there, exactly as before (landmarksC/closure.js re-derives the bank pieces: frames() below keeps the
// densification of the old code for the Fontanka).
// GRASS-SLOPE BANKS (Mars Field extension, docs/research/mars-bridges-canals.md 2.1 / 2.2; waterways.js SLOPE_REACHES / slopeRuns): the Swan Canal (everywhere) and the Moika along the Mikhailovsky Garden are NOT granite walls: a low
//   granite banquette 0.45 m above the water, a lip, a grass slope (4.2-4.7 m run) up to street level (the ground plane is cut away over it: river.js waterCuts kind 'slope'), granite end caps at the bridge zones, a collider on the
//   slope top, ball-post rail + two tubes (Mars Field side) / green trellis (garden side) on the Swan Canal; the Fontanka north of the Moika source has the stadium-loop rail (east) / pointed-arch band rail with big pink posts (garden bank);
//   the Moika bank at the Summer Garden keeps wall + collider but no railing (the garden fence stands there). Service: quay.slopes.
// ISLANDS ROUND 2 (2026-10-14, owner water-banks; notes docs/research/islands2-integration-requests.md section B): the rules below read islands.js inIslands (K1..K4, YE1, KA1..KA5, AP1..AP7, PE1..PE6 outside every older play rectangle) or an
//   island polygon and never change an older district (tools/environment-regress.mjs --extra --extra2): the island zone rules of Vasilievsky Island (inVOI: side boxes of a natural slope, corner squares, a road that ends on the water edge) hold on the
//   islands too; the slope-top barrier stands on the asphalt edge where a road runs over the slope top; fallback decks: dry decks need none, a deck polygon far from its rectangle gets floor + parapets along the polygon (polygonDeck);
//   a ring edge of a sight's water pit is exact (no 6 cm slit, the wall batter is 0 on the ring, the parapet roll ends are capped, a slope that ends at a pit is closed down to the bed); the cobble wings of the Yelagin spit (spit-wings reach),
//   the yacht club slab / breakwater and the stadium boiler-house slab (waterways.js petroNatural classes 2 - 4, granite edge + a flight every 60 m), the light grey ring railing of the stadium promontory (lightring / lightpost), the gangway of
//   the Yelagin water-bus dock (island-banks.js: a gate in the slope-top barrier, a terrain hole, a sticky ramp, rail colliders).
// SERVICE (ctx.services.environment.quay): { pierOverride: { pierId: { cx, cz, ax, az, len, wid } }, water (Fontanka), top, segments: [{ax,az,bx,bz,nx,nz,bank,key}], gaps, bridges: [zones], stairs: [Fontanka flights (landmarksC pontoons)], allStairs: [every flight (descents: walk, endX/endZ, topY, pier)
//   { x,z,tx,tz,nx,nz,bank,key,length,landingY,w }], rings, signs, posts, panels, colliders, banks: [{name,key,len}] }
import * as THREE from 'three';
import { mergedMedianAt } from '../lib/road-plan.js';
import * as L from '../layout.js';
import { MeshBuilder } from '../lib/massing.js';
import { PIERS, STEPS } from '../data/city.js';
import { deckPoly, bridgeZones, waterBanks } from './river.js';
import { WATERWAYS, waterGeo, farBanks, slopeRuns, slopeAt, islandAt, petroAt, zayachyAt, keepOut, ghostBridge, ownerWaterAt, ownerWaterBoxes, buyanRail, meanderRail, stadiumRailAt, QUAY_CLEAR } from './waterways.js';
import { pointInRing, distToRing, hash2 } from './util.js';
import { pierRects } from './boats.js';
import { isOwned } from '../lib/claims.js';
import { BANK_INDEX } from './bank-index.js';
import { lionGeometry } from './lions.js';
import { steelFlight, concreteTexture, chainPostGeometry, mushroomGeometry, prism } from './revet.js';      // (water-3 2026-10-09) the D-2 revetment (concrete slab slope, blue stair flights, chain posts) and the yellow mushroom bollards of the passenger port
import { VO_DESCENTS, voWallStyle, STYLE, inVO, releaseVoIndex } from './vo-banks.js';
import { inIsland } from '../lib/vo-island.js';
import { inIslands } from './islands.js';
import { GANGWAYS, gangwayGates, gangwayGeometry, gangwayColliders } from './island-banks.js';      // (islands 2026-10-14) the gangway of the Yelagin water-bus dock      // 2026-10-14 (owner A): the ground of the round-2 islands (K1..K4, YE1, KA1..KA5, AP1..AP7, PE1..PE6) outside every older play rectangle: every island-only rule of this file reads it
const L2 = L;
/** Vasilievsky Island rule OR round-2 island ground: the rules that the island review of 2026-10-07 added for the open edges of a natural slope / a wall corner / a bridge-zone border (never the older districts) */
const inVOI = (x, z) => inVO(x, z) || inIslands(x, z);
const DESC_DBG = typeof process !== 'undefined' && !!(process.env && process.env.ENV_DEBUG_DESC);      // ENV_DEBUG_DESC=1: say why a roster descent site (vo-banks.js VO_DESCENTS) was not built

export const WATER_Y = L.RIVER_Y.water;
const Y_TOP = 0.17, COP_BOT = -0.34, COP_OUT = 0.10, COP_IN = 0.62;
const TILE_U = 7.2;
const lvl = (key) => WATERWAYS[key].water;
const FOOT = 0.12;                                           // the wall foot lies this far below the water line (the outline pass sees the foot through the water: keep it at the shore line)
const yBot = (key) => lvl(key) - FOOT;
const tileH = (key) => Y_TOP - yBot(key);
/** descents (stair flights down to the water) of the canals and the Neva: dimensions in metres along the wall (u) and out from the wall face (v) */
const DS = { gateA: 2.0, gateB: 1.8, run: 0.34, rise: 0.19, low: 3.0, topY: 0.10 };
const descentWidth = (key, site) => (key === 'neva' ? (site.big ? 4.6 : 2.8) : key === 'winter-canal' ? 1.6 : 1.9);
const nearMargin = 25;                                       // detail (posts, rings, 9 m pieces) inside the data extent + this margin
const isNear = (x, z) => L.inExtent(x, z, -nearMargin);

// ---------------------------------------------------------------- textures
const WALLS = {
  fontanka: { tones: ['#8b8783', '#928a85', '#7d7a77', '#948f8a', '#86807a', '#8e8985', '#9a8077'], rows: 7, vein: 1 },
  griboedov: { tones: ['#a99b8f', '#9e9086', '#b3a498', '#968880', '#a8978c', '#9c8d84', '#b19c8e'], rows: 6, vein: 0.6 },
  moika: { tones: ['#a39088', '#98867e', '#ad9a90', '#907f78', '#a68e84', '#9a8880', '#b09890'], rows: 6, vein: 0.6, rust: 1 },
  'winter-canal': { tones: ['#a8968c', '#9c8a82', '#b2a096', '#94847c', '#a8928a', '#9e8c84', '#b09c90'], rows: 6, vein: 0.6 },
  kryukov: { tones: ['#a99b8f', '#9e9086', '#b3a498', '#968880', '#a8978c', '#9c8d84', '#b19c8e'], rows: 6, vein: 0.6 },
  'nh-inner': { tones: ['#a8968c', '#9c8a82', '#b2a096', '#94847c', '#a8928a', '#9e8c84'], rows: 6, vein: 0.5 },
  admiralty: { tones: ['#a39088', '#98867e', '#ad9a90', '#907f78', '#a68e84', '#9a8880'], rows: 6, vein: 0.5 },
  moat: { tones: ['#a8968c', '#9c8a82', '#b2a096', '#94847c', '#a8928a'], rows: 4, vein: 0.5 },
  'swan-canal': { tones: ['#a39088', '#98867e', '#ad9a90', '#907f78', '#a68e84', '#9a8880'], rows: 6, vein: 0.5 },
  neva: { tones: ['#ab9487', '#b49d90', '#9d8a7e', '#a68f84', '#b8a094', '#a08c80', '#b09584'], rows: 7, vein: 0.8, big: 1 },
  zhdanovka: { tones: ['#a39a92', '#9a918a', '#aca39a', '#928a84', '#a69c93', '#9c938c'], rows: 7, vein: 0.5 },      // grey granite facing (photos refs/petro-water 23, 24)
  'kronverk-moat': { tones: ['#a39a92', '#9a918a', '#aca39a', '#928a84', '#a69c93'], rows: 7, vein: 0.4 },
  karpovka: { tones: ['#a8958a', '#9d8b81', '#b29f93', '#94837a', '#a79186', '#9b8a80', '#b09a8d'], rows: 8, vein: 0.6 },      // pink-grey granite, 8-9 courses (photos K07, K12, K19)
  // Vasilievsky Island (docs/research/vo-water.md section 3)
  smolenka: { tones: ['#a29a92', '#98908a', '#aaa198', '#908880', '#a49a90', '#9a928a'], rows: 6, vein: 0.4 },      // the Smolenka: grey-pink granite facing (photos V09, V10, V17 of docs/research/vo-roster-bridges.md)
  // (water-3 2026-10-09, review remark of landmarksGavan) the upper canal wall in the photos is paler and more cream (#d4cab4) in courses of 0.45 m (3.7 m tile height: 8 rows), not grey-brown
  gavan: { tones: ['#d4cab4', '#cbc1ab', '#dcd2bc', '#c4baa5', '#d0c6b0', '#c9bfa9'], rows: 8, vein: 0.2, big: 1 },   // the Shkipersky canal: big blocks of the 1808-12 granite facing with limestone patches (photo V13)
  port: { tones: ['#8d8e8b', '#858683', '#979894', '#7f807d', '#91928e'], rows: 4, vein: 0, big: 1 },                // a concrete quay wall (the port, the shipyard, the Gulf shore): large grey panels
  kovsh: { tones: ['#8f8c86', '#85827c', '#999690', '#7f7c77', '#928e87'], rows: 4, vein: 0.1, big: 1 },            // the Kovsh: stone-faced where a wall is needed at all
  mouth: { tones: ['#bdbab4', '#b3b0aa', '#c4c0b8', '#aaa7a1', '#b8b4ac', '#c0bdb6'], rows: 5, vein: 0.1, big: 1 },      // the mouth arms of the Smolenka: a PALE GREY granite wall (photo V17 / w08 of docs/research/review-water refs), not the warm grey-pink of the Neva
};
function wallTexture(ctx, key, base = key) {
  const W = WALLS[key], H = tileH(base), wlFrac = 1 - FOOT / H;
  return ctx.tex.draw(1024, 512, (g, w, h) => {
    const r = ctx.rng('quay-wall-tex-' + key);
    g.fillStyle = W.tones[0]; g.fillRect(0, 0, w, h);
    const rows = W.rows, rh = h / rows, tones = W.tones;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 120;
      while (x < w) {
        const bw = (W.big ? 150 : 115) + r() * (W.big ? 190 : 150), c = tones[Math.floor(r() * tones.length)], v = 0.92 + r() * 0.14;
        g.fillStyle = c; g.fillRect(x + 1.5, j * rh + 1.5, bw - 3, rh - 3);
        g.fillStyle = `rgba(${v > 1 ? 255 : 0},${v > 1 ? 255 : 0},${v > 1 ? 255 : 0},${Math.abs(v - 1) * 0.5})`; g.fillRect(x + 1.5, j * rh + 1.5, bw - 3, rh - 3);
        if (r() < 0.5 * W.vein) { g.strokeStyle = `rgba(190,150,140,${0.12 + r() * 0.15})`; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(x + r() * bw, j * rh + 3); g.lineTo(x + r() * bw, (j + 1) * rh - 3); g.stroke(); }
        if (W.rust && r() < 0.3) { g.fillStyle = 'rgba(150,100,70,0.16)'; g.fillRect(x + 4 + r() * bw * 0.5, j * rh + 3, 4 + r() * 10, rh * (0.5 + r() * 1.5)); }
        x += bw;
      }
    }
    g.strokeStyle = 'rgba(38,36,36,0.5)'; g.lineWidth = 2.5;
    for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * rh); g.lineTo(w, j * rh); g.stroke(); }
    // rain streaks running down from the coping (top = canvas y 0)
    for (let i = 0; i < 40; i++) {
      const x = r() * w, len = 60 + r() * 220, wd = 2 + r() * 7, gr = g.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, `rgba(54,52,50,${0.18 + r() * 0.18})`); gr.addColorStop(1, 'rgba(54,52,50,0)'); g.fillStyle = gr; g.fillRect(x, 0, wd, len);
    }
    // the dark water-line band and the algae stain
    const wl = h * wlFrac;
    const damp = g.createLinearGradient(0, wl - 60, 0, h);
    damp.addColorStop(0, 'rgba(40,52,42,0)'); damp.addColorStop(0.4, 'rgba(36,50,40,0.55)'); damp.addColorStop(1, 'rgba(22,34,30,0.85)');
    g.fillStyle = damp; g.fillRect(0, wl - 60, w, h - wl + 60);
    for (let i = 0; i < 70; i++) { const x = r() * w, hh = 5 + r() * 18; g.strokeStyle = `rgba(${70 + Math.round(r() * 40)},${100 + Math.round(r() * 40)},${50 + Math.round(r() * 20)},${0.35 + r() * 0.4})`; g.lineWidth = 1.2 + r() * 1.6; g.beginPath(); g.moveTo(x, wl + 6); g.quadraticCurveTo(x + (r() - 0.5) * 6, wl - hh * 0.5, x + (r() - 0.5) * 9, wl - hh); g.stroke(); }
    // expansion seam on the tile edge
    g.fillStyle = 'rgba(30,28,28,0.38)'; g.fillRect(0, 0, 3, h); g.fillRect(w - 2, 0, 2, h);
  }, { key: 'env-quay-wall-pb2-' + key, repeat: [1, 1], anisotropy: 8 });
}
/** the monolithic Neva parapet: pink-red granite roll, rust-red lead joints at the section edges, a recessed panel with chamfered corners on the river face (v 0.18 .. 0.62 of the face) */
function parapetTexture(ctx) {
  return ctx.tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng('quay-parapet');
    g.fillStyle = '#b08c7f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,70,62' : '214,164,150'},${0.06 + r() * 0.1})`; g.fillRect(r() * w, r() * h, 2 + r() * 8, 2 + r() * 8); }
    g.fillStyle = 'rgba(70,40,36,0.55)'; g.fillRect(0, 0, 5, h); g.fillRect(w - 4, 0, 4, h);
    g.fillStyle = 'rgba(140,60,40,0.7)'; g.fillRect(2, 0, 2, h);
    // the recessed panel (face of the parapet = the lower 60 % of the tile height, drawn from the bottom)
    g.strokeStyle = 'rgba(70,44,40,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(34, h * 0.78); g.lineTo(46, h * 0.64); g.lineTo(w - 46, h * 0.64); g.lineTo(w - 34, h * 0.78); g.lineTo(w - 46, h * 0.92); g.lineTo(46, h * 0.92); g.closePath(); g.stroke();
    g.fillStyle = 'rgba(70,44,40,0.12)'; g.fill();
  }, { key: 'env-quay-parapet2', repeat: [1, 1], anisotropy: 8 });
}
/** railing panel textures (alpha cut-out; black iron on transparent) */
function railTexture(ctx, kind) {
  return ctx.tex.draw(512, kind === 'trellis' ? 404 : 168, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#202428'; g.strokeStyle = '#202428';
    const rail = (y, t) => g.fillRect(0, y, w, t);
    g.lineCap = 'round';
    const ring = (x, y, r0) => { g.lineWidth = 3; g.beginPath(); g.arc(x, y, r0, 0, 6.3); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(x, y, r0 * 0.5, 0, 6.3); g.stroke(); };
    const quatrefoil = (cx, cy, rr) => { g.lineWidth = 3; for (const [ox, oy] of [[-rr, 0], [rr, 0], [0, -rr], [0, rr]]) { g.beginPath(); g.arc(cx + ox, cy + oy, rr, 0, 6.3); g.stroke(); } };
    if (kind === 'lattice') {
      rail(6, 10); rail(h - 22, 12); rail(30, 4); rail(h - 40, 4);
      g.lineWidth = 4;
      const step = 30;
      for (let x = -h; x < w + h; x += step) { g.beginPath(); g.moveTo(x, 36); g.lineTo(x + (h - 78), h - 42); g.stroke(); g.beginPath(); g.moveTo(x + (h - 78), 36); g.lineTo(x, h - 42); g.stroke(); }
      for (let x = 10; x < w; x += 98) g.fillRect(x, 6, 6, h - 12);
    } else if (kind === 'clover') {
      rail(6, 8); rail(h - 20, 12); g.lineWidth = 5;
      for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(32 + k * 64, 30, 22, 0, 6.3); g.stroke(); }
      for (let k = 0; k < 3; k++) {
        const cx = 85 + k * 171; g.beginPath(); g.arc(cx, h - 20, 80, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
        for (const [ox, oy] of [[-9, 0], [9, 0], [0, -9], [0, 9]]) { g.beginPath(); g.arc(cx + ox, 98 + oy, 8, 0, 6.3); g.stroke(); }
      }
      for (let x = 12; x < w; x += 171) g.fillRect(x, 6, 6, h - 12);
    } else if (kind === 'moika') {
      // top rail, a frieze of 16 double rings, three pointed arcs each holding a quatrefoil, three turned vase balusters, a band of crossing diagonals with rosettes, bottom rail
      rail(4, 9); rail(h - 12, 10);
      for (let k = 0; k < 16; k++) ring(16 + k * 32, 30, 11);
      g.lineWidth = 5;
      for (let k = 0; k < 3; k++) {
        const x0 = 4 + k * 168, x1 = x0 + 164, xm = (x0 + x1) / 2;
        g.beginPath(); g.moveTo(x0 + 6, h - 36); g.quadraticCurveTo(x0 + 8, 76, xm, 48); g.quadraticCurveTo(x1 - 8, 76, x1 - 6, h - 36); g.stroke();
        quatrefoil(xm, 98, 9);
      }
      for (let k = 0; k < 3; k++) {                              // vase balusters (spool: two bulges on a stem) between the arcs
        const x = 4 + k * 168 + 84 + 0; void x;
      }
      for (let k = 0; k <= 3; k++) {
        const x = 4 + k * 168; g.fillRect(x - 3, 44, 6, h - 80);
        g.beginPath(); g.ellipse(x, 70, 8, 11, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(x, 112, 8, 11, 0, 0, 6.3); g.fill();
      }
      g.lineWidth = 3;
      for (let x = -20; x < w + 20; x += 24) { g.beginPath(); g.moveTo(x, h - 36); g.lineTo(x + 24, h - 14); g.stroke(); g.beginPath(); g.moveTo(x + 24, h - 36); g.lineTo(x, h - 14); g.stroke(); }
      for (let x = 12; x < w; x += 48) { g.beginPath(); g.arc(x, h - 25, 4, 0, 6.3); g.fill(); }
    } else if (kind === 'loops') {
      // tall stadium loops (double wall), small turned balusters between them, bulbous foot collars, flat top rail
      rail(4, 12); rail(h - 22, 12);
      for (let k = 0; k < 14; k++) {
        const x = 8 + k * 36.5;
        g.lineWidth = 3.5; g.beginPath(); g.moveTo(x, 44); g.lineTo(x, h - 44); g.arc(x + 12, h - 44, 12, Math.PI, 0, true); g.lineTo(x + 24, 44); g.arc(x + 12, 44, 12, 0, Math.PI, true); g.closePath(); g.stroke();
        g.lineWidth = 2; g.beginPath(); g.moveTo(x + 5, 46); g.lineTo(x + 5, h - 46); g.moveTo(x + 19, 46); g.lineTo(x + 19, h - 46); g.stroke();
        g.fillRect(x + 28, 20, 3, h - 42); g.beginPath(); g.ellipse(x + 29.5, 96, 5, 7, 0, 0, 6.3); g.fill();
        g.beginPath(); g.ellipse(x + 12, h - 30, 11, 5, 0, 0, 6.3); g.fill();
      }
    } else if (kind === 'meander') {
      // the railing of the Lieutenant Schmidt embankment at the Dormition church / S-189 reach (photos d08, c09 of docs/research/navalcorps.md): a flat top rail over a band of Greek-key meander, a second rail, and
      // tall overlapping ovals (a chain of rings) down to a heavy bottom rail
      rail(3, 12); rail(48, 6); rail(h - 20, 14);
      g.lineWidth = 3.2;
      for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x + 2, 44); g.lineTo(x + 2, 21); g.lineTo(x + 22, 21); g.lineTo(x + 22, 37); g.lineTo(x + 9, 37); g.lineTo(x + 9, 29); g.lineTo(x + 15, 29); g.stroke(); }
      g.lineWidth = 3.4;
      for (let x = 0; x < w + 30; x += 31) { g.beginPath(); g.ellipse(x, 98, 24, 46, 0, 0, 6.3); g.stroke(); }
      g.lineWidth = 2; for (let x = 15; x < w + 30; x += 31) { g.beginPath(); g.arc(x, 98, 5, 0, 6.3); g.stroke(); }
    } else if (kind === 'lightring') {
      // the LIGHT GREY cast railing of the Petrovsky stadium island (photos s05 s12 s16 of landmarksPetrovskyStadium): a flat top rail, a heavy bottom rail and a chain of plain rings between them, ~1 m high
      g.fillStyle = g.strokeStyle = '#c6c9cb';
      rail(4, 13); rail(h - 22, 16); g.lineWidth = 6;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(43 + k * 85, 88, 31, 0, 6.3); g.stroke(); }
      for (let k = 0; k <= 6; k++) g.fillRect(Math.min(w - 5, Math.max(0, k * 85 - 2.5)), 4, 5, h - 8);
    } else if (kind === 'trellis') {
      // the green garden trellis of the Swan Canal (photos refs/mars-bridges 23, 26): a square diamond lattice (diamond ~0.25 m) in a thin frame, 2.4 x 1.9 m per panel
      g.fillStyle = g.strokeStyle = '#4f9a48'; g.lineWidth = 4.5;
      const st = 52;
      for (let x = -h; x < w + h; x += st) { g.beginPath(); g.moveTo(x, 10); g.lineTo(x + (h - 20), h - 10); g.stroke(); g.beginPath(); g.moveTo(x + (h - 20), 10); g.lineTo(x, h - 10); g.stroke(); }
      g.fillRect(0, 0, w, 12); g.fillRect(0, h - 16, w, 16); g.fillRect(0, 0, 9, h); g.fillRect(w - 9, 0, 9, h); g.fillRect(w / 2 - 3, 0, 6, h);
    } else if (kind === 'arcade') {
      // Fontanka garden bank (photo 150): round top rail, a band of pointed arches (8 per bay) on thin bars, vertical round bars with collar rings, a heavy bottom rail
      rail(4, 10); rail(h - 20, 14);
      g.lineWidth = 3.4;
      for (let k = 0; k < 8; k++) { const x0 = 3 + k * 63.5, x1 = x0 + 63.5, xm = (x0 + x1) / 2; g.beginPath(); g.moveTo(x0 + 2, 58); g.quadraticCurveTo(x0 + 3, 30, xm, 16); g.quadraticCurveTo(x1 - 3, 30, x1 - 2, 58); g.stroke(); }
      for (let x = 6; x < w; x += 15.8) { g.fillRect(x - 2.2, 14, 4.4, h - 30); }
      for (let x = 6; x < w; x += 15.8) { g.beginPath(); g.ellipse(x, 74, 4.2, 4, 0, 0, 6.3); g.fill(); g.beginPath(); g.ellipse(x, h - 34, 4, 3, 0, 0, 6.3); g.fill(); }
      rail(62, 5); g.fillRect(0, 0, 7, h); g.fillRect(w - 7, 0, 7, h);
    } else if (kind === 'vase') {
      // the standard canal balustrade (photos refs/canals 76, 84): a heavy flat top rail, a thin second rail, a dense row of turned vase balusters on a bottom rail
      rail(3, 15); rail(21, 5); rail(h - 22, 14);
      for (let x = 6; x < w; x += 21.3) {
        g.fillRect(x - 2.5, 26, 5, h - 50);
        g.beginPath(); g.ellipse(x, h * 0.40, 6.5, 15, 0, 0, 6.3); g.fill();
        g.beginPath(); g.ellipse(x, h * 0.72, 5.5, 9, 0, 0, 6.3); g.fill();
        g.fillRect(x - 5, 29, 10, 4);
      }
      g.fillRect(0, 1, 6, h - 10); g.fillRect(w - 6, 1, 6, h - 10);
    } else if (kind === 'lancet') {
      // Winter Canal: round top rail, 8 paired pointed arches per bay, vertical bars with a collar ring, triangular feet
      rail(5, 9);
      for (let k = 0; k <= 8; k++) {
        const x = 3 + k * 63.5; g.fillRect(x - 2.5, 12, 5, h - 28);
        g.beginPath(); g.moveTo(x - 7, h - 8); g.lineTo(x, h - 28); g.lineTo(x + 7, h - 8); g.closePath(); g.fill();
        g.lineWidth = 3; g.beginPath(); g.arc(x, 90, 6, 0, 6.3); g.stroke();
      }
      g.lineWidth = 3.5;
      for (let k = 0; k < 8; k++) {
        const x0 = 3 + k * 63.5, x1 = x0 + 63.5, xm = (x0 + x1) / 2;
        for (const [a, b] of [[x0, xm], [xm, x1]]) { const c = (a + b) / 2; g.beginPath(); g.moveTo(a + 2, h - 34); g.quadraticCurveTo(a + 4, 56, c, 36); g.quadraticCurveTo(b - 4, 56, b - 2, h - 34); g.stroke(); }
      }
    } else {
      rail(6, 9); rail(h - 18, 12); rail(52, 5);
      for (let x = 8; x < w; x += 20) { g.fillRect(x, 6, 5, h - 12); g.beginPath(); g.moveTo(x - 3, 6); g.lineTo(x + 2.5, -2); g.lineTo(x + 8, 6); g.fill(); }
    }
  }, { key: 'env-quay-rail-' + kind + '-3', repeat: [1, 1], anisotropy: 4 });
}
/** the mown grass of the slope banks (photos refs/mars-bridges 13, 23): sunlit green with soft light / dark patches, short blade strokes and the odd dandelion */
function grassTexture(ctx) {
  return ctx.tex.draw(512, 512, (g, w, h) => {
    const r = ctx.rng('quay-grass-tex');
    g.fillStyle = '#5f9238'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? 'rgba(122,170,64,0.18)' : 'rgba(54,98,36,0.16)'; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 50, 12 + r() * 30, r() * 3, 0, 6.3); g.fill(); }
    for (let i = 0; i < 1500; i++) { const x = r() * w, y = r() * h, l = 4 + r() * 8; g.strokeStyle = r() < 0.5 ? 'rgba(150,196,84,0.55)' : 'rgba(40,84,30,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - l); g.stroke(); }
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(236,214,70,0.8)'; g.fillRect(r() * w, r() * h, 3, 3); }
  }, { key: 'env-quay-grass-1', repeat: [1, 1], anisotropy: 4 });
}
/** the sand of the fortress beach (photo refs/petro-water 26): pale warm sand with soft darker damp patches, fine speckle, a few pebbles and footprints */
function sandTexture(ctx) {
  return ctx.tex.draw(512, 512, (g, w, h) => {
    const r = ctx.rng('quay-sand-tex');
    g.fillStyle = '#d6c49a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? 'rgba(232,218,178,0.22)' : 'rgba(176,154,112,0.18)'; g.beginPath(); g.ellipse(r() * w, r() * h, 24 + r() * 60, 10 + r() * 26, r() * 3, 0, 6.3); g.fill(); }
    for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(150,128,92,0.35)' : 'rgba(244,234,204,0.4)'; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(' + (120 + Math.round(r() * 40)) + ',' + (112 + Math.round(r() * 30)) + ',' + (100 + Math.round(r() * 30)) + ',0.7)'; g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 3, 1.5 + r() * 2, r() * 3, 0, 6.3); g.fill(); }
    for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(150,128,92,0.22)'; g.beginPath(); g.ellipse(r() * w, r() * h, 6, 3, r() * 3, 0, 6.3); g.fill(); }
  }, { key: 'env-quay-sand-1', repeat: [1, 1], anisotropy: 4 });
}
/** stone pitching of the island slopes (photo refs/petro-water 05): grey rounded cobbles laid tight, darker joints, moss in some joints */
function cobbleTexture(ctx) {
  return ctx.tex.draw(512, 512, (g, w, h) => {
    const r = ctx.rng('quay-cobble-tex');
    g.fillStyle = '#5c5a56'; g.fillRect(0, 0, w, h);
    const tones = ['#8f8c86', '#9a968f', '#84817b', '#a29d94', '#7c7a75', '#96908a', '#8a8378'];
    for (let j = 0; j < 16; j++) for (let i = 0; i < 17; i++) {
      const cx = (i + (j % 2 ? 0.5 : 0)) * 32 + (r() - 0.5) * 6, cy = j * 32 + 16 + (r() - 0.5) * 6;
      g.fillStyle = tones[Math.floor(r() * tones.length)]; g.beginPath(); g.ellipse(cx, cy, 13 + r() * 2.5, 12 + r() * 2.5, r() * 3, 0, 6.3); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.ellipse(cx - 3, cy - 4, 6, 4, 0, 0, 6.3); g.fill();
      if (cx < 16) { g.fillStyle = tones[Math.floor(r() * tones.length)]; g.beginPath(); g.ellipse(cx + w, cy, 14, 13, 0, 0, 6.3); g.fill(); }
    }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(86,112,60,0.35)'; g.fillRect(r() * w, r() * h, 3 + r() * 5, 2 + r() * 3); }
  }, { key: 'env-quay-cobble-1', repeat: [1, 1], anisotropy: 4 });
}
/** the plain solid parapet of Makarova embankment (photo V06 of docs/research/vo-roster-bridges.md): pink-grey granite slabs, a hair-line joint every 2.2 m, no recessed panel, a little weathering */
function parapetSlabTexture(ctx) {
  return ctx.tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng('quay-parapet-slab');
    g.fillStyle = '#ab9a92'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '128,100,92' : '212,186,176'},${0.06 + r() * 0.1})`; g.fillRect(r() * w, r() * h, 2 + r() * 9, 2 + r() * 7); }
    g.fillStyle = 'rgba(64,50,48,0.5)'; g.fillRect(0, 0, 3, h); g.fillRect(w - 2, 0, 2, h);
    g.fillStyle = 'rgba(54,52,50,0.07)'; for (let i = 0; i < 5; i++) g.fillRect(r() * w, 0, 2 + r() * 5, h * (0.2 + r() * 0.3));
  }, { key: 'env-quay-parapet-slab', repeat: [1, 1], anisotropy: 8 });
}
/** the paved lower berm at the foot of the wall of the Smolenka mouth arms (photo w08 = V17: pale grey granite slabs ~0.9 x 0.6 m, tight joints, grass in some of them) */
function bermTexture(ctx) {
  return ctx.tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng('quay-berm-tex');
    g.fillStyle = '#8c8a85'; g.fillRect(0, 0, w, h);
    const tones = ['#b9b6ae', '#c1beb6', '#b0ada6', '#bcb8ae', '#c5c2ba'];
    for (let j = 0; j < 4; j++) { let x = -r() * 40; while (x < w) { const bw = 54 + r() * 26; g.fillStyle = tones[Math.floor(r() * tones.length)]; g.fillRect(x + 1.5, j * 64 + 1.5, bw - 3, 61); x += bw; } }
    for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? 'rgba(86,112,60,0.55)' : 'rgba(236,232,220,0.25)'; g.fillRect(r() * w, r() * h, 2 + r() * 4, 1.5 + r() * 3); }
  }, { key: 'env-quay-berm-1', repeat: [1, 1], anisotropy: 4 });
}
/** a rubble / boulder revetment (the Gulf shore of the Marine Facade, photo V22): big dark grey and brown-grey angular blocks 0.4-0.9 m, deep shadows between them, a little lichen */
function rubbleTexture(ctx) {
  return ctx.tex.draw(512, 512, (g, w, h) => {
    const r = ctx.rng('quay-rubble-tex');
    g.fillStyle = '#34322f'; g.fillRect(0, 0, w, h);
    const tones = ['#6d6b66', '#7b786f', '#59574f', '#85807a', '#4f4d48', '#74706a', '#8a8378', '#615d55'];
    for (let n = 0; n < 150; n++) {
      const cx = r() * w, cy = r() * h, rad = 22 + r() * 30, k = 5 + Math.floor(r() * 3), a0 = r() * 6.28, col = tones[Math.floor(r() * tones.length)];
      for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) {
        if (cx + ox < -70 || cx + ox > w + 70 || cy + oy < -70 || cy + oy > h + 70) continue;
        g.fillStyle = col; g.beginPath();
        for (let q = 0; q < k; q++) { const a = a0 + q / k * 6.283, rr = rad * (0.78 + 0.3 * ((q * 37 + n * 11) % 7) / 7); g.lineTo(cx + ox + Math.cos(a) * rr * 1.15, cy + oy + Math.sin(a) * rr * 0.85); }
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.11)'; g.beginPath(); g.ellipse(cx + ox - rad * 0.2, cy + oy - rad * 0.25, rad * 0.45, rad * 0.28, 0, 0, 6.3); g.fill();
        g.fillStyle = 'rgba(20,18,16,0.22)'; g.beginPath(); g.ellipse(cx + ox + rad * 0.25, cy + oy + rad * 0.35, rad * 0.5, rad * 0.25, 0, 0, 6.3); g.fill();
      }
    }
    for (let i = 0; i < 120; i++) { g.fillStyle = r() < 0.6 ? 'rgba(150,160,100,0.30)' : 'rgba(200,196,170,0.28)'; g.fillRect(r() * w, r() * h, 2 + r() * 6, 2 + r() * 4); }
  }, { key: 'env-quay-rubble-1', repeat: [1, 1], anisotropy: 4 });
}
function anchorSignTexture(ctx) {
  return ctx.tex.draw(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const c = w / 2;
    g.fillStyle = '#f4f2ec'; g.beginPath(); g.arc(c, c, 62, 0, 6.3); g.fill();
    g.strokeStyle = '#d0242e'; g.lineWidth = 12; g.beginPath(); g.arc(c, c, 56, 0, 6.3); g.stroke();
    g.strokeStyle = '#1b1f20'; g.fillStyle = '#1b1f20'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.arc(c, 34, 8, 0, 6.3); g.stroke();                       // the anchor: ring, shaft, stock, arms + flukes
    g.beginPath(); g.moveTo(c, 42); g.lineTo(c, 98); g.stroke();
    g.beginPath(); g.moveTo(c - 15, 55); g.lineTo(c + 15, 55); g.stroke();
    g.beginPath(); g.arc(c, 80, 28, 0.15, Math.PI - 0.15); g.stroke();
    g.beginPath(); g.moveTo(c - 26, 74); g.lineTo(c - 30, 86); g.lineTo(c - 18, 84); g.fill(); g.beginPath(); g.moveTo(c + 26, 74); g.lineTo(c + 30, 86); g.lineTo(c + 18, 84); g.fill();
    g.strokeStyle = '#d0242e'; g.lineWidth = 10; g.beginPath(); g.moveTo(c - 44, c - 44); g.lineTo(c + 44, c + 44); g.stroke();   // the prohibition slash
  }, { key: 'env-quay-anchor-sign', repeat: [1, 1], anisotropy: 4 });
}
/** an iron mooring ring on a plate (sprite on the wall face) */
function ringTexture(ctx) {
  return ctx.tex.draw(64, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#23262a'; g.fillRect(24, 6, 16, 22);                          // the plate / staple
    g.strokeStyle = '#23262a'; g.lineWidth = 7; g.beginPath(); g.arc(32, 58, 22, 0, 6.3); g.stroke();
    g.strokeStyle = 'rgba(120,120,120,0.5)'; g.lineWidth = 2; g.beginPath(); g.arc(29, 55, 21, 3.6, 5.3); g.stroke();
  }, { key: 'env-quay-ring-sprite', repeat: [1, 1], anisotropy: 4 });
}
/** a black drain culvert mouth: an arched dark opening with a stone surround */
function culvertTexture(ctx) {
  return ctx.tex.draw(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,108,100,0.9)'; g.beginPath(); g.moveTo(2, h); g.lineTo(2, 30); g.arc(32, 30, 30, Math.PI, 0); g.lineTo(w - 2, h); g.closePath(); g.fill();
    g.fillStyle = '#0e1214'; g.beginPath(); g.moveTo(9, h); g.lineTo(9, 32); g.arc(32, 32, 23, Math.PI, 0); g.lineTo(w - 9, h); g.closePath(); g.fill();
  }, { key: 'env-quay-culvert', repeat: [1, 1], anisotropy: 4 });
}

// ---------------------------------------------------------------- bank frames
/** densified bank with per-vertex landward mitre normal (mx, mz), mitre scale k, arclength s and the segment's normal (nx, nz) / tangent (tx, tz) per segment.
 *  Anichkov keeps its original polygon-based gaps; explicit bridge sites insert
 *  their edge splits, including Belinsky on the Fontanka. */
function frames(bank, splits, tests) {
  const pts = [];
  for (let i = 0; i < bank.pts.length; i++) {
    const p = bank.pts[i];
    if (i === 0) { pts.push([p[0], p[1]]); continue; }
    const q = bank.pts[i - 1], l = Math.hypot(p[0] - q[0], p[1] - q[1]), near = isNear(p[0], p[1]) || isNear(q[0], q[1]), max = near ? 9 : 120, n = Math.max(1, Math.ceil(l / max));
    for (let k = 1; k <= n; k++) pts.push([q[0] + (p[0] - q[0]) * k / n, q[1] + (p[1] - q[1]) * k / n]);
  }
  let P = pts;
  if (splits && splits.length) {
    const out = [P[0]];
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1], ts = [];
      for (const [px, pz, nx, nz] of splits) { const da = (a[0] - px) * nx + (a[1] - pz) * nz, db = (b[0] - px) * nx + (b[1] - pz) * nz; if ((da > 0.02 && db < -0.02) || (da < -0.02 && db > 0.02)) ts.push(da / (da - db)); }
      ts.sort((u, v) => u - v);
      for (const t of ts) out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      out.push(b);
    }
    P = out;
  }
  if (tests && tests.length) {                                    // cut where a zone test changes along a piece (bisection; a zone narrower than a piece is found through the midpoint)
    const out = [P[0]];
    const cut = (a, b, ta, tb, f) => { let lo = a, hi = b; for (let k = 0; k < 18; k++) { const m = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2]; if (f(m[0], m[1]) === ta) lo = m; else hi = m; } void tb; return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2]; };
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], add = [];
      for (const f of tests) { const ta = f(a[0], a[1]), tm = f(m[0], m[1]), tb = f(b[0], b[1]); if (ta !== tm) add.push(cut(a, m, ta, tm, f)); if (tm !== tb) add.push(cut(m, b, tm, tb, f)); }
      add.sort((p, q) => Math.hypot(p[0] - a[0], p[1] - a[1]) - Math.hypot(q[0] - a[0], q[1] - a[1]));
      for (const q of add) if (Math.hypot(q[0] - out[out.length - 1][0], q[1] - out[out.length - 1][1]) > 0.05 && Math.hypot(q[0] - b[0], q[1] - b[1]) > 0.05) out.push(q);
      out.push(b);
    }
    P = out;
  }
  const n = P.length, seg = [];
  for (let i = 0; i + 1 < n; i++) {
    const dx = P[i + 1][0] - P[i][0], dz = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dz) || 1e-6, tx = dx / l, tz = dz / l;
    seg.push({ tx, tz, nx: -tz * bank.landSide, nz: tx * bank.landSide, len: l });
  }
  const fr = []; let s = 0;
  for (let i = 0; i < n; i++) {
    const a = seg[Math.max(0, i - 1)], b = seg[Math.min(seg.length - 1, i)];
    let mx = a.nx + b.nx, mz = a.nz + b.nz; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = Math.min(2.2, 1 / Math.max(0.35, mx * b.nx + mz * b.nz));
    fr.push({ x: P[i][0], z: P[i][1], mx, mz, k, s });
    if (i < seg.length) s += seg[i].len;
  }
  return { fr, seg };
}
const at = (fr, seg, sv) => {                                   // point, tangent and landward normal at arclength sv
  let lo = 0, hi = fr.length - 2;                                // binary search: the last i (<= len - 2) with fr[i + 1].s >= sv, as the old linear scan found it
  while (lo < hi) { const mid = (lo + hi) >> 1; if (fr[mid + 1].s < sv) lo = mid + 1; else hi = mid; }
  const i = lo;
  const a = fr[i], b = fr[i + 1], sg = seg[i], t = Math.min(1, Math.max(0, (sv - a.s) / Math.max(1e-6, b.s - a.s)));
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, tx: sg.tx, tz: sg.tz, nx: sg.nx, nz: sg.nz };
};

function orientTri(B, a, b, c, nx, ny, nz) {
  const P = B.pos, ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz >= 0) B.tri(a, b, c); else B.tri(a, c, b);
}
/** flat quad a b c d (any order that is a convex loop) facing the normal n */
function quadN(B, a, b, c, d, nx, ny, nz) { orientTri(B, a, b, c, nx, ny, nz); orientTri(B, a, c, d, nx, ny, nz); }
/** oriented box: centre (cx, cz), half-extent ht along the tangent (tx, tz) and hn along the landward normal, y0..y1; uv in metres */
function box(B, cx, cz, tx, tz, nx, nz, ht, hn, y0, y1, uvs = 1) {
  const C = (st, sn) => [cx + tx * st * ht + nx * sn * hn, cz + tz * st * ht + nz * sn * hn];
  const corners = [C(-1, -1), C(1, -1), C(1, 1), C(-1, 1)];
  const faces = [[0, 1, -nx, -nz], [1, 2, tx, tz], [2, 3, nx, nz], [3, 0, -tx, -tz]];
  for (const [i, j, fx, fz] of faces) {
    const p = corners[i], q = corners[j];
    const v0 = B.vert(p[0], y0, p[1], fx, 0, fz, (p[0] + p[1]) / uvs, y0 / uvs), v1 = B.vert(q[0], y0, q[1], fx, 0, fz, (q[0] + q[1]) / uvs, y0 / uvs);
    const v2 = B.vert(q[0], y1, q[1], fx, 0, fz, (q[0] + q[1]) / uvs, y1 / uvs), v3 = B.vert(p[0], y1, p[1], fx, 0, fz, (p[0] + p[1]) / uvs, y1 / uvs);
    quadN(B, v0, v1, v2, v3, fx, 0, fz);
  }
  const t = corners.map((p) => B.vert(p[0], y1, p[1], 0, 1, 0, p[0] / uvs, p[1] / uvs));
  quadN(B, t[0], t[1], t[2], t[3], 0, 1, 0);
  const u = corners.map((p) => B.vert(p[0], y0, p[1], 0, -1, 0, p[0] / uvs, p[1] / uvs));
  quadN(B, u[0], u[1], u[2], u[3], 0, -1, 0);
}

// ---------------------------------------------------------------- post geometries (origin = base centre, x along the wall; no bottom faces)
function boxMB(B, cx, y0, y1, hx, hz, cz = 0, top = true) {
  const c = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]], nrm = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (let e = 0; e < 4; e++) {
    const p = c[e], q = c[(e + 1) % 4], [nx, nz] = nrm[e];
    const a = B.vert(cx + p[0], y0, cz + p[1], nx, 0, nz), b = B.vert(cx + q[0], y0, cz + q[1], nx, 0, nz), d = B.vert(cx + q[0], y1, cz + q[1], nx, 0, nz), f = B.vert(cx + p[0], y1, cz + p[1], nx, 0, nz);
    B.quad(a, f, d, b);
  }
  if (top) { const t = c.map((p) => B.vert(cx + p[0], y1, cz + p[1], 0, 1, 0)); B.quad(t[0], t[3], t[2], t[1]); }
}
function pyramidMB(B, y0, y1, hx0, hx1) {                          // a low truncated four-sided pyramid (cap)
  const b = [[-hx0, -hx0], [hx0, -hx0], [hx0, hx0], [-hx0, hx0]], t = [[-hx1, -hx1], [hx1, -hx1], [hx1, hx1], [-hx1, hx1]];
  for (let e = 0; e < 4; e++) {
    const j = (e + 1) % 4, mx = (b[e][0] + b[j][0]) / 2, mz = (b[e][1] + b[j][1]) / 2, l = Math.hypot(mx, mz) || 1, nx = mx / l * 0.8, nz = mz / l * 0.8, ny = 0.6;
    const a = B.vert(b[e][0], y0, b[e][1], nx, ny, nz), c = B.vert(b[j][0], y0, b[j][1], nx, ny, nz), d = B.vert(t[j][0], y1, t[j][1], nx, ny, nz), f = B.vert(t[e][0], y1, t[e][1], nx, ny, nz);
    B.quad(a, f, d, c);
  }
  const tp = t.map((p) => B.vert(p[0], y1, p[1], 0, 1, 0)); B.quad(tp[0], tp[3], tp[2], tp[1]);
}
function lathe(B, rings, seg, y0 = 0) {                              // rings: [[radius, y]...] bottom -> top, a closed 'seg'-sided drum
  let prev = null;
  for (let k = 0; k < rings.length; k++) {
    const [r, y] = rings[k], row = [];
    const dr = k + 1 < rings.length ? rings[k + 1][0] - r : r - rings[k - 1][0], dy = k + 1 < rings.length ? rings[k + 1][1] - y : y - rings[k - 1][1], nl = Math.hypot(dr, dy) || 1;
    for (let s = 0; s < seg; s++) { const a = s / seg * 6.2832, c = Math.cos(a), sn = Math.sin(a); row.push(B.vert(c * r, y + y0, sn * r, c * dy / nl, -dr / nl, sn * dy / nl)); }
    if (prev) for (let s = 0; s < seg; s++) { const s1 = (s + 1) % seg; B.quad(prev[s], prev[s1], row[s1], row[s]); }
    prev = row;
  }
  const [r, y] = rings[rings.length - 1], tp = []; for (let s = 0; s < seg; s++) { const a = s / seg * 6.2832; tp.push(B.vert(Math.cos(a) * r, y + y0, Math.sin(a) * r, 0, 1, 0)); }
  for (let s = 1; s + 1 < seg; s++) B.tri(tp[0], tp[s + 1], tp[s]);
}
/** the monolithic Neva parapet roll: the profile [offset landward, y] swept along the wall (sections of 2.2 m) */
const PARAPET_ROLL = [[0, 0.0], [0, 0.6], [0.1, 0.86], [0.26, 0.99], [0.44, 1.04], [0.62, 0.99], [0.78, 0.86], [0.88, 0.6], [0.88, 0.17]];
/** a flat cap that closes the open end of a swept profile at the frame vertex v (tangent of the piece sg, dir = +1 / -1: the end faces along / against the tangent) */
function capEnd(B, prof, v, sg, dir) {
  const nx = sg.tx * dir, nz = sg.tz * dir, ids = prof.map(([o, y]) => B.vert(v.x + v.mx * o * v.k, y, v.z + v.mz * o * v.k, nx, 0, nz, 0.5, 0.5));
  for (let j = 1; j + 1 < ids.length; j++) orientTri(B, ids[0], ids[j], ids[j + 1], nx, 0, nz);
}
function postGeometry(kind) {
  if (kind === 'chainpost') return chainPostGeometry();
  if (kind === 'mushroom') return mushroomGeometry();
  const B = new MeshBuilder();
  if (kind === 'pyramid') {                                          // Fontanka: body 0.45 x 1.0, cap slab 0.52, low pyramid
    boxMB(B, 0, -0.03, 0.97, 0.225, 0.225, 0, false); boxMB(B, 0, 0.97, 1.04, 0.26, 0.26); pyramidMB(B, 1.04, 1.17, 0.3, 0.17);
  } else if (kind === 'twostep' || kind === 'tube' || kind === 'lightpost') {               // canals: body, a wider cap slab, a smaller block on it (two-step moulded cap)
    const w = kind === 'tube' ? 0.275 : 0.25, H = kind === 'tube' ? 1.15 : 1.1;
    boxMB(B, 0, -0.03, H - 0.2, w, w, 0, false); boxMB(B, 0, H - 0.2, H - 0.1, w + 0.06, w + 0.06, 0, true); boxMB(B, 0, H - 0.1, H, w * 0.9, w * 0.9, 0, true);
  } else if (kind === 'moika') {                                     // rose-red post 0.45 x 0.98, two-step cap
    boxMB(B, 0, -0.03, 0.8, 0.225, 0.225, 0, false); boxMB(B, 0, 0.8, 0.9, 0.27, 0.27, 0, true); boxMB(B, 0, 0.9, 0.98, 0.2, 0.2, 0, true);
  } else if (kind === 'ballpost') {                                   // Swan Canal / Mars Field side (photo 13): square cast post 0.15 with a collar block where the tubes meet and a big ball on a neck
    boxMB(B, 0, -0.1, 0.8, 0.075, 0.075, 0, false); boxMB(B, 0, 0.34, 0.5, 0.105, 0.105, 0, true); boxMB(B, 0, 0.8, 0.85, 0.095, 0.095, 0, true);
    lathe(B, [[0.045, 0.85], [0.07, 0.87], [0.1, 0.9], [0.115, 0.96], [0.1, 1.02], [0.07, 1.05], [0.03, 1.065]], 10);
  } else if (kind === 'trellis') {                                    // thin green posts of the garden trellis
    boxMB(B, 0, -0.1, 1.98, 0.03, 0.03, 0, true);
  } else if (kind === 'bigpost') {                                    // Fontanka garden bank (photo 150): big pink rapakivi post 0.55 x 0.55, 1.15 high, chamfered cap
    boxMB(B, 0, -0.03, 0.98, 0.275, 0.275, 0, false); boxMB(B, 0, 0.98, 1.06, 0.3, 0.3, 0, true); pyramidMB(B, 1.06, 1.2, 0.27, 0.15);
  } else if (kind === 'pylon') {                                     // Winter Canal: round drum 0.45 x 0.95, thin base ring, flat cap
    lathe(B, [[0.25, -0.03], [0.225, 0.05], [0.225, 0.86], [0.27, 0.9], [0.27, 0.95]], 8);
  } else if (kind === 'bollard') {                                   // a cast-iron mooring bollard of a port quay: squat waisted drum with a flared head
    lathe(B, [[0.3, -0.03], [0.26, 0.05], [0.2, 0.16], [0.17, 0.34], [0.23, 0.44], [0.25, 0.5]], 8);
  }
  return B.build();
}
function corbelGeometry() {                                          // bell-shaped granite corbel under a pylon (half cone projecting from the wall)
  const B = new MeshBuilder(); const seg = 6, rings = [[0.1, -0.62], [0.2, -0.4], [0.32, -0.12], [0.36, -0.02]];
  let prev = null;
  for (let k = 0; k < rings.length; k++) {
    const row = []; const [r, y] = rings[k];
    for (let s = 0; s <= seg; s++) { const a = -Math.PI / 2 + s / seg * Math.PI, c = Math.cos(a), sn = Math.sin(a); row.push(B.vert(sn * r * 0.9, y, -c * r * 1.25 + 0.0, sn * 0.8, 0.2, -c * 0.8)); }
    if (prev) for (let s = 0; s < seg; s++) B.quad(prev[s], prev[s + 1], row[s + 1], row[s]);
    prev = row;
  }
  return B.build();
}


/** An InstancedMesh whose instances are re-packed from a camera-distance test: only the items within `R` metres of the camera exist for the GPU (re-packed when the camera has moved 14 m).
 *  items: Float32Array of n 4x4 matrices (column-major) [+ n x 3 colours]; every instance starts visible (the static triangle count stays honest), the first update trims it. */
function culledInstances(ctx, T, root, geometry, material, mats, cols, R, name, opts = {}) {
  const n = mats.length / 16, im = new T.InstancedMesh(geometry, material, n);
  im.instanceMatrix.setUsage(T.DynamicDrawUsage); im.instanceMatrix.array.set(mats); im.instanceMatrix.needsUpdate = true;
  if (cols) { im.setColorAt(0, new T.Color(1, 1, 1)); im.instanceColor.setUsage(T.DynamicDrawUsage); im.instanceColor.array.set(cols); im.instanceColor.needsUpdate = true; }
  // Bound the complete immutable source before distance packing shortens the active prefix.
  im.computeBoundingSphere(); im.userData.dynamic = true;
  im.castShadow = opts.castShadow !== false; im.receiveShadow = !!opts.receiveShadow; im.name = name;
  if (opts.noOutline) ctx.noOutline(im);
  root.add(im);
  const px = new Float32Array(n), pz = new Float32Array(n); for (let i = 0; i < n; i++) { px[i] = mats[i * 16 + 12]; pz[i] = mats[i * 16 + 14]; }
  let lx = 1e9, lz = 1e9;
  const pack = (cx, cz) => {
    const A = im.instanceMatrix.array; let k = 0; const R2 = R * R, C = im.instanceColor ? im.instanceColor.array : null;
    for (let i = 0; i < n; i++) { const dx = px[i] - cx, dz = pz[i] - cz; if (dx * dx + dz * dz > R2) continue; A.set(mats.subarray(i * 16, i * 16 + 16), k * 16); if (C) { C[k * 3] = cols[i * 3]; C[k * 3 + 1] = cols[i * 3 + 1]; C[k * 3 + 2] = cols[i * 3 + 2]; } k++; }
    im.count = k; im.visible = k > 0; im.instanceMatrix.needsUpdate = true; if (C) im.instanceColor.needsUpdate = true; lx = cx; lz = cz;
  };
  ctx.onUpdate(() => { const p = ctx.camera.position; if (Math.hypot(p.x - lx, p.z - lz) > 14) pack(p.x, p.z); });
  return im;
}

// ---------------------------------------------------------------- which railing
function railStyle(key, bank, x, z, nx, s, nz = 0) {
  if (key === 'neva') return bank.far ? null : buyanRail(x, z, nz) ? 'bars' : meanderRail(x, z, nz) ? 'meander' : null;      // the Neva has the granite parapet roll; only the Tuchkov Buyan quay (bars) and the Dormition church / S-189 reach of the Lt Schmidt embankment (meander) carry an iron railing between granite posts
  if (key === 'fontanka' && z < -1075) return nx > 0 ? 'loops' : 'arcade';   // north of the Moika source (docs/research/mars-bridges-canals.md section 3): east / Kutuzov bank = stadium loops, garden bank = pointed-arch band
  if (key === 'moika' && z < -900 && x > -1075 && x < -870 && nz < -0.5) return null;   // north bank at the Summer Garden: the garden's own Charlemagne fence (landmarksGarden) stands here; the wall keeps its collider
  if (key === 'fontanka') { const h = hash2(Math.floor(s / 60), bank.idx, 17); return h < 0.6 ? 'lattice' : h < 0.85 ? 'clover' : 'bars'; }
  if (key === 'griboedov') {
    const west = nx < -0.3, east = nx > 0.3;
    if (west && z > -345 && z < -85) return 'tube';                  // the Kazan stretch: granite posts + one steel tube
    if (east && z > -335 && z < -225) return 'loops';
    if (z > -10 && z < 170) return 'loops';
    if (z > 1100 && x < -2700) return hash2(Math.floor(s / 60), bank.idx, 19) < 0.7 ? 'lattice' : 'clover';     // the last reach: the Fontanka type (docs/research/sw-canals-bridges.md 7.10) [L]
    return 'vase';
  }
  if (key === 'moika') return x > -1000 ? 'vase' : 'moika';
  if (key === 'winter-canal') return 'lancet';
  if (key === 'admiralty') return 'moika';                                    // the house bank of the Admiralty / Novo-Admiralty canals: the Moika pattern
  if (key === 'kryukov') return z < 500 ? 'moika' : 'vase';                    // the north reach (Moika -> Truda Sq, 12-13 m) the Moika pattern, the middle / south reach the Griboedov-type vase balusters
  if (key === 'nh-inner') return 'loops';
  // the Karpovka: cast-iron sections of tall overlapping ovals (the nearest pattern we have); the last 25 m of the south bank before the Karpovsky Bridge: squat granite bollards joined by one heavy pipe rail
  // (sight-karpovka's request 2; Commons photo K18 shows the oval railing on the rest of that bank)
  if (key === 'karpovka') return nz > 0.2 && x > -2790 && x < -2762 ? 'tube' : 'loops';
  if (key === 'zhdanovka') return stadiumRailAt(x, z, nx, nz) ? 'lightring' : 'bars';                                      // Zhdanovskaya embankment: a plain black bar railing between grey granite posts (photos refs/petro-water 23, 24)
  if (key === 'smolenka') return x < -7490 ? null : 'bars';                    // the granite reaches of the Smolenka: black bars between granite posts (photos V08, V09); the mouth arms have the bare torus cornice (photo V17)
  return 'vase';
}
const POST = { smolenka: 'twostep', gavan: 'twostep', kovsh: 'twostep', zhdanovka: 'twostep', karpovka: 'twostep', 'nh-inner': 'twostep', kryukov: 'twostep', admiralty: 'twostep', fontanka: 'pyramid', griboedov: 'twostep', moika: 'moika', 'winter-canal': 'pylon', 'swan-canal': 'twostep', neva: null };
const RAIL_H = { lightring: 0.95, lattice: 0.88, clover: 0.88, bars: 1.0, vase: 1.0, loops: 1.02, meander: 1.05, moika: 1.0, lancet: 0.85, arcade: 0.95, trellis: 1.9 };
const POST_TONES = {
  fontanka: (t) => (t < 0.12 ? '#a58274' : t < 0.45 ? '#a89a96' : '#b2a5a0'),
  griboedov: (t) => (t < 0.3 ? '#a8968e' : t < 0.65 ? '#9d928c' : '#b0a098'),            // grey granite with a faint pink cast (photos refs/canals 76, 84)
  moika: (t) => (t < 0.4 ? '#9c6e66' : t < 0.75 ? '#a67a70' : '#92665e'),               // rust-rose granite (photo 95)
  'winter-canal': (t) => (t < 0.5 ? '#aa9490' : '#b8a39e'),
  'swan-canal': (t) => (t < 0.5 ? '#a8968e' : '#9d928c'),
  ballpost: () => '#24282c', trellis: () => '#3f7a3c', bigpost: (t) => (t < 0.5 ? '#b08c7c' : '#a98476'),
  lightpost: (t) => (t < 0.5 ? '#c4c7c9' : '#b9bcbe'), smolenka: (t) => (t < 0.5 ? '#a39a92' : '#988f89'), bollard: () => '#383a3c', chainpost: () => '#26282b', mushroom: () => '#ffffff',
};

export function buildQuay(ctx, root, owned = null) {
  const T = ctx.THREE || THREE;
  const P = ctx.palette || {};
  const deck = deckPoly();
  const inAnichkov = (x, z) => !!deck && (pointInRing(x, z, deck) || distToRing(x, z, deck) < 1.2);
  const zones = bridgeZones();
  const info = { segments: [], stairs: [], allStairs: [], rings: 0, signs: 0, posts: 0, panels: 0, colliders: 0, deckPieces: 0, culverts: 0, tubes: 0, fallbackDecks: 0 };
  const zoneBorders = [];      // (review-water 2026-10-07) island: the bank vertices where a bridge-zone opening begins / ends: the fallback decks' parapets are joined to them (no slit on a skewed deck)
  const face = {}, faceDeck = {}, coping = {}, parapet = new MeshBuilder(), granite = new MeshBuilder(), graniteA = new MeshBuilder(), graniteB = new MeshBuilder(), graniteR = new MeshBuilder(), graniteP = new MeshBuilder(), descents = [], lionSpots = [];
  const keys = Object.keys(WATERWAYS);
  const ISL = false;      // the island perimeter (Moika / Admiralty / Kryukov banks) is drawn HERE: landmarksNewHolland's water.js skips every ring edge within 1.2 m of the island ring (only the inner canals are theirs)
  const grass = new MeshBuilder(), capB = new MeshBuilder(), slopeInfo = [];
  // (islands) a gate in the slope-top barrier (island-banks.js GANGWAYS): the barrier box that crosses it is cut in two
  const GATES = gangwayGates();
  const addBarrier = (cx, cz, len, tx, tz) => {
    const cuts = [];
    for (const g of GATES) { const dx = g.x - cx, dz = g.z - cz, u = dx * tx + dz * tz, v = -dx * tz + dz * tx; if (Math.abs(v) < 2.0 && Math.abs(u) < len / 2 + g.hw) cuts.push([u - g.hw, u + g.hw]); }
    const rot = Math.atan2(-tz, tx); let n = 0, a = -len / 2; cuts.sort((p, q) => p[0] - q[0]);
    const emit = (u0, u1) => { if (u1 - u0 < 0.15) return; const uc = (u0 + u1) / 2; ctx.physics.addBox(cx + tx * uc, cz + tz * uc, u1 - u0, 0.5, rot, -8, 1.25); n++; };
    for (const [c0, c1] of cuts) { emit(a, Math.min(c0, len / 2)); a = Math.max(a, c1); }
    emit(a, len / 2);
    return n;
  };
  const gangB = new MeshBuilder();
  const natB = { sand: new MeshBuilder(), cobble: new MeshBuilder(), rubble: new MeshBuilder(), concrete: new MeshBuilder(), grass }, steelB = new MeshBuilder();               // the natural banks of the Petrograd side / the island (waterways.js SLOPE_REACHES natural: true)
  const parapetSlab = new MeshBuilder();                                                    // the plain Makarova parapet (vo-banks.js STYLE.SLAB)
  const parapetBlock = new MeshBuilder();                                                   // the plain granite parapet block of the Lt Schmidt / Universitetskaya reach of the island (vo-banks.js STYLE.BLOCK)
  // a wall piece of the Neva whose landward side is Zayachy Island: a plain granite revetment (no parapet roll, no rings / plates): the fortress owner draws what stands behind it
  const plainAt = (key, x, z, nx, nz) => key === 'neva' && petroAt(x, z) && (zayachyAt(x + nx * 4, z + nz * 4) || zayachyAt(x + nx * 9, z + nz * 9));
  for (const k of keys) { face[k] = new MeshBuilder(); faceDeck[k] = new MeshBuilder(); coping[k] = new MeshBuilder(); }
  face.port = new MeshBuilder(); coping.port = new MeshBuilder();                           // a concrete port quay on the Neva (vo-banks.js STYLE.PORT): its own wall texture and flat coping
  face.mouth = new MeshBuilder(); const bermB = new MeshBuilder();                          // the pale grey wall and the paved lower berm of the Smolenka mouth arms (x < -7490)
  const posts = {}, panels = {}, rings = [], signs = [], culverts = [], tubes = [], btubes = [], corbels = [];
  const postList = (style) => posts[style] || (posts[style] = []);
  const panelList = (kind) => panels[kind] || (panels[kind] = []);
  // the Palace Bridge deck rectangle (bridges/palace.js frame: cx -2339.5, cz -875, bearing 323.5, u 0..254.5, half width ~14.2): the OSM water-polygon seam runs along the abutment line (u ~ 1.5)
  // across the whole deck, so the zone gap (a rectangle centred beside the deck) misses it: whatever piece has its midpoint inside the deck is a gap too
  const PAL = { cx: -2339.5, cz: -875.0, T: (323.5 - 90) * Math.PI / 180, hw: 14.5, u0: -1, u1: 255.5 };
  const inPalaceDeck = (x, z) => { const dx = x - PAL.cx, dz = z - PAL.cz, c = Math.cos(PAL.T), s = Math.sin(PAL.T), u = dx * c + dz * s, v = -dx * s + dz * c; return Math.abs(v) <= PAL.hw && u >= PAL.u0 && u <= PAL.u1; };
  const TRIPLE = new Set(['teatralny', 'malo-konyushenny']);
  // start-up: gapAt / nearBridge run for every piece of every bank; the zones sit on a 64 m grid (each registered in the cells within its radius + 60 m), so a point only visits the zones that
  // can satisfy the distance test below (the tests are the same; any zone that passes answers true, so the order of the candidates does not matter)
  const ZC = 64, zoneGrid = new Map(), zkey = (i, j) => i * 100003 + j;
  for (const zn of zones) { if (zn.id === 'anichkov') continue; const R = zn.w / 2 + zn.len / 2 + 60 + 1; for (let i = Math.floor((zn.c[0] - R) / ZC); i <= Math.floor((zn.c[0] + R) / ZC); i++) for (let j = Math.floor((zn.c[1] - R) / ZC); j <= Math.floor((zn.c[1] + R) / ZC); j++) { const k = zkey(i, j); let l = zoneGrid.get(k); if (!l) zoneGrid.set(k, (l = [])); l.push(zn); } }
  const NOZ = [], zonesAt = (x, z) => zoneGrid.get(zkey(Math.floor(x / ZC), Math.floor(z / ZC))) || NOZ;
  const gapAt = (key, x, z) => {
    if (ownerWaterAt(x, z, 0.5)) return true;                       // a sight module's own descent (waterways.js OWNER_WATER): open, and no wall face either (segOpen)
    if (key === 'fontanka' && inAnichkov(x, z)) return true;
    if (key === 'neva' && inPalaceDeck(x, z)) return true;
    const zl = zonesAt(x, z);
    for (let q = 0; q < zl.length; q++) { const zn = zl[q]; if ((zn.key === key || zn.key === '*') && Math.hypot(x - zn.c[0], z - zn.c[1]) < zn.w / 2 + zn.len / 2 + 40 && zn.test(x, z, TRIPLE.has(zn.id) ? 1.6 : 0.03)) return true; }       // Triple Bridge: the short curved corner pieces of the Griboyedov / Moika corner open too
    return false;
  };

  // streets are built after the environment (no net here): a post, rail or plate whose spot lies in the layout carriageway of a drivable road (+ 0.3 m for the parking pocket / fillet the net adds) is left out (roads that run on the coping, bridge approaches without a deck zone)
  // Primary roads get 1.6 m: the net widens their junction mouths by a fillet (up to ~1.5 m) that the layout does not know (Sadovaya at the 1-y Sadovy bridge).
  const onRoad = (x, z, m = 0.3) => ctx._roadPlan ? ctx._roadPlan.cover(x,z,{}) >= -m || mergedMedianAt(ctx,x,z) : L.roadsNear(x, z, Math.max(m, 1.6), { drivable: true }).some((h) => !ghostBridge(h.road.id) && h.gap <= (h.road.hw === 'primary' ? Math.max(m, 1.6) : m));

  const nearBridge = (key, x, z, m) => { const zl = zonesAt(x, z); for (let q = 0; q < zl.length; q++) { const zn = zl[q]; if (Math.hypot(x - zn.c[0], z - zn.c[1]) < zn.w / 2 + zn.len / 2 + 60 && zn.test(x, z, m)) return true; } return false; };
  // stair sites per waterway: Fontanka = the OSM pier polygons + the Fontanka 44 pier of the research (as before); the others = OSM steps ways that run along a bank + piers
  const bankDist = (banks, x, z) => { let best = 1e9; for (const b of banks) for (let i = 0; i + 1 < b.pts.length; i++) { const a = b.pts[i], c = b.pts[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); best = Math.min(best, Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z)); } return best; };
  // bankDist(...) < lim without the full minimum: true at the first segment nearer than lim (the same distance expression); a segment whose box is lim or more away on one axis cannot be nearer
  const bankNear = (banks, x, z, lim) => { for (const b of banks) { const pts = b.pts; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], c = pts[i + 1]; if ((a[0] - x >= lim && c[0] - x >= lim) || (x - a[0] >= lim && x - c[0] >= lim) || (a[1] - z >= lim && c[1] - z >= lim) || (z - a[1] >= lim && z - c[1] >= lim)) continue; const dx = c[0] - a[0], dz = c[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); if (Math.hypot(a[0] + dx * t - x, a[1] + dz * t - z) < lim) return true; } } return false; };
  const sitesOf = {};
  for (const k of keys) sitesOf[k] = [];
  // the jetties of the Malaya Nevka (both banks from the Bolshoy Krestovsky Bridge down to the mouth) are the floating pontoons of yacht clubs, reached by a gangway from the club ground: no granite descent
  const JETTY_BOX = [-5100, -4400, -3980, -3480], jetty = (x, z) => x > JETTY_BOX[0] && x < JETTY_BOX[2] && z > JETTY_BOX[1] && z < JETTY_BOX[3];
  for (const p of PIERS) for (const poly of p.polys) { const n = poly.o.length / 2; let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += poly.o[i * 2]; cz += poly.o[i * 2 + 1]; } cx /= n; cz /= n; if (keepOut(cx, cz) || L.claimedBy(p.id) || jetty(cx, cz)) continue; for (const k of keys) if (bankNear(waterBanks(k), cx, cz, 28)) { sitesOf[k].push({ x: cx, z: cz, w: 1.7, src: 'pier' }); break; } }
  sitesOf.fontanka.push({ x: -420, z: -5, w: 1.7, src: 'research' });
  for (const s of STEPS) {
    const p = s.pts; if (p.length < 4) continue;
    const mx = (p[0] + p[p.length - 2]) / 2, mz = (p[1] + p[p.length - 1]) / 2;
    if (!L.inExtent(mx, mz, 4) || keepOut(mx, mz)) continue;                  // (a sight module's own descent / berth: waterways.js KEEP_OUT)
    for (const k of keys) {
      if (k === 'fontanka') continue;
      const bs = waterBanks(k);
      if (bankNear(bs, p[0], p[1], 3.6) && bankNear(bs, p[p.length - 2], p[p.length - 1], 3.6) && Math.hypot(p[0] - p[p.length - 2], p[1] - p[p.length - 1]) > 1.5 && (s.count === undefined || s.count >= 5)) { sitesOf[k].push({ x: mx, z: mz, w: k === 'neva' ? 2.2 : 1.7, src: 'steps', count: s.count }); break; }
    }
  }

  // Vasilievsky Island: the descents of the granite banks of the roster (vo-banks.js VO_DESCENTS: the OSM steps there run perpendicular to the wall, the generator only takes flights that run along it);
  // a site in a sight module's KEEP_OUT (the sphinx pier, the Rumyantsev descent, the Krusenstern stair, the Lions pier ...) is skipped by keepOut() like every generated descent
  for (const d of VO_DESCENTS) { if (!sitesOf[d.key] || !L.inExtent(d.x, d.z, 4) || keepOut(d.x, d.z)) continue; sitesOf[d.key].push({ x: d.x, z: d.z, w: d.w, src: 'steps', count: 14, wide: true }); }      // (wide: the roster coordinates are Nominatim / Wikipedia positions, up to 60 m off the wall: the nearest straight stretch of the bank is taken)
  { // the Palace Pier (Lions Descent): the descent nearest to the middle of the OSM relation r11489271 is the wide one with the two lions
    let best = null; for (const st of sitesOf.neva) { const dd = Math.hypot(st.x + 2373, st.z + 836); if (!best || dd < best.dd) best = { st, dd }; }
    if (best && best.dd < 60) best.st.big = true;
  }
  /** One descent of a canal / Neva bank: the GATE (a flush landing in the parapet line with cheek walls), the FLIGHT along the wall face (solid granite from the wall foot, a stepped cheek
   *  wall on the water side) and the LOWER LANDING 0.22 m above the water with an apron step. Inside PLAY it is walkable: walk boxes for the landings and stairs, solid barriers on the
   *  water side and at both ends (the quay collider is cut along the gate and thinned along the flight: see segKind). */
  function buildDescent(d) {
    const { p0, t, n, Wd, N, rise, flight, end, key, wl } = d, YBk = yBot(key), play = L.inPlay(p0.x, p0.z, -5);
    const bx = (u0, u1, v0, v1, y0, y1, B) => { const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2; box(B, p0.x + t[0] * uc - n[0] * vc, p0.z + t[1] * uc - n[1] * vc, t[0], t[1], n[0], n[1], (u1 - u0) / 2, (v1 - v0) / 2, y0, y1, 2); };
    const P = (u, v) => [p0.x + t[0] * u - n[0] * v, p0.z + t[1] * u - n[1] * v];
    const top = DS.topY, gA = DS.gateA, gB = DS.gateB, lowY = wl + 0.22, uL = gB + flight, uE = uL + DS.low;
    bx(-gA, gB, -0.05, Wd, YBk, top, graniteA);                              // the top landing, flush with the pavement
    bx(-gA, gB, Wd - 0.3, Wd, top, 0.98, graniteR);                          // its outer parapet
    bx(-gA, -gA + 0.4, -0.05, Wd, top, 1.04, graniteR);                      // the back cheek
    if (key === 'neva') { for (const [a0, a1] of [[-gA, -gA + 0.55], [gB - 0.55, gB]]) { bx(a0, a1, -1.0, -0.02, 0, 1.12, graniteR); bx(a0 - (a0 < 0 ? 0.04 : -0.04) * 0, a1, -1.04, 0.02, 1.12, 1.22, graniteR); } }      // the cut ends of the parapet roll
    else {                                                                   // an end post of the railing on each side of the gate (unless the regular rhythm has one there already)
      for (const u of [-gA - 0.3, gB + 0.3]) {
        const [x, z] = P(u, -0.26);
        let near = false; for (const list of Object.values(posts)) for (const q of list) if (Math.hypot(q.x - x, q.z - z) < 1.0) near = true;
        if (!near && POST[key] && !onRoad(x, z)) postList(POST[key]).push({ x, z, yaw: Math.atan2(-t[1], t[0]), tone: hash2(Math.round(x), Math.round(z), 5), nx: n[0], nz: n[1], key });
      }
    }
    for (let k = 0; k < N; k++) {                                            // the flight: tread blocks (alternating tone) with the stepped cheek wall on the water side
      const u0 = gB + k * DS.run, ty = top - rise * (k + 1);
      bx(u0, u0 + DS.run, -0.05, Wd, YBk, ty, k % 2 ? graniteB : graniteA);
      bx(u0, u0 + DS.run, Wd - 0.28, Wd, ty, ty + 0.9, graniteR);
    }
    bx(uL, uE, -0.05, Wd, YBk, lowY, graniteA);                              // the lower landing
    bx(uE, uE + 0.4, -0.05, Wd, YBk, wl - 0.02, graniteB);                   // the apron step (just under the water line)
    bx(uL, uE, Wd - 0.2, Wd, lowY, lowY + 0.1, graniteR);                    // a low kerb on its water side
    if (d.big) {                                                             // the Lions Descent: a red-granite pedestal with a copper lion on each side of the gate, facing each other
      const pedL = 3.4, pedD = 2.4, h = 2.2;
      for (const side of [-1, 1]) {
        const u0 = side < 0 ? -gA - pedL : gB, u1 = u0 + pedL, fx = -side * t[0], fz = -side * t[1], c = P((u0 + u1) / 2, -pedD / 2);
        bx(u0 - 0.1, u1 + 0.1, -pedD - 0.1, 0.07, 0, 0.4, graniteP);          // the stepped base
        bx(u0 + 0.05, u1 - 0.05, -pedD + 0.05, 0.05, 0.4, h, graniteP);       // the shaft (its water face stands 5 cm proud of the wall line: no coplanar faces with the parapet)
        bx(u0, u1, -pedD, 0.1, h, h + 0.22, graniteP);                       // the cornice
        lionSpots.push({ x: c[0], y: h + 0.22, z: c[1], yaw: Math.atan2(-fz, fx) });
        if (play) { ctx.physics.addBox(c[0], c[1], pedL + 0.2, pedD + 0.2, Math.atan2(-t[1], t[0]), -1, h + 1.6); info.colliders++; }
      }
    }
    if (play) {
      const rot = Math.atan2(-t[1], t[0]);
      let c = P((gB - gA) / 2, (Wd - 0.4) / 2); ctx.physics.addWalkBox(c[0], c[1], gA + gB, Wd + 0.4, rot, top, -8);
      c = P(gB + flight / 2, Wd / 2); ctx.physics.addStairs(c[0], c[1], Wd, flight, Math.atan2(t[0], t[1]), top, lowY, N);
      c = P(uL + DS.low / 2, Wd / 2); ctx.physics.addWalkBox(c[0], c[1], DS.low, Wd, rot, lowY, -8);
      d.rot = rot; d.play = true; info.colliders += 3;                         // the barriers (outer edge, back, end) come in finishDescent once a pier may be attached
    }
    const e = P(uE, Wd / 2);
    const st = { x: p0.x, z: p0.z, tx: t[0], tz: t[1], nx: n[0], nz: n[1], bank: d.bank.name, key, length: uE, landingY: lowY, w: Wd, steps: N, walk: play, endX: e[0], endZ: e[1], topY: top };
    info.allStairs.push(st); d.stair = st;
  }


  /** A pier (OSM landing stage) beside the lower landing of a descent: the pontoon is moved so that its long side runs along the wall from the end of the landing (a 0.4 m gap to the
   *  wall), the walker steps from the landing onto its deck. boats.js draws it from quay.pierOverride. */
  const pierPool = pierRects().map((r) => ({ ...r, used: false }));
  const pierOverride = {};
  function attachPier(d) {
    if (!d.play) return;
    const { p0, t, n, Wd, key, wl } = d, uE = d.end;
    const P = (u, v) => [p0.x + t[0] * u - n[0] * v, p0.z + t[1] * u - n[1] * v];
    const e = P(uE, Wd / 2);
    let cand = null;
    for (const q of pierPool) { if (q.used || q.key !== key) continue; const dd = Math.hypot(q.cx - e[0], q.cz - e[1]); if (dd < 55 && (!cand || dd < cand.dd)) cand = { q, dd }; }
    if (!cand) return;
    const long0 = Math.max(cand.q.len, cand.q.wid), short0 = Math.min(cand.q.len, cand.q.wid);
    const wid = Math.max(2.4, Math.min(short0, key === 'neva' ? 12 : key === 'winter-canal' ? 2.4 : 3.8));
    const u0 = uE + 0.15, v0 = 0.4;
    for (let L = Math.min(long0, key === 'neva' ? 60 : 16); L >= 5; L *= 0.85) {
      let ok = true;
      const samples = []; for (let a = 0; a <= L + 1e-6; a += 2) for (const vv of [0, 0.5, 1]) samples.push([a / L, vv]); samples.push([1, 0], [1, 0.5], [1, 1]);
      for (const [uu, vv] of samples) {
        const [x, z] = P(u0 + L * uu, v0 + wid * vv + (vv ? 0.5 : 0));
        if (L2.waterwayAt(x, z) !== key || nearBridge(key, x, z, 3) || onRoad(x, z, .6)) { ok = false; break; }
        for (const o of descents) { if (o === d || o.key !== key) continue; const w2 = { u: (x - o.p0.x) * o.t[0] + (z - o.p0.z) * o.t[1], v: -((x - o.p0.x) * o.n[0] + (z - o.p0.z) * o.n[1]) }; if (w2.u > -DS.gateA - 1.5 && w2.u < o.end + 1.5 && w2.v > -1.5 && w2.v < o.Wd + 1.5) { ok = false; break; } }
        if (!ok) break;
      }
      if (!ok) continue;
      const c = P(u0 + L / 2, v0 + wid / 2);
      cand.q.used = true; pierOverride[cand.q.id] = { cx: c[0], cz: c[1], ax: t[0], az: t[1], len: L, wid };
      d.pier = { cx: c[0], cz: c[1], len: L, wid, u0, v0, y: wl + 0.32, id: cand.q.id };
      if (d.stair) d.stair.pier = d.pier;
      return;
    }
  }
  /** the solid barriers that make a descent safe (water side, back, end) and, with a pier, its deck + railings: nobody can step off into the trench */
  function finishDescent(d) {
    if (!d.play) return;
    const { p0, t, n, Wd, wl, rot } = d, uE = d.end, gA = DS.gateA;
    const P = (u, v) => [p0.x + t[0] * u - n[0] * v, p0.z + t[1] * u - n[1] * v];
    const box2 = (u0, u1, v0, v1, y1, y0 = -9) => { const c = P((u0 + u1) / 2, (v0 + v1) / 2); ctx.physics.addBox(c[0], c[1], u1 - u0, v1 - v0, rot, y0, y1); info.colliders++; };
    const pr = d.pier;
    box2(-gA - 0.25, pr ? uE : uE + 0.3, Wd, Wd + 0.3, 1.5);                                  // outer edge
    box2(-gA - 0.25, -gA + 0.05, 0, Wd + 0.3, 1.5);                                            // back
    if (!pr) { box2(uE, uE + 0.3, -0.05, Wd + 0.3, 1.5); return; }                             // end of the lower landing
    const top = pr.y, U0 = pr.u0, U1 = pr.u0 + pr.len, V0 = pr.v0, V1 = pr.v0 + pr.wid, hy = top + 1.3;
    const c = P((U0 + U1) / 2, (V0 + V1) / 2); ctx.physics.addWalkBox(c[0], c[1], pr.len, pr.wid, rot, top, -8); info.colliders++;
    box2(U0 - 0.2, U1 + 0.2, V1, V1 + 0.25, hy);                                               // railing on the water side
    box2(U1, U1 + 0.25, V0 - 0.2, V1 + 0.25, hy);                                              // far end
    box2(U0 - 0.2, U1 + 0.2, V0 - 0.25, V0, hy);                                               // wall side (the 0.4 m gap)
    const gate0 = Math.max(V0, 0.35), gate1 = Math.min(Wd - 0.15, V1);                         // the opening toward the landing: v in [gate0, gate1]
    if (V1 > gate1 + 0.05) box2(U0 - 0.25, U0, gate1, V1 + 0.25, hy);
    if (gate0 > V0 + 0.05) box2(U0 - 0.25, U0, V0 - 0.25, gate0, hy);
    d.pierGate = [gate0, gate1];
  }
  const banks = [...waterBanks(), ...farBanks()];
  banks.forEach((bank, bi) => {
    const key = bank.key, W = WATERWAYS[key], YB = yBot(key), TH = tileH(key);
    // the order number of the chain: frozen for the chains of the older areas (bank-index.js), a position hash for every other chain: never the running index (it shifts with every new water polygon)
    { const k = key + ':' + Math.round(bank.pts[0][0]) + ':' + Math.round(bank.pts[0][1]); bank.idx = k in BANK_INDEX ? BANK_INDEX[k] : 100 + Math.floor(hash2(Math.round(bank.pts[0][0]), Math.round(bank.pts[0][1]), 71) * 400); }
    void bi;
    // Split at explicit deck edges so a 9 m quay collider cannot cover a sidewalk.
    // Anichkov retains its established polygon-based gap and densification.
    const splits = [], splitTests = [];
    if (ownerWaterBoxes().some((b) => bank.pts.some((p) => p[0] > b[0] - 40 && p[0] < b[1] + 40 && p[1] > b[2] - 40 && p[1] < b[3] + 40))) {
      splitTests.push((x, z) => ownerWaterAt(x, z, 0.5));
      splitTests.push((x, z) => ownerWaterAt(x, z, inIslands(x, z) ? 0 : 0.06, 1));      // (islands 2026-10-14: exactly at the ring - no 6 cm hairline between the wall face and the owner's cheek, review of landmarksYelaginRossi) (water-2 2026-10-08) the pieces are also cut at the ring itself: the 0.5 m margin beside a sight's pit keeps its wall FACE (segOpen below), see the seal
    }
    // the box of the chain: a zone whose centre is R or more from the box has no chain point within R (the point tests below are the ones of before)
    let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9; for (const p of bank.pts) { if (p[0] < bx0) bx0 = p[0]; if (p[0] > bx1) bx1 = p[0]; if (p[1] < bz0) bz0 = p[1]; if (p[1] > bz1) bz1 = p[1]; }
    const boxFar = (cx, cz, R) => Math.max(bx0 - cx, cx - bx1, 0) >= R || Math.max(bz0 - cz, cz - bz1, 0) >= R;
    for (const zn of zones) {
      if (zn.petro) { if (!boxFar(zn.c[0], zn.c[1], zn.w / 2 + 60) && bank.pts.some((p) => Math.hypot(p[0] - zn.c[0], p[1] - zn.c[1]) < zn.w / 2 + 60)) splitTests.push((x, z) => zn.test(x, z, 0.03)); continue; }      // the decks of the Petrograd side: the pieces are cut exactly at the zone border
      if (zn.key !== key || zn.id === 'anichkov' || zn.auto) continue;
      if (boxFar(zn.c[0], zn.c[1], zn.w / 2 + zn.len / 2 + 60)) continue;
      let near = false; for (const p of bank.pts) if (Math.hypot(p[0] - zn.c[0], p[1] - zn.c[1]) < zn.w / 2 + zn.len / 2 + 60) { near = true; break; }
      if (!near) continue;
      if (zn.site) { const s = zn.site, a = (s.b - 90) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), g = zn.foot ? 0.8 : 0; for (const v of [s.v0 - g, s.v1 + g]) { splits.push([s.cx - v * sn, s.cz + v * c, -sn, c]); } }
      else { const a = zn.axis * Math.PI / 180, ux = Math.sin(a), uz = -Math.cos(a); for (const v of [-zn.w / 2, zn.w / 2]) splits.push([zn.c[0] + (-uz) * v, zn.c[1] + ux * v, -uz, ux]); }
    }
    if (key === 'neva') {                                              // cut the seam pieces at the Palace Bridge deck edges so only the part under the deck is a gap (the far abutment seam is 66 m long)
      const uv = (x, z) => { const dx = x - PAL.cx, dz = z - PAL.cz; return [dx * Math.cos(PAL.T) + dz * Math.sin(PAL.T), -dx * Math.sin(PAL.T) + dz * Math.cos(PAL.T)]; };
      if (bank.pts.some((p) => { const [u, v] = uv(p[0], p[1]); return Math.abs(v) <= 60 && u >= -10 && u <= 265; })) for (const v of [-PAL.hw, PAL.hw]) splits.push([PAL.cx - v * Math.sin(PAL.T), PAL.cz + v * Math.cos(PAL.T), -Math.sin(PAL.T), Math.cos(PAL.T)]);
    }
    // grass-slope stretches of this bank (waterways.js slopeRuns): the wall pieces are cut at their ends
    const sRuns = slopeRuns().filter((r) => r.bank === bank);
    const inRunS = (sv) => sRuns.some((r) => sv >= r.s0 - 0.05 && sv <= r.s1 + 0.05);
    for (const r of sRuns) {
      const n = r.pts.length - 1, t0 = [r.pts[1][0] - r.pts[0][0], r.pts[1][1] - r.pts[0][1]], t1 = [r.pts[n][0] - r.pts[n - 1][0], r.pts[n][1] - r.pts[n - 1][1]], l0 = Math.hypot(...t0) || 1, l1 = Math.hypot(...t1) || 1;
      splits.push([r.pts[0][0], r.pts[0][1], t0[0] / l0, t0[1] / l0], [r.pts[n][0], r.pts[n][1], t1[0] / l1, t1[1] / l1]);
    }
    // descents (walkable stair flights) of this bank: planned on a first frames pass, then the wall pieces are cut at the gate / flight / landing ends
    const mine = [];
    if (key !== 'fontanka' && key !== 'moat' && key !== 'nh-inner' && key !== 'kronverk-moat' && !bank.far) {
      const pre = frames(bank, null), pf = pre.fr, ps = pre.seg, ptotal = pf[pf.length - 1].s;
      const siteList = (sitesOf[key] || []).slice().sort((a, b) => (a.src === 'steps' ? 0 : 1) - (b.src === 'steps' ? 0 : 1));
      for (const site of siteList) {
        let best = null;
        for (let i = 0; i + 1 < pf.length; i++) { const sg = ps[i], a = pf[i], t = Math.max(0, Math.min(sg.len, (site.x - a.x) * sg.tx + (site.z - a.z) * sg.tz)), d = Math.hypot(a.x + sg.tx * t - site.x, a.z + sg.tz * t - site.z); if (!best || d < best.d) best = { d, s: a.s + t }; }
        if (!best || best.d > (site.wide ? 60 : 28)) { if (DESC_DBG && site.count === 14) console.log('[descent] site', key, site.x, site.z, 'bank', bank.name, 'too far', best && best.d.toFixed(1)); continue; }
        const why = {};
        const Wd = descentWidth(key, site), drop = DS.topY - (lvl(key) + 0.22), N = Math.max(6, Math.ceil(drop / DS.rise)), rise = drop / N, flight = N * DS.run, end = DS.gateB + flight + DS.low;
        let chosen = null;
        for (const sh of site.wide ? [0, 2.5, -2.5, 5, -5, 8, -8, 12, -12, 16, -16, 24, -24, 32, -32, 42, -42, 55, -55] : [0, 2.5, -2.5, 5, -5, 8, -8, 12, -12, 16, -16]) for (const dir of [1, -1]) {
          if (chosen) break;
          const s0 = best.s + sh, sA = dir > 0 ? s0 - DS.gateA - 0.5 : s0 - end - 0.5, sB = dir > 0 ? s0 + end + 0.5 : s0 + DS.gateA + 0.5;
          if (sA < 0 || sB > ptotal) { why.range = (why.range || 0) + 1; continue; }
          const p0 = at(pf, ps, s0); if (!isNear(p0.x, p0.z) || keepOut(p0.x, p0.z)) { why.near = (why.near || 0) + 1; continue; }
          let ok = true; const petro0 = petroAt(p0.x, p0.z);
          // (Petrograd-only data: the bank line may not leave the straight axis of the descent; where it turns away by 4 degrees the wall stands 0.8 m behind the lower landing and the walker drops into the
          //  slot between them - seen on the Malaya Nevka, 2026-10-06; the older areas keep their reviewed descents)
          for (let u = -DS.gateA - 0.4; u <= end + 0.4 && ok; u += 1.2) { const q = at(pf, ps, s0 + dir * u), lv = (q.x - p0.x) * p0.nx + (q.z - p0.z) * p0.nz; if (gapAt(key, q.x, q.z) || nearBridge(key, q.x, q.z, 9) || q.tx * p0.tx + q.tz * p0.tz < 0.985 || (petro0 && (lv > 0.35 || lv < -0.45)) || inRunS(s0 + dir * u)) ok = false; }
          if (!ok) why.axis = (why.axis || 0) + 1;
          // Test the full final descent/barrier footprint, including its water
          // side and end. Testing the bank axis alone misses skew bridge mouths
          // and carriageways that approach behind the lower landing.
          for (let u=-DS.gateA-.6; u<=end+.6 && ok; u+=.6) for (let v=-.3; v<=Wd+.6 && ok; v+=.6) {
            const x=p0.x+p0.tx*dir*u-p0.nx*v, z=p0.z+p0.tz*dir*u-p0.nz*v;
            if(onRoad(x,z,.6)) {ok=false;why.road=(why.road||0)+1;}
          }
          if (ok && descents.some((q) => Math.hypot(q.p0.x - p0.x, q.p0.z - p0.z) < 24)) { ok = false; why.spacing = (why.spacing || 0) + 1; }
          if (ok) chosen = { key, bank, p0, t: [p0.tx * dir, p0.tz * dir], n: [p0.nx, p0.nz], dir, Wd, N, rise, flight, end, site, wl: lvl(key), big: !!site.big };
        }
        if (chosen) { mine.push(chosen); descents.push(chosen); } else if (DESC_DBG && site.count === 14) console.log('[descent] site', key, site.x, site.z, 'bank', bank.name, 'rejected', JSON.stringify(why));
      }
      for (const d of mine) for (const u of [-DS.gateA, DS.gateB, d.end]) splits.push([d.p0.x + d.t[0] * u, d.p0.z + d.t[1] * u, d.t[0], d.t[1]]);
    }
    const { fr, seg } = frames(bank, splits, splitTests), total = fr[fr.length - 1].s;
    // position of a point in a descent's frame: u along the flight (gate = [-gateA, gateB]), v out from the wall face
    const dUV = (d, x, z) => ({ u: (x - d.p0.x) * d.t[0] + (z - d.p0.z) * d.t[1], v: -((x - d.p0.x) * d.n[0] + (z - d.p0.z) * d.n[1]) });
    const inGate = (x, z, m = 0.4) => { for (const d of mine) { const q = dUV(d, x, z); if (q.u >= -DS.gateA - m && q.u <= DS.gateB + m && Math.abs(q.v) < 1.6) return true; } return false; };
    const segKind = seg.map((sg, i) => {                           // 1 = the gate of a descent (no parapet, no collider), 2 = its flight / lower landing (thin wall collider), 0 = ordinary wall
      const mx = (fr[i].x + fr[i + 1].x) / 2, mz = (fr[i].z + fr[i + 1].z) / 2;
      for (const d of mine) { const q = dUV(d, mx, mz); if (Math.abs(q.v) > 1.2) continue; if (q.u >= -DS.gateA - 0.05 && q.u <= DS.gateB + 0.05) return 1; if (q.u > DS.gateB && q.u <= d.end + 0.05) return 2; }
      return 0;
    });
    const segDeck = seg.map((sg, i) => { const mx = (fr[i].x + fr[i + 1].x) / 2, mz = (fr[i].z + fr[i + 1].z) / 2; return gapAt(key, mx, mz) || (key === 'fontanka' && inAnichkov(fr[i].x, fr[i].z) && inAnichkov(fr[i + 1].x, fr[i + 1].z)); });
    const segNear = seg.map((sg, i) => isNear(fr[i].x, fr[i].z));
    const segOwner = seg.map((sg, i) => ownerWaterAt((fr[i].x + fr[i + 1].x) / 2, (fr[i].z + fr[i + 1].z) / 2, 0.5));      // the front of a sight module's descent + 0.5 m round it: no coping, parapet, collider (segGap)
    // the front of a sight module's descent: nothing of the quay, not even the wall face. For the island sights' rings (owners.js) only INSIDE the ring: the 0.5 m margin round it keeps its wall face (drawn like a bridge gap's face, pushed
    // back by polygonOffset so the owner's own wall always wins): without it the generic wall ended 0.5 m before the owner's wall and a slit showed (Menshikov apron, west end C, shot a_6 of water-2; review request 1)
    const segOpen = seg.map((sg, i) => { const mx = (fr[i].x + fr[i + 1].x) / 2, mz = (fr[i].z + fr[i + 1].z) / 2; return ownerWaterAt(mx, mz, 0.5, 2) || ownerWaterAt(mx, mz, inIslands(mx, mz) ? 0 : 0.06, 1); });
    const segIsl = seg.map((sg, i) => ISL && key !== 'nh-inner' && !bank.far && islandAt((fr[i].x + fr[i + 1].x) / 2 + sg.nx * 3, (fr[i].z + fr[i + 1].z) / 2 + sg.nz * 3));      // a piece whose landward side is the New Holland island
    const segSlope = seg.map((sg, i) => { const r = sRuns.find((q) => fr[i].s >= q.s0 - 0.06 && fr[i + 1].s <= q.s1 + 0.06); return r ? r.reach : null; });      // the slope reach of a piece, or null
    const segIn = seg.map((sg, i) => !!bank.far && L.inExtent((fr[i].x + fr[i + 1].x) / 2, (fr[i].z + fr[i + 1].z) / 2, 3));      // scenery banks: the data banks rule inside the extent
    const segPlay = seg.map((sg, i) => L.inPlay(fr[i].x, fr[i].z, -150));
    const segGap = seg.map((sg, i) => segDeck[i] || segKind[i] === 1 || !!segSlope[i] || segIsl[i]);      // (a slope piece has no coping / parapet either)
    // the raised coping lip (0.17 m) stays out of a carriageway that runs on it (bridge approaches, roads on the quay edge): the road is flush there
    // (tested at both ends and the middle of the piece, 0.15 and 0.7 m landward: the lip is 0.62 m wide and the net's asphalt reaches a little beyond the layout width)
    const segRoad = seg.map((sg, i) => [0.15, 0.7].some((o) => [0, 0.5, 1].some((f) => onRoad(fr[i].x + (fr[i + 1].x - fr[i].x) * f + sg.nx * o, fr[i].z + (fr[i + 1].z - fr[i].z) * f + sg.nz * o))));
    // ---- wall face, coping (strips along the pieces)
    const strip = (Bld, p, q, nd, ny, u0, vf, skip, uv = TILE_U) => {
      for (let i = 0; i + 1 < fr.length; i++) {
        if (skip(i)) continue;
        const a = fr[i], b = fr[i + 1], sg = seg[i];
        const A0 = Bld.vert(a.x + a.mx * p[0] * a.k, p[1], a.z + a.mz * p[0] * a.k, nd * sg.nx, ny, nd * sg.nz, a.s / uv + u0, vf(p[1]));
        const B0 = Bld.vert(b.x + b.mx * p[0] * b.k, p[1], b.z + b.mz * p[0] * b.k, nd * sg.nx, ny, nd * sg.nz, b.s / uv + u0, vf(p[1]));
        const B1 = Bld.vert(b.x + b.mx * q[0] * b.k, q[1], b.z + b.mz * q[0] * b.k, nd * sg.nx, ny, nd * sg.nz, b.s / uv + u0, vf(q[1]));
        const A1 = Bld.vert(a.x + a.mx * q[0] * a.k, q[1], a.z + a.mz * q[0] * a.k, nd * sg.nx, ny, nd * sg.nz, a.s / uv + u0, vf(q[1]));
        quadN(Bld, A0, B0, B1, A1, nd * sg.nx, ny, nd * sg.nz);
      }
    };
    /** a profile polyline [[offset (+ landward), y]...] swept as strips; the normal of every step is (-dy, do) rotated into (landward, up) */
    const sweep = (Bld, prof, skip, u0 = 0, vf = () => 0, uv = TILE_U) => {
      for (let k = 0; k + 1 < prof.length; k++) {
        const p = prof[k], q = prof[k + 1], dO = q[0] - p[0], dY = q[1] - p[1], nl = Math.hypot(dO, dY) || 1, nO = -dY / nl, nY = dO / nl;
        for (let i = 0; i + 1 < fr.length; i++) {
          if (skip(i)) continue;
          const a = fr[i], b = fr[i + 1], sg = seg[i];
          const nxw = nO * sg.nx, nzw = nO * sg.nz;
          // (islands) bs: the batter of the wall foot is scaled to 0 at a vertex that lies ON the ring of a sight's water pit, so the leaning wall face meets the owner's vertical cheek with no wedge of sky (landmarksYelaginRossi review)
          const pa0 = po(p[0], a), pb0 = po(p[0], b), qa0 = po(q[0], a), qb0 = po(q[0], b);
          const A0 = Bld.vert(a.x + a.mx * pa0 * a.k, p[1], a.z + a.mz * pa0 * a.k, nxw, nY, nzw, a.s / uv + u0, vf(p[1]));
          const B0 = Bld.vert(b.x + b.mx * pb0 * b.k, p[1], b.z + b.mz * pb0 * b.k, nxw, nY, nzw, b.s / uv + u0, vf(p[1]));
          const B1 = Bld.vert(b.x + b.mx * qb0 * b.k, q[1], b.z + b.mz * qb0 * b.k, nxw, nY, nzw, b.s / uv + u0, vf(q[1]));
          const A1 = Bld.vert(a.x + a.mx * qa0 * a.k, q[1], a.z + a.mz * qa0 * a.k, nxw, nY, nzw, a.s / uv + u0, vf(q[1]));
          quadN(Bld, A0, B0, B1, A1, nxw, nY, nzw);
        }
      }
    };
    const vWall = (y) => (y - YB) / TH;
    const po = (o, f) => (o < 0 && f.bs !== undefined ? o * f.bs : o);
    if (!bank.far) for (const v of fr) if (inIslands(v.x, v.z) && ownerWaterAt(v.x, v.z, 0.06, 1)) v.bs = 0;      // (islands) the vertices on the ring of a sight's pit
    const u0 = bank.idx * 0.37;
    const batter = key === 'neva' ? 0.3 : key === 'fontanka' ? 0 : 0.08;                 // the foot of the wall leans toward the water
    const wallProf = [[-batter, YB], [0, COP_BOT]];
    // wall style of the island banks (vo-banks.js): 0 the waterway's own wall, 1 a concrete port quay (own texture, flat coping, no parapet), 2 the plain slab parapet of Makarova embankment
    const segStyle = seg.map((sg, i) => (key === 'neva' && !bank.far ? voWallStyle(bank, (fr[i].s + fr[i + 1].s) / 2) : 0));
    // the mouth arms of the Smolenka (x < -7490): a pale grey wall (own texture) and a paved lower berm 0.6 m over the water (photo w08 / V17); no berm at a descent, a bridge gap, a gate
    const segMouth = seg.map((sg, i) => key === 'smolenka' && !bank.far && fr[i].x < -7490 && fr[i + 1].x < -7490);
    sweep(face[key], wallProf, (i) => segDeck[i] || segIn[i] || segSlope[i] || segIsl[i] || segStyle[i] === STYLE.PORT || segStyle[i] === STYLE.MOLE || segMouth[i], u0, vWall);
    // (review-water-3 2026-10-09) the moles of the Shkipersky canal mouth: the cream ashlar of the canal wall (the `gavan` mesh and texture; every key has the same water level, so the tile height agrees)
    sweep(face.gavan, wallProf, (i) => segDeck[i] || segIn[i] || segSlope[i] || segIsl[i] || segStyle[i] !== STYLE.MOLE, u0, vWall);
    sweep(face.mouth, wallProf, (i) => segDeck[i] || segIn[i] || segSlope[i] || segIsl[i] || !segMouth[i], u0, vWall);
    sweep(face.port, wallProf, (i) => segDeck[i] || segIn[i] || segSlope[i] || segStyle[i] !== STYLE.PORT, u0, vWall);
    if (segMouth.some(Boolean)) {
      const wlM = lvl(key), yT = wlM + 0.6, BW = 2.2, nearDesc = (i) => { const mx = (fr[i].x + fr[i + 1].x) / 2, mz = (fr[i].z + fr[i + 1].z) / 2; for (const d of mine) { const q = dUV(d, mx, mz); if (q.u > -DS.gateA - 4 && q.u < d.end + 4 && Math.abs(q.v) < 5) return true; } return false; };
      const bermSkip = seg.map((sg, i) => !segMouth[i] || segDeck[i] || segIn[i] || segSlope[i] || segIsl[i] || segKind[i] !== 0 || segOpen[i] || nearDesc(i));
      for (let i = 0; i + 1 < fr.length; i++) {
        if (bermSkip[i]) continue;
        const a = fr[i], b = fr[i + 1], sg = seg[i], P = (q, o) => [q.x - q.mx * o * q.k, q.z - q.mz * o * q.k];      // offset o toward the water (landward mitre normal reversed)
        const [ax0, az0] = P(a, 0), [bx0, bz0] = P(b, 0), [ax1, az1] = P(a, BW), [bx1, bz1] = P(b, BW);
        const v0 = bermB.vert(ax0, yT, az0, 0, 1, 0, a.s / 2.4, 0), v1 = bermB.vert(bx0, yT, bz0, 0, 1, 0, b.s / 2.4, 0), v2 = bermB.vert(bx1, yT, bz1, 0, 1, 0, b.s / 2.4, BW / 2.4), v3 = bermB.vert(ax1, yT, az1, 0, 1, 0, a.s / 2.4, BW / 2.4);
        quadN(bermB, v0, v1, v2, v3, 0, 1, 0);
        const f0 = bermB.vert(ax1, wlM - 0.12, az1, -sg.nx, 0, -sg.nz, a.s / 2.4, 0), f1 = bermB.vert(bx1, wlM - 0.12, bz1, -sg.nx, 0, -sg.nz, b.s / 2.4, 0), f2 = bermB.vert(bx1, yT, bz1, -sg.nx, 0, -sg.nz, b.s / 2.4, 0.3), f3 = bermB.vert(ax1, yT, az1, -sg.nx, 0, -sg.nz, a.s / 2.4, 0.3);
        quadN(bermB, f0, f1, f2, f3, -sg.nx, 0, -sg.nz);
      }
    }
    sweep(faceDeck[key], wallProf, (i) => !segDeck[i] || segIn[i] || segOpen[i], u0, vWall);
    // ---- grass-slope banks: low granite banquette (kerb) at the water, a short lip, the grass slope up to street level, granite end caps where the slope meets a bridge / the wall
    for (const reach of new Set(sRuns.map((r) => r.reach))) {
      if (reach.natural) {                                             // no banquette: the slope runs into the water (from 1.6 m out, 0.5 m below the surface, through the water line at the bank line)
        const wl = lvl(key), yW = wl + 0.03, run = reach.run, other = (i) => segSlope[i] !== reach;
        // (water-3 2026-10-09) reach.plane = a concrete slab revetment (the Gavan quay at the D-2, photos d19 / y04): a 1 m vertical lip at the water, then a straight slab up to street level
        const yLip = wl + 1.0;
        const prof = reach.plane ? [[-0.35, wl - 0.5], [0, wl - 0.25], [0, yLip], [run, -0.02], [run + 0.3, -0.01], [run + 0.45, -0.05]] : [[-1.6, wl - 0.5], [0, yW]];
        if (!reach.plane) { for (const [t, e] of [[0.12, 0.07], [0.3, 0.2], [0.5, 0.42], [0.7, 0.68], [0.86, 0.88], [1, 1]]) prof.push([t * run, yW * (1 - e)]); prof.push([run + 0.3, -0.01], [run + 0.45, -0.05]); }
        const surfOf = seg.map((sg, i) => (other(i) ? null : reach.surf((fr[i].x + fr[i + 1].x) / 2, (fr[i].z + fr[i + 1].z) / 2, sg.nx, sg.nz)));
        for (const sf of ['sand', 'cobble', 'rubble', 'concrete', 'grass']) sweep(natB[sf], prof, (i) => surfOf[i] !== sf, 0, (y) => (y - wl) / (sf === 'grass' ? 5 : 1.7), sf === 'grass' ? 5 : 4);
        slopeInfo.push({ key, reach: reach.id, run, natural: true });
        // a light granite curb awash at the water line (0.4 m wide, 0.1 m above the surface; the cobble wings of the Yelagin spit, photos spit 22-24)
        // the pale granite edge on the top of the 1 m lip of a slab quay (the yacht club, the boiler-house reach of the stadium island)
        if (reach.edge) sweep(graniteA, [[-0.05, yLip - 0.1], [-0.05, yLip + 0.07], [0.4, yLip + 0.07], [0.4, yLip - 0.1]], other, 0, () => 0);
        if (reach.curb) sweep(graniteA, [[-0.15, wl - 0.12], [-0.15, wl + 0.1], [0.25, wl + 0.1], [0.25, wl - 0.12]], other, 0, () => 0);
        for (const r of sRuns) {
          if (r.reach !== reach) continue;
          // the blue steel stair flights of a plane revetment (decoration: the slope is closed by the slope-top barrier, nobody walks down it), at fractions of the run length, 4 m clear of the run ends
          const stairF = reach.stairs || (reach.stairEvery ? Array.from({ length: Math.floor((r.s1 - r.s0) / reach.stairEvery) }, (_, i) => ((i + 0.5) * reach.stairEvery) / (r.s1 - r.s0)) : null);      // (islands) a flight every stairEvery metres of a slab quay (the yacht club: about every 60 m)
          if (reach.plane && stairF) for (const f of stairF) { const sf = r.s0 + (r.s1 - r.s0) * f; if (sf > r.s0 + 4 && sf < r.s1 - 4) { const p = at(fr, seg, sf); if (isNear(p.x, p.z)) steelFlight(reach.stairsGranite ? graniteB : steelB, p, run, yLip); } }
          for (const [sEnd, dir] of [[r.s0, -1], [r.s1, 1]]) {
            const k = fr.findIndex((q) => Math.abs(q.s - sEnd) < 0.08); if (k < 0) continue;
            const q = fr[k], sg = seg[Math.min(k, seg.length - 1)], nx = dir * sg.tx, nz = dir * sg.tz;
            const poly = reach.plane ? [[0, -0.005], [0, yLip], [run, -0.02], [run + 0.3, -0.005]] : [[0, -0.005], [0, yW - 0.6], [0, yW], ...prof.slice(2, 8), [run + 0.3, -0.005]];
            // (review-water-3 2026-10-09; review-gavan item 1) on the island the cut face wears the wall texture of its bank (it was a flat untextured mauve polygon, 6 m x 3.4 m, at the south end of Galerny Harbour,
            // shots gavan-review/b_1, d_0): the same triangles, drawn into the wall mesh of the key (the Neva: the concrete panels of the port quay); the older districts keep capB
            const CD = inVO(q.x, q.z) ? (key === 'neva' ? face.port : face[key]) : null;
            const ids = poly.map(([o, y]) => (CD ? CD.vert(q.x + q.mx * o * q.k, y, q.z + q.mz * o * q.k, nx, 0, nz, (q.s + o) / TILE_U + u0, vWall(y)) : capB.vert(q.x + q.mx * o * q.k, y, q.z + q.mz * o * q.k, nx, 0, nz, o / 2, y / 2)));
            for (let j = 1; j + 1 < ids.length; j++) orientTri(CD || capB, ids[0], ids[j], ids[j + 1], nx, 0, nz);
            // (islands 2026-10-14, review of landmarksYelaginSpits 6) a slope that ends at the pit of a sight module (the cobble wings at the spit flights): the cap above shows a block with an open underside hanging over the pit;
            // the earth section under the slope line down to the bed closes it (face down to the water line, as the cheek of the pit)
            if (inIslands(q.x, q.z) && ownerWaterAt(q.x, q.z, 1.5)) {
              const bed = wl - 0.6, poly2 = reach.plane ? [[0, bed], [0, yLip], [run, -0.02], [run + 0.3, -0.005], [run + 0.3, bed]] : [[0, bed], [0, yW], ...prof.slice(2, 8), [run + 0.3, -0.005], [run + 0.3, bed]];
              const ids2 = poly2.map(([o, y]) => capB.vert(q.x + q.mx * o * q.k, y, q.z + q.mz * o * q.k, nx, 0, nz, o / 2, y / 2));
              for (let j = 1; j + 1 < ids2.length; j++) orientTri(capB, ids2[0], ids2[j], ids2[j + 1], nx, 0, nz);
            }
          }
        }
        continue;
      }
      const KT = lvl(key) + reach.kerb, y0 = KT + reach.lip, run = reach.run, other = (i) => segSlope[i] !== reach, flat0 = () => 0;
      const prof = [[0.45, y0]]; for (const [t, e] of [[0.18, 0.17], [0.38, 0.37], [0.58, 0.58], [0.78, 0.79], [0.92, 0.94], [1, 1]]) prof.push([0.45 + t * (run - 0.45), y0 * (1 - e)]);
      prof.push([run + 0.3, -0.01], [run + 0.45, -0.05]);
      sweep(face[key], [[-0.05, YB], [0, KT]], other, u0, vWall);
      sweep(coping[key], [[0, KT], [0.45, KT]], other, 0, flat0);
      sweep(coping[key], [[0.45, KT], [0.45, y0]], other, 0, flat0);
      sweep(grass, prof, other, 0, (y) => (y - y0) / 5, 5);
      slopeInfo.push({ key, reach: reach.id, run });
      for (const r of sRuns) {
        if (r.reach !== reach) continue;
        for (const [sEnd, dir] of [[r.s0, -1], [r.s1, 1]]) {
          const k = fr.findIndex((q) => Math.abs(q.s - sEnd) < 0.08); if (k < 0) continue;
          const q = fr[k], sg = seg[Math.min(k, seg.length - 1)], nx = dir * sg.tx, nz = dir * sg.tz;
          const poly = [[0, -0.005], [0, KT], [0.45, KT], ...prof.slice(0, 7), [run + 0.3, -0.005]];                  // the cut face of the earth: from the slope line UP to street level (the ground sliver beyond the end rests on it)
          const ids = poly.map(([o, y]) => capB.vert(q.x + q.mx * o * q.k, y, q.z + q.mz * o * q.k, nx, 0, nz, o / 2, y / 2));
          for (let j = 1; j + 1 < ids.length; j++) orientTri(capB, ids[0], ids[j], ids[j + 1], nx, 0, nz);
        }
      }
    }
    const flat = () => 0;
    if (key === 'fontanka') {
      sweep(coping[key], [[0, COP_BOT], [-COP_OUT, COP_BOT], [-COP_OUT, Y_TOP], [COP_IN, Y_TOP]], (i) => segGap[i] || segRoad[i], 0, flat);
    } else if (key === 'neva') {
      const segPlain = seg.map((sg, i) => !bank.far && (plainAt(key, (fr[i].x + fr[i + 1].x) / 2, (fr[i].z + fr[i + 1].z) / 2, sg.nx, sg.nz) || buyanRail((fr[i].x + fr[i + 1].x) / 2, (fr[i].z + fr[i + 1].z) / 2, sg.nz) || meanderRail((fr[i].x + fr[i + 1].x) / 2, (fr[i].z + fr[i + 1].z) / 2, sg.nz)));      // Zayachy Island, the Tuchkov Buyan quay, the Dormition church / S-189 reach: a plain revetment, no parapet roll (the railing stands on its coping)
      const port = (i) => segStyle[i] === STYLE.PORT, mole = (i) => segStyle[i] === STYLE.MOLE;
      sweep(coping[key], [[0, COP_BOT], [-0.13, COP_BOT], [-0.16, -0.22], [-0.12, -0.08], [0, 0.0]], (i) => segGap[i] || segIn[i] || port(i) || mole(i), 0, flat);                 // the rolled string course
      sweep(parapet, PARAPET_ROLL, (i) => segGap[i] || segIn[i] || segPlain[i] || segStyle[i] !== STYLE.DEFAULT, 0, (y) => Math.max(0, y) / 1.04 * 0.99, 2.2);
      // (islands 2026-10-14, review of landmarksYelaginRossi) the roll ends beside the pit of a sight module (the owner's 0.5 m margin is no parapet): each open end gets a cap, no hollow tube seen at an angle from the stair
      for (let i = 0; i < seg.length && !bank.far; i++) {
        if (segGap[i] || segIn[i] || segPlain[i] || segStyle[i] !== STYLE.DEFAULT) continue;
        for (const [j, vi, dir] of [[i - 1, i, -1], [i + 1, i + 1, 1]]) if (j >= 0 && j < seg.length && segOwner[j] && inIslands(fr[vi].x, fr[vi].z)) capEnd(parapet, PARAPET_ROLL, fr[vi], seg[i], dir);
      }
      sweep(parapetSlab, [[0, 0.0], [0, 0.9], [0.05, 0.99], [0.18, 1.04], [0.32, 1.04], [0.45, 0.99], [0.5, 0.9], [0.5, 0.17]], (i) => segGap[i] || segIn[i] || segPlain[i] || segStyle[i] !== STYLE.SLAB, 0, (y) => Math.max(0, y) / 1.04 * 0.99, 2.2);      // Makarova: a plain solid slab ~0.5 x 1.0 m, rounded top
      // the plain granite parapet block of the island's Lt Schmidt / Universitetskaya reach (STYLE.BLOCK; the roll was "a smooth pink rolled log" at 1.7 m, review of landmarksNavalCorps; photos a07 b09 w11): a rectangular
      // block 0.62 m wide, 1.04 m high, 0.06 m chamfers, a joint every 2.2 m, no recessed panel (the tall block stays the height of the roll, so the end blocks / cheeks of the sights still meet it)
      sweep(parapetBlock, [[0, 0.0], [0, 0.98], [0.06, 1.04], [0.56, 1.04], [0.62, 0.98], [0.62, 0.17]], (i) => segGap[i] || segIn[i] || segPlain[i] || segStyle[i] !== STYLE.BLOCK, 0, (y) => Math.max(0, y) / 1.04 * 0.99, 2.2);
      sweep(coping[key], [[0.62, Y_TOP], [1.3, Y_TOP]], (i) => segGap[i] || segIn[i] || segRoad[i] || segPlain[i] || segStyle[i] !== STYLE.BLOCK, 0, flat);
      sweep(coping[key], [[0.88, Y_TOP], [1.4, Y_TOP]], (i) => segGap[i] || segIn[i] || segRoad[i] || segPlain[i] || segStyle[i] !== STYLE.DEFAULT, 0, flat);                // the granite kerb strip (not under a carriageway) behind the parapet
      sweep(coping[key], [[0.5, Y_TOP], [1.2, Y_TOP]], (i) => segGap[i] || segIn[i] || segRoad[i] || segPlain[i] || segStyle[i] !== STYLE.SLAB, 0, flat);
      sweep(coping.port, [[0, COP_BOT], [-0.1, COP_BOT], [-0.1, Y_TOP], [0.7, Y_TOP]], (i) => segGap[i] || segIn[i] || segRoad[i] || !port(i), 0, flat);           // the flat concrete coping of a port quay, 0.7 m wide
      sweep(coping.gavan, [[0, COP_BOT], [-0.1, COP_BOT], [-0.1, Y_TOP], [0.7, Y_TOP]], (i) => segGap[i] || segIn[i] || segRoad[i] || !mole(i), 0, flat);          // (review-water-3) the flat pale granite coping slab of the canal-mouth moles (the `gavan` coping mesh)
      sweep(coping[key], [[0, 0.0], [0.04, Y_TOP], [0.9, Y_TOP]], (i) => !segPlain[i] || segGap[i] || segIn[i], 0, flat);                    // the plain revetment top: a flat granite coping 0.9 m wide
    } else {
      sweep(coping[key], [[0, COP_BOT], [-0.14, COP_BOT], [-0.17, -0.24], [-0.15, -0.08], [-0.07, 0.08], [0.05, 0.16], [0.2, Y_TOP], [COP_IN, Y_TOP]], (i) => segGap[i] || segRoad[i], 0, flat);
    }
    sweep(coping[key], [[0, COP_BOT], [-COP_OUT, COP_BOT], [-COP_OUT, 0.0]], (i) => key === 'neva' || segGap[i] || !segRoad[i], 0, flat);                 // under a carriageway the wall top is flush: only its water-side lip
    info.deckPieces += segDeck.filter(Boolean).length;

    // ---- colliders + published segments (everything except the bridge gaps); Neva scenery beyond the data has none
    for (let i = 0; i + 1 < fr.length; i++) {
      if (segSlope[i] && !segDeck[i] && !bank.far) {                                          // grass slope: the barrier stands on the slope top (the rail line), nobody can reach the slope or the water
        const a = fr[i], b = fr[i + 1], sg = seg[i], rr = segSlope[i].run, cx = (a.x + b.x) / 2 + sg.nx * (rr + 0.2), cz = (a.z + b.z) / 2 + sg.nz * (rr + 0.2);
        if (segPlay[i] && !onRoad(cx, cz, 0.3)) { info.colliders += addBarrier(cx, cz, sg.len + 0.5, sg.tx, sg.tz); }
        else if (segPlay[i] && inIslands(cx, cz)) {
          // (islands 2026-10-14) an embankment road runs over the slope top (Pesochnaya nab., (-2875 .. -2883, -4860 .. -4870)): the barrier stands on the water-side edge of the asphalt instead of being left out, otherwise the road
          // leads into the slope strip and the water (a walker fell at 4 pieces of the Malaya Nevka shore of Aptekarsky)
          for (let dd = 0.5; dd <= rr + 0.2; dd += 0.5) { const x2 = cx - sg.nx * dd, z2 = cz - sg.nz * dd; if (!onRoad(x2, z2, 0.3)) { info.colliders += addBarrier(x2, z2, sg.len + 0.5, sg.tx, sg.tz); break; } }
        }
        // (Vasilievsky Island) the ELBOW between two slope-top barriers: the boxes stand at the own normal of each piece, so on the outside of a turn the two offset lines end 2 x run x sin(turn / 2) apart (4 m at 38
        // degrees) and a walker slips through the wedge (tools/environment-vo-walk.mjs found it on the Kovsh, Galerny Harbour, the Smolenka): a box from the end of one offset line to the start of the next closes it
        if (i > 0 && segPlay[i] && segSlope[i - 1] === segSlope[i] && inVOI(a.x, a.z)) {
          const pr = seg[i - 1], off = rr + 0.2, ex = a.x + pr.nx * off, ez = a.z + pr.nz * off, sx = a.x + sg.nx * off, sz = a.z + sg.nz * off, dx = sx - ex, dz = sz - ez, gl = Math.hypot(dx, dz);
          if (gl > 0.3 && !onRoad((ex + sx) / 2, (ez + sz) / 2, 0.3)) { ctx.physics.addBox((ex + sx) / 2, (ez + sz) / 2, gl + 0.5, 0.5, Math.atan2(-dz, dx), -8, 1.25); info.colliders++; }
        }
        // (Vasilievsky Island) the SIDE of a slope run: where a natural slope ends (against a wall piece, a bridge zone, or another reach) its lateral edge is open land that runs down to the water - physically
        // the terrain is still street level there (only the mesh is cut away), a walker coming along the bank enters the slope from the side and walks off into the water (tools/environment-vo-walk.mjs). A box from the
        // water edge to the slope-top barrier closes it.
        if (segPlay[i] && inVOI(a.x, a.z)) {
          const startsRun = i === 0 || segSlope[i - 1] !== segSlope[i] || segDeck[i - 1], endsRun = i + 1 >= seg.length || segSlope[i + 1] !== segSlope[i] || segDeck[i + 1], Ls = rr + (inIslands(a.x, a.z) ? 1.2 : 0.6);
          for (const [vt, on] of [[a, startsRun], [b, endsRun]]) if (on) { ctx.physics.addBox(vt.x + sg.nx * Ls / 2, vt.z + sg.nz * Ls / 2, Ls, 0.5, Math.atan2(-sg.nz, sg.nx), -8, 1.25); info.colliders++; }
        }
        if (segNear[i]) info.segments.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, nx: sg.nx, nz: sg.nz, bank: bank.name, key, slope: rr });
        continue;
      }
      if (segDeck[i] || !segPlay[i] || segKind[i] === 1 || bank.far || segIsl[i] || key === 'nh-inner') continue;                 // the scenery banks of the Neva are straight approximations: never a collider
      const a = fr[i], b = fr[i + 1], sg = seg[i];
      // a thin wall box (0.4 m landward of the wall line to 0.05 m beyond it): the descents, piers and landings in front of the wall stay free; y up to 1.25 keeps jumpers out
      let cx = (a.x + b.x) / 2 + sg.nx * 0.175, cz = (a.z + b.z) / 2 + sg.nz * 0.175;
      // a carriageway that runs over the wall line (the OSM centreline lies on the coping): the invisible wall would stand in the middle of a lane, so it moves out to the water-side edge of the asphalt
      // (the wall is still there for anybody who leaves the road; nothing stands on it); where the road crosses the wall line instead (bridge approach), the piece is left out
      const clash = (dd) => [0, 0.5, 1].some((f) => { const px = a.x + (b.x - a.x) * f + sg.nx * (0.4 - dd), pz = a.z + (b.z - a.z) * f + sg.nz * (0.4 - dd); return onRoad(px, pz, dd > 0 ? 0.4 : 0.05); });
      let box = true;
      if (clash(0)) {
        let moved = false;
        for (let dd = 0.3; dd <= (inVOI(cx, cz) ? 0.6 : 5); dd += 0.3) if (!clash(dd)) { cx -= sg.nx * dd; cz -= sg.nz * dd; moved = true; break; }      // (Vasilievsky Island: never more than 0.6 m beyond the wall line - the asphalt of a quay road that overhangs the water edge left a strip of water between the wall and the box, a walker dropped into it)
        if (!moved && !inVOI(cx, cz)) box = false;                      // the road crosses the wall line (a bridge approach without a deck zone): the wall must not close its mouth (sub-piece walls beside the asphalt blocked the pavements of the Panteleymonovsky Bridge: removed; the Troitsky zone is wide enough instead)
        // (water-2 2026-10-08, streets request 6: a service road that DEAD-ENDS on the water edge - the port berth roads at (-8770, -2022), (-8823, -2068), (-6405, 830) - had the whole wall box across its mouth, the strict
        //  furniture audit read it as a post on the asphalt) the box moves entirely to the water side of the wall line (offsets -0.45 .. 0.0): a walker is stopped at the same place, nothing stands on the asphalt
        if (!moved && inVOI(cx, cz)) { cx -= sg.nx * 0.4; cz -= sg.nz * 0.4; }
      }
      if (box) {                                                              // the +0.5 m overlap of neighbouring boxes stops at a bridge gap (a box end must not reach into a deck)
        const gapEnd = inVO(a.x, a.z) ? 0.6 : 0;                         // (Vasilievsky Island: the box reaches 0.6 m into the zone, where the fallback deck's parapet stands - no slit between wall box and deck)
        const e0 = i > 0 && segDeck[i - 1] ? gapEnd : 0.25, e1 = i + 1 < seg.length && segDeck[i + 1] ? gapEnd : 0.25, sh = (e1 - e0) / 2;
        ctx.physics.addBox(cx + sg.tx * sh, cz + sg.tz * sh, sg.len + e0 + e1, 0.45, Math.atan2(-sg.tz, sg.tx), -8, 1.25); info.colliders++;
      }
      if (segNear[i]) info.segments.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, nx: sg.nx, nz: sg.nz, bank: bank.name, key });
    }

    // corner fillers (Vasilievsky Island only): where two wall pieces meet at a turn of more than ~26 degrees the thin boxes (0.45 m, +0.25 m at each end) leave a wedge on the outside of the turn and a walker slips
    // through into the water (tools/environment-banks.mjs: the Neva Bay corner (-6406, 831), the notch of the passenger port bay); a 0.9 m square box on the vertex closes it. Not at gates, flights, bridge gaps, slopes.
    for (let i = 1; i + 1 < fr.length && !bank.far && key !== 'nh-inner'; i++) {
      const a = seg[i - 1], b = seg[i], v = fr[i];
      if ((segDeck[i - 1] && segDeck[i]) || segKind[i - 1] || segKind[i] || segSlope[i - 1] || segSlope[i] || !segPlay[i] || !inVOI(v.x, v.z)) continue;
      const gapEnd = !!segDeck[i - 1] !== !!segDeck[i];                     // the border of a bridge zone: a 1.2 m square closes the slit between the last wall box and the fallback deck's parapet
      if (gapEnd) zoneBorders.push([v.x, v.z]);
      if (!gapEnd && a.tx * b.tx + a.tz * b.tz > 0.9) continue;
      let cx = v.x + v.mx * (gapEnd ? 0.3 : 0.175), cz = v.z + v.mz * (gapEnd ? 0.3 : 0.175); if (onRoad(cx, cz, 0.3)) continue;
      // (islands 2026-10-15, owner water-banks; roads-furniture-audit --strict: quay_rail on the carriageway of nab. Grebnogo kanala (-6326.1, -4887.1), 0.14 m) the 0.9 m square reaches 0.45 .. 0.64 m from its centre: on the islands
      // a square that would overhang the asphalt moves to the water side of the wall line (the wall stays closed: the square is centred on the line then), the old districts keep the old test
      // (the 1.2 m border square at the mouth of a bridge zone too: its 2.2 m long wide variant reached 0.14 m into the lane of the Grebnoy kanal quay road at (-6325.6, -4887.4))
      { const mg = gapEnd ? 0.62 : 0.7; if (inIslands(v.x, v.z) && onRoad(cx, cz, mg)) { for (let sh = 0.15; sh <= 0.6; sh += 0.15) { const qx = cx - v.mx * sh, qz = cz - v.mz * sh; if (!onRoad(qx, qz, mg)) { cx = qx; cz = qz; break; } } } }
      // (water-3 2026-10-09; environment-vo-seal.mjs --flood with landmarksGavan built: 4 leak cells at the two corners of the Shkipersky bridge, a 0.7 m slit between this square and the end of the owner's rail / walk box) at the border
      // of a WIDE opening (>= 6 m of consecutive deck pieces: a road bridge, not a footbridge) the square grows 1.0 m into the zone along the wall line: it then overlaps whatever the owner draws at the edge of its deck
      let ext = 0, dx = 0, dz = 0;
      if (gapEnd) { const into = segDeck[i] ? 1 : -1, tt = into > 0 ? b : a; let run = 0; for (let k = into > 0 ? i : i - 1; k >= 0 && k < seg.length && segDeck[k] && run < 8; k += into) run += seg[k].len; if (run >= 6 && !onRoad(cx + tt.tx * into * 1.7, cz + tt.tz * into * 1.7, 0.3)) { ext = 1.0; dx = tt.tx * into; dz = tt.tz * into; } }
      ctx.physics.addBox(cx + dx * ext / 2, cz + dz * ext / 2, (gapEnd ? 1.2 : 0.9) + ext, gapEnd ? 1.2 : 0.9, Math.atan2(-b.tz, b.tx), -8, 1.25); info.colliders++;
    }

    // (islands 2026-10-14, owner water-banks) the two ENDS of one open chain that lie 0.3 .. 4 m apart (Kamenny east tip, (-2529.3, -5355.4) / (-2530.1, -5357.0): the closing edge of the ring runs along a neighbouring ring within
    // the 1.8 m same-waterway slack and is no bank, the slope run ends in a side box and the wall piece starts 1.8 m further: a walker slipped through the notch) get one box on the line between them
    if (!bank.closed && !bank.far && fr.length > 2 && inIslands(fr[0].x, fr[0].z) && !segDeck[0] && !segDeck[seg.length - 1] && segPlay[0]) {
      const e = fr[fr.length - 1], b0 = fr[0], gx = b0.x - e.x, gz = b0.z - e.z, gl = Math.hypot(gx, gz);
      if (gl > 0.3 && gl < 4 && !onRoad((e.x + b0.x) / 2, (e.z + b0.z) / 2, 0.3)) { ctx.physics.addBox((e.x + b0.x) / 2, (e.z + b0.z) / 2, gl + 0.9, 0.9, Math.atan2(-gz, gx), -8, 1.25); info.colliders++; }
    }

    // ---- posts + panels (near parts only, never in a gap)
    if (W.rail.length || key === 'neva') {
      let prevPost = null, prevStyle = null;
      const postAt = (x, z, tx, tz, nx, nz, s) => {
        if (!isNear(x, z) || inRunS(s) || (ISL && key !== 'nh-inner' && islandAt(x + nx * 3, z + nz * 3)) || gapAt(key, x, z) || inGate(x, z, 0.0) || onRoad(x + nx * 0.26, z + nz * 0.26)) { prevPost = null; return; }
        const style = railStyle(key, bank, x, z, nx, s, nz);
        if (!style || QUAY_CLEAR.some((q) => Math.hypot(x - q[0], z - q[1]) < q[2])) { prevPost = null; return; }
        const px = x + nx * 0.26, pz = z + nz * 0.26, minGap = style === 'tube' ? 1.2 : 1.6;
        if (prevPost && Math.hypot(prevPost.x - px, prevPost.z - pz) < minGap) return;
        const postKind = style === 'lightring' ? 'lightpost' : style === 'tube' ? 'tube' : style === 'arcade' ? 'bigpost' : style === 'moika' ? 'moika' : (POST[key] || 'bigpost');
        const rec = { x: px, z: pz, yaw: Math.atan2(-tz, tx), tone: hash2(Math.round(x), Math.round(z), 5), nx, nz };
        postList(postKind).push({ ...rec, key });
        if (key === 'winter-canal') corbels.push({ x: x - nx * 0.0 + nx * 0.0, z, nx, nz, yaw: Math.atan2(nx, nz), px: x + nx * 0.0, pz: z });
        if (prevPost && Math.hypot(prevPost.x - px, prevPost.z - pz) < 4.8) {
          const dx = px - prevPost.x, dz = pz - prevPost.z, l = Math.hypot(dx, dz);
          if (onRoad((px + prevPost.x) / 2, (pz + prevPost.z) / 2)) { /* the span crosses a carriageway: no panel */ } else if (style === 'tube') tubes.push({ x: (px + prevPost.x) / 2, z: (pz + prevPost.z) / 2, len: l, yaw: Math.atan2(-dz, dx) });
          else if (!onRoad((px + prevPost.x) / 2, (pz + prevPost.z) / 2)) panelList(style).push({ x: (px + prevPost.x) / 2, z: (pz + prevPost.z) / 2, len: Math.max(0.5, l - 0.3), yaw: Math.atan2(-dz, dx), h: RAIL_H[style] });
        }
        prevPost = { x: px, z: pz }; prevStyle = style;
      };
      const nevaRail = key === 'neva' && !bank.far && seg.some((sg, i) => buyanRail(fr[i].x, fr[i].z, sg.nz) || meanderRail(fr[i].x, fr[i].z, sg.nz));
      if (key !== 'neva' || nevaRail) {
        const bay0 = key === 'neva' ? 3.2 : W.bay;
        for (let i = 0; i < seg.length; i++) {
          if (key === 'neva' && !buyanRail((fr[i].x + fr[i + 1].x) / 2, (fr[i].z + fr[i + 1].z) / 2, seg[i].nz) && !meanderRail((fr[i].x + fr[i + 1].x) / 2, (fr[i].z + fr[i + 1].z) / 2, seg[i].nz)) { prevPost = null; continue; }
          const a = fr[i], sg = seg[i], mid = railStyle(key, bank, a.x, a.z, sg.nx, a.s, sg.nz), bay = mid === 'tube' ? 2.1 : bay0, bays = Math.max(1, Math.round(sg.len / bay));
          for (let j = 0; j < bays; j++) { const u = j / bays * sg.len; postAt(a.x + sg.tx * u, a.z + sg.tz * u, sg.tx, sg.tz, sg.nx, sg.nz, a.s + u); }
        }
        const e = fr[fr.length - 1], sg = seg[seg.length - 1]; postAt(e.x, e.z, sg.tx, sg.tz, sg.nx, sg.nz, e.s);
      }
      void prevStyle;
    }

    // ---- rails on the slope tops: ball posts + two black tubes (Mars Field side), green trellis (garden side)
    for (const r of sRuns) {
      const mid = at(fr, seg, (r.s0 + r.s1) / 2), kind = r.reach.rail(mid.nx, mid.nz); if (!kind || !r.pts.length) continue;
      const len = r.s1 - r.s0 - 1.0, bay = kind === 'trellis' ? 2.5 : kind === 'chain' ? 3.2 : 2.6, n = Math.max(1, Math.round(len / bay)), step = len / n, off = r.reach.run + 0.3;
      let prev = null;
      for (let j = 0; j <= n; j++) {
        const p = at(fr, seg, r.s0 + 0.5 + j * step), x = p.x + p.nx * off, z = p.z + p.nz * off;
        if (!isNear(x, z) || gapAt(key, x, z) || onRoad(x, z, 0.3)) { prev = null; continue; }
        postList(kind === 'chain' ? 'chainpost' : kind).push({ x, z, yaw: Math.atan2(-p.tz, p.tx), tone: hash2(Math.round(x), Math.round(z), 5), nx: p.nx, nz: p.nz, key, y0: 0.0 });
        if (prev) {
          const dx = x - prev.x, dz = z - prev.z, l = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx), mx = (x + prev.x) / 2, mz = (z + prev.z) / 2;
          if (kind === 'trellis') panelList('trellis').push({ x: mx, z: mz, len: l, yaw, h: RAIL_H.trellis, y0: 0.02 });
          else if (kind === 'chain') btubes.push({ x: mx, z: mz, len: l, yaw, y: 0.62, r: 0.016 });                      // (water-3) the chain between two cast-iron posts: one thin black tube at the mean height of its swag
          else for (const [yy, rr] of [[0.5, 0.024], [0.86, 0.026]]) btubes.push({ x: mx, z: mz, len: l, yaw, y: yy, r: rr });
        }
        prev = { x, z };
      }
    }

    // ---- mooring rings (every ~15 m on the Fontanka, 6 m on the canals, 12 m on the Neva), anchor plates, culverts at the bridges
    // a port quay carries cast-iron mooring bollards every ~24 m instead of rings and anchor plates
    if (key === 'neva' && !bank.far && segStyle.some((v) => v === STYLE.PORT)) for (let s = 9 + (bank.idx % 7); s < total; s += 24) {
      const p = at(fr, seg, s); if (!isNear(p.x, p.z) || gapAt(key, p.x, p.z) || voWallStyle(bank, s) !== STYLE.PORT || inRunS(s) || onRoad(p.x + p.nx * 0.5, p.z + p.nz * 0.5, 0.3)) continue;
      // (water-3 2026-10-09, request of landmarksMarineFacade 1; photos V 83 / 16 / 74) the passenger port berths (vo-banks.js rule S10 / S11): gloss yellow mushroom bollards 0.55 m high (top d 1.1 m, black base ring) on a pale
      // slab, 2.8 m behind the water edge, instead of the black cast-iron ones on the coping; none within 1.2 m of the real asphalt
      // (review-water-3 2026-10-09) only the berth walls whose landward side is the island: 46 of the 174 stood on the Dekabristov Island shore across the Petrovsky fairway (no berths there: black bollards as before)
      // (review-water-3b 2026-10-09; dossier marinefacade.md 4.5 [CRITIC]: "the very tip west of x -9625 is a grass shoulder with a thin kerb and NO berth wall", request 3 of landmarksMarineFacade) none on the tip of the
      // south arm: there the quay keeps the generic black bollards of a port wall (9 of the 137 stood on the shoulder)
      if (p.x < -8700 && p.z < -1250 && inIsland(p.x + p.nx * 40, p.z + p.nz * 40) && !(p.x < -9625 && p.z > -1460)) { const mx = p.x + p.nx * 2.8, mz = p.z + p.nz * 2.8; if (!onRoad(mx, mz, 1.2)) postList('mushroom').push({ x: mx, z: mz, yaw: Math.atan2(-p.tz, p.tx), tone: 0.5, nx: p.nx, nz: p.nz, key, y0: 0.0 }); continue; }
      postList('bollard').push({ x: p.x + p.nx * 0.55, z: p.z + p.nz * 0.55, yaw: Math.atan2(-p.tz, p.tx), tone: hash2(Math.round(p.x), Math.round(p.z), 5), nx: p.nx, nz: p.nz, key });
    }
    const ringStep = key === 'fontanka' ? 15 : key === 'neva' ? 12 : 6.5, ringY = key === 'fontanka' ? -0.95 : lvl(key) + 1.25, signY = key === 'fontanka' ? -1.25 : lvl(key) + 1.85;
    for (let s = 6 + (bank.idx < 100 ? bank.idx : bank.idx % 4) * 3.7; s < total && !bank.far && key !== 'moat' && key !== 'nh-inner' && key !== 'kronverk-moat'; s += ringStep) {
      const p = at(fr, seg, s); if (!isNear(p.x, p.z) || inRunS(s) || plainAt(key, p.x, p.z, p.nx, p.nz) || (key === 'neva' && !bank.far && voWallStyle(bank, s) === STYLE.PORT) || (ISL && key !== 'nh-inner' && islandAt(p.x + p.nx * 3, p.z + p.nz * 3)) || gapAt(key, p.x, p.z) || inGate(p.x, p.z, 0.6)) continue;
      rings.push({ x: p.x - p.nx * 0.045, z: p.z - p.nz * 0.045, nx: -p.nx, nz: -p.nz, y: ringY });
      if (Math.floor(s / ringStep) % (key === 'fontanka' ? 4 : 5) === 1 && !onRoad(p.x, p.z)) signs.push({ x: p.x - p.nx * 0.03, z: p.z - p.nz * 0.03, nx: -p.nx, nz: -p.nz, y: signY });
    }
    // the gap ends: plates and drain culverts on the quay walls just beside the deck zone
    for (let i = 1; i + 1 < segDeck.length && !bank.far; i++) if (segDeck[i] !== segDeck[i - 1] && !segOwner[i] && !segOwner[i - 1]) {
      const a = fr[i], sg = seg[segDeck[i] ? i - 1 : i], off = segDeck[i] ? -1.5 : 1.5, p = { x: a.x + sg.tx * off, z: a.z + sg.tz * off };
      // (review-water-3 2026-10-09, request of bridges-3 2: the arched culvert stood in front of the flight of a stair pit) on the island a plate or a culvert whose spot lies in a sight's / bridge's water ring + 1.0 m is left out
      const ownerNear = (x, z) => inVO(a.x, a.z) && ownerWaterAt(x, z, 1.0, 1);
      if (!onRoad(p.x, p.z) && !ownerNear(p.x, p.z)) signs.push({ x: p.x - sg.nx * 0.03, z: p.z - sg.nz * 0.03, nx: -sg.nx, nz: -sg.nz, y: key === 'fontanka' ? -1.25 : lvl(key) + 1.85 });
      if (key !== 'fontanka' && segNear[i]) { const c = { x: a.x + sg.tx * (off * 2.2), z: a.z + sg.tz * (off * 2.2) }; if (!onRoad(c.x, c.z, 0.9) && !ownerNear(c.x, c.z)) culverts.push({ x: c.x - sg.nx * 0.03, z: c.z - sg.nz * 0.03, nx: -sg.nx, nz: -sg.nz, y: lvl(key) + 0.3 }); }
    }

    // ---- stair flights at the landing-stage / steps sites
    const placed = [];
    for (const site of bank.far || key !== 'fontanka' ? [] : sitesOf[key] || []) {
      let best = null;
      for (let s = 0; s < total; s += 1) { const p = at(fr, seg, s), d = Math.hypot(p.x - site.x, p.z - site.z); if (!best || d < best.d) best = { d, s, p }; }
      if (!best || best.d > 28 || !isNear(best.p.x, best.p.z)) continue;
      if (placed.some((q) => Math.hypot(q.x - best.p.x, q.z - best.p.z) < 14)) continue;
      let dir = 1; { const a = at(fr, seg, Math.min(total, best.s + 10)), b = at(fr, seg, Math.max(0, best.s - 10)); if (gapAt(key, a.x, a.z) && !gapAt(key, b.x, b.z)) dir = -1; }
      const at0 = (u) => at(fr, seg, best.s + dir * u);
      const p0 = at0(0), e = at0(10.5);
      if (gapAt(key, p0.x, p0.z) || gapAt(key, e.x, e.z) || gapAt(key, at0(5).x, at0(5).z) || Math.abs(p0.tx * e.tx + p0.tz * e.tz) < 0.97) continue;
      const tx = p0.tx * dir, tz = p0.tz * dir, nx = p0.nx, nz = p0.nz;      // tx,tz: direction of descent; n: landward
      const Wd = site.w || 1.7, y0 = -0.5, wl = lvl(key);
      const put = (u0m, u1m, top, bot = YB) => {                              // a block from u0m to u1m along the descent, hugging the wall on the water side
        const uc = (u0m + u1m) / 2, c = { x: p0.x + tx * uc, z: p0.z + tz * uc };
        box(granite, c.x - nx * (Wd / 2 + 0.02), c.z - nz * (Wd / 2 + 0.02), tx, tz, nx, nz, (u1m - u0m) / 2, Wd / 2, bot, top, 2);
      };
      put(-1.6, 1.6, y0);                                                      // top landing (below the coping)
      const steps = key === 'fontanka' ? 11 : Math.max(8, Math.ceil((y0 - (wl + 0.22)) / 0.235)), run = 0.4, rise = (y0 - (wl + 0.22)) / steps;
      for (let k = 0; k < steps; k++) {
        const u0m = 1.6 + k * run, top = y0 - rise * (k + 1);
        put(u0m, u0m + run, top);
        box(granite, p0.x + tx * (u0m + run / 2) - nx * (Wd + 0.1), p0.z + tz * (u0m + run / 2) - nz * (Wd + 0.1), tx, tz, nx, nz, run / 2, 0.12, top, top + 0.9, 2);     // balustrade on the water side
      }
      put(1.6 + steps * run, 1.6 + steps * run + 3.0, wl + 0.22);              // the lower landing 0.22 m above the water
      const st = { x: p0.x, z: p0.z, tx, tz, nx, nz, bank: bank.name, key, length: 4.6 + steps * run + 3, landingY: wl + 0.22, w: Wd, steps };
      placed.push(p0); info.allStairs.push(st); if (key === 'fontanka') info.stairs.push(st);
    }
    for (const d of mine) buildDescent(d);
  });

  for (const d of descents) attachPier(d);
  for (const d of descents) finishDescent(d);

  // ---- fallback decks for the crossings that no bridge module draws (invisible: a walk box over the water and parapet boxes along both sides)
  for (const zn of zones) {
    // Owned crossings already have the bridge module's deck and rail colliders.
    // Legacy zone rectangles can reach far onto the approach roads (Palace
    // Passage), so their invisible fallback parapets must not be built there.
    if (zn.own && (ctx.buildList || L.MODULE_KEYS || []).includes('bridges')) continue;
    if (zn.id === 'anichkov' || zn.auto || TRIPLE.has(zn.id)) continue;               // landmarksC closes the Fontanka; the Triple Bridge module draws its own walk decks (no invisible fallback deck); the east / north bridge modules draw their own decks
    if (!L.inPlay(zn.c[0], zn.c[1], -20)) continue;
    const a = zn.axis * Math.PI / 180;
    const ux = Math.sin(a), uz = -Math.cos(a), ang = Math.atan2(-uz, ux), L0 = zn.len + 28;
    ctx.physics.addWalkBox(zn.c[0], zn.c[1], Math.min(L0, zn.site ? 62 : L0), zn.w, ang, 0.0, -1.2);
    for (const sgn of [-1, 1]) ctx.physics.addBox(zn.c[0] + (-uz) * sgn * (zn.w / 2 + 0.25), zn.c[1] + ux * sgn * (zn.w / 2 + 0.25), zn.len + 6, 0.5, ang, -2, 1.3);
    info.fallbackDecks++;
  }

  // ---- the Petrograd side: a deck zone whose bridge no BUILT module claims (lib/claims: the deck polygon or one of the ways on it) gets an invisible street-level deck as well, so that the road which
  // streets draws across the water can be walked until the bridge owner's deck exists: the oriented rectangle of the deck polygon with parapet boxes on its long sides, or (no polygon: the Trinity Bridge)
  // a walk box along every mapped way, as wide as the zone
  // (water-3 2026-10-09) an island deck polygon with NO water (and no slope) within 12 m of it - two OSM bridges over dry ground, w529816675 (-7136, -905) and w691078600 (-8068, -2248) - needs no fallback deck: the invisible
  // walk box and the two 1.3 m parapet boxes along its sides would only be walls on dry land. (The older districts keep every fallback: inVO only.)
  const dryDeck = (o) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } for (let x = x0 - 12; x <= x1 + 12; x += 3) for (let z = z0 - 12; z <= z1 + 12; z += 3) if (L.inRiver(x, z) || slopeAt(x, z)) return false; return true; };
  const polygonArea = (o) => { let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } return Math.abs(a / 2); };
  const wetP = (x, z) => !!(L.waterwayAt(x, z) || L.inRiver(x, z) || slopeAt(x, z));
  /** the invisible deck of a deck polygon that is far from its oriented rectangle (frame: origin (cx, cz), axis (ax, az), extents u0..u1 / v0..v1 of the rectangle): a floor of 2 m strips along the axis that covers the polygon
   *  (a strip counts where any of three lines across it lies inside the polygon: nobody can stand in a hole beside the parapet), and a parapet box (0.5 m, y -2 .. 1.3) along every piece (<= 3 m) of the polygon outline whose
   *  outer side (2.6 m beyond the edge) is water or slope: the ends where the road meets the bank stay open (the bank wall and its collider stand there), a 0.9 m square closes the wedge at every corner between two pieces */
  function polygonDeck(o, cx, cz, ax, az, u0, u1, v0, v1) {
    const n = o.length / 2, rot = Math.atan2(-az, ax), W = (u, v) => [cx + ax * u - az * v, cz + az * u + ax * v], rows = Math.max(1, Math.ceil((v1 - v0) / 2)), rw = (v1 - v0) / rows;
    const inside = (u, v) => { const q = W(u, v); return pointInRing(q[0], q[1], o); };
    for (let r = 0; r < rows; r++) {
      const vc = v0 + (r + 0.5) * rw, ivs = []; let cur = null;
      for (let u = u0; u <= u1 + 1e-6; u += 0.5) {
        const hit = inside(u, vc) || inside(u, vc - rw / 2 + 0.2) || inside(u, vc + rw / 2 - 0.2);
        if (hit) { if (!cur) cur = [u, u]; else cur[1] = u; } else if (cur) { ivs.push(cur); cur = null; }
      }
      if (cur) ivs.push(cur);
      const merged = []; for (const iv of ivs) { const last = merged[merged.length - 1]; if (last && iv[0] - last[1] < 1.6) last[1] = iv[1]; else merged.push([iv[0], iv[1]]); }
      for (const [a, b] of merged) { const c = W((a + b) / 2, vc); ctx.physics.addWalkBox(c[0], c[1], b - a + 1.0, rw + 0.4, rot, 0.0, -1.2); info.colliders++; }
    }
    const ccw = (() => { let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } return a > 0; })();
    const pieceHasRail = [];      // per vertex: did the piece before it and the piece after it get a parapet (corner squares)
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ex = o[i * 2], ez = o[i * 2 + 1], fx = o[j * 2], fz = o[j * 2 + 1], l = Math.hypot(fx - ex, fz - ez); if (l < 0.3) { pieceHasRail.push([false, false]); continue; }
      const tx = (fx - ex) / l, tz = (fz - ez) / l, nx = ccw ? tz : -tz, nz = ccw ? -tx : tx;      // the outward normal of the outline
      const k = Math.max(1, Math.ceil(l / 3)); let first = false, last = false;
      for (let q = 0; q < k; q++) {
        const t0 = q / k * l, t1 = (q + 1) / k * l, mx = ex + tx * (t0 + t1) / 2, mz = ez + tz * (t0 + t1) / 2;
        if (!wetP(mx + nx * 2.6, mz + nz * 2.6)) continue;
        ctx.physics.addBox(mx + nx * 0.5, mz + nz * 0.5, t1 - t0 + 0.5, 0.5, Math.atan2(-tz, tx), -2, 1.3); info.colliders++;
        if (q === 0) first = true; if (q === k - 1) last = true;
      }
      pieceHasRail.push([first, last, nx, nz]);
    }
    for (let i = 0; i < n; i++) {
      const prev = pieceHasRail[(i + n - 1) % n], me = pieceHasRail[i]; if (!prev || !me || !prev[1] || !me[0]) continue;
      const dx = prev[2] + me[2], dz = prev[3] + me[3], dl = Math.hypot(dx, dz) || 1; ctx.physics.addBox(o[i * 2] + dx / dl * 0.6, o[i * 2 + 1] + dz / dl * 0.6, 0.9, 0.9, 0, -2, 1.3); info.colliders++;
    }
  }
  for (const zn of zones) {
    if (!zn.petro || !L.inPlay(zn.c[0], zn.c[1], -20) || (owned && (zn.ids || []).some((id) => isOwned(owned, id)))) continue;
    // (islands 2026-10-14, request of landmarksKrestovsky 1) the dry test holds for the decks of the round-2 islands as well: eight short OSM decks (15-34 m) on Kamenny, Petrovsky and Yelagin stood on dry ground with two parapet boxes each
    if (zn.deck && (inVO(zn.c[0], zn.c[1]) || inIslands(zn.c[0], zn.c[1])) && dryDeck(zn.deck)) { (info.dryDecks || (info.dryDecks = [])).push(zn.id); continue; }
    if (zn.deck) {
      const o = zn.deck, n = o.length / 2; let cx = 0, cz = 0; for (let i = 0; i < n; i++) { cx += o[i * 2]; cz += o[i * 2 + 1]; } cx /= n; cz /= n;
      let sxx = 0, sxz = 0, szz = 0; for (let i = 0; i < n; i++) { const dx = o[i * 2] - cx, dz = o[i * 2 + 1] - cz; sxx += dx * dx; sxz += dx * dz; szz += dz * dz; }
      let th = 0.5 * Math.atan2(2 * sxz, sxx - szz), ax = Math.cos(th), az = Math.sin(th);
      const extOf = (ax, az) => { let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; for (let i = 0; i < n; i++) { const dx = o[i * 2] - cx, dz = o[i * 2 + 1] - cz, u = dx * ax + dz * az, v = -dx * az + dz * ax; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); } return [u0, u1, v0, v1]; };
      let [u0, u1, v0, v1] = extOf(ax, az);
      // (review-water 2026-10-07) THE DECK AXIS: the parapets stand on the long sides of the oriented rectangle, which is right only where the long axis runs ALONG THE ROAD (across the river). A wide city bridge
      // (Nalichny 71 x 40 m, Korablestroiteley, the mouth bridges) has its long axis along the river: the parapets then stood on the two BANK ENDS, 72 m of invisible wall across the whole roadway at each abutment
      // (nobody could walk over Nalichny), and the real sides had none (a walker stepped off the deck into the water). The bridge axis is the one that has LAND beyond both ends of the deck
      // (the other axis stays over the water): on the island the frame is turned by 90 degrees where that test says so. Older areas keep their reviewed behaviour.
      if (inVOI(cx, cz)) {
        const wetp = (px, pz) => !!(L.waterwayAt(px, pz) || L.inRiver(px, pz)), mx = cx + ax * (u0 + u1) / 2 - az * (v0 + v1) / 2, mz = cz + az * (u0 + u1) / 2 + ax * (v0 + v1) / 2;
        const endsLand = (dx, dz, half) => !wetp(mx + dx * (half + 6), mz + dz * (half + 6)) && !wetp(mx - dx * (half + 6), mz - dz * (half + 6));
        if (endsLand(-az, ax, (v1 - v0) / 2) && !endsLand(ax, az, (u1 - u0) / 2)) { th += Math.PI / 2; ax = Math.cos(th); az = Math.sin(th); [u0, u1, v0, v1] = extOf(ax, az); }
      }
      // (islands 2026-10-14, request of landmarksKrestovsky 1; the stadium promenade w636982567: a bent band 14 x 270 m in a 263 x 86 m rectangle) a deck polygon that fills less than 60 % of its oriented rectangle gets its
      // floor and parapets along the POLYGON, not along the rectangle (the parapets of the rectangle cut straight across the plaza)
      if (inIslands(cx, cz) && polygonArea(o) < 0.6 * (u1 - u0) * (v1 - v0)) { polygonDeck(o, cx, cz, ax, az, u0, u1, v0, v1); info.fallbackDecks++; (info.fallbackIds || (info.fallbackIds = [])).push(zn.id); info.polygonDecks = (info.polygonDecks || 0) + 1; continue; }
      const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2, x = cx + ax * mu - az * mv, z = cz + az * mu + ax * mv, rot = Math.atan2(-az, ax);
      const wid = inVO(x, z) ? 4 : 0;                                  // Vasilievsky Island: the quay opens 2 m beyond each long side of the deck polygon, the fallback deck is that wide (no slot of water beside it)
      ctx.physics.addWalkBox(x, z, u1 - u0 + 6, v1 - v0 + wid, rot, 0.0, -1.2);
      for (const sgn of [-1, 1]) {
        const hv = sgn * ((v1 - v0 + wid) / 2 + 0.25), pl = Math.max(2, u1 - u0 + (wid ? 1.2 : -2)), px = x - az * hv, pz = z + ax * hv;
        ctx.physics.addBox(px, pz, pl, 0.5, rot, -2, 1.3);      // (Vasilievsky Island: the parapets reach 0.6 m beyond each end of the deck polygon - the quay opening ends there)
        // (review-water 2026-10-07) on a SKEWED deck the end of a parapet stands up to 2.5 m from the end of the bank wall (the rectangle is square, the bank is not): the slit between them led into the water. Each end
        // is joined to the nearest zone-border vertex of the bank (the end of its wall box and its corner square) by one more 0.5 m box.
        if (wid) for (const e of [-1, 1]) {
          const ex = px + ax * pl / 2 * e, ez = pz + az * pl / 2 * e; let bb = null, bd = 6;
          for (const q of zoneBorders) { const d = Math.hypot(q[0] - ex, q[1] - ez); if (d < bd) { bd = d; bb = q; } }
          if (bb && bd > 0.35) { const dx = bb[0] - ex, dz = bb[1] - ez; ctx.physics.addBox((ex + bb[0]) / 2, (ez + bb[1]) / 2, bd + 0.7, 0.5, Math.atan2(-dz, dx), -2, 1.3); info.colliders++; }
        }
      }
    } else if (zn.line) {
      const p = zn.line; for (let i = 0; i + 3 < p.length; i += 2) { const dx = p[i + 2] - p[i], dz = p[i + 3] - p[i + 1], l = Math.hypot(dx, dz); if (l < 0.5) continue; ctx.physics.addWalkBox((p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2, l + 4, 2 * zn.hw, Math.atan2(-dz, dx), 0.0, -1.2); }
    }
    info.fallbackDecks++; (info.fallbackIds || (info.fallbackIds = [])).push(zn.id);      // (water-3) the ids of the Petrograd / island zones that stand on the invisible fallback deck (tools/environment-vo-seal.mjs prints them)
  }

  // ---- the gangways of the island docks (island-banks.js): a ramp from the gate in the slope-top barrier to the landing stage
  for (const g of GANGWAYS) { if (!L.inPlay(g.head.x, g.head.z, -5)) continue; gangwayGeometry(gangB, g, prism); gangwayColliders(ctx.physics, g, info); info.gangways = (info.gangways || 0) + 1; }

  // ---- meshes
  const matFor = (k, deckMat) => ctx.mat.toon('#ffffff', { map: wallTexture(ctx, k), paint: 0.05, polygonOffset: deckMat ? 3 : 0, name: 'env-quay-wall-' + (deckMat ? 'deck-' : '') + k });
  const copingMat = (k) => ctx.mat.toon(k === 'neva' ? '#b69c92' : k === 'fontanka' ? (P.graniteCoping || '#a49a95') : '#b0a29a', { paint: 0.05, name: 'env-quay-coping-' + k });
  const mk = (B, mat, name, shadow = true, rec = true) => { if (B.empty) return null; const m = new T.Mesh(B.build(), mat); m.name = name; m.castShadow = shadow; m.receiveShadow = rec; root.add(m); return m; };
  for (const k of keys) { mk(face[k], matFor(k, false), 'env-quay-wall-' + k); mk(faceDeck[k], matFor(k, true), 'env-quay-wall-deck-' + k, false); mk(coping[k], copingMat(k), 'env-quay-coping-' + k); }
  mk(parapet, ctx.mat.toon('#ffffff', { map: parapetTexture(ctx), paint: 0.04, name: 'env-quay-parapet' }), 'env-quay-parapet');
  mk(parapetSlab, ctx.mat.toon('#ffffff', { map: parapetSlabTexture(ctx), paint: 0.04, name: 'env-quay-parapet-slab' }), 'env-quay-parapet-slab');
  mk(parapetBlock, ctx.mat.toon('#f4e4da', { map: parapetSlabTexture(ctx), paint: 0.04, name: 'env-quay-parapet-block' }), 'env-quay-parapet-block');
  mk(face.mouth, ctx.mat.toon('#ffffff', { map: wallTexture(ctx, 'mouth', 'smolenka'), paint: 0.05, name: 'env-quay-wall-mouth' }), 'env-quay-wall-mouth');
  mk(bermB, ctx.mat.toon('#ffffff', { map: bermTexture(ctx), paint: 0.05, name: 'env-quay-berm' }), 'env-quay-berm', false);
  mk(face.port, ctx.mat.toon('#ffffff', { map: wallTexture(ctx, 'port', 'neva'), paint: 0.05, name: 'env-quay-wall-port' }), 'env-quay-wall-port');
  mk(coping.port, ctx.mat.toon('#8d8e8a', { paint: 0.05, name: 'env-quay-coping-port' }), 'env-quay-coping-port');
  mk(natB.rubble, ctx.mat.toon('#ffffff', { map: rubbleTexture(ctx), paint: 0.05, name: 'env-quay-rubble' }), 'env-quay-rubble');
  mk(grass, ctx.mat.toon('#ffffff', { map: grassTexture(ctx), paint: 0.06, name: 'env-quay-grass' }), 'env-quay-grass');
  mk(natB.sand, ctx.mat.toon('#ffffff', { map: sandTexture(ctx), paint: 0.05, name: 'env-quay-sand' }), 'env-quay-sand');
  mk(natB.cobble, ctx.mat.toon('#ffffff', { map: cobbleTexture(ctx), paint: 0.05, name: 'env-quay-cobble' }), 'env-quay-cobble');
  mk(natB.concrete, ctx.mat.toon('#ffffff', { map: concreteTexture(ctx), paint: 0.05, name: 'env-quay-concrete' }), 'env-quay-concrete');
  mk(steelB, ctx.mat.toon('#2f66b3', { paint: 0.04, name: 'env-quay-steel-blue' }), 'env-quay-steel-blue', false);      // (no shadow pass: two small flights; draw calls matter, docs/PERFORMANCE.md)
  mk(capB, ctx.mat.toon('#a69489', { paint: 0.05, side: 'double', name: 'env-quay-slope-caps' }), 'env-quay-slope-caps');
  mk(gangB, ctx.mat.toon('#7f868c', { paint: 0.05, name: 'env-quay-gangway' }), 'env-quay-gangway', false);
  mk(granite, ctx.mat.toon('#9a948f', { paint: 0.05, name: 'env-quay-stairs' }), 'env-quay-stairs');
  mk(graniteA, ctx.mat.toon('#b4a399', { paint: 0.05, name: 'env-quay-steps-a' }), 'env-quay-steps-a');
  mk(graniteB, ctx.mat.toon('#a69489', { paint: 0.05, name: 'env-quay-steps-b' }), 'env-quay-steps-b');
  mk(graniteR, ctx.mat.toon('#b89888', { paint: 0.05, name: 'env-quay-cheeks' }), 'env-quay-cheeks');
  mk(graniteP, ctx.mat.toon('#a98279', { paint: 0.05, name: 'env-quay-pedestals' }), 'env-quay-pedestals');
  if (lionSpots.length) {
    const g = lionGeometry(), mat = ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.03, name: 'env-lions' });
    for (const sp of lionSpots) { const m = new T.Mesh(g, mat); m.position.set(sp.x, sp.y, sp.z); m.rotation.y = sp.yaw; m.castShadow = true; m.receiveShadow = true; m.name = 'env-lion'; root.add(m); }
  }

  const m4 = new T.Matrix4(), qt = new T.Quaternion(), pos = new T.Vector3(), sc = new T.Vector3(), up = new T.Vector3(0, 1, 0), col = new T.Color();
  const matBuf = (n) => new Float32Array(n * 16);
  for (const kind of Object.keys(posts)) {
    const list = posts[kind]; if (!list.length) continue;
    const M = matBuf(list.length), CC = new Float32Array(list.length * 3);
    list.forEach((p, i) => {
      qt.setFromAxisAngle(up, p.yaw); m4.compose(pos.set(p.x, p.y0 ?? (Y_TOP - 0.03), p.z), qt, sc.set(1, 1, 1)); m4.toArray(M, i * 16);
      const tone = POST_TONES[kind] || POST_TONES[p.key] || POST_TONES.griboedov;
      col.set(tone(p.tone)).multiplyScalar(0.92 + 0.14 * hash2(i, 3, 9)); CC[i * 3] = col.r; CC[i * 3 + 1] = col.g; CC[i * 3 + 2] = col.b;
    });
    culledInstances(ctx, T, root, postGeometry(kind), ctx.mat.toon('#ffffff', kind === 'mushroom' ? { paint: 0.05, vertexColors: true, name: 'env-quay-posts-' + kind } : { paint: 0.05, name: 'env-quay-posts-' + kind }), M, CC, 420, 'env-quay-posts-' + kind, kind === 'mushroom' || kind === 'chainpost' ? { receiveShadow: true, castShadow: false } : { receiveShadow: true });
    info.posts += list.length;
  }
  if (corbels.length) {
    const M = matBuf(corbels.length);
    corbels.forEach((c, i) => { qt.setFromAxisAngle(up, Math.atan2(-c.nx, -c.nz)); m4.compose(pos.set(c.x - c.nx * 0.02, COP_BOT + 0.02, c.z - c.nz * 0.02), qt, sc.set(1, 1, 1)); m4.toArray(M, i * 16); });
    culledInstances(ctx, T, root, corbelGeometry(), ctx.mat.toon('#a89590', { paint: 0.05, name: 'env-quay-corbels', side: 'double' }), M, null, 300, 'env-quay-corbels');
  }
  for (const kind of Object.keys(panels)) {
    const list = panels[kind]; if (!list.length) continue;
    const mat = ctx.mat.toon('#ffffff', { map: railTexture(ctx, kind), alphaTest: 0.5, side: 'double', paint: 0.02, name: 'env-quay-rail-' + kind });
    const M = matBuf(list.length);
    list.forEach((p, i) => { qt.setFromAxisAngle(up, p.yaw); m4.compose(pos.set(p.x, p.y0 ?? (Y_TOP + 0.12), p.z), qt, sc.set(p.len, p.h, 1)); m4.toArray(M, i * 16); });
    culledInstances(ctx, T, root, new T.PlaneGeometry(1, 1).translate(0, 0.5, 0), mat, M, null, 520, 'env-quay-rails-' + kind, { noOutline: true });
    info.panels += list.length;
  }
  if (tubes.length) {
    const M = matBuf(tubes.length);
    tubes.forEach((p, i) => { qt.setFromAxisAngle(up, p.yaw); m4.compose(pos.set(p.x, Y_TOP + 0.93, p.z), qt, sc.set(p.len, 1, 1)); m4.toArray(M, i * 16); });
    culledInstances(ctx, T, root, new T.CylinderGeometry(0.04, 0.04, 1, 6, 1).rotateZ(Math.PI / 2), ctx.mat.toon('#7d848a', { paint: 0.02, name: 'env-quay-tubes' }), M, null, 380, 'env-quay-tubes');
    info.tubes = tubes.length;
  }
  if (btubes.length) {
    const M = matBuf(btubes.length);
    btubes.forEach((p, i) => { qt.setFromAxisAngle(up, p.yaw); m4.compose(pos.set(p.x, p.y, p.z), qt, sc.set(p.len, p.r / 0.04, p.r / 0.04)); m4.toArray(M, i * 16); });
    culledInstances(ctx, T, root, new T.CylinderGeometry(0.04, 0.04, 1, 6, 1).rotateZ(Math.PI / 2), ctx.mat.toon('#24282c', { paint: 0.02, name: 'env-quay-btubes' }), M, null, 380, 'env-quay-btubes');
    info.tubes += btubes.length;
  }
  const sprites = (list, tex, w, h, name, yOff = 0) => {
    if (!list.length) return 0;
    const mat = ctx.mat.toon('#ffffff', { map: tex, alphaTest: 0.5, side: 'double', paint: 0.0, polygonOffset: -2, name });
    const im = new T.InstancedMesh(new T.PlaneGeometry(w, h), mat, list.length);
    list.forEach((r, i) => { qt.setFromAxisAngle(up, Math.atan2(r.nx, r.nz)); m4.compose(pos.set(r.x, r.y + yOff, r.z), qt, sc.set(1, 1, 1)); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true; im.name = name;
    im.computeBoundingBox(); im.computeBoundingSphere();
    ctx.noOutline(im); root.add(im); return list.length;
  };
  info.rings = sprites(rings, ringTexture(ctx), 0.26, 0.4, 'env-quay-rings');
  info.signs = sprites(signs, anchorSignTexture(ctx), 0.52, 0.52, 'env-quay-anchor-signs');
  info.culverts = sprites(culverts, culvertTexture(ctx), 0.9, 0.9, 'env-quay-culverts', 0.45);
  releaseVoIndex();                                                    // (the building / road index of vo-banks.js: every bank is classified by now)
  return {
    water: WATER_Y, top: Y_TOP, segments: info.segments, gaps: deck ? [Array.from(deck)] : [], bridges: zones.map((z) => ({ id: z.id, name: z.name, key: z.key, c: z.c, axis: z.axis, w: z.w, len: z.len, own: z.own })),
    stairs: info.stairs, allStairs: info.allStairs, rings: info.rings, signs: info.signs, posts: info.posts, panels: info.panels, colliders: info.colliders, culverts: info.culverts, tubes: info.tubes,
    gangways: info.gangways || 0, polygonDecks: info.polygonDecks || 0, fallbackDecks: info.fallbackDecks, fallbackIds: info.fallbackIds || [], dryDecks: info.dryDecks || [], slopes: slopeInfo, pierOverride, banks: banks.map((b) => ({ name: b.name, key: b.key, len: Math.round(b.len) })),
  };
}
void waterGeo;
